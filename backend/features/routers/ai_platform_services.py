"""
backend/routers/ai_platform_services.py

FastAPI Router for Platform RAG Semantic Search and Automated AI Agents
(ATS Resume Optimizer, Alumni Outreach Agent, and Mentor Syllabus Generator).
"""

from typing import Any, Dict, Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from services.platform_rag import PlatformRAGEngine
from services.resume_agent import ATSResumeAgent
from services.outreach_agent import AlumniOutreachAgent
from services.syllabus_agent import MentorSyllabusAgent
from core.rate_limiter import rate_limit_ai_requests

router = APIRouter(
    prefix="/ai",  # mounted under api_router (/api) → /api/ai/*
    tags=["ai-platform-services"],
    dependencies=[Depends(rate_limit_ai_requests)]
)


# 1. Semantic Search (Platform RAG)
class SemanticSearchReq(BaseModel):
    query: str
    entity_type: Optional[str] = "all"
    user_role: Optional[str] = None
    top_k: Optional[int] = 5


@router.post("/semantic-search")
async def semantic_search(req: SemanticSearchReq):
    if not req.query.strip():
        raise HTTPException(400, "Query string cannot be empty")
    results = PlatformRAGEngine.search(
        query=req.query,
        entity_type=req.entity_type,
        user_role=req.user_role,
        top_k=req.top_k or 5
    )
    return {"ok": True, "query": req.query, "results": results, "count": len(results)}


# 2. ATS Resume Optimizer Agent
class ResumeOptimizeReq(BaseModel):
    profile: Dict[str, Any]
    job_description: str


@router.post("/resume/optimize")
async def optimize_resume(req: ResumeOptimizeReq):
    if not req.job_description.strip():
        raise HTTPException(400, "Job description cannot be empty")
    res = ATSResumeAgent.analyze_resume(req.profile, req.job_description)
    return {"ok": True, "analysis": res}


# 3. Alumni Outreach Agent
class OutreachReq(BaseModel):
    student_profile: Dict[str, Any]
    alumni_profile: Dict[str, Any]
    goal: Optional[str] = "coffee_chat"


@router.post("/outreach/generate")
async def generate_outreach(req: OutreachReq):
    res = AlumniOutreachAgent.generate_outreach(req.student_profile, req.alumni_profile, req.goal or "coffee_chat")
    return {"ok": True, "outreach": res}


# 4. Mentor Syllabus Agent
class SyllabusReq(BaseModel):
    topic: str
    target_level: Optional[str] = "Intermediate"
    duration_weeks: Optional[int] = 4


@router.post("/syllabus/generate")
async def generate_syllabus(req: SyllabusReq):
    if not req.topic.strip():
        raise HTTPException(400, "Topic cannot be empty")
    res = MentorSyllabusAgent.generate_syllabus(req.topic, req.target_level or "Intermediate", req.duration_weeks or 4)
    return {"ok": True, "syllabus": res}


# 5. AI Status & Availability Check
@router.get("/status")
async def get_ai_status():
    from services.meta_agent import MetaAgentOrchestrator
    return MetaAgentOrchestrator.check_ai_availability()


# 6. Multi-Agent Workflow Dispatcher
class WorkflowReq(BaseModel):
    user_id: Optional[str] = "guest"
    workflow_type: str
    payload: Dict[str, Any]


@router.post("/agent-workflow")
async def dispatch_agent_workflow(req: WorkflowReq):
    from services.meta_agent import MetaAgentOrchestrator
    res = await MetaAgentOrchestrator.dispatch_workflow(
        user_id=req.user_id or "guest",
        workflow_type=req.workflow_type,
        payload=req.payload
    )
    if not res.get("ok"):
        raise HTTPException(400, res.get("error", "Workflow execution failed"))
    return res


# ─── Universal Enterprise RAG & Global AI Copilot ───────────────────────
from services.universal_rag_engine import (
    universal_rag_engine,
    RAGQueryRequest,
    RAGQueryResponse,
)
from services.agents.career_copilot_agent import (
    career_copilot_agent,
    ATSScoreRequest,
    ATSScoreResponse,
    MockInterviewTurnRequest,
    MockInterviewTurnResponse,
)
from services.agents.ai_observability import (
    ai_observability,
    AIObservabilityResponse,
)

@router.post("/universal-rag/query", response_model=RAGQueryResponse)
async def query_universal_rag(req: RAGQueryRequest):
    """Pillar 1: Multi-tenant hybrid search across alumni, jobs, campus knowledge, and credentials."""
    from db import db
    return await universal_rag_engine.query_knowledge_fabric(req, db=db)


class SpotlightQueryReq(BaseModel):
    query: str
    user_role: Optional[str] = "student"

