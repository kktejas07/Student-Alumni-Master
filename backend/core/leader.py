"""
core.leader — single-leader election for background schedulers.

Production runs several Uvicorn workers (Dockerfile UVICORN_WORKERS=2) and
each one used to start every scheduler in its lifespan, so cron ticks, the
ECHO payment sweep, newsletter sends and the agent loops all ran N times.

This module hands out a short-lived lease stored in MongoDB. Exactly one
process holds it at a time; it renews the lease while alive, and if the
process dies the lease expires and another worker takes over on its next
attempt. Set SCHEDULER_LEADER_LOCK=0 to bypass (single-process dev).
"""
from __future__ import annotations

import asyncio
import logging
import os
import socket
import uuid
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Optional

logger = logging.getLogger(__name__)

LEASE_NAME = os.environ.get("SCHEDULER_LEASE_NAME", "background_schedulers")
LEASE_TTL_SECONDS = int(os.environ.get("SCHEDULER_LEASE_TTL", "90"))
ACQUIRE_RETRY_SECONDS = int(os.environ.get("SCHEDULER_LEASE_RETRY", "30"))

OWNER_ID = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"


def lock_enabled() -> bool:
    return (os.environ.get("SCHEDULER_LEADER_LOCK") or "1").strip().lower() not in ("0", "false", "no", "off")


async def try_acquire(db, name: str = LEASE_NAME, ttl: int = LEASE_TTL_SECONDS) -> bool:
    """Atomically take or renew the lease. True if this process now holds it."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=ttl)
    try:
        # Take it if free/expired, or renew if we already own it.
        res = await db.scheduler_leases.find_one_and_update(
            {"_id": name, "$or": [{"owner": OWNER_ID}, {"expires_at": {"$lt": now}}, {"expires_at": {"$exists": False}}]},
            {"$set": {"owner": OWNER_ID, "expires_at": expires, "renewed_at": now}},
            upsert=False,
            return_document=True,
        )
        if res is not None:
            return res.get("owner") == OWNER_ID
        # No document yet: create it (another worker may race us; DuplicateKey means they won).
        try:
            await db.scheduler_leases.insert_one(
                {"_id": name, "owner": OWNER_ID, "expires_at": expires, "renewed_at": now, "acquired_at": now}
            )
            return True
        except Exception:
            return False
    except Exception as e:  # DB down: be conservative, do not claim leadership
        logger.warning("[leader] lease check failed: %s", e)
        return False


async def release(db, name: str = LEASE_NAME) -> None:
    try:
        await db.scheduler_leases.delete_one({"_id": name, "owner": OWNER_ID})
    except Exception:
        pass


async def run_as_leader(db, start_jobs: Callable[[], Awaitable[None]], name: str = LEASE_NAME) -> None:
    """Background supervisor: wait until this process wins the lease, then run
    `start_jobs()` exactly once and keep renewing the lease. Never raises."""
    if not lock_enabled():
        logger.info("[leader] SCHEDULER_LEADER_LOCK=0 — starting background jobs without election")
        await start_jobs()
        return

    started = False
    while True:
        try:
            if await try_acquire(db, name):
                if not started:
                    logger.info("[leader] %s won scheduler lease '%s'; starting background jobs", OWNER_ID, name)
                    await start_jobs()
                    started = True
                await asyncio.sleep(max(5, LEASE_TTL_SECONDS // 3))
            else:
                if started:
                    # Lost the lease after a DB hiccup. Keep running (stopping
                    # APScheduler mid-job is riskier than one overlapping tick)
                    # and try to win it back on the next pass.
                    logger.warning("[leader] %s lost lease '%s'; retrying", OWNER_ID, name)
                await asyncio.sleep(ACQUIRE_RETRY_SECONDS)
        except asyncio.CancelledError:
            await release(db, name)
            raise
        except Exception as e:
            logger.warning("[leader] supervisor error: %s", e)
            await asyncio.sleep(ACQUIRE_RETRY_SECONDS)
