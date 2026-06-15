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

    try:
        await sync_courses_to_db()
        logger.info("Sync completed: Courses.")
    except Exception as e:
        logger.error(f"Error fetching courses: {e}")
        
    try:
        await sync_internships_to_db()
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
