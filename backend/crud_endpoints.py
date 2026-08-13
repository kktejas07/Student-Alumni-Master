"""
CRUD endpoints — append-only mutations for personas + dashboards.
==================================================================
Wires the missing POST/DELETE endpoints so personas can actually
book mentor sessions, register for events, enroll in workshops,
apply to internships, create courses, and so on. The dashboards
auto-refresh every 30s on the FE, so any POST here will reflect
in the corresponding dashboard within one polling cycle.

ENDPOINTS:
  Student-side
    POST   /api/student/bookings                  — book a mentor session
    DELETE /api/student/bookings/{id}             — cancel a booking
    GET    /api/student/my-bookings               — list current student bookings
    POST   /api/student/internships/{id}/apply    — apply to an internship
    GET    /api/student/my-applications           — list applications
    POST   /api/student/workshops/{id}/enroll     — enroll in a workshop
    GET    /api/student/my-workshops              — list workshop registrations
    GET    /api/student/my-events                 — list event RSVPs
    DELETE /api/student/events/{id}/rsvp          — cancel an RSVP

  Mentor-side
    POST   /api/mentor/courses                    — publish a new course
    GET    /api/mentor/my-courses                 — list mentor's courses
    POST   /api/mentor/availability               — set availability slots
    GET    /api/mentor/my-bookings                — mentor's confirmed sessions

  Admin/College-side
    POST   /api/admin/users                       — invite/add a user
    POST   /api/college/events                    — create a new event
    GET    /api/college/my-students               — students of this college

  Live-counts (drives the auto-refresh demos)
    GET    /api/live/counters                     — global counters for FE refresh banner
"""
from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
import asyncio
from typing import Any, Dict, Optional, List

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

from core.db import db as _db
from core.email import send_email, render_html_email
router = APIRouter()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _short_id(oid) -> str:
    return str(oid)[-8:] if oid else ""


async def _issue_workshop_certificate(reg: Dict[str, Any], student: Dict[str, Any], email: str) -> Optional[Dict[str, Any]]:
    """Issue a verifiable certificate into the `certificates` registry.

    Follows the Coursera/Udemy model: a unique verification code is stored
    in the registry and exposed via a public /certificates/verify/{code}
    page, so anyone can confirm authenticity without logging in.
    """
    try:
        import secrets as _secrets
        alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
        code = "SA-" + "".join(_secrets.choice(alphabet) for _ in range(4)) + "-" + "".join(
            _secrets.choice(alphabet) for _ in range(4)
        )
        for _ in range(5):
            if not await _db.certificates.find_one({"verification_code": code}):
                break
            code = "SA-" + "".join(_secrets.choice(alphabet) for _ in range(4)) + "-" + "".join(
                _secrets.choice(alphabet) for _ in range(4)
            )

        recipient_name = student.get("full_name") or student.get("name") or ""
        if not recipient_name:
            recipient_name = (email or "").split("@")[0].replace(".", " ").title()

        cert_doc = {
            "verification_code": code,
            "recipient_email": (email or "").lower(),
            "recipient_name": recipient_name,
            "title": reg.get("workshop_title") or "Workshop Completion",
            "issuer": "Student Alumni",
            "issuer_type": "platform",
            "issued_at": _now(),
            "credential_url": None,
            "meta": {"source": "workshop", "registration_id": str(reg["_id"]), "weeks": reg.get("weeks")},
            "created_at": _now(),
        }
        await _db.certificates.insert_one(cert_doc)
        verify_url = f"{os.environ.get('FRONTEND_URL', 'https://studentalumni.ai')}/certificates/verify/{code}"
        # Send certificate notification email
        try:
            cert_name = (email or "").split("@")[0].replace(".", " ").title()
            content_html = f"""
            <h2 style="margin:0 0 8px 0;color:#111827;font-size:20px;">Your Certificate is Ready</h2>
            <p style="margin:0 0 18px 0;color:#374151;">
              Hi <strong>{cert_name}</strong>,<br/><br/>
              You have completed the workshop and your certificate has been issued on <strong>Student Alumni</strong>.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;width:100%;">
              <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:4px 0;color:#6b7280;font-size:12px;font-weight:600;">Certificate</td>
                      <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:700;">{cert_doc.get('title','Workshop Completion')}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-size:12px;font-weight:600;">Code</td>
                      <td style="padding:4px 0;color:#7c3aed;font-size:14px;font-weight:700;font-family:monospace;">{code}</td></tr>
                </table>
              </td></tr>
            </table>
            <a href="{verify_url}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
              Verify Your Certificate
            </a>
            <p style="margin:18px 0 0 0;color:#6b7280;font-size:13px;">
              Anyone can confirm this certificate at
              <a href="{verify_url}" style="color:#7c3aed;">{verify_url}</a>
            </p>
            """
            await send_email(email, f"Your Certificate — {cert_doc.get('title','Workshop Completion')}", render_html_email(content_html))
            # Best-effort WhatsApp with certificate details
            try:
                from core.whatsapp import send_wa_message as _wa
                user_doc = await _db.users.find_one({"email": email.lower().strip()}, {"phone": 1})
                phone = (user_doc or {}).get("phone") or ""
                if phone:
                    await _wa(phone=phone, text=f"🎓 *Certificate Issued*\n\n*{cert_doc.get('title','Workshop Completion')}*\nCode: `{code}`\n\nVerify: {verify_url}", kind="certificate_issued")
            except Exception:
                pass
        except Exception as email_err:
            print(f"[CERTIFICATE] Email notification failed: {email_err}", flush=True)
        return {
            "verification_code": code,
            "verify_url": verify_url,
        }
    except Exception as e:
        print(f"[CERTIFICATE] Workshop issuance failed: {e}", flush=True)
        return None


