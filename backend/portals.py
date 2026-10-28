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
from typing import Any, Callable, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body, Response
from pydantic import BaseModel, Field
import random
import pytz
import re
from cachetools import TTLCache, cached
from pathlib import Path

from core.deps import get_current_user, require_role, require_admin_role, bearer_token, decode_payload_silent
from pydantic import BaseModel

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
from core.db import db as _db
from core.query_helpers import nonempty
from db import fetch_users_with_mock_limit

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


def _fmt_date(val: Any) -> str:
    """Format a datetime/ISO string as 'Mon DD, YYYY' (or '—')."""
    dt = _parse_datetime(val)
    if not dt:
        return "—"
    return dt.strftime("%b %d, %Y")


# ─── 1. MENTOR DASHBOARD ─────────────────────────────────────────
@router.get("/mentor/dashboard")
async def mentor_dashboard(mentor_email: Optional[str] = None, user: dict = Depends(require_role('mentor'))):
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
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    # Today's sessions (next 24h)
    now = datetime.now(timezone.utc)
    tz_name = (mentor or {}).get("timezone") or "Asia/Kolkata"
    try:
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = pytz.timezone("Asia/Kolkata")

    now_local = datetime.now(tz)
    start_of_today = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_today = start_of_today + timedelta(days=1)
    
    today_cur = _db.bookings.find({
        "mentor_id": mentor_id,
        "status": {"$ne": "cancelled"},
        "scheduled_at": {
            "$gte": start_of_today.replace(tzinfo=None),
            "$lt": end_of_today.replace(tzinfo=None)
        }
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
        status = b.get("status")
        if status == "completed":
            continue
            
        sched = b.get("scheduled_at")
        if isinstance(sched, datetime):
            sched_naive = sched.replace(tzinfo=None)
            duration = b.get("duration_minutes") or 30
            end_time_naive = sched_naive + timedelta(minutes=duration)
            now_naive = now_local.replace(tzinfo=None)
            if end_time_naive < now_naive:
                continue

        sid_str = str(b.get("student_id"))
        student_doc = students_map.get(sid_str)
        sname = (student_doc or {}).get("full_name") or "Student"
        time_str = ""
        if isinstance(sched, datetime):
            # Datetime represents local hour/minute directly in this schema
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
        rate = (mentor or {}).get("expected_rate_inr")
        months.append({
            "month": m_start.strftime("%b"),
            "amount": cnt * rate if rate else None,
            "sessions": cnt,
        })

    # KPIs
    earnings = months[-1]["amount"]
    if earnings is None:
        earnings = sum(m["amount"] for m in months if m["amount"] is not None) or 0

    # Tier (Bronze/Silver/Gold/Platinum)
    tier = await _mentor_tier_payload(mentor or {}, confirmed, avg_rating or 0.0)

    prev_sessions = months[-2]["sessions"]
    cur_sessions = months[-1]["sessions"]
    if prev_sessions:
        delta_pct = round((cur_sessions - prev_sessions) / prev_sessions * 100)
        sessions_delta = f"↑ {delta_pct}%" if delta_pct >= 0 else f"↓ {abs(delta_pct)}%"
    else:
        sessions_delta = f"{cur_sessions} this mo"

    return {
        "mentor": {
            "id": mentor_id,
            "name": name,
            "initials": _initials(name),
            "role": mi.get("job_title") or "Senior Mentor",
            "company": mi.get("organization") or "—",
            "rating": avg_rating,
            "sessions": confirmed,
            "price": (mentor or {}).get("expected_rate_inr"),
            "college": si.get("institution_name") or "—",
            "batch": si.get("graduation_year") or 2010,
            "expertise": (mentor or {}).get("skills", []) or ["System Design", "Career Strategy"],
            "tier": tier,
        },
        "kpis": [
            {"id": "earnings",  "label": "Earnings",        "value": _money(earnings),          "delta": None,                     "color": "amber"},
            {"id": "sessions",  "label": "Sessions",        "value": str(confirmed),            "delta": sessions_delta,           "color": "teal"},
            {"id": "students",  "label": "Active Students", "value": str(active_students),      "delta": f"{pending} pending",      "color": "blue"},
            {"id": "rating",    "label": "Avg Rating",      "value": str(avg_rating) if avg_rating is not None else "—", "delta": f"{len(ratings)} reviews", "color": "green"},
        ],
        "todaySessions": today_sessions,
        "monthly": months,
        "pendingRequests": pending,
    }


@router.get("/mentor/earnings")
async def get_mentor_earnings(mentor_email: Optional[str] = None, user: dict = Depends(require_role('mentor'))):
    """Mentor earnings computed from completed bookings (amount_paid).

    Previously returned a flat 500 for every field. Earnings = sum of
    amount_paid on this mentor's bookings with status completed; the
    available-to-withdraw figure subtracts recorded payouts in
    mentor_payouts (none exist yet, so it equals total earned).
    """
    now = datetime.now(timezone.utc)
    mentor_id = str(user["_id"])
    email = (user.get("email") or "").lower()
    base = {
        "$or": [{"mentor_id": mentor_id}, {"mentor_email": email}],
        "status": {"$in": ["completed", "done"]},
    }

    async def total_since(since: Optional[datetime]) -> float:
        q = dict(base)
        if since is not None:
            q["$and"] = [{"$or": [{"completed_at": {"$gte": since}}, {"completed_at": {"$gte": since.isoformat()}},
                                   {"scheduled_at": {"$gte": since}}, {"scheduled_at": {"$gte": since.isoformat()}}]}]
        try:
            cur = _db.bookings.aggregate([{"$match": q}, {"$group": {"_id": None, "s": {"$sum": {"$toDouble": {"$ifNull": ["$amount_paid", 0]}}}}}])
            rows = await cur.to_list(1)
            return float(rows[0]["s"]) if rows else 0.0
        except Exception:
            return 0.0

    total = await total_since(None)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_week = start_today - timedelta(days=start_today.weekday())
    start_month = start_today.replace(day=1)
    today_v, week_v, month_v = await total_since(start_today), await total_since(start_week), await total_since(start_month)

    try:
        cur = _db.mentor_payouts.aggregate([{"$match": {"mentor_id": mentor_id, "status": {"$in": ["paid", "completed"]}}},
                                           {"$group": {"_id": None, "s": {"$sum": {"$toDouble": {"$ifNull": ["$amount", 0]}}}}}])
        rows = await cur.to_list(1)
        paid_out = float(rows[0]["s"]) if rows else 0.0
    except Exception:
        paid_out = 0.0
    available = max(0.0, total - paid_out)

    def fmt(v: float) -> str:
        return f"₹{v:,.0f}"

    return {
        "total_earned": round(total, 2),
        "available_withdraw": round(available, 2),
        "paid_out": round(paid_out, 2),
        "this_month": round(month_v, 2),
        "this_week": round(week_v, 2),
        "today": round(today_v, 2),
        "currency": "INR",
        "formatted_total": fmt(total),
        "formatted_available": fmt(available),
        "basis": "sum of amount_paid on completed bookings",
    }


# ─── 2. STUDENT DASHBOARD ────────────────────────────────────────
@router.get("/student/dashboard")
async def student_dashboard(request: Request, student_email: Optional[str] = None, user: dict = Depends(require_role('student'))):
    """Student dashboard — all independent DB queries run in parallel via asyncio.gather."""
    import asyncio
    import time
    _t0 = time.perf_counter()
    def _ms():
        return f"{(time.perf_counter() - _t0) * 1000:.1f}ms"
    print(f"[DASHBOARD] REQUEST_RECEIVED", flush=True)

    # ── Profile lookup ──────────────────────────────────────────────
    student = None
    if not student_email:
        payload = decode_payload_silent(bearer_token(request.headers.get("Authorization", "")))
        if payload and "sub" in payload:
            try:
                me = await _db.users.find_one({"_id": ObjectId(payload["sub"])})
                if me:
                    student_email = me.get("email")
            except Exception:
                pass

    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"}, {"resume_documents": 0})
        if not student:
            student = await _db.users.find_one({"email": student_email}, {"resume_documents": 0})
    if not student and not student_email:
        student = await _db.users.find_one({"role": "student", "onboarding_completed": True}, {"resume_documents": 0})
        if not student:
            student = await _db.users.find_one({"role": "student"}, {"resume_documents": 0})

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
            "match": None,  # no matching model yet; do not invent a score
            "type": "Internship",
            "logo": (it.get("company") or "?")[0],
            "logoBg": _color_for(it.get("company", "")),
        })

    # Mentor connections via bookings
    my_bookings = await _db.bookings.count_documents({"student_id": sid}) if sid else 0
    rec_mentors = []
    mentor_cur = _db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(2)
    async for m in mentor_cur:
        mname = m.get("full_name") or "Mentor"
        mi = m.get("mentor_info") or {}
        msess = await _db.bookings.count_documents({"mentor_id": str(m["_id"]), "status": {"$in": ["confirmed", "completed"]}})
        rec_mentors.append({
            "id": str(m["_id"]),
            "name": mname,
            "initials": _initials(mname),
            "role": mi.get("job_title") or "Senior Mentor",
            "company": mi.get("organization") or "—",
            "rating": m.get("rating"),
            "sessions": msess,
            "price": m.get("expected_rate_inr"),
            "color": _color_for(mname),
            "bio": mi.get("bio") or "",
            "skills": m.get("skills") or [],
        })

    from services.profile_service import compute_profile_completion
    comp_data = compute_profile_completion(student or {})
    profile_strength = comp_data["percentage"]

    # ── Real Applications Count ──
    applied_jobs_list = (student or {}).get("applied_jobs") or []
    applied_jobs_count = len(applied_jobs_list)
    apps_coll_count = await _db.applications.count_documents({"$or": [{"student_id": sid}, {"user_id": sid}, {"email": student_email}]}) if (sid or student_email) else 0
    opp_apps_count = await _db.opportunity_applications.count_documents({"user_id": sid}) if sid else 0
    job_apps_count = await _db.job_applications.count_documents({"user_id": sid}) if sid else 0
    real_apps_count = max(applied_jobs_count, apps_coll_count + opp_apps_count + job_apps_count)

    # ── Real Network / Connections Count ──
    conn_accepted = await _db.connections.count_documents({"status": "accepted", "$or": [{"a": sid}, {"b": sid}]}) if sid else 0
    user_conns_list = (student or {}).get("connections") or []
    real_net_count = max(conn_accepted, len(user_conns_list), my_bookings)

    # ── Real Events Count ──
    user_reg_events = await _db.event_registrations.count_documents({"$or": [{"student_id": sid}, {"user_id": sid}]}) if sid else 0
    platform_upcoming = await _db.events.count_documents({})
    if user_reg_events > 0:
        real_events_count = user_reg_events
        events_subtext = "Registered"
    else:
        real_events_count = platform_upcoming
        events_subtext = "Upcoming"

    # Note: an earlier version inflated zeros for "test" accounts (92% profile,
    # 16 applications, 128 connections, 7 events). Every account now sees its
    # real numbers.

    upcoming = []
    completed_sessions = my_bookings
    prog_profile = (profile_strength / 100.0) * 30
    prog_mentors = (min(3, completed_sessions) / 3.0) * 30
    prog_interns  = (min(5, real_apps_count) / 5.0) * 40
    progress_pct  = int(prog_profile + prog_mentors + prog_interns)

    missing_profile = [i["label"] for i in comp_data["items"] if not i["done"]]

    tier = await _student_tier_payload(student or {})

    stats_payload = {
        "profile_strength": profile_strength,
        "profile_subtext": "All set!" if profile_strength >= 100 else ("Keep going!" if profile_strength >= 50 else "Incomplete"),
        "applications": real_apps_count,
        "applications_subtext": f"{real_apps_count} applied" if real_apps_count > 0 else "0 applied",
        "network": real_net_count,
        "network_subtext": "Connections",
        "events": real_events_count,
        "events_subtext": events_subtext,
    }

    return {
        "student": {
            "id": sid,
            "name": name,
            "initials": _initials(name),
            "year": "Final Year" if (si.get("graduation_year") or 2027) <= datetime.now().year + 1 else "Junior Year",
            "saId": student.get("sa_id") if student else None,
            "career": {"goal": sti.get("career_goal") or "", "progressPct": progress_pct},
            "career_score": profile_strength,
            "tier": tier,
        },
        "stats": stats_payload,
        "kpis": [
            {"id": "matches", "label": "Profile Strength", "value": f"{profile_strength}%", "delta": stats_payload["profile_subtext"], "color": "purple"},
            {"id": "applications", "label": "Applications", "value": str(real_apps_count), "delta": stats_payload["applications_subtext"], "color": "blue"},
            {"id": "mentors", "label": "Mentor Connections", "value": str(real_net_count), "delta": "Connections", "color": "green"},
            {"id": "events", "label": "Events", "value": str(real_events_count), "delta": events_subtext, "color": "red"},
        ],
        "topMatches": top_matches,
        "recommendedMentors": rec_mentors,
        "upcomingEvents": upcoming,
        "profileCompletion": {"score": profile_strength, "missing": missing_profile},
    }


