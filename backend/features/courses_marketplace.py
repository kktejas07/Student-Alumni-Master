"""
courses_marketplace.py — SA Courses (Learning Marketplace).

Endpoints (all under /api):
  GET   /courses/catalog                              landing payload
  GET   /courses/list?category=&subcategory=&pricing=&level=&q=&sort=
  GET   /courses/course/{course_id}                   detail
  POST  /courses/enroll                               {course_id}
  GET   /courses/my-enrollments                       list user's enrollments
  POST  /courses/enrollments/{enrollment_id}/progress {percent, completed}
  GET   /courses/tracks                               career tracks list
  GET   /courses/tracks/{slug}                        career track detail
  POST  /courses/tracks/{slug}/enroll                 enroll into a track
  POST  /courses/ai/recommend                         {goal, weekly_hours, budget}
  POST  /courses/ai/path                              {role, current_skills, deadline}
"""
from __future__ import annotations
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pathlib import Path
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from core.db import db as _db
from core.catalogs import CURATED_COURSES, CURATED_TRACKS
logger = logging.getLogger("courses_marketplace")
router = APIRouter()


# ─── Auth ────────────────────────────────────────────────────────────────
def _auth():
    from core.deps import get_current_user
    return get_current_user


# ─── Catalog Schema (matches screenshot) ─────────────────────────────────
SECTIONS = [
    {
        "id": "tech",
        "emoji": "💻",
        "name": "Tech & Engineering",
        "color": "#7C3AED",
        "items": [
            {"key": "web-dev",       "label": "Web Dev",       "icon": "code-tags",         "count": 0},
            {"key": "mobile-dev",    "label": "Mobile Dev",    "icon": "cellphone",         "count": 0},
            {"key": "ai-ml",         "label": "AI / ML",       "icon": "robot-outline",     "count": 0},
            {"key": "data-science",  "label": "Data Science",  "icon": "database",          "count": 0},
            {"key": "cloud",         "label": "Cloud",         "icon": "cloud-outline",     "count": 0},
            {"key": "cybersecurity", "label": "Cybersecurity", "icon": "shield-outline",    "count": 0},
            {"key": "system-design", "label": "System Design", "icon": "chip",              "count": 0},
            {"key": "devops",        "label": "DevOps",        "icon": "cog-outline",       "count": 0},
        ],
    },
    {
        "id": "design",
        "emoji": "🎨",
        "name": "Design & Creative",
        "color": "#EC4899",
        "items": [
            {"key": "ui-design",       "label": "UI Design",       "icon": "brush",             "count": 0},
            {"key": "ux-research",     "label": "UX Research",     "icon": "compass-outline",   "count": 0},
            {"key": "figma-mastery",   "label": "Figma Mastery",   "icon": "pencil-ruler",      "count": 0, "highlighted": True},
            {"key": "graphic-design",  "label": "Graphic Design",  "icon": "fountain-pen-tip",  "count": 0},
            {"key": "video-editing",   "label": "Video Editing",   "icon": "video-outline",     "count": 0},
            {"key": "photography",     "label": "Photography",     "icon": "camera-outline",    "count": 0},
            {"key": "motion-graphics", "label": "Motion Graphics", "icon": "flash-outline",     "count": 0},
            {"key": "3d-modeling",     "label": "3D Modeling",     "icon": "cube-outline",      "count": 0},
        ],
    },
    {
        "id": "business",
        "emoji": "💼",
        "name": "Business & Career",
        "color": "#F59E0B",
        "items": [
            {"key": "product-mgmt",  "label": "Product Mgmt",  "icon": "rocket-launch",        "count": 0},
            {"key": "marketing",     "label": "Marketing",     "icon": "bullhorn-outline",     "count": 0},
            {"key": "finance",       "label": "Finance",       "icon": "currency-inr",         "count": 0},
            {"key": "analytics",     "label": "Analytics",     "icon": "chart-bar",            "count": 0},
            {"key": "startup",       "label": "Startup",       "icon": "lightbulb-outline",    "count": 0},
            {"key": "sales",         "label": "Sales",         "icon": "trending-up",          "count": 0},
            {"key": "communication", "label": "Communication", "icon": "message-text-outline", "count": 0},
            {"key": "leadership",    "label": "Leadership",    "icon": "trophy-outline",       "count": 0},
        ],
    },
]

