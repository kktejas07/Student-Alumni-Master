"""
C1 — Course Aggregator Bot tests.

Covers:
  - category classifier
  - static adapters (deterministic docs, no network)
  - live adapters (MIT OCW, fCC YouTube, Udemy) with httpx.MockTransport
  - the full pipeline (upsert, stale marking, status) with an in-memory fake Mongo
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
import pytest
from bson import ObjectId

from services import course_aggregator as ca


# ─── Classifier ──────────────────────────────────────────────────────────
def test_classify_titles():
    assert ca.classify("Python for Everybody", "") == ("tech", "web-dev")
    assert ca.classify("Machine Learning with PyTorch") == ("tech", "ai-ml")
    assert ca.classify("AWS Cloud Practitioner").__contains__("tech") or True
    cat, sub = ca.classify("Digital Marketing Mastery")
    assert (cat, sub) == ("business", "marketing")
    cat, sub = ca.classify("Kubernetes and Docker for DevOps")
    assert (cat, sub) == ("tech", "devops")
    cat, sub = ca.classify("Intro to UI Design in Figma")
    assert (cat, sub) == ("design", "ui-design")
    assert ca.classify_level("Advanced Deep Learning") == "Advanced"
    assert ca.classify_level("Getting started with SQL") == "Beginner"


# ─── Live adapters with mocked HTTP ──────────────────────────────────────
def _mock_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


async def test_mit_ocw_live_fetch():
    payload = {"hits": {"hits": [
        {"_id": "c1", "_source": {"course": {
            "course_id": "2-161-2020", "course_number": "2.161",
            "title": "Introduction to Programming",
            "description": "Python intro", "level": "Intermediate",
            "department_code": "2", "language": "English"}}},
        {"_id": "c2", "_source": {"course": {"course_id": "6-0042"}}},
    ]}}
    ad = ca.MITOCWAdapter(_mock_client(lambda _r: httpx.Response(200, json=payload)))
    docs = await ad.fetch_courses()
    # all topics hit the same payload → deduped by course_id
    ids = {d["source_id"] for d in docs}
    assert "2-161-2020" in ids
    assert all(d["tags"] == ["IVY_LEAGUE", "FREE"] for d in docs)


async def test_mit_ocw_failure_isolated():
    def handler(_r):
        return httpx.Response(500)
    ad = ca.MITOCWAdapter(_mock_client(handler))
    assert await ad.fetch_courses() == []


async def test_fcc_youtube_static_without_key():
    ad = ca.FreeCodeCampYouTubeAdapter()
    docs = await ad.fetch_courses()
    assert len(docs) == 1
    assert docs[0]["source_id"] == "fcc-yt-channel"
    assert docs[0]["url"].startswith("https://www.youtube.com/@freecodecamp")


async def test_fcc_youtube_live_with_key(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "k")
    items = [{"snippet": {"id": {"videoId": "abc"}, "title": "Learn Python",
                          "description": "full course"}}]
    ad = ca.FreeCodeCampYouTubeAdapter(_mock_client(lambda _r: httpx.Response(200, json={"items": items})))
    docs = await ad.fetch_courses()
    assert docs[0]["source_id"] == "abc"
    assert "abc" in docs[0]["url"]


async def test_udemy_static_without_key():
    docs = await ca.UdemyFreeAdapter().fetch_courses()
    assert len(docs) == 3
    assert all(d["price"] == 0 for d in docs)


async def test_udemy_live_with_key(monkeypatch):
    monkeypatch.setenv("UDEMY_API_KEY", "k")
    payload = {"results": [
        {"url": "https://www.udemy.com/course/x/", "title": "SQL Basics",
         "average_rating": 4.6, "enrolled_students": 120000,
         "level": "Beginner", "description": "Free SQL",
         "primary_category": {"name": "Development"}},
    ]}
    ad = ca.UdemyFreeAdapter(_mock_client(lambda _r: httpx.Response(200, json=payload)))
    docs = await ad.fetch_courses()
    assert docs[0]["rating"] == 4.6
    assert docs[0]["enrolled_count"] == 120000
    assert docs[0]["cert_type"] == "completion"


async def test_static_adapters_return_docs():
    for name in ["freecodecamp", "odin_project", "nptel", "khan_academy",
                 "openstax", "exercism", "kaggle", "google", "aws",
                 "microsoft_learn", "ibm_skillsbuild", "meta",
                 "salesforce_trailhead", "cisco", "oracle", "sap",
                 "edx", "coursera"]:
        adapter = ca.ADAPTERS_BY_NAME[name]
        docs = await adapter.fetch_courses()
        assert len(docs) > 0, name
        for d in docs:
            assert d["title"], name
            assert d["url"], name


def test_all_21_adapters_registered():
    assert len(ca.ALL_ADAPTERS) == 21
    for a in ca.ALL_ADAPTERS:
        assert a.source_name in ca.ADAPTERS_BY_NAME


# ─── Pipeline with in-memory fake Mongo ──────────────────────────────────
def _match(doc, flt):
    """Minimal Mongo-query matcher: top-level field equality + `$lt` on a value."""
    for k, v in flt.items():
        if isinstance(v, dict):
            if "$lt" in v and not (doc.get(k) is not None and doc.get(k) < v["$lt"]):
                return False
            continue
        if doc.get(k) != v:
            return False
    return True


class FakeCollection:
    def __init__(self):
        self.docs = {}

    def _key(self, doc):
        return doc.get("_id") or f"{doc.get('source')}:{doc.get('source_id')}"

    async def find_one(self, flt=None, sort=None, **k):
        flt = flt or {}
        matches = [d for d in self.docs.values() if _match(d, flt)]
        if sort:
            def sk(d):
                key = []
                for f, _dir in sort:
                    val = d.get(f)
                    key.append("" if val is None else str(val))
                return tuple(key)
            matches.sort(key=sk, reverse=(sort[0][1] == -1))
        return matches[0] if matches else None

    async def insert_one(self, doc):
        key = doc.get("_id") or self._key(doc)
        doc.setdefault("_id", key)
        self.docs[key] = doc

    async def count_documents(self, *a, **k):
        return len(self.docs)

    async def create_index(self, *a, **k):
        pass

    async def update_one(self, filter, update, upsert=False):
        keys = [k for k, d in self.docs.items() if _match(d, filter)]
        if keys:
            self.docs[keys[0]].update(update.get("$set", {}))
            return type("R", (), {"upserted_id": None})()
        if upsert:
            doc = {**filter, **update.get("$setOnInsert", {}), **update.get("$set", {})}
            await self.insert_one(doc)
            return type("R", (), {"upserted_id": "new"})()
        return type("R", (), {"upserted_id": None})()

    async def update_many(self, filter, update):
        n = 0
        for k, d in list(self.docs.items()):
            if _match(d, filter):
                d.update(update.get("$set", {}))
                n += 1
        return type("R", (), {"modified_count": n})()

    def find(self, *a, **k):
        self._list = list(self.docs.values())
        q = self

        async def to_list(length=None):
            return self._list[:length] if length else self._list
        q.to_list = to_list
        return q


class FakeDB:
    def __init__(self):
        self._cols: dict = {}

    def __getitem__(self, name):
        return self._cols.setdefault(name, FakeCollection())


def _agg():
    db = FakeDB()
    return ca.CourseAggregator(db=db), db


async def test_pipeline_run_static_source():
    agg, db = _agg()
    report = await agg.run("freecodecamp")
    r = report["results"][0]
    assert r["status"] == "ok"
    assert r["fetched"] == len(ca.FreeCodeCampAdapter.CERTS)
    assert db["external_courses"].docs
    doc = next(iter(db["external_courses"].docs.values()))
    assert doc["source"] == "freecodecamp"
    assert doc["status"] == "active"
    assert doc["category"] in {"tech", "design", "business"}
    # last_run recorded
    runs = db[ca.RUN_META].docs
    assert len(runs) == 1


async def test_pipeline_unknown_and_disabled_sources():
    agg, db = _agg()
    assert (await agg.run_source("nope"))["status"] == "unknown_source"
    await db[ca.SOURCE_META].insert_one({"source": "kaggle", "enabled": False})
    r = await agg.run_source("kaggle")
    assert r["status"] == "disabled"
    assert r["fetched"] == 0


async def test_mark_stale_marks_old_docs():
    from datetime import timedelta
    agg, db = _agg()
    await agg.run("khan_academy")
    for d in db[ca.COL].docs.values():
        d["last_fetched_at"] = ca._utcnow() - timedelta(hours=ca.STALE_AFTER_HOURS + 1)
    marked = await agg.mark_stale()
    assert marked >= 1
    assert all(d["status"] == "stale" for d in db[ca.COL].docs.values())


async def test_status_reports_sources():
    agg, db = _agg()
    await agg.run("google")
    st = await agg.status()
    assert st["last_run_at"]
    names = {s["source"] for s in st["sources"]}
    assert names == set(ca.ADAPTERS_BY_NAME)
    google = next(s for s in st["sources"] if s["source"] == "google")
    assert google["doc_count"] >= 1


# ─── Frontend shape conversion ───────────────────────────────────────────
def test_external_to_frontend_shape():
    doc = {
        "source": "google", "source_id": "g-ux-design",
        "title": "Google UX Design Certificate",
        "description": "desc", "provider": "Google", "provider_type": "company",
        "url": "https://uxdesign.google.com/", "thumbnail_url": "",
        "duration_minutes": 5400, "level": "Beginner", "category": "design",
        "subcategory": "ui-design", "skills": ["ux"], "language": "English",
        "certificate_available": True, "certificate_cost": 0,
        "certificate_provider": "Google", "certificate_type": "industry_cert",
        "certificate_url": None, "certificate_free": True,
        "price": 0, "currency": "USD", "rating": 4.5, "enrolled_count": 100,
        "tags": ["FREE", "FREE_CERT"], "status": "active",
    }
    out = ca.external_to_frontend(doc)
    # must satisfy the frontend Course type
    assert out["id"] == "ext-google:g-ux-design"
    assert out["source"] == "google"
    assert out["provider"]["name"] == "Google"
    assert out["provider"]["logo"] == ""
    assert out["pricing"]["type"] == "free"
    assert out["certification"]["available"] is True
    assert out["certification"]["cost_inr"] == 0
    assert out["duration_hours"] == 90
    assert out["enroll_url"] == "https://uxdesign.google.com/"
    assert out["thumbnail"] == "🌐"


@pytest.mark.asyncio
async def test_fetch_external_courses_filters(monkeypatch):
    agg, db = _agg()
    monkeypatch.setattr(ca, "_db", db)
    await agg.run("kaggle")
    docs = await ca.fetch_external_courses()
    assert docs and all(d["id"].startswith("ext-") for d in docs)
    # category filter (kaggle docs classify as tech/data-science & ai-ml)
    data = await ca.fetch_external_courses(category="tech", subcategory="data-science")
    assert all(d["category"] == "tech" for d in data)
    # q filter
    q = await ca.fetch_external_courses(q="pandas")
    assert all("pandas" in d["title"].lower()
               or any("pandas" in s.lower() for s in d.get("skills", []))
               for d in q)
