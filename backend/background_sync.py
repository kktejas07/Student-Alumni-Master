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
_db_client = None
_db_handle = None

def _get_db():
    global _db_client, _db_handle
    if _db_client is None:
        from db import client as _db_client
        _db_handle = _db_client[os.environ["DB_NAME"]]
    return _db_handle


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
    db = _get_db()
    
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

    try:
        from services.event_agent import run_global_event_agent
        synced_count = await run_global_event_agent(db)
        logger.info(f"Sync completed: AI Global Event Agent ({synced_count} events).")
    except Exception as e:
        logger.error(f"Error in AI Event Agent background sync: {e}")

    # Pass the db instance from server module
    try:
        await sync_courses_to_db(db)
        logger.info("Sync completed: Courses.")
    except Exception as e:
        logger.error(f"Error fetching courses: {e}")

    try:
        await sync_internships_to_db(db)
        logger.info("Sync completed: Adzuna Internships.")
    except Exception as e:
        logger.error(f"Error fetching adzuna internships: {e}")

    try:
        await _sync_talent_pool_profiles()
        logger.info("Sync completed: Talent Pool LinkedIn enrichment.")
    except Exception as e:
        logger.error(f"Error syncing talent pool: {e}")

    try:
        from services.platform_rag import index_all_platform_data
        rag_count = await index_all_platform_data(db)
        logger.info(f"Sync completed: Platform RAG Vector Indexing ({rag_count} entities).")
    except Exception as e:
        logger.error(f"Error in Platform RAG background sync: {e}")

    logger.info("Completed unified background sync task.")


async def _sync_talent_pool_profiles():
    """Periodically enrich talent pool profiles via LinkedIn/Proxycurl."""
    try:
        from linkedin_sync import enrich_profiles_batch, _get_proxycurl_key, _get_linkedin_api_creds

        proxycurl_key = await _get_proxycurl_key()
        linkedin_creds = await _get_linkedin_api_creds()

        if not proxycurl_key and not linkedin_creds.get("client_id"):
            logger.info("Talent pool sync skipped — no LinkedIn credentials configured")
            return

        from talent_pool import _db as tp_db
        from datetime import datetime, timezone, timedelta

        stale_threshold = datetime.now(timezone.utc) - timedelta(hours=24)
        cursor = tp_db.talent_pool.find({
            "linkedin_url": {"$exists": True, "$ne": None, "$ne": ""},
            "is_active": True,
            "$or": [
                {"last_synced_at": {"$exists": False}},
                {"last_synced_at": None},
                {"last_synced_at": {"$lt": stale_threshold}},
            ],
        }).limit(30)

        profiles = [doc async for doc in cursor]
        if not profiles:
            return

        enriched = await enrich_profiles_batch(profiles)
        now = datetime.now(timezone.utc)
        synced = 0

        for profile, data in enriched:
            if not data:
                continue
            update = {}
            for field in ["headline", "skills", "current_company", "current_role",
                          "location", "photo_url", "education", "bio"]:
                if data.get(field):
                    update[field] = data[field]
            if update:
                update["last_synced_at"] = now
                update["updated_at"] = now
                await tp_db.talent_pool.update_one({"_id": profile["_id"]}, {"$set": update})
                synced += 1

        logger.info(f"Talent pool sync: enriched {synced}/{len(profiles)} profiles")
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"Talent pool sync error (non-fatal): {e}")


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
        from services.event_agent import run_global_event_agent
        _sync_scheduler.add_job(
            run_global_event_agent,
            IntervalTrigger(minutes=30),
            id="thirty_min_ai_event_agent_sync",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc) + timedelta(seconds=10),
        )
        _sync_scheduler.start()
        logger.info("Unified sync scheduler started (interval=10m/30m AI Event Agent)")
    except Exception as e:
        logger.error(f"Failed to start sync scheduler: {e}")


def stop_sync_scheduler():
    global _sync_scheduler, _db_client, _db_handle
    if _sync_scheduler is not None:
        try:
            _sync_scheduler.shutdown(wait=False)
        except Exception:
            pass
        _sync_scheduler = None
    if _db_client is not None:
        try:
            _db_client.close()
        except Exception:
            pass
        _db_client = None
        _db_handle = None
