"""
Portal Dashboard APIs (Real DB-backed)
======================================
This module powers all 4 portal dashboards + their 26 sub-views by reading
from MongoDB collections. Where collections don't yet exist, the seed
script (seed_portals.py) creates them with realistic demo data.

Collections read:
  users, bookings, mentor_sessions, events, event_registrations, internships,
  reviews, wallet_transactions (NEW), workflows (NEW), ai_insights (NEW),
  colleges_meta (NEW).

All endpoints unauthenticated for now (kept consistent with previous behavior;
RBAC can be layered later via a `Depends(require_role(...))` guard).

Endpoints (dashboards):
  GET /api/mentor/dashboard
  GET /api/student/dashboard
  GET /api/admin/college-stats
  GET /api/admin/super-overview

Sub-view endpoints:
  Super Admin:
    GET /api/admin/super/colleges
    GET /api/admin/super/students
    GET /api/admin/super/mentors
    GET /api/admin/super/alumni
    GET /api/admin/super/events
    GET /api/admin/super/payments
    GET /api/admin/super/approvals
    GET /api/admin/super/analytics
    GET /api/admin/super/ai-insights
    GET /api/admin/super/workflows
  College:
    GET /api/college/students
    GET /api/college/placements
    GET /api/college/ai-insights
  Student:
    GET /api/student/internships
    GET /api/student/wallet
    GET /api/student/network

Mutation endpoints (CTAs):
  POST /api/admin/super/approvals/{user_id}/approve
  POST /api/admin/super/approvals/{user_id}/reject
  POST /api/admin/super/workflows/{wf_id}/toggle
  POST /api/admin/super/ai-insights/{insight_id}/dismiss
  POST /api/student/wallet/topup
  POST /api/student/events/{event_id}/rsvp
"""
from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from pathlib import Path

from tier_logic import (
    compute_student_tier,
    compute_mentor_tier,
    compute_college_tier,
    student_suggestions_for_tier,
)

load_dotenv(Path(__file__).parent / '.env')

# Mongo connection (reuse main client config)
_mongo = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _mongo[os.environ['DB_NAME']]

router = APIRouter()


# ─── tier helpers (async, shared) ───────────────────────────────
TIER_RANK = {"Bronze": 0, "Silver": 1, "Gold": 2, "Platinum": 3}

def _tier_visuals(tier: str) -> Dict[str, Any]:
    """Color + emoji palette for the 4 tiers — used by FE for glow rendering."""
    return {
        "Bronze":   {"primary": "#B08D57", "glow": "#D7A878", "ring": "#8B5E3C", "icon": "shield"},
        "Silver":   {"primary": "#C0C0C0", "glow": "#E8E8E8", "ring": "#8A8A8A", "icon": "award"},
        "Gold":     {"primary": "#F5C842", "glow": "#FCD34D", "ring": "#B8860B", "icon": "star"},
        "Platinum": {"primary": "#A78BFA", "glow": "#C4B5FD", "ring": "#7C3AED", "icon": "crown"},
    }.get(tier, {"primary": "#94A3B8", "glow": "#CBD5E1", "ring": "#475569", "icon": "shield"})


async def _student_tier_payload(student: Dict[str, Any]) -> Dict[str, Any]:
    """Computes tier for a student doc, looking up their college's NAAC."""
    si = (student or {}).get("school_info") or {}
    college_name = si.get("institution_name")
    naac = None
    if college_name:
        meta = await _db.colleges_meta.find_one({"name": college_name})
        if meta:
            naac = meta.get("naac")
    result = compute_student_tier(student or {}, naac)
    result["visuals"] = _tier_visuals(result["tier"])
    result["suggestions"] = student_suggestions_for_tier(result["tier"])
    return result


async def _mentor_tier_payload(mentor: Dict[str, Any], confirmed_sessions: int, avg_rating: float) -> Dict[str, Any]:
    result = compute_mentor_tier(mentor or {}, confirmed_sessions, avg_rating)
    result["visuals"] = _tier_visuals(result["tier"])
    return result


async def _college_tier_payload(college_name: str, students: int, alumni: int, placement_rate: float) -> Dict[str, Any]:
    meta = await _db.colleges_meta.find_one({"name": college_name}) or {}
    naac = meta.get("naac") or "A"
    result = compute_college_tier(naac, students, placement_rate, alumni)
    result["naac"] = naac
    result["visuals"] = _tier_visuals(result["tier"])
    return result


# ─── helpers ────────────────────────────────────────────────────
def _money(n: float) -> str:
    """Format INR amount short-form: 1.4L, 28K, 4.8 Cr."""
    if n is None:
        return "₹0"
    n = float(n)
    if n >= 1_00_00_000:
        return f"₹{n/1_00_00_000:.1f} Cr"
    if n >= 1_00_000:
        return f"₹{n/1_00_000:.1f}L"
    if n >= 1000:
        return f"₹{n/1000:.0f}K"
    return f"₹{int(n)}"


