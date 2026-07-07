import logging
import time as _time_mod
from datetime import datetime, timezone

from core.roadmap_engine import evaluate_roadmap_milestones
from core.career_prediction import compute_predictions, estimate_placement_readiness
from services.profile_service import compute_profile_completion

logger = logging.getLogger(__name__)

# ── In-memory cache ──────────────────────────────────────────────────────
_SKILL_INTEL_CACHE: dict = {}
_SKILL_INTEL_TTL_SECS = 300

# ── Standard milestones ──────────────────────────────────────────────────
_ALL_STANDARD_MILESTONES = [
    {"id": "m1",  "title": "Build your resume",       "description": "Create a professional resume highlighting your skills and experience.",       "milestone_type": "RESUME",          "completed": False, "completion_rule": "resume_documents > 0"},
    {"id": "m2",  "title": "Build Portfolio",          "description": "Create a portfolio website to showcase your projects and achievements.",    "milestone_type": "PORTFOLIO",       "completed": False, "completion_rule": "portfolio_url exists"},
    {"id": "m3",  "title": "Complete Profile",         "description": "Fill in your bio, education, and other profile details.",                    "milestone_type": "PROFILE",         "completed": False, "completion_rule": "bio length > 10"},
    {"id": "m4",  "title": "Network with Alumni",      "description": "Connect with at least 5 alumni on our platform to expand your network.",      "milestone_type": "NETWORKING",      "completed": False, "completion_rule": "connections >= 5"},
    {"id": "m5",  "title": "Practice Interviews",      "description": "Complete at least 1 mock interview session with a mentor.",                   "milestone_type": "MOCK_INTERVIEW",  "completed": False, "completion_rule": "bookings >= 1"},
    {"id": "m6",  "title": "Add 3 Projects",           "description": "Add at least 3 projects to your profile to demonstrate practical skills.",    "milestone_type": "PROJECT",         "completed": False, "completion_rule": "projects >= 3"},
    {"id": "m7",  "title": "Earn Certifications",      "description": "Earn at least 1 industry-recognized certification.",                          "milestone_type": "CERTIFICATION",   "completed": False, "completion_rule": "certificates >= 1"},
    {"id": "m8",  "title": "LinkedIn Boost",           "description": "Optimize your LinkedIn profile and link it to your account.",                 "milestone_type": "LINKEDIN",        "completed": False, "completion_rule": "linkedin_url exists"},
    {"id": "m9",  "title": "List Core Skills",         "description": "List at least 3 core technical or professional skills.",                       "milestone_type": "SKILLS",          "completed": False, "completion_rule": "skills >= 3"},
    {"id": "m10", "title": "Apply to Jobs",            "description": "Start applying to internship and job opportunities on the platform.",         "milestone_type": "JOB_APPLICATION", "completed": False, "completion_rule": "applications >= 1"},
]

# ── Cache helpers ────────────────────────────────────────────────────────

def invalidate_intel_cache(uid: str):
    _SKILL_INTEL_CACHE.pop(uid, None)


def _check_cache(uid: str):
    cached = _SKILL_INTEL_CACHE.get(uid)
    if cached and (_time_mod.time() - cached["ts"]) < _SKILL_INTEL_TTL_SECS:
        return cached["data"]
    return None


def _store_cache(uid: str, data: dict):
    _SKILL_INTEL_CACHE[uid] = {"ts": _time_mod.time(), "data": data}


# ── Skill categorization ─────────────────────────────────────────────────

