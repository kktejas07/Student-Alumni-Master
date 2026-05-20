"""
routers/consent.py — Privacy & Cookie consent records (Phase B).

Endpoints:
  GET  /api/me/consent       — read the current user's consent prefs (auth)
  PUT  /api/me/consent       — set/update consent prefs (auth)
  POST /api/anon/consent     — anonymous consent log (no auth)

Schema (per user):
  user_consent: {
    _id, user_id (ObjectId, indexed),
    essential   (bool, always True),
    analytics   (bool),
    functional  (bool),
    marketing   (bool),
    accepted_all (bool),       # convenience flag
    version     (str),          # consent policy version (e.g. "2026-05-1")
    user_agent  (str | None),
    ip_hash     (str | None),
    created_at, updated_at
  }
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from core.db import db
from core.deps import get_current_user


router = APIRouter(prefix="/api", tags=["consent"])

# Current consent policy version — bump when legal copy materially changes.
CONSENT_VERSION = "2026-05-1"


class ConsentIn(BaseModel):
    essential: bool = True              # cannot be False
    analytics: bool = False
    functional: bool = False
    marketing: bool = False
    accepted_all: Optional[bool] = None  # if True, force all three optional to True
    version: Optional[str] = None        # client-reported version (we override w/ server)


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    return {
        "id": str(doc["_id"]),
        "essential": True,                  # always
        "analytics":  bool(doc.get("analytics", False)),
        "functional": bool(doc.get("functional", False)),
        "marketing":  bool(doc.get("marketing", False)),
        "accepted_all": bool(doc.get("accepted_all", False)),
        "version": doc.get("version", CONSENT_VERSION),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


@router.get("/me/consent")
async def get_my_consent(user: dict = Depends(get_current_user)):
    doc = await db.user_consent.find_one({"user_id": user["_id"]})
    if not doc:
        return {"exists": False, "version": CONSENT_VERSION}
    return {"exists": True, **_serialize(doc)}


@router.put("/me/consent")
async def set_my_consent(
    body: ConsentIn,
    request: Request,
    user: dict = Depends(get_current_user),
):
    accepted_all = body.accepted_all is True or (
        body.analytics and body.functional and body.marketing
    )
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user["_id"],
        "essential": True,
        "analytics":  bool(body.analytics)  or accepted_all,
        "functional": bool(body.functional) or accepted_all,
        "marketing":  bool(body.marketing)  or accepted_all,
        "accepted_all": accepted_all,
        "version": CONSENT_VERSION,
        "user_agent": (request.headers.get("user-agent") or "")[:300],
        "updated_at": now,
    }
    res = await db.user_consent.find_one_and_update(
        {"user_id": user["_id"]},
        {"$set": payload, "$setOnInsert": {"created_at": now}},
        upsert=True,
        return_document=True,
    )
    return {"exists": True, **_serialize(res)}


# ── Anonymous consent log (best-effort: useful for landing-page banner) ──
class AnonConsentIn(ConsentIn):
    anon_id: str = Field(..., min_length=8, max_length=80)


@router.post("/anon/consent")
async def log_anon_consent(body: AnonConsentIn, request: Request):
    accepted_all = body.accepted_all is True or (
        body.analytics and body.functional and body.marketing
    )
    now = datetime.now(timezone.utc)
    payload = {
        "anon_id":   body.anon_id,
        "essential": True,
        "analytics":  bool(body.analytics)  or accepted_all,
        "functional": bool(body.functional) or accepted_all,
        "marketing":  bool(body.marketing)  or accepted_all,
        "accepted_all": accepted_all,
        "version": CONSENT_VERSION,
        "user_agent": (request.headers.get("user-agent") or "")[:300],
        "updated_at": now,
    }
    await db.anon_consent.update_one(
        {"anon_id": body.anon_id},
        {"$set": payload, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return {"ok": True, "version": CONSENT_VERSION}


__all__ = ["router"]
