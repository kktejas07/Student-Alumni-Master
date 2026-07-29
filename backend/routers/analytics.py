from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from bson import ObjectId

from core.db import db
from core.deps import get_current_user
from analytics import get_analytics_for, super_admin_analytics, college_analytics, mentor_analytics
from personalization import track_module_click

router = APIRouter()

@router.get("/analytics")
async def analytics_dispatcher(user: dict = Depends(get_current_user)):
    """Returns the analytics payload appropriate for the caller's role.
    Admin/super_admin -> platform-wide. College -> their institution. Mentor -> their bookings."""
    return await get_analytics_for(db, user)


@router.get("/analytics/super-admin")
async def analytics_super_admin(user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Super admin access required")
    return await super_admin_analytics(db, include_revenue=True)


@router.get("/analytics/admin")
async def analytics_admin_endpoint(user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    return await super_admin_analytics(db, include_revenue=False)


@router.get("/analytics/college")
async def analytics_college_endpoint(user: dict = Depends(get_current_user),
                                      institution_name: Optional[str] = None):
    if user["role"] not in ("college", "admin", "super_admin"):
        raise HTTPException(403, "College / admin access required")
    inst = institution_name or (user.get("school_info") or {}).get("institution_name") or user.get("full_name")
    return await college_analytics(db, inst)


@router.get("/analytics/mentor")
async def analytics_mentor_endpoint(user: dict = Depends(get_current_user),
                                     mentor_id: Optional[str] = None):
    if user["role"] in ("admin", "super_admin") and mentor_id:
        return await mentor_analytics(db, mentor_id)
    if user["role"] != "mentor":
        raise HTTPException(403, "Mentor access required")
    return await mentor_analytics(db, str(user["_id"]))
