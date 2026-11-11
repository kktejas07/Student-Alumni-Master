"""
referral_engine.py — Wallet Referral Engine (W5).

Encourages members to bring friends via a personal referral code
(e.g. KRISHNA-SA). Each referred signup that the referrer tracks
earns credits; milestones unlock bigger bonuses + badges.

  sa_referrals  — one doc per referrer: code, link, referred_users,
                  milestones_awarded

Endpoints (all under /api):
   GET  /wallet/referral              — my code, link, share payloads, progress
   GET  /wallet/referral/leaderboard  — top 10 (anonymized) + my rank
   POST /wallet/referral/track        — { referred_email } confirm a signup

Milestones: 5 refs = 500cr, 10 = 1000cr + Influencer badge,
            25 = 2500cr + Ambassador badge + SA merch voucher.
No emoji, per CODING_RULES.md.
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from core.db import db as _db

logger = logging.getLogger("referral_engine")
router = APIRouter()

REFERRALS = "sa_referrals"
BADGES = "sa_badges"

PER_REFERRAL_CREDITS = 100
MERCH_VOUCHER_CREDITS = 500

MILESTONES: List[Dict[str, Any]] = [
    {"count": 5, "bonus_credits": 500, "badge": None},
    {"count": 10, "bonus_credits": 1000, "badge": "influencer_badge"},
    {"count": 25, "bonus_credits": 2500, "badge": "ambassador_badge"},
]


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


def _referral_base() -> str:
    return (os.environ.get("SA_REFERRAL_BASE_URL")
            or "https://studentalumni.in").rstrip("/")


def _mask_name(name: Optional[str]) -> str:
    """Anonymize: 'Krishna' -> 'K••••' (first letter + dots)."""
    n = (name or "").strip()
    if not n:
        return "••••"
    return n[0].upper() + "•" * min(4, max(1, len(n) - 1))


def _gen_code(user: Dict[str, Any]) -> str:
    name = (user.get("full_name") or user.get("name")
            or (user.get("email") or "user").split("@")[0])
    slug = re.sub(r"[^A-Z0-9]", "", str(name).upper())
    return (slug or "SA")[:16] + "-SA"


async def _get_or_create_referral(user: Dict[str, Any]) -> Dict[str, Any]:
    rid = str(user["_id"])
    doc = await _db[REFERRALS].find_one({"referrer_id": rid})
    if doc:
        return doc
    code = _gen_code(user)
    # Keep the code unique across the platform
    clash = await _db[REFERRALS].find_one({"referral_code": code})
    if clash:
        code = f"{code}-{rid[-4:].upper()}"
    doc = {
        "referrer_id": rid,
        "referral_code": code,
        "referred_users": [],
        "milestones_awarded": [],
        "total_earned_credits": 0,
        "created_at": datetime.now(timezone.utc),
    }
    res = await _db[REFERRALS].insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc


async def _award_credits(user: Dict[str, Any], amount: int, reason: str,
                         idem: str) -> bool:
    from features.activity_credits import _credit_user
    new_bal, dup = await _credit_user(user, amount, reason,
                                      metadata={"engine": "referral"},
                                      idempotency_key=idem)
    if not dup:
        # Keep the in-memory wallet current so successive credits in the
        # same request don't overwrite each other's increments.
        w = user.setdefault("wallet", {})
        w["balance_credits"] = new_bal
    return dup


def _share_payload(doc: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    code = doc["referral_code"]
    base = _referral_base()
    link = (f"{base}/auth?ref={code}"
            f"&utm_source=wallet&utm_medium=referral"
            f"&utm_campaign=sa_referral&utm_content={code}")
    wa_text = (
        f"Hey! I'm on StudentAlumni — earn SA Credits for mentoring, "
        f"events, deals and more. Join me: {link} (code {code})"
    )
    qr = ("https://api.qrserver.com/v1/create-qr-code/?size=400x400&data="
          + re.sub(r"[^A-Za-z0-9_.~-]", "", link))
    first = _mask_name(user.get("full_name") or user.get("name"))
    wa_url_text = re.sub(r"[^A-Za-z0-9._~!$&'()*+,;=:/?%#-]", "", wa_text)
    return {
        "code": code,
        "link": link,
        "whatsapp": f"https://wa.me/?text={wa_url_text}",
        "copy": link,
        "qr": qr,
        "template": wa_text,
        "owner_preview": first,
    }


async def _award_milestones(doc: Dict[str, Any], user: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Grants any not-yet-earned milestone bonuses now that count is high enough."""
    count = len(doc.get("referred_users") or [])
    awarded = set(doc.get("milestones_awarded") or [])
    newly: List[Dict[str, Any]] = []
    for m in MILESTONES:
        if m["count"] in awarded or count < m["count"]:
            continue
        idem = f"referral-milestone:{doc['referrer_id']}:{m['count']}"
        dup = await _award_credits(user, m["bonus_credits"],
                                   f"Referral milestone: {m['count']} referrals",
                                   idem)
        if not dup:
            doc["total_earned_credits"] = int(doc.get("total_earned_credits") or 0) + m["bonus_credits"]
        await _db[REFERRALS].update_one(
            {"_id": doc["_id"]},
            {"$addToSet": {"milestones_awarded": m["count"]},
             "$set": {"total_earned_credits": doc["total_earned_credits"],
                      "updated_at": datetime.now(timezone.utc)}},
        )
        awarded.add(m["count"])
        if m.get("badge"):
            await _db[BADGES].update_one(
                {"user_id": doc["referrer_id"], "slug": m["badge"]},
                {"$set": {
                    "user_id": doc["referrer_id"],
                    "slug": m["badge"],
                    "title": ("Influencer" if m["badge"] == "influencer_badge"
                              else "Ambassador"),
                    "rarity": "rare" if m["badge"] == "influencer_badge" else "epic",
                    "earned_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
            if m["badge"] == "ambassador_badge":
                # Merch voucher: auto-credit the user an SA merch voucher
                try:
                    dup_m = await _award_credits(
                        user, MERCH_VOUCHER_CREDITS,
                        "SA merch voucher (Ambassador)",
                        f"referral-merch:{doc['referrer_id']}")
                    if not dup_m:
                        await _db[REFERRALS].update_one(
                            {"_id": doc["_id"]},
                            {"$inc": {"total_earned_credits": MERCH_VOUCHER_CREDITS}})
                except Exception as e:  # noqa: BLE001
                    logger.warning("merch credit failed: %s", e)
        newly.append({"count": m["count"], "bonus_credits": m["bonus_credits"],
                     "badge": m.get("badge")})
    return newly


# ─── ENDPOINTS ───────────────────────────────────────────────────────────
@router.get("/wallet/referral")
async def my_referral(user: dict = Depends(_get_current_user_dependency())):
    """My referral code, share payloads, and progress toward milestones."""
    doc = await _get_or_create_referral(user)
    count = len(doc.get("referred_users") or [])
    milestones = []
    for m in MILESTONES:
        achieved = m["count"] in (doc.get("milestones_awarded") or [])
        milestones.append({
            "count": m["count"],
            "bonus_credits": m["bonus_credits"],
            "badge": m.get("badge"),
            "achieved": achieved,
        })
    next_ms = next((m for m in MILESTONES
                    if m["count"] not in (doc.get("milestones_awarded") or [])), None)
    return {
        **_share_payload(doc, user),
        "referral_count": count,
        "referred": [
            {"name": _mask_name(r.get("name")),
             "joined_at": r.get("joined_at")}
            for r in (doc.get("referred_users") or [])[-10:]
        ],
        "total_earned_credits": int(doc.get("total_earned_credits") or 0)
            + count * PER_REFERRAL_CREDITS,
        "per_referral_credits": PER_REFERRAL_CREDITS,
        "milestones": milestones,
        "next_milestone": ({
            "count": next_ms["count"],
            "bonus_credits": next_ms["bonus_credits"],
            "remaining": next_ms["count"] - count,
        } if next_ms else None),
    }


@router.get("/wallet/referral/leaderboard")
async def referral_leaderboard(
    limit: int = Query(10, le=10),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Top referrers, anonymized. Includes the caller's rank."""
    top = []
    async for r in _db[REFERRALS].find({"referred_users.0": {"$exists": True}}):
        top.append((r["referrer_id"], len(r.get("referred_users") or []),
                    r.get("referral_code")))
    top.sort(key=lambda t: (-t[1], t[2]))
    rows = []
    for rid, cnt, code in top[:limit]:
        rows.append({"id": rid, "referral_count": cnt,
                    "display_name": _mask_name((code or "").split("-")[0])})
    my = await _get_or_create_referral(user)
    my_count = len(my.get("referred_users") or [])
    my_rank = sum(1 for rid, cnt, _ in top if cnt > my_count) + 1
    return {"leaderboard": rows, "me": {
        "id": my["referrer_id"], "referral_count": my_count, "rank": my_rank}}


@router.post("/wallet/referral/track")
async def track_referral(
    body: Dict[str, Any] = Body(default={}),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Confirm that a person I referred has signed up.

    Body: { referred_email: str }  (or referred_user_id)
    Idempotent — tracking the same referred user twice is a no-op.
    """
    email = str((body or {}).get("referred_email") or "").lower().strip()
    rid_given = (body or {}).get("referred_user_id")
    target = None
    if email:
        target = await _db.users.find_one({"email": email})
    elif rid_given:
        from bson import ObjectId
        try:
            target = await _db.users.find_one({"_id": ObjectId(str(rid_given))})
        except Exception:
            target = None
    if not target:
        raise HTTPException(404, "Referred user not found")
    if str(target["_id"]) == str(user["_id"]):
        raise HTTPException(400, "You cannot refer yourself")

    doc = await _get_or_create_referral(user)
    referred = doc.setdefault("referred_users", [])
    ex = next((r for r in referred
               if r.get("user_id") == str(target["_id"])), None)
    if ex:
        return {"ok": True, "duplicate": True, "referral_count": len(referred)}

    now = datetime.now(timezone.utc)
    referred.append({
        "user_id": str(target["_id"]),
        "name": target.get("full_name") or target.get("name") or target.get("email"),
        "joined_at": now.isoformat(),
    })
    idem = f"referral-per-ref:{doc['referrer_id']}:{target['_id']}"
    dup = await _award_credits(user, PER_REFERRAL_CREDITS,
                               "Referral bonus", idem)
    if not dup:
        doc["total_earned_credits"] = int(doc.get("total_earned_credits") or 0) + PER_REFERRAL_CREDITS
    await _db[REFERRALS].update_one(
        {"_id": doc["_id"]},
        {"$set": {"referred_users": referred,
                  "total_earned_credits": doc.get("total_earned_credits", 0),
                  "updated_at": now}},
    )

    try:
        from features.notifications import send_push
        await send_push(
            _db,
            user_id=str(user["_id"]),
            title=f"New referral: +{PER_REFERRAL_CREDITS} credits",
            body="Thanks for bringing a friend to StudentAlumni.",
            data={"type": "referral_tracked", "code": doc["referral_code"]},
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("referral push failed: %s", e)

    newly = await _award_milestones(doc, user)
    return {"ok": True, "duplicate": False,
            "referral_count": len(referred),
            "credits_earned": 0 if dup else PER_REFERRAL_CREDITS,
            "milestone_awards": newly}
