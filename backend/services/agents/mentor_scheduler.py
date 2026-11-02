"""
mentor_scheduler.py — MT-suite background scheduler for the Mentor portal.

Wired into the house 30-minute agent cycle (services/agents/agent_scheduler.py)
exactly like TP23 (talent_scheduler.py): each step self-gates on its own
cadence (last_run stored on `settings` doc id=`mentor_suite_scheduler`), so
calling `run()` every 30 minutes is safe; steps that are not yet due no-op.

Master gate (env, read at call time):
  MENTOR_SCHEDULER_ENABLED  default "1" — kill-switch for the whole suite

No new third-party dependencies: every step lives in
services/agents/mentor_agents.py (deterministic, keyword-based).
"""
from __future__ import annotations

import os
from datetime import timedelta
from typing import Any, Dict, List

from services.agents.talent_common import (
    now_utc, as_datetime, import_optional, agent_run_log,
)

SETTINGS_ID = "mentor_suite_scheduler"
MASTER_ENV = "MENTOR_SCHEDULER_ENABLED"

STEP_MODULE = "services.agents.mentor_agents"


def _env_flag(name: str, default: str) -> bool:
    return os.environ.get(name, default).strip() == "1"


# ── Step registry ───────────────────────────────────────────────────
# cadence_hours: 0 = run every cycle. extra_args: appended after `db`.
STEPS: List[Dict[str, Any]] = [
    # auto-categorization of pending/unclassified mentors (MT8)
    {"key": "categorize", "cadence_hours": 24, "module": STEP_MODULE,
     "entry": "categorize_pending_mentors", "extra_args": ["mentor_scheduler", 500]},
    # engagement scores + disengagement flags (MT10)
    {"key": "engagement", "cadence_hours": 12, "module": STEP_MODULE,
     "entry": "compute_engagement_scores", "extra_args": [500]},
    # session-quality flags on last-10 reviews (MT11)
    {"key": "quality", "cadence_hours": 6, "module": STEP_MODULE,
     "entry": "refresh_quality_flags", "extra_args": []},
    # career-opening content digest (MT12)
    {"key": "content_digest", "cadence_hours": 24, "module": STEP_MODULE,
     "entry": "mentor_content_digest", "extra_args": []},
    # booking-demand vs availability gap analysis (MT13)
    {"key": "availability", "cadence_hours": 24, "module": STEP_MODULE,
     "entry": "availability_insights", "extra_args": []},
    # milestone badge awards (MT14)
    {"key": "badges", "cadence_hours": 24, "module": STEP_MODULE,
     "entry": "award_milestone_badges", "extra_args": ["mentor_scheduler"]},
]


def _is_due(last_runs: Dict[str, str], key: str, cadence_hours: float) -> bool:
    last = as_datetime(last_runs.get(key))
    if last is None:
        return True
    return (now_utc() - last) >= timedelta(hours=cadence_hours)


async def _load_state(db) -> Dict[str, str]:
    doc = await db.settings.find_one({"id": SETTINGS_ID}) or {}
    return doc.get("last_runs") or {}


async def _save_state(db, last_runs: Dict[str, str]) -> None:
    await db.settings.update_one(
        {"id": SETTINGS_ID},
        {"$set": {"last_runs": last_runs, "updated_at": now_utc()}},
        upsert=True,
    )


async def run(db, force: bool = False) -> Dict[str, Any]:
    """Run every due step; not-due / gated steps are skipped.
    Never raises — the 30-minute house cycle must survive any one agent's bug."""
    if not _env_flag(MASTER_ENV, "1"):
        return {"master_gate": "disabled", "ran": [], "skipped": {}, "results": {}}
    last_runs: Dict[str, str] = dict(await _load_state(db))
    ran: List[str] = []
    skipped: Dict[str, str] = {}
    results: Dict[str, Any] = {}

    for step in STEPS:
        key = step["key"]
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
            await agent_run_log(db, "mentor_suite_scheduler", key, status="SUCCESS",
                                detail=results[key] if isinstance(results[key], (dict, int, str)) else "ok")
        except Exception as e:  # noqa: BLE001
            skipped[key] = f"error: {e}"
            await agent_run_log(db, "mentor_suite_scheduler", key, status="FAILED", error=str(e))

    try:
        await _save_state(db, last_runs)
    except Exception:  # noqa: BLE001
        pass
    await agent_run_log(db, "mentor_suite_scheduler", "cycle", detail={"ran": ran, "skipped": skipped})
    return {"master_gate": "enabled", "ran": ran, "skipped": skipped, "results": results}


async def status(db) -> Dict[str, Any]:
    """Registry state for the admin Agents panel: cadence, last run, gate flag."""
    last_runs = await _load_state(db)
    steps = [{
        "key": s["key"],
        "cadence_hours": s["cadence_hours"],
        "module": s["module"],
        "last_run_at": last_runs.get(s["key"]),
    } for s in STEPS]
    return {
        "settings_id": SETTINGS_ID,
        "master_enabled": _env_flag(MASTER_ENV, "1"),
        "steps": steps,
    }


class MentorSchedulerAgent:
    name = "Mentor Agent Suite Scheduler"
    group = "ops"
    priority = "P1"

    run = staticmethod(run)
    status = staticmethod(status)


mentor_scheduler_agent = MentorSchedulerAgent()
