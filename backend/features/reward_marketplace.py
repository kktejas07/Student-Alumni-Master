"""
reward_marketplace.py — Reward Marketplace (W2).

Migrates the 6 hardcoded rewards from activity_credits.REWARD_CATALOG to a
MongoDB catalog with categories, stock limits, per-user daily limits, and a
fulfillment engine that auto-executes when a reward is redeemed.

  sa_rewards    — the catalog (seeded idempotently on first read, no cron)
  sa_redemptions — one doc per redemption (code, fulfillment, rollbacks)

Endpoints (all under /api, shadowing the legacy static endpoints in
activity_credits.py because this router is registered first):
   GET  /wallet/rewards                  — 12-reward catalog + stock + limits
   POST /wallet/redeem                   — {reward_id} (deducts, claims stock,
                                            executes fulfillment_action)
   GET  /wallet/redeem/history           — my redemptions, newest first

Fulfillment actions:
   event_pass          -> sa_redemptions doc acts as the free entry token
   profile_boost       -> users.profile_boost_until (7 days)
   extra_deal_discount -> wallet.extra_deal_discount (0.05, 7 days)
   gold_badge          -> users.badges += Gold Member Badge
   rental_credit       -> wallet.rental_credit (Rs 200 off, 60 days)
   resume_review       -> sa_ai_resume_reviews doc (redeem at /career/resume-review)
   priority_support    -> wallet.priority_support_until (30 days)
   custom_certificate  -> certificates doc (series_id = redemption code)
   study_group_create  -> wallet.study_group_unlocked

Stock is claimed atomically (count-increment guarded by stock_limit); a
failed fulfillment record is rolled back so no stock is lost. Redemption
debits use the idempotent _debit_user; failed debits feed the W8 fraud
lock. No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("reward_marketplace")
router = APIRouter()

REWARDS = "sa_rewards"
REDEMPTIONS = "sa_redemptions"


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


# ─── CATALOG (12 rewards, seeded into sa_rewards) ──────────────────────
# fulfillment_action keys execute synchronously on redemption (see
# _fulfill below). stock_limit None = unlimited; daily_limit is per user.
SEED_REWARDS: List[Dict[str, Any]] = [
    {"id": "free_mentor", "title": "Free Mentor Session",
     "desc": "A 30-minute session with any SA mentor, on the house.",
     "cost": 200, "category": "career", "tone": "teal", "hot": True,
     "fulfillment_action": "none", "stock_limit": 2000, "daily_limit": 1},
    {"id": "event_pass", "title": "Free Event Pass",
     "desc": "Entry to any paid SA workshop or event.",
     "cost": 100, "category": "perks", "tone": "indigo", "hot": True,
     "fulfillment_action": "event_pass", "stock_limit": 1500, "daily_limit": 1},
    {"id": "profile_boost", "title": "Profile Boost",
     "desc": "Featured in mentor and job discovery for 7 days.",
     "cost": 75, "category": "visibility", "tone": "orange", "hot": False,
     "fulfillment_action": "profile_boost", "stock_limit": 3000, "daily_limit": 1},
    {"id": "deal_extra_5", "title": "Extra 5% Deal Discount",
     "desc": "On top of your existing SA deal discounts, for 7 days.",
     "cost": 50, "category": "savings", "tone": "green", "hot": False,
     "fulfillment_action": "extra_deal_discount", "stock_limit": 5000, "daily_limit": 2},
    {"id": "gold_badge", "title": "Gold Member Badge",
     "desc": "Exclusive gold profile badge for 30 days.",
     "cost": 150, "category": "visibility", "tone": "gold", "hot": False,
     "fulfillment_action": "gold_badge", "stock_limit": 1000, "daily_limit": 1},
    {"id": "rental_credit", "title": "Rental Credit ₹200",
     "desc": "₹200 off any SA rental booking, valid 60 days.",
     "cost": 80, "category": "savings", "tone": "pink", "hot": True,
     "fulfillment_action": "rental_credit", "stock_limit": 4000, "daily_limit": 1},
    {"id": "ai_resume_review", "title": "AI Resume Review",
     "desc": "An AI pass over your resume with section-level feedback.",
     "cost": 50, "category": "career", "tone": "teal", "hot": False,
     "fulfillment_action": "resume_review", "stock_limit": 5000, "daily_limit": 1},
    {"id": "priority_support", "title": "Priority Support",
     "desc": "Front-of-queue support responses for 30 days.",
     "cost": 100, "category": "perks", "tone": "slate", "hot": False,
     "fulfillment_action": "priority_support", "stock_limit": 2000, "daily_limit": 1},
    {"id": "custom_certificate", "title": "Custom Certificate",
     "desc": "Your own certificate for a skill you completed — 100% valid.",
     "cost": 75, "category": "career", "tone": "purple", "hot": False,
     "fulfillment_action": "custom_certificate", "stock_limit": 2000, "daily_limit": 1},
    {"id": "merch_voucher", "title": "SA Merch Voucher",
     "desc": "Voucher toward the official SA merch store.",
     "cost": 500, "category": "perks", "tone": "orange", "hot": True,
     "fulfillment_action": "none", "stock_limit": 250, "daily_limit": 1},
    {"id": "peer_shoutout", "title": "Peer Shoutout",
     "desc": "A public shoutout from you on the SA feed.",
     "cost": 25, "category": "community", "tone": "green", "hot": False,
     "fulfillment_action": "none", "stock_limit": None, "daily_limit": 3},
    {"id": "study_group", "title": "Create a Study Group",
     "desc": "Unlock creating your own SA study group.",
     "cost": 30, "category": "community", "tone": "indigo", "hot": False,
     "fulfillment_action": "study_group_create", "stock_limit": 6000, "daily_limit": 1},
]


async def _ensure_seeded() -> None:
    """Upsert the catalog into sa_rewards. Idempotent; safe under races
    because update_one(..., upsert=True) on a unique _id is atomic."""
    now = datetime.now(timezone.utc)
    for r in SEED_REWARDS:
        # $set carries only catalog fields — never redeemed_count — so
        # reseeding (runs on every read) cannot reset live stock counters.
        doc = {
            "title": r["title"],
            "desc": r["desc"],
            "cost": int(r["cost"]),
            "category": r["category"],
            "tone": r.get("tone", "slate"),
            "hot": bool(r.get("hot")),
            "fulfillment_action": r.get("fulfillment_action", "none"),
            "stock_limit": r.get("stock_limit"),
            "daily_limit": int(r.get("daily_limit") or 1),
            "updated_at": now,
        }
        try:
            await _db[REWARDS].update_one(
                {"_id": r["id"]},
                {"$set": doc, "$setOnInsert": {"redeemed_count": 0, "_id": r["id"]}},
                upsert=True,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("reward seed upsert failed for %s: %s", r["id"], e)


def _public_reward(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {
        "id": doc.get("_id") or doc.get("id"),
        "title": doc.get("title"),
        "desc": doc.get("desc"),
        "cost": int(doc.get("cost") or 0),
        "category": doc.get("category"),
        "tone": doc.get("tone"),
        "hot": bool(doc.get("hot")),
        "fulfillment": doc.get("fulfillment_action"),
        "stock_limit": doc.get("stock_limit"),
        "redeemed": int(doc.get("redeemed_count") or 0),
        "daily_limit": int(doc.get("daily_limit") or 1),
    }
    limit = out.pop("stock_limit")
    out["stock_remaining"] = None if limit is None else max(0, int(limit) - out["redeemed"])
    return out


# ─── ENDPOINTS ──────────────────────────────────────────────────────────
@router.get("/wallet/rewards")
async def list_rewards(user: dict = Depends(_get_current_user_dependency())):
    """Catalog: 12 rewards with live stock, my daily usage, and my balance."""
    await _ensure_seeded()
    uid = str(user["_id"])
    rewards = await _db[REWARDS].find({}).to_list(len(SEED_REWARDS))
    rewards.sort(key=lambda r: (not r.get("hot"), int(r.get("cost") or 0)))
    items = [_public_reward(r) for r in rewards]

    today_lo = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0)
    used: Dict[str, int] = {}
    async for row in _db[REDEMPTIONS].find(
            {"user_id": uid, "ts": {"$gte": today_lo}},
            {"reward_id": 1}):
        used[row["reward_id"]] = used.get(row["reward_id"], 0) + 1
    for it in items:
        it["used_today"] = used.get(it["id"], 0)

    return {
        "rewards": items,
        "balance_credits": int((user.get("wallet") or {}).get("balance_credits") or 0),
        "note": "Redemption deducts your balance, executes the fulfillment, and returns a code.",
    }


@router.post("/wallet/redeem")
async def redeem_reward(
    body: Dict[str, Any] = Body(default={}),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Redeem a reward: deduct credits, claim stock, execute fulfillment.

    Body: { reward_id } (accepts legacy `id` alias too).
    """
    from features.activity_credits import _credit_user, _debit_user
    from features.wallet_security import (
        audit_op, check_credit_rate_limit, check_debit_lock,
        register_failed_debit,
    )

    rid = str((body or {}).get("reward_id") or (body or {}).get("id") or "").strip()
    await _ensure_seeded()
    reward = await _db[REWARDS].find_one({"_id": rid})
    if not reward:
        raise HTTPException(404, "Reward not found")

    uid = str(user["_id"])
    now = datetime.now(timezone.utc)
    cost = int(reward["cost"])
    daily_limit = int(reward.get("daily_limit") or 1)

    await check_debit_lock(user)
    await check_credit_rate_limit(user)

    today_lo = now.replace(hour=0, minute=0, second=0, microsecond=0)
    used_today = await _db[REDEMPTIONS].count_documents({
        "user_id": uid, "reward_id": rid, "ts": {"$gte": today_lo}})
    if used_today >= daily_limit:
        raise HTTPException(
            409, f"Daily limit for {reward['title']} reached ({daily_limit}/day)")

    bal = int((user.get("wallet") or {}).get("balance_credits") or 0)
    if bal < cost:
        await register_failed_debit(user, amount=cost, op="redeem",
                                    reason="insufficient_credits")
        raise HTTPException(
            400, f"Insufficient credits: need {cost}, have {bal}")

    # Claim stock atomically; rolls back automatically if the limit is hit
    # by a concurrent redemption (update matches 0 docs).
    if reward.get("stock_limit") is not None:
        res = await _db[REWARDS].update_one(
            {"_id": rid, "redeemed_count": {"$lt": int(reward["stock_limit"])}},
            {"$inc": {"redeemed_count": 1}}, upsert=False)
        if res.matched_count == 0:
            raise HTTPException(409, "This reward is out of stock")

    await audit_op(uid, "redeem", cost, f"Reward: {reward['title']}", "attempted")

    code = f"SA-{_gen_code()}"
    try:
        new_bal, _ = await _debit_user(
            user, cost, f"Redeemed: {reward['title']}",
            metadata={"kind": "redeem", "reward_id": rid, "code": code})
    except HTTPException as e:
        # Debit raced to zero or 402 — release the stock claim.
        await _db[REWARDS].update_one(
            {"_id": rid}, {"$inc": {"redeemed_count": -1}})
        await audit_op(uid, "redeem", cost, f"Reward: {reward['title']}", "failed")
        if e.status_code == 402:
            await register_failed_debit(user, amount=cost, op="redeem",
                                        reason="insufficient_credits")
        raise

    doc = {
        "user_id": uid,
        "reward_id": rid,
        "title": reward["title"],
        "cost": cost,
        "code": code,
        "status": "fulfilled",
        "fulfillment_ref": None,
        "balance_after": new_bal,
        "ts": now,
    }
    try:
        ref = await _fulfill(user, reward, code)
        doc["fulfillment_ref"] = ref
        ins = await _db[REDEMPTIONS].insert_one(doc)
        doc["_id"] = ins.inserted_id
    except Exception as e:  # noqa: BLE001
        logger.warning("reward redemption failed for %s: %s", rid, e)
        # Claw back the debit and the stock claim so the user loses nothing.
        try:
            await _credit_user(user, cost, f"Redemption refund: {rid}",
                               metadata={"kind": "redeem_refund", "reward_id": rid,
                                         "rollback": True})
        except Exception as e2:  # noqa: BLE001
            logger.error("CRITICAL: redemption clawback failed for %s: %s",
                         uid, e2)
        await _db[REWARDS].update_one(
            {"_id": rid}, {"$inc": {"redeemed_count": -1}})
        await audit_op(uid, "redeem", cost, f"Reward: {reward['title']}", "failed")
        raise HTTPException(500, "Redemption could not be completed; your credits were returned")

    await audit_op(uid, "redeem", cost, f"Reward: {reward['title']}", "ok")

    from features.wallet_notifications import notify_wallet_event
    await notify_wallet_event(
        user, "spend",
        f"Redeemed {reward['title']}",
        f"You spent {cost} credits. Code {code}"
        + (f" is stored for the {reward.get('fulfillment_action')} benefit."
           if reward.get("fulfillment_action") != "none" else "."),
        data={"kind": "redeem", "reward_id": rid, "code": code, "amount": cost})

    return {
        "ok": True,
        "code": code,
        "reward": _public_reward(reward),
        "new_balance": new_bal,
        "fulfilled": True,
        "fulfillment_ref": doc["fulfillment_ref"],
        "redemption_id": str(ins.inserted_id),
    }


