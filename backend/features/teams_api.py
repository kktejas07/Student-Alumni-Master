"""Microsoft Teams Meeting Endpoints. Extracted from server.py (architecture audit Step 4b)."""
import base64
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from core.email import send_email
from db import db
from server import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Microsoft Teams Meeting Endpoints ─────────────────────────────────────────
from integrations.teams import (
    teams_status as _teams_status, create_teams_meeting as _create_teams_meeting,
    get_meeting_attendance as _get_attendance, create_meeting_registration as _register,
    build_oauth_url as _oauth_url, exchange_code_for_token as _exchange_code,
    _get_app_token as _get_teams_token, _get_creds as _get_teams_creds,
)

class TeamsMeetingCreate(BaseModel):
    title: str
    start_time: str
    duration_minutes: int = 60
    attendee_emails: Optional[List[str]] = None
    seat_limit: Optional[int] = None
    description: Optional[str] = ""
    lobby_bypass: str = "everyone"
    allow_external: bool = True
    event_slug: Optional[str] = None
    organizer_email: Optional[str] = None
    manual_join_url: Optional[str] = None

class TeamsMeetingRegister(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None

@router.post("/integrations/teams/oauth-url")
async def teams_oauth_url():
    """Get OAuth URL + state for Microsoft OAuth2 flow."""
    import secrets as _secrets
    creds = await _get_teams_creds()
    if not (creds.get("tenant_id") and creds.get("client_id")):
        raise HTTPException(400, "Microsoft Teams integration not configured. Install it from the marketplace first.")
    state = _secrets.token_urlsafe(32)
    redirect_uri = os.environ.get("MS_TEAMS_REDIRECT_URI", "https://studentalumni.ai/api/integrations/teams/callback")
    auth_url = await _oauth_url(redirect_uri, state)
    return {"auth_url": auth_url, "state": state, "redirect_uri": redirect_uri}


@router.get("/integrations/teams/callback")
async def teams_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    """Handle the Microsoft OAuth2 authorization-code callback (browser redirect).

    Note: Teams meeting creation uses app-only client-credentials auth and does not
    require this code exchange, but the URL must exist so Azure's redirect doesn't 404.
    """
    if error:
        return {"error": f"OAuth error: {error}"}
    if not code:
        return {"error": "Missing authorization code"}
    redirect_uri = os.environ.get("MS_TEAMS_REDIRECT_URI", "https://studentalumni.ai/api/integrations/teams/callback")
    try:
        token = await _exchange_code(code, redirect_uri)
    except Exception as e:  # noqa: BLE001
        token = None
        logger.warning(f"[teams] OAuth token exchange failed: {e}")
    return {"status": "connected" if token else "error", "state": state}


@router.post("/integrations/teams/meetings")
async def create_teams_meeting_endpoint(payload: TeamsMeetingCreate, user: dict = Depends(get_current_user)):
    """Create a Microsoft Teams meeting with seat limits and registration support."""
    if user.get("role") not in ("admin", "super_admin", "organizer"):
        raise HTTPException(403, "Access required")
    from datetime import datetime as _dt
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
    raw = (payload.start_time or "").strip()
    try:
        if raw:
            # Frontend sends a "wall clock" time in IST (e.g. "2026-09-01T09:00")
            parsed = _dt.fromisoformat(raw.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=IST)
            else:
                parsed = parsed.astimezone(IST)
            start_dt = parsed
        else:
            start_dt = _dt.now(IST)
    except (ValueError, AttributeError):
        start_dt = _dt.now(IST)

    manual_join_url = (payload.manual_join_url or "").strip()

    if manual_join_url:
        # Admin supplies a pre-created Teams/Skype join link manually, so no
        # Microsoft Graph call is needed (avoids the OnlineMeeting application
        # access policy requirement). Store the meeting directly with that link.
        meeting = {
            "success": True,
            "meeting_id": f"teams-manual-{secrets.token_hex(6)}",
            "subject": payload.title,
            "join_url": manual_join_url,
            "start": start_dt.isoformat(),
            "end": (start_dt + timedelta(minutes=payload.duration_minutes)).isoformat(),
            "attendees": payload.attendee_emails or [],
            "seat_limit": payload.seat_limit,
            "registrations": [],
            "manual": True,
        }
    else:
        try:
            meeting = await _create_teams_meeting(
                title=payload.title,
                start_time=start_dt,
                duration_minutes=payload.duration_minutes,
                attendee_emails=payload.attendee_emails or [],
                seat_limit=payload.seat_limit,
                description=payload.description or "",
                lobby_bypass=payload.lobby_bypass,
                allow_external=payload.allow_external,
                organizer_email=(payload.organizer_email or "").strip() or None,
            )
        except RuntimeError as e:
            logger.error(f"[teams] create endpoint: {e}")
            raise HTTPException(502, f"Could not create Teams meeting: {str(e)}")

    meeting_doc = {
        "meeting_id": meeting["meeting_id"],
        "subject": meeting["subject"],
        "join_url": meeting.get("join_url"),
        "start_time": start_dt.isoformat(),
        "duration_minutes": payload.duration_minutes,
        "seat_limit": payload.seat_limit,
        "attendee_emails": payload.attendee_emails or [],
        "event_slug": (payload.event_slug or "").strip() or None,
        "organizer_email": (payload.organizer_email or "").strip() or None,
        "description": payload.description or "",
        "created_by": str(user.get("_id", "")),
        "created_at": _dt.now(timezone.utc).isoformat(),
        "is_mock": meeting.get("mock", False),
        "manual": meeting.get("manual", False),
        "registrations": [],
    }
    await db.teams_meetings.insert_one(meeting_doc)
    return meeting


@router.get("/integrations/teams/meetings")
async def list_teams_meetings(user: dict = Depends(get_current_user), event_slug: Optional[str] = None):
    """List all Teams meetings (admin only). Optionally filter by event_slug."""
    if user.get("role") not in ("admin", "super_admin", "organizer"):
        raise HTTPException(403, "Access required")
    query = {}
    if event_slug:
        query["event_slug"] = event_slug
    cursor = db.teams_meetings.find(query).sort("created_at", -1)
    meetings = []
    async for m in cursor:
        m["_id"] = str(m["_id"])
        meetings.append(m)
    return {"meetings": meetings, "status": await _teams_status()}


@router.get("/integrations/teams/meetings/event/{event_slug}")
async def get_teams_meetings_for_event(event_slug: str):
    """Get Teams meetings associated with a specific event (public)."""
    cursor = db.teams_meetings.find({"event_slug": event_slug}).sort("start_time", 1)
    meetings = []
    async for m in cursor:
        m["_id"] = str(m["_id"])
        meetings.append(m)
    return {"meetings": meetings}


async def _add_teams_attendee(meeting: dict, attendee_email: str, display_name: str = ""):
    """Best-effort add of an attendee to the real Teams meeting via Graph.

    App-only tokens have no "me" calendar, so if an organizer email is known the
    attendee is added against that user's event. Failures are logged, never thrown.
    """
    if not attendee_email or meeting.get("is_mock"):
        return
    org = (meeting.get("organizer_email") or "").strip()
    if not org:
        return
    try:
        creds = await _get_teams_creds()
        token = await _get_teams_token(creds)
        if not token:
            return
        event_id = meeting.get("meeting_id") or ""
        url = f"https://graph.microsoft.com/v1.0/users/{org}/events/{event_id}"
        existing = meeting.get("attendee_emails") or []
        payload = {
            "attendees": [
                {"emailAddress": {"address": a, "name": a}, "type": "required"}
                for a in list(existing) + [attendee_email]
            ]
        }
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.patch(url, headers={"Authorization": f"Bearer {token}"}, json=payload)
            if not r.is_success:
                logger.warning(f"[teams] add attendee failed {r.status_code}: {r.text[:300]}")
    except Exception as e:
        logger.warning(f"[teams] add attendee error for {attendee_email}: {e}")


def _format_ics_datetime(dt_str: str) -> str:
    """Format an ISO datetime for an .ics file as a UTC (Z) timestamp."""
    try:
        from datetime import datetime as _pdt
        dt = _pdt.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            from zoneinfo import ZoneInfo
            dt = dt.replace(tzinfo=ZoneInfo("Asia/Kolkata"))
        dt_utc = dt.astimezone(timezone.utc)
        return dt_utc.strftime("%Y%m%dT%H%M%SZ")
    except (ValueError, TypeError):
        return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _build_meeting_ics(meeting: dict) -> str:
    """Build an RFC-5545 .ics calendar invitation for a Teams meeting."""
    subject = (meeting.get("subject") or "Teams Meeting").replace("\\", "\\\\").replace("\n", "\\n")
    desc = (meeting.get("description") or "").replace("\\", "\\\\").replace("\n", "\\n")
    start = _format_ics_datetime(meeting.get("start_time", ""))
    end = _format_ics_datetime(meeting.get("_ics_end", "")) or _format_ics_datetime(meeting.get("start_time", ""))
    join_url = meeting.get("join_url") or ""
    meeting_id = meeting.get("meeting_id") or "teams-meeting"
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    organizer = meeting.get("organizer_email") or "meetings@studentalumni.ai"
    body = desc
    if join_url:
        body = (body + ("\n\n" if body else "") + f"Join the meeting: {join_url}")
    _escaped_body = body.replace("\r\n", "\\n").replace("\n", "\\n")
    _escaped_desc = _escaped_body
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Student Alumni//Teams Meeting//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{meeting_id}@studentalumni.ai",
        f"DTSTAMP:{now}",
        f"DTSTART:{start}",
        f"DTEND:{end}",
        f"SUMMARY:{subject}",
        f"DESCRIPTION:{_escaped_desc}",
        "LOCATION:Microsoft Teams",
        f"ORGANIZER;CN={organizer}:mailto:{organizer}",
        "ATTENDEE;CN=Participant;RSVP=TRUE:mailto:",
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        f"DESCRIPTION:Reminder: {subject}",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"


@router.post("/integrations/teams/meetings/{meeting_id}/register")
async def register_for_teams_meeting(meeting_id: str, payload: dict):
    """Register a user for a Teams meeting and return the join URL.

    On successful registration the attendee is added to the meeting's attendee
    list in Microsoft and emailed an .ics calendar invitation so the meeting
    appears in their calendar with the join link.
    """
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    full_name = payload.get("full_name", "")
    email = payload.get("email", "")
    phone = payload.get("phone", "")
    if not full_name or not email:
        raise HTTPException(400, "Full name and email are required")
    registrations = meeting.get("registrations", [])
    existing = next((r for r in registrations if r.get("email") == email), None)
    if existing:
        return {"success": True, "join_url": meeting.get("join_url"), "already_registered": True, "ics_url": meeting.get("ics_url")}
    seat_limit = meeting.get("seat_limit", 0)
    if seat_limit and len(registrations) >= seat_limit:
        raise HTTPException(400, "Meeting is full")
    registrations.append({
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.teams_meetings.update_one({"meeting_id": meeting_id}, {"$set": {"registrations": registrations}})

    # 1. Add attendee to the real Teams meeting (best-effort, non-blocking)
    await _add_teams_attendee(meeting, email, full_name)

    # 2. Build + serve an .ics invite and email it to the attendee
    try:
        from datetime import datetime as _edt
        _st = _edt.fromisoformat(meeting.get("start_time", "").replace("Z", "+00:00"))
        if _st.tzinfo is None:
            from zoneinfo import ZoneInfo as _ZI
            _st = _st.replace(tzinfo=_ZI("Asia/Kolkata"))
        _end = _st + timedelta(minutes=int(meeting.get("duration_minutes") or 60))
        meeting = dict(meeting, _ics_end=_end.isoformat())
    except (ValueError, TypeError, AttributeError):
        pass
    ics = _build_meeting_ics(meeting)
    ics_filename = f"teams-meeting-{meeting_id}.ics"
    ics_content = base64.b64encode(ics.encode("utf-8")).decode("utf-8")

    # Email the .ics to the attendee (best-effort)
    email_sent = False
    try:
        subject_line = f"Meeting Invitation: {meeting.get('subject') or 'Teams Meeting'}"
        join_line = f'<a href="{meeting.get("join_url")}">Join the meeting</a>' if meeting.get("join_url") else ""
        body_html = (
            f"<p>Hi {full_name},</p>"
            f"<p>You are registered for <b>{meeting.get('subject') or 'this Teams meeting'}</b>.</p>"
            f"<p>The calendar invitation is attached. Add it to your calendar to see the event and join link.</p>"
            f"{join_line and ('<p>' + join_line + '</p>') or ''}"
        )
        email_sent = await send_email(
            to_email=email,
            subject=subject_line,
            body_html=body_html,
            attachments=[{"filename": ics_filename, "content": ics.encode("utf-8")}],
        )
    except Exception as e:
        logger.warning(f"[teams] Could not email calendar invite to {email}: {e}")

    ics_url = f"/api/integrations/teams/meetings/{meeting_id}/calendar.ics?u={secrets.token_urlsafe(6)}"
    return {
        "success": True,
        "join_url": meeting.get("join_url"),
        "ics": ics_content,
        "ics_filename": ics_filename,
        "ics_url": ics_url,
        "email_sent": email_sent,
    }


@router.get("/integrations/teams/meetings/{meeting_id}/calendar.ics")
async def get_teams_meeting_ics(meeting_id: str):
    """Return the .ics calendar invite for a Teams meeting (for adding to a calendar)."""
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    try:
        from datetime import datetime as _edt
        _st = _edt.fromisoformat(meeting.get("start_time", "").replace("Z", "+00:00"))
        if _st.tzinfo is None:
            from zoneinfo import ZoneInfo as _ZI
            _st = _st.replace(tzinfo=_ZI("Asia/Kolkata"))
        _end = _st + timedelta(minutes=int(meeting.get("duration_minutes") or 60))
        meeting = dict(meeting, _ics_end=_end.isoformat())
    except (ValueError, TypeError, AttributeError):
        pass
    ics = _build_meeting_ics(meeting)
    return Response(
        content=ics,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="teams-meeting-{meeting_id}.ics"',
        },
    )


@router.get("/integrations/teams/meetings/{meeting_id}")
async def get_teams_meeting(meeting_id: str):
    """Get a Teams meeting by ID."""
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    meeting["_id"] = str(meeting["_id"])
    return meeting


@router.delete("/integrations/teams/meetings/{meeting_id}")
async def delete_teams_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    """Delete a Teams meeting (admin only)."""
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    result = await db.teams_meetings.delete_one({"meeting_id": meeting_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Meeting not found")
    return {"ok": True, "message": "Meeting deleted"}


@router.patch("/integrations/teams/meetings/{meeting_id}")
async def update_teams_meeting(meeting_id: str, payload: TeamsMeetingCreate, user: dict = Depends(get_current_user)):
    """Update a Teams meeting (admin only). Only updates DB metadata — the Teams
    meeting itself is not synced to Microsoft unless a live token is available."""
    if user.get("role") not in ("admin", "super_admin", "organizer"):
        raise HTTPException(403, "Admin access required")
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    try:
        from zoneinfo import ZoneInfo
        IST = ZoneInfo("Asia/Kolkata")
        raw = (payload.start_time or "").strip()
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00")) if raw else datetime.now(IST)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=IST)
        else:
            parsed = parsed.astimezone(IST)
        start_dt = parsed
    except Exception:
        start_dt = datetime.now(timezone.utc)

    update_data = {
        "subject": payload.title,
        "start_time": start_dt.isoformat(),
        "duration_minutes": payload.duration_minutes,
        "seat_limit": payload.seat_limit,
        "attendee_emails": payload.attendee_emails or [],
        "description": payload.description,
        "event_slug": (payload.event_slug or "").strip() or None,
        "organizer_email": (payload.organizer_email or "").strip() or None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": str(user.get("_id", "")),
    }

    manual_join_url = (payload.manual_join_url or "").strip()
    if manual_join_url:
        update_data["join_url"] = manual_join_url
        update_data["manual"] = True
        update_data["is_mock"] = False

    # If Teams API is live, also update the meeting in Microsoft
    creds = await _get_teams_creds()
    if creds.get("tenant_id") and creds.get("client_id") and creds.get("client_secret") and meeting.get("meeting_id") and not meeting.get("is_mock"):
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                token = await _get_teams_token(creds)
                if token:
                    org = (payload.organizer_email or meeting.get("organizer_email") or "").strip()
                    event_url = f"https://graph.microsoft.com/v1.0/users/{org}/events/{meeting['meeting_id']}" if org else f"https://graph.microsoft.com/v1.0/me/events/{meeting['meeting_id']}"
                    await c.patch(
                        event_url,
                        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                        json={
                            "subject": payload.title,
                            "body": {"contentType": "HTML", "content": payload.description or ""},
                            "start": {"dateTime": start_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "Asia/Kolkata"},
                            "end": {"dateTime": (start_dt + timedelta(minutes=payload.duration_minutes)).strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "Asia/Kolkata"},
                        },
                    )
        except Exception:
            pass  # Don't fail the local update if Graph API call fails

    await db.teams_meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": update_data},
    )

    updated = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/integrations/teams/meetings/{meeting_id}/attendance")
async def get_teams_attendance(meeting_id: str, email: Optional[str] = None):
    """Get attendance for a Teams meeting."""
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    records = await _get_attendance(meeting_id, email)
    return {"meeting_id": meeting_id, "attendance": records}


@router.get("/integrations/teams/webhook")
async def teams_webhook_verify(request: Request, validationToken: Optional[str] = None):
    """Microsoft Graph change-notification handshake verification.

    When you set this URL as a Graph subscription notification endpoint, Microsoft
    calls it with ``?validationToken=...`` first. Return the token verbatim to
    confirm ownership of the URL.
    """
    if validationToken:
        return Response(content=validationToken, media_type="text/plain")
    return {"status": "ok"}


@router.post("/integrations/teams/webhook")
async def teams_webhook(request: Request):
    """Receive Microsoft Graph change notifications (e.g. meeting attendance).

    Graph expects a 202 response quickly. We log the notification for later
    processing; attendee records are pulled on demand via the attendance endpoint.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}
    logger.info(f"[teams] webhook notification: {body.get('value') if isinstance(body, dict) else body}")
    return Response(status_code=202)


@router.get("/integrations/teams/status")
async def teams_integration_status():
    """Check if Microsoft Teams integration is configured."""
    return await _teams_status()
