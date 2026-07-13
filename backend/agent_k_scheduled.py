"""
agent_k_scheduled.py — Scheduled (cron) automations for Agent K.

Lets a logged-in user create recurring Agent K jobs (e.g. "Every Monday at
9:00 AM, draft my application for the top job match"). The scheduler runs
inside the FastAPI process via APScheduler's AsyncIOScheduler with a single
"tick" job that fires every 60 seconds, scans the `agent_k_schedules`
collection for due rows, and dispatches each one through the existing
agent_k planner + executor.

Persistence model
─────────────────
`agent_k_schedules`
  _id          ObjectId
  user_id      str             — owner (must be valid user)
  user_email   str             — convenience
  title        str             — human label shown in UI
  prompt       str             — the Agent K prompt to run on tick
  cadence      str             — one of "hourly" | "daily" | "weekly" | "cron"
  hour         int  (0..23)    — for daily/weekly
  minute       int  (0..59)    — for daily/weekly
  weekday      int  (0..6)     — Mon..Sun, for weekly
  interval_hours int           — for hourly
  cron_expr    str             — for "cron" cadence (5-field crontab)
  timezone     str             — IANA zone (default "UTC")
  status       str             — "active" | "paused"
  last_run_at  datetime|null
  last_run_id  str|null        — agent_runs._id of last execution
  last_status  str|null
  next_run_at  datetime        — next scheduled tick (UTC)
  runs_count   int
  created_at   datetime
  updated_at   datetime

Endpoints (all under /api):
  GET    /agent-k/scheduled              — list user's schedules
  POST   /agent-k/scheduled              — create
  GET    /agent-k/scheduled/{id}         — fetch one
  PATCH  /agent-k/scheduled/{id}         — update (pause/resume, edit)
  DELETE /agent-k/scheduled/{id}         — delete
  POST   /agent-k/scheduled/{id}/run-now — fire immediately (out-of-band)
  GET    /agent-k/scheduled/{id}/runs    — runs created by this schedule

Safety rules
────────────
- Same BYO-AI gate as /agent-k/run — schedule WILL NOT fire if the owner
  has no connected AI provider. Failure is recorded with last_status="no_ai".
- Only auto-executes plans whose every step is read/write (no spend, submit,
  communicate). Plans with approval-required steps are recorded but left in
  `awaiting_step_approval` so the user can approve from /agent-k.
- A schedule cannot fire more than once per minute regardless of cadence.
"""
from __future__ import annotations
import os
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from bson import ObjectId
from croniter import croniter
from fastapi import APIRouter, Body, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
import pytz
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Reuse the Agent K engine — plan + execute the run through the same
# pipeline the manual /agent-k/run uses.
from agent_k import (  # noqa: E402
    _resolve_user as _ak_resolve_user,
    _plan_with_claude as _ak_plan_with_claude,
    _execute_run as _ak_execute_run,
    _connected_ai_providers as _ak_connected_ai_providers,
    _is_admin as _ak_is_admin,
    TOOL_REGISTRY as _AK_TOOL_REGISTRY,
)

log = logging.getLogger("agent-k.scheduled")
log.setLevel(logging.INFO)

from core.db import db as _db

router = APIRouter(tags=["agent-k-scheduled"])

# ────────────────────────────────────────────────────────────────
# Pydantic models
# ────────────────────────────────────────────────────────────────
Cadence = Literal["hourly", "daily", "weekly", "cron"]


class ScheduleCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=140)
    prompt: str = Field(..., min_length=4, max_length=2000)
    cadence: Cadence
    hour: int = Field(9, ge=0, le=23)
    minute: int = Field(0, ge=0, le=59)
    weekday: int = Field(0, ge=0, le=6)           # 0=Mon ... 6=Sun (cron-style)
    interval_hours: int = Field(6, ge=1, le=168)  # for hourly cadence
    cron_expr: Optional[str] = None
    timezone: str = "UTC"

    @field_validator("cron_expr")
    @classmethod
    def _validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        v = v.strip()
        if not croniter.is_valid(v):
            raise ValueError(f"Invalid crontab expression: '{v}'")
        return v

    @field_validator("timezone")
    @classmethod
    def _validate_tz(cls, v: str) -> str:
        if v not in pytz.all_timezones_set:
            raise ValueError(f"Unknown timezone '{v}'")
        return v


