"""External API Integrations — Coursera / Udemy / Adzuna. Extracted from server.py (architecture audit Step 4b)."""
from fastapi import APIRouter, Depends, HTTPException

from db import db
from features.integrations_base import (
    fetch_adzuna_internships,
    fetch_coursera_courses,
    fetch_udemy_courses,
    integrations_status,
    sync_courses_to_db,
    sync_internships_to_db,
)
from server import get_current_user

router = APIRouter()

# ----------------------------------------------------------------------------
# External API Integrations — Coursera / Udemy / Adzuna
# Mock-mode by default; real-mode activates when env vars are set.
# ----------------------------------------------------------------------------
@router.get("/integrations/status")
async def get_integrations_status():
    """Returns which integrations are running in 'live' vs 'mock' mode."""
    return integrations_status()


@router.get("/integrations/courses")
async def integrations_courses(query: str = "computer science", limit: int = 10):
    """Live fetch of courses from Coursera + Udemy (mock fallback if no keys)."""
    coursera = await fetch_coursera_courses(query, limit)
    udemy = await fetch_udemy_courses(query, limit)
    return {"items": coursera + udemy, "status": integrations_status()}


@router.get("/integrations/internships")
async def integrations_internships(query: str = "internship", country: str = "in", limit: int = 10):
    items = await fetch_adzuna_internships(query, country, limit)
    return {"items": items, "status": integrations_status()}


@router.post("/integrations/sync/courses")
async def sync_courses(user: dict = Depends(get_current_user)):
    """Admin-only: pull Coursera + Udemy data into our courses collection."""
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    res = await sync_courses_to_db(db)
    return {"synced": res, "status": integrations_status()}


@router.post("/integrations/sync/internships")
async def sync_internships(user: dict = Depends(get_current_user)):
    """Admin-only: pull Adzuna data into our internships collection."""
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    res = await sync_internships_to_db(db)
    return {"synced": res, "status": integrations_status()}
