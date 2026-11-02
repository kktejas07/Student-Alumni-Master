"""
approvals.py — Super Admin approval SLA tracking + audit trail (AP1 / AP4).

Surfaces every pending approval (colleges / mentors / events) with:
  • how long it has been pending
  • the SLA it is measured against (colleges 48h, mentors 24h, events 72h)
  • an OVERDUE badge once the SLA is breached

Every action taken on an approval (submitted / viewed / approved / rejected /
escalated) is written append-only to `approval_audit_trail`, and the timeline
can be exported to CSV.

Endpoints
  GET  /admin/approvals                — pending items with SLA state
  GET  /admin/approvals/audit          — audit trail (newest first)
  GET  /admin/approvals/audit.csv      — CSV export of the audit trail
  POST /admin/approvals/{kind}/{item_id}/view — log a "viewed" action
  POST /admin/approvals/{kind}/{item_id}/escalate — log an escalation
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from core.db import db
from core.deps import require_role

router = APIRouter(prefix="/admin/approvals", tags=["Admin Approvals"])

# SLA windows per approval kind, in hours.
SLA_HOURS: Dict[str, int] = {
    "college": 48,
    "mentor": 24,
    "event": 72,
}

# Where a pending item lives, and which field carries its submission time.
KIND_SPECS: Dict[str, Dict[str, Any]] = {
    "college": {
        "collection": "colleges_meta",
        "match": {"status": "pending"},
        "name_fields": ["name", "college_name"],
        "date_fields": ["submitted_at", "created_at", "requested_at"],
    },
    "mentor": {
        "collection": "users",
        "match": {"role": "mentor", "mentor_status": "pending"},
        "name_fields": ["full_name", "name"],
        "date_fields": ["submitted_at", "created_at", "requested_at"],
    },
    "event": {
        "collection": "events",
        "match": {"status": "pending"},
        "name_fields": ["title", "name"],
        "date_fields": ["submitted_at", "created_at", "requested_at"],
    },
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_datetime(value: Any) -> Optional[datetime]:
    """Coerce a stored timestamp (datetime or ISO string) to an aware datetime."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def _first_date(doc: Dict[str, Any], fields: List[str]) -> Optional[datetime]:
    for f in fields:
        dt = _to_datetime(doc.get(f))
        if dt:
            return dt
    return None


def _first_text(doc: Dict[str, Any], fields: List[str]) -> str:
    for f in fields:
        val = doc.get(f)
        if val:
            return str(val)
    return ""


def _ser(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc.get("_id", ""))
    return out


async def _write_audit(
    *,
    action: str,
    kind: str,
    item_id: str,
    label: str,
    user: Optional[dict] = None,
    detail: Optional[Dict[str, Any]] = None,
) -> None:
    """Append one entry to the immutable approval audit trail."""
    entry: Dict[str, Any] = {
        "action": action,
        "kind": kind,
        "item_id": item_id,
        "label": label,
        "at": _now(),
        "actor": {
            "user_id": str((user or {}).get("_id", "")),
            "email": (user or {}).get("email") or "",
            "name": (user or {}).get("full_name") or "",
        },
        "detail": detail or {},
    }
    await db.approval_audit_trail.insert_one(entry)


async def _pending_items() -> List[Dict[str, Any]]:
    """Every pending approval, with SLA state computed against the SLA window."""
    now = _now()
    items: List[Dict[str, Any]] = []

    for kind, spec in KIND_SPECS.items():
        sla_hours = SLA_HOURS[kind]
        sla_delta = timedelta(hours=sla_hours)
        try:
            cursor = db[spec["collection"]].find(spec["match"]).limit(500)
            docs = [d async for d in cursor]
        except Exception:
            docs = []

        for doc in docs:
            submitted = _first_date(doc, spec["date_fields"])
            # Items with no recorded submission time are treated as just-requested
            # rather than infinitely overdue.
            pending_since = submitted or now
            age = now - pending_since
            age_hours = max(age.total_seconds() / 3600.0, 0.0)
            due_at = pending_since + sla_delta
            overdue = now > due_at
            remaining_hours = (due_at - now).total_seconds() / 3600.0

            label = _first_text(doc, spec["name_fields"]) or "—"
            items.append({
                "id": str(doc.get("_id", "")),
                "kind": kind,
                "label": label,
                "submitted_at": submitted.isoformat() if submitted else None,
                "pending_hours": round(age_hours, 1),
                "sla_hours": sla_hours,
                "due_at": due_at.isoformat(),
                "remaining_hours": round(remaining_hours, 1),
                "overdue": overdue,
                "state": "overdue" if overdue else ("due_soon" if remaining_hours <= 8 else "on_track"),
                "priority": doc.get("priority") or ("high" if kind == "mentor" else "med"),
                "meta": _describe(kind, doc),
            })

    # Most overdue first, then longest pending.
    items.sort(key=lambda i: (not i["overdue"], -i["pending_hours"]))
    return items


