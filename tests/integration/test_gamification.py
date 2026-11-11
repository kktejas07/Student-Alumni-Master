"""
Integration Tests — Gamification Engine.

Tests the wallet gamification endpoints (streak, badges, challenges,
leaderboard). All require authentication; unauthenticated requests
should return 401.

Run:
    BASE_URL=http://localhost:8000 pytest tests/integration/test_gamification.py -v
"""
import httpx
import pytest


def assert_no_server_error(response: httpx.Response, endpoint: str):
    """Assert the server did not return a 5xx error."""
    assert response.status_code < 500, (
        f"Server error on {endpoint}: "
        f"HTTP {response.status_code} - {response.text[:200]}"
    )


class TestGamificationUnauthenticated:
    """All gamification endpoints should reject unauthenticated requests."""

    ENDPOINTS = [
        ("GET", "/api/wallet/streak"),
        ("GET", "/api/wallet/badges"),
        ("GET", "/api/wallet/challenges"),
        ("GET", "/api/wallet/leaderboard"),
        ("GET", "/api/wallet/leaderboard?period=weekly&scope=college"),
        ("GET", "/api/wallet/leaderboard?period=monthly&scope=college"),
    ]

    @pytest.mark.parametrize("method,path", ENDPOINTS)
    def test_requires_auth(self, base_url, method, path):
        """Gamification endpoints should return 401 without auth."""
        r = httpx.request(method, f"{base_url}{path}", timeout=10)
        assert_no_server_error(r, f"{method} {path}")
        assert r.status_code in (401, 403), (
            f"Expected 401/403 for {method} {path}, got {r.status_code}"
        )


class TestStreakRecovery:
    """Test streak recovery endpoint."""

    def test_recover_without_auth(self, base_url):
        """POST /api/wallet/streak/recover without auth should return 401."""
        r = httpx.post(f"{base_url}/api/wallet/streak/recover", timeout=10)
        assert_no_server_error(r, "POST /api/wallet/streak/recover")
        assert r.status_code in (401, 403)


class TestChallengeClaim:
    """Test challenge claim endpoint."""

    def test_claim_without_auth(self, base_url):
        """POST /api/wallet/challenges/test-id/claim without auth should return 401."""
        r = httpx.post(
            f"{base_url}/api/wallet/challenges/test-id/claim",
            timeout=10,
        )
        assert_no_server_error(r, "POST /api/wallet/challenges/test-id/claim")
        assert r.status_code in (401, 403, 404)


class TestLeaderboardParams:
    """Test leaderboard with various query parameters."""

    def test_invalid_period(self, base_url):
        """Leaderboard with invalid period should not crash."""
        r = httpx.get(
            f"{base_url}/api/wallet/leaderboard?period=invalid",
            timeout=10,
        )
        assert_no_server_error(r, "GET /api/wallet/leaderboard?period=invalid")
        # May return 401 (no auth), 422 (bad param), or 200 (lenient parsing)
        assert r.status_code < 500

    def test_missing_scope(self, base_url):
        """Leaderboard without scope param should not crash."""
        r = httpx.get(
            f"{base_url}/api/wallet/leaderboard?period=weekly",
            timeout=10,
        )
        assert_no_server_error(r, "GET /api/wallet/leaderboard (no scope)")
        assert r.status_code < 500
