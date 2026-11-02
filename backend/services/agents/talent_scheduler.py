"""
talent_scheduler.py — TP23: background sync scheduler for the Talent Pool suite.

Wired into the house 30-minute agent cycle (services/agents/agent_scheduler.py
`_run_bgv_agents`-style hook) so there is exactly one scheduler process — no
celery/redis. Each step self-gates on its own cadence (last_run stored on
`settings` doc id=`tp23_scheduler`), so calling `run()` every 30 minutes is
safe; steps that are not yet due no-op in milliseconds.

Master gates (env, read at call time):
  TP_SCHEDULER_ENABLED   default "1" — kill-switch for the whole suite
  TP_RUN_ON_STARTUP      default "0" — force one full run at server boot
  Per-step env flags are listed in the STEP registry below (e.g.
  TP_DRIP_ENABLED default "0" so real emails never go out without an
  explicit deploy opt-in).

Steps whose module is not present yet (agent under construction / optional)
are skipped with reason `module_not_ready` — the registry is the single
place to wire a new agent in.
"""
from __future__ import annotations

import os
from datetime import timedelta
from typing import Any, Dict, List, Optional

from services.agents.talent_common import (
    now_utc, as_datetime, import_optional, agent_run_log, log_activity,
)

SETTINGS_ID = "tp23_scheduler"
MASTER_ENV = "TP_SCHEDULER_ENABLED"
RUN_ON_STARTUP_ENV = "TP_RUN_ON_STARTUP"


def _env_flag(name: str, default: str) -> bool:
    return os.environ.get(name, default).strip() == "1"


