from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from core.db import db as _db
from features.agent_k.memory.models import PrescriptionCard

_AI_PROVIDER_IDS = {
    "openai", "claude", "anthropic", "gemini", "google",
    "mistral", "cohere", "perplexity", "groq", "together-ai",
    "fireworks-ai", "huggingface", "deepseek",
}

async def connected_ai_providers(user_id: str) -> List[Dict[str, str]]:
    """Return the AI tools this user has marked `connected` in installed_tools or integrations."""
    out: List[Dict[str, str]] = []
    
    # 1. Check installed_tools
    cur = _db.installed_tools.find({"user_id": user_id, "status": "connected"})
    async for row in cur:
        tid = row.get("tool_id", "")
        if tid in _AI_PROVIDER_IDS:
            out.append({
                "tool_id": tid,
                "label": row.get("label") or tid.replace("-", " ").title(),
                "connected_at": (row.get("connected_at") or "").__str__(),
            })
            
    # 2. Check user integrations
    from bson import ObjectId
    user = await _db.users.find_one({"_id": ObjectId(user_id)})
    if user and "integrations" in user:
        for provider, info in user["integrations"].items():
            if provider in _AI_PROVIDER_IDS or provider in ["openai_chatgpt", "anthropic_claude", "google_gemini"]:
                if not any(x["tool_id"] == provider for x in out):
                    out.append({
                        "tool_id": provider,
                        "label": info.get("account_label") or provider.replace("_", " ").title(),
                        "connected_at": (info.get("connected_at") or "").__str__(),
                    })
    return out

def is_admin(user: dict) -> bool:
    role = (user.get("role") or "").lower()
    return role == "admin"

async def assert_ai_provider_or_412(user: dict) -> None:
    """Raise 412 if the (non-admin) user hasn't connected any AI tool."""
    if is_admin(user):
        return
    providers = await connected_ai_providers(str(user["_id"]))
    if not providers:
        raise HTTPException(
            status_code=412,
            detail={
                "setup_required": "ai_provider",
                "message": "Connect an AI provider (OpenAI, Anthropic, Gemini, …) in the Marketplace before using Agent K.",
                "deeplink": "/marketplace?category=AI",
            },
        )

def _stable_id(*parts: str) -> str:
    import hashlib
    return hashlib.md5("|".join(parts).encode("utf-8")).hexdigest()[:10]

async def _prescriptions_student(user: dict) -> List[Dict[str, Any]]:
    cards: List[Dict[str, Any]] = []
    email = user.get("email") or ""
    try:
        job = await _db.applications.find_one({"user_email": email}, sort=[("created_at", -1)])
    except Exception:
        job = None
    cards.append(PrescriptionCard(
        id=_stable_id("student", email, "draft_app"),
        icon="briefcase", tint="#7B3DBF",
        kicker="TOP MATCH",
        title=(job and f"Draft application for {job.get('title','your top match')}") or "Draft a tailored application",
        subtitle="Agent K writes a personalised cover letter using your profile.",
        cta="Draft my application",
        prompt=f"Draft a tailored application + cover letter for my most recent top job match. Use my profile. Job: {job.get('title') if job else 'top match'}.",
        tools=["search_jobs", "get_profile", "draft_application"],
    ).model_dump())
    cards.append(PrescriptionCard(
        id=_stable_id("student", email, "skill_gap"),
        icon="graduation-cap", tint="#A78BFA",
        kicker="SKILL GAP",
        title="Close your skill gaps toward your career goal",
        subtitle="Find 3 courses tailored to where you are vs where you want to be.",
        cta="Find me 3 courses",
        prompt="Look at my career goal and current skills, identify the top 3 gaps, and recommend one course for each.",
        tools=["get_profile", "search_courses"],
    ).model_dump())
    cards.append(PrescriptionCard(
        id=_stable_id("student", email, "book_mentor"),
        icon="user-plus", tint="#EC4899",
        kicker="RECOMMENDED MENTOR",
        title="Book a session with a top-rated mentor in your field",
        subtitle="Agent K finds the best fit and drafts an intro message.",
        cta="Book a session + draft intro",
        prompt="Recommend the top mentor for my career goal, draft an intro message to send when booking.",
        tools=["search_mentors", "draft_message"],
    ).model_dump())
    cards.append(PrescriptionCard(
        id=_stable_id("student", email, "profile_complete"),
        icon="user-check", tint="#10B981",
        kicker="PROFILE",
        title="Bring your profile to 100% completion",
        subtitle="Agent K reviews missing fields and suggests fixes.",
        cta="Review my profile",
        prompt="Audit my profile, list what's missing and give me smart suggestions to bring it to 100%.",
        tools=["get_profile"],
    ).model_dump())
    return cards

