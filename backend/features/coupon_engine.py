"""
coupon_engine.py — Wallet Coupon Engine (W1).

Real partner coupons, stored in MongoDB instead of hardcoded frontend state:

  sa_coupons       — partner catalog (one row per partner offer)
  sa_user_coupons  — per-user claim rows (generated code / status / expiry)

Endpoints (all under /api):
   GET  /wallet/coupons/catalog            — claimable partner offers
   GET  /wallet/coupons/mine              — my claimed + used + expired
   POST /wallet/coupons/claim             — {coupon_id} (deducts credits if paid)
   POST /wallet/coupons/mark-used         — {user_coupon_id}

Seeds 6 real partner coupons on startup (idempotent):
  Featherless AI (50% off API Pro), SetupMark AI (free dev env),
  Bandiwala (30% campus food cashback), CodeSpectra (₹500 off bootcamp),
  WeHive (25% off coworking), StudentAlumni Premium (1 month free).

Expiry cron:
  - Daily sweep marks user coupons past their `expires_at` as "expired"
  - 3 days before expiry, pushes a reminder to the owner (once per coupon)
Runs under the same leader-elected, single-worker guard as the other
aggregator bots (see server.py _lifespan).

Uses core.db / core.deps (newer import convention, matching
activity_credits.py). No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("coupon_engine")
router = APIRouter()


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


COUPONS = "sa_coupons"
USER_COUPONS = "sa_user_coupons"

# Free static partner codes — the partner already issued these, no credits.
# Claiming one just hands the code to the user's wallet (still rate-limited).
# Paid ones cost `credits_cost`; claim generates SA-{PREFIX}-{4}.
SEED_PARTNERS: List[Dict[str, Any]] = [
    {
        "slug": "featherless_ai",
        "partner": "Featherless AI",
        "kind": "percentage", "value": 50,
        "title": "50% off Featherless AI API Pro (1 month)",
        "description": "Cut your AI API bill in half on the Pro tier for a full month.",
        "code": "SA-FEATHER50",
        "credits_cost": 0,
        "url": "https://featherless.ai",
        "logo": "https://www.google.com/s2/avatar_sx201_1738510762331483705547.png?d=444&d=3s",
        "expiry_days": 30,
        "max_claims": 200,
        "audience": ["all"],
    },
    {
        "slug": "setupmark_ai",
        "partner": "SetupMark AI",
        "kind": "free", "value": 0,
        "title": "Free developer environment on SetupMark AI",
        "description": "Provision a cloud dev env in one click, free for 14 days.",
        "code": "SA-SETUPFREE",
        "credits_cost": 0,
        "url": "https://setupmark.ai",
        "expiry_days": 14,
        "max_claims": 500,
        "audience": ["student", "mentor"],
    },
    {
        "slug": "bandiwala",
        "partner": "Bandiwala",
        "kind": "percentage", "value": 30,
        "title": "30% cashback on campus food via Bandiwala",
        "description": "Campus-order meals through the app and get 30% back in credits.",
        "code": "SA-BANDI30",
        "credits_cost": 0,
        "url": "https://bandiwala.in",
        "expiry_days": 21,
        "max_claims": 1000,
        "audience": ["student", "mentor", "alumni"],
    },
    {
        "slug": "codespectra",
        "partner": "CodeSpectra",
        "kind": "inr_off", "value": 500,
        "title": "₹500 off a CodeSpectra bootcamp",
        "description": "Apply to any full-time bootcamp; ₹500 off at checkout.",
        "code": "SA-CODESPE500",
        "credits_cost": 0,
        "url": "https://codespectra.io",
        "expiry_days": 60,
        "max_claims": 100,
        "audience": ["student", "alumni"],
    },
    {
        "slug": "wehive",
        "partner": "WeHive",
        "kind": "percentage", "value": 25,
        "title": "25% off WeHive coworking day pass",
        "description": "Grab a hot-desk day pass anywhere in the WeHive network.",
        "code": "SA-WEHIVE25",
        "credits_cost": 0,
        "url": "https://wehive.co",
        "expiry_days": 45,
        "max_claims": 300,
        "audience": ["all"],
    },
    {
        "slug": "sa_premium",
        "partner": "StudentAlumni Premium",
        "kind": "free", "value": 0,
        "title": "1 month of SA Premium — free",
        "description": "Unlock the Premium plan: extra mentor bookings, job alerts, and priority support.",
        "code": None,  # paid, generated on claim: SA-PREMIUM-XXXX
        "credits_cost": 400,
        "url": "https://studentalumni.in/premium",
        "expiry_days": 30,
        "max_claims": 500,
        "audience": ["student", "mentor", "alumni"],
    },
]


def _display_value(coupon: Dict[str, Any]) -> str:
    """Human-friendly discount badge text."""
    kind = coupon.get("kind")
    v = int(coupon.get("value") or 0)
    if kind == "percentage":
        return f"{v}% off"
    if kind == "inr_off":
        return f"₹{v:,} off"
    if kind == "free":
        return "Free"
    return "Offer"


# ─── SEED ────────────────────────────────────────────────────────────────
async def _ensure_seeded() -> None:
    """Idempotent: upserts the partner catalog on first call / when new."""
    now = datetime.now(timezone.utc)
    for p in SEED_PARTNERS:
        doc = {
            "slug": p["slug"],
            "partner": p["partner"],
            "title": p["title"],
            "description": p.get("description", ""),
            "kind": p["kind"],
            "value": p.get("value", 0),
            "static_code": p.get("code"),
            "credits_cost": int(p.get("credits_cost", 0)),
            "url": p.get("url"),
            "logo": p.get("logo"),
            "expiry_days": int(p.get("expiry_days", 30)),
            "max_claims": int(p.get("max_claims", 0)),
            "audience": p.get("audience") or ["all"],
            "active": True,
            "updated_at": now,
        }
        await _db[COUPONS].update_one(
            {"slug": p["slug"]},
            {"$set": doc, "$setOnInsert": {"created_at": now, "claims": 0}},
            upsert=True,
        )


# ─── HELPERS ────────────────────────────────────────────────────────────
def _gen_code(prefix: str) -> str:
    return f"SA-{prefix}-{uuid.uuid4().hex[:4].upper()}"


def _coupon_public(c: Dict[str, Any], role: str) -> Dict[str, Any]:
    aud = c.get("audience") or ["all"]
    visible = ("all" in aud) or (role in aud)
    return {
        "id": str(c["_id"]),
        "slug": c.get("slug"),
        "partner": c.get("partner"),
        "title": c.get("title"),
        "description": c.get("description"),
        "kind": c.get("kind"),
        "value": int(c.get("value") or 0),
        "display": _display_value(c),
        "credits_cost": int(c.get("credits_cost") or 0),
        "url": c.get("url"),
        "logo": c.get("logo"),
        "expiry_days": int(c.get("expiry_days", 30)),
        "max_claims": int(c.get("max_claims") or 0),
        "claims": int(c.get("claims") or 0),
        "available": int(c.get("max_claims") or 0) - int(c.get("claims") or 0),
        "visible_to_role": visible,
        "active": bool(c.get("active", True)),
    }


async def _resolve_coupon(coupon_id: str) -> Dict[str, Any]:
    from bson import ObjectId
    try:
        oid = ObjectId(coupon_id)
    except Exception:
        raise HTTPException(400, "Invalid coupon id")
    c = await _db[COUPONS].find_one({"_id": oid})
    if not c:
        c = await _db[COUPONS].find_one({"slug": coupon_id})
    if not c:
        raise HTTPException(404, "Coupon not found")
    return c


async def _deduct_credits(user: Dict[str, Any], amount: int, reason: str,
                          metadata: Optional[Dict[str, Any]] = None,
                          idem: Optional[str] = None) -> None:
    """Debits user's wallet via the idempotent core path in activity_credits."""
    if amount <= 0:
        return
    from features.activity_credits import _debit_user
    new_bal, dup = await _debit_user(user, amount, reason, metadata, idempotency_key=idem)
    if dup:
        raise HTTPException(409, "Already charged for this claim (idempotent replay).")


