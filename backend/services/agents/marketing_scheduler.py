"""
marketing_scheduler.py — PT5/PT6/PM6/PM7 background marketing agents.

Wired into the house 30-minute agent cycle (services/agents/agent_scheduler.py)
as a self-gating sub-registry, exactly like talent_scheduler.py: each step
stores its last run on `settings` doc id=`marketing_scheduler` and no-ops in
milliseconds when its cadence hasn't elapsed. Master gate + per-step env
flags let a deploy turn the whole suite off without code changes.

Master gates (env, read at call time):
  MARKETING_SCHEDULER_ENABLED  default "1" — kill-switch for the suite
  MARKETING_AGENT_EMAILS       default "1" — email admins when the suite
                               deactivates partners/promos; set "0" to log only

Steps:
  partner_contract_expiry   PT6 — daily: deactivate partners past contract_end,
                           email admin a summary
  promotion_auto_expiry     PM7 — daily: deactivate promos past ends_at,
                           email admin a summary
  promotion_recurrence      PM6 — daily: clone recurring promos for the next
                           period, archive the original, chain via
                           recurrence_parent_id
  marketing_compaction      PT5 — nightly: prune >30-day analytics buckets,
                           auto-settle A/B experiments (PM3) at >=1,000
                           impressions or 7 days
"""
from __future__ import annotations

import calendar
import os
from datetime import timedelta
from typing import Any, Dict, List

from services.agents.talent_common import (
    now_utc, as_datetime, import_optional, agent_run_log, log_activity,
)

SETTINGS_ID = "marketing_scheduler"
MASTER_ENV = "MARKETING_SCHEDULER_ENABLED"
EMAILS_ENV = "MARKETING_AGENT_EMAILS"
DEFAULT_ADMIN_EMAIL = "admin@studentalumni.ai"

_AB_MIN_IMPRESSIONS = 1000
_AB_MAX_AGE_DAYS = 7
_BUCKETS_RETAIN_DAYS = 30


def _env_flag(name: str, default: str) -> bool:
    return os.environ.get(name, default).strip() == "1"


def _admin_email() -> str:
    return os.environ.get("ADMIN_EMAIL") or DEFAULT_ADMIN_EMAIL


# ── Step registry ───────────────────────────────────────────────────
# cadence_hours: 0 = every cycle. env: (flag, default) or None.
# All steps live in this module; `module` is this file's import path.
STEPS: List[Dict[str, Any]] = [
    {"key": "partner_contract_expiry", "cadence_hours": 24,
     "module": "services.agents.marketing_scheduler",
     "entry": "partner_contract_expiry_step", "extra_args": [], "env": None},
    {"key": "promotion_auto_expiry", "cadence_hours": 24,
     "module": "services.agents.marketing_scheduler",
     "entry": "promotion_auto_expiry_step", "extra_args": [], "env": None},
    {"key": "promotion_recurrence", "cadence_hours": 24,
     "module": "services.agents.marketing_scheduler",
     "entry": "promotion_recurrence_step", "extra_args": [], "env": None},
    {"key": "marketing_compaction", "cadence_hours": 24,
     "module": "services.agents.marketing_scheduler",
     "entry": "marketing_compaction_step", "extra_args": [], "env": None},
]


def _is_due(last_runs: Dict[str, str], key: str, cadence_hours: float) -> bool:
    last = as_datetime(last_runs.get(key))
    if last is None:
        return True
    return (now_utc() - last) >= timedelta(hours=cadence_hours)


async def _load_state(db) -> Dict[str, Any]:
    doc = await db.settings.find_one({"id": SETTINGS_ID}) or {}
    return {"last_runs": doc.get("last_runs") or {}}


async def _save_state(db, last_runs: Dict[str, str]) -> None:
    await db.settings.update_one(
        {"id": SETTINGS_ID},
        {"$set": {"last_runs": last_runs, "updated_at": now_utc()}},
        upsert=True,
    )