class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    prompt: Optional[str] = None
    cadence: Optional[Cadence] = None
    hour: Optional[int] = Field(default=None, ge=0, le=23)
    minute: Optional[int] = Field(default=None, ge=0, le=59)
    weekday: Optional[int] = Field(default=None, ge=0, le=6)
    interval_hours: Optional[int] = Field(default=None, ge=1, le=168)
    cron_expr: Optional[str] = None
    timezone: Optional[str] = None
    status: Optional[Literal["active", "paused"]] = None


# ────────────────────────────────────────────────────────────────
# Next-run computation
# ────────────────────────────────────────────────────────────────
def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _compute_next_run(doc: Dict[str, Any], *, from_dt: Optional[datetime] = None) -> datetime:
    """Compute the next fire time (UTC) for a schedule row."""
    tz_name = doc.get("timezone") or "UTC"
    try:
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = pytz.UTC
    base = from_dt or _now_utc()
    base_local = base.astimezone(tz)
    cadence = doc.get("cadence")

    if cadence == "cron" and doc.get("cron_expr"):
        it = croniter(doc["cron_expr"], base_local)
        nxt_local = it.get_next(datetime)
        return nxt_local.astimezone(timezone.utc)

    if cadence == "hourly":
        hours = int(doc.get("interval_hours") or 6)
        nxt = base + timedelta(hours=hours)
        # round to next exact minute
        nxt = nxt.replace(second=0, microsecond=0) + timedelta(minutes=1)
        return nxt

    if cadence == "weekly":
        weekday = int(doc.get("weekday") or 0)  # 0=Mon
        hour = int(doc.get("hour") or 9)
        minute = int(doc.get("minute") or 0)
        # local day-of-week: Monday=0..Sunday=6 (Python convention)
        days_ahead = (weekday - base_local.weekday()) % 7
        target_local = (base_local + timedelta(days=days_ahead)).replace(
            hour=hour, minute=minute, second=0, microsecond=0)
        if target_local <= base_local:
            target_local += timedelta(days=7)
        return target_local.astimezone(timezone.utc)

    # default → daily
    hour = int(doc.get("hour") or 9)
    minute = int(doc.get("minute") or 0)
    target_local = base_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target_local <= base_local:
        target_local += timedelta(days=1)
    return target_local.astimezone(timezone.utc)


def _render_cadence_label(doc: Dict[str, Any]) -> str:
    """Friendly cadence text shown in UI (e.g. 'Mon · 09:00 UTC')."""
    tz = doc.get("timezone") or "UTC"
    cadence = doc.get("cadence", "daily")
    if cadence == "cron":
        return f"cron({doc.get('cron_expr')}) {tz}"
    if cadence == "hourly":
        return f"every {int(doc.get('interval_hours') or 6)}h"
    if cadence == "weekly":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        wd = days[int(doc.get("weekday") or 0) % 7]
        return f"{wd} · {int(doc.get('hour') or 9):02d}:{int(doc.get('minute') or 0):02d} {tz}"
    # daily
    return f"daily · {int(doc.get('hour') or 9):02d}:{int(doc.get('minute') or 0):02d} {tz}"