_CATEGORY_KEYWORDS = {
    "technical_skills": {
        "react", "node", "python", "aws", "database", "mongodb", "sql", "javascript",
        "typescript", "c++", "java", "html", "css", "docker", "kubernetes", "git",
        "linux", "programming", "software", "api", "rest", "graphql", "redis",
        "postgresql", "mysql", "flask", "django", "express", "nextjs", "tailwind",
        "bootstrap", "sass", "redux", "webpack", "babel", "jest", "mocha", "cypress",
    },
    "communication": {
        "communication", "english", "public speaking", "debate", "languages",
        "speaking", "writing", "presentation", "verbal", "soft skills",
        "business communication", "technical writing", "documentation",
    },
    "leadership": {
        "leadership", "teamwork", "mentoring", "collaboration", "management",
        "team", "mentor", "organizer", "lead", "project management", "agile",
        "scrum", "product management", "strategic planning",
    },
    "interview_prep": {
        "problem solving", "aptitude", "interview", "dsa", "data structures",
        "algorithms", "analytical", "critical thinking", "system design",
        "coding", "competitive programming",
    },
}

_CATEGORY_WEIGHTS = {
    "technical_skills": 10,
    "communication": 15,
    "leadership": 20,
    "interview_prep": 15,
}


def categorize_skill(skill_name: str) -> tuple:
    """Map a skill name to (display_category, weight)."""
    lowered = skill_name.lower().strip()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in lowered:
                return category, _CATEGORY_WEIGHTS[category]
    return "technical_skills", 5


# ── Goal weights ─────────────────────────────────────────────────────────

def _detect_goal_weights(goal: str):
    """Return (weights_dict, profile_name) based on career goal."""
    goal_lower = str(goal or "").lower()
    if any(k in goal_lower for k in ("engineer", "sde", "developer", "technical", "coding", "programmer", "software")):
        return {
            "Technical Excellence": 0.40,
            "Career Preparation": 0.25,
            "Personal Brand": 0.15,
            "Professional Communication": 0.10,
            "Leadership & Collaboration": 0.05,
            "Industry Presence": 0.05,
        }, "Technical Engineer"
    elif any(k in goal_lower for k in ("manager", "pm", "product", "analyst", "consultant", "business")):
        return {
            "Professional Communication": 0.25,
            "Leadership & Collaboration": 0.25,
            "Career Preparation": 0.20,
            "Technical Excellence": 0.10,
            "Personal Brand": 0.10,
            "Industry Presence": 0.10,
        }, "Product Manager / Business Analyst"
    elif any(k in goal_lower for k in ("design", "ui", "ux", "artist", "creator", "graphics")):
        return {
            "Personal Brand": 0.30,
            "Technical Excellence": 0.20,
            "Professional Communication": 0.20,
            "Leadership & Collaboration": 0.10,
            "Career Preparation": 0.10,
            "Industry Presence": 0.10,
        }, "Creative Designer"
    else:
        return {
            "Technical Excellence": 0.25,
            "Professional Communication": 0.15,
            "Personal Brand": 0.20,
            "Leadership & Collaboration": 0.15,
            "Career Preparation": 0.15,
            "Industry Presence": 0.10,
        }, "Professional / Specialist"


# ── 6-dimension scoring ──────────────────────────────────────────────────

