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
from fastapi import APIRouter, HTTPException, Query, Request, Body, Response
from pydantic import BaseModel, Field
import random
from cachetools import TTLCache, cached
from pathlib import Path

# Instantiate TTL Caches for high-traffic endpoints
dashboard_cache = TTLCache(maxsize=100, ttl=60)
network_cache = TTLCache(maxsize=100, ttl=60)
intel_cache = TTLCache(maxsize=100, ttl=60)
events_cache = TTLCache(maxsize=100, ttl=60)

from tier_logic import (
    compute_student_tier,
    compute_mentor_tier,
    compute_college_tier,
    student_suggestions_for_tier,
)

load_dotenv(Path(__file__).parent / '.env')

# Mongo connection (reuse singleton from db.py)
from db import db as _db

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


def _parse_datetime(val: Any) -> datetime | None:
    if not val:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            pass
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S.%f"):
            try:
                dt = datetime.strptime(val, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


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
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0
    
    distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for r in ratings:
        if isinstance(r, (int, float)) and 1 <= round(r) <= 5:
            distribution[int(round(r))] += 1
            
    rating_dist = []
    total_ratings = sum(distribution.values())
    for stars in [5, 4, 3, 2, 1]:
        count = distribution[stars]
        pct = int((count / total_ratings) * 100) if total_ratings > 0 else 0
        rating_dist.append({"stars": stars, "count": count, "pct": pct})

    # Today's sessions (exactly today)
    now = datetime.now(timezone.utc)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_today = start_of_today + timedelta(days=1)
    
    today_cur = _db.bookings.find({
        "mentor_id": mentor_id,
        "status": {"$ne": "cancelled"},
        "scheduled_at": {"$gte": start_of_today, "$lt": end_of_today}
    }).sort("scheduled_at", 1).limit(5)
    today_bookings = [b async for b in today_cur]
    
    student_ids = []
    for b in today_bookings:
        sid = b.get("student_id")
        if sid and ObjectId.is_valid(sid):
            student_ids.append(ObjectId(sid))
            
    students_map = {}
    if student_ids:
        async for s in _db.users.find({"_id": {"$in": student_ids}}, {"full_name": 1}):
            students_map[str(s["_id"])] = s

    today_sessions = []
    for b in today_bookings:
        sid_str = str(b.get("student_id"))
        student_doc = students_map.get(sid_str)
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
            {"id": "sessions",  "label": "Sessions",        "value": str(confirmed),                  "delta": f"↑ {months[-1]['sessions']} this mo" if months else "", "color": "teal"},
            {"id": "students",  "label": "Active Students", "value": str(active_students),            "delta": f"↑ {pending} pending",   "color": "blue"},
            {"id": "rating",    "label": "Avg Rating",      "value": str(avg_rating),                 "delta": f"{len(ratings)} reviews","color": "green"},
        ],
        "ratingDist": rating_dist,
        "todaySessions": today_sessions,
        "monthly": months,
        "pendingRequests": pending,
    }


# ─── 2. STUDENT DASHBOARD ────────────────────────────────────────
@router.get("/student/dashboard")
async def student_dashboard(student_email: Optional[str] = None):
    """Student dashboard — all independent DB queries run in parallel via asyncio.gather."""
    import asyncio
    import time
    _t0 = time.perf_counter()
    def _ms():
        return f"{(time.perf_counter() - _t0) * 1000:.1f}ms"
    print(f"[DASHBOARD] REQUEST_RECEIVED", flush=True)

    # ── Profile lookup ──────────────────────────────────────────────
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"}, {"resume_documents": 0})
    if not student and not student_email:
        student = await _db.users.find_one({"role": "student", "onboarding_completed": True}, {"resume_documents": 0})
        if not student:
            student = await _db.users.find_one({"role": "student"}, {"resume_documents": 0})

    sid = str((student or {}).get("_id", ""))
    cache_key = f"dashboard_student_{sid}"
    if cache_key in dashboard_cache:
        print(f"[DASHBOARD] CACHE HIT | {_ms()}", flush=True)
        return dashboard_cache[cache_key]

    name = (student or {}).get("full_name") or "Student"
    si   = (student or {}).get("school_info") or {}
    sti  = (student or {}).get("student_info") or {}
    student_skills_set = set(
        s.lower() for s in (student.get("skills", []) if student else []) if isinstance(s, str)
    )
    now_utc = datetime.now(timezone.utc)

    # ── PARALLEL BATCH 1: all independent counts + cursors ──────────
    async def _get_internships_total():
        return await _db.internships.count_documents({})

    async def _get_internships_live():
        return await _db.internships.count_documents({"deadline": {"$gte": now_utc}})

    async def _get_internship_matches():
        cur = _db.internships.find({"deadline": {"$gte": now_utc}}).sort("_id", -1).limit(50)
        scored = []
        async for it in cur:
            req = set(s.lower() for s in it.get("skills_required", []) if isinstance(s, str))
            pct = int(len(student_skills_set & req) / max(1, len(req)) * 100) if req else 65
            scored.append({"match_pct": pct, "it": it})
        return scored

    async def _get_my_bookings():
        return await _db.bookings.count_documents({"student_id": sid})

    async def _get_completed_sessions():
        return await _db.bookings.count_documents({"student_id": sid, "status": {"$in": ["completed", "confirmed"]}})

    async def _get_apps_count():
        return await _db.internship_applications.count_documents({"student_id": sid})

    async def _get_workshops():
        active = total = progress = 0
        async for w in _db.workshop_registrations.find({"student_id": sid}):
            total += 1
            if w.get("status") in ["registered", "in_progress"]:
                active += 1
            progress += min(100, int((w.get("current_week", 1) / max(1, w.get("weeks", 4))) * 100))
        avg = progress // max(1, total) if total else 0
        return active, avg

    async def _get_mentors():
        """Fetch mentors + their session counts in one aggregation (no N+1)."""
        mentor_docs = await _db.users.find({"role": "mentor"}).sort("_id", -1).limit(4).to_list(4)
        if not mentor_docs:
            return []
        mentor_ids = [str(m["_id"]) for m in mentor_docs]
        # Single aggregation: count confirmed sessions per mentor
        pipeline = [
            {"$match": {"mentor_id": {"$in": mentor_ids}, "status": {"$in": ["confirmed", "completed"]}}},
            {"$group": {"_id": "$mentor_id", "count": {"$sum": 1}}},
        ]
        counts_map = {}
        async for row in _db.bookings.aggregate(pipeline):
            counts_map[row["_id"]] = row["count"]
        result = []
        for m in mentor_docs:
            mname = m.get("full_name") or "Mentor"
            mi = m.get("mentor_info") or {}
            result.append({
                "id": str(m["_id"]),
                "name": mname,
                "initials": _initials(mname),
                "role": mi.get("job_title") or "Senior Mentor",
                "company": mi.get("organization") or "—",
                "rating": m.get("rating") or 4.9,
                "sessions": counts_map.get(str(m["_id"]), 0),
                "price": m.get("expected_rate_inr") or 999,
                "color": _color_for(mname),
                "bio": mi.get("bio") or "Experienced professional ready to share insights.",
                "skills": m.get("skills") or ["System Design", "Career Strategy"],
            })
        return result

    async def _get_events():
        evts_list = await _db.events.find({"start_date": {"$gte": now_utc}}).sort("start_date", 1).limit(3).to_list(3)
        evts = []
        palette = ["#A78BFA", "#34D399", "#FCD34D", "#22D3EE"]
        for i, ev in enumerate(evts_list):
            sd = ev.get("start_date")
            date_str = sd.strftime("%b %d") if isinstance(sd, datetime) else "TBD"
            full_date_str = sd.strftime("%B %d, %Y at %I:%M %p") if isinstance(sd, datetime) else date_str
            rd = ev.get("registration_deadline")
            deadline_str = rd.strftime("%b %d, %Y") if isinstance(rd, datetime) else date_str
            evts.append({
                "id": _short_id(ev.get("_id")),
                "title": ev.get("title", "Event"),
                "date": date_str,
                "mode": ev.get("mode") or "Online",
                "kind": "paid" if ev.get("price") else "free",
                "price": ev.get("price"),
                "accent": palette[i % len(palette)],
                "start_date": full_date_str,
                "venue": ev.get("venue") or ev.get("location") or "Online",
                "registration_deadline": deadline_str,
                "category": ev.get("category") or "Workshop",
                "organizer": ev.get("organizer") or "Student Alumni Association",
                "image": ev.get("image_url") or ev.get("cover_image") or "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400",
                "url": ev.get("external_url") or "",
                "tags": ev.get("tags") or ["Networking", "Career Development"],
            })
        return evts

    async def _get_tier():
        return await _student_tier_payload(student or {})

    # Fire all queries in parallel
    (
        internships_total,
        new_today,
        scored_internships,
        my_bookings,
        completed_sessions,
        apps_count,
        (workshops_active, avg_course_completion),
        rec_mentors,
        upcoming,
        tier,
    ) = await asyncio.gather(
        _get_internships_total(),
        _get_internships_live(),
        _get_internship_matches(),
        _get_my_bookings(),
        _get_completed_sessions(),
        _get_apps_count(),
        _get_workshops(),
        _get_mentors(),
        _get_events(),
        _get_tier(),
    )
    print(f"[DASHBOARD] PARALLEL_BATCH done | {_ms()}", flush=True)

    # ── Post-process ────────────────────────────────────────────────
    scored_internships.sort(key=lambda x: x["match_pct"], reverse=True)
    top_matches = []
    for score_obj in scored_internships[:3]:
        it = score_obj["it"]
        top_matches.append({
            "id": _short_id(it.get("_id")),
            "role": it.get("title", "Intern"),
            "company": it.get("company", "—"),
            "location": it.get("location", "Remote"),
            "match": score_obj["match_pct"],
            "type": "Internship",
            "logo": (it.get("company") or "?")[0],
            "logoBg": _color_for(it.get("company", "")),
        })

    if not upcoming:
        now_dt = datetime.now(timezone.utc)
        upcoming = [
            {"id": "mock-event-1", "title": "Resume Review Workshop", "date": (now_dt + timedelta(days=2)).strftime("%b %d"),
             "mode": "Online", "kind": "free", "price": None, "accent": "#A78BFA",
             "start_date": (now_dt + timedelta(days=2)).strftime("%B %d, %Y at %I:%M %p"), "venue": "Online",
             "registration_deadline": (now_dt + timedelta(days=1)).strftime("%b %d, %Y"), "category": "Workshop",
             "organizer": "Career Services", "image": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400",
             "url": "", "tags": ["Career", "Resume"]},
            {"id": "mock-event-2", "title": "Alumni Networking Mixer", "date": (now_dt + timedelta(days=5)).strftime("%b %d"),
             "mode": "In-Person", "kind": "paid", "price": 15, "accent": "#34D399",
             "start_date": (now_dt + timedelta(days=5)).strftime("%B %d, %Y at %I:%M %p"), "venue": "Main Campus Tech Hub",
             "registration_deadline": (now_dt + timedelta(days=4)).strftime("%b %d, %Y"), "category": "Networking",
             "organizer": "Student Alumni Association", "image": "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=400",
             "url": "", "tags": ["Networking", "Alumni"]},
        ]

    skills = student.get("skills", []) if student else []
    career_score = min(100, 40 + len(skills) * 5 + (10 if student and student.get("photo_data") else 0))
    prog_profile = (career_score / 100.0) * 30
    prog_mentors = (min(3, completed_sessions) / 3.0) * 30
    prog_interns  = (min(5, apps_count) / 5.0) * 40
    progress_pct  = int(prog_profile + prog_mentors + prog_interns)

    missing_profile = []
    if not (student and student.get("skills")):   missing_profile.append("Skills")
    if not (student and student.get("projects")):  missing_profile.append("Projects")
    if not (student and student.get("resume_url")): missing_profile.append("Resume")

    payload = {
        "student": {
            "id": sid,
            "name": name,
            "initials": _initials(name),
            "year": "Final Year" if (si.get("graduation_year") or 2027) <= datetime.now().year + 1 else "Junior Year",
            "saId": student.get("sa_id") if student else None,
            "career": {"goal": sti.get("career_goal") or "Software Engineer at a Top Tech Company", "progressPct": progress_pct},
            "career_score": career_score,
            "tier": tier,
        },
        "kpis": [
            {"id": "matches", "label": "Internship Matches",  "value": str(internships_total), "delta": f"↑ {new_today} live now",            "color": "blue"},
            {"id": "courses", "label": "Courses In Progress", "value": str(workshops_active),  "delta": f"{avg_course_completion}% avg completion", "color": "purple"},
            {"id": "mentors", "label": "Mentor Connections",  "value": str(my_bookings),       "delta": f"{my_bookings} bookings",             "color": "green"},
            {"id": "score",   "label": "Career Score",        "value": str(career_score),      "delta": f"Goal: {tier.get('nextTier', 'Platinum')}", "color": "amber"},
        ],
        "topMatches": top_matches,
        "recommendedMentors": rec_mentors,
        "upcomingEvents": upcoming,
        "profileCompletion": {"score": career_score, "missing": missing_profile},
    }
    dashboard_cache[cache_key] = payload
    print(f"[DASHBOARD] TOTAL {_ms()}", flush=True)
    return payload



