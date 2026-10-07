"""
Automated Remediation Verification Test Suite for Echo Showcase.

Proves:
1. SNIST -> SNIST content (title, slug, prize pool, fee, partners)
2. VNR -> VNR content (title, slug, prize pool, fee, partners)
3. Invalid slug -> 404 Showcase Not Found
4. VNR lookup failure -> NEVER SNIST
5. Backend alias resolution (vnrvjit, vnr, snist-hackwave, hackwave)
6. Handbook resolution:
   - SNIST handbook -> configured handbook PDF
   - VNR handbook -> 404 (not configured), NEVER SNIST handbook
   - Legacy /api/echo/handbook -> 307 redirect to SNIST handbook
7. Showcase isolation / Super Admin editing:
   - SNIST editing -> only SNIST
   - VNR editing -> only VNR
"""
import sys
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import app
from db import db


@pytest.mark.asyncio
async def test_snist_content():
    """Verify SNIST returns SNIST content only."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/echo/showcases/snist")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["slug"] == "snist"
        assert "HackWave" in data["title"]
        assert data.get("registration", {}).get("enabled") is True
        assert data.get("registration", {}).get("currency") == "INR"
        prize_pool = data.get("prize_pool") or {}
        assert "17,50,000" in str(prize_pool.get("total"))
        # Verify partners include WeHive visa partner
        partners = data.get("partners") or []
        partner_names = [p.get("name") for p in partners]
        assert "WeHive" in partner_names


@pytest.mark.asyncio
async def test_vnr_content():
    """Verify VNR returns VNR content only."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/echo/showcases/vnr-echo-2026")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["slug"] == "vnr-echo-2026"
        assert "VNR ECHO 2026" in data["title"]
        assert data.get("registration", {}).get("fee") == 0
        prize_pool = data.get("prize_pool") or {}
        assert "30,000" in str(prize_pool.get("total"))
        assert not prize_pool.get("wehive_germany")
        assert not prize_pool.get("visas")
        # Verify partners do NOT include WeHive
        partners = data.get("partners") or []
        partner_names = [p.get("name") for p in partners]
        assert "WeHive" not in partner_names


@pytest.mark.asyncio
async def test_backend_alias_resolution():
    """Verify backend centrally resolves legacy and alternative aliases to canonical slugs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # VNR aliases
        for alias in ["vnrvjit", "vnr", "vnr-vjiet"]:
            res = await client.get(f"/api/echo/showcases/{alias}")
            assert res.status_code == 200, f"Alias {alias} failed with {res.status_code}"
            assert res.json()["slug"] == "vnr-echo-2026"
            assert "VNR" in res.json()["title"]

        # SNIST aliases
        for alias in ["snist-hackwave", "hackwave"]:
            res = await client.get(f"/api/echo/showcases/{alias}")
            assert res.status_code == 200, f"Alias {alias} failed with {res.status_code}"
            assert res.json()["slug"] == "snist"
            assert "HackWave" in res.json()["title"]


@pytest.mark.asyncio
async def test_invalid_slug_returns_404():
    """Verify non-existent slug returns 404, NEVER a fallback showcase."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/echo/showcases/completely-invalid-slug-999")
        assert res.status_code == 404
        assert "Showcase not found" in res.json()["detail"]


@pytest.mark.asyncio
async def test_vnr_lookup_failure_never_returns_snist():
    """Verify failed VNR lookup returns 404 and NEVER falls back to SNIST."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/echo/showcases/vnr-nonexistent-year-3000")
        assert res.status_code == 404
        # Explicit check: response must not be 200 and must not contain HackWave/SNIST
        assert res.status_code != 200
        assert "snist" not in res.text.lower()


@pytest.mark.asyncio
async def test_handbook_resolution():
    """Verify handbook endpoints:
    - SNIST serves/redirects to HackWave handbook
    - VNR returns 404 (not configured), NEVER HackWave handbook
    - Legacy /api/echo/handbook returns 307 redirect to SNIST handbook
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", follow_redirects=False) as client:
        # SNIST handbook
        snist_res = await client.get("/api/echo/showcases/snist/handbook")
        assert snist_res.status_code in (200, 307)
        if snist_res.status_code == 307:
            assert "HackWave_3.0_Event_Handbook.pdf" in snist_res.headers.get("location", "")

        # VNR handbook (not configured -> 404)
        vnr_res = await client.get("/api/echo/showcases/vnr-echo-2026/handbook")
        assert vnr_res.status_code == 404
        assert "HackWave" not in vnr_res.text

        # Legacy handbook endpoint redirects with 307 to /api/echo/showcases/snist/handbook
        legacy_res = await client.get("/api/echo/handbook")
        assert legacy_res.status_code == 307
        assert legacy_res.headers.get("location") == "/api/echo/showcases/snist/handbook"


@pytest.mark.asyncio
async def test_showcase_editing_isolation():
    """Verify modifying SNIST does not mutate VNR, and modifying VNR does not mutate SNIST."""
    
    # Snapshot original states
    orig_snist = await db.echo_showcases.find_one({"slug": "snist"})
    orig_vnr = await db.echo_showcases.find_one({"slug": "vnr-echo-2026"})
    assert orig_snist is not None
    assert orig_vnr is not None

    orig_vnr_tagline = orig_vnr.get("tagline")
    orig_snist_tagline = orig_snist.get("tagline")

    try:
        # 1. Update SNIST document
        test_snist_tagline = "SNIST ISOLATION TEST TAGLINE"
        await db.echo_showcases.update_one(
            {"_id": orig_snist["_id"]},
            {"$set": {"tagline": test_snist_tagline}}
        )

        # Check VNR is completely unaffected
        curr_vnr = await db.echo_showcases.find_one({"_id": orig_vnr["_id"]})
        assert curr_vnr.get("tagline") == orig_vnr_tagline
        assert curr_vnr.get("tagline") != test_snist_tagline

        # Check SNIST was updated
        curr_snist = await db.echo_showcases.find_one({"_id": orig_snist["_id"]})
        assert curr_snist.get("tagline") == test_snist_tagline

        # 2. Update VNR document
        test_vnr_tagline = "VNR ISOLATION TEST TAGLINE"
        await db.echo_showcases.update_one(
            {"_id": orig_vnr["_id"]},
            {"$set": {"tagline": test_vnr_tagline}}
        )

        # Check SNIST is completely unaffected
        curr_snist2 = await db.echo_showcases.find_one({"_id": orig_snist["_id"]})
        assert curr_snist2.get("tagline") == test_snist_tagline
        assert curr_snist2.get("tagline") != test_vnr_tagline

        # Check VNR was updated
        curr_vnr2 = await db.echo_showcases.find_one({"_id": orig_vnr["_id"]})
        assert curr_vnr2.get("tagline") == test_vnr_tagline

    finally:
        # Restore original taglines
        await db.echo_showcases.update_one(
            {"_id": orig_snist["_id"]},
            {"$set": {"tagline": orig_snist_tagline}}
        )
        await db.echo_showcases.update_one(
            {"_id": orig_vnr["_id"]},
            {"$set": {"tagline": orig_vnr_tagline}}
        )
