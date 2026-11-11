"""
calendar_sync.py — OAuth-based calendar integration (Google Calendar + Outlook).

Endpoints (all under /api/calendar):
    GET  /auth/google            — redirect to Google OAuth consent
    GET  /auth/google/callback   — handle Google OAuth callback
    GET  /auth/outlook           — redirect to Microsoft OAuth consent
    GET  /auth/outlook/callback  — handle Microsoft OAuth callback
    GET  /sync                   — fetch events from connected calendars
    POST /push                   — push an SA event to user's external calendar
    DELETE /disconnect/{provider} — remove OAuth tokens

Tokens are stored in the user document under `calendar_tokens`.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from core.db import db
from core.deps import get_current_user

logger = logging.getLogger("calendar_sync")
router = APIRouter(prefix="/calendar", tags=["calendar"])

# ─── OAuth configuration (from environment) ─────────────────────────
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CALENDAR_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_CALENDAR_REDIRECT_URI",
                                "https://studentalumni.ai/api/calendar/auth/google/callback")
GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events"

OUTLOOK_CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID", "")
OUTLOOK_CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET", "")
OUTLOOK_REDIRECT_URI = os.getenv("OUTLOOK_REDIRECT_URI",
                                 "https://studentalumni.ai/api/calendar/auth/outlook/callback")
OUTLOOK_SCOPES = "offline_access Calendars.ReadWrite"

BASE_URL = os.getenv("BASE_URL", "https://studentalumni.ai")


# ─── Request / Response models ──────────────────────────────────────
class PushEventRequest(BaseModel):
    provider: str  # "google" or "outlook"
    title: str
    start: str  # ISO 8601
    end: str  # ISO 8601
    description: Optional[str] = ""
    location: Optional[str] = ""


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: str
    source: str  # "google", "outlook", "sa"
    location: Optional[str] = ""
    description: Optional[str] = ""


# ─── Helper: refresh tokens ────────────────────────────────────────
async def _refresh_google_token(user_id: str, tokens: dict) -> Optional[str]:
    """Refresh a Google access token. Returns new access_token or None."""
    if not tokens.get("refresh_token"):
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": tokens["refresh_token"],
            "grant_type": "refresh_token",
        })
    if resp.status_code != 200:
        logger.warning("Google token refresh failed: %s", resp.text)
        return None
    data = resp.json()
    new_access = data.get("access_token")
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
    await db.users.update_one(
        {"_id": user_id} if not isinstance(user_id, str) else {"email": user_id},
        {"$set": {
            "calendar_tokens.google.access_token": new_access,
            "calendar_tokens.google.expires_at": expires_at.isoformat(),
        }},
    )
    return new_access


async def _refresh_outlook_token(user_id: str, tokens: dict) -> Optional[str]:
    """Refresh a Microsoft access token. Returns new access_token or None."""
    if not tokens.get("refresh_token"):
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data={
            "client_id": OUTLOOK_CLIENT_ID,
            "client_secret": OUTLOOK_CLIENT_SECRET,
            "refresh_token": tokens["refresh_token"],
            "grant_type": "refresh_token",
            "scope": OUTLOOK_SCOPES,
        })
    if resp.status_code != 200:
        logger.warning("Outlook token refresh failed: %s", resp.text)
        return None
    data = resp.json()
    new_access = data.get("access_token")
    new_refresh = data.get("refresh_token", tokens["refresh_token"])
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
    await db.users.update_one(
        {"email": user_id},
        {"$set": {
            "calendar_tokens.outlook.access_token": new_access,
            "calendar_tokens.outlook.refresh_token": new_refresh,
            "calendar_tokens.outlook.expires_at": expires_at.isoformat(),
        }},
    )
    return new_access


async def _get_valid_token(user: dict, provider: str) -> Optional[str]:
    """Get a valid access token, refreshing if expired."""
    tokens = (user.get("calendar_tokens") or {}).get(provider)
    if not tokens or not tokens.get("access_token"):
        return None
    expires_at = tokens.get("expires_at")
    if expires_at:
        exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00")) if isinstance(expires_at, str) else expires_at
        if exp < datetime.now(timezone.utc) + timedelta(minutes=5):
            # Token expired or expiring soon — refresh
            email = user.get("email", "")
            if provider == "google":
                return await _refresh_google_token(email, tokens)
            elif provider == "outlook":
                return await _refresh_outlook_token(email, tokens)
    return tokens["access_token"]


# ═══════════════════════════════════════════════════════════════════
# Google OAuth
# ═══════════════════════════════════════════════════════════════════

@router.get("/auth/google")
async def google_auth_redirect(user: dict = Depends(get_current_user)):
    """Redirect user to Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google Calendar integration not configured (missing GOOGLE_CALENDAR_CLIENT_ID)")
    state = user.get("email", "")
    params = urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/auth/google/callback")
