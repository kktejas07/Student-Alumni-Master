"""
R1 — Universal Rentals Aggregator Bot tests.

Covers:
  - category/type auto-classifier
  - all 16 adapters (static catalogs; live variants with httpx.MockTransport)
  - fuzzy dedup (city + category + rent ±10% + fuzzy title → keep best,
    loser → "inactive" which the marketplace filters out)
  - document shaping (marketplace/frontend-compatible display fields)
  - the full pipeline (upsert, dedup, stale marking, geo query, status)
    with an in-memory fake Mongo
  - the super-admin admin router (status / source toggle / manual run)
"""
from __future__ import annotations

import os
import sys
from datetime import timedelta
from pathlib import Path

# core.db requires MONGO_URL + JWT_SECRET at import; set safe dev defaults
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test")
os.environ.setdefault("JWT_SECRET", "x" * 40)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
import pytest

from services import rentals_aggregator as ra


def _mock_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


# ─── Classifier ──────────────────────────────────────────────────────────
def test_classify_housing_types():
    assert ra.classify_listing("Spacious 2BHK near Baner", "") == ("housing", "2bhk")
    assert ra.classify_listing("Modern Studio apartment in Powai", "").__getitem__(0) == "housing"
    cat, typ = ra.classify_listing("Shared flat, 1 room free in 3BHK Indiranagar")
    assert (cat, typ) == ("housing", "shared_flat")
    assert ra.classify_listing("Budget PG with mess meals", "pay guest near IIT") == ("housing", "pg")
    assert ra.classify_listing("4-bed dorm hostel in Jaipur", "") == ("housing", "hostel")
    assert ra.classify_listing("Furnished 1BHK builder floor", "") == ("housing", "1bhk")


def test_classify_vehicle():
    assert ra.classify_listing("Monthly car rental, self-drive", "") == ("vehicle", "car")
    assert ra.classify_listing("Electric scooter subscription", "") == ("vehicle", "scooter")
    assert ra.classify_listing("EV cycle for campus", "cycling plan") == ("vehicle", "cycle")
    assert ra.classify_listing("Motorbike monthly plan", "") == ("vehicle", "bike")


def test_classify_hotel():
    assert ra.classify_listing("Luxury resort stay in Goa", "") == ("hotel", "resort")
    assert ra.classify_listing("Weekend farmhouse in Dharampur", "") == ("hotel", "farmhouse")
    cat, typ = ra.classify_listing("Beach house villa with pool")
    assert (cat, typ) == ("hotel", "villa")
    assert ra.classify_listing("Snow cabin in Manali", "") == ("hotel", "cabin")
    assert ra.classify_listing("Budget hotel near IIT Madras", "oyo rooms") == ("hotel", "hotel")


def test_classify_coworking():
    assert ra.classify_listing("Hot desk with gig WiFi", "") == ("coworking", "hot_desk")
    assert ra.classify_listing("Private cabin for two, 91springboard", "") == ("coworking", "private_cabin")
    assert ra.classify_listing("Meeting room for 12, by the hour", "") == ("coworking", "meeting_room")


def test_classify_defaults_to_housing():
    assert ra.classify_listing("Wonderful place to live", "nice vibes")[0] == "housing"


# ─── Stable ids & shaping helpers ────────────────────────────────────────
def test_stable_id_is_deterministic():
    a = ra.RentalsSourceAdapter._stable_id("nobroker", 3)
    b = ra.RentalsSourceAdapter._stable_id("nobroker", 3)
    c = ra.RentalsSourceAdapter._stable_id("nobroker", 4)
    assert a == b
    assert a != c
    assert a.startswith("nobroker-")


def test_to_doc_marketplace_shape():
    ad = ra.BookingComAdapter()
    rows = ad._static()
    doc = ra._to_doc(ad, rows[0], ra._utcnow())
    # frontend detail/booking lookups key off `id`
    assert doc["id"] == "booking_com:bc-com-1"
    assert doc["listing_id"] == doc["id"]
    assert doc["type"] == "Hotel" and doc["type_code"] == "hotel"
    assert doc["discount"] == "38%" and doc["discount_pct"] == 38
    assert doc["reviews"] == 890
    assert doc["beds"] == "Deluxe room"
    assert doc["available"] == 20
    assert doc["color"] == ra.CATEGORY_COLORS["hotel"]
    assert doc["status"] == "active"
    # 2dsphere point: coordinates are [lon, lat]
    assert doc["geo"]["coordinates"] == [77.5946, 12.9716]