def _describe(kind: str, doc: Dict[str, Any]) -> str:
    if kind == "mentor":
        mi = doc.get("mentor_info") or {}
        return f"{mi.get('job_title', 'Mentor')}, {mi.get('organization', '—')}"
    if kind == "college":
        return f"{doc.get('mou_kind', 'Onboarding')} · {doc.get('mou', 'Standard')} MoU"
    return f"{doc.get('mode', 'Online')} · Capacity {doc.get('capacity', 1000)}"


@router.get("")
async def list_approvals(user: dict = Depends(require_role("admin"))):
    """Pending approvals annotated with SLA state."""
    items = await _pending_items()
    return {
        "ok": True,
        "items": items,
        "counts": {
            "all": len(items),
            "overdue": sum(1 for i in items if i["overdue"]),
            "due_soon": sum(1 for i in items if i["state"] == "due_soon"),
            "on_track": sum(1 for i in items if i["state"] == "on_track"),
            "college": sum(1 for i in items if i["kind"] == "college"),
            "mentor": sum(1 for i in items if i["kind"] == "mentor"),
            "event": sum(1 for i in items if i["kind"] == "event"),
        },
        "sla_hours": SLA_HOURS,
        "server_time": _now().isoformat(),
    }


@router.get("/audit")
async def list_audit(
    kind: Optional[str] = None,
    item_id: Optional[str] = None,
    limit: int = 200,
    user: dict = Depends(require_role("admin")),
):
    """Append-only approval audit trail — newest first."""
    limit = max(1, min(int(limit or 200), 1000))
    query: Dict[str, Any] = {}
    if kind:
        query["kind"] = kind
    if item_id:
        query["item_id"] = item_id

    try:
        cursor = db.approval_audit_trail.find(query).sort("at", -1).limit(limit)
        docs = [d async for d in cursor]
    except Exception:
        docs = []

    entries = []
    for d in docs:
        entry = _ser(d)
        at = entry.get("at")
        entry["at"] = at.isoformat() if isinstance(at, datetime) else str(at or "")
        entries.append(entry)
    return {"ok": True, "entries": entries, "count": len(entries)}


@router.get("/audit.csv")
async def export_audit_csv(
    kind: Optional[str] = None,
    item_id: Optional[str] = None,
    user: dict = Depends(require_role("admin")),
):
    """CSV export of the approval audit trail."""
    query: Dict[str, Any] = {}
    if kind:
        query["kind"] = kind
    if item_id:
        query["item_id"] = item_id

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "at", "action", "kind", "item_id", "label",
        "actor_email", "actor_name", "detail",
    ])
    try:
        cursor = db.approval_audit_trail.find(query).sort("at", -1)
        async for r in cursor:
            at = r.get("at")
            writer.writerow([
                at.isoformat() if isinstance(at, datetime) else str(at or ""),
                r.get("action", ""),
                r.get("kind", ""),
                r.get("item_id", ""),
                r.get("label", ""),
                (r.get("actor") or {}).get("email", ""),
                (r.get("actor") or {}).get("name", ""),
                r.get("detail") or {},
            ])
    except Exception:
        pass

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=approval_audit_trail.csv"},
    )


class EscalatePayload(BaseModel):
    note: Optional[str] = None


async def _find_item(kind: str, item_id: str) -> Optional[Dict[str, Any]]:
    """Locate a pending approval by kind + id, returning its label."""
    spec = KIND_SPECS.get(kind)
    if not spec:
        return None
    try:
        doc = await db[spec["collection"]].find_one({"_id": _object_id(item_id)})
    except Exception:
        doc = None
    if doc is None:
        try:
            doc = await db[spec["collection"]].find_one({"name": item_id})
        except Exception:
            doc = None
    if not doc:
        return None
    return {"id": str(doc.get("_id", "")), "label": _first_text(doc, spec["name_fields"]) or "—"}


def _object_id(value: str):
    try:
        from bson import ObjectId
        return ObjectId(value)
    except Exception:
        return value


@router.post("/{kind}/{item_id}/view")
async def log_view(kind: str, item_id: str, user: dict = Depends(require_role("admin"))):
    """Record that an admin opened the review panel for an item."""
    item = await _find_item(kind, item_id)
    label = item["label"] if item else item_id
    await _write_audit(
        action="viewed", kind=kind, item_id=item_id, label=label, user=user,
    )
    return {"ok": True}


@router.post("/{kind}/{item_id}/escalate")
async def escalate(kind: str, item_id: str, payload: EscalatePayload, user: dict = Depends(require_role("admin"))):
    """Record an escalation for an overdue approval."""
    if kind not in KIND_SPECS:
        raise HTTPException(status_code=400, detail="Unknown approval kind")
    item = await _find_item(kind, item_id)
    label = item["label"] if item else item_id
    note = (payload.note or "").strip()
    await _write_audit(
        action="escalated", kind=kind, item_id=item_id, label=label, user=user,
        detail={"note": note} if note else {},
    )
    return {"ok": True, "message": f"Escalated: {label}"}