async def google_auth_callback(code: str = Query(...), state: str = Query("")):
    """Handle Google OAuth callback and store tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
    if resp.status_code != 200:
        logger.error("Google token exchange failed: %s", resp.text)
        return RedirectResponse(f"{BASE_URL}/student/calendar?error=google_auth_failed")

    data = resp.json()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
    await db.users.update_one(
        {"email": state},
        {"$set": {
            "calendar_tokens.google": {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", ""),
                "expires_at": expires_at.isoformat(),
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }
        }},
    )
    return RedirectResponse(f"{BASE_URL}/student/calendar?connected=google")


# ═══════════════════════════════════════════════════════════════════
# Microsoft Outlook OAuth
# ═══════════════════════════════════════════════════════════════════

@router.get("/auth/outlook")
async def outlook_auth_redirect(user: dict = Depends(get_current_user)):
    """Redirect user to Microsoft OAuth consent screen."""
    if not OUTLOOK_CLIENT_ID:
        raise HTTPException(503, "Outlook Calendar integration not configured (missing OUTLOOK_CLIENT_ID)")
    state = user.get("email", "")
    params = urlencode({
        "client_id": OUTLOOK_CLIENT_ID,
        "redirect_uri": OUTLOOK_REDIRECT_URI,
        "response_type": "code",
        "scope": OUTLOOK_SCOPES,
        "state": state,
    })
    return RedirectResponse(f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?{params}")


@router.get("/auth/outlook/callback")
async def outlook_auth_callback(code: str = Query(...), state: str = Query("")):
    """Handle Microsoft OAuth callback and store tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://login.microsoftonline.com/common/oauth2/v2.0/token", data={
            "code": code,
            "client_id": OUTLOOK_CLIENT_ID,
            "client_secret": OUTLOOK_CLIENT_SECRET,
            "redirect_uri": OUTLOOK_REDIRECT_URI,
            "grant_type": "authorization_code",
            "scope": OUTLOOK_SCOPES,
        })
    if resp.status_code != 200:
        logger.error("Outlook token exchange failed: %s", resp.text)
        return RedirectResponse(f"{BASE_URL}/student/calendar?error=outlook_auth_failed")

    data = resp.json()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
    await db.users.update_one(
        {"email": state},
        {"$set": {
            "calendar_tokens.outlook": {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", ""),
                "expires_at": expires_at.isoformat(),
                "connected_at": datetime.now(timezone.utc).isoformat(),
            }
        }},
    )
    return RedirectResponse(f"{BASE_URL}/student/calendar?connected=outlook")


# ═══════════════════════════════════════════════════════════════════
# Sync + Push + Disconnect
# ═══════════════════════════════════════════════════════════════════