def test_to_doc_defaults_and_rent_label():
    ad = ra.BounceAdapter()
    doc = ra._to_doc(ad, {"source_id": "bc-2", "title": "Bounce Scooter",
                          "rent_inr": 149, "rent_unit": "per_day",
                          "original_inr": 199}, ra._utcnow())
    assert doc["rent_label"] == "₹149/day"
    assert doc["orig_label"] == "₹199/day"
    assert doc["source"] == "bounce"
    assert doc["category"] == "vehicle" and doc["type_code"] == "scooter"


def test_rent_unit_normalizes_unknown_to_per_month():
    doc = ra._to_doc(ra.YuluAdapter(), {"source_id": "x", "title": "EV bike",
                                        "rent_inr": 100, "rent_unit": "per_week"},
                     ra._utcnow())
    assert doc["rent_unit"] == "per_month"
    assert doc["rent_label"] == "₹100/mo"


# ─── Adapters: static catalogs ──────────────────────────────────────────
async def test_all_adapters_registered():
    assert len(ra.ALL_ADAPTERS) == 16
    for a in ra.ALL_ADAPTERS:
        assert a.source_name in ra.ADAPTERS_BY_NAME


async def test_static_adapters_return_rows():
    for name in ["nobroker", "zolo_stays", "stanza", "oyo", "hostelworld",
                 "magicbricks", "99acres", "nestaway", "zoomcar", "bounce",
                 "yulu", "coworking"]:
        rows = await ra.ADAPTERS_BY_NAME[name].fetch_listings()
        assert len(rows) > 0, name
        for r in rows:
            assert r["title"], name
            assert r.get("source_id"), name
            assert r["category"] in ra.RENTAL_CATEGORIES, name
            assert r["type"] in ra.RENTAL_TYPES, name


async def test_sa_exclusive_is_empty_until_r8():
    assert await ra.SAExclusiveAdapter().fetch_listings() == []


async def test_booking_com_static_without_key(monkeypatch):
    monkeypatch.delenv("BOOKING_COM_AFFILIATE_ID", raising=False)
    rows = await ra.BookingComAdapter().fetch_listings()
    ids = [r["source_id"] for r in rows]
    assert "bc-com-1" in ids and "bc-com-2" in ids


async def test_booking_com_live_with_key(monkeypatch):
    monkeypatch.setenv("BOOKING_COM_AFFILIATE_ID", "aid-123")
    payload = {"hotels": [{"hotelId": 555, "name": "Live Hotel", "city": "Mumbai",
                           "latitude": 18.9, "longitude": 72.8, "priceInr": 1500,
                           "rating": 4.2, "roomsAvailable": 7}]}
    ad = ra.BookingComAdapter(_mock_client(lambda _r: httpx.Response(200, json=payload)))
    rows = await ad.fetch_listings()
    assert len(rows) == 1
    assert rows[0]["source_id"] == "555"
    assert rows[0]["city"] == "Mumbai"
    assert rows[0]["rent_inr"] == 1500
    assert rows[0]["available_units"] == 7


async def test_booking_com_live_failure_falls_back_to_static(monkeypatch):
    monkeypatch.setenv("BOOKING_COM_AFFILIATE_ID", "aid-123")
    ad = ra.BookingComAdapter(_mock_client(lambda _r: httpx.Response(500)))
    rows = await ad.fetch_listings()
    assert [r["source_id"] for r in rows] == ["bc-com-1", "bc-com-2"]


async def test_hostelworld_affiliate_static_without_key(monkeypatch):
    monkeypatch.delenv("HOSTELWORLD_API_KEY", raising=False)
    rows = await ra.HostelworldAffiliateAdapter().fetch_listings()
    assert "hw-aff-1" in [r["source_id"] for r in rows]


async def test_hostelworld_affiliate_live_with_key(monkeypatch):
    monkeypatch.setenv("HOSTELWORLD_API_KEY", "k")
    payload = {"items": [{"id": 9001, "name": "Live Hostel",
                          "destination": {"name": "Bengaluru",
                                          "latitude": 12.97, "longitude": 77.59},
                          "priceFromInr": 5500, "reviewScore": 4.4,
                          "reviewCount": 210, "bedsAvailable": 9}]}
    ad = ra.HostelworldAffiliateAdapter(
        _mock_client(lambda _r: httpx.Response(200, json=payload)))
    rows = await ad.fetch_listings()
    assert rows[0]["source_id"] == "9001"
    assert rows[0]["city"] == "Bengaluru"
    assert rows[0]["type"] == "hostel"


