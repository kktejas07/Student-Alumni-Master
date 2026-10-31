"""
routers/partners.py — Collaboration Partners management.

Public endpoint:
  GET    /api/landing/partners        — returns active partners ordered by display_order

Admin endpoints (require super_admin / admin role):
  GET    /api/admin/partners          — list ALL (incl. inactive)
  POST   /api/admin/partners          — create
  PATCH  /api/admin/partners/{id}     — update (partial)
  DELETE /api/admin/partners/{id}     — soft / hard delete (here: hard)
  POST   /api/admin/partners/reorder  — bulk reorder via list of ids

Logos are stored inline as base64 data URIs (consistent with the rest of the
project). Max payload: 2 MB per logo.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from core.db import db
from core.deps import get_current_user, ensure_admin


router = APIRouter(prefix="/api", tags=["partners"])

# Cap base64-encoded logo size at ~2.7MB (≈ 2MB binary after base64 overhead)
MAX_LOGO_LEN = 2_800_000

PartnerCategory = Literal["college", "company", "sponsor"]


# ───────────────────────── Pydantic models ────────────────────────────
class PartnerIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=140)
    category: PartnerCategory
    logo_url: str = Field(..., description="base64 data URI for color logo")
    logo_white_url: Optional[str] = Field(default=None, description="optional white/inverted variant")
    display_order: int = Field(default=100, ge=0, le=10_000)
    is_active: bool = True

    @field_validator("logo_url", "logo_white_url")
    @classmethod
    def _check_logo_size(cls, v):
        if v and len(v) > MAX_LOGO_LEN:
            raise ValueError("Logo too large (max ~2MB binary)")
        return v


class PartnerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=140)
    category: Optional[PartnerCategory] = None
    logo_url: Optional[str] = None
    logo_white_url: Optional[str] = None
    display_order: Optional[int] = Field(default=None, ge=0, le=10_000)
    is_active: Optional[bool] = None

    @field_validator("logo_url", "logo_white_url")
    @classmethod
    def _check_logo_size(cls, v):
        if v is not None and len(v) > MAX_LOGO_LEN:
            raise ValueError("Logo too large (max ~2MB binary)")
        return v


class ReorderIn(BaseModel):
    ordered_ids: list[str]


# ────────────────────────── Helpers ─────────────────────────────────
def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "category": doc.get("category", "company"),
        "logo_url": doc.get("logo_url", ""),
        "logo_white_url": doc.get("logo_white_url"),
        "display_order": doc.get("display_order", 100),
        "is_active": bool(doc.get("is_active", True)),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


def _require_admin(user: dict):
    ensure_admin(user)


# ────────────────────────── Public endpoint ─────────────────────────
@router.get("/landing/partners")
async def list_active_partners(
    category: Optional[PartnerCategory] = Query(default=None),
):
    """Public — used by the landing page Sponsored Collaboration Partners strip
    and the dashboard footer sponsor row. Returns ONLY active partners ordered
    by display_order ASC (then created_at)."""
    q: dict = {"is_active": True}
    if category:
        q["category"] = category
    cursor = db.collaboration_partners.find(q).sort([("display_order", 1), ("created_at", 1)])
    items = [_serialize(d) async for d in cursor]
    return {"items": items, "total": len(items)}


# ────────────────────────── Admin endpoints ─────────────────────────
@router.get("/admin/partners")
async def admin_list_partners(user: dict = Depends(get_current_user)):
    _require_admin(user)
    cursor = db.collaboration_partners.find({}).sort([("display_order", 1), ("created_at", 1)])
    items = [_serialize(d) async for d in cursor]
    return {"items": items, "total": len(items)}


@router.post("/admin/partners")
async def admin_create_partner(
    body: PartnerIn,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    now = datetime.now(timezone.utc)
    doc = body.model_dump()
    doc.update({"created_at": now, "updated_at": now})
    res = await db.collaboration_partners.insert_one(doc)
    saved = await db.collaboration_partners.find_one({"_id": res.inserted_id})
    return _serialize(saved)


@router.patch("/admin/partners/{partner_id}")
async def admin_update_partner(
    partner_id: str,
    body: PartnerUpdate,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    try:
        oid = ObjectId(partner_id)
    except Exception:
        raise HTTPException(400, "Invalid partner id")
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    res = await db.collaboration_partners.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "Partner not found")
    return _serialize(res)


@router.delete("/admin/partners/{partner_id}")
async def admin_delete_partner(
    partner_id: str,
    user: dict = Depends(get_current_user),
):
    _require_admin(user)
    try:
        oid = ObjectId(partner_id)
    except Exception:
        raise HTTPException(400, "Invalid partner id")
    res = await db.collaboration_partners.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Partner not found")
    return {"ok": True, "deleted_id": partner_id}


@router.post("/admin/partners/reorder")
async def admin_reorder_partners(
    body: ReorderIn,
    user: dict = Depends(get_current_user),
):
    """Bulk reorder. Pass an ordered list of partner ids; their display_order
    becomes the position in the array * 10 (so admin can squeeze inserts later)."""
    _require_admin(user)
    now = datetime.now(timezone.utc)
    bulk_ops = []
    for idx, pid in enumerate(body.ordered_ids):
        try:
            oid = ObjectId(pid)
        except Exception:
            continue
        bulk_ops.append((oid, {"display_order": (idx + 1) * 10, "updated_at": now}))
    for oid, upd in bulk_ops:
        await db.collaboration_partners.update_one({"_id": oid}, {"$set": upd})
    return {"ok": True, "reordered": len(bulk_ops)}


__all__ = ["router"]
