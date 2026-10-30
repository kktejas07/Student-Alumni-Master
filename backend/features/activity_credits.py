"""
activity_credits.py — Activity-based earnings engine + Wallet summary/topup/withdraw.

Earnings accrue based on role-aware activity events:
  - Student:  logins, certifications, milestones, sessions, workshops, events, referrals
  - Mentor:   sessions delivered, ratings, mentees onboarded, workshops hosted
  - Alumni:   referrals, AMAs, talks, donations, job postings
  - College:  students onboarded, events approved, drives hosted, engagement metrics

Conversion: 25 credits = ₹1 INR.

Endpoints (all under /api):
   GET  /wallet/summary                     — balance + earnings breakdown + history (one-shot)
   GET  /wallet/earnings                    — categorized lifetime earnings + level + streak
   POST /wallet/track                       — record an activity event (idempotent per period)
   POST /wallet/topup                       — INR → credits (mock gateway)
   POST /wallet/withdraw                    — credits → INR (mock cash-out)
   POST /wallet/seed-demo-earnings          — seed pre-populated activity events for the test user
   GET  /wallet/topup/upi?amount_inr=       — W7: UPI deep-link top-up session (deep link, QR, ref)
   GET  /wallet/topup/status/{ref}          — W7: poll UPI session; auto-settles on ledger confirm
   POST /wallet/topup/upi/settle           — W7: admin ops settle for a pending UPI session
"""
from __future__ import annotations

import os
import logging
import math
import uuid
from datetime import datetime, timezone, timedelta, date as _date
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("activity_credits")
router = APIRouter()

CREDITS_PER_INR = 25  # 25 credits = ₹1
WITHDRAW_THRESHOLD_CREDITS = 2500  # Need at least ₹100 worth before cash-out
TOPUP_BONUS_PCT = 5  # 5% bonus credits on top-up
UPI_TOPUPS = "sa_upi_topups"  # W7: pending UPI deep-link top-up sessions


def credits_to_inr(c: int) -> float:
    return round(c / CREDITS_PER_INR, 2)


def inr_to_credits(inr: float) -> int:
    return int(round(inr * CREDITS_PER_INR))


# ─── EARNING RULES (role-aware) ──────────────────────────────────────────
EARNING_RULES: Dict[str, Dict[str, Dict[str, Any]]] = {
    "student": {
        "daily_login":          {"credits": 5,   "label": "Daily login",                 "icon": "calendar-check",      "category": "engagement",     "max_per_day": 1},
        "login_streak_7":       {"credits": 50,  "label": "7-day login streak",          "icon": "fire",                "category": "engagement",     "once": True},
        "login_streak_30":      {"credits": 200, "label": "30-day login streak",         "icon": "fire",                "category": "engagement",     "once": True},
        "profile_completed":    {"credits": 100, "label": "Profile completed",           "icon": "account-check",       "category": "milestones",     "once": True},
        "certification_added":  {"credits": 75,  "label": "Certification added",         "icon": "certificate",         "category": "milestones"},
        "milestone_completed":  {"credits": 100, "label": "Career milestone",            "icon": "trophy-variant",      "category": "milestones"},
        "session_attended":     {"credits": 30,  "label": "Mentor session attended",     "icon": "video-account",       "category": "sessions"},
        "workshop_attended":    {"credits": 50,  "label": "Workshop attended",           "icon": "school",              "category": "events"},
        "event_registered":     {"credits": 20,  "label": "Event registered",            "icon": "calendar-plus",       "category": "events"},
        "event_completed":      {"credits": 60,  "label": "Event completed",             "icon": "calendar-check",      "category": "events"},
        "referral_signup":      {"credits": 150, "label": "Referral signed up",          "icon": "account-plus",        "category": "referrals"},
        "referral_active":      {"credits": 250, "label": "Referral became active",      "icon": "account-multiple-plus","category": "referrals"},
    },
    "mentor": {
        "daily_login":          {"credits": 5,   "label": "Daily login",                 "icon": "calendar-check",      "category": "engagement",     "max_per_day": 1},
        "session_delivered":    {"credits": 200, "label": "Session delivered",           "icon": "video-account",       "category": "sessions"},
        "five_star_rating":     {"credits": 100, "label": "5-star rating received",      "icon": "star",                "category": "sessions"},
        "mentee_onboarded":     {"credits": 100, "label": "Mentee onboarded",            "icon": "account-plus",        "category": "milestones"},
        "workshop_hosted":      {"credits": 500, "label": "Workshop hosted",             "icon": "school",              "category": "events"},
        "milestone_helped":     {"credits": 75,  "label": "Mentee milestone unlocked",   "icon": "trophy-variant",      "category": "milestones"},
        "profile_completed":    {"credits": 100, "label": "Profile completed",           "icon": "account-check",       "category": "milestones",     "once": True},
    },
    "alumni": {
        "daily_login":          {"credits": 5,   "label": "Daily login",                 "icon": "calendar-check",      "category": "engagement",     "max_per_day": 1},
        "referral_shared":      {"credits": 100, "label": "Referral shared",             "icon": "share-variant",       "category": "referrals"},
        "referral_active":      {"credits": 250, "label": "Referral hired",              "icon": "briefcase-check",     "category": "referrals"},
        "ama_hosted":           {"credits": 400, "label": "AMA hosted",                  "icon": "microphone",          "category": "events"},
        "talk_delivered":       {"credits": 350, "label": "Talk delivered",              "icon": "presentation",        "category": "events"},
        "donation_made":        {"credits": 500, "label": "Donation contributed",        "icon": "heart",               "category": "milestones"},
        "job_posting_shared":   {"credits": 75,  "label": "Job posting shared",          "icon": "briefcase-plus",      "category": "referrals"},
        "profile_completed":    {"credits": 100, "label": "Profile completed",           "icon": "account-check",       "category": "milestones",     "once": True},
    },
    "college": {
        "daily_login":          {"credits": 5,   "label": "Daily login",                 "icon": "calendar-check",      "category": "engagement",     "max_per_day": 1},
        "student_onboarded":    {"credits": 50,  "label": "Student onboarded",           "icon": "account-school",      "category": "milestones"},
        "event_approved":       {"credits": 100, "label": "Event approved",              "icon": "check-decagram",      "category": "events"},
        "drive_hosted":         {"credits": 500, "label": "Placement drive hosted",      "icon": "rocket-launch",       "category": "events"},
        "engagement_milestone": {"credits": 200, "label": "Engagement milestone",        "icon": "trophy-variant",      "category": "milestones"},
        "profile_completed":    {"credits": 100, "label": "Profile completed",           "icon": "account-check",       "category": "milestones",     "once": True},
    },
    "admin": {
        "daily_login":          {"credits": 5,   "label": "Daily login",                 "icon": "calendar-check",      "category": "engagement",     "max_per_day": 1},
        "profile_completed":    {"credits": 100, "label": "Profile completed",           "icon": "account-check",       "category": "milestones",     "once": True},
    },
}

# Levels are computed off lifetime_earned credits
LEVELS = [
    {"level": 1, "name": "Bronze",    "min": 0,      "icon": "medal-outline",  "color": "#A16207"},
    {"level": 2, "name": "Silver",    "min": 1000,   "icon": "medal",          "color": "#94A3B8"},
    {"level": 3, "name": "Gold",      "min": 5000,   "icon": "trophy",         "color": "#F59E0B"},
    {"level": 4, "name": "Platinum",  "min": 15000,  "icon": "crown",          "color": "#06B6D4"},
    {"level": 5, "name": "Diamond",   "min": 50000,  "icon": "diamond-stone",  "color": "#A855F7"},
]


def _compute_level(lifetime_earned: int) -> Dict[str, Any]:
    cur = LEVELS[0]
    nxt = None
    for i, lvl in enumerate(LEVELS):
        if lifetime_earned >= lvl["min"]:
            cur = lvl
            nxt = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
        else:
            break
    progress_pct = 100.0
    next_at = None
    if nxt:
        span = nxt["min"] - cur["min"]
        progress_pct = round(((lifetime_earned - cur["min"]) / span) * 100, 1) if span > 0 else 100.0
        next_at = nxt["min"]
    return {
        "level": cur["level"],
        "name": cur["name"],
        "icon": cur["icon"],
        "color": cur["color"],
        "next_level_name": nxt["name"] if nxt else None,
        "next_level_at": next_at,
        "progress_pct": min(100.0, progress_pct),
        "credits_to_next": (next_at - lifetime_earned) if next_at else 0,
    }


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


