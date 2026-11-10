"""
health_briefing_scheduler.py — Monday 09:00 IST cron for the weekly health
briefing agent (AI4).

APScheduler's CronTrigger with an Asia/Kolkata timezone fires the job every
Monday at 09:00 IST regardless of the server's own timezone. The job is
started from the leader-elected background-job block in server.py, so with
UVICORN_WORKERS>1 only one worker ever runs it.

Env:
  HEALTH_BRIEFING_CRON_ENABLED  default "0" — set "1" to start the cron
  HEALTH_BRIEFING_ENABLED       default "0" — master gate inside the agent
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

logger = logging.getLogger("health_briefing_scheduler")

_scheduler: Optional[Any] = None


def _flag_set(var: str, default: str) -> bool:
    val = (os.environ.get(var) or default).strip().lower()
    return val in {"1", "true", "yes", "on"}


async def run_weekly_briefing() -> None:
    """Cron entrypoint. Never raises — a failed briefing must not kill the
    scheduler."""
    try:
        from core.db import db as _db
        from services.agents.health_briefing_agent import run_health_briefing
        out = await run_health_briefing(_db)
        if out.get("skipped"):
            logger.info("[health_briefing] skipped: %s", out["skipped"])
        else:
            logger.info("[health_briefing] generated %s (%s insight(s))",
                        out.get("week_of"), len(out.get("insights") or []))
    except Exception as e:  # noqa: BLE001
        logger.warning("[health_briefing] run failed: %s", e)


def start_health_briefing_scheduler() -> None:
    """Start the Monday 09:00 IST cron. Idempotent."""
    global _scheduler
    if _scheduler is not None:
        return
    if not _flag_set("HEALTH_BRIEFING_CRON_ENABLED", "0"):
        logger.info("[health_briefing] cron disabled via HEALTH_BRIEFING_CRON_ENABLED")
        return
    try:
        import pytz
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger

        ist = pytz.timezone("Asia/Kolkata")
        _scheduler = AsyncIOScheduler(timezone=ist)
        _scheduler.add_job(
            run_weekly_briefing,
            CronTrigger(day_of_week="mon", hour=9, minute=0, timezone=ist),
            id="weekly_platform_health_briefing",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _scheduler.start()
        logger.info("[health_briefing] weekly cron started (Mon 09:00 IST)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[health_briefing] failed to start scheduler: %s", e)


def stop_health_briefing_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:
            pass
        _scheduler = None
