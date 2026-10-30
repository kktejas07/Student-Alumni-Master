"""
F1 — Financial Products Aggregator Bot tests.

Covers:
  - dedup helpers (spec key + md5 mirror of financial_services._dh)
  - the 20 registered adapters (all static catalogs; tier/category map)
  - document shaping + verified-tier seeding + scraped overlay
    (richest-wins backfill, gap-fill that never clobbers live values)
  - fetch_source plumbing (unknown / disabled / error isolation,
    injected-client preserving)
  - the full pipeline over an in-memory fake Mongo
  - run_aggregation cron tier defaults (tier 3 excluded)
  - the 05:00 IST scheduler env gates
  - the super_admin admin router (/admin/financial-aggregator) and
    the POST /financial/aggregate manual trigger
"""
from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

# core.db requires MONGO_URL + JWT_SECRET at import; set safe dev defaults
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("JWT_SECRET", "x" * 40)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

import financial_aggregator as fa

EXPECTED_SOURCES = {
    "nsp", "buddy4study", "indiascholarships", "ts_epass", "ap_jnanabhumi",
    "gradright", "wemakescholars", "bankbazaar", "vidyalaxmi",
    "startup_grants_india", "startup_india_portal", "birac", "aim", "meity",
    "policybazaar", "coverfox", "irdai", "openvc_india", "vcdir", "inc42",
}
STATIC_ROW_COUNTS = {
    "nsp": 2, "buddy4study": 2, "indiascholarships": 2, "ts_epass": 1,
    "ap_jnanabhumi": 1, "gradright": 1, "wemakescholars": 1, "bankbazaar": 1,
    "vidyalaxmi": 1, "startup_grants_india": 2, "startup_india_portal": 1,
    "birac": 1, "aim": 1, "meity": 1, "policybazaar": 1, "coverfox": 2,
    "irdai": 1, "openvc_india": 2, "vcdir": 1, "inc42": 1,
}


def _mock_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


# ─── Helpers: slugs + dedup identity ─────────────────────────────────────
def test_slugify_and_dedup_key():
    assert fa.slugify("IIT Delhi") == "iit-delhi"
    assert fa.slugify("") == "x"
    assert fa.dedup_key("PM YASASVI", "NSP", "scholarship") == \
        "pm-yasasvi|nsp|scholarship"


def test_dedup_hash_mirrors_financial_services():
    # md5 of "name|provider|category" lowercased — byte-identical to the
    # _dh used by features/financial_services.py for seeded rows.
    raw = "pm yasasvi|national scholarship portal|scholarship"
    assert fa.dedup_hash(
        "PM YASASVI", "National Scholarship Portal", "scholarship"
    ) == hashlib.md5(raw.encode("utf-8")).hexdigest()
    assert fa.dedup_hash("", None, "loan") == fa.dedup_hash(None, "", "loan")


def test_overlay_field_set():
    assert "interest_rate" in fa.OVERLAY_FIELDS
    assert "application_deadline" in fa.OVERLAY_FIELDS
    assert "status" in fa.OVERLAY_FIELDS
    assert "short_desc" in fa._DETAIL_FIELDS


# ─── Adapter registry ────────────────────────────────────────────────────
def test_twenty_adapters_registered():
    assert len(fa.ALL_ADAPTERS) == 20
    assert set(fa.ADAPTERS_BY_NAME) == EXPECTED_SOURCES


def test_adapter_tiers_and_categories():
    tiers = {a.source_name: a.tier for a in fa.ALL_ADAPTERS}
    assert {n for n, t in tiers.items() if t == 3} == {"coverfox"}
    assert fa.ADAPTERS_BY_NAME["coverfox"].tier == 3
    cats = {a.source_name: a.category for a in fa.ALL_ADAPTERS}
    assert cats["nsp"] == "scholarship"
    assert cats["bankbazaar"] == "loan"
    assert cats["birac"] == "startup_funding"
    assert cats["irdai"] == "insurance"
    assert cats["inc42"] == "venture_capital"
    assert all(a.is_static for a in fa.ALL_ADAPTERS)


async def test_static_adapter_row_counts():
    for name, n in STATIC_ROW_COUNTS.items():
        rows = await fa.ADAPTERS_BY_NAME[name].fetch_rows()
        assert len(rows) == n, name
        assert all(r.get("source_id") for r in rows), name


# ─── fetch_source plumbing ───────────────────────────────────────────────
async def test_fetch_source_unknown():
    agg, _db = _agg()
    assert await agg.fetch_source("nope") == ([], "unknown_source")


async def test_fetch_source_disabled_via_meta():
    agg, _db = _agg()
    await agg.meta.update_one(
        {"source": "nsp"}, {"$set": {"enabled": False}}, upsert=True)
    assert await agg.fetch_source("nsp") == ([], "disabled")


