"""
badges.py — Multi-role tiered badge engine.

Computes badges from user activity & profile data:
  • 5 roles: student, mentor, alumni (mentor flow), college, company
  • Each role has 4-5 badge categories
  • Each category has 3 tiers: low → moderate → high
  • Universal badges (verified, founder, 2FA, beta) cross all roles

Badges are stored on `users.badges` as a list of:
  { id, category, tier, label, icon, color, earned_at, role, hint }

Recomputed on key events (login, session booked, course completed, etc.) and
optionally via a nightly batch (`compute_all_users_badges`).

Tier colors (matched in frontend BadgeChip):
  low      → slate     #64748B
  moderate → teal      #2DD4BF
  high     → gold      #F59E0B
  verified → emerald   #10B981
  special  → purple    #A78BFA
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta, timezone


# ─── Config: BADGE_RULES ────────────────────────────────────────────────
# Each rule definition: {metric_fn_key, thresholds, labels, icons}
# `metric_fn_key` resolves to a callable in METRIC_RESOLVERS below.
BADGE_RULES: Dict[str, Dict[str, dict]] = {
    "student": {
        "activity": {
            "metric": "logins_30d",
            "thresholds": {"low": 1, "moderate": 8, "high": 20},
            "labels":     {"low": "Newcomer", "moderate": "Regular", "high": "Power User"},
            "icons":      {"low": "Sparkles", "moderate": "Zap", "high": "Flame"},
            "hint": "Logins in the last 30 days",
        },
        "mentor_sessions": {
            "metric": "sessions_count",
            "thresholds": {"low": 1, "moderate": 4, "high": 10},
            "labels":     {"low": "Curious", "moderate": "Dedicated", "high": "Devoted"},
            "icons":      {"low": "Users", "moderate": "UserCheck", "high": "Star"},
            "hint": "Mentor sessions booked",
        },
        "skill_builder": {
            "metric": "courses_completed",
            "thresholds": {"low": 1, "moderate": 4, "high": 10},
            "labels":     {"low": "Beginner", "moderate": "Skilled", "high": "Expert"},
            "icons":      {"low": "BookOpen", "moderate": "GraduationCap", "high": "Award"},
            "hint": "Courses completed",
        },
        "networker": {
            "metric": "connections_count",
            "thresholds": {"low": 1, "moderate": 8, "high": 30},
            "labels":     {"low": "Joiner", "moderate": "Connector", "high": "Influencer"},
            "icons":      {"low": "UserPlus", "moderate": "Network", "high": "Globe2"},
            "hint": "Network connections made",
        },
        "event_attendee": {
            "metric": "events_attended",
            "thresholds": {"low": 1, "moderate": 3, "high": 8},
            "labels":     {"low": "Listener", "moderate": "Participant", "high": "Speaker"},
            "icons":      {"low": "Calendar", "moderate": "MicVocal", "high": "Trophy"},
            "hint": "Events attended",
        },
        "roadmap_progress": {
            "metric": "roadmap_milestones_done",
            "thresholds": {"low": 1, "moderate": 3, "high": 5},
            "labels":     {"low": "Path Starter", "moderate": "On Track", "high": "Career Champion"},
            "icons":      {"low": "Target", "moderate": "Rocket", "high": "Crown"},
            "hint": "12-week career roadmap milestones completed",
        },
        "skill_climber": {
            "metric": "roadmap_skills_high",
            "thresholds": {"low": 1, "moderate": 3, "high": 5},
            "labels":     {"low": "Skill Climber", "moderate": "Skill Pro", "high": "Skill Master"},
            "icons":      {"low": "TrendingUp", "moderate": "Zap", "high": "Sparkles"},
            "hint": "Skills crossed 70% in your AI roadmap",
        },
    },
    "mentor": {
        "experience": {
            "metric": "years_experience",
            "thresholds": {"low": 0, "moderate": 5, "high": 12},
            "labels":     {"low": "Junior", "moderate": "Senior", "high": "Veteran"},
            "icons":      {"low": "Briefcase", "moderate": "Award", "high": "Crown"},
            "hint": "Years of professional experience",
        },
        "sessions_hosted": {
            "metric": "sessions_hosted_count",
            "thresholds": {"low": 1, "moderate": 25, "high": 100},
            "labels":     {"low": "Helper", "moderate": "Coach", "high": "Sage"},
            "icons":      {"low": "HelpingHand", "moderate": "BookOpen", "high": "Sparkles"},
            "hint": "Mentoring sessions delivered",
        },
        "trust_score": {
            "metric": "trust_score",
            "thresholds": {"low": 1.0, "moderate": 4.5, "high": 4.85},
            "labels":     {"low": "New", "moderate": "Trusted", "high": "Acclaimed"},
            "icons":      {"low": "Star", "moderate": "ShieldCheck", "high": "Gem"},
            "hint": "Avg rating weighted by volume",
        },
        "response_time": {
            "metric": "response_time_hrs_inv",  # inverted: lower hrs = higher score
            "thresholds": {"low": 0, "moderate": 0.5, "high": 0.85},
            "labels":     {"low": "Standard", "moderate": "Quick", "high": "Lightning"},
            "icons":      {"low": "Clock", "moderate": "Timer", "high": "Zap"},
            "hint": "Reply speed (faster = higher tier)",
        },
    },
    "college": {
        "alumni_network": {
            "metric": "alumni_count",
            "thresholds": {"low": 1, "moderate": 100, "high": 500},
            "labels":     {"low": "Growing", "moderate": "Established", "high": "Elite"},
            "icons":      {"low": "Users", "moderate": "Building2", "high": "Crown"},
            "hint": "Active alumni in network",
        },
        "engagement": {
            "metric": "events_hosted_year",
            "thresholds": {"low": 1, "moderate": 5, "high": 15},
            "labels":     {"low": "Active", "moderate": "Engaged", "high": "Premier"},
            "icons":      {"low": "Calendar", "moderate": "CalendarCheck", "high": "Trophy"},
            "hint": "Events hosted this year",
        },
        "placement": {
            "metric": "placement_rate",
            "thresholds": {"low": 0, "moderate": 0.7, "high": 0.9},
            "labels":     {"low": "Standard", "moderate": "Strong", "high": "Top Tier"},
            "icons":      {"low": "TrendingUp", "moderate": "Briefcase", "high": "Crown"},
            "hint": "Placement rate",
        },
        "verification": {
            "metric": "verification_level",  # 0/1/2 numeric
            "thresholds": {"low": 0, "moderate": 1, "high": 2},
            "labels":     {"low": "Listed", "moderate": "Verified", "high": "Premium"},
            "icons":      {"low": "Building2", "moderate": "ShieldCheck", "high": "BadgeCheck"},
            "hint": "Document verification level",
        },
    },
    "company": {
        "hiring_activity": {
            "metric": "internships_posted_count",
            "thresholds": {"low": 1, "moderate": 10, "high": 30},
            "labels":     {"low": "Starter", "moderate": "Growing", "high": "Active Hirer"},
            "icons":      {"low": "Briefcase", "moderate": "TrendingUp", "high": "Rocket"},
            "hint": "Internships posted",
        },
        "hire_rate": {
            "metric": "offers_extended_count",
            "thresholds": {"low": 1, "moderate": 5, "high": 25},
            "labels":     {"low": "New", "moderate": "Regular", "high": "Trusted Recruiter"},
            "icons":      {"low": "UserPlus", "moderate": "Users", "high": "ShieldCheck"},
            "hint": "Offers extended",
        },
        "response_speed": {
            "metric": "response_time_hrs_inv",
            "thresholds": {"low": 0, "moderate": 0.5, "high": 0.85},
            "labels":     {"low": "Standard", "moderate": "Quick", "high": "Lightning"},
            "icons":      {"low": "Clock", "moderate": "Timer", "high": "Zap"},
            "hint": "Application response speed",
        },
        "reputation": {
            "metric": "reputation_score",
            "thresholds": {"low": 0, "moderate": 4.0, "high": 4.6},
            "labels":     {"low": "Listed", "moderate": "Verified", "high": "Top Employer"},
            "icons":      {"low": "Building2", "moderate": "Star", "high": "Award"},
            "hint": "Candidate reviews & repeat hires",
        },
    },
}

# ─── Tier visual config (frontend reads these) ──────────────────────────
TIER_THEME = {
    "low":      {"color": "#64748B", "glow": "rgba(100,116,139,0.30)", "rank": 1},
    "moderate": {"color": "#2DD4BF", "glow": "rgba(45,212,191,0.45)", "rank": 2},
    "high":     {"color": "#F59E0B", "glow": "rgba(245,158,11,0.55)", "rank": 3},
    "verified": {"color": "#10B981", "glow": "rgba(16,185,129,0.45)", "rank": 4},
    "special":  {"color": "#A78BFA", "glow": "rgba(167,139,250,0.55)", "rank": 5},
}


# ─── Metric resolvers ───────────────────────────────────────────────────
async def _logins_30d(db, user: dict) -> int:
    cnt = user.get("login_count_30d")
    if cnt is not None:
        return int(cnt)
    # Fallback: rough proxy from last_active vs created_at
    return 1 if user.get("last_active_at") else 0


async def _sessions_count(db, user: dict) -> int:
    try:
        return await db.bookings.count_documents({"student_id": user.get("id")})
    except Exception:
        return int(user.get("sessions_booked", 0))


async def _courses_completed(db, user: dict) -> int:
    return len(user.get("completed_courses", []) or [])


async def _connections_count(db, user: dict) -> int:
    return int(user.get("connections_count", 0))


async def _events_attended(db, user: dict) -> int:
    return len(user.get("events_attended", []) or [])


async def _roadmap_milestones_done(db, user: dict) -> int:
    """Count of completed weekly milestones in /api/ai/career-roadmap."""
    rm = await db.career_roadmaps.find_one({"user_id": str(user.get("_id") or user.get("id"))}) or {}
    done = rm.get("milestones_completed") or user.get("roadmap_milestones_completed") or []
    return len(set(done))


async def _roadmap_skills_high(db, user: dict) -> int:
    """Count of skill_scores entries that are >= 70 in the user's roadmap."""
    rm = await db.career_roadmaps.find_one({"user_id": str(user.get("_id") or user.get("id"))}) or {}
    ss = rm.get("skill_scores") or {}
    return sum(1 for v in ss.values() if isinstance(v, (int, float)) and float(v) >= 70)


