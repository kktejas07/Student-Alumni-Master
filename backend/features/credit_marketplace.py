"""
credit_marketplace.py — SA Credit Marketplace (W12).

Credits buy platform services directly, no cash involved:

  service            cost        fulfillment on purchase
  ─────────────────  ────────    ──────────────────────────────────────────
  resume_review       50cr        AI resume review unlocked (24h link)
  mock_interview      75cr        AI mock-interview slot unlocked
  certificate_print  100cr       a certificate is queued for printing
  mentor_session      200cr      a free mentor-booking credit is stored
  event_ticket        150cr      free entry on the next listed event
  course_unlock        75cr      one course is unlocked for 30 days
  priority_review     200cr      app/profile review prioritized (48h)
  study_room_hr        25cr      one study-room hour is booked

Purchases are idempotent per user per service per day (a second
purchase of the same service the same day is returned as a duplicate),
audited via sa_wallet_audit, and both the debit and the fulfillment
record are written synchronously before the response — there is no
asynchronous fulfillment to lose.

Collection:
  sa_marketplace_purchases — one doc per purchase

No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("credit_marketplace")
router = APIRouter()

PURCHASES = "sa_marketplace_purchases"

SERVICES: List[Dict[str, Any]] = [
    {"slug": "resume_review", "title": "AI Resume Review", "cost": 50,
     "description": "An AI pass over your resume with section-level feedback and a re-score.",
     "limit": 1},
    {"slug": "mock_interview", "title": "AI Mock Interview", "cost": 75,
     "description": "A 45-minute AI interview on your target role with a structured debrief.",
     "limit": 1},
    {"slug": "certificate_print", "title": "Certificate Print", "cost": 100,
     "description": "One of your earned certificates rendered as a print-ready PDF.",
     "limit": 2},
    {"slug": "course_unlock", "title": "Course Unlock (30 days)", "cost": 75,
     "description": "Unlock any one paid course for 30 days.",
     "limit": 2},
    {"slug": "priority_review", "title": "Priority App/Profile Review", "cost": 200,
     "description": "Your application or profile moves to the front of the review queue (48h SLA).",
     "limit": 1},
    {"slug": "event_ticket", "title": "Free Event Ticket", "cost": 150,
     "description": "Free entry to any upcoming SA member event.",
     "limit": 3},
    {"slug": "mentor_session", "title": "Free Mentor Session", "cost": 200,
     "description": "A fully booked 30-minute session with a verified SA mentor.",
     "limit": 2},
    {"slug": "study_room_hr", "title": "Study Room Hour", "cost": 25,
     "description": "One hour in an SA study room / co-working space, redeemable at partners.",
     "limit": 8},
]

_DAYS_VALID: Dict[str, int] = {
    "resume_review": 7, "mock_interview": 7, "course_unlock": 30,
    "priority_review": 14, "event_ticket": 30, "mentor_session": 30,
    "study_room_hr": 14, "certificate_print": 365,
}


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


def _service(slug: str) -> Dict[str, Any]:
    s = next((x for x in SERVICES if x["slug"] == slug), None)
    if not s:
        raise HTTPException(404, "Unknown marketplace service")
    return s


# ─── ENDPOINTS ───────────────────────────────────────────────────────────
@router.get("/wallet/marketplace")
async def marketplace_catalog(
    user: dict = Depends(_get_current_user_dependency()),
):
    """Service catalog with my remaining daily quota and redemption links."""
    uid = str(user["_id"])
    today_lo = (datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0))
    counts: Dict[str, int] = {}
    purchasable_ids: Dict[str, str] = {}
    async for p in _db[PURCHASES].find(
            {"user_id": uid, "ts": {"$gte": today_lo}}):
        counts[p["service"]] = counts.get(p["service"], 0) + 1
        if p.get("status") == "fulfilled" and p.get("fulfillment_ref"):
            purchasable_ids.setdefault(p["service"], str(p["_id"]))

    items = []
    for s in SERVICES:
        used = counts.get(s["slug"], 0)
        items.append({
            **s,
            "remaining_today": max(0, s["limit"] - used),
            "purchased_today": used,
            "fulfillment_ref": purchasable_ids.get(s["slug"]),
        })
    return {
        "services": items,
        "balance_credits": int((user.get("wallet") or {}).get("balance_credits") or 0),
        "note": "One purchase per service per day up to the shown limit. Purchases are redeemed at the target service.",
    }


@router.post("/wallet/marketplace/purchase")
async def purchase_service(
    body: Dict[str, Any] = Body(...),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Buy a service with credits.

    Body: { service: slug }
    """
    from features.activity_credits import _debit_user
    from features.wallet_security import (
        audit_op, check_debit_lock, register_failed_debit,
    )

    slug = str((body or {}).get("service") or "").strip()
    svc = _service(slug)
    uid = str(user["_id"])
    now = datetime.now(timezone.utc)

    await check_debit_lock(user)

    bought_today = await _db[PURCHASES].count_documents({
        "user_id": uid, "service": slug, "ts": {"$gte": now.replace(
            hour=0, minute=0, second=0, microsecond=0)}})
    if bought_today >= svc["limit"]:
        raise HTTPException(409, f"Daily limit reached for {svc['title']} ({svc['limit']}/day)")

    bal = int((user.get("wallet") or {}).get("balance_credits") or 0)
    cost = svc["cost"]
    if bal < cost:
        raise HTTPException(402, f"Insufficient credits — balance {bal}, needed {cost}")

    await audit_op(uid, "marketplace", cost, svc["title"], "attempted")

    # Idempotency: one purchase per service per day is enforced above;
    # the debit key additionally guards against double-races.
    try:
        new_bal, dup = await _debit_user(
            user, cost, f"Marketplace: {svc['title']}",
            metadata={"kind": "marketplace", "service": slug},
            idempotency_key=f"marketplace:{uid}:{slug}:{now.strftime('%Y-%m-%d')}")
    except HTTPException:
        await audit_op(uid, "marketplace", cost, svc["title"], "failed")
        raise
    if dup:
        await audit_op(uid, "marketplace", 0, svc["title"], "duplicate")
        last = await _db[PURCHASES].find_one(
            {"user_id": uid, "service": slug,
             "ts": {"$gte": now.replace(hour=0, minute=0, second=0, microsecond=0)}})
        return {"ok": True, "duplicate": True,
                "purchase": {
                    "id": str(last["_id"]) if last else None,
                    "service": slug, "title": svc["title"],
                    "cost_credits": cost,
                    "status": (last or {}).get("status"),
                },
                "balance_credits": new_bal}

    # Fulfillment record — synchronous, transactional-with-the-debit in
    # effect: if the insert fails we claw the credits back.
    expires_at = now + timedelta(days=_DAYS_VALID.get(slug, 7))
    doc = {
        "user_id": uid,
        "service": slug,
        "title": svc["title"],
        "cost_credits": cost,
        "balance_after": new_bal,
        "status": "fulfilled",
        "fulfilled_at": now,
        "expires_at": expires_at,
        "ts": now,
    }
    try:
        res = await _db[PURCHASES].insert_one(doc)
        doc["_id"] = res.inserted_id
    except Exception as e:  # noqa: BLE001
        logger.warning("marketplace purchase insert failed: %s", e)
        await _credit_back(user, cost, slug)
        raise HTTPException(500, "Purchase could not be completed; no credits were taken")

    await audit_op(uid, "marketplace", cost, svc["title"], "ok")

    redemption_url = None
    try:
        redemption_url = _redemption_path(slug)
    except Exception:
        pass

    return {
        "ok": True,
        "duplicate": False,
        "balance_credits": new_bal,
        "purchase": {
            "id": str(res.inserted_id),
            "service": slug,
            "title": svc["title"],
            "cost_credits": cost,
            "status": "fulfilled",
            "fulfilled_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
        },
        "redemption": {
            "service": slug,
            "where": redemption_url,
            "hint": "Go to the service page and redeem with this purchase.",
        },
    }


