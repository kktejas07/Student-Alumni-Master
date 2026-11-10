"""
settings_changelog.py — append-only settings changelog with rollback (ST2).

Every change an admin makes to platform settings is written to
`settings_changelog` with who made it, when, which section it touched, and
the old vs new value. The timeline can be filtered by section / key / actor
and exported as CSV, and any individual change can be rolled back (which
itself appends a new entry — the log is never rewritten).

Secret-looking values are masked before they are written: the changelog is a
readable audit trail, not a secret store.

Endpoints
  GET  /admin/settings-changelog          — filtered timeline (newest first)
  GET  /admin/settings-changelog.csv      — CSV export of the timeline
  GET  /admin/settings-changelog/sections — filter options + counts
  POST /admin/settings-changelog/{change_id}/rollback — revert one change
"""
from __future__ import annotations

import csv
import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from core.db import db
from core.deps import require_role

router = APIRouter(prefix="/admin/settings-changelog", tags=["Admin Settings Changelog"])

# Sections whose changes can be rolled back. Each entry knows how to find and
# restore the underlying document.
ROLLBACK_SECTIONS = {
    "feature_flags": {"collection": "platform_controls", "id": "singleton", "field": "feature_flags"},
    "system_settings": {"collection": "platform_controls", "id": "singleton", "field": "system_settings"},
    "roles": {"collection": "admin_roles", "id": "role_id", "field": None},
    "profile": {"collection": "users", "id": "user_id", "field": None},
}

_SECRET_RE = re.compile(
    r"(secret|password|passwd|api[_-]?key|token|private[_-]?key|credential|auth[_-]?key)",
    re.IGNORECASE,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_secret(key: str) -> bool:
    return bool(_SECRET_RE.search(key or ""))


def _mask(value: Any) -> Any:
    """Never store a raw secret in the changelog."""
    if isinstance(value, str) and value:
        return f"••••{value[-4:]}" if len(value) > 4 else "••••"
    return value


def _display(value: Any) -> Any:
    """Changelog-safe representation of a value. Structured values keep their
    type so a rollback can restore them verbatim."""
    if value is None:
        return None
    if isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value[:500]
    if isinstance(value, (list, tuple)):
        return [_display(v) for v in list(value)[:100]]
    if isinstance(value, dict):
        return {str(k): _display(v) for k, v in list(value.items())[:50]}
    return str(value)[:500]


async def record_change(
    *,
    section: str,
    key: str,
    label: str,
    old_value: Any,
    new_value: Any,
    user: Optional[dict] = None,
    action: str = "update",
    change_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """Append one entry to the settings changelog. Never raises.

    Returns the new change_id, or None if the write failed.
    """
    secret = _is_secret(key)
    entry: Dict[str, Any] = {
        "section": section,
        "key": key,
        "label": label or key,
        "old_value": _mask(old_value) if secret else _display(old_value),
        "new_value": _mask(new_value) if secret else _display(new_value),
        "action": action,
        "changed_by": {
            "user_id": str((user or {}).get("_id", "")),
            "email": (user or {}).get("email") or "",
            "name": (user or {}).get("full_name") or (user or {}).get("name") or "",
        },
        "at": _now(),
        "is_secret": secret,
    }
    if change_id:
        entry["rolled_back_from"] = change_id
    if extra:
        entry.update(extra)
    try:
        res = await db.settings_changelog.insert_one(entry)
        return str(res.inserted_id)
    except Exception:
        return None


def _ser(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc.get("_id", ""))
    at = out.get("at")
    if isinstance(at, datetime):
        out["at"] = at.isoformat()
    return out


@router.get("")
async def list_changes(
    section: Optional[str] = None,
    key: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = 200,
    user: dict = Depends(require_role("admin")),
):
    """Filtered settings changelog — newest first."""
    limit = max(1, min(int(limit or 200), 1000))
    query: Dict[str, Any] = {}
    if section:
        query["section"] = section
    if key:
        query["key"] = key
    if actor:
        query["changed_by.email"] = actor

    try:
        cursor = db.settings_changelog.find(query).sort("at", -1).limit(limit)
        docs = [d async for d in cursor]
    except Exception:
        docs = []
    return {"ok": True, "entries": [_ser(d) for d in docs], "count": len(docs)}


@router.get("/sections")
async def list_sections(user: dict = Depends(require_role("admin"))):
    """Filter options: which sections exist and how many changes each has."""
    try:
        rows = await db.settings_changelog.aggregate([
            {"$group": {"_id": "$section", "count": {"$sum": 1},
                        "keys": {"$addToSet": "$key"}}},
            {"$sort": {"count": -1}},
        ]).to_list(200)
    except Exception:
        rows = []
    sections = [
        {"section": r.get("_id") or "unknown", "count": r.get("count", 0),
         "keys": sorted([k for k in (r.get("keys") or []) if k])[:50]}
        for r in rows
    ]
    return {"ok": True, "sections": sections}


@router.get("/changelog.csv")
async def export_csv(
    section: Optional[str] = None,
    key: Optional[str] = None,
    user: dict = Depends(require_role("admin")),
):
    """CSV export of the settings changelog."""
    query: Dict[str, Any] = {}
    if section:
        query["section"] = section
    if key:
        query["key"] = key

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "at", "action", "section", "key", "label",
        "old_value", "new_value", "actor_email", "actor_name",
    ])
    try:
        cursor = db.settings_changelog.find(query).sort("at", -1)
        async for r in cursor:
            at = r.get("at")
            actor = r.get("changed_by") or {}
            writer.writerow([
                at.isoformat() if isinstance(at, datetime) else str(at or ""),
                r.get("action", ""),
                r.get("section", ""),
                r.get("key", ""),
                r.get("label", ""),
                r.get("old_value", ""),
                r.get("new_value", ""),
                actor.get("email", ""),
                actor.get("name", ""),
            ])
    except Exception:
        pass

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=settings_changelog.csv"},
    )


