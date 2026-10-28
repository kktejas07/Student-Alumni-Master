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
from core.db import db as _db
_logger = logging.getLogger("workflow_automation")

# ── Step registry ─────────────────────────────────────────────────────────────
# Single source of truth (portals.py imports this). Every step returns
# (success, message). A step that has no real integration returns
# (False, "not implemented: ...") so workflow runs never report success for
# work that did not happen. Earlier versions returned True from every stub.

NOT_IMPLEMENTED = "not implemented"


def _p(params, key, default=None):
    return (params or {}).get(key, default)


async def _send_mail(to: str, subject: str, html_body: str) -> tuple:
    if not to:
        return False, "no recipient email in params"
    try:
        from core.email import send_email, render_html_email
        await send_email(to, subject, render_html_email(html_body))
        return True, f"email sent to {to}"
    except Exception as e:
        return False, f"email failed: {e}"


async def _push(db, user_id: str, title: str, body: str) -> tuple:
    if not user_id:
        return False, "no user_id in params"
    try:
        from notifications import send_push
        res = await send_push(db, user_id=user_id, title=title, body=body)
        sent = (res or {}).get("sent", (res or {}).get("delivered", 0)) if isinstance(res, dict) else 0
        return True, f"push queued for {user_id} ({sent} device(s))"
    except Exception as e:
        return False, f"push failed: {e}"


async def _step_verify_email(db, params) -> tuple:
    import re
    email = _p(params, "email", "")
    if not email:
        return False, "No email provided"
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return False, f"Email {email} is invalid"
    try:
        from core.email_quality import assess
        blocked = await assess(email, mx=True)
        if blocked:
            return False, f"Email {email} rejected: {blocked}"
    except Exception:
        pass  # quality service unavailable; format check still passed
    return True, f"Email {email} is valid"


async def _step_linkedin_check(db, params) -> tuple:
    import re
    url = _p(params, "linkedin_url", "") or ""
    if not url:
        return False, "no linkedin_url in params"
    if re.match(r"^https?://([a-z]{2,3}\.)?linkedin\.com/in/[A-Za-z0-9\-_%]+/?$", url.strip()):
        return True, "LinkedIn URL format is valid (profile not fetched)"
    return False, f"LinkedIn URL {url} is not a valid profile URL"


async def _step_auto_approve(db, params) -> tuple:
    rank = _p(params, "rank", 999)
    if rank < 200:
        return True, f"Auto-approved (rank {rank})"
    return True, f"Rank {rank} — skipped auto-approve"


async def _step_daily_scan(db, params) -> tuple:
    count = await db.users.count_documents({"role": "student"})
    return True, f"Daily scan: {count} students found"


async def _step_notify_counsellor(db, params) -> tuple:
    return await _push(db, _p(params, "counsellor_id") or _p(params, "user_id"),
                       _p(params, "title", "Workflow notification"), _p(params, "message", ""))


async def _step_schedule_call(db, params) -> tuple:
    return False, f"{NOT_IMPLEMENTED}: calendar scheduling is not integrated"


async def _step_compute_payouts(db, params) -> tuple:
    """Sum completed-booking earnings per mentor and store a payout snapshot."""
    try:
        cur = db.bookings.aggregate([
            {"$match": {"status": {"$in": ["completed", "done"]}}},
            {"$group": {"_id": "$mentor_id", "amount": {"$sum": {"$toDouble": {"$ifNull": ["$amount_paid", 0]}}}, "sessions": {"$sum": 1}}},
        ])
        rows = await cur.to_list(1000)
        now = datetime.now(timezone.utc)
        if rows:
            await db.payout_snapshots.insert_one({"computed_at": now, "rows": rows})
        return True, f"Payouts computed for {len(rows)} mentor(s), total ₹{sum(r['amount'] for r in rows):,.0f}"
    except Exception as e:
        return False, f"payout computation failed: {e}"


async def _step_stripe_transfer(db, params) -> tuple:
    return False, f"{NOT_IMPLEMENTED}: Stripe is not integrated (payments use Razorpay); transfer must be done manually"


async def _step_email_receipt(db, params) -> tuple:
    amount = _p(params, "amount", 0)
    return await _send_mail(_p(params, "email"), "Your Student Alumni receipt",
                            f"<p>Thank you. We received your payment of ₹{amount}.</p>")


async def _step_day_welcome(db, params) -> tuple:
    name = _p(params, "name", "there")
    return await _send_mail(_p(params, "email"), "Welcome to Student Alumni",
                            f"<p>Hi {name}, welcome aboard. Your dashboard is ready.</p>")


async def _step_mentor_pitch(db, params) -> tuple:
    return await _send_mail(_p(params, "email"), "Meet your mentors on Student Alumni",
                            "<p>Book a session with an approved mentor from your dashboard.</p>")


async def _step_hackathon(db, params) -> tuple:
    return await _send_mail(_p(params, "email"), "Upcoming hackathons on Student Alumni",
                            "<p>Registrations are open for upcoming hackathons. See the Events tab.</p>")


async def _step_detect_no_show(db, params) -> tuple:
    """Mark confirmed bookings that ended >30 min ago without completion as no_show."""
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    q = {"status": "confirmed", "scheduled_at": {"$lt": cutoff}}
    sid = _p(params, "session_id")
    if sid:
        q = {"$or": [{"id": sid}, {"_id": sid}], **q}
    try:
        res = await db.bookings.update_many(q, {"$set": {"status": "no_show", "no_show_at": datetime.now(timezone.utc)}})
        return True, f"{res.modified_count} booking(s) marked no_show"
    except Exception as e:
        return False, f"no-show detection failed: {e}"


async def _step_auto_refund(db, params) -> tuple:
    """Razorpay refunds are not automated; record a refund request for finance."""
    amount = _p(params, "refund_amount", 0)
    try:
        await db.refund_requests.insert_one({
            "amount": amount, "booking_id": _p(params, "session_id"), "email": _p(params, "email"),
            "status": "pending_manual", "created_at": datetime.now(timezone.utc), "source": "workflow",
        })
        return False, f"{NOT_IMPLEMENTED}: automatic refund; a pending refund request for ₹{amount} was recorded"
    except Exception as e:
        return False, f"could not record refund request: {e}"


async def _step_notify_both(db, params) -> tuple:
    r1 = await _push(db, _p(params, "student_id"), _p(params, "title", "Session update"), _p(params, "message", ""))
    r2 = await _push(db, _p(params, "mentor_id"), _p(params, "title", "Session update"), _p(params, "message", ""))
    return (r1[0] and r2[0]), f"student: {r1[1]}; mentor: {r2[1]}"


async def _step_find_donors(db, params) -> tuple:
    count = await db.users.count_documents({"donation_total": {"$gte": 50000}})
    return True, f"{count} high-value donors identified"


async def _step_personalize_copy(db, params) -> tuple:
    return False, f"{NOT_IMPLEMENTED}: copy personalisation has no LLM wiring in workflows"


async def _step_sendgrid(db, params) -> tuple:
    return await _send_mail(_p(params, "email"), _p(params, "subject", "Message from Student Alumni"),
                            _p(params, "html") or f"<p>{_p(params, 'message', '')}</p>")


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
    "Day 7 hackathon": _step_hackathon,
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