# ────────────────────────────────────────────────────────────────
# Tick handler — runs every 60s in the AsyncIOScheduler
# ────────────────────────────────────────────────────────────────
async def _fire_schedule(doc: Dict[str, Any]) -> None:
    """Execute a single schedule row. Records outcome on the schedule doc
    and creates an agent_runs entry tagged with `schedule_id`."""
    sid = doc["_id"]
    user_id = doc.get("user_id")
    title = doc.get("title", "(untitled)")
    prompt = doc.get("prompt", "")
    log.info("agent-k.scheduled[fire] %s  user=%s  title=%s", sid, user_id, title)

    # Resolve user
    user = None
    try:
        user = await _db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await _db.users.find_one({"_id": user_id})
    if not user:
        await _db.agent_k_schedules.update_one(
            {"_id": sid},
            {"$set": {"status": "paused",
                      "last_status": "user_missing",
                      "updated_at": _now_utc()}},
        )
        return

    # BYO-AI gate (admins bypass)
    if not _ak_is_admin(user):
        providers = await _ak_connected_ai_providers(str(user["_id"]))
        if not providers:
            await _db.agent_k_schedules.update_one(
                {"_id": sid},
                {"$set": {
                    "last_run_at": _now_utc(),
                    "last_status": "no_ai_provider",
                    "next_run_at": _compute_next_run(doc),
                    "updated_at": _now_utc(),
                }, "$inc": {"runs_count": 1}},
            )
            return

    # Plan + insert run doc tagged with schedule_id
    try:
        plan = await _ak_plan_with_claude(prompt, user)
    except HTTPException as e:
        await _db.agent_k_schedules.update_one(
            {"_id": sid},
            {"$set": {
                "last_run_at": _now_utc(),
                "last_status": f"plan_error: {e.detail}",
                "next_run_at": _compute_next_run(doc),
                "updated_at": _now_utc(),
            }, "$inc": {"runs_count": 1}},
        )
        return
    except Exception as e:
        await _db.agent_k_schedules.update_one(
            {"_id": sid},
            {"$set": {
                "last_run_at": _now_utc(),
                "last_status": f"plan_failed: {e!s}",
                "next_run_at": _compute_next_run(doc),
                "updated_at": _now_utc(),
            }, "$inc": {"runs_count": 1}},
        )
        return

    now = _now_utc()
    run_doc = {
        "user_id": str(user["_id"]),
        "user_email": user.get("email"),
        "prompt": prompt,
        "status": "awaiting_approval" if plan.get("steps") else "completed",
        "plan": plan,
        "steps": [],
        "audit_log": [{"t": now.isoformat(), "event": "plan_created",
                       "details": plan.get("summary"), "schedule_id": str(sid)}],
        "started_at": now,
        "completed_at": None,
        "result_summary": None,
        "schedule_id": str(sid),
        "trigger": "scheduled",
    }
    ins = await _db.agent_runs.insert_one(run_doc)
    run_id = str(ins.inserted_id)

    # Only auto-execute if no step requires approval (read/write only).
    safe_to_autorun = all(
        not _AK_TOOL_REGISTRY.get(s.get("tool", ""), {}).get("requires_approval", True)
        for s in plan.get("steps", [])
    ) if plan.get("steps") else True

    final_status = "skipped_needs_approval"
    if safe_to_autorun and plan.get("steps"):
        try:
            await _ak_execute_run(run_id, user)
            final_status = "completed"
        except Exception as e:
            final_status = f"exec_failed: {e!s}"
    elif not plan.get("steps"):
        final_status = "no_steps"

    await _db.agent_k_schedules.update_one(
        {"_id": sid},
        {"$set": {
            "last_run_at": now,
            "last_run_id": run_id,
            "last_status": final_status,
            "next_run_at": _compute_next_run(doc, from_dt=now),
            "updated_at": _now_utc(),
        }, "$inc": {"runs_count": 1}},
    )


_TICK_LOCK = asyncio.Lock()


async def _tick_due_schedules() -> None:
    """Find every active schedule whose next_run_at <= now and fire them."""
    # Use a lock to prevent overlap if a prior tick is still running
    if _TICK_LOCK.locked():
        return
    async with _TICK_LOCK:
        now = _now_utc()
        # Limit to 10 firings per tick to avoid runaway
        cur = _db.agent_k_schedules.find({
            "status": "active",
            "next_run_at": {"$lte": now},
        }).limit(10)
        due = [d async for d in cur]
        if not due:
            return
        log.info("agent-k.scheduled[tick] firing %d due schedules", len(due))
        # Reserve them immediately so a re-tick doesn't double-fire
        ids = [d["_id"] for d in due]
        await _db.agent_k_schedules.update_many(
            {"_id": {"$in": ids}},
            {"$set": {"next_run_at": now + timedelta(minutes=2)}},  # bump forward
        )
        for d in due:
            try:
                await _fire_schedule(d)
            except Exception as e:
                log.exception("agent-k.scheduled[fire] failed: %s", e)


# ────────────────────────────────────────────────────────────────
# APScheduler boot — invoked from server.py @startup
# ────────────────────────────────────────────────────────────────
_scheduler = None  # populated by start_scheduler()


