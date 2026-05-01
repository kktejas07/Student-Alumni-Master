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
from typing import Any, Dict, Optional, List

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

_db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
router = APIRouter()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _short_id(oid) -> str:
    return str(oid)[-8:] if oid else ""


async def _resolve_user(role: str, email: Optional[str]) -> Dict[str, Any]:
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
    topic: str
    scheduled_at: Optional[str] = None  # ISO; defaults to next slot
    duration_minutes: int = 45


@router.post("/student/bookings")
async def create_booking(req: BookingCreate):
    student = await _resolve_user("student", req.student_email)
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
        "status": "confirmed",
        "created_at": _now(),
        "_user_created": True,
    }
    res = await _db.bookings.insert_one(doc)
    return {"ok": True, "booking_id": _short_id(res.inserted_id), "scheduled_at": sched.isoformat(), "amount_paid": doc["amount_paid"]}


@router.delete("/student/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    # Try by short-id suffix or full ObjectId
    q: Dict[str, Any]
    try:
        q = {"_id": ObjectId(booking_id)}
    except Exception:
        # match by suffix
        all_ids = [b async for b in _db.bookings.find({}, {"_id": 1})]
        match = next((b["_id"] for b in all_ids if str(b["_id"]).endswith(booking_id)), None)
        if not match:
            raise HTTPException(404, "Booking not found")
        q = {"_id": match}
    res = await _db.bookings.update_one(q, {"$set": {"status": "cancelled", "cancelled_at": _now()}})
    if res.modified_count == 0:
        raise HTTPException(404, "Booking not found")
    return {"ok": True, "cancelled": True}


@router.get("/student/my-bookings")
async def my_bookings(email: Optional[str] = None, status: Optional[str] = None):
    student = await _resolve_user("student", email)
    q: Dict[str, Any] = {"student_id": str(student["_id"])}
    if status:
        q["status"] = status
    out = []
    async for b in _db.bookings.find(q).sort("scheduled_at", 1).limit(50):
        mentor = await _db.users.find_one({"_id": ObjectId(b["mentor_id"])}) if b.get("mentor_id") else None
        out.append({
            "id": _short_id(b["_id"]),
            "topic": b.get("topic"),
            "mentor_name": (mentor or {}).get("full_name", "Mentor"),
            "mentor_email": b.get("mentor_email"),
            "scheduled_at": b.get("scheduled_at"),
            "duration_minutes": b.get("duration_minutes"),
            "amount_paid": b.get("amount_paid"),
            "status": b.get("status"),
        })
    return {"items": out, "count": len(out), "student_email": student["email"]}


# ════════════════════════════════════════════════════════════════
#  STUDENT — internship applications
# ════════════════════════════════════════════════════════════════
class ApplyRequest(BaseModel):
    student_email: Optional[str] = None
    cover_note: Optional[str] = None


@router.post("/student/internships/{internship_id}/apply")
async def apply_internship(internship_id: str, req: ApplyRequest):
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
        raise HTTPException(404, "Internship not found")

    # Idempotent — don't double-apply
    existing = await _db.internship_applications.find_one({
        "internship_id": str(internship["_id"]),
        "student_id": str(student["_id"]),
    })
    if existing:
        return {"ok": True, "already": True, "application_id": _short_id(existing["_id"])}

    doc = {
        "internship_id": str(internship["_id"]),
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
            "completed_at": w.get("completed_at"),
            "certificate_url": w.get("certificate_url"),
            "registered_at": w.get("registered_at"),
        })
    return {"items": out, "count": len(out)}


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
    return {"ok": True, "event_id": _short_id(res.inserted_id)}


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
