"""
gamification_engine.py — Streak & Gamification Engine (W6).

Layered on top of the existing wallet core (activity_credits) and the
tiered badge engine (features/badges.py). Adds:

  sa_badges       — wallet-specific badges with rarity tiers
                    (common → uncommon → rare → epic → legendary)
  sa_challenges   — one auto-generated weekly challenge per user,
                    aimed at their weakest earning category

Streaks are computed from `activity_events` (same source the wallet
summary uses). A broken streak can be bought back for 50 credits
(once per 7 days) via POST /wallet/streak/recover.

Endpoints (all under /api):
   GET  /wallet/streak                 — current/best streak + 21-day calendar
   POST /wallet/streak/recover         — pay 50cr to bridge a broken streak
   GET  /wallet/badges                 — my wallet badges (auto-computed, lazily persisted)
   GET  /wallet/challenges             — this week's challenge(s) + progress
   POST /wallet/challenges/{id}/claim  — claim reward when the target is met
   GET  /wallet/leaderboard?period=weekly&scope=college
                                          — anonymized top 10 + my rank

No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("gamification_engine")
router = APIRouter()

BADGES = "sa_badges"
CHALLENGES = "sa_challenges"

STREAK_RECOVERY_CREDITS = 50
STREAK_RECOVERY_COOLDOWN_DAYS = 7
CALENDAR_DAYS = 21

# ─── Badge catalog (wallet-specific, rare tiers) ───────────────────────
WALLET_BADGES: List[Dict[str, Any]] = [
    {"slug": "first_earn", "title": "First Earning",
     "rarity": "common", "hint": "Earn your first 100 SA Credits"},
    {"slug": "first_spend", "title": "Smart Spender",
     "rarity": "common", "hint": "Redeem your first 50 SA Credits"},
    {"slug": "coupon_collector", "title": "Coupon Collector",
     "rarity": "common", "hint": "Hold 3 active coupons at once"},
    {"slug": "streak_7", "title": "On Fire",
     "rarity": "uncommon", "hint": "7 consecutive active days"},
    {"slug": "referral_recruit", "title": "Recruiter",
     "rarity": "uncommon", "hint": "Refer your first friend"},
    {"slug": "level_gold", "title": "Gold Member",
     "rarity": "rare", "hint": "Reach Gold level (5,000 lifetime credits)"},
    {"slug": "influencer_badge", "title": "Influencer",
     "rarity": "rare", "hint": "Refer 10 friends"},
    {"slug": "ambassador_badge", "title": "Ambassador",
     "rarity": "epic", "hint": "Refer 25 friends"},
    {"slug": "diamond_earner", "title": "Diamond Earner",
     "rarity": "legendary", "hint": "50,000 lifetime credits"},
]

RARITY_ORDER = {"common": 0, "uncommon": 1, "rare": 2, "epic": 3, "legendary": 4}
RARITY_THEME = {
    "common":    {"color": "#64748B"},
    "uncommon":  {"color": "#2DD4BF"},
    "rare":      {"color": "#F59E0B"},
    "epic":      {"color": "#A78BFA"},
    "legendary": {"color": "#EF4444"},
}

CHALLENGE_TARGETS_BY_LEVEL = [50, 100, 150, 200, 250]


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


# ─── STREAK ─────────────────────────────────────────────────────────────
async def _active_day_set(user_id: str, days: int) -> set:
    """Set of 'YYYY-MM-DD' (IST) with wallet activity in the last `days` days."""
    lo = (datetime.now(timezone.utc) - timedelta(days=days)).replace(
        hour=0, minute=0, second=0, microsecond=0)
    out = set()
    async for ev in _db.activity_events.find({"user_id": user_id, "ts": {"$gte": lo}}):
        ts = ev.get("ts") or ev.get("created_at")
        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            out.add(ts.astimezone(_IST).strftime("%Y-%m-%d"))
    return out


try:
    import pytz
    _IST = pytz.timezone("Asia/Kolkata")
except Exception:  # pragma: no cover
    _IST = timezone(timedelta(hours=5, minutes=30), "IST")


def _streak_from_days(active: set, recovered: set, today: str) -> int:
    d = datetime.strptime(today, "%Y-%m-%d").date()
    streak = 0
    while True:
        key = d.isoformat()
        if key in active or key in recovered:
            streak += 1
            d -= timedelta(days=1)
        else:
            break
    return streak


async def _streak_state(user: Dict[str, Any]) -> Dict[str, Any]:
    uid = str(user["_id"])
    active = await _active_day_set(uid, 365)
    recovered = set((user.get("wallet") or {}).get("streak_recoveries") or [])
    today = datetime.now(timezone.utc).astimezone(_IST).strftime("%Y-%m-%d")
    cur = _streak_from_days(active, recovered, today)
    best = max(int(user.get("streak_best_days") or 0), cur)
    if cur > best:
        await _db.users.update_one({"_id": user["_id"]}, {"$set": {"streak_best_days": cur}})
        best = cur

    calendar = []
    base = datetime.now(timezone.utc).astimezone(_IST).date()
    for i in range(CALENDAR_DAYS - 1, -1, -1):
        day = base - timedelta(days=i)
        key = day.isoformat()
        calendar.append({
            "date": key,
            "active": key in active or key in recovered,
            "recovered": key in recovered,
        })
    recoverable = cur == 0 and len(active) > 0 and (
        not (today in active)
        and len({k for k in active if k >= (base - timedelta(days=3)).isoformat()}) > 0)
    last_recovery = max(recovered) if recovered else None
    cooldown_ok = (last_recovery is None
                   or last_recovery <= (base - timedelta(days=STREAK_RECOVERY_COOLDOWN_DAYS)).isoformat())
    return {
        "current": cur,
        "best": best,
        "calendar": calendar,
        "recoverable": recoverable and cooldown_ok,
        "recovery_cost": STREAK_RECOVERY_CREDITS,
        "last_recovery": last_recovery,
    }


@router.get("/wallet/streak")
async def my_streak(user: dict = Depends(_get_current_user_dependency())):
    return await _streak_state(user)


@router.post("/wallet/streak/recover")
async def recover_streak(user: dict = Depends(_get_current_user_dependency())):
    """Pays 50 credits to bridge a broken streak (once per 7 days)."""
    state = await _streak_state(user)
    if not state["recoverable"]:
        raise HTTPException(409, "No recoverable streak right now")
    from features.activity_credits import _debit_user
    _new, dup = await _debit_user(
        user, STREAK_RECOVERY_CREDITS, "Streak recovery",
        metadata={"engine": "gamification"})
    if dup:
        raise HTTPException(409, "Already recovered this week")
    today = datetime.now(timezone.utc).astimezone(_IST).strftime("%Y-%m-%d")
    w = user.setdefault("wallet", {})
    recoveries = set(w.get("streak_recoveries") or [])
    recoveries.add(today)
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wallet.streak_recoveries": sorted(recoveries)}},
    )
    return {"ok": True, "recovered_date": today, "balance_credits": _new}


# ─── BADGES ─────────────────────────────────────────────────────────────
async def _badge_earned(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Check one wallet badge against user data. Returns sa_badges doc or None."""
    uid = doc["user_id"]
    u = doc["_user"]
    wallet = u.get("wallet") or {}
    lifetime = int(wallet.get("lifetime_earned") or 0)
    spent = int(wallet.get("lifetime_spent") or 0)
    referrals = len(doc.get("_referrals") or [])
    active_coupons = int(doc.get("_active_coupons") or 0)
    streak = int(doc.get("_current_streak") or 0)
    s = doc["slug"]
    hit = {
        "first_earn": lifetime >= 100,
        "first_spend": spent >= 50,
        "coupon_collector": active_coupons >= 3,
        "streak_7": streak >= 7,
        "referral_recruit": referrals >= 1,
        "level_gold": lifetime >= 5000,
        "influencer_badge": referrals >= 10,
        "ambassador_badge": referrals >= 25,
        "diamond_earner": lifetime >= 50000,
    }.get(s, False)
    if not hit:
        return None
    return {"user_id": uid, "slug": s, "earned_at": doc.get("_now")}


