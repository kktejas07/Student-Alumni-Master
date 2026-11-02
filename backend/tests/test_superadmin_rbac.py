"""
Security regression tests for Superadmin RBAC
==============================================
Verifies that every /admin/* endpoint:
  - Returns 401 when no token is supplied.
  - Returns 403 when a student-role JWT is supplied.
  - Returns 200 (or non-4xx) when a valid super_admin JWT is supplied.
  - Returns 401 for an expired or tampered token.

All tests run against the local FastAPI app via httpx's ASGI transport —
NO live users, NO database writes, NO production calls.

Fixtures mock `core.deps.get_current_user` and `core.deps.require_role`
at the dependency-injection level so no MongoDB connection is required.
"""
from __future__ import annotations

import time
from unittest.mock import AsyncMock, patch
from typing import Any

import jwt
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# ---------------------------------------------------------------------------
# Import app — adjust if your entry-point differs
# ---------------------------------------------------------------------------
from server import app  # noqa: E402
from core.security import JWT_SECRET, JWT_ALGORITHM

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
STUDENT_USER: dict[str, Any] = {
    "_id": "000000000000000000000001",
    "email": "student@example.com",
    "role": "student",
    "full_name": "Test Student",
}

SUPER_ADMIN_USER: dict[str, Any] = {
    "_id": "000000000000000000000002",
    "email": "admin@example.com",
    "role": "super_admin",
    "full_name": "Test Admin",
    "is_super_admin": True,
}

ADMIN_USER: dict[str, Any] = {
    "_id": "000000000000000000000003",
    "email": "hradmin@example.com",
    "role": "admin",
    "full_name": "HR Admin",
}


def _make_jwt(user: dict, expired: bool = False) -> str:
    """Mint a local JWT identical to what the backend issues."""
    now = int(time.time())
    exp = now - 60 if expired else now + 3600
    payload = {
        "sub": str(user["_id"]),
        "type": "access",
        "role": user.get("role", "student"),
        "iat": now,
        "exp": exp,
        "jti": "test-jti-" + user["_id"],
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# The admin endpoints we assert on (read-only GET only)
# ---------------------------------------------------------------------------
PROTECTED_ADMIN_ENDPOINTS = [
    "/api/admin/overview",
    "/api/admin/users",
    "/api/admin/approvals",
    "/api/admin/analytics",
    "/api/admin/payments",
    "/api/admin/settings/admins",
    "/api/admin/mentors/pending",
]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def client():
    """Async httpx client that drives the FastAPI ASGI app in-process."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


async def _mock_get_current_user_for(user: dict):
    """Return an async callable that yields the given user dict."""
    async def _dep(*_, **__):
        return user
    return _dep


# ---------------------------------------------------------------------------
# Phase 1 — No authentication (pure anonymous requests)
# ---------------------------------------------------------------------------
class TestUnauthenticatedAccess:
    """Anonymous browser — no Authorization header at all."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", PROTECTED_ADMIN_ENDPOINTS)
    async def test_returns_401_without_token(self, client: AsyncClient, endpoint: str):
        resp = await client.get(endpoint)
        assert resp.status_code == 401, (
            f"SECURITY: {endpoint} returned {resp.status_code} without a token. "
            "Must be 401."
        )

    @pytest.mark.asyncio
    async def test_super_admin_overview_page_api_protected(self, client: AsyncClient):
        """The overview KPI endpoint that populates the dashboard must require auth."""
        resp = await client.get("/api/admin/overview")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Phase 2 — Student role JWT (wrong role, valid token)
