"""
agents.py — Super Admin Autonomous Agent Ecosystem Router
Exposes endpoints for:
  - MetaGPT / ChatDev Multi-Agent Swarm (PM, Architect, Engineer, QA)
  - AutoGPT Autonomous Goal-Driven Auto-Pilot
  - Autonomous Testing & Synthetic Persona QA Agent
  - Security, Data Hygiene, and Moderation Specialized Agents
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional

from core.deps import get_current_user, require_role
from services.agents.swarm import swarm_engine, SwarmProjectResult
from services.agents.autopilot import autopilot_engine, AutoPilotTaskResult
from services.agents.qa_agent import qa_agent, QASimulationReport
from services.agents.specialized import specialized_agents, AgentReport

router = APIRouter(prefix="/admin/agents", tags=["Autonomous Agents"])

@router.get("/overview")
async def get_agent_ecosystem_overview(user=Depends(require_role("admin", "superadmin", "college"))):
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
    project_title: str = Body(..., embed=True),
    user_prompt: str = Body(..., embed=True),
    domain: str = Body("edtech", embed=True),
    user=Depends(require_role("admin", "superadmin", "college"))
):
    """Triggers the MetaGPT/ChatDev multi-agent swarm to design, architect, code, and review a project."""
    return await swarm_engine.run_swarm_pipeline(project_title, user_prompt, domain)

@router.post("/autopilot/run", response_model=AutoPilotTaskResult)
async def run_autopilot_task(
    goal: str = Body(..., embed=True),
    context: Optional[Dict[str, Any]] = Body(None, embed=True),
    user=Depends(require_role("admin", "superadmin", "college"))
):
    """Triggers the AutoGPT goal-driven autonomous loop to execute an administrative or career campaign goal."""
    return await autopilot_engine.execute_goal(goal, context)

@router.post("/qa/simulate", response_model=QASimulationReport)
async def run_qa_persona_simulation(
    persona: str = Body("student", embed=True),
    user=Depends(require_role("admin", "superadmin", "college"))
):
    """Executes synthetic user journey testing across full-stack endpoints."""
    return await qa_agent.run_persona_simulation(persona)

@router.post("/specialized/{agent_type}", response_model=AgentReport)
async def run_specialized_agent(
    agent_type: str,
    user=Depends(require_role("admin", "superadmin", "college"))
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
async def get_agent_scheduler_status(user=Depends(require_role("admin", "superadmin", "college"))):
    """Returns the operational telemetry and task statuses of the 30-minute recurring agent worker."""
    return agent_scheduler.get_status()

@router.post("/scheduler/trigger-now")
async def trigger_agent_scheduler_cycle(user=Depends(require_role("admin", "superadmin", "college"))):
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
async def get_latest_daily_audit_dossier(user=Depends(require_role("admin", "superadmin", "college"))):
    """Returns the most recent 24-hour audit dossier covering unit tests, analytics, and debugging logs."""
    from db import db
    dossier = daily_audit_service.get_latest_dossier()
    if not dossier:
        dossier = await daily_audit_service.run_24hr_dossier(db=db)
    return dossier

@router.post("/daily-audit/trigger-now", response_model=DailyDossierResponse)
async def trigger_daily_audit_cycle(user=Depends(require_role("admin", "superadmin", "college"))):
    """Manually compiles and executes the 24-hour audit swarm across unit tests, analytics, and logs."""
    from db import db
    return await daily_audit_service.run_24hr_dossier(db=db)