async def _years_experience(db, user: dict) -> int:
    mp = user.get("mentor_profile") or {}
    return int(mp.get("years_of_experience") or 0)


async def _sessions_hosted(db, user: dict) -> int:
    try:
        return await db.bookings.count_documents({"mentor_id": user.get("id")})
    except Exception:
        return int((user.get("mentor_profile") or {}).get("sessions", 0))


async def _trust_score(db, user: dict) -> float:
    mp = user.get("mentor_profile") or {}
    rating = float(mp.get("rating") or 0)
    sessions = int(mp.get("sessions") or 0)
    # weighted: rating × log(sessions+1) — caps at rating ~5 with enough volume
    import math
    weighted = rating * (1 - 1 / math.log(sessions + 2.71828, 2.71828) if sessions > 0 else 0)
    return float(weighted)


async def _response_time_hrs_inv(db, user: dict) -> float:
    """Inverted score: faster reply → higher value (0..1)."""
    hrs = (user.get("avg_response_hours") or
           (user.get("mentor_profile") or {}).get("avg_response_hours") or 24)
    # piecewise: ≤1hr=1.0, ≤4hr=0.85, ≤12hr=0.65, ≤24=0.4, >24=0.1
    if hrs <= 1: return 1.0
    if hrs <= 4: return 0.85
    if hrs <= 12: return 0.65
    if hrs <= 24: return 0.4
    return 0.1