def _compute_skill_dimensions(user: dict, connections: int, bookings_count: int, num_projects: int, num_certs: int, has_resume: bool, has_github: bool, has_linkedin: bool, has_portfolio: bool) -> dict:
    """Compute the 6 skill dimension scores (0-100) using inline keyword matching."""
    skills = [s.lower() for s in (user.get("skills") or [])]

    # Technical Excellence
    tech_keywords = {"react", "node", "python", "aws", "database", "mongodb", "sql", "javascript", "typescript", "c++", "java", "html", "css", "docker", "kubernetes", "git", "linux", "programming", "software"}
    matched_tech = sum(1 for s in skills if any(k in s for k in tech_keywords))
    tech_score = 35 + (matched_tech * 10) + (15 if num_projects > 0 else 0) + (15 if has_github else 0)
    tech_score = min(100, max(25, tech_score))

    # Professional Communication
    comm_keywords = {"communication", "english", "public speaking", "debate", "languages", "speaking", "writing", "presentation", "verbal", "soft skills"}
    matched_comm = sum(1 for s in skills if any(k in s for k in comm_keywords))
    comm_score = 40 + (matched_comm * 15)
    comm_score = min(100, max(25, comm_score))

    # Personal Brand
    brand_score = 20
    if has_resume: brand_score += 25
    if has_portfolio: brand_score += 25
    if has_linkedin: brand_score += 15
    if has_github: brand_score += 15
    brand_score = min(100, max(20, brand_score))

    # Leadership & Collaboration
    lead_keywords = {"leadership", "teamwork", "mentoring", "collaboration", "management", "team", "mentor", "organizer", "lead"}
    matched_lead = sum(1 for s in skills if any(k in s for k in lead_keywords))
    lead_score = 40 + (matched_lead * 20)
    lead_score = min(100, max(25, lead_score))

    # Career Preparation
    prep_keywords = {"problem solving", "aptitude", "interview", "dsa", "data structures", "algorithms", "analytical"}
    matched_prep = sum(1 for s in skills if any(k in s for k in prep_keywords))
    prep_score = 35 + (matched_prep * 15) + (20 if bookings_count > 0 else 0)
    prep_score = min(100, max(25, prep_score))

    # Industry Presence
    industry_score = 30 + min(40, connections * 10) + (15 if num_certs > 0 else 0)
    industry_score = min(100, max(30, industry_score))

    return {
        "Technical Excellence": tech_score,
        "Professional Communication": comm_score,
        "Personal Brand": brand_score,
        "Leadership & Collaboration": lead_score,
        "Career Preparation": prep_score,
        "Industry Presence": industry_score,
    }, {
        "matched_tech": matched_tech, "matched_comm": matched_comm,
        "matched_lead": matched_lead, "matched_prep": matched_prep,
        "num_projects": num_projects, "has_github": has_github,
        "has_resume": has_resume, "has_linkedin": has_linkedin,
        "has_portfolio": has_portfolio, "connections": connections,
        "bookings_count": bookings_count, "num_certs": num_certs,
    }


# ── Action impact computation ────────────────────────────────────────────

