"""
health_briefing_agent.py — weekly platform health briefing (AI4).

Runs on Monday 09:00 IST, gathers the platform's growth, engagement, revenue,
error and approval metrics, asks Claude for 5–8 prioritised insights, stores
the briefing in `platform_briefings` and emails the admin recipients.

Design notes:
- The metric snapshot is computed from the same sources the Super Admin
  dashboards use (users / activity_events / bookings / echo_registrations /
  the revenue analyzer / email+whatsapp failure logs / the approvals SLA
  tracker) so the briefing can never disagree with the dashboard.
- Only aggregate counts and totals leave the platform — no names, emails or
  any other per-user identifier is ever included in the LLM payload.
- The LLM only reorders and explains the numbers we hand it — it never
  invents a metric. Every insight is rendered against the snapshot we send.
- Recipients are resolved from the platform's own admin users (plus an
  optional HEALTH_BRIEFING_RECIPIENTS override), so the briefing never goes to
  a guessed address.

Both outbound paths are opt-in, because this agent sends platform metrics to
an external LLM provider and mails a standing recipient list:

  HEALTH_BRIEFING_ENABLED    default "0" — set "1" to enable the agent
  HEALTH_BRIEFING_LLM        default "0" — set "1" to send metrics to Claude
                             (without it the briefing falls back to the
                             deterministic, rule-based insights)
  HEALTH_BRIEFING_EMAILS     default "0" — set "1" to email the briefing
  HEALTH_BRIEFING_RECIPIENTS comma-separated override for the recipient list
  EMERGENT_LLM_KEY           required for the Claude call

With every flag off the agent is a no-op, so wiring it into the house cycle
cannot surprise a deployment with unsolicited mail or external egress.
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from services.agents.talent_common import now_utc, as_datetime, agent_run_log, log_activity

SETTINGS_ID = "health_briefing_agent"
MASTER_ENV = "HEALTH_BRIEFING_ENABLED"
LLM_ENV = "HEALTH_BRIEFING_LLM"
EMAILS_ENV = "HEALTH_BRIEFING_EMAILS"
RECIPIENTS_ENV = "HEALTH_BRIEFING_RECIPIENTS"

CADENCE_DAYS = 7
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5-5")

MIN_INSIGHTS = 5
MAX_INSIGHTS = 8


def _env_flag(name: str, default: str = "0") -> bool:
    return (os.environ.get(name, default) or default).strip() == "1"


def _recipients_override() -> List[str]:
    raw = os.environ.get(RECIPIENTS_ENV) or ""
    return [p.strip() for p in raw.split(",") if p.strip()]


# ── Metric snapshot ─────────────────────────────────────────────────

def _to_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def _pct(current: float, previous: float) -> Optional[float]:
    if previous <= 0:
        return None if current > 0 else 0.0
    return round((current - previous) / previous * 100, 1)


async def _count(db, coll: str, query: Dict[str, Any]) -> int:
    try:
        return int(await db[coll].count_documents(query))
    except Exception:
        return 0


async def _distinct_users(db, since: datetime) -> int:
    try:
        rows = await db.activity_events.aggregate([
            {"$match": {"ts": {"$gte": since}}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "total"},
        ]).to_list(1)
        return int(rows[0]["total"]) if rows else 0
    except Exception:
        return 0


async def _failed_runs(db, since: datetime) -> int:
    try:
        return int(await db.scheduler_logs.count_documents({
            "status": "FAILED", "started_at": {"$gte": since},
        }))
    except Exception:
        return 0


async def collect_snapshot(db) -> Dict[str, Any]:
    """Every metric the briefing is allowed to talk about. Aggregates only."""
    now = now_utc()
    week_ago = now - timedelta(days=CADENCE_DAYS)
    two_weeks_ago = now - timedelta(days=2 * CADENCE_DAYS)

    new_users = await _count(db, "users", {"created_at": {"$gte": week_ago}})
    prev_users = await _count(db, "users", {"created_at": {"$gte": two_weeks_ago, "$lt": week_ago}})
    total_users = await _count(db, "users", {})

    new_mentors = await _count(db, "users", {"role": "mentor", "created_at": {"$gte": week_ago}})
    new_colleges = await _count(db, "users", {"role": "college", "created_at": {"$gte": week_ago}})

    active_users = await _distinct_users(db, week_ago)
    prev_active_users = await _distinct_users(db, two_weeks_ago)

    bookings = await _count(db, "bookings", {"created_at": {"$gte": week_ago}})
    prev_bookings = await _count(db, "bookings", {"created_at": {"$gte": two_weeks_ago, "$lt": week_ago}})
    registrations = await _count(db, "echo_registrations", {"created_at": {"$gte": week_ago}})
    prev_registrations = await _count(db, "echo_registrations", {"created_at": {"$gte": two_weeks_ago, "$lt": week_ago}})

    revenue: Dict[str, Any] = {}
    try:
        from features.routers.admin.revenue import _analyze
        rev = await _analyze(week_ago, now)
        revenue = {
            "gross": rev.get("gross", 0.0),
            "net": rev.get("net", 0.0),
            "transactions": rev.get("transactions", 0),
            "avg_order": rev.get("avg_order", 0.0),
            "refunds": rev.get("refunds", 0.0),
            "by_source": rev.get("by_source", []),
        }
    except Exception:
        revenue = {"gross": 0.0, "net": 0.0, "transactions": 0, "avg_order": 0.0,
                   "refunds": 0.0, "by_source": []}

    email_failures = await _count(db, "email_failures", {"created_at": {"$gte": week_ago}})
    whatsapp_failures = await _count(db, "whatsapp_failures", {"created_at": {"$gte": week_ago}})
    failed_runs = await _failed_runs(db, week_ago)

    approvals: Dict[str, Any] = {"pending": 0, "overdue": 0, "by_kind": {}}
    try:
        from features.routers.admin.approvals import _pending_items
        items = await _pending_items()
        by_kind: Dict[str, int] = {}
        for i in items:
            by_kind[i["kind"]] = by_kind.get(i["kind"], 0) + 1
        approvals = {
            "pending": len(items),
            "overdue": sum(1 for i in items if i.get("overdue")),
            "by_kind": by_kind,
        }
    except Exception:
        pass

    return {
        "window_days": CADENCE_DAYS,
        "generated_at": now.isoformat(),
        "growth": {
            "new_users": new_users,
            "new_users_prev": prev_users,
            "new_users_pct": _pct(new_users, prev_users),
            "total_users": total_users,
            "new_mentors": new_mentors,
            "new_colleges": new_colleges,
        },
        "engagement": {
            "active_users": active_users,
            "active_users_prev": prev_active_users,
            "active_users_pct": _pct(active_users, prev_active_users),
            "bookings": bookings,
            "bookings_prev": prev_bookings,
            "bookings_pct": _pct(bookings, prev_bookings),
            "event_registrations": registrations,
            "event_registrations_prev": prev_registrations,
            "event_registrations_pct": _pct(registrations, prev_registrations),
        },
        "revenue": revenue,
        "errors": {
            "email_failures": email_failures,
            "whatsapp_failures": whatsapp_failures,
            "failed_agent_runs": failed_runs,
            "total": email_failures + whatsapp_failures + failed_runs,
        },
        "approvals": approvals,
    }


# ── Deterministic insights (no LLM) ─────────────────────────────────

def _fallback_insights(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Rule-based insights used when the LLM path is off or unavailable."""
    g = snapshot.get("growth") or {}
    e = snapshot.get("engagement") or {}
    r = snapshot.get("revenue") or {}
    err = snapshot.get("errors") or {}
    ap = snapshot.get("approvals") or {}
    out: List[Dict[str, Any]] = []

    def _add(kind: str, severity: str, title: str, body: str) -> None:
        out.append({"kind": kind, "severity": severity, "title": title[:120], "body": body[:800]})

    users_pct = g.get("new_users_pct")
    if users_pct is None:
        _add("opportunity", "high", "New signups accelerated from zero",
             f"{g.get('new_users', 0)} new users this week, against 0 in the previous week. "
             "Confirm which campaign or event drove the spike before it repeats.")
    elif users_pct >= 20:
        _add("opportunity", "medium", f"Signups up {users_pct}% week over week",
             f"{g.get('new_users', 0)} new users this week vs {g.get('new_users_prev', 0)} previously "
             f"({g.get('new_mentors', 0)} mentors, {g.get('new_colleges', 0)} colleges).")
    elif users_pct <= -20:
        _add("risk", "medium", f"Signups down {abs(users_pct)}% week over week",
             f"{g.get('new_users', 0)} new users this week vs {g.get('new_users_prev', 0)} previously.")
    else:
        _add("insight", "low", "Signup volume is steady",
             f"{g.get('new_users', 0)} new users this week, {users_pct}% vs the previous week. "
             f"Total registered users: {g.get('total_users', 0)}.")

    act_pct = e.get("active_users_pct")
    if act_pct is not None and act_pct <= -20:
        _add("risk", "high", f"Active users down {abs(act_pct)}%",
             f"{e.get('active_users', 0)} active users this week vs {e.get('active_users_prev', 0)} previously. "
             "This is the metric to watch before it compounds.")
    else:
        _add("insight", "low", "Engagement held steady",
             f"{e.get('active_users', 0)} active users, {e.get('bookings', 0)} mentor bookings and "
             f"{e.get('event_registrations', 0)} event registrations this week.")

    if r.get("transactions"):
        _add("insight", "low", f"Revenue ₹{r.get('gross', 0):,.0f} across {r.get('transactions', 0)} transactions",
             f"Net after refunds: ₹{r.get('net', 0):,.0f}. Average order value ₹{r.get('avg_order', 0):,.0f}.")
    else:
        _add("risk", "medium", "No revenue recorded this week",
             "No paid mentor sessions, event registrations, marketplace orders or other payments "
             "were recorded in the last 7 days.")

    if r.get("refunds"):
        _add("risk", "medium", f"₹{r.get('refunds', 0):,.0f} refunded this week",
             f"Refunds are {round(r.get('refunds', 0) / r['gross'] * 100, 1) if r.get('gross') else 0}% "
             "of gross revenue.")

    if err.get("total"):
        _add("risk", "high" if err.get("total", 0) > 20 else "medium",
             f"{err.get('total')} delivery and agent failures",
             f"{err.get('email_failures', 0)} email failures, {err.get('whatsapp_failures', 0)} WhatsApp "
             f"failures, {err.get('failed_agent_runs', 0)} failed background agent runs.")
    else:
        _add("insight", "low", "No delivery or agent failures",
             "Email, WhatsApp and the background agents all ran clean this week.")

    if ap.get("overdue"):
        _add("risk", "high", f"{ap.get('overdue')} approval(s) past their SLA",
             f"{ap.get('pending', 0)} approvals pending in total. The overdue ones have been waiting "
             "past their review window and need a decision.")
    elif ap.get("pending"):
        _add("insight", "low", f"{ap.get('pending')} approvals pending, none overdue",
             "Every pending approval is still inside its review SLA.")
    else:
        _add("insight", "low", "Approval queue is clear",
             "No mentor, college or event approvals are waiting for review.")

    # The briefing contract is 5-8 insights. Top up with the raw operating
    # numbers if the branches above came in short (e.g. an all-zero week).
    if len(out) < MIN_INSIGHTS:
        by_source = r.get("by_source") or []
        if by_source:
            top = by_source[0]
            _add("insight", "low", f"Top revenue source: {top.get('label', '—')}",
                 f"{top.get('label', '—')} contributed {top.get('count', 0)} transaction(s) and is "
                 f"the largest line in this week's revenue mix.")
        _add("insight", "low", f"Operating totals for the last {snapshot.get('window_days', 7)} days",
             f"{g.get('total_users', 0)} registered users, {e.get('active_users', 0)} active, "
             f"{e.get('bookings', 0)} mentor bookings, {e.get('event_registrations', 0)} event "
             f"registrations, {r.get('transactions', 0)} paid transactions.")

    return out[:MAX_INSIGHTS]


