"""
API Smoke Tests — verify critical endpoints don't crash (no 500s).

These tests hit the server without auth tokens. Expected responses:
- 200: public endpoints
- 401/403: protected endpoints (correct — auth required)
- 422: validation error (correct — missing required fields)
- 404: endpoint exists but resource not found (acceptable)

A 500 response indicates a server crash — that is a test failure.

Requirements:
    pip install httpx pytest

Run:
    BASE_URL=http://localhost:8000 pytest tests/api_smoke/ -v
"""
import httpx
import pytest


# Acceptable status codes (anything except 500+)
def assert_no_server_error(response: httpx.Response, endpoint: str):
    """Assert the server did not return a 5xx error."""
    assert response.status_code < 500, (
        f"Server error on {endpoint}: "
        f"HTTP {response.status_code} — {response.text[:200]}"
    )


class TestHealthEndpoints:
    """Health and root endpoints should always return 200."""

    def test_health(self, base_url):
        r = httpx.get(f"{base_url}/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("ok", "degraded")

    def test_api_health(self, base_url):
        r = httpx.get(f"{base_url}/api/health", timeout=10)
        assert r.status_code == 200

    def test_api_root(self, base_url):
        r = httpx.get(f"{base_url}/api/", timeout=10)
        assert_no_server_error(r, "GET /api/")


class TestAuthEndpoints:
    """Auth endpoints should return 401/422 without credentials, never 500."""

    def test_login_empty_body(self, base_url):
        r = httpx.post(f"{base_url}/api/auth/login", json={}, timeout=10)
        assert_no_server_error(r, "POST /api/auth/login")
        # 422 (validation) or 400 (bad request) expected
        assert r.status_code in (400, 422)

    def test_logout_no_token(self, base_url):
        r = httpx.post(f"{base_url}/api/auth/logout", timeout=10)
        assert_no_server_error(r, "POST /api/auth/logout")
        assert r.status_code in (401, 403, 422)

    def test_register_empty(self, base_url):
        r = httpx.post(f"{base_url}/api/auth/register", json={}, timeout=10)
        assert_no_server_error(r, "POST /api/auth/register")


class TestProtectedEndpoints:
    """Protected endpoints should return 401 without a token, never 500."""

    @pytest.mark.parametrize("endpoint", [
        "/api/users/me",
        "/api/dashboard/student-summary",
        "/api/wallet/streak",
        "/api/wallet/badges",
        "/api/wallet/challenges",
        "/api/wallet/leaderboard",
        "/api/ai/chat/sessions",
    ])
    def test_get_protected(self, base_url, endpoint):
        r = httpx.get(f"{base_url}{endpoint}", timeout=10)
        assert_no_server_error(r, f"GET {endpoint}")
        assert r.status_code in (401, 403)

    @pytest.mark.parametrize("endpoint", [
        "/api/ai/chat",
        "/api/admin/upload",
    ])
    def test_post_protected(self, base_url, endpoint):
        r = httpx.post(f"{base_url}{endpoint}", json={}, timeout=10)
        assert_no_server_error(r, f"POST {endpoint}")
        assert r.status_code in (401, 403, 422)


class TestPublicEndpoints:
    """Public or semi-public endpoints should return 200 or a non-500 error."""

    @pytest.mark.parametrize("endpoint", [
        "/api/events",
        "/api/certificates",
        "/api/blog/posts",
    ])
    def test_get_public(self, base_url, endpoint):
        r = httpx.get(f"{base_url}{endpoint}", timeout=10)
        assert_no_server_error(r, f"GET {endpoint}")

    def test_network_discover_no_auth(self, base_url):
        r = httpx.get(f"{base_url}/api/network/discover", timeout=10)
        assert_no_server_error(r, "GET /api/network/discover")
        assert r.status_code in (200, 401, 403)


class TestLeadAggregator:
    """Lead Aggregator endpoints should be protected but not crash."""

    @pytest.mark.parametrize("endpoint", [
        "/api/lead-aggregator/leads",
        "/api/lead-aggregator/analytics/overview",
    ])
    def test_la_protected(self, base_url, endpoint):
        r = httpx.get(f"{base_url}{endpoint}", timeout=10)
        assert_no_server_error(r, f"GET {endpoint}")


class TestAdminEndpoints:
    """Admin endpoints should return 401/403 without admin credentials."""

    @pytest.mark.parametrize("endpoint", [
        "/api/admin/stats",
        "/api/admin/users",
    ])
    def test_admin_protected(self, base_url, endpoint):
        r = httpx.get(f"{base_url}{endpoint}", timeout=10)
        assert_no_server_error(r, f"GET {endpoint}")
        assert r.status_code in (401, 403, 404)
