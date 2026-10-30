"""
services.agents.agent_run_log — AG2 persistent agent run history.

Every autonomous-agent run is inserted into the `agent_run_log` collection
(status='running'), then updated in place with its outcome. The collection has
a 90-day TTL so old runs age out automatically.

    {
      agent_id, agent_name,
      started_at, finished_at, duration_s,
      status,            # running | success | failed
      summary, items_processed, tokens_used, error,
      created_at
    }

Writes are best-effort: if Mongo is unavailable (or `db` is None, e.g. a manual
trigger without a collection handle) the run still executes — logging must
never block or break an agent.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.db import db as _db

COL = "agent_run_log"
TTL_SECONDS = 90 * 24 * 3600  # 90 days (indexes are created in server.py startup)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


async def start(agent_id: str, agent_name: str, db: Optional[Any] = None) -> Optional[Any]:
    """Insert a `running` run doc; return its `_id` (or None if not logged)."""
    # pymongo Database objects raise on bool(), so use an explicit None check
    target = db if db is not None else _db
    doc = {
        "agent_id": agent_id,
        "agent_name": agent_name,
        "started_at": _iso(_utcnow()),
        "finished_at": None,
        "duration_s": None,
        "status": "running",
        "summary": None,
        "items_processed": None,
        "tokens_used": None,
        "error": None,
        "created_at": _utcnow(),
    }
    try:
        inserted = await target[COL].insert_one(doc)
        return inserted.inserted_id
    except Exception:
        return None


async def finish(run_id: Optional[Any], status: str, db: Optional[Any] = None, *,
                 summary: Optional[str] = None,
                 items_processed: Optional[int] = None,
                 tokens_used: Optional[int] = None,
                 error: Optional[str] = None,
                 started_iso: Optional[str] = None) -> None:
    """Update a run started by `start()` with its outcome. No-op if run_id is None."""
    if run_id is None:
        return
    target = db if db is not None else _db
    finished_dt = _utcnow()
    duration_s: Optional[float] = None
    if started_iso:
        try:
            duration_s = round(
                (finished_dt - datetime.fromisoformat(started_iso)).total_seconds(), 2)
        except Exception:
            duration_s = None
    update = {
        "status": status,
        "finished_at": _iso(finished_dt),
        "duration_s": duration_s,
        "summary": summary,
        "items_processed": items_processed,
        "tokens_used": tokens_used,
        "error": error,
    }
    try:
        await target[COL].update_one({"_id": run_id}, {"$set": update})
    except Exception:
        pass


async def list_runs(limit: int = 50,
                    agent_id: Optional[str] = None,
                    status: Optional[str] = None,
                    db: Optional[Any] = None) -> List[Dict[str, Any]]:
    """Newest-first run history, optionally filtered by agent and/or status."""
    target = db if db is not None else _db
    q: Dict[str, Any] = {}
    if agent_id:
        q["agent_id"] = agent_id
    if status:
        q["status"] = status
    out: List[Dict[str, Any]] = []
    async for d in target[COL].find(q).sort("created_at", -1).limit(limit):
        d.pop("_id", None)
        out.append(d)
    return out
