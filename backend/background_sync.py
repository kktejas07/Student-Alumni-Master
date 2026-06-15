import logging
import os
import asyncio
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import pytz

from jobs_feed import fetch_and_cache_all
from events_aggregator import _aggregate_and_store
from integrations import sync_courses_to_db, sync_internships_to_db

logger = logging.getLogger("background_sync")

_sync_scheduler = None


# ────────────────────────────────────────────────────────────────────────────
# Startup Dependency Check
# ────────────────────────────────────────────────────────────────────────────
REQUIRED_PACKAGES = [
    ("cachetools",  "cachetools"),
    ("aiohttp",     "aiohttp"),
    ("apscheduler", "apscheduler"),
    ("bcrypt",      "bcrypt"),
    ("bson",        "bson"),          # ships with pymongo
    ("dotenv",      "python-dotenv"), # pip name differs
    ("fastapi",     "fastapi"),
    ("httpx",       "httpx"),
    ("jwt",         "PyJWT"),         # pip name differs
    ("litellm",     "litellm"),
    ("motor",       "motor"),
    ("pyotp",       "pyotp"),
    ("pytz",        "pytz"),
    ("qrcode",      "qrcode"),
    ("slowapi",     "slowapi"),
    ("starlette",   "starlette"),
    ("pydantic",    "pydantic"),
    ("cryptography","cryptography"),
    ("stripe",      "stripe"),
    ("httpx",       "httpx"),
]


def check_dependencies() -> None:
    """Log a [DEPENDENCY CHECK] summary on startup, warning on any missing package."""
    missing = []
    print("\n[DEPENDENCY CHECK] Verifying required packages...", flush=True)
    for import_name, pip_name in REQUIRED_PACKAGES:
        try:
            __import__(import_name)
            print(f"[DEPENDENCY CHECK] [OK] {pip_name}", flush=True)
        except ImportError:
            print(f"[DEPENDENCY CHECK] [MISSING] {pip_name}  ← MISSING (run: pip install {pip_name})", flush=True)
            missing.append(pip_name)
    if missing:
        logger.error(
            f"[DEPENDENCY CHECK] [WARNING] {len(missing)} missing package(s): {', '.join(missing)}. "
            "Run: pip install -r requirements.txt"
        )
    else:
        print("[DEPENDENCY CHECK] [SUCCESS] All required packages are installed.\n", flush=True)


# ────────────────────────────────────────────────────────────────────────────
# Background Sync
# ────────────────────────────────────────────────────────────────────────────
async def run_unified_sync_task():
    logger.info("Starting unified background sync task for Jobs, Events, and Courses...")
    try:
        await fetch_and_cache_all()
        logger.info("Sync completed: Jobs & Internships.")
    except Exception as e:
        logger.error(f"Error fetching jobs: {e}")

    try:
        await _aggregate_and_store()
        logger.info("Sync completed: Events & Workshops.")
    except Exception as e:
        logger.error(f"Error fetching events: {e}")

    # Pass the db instance from server module
    try:
        from server import db as _db
        await sync_courses_to_db(_db)
        logger.info("Sync completed: Courses.")
    except Exception as e:
        logger.error(f"Error fetching courses: {e}")

    try:
        from server import db as _db
        await sync_internships_to_db(_db)
        logger.info("Sync completed: Adzuna Internships.")
    except Exception as e:
        logger.error(f"Error fetching adzuna internships: {e}")

    logger.info("Completed unified background sync task.")


def start_sync_scheduler():
    enabled = (os.environ.get("SYNC_SCHEDULER_ENABLED") or "1").strip().lower()
    if enabled in {"0", "false", "off", "no"}:
        return
    global _sync_scheduler
    if _sync_scheduler is not None:
        return
    try:
        _sync_scheduler = AsyncIOScheduler(timezone=pytz.UTC)
        _sync_scheduler.add_job(
            run_unified_sync_task,
            IntervalTrigger(minutes=10),
            id="ten_min_content_sync",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc) + timedelta(minutes=1),
        )
        _sync_scheduler.start()
        logger.info("Unified sync scheduler started (interval=10m)")
    except Exception as e:
        logger.error(f"Failed to start sync scheduler: {e}")


def stop_sync_scheduler():
    global _sync_scheduler
    if _sync_scheduler is not None:
        try:
            _sync_scheduler.shutdown(wait=False)
        except Exception:
            pass
        _sync_scheduler = None