async def test_reddit_live_with_mocked_http():
    payload = {"data": {"children": [
        {"data": {"id": "t1", "title": "2BHK rent in Bangalore under 20k?",
                  "selftext": "Looking for a 2bhk in Whitefield, Bengaluru",
                  "permalink": "/r/IndianRealEstate/comments/t1/", "stickied": False},
         "kind": "t3"},
        {"data": {"id": "t2", "title": "", "selftext": "ignored empty title"}},
    ]}}
    ad = ra.RedditIndianRealEstateAdapter(
        _mock_client(lambda _r: httpx.Response(200, json=payload)))
    rows = await ad.fetch_listings()
    assert len(rows) == 1
    assert rows[0]["city"] == "Bengaluru"
    assert rows[0]["tags"] == ["community", "reddit"]
    assert rows[0]["provider_slug"] == "reddit"


async def test_reddit_http_error_isolated():
    ad = ra.RedditIndianRealEstateAdapter(
        _mock_client(lambda _r: httpx.Response(503)))
    with pytest.raises(httpx.HTTPStatusError):
        await ad.fetch_listings()


# ─── Fuzzy dedup ─────────────────────────────────────────────────────────
def _dup(name, src, rank=None, title="NoBroker PG Baner Pune", rent=9500):
    d = {
        "listing_id": f"{src}:{name}", "source": src, "city": "Pune",
        "category": "housing", "title": title, "rent_inr": rent,
        "status": "active", "tags": [],
    }
    return d


def test_dedup_merges_fuzzy_dup_and_keeps_best_source():
    a = _dup("nb-1", "nobroker")
    b = _dup("mb-1", "magicbricks", title="NoBroker PG - Baner, Pune", rent=9700)
    merged = ra.deduplicate([a, b])
    assert len(merged) == 1
    out = merged[0]
    assert out["source"] == "nobroker"  # rank 3 beats magicbricks rank 5
    assert out["duplicate_listing_ids"] == ["magicbricks:mb-1"]


def test_dedup_keeps_distinct_listings():
    a = _dup("nb-1", "nobroker")
    c = _dup("z-9", "zolo_stays", title="Zolo Stays PG Whitefield Bengaluru",
             rent=7800)
    c["city"] = "Bengaluru"
    assert len(ra.deduplicate([a, c])) == 2


def test_dedup_rent_tolerance_is_10_percent():
    a = _dup("nb-1", "nobroker")
    b = _dup("mb-1", "magicbricks", title="NoBroker PG Baner Pune", rent=10500)
    # 9500 vs 10500 → diff 1000 > 950 (10% of 9500) → not a dup
    assert len(ra.deduplicate([a, b])) == 2
    b2 = _dup("mb-1", "magicbricks", title="NoBroker PG Baner Pune", rent=10400)
    assert len(ra.deduplicate([a, b2])) == 1


def test_dedup_carries_verified_and_unions_tags():
    a = _dup("nb-1", "stanza")
    b = _dup("mb-1", "magicbricks", title="NoBroker PG Baner Pune", rent=9600)
    b["verified"] = True
    b["tags"] = ["near-it-park"]
    out = ra.deduplicate([a, b])[0]
    # stanza (rank 4) beats magicbricks (rank 5), but verified carries over
    assert out["source"] == "stanza"
    assert out.get("verified") is True
    assert "near-it-park" in out["tags"]


# ─── Pipeline with in-memory fake Mongo ──────────────────────────────────
def _match(doc, flt):
    for k, v in flt.items():
        if isinstance(v, dict):
            if "$in" in v and doc.get(k) not in v["$in"]:
                return False
            if "$ne" in v and doc.get(k) == v["$ne"]:
                return False
            if "$lt" in v:
                dv = doc.get(k)
                if dv is None or not dv < v["$lt"]:
                    return False
            continue
        if doc.get(k) != v:
            return False
    return True