# ─── ACTIVITY TRACKING ───────────────────────────────────────────────────
async def _resolve_user(user_obj_id) -> Dict[str, Any]:
    u = await _db.users.find_one({"_id": user_obj_id})
    if not u:
        raise HTTPException(404, "User not found")
    return u


async def _credit_user(
    user: Dict[str, Any],
    amount: int,
    reason: str,
    metadata: Optional[Dict[str, Any]] = None,
    idempotency_key: Optional[str] = None,
) -> Tuple[int, bool]:
    """Adds `amount` credits to user.wallet. Returns (new_balance, was_duplicate)."""
    if amount <= 0:
        return 0, False
    if idempotency_key:
        ex = await _db.wallet_transactions.find_one({
            "user_id": str(user["_id"]),
            "idempotency_key": idempotency_key,
        })
        if ex:
            return int(ex.get("balance_after") or 0), True

    wallet = user.get("wallet") or {}
    cur = int(wallet.get("balance_credits", 0))
    new_bal = cur + amount
    lifetime_before = int(wallet.get("lifetime_earned") or 0)
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet.balance_credits": new_bal,
                  "wallet.last_credited_at": datetime.now(timezone.utc)},
         "$inc": {"wallet.lifetime_earned": amount}},
    )
    await _db.wallet_transactions.insert_one({
        "user_id": str(user["_id"]),
        "type": "credit",
        "amount": amount,
        "reason": reason,
        "metadata": metadata or {},
        "idempotency_key": idempotency_key,
        "balance_after": new_bal,
        "ts": datetime.now(timezone.utc),
    })
    await _maybe_notify_level_up(user, lifetime_before, lifetime_before + amount)
    return new_bal, False


async def _maybe_notify_level_up(user: Dict[str, Any],
                                 lifetime_before: int,
                                 lifetime_after: int) -> None:
    """Raise a level-up notification when a credit crosses a tier
    boundary. Uses the in-memory lifetime_earned snapshot, so callers
    that credit several times in one request should refresh
    user["wallet"]["lifetime_earned"] between calls."""
    try:
        before = _compute_level(lifetime_before)
        after = _compute_level(lifetime_after)
        if int(after.get("level") or 0) <= int(before.get("level") or 0):
            return
        from features.wallet_notifications import notify_level_up
        await notify_level_up(user, after)
    except Exception as e:  # noqa: BLE001
        logger.warning("level-up notification failed: %s", e)


async def _debit_user(
    user: Dict[str, Any],
    amount: int,
    reason: str,
    metadata: Optional[Dict[str, Any]] = None,
    idempotency_key: Optional[str] = None,
) -> Tuple[int, bool]:
    """Deducts `amount` credits. Returns (new_balance, was_duplicate). Raises 402 if insufficient."""
    if amount <= 0:
        return 0, False
    if idempotency_key:
        ex = await _db.wallet_transactions.find_one({
            "user_id": str(user["_id"]),
            "idempotency_key": idempotency_key,
        })
        if ex:
            return int(ex.get("balance_after") or 0), True

    wallet = user.get("wallet") or {}
    cur = int(wallet.get("balance_credits", 0))
    if amount > cur:
        raise HTTPException(402, f"Insufficient credits — balance {cur}, needed {amount}")
    new_bal = cur - amount
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet.balance_credits": new_bal,
                  "wallet.last_used_at": datetime.now(timezone.utc)},
         "$inc": {"wallet.lifetime_spent": amount}},
    )
    await _db.wallet_transactions.insert_one({
        "user_id": str(user["_id"]),
        "type": "debit",
        "amount": amount,
        "reason": reason,
        "metadata": metadata or {},
        "idempotency_key": idempotency_key,
        "balance_after": new_bal,
        "ts": datetime.now(timezone.utc),
    })
    return new_bal, False


