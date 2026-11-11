"""
Microsoft Teams Integration
============================

Creates Teams meetings with:
- Seat limits / capacity control
- Registration form for non-logged-in users (email, phone, full name)
- Attendance tracking via Microsoft Graph API
- Webhook support for recording attendance

Credentials can be provided via:
1. Environment variables (MS_TEAMS_TENANT_ID, MS_TEAMS_CLIENT_ID, MS_TEAMS_CLIENT_SECRET)
2. Installed tool settings (via admin marketplace UI → installed_tools collection)

OAuth2 flow (client credentials): service-to-service
"""
from __future__ import annotations
import os
import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
import secrets
import logging

logger = logging.getLogger("studentalumni.teams")

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TENANT_ID = os.environ.get("MS_TEAMS_TENANT_ID", "")
CLIENT_ID = os.environ.get("MS_TEAMS_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("MS_TEAMS_CLIENT_SECRET", "")


async def _get_creds() -> Dict[str, str]:
    """Get Teams credentials from env vars or the installed_tools collection."""
    # Check env vars first (highest priority)
    if TENANT_ID and CLIENT_ID and CLIENT_SECRET:
        return {"tenant_id": TENANT_ID, "client_id": CLIENT_ID, "client_secret": CLIENT_SECRET}

    # Fall back to installed_tools collection
    try:
        from core.db import db
        tool = await db.installed_tools.find_one({"tool_id": "ms-teams", "status": "connected"})
        if tool and tool.get("credentials"):
            creds = tool["credentials"]
            return {
                "tenant_id": creds.get("tenant_id", ""),
                "client_id": creds.get("client_id", ""),
                "client_secret": creds.get("client_secret", ""),
            }
    except Exception as e:
        logger.debug(f"[teams] Could not fetch creds from installed_tools: {e}")
    return {}


async def teams_status() -> Dict[str, Any]:
    has_env = bool(TENANT_ID and CLIENT_ID and CLIENT_SECRET)
    has_tool = False
    if not has_env:
        try:
            from core.db import db
            tool = await db.installed_tools.find_one({"tool_id": "ms-teams", "status": "connected"})
            has_tool = bool(tool and tool.get("credentials"))
        except Exception:
            pass
    return {
        "ms_teams": "live" if (has_env or has_tool) else "not_configured",
        "tenant_id": bool(TENANT_ID),
        "client_id": bool(CLIENT_ID),
        "client_secret": bool(CLIENT_SECRET),
        "has_installed_tool": has_tool,
        "source": "env" if has_env else ("installed_tools" if has_tool else "none"),
    }


async def _get_app_token(creds: Optional[Dict[str, str]] = None) -> Optional[str]:
    """Get an app-only access token using client credentials flow."""
    c = creds or await _get_creds()
    tid = c.get("tenant_id", "")
    cid = c.get("client_id", "")
    secret = c.get("client_secret", "")
    if not (tid and cid and secret):
        return None

    token_url = f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/token"
    data = {
        "client_id": cid,
        "client_secret": secret,
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(token_url, data=data)
            if r.is_success:
                return r.json().get("access_token")
            logger.error(f"[teams] Token fetch failed: {r.status_code} {r.text}")
    except Exception as e:
        logger.error(f"[teams] Token fetch error: {e}")
    return None


async def create_teams_meeting(
    *,
    title: str,
    start_time: datetime,
    duration_minutes: int = 60,
    attendee_emails: List[str] | None = None,
    seat_limit: int | None = None,
    description: str = "",
    lobby_bypass: str = "everyone",
    allow_external: bool = True,
    who_can_meeting: str = "everyone",
    organizer_email: str | None = None,
) -> Dict[str, Any]:
    """Create a Microsoft Teams meeting via Graph API.

    Args:
        title: Meeting subject
        start_time: When the meeting starts (timezone-aware)
        duration_minutes: Meeting length
        attendee_emails: List of required attendee emails
        seat_limit: Maximum number of attendees (for registration form)
        description: Meeting description
        lobby_bypass: 'everyone' or 'organizer'
        allow_external: Whether external participants can join
        who_can_meeting: Who can bypass lobby
        organizer_email: The mailbox owner whose calendar the meeting is created in.
            Required when using app-only (client credentials) auth, because app-only
            tokens have no "me" calendar. Falls back to ``me/events`` when omitted.
    """
    creds = await _get_creds()
    token = await _get_app_token(creds)
    if not token:
        if creds.get("tenant_id") and creds.get("client_id") and creds.get("client_secret"):
            raise RuntimeError(
                "[teams] Credentials are configured but Microsoft rejected the token request. "
                "Check that the client secret is valid and Application API permissions "
                "include Calendars.ReadWrite + OnlineMeetings.ReadWrite with admin consent."
            )
        raise RuntimeError(
            "[teams] Microsoft Teams is not configured. Set MS_TEAMS_TENANT_ID, "
            "MS_TEAMS_CLIENT_ID and MS_TEAMS_CLIENT_SECRET (or connect the ms-teams "
            "tool from the admin marketplace) before creating Teams meetings."
        )

    end_time = start_time + timedelta(minutes=duration_minutes)

    # Display in IST (Asia/Kolkata) regardless of how start_time was tz-aware.
    ist = start_time.astimezone(timezone(timedelta(hours=5, minutes=30)))
    ist_end = end_time.astimezone(timezone(timedelta(hours=5, minutes=30)))

    body: Dict[str, Any] = {
        "subject": title,
        "body": {"contentType": "HTML", "content": description or title},
        "start": {
            "dateTime": ist.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": "Asia/Kolkata",
        },
        "end": {
            "dateTime": ist_end.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": "Asia/Kolkata",
        },
        "location": {"displayName": "Microsoft Teams Meeting"},
        "attendees": [
            {
                "emailAddress": {"address": e, "name": e.split("@")[0]},
                "type": "required",
            }
            for e in (attendee_emails or [])
        ],
        "isOnlineMeeting": True,
        "onlineMeetingProvider": "teamsForBusiness",
    }

    # App-only auth has no "me" calendar. Resolve the target user whose calendar
    # the event lands in: the requested organizer, else a default tenant admin.
    default_organizer = os.environ.get("MS_TEAMS_ORGANIZER_EMAIL", "admin@NETORGFT20701098.onmicrosoft.com")
    candidate_organizers = []
    if organizer_email:
        candidate_organizers.append(organizer_email)
    if not candidate_organizers or organizer_email != default_organizer:
        candidate_organizers.append(default_organizer)

    last_error: Optional[str] = None
    for org in candidate_organizers:
        if org == "me" or not org:
            continue
        events_url = f"{GRAPH_BASE}/users/{org}/events"
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.post(
                    events_url,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json=body,
                )
            if r.is_success:
                resp = r.json() or {}
                online = resp.get("onlineMeeting") or {}
                join_url = online.get("joinUrl") or resp.get("onlineMeetingUrl")
                if not join_url:
                    # Event was created but no Teams online-meeting join link was
                    # materialized (usually the app lacks OnlineMeetings permission
                    # or the organizer mailbox isn't Teams-enabled). Don't return a
                    # broken "meeting" — surface it clearly.
                    logger.error(f"[teams] Meeting created for '{org}' but no onlineMeeting joinUrl returned; full: {str(resp)[:400]}")
                    last_error = (
                        f"Graph created the calendar event for '{org}' but returned no Teams "
                        "join link (onlineMeeting was empty). The app is missing a Teams "
                        "OnlineMeeting permission or the organizer mailbox is not Teams-enabled."
                    )
                    continue
                return {
                    "success": True,
                    "meeting_id": resp.get("id"),
                    "join_url": join_url,
                    "subject": resp.get("subject"),
                    "start": (resp.get("start") or {}).get("dateTime"),
                    "end": (resp.get("end") or {}).get("dateTime"),
                    "attendees": [a.get("emailAddress", {}).get("address") for a in (resp.get("attendees") or [])],
                    "seat_limit": seat_limit,
                    "registrations": [],
                }
            logger.error(f"[teams] Meeting creation failed ({org}): {r.status_code} {r.text[:400]}")
            last_error = f"[teams] Graph rejected meeting creation for organizer '{org}' ({r.status_code}): {r.text[:300]}"
        except Exception as e:
            logger.error(f"[teams] Meeting creation error ({org}): {e}")
            last_error = f"[teams] Meeting creation error for organizer '{org}': {e}"

    # If the organizer email is invalid, surface a clear message with valid options.
    raise RuntimeError(
        f"Microsoft Teams could not create the meeting. {last_error or 'Unknown error.'} "
        "Make sure the Organizer email is a valid user on the studentalumni.ai tenant "
        "(e.g. hr@studentalumni.ai, admin@studentalumni.ai), not an external Gmail."
    )


async def get_meeting_attendance(meeting_id: str, attendee_email: str | None = None) -> List[Dict[str, Any]]:
    """Fetch attendance for a Teams meeting.

    Uses the Graph API meeting attendees report or attendance endpoint.
    """
    token = await _get_app_token()
    if not token:
        # Teams is not configured: no real attendance records exist. Never fabricate attendees.
        return []

    try:
        async with httpx.AsyncClient(timeout=15) as c:
            # Try attendance API first
            r = await c.get(
                f"{GRAPH_BASE}/communications/meetingAttendance/{meeting_id}/attendanceRecords",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.is_success:
                records = r.json().get("value", [])
                results = []
                for rec in records:
                    email = rec.get("attendee", {}).get("email", "")
                    if not attendee_email or email == attendee_email:
                        results.append({
                            "email": email,
                            "display_name": rec.get("attendee", {}).get("displayName", ""),
                            "join_time": rec.get("joinDateTime"),
                            "leave_time": rec.get("leaveDateTime"),
                            "duration_seconds": rec.get("totalAttendanceInSeconds", 0),
                        })
                return results

            # Fallback: try attendance reports
            r2 = await c.get(
                f"{GRAPH_BASE}/reports/getTeamsAttendanceActivityUserDetail(period='D7')",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r2.is_success:
                lines = r2.text.strip().split("\n")
                if len(lines) > 1:
                    import csv as _csv
                    reader = list(_csv.DictReader(lines))
                    results = []
                    for row in reader:
                        email = row.get("User Email", "")
                        if not attendee_email or email == attendee_email:
                            results.append({
                                "email": email,
                                "display_name": row.get("Display Name", ""),
                                "join_time": row.get("Join Time", ""),
                                "leave_time": row.get("Leave Time", ""),
                                "duration_minutes": int(row.get("Total Time (Minutes)", 0) or 0),
                            })
                    return results
    except Exception as e:
        logger.error(f"[teams] Attendance fetch error: {e}")

    return []


async def create_meeting_registration(
    *,
    meeting_id: str,
    db,
    full_name: str,
    email: str,
    phone: str | None = None,
    seat_limit: int | None = None,
) -> Dict[str, Any]:
    """Register a user for a Teams meeting with seat limit enforcement.

    If the user is not logged in, their details (email, phone, full name) are
    collected and stored. Seat limits are enforced.
    """
    # Check if meeting exists and get seat limit
    meeting = await db.teams_meetings.find_one({"meeting_id": meeting_id})
    if not meeting:
        return {"success": False, "error": "Meeting not found"}

    # Check seat limit
    current_count = len(meeting.get("registrations", []))
    configured_limit = seat_limit or meeting.get("seat_limit")
    if configured_limit and current_count >= configured_limit:
        return {"success": False, "error": "Meeting is at full capacity"}

    reg_id = secrets.token_hex(6)
    reg = {
        "reg_id": reg_id,
        "full_name": full_name,
        "email": email,
        "phone": phone or "",
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "status": "registered",
    }

    await db.teams_meetings.update_one(
        {"meeting_id": meeting_id},
        {"$push": {"registrations": reg}},
    )

    import base64
    from datetime import timedelta
    
    # Generate ICS
    start_time_str = meeting.get("start_time")
    if start_time_str:
        start_dt = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
    else:
        start_dt = datetime.now(timezone.utc)
        
    duration = int(meeting.get("duration_minutes", 60))
    end_dt = start_dt + timedelta(minutes=duration)
    
    dtstart = start_dt.strftime("%Y%m%dT%H%M%SZ")
    dtend = end_dt.strftime("%Y%m%dT%H%M%SZ")
    dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    
    subject = meeting.get("subject", "Teams Meeting")
    join_url = meeting.get("join_url", "")
    
    ics_text = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StudentAlumni//TeamsMeeting//EN
BEGIN:VEVENT
UID:{reg_id}@studentalumni.ai
DTSTAMP:{dtstamp}
DTSTART:{dtstart}
DTEND:{dtend}
SUMMARY:{subject}
DESCRIPTION:Join URL: {join_url}
URL:{join_url}
END:VEVENT
END:VCALENDAR
"""
    ics_b64 = base64.b64encode(ics_text.encode('utf-8')).decode('utf-8')

    # Send Email
    body_html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4F46E5;">Registration Confirmed</h2>
        <p>Hi {full_name},</p>
        <p>Your registration for <strong>{subject}</strong> is confirmed and your seat is reserved.</p>
        <p>Please find the meeting join link below, and the calendar invite attached to this email.</p>
        <br/>
        <p>
            <a href="{join_url}" style="padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Join on Microsoft Teams
            </a>
        </p>
        <br/>
        <p style="font-size: 13px; color: #888;">If you cannot click the button, use this URL: {join_url}</p>
    </div>
    """
    
    from core.email import send_email
    try:
        await send_email(
            email,
            f"Registration Confirmed: {subject}",
            body_html,
            attachments=[{"filename": "teams-meeting.ics", "content": ics_text.encode('utf-8')}]
        )
    except Exception as e:
        logger.error(f"[teams] Failed to send registration email to {email}: {e}")

    return {
        "success": True,
        "reg_id": reg_id,
        "meeting_id": meeting_id,
        "join_url": join_url,
        "full_name": full_name,
        "email": email,
        "ics": ics_b64,
        "ics_filename": "teams-meeting.ics"
    }


async def build_oauth_url(redirect_uri: str, state: str) -> str:
    """Build the Microsoft OAuth2 authorization URL."""
    c = await _get_creds()
    cid = c.get("client_id", "")
    tid = c.get("tenant_id", "")
    params = {
        "client_id": cid,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": "OnlineMeetings.ReadWrite AllUser.Read",
        "state": state,
    }
    return f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/authorize?{urlencode(params)}"


async def exchange_code_for_token(code: str, redirect_uri: str) -> Optional[str]:
    """Exchange OAuth2 authorization code for access token."""
    c = await _get_creds()
    client_id = c.get("client_id", "")
    client_secret = c.get("client_secret", "")
    tid = c.get("tenant_id", "")
    token_url = f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
        "scope": "OnlineMeetings.ReadWrite AllUser.Read",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(token_url, data=data)
            if r.is_success:
                return r.json().get("access_token")
    except Exception as e:
        logger.error(f"[teams] Token exchange error: {e}")
    return None
