"""
talent_interviews.py — TP32: interview scheduling for the Talent Pool suite.

Creates a real calendar event on the organizer's calendar and produces a
structured-ics invite:

  1. Google Calendar   — service-account credentials (installed_tools
                         tool_id="calendar_gcal": {client_email, private_key,
                         token_uri}) or env TALENT_GCAL_CLIENT_EMAIL /
                         TALENT_GCAL_PRIVATE_KEY (PEM) / TALENT_GCAL_TOKEN_URI.
  2. Microsoft 365     — app-only client credentials (tool_id="calendar_ms365":
                         {tenant_id, client_id, client_secret}) via msal →
                         Graph /users/{organizer}/events. Env fallbacks
                         TALENT_M365_TENANT / TALENT_M365_CLIENT_ID /
                         TALENT_M365_CLIENT_SECRET.
  3. ICS fallback      — if no calendar backend is configured (or both fail),
                         a valid RFC-5545 .ics file is generated and emailed
                         with core.email.send_email; the bytes are returned so
                         the caller can offer a download too.

Every interview row lands in db.talent_interviews and the candidate moves
talent_pool.interest_status to "Interviewing". record_interview_feedback then
closes the loop: "Selected" / "Rejected" updates interest_status and writes
an interview_feedback doc + activity-log entry.

Honest-by-default: with no credentials the agent degrades to ICS and says so
explicitly in the response — it never claims a calendar event was created.
"""
from __future__ import annotations

import base64
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from services.agents.talent_common import agent_run_log, import_optional, log_activity, now_utc

logger = logging.getLogger("talent_interviews")

_AGENT = "TP32_interviews"


def _ical_escape(s: str) -> str:
    return (
        str(s or "")
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def build_ics_event(
    start: datetime,
    duration_min: int,
    summary: str,
    description: str = "",
    location: str = "",
    organizer_email: str = "",
) -> str:
    """RFC-5545 VCALENDAR with a single VEVENT (UTC timestamps)."""
    start = start.astimezone(timezone.utc)
    end = start + timedelta(minutes=duration_min)
    fmt = "%Y%m%dT%H%M%S"
    uid = f"{uuid.uuid4()}@student-alumni"
    stamp = now_utc().strftime(fmt)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StudentAlumni//TalentPool//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{stamp}",
        f"DTSTART:{start.strftime(fmt)}Z",
        f"DTEND:{end.strftime(fmt)}Z",
        f"SUMMARY:{_ical_escape(summary)}",
        f"DESCRIPTION:{_ical_escape(description)}",
        f"LOCATION:{_ical_escape(location)}",
        "STATUS:CONFIRMED",
    ]
    if organizer_email:
        lines.append(f"ORGANIZER;CN=Talent Pool:mailto:{_ical_escape(organizer_email)}")
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(lines)


# ── credential resolution (installed_tools → env) ─────────────────


async def _tool_creds(db, tool_id: str) -> Dict[str, Any]:
    doc = await db.installed_tools.find_one({"tool_id": tool_id, "status": "connected"})
    return (doc or {}).get("credentials") or {}


def _gcal_creds(db_creds: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "client_email": str(db_creds.get("client_email") or os.environ.get("TALENT_GCAL_CLIENT_EMAIL") or "").strip(),
        "private_key": str(db_creds.get("private_key") or os.environ.get("TALENT_GCAL_PRIVATE_KEY") or "").strip(),
        "token_uri": str(db_creds.get("token_uri") or os.environ.get("TALENT_GCAL_TOKEN_URI") or "https://oauth2.googleapis.com/token").strip(),
    }


def _m365_creds(db_creds: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tenant_id": str(db_creds.get("tenant_id") or os.environ.get("TALENT_M365_TENANT") or "").strip(),
        "client_id": str(db_creds.get("client_id") or os.environ.get("TALENT_M365_CLIENT_ID") or "").strip(),
        "client_secret": str(db_creds.get("client_secret") or os.environ.get("TALENT_M365_CLIENT_SECRET") or "").strip(),
    }


# ── backend adapters ───────────────────────────────────────────────


def _gcal_backend_available(creds: Dict[str, Any]) -> bool:
    return bool(creds["client_email"] and creds["private_key"])


