"""
bot_scheduler.py — 6-hour auto-schedule for the Lead Aggregator bot (LA).

The bot (re-score leads, detect serial claimers, flag expiring offers, retry
webhooks, dedup scan, send digests) was previously manual-only via
POST /lead-aggregator/bot/run. This module starts an APScheduler interval job
on the leader-elected worker so it runs every 6h in production.

Env:
  LA_BOT_SCHEDULER_ENABLED  default "0" — set "1" to start the 6h interval job
  LA_BOT_STARTUP_CATCHUP    default "0" — set "1" for an immediate first cycle
                           on startup (catch-up for downtime)

start_lead_aggregator_scheduler() is called from the leader block in
server.py; with UVICORN_WORKERS>1 only the leader worker ever runs it.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

logger = logging.getLogger("la_bot_scheduler")

_scheduler: Optional[Any] = None


def _flag_set(var: str, default: str) -> bool:
    val = (os.environ.get(var) or default).strip().lower()
    return val in {"1", "true", "yes", "on"}


async def _gen_id(prefix: str) -> str:
    import hashlib
    import secrets
    return f"{prefix}-{secrets.token_hex(8).upper()}-{hashlib.sha1(os.urandom(8)).hexdigest()[:6].upper()}"


async def run_bot_cycle() -> dict:
    """Run one full aggregator cycle. Returns the same payload the
    POST /bot/run endpoint returns. Never raises — scheduler-safe."""
    from .database import (
        brands_col, offers_col, leads_col,
        claims_col, bot_runs_col,
    )
    from .scoring import compute_lead_score
    from . import webhooks as wh_service
    from . import dedup as dedup_service
    from . import notifications as notif_service
    from datetime import datetime, timedelta, timezone

    run_id = await _gen_id("BOT")
    now = datetime.now(timezone.utc)

    bot_doc = {
        "run_id": run_id,
        "started_at": now,
        "status": "running",
        "leads_processed": 0,
        "leads_rescored": 0,
        "serial_claimers_flagged": 0,
        "offers_expiring": 0,
        "webhooks_retried": 0,
        "reports_generated": 0,
        "revenue_credits_updated": 0,
        "errors": [],
    }
    await bot_runs_col.insert_one(bot_doc)

    errors: list[str] = []
    leads_rescored = 0
    serial_flagged = 0
    offers_expiring = 0
    webhooks_retried = 0

    # 1. Re-score all leads
    try:
        leads_cursor = leads_col.find({})
        async for lead in leads_cursor:
            brands_cursor = brands_col.find({"status": "active"})
            best_score = 0
            best_breakdown: dict = {}
            best_temp = "cold"
            matched: list[str] = []
            async for brand in brands_cursor:
                score, breakdown, temp = compute_lead_score(lead, brand)
                if score >= 25:
                    matched.append(brand["brand_id"])
                if score > best_score:
                    best_score = score
                    best_breakdown = breakdown
                    best_temp = temp

            await leads_col.update_one(
                {"lead_id": lead["lead_id"]},
                {"$set": {
                    "score": best_score,
                    "score_breakdown": best_breakdown,
                    "temperature": best_temp,
                    "matched_brands": matched,
                    "updated_at": now,
                }},
            )
            leads_rescored += 1
    except Exception as e:
        errors.append(f"Rescore error: {e}")

    # 2. Detect serial claimers
    try:
        cutoff = now - timedelta(days=7)
        pipeline = [
            {"$match": {"claimed_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$phone", "cnt": {"$addToSet": "$offer_id"}}},
            {"$project": {"cnt": {"$size": "$cnt"}}},
            {"$match": {"cnt": {"$gte": 5}}},
        ]
        async for _ in claims_col.aggregate(pipeline):
            serial_flagged += 1
    except Exception as e:
        errors.append(f"Serial claimer detection error: {e}")

    # 3. Flag expiring offers
    try:
        expiry_window = now + timedelta(hours=48)
        offers_expiring = await offers_col.count_documents({
            "is_active": True,
            "expires_at": {"$lte": expiry_window, "$gte": now},
        })
    except Exception as e:
        errors.append(f"Offer expiry check error: {e}")

    # 4. Retry failed webhooks (LA3)
    try:
        retry_result = await wh_service.process_retry_queue()
        webhooks_retried = retry_result.get("retried", 0)
    except Exception as e:
        errors.append(f"Webhook retry error: {e}")

    # 5. Dedup scan (LA7)
    dedup_groups = 0
    try:
        dedup_result = await dedup_service.bulk_dedup_scan()
        dedup_groups = dedup_result.get("duplicate_groups", 0)
    except Exception as e:
        errors.append(f"Dedup scan error: {e}")

    # 6. Process notification digests (LA5)
    digests_sent = 0
    try:
        digest_result = await notif_service.send_pending_digests()
        digests_sent = digest_result.get("digests_sent", 0)
    except Exception as e:
        errors.append(f"Digest error: {e}")

    await bot_runs_col.update_one(
        {"run_id": run_id},
        {"$set": {
            "completed_at": datetime.now(timezone.utc),
            "status": "completed",
            "leads_processed": await leads_col.count_documents({}),
            "leads_rescored": leads_rescored,
            "serial_claimers_flagged": serial_flagged,
            "offers_expiring": offers_expiring,
            "webhooks_retried": webhooks_retried,
            "dedup_groups": dedup_groups,
            "digests_sent": digests_sent,
            "errors": errors,
        }},
    )

    logger.info("[la-bot] cycle %s done: rescored=%s serial=%s expiring=%s "
                "webhooks=%s dedup=%s digests=%s errors=%d",
                run_id, leads_rescored, serial_flagged, offers_expiring,
                webhooks_retried, dedup_groups, digests_sent, len(errors))

    return {
        "status": "ok",
        "run_id": run_id,
        "leads_rescored": leads_rescored,
        "serial_claimers_flagged": serial_flagged,
        "offers_expiring": offers_expiring,
        "webhooks_retried": webhooks_retried,
        "dedup_groups": dedup_groups,
        "digests_sent": digests_sent,
        "errors": errors,
    }


def start_lead_aggregator_scheduler() -> None:
    """Start the 6-hour bot cycle. Idempotent."""
    global _scheduler
    if _scheduler is not None:
        return
    if not _flag_set("LA_BOT_SCHEDULER_ENABLED", "0"):
        logger.info("[la-bot] scheduler disabled via LA_BOT_SCHEDULER_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            run_bot_cycle,
            IntervalTrigger(hours=6),
            id="la_bot_6h",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=3600,
        )
        _scheduler.start()
        logger.info("[la-bot] 6h scheduler started")
        if _flag_set("LA_BOT_STARTUP_CATCHUP", "0"):
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(run_bot_cycle())
            except RuntimeError:
                asyncio.create_task(run_bot_cycle())
            logger.info("[la-bot] startup catch-up cycle scheduled")
    except Exception as e:  # noqa: BLE001
        logger.warning("[la-bot] failed to start scheduler: %s", e)


def stop_lead_aggregator_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:
            pass
        _scheduler = None
