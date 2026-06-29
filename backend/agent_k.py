"""
agent_k.py — Agent K automation operator backend.

Agent K is an automation-grade AI that can plan and execute multi-step
tasks across the SA platform on behalf of the user. Powered by Claude
(emergentintegrations LlmChat) with a JSON-based tool-use loop.

Tools are categorised by side-effect:
  read         — fetch data (always auto-approved)
  write        — create drafts (no permanent change)
  spend        — costs money / credits        [DISABLED until Chunk 3]
  submit       — submits to external systems  [DISABLED until Chunk 3]
  communicate  — sends a message              [DISABLED until Chunk 3]

Endpoints (all under /api):
  POST /agent-k/run                 — submit prompt → plan
  POST /agent-k/runs/:id/execute    — execute approved plan
  POST /agent-k/runs/:id/approve    — approve a single step
  POST /agent-k/runs/:id/cancel     — cancel run
  GET  /agent-k/runs                — list runs
  GET  /agent-k/runs/:id            — single run with audit log
  GET  /agent-k/templates           — automation catalog
  GET  /agent-k/preferences         — auto-approve settings
  PATCH /agent-k/preferences

Collections:
  agent_runs         { _id, user_id, prompt, status, plan, steps,
                       audit_log, cost_summary, started_at, completed_at }
  agent_k_prefs      { user_id, auto_approve_read, auto_approve_write, ... }
"""
from __future__ import annotations
from pathlib import Path

from __future__ import annotations


async def _get_best_ai_key() -> tuple:
    """Returns (api_key, model_name, provider) from best available source.
    Priority: Marketplace installed tools > Emergent env var."""
    # 1. Check marketplace for Claude/Anthropic
    claude = await _db.installed_tools.find_one({"tool_id": "claude", "status": "connected"})
    if claude and claude.get("credentials", {}).get("api_key"):
        return (claude["credentials"]["api_key"],
                "claude-sonnet-4-5-20250929", "anthropic")

    # 2. Check for OpenAI
    openai = await _db.installed_tools.find_one({"tool_id": "openai", "status": "connected"})
    if openai and openai.get("credentials", {}).get("api_key"):
        return (openai["credentials"]["api_key"],
                "gpt-4o", "openai")

    # 3. Check for Gemini
    gemini = await _db.installed_tools.find_one({"tool_id": "gemini", "status": "connected"})
    if gemini and gemini.get("credentials", {}).get("api_key"):
        return (gemini["credentials"]["api_key"],
                "gemini-1.5-flash", "google")

    # 4. Fall back to Emergent env var
    emergent = os.environ.get("EMERGENT_LLM_KEY")
    if emergent:
        return (emergent, "claude-sonnet-4-5-20250929", "anthropic")

    return ("", "", "")


import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Header, Body
from pydantic import BaseModel


router = APIRouter(tags=["agent-k"])
log = logging.getLogger("agent-k")