# ── Admin e-mail helper (never raises) ──────────────────────────────
async def _notify_admin(db, subject: str, rows: List[Dict[str, str]]) -> Dict[str, Any]:
    """One summary e-mail listing deactivated items. Returns {sent, names}."""
    names = [r.get("name", "?") for r in rows]
    if not _env_flag(EMAILS_ENV, "1"):
        return {"sent": False, "names": names}
    try:
        from core.email import send_email, render_html_email
    except Exception:
        return {"sent": False, "names": names}
    html_rows = "".join(f"<tr><td style='padding:4px 8px;border-bottom:1px solid #eee'>{r['name']}</td>"
                        f"<td style='padding:4px 8px;border-bottom:1px solid #eee'>{r.get('meta', '')}</td></tr>"
                        for r in rows)
    body = (
        "<h3>Marketing agent summary</h3>"
        f"<p>{len(rows)} item(s) were automatically deactivated:</p>"
        f"<table>{html_rows}</table>"
        "<p>Managed from the Super Admin → Partners / Promotions views.</p>"
    )
    try:
        ok = bool(await send_email(_admin_email(), subject, render_html_email(body)))
    except Exception:
        ok = False
    return {"sent": ok, "names": names}


# ── PT6: partner contract expiry + auto-deactivation ────────────────
async def partner_contract_expiry_step(db) -> Dict[str, Any]:
    """Deactivate active partners whose contract_end has passed; notify admin."""
    today = now_utc().date()
    q = {"is_active": True, "contract_end": {"$exists": True, "$ne": None, "$lt": today}}
    docs = await db.collaboration_partners.find(q).to_list(length=500)
    now = now_utc()
    for d in docs:
        await db.collaboration_partners.update_one(
            {"_id": d["_id"]}, {"$set": {"is_active": False, "updated_at": now}},
        )
    rows = [{"name": d.get("name", "?"),
             "meta": f"contract ended {d.get('contract_end')}"} for d in docs]
    email = await _notify_admin(db, "Partner contracts expired — auto-deactivated", rows)
    await log_activity(db, "marketing_scheduler", "PartnerExpiry",
                       summary=f"Deactivated {len(docs)} expired partner contract(s)")
    return {"deactivated": len(docs), "email_sent": email["sent"]}


# ── PM7: promotion auto-expiry agent ────────────────────────────────
async def promotion_auto_expiry_step(db) -> Dict[str, Any]:
    """Deactivate active promos past ends_at; notify admin with a summary."""
    now = now_utc()
    q = {"is_active": True, "ends_at": {"$exists": True, "$ne": None, "$lt": now}}
    docs = await db.promotions.find(q).to_list(length=500)
    for d in docs:
        await db.promotions.update_one(
            {"_id": d["_id"]}, {"$set": {"is_active": False, "updated_at": now}},
        )
    rows = [{"name": d.get("title", "?"),
             "meta": f"ended {d.get('ends_at')}"} for d in docs]
    email = await _notify_admin(db, "Promotions expired — auto-deactivated", rows)
    await log_activity(db, "marketing_scheduler", "PromoExpiry",
                       summary=f"Deactivated {len(docs)} expired promotion(s)")
    return {"deactivated": len(docs), "email_sent": email["sent"]}


# ── PM6: recurring promotions ───────────────────────────────────────
def _advance_period(dt, recurrence: str):
    """Advance a datetime by one recurrence period; clamps the day for
    monthly (Jan 31 → Feb 28). Returns None for unknown recurrences."""
    if recurrence == "daily":
        return dt + timedelta(days=1)
    if recurrence == "weekly":
        return dt + timedelta(days=7)
    if recurrence == "monthly":
        y, m = dt.year, dt.month + 1
        if m > 12:
            m, y = 1, y + 1
        day = min(dt.day, calendar.monthrange(y, m)[1])
        return dt.replace(year=y, month=m, day=day)
    return None