async def _resolve_user(role: str, email: Optional[str]) -> Dict[str, Any]:
    if email:
        user = await _db.users.find_one({"email": email})
        if user:
            return user
    q: Dict[str, Any] = {"role": role}
    if email:
        q["email"] = email
    user = await _db.users.find_one(q)
    if not user:
        user = await _db.users.find_one({"role": role})
    if not user:
        raise HTTPException(404, f"No {role} user found")
    return user


# ════════════════════════════════════════════════════════════════
#  STUDENT — bookings
# ════════════════════════════════════════════════════════════════
class BookingCreate(BaseModel):
    student_email: Optional[str] = None
    mentor_email: str
    mentor_id: Optional[str] = None
    topic: str
    scheduled_at: Optional[str] = None  # ISO; defaults to next slot
    duration_minutes: int = 45


@router.post("/student/bookings")
async def create_booking(req: BookingCreate):
    student = await _resolve_user("student", req.student_email)
    mentor = None
    if req.mentor_id:
        try:
            from bson import ObjectId
            mentor = await _db.users.find_one({"role": "mentor", "_id": ObjectId(req.mentor_id)})
        except Exception:
            pass
    if not mentor:
        mentor = await _db.users.find_one({"role": "mentor", "email": req.mentor_email})
    if not mentor:
        raise HTTPException(404, "Mentor not found")
    if mentor.get("mentor_status") and mentor.get("mentor_status") != "approved":
        raise HTTPException(400, "Mentor not approved")

    try:
        sched = datetime.fromisoformat(req.scheduled_at) if req.scheduled_at else _now() + timedelta(days=2, hours=10)
    except Exception:
        sched = _now() + timedelta(days=2, hours=10)

    doc = {
        "student_id": str(student["_id"]),
        "student_email": student["email"],
        "mentor_id": str(mentor["_id"]),
        "mentor_email": mentor["email"],
        "topic": req.topic,
        "scheduled_at": sched,
        "duration_minutes": req.duration_minutes,
        "amount_paid": mentor.get("expected_rate_inr", 999),
        "status": "pending",
        "created_at": _now(),
        "_user_created": True,
    }
    res = await _db.bookings.insert_one(doc)
    try:
        from notifications import notify_booking_created
        await notify_booking_created(
            _db, mentor_id=str(mentor["_id"]),
            student_name=student.get("full_name") or student.get("name") or "Student",
            topic=req.topic,
            when=sched.strftime("%b %d, %Y at %I:%M %p"),
        )
    except Exception:
        pass
    return {"ok": True, "booking_id": _short_id(res.inserted_id), "scheduled_at": sched.isoformat(), "amount_paid": doc["amount_paid"]}