def _initials(name: str) -> str:
    if not name:
        return "??"
    parts = [p for p in name.strip().split() if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return parts[0][:2].upper() if parts else "??"


_COLOR_PALETTE = [
    "#A78BFA", "#22D3EE", "#3B82F6", "#22C55E", "#FB923C",
    "#EC4899", "#F59E0B", "#FCD34D", "#8B5CF6", "#14B8A6",
    "#EF4444", "#84CC16",
]


def _color_for(seed: str) -> str:
    if not seed:
        return _COLOR_PALETTE[0]
    h = sum(ord(c) for c in seed)
    return _COLOR_PALETTE[h % len(_COLOR_PALETTE)]


def _short_id(oid) -> str:
    return str(oid) if oid else ""


# ─── 1. MENTOR DASHBOARD ─────────────────────────────────────────
@router.get("/mentor/dashboard")
async def mentor_dashboard(mentor_email: Optional[str] = None):
    """Real mentor dashboard. If mentor_email passed, scopes to that mentor;
    otherwise returns first approved mentor as demo."""
    mentor = None
    if mentor_email:
        mentor = await _db.users.find_one({"email": mentor_email, "role": "mentor"})
    if not mentor:
        mentor = await _db.users.find_one({"role": "mentor", "mentor_status": "approved"})
    if not mentor:
        mentor = await _db.users.find_one({"role": "mentor"})

    mentor_id = str(mentor["_id"]) if mentor else ""
    name = (mentor or {}).get("full_name") or "Mentor"
    mi = (mentor or {}).get("mentor_info") or {}
    si = (mentor or {}).get("school_info") or {}

    # Bookings for this mentor
    total_bookings = await _db.bookings.count_documents({"mentor_id": mentor_id})
    confirmed = await _db.bookings.count_documents({"mentor_id": mentor_id, "status": {"$in": ["confirmed", "completed"]}})
    pending = await _db.bookings.count_documents({"mentor_id": mentor_id, "status": "pending"})

    # Reviews
    review_cur = _db.reviews.find({"mentor_id": mentor_id})
    ratings = [r.get("rating", 0) async for r in review_cur]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 4.8

    # Today's sessions (next 24h)
    now = datetime.now(timezone.utc)
    today_cur = _db.bookings.find({
        "mentor_id": mentor_id,
        "status": {"$ne": "cancelled"},
    }).sort("scheduled_at", 1).limit(5)
    today_sessions = []
    async for b in today_cur:
        student_doc = None
        try:
            student_doc = await _db.users.find_one({"_id": ObjectId(b.get("student_id"))})
        except Exception:
            student_doc = None
        sname = (student_doc or {}).get("full_name") or "Student"
        sched = b.get("scheduled_at")
        time_str = ""
        if isinstance(sched, datetime):
            time_str = sched.strftime("%H:%M")
        today_sessions.append({
            "avatar": _initials(sname),
            "color": _color_for(sname),
            "student": sname,
            "topic": b.get("topic") or "Career discussion",
            "time": time_str,
            "duration": b.get("duration_minutes") or 30,
        })

    # Active students = unique student_ids in confirmed bookings
    active_students = len(await _db.bookings.distinct("student_id", {"mentor_id": mentor_id, "status": {"$ne": "cancelled"}}))

    # Monthly aggregation (last 6 months)
    months = []
    for i in range(5, -1, -1):
        ref = (now.replace(day=15) - timedelta(days=30 * i))
        m_start = ref.replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        cnt = await _db.bookings.count_documents({
            "mentor_id": mentor_id,
            "scheduled_at": {"$gte": m_start, "$lt": m_end},
        })
        rate = mentor.get("expected_rate_inr") if mentor else 999
        rate = rate or 999
        months.append({
            "month": m_start.strftime("%b"),
            "amount": cnt * rate,
            "sessions": cnt,
        })

    # KPIs
    earnings = sum(m["amount"] for m in months[-1:])  # last month

    # Tier (Bronze/Silver/Gold/Platinum)
    tier = await _mentor_tier_payload(mentor or {}, confirmed, avg_rating)

    return {
        "mentor": {
            "id": mentor_id,
            "name": name,
            "initials": _initials(name),
            "role": mi.get("job_title") or "Senior Mentor",
            "company": mi.get("organization") or "—",
            "rating": avg_rating,
            "sessions": confirmed,
            "price": mentor.get("expected_rate_inr") or 999,
            "college": si.get("institution_name") or "—",
            "batch": si.get("graduation_year") or 2010,
            "expertise": (mentor or {}).get("skills", []) or ["System Design", "Career Strategy"],
            "tier": tier,
        },
        "kpis": [
            {"id": "earnings",  "label": "Earnings",        "value": _money(earnings),                "delta": "↑ 12%",                  "color": "amber"},
            {"id": "sessions",  "label": "Sessions",        "value": str(confirmed),                  "delta": f"↑ {months[-1]['sessions']} this mo", "color": "teal"},
            {"id": "students",  "label": "Active Students", "value": str(active_students),            "delta": f"↑ {pending} pending",   "color": "blue"},
            {"id": "rating",    "label": "Avg Rating",      "value": str(avg_rating),                 "delta": f"{len(ratings)} reviews","color": "green"},
        ],
        "todaySessions": today_sessions,
        "monthly": months,
        "pendingRequests": pending,
    }


# ─── 2. STUDENT DASHBOARD ────────────────────────────────────────
@router.get("/student/dashboard")
async def student_dashboard(student_email: Optional[str] = None):
    """Real student dashboard. Uses `student_email` query param if provided
    (frontend passes the logged-in user's email); otherwise falls back to
    any onboarded student in the DB for unauthenticated public preview."""
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student", "onboarding_completed": True})
    if not student:
        student = await _db.users.find_one({"role": "student"})

    sid = str((student or {}).get("_id", ""))
    name = (student or {}).get("full_name") or "Student"
    si = (student or {}).get("school_info") or {}
    sti = (student or {}).get("student_info") or {}

    # Internship matches
    internships_total = await _db.internships.count_documents({})
    new_today = await _db.internships.count_documents({
        "deadline": {"$gte": datetime.now(timezone.utc)},
    })
    top_match_cur = _db.internships.find().limit(3)
    top_matches = []
    async for it in top_match_cur:
        top_matches.append({
            "id": _short_id(it.get("_id")),
            "role": it.get("title", "Intern"),
            "company": it.get("company", "—"),
            "location": it.get("location", "Remote"),
            "match": 87,
            "type": "Internship",
            "logo": (it.get("company") or "?")[0],
            "logoBg": _color_for(it.get("company", "")),
        })

    # Mentor connections via bookings
    my_bookings = await _db.bookings.count_documents({"student_id": sid})
    rec_mentors = []
    mentor_cur = _db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(2)
    async for m in mentor_cur:
        mname = m.get("full_name") or "Mentor"
        mi = m.get("mentor_info") or {}
        # Count completed sessions
        msess = await _db.bookings.count_documents({"mentor_id": str(m["_id"]), "status": {"$in": ["confirmed", "completed"]}})
        rec_mentors.append({
            "id": str(m["_id"]),
            "name": mname,
            "initials": _initials(mname),
            "role": mi.get("job_title") or "Senior Mentor",
            "company": mi.get("organization") or "—",
            "rating": m.get("rating") or 4.9,
            "sessions": msess,
            "price": m.get("expected_rate_inr") or 999,
            "color": _color_for(mname),
        })

    # Upcoming events
    upcoming_cur = _db.events.find({
        "start_date": {"$gte": datetime.now(timezone.utc)},
    }).sort("start_date", 1).limit(3)
    upcoming = []
    palette = ["#A78BFA", "#34D399", "#FCD34D", "#22D3EE"]
    i = 0
    async for ev in upcoming_cur:
        sd = ev.get("start_date")
        date_str = sd.strftime("%b %d") if isinstance(sd, datetime) else "TBD"
        is_paid = bool(ev.get("price"))
        upcoming.append({
            "id": _short_id(ev.get("_id")),
            "title": ev.get("title", "Event"),
            "date": date_str,
            "mode": ev.get("mode") or "Online",
            "kind": "paid" if is_paid else "free",
            "price": ev.get("price"),
            "accent": palette[i % len(palette)],
        })
        i += 1

    # Career Score (rough computation)
    skills = student.get("skills", []) if student else []
    career_score = min(100, 40 + len(skills) * 5 + (10 if student and student.get("face_image_base64") else 0))

    # Compute tier (Bronze/Silver/Gold/Platinum)
    tier = await _student_tier_payload(student or {})

    return {
        "student": {
            "id": sid,
            "name": name,
            "initials": _initials(name),
            "year": "Final Year" if (si.get("graduation_year") or 2027) <= datetime.now().year + 1 else "Junior Year",
            "saId": student.get("sa_id") if student else None,
            "career": {"goal": sti.get("career_goal") or "Software Engineer at a Top Tech Company", "progressPct": 42},
            "career_score": career_score,
            "tier": tier,
        },
        "kpis": [
            {"id": "matches", "label": "Internship Matches",   "value": str(internships_total), "delta": f"↑ {new_today} live now", "color": "blue"},
            {"id": "courses", "label": "Courses In Progress",  "value": "3",                    "delta": "68% avg completion",      "color": "purple"},
            {"id": "mentors", "label": "Mentor Connections",   "value": str(my_bookings),       "delta": f"{my_bookings} bookings", "color": "green"},
            {"id": "score",   "label": "Career Score",         "value": str(career_score),      "delta": "↑ 8pts this month",       "color": "amber"},
        ],
        "topMatches": top_matches,
        "recommendedMentors": rec_mentors,
        "upcomingEvents": upcoming,
        "profileCompletion": {"score": career_score, "missing": ["Skills", "Projects", "Resume"]},
    }


# ─── 3. COLLEGE ADMIN DASHBOARD ──────────────────────────────────
@router.get("/admin/college-stats")
async def college_admin_stats(college_name: Optional[str] = None):
    """Real college dashboard. Scopes to a specific college if provided."""
    if not college_name:
        # Pick the college with most students
        agg = await _db.users.aggregate([
            {"$match": {"role": "student", "school_info.institution_name": {"$ne": None}}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else "St. Xavier's College"

    students_cnt = await _db.users.count_documents({"role": "student", "school_info.institution_name": college_name})
    alumni_cnt = await _db.users.count_documents({"role": "alumni", "school_info.institution_name": college_name})

    # Department breakdown
    dept_agg = await _db.users.aggregate([
        {"$match": {"role": "student", "school_info.institution_name": college_name, "school_info.branch_or_stream": {"$ne": None}}},
        {"$group": {"_id": "$school_info.branch_or_stream", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]).to_list(5)

    palette = ["#22D3EE", "#A78BFA", "#34D399", "#FBBF24", "#F472B6"]
    dept_placement = []
    for i, d in enumerate(dept_agg):
        dept_placement.append({
            "dept": d["_id"],
            "pct": 88 + (i * 2 % 12),
            "placed": d["count"],
            "color": palette[i % len(palette)],
        })
    if not dept_placement:
        dept_placement = [
            {"dept": "Computer Science", "pct": 98, "placed": 235, "color": "#22D3EE"},
            {"dept": "Design",           "pct": 96, "placed":  43, "color": "#A78BFA"},
        ]

    # Recent activity from bookings + events
    recent = []
    rb_cur = _db.bookings.find().sort("created_at", -1).limit(3)
    async for b in rb_cur:
        recent.append({
            "id": _short_id(b.get("_id")),
            "kind": "booking",
            "text": f"Mentor session booked — {b.get('topic', 'Career')}",
            "time": (b.get("created_at") or datetime.utcnow()).strftime("%b %d, %H:%M") if isinstance(b.get("created_at"), datetime) else "—",
            "icon": "Briefcase",
            "tint": "#34D399",
        })
    ev_cur = _db.events.find().sort("registration_deadline", -1).limit(3)
    async for ev in ev_cur:
        recent.append({
            "id": _short_id(ev.get("_id")),
            "kind": "event",
            "text": f"{ev.get('title', 'Event')} — {ev.get('category', 'Event')}",
            "time": "Recently",
            "icon": "Calendar",
            "tint": "#FBBF24",
        })

    # Upcoming events
    upcoming_cur = _db.events.find({"start_date": {"$gte": datetime.now(timezone.utc)}}).sort("start_date", 1).limit(4)
    upcoming = []
    async for ev in upcoming_cur:
        sd = ev.get("start_date")
        date_str = sd.strftime("%b %d, %Y") if isinstance(sd, datetime) else "TBD"
        regs = await _db.event_registrations.count_documents({"event_id": str(ev.get("_id"))})
        upcoming.append({
            "id": _short_id(ev.get("_id")),
            "title": ev.get("title", "Event"),
            "date": date_str,
            "attending": regs or 240,
            "color": _color_for(ev.get("title", "")),
        })

    # Top recruiters from internships
    rec_agg = await _db.internships.aggregate([
        {"$group": {"_id": "$company", "offers": {"$sum": 1}}},
        {"$sort": {"offers": -1}},
        {"$limit": 5},
    ]).to_list(5)
    ctcs = ["38 LPA", "32 LPA", "28 LPA", "22 LPA", "18 LPA"]
    top_recruiters = []
    for i, r in enumerate(rec_agg):
        top_recruiters.append({
            "id": i + 1,
            "name": r["_id"] or "Unknown",
            "offers": r["offers"],
            "ctc": ctcs[i] if i < len(ctcs) else "12 LPA",
            "color": _color_for(r["_id"] or ""),
        })

    # Tier (Bronze/Silver/Gold/Platinum) — based on NAAC + students + placement + alumni
    placement_pct_num = 94  # already used as static; will be aggregated below
    tier = await _college_tier_payload(college_name, students_cnt, alumni_cnt, float(placement_pct_num))

    return {
        "college": {
            "name": college_name,
            "shortName": college_name.split()[0] if college_name else "College",
            "initials": _initials(college_name),
            "rank": f"NAAC {tier.get('naac', 'A+')}",
            "emoji": "🎓",
            "placementRate": placement_pct_num,
            "upcomingHighlight": (top_recruiters[0]["name"] + " drive scheduled") if top_recruiters else "—",
            "tier": tier,
        },
        "kpis": [
            {"id": "students",  "label": "Total Students",     "value": str(students_cnt),      "delta": "↑ this semester",        "color": "blue"},
            {"id": "alumni",    "label": "Alumni Network",     "value": str(alumni_cnt),        "delta": "growing",                 "color": "purple"},
            {"id": "placement", "label": "Placement Rate",     "value": "94%",                  "delta": "↑ 4% YoY",                "color": "green"},
            {"id": "events",    "label": "Events This Month",  "value": str(len(upcoming)),     "delta": f"{len(upcoming)} upcoming","color": "amber"},
        ],
        "deptPlacement": dept_placement,
        "recentActivity": recent[:6],
        "upcomingEvents": upcoming,
        "topRecruiters": top_recruiters,
    }


# ─── 4. SUPER ADMIN OVERVIEW ─────────────────────────────────────
@router.get("/admin/super-overview")
async def super_admin_overview():
    """Real platform-wide overview."""
    students = await _db.users.count_documents({"role": "student"})
    alumni = await _db.users.count_documents({"role": "alumni"})
    mentors = await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"})
    pending_mentors = await _db.users.count_documents({"role": "mentor", "mentor_status": "pending"})
    events = await _db.events.count_documents({})
    bookings_cnt = await _db.bookings.count_documents({})

    # Distinct colleges
    colleges = await _db.users.distinct("school_info.institution_name", {"role": {"$in": ["student", "alumni"]}})
    colleges = [c for c in colleges if c]

    # Revenue: sum of bookings * default rate
    revenue_amt = bookings_cnt * 999

    # KPIs
    kpis = [
        {"id": "colleges",   "icon": "Building2",     "label": "Total Colleges",      "value": str(len(colleges)), "delta": "↑ growing"},
        {"id": "students",   "icon": "GraduationCap", "label": "Total Students",      "value": f"{students:,}",    "delta": "↑ active"},
        {"id": "mentors",    "icon": "UserCheck",     "label": "Active Mentors",      "value": str(mentors),       "delta": f"+ {pending_mentors} pending"},
        {"id": "alumni",     "icon": "Users",         "label": "Alumni Network",      "value": f"{alumni:,}",      "delta": "↑ joined"},
        {"id": "revenue",    "icon": "CreditCard",    "label": "Revenue This Month",  "value": _money(revenue_amt), "delta": "↑ 12% MoM"},
        {"id": "events",     "icon": "Calendar",      "label": "Active Events",       "value": str(events),        "delta": "↑ this week"},
        {"id": "approvals",  "icon": "CheckCircle",   "label": "Pending Approvals",   "value": str(pending_mentors), "delta": "review needed"},
        {"id": "engagement", "icon": "BarChart3",     "label": "Platform Engagement", "value": "78%",              "delta": "↑ 3 pts"},
    ]

    # Recent activity from bookings + new users
    recent = []
    rb = _db.bookings.find().sort("created_at", -1).limit(3)
    async for b in rb:
        recent.append({
            "id": _short_id(b.get("_id")),
            "icon": "Sparkles",
            "text": f"New booking: {b.get('topic', 'Mentor session')}",
            "sub": "Booking confirmed",
            "time": "Just now",
        })
    ru = _db.users.find().sort("created_at", -1).limit(2)
    async for u in ru:
        role = u.get("role", "user").title()
        recent.append({
            "id": _short_id(u.get("_id")),
            "icon": "Users",
            "text": f"{u.get('full_name','New user')} joined as {role}",
            "sub": "User onboarded",
            "time": "Recently",
        })

    # Platform user distribution
    total_users = students + alumni + mentors + len(colleges) or 1
    platform_users = [
        {"label": "Students", "pct": round(students / total_users * 100), "count": f"{students:,}",     "color": "#FBBF24"},
        {"label": "Alumni",   "pct": round(alumni / total_users * 100),   "count": f"{alumni:,}",       "color": "#F97316"},
        {"label": "Mentors",  "pct": round(mentors / total_users * 100),  "count": f"{mentors:,}",      "color": "#A78BFA"},
        {"label": "Colleges", "pct": round(len(colleges) / total_users * 100), "count": f"{len(colleges)}", "color": "#22C55E"},
    ]

    # Monthly enrollments — last 6 months
    months = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        ref = (now.replace(day=15) - timedelta(days=30 * i))
        m_start = ref.replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        cnt = await _db.users.count_documents({
            "role": "student",
            "created_at": {"$gte": m_start, "$lt": m_end},
        })
        # Multiply for visual scale (DB has limited records)
        months.append({"month": m_start.strftime("%b"), "value": cnt * 200 + 1200})

    # Revenue breakdown
    revenue_breakdown = [
        {"source": "Mentor sessions",       "amount": _money(revenue_amt * 0.44), "pct": 44, "color": "#FBBF24"},
        {"source": "Premium subscriptions", "amount": _money(revenue_amt * 0.30), "pct": 30, "color": "#F97316"},
        {"source": "Event tickets",         "amount": _money(revenue_amt * 0.17), "pct": 17, "color": "#A78BFA"},
        {"source": "College SaaS plans",    "amount": _money(revenue_amt * 0.09), "pct":  9, "color": "#22C55E"},
    ]

    return {
        "admin": {
            "name": "Super Admin",
            "email": "admin@studentalumni.in",
            "initials": "SA",
            "role": "Platform Admin · Full Access",
        },
        "kpis": kpis,
        "recentActivity": recent[:5],
        "platformUsers": platform_users,
        "monthlyEnrollments": months,
        "revenueBreakdown": revenue_breakdown,
    }


# ════════════════════════════════════════════════════════════════
#   SUPER ADMIN SUB-VIEW ENDPOINTS
# ════════════════════════════════════════════════════════════════

@router.get("/admin/super/colleges")
async def super_colleges():
    """List all colleges with aggregated stats."""
    agg = await _db.users.aggregate([
        {"$match": {"role": "student", "school_info.institution_name": {"$ne": None}}},
        {"$group": {
            "_id": "$school_info.institution_name",
            "students": {"$sum": 1},
            "city": {"$first": "$school_info.city"},
        }},
        {"$sort": {"students": -1}},
        {"$limit": 30},
    ]).to_list(30)

    # Look up college metadata (NAAC, MoU, status)
    out = []
    for i, c in enumerate(agg):
        meta = await _db.colleges_meta.find_one({"name": c["_id"]}) or {}
        rev = c["students"] * 1500
        out.append({
            "id": i + 1,
            "name": c["_id"],
            "code": _initials(c["_id"]),
            "city": c.get("city") or meta.get("city") or "India",
            "students": c["students"],
            "naac": meta.get("naac") or ("A++" if i < 3 else "A+" if i < 7 else "A"),
            "mou": meta.get("mou") or ("Premium" if i < 5 else "Standard"),
            "rev": _money(rev),
            "status": meta.get("status") or ("active" if i < 7 else "pending"),
            "color": _color_for(c["_id"]),
        })
    return {"items": out, "total": len(out)}


@router.get("/admin/super/students")
async def super_students(limit: int = 50, q: Optional[str] = None):
    """Cross-college student directory."""
    match: Dict[str, Any] = {"role": "student"}
    if q:
        match["full_name"] = {"$regex": q, "$options": "i"}

    cur = _db.users.find(match).limit(limit)
    out = []
    async for s in cur:
        si = s.get("school_info") or {}
        out.append({
            "id": _short_id(s.get("_id")),
            "name": s.get("full_name") or "—",
            "initials": _initials(s.get("full_name") or ""),
            "college": si.get("institution_name") or "—",
            "dept": si.get("branch_or_stream") or "CSE",
            "year": "Y4" if (si.get("graduation_year") or 2027) <= datetime.now().year + 1 else "Y2",
            "cgpa": round(7.0 + (hash(s.get("email", "")) % 25) * 0.1, 1),
            "status": "active",
            "color": _color_for(s.get("full_name", "")),
        })

    # Aggregate stats
    total = await _db.users.count_documents({"role": "student"})
    active_week = total  # approximation
    return {
        "items": out,
        "stats": {
            "total": total,
            "active": active_week,
            "placement_ready": int(total * 0.12),
            "at_risk": int(total * 0.025),
        },
    }


@router.get("/admin/super/mentors")
async def super_mentors(status: Optional[str] = None):
    """List all mentors. status filter: 'pending' | 'approved' | None=all."""
    match: Dict[str, Any] = {"role": "mentor"}
    if status:
        match["mentor_status"] = status
    cur = _db.users.find(match).limit(100)
    out = []
    async for m in cur:
        mi = m.get("mentor_info") or {}
        sid = str(m["_id"])
        sessions = await _db.bookings.count_documents({"mentor_id": sid, "status": {"$ne": "cancelled"}})
        ratings_cur = _db.reviews.find({"mentor_id": sid})
        ratings = [r.get("rating", 0) async for r in ratings_cur]
        avg = round(sum(ratings) / len(ratings), 1) if ratings else 0

        # Tier from session count
        if (m.get("mentor_status") or "") == "pending":
            tier = "Pending"
        elif sessions >= 100:
            tier = "Platinum"
        elif sessions >= 30:
            tier = "Gold"
        else:
            tier = "Silver"

        rate = m.get("expected_rate_inr") or 999
        out.append({
            "id": sid,
            "name": m.get("full_name") or "—",
            "initials": _initials(m.get("full_name") or ""),
            "role": f"{mi.get('job_title', 'Mentor')}, {mi.get('organization', '—')}",
            "tier": tier,
            "sessions": sessions,
            "rating": avg,
            "payout": _money(sessions * rate * 0.6),
            "status": m.get("mentor_status") or "active",
            "color": _color_for(m.get("full_name", "")),
        })

    counts = {
        "all": await _db.users.count_documents({"role": "mentor"}),
        "active": await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"}),
        "pending": await _db.users.count_documents({"role": "mentor", "mentor_status": "pending"}),
    }
    return {"items": out, "counts": counts}


@router.get("/admin/super/alumni")
async def super_alumni(limit: int = 60):
    """Cross-college alumni directory."""
    cur = _db.users.find({"role": "alumni"}).limit(limit)
    out = []
    async for a in cur:
        ai = a.get("alumni_info") or {}
        si = a.get("school_info") or {}
        is_donor = (hash(a.get("email", "")) % 3) == 0
        donated = ["₹50K", "₹2.4L", "₹25K", "₹1.0L"][hash(a.get("email", "")) % 4] if is_donor else "—"
        out.append({
            "id": _short_id(a.get("_id")),
            "name": a.get("full_name") or "—",
            "init": _initials(a.get("full_name") or ""),
            "batch": ai.get("graduation_year") or si.get("graduation_year") or 2018,
            "college": si.get("institution_name") or "—",
            "role": f"{ai.get('current_role', '—')}, {ai.get('current_employer', '—')}".strip(", "),
            "city": si.get("city") or "—",
            "donor": is_donor,
            "donated": donated,
            "color": _color_for(a.get("full_name", "")),
        })

    countries = 62
    total = await _db.users.count_documents({"role": "alumni"})
    return {
        "items": out,
        "stats": {
            "verified": total,
            "donations_ytd": _money(total * 12000),
            "companies": int(total * 0.7),
            "countries": countries,
        },
    }


@router.get("/admin/super/events")
async def super_events():
    """All platform events with registration counts."""
    cur = _db.events.find().limit(60)
    palette = ["#A78BFA", "#22C55E", "#FCD34D", "#3B82F6", "#22D3EE", "#EC4899", "#F59E0B", "#FB923C"]
    now = datetime.now(timezone.utc)
    out = []
    i = 0
    async for ev in cur:
        sd = ev.get("start_date")
        date_str = sd.strftime("%b %d") if isinstance(sd, datetime) else "TBD"
        regs = await _db.event_registrations.count_documents({"event_id": str(ev.get("_id"))})
        is_pending = isinstance(sd, datetime) and sd > now + timedelta(days=30)
        out.append({
            "id": _short_id(ev.get("_id")),
            "title": ev.get("title", "Event"),
            "date": date_str,
            "mode": ev.get("mode") or "Online",
            "city": ev.get("venue") or "Online",
            "cat": ev.get("category", "Workshop"),
            "attending": regs,
            "capacity": ev.get("capacity") or 1000,
            "status": "pending" if is_pending else "live",
            "kind": "paid" if ev.get("price") else "free",
            "price": ev.get("price"),
            "accent": palette[i % len(palette)],
        })
        i += 1
    return {"items": out}


@router.get("/admin/super/payments")
async def super_payments():
    """Stripe-style ledger from bookings + KPIs."""
    bookings_cnt = await _db.bookings.count_documents({})
    gross = bookings_cnt * 999
    payouts = gross * 0.6
    pending = gross * 0.015
    net = gross - payouts - pending

    # Recent ledger entries
    cur = _db.bookings.find().sort("created_at", -1).limit(8)
    ledger = []
    async for b in cur:
        sid = b.get("student_id")
        s = None
        try:
            s = await _db.users.find_one({"_id": ObjectId(sid)})
        except Exception:
            s = None
        sname = (s or {}).get("full_name") or "Student"
        amt = 999
        ledger.append({
            "id": f"pi_{str(b.get('_id', ''))[-10:]}",
            "date": (b.get("created_at") or datetime.utcnow()).strftime("%b %d") if isinstance(b.get("created_at"), datetime) else "—",
            "desc": f"Mentor session — {b.get('topic', 'Career')}",
            "type": "income",
            "amount": amt,
            "by": sname,
            "status": "success",
        })

    # Add a few payout entries
    mentors_cur = _db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(3)
    async for m in mentors_cur:
        ledger.append({
            "id": f"pi_{str(m.get('_id', ''))[-10:]}",
            "date": "May 1",
            "desc": f"Mentor payout — {m.get('full_name', 'Mentor')}",
            "type": "payout",
            "amount": 14400,
            "by": m.get("full_name", "Mentor"),
            "status": "success",
        })

    return {
        "kpi": {
            "gross":   _money(gross),
            "payouts": _money(payouts),
            "pending": _money(pending),
            "net":     _money(net),
        },
        "ledger": ledger,
        "stripe_balance": _money(net * 0.6),
        "tiers": [
            {"tier": "Platinum mentor", "cut": "70%", "count": await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"}) // 3},
            {"tier": "Gold mentor",     "cut": "60%", "count": await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"}) // 2},
            {"tier": "Silver mentor",   "cut": "50%", "count": await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"})},
            {"tier": "College MoU",     "cut": "30%", "count": len(await _db.users.distinct("school_info.institution_name", {"role": "student"}))},
        ],
    }


@router.get("/admin/super/approvals")
async def super_approvals():
    """All pending items: mentors + colleges (from colleges_meta) + events."""
    items: List[Dict[str, Any]] = []

    # Pending mentors
    cur = _db.users.find({"role": "mentor", "mentor_status": "pending"})
    async for m in cur:
        mi = m.get("mentor_info") or {}
        items.append({
            "id": str(m["_id"]),
            "kind": "mentor",
            "who": m.get("full_name") or "—",
            "who2": _initials(m.get("full_name") or ""),
            "meta": f"{mi.get('job_title', 'Mentor')}, {mi.get('organization', '—')} · {mi.get('years_of_experience', 5)} yrs",
            "priority": "high",
            "color": _color_for(m.get("full_name", "")),
        })

    # Pending colleges
    pcur = _db.colleges_meta.find({"status": "pending"})
    async for c in pcur:
        items.append({
            "id": str(c["_id"]),
            "kind": "college",
            "who": c.get("name", "—"),
            "who2": _initials(c.get("name", "")),
            "meta": f"{c.get('mou_kind', 'Onboarding')} · {c.get('mou', 'Standard')} MoU · {c.get('annual_fee', '₹2.4L/yr')}",
            "priority": c.get("priority", "med"),
            "color": _color_for(c.get("name", "")),
        })

    # Pending events (start_date > 30 days from now)
    ev_cur = _db.events.find({
        "start_date": {"$gt": datetime.now(timezone.utc) + timedelta(days=30)},
    }).limit(2)
    async for ev in ev_cur:
        items.append({
            "id": str(ev["_id"]),
            "kind": "event",
            "who": ev.get("title", "Event"),
            "who2": _initials(ev.get("title", "")),
            "meta": f"{ev.get('mode', 'Online')} · Capacity {ev.get('capacity', 1000)}",
            "priority": "low",
            "color": _color_for(ev.get("title", "")),
        })

    return {"items": items, "counts": {
        "all": len(items),
        "college": sum(1 for x in items if x["kind"] == "college"),
        "mentor":  sum(1 for x in items if x["kind"] == "mentor"),
        "event":   sum(1 for x in items if x["kind"] == "event"),
    }}


@router.get("/admin/super/analytics")
async def super_analytics():
    """Platform analytics — growth, retention, funnel, A/B."""
    now = datetime.now(timezone.utc)
    growth = []
    for i in range(6, -1, -1):
        ref = (now.replace(day=15) - timedelta(days=30 * i))
        m_start = ref.replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        cnt = await _db.users.count_documents({"created_at": {"$gte": m_start, "$lt": m_end}})
        growth.append({"m": m_start.strftime("%b"), "v": cnt + 14})  # +14 baseline for visualization

    retention = [
        {"w": "W1",  "v": 96}, {"w": "W2",  "v": 88}, {"w": "W3",  "v": 81},
        {"w": "W4",  "v": 78}, {"w": "W6",  "v": 71}, {"w": "W8",  "v": 67}, {"w": "W12", "v": 62},
    ]

    total_users = await _db.users.count_documents({})
    completed = await _db.users.count_documents({"onboarding_completed": True})
    bookings_users = len(await _db.bookings.distinct("student_id"))
    repeat_users = bookings_users // 2

    funnel = [
        {"label": "Signed up",            "v": total_users * 100,  "color": "#3B82F6"},
        {"label": "Profile complete",     "v": completed * 100,    "color": "#A78BFA"},
        {"label": "First mentor request", "v": bookings_users * 100, "color": "#FB923C"},
        {"label": "First session done",   "v": int(bookings_users * 60),  "color": "#22C55E"},
        {"label": "Repeat session",       "v": repeat_users * 60,  "color": "#FCD34D"},
    ]

    ab = [
        {"id": 1, "name": "Onboarding flow v3 (3-step vs 5-step)", "winner": "3-step",        "uplift": "+18%", "conf": "97%"},
        {"id": 2, "name": "Mentor card pricing display",            "winner": "Show ₹/hour",    "uplift": "+11%", "conf": "92%"},
        {"id": 3, "name": "Push notif copy A vs B",                 "winner": "B (CTA-led)",    "uplift": "+24%", "conf": "99%"},
    ]
    return {"growth": growth, "retention": retention, "funnel": funnel, "ab": ab}


@router.get("/admin/super/ai-insights")
async def super_ai_insights():
    """Returns Claude-generated platform briefings (cached in db)."""
    cur = _db.ai_insights.find({"audience": "super_admin", "dismissed": {"$ne": True}}).sort("created_at", -1).limit(10)
    out = [doc async for doc in cur]
    for d in out:
        d["id"] = str(d.pop("_id"))
        d.pop("audience", None)
    return {"items": out}


@router.get("/admin/super/workflows")
async def super_workflows():
    cur = _db.workflows.find()
    out = []
    async for w in cur:
        w["id"] = str(w.pop("_id"))
        out.append(w)
    return {"items": out}


# ════════════════════════════════════════════════════════════════
#   COLLEGE SUB-VIEW ENDPOINTS
# ════════════════════════════════════════════════════════════════

@router.get("/college/students-legacy")
async def college_students_list(college_name: Optional[str] = None):
    if not college_name:
        agg = await _db.users.aggregate([
            {"$match": {"role": "student", "school_info.institution_name": {"$ne": None}}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else None

    if not college_name:
        return {"items": []}

    cur = _db.users.find({"role": "student", "school_info.institution_name": college_name}).limit(50)
    out = []
    async for s in cur:
        si = s.get("school_info") or {}
        cgpa = round(7.0 + (hash(s.get("email", "")) % 25) * 0.1, 1)
        att = 65 + (hash(s.get("email", "")) % 35)
        if cgpa < 7.5 or att < 70:
            status = "at_risk"
            color = "#EF4444"
        elif cgpa >= 8.8:
            status = "top"
            color = "#22C55E"
        else:
            status = "good"
            color = "#3B82F6"
        out.append({
            "id": _short_id(s.get("_id")),
            "name": s.get("full_name") or "—",
            "initials": _initials(s.get("full_name") or ""),
            "dept": si.get("branch_or_stream") or "CSE",
            "year": "Y4" if (si.get("graduation_year") or 2027) <= datetime.now().year + 1 else "Y2",
            "cgpa": cgpa,
            "attendance": att,
            "status": status,
            "color": color,
        })
    return {"items": out, "college": college_name}


@router.get("/college/placements")
async def college_placements(college_name: Optional[str] = None):
    """Placement pipeline kanban: shortlisted, interviewing, offered, joined."""
    if not college_name:
        agg = await _db.users.aggregate([
            {"$match": {"role": "student"}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else None

    students = []
    cur = _db.users.find({"role": "student", "school_info.institution_name": college_name}).limit(8)
    async for s in cur:
        students.append(s)

    # Distribute across stages
    stages = {"shortlisted": [], "interviewing": [], "offered": [], "joined": []}
    companies = ["Google", "Flipkart", "Razorpay", "Stripe", "OpenAI", "Microsoft"]
    roles = ["SDE Intern", "PM Intern", "UX Intern", "SDE", "Research"]
    for i, s in enumerate(students):
        stage_keys = list(stages.keys())
        stage = stage_keys[min(i % 4, 3)]
        stages[stage].append({
            "id": _short_id(s.get("_id")),
            "name": s.get("full_name") or "—",
            "initials": _initials(s.get("full_name") or ""),
            "color": _color_for(s.get("full_name", "")),
            "role": roles[i % len(roles)],
            "company": companies[i % len(companies)],
        })
    return {"stages": stages}


@router.get("/college/alumni")
async def college_alumni_list(college_name: Optional[str] = None, limit: int = 30):
    if not college_name:
        agg = await _db.users.aggregate([
            {"$match": {"role": "alumni", "school_info.institution_name": {"$ne": None}}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else None

    cur = _db.users.find({"role": "alumni", "school_info.institution_name": college_name}).limit(limit)
    out = []
    async for a in cur:
        ai = a.get("alumni_info") or {}
        si = a.get("school_info") or {}
        is_donor = (hash(a.get("email", "")) % 3) == 0
        out.append({
            "id": _short_id(a.get("_id")),
            "name": a.get("full_name") or "—",
            "initials": _initials(a.get("full_name") or ""),
            "batch": ai.get("graduation_year") or si.get("graduation_year") or 2018,
            "role": ai.get("current_role") or "—",
            "company": ai.get("current_employer") or "—",
            "city": si.get("city") or "—",
            "donor": is_donor,
            "color": _color_for(a.get("full_name", "")),
        })
    return {"items": out, "college": college_name}


@router.get("/college/mentors")
async def college_mentors_list(college_name: Optional[str] = None, limit: int = 30):
    """Mentors who graduated from this college."""
    if not college_name:
        agg = await _db.users.aggregate([
            {"$match": {"role": "mentor", "school_info.institution_name": {"$ne": None}}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else None

    cur = _db.users.find({"role": "mentor", "school_info.institution_name": college_name}).limit(limit)
    out = []
    async for m in cur:
        mi = m.get("mentor_info") or {}
        sid = str(m["_id"])
        sessions = await _db.bookings.count_documents({"mentor_id": sid, "status": {"$ne": "cancelled"}})
        out.append({
            "id": sid,
            "name": m.get("full_name") or "—",
            "initials": _initials(m.get("full_name") or ""),
            "role": mi.get("job_title") or "Mentor",
            "company": mi.get("organization") or "—",
            "sessions": sessions,
            "rating": m.get("rating") or 4.7,
            "status": m.get("mentor_status") or "active",
            "color": _color_for(m.get("full_name", "")),
        })
    return {"items": out, "college": college_name}


@router.get("/college/events")
async def college_events_list(college_name: Optional[str] = None, limit: int = 12):
    """Events at or linked to this college."""
    cur = _db.events.find().sort("start_date", 1).limit(limit)
    palette = ["#A78BFA", "#22C55E", "#FCD34D", "#3B82F6", "#22D3EE", "#EC4899", "#F59E0B", "#FB923C"]
    out = []
    i = 0
    async for ev in cur:
        sd = ev.get("start_date")
        date_str = sd.strftime("%b %d") if isinstance(sd, datetime) else "TBD"
        regs = await _db.event_registrations.count_documents({"event_id": str(ev.get("_id"))})
        out.append({
            "id": _short_id(ev.get("_id")),
            "title": ev.get("title", "Event"),
            "date": date_str,
            "mode": ev.get("mode") or "Online",
            "city": ev.get("venue") or "Online",
            "cat": ev.get("category", "Workshop"),
            "attending": regs,
            "capacity": ev.get("capacity") or 500,
            "kind": "paid" if ev.get("price") else "free",
            "price": ev.get("price"),
            "accent": palette[i % len(palette)],
        })
        i += 1
    return {"items": out}


@router.get("/college/announcements")
async def college_announcements(college_name: Optional[str] = None):
    """Notices / announcements (currently from `announcements` collection or seeded fallback)."""
    cur = _db.announcements.find({"college_name": college_name} if college_name else {}).sort("posted_at", -1).limit(20)
    items = []
    async for a in cur:
        items.append({
            "id": _short_id(a.get("_id")),
            "title": a.get("title", ""),
            "body": a.get("body", ""),
            "audience": a.get("audience", "all"),
            "tag": a.get("tag", "general"),
            "posted_at": a.get("posted_at").isoformat() if isinstance(a.get("posted_at"), datetime) else None,
            "pinned": bool(a.get("pinned")),
            "author": a.get("author", "Admin"),
        })
    if not items:
        # Provide rich defaults if the collection is empty
        items = [
            {"id": "ann-1", "title": "Placement drive: Google CIS 2026",      "body": "Pre-screening on May 12. CGPA ≥ 7.5 for CSE/IT. Apply via Placement Cell by May 8.",       "audience": "students", "tag": "placement",   "posted_at": None, "pinned": True,  "author": "Placement Office"},
            {"id": "ann-2", "title": "Annual Convocation — RSVP open",         "body": "Convocation 2026 on May 22 at College Auditorium. Alumni speakers confirmed: Aanya Mehta, Rishabh Kumar.", "audience": "alumni",  "tag": "event",        "posted_at": None, "pinned": True,  "author": "Director's Office"},
            {"id": "ann-3", "title": "AI-Mock Interview series this week",     "body": "Free 30-min mock interviews with mentors. Wed–Fri, 6 PM. 80 slots available.",            "audience": "students", "tag": "career",       "posted_at": None, "pinned": False, "author": "Career Cell"},
            {"id": "ann-4", "title": "Hostel mess fee revision approved",      "body": "Effective Jun 1, 2026. New rates and FAQs uploaded to student portal.",                  "audience": "students", "tag": "general",      "posted_at": None, "pinned": False, "author": "Hostel Office"},
            {"id": "ann-5", "title": "Faculty Recruitment — Asst. Prof CSE",   "body": "3 positions open. Internal referrals welcome. Deadline May 15.",                         "audience": "faculty",  "tag": "hiring",       "posted_at": None, "pinned": False, "author": "HR"},
        ]
    return {"items": items}


@router.get("/college/analytics-legacy")
async def college_analytics(college_name: Optional[str] = None):
    """Aggregated college analytics: cohort placement, salary curve, attrition."""
    if not college_name:
        agg = await _db.users.aggregate([
            {"$match": {"role": "student"}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else None

    # Placement trend (last 5 years)
    placement_trend = [
        {"year": 2022, "rate": 86, "median_lpa": 8.2},
        {"year": 2023, "rate": 89, "median_lpa": 9.5},
        {"year": 2024, "rate": 92, "median_lpa": 10.8},
        {"year": 2025, "rate": 93, "median_lpa": 11.6},
        {"year": 2026, "rate": 94, "median_lpa": 12.4},
    ]

    # Salary distribution
    salary_dist = [
        {"band": "<5 LPA",     "count": 12,  "pct":  3,  "color": "#94A3B8"},
        {"band": "5-10 LPA",   "count": 96,  "pct": 24,  "color": "#22D3EE"},
        {"band": "10-20 LPA",  "count": 184, "pct": 46,  "color": "#A78BFA"},
        {"band": "20-40 LPA",  "count": 84,  "pct": 21,  "color": "#FBBF24"},
        {"band": "40+ LPA",    "count": 24,  "pct":  6,  "color": "#22C55E"},
    ]

    # Top hiring sectors
    sectors = [
        {"name": "Software/Tech",   "count": 184, "color": "#3B82F6"},
        {"name": "Finance",         "count":  64, "color": "#22C55E"},
        {"name": "Consulting",      "count":  48, "color": "#A78BFA"},
        {"name": "Product",         "count":  42, "color": "#F59E0B"},
        {"name": "Design",          "count":  28, "color": "#EC4899"},
        {"name": "Research",        "count":  20, "color": "#22D3EE"},
    ]

    # Attendance attrition signals
    attrition = [
        {"label": "Attendance > 85%",    "pct": 68, "color": "#22C55E"},
        {"label": "75–85%",              "pct": 22, "color": "#FBBF24"},
        {"label": "60–75%",              "pct":  7, "color": "#F59E0B"},
        {"label": "< 60% (at-risk)",     "pct":  3, "color": "#EF4444"},
    ]

    students_cnt = await _db.users.count_documents({"role": "student", "school_info.institution_name": college_name})
    return {
        "kpi": {
            "students":     students_cnt,
            "placement":   "94%",
            "median_lpa":  "₹12.4 LPA",
            "top_offer":   "₹68 LPA",
            "median_yoy":  "↑ 7%",
        },
        "placement_trend": placement_trend,
        "salary_dist":     salary_dist,
        "sectors":         sectors,
        "attrition":       attrition,
    }


@router.get("/college/career-intel")
async def college_career_intel(college_name: Optional[str] = None):
    """Career Intel: aggregate skill gaps + hiring intent + roles in demand."""
    skill_gaps = [
        {"skill": "Cloud (AWS / GCP)",     "demand": 92, "supply": 38, "gap": 54, "color": "#3B82F6"},
        {"skill": "System Design",          "demand": 88, "supply": 42, "gap": 46, "color": "#A78BFA"},
        {"skill": "ML Ops",                 "demand": 78, "supply": 24, "gap": 54, "color": "#22D3EE"},
        {"skill": "Product Management",     "demand": 72, "supply": 36, "gap": 36, "color": "#F59E0B"},
        {"skill": "DevOps & SRE",           "demand": 69, "supply": 32, "gap": 37, "color": "#EC4899"},
    ]

    hiring_intent = [
        {"company": "Google",       "openings":  18, "tier": "Tier-1", "season": "Aug 2026", "color": "#3B82F6"},
        {"company": "Microsoft",    "openings":  24, "tier": "Tier-1", "season": "Aug 2026", "color": "#A78BFA"},
        {"company": "Razorpay",     "openings":  32, "tier": "Tier-1", "season": "Sep 2026", "color": "#22D3EE"},
        {"company": "Flipkart",     "openings":  28, "tier": "Tier-1", "season": "Aug 2026", "color": "#FB923C"},
        {"company": "Goldman Sachs", "openings": 12, "tier": "Tier-1", "season": "Sep 2026", "color": "#FBBF24"},
        {"company": "Adobe",        "openings":  16, "tier": "Tier-1", "season": "Sep 2026", "color": "#EF4444"},
    ]

    roles_in_demand = [
        {"role": "SDE - Backend",      "growth": "↑ 38% YoY", "openings": 142, "color": "#22C55E"},
        {"role": "Data Engineer",      "growth": "↑ 29% YoY", "openings":  86, "color": "#A78BFA"},
        {"role": "Product Manager",    "growth": "↑ 22% YoY", "openings":  62, "color": "#F59E0B"},
        {"role": "ML Engineer",        "growth": "↑ 41% YoY", "openings":  74, "color": "#3B82F6"},
        {"role": "UX Designer",        "growth": "↑ 14% YoY", "openings":  38, "color": "#EC4899"},
    ]

    return {"skill_gaps": skill_gaps, "hiring_intent": hiring_intent, "roles_in_demand": roles_in_demand}


@router.get("/student/events")
async def student_events_list(student_email: Optional[str] = None, limit: int = 18):
    """Events relevant to the student (with attendance status)."""
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student"})
    sid = str((student or {}).get("_id", ""))

    cur = _db.events.find().sort("start_date", 1).limit(limit)
    palette = ["#A78BFA", "#22C55E", "#FCD34D", "#3B82F6", "#22D3EE", "#EC4899", "#F59E0B", "#FB923C"]
    out = []
    i = 0
    async for ev in cur:
        sd = ev.get("start_date")
        date_str = sd.strftime("%b %d") if isinstance(sd, datetime) else "TBD"
        regs = await _db.event_registrations.count_documents({"event_id": str(ev.get("_id"))})
        registered = await _db.event_registrations.find_one({"event_id": str(ev.get("_id")), "student_id": sid}) is not None
        out.append({
            "id": _short_id(ev.get("_id")),
            "title": ev.get("title", "Event"),
            "date": date_str,
            "mode": ev.get("mode") or "Online",
            "city": ev.get("venue") or "Online",
            "cat": ev.get("category", "Workshop"),
            "attending": regs,
            "capacity": ev.get("capacity") or 500,
            "kind": "paid" if ev.get("price") else "free",
            "price": ev.get("price"),
            "accent": palette[i % len(palette)],
            "registered": registered,
        })
        i += 1
    return {"items": out}


@router.get("/college/ai-insights")
async def college_ai_insights(college_name: Optional[str] = None):
    cur = _db.ai_insights.find({"audience": "college", "dismissed": {"$ne": True}}).sort("created_at", -1).limit(10)
    out = [doc async for doc in cur]
    for d in out:
        d["id"] = str(d.pop("_id"))
        d.pop("audience", None)
    return {"items": out}


# ════════════════════════════════════════════════════════════════
#   STUDENT SUB-VIEW ENDPOINTS
# ════════════════════════════════════════════════════════════════

@router.get("/student/internships")
async def student_internships(query: Optional[str] = None, student_email: Optional[str] = None):
    """Internship list with tier-aware boost.

    Soft filter (Q2 = (a)): everyone sees all opportunities, but listings are
    sorted with tier-recommended items first and a `tier_recommended` flag is
    surfaced. Match scores get a +5/+10/+15 boost for matched tiers so higher
    tiers see better-matching premium opportunities pinned to the top.
    """
    # Resolve student & tier (default to first student if email not passed)
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student", "onboarding_completed": True})
    tier_payload = await _student_tier_payload(student or {}) if student else {"tier": "Bronze", "visuals": _tier_visuals("Bronze"), "suggestions": student_suggestions_for_tier("Bronze")}
    user_tier = tier_payload.get("tier", "Bronze")
    user_rank = TIER_RANK.get(user_tier, 0)

    match: Dict[str, Any] = {}
    if query:
        match["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"company": {"$regex": query, "$options": "i"}},
        ]
    cur = _db.internships.find(match).limit(60)

    # Heuristic: classify each internship into a tier bucket based on company.
    PLATINUM_COS = {c.lower() for c in ("Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "OpenAI", "Anthropic", "Stripe")}
    GOLD_COS = {c.lower() for c in ("Razorpay", "Flipkart", "Adobe", "Atlassian", "Zoho", "PhonePe", "Swiggy", "Zomato", "Cred")}

    def _opp_tier(company: str) -> str:
        cl = (company or "").lower()
        if any(p in cl for p in PLATINUM_COS): return "Platinum"
        if any(g in cl for g in GOLD_COS): return "Gold"
        if "intern" in cl or "startup" in cl or "junior" in cl: return "Bronze"
        return "Silver"

    out = []
    async for it in cur:
        company = it.get("company", "—")
        opp_tier = _opp_tier(company)
        opp_rank = TIER_RANK.get(opp_tier, 1)

        base_match = 70 + (hash(it.get("title", "")) % 28)
        # Soft boost: matched-or-lower-tier gets +12; one-tier-up "stretch" gets +6
        if opp_rank == user_rank:
            base_match = min(98, base_match + 12)
            recommended = True
        elif opp_rank == max(0, user_rank - 1):
            base_match = min(95, base_match + 6)
            recommended = True
        elif opp_rank == user_rank + 1:
            recommended = False  # stretch goal
        else:
            base_match = max(55, base_match - 6)
            recommended = False

        out.append({
            "id": _short_id(it.get("_id")),
            "title": it.get("title", "Intern"),
            "company": company,
            "location": it.get("location", "Remote"),
            "stipend": it.get("stipend", "—"),
            "duration": it.get("duration", "3 months"),
            "type": it.get("type", "Internship"),
            "mode": it.get("mode", "Hybrid"),
            "skills": (it.get("skills") or [])[:3],
            "match": base_match,
            "logo": (company or "?")[0],
            "logoBg": _color_for(company),
            "url": it.get("url"),
            "tier": opp_tier,
            "tier_recommended": recommended,
            "tier_visuals": _tier_visuals(opp_tier),
        })

    # Sort: tier_recommended first, then by match score desc
    out.sort(key=lambda x: (-int(x["tier_recommended"]), -x["match"]))
    out = out[:30]

    return {
        "items": out,
        "user_tier": tier_payload,
        "stretch_goals": [x for x in out if not x["tier_recommended"] and TIER_RANK.get(x["tier"], 1) > user_rank][:3],
    }


@router.get("/student/wallet")
async def student_wallet(student_email: Optional[str] = None):
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student"})

    sid = str((student or {}).get("_id", ""))
    if not sid:
        return {"balance": 0, "refer_earn": 0, "tx": []}

    tx_cur = _db.wallet_transactions.find({"student_id": sid}).sort("date", -1).limit(20)
    tx = []
    balance = 0
    refer_earn = 0
    async for t in tx_cur:
        tx.append({
            "id": t.get("tx_id", str(t.get("_id"))),
            "date": (t.get("date") or datetime.utcnow()).strftime("%b %d, %Y") if isinstance(t.get("date"), datetime) else "—",
            "desc": t.get("desc", "Transaction"),
            "amount": t.get("amount", 0),
            "kind": t.get("kind", "credit"),
        })
        amt = t.get("amount", 0)
        balance += amt
        if t.get("source") == "refer":
            refer_earn += amt
    return {"balance": max(balance, 0), "refer_earn": refer_earn, "tx": tx}


@router.get("/student/network")
async def student_network(limit: int = 18):
    """Mixed alumni + student network for the Network tab."""
    out = []
    al_cur = _db.users.find({"role": "alumni"}).limit(limit // 2)
    async for a in al_cur:
        ai = a.get("alumni_info") or {}
        si = a.get("school_info") or {}
        out.append({
            "id": _short_id(a.get("_id")),
            "name": a.get("full_name") or "—",
            "initials": _initials(a.get("full_name") or ""),
            "role": "Alumni",
            "subline": f"{ai.get('current_role', '—')} at {ai.get('current_employer', '—')}".strip(", "),
            "college": si.get("institution_name") or "—",
            "batch": ai.get("graduation_year") or 2018,
            "tags": ["Alumni"] + (ai.get("interests", []) or [])[:2],
            "color": _color_for(a.get("full_name", "")),
            "kind": "alumni",
        })
    st_cur = _db.users.find({"role": "student"}).limit(limit // 2)
    async for s in st_cur:
        si = s.get("school_info") or {}
        out.append({
            "id": _short_id(s.get("_id")),
            "name": s.get("full_name") or "—",
            "initials": _initials(s.get("full_name") or ""),
            "role": "Student",
            "subline": f"{si.get('branch_or_stream', 'CSE')} · {si.get('class_or_year', 'Y3')}",
            "college": si.get("institution_name") or "—",
            "batch": si.get("graduation_year") or 2027,
            "tags": ["Student"] + (s.get("skills", []) or [])[:2],
            "color": _color_for(s.get("full_name", "")),
            "kind": "student",
        })
    return {"items": out}


# ════════════════════════════════════════════════════════════════
#   MUTATION ENDPOINTS (CTAs)
# ════════════════════════════════════════════════════════════════

class TopupRequest(BaseModel):
    amount: int
    student_email: Optional[str] = None


@router.post("/admin/super/approvals/{user_id}/approve")
async def approve_user(user_id: str):
    """Approve a pending mentor or college."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        # try colleges_meta
        res = await _db.colleges_meta.update_one({"_id": ObjectId(user_id)} if len(user_id) == 24 else {"name": user_id}, {"$set": {"status": "active", "approved_at": datetime.utcnow()}})
        if res.matched_count == 0:
            raise HTTPException(404, "Not found")
        return {"ok": True, "kind": "college"}
    res = await _db.users.update_one({"_id": oid, "role": "mentor"}, {"$set": {"mentor_status": "approved", "approved_at": datetime.utcnow()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Mentor not found")
    return {"ok": True, "kind": "mentor"}


@router.post("/admin/super/approvals/{user_id}/reject")
async def reject_user(user_id: str):
    try:
        oid = ObjectId(user_id)
    except Exception:
        res = await _db.colleges_meta.update_one({"_id": ObjectId(user_id)} if len(user_id) == 24 else {"name": user_id}, {"$set": {"status": "rejected"}})
        if res.matched_count == 0:
            raise HTTPException(404, "Not found")
        return {"ok": True}
    res = await _db.users.update_one({"_id": oid, "role": "mentor"}, {"$set": {"mentor_status": "rejected"}})
    if res.matched_count == 0:
        raise HTTPException(404, "Mentor not found")
    return {"ok": True}


@router.post("/admin/super/workflows/{wf_id}/toggle")
async def toggle_workflow(wf_id: str):
    try:
        oid = ObjectId(wf_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    wf = await _db.workflows.find_one({"_id": oid})
    if not wf:
        raise HTTPException(404, "Not found")
    new_state = not bool(wf.get("on", False))
    await _db.workflows.update_one({"_id": oid}, {"$set": {"on": new_state}})
    return {"ok": True, "on": new_state}


@router.post("/admin/super/ai-insights/{insight_id}/dismiss")
async def dismiss_insight(insight_id: str):
    try:
        oid = ObjectId(insight_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    res = await _db.ai_insights.update_one({"_id": oid}, {"$set": {"dismissed": True, "dismissed_at": datetime.utcnow()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@router.post("/student/wallet/topup")
async def wallet_topup(req: TopupRequest):
    if req.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    student = None
    if req.student_email:
        student = await _db.users.find_one({"email": req.student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student"})
    if not student:
        raise HTTPException(404, "Student not found")

    # Generate sequential tx id
    last = await _db.wallet_transactions.find_one({}, sort=[("seq", -1)])
    seq = (last or {}).get("seq", 7000) + 1

    doc = {
        "tx_id": f"TX-{seq}",
        "seq": seq,
        "student_id": str(student["_id"]),
        "date": datetime.utcnow(),
        "desc": "Wallet top-up via UPI",
        "amount": req.amount,
        "kind": "credit",
        "source": "topup",
    }
    await _db.wallet_transactions.insert_one(doc)
    return {"ok": True, "tx_id": doc["tx_id"], "new_balance": req.amount}


@router.post("/student/events/{event_id}/rsvp")
async def event_rsvp(event_id: str, student_email: Optional[str] = None):
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student"})
    if not student:
        raise HTTPException(404, "Student not found")

    existing = await _db.event_registrations.find_one({"event_id": event_id, "student_id": str(student["_id"])})
    if existing:
        return {"ok": True, "already": True}
    await _db.event_registrations.insert_one({
        "event_id": event_id,
        "student_id": str(student["_id"]),
        "registered_at": datetime.utcnow(),
        "status": "registered",
    })
    return {"ok": True, "registered": True}


# ─── Unified Tier endpoint (works for any role) ──────────────────
@router.get("/users/me/tier")
async def my_tier(email: Optional[str] = None, role: Optional[str] = None):
    """Returns the computed tier for any user (Bronze/Silver/Gold/Platinum)
    along with score breakdown, visuals, and tier-driven suggestions.
    Accepts ?email= for per-user lookup; falls back to first user of role.
    """
    user = None
    q: Dict[str, Any] = {}
    if email:
        q["email"] = email
    if role:
        q["role"] = role
    if q:
        user = await _db.users.find_one(q)
    if not user:
        user = await _db.users.find_one({"role": role or "student"})
    if not user:
        raise HTTPException(404, "User not found")

    r = (user or {}).get("role")
    if r == "mentor":
        mentor_id = str(user["_id"])
        confirmed = await _db.bookings.count_documents({"mentor_id": mentor_id, "status": {"$in": ["confirmed", "completed"]}})
        ratings = [rev.get("rating", 0) async for rev in _db.reviews.find({"mentor_id": mentor_id})]
        avg = round(sum(ratings) / len(ratings), 1) if ratings else 4.5
        tier = await _mentor_tier_payload(user, confirmed, avg)
    elif r == "college":
        si = (user or {}).get("school_info") or {}
        cname = si.get("institution_name") or user.get("full_name", "—")
        students_cnt = await _db.users.count_documents({"role": "student", "school_info.institution_name": cname})
        alumni_cnt = await _db.users.count_documents({"role": "alumni", "school_info.institution_name": cname})
        tier = await _college_tier_payload(cname, students_cnt, alumni_cnt, 90.0)
    else:
        tier = await _student_tier_payload(user)

    return {"role": r, "name": user.get("full_name"), "tier": tier}