async def test_fetch_source_error_isolated(monkeypatch):
    agg, _db = _agg()

    async def _boom() -> list:
        raise RuntimeError("upstream down")

    adp = fa.ADAPTERS_BY_NAME["nsp"]
    monkeypatch.setattr(adp, "fetch_rows", _boom)
    rows, status = await agg.fetch_source("nsp")
    assert (rows, status) == ([], "error")


async def test_injected_client_is_preserved():
    agg, _db = _agg()
    adp = fa.ADAPTERS_BY_NAME["nsp"]
    client = _mock_client(lambda _r: httpx.Response(200, json={}))
    adp.http = client
    try:
        rows, status = await agg.fetch_source("nsp")
    finally:
        adp.http = None
    assert status == "ok" and len(rows) == 2
    assert adp.http is None          # injected client reset, not closed
    assert not client.is_closed


# ─── In-memory fake Mongo ────────────────────────────────────────────────
def _match(doc, flt):
    for k, v in (flt or {}).items():
        if isinstance(v, dict):
            if "$in" in v and doc.get(k) not in v["$in"]:
                return False
            if "$ne" in v and doc.get(k) == v["$ne"]:
                return False
            continue
        if doc.get(k) != v:
            return False
    return True


class _Result:
    def __init__(self, upserted_id=None, inserted_id=None):
        self.upserted_id = upserted_id
        self.inserted_id = inserted_id


def _apply_update(doc, update):
    doc.update(update.get("$set", {}))
    add = update.get("$addToSet")
    if add:
        for k, v in add.items():
            lst = doc.get(k)
            if isinstance(lst, list):
                if v not in lst:
                    lst.append(v)
            else:
                doc[k] = [v]


class _FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    async def to_list(self, length=None):
        return self._docs[:length] if length else list(self._docs)


class FakeCollection:
    def __init__(self):
        self.docs = {}

    def _key(self, doc):
        if doc.get("_id") is not None:
            return doc["_id"]
        if doc.get("source_id") is not None:
            return f"{doc.get('source')}:{doc.get('source_id')}"
        return f"src:{doc.get('source')}"

    async def find_one(self, flt=None, sort=None, **k):
        matches = [d for d in self.docs.values() if _match(d, flt)]
        if sort:
            def sk(d):
                return tuple("" if d.get(f) is None else str(d.get(f))
                             for f, _dir in sort)
            matches.sort(key=sk, reverse=(sort[0][1] == -1))
        return matches[0] if matches else None

    async def insert_one(self, doc):
        key = doc.get("_id") or self._key(doc)
        doc.setdefault("_id", key)
        self.docs[key] = doc
        return _Result(inserted_id=doc["_id"])

    async def count_documents(self, flt=None, **k):
        return len([d for d in self.docs.values() if _match(d, flt)])

    async def create_index(self, *a, **k):
        pass

    async def update_one(self, filter, update, upsert=False):
        keys = [k for k, d in self.docs.items() if _match(d, filter)]
        if keys:
            _apply_update(self.docs[keys[0]], update)
            return _Result()
        if upsert:
            doc = {**filter, **update.get("$setOnInsert", {})}
            _apply_update(doc, update)
            key = doc.get("_id") or self._key(doc)
            doc.setdefault("_id", key)
            self.docs[key] = doc
            return _Result(upserted_id=key)
        return _Result()

    def find(self, flt=None, projection=None, **k):
        return _FakeCursor([d for d in self.docs.values() if _match(d, flt)])


class FakeDB:
    def __init__(self):
        self._cols = {}

    def __getitem__(self, name):
        return self._cols.setdefault(name, FakeCollection())


def _agg():
    db = FakeDB()
    return fa.FinancialAggregator(db=db), db


# ─── Verified tier seeding ───────────────────────────────────────────────
async def test_seed_verified_inserts_full_catalog():
    agg, db = _agg()
    n = await agg.seed_verified(fa._utcnow())
    assert n == 46
    assert await db[fa.PRODUCTS_COL].count_documents({"tier": "verified"}) == 46
    doc = await db[fa.PRODUCTS_COL].find_one(
        {"name": "SBI Scholar Loan"})
    assert doc["tier"] == "verified"
    assert doc["source"] == "curated"
    assert doc["dedup_key"].endswith("|loan")


