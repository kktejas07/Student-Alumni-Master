"""Student-side CRUD endpoints (bookings, internships, workshops, events), extracted from crud_endpoints.py (audit Step 5)."""
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core.deps import bearer_token, decode_payload_silent, get_current_user, require_role
from core.db import db as _db
from crud_endpoints import _issue_workshop_certificate, _now, _resolve_user, _short_id

router = APIRouter()

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
        from features.notifications import notify_booking_created
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
async def cancel_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
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
async def complete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
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
    access_payload = decode_payload_silent(bearer_token(request.headers.get("Authorization", "")), token_type="access")
    if access_payload:
        student = await _db.users.find_one({"_id": ObjectId(access_payload["sub"])})

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
        async for i in _db.internships.find({}, {"_id": 1, "id": 1, "title": 1, "company": 1}):
            if str(i["_id"]).endswith(internship_id) or i.get("id") == internship_id:
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

    # Sync with users.applied_jobs so the feed button is marked as applied
    updates = {"applied_jobs": internship_id_str}
    if internship.get("id"):
        updates["applied_opportunities"] = internship.get("id")

    await _db.users.update_one(
        {"_id": student["_id"]},
        {"$addToSet": updates}
    )

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
            "job_id": a.get("internship_id"),
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
async def enroll_workshop(req: WorkshopEnroll, user: dict = Depends(require_role('student', 'alumni'))):
    # Scoped to the caller: `student_email` in the body is ignored. These
    # three endpoints used to accept any email with no authentication.
    student = user
    # Idempotent on (student, title)
    existing = await _db.workshop_registrations.find_one({
        "student_id": str(student["_id"]),
        "workshop_title": req.workshop_title,
    })
    if existing:
        return {"ok": True, "already": True, "registration_id": _short_id(existing["_id"])}
    doc = {
        "student_id": str(student["_id"]),
        "student_email": student.get("email"),
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
async def my_workshops(email: Optional[str] = None, user: dict = Depends(require_role('student', 'alumni'))):
    student = user
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
    student_email: Optional[str] = None  # ignored; kept for client compatibility
    registration_id: str
    action: str  # "start", "advance", "complete"


@router.post("/student/workshops/progress")
async def progress_workshop(req: WorkshopProgressReq, user: dict = Depends(require_role('student', 'alumni'))):
    if req.action not in ["start", "advance", "complete"]:
        raise HTTPException(400, f"Invalid action: {req.action}. Must be 'start', 'advance', or 'complete'.")

    # Scoped to the authenticated caller; the body's student_email is ignored.
    student_id_str = str(user["_id"])

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
            reg, user, user.get("email") or ""
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


@router.post("/student/events/{event_id}/register")
async def register_student_event(event_id: str, body: Optional[Dict[str, Any]] = None, request: Request = None):
    body = body or {}
    email = body.get("email") or body.get("student_email")
    student = await _resolve_user("student", email)
    student_id_str = str(student["_id"])

    # Find event details in events_v2 or echo_showcases
    ev = await _db.events_v2.find_one({"$or": [{"event_id": event_id}, {"slug": event_id}]})
    if not ev:
        ev = await _db.echo_showcases.find_one({"$or": [{"event_id": event_id}, {"slug": event_id}]})

    event_title = (ev or {}).get("title") or body.get("event_title") or "Global Student Event"
    
    # Check existing registration
    existing = await _db.event_registrations.find_one({
        "event_id": event_id,
        "$or": [{"student_id": student_id_str}, {"user_id": student_id_str}]
    })
    if existing and existing.get("status") in ("registered", "waitlisted"):
        return {
            "ok": True,
            "already": True,
            "status": existing.get("status", "registered"),
            "confirmation_id": existing.get("confirmation_id") or f"REG-SA-{_short_id(existing['_id']).upper()}",
            "event_title": event_title,
        }

    import secrets as _secrets
    conf_id = "REG-SA-" + "".join(_secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(6))

    doc = {
        "event_id": event_id,
        "event_title": event_title,
        "student_id": student_id_str,
        "user_id": student_id_str,
        "student_email": student.get("email"),
        "student_name": student.get("full_name") or student.get("name"),
        "confirmation_id": conf_id,
        "status": "registered",
        "registered_at": _now(),
        "created_at": _now(),
    }
    res = await _db.event_registrations.insert_one(doc)

    await _db.users.update_one(
        {"_id": student["_id"]},
        {"$addToSet": {"registered_events": event_id}}
    )

    return {
        "ok": True,
        "status": "registered",
        "confirmation_id": conf_id,
        "event_title": event_title,
        "registered_at": doc["registered_at"].isoformat(),
    }


@router.delete("/student/events/{event_id}/rsvp")
async def cancel_rsvp(event_id: str, email: Optional[str] = None):
    student = await _resolve_user("student", email)
    res = await _db.event_registrations.update_many(
        {"event_id": event_id, "student_id": str(student["_id"])},
        {"$set": {"status": "cancelled", "cancelled_at": _now()}},
    )
    return {"ok": True, "cancelled_count": res.modified_count}