def compute_dynamic_action_impact(m_type, overall_score, scores, weights, goal_name, has_resume, num_projects, connections_count, bookings_count, num_certs, skills_len):
    """Compute dynamic score contribution for a pending action."""
    m_type = str(m_type or "PROFILE").upper()

    if m_type == "RESUME":
        w = weights.get("Personal Brand", 0.20)
        base_gain = int(round(25 * w))
        bonus = 3 if scores.get("Personal Brand", 0) < 50 else 0
        gain = max(5, min(15, base_gain + bonus))
        reason = "Your profile currently has no resume uploaded for AI review." if not has_resume else "Updating your resume ensures AI keyword matching stays fresh."
        impact = [f"+{gain}% Readiness", "+25% Personal Brand", "+15% Recruiter Visibility"]
    elif m_type == "PROJECT":
        w = weights.get("Technical Excellence", 0.25)
        base_gain = int(round(15 * w))
        bonus = int((100 - scores.get("Technical Excellence", 50)) * 0.15) if scores.get("Technical Excellence", 0) < 60 else 0
        gain = max(6, min(20, base_gain + bonus))
        reason = "You currently have no technical projects listed to showcase practical experience." if num_projects == 0 else f"Adding advanced projects addresses your largest skill gap for {goal_name} roles."
        tech_gain = min(25, max(10, int((100 - scores.get("Technical Excellence", 50)) * 0.4)))
        impact = [f"+{gain}% Readiness", f"+{tech_gain}% Technical Excellence", "+15% Portfolio Strength"]
    elif m_type == "SKILLS":
        gain = max(5, min(12, int((100 - overall_score) * 0.12))) if skills_len < 3 else max(3, min(8, int((100 - overall_score) * 0.08)))
        reason = "You have fewer than 3 skills listed. Listing core domain skills is critical for keyword matching." if skills_len < 3 else f"Expanding your technical skills aligns your profile with industry requirements for {goal_name}."
        impact = [f"+{gain}% Readiness", "+15% Keyword Matching", "+10% Technical Excellence"]
    elif m_type == "MOCK_INTERVIEW":
        w = weights.get("Career Preparation", 0.15)
        base_gain = int(round(20 * w))
        bonus = 4 if scores.get("Career Preparation", 0) < 50 else 0
        gain = max(6, min(15, base_gain + bonus))
        reason = "You haven't completed any practice mock interviews yet to refine your interview skills." if bookings_count == 0 else "Regular mock interview practice builds confidence and sharpens your communication."
        impact = [f"+{gain}% Readiness", "+20% Career Preparation", "+15% Interview Confidence"]
    elif m_type == "PORTFOLIO":
        w = weights.get("Personal Brand", 0.20)
        base_gain = int(round(25 * w))
        bonus = 3 if scores.get("Personal Brand", 0) < 50 else 0
        gain = max(6, min(15, base_gain + bonus))
        reason = "You do not have a live portfolio link to showcase your work and projects to recruiters."
        impact = [f"+{gain}% Readiness", "+25% Personal Brand", "+15% Online Presence"]
    elif m_type == "LINKEDIN":
        w = weights.get("Personal Brand", 0.20)
        gain = max(5, min(10, int(round(15 * w)) + 2))
        reason = "Your LinkedIn profile is not linked, which limits recruiter outreach and professional networking."
        impact = [f"+{gain}% Readiness", "+15% Personal Brand", "+10% Industry Presence"]
    elif m_type == "NETWORKING":
        w = weights.get("Industry Presence", 0.10)
        gain = max(4, min(12, int(round(15 * w)) + (4 if connections_count == 0 else 0)))
        reason = "You have 0 alumni connections. Expanding your network increases referral opportunities." if connections_count == 0 else "Connecting with mentors and alumni unlocks industry insights and job referrals."
        impact = [f"+{gain}% Readiness", "+15% Industry Presence", "+10% Referral Opportunity"]
    elif m_type == "CERTIFICATION":
        w = weights.get("Industry Presence", 0.10)
        gain = max(6, min(14, int(round(15 * w)) + (4 if scores.get("Industry Presence", 0) < 50 else 0)))
        reason = f"Earning recognized professional certifications validates your technical expertise in {goal_name}."
        impact = [f"+{gain}% Readiness", "+15% Industry Presence", "+10% Resume Authority"]
    elif m_type == "JOB_APPLICATION":
        gain = max(4, min(10, int((100 - overall_score) * 0.08)))
        reason = "You haven't started applying to roles yet. Putting your skills to practice in applications builds momentum."
        impact = [f"+{gain}% Readiness", "+15% Market Feedback", "+10% Career Preparation"]
    elif m_type == "EDUCATION":
        gain = max(3, min(6, int((100 - overall_score) * 0.05)))
        reason = "Adding complete education and academic records establishes your background for recruiter screening."
        impact = [f"+{gain}% Readiness", "+10% Profile Credibility", "+5% Personal Brand"]
    elif m_type == "PHOTO":
        gain = 3
        reason = "Adding a professional headshot humanizes your profile and increases profile view engagement by 40%."
        impact = [f"+{gain}% Readiness", "+10% Personal Brand", "+5% Recruiter Trust"]
    else:
        gain = max(3, min(8, int((100 - overall_score) * 0.06)))
        reason = "Completing your bio and headline makes a powerful first impression on hiring managers and alumni."
        impact = [f"+{gain}% Readiness", "+10% Personal Brand", "+10% Profile Credibility"]

    est_readiness = min(100, overall_score + gain)
    return {
        "gain": gain, "reason": reason, "impact_breakdown": impact,
        "current_readiness": overall_score, "estimated_readiness": est_readiness,
    }


