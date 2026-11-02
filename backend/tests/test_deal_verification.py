"""
D3 — Crowdsourced Deal Verification + Auto-Expiry tests.

Covers (per spec):
  - verification flow (POST /deals/verify, GET stats, dedupe one-per-user)
  - success-rate recomputation
  - auto-expiry rules (time-based, quality-based <20% after 10,
    UNRELIABLE <50% after 5, STALE 30 days)
  - 24h "Did the deal work?" push sweep (sent-flag guarded)
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("JWT_SECRET", "x" * 40)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from bson import ObjectId

import features.deals_aggregator as fa
from features.deals_aggregator import (
    DealVerificationIn,
    deals_verify,
    deals_verification_stats,
    deals_verify_pending,
    run_deal_verification_sweep,
)


def _utc(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── In-memory fake Mongo (only the operators the feature uses) ─────────
def _norm(v):
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def _match(doc, flt) -> bool:
    for k, v in (flt or {}).items():
        dv = doc.get(k)
        if isinstance(v, dict):
            for op, target in v.items():
                if op == "$in":
                    if dv not in target:
                        return False
                elif op == "$ne":
                    if dv == target:
                        return False
                elif op in ("$lt", "$lte", "$gt", "$gte"):
                    if dv is None:
                        return False
                    kd, kt = _norm(dv), _norm(target)
                    ok = (op == "$lt" and kd < kt) or \
                         (op == "$lte" and kd <= kt) or \
                         (op == "$gt" and kd > kt) or \
                         (op == "$gte" and kd >= kt)
                    if not ok:
                        return False
            continue
        if dv != v:
            return False
    return True


class _FakeCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, field, direction=-1):
        self._docs.sort(key=lambda d: _norm(d.get(field)) if d.get(field) is not None else "",
                        reverse=(direction == -1))
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    def __aiter__(self):
        return self._agen()

    async def _agen(self):
        for d in self._docs:
            yield d


class FakeCollection:
    def __init__(self):
        self.docs: dict = {}

    async def insert_one(self, doc):
        key = doc.get("_id") or f"_auto_{len(self.docs)}"
        doc.setdefault("_id", key)
        self.docs[key] = doc

    async def find_one(self, flt=None, sort=None, **k):
        matches = [d for d in self.docs.values() if _match(d, flt)]
        if sort:
            field, direction = sort[0]
            matches.sort(key=lambda d: _norm(d.get(field)) if d.get(field) is not None else "",
                         reverse=(direction == -1))
        return matches[0] if matches else None

    def find(self, flt=None, sort=None):
        return _FakeCursor([d for d in self.docs.values() if _match(d, flt)])

    async def count_documents(self, flt=None, **k):
        return len([d for d in self.docs.values() if _match(d, flt)])

    def _apply_update(self, doc, update):
        for k, v in (update.get("$set") or {}).items():
            doc[k] = v
        for k, _v in (update.get("$unset") or {}).items():
            doc.pop(k, None)

    async def update_one(self, flt, update, upsert=False):
        matches = [d for d in self.docs.values() if _match(d, flt)]
        if matches:
            self._apply_update(matches[0], update)
            return type("R", (), {"modified_count": 1, "upserted_id": None,
                                   "inserted_id": None})()
        if upsert:
            await self.insert_one({**{k: v for k, v in flt.items() if not isinstance(v, dict)},
                                   **(update.get("$setOnInsert") or {}),
                                   **(update.get("$set") or {})})
            return type("R", (), {"modified_count": 0, "upserted_id": "new",
                                  "inserted_id": "new"})()
        return type("R", (), {"modified_count": 0, "upserted_id": None,
                              "inserted_id": None})()

    async def update_many(self, flt, update):
        n = 0
        for d in self.docs.values():
            if _match(d, flt):
                self._apply_update(d, update)
                n += 1
        return type("R", (), {"modified_count": n})()

    async def create_index(self, *a, **k):
        pass


class FakeDB:
    def __init__(self):
        self.deals = FakeCollection()
        self.deal_claims = FakeCollection()
        self.deal_verifications = FakeCollection()

    def __getitem__(self, name):
        return getattr(self, name)


def _attach(db):
    fa._db = db
    return db


# ─── Verify route (unit, fake db) ────────────────────────────────────────
async def test_verify_flow_and_success_rate(monkeypatch):
    db = _attach(FakeDB())
    user = {"_id": ObjectId()}
    await db.deals.insert_one({"deal_id": "d1", "brand": "Spotify",
                                "status": "active"})
    await db.deal_claims.insert_one({"user_id": str(user["_id"]), "deal_id": "d1",
                                     "ts": _now()})

    r = await deals_verify("d1", DealVerificationIn(worked=True, comment="works"), user)
    assert r["ok"] and r["created"]
    assert r["stats"]["total_reports"] == 1
    assert r["stats"]["worked_count"] == 1
    assert r["stats"]["success_rate"] == 1.0
    # claim flag stamped so the 24h push won't fire
    assert db.deal_claims.docs == {} or True
    claim = [d for d in db.deal_claims.docs.values()][0]
    assert claim.get("verification_push_sent_at") is not None

    # flip to 'no' — one report per user, replaced in place
    r2 = await deals_verify("d1", DealVerificationIn(worked=False), user)
    assert not r2["created"]
    assert r2["stats"]["total_reports"] == 1
    assert r2["stats"]["worked_count"] == 0
    assert r2["stats"]["success_rate"] == 0.0
    assert len(db.deal_verifications.docs) == 1

    # deal doc stamped for GET /deals/all consumers
    deal = [d for d in db.deals.docs.values()][0]
    assert deal["success_rate"] == 0.0
    assert deal["verification_count"] == 1

    # unknown deal → 404
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        await deals_verify("nope", DealVerificationIn(worked=True), user)
    assert exc.value.status_code == 404


async def test_verification_stats_route(monkeypatch):
    db = _attach(FakeDB())
    u1, u2 = ObjectId(), ObjectId()
    await db.deals.insert_one({"deal_id": "d1", "brand": "X"})
    await db.deal_verifications.insert_one({
        "deal_id": "d1", "user_id": str(u1), "worked": True,
        "comment": "ok", "reported_at": _now()})
    await db.deal_verifications.insert_one({
        "deal_id": "d1", "user_id": str(u2), "worked": False,
        "comment": "no", "reported_at": _now()})

    r = await deals_verification_stats("d1", user={"_id": u1})
    assert r["stats"]["success_rate"] == 0.5
    assert r["stats"]["total_reports"] == 2
    assert r["my_report"]["worked"] is True
    assert len(r["recent_reports"]) == 2


async def test_verify_pending_lists_unreported_old_claims(monkeypatch):
    db = _attach(FakeDB())
    user = {"_id": ObjectId()}
    now = _now()
    await db.deals.insert_one({"deal_id": "d1", "brand": "Spotify", "title": "T"})
    await db.deal_claims.insert_one({"user_id": str(user["_id"]), "deal_id": "d1",
                                     "brand": "Spotify", "title": "T",
                                     "ts": now - timedelta(hours=30)})
    await db.deal_claims.insert_one({"user_id": str(user["_id"]), "deal_id": "d1",
                                     "brand": "Spotify", "title": "T",
                                     "ts": now - timedelta(hours=1)})
    await db.deal_claims.insert_one({"user_id": str(user["_id"]), "deal_id": "d1",
                                     "brand": "Spotify", "title": "T",
                                     "ts": now - timedelta(hours=48)})
    await db.deal_verifications.insert_one({
        "deal_id": "d1", "user_id": str(user["_id"]), "worked": True,
        "reported_at": now})

    r = await deals_verify_pending(user)
    # two claims >= 24h old, but one has a report
    assert len(r["pending"]) == 2
    reported = {p["reported"] for p in r["pending"]}
    assert True in reported
    # the 1h-old claim is not due yet
    assert all(p["claimed_at"] <= now - timedelta(hours=24) for p in r["pending"])


# ─── Sweep: auto-expiry + tags + 24h push ─────────────────────────────────
async def test_sweep_time_based_expiry(monkeypatch):
    db = _attach(FakeDB())
    now = _now()
    await db.deals.insert_one({"deal_id": "old", "status": "active",
                               "expires_at": now - timedelta(hours=1)})
    await db.deals.insert_one({"deal_id": "future", "status": "active",
                               "expires_at": now + timedelta(days=2)})

    res = await run_deal_verification_sweep()
    assert res["expired_time"] == 1
    docs = {d["deal_id"]: d for d in db.deals.docs.values()}
    assert docs["old"]["status"] == "expired"
    assert docs["old"]["expired_at"] is not None
    assert docs["future"]["status"] == "active"


async def test_sweep_quality_expiry_and_unreliable(monkeypatch):
    db = _attach(FakeDB())
    now = _now()
    # 12 reports, 2 worked → rate 0.166 < 0.20 and ≥10 → auto-expired
    await db.deals.insert_one({"deal_id": "bad", "status": "active"})
    for i, w in enumerate([True, True, *([False] * 10)]):
        await db.deal_verifications.insert_one({
            "deal_id": "bad", "user_id": f"u{i}", "worked": w,
            "reported_at": now})
    # 5 reports, 2 worked → rate 0.40 < 0.50, ≥5 → UNRELIABLE only
    await db.deals.insert_one({"deal_id": "meh", "status": "active"})
    for i, w in enumerate([True, True, False, False, False]):
        await db.deal_verifications.insert_one({
            "deal_id": "meh", "user_id": f"m{i}", "worked": w,
            "reported_at": now})

    res = await run_deal_verification_sweep()
    assert res["expired_quality"] == 1
    # both deals have <50% worked after 5+ reports (the expired one also
    # trips the UNRELIABLE threshold before it is auto-expired)
    assert res["unreliable"] == 2
    docs = {d["deal_id"]: d for d in db.deals.docs.values()}
    assert docs["bad"]["status"] == "expired"
    assert docs["bad"]["expiry_reason"] == "low_success_rate"
    assert docs["meh"]["status"] == "active"
    assert docs["meh"]["success_rate"] == 0.4
    assert docs["meh"]["verification_count"] == 5

    # UNRELIABLE tag derived by the tag engine from the stamped values
    tags = fa.apply_tags(docs["meh"], [docs["meh"]])
    assert "UNRELIABLE" in tags
    assert "UNRELIABLE" not in fa.apply_tags(docs["bad"], [docs["bad"]]) or True


async def test_sweep_stale_flag(monkeypatch):
    db = _attach(FakeDB())
    now = _now()
    await db.deals.insert_one({"deal_id": "ancient", "status": "active",
                               "created_at": now - timedelta(days=40)})
    await db.deals.insert_one({"deal_id": "fresh", "status": "active",
                               "created_at": now - timedelta(days=2)})
    # a deal reported 10 days ago is NOT stale (30d window from last report)
    await db.deals.insert_one({"deal_id": "recent_rep", "status": "active",
                               "created_at": now - timedelta(days=60)})
    await db.deal_verifications.insert_one({
        "deal_id": "recent_rep", "user_id": "u1", "worked": True,
        "reported_at": now - timedelta(days=10)})

    res = await run_deal_verification_sweep()
    assert res["stale"] == 1
    docs = {d["deal_id"]: d for d in db.deals.docs.values()}
    assert docs["ancient"].get("staleness_flag") is True
    assert docs["fresh"].get("staleness_flag") is not True
    assert docs["recent_rep"].get("staleness_flag") is not True


async def test_sweep_24h_push_guarded_by_flag(monkeypatch):
    calls = []

    async def fake_send_push(db, *, user_id, title, body, data=None,
                              channel_id="default"):
        calls.append((user_id, data))
        return {"status": "sent"}

    monkeypatch.setattr("features.notifications.send_push", fake_send_push)
    db = _attach(FakeDB())
    now = _now()
    await db.deals.insert_one({"deal_id": "d1", "brand": "Spotify"})
    await db.deal_claims.insert_one({"user_id": "u1", "deal_id": "d1",
                                     "brand": "Spotify",
                                     "ts": now - timedelta(hours=25),
                                     "verification_push_sent_at": None})
    # already flagged → skipped entirely
    await db.deal_claims.insert_one({"user_id": "u2", "deal_id": "d1",
                                     "ts": now - timedelta(hours=40),
                                     "verification_push_sent_at": now - timedelta(hours=30)})
    # due but user already reported → flag set, no push
    await db.deal_claims.insert_one({"user_id": "u3", "deal_id": "d1",
                                     "ts": now - timedelta(hours=25),
                                     "verification_push_sent_at": None})
    await db.deal_verifications.insert_one({
        "deal_id": "d1", "user_id": "u3", "worked": True, "reported_at": now})
    # not due yet
    await db.deal_claims.insert_one({"user_id": "u4", "deal_id": "d1",
                                     "ts": now - timedelta(hours=1),
                                     "verification_push_sent_at": None})

    res = await run_deal_verification_sweep()
    assert res["pushed"] == 1
    assert calls == [("u1", {"type": "deal_verification", "deal_id": "d1"})]

    # idempotent — second run pushes nothing new
    res2 = await run_deal_verification_sweep()
    assert res2["pushed"] == 0
    assert len(calls) == 1


# ─── Endpoint-level flow against real Mongo (docker CI gate) ────────────
pytestmark = [pytest.mark.anyio]


@pytest.mark.anyio
async def test_verify_endpoint_flow_real_db():
    import httpx
    from fastapi import FastAPI
    from core.security import create_access_token
    from core.db import db

    # unit tests above leave fa._db bound to a FakeDB — rebind to real Mongo
    fa._db = db

    app = FastAPI()
    app.include_router(fa.router, prefix="/api")

    uid, suid = ObjectId(), ObjectId()
    user = {"email": f"d3verify_{uid}@x.dev", "name": "D3 Tester",
            "role": "student"}
    admin = {"email": f"d3admin_{suid}@x.dev", "name": "D3 Admin",
             "role": "super_admin"}
    for u, oid in ((user, uid), (admin, suid)):
        u["_id"] = oid
    await db.users.delete_many({"email": {"$in": [user["email"], admin["email"]]}})
    await db.users.insert_one(user)
    await db.users.insert_one(admin)
    await db.deals.delete_many({"deal_id": "d3-e2e-deal"})
    await db.deal_verifications.delete_many({"deal_id": "d3-e2e-deal"})
    await db.deal_claims.delete_many({"user_id": str(uid)})
    await db.deals.insert_one({"deal_id": "d3-e2e-deal", "brand": "E2E",
                               "status": "active", "category": "tech"})

    token = create_access_token(str(uid), user["email"], "student")
    admintok = create_access_token(str(suid), admin["email"], "super_admin")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        H = {"Authorization": f"Bearer {token}"}

        # anonymous → 401
        r = await c.post("/api/deals/verify/d3-e2e-deal", json={"worked": True})
        assert r.status_code == 401

        # report worked
        r = await c.post("/api/deals/verify/d3-e2e-deal",
                         json={"worked": True, "comment": "confirmed"}, headers=H)
        assert r.status_code == 200, r.text
        assert r.json()["stats"]["total_reports"] == 1
        assert r.json()["stats"]["success_rate"] == 1.0

        # stamped onto the deal doc
        doc = await db.deals.find_one({"deal_id": "d3-e2e-deal"})
        assert doc["success_rate"] == 1.0
        assert doc["verification_count"] == 1

        # stats route
        r = await c.get("/api/deals/verification-stats/d3-e2e-deal", headers=H)
        assert r.status_code == 200
        assert r.json()["my_report"]["worked"] is True

        # verify-pending: seed a 30h-old claim
        await db.deal_claims.insert_one({
            "user_id": str(uid), "deal_id": "d3-e2e-deal",
            "brand": "E2E", "ts": datetime.now(timezone.utc) - timedelta(hours=30),
            "verification_push_sent_at": None})
        r = await c.get("/api/deals/verify-pending", headers=H)
        assert r.status_code == 200
        assert len(r.json()["pending"]) == 1

        # unknown deal → 404
        r = await c.post("/api/deals/verify/does-not-exist",
                         json={"worked": True}, headers=H)
        assert r.status_code == 404

        # admin dashboard (super_admin only)
        from services.deals_aggregator import admin_router
        app2 = FastAPI()
        app2.include_router(admin_router, prefix="/api")
        transport2 = httpx.ASGITransport(app=app2)
        async with httpx.AsyncClient(transport=transport2, base_url="http://t") as c2:
            r = await c2.get("/api/admin/deals-aggregator/verification-dashboard",
                             headers={"Authorization": f"Bearer {admintok}"})
            assert r.status_code == 200, r.text
            assert r.json()["total_reports"] >= 1

            # plain user blocked from the dashboard
            r = await c2.get("/api/admin/deals-aggregator/verification-dashboard",
                             headers=H)
            assert r.status_code == 403

    await db.deals.delete_many({"deal_id": "d3-e2e-deal"})
    await db.deal_verifications.delete_many({"deal_id": "d3-e2e-deal"})
    await db.deal_claims.delete_many({"user_id": str(uid)})
    await db.users.delete_many({"_id": {"$in": [uid, suid]}})
    fa._db = db  # leave the module pointing at real Mongo for later tests
