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


def _iso(ts) -> str:
    """Normalize a timestamp (datetime | str | None) to ISO string for feeds."""
    if ts is None:
        return ""
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00")).isoformat()
        except ValueError:
            return ts
    if isinstance(ts, datetime):
        return ts.isoformat()
    return str(ts)


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
    if role in ("admin", "super_admin"):
        # First admin / sole admin acts as super_admin (sees revenue)
        return await super_admin_analytics(db, include_revenue=True)
    if role == "college":
        institution = (user.get("school_info") or {}).get("institution_name") or user.get("full_name")
        return await college_analytics(db, institution)
    if role == "mentor":
        return await mentor_analytics(db, str(user["_id"]))
    # Default = no analytics for student/alumni; return a friendly empty payload
    return {"scope": "none", "kpis": {}, "_note": "Analytics dashboard is for admin / college / mentor roles."}


# ---------------------------------------------------------------------------
# Comprehensive Super Admin Analytics — real data from all sources
# ---------------------------------------------------------------------------
async def super_admin_full_analytics(db) -> Dict[str, Any]:
    """
    Full analytics payload for the Super Admin dashboard.
    All data is real, sourced from MongoDB collections + Firebase + PostHog.
    """
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    ninety_days_ago = now - timedelta(days=90)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)

    # === KPI Cards ===
    total_signups = await db.users.count_documents({})
    new_signups_30d = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})
    new_signups_last_month = await db.users.count_documents({
        "created_at": {"$gte": last_month_start, "$lt": current_month_start}
    })
    signups_mom_pct = 0
    if new_signups_last_month > 0:
        signups_mom_pct = round((new_signups_30d - new_signups_last_month) / new_signups_last_month * 100, 1)

    active_users_30d_pipeline = [
        {"$match": {"ts": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "total"},
    ]
    active_users_result = await db.activity_events.aggregate(active_users_30d_pipeline).to_list(1)
    active_users_30d = active_users_result[0]["total"] if active_users_result else 0

    total_bookings = await db.bookings.count_documents({})
    total_events = await db.events.count_documents({})
    try:
        total_events_v2 = await db.events_v2.count_documents({})
    except Exception:
        total_events_v2 = 0
    total_echo_regs = await db.echo_registrations.count_documents({})
    revenue_mtd_pipeline = [
        {"$match": {"payment.status": "paid", "created_at": {"$gte": current_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$fee"}}},
    ]
    revenue_result = await db.echo_registrations.aggregate(revenue_mtd_pipeline).to_list(1)
    revenue_mtd = int(revenue_result[0]["total"]) if revenue_result else 0
    revenue_ytd_pipeline = [
        {"$match": {"payment.status": "paid", "created_at": {"$gte": now.replace(month=1, day=1)}}},
        {"$group": {"_id": None, "total": {"$sum": "$fee"}}},
    ]
    revenue_ytd_result = await db.echo_registrations.aggregate(revenue_ytd_pipeline).to_list(1)
    revenue_ytd = int(revenue_ytd_result[0]["total"]) if revenue_ytd_result else 0

    # === User Growth (12 months) ===
    user_growth = []
    cumulative = await db.users.count_documents({"created_at": {"$lt": now - timedelta(days=365)}})
    for i in range(11, -1, -1):
        ref = now - timedelta(days=30 * i)
        m_start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end = (m_start + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count = await db.users.count_documents({"created_at": {"$gte": m_start, "$lt": m_end}})
        cumulative += count
        user_growth.append({
            "month": m_start.strftime("%b"),
            "year": m_start.year,
            "count": count,
            "cumulative": cumulative,
        })

    # === Role Distribution ===
    students = await db.users.count_documents({"role": "student"})
    alumni = await db.users.count_documents({"role": "alumni"})
    mentors = await db.users.count_documents({"role": "mentor"})
    colleges_count = await db.users.count_documents({"role": "college"})
    role_distribution = [
        {"label": "Students", "value": students, "color": "#5F259F"},
        {"label": "Alumni", "value": alumni, "color": "#00A78E"},
        {"label": "Mentors", "value": mentors, "color": "#F4A22C"},
        {"label": "Colleges", "value": colleges_count, "color": "#3B82F6"},
    ]

    # === Engagement (30 days) ===
    eng_pipeline = [
        {"$match": {"ts": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    eng_cats = await db.activity_events.aggregate(eng_pipeline).to_list(8)
    total_activity_30d = await db.activity_events.count_documents({"ts": {"$gte": thirty_days_ago}})
    avg_events = round(total_activity_30d / max(active_users_30d, 1), 1)
    top_categories = []
    for c in eng_cats:
        top_categories.append({
            "category": c["_id"] or "other",
            "count": c["count"],
            "pct": round(c["count"] / max(total_activity_30d, 1) * 100, 1),
        })

    # Daily active users (30 days)
    dau_pipeline = [
        {"$match": {"ts": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}}, "users": {"$addToSet": "$user_id"}}},
        {"$project": {"date": "$_id", "count": {"$size": "$users"}}},
        {"$sort": {"date": 1}},
    ]
    dau_docs = await db.activity_events.aggregate(dau_pipeline).to_list(30)
    daily_active_series = [{"date": d["date"], "count": d["count"]} for d in dau_docs]

    engagement = {
        "total_activity_events_30d": total_activity_30d,
        "unique_active_users_30d": active_users_30d,
        "avg_events_per_user": avg_events,
        "top_categories": top_categories,
        "daily_active_series": daily_active_series,
    }

    # === Device/Browser (from auth_events) ===
    devices = {"by_os": [], "by_browser": [], "by_kind": []}
    try:
        dev_os_pipeline = [
            {"$match": {"event": "login_success", "timestamp": {"$gte": ninety_days_ago}}},
            {"$group": {"_id": "$device_os", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 8},
        ]
        os_docs = await db.auth_events.aggregate(dev_os_pipeline).to_list(8)
        total_logins = sum(d["count"] for d in os_docs) or 1
        devices["by_os"] = [{"label": d["_id"] or "Unknown", "value": d["count"], "pct": round(d["count"] / total_logins * 100, 1)} for d in os_docs]

        dev_br_pipeline = [
            {"$match": {"event": "login_success", "timestamp": {"$gte": ninety_days_ago}}},
            {"$group": {"_id": "$device_browser", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 8},
        ]
        br_docs = await db.auth_events.aggregate(dev_br_pipeline).to_list(8)
        total_br = sum(d["count"] for d in br_docs) or 1
        devices["by_browser"] = [{"label": d["_id"] or "Unknown", "value": d["count"], "pct": round(d["count"] / total_br * 100, 1)} for d in br_docs]

        dev_kind_pipeline = [
            {"$match": {"event": "login_success", "timestamp": {"$gte": ninety_days_ago}}},
            {"$group": {"_id": "$device_kind", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        kind_docs = await db.auth_events.aggregate(dev_kind_pipeline).to_list(5)
        total_kind = sum(d["count"] for d in kind_docs) or 1
        devices["by_kind"] = [{"label": (d["_id"] or "Unknown").title(), "value": d["count"], "pct": round(d["count"] / total_kind * 100, 1)} for d in kind_docs]
    except Exception:
        pass

    # === Geography (from auth_events IP) ===
    geography = {"countries": [], "cities": []}
    try:
        from geo import aggregate_geo_from_db
        geography = await aggregate_geo_from_db(db, days=90)
    except Exception:
        pass

    # === Activation Funnel (real data) ===
    total_users_for_funnel = await db.users.count_documents({})
    total_bookings_for_funnel = await db.bookings.count_documents({})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    repeat_bookings = await db.bookings.count_documents({"status": "completed"})
    # Approximate: profile completion = users with email + full_name
    profile_complete = await db.users.count_documents({"email": {"$ne": ""}, "full_name": {"$ne": ""}})
    funnel = [
        {"label": "Signed up", "v": total_users_for_funnel, "color": "#3B82F6"},
        {"label": "Profile complete", "v": profile_complete, "color": "#A78BFA"},
        {"label": "First booking", "v": total_bookings_for_funnel, "color": "#FB923C"},
        {"label": "Session completed", "v": completed_bookings, "color": "#22C55E"},
    ]

    # === Recent Activity Feed ===
    recent_activity = []
    async for u in db.users.find({}, {"full_name": 1, "role": 1, "created_at": 1}).sort("created_at", -1).limit(5):
        recent_activity.append({
            "type": "signup",
            "title": f"{u.get('full_name') or 'User'} joined as {u.get('role', 'user')}",
            "subtitle": "",
            "timestamp": _iso(u.get("created_at") or now),
        })
    async for b in db.bookings.find({}).sort("created_at", -1).limit(5):
        recent_activity.append({
            "type": "booking",
            "title": f"New booking: {b.get('topic', 'Mentoring')}",
            "subtitle": b.get("status", ""),
            "timestamp": _iso(b.get("created_at") or now),
        })
    async for r in db.echo_registrations.find({}).sort("created_at", -1).limit(5):
        recent_activity.append({
            "type": "echo_reg",
            "title": f"Echo registration: {r.get('full_name', 'Attendee')}",
            "subtitle": r.get("showcase_title", ""),
            "timestamp": _iso(r.get("created_at") or now),
        })
    recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    recent_activity = recent_activity[:15]

    # === Top Colleges ===
    top_colleges_pipeline = [
        {"$match": {"school_info.institution_name": {"$ne": None, "$ne": ""}}},
        {"$group": {
            "_id": "$school_info.institution_name",
            "students": {"$sum": {"$cond": [{"$eq": ["$role", "student"]}, 1, 0]}},
            "alumni": {"$sum": {"$cond": [{"$eq": ["$role", "alumni"]}, 1, 0]}},
            "total": {"$sum": 1},
        }},
        {"$sort": {"total": -1}},
        {"$limit": 10},
    ]
    top_colleges = []
    async for r in db.users.aggregate(top_colleges_pipeline):
        if r["_id"]:
            top_colleges.append({
                "name": r["_id"],
                "students": r["students"],
                "alumni": r["alumni"],
                "total": r["total"],
            })

    return {
        "generated_at": now.isoformat(),
        "kpis": {
            "total_signups": total_signups,
            "active_users_30d": active_users_30d,
            "new_signups_30d": new_signups_30d,
            "signups_mom_pct": signups_mom_pct,
            "total_bookings": total_bookings,
            "revenue_mtd": revenue_mtd,
            "revenue_ytd": revenue_ytd,
            "total_events": total_events + total_events_v2,
            "echo_registrations": total_echo_regs,
        },
        "user_growth": user_growth,
        "role_distribution": role_distribution,
        "engagement": engagement,
        "devices": devices,
        "geography": geography,
        "funnel": funnel,
        "recent_activity": recent_activity,
        "top_colleges": top_colleges,
        # Firebase Analytics data (Google Analytics 4)
        "firebase": await _get_firebase_data(db),
        # PostHog Analytics data
        "posthog": await _get_posthog_data(db),
        # Error tracking
        "errors": await _get_error_data(db),
        # Predictions
        "predictions": _compute_predictions(user_growth),
    }


async def _get_firebase_data(db) -> Dict[str, Any]:
    """Fetch all Firebase / GA4 Analytics data. Config resolved from env + settings."""
    try:
        import firebase_analytics as fa
        import asyncio
        results = await asyncio.gather(
            fa.get_realtime_active_users(db=db),
            fa.get_session_duration(30, db=db),
            fa.get_active_hours(7, db=db),
            fa.get_retention(30, db=db),
            fa.get_page_views(30, db=db),
            fa.get_engagement_metrics(30, db=db),
            fa.get_acquisition(30, db=db),
            fa.get_demographics(30, db=db),
            fa.get_device_data(30, db=db),
            fa.get_daily_active_users(30, db=db),
            return_exceptions=True,
        )
        get = lambda i, default: (results[i] if not isinstance(results[i], Exception) else default)
        return {
            "realtime_active": get(0, {"active_users": 0, "configured": False}),
            "session_duration": get(1, {"avg_duration_sec": 0, "total_sessions": 0, "configured": False}),
            "active_hours": get(2, {"hours": [], "configured": False}),
            "retention": get(3, {"cohorts": [], "configured": False}),
            "page_views": get(4, {"pages": [], "configured": False}),
            "engagement": get(5, {"bounce_rate": 0, "engagement_rate": 0, "views_per_session": 0, "configured": False}),
            "acquisition": get(6, {"sources": [], "configured": False}),
            "demographics": get(7, {"countries": [], "cities": [], "configured": False}),
            "devices": get(8, {"by_os": [], "by_browser": [], "by_device": [], "configured": False}),
            "daily_active": get(9, {"series": [], "configured": False}),
        }
    except Exception as e:
        return {"error": str(e), "configured": False}


async def _get_posthog_data(db) -> Dict[str, Any]:
    """Fetch all PostHog Analytics data (HogQL Query API)."""
    try:
        import posthog_analytics as ph
        return await ph.fetch_posthog(db)
    except Exception as e:
        return {"configured": False, "reason": f"PostHog fetch failed: {str(e)[:200]}"}


async def _get_error_data(db) -> Dict[str, Any]:
    """Get error tracking data from MongoDB."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    try:
        # Count errors from auth_events (failed logins)
        auth_errors = await db.auth_events.count_documents({
            "event": {"$in": ["login_failure", "login_attempt"]},
            "success": False,
            "timestamp": {"$gte": thirty_days_ago},
        })
        # Count from activity_events (if any error type exists)
        activity_errors = await db.activity_events.count_documents({
            "category": "error",
            "ts": {"$gte": thirty_days_ago},
        })
        # Recent errors
        recent_errors = []
        async for e in db.auth_events.find(
            {"success": False, "timestamp": {"$gte": thirty_days_ago}},
            {"event": 1, "reason": 1, "email": 1, "timestamp": 1}
        ).sort("timestamp", -1).limit(10):
            recent_errors.append({
                "type": e.get("event", "unknown"),
                "message": e.get("reason", "Unknown error"),
                "user": e.get("email", ""),
                "timestamp": (e.get("timestamp") or now).isoformat(),
            })
        return {
            "total_errors_30d": auth_errors + activity_errors,
            "auth_errors": auth_errors,
            "activity_errors": activity_errors,
            "recent": recent_errors,
        }
    except Exception:
        return {"total_errors_30d": 0, "auth_errors": 0, "activity_errors": 0, "recent": []}


def _compute_predictions(growth: List[Dict]) -> Dict[str, Any]:
    """Simple linear trend prediction for next 3 months."""
    if len(growth) < 3:
        return {"next_3_months": [], "trend": "insufficient_data"}
    counts = [g["count"] for g in growth]
    # Simple moving average of last 3 months
    avg_recent = sum(counts[-3:]) / 3
    avg_prior = sum(counts[-6:-3]) / 3 if len(counts) >= 6 else avg_recent
    growth_rate = (avg_recent - avg_prior) / max(avg_prior, 1)
    predictions = []
    cumulative = growth[-1]["cumulative"]
    for i in range(1, 4):
        predicted = max(0, round(avg_recent * (1 + growth_rate * i)))
        cumulative += predicted
        predictions.append({
            "month": f"M+{i}",
            "predicted_signups": predicted,
            "cumulative": cumulative,
        })
    return {
        "next_3_months": predictions,
        "trend": "growing" if growth_rate > 0.05 else ("declining" if growth_rate < -0.05 else "stable"),
        "growth_rate_pct": round(growth_rate * 100, 1),
    }