# ── Step registry ───────────────────────────────────────────────────
# cadence_hours: 0 = run every cycle. env: (flag, default) or None.
# extra_args: positional args appended after `db` when the entry is called.
STEPS: List[Dict[str, Any]] = [
    # quality re-score: keep the admin "needs attention" queue live (6h)
    {"key": "quality_scan", "cadence_hours": 6, "module": "services.agents.talent_quality_scorer",
     "entry": "score_profiles", "extra_args": [5000], "env": None},
    # canonical skill seed + admin alias overlay (daily is plenty)
    {"key": "taxonomy_seed", "cadence_hours": 24, "module": "services.agents.talent_skill_taxonomy",
     "entry": "ensure_taxonomy", "extra_args": [], "env": None},
    {"key": "alias_overlay", "cadence_hours": 24, "module": "services.agents.talent_skill_taxonomy",
     "entry": "load_alias_overlay", "extra_args": [], "env": None},
    # PII encryption backfill + weekly compliance sweep
    {"key": "pii_encrypt", "cadence_hours": 24, "module": "services.agents.talent_compliance",
     "entry": "encrypt_pool_pii", "extra_args": [2000], "env": None},
    # email drips: every cycle, but OFF until a deploy explicitly opts in
    {"key": "drips", "cadence_hours": 0, "module": "services.agents.talent_outreach",
     "entry": "run_due_drips", "extra_args": [], "env": ("TP_DRIP_ENABLED", "0")},
    # daily ML ranker refresh (TP19)
    {"key": "ranker_daily", "cadence_hours": 24, "module": "services.agents.talent_ranker",
     "entry": "retrain", "extra_args": [], "env": None},
    # daily cross-collection dedup/entity resolution (TP20)
    {"key": "dedup_daily", "cadence_hours": 24, "module": "services.agents.talent_dedup",
     "entry": "find_duplicate_groups", "extra_args": [5000], "env": None},
    # weekly pool insights for the dashboard (TP27)
    {"key": "insights_weekly", "cadence_hours": 168, "module": "services.agents.talent_insights",
     "entry": "generate_weekly_insights", "extra_args": [], "env": None},
    # external job boards: Naukri + Internshala every 12h (TP28/TP29)
    {"key": "external_jobs_12h", "cadence_hours": 12, "module": "services.agents.talent_external_jobs",
     "entry": "fetch_external_jobs", "extra_args": [], "env": ("TP_SPIDERS_ENABLED", "1")},
    # WhatsApp free-tier usage watch (TP30 — key-gated inside; only alerts, never sends)
    {"key": "whatsapp_watch", "cadence_hours": 6, "module": "services.agents.talent_whatsapp",
     "entry": "usage_alert", "extra_args": [], "env": None},
    # ATS/CRM push + calendar sync (TP31/TP32 — key-gated inside)
    {"key": "ats_push", "cadence_hours": 12, "module": "services.agents.talent_integrations",
     "entry": "push_due_updates", "extra_args": [], "env": None},
    {"key": "calendar_sync", "cadence_hours": 6, "module": "services.agents.talent_interviews",
     "entry": "calendar_sync", "extra_args": [], "env": None},
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


async def run(db, force: bool = False) -> Dict[str, Any]:
    """Run every due step; not-due / gated / unavailable steps are skipped.
    Never raises — the 30-minute house cycle must survive any one agent's bug."""
    if not _env_flag(MASTER_ENV, "1"):
        return {"master_gate": "disabled", "ran": [], "skipped": {}, "results": {}}
    state = await _load_state(db)
    last_runs: Dict[str, str] = dict(state["last_runs"])
    ran: List[str] = []
    skipped: Dict[str, str] = {}
    results: Dict[str, Any] = {}

    for step in STEPS:
        key = step["key"]
        env = step.get("env")
        if env is not None:
            flag, default = env
            if not _env_flag(flag, default):
                skipped[key] = f"{flag} disabled"
                continue
        if not force and not _is_due(last_runs, key, step["cadence_hours"]):
            skipped[key] = "not_due"
            continue
        mod = import_optional(step["module"])
        if mod is None:
            skipped[key] = "module_not_ready"
            continue
        entry = getattr(mod, step.get("entry"), None)
        if entry is None:
            skipped[key] = f"no_entry:{step.get('entry')}"
            continue
        try:
            out = await entry(db, *step.get("extra_args", []))
            results[key] = out if isinstance(out, (dict, list, int, str)) else str(out)
            last_runs[key] = now_utc().isoformat()
            ran.append(key)
            await agent_run_log(db, "tp23_scheduler", key, status="SUCCESS",
                                detail={"result": results[key] if isinstance(results[key], (dict, int, str)) else "ok"})
        except Exception as e:
            skipped[key] = f"error: {e}"
            await agent_run_log(db, "tp23_scheduler", key, status="FAILED", error=str(e))

    try:
        await _save_state(db, last_runs)
    except Exception:
        pass
    await agent_run_log(db, "tp23_scheduler", "cycle", detail={"ran": ran, "skipped": skipped})
    return {"master_gate": "enabled", "ran": ran, "skipped": skipped, "results": results}


async def run_on_startup(db) -> Dict[str, Any]:
    """Boot-time catch-up run (opt-in via TP_RUN_ON_STARTUP=1)."""
    if not _env_flag(RUN_ON_STARTUP_ENV, "0"):
        return {"skipped": "TP_RUN_ON_STARTUP not set"}
    out = await run(db, force=True)
    await log_activity(db, "tp23_scheduler", "Sync",
                       summary=f"Startup catch-up: ran {len(out.get('ran', []))} steps")
    return out


async def status(db) -> Dict[str, Any]:
    """Registry state for the admin dashboard: cadence, last run, gate flags."""
    state = await _load_state(db)
    last_runs = state["last_runs"]
    steps = []
    for step in STEPS:
        key = step["key"]
        env = step.get("env")
        gate = f"{env[0]}={os.environ.get(env[0], env[1])}" if env else "always"
        steps.append({
            "key": key,
            "cadence_hours": step["cadence_hours"],
            "gate": gate,
            "module": step["module"],
            "last_run_at": last_runs.get(key),
        })
    return {
        "settings_id": SETTINGS_ID,
        "master_enabled": _env_flag(MASTER_ENV, "1"),
        "steps": steps,
    }


async def agent_status(db) -> Dict[str, Any]:
    """Dashboard-card alias for `status` (the aggregator probes this name)."""
    st = await status(db)
    st.setdefault("name", "TP23 Background Scheduler")
    st.setdefault("group", "ops")
    st.setdefault("priority", "P1")
    return st


class TalentSchedulerAgent:
    name = "TP23 Background Scheduler"
    group = "ops"
    priority = "P1"

    run = staticmethod(run)
    run_on_startup = staticmethod(run_on_startup)
    status = staticmethod(status)


talent_scheduler_agent = TalentSchedulerAgent()