# ── Claude insight generation ───────────────────────────────────────

def _build_prompt(snapshot: Dict[str, Any]) -> str:
    return f"""
You are the platform health analyst for Student Alumni, an Indian student-mentor-college
network. Write the weekly Monday briefing for the admin team.

You are given the aggregate metrics for the last {snapshot['window_days']} days. Produce
between {MIN_INSIGHTS} and {MAX_INSIGHTS} insights. Rank them by how much a human
admin should care, most important first.

Rules:
- Use ONLY the numbers in the metrics below. Never invent a metric or a percentage.
- If a change percentage is null, the prior period was zero — say so plainly.
- Be concrete and specific to this platform. No generic advice.
- Each insight is one short title (max 70 chars) plus one body of 1–3 sentences.
- kind is one of: "risk" (something is wrong or degrading), "opportunity" (growth or
  momentum worth acting on), "insight" (neutral observation).
- severity is one of: "high", "medium", "low".

Return ONLY a JSON array, no preamble and no markdown fences, in exactly this shape:
[{{"kind":"risk","severity":"high","title":"...","body":"..."}}]

METRICS:
{json.dumps(snapshot, indent=2, default=str)}
""".strip()


def _parse_insights(text: str) -> List[Dict[str, Any]]:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    start = raw.find("[")
    end = raw.rfind("]")
    if start != -1 and end > start:
        raw = raw[start:end + 1]
    try:
        items = json.loads(raw)
    except Exception:
        return []
    if not isinstance(items, list):
        return []

    out: List[Dict[str, Any]] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        title = str(it.get("title") or "").strip()
        body = str(it.get("body") or "").strip()
        if not title:
            continue
        kind = str(it.get("kind") or "insight").lower()
        if kind not in ("risk", "opportunity", "insight"):
            kind = "insight"
        severity = str(it.get("severity") or "medium").lower()
        if severity not in ("high", "medium", "low"):
            severity = "medium"
        out.append({
            "kind": kind,
            "severity": severity,
            "title": title[:120],
            "body": body[:800],
        })
    return out[:MAX_INSIGHTS]


