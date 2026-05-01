"""
AI Daily Brief — On-demand Claude integration.
==============================================
Generates personalized career briefings using Claude (via Emergent LLM key).
Called from the "Generate Brief" button on Student/Mentor/College dashboards.

Endpoint:
    POST /api/ai/daily-brief
    Body: {role: "student"|"mentor"|"college", email?: string}
    Returns: {brief: string, generated_at: ISO, model: str, tokens?: int}

Uses emergentintegrations LlmChat (Claude 4.5 Sonnet).
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

# Mongo
_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

router = APIRouter()


class BriefRequest(BaseModel):
    role: str
    email: Optional[str] = None


def _student_prompt(user: Dict[str, Any]) -> str:
    skills = (user.get("skills") or [])[:8]
    si = user.get("school_info") or {}
    sti = user.get("student_info") or {}
    tier = user.get("tier", "Bronze")
    return f"""
You are an AI career coach. Write a sharp, actionable, 4-sentence morning briefing for this student.
Reference their tier, skills, college, and graduation year. Suggest ONE concrete action for today.
Keep it under 80 words. No emojis. No salutations.

STUDENT CONTEXT:
- Name: {user.get('full_name', 'Student')}
- Tier: {tier} ({user.get('tier_score', 0)}/100)
- College: {si.get('institution_name', '—')} · {si.get('branch_or_stream', '—')}
- Graduation: {si.get('graduation_year', '—')}
- Skills: {', '.join(skills) if skills else 'none yet'}
- Career goal: {sti.get('career_goal', 'not set')}
""".strip()


def _mentor_prompt(user: Dict[str, Any]) -> str:
    mi = user.get("mentor_info") or {}
    tier = user.get("tier", "Bronze")
    return f"""
You are an AI assistant for a career mentor. Write a sharp 4-sentence briefing.
Reference their tier, sessions, and key topics. Suggest ONE action to grow their practice today.
Under 80 words. No emojis.

MENTOR CONTEXT:
- Name: {user.get('full_name', 'Mentor')}
- Tier: {tier} ({user.get('tier_score', 0)}/100)
- Title: {mi.get('job_title', '—')} at {mi.get('organization', '—')}
- Years experience: {mi.get('years_of_experience', '—')}
- Sessions completed: {user.get('sessions_completed', 0)}
- Skills: {', '.join((user.get('skills') or [])[:6])}
""".strip()


def _college_prompt(user: Dict[str, Any]) -> str:
    si = user.get("school_info") or {}
    return f"""
You are an AI assistant for a college admin. Write a sharp 4-sentence briefing.
Highlight a placement insight, an alumni metric, and ONE action for today.
Under 80 words. No emojis. Be data-driven.

COLLEGE CONTEXT:
- Institution: {si.get('institution_name', user.get('full_name', 'College'))}
- Tier: {user.get('tier', 'Bronze')} ({user.get('tier_score', 0)}/100)
""".strip()


@router.post("/ai/daily-brief")
async def daily_brief(req: BriefRequest):
    role = (req.role or "").lower()
    if role not in ("student", "mentor", "college"):
        raise HTTPException(400, "role must be student | mentor | college")

    # Resolve user
    q: Dict[str, Any] = {"role": role}
    if req.email:
        q["email"] = req.email
    user = await _db.users.find_one(q)
    if not user:
        user = await _db.users.find_one({"role": role})
    if not user:
        raise HTTPException(404, f"No {role} user found")

    # Compute tier on-the-fly if not persisted
    if not user.get("tier"):
        try:
            if role == "student":
                si = (user or {}).get("school_info") or {}
                cname = si.get("institution_name")
                naac = None
                if cname:
                    cmeta = await _db.colleges_meta.find_one({"name": cname})
                    if cmeta:
                        naac = cmeta.get("naac")
                tres = compute_student_tier(user, naac)
            elif role == "mentor":
                sess = await _db.bookings.count_documents({"mentor_id": str(user["_id"]), "status": {"$in": ["confirmed", "completed"]}})
                tres = compute_mentor_tier(user, sess, float(user.get("rating", 4.5)))
            else:
                si = (user or {}).get("school_info") or {}
                cname = si.get("institution_name") or user.get("full_name", "—")
                cmeta = await _db.colleges_meta.find_one({"name": cname}) or {}
                tres = compute_college_tier(cmeta.get("naac", "A"), 1000, 80.0, 5000)
            user["tier"] = tres["tier"]
            user["tier_score"] = tres["score"]
        except Exception:
            pass

    # Pick prompt
    if role == "student":
        system = "You are a concise career coach for Indian students."
        prompt = _student_prompt(user)
    elif role == "mentor":
        system = "You are an AI assistant for career mentors."
        prompt = _mentor_prompt(user)
    else:
        system = "You are an AI assistant for college placement admins."
        prompt = _college_prompt(user)

    # Call Claude via emergentintegrations
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        raise HTTPException(500, "emergentintegrations not installed on server")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY missing")

    session_id = f"brief-{role}-{uuid4().hex[:8]}"
    chat = (
        LlmChat(api_key=api_key, session_id=session_id, system_message=system)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )

    try:
        reply = await chat.send_message(UserMessage(text=prompt))
        text = (reply or "").strip()
    except Exception as e:
        raise HTTPException(502, f"LLM call failed: {e}")

    out = {
        "brief": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": "claude-sonnet-4-5",
        "role": role,
        "user_id": str(user["_id"]),
        "user_name": user.get("full_name"),
        "tier": user.get("tier"),
    }

    # Persist for analytics / replay
    try:
        await _db.ai_briefs.insert_one({
            **out,
            "occurred_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass

    return out