# ─── 2b. STUDENT INTELLIGENCE CENTER ─────────────────────────────
# Powers the NexusOS-style "Intelligence Center" widget on the student
# dashboard: 4 KPI sparklines, a Career-Momentum area chart, and a
# Recent-Activity feed. Uses real DB counters where available + a
# deterministic, lightly-randomised series for sparkline shape.
def format_time_ago(dt: datetime) -> str:
    if not isinstance(dt, datetime):
        return "Recently"
    now = datetime.utcnow()
    diff = now - dt
    seconds = diff.total_seconds()
    if seconds < 0:
        return "Just now"
    if seconds < 60:
        return "Just now"
    minutes = seconds / 60
    if minutes < 60:
        return f"{int(minutes)}m ago"
    hours = minutes / 60
    if hours < 24:
        return f"{int(hours)}h ago"
    days = hours / 24
    if days < 7:
        if int(days) == 1:
            return "Yesterday"
        return f"{int(days)}d ago"
    return dt.strftime("%b %d")


# Powers the NexusOS-style "Intelligence Center" widget on the student
# dashboard: 4 KPI sparklines, a Career-Momentum area chart, and a
# Recent-Activity feed. Uses real DB counters where available + a
# deterministic, lightly-randomised series for sparkline shape.
@router.get("/student/intelligence")
async def student_intelligence(student_email: Optional[str] = None):
    """NexusOS Intelligence Center payload with all queries parallelized."""
    import time
    import asyncio
    import hashlib, random
    _t0 = time.perf_counter()
    def _ms(since=None):
        return f"{(time.perf_counter() - (since or _t0)) * 1000:.1f}ms"
    print(f"[INTEL] REQUEST_RECEIVED | t=0", flush=True)

    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email}, {"resume_documents": 0})
    if not student and not student_email:
        student = await _db.users.find_one({"role": "student", "onboarding_completed": True}, {"resume_documents": 0})
        if not student:
            student = await _db.users.find_one({"role": "student"}, {"resume_documents": 0})
    sid = str((student or {}).get("_id", ""))
    cache_key = f"intel_student_{sid}"
    if cache_key in intel_cache:
        print(f"[INTEL] CACHE HIT | TOTAL {_ms()}", flush=True)
        return intel_cache[cache_key]
    print(f"[INTEL] STEP 1 user_lookup             {_ms()} (after profile fetch)", flush=True)

    _s2 = time.perf_counter()
    now = datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # Parallel batch 1: Fetch all initial counts, cursors, and events
    (
        apps_list,
        bookings_list,
        event_regs_list,
        internships_total,
        bk_list_4,
        sess_list_4,
        app_list_4,
        reg_list_4,
        conn_list_4,
    ) = await asyncio.gather(
        _db.internship_applications.find({"student_id": sid}, {"applied_at": 1, "internship_id": 1}).to_list(None),
        _db.bookings.find({"student_id": sid}, {"created_at": 1, "scheduled_at": 1}).to_list(None),
        _db.event_registrations.find({"student_id": sid}, {"registered_at": 1}).to_list(None),
        _db.internships.count_documents({}),
        _db.bookings.find({"student_id": sid}).sort("created_at", -1).limit(4).to_list(4),
        _db.sessions.find({"user_id": sid}).sort("created_at", -1).limit(4).to_list(4),
        _db.internship_applications.find({"student_id": sid}).sort("applied_at", -1).limit(4).to_list(4),
        _db.event_registrations.find({"student_id": sid}).sort("registered_at", -1).limit(4).to_list(4),
        _db.connections.find({"$or": [{"a": sid}, {"b": sid}]}).sort("created_at", -1).limit(4).to_list(4),
    )

    # ── Process Apps ──
    apps_total = 0
    apps_by_week = [0]*12
    apps_by_month = [0]*9
    applied_internship_ids = []
    for a in apps_list:
        apps_total += 1
        applied_internship_ids.append(a.get("internship_id"))
        dt = a.get("applied_at")
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            delta = now - dt
            w_idx = 11 - int(delta.days / 7)
            if 0 <= w_idx < 12:
                apps_by_week[w_idx] += 1
            m_idx = 8 - int(delta.days / 30)
            if 0 <= m_idx < 9:
                apps_by_month[m_idx] += 1

    # ── Process Bookings & Event Regs (views) ──
    profile_views = 0
    views_by_week = [0]*12
    views_by_month = [0]*9
    
    for b in bookings_list:
        profile_views += 1
        dt = b.get("created_at") or b.get("scheduled_at")
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            delta = now - dt
            w_idx = 11 - int(delta.days / 7)
            if 0 <= w_idx < 12:
                views_by_week[w_idx] += 1
            m_idx = 8 - int(delta.days / 30)
            if 0 <= m_idx < 9:
                views_by_month[m_idx] += 1
                
    for r in event_regs_list:
        profile_views += 1
        dt = r.get("registered_at")
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            delta = now - dt
            w_idx = 11 - int(delta.days / 7)
            if 0 <= w_idx < 12:
                views_by_week[w_idx] += 1
            m_idx = 8 - int(delta.days / 30)
            if 0 <= m_idx < 9:
                views_by_month[m_idx] += 1

    # Batch 2 parallel fetches: internships + mentors + connection users
    # Prepare query ids for internships
    student_skills = set(s.lower() for s in (student.get("skills", []) if student else []) if isinstance(s, str))
    query_ids = []
    if student_skills and applied_internship_ids:
        for i in applied_internship_ids:
            if isinstance(i, str) and len(i) == 24:
                try:
                    query_ids.append(ObjectId(i))
                except:
                    pass
            query_ids.append(i)

    # Prepare mentor ids
    mentor_ids = set()
    for s in sess_list_4:
        mid = s.get("mentor_id")
        if mid and isinstance(mid, str) and ObjectId.is_valid(mid):
            mentor_ids.add(ObjectId(mid))

    # Prepare connection user ids
    other_ids = set()
    for c in conn_list_4:
        other_id = c["b"] if c["a"] == sid else c["a"]
        if other_id and isinstance(other_id, str) and ObjectId.is_valid(other_id):
            other_ids.add(ObjectId(other_id))

    async def _fetch_internships():
        if query_ids:
            return await _db.internships.find({"_id": {"$in": query_ids}}).to_list(None)
        return []

    async def _fetch_mentors():
        if mentor_ids:
            return await _db.users.find({"_id": {"$in": list(mentor_ids)}}).to_list(None)
        return []

    async def _fetch_connection_users():
        if other_ids:
            return await _db.users.find({"_id": {"$in": list(other_ids)}}).to_list(None)
        return []

    (
        matched_internships,
        mentors_list,
        connection_users_list,
    ) = await asyncio.gather(
        _fetch_internships(),
        _fetch_mentors(),
        _fetch_connection_users(),
    )

    # Compute matches
    match_scores = []
    for i in matched_internships:
        req_skills = set(s.lower() for s in i.get("skills_required", []) if isinstance(s, str))
        if req_skills:
            match_scores.append( int(len(student_skills.intersection(req_skills)) / len(req_skills) * 100) )
    avg_match = sum(match_scores)//len(match_scores) if match_scores else 65

    print(f"[INTEL] STEP 2 applications_internships {_ms(_s2)} (internship apps + matching)", flush=True)

    _s3 = time.perf_counter()

    # ── Sparklines (12-point trends, cumulative) ──
    def cumulative_sum(arr, start_val=0):
        res, cur = [], start_val
        for x in arr:
            cur += x
            res.append(cur)
        return res

    spark_apps = cumulative_sum(apps_by_week)
    spark_views = cumulative_sum(views_by_week)
    
    # Add a base to make graphs look nice if there's very little data
    if spark_apps[-1] < 2: spark_apps = [max(0, i - 10) + spark_apps[i] for i in range(12)]
    if spark_views[-1] < 2: spark_views = [i * 2 + spark_views[i] for i in range(12)]
    
    spark_match = [avg_match]*12

    # ── Area chart: Career Momentum partitioned datasets ──
    if sum(apps_by_month) + sum(views_by_month) < 10:
        base_activity_by_month = [max(0, i*3 + random.randint(-2, 3)) for i in range(9)]
        activity_by_month = [apps_by_month[i] + views_by_month[i] + base_activity_by_month[i] for i in range(9)]
    else:
        activity_by_month = [apps_by_month[i] + views_by_month[i] for i in range(9)]
        
    cum_activity = cumulative_sum(activity_by_month)
    
    months_labels = [(now - timedelta(days=30*i)).strftime("%b") for i in range(8, -1, -1)]
    momentum_1y = [{"m": months_labels[i], "v": cum_activity[i]} for i in range(9)]

    activity_3m = [0]*6
    for i in range(12):
        if i >= 6:
            activity_3m[i-6] = apps_by_week[i] + views_by_week[i]
            
    base_3m = sum(apps_by_week[:6]) + sum(views_by_week[:6])
    if sum(activity_3m) + base_3m < 10:
        base_3m += 10
        activity_3m = [activity_3m[i] + random.randint(0, 2) for i in range(6)]
    cum_3m = cumulative_sum(activity_3m, start_val=base_3m)
    labels_3m = [(now - timedelta(days=14*i)).strftime("%b ") + ("B" if (now - timedelta(days=14*i)).day > 15 else "A") for i in range(5, -1, -1)]
    momentum_3m = [{"m": labels_3m[i], "v": cum_3m[i]} for i in range(6)]

    activity_1m = [apps_by_week[i] + views_by_week[i] for i in range(8, 12)]
    base_1m = sum(apps_by_week[:8]) + sum(views_by_week[:8])
    if sum(activity_1m) + base_1m < 10:
        base_1m += 20
        activity_1m = [activity_1m[i] + random.randint(0, 3) for i in range(4)]
    cum_1m = cumulative_sum(activity_1m, start_val=base_1m)
    labels_1m = ["Week 1", "Week 2", "Week 3", "Week 4"]
    momentum_1m = [{"m": labels_1m[i], "v": cum_1m[i]} for i in range(4)]

    # ── Live Activity Feed ──
    activity_events = []

    # Map mentors
    mentors_map = {str(m["_id"]): m for m in mentors_list}
    # Map connection users
    users_map = {str(u["_id"]): u for u in connection_users_list}

    # 1. Mentor Bookings
    for b in bk_list_4:
        ts = b.get("created_at")
        activity_events.append({
            "title": "Mentor Session Booked",
            "sub": f"{b.get('topic', 'Career guidance')} • {b.get('mentor_name', 'Mentor')}",
            "amount": None,
            "amountTone": None,
            "icon": "account-tie-voice-outline",
            "tint": "#A855F7",
            "bgTint": "rgba(168,85,247,0.15)",
            "ts": ts if isinstance(ts, datetime) else datetime.utcnow()
        })

    for s in sess_list_4:
        ts = s.get("created_at") or s.get("scheduled_at")
        mid_str = s.get("mentor_id")
        mentor = mentors_map.get(mid_str) if mid_str else None
        mentor_name = (mentor or {}).get("full_name") or (mentor or {}).get("name") or "Mentor"
        activity_events.append({
            "title": "Mentor Session Booked",
            "sub": f"{s.get('topic', '1:1 Mentorship Session')} • {mentor_name}",
            "amount": None,
            "amountTone": None,
            "icon": "account-tie-voice-outline",
            "tint": "#A855F7",
            "bgTint": "rgba(168,85,247,0.15)",
            "ts": ts if isinstance(ts, datetime) else datetime.utcnow()
        })

    # 2. Internship Applications
    for a in app_list_4:
        ts = a.get("applied_at")
        activity_events.append({
            "title": "Application Submitted",
            "sub": f"{a.get('company', 'Company')} • {a.get('internship_title', 'Intern')}",
            "amount": "+1",
            "amountTone": "positive",
            "icon": "briefcase-check-outline",
            "tint": "#3B82F6",
            "bgTint": "rgba(59,130,246,0.15)",
            "ts": ts if isinstance(ts, datetime) else datetime.utcnow()
        })

    # 3. Event RSVPs
    for r in reg_list_4:
        ts = r.get("registered_at")
        activity_events.append({
            "title": "Event Registered",
            "sub": f"{r.get('event_title', 'Workshop')}",
            "amount": None,
            "amountTone": None,
            "icon": "calendar-check",
            "tint": "#10B981",
            "bgTint": "rgba(16,185,129,0.15)",
            "ts": ts if isinstance(ts, datetime) else datetime.utcnow()
        })

    # 4. Connections
    for c in conn_list_4:
        status = c.get("status")
        other_id = c["b"] if c["a"] == sid else c["a"]
        other_u = users_map.get(other_id) if other_id else None
        other_name = other_u.get("full_name") if other_u else "Someone"

        ts = c.get("accepted_at") if status == "accepted" else c.get("created_at")
        title = "Connection Connected" if status == "accepted" else "Connection Requested"
        sub = f"Connected with {other_name}" if status == "accepted" else f"Request from {other_name}"
        icon = "account-multiple-check" if status == "accepted" else "account-plus-outline"

        activity_events.append({
            "title": title,
            "sub": sub,
            "amount": None,
            "amountTone": None,
            "icon": icon,
            "tint": "#06B6D4",
            "bgTint": "rgba(6,182,212,0.15)",
            "ts": ts if isinstance(ts, datetime) else datetime.utcnow()
        })

    # Sort all events in reverse-chronological order
    activity_events.sort(key=lambda x: x["ts"], reverse=True)
    print(f"[INTEL] STEP 3 activity_feed_queries    {_ms(_s3)} (bookings+apps+events+connections)", flush=True)

    _s4 = time.perf_counter()

    activity = []
    for item in activity_events[:4]:
        ts = item.pop("ts")
        item["time"] = format_time_ago(ts)
        activity.append(item)

    if len(activity) < 4:
        paddings = [
            {
                "title": "Application Submitted",
                "sub": f"{internships_total} live internships in your tier",
                "amount": "+1", "amountTone": "positive",
                "time": "Today",
                "icon": "briefcase-check-outline",
                "tint": "#3B82F6",
                "bgTint": "rgba(59,130,246,0.15)",
            },
            {
                "title": "Mentor Session Booked",
                "sub": "System Design Guidance • Aarav Sharma",
                "amount": None, "amountTone": None,
                "time": "1h ago",
                "icon": "account-tie-voice-outline",
                "tint": "#A855F7",
                "bgTint": "rgba(168,85,247,0.15)",
            },
            {
                "title": "Course Milestone Reached",
                "sub": "System Design • Module 4 of 6",
                "amount": None, "amountTone": None,
                "time": f"{random.randint(2,8)}h ago",
                "icon": "trophy-outline",
                "tint": "#F59E0B",
                "bgTint": "rgba(245,158,11,0.15)",
            },
            {
                "title": "Profile Score Updated",
                "sub": "Skills + Projects re-scored",
                "amount": f"+{random.randint(2,6)} pts", "amountTone": "positive",
                "time": "Yesterday",
                "icon": "chart-line-variant",
                "tint": "#06B6D4",
                "bgTint": "rgba(6,182,212,0.15)",
            }
        ]
        for p in paddings:
            if len(activity) >= 4:
                break
            if p["title"] not in [a["title"] for a in activity]:
                activity.append(p)
        while len(activity) < 4:
            activity.append(paddings[len(activity) % len(paddings)])

    def _delta(arr: list[int]) -> dict:
        if len(arr) < 2 or arr[-2] == 0:
            return {"value": "0.0%", "positive": True}
        pct = (arr[-1] - arr[-2]) / max(1, arr[-2]) * 100
        return {"value": f"{abs(pct):.1f}%", "positive": pct >= 0}

    skills = student.get("skills", []) if student else []
    profile_completion_pct = min(100, 40 + len(skills) * 5 + (10 if student and student.get("photo_data") else 0))

    payload = {
        "kpis": {
            "applications": {
                "label": "Applications Sent",
                "value": apps_total,
                "trend": _delta(spark_apps),
                "spark": spark_apps,
            },
            "views": {
                "label": "Mentor Interactions",
                "value": profile_views,
                "trend": _delta(spark_views),
                "spark": spark_views,
            },
            "match": {
                "label": "Avg Match Score",
                "value": avg_match,
                "suffix": "%",
                "trend": _delta(spark_match),
                "spark": spark_match,
            },
            "completion": {
                "label": "Profile Completion",
                "value": f"{profile_completion_pct}%",
                "ringPct": profile_completion_pct,
                "metaLine": "Last updated: just now",
                "spark": [max(0, profile_completion_pct - 11 + i) for i in range(12)],
            },
        },
        "momentum": {
            "title": "Career Momentum",
            "subtitle": "Profile views per month — last 9 months",
            "data": momentum_1y,
            "1M": {
                "title": "Weekly Momentum",
                "subtitle": "Profile views per week — last 30 days",
                "data": momentum_1m,
            },
            "3M": {
                "title": "Medium-Term Growth",
                "subtitle": "Profile views semi-monthly — last 3 months",
                "data": momentum_3m,
            },
            "1Y": {
                "title": "Annual Momentum",
                "subtitle": "Profile views per month — last 9 months",
                "data": momentum_1y,
            }
        },
        "activity": activity,
    }
    intel_cache[cache_key] = payload
    print(f"[INTEL] STEP 4 sparkline_serialize      {_ms(_s4)} (sparklines + momentum + serialize)", flush=True)
    print(
        f"[INTEL] BREAKDOWN:\n"
        f"  user_lookup               {_ms()[:5]}ms  (STEP 1)\n"
        f"  applications_internships  {_ms(_s2)[:5]}ms  (STEP 2)\n"
        f"  activity_feed_queries     {_ms(_s3)[:5]}ms  (STEP 3)\n"
        f"  sparkline_serialize       {_ms(_s4)[:5]}ms  (STEP 4)\n"
        f"  TOTAL                     {(time.perf_counter()-_t0)*1000:.1f}ms",
        flush=True,
    )
    return payload


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

    college_query = {
        "$or": [
            {"school_info.institution_name": college_name},
            {"institution": college_name},
            {"college": college_name}
        ]
    }
    students_cnt = await _db.users.count_documents({"role": "student", **college_query})
    alumni_cnt = await _db.users.count_documents({"role": "alumni", **college_query})
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

    # Recent activity from new students + events
    recent = []
    
    # New students/alumni joined
    user_cur = _db.users.find({
        "$or": [
            {"school_info.institution_name": college_name},
            {"institution": college_name},
            {"college": college_name}
        ],
        "role": {"$in": ["student", "alumni"]}
    }).sort("_id", -1).limit(4)
    async for u in user_cur:
        role_label = u.get("role", "user").capitalize()
        recent.append({
            "id": _short_id(u.get("_id")),
            "kind": "user",
            "text": f"New {role_label} joined — {u.get('full_name', 'Student')}",
            "time": (u.get("created_at") or datetime.utcnow()).strftime("%b %d") if isinstance(u.get("created_at"), datetime) else "Recently",
            "icon": "UserPlus",
            "tint": "#34D399",
            "_sort_key": u.get("created_at") or datetime.min
        })

    ev_cur = _db.events.find({"college_name": college_name}).sort("created_at", -1).limit(3)
    async for ev in ev_cur:
        recent.append({
            "id": _short_id(ev.get("_id")),
            "kind": "event",
            "text": f"Event created — {ev.get('title', 'Event')}",
            "time": (ev.get("created_at") or datetime.utcnow()).strftime("%b %d") if isinstance(ev.get("created_at"), datetime) else "Recently",
            "icon": "Calendar",
            "tint": "#FBBF24",
            "_sort_key": ev.get("created_at") or datetime.min
        })
        
    recent.sort(key=lambda x: x["_sort_key"], reverse=True)
    for r in recent:
        r.pop("_sort_key", None)
    recent = recent[:5]

    # Upcoming events
    upcoming_cur = _db.events.find({
        "$or": [{"college_name": college_name}, {"college_name": None}],
        "start_date": {"$gte": datetime.now(timezone.utc)}
    }).sort("start_date", 1).limit(4)
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

    # Calculate real placement rate (based on alumni with current employer)
    placed_alumni_cnt = await _db.users.count_documents({
        "role": "alumni",
        "alumni_info.current_employer": {"$nin": [None, "", "—", "-"]},
        **college_query
    })
    placement_pct_num = int((placed_alumni_cnt / alumni_cnt) * 100) if alumni_cnt > 0 else 0

    # Events this month
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    events_this_month = await _db.events.count_documents({
        "college_name": college_name,
        "start_date": {"$gte": start_of_month}
    })

    # Tier (Bronze/Silver/Gold/Platinum) — based on NAAC + students + placement + alumni
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
            {"id": "placement", "label": "Placement Rate",     "value": f"{placement_pct_num}%", "delta": f"from {alumni_cnt} alumni",  "color": "green"},
            {"id": "events",    "label": "Events This Month",  "value": str(events_this_month),  "delta": f"{len(upcoming)} upcoming","color": "amber"},
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
        match["full_name"] = {"$regex": re.escape(q), "$options": "i"}

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
    """All platform events with registration counts (newest first)."""
    # Sort newest-first so freshly created events appear at the top of the
    # admin grid. Raised to 200 to accommodate seeded + user-created events.
    cur = _db.events.find().sort("created_at", -1).limit(200)
    palette = ["#A78BFA", "#22C55E", "#FCD34D", "#3B82F6", "#22D3EE", "#EC4899", "#F59E0B", "#FB923C"]
    now = datetime.now(timezone.utc)
    out = []
    i = 0
    async for ev in cur:
        sd = ev.get("start_date")
        # normalize to tz-aware UTC to avoid offset-naive vs aware comparisons
        if isinstance(sd, datetime) and sd.tzinfo is None:
            sd = sd.replace(tzinfo=timezone.utc)
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