async def test_seed_verified_gap_fills_bare_seeded_rows():
    # rows from financial_services._ensure_seeded predate the aggregator's
    # fields — re-seeding must gap-fill, never clobber live values
    agg, db = _agg()
    from core.catalogs.financial import FINANCIAL_CATALOG
    item = FINANCIAL_CATALOG["loan"][0]
    h = fa.dedup_hash(item["name"], item["provider"], "loan")
    bare = {"_id": "bare-1", "dedup_hash": h, "name": item["name"],
            "interest_rate": 99.0, "status": "open"}
    await db[fa.PRODUCTS_COL].insert_one(bare)
    await agg.seed_verified(fa._utcnow())
    doc = await db[fa.PRODUCTS_COL].find_one({"dedup_hash": h})
    assert doc["interest_rate"] == 99.0      # live value preserved
    assert doc["status"] == "open"
    assert doc["tier"] == "verified"         # gap-filled
    assert doc["dedup_key"] == fa.dedup_key(
        item["name"], item["provider"], "loan")


# ─── Scraped overlay + richest-wins dedup ───────────────────────────────
async def test_scraped_rows_overlay_matching_verified_doc():
    agg, db = _agg()
    adp = fa.ADAPTERS_BY_NAME["nsp"]
    row = dict(adp._CATALOG[0])
    h = fa.dedup_hash(row["name"], row["provider"], "scholarship")
    await db[fa.PRODUCTS_COL].update_one(
        {"dedup_hash": h},
        {"$set": {"dedup_hash": h, "tier": "verified",
                  "name": row["name"], "interest_rate": 99}},
        upsert=True)
    res = await agg.run_source("nsp")
    assert res == {"source": "nsp", "status": "ok", "fetched": 2,
                   "overlaid": 1, "inserted": 1, "skipped": 0}
    doc = await db[fa.PRODUCTS_COL].find_one(
        {"dedup_hash": h, "tier": "verified"})
    assert doc["last_overlay"] == "nsp"
    assert doc["interest_rate"] == 99        # not a live field, untouched
    assert doc["status"] == "open"
    assert "nsp" in doc["sources"]


async def test_scraped_row_idempotent_second_run():
    agg, _db = _agg()
    first = await agg.run_source("nsp")
    second = await agg.run_source("nsp")
    assert first == {"source": "nsp", "status": "ok", "fetched": 2,
                     "overlaid": 0, "inserted": 2, "skipped": 0}
    assert second["inserted"] == 0 and second["skipped"] == 2


async def test_richest_wins_backfill_across_sources():
    agg, db = _agg()
    poor = {"name": "Shared Loan", "provider": "Some Bank",
            "amount_min": 1000}
    rich = {"name": "Shared Loan", "provider": "Some Bank",
            "amount_min": 2000, "amount_max": 5000, "tenure_months": 120,
            "interest_rate": 9.0, "application_url": "https://x.example",
            "short_desc": "detailed"}
    key = fa.dedup_key("Shared Loan", "Some Bank", "loan")
    r1 = await agg.upsert_scraped("bankbazaar", [dict(poor)], fa._utcnow())
    r2 = await agg.upsert_scraped("vidyalaxmi", [dict(rich)], fa._utcnow())
    assert r1 == {"overlaid": 0, "inserted": 1, "skipped": 0}
    assert r2 == {"overlaid": 0, "inserted": 0, "skipped": 1}
    doc = await db[fa.PRODUCTS_COL].find_one({"dedup_key": key})
    assert doc["interest_rate"] == 9.0       # backfilled by the richer row
    assert doc["amount_max"] == 5000
    assert doc["short_desc"] == "detailed"
    assert set(doc["sources"]) >= {"bankbazaar", "vidyalaxmi"}


# ─── Full pipeline ───────────────────────────────────────────────────────
async def test_full_pipeline_run_reports_all_sources():
    agg, db = _agg()
    report = await agg.run()
    assert len(report["results"]) == 20
    assert {r["status"] for r in report["results"]} == {"ok"}
    assert report["verified_seeded"] == 46
    assert report["products_total"] == 72
    assert await db[fa.RUN_META].count_documents({}) == 1
    assert await db[fa.PRODUCTS_COL].count_documents(
        {"tier": "verified"}) == 46
    assert await db[fa.PRODUCTS_COL].count_documents(
        {"tier": "scraped"}) == 26


async def test_run_filters_by_tier():
    agg, _db = _agg()
    report = await agg.run(tiers={3})
    assert [r["source"] for r in report["results"]] == ["coverfox"]
    assert report["products_total"] == 48


async def test_run_single_source_only():
    agg, _db = _agg()
    report = await agg.run(source="nsp")
    assert [r["source"] for r in report["results"]] == ["nsp"]


async def test_run_aggregation_defaults_to_cron_tiers(monkeypatch):
    # cron refreshes tiers 1+2 only — tier 3 (Coverfox) is on-demand
    agg, _db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    report = await fa.run_aggregation()
    assert len(report["results"]) == 19
    assert "coverfox" not in {r["source"] for r in report["results"]}
    assert report["products_total"] == 70