class FakeCollection:
    def __init__(self):
        self.docs = {}
        self.find_filters = []

    def _key(self, doc):
        if doc.get("_id") is not None:
            return doc["_id"]
        if doc.get("source_id") is not None:
            return f"{doc.get('source')}:{doc.get('source_id')}"
        return doc.get("source")

    async def find_one(self, flt=None, sort=None, **k):
        flt = flt or {}
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
        flt = flt or {}
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

    async def update_many(self, filter, update):
        n = 0
        for k, d in list(self.docs.items()):
            if _match(d, filter):
                d.update(update.get("$set", {}))
                n += 1
        return type("R", (), {"modified_count": n})()

    def find(self, flt=None, projection=None, **k):
        self.find_filters.append(flt or {})
        matches = [d for d in self.docs.values() if _match(d, flt or {})]
        cur = _FakeCursor(matches)
        return cur


class _FakeCursor:
    def __init__(self, docs):
        self._docs = docs
        self._limit = None

    def limit(self, n):
        self._limit = n
        return self

    def __aiter__(self):
        self._it = iter(self._docs[:self._limit] if self._limit else self._docs)
        return self

    async def __anext__(self):
        if self._it is None:
            self.__aiter__()
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class FakeDB:
    def __init__(self):
        self._cols: dict = {}

    def __getitem__(self, name):
        return self._cols.setdefault(name, FakeCollection())


def _agg():
    db = FakeDB()
    return ra.RentalsAggregator(db=db), db


async def test_pipeline_run_all_sources():
    agg, db = _agg()
    reddit = ra.ADAPTERS_BY_NAME["reddit_indianrealestate"]
    reddit.http = _mock_client(lambda _r: httpx.Response(200, json={"data": {"children": []}}))
    try:
        report = await agg.run()
    finally:
        reddit.http = None
    assert len(report["results"]) == 16
    assert all(r["status"] == "ok" for r in report["results"])
    assert report["total_active"] > 0
    listing_docs = db[ra.LISTINGS_COL].docs
    assert len(listing_docs) > 0
    d = next(iter(listing_docs.values()))
    assert d["status"] == "active"
    assert d["id"] == f"{d['source']}:{d['source_id']}"
    assert len(db[ra.RUN_META].docs) == 1


async def test_pipeline_single_source_and_upsert_idempotence():
    agg, db = _agg()
    r1 = await agg.run_source("bounce")
    assert r1["status"] == "ok" and r1["fetched"] == 2
    assert r1["upserted"] == 2
    r2 = await agg.run_source("bounce")
    assert r2["fetched"] == 2 and r2["upserted"] == 0
    assert len(db[ra.LISTINGS_COL].docs) == 2


async def test_unknown_and_disabled_sources():
    agg, db = _agg()
    assert (await agg.run_source("nope"))["status"] == "unknown_source"
    await db[ra.SOURCE_META].insert_one({"source": "nobroker", "enabled": False})
    r = await agg.run_source("nobroker")
    assert r["status"] == "disabled" and r["fetched"] == 0


async def test_dedup_run_marks_loser_inactive():
    agg, db = _agg()
    a = _dup("nb-1", "nobroker")
    b = _dup("mb-1", "magicbricks", title="NoBroker PG - Baner, Pune", rent=9700)
    a["created_at"] = b["created_at"] = None
    db[ra.LISTINGS_COL].docs["nobroker:nb-1"] = {**a, "_id": 1}
    db[ra.LISTINGS_COL].docs["magicbricks:mb-1"] = {**b, "_id": 2}
    marked = await agg.dedup_run([])
    assert marked == 1
    loser = db[ra.LISTINGS_COL].docs["magicbricks:mb-1"]
    winner = db[ra.LISTINGS_COL].docs["nobroker:nb-1"]
    assert loser["status"] == "inactive"
    assert winner["status"] == "active"
    assert winner["duplicate_listing_ids"] == ["magicbricks:mb-1"]


async def test_dedup_run_scoped_to_sources():
    agg, db = _agg()
    a = _dup("nb-1", "nobroker")
    b = _dup("mb-1", "magicbricks", title="NoBroker PG - Baner, Pune", rent=9700)
    db[ra.LISTINGS_COL].docs["nobroker:nb-1"] = {**a, "_id": 1}
    db[ra.LISTINGS_COL].docs["magicbricks:mb-1"] = {**b, "_id": 2}
    # scoped to nobroker only → the magicbricks dup is never touched
    marked = await agg.dedup_run(["nobroker"])
    assert marked == 0
    assert db[ra.LISTINGS_COL].docs["magicbricks:mb-1"]["status"] == "active"


