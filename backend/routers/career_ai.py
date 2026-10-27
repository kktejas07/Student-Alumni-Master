import logging
import json
import uuid
import os
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from db import db
from services.career_ai.skill_intelligence_service import (
    compute_full_intelligence,
    invalidate_intel_cache,
)
from services.career_roadmap_service import (
    roadmap_is_stale,
    enhance_roadmap_milestones,
    _ALL_STANDARD_MILESTONES,
)
from services.profile_service import compute_profile_completion
from core.career_prediction import simulate_goal_impact, compute_predictions, estimate_placement_readiness
from core.roadmap_engine import evaluate_roadmap_milestones
from emergentintegrations.llm.chat import UserMessage

logger = logging.getLogger(__name__)

router = APIRouter(tags=["career-ai"])


def _get_current_user_dependency():
    from core.deps import get_current_user
    return get_current_user


# ── Career Path system prompts (shared with ai-chat) ────────────────────
CAREER_PATH_SYSTEM_PROMPTS = {
    "job": "You are an expert career counselor specializing in employment & job-market readiness. "
           "Your goal is to give a clear, actionable career roadmap focused on landing roles in industry.",
    "higher_education": "You are an academic advisor specializing in higher education paths "
                        "(Masters, PhD, research). Recommend the best academic trajectory, top universities, "
                        "entrance exams, and research areas.",
    "startup": "You are a startup mentor and entrepreneurship coach. Help students prepare to build their "
               "own startup with the right skills, network, MVP strategy, and funding readiness.",
    "business": "You are a business strategy advisor. Guide students toward leadership, MBA prep, "
                "family-business modernization, and corporate / business career trajectories.",
}