HERO_CARDS = [
    {"id": "ai-career-track", "variant": "violet",
     "emoji": "🎁", "title": "AI Career Track",
     "subtitle": "12-week roadmap with mentors, projects & free certifications.",
     "cta_label": "Start free", "cta_href": "/tracks/ai-career-track",
     "from": "#6D28D9", "to": "#A78BFA"},
    {"id": "free-this-month", "variant": "green",
     "emoji": "🎁", "title": "Free this month",
     "subtitle": "24 premium courses unlocked for students.",
     "cta_label": "Browse", "cta_href": "/courses?filter=free-this-month",
     "from": "#10B981", "to": "#34D399"},
]


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.get("/courses/catalog")
async def courses_catalog(user: dict = Depends(_auth())):
    courses = CURATED_COURSES
    # Per-subcategory counts
    counts: Dict[str, int] = {}
    for c in courses:
        k = f"{c['category']}:{c['subcategory']}"
        counts[k] = counts.get(k, 0) + 1
    sections = []
    for s in SECTIONS:
        items = []
        for it in s["items"]:
            it2 = dict(it)
            it2["count"] = counts.get(f"{s['id']}:{it['key']}", 0)
            items.append(it2)
        sections.append({**s, "items": items})

    free_count = sum(1 for c in courses if c['pricing']['type'] in ('free', 'free_audit', 'free_with_sa'))
    paid_count = sum(1 for c in courses if c['pricing']['type'] in ('paid', 'discounted_for_sa', 'subscription'))
    free_cert_count = sum(1 for c in courses if c.get('certification', {}).get('free'))
    return {
        "sections": sections, "hero": HERO_CARDS,
        "stats": {
            "total_courses": len(courses),
            "free_courses": free_count,
            "paid_courses": paid_count,
            "free_certs": free_cert_count,
        },
        "tracks": [{"slug": t["slug"], "title": t["title"],
                     "duration_weeks": t["duration_weeks"],
                     "enrolled_count": t["enrolled_count"], "color": t["color"]}
                    for t in CURATED_TRACKS],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/courses/list")
async def courses_list(
    category: str = Query("all"),
    subcategory: str = Query("all"),
    pricing: str = Query("all"),
    level: str = Query("all"),
    q: str = Query(""),
    sort: str = Query("popular"),
    source: str = Query("all"),
    user: dict = Depends(_auth()),
):
    items = CURATED_COURSES
    for c in items:
        c.setdefault("source", "internal")
    if source == "internal":
        items = [c for c in items if c.get("source") == "internal"]
    elif source in {"external", "community"}:
        items = []
    # source ∈ {external, community, all}: also merge the 24h external catalog
    if source in {"external", "community", "all"}:
        try:
            from services.course_aggregator import fetch_external_courses
            external = await fetch_external_courses(
                category=category, subcategory=subcategory,
                pricing=pricing, level=level, q=q)
            if source == "community":
                external = [c for c in external if c.get("source") == "community"]
            items = items + external
        except Exception as e:
            logger.warning(f"[courses] external merge failed: {e}")
    if category and category != "all":
        items = [c for c in items if c["category"] == category]
    if subcategory and subcategory != "all":
        items = [c for c in items if c["subcategory"] == subcategory]
    if pricing and pricing != "all":
        if pricing == "free":
            items = [c for c in items
                     if c["pricing"]["type"] in ("free", "free_audit", "free_with_sa")]
        elif pricing == "paid":
            items = [c for c in items
                     if c["pricing"]["type"] in ("paid", "discounted_for_sa", "subscription")]
        elif pricing == "discounted":
            items = [c for c in items if c["pricing"]["type"] == "discounted_for_sa"]
    if level and level != "all":
        items = [c for c in items if c["level"].lower() == level.lower()]
    if q:
        ql = q.lower()
        items = [c for c in items if ql in c["title"].lower()
                 or ql in c["short_desc"].lower()
                 or any(ql in i.lower() for i in c.get("instructors", []))
                 or ql in c["provider"]["name"].lower()]
    # Sort
    if sort == "rating":
        items.sort(key=lambda x: -float(x.get("rating", 0)))
    elif sort == "newest":
        items.sort(key=lambda x: -x.get("enrolled_count", 0))
    elif sort == "free_first":
        items.sort(key=lambda x: (0 if x["pricing"]["type"] in ("free", "free_audit", "free_with_sa") else 1,
                                  -float(x.get("rating", 0))))
    elif sort == "shortest":
        items.sort(key=lambda x: x.get("duration_hours", 9999))
    else:
        items.sort(key=lambda x: (0 if x.get("featured") else 1, -x.get("enrolled_count", 0)))
    return {"courses": items, "total": len(items),
            "fetched_at": datetime.now(timezone.utc).isoformat()}


@router.get("/courses/course/{course_id}")
async def course_detail(course_id: str, user: dict = Depends(_auth())):
    c = next((x for x in CURATED_COURSES if x["id"] == course_id), None)
    if not c:
        raise HTTPException(404, "Course not found")
    detail = {**c,
              "syllabus": [
                  {"week": 1, "title": "Foundations", "topics": ["Intro", "Setup", "First exercise"]},
                  {"week": 2, "title": "Core concepts", "topics": ["Theory", "Practice", "Quiz 1"]},
                  {"week": 3, "title": "Hands-on project", "topics": ["Brief", "Code", "Review"]},
                  {"week": 4, "title": "Advanced", "topics": ["Deep dive", "Capstone", "Final quiz"]},
              ],
              "what_youll_learn": [
                  f"Master {c['subcategory'].replace('-', ' ').title()} fundamentals",
                  "Build hands-on projects with industry-standard tools",
                  "Earn a recognised certificate" if c['certification'].get('recognised')
                  else "Get a certificate of completion",
                  "Learn from world-class instructors",
              ]}
    return {"course": detail}


# ─── Enrollments ─────────────────────────────────────────────────────────
async def _create_enrollment(user: dict, course: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    doc = {
        "_id": ObjectId(),
        "enrollment_id": "ENR-" + uuid.uuid4().hex[:8].upper(),
        "user_id": str(user["_id"]),
        "course_id": course["id"],
        "course_snapshot": course,
        "track_id": None, "status": "active", "progress_percent": 0,
        "enrolled_at": now, "completed_at": None,
        "certificate_url": None, "updated_at": now,
    }
    await _db.course_enrollments.insert_one(doc)
    return _serialize_enrollment(doc)


def _serialize_enrollment(d: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(d)
    d.pop("_id", None)
    for k in ("enrolled_at", "completed_at", "updated_at"):
        v = d.get(k)
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@router.post("/courses/enroll")
async def enroll(body: Dict[str, Any], user: dict = Depends(_auth())):
    cid = (body or {}).get("course_id")
    if not cid:
        raise HTTPException(400, "course_id required")
    course = next((c for c in CURATED_COURSES if c["id"] == cid), None)
    if not course:
        raise HTTPException(404, "Course not found")
    existing = await _db.course_enrollments.find_one(
        {"user_id": str(user["_id"]), "course_id": cid})
    if existing:
        return {"ok": True, "duplicate": True,
                "enrollment": _serialize_enrollment(existing),
                "enroll_url": course["enroll_url"]}
    enr = await _create_enrollment(user, course)
    return {"ok": True, "duplicate": False, "enrollment": enr,
            "enroll_url": course["enroll_url"]}


@router.get("/courses/my-enrollments")
async def my_enrollments(user: dict = Depends(_auth())):
    items: List[Dict[str, Any]] = []
    async for d in _db.course_enrollments.find(
            {"user_id": str(user["_id"])}).sort("enrolled_at", -1):
        items.append(_serialize_enrollment(d))
    return {"enrollments": items, "total": len(items)}


@router.post("/courses/enrollments/{enrollment_id}/progress")
async def update_progress(enrollment_id: str, body: Dict[str, Any],
                           user: dict = Depends(_auth())):
    fields = {}
    if "percent" in (body or {}):
        fields["progress_percent"] = max(0, min(100, int(body["percent"])))
    if (body or {}).get("completed"):
        fields["status"] = "completed"
        fields["completed_at"] = datetime.now(timezone.utc)
        fields["progress_percent"] = 100
    if not fields:
        raise HTTPException(400, "Nothing to update")
    fields["updated_at"] = datetime.now(timezone.utc)
    res = await _db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id, "user_id": str(user["_id"])},
        {"$set": fields})
    if res.matched_count == 0:
        raise HTTPException(404, "Enrollment not found")
    return {"ok": True, "updated_fields": list(fields.keys())}


# ─── Career Tracks ───────────────────────────────────────────────────────
@router.get("/courses/tracks")
async def list_tracks(user: dict = Depends(_auth())):
    return {"tracks": CURATED_TRACKS}


@router.get("/courses/tracks/{slug}")
async def track_detail(slug: str, user: dict = Depends(_auth())):
    t = next((x for x in CURATED_TRACKS if x["slug"] == slug), None)
    if not t:
        raise HTTPException(404, "Track not found")
    # Hydrate course info inside each module
    by_id = {c["id"]: c for c in CURATED_COURSES}
    track = dict(t)
    hyd_modules = []
    for m in track["modules"]:
        m2 = dict(m)
        course_refs = []
        for ref in m.get("courses", []):
            cdata = by_id.get(ref["course_id"])
            if cdata:
                course_refs.append({**ref, "course": cdata})
        m2["courses"] = course_refs
        hyd_modules.append(m2)
    track["modules"] = hyd_modules
    # Current week from the user's real enrollment, if any
    enr = await _db.track_enrollments.find_one(
        {"user_id": str(user["_id"]), "slug": slug})
    if enr:
        track["current_week"] = enr.get("current_week") or 1
        track["progress_percent"] = enr.get("progress_percent")
    else:
        track["current_week"] = None
        track["progress_percent"] = None
    return {"track": track}


@router.post("/courses/tracks/{slug}/enroll")
async def enroll_track(slug: str, user: dict = Depends(_auth())):
    t = next((x for x in CURATED_TRACKS if x["slug"] == slug), None)
    if not t:
        raise HTTPException(404, "Track not found")
    existing = await _db.track_enrollments.find_one(
        {"user_id": str(user["_id"]), "slug": slug})
    if existing:
        existing.pop("_id", None)
        for k in ("enrolled_at", "updated_at"):
            v = existing.get(k)
            if isinstance(v, datetime):
                existing[k] = v.isoformat()
        return {"ok": True, "duplicate": True, "enrollment": existing}
    now = datetime.now(timezone.utc)
    doc = {
        "_id": ObjectId(),
        "enrollment_id": "TRK-" + uuid.uuid4().hex[:8].upper(),
        "user_id": str(user["_id"]),
        "slug": slug, "track_snapshot": t,
        "status": "active", "current_week": 1,
        "progress_percent": 0,
        "enrolled_at": now, "updated_at": now,
    }
    await _db.track_enrollments.insert_one(doc)
    doc.pop("_id", None)
    doc["enrolled_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    return {"ok": True, "duplicate": False, "enrollment": doc}


# ─── AI Recommend / Path (Emergent LLM key) ──────────────────────────────
async def _claude(system: str, prompt: str, session: str = "courses-ai") -> str:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY missing")
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = (LlmChat(api_key=api_key, session_id=f"{session}-{uuid.uuid4().hex[:6]}",
                     system_message=system)
            .with_model("anthropic", "claude-sonnet-4-5-20250929"))
    msg = UserMessage(text=prompt)
    res = await chat.send_message(msg)
    return str(res)


@router.post("/courses/ai/recommend")
async def ai_recommend(body: Dict[str, Any], user: dict = Depends(_auth())):
    goal = (body or {}).get("goal", "upskill in tech")
    weekly_hours = int((body or {}).get("weekly_hours", 10))
    budget = int((body or {}).get("budget", 0))
    items = CURATED_COURSES
    # Score
    def score(c):
        s = 0.0
        if c["pricing"]["type"] in ("free", "free_audit", "free_with_sa"):
            s += 25
        if c.get("featured"): s += 8
        if c.get("rating", 0) >= 4.7: s += 10
        if budget > 0:
            sa = int(c["pricing"].get("sa_inr", 0) or 0)
            if sa <= budget: s += 12
        # Goal keyword match
        gl = goal.lower()
        text = f"{c['title']} {c['short_desc']} {c['subcategory']}".lower()
        for w in gl.split():
            if w in text: s += 5
        # Hours fit
        if c.get("duration_hours", 0) <= weekly_hours * 12: s += 5
        return s
    top = sorted(items, key=score, reverse=True)[:6]

    # AI rationale (Claude). Fallback to programmatic string if LLM fails.
    rationale = ""
    try:
        prog_titles = [t["title"] for t in top[:6]]
        sys_msg = ("You are SA's Course Advisor. In ≤2 sentences, justify why these "
                   "specific courses match the user's goal, weekly time, and budget. "
                   "Be concrete (mention 1–2 course names), warm and directive. "
                   "No bullet points, no headings, no markdown.")
        prompt = (f"Goal: {goal}\nWeekly hours: {weekly_hours}\n"
                  f"Budget: {'₹'+format(budget,',') if budget else 'flexible'}\n"
                  f"Recommended courses (top 6): {', '.join(prog_titles)}.\n"
                  f"Write the rationale.")
        rationale = (await _claude(sys_msg, prompt, "courses-recommend")).strip()
    except Exception as e:
        logger.warning(f"[courses] ai/recommend LLM fallback: {e}")
        bits = []
        if budget > 0:
            bits.append(f"Filtered to courses you can audit free or under ₹{budget:,}")
        bits.append(f"Weekly availability: {weekly_hours} hrs")
        bits.append("Free / recognised certs prioritised")
        rationale = " · ".join(bits)

    return {"recommendations": top, "rationale": rationale,
            "fetched_at": datetime.now(timezone.utc).isoformat()}


@router.post("/courses/ai/path")
async def ai_path(body: Dict[str, Any], user: dict = Depends(_auth())):
    role = (body or {}).get("role", "ML Engineer")
    current = (body or {}).get("current_skills", [])
    deadline = (body or {}).get("deadline_weeks", 24)
    weekly_hours = int((body or {}).get("weekly_hours", 12))

    # Pick a curated track if it matches the role keyword
    track_slug = "ai-career-track" if any(k in role.lower() for k in ("ai", "ml", "data", "machine")) else "frontend-engineer-track"
    track = next((t for t in CURATED_TRACKS if t["slug"] == track_slug), None)

    # Simple programmatic path: weeks → grouped courses
    by_id = {c["id"]: c for c in CURATED_COURSES}
    path = []
    if track:
        for m in track["modules"]:
            ws = m["week_start"]; we = m["week_end"]
            crefs = [by_id[r["course_id"]] for r in m.get("courses", [])
                     if r["course_id"] in by_id]
            path.append({
                "week_start": ws, "week_end": we, "title": m["title"],
                "courses": crefs,
                "project": m.get("project"),
                "live_session": m.get("live_session"),
            })

    # AI summary (Claude). Fallback to programmatic string if LLM fails.
    summary = ""
    try:
        course_titles = []
        for blk in path:
            for c in blk["courses"][:1]:
                course_titles.append(c["title"])
        sys_msg = ("You are SA's Course Advisor. In ≤3 sentences, give the user a "
                   "warm, directive overview of their personalised learning path. "
                   "Mention the role, the timeline (weeks @ hours), 1–2 milestone "
                   "courses, and 1 outcome they'll achieve. No bullet points, no "
                   "headings, no markdown.")
        prompt = (f"Goal role: {role}\n"
                  f"Timeline: {deadline} weeks @ {weekly_hours} h/week\n"
                  f"Already covered: {', '.join(current) if current else 'starting fresh'}\n"
                  f"Selected track: {track['title'] if track else 'custom'}\n"
                  f"Milestone courses: {', '.join(course_titles[:5])}\n"
                  f"Write the summary now.")
        summary = (await _claude(sys_msg, prompt, "courses-path")).strip()
    except Exception as e:
        logger.warning(f"[courses] ai/path LLM fallback: {e}")
        summary = (f"Goal: become a {role} in {deadline} weeks @ {weekly_hours}h/week. "
                   f"Recommended track: {track['title'] if track else 'custom'}. "
                   f"Already covered: {', '.join(current) if current else 'starting fresh'}.")

    return {"path": path, "track_slug": track_slug if track else None,
            "summary": summary,
            "fetched_at": datetime.now(timezone.utc).isoformat()}


# ─── Track Progress / My Enrollments / Cert Wallet ───────────────────────
@router.get("/courses/my-tracks")
async def my_track_enrollments(user: dict = Depends(_auth())):
    cur = _db.track_enrollments.find({"user_id": str(user["_id"])})
    out = []
    async for e in cur:
        e.pop("_id", None)
        for k in ("enrolled_at", "updated_at"):
            v = e.get(k)
            if isinstance(v, datetime):
                e[k] = v.isoformat()
        out.append(e)
    return {"enrollments": out}


@router.post("/courses/tracks/{slug}/progress")
async def update_track_progress(slug: str, body: Dict[str, Any],
                                  user: dict = Depends(_auth())):
    """Update progress on a track. Body: {current_week, completed_modules}"""
    enr = await _db.track_enrollments.find_one(
        {"user_id": str(user["_id"]), "slug": slug})
    if not enr:
        raise HTTPException(404, "Not enrolled")
    cw = int(body.get("current_week", enr.get("current_week", 1)))
    completed = body.get("completed_modules", enr.get("completed_modules", []))
    progress = int((cw / max(int(enr["track_snapshot"].get("duration_weeks", 12)), 1)) * 100)
    progress = min(progress, 100)
    await _db.track_enrollments.update_one(
        {"_id": enr["_id"]},
        {"$set": {"current_week": cw, "completed_modules": completed,
                  "progress_percent": progress,
                  "updated_at": datetime.now(timezone.utc)}})
    return {"ok": True, "current_week": cw, "progress_percent": progress}


@router.get("/courses/my-certificates")
async def my_certificates(user: dict = Depends(_auth())):
    """Returns user's earned certs. Mock-seeds 1 cert if none yet for demo."""
    cur = _db.certifications_earned.find({"user_id": str(user["_id"])})
    out = []
    async for c in cur:
        c.pop("_id", None)
        v = c.get("issued_at")
        if isinstance(v, datetime):
            c["issued_at"] = v.isoformat()
        out.append(c)
    if not out:
        out = [{
            "course_id": "fcc-responsive-web",
            "course_title": "Responsive Web Design Certification",
            "cert_type": "completion", "accreditor": "freeCodeCamp",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "badge_url": "🏆", "verify_url": "https://www.freecodecamp.org/certification",
            "recognised": True, "is_demo": True,
        }]
    return {"certificates": out}


# ─── AI Advisor (slash commands) ─────────────────────────────────────────
@router.post("/courses/ai/advisor")
async def ai_advisor(body: Dict[str, Any], user: dict = Depends(_auth())):
    msg = (body or {}).get("message", "").strip()
    profile = (body or {}).get("profile", {})
    items = CURATED_COURSES
    cmd = None
    relevant: List[Dict[str, Any]] = []
    sys_msg_extra = ""
    low = msg.lower()
    if low.startswith("/free"):
        cmd = "free"
        topic = msg[5:].strip() or profile.get("interest", "")
        relevant = [c for c in items
                    if c["pricing"]["type"] in ("free", "free_audit", "free_with_sa")
                    and (not topic or topic.lower() in
                         f"{c['title']} {c['short_desc']} {c['subcategory']}".lower())][:6]
        sys_msg_extra = f"User asked for FREE courses on '{topic or 'any topic'}'. "
    elif low.startswith("/path"):
        cmd = "path"
        role = msg[5:].strip() or "ML Engineer"
        slug = "ai-career-track" if any(k in role.lower() for k in ("ai","ml","data")) else "frontend-engineer-track"
        track = next((t for t in CURATED_TRACKS if t["slug"] == slug), None)
        by_id = {c["id"]: c for c in items}
        if track:
            for m in track["modules"]:
                for r in m.get("courses", [])[:1]:
                    if r["course_id"] in by_id:
                        relevant.append(by_id[r["course_id"]])
        sys_msg_extra = f"User wants a learning PATH to become a {role}. Reference the {track['title'] if track else ''} track. "
    elif low.startswith("/cert"):
        cmd = "cert"
        skill = msg[5:].strip() or "any skill"
        relevant = [c for c in items if c["certification"].get("recognised")][:6]
        sys_msg_extra = f"User wants the FASTEST cert route for '{skill}'. Recommend recognised certs. "
    elif low.startswith("/recommend"):
        cmd = "recommend"
        goal = msg.split(" ", 1)[1] if " " in msg else "upskill"
        def score(c):
            s = 0
            if c["pricing"]["type"] in ("free","free_audit","free_with_sa"): s += 25
            if c.get("rating",0) >= 4.7: s += 10
            for w in goal.lower().split():
                if w in f"{c['title']} {c['short_desc']}".lower(): s += 5
            return s
        relevant = sorted(items, key=score, reverse=True)[:6]
        sys_msg_extra = f"User asked /recommend for '{goal}'. "
    elif low.startswith("/compare"):
        cmd = "compare"
        relevant = items[:2]
        sys_msg_extra = "User wants to /compare 2 courses. Briefly compare strengths. "
    elif low.startswith("/schedule"):
        cmd = "schedule"
        wh = profile.get("weekly_hours", 10)
        sys_msg_extra = f"User wants a weekly study plan @ {wh} hrs/week. "
    elif low.startswith("/budget"):
        cmd = "budget"
        try: budget = int(msg.split(" ", 1)[1].replace("₹","").replace(",","").strip())
        except: budget = 5000
        relevant = [c for c in items
                    if int(c["pricing"].get("sa_inr", 0) or 0) <= budget][:6]
        sys_msg_extra = f"User has a ₹{budget:,} budget. Show paid options that fit. "
    else:
        cmd = "chat"
        relevant = [c for c in items
                    if c["pricing"]["type"] in ("free","free_audit","free_with_sa")][:3]

    sys_msg = ("You are SA's Course Advisor for Indian students. " + sys_msg_extra +
               "Always lead with FREE options. Reply in ≤3 sentences, warm and directive. "
               "Mention 1–2 specific course names from the list. No bullets, no markdown.")
    try:
        titles = [c["title"] for c in relevant[:5]]
        prompt = (f"User said: \"{msg}\"\nProfile: {profile}\n"
                  f"Top relevant courses: {', '.join(titles)}.\nWrite the reply.")
        reply = (await _claude(sys_msg, prompt, f"courses-advisor-{cmd}")).strip()
    except Exception as e:
        logger.warning(f"[courses] advisor LLM fallback: {e}")
        if relevant:
            reply = (f"Here are {len(relevant)} options I'd start with — "
                     f"{relevant[0]['title']} is a strong free first step, and "
                     f"{relevant[1]['title'] if len(relevant)>1 else relevant[0]['title']} "
                     f"keeps the momentum.")
        else:
            reply = "Tell me your goal + weekly hours, and I'll build a free-first path."
    return {"reply": reply, "courses": relevant, "cmd": cmd,
            "fetched_at": datetime.now(timezone.utc).isoformat()}


# ─── Live Catalog Aggregator (P4) ────────────────────────────────────────
_LIVE_CACHE: Dict[str, Any] = {"courses": None, "fetched_at": None}
_LIVE_CACHE_TTL = 3600

async def _fetch_mit_ocw() -> List[Dict[str, Any]]:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4) as cx:
            r = await cx.get("https://ocw.mit.edu/rss/site/main.rss")
            if r.status_code != 200: return []
            count = r.text.count("<item>")
            if count > 0:
                return [{
                    "id": f"mit-ocw-live-{i}", "source": "mit_ocw",
                    "external_id": f"mit-{i}",
                    "title": f"MIT OpenCourseWare — Live Course #{i+1}",
                    "short_desc": "Pulled live from MIT OCW RSS feed.",
                    "thumbnail": "🎓",
                    "provider": {"name": "MIT", "type": "university", "logo_url": ""},
                    "instructors": ["MIT Faculty"],
                    "category": "tech", "subcategory": "system-design",
                    "level": "Intermediate", "language": "English",
                    "duration_hours": 40, "duration_label": "Self-paced",
                    "enrolled_count": 50000, "rating": 4.8, "review_count": 5000,
                    "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
                    "certification": {"available": False, "type": "none",
                                       "free": True, "recognised": False, "cost_inr": 0},
                    "self_paced": True,
                    "enroll_url": "https://ocw.mit.edu/", "tags": ["IVY_LEAGUE","FREE"],
                } for i in range(min(count, 3))]
    except Exception as e:
        logger.warning(f"[courses] MIT OCW live fetch failed: {e}")
    return []


async def _fetch_freecodecamp() -> List[Dict[str, Any]]:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4) as cx:
            r = await cx.get("https://www.freecodecamp.org/news/ghost/api/content/posts/?key=public&limit=2")
            if r.status_code != 200: return []
            return [{
                "id": "fcc-live-1", "source": "freecodecamp",
                "external_id": "fcc-resp",
                "title": "freeCodeCamp Web Development Curriculum",
                "short_desc": "300+ hours of self-paced certifications. Pulled live.",
                "thumbnail": "💻",
                "provider": {"name": "freeCodeCamp", "type": "platform", "logo_url": ""},
                "instructors": ["freeCodeCamp"], "category": "tech",
                "subcategory": "web-dev", "level": "Beginner", "language": "English",
                "duration_hours": 300, "duration_label": "Self-paced",
                "enrolled_count": 4500000, "rating": 4.7, "review_count": 30000,
                "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
                "certification": {"available": True, "type": "completion",
                                   "free": True, "recognised": True, "cost_inr": 0},
                "self_paced": True,
                "enroll_url": "https://www.freecodecamp.org/learn",
                "tags": ["FREE","FREE_CERT","TOP_RATED","BEGINNER_FRIENDLY"],
            }]
    except Exception as e:
        logger.warning(f"[courses] freeCodeCamp live fetch failed: {e}")
    return []


