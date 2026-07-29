from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Header, Body, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import jwt
from server import limiter, JWT_SECRET, JWT_ALGORITHM
from core.middleware import get_real_ip
from bson import ObjectId

from core.db import db as _db
from agent_k.api.auth import resolve_user
from agent_k.api.prescriptions import (
    connected_ai_providers,
    is_admin,
    assert_ai_provider_or_412,
    PRESCRIPTION_FNS,
)
from agent_k.core.engine import process_message, stream_message
from agent_k.memory.history import ChatMemory
from agent_k.memory.models import RunRequest, StepApproveBody
from agent_k.memory.repository import (
    get_run_by_id, list_runs_for_user, get_user_prefs, update_user_prefs
)
from agent_k.tools.registry import TOOL_REGISTRY

router = APIRouter(tags=["agent-k"])

class ChatRequest(BaseModel):
    message: str
    
class FeedbackRequest(BaseModel):
    response_id: str
    is_helpful: bool
    comment: Optional[str] = None

def get_user_key(request: Request) -> str:
    auth = request.headers.get("authorization")
    if auth and auth.startswith("Bearer "):
        try:
            payload = jwt.decode(auth.split(" ")[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("sub"):
                return f"user:{payload['sub']}"
        except Exception:
            pass
    return f"ip:{get_real_ip(request)}"

@router.post("/agent-k/chat")
@limiter.limit("20/minute", key_func=get_user_key)
async def agent_k_chat(request: Request, body: ChatRequest, authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
        
    user_id = str(user["_id"])
    response = await process_message(user_id, body.message)
    return {"response": response}

@router.post("/agent-k/chat/stream")
@limiter.limit("20/minute", key_func=get_user_key)
async def agent_k_chat_stream(request: Request, body: ChatRequest, authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
        
    user_id = str(user["_id"])
    user_role = user.get("role", "student")
    
    async def event_generator():
        async for chunk in stream_message(user_id, body.message, user_role):
            # Replace newlines with spaces or just yield properly. SSE payloads require formatting.
            # To avoid SSE parsing issues with newlines in data, we can JSON-encode or just replace newlines.
            # Easiest way for a raw text stream is to just yield chunk and let client reconstruct,
            # or yield SSE strictly:
            import json
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/agent-k/chat/feedback")
async def agent_k_feedback(body: FeedbackRequest, authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
        
    memory = ChatMemory()
    success = await memory.add_feedback(body.response_id, body.is_helpful, body.comment)
    if not success:
        raise HTTPException(404, "Response not found")
    return {"status": "success"}

@router.get("/agent-k/analytics")
async def agent_k_analytics(authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
        
    memory = ChatMemory()
    metrics = await memory.get_dashboard_metrics()
    return metrics

# Legacy run routes removed.


@router.get("/agent-k/templates")
async def get_templates():
    """Pre-built automation templates grouped by SA module."""
    return {"templates": [
        {"module": "Career",     "icon": "briefcase-search-outline",   "title": "Find top SWE internships",            "prompt": "Search the top 5 SWE internships in India that match my profile and show me details."},
        {"module": "Career",     "icon": "file-document-edit-outline", "title": "Audit my profile vs goal",             "prompt": "Get my profile and identify 3 missing skills for my career goal."},
        {"module": "Career",     "icon": "email-edit-outline",         "title": "Draft cover letter (Stripe SWE)",      "prompt": "Draft a cover letter for a Software Engineer role at Stripe."},
        {"module": "Career",     "icon": "file-edit-outline",          "title": "Tailor CV for Google PM",              "prompt": "Tailor a CV summary for a Product Manager role at Google."},
        {"module": "Higher-Ed",  "icon": "school-outline",             "title": "Draft SOP for Stanford CS MS",         "prompt": "Draft a Statement of Purpose for the MS in Computer Science programme at Stanford University."},
        {"module": "Money",      "icon": "wallet-outline",             "title": "Wallet snapshot",                       "prompt": "Show me my current wallet balance, lifetime earnings and tier."},
        {"module": "Mentors",    "icon": "account-tie-voice-outline",  "title": "Find React mentors",                    "prompt": "Find 5 mentors with React or frontend expertise and list their rates."},
        {"module": "Network",    "icon": "message-draw",               "title": "Draft message to a senior alum",        "prompt": "Draft a short LinkedIn intro message to Suresh Rao asking for career advice."},
        {"module": "Learning",   "icon": "book-open-page-variant",     "title": "Free system design courses",            "prompt": "Find 5 free courses on system design."},
    ]}


@router.get("/agent-k/preferences")
async def get_prefs(authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    p = await get_user_prefs(str(user["_id"]))
    return {
        "auto_approve_read":              p.get("auto_approve_read", True),
        "auto_approve_write":             p.get("auto_approve_write", False),
        "auto_approve_spend_inr_limit":   p.get("auto_approve_spend_inr_limit", 0),
        "auto_approve_communicate":       p.get("auto_approve_communicate", False),
        "auto_approve_submit":            p.get("auto_approve_submit", False),
        "preferred_tone":                 p.get("preferred_tone", "concise"),
        "daily_run_limit":                p.get("daily_run_limit", 20),
    }


@router.patch("/agent-k/preferences")
async def patch_prefs(body: Dict[str, Any] = Body(...), authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    allowed = {"auto_approve_read", "auto_approve_write", "auto_approve_spend_inr_limit",
               "auto_approve_communicate", "auto_approve_submit", "preferred_tone", "daily_run_limit"}
    update = {k: body[k] for k in allowed if k in body}
    await update_user_prefs(str(user["_id"]), update)
    return {"ok": True}


@router.get("/user/preferences")
async def get_user_prefs_route(authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    p = (user.get("preferences") or {})
    return {
        "sidebar_collapsed": bool(p.get("sidebar_collapsed", False)),
        "preferred_tone":    p.get("preferred_tone", "concise"),
    }


@router.patch("/user/preferences")
async def patch_user_prefs(body: Dict[str, Any] = Body(...), authorization: Optional[str] = Header(None)):
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    allowed = {"sidebar_collapsed", "preferred_tone"}
    update = {f"preferences.{k}": body[k] for k in allowed if k in body}
    if not update:
        return {"ok": True}
    await _db.users.update_one({"_id": user["_id"]}, {"$set": update})
    return {"ok": True}


@router.get("/agent-k/installed-providers")
async def list_installed_ai_providers(authorization: Optional[str] = Header(None)):
    """List the AI providers the current user has connected in Marketplace.
    Returns `{providers: [...], can_use_agent_k: bool, is_admin: bool}`.
    """
    user = await resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    providers = await connected_ai_providers(str(user["_id"]))
    admin = is_admin(user)
    return {
        "providers": providers,
        "can_use_agent_k": admin or bool(providers),
        "is_admin": admin,
        "deeplink_marketplace": "/marketplace?category=AI",
    }


@router.get("/agent-k/prescriptions")
async def get_prescriptions(
    portal: str = "student",
    authorization: Optional[str] = Header(None),
):
    """Return portal-specific Agent K prescription cards."""
    user = await resolve_user(authorization)
    if not user:
        return {"portal": portal, "cards": [], "anonymous": True}
    portal_key = (portal or "student").lower()
    fn = PRESCRIPTION_FNS.get(portal_key, PRESCRIPTION_FNS["student"])
    cards = await fn(user)
    providers = await connected_ai_providers(str(user["_id"]))
    return {
        "portal":          portal_key,
        "cards":           cards,
        "ai_connected":    bool(providers),
        "is_admin":        is_admin(user),
        "deeplink_marketplace": "/marketplace?category=AI",
    }
