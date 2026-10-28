import logging
from datetime import datetime, timezone

from services.career_ai.skill_intelligence_service import _ALL_STANDARD_MILESTONES

logger = logging.getLogger(__name__)

_ROADMAP_CACHE_TTL_DAYS = 7


def roadmap_is_stale(existing: dict, user: dict) -> bool:
    """Return True if the cached roadmap should be regenerated."""
    gen_at = existing.get("generated_at")
    if gen_at:
        try:
            gen_dt = datetime.fromisoformat(str(gen_at).replace("Z", "+00:00"))
            age_days = (datetime.now(timezone.utc) - gen_dt).days
            if age_days >= _ROADMAP_CACHE_TTL_DAYS:
                return True
        except Exception:
            pass
    cached_goal = existing.get("_career_goal_snapshot")
    si = user.get("student_info") or {}
    current_goal = si.get("career_goal") or user.get("career_goal") or ""
    if cached_goal is not None and cached_goal != current_goal:
        return True
    return False


def enhance_roadmap_milestones(user, milestones, goal_name, prev_roadmap=None):
    """Enhance uncompleted roadmap milestones with context-aware, goal-directed, progressive difficulty."""
    goal_lower = str(goal_name or "").lower()
    projects = user.get("projects") or []
    skills = user.get("skills") or []
    num_projects = len(projects)
    num_skills = len(skills)

    prev_completed = {}
    if prev_roadmap and prev_roadmap.get("milestones"):
        for pm in prev_roadmap.get("milestones", []):
            if pm.get("completed"):
                prev_completed[pm.get("milestone_type")] = pm

    enhanced = []
    seen_types = set()
    for m in milestones:
        m_copy = dict(m)
        m_type = str(m_copy.get("milestone_type") or "").upper()
        if m_type in seen_types:
            continue
        seen_types.add(m_type)

        if m_type in prev_completed:
            enhanced.append(dict(prev_completed[m_type]))
            continue

        if m_copy.get("completed"):
            enhanced.append(m_copy)
            continue

        if m_type == "PROJECT":
            if num_projects >= 1:
                m_copy["title"] = "Build Advanced System Design / Capstone Project"
                m_copy["description"] = f"Deploy a production-ready application showcasing scalability and architecture for {goal_name} roles."
            elif any(k in goal_lower for k in ("ai", "ml", "data", "python")):
                m_copy["title"] = "Train a Machine Learning Model / Kaggle Project"
                m_copy["description"] = "Build and evaluate a predictive model using Python, PyTorch, or Scikit-Learn."
            elif any(k in goal_lower for k in ("cyber", "security", "network")):
                m_copy["title"] = "Build a Network Security / Vulnerability Assessment Lab"
                m_copy["description"] = "Set up a virtual lab or complete CTF challenges to demonstrate practical penetration testing."
            elif any(k in goal_lower for k in ("product", "manager", "pm", "business")):
                m_copy["title"] = "Create a Product Case Study & Growth Dashboard"
                m_copy["description"] = "Analyze user metrics, build a wireframe prototype, and publish a comprehensive product teardown."
        elif m_type == "SKILLS":
            if num_skills >= 3:
                m_copy["title"] = "Master Domain Architecture & Core CS Skills (6+ Skills)"
                m_copy["description"] = f"Expand your technical stack with advanced tools and frameworks required for top tier {goal_name} roles."
            elif any(k in goal_lower for k in ("ai", "ml", "data")):
                m_copy["title"] = "Master Python, PyTorch & Data Engineering Skills"
                m_copy["description"] = "Add at least 3 domain-specific AI/ML and data manipulation skills."
            elif any(k in goal_lower for k in ("cyber", "security")):
                m_copy["title"] = "Master Linux Security, Networking & Cryptography"
                m_copy["description"] = "Add core information security, firewall configuration, and scripting skills."
            elif any(k in goal_lower for k in ("product", "manager", "pm")):
                m_copy["title"] = "Master Product Analytics, Agile & User Research Skills"
                m_copy["description"] = "Add core product roadmapping, data analytics, and leadership skills."
        elif m_type == "CERTIFICATION":
            if any(k in goal_lower for k in ("ai", "ml", "data")):
                m_copy["title"] = "Earn Deep Learning / Data Science Certification"
                m_copy["description"] = "Obtain an industry recognized credential from AWS, Coursera, or DeepLearning.AI."
            elif any(k in goal_lower for k in ("cyber", "security")):
                m_copy["title"] = "Earn CompTIA Security+ / CEH Certification"
                m_copy["description"] = "Validate your practical security skills with a recognized industry certification."
            elif any(k in goal_lower for k in ("cloud", "devops", "aws")):
                m_copy["title"] = "Earn AWS / Cloud Solutions Architect Certification"
                m_copy["description"] = "Demonstrate cloud infrastructure mastery with an official cloud provider certification."
        elif m_type == "NETWORKING":
            if int(user.get("connections_made") or 0) >= 1:
                m_copy["title"] = "Build an Industry Network (5+ Alumni Connections)"
                m_copy["description"] = f"Expand your reach by connecting with senior alumni working in {goal_name} roles."
        elif m_type == "MOCK_INTERVIEW":
            if int(user.get("bookings_count") or 0) >= 1:
                m_copy["title"] = "Complete Advanced System / Technical Mock Interviews"
                m_copy["description"] = "Schedule a rigorous technical interview practice session with an industry mentor."

        enhanced.append(m_copy)
    return enhanced


async def get_roadmap_summary(uid: str, db) -> dict | None:
    """Fetch and summarise the cached career roadmap for a user (no LLM trigger)."""
    try:
        existing = await db.career_roadmaps.find_one({"user_id": uid})
        if not existing:
            return None
        milestones = existing.get("milestones") or []
        completed = [m for m in milestones if m.get("completed")]
        progress_pct = round(len(completed) / len(milestones) * 100) if milestones else 0
        pending = [m for m in milestones if not m.get("completed")]
        next_milestone = pending[0] if pending else None
        return {
            "target_role": existing.get("target_role", ""),
            "target_company_type": existing.get("target_company_type", ""),
            "progress_pct": progress_pct,
            "milestones_total": len(milestones),
            "milestones_completed": len(completed),
            "next_milestone": {
                "title": next_milestone.get("title", ""),
                "milestone_type": next_milestone.get("milestone_type", ""),
                "description": next_milestone.get("description", ""),
            } if next_milestone else None,
        }
    except Exception:
        return None
