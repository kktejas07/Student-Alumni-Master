"""College/admin-side CRUD endpoints, extracted from crud_endpoints.py (audit Step 5)."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.deps import require_role
from core.db import db as _db
from crud_endpoints import _now, _resolve_user, _short_id

router = APIRouter()

# ════════════════════════════════════════════════════════════════
#  ADMIN / COLLEGE — user invite, event create, college students
# ════════════════════════════════════════════════════════════════
class UserInvite(BaseModel):
    email: str
    role: str
    full_name: Optional[str] = None


@router.post("/admin/users/invite", dependencies=[Depends(require_role("admin", "super_admin", "superadmin"))])
async def invite_user(req: UserInvite):
    if req.role not in ("student", "mentor", "college", "admin"):
        raise HTTPException(400, "Invalid role")
    from core.email_quality import require_ok
    require_ok(req.email)
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


@router.post("/college/events", dependencies=[Depends(require_role("college", "admin", "super_admin", "superadmin"))])
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
        print(f"Failed to notify students: {e}")

    # 2. Clear portals events cache so the new event shows up immediately on frontend
    try:
        from portals import events_cache
        events_cache.clear()
    except Exception as e:
        print(f"Failed to clear events_cache: {e}")

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