async def promotion_recurrence_step(db) -> Dict[str, Any]:
    """Clone each active recurring promo for the next period(s), archive the
    original, link the clone via recurrence_parent_id. Catches up through any
    periods the agent missed (bounded to 365 advances)."""
    now = now_utc()
    q = {"is_active": True, "recurrence": {"$in": ["daily", "weekly", "monthly"]}}
    docs = await db.promotions.find(q).to_list(length=500)
    cloned = 0
    skipped = 0
    for d in docs:
        rec = d.get("recurrence")
        base = as_datetime(d.get("starts_at")) or as_datetime(d.get("created_at"))
        if base is None:
            skipped += 1
            continue
        start, end = base, as_datetime(d.get("ends_at"))
        advances = 0
        while start < now and advances < 365:
            start = _advance_period(start, rec)
            if start is None:
                break
            if end is not None:
                end = _advance_period(end, rec)
            advances += 1
        if start is None or start < now:  # unknown recurrence, or still behind
            skipped += 1
            continue
        await db.promotions.update_one(
            {"_id": d["_id"]}, {"$set": {"is_active": False, "updated_at": now}},
        )
        clone = {k: v for k, v in d.items()
                 if k not in ("_id", "created_at", "updated_at",
                              "analytics", "ab_experiment", "starts_at", "ends_at")}
        clone.update({
            "starts_at": start,
            "ends_at": end,
            "is_active": True,
            "recurrence_parent_id": str(d["_id"]),
            "analytics": {"impressions": 0, "clicks": 0},
            "ab_experiment": None,
            "created_at": now,
            "updated_at": now,
        })
        await db.promotions.insert_one(clone)
        cloned += 1
    await log_activity(db, "marketing_scheduler", "Recurrence",
                       summary=f"Rolled {cloned} recurring promotion(s) to next period")
    return {"cloned": cloned, "skipped": skipped}


# ── PT5/PM3: analytics compaction + A/B auto-settle ────────────────
def _ctr(ab: dict, side: str) -> float:
    imp = int((ab.get("impressions") or {}).get(side, 0) or 0)
    clk = int((ab.get("clicks") or {}).get(side, 0) or 0)
    return clk / imp if imp else 0.0


def _apply_winner(doc: dict, winner: str, now) -> Dict[str, Any]:
    """Fold the winning variant's copy into the base fields, mark settled."""
    ab = doc.get("ab_experiment") or {}
    v = ab.get(f"variant_{winner}", {}) or {}
    upd: Dict[str, Any] = {
        "updated_at": now,
        "ab_experiment.winner": winner,
        "ab_experiment.settled_at": now,
    }
    if v.get("title"):
        upd["title"] = v["title"]
    if v.get("body") is not None:
        upd["body"] = v.get("body", "")
    upd["cta_label"] = v.get("cta_label") or doc.get("cta_label")
    upd["cta_url"] = v.get("cta_url") or doc.get("cta_url")
    upd["badge"] = v.get("badge") or doc.get("badge")
    upd["tone"] = v.get("tone") or doc.get("tone")
    return upd