async def _ensure_wallet_badges(user: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
    uid = str(user["_id"])
    active_coupons = await _db["sa_user_coupons"].count_documents(
        {"user_id": uid, "status": "active"})
    try:
        ref = await _db["sa_referrals"].find_one({"referrer_id": uid})
        referrals = ref.get("referred_users") or []
    except Exception:
        referrals = []
    ctx = {"_user": user, "_referrals": referrals, "_active_coupons": active_coupons,
           "_current_streak": state.get("current", 0),
           "_now": datetime.now(timezone.utc)}
    now_badges = []
    existing = {b["slug"] for b in await _db[BADGES].find(
        {"user_id": uid}, {"slug": 1})}
    newly_slugs: List[str] = []
    for spec in WALLET_BADGES:
        if spec["slug"] in existing:
            continue
        doc = {"user_id": uid, "slug": spec["slug"], **ctx}
        earned = await _badge_earned(doc)
        if not earned:
            continue
        newly_slugs.append(spec["slug"])
        await _db[BADGES].update_one(
            {"user_id": uid, "slug": spec["slug"]},
            {"$set": {**earned,
                      "title": spec["title"],
                      "rarity": spec["rarity"],
                      "hint": spec["hint"]}},
            upsert=True,
        )
    all_mine = await _db[BADGES].find({"user_id": uid}).to_list(50)
    for b in all_mine:
        b["new"] = b.get("slug") in newly_slugs
    return {"badges": all_mine, "newly_earned": newly_slugs,
            "rarity_theme": RARITY_THEME}


@router.get("/wallet/badges")
async def my_badges(user: dict = Depends(_get_current_user_dependency())):
    state = await _streak_state(user)
    out = await _ensure_wallet_badges(user, state)
    # Merge the tiered engine badges (users.badges) for a single response
    tiered = user.get("badges") or []
    out["tiered_badges"] = [
        {k: b.get(k) for k in ("id", "category", "tier", "label", "icon", "hint")}
        for b in tiered
    ][:30]
    out["rarity_theme"] = RARITY_THEME
    return out


# ─── WEEKLY CHALLENGES ──────────────────────────────────────────────────
async def _weakest_category(user: Dict[str, Any]) -> str:
    """Earnings by category over 30 days; the weakest active category wins."""
    uid = str(user["_id"])
    lo = datetime.now(timezone.utc) - timedelta(days=30)
    cat_map: Dict[str, int] = {}
    pipeline = [
        {"$match": {"user_id": uid, "ts": {"$gte": lo}}},
        {"$group": {"_id": "$category", "credits": {"$sum": "$credits"}}},
    ]
    async for row in _db.activity_events.aggregate(pipeline):
        if row.get("_id"):
            cat_map[row["_id"]] = int(row.get("credits") or 0)
    candidates = ["events", "mentorship", "referrals", "deals", "content"]
    present = {c: cat_map.get(c, 0) for c in candidates if c in cat_map}
    if not present:
        return "events"  # default for brand-new users
    return min(present, key=lambda c: present[c])


def _iso_week() -> str:
    d = datetime.now(timezone.utc)
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


async def _challenge_for(user: Dict[str, Any]) -> Dict[str, Any]:
    uid = str(user["_id"])
    week = _iso_week()
    ch = await _db[CHALLENGES].find_one({"user_id": uid, "week": week})
    if ch:
        return ch

    from features.activity_credits import _compute_level
    level = _compute_level(int((user.get("wallet") or {}).get("lifetime_earned", 0)))
    lvl_idx = min(int(level.get("level") or 0), len(CHALLENGE_TARGETS_BY_LEVEL) - 1)
    target = CHALLENGE_TARGETS_BY_LEVEL[lvl_idx]
    cat = await _weakest_category(user)
    deadline = (datetime.now(timezone.utc) + timedelta(days=7)).replace(
        hour=23, minute=59, second=0)
    ch = {
        "user_id": uid,
        "week": week,
        "category": cat,
        "target": target,
        "reward_credits": target // 2,
        "progress": 0,
        "status": "open",
        "deadline": deadline,
        "created_at": datetime.now(timezone.utc),
    }
    res = await _db[CHALLENGES].update_one(
        {"user_id": uid, "week": week},
        {"$setOnInsert": ch}, upsert=True,
    )
    if not res.upserted_count:
        ch = await _db[CHALLENGES].find_one({"user_id": uid, "week": week})
    return ch


@router.get("/wallet/challenges")
async def my_challenges(user: dict = Depends(_get_current_user_dependency())):
    ch = await _challenge_for(user)
    uid = str(user["_id"])
    lo = datetime.now(timezone.utc) - timedelta(days=7)
    async for ev in _db.activity_events.find(
            {"user_id": uid, "category": ch.get("category"),
             "ts": {"$gte": lo}, "credits": {"$gt": 0}}):
        ch["progress"] = int(ch.get("progress") or 0) + int(ev.get("credits") or 0)
    ch["done"] = ch["progress"] >= ch["target"]
    ch["claimed"] = ch.get("status") == "claimed"
    return {"challenge": ch, "week": ch["week"]}


@router.post("/wallet/challenges/{challenge_id}/claim")
async def claim_challenge(challenge_id: str,
                          user: dict = Depends(_get_current_user_dependency())):
    uid = str(user["_id"])
    from bson import ObjectId
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "Invalid challenge id")
    ch = await _db[CHALLENGES].find_one({"_id": oid, "user_id": uid})
    if not ch:
        raise HTTPException(404, "Challenge not found")
    if ch.get("status") == "claimed":
        raise HTTPException(409, "Already claimed")
    # Recompute progress just in case
    lo = ch.get("created_at") or (datetime.now(timezone.utc) - timedelta(days=7))
    progress = 0
    async for ev in _db.activity_events.find(
            {"user_id": uid, "category": ch.get("category"),
             "ts": {"$gte": lo}, "credits": {"$gt": 0}}):
        progress += int(ev.get("credits") or 0)
    if progress < int(ch.get("target") or 0):
        raise HTTPException(409, f"Target not met yet ({progress}/{ch['target']})")
    res = await _db[CHALLENGES].find_one_and_update(
        {"_id": oid, "status": {"$ne": "claimed"}},
        {"$set": {"status": "claimed", "claimed_at": datetime.now(timezone.utc)}},
    )
    if not res:
        raise HTTPException(409, "Already claimed")
    from features.activity_credits import _credit_user
    _new, dup = await _credit_user(
        user, int(ch.get("reward_credits") or 0),
        f"Weekly challenge: {ch.get('category')}",
        metadata={"challenge_id": str(oid)},
        idempotency_key=f"challenge:{oid}")
    return {"ok": True, "duplicate": dup,
            "reward_credits": 0 if dup else int(ch.get("reward_credits") or 0),
            "balance_credits": _new}