async def _alumni_count(db, user: dict) -> int:
    cp = user.get("college_profile") or {}
    return int(cp.get("alumni_count") or 0)


async def _events_hosted_year(db, user: dict) -> int:
    return int(user.get("events_hosted_year", 0))


async def _placement_rate(db, user: dict) -> float:
    cp = user.get("college_profile") or {}
    return float(cp.get("placement_rate") or 0)


async def _verification_level(db, user: dict) -> int:
    """0 = listed, 1 = verified docs, 2 = premium / manual review."""
    if user.get("premium_verified"):
        return 2
    if user.get("docs_verified"):
        return 1
    return 0


async def _internships_posted_count(db, user: dict) -> int:
    try:
        return await db.internships.count_documents({"company_id": user.get("id")})
    except Exception:
        return int(user.get("internships_posted_count", 0))


async def _offers_extended_count(db, user: dict) -> int:
    return int(user.get("offers_extended", 0))


async def _reputation_score(db, user: dict) -> float:
    return float(user.get("reputation_score") or 0)


METRIC_RESOLVERS = {
    "logins_30d":               _logins_30d,
    "sessions_count":           _sessions_count,
    "courses_completed":        _courses_completed,
    "connections_count":        _connections_count,
    "events_attended":          _events_attended,
    "roadmap_milestones_done":  _roadmap_milestones_done,
    "roadmap_skills_high":      _roadmap_skills_high,
    "years_experience":         _years_experience,
    "sessions_hosted_count":    _sessions_hosted,
    "trust_score":              _trust_score,
    "response_time_hrs_inv":    _response_time_hrs_inv,
    "alumni_count":             _alumni_count,
    "events_hosted_year":       _events_hosted_year,
    "placement_rate":           _placement_rate,
    "verification_level":       _verification_level,
    "internships_posted_count": _internships_posted_count,
    "offers_extended_count":    _offers_extended_count,
    "reputation_score":         _reputation_score,
}