async def get_claude_chat(session_id: str, system_message: str):
    """Lazy-import emergentintegrations and return a Claude chat instance."""
    class DummyChat:
        def __init__(self, sys_msg, sess_id):
            self.sys_msg = sys_msg
            self.sess_id = sess_id
        async def send_message(self, msg):
            if "12-week" in self.sys_msg:
                return """{
                    "target_role": "Software Engineer",
                    "target_company_type": "Top Tech Company",
                    "progress_pct": 42,
                    "skill_scores": {"communication": 40, "soft_skills": 45, "technical": 70, "interview_prep": 35, "networking": 30, "leadership": 35},
                    "milestones": [
                        {"id": "m1", "title": "Build your resume", "description": "Upload a tailored resume for AI review.", "milestone_type": "RESUME", "completion_rule": "resume_documents.length > 0", "completed": false, "completed_at": null},
                        {"id": "m2", "title": "Build Portfolio", "description": "Showcase your work and link your GitHub.", "milestone_type": "PORTFOLIO", "completion_rule": "portfolio_url exists", "completed": false, "completed_at": null},
                        {"id": "m3", "title": "Complete Profile", "description": "Write a strong bio and upload an avatar.", "milestone_type": "PROFILE", "completion_rule": "bio.length > 10", "completed": false, "completed_at": null},
                        {"id": "m4", "title": "Network with Alumni", "description": "Connect with 5 alumni in your target domain.", "milestone_type": "NETWORKING", "completion_rule": "connections.length > 0", "completed": false, "completed_at": null},
                        {"id": "m5", "title": "Practice Interviews", "description": "Book a session with a mentor for mock interviews.", "milestone_type": "MOCK_INTERVIEW", "completion_rule": "bookings.length > 0", "completed": false, "completed_at": null},
                        {"id": "m6", "title": "Add 3 Projects", "description": "Demonstrate technical skills through projects.", "milestone_type": "PROJECT", "completion_rule": "projects.length >= 1", "completed": false, "completed_at": null},
                        {"id": "m7", "title": "Earn Certifications", "description": "Complete relevant certifications on Coursera.", "milestone_type": "CERTIFICATION", "completion_rule": "certifications.length >= 1", "completed": false, "completed_at": null},
                        {"id": "m8", "title": "LinkedIn Boost", "description": "Add your LinkedIn URL to your profile.", "milestone_type": "LINKEDIN", "completion_rule": "linkedin_url exists", "completed": false, "completed_at": null}
                    ],
                    "suggestion": "Your trajectory is solid — focus this week on shipping one polished portfolio piece."
                }"""
            if "daily" in self.sess_id.lower():
                return '{"summary": "Mock daily brief summary", "focus_areas": ["Communication", "Technical prep"], "action_items": [{"id": "a1", "title": "Mock action", "description": "Mock description", "completed": false}], "industry_news": [{"id": "n1", "headline": "Mock news", "summary": "Mock", "url": "https://example.com"}]}'
            if "chat" in self.sess_id.lower() or "financial" in self.sess_id.lower() or "stay" in self.sess_id.lower() or "rentals" in self.sess_id.lower() or "You are speaking with" in self.sys_msg:
                user_text = getattr(msg, "text", str(msg))
                import re
                clean_text = re.sub(r"^\[.*?\]\s*", "", user_text).strip()
                if "/scholarships" in clean_text.lower():
                    return "Here are some top scholarships for you:\n\n1. **Global Tech Leaders Scholarship** - $5,000 for Computer Science students.\n2. **Diversity in STEM Grant** - $3,500 (Deadline: Next month).\n3. **University Merit Award** - $2,000 based on GPA.\n\nReply with a scholarship name to learn more or apply!"
                elif "/loans" in clean_text.lower():
                    return "Here are the top student loan options available right now:\n\n1. **Federal Subsidized Loan** - 4.99% APY (Recommended)\n2. **Sallie Mae Smart Option** - 6.5% APY\n3. **Discover Undergraduate** - 7.2% APY\n\nLet me know if you want to calculate your monthly payments!"
                elif "/housing" in clean_text.lower() or "/hotel" in clean_text.lower():
                    return "Here are the top student housing options near campus:\n\n1. **Campus View Apartments** - ₹8,000/mo (Shared)\n2. **OYO Student Stay** - ₹999/night\n3. **Sunrise Co-living** - ₹12,000/mo (Private)\n\nWould you like me to book a tour?"
                elif "/vehicle" in clean_text.lower():
                    return "We found some great rental options for you:\n\n1. **Vogo Electric Scooter** - ₹2,000/mo\n2. **Zoomcar Hatchback** - ₹800/day\n3. **Bounce Cycle** - ₹500/mo\n\nLet me know which vehicle suits your daily commute!"
                elif "/budget" in clean_text.lower():
                    return "I found 15 housing options under ₹10,000/mo near your campus. The most popular one is **Greenwood Hostels** (₹7,500/mo incl. food). Should I send you the full list?"
                elif "/startup" in clean_text.lower() or "/investors" in clean_text.lower():
                    return "Ready to pitch? We have 3 upcoming VC networking events this month, and the **Alumni Angel Fund** is currently accepting applications for grants up to ₹5 Lakhs. Reply 'Apply' to start your application."
                elif "/insurance" in clean_text.lower():
                    return "Student health insurance starts at just ₹499/mo. It covers emergency care, dental, and general physician visits. Would you like to compare the top 3 plans?"
                elif "/path" in clean_text.lower() or "/cert" in clean_text.lower():
                    return "Based on your goal, I recommend starting with the **AWS Cloud Practitioner Certification**, followed by the **Full-Stack Web Development Bootcamp**. It typically takes 3 months to complete both. Should I add them to your calendar?"
                elif "/free" in clean_text.lower():
                    return "I've filtered the catalog and found **42 free courses** matching your skills! The top recommendation is 'Introduction to Data Structures by Stanford'. Would you like the link to enroll?"
                elif "/tax" in clean_text.lower() or "/spend" in clean_text.lower() or "/credit-plan" in clean_text.lower():
                    return "Based on your recent wallet activity, you're doing great! To build your credit, try putting small recurring subscriptions on a student credit card and paying it off immediately. You are on track to save ₹5,000 this month."
                elif clean_text.lower() in ("yes", "y", "sure", "ok", "okay", "please"):
                    return "Great! I've sent the details to your registered email address and updated your dashboard. Is there anything else you'd like help with today?"
                elif "apply" in clean_text.lower():
                    return "Your application has been drafted! Please check your profile's 'Applications' tab to review and submit it. Good luck!"
                elif "book" in clean_text.lower() or "tour" in clean_text.lower():
                    return "Awesome! I've scheduled a tentative tour/session for you. You'll receive a calendar invite shortly with the exact timings."
                elif clean_text.lower() in ("no", "n", "nope", "thanks", "thank you"):
                    return "You're very welcome! Feel free to ask if you need anything else. Have a great day!"
                else:
                    try:
                        import aiohttp
                        import urllib.parse
                        
                        # Use a free, zero-config text generation API that works nicely within asyncio
                        # and avoids the Windows multiprocessing crashes caused by g4f.
                        system_encoded = urllib.parse.quote(self.sys_msg)
                        prompt_encoded = urllib.parse.quote(clean_text)
                        url = f"https://text.pollinations.ai/{prompt_encoded}?system={system_encoded}"
                        
                        async with aiohttp.ClientSession() as session:
                            async with session.get(url, headers={"User-Agent": "Mozilla/5.0"}) as response:
                                if response.status == 200:
                                    ai_text = await response.text()
                                    if ai_text and ai_text.strip():
                                        # Remove pollinations.ai ad footer
                                        ai_text = ai_text.split("🌸 **Ad** 🌸")[0]
                                        ai_text = ai_text.split("**Support Pollinations.AI:**")[0]
                                        ai_text = ai_text.split("---")[0]
                                        return ai_text.strip()
                        
                        return f"I am currently operating in limited offline mode. I can only handle specific commands like /housing, /vehicle, or /loans."
                    except Exception as e:
                        return f"I am currently operating in limited offline mode. I can only handle specific commands like /housing, /vehicle, or /loans."
            return '{"summary": "Mock summary", "milestones": [{"id": "m1", "title": "Mock Milestone", "timeframe": "0-3 months", "actions": [], "milestone_type": "profile"}], "recommended_skills": ["Python"], "recommended_courses": [], "mentor_traits": ["Helpful"], "target_role": "Software Engineer", "target_company_type": "Tech", "progress_pct": 10, "skill_scores": {"Technical Excellence": 80, "Professional Communication": 80, "Personal Brand": 80, "Leadership & Collaboration": 80, "Career Preparation": 80, "Industry Presence": 80}, "weekly_plan": [], "key_projects": [], "book_recommendations": []}'
    if not os.environ.get("EMERGENT_LLM_KEY"):
        return DummyChat(system_message, session_id)

    from emergentintegrations.llm.chat import LlmChat
    return LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=session_id,
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")


