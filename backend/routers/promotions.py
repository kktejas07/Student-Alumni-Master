"""
routers/promotions.py — Phase C: cross-portal promotional banners.

Endpoints:
  GET    /api/promotions/active        — public-ish (auth optional) list of
                                         active promotions filtered to the
                                         caller's role/portal.
  GET    /api/admin/promotions         — admin only: list ALL.
  POST   /api/admin/promotions         — admin only: create.
  PATCH  /api/admin/promotions/{id}    — admin only: partial update.
  DELETE /api/admin/promotions/{id}    — admin only: delete.

Schema (promotions collection):
  {
    _id, title, body, cta_label, cta_url,
    badge: str | None,           # "NEW", "BETA", "DEAL", etc.
    tone: "violet" | "blue" | "indigo" | "teal" | "amber" | "rose" | "emerald",
    audience: ["student","alumni","college","mentor","super_admin"] | ["all"],
    placement: "dashboard" | "inline" | "modal",       # for future
    dismissible: bool (default True),
    is_active: bool,
    starts_at: datetime | None,    # show only after this
    ends_at:   datetime | None,    # hide after this
    display_order: int,
    image_url: str | None,         # optional small base64 image
    created_at, updated_at,
  }
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator

from core.db import db
from core.deps import get_current_user


router = APIRouter(prefix="/api", tags=["promotions"])

Audience = Literal["student", "alumni", "college", "mentor", "super_admin", "all"]
Tone = Literal["violet", "blue", "indigo", "teal", "amber", "rose", "emerald"]


def _require_admin(user: dict):
    role = (user.get("role") or "").lower()
    if role not in {"super_admin", "admin", "superadmin"}:
        raise HTTPException(status_code=403, detail="Admin role required")


def _serialize(doc: dict) -> dict:
    return {
        "id":            str(doc["_id"]),
        "title":         doc.get("title", ""),
        "body":          doc.get("body", ""),
        "cta_label":     doc.get("cta_label") or None,
        "cta_url":       doc.get("cta_url") or None,
        "badge":         doc.get("badge") or None,
        "tone":          doc.get("tone", "violet"),
        "audience":      doc.get("audience", ["all"]),
        "placement":     doc.get("placement", "dashboard"),
        "dismissible":   bool(doc.get("dismissible", True)),
        "is_active":     bool(doc.get("is_active", True)),
        "starts_at":     doc.get("starts_at").isoformat() if doc.get("starts_at") else None,
        "ends_at":       doc.get("ends_at").isoformat() if doc.get("ends_at") else None,
        "display_order": int(doc.get("display_order", 100)),
        "image_url":     doc.get("image_url") or None,
        "created_at":    doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at":    doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


class PromoIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=140)
    body:  str = Field("", max_length=500)
    cta_label: Optional[str] = Field(None, max_length=40)
    cta_url:   Optional[str] = Field(None, max_length=500)
    badge:     Optional[str] = Field(None, max_length=12)
    tone: Tone = "violet"
    audience: List[Audience] = Field(default_factory=lambda: ["all"])
    placement: Literal["dashboard", "inline", "modal"] = "dashboard"
    dismissible: bool = True
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at:   Optional[datetime] = None
    display_order: int = 100
    image_url: Optional[str] = Field(None, max_length=2_700_000)  # ~2 MB base64

    @validator("audience")
    def _dedup_audience(cls, v):
        return list(dict.fromkeys(v)) or ["all"]


class PromoPatch(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    cta_label: Optional[str] = None
    cta_url: Optional[str] = None
    badge: Optional[str] = None
    tone: Optional[Tone] = None
    audience: Optional[List[Audience]] = None
    placement: Optional[Literal["dashboard", "inline", "modal"]] = None
    dismissible: Optional[bool] = None
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    display_order: Optional[int] = None
    image_url: Optional[str] = None


def _resolve_id(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid id")


# ── Public-ish: list active promotions for the caller's portal ──────────
@router.get("/promotions/active")
async def list_active_for_me(user: dict = Depends(get_current_user)):
    """
    Returns the promotions visible to the current user, filtered by:
      - is_active = True
      - audience contains user.role OR "all"
      - now() between starts_at (if set) and ends_at (if set)
    Sorted by display_order ASC.
    """
    now = datetime.now(timezone.utc)
    role = (user.get("role") or "student").lower()
    # Normalize legacy role spellings
    role_map = {"superadmin": "super_admin", "admin": "super_admin"}
    role = role_map.get(role, role)

    q: dict = {
        "is_active": True,
        "$and": [
            {"$or": [{"starts_at": None}, {"starts_at": {"$lte": now}}]},
            {"$or": [{"ends_at": None}, {"ends_at": {"$gte": now}}]},
            {"$or": [{"audience": "all"}, {"audience": role}]},
        ],
    }
    cur = db.promotions.find(q).sort("display_order", 1)
    items = [_serialize(d) async for d in cur]
    return {"items": items, "role": role, "as_of": now.isoformat()}


# ── Admin CRUD ───────────────────────────────────────────────────────────
@router.get("/admin/promotions")
async def list_all(user: dict = Depends(get_current_user)):
    _require_admin(user)
    cur = db.promotions.find({}).sort("display_order", 1)
    items = [_serialize(d) async for d in cur]
    return {"items": items}


@router.post("/admin/promotions")
async def create_promo(body: PromoIn, user: dict = Depends(get_current_user)):
    _require_admin(user)
    now = datetime.now(timezone.utc)
    doc = body.dict()
    doc.update({"created_at": now, "updated_at": now})
    res = await db.promotions.insert_one(doc)
    saved = await db.promotions.find_one({"_id": res.inserted_id})
    return _serialize(saved or doc)


@router.patch("/admin/promotions/{promo_id}")
async def update_promo(promo_id: str, body: PromoPatch, user: dict = Depends(get_current_user)):
    _require_admin(user)
    oid = _resolve_id(promo_id)
    payload = {k: v for k, v in body.dict(exclude_unset=True).items()}
    if not payload:
        existing = await db.promotions.find_one({"_id": oid})
        if not existing:
            raise HTTPException(404, "Promotion not found")
        return _serialize(existing)
    payload["updated_at"] = datetime.now(timezone.utc)
    res = await db.promotions.find_one_and_update(
        {"_id": oid}, {"$set": payload}, return_document=True,
    )
    if not res:
        raise HTTPException(404, "Promotion not found")
    return _serialize(res)


@router.delete("/admin/promotions/{promo_id}")
async def delete_promo(promo_id: str, user: dict = Depends(get_current_user)):
    _require_admin(user)
    oid = _resolve_id(promo_id)
    res = await db.promotions.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Promotion not found")
    return {"ok": True}


__all__ = ["router"]
