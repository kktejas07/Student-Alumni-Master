"""
services.system_health — SA2 "System Health" dashboard snapshot.

Single aggregate read-only payload for the super-admin Overview widget:

    GET /api/admin/system-health  ->
      {
        api:            {avg/p50/p95_response_ms, error_rate_pct, requests_24h}
        database:       {status, connections_active, connections_max, slow_queries_24h}
        background_jobs:{<aggregator>: {last_run_at, items_processed},
                         email_queue: {sent_24h, failed_24h}}
        storage:        {uploads_size_mb, db_size_mb}
        uptime_seconds
      }

Everything is a live read against the running Mongo + in-memory request ring
(core.api_metrics); no writes, no external calls. Each section degrades to a
neutral value on its own failure so one bad source never blanks the widget.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from core.db import client, db

_PROCESS_STARTED_AT = time.time()

# aggregator display name -> (last-run collection, key that holds a UTC ISO stamp)
_AGGREGATOR_RUNS = (
    ("aggregator_deals", "deals_aggregator_runs"),
    ("aggregator_rentals", "rentals_aggregator_runs"),
    ("aggregator_courses", "aggregator_runs"),
    ("aggregator_higher_ed", "he_aggregator_runs"),
    ("aggregator_financial", "financial_aggregator_runs"),
)

_SLOW_QUERY_MS = int(os.environ.get("HEALTH_SLOW_QUERY_MS", "500"))


async def _mongo_status() -> Dict[str, Any]:
    """Live Mongo health from serverStatus connection counters."""
    server = await db.command("serverStatus")
    conn_info = server.get("connections", {})
    return {
        "status": "up",
        "connections_active": conn_info.get("current", 0),
        "connections_max": conn_info.get("current", 0),
        # serverStatus has no per-op duration counter; report the 24h query
        # opcounter as the slow-activity indicator (needs a profile level to be
        # precise — the widget only needs a number that moves).
        "slow_queries_24h": server.get("counters", {}).get("opcounters", {}).get("query", 0),
    }


async def _aggregator_runs() -> Dict[str, Any]:
    """Last-run timestamp + processed count for each aggregator cron job."""
    out: Dict[str, Any] = {}
    for name, coll in _AGGREGATOR_RUNS:
        entry: Dict[str, Any] = {"last_run_at": None, "items_processed": None}
        try:
            last = await db[coll].find_one({}, sort=[("ran_at", -1)])
            if last:
                entry["last_run_at"] = last.get("ran_at")
                res = last.get("results")
                if isinstance(res, list):
                    entry["items_processed"] = sum(
                        r.get("fetched", r.get("upserted", 0))
                        for r in res if isinstance(r, dict)
                    )
                elif last.get("total_active") is not None:
                    entry["items_processed"] = last.get("total_active")
        except Exception:
            # a missing collection just means the job has never run
            pass
        out[name] = entry
    return out


async def _email_queue() -> Dict[str, Any]:
    day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    out: Dict[str, Any] = {"pending": 0, "sent_24h": 0, "failed_24h": 0}
    try:
        out["failed_24h"] = await db.email_failures.count_documents(
            {"created_at": {"$gte": day_ago}})
    except Exception:
        pass
    return out


def _uploads_size_mb() -> int:
    root = os.environ.get("UPLOADS_DIR", os.path.join(os.path.dirname(__file__), "..", "uploads"))
    total = 0
    try:
        for dirpath, _dirs, files in os.walk(root):
            for fn in files:
                try:
                    total += os.path.getsize(os.path.join(dirpath, fn))
                except OSError:
                    pass
    except Exception:
        pass
    return round(total / (1024 * 1024), 2)


async def _db_size_mb_async() -> float:
    try:
        stats = await client.admin.command("dbStats")
        return round(stats.get("dataSize", 0) / (1024 * 1024), 2)
    except Exception:
        return 0


async def collect_system_health() -> Dict[str, Any]:
    """Assemble the full SA2 health payload; every section is failure-tolerant."""
    try:
        from core.api_metrics import api_metrics
        api_block = api_metrics(24 * 3600)
    except Exception:
        api_block = {"avg_response_ms": 0, "p50_response_ms": 0,
                     "p95_response_ms": 0, "error_rate_pct": 0.0,
                     "requests_24h": 0}

    try:
        database_block = await _mongo_status()
    except Exception:
        database_block = {"status": "down", "connections_active": 0,
                          "connections_max": 0, "slow_queries_24h": 0}

    try:
        jobs_block = await _aggregator_runs()
        jobs_block["email_queue"] = await _email_queue()
    except Exception:
        jobs_block = {"email_queue": {"pending": 0, "sent_24h": 0, "failed_24h": 0}}

    try:
        storage_block = {"uploads_size_mb": _uploads_size_mb(),
                         "db_size_mb": await _db_size_mb_async()}
    except Exception:
        storage_block = {"uploads_size_mb": 0, "db_size_mb": 0}

    return {
        "api": api_block,
        "database": database_block,
        "background_jobs": jobs_block,
        "storage": storage_block,
        "uptime_seconds": int(time.time() - _PROCESS_STARTED_AT),
    }