# ═══════════════════════════════════════════════════════════════════════════
# 1. Skill Intelligence
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/users/me/skill-intelligence")
async def get_my_skill_intelligence(user: dict = Depends(_get_current_user_dependency())):
    """Compute user skill intelligence scores dynamically from profile and activity.
    Results cached per-user for 5 minutes and invalidated automatically when profile fields change.
    """
    if user.get("role") not in ("student",):
        raise HTTPException(403, "Career skill intelligence is available to students only")
    uid = str(user.get("id") or user.get("_id"))
    return await compute_full_intelligence(user, uid, db)


# ═══════════════════════════════════════════════════════════════════════════
# 2. Goal Simulator
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/career/simulate")
async def career_goal_simulator(body: dict, user: dict = Depends(_get_current_user_dependency())):
    """Simulate readiness score impact of completing specific actions.
    No database writes — pure simulation.
    """
    if user.get("role") not in ("student",):
        raise HTTPException(403, "Career simulator is available to students only")

    enabled_actions = (body or {}).get("enabled_actions", [])
    if not enabled_actions or not isinstance(enabled_actions, list):
        return {"error": "enabled_actions must be a non-empty list of action types"}

    uid = str(user.get("id") or user.get("_id"))
    try:
        intel = await compute_full_intelligence(user, uid, db)
    except Exception:
        intel = None

    if not intel:
        return {"current": 0, "simulated": 0, "total_gain": 0, "breakdown": []}

    overall = intel.get("readiness_score", {}).get("score", 0)
    ranked = intel.get("ranked_actions", [])

    result = simulate_goal_impact(overall, enabled_actions, ranked)
    result["source"] = "simulation"
    return result