async def test_mark_stale_marks_old_docs():
    agg, db = _agg()
    await agg.run("yulu")
    for d in db[ra.LISTINGS_COL].docs.values():
        d["last_fetched_at"] = ra._utcnow() - timedelta(hours=ra.STALE_AFTER_HOURS + 1)
    marked = await agg.mark_stale()
    assert marked >= 1
    assert all(d["status"] == "stale" for d in db[ra.LISTINGS_COL].docs.values())


async def test_find_nearby_uses_geo_query():
    agg, db = _agg()
    await agg.run("yulu")
    docs = await agg.find_nearby(12.9716, 77.5946, radius_m=5000,
                                 category="vehicle")
    assert len(docs) >= 1
    col = db[ra.LISTINGS_COL]
    last = col.find_filters[-1]
    assert "geo" in last and "$near" in last["geo"]
    assert last["category"] == "vehicle"
    # bad coords → no query issued, empty result
    assert await agg.find_nearby(None, None) == []


async def test_find_nearby_bad_coords():
    agg, _ = _agg()
    assert await agg.find_nearby(None, 77.5) == []
    assert await agg.find_nearby(12.9, None) == []


async def test_status_reports_sources_and_meta(monkeypatch):
    agg, db = _agg()
    await agg.run("oyo")
    monkeypatch.delenv("BOOKING_COM_AFFILIATE_ID", raising=False)
    st = await agg.status()
    assert st["last_run_at"]
    assert st["total_active"] > 0
    names = {s["source"] for s in st["sources"]}
    assert names == set(ra.ADAPTERS_BY_NAME)
    bc = next(s for s in st["sources"] if s["source"] == "booking_com")
    assert bc["needs_api_key"] is True
    ow = next(s for s in st["sources"] if s["source"] == "oyo")
    assert ow["needs_api_key"] is False
    # refresh_stats persisted the per-source counts
    meta = db[ra.SOURCE_META].docs.get("aggregator")
    assert meta and meta["by_source"]["oyo"] >= 2


async def test_scheduler_flag_disabled(monkeypatch):
    monkeypatch.setenv("RENTALS_AGGREGATOR_CRON_ENABLED", "0")
    ra.stop_rentals_aggregator_scheduler()
    ra.start_rentals_aggregator_scheduler()
    assert ra._rentals_scheduler is None


# ─── Admin router ────────────────────────────────────────────────────────
def _admin_app():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    import core.deps as cdeps
    app = FastAPI()
    app.include_router(ra.admin_router)
    return app, TestClient(app), cdeps


def test_admin_requires_super_admin():
    app, client, cdeps = _admin_app()
    app.dependency_overrides[cdeps.get_current_user] = lambda: {"role": "admin"}
    r = client.get("/admin/rentals-aggregator/status")
    assert r.status_code == 403


def test_admin_status_and_toggle_and_run():
    app, client, cdeps = _admin_app()
    db = FakeDB()
    fa = ra.RentalsAggregator(db=db)
    app.dependency_overrides[cdeps.get_current_user] = lambda: {"role": "super_admin"}
    import services.rentals_aggregator as mod
    orig = mod.aggregator
    mod.aggregator = fa
    try:
        r = client.get("/admin/rentals-aggregator/status")
        assert r.status_code == 200
        body = r.json()
        assert body["collection"] == "rental_listings"
        assert len(body["sources"]) == 16

        r = client.patch("/admin/rentals-aggregator/sources/bounce",
                         json={"enabled": False})
        assert r.status_code == 200
        assert db[ra.SOURCE_META].docs["bounce"]["enabled"] is False

        r = client.patch("/admin/rentals-aggregator/sources/nope",
                         json={"enabled": True})
        assert r.status_code == 404

        r = client.post("/admin/rentals-aggregator/run?source=bounce")
        assert r.status_code == 200
        assert r.json()["results"][0]["status"] == "disabled"

        r = client.post("/admin/rentals-aggregator/run?source=yulu")
        assert r.status_code == 200
        assert r.json()["results"][0]["fetched"] == 2

        r = client.post("/admin/rentals-aggregator/run?source=ghost")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
        mod.aggregator = orig