@router.post("/spotlight/ask")
async def ask_global_spotlight_copilot(req: SpotlightQueryReq):
    """Pillar 2: Global Cmd+K spotlight AI assistant with instant action dispatching."""
    from db import db
    rag_res = await universal_rag_engine.query_knowledge_fabric(
        RAGQueryRequest(query=req.query, user_role=req.user_role),
        db=db
    )
    return {
        "ok": True,
        "answer": rag_res.answer,
        "citations": rag_res.citations,
        "confidence": rag_res.confidence,
        "suggested_actions": [
            {"label": "Explore Alumni Directory", "route": "/students/directory"},
            {"label": "View Live Job Openings", "route": "/students/jobs"},
            {"label": "Register for ECHO 2026", "route": "/echo"}
        ]
    }


@router.post("/career/ats-analyze", response_model=ATSScoreResponse)
async def ats_analyze_resume(req: ATSScoreRequest):
    """Pillar 3: Resume ATS matching, keyword gap analysis, and tailored bullet optimizer."""
    return await career_copilot_agent.analyze_ats_resume(req)


@router.post("/career/mock-interview-turn", response_model=MockInterviewTurnResponse)
async def mock_interview_turn(req: MockInterviewTurnRequest):
    """Pillar 3: Real-time technical mock interviewer rounds with scoring & rubric feedback."""
    return await career_copilot_agent.conduct_mock_interview_turn(req)


@router.get("/observability", response_model=AIObservabilityResponse)
async def get_ai_observability_telemetry():
    """Pillar 4: Real-time LLM token consumption, cost analytics, and vector index health."""
    from db import db
    return ai_observability.get_system_telemetry(db=db)


# ─── 5 Next-Generation Platform AI Agents ─────────────────────────────
from services.agents.voice_coach_agent import (
    voice_coach_agent,
    VoiceCoachingRequest,
    VoiceCoachingResponse,
)
from services.agents.hackathon_grader_agent import (
    hackathon_grader_agent,
    HackathonSubmissionGradeRequest,
    HackathonSubmissionGradeResponse,
)
from services.agents.matchmaker_agent import (
    matchmaker_agent,
    MatchmakerRequest,
    MatchmakerResponse,
)
from services.agents.ambassador_kit_agent import (
    ambassador_kit_agent,
    AmbassadorKitRequest,
    AmbassadorKitResponse,
)
from services.agents.accreditation_agent import (
    accreditation_agent,
    AccreditationReportRequest,
    AccreditationReportResponse,
)

@router.post("/voice-coach/analyze-speech", response_model=VoiceCoachingResponse)
async def analyze_speech_audio_coaching(req: VoiceCoachingRequest):
    """Next-Gen Agent 1: Real-time speech pace, filler word analysis, and verbal coaching."""
    return await voice_coach_agent.analyze_speech(req)


@router.post("/hackathon/auto-grade", response_model=HackathonSubmissionGradeResponse)
async def auto_grade_hackathon_project(req: HackathonSubmissionGradeRequest):
    """Next-Gen Agent 2: GitHub repo code quality, architecture audit, and judge rubric."""
    return await hackathon_grader_agent.evaluate_project(req)


@router.post("/matchmaker/find-matches", response_model=MatchmakerResponse)
async def find_smart_alumni_matches(req: MatchmakerRequest):
    """Next-Gen Agent 3: Smart student-alumni matchmaking and tailored outreach drafting."""
    from db import db
    return await matchmaker_agent.match_and_draft(req, db=db)


@router.post("/ambassador/generate-kit", response_model=AmbassadorKitResponse)
async def generate_campus_ambassador_kit(req: AmbassadorKitRequest):
    """Next-Gen Agent 4: Promotional social copy, WhatsApp broadcasts & marketing kit."""
    return await ambassador_kit_agent.generate_toolkit(req)


@router.post("/college/accreditation-dossier", response_model=AccreditationReportResponse)
async def generate_college_accreditation_dossier(req: AccreditationReportRequest):
    """Next-Gen Agent 5: NIRF / NAAC Criterion 5 compliance dossier compilation."""
    from db import db
    return await accreditation_agent.generate_dossier(req, db=db)


# ─── Graph-RAG Semantic Network Topology ──────────────────────────────
from services.agents.graph_rag_agent import (
    graph_rag_agent,
    GraphTopologyResponse,
)

class GraphTopologyReq(BaseModel):
    query: Optional[str] = None

@router.post("/graph-rag/topology", response_model=GraphTopologyResponse)
async def get_graph_rag_topology(req: Optional[GraphTopologyReq] = None):
    """Generates multidimensional Graph-RAG nodes and edges for visual network mapping."""
    from db import db
    q = req.query if req else None
    return await graph_rag_agent.get_network_topology(query=q, db=db)



