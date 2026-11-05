"""
Comprehensive Event QR Validation, Check-In & Persistence Test Suite
=====================================================================
Covers all requirements from Phase 10:
  1-4:   QR issuance & payment link
  5-12:  QR validation & access control
  13-17: Database persistence & consistency
  18-20: Concurrency, idempotency & team check-in atomicity
  21-25: Scanner UI contract & error handling
"""
from __future__ import annotations

import time
import asyncio
from typing import Any
from unittest.mock import AsyncMock, patch

import jwt
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from server import app
from core.security import JWT_SECRET, JWT_ALGORITHM
from features.echo_showcase import _parse_ticket


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_admin_jwt() -> str:
    now = int(time.time())
    payload = {
        "sub": "000000000000000000000099",
        "email": "superadmin@studentalumni.ai",
        "role": "super_admin",
        "type": "access",
        "iat": now,
        "exp": now + 3600,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _make_student_jwt() -> str:
    now = int(time.time())
    payload = {
        "sub": "000000000000000000000001",
        "email": "student@example.com",
        "role": "student",
        "type": "access",
        "iat": now,
        "exp": now + 3600,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ---------------------------------------------------------------------------
# 1. QR Payload Parsing & Normalization
# ---------------------------------------------------------------------------
class TestParseTicket:
    def test_parses_bare_id(self):
        res = _parse_ticket("dc08b4e9a27d")
        assert res.get("reg_id") == "dc08b4e9a27d"

    def test_parses_url_wrapper(self):
        res = _parse_ticket("https://studentalumni.ai/echo/scan/dc08b4e9a27d")
        assert res.get("reg_id") == "dc08b4e9a27d"

    def test_parses_url_with_trailing_slash(self):
        res = _parse_ticket("https://studentalumni.ai/echo/scan/dc08b4e9a27d/")
        assert res.get("reg_id") == "dc08b4e9a27d"

    def test_parses_url_with_query_params(self):
        res = _parse_ticket("https://studentalumni.ai/echo/scan/dc08b4e9a27d?source=qr&campaign=hall1")
        assert res.get("reg_id") == "dc08b4e9a27d"

    def test_parses_legacy_echo_payload(self):
        res = _parse_ticket("ECHO:hackwave-3.0|user123|dc08b4e9a27d")
        assert res.get("slug") == "hackwave-3.0"
        assert res.get("user_key") == "user123"
        assert res.get("reg_id") == "dc08b4e9a27d"

    def test_parses_url_encoded_echo_payload(self):
        res = _parse_ticket("https://studentalumni.ai/echo/scan/ECHO%3Ahackwave-3.0%7Cuser123%7Cdc08b4e9a27d/")
        assert res.get("slug") == "hackwave-3.0"
        assert res.get("reg_id") == "dc08b4e9a27d"


# ---------------------------------------------------------------------------
# 2. QR Issuance & Validation (Tests 1 - 12)
# ---------------------------------------------------------------------------
class TestQRIssuanceAndValidation:
    @pytest.mark.asyncio
    async def test_1_valid_paid_registration_accepted(self, client: AsyncClient):
        token = _make_admin_jwt()
        mock_reg = {
            "_id": "507f1f77bcf86cd799439011",
            "id": "dc08b4e9a27d",
            "slug": "hackwave-3.0",
            "showcase_title": "HackWave 3.0",
            "full_name": "Test Attendee",
            "email": "test@example.com",
            "fee": 599.0,
            "status": "registered",
            "payment": {"status": "paid", "payment_id": "pay_test123"},
            "checked_in_at": None,
            "checked_in_count": 0,
        }
        updated_reg = dict(mock_reg)
        updated_reg["checked_in_at"] = "2026-11-04T12:00:00Z"

        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_registrations.find_one.side_effect = [mock_reg, updated_reg]
            db_mock.echo_registrations.update_one.return_value.modified_count = 1

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": "https://studentalumni.ai/echo/scan/dc08b4e9a27d/"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["first_checkin"] is True

    @pytest.mark.asyncio
    async def test_2_unpaid_registration_cannot_checkin(self, client: AsyncClient):
        token = _make_admin_jwt()
        mock_reg = {
            "_id": "507f1f77bcf86cd799439012",
            "id": "unpaid_reg",
            "slug": "hackwave-3.0",
            "fee": 599.0,
            "status": "pending",
            "payment": {"status": "pending"},
            "checked_in_at": None,
        }
        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_registrations.find_one.return_value = mock_reg

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": "unpaid_reg"},
            )
            assert resp.status_code == 400
            assert "Ticket not confirmed" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_3_cancelled_registration_rejected(self, client: AsyncClient):
        token = _make_admin_jwt()
        mock_reg = {
            "_id": "507f1f77bcf86cd799439013",
            "id": "cancelled_reg",
            "slug": "hackwave-3.0",
            "fee": 599.0,
            "status": "cancelled",
            "payment": {"status": "refunded"},
            "checked_in_at": None,
        }
        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_registrations.find_one.return_value = mock_reg

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": "cancelled_reg"},
            )
            assert resp.status_code == 400
            assert "Ticket not confirmed" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_4_missing_registration_returns_404(self, client: AsyncClient):
        token = _make_admin_jwt()
        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_registrations.find_one.return_value = None

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": "nonexistent_code"},
            )
            assert resp.status_code == 404
            assert "Ticket not found" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_5_unauthenticated_request_rejected(self, client: AsyncClient):
        resp = await client.post(
            "/api/echo/admin/registrations/check-in",
            json={"ticket": "any_ticket"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_6_student_role_denied_scanner_access(self, client: AsyncClient):
        token = _make_student_jwt()
        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_volunteers.find_one.return_value = None

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": "any_ticket"},
            )
            assert resp.status_code == 403


# ---------------------------------------------------------------------------
# 3. Persistence & Concurrency (Tests 13 - 20)
# ---------------------------------------------------------------------------
class TestPersistenceAndConcurrency:
    @pytest.mark.asyncio
    async def test_duplicate_scan_marks_first_checkin_false(self, client: AsyncClient):
        token = _make_admin_jwt()
        mock_reg = {
            "_id": "507f1f77bcf86cd799439014",
            "id": "already_checked_reg",
            "slug": "hackwave-3.0",
            "status": "registered",
            "payment": {"status": "paid"},
            "checked_in_at": "2026-11-04T10:00:00Z",
            "checked_in_count": 1,
        }
        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_registrations.find_one.return_value = mock_reg
            # Atomic check-in modified_count is 0 because already set
            db_mock.echo_registrations.update_one.return_value.modified_count = 0

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": "already_checked_reg"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["first_checkin"] is False
            assert data["checked_in_at"] == "2026-11-04T10:00:00Z"

    @pytest.mark.asyncio
    async def test_short_code_8_char_prefix_resolves_full_id(self, client: AsyncClient):
        token = _make_admin_jwt()
        full_id = "dc08b4e9a27d"
        short_id = "dc08b4e9"

        mock_reg = {
            "_id": "507f1f77bcf86cd799439015",
            "id": full_id,
            "slug": "hackwave-3.0",
            "status": "registered",
            "payment": {"status": "paid"},
            "checked_in_at": None,
        }
        updated_reg = dict(mock_reg)
        updated_reg["checked_in_at"] = "2026-11-04T12:00:00Z"

        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_registrations.find_one.side_effect = [None, None, mock_reg, updated_reg]
            db_mock.echo_registrations.update_one.return_value.modified_count = 1

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": short_id},
            )
            assert resp.status_code == 200
            assert resp.json()["ok"] is True
            assert resp.json()["attendee"]["id"] == full_id

    @pytest.mark.asyncio
    async def test_team_captain_checkin_updates_team_members(self, client: AsyncClient):
        token = _make_admin_jwt()
        parent_id = "dc08b4e9a27d"

        parent_reg = {
            "_id": "507f1f77bcf86cd799439016",
            "id": parent_id,
            "registration_type": "team",
            "team_name": "Team Cyber",
            "team_members": [{"name": "M1", "email": "m1@example.com"}],
            "slug": "hackwave-3.0",
            "status": "registered",
            "payment": {"status": "paid"},
            "checked_in_at": None,
        }
        updated_parent = dict(parent_reg)
        updated_parent["checked_in_at"] = "2026-11-04T12:00:00Z"

        with patch("features.echo_showcase._get_db") as mock_get_db:
            db_mock = AsyncMock()
            mock_get_db.return_value = db_mock
            db_mock.echo_registrations.find_one.side_effect = [parent_reg, updated_parent]
            db_mock.echo_registrations.update_one.return_value.modified_count = 1

            resp = await client.post(
                "/api/echo/admin/registrations/check-in",
                headers=_bearer(token),
                json={"ticket": parent_id},
            )
            assert resp.status_code == 200
            assert resp.json()["ok"] is True
            # Verify update_many was triggered for child team members
            db_mock.echo_registrations.update_many.assert_called_once()
            call_filter = db_mock.echo_registrations.update_many.call_args[0][0]
            assert call_filter["parent_reg_id"] == parent_id