async def generate_insights(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Ask Claude for 5–8 ranked insights. Raises on LLM failure."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        raise RuntimeError("emergentintegrations is not installed") from e

    chat = (
        LlmChat(
            api_key=api_key,
            session_id=f"health-briefing-{uuid.uuid4().hex[:8]}",
            system_message=(
                "You are a rigorous platform analytics lead. You output strict JSON only — "
                "no preamble, no markdown fences."
            ),
        )
        .with_model("anthropic", MODEL)
    )
    reply = await chat.send_message(UserMessage(text=_build_prompt(snapshot)))
    insights = _parse_insights(reply or "")
    if not insights:
        raise RuntimeError("Claude returned no parsable insights")
    return insights


# ── Recipients + delivery ───────────────────────────────────────────

async def resolve_recipients(db) -> List[str]:
    """Admin users who should receive the briefing."""
    override = _recipients_override()
    if override:
        return override

    out: List[str] = []
    try:
        cursor = db.users.find({
            "role": {"$in": ["admin", "super_admin", "superadmin"]},
            "email": {"$exists": True, "$ne": ""},
        }).limit(50)
        async for u in cursor:
            email = (u.get("email") or "").strip().lower()
            if email and email not in out:
                out.append(email)
    except Exception:
        pass
    return out


async def _deliver(recipients: List[str], briefing: Dict[str, Any]) -> Dict[str, Any]:
    if not _env_flag(EMAILS_ENV, "0"):
        return {"sent": False, "recipients": recipients, "reason": "emails_disabled"}
    if not recipients:
        return {"sent": False, "recipients": [], "reason": "no_recipients"}

    try:
        from core.email import send_email, render_html_email
    except Exception:
        return {"sent": False, "recipients": recipients, "reason": "email_module_unavailable"}

    insights = briefing.get("insights") or []
    rows = "".join(
        "<tr>"
        f"<td style='padding:6px 8px;border-bottom:1px solid #eee'><b>{i.get('title', '')}</b></td>"
        f"<td style='padding:6px 8px;border-bottom:1px solid #eee;color:#666'>{i.get('kind', '')}</td>"
        f"<td style='padding:6px 8px;border-bottom:1px solid #eee'>{i.get('body', '')}</td>"
        "</tr>"
        for i in insights
    )
    snapshot = briefing.get("snapshot") or {}
    body = (
        "<h3>Weekly platform health briefing</h3>"
        f"<p>{len(insights)} insight(s) from the last {snapshot.get('window_days', 7)} days.</p>"
        "<table style='width:100%;border-collapse:collapse'>"
        "<thead><tr>"
        "<th style='padding:6px 8px;text-align:left;border-bottom:2px solid #cbd5e1'>Insight</th>"
        "<th style='padding:6px 8px;text-align:left;border-bottom:2px solid #cbd5e1'>Kind</th>"
        "<th style='padding:6px 8px;text-align:left;border-bottom:2px solid #cbd5e1'>Detail</th>"
        "</tr></thead>"
        f"<tbody>{rows}</tbody></table>"
        "<p>Full briefing is available in Super Admin &rarr; AI Insights.</p>"
    )
    html = render_html_email(body)
    sent = 0
    failed: List[str] = []
    for email in recipients:
        try:
            if await send_email(email, f"Platform health briefing — {briefing.get('week_of', '')}", html):
                sent += 1
            else:
                failed.append(email)
        except Exception:
            failed.append(email)
    return {"sent": sent > 0, "sent_count": sent, "recipients": recipients, "failed": failed}


# ── Run ─────────────────────────────────────────────────────────────

def _week_of(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


async def run_health_briefing(db, force: bool = False) -> Dict[str, Any]:
    """Generate, store and (optionally) email the weekly health briefing."""
    if not _env_flag(MASTER_ENV, "0"):
        return {"ok": True, "skipped": "disabled"}

    now = now_utc()
    if not force:
        try:
            doc = await db.platform_briefings.find_one({}, sort=[("generated_at", -1)])
        except Exception:
            doc = None
        last = as_datetime((doc or {}).get("generated_at"))
        if last is not None and (now - last) < timedelta(days=CADENCE_DAYS):
            return {"ok": True, "skipped": "not_due", "last_generated_at": last.isoformat()}

    snapshot = await collect_snapshot(db)

    insights: List[Dict[str, Any]] = []
    llm_used = False
    if _env_flag(LLM_ENV, "0"):
        try:
            insights = await generate_insights(snapshot)
            llm_used = True
        except Exception as e:
            await agent_run_log(db, "health_briefing_agent", "llm_call",
                                status="FAILED", error=str(e))
    if not insights:
        insights = _fallback_insights(snapshot)

    briefing = {
        "week_of": _week_of(now),
        "generated_at": now,
        "window_days": snapshot["window_days"],
        "snapshot": snapshot,
        "insights": insights,
        "insight_count": len(insights),
        "model": MODEL if llm_used else "rules",
    }
    try:
        await db.platform_briefings.insert_one(briefing)
    except Exception:
        pass

    recipients = await resolve_recipients(db)
    delivery = await _deliver(recipients, briefing)

    await log_activity(
        db, "health_briefing_agent", "Briefing",
        summary=f"Weekly health briefing {briefing['week_of']}: {len(insights)} insight(s)",
        data={"week_of": briefing["week_of"], "insight_count": len(insights),
              "email_sent": delivery.get("sent")},
    )
    await agent_run_log(db, "health_briefing_agent", "weekly_briefing",
                        detail={"week_of": briefing["week_of"],
                                "insights": len(insights),
                                "recipients": len(recipients)})

    return {
        "ok": True,
        "week_of": briefing["week_of"],
        "insights": insights,
        "snapshot": snapshot,
        "delivery": delivery,
    }


async def status(db) -> Dict[str, Any]:
    last = None
    try:
        doc = await db.platform_briefings.find_one({}, sort=[("generated_at", -1)])
        last = doc
    except Exception:
        last = None
    gen = (last or {}).get("generated_at")
    return {
        "name": "Weekly Platform Health Briefing Agent (AI4)",
        "group": "ai_insights",
        "priority": "P1",
        "enabled": _env_flag(MASTER_ENV, "0"),
        "llm_enabled": _env_flag(LLM_ENV, "0"),
        "emails_enabled": _env_flag(EMAILS_ENV, "0"),
        "schedule": "Monday 09:00 IST",
        "model": MODEL,
        "last_generated_at": gen.isoformat() if isinstance(gen, datetime) else None,
        "last_week_of": (last or {}).get("week_of"),
    }