# ─────────────────────────────────────────────────────────────────
# Tool Registry — 5 read-only tools wired to existing endpoints.
# Spend/submit/communicate tools defined but flagged disabled.
# ─────────────────────────────────────────────────────────────────
TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "search_jobs": {
        "module": "jobs",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Search for internships/jobs matching criteria. "
                       "Returns top matches with role, company, location, match%.",
        "parameters": {
            "type": "object",
            "properties": {
                "role":     {"type": "string", "description": "e.g. 'SWE intern'"},
                "location": {"type": "string", "description": "e.g. 'India'"},
                "limit":    {"type": "integer", "default": 5, "maximum": 20},
            },
        },
    },
    "get_wallet_balance": {
        "module": "wallet",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Get current SA wallet balance + lifetime earnings + tier.",
        "parameters": {"type": "object", "properties": {}},
    },
    "search_mentors": {
        "module": "mentors",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Find mentors by skill/role. Returns top matches with rating, sessions, price.",
        "parameters": {
            "type": "object",
            "properties": {
                "expertise": {"type": "string"},
                "limit":     {"type": "integer", "default": 5, "maximum": 10},
            },
        },
    },
    "search_courses": {
        "module": "courses",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Search SA marketplace + free MOOCs by skill/topic.",
        "parameters": {
            "type": "object",
            "properties": {
                "topic":     {"type": "string"},
                "free_only": {"type": "boolean", "default": False},
                "limit":     {"type": "integer", "default": 5, "maximum": 10},
            },
        },
    },
    "get_profile": {
        "module": "profile",
        "side_effect": "read",
        "requires_approval": False,
        "enabled": True,
        "description": "Get the user's own profile (skills, tier, career goal, year).",
        "parameters": {"type": "object", "properties": {}},
    },
    # ── Write tools (Chunk 2: ENABLED — generate drafts only, no submission) ──
    "draft_application": {
        "module": "jobs", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Draft a job application cover letter for a specific role. Stores draft, does NOT submit.",
        "parameters": {"type": "object", "properties": {
            "role":    {"type": "string", "description": "Job title"},
            "company": {"type": "string", "description": "Company name"},
        }},
    },
    "tailor_cv_for_job": {
        "module": "jobs", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Tailor a short CV summary for a specific role.",
        "parameters": {"type": "object", "properties": {
            "role":    {"type": "string"},
            "company": {"type": "string"},
        }},
    },
    "draft_sop": {
        "module": "higher-ed", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Draft a Statement of Purpose for a programme.",
        "parameters": {"type": "object", "properties": {
            "programme":  {"type": "string"},
            "university": {"type": "string"},
        }},
    },
    "draft_message": {
        "module": "network", "side_effect": "write", "requires_approval": False, "enabled": True,
        "description": "Draft a connection / introduction message.",
        "parameters": {"type": "object", "properties": {
            "recipient_name": {"type": "string"},
            "purpose":        {"type": "string"},
        }},
    },
    "add_money_to_wallet":    {"module": "wallet",     "side_effect": "spend",       "requires_approval": True,  "enabled": True,  "description": "Top up the SA wallet via UPI. Requires approval. (MOCKED in this build — no real payment.)", "parameters": {"type": "object", "properties": {"amount_inr": {"type": "integer"}}}},
    "withdraw_to_upi":        {"module": "wallet",     "side_effect": "spend",       "requires_approval": True,  "enabled": False, "description": "Withdraw earned credits.",                       "parameters": {"type": "object"}},
    "book_mentor_session":    {"module": "mentors",    "side_effect": "spend",       "requires_approval": True,  "enabled": True,  "description": "Book a mentor session — requires approval. (MOCKED — creates a pending booking, no payment.)", "parameters": {"type": "object", "properties": {"mentor_id": {"type": "string"}, "topic": {"type": "string"}}}},
    "submit_application":     {"module": "jobs",       "side_effect": "submit",      "requires_approval": True,  "enabled": True,  "description": "Submit a previously-drafted application — requires approval. (MOCKED — records intent, does not contact partner ATS.)", "parameters": {"type": "object", "properties": {"draft_id": {"type": "string"}, "role": {"type": "string"}, "company": {"type": "string"}}}},
    "send_message":           {"module": "network",    "side_effect": "communicate", "requires_approval": True,  "enabled": True,  "description": "Send a drafted message to a connection — requires approval. (MOCKED — records intent, does not actually send.)", "parameters": {"type": "object", "properties": {"recipient_name": {"type": "string"}, "message": {"type": "string"}}}},
}


# ─── Tool dispatchers (read-only) ──────────────────────────────────
async def _tool_search_jobs(args: dict, user: dict) -> dict:
    role = (args.get("role") or "").lower()
    location = (args.get("location") or "").lower()
    limit = min(int(args.get("limit") or 5), 20)
    q: Dict[str, Any] = {}
    cur = _db.internships.find(q).limit(limit)
    out = []
    async for it in cur:
        title = (it.get("title") or "")
        loc = (it.get("location") or "")
        # Cheap relevance filter
        if role and role not in title.lower():
            continue
        if location and location not in loc.lower():
            continue
        out.append({
            "id": str(it.get("_id")),
            "role": title,
            "company": it.get("company"),
            "location": loc,
            "stipend": it.get("stipend"),
            "deadline": (it.get("deadline").isoformat() if isinstance(it.get("deadline"), datetime) else None),
            "match": 80 + (len(out) * 2),
        })
    return {"count": len(out), "results": out}


async def _tool_get_wallet_balance(args: dict, user: dict) -> dict:
    sid = str(user.get("_id", ""))
    bal = await _db.wallet_balances.find_one({"user_id": sid}) or {}
    return {
        "credits": bal.get("credits", 0),
        "inr_value": bal.get("inr_value", 0),
        "lifetime_earned": bal.get("lifetime_earned", 0),
        "lifetime_spent": bal.get("lifetime_spent", 0),
        "tier": (user.get("tier") or {}).get("tier", "Bronze"),
    }


async def _tool_search_mentors(args: dict, user: dict) -> dict:
    expertise = (args.get("expertise") or "").lower()
    limit = min(int(args.get("limit") or 5), 10)
    cur = _db.users.find({"role": "mentor", "mentor_status": "approved"}).limit(limit)
    out = []
    async for m in cur:
        info = m.get("mentor_info") or {}
        skills_str = " ".join(m.get("skills", []) + [info.get("job_title", "")]).lower()
        if expertise and expertise not in skills_str:
            continue
        out.append({
            "id": str(m["_id"]),
            "name": m.get("full_name"),
            "role": info.get("job_title"),
            "company": info.get("organization"),
            "rating": m.get("rating") or 4.9,
            "price": m.get("expected_rate_inr") or 999,
        })
    return {"count": len(out), "results": out}