class RollbackBody(BaseModel):
    confirm: bool = False


@router.post("/{change_id}/rollback")
async def rollback_change(
    change_id: str,
    body: RollbackBody,
    user: dict = Depends(require_role("admin")),
):
    """Restore the value a setting had before the recorded change.

    The rollback is itself recorded as a new changelog entry — the log is
    append-only and the original entry is never removed.
    """
    from bson import ObjectId

    try:
        oid = ObjectId(change_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid change id")

    try:
        change = await db.settings_changelog.find_one({"_id": oid})
    except Exception:
        change = None
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    spec = ROLLBACK_SECTIONS.get(change.get("section") or "")
    if not spec:
        raise HTTPException(
            status_code=400,
            detail=f"'{change.get('section')}' changes cannot be rolled back",
        )

    old_value = change.get("old_value")
    if change.get("is_secret"):
        # The original value was masked on the way in, so there is nothing
        # safe to restore. Say so rather than writing a mask back.
        raise HTTPException(
            status_code=400,
            detail="Secret values are not stored in the changelog and cannot be restored",
        )

    section = change["section"]
    key = change.get("key")

    if section in ("feature_flags", "system_settings"):
        doc = await db.platform_controls.find_one({"_id": "singleton"})
        if not doc:
            raise HTTPException(status_code=404, detail="Platform controls not found")
        arr = list(doc.get(spec["field"]) or [])
        restored = False
        for item in arr:
            if item.get("key") == key:
                item["value"] = old_value
                restored = True
                break
        if not restored:
            arr.append({"key": key, "label": change.get("label") or key, "value": old_value})
        await db.platform_controls.update_one(
            {"_id": "singleton"},
            {"$set": {spec["field"]: arr, "updated_at": _now()}},
        )
    elif section == "roles":
        role_id = change.get("role_id") or change.get("target_id")
        if not role_id:
            raise HTTPException(status_code=400, detail="This change has no rollback target")
        update = change.get("rollback_payload") or {}
        if not update:
            raise HTTPException(status_code=400, detail="This change has no restorable state")
        await db.admin_roles.update_one({"_id": role_id}, {"$set": {**update, "updated_at": _now()}})
    elif section == "profile":
        target_user = change.get("user_id") or change.get("target_id")
        if not target_user:
            raise HTTPException(status_code=400, detail="This change has no rollback target")
        update = change.get("rollback_payload") or {}
        if not update:
            raise HTTPException(status_code=400, detail="This change has no restorable state")
        await db.users.update_one({"_id": target_user}, {"$set": update})
    else:
        raise HTTPException(status_code=400, detail="Unsupported section")

    await record_change(
        section=section,
        key=key or "",
        label=change.get("label") or key or "",
        old_value=change.get("new_value"),
        new_value=old_value,
        user=user,
        action="rollback",
        change_id=change_id,
    )
    return {"ok": True, "message": f"Rolled back: {change.get('label') or key}"}