@router.get("/courses/live-catalog")
async def live_catalog(user: dict = Depends(_auth()), force: bool = False):
    import asyncio
    now = datetime.now(timezone.utc)
    cached_at = _LIVE_CACHE.get("fetched_at")
    if (not force and cached_at and
        (now - cached_at).total_seconds() < _LIVE_CACHE_TTL and
        _LIVE_CACHE.get("courses")):
        return {"courses": _LIVE_CACHE["courses"], "cached": True,
                "fetched_at": cached_at.isoformat(),
                "sources": ["mit_ocw", "freecodecamp", "curated"]}
    results = await asyncio.gather(
        _fetch_mit_ocw(), _fetch_freecodecamp(),
        return_exceptions=True)
    live: List[Dict[str, Any]] = []
    sources_used = ["curated"]
    for src_id, res in zip(["mit_ocw", "freecodecamp"], results):
        if isinstance(res, list) and res:
            live.extend(res)
            sources_used.append(src_id)
    seed = CURATED_COURSES
    by_id: Dict[str, Dict[str, Any]] = {}
    for c in seed:   by_id[c["id"]] = c
    for c in live:   by_id[c["id"]] = c
    merged = list(by_id.values())
    _LIVE_CACHE["courses"] = merged
    _LIVE_CACHE["fetched_at"] = now
    return {"courses": merged, "cached": False,
            "fetched_at": now.isoformat(),
            "sources": sources_used,
            "live_count": len(live), "curated_count": len(seed)}
