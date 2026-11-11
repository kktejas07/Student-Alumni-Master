"""
approval_sla_scheduler.py — daily SLA overdue digest (AP1).

Computes the daily digest of approvals that have breached their SLA window
(colleges 48h, mentors 24h, events 72h) and emails it to the admin recipient.

The whole agent is OFF by default and must be explicitly enabled by an
operator, because it sends recurring mail to a standing recipient:

  APPROVAL_SLA_SCHEDULER_ENABLED   default "0" — set "1" to enable
  APPROVAL_SLA_DIGEST_EMAILS       default "0" — set "1" to actually send
                                  mail; otherwise the digest is only logged
  ADMIN_EMAIL                     recipient (default admin@studentalumni.ai)

With both flags off the step is a no-op, so wiring it into the house cycle
cannot surprise a deployment with unsolicited mail.
"""
from __future__ import annotations

import os
from datetime import timedelta
from typing import Any, Dict, List

from services.agents.talent_common import now_utc, as_datetime, log_activity

SETTINGS_ID = "approval_sla_scheduler"
MASTER_ENV = "APPROVAL_SLA_SCHEDULER_ENABLED"
EMAILS_ENV = "APPROVAL_SLA_DIGEST_EMAILS"
DEFAULT_ADMIN_EMAIL = "admin@studentalumni.ai"
CADENCE_HOURS = 24


def _env_flag(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).strip() == "1"


def _admin_email() -> str:
    return os.environ.get("ADMIN_EMAIL") or DEFAULT_ADMIN_EMAIL


def _is_due(last_runs: Dict[str, str], key: str) -> bool:
    last = as_datetime(last_runs.get(key))
    if last is None:
        return True
    return (now_utc() - last) >= timedelta(hours=CADENCE_HOURS)


async def _load_state(db) -> Dict[str, Any]:
    doc = await db.settings.find_one({"id": SETTINGS_ID}) or {}
    return {"last_runs": doc.get("last_runs") or {}}


async def _save_state(db, last_runs: Dict[str, str]) -> None:
    await db.settings.update_one(
        {"id": SETTINGS_ID},
        {"$set": {"last_runs": last_runs, "updated_at": now_utc()}},
        upsert=True,
    )


async def _overdue_items() -> List[Dict[str, Any]]:
    """Every pending approval currently past its SLA window."""
    from features.routers.admin.approvals import _pending_items
    items = await _pending_items()
    return [i for i in items if i["overdue"]]


def _fmt_hours(h: float) -> str:
    if h < 1:
        return f"{int(round(h * 60))}m"
    if h < 48:
        return f"{int(round(h))}h"
    return f"{int(round(h / 24))}d {int(round(h % 24))}h"


async def _notify_admin(subject: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Send the digest to the admin recipient. Never raises."""
    if not _env_flag(EMAILS_ENV, "0"):
        return {"sent": False, "count": len(rows)}
    try:
        from core.email import send_email, render_html_email
    except Exception:
        return {"sent": False, "count": len(rows)}

    html_rows = "".join(
        "<tr>"
        f"<td style='padding:5px 8px;border-bottom:1px solid #eee'>{r['label']}</td>"
        f"<td style='padding:5px 8px;border-bottom:1px solid #eee'>{r['kind']}</td>"
        f"<td style='padding:5px 8px;border-bottom:1px solid #eee'>{r['sla']}</td>"
        f"<td style='padding:5px 8px;border-bottom:1px solid #ef4444;font-weight:600'>{r['overdue_by']}</td>"
        "</tr>"
        for r in rows
    )
    body = (
        "<h3>Approval SLA digest</h3>"
        f"<p>{len(rows)} pending approval(s) have breached their SLA window and need review:</p>"
        "<table style='width:100%;border-collapse:collapse'>"
        "<thead><tr>"
        "<th style='padding:5px 8px;text-align:left;border-bottom:2px solid #cbd5e1'>Item</th>"
        "<th style='padding:5px 8px;text-align:left;border-bottom:2px solid #cbd5e1'>Type</th>"
        "<th style='padding:5px 8px;text-align:left;border-bottom:2px solid #cbd5e1'>SLA</th>"
        "<th style='padding:5px 8px;text-align:left;border-bottom:2px solid #cbd5e1;color:#ef4444'>Overdue by</th>"
        "</tr></thead>"
        f"<tbody>{html_rows}</tbody></table>"
        "<p>Managed from the Super Admin &rarr; Approvals view.</p>"
    )
    try:
        ok = bool(await send_email(_admin_email(), subject, render_html_email(body)))
    except Exception:
        ok = False
    return {"sent": ok, "count": len(rows)}


async def approval_sla_digest_step(db) -> Dict[str, Any]:
    """Build the SLA digest, email it if enabled, then mark the run."""
    last_runs = (await _load_state(db))["last_runs"]
    if not _is_due(last_runs, "digest"):
        return {"skipped": True, "reason": "cadence not elapsed"}

    overdue = await _overdue_items()
    from features.routers.admin.approvals import SLA_HOURS

    rows = [{
        "label": i["label"],
        "kind": i["kind"].capitalize(),
        "sla": f"{SLA_HOURS.get(i['kind'], 0)}h",
        "overdue_by": _fmt_hours(max(i["pending_hours"] - i["sla_hours"], 0)),
    } for i in overdue]

    email = await _notify_admin(f"{len(overdue)} approval(s) overdue", rows)

    last_runs["digest"] = now_utc().isoformat()
    await _save_state(db, last_runs)
    await log_activity(
        db, "approval_sla_scheduler", "Digest",
        summary=f"{len(overdue)} overdue approval(s); email_sent={email['sent']}",
    )
    return {"overdue": len(overdue), "email_sent": email["sent"]}


async def approval_sla_agent_run(db) -> Dict[str, Any]:
    """Entry point driven by the house agent cycle. Off unless enabled."""
    if not _env_flag(MASTER_ENV, "0"):
        return {"ok": True, "ran": [], "skipped": {"digest": "disabled"}}
    out = await approval_sla_digest_step(db)
    return {"ok": True, "ran": ["digest"], "result": out}