async def test_status_shape_after_run():
    agg, _db = _agg()
    await agg.run()
    st = await agg.status()
    assert set(st["collections"]) == {"verified", "scraped", "total"}
    assert st["collections"] == {"verified": 46, "scraped": 26, "total": 72}
    assert st["last_run_at"] is not None
    assert len(st["sources"]) == 20
    assert all(s["enabled"] for s in st["sources"])
    assert st["sources"][0]["tier"] in (1, 2, 3)


# ─── Scheduler env gates ─────────────────────────────────────────────────
def test_scheduler_cron_disabled(monkeypatch):
    monkeypatch.setenv("FINANCIAL_AGGREGATOR_CRON_ENABLED", "0")
    monkeypatch.setenv("FINANCIAL_AGGREGATOR_RUN_ON_STARTUP", "0")
    fa.stop_financial_aggregator_scheduler()
    try:
        fa.start_financial_aggregator_scheduler()
        assert fa._scheduler is None
    finally:
        fa.stop_financial_aggregator_scheduler()


def test_scheduler_starts_daily_job(monkeypatch):
    monkeypatch.setenv("FINANCIAL_AGGREGATOR_CRON_ENABLED", "1")
    monkeypatch.setenv("FINANCIAL_AGGREGATOR_RUN_ON_STARTUP", "0")
    fa.stop_financial_aggregator_scheduler()
    try:
        fa.start_financial_aggregator_scheduler()
        assert fa._scheduler is not None
        assert fa._scheduler.get_job(
            "financial_aggregator_daily") is not None
    finally:
        fa.stop_financial_aggregator_scheduler()
        assert fa._scheduler is None


def test_scheduler_start_is_idempotent(monkeypatch):
    monkeypatch.setenv("FINANCIAL_AGGREGATOR_CRON_ENABLED", "1")
    monkeypatch.setenv("FINANCIAL_AGGREGATOR_RUN_ON_STARTUP", "0")
    fa.stop_financial_aggregator_scheduler()
    try:
        fa.start_financial_aggregator_scheduler()
        first = fa._scheduler
        fa.start_financial_aggregator_scheduler()
        assert fa._scheduler is first
    finally:
        fa.stop_financial_aggregator_scheduler()
        assert fa._scheduler is None


# ─── Admin router + manual trigger (super_admin only) ───────────────────
def _admin_app():
    from fastapi import FastAPI

    import core.deps as cdeps
    app = FastAPI()
    app.include_router(fa.router)
    app.include_router(fa.admin_router)
    return app, cdeps


def _as_role(app, cdeps, role):
    app.dependency_overrides[cdeps.get_current_user] = \
        lambda: {"role": role}


def test_admin_status_forbidden_for_admin():
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.get("/admin/financial-aggregator/status")
    assert r.status_code == 403


def test_admin_status_ok_for_super_admin(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.get("/admin/financial-aggregator/status")
    assert r.status_code == 200
    body = r.json()
    assert set(body["collections"]) == {"verified", "scraped", "total"}
    assert len(body["sources"]) == 20
    assert body["last_run_at"] is None


async def test_admin_toggle_source(monkeypatch):
    agg, db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.patch("/admin/financial-aggregator/sources/nsp",
                    json={"enabled": False})
        r404 = c.patch("/admin/financial-aggregator/sources/ghost",
                       json={"enabled": True})
    assert r.status_code == 200
    assert r.json() == {"source": "nsp", "enabled": False}
    doc = await db[fa.SOURCE_META].find_one({"source": "nsp"})
    assert doc and doc["enabled"] is False
    assert r404.status_code == 404


def test_fin_aggregate_full_run(monkeypatch):
    # manual trigger w/o args = cron tiers (1+2): 19 of 20 sources
    agg, _db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/financial/aggregate")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert len(body["results"]) == 19


def test_fin_aggregate_single_source(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/financial/aggregate", params={"source": "nsp"})
    assert r.status_code == 200
    assert len(r.json()["results"]) == 1


def test_fin_aggregate_tier3_unlocks_coverfox(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/financial/aggregate", params={"tier": 3})
    assert r.status_code == 200
    body = r.json()
    assert [x["source"] for x in body["results"]] == ["coverfox"]
    assert body["products_total"] == 48


def test_fin_aggregate_bad_tier_rejected(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/financial/aggregate", params={"tier": 9})
    assert r.status_code == 400


def test_fin_aggregate_unknown_source_rejected(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(fa, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/financial/aggregate", params={"source": "ghost"})
    assert r.status_code == 404


def test_fin_aggregate_forbidden_for_admin():
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/financial/aggregate")
    assert r.status_code == 403