def _tier_for_value(value: float, thresholds: Dict[str, float]) -> Optional[str]:
    """Return 'high' | 'moderate' | 'low' | None (below low threshold)."""
    if value >= thresholds["high"]:
        return "high"
    if value >= thresholds["moderate"]:
        return "moderate"
    if value >= thresholds["low"]:
        return "low"
    return None


def _badge_role_for_user(user: dict) -> Optional[str]:
    """Map a user's role to which BADGE_RULES bucket applies."""
    role = (user.get("role") or "").lower()
    if role in BADGE_RULES:
        return role
    if role == "alumni":
        return "mentor" if (user.get("alumni_info") or {}).get("wants_to_mentor") else None
    return None


# ─── Credential rules (Option B — second badge stack) ───────────────────
# These reflect qualifications/credentials rather than activity.
_DEGREE_LEVEL = {
    # rank 1 = lowest, 4 = highest
    "10th":         {"rank": 1, "tier": "low",      "label": "Class 10",         "icon": "GraduationCap"},
    "12th":         {"rank": 1, "tier": "low",      "label": "Class 12",         "icon": "GraduationCap"},
    "plus_one":     {"rank": 1, "tier": "low",      "label": "Class 11",         "icon": "GraduationCap"},
    "plus_two":     {"rank": 1, "tier": "low",      "label": "Class 12",         "icon": "GraduationCap"},
    "diploma":      {"rank": 2, "tier": "low",      "label": "Diploma Holder",   "icon": "GraduationCap"},
    "bachelors":    {"rank": 2, "tier": "moderate", "label": "Bachelor's Degree", "icon": "Award"},
    "btech":        {"rank": 2, "tier": "moderate", "label": "B.Tech / Bachelor's", "icon": "Award"},
    "masters":      {"rank": 3, "tier": "high",     "label": "Master's Degree",  "icon": "Trophy"},
    "phd":          {"rank": 4, "tier": "special",  "label": "Doctorate",        "icon": "Crown"},
}

# Tier 1 = elite institutions, Tier 2 = top regional, Tier 3 = standard.
# Matched by case-insensitive substring on institution_name.
_TIER1_KEYWORDS = [
    "iit ", "indian institute of technology",
    "iim ", "indian institute of management",
    "aiims", "iisc", "isb hyderabad", "indian school of business",
    "stanford", "harvard", "mit", "massachusetts institute",
    "oxford", "cambridge", "yale", "princeton", "berkeley",
    "imperial college", "eth zurich", "carnegie mellon", "caltech",
]
_TIER2_KEYWORDS = [
    "nit ", "national institute of technology",
    "iiit", "international institute of information",
    "bits ", "birla institute",
    "vit ", "vellore institute",
    "manipal", "srm ", "amity", "thapar", "pec ",
    "delhi university", "jnu", "anna university", "jadavpur",
]


def _classify_institution(name: str) -> Optional[dict]:
    """Return tier metadata for the institution, or None if no match."""
    if not name:
        return None
    n = name.lower()
    for kw in _TIER1_KEYWORDS:
        if kw in n:
            return {"tier": "high", "label": "Tier-1 Institute", "icon": "Crown",
                    "hint": "Top-tier institution (IIT/IIM/Ivy/etc.)"}
    for kw in _TIER2_KEYWORDS:
        if kw in n:
            return {"tier": "moderate", "label": "Tier-2 Institute", "icon": "Trophy",
                    "hint": "Premier regional institution (NIT/BITS/VIT/etc.)"}
    # Default: every authenticated student/alumni gets tier-3 visibility
    return {"tier": "low", "label": "Tier-3 Institute", "icon": "GraduationCap",
            "hint": "Recognized institution"}