async def _tool_search_courses(args: dict, user: dict) -> dict:
    topic = (args.get("topic") or "").lower()
    free_only = bool(args.get("free_only", False))
    limit = min(int(args.get("limit") or 5), 10)
    q: Dict[str, Any] = {}
    if free_only:
        q["price"] = 0
    cur = _db.courses.find(q).limit(limit)
    out = []
    async for c in cur:
        title = (c.get("title") or "")
        if topic and topic not in title.lower():
            continue
        out.append({
            "id": str(c.get("_id")),
            "title": title,
            "provider": c.get("provider"),
            "price": c.get("price", 0),
            "rating": c.get("rating") or 4.5,
        })
    return {"count": len(out), "results": out}


async def _tool_get_profile(args: dict, user: dict) -> dict:
    return {
        "id":     str(user.get("_id", "")),
        "name":   user.get("full_name"),
        "email":  user.get("email"),
        "year":   (user.get("school_info") or {}).get("graduation_year"),
        "skills": user.get("skills", []),
        "tier":   (user.get("tier") or {}).get("tier"),
        "career_goal": (user.get("student_info") or {}).get("career_goal"),
    }


async def _generate_text(prompt: str, system: str = "You are a helpful drafting assistant.") -> str:
    """Helper: ask Claude to generate a short piece of text and return it raw."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        return "(LLM unavailable in this environment.)"
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return "(EMERGENT_LLM_KEY missing.)"
    chat = (
        LlmChat(api_key=api_key, session_id=f"agentk-draft-{uuid4().hex[:8]}", system_message=system)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )
    try:
        return ((await chat.send_message(UserMessage(text=prompt))) or "").strip()
    except Exception as e:
        return f"(Draft generation failed: {e})"


async def _tool_draft_application(args: dict, user: dict) -> dict:
    role = args.get("role") or "the role"
    company = args.get("company") or "the company"
    skills = ", ".join((user.get("skills") or [])[:5]) or "various technical skills"
    goal = (user.get("student_info") or {}).get("career_goal") or "starting a strong career"
    name = user.get("full_name") or "the applicant"
    text = await _generate_text(
        f"Write a concise, professional cover-letter draft (about 120 words) "
        f"for {name} applying to {role} at {company}. Skills to highlight: {skills}. "
        f"Career goal: {goal}. Tone: confident but humble. Do not invent companies "
        f"or projects. Sign off with 'Best regards,' and the name.",
        system="You are an expert career-coach drafting cover letters.",
    )
    sid = str(user.get("_id"))
    saved = await _db.agent_drafts.insert_one({
        "user_id": sid, "kind": "cover_letter", "role": role, "company": company,
        "body": text, "created_at": datetime.now(timezone.utc),
    })
    return {"draft_id": str(saved.inserted_id), "body": text, "word_count": len(text.split())}


async def _tool_tailor_cv_for_job(args: dict, user: dict) -> dict:
    role = args.get("role") or "the role"
    company = args.get("company") or "the company"
    skills = ", ".join((user.get("skills") or [])[:8]) or "—"
    text = await _generate_text(
        f"Write a 4-bullet CV summary tailored for {role} at {company}. "
        f"Skills to emphasise: {skills}. Use strong action verbs. Each bullet ~14-20 words.",
        system="You are an expert resume writer.",
    )
    return {"summary": text}


async def _tool_draft_sop(args: dict, user: dict) -> dict:
    programme = args.get("programme") or "the programme"
    university = args.get("university") or "the university"
    skills = ", ".join((user.get("skills") or [])[:5]) or "—"
    goal = (user.get("student_info") or {}).get("career_goal") or "advancing my career"
    text = await _generate_text(
        f"Draft a Statement of Purpose (about 200 words) for applying to {programme} at "
        f"{university}. Background skills: {skills}. Long-term goal: {goal}. "
        f"Style: scholarly, specific, motivated. Avoid clichés.",
        system="You are an admissions essay coach.",
    )
    sid = str(user.get("_id"))
    saved = await _db.agent_drafts.insert_one({
        "user_id": sid, "kind": "sop", "programme": programme, "university": university,
        "body": text, "created_at": datetime.now(timezone.utc),
    })
    return {"draft_id": str(saved.inserted_id), "body": text, "word_count": len(text.split())}


async def _tool_draft_message(args: dict, user: dict) -> dict:
    recipient = args.get("recipient_name") or "the recipient"
    purpose = args.get("purpose") or "to introduce myself"
    name = user.get("full_name") or "Student"
    text = await _generate_text(
        f"Draft a polite ~80-word LinkedIn-style intro message from {name} "
        f"to {recipient}. Purpose: {purpose}. Tone: warm, confident, low-pressure. "
        f"Do NOT include a subject line. End with 'Looking forward to connecting.'",
        system="You are a professional networking coach.",
    )
    return {"message": text}


_TOOL_DISPATCH = {
    "search_jobs":         _tool_search_jobs,
    "get_wallet_balance":  _tool_get_wallet_balance,
    "search_mentors":      _tool_search_mentors,
    "search_courses":      _tool_search_courses,
    "get_profile":         _tool_get_profile,
    # Write tools — generate drafts using Claude (Chunk 2)
    "draft_application":   _tool_draft_application,
    "tailor_cv_for_job":   _tool_tailor_cv_for_job,
    "draft_sop":           _tool_draft_sop,
    "draft_message":       _tool_draft_message,
}


# ─── Auth helper (decodes JWT and loads user) ─────────────────────
import jwt as _jwt

from core.db import db as _db
_JWT_SECRET = os.environ.get("JWT_SECRET", "")
_JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")

async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = _jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALG])
        if payload.get("type") != "access":
            return None
    except Exception:
        return None
    from bson import ObjectId
    try:
        return await _db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        return await _db.users.find_one({"_id": payload["sub"]})


# ─── LLM planner ───────────────────────────────────────────────────
def _enabled_tool_summary() -> str:
    """Compact summary of enabled tools for the planner prompt."""
    lines = []
    for name, t in TOOL_REGISTRY.items():
        if not t.get("enabled"):
            continue
        params = json.dumps(t.get("parameters", {}).get("properties", {}), separators=(",", ":"))
        lines.append(f"- {name} ({t['module']}, {t['side_effect']}): {t['description']}  params={params}")
    return "\n".join(lines)


PLANNER_SYSTEM = """You are Agent K, an automation operator inside the SA platform.

