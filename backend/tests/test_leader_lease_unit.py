"""Unit tests for core.leader — single-leader lease for background schedulers."""
from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import core.leader as leader  # noqa: E402


class _FakeLeases:
    """Minimal stand-in for a Motor collection holding a single lease doc."""

    def __init__(self):
        self.doc = None

    async def find_one_and_update(self, flt, upd, upsert=False, return_document=True):
        if self.doc is None:
            return None
        matched = False
        for cond in flt["$or"]:
            if "owner" in cond and self.doc.get("owner") == cond["owner"]:
                matched = True
            if "expires_at" in cond and isinstance(cond["expires_at"], dict) and "$lt" in cond["expires_at"]:
                if self.doc["expires_at"] < cond["expires_at"]["$lt"]:
                    matched = True
        if not matched:
            return dict(self.doc)  # unchanged, still owned by someone else
        self.doc.update(upd["$set"])
        return dict(self.doc)

    async def insert_one(self, d):
        if self.doc is not None:
            raise Exception("E11000 duplicate key")
        self.doc = dict(d)

    async def delete_one(self, flt):
        if self.doc and self.doc.get("owner") == flt.get("owner"):
            self.doc = None


class _DB:
    def __init__(self):
        self.scheduler_leases = _FakeLeases()


@pytest.mark.asyncio
async def test_only_one_worker_holds_the_lease(monkeypatch):
    db = _DB()
    monkeypatch.setattr(leader, "OWNER_ID", "worker-a")
    assert await leader.try_acquire(db) is True
    # renewing as the same owner keeps it
    assert await leader.try_acquire(db) is True

    monkeypatch.setattr(leader, "OWNER_ID", "worker-b")
    assert await leader.try_acquire(db) is False
    assert db.scheduler_leases.doc["owner"] == "worker-a"


@pytest.mark.asyncio
async def test_lease_is_taken_over_after_expiry(monkeypatch):
    db = _DB()
    monkeypatch.setattr(leader, "OWNER_ID", "worker-a")
    assert await leader.try_acquire(db) is True
    db.scheduler_leases.doc["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)

    monkeypatch.setattr(leader, "OWNER_ID", "worker-b")
    assert await leader.try_acquire(db) is True
    assert db.scheduler_leases.doc["owner"] == "worker-b"


@pytest.mark.asyncio
async def test_run_as_leader_starts_jobs_once(monkeypatch):
    db = _DB()
    monkeypatch.setattr(leader, "OWNER_ID", "worker-a")
    monkeypatch.setattr(leader, "LEASE_TTL_SECONDS", 3)  # renew every ~1s
    monkeypatch.setenv("SCHEDULER_LEADER_LOCK", "1")
    starts = []

    async def start_jobs():
        starts.append(1)

    task = asyncio.create_task(leader.run_as_leader(db, start_jobs))
    await asyncio.sleep(2.5)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    assert starts == [1]
    # lease released on cancellation
    assert db.scheduler_leases.doc is None


@pytest.mark.asyncio
async def test_lock_can_be_disabled(monkeypatch):
    monkeypatch.setenv("SCHEDULER_LEADER_LOCK", "0")
    started = []

    async def start_jobs():
        started.append(True)

    await leader.run_as_leader(_DB(), start_jobs)
    assert started == [True]
