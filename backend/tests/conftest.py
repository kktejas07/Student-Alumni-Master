import os
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://hiring-mvvm.preview.emergentagent.com"
).rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─── Shared async fixtures for in-process integration tests ──────────────────

@pytest.fixture
def anyio_backend():
    """Tell anyio (used by pytest-asyncio) to use asyncio."""
    return "asyncio"


@pytest.fixture
async def client():
    """In-process ASGI test client — no network, uses the real FastAPI app.
    Function-scoped so each test gets a fresh event loop context (prevents
    Motor's 'Event loop is closed' error when tests run in sequence).
    """
    try:
        from httpx import AsyncClient, ASGITransport
        from server import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
    except Exception:
        # Fallback: yield None so tests that require `client` fail gracefully
        # rather than erroring at collection time.
        yield None


@pytest.fixture
async def auth_client(client):
    """Register a fresh test user and return a client pre-loaded with their token."""
    if client is None:
        yield None
        return
    from datetime import datetime as _dt
    test_user = {
        "email": f"test_{_dt.now().timestamp()}@test.com",
        "password": "Test@123!pass",
        "full_name": "Test User",
        "role": "student",
    }
    resp = await client.post("/api/auth/register", json=test_user)
    if resp.status_code in (200, 201):
        token = resp.json().get("access_token")
        if token:
            client.headers = {"Authorization": f"Bearer {token}"}
    yield client


@pytest.fixture
async def admin_client():
    """Login as the seeded admin — uses its own independent client to avoid
    the Motor 'event loop closed' error that occurs when sharing a client
    across fixtures with different lifetimes.
    """
    try:
        from httpx import AsyncClient, ASGITransport
        from server import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/api/auth/login", json={
                "email": "admin@careerpath.app",
                "password": "Admin@12345",
            })
            if resp.status_code == 200:
                token = resp.json().get("access_token")
                if token:
                    ac.headers = {"Authorization": f"Bearer {token}"}
            yield ac
    except Exception:
        yield None


