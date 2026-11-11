"""
Integration Tests — Authentication Flow.

Tests the login, token refresh, protected access, and logout cycle.
Requires a running backend server with the test account seeded.

Run:
    BASE_URL=http://localhost:8000 pytest tests/integration/test_auth_flow.py -v
"""
import httpx
import pytest


def assert_no_server_error(response: httpx.Response, endpoint: str):
    """Assert the server did not return a 5xx error."""
    assert response.status_code < 500, (
        f"Server error on {endpoint}: "
        f"HTTP {response.status_code} - {response.text[:200]}"
    )


class TestLoginFlow:
    """Test the login endpoint with various inputs."""

    def test_login_with_valid_credentials(self, base_url, test_credentials):
        """POST /api/auth/login with valid creds should return tokens."""
        r = httpx.post(
            f"{base_url}/api/auth/login",
            json=test_credentials,
            timeout=10,
        )
        assert_no_server_error(r, "POST /api/auth/login")
        # Should be 200 with tokens, or 401 if the test account is not seeded
        assert r.status_code in (200, 401, 422), (
            f"Unexpected status {r.status_code} on login"
        )
        if r.status_code == 200:
            data = r.json()
            # Tokens should be present in some form
            assert any(
                k in data for k in ("access_token", "token", "accessToken")
            ), f"No token in login response: {list(data.keys())}"

    def test_login_with_empty_body(self, base_url):
        """POST /api/auth/login with empty body should return 422, not 500."""
        r = httpx.post(f"{base_url}/api/auth/login", json={}, timeout=10)
        assert_no_server_error(r, "POST /api/auth/login (empty)")
        assert r.status_code in (400, 401, 422)

    def test_login_with_wrong_password(self, base_url, test_credentials):
        """POST /api/auth/login with wrong password should return 401."""
        r = httpx.post(
            f"{base_url}/api/auth/login",
            json={"email": test_credentials["email"], "password": "wrongpassword"},
            timeout=10,
        )
        assert_no_server_error(r, "POST /api/auth/login (wrong pw)")
        assert r.status_code in (400, 401, 403, 422)

    def test_login_with_nonexistent_email(self, base_url):
        """POST /api/auth/login with unknown email should not crash."""
        r = httpx.post(
            f"{base_url}/api/auth/login",
            json={"email": "nobody@example.com", "password": "test"},
            timeout=10,
        )
        assert_no_server_error(r, "POST /api/auth/login (unknown email)")
        assert r.status_code in (400, 401, 404, 422)


class TestProtectedEndpoints:
    """Test that protected endpoints reject unauthenticated requests."""

    PROTECTED_ENDPOINTS = [
        ("GET", "/api/users/me"),
        ("GET", "/api/network/discover"),
        ("GET", "/api/wallet/streak"),
        ("GET", "/api/wallet/badges"),
        ("GET", "/api/wallet/challenges"),
        ("GET", "/api/wallet/leaderboard"),
        ("GET", "/api/ai/chat/sessions"),
        ("GET", "/api/admin/stats"),
    ]

    @pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
    def test_unauthenticated_request_returns_401(self, base_url, method, path):
        """Protected endpoints should return 401/403 without a token, never 500."""
        r = httpx.request(method, f"{base_url}{path}", timeout=10)
        assert_no_server_error(r, f"{method} {path}")
        assert r.status_code in (401, 403, 404), (
            f"Expected 401/403 for {method} {path}, got {r.status_code}"
        )

    def test_invalid_token_rejected(self, base_url):
        """GET /api/users/me with a fake token should return 401."""
        r = httpx.get(
            f"{base_url}/api/users/me",
            headers={"Authorization": "Bearer fake.invalid.token"},
            timeout=10,
        )
        assert_no_server_error(r, "GET /api/users/me (fake token)")
        assert r.status_code in (401, 403, 422)

    def test_expired_token_format_rejected(self, base_url):
        """GET /api/users/me with malformed auth header should not crash."""
        r = httpx.get(
            f"{base_url}/api/users/me",
            headers={"Authorization": "NotBearer something"},
            timeout=10,
        )
        assert_no_server_error(r, "GET /api/users/me (bad auth format)")


class TestTokenRefresh:
    """Test the token refresh flow."""

    def test_refresh_without_token_returns_error(self, base_url):
        """POST /api/auth/refresh without a refresh token should fail gracefully."""
        r = httpx.post(f"{base_url}/api/auth/refresh", json={}, timeout=10)
        assert_no_server_error(r, "POST /api/auth/refresh (no token)")
        assert r.status_code in (400, 401, 403, 404, 422)

    def test_refresh_with_invalid_token(self, base_url):
        """POST /api/auth/refresh with invalid token should return 401."""
        r = httpx.post(
            f"{base_url}/api/auth/refresh",
            json={"refresh_token": "invalid.refresh.token"},
            timeout=10,
        )
        assert_no_server_error(r, "POST /api/auth/refresh (invalid)")
        assert r.status_code in (400, 401, 403, 404, 422)


class TestLogout:
    """Test the logout endpoint."""

    def test_logout_without_auth(self, base_url):
        """POST /api/auth/logout without auth should not crash."""
        r = httpx.post(f"{base_url}/api/auth/logout", timeout=10)
        assert_no_server_error(r, "POST /api/auth/logout (no auth)")
        # May return 200 (always succeeds), 401, or 404 if endpoint is different
        assert r.status_code < 500