@router.get("/sync")
async def sync_calendars(
    days_ahead: int = Query(30, ge=1, le=90),
    user: dict = Depends(get_current_user),
):
    """Fetch events from all connected calendars and merge with SA events."""
    now = datetime.now(timezone.utc)
    time_min = now.isoformat() + "Z"
    time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"
    merged: List[dict] = []
    connected: Dict[str, bool] = {"google": False, "outlook": False}

    # ── Google Calendar events ──
    google_token = await _get_valid_token(user, "google")
    if google_token:
        connected["google"] = True
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers={"Authorization": f"Bearer {google_token}"},
                    params={"timeMin": time_min, "timeMax": time_max, "singleEvents": "true",
                            "orderBy": "startTime", "maxResults": "100"},
                )
            if resp.status_code == 200:
                for ev in resp.json().get("items", []):
                    start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date", "")
                    end = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date", "")
                    merged.append({
                        "id": ev.get("id", ""),
                        "title": ev.get("summary", "Untitled"),
                        "start": start,
                        "end": end,
                        "source": "google",
                        "location": ev.get("location", ""),
                        "description": ev.get("description", "")[:200],
                    })
        except Exception as exc:
            logger.warning("Google calendar sync error: %s", exc)

    # ── Outlook Calendar events ──
    outlook_token = await _get_valid_token(user, "outlook")
    if outlook_token:
        connected["outlook"] = True
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://graph.microsoft.com/v1.0/me/calendarview",
                    headers={"Authorization": f"Bearer {outlook_token}"},
                    params={"startDateTime": time_min, "endDateTime": time_max,
                            "$top": "100", "$orderby": "start/dateTime"},
                )
            if resp.status_code == 200:
                for ev in resp.json().get("value", []):
                    start = ev.get("start", {}).get("dateTime", "")
                    end = ev.get("end", {}).get("dateTime", "")
                    merged.append({
                        "id": ev.get("id", ""),
                        "title": ev.get("subject", "Untitled"),
                        "start": start,
                        "end": end,
                        "source": "outlook",
                        "location": (ev.get("location") or {}).get("displayName", ""),
                        "description": (ev.get("body") or {}).get("content", "")[:200],
                    })
        except Exception as exc:
            logger.warning("Outlook calendar sync error: %s", exc)

    # ── SA platform events ──
    try:
        sa_events = await db.events.find({}).limit(100).to_list(100)
        for ev in sa_events:
            start = ev.get("start_date") or ev.get("date", "")
            merged.append({
                "id": str(ev.get("_id", ev.get("id", ""))),
                "title": ev.get("title", "Event"),
                "start": str(start),
                "end": str(start),
                "source": "sa",
                "location": ev.get("venue", ev.get("location", "")),
                "description": "",
            })
    except Exception as exc:
        logger.warning("SA events query error: %s", exc)

    return {"events": merged, "connected": connected, "count": len(merged)}


@router.post("/push")
async def push_event(req: PushEventRequest, user: dict = Depends(get_current_user)):
    """Push an SA event to the user's external calendar."""
    token = await _get_valid_token(user, req.provider)
    if not token:
        raise HTTPException(400, f"{req.provider} calendar not connected or token expired")

    if req.provider == "google":
        body = {
            "summary": req.title,
            "start": {"dateTime": req.start, "timeZone": "UTC"},
            "end": {"dateTime": req.end, "timeZone": "UTC"},
            "description": req.description or "",
            "location": req.location or "",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=body,
            )
        if resp.status_code not in (200, 201):
            raise HTTPException(502, f"Google API error: {resp.status_code}")
        return {"ok": True, "event_id": resp.json().get("id")}

    elif req.provider == "outlook":
        body = {
            "subject": req.title,
            "start": {"dateTime": req.start, "timeZone": "UTC"},
            "end": {"dateTime": req.end, "timeZone": "UTC"},
            "body": {"contentType": "Text", "content": req.description or ""},
            "location": {"displayName": req.location or ""},
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://graph.microsoft.com/v1.0/me/events",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=body,
            )
        if resp.status_code not in (200, 201):
            raise HTTPException(502, f"Outlook API error: {resp.status_code}")
        return {"ok": True, "event_id": resp.json().get("id")}

    raise HTTPException(400, "Unsupported provider. Use 'google' or 'outlook'.")


@router.delete("/disconnect/{provider}")
async def disconnect_calendar(provider: str, user: dict = Depends(get_current_user)):
    """Remove OAuth tokens for a calendar provider."""
    if provider not in ("google", "outlook"):
        raise HTTPException(400, "Provider must be 'google' or 'outlook'")
    await db.users.update_one(
        {"email": user.get("email")},
        {"$unset": {f"calendar_tokens.{provider}": 1}},
    )
    return {"ok": True, "disconnected": provider}


@router.get("/status")
async def calendar_status(user: dict = Depends(get_current_user)):
    """Return which calendar providers are connected."""
    tokens = user.get("calendar_tokens") or {}
    return {
        "google": bool(tokens.get("google", {}).get("access_token")),
        "outlook": bool(tokens.get("outlook", {}).get("access_token")),
        "google_connected_at": (tokens.get("google") or {}).get("connected_at"),
        "outlook_connected_at": (tokens.get("outlook") or {}).get("connected_at"),
    }
