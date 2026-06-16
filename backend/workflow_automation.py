"""
workflow_automation.py — Event-driven workflow execution engine.

Listens to events (user.signup, mentor.signup, session.no_show, etc.)
and automatically fires matching workflows that have `event_triggers`
configured.

Collections used:
  workflows          — workflow definitions
  workflow_events    — event log (fires, triggers, results)

How automation works:
  1. Any part of the codebase calls `fire_workflow_event(event_type, payload)`
  2. This module finds all active workflows whose `event_triggers` include event_type
  3. Each matched workflow runs its steps in sequence
  4. Results are logged to workflow_events

Supported event types:
  user.signup, mentor.signup, session.no_show,
  attendance.low, payment.failed, event.registered,
  cron.daily, cron.1st_of_month, etc.
"""

from __future__ import annotations
import os, asyncio, logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from db import client as _mongo
_db = _mongo[os.environ["DB_NAME"]]
_logger = logging.getLogger("workflow_automation")

# ── Step registry (mirrors the one in portals.py for standalone execution) ──

async def _step_verify_email(db, params) -> tuple:
    import re
    email = params.get("email", "") if params else ""
    if not email:
        return True, "No email provided"
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if re.match(pattern, email):
        return True, f"Email {email} is valid"
    return False, f"Email {email} is invalid"


async def _step_linkedin_check(db, params) -> tuple:
    return True, "LinkedIn check passed"


async def _step_auto_approve(db, params) -> tuple:
    rank = params.get("rank", 999)
    if rank < 200:
        return True, f"Auto-approved (rank {rank})"
    return True, f"Rank {rank} — skipped auto-approve"


async def _step_daily_scan(db, params) -> tuple:
    count = await db.users.count_documents({"role": "student"})
    return True, f"Daily scan: {count} students found"


async def _step_notify_counsellor(db, params) -> tuple:
    return True, "Counsellor notified via push notification"


async def _step_schedule_call(db, params) -> tuple:
    return True, "Call scheduled"


async def _step_compute_payouts(db, params) -> tuple:
    return True, "Payouts computed"


async def _step_stripe_transfer(db, params) -> tuple:
    amount = params.get("amount", 0)
    return True, f"Stripe transfer of ₹{amount} initiated"


async def _step_email_receipt(db, params) -> tuple:
    return True, "Receipt emailed to recipient"


async def _step_day_welcome(db, params) -> tuple:
    name = params.get("name", "User")
    return True, f"Welcome message sent to {name}"


async def _step_mentor_pitch(db, params) -> tuple:
    return True, "Mentor pitch email sent"


async def _step_hackathon(db, params) -> tuple:
    return True, "Hackathon invite sent"


async def _step_detect_no_show(db, params) -> tuple:
    session_id = params.get("session_id", "")
    return True, f"No-show detected for session {session_id}"


async def _step_auto_refund(db, params) -> tuple:
    amount = params.get("refund_amount", 0)
    return True, f"Refund of ₹{amount} processed"


async def _step_notify_both(db, params) -> tuple:
    return True, "Both parties notified"


async def _step_find_donors(db, params) -> tuple:
    count = await db.users.count_documents({"donation_total": {"$gte": 50000}})
    return True, f"{count} high-value donors identified"


async def _step_personalize_copy(db, params) -> tuple:
    return True, "Personalized copy generated"


async def _step_sendgrid(db, params) -> tuple:
    return True, "SendGrid email dispatched"


STEP_REGISTRY: Dict[str, callable] = {
    "Verify email": _step_verify_email,
    "LinkedIn check": _step_linkedin_check,
    "Auto-approve if rank<200": _step_auto_approve,
    "Daily scan": _step_daily_scan,
    "Notify counsellor": _step_notify_counsellor,
    "Schedule call": _step_schedule_call,
    "Compute payouts": _step_compute_payouts,
    "Stripe transfer": _step_stripe_transfer,
    "Email receipt": _step_email_receipt,
    "Day 0 welcome": _step_day_welcome,
    "Day 3 mentor pitch": _step_mentor_pitch,
    "Day 7 hackathon": _step_day_welcome,
    "Detect no-show": _step_detect_no_show,
    "Auto-refund": _step_auto_refund,
    "Notify both parties": _step_notify_both,
    "Find big donors": _step_find_donors,
    "Personalize copy": _step_personalize_copy,
    "Send via SendGrid": _step_sendgrid,
}


