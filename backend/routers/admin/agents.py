"""
agents.py — Super Admin Autonomous Agent Ecosystem Router
Exposes endpoints for:
  - MetaGPT / ChatDev Multi-Agent Swarm (PM, Architect, Engineer, QA)
  - AutoGPT Autonomous Goal-Driven Auto-Pilot
  - Autonomous Testing & Synthetic Persona QA Agent
  - Security, Data Hygiene, and Moderation Specialized Agents
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import Dict, Any, Optional, List

from core.deps import get_current_user, require_role
from services.agents.swarm import swarm_engine, SwarmProjectResult
from services.agents.autopilot import autopilot_engine, AutoPilotTaskResult
from services.agents.qa_agent import qa_agent, QASimulationReport
from services.agents.specialized import specialized_agents, AgentReport

from pydantic import BaseModel, Field

# ─── Pydantic Request Models ───────────────────────────────────────────
class SwarmRunRequest(BaseModel):
    project_title: str
    user_prompt: str
    domain: Optional[str] = "edtech"

class AutoPilotRunRequest(BaseModel):
    goal: str
    context: Optional[Dict[str, Any]] = None

class QASimulateRequest(BaseModel):
    persona: Optional[str] = "student"

class TeamRunRequest(BaseModel):
    task_prompt: str

class ConvertProfileRequest(BaseModel):
    community_id: str
    role_type: Optional[str] = "community_partner"

class SchedulerIntervalRequest(BaseModel):
    hours: int

class UpdateStageRequest(BaseModel):
    stage: str

class DispatchCampaignRequest(BaseModel):
    community_id: str
    channel: Optional[str] = "email"
    subject: Optional[str] = ""
    message: Optional[str] = ""

class MatchEventRequest(BaseModel):
    event_id: Optional[str] = "echo-2026-hackathon"
    event_title: Optional[str] = "ECHO 2026 Hackathon"

class GenerateMouRequest(BaseModel):
    community_id: str
    custom_terms: Optional[str] = None

class DispatchBroadcastRequest(BaseModel):
    community_ids: List[str]
    channel: Optional[str] = "telegram"
    content_title: Optional[str] = "ECHO 2026 Hackathon Announcement"
    message: Optional[str] = "🚀 Registrations now open for Student Alumni Hackathon 2026!"

class MatchAmbassadorRequest(BaseModel):
    community_id: str

class GenerateBlogRequest(BaseModel):
    community_id: Optional[str] = None
    event_title: Optional[str] = None

class MatchSpeakerRequest(BaseModel):
    topic: Optional[str] = "AI & Machine Learning"
    location: Optional[str] = "Bengaluru"

class MediaKitRequest(BaseModel):
    community_id: str

class HarvesterLoopRequest(BaseModel):
    domain: Optional[str] = "all"

class DispatchSpecLoopRequest(BaseModel):
    spec_type: Optional[str] = "goodies_partnership"  # goodies_partnership | event_sponsorship | alumni_mentorship

class SocialSpotlightRequest(BaseModel):
    community_id: str


router = APIRouter(prefix="/admin/agents", tags=["Autonomous Agents"])


@router.get("/overview")
async def get_agent_ecosystem_overview(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Returns overview of all available autonomous agents and their operational status."""
    return {
        "status": "healthy",
        "agents": [
            {
                "id": "swarm",
                "name": "MetaGPT / ChatDev Swarm",
                "category": "Multi-Agent Collaboration",
                "roles": ["Product Manager", "System Architect", "Lead Engineer", "QA Auditor"],
                "status": "ready"
            },
            {
                "id": "autopilot",
                "name": "AutoGPT Autonomous Task Engine",
                "category": "Autonomous Goal Execution",
                "roles": ["Goal Planner", "Resource Ingestion", "Action Dispatcher"],
                "status": "ready"
            },
            {
                "id": "qa_agent",
                "name": "Autonomous QA & Persona Simulator",
                "category": "Quality Assurance & Testing",
                "roles": ["Student Persona", "Mentor Persona", "Admin Persona"],
                "status": "ready"
            },
            {
                "id": "security",
                "name": "Security & BOLA Vulnerability Scanner",
                "category": "Security & Compliance",
                "roles": ["Auth Inspector", "BOLA Auditor", "CORS Validator"],
                "status": "ready"
            },
            {
                "id": "data_hygiene",
                "name": "Data Hygiene & Deduplication Agent",
                "category": "Data Operations",
                "roles": ["TTL Cleaner", "Record Deduplicator", "Integrity Checker"],
                "status": "ready"
            },
            {
                "id": "moderation",
                "name": "Content & Review Moderation Agent",
                "category": "Community Safety",
                "roles": ["Toxicity Filter", "Review Verifier"],
                "status": "ready"
            }
        ]
    }

