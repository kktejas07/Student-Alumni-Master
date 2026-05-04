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
"""
from __future__ import annotations

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta, date as _date
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Body, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

logger = logging.getLogger("activity_credits")
router = APIRouter()

CREDITS_PER_INR = 25  # 25 credits = ₹1
WITHDRAW_THRESHOLD_CREDITS = 2500  # Need at least ₹100 worth before cash-out
TOPUP_BONUS_PCT = 5  # 5% bonus credits on top-up


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
    from server import get_current_user  # noqa
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
    return new_bal, False


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
    new_bal, dup = await _credit_user(
        user, amount, f"Activity: {label}",
        metadata={**metadata, "activity_type": activity_type, "category": rule.get("category"), "icon": rule.get("icon")},
        idempotency_key=idem,
    )
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


@router.post("/wallet/topup")
async def wallet_topup(
    body: Dict[str, Any],
    user: dict = Depends(_get_current_user_dependency()),
):
    """Mock top-up: convert INR to credits at 25:1 with optional bonus.
    Body: { amount_inr: number, payment_method?: 'upi'|'card'|'netbanking', idempotency_key? }
    """
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

    u = await _resolve_user(user["_id"])
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



# ─── Money Coach (deterministic — no LLM cost) ───────────────────────────
@router.post("/wallet/coach/chat")
async def wallet_coach_chat(body: Dict[str, Any] = Body(default={}),
                              user: dict = Depends(_get_current_user_dependency())):
    """Deterministic Money Coach. Returns structured replies based on slash commands.
    No LLM required — fully rule-based & free."""
    msg = (body or {}).get("message", "").strip()
    low = msg.lower()
    wallet = (user.get("wallet") or {})
    balance_cr = int(wallet.get("balance_credits", 0))
    lifetime = int(wallet.get("lifetime_earned", 0))
    balance_inr = balance_cr // CREDITS_PER_INR
    name = user.get("first_name", "there")

    # Pull last 30d earnings/spend
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    cur = _db.credit_events.find({"user_id": str(user["_id"]),
                                   "created_at": {"$gte": cutoff}})
    total_in = 0
    total_out = 0
    by_cat: Dict[str, int] = {}
    async for e in cur:
        amt = int(e.get("amount", 0) or 0)
        if amt > 0: total_in += amt
        else:       total_out += abs(amt)
        cat = e.get("category", "other")
        by_cat[cat] = by_cat.get(cat, 0) + abs(amt)

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
            goal = int("".join(c for c in msg if c.isdigit())) or 1000
        except Exception:
            goal = 1000
        per_week = max(50, goal // 12)
        reply = (f"To save ₹{goal:,}, set aside ₹{per_week:,}/week from "
                 f"campus savings + redirect ₹{per_week//2}/week of cashback "
                 f"into your wallet. You'd hit the goal in 12 weeks.")
        actions = [{"label": "Enable Auto-save", "action": "auto_save"},
                   {"label": "Find cashback offers", "action": "navigate",
                    "url": "/deals"}]

    elif low.startswith("/credit-plan") or "/optimize" in low:
        cmd = "credit_plan"
        # Determine target tier
        thresholds = [("Silver", 100), ("Gold", 500), ("Platinum", 1500)]
        target_name, target_at = next(
            ((n, t) for n, t in thresholds if balance_cr < t),
            ("Platinum", 1500))
        gap = max(0, target_at - balance_cr)
        plan_actions = []
        # Greedy plan to fill the gap
        if gap >= 100:
            plan_actions.append({
                "title": "Refer 1 friend",
                "gain": 100, "effort": "low", "eta_days": 5,
                "action": {"type": "share", "label": "Copy referral link"}})
        if gap >= 50:
            plan_actions.append({
                "title": "Book 1 mentor session",
                "gain": 50, "effort": "medium", "eta_days": 3,
                "action": {"type": "navigate", "label": "Browse mentors",
                            "url": "/mentors"}})
        if gap >= 30:
            plan_actions.append({
                "title": "Submit 1 SA Higher-Ed application",
                "gain": 30, "effort": "medium", "eta_days": 7,
                "action": {"type": "navigate", "label": "Open Higher-Ed",
                            "url": "/higher-education"}})
        if gap >= 25:
            plan_actions.append({
                "title": "Complete profile (one-time)",
                "gain": 25, "effort": "low", "eta_days": 1,
                "action": {"type": "navigate", "label": "Open profile",
                            "url": "/profile"}})
        if gap >= 15:
            plan_actions.append({
                "title": "Register for 1 event",
                "gain": 15, "effort": "low", "eta_days": 2,
                "action": {"type": "navigate", "label": "Browse events",
                            "url": "/events"}})
        if gap >= 10:
            plan_actions.append({
                "title": "Claim 1 deal",
                "gain": 10, "effort": "low", "eta_days": 1,
                "action": {"type": "navigate", "label": "Browse deals",
                            "url": "/deals"}})
        # Fastest ETA: max of selected
        eta = max((a["eta_days"] for a in plan_actions), default=7)
        reply = (f"You need {gap} more credits to reach {target_name}. "
                 f"Fastest path: {eta} days." if gap > 0 else
                 f"You're already at {target_name}! 🎉 Next: keep stacking for Platinum.")
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
            amt = int("".join(c for c in msg if c.isdigit())) or 200
        except Exception:
            amt = 200
        reply = (f"Got it — I'll alert you when balance drops below ₹{amt}. "
                 "(Auto-topup can be enabled too in the Add Money tab.)")

    elif low.startswith("/split"):
        cmd = "split"
        digits = [int(x) for x in msg.split() if x.isdigit()]
        amt = digits[0] if digits else 1000
        n = digits[1] if len(digits) >= 2 else 4
        per = round(amt / max(n, 1))
        reply = (f"Split ₹{amt:,} between {n} people = ₹{per:,} each. "
                 f"Send a UPI request to each? I can draft a message.")

    elif low.startswith("/dispute"):
        cmd = "dispute"
        reply = ("To dispute a transaction, open History → tap the row → "
                 "'Report issue'. Most disputes resolve in 5-7 working days.")

    elif low.startswith("/tax"):
        cmd = "tax"
        reply = (f"Hi {name} — based on the last FY's wallet activity you've "
                 "spent on courses (80C eligible up to ₹1.5L) and mentor "
                 "sessions. Generate the formal 80C statement from the "
                 "History tab → Export.")
        actions = [{"label": "Export 80C statement", "action": "navigate",
                    "url": "/wallet?tab=history&export=80c"}]

    else:
        # General chat — give a tier nudge
        thresholds = [("Silver", 100), ("Gold", 500), ("Platinum", 1500)]
        nxt = next(((n, t) for n, t in thresholds if balance_cr < t), None)
        if nxt:
            reply = (f"Hi {name}! You have {balance_cr} credits "
                     f"(~₹{balance_inr}). You're {nxt[1] - balance_cr} away "
                     f"from {nxt[0]}. Try /credit-plan for a fast path.")
        else:
            reply = (f"Hi {name}! You have {balance_cr} credits — top tier already. "
                     "Try /spend to see your last 30 days, or /forecast to project ahead.")

    return {
        "reply": reply, "cmd": cmd,
        "cards": cards, "actions": actions,
        "context": {"balance_credits": balance_cr, "balance_inr": balance_inr,
                     "lifetime_earned": lifetime,
                     "totals_30d": {"in": total_in, "out": total_out}},
    }


# ─── Credit Redemptions ──────────────────────────────────────────────────
REWARD_CATALOG = [
    {"id": "free_mentor",      "title": "Free Mentor Session",
     "desc": "Redeem for a 30-min free session", "cost": 200, "tone": "teal", "hot": True},
    {"id": "event_pass",       "title": "Free Event Pass",
     "desc": "Entry to any paid workshop/event", "cost": 100, "tone": "indigo", "hot": True},
    {"id": "profile_boost",    "title": "Profile Boost",
     "desc": "Featured in mentor discovery for 7 days", "cost": 75, "tone": "orange", "hot": False},
    {"id": "deal_extra_5",     "title": "Extra 5% Deal Discount",
     "desc": "On top of existing SA deal discount", "cost": 50, "tone": "green", "hot": False},
    {"id": "gold_badge",       "title": "Gold Member Badge",
     "desc": "Exclusive gold profile badge for 30 days", "cost": 150, "tone": "gold", "hot": False},
    {"id": "rental_credit",    "title": "Rental Credit ₹200",
     "desc": "₹200 off on any SA rental booking", "cost": 80, "tone": "pink", "hot": True},
]


@router.get("/wallet/rewards")
async def list_rewards(user: dict = Depends(_get_current_user_dependency())):
    return {"rewards": REWARD_CATALOG}


@router.post("/wallet/redeem")
async def redeem_credits(body: Dict[str, Any] = Body(default={}),
                          user: dict = Depends(_get_current_user_dependency())):
    rid = (body or {}).get("reward_id")
    reward = next((r for r in REWARD_CATALOG if r["id"] == rid), None)
    if not reward:
        raise HTTPException(404, "Reward not found")
    cost = int(reward["cost"])
    cur_bal = int((user.get("wallet") or {}).get("balance_credits", 0))
    if cur_bal < cost:
        raise HTTPException(400, f"Insufficient credits: need {cost}, have {cur_bal}")
    code = f"SA-{uuid.uuid4().hex[:8].upper()}"
    # Deduct credits
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$inc": {"wallet.balance_credits": -cost,
                  "wallet.lifetime_redeemed": cost}})
    # Log event (append-only)
    await _db.credit_events.insert_one({
        "user_id": str(user["_id"]),
        "activity_type": "redemption",
        "category": "redeem",
        "amount": -cost,
        "description": f"Redeemed: {reward['title']}",
        "metadata": {"reward_id": rid, "code": code},
        "created_at": datetime.now(timezone.utc),
    })
    return {"ok": True, "code": code, "reward": reward,
            "new_balance": cur_bal - cost}
