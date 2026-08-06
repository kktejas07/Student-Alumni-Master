from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from bson import ObjectId

from core.db import db as _db
from agent_k.memory.models import AgentRun

async def get_run_by_id(run_id: str, user_id: str) -> Optional[Dict]:
    run = await _db.agent_runs.find_one({"_id": ObjectId(run_id), "user_id": user_id})
    return run

async def list_runs_for_user(user_id: str, limit: int = 20) -> List[Dict]:
    cur = _db.agent_runs.find({"user_id": user_id}).sort("started_at", -1).limit(limit)
    out = []
    async for r in cur:
        out.append(r)
    return out

async def get_user_prefs(user_id: str) -> Dict[str, Any]:
    p = await _db.agent_k_prefs.find_one({"user_id": user_id}) or {}
    return p

async def update_user_prefs(user_id: str, update: Dict[str, Any]) -> None:
    update["updated_at"] = datetime.now(timezone.utc)
    await _db.agent_k_prefs.update_one(
        {"user_id": user_id}, {"$set": update}, upsert=True,
    )