async def _record_activity(
    user: Dict[str, Any],
    activity_type: str,
    role: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    role = role or user.get("role") or "student"
    rules = EARNING_RULES.get(role) or EARNING_RULES["student"]
    rule = rules.get(activity_type)
    if not rule:
        # Unknown activity — silently no-op (forward compat)
        return {"credited": 0, "skipped": True, "reason": "unknown_activity"}

    today = _date.today().isoformat()
    metadata = metadata or {}

    # Idempotency for once-per-day or once-only activities
    idem = None
    if rule.get("once"):
        idem = f"act:{user['_id']}:{activity_type}"
    elif rule.get("max_per_day"):
        idem = f"act:{user['_id']}:{activity_type}:{today}"
    else:
        idem = f"act:{user['_id']}:{activity_type}:{uuid.uuid4().hex[:12]}"

    amount = int(rule["credits"])
    label = rule["label"]

    # W8 wallet security: lock check, rate limit, daily earning cap, audit
    from features.wallet_security import (
        audit_op, alert_transaction, check_credit_rate_limit,
        check_daily_earning_cap, check_debit_lock,
    )
    await check_debit_lock(user)
    await check_credit_rate_limit(user)
    await check_daily_earning_cap(user, amount)
    await audit_op(str(user["_id"]), "credit", amount, f"Activity: {label}", "attempted",
                   {"activity_type": activity_type})

    new_bal, dup = await _credit_user(
        user, amount, f"Activity: {label}",
        metadata={**metadata, "activity_type": activity_type, "category": rule.get("category"), "icon": rule.get("icon")},
        idempotency_key=idem,
    )
    await audit_op(str(user["_id"]), "credit", 0 if dup else amount, f"Activity: {label}",
                   "ok" if not dup else "duplicate", {"activity_type": activity_type})
    await alert_transaction(user, {
        "type": "credit", "amount": 0 if dup else amount,
        "reason": f"Activity: {label}", "metadata": {"category": rule.get("category")}})
    # Also log to activity_events for analytics
    await _db.activity_events.insert_one({
        "user_id": str(user["_id"]),
        "role": role,
        "activity_type": activity_type,
        "category": rule.get("category"),
        "icon": rule.get("icon"),
        "label": label,
        "credits": amount if not dup else 0,
        "duplicate": dup,
        "ts": datetime.now(timezone.utc),
        "metadata": metadata,
    })

    return {
        "credited": 0 if dup else amount,
        "duplicate": dup,
        "balance_credits": new_bal,
        "activity": {"type": activity_type, "label": label, "icon": rule.get("icon"), "category": rule.get("category")},
    }


# ─── ENDPOINTS ────────────────────────────────────────────────────────────
@router.get("/wallet/summary")
async def wallet_summary(user: dict = Depends(_get_current_user_dependency())):
    """One-shot fetch for the Wallet page — balance, earnings breakdown, level, history."""
    u = await _resolve_user(user["_id"])
    wallet = u.get("wallet") or {}
    balance = int(wallet.get("balance_credits", 0))
    lifetime_earned = int(wallet.get("lifetime_earned", balance))
    lifetime_spent = int(wallet.get("lifetime_spent", 0))

    # Earnings by category
    role = u.get("role") or "student"
    rules = EARNING_RULES.get(role) or EARNING_RULES["student"]

    # Aggregate from activity_events
    pipeline = [
        {"$match": {"user_id": str(u["_id"])}},
        {"$group": {
            "_id": {"category": "$category", "activity_type": "$activity_type"},
            "label": {"$first": "$label"},
            "icon": {"$first": "$icon"},
            "total_credits": {"$sum": "$credits"},
            "count": {"$sum": 1},
            "last_at": {"$max": "$ts"},
        }},
    ]
    cat_map: Dict[str, Dict[str, Any]] = {}
    activity_breakdown: List[Dict[str, Any]] = []
    async for row in _db.activity_events.aggregate(pipeline):
        cat = row["_id"].get("category") or "other"
        atype = row["_id"].get("activity_type")
        rule_meta = rules.get(atype) or {}
        item = {
            "activity_type": atype,
            "label": row.get("label") or rule_meta.get("label") or atype,
            "icon": row.get("icon") or rule_meta.get("icon") or "trophy",
            "credits": int(row.get("total_credits") or 0),
            "count": int(row.get("count") or 0),
            "last_at": (row.get("last_at") or datetime.now(timezone.utc)).isoformat(),
        }
        activity_breakdown.append(item)
        c = cat_map.setdefault(cat, {"category": cat, "credits": 0, "items": []})
        c["credits"] += item["credits"]
        c["items"].append(item)

    # Sort each category items, sort categories by credits desc
    earnings_by_category = sorted(cat_map.values(), key=lambda x: -x["credits"])
    for c in earnings_by_category:
        c["items"].sort(key=lambda x: -x["credits"])

    # Recent transactions (last 30)
    history: List[Dict[str, Any]] = []
    cursor = _db.wallet_transactions.find({"user_id": str(u["_id"])}).sort("ts", -1).limit(30)
    async for t in cursor:
        history.append({
            "id": str(t.get("_id")),
            "type": t.get("type"),
            "amount": int(t.get("amount") or 0),
            "reason": t.get("reason") or "",
            "balance_after": int(t.get("balance_after") or 0),
            "metadata": t.get("metadata") or {},
            "ts": (t.get("ts") or datetime.now(timezone.utc)).isoformat(),
        })

    # Streak — count distinct days in last 30 days where any activity logged
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = today - timedelta(days=30)
    streak_days = set()
    async for ev in _db.activity_events.find({
        "user_id": str(u["_id"]),
        "ts": {"$gte": thirty_days_ago},
    }, {"ts": 1}):
        d = ev.get("ts")
        if isinstance(d, datetime):
            streak_days.add(d.date().isoformat())
    # Compute current consecutive-day streak
    cur_streak = 0
    d = today.date()
    while d.isoformat() in streak_days:
        cur_streak += 1
        d = d - timedelta(days=1)

    # Available earning rules for the user — the "ways to earn" list
    earning_rules_for_user = [
        {
            "activity_type": k,
            "label": v["label"],
            "icon": v["icon"],
            "credits": v["credits"],
            "category": v.get("category"),
            "once": bool(v.get("once")),
            "max_per_day": v.get("max_per_day"),
        }
        for k, v in rules.items()
    ]
    earning_rules_for_user.sort(key=lambda x: -x["credits"])

    level = _compute_level(lifetime_earned)

    return {
        "user_id": str(u["_id"]),
        "role": role,
        "full_name": u.get("full_name") or u.get("name") or "",
        "balance_credits": balance,
        "balance_inr": credits_to_inr(balance),
        "credits_per_inr": CREDITS_PER_INR,
        "lifetime_earned": lifetime_earned,
        "lifetime_spent": lifetime_spent,
        "withdraw_threshold_credits": WITHDRAW_THRESHOLD_CREDITS,
        "withdraw_threshold_inr": credits_to_inr(WITHDRAW_THRESHOLD_CREDITS),
        "topup_bonus_pct": TOPUP_BONUS_PCT,
        "level": level,
        "streak_days": cur_streak,
        "active_days_30": len(streak_days),
        "earnings_by_category": earnings_by_category,
        "activity_breakdown": activity_breakdown,
        "earning_rules": earning_rules_for_user,
        "history": history,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/wallet/earnings")
async def wallet_earnings(user: dict = Depends(_get_current_user_dependency())):
    """Lightweight earnings-only fetch (used by other dashboards)."""
    u = await _resolve_user(user["_id"])
    role = u.get("role") or "student"
    wallet = u.get("wallet") or {}
    return {
        "balance_credits": int(wallet.get("balance_credits", 0)),
        "lifetime_earned": int(wallet.get("lifetime_earned", 0)),
        "level": _compute_level(int(wallet.get("lifetime_earned", 0))),
        "role": role,
    }


@router.post("/wallet/track")
async def wallet_track_activity(
    body: Dict[str, Any],
    user: dict = Depends(_get_current_user_dependency()),
):
    """Track an activity event and credit the user. Body: { activity_type, metadata? }"""
    activity_type = (body or {}).get("activity_type")
    metadata = (body or {}).get("metadata") or {}
    if not activity_type:
        raise HTTPException(400, "activity_type required")
    u = await _resolve_user(user["_id"])
    res = await _record_activity(u, activity_type, role=u.get("role"), metadata=metadata)
    return {"ok": True, **res}


@router.post("/wallet/topup/create-order")
async def wallet_topup_create_order(
    body: Dict[str, Any],
    user: dict = Depends(_get_current_user_dependency()),
):
    """Create a Razorpay order for wallet top-up. Returns order_id + key_id."""
    amount_inr = float((body or {}).get("amount_inr") or 0)
    if amount_inr <= 0:
        raise HTTPException(400, "amount_inr must be positive")
    if amount_inr > 100000:
        raise HTTPException(400, "Max top-up is ₹1,00,000 per txn")

    # Razorpay config
    tool = await _db.installed_tools.find_one({"tool_id": "razorpay", "status": "connected"})
    if not tool:
        raise HTTPException(503, "Payment gateway not configured")
    creds = tool.get("credentials") or {}
    key_id = (creds.get("key_id") or creds.get("api_key") or "").strip()
    key_secret = (creds.get("key_secret") or creds.get("api_secret") or "").strip()
    if not key_id or not key_secret:
        raise HTTPException(503, "Payment gateway not configured")

    # Create Razorpay order
    import httpx
    receipt = f"wallet-topup-{str(user['_id'])[:8]}-{uuid.uuid4().hex[:8]}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(key_id, key_secret),
                json={
                    "amount": round(amount_inr * 100),
                    "currency": "INR",
                    "receipt": receipt,
                    "notes": {"type": "wallet_topup", "user_id": str(user["_id"])},
                },
            )
            if r.status_code not in (200, 201):
                print(f"[WALLET] Razorpay order creation failed: {r.status_code} {r.text}")
                raise HTTPException(503, f"Payment gateway returned error: {r.status_code}")
            order = r.json()
    except HTTPException:
        raise
    except Exception as e:
        print(f"[WALLET] Razorpay order creation exception: {e}")
        raise HTTPException(503, "Payment gateway error")

    return {
        "ok": True,
        "order_id": order["id"],
        "key_id": key_id,
        "amount": amount_inr,
    }


@router.post("/wallet/topup/verify")
async def wallet_topup_verify(
    body: Dict[str, Any],
    user: dict = Depends(_get_current_user_dependency()),
):
    """Verify Razorpay payment and credit wallet."""
    razorpay_order_id = (body or {}).get("razorpay_order_id") or ""
    razorpay_payment_id = (body or {}).get("razorpay_payment_id") or ""
    razorpay_signature = (body or {}).get("razorpay_signature") or ""
    amount_inr = float((body or {}).get("amount_inr") or 0)

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        raise HTTPException(400, "Missing payment verification fields")
    if amount_inr <= 0:
        raise HTTPException(400, "Invalid amount")

    # Razorpay config
    tool = await _db.installed_tools.find_one({"tool_id": "razorpay", "status": "connected"})
    if not tool:
        raise HTTPException(503, "Payment gateway not configured")
    creds = tool.get("credentials") or {}
    key_secret = (creds.get("key_secret") or creds.get("api_secret") or "").strip()

    # Verify signature
    import hmac as _hmac
    import hashlib
    expected = _hmac.new(
        key_secret.encode("utf-8"),
        f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not _hmac.compare_digest(expected, razorpay_signature):
        raise HTTPException(400, "Invalid payment signature")

    # W8 wallet security: rate limit + audit
    from features.wallet_security import audit_op, alert_transaction, check_credit_rate_limit
    await check_credit_rate_limit(user)
    await audit_op(str(user["_id"]), "topup", inr_to_credits(amount_inr),
                   "Razorpay top-up", "attempted", {"razorpay_order_id": razorpay_order_id})

    # Credit wallet
    base_credits = inr_to_credits(amount_inr)
    bonus_credits = int(round(base_credits * (TOPUP_BONUS_PCT / 100.0)))
    total_credits = base_credits + bonus_credits
    idem = f"topup:{user['_id']}:{razorpay_order_id}"

    u = await _resolve_user(user["_id"])
    new_bal, dup = await _credit_user(
        u, total_credits,
        f"Top-up ₹{amount_inr:.0f} via Razorpay (+{TOPUP_BONUS_PCT}% bonus)",
        metadata={
            "kind": "topup",
            "amount_inr": amount_inr,
            "base_credits": base_credits,
            "bonus_credits": bonus_credits,
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
        },
        idempotency_key=idem,
    )
    await audit_op(str(user["_id"]), "topup", 0 if dup else total_credits,
                   "Razorpay top-up", "ok" if not dup else "duplicate",
                   {"razorpay_order_id": razorpay_order_id})
    await alert_transaction(u, {
        "type": "credit", "amount": 0 if dup else total_credits,
        "reason": f"Top-up via Razorpay", "metadata": {"kind": "topup"}})
    return {
        "ok": True,
        "duplicate": dup,
        "amount_inr": amount_inr,
        "base_credits": base_credits,
        "bonus_credits": bonus_credits,
        "total_credits": total_credits,
        "balance_credits": new_bal,
        "balance_inr": credits_to_inr(new_bal),
    }


@router.post("/wallet/topup")
async def wallet_topup(
    body: Dict[str, Any],
    user: dict = Depends(_get_current_user_dependency()),
):
    """DEPRECATED — Mock top-up kept as fallback. Use /wallet/topup/create-order + /wallet/topup/verify instead."""
    amount_inr = float((body or {}).get("amount_inr") or 0)
    payment_method = (body or {}).get("payment_method") or "upi"
    idem = (body or {}).get("idempotency_key") or f"topup:{user['_id']}:{uuid.uuid4().hex[:12]}"

    if amount_inr <= 0:
        raise HTTPException(400, "amount_inr must be positive")
    if amount_inr > 100000:
        raise HTTPException(400, "Max top-up is ₹1,00,000 per txn")

    base_credits = inr_to_credits(amount_inr)
    bonus_credits = int(round(base_credits * (TOPUP_BONUS_PCT / 100.0)))
    total_credits = base_credits + bonus_credits

    # W8 wallet security: rate limit + audit
    from features.wallet_security import audit_op, alert_transaction, check_credit_rate_limit
    await check_credit_rate_limit(user)
    await audit_op(str(user["_id"]), "topup", total_credits, "Top-up", "attempted",
                   {"payment_method": payment_method})

    u = await _resolve_user(user["_id"])
    new_bal, dup = await _credit_user(
        u, total_credits,
        f"Top-up ₹{amount_inr:.0f} via {payment_method.upper()} (+{TOPUP_BONUS_PCT}% bonus)",
        metadata={
            "kind": "topup",
            "amount_inr": amount_inr,
            "base_credits": base_credits,
            "bonus_credits": bonus_credits,
            "payment_method": payment_method,
        },
        idempotency_key=idem,
    )
    await audit_op(str(user["_id"]), "topup", 0 if dup else total_credits, "Top-up",
                   "ok" if not dup else "duplicate", {"payment_method": payment_method})
    await alert_transaction(u, {
        "type": "credit", "amount": 0 if dup else total_credits,
        "reason": f"Top-up via {payment_method.upper()}", "metadata": {"kind": "topup"}})
    return {
        "ok": True,
        "duplicate": dup,
        "amount_inr": amount_inr,
        "base_credits": base_credits,
        "bonus_credits": bonus_credits,
        "total_credits": total_credits,
        "balance_credits": new_bal,
        "balance_inr": credits_to_inr(new_bal),
    }


# ─── UPI Deep Link Top-up (W7) ──────────────────────────────────────
# Zero-gateway-cost option alongside Razorpay: pay the SA VPA directly
# via upi:// deep link (mobile UPI app grid) or QR (desktop). A session
# lands in sa_upi_topups; the frontend polls GET /wallet/topup/status/{ref}
# and _upi_check_pending_topups() auto-settles when the UPI tool ledger
# confirms the transaction ref. Without a configured VPA the flow runs
# in demo mode and settles immediately so the UX works end to end.

UPI_APPS = [
    {"id": "gpay", "name": "Google Pay"},
    {"id": "phonepe", "name": "PhonePe"},
    {"id": "paytm", "name": "Paytm"},
    {"id": "bhim", "name": "BHIM"},
]


async def _upi_vpa() -> Optional[str]:
    """Receiving VPA: sa_settings value, then the UPI installed tool,
    then SA_WALLET_UPI_VPA env. None = not configured (demo mode)."""
    try:
        doc = await _db.sa_settings.find_one({"key": "wallet_upi_vpa"})
        if (doc or {}).get("value"):
            return str(doc["value"]).strip()
    except Exception:
        logger.warning("Failed to read wallet UPI VPA from sa_settings; trying next source", exc_info=True)
    try:
        tool = await _db.installed_tools.find_one(
            {"tool_id": "upi", "status": "connected"})
        vpa = str(((tool or {}).get("credentials") or {}).get("vpa") or "").strip()
        if vpa:
            return vpa
    except Exception:
        logger.warning("Failed to read wallet UPI VPA from installed_tools; trying env fallback", exc_info=True)
    return os.environ.get("SA_WALLET_UPI_VPA", "").strip() or None


def _upi_deep_link(vpa: str, amount_inr: float, ref: str) -> str:
    return (f"upi://pay?pa={vpa}"
            "&pn=StudentAlumni"
            f"&am={amount_inr:.2f}"
            "&cu=INR"
            f"&tn=Wallet%20top-up%20(+{int(inr_to_credits(amount_inr))}%20credits)"
            f"&tr={ref}")


def _upi_qr_payload(vpa: str, amount_inr: float, ref: str) -> str:
    """NPIC collect QR content — client renders it as an image."""
    return (f"upi://pay?pa={vpa}&pn=StudentAlumni"
            f"&am={amount_inr:.2f}&cu=INR&tr={ref}")


async def _upi_settle_topup(doc: Dict[str, Any], vpa: str) -> Dict[str, Any]:
    """Credit a pending UPI session (idempotent per ref) and settle it."""
    uid = str(doc["user_id"])
    amount_inr = float(doc.get("amount_inr") or 0)
    ref = str(doc["ref"])
    base_credits = inr_to_credits(amount_inr)
    bonus_credits = int(round(base_credits * (TOPUP_BONUS_PCT / 100.0)))
    total_credits = base_credits + bonus_credits

    from features.wallet_security import audit_op, alert_transaction, check_credit_rate_limit
    u = await _resolve_user(ObjectId(uid))
    await check_credit_rate_limit(u)
    await audit_op(uid, "topup", total_credits, "UPI top-up", "attempted", {"ref": ref})
    new_bal, dup = await _credit_user(
        u, total_credits,
        f"Top-up ₹{amount_inr:.0f} via UPI (+{TOPUP_BONUS_PCT}% bonus)",
        metadata={"kind": "topup", "amount_inr": amount_inr,
                  "base_credits": base_credits, "bonus_credits": bonus_credits,
                  "payment_method": "upi", "ref": ref, "upi": True},
        idempotency_key=f"topup:upi:{uid}:{ref}",
    )
    await _db[UPI_TOPUPS].update_one(
        {"ref": ref, "status": {"$ne": "settled"}},
        {"$set": {"status": "settled", "settled_at": datetime.now(timezone.utc),
                  "total_credits": 0 if dup else total_credits}})
    await audit_op(uid, "topup", 0 if dup else total_credits, "UPI top-up",
                   "ok" if not dup else "duplicate", {"ref": ref})
    await alert_transaction(u, {"type": "credit",
                                "amount": 0 if dup else total_credits,
                                "reason": "Top-up via UPI",
                                "metadata": {"kind": "topup"}})
    try:
        from features.wallet_notifications import notify_wallet_event
        await notify_wallet_event(
            u, "earn", "UPI top-up confirmed",
            f"₹{amount_inr:.0f} added: +{total_credits} credits "
            f"(incl. {TOPUP_BONUS_PCT}% bonus).",
            data={"kind": "topup", "ref": ref, "amount": total_credits})
    except Exception:
        pass
    return {"ref": ref, "amount_inr": amount_inr,
            "total_credits": 0 if dup else total_credits,
            "duplicate": dup, "balance_credits": new_bal}


async def _upi_check_pending_topups(ref: str) -> Dict[str, Any]:
    """Scan the UPI tool ledger for a paid tx matching our ref and settle."""
    try:
        tool = await _db.installed_tools.find_one(
            {"tool_id": "upi", "status": "connected"})
        if not tool:
            return {"ref": ref, "settled": False,
                    "note": "UPI gateway not connected"}
        ledger = ((tool.get("credentials") or {}).get("ledger")
                  or tool.get("txns") or [])
        for t in ledger:
            if str(t.get("tr") or t.get("ref") or "") != ref:
                continue
            if str(t.get("status") or "").lower() in ("success", "captured", "paid"):
                doc = await _db[UPI_TOPUPS].find_one({"ref": ref})
                if doc and doc.get("status") == "pending":
                    await _upi_settle_topup(doc, doc.get("vpa") or "upi")
                return {"ref": ref, "settled": True}
        return {"ref": ref, "settled": False,
                "note": "payment not confirmed yet"}
    except Exception as e:  # noqa: BLE001
        logger.warning("UPI ledger check failed for %s: %s", ref, e)
        return {"ref": ref, "settled": False, "note": "ledger check failed"}


@router.get("/wallet/topup/upi")
async def wallet_topup_upi(
    amount_inr: float = Query(0, gt=0, le=100000),
    user: dict = Depends(_get_current_user_dependency()),
):
    """W7: prepare a UPI deep-link top-up session — deep link for the
    mobile UPI app grid, QR payload for desktop, and a `ref` to poll on
    /wallet/topup/status/{ref}. No VPA configured -> demo settle."""
    uid = str(user["_id"])
    ref = "upitop-" + uuid.uuid4().hex[:12]
    base_credits = inr_to_credits(amount_inr)
    expected = base_credits + int(round(base_credits * (TOPUP_BONUS_PCT / 100.0)))
    vpa = await _upi_vpa()
    demo = vpa is None
    await _db[UPI_TOPUPS].insert_one({
        "ref": ref, "user_id": uid, "amount_inr": amount_inr,
        "status": "pending", "vpa": "demo@sa-upi" if demo else vpa,
        "demo": demo, "ts": datetime.now(timezone.utc),
    })

    if demo:
        # No VPA configured — settle immediately so the UX works end to end.
        res = await _upi_settle_topup(
            {"ref": ref, "user_id": uid, "amount_inr": amount_inr}, "demo@sa-upi")
        return {"ok": True, "ref": ref, "status": "settled", "demo": True,
                "amount_inr": amount_inr, "expected_credits": expected,
                "upi": {"apps": UPI_APPS, "deep_link": None,
                         "qr_payload": None, "vpa": None},
                "balance_credits": res["balance_credits"],
                "note": "UPI not configured — demo mode credited your wallet directly."}

    from features.wallet_security import _mask_vpa
    return {"ok": True, "ref": ref, "status": "pending", "demo": False,
            "amount_inr": amount_inr, "expected_credits": expected,
            "upi": {"apps": UPI_APPS, "vpa": _mask_vpa(vpa),
                    "deep_link": _upi_deep_link(vpa, amount_inr, ref),
                    "qr_payload": _upi_qr_payload(vpa, amount_inr, ref)},
            "note": "Pay in any UPI app, then poll /wallet/topup/status/{ref} until settled."}


@router.get("/wallet/topup/status/{ref}")
async def wallet_topup_status(
    ref: str,
    user: dict = Depends(_get_current_user_dependency()),
):
    """W7: poll a UPI deep-link session; auto-settles when the UPI
    gateway ledger confirms the transaction ref."""
    uid = str(user["_id"])
    doc = await _db[UPI_TOPUPS].find_one({"ref": ref, "user_id": uid})
    if not doc:
        raise HTTPException(404, "Unknown top-up reference")
    if doc.get("status") == "pending":
        check = await _upi_check_pending_topups(ref)
        if check.get("settled"):
            doc = await _db[UPI_TOPUPS].find_one({"ref": ref})
    amount_inr = float(doc.get("amount_inr") or 0)
    base_credits = inr_to_credits(amount_inr)
    expected = base_credits + int(round(base_credits * (TOPUP_BONUS_PCT / 100.0)))
    settled = doc.get("status") == "settled"
    return {"ok": True, "ref": ref, "status": doc.get("status"),
            "amount_inr": amount_inr, "expected_credits": expected,
            "credits": int(doc.get("total_credits") or 0) if settled else 0,
            "demo": bool(doc.get("demo")),
            "settled_at": doc.get("settled_at"),
            "note": ("Waiting for your UPI app to confirm — check again "
                      "in a few seconds."
                     if not settled else "Top-up settled. Credits are in your wallet.")}


def _require_admin_dependency():
    from core.deps import require_admin_role  # noqa
    return require_admin_role


@router.post("/wallet/topup/upi/settle")
async def wallet_topup_upi_settle(
    body: Dict[str, Any],
    user: dict = Depends(_require_admin_dependency()),
):
    """W7 ops endpoint: manually confirm a pending UPI session (e.g. the
    bank ref arrived off-system). Idempotent."""
    ref = str((body or {}).get("ref") or "").strip()
    if not ref:
        raise HTTPException(400, "ref required")
    doc = await _db[UPI_TOPUPS].find_one({"ref": ref})
    if not doc:
        raise HTTPException(404, "Unknown top-up reference")
    if doc.get("status") == "settled":
        return {"ok": True, "ref": ref, "status": "settled", "duplicate": True}
    res = await _upi_settle_topup(doc, doc.get("vpa") or "upi")
    return {"ok": True, "ref": ref, "status": "settled", **res}


@router.post("/wallet/withdraw")
async def wallet_withdraw(
    body: Dict[str, Any],
    user: dict = Depends(_get_current_user_dependency()),
):
    """Mock withdraw: convert credits to INR at 25:1 (e.g., 2500 credits → ₹100).
    Body: { amount_credits?: int, amount_inr?: number, method?: 'upi'|'bank', target?: str, idempotency_key? }
    """
    amount_credits = int((body or {}).get("amount_credits") or 0)
    amount_inr = float((body or {}).get("amount_inr") or 0)
    if not amount_credits and amount_inr > 0:
        amount_credits = inr_to_credits(amount_inr)
    if amount_credits <= 0:
        raise HTTPException(400, "amount required (credits or inr)")
    if amount_credits < WITHDRAW_THRESHOLD_CREDITS:
        raise HTTPException(
            400,
            f"Minimum withdrawal is {WITHDRAW_THRESHOLD_CREDITS} credits (₹{credits_to_inr(WITHDRAW_THRESHOLD_CREDITS):.0f})",
        )

    method = (body or {}).get("method") or "upi"
    target = (body or {}).get("target") or "—"
    idem = (body or {}).get("idempotency_key") or f"wd:{user['_id']}:{uuid.uuid4().hex[:12]}"

    # W8 wallet security: lock check, KYC-lite, withdrawal rate limits, audit
    from features.wallet_security import (
        audit_op, alert_transaction, check_debit_lock,
        check_withdrawal_rate_limits, require_kyc_for_withdrawal,
    )
    await check_debit_lock(user)
    await require_kyc_for_withdrawal(user, amount_credits)
    await check_withdrawal_rate_limits(user)
    await audit_op(str(user["_id"]), "withdraw", amount_credits, "Withdrawal", "attempted",
                   {"method": method})

    u = await _resolve_user(user["_id"])
    try:
        new_bal, dup = await _debit_user(
            u, amount_credits,
            f"Withdraw ₹{credits_to_inr(amount_credits):.0f} via {method.upper()}",
            metadata={
                "kind": "withdraw",
                "amount_credits": amount_credits,
                "amount_inr": credits_to_inr(amount_credits),
                "method": method,
                "target": target,
                "status": "processing",
                "eta": "1-2 business days",
            },
            idempotency_key=idem,
        )
    except HTTPException:
        await audit_op(str(user["_id"]), "withdraw", amount_credits, "Withdrawal", "failed",
                       {"method": method})
        from features.wallet_security import register_failed_debit
        await register_failed_debit(u)
        raise
    await audit_op(str(user["_id"]), "withdraw", 0 if dup else amount_credits, "Withdrawal",
                   "ok" if not dup else "duplicate", {"method": method})
    await alert_transaction(u, {
        "type": "debit", "amount": 0 if dup else amount_credits,
        "reason": f"Withdraw via {method.upper()}", "metadata": {"kind": "withdraw"}})
    return {
        "ok": True,
        "duplicate": dup,
        "amount_credits": amount_credits,
        "amount_inr": credits_to_inr(amount_credits),
        "balance_credits": new_bal,
        "balance_inr": credits_to_inr(new_bal),
        "method": method,
        "status": "processing",
        "eta": "1-2 business days",
    }


# ─── DEMO SEEDER ─────────────────────────────────────────────────────────
@router.post("/wallet/seed-demo-earnings")
async def wallet_seed_demo(user: dict = Depends(_get_current_user_dependency())):
    """Idempotent seeder — pre-populates a realistic earnings ledger for the current user.
    Useful for demo: makes the Wallet page feel alive immediately.
    """
    u = await _resolve_user(user["_id"])
    role = u.get("role") or "student"
    rules = EARNING_RULES.get(role) or EARNING_RULES["student"]

    # Demo plan: which activities to seed and how many times each
    demo_plan: Dict[str, List[str]] = {
        "student": [
            "profile_completed", "daily_login", "login_streak_7",
            "certification_added", "certification_added", "certification_added",
            "milestone_completed", "milestone_completed",
            "session_attended", "session_attended", "session_attended",
            "workshop_attended", "workshop_attended",
            "event_registered", "event_registered", "event_registered", "event_completed",
            "referral_signup", "referral_active",
        ],
        "mentor": [
            "profile_completed", "daily_login", "login_streak_7",
            "session_delivered", "session_delivered", "session_delivered", "session_delivered",
            "five_star_rating", "five_star_rating",
            "mentee_onboarded", "mentee_onboarded", "mentee_onboarded",
            "workshop_hosted", "milestone_helped", "milestone_helped",
        ],
        "alumni": [
            "profile_completed", "daily_login", "login_streak_7",
            "referral_shared", "referral_shared", "referral_active",
            "ama_hosted", "talk_delivered",
            "donation_made", "job_posting_shared", "job_posting_shared",
        ],
        "college": [
            "profile_completed", "daily_login", "login_streak_7",
            "student_onboarded", "student_onboarded", "student_onboarded", "student_onboarded",
            "event_approved", "event_approved", "drive_hosted", "engagement_milestone",
        ],
        "admin": ["profile_completed", "daily_login"],
    }
    plan = demo_plan.get(role) or demo_plan["student"]
    plan = [a for a in plan if a in rules]

    seeded_count = 0
    seeded_credits = 0
    now = datetime.now(timezone.utc)

    for i, activity_type in enumerate(plan):
        rule = rules[activity_type]
        amount = int(rule["credits"])
        # Build a deterministic idempotency key per seed slot so repeated calls don't double-credit
        idem = f"seed:{u['_id']}:{activity_type}:{i}"
        # Skip if already exists
        ex = await _db.wallet_transactions.find_one({"user_id": str(u["_id"]), "idempotency_key": idem})
        if ex:
            continue

        # Backdate ts so history feels real (1 to N days back)
        backdated = now - timedelta(days=(len(plan) - i), hours=(i % 6))
        wallet = (await _db.users.find_one({"_id": u["_id"]}, {"wallet": 1}) or {}).get("wallet") or {}
        cur_bal = int(wallet.get("balance_credits", 0))
        new_bal = cur_bal + amount
        await _db.users.update_one(
            {"_id": u["_id"]},
            {"$set": {"wallet.balance_credits": new_bal,
                      "wallet.last_credited_at": backdated},
             "$inc": {"wallet.lifetime_earned": amount}},
        )
        await _db.wallet_transactions.insert_one({
            "user_id": str(u["_id"]),
            "type": "credit",
            "amount": amount,
            "reason": f"Activity: {rule['label']}",
            "metadata": {"activity_type": activity_type, "category": rule.get("category"), "icon": rule.get("icon"), "seed": True},
            "idempotency_key": idem,
            "balance_after": new_bal,
            "ts": backdated,
        })
        await _db.activity_events.insert_one({
            "user_id": str(u["_id"]),
            "role": role,
            "activity_type": activity_type,
            "category": rule.get("category"),
            "icon": rule.get("icon"),
            "label": rule["label"],
            "credits": amount,
            "duplicate": False,
            "ts": backdated,
            "metadata": {"seed": True},
        })
        seeded_count += 1
        seeded_credits += amount

    # Refresh user
    u = await _resolve_user(u["_id"])
    return {
        "ok": True,
        "role": role,
        "seeded_events": seeded_count,
        "seeded_credits": seeded_credits,
        "balance_credits": int((u.get("wallet") or {}).get("balance_credits", 0)),
        "lifetime_earned": int((u.get("wallet") or {}).get("lifetime_earned", 0)),
    }



# ─── Money Coach (W4: deterministic slash commands + hybrid LLM) ────────
async def _coach_context(user: dict) -> Dict[str, Any]:
    """Personalized wallet context for the coach — feeds both the
    deterministic replies and the LLM prompt."""
    from features.coupon_engine import USER_COUPONS
    from features.referral_engine import _get_or_create_referral

    wallet = (user.get("wallet") or {})
    balance_cr = int(wallet.get("balance_credits") or 0)
    lifetime = int(wallet.get("lifetime_earned") or 0)
    level = _compute_level(lifetime)

    total_in = 0
    total_out = 0
    by_cat: Dict[str, int] = {}
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    async for t in _db.wallet_transactions.find(
            {"user_id": str(user["_id"]), "ts": {"$gte": cutoff}}):
        amt = int(t.get("amount") or 0)
        if t.get("type") == "credit":
            total_in += amt
            cat = (t.get("metadata") or {}).get("category") or "other"
            by_cat[cat] = by_cat.get(cat, 0) + amt
        elif t.get("type") == "debit":
            total_out += amt

    streak = 0
    try:
        from features.gamification_engine import _streak_state
        streak = int((await _streak_state(user)).get("current") or 0)
    except Exception:
        pass

    try:
        referral_count = len((await _get_or_create_referral(user)).get(
            "referred_users") or [])
    except Exception:
        referral_count = 0

    try:
        active_coupons = await _db[USER_COUPONS].count_documents({
            "user_id": str(user["_id"]), "status": "active"})
    except Exception:
        active_coupons = 0

    upcoming_events: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    for field in ("start_date", "when", "date"):
        try:
            rows = await _db.events.find(
                {field: {"$gte": now}}).sort(field, 1).limit(3).to_list(3)
        except Exception:
            continue
        if rows:
            upcoming_events = [
                {"id": str(r.get("_id")), "title": r.get("title")}
                for r in rows if r.get("title")]
            break

    profile = user.get("profile") or {}
    profile_fields = [f for f in ("headline", "about", "education", "skills")
                      if (profile.get(f) or user.get(f))]
    profile_completion = round(len(profile_fields) / 4 * 100)

    return {
        "balance_credits": balance_cr,
        "balance_inr": balance_cr // CREDITS_PER_INR,
        "lifetime_earned": lifetime,
        "level": level,
        "streak_days": streak,
        "earn_30d": total_in,
        "spend_30d": total_out,
        "earn_by_cat": dict(sorted(by_cat.items(), key=lambda x: -x[1])),
        "active_coupons": active_coupons,
        "upcoming_events": upcoming_events,
        "profile_completion": profile_completion,
        "referral_count": referral_count,
    }


COACH_SYSTEM = (
    "You are the StudentAlumni Money Coach — a friendly, encouraging, "
    "practical wallet assistant for students and alumni in India. "
    "You only talk about SA credits, wallet topups and withdrawals, "
    "campus deals, and SA rewards. Never recommend external financial "
    "products (banks, loans, investment apps, crypto). Keep replies under "
    "150 words, warm but concrete, and end with one actionable next step. "
    "No emoji. Plain text only."
)


def _coach_user_prompt(ctx: Dict[str, Any], message: str) -> str:
    lvl = ctx["level"]
    lines = [
        f"Your wallet: {ctx['balance_credits']} credits "
        f"(~₹{ctx['balance_inr']}), {lvl['name']} tier "
        f"({lvl['progress_pct']}% toward "
        f"{lvl.get('next_level_name') or 'top tier'}).",
        f"Lifetime earned: {ctx['lifetime_earned']} credits. "
        f"Login streak: {ctx['streak_days']} day(s).",
        f"Last 30 days: +{ctx['earn_30d']} credits earned, "
        f"-{ctx['spend_30d']} spent.",
    ]
    top_cat = next(iter(ctx["earn_by_cat"]), None)
    if top_cat:
        lines.append(f"Top earning category: {top_cat}.")
    lines.append(f"Active coupons: {ctx['active_coupons']}. "
                 f"Referrals: {ctx['referral_count']}. "
                 f"Profile completion: {ctx['profile_completion']}%.")
    if ctx["upcoming_events"]:
        lines.append("Upcoming events: "
                     + ", ".join(e["title"] for e in ctx["upcoming_events"]))
    lines.append(f"\nYour message: {message}")
    return "\n".join(lines)


async def _coach_llm_reply(ctx: Dict[str, Any],
                           message: str) -> Optional[str]:
    """Route free-text coach questions to Claude (emergentintegrations).

    Returns the reply, or None when the LLM is unavailable — the caller
    then serves the deterministic fallback."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        return None
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return None
    try:
        chat = (LlmChat(api_key=api_key,
                        session_id=f"coach-{uuid.uuid4().hex[:8]}",
                        system_message=COACH_SYSTEM)
                 .with_model("anthropic", "claude-sonnet-4-5-20250929"))
        out = await chat.send_message(
            UserMessage(text=_coach_user_prompt(ctx, message)))
        return (out or "").strip() or None
    except Exception as e:  # noqa: BLE001
        logger.warning("money coach LLM fallback: %s", e)
        return None


async def _coach_fallback(ctx: Dict[str, Any]) -> str:
    """Deterministic nudge when the LLM is unavailable."""
    lvl = ctx["level"]
    nxt = lvl.get("next_level_name")
    if nxt:
        gap = int(lvl.get("credits_to_next") or 0)
        return (f"You have {ctx['balance_credits']} credits and need {gap} "
                f"more lifetime credits for {nxt}. Try /credit-plan for the "
                "fastest path, or earn more by claiming deals, referring a "
                f"friend (+100cr), and keeping your {ctx['streak_days']}-day "
                "streak alive.")
    return ("You're at the top tier — nice work. Use /spend to review "
            "your last 30 days, /forecast to project ahead, or redeem "
            "rewards in the Rewards tab while your balance is high.")


async def _coach_peer_benchmark() -> Optional[Dict[str, Any]]:
    """Average 30-day credits earned across active wallet users, so
    /compare can place the user against real peers instead of a guess."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    try:
        rows = await _db.wallet_transactions.aggregate([
            {"$match": {"type": "credit", "ts": {"$gte": cutoff}}},
            {"$group": {"_id": "$user_id", "earned": {"$sum": "$amount"}}},
            {"$project": {"earned": 1}},
        ]).to_list(50000)
    except Exception as e:  # noqa: BLE001
        logger.warning("coach peer benchmark unavailable: %s", e)
        return None
    if not rows:
        return None
    avg = int(sum(r["earned"] for r in rows) / len(rows))
    return {"avg_peer_earn_30d": avg, "active_wallet_users": len(rows)}


@router.post("/wallet/coach/chat")
async def wallet_coach_chat(body: Dict[str, Any] = Body(default={}),
                             user: dict = Depends(_get_current_user_dependency())):
    """Hybrid Money Coach (W4). Slash commands stay deterministic and
    free; anything else goes to Claude with personalized wallet context
    and falls back to a deterministic nudge when the LLM is unavailable."""
    message = (body or {}).get("message", "").strip()
    low = message.lower()
    ctx = await _coach_context(user)
    balance_cr = ctx["balance_credits"]
    balance_inr = ctx["balance_inr"]
    lifetime = ctx["lifetime_earned"]
    total_in = ctx["earn_30d"]
    total_out = ctx["spend_30d"]
    by_cat = ctx["earn_by_cat"]
    name = user.get("first_name") or "there"
    lvl = ctx["level"]

    cmd = "chat"
    reply = ""
    cards: List[Dict[str, Any]] = []
    actions: List[Dict[str, Any]] = []

    if low.startswith("/spend"):
        cmd = "spend"
        sorted_cat = sorted(by_cat.items(), key=lambda x: -x[1])[:6]
        reply = (f"In the last 30 days you've moved {total_in} credits in & "
                 f"{total_out} credits out. Top category: "
                 f"{sorted_cat[0][0]} with {sorted_cat[0][1]} credits."
                 if sorted_cat else
                 "No transactions in the last 30 days yet — your wallet ledger is clean.")
        cards = [{"type": "donut", "data": [
            {"label": k.title(), "value": v} for k, v in sorted_cat]}]

    elif low.startswith("/save"):
        cmd = "save"
        try:
            goal = int("".join(c for c in message if c.isdigit())) or 1000
        except Exception:
            goal = 1000
        per_week = max(50, goal // 12)
        reply = (f"To save ₹{goal:,}, set aside ₹{per_week:,}/week from "
                 f"campus savings + redirect ₹{per_week//2}/week of cashback "
                 f"into your wallet. You'd hit the goal in 12 weeks.")
        actions = [{"label": "Enable Auto-save", "action": "auto_save"},
                   {"label": "Find cashback offers", "action": "navigate",
                    "url": "/deals"}]

    elif low.startswith("/goal"):
        cmd = "goal"
        digits = [d for d in message.split() if d.isdigit()]
        target = int(digits[0]) if digits else int(lvl.get("next_level_at") or 0)
        await _db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"wallet.goal_credits": target,
                      "wallet.goal_set_at": datetime.now(timezone.utc)}})
        gap = max(0, target - lifetime)
        daily_rate = round(total_in / 30, 1) if total_in else 0
        eta = (f" At your current pace ({daily_rate}cr/day) that's about "
               f"{math.ceil(gap / daily_rate)} days."
               if daily_rate > 0 and gap > 0 else "")
        reply = (f"Goal set: {target} lifetime credits. You've earned "
                 f"{lifetime} so far."
                 + (f" {gap} to go.{eta}" if gap > 0 else " Already achieved. ")
                 + "I'll track it on your Overview — /forecast to check pace.")
        actions = [{"label": "Set a saving goal", "action": "save_goal",
                    "value": target}]

    elif low.startswith("/compare"):
        cmd = "compare"
        daily_rate = total_in / 30
        sorted_cat = sorted(by_cat.items(), key=lambda x: -x[1])
        top_line = (f"Top earner: {sorted_cat[0][0]} "
                    f"({sorted_cat[0][1]}cr of {total_in} in 30 days)."
                    if sorted_cat else "No earnings yet this period.")
        peer = await _coach_peer_benchmark()
        avg_peer = int(peer["avg_peer_earn_30d"]) if peer else 0
        if peer and avg_peer > 0:
            if total_in > avg_peer:
                compare_line = (f"The average active wallet user earned "
                                f"{avg_peer} credits in 30 days — you're "
                                f"ahead by {total_in - avg_peer}.")
            elif total_in == avg_peer:
                compare_line = (f"You earned exactly the 30-day average of "
                                "active wallet users — one referral or a "
                                "deal claim puts you above it.")
            else:
                compare_line = (f"The average active wallet user earned "
                                f"{avg_peer} credits in 30 days — "
                                f"{avg_peer - total_in} more than you. "
                                "A 7-day streak plus one event closes most "
                                "of the gap.")
        else:
            compare_line = "No active peer data yet — you're among the " \
                           "first wallets moving credits on SA."
        reply = (f"You earned {total_in} credits in 30 days "
                 f"({daily_rate:.1f}/day) and spent {total_out}. "
                 f"{top_line} {compare_line}")
        cards = [{"type": "compare",
                  "data": {"top_category": top_line,
                           "earn_30d": total_in, "spend_30d": total_out,
                           "avg_peer_earn_30d": avg_peer,
                           "peer_sample": int(peer["active_wallet_users"]) if peer else 0,
                           "above_avg": bool(peer and avg_peer > 0 and total_in > avg_peer)}}]

    elif low.startswith("/leaderboard"):
        cmd = "leaderboard"
        try:
            from features.referral_engine import (
                REFERRALS as _REF_COLL, PER_REFERRAL_CREDITS as _REF_CR,
                _get_or_create_referral, _mask_name)
            top_rows = []
            async for r in _db[_REF_COLL].find(
                    {"referred_users.0": {"$exists": True}}):
                top_rows.append((r.get("referrer_id") or str(r["_id"]),
                                 len(r.get("referred_users") or []),
                                 r.get("referral_code")))
            top_rows.sort(key=lambda t: (-t[1], t[2]))
            board = [
                {"rank": i + 1, "referral_count": c,
                 "display_name": _mask_name((code or "u").split("-")[0])}
                for i, (_, c, code) in enumerate(top_rows[:5])]
            mine = await _get_or_create_referral(user)
            my_count = len(mine.get("referred_users") or [])
            my_rank = sum(1 for _, c, _ in top_rows if c > my_count) + 1
            reply = (f"You rank #{my_rank} on the referral leaderboard with "
                     f"{my_count} referral(s). Each signup earns "
                     f"{_REF_CR}cr plus milestone bonuses — one more "
                     "close friend moves you up fast. Copy your link to share.")
        except Exception:
            board = []
            my_count = ctx["referral_count"]
            my_rank = 1
            reply = (f"Referral leaderboard is quiet right now. You have "
                     f"{my_count} referral(s) so far — share your link "
                     "to claim 100cr per signup plus milestone bonuses.")
        cards = [{"type": "leaderboard",
                  "data": {"board": board, "my_rank": my_rank,
                           "my_count": my_count}}]
        actions = [{"label": "Copy referral link", "action": "share",
                    "type": "referral"}]

    elif low.startswith("/tip"):
        cmd = "tip"
        tips = []
        if ctx["profile_completion"] < 100:
            tips.append("Finish your profile for a one-time 100cr bonus.")
        if ctx["active_coupons"] == 0:
            tips.append("Claim a coupon in the Coupons tab — partner "
                        "deals pay cashback credits.")
        if ctx["streak_days"] < 7:
            tips.append(f"Reach a 7-day login streak for +50cr. You're at "
                        f"{ctx['streak_days']} today.")
        if total_in < total_out:
            tips.append("You've spent more than you earned this month — "
                        "an event completion (+60cr) or a referral "
                        "(+100cr) flips that.")
        if not tips:
            tips.append("Wallet is in great shape. Check upcoming events — "
                        "completing one pays 60cr and keeps your streak warm.")
        reply = " ".join(tips[:2])

    elif low.startswith("/credit-plan") or "/optimize" in low:
        cmd = "credit_plan"
        nxt_at = int(lvl.get("next_level_at") or 0)
        target_name = lvl.get("next_level_name") or "Diamond"
        gap = max(0, nxt_at - lifetime)
        plan_actions = []
        if gap >= 100:
            plan_actions.append({
                "title": "Refer 1 friend",
                "gain": 100, "effort": "low", "eta_days": 5,
                "action": {"type": "share", "label": "Copy referral link"}})
        if gap >= 60:
            plan_actions.append({
                "title": "Complete 1 event",
                "gain": 60, "effort": "medium", "eta_days": 2,
                "action": {"type": "navigate", "label": "Browse events",
                            "url": "/events"}})
        if gap >= 30:
            plan_actions.append({
                "title": "Attend 1 mentor session",
                "gain": 30, "effort": "medium", "eta_days": 3,
                "action": {"type": "navigate", "label": "Browse mentors",
                            "url": "/mentors"}})
        if ctx["profile_completion"] < 100:
            plan_actions.append({
                "title": "Complete profile (one-time)",
                "gain": 100, "effort": "low", "eta_days": 1,
                "action": {"type": "navigate", "label": "Open profile",
                            "url": "/profile"}})
        if gap >= 10:
            plan_actions.append({
                "title": "Claim 1 deal",
                "gain": 10, "effort": "low", "eta_days": 1,
                "action": {"type": "navigate", "label": "Browse deals",
                            "url": "/deals"}})
        # Fastest ETA: max of selected
        eta = max((a["eta_days"] for a in plan_actions), default=7)
        reply = (f"You need {gap} more lifetime credits to reach "
                 f"{target_name}. Fastest path: about {eta} days."
                 if gap > 0 else
                 f"You're at {target_name} already — keep stacking for "
                 "the next tier.")
        cards = [{"type": "credit_plan",
                  "summary": reply,
                  "fastest_path_days": eta,
                  "target_tier": target_name,
                  "credits_needed": gap,
                  "actions": plan_actions}]

    elif low.startswith("/forecast"):
        cmd = "forecast"
        avg_daily_in = total_in / 30
        avg_daily_out = total_out / 30
        days_left = 30  # rolling
        end_credits = balance_cr + int((avg_daily_in - avg_daily_out) * days_left)
        reply = (f"At your current pace (+{int(avg_daily_in)}/d, "
                 f"-{int(avg_daily_out)}/d), you'll have ~{end_credits} credits "
                 f"in 30 days (~₹{end_credits//CREDITS_PER_INR}).")

    elif low.startswith("/cashback"):
        cmd = "cashback"
        reply = ("Top cashback opportunities right now: Swiggy One (+25cr), "
                 "Razorpay UPI top-ups (+10cr), and Uber rides flat 5%. "
                 "Open Deals to claim.")
        actions = [{"label": "Open Deals", "action": "navigate", "url": "/deals"}]

    elif low.startswith("/alert"):
        cmd = "alert"
        try:
            amt = int("".join(c for c in message if c.isdigit())) or 200
        except Exception:
            amt = 200
        reply = (f"Got it — I'll alert you when balance drops below ₹{amt}. "
                 "(Auto-topup can be enabled too in the Add Money tab.)")

    elif low.startswith("/split"):
        cmd = "split"
        digits = [int(x) for x in message.split() if x.isdigit()]
        amt = digits[0] if digits else 1000
        n = digits[1] if len(digits) >= 2 else 4
        per = round(amt / max(n, 1))
        reply = (f"Split ₹{amt:,} between {n} people = ₹{per:,} each. "
                 f"Send a UPI request to each? I can draft a message.")

    elif low.startswith("/dispute"):
        cmd = "dispute"
        reply = ("To dispute a transaction, open History, tap the row, "
                 "then 'Report issue'. Most disputes resolve in 5-7 working days.")

    elif low.startswith("/tax"):
        cmd = "tax"
        reply = (f"Hi {name} — keep withdrawals under ₹20,000 a year to "
                 "avoid TDS under section 194R. Credits are an internal "
                 "SA currency, not investment income. Export the formal "
                 "statement from the History tab for your records.")
        actions = [{"label": "Export statement", "action": "navigate",
                    "url": "/wallet?tab=history&export=statement"}]

    else:
        # Free text — hybrid: Claude with personalized context,
        # deterministic fallback when the LLM is unavailable.
        cmd = "chat"
        reply = await _coach_llm_reply(ctx, message) or \
            await _coach_fallback(ctx)

    return {
        "reply": reply, "cmd": cmd,
        "cards": cards, "actions": actions,
        "context": {
            "balance_credits": balance_cr, "balance_inr": balance_inr,
            "lifetime_earned": lifetime, "level": lvl["name"],
            "streak_days": ctx["streak_days"],
            "totals_30d": {"in": total_in, "out": total_out},
            "active_coupons": ctx["active_coupons"],
            "referral_count": ctx["referral_count"],
            "profile_completion": ctx["profile_completion"],
        },
    }


# ─── Credit Redemptions ──────────────────────────────────────────────────
# W2: the reward catalog migrated to MongoDB (sa_rewards) with a
# fulfillment engine in features/reward_marketplace.py. Its GET
# /wallet/rewards + POST /wallet/redeem shadow this legacy static
# version because that router is registered first in server.py.
# Do not add reward endpoints here.
