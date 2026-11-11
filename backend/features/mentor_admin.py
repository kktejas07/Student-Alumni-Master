"""
mentor_admin.py — Super Admin MT1–MT14: mentor dashboard endpoints.

Exposes every admin-facing backend surface for the Mentors portal:

  MT1  GET  /admin/mentors/stats                    KPI strip (approved/pending/active/avg rating/sessions)
  MT2  GET  /admin/mentors/taxonomy                  13-slug category chips with counts
  MT3  POST /admin/mentors/{user_id}/approve         set mentor_status=approved, notify, audit
  MT3  POST /admin/mentors/{user_id}/reject          required reason, mark rejected, email, audit
  MT4  (enrichment lives in `imports.py` — /admin/users/list)
  MT5  GET  /admin/mentors/session-analytics         booked/completed/cancelled + revenue + 6-mo trend
  MT6  GET  /admin/mentors/connections                mentee map + orphaned + overloaded
  MT6  POST /admin/mentors/connections/assign         manual mentee→mentor assignment
  MT7  GET  /admin/mentors/eligible-alumni            alumni transition pipeline (Eligible→Invited→…)
  MT7  POST /admin/mentors/invite                     send invite email to eligible alumni
  MT8  POST /admin/mentors/categorize                 keyword-classify pending mentors (top-3 + confidence)
  MT8  GET  /admin/mentors/categorization             read back suggestions
  MT9  POST /admin/mentors/match                      recommend mentors for a student goal string
  MT10 GET  /admin/mentors/engagement                  0-100 engagement score per mentor
  MT11 GET  /admin/mentors/quality                     avg rating, recent-feedback quotes, low-scorer flag
  MT12 POST /admin/mentors/content-digest              per-mentor career-opening digest
  MT13 GET  /admin/mentors/availability-insights       booking-demand vs availability-window gap
  MT14 GET  /admin/mentors/badges                       earned badges per mentor (Mentor Milestones)
  MT14 POST /admin/mentors/badges/run                   force re-evaluation of badge awards
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId

from fastapi import APIRouter, Body, Header, HTTPException, Query
from pydantic import BaseModel, Field

from core.db import client as _client
import os
from core.deps import bearer_token, decode_payload_silent

_DB_NAME   = os.getenv("DB_NAME") or "career_platform"
_db        = _client[_DB_NAME]

router = APIRouter()

try:
    from features.notifications import notify_mentor_approved, _log_inbox
except Exception:  # pragma: no cover — notifications module is optional
    async def notify_mentor_approved(db, *, mentor_id: str):  # type: ignore
        return None
    async def _log_inbox(db, user_id, title, body, data=None):  # type: ignore
        return None


# ─── 13-slug category taxonomy (mirrors server.py MentorCategory) ───
TAXONOMY: List[Dict[str, str]] = [
    {"slug": "it_software",         "label": "IT & Software",       "icon": "Terminal",  "hint": "Software engineers, SDE, DevOps, data eng, ML"},
    {"slug": "engineering_manager", "label": "Engineering Manager", "icon": "Users",     "hint": "Team leads, EM, director-level software leadership"},
    {"slug": "tech_recruiter",      "label": "Tech Recruiter",      "icon": "Briefcase", "hint": "Recruiters, sourcers, talent-acquisition pros"},
    {"slug": "hr_mentor",           "label": "HR / People",         "icon": "Handshake", "hint": "HRBP, hiring manager, org-development"},
    {"slug": "career_coach",        "label": "Career Coach",        "icon": "Target",    "hint": "CV/LinkedIn review, personal branding, pivots"},
    {"slug": "higher_education",    "label": "Higher Ed / Academic","icon": "GraduationCap","hint": "Faculty, grad admissions, research mentors"},
    {"slug": "startup_mentor",      "label": "Startup Mentor",      "icon": "Rocket",    "hint": "Founders, CTOs, early-stage operators"},
    {"slug": "startup_advisor",     "label": "Startup Advisor",     "icon": "Compass",   "hint": "Pre-seed→Series A advisor, board members"},
    {"slug": "business_mentor",     "label": "Business / Strategy", "icon": "LineChart", "hint": "Strategy, P&L, operations, consulting"},
    {"slug": "industry_advisor",    "label": "Industry Advisor",    "icon": "Building",  "hint": "Domain execs (fintech, healthcare, etc.)"},
    {"slug": "interview_prep",      "label": "Interview Prep",      "icon": "ListChecks","hint": "DSA, system design, mocks, coding rounds"},
    {"slug": "creative_design",     "label": "Creative / Design",   "icon": "Palette",   "hint": "UX/UI, branding, product design, creative arts"},
    {"slug": "life_wellness",       "label": "Life & Wellness",     "icon": "Heart",     "hint": "Work-life balance, mental health, mindfulness"},
]

# keyword → slug (first match wins; confidence based on hits)
_CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "it_software":         ["software", "sde", "dev", "developer", "engineer", "backend", "frontend", "full-stack", "full stack", "java", "python", "golang", "golang", "devops", "sre", "data eng", "ml", "machine learning", "ai", "software engineer"],
    "engineering_manager": ["engineering manager", "eng manager", "director of eng", "vp engineering", "tech lead", "team lead", "staff engineer", "principal engineer", "sre lead", "head of eng"],
    "tech_recruiter":      ["recruiter", "recruiting", "talent acquisition", "sourcer", "staffing", "headhunter"],
    "hr_mentor":           ["hr", "human resources", "talent ops", "talent operations", "org dev", "people", "hrbp", "recruiting manager"],
    "career_coach":        ["career coach", "career advisor", "career mentor", "personal branding", "cv review", "linkedin review", "career transition"],
    "higher_education":    ["professor", "faculty", "university", "academ", "research", "phd", "doctoral", "grad admissions", "ph.d"],
    "startup_mentor":      ["startup founder", "founder", "cto", "co-founder", "startup ceo", "seed", "seed round", "early stage"],
    "startup_advisor":     ["startup advisor", "angel investor", "vc", "venture capital", "board member", "pre-seed", "series a"],
    "business_mentor":     ["strategy", "consulting", "mba", "p&l", "operations", "business development", "product management", "pmo"],
    "industry_advisor":    ["fintech", "healthcare", "pharma", "banking", "insurance", "manufacturing", "logistics", "supply chain", "energy"],
    "interview_prep":      ["interview", "dsa", "system design", "coding round", "mock interview", "leetcode", "crack", "job interviews"],
    "creative_design":     ["ux", "ui", "product designer", "brand", "creative director", "graphic", "motion design", "creative"],
    "life_wellness":       ["mental health", "mindfulness", "wellness", "work-life balance", "burnout", "meditation", "life coach"],
}


# ─── Auth helper (mirrors imports.py) ──────────────────────────────
async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    token = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        elif authorization.startswith("eyJ"):
            token = authorization
    if not token:
        return None
    payload = decode_payload_silent(token)
    if not payload:
        return None
    uid = payload.get("sub") or payload.get("id") or payload.get("user_id")
    if not uid:
        return None
    user = await _db.users.find_one({"_id": ObjectId(uid)}) if ObjectId.is_valid(str(uid)) else None
    if user is None:
        user = await _db.users.find_one({"_id": uid})
    return user


async def _require_admin(authorization: Optional[str]) -> dict:
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    role = (user.get("role") or "").lower()
    if role not in {"admin", "super_admin"}:
        raise HTTPException(403, "Super-admin role required")
    return user


def _iso(v):
    if isinstance(v, datetime):
        return v.isoformat()
    return v


async def _audit(db, actor_id: str, action: str, target: str, extra: Optional[Dict[str, Any]] = None):
    doc = {
        "actor_id": actor_id,
        "action": action,
        "target": target,
        "extra": extra or {},
        "created_at": datetime.now(timezone.utc),
    }
    await db.admin_activity_log.insert_one(doc)
    return doc


# ═══════════════════════════════════════════════════════════════════
# MT1 — KPI stats strip
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/stats")
async def mentor_stats(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    now = datetime.now(timezone.utc)
    since_30d = now - timedelta(days=30)
    since_30d = since_30d.astimezone(timezone.utc).replace(tzinfo=None)

    approved_q = {"role": "mentor", "mentor_status": "approved"}
    pending_q  = {"role": "mentor", "mentor_status": {"$in": ["pending", None]}}

    total = await _db.users.count_documents({"role": "mentor"})
    approved = await _db.users.count_documents(approved_q)
    pending  = await _db.users.count_documents(pending_q)

    # Active this month: any booking or mentor_sessions entry in last 30 days
    active_ids = await _db.bookings.distinct(
        "mentor_id", {"created_at": {"$gte": since_30d}, "status": {"$ne": "cancelled"}},
    )
    active_ids |= await _db.mentor_sessions.distinct(
        "mentor_id", {"created_at": {"$gte": since_30d}},
    ) if hasattr(_db, "mentor_sessions") else set()
    active_this_month = len(active_ids)

    # Avg rating across approved mentors with reviews
    reviews_agg = await _db.reviews.aggregate([
        {"$match": {"rating": {"$gte": 1}}},
        {"$group": {"_id": "$mentor_id", "n": {"$sum": 1}, "sum": {"$sum": "$rating"}}},
        {"$project": {"avg": {"$divide": ["$sum", "$n"]}, "n": 1, "_id": 1}},
    ]).to_list(10_000)
    all_avgs = [r["avg"] for r in reviews_agg]
    avg_rating = round(sum(all_avgs) / len(all_avgs), 2) if all_avgs else 0.0
    avg_rating_n = sum(r["n"] for r in reviews_agg)

    total_sessions = await _db.mentor_sessions.count_documents({})
    total_bookings = await _db.bookings.count_documents({})

    return {
        "total": total,
        "approved": approved,
        "pending": pending,
        "active_this_month": active_this_month,
        "avg_rating": avg_rating,
        "avg_rating_n": avg_rating_n,
        "total_sessions": total_sessions,
        "total_bookings": total_bookings,
    }


# ═══════════════════════════════════════════════════════════════════
# MT2 — Category taxonomy chips
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/taxonomy")
async def mentor_taxonomy(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    counts: Dict[str, int] = {}
    # Count by mentor_info.category (primary archetype)
    for slug in [t["slug"] for t in TAXONOMY]:
        q = {"role": "mentor", "mentor_info.category": slug}
        counts[slug] = await _db.users.count_documents(q)
    total_mentor = await _db.users.count_documents({"role": "mentor"})
    unclassified = total_mentor - sum(counts.values())
    return {
        "items": [{**t, "count": counts[t["slug"]]} for t in TAXONOMY],
        "total": total_mentor,
        "unclassified": max(0, unclassified),
    }


# ═══════════════════════════════════════════════════════════════════
# MT3 — Approval workflow
# ═══════════════════════════════════════════════════════════════════
class RejectMentorRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=600)


@router.post("/admin/mentors/{user_id}/approve")
async def mentor_approve(user_id: str, authorization: Optional[str] = Header(None)):
    admin = await _require_admin(authorization)
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "Invalid user id")
    updated = await _db.users.update_one(
        {"_id": oid},
        {"$set": {
            "mentor_status": "approved",
            "mentor_status_changed_at": datetime.now(timezone.utc),
            "mentor_status_changed_by": str(admin["_id"]),
            "mentor_rejection_reason": None,
        }},
    )
    if updated.matched_count == 0:
        raise HTTPException(404, "Mentor not found")
    # Notify + audit
    try:
        await notify_mentor_approved(_db, mentor_id=str(oid))
    except Exception:
        pass
    await _audit(_db, str(admin["_id"]), "mentor.approve", str(oid))
    return {"ok": True}


@router.post("/admin/mentors/{user_id}/reject")
async def mentor_reject(
    user_id: str,
    body: RejectMentorRequest = Body(...),
    authorization: Optional[str] = Header(None),
):
    admin = await _require_admin(authorization)
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "Invalid user id")
    mentor = await _db.users.find_one({"_id": oid})
    if not mentor:
        raise HTTPException(404, "Mentor not found")
    updated = await _db.users.update_one(
        {"_id": oid},
        {"$set": {
            "mentor_status": "rejected",
            "mentor_rejection_reason": body.reason,
            "mentor_status_changed_at": datetime.now(timezone.utc),
            "mentor_status_changed_by": str(admin["_id"]),
        }},
    )
    # Best-effort email to mentor (log inbox only — no provider may be configured)
    try:
        email = mentor.get("email")
        if email:
            html = (
                "<p>Your mentor application was not approved.</p>"
                f"<p><strong>Reason:</strong> {re.sub(r'<[^>]+>', '', body.reason)}</p>"
                "<p>If you think this is a mistake, please reach out to our team.</p>"
            )
            from core.email import send_email
            await send_email(email, "Your mentor application update", html)
    except Exception:
        pass
    await _audit(_db, str(admin["_id"]), "mentor.reject", str(oid), {"reason": body.reason})
    return {"ok": True}


@router.get("/admin/mentors/audit")
async def mentor_audit(limit: int = Query(50, le=500), authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    items = await _db.admin_activity_log.find(
        {"action": {"$in": ["mentor.approve", "mentor.reject"]}}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    for it in items:
        it["created_at"] = _iso(it.get("created_at"))
    return {"items": items}


# ═══════════════════════════════════════════════════════════════════
# MT5 — Session & revenue analytics
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/session-analytics")
async def mentor_session_analytics(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    booked     = await _db.bookings.count_documents({"status": {"$in": ["pending", "confirmed"]}})
    completed  = await _db.bookings.count_documents({"status": {"$in": ["completed", "done"]}})
    cancelled  = await _db.bookings.count_documents({"status": "cancelled"})

    # Revenue: SUM of completed session_price_inr (fallback: mentor.session_price_inr)
    revenue_aggregate = await _db.bookings.aggregate([
        {"$match": {"status": {"$in": ["completed", "done"]}, "mentor_id": {"$exists": True, "$ne": None}}},
        {"$lookup": {"from": "users", "localField": "mentor_id", "foreignField": "_id",
                      "as": "mentor_doc", "pipeline": [
                          {"$match": {"role": "mentor"}},
                          {"$project": {"_id": 1, "price": {"$ifNull": [
                                "$mentor_info.session_price_inr",
                                "$mentor_info.price_inr",
                                0
                            ]}}},
                      ]}},
        {"$unwind": {"path": "$mentor_doc", "preserveNullAndEmptyArrays": True}},
        {"$project": {"price": {"$ifNull": [
            "$session_price_inr",
            {"$ifNull": ["$mentor_doc.price", 0]},
        ]}}},
        {"$group": {"_id": None, "sum": {"$sum": "$price"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    revenue = revenue_aggregate[0]["sum"] if revenue_aggregate and "sum" in revenue_aggregate[0] else 0
    revenue_count = revenue_aggregate[0].get("count", 0) if revenue_aggregate else 0

    # 6-month trend (bookings + completed)
    now = datetime.now(timezone.utc)
    trend = []
    for i in range(5, -1, -1):
        start = (now - timedelta(days=30 * i)).replace(hour=0, minute=0, second=0, microsecond=0)
        end   = start + timedelta(days=30)
        m_booked = await _db.bookings.count_documents({"created_at": {"$gte": start, "$lt": end}})
        m_completed = await _db.bookings.count_documents({
            "created_at": {"$gte": start, "$lt": end},
            "status": {"$in": ["completed", "done"]},
        })
        trend.append({
            "month": start.strftime("%Y-%m"),
            "booked": m_booked,
            "completed": m_completed,
        })

    # Top-10 leaderboard by completed session count
    leaderboard = []
    agg = _db.bookings.aggregate([
        {"$match": {"status": {"$in": ["completed", "done"]}}},
        {"$group": {"_id": "$mentor_id", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 10},
        {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "u"}},
        {"$project": {"mentor_id": 1, "n": 1, "name": {"$ifNull": [
            {"$arrayElemAt": ["$u.full_name", 0]},
            {"$arrayElemAt": ["$u.name", 0]},
        ]}}},
    ])
    async for doc in agg:
        doc.pop("_id", None)
        leaderboard.append(doc)

    completion_rate = (completed / booked) if booked else 0.0
    return {
        "booked": booked, "completed": completed, "cancelled": cancelled,
        "revenue_inr": revenue, "revenue_sessions": revenue_count,
        "completion_rate": round(completion_rate, 3),
        "trend_6mo": trend,
        "leaderboard_top10": leaderboard,
    }


# ═══════════════════════════════════════════════════════════════════
# MT6 — Mentor-metee connection map
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/connections")
async def mentor_connections(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    # Each row = a mentor with count of their active mentees
    rows = await _db.connections.aggregate([
        {"$match": {"status": {"$in": ["pending", "accepted", "connected"]}}},
        {"$group": {"_id": "$mentor_id", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "mentor"}},
        {"$project": {"mentor_id": "$mentor", "n": 1, "name": {"$ifNull": [
            {"$arrayElemAt": ["$mentor.full_name", 0]},
            {"$arrayElemAt": ["$mentor.name", 0]},
        ]}}},
    ]).to_list(200)
    for r in rows:
        r.pop("mentor_id", None)

    # Orphan mentees: students with zero mentor connections
    mentees_with_connections = set(await _db.connections.distinct("a", {"status": {"$in": ["pending", "accepted"]}}))
    orphaned = await _db.users.count_documents({"role": "student", "_id": {"$nin": [ObjectId(x) for x in mentees_with_connections]}})

    # Overloaded: >10 active mentees
    overloaded = [r for r in rows if r.get("n", 0) > 10]
    return {
        "mentor_counts": rows,
        "orphaned_students": orphaned,
        "overloaded_mentors": overloaded,
    }


class AssignMenteeRequest(BaseModel):
    mentor_id: str
    student_id: str


@router.post("/admin/mentors/connections/assign")
async def assign_mentee(
    body: AssignMenteeRequest,
    authorization: Optional[str] = Header(None),
):
    admin = await _require_admin(authorization)
    mentor = await _db.users.find_one({"_id": ObjectId(body.mentor_id)})
    student = await _db.users.find_one({"_id": ObjectId(body.student_id)})
    if not mentor or not student:
        raise HTTPException(404, "Mentor or student not found")
    doc = {
        "a": str(student["_id"]),
        "b": str(mentor["_id"]),
        "mentor_id": str(mentor["_id"]),
        "status": "pending",
        "assigned_by_admin": True,
        "created_at": datetime.now(timezone.utc),
    }
    res = await _db.connections.insert_one(doc)
    await _audit(_db, str(admin["_id"]), "mentor.connection.assign", str(mentor["_id"]),
                 {"student_id": str(student["_id"]), "conn_id": str(res.inserted_id)})
    return {"ok": True, "id": str(res.inserted_id)}


# ═══════════════════════════════════════════════════════════════════
# MT7 — Alumni → Mentor promotion pipeline
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/eligible-alumni")
async def eligible_alumni(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    # Eligibility: alumni with years≥4 + linkedin + at least 1 skill OR 1+ experience entry
    q = {
        "role": "alumni",
        "$or": [
            {"mentor_eligibility.qualified": True},
            {"mentor_invited": True, "mentor_status": {"$nin": ["approved"]}},
        ],
    }
    docs = await _db.users.find(q).sort("created_at", -1).limit(200).to_list(200)
    items = []
    for d in docs:
        info = d.get("mentor_info") or {}
        items.append({
            "id": str(d["_id"]),
            "name": d.get("full_name") or d.get("name"),
            "years": (info.get("years_of_experience") or 0),
            "org": info.get("organization") or d.get("current_company"),
            "title": info.get("job_title") or d.get("designation"),
            "mentor_status": d.get("mentor_status") or ("invited" if d.get("mentor_invited") else "eligible"),
            "mentor_category": d.get("mentor_category") or info.get("category"),
            "linkedin": d.get("linkedin_url") or (info.get("linkedin_url")),
            "is_eligible": bool(d.get("mentor_eligibility", {}).get("qualified")),
        })
    return {"items": items}


class InviteAlumniRequest(BaseModel):
    alumni_id: str
    category: Optional[str] = None


@router.post("/admin/mentors/invite")
async def invite_alumni(body: InviteAlumniRequest, authorization: Optional[str] = Header(None)):
    admin = await _require_admin(authorization)
    try:
        oid = ObjectId(body.alumni_id)
    except Exception:
        raise HTTPException(400, "Invalid alumni id")
    alumni = await _db.users.find_one({"_id": oid})
    if not alumni or alumni.get("role") != "alumni":
        raise HTTPException(404, "Alumni not found")
    update: Dict[str, Any] = {
        "mentor_invited": True,
        "mentor_invite_at": datetime.now(timezone.utc),
        "mentor_invite_by": str(admin["_id"]),
    }
    if body.category:
        update["mentor_category"] = body.category
    await _db.users.update_one({"_id": oid}, {"$set": update})
    # Send invite email
    try:
        email = alumni.get("email")
        if email:
            from core.email import send_email
            name = alumni.get("full_name") or "there"
            html = (
                f"<p>Hi {name},</p><p>Thanks for your interest in mentoring on the platform. "
                "Click <a href='/onboarding/mentor'>here</a> to complete your mentor profile.</p>"
            )
            await send_email(email, "You've been invited to mentor", html)
    except Exception:
        pass
    await _audit(_db, str(admin["_id"]), "mentor.invite", str(oid), {"category": body.category})
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
# MT8 — Auto-categorization
# ═══════════════════════════════════════════════════════════════════
@router.post("/admin/mentors/categorize")
async def categorize_mentors(authorization: Optional[str] = Header(None)):
    admin = await _require_admin(authorization)
    from services.agents.mentor_agents import categorize_pending_mentors
    result = await categorize_pending_mentors(_db, admin_id=str(admin["_id"]))
    await _audit(_db, str(admin["_id"]), "mentor.categorize", "all",
                 {"run_id": result.get("run_id")})
    return result


@router.get("/admin/mentors/categorization")
async def get_categorization(run_id: Optional[str] = None, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    q = {"run_id": run_id} if run_id else {}
    items = await _db.mentor_category_suggestions.find(q).sort("created_at", -1).limit(200).to_list(200)
    for it in items:
        it["created_at"] = _iso(it.get("created_at"))
    return {"items": items}


# ═══════════════════════════════════════════════════════════════════
# MT9 — Mentor-student match
# ═══════════════════════════════════════════════════════════════════
class MatchRequest(BaseModel):
    goal: str
    limit: int = 5


@router.post("/admin/mentors/match")
async def match_mentors(body: MatchRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents.mentor_agents import match_mentors_for_goal
    result = await match_mentors_for_goal(_db, goal=body.goal, limit=min(body.limit, 20))
    return result


# ═══════════════════════════════════════════════════════════════════
# MT10 — Engagement scores
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/engagement")
async def engagement_scores(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents.mentor_agents import engagement_scores_for
    return await engagement_scores_for(_db)


@router.post("/admin/mentors/engagement/run")
async def run_engagement(authorization: Optional[str] = Header(None)):
    admin = await _require_admin(authorization)
    from services.agents.mentor_agents import compute_engagement_scores
    result = await compute_engagement_scores(_db)
    await _audit(_db, str(admin["_id"]), "mentor.engagement.run", "all", {"run_id": result.get("run_id")})
    return result


# ═══════════════════════════════════════════════════════════════════
# MT11 — Session quality
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/quality")
async def quality_scores(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents.mentor_agents import quality_report
    return await quality_report(_db)


@router.post("/admin/mentors/quality/run")
async def run_quality(authorization: Optional[str] = Header(None)):
    admin = await _require_admin(authorization)
    from services.agents.mentor_agents import refresh_quality_flags
    result = await refresh_quality_flags(_db)
    await _audit(_db, str(admin["_id"]), "mentor.quality.run", "all", {"run_id": result.get("run_id")})
    return result


# ═══════════════════════════════════════════════════════════════════
# MT12 — Content recommendation
# ═══════════════════════════════════════════════════════════════════
class ContentDigestRequest(BaseModel):
    mentor_id: Optional[str] = None


@router.post("/admin/mentors/content-digest")
async def content_digest(body: ContentDigestRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents.mentor_agents import mentor_content_digest
    return await mentor_content_digest(_db, mentor_id=body.mentor_id)


# ═══════════════════════════════════════════════════════════════════
# MT13 — Availability optimizer
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/availability-insights")
async def availability_insights(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents.mentor_agents import availability_insights
    return await availability_insights(_db)


# ═══════════════════════════════════════════════════════════════════
# MT14 — Badges & certificates
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/badges")
async def badges_listing(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents.mentor_agents import badge_status
    return await badge_status(_db)


@router.post("/admin/mentors/badges/run")
async def badges_run(authorization: Optional[str] = Header(None)):
    admin = await _require_admin(authorization)
    from services.agents.mentor_agents import award_milestone_badges
    result = await award_milestone_badges(_db, actor_id=str(admin["_id"]))
    await _audit(_db, str(admin["_id"]), "mentor.badges.run", "all", {"run_id": result.get("run_id")})
    return result


# ═══════════════════════════════════════════════════════════════════
# Agent suite status (mirrors the admin Agents router surface)
# ═══════════════════════════════════════════════════════════════════
@router.get("/admin/mentors/agent-status")
async def mentor_agent_status(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents.mentor_agents import agent_status
    return await agent_status(_db)
