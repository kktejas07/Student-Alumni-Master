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
            "thresholds": {"low": 1, "moderate": 5, "high": 12},
            "labels":     {"low": "Beginner", "moderate": "Skilled", "high": "Expert"},
            "icons":      {"low": "BookOpen", "moderate": "GraduationCap", "high": "Award"},
            "hint": "Courses completed",
        },
        "networker": {
            "metric": "connections_count",
            "thresholds": {"low": 1, "moderate": 10, "high": 50},
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
    """Compute all badges (role-tiered + universal) for a single user."""
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
                "tier": tier,
                "label": spec["labels"][tier],
                "icon": spec["icons"][tier],
                "hint": spec.get("hint", ""),
                "role": role_bucket,
                "value": value,
                "earned_at": datetime.now(timezone.utc).isoformat(),
            })
    # Universal badges apply to everyone
    badges.extend(await _compute_universal_badges(db, user))
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