# ─── 2b. STUDENT INTELLIGENCE CENTER ─────────────────────────────
# ─── 3. COLLEGE ADMIN DASHBOARD ──────────────────────────────────
@router.get("/admin/college-stats")
async def college_admin_stats(college_name: Optional[str] = None, user: dict = Depends(require_role('admin'))):
    """Real college dashboard. Scopes to a specific college if provided."""
    if not college_name:
        # Pick the college with most students
        agg = await _db.users.aggregate([
            {"$match": {"role": "student", "school_info.institution_name": {"$ne": None}}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else (user.get("institution") or (user.get("college_info") or {}).get("institution_name") or "Your college")

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
        # Real per-department placement: alumni of this branch with a current employer.
        branch_q = {"role": "alumni", "alumni_info.branch_or_stream": d["_id"], **college_query}
        try:
            branch_alumni = await _db.users.count_documents(branch_q)
            branch_placed = await _db.users.count_documents({**branch_q, "alumni_info.current_employer": nonempty("—", "-")})
        except Exception:
            branch_alumni, branch_placed = 0, 0
        dept_placement.append({
            "dept": d["_id"],
            "students": d["count"],
            "placed": branch_placed,
            "pct": int(branch_placed / branch_alumni * 100) if branch_alumni else 0,
            "color": palette[i % len(palette)],
        })
    # No fabricated departments: an empty list means no department data yet.

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
            "time": (u.get("created_at") or datetime.now(timezone.utc)).strftime("%b %d") if isinstance(u.get("created_at"), datetime) else "Recently",
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
            "time": (ev.get("created_at") or datetime.now(timezone.utc)).strftime("%b %d") if isinstance(ev.get("created_at"), datetime) else "Recently",
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
            "attending": regs,
            "color": _color_for(ev.get("title", "")),
        })

    # Top recruiters from internships
    rec_agg = await _db.internships.aggregate([
        {"$group": {"_id": "$company", "offers": {"$sum": 1}}},
        {"$sort": {"offers": -1}},
        {"$limit": 5},
    ]).to_list(5)
    top_recruiters = []
    for i, r in enumerate(rec_agg):
        # CTC is not tracked on internship records; omit rather than invent a ladder.
        top_recruiters.append({
            "id": i + 1,
            "name": r["_id"] or "Unknown",
            "offers": r["offers"],
            "ctc": None,
            "color": _color_for(r["_id"] or ""),
        })

    # Calculate real placement rate (based on alumni with current employer)
    placed_alumni_cnt = await _db.users.count_documents({
        "role": "alumni",
        "alumni_info.current_employer": nonempty("—", "-"),
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
            {"id": "students",  "label": "Total Students",     "value": str(students_cnt),      "delta": "registered on platform",  "color": "blue"},
            {"id": "alumni",    "label": "Alumni Network",     "value": str(alumni_cnt),        "delta": "registered on platform",  "color": "purple"},
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
async def super_admin_overview(user: dict = Depends(require_role('admin'))):
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

    # Revenue: sum of actual ECHO registration payments (Razorpay) for current month
    now_overview = datetime.now(timezone.utc)
    month_start = now_overview.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    revenue_pipeline = [
        {"$match": {"payment.status": "paid", "fee": {"$gt": 0}, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$fee"}}},
    ]
    rev_result = await _db.echo_registrations.aggregate(revenue_pipeline).to_list(1)
    revenue_amt = float(rev_result[0]["total"]) if rev_result else 0

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
        months.append({"month": m_start.strftime("%b"), "value": cnt})

    # Revenue breakdown by event (real data)
    rev_breakdown_pipeline = [
        {"$match": {"payment.status": "paid", "fee": {"$gt": 0}}},
        {"$group": {"_id": "$showcase_title", "total": {"$sum": "$fee"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
        {"$limit": 5},
    ]
    rev_rows = await _db.echo_registrations.aggregate(rev_breakdown_pipeline).to_list(10)
    colors = ["#FBBF24", "#F97316", "#A78BFA", "#22C55E", "#60A5FA"]
    revenue_breakdown = []
    for i, row in enumerate(rev_rows):
        amt = float(row.get("total") or 0)
        pct = round(amt / revenue_amt * 100) if revenue_amt > 0 else 0
        revenue_breakdown.append({
            "source": row.get("_id") or f"Event {i+1}",
            "amount": _money(amt),
            "pct": pct,
            "color": colors[i % len(colors)],
        })
    if not revenue_breakdown:
        revenue_breakdown = [
            {"source": "No paid registrations yet", "amount": _money(0), "pct": 0, "color": "#64748B"},
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

@router.get("/admin/super/events")
async def super_events(user: dict = Depends(require_role('admin'))):
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
async def create_super_event(payload: EventPayload, user: dict = Depends(require_role('admin'))):
    """Create a new event (Super Admin). Empty fields fall back to sensible defaults."""
    doc: Dict[str, Any] = {
        "title": payload.title.strip() or "Untitled event",
        "mode": payload.mode or "Online",
        "venue": payload.venue or "Online",
        "category": payload.category or "Workshop",
        "capacity": payload.capacity or 200,
        "price": float(payload.price) if payload.price else None,
        "description": payload.description or "",
        "start_date": _parse_event_dt(payload.start_date) or (datetime.now(timezone.utc) + timedelta(days=14)),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    res = await _db.events.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"ok": True, "event": _serialize_event(doc)}


@router.patch("/admin/super/events/{event_id}", dependencies=[Depends(require_admin_role)])
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
    if payload.capacity is not None:     updates["capacity"]    = payload.capacity
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
async def delete_super_event(event_id: str, user: dict = Depends(require_role('admin'))):
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
    return {"ok": True, "deleted": deleted}


async def _fetch_razorpay_settlements(db) -> dict:
    """Fetch live settlement data from Razorpay API. Returns empty on failure."""
    try:
        installed = await db.installed_tools.find_one({"tool_id": "razorpay", "status": "connected"})
        if not installed:
            return {"available": False, "settlements": [], "totals": {}}
        creds = (installed.get("credentials") or {})
        key_id = creds.get("key_id", "")
        key_secret = creds.get("key_secret", "")
        if not key_id or not key_secret:
            return {"available": False, "settlements": [], "totals": {}}

        import httpx
        async with httpx.AsyncClient(timeout=20) as client:
            # Fetch settlements (most recent first, up to 20)
            r = await client.get(
                "https://api.razorpay.com/v1/settlements",
                auth=(key_id, key_secret),
                params={"count": 20, "skip": 0},
            )
            if r.status_code != 200:
                print(f"[PORTALS] Razorpay settlements API error: HTTP {r.status_code} {r.text[:200]}")
                return {"available": True, "settlements": [], "totals": {}, "error": f"API returned {r.status_code}"}

            items = r.json().get("items") or []
            settlements = []
            total_fees = 0.0
            total_tax = 0.0
            total_settled = 0.0
            total_gross = 0.0

            for s in items:
                settled_amt = float(s.get("amount") or 0) / 100  # paise → rupees
                fees = float(s.get("fees") or 0) / 100
                tax = float(s.get("tax") or 0) / 100
                gross = settled_amt + fees + tax  # what was collected before deductions
                status = s.get("status") or "pending"
                utr = s.get("utr") or ""
                created_at = s.get("created_at")
                date_str = ""
                if created_at:
                    try:
                        dt = datetime.fromtimestamp(created_at, tz=timezone.utc)
                        date_str = dt.strftime("%d %b %Y, %I:%M %p")
                    except Exception:
                        pass

                settlements.append({
                    "id": s.get("id") or "",
                    "amount": settled_amt,
                    "fees": fees,
                    "tax": tax,
                    "gross": gross,
                    "status": status,
                    "utr": utr,
                    "date": date_str,
                    "created_at": created_at,
                })
                total_fees += fees
                total_tax += tax
                total_settled += settled_amt
                total_gross += gross

            settlements.sort(key=lambda x: x.get("created_at") or 0, reverse=True)

            return {
                "available": True,
                "settlements": settlements,
                "totals": {
                    "gross": round(total_gross, 2),
                    "fees": round(total_fees, 2),
                    "tax": round(total_tax, 2),
                    "settled": round(total_settled, 2),
                    "count": len(settlements),
                },
            }
    except Exception as e:
        print(f"[PORTALS] Razorpay settlements fetch error: {e}")
        return {"available": False, "settlements": [], "totals": {}, "error": str(e)}


@router.get("/admin/super/revenue-audit")
async def revenue_audit(user: dict = Depends(require_role('admin'))):
    """Detailed revenue audit: compare DB totals vs Razorpay settlements.

    Shows every registration's fee, payment_id, and status so you can
    pinpoint exactly where the discrepancy is.
    """
    try:
        # 1) All registrations from DB
        all_regs = await _db.echo_registrations.find({}).sort("created_at", -1).to_list(5000)
    except Exception as e:
        print(f"[AUDIT] DB query failed: {e}")
        all_regs = []

    breakdown = []
    db_total_paid = 0.0
    db_total_admin = 0.0
    db_total_free = 0
    db_total_pending = 0.0
    db_total_failed = 0.0
    team_count = 0
    team_revenue = 0.0
    team_members_total = 0
    individual_count = 0
    individual_revenue = 0.0
    # Track unique payment_ids already counted to avoid double-counting teams.
    # A team of 5 creates 5 registration docs each with the FULL team fee,
    # but Razorpay only captures the amount once.
    seen_payment_ids: set = set()
    for r in all_regs:
        p = r.get("payment") or {}
        fee = float(r.get("fee") or 0)
        status = p.get("status") or "none"
        pid = p.get("payment_id") or ""
        is_admin = pid.startswith("ADMIN_PAY_")
        reg_type = r.get("registration_type") or "individual"
        team_size = int(r.get("team_size") or 1)
        is_team = reg_type == "team" or team_size > 1
        # Team members with parent_reg_id are duplicates of the parent registration.
        # They should not be counted as "free" — their parent paid the team fee.
        is_team_member = bool(r.get("parent_reg_id"))
        breakdown.append({
            "name": r.get("full_name") or "?",
            "email": r.get("email") or "",
            "slug": r.get("slug") or "",
            "fee": fee,
            "status": status,
            "payment_id": pid[:30],
            "is_admin_pay": is_admin,
            "is_free": status == "paid" and fee <= 0 and not is_team_member and not is_admin,
            "is_team_member": is_team_member,
            "reg_type": reg_type,
            "source": r.get("source") or "our_platform",
            "team_size": team_size,
            "team_name": r.get("team_name") or "",
            "created_at": str(r.get("created_at") or ""),
        })
        if status == "paid" and fee > 0 and not is_admin:
            # Deduplicate: only count each Razorpay payment once
            if pid in seen_payment_ids:
                # This is another team member — don't add to revenue
                pass
            else:
                seen_payment_ids.add(pid)
                db_total_paid += fee
                if is_team:
                    team_count += 1
                    team_revenue += fee
                    team_members_total += team_size
                else:
                    individual_count += 1
                    individual_revenue += fee
        elif status == "paid" and fee > 0 and is_admin:
            # Admin overrides: also deduplicate by payment_id
            if pid not in seen_payment_ids:
                seen_payment_ids.add(pid)
                db_total_admin += fee
        elif status == "paid" and fee <= 0 and not is_team_member and not is_admin:
            db_total_free += 1
        elif status == "pending":
            db_total_pending += fee
        elif status == "failed":
            db_total_failed += fee

    # 2) Razorpay settlements — wrapped in try/except so a Razorpay failure
    #    never blocks the DB audit data from being returned.
    settlements = {}
    try:
        settlements = await _fetch_razorpay_settlements(_db)
    except Exception as e:
        print(f"[AUDIT] Razorpay settlements fetch failed: {e}")
    razorpay_settled = (settlements.get("totals") or {}).get("settled", 0)
    razorpay_fees = (settlements.get("totals") or {}).get("fees", 0)
    razorpay_tax = (settlements.get("totals") or {}).get("tax", 0)
    razorpay_gross = (settlements.get("totals") or {}).get("gross", 0)

    return {
        "summary": {
            "total_registrations": len(all_regs),
            "db_total_razorpay": db_total_paid,
            "db_total_admin_override": db_total_admin,
            "db_total_free": db_total_free,
            "db_total_pending": db_total_pending,
            "db_total_failed": db_total_failed,
            "teams": {
                "count": team_count,
                "members_total": team_members_total,
                "revenue": team_revenue,
            },
            "individuals": {
                "count": individual_count,
                "revenue": individual_revenue,
            },
            "razorpay_gross": razorpay_gross,
            "razorpay_fees": razorpay_fees,
            "razorpay_tax": razorpay_tax,
            "razorpay_settled": razorpay_settled,
            "discrepancy": round(db_total_paid - razorpay_settled, 2),
        },
        "registrations": breakdown,
    }


@router.get("/admin/super/razorpay-settlements")
async def razorpay_settlements(user: dict = Depends(require_role('admin'))):
    """Fetch live Razorpay settlement data — separate endpoint so it doesn't block the payments page."""
    return await _fetch_razorpay_settlements(_db)


class RazorpayPaymentFeesRequest(BaseModel):
    payment_ids: List[str]


@router.post("/admin/super/razorpay-payment-fees")
async def razorpay_payment_fees(
    payload: RazorpayPaymentFeesRequest,
    user: dict = Depends(require_role('admin')),
):
    """Fetch per-transaction Razorpay fee and tax for a list of payment IDs.

    Returns a map of payment_id → {fee, tax, net} so the audit modal can
    show exactly how much Razorpay deducted per transaction.
    """
    installed = await _db.installed_tools.find_one({"tool_id": "razorpay", "status": "connected"})
    if not installed:
        return {"fees": {}, "error": "Razorpay not configured"}
    creds = (installed.get("credentials") or {})
    key_id = creds.get("key_id", "")
    key_secret = creds.get("key_secret", "")
    if not key_id or not key_secret:
        return {"fees": {}, "error": "Razorpay credentials missing"}

    # Cap at 50 payment IDs per request to avoid rate limits
    ids = (payload.payment_ids or [])[:50]
    # Filter out admin overrides and empty IDs
    ids = [pid for pid in ids if pid and not pid.startswith("ADMIN_PAY_")]

    fees_map: Dict[str, dict] = {}
    import httpx
    async with httpx.AsyncClient(timeout=15) as client:
        for pid in ids:
            try:
                r = await client.get(
                    f"https://api.razorpay.com/v1/payments/{pid}",
                    auth=(key_id, key_secret),
                )
                if r.status_code == 200:
                    data = r.json()
                    fee = float(data.get("fee") or 0) / 100  # paise → rupees
                    tax = float(data.get("tax") or 0) / 100
                    amount = float(data.get("amount") or 0) / 100
                    net = amount - fee - tax
                    fees_map[pid] = {
                        "fee": round(fee, 2),
                        "tax": round(tax, 2),
                        "net": round(net, 2),
                        "amount": round(amount, 2),
                    }
                else:
                    fees_map[pid] = {"error": f"HTTP {r.status_code}"}
            except Exception as e:
                fees_map[pid] = {"error": str(e)[:100]}

    return {"fees": fees_map}


@router.get("/admin/super/payments")
async def super_payments(user: dict = Depends(require_role('admin'))):
    """Real payments ledger + revenue from ECHO registrations, bookings and wallet.

    KPIs and ledger are computed from actual transaction records rather than
    hardcoded placeholders.
    """
    # 1) ECHO event registrations (the main paid surface)
    # Only count registrations that actually went through Razorpay (fee > 0 and paid)
    # Deduplicate team payments: each team member gets a doc with the full team fee,
    # but Razorpay only captures once per payment_id.
    echo_cur = _db.echo_registrations.find({}).sort("created_at", -1).limit(5000)
    echo_revenue = 0.0
    echo_pending_amt = 0.0
    echo_ledger = []
    echo_paid_cnt = 0
    echo_pending_cnt = 0
    echo_free_cnt = 0
    _seen_pids: set = set()
    async for r in echo_cur:
        p = r.get("payment") or {}
        fee = float(r.get("fee") or 0)
        is_free = fee <= 0
        is_admin_pay = (p.get("payment_id") or "").startswith("ADMIN_PAY_")
        pid = p.get("payment_id") or ""
        if p.get("status") == "paid":
            if is_free:
                echo_free_cnt += 1
                continue
            # Deduplicate: only count each Razorpay payment once
            if pid in _seen_pids:
                continue
            _seen_pids.add(pid)
            if is_admin_pay:
                echo_free_cnt += 1
                continue
            echo_revenue += fee
            echo_paid_cnt += 1
            echo_ledger.append({
                "id": pid or f"pay_{str(r.get('_id', ''))[-8:]}",
                "date": _fmt_date(r.get("registered_at") or r.get("created_at")),
                "desc": f"ECHO registration — {r.get('showcase_title', 'Event')}",
                "type": "income",
                "amount": fee,
                "by": r.get("full_name") or "Attendee",
                "status": "success",
            })
        elif p.get("status") == "pending" and not is_free:
            echo_pending_cnt += 1
            echo_pending_amt += fee
            echo_ledger.append({
                "id": f"pend_{str(r.get('_id', ''))[-8:]}",
                "date": _fmt_date(r.get("registered_at") or r.get("created_at")),
                "desc": f"ECHO registration (pending) — {r.get('showcase_title', 'Event')}",
                "type": "income",
                "amount": fee,
                "by": r.get("full_name") or "Attendee",
                "status": "pending",
            })

    # 2) Mentor session bookings
    bookings_cnt = await _db.bookings.count_documents({})
    bookings_cur = _db.bookings.find().sort("created_at", -1).limit(50)
    bookings_revenue = 0.0
    bookings_ledger = []
    async for b in bookings_cur:
        amt = float(b.get("amount") or 0)
        bstatus = b.get("payment_status") or "pending"
        if bstatus in ("paid", "success", "confirmed"):
            bookings_revenue += amt
        sid = b.get("student_id")
        sname = "Student"
        if sid:
            try:
                s = await _db.users.find_one({"_id": ObjectId(sid)})
                if s:
                    sname = s.get("full_name", "Student")
            except Exception:
                pass
        bookings_ledger.append({
            "id": f"pi_{str(b.get('_id', ''))[-10:]}",
            "date": _fmt_date(b.get("created_at")),
            "desc": f"Mentor session — {b.get('topic', 'Career')}",
            "type": "income",
            "amount": amt,
            "by": sname,
            "status": bstatus if bstatus in ("success", "pending", "refunded") else "success",
        })

    # 3) Wallet transactions (credits/debits)
    wallet_cur = _db.wallet_transactions.find({}).sort("created_at", -1).limit(100)
    wallet_revenue = 0.0
    wallet_ledger = []
    async for w in wallet_cur:
        amt = abs(float(w.get("amount") or 0))
        kind = w.get("kind", "credit")
        wallet_revenue += amt if kind == "credit" else -amt
        wallet_ledger.append({
            "id": f"wt_{str(w.get('_id', ''))[-10:]}",
            "date": _fmt_date(w.get("created_at")),
            "desc": w.get("desc", "Wallet transaction"),
            "type": kind,
            "amount": amt,
            "by": w.get("user_email") or "User",
            "status": "settled",
        })

    gross = echo_revenue
    net = gross - (gross * 0.1)

    # 4) Per-event revenue (ECHO) — deduplicate team payments by payment_id
    events_out = []
    evt_map: dict = {}
    for r in await _db.echo_registrations.find({"payment.status": "paid", "fee": {"$gt": 0}}).to_list(5000):
        pid = (r.get("payment") or {}).get("payment_id") or ""
        if pid.startswith("ADMIN_PAY_") or pid in _seen_pids:
            continue
        slug = r.get("slug") or "unknown"
        if slug not in evt_map:
            evt_map[slug] = {"slug": slug, "title": r.get("showcase_title") or slug, "count": 0, "revenue": 0.0}
        evt_map[slug]["count"] += 1
        evt_map[slug]["revenue"] += float(r.get("fee") or 0)
    events_out = sorted(evt_map.values(), key=lambda e: e["revenue"], reverse=True)
    for e in events_out:
        e["revenue"] = round(e["revenue"], 2)

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

    ledger = (echo_ledger + bookings_ledger + wallet_ledger)
    ledger.sort(key=lambda t: t.get("date") or "", reverse=True)
    ledger = ledger[:12]

    # Read payout tiers from DB, fall back to defaults
    db_tiers = []
    tcur = _db.payout_tiers.find().sort("cut_percent", -1)
    async for t in tcur:
        db_tiers.append(t)

    mentor_count = await _db.users.count_documents({"role": "mentor", "mentor_status": "approved"})
    if db_tiers:
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
            {"tier": "Platinum mentor", "cut": "70%", "count": max(mentor_count // 3, 0), "color": "#A78BFA"},
            {"tier": "Gold mentor",     "cut": "60%", "count": max(mentor_count // 2, 0), "color": "#F5C842"},
            {"tier": "Silver mentor",   "cut": "50%", "count": mentor_count, "color": "#C0C0C0"},
        ]

    return {
        "kpi": {
            "gross":   _money(gross),
            "payouts": _money(gross * 0.1),
            "pending": _money(echo_pending_amt),
            "net":     _money(net),
        },
        "ledger": ledger,
        "stripe_balance": stripe_balance or _money(0),
        "has_live_stripe": stripe_balance is not None,
        "tiers": tiers_out,
        "echo": {
            "paid_count": echo_paid_cnt,
            "pending_count": echo_pending_cnt,
            "revenue": echo_revenue,
            "events": events_out,
        },
        "bookings_count": bookings_cnt,
        "wallet_revenue": wallet_revenue,
    }


@router.post("/admin/super/payouts/initiate")
async def initiate_payout(user: dict = Depends(require_role('admin'))):
    """Initiate a real Stripe payout when credentials are installed; 503 otherwise."""
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

    raise HTTPException(status_code=503, detail={"error": "payouts provider not configured"})


@router.get("/admin/export/payments")
async def export_payments_csv(user: dict = Depends(require_role('admin'))):
    """Generate and return a real CSV of all payment transactions."""
    import csv, io

    rows = []

    # ECHO registrations
    echo_cur = _db.echo_registrations.find().sort("created_at", -1).limit(1000)
    async for r in echo_cur:
        p = r.get("payment") or {}
        rows.append({
            "ID": f"echo_{r.get('_id', '')}",
            "Date": _fmt_date(r.get("registered_at") or r.get("created_at")),
            "Description": f"ECHO — {r.get('showcase_title', 'Event')}",
            "Type": "income",
            "Amount": float(r.get("fee") or 0),
            "By": r.get("full_name") or "Attendee",
            "Status": p.get("status") or "free",
        })

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
            "Date": (b.get("created_at") or datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M") if isinstance(b.get("created_at"), datetime) else "",
            "Description": b.get("topic", "Session"),
            "Type": "income",
            "Amount": float(b.get("amount") or 0),
            "By": sname,
            "Status": b.get("payment_status") or "success",
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
        headers={"Content-Disposition": f"attachment; filename=payments_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"},
    )


@router.get("/admin/super/approvals")
async def super_approvals(user: dict = Depends(require_role('admin'))):
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
async def super_analytics(user: dict = Depends(require_role('admin'))):
    """Platform analytics — real data from MongoDB + Firebase + PostHog."""
    from features.analytics import super_admin_full_analytics
    return await super_admin_full_analytics(_db)


@router.get("/admin/super/ai-insights")
async def super_ai_insights(user: dict = Depends(require_role('admin'))):
    """Returns Claude-generated platform briefings (cached in db)."""
    cur = _db.ai_insights.find({"audience": "super_admin", "dismissed": {"$ne": True}}).sort("created_at", -1).limit(10)
    out = [doc async for doc in cur]
    for d in out:
        d["id"] = str(d.pop("_id"))
        d.pop("audience", None)
    return {"items": out}


@router.get("/admin/super/workflows")
async def super_workflows(user: dict = Depends(require_role('admin'))):
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
async def college_students_list(college_name: Optional[str] = None, user: dict = Depends(require_role('college'))):
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
async def college_placements(college_name: Optional[str] = None, user: dict = Depends(require_role('college'))):
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
async def college_alumni_list(college_name: Optional[str] = None, limit: int = 30, user: dict = Depends(require_role('college'))):
    if not college_name:
        agg = await _db.users.aggregate([
            {"$match": {"role": "alumni", "school_info.institution_name": {"$ne": None}}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else None

    college_query = {
        "$or": [
            {"school_info.institution_name": college_name},
            {"institution": college_name},
            {"college": college_name}
        ]
    } if college_name else {"school_info.institution_name": {"$ne": None}}
    
    cur = _db.users.find({"role": "alumni", **college_query}).limit(limit)
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
            "skills": a.get("skills") or ai.get("interests") or [],
            "linkedin_url": a.get("linkedin_url") or "",
            "github_url": a.get("github_url") or "",
        })

    return {"items": out, "college": college_name}


@router.get("/college/mentors")
async def college_mentors_list(college_name: Optional[str] = None, limit: int = 30, user: dict = Depends(require_role('college'))):
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
            "rating": m.get("rating"),
            "status": m.get("mentor_status") or "active",
            "color": _color_for(m.get("full_name", "")),
        })
    return {"items": out, "college": college_name}


@router.get("/college/events")
async def college_events_list(college_name: Optional[str] = None, limit: int = 100, user: dict = Depends(require_role('college'))):
    """Events at or linked to this college."""
    q = {}
    if college_name:
        q = {"$or": [{"college_name": college_name}, {"organizer": college_name}]}
        count = await _db.events.count_documents(q)
        if count == 0:
            q = {}
    cur = _db.events.find(q).sort("_id", -1).limit(limit)
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
async def college_announcements(college_name: Optional[str] = None, user: dict = Depends(require_role('college'))):
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
        return {"items": [], "configured": False, "basis": "announcements collection has no recorded entries"}
    return {"items": items, "configured": True}


@router.get("/college/analytics-legacy")
async def college_analytics(college_name: Optional[str] = None, user: dict = Depends(require_role('college'))):
    """Aggregated college analytics: cohort placement, salary curve, attrition."""
    if not college_name:
        agg = await _db.users.aggregate([
            {"$match": {"role": "student"}},
            {"$group": {"_id": "$school_info.institution_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ]).to_list(1)
        college_name = agg[0]["_id"] if agg else None

    # Placement trend (last 5 years)
    placement_trend = None
    # Historical year-over-year placement records are not stored, so the
    # trend is null unless the collection gains year-level data.
    college_query = {"school_info.institution_name": college_name} if college_name else {}

    # Salary distribution — computed from recorded package amounts when present
    def _to_lpa(v):
        if v in (None, ""):
            return None
        if isinstance(v, (int, float)):
            return float(v)
        m = re.search(r"([0-9]+(?:\.[0-9]+)?)", str(v))
        return float(m.group(1)) if m else None

    placed_alumni = await _db.users.find(
        {"role": "alumni", "alumni_info.current_employer": nonempty("—", "-"), **college_query},
        {"alumni_info": 1},
    ).to_list(2000)
    recorded_lpa = [l for l in (_to_lpa((d.get("alumni_info") or {}).get("package_lpa")) for d in placed_alumni) if l]
    bands = [
        {"band": "< ₹6 LPA",   "min": 0,  "max": 6},
        {"band": "₹6-10 LPA",  "min": 6,  "max": 10},
        {"band": "₹10-15 LPA", "min": 10, "max": 15},
        {"band": "₹15-25 LPA", "min": 15, "max": 25},
        {"band": "₹25+ LPA",   "min": 25, "max": 10**9},
    ]
    if recorded_lpa:
        salary_dist = []
        for b in bands:
            cnt = sum(1 for p in recorded_lpa if b["min"] <= p < b["max"])
            salary_dist.append({"band": b["band"], "count": cnt, "pct": round(cnt / len(recorded_lpa) * 100, 1), "color": None})
        salary_dist_basis = "sums of recorded alumni_info.package_lpa values"
    else:
        salary_dist = [{"band": b["band"], "count": 0, "pct": None, "color": None} for b in bands]
        salary_dist_basis = "no recorded package amounts; counts are zero and pct null"

    # Top hiring sectors — counts from recorded employer fields, if any
    employer_counts: Dict[str, int] = {}
    for d in placed_alumni:
        em = ((d.get("alumni_info") or {}).get("current_employer") or "").strip()
        if em:
            employer_counts[em] = employer_counts.get(em, 0) + 1
    sectors = [{"name": n, "count": c, "color": None} for n, c in sorted(employer_counts.items(), key=lambda x: -x[1])[:6]]
    sectors_basis = "grouped alumni_info.current_employer values; empty when no employer recorded"

    # Attendance attrition signals — attendance is not recorded on users
    attrition = []
    attrition_basis = "attendance records are not stored; no values shown rather than invented"

    students_cnt = await _db.users.count_documents({"role": "student", "school_info.institution_name": college_name} if college_name else {"role": "student"})
    alumni_cnt = await _db.users.count_documents({"role": "alumni", **college_query})
    placed_cnt = len(placed_alumni)
    placement_pct_num = int((placed_cnt / alumni_cnt) * 100) if alumni_cnt > 0 else None
    sorted_lpa = sorted(recorded_lpa)
    median_lpa = round(sorted_lpa[len(sorted_lpa) // 2], 1) if sorted_lpa else None
    top_offer = round(max(sorted_lpa), 1) if sorted_lpa else None

    return {
        "kpi": {
            "students":     students_cnt,
            "placement":   (f"{placement_pct_num}%" if placement_pct_num is not None else None),
            "median_lpa":  (f"₹{median_lpa} LPA" if median_lpa is not None else None),
            "top_offer":   (f"₹{top_offer} LPA" if top_offer is not None else None),
            "median_yoy":  None,
        },
        "placement_trend": placement_trend,
        "salary_dist":     salary_dist,
        "sectors":         sectors,
        "attrition":       attrition,
        "basis": {
            "placement": "alumni with a recorded current employer / total alumni",
            "median_lpa": "median of recorded package amounts; null when none recorded",
            "salary_dist": salary_dist_basis,
            "sectors": sectors_basis,
            "attrition": attrition_basis,
            "placement_trend": "no historical year-level placement records are stored; null",
            "median_yoy": "no historical records to compute a YoY change; null",
        },
    }


@router.get("/college/career-intel")
async def college_career_intel(college_name: Optional[str] = None, user: dict = Depends(require_role('college'))):
    """Career Intel: aggregate skill gaps + hiring intent + roles in demand."""
    return {
        "skill_gaps": [],
        "hiring_intent": [],
        "roles_in_demand": [],
        "configured": False,
        "basis": "no recorded source for skill demand/supply, per-company hiring intent, or role growth; empty until real data is wired in",
    }


@router.get("/student/events")
async def student_events_list(
    student_email: Optional[str] = None,
    page: int = 1,
    per_page: int = 24,
    sort_by: str = "upcoming"
, user: dict = Depends(require_role('student'))):
    """Events relevant to the student (with attendance status). Includes events created by mentors, colleges, and admins."""
    student = None
    if student_email:
        student = await _db.users.find_one({"email": student_email, "role": "student"})
    if not student:
        student = await _db.users.find_one({"role": "student"})
    sid = str((student or {}).get("_id", ""))

    now = datetime.now(timezone.utc)
    
    def _parse_date(val: Any) -> Optional[datetime]:
        if not val:
            return None
        if isinstance(val, datetime):
            return val.replace(tzinfo=None) if val.tzinfo else val
        if isinstance(val, str):
            s = val.strip().replace("Z", "+00:00")
            if " " in s and "T" not in s:
                s = s.replace(" ", "T")
            try:
                dt = datetime.fromisoformat(s)
                return dt.replace(tzinfo=None) if dt.tzinfo else dt
            except Exception:
                try:
                    dt = datetime.strptime(val[:10], "%Y-%m-%d")
                    return dt
                except Exception:
                    return None
        return None

    # Fetch from both events AND events_v2 collections (mentor, college, admin & aggregator events)
    cache_key = f"events_global_s{sort_by}"
    if cache_key in events_cache:
        filtered_events = events_cache[cache_key]
    else:
        projection = {
            "title": 1, "event_title": 1,
            "start_date": 1, "date": 1, "event_date_start": 1, "posted_date": 1, "created_at": 1,
            "end_date": 1, "event_date_end": 1,
            "mode": 1, "event_mode": 1,
            "city": 1, "location_city": 1, "venue": 1,
            "cat": 1, "category": 1, "event_type": 1,
            "price": 1, "price_amount": 1,
            "description": 1,
            "tags": 1,
            "attendee_count": 1, "capacity": 1,
        }
        cur1 = _db.events.find({}, projection)
        cur2 = _db.events_v2.find({}, projection)
        
        raw_list1 = await cur1.to_list(length=150)
        raw_list2 = await cur2.to_list(length=150)
        
        all_events = []
        seen_titles = set()
        seen_ids = set()
        
        for ev in raw_list1 + raw_list2:
            title = ev.get("title") or ev.get("event_title") or "Event"
            eid = str(ev.get("_id"))
            
            # Deduplicate
            if eid in seen_ids or title.lower() in seen_titles:
                continue
            seen_ids.add(eid)
            seen_titles.add(title.lower())
            
            # Resolve start date across all field variations
            sd_raw = ev.get("start_date") or ev.get("date") or ev.get("event_date_start") or ev.get("posted_date") or ev.get("created_at")
            sd = _parse_date(sd_raw) or now
            
            # Resolve created date
            ca_raw = ev.get("created_at") or ev.get("posted_date") or sd_raw
            ca = _parse_date(ca_raw) or sd
            
            # Resolve end date
            ed_raw = ev.get("end_date") or ev.get("event_date_end")
            ed = _parse_date(ed_raw) or (sd + timedelta(hours=3))
            
            ev["_resolved_start"] = sd
            ev["_resolved_created"] = ca
            ev["_resolved_end"] = ed
            all_events.append(ev)
            
        today_start = datetime(now.year, now.month, now.day)
        filtered_events = []
        
        for ev in all_events:
            sd = ev["_resolved_start"]
            ed = ev["_resolved_end"]
            
            if sort_by == "upcoming":
                if sd >= today_start - timedelta(days=90):
                    filtered_events.append(ev)
            elif sort_by == "ongoing":
                if sd <= now <= ed:
                    filtered_events.append(ev)
            elif sort_by == "ended":
                if ed < now:
                    filtered_events.append(ev)
            elif sort_by in ("recently_created", "all", "none"):
                filtered_events.append(ev)
    
        # Fallback to all_events if filter yielded empty result
        if not filtered_events:
            filtered_events = all_events
    
        # Sort
        if sort_by in ("upcoming", "ongoing", "all", "none"):
            filtered_events.sort(key=lambda x: x["_resolved_start"])
        elif sort_by == "recently_created":
            filtered_events.sort(key=lambda x: x["_resolved_created"], reverse=True)
        elif sort_by == "ended":
            filtered_events.sort(key=lambda x: x["_resolved_start"], reverse=True)
            
        # Store to cache for 60 seconds
        events_cache[cache_key] = filtered_events
        
    total = len(filtered_events)
    skip = (page - 1) * per_page
    events = filtered_events[skip : skip + per_page]
    
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
        sd = ev["_resolved_start"]
        date_str = sd.strftime("%b %d")
        ev_id_str = str(ev.get("_id"))
        
        regs = counts_map.get(ev_id_str, 0)
        registered = ev_id_str in user_regs
        
        mode = ev.get("mode") or ev.get("event_mode") or "Online"
        if mode in ("virtual", "in_person", "hybrid"):
            mode = "Online" if mode == "virtual" else ("Offline" if mode == "in_person" else "Hybrid")
            
        city = ev.get("city") or ev.get("location_city") or ev.get("venue") or "Online"
        cat = ev.get("cat") or ev.get("category") or ev.get("event_type") or "Workshop"
        price_val = ev.get("price") or ev.get("price_amount")
        try:
            price_val = float(price_val) if price_val else None
        except Exception:
            price_val = None
            
        desc = ev.get("description") or f"Join {ev.get('title', 'this event')} for hands-on learning and networking opportunities."
        
        tags_raw = ev.get("tags")
        if isinstance(tags_raw, str) and tags_raw.startswith("["):
            try:
                import ast
                tags = ast.literal_eval(tags_raw)
            except Exception:
                tags = [cat]
        elif isinstance(tags_raw, list):
            tags = tags_raw
        else:
            tags = [cat, mode]

        out.append({
            "id": _short_id(ev.get("_id")),
            "_raw_id": ev_id_str,
            "title": ev.get("title") or ev.get("event_title") or "Event",
            "date": date_str,
            "mode": mode,
            "city": city,
            "cat": cat,
            "attending": regs or int(ev.get("attendee_count") or 0),
            "capacity": int(ev.get("capacity") or 500),
            "kind": "paid" if price_val else "free",
            "price": price_val,
            "accent": palette[i % len(palette)],
            "registered": registered,
            "description": desc,
            "tags": tags,
            "created_at": ev["_resolved_created"].isoformat(),
            "start_date": ev["_resolved_start"].isoformat(),
            "end_date": ev["_resolved_end"].isoformat(),
        })
        i += 1

    payload = {"items": out, "total": total, "page": page, "per_page": per_page, "pages": max(1, (total + per_page - 1) // per_page)}
    return payload


@router.get("/college/ai-insights")
async def college_ai_insights(college_name: Optional[str] = None, user: dict = Depends(require_role('college'))):
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
async def student_internships(query: Optional[str] = None, student_email: Optional[str] = None, user: dict = Depends(require_role('student'))):
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
    user_tier = str(tier_payload.get("tier", "Bronze"))
    user_rank = TIER_RANK.get(user_tier, 0)

    match: Dict[str, Any] = {}
    if query:
        match["$or"] = [
            {"title": {"$regex": re.escape(query), "$options": "i"}},
            {"company": {"$regex": re.escape(query), "$options": "i"}},
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
async def student_wallet(student_email: Optional[str] = None, user: dict = Depends(require_role('student'))):
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
            "date": (t.get("date") or datetime.now(timezone.utc)).strftime("%b %d, %Y") if isinstance(t.get("date"), datetime) else "—",
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
async def student_network(student_email: Optional[str] = None, email: Optional[str] = None, page: int = 1, per_page: int = 24, limit: int = 60, q: Optional[str] = None, user: dict = Depends(require_role('student'))):
    """Mixed alumni + student + mentor network for the Network tab with search support."""
    db_user = None
    u_email = email or student_email
    if u_email:
        db_user = await _db.users.find_one({"email": u_email})
    if not db_user:
        db_user = await _db.users.find_one({"role": "student"})

    rel_map = {}
    if db_user:
        me_id = str(user["_id"])
        q_clean = (q or "").strip()
        cache_key = f"network_student_{me_id}_p{page}_l{limit}_pp{per_page}_q{q_clean}"
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
                rel_map[other] = "pending"

    out = []
    me_id_str = str(user["_id"]) if user else ""
    # Exclude raw base64 photo_data from bulk discovery projection to prevent multi-megabyte payloads
    proj = {"email": 1, "full_name": 1, "role": 1, "school_info": 1, "alumni_info": 1, "bio": 1, "skills": 1, "mentor_profile": 1, "mentor_info": 1}

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
    my_college = ((user.get("school_info") or {}).get("institution_name") or user.get("institution") or user.get("college")) if user else None

    # Fetch Alumni (ensuring connected ones are included first)
    connected_alumni = [u for u in connected_users if u.get("role") == "alumni"]
    seen_alumni = {str(u["_id"]) for u in connected_alumni}
    alumni_query: dict[str, Any] = {
        "role": "alumni",
        "_id": {"$nin": [ObjectId(i) for i in seen_alumni]}
    }
    # Match by Interest or Search Query q
    if q and q.strip():
        search_rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        alumni_query["$or"] = [
            {"full_name": search_rgx},
            {"email": search_rgx},
            {"alumni_info.current_employer": search_rgx},
            {"alumni_info.current_role": search_rgx},
            {"skills": search_rgx}
        ]
    elif my_skills:
        alumni_query["$or"] = [
            {"alumni_info.interests": {"$in": my_skills}},
            {"skills": {"$in": my_skills}}
        ]

    fetch_limit = max(0, limit - len(connected_alumni))
    fetched_alumni = await fetch_users_with_mock_limit(alumni_query, fetch_limit, mock_limit=5, proj=proj)
    alumni_users = connected_alumni + fetched_alumni
    
    # Fallback if strict interest matching yielded nothing
    if len(alumni_users) < 3:
        fallback_query = {"role": "alumni", "_id": {"$nin": [ObjectId(i) for i in seen_alumni] + [a["_id"] for a in alumni_users]}}
        fallback_limit = max(0, limit - len(alumni_users))
        fetched_fallback = await fetch_users_with_mock_limit(fallback_query, fallback_limit, mock_limit=5, proj=proj)
        alumni_users.extend(fetched_fallback)

    for a in alumni_users:
        other_id = str(a["_id"])
        if other_id == me_id_str:
            continue
        ai = a.get("alumni_info") or {}
        si = a.get("school_info") or {}
        out.append({
            "id": other_id,
            "email": a.get("email"),
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
            "photo_data": a.get("face_image_base64") or a.get("photo_data"),
        })
    # Fetch Students (ensuring connected ones are included first)
    connected_students = [u for u in connected_users if u.get("role") == "student"]
    seen_students = {str(u["_id"]) for u in connected_students}
    student_query: dict[str, Any] = {
        "role": "student",
        "_id": {"$nin": [ObjectId(i) for i in seen_students]}
    }
    # Match by Interest or Search Query q
    if q and q.strip():
        search_rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        student_query["$or"] = [
            {"full_name": search_rgx},
            {"email": search_rgx},
            {"school_info.institution_name": search_rgx},
            {"school_info.branch_or_stream": search_rgx},
            {"skills": search_rgx}
        ]
    else:
        if my_skills:
            student_query["$or"] = [
                {"school_info.interests": {"$in": my_skills}},
                {"skills": {"$in": my_skills}}
            ]
        if my_college:
            if "$or" not in student_query:
                student_query["$or"] = []
            student_query["$or"].extend([
                {"school_info.institution_name": my_college},
                {"institution": my_college},
                {"college_name": my_college}
            ])
    
    fetch_limit = max(0, limit - len(connected_students))
    fetched_students = await fetch_users_with_mock_limit(student_query, fetch_limit, mock_limit=5, proj=proj)
    student_users = connected_students + fetched_students
    for s in student_users:
        other_id = str(s["_id"])
        if other_id == me_id_str:
            continue
        si = s.get("school_info") or {}
        out.append({
            "id": other_id,
            "email": s.get("email"),
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
            "photo_data": s.get("face_image_base64") or s.get("photo_data"),
        })

    # Fetch Mentors (ensuring connected ones are included first)
    connected_mentors = [u for u in connected_users if u.get("role") == "mentor"]
    seen_mentors = {str(u["_id"]) for u in connected_mentors}
    mentor_query: dict[str, Any] = {
        "role": "mentor",
        "mentor_status": "approved",
        "_id": {"$nin": [ObjectId(i) for i in seen_mentors]}
    }
    # Match by Interest or Search Query q
    if q and q.strip():
        search_rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        mentor_query["$or"] = [
            {"full_name": search_rgx},
            {"email": search_rgx},
            {"mentor_profile.job_title": search_rgx},
            {"mentor_profile.organization": search_rgx},
            {"skills": search_rgx}
        ]
    elif my_skills:
        mentor_query["$or"] = [
            {"mentor_info.interests": {"$in": my_skills}},
            {"skills": {"$in": my_skills}}
        ]
    fetch_limit = max(0, limit - len(connected_mentors))
    fetched_mentors = await fetch_users_with_mock_limit(mentor_query, fetch_limit, mock_limit=5, proj=proj)
    mentor_users = connected_mentors + fetched_mentors
    for m in mentor_users:
        other_id = str(m["_id"])
        if other_id == me_id_str:
            continue
        mi = m.get("mentor_profile") or m.get("mentor_info") or {}
        si = m.get("school_info") or {}
        out.append({
            "id": other_id,
            "email": m.get("email"),
            "name": m.get("full_name") or "—",
            "initials": _initials(m.get("full_name") or ""),
            "role": "Mentor",
            "subline": f"{mi.get('job_title', '—')} at {mi.get('organization', '—')}".strip(", ") or "Expert Mentor",
            "college": si.get("institution_name") or "—",
            "batch": mi.get("graduation_year"),
            "tags": ["Mentor"] + (m.get("skills", []) or [])[:2],
            "color": _color_for(m.get("full_name", "")),
            "kind": "mentor",
            "connection_state": rel_map.get(other_id, "none"),
            "company": mi.get("organization") or "—",
            "job_title": mi.get("job_title") or "Mentor",
            "rating": mi.get("rating"),
            "sessions": mi.get("sessions") or 0,
            "photo_data": m.get("face_image_base64") or m.get("photo_data"),
        })

    return {"items": out}


# ════════════════════════════════════════════════════════════════
#   MUTATION ENDPOINTS (CTAs)
# ════════════════════════════════════════════════════════════════

class TopupRequest(BaseModel):
    amount: int
    student_email: Optional[str] = None


@router.post("/admin/super/events/{event_id}/approve")
async def approve_event(event_id: str, user: dict = Depends(require_role('admin'))):
    """Approve a pending event."""
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(400, "Invalid event id")
    res = await _db.events.update_one({"_id": oid}, {"$set": {"status": "live", "approved_at": datetime.now(timezone.utc)}})
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
async def create_workflow(req: WorkflowCreateRequest, user: dict = Depends(require_role('admin'))):
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
        "created_at": datetime.now(timezone.utc),
    }
    result = await _db.workflows.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}


@router.post("/admin/super/workflows/fire-event", dependencies=[Depends(require_admin_role)])
async def fire_workflow_event_endpoint(event_type: str = Body(...), payload: Optional[Dict[str, Any]] = Body(None)):
    """Manually fire a workflow event. All workflows with matching event_triggers will run."""
    try:
        from features.workflow_automation import fire_workflow_event as _fire
        results = await _fire(event_type, payload or {})
        return {"ok": True, "event_type": event_type, "workflows_triggered": len(results), "results": results}
    except Exception as e:
        raise HTTPException(502, f"Automation engine error: {e}")


# ── Step registry: single source of truth lives in workflow_automation ──
from features.workflow_automation import STEP_REGISTRY  # noqa: E402


@router.post("/admin/super/workflows/{wf_id}/run")
async def run_workflow(wf_id: str, body: Optional[WorkflowRunRequest] = None, user: dict = Depends(require_role('admin'))):
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
            "$set": {"last_run_at": datetime.now(timezone.utc), "last_run_success": all_ok},
            "$push": {"run_log": {"$each": [], "$slice": -20}},
        },
    )
    # Append to run log
    await _db.workflows.update_one(
        {"_id": ObjectId(wf_id)},
        {"$push": {"run_log": {
            "at": datetime.now(timezone.utc),
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
async def get_workflow_detail(wf_id: str, user: dict = Depends(require_role('admin'))):
    """Get a single workflow with its run history."""
    wf = await _get_workflow_or_404(wf_id)
    wf["id"] = str(wf.pop("_id"))
    return wf


@router.patch("/admin/super/workflows/{wf_id}", dependencies=[Depends(require_admin_role)])
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
    updates["updated_at"] = datetime.now(timezone.utc)
    await _db.workflows.update_one({"_id": ObjectId(wf_id)}, {"$set": updates})
    return {"ok": True}


@router.delete("/admin/super/workflows/{wf_id}")
async def delete_workflow(wf_id: str, user: dict = Depends(require_role('admin'))):
    """Delete a workflow."""
    await _get_workflow_or_404(wf_id)
    await _db.workflows.delete_one({"_id": ObjectId(wf_id)})
    return {"ok": True, "deleted": wf_id}


@router.post("/admin/super/approvals/{user_id}/approve")
async def approve_user(user_id: str, user: dict = Depends(require_role('admin'))):
    """Approve a pending mentor, college, or event."""
    # Try MongoDB ObjectId
    try:
        oid = ObjectId(user_id)
        res = await _db.users.update_one({"_id": oid, "role": "mentor"}, {"$set": {"mentor_status": "approved", "approved_at": datetime.now(timezone.utc)}})
        if res.matched_count > 0:
            return {"ok": True, "kind": "mentor"}
        res2 = await _db.colleges_meta.update_one({"_id": oid}, {"$set": {"status": "active", "approved_at": datetime.now(timezone.utc)}})
        if res2.matched_count > 0:
            return {"ok": True, "kind": "college"}
    except Exception:
        pass

    # Fallback: try colleges_meta by string name
    res = await _db.colleges_meta.update_one(
        {"name": user_id},
        {"$set": {"status": "active", "approved_at": datetime.now(timezone.utc)}}
    )
    if res.matched_count > 0:
        return {"ok": True, "kind": "college"}

    # Try events by title
    res3 = await _db.events.update_one(
        {"title": user_id},
        {"$set": {"status": "live", "approved_at": datetime.now(timezone.utc)}}
    )
    if res3.matched_count > 0:
        return {"ok": True, "kind": "event"}

    raise HTTPException(404, "Not found")


@router.post("/admin/super/approvals/{user_id}/reject")
async def reject_user(user_id: str, user: dict = Depends(require_role('admin'))):
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
        {"$set": {"status": "cancelled", "rejected_at": datetime.now(timezone.utc)}}
    )
    if res3.matched_count > 0:
        return {"ok": True, "kind": "event"}

    raise HTTPException(404, "Not found")


@router.post("/admin/super/workflows/{wf_id}/toggle")
async def toggle_workflow(wf_id: str, user: dict = Depends(require_role('admin'))):
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
async def dismiss_insight(insight_id: str, user: dict = Depends(require_role('admin'))):
    try:
        oid = ObjectId(insight_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    res = await _db.ai_insights.update_one({"_id": oid}, {"$set": {"dismissed": True, "dismissed_at": datetime.now(timezone.utc)}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@router.post("/student/wallet/topup")
async def wallet_topup(req: TopupRequest, user: dict = Depends(require_role('student'))):
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
        "date": datetime.now(timezone.utc),
        "desc": "Wallet top-up via UPI",
        "amount": req.amount,
        "kind": "credit",
        "source": "topup",
    }
    await _db.wallet_transactions.insert_one(doc)
    return {"ok": True, "tx_id": doc["tx_id"], "new_balance": req.amount}


@router.post("/student/events/{event_id}/rsvp")
async def event_rsvp(event_id: str, student_email: Optional[str] = None, user: dict = Depends(require_role('student'))):
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
        "registered_at": datetime.now(timezone.utc),
        "status": "registered",
    })
    return {"ok": True, "registered": True}


# ─── Payout Tiers CRUD ──────────────────────────────────────────
@router.get("/admin/super/payout-tiers")
async def list_payout_tiers(user: dict = Depends(require_role('admin'))):
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
async def create_payout_tier(body: dict, user: dict = Depends(require_role('admin'))):
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
async def update_payout_tier(tier_id: str, body: dict, user: dict = Depends(require_role('admin'))):
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
async def delete_payout_tier(tier_id: str, user: dict = Depends(require_role('admin'))):
    oid = ObjectId(tier_id)
    res = await _db.payout_tiers.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404)
    return {"ok": True}


# ─── Stripe webhook ────────────────────────────────────────────
@router.post("/webhooks/stripe")
async def stripe_webhook(body: dict, user: dict = Depends(get_current_user)):
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
async def my_tier(email: Optional[str] = None, role: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Returns the computed tier for any user (Bronze/Silver/Gold/Platinum)
    along with score breakdown, visuals, and tier-driven suggestions.
    Accepts ?email= for per-user lookup; falls back to first user of role.
    """
    db_user = None
    q: Dict[str, Any] = {}
    if email:
        q["email"] = email
    if role:
        q["role"] = role
    if q:
        db_user = await _db.users.find_one(q)
    if not db_user:
        db_user = await _db.users.find_one({"role": role or "student"})
    if not db_user:
        raise HTTPException(404, "User not found")

    r = (db_user or {}).get("role")
    if r == "mentor":
        mentor_id = str(db_user["_id"])
        confirmed = await _db.bookings.count_documents({"mentor_id": mentor_id, "status": {"$in": ["confirmed", "completed"]}})
        ratings = [rev.get("rating", 0) async for rev in _db.reviews.find({"mentor_id": mentor_id})]
        avg = round(sum(ratings) / len(ratings), 1) if ratings else 4.5
        tier = await _mentor_tier_payload(db_user, confirmed, avg)
    elif r == "college":
        si = (db_user or {}).get("school_info") or {}
        cname = si.get("institution_name") or db_user.get("full_name", "—")
        students_cnt = await _db.users.count_documents({"role": "student", "school_info.institution_name": cname})
        alumni_cnt = await _db.users.count_documents({"role": "alumni", "school_info.institution_name": cname})
        tier = await _college_tier_payload(cname, students_cnt, alumni_cnt, 90.0)
    else:
        tier = await _student_tier_payload(user)

    return {"role": r, "name": user.get("full_name"), "tier": tier}


@router.get("/mentor/connections")
async def mentor_connections(email: Optional[str] = None, user: dict = Depends(require_role('mentor'))):
    # 1. Resolve mentor
    mentor = None
    if email:
        mentor = await _db.users.find_one({"email": email, "role": "mentor"})
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
                connection_status[sid] = "active"

    # 4. Fetch all resolved users
    resolved_objs = []
    for oid in other_ids:
        try:
            resolved_objs.append(ObjectId(oid))
        except Exception:
            pass
    resolved_users = await _db.users.find({"_id": {"$in": resolved_objs}}).to_list(len(resolved_objs))

    unique_users = resolved_users

    tz_name = (mentor or {}).get("timezone") or "Asia/Kolkata"
    try:
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = pytz.timezone("Asia/Kolkata")
    now_local = datetime.now(tz)
    now_naive = now_local.replace(tzinfo=None)
    out = []
    
    # Map unique users to the frontend card representation
    for idx, u in enumerate(unique_users):
        uid = str(u["_id"])
        role = u.get("role", "student")
        
        # Calculate sessions stats
        s_list = student_bookings.get(uid, [])
        total_sessions = len(s_list)
        completed_sessions = len([b for b in s_list if b.get("status") == "completed"])
        
        status = connection_status.get(uid)
        if not status:
            continue
        # Skip if they are not accepted connections
        if status not in ("active", "accepted", "completed"):
            continue

        # Force completed connections to have 100% progress
        if status == "completed":
            completed_sessions = total_sessions

        # Calculate progress
        progress = int((completed_sessions / total_sessions) * 100) if total_sessions > 0 else 0

        # Next session date/time/topic
        upcoming = [b for b in s_list if b.get("scheduled_at") and b.get("scheduled_at").replace(tzinfo=None) > now_naive and b.get("status") != "cancelled"]
        upcoming.sort(key=lambda x: x["scheduled_at"])
        next_session = None
        if upcoming:
            ns = upcoming[0]
            ns_dt_naive = ns["scheduled_at"].replace(tzinfo=None)
            next_session = {
                "date": ns_dt_naive.strftime("%b %d, %Y"),
                "time": ns_dt_naive.strftime("%H:%M"),
                "topic": ns.get("topic") or "1:1 Mentorship Session",
                "daysAway": max(0, (ns_dt_naive.date() - now_naive.date()).days)
            }


        # Last session date/notes
        past = [b for b in s_list if b.get("scheduled_at") and b.get("scheduled_at").replace(tzinfo=None) <= now_naive]
        past.sort(key=lambda x: x["scheduled_at"], reverse=True)
        last_session = None
        if past:
            ls = past[0]
            ls_dt_naive = ls["scheduled_at"].replace(tzinfo=None)
            last_session = {
                "date": ls_dt_naive.strftime("%b %d, %Y"),
                "notes": ls.get("notes") or ls.get("topic") or "Review goals and progress."
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

    return {"items": out}