async def _prescriptions_alumni(user: dict) -> List[Dict[str, Any]]:
    email = user.get("email") or ""
    return [
        PrescriptionCard(
            id=_stable_id("alumni", email, "give_back"),
            icon="hand-heart", tint="#0A66C2",
            kicker="GIVE BACK",
            title="Refer a top student to your company",
            subtitle="Agent K finds 3 strong matches and drafts a referral note.",
            cta="Find candidates + draft note",
            prompt="Find 3 students from my alma mater whose profile matches roles at my current company, and draft a referral note.",
            tools=["search_students", "draft_message"],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("alumni", email, "mentor_request"),
            icon="users", tint="#378FE9",
            kicker="MENTORSHIP",
            title="Respond to pending mentorship requests",
            subtitle="Draft a thoughtful reply for each request.",
            cta="Draft mentor replies",
            prompt="Review my pending mentorship requests and draft a personalised reply for each.",
            tools=["draft_message"],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("alumni", email, "panel_invite"),
            icon="mic", tint="#004182",
            kicker="EVENTS",
            title="Volunteer for an upcoming alumni panel",
            subtitle="Agent K matches you to an event aligned with your expertise.",
            cta="Find a panel for me",
            prompt="Find an upcoming alumni panel matched to my expertise and draft a volunteer message.",
            tools=["search_events", "draft_message"],
        ).model_dump(),
    ]

async def _prescriptions_mentor(user: dict) -> List[Dict[str, Any]]:
    email = user.get("email") or ""
    return [
        PrescriptionCard(
            id=_stable_id("mentor", email, "prep_today"),
            icon="clipboard-list", tint="#0D9488",
            kicker="TODAY",
            title="Prep notes for today's sessions",
            subtitle="Agent K reads each mentee's profile and drafts a session plan.",
            cta="Generate prep notes",
            prompt="For each session scheduled today, summarise the mentee's profile and propose a 4-bullet session plan.",
            tools=["get_profile"],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("mentor", email, "feedback"),
            icon="message-square", tint="#14B8A6",
            kicker="FEEDBACK",
            title="Send follow-up feedback to recent mentees",
            subtitle="Polished, actionable feedback drafted from your session notes.",
            cta="Draft follow-up emails",
            prompt="Draft follow-up feedback messages for each mentee I met in the last 7 days, using my session notes.",
            tools=["draft_message"],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("mentor", email, "raise_rate"),
            icon="trending-up", tint="#115E59",
            kicker="EARNINGS",
            title="See whether you should raise your session rate",
            subtitle="Benchmark against your tier and rating, with a suggested new rate.",
            cta="Run my pricing review",
            prompt="Benchmark my session rate vs other mentors in my tier and rating bucket. Suggest a new rate with justification.",
            tools=["get_wallet_balance"],
        ).model_dump(),
    ]

async def _prescriptions_college(user: dict) -> List[Dict[str, Any]]:
    email = user.get("email") or ""
    return [
        PrescriptionCard(
            id=_stable_id("college", email, "low_placement_dept"),
            icon="bar-chart-3", tint="#4F46E5",
            kicker="PLACEMENT",
            title="Identify departments lagging on placements",
            subtitle="Agent K finds underperformers and drafts an intervention plan.",
            cta="Analyse + draft plan",
            prompt="Identify the 3 departments with the lowest placement rate this semester and draft a 30-day intervention plan for each.",
            tools=[],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("college", email, "drive_invite"),
            icon="building", tint="#818CF8",
            kicker="RECRUITERS",
            title="Invite 5 top recruiters for a campus drive",
            subtitle="Match recruiters to your strongest cohorts and draft outreach.",
            cta="Find recruiters + draft email",
            prompt="Recommend 5 recruiters whose hiring profile matches my college's strongest cohorts. Draft an outreach email to each.",
            tools=["draft_message"],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("college", email, "alumni_panel"),
            icon="users", tint="#3730A3",
            kicker="ALUMNI",
            title="Invite alumni for a placement-prep panel",
            subtitle="Pick speakers, propose dates, draft a calendar invite.",
            cta="Plan the panel",
            prompt="Plan an alumni placement-prep panel: pick 4 alumni speakers from my college, propose 3 dates, draft a calendar invite + announcement.",
            tools=["search_events"],
        ).model_dump(),
    ]

async def _prescriptions_admin(user: dict) -> List[Dict[str, Any]]:
    email = user.get("email") or ""
    return [
        PrescriptionCard(
            id=_stable_id("admin", email, "approvals"),
            icon="shield-check", tint="#F59E0B",
            kicker="APPROVALS",
            title="Triage the pending approvals queue",
            subtitle="Agent K reviews each pending mentor / college / event and proposes an action.",
            cta="Triage approvals",
            prompt="Triage every pending approval. For each, propose Approve / Reject / Request-more-info with a one-line reason.",
            tools=[],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("admin", email, "weekly_report"),
            icon="file-text", tint="#FBBF24",
            kicker="REPORTING",
            title="Generate this week's executive summary",
            subtitle="Top metrics, anomalies, and 3 things requiring leadership attention.",
            cta="Generate weekly report",
            prompt="Produce this week's executive summary: top metrics, anomalies, and 3 items needing leadership attention.",
            tools=[],
        ).model_dump(),
        PrescriptionCard(
            id=_stable_id("admin", email, "anomalies"),
            icon="alert-triangle", tint="#FB923C",
            kicker="ANOMALIES",
            title="Surface unusual platform activity",
            subtitle="Agent K scans the last 24h for spikes, failures, suspicious patterns.",
            cta="Scan last 24h",
            prompt="Scan the last 24h of platform activity for anomalies (signup spikes, payment failures, suspicious bookings) and summarise.",
            tools=[],
        ).model_dump(),
    ]

PRESCRIPTION_FNS = {
    "student": _prescriptions_student,
    "alumni":  _prescriptions_alumni,
    "mentor":  _prescriptions_mentor,
    "college": _prescriptions_college,
    "admin":   _prescriptions_admin,
}