# ─── ENDPOINTS ───────────────────────────────────────────────────────────
@router.get("/wallet/coupons/catalog")
async def list_coupon_catalog(
    role_filter: Optional[str] = Query(None, alias="role"),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Claimable partner offers. ``role`` (optional) narrows to ones you can see.
    When not passed, filters to the current user's role automatically."""
    await _ensure_seeded()
    role = (role_filter or user.get("role") or "student").lower()
    docs = await _db[COUPONS].find({}).to_list(500)
    out = []
    for c in docs:
        pub = _coupon_public(c, role)
        if pub["active"] and pub["available"] > 0 and pub["visible_to_role"]:
            out.append(pub)
    out.sort(key=lambda x: (x["credits_cost"] == 0, x["partner"] or ""))
    return {"coupons": out, "count": len(out)}


@router.get("/wallet/coupons/mine")
async def my_coupons(
    status: Optional[str] = Query(None, pattern="^(active|used|expired)$"),
    limit: int = Query(50, le=200),
    user: dict = Depends(_get_current_user_dependency()),
):
    await _ensure_seeded()
    q: Dict[str, Any] = {"user_id": str(user["_id"])}
    if status:
        q["status"] = status
    rows = []
    async for uc in _db[USER_COUPONS].find(q).sort("claimed_at", -1).limit(limit):
        cat = await _db[COUPONS].find_one({"_id": uc.get("coupon_id")},
                                          {"_id": 0, "partner": 1, "title": 1,
                                           "kind": 1, "value": 1, "url": 1, "logo": 1})
        rows.append({
            "id": str(uc["_id"]),
            "coupon": cat or {},
            "code": uc.get("code"),
            "status": uc.get("status", "active"),
            "credits_paid": int(uc.get("credits_paid") or 0),
            "claimed_at": (uc.get("claimed_at") or datetime.now(timezone.utc)).isoformat(),
            "expires_at": (uc.get("expires_at") or datetime.now(timezone.utc)).isoformat(),
            "used_at": uc.get("used_at"),
        })
    active = [r for r in rows if r["status"] == "active"]
    return {"coupons": rows, "active_count": len(active)}


@router.post("/wallet/coupons/claim")
async def claim_coupon(
    body: Dict[str, Any] = Body(default={}),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Claim a partner coupon. Free ones (credits_cost == 0) hand the code out.
    Paid ones deduct credits and generate a unique SA-{PREFIX}-{XXXX} code.
    Body: { coupon_id: str }
    Idempotent: same user + same coupon with a live claim returns the existing row.
    """
    await _ensure_seeded()
    cid = (body or {}).get("coupon_id")
    if not cid:
        raise HTTPException(400, "coupon_id required")
    c = await _resolve_coupon(str(cid))
    role = (user.get("role") or "student").lower()
    aud = c.get("audience") or ["all"]
    if not (("all" in aud) or (role in aud)):
        raise HTTPException(403, "This offer is not for your role")
    if not c.get("active", True):
        raise HTTPException(410, "Offer is no longer available")

    remaining = int(c.get("max_claims") or 0) - int(c.get("claims") or 0)
    if int(c.get("max_claims") or 0) > 0 and remaining <= 0:
        raise HTTPException(409, "Offer is fully claimed")

    # Idempotent — live claim already exists for this user on this coupon
    ex = await _db[USER_COUPONS].find_one({
        "user_id": str(user["_id"]),
        "coupon_id": c["_id"],
        "status": {"$in": ["active", "used"]},
    })
    if ex:
        return {"ok": True, "duplicate": True, "user_coupon_id": str(ex["_id"]),
                "code": ex.get("code")}

    cost = int(c.get("credits_cost") or 0)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=int(c.get("expiry_days", 30)))

    if cost > 0:
        prefix = (c.get("slug") or "GEN").upper().replace("_", "")
        idem = f"coupon-claim:{user['_id']}:{c['_id']}"
        await _deduct_credits(user, cost, f"Coupon: {c.get('partner')}",
                              metadata={"coupon_slug": c.get("slug"), "coupon_id": str(c["_id"])},
                              idem=idem)
        code = _gen_code(prefix)
    else:
        code = c.get("static_code") or _gen_code("FREE")

    claim_res = await _db[USER_COUPONS].insert_one({
        "user_id": str(user["_id"]),
        "coupon_id": c["_id"],
        "code": code,
        "status": "active",
        "credits_paid": cost,
        "claimed_at": now,
        "expires_at": expires_at,
        "used_at": None,
    })
    if int(c.get("max_claims") or 0) > 0:
        await _db[COUPONS].update_one(
            {"_id": c["_id"]},
            {"$inc": {"claims": 1}, "$set": {"updated_at": now}},
        )
    return {
        "ok": True, "duplicate": False,
        "user_coupon_id": str(claim_res.inserted_id),
        "code": code, "expires_at": expires_at.isoformat(),
    }


@router.post("/wallet/coupons/mark-used")
async def mark_coupon_used(
    body: Dict[str, Any] = Body(default={}),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Marks a claimed coupon as used (the partner redeemed it). Idempotent."""
    ucid = (body or {}).get("user_coupon_id")
    if not ucid:
        raise HTTPException(400, "user_coupon_id required")
    from bson import ObjectId
    try:
        uc_oid = ObjectId(ucid)
    except Exception:
        raise HTTPException(400, "Invalid user_coupon_id")
    uc = await _db[USER_COUPONS].find_one({"_id": uc_oid},
                                          {"user_id": 1, "status": 1})
    if not uc or str(uc.get("user_id")) != str(user["_id"]):
        raise HTTPException(404, "Coupon not found for you")
    if uc.get("status") == "used":
        return {"ok": True, "duplicate": True}
    await _db[USER_COUPONS].update_one(
        {"_id": uc["_id"]},
        {"$set": {"status": "used", "used_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True, "duplicate": False}


# ─── EXPIRY CRON + 3-DAY REMINDER ───────────────────────────────────────
EXPIRY_REMINDER_DAYS = 3


async def sweep_expired_coupons() -> Dict[str, Any]:
    """Marks active user-coupons whose expires_at < now as 'expired' and
    sends a 3-day-before-expiry reminder for coupons in the [T-3, T) window
    (once per user-coupon, guarded by `reminder_sent_at`)."""
    now = datetime.now(timezone.utc)
    # 1) Expire anything past its date
    res = await _db[USER_COUPONS].update_many(
        {"status": "active", "expires_at": {"$lt": now}},
        {"$set": {"status": "expired"}},
    )
    expired = res.modified_count

    # 2) 3-day-before reminder
    lo = now + timedelta(days=EXPIRY_REMINDER_DAYS)
    soon = _db[USER_COUPONS].find({
        "status": "active",
        "expires_at": {"$lt": lo, "$gte": now},
        "reminder_sent_at": None,
    })
    reminded = 0
    try:
        from features.notifications import send_push
    except Exception:
        send_push = None
    async for uc in soon:
        c = await _db[COUPONS].find_one({"_id": uc.get("coupon_id")},
                                        {"_id": 0, "partner": 1, "title": 1})
        partner = (c or {}).get("partner", "your offer")
        await _db[USER_COUPONS].update_one(
            {"_id": uc["_id"]},
            {"$set": {"reminder_sent_at": now}},
        )
        if send_push:
            try:
                await send_push(
                    _db,
                    user_id=str(uc.get("user_id")),
                    title=f"{partner}: offer expires in {EXPIRY_REMINDER_DAYS} days",
                    body=f"Your claim for '{(c or {}).get('title') or partner}' expires soon. "
                          "Use the code in your Wallet before it lapses.",
                    data={"type": "coupon_expiring", "user_coupon_id": str(uc["_id"])},
                )
                reminded += 1
            except Exception as e:  # noqa: BLE001
                logger.warning("coupon reminder push failed: %s", e)
    logger.info("[coupon_engine] sweep: expired=%d reminded=%d", expired, reminded)
    return {"expired": expired, "reminded": reminded,
            "at": now.isoformat()}


# ─── SCHEDULER (leader-elected, see server.py) ─────────────────────────
_scheduler: Optional[Any] = None


def _flag_set(var: str, default: str = "1") -> bool:
    v = (os.environ.get(var) or default).strip().lower()
    return v in {"1", "true", "yes", "on"}


def start_coupon_engine_scheduler() -> None:
    """Daily 05:00 IST expiry sweep + 3-day reminder, guarded by
    COUPON_ENGINE_CRON_ENABLED (default 1)."""
    global _scheduler
    if _scheduler is not None:
        return
    if not _flag_set("COUPON_ENGINE_CRON_ENABLED", "1"):
        logger.info("[coupon_engine] cron disabled via COUPON_ENGINE_CRON_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz
        ist = pytz.timezone("Asia/Kolkata")
        _scheduler = AsyncIOScheduler(timezone=ist)
        _scheduler.add_job(
            sweep_expired_coupons,
            CronTrigger(hour=5, minute=0, timezone=ist),
            id="coupon_engine_expiry_daily",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _scheduler.start()
        logger.info("[coupon_engine] daily expiry cron started (05:00 IST)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[coupon_engine] failed to start scheduler: %s", e)

    if _flag_set("COUPON_ENGINE_RUN_ON_STARTUP", "1"):
        async def _startup_run():
            try:
                await _ensure_seeded()
                await sweep_expired_coupons()
            except Exception as e:  # noqa: BLE001
                logger.warning("[coupon_engine] startup run failed: %s", e)
        asyncio.ensure_future(_startup_run())


def stop_coupon_engine_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
        _scheduler = None
