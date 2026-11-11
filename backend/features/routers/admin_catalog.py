"""
admin_catalog.py — CRUD endpoints for admin-curated catalog items.

Manages deals, insurance, and housing listings. These are the live sources
that seed_data.py checks before falling back to hardcoded SAMPLE_* data.

All endpoints require admin role.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.db import db
from core.deps import get_current_user, ensure_admin

logger = logging.getLogger("admin_catalog")
router = APIRouter(prefix="/admin/catalog", tags=["admin-catalog"])


# ─── Models ─────────────────────────────────────────────────────────
class DealCreate(BaseModel):
    title: str
    brand: str
    category: str
    discount: str
    code: Optional[str] = ""
    expires: Optional[str] = "Ongoing"
    url: Optional[str] = ""
    image: Optional[str] = ""


class InsuranceCreate(BaseModel):
    kind: str  # medical, bike, loan, etc.
    title: str
    provider: str
    highlight: str
    url: Optional[str] = ""
    description: Optional[str] = ""


class HousingCreate(BaseModel):
    country: str
    title: str
    provider: str
    highlight: str
    url: Optional[str] = ""
    cities: list[str] = []
    description: Optional[str] = ""


# ═══════════════════════════════════════════════════════════════════
# Deals CRUD
# ═══════════════════════════════════════════════════════════════════

@router.get("/deals")
async def list_deals(user: dict = Depends(ensure_admin)):
    items = await db.deals_config.find({}, {"_id": 0}).to_list(100)
    return {"deals": items, "count": len(items)}


@router.post("/deals")
async def create_deal(deal: DealCreate, user: dict = Depends(ensure_admin)):
    doc = {
        **deal.model_dump(),
        "id": f"d-{ObjectId()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email", "admin"),
    }
    await db.deals_config.insert_one(doc)
    # Also push to the live deals collection
    await db.deals.insert_one({k: v for k, v in doc.items() if k != "_id"})
    return {"ok": True, "deal": {k: v for k, v in doc.items() if k != "_id"}}


@router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: str, user: dict = Depends(ensure_admin)):
    result = await db.deals_config.delete_one({"id": deal_id})
    await db.deals.delete_one({"id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Deal not found")
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# Insurance CRUD
# ═══════════════════════════════════════════════════════════════════

@router.get("/insurance")
async def list_insurance(user: dict = Depends(ensure_admin)):
    items = await db.insurance_config.find({}, {"_id": 0}).to_list(50)
    return {"items": items, "count": len(items)}


@router.post("/insurance")
async def create_insurance(item: InsuranceCreate, user: dict = Depends(ensure_admin)):
    doc = {
        **item.model_dump(),
        "id": f"ins-{ObjectId()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email", "admin"),
    }
    await db.insurance_config.insert_one(doc)
    await db.insurance.insert_one({k: v for k, v in doc.items() if k != "_id"})
    return {"ok": True, "item": {k: v for k, v in doc.items() if k != "_id"}}


@router.delete("/insurance/{item_id}")
async def delete_insurance(item_id: str, user: dict = Depends(ensure_admin)):
    result = await db.insurance_config.delete_one({"id": item_id})
    await db.insurance.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Insurance item not found")
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# Housing CRUD
# ═══════════════════════════════════════════════════════════════════

@router.get("/housing")
async def list_housing(user: dict = Depends(ensure_admin)):
    items = await db.housing_config.find({}, {"_id": 0}).to_list(50)
    return {"items": items, "count": len(items)}


@router.post("/housing")
async def create_housing(item: HousingCreate, user: dict = Depends(ensure_admin)):
    doc = {
        **item.model_dump(),
        "id": f"h-{ObjectId()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email", "admin"),
    }
    await db.housing_config.insert_one(doc)
    await db.housing.insert_one({k: v for k, v in doc.items() if k != "_id"})
    return {"ok": True, "item": {k: v for k, v in doc.items() if k != "_id"}}


@router.delete("/housing/{item_id}")
async def delete_housing(item_id: str, user: dict = Depends(ensure_admin)):
    result = await db.housing_config.delete_one({"id": item_id})
    await db.housing.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Housing item not found")
    return {"ok": True}
