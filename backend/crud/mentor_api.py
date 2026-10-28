"""Mentor-side CRUD endpoints (courses, availability), extracted from crud_endpoints.py (audit Step 5)."""
from datetime import timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter
from pydantic import BaseModel

from core.db import db as _db
from crud_endpoints import _now, _resolve_user, _short_id

router = APIRouter()

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