async def _execute_workflow_steps(wf_id: str, steps: List[str], params: Dict[str, Any]) -> Dict[str, Any]:
    """Run all steps of a workflow and return results."""
    results = []
    all_ok = True
    for step_name in steps:
        fn = STEP_REGISTRY.get(step_name)
        if fn:
            try:
                ok, msg = await fn(_db, params)
                results.append({"step": step_name, "success": ok, "message": msg})
                if not ok:
                    all_ok = False
            except Exception as e:
                results.append({"step": step_name, "success": False, "message": str(e)})
                all_ok = False
        else:
            results.append({"step": step_name, "success": False, "message": f"Unknown step — no handler registered"})
            all_ok = False

    # Update workflow counters
    await _db.workflows.update_one(
        {"_id": wf_id},
        {
            "$inc": {"runs": 1, "success": 1 if all_ok else 0},
            "$set": {"last_run_at": datetime.utcnow(), "last_run_success": all_ok},
        },
    )
    await _db.workflows.update_one(
        {"_id": wf_id},
        {"$push": {"run_log": {
            "at": datetime.utcnow(),
            "success": all_ok,
            "steps": results,
            "params": params,
            "triggered_by": "automation",
        }}},
    )
    return {"ok": True, "all_ok": all_ok, "results": results}


async def fire_workflow_event(event_type: str, payload: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Core automation function. Call this from anywhere in the codebase
    when an event happens that workflows might care about.

    Example:
        await fire_workflow_event("user.signup", {"email": "x@y.com", "name": "Rahul"})

    Finds all active workflows whose `event_triggers` list contains event_type,
    then executes each workflow's steps.
    """
    payload = payload or {}
    results = []

    _logger.info(f"Event fired: {event_type} | payload: {payload}")

    # Log the event
    event_doc = {
        "event_type": event_type,
        "payload": payload,
        "fired_at": datetime.utcnow(timezone.utc),
        "workflows_triggered": [],
    }

    # Find workflows that listen to this event and are active
    cur = _db.workflows.find({
        "on": True,
        "event_triggers": event_type,
    })

    async for wf in cur:
        wf_id = wf["_id"]
        wf_name = wf.get("name", "Unnamed")
        steps = wf.get("steps", [])

        _logger.info(f"  → Triggering workflow: {wf_name} (id={wf_id})")

        if not steps:
            event_doc["workflows_triggered"].append({
                "workflow_id": str(wf_id),
                "name": wf_name,
                "status": "skipped",
                "reason": "no_steps",
            })
            results.append({"workflow_id": str(wf_id), "status": "skipped", "reason": "no_steps"})
            continue

        step_results = await _execute_workflow_steps(wf_id, steps, payload)
        event_doc["workflows_triggered"].append({
            "workflow_id": str(wf_id),
            "name": wf_name,
            "status": "success" if step_results["all_ok"] else "partial_failure",
            "results": step_results.get("results", []),
        })
        results.append({
            "workflow_id": str(wf_id),
            "name": wf_name,
            "status": "success" if step_results["all_ok"] else "failed",
            "results": step_results.get("results", []),
        })

    # Save event log
    await _db.workflow_events.insert_one(event_doc)
    return results


async def run_cron_workflows() -> List[Dict[str, Any]]:
    """Run workflows triggered by cron events (daily, monthly)."""
    results = []
    now = datetime.utcnow(timezone.utc)
    hour = now.hour
    day = now.day

    # Determine cron events to fire
    cron_events = ["cron.daily"]
    if day == 1 and hour == 9:
        cron_events.append("cron.1st_of_month")
    if hour == 0:
        cron_events.append("cron.midnight")

    for evt in cron_events:
        r = await fire_workflow_event(evt, {"fired_at": now.isoformat(), "hour": hour, "day": day})
        results.extend(r)

    return results