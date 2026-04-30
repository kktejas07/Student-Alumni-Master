"""
Student Alumni Platform — Personalization Engine
=================================================
Implements the content-prioritization logic per spec:

1. INTEREST-BASED FILTERING
   Career path (job/higher_education/startup/business) drives content selection.
   Mentors are matched by category. Internships, courses, events filtered by tags.

2. EDUCATIONAL LEVEL SEGMENTATION
   - +1, +2 (Class 11/12)  -> Campus tours + Scholarships pinned, Insurance/Housing demoted
   - B.Tech 1-2 yr         -> Internships + Hackathons + Courses pinned
   - B.Tech 3-4 yr         -> Jobs + Higher Ed (i20) + Networking + Events pinned
   - Masters               -> Jobs + Research + Networking + Visa/Housing pinned
   - Alumni                -> Mentorship + Events + Knowledge Rooms + Network pinned

3. REAL-TIME / DEADLINE URGENCY
   Events with registration_deadline within 7 days surface to the top of the
   "Closing Soon" rail and bump scoring.

4. MODULAR CATEGORIZATION (8 modules)
   Career Guidelines, Events, Courses, Networking, Financial Services,
   Insurance, Housing, Deals — re-ordered per user.

5. AI-DRIVEN RE-PRIORITIZATION
   When user updates preferences, scores are recomputed instantly. AI hook
   (Claude via emergentintegrations) is available for narrative recommendations.

6. ROLE TRANSITIONS
   B.Tech complete -> alumni transition unlocks mentor/Knowledge Rooms emphasis.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Module Priority Matrix — drives the dashboard tile ordering.
# Each value is the relative weight (higher = more important) per education
# level. The 8 modules from the spec + extras (scholarships, campus_tours).
# ---------------------------------------------------------------------------
MODULE_WEIGHTS: Dict[str, Dict[str, float]] = {
    # Class 11 / +1
    "plus_one": {
        "career_guidelines": 0.55,
        "events":            0.70,   # cultural fests, school workshops
        "courses":           0.85,   # K12 / Khan Academy
        "scholarships":      1.00,   # PINNED — primary value for school students
        "campus_tours":      0.95,   # PINNED — visit colleges
        "networking":        0.40,
        "deals":             0.50,
        "financial":         0.50,   # education loans
        "insurance":         0.20,   # demoted
        "housing":           0.20,   # demoted (still in school)
    },
    "plus_two": {
        "career_guidelines": 0.65,
        "events":            0.75,
        "courses":           0.90,   # entrance exam prep
        "scholarships":      1.00,
        "campus_tours":      0.95,
        "networking":        0.45,
        "deals":             0.50,
        "financial":         0.55,
        "insurance":         0.20,
        "housing":           0.25,
    },
    # B.Tech (combined under "btech" in the existing schema)
    "btech": {
        "career_guidelines": 0.95,   # internships + jobs are TOP priority
        "events":            0.90,   # hackathons, codeathons
        "courses":           0.85,
        "networking":        0.85,   # alumni / Knowledge Rooms
        "financial":         0.70,   # higher-ed loans
        "scholarships":      0.65,
        "campus_tours":      0.30,   # already in college
        "housing":           0.55,   # PG / hostel
        "insurance":         0.45,
        "deals":             0.65,
    },
    "bachelors": {  # backward-compat alias
        "career_guidelines": 0.95,
        "events":            0.90,
        "courses":           0.85,
        "networking":        0.85,
        "financial":         0.70,
        "scholarships":      0.65,
        "campus_tours":      0.30,
        "housing":           0.55,
        "insurance":         0.45,
        "deals":             0.65,
    },
    # Masters / PhD — focus shifts to research, jobs, visa
    "masters": {
        "career_guidelines": 0.95,
        "events":            0.80,
        "courses":           0.70,
        "networking":        0.95,   # alumni network is critical
        "financial":         0.65,
        "scholarships":      0.55,
        "housing":           0.85,   # international housing (US/UK/Canada)
        "insurance":         0.75,   # travel + medical for abroad
        "campus_tours":      0.10,
        "deals":             0.50,
    },
    "phd": {
        "career_guidelines": 0.85,
        "events":            0.75,
        "courses":           0.55,
        "networking":        1.00,
        "financial":         0.60,
        "scholarships":      0.65,
        "housing":           0.75,
        "insurance":         0.65,
        "campus_tours":      0.10,
        "deals":             0.45,
    },
    # Alumni — emphasis on mentorship + community, less on study aids
    "alumni": {
        "career_guidelines": 0.70,
        "events":            0.95,   # alumni meets, networking
        "courses":           0.55,
        "networking":        1.00,   # PINNED — Knowledge Rooms, mentor others
        "financial":         0.55,
        "scholarships":      0.30,
        "housing":           0.65,
        "insurance":         0.70,
        "campus_tours":      0.05,
        "deals":             0.55,
    },
    # Default fallback when education_level is missing
    "other": {
        "career_guidelines": 0.85,
        "events":            0.80,
        "courses":           0.75,
        "networking":        0.70,
        "financial":         0.60,
        "scholarships":      0.55,
        "housing":           0.55,
        "insurance":         0.45,
        "campus_tours":      0.25,
        "deals":             0.55,
    },
}


# Career path -> module bonus (boost relevant modules per interest)
CAREER_PATH_BONUS: Dict[str, Dict[str, float]] = {
    "job":              {"career_guidelines": 0.20, "events": 0.10, "networking": 0.10},
    "higher_education": {"courses": 0.20, "scholarships": 0.15, "financial": 0.10, "housing": 0.10},
    "startup":          {"events": 0.20, "networking": 0.20, "courses": 0.10},
    "business":         {"courses": 0.15, "events": 0.10, "networking": 0.15, "financial": 0.10},
}


# Mapping from spec career path -> ranked list of mentor categories.
# Multi-category match — a Job seeker should see SDEs + Recruiters + EMs + Coaches.
CAREER_PATH_TO_MENTOR_CATEGORIES: Dict[str, List[str]] = {
    "job":              ["it_software", "tech_recruiter", "engineering_manager",
                          "career_coach", "hr_mentor"],
    "higher_education": ["higher_education", "career_coach"],
    "startup":          ["startup_mentor", "startup_advisor", "industry_advisor",
                          "engineering_manager"],
    "business":         ["business_mentor", "industry_advisor", "hr_mentor",
                          "career_coach"],
}
# Single-category fallback (kept for backward-compat with existing call sites)
CAREER_PATH_TO_MENTOR_CATEGORY: Dict[str, str] = {
    "job":              "it_software",
    "higher_education": "higher_education",
    "startup":          "startup_mentor",
    "business":         "business_mentor",
}


# Number of school-student modules at top, vs university (per spec the top
# priority modules should not be cluttered by less-relevant ones). The rest
# get pushed into a "Promotions" carousel.
TOP_MODULES_DEFAULT = 8  # show all 8 in priority order


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _normalize_education_level(user: dict) -> str:
    """Best-effort resolution of the user's education level from their profile."""
    student = user.get("student_info") or {}
    edu = student.get("education_level")
    if edu:
        return edu
    if user.get("role") == "alumni":
        return "alumni"
    school = user.get("school_info") or {}
    cls = (school.get("class_or_year") or "").lower().strip()
    if "11" in cls or "+1" in cls:
        return "plus_one"
    if "12" in cls or "+2" in cls:
        return "plus_two"
    if "btech" in cls or "b.tech" in cls or "bachelor" in cls:
        return "btech"
    if "master" in cls or "mba" in cls or "msc" in cls or "ms " in cls:
        return "masters"
    if "phd" in cls or "doctor" in cls:
        return "phd"
    return "other"