@router.post("/swarm/run", response_model=SwarmProjectResult)
async def run_multi_agent_swarm(
    req: SwarmRunRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Triggers the MetaGPT/ChatDev multi-agent swarm to design, architect, code, and review a project."""
    return await swarm_engine.run_swarm_pipeline(req.project_title, req.user_prompt, req.domain or "edtech")

@router.post("/autopilot/run", response_model=AutoPilotTaskResult)
async def run_autopilot_task(
    req: AutoPilotRunRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Triggers the AutoGPT goal-driven autonomous loop to execute an administrative or career campaign goal."""
    return await autopilot_engine.execute_goal(req.goal, req.context)

@router.post("/qa/simulate", response_model=QASimulationReport)
async def run_qa_persona_simulation(
    req: QASimulateRequest = Body(default_factory=QASimulateRequest),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Executes synthetic user journey testing across full-stack endpoints."""
    return await qa_agent.run_persona_simulation(req.persona or "student")

@router.post("/specialized/{agent_type}", response_model=AgentReport)
async def run_specialized_agent(
    agent_type: str,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Executes a specialized operational agent audit (security, data_hygiene, moderation)."""
    if agent_type == "security":
        return await specialized_agents.run_security_audit()
    elif agent_type == "data_hygiene":
        return await specialized_agents.run_data_hygiene_audit()
    elif agent_type == "moderation":
        return await specialized_agents.run_content_moderation_audit()
    else:
        raise HTTPException(status_code=400, detail=f"Unknown agent type: {agent_type}")


# ─── 30-Minute Recurring Agent Scheduler ──────────────────────────────
from services.agents.agent_scheduler import agent_scheduler, SchedulerStatusResponse

@router.get("/scheduler/status", response_model=SchedulerStatusResponse)
async def get_agent_scheduler_status(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Returns the operational telemetry and task statuses of the 30-minute recurring agent worker."""
    return agent_scheduler.get_status()

@router.post("/scheduler/trigger-now")
async def trigger_agent_scheduler_cycle(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Manually triggers the 30-minute multi-agent swarm cycle on demand."""
    from db import db
    results = await agent_scheduler.run_cycle(db=db)
    return {"ok": True, "triggered_at": agent_scheduler.get_status().last_cycle_at, "results": results}


# ─── 24-Hour Autonomous Operations & Audit Swarm ──────────────────────
from services.agents.daily_audit_agents import (
    daily_audit_service,
    DailyDossierResponse,
)

@router.get("/daily-audit/latest", response_model=DailyDossierResponse)
async def get_latest_daily_audit_dossier(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Returns the most recent 24-hour audit dossier covering unit tests, analytics, and debugging logs."""
    from db import db
    dossier = daily_audit_service.get_latest_dossier()
    if not dossier:
        dossier = await daily_audit_service.run_24hr_dossier(db=db)
    return dossier

@router.post("/daily-audit/trigger-now", response_model=DailyDossierResponse)
async def trigger_daily_audit_cycle(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Manually compiles and executes the 24-hour audit swarm across unit tests, analytics, and logs."""
    from db import db
    return await daily_audit_service.run_24hr_dossier(db=db)


# ─── Custom Agent Teams Management & Execution ─────────────────────────
from services.agents.custom_teams_engine import custom_teams_engine, CustomTeamRunResult

@router.get("/teams")
async def list_custom_agent_teams(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Fetches all custom and pre-seeded AI agent teams."""
    from db import db
    teams = await custom_teams_engine.get_all_teams(db)
    return {"teams": teams}

@router.get("/teams/{team_id}")
async def get_custom_agent_team(team_id: str, user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Fetches details for a specific AI agent team."""
    from db import db
    team = await custom_teams_engine.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.post("/teams")
async def create_custom_agent_team(
    team_data: Dict[str, Any] = Body(...),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Creates a new custom AI agent team."""
    from db import db
    new_team = await custom_teams_engine.create_team(db, team_data)
    return {"ok": True, "team": new_team}

@router.put("/teams/{team_id}")
async def update_custom_agent_team(
    team_id: str,
    team_data: Dict[str, Any] = Body(...),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Updates an existing custom AI agent team."""
    from db import db
    try:
        updated = await custom_teams_engine.update_team(db, team_id, team_data)
        return {"ok": True, "team": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/teams/{team_id}")
async def delete_custom_agent_team(
    team_id: str,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Deletes a custom AI agent team."""
    from db import db
    deleted = await custom_teams_engine.delete_team(db, team_id)
    return {"ok": deleted}

@router.post("/teams/{team_id}/run", response_model=CustomTeamRunResult)
async def run_custom_agent_team(
    team_id: str,
    req: TeamRunRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Executes a collaborative task across all agents in the selected AI team."""
    from db import db
    try:
        return await custom_teams_engine.run_team_pipeline(db, team_id, req.task_prompt)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── 8-Hour Outreach & Community Directory ─────────────────────────────
from services.agents.outreach_scout_service import outreach_scout_service

@router.get("/outreach/status")
async def get_outreach_scout_status(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Returns status of 8-hour automated community outreach scouting worker."""
    return outreach_scout_service.get_status()

@router.get("/outreach/communities")
async def list_scouted_communities(
    domain: Optional[str] = None,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Fetches scouted student communities across domains with full contact details and free goodies."""
    from db import db
    communities = await outreach_scout_service.get_communities(db, domain)
    return {"communities": communities, "status": outreach_scout_service.get_status()}

@router.post("/outreach/scout-now")
async def trigger_outreach_scout(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Manually triggers the 8-hour community & goodies scouting worker."""
    from db import db
    return await outreach_scout_service.scout_now(db)

@router.post("/outreach/communities/convert-profile")
async def convert_community_to_user_profile(
    req: ConvertProfileRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Converts/Registers a scouted community lead into a Super Admin user profile (community_partner, mentor, or student)."""
    from db import db
    try:
        return await outreach_scout_service.convert_to_admin_profile(db, req.community_id, req.role_type or "community_partner")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/outreach/scheduler/interval")
async def update_scheduler_interval(
    req: SchedulerIntervalRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Dynamically updates the scouting cadence interval."""
    return outreach_scout_service.set_interval_hours(req.hours)

@router.put("/outreach/communities/{community_id}/stage")
async def update_community_crm_stage(
    community_id: str,
    req: UpdateStageRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Updates community stage in the CRM Kanban pipeline."""
    from db import db
    return await outreach_scout_service.update_stage(db, community_id, req.stage)

@router.post("/outreach/campaign/dispatch")
async def dispatch_outreach_campaign(
    req: DispatchCampaignRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Dispatches automated email/WhatsApp outreach campaign to community lead."""
    from db import db
    try:
        return await outreach_scout_service.dispatch_campaign(db, req.community_id, req.channel or "email", req.subject or "", req.message or "")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/outreach/communities/{community_id}/match-event")
async def match_community_event_cohost(
    community_id: str,
    req: MatchEventRequest = Body(default_factory=MatchEventRequest),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Matches a community as official co-host / sponsor for an ECHO event."""
    from db import db
    return await outreach_scout_service.match_community_to_event(db, community_id, req.event_id or "echo-2026-hackathon", req.event_title or "ECHO 2026 Hackathon")


# ─── Phase 3 Extensions: MoU Generator, Broadcasts, Impact Analytics ─
from services.agents.mou_generator_service import mou_generator_service
from services.agents.community_broadcast_service import community_broadcast_service

@router.get("/outreach/analytics")
async def get_outreach_impact_analytics(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Returns live Impact ROI analytics (Total $ Unlocked, Student Reach, Perks Claimed)."""
    from db import db
    return await outreach_scout_service.get_impact_analytics(db)

@router.post("/outreach/mou/generate")
async def generate_partnership_mou(
    req: GenerateMouRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Generates official MoU contract document for partner community."""
    from db import db
    try:
        return await mou_generator_service.generate_mou(db, req.community_id, req.custom_terms)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/outreach/broadcast")
async def dispatch_community_broadcast(
    req: DispatchBroadcastRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Dispatches event announcements and job openings to community Telegram & WhatsApp groups."""
    from db import db
    return await community_broadcast_service.dispatch_broadcast(db, req.community_ids, req.channel or "telegram", req.content_title or "ECHO 2026 Hackathon Announcement", req.message or "")

@router.post("/outreach/ambassadors/match")
async def match_alumni_regional_ambassador(
    req: MatchAmbassadorRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Matches a verified alumni in the region to serve as Ambassador for student community."""
    from db import db
    try:
        return await outreach_scout_service.match_alumni_ambassador(db, req.community_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Phase 4 Extensions: AI Blog Engine, Venue Scout & Media Engine ─
from services.agents.community_blog_agent import community_blog_agent
from services.agents.campus_venue_speaker_service import campus_venue_speaker_service

@router.post("/outreach/blogs/generate")
async def generate_community_or_event_blog(
    req: GenerateBlogRequest = Body(default_factory=GenerateBlogRequest),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Auto-generates structured blog posts for student communities or events and syncs to db.blogs."""
    from db import db
    try:
        if req.community_id:
            return await community_blog_agent.generate_community_blog(db, req.community_id)
        elif req.event_title:
            return await community_blog_agent.generate_event_blog(db, req.event_title)
        else:
            raise HTTPException(status_code=400, detail="Must provide community_id or event_title")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/outreach/venues")
async def scout_campus_venues(
    city: str = Query("Bengaluru"),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Scouts auditorium halls, campus centers, and co-working spaces in target city."""
    from db import db
    venues = await campus_venue_speaker_service.scout_venues(db, city)
    return {"venues": venues, "city": city}

@router.post("/outreach/speakers/match")
async def match_alumni_guest_speaker(
    req: MatchSpeakerRequest = Body(default_factory=MatchSpeakerRequest),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Matches domain expert alumni as guest speaker and drafts invitation."""
    from db import db
    return await campus_venue_speaker_service.match_alumni_speaker(db, req.topic or "AI & Machine Learning", req.location or "Bengaluru")

@router.post("/outreach/media-kit/generate")
async def generate_community_media_kit(
    req: MediaKitRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Builds digital media kit & bi-weekly newsletter payload."""
    from db import db
    return await campus_venue_speaker_service.build_media_kit(db, req.community_id)

@router.post("/outreach/social-spotlight")
async def generate_social_media_spotlight(
    req: SocialSpotlightRequest,
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Generates formatted LinkedIn & Twitter/X spotlight posts."""
    from db import db
    return await campus_venue_speaker_service.publish_social_spotlight(db, req.community_id)








@router.get("/observability")
async def get_agent_observability_alias(user=Depends(require_role("admin", "superadmin", "super_admin"))):
    """Returns AI LLM & RAG observability telemetry."""
    from services.agents.ai_observability import ai_observability
    from db import db
    return ai_observability.get_system_telemetry(db=db)


@router.post("/outreach/goodies-harvester/run")
async def trigger_goodies_harvester_loop(
    req: HarvesterLoopRequest = Body(default_factory=HarvesterLoopRequest),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Triggers the Multi-Agent Goodies & Offer Harvester Loop to scout platforms for free coupons, dev credits, and swag."""
    from db import db
    return await outreach_scout_service.run_goodies_harvester_loop(db)

@router.post("/outreach/specs-dispatcher/run")
async def trigger_multi_spec_outreach_loop(
    req: DispatchSpecLoopRequest = Body(default_factory=DispatchSpecLoopRequest),
    user=Depends(require_role("admin", "superadmin", "super_admin"))
):
    """Dispatches customized Partnership Specs (Goodies, Event Sponsorship, Mentorship) to platforms & partner communities in an automated loop."""
    from db import db
    return await outreach_scout_service.run_multi_spec_outreach_loop(db, req.spec_type or "goodies_partnership")


# ── CI/CD, Git Scout & PR Evaluator Loop Agent Endpoints ─────────────────────
from services.agents.cicd_pr_evaluator_agent import (
    git_repo_scout_agent,
    cicd_pr_evaluator_agent,
    cicd_loop_agent,
    PREvalRequest,
)

@router.post("/cicd/scout-repo")
@router.post("/cicd-scout")
async def scout_git_repository(
    repo_url: str = Query("https://github.com/kktejas07/Student-Alumni-Master", description="Git repository URL to scout"),
    user=Depends(require_role("admin", "superadmin"))
):
    """Scout git repository for CI/CD workflow health, security scans & quality gates."""
    return await git_repo_scout_agent.scout_repository(repo_url)

@router.post("/cicd/evaluate-pr")
@router.post("/evaluate-pr")
async def evaluate_pull_request(
    req: PREvalRequest = Body(default_factory=PREvalRequest),
    user=Depends(require_role("admin", "superadmin"))
):
    """Evaluate Pull Request diff across Security SAST, Lints, Test Coverage & Risk."""
    return await cicd_pr_evaluator_agent.evaluate_pr(req)

@router.get("/cicd/loop/status")
async def get_cicd_loop_status(
    user=Depends(require_role("admin", "superadmin"))
):
    """Get status of the continuous CI/CD PR Evaluator background loop agent."""
    return cicd_loop_agent.get_status()

@router.post("/cicd/loop/start")
@router.post("/cicd-loop")
async def start_cicd_loop(
    interval_seconds: int = Query(1800, ge=60, le=86400),
    user=Depends(require_role("admin", "superadmin"))
):
    """Start the continuous background loop worker for PR evaluation & test auditing."""
    started = cicd_loop_agent.start_loop(interval_seconds=interval_seconds)
    return {"status": "success" if started else "already_running", "agent": cicd_loop_agent.get_status()}

@router.post("/cicd/loop/stop")
async def stop_cicd_loop(
    user=Depends(require_role("admin", "superadmin"))
):
    """Stop the continuous background loop worker."""
    stopped = cicd_loop_agent.stop_loop()
    return {"status": "success" if stopped else "not_running", "agent": cicd_loop_agent.get_status()}

