"""AG2 — persistent agent run history (agent_run_log collection)."""
import pytest

from server import app
from db import db
from services.agents.agent_run_log import start, finish, list_runs, COL


@pytest.mark.asyncio
async def test_run_log_lifecycle():
    run_id = await start("ag2_test_agent", "AG2 Test Agent", db)
    assert run_id is not None

    runs = await list_runs(limit=10, agent_id="ag2_test_agent", status="running", db=db)
    assert any(r["agent_id"] == "ag2_test_agent" and r["status"] == "running" for r in runs)

    await finish(run_id, "success", db, summary="ok", items_processed=3,
                 error=None, started_iso="2026-01-01T00:00:00+00:00")

    runs = await list_runs(limit=10, agent_id="ag2_test_agent", db=db)
    mine = [r for r in runs if r["agent_id"] == "ag2_test_agent" and r["status"] == "success"]
    assert mine
    assert mine[0]["summary"] == "ok"
    assert mine[0]["items_processed"] == 3
    assert mine[0]["duration_s"] is not None

    # failure path
    rid2 = await start("ag2_test_agent", "AG2 Test Agent", db)
    await finish(rid2, "failed", db, error="boom", started_iso="2026-01-01T00:00:00+00:00")
    runs = await list_runs(limit=10, agent_id="ag2_test_agent", status="failed", db=db)
    assert any(r["agent_id"] == "ag2_test_agent" and r["error"] == "boom" for r in runs)


@pytest.mark.asyncio
async def test_run_log_logging_never_breaks_when_db_unavailable():
    class _Broken:
        def __getitem__(self, name):
            raise RuntimeError("mongo down")

    assert await start("x", "X", _Broken()) is None
    await finish(None, "success")  # no-op, must not raise


@pytest.mark.anyio
async def test_run_log_endpoint_requires_admin():
    import httpx
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/admin/agents/run-log")
    assert res.status_code in (401, 403)


@pytest.mark.anyio
async def test_run_log_endpoint_lists_runs(monkeypatch):
    # Override the auth dependency (repo pattern, see test_financial_aggregator)
    # and stub the data layer: motor's client is loop-bound, so requests must
    # run on the session loop via httpx's ASGITransport, not TestClient.
    import httpx
    from core import deps as cdeps
    import services.agents.agent_run_log as run_log

    app.dependency_overrides[cdeps.get_current_user] = lambda: {"role": "admin"}
    captured = {}

    async def fake_list_runs(limit=50, agent_id=None, status=None, db=None):
        captured.update(limit=limit, agent_id=agent_id, status=status)
        return [
            {"agent_id": "a1", "status": "success", "summary": "ok",
             "started_at": "2026-01-01T00:00:00+00:00", "created_at": "2026-01-01"},
            {"agent_id": "a2", "status": "failed", "error": "boom"},
        ]

    monkeypatch.setattr(run_log, "list_runs", fake_list_runs)
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/admin/agents/run-log?limit=25&agent_id=a1&status=failed")
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["ok"] is True
        assert body["count"] == 2
        assert isinstance(body["runs"], list) and len(body["runs"]) == 2
        assert captured["limit"] == 25 and captured["agent_id"] == "a1" and captured["status"] == "failed"
    finally:
        app.dependency_overrides.pop(cdeps.get_current_user, None)


@pytest.mark.asyncio
async def test_scheduler_run_cycle_writes_run_log():
    from services.agents.agent_scheduler import AgentSchedulerService

    svc = AgentSchedulerService()
    results = await svc.run_cycle(db=db)
    assert results["talent_enrichment"]["ok"] is True

    runs = await list_runs(limit=50, db=db)
    ids = [r["agent_id"] for r in runs]
    for task_id in ("talent_enrichment", "jobs_sync", "data_hygiene", "qa_synthetic", "code_health"):
        assert task_id in ids, f"missing run-log entry for {task_id}"
    # statuses settled (no stuck 'running')
    statuses = [r["status"] for r in runs if r["agent_id"] in
                ("talent_enrichment", "jobs_sync", "data_hygiene", "qa_synthetic", "code_health")]
    assert all(s in ("success", "failed") for s in statuses)