async def _create_gcal(
    db, creds: Dict[str, Any], organizer_email: str, event: Dict[str, Any],
) -> Dict[str, Any]:
    # googleapiclient is sync-only; run it off the event loop.
    import asyncio
    google_auth = import_optional("google.oauth2")
    googleapiclient = import_optional("googleapiclient")
    if not (google_auth and googleapiclient):
        raise RuntimeError("google-auth / google-api-python-client not installed")
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    def _sync_create():
        sc = service_account.Credentials.from_service_account_info(
            {"client_email": creds["client_email"], "private_key": creds["private_key"],
             "token_uri": creds["token_uri"]},
            scopes=["https://www.googleapis.com/auth/calendar.events"],
        )
        svc = build("calendar", "v3", credentials=sc, cache_discovery=False)
        return svc.events().insert(
            calendarId=organizer_email or "primary",
            body={
                "summary": event["summary"],
                "description": event.get("description", ""),
                "location": event.get("location", ""),
                "start": {"dateTime": event["start"].isoformat(), "timeZone": "UTC"},
                "end": {"dateTime": event["end"].isoformat(), "timeZone": "UTC"},
                "attendees": [{"email": e} for e in event.get("attendees", [])],
            },
            sendUpdates="all",
        ).execute()

    resp = await asyncio.to_thread(_sync_create)
    return {"calendar": "gcal", "event_id": resp.get("id"), "url": resp.get("htmlLink")}


async def _create_m365(
    db, creds: Dict[str, Any], organizer_email: str, event: Dict[str, Any],
) -> Dict[str, Any]:
    import httpx
    msal = import_optional("msal")
    if not msal:
        raise RuntimeError("msal not installed")
    app = msal.ConfidentialClientApplication(
        creds["client_id"], client_secret=creds["client_secret"],
        authority=f"https://login.microsoftonline.com/{creds['tenant_id']}",
    )
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    if "access_token" not in result:
        raise RuntimeError(f"m365 token failed: {result.get('error_description', result.get('error'))}")
    path = f"users/{organizer_email}/events" if organizer_email else "me/events"
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"https://graph.microsoft.com/v1.0/{path}",
            headers={"Authorization": f"Bearer {result['access_token']}"},
            json={
                "subject": event["summary"],
                "bodyPreview": event.get("description", ""),
                "location": {"displayName": event.get("location", "")},
                "start": {"dateTime": event["start"].isoformat(), "timeZone": "UTC"},
                "end": {"dateTime": event["end"].isoformat(), "timeZone": "UTC"},
                "attendees": [{"emailAddress": {"address": e}} for e in event.get("attendees", [])],
            },
        )
    if not resp.is_success:
        raise RuntimeError(f"m365 HTTP {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    return {"calendar": "ms365", "event_id": data.get("id"), "url": data.get("webLink")}


async def _ics_fallback(
    db, ics_text: str, invitee_email: Optional[str], subject: str,
) -> Dict[str, Any]:
    """Email the .ics invite via the house mailer; degrade gracefully if there
    is no address or SMTP is unconfigured — the .ics bytes are always returned
    so the UI can offer an attach/download instead."""
    ics_bytes = ics_text.encode("utf-8")
    emailed = False
    error: Optional[str] = None
    if not invitee_email or str(invitee_email).lower() in {"unknown", ""}:
        return {"calendar": "ics", "ics": ics_text, "ics_bytes_b64":
                base64.b64encode(ics_bytes).decode(), "emailed": False,
                "error": "no email address available — .ics attached to response only"}
    try:
        from core.email import send_email, render_html_email
        body = render_html_email(
            f"<h2>{_ical_escape(subject)}</h2>"
            "<p>An interview invite for the candidate has been scheduled. "
            "Open the attached .ics file to add it to your calendar.</p>"
        )
        await send_email(
            invitee_email, subject, body,
            attachments=[{"filename": "interview.ics", "content": ics_bytes}],
        )
        emailed = True
    except Exception as e:
        error = f"ics email failed: {type(e).__name__}: {e}"
        logger.warning(error)
    return {"calendar": "ics", "ics": ics_text, "ics_bytes_b64":
            base64.b64encode(ics_bytes).decode(), "emailed": emailed,
            "error": error}


# ── public API ─────────────────────────────────────────────────────


def _to_dt(v: Any, default_utc: datetime) -> datetime:
    if v is None:
        return default_utc
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(v))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return default_utc