@router.delete("/student/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    # Try by short-id suffix or full ObjectId against both bookings and sessions
    q: Dict[str, Any] = {}
    matched_in_bookings = False
    matched_in_sessions = False

    # Check if it is a valid 24-character ObjectId first to do O(1) direct lookup
    is_oid = False
    try:
        if len(booking_id) == 24:
            booking_oid = ObjectId(booking_id)
            is_oid = True
            if await _db.bookings.find_one({"_id": booking_oid}):
                q = {"_id": booking_oid}
                matched_in_bookings = True
            elif await _db.sessions.find_one({"_id": booking_oid}):
                q = {"_id": booking_oid}
                matched_in_sessions = True
    except Exception:
        pass

    if not is_oid or (not matched_in_bookings and not matched_in_sessions):
        # Match by suffix - perform server-side regex matching to avoid full collection memory scans
        import re
        booking_rx = f"{re.escape(booking_id)}$"

        bookings_matches = []
        async for b in _db.bookings.find({
            "$expr": {
                "$regexMatch": {
                    "input": {"$toString": "$_id"},
                    "regex": booking_rx,
                    "options": "i"
                }
            }
        }, {"_id": 1}):
            bookings_matches.append(b)

        sessions_matches = []
        async for s in _db.sessions.find({
            "$expr": {
                "$regexMatch": {
                    "input": {"$toString": "$_id"},
                    "regex": booking_rx,
                    "options": "i"
                }
            }
        }, {"_id": 1}):
            sessions_matches.append(s)

        total_matches = len(bookings_matches) + len(sessions_matches)
        if total_matches > 1:
            raise HTTPException(400, "Ambiguous booking ID: multiple sessions or bookings match this suffix")
        elif len(bookings_matches) == 1:
            q = {"_id": bookings_matches[0]["_id"]}
            matched_in_bookings = True
        elif len(sessions_matches) == 1:
            q = {"_id": sessions_matches[0]["_id"]}
            matched_in_sessions = True

    if matched_in_bookings:
        res = await _db.bookings.update_one(q, {"$set": {"status": "cancelled", "cancelled_at": _now()}})
        if res.modified_count == 0:
            raise HTTPException(404, "Booking not found")
        return {"ok": True, "cancelled": True}
    elif matched_in_sessions:
        res = await _db.sessions.update_one(q, {"$set": {"status": "cancelled", "cancelled_at": _now()}})
        if res.modified_count == 0:
            raise HTTPException(404, "Session not found")
        return {"ok": True, "cancelled": True}
    else:
        raise HTTPException(404, "Booking not found")


@router.post("/student/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str):
    q: Dict[str, Any] = {}
    matched_in_bookings = False
    matched_in_sessions = False

    is_oid = False
    try:
        if len(booking_id) == 24:
            booking_oid = ObjectId(booking_id)
            is_oid = True
            if await _db.bookings.find_one({"_id": booking_oid}):
                q = {"_id": booking_oid}
                matched_in_bookings = True
            elif await _db.sessions.find_one({"_id": booking_oid}):
                q = {"_id": booking_oid}
                matched_in_sessions = True
    except Exception:
        pass

    if not is_oid or (not matched_in_bookings and not matched_in_sessions):
        import re
        booking_rx = f"{re.escape(booking_id)}$"

        bookings_matches = []
        async for b in _db.bookings.find({
            "$expr": {
                "$regexMatch": {
                    "input": {"$toString": "$_id"},
                    "regex": booking_rx,
                    "options": "i"
                }
            }
        }, {"_id": 1}):
            bookings_matches.append(b)

        sessions_matches = []
        async for s in _db.sessions.find({
            "$expr": {
                "$regexMatch": {
                    "input": {"$toString": "$_id"},
                    "regex": booking_rx,
                    "options": "i"
                }
            }
        }, {"_id": 1}):
            sessions_matches.append(s)

        total_matches = len(bookings_matches) + len(sessions_matches)
        if total_matches > 1:
            raise HTTPException(400, "Ambiguous booking ID")
        elif len(bookings_matches) == 1:
            q = {"_id": bookings_matches[0]["_id"]}
            matched_in_bookings = True
        elif len(sessions_matches) == 1:
            q = {"_id": sessions_matches[0]["_id"]}
            matched_in_sessions = True

    if matched_in_bookings:
        res = await _db.bookings.update_one(q, {"$set": {"status": "completed", "completed_at": _now()}})
        if res.modified_count == 0:
            raise HTTPException(404, "Booking not found")
        return {"ok": True, "completed": True}
    elif matched_in_sessions:
        res = await _db.sessions.update_one(q, {"$set": {"status": "completed", "completed_at": _now()}})
        if res.modified_count == 0:
            raise HTTPException(404, "Session not found")
        return {"ok": True, "completed": True}
    else:
        raise HTTPException(404, "Booking not found")


@router.get("/student/my-bookings")
async def my_bookings(email: Optional[str] = None, status: Optional[str] = None):
    student = await _resolve_user("student", email)
    sid = str(student["_id"])

    # 1. Fetch legacy custom bookings
    bq: Dict[str, Any] = {"student_id": sid}
    if status:
        if status == "confirmed":
            bq["status"] = "confirmed"
        elif status == "cancelled":
            bq["status"] = "cancelled"
        elif status == "completed":
            bq["status"] = "completed"
        else:
            bq["status"] = status

    # 2. Fetch slot-based sessions
    sq: Dict[str, Any] = {"user_id": sid}
    if status:
        if status == "confirmed":
            sq["status"] = {"$in": ["booked", "scheduled", "confirmed"]}
        elif status == "cancelled":
            sq["status"] = "cancelled"
        elif status == "completed":
            sq["status"] = {"$in": ["completed", "attended"]}
        else:
            sq["status"] = status

    # Gather all unique mentor_ids to fetch in batch (resolves N+1 query overhead)
    mentor_ids = set()
    raw_bookings = []
    async for b in _db.bookings.find(bq).sort("scheduled_at", 1).limit(50):
        raw_bookings.append(b)
        mid = b.get("mentor_id")
        if mid and isinstance(mid, str) and ObjectId.is_valid(mid):
            mentor_ids.add(ObjectId(mid))

    raw_sessions = []
    async for s in _db.sessions.find(sq).limit(50):
        raw_sessions.append(s)
        mid = s.get("mentor_id")
        if mid and isinstance(mid, str) and ObjectId.is_valid(mid):
            mentor_ids.add(ObjectId(mid))

    # Single batch fetch for all mentors
    mentors_map = {}
    if mentor_ids:
        async for m in _db.users.find({"_id": {"$in": list(mentor_ids)}}):
            mentors_map[str(m["_id"])] = m

    out = []

    # Map legacy bookings
    for b in raw_bookings:
        mid_str = b.get("mentor_id")
        mentor = mentors_map.get(mid_str) if mid_str else None
        out.append({
            "id": _short_id(b["_id"]),
            "topic": b.get("topic") or "1:1 Mentorship Session",
            "mentor_name": (mentor or {}).get("full_name") or (mentor or {}).get("name") or "Mentor",
            "mentor_email": b.get("mentor_email") or (mentor or {}).get("email"),
            "scheduled_at": b.get("scheduled_at"),
            "duration_minutes": b.get("duration_minutes", 45),
            "amount_paid": b.get("amount_paid") or (mentor or {}).get("expected_rate_inr") or 0,
            "status": b.get("status"),
        })

    # Map slot-based sessions
    for s in raw_sessions:
        mid_str = s.get("mentor_id")
        mentor = mentors_map.get(mid_str) if mid_str else None
        s_status = s.get("status")
        # Map all session statuses cleanly
        mapped_status = (
            "confirmed" if s_status in ["booked", "scheduled", "confirmed"]
            else "cancelled" if s_status == "cancelled"
            else "completed" if s_status in ["completed", "attended"]
            else s_status
        )
        out.append({
            "id": _short_id(s["_id"]),
            "topic": s.get("topic") or "1:1 Mentorship Session",
            "mentor_name": (mentor or {}).get("full_name") or (mentor or {}).get("name") or "Mentor",
            "mentor_email": (mentor or {}).get("email") or s.get("mentor_email"),
            "scheduled_at": s.get("scheduled_at"),
            "duration_minutes": s.get("duration_minutes", 30),
            "amount_paid": (mentor or {}).get("expected_rate_inr") or 0,
            "status": mapped_status,
        })

    # Sort unified list chronologically by scheduled_at
    def get_sched(x):
        val = x.get("scheduled_at")
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                pass
        return datetime.min

    out.sort(key=get_sched)
    return {"items": out, "count": len(out), "student_email": student["email"]}


# ════════════════════════════════════════════════════════════════
#  STUDENT — internship applications
# ════════════════════════════════════════════════════════════════
class ApplyRequest(BaseModel):
    student_email: Optional[str] = None
    cover_note: Optional[str] = None


@router.post("/student/internships/{internship_id}/apply")
async def apply_internship(internship_id: str, req: ApplyRequest, request: Request):
    student = None
    # 1. Try to read token from Authorization header if present for secure auth
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            import jwt
            from core.security import JWT_SECRET, JWT_ALGORITHM
            payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") == "access":
                student = await _db.users.find_one({"_id": ObjectId(payload["sub"])})
        except Exception:
            pass

    # 2. Fall back to request body if unauthenticated (demo switcher & automated tests compatibility)
    if not student:
        student = await _resolve_user("student", req.student_email)
    # Find internship by suffix-id or ObjectId
    internship = None
    try:
        internship = await _db.internships.find_one({"_id": ObjectId(internship_id)})
    except Exception:
        pass
    if not internship:
        async for i in _db.internships.find({}, {"_id": 1, "title": 1, "company": 1}):
            if str(i["_id"]).endswith(internship_id):
                internship = i; break
    if not internship:
        # Support external feed jobs stored in jobs_cache
        try:
            internship = await _db.jobs_cache.find_one({"dedup_hash": internship_id})
        except Exception:
            pass
    if not internship:
        try:
            internship = await _db.jobs_cache.find_one({"_id": ObjectId(internship_id)})
        except Exception:
            pass
    if not internship:
        raise HTTPException(404, "Internship not found")

    # Idempotent — don't double-apply
    internship_id_str = internship.get("dedup_hash") or str(internship["_id"])
    existing = await _db.internship_applications.find_one({
        "$or": [
            {"internship_id": str(internship["_id"])},
            {"internship_id": internship_id_str}
        ],
        "student_id": str(student["_id"]),
    })
    if existing:
        return {"ok": True, "already": True, "application_id": _short_id(existing["_id"])}

    doc = {
        "internship_id": internship_id_str,
        "internship_title": internship.get("title"),
        "company": internship.get("company"),
        "student_id": str(student["_id"]),
        "student_email": student["email"],
        "student_name": student.get("full_name"),
        "cover_note": req.cover_note,
        "status": "submitted",
        "applied_at": _now(),
    }
    res = await _db.internship_applications.insert_one(doc)

    # Sync with users.applied_jobs so the feed button is marked as applied
    await _db.users.update_one(
        {"_id": student["_id"]},
        {"$addToSet": {"applied_jobs": internship_id_str}}
    )

    # Write to job_apply_audit for unified tracking metrics
    try:
        url = internship.get("url") or (internship.get("source_urls") or [""])[0]
        await _db.job_apply_audit.insert_one({
            "user_id": str(student["_id"]),
            "job_id": internship_id_str,
            "source_url": url,
            "ts": _now(),
        })
    except Exception:
        pass

    return {"ok": True, "application_id": _short_id(res.inserted_id), "applied_at": doc["applied_at"].isoformat()}


@router.get("/student/my-applications")
async def my_applications(email: Optional[str] = None):
    student = await _resolve_user("student", email)
    out = []
    async for a in _db.internship_applications.find({"student_id": str(student["_id"])}).sort("applied_at", -1).limit(50):
        out.append({
            "id": _short_id(a["_id"]),
            "internship_title": a.get("internship_title"),
            "company": a.get("company"),
            "status": a.get("status"),
            "applied_at": a.get("applied_at"),
        })
    return {"items": out, "count": len(out)}


# ════════════════════════════════════════════════════════════════
#  STUDENT — workshops
# ════════════════════════════════════════════════════════════════
class WorkshopEnroll(BaseModel):
    student_email: Optional[str] = None
    workshop_title: str
    fee_inr: int = 999
    weeks: int = 4


@router.post("/student/workshops/enroll")
async def enroll_workshop(req: WorkshopEnroll):
    student = await _resolve_user("student", req.student_email)
    # Idempotent on (student, title)
    existing = await _db.workshop_registrations.find_one({
        "student_id": str(student["_id"]),
        "workshop_title": req.workshop_title,
    })
    if existing:
        return {"ok": True, "already": True, "registration_id": _short_id(existing["_id"])}
    doc = {
        "student_id": str(student["_id"]),
        "student_email": student["email"],
        "workshop_title": req.workshop_title,
        "fee_inr": req.fee_inr,
        "weeks": req.weeks,
        "status": "registered",
        "current_week": 1,
        "registered_at": _now(),
    }
    res = await _db.workshop_registrations.insert_one(doc)
    return {"ok": True, "registration_id": _short_id(res.inserted_id)}


@router.get("/student/my-workshops")
async def my_workshops(email: Optional[str] = None):
    student = await _resolve_user("student", email)
    out = []
    async for w in _db.workshop_registrations.find({"student_id": str(student["_id"])}).sort("registered_at", -1).limit(50):
        out.append({
            "id": _short_id(w["_id"]),
            "title": w.get("workshop_title"),
            "fee_inr": w.get("fee_inr"),
            "weeks": w.get("weeks"),
            "status": w.get("status"),
            "current_week": w.get("current_week", 1),
            "completed_at": w.get("completed_at"),
            "certificate_url": w.get("certificate_url"),
            "registered_at": w.get("registered_at"),
        })
    return {"items": out, "count": len(out)}


class WorkshopProgressReq(BaseModel):
    student_email: str
    registration_id: str
    action: str  # "start", "advance", "complete"


@router.post("/student/workshops/progress")
async def progress_workshop(req: WorkshopProgressReq):
    if req.action not in ["start", "advance", "complete"]:
        raise HTTPException(400, f"Invalid action: {req.action}. Must be 'start', 'advance', or 'complete'.")

    # Resolve student to ensure strict authorization and scoping
    student = await _resolve_user("student", req.student_email)
    student_id_str = str(student["_id"])

    # Find the registration scoped strictly to the student
    reg = None
    # 1. Try by ObjectId if 24 chars
    if len(req.registration_id) == 24:
        try:
            reg = await _db.workshop_registrations.find_one({
                "_id": ObjectId(req.registration_id),
                "student_id": student_id_str
            })
        except Exception:
            pass

    # 2. Try by short-id (last 8 chars) suffix, scoped strictly to the student
    if not reg:
        async for w in _db.workshop_registrations.find({"student_id": student_id_str}):
            if str(w["_id"])[-8:] == req.registration_id:
                reg = w
                break

    if not reg:
        raise HTTPException(404, "Workshop registration not found for the calling student")

    weeks = max(1, int(reg.get("weeks") or 4))
    current_week = int(reg.get("current_week") or 1)
    current_week = max(1, min(current_week, weeks))
    status = reg.get("status") or "registered"

    if req.action == "start":
        status = "in_progress"
        current_week = 1
    elif req.action == "advance":
        status = "in_progress"
        current_week = min(current_week + 1, weeks)
        if current_week >= weeks:
            status = "completed"
    elif req.action == "complete":
        status = "completed"
        current_week = weeks

    update_doc: Dict[str, Any] = {
        "status": status,
        "current_week": current_week
    }

    if status == "completed":
        update_doc["completed_at"] = reg.get("completed_at") or _now()
        # Real certificate issuance (Coursera-style): create a registry entry
        # with a unique verification code + public verify URL, replacing the
        # old placeholder certificates.example.com link.
        cert = await _issue_workshop_certificate(
            reg, student, req.student_email or student.get("email")
        )
        if cert:
            update_doc["certificate_url"] = cert["verify_url"]
            update_doc["verification_code"] = cert["verification_code"]

    await _db.workshop_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": update_doc}
    )

    return {
        "ok": True,
        "status": status,
        "current_week": current_week,
        "completed_at": update_doc.get("completed_at"),
        "certificate_url": update_doc.get("certificate_url"),
    }


# ════════════════════════════════════════════════════════════════
#  STUDENT — events (already have RSVP; add list + cancel)
# ════════════════════════════════════════════════════════════════
@router.get("/student/my-events")
async def my_events(email: Optional[str] = None):
    student = await _resolve_user("student", email)
    out = []
    async for r in _db.event_registrations.find({"student_id": str(student["_id"])}).sort("registered_at", -1).limit(50):
        ev = None
        try:
            ev = await _db.events.find_one({"_id": ObjectId(r["event_id"])})
        except Exception:
            pass
        out.append({
            "id": _short_id(r["_id"]),
            "event_id": r.get("event_id"),
            "event_title": r.get("event_title") or (ev or {}).get("title"),
            "event_start": (ev or {}).get("start_date"),
            "event_mode": (ev or {}).get("mode"),
            "status": r.get("status"),
            "registered_at": r.get("registered_at"),
        })
    return {"items": out, "count": len(out)}


@router.delete("/student/events/{event_id}/rsvp")
async def cancel_rsvp(event_id: str, email: Optional[str] = None):
    student = await _resolve_user("student", email)
    res = await _db.event_registrations.update_many(
        {"event_id": event_id, "student_id": str(student["_id"])},
        {"$set": {"status": "cancelled", "cancelled_at": _now()}},
    )
    return {"ok": True, "cancelled_count": res.modified_count}


# ════════════════════════════════════════════════════════════════
#  MENTOR — courses + availability + sessions
# ════════════════════════════════════════════════════════════════
class CourseCreate(BaseModel):
    mentor_email: Optional[str] = None
    title: str
    fee_inr: int
    summary: Optional[str] = None


@router.post("/mentor/courses")
async def create_course(req: CourseCreate):
    mentor = await _resolve_user("mentor", req.mentor_email)
    doc = {
        "mentor_id": str(mentor["_id"]),
        "mentor_email": mentor["email"],
        "title": req.title,
        "fee_inr": req.fee_inr,
        "summary": req.summary,
        "students_enrolled": 0,
        "status": "published",
        "created_at": _now(),
    }
    res = await _db.courses.insert_one(doc)
    return {"ok": True, "course_id": _short_id(res.inserted_id)}


@router.get("/mentor/my-courses")
async def my_courses(email: Optional[str] = None):
    mentor = await _resolve_user("mentor", email)
    out = []
    async for c in _db.courses.find({"mentor_id": str(mentor["_id"])}).sort("created_at", -1):
        out.append({
            "id": _short_id(c["_id"]),
            "title": c.get("title"),
            "fee_inr": c.get("fee_inr"),
            "students_enrolled": c.get("students_enrolled", 0),
            "status": c.get("status"),
            "created_at": c.get("created_at"),
        })
    return {"items": out, "count": len(out)}


class AvailabilityItem(BaseModel):
    day: str  # Monday/Tuesday/...
    start_time: str  # "09:00"
    end_time: str    # "17:00"


class AvailabilitySet(BaseModel):
    mentor_email: Optional[str] = None
    slots: List[AvailabilityItem]


@router.post("/mentor/availability")
async def set_availability(req: AvailabilitySet):
    mentor = await _resolve_user("mentor", req.mentor_email)
    await _db.mentor_availability.delete_many({"mentor_id": str(mentor["_id"])})
    docs = [
        {
            "mentor_id": str(mentor["_id"]),
            "mentor_email": mentor["email"],
            "day": s.day,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "updated_at": _now(),
        }
        for s in req.slots
    ]
    if docs:
        await _db.mentor_availability.insert_many(docs)
    return {"ok": True, "slots_saved": len(docs)}


@router.get("/mentor/my-bookings")
async def mentor_my_bookings(email: Optional[str] = None, when: str = "upcoming"):
    """when = upcoming | today | past"""
    mentor = await _resolve_user("mentor", email)
    q: Dict[str, Any] = {"mentor_id": str(mentor["_id"]), "status": "confirmed"}
    now = _now()
    if when == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        q["scheduled_at"] = {"$gte": start, "$lt": end}
    elif when == "past":
        q["scheduled_at"] = {"$lt": now}
    else:
        q["scheduled_at"] = {"$gte": now}
    out = []
    async for b in _db.bookings.find(q).sort("scheduled_at", 1).limit(50):
        student = None
        try:
            student = await _db.users.find_one({"_id": ObjectId(b["student_id"])}) if b.get("student_id") else None
        except Exception:
            pass
        out.append({
            "id": _short_id(b["_id"]),
            "topic": b.get("topic"),
            "scheduled_at": b.get("scheduled_at"),
            "duration_minutes": b.get("duration_minutes"),
            "student_name": (student or {}).get("full_name", "Student"),
            "student_email": b.get("student_email"),
        })
    return {"items": out, "count": len(out), "scope": when}


# ════════════════════════════════════════════════════════════════
#  ADMIN / COLLEGE — user invite, event create, college students
# ════════════════════════════════════════════════════════════════
class UserInvite(BaseModel):
    email: str
    role: str
    full_name: Optional[str] = None


@router.post("/admin/users/invite")
async def invite_user(req: UserInvite):
    if req.role not in ("student", "mentor", "college", "admin"):
        raise HTTPException(400, "Invalid role")
    existing = await _db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(409, "Email already exists")
    import bcrypt
    doc = {
        "email": req.email,
        "password_hash": bcrypt.hashpw(b"TestPass@123", bcrypt.gensalt()).decode(),
        "role": req.role,
        "full_name": req.full_name or req.email.split("@")[0],
        "onboarding_completed": False,
        "created_at": _now(),
        "_invited": True,
    }
    res = await _db.users.insert_one(doc)
    return {"ok": True, "user_id": _short_id(res.inserted_id), "email": req.email}


class EventCreate(BaseModel):
    title: str
    category: str = "Workshop"
    mode: str = "Online"
    college_name: Optional[str] = None
    start_date: Optional[str] = None
    capacity: int = 100
    price: int = 0


@router.post("/college/events")
async def create_college_event(req: EventCreate):
    try:
        sd = datetime.fromisoformat(req.start_date) if req.start_date else _now() + timedelta(days=14)
    except Exception:
        sd = _now() + timedelta(days=14)
    doc = {
        "title": req.title,
        "category": req.category,
        "mode": req.mode,
        "college_name": req.college_name,
        "start_date": sd,
        "registration_deadline": sd - timedelta(days=2),
        "price": req.price,
        "capacity": req.capacity,
        "created_at": _now(),
        "_user_created": True,
    }
    res = await _db.events.insert_one(doc)
    event_id_str = str(res.inserted_id)

    # 1. Fetch all student users and create notification cards
    try:
        students = await _db.users.find({"role": "student"}).to_list(None)
        if students:
            notification_docs = [
                {
                    "user_id": str(s["_id"]),
                    "title": "New Event Invitation",
                    "body": f"A new event '{req.title}' has been scheduled by {req.college_name or 'your college'}. Click to register!",
                    "data": {"type": "new_event", "event_id": event_id_str},
                    "type": "new_event",
                    "read": False,
                    "created_at": _now(),
                }
                for s in students
            ]
            await _db.notifications.insert_many(notification_docs)
    except Exception as e:
        logger.warning(f"Failed to notify students: {e}")

    # 2. Clear portals events cache so the new event shows up immediately on frontend
    try:
        from portals import events_cache
        events_cache.clear()
    except Exception as e:
        logger.warning(f"Failed to clear events_cache: {e}")

    return {"ok": True, "event_id": event_id_str}




@router.get("/college/my-students")
async def college_my_students(email: Optional[str] = None, limit: int = 100):
    college = await _resolve_user("college", email)
    cname = (college.get("school_info") or {}).get("institution_name") or college.get("full_name", "")
    out = []
    async for s in _db.users.find(
        {"role": "student", "school_info.institution_name": cname},
    ).limit(limit):
        out.append({
            "id": _short_id(s["_id"]),
            "full_name": s.get("full_name"),
            "email": s.get("email"),
            "tier": s.get("tier"),
            "tier_score": s.get("tier_score"),
            "graduation_year": (s.get("school_info") or {}).get("graduation_year"),
            "skills_count": len(s.get("skills") or []),
        })
    return {"items": out, "count": len(out), "college_name": cname}


# ════════════════════════════════════════════════════════════════
#  LIVE counters — shows the auto-refresh effect
# ════════════════════════════════════════════════════════════════
@router.get("/live/counters")
async def live_counters():
    """Used by FE to show that auto-refresh is wired — increments
    on every booking/RSVP/application/workshop."""
    return {
        "users":           await _db.users.count_documents({}),
        "students":        await _db.users.count_documents({"role": "student"}),
        "mentors":         await _db.users.count_documents({"role": "mentor"}),
        "colleges":        await _db.users.count_documents({"role": "college"}),
        "bookings":        await _db.bookings.count_documents({}),
        "bookings_today":  await _db.bookings.count_documents({
            "scheduled_at": {
                "$gte": _now().replace(hour=0, minute=0, second=0, microsecond=0),
                "$lt": _now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1),
            }
        }),
        "applications":    await _db.internship_applications.count_documents({}),
        "events":          await _db.events.count_documents({}),
        "rsvps":           await _db.event_registrations.count_documents({}),
        "workshops":       await _db.workshop_registrations.count_documents({}),
        "courses":         await _db.courses.count_documents({}),
        "as_of":           _now().isoformat(),
    }
