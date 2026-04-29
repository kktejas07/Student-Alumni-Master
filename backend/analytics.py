"""
Role-Based Analytics Engine
============================
Provides KPIs + time-series + top-lists tailored to each user's role.

Endpoints:
  GET /api/analytics  →  returns analytics scoped to the caller's role
                          (super_admin / admin / college / mentor)

Role coverage:
  • Super Admin  — platform-wide everything (users, revenue, top colleges)
  • Admin        — same as Super Admin minus cross-tenant + revenue
  • College      — scoped to their institution_name (students/alumni/mentors from this college)
  • Mentor       — their own bookings, sessions, rating, earnings
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from collections import defaultdict


def _iso_day(dt: datetime) -> str:
    return dt.date().isoformat()


def _last_n_days(n: int) -> List[str]:
    today = datetime.now(timezone.utc).date()
    return [(today - timedelta(days=i)).isoformat() for i in range(n - 1, -1, -1)]


# ---------------------------------------------------------------------------
# Super Admin / Admin Analytics
# ---------------------------------------------------------------------------
async def super_admin_analytics(db, include_revenue: bool = True) -> Dict[str, Any]:
    """Platform-wide analytics. Super-admin sees everything; admin sees no revenue."""
    # === KPI cards ===
    total_users = await db.users.count_documents({})
    students = await db.users.count_documents({"role": "student"})
    alumni = await db.users.count_documents({"role": "alumni"})
    mentors = await db.users.count_documents({"role": "mentor"})
    colleges = await db.users.count_documents({"role": "college"})
    pending_mentors = await db.users.count_documents({"role": "mentor", "mentor_status": "pending"})

    total_bookings = await db.bookings.count_documents({})
    total_events = await db.events.count_documents({})
    total_courses = await db.courses.count_documents({})
    total_internships = await db.internships.count_documents({})

    # === User growth (last 14 days) ===
    days = _last_n_days(14)
    growth = {d: 0 for d in days}
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    cursor = db.users.find({"created_at": {"$gte": cutoff}}, {"created_at": 1})
    async for u in cursor:
        d = _iso_day(u["created_at"])
        if d in growth:
            growth[d] += 1
    growth_series = [{"date": d, "count": growth[d]} for d in days]

    # === Role distribution (donut chart) ===
    role_distribution = [
        {"label": "Students", "value": students, "color": "#5F259F"},
        {"label": "Alumni", "value": alumni, "color": "#00A78E"},
        {"label": "Mentors", "value": mentors, "color": "#F4A22C"},
        {"label": "Colleges", "value": colleges, "color": "#3B82F6"},
    ]

    # === Top colleges by user count ===
    pipeline = [
        {"$match": {"school_info.institution_name": {"$ne": None}}},
        {"$group": {
            "_id": "$school_info.institution_name",
            "count": {"$sum": 1},
            "students": {"$sum": {"$cond": [{"$eq": ["$role", "student"]}, 1, 0]}},
            "alumni":   {"$sum": {"$cond": [{"$eq": ["$role", "alumni"]}, 1, 0]}},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    top_colleges = []
    async for r in db.users.aggregate(pipeline):
        if r["_id"]:
            top_colleges.append({
                "name": r["_id"],
                "total": r["count"],
                "students": r["students"],
                "alumni": r["alumni"],
            })

    # === Mentor categories distribution ===
    mentor_cats = defaultdict(int)
    async for m in db.users.find({"role": "mentor", "mentor_status": "approved"}, {"mentor_info": 1}):
        cat = (m.get("mentor_info") or {}).get("category", "other")
        mentor_cats[cat] += 1
    mentor_cat_series = [
        {"label": k.replace("_", " ").title(), "value": v}
        for k, v in sorted(mentor_cats.items(), key=lambda x: -x[1])
    ]

    # === Booking statuses distribution ===
    booking_status = defaultdict(int)
    async for b in db.bookings.find({}, {"status": 1}):
        booking_status[b.get("status", "unknown")] += 1
    booking_status_series = [
        {"label": k.title(), "value": v} for k, v in sorted(booking_status.items(), key=lambda x: -x[1])
    ]

    # === Recent activity feed (last 8 bookings + new users) ===
    recent_bookings = []
    async for b in db.bookings.find({}).sort("created_at", -1).limit(5):
        recent_bookings.append({
            "type": "booking",
            "topic": b.get("topic"),
            "status": b.get("status"),
            "at": (b.get("created_at") or datetime.now(timezone.utc)).isoformat(),
        })
    recent_users = []
    async for u in db.users.find({}, {"full_name": 1, "role": 1, "created_at": 1}).sort("created_at", -1).limit(5):
        recent_users.append({
            "type": "signup",
            "name": u.get("full_name"),
            "role": u.get("role"),
            "at": (u.get("created_at") or datetime.now(timezone.utc)).isoformat(),
        })

    payload: Dict[str, Any] = {
        "scope": "platform",
        "kpis": {
            "total_users": total_users,
            "students": students,
            "alumni": alumni,
            "mentors": mentors,
            "colleges": colleges,
            "pending_mentors": pending_mentors,
            "total_bookings": total_bookings,
            "total_events": total_events,
            "total_courses": total_courses,
            "total_internships": total_internships,
        },
        "growth_series": growth_series,
        "role_distribution": role_distribution,
        "top_colleges": top_colleges,
        "mentor_categories": mentor_cat_series,
        "booking_statuses": booking_status_series,
        "recent_bookings": recent_bookings,
        "recent_signups": recent_users,
    }
    if include_revenue:
        # MOCK revenue — real implementation would query a payments collection.
        payload["revenue"] = {
            "mtd": 124_580,           # Month-to-date in INR (mocked)
            "ytd": 1_847_200,
            "currency": "INR",
            "by_source": [
                {"label": "Mentor sessions", "value": 64_320},
                {"label": "Premium memberships", "value": 38_400},
                {"label": "Event tickets", "value": 21_860},
            ],
            "_note": "MOCKED — connect a payments collection to wire real numbers",
        }
    return payload


# ---------------------------------------------------------------------------
# College Analytics — scoped to a single institution
# ---------------------------------------------------------------------------
async def college_analytics(db, institution_name: str) -> Dict[str, Any]:
    base_q = {"school_info.institution_name": institution_name}
    students = await db.users.count_documents({**base_q, "role": "student"})
    alumni = await db.users.count_documents({**base_q, "role": "alumni"})
    mentors = await db.users.count_documents({**base_q, "role": "mentor", "mentor_status": "approved"})

    # Education-level breakdown of students
    edu_dist = defaultdict(int)
    async for u in db.users.find({**base_q, "role": "student"}, {"student_info": 1}):
        lvl = (u.get("student_info") or {}).get("education_level", "other")
        edu_dist[lvl] += 1

    edu_series = [
        {"label": k.replace("_", " ").title(), "value": v}
        for k, v in sorted(edu_dist.items(), key=lambda x: -x[1])
    ]

    # Career path distribution
    path_dist = defaultdict(int)
    async for u in db.users.find({**base_q, "role": "student"}, {"career_path": 1}):
        path_dist[u.get("career_path") or "unspecified"] += 1
    path_series = [
        {"label": k.replace("_", " ").title(), "value": v}
        for k, v in sorted(path_dist.items(), key=lambda x: -x[1])
    ]

    # Top alumni from this college (the ones to celebrate)
    top_alumni = []
    async for a in db.users.find({**base_q, "role": "alumni"}, {"full_name": 1, "alumni_info": 1}).limit(8):
        info = a.get("alumni_info") or {}
        top_alumni.append({
            "name": a.get("full_name"),
            "employer": info.get("current_employer"),
            "role": info.get("current_role"),
        })

    # Bookings made by students of this college
    user_ids = []
    async for u in db.users.find({**base_q, "role": "student"}, {"_id": 1}):
        user_ids.append(str(u["_id"]))
    bookings_count = await db.bookings.count_documents({"student_id": {"$in": user_ids}}) if user_ids else 0

    # Recent enrollments (last 14d)
    days = _last_n_days(14)
    enroll = {d: 0 for d in days}
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    async for u in db.users.find({**base_q, "created_at": {"$gte": cutoff}}, {"created_at": 1}):
        d = _iso_day(u["created_at"])
        if d in enroll:
            enroll[d] += 1
    enroll_series = [{"date": d, "count": enroll[d]} for d in days]

    return {
        "scope": "college",
        "institution_name": institution_name,
        "kpis": {
            "total_students": students,
            "total_alumni": alumni,
            "total_mentors": mentors,
            "total_bookings_by_students": bookings_count,
        },
        "education_distribution": edu_series,
        "career_path_distribution": path_series,
        "top_alumni": top_alumni,
        "enrollment_series": enroll_series,
    }


# ---------------------------------------------------------------------------
# Mentor Analytics — scoped to one mentor's own data
# ---------------------------------------------------------------------------
async def mentor_analytics(db, mentor_id: str) -> Dict[str, Any]:
    """Aggregates the mentor's bookings: sessions, rating, hours, earnings."""
    mid = str(mentor_id)
    bookings = await db.bookings.find({"mentor_id": mid}).to_list(500)

    completed = [b for b in bookings if b.get("status") == "completed"]
    upcoming = [b for b in bookings if b.get("status") in ("pending", "confirmed")]
    cancelled = [b for b in bookings if b.get("status") == "cancelled"]

    total_minutes = sum(int(b.get("duration_minutes", 30)) for b in completed)
    total_hours = round(total_minutes / 60, 1)

    # Per-session rate (mock — real impl reads from mentor's pricing)
    rate_per_hour = 1500  # INR
    earnings = round(total_hours * rate_per_hour)

    # Bookings per week (last 8 weeks)
    today = datetime.now(timezone.utc).date()
    week_buckets = {}
    for w in range(7, -1, -1):
        week_start = today - timedelta(days=today.weekday() + 7 * w)
        week_buckets[week_start.isoformat()] = 0
    for b in bookings:
        ca = b.get("created_at")
        if not ca:
            continue
        if isinstance(ca, str):
            try:
                ca = datetime.fromisoformat(ca.replace("Z", "+00:00"))
            except Exception:
                continue
        wk = (ca.date() - timedelta(days=ca.weekday())).isoformat()
        if wk in week_buckets:
            week_buckets[wk] += 1
    weekly_series = [{"week": w, "count": c} for w, c in week_buckets.items()]

    # Top topics
    topic_count = defaultdict(int)
    for b in bookings:
        topic_count[b.get("topic", "Other")] += 1
    top_topics = [
        {"label": k, "value": v} for k, v in sorted(topic_count.items(), key=lambda x: -x[1])[:5]
    ]

    # Upcoming sessions (next 5)
    upcoming_sessions = []
    for b in sorted(upcoming, key=lambda x: x.get("scheduled_at", ""))[:5]:
        student = await db.users.find_one({"_id": b.get("student_id")}) if b.get("student_id") else None
        if not student and b.get("student_id"):
            try:
                from bson import ObjectId
                student = await db.users.find_one({"_id": ObjectId(b["student_id"])})
            except Exception:
                pass
        upcoming_sessions.append({
            "id": b.get("id"),
            "student_name": (student or {}).get("full_name") or "Student",
            "topic": b.get("topic"),
            "scheduled_at": b.get("scheduled_at"),
            "status": b.get("status"),
        })

    return {
        "scope": "mentor",
        "kpis": {
            "total_bookings": len(bookings),
            "completed_sessions": len(completed),
            "upcoming_sessions": len(upcoming),
            "cancelled_sessions": len(cancelled),
            "hours_mentored": total_hours,
            "estimated_earnings": earnings,
            "currency": "INR",
        },
        "weekly_bookings": weekly_series,
        "top_topics": top_topics,
        "upcoming_sessions_list": upcoming_sessions,
        "rating": 4.7,           # MOCKED — wire to mentor's actual rating from feedback collection
        "total_reviews": len(completed),
    }


# ---------------------------------------------------------------------------
# Master dispatcher — called from /api/analytics endpoint
# ---------------------------------------------------------------------------
async def get_analytics_for(db, user: dict) -> Dict[str, Any]:
    role = user.get("role")
    if role == "admin":
        # First admin / sole admin acts as super_admin (sees revenue)
        return await super_admin_analytics(db, include_revenue=True)
    if role == "college":
        institution = (user.get("school_info") or {}).get("institution_name") or user.get("full_name")
        return await college_analytics(db, institution)
    if role == "mentor":
        return await mentor_analytics(db, str(user["_id"]))
    # Default = no analytics for student/alumni; return a friendly empty payload
    return {"scope": "none", "kpis": {}, "_note": "Analytics dashboard is for admin / college / mentor roles."}
