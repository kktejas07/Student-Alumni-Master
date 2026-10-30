"""
H1 — Higher-Ed Aggregator Bot tests.

Covers:
  - slug / compound-key / deterministic match-estimate helpers
  - all 9 adapters (static catalogs; OpenAlex + open.er-api.com live mocks)
  - document shaping (programmes / scholarships / countries / forex)
  - the full pipeline (upsert, compound-key dedup "richest wins", run report)
    with an in-memory fake Mongo
  - cache readers + platform seed fallback (empty cache → seed lists)
  - the 03:00 IST scheduler env gates
  - the super_admin admin router (/admin/he-aggregator) and POST /he/refresh
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# core.db requires MONGO_URL + JWT_SECRET at import; set safe dev defaults
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("JWT_SECRET", "x" * 40)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

from features import higher_ed_aggregator as hea


def _mock_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _openalex_handler(request: httpx.Request) -> httpx.Response:
    cc = request.url.params["filter"].split(",")[0].split(":")[1]
    results = [
        {"id": f"https://openalex.org/inst/I{cc}{i}",
         "display_name": f"{cc} University {i}",
         "c10_index": 900 + i, "works_count": i * 100}
        for i in (1, 2, 3)
    ]
    return httpx.Response(200, json={"results": results})


def _fx_handler(_request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json={
        "rates": {"USD": 0.012, "GBP": 0.0095, "EUR": 0.011,
                  "CAD": 0.016, "AUD": 0.017, "SGD": 0.013}})


def _inject_live_mocks():
    oxa = hea.ADAPTERS_BY_NAME["openalex"]
    oxa.http = _mock_client(_openalex_handler)
    fx = hea.ADAPTERS_BY_NAME["exchange_rate"]
    fx.http = _mock_client(_fx_handler)
    return oxa, fx


def _reset_live_mocks(oxa, fx):
    oxa.http = None
    fx.http = None


# ─── Helpers: slug / keys / match ────────────────────────────────────────
def test_slugify_basics():
    assert hea.slugify("IIT Delhi") == "iit-delhi"
    assert hea.slugify("") == "x"
    short = hea.slugify("a" * 100, max_len=10)
    assert len(short) <= 10 and not short.endswith("-")


def test_programme_key_compound():
    # institution/programme are slugified; degree & country are bare lowercased
    key = hea.programme_key("IIT Delhi", "M.Tech in CS", "M.Tech", "India")
    assert key == "iit-delhi|m-tech-in-cs|m.tech|india"
    assert key.replace("|", "-") == "iit-delhi-m-tech-in-cs-m.tech-india"


def test_scholarship_key():
    key = hea.scholarship_key("DAAD Germany", "DAAD WISE", "UG")
    assert key == "daad-germany|daad-wise|ug"


def test_estimate_match_bounds_and_signals():
    assert hea.estimate_match({}) == 60
    assert hea.estimate_match({"qs_rank": 1, "nirf_rank": 1,
                               "openalex": 1000, "acceptance_rate": 1}) == 95
    assert hea.estimate_match({"qs_rank": 100, "nirf_rank": 100,
                               "openalex": 300, "acceptance_rate": 90}) == 55


# ─── Adapter registry + catalogs ────────────────────────────────────────
def test_nine_adapters_registered():
    assert len(hea.ALL_ADAPTERS) == 9
    assert set(hea.ADAPTERS_BY_NAME) == {
        "qs_rankings", "nirf_rankings", "openalex", "study_portals",
        "daad", "ugc_list", "buddy4study", "exchange_rate", "numbeo"}


async def test_static_adapter_row_counts():
    expected = {"qs_rankings": 8, "nirf_rankings": 5, "study_portals": 4,
                "daad": 4, "ugc_list": 3, "buddy4study": 4, "numbeo": 8}
    for name, n in expected.items():
        rows = await hea.ADAPTERS_BY_NAME[name].fetch_rows()
        assert len(rows) == n, name
        assert all(r.get("source_id") for r in rows), name


async def test_daad_rows_split_by_feed():
    rows = await hea.ADAPTERS_BY_NAME["daad"].fetch_rows()
    prog = [r for r in rows if "institution" in r]
    schol = [r for r in rows if "funder" in r]
    assert len(prog) == 2 and len(schol) == 2


# ─── Live adapters (mocked HTTP, key-free APIs) ─────────────────────────
async def test_openalex_live_mock_rows():
    oxa = hea.ADAPTERS_BY_NAME["openalex"]
    oxa.http = _mock_client(_openalex_handler)
    try:
        rows = await oxa.fetch_rows()
    finally:
        oxa.http = None
    inst = [r for r in rows if r.get("feed") == "programmes"]
    ctry = [r for r in rows if r.get("feed") == "countries"]
    assert len(inst) == 15 and len(ctry) == 5
    assert {r["openalex"] for r in inst} <= {900, 901, 902, 903}
    assert {r["source_id"] for r in ctry} == {
        "openalex-country-IN", "openalex-country-GB", "openalex-country-US",
        "openalex-country-DE", "openalex-country-SG"}


async def test_openalex_error_isolated():
    agg, _db = _agg()
    oxa = hea.ADAPTERS_BY_NAME["openalex"]
    oxa.http = _mock_client(lambda _r: httpx.Response(500, json={"error": "x"}))
    try:
        rows, status = await agg.fetch_source("openalex")
    finally:
        oxa.http = None
    assert (rows, status) == ([], "error")


async def test_exchange_rate_live_rows():
    adp = hea.ADAPTERS_BY_NAME["exchange_rate"]
    adp.http = _mock_client(_fx_handler)
    try:
        rows = await adp.fetch_rows()
    finally:
        adp.http = None
    by = {r["currency"]: r for r in rows}
    assert set(by) == set(hea.ExchangeRateAdapter.TARGET_CURRENCIES)
    assert by["USD"]["rate_to_inr"] == 83.3333
    assert by["USD"]["fx_source"] == "open.er-api.com"


async def test_exchange_rate_fallback_on_error():
    adp = hea.ADAPTERS_BY_NAME["exchange_rate"]
    adp.http = _mock_client(lambda _r: httpx.Response(503))
    try:
        rows = await adp.fetch_rows()
    finally:
        adp.http = None
    assert len(rows) == 6
    assert all(r["fx_source"] == "fallback" for r in rows)
    usd = next(r for r in rows if r["currency"] == "USD")
    assert usd["rate_to_inr"] == hea.FX_FALLBACK_TO_INR["USD"]


# ─── fetch_source plumbing ───────────────────────────────────────────────
async def test_fetch_source_unknown():
    agg, _db = _agg()
    assert await agg.fetch_source("nope") == ([], "unknown_source")


async def test_fetch_source_disabled_via_meta():
    agg, _db = _agg()
    await agg.meta.update_one(
        {"source": "qs_rankings"}, {"$set": {"enabled": False}}, upsert=True)
    assert await agg.fetch_source("qs_rankings") == ([], "disabled")


async def test_injected_client_is_reused_and_reset():
    agg, _db = _agg()
    oxa = hea.ADAPTERS_BY_NAME["openalex"]
    client = _mock_client(_openalex_handler)
    oxa.http = client
    try:
        rows, status = await agg.fetch_source("openalex")
    finally:
        oxa.http = None
    assert status == "ok" and len(rows) == 20
    assert oxa.http is None          # injected client reset, not closed
    assert not client.is_closed


# ─── Pipeline with in-memory fake Mongo ──────────────────────────────────
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
        return doc.get("source")

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
        return type("R", (), {"inserted_id": doc["_id"]})()

    async def count_documents(self, flt=None, **k):
        return len([d for d in self.docs.values() if _match(d, flt)])

    async def create_index(self, *a, **k):
        pass

    async def update_one(self, filter, update, upsert=False):
        keys = [k for k, d in self.docs.items() if _match(d, filter)]
        if keys:
            self.docs[keys[0]].update(update.get("$set", {}))
            return type("R", (), {"upserted_id": None, "matched_count": 1})()
        if upsert:
            doc = {**filter, **update.get("$setOnInsert", {}),
                   **update.get("$set", {})}
            await self.insert_one(doc)
            return type("R", (), {"upserted_id": "new", "matched_count": 0})()
        return type("R", (), {"upserted_id": None, "matched_count": 0})()

    def find(self, flt=None, projection=None, **k):
        return _FakeCursor([d for d in self.docs.values() if _match(d, flt)])


class FakeDB:
    def __init__(self):
        self._cols = {}

    def __getitem__(self, name):
        return self._cols.setdefault(name, FakeCollection())


def _agg():
    db = FakeDB()
    return hea.HigherEdAggregator(db=db), db


async def test_run_source_upserts_then_idempotent():
    agg, _db = _agg()
    first = await agg.run_source("qs_rankings")
    second = await agg.run_source("qs_rankings")
    assert first == {"source": "qs_rankings", "status": "ok",
                     "fetched": 8, "upserted": 8}
    assert second["upserted"] == 0


async def test_run_source_routes_daad_feeds():
    agg, db = _agg()
    res = await agg.run_source("daad")
    assert res["fetched"] == 4
    assert await db[hea.PROG_COL].count_documents({}) == 2
    assert await db[hea.SCHOL_COL].count_documents({}) == 2


async def test_prog_doc_shape_and_fx_conversion():
    agg, _db = _agg()
    adp = hea.ADAPTERS_BY_NAME["qs_rankings"]
    row = adp._CATALOG[0]  # Oxford MSc Computer Science, £36k, 1 year
    doc = agg._to_prog_doc(adp, row, dict(hea.FX_FALLBACK_TO_INR),
                           hea._utcnow())
    assert doc["id"] == "university-of-oxford-msc-computer-science-msc-uk"
    assert doc["fee_inr"] == 36000 * 105
    assert doc["total_cost_inr"] == 36000 * 105      # "1 year" → ×1
    assert 55 <= doc["match"] <= 95
    assert doc["sources"] == ["qs_rankings"]
    assert doc["status"] == "active"
    assert doc["fee"] == "£36,000"


async def test_dedup_richest_wins_and_merges_sources():
    agg, _db = _agg()
    base = {"id": "x|y|pg|uk", "status": "active", "sources": []}
    rich = {**base, "source": "qs_rankings", "source_id": "1",
            "qs_rank": 3, "apply_url": "https://a.example",
            "deadline": "2026-01-19", "fee_amount": 36000,
            "sources": ["qs_rankings"]}
    poor = {**base, "source": "study_portals", "source_id": "2",
            "min_cgpa": 7.0, "sources": ["study_portals"]}
    await agg.prog.update_one({"source": "qs_rankings", "source_id": "1"},
                              {"$set": rich}, upsert=True)
    await agg.prog.update_one({"source": "study_portals", "source_id": "2"},
                              {"$set": poor}, upsert=True)
    marked = await agg.dedup_run()
    assert marked == 1
    winner = await agg.prog.find_one({"source": "qs_rankings", "source_id": "1"})
    loser = await agg.prog.find_one({"source": "study_portals", "source_id": "2"})
    assert loser["status"] == "duplicate"
    assert loser["duplicate_of"] == "x|y|pg|uk"
    assert set(winner["sources"]) == {"qs_rankings", "study_portals"}


async def test_dedup_scoped_to_sources():
    agg, _db = _agg()
    a = {"id": "x|y|pg|uk", "status": "active", "source": "a",
         "source_id": "1", "qs_rank": 3}
    c = {"id": "x|y|pg|uk", "status": "active", "source": "c",
         "source_id": "1"}
    await agg.prog.update_one({"source": "a", "source_id": "1"},
                              {"$set": a}, upsert=True)
    await agg.prog.update_one({"source": "c", "source_id": "1"},
                              {"$set": c}, upsert=True)
    assert await agg.dedup_run(sources=["a"]) == 0
    assert await agg.dedup_run() == 1


async def test_pipeline_run_all_sources():
    agg, db = _agg()
    oxa, fx = _inject_live_mocks()
    try:
        report = await agg.run()
    finally:
        _reset_live_mocks(oxa, fx)
    assert len(report["results"]) == 9
    assert {r["status"] for r in report["results"]} == {"ok"}
    # 8 qs + 5 nirf + 4 portals + 2 daad + 3 ugc + 15 openalex = 37
    assert report["total_programmes"] == 37
    # 2 daad + 4 buddy4study = 6
    assert report["total_scholarships"] == 6
    # 8 numbeo + 5 openalex = 13
    assert report["total_countries"] == 13
    assert report["dupes_marked"] == 0
    assert await db[hea.RUN_META].count_documents({}) == 1


async def test_get_fx_rates_cache_over_fallback():
    agg, _db = _agg()
    await agg.forex.update_one(
        {"source": "exchange_rate", "source_id": "USD"},
        {"$set": {"currency": "USD", "rate_to_inr": 80.0,
                  "fx_source": "test"}},
        upsert=True)
    rates = await agg.get_fx_rates()
    assert rates["USD"] == 80.0
    assert rates["GBP"] == hea.FX_FALLBACK_TO_INR["GBP"]


async def test_cache_readers_strip_id_and_active_only(monkeypatch):
    agg, _db = _agg()
    a = {"id": "solo", "status": "active", "source": "qs_rankings",
         "source_id": "a"}
    b = {"id": "solo", "status": "duplicate", "duplicate_of": "solo",
         "source": "study_portals", "source_id": "b"}
    await agg.prog.update_one({"source": "qs_rankings", "source_id": "a"},
                              {"$set": a}, upsert=True)
    await agg.prog.update_one({"source": "study_portals", "source_id": "b"},
                              {"$set": b}, upsert=True)
    docs = await agg.prog.find({"status": "active"}).to_list(length=5000)
    assert len(docs) == 1 and docs[0]["_id"] and docs[0]["id"] == "solo"
    # module-level readers must agree once the global points at the fake
    monkeypatch.setattr(hea, "aggregator", agg)
    out = await hea.read_programme_cache()
    assert len(out) == 1 and "_id" not in out[0]
    assert await hea.read_scholarship_cache() == []
    assert await hea.read_country_cache() == []


async def test_platform_pool_seed_fallback(monkeypatch):
    from features import higher_ed_platform as hep
    agg, _db = _agg()
    monkeypatch.setattr(hea, "aggregator", agg)
    pool = await hep._programme_pool()
    assert len(pool) == len(hep._seed_programmes())
    pid = hep._seed_programmes()[0]["id"]
    found = await hep._find_programme(pid)
    assert found is not None and found["id"] == pid
    sch = await hep._scholarship_pool()
    assert len(sch) == len(hep._seed_scholarships())
    ctry = await hep._country_pool()
    assert len(ctry) == len(hep._seed_countries())


async def test_platform_find_programme_cache_hit(monkeypatch):
    from features import higher_ed_platform as hep
    agg, _db = _agg()
    doc = {"id": "cache-only-id", "status": "active", "source": "qs_rankings",
           "source_id": "z", "institution": "Cache Inst",
           "name": "Cached MSc"}
    await agg.prog.update_one({"source": "qs_rankings", "source_id": "z"},
                              {"$set": doc}, upsert=True)
    monkeypatch.setattr(hea, "aggregator", agg)
    found = await hep._find_programme("cache-only-id")
    assert found is not None and found["institution"] == "Cache Inst"


# ─── Scheduler env gates ────────────────────────────────────────────────
def test_scheduler_cron_disabled(monkeypatch):
    monkeypatch.setenv("HE_AGGREGATOR_CRON_ENABLED", "0")
    hea.stop_higher_ed_aggregator_scheduler()
    try:
        hea.start_higher_ed_aggregator_scheduler()
        assert hea._scheduler is None
    finally:
        hea.stop_higher_ed_aggregator_scheduler()


def test_scheduler_starts_daily_job(monkeypatch):
    monkeypatch.setenv("HE_AGGREGATOR_CRON_ENABLED", "1")
    monkeypatch.setenv("HE_AGGREGATOR_RUN_ON_STARTUP", "0")
    hea.stop_higher_ed_aggregator_scheduler()
    try:
        hea.start_higher_ed_aggregator_scheduler()
        assert hea._scheduler is not None
        assert hea._scheduler.get_job("higher_ed_aggregator_daily") is not None
    finally:
        hea.stop_higher_ed_aggregator_scheduler()
        assert hea._scheduler is None


# ─── Admin router + public refresh (super_admin only) ───────────────────
def _admin_app():
    from fastapi import FastAPI

    import core.deps as cdeps
    app = FastAPI()
    app.include_router(hea.router)
    app.include_router(hea.admin_router)
    return app, cdeps


def _as_role(app, cdeps, role):
    app.dependency_overrides[cdeps.get_current_user] = lambda: {"role": role}


def test_admin_status_forbidden_for_admin():
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.get("/admin/he-aggregator/status")
    assert r.status_code == 403


def test_admin_status_ok_for_super_admin(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(hea, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.get("/admin/he-aggregator/status")
    assert r.status_code == 200
    body = r.json()
    assert set(body["collections"]) == {"programmes", "scholarships",
                                        "countries", "forex"}
    assert len(body["sources"]) == 9
    assert body["last_run_at"] is None


async def test_admin_toggle_source(monkeypatch):
    agg, db = _agg()
    monkeypatch.setattr(hea, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.patch("/admin/he-aggregator/sources/numbeo",
                    json={"enabled": False})
        r404 = c.patch("/admin/he-aggregator/sources/ghost",
                       json={"enabled": True})
    assert r.status_code == 200
    assert r.json() == {"source": "numbeo", "enabled": False}
    doc = await db[hea.SOURCE_META].find_one({"source": "numbeo"})
    assert doc and doc["enabled"] is False
    assert r404.status_code == 404


def test_he_refresh_full_run(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(hea, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    oxa, fx = _inject_live_mocks()
    from fastapi.testclient import TestClient
    try:
        with TestClient(app) as c:
            r = c.post("/he/refresh")
    finally:
        _reset_live_mocks(oxa, fx)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and len(body["results"]) == 9


def test_he_refresh_single_static_source(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(hea, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/he/refresh", params={"source": "numbeo"})
    assert r.status_code == 200
    assert len(r.json()["results"]) == 1


def test_he_refresh_unknown_source(monkeypatch):
    agg, _db = _agg()
    monkeypatch.setattr(hea, "aggregator", agg)
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "super_admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/he/refresh", params={"source": "ghost"})
    assert r.status_code == 404


def test_he_refresh_forbidden_for_admin():
    app, cdeps = _admin_app()
    _as_role(app, cdeps, "admin")
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        r = c.post("/he/refresh")
    assert r.status_code == 403
