"""
ECHO public surface contract tests.

Pins the public /echo data contract of the current main-line code:

1. Publication filtering — anonymous callers see only `status: "published"`
   records: draft/archived records never appear in GET /api/echo/showcases
   and GET /api/echo/showcases/{slug} answers 404 for them (no draft leak).
2. Legacy records — a record without lifecycle/badge fields still serializes
   and lists cleanly (no 500, no injected defaults).
3. Pass-through serializer contract — the backend does NOT inject a computed
   lifecycle state: a fresh record gains no `display_state` key, and an
   explicitly stored `display_state: null` (legacy/future field) passes
   through as null without altering the status inputs the frontend reads
   (event_status_badge / registration.enabled).
4. List/detail consistency — the same record exposes the same card fields
   (title, event_status_badge, hero_image_url) on both public surfaces.

Every inserted document is removed in a finally block; the three real local
records (snist / cbit / vnr-echo-2026) are never modified.
"""
import sys
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import app  # noqa: E402
from db import db  # noqa: E402


def _temp_doc(slug: str, **extra) -> dict:
    doc = {
        "slug": slug,
        "title": f"QA {slug}",
        "status": "published",
        "date": "January 01, 2026",
        "college": "QA College",
        "description": "Temporary public-surface contract test record.",
        "created_by": "qa-public-surface-test",
    }
    doc.update(extra)
    return doc


async def _insert(doc: dict):
    result = await db.echo_showcases.insert_one(doc)
    return result.inserted_id


async def _cleanup(ids):
    if ids:
        await db.echo_showcases.delete_many({"_id": {"$in": list(ids)}})


@pytest.mark.asyncio
async def test_public_list_excludes_unpublished_records():
    """Draft and archived records never appear in the anonymous public list."""
    draft_id = await _insert(_temp_doc("qa-pub-draft", status="draft", event_status_badge="Upcoming"))
    archived_id = await _insert(_temp_doc("qa-pub-archived", status="archived", event_status_badge="Upcoming"))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/echo/showcases")
            assert res.status_code == 200
            slugs = {item.get("slug") for item in res.json().get("items", [])}
            assert "qa-pub-draft" not in slugs
            assert "qa-pub-archived" not in slugs
    finally:
        await _cleanup([draft_id, archived_id])


@pytest.mark.asyncio
async def test_public_detail_404_for_unpublished_anonymous():
    """An unpublished record is indistinguishable from a missing one (404)."""
    draft_id = await _insert(_temp_doc("qa-pub-draft-2", status="draft", event_status_badge="Upcoming"))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/echo/showcases/qa-pub-draft-2")
            assert res.status_code == 404
    finally:
        await _cleanup([draft_id])


@pytest.mark.asyncio
async def test_legacy_record_without_badge_lists_cleanly():
    """A legacy record with no lifecycle/badge fields still lists (no 500)."""
    legacy_id = await _insert(_temp_doc("qa-pub-legacy"))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/echo/showcases")
            assert res.status_code == 200
            item = next(i for i in res.json()["items"] if i.get("slug") == "qa-pub-legacy")
            assert item["title"] == "QA qa-pub-legacy"
            # No badge key is invented by the backend — the frontend applies
            # its own documented fallback chain.
            assert "event_status_badge" not in item
    finally:
        await _cleanup([legacy_id])


@pytest.mark.asyncio
async def test_display_state_null_does_not_alter_public_payload():
    """`display_state: null` passes through as null; nothing is injected."""
    with_state_id = await _insert(
        _temp_doc("qa-pub-displaynull", event_status_badge="Upcoming", display_state=None)
    )
    control_id = await _insert(_temp_doc("qa-pub-displaycontrol", event_status_badge="Upcoming"))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/echo/showcases")
            assert res.status_code == 200
            items = {i.get("slug"): i for i in res.json()["items"]}

            with_state = items["qa-pub-displaynull"]
            assert with_state.get("display_state") is None  # stored null survives
            assert with_state["event_status_badge"] == "Upcoming"  # status inputs intact
            assert (with_state.get("registration") or {}).get("enabled") is not False

            control = items["qa-pub-displaycontrol"]
            # The serializer does not COMPUTE/inject lifecycle state.
            assert "display_state" not in control
    finally:
        await _cleanup([with_state_id, control_id])


@pytest.mark.asyncio
async def test_list_and_detail_are_consistent_for_the_same_record():
    """Card fields match between the public list and the public detail."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        list_res = await client.get("/api/echo/showcases")
        assert list_res.status_code == 200
        items = list_res.json()["items"]
        assert items, "local DB should contain published showcases"
        probe = items[0]
        slug = probe["slug"]

        detail_res = await client.get(f"/api/echo/showcases/{slug}")
        assert detail_res.status_code == 200
        detail = detail_res.json()

        for field in ("title", "event_status_badge", "hero_image_url", "college", "date"):
            assert detail.get(field) == probe.get(field), f"mismatch on {field!r} for {slug!r}"