async def marketing_compaction_step(db) -> Dict[str, Any]:
    """PT5: prune analytics buckets older than 30 days (totals stay on the
    parent doc). PM3: auto-settle open A/B experiments at >=1,000 total
    impressions or 7 days old."""
    now = now_utc()
    cutoff_day = (now.date() - timedelta(days=_BUCKETS_RETAIN_DAYS)).isoformat()
    pruned_p = (await db.partner_event_daily.delete_many({"day": {"$lt": cutoff_day}})).deleted_count
    pruned_m = (await db.promotion_event_daily.delete_many({"day": {"$lt": cutoff_day}})).deleted_count

    settled = 0
    docs = await db.promotions.find(
        {"ab_experiment": {"$exists": True, "$type": "object"}},
    ).to_list(length=1000)
    for d in docs:
        ab = d.get("ab_experiment")
        if not isinstance(ab, dict) or ab.get("winner") or ab.get("settled_at"):
            continue
        total = int((ab.get("impressions") or {}).get("a", 0)) + int((ab.get("impressions") or {}).get("b", 0))
        started = as_datetime(ab.get("started_at"))
        due = total >= _AB_MIN_IMPRESSIONS or (
            started is not None and (now - started) >= timedelta(days=_AB_MAX_AGE_DAYS)
        )
        if not due:
            continue
        winner = "b" if _ctr(ab, "b") > _ctr(ab, "a") else "a"
        upd = _apply_winner(d, winner, now)
        await db.promotions.update_one({"_id": d["_id"]}, {"$set": upd})
        settled += 1

    await agent_run_log(db, "marketing_scheduler", "compaction",
                        detail={"pruned_partner_buckets": pruned_p,
                                "pruned_promo_buckets": pruned_m,
                                "ab_settled": settled})
    return {"pruned_partner_buckets": pruned_p,
            "pruned_promo_buckets": pruned_m,
            "ab_settled": settled}


# ── Suite runner (registry + self-gating, never raises) ────────────
async def run(db, force: bool = False) -> Dict[str, Any]:
    if not _env_flag(MASTER_ENV, "1"):
        return {"master_gate": "disabled", "ran": [], "skipped": {}, "results": {}}
    state = await _load_state(db)
    last_runs: Dict[str, str] = dict(state["last_runs"])
    ran: List[str] = []
    skipped: Dict[str, str] = {}
    results: Dict[str, Any] = {}

    for step in STEPS:
        key = step["key"]
        if not force and not _is_due(last_runs, key, step["cadence_hours"]):
            skipped[key] = "not_due"
            continue
        mod = import_optional(step["module"])
        entry = getattr(mod, step.get("entry"), None) if mod else None
        if entry is None:
            skipped[key] = "entry_not_ready"
            continue
        try:
            out = await entry(db, *step.get("extra_args", []))
            results[key] = out if isinstance(out, (dict, list, int, str)) else str(out)
            last_runs[key] = now_utc().isoformat()
            ran.append(key)
            await agent_run_log(db, "marketing_scheduler", key, status="SUCCESS",
                                detail={"result": results[key] if isinstance(results[key], (dict, int, str)) else "ok"})
        except Exception as e:
            skipped[key] = f"error: {e}"
            await agent_run_log(db, "marketing_scheduler", key, status="FAILED", error=str(e))

    try:
        await _save_state(db, last_runs)
    except Exception:
        pass
    await agent_run_log(db, "marketing_scheduler", "cycle",
                        detail={"ran": ran, "skipped": skipped})
    return {"master_gate": "enabled", "ran": ran, "skipped": skipped, "results": results}


async def status(db) -> Dict[str, Any]:
    state = await _load_state(db)
    last_runs = state["last_runs"]
    steps = [{
        "key": s["key"],
        "cadence_hours": s["cadence_hours"],
        "last_run_at": last_runs.get(s["key"]),
    } for s in STEPS]
    return {
        "settings_id": SETTINGS_ID,
        "master_enabled": _env_flag(MASTER_ENV, "1"),
        "emails_enabled": _env_flag(EMAILS_ENV, "1"),
        "steps": steps,
    }


async def agent_status(db) -> Dict[str, Any]:
    st = await status(db)
    st.setdefault("name", "Marketing Agent Suite (PT5/PT6/PM6/PM7)")
    st.setdefault("group", "marketing")
    st.setdefault("priority", "P2")
    return st


class MarketingSchedulerAgent:
    name = "Marketing Agent Suite (PT5/PT6/PM6/PM7)"
    group = "marketing"
    priority = "P2"

    run = staticmethod(run)
    status = staticmethod(status)


marketing_scheduler_agent = MarketingSchedulerAgent()
