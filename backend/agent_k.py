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
import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Header, Body
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

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
    # ── Write/Spend/Submit/Communicate (DISABLED in Chunk 1) ──────
    "draft_application":      {"module": "jobs",       "side_effect": "write",       "requires_approval": False, "enabled": False, "description": "Draft a job application (does not submit).", "parameters": {"type": "object"}},
    "tailor_cv_for_job":      {"module": "jobs",       "side_effect": "write",       "requires_approval": False, "enabled": False, "description": "Tailor user's CV for a specific job.",         "parameters": {"type": "object"}},
    "draft_sop":              {"module": "higher-ed",  "side_effect": "write",       "requires_approval": False, "enabled": False, "description": "Draft a Statement of Purpose.",                 "parameters": {"type": "object"}},
    "draft_message":          {"module": "network",    "side_effect": "write",       "requires_approval": False, "enabled": False, "description": "Draft a message to a connection.",              "parameters": {"type": "object"}},
    "add_money_to_wallet":    {"module": "wallet",     "side_effect": "spend",       "requires_approval": True,  "enabled": False, "description": "Top up the wallet via UPI.",                    "parameters": {"type": "object"}},
    "withdraw_to_upi":        {"module": "wallet",     "side_effect": "spend",       "requires_approval": True,  "enabled": False, "description": "Withdraw earned credits.",                       "parameters": {"type": "object"}},
    "book_mentor_session":    {"module": "mentors",    "side_effect": "spend",       "requires_approval": True,  "enabled": False, "description": "Book a mentor session.",                         "parameters": {"type": "object"}},
    "submit_application":     {"module": "jobs",       "side_effect": "submit",      "requires_approval": True,  "enabled": False, "description": "Submit a drafted application to the partner ATS.","parameters": {"type": "object"}},
    "send_message":           {"module": "network",    "side_effect": "communicate", "requires_approval": True,  "enabled": False, "description": "Send a drafted message to a connection.",        "parameters": {"type": "object"}},
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


_TOOL_DISPATCH = {
    "search_jobs":         _tool_search_jobs,
    "get_wallet_balance":  _tool_get_wallet_balance,
    "search_mentors":      _tool_search_mentors,
    "search_courses":      _tool_search_courses,
    "get_profile":         _tool_get_profile,
}


# ─── Auth helper (decodes JWT and loads user) ─────────────────────
import jwt as _jwt
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

    # If user explicitly asked auto-execute and plan is all read-only, run now.
    if body.auto_execute and plan["steps"] and all(
        TOOL_REGISTRY.get(s.get("tool", ""), {}).get("side_effect") == "read"
        for s in plan["steps"]
    ):
        await _execute_run(run_id, user)

    return {"run_id": run_id, "plan": plan, "status": run_doc["status"]}


async def _execute_run(run_id: str, user: dict) -> dict:
    """Run all steps in the plan sequentially. Read-only tools auto-pass."""
    from bson import ObjectId
    run = await _db.agent_runs.find_one({"_id": ObjectId(run_id)})
    if not run:
        raise HTTPException(404, "Run not found")
    if run["status"] not in {"awaiting_approval", "running"}:
        raise HTTPException(400, f"Cannot execute run in status '{run['status']}'")

    await _db.agent_runs.update_one({"_id": ObjectId(run_id)}, {"$set": {"status": "running"}})
    plan = run["plan"]
    step_results = []
    audit = list(run.get("audit_log", []))

    for idx, step in enumerate(plan.get("steps", [])):
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
        }},
    )
    return {"run_id": run_id, "status": "completed", "steps": step_results, "result_summary": summary}


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
        {"module": "Career",         "icon": "briefcase-search-outline",   "title": "Find top SWE internships",            "prompt": "Search the top 5 SWE internships in India that match my profile and show me details."},
        {"module": "Career",         "icon": "file-document-edit-outline", "title": "Audit my resume vs current goal",      "prompt": "Get my profile and identify 3 missing skills for my career goal."},
        {"module": "Money",          "icon": "wallet-outline",             "title": "Wallet snapshot",                       "prompt": "Show me my current wallet balance, lifetime earnings and tier."},
        {"module": "Mentors",        "icon": "account-tie-voice-outline",  "title": "Find React mentors",                    "prompt": "Find 5 mentors with React or frontend expertise and list their rates."},
        {"module": "Learning",       "icon": "book-open-page-variant",     "title": "Free system-design courses",            "prompt": "Find 5 free courses on system design."},
        {"module": "Networking",     "icon": "account-multiple-plus",      "title": "Alumni at Google",                      "prompt": "Find 5 mentors who work at Google or other FAANG companies."},
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
