"""
briefings.py — Super Admin weekly platform health briefings (AI4).

Serves the briefings produced by `services/agents/health_briefing_agent.py`
and lets an admin trigger one on demand (e.g. right after a deploy) without
waiting for Monday 09:00 IST.

Endpoints
  GET  /admin/briefings            — briefing history (newest first)
  GET  /admin/briefings/latest     — the most recent briefing
  GET  /admin/briefings/status     — agent status / schedule / last run
  POST /admin/briefings/generate   — run the agent now (force=True)
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from core.db import db
from core.deps import require_role

router = APIRouter(prefix="/admin/briefings", tags=["Admin Briefings"])


def _ser(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc.get("_id", ""))
    gen = out.get("generated_at")
    if isinstance(gen, datetime):
        out["generated_at"] = gen.isoformat()
    return out


@router.get("")
async def list_briefings(
    limit: int = Query(20),
    user: dict = Depends(require_role("admin")),
):
    """Briefing history, newest first."""
    limit = max(1, min(int(limit or 20), 100))
    try:
        cursor = db.platform_briefings.find({}).sort("generated_at", -1).limit(limit)
        docs = [d async for d in cursor]
    except Exception:
        docs = []
    return {"ok": True, "items": [_ser(d) for d in docs], "count": len(docs)}


@router.get("/latest")
async def latest_briefing(user: dict = Depends(require_role("admin"))):
    """The most recent briefing, or an empty payload if none exists yet."""
    try:
        doc = await db.platform_briefings.find_one({}, sort=[("generated_at", -1)])
    except Exception:
        doc = None
    if not doc:
        return {"ok": True, "briefing": None, "items": []}
    ser = _ser(doc)
    return {"ok": True, "briefing": ser, "items": ser.get("insights") or []}


@router.get("/status")
async def briefing_status(user: dict = Depends(require_role("admin"))):
    """Agent status — schedule, gates, last run."""
    from services.agents.health_briefing_agent import status as agent_status
    return {"ok": True, **(await agent_status(db))}


@router.post("/generate")
async def generate_briefing(user: dict = Depends(require_role("admin"))):
    """Run the health briefing now, bypassing the weekly cadence."""
    from services.agents.health_briefing_agent import run_health_briefing
    try:
        out = await run_health_briefing(db, force=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Briefing failed: {e}")
    if out.get("skipped") == "disabled":
        raise HTTPException(
            status_code=503,
            detail="Health briefing agent is disabled (HEALTH_BRIEFING_ENABLED is not set).",
        )
    return {
        "ok": True,
        "week_of": out.get("week_of"),
        "items": out.get("insights") or [],
        "insight_count": len(out.get("insights") or []),
        "snapshot": out.get("snapshot"),
        "delivery": out.get("delivery"),
    }