def _is_alumni(user: dict) -> bool:
    """Detects if the user qualifies as alumni (graduated B.Tech 4th year, etc.).
    Triggers: explicit role=alumni OR graduation_year in the past."""
    if user.get("role") == "alumni":
        return True
    school = user.get("school_info") or {}
    grad_year = school.get("graduation_year")
    if grad_year and isinstance(grad_year, int):
        return grad_year < datetime.now().year
    alumni_info = user.get("alumni_info") or {}
    if alumni_info.get("graduation_year"):
        return True
    return False


def _deadline_urgency_days(deadline_iso: Optional[str]) -> Optional[int]:
    """Returns # days until the registration_deadline (negative if past)."""
    if not deadline_iso:
        return None
    try:
        # Accept "YYYY-MM-DD" or full ISO
        dt = datetime.fromisoformat(deadline_iso.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = (dt - datetime.now(timezone.utc)).days
        return delta
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Scoring Engine
# ---------------------------------------------------------------------------
def compute_module_priority(user: dict, click_counts: Optional[Dict[str, int]] = None) -> List[Tuple[str, float]]:
    """Returns ordered list of (module_id, score) for the user's dashboard."""
    edu = _normalize_education_level(user)
    if _is_alumni(user):
        edu = "alumni"

    base = MODULE_WEIGHTS.get(edu, MODULE_WEIGHTS["other"])
    career = user.get("career_path")
    bonus = CAREER_PATH_BONUS.get(career, {})

    click_counts = click_counts or {}
    max_clicks = max(click_counts.values()) if click_counts else 1

    scored: List[Tuple[str, float]] = []
    for module_id, base_weight in base.items():
        score = base_weight
        # Career path bonus
        score += bonus.get(module_id, 0.0)
        # Frequency-of-use (capped at +0.10)
        clicks = click_counts.get(module_id, 0)
        score += min(0.10, (clicks / max_clicks) * 0.10) if max_clicks > 0 else 0.0
        scored.append((module_id, round(score, 3)))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def select_priority_modules(scored: List[Tuple[str, float]], top_n: int = TOP_MODULES_DEFAULT) -> Tuple[List[str], List[str]]:
    """Splits scored modules into PRIMARY (top N) and PROMOTIONS (rest)."""
    primary = [m for m, _ in scored[:top_n]]
    promotions = [m for m, _ in scored[top_n:]]
    return primary, promotions


# ---------------------------------------------------------------------------
# Recommendation Builder — top-3 "Recommended For You" cards
# ---------------------------------------------------------------------------
async def build_recommendations(db, user: dict) -> Dict[str, Any]:
    """Returns hand-picked items: 1 top mentor + 1 urgent event + 1 hot course."""
    career = user.get("career_path")
    mentor_cats = CAREER_PATH_TO_MENTOR_CATEGORIES.get(career or "job", ["it_software"])

    # Mentor: prefer ANY of the matched categories (ordered by preference)
    mentor = await db.sample_mentors.find_one({"category": {"$in": mentor_cats}}, {"_id": 0})
    if not mentor:
        mentor = await db.sample_mentors.find_one({}, {"_id": 0})

    # Event: nearest registration deadline first
    events = await db.events.find({}, {"_id": 0}).sort("registration_deadline", 1).limit(5).to_list(5)
    urgent_event = None
    for e in events:
        days = _deadline_urgency_days(e.get("registration_deadline"))
        if days is not None and 0 <= days <= 14:
            urgent_event = {**e, "deadline_days": days}
            break
    if not urgent_event and events:
        urgent_event = {**events[0], "deadline_days": _deadline_urgency_days(events[0].get("registration_deadline"))}

    # Course: career-path matched
    course_q = {"career_paths": career} if career else {}
    course = await db.courses.find_one(course_q, {"_id": 0})
    if not course:
        course = await db.courses.find_one({}, {"_id": 0})

    return {"mentor": mentor, "event": urgent_event, "course": course}


async def build_closing_soon(db, days_threshold: int = 7) -> List[dict]:
    """Returns events whose registration_deadline is within `days_threshold`."""
    events = await db.events.find({}, {"_id": 0}).sort("registration_deadline", 1).limit(20).to_list(20)
    out: List[dict] = []
    for e in events:
        days = _deadline_urgency_days(e.get("registration_deadline"))
        if days is not None and 0 <= days <= days_threshold:
            out.append({**e, "deadline_days": days})
    return out


# ---------------------------------------------------------------------------
# Public API — call from server.py
# ---------------------------------------------------------------------------
async def build_personalized_dashboard(db, user: dict) -> Dict[str, Any]:
    """
    Master function: returns the complete personalized dashboard payload.
    Combines: ordered modules + recommendations + closing-soon + featured content.
    """
    # 1. Resolve user state
    edu = _normalize_education_level(user)
    if _is_alumni(user) and edu not in ("alumni",):
        # User already meets alumni criteria → expose transition prompt
        edu_for_priority = "alumni"
        can_transition_alumni = user.get("role") == "student"
    else:
        edu_for_priority = edu
        can_transition_alumni = False

    # 2. Click-frequency bonus (live data)
    user_id = str(user.get("_id"))
    clicks_doc = await db.module_clicks.find_one({"user_id": user_id}) or {}
    click_counts = clicks_doc.get("counts", {}) if clicks_doc else {}

    # 3. Score & order
    user_for_score = {**user, "student_info": {"education_level": edu_for_priority}}
    scored = compute_module_priority(user_for_score, click_counts)
    primary, promotions = select_priority_modules(scored, TOP_MODULES_DEFAULT)

    # 4. Featured content (interest-based)
    career = user.get("career_path")
    course_q = {"career_paths": career} if career else {}

    featured_courses = await db.courses.find(course_q, {"_id": 0}).limit(6).to_list(6)
    featured_internships = await db.internships.find(course_q, {"_id": 0}).limit(6).to_list(6)
    featured_events = await db.events.find({}, {"_id": 0}).sort("start_date", 1).limit(6).to_list(6)
    featured_deals = await db.deals.find({}, {"_id": 0}).limit(6).to_list(6)

    # 5. Recommendations + closing-soon
    recommendations = await build_recommendations(db, user)
    closing_soon = await build_closing_soon(db)

    # 6. Mentor list — multi-category match (e.g., Job → SDE + Recruiter + EM + Coach)
    mentor_cats = CAREER_PATH_TO_MENTOR_CATEGORIES.get(career or "job", ["it_software"])
    suggested_mentors = await db.sample_mentors.find(
        {"category": {"$in": mentor_cats}}, {"_id": 0}
    ).limit(8).to_list(8)
    if len(suggested_mentors) < 3:
        # Fill with general mentors
        extras = await db.sample_mentors.find(
            {"category": {"$nin": mentor_cats}}, {"_id": 0}
        ).limit(8 - len(suggested_mentors)).to_list(8)
        suggested_mentors.extend(extras)

    # 7. AI summary (cached only — frontend triggers regeneration explicitly)
    cached_ai = await db.career_suggestions.find_one({"user_id": user_id}, {"_id": 0})

    return {
        "personalization": {
            "career_path": career,
            "education_level": edu,
            "is_school_student": edu in ("plus_one", "plus_two"),
            "is_alumni": edu == "alumni",
            "can_transition_alumni": can_transition_alumni,
            "priority_modules": primary,        # top N modules in PhonePe-style grid
            "promotion_modules": promotions,    # demoted modules (carousel)
            "module_scores": dict(scored),      # for debugging / UI tooltips
        },
        "recommendations": recommendations,
        "closing_soon": closing_soon,
        "suggested_mentors": suggested_mentors,
        "featured_courses": featured_courses,
        "featured_internships": featured_internships,
        "featured_events": featured_events,
        "featured_deals": featured_deals,
        "career_suggestions": cached_ai or None,
        "stats": {
            "courses_available": await db.courses.count_documents({}),
            "mentors_available": await db.sample_mentors.count_documents({}),
            "internships_available": await db.internships.count_documents({}),
            "deals_available": await db.deals.count_documents({}),
            "events_available": await db.events.count_documents({}),
        },
    }


async def track_module_click(db, user_id: str, module_id: str) -> None:
    """Increment usage counter for the (user, module) pair. Powers frequency weighting."""
    await db.module_clicks.update_one(
        {"user_id": user_id},
        {
            "$inc": {f"counts.{module_id}": 1},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )


async def transition_to_alumni(db, user: dict) -> dict:
    """
    Convert a student user to alumni.
    Triggers: B.Tech 4th-year completion or explicit user action.
    Updates: role='alumni', creates alumni_info from school_info, unlocks mentor application.
    """
    if user.get("role") == "alumni":
        return user
    school = user.get("school_info") or {}
    alumni_info = user.get("alumni_info") or {
        "graduation_year": school.get("graduation_year") or datetime.now().year,
        "university": school.get("institution_name") or "",
        "employment_status": "employed",
    }
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "role": "alumni",
            "alumni_info": alumni_info,
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return await db.users.find_one({"_id": user["_id"]})
