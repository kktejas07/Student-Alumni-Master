"""
talent_common.py — shared plumbing for the Talent Pool agent suite (TP15-TP32).

House conventions every agent module in services/agents/ follows:
- The motor `db` is passed into agent functions (never imported at module
  level); modules import lazily at call time where cross-feature imports
  would risk cycles.
- All timestamps written to Mongo are timezone-aware UTC datetimes (matches
  the house talent_pool router convention — the old agent's ISO-string
  timestamps silently broke the 24h-staleness query).
- Heavy optional deps (spacy, skillner, sklearn, recordlinkage, PyGithub,
  fastembed) are loaded via `import_optional`; agents degrade to documented
  fallbacks when a package is missing and never crash on import.
- Significant actions append to talent_pool_activity_log (W3C Activity
  Stream shape) via log_activity; every agent run appends to
  scheduler_logs via agent_run_log.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("talent_common")

_OPTIONAL_CACHE: Dict[str, Any] = {}
_OPTIONAL_MISSING: set = set()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def as_datetime(v: Any) -> Optional[datetime]:
    """Best-effort parse of stored timestamps (datetime, ISO string, epoch)."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, (int, float)):
        try:
            return datetime.fromtimestamp(v, tz=timezone.utc)
        except Exception:
            return None
    if isinstance(v, str):
        try:
            s = v.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def import_optional(name: str):
    """Lazily import a heavy optional dependency once; None if unavailable."""
    if name in _OPTIONAL_MISSING:
        return None
    if name not in _OPTIONAL_CACHE:
        try:
            import importlib
            _OPTIONAL_CACHE[name] = importlib.import_module(name)
        except Exception:
            _OPTIONAL_MISSING.add(name)
            _OPTIONAL_CACHE[name] = None
            logger.warning("Optional dependency %r unavailable — agent will use its fallback", name)
    return _OPTIONAL_CACHE[name]


_WS_RE = re.compile(r"\s+")


def normalize_text(s: Optional[str]) -> str:
    if not s:
        return ""
    return _WS_RE.sub(" ", str(s)).strip()


def normalize_email(s: Optional[str]) -> Optional[str]:
    e = normalize_text(s).lower()
    return e or None


# ── scheduler_logs (house run-log collection) ─────────────────────

async def agent_run_log(
    db,
    agent: str,
    action: str,
    status: str = "SUCCESS",
    detail: Optional[Dict[str, Any]] = None,
    duration_ms: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    """Append one row to scheduler_logs. Never raises."""
    try:
        doc: Dict[str, Any] = {
            "agent": agent,
            "action": action,
            "status": status,
            "started_at": now_utc(),
            "completed_at": now_utc(),
            "detail": detail or {},
        }
        if duration_ms is not None:
            doc["duration_ms"] = int(duration_ms)
        if error:
            doc["error"] = error[:2000]
        await db.scheduler_logs.insert_one(doc)
    except Exception as e:
        logger.warning("agent_run_log failed for %s/%s: %s", agent, action, e)


# ── talent_pool_activity_log (W3C Activity Stream shape) ──────────

def _actor_ref(actor: str) -> Dict[str, Any]:
    return {"type": "Person" if ":" not in actor else "Service", "id": f"{actor if ':' in actor else 'user:' + actor}", "name": actor}


async def log_activity(
    db,
    actor: str,
    action: str,
    object_id: Optional[str] = None,
    object_type: str = "TalentProfile",
    summary: str = "",
    data: Optional[Dict[str, Any]] = None,
    collection: Optional[str] = None,
) -> None:
    """Append a W3C Activity Stream event to talent_pool_activity_log.

    `action` is a short verb-style string (Ingest, Parse, Enrich, Dedup,
    Merge, Score, Match, Outreach, Quality, Erase, Note, Sync…). Never raises.
    """
    try:
        await db.talent_pool_activity_log.insert_one({
            "type": "Activity",
            "actor": _actor_ref(actor),
            "action": action,
            "object": {"type": object_type, "id": object_id or (collection or "")},
            "summary": (summary or "")[:500],
            "data": data or {},
            "collection": collection,
            "startTime": now_utc(),
        })
    except Exception as e:
        logger.warning("log_activity failed (%s/%s): %s", actor, action, e)