Your job: given a user request, produce a JSON plan of tool calls that will
satisfy it. Return ONLY a single JSON object with this exact shape:

{
  "summary": "one-line description of what you'll do",
  "estimated_runtime_seconds": <int>,
  "steps": [
    {
      "tool": "<tool_name from the registry>",
      "args": { ... },
      "rationale": "why this step"
    }
  ],
  "requires_clarification": "<question to ask user, or empty string>"
}

RULES:
- Use only tools from the provided registry. If a needed tool is disabled or
  missing, set requires_clarification asking the user to do that part manually.
- Plan at most 6 steps.
- If the request is ambiguous, set requires_clarification with a SINGLE specific question.
- Do NOT include any prose outside the JSON block.
- Keep arg values simple (strings, numbers, booleans).
"""


async def _plan_with_claude(prompt: str, user: dict) -> dict:
    """Call Claude to produce a JSON plan. Returns parsed dict."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        raise HTTPException(500, "emergentintegrations not installed")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY missing")

    tools_block = _enabled_tool_summary()
    system = (
        PLANNER_SYSTEM
        + "\n\nAVAILABLE TOOLS:\n" + tools_block
        + f"\n\nUSER CONTEXT: name={user.get('full_name')}, "
          f"tier={(user.get('tier') or {}).get('tier','—')}, "
          f"role={user.get('role')}, "
          f"goal={(user.get('student_info') or {}).get('career_goal','—')}"
    )

    chat = (
        LlmChat(api_key=api_key, session_id=f"agentk-plan-{uuid4().hex[:8]}",
                system_message=system)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )
    try:
        reply = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        raise HTTPException(502, f"LLM planner failed: {e}")

    text = (reply or "").strip()
    # Extract first JSON block
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < 0:
        raise HTTPException(502, f"Planner returned non-JSON: {text[:200]}")
    try:
        plan = json.loads(text[start:end + 1])
    except Exception as e:
        raise HTTPException(502, f"Plan JSON parse failed: {e}")

    plan.setdefault("steps", [])
    plan.setdefault("summary", "")
    plan.setdefault("estimated_runtime_seconds", max(2, len(plan["steps"]) * 3))
    plan.setdefault("requires_clarification", "")
    return plan