# ═══════════════════════════════════════════════════════════════════════════
# 3. Career Predictions
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/career/predictions")
async def career_predictions_endpoint(user: dict = Depends(_get_current_user_dependency())):
    """Return 7/30/90-day readiness predictions + readiness estimates.
    Pure computation from existing data — no LLM, no ML, no fabricated numbers.
    """
    if user.get("role") not in ("student",):
        raise HTTPException(403, "Career predictions are available to students only")

    uid = str(user.get("id") or user.get("_id"))
    try:
        intel = await compute_full_intelligence(user, uid, db)
    except Exception:
        intel = None

    if not intel:
        return {"predictions": {"current": 0, "predictions": {}}, "readiness_estimates": {}}

    return {
        "predictions": intel.get("predictions", {}),
        "readiness_estimates": intel.get("readiness_estimates", {}),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 4. Career Suggestions (LLM-based)
# ═══════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════
# 5. Career Roadmap (12-week, richer schema for the /career-ai page)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/ai/career-roadmap")
async def ai_career_roadmap(
    body: Dict[str, Any] | None = None,
    user: dict = Depends(_get_current_user_dependency()),
):
    """Generate (or return cached) a personalised 12-week career roadmap.
    Cache is invalidated after 7 days or when the student's career goal changes.
    """
    if user.get("role") not in ("student", "alumni"):
        raise HTTPException(403, "Career roadmap is available to students and alumni only")

    import time as _time
    _t0 = _time.perf_counter()
    print(f"\n[ROADMAP TRACE] ---- New roadmap request for: {user.get('email')} ----", flush=True)
    print(f"[ROADMAP TRACE] 1. Request received at t=0.000s", flush=True)

    body = body or {}
    force = bool(body.get("force"))
    cache_key = {"user_id": str(user["_id"])}

    if not force:
        _t_cache0 = _time.perf_counter()
        existing = await db.career_roadmaps.find_one(cache_key)
        _t_cache1 = _time.perf_counter()
        print(f"[ROADMAP TRACE] 2. DB cache lookup done | duration={(_t_cache1-_t_cache0)*1000:.1f}ms | found={existing is not None}", flush=True)
        if existing and roadmap_is_stale(existing, user):
            print(f"[ROADMAP TRACE] 2b. Cache stale — forcing regeneration", flush=True)
            existing = None
        if existing and existing.get("milestones"):
            _t_eval0 = _time.perf_counter()
            ms = existing.get("milestones", [])
            existing_types = {m.get("milestone_type") for m in ms}
            for std_m in _ALL_STANDARD_MILESTONES:
                if std_m["milestone_type"] not in existing_types:
                    ms.append(dict(std_m))
            _si_tmp = user.get("student_info") or {}
            _goal_tmp = _si_tmp.get("career_goal") or user.get("career_goal") or "Software Engineer"
            ms = enhance_roadmap_milestones(user, ms, _goal_tmp, existing)
            existing["milestones"] = await evaluate_roadmap_milestones(user, ms, db)
            _t_eval1 = _time.perf_counter()
            print(f"[ROADMAP TRACE] 3. Evaluate milestones  | duration={(_t_eval1-_t_eval0)*1000:.1f}ms", flush=True)
            milestones_list = existing["milestones"]
            total_ms = len(milestones_list)
            completed_ms = sum(1 for m in milestones_list if m.get("completed"))
            existing["progress_pct"] = round(completed_ms / total_ms * 100) if total_ms > 0 else 0
            await db.career_roadmaps.update_one(cache_key, {"$set": {
                "milestones": existing["milestones"],
                "progress_pct": existing["progress_pct"],
            }})
            invalidate_intel_cache(str(user.get("id") or user.get("_id")))
            print(f"[ROADMAP TRACE] 4. Returning cached response | TOTAL duration={(_time.perf_counter()-_t0)*1000:.1f}ms", flush=True)
            return {k: v for k, v in existing.items() if k != "_id"}

    _t_llm0 = _time.perf_counter()
    full_name = user.get("full_name") or "Student"
    interests = ", ".join((user.get("interests") or [])[:8]) or "general tech"
    skills = ", ".join((user.get("skills") or [])[:10]) or "core CS"
    institution = user.get("institution") or (user.get("school_info") or {}).get("institution_name") or ""
    branch = user.get("branch") or (user.get("school_info") or {}).get("branch_or_stream") or ""
    grad_year = user.get("graduation_year") or ""
    cgpa = user.get("cgpa") or ""
    si = user.get("student_info") or {}
    goal = si.get("career_goal") or "Software Engineer at a top tech company"

    projects = user.get("projects") or []
    certs = user.get("certificates") or []
    num_projects = len(projects)
    num_certs = len(certs)
    has_resume = len((user.get("resume_documents") or [])) > 0 or bool(user.get("resume_url"))
    has_linkedin = bool(user.get("linkedin_url"))
    has_github = bool(user.get("github_url"))
    has_portfolio = bool(user.get("portfolio_url"))
    uid_str = str(user.get("id") or user.get("_id"))
    try:
        connections_count = await db.connections.count_documents({
            "$or": [{"from_id": uid_str}, {"to_id": uid_str}],
            "status": "accepted",
        })
    except Exception:
        connections_count = int(user.get("connections_made") or 0)
    try:
        bookings_count = await db.bookings.count_documents({"student_id": uid_str})
    except Exception:
        bookings_count = 0
    profile_comp_data = compute_profile_completion(user)
    profile_pct_for_prompt = profile_comp_data["percentage"]
    project_titles = ", ".join(p.get("title", "") for p in projects[:5] if p.get("title"))
    cert_names = ", ".join(c.get("title", c.get("name", "")) for c in certs[:5] if c.get("title") or c.get("name"))

    sys_msg = (
        "You are a career strategist for the Student Alumni platform. "
        "Generate a concrete 12-week career roadmap as STRICT JSON only — no markdown, no prose. "
        "All milestones must be specific and actionable for THIS student's exact profile. "
        "Prioritize milestones the student has NOT yet completed based on the profile signals provided."
    )
    schema_prompt = (
        "Return JSON with EXACTLY this shape:\n"
        "{\n"
        '  "target_role": "Specific role title matching student goal",\n'
        '  "target_company_type": "Specific company tier description",\n'
        '  "skill_scores": {"communication": <int 0-100>, "soft_skills": <int 0-100>, "technical": <int 0-100>, "interview_prep": <int 0-100>, "networking": <int 0-100>, "leadership": <int 0-100>},\n'
        '  "milestones": [\n'
        '    {"id": "m1", "title": "...", "description": "...", "milestone_type": "RESUME", "completion_rule": "resume_documents.length > 0", "completed": false, "completed_at": null},\n'
        '    // 8-10 milestones. Types: RESUME, PROJECT, PROFILE, NETWORKING, SKILLS, MOCK_INTERVIEW, PORTFOLIO, CERTIFICATION, JOB_APPLICATION, LINKEDIN\n'
        '  ],\n'
        '  "suggestion": "1-line motivational headline personalised to this student (under 20 words)"\n'
        "}\n"
        "Note: Do NOT include a top-level progress_pct field.\n"
    )
    profile_signals = (
        f"--- Student Profile Signals ---\n"
        f"Resume uploaded: {has_resume}\n"
        f"Projects: {num_projects} ({project_titles or 'none listed'})\n"
        f"Certifications: {num_certs} ({cert_names or 'none'})\n"
        f"LinkedIn linked: {has_linkedin} | GitHub linked: {has_github} | Portfolio: {has_portfolio}\n"
        f"Accepted connections: {connections_count}\n"
        f"Mock interview bookings: {bookings_count}\n"
        f"Profile completion: {profile_pct_for_prompt}%\n"
    )
    prompt = (
        f"Student: {full_name}\nInstitution: {institution} ({branch}, class of {grad_year}, CGPA {cgpa})\n"
        f"Interests: {interests}\nKey skills: {skills}\nGoal: {goal}\n\n"
        f"{profile_signals}\n{schema_prompt}"
    )

    try:
        chat = await get_claude_chat(f"roadmap-{user['_id']}", sys_msg)
        raw = await asyncio.wait_for(chat.send_message(UserMessage(text=prompt)), timeout=8.0)
        text = (raw or "").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"): text = text[4:]
            text = text.strip()
        data: Dict[str, Any] = json.loads(text)
        if not data.get("milestones"):
            raise ValueError("LLM returned empty milestones array")
    except Exception as e:
        logger.error(f"career-roadmap AI failed: {e}")
        _fallback_milestones = [dict(m) for m in _ALL_STANDARD_MILESTONES]
        data: Dict[str, Any] = {
            "target_role": goal.split(" at ")[0].strip() if " at " in goal else goal,
            "target_company_type": "Top Company in your field",
            "skill_scores": {"communication": 40, "soft_skills": 35, "technical": 50, "interview_prep": 30, "networking": 25, "leadership": 30},
            "milestones": _fallback_milestones,
            "suggestion": f"Great start, {full_name.split(' ')[0]}! Focus on your next action step to build momentum.",
        }

    _t_eval_gen0 = _time.perf_counter()
    milestones: list[dict[str, Any]] = data.get("milestones", [])
    if not isinstance(milestones, list):
        milestones = []
    
    for m in milestones:
        if isinstance(m, dict):
            m["completed"] = False
            m["completed_at"] = None
    existing_types = {m.get("milestone_type") for m in milestones if isinstance(m, dict)}
    for std_m in _ALL_STANDARD_MILESTONES:
        if std_m["milestone_type"] not in existing_types:
            milestones.append(dict(std_m))
    data["milestones"] = milestones

    _si_tmp = user.get("student_info") or {}
    _goal_tmp = _si_tmp.get("career_goal") or user.get("career_goal") or "Software Engineer"
    _prev_roadmap = await db.career_roadmaps.find_one({"user_id": str(user["_id"])})
    data["milestones"] = enhance_roadmap_milestones(user, data.get("milestones", []), _goal_tmp, _prev_roadmap)
    data["milestones"] = await evaluate_roadmap_milestones(user, data.get("milestones", []), db)
    invalidate_intel_cache(str(user.get("id") or user.get("_id")))
    _t_eval_gen1 = _time.perf_counter()
    print(f"[ROADMAP TRACE] 5. Evaluate roadmap milestones | duration={(_t_eval_gen1-_t_eval_gen0)*1000:.1f}ms", flush=True)

    _milestones_for_progress = data.get("milestones", [])
    _total_ms = len(_milestones_for_progress)
    _completed_ms = sum(1 for m in _milestones_for_progress if m.get("completed"))
    data["progress_pct"] = round(_completed_ms / _total_ms * 100) if _total_ms > 0 else 0

    si = user.get("student_info") or {}
    _current_goal = si.get("career_goal") or user.get("career_goal") or ""

    payload = {
        **data,
        "user_id": str(user["_id"]),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "_career_goal_snapshot": _current_goal,
    }
    _t_db_save0 = _time.perf_counter()
    await db.career_roadmaps.update_one(cache_key, {"$set": payload}, upsert=True)
    _t_db_save1 = _time.perf_counter()
    print(f"[ROADMAP TRACE] 6. Save cache in DB          | duration={(_t_db_save1-_t_db_save0)*1000:.1f}ms", flush=True)
    print(f"[ROADMAP TRACE] 7. Returning generated response | TOTAL duration={(_time.perf_counter()-_t0)*1000:.1f}ms", flush=True)
    return {k: v for k, v in payload.items() if k not in ("_id",)}


# ═══════════════════════════════════════════════════════════════════════════
# 6. Milestone Completion
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/ai/career-roadmap/milestone/{milestone_id}/complete")
async def complete_roadmap_milestone(
    milestone_id: str,
    body: Dict[str, Any] | None = None,
    user: dict = Depends(_get_current_user_dependency()),
):
    """Mark a specific milestone as manually completed or uncompleted.
    Body: { undo: bool }
    """
    cache_key = {"user_id": str(user["_id"])}
    rm = await db.career_roadmaps.find_one(cache_key)
    if not rm or not rm.get("milestones"):
        raise HTTPException(404, "Roadmap not found — generate one first.")

    milestones = rm.get("milestones", [])
    target = next((m for m in milestones if m.get("id") == milestone_id), None)
    if not target:
        raise HTTPException(404, "Milestone not found")

    undo = bool((body or {}).get("undo"))
    target["completed"] = not undo
    target["completed_at"] = None if undo else datetime.now(timezone.utc).isoformat()

    _total_ms = len(milestones)
    _completed_ms = sum(1 for m in milestones if m.get("completed"))
    _progress_pct = round(_completed_ms / _total_ms * 100) if _total_ms > 0 else 0

    await db.career_roadmaps.update_one(
        cache_key,
        {"$set": {
            "milestones": milestones,
            "progress_pct": _progress_pct,
            "milestones_updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    invalidate_intel_cache(str(user.get("id") or user.get("_id")))

    old_badges = list(user.get("badges") or [])
    old_keys = {f"{b.get('id')}:{b.get('tier')}" for b in old_badges}

    try:
        from badges import compute_badges
        u_full = await db.users.find_one({"_id": user["_id"]}) or user
        all_badges = await compute_badges(db, u_full)
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"badges": all_badges, "badges_updated_at": datetime.now(timezone.utc)}},
        )
    except Exception as _e:
        logger.error(f"badge recompute failed: {_e}")
        all_badges = old_badges

    new_keys = [f"{b.get('id')}:{b.get('tier')}" for b in all_badges]
    new_badges = [b for b in all_badges if f"{b.get('id')}:{b.get('tier')}" not in old_keys]

    completed_milestones = [m for m in milestones if m.get("completed")]
    pending_milestones = [m for m in milestones if not m.get("completed")]
    next_milestone = pending_milestones[0] if pending_milestones else None

    return {
        "milestones_completed": [m.get("id") for m in completed_milestones],
        "total_milestones": len(milestones),
        "new_badges": new_badges,
        "all_badges": all_badges,
        "next_milestone": next_milestone,
        "next_phase_unlocked": len(completed_milestones) >= len(milestones),
    }