def start_scheduler() -> None:
    """Boot the AsyncIOScheduler if not already running.

    We bind a single 60-second job that polls the agent_k_schedules
    collection. The polling model is intentionally simple (no MongoDB
    job store) so the schedule edits are reflected on the very next
    minute without scheduler-side state mutations.

    Multi-replica deployments: set ``AGENT_K_SCHEDULER_ENABLED=0`` on
    every replica except one to avoid double-firing. The default
    behaviour (env var unset OR ``=1``) starts the scheduler; only
    a literal "0" / "false" / "off" disables it.
    """
    enabled = (os.environ.get("AGENT_K_SCHEDULER_ENABLED") or "1").strip().lower()
    if enabled in {"0", "false", "off", "no"}:
        log.info("agent-k.scheduled disabled by AGENT_K_SCHEDULER_ENABLED=%s", enabled)
        return
    global _scheduler
    if _scheduler is not None:
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError:
        log.error("APScheduler not installed — scheduled Agent K disabled")
        return

    sched = AsyncIOScheduler(timezone=pytz.UTC)
    sched.add_job(
        _tick_due_schedules,
        IntervalTrigger(seconds=60),
        id="agent_k_scheduled_tick",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(timezone.utc) + timedelta(seconds=15),
    )
    sched.start()
    _scheduler = sched
    log.info("agent-k.scheduled scheduler started (tick=60s)")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:
            pass
        _scheduler = None


# ────────────────────────────────────────────────────────────────
# REST endpoints
# ────────────────────────────────────────────────────────────────
def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id":              str(doc["_id"]),
        "title":           doc.get("title"),
        "prompt":          doc.get("prompt"),
        "cadence":         doc.get("cadence"),
        "hour":            doc.get("hour"),
        "minute":          doc.get("minute"),
        "weekday":         doc.get("weekday"),
        "interval_hours":  doc.get("interval_hours"),
        "cron_expr":       doc.get("cron_expr"),
        "timezone":        doc.get("timezone"),
        "status":          doc.get("status"),
        "cadence_label":   _render_cadence_label(doc),
        "last_run_at":     (doc.get("last_run_at").isoformat()
                            if isinstance(doc.get("last_run_at"), datetime) else None),
        "last_run_id":     doc.get("last_run_id"),
        "last_status":     doc.get("last_status"),
        "next_run_at":     (doc.get("next_run_at").isoformat()
                            if isinstance(doc.get("next_run_at"), datetime) else None),
        "runs_count":      int(doc.get("runs_count") or 0),
        "created_at":      (doc.get("created_at").isoformat()
                            if isinstance(doc.get("created_at"), datetime) else None),
    }


