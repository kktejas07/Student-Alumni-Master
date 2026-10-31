"""
ECHO content-remediation regression tests (Phase 4).

Covers:
1. Global ECHO settings — hero_config (Superadmin "ECHO Landing Hero" editor):
   - PUT requires admin auth (the public GET stays public)
   - a partial hero_config save merges per-key: previously saved hero keys
     (including unknown/future keys) survive
   - unrelated root settings (templates / branding / email footer) are never
     overwritten by a hero-only save
2. Saving global settings never modifies individual showcase records.
3. Events stay correctly scoped:
   - snist / vnr-echo-2026 / cbit each return their own distinct content
   - alias `vnrvjit` still resolves to vnr-echo-2026
   - the API never cross-injects another event's sponsors/partners

Every mutation is undone in a finally block, so the local settings doc is
restored to its exact pre-test state.
"""
import sys
from pathlib import Path

import jwt as pyjwt
import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import app  # noqa: E402
from db import db  # noqa: E402
from core.config import JWT_SECRET, JWT_ALGORITHM  # noqa: E402

SETTINGS_ID = "global"


def _admin_token() -> str:
    return pyjwt.encode(
        {"role": "super_admin", "email": "qa@local.test", "sub": "qa-remediation"},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def _admin_headers() -> dict:
    return {"Authorization": f"Bearer {_admin_token()}"}


@pytest.mark.asyncio
async def test_hero_settings_put_requires_admin_auth():
    """Write access to global settings stays admin-gated; GET stays public."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        get_res = await client.get("/api/echo/admin/settings")
        assert get_res.status_code == 200

        anon_put = await client.put(
            "/api/echo/admin/settings",
            json={"hero_config": {"title": "anonymous write"}},
        )
        assert anon_put.status_code in (401, 403)

        bad_token_put = await client.put(
            "/api/echo/admin/settings",
            headers={"Authorization": "Bearer not-a-real-token"},
            json={"hero_config": {"title": "bad token write"}},
        )
        assert bad_token_put.status_code in (401, 403)


@pytest.mark.asyncio
async def test_partial_hero_config_save_merges_per_key_and_preserves_root_settings():
    """A hero-only PUT merges into hero_config and never touches other keys."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        before = (await client.get("/api/echo/admin/settings")).json()
        backup = await db.echo_settings.find_one({"_id": SETTINGS_ID})
        try:
            # 1) First save — several keys, including a future/unknown key to
            #    prove the merge semantics preserve values the editor
            #    doesn't know about.
            res = await client.put(
                "/api/echo/admin/settings",
                headers=_admin_headers(),
                json={
                    "hero_config": {
                        "badge": "QA-BADGE",
                        "title": "QA hero title 1",
                        "cta_primary": "QA primary CTA",
                        "custom_future_key": "must-survive",
                    }
                },
            )
            assert res.status_code == 200, res.text

            first = (await client.get("/api/echo/admin/settings")).json()["hero_config"]
            assert first["badge"] == "QA-BADGE"
            assert first["title"] == "QA hero title 1"
            assert first["cta_primary"] == "QA primary CTA"

            # Unknown/future keys survive the merge in storage. (The GET
            # response projects a fixed whitelist of hero keys, so this is
            # asserted at the DB layer.)
            stored = await db.echo_settings.find_one({"_id": SETTINGS_ID})
            assert stored["hero_config"]["custom_future_key"] == "must-survive"

            # 2) Second save — only `title` changes. The rest must survive
            #    (this is what makes the editor safe for different pictures
            #    of the saved state on different devices).
            res = await client.put(
                "/api/echo/admin/settings",
                headers=_admin_headers(),
                json={"hero_config": {"title": "QA hero title 2"}},
            )
            assert res.status_code == 200, res.text

            second = (await client.get("/api/echo/admin/settings")).json()["hero_config"]
            assert second["title"] == "QA hero title 2"
            assert second["badge"] == "QA-BADGE"
            assert second["cta_primary"] == "QA primary CTA"

            stored2 = await db.echo_settings.find_one({"_id": SETTINGS_ID})
            assert stored2["hero_config"]["custom_future_key"] == "must-survive"

            # 3) Unrelated root settings were not sent and must be unchanged.
            after_root = (await client.get("/api/echo/admin/settings")).json()
            for key in (
                "default_ticket_template",
                "default_invoice_template",
                "default_email_style",
                "email_brand_color",
                "brand_name",
                "email_footer",
            ):
                assert after_root.get(key) == before.get(key), f"Root setting drifted: {key}"
        finally:
            if backup:
                await db.echo_settings.replace_one({"_id": SETTINGS_ID}, backup)
            else:
                await db.echo_settings.delete_one({"_id": SETTINGS_ID})


@pytest.mark.asyncio
async def test_settings_save_never_modifies_showcase_records():
    """Editing global hero settings must not touch echo_showcases documents."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        backup = await db.echo_settings.find_one({"_id": SETTINGS_ID})
        before_docs = await db.echo_showcases.find({}).to_list(length=None)
        before_sorted = sorted(before_docs, key=lambda d: str(d.get("_id")))
        try:
            res = await client.put(
                "/api/echo/admin/settings",
                headers=_admin_headers(),
                json={"hero_config": {"title": "QA hero title"}},
            )
            assert res.status_code == 200, res.text

            after_docs = await db.echo_showcases.find({}).to_list(length=None)
            after_sorted = sorted(after_docs, key=lambda d: str(d.get("_id")))
            assert after_sorted == before_sorted, "Showcase records changed while saving global settings"
        finally:
            if backup:
                await db.echo_settings.replace_one({"_id": SETTINGS_ID}, backup)
            else:
                await db.echo_settings.delete_one({"_id": SETTINGS_ID})


@pytest.mark.asyncio
async def test_events_remain_correctly_scoped():
    """SNIST / VNR / CBIT each return their own content; no cross-injection."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        snist = (await client.get("/api/echo/showcases/snist")).json()
        vnr = (await client.get("/api/echo/showcases/vnr-echo-2026")).json()
        cbit = (await client.get("/api/echo/showcases/cbit")).json()
        alias = (await client.get("/api/echo/showcases/vnrvjit")).json()

        # Distinct identities
        assert snist["slug"] == "snist" and "HackWave" in snist["title"]
        assert vnr["slug"] == "vnr-echo-2026" and "VNR" in vnr["title"]
        assert cbit["slug"] == "cbit"
        assert alias["slug"] == "vnr-echo-2026"

        # prize_pool reaches the frontend unmodified: dict for SNIST/VNR
        # (which the string-normalising pill must handle), stored shape for CBIT.
        assert isinstance(snist.get("prize_pool"), dict)
        assert isinstance(vnr.get("prize_pool"), dict)

        # The API never injects one event's sponsors into another's payload.
        vnr_names = [s.get("name") for s in (vnr.get("sponsors") or [])]
        snist_names = [s.get("name") for s in (snist.get("sponsors") or [])]
        assert "WeHive Consulting" not in vnr_names, "SNIST sponsor leaked into VNR payload"
        assert "Tech Corp" not in snist_names, "VNR sponsor placeholder leaked into SNIST payload"

        # Downloads are per-event too: neither payload carries the other
        # event's branded rows (endpoint-level isolation covered in the
        # first remediation suite).
        snist_dl = [str(d.get("title")) for d in (snist.get("downloads") or [])]
        vnr_dl = [str(d.get("title")) for d in (vnr.get("downloads") or [])]
        for t in snist_dl:
            assert "VNR ECHO" not in t, "VNR-branded download leaked into SNIST payload"
        for t in vnr_dl:
            assert "HackWave" not in t, "SNIST-branded download leaked into VNR payload"