def _certificates_tier(count: int) -> Optional[dict]:
    """1+ → low, 3+ → moderate, 7+ → high. None if 0."""
    if count >= 7:
        return {"tier": "high",     "label": f"{count} Certificates",  "icon": "Award"}
    if count >= 3:
        return {"tier": "moderate", "label": f"{count} Certificates",  "icon": "Award"}
    if count >= 1:
        return {"tier": "low",      "label": f"{count} Certificate" + ("s" if count > 1 else ""), "icon": "Award"}
    return None


def _years_experience_tier(years: int) -> Optional[dict]:
    """0 → none, 1-4 → low, 5-11 → moderate, 12+ → high."""
    if years >= 12:
        return {"tier": "high",     "label": f"{years}+ yrs Experience", "icon": "Briefcase"}
    if years >= 5:
        return {"tier": "moderate", "label": f"{years} yrs Experience",  "icon": "Briefcase"}
    if years >= 1:
        return {"tier": "low",      "label": f"{years} yr" + ("s" if years > 1 else "") + " Experience",
                "icon": "Briefcase"}
    return None


async def _compute_credential_badges(db, user: dict) -> List[dict]:
    """
    Credential-based badges (Option B second stack).
    All badges in this list carry kind='credential'.
    """
    out: List[dict] = []
    role = (user.get("role") or "").lower()
    si = user.get("school_info") or {}
    ai = user.get("alumni_info") or {}
    mp = user.get("mentor_profile") or {}
    cp = user.get("college_profile") or {}

    # 1. Degree level — for student / alumni
    edu_level_raw = (
        si.get("education_level") or user.get("education_level")
        or si.get("class_or_year") or si.get("current_course") or ""
    )
    edu_level = str(edu_level_raw).lower().strip()
    # Friendly mapping from onboarding labels → keys
    if "11" in edu_level or "plus one" in edu_level: edu_level = "plus_one"
    elif "12" in edu_level or "plus two" in edu_level: edu_level = "plus_two"
    elif "10" in edu_level: edu_level = "10th"
    elif "diploma" in edu_level: edu_level = "diploma"
    elif "phd" in edu_level or "doctor" in edu_level: edu_level = "phd"
    elif "master" in edu_level or "m.tech" in edu_level or "mtech" in edu_level or "mba" in edu_level or "m.sc" in edu_level: edu_level = "masters"
    elif "bachelor" in edu_level or "b.tech" in edu_level or "btech" in edu_level or "bsc" in edu_level or "b.sc" in edu_level or "bba" in edu_level or "ba " in edu_level or "b.com" in edu_level: edu_level = "bachelors"
    if edu_level in _DEGREE_LEVEL:
        d = _DEGREE_LEVEL[edu_level]
        out.append({
            "id": "cred_degree", "category": "degree", "kind": "credential",
            "tier": d["tier"], "label": d["label"], "icon": d["icon"],
            "hint": "Highest qualification on file",
        })

    # 2. Institution tier — auto-classify from name
    institution = (
        si.get("institution_name")
        or (cp.get("institution_name") if role == "college" else None)
        or (ai.get("institution_name") if role == "alumni" else None)
        or (user.get("full_name") if role == "college" else None)
    )
    inst = _classify_institution(institution or "")
    if inst:
        out.append({
            "id": "cred_institution", "category": "institution", "kind": "credential",
            "tier": inst["tier"], "label": inst["label"], "icon": inst["icon"],
            "hint": inst["hint"],
            "value": institution,
        })

    # 3. Certificate count — for any role
    certs = user.get("certificates") or []
    ct = _certificates_tier(len(certs))
    if ct:
        out.append({
            "id": "cred_certificates", "category": "certificates", "kind": "credential",
            "tier": ct["tier"], "label": ct["label"], "icon": ct["icon"],
            "hint": "Verified certifications added",
            "value": len(certs),
        })

    # 4. Years of experience — for mentor / alumni
    yoe = mp.get("years_of_experience") or ai.get("years_of_experience")
    if yoe is None and role == "alumni":
        # Estimate from graduation_year
        gy = ai.get("graduation_year") or si.get("graduation_year")
        if gy:
            try:
                yoe = max(0, datetime.now(timezone.utc).year - int(gy))
            except Exception:
                yoe = None
    if yoe is not None:
        et = _years_experience_tier(int(yoe))
        if et:
            out.append({
                "id": "cred_experience", "category": "experience", "kind": "credential",
                "tier": et["tier"], "label": et["label"], "icon": et["icon"],
                "hint": "Years of professional experience",
                "value": int(yoe),
            })

    return out


