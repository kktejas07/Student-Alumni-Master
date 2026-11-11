"""
talent_activity_log.py — TP26: unified candidate communication/activity timeline.

W3C Activity Stream format (see talent_common.log_activity for the writer
used by auto-hooks across all agents). This module adds:
- add_manual_note: recruiter notes / call logs / email threads pinned to a
  candidate, authored by the acting admin (actor = their sub/role).
- activity_timeline: chronological feed for the "Activity Timeline" tab,
  filterable by action and window.
- recent_activity: compact per-candidate block for the profile detail card.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from services.agents.talent_common import log_activity, now_utc
from datetime import timedelta

_VALID_ACTIONS = {
    "Ingest", "Parse", "Enrich", "Dedup", "Merge", "Score", "Match",
    "Outreach", "WhatsApp", "Quality", "Consent", "ConsentRevoke", "Erase",
    "Note", "Sync", "Rank", "Schedule", "InterviewFeedback", "Insight",
}


async def add_manual_note(
    db,
    profile_id: str,
    actor: str,
    note: str,
    tag: str = "note",
) -> Dict[str, Any]:
    """Record a manual recruiter note in the candidate's activity timeline."""
    await log_activity(
        db, actor, "Note", object_id=profile_id,
        summary=note[:500], data={"note": note, "tag": tag},
        collection="talent_pool",
    )
    return {"recorded": True, "profile_id": profile_id}


async def activity_timeline(
    db,
    profile_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 50,
    window_days: Optional[int] = None,
) -> Dict[str, Any]:
    """Chronological feed, newest first. Filter by candidate or action verb."""
    q: Dict[str, Any] = {}
    if profile_id:
        q["object.id"] = profile_id
    if action:
        q["action"] = action
    if window_days:
        q["startTime"] = {"$gte": now_utc() - timedelta(days=window_days)}
    docs = []
    async for d in db.talent_pool_activity_log.find(q).sort("startTime", -1).limit(limit):
        ts = d.get("startTime")
        docs.append({
            "id": str(d.get("_id")),
            "type": "Activity",
            "actor": (d.get("actor") or {}).get("name") or "system",
            "action": d.get("action"),
            "object_id": (d.get("object") or {}).get("id"),
            "object_type": (d.get("object") or {}).get("type"),
            "summary": d.get("summary"),
            "data": d.get("data") or {},
            "collection": d.get("collection"),
            "at": ts.isoformat() if ts else None,
        })
    return {"profile_id": profile_id, "action": action, "events": docs, "count": len(docs)}


async def recent_activity(db, profile_id: str, limit: int = 8) -> Dict[str, Any]:
    """Compact per-candidate block for the detail card (last N events)."""
    feed = await activity_timeline(db, profile_id=profile_id, limit=limit)
    return {"profile_id": profile_id, "events": feed["events"]}


def valid_action(action: str) -> bool:
    return action in _VALID_ACTIONS


class ActivityLogAgent:
    """TP26 dashboard facade."""
    name = "TP26 Activity Log"
    group = "compliance"
    priority = "P2"

    async def agent_status(self, db) -> Dict[str, Any]:
        total = await db.talent_pool_activity_log.count_documents({})
        day_ago = now_utc() - timedelta(days=1)
        recent = await db.talent_pool_activity_log.count_documents({"startTime": {"$gte": day_ago}})
        return {
            "name": self.name, "group": self.group, "priority": self.priority,
            "status": "ok",
            "events_total": total,
            "events_last_24h": recent,
            "est_cost_per_month": "$0 (append-only audit trail, local only)",
        }


activity_agent = ActivityLogAgent()