async def _summarize_results(prompt: str, plan: dict, step_results: list, user: dict) -> str:
    """Generate a final natural-language summary of what was done."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        return f"Done. Executed {len(step_results)} steps."
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return f"Done. Executed {len(step_results)} steps."
    summary_prompt = (
        f"User asked: {prompt}\n\n"
        f"Plan summary: {plan.get('summary','')}\n"
        f"Step results (JSON): {json.dumps(step_results, default=str)[:2000]}\n\n"
        "Write a 2-3 sentence summary for the user describing what was found / done. "
        "If results are empty, be honest. Keep it concise and friendly."
    )
    chat = (
        LlmChat(api_key=api_key, session_id=f"agentk-sum-{uuid4().hex[:8]}",
                system_message="You write concise post-execution summaries for an automation agent.")
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )
    try:
        reply = await chat.send_message(UserMessage(text=summary_prompt))
        return (reply or "").strip()
    except Exception:
        return f"Done. Executed {len(step_results)} steps."


# ─── Pydantic models ──────────────────────────────────────────────
class RunRequest(BaseModel):
    prompt: str
    auto_execute: Optional[bool] = False  # if True, skip preview and run immediately for read-only plans


# ─── Endpoints ────────────────────────────────────────────────────
@router.post("/agent-k/run")
async def create_run(body: RunRequest, authorization: Optional[str] = Header(None)):
    """Plan a new run. Returns the plan + run_id; the client previews it
    and POSTs to /runs/:id/execute to actually run."""
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")

    # BYO-AI gate — non-admin users must connect an AI provider in Marketplace first.
    await _assert_ai_provider_or_412(user)

    plan = await _plan_with_claude(body.prompt, user)
    now = datetime.now(timezone.utc)
    run_doc = {
        "user_id": str(user["_id"]),
        "user_email": user.get("email"),
        "prompt": body.prompt,
        "status": "awaiting_approval" if plan["steps"] else "completed",
        "plan": plan,
        "steps": [],
        "audit_log": [{"t": now.isoformat(), "event": "plan_created", "details": plan.get("summary")}],
        "started_at": now,
        "completed_at": None,
        "result_summary": None,
    }
    res = await _db.agent_runs.insert_one(run_doc)
    run_id = str(res.inserted_id)

    # If user explicitly asked auto-execute and plan has no approval-required tools, run now.
    # (read + write/draft tools are safe; spend/submit/communicate require explicit approval.)
    if body.auto_execute and plan["steps"] and all(
        not TOOL_REGISTRY.get(s.get("tool", ""), {}).get("requires_approval", True)
        for s in plan["steps"]
    ):
        await _execute_run(run_id, user)

    return {"run_id": run_id, "plan": plan, "status": run_doc["status"]}


async def _execute_run(run_id: str, user: dict) -> dict:
    """Run all steps in the plan sequentially.

    Read + write/draft tools auto-execute. Spend/submit/communicate tools
    pause execution at that step (status='awaiting_approval', pending_step_index=i).
    Frontend polls and calls /runs/:id/approve {step_index} to resume.
    """
    from bson import ObjectId
    run = await _db.agent_runs.find_one({"_id": ObjectId(run_id)})
    if not run:
        raise HTTPException(404, "Run not found")
    if run["status"] not in {"awaiting_approval", "running", "awaiting_step_approval"}:
        raise HTTPException(400, f"Cannot execute run in status '{run['status']}'")

    await _db.agent_runs.update_one({"_id": ObjectId(run_id)}, {"$set": {"status": "running"}})
    plan = run["plan"]
    step_results = list(run.get("steps", []))
    audit = list(run.get("audit_log", []))
    approvals = run.get("step_approvals", {}) or {}
    plan_steps = plan.get("steps", [])

    # Resume from the first un-completed/un-skipped index
    completed_idx = {r["index"] for r in step_results if r.get("status") in {"completed", "skipped", "failed"}}
    start = next((i for i in range(len(plan_steps)) if i not in completed_idx), len(plan_steps))

    for idx in range(start, len(plan_steps)):
        step = plan_steps[idx]
        tool_name = step.get("tool")
        args = step.get("args", {}) or {}
        meta = TOOL_REGISTRY.get(tool_name)
        t0 = datetime.now(timezone.utc)

        if not meta or not meta.get("enabled") or tool_name not in _TOOL_DISPATCH:
            err = f"Tool '{tool_name}' is unavailable in this build."
            step_results.append({"index": idx, "tool": tool_name, "args": args,
                                 "status": "skipped", "error": err,
                                 "started_at": t0.isoformat()})
            audit.append({"t": t0.isoformat(), "event": "step_skipped", "tool": tool_name, "reason": err})
            continue

        # Approval gate: spend / submit / communicate need explicit consent
        # unless user pre-approved this step or has auto-approve preference.
        if meta.get("requires_approval") and approvals.get(str(idx)) != "approved":
            await _db.agent_runs.update_one(
                {"_id": ObjectId(run_id)},
                {"$set": {
                    "status": "awaiting_step_approval",
                    "pending_step_index": idx,
                    "steps": step_results,
                    "audit_log": audit + [{"t": t0.isoformat(), "event": "awaiting_approval",
                                           "tool": tool_name, "step": idx}],
                }},
            )
            return {"run_id": run_id, "status": "awaiting_step_approval",
                    "pending_step_index": idx, "tool": tool_name, "args": args,
                    "side_effect": meta.get("side_effect")}

        try:
            result = await _TOOL_DISPATCH[tool_name](args, user)
            step_results.append({
                "index": idx, "tool": tool_name, "args": args,
                "status": "completed", "result": result,
                "started_at": t0.isoformat(),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
            audit.append({"t": t0.isoformat(), "event": "step_completed", "tool": tool_name})
        except Exception as e:
            step_results.append({"index": idx, "tool": tool_name, "args": args,
                                 "status": "failed", "error": str(e),
                                 "started_at": t0.isoformat()})
            audit.append({"t": t0.isoformat(), "event": "step_failed", "tool": tool_name, "error": str(e)})

    summary = await _summarize_results(run["prompt"], plan, step_results, user)
    completed = datetime.now(timezone.utc)
    await _db.agent_runs.update_one(
        {"_id": ObjectId(run_id)},
        {"$set": {
            "status": "completed",
            "steps": step_results,
            "audit_log": audit,
            "result_summary": summary,
            "completed_at": completed,
            "pending_step_index": None,
        }},
    )
    return {"run_id": run_id, "status": "completed", "steps": step_results, "result_summary": summary}


# ─── Spend / Submit / Communicate dispatchers (MOCKED — Chunk 3) ──
# These tools are gated by an explicit user-approval card in the UI.
# They write a row into agent_actions (kind='mock_*') so the audit trail
# is preserved, but they DO NOT make real payments / API calls / send
# messages. Wiring real partner ATS / Razorpay / SMS lives behind these
# stubs in production.
async def _tool_add_money_to_wallet(args: dict, user: dict) -> dict:
    amount = int(args.get("amount_inr") or 0)
    rec = await _db.agent_actions.insert_one({
        "user_id": str(user.get("_id")), "kind": "mock_wallet_topup",
        "amount_inr": amount, "status": "mock_success",
        "created_at": datetime.now(timezone.utc),
    })
    return {"action_id": str(rec.inserted_id), "amount_inr": amount,
            "status": "mock_success",
            "note": "Mock top-up recorded. Real payment integration is out of scope in this build."}


async def _tool_book_mentor_session(args: dict, user: dict) -> dict:
    rec = await _db.agent_actions.insert_one({
        "user_id": str(user.get("_id")), "kind": "mock_mentor_booking",
        "mentor_id": args.get("mentor_id"), "topic": args.get("topic"),
        "status": "mock_pending",
        "created_at": datetime.now(timezone.utc),
    })
    return {"action_id": str(rec.inserted_id), "status": "mock_pending",
            "note": "Mock booking recorded. Real mentor calendar sync is out of scope in this build."}


async def _tool_submit_application(args: dict, user: dict) -> dict:
    rec = await _db.agent_actions.insert_one({
        "user_id": str(user.get("_id")), "kind": "mock_application_submission",
        "draft_id": args.get("draft_id"),
        "role": args.get("role"), "company": args.get("company"),
        "status": "mock_recorded",
        "created_at": datetime.now(timezone.utc),
    })
    return {"action_id": str(rec.inserted_id), "status": "mock_recorded",
            "note": "Mock submission recorded. Real partner ATS forwarding is out of scope in this build."}


async def _tool_send_message(args: dict, user: dict) -> dict:
    rec = await _db.agent_actions.insert_one({
        "user_id": str(user.get("_id")), "kind": "mock_message_send",
        "recipient_name": args.get("recipient_name"),
        "message": args.get("message"),
        "status": "mock_queued",
        "created_at": datetime.now(timezone.utc),
    })
    return {"action_id": str(rec.inserted_id), "status": "mock_queued",
            "note": "Mock message recorded. Real send (LinkedIn/email) is out of scope in this build."}


_TOOL_DISPATCH.update({
    "add_money_to_wallet":  _tool_add_money_to_wallet,
    "book_mentor_session":  _tool_book_mentor_session,
    "submit_application":   _tool_submit_application,
    "send_message":         _tool_send_message,
})


# ─── Per-step approval endpoint ───────────────────────────────────
class StepApproveBody(BaseModel):
    step_index: int
    decision: str  # 'approved' | 'rejected'
    reason: Optional[str] = None


@router.post("/agent-k/runs/{run_id}/approve-step")
async def approve_step(run_id: str, body: StepApproveBody, authorization: Optional[str] = Header(None)):
    """Approve or reject a single pending step. On 'approved' the run resumes;
    on 'rejected' the run is cancelled with the reason logged."""
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    from bson import ObjectId
    run = await _db.agent_runs.find_one({"_id": ObjectId(run_id), "user_id": str(user["_id"])})
    if not run:
        raise HTTPException(404, "Run not found")
    if run.get("status") != "awaiting_step_approval":
        raise HTTPException(400, f"Run is not awaiting approval (status={run.get('status')})")
    if body.decision == "rejected":
        await _db.agent_runs.update_one(
            {"_id": ObjectId(run_id)},
            {"$set": {"status": "cancelled",
                      "completed_at": datetime.now(timezone.utc),
                      "result_summary": f"Cancelled by user at step {body.step_index}." +
                                        (f" Reason: {body.reason}" if body.reason else "")},
             "$push": {"audit_log": {"t": datetime.now(timezone.utc).isoformat(),
                                     "event": "step_rejected", "step": body.step_index,
                                     "reason": body.reason}}},
        )
        return {"ok": True, "status": "cancelled"}
    # approved — record and resume
    approvals = run.get("step_approvals", {}) or {}
    approvals[str(body.step_index)] = "approved"
    await _db.agent_runs.update_one(
        {"_id": ObjectId(run_id)},
        {"$set": {"step_approvals": approvals, "status": "running"},
         "$push": {"audit_log": {"t": datetime.now(timezone.utc).isoformat(),
                                 "event": "step_approved", "step": body.step_index}}},
    )
    return await _execute_run(run_id, user)


@router.post("/agent-k/runs/{run_id}/execute")
async def execute_run(run_id: str, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return await _execute_run(run_id, user)


@router.post("/agent-k/runs/{run_id}/cancel")
async def cancel_run(run_id: str, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    from bson import ObjectId
    res = await _db.agent_runs.update_one(
        {"_id": ObjectId(run_id), "user_id": str(user["_id"])},
        {"$set": {"status": "cancelled", "completed_at": datetime.now(timezone.utc)}},
    )
    if not res.matched_count:
        raise HTTPException(404, "Run not found")
    return {"ok": True}


@router.get("/agent-k/runs")
async def list_runs(limit: int = 20, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    cur = _db.agent_runs.find({"user_id": str(user["_id"])}).sort("started_at", -1).limit(limit)
    out = []
    async for r in cur:
        out.append({
            "id":       str(r["_id"]),
            "prompt":   r.get("prompt"),
            "status":   r.get("status"),
            "summary":  r.get("plan", {}).get("summary"),
            "steps_n":  len(r.get("steps", [])),
            "started_at": (r.get("started_at") or datetime.now(timezone.utc)).isoformat(),
            "result_summary": r.get("result_summary"),
        })
    return {"runs": out}


@router.get("/agent-k/runs/{run_id}")
async def get_run(run_id: str, authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    from bson import ObjectId
    r = await _db.agent_runs.find_one({"_id": ObjectId(run_id), "user_id": str(user["_id"])})
    if not r:
        raise HTTPException(404, "Run not found")
    r["id"] = str(r.pop("_id"))
    if isinstance(r.get("started_at"), datetime):
        r["started_at"] = r["started_at"].isoformat()
    if isinstance(r.get("completed_at"), datetime):
        r["completed_at"] = r["completed_at"].isoformat()
    return r


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
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    p = await _db.agent_k_prefs.find_one({"user_id": str(user["_id"])}) or {}
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
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    allowed = {"auto_approve_read", "auto_approve_write", "auto_approve_spend_inr_limit",
               "auto_approve_communicate", "auto_approve_submit", "preferred_tone", "daily_run_limit"}
    update = {k: body[k] for k in allowed if k in body}
    update["updated_at"] = datetime.now(timezone.utc)
    await _db.agent_k_prefs.update_one(
        {"user_id": str(user["_id"])}, {"$set": update}, upsert=True,
    )
    return {"ok": True}


# ─── User sidebar collapse preference ─────────────────────────────
@router.get("/user/preferences")
async def get_user_prefs(authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    p = (user.get("preferences") or {})
    return {
        "sidebar_collapsed": bool(p.get("sidebar_collapsed", False)),
        "preferred_tone":    p.get("preferred_tone", "concise"),
    }


@router.patch("/user/preferences")
async def patch_user_prefs(body: Dict[str, Any] = Body(...), authorization: Optional[str] = Header(None)):
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    allowed = {"sidebar_collapsed", "preferred_tone"}
    update = {f"preferences.{k}": body[k] for k in allowed if k in body}
    if not update:
        return {"ok": True}
    await _db.users.update_one({"_id": user["_id"]}, {"$set": update})
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────
# BYO-AI gating + Prescription Cards (v0.14.0)
# ─────────────────────────────────────────────────────────────────────
# Behaviour:
#   1.  Users must connect at least one AI provider (OpenAI / Anthropic /
#       Gemini / etc.) in the Marketplace before invoking Agent K.
#       `_assert_ai_provider_or_412` is called from /agent-k/run.
#   2.  Agent K shows portal-specific "prescription cards" derived from
#       the active dashboard (no new AI calls — pure data shaping).
#   3.  Admin role bypasses the gate (so platform owners can demo /
#       support without configuring keys).
# ─────────────────────────────────────────────────────────────────────

_AI_PROVIDER_IDS = {
    "openai", "claude", "anthropic", "gemini", "google",
    "mistral", "cohere", "perplexity", "groq", "together-ai",
    "fireworks-ai", "huggingface", "deepseek",
}


async def _connected_ai_providers(user_id: str) -> List[Dict[str, str]]:
    """Return the AI tools this user has marked `connected` in installed_tools."""
    cur = _db.installed_tools.find({"user_id": user_id, "status": "connected"})
    out: List[Dict[str, str]] = []
    async for row in cur:
        tid = row.get("tool_id", "")
        if tid in _AI_PROVIDER_IDS:
            out.append({
                "tool_id": tid,
                "label": row.get("label") or tid.replace("-", " ").title(),
                "connected_at": (row.get("connected_at") or "").__str__(),
            })
    return out


def _is_admin(user: dict) -> bool:
    role = (user.get("role") or "").lower()
    return role == "admin"


async def _assert_ai_provider_or_412(user: dict) -> None:
    """Raise 412 if the (non-admin) user hasn't connected any AI tool."""
    if _is_admin(user):
        return
    providers = await _connected_ai_providers(str(user["_id"]))
    if not providers:
        raise HTTPException(
            status_code=412,
            detail={
                "setup_required": "ai_provider",
                "message": "Connect an AI provider (OpenAI, Anthropic, Gemini, …) in the Marketplace before using Agent K.",
                "deeplink": "/marketplace?category=AI",
            },
        )