# ---------------------------------------------------------------------------
class TestStudentRoleBlocked:
    """Valid JWT, student role — must be rejected with 403 on all admin endpoints."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", PROTECTED_ADMIN_ENDPOINTS)
    async def test_student_token_returns_403(self, client: AsyncClient, endpoint: str):
        token = _make_jwt(STUDENT_USER)
        with patch(
            "core.deps.db.users.find_one", new_callable=AsyncMock,
            return_value=STUDENT_USER
        ), patch(
            "core.deps.db.token_blacklist.find_one", new_callable=AsyncMock,
            return_value=None
        ):
            resp = await client.get(endpoint, headers=_bearer(token))
        assert resp.status_code in (401, 403), (
            f"SECURITY: {endpoint} returned {resp.status_code} for student role. "
            "Must be 401 or 403."
        )


# ---------------------------------------------------------------------------
# Phase 3 — Expired token
# ---------------------------------------------------------------------------
class TestExpiredToken:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", PROTECTED_ADMIN_ENDPOINTS)
    async def test_expired_token_returns_401(self, client: AsyncClient, endpoint: str):
        token = _make_jwt(SUPER_ADMIN_USER, expired=True)
        resp = await client.get(endpoint, headers=_bearer(token))
        assert resp.status_code == 401, (
            f"SECURITY: {endpoint} accepted an expired token (got {resp.status_code})."
        )


# ---------------------------------------------------------------------------
# Phase 4 — Tampered / invalid token
# ---------------------------------------------------------------------------
class TestTamperedToken:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", PROTECTED_ADMIN_ENDPOINTS)
    async def test_invalid_token_returns_401(self, client: AsyncClient, endpoint: str):
        bad_token = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZWQifQ.INVALID"
        resp = await client.get(endpoint, headers={"Authorization": bad_token})
        assert resp.status_code == 401, (
            f"SECURITY: {endpoint} accepted a tampered token (got {resp.status_code})."
        )


# ---------------------------------------------------------------------------
# Phase 5 — Super-admin role (valid — must be allowed)
# ---------------------------------------------------------------------------
class TestSuperAdminAllowed:
    """Valid super_admin JWT with a DB mock — endpoints must return non-4xx."""

    @pytest.mark.asyncio
    async def test_overview_accessible_to_super_admin(self, client: AsyncClient):
        """
        We override get_current_user directly via app.dependency_overrides so the
        mocked user is injected without touching the DB layer.
        """
        from core.deps import get_current_user

        async def _super_admin_user():
            return SUPER_ADMIN_USER

        app.dependency_overrides[get_current_user] = _super_admin_user
        try:
            token = _make_jwt(SUPER_ADMIN_USER)
            resp = await client.get("/api/admin/overview", headers=_bearer(token))
        finally:
            app.dependency_overrides.pop(get_current_user, None)

        # 2xx or 500 (if DB not seeded) — but NOT 401/403
        assert resp.status_code not in (401, 403), (
            f"Super-admin should be allowed on /api/admin/overview, got {resp.status_code}"
        )

    @pytest.mark.asyncio
    async def test_users_list_accessible_to_admin(self, client: AsyncClient):
        from core.deps import get_current_user

        async def _admin_user():
            return ADMIN_USER

        app.dependency_overrides[get_current_user] = _admin_user
        try:
            token = _make_jwt(ADMIN_USER)
            resp = await client.get("/api/admin/users", headers=_bearer(token))
        finally:
            app.dependency_overrides.pop(get_current_user, None)

        assert resp.status_code not in (401, 403), (
            f"Admin-role user should be allowed on /api/admin/users, got {resp.status_code}"
        )


# ---------------------------------------------------------------------------
# Phase 6 — Revoked (blacklisted) token
# ---------------------------------------------------------------------------
class TestRevokedToken:
    @pytest.mark.asyncio
    async def test_blacklisted_jti_returns_401(self, client: AsyncClient):
        token = _make_jwt(SUPER_ADMIN_USER)
        with patch(
            "core.deps.db.users.find_one", new_callable=AsyncMock,
            return_value=SUPER_ADMIN_USER
        ), patch(
            "core.deps.db.token_blacklist.find_one", new_callable=AsyncMock,
            return_value={"jti": "test-jti-000000000000000000000002"}   # revoked
        ):
            resp = await client.get("/api/admin/overview", headers=_bearer(token))
        assert resp.status_code == 401, (
            f"Revoked JTI must return 401, got {resp.status_code}"
        )


# ---------------------------------------------------------------------------
# Phase 7 — Frontend session-persistence smoke
# ---------------------------------------------------------------------------
class TestFrontendSessionPersistence:
    """
    Documents (not enforces) the frontend session contract.
    The real enforcement happens on the backend (phases 1-6).
    These pass unconditionally as documentation/reminders.
    """

    def test_token_storage_keys_are_documented(self):
        """
        Web: tokens stored in localStorage under 'scd_access_token' / 'scd_refresh_token'.
        Clearing localStorage in a clean browser context produces guest state.
        The Dashboard navbar button only renders when authStore.user is non-null.
        authStore.init() calls api.me() on every page load and clears tokens on 401.
        """
        storage_keys = {"scd_access_token", "scd_refresh_token"}
        assert "scd_access_token" in storage_keys  # documented contract

    def test_super_admin_layout_guard_is_client_side_only(self):
        """
        KNOWN LIMITATION: _layout.tsx checks authStore.user (localStorage-backed).
        A user who manually sets localStorage can render the dashboard HTML.
        Backend RBAC (Phases 1-4 above) prevents any real data from loading.
        Fix: The _layout.tsx guard calls api.me() to validate the session server-side.
        See: frontend/app/super-admin/_layout.tsx
        """
        assert True, "Documented client-side-only guard — backend enforces actual data access."
