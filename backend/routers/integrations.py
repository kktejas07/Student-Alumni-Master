from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from bson import ObjectId

from core.db import db
from core.deps import get_current_user
from integrations_base import fetch_coursera_courses, fetch_udemy_courses, fetch_adzuna_internships, sync_courses_to_db, sync_internships_to_db, integrations_status
from integrations.teams import teams_status, create_teams_meeting, get_meeting_attendance, create_meeting_registration, build_oauth_url, exchange_code_for_token

import os, secrets
from urllib.parse import urlencode

router = APIRouter()

# ── Microsoft Teams Meeting Models ─────────────────────────────────────────────

class TeamsMeetingCreate(BaseModel):
    title: str
    start_time: str  # ISO datetime string
    duration_minutes: int = 60
    attendee_emails: Optional[List[str]] = None
    seat_limit: Optional[int] = None
    description: Optional[str] = ""
    lobby_bypass: str = "everyone"
    allow_external: bool = True

class TeamsMeetingRegister(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None

# ── Microsoft Teams Integration ────────────────────────────────────────────────

@router.get("/integrations/status")
async def get_integrations_status():
    """Returns which integrations are running in 'live' vs 'mock' mode."""
    return {**integrations_status(), **teams_status()}


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


# ── Microsoft Teams Meeting Endpoints ─────────────────────────────────────────

@router.post("/integrations/teams/meetings")
async def create_teams_meeting_endpoint(payload: TeamsMeetingCreate, user: dict = Depends(get_current_user)):
    """Create a Microsoft Teams meeting.

    - Seat limits are enforced at registration time
    - If Teams API is not configured, falls back to mock mode
    """
    if user["role"] not in ("admin", "super_admin", "organizer"):
        raise HTTPException(403, "Access required")

    try:
        start_dt = datetime.fromisoformat(payload.start_time.replace("Z", "+00:00"))
    except ValueError:
        start_dt = datetime.now(timezone.utc)

    meeting = await create_teams_meeting(
        title=payload.title,
        start_time=start_dt,
        duration_minutes=payload.duration_minutes,
        attendee_emails=payload.attendee_emails or [],
        seat_limit=payload.seat_limit,
        description=payload.description or "",
        lobby_bypass=payload.lobby_bypass,
        allow_external=payload.allow_external,
    )

    # Store meeting in DB for attendance tracking and registration
    meeting_doc = {
        "meeting_id": meeting["meeting_id"],
        "subject": meeting["subject"],
        "join_url": meeting.get("join_url"),
        "start_time": start_dt.isoformat(),
        "duration_minutes": payload.duration_minutes,
        "seat_limit": payload.seat_limit,
        "attendee_emails": payload.attendee_emails or [],
        "created_by": str(user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_mock": meeting.get("mock", False),
        "registrations": [],
    }
    await db.teams_meetings.insert_one(meeting_doc)

    return meeting


@router.get("/integrations/teams/meetings")
async def list_teams_meetings(user: dict = Depends(get_current_user)):
    """List all Teams meetings (admin only)."""
    if user["role"] not in ("admin", "super_admin", "organizer"):
        raise HTTPException(403, "Access required")
    cursor = db.teams_meetings.find({}).sort("created_at", -1)
    meetings = []
    async for m in cursor:
        m["_id"] = str(m["_id"])
        meetings.append(m)
    return {"meetings": meetings, "status": teams_status()}


@router.get("/integrations/teams/meetings/{meeting_id}")
async def get_teams_meeting(meeting_id: str):
    """Get a Teams meeting by ID."""
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    meeting["_id"] = str(meeting["_id"])
    return meeting


@router.post("/integrations/teams/meetings/{meeting_id}/register")
async def register_for_teams_meeting(meeting_id: str, payload: TeamsMeetingRegister):
    """Register for a Teams meeting (public endpoint for non-logged-in users).

    Collects full name, email, and phone number. Enforces seat limits.
    """
    result = await create_meeting_registration(
        meeting_id=meeting_id,
        db=db,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        seat_limit=None,
    )
    if not result["success"]:
        raise HTTPException(400, result["error"])
    return result


@router.get("/integrations/teams/meetings/{meeting_id}/attendance")
async def get_teams_attendance(meeting_id: str, email: Optional[str] = None):
    """Get attendance for a Teams meeting.

    Optionally filter by email to check if a specific user attended.
    """
    # First check if it's a mock meeting
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    records = await get_meeting_attendance(meeting_id, email)
    return {"meeting_id": meeting_id, "attendance": records}


@router.get("/integrations/teams/oauth")
async def teams_oauth_redirect():
    """Start the Microsoft OAuth2 flow for Teams integration."""
    state = secrets.token_urlsafe(32)
    redirect_uri = os.environ.get("MS_TEAMS_REDIRECT_URI", "https://studentalumni.ai/api/integrations/teams/callback")
    auth_url = build_oauth_url(redirect_uri, state)
    # Store state in a temporary cookie or return it for frontend handling
    return JSONResponse({
        "auth_url": auth_url,
        "state": state,
        "redirect_uri": redirect_uri,
    })


@router.get("/integrations/teams/callback")
async def teams_oauth_callback(code: str, state: str, error: Optional[str] = None):
    """Handle Microsoft OAuth2 callback."""
    if error:
        raise HTTPException(400, f"OAuth error: {error}")

    redirect_uri = os.environ.get("MS_TEAMS_REDIRECT_URI", "https://studentalumni.ai/api/integrations/teams/callback")
    token = await exchange_code_for_token(code, redirect_uri)
    if not token:
        raise HTTPException(400, "Failed to exchange code for token")

    return {"access_token": token, "status": "connected"}


@router.delete("/integrations/teams/meetings/{meeting_id}")
async def delete_teams_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    """Delete a Teams meeting (admin only)."""
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    result = await db.teams_meetings.delete_one({"meeting_id": meeting_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Meeting not found")
    return {"ok": True, "message": "Meeting deleted"}


@router.get("/integrations/teams/status")
async def teams_integration_status():
    """Check if Microsoft Teams integration is configured."""
    return teams_status()
