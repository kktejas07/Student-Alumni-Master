"""
Tier Logic — Computes Bronze/Silver/Gold/Platinum tier for users.
================================================================
Drives personalized suggestions in Student/Mentor/College portals.

Scoring rules:

STUDENT (max 100):
  - Year of study (closer to graduation = higher relevance)        max 25
  - Institution ranking tier (NAAC A++/A+/A/B based on colleges_meta) max 30
  - Tech stack depth (count of skills + recognized stack)          max 25
  - Profile completion (face image, projects, GitHub)              max 20

MENTOR (max 100):
  - Years of experience                                            max 35
  - Organization tier (FAANG/Top Indian Tech/Other)                max 30
  - Sessions completed (volume)                                    max 20
  - Average rating × 3 (clamped to 15)                             max 15

COLLEGE (max 100):
  - NAAC accreditation (A++ = 40, A+ = 32, A = 24, B = 12)        max 40
  - Total students (proxy for size)                                max 20
  - Placement rate                                                 max 25
  - Alumni count                                                   max 15

Tier mapping:
  Score ≥ 80 → Platinum
  Score ≥ 60 → Gold
  Score ≥ 40 → Silver
  Score <  40 → Bronze
"""
from __future__ import annotations
from typing import Any, Dict, Optional

TOP_FAANG = {"Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "OpenAI", "Anthropic"}
TOP_INDIAN_TECH = {"Razorpay", "Flipkart", "Stripe India", "Atlassian", "Adobe", "Zoho", "Cred", "PhonePe", "Swiggy", "Zomato"}

RECOGNIZED_TECH = {
    "python", "javascript", "typescript", "react", "node", "go", "golang", "rust",
    "kubernetes", "docker", "aws", "gcp", "azure", "system design", "ml",
    "machine learning", "deep learning", "data science", "java", "kotlin",
    "swift", "flutter", "android", "ios", "graphql", "postgres", "mongodb",
}


def _tier_for_score(score: float) -> str:
    if score >= 80: return "Platinum"
    if score >= 60: return "Gold"
    if score >= 40: return "Silver"
    return "Bronze"


def _normalize_skill(s: str) -> str:
    return (s or "").lower().strip()


def compute_student_tier(student: Dict[str, Any], college_naac: Optional[str] = None) -> Dict[str, Any]:
    score = 0
    breakdown = {}

    # 1. Year of study
    si = student.get("school_info") or {}
    grad_year = si.get("graduation_year") or 2027
    from datetime import datetime
    yrs_to_grad = max(0, grad_year - datetime.now().year)
    year_pts = max(0, 25 - (yrs_to_grad * 6))  # final year = 25, gap of 4yr = 1
    breakdown["year_of_study"] = year_pts
    score += year_pts

    # 2. Institution ranking (from passed college_naac)
    naac_pts = {"A++": 30, "A+": 25, "A": 18, "B": 10}.get((college_naac or "A").upper(), 12)
    breakdown["institution_ranking"] = naac_pts
    score += naac_pts

    # 3. Tech stack
    skills = student.get("skills") or []
    matched = sum(1 for s in skills if _normalize_skill(s) in RECOGNIZED_TECH)
    tech_pts = min(25, len(skills) * 2 + matched * 3)
    breakdown["tech_stack"] = tech_pts
    score += tech_pts

    # 4. Profile completion
    profile_pts = 0
    if student.get("face_image_base64"): profile_pts += 6
    if student.get("github_url"): profile_pts += 5
    if (student.get("projects") or []): profile_pts += 5
    if student.get("phone"): profile_pts += 2
    if student.get("onboarding_completed"): profile_pts += 2
    profile_pts = min(20, profile_pts)
    breakdown["profile_completion"] = profile_pts
    score += profile_pts

    return {"score": min(100, score), "tier": _tier_for_score(score), "breakdown": breakdown}


def compute_mentor_tier(mentor: Dict[str, Any], sessions: int = 0, avg_rating: float = 0.0) -> Dict[str, Any]:
    mi = mentor.get("mentor_info") or {}
    score = 0
    breakdown = {}

    # 1. Years of experience
    yrs = mi.get("years_of_experience") or 0
    yrs_pts = min(35, int(yrs) * 4)
    breakdown["experience"] = yrs_pts
    score += yrs_pts

    # 2. Organization tier
    org = mi.get("organization") or ""
    org_l = org.lower()
    if any(t.lower() in org_l for t in TOP_FAANG):
        org_pts = 30
    elif any(t.lower() in org_l for t in TOP_INDIAN_TECH):
        org_pts = 22
    elif org:
        org_pts = 14
    else:
        org_pts = 6
    breakdown["organization"] = org_pts
    score += org_pts

    # 3. Sessions
    sess_pts = min(20, sessions // 5)
    breakdown["sessions"] = sess_pts
    score += sess_pts

    # 4. Rating
    rating_pts = min(15, int(avg_rating * 3))
    breakdown["rating"] = rating_pts
    score += rating_pts

    return {"score": min(100, score), "tier": _tier_for_score(score), "breakdown": breakdown}


def compute_college_tier(naac: str, students: int, placement_rate: float, alumni: int) -> Dict[str, Any]:
    score = 0
    breakdown = {}

    naac_pts = {"A++": 40, "A+": 32, "A": 24, "B": 12}.get((naac or "A").upper(), 12)
    breakdown["accreditation"] = naac_pts
    score += naac_pts

    size_pts = min(20, students // 200)
    breakdown["size"] = size_pts
    score += size_pts

    placement_pts = min(25, int(placement_rate * 0.27))  # 94% -> ~25
    breakdown["placement"] = placement_pts
    score += placement_pts

    alumni_pts = min(15, alumni // 600)
    breakdown["alumni_size"] = alumni_pts
    score += alumni_pts

    return {"score": min(100, score), "tier": _tier_for_score(score), "breakdown": breakdown}


# Suggestions driven by tier
def student_suggestions_for_tier(tier: str) -> Dict[str, Any]:
    catalog = {
        "Platinum": {
            "internships": ["FAANG SDE Intern", "OpenAI Research Intern", "Stripe Engineering"],
            "skills": ["System Design at Scale", "Distributed Systems", "Advanced ML Ops"],
            "mentors": ["Top-tier Platinum mentors (FAANG)"],
            "events": ["Invite-only AMA: ex-FAANG eng leaders", "Closed hackathon w/ recruiters"],
        },
        "Gold": {
            "internships": ["Razorpay SDE", "Flipkart PM Intern", "Atlassian Eng"],
            "skills": ["Backend Engineering", "Product Management 101", "Cloud Fundamentals"],
            "mentors": ["Gold mentors at top Indian tech"],
            "events": ["DSA championship", "System design masterclass"],
        },
        "Silver": {
            "internships": ["Local startups", "Junior dev roles", "Marketing intern"],
            "skills": ["Communication", "React basics", "Git fundamentals"],
            "mentors": ["Silver mentors (5-7 yrs exp)"],
            "events": ["Beginner workshops", "Resume review sessions"],
        },
        "Bronze": {
            "internships": ["Open volunteer & student projects", "Build portfolio first"],
            "skills": ["Profile building", "First language (Python)", "Problem solving basics"],
            "mentors": ["Bronze mentors / peer-buddy program"],
            "events": ["Career awareness 101", "How to learn"],
        },
    }
    return catalog.get(tier, catalog["Bronze"])