# ── Readiness level helpers ──────────────────────────────────────────────

_LEVEL_THRESHOLDS = [
    (0,   "Explorer"),
    (21,  "Builder"),
    (41,  "Developing Professional"),
    (61,  "Career Ready"),
    (81,  "Industry Ready"),
    (101, "Industry Ready"),
]


def get_readiness_level(score: float) -> str:
    if score <= 20: return "Explorer"
    if score <= 40: return "Builder"
    if score <= 60: return "Developing Professional"
    if score <= 80: return "Career Ready"
    return "Industry Ready"


def _get_next_level_info(score: float) -> tuple:
    """Return (next_level_name, next_threshold)."""
    for thresh, lvl in _LEVEL_THRESHOLDS:
        if score < thresh:
            return lvl, thresh
    return "Industry Ready", 100


# ── Score explanations builder ───────────────────────────────────────────

def _build_score_explanations(scores, weights, tech_score, comm_score, brand_score, lead_score, prep_score, industry_score, overall_score, matched_tech, matched_comm, matched_lead, matched_prep, num_projects, has_github, has_resume, has_linkedin, has_portfolio, connections, bookings_count, num_certs):
    """Build the score_explanations dict with readiness factors + category breakdowns."""
    readiness_factors = []
    for cat_name, cat_score in scores.items():
        w_val = weights.get(cat_name, 0.15)
        earned_pts = round(cat_score * w_val, 1)
        max_pts = int(round(100 * w_val))
        readiness_factors.append({
            "label": cat_name, "earned": earned_pts,
            "weight_pct": int(round(w_val * 100)), "max": max_pts, "score_pct": cat_score,
        })

    cat_breakdowns = {
        "Technical Excellence": {
            "current_score": tech_score,
            "weight_pct": int(round(weights.get("Technical Excellence", 0.25) * 100)),
            "missing_points": max(0, 100 - tech_score),
            "factors": [
                {"label": "Skills Matching", "earned": matched_tech * 10, "max": 35, "done": matched_tech > 0},
                {"label": "Projects Built", "earned": 15 if num_projects > 0 else 0, "max": 15, "done": num_projects > 0},
                {"label": "GitHub Portfolio", "earned": 15 if has_github else 0, "max": 15, "done": has_github},
                {"label": "Base Foundation", "earned": 35, "max": 35, "done": True},
            ],
        },
        "Professional Communication": {
            "current_score": comm_score,
            "weight_pct": int(round(weights.get("Professional Communication", 0.15) * 100)),
            "missing_points": max(0, 100 - comm_score),
            "factors": [
                {"label": "Communication Skills", "earned": matched_comm * 15, "max": 60, "done": matched_comm > 0},
                {"label": "Base Foundation", "earned": 40, "max": 40, "done": True},
            ],
        },
        "Personal Brand": {
            "current_score": brand_score,
            "weight_pct": int(round(weights.get("Personal Brand", 0.20) * 100)),
            "missing_points": max(0, 100 - brand_score),
            "factors": [
                {"label": "Resume Uploaded", "earned": 25 if has_resume else 0, "max": 25, "done": has_resume},
                {"label": "Portfolio Website", "earned": 25 if has_portfolio else 0, "max": 25, "done": has_portfolio},
                {"label": "LinkedIn Connected", "earned": 15 if has_linkedin else 0, "max": 15, "done": has_linkedin},
                {"label": "GitHub Connected", "earned": 15 if has_github else 0, "max": 15, "done": has_github},
                {"label": "Base Foundation", "earned": 20, "max": 20, "done": True},
            ],
        },
        "Leadership & Collaboration": {
            "current_score": lead_score,
            "weight_pct": int(round(weights.get("Leadership & Collaboration", 0.15) * 100)),
            "missing_points": max(0, 100 - lead_score),
            "factors": [
                {"label": "Leadership Skills", "earned": matched_lead * 20, "max": 60, "done": matched_lead > 0},
                {"label": "Base Foundation", "earned": 40, "max": 40, "done": True},
            ],
        },
        "Career Preparation": {
            "current_score": prep_score,
            "weight_pct": int(round(weights.get("Career Preparation", 0.15) * 100)),
            "missing_points": max(0, 100 - prep_score),
            "factors": [
                {"label": "Aptitude & DSA Skills", "earned": matched_prep * 15, "max": 45, "done": matched_prep > 0},
                {"label": "Mock Interviews", "earned": 20 if bookings_count > 0 else 0, "max": 20, "done": bookings_count > 0},
                {"label": "Base Foundation", "earned": 35, "max": 35, "done": True},
            ],
        },
        "Industry Presence": {
            "current_score": industry_score,
            "weight_pct": int(round(weights.get("Industry Presence", 0.10) * 100)),
            "missing_points": max(0, 100 - industry_score),
            "factors": [
                {"label": "Alumni Connections", "earned": min(40, connections * 10), "max": 40, "done": connections > 0},
                {"label": "Certifications Earned", "earned": 15 if num_certs > 0 else 0, "max": 15, "done": num_certs > 0},
                {"label": "Base Foundation", "earned": 30, "max": 30, "done": True},
            ],
        },
    }

    return {
        "readiness": {
            "current": overall_score, "target": 100,
            "missing_points": max(0, 100 - overall_score),
            "factors": readiness_factors,
        },
        "categories": cat_breakdowns,
    }