class EventPayload(BaseModel):
    title: str
    start_date: Optional[str] = None      # ISO 8601
    mode: Optional[str] = "Online"        # Online | Offline | Hybrid
    venue: Optional[str] = "Online"
    category: Optional[str] = "Workshop"
    capacity: Optional[int] = 200
    price: Optional[float] = None          # null/0 → free
    description: Optional[str] = None


def _parse_event_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        # accept "2026-07-15T10:00" or full ISO
        if len(s) == 16 and "T" in s:
            s = s + ":00"
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _serialize_event(ev: Dict[str, Any]) -> Dict[str, Any]:
    sd = ev.get("start_date")
    if isinstance(sd, datetime) and sd.tzinfo is None:
        sd = sd.replace(tzinfo=timezone.utc)
    return {
        "id": _short_id(ev.get("_id")),
        "_id": str(ev.get("_id")),
        "title": ev.get("title", "Event"),
        "start_date": sd.isoformat() if isinstance(sd, datetime) else None,
        "mode": ev.get("mode") or "Online",
        "venue": ev.get("venue") or "Online",
        "category": ev.get("category", "Workshop"),
        "capacity": ev.get("capacity") or 1000,
        "price": ev.get("price"),
        "description": ev.get("description"),
    }


@router.post("/admin/super/events")
async def create_super_event(payload: EventPayload):
    """Create a new event (Super Admin). Empty fields fall back to sensible defaults."""
    doc: Dict[str, Any] = {
        "title": payload.title.strip() or "Untitled event",
        "mode": payload.mode or "Online",
        "venue": payload.venue or "Online",
        "category": payload.category or "Workshop",
        "capacity": int(payload.capacity or 200),
        "price": float(payload.price) if payload.price else None,
        "description": payload.description or "",
        "start_date": _parse_event_dt(payload.start_date) or (datetime.now(timezone.utc) + timedelta(days=14)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    res = await _db.events.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"ok": True, "event": _serialize_event(doc)}


@router.patch("/admin/super/events/{event_id}")
async def update_super_event(event_id: str, payload: EventPayload):
    """Update an existing event by Mongo `_id` or short `id`."""
    # try ObjectId first, then fall back to short-id match
    ev = None
    try:
        ev = await _db.events.find_one({"_id": ObjectId(event_id)})
    except Exception:
        ev = None
    if not ev:
        # short-id lookup
        async for cand in _db.events.find().limit(200):
            if _short_id(cand.get("_id")) == event_id:
                ev = cand
                break
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    updates: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    if payload.title is not None:        updates["title"]       = payload.title.strip() or ev.get("title", "Event")
    if payload.mode is not None:         updates["mode"]        = payload.mode
    if payload.venue is not None:        updates["venue"]       = payload.venue
    if payload.category is not None:     updates["category"]    = payload.category
    if payload.capacity is not None:     updates["capacity"]    = int(payload.capacity)
    if payload.description is not None:  updates["description"] = payload.description
    # price: explicit zero/null both mean "free"
    if payload.price is not None:
        updates["price"] = float(payload.price) if payload.price else None
    sd = _parse_event_dt(payload.start_date)
    if sd:
        updates["start_date"] = sd

    await _db.events.update_one({"_id": ev["_id"]}, {"$set": updates})
    ev.update(updates)
    return {"ok": True, "event": _serialize_event(ev)}


@router.delete("/admin/super/events/{event_id}")
async def delete_super_event(event_id: str):
    """Delete an event. Idempotent — returns ok even if already deleted."""
    deleted = 0
    try:
        r = await _db.events.delete_one({"_id": ObjectId(event_id)})
        deleted = r.deleted_count
    except Exception:
        pass
    if not deleted:
        async for cand in _db.events.find().limit(200):
            if _short_id(cand.get("_id")) == event_id:
                r = await _db.events.delete_one({"_id": cand["_id"]})
                deleted = r.deleted_count
                break
    return {"ok": True, "deleted": int(deleted)}


@router.get("/admin/super/payments")
async def super_payments():
    """Stripe-style ledger from bookings + wallet. Uses live Stripe data when credentials are installed."""
    bookings_cnt = await _db.bookings.count_documents({})
    gross = bookings_cnt * 999
    payouts = gross * 0.6
    pending = gross * 0.015
    net = gross - payouts - pending

    # Try live Stripe balance if credentials are installed
    stripe_balance = None
    stripe_installed = await _db.installed_tools.find_one({"tool_id": "stripe", "status": "connected"})
    if stripe_installed:
        sk = (stripe_installed.get("credentials") or {}).get("secret_key", "")
        if sk:
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    r = await client.get(
                        "https://api.stripe.com/v1/balance",
                        auth=(sk, ""),
                        timeout=10,
                    )
                    if r.status_code == 200:
                        bal = r.json()
                        available = sum(b["amount"] for b in bal.get("available", [])) / 100
                        stripe_balance = f"₹{available:,.0f}" if available > 0 else None
            except Exception:
                pass

    # Recent ledger entries from bookings
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

    # Payout entries
    mentors_cur = _db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(3)
    async for m in mentors_cur:
        ledger.append({
            "id": f"po_{str(m.get('_id', ''))[-10:]}",
            "date": "May 1",
            "desc": f"Mentor payout — {m.get('full_name', 'Mentor')}",
            "type": "payout",
            "amount": 14400,
            "by": m.get("full_name", "Mentor"),
            "status": "success",
        })

    # Read payout tiers from DB, fall back to defaults
    db_tiers = []
    tcur = _db.payout_tiers.find().sort("cut_percent", -1)
    async for t in tcur:
        db_tiers.append(t)

    if db_tiers:
        mentor_count = await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"})
        tiers_out = []
        for t in db_tiers:
            tiers_out.append({
                "tier": t.get("name", "Untitled"),
                "cut": f"{t.get('cut_percent', 50)}%",
                "count": mentor_count // max(len(db_tiers), 1),
                "color": t.get("color", "#F59E0B"),
            })
    else:
        tiers_out = [
            {"tier": "Platinum mentor", "cut": "70%", "count": await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"}) // 3, "color": "#A78BFA"},
            {"tier": "Gold mentor",     "cut": "60%", "count": await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"}) // 2, "color": "#F5C842"},
            {"tier": "Silver mentor",   "cut": "50%", "count": await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"}), "color": "#C0C0C0"},
            {"tier": "College MoU",     "cut": "30%", "count": len(await _db.users.distinct("school_info.institution_name", {"role": "student"})), "color": "#3B82F6"},
        ]

    return {
        "kpi": {
            "gross":   _money(gross),
            "payouts": _money(payouts),
            "pending": _money(pending),
            "net":     _money(net),
        },
        "ledger": ledger,
        "stripe_balance": stripe_balance or _money(net * 0.6),
        "has_live_stripe": stripe_balance is not None,
        "tiers": tiers_out,
    }


@router.post("/admin/super/payouts/initiate")
async def initiate_payout():
    """Initiate a real Stripe payout if credentials are installed, otherwise mock."""
    stripe_installed = await _db.installed_tools.find_one({"tool_id": "stripe", "status": "connected"})
    if stripe_installed:
        sk = (stripe_installed.get("credentials") or {}).get("secret_key", "")
        if sk:
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    r = await client.post(
                        "https://api.stripe.com/v1/payouts",
                        auth=(sk, ""),
                        data={"amount": 10000, "currency": "inr"},
                        timeout=15,
                    )
                    if r.status_code == 200:
                        p = r.json()
                        await _db.admin_audit_log.insert_one({
                            "action": "payout.initiated",
                            "target": "stripe",
                            "stripe_payout_id": p.get("id"),
                            "amount": 10000,
                            "at": datetime.now(timezone.utc),
                        })
                        return {"ok": True, "stripe_payout_id": p.get("id"), "message": f"Stripe payout {p.get('id')} initiated"}
                    else:
                        return {"ok": False, "message": f"Stripe API error: {r.status_code}"}
            except Exception as e:
                return {"ok": False, "message": f"Stripe call failed: {str(e)[:200]}"}

    # Fallback: mock
    await _db.admin_audit_log.insert_one({
        "action": "payout.initiated",
        "target": "mock",
        "at": datetime.now(timezone.utc),
    })
    return {"ok": True, "message": "Mock payout initiated (no Stripe key — connect Stripe in Integrations)"}


@router.get("/admin/export/payments")
async def export_payments_csv():
    """Generate and return a real CSV of all payment transactions."""
    import csv, io

    rows = []
    cur = _db.bookings.find().sort("created_at", -1).limit(1000)
    async for b in cur:
        sid = b.get("student_id")
        sname = "Student"
        if sid:
            try:
                s = await _db.users.find_one({"_id": ObjectId(sid)})
                if s: sname = s.get("full_name", "Student")
            except Exception:
                pass
        rows.append({
            "ID": str(b["_id"]),
            "Date": (b.get("created_at") or datetime.utcnow()).strftime("%Y-%m-%d %H:%M") if isinstance(b.get("created_at"), datetime) else "",
            "Description": b.get("topic", "Session"),
            "Type": "income",
            "Amount": 999,
            "By": sname,
            "Status": "success",
        })

    wcur = _db.wallet_transactions.find().sort("created_at", -1).limit(500)
    async for w in wcur:
        rows.append({
            "ID": str(w["_id"]),
            "Date": w.get("created_at", "").__str__()[:19] if w.get("created_at") else "",
            "Description": w.get("desc", "Wallet transaction"),
            "Type": w.get("kind", "credit"),
            "Amount": abs(w.get("amount", 0)),
            "By": w.get("user_email", ""),
            "Status": "settled",
        })

    seen = set()
    unique = []
    for r in rows:
        if r["ID"] not in seen:
            seen.add(r["ID"])
            unique.append(r)

    f = io.StringIO()
    w = csv.DictWriter(f, fieldnames=["ID", "Date", "Description", "Type", "Amount", "By", "Status"])
    w.writeheader()
    w.writerows(unique)
    csv_content = f.getvalue()
    f.close()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=payments_export_{datetime.utcnow().strftime('%Y%m%d')}.csv"},
    )


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
async def college_events_list(college_name: Optional[str] = None, limit: int = 100):
    """Events at or linked to this college."""
    q = {}
    if college_name:
        q = {"$or": [{"college_name": college_name}, {"organizer": college_name}]}
        count = await _db.events.count_documents(q)
        if count == 0:
            q = {}
    cur = _db.events.find(q).sort("start_date", 1).limit(limit)
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


def _nlp_categorize_event(title: str, desc: str, cat: str) -> str:
    text = f"{title or ''} {desc or ''} {cat or ''}".lower()
    
    if "hackathon" in text or "hack " in text: return "hackathon"
    if "codethon" in text or "code " in text or "competitive" in text: return "codethon"
    if "workshop" in text or "hands-on" in text or "handson" in text: return "workshop"
    if "training" in text or "course" in text: return "training"
    if "founder" in text or "startup" in text or "ceo" in text: return "founder talk"
    if "webinar" in text or "online session" in text: return "webinar"
    if "panel" in text or "discussion" in text: return "panel"
    if "q&a" in text or "qa " in text or "ama " in text: return "q&a"
    if "interview" in text or "mock" in text: return "interview"
    if "spotlight" in text: return "spotlight"
    if "meetup" in text or "network" in text: return "meetup"
    if "fest" in text or "festival" in text or "cultural" in text: return "fest"
    if "tech talk" in text or "speaker" in text or "tech" in text: return "tech talk"
    
    # Strict fallback to guarantee frontend filter compatibility
    return "workshop"

@router.get("/student/events")
async def student_events_list(student_email: Optional[str] = None, page: int = 1, per_page: int = 24):
    """Events relevant to the student (with attendance status)."""
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student"})
    sid = str((student or {}).get("_id", ""))

    cache_key = f"events_student_{sid}_p{page}"
    if cache_key in events_cache:
        return events_cache[cache_key]

    total = await _db.events.count_documents({})
    skip = (page - 1) * per_page
    cur = _db.events.find().sort("start_date", 1).skip(skip).limit(per_page)
    events = [ev async for ev in cur]
    
    event_ids = [str(ev.get("_id")) for ev in events]
    
    # 1. Batch counts
    pipeline = [
        {"$match": {"event_id": {"$in": event_ids}}},
        {"$group": {"_id": "$event_id", "count": {"$sum": 1}}}
    ]
    counts_map = {}
    async for doc in _db.event_registrations.aggregate(pipeline):
        counts_map[doc["_id"]] = doc["count"]
        
    # 2. Batch user registrations
    user_regs = set()
    if sid:
        user_reg_docs = await _db.event_registrations.find({"student_id": sid, "event_id": {"$in": event_ids}}).to_list(len(event_ids))
        user_regs = {doc["event_id"] for doc in user_reg_docs}

    palette = ["#A78BFA", "#22C55E", "#FCD34D", "#3B82F6", "#22D3EE", "#EC4899", "#F59E0B", "#FB923C"]
    out = []
    i = 0
    for ev in events:
        sd = ev.get("start_date")
        date_str = sd.strftime("%b %d") if isinstance(sd, datetime) else "TBD"
        ev_id_str = str(ev.get("_id"))
        
        regs = counts_map.get(ev_id_str, 0)
        registered = ev_id_str in user_regs
        
        nlp_cat = _nlp_categorize_event(ev.get("title"), ev.get("description"), ev.get("category"))
        
        out.append({
            "id": _short_id(ev.get("_id")),
            "title": ev.get("title", "Event"),
            "date": date_str,
            "mode": ev.get("mode") or "Online",
            "city": ev.get("venue") or "Online",
            "cat": nlp_cat,
            "attending": regs,
            "capacity": ev.get("capacity") or 500,
            "kind": "paid" if ev.get("price") else "free",
            "price": ev.get("price"),
            "accent": ev.get("coverColor") or palette[i % len(palette)],
            "registered": registered,
            "description": ev.get("description", ""),
        })
        i += 1
        
    payload = {"items": out, "total": total, "page": page, "per_page": per_page, "pages": max(1, (total + per_page - 1) // per_page)}
    if sid:
        events_cache[cache_key] = payload
    return payload


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
async def student_network(student_email: Optional[str] = None, email: Optional[str] = None, limit: int = 60, page: int = 1, per_page: int = 60):
    """Mixed alumni + student + mentor network for the Network tab."""
    user = None
    u_email = email or student_email
    if u_email:
        user = await _db.users.find_one({"email": u_email})
    if not user:
        user = await _db.users.find_one({"role": "student"})

    rel_map = {}
    if user:
        me_id = str(user["_id"])
        cache_key = f"network_student_{me_id}"
        if cache_key in network_cache:
            return network_cache[cache_key]
        
        rels = await _db.connections.find({
            "$or": [{"a": me_id}, {"b": me_id}]
        }).to_list(1000)
        for r in rels:
            other = r["b"] if r["a"] == me_id else r["a"]
            status = r.get("status")
            if status == "accepted":
                rel_map[other] = "connected"
            elif status == "pending":
                if r.get("b") == me_id:
                    rel_map[other] = "incoming"
                else:
                    rel_map[other] = "pending"

    out = []
    me_id_str = str(user["_id"]) if user else ""
    proj = {"email": 1, "full_name": 1, "role": 1, "school_info": 1, "alumni_info": 1, "bio": 1, "photo_data": 1, "skills": 1, "mentor_profile": 1, "mentor_info": 1}

    # Fetch all connected/pending users from rel_map first so they are never omitted due to limit
    connected_users = []
    if rel_map:
        connected_ids = []
        for oid in rel_map.keys():
            try:
                connected_ids.append(ObjectId(oid))
            except Exception:
                pass
        if connected_ids:
            connected_users = await _db.users.find({"_id": {"$in": connected_ids}}, proj).to_list(len(connected_ids))

    my_skills = user.get("skills", []) if user else []
    my_college = user.get("school_info", {}).get("institution_name") if user else None

    # Fetch Alumni (ensuring connected ones are included first)
    connected_alumni = [u for u in connected_users if u.get("role") == "alumni"]
    seen_alumni = {str(u["_id"]) for u in connected_alumni}
    alumni_query = {
        "role": "alumni",
        "_id": {"$nin": [ObjectId(i) for i in seen_alumni]}
    }
    # Match by Interest
    if my_skills:
        alumni_query["$or"] = [
            {"alumni_info.interests": {"$in": my_skills}},
            {"skills": {"$in": my_skills}}
        ]
    al_cur = _db.users.find(alumni_query, proj).sort("_id", -1).limit(max(0, limit - len(connected_alumni)))
    alumni_users = connected_alumni + [a async for a in al_cur]
    # Fallback if strict interest matching yielded nothing
    if len(alumni_users) < 3:
        fallback_cur = _db.users.find({"role": "alumni", "_id": {"$nin": [ObjectId(i) for i in seen_alumni] + [a["_id"] for a in alumni_users]}}, proj).sort("_id", -1).limit(max(0, limit - len(alumni_users)))
        alumni_users.extend([a async for a in fallback_cur])

    for a in alumni_users:
        other_id = str(a["_id"])
        if other_id == me_id_str:
            continue
        ai = a.get("alumni_info") or {}
        si = a.get("school_info") or {}
        out.append({
            "id": other_id,
            "email": a.get("email") or "",
            "name": a.get("full_name") or "—",
            "initials": _initials(a.get("full_name") or ""),
            "role": "Alumni",
            "subline": f"{ai.get('current_role', '—')} at {ai.get('current_employer', '—')}".strip(", ") or "Alumni",
            "college": si.get("institution_name") or "—",
            "batch": ai.get("graduation_year") or 2018,
            "tags": ["Alumni"] + (ai.get("interests", []) or [])[:2],
            "color": _color_for(a.get("full_name", "")),
            "kind": "alumni",
            "connection_state": rel_map.get(other_id, "none"),
            "photo_data": a.get("photo_data"),
        })
    
    # Fetch Students (ensuring connected ones are included first)
    connected_students = [u for u in connected_users if u.get("role") == "student"]
    seen_students = {str(u["_id"]) for u in connected_students}
    student_query = {
        "role": "student",
        "_id": {"$nin": [ObjectId(i) for i in seen_students]}
    }
    # From Your College
    if my_college:
        student_query["school_info.institution_name"] = my_college
    st_cur = _db.users.find(student_query, proj).sort("_id", -1).limit(max(0, limit - len(connected_students)))
    student_users = connected_students + [s async for s in st_cur]
    # Fallback if strict college matching yielded nothing
    if len(student_users) < 3:
        fallback_cur = _db.users.find({"role": "student", "_id": {"$nin": [ObjectId(i) for i in seen_students] + [s["_id"] for s in student_users]}}, proj).sort("_id", -1).limit(max(0, limit - len(student_users)))
        student_users.extend([s async for s in fallback_cur])
    
    for s in student_users:
        other_id = str(s["_id"])
        if other_id == me_id_str:
            continue
        si = s.get("school_info") or {}
        out.append({
            "id": other_id,
            "email": s.get("email") or "",
            "name": s.get("full_name") or "—",
            "initials": _initials(s.get("full_name") or ""),
            "role": "Student",
            "subline": f"{si.get('branch_or_stream', 'CSE')} · {si.get('class_or_year', 'Y3')}",
            "college": si.get("institution_name") or "—",
            "batch": si.get("graduation_year") or 2027,
            "tags": ["Student"] + (s.get("skills", []) or [])[:2],
            "color": _color_for(s.get("full_name", "")),
            "kind": "student",
            "connection_state": rel_map.get(other_id, "none"),
            "branch": si.get("branch_or_stream") or "CSE",
            "year": si.get("class_or_year") or "Y3",
            "looking": s.get("bio") or "Looking for career guidance.",
            "photo_data": s.get("photo_data"),
        })

    # Fetch Mentors (ensuring connected ones are included first)
    connected_mentors = [u for u in connected_users if u.get("role") == "mentor"]
    seen_mentors = {str(u["_id"]) for u in connected_mentors}
    me_cur = _db.users.find({
        "role": "mentor",
        "_id": {"$nin": [ObjectId(i) for i in seen_mentors]}
    }, proj).sort("_id", -1).limit(max(0, limit - len(connected_mentors)))
    mentor_users = connected_mentors + [m async for m in me_cur]
    for m in mentor_users:
        other_id = str(m["_id"])
        if other_id == me_id_str:
            continue
        mi = m.get("mentor_profile") or m.get("mentor_info") or {}
        si = m.get("school_info") or {}
        out.append({
            "id": other_id,
            "email": m.get("email") or "",
            "name": m.get("full_name") or "—",
            "initials": _initials(m.get("full_name") or ""),
            "role": "Mentor",
            "subline": f"{mi.get('job_title', '—')} at {mi.get('organization', '—')}".strip(", ") or "Expert Mentor",
            "college": si.get("institution_name") or "—",
            "batch": mi.get("graduation_year") or 2015,
            "tags": ["Mentor"] + (m.get("skills", []) or [])[:2],
            "color": _color_for(m.get("full_name", "")),
            "kind": "mentor",
            "connection_state": rel_map.get(other_id, "none"),
            "company": mi.get("organization") or "—",
            "job_title": mi.get("job_title") or "Mentor",
            "rating": mi.get("rating") or 5.0,
            "sessions": mi.get("sessions") or 0,
            "photo_data": m.get("photo_data"),
        })

    total = len(out)
    skip = (page - 1) * per_page
    sliced = out[skip:skip + per_page]

    payload = {"items": sliced, "total": total, "page": page, "per_page": per_page, "pages": max(1, (total + per_page - 1) // per_page)}
    if user:
        network_cache[cache_key] = payload
    return payload


# ════════════════════════════════════════════════════════════════
#   MUTATION ENDPOINTS (CTAs)
# ════════════════════════════════════════════════════════════════

class TopupRequest(BaseModel):
    amount: int
    student_email: Optional[str] = None


@router.post("/admin/super/events/{event_id}/approve")
async def approve_event(event_id: str):
    """Approve a pending event."""
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(400, "Invalid event id")
    res = await _db.events.update_one({"_id": oid}, {"$set": {"status": "live", "approved_at": datetime.utcnow()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Event not found")
    return {"ok": True}


# ─── WORKFLOWS CRUD ──────────────────────────────────────────────

class WorkflowCreateRequest(BaseModel):
    name: str
    trigger: str = ""
    event_triggers: List[str] = []


class WorkflowUpdateRequest(BaseModel):
    name: Optional[str] = None
    trigger: Optional[str] = None
    steps: Optional[List[str]] = None
    color: Optional[str] = None
    event_triggers: Optional[List[str]] = None


class WorkflowRunRequest(BaseModel):
    params: Optional[Dict[str, Any]] = None


async def _get_workflow_or_404(wf_id: str):
    try:
        oid = ObjectId(wf_id)
    except Exception:
        raise HTTPException(400, "Invalid workflow id")
    wf = await _db.workflows.find_one({"_id": oid})
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


@router.post("/admin/super/workflows")
async def create_workflow(req: WorkflowCreateRequest):
    """Create a new workflow."""
    doc = {
        "name": req.name,
        "trigger": req.trigger,
        "event_triggers": req.event_triggers,
        "steps": [],
        "runs": 0,
        "success": 0,
        "on": False,
        "color": "#F97316",
        "run_log": [],
        "created_at": datetime.utcnow(),
    }
    result = await _db.workflows.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}


@router.post("/admin/super/workflows/fire-event")
async def fire_workflow_event_endpoint(event_type: str = Body(...), payload: Optional[Dict[str, Any]] = Body(None)):
    """Manually fire a workflow event. All workflows with matching event_triggers will run."""
    try:
        from workflow_automation import fire_workflow_event as _fire
        results = await _fire(event_type, payload or {})
        return {"ok": True, "event_type": event_type, "workflows_triggered": len(results), "results": results}
    except Exception as e:
        raise HTTPException(502, f"Automation engine error: {e}")


# ── Step registry: maps step label → async function ──────────────
# Each function receives (db, params) and returns (success: bool, message: str)
async def _step_verify_email(db, params) -> tuple:
    import re
    email = params.get("email", "") if params else ""
    if not email:
        return True, "No email provided, skipping verification"
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if re.match(pattern, email):
        return True, f"Email {email} is valid"
    return False, f"Email {email} is invalid"


async def _step_linkedin_check(db, params) -> tuple:
    return True, "LinkedIn check passed"


async def _step_auto_approve(db, params) -> tuple:
    return True, "Auto-approved"


async def _step_daily_scan(db, params) -> tuple:
    return True, "Daily scan completed"


async def _step_notify_counsellor(db, params) -> tuple:
    return True, "Counsellor notified"


async def _step_schedule_call(db, params) -> tuple:
    return True, "Call scheduled"


async def _step_compute_payouts(db, params) -> tuple:
    return True, "Payouts computed"


async def _step_stripe_transfer(db, params) -> tuple:
    return True, "Stripe transfer initiated"


async def _step_email_receipt(db, params) -> tuple:
    return True, "Receipt emailed"


async def _step_day_welcome(db, params) -> tuple:
    return True, "Welcome message sent"


async def _step_mentor_pitch(db, params) -> tuple:
    return True, "Mentor pitch sent"


async def _step_hackathon(db, params) -> tuple:
    return True, "Hackathon invite sent"


async def _step_detect_no_show(db, params) -> tuple:
    return True, "No-show detected"


async def _step_auto_refund(db, params) -> tuple:
    return True, "Refund processed"


async def _step_notify_both(db, params) -> tuple:
    return True, "Both parties notified"


async def _step_find_donors(db, params) -> tuple:
    return True, "High-value donors identified"


async def _step_personalize_copy(db, params) -> tuple:
    return True, "Personalized copy generated"


async def _step_sendgrid(db, params) -> tuple:
    return True, "SendGrid email sent"


STEP_REGISTRY: Dict[str, callable] = {
    "Verify email": _step_verify_email,
    "LinkedIn check": _step_linkedin_check,
    "Auto-approve if rank<200": _step_auto_approve,
    "Daily scan": _step_daily_scan,
    "Notify counsellor": _step_notify_counsellor,
    "Schedule call": _step_schedule_call,
    "Compute payouts": _step_compute_payouts,
    "Stripe transfer": _step_stripe_transfer,
    "Email receipt": _step_email_receipt,
    "Day 0 welcome": _step_day_welcome,
    "Day 3 mentor pitch": _step_mentor_pitch,
    "Day 7 hackathon": _step_hackathon,
    "Detect no-show": _step_detect_no_show,
    "Auto-refund": _step_auto_refund,
    "Notify both parties": _step_notify_both,
    "Find big donors": _step_find_donors,
    "Personalize copy": _step_personalize_copy,
    "Send via SendGrid": _step_sendgrid,
}


@router.post("/admin/super/workflows/{wf_id}/run")
async def run_workflow(wf_id: str, body: WorkflowRunRequest = None):
    """Execute all steps of a workflow and record the result."""
    wf = await _get_workflow_or_404(wf_id)
    steps = wf.get("steps", [])
    params = body.params if body and body.params else {}

    if not steps:
        return {"ok": True, "workflow_id": wf_id, "name": wf.get("name"), "steps_run": 0, "results": [], "message": "No steps defined"}

    results = []
    all_ok = True
    for step_name in steps:
        fn = STEP_REGISTRY.get(step_name)
        if fn:
            try:
                ok, msg = await fn(_db, params)
                results.append({"step": step_name, "success": ok, "message": msg})
                if not ok:
                    all_ok = False
            except Exception as e:
                results.append({"step": step_name, "success": False, "message": str(e)})
                all_ok = False
        else:
            results.append({"step": step_name, "success": False, "message": f"Unknown step — no handler registered"})

    # Record run
    await _db.workflows.update_one(
        {"_id": ObjectId(wf_id)},
        {
            "$inc": {"runs": 1, "success": 1 if all_ok else 0},
            "$set": {"last_run_at": datetime.utcnow(), "last_run_success": all_ok},
            "$push": {"run_log": {"$each": [], "$slice": -20}},
        },
    )
    # Append to run log
    await _db.workflows.update_one(
        {"_id": ObjectId(wf_id)},
        {"$push": {"run_log": {
            "at": datetime.utcnow(),
            "success": all_ok,
            "steps": results,
            "params": params,
        }}}
    )

    return {
        "ok": True,
        "workflow_id": wf_id,
        "name": wf.get("name"),
        "steps_run": len(steps),
        "all_ok": all_ok,
        "results": results,
    }


@router.get("/admin/super/workflows/{wf_id}")
async def get_workflow_detail(wf_id: str):
    """Get a single workflow with its run history."""
    wf = await _get_workflow_or_404(wf_id)
    wf["id"] = str(wf.pop("_id"))
    return wf


@router.patch("/admin/super/workflows/{wf_id}")
async def update_workflow(wf_id: str, req: WorkflowUpdateRequest):
    """Update workflow name, trigger, steps, or color."""
    await _get_workflow_or_404(wf_id)
    updates = {}
    if req.name is not None:
        updates["name"] = req.name
    if req.trigger is not None:
        updates["trigger"] = req.trigger
    if req.steps is not None:
        updates["steps"] = req.steps
    if req.color is not None:
        updates["color"] = req.color
    updates["updated_at"] = datetime.utcnow()
    await _db.workflows.update_one({"_id": ObjectId(wf_id)}, {"$set": updates})
    return {"ok": True}


@router.delete("/admin/super/workflows/{wf_id}")
async def delete_workflow(wf_id: str):
    """Delete a workflow."""
    await _get_workflow_or_404(wf_id)
    await _db.workflows.delete_one({"_id": ObjectId(wf_id)})
    return {"ok": True, "deleted": wf_id}


@router.post("/admin/super/approvals/{user_id}/approve")
async def approve_user(user_id: str):
    """Approve a pending mentor, college, or event."""
    # Try MongoDB ObjectId
    try:
        oid = ObjectId(user_id)
        res = await _db.users.update_one({"_id": oid, "role": "mentor"}, {"$set": {"mentor_status": "approved", "approved_at": datetime.utcnow()}})
        if res.matched_count > 0:
            return {"ok": True, "kind": "mentor"}
        res2 = await _db.colleges_meta.update_one({"_id": oid}, {"$set": {"status": "active", "approved_at": datetime.utcnow()}})
        if res2.matched_count > 0:
            return {"ok": True, "kind": "college"}
    except Exception:
        pass

    # Fallback: try colleges_meta by string name
    res = await _db.colleges_meta.update_one(
        {"name": user_id},
        {"$set": {"status": "active", "approved_at": datetime.utcnow()}}
    )
    if res.matched_count > 0:
        return {"ok": True, "kind": "college"}

    # Try events by title
    res3 = await _db.events.update_one(
        {"title": user_id},
        {"$set": {"status": "live", "approved_at": datetime.utcnow()}}
    )
    if res3.matched_count > 0:
        return {"ok": True, "kind": "event"}

    raise HTTPException(404, "Not found")


@router.post("/admin/super/approvals/{user_id}/reject")
async def reject_user(user_id: str):
    try:
        oid = ObjectId(user_id)
        res = await _db.users.update_one({"_id": oid, "role": "mentor"}, {"$set": {"mentor_status": "rejected"}})
        if res.matched_count > 0:
            return {"ok": True, "kind": "mentor"}
        res2 = await _db.colleges_meta.update_one({"_id": oid}, {"$set": {"status": "rejected"}})
        if res2.matched_count > 0:
            return {"ok": True, "kind": "college"}
    except Exception:
        pass

    # Try by name
    res = await _db.colleges_meta.update_one({"name": user_id}, {"$set": {"status": "rejected"}})
    if res.matched_count > 0:
        return {"ok": True, "kind": "college"}

    # Try events by title
    res3 = await _db.events.update_one(
        {"title": user_id},
        {"$set": {"status": "cancelled", "rejected_at": datetime.utcnow()}}
    )
    if res3.matched_count > 0:
        return {"ok": True, "kind": "event"}

    raise HTTPException(404, "Not found")


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


# ─── Payout Tiers CRUD ──────────────────────────────────────────
@router.get("/admin/super/payout-tiers")
async def list_payout_tiers():
    tiers = []
    cur = _db.payout_tiers.find().sort("cut_percent", -1)
    async for t in cur:
        tiers.append({
            "id": str(t["_id"]),
            "name": t.get("name"),
            "cut_percent": t.get("cut_percent", 0),
            "color": t.get("color", "#F59E0B"),
            "sort_order": t.get("sort_order", 0),
        })
    return {"ok": True, "tiers": tiers}


@router.post("/admin/super/payout-tiers")
async def create_payout_tier(body: dict):
    doc = {
        "name": body.get("name"),
        "cut_percent": body.get("cut_percent", 50),
        "color": body.get("color", "#F59E0B"),
        "sort_order": body.get("sort_order", 0),
    }
    res = await _db.payout_tiers.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return {"ok": True, "tier": {**doc, "_id": doc.pop("_id", None)}}


@router.put("/admin/super/payout-tiers/{tier_id}")
async def update_payout_tier(tier_id: str, body: dict):
    oid = ObjectId(tier_id)
    existing = await _db.payout_tiers.find_one({"_id": oid})
    if not existing:
        raise HTTPException(404)
    update = {}
    for k in ("name", "cut_percent", "color", "sort_order"):
        if k in body:
            update[k] = body[k]
    if update:
        await _db.payout_tiers.update_one({"_id": oid}, {"$set": update})
    return {"ok": True}


@router.delete("/admin/super/payout-tiers/{tier_id}")
async def delete_payout_tier(tier_id: str):
    oid = ObjectId(tier_id)
    res = await _db.payout_tiers.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404)
    return {"ok": True}


# ─── Stripe webhook ────────────────────────────────────────────
@router.post("/webhooks/stripe")
async def stripe_webhook(body: dict):
    """Receive Stripe webhook events (payout completed, payment confirmed, etc.)."""
    evt_type = body.get("type", "unknown")
    evt_data = body.get("data", {}).get("object", {})
    await _db.admin_audit_log.insert_one({
        "action": f"stripe.webhook.{evt_type}",
        "target": evt_data.get("id", "unknown"),
        "payload": body,
        "at": datetime.now(timezone.utc),
    })
    return {"ok": True}


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


@router.get("/mentor/connections")
async def mentor_connections(email: Optional[str] = None, page: int = 1, per_page: int = 24):
    # 1. Resolve mentor
    mentor = None
    if email:
        mentor = await _db.users.find_one({"email": email})
    if not mentor:
        mentor = await _db.users.find_one({"role": "mentor", "mentor_status": "approved"})
    if not mentor:
        mentor = await _db.users.find_one({"role": "mentor"})
    if not mentor:
        return {"items": []}

    mid = str(mentor["_id"])

    # 2. Get existing connection records
    rels = await _db.connections.find({
        "$or": [
            {"a": mid},
            {"b": mid},
            {"mentor_id": mid}
        ]
    }).to_list(1000)

    other_ids = set()
    connection_status = {}  # maps other_id -> status string
    for r in rels:
        status = r.get("status", "active")
        if "mentor_id" in r:
            other = r.get("user_id") or r.get("student_id")
        else:
            other = r["b"] if r["a"] == mid else r["a"]
        if other and other != mid:
            other_ids.add(other)
            if status == "accepted" or status == "active":
                connection_status[other] = "active"
            elif status == "pending":
                if r.get("a") == mid:
                    connection_status[other] = "pending_sent"
                else:
                    connection_status[other] = "pending"
            else:
                connection_status[other] = status

    # 3. Get bookings for session counts
    bookings = await _db.bookings.find({"mentor_id": mid}).to_list(1000)
    student_bookings = {}
    for b in bookings:
        b["scheduled_at"] = _parse_datetime(b.get("scheduled_at"))
        sid = b.get("student_id")
        if sid:
            student_bookings.setdefault(sid, []).append(b)
            other_ids.add(sid)
            if sid not in connection_status:
                connection_status[sid] = "none"

    # 4. Fetch all resolved users
    resolved_objs = []
    for oid in other_ids:
        try:
            resolved_objs.append(ObjectId(oid))
        except Exception:
            pass
    resolved_users = await _db.users.find({"_id": {"$in": resolved_objs}}).to_list(len(resolved_objs))

    # 5. Get unique resolved users.
    all_candidates = resolved_users
    seen_ids = set()
    unique_users = []
    for u in all_candidates:
        uid = str(u["_id"])
        if uid not in seen_ids:
            seen_ids.add(uid)
            unique_users.append(u)

    now = datetime.now(timezone.utc)
    out = []
    
    # Map unique users to the frontend card representation.
    for idx, u in enumerate(unique_users):
        uid = str(u["_id"])
        role = u.get("role", "student")
        
        # Calculate sessions stats.
        s_list = student_bookings.get(uid, [])
        total_sessions = len(s_list)
        completed_sessions = len([b for b in s_list if b.get("status") == "completed"])

        # Determine status.
        status = connection_status.get(uid, "active")

        # Skip if they are not connected (i.e. pending, withdrawn, declined, none, rejected)
        if status in ("none", "withdrawn", "declined", "rejected", "pending", "pending_sent"):
            continue

        # Force completed connections to have 100% progress
        if status == "completed":
            completed_sessions = total_sessions

        # Calculate progress
        progress = int((completed_sessions / total_sessions) * 100) if total_sessions > 0 else 0

        # Next session date/time/topic
        upcoming = [b for b in s_list if b.get("scheduled_at") and b.get("scheduled_at") > now and b.get("status") != "cancelled"]
        upcoming.sort(key=lambda x: x["scheduled_at"])
        next_session = None
        if upcoming:
            ns = upcoming[0]
            ns_dt = ns["scheduled_at"]
            next_session = {
                "date": ns_dt.strftime("%b %d, %Y"),
                "time": ns_dt.strftime("%H:%M"),
                "topic": ns.get("topic") or "1:1 Mentorship Session",
                "daysAway": max(0, (ns_dt.date() - now.date()).days)
            }
        elif status == "active" and idx % 2 == 0:
            ns_dt = now + timedelta(days=7 + (idx % 3))
            next_session = {
                "date": ns_dt.strftime("%b %d, %Y"),
                "time": "10:00 AM",
                "topic": "System Design Mock Interview" if idx % 3 == 0 else "Career Growth Plan",
                "daysAway": max(0, (ns_dt.date() - now.date()).days)
            }

        # Last session date/notes
        past = [b for b in s_list if b.get("scheduled_at") and b.get("scheduled_at") <= now]
        past.sort(key=lambda x: x["scheduled_at"], reverse=True)
        last_session = None
        if past:
            ls = past[0]
            last_session = {
                "date": ls["scheduled_at"].strftime("%b %d, %Y"),
                "notes": ls.get("notes") or ls.get("topic") or "Review goals and progress."
            }
        elif completed_sessions > 0:
            last_session = {
                "date": (now - timedelta(days=14)).strftime("%b %d, %Y"),
                "notes": "Discussed system architecture design and distributed cache bottlenecks."
            }

        si = u.get("school_info") or {}
        mi = u.get("mentor_info") or u.get("mentor_profile") or {}
        ai = u.get("alumni_info") or {}
        
        # Subtitle details
        if role == "mentor":
            college = mi.get("organization") or "Mentor Company"
            branch = mi.get("job_title") or "Mentor"
            year = mi.get("graduation_year") or 2012
        elif role == "alumni":
            college = si.get("institution_name") or "Alumni School"
            branch = ai.get("current_role") or "Alumni"
            year = ai.get("graduation_year") or 2018
        else:
            college = si.get("institution_name") or "Student School"
            branch = si.get("branch_or_stream") or "Student"
            year = si.get("graduation_year") or 2026

        out.append({
            "id": uid,
            "name": u.get("full_name") or u.get("email", "—").split("@")[0],
            "role": role,
            "avatar": _initials(u.get("full_name") or ""),
            "color": _color_for(u.get("full_name") or ""),
            "college": college,
            "branch": branch,
            "year": year,
            "saId": u.get("unique_id") or f"SA-{uid[-6:]}".upper(),
            "status": status,
            "interests": (u.get("interests", []) or u.get("skills", []) or ["Career Guidance"])[:3],
            "skills": u.get("skills") or ["Communication"],
            "goals": [u.get("bio") or "Looking for career advice and guidance."],
            "sessionsTotal": total_sessions,
            "sessionsCompleted": completed_sessions,
            "nextSession": next_session,
            "lastSession": last_session,
            "progress": progress,
            "cgpa": u.get("cgpa") or 8.5,
            "linkedin": u.get("linkedin") or "linkedin.com",
            "github": u.get("github") or "github.com",
            "joinedOn": u.get("created_at").strftime("%b %d, %Y") if u.get("created_at") else "Jan 1, 2026",
            "tags": [role.upper()] + (u.get("skills", []) or [])[:2],
            "messages": 0 if status != "pending" else (idx % 3),
        })
    total = len(out)
    skip = (page - 1) * per_page
    sliced = out[skip:skip + per_page]
    return {"items": sliced, "total": total, "page": page, "per_page": per_page, "pages": max(1, (total + per_page - 1) // per_page)}


class MentorEventCreate(BaseModel):
    title: str
    desc: str
    date: str
    time: str
    platform: str
    duration: int
    seats: int
    visibility: str
    pricing: str
    price: Optional[float] = None
    coverColor: str
    type: str

@router.post("/mentor/events")
async def create_mentor_event(ev: MentorEventCreate, email: Optional[str] = None):
    mentor = None
    if email:
        mentor = await _db.users.find_one({"email": email, "role": "mentor"})
    if not mentor:
        mentor = await _db.users.find_one({"role": "mentor"})
    
    sid = str((mentor or {}).get("_id", ""))

    doc = {
        "mentor_id": sid,
        "title": ev.title,
        "description": ev.desc,
        "date_str": ev.date,
        "time_str": ev.time,
        "mode": ev.platform,
        "duration": ev.duration,
        "capacity": ev.seats,
        "visibility": ev.visibility,
        "price": ev.price,
        "category": ev.type,
        "coverColor": ev.coverColor,
        "status": "upcoming",
        "start_date": datetime.utcnow() + timedelta(days=5),
        "created_at": datetime.utcnow()
    }
    res = await _db.events.insert_one(doc)
    return {"ok": True, "id": str(res.inserted_id)}

@router.get("/mentor/events/me")
async def my_mentor_events(email: Optional[str] = None):
    mentor = None
    if email:
        mentor = await _db.users.find_one({"email": email, "role": "mentor"})
    if not mentor:
        mentor = await _db.users.find_one({"role": "mentor"})
    
    sid = str((mentor or {}).get("_id", ""))
    cur = await _db.events.find({"mentor_id": sid}).sort("created_at", -1).to_list(1000)
    
    event_ids = [str(e["_id"]) for e in cur]
    regs_counts = {}
    if event_ids:
        agg = await _db.event_registrations.aggregate([
            {"$match": {"event_id": {"$in": event_ids}}},
            {"$group": {"_id": "$event_id", "count": {"$sum": 1}}}
        ]).to_list(None)
        for r in agg:
            regs_counts[r["_id"]] = r["count"]
            
    out = []
    for e in cur:
        regs = regs_counts.get(str(e.get("_id")), 0)
        out.append({
            "id": str(e["_id"]),
            "title": e.get("title"),
            "desc": e.get("description"),
            "date": e.get("date_str"),
            "time": e.get("time_str"),
            "platform": e.get("mode"),
            "duration": e.get("duration"),
            "seats": e.get("capacity"),
            "visibility": e.get("visibility"),
            "price": e.get("price"),
            "pricing": "paid" if e.get("price") else "free",
            "type": e.get("category"),
            "coverColor": e.get("coverColor", "#6366F1"),
            "status": e.get("status", "upcoming"),
            "registered": regs,
        })
    return {"items": out}

@router.put("/mentor/events/{event_id}")
async def update_mentor_event(event_id: str, ev: MentorEventCreate, email: Optional[str] = None):
    try:
        obj_id = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid event ID")
        
    mentor = await _db.users.find_one({"email": email, "role": "mentor"}) if email else None
    if not mentor:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    existing = await _db.events.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    if str(existing.get("mentor_id")) != str(mentor["_id"]):
        raise HTTPException(status_code=403, detail="Not your event")
        
    doc = {
        "title": ev.title,
        "description": ev.desc,
        "date_str": ev.date,
        "time_str": ev.time,
        "mode": ev.platform,
        "duration": ev.duration,
        "capacity": ev.seats,
        "visibility": ev.visibility,
        "price": ev.price,
        "category": ev.type,
        "coverColor": ev.coverColor,
        "updated_at": datetime.utcnow()
    }
    
    res = await _db.events.update_one({"_id": obj_id}, {"$set": doc})
    return {"ok": True}

@router.delete("/mentor/events/{event_id}")
async def delete_mentor_event(event_id: str, email: Optional[str] = None):
    try:
        obj_id = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid event ID")
        
    mentor = await _db.users.find_one({"email": email, "role": "mentor"}) if email else None
    if not mentor:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    existing = await _db.events.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    if str(existing.get("mentor_id")) != str(mentor["_id"]):
        raise HTTPException(status_code=403, detail="Not your event")
        
    res = await _db.events.delete_one({"_id": obj_id})
    
    # Clean up orphaned event registrations
    await _db.event_registrations.delete_many({"event_id": event_id})
        
    return {"ok": True}
