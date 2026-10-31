"""
features/routers/coupons_public.py — public AXISS-ecosystem promo coupons.

The two welcome codes surfaced on the contact-form success card (SACODE3M,
SAWEHIVE15) are tracked here so admins can audit redemptions. Distinct from
the partner-discount system in features/coupons_api.py; these live under a
/promos prefix to avoid route shadowing.

    POST /api/promos/validate            public — check a code without redeeming
    POST /api/promos/redeem             public — one redemption per email
    GET  /api/admin/promos/redemptions  admin  — redemption audit log

Mounted under api_router (prefix /api) in server.py.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from core.db import db
from core.deps import get_current_user, ensure_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/promos", tags=["promotional-coupons"])
admin_router = APIRouter(tags=["admin-promos"])

# Seed codes — one-time per email, valid for registered SA users, expire 2027-03-31.
SEED_PROMOS = [
    {
        "code": "SACODE3M",
        "product": "codespectra",
        "offer": "3 months free on CodeSpectra.ai technical assessment platform",
        "discount_type": "free_months",
        "value": 3,
        "audience": "registered",
        "max_per_email": 1,
        "active": True,
        "expires_at": datetime(2027, 3, 31, tzinfo=timezone.utc),
        "source": "contact_form",
    },
    {
        "code": "SAWEHIVE15",
        "product": "wehive",
        "offer": "15% off visa, study-abroad & travel services at WeHive.co.in",
        "discount_type": "percentage",
        "value": 15,
        "audience": "registered",
        "max_per_email": 1,
        "active": True,
        "expires_at": datetime(2027, 3, 31, tzinfo=timezone.utc),
        "source": "contact_form",
    },
]


class PromoIn(BaseModel):
    code: str
    email: EmailStr


async def _seed() -> None:
    """Ensure the seed promo codes exist in the promotional_coupons collection."""
    for p in SEED_PROMOS:
        if not await db.promotional_coupons.find_one({"code": p["code"]}):
            await db.promotional_coupons.insert_one(dict(p))


async def _find_active(code: str) -> Optional[dict]:
    return await db.promotional_coupons.find_one({"code": code, "active": True})


@router.post("/validate")
async def validate_promo(payload: PromoIn):
    await _seed()
    code = payload.code.strip().upper()
    promo = await _find_active(code)
    if not promo:
        return {"valid": False, "reason": "Unknown or inactive promo code"}
    exp = promo.get("expires_at")
    if exp and exp < datetime.now(timezone.utc):
        return {"valid": False, "reason": "Promo has expired"}
    return {
        "valid": True,
        "code": code,
        "product": promo.get("product"),
        "offer": promo.get("offer"),
        "expires_at": exp.isoformat() if exp else None,
    }


@router.post("/redeem")
async def redeem_promo(payload: PromoIn):
    await _seed()
    code = payload.code.strip().upper()
    email = payload.email.lower().strip()
    promo = await _find_active(code)
    if not promo:
        raise HTTPException(404, "Unknown or inactive promo code")
    exp = promo.get("expires_at")
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(400, "Promo has expired")
    limit = int(promo.get("max_per_email", 1))
    prior = await db.promo_redemptions.count_documents(
        {"code": code, "email": email}
    )
    if prior >= limit:
        raise HTTPException(409, "This promo has already been redeemed for your email")
    now = datetime.now(timezone.utc)
    res = await db.promo_redemptions.insert_one(
        {
            "code": code,
            "email": email,
            "product": promo.get("product"),
            "source": promo.get("source", "contact_form"),
            "redeemed_at": now,
        }
    )
    await db.promotional_coupons.update_one(
        {"code": code}, {"$inc": {"redeemed_count": 1}}
    )
    return {"ok": True, "id": str(res.inserted_id), "code": code}


@admin_router.get("/admin/promos/redemptions")
async def promo_redemptions(user: dict = Depends(get_current_user)):
    ensure_admin(user)
    docs = await db.promo_redemptions.find().sort("redeemed_at", -1).to_list(200)
    promos = await db.promotional_coupons.find().to_list(50)
    return {
        "redemptions": [
            {
                "id": str(d.get("_id")),
                "code": d.get("code"),
                "email": d.get("email"),
                "product": d.get("product"),
                "source": d.get("source"),
                "redeemed_at": d.get("redeemed_at").isoformat() if d.get("redeemed_at") else None,
            }
            for d in docs
        ],
        "coupons": [
            {
                "code": p.get("code"),
                "product": p.get("product"),
                "offer": p.get("offer"),
                "active": bool(p.get("active", True)),
                "max_per_email": int(p.get("max_per_email", 1)),
                "redeemed_count": int(p.get("redeemed_count", 0)),
            }
            for p in promos
        ],
    }