# ── Ranked actions builder ────────────────────────────────────────────────

_MILESTONE_TYPE_MAP = {
    "skills": "SKILLS", "resume": "RESUME", "projects": "PROJECT",
    "socials": "LINKEDIN", "education": "EDUCATION", "bio": "PROFILE", "photo": "PHOTO",
}

_ACTION_TITLES = {
    "skills": "List Skills", "resume": "Upload Resume", "projects": "Add Projects",
    "socials": "Link LinkedIn / GitHub", "education": "Enter Education Details",
    "bio": "Write Bio / Headline", "photo": "Upload Profile Photo",
}


# ── Canonical pipeline ───────────────────────────────────────────────────

async def compute_full_intelligence(user: dict, uid: str, db, force_refresh: bool = False) -> dict:
    """The single source of truth for career intelligence.

    All callers must use this pipeline instead of reimplementing scoring logic.
    Handles caching internally (5-min TTL).
    """
    # 1. Check cache
    if not force_refresh:
        cached = _check_cache(uid)
        if cached:
            return cached

    # 2. Gather data
    num_projects = len(user.get("projects") or [])
    num_certs = len(user.get("certificates") or [])
    skills_count = len(user.get("skills") or [])
    has_github = bool(user.get("github_url"))
    has_linkedin = bool(user.get("linkedin_url"))
    has_portfolio = bool(user.get("portfolio_url"))

    connections = 0
    try:
        connections = await db.connections.count_documents({
            "$or": [{"from_id": uid}, {"to_id": uid}], "status": "accepted",
        })
    except Exception:
        pass

    bookings_count = 0
    try:
        bookings_count = await db.bookings.count_documents({"student_id": uid})
    except Exception:
        pass

    user_db = await db.users.find_one({"_id": user["_id"]}, {"resume_documents": 1})
    has_resume = len((user_db.get("resume_documents") or []) if user_db else []) > 0

    # 3. Compute skill dimensions
    scores, match_data = _compute_skill_dimensions(
        user, connections, bookings_count, num_projects, num_certs,
        has_resume, has_github, has_linkedin, has_portfolio,
    )
    tech_score = scores["Technical Excellence"]
    comm_score = scores["Professional Communication"]
    brand_score = scores["Personal Brand"]
    lead_score = scores["Leadership & Collaboration"]
    prep_score = scores["Career Preparation"]
    industry_score = scores["Industry Presence"]

    # 4. Detect goal weights
    si = user.get("student_info") or {}
    goal = si.get("career_goal") or user.get("career_goal") or ""
    existing_roadmap = await db.career_roadmaps.find_one({"user_id": uid})
    if existing_roadmap and existing_roadmap.get("target_role"):
        goal = existing_roadmap.get("target_role")
    if not goal:
        goal = "Software Engineer"

    weights, profile_name = _detect_goal_weights(goal)

    # 5. Compute overall readiness
    overall_score = (
        (tech_score * weights["Technical Excellence"]) +
        (comm_score * weights["Professional Communication"]) +
        (brand_score * weights["Personal Brand"]) +
        (lead_score * weights["Leadership & Collaboration"]) +
        (prep_score * weights["Career Preparation"]) +
        (industry_score * weights["Industry Presence"])
    )
    overall_score = min(100, max(20, int(round(overall_score))))

    # 6. Build recommendation
    weakest_cat = min(scores, key=scores.get)
    gap_gains = {
        "Technical Excellence": "+8%",
        "Personal Brand": "+10%",
        "Professional Communication": "+6%",
        "Leadership & Collaboration": "+7%",
        "Career Preparation": "+9%",
        "Industry Presence": "+8%",
    }
    gap_desc = {
        "Technical Excellence": "Increase Technical Excellence score by adding projects or technical skills.",
        "Personal Brand": "Increase Personal Brand score by adding a portfolio website, GitHub link, or uploading a resume.",
        "Professional Communication": "Increase Professional Communication score by practicing speaking or adding public speaking skills.",
        "Leadership & Collaboration": "Increase Leadership & Collaboration score by adding teamwork, mentoring, or leadership experiences.",
        "Career Preparation": "Increase Career Preparation score by booking a mock interview session or adding DSA skills.",
        "Industry Presence": "Increase Industry Presence score by connecting with alumni and attending workshops.",
    }

    recommendation = {
        "category": weakest_cat, "title": "Top Opportunity",
        "action": f"Improve {weakest_cat}",
        "description": gap_desc.get(weakest_cat, "Strengthen your profile by adding more credentials."),
        "gain": gap_gains.get(weakest_cat, "+5%"),
    }

    # 7. Profile completion
    profile_comp = compute_profile_completion(user)
    profile_pct = profile_comp["percentage"]

    # 8. Evaluate milestones
    milestones = []
    if existing_roadmap and existing_roadmap.get("milestones"):
        ms = existing_roadmap.get("milestones", [])
        existing_types = {m.get("milestone_type") for m in ms}
        for std_m in _ALL_STANDARD_MILESTONES:
            if std_m["milestone_type"] not in existing_types:
                ms.append(dict(std_m))
        milestones = await evaluate_roadmap_milestones(user, ms, db)
    else:
        fallback_milestones = [dict(m) for m in _ALL_STANDARD_MILESTONES]
        milestones = await evaluate_roadmap_milestones(user, fallback_milestones, db)

    pending_milestones = [m for m in milestones if not m.get("completed")]

    # 9. Build ranked actions
    actions = []
    for m in pending_milestones:
        m_type = m.get("milestone_type")
        imp = compute_dynamic_action_impact(
            m_type, overall_score, scores, weights, goal,
            has_resume, num_projects, connections, bookings_count, num_certs, skills_count,
        )
        actions.append({
            "title": m.get("title"), "description": m.get("description"),
            "gain": imp["gain"], "type": m_type, "source": "roadmap",
            "reason": imp["reason"], "impact_breakdown": imp["impact_breakdown"],
            "current_readiness": imp["current_readiness"], "estimated_readiness": imp["estimated_readiness"],
        })

    for item in profile_comp["items"]:
        if not item["done"]:
            key = item["key"]
            m_type = _MILESTONE_TYPE_MAP.get(key, "PROFILE")
            imp = compute_dynamic_action_impact(
                m_type, overall_score, scores, weights, goal,
                has_resume, num_projects, connections, bookings_count, num_certs, skills_count,
            )
            actions.append({
                "title": _ACTION_TITLES.get(key, "Complete Profile"),
                "description": imp["reason"], "gain": imp["gain"], "type": m_type,
                "source": "profile", "reason": imp["reason"],
                "impact_breakdown": imp["impact_breakdown"],
                "current_readiness": imp["current_readiness"], "estimated_readiness": imp["estimated_readiness"],
            })

    # Deduplicate + sort by gain
    unique_actions = []
    seen_types = set()
    for act in actions:
        if act["type"] not in seen_types:
            seen_types.add(act["type"])
            unique_actions.append(act)
    unique_actions.sort(key=lambda x: -x["gain"])
    ranked_actions = unique_actions[:4]

    # 10. Potential score
    remaining_gains = sum(act["gain"] for act in unique_actions)
    potential_score = 100 if overall_score >= 100 else min(100, overall_score + remaining_gains)
    readiness_gap = potential_score - overall_score

    # 11. Analyzed skills
    user_skills = user.get("skills") or []
    subcat_map = {
        "technical_skills": "Technical Skill", "communication": "Communication",
        "leadership": "Leadership", "interview_prep": "Interview Prep",
        "soft_skills": "Soft Skill", "networking": "Networking",
    }
    analyzed_skills = []
    for sk in user_skills:
        display_category, weight = categorize_skill(sk)
        subcategory = subcat_map.get(display_category, "Skill")
        analyzed_skills.append({
            "skill_name": sk, "subcategory": subcategory,
            "weight": weight, "source": "taxonomy", "confidence": 1.0,
        })

    # 12. Score explanations
    score_explanations = _build_score_explanations(
        scores, weights, tech_score, comm_score, brand_score,
        lead_score, prep_score, industry_score, overall_score,
        match_data["matched_tech"], match_data["matched_comm"],
        match_data["matched_lead"], match_data["matched_prep"],
        match_data["num_projects"], match_data["has_github"],
        match_data["has_resume"], match_data["has_linkedin"],
        match_data["has_portfolio"], match_data["connections"],
        match_data["bookings_count"], match_data["num_certs"],
    )

    # 13. Final recommendation from top action
    if ranked_actions:
        top_act = ranked_actions[0]
        recommendation = {
            "category": top_act["type"], "title": top_act["title"],
            "action": top_act["title"], "description": top_act["reason"],
            "gain": f"+{top_act['gain']}%", "reason": top_act["reason"],
            "impact": top_act["impact_breakdown"],
            "current_readiness": top_act["current_readiness"],
            "estimated_readiness": top_act["estimated_readiness"],
        }

    # 14. Build result
    level = get_readiness_level(overall_score)
    next_level, next_threshold = _get_next_level_info(overall_score)

    _result = {
        "skills": analyzed_skills,
        "readiness_score": {
            "score": overall_score, "level": level,
            "next_level": next_level, "next_threshold": next_threshold,
        },
        "skill_scores": scores,
        "recommendation": recommendation,
        "potential_score": potential_score,
        "readiness_gap": readiness_gap,
        "profile_strength": profile_pct,
        "goal_weights": weights,
        "profile_name": profile_name,
        "ranked_actions": ranked_actions,
        "score_explanations": score_explanations,
    }

    # 15. Inject predictions
    try:
        _predictions = compute_predictions(overall_score, ranked_actions)
        _estimates = estimate_placement_readiness(overall_score, scores, profile_pct)
        _result["predictions"] = _predictions
        _result["readiness_estimates"] = _estimates
    except Exception as e:
        logger.warning(f"Prediction compute failed: {e}")
        _result["predictions"] = {"current": overall_score, "predictions": {}}
        _result["readiness_estimates"] = {}

    # 16. Cache and return
    _store_cache(uid, _result)
    return _result