# ─── Universal badges (cross-role) ──────────────────────────────────────
async def _compute_universal_badges(db, user: dict) -> List[dict]:
    out: List[dict] = []
    if user.get("email_verified"):
        out.append({
            "id": "email_verified", "category": "verification", "tier": "verified",
            "label": "Email Verified", "icon": "MailCheck", "hint": "Email address confirmed",
        })
    if user.get("phone_verified"):
        out.append({
            "id": "phone_verified", "category": "verification", "tier": "verified",
            "label": "Phone Verified", "icon": "Phone", "hint": "Phone number confirmed",
        })
    if user.get("two_fa_enabled"):
        out.append({
            "id": "two_fa", "category": "security", "tier": "verified",
            "label": "2FA Enabled", "icon": "ShieldCheck", "hint": "Two-factor authentication active",
        })
    if user.get("linkedin_url") or (user.get("alumni_info") or {}).get("linkedin_url") \
       or (user.get("mentor_profile") or {}).get("linkedin_url"):
        out.append({
            "id": "linkedin_linked", "category": "verification", "tier": "verified",
            "label": "LinkedIn Linked", "icon": "Linkedin", "hint": "LinkedIn profile connected",
        })
    if user.get("face_verified") or user.get("face_image_base64"):
        out.append({
            "id": "face_verified", "category": "verification", "tier": "verified",
            "label": "Face Verified", "icon": "ScanFace", "hint": "Face capture completed",
        })
    if user.get("is_founder_member"):
        out.append({
            "id": "founder_member", "category": "special", "tier": "special",
            "label": "Founder Member", "icon": "Rocket", "hint": "One of our first 1,000 users",
        })
    if user.get("is_beta_tester"):
        out.append({
            "id": "beta_tester", "category": "special", "tier": "special",
            "label": "Beta Tester", "icon": "FlaskConical", "hint": "Helping us shape the platform",
        })
    if user.get("is_top_1pct"):
        out.append({
            "id": "top_1pct", "category": "special", "tier": "special",
            "label": "Top 1%", "icon": "Crown", "hint": "Top 1% in your role this month",
        })
    return out


# ─── Public API ─────────────────────────────────────────────────────────
async def compute_badges(db, user: dict) -> List[dict]:
    """Compute all badges (engagement + credentials + universal)."""
    badges: List[dict] = []
    role_bucket = _badge_role_for_user(user)
    if role_bucket:
        rules = BADGE_RULES.get(role_bucket, {})
        for cat, spec in rules.items():
            metric_fn = METRIC_RESOLVERS.get(spec["metric"])
            if not metric_fn:
                continue
            try:
                value = await metric_fn(db, user)
            except Exception:
                continue
            tier = _tier_for_value(float(value), spec["thresholds"])
            if not tier:
                continue
            badges.append({
                "id": f"{role_bucket}_{cat}",
                "category": cat,
                "kind": "engagement",
                "tier": tier,
                "label": spec["labels"][tier],
                "icon": spec["icons"][tier],
                "hint": spec.get("hint", ""),
                "role": role_bucket,
                "value": value,
                "earned_at": datetime.now(timezone.utc).isoformat(),
            })
    # Credentials (Option B — second stack)
    try:
        cred = await _compute_credential_badges(db, user)
        for c in cred:
            c.setdefault("earned_at", datetime.now(timezone.utc).isoformat())
        badges.extend(cred)
    except Exception:
        pass
    # Universal badges apply to everyone (kind=verification|special)
    universal = await _compute_universal_badges(db, user)
    for u in universal:
        u.setdefault("kind", "verification" if u.get("tier") == "verified" else "special")
    badges.extend(universal)
    return badges


async def refresh_user_badges(db, user_id: str) -> List[dict]:
    """Recompute badges for a user and persist on the users document."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return []
    badges = await compute_badges(db, user)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"badges": badges, "badges_updated_at": datetime.now(timezone.utc)}},
    )
    return badges


async def compute_all_users_badges(db) -> int:
    """Nightly batch — recompute for every user. Returns count processed."""
    count = 0
    async for u in db.users.find({}, {"id": 1, "role": 1}):
        await refresh_user_badges(db, u["id"])
        count += 1
    return count


def get_tier_theme() -> Dict[str, Any]:
    """Public helper for frontend theme handshake."""
    return TIER_THEME