async def create_interview(
    db,
    profile_id: str,
    start: Any,
    duration_min: int = 45,
    organizer_email: Optional[str] = None,
    invitee_email: Optional[str] = None,
    location: str = "",
    summary: Optional[str] = None,
    description: str = "",
    calendar: str = "auto",
    actor: str = "system",
) -> Dict[str, Any]:
    """Schedule one interview. `calendar` ∈ {"auto","gcal","ms365","ics"}.

    Writes db.talent_interviews + talent_pool.interest_status="Interviewing"
    and an activity-log entry. Returns {interview_id, backend, event_id?,
    url?, ics?, emailed?} and explicit errors when a backend is unavailable.
    """
    start_dt = _to_dt(start, now_utc() + timedelta(hours=1))
    end_dt = start_dt + timedelta(minutes=max(15, int(duration_min)))

    p = await db.talent_pool.find_one({"id": profile_id})
    if not p:
        try:
            from bson import ObjectId
            p = await db.talent_pool.find_one({"_id": ObjectId(profile_id)})
        except Exception:
            p = None
    if not p:
        return {"error": "profile not found"}

    full_name = p.get("full_name") or "candidate"
    title = summary or f"Interview — {full_name}"
    attendees: List[str] = [e for e in {organizer_email, invitee_email, p.get("email")}
                            if e and str(e).lower() != "unknown"]

    gcal_creds = _gcal_creds(await _tool_creds(db, "calendar_gcal"))
    m365_creds = _m365_creds(await _tool_creds(db, "calendar_ms365"))
    gcal_ok = _gcal_backend_available(gcal_creds)
    m365_ok = bool(m365_creds["tenant_id"] and m365_creds["client_id"] and m365_creds["client_secret"])

    if calendar == "auto":
        order: List[str] = [b for b in ("gcal", "ms365") if (b == "gcal" and gcal_ok) or (b == "ms365" and m365_ok)]
    else:
        order = [calendar]

    event = {"summary": title, "description": description, "location": location,
             "start": start_dt, "end": end_dt, "attendees": attendees}
    backend_used: Optional[str] = None
    event_id: Optional[str] = None
    url: Optional[str] = None
    ics_text: Optional[str] = None
    emailed = False
    errors: List[str] = []

    if order and order[0] != "ics":
        for b in order:
            if b == "gcal" and gcal_ok:
                try:
                    r = await _create_gcal(db, gcal_creds, organizer_email or "", event)
                    backend_used, event_id, url = r["calendar"], r["event_id"], r["url"]
                    break
                except Exception as e:
                    errors.append(f"gcal: {e}")
            elif b == "ms365" and m365_ok:
                try:
                    r = await _create_m365(db, m365_creds, organizer_email or "", event)
                    backend_used, event_id, url = r["calendar"], r["event_id"], r["url"]
                    break
                except Exception as e:
                    errors.append(f"ms365: {e}")
            else:
                errors.append(f"{b}: not configured")

    if backend_used is None:
        ics_text = build_ics_event(start_dt, max(15, int(duration_min)),
                                    title, description, location,
                                    organizer_email or invitee_email or "")
        fb = await _ics_fallback(db, ics_text, invitee_email or organizer_email,
                                 f"Interview invite: {full_name}")
        backend_used = "ics"
        emailed = fb["emailed"]
        ics_text = fb["ics"]
        errors.append(fb["error"] or "ics email skipped")

    row = {
        "id": f"ti_{uuid.uuid4().hex[:8]}",
        "profile_id": profile_id,
        "full_name": full_name,
        "calendar": backend_used,
        "event_id": event_id,
        "url": url,
        "start_at": start_dt,
        "end_at": end_dt,
        "organizer_email": organizer_email,
        "invitee_email": invitee_email,
        "status": "scheduled",
        "ics_emailed": emailed,
        "errors": errors,
        "created_by": actor,
        "created_at": now_utc(),
    }
    await db.talent_interviews.insert_one(row)

    await db.talent_pool.update_one(
        {"_id": p["_id"]},
        {"$set": {"interest_status": "Interviewing", "updated_at": now_utc()}},
    )
    await log_activity(db, actor, "Schedule", object_id=str(p.get("id") or p["_id"]),
                       summary=f"Interview scheduled via {backend_used} ({start_dt:%Y-%m-%d %H:%M} UTC)",
                       data={"interview_id": row["id"], "calendar": backend_used},
                       collection="talent_pool")
    await agent_run_log(
        db, _AGENT, "create", "SUCCESS",
        detail={"profile_id": profile_id, "backend": backend_used, "event_id": event_id,
                "errors": errors or None},
        error=None if (event_id or backend_used == "ics") else "; ".join(errors),
    )
    return {
        "interview_id": row["id"],
        "backend": backend_used,
        "event_id": event_id,
        "url": url,
        "start_at": start_dt.isoformat(),
        "end_at": end_dt.isoformat(),
        "ics": ics_text,
        "emailed": emailed,
        "errors": errors,
    }