@router.get("/wallet/redeem/history")
async def my_redemptions(
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(_get_current_user_dependency()),
):
    """My redemptions, newest first."""
    rows = await _db[REDEMPTIONS].find(
        {"user_id": str(user["_id"])}).sort("ts", -1).limit(limit).to_list(limit)
    return {"redemptions": [
        {"id": str(r["_id"]), "reward_id": r.get("reward_id"),
         "title": r.get("title"), "cost_credits": int(r.get("cost") or 0),
         "code": r.get("code"), "status": r.get("status"),
         "fulfillment_ref": r.get("fulfillment_ref"),
         "ts": r.get("ts")} for r in rows],
        "count": len(rows)}


# ─── FULFILLMENT ENGINE ─────────────────────────────────────────────────
def _gen_code() -> str:
    import uuid
    return uuid.uuid4().hex[:8].upper()


async def _fulfill(user: Dict[str, Any], reward: Dict[str, Any],
                   code: str) -> Optional[str]:
    """Execute the reward's fulfillment_action synchronously.

    Returns a ref (usually the code) that downstream services check to
    honor the benefit. `none` means the code itself is the token
    (e.g. merch voucher — shown at the store).
    """
    action = reward.get("fulfillment_action") or "none"
    uid = user["_id"]
    now = datetime.now(timezone.utc)

    if action == "event_pass":
        # The redemption doc + code is the entry token; events flow checks
        # sa_redemptions (reward_id=event_pass, status=fulfilled, unexpired).
        return code

    if action == "profile_boost":
        await _db.users.update_one(
            {"_id": uid},
            {"$set": {"profile_boost_until": now + timedelta(days=7)}})
        return code

    if action == "extra_deal_discount":
        await _db.users.update_one(
            {"_id": uid},
            {"$set": {"wallet.extra_deal_discount": 0.05,
                      "wallet.extra_deal_discount_until": now + timedelta(days=7)}})
        return code

    if action == "gold_badge":
        badge = {
            "id": "gold_member", "category": "wallet", "tier": "high",
            "label": "Gold Member", "icon": "Award", "color": "#F59E0B",
            "earned_at": now, "hint": "Redeemed the Gold Member Badge reward.",
        }
        await _db.users.update_one(
            {"_id": uid},
            {"$addToSet": {"badges": badge},
             "$set": {"badges.gold_member_until": now + timedelta(days=30)}})
        return code

    if action == "rental_credit":
        await _db.users.update_one(
            {"_id": uid},
            {"$set": {"wallet.rental_credit": 200,
                      "wallet.rental_credit_until": now + timedelta(days=60)}})
        return code

    if action == "resume_review":
        res = await _db["sa_ai_resume_reviews"].insert_one({
            "user_id": str(uid), "code": code, "status": "unreviewed",
            "expires_at": now + timedelta(days=7), "ts": now,
        })
        return str(res.inserted_id)

    if action == "priority_support":
        await _db.users.update_one(
            {"_id": uid},
            {"$set": {"wallet.priority_support_until": now + timedelta(days=30)}})
        return code

    if action == "custom_certificate":
        title = str((user.get("full_name") or user.get("name") or uid[:8]))
        res = await _db.certificates.insert_one({
            "user_id": str(uid),
            "title": "Custom Certificate of Achievement",
            "issuer": "StudentAlumni",
            "series_id": code,
            "valid": True,
            "created_at": now,
            "custom": True,
        })
        return str(res.inserted_id)

    if action == "study_group_create":
        await _db.users.update_one(
            {"_id": uid},
            {"$set": {"wallet.study_group_unlocked": True,
                      "wallet.study_group_unlocked_at": now}})
        return code

    # default / unknown: the code itself is the voucher
    return code