@router.get("/agent-k/installed-providers")
async def list_installed_ai_providers(authorization: Optional[str] = Header(None)):
    """List the AI providers the current user has connected in Marketplace.
    Returns `{providers: [...], can_use_agent_k: bool, is_admin: bool}`.
    """
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    providers = await _connected_ai_providers(str(user["_id"]))
    admin = _is_admin(user)
    return {
        "providers": providers,
        "can_use_agent_k": admin or bool(providers),
        "is_admin": admin,
        "deeplink_marketplace": "/marketplace?category=AI",
    }


# ─── Prescription Cards ─────────────────────────────────────────────
# Each portal returns the recommendations its dashboard already
# computes — re-shaped as one-click "Run this for me" cards.
# Cards are POJOs — Agent K UI renders them, user taps → triggers the
# pre-canned prompt against THEIR AI provider.

class PrescriptionCard(BaseModel):
    id: str                       # stable hash so UI can dedupe
    icon: str                     # lucide name
    tint: str                     # hex used for the tinted icon box
    kicker: str                   # e.g. "TOP MATCH" / "SKILL GAP"
    title: str                    # one-line headline
    subtitle: Optional[str] = None
    cta: str                      # button label ("Draft my application")
    prompt: str                   # the prompt that gets sent to Agent K
    tools: List[str] = []         # which Agent K tools this run is expected to use