async def record_interview_feedback(
    db,
    interview_id: str,
    decision: str,
    notes: str = "",
    rating: Optional[int] = None,
    actor: str = "system",
) -> Dict[str, Any]:
    """Close the loop: decision ∈ {"Selected","Rejected","Pending"}.

    - talent_pool.interest_status → "Selected"/"Rejected" (Pending leaves it "Interviewing")
    - db.interview_feedback: {interview_id, profile_id, decision, notes, rating}
    - activity log verb "InterviewFeedback"
    """
    row = await db.talent_interviews.find_one({"id": interview_id})
    if not row:
        return {"error": "interview not found"}
    profile_id = row.get("profile_id")
    p = await db.talent_pool.find_one({"id": profile_id})

    status_map = {"Selected": "Selected", "Rejected": "Rejected", "Pending": "Interviewing"}
    new_status = status_map.get(decision, "Interviewing")
    if p:
        await db.talent_pool.update_one(
            {"_id": p["_id"]},
            {"$set": {"interest_status": new_status, "updated_at": now_utc()}},
        )
    await db.talent_interviews.update_one(
        {"id": interview_id},
        {"$set": {"status": decision.lower(), "feedback_at": now_utc()}},
    )
    fb = {
        "interview_id": interview_id,
        "profile_id": profile_id,
        "decision": decision,
        "notes": notes,
        "rating": rating,
        "actor": actor,
        "at": now_utc(),
    }
    await db.interview_feedback.insert_one(fb)
    await log_activity(db, actor, "InterviewFeedback", object_id=profile_id,
                       summary=f"Interview {decision}" + (f" — {notes[:120]}" if notes else ""),
                       data={"interview_id": interview_id, "rating": rating},
                       collection="talent_pool")
    return {"interview_id": interview_id, "decision": decision,
            "interest_status": new_status, "recorded": True}


async def interview_list(db, profile_id: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
    q = {"profile_id": profile_id} if profile_id else {}
    rows = await db.talent_interviews.find(q).sort("created_at", -1).limit(limit).to_list(limit)
    for r in rows:
        r["start_at"] = r.get("start_at").isoformat() if r.get("start_at") else None
        r["end_at"] = r.get("end_at").isoformat() if r.get("end_at") else None
    return {"interviews": rows, "count": len(rows)}


# ── calendar sync helpers (TP23 step: verify events still exist) ──


def _gcal_event_exists_sync(creds: Dict[str, Any], organizer_email: str, event_id: str) -> bool:
    google_auth = import_optional("google.oauth2")
    googleapiclient = import_optional("googleapiclient")
    if not (google_auth and googleapiclient):
        raise RuntimeError("google-auth / google-api-python-client not installed")
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    sc = service_account.Credentials.from_service_account_info(
        {"client_email": creds["client_email"], "private_key": creds["private_key"],
         "token_uri": creds["token_uri"]},
        scopes=["https://www.googleapis.com/auth/calendar.events.readonly"],
    )
    svc = build("calendar", "v3", credentials=sc, cache_discovery=False)
    try:
        svc.events().get(calendarId=organizer_email or "primary", eventId=event_id).execute()
        return True
    except Exception:
        return False


async def _gcal_event_exists(db, creds: Dict[str, Any], organizer_email: str, event_id: str) -> bool:
    import asyncio
    return await asyncio.to_thread(_gcal_event_exists_sync, creds, organizer_email, event_id)


async def _m365_event_exists(db, creds: Dict[str, Any], organizer_email: str, event_id: str) -> bool:
    import httpx
    msal = import_optional("msal")
    if not msal:
        raise RuntimeError("msal not installed")
    app = msal.ConfidentialClientApplication(
        creds["client_id"], client_secret=creds["client_secret"],
        authority=f"https://login.microsoftonline.com/{creds['tenant_id']}",
    )
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    if "access_token" not in result:
        raise RuntimeError(f"m365 token failed: {result.get('error_description', result.get('error'))}")
    path = f"users/{organizer_email}/events/{event_id}" if organizer_email else f"me/events/{event_id}"
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"https://graph.microsoft.com/v1.0/{path}",
            headers={"Authorization": f"Bearer {result['access_token']}"},
        )
    return resp.is_success


