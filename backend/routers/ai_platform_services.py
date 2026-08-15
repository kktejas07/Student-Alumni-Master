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
    prefix="/api/ai",
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