@router.get("/agent-k/scheduled")
async def list_schedules(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = await _ak_resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    cur = _db.agent_k_schedules.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    out: List[Dict[str, Any]] = [_serialize(d) async for d in cur]
    return {"schedules": out, "count": len(out)}


@router.post("/agent-k/scheduled")
async def create_schedule(body: ScheduleCreate, authorization: Optional[str] = Header(None)):
    user = await _ak_resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")

    # cron cadence must have cron_expr
    if body.cadence == "cron" and not body.cron_expr:
        raise HTTPException(422, "cron_expr is required when cadence='cron'")

    # Cap per user
    existing = await _db.agent_k_schedules.count_documents({"user_id": str(user["_id"])})
    if existing >= 25:
        raise HTTPException(429, "Schedule limit reached (25 per user)")

    now = _now_utc()
    raw = body.model_dump()
    raw.update({
        "user_id": str(user["_id"]),
        "user_email": user.get("email"),
        "status": "active",
        "last_run_at": None,
        "last_run_id": None,
        "last_status": None,
        "runs_count": 0,
        "created_at": now,
        "updated_at": now,
    })
    raw["next_run_at"] = _compute_next_run(raw, from_dt=now)
    res = await _db.agent_k_schedules.insert_one(raw)
    doc = await _db.agent_k_schedules.find_one({"_id": res.inserted_id})
    return {"ok": True, "schedule": _serialize(doc)}


@router.get("/agent-k/scheduled/{schedule_id}")
async def get_schedule(schedule_id: str, authorization: Optional[str] = Header(None)):
    user = await _ak_resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    try:
        oid = ObjectId(schedule_id)
    except Exception:
        raise HTTPException(400, "Bad schedule id")
    doc = await _db.agent_k_schedules.find_one({"_id": oid, "user_id": str(user["_id"])})
    if not doc:
        raise HTTPException(404, "Schedule not found")
    return _serialize(doc)


@router.patch("/agent-k/scheduled/{schedule_id}")
async def update_schedule(
    schedule_id: str, body: ScheduleUpdate, authorization: Optional[str] = Header(None),
):
    user = await _ak_resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    try:
        oid = ObjectId(schedule_id)
    except Exception:
        raise HTTPException(400, "Bad schedule id")
    doc = await _db.agent_k_schedules.find_one({"_id": oid, "user_id": str(user["_id"])})
    if not doc:
        raise HTTPException(404, "Schedule not found")

    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if "cron_expr" in patch and patch["cron_expr"]:
        if not croniter.is_valid(patch["cron_expr"]):
            raise HTTPException(422, f"Invalid cron expression '{patch['cron_expr']}'")
    if "timezone" in patch and patch["timezone"] not in pytz.all_timezones_set:
        raise HTTPException(422, f"Unknown timezone '{patch['timezone']}'")

    # Merge into doc for next_run_at recomputation
    merged = {**doc, **patch}
    patch["next_run_at"] = _compute_next_run(merged)
    patch["updated_at"] = _now_utc()

    await _db.agent_k_schedules.update_one({"_id": oid}, {"$set": patch})
    out = await _db.agent_k_schedules.find_one({"_id": oid})
    return {"ok": True, "schedule": _serialize(out)}


@router.delete("/agent-k/scheduled/{schedule_id}")
async def delete_schedule(schedule_id: str, authorization: Optional[str] = Header(None)):
    user = await _ak_resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    try:
        oid = ObjectId(schedule_id)
    except Exception:
        raise HTTPException(400, "Bad schedule id")
    res = await _db.agent_k_schedules.delete_one({"_id": oid, "user_id": str(user["_id"])})
    if not res.deleted_count:
        raise HTTPException(404, "Schedule not found")
    return {"ok": True}


@router.post("/agent-k/scheduled/{schedule_id}/run-now")
async def run_now(schedule_id: str, authorization: Optional[str] = Header(None)):
    user = await _ak_resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    try:
        oid = ObjectId(schedule_id)
    except Exception:
        raise HTTPException(400, "Bad schedule id")
    doc = await _db.agent_k_schedules.find_one({"_id": oid, "user_id": str(user["_id"])})
    if not doc:
        raise HTTPException(404, "Schedule not found")
    # Fire out-of-band (do not bump next_run_at past schedule)
    await _fire_schedule(doc)
    out = await _db.agent_k_schedules.find_one({"_id": oid})
    return {"ok": True, "schedule": _serialize(out)}


@router.get("/agent-k/scheduled/{schedule_id}/runs")
async def schedule_runs(
    schedule_id: str, limit: int = 20, authorization: Optional[str] = Header(None),
):
    user = await _ak_resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    cur = _db.agent_runs.find(
        {"schedule_id": schedule_id, "user_id": str(user["_id"])}
    ).sort("started_at", -1).limit(max(1, min(int(limit), 50)))
    out: List[Dict[str, Any]] = []
    async for r in cur:
        out.append({
            "id":           str(r["_id"]),
            "prompt":       r.get("prompt"),
            "status":       r.get("status"),
            "summary":      r.get("plan", {}).get("summary"),
            "steps_n":      len(r.get("steps", [])),
            "started_at":   (r.get("started_at").isoformat()
                             if isinstance(r.get("started_at"), datetime) else None),
            "completed_at": (r.get("completed_at").isoformat()
                             if isinstance(r.get("completed_at"), datetime) else None),
            "result_summary": r.get("result_summary"),
        })
    return {"runs": out, "count": len(out)}


@router.get("/agent-k/scheduled-meta/cadences")
async def list_cadence_presets():
    """Helper for the UI to render cadence picker without hardcoding labels."""
    return {
        "cadences": [
            {"value": "daily",  "label": "Daily at a specific time"},
            {"value": "weekly", "label": "Weekly on a chosen day"},
            {"value": "hourly", "label": "Every N hours"},
            {"value": "cron",   "label": "Advanced — crontab expression"},
        ],
        "weekdays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "default_timezone": "UTC",
        "common_timezones": [
            "UTC", "Asia/Kolkata", "America/New_York", "America/Los_Angeles",
            "Europe/London", "Europe/Berlin", "Asia/Singapore", "Asia/Dubai",
            "Australia/Sydney",
        ],
    }