# ─── LEADERBOARD ────────────────────────────────────────────────────────
def _anonymize(name: Optional[str]) -> str:
    n = (name or "").strip()
    if not n:
        return "•••"
    first = n.split()[0]
    return first[0].upper() + "•" * min(5, max(1, len(first) - 1))


@router.get("/wallet/leaderboard")
async def leaderboard(
    period: str = Query("weekly", pattern="^(weekly|30d|all)$"),
    scope: str = Query("platform", pattern="^(platform|college)$"),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Top 10 earners for the period, anonymized; includes the caller's rank."""
    if period == "weekly":
        lo = datetime.now(timezone.utc) - timedelta(days=7)
    elif period == "30d":
        lo = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        lo = datetime.min.replace(tzinfo=timezone.utc)

    q: Dict[str, Any] = {"type": "credit", "ts": {"$gte": lo}}
    if scope == "college":
        college = ((user.get("school_info") or {}).get("institution_name")
                   or user.get("college") or "")
        if college:
            uids = set()
            async for u in _db.users.find(
                    {"school_info.institution_name": college}, {"_id": 1}):
                uids.add(str(u["_id"]))
            uids.add(str(user["_id"]))
            q["user_id"] = {"$in": list(uids)}

    pipeline = [
        {"$match": q},
        {"$group": {"_id": "$user_id", "credits": {"$sum": "$amount"}}},
        {"$sort": {"credits": -1}},
    ]
    totals = {r["_id"]: int(r["credits"]) for r in await _db.wallet_transactions.aggregate(pipeline)}
    ranked = sorted(totals.items(), key=lambda kv: -kv[1])
    top = ranked[:10]

    names = {}
    for uoid, _ in top:
        u = await _db.users.find_one({"_id": uoid}, {"full_name": 1, "name": 1, "email": 1})
        names[uoid] = _anonymize((u or {}).get("full_name")
                                 or (u or {}).get("name")
                                 or ((u or {}).get("email") or "member").split("@")[0])

    rows = [{"rank": i + 1, "id": uoid, "display_name": names.get(uoid, "•••"),
             "credits": int(c)} for i, (uoid, c) in enumerate(top)]
    my_rank = next((i + 1 for i, (uoid, _) in enumerate(ranked)
                    if uoid == str(user["_id"])), len(ranked) + 1)
    return {"leaderboard": rows, "period": period, "scope": scope,
            "my_rank": my_rank,
            "my_credits": totals.get(str(user["_id"]), 0)}