def _stable_id(*parts: str) -> str:
    import hashlib
    return hashlib.md5("|".join(parts).encode("utf-8")).hexdigest()[:10]


async def _prescriptions_student(user: dict) -> List[Dict[str, Any]]:
    cards: List[Dict[str, Any]] = []
    email = user.get("email") or ""
    # Top job match → draft application
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
    # Skill gap → find courses
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
    # Mentor recommendation → book + intro msg
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
    # Profile completion
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


_PRESCRIPTION_FNS = {
    "student": _prescriptions_student,
    "alumni":  _prescriptions_alumni,
    "mentor":  _prescriptions_mentor,
    "college": _prescriptions_college,
    "admin":   _prescriptions_admin,
}


@router.get("/agent-k/prescriptions")
async def get_prescriptions(
    portal: str = "student",
    authorization: Optional[str] = Header(None),
):
    """Return portal-specific Agent K prescription cards.

    Each card is a one-click action the user can run with their connected
    AI provider — derived from the recommendations their dashboard already
    shows. No new AI calls are made here.
    """
    user = await _resolve_user(authorization)
    if not user:
        # graceful fallback so the modal works even pre-auth (empty list)
        return {"portal": portal, "cards": [], "anonymous": True}
    portal_key = (portal or "student").lower()
    fn = _PRESCRIPTION_FNS.get(portal_key, _prescriptions_student)
    cards = await fn(user)
    providers = await _connected_ai_providers(str(user["_id"]))
    return {
        "portal":          portal_key,
        "cards":           cards,
        "ai_connected":    bool(providers),
        "is_admin":        _is_admin(user),
        "deeplink_marketplace": "/marketplace?category=AI",
    }