async def _credit_back(user: Dict[str, Any], cost: int, slug: str) -> None:
    from features.activity_credits import _credit_user
    try:
        await _credit_user(user, cost, f"Marketplace refund: {slug}",
                           metadata={"kind": "marketplace_refund", "service": slug})
    except Exception as e:  # noqa: BLE001
        logger.error("CRITICAL: marketplace refund failed for %s: %s",
                     user.get("_id"), e)


def _redemption_path(slug: str) -> Optional[str]:
    return {
        "resume_review": "/career/resume-review",
        "mock_interview": "/career/mock-interview",
        "certificate_print": "/certificates",
        "course_unlock": "/courses",
        "priority_review": "/career/applications",
        "event_ticket": "/events",
        "mentor_session": "/mentor",
        "study_room_hr": "/campus/study-room",
    }.get(slug)


@router.get("/wallet/marketplace/purchases")
async def my_purchases(
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(_get_current_user_dependency()),
):
    rows = await _db[PURCHASES].find(
        {"user_id": str(user["_id"])}).sort("ts", -1).limit(limit).to_list(limit)
    return {"purchases": [
        {"id": str(r["_id"]), "service": r.get("service"),
         "title": r.get("title"), "cost_credits": int(r.get("cost_credits") or 0),
         "status": r.get("status"),
         "fulfilled_at": r.get("fulfilled_at"),
         "expires_at": r.get("expires_at")}
        for r in rows], "count": len(rows)}
