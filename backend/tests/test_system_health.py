"""SA2 — system health endpoint + api_metrics ring buffer."""
import pytest
import httpx
from server import app
from core import api_metrics
from services import system_health


def test_api_metrics_window_and_percentiles():
    api_metrics._samples.clear()
    api_metrics.record_request(100.0, 200)
    api_metrics.record_request(300.0, 200)
    api_metrics.record_request(500.0, 500)
    m = api_metrics.api_metrics(24 * 3600)
    assert m["requests_24h"] == 3
    assert m["p50_response_ms"] == 300.0
    assert m["error_rate_pct"] == pytest.approx(100 / 3, abs=0.1)
    assert m["avg_response_ms"] == pytest.approx(300.0)


def test_api_metrics_empty_window():
    api_metrics._samples.clear()
    m = api_metrics.api_metrics(1)
    assert m["requests_24h"] == 0
    assert m["error_rate_pct"] == 0.0


@pytest.mark.anyio
async def test_system_health_shape():
    payload = await system_health.collect_system_health()
    for key in ("api", "database", "background_jobs", "storage", "uptime_seconds"):
        assert key in payload, f"missing {key}"
    assert payload["database"]["status"] in ("up", "down")
    if payload["database"]["status"] == "up":
        assert payload["database"]["connections_active"] >= 0
    assert isinstance(payload["uptime_seconds"], int)
    assert "aggregator_deals" in payload["background_jobs"]
    assert "email_queue" in payload["background_jobs"]


@pytest.mark.anyio
async def test_system_health_route_requires_admin():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/admin/system-health")
        # no admin JWT in CI -> 401 (route exists and is auth-gated)
        assert res.status_code in (401, 403)
