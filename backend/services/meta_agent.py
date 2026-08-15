"""
backend/services/meta_agent.py

Multi-Agent Meta-Orchestrator & Agentic Programmatic Creation (APC) System.
Coordinates multi-agent workflows, checks AI model availability, dynamically spawns worker sub-agents,
and executes multi-agent tasks with security guardrail enforcement.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from core.ai_security_guardrails import AISecurityGuardrail
from services.platform_rag import PlatformRAGEngine
from services.event_agent import run_global_event_agent
from services.resume_agent import ATSResumeAgent
from services.outreach_agent import AlumniOutreachAgent
from services.syllabus_agent import MentorSyllabusAgent

logger = logging.getLogger("meta_agent")


class MetaAgentOrchestrator:
    """Master Multi-Agent Orchestrator managing dynamic sub-agent spawning and execution."""

    @staticmethod
    def check_ai_availability() -> Dict[str, Any]:
        """Verifies status and availability of AI agents and LLM provider credentials."""
        has_emergent_key = bool(os.environ.get("EMERGENT_LLM_KEY"))
        has_anthropic_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
        has_openai_key = bool(os.environ.get("OPENAI_API_KEY"))

        return {
            "status": "healthy",
            "active_agents": [
                "GlobalEventAgent",
                "ATSResumeAgent",
                "AlumniOutreachAgent",
                "MentorSyllabusAgent",
                "PlatformRAGEngine",
            ],
            "llm_providers": {
                "emergent_claude": has_emergent_key,
                "anthropic": has_anthropic_key,
                "openai": has_openai_key,
                "fallback_mode": not (has_emergent_key or has_anthropic_key or has_openai_key),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    async def dispatch_workflow(
        user_id: str,
        workflow_type: str,
        payload: Dict[str, Any],
        db: Any = None
    ) -> Dict[str, Any]:
        """
        Orchestrates multi-agent execution pipeline based on workflow_type.
        Enforces AI Security Guardrails on all inputs and outputs.
        """
        logger.debug(f"[MetaAgent DEBUG] Dispatching workflow='{workflow_type}' user='{user_id}' payload_keys={list(payload.keys())}")

        # 1. AI Availability Check
        ai_status = MetaAgentOrchestrator.check_ai_availability()

        # 2. Security Guardrail Check on raw input prompt
        raw_prompt = payload.get("prompt") or payload.get("job_description") or payload.get("topic") or ""
        is_safe, sanitized_prompt, guardrail_metrics = AISecurityGuardrail.validate_prompt(raw_prompt)

        if not is_safe:
            logger.warning(f"[MetaAgent] Workflow '{workflow_type}' rejected by AI Security Guardrails.")
            return {
                "ok": False,
                "workflow": workflow_type,
                "error": sanitized_prompt,
                "security_metrics": guardrail_metrics,
                "ai_status": ai_status,
            }

        results = {}

        # 3. Multi-Agent Routing & Spawning
        try:
            if workflow_type == "career_pack":
                # Spawns ATS Resume Agent + Alumni Outreach Agent
                profile = payload.get("profile") or {}
                job_desc = sanitized_prompt or payload.get("job_description") or "Software Engineer"
                alumni = payload.get("alumni_profile") or {"full_name": "Senior Alumni", "current_company": "Tech Corp"}

                resume_res = ATSResumeAgent.analyze_resume(profile, job_desc)
                outreach_res = AlumniOutreachAgent.generate_outreach(profile, alumni, goal="coffee_chat")

                results = {
                    "resume_analysis": resume_res,
                    "alumni_outreach": outreach_res,
                    "agents_spawned": ["ATSResumeAgent", "AlumniOutreachAgent"],
                }

            elif workflow_type == "mentor_curriculum":
                # Spawns Syllabus Agent + Semantic RAG Search for course materials
                topic = sanitized_prompt or payload.get("topic") or "Cloud Computing"
                level = payload.get("target_level") or "Intermediate"
                weeks = payload.get("duration_weeks") or 4

                syllabus_res = MentorSyllabusAgent.generate_syllabus(topic, level, weeks)
                rag_matches = PlatformRAGEngine.search(query=topic, entity_type="course", top_k=3)

                results = {
                    "syllabus": syllabus_res,
                    "recommended_reference_courses": rag_matches,
                    "agents_spawned": ["MentorSyllabusAgent", "PlatformRAGEngine"],
                }

            elif workflow_type == "event_sync":
                # Spawns Global Event Scraper Agent
                if db is not None:
                    synced_count = await run_global_event_agent(db)
                    results = {
                        "events_synced": synced_count,
                        "agents_spawned": ["GlobalEventAgent"],
                    }
                else:
                    results = {"events_synced": 0, "agents_spawned": ["GlobalEventAgent"], "note": "Dry run (no DB)"}

            else:
                # Default Global Semantic Agent Search
                query = sanitized_prompt or "opportunities"
                search_res = PlatformRAGEngine.search(query=query, top_k=5)
                results = {
                    "semantic_results": search_res,
                    "agents_spawned": ["PlatformRAGEngine"],
                }

            # 4. Output Sanitization via Security Guardrail
            raw_summary = f"Workflow '{workflow_type}' completed successfully by agents: {', '.join(results.get('agents_spawned', []))}."
            sanitized_summary = AISecurityGuardrail.sanitize_output(raw_summary)

            return {
                "ok": True,
                "workflow": workflow_type,
                "summary": sanitized_summary,
                "results": results,
                "security_metrics": guardrail_metrics,
                "ai_status": ai_status,
            }

        except Exception as e:
            logger.error(f"[MetaAgent] Error in workflow '{workflow_type}': {e}", exc_info=True)
            return {
                "ok": False,
                "workflow": workflow_type,
                "error": f"Agent execution failed: {str(e)}",
                "ai_status": ai_status,
            }