async def calendar_sync(db, limit: int = 50) -> Dict[str, Any]:
    """Scheduler step (TP23): reconcile scheduled interviews against their
    calendar backends. For gcal/ms365 rows, verify the event still exists;
    for ICS rows there is nothing to verify. Writes backends errors into the
    interview doc and an agent_run_log row. No backend configured → idle."""
    gcal_creds = _gcal_creds(await _tool_creds(db, "calendar_gcal"))
    m365_creds = _m365_creds(await _tool_creds(db, "calendar_ms365"))
    any_backend = _gcal_backend_available(gcal_creds) or bool(
        m365_creds["tenant_id"] and m365_creds["client_id"] and m365_creds["client_secret"])
    if not any_backend:
        return {"synced": 0, "reason": "no calendar backend configured (ICS fallback only)"}
    synced = drifted = 0
    rows = await db.talent_interviews.find(
        {"status": "scheduled", "calendar": {"$in": ["gcal", "ms365"]}, "event_id": {"$ne": None}}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    for row in rows:
        backend = row.get("calendar")
        try:
            if backend == "gcal":
                ok = await _gcal_event_exists(db, gcal_creds, row.get("organizer_email") or "", row.get("event_id"))
            else:
                ok = await _m365_event_exists(db, m365_creds, row.get("organizer_email") or "", row.get("event_id"))
        except Exception as e:
            drifted += 1
            await db.talent_interviews.update_one(
                {"_id": row["_id"]}, {"$set": {"sync_status": "drifted", "sync_error": str(e), "synced_at": now_utc()}})
            continue
        if ok:
            synced += 1
            await db.talent_interviews.update_one(
                {"_id": row["_id"]}, {"$set": {"sync_status": "ok", "synced_at": now_utc()}})
        else:
            drifted += 1
            await db.talent_interviews.update_one(
                {"_id": row["_id"]}, {"$set": {"sync_status": "missing_event", "synced_at": now_utc()}})
    await agent_run_log(db, _AGENT, "calendar_sync", "SUCCESS",
                       detail={"checked": len(rows), "synced": synced, "drifted": drifted})
    return {"checked": len(rows), "synced": synced, "drifted": drifted}


class TalentInterviewsAgent:
    """Singleton facade — mirrors the house agent pattern."""

    async def create_interview(self, db, profile_id, **kw):
        return await create_interview(db, profile_id, **kw)

    async def record_interview_feedback(self, db, interview_id, decision, **kw):
        return await record_interview_feedback(db, interview_id, decision, **kw)

    async def interview_list(self, db, profile_id=None, limit=50):
        return await interview_list(db, profile_id, limit)

    async def agent_status(self, db) -> Dict[str, Any]:
        g = _gcal_creds(await _tool_creds(db, "calendar_gcal"))
        m = _m365_creds(await _tool_creds(db, "calendar_ms365"))
        last = await db.talent_interviews.find({}).sort("created_at", -1).limit(1).to_list(1)
        return {
            "name": "TP32 Interviews",
            "group": "integrations",
            "priority": "P2",
            "gcal": "configured" if _gcal_backend_available(g) else "unconfigured",
            "ms365": "configured" if (m["tenant_id"] and m["client_id"] and m["client_secret"]) else "unconfigured",
            "ics_fallback": "always available",
            "last_scheduled_at": last[0].get("created_at").isoformat() if last else None,
            "est_cost_per_month": "$0",
        }


talent_interviews = TalentInterviewsAgent()
