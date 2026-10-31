"""
Unit tests for the 30-minute Recurring Multi-Agent Scheduler:
  - Task status tracking
  - Cycle execution across 5 autonomous agents
  - Start/stop lifecycle management
"""
import pytest
from services.agents.agent_scheduler import (
    agent_scheduler,
    SchedulerStatusResponse,
)

@pytest.mark.anyio
async def test_agent_scheduler_cycle_execution(monkeypatch):
    # The code-health agent scans the repo and persists to Mongo; stub it so
    # this stays a unit test (no database, no filesystem walk).
    from services.agents import code_health_agent as _cha

    async def _fake_cycle(**_kw):
        return {"health_score": 100, "total_findings": 0}

    monkeypatch.setattr(_cha.code_health_agent, "execute_cycle", _fake_cycle)
    results = await agent_scheduler.run_cycle(db=None)
    assert "talent_enrichment" in results
    assert "jobs_sync" in results
    assert "data_hygiene" in results
    assert "qa_synthetic" in results
    assert "code_health" in results

    status: SchedulerStatusResponse = agent_scheduler.get_status()
    assert len(status.tasks) == 5
    assert status.last_cycle_at is not None
    assert status.next_cycle_at is not None

    for task in status.tasks:
        assert task.status in ["SUCCESS", "RUNNING"]
        assert task.total_runs >= 1
