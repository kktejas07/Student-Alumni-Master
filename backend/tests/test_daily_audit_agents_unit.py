"""
Unit tests for 24-Hour Autonomous Operations & Audit Swarm:
  1. Job 1: Unit Test & Regression Auditor Agent
  2. Job 2: Platform Analytics & Growth Intelligence Agent
  3. Job 3: Debugging Logs & System Anomaly Inspector Agent
  4. Daily Dossier Compilation
"""
import pytest
from services.agents.daily_audit_agents import (
    daily_audit_service,
    DailyDossierResponse,
    UnitTestAuditReport,
    AnalyticsAuditReport,
    LogAnomalyAuditReport,
)

@pytest.mark.anyio
async def test_unit_test_auditor_skips_unless_enabled(monkeypatch):
    """Without DAILY_AUDIT_RUN_TESTS=1 the job must say SKIPPED, never a fake pass count."""
    monkeypatch.delenv("DAILY_AUDIT_RUN_TESTS", raising=False)
    res: UnitTestAuditReport = await daily_audit_service.audit_unit_tests()
    assert res.total_tests == 0 and res.passed == 0 and res.failed == 0
    assert res.regression_status.startswith("SKIPPED")
    assert res.grade == "N/A"

@pytest.mark.anyio
async def test_analytics_auditor_reports_zeros_without_db():
    res: AnalyticsAuditReport = await daily_audit_service.audit_platform_analytics(db=None)
    assert res.dau_active_users == 0
    assert res.new_users_24h == 0
    assert res.system_growth_score == 0.0
    assert res.top_career_tracks == ["(no database connection)"]

@pytest.mark.anyio
async def test_log_anomaly_auditor_is_unknown_without_logs():
    res: LogAnomalyAuditReport = await daily_audit_service.audit_debugging_logs(db=None)
    assert res.total_log_entries_analyzed == 0
    assert res.critical_exceptions_count == 0
    assert res.system_stability_index.startswith("UNKNOWN")
    assert len(res.root_cause_analysis) >= 1

@pytest.mark.anyio
async def test_daily_dossier_compilation(monkeypatch):
    monkeypatch.delenv("DAILY_AUDIT_RUN_TESTS", raising=False)
    dossier: DailyDossierResponse = await daily_audit_service.run_24hr_dossier(db=None)
    assert dossier.dossier_id.startswith("DOSSIER-")
    # Nothing was measured, so the verdict must not claim health.
    assert dossier.health_status == "UNKNOWN"
    assert "not run here" in dossier.executive_verdict
    assert dossier.unit_tests.total_tests == 0
