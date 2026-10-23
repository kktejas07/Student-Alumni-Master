"""
daily_audit_agents.py — 24-Hour Operations & Audit jobs

Every figure in the dossier is measured (pytest output, collection counts,
persisted log counts) or explicitly marked SKIPPED/UNKNOWN. Earlier versions
returned constant "60/60 passed, A+, zero errors" regardless of reality.

Executes 3 jobs every 24 hours:
  1. Unit Test & Regression Audit Agent (Continuous test validation & contract safety)
  2. Platform Analytics & Growth Intelligence Agent (DAU, bookings, certificates, talent KPIs)
  3. Debugging Logs & System Anomaly Inspector Agent (Log auditing, 500s/400s, slow query RCA)
"""
from __future__ import annotations
import asyncio
import logging
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("daily_audit_agents")

# ── Schemas ──
class UnitTestAuditReport(BaseModel):
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    duration_seconds: float = 0.0
    test_suites_audited: List[str]
    regression_status: str # "CLEAN - 0 Regressions Detected"
    grade: str = "N/A"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AnalyticsAuditReport(BaseModel):
    dau_active_users: int
    new_users_24h: int
    mentorship_sessions_completed: int
    certificates_issued_24h: int
    talent_profiles_scraped_24h: int
    job_applications_submitted: int
    system_growth_score: float # 0 - 100
    top_career_tracks: List[str]
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LogAnomalyAuditReport(BaseModel):
    total_log_entries_analyzed: int
    error_rate_percent: float # e.g. 0.02%
    critical_exceptions_count: int
    slow_endpoints_detected: List[str]
    root_cause_analysis: List[str]
    recommended_mitigations: List[str]
    system_stability_index: str # "Optimal (99.98% Healthy)"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DailyDossierResponse(BaseModel):
    dossier_id: str
    executed_at: str
    next_scheduled_run: str
    unit_tests: UnitTestAuditReport
    analytics: AnalyticsAuditReport
    debugging_logs: LogAnomalyAuditReport
    executive_verdict: str
    health_status: str = "UNKNOWN"  # HEALTHY | DEGRADED | UNKNOWN


class DailyAuditOrchestratorService:
    """Orchestrates 24-hour recurring audit jobs and stores daily audit dossiers."""

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._interval_seconds = 86400 # 24 Hours
        self._last_dossier: Optional[DailyDossierResponse] = None
        self._next_run_at: Optional[str] = None

    async def audit_unit_tests(self) -> UnitTestAuditReport:
        """Job 1: unit-test audit.

        Runs the real pytest suite in a subprocess when DAILY_AUDIT_RUN_TESTS=1
        (CI-style environments). Otherwise it reports SKIPPED rather than a
        fabricated pass count; the authoritative run is the CI workflow.
        """
        import os
        import re
        if (os.environ.get("DAILY_AUDIT_RUN_TESTS") or "0").strip() != "1":
            return UnitTestAuditReport(
                total_tests=0, passed=0, failed=0, duration_seconds=0.0,
                test_suites_audited=[],
                regression_status="SKIPPED — tests run in CI (set DAILY_AUDIT_RUN_TESTS=1 to run here)",
                grade="N/A",
            )
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        t0 = datetime.now(timezone.utc)
        try:
            proc = await asyncio.to_thread(
                subprocess.run,
                ["python", "-m", "pytest", "-q", "tests", "-p", "no:cacheprovider", "--timeout=600"],
                cwd=backend_dir, capture_output=True, text=True, timeout=900,
            )
            out = (proc.stdout or "") + (proc.stderr or "")
        except Exception as e:
            return UnitTestAuditReport(
                total_tests=0, passed=0, failed=0, duration_seconds=0.0, test_suites_audited=[],
                regression_status=f"ERROR — could not run pytest: {e}", grade="N/A",
            )
        dur = (datetime.now(timezone.utc) - t0).total_seconds()
        passed = int((re.search(r"(\d+) passed", out) or [0, 0])[1])
        failed = int((re.search(r"(\d+) failed", out) or [0, 0])[1])
        errors = int((re.search(r"(\d+) error", out) or [0, 0])[1])
        failed += errors
        total = passed + failed
        suites = sorted(set(re.findall(r"tests/(test_[\w]+\.py)", out)))
        pct = (passed / total * 100.0) if total else 0.0
        return UnitTestAuditReport(
            total_tests=total, passed=passed, failed=failed, duration_seconds=round(dur, 2),
            test_suites_audited=suites,
            regression_status=("CLEAN - 0 failures" if total and failed == 0 else f"{failed} failing"),
            grade=f"{pct:.0f}% pass rate" if total else "N/A",
        )

    async def audit_platform_analytics(self, db=None) -> AnalyticsAuditReport:
        """Job 2: platform analytics from real collection counts (24 h windows).

        Without a database every figure is 0 and the report says so; nothing
        is estimated.
        """
        now = datetime.now(timezone.utc)
        since_24h = now - timedelta(hours=24)
        since_7d = now - timedelta(days=7)
        since_24h_iso, since_7d_iso = since_24h.isoformat(), since_7d.isoformat()

        async def count(coll, flt):
            try:
                return int(await db[coll].count_documents(flt))
            except Exception:
                return 0

        if db is None:
            return AnalyticsAuditReport(
                dau_active_users=0, new_users_24h=0, mentorship_sessions_completed=0,
                certificates_issued_24h=0, talent_profiles_scraped_24h=0, job_applications_submitted=0,
                system_growth_score=0.0, top_career_tracks=["(no database connection)"],
            )

        # created_at / issued_at are stored as datetimes in some collections
        # and ISO strings in others; match both.
        def recent(field, dt, iso):
            return {"$or": [{field: {"$gte": dt}}, {field: {"$gte": iso}}]}

        total_users = await count("users", {})
        active_7d = await count("users", recent("last_login", since_7d, since_7d_iso))
        new_users = await count("users", recent("created_at", since_24h, since_24h_iso))
        sessions = await count("bookings", {"status": {"$in": ["completed", "done"]}, **recent("updated_at", since_24h, since_24h_iso)})
        certs = await count("certificates", recent("issued_at", since_24h, since_24h_iso))
        talents = await count("talent_pool", recent("created_at", since_24h, since_24h_iso))
        apps = await count("job_applications", recent("created_at", since_24h, since_24h_iso)) \
            or await count("applications", recent("created_at", since_24h, since_24h_iso))

        tracks: List[str] = []
        try:
            cur = db.users.aggregate([
                {"$match": {"career_path": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$career_path", "n": {"$sum": 1}}},
                {"$sort": {"n": -1}}, {"$limit": 3},
            ])
            tracks = [str(d["_id"]) for d in await cur.to_list(3)]
        except Exception:
            tracks = []

        # Growth score = share of all accounts active in the last 7 days (0-100).
        growth = round(active_7d / total_users * 100.0, 1) if total_users else 0.0
        return AnalyticsAuditReport(
            dau_active_users=active_7d, new_users_24h=new_users,
            mentorship_sessions_completed=sessions, certificates_issued_24h=certs,
            talent_profiles_scraped_24h=talents, job_applications_submitted=apps,
            system_growth_score=growth, top_career_tracks=tracks or ["(no career_path data)"],
        )

    async def audit_debugging_logs(self, db=None) -> LogAnomalyAuditReport:
        """Job 3: log anomaly audit from persisted request/audit logs.

        The app does not persist per-request logs to MongoDB today, so this
        reports what it can count (audit_logs entries, visitor error events)
        and labels the stability index UNKNOWN instead of "Optimal".
        """
        now = datetime.now(timezone.utc)
        since = now - timedelta(hours=24)
        entries = 0
        errors = 0
        slow: List[str] = []
        notes: List[str] = []
        if db is not None:
            try:
                entries = int(await db.audit_logs.count_documents({"$or": [{"ts": {"$gte": since}}, {"ts": {"$gte": since.isoformat()}}]}))
            except Exception:
                pass
            try:
                errors = int(await db.visitor_events.count_documents({
                    "event": {"$in": ["app_error", "api_error"]},
                    "$or": [{"created_at": {"$gte": since}}, {"created_at": {"$gte": since.isoformat()}}],
                }))
            except Exception:
                pass
            notes.append(f"{entries} audit_logs entries and {errors} client-reported errors in the last 24 h.")
        else:
            notes.append("No database connection; no logs analysed.")
        notes.append("Per-request server logs are not persisted to MongoDB; see the container logs / monitoring stack for 5xx rates and latency.")
        rate = round(errors / entries * 100.0, 3) if entries else 0.0
        index = "UNKNOWN (no persisted request logs)" if entries == 0 else ("Degraded" if errors else "No client errors reported")
        return LogAnomalyAuditReport(
            total_log_entries_analyzed=entries, error_rate_percent=rate,
            critical_exceptions_count=errors, slow_endpoints_detected=slow,
            root_cause_analysis=notes,
            recommended_mitigations=["Persist request logs (status, latency, path) or ship them to the monitoring stack so this audit can measure 5xx rate and slow endpoints."],
            system_stability_index=index,
        )

    async def run_24hr_dossier(self, db=None) -> DailyDossierResponse:
        """Runs all 3 jobs and compiles the comprehensive 24-hour audit dossier."""
        now_iso = datetime.now(timezone.utc).isoformat()
        self._next_run_at = (datetime.now(timezone.utc) + timedelta(seconds=self._interval_seconds)).isoformat()

        # Run the 3 jobs concurrently
        t_res, a_res, l_res = await asyncio.gather(
            self.audit_unit_tests(),
            self.audit_platform_analytics(db=db),
            self.audit_debugging_logs(db=db)
        )

        dossier_id = f"DOSSIER-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

        tests_part = (
            f"{t_res.passed}/{t_res.total_tests} unit tests passed" if t_res.total_tests
            else "unit tests not run here (see CI)"
        )
        verdict = (
            f"24-hour audit: {tests_part}. Stability: {l_res.system_stability_index}. "
            f"{a_res.dau_active_users} accounts active in the last 7 days, {a_res.new_users_24h} new in 24 h, "
            f"{l_res.critical_exceptions_count} client-reported errors."
        )
        if t_res.failed > 0 or l_res.critical_exceptions_count > 0:
            health = "DEGRADED"
        elif t_res.total_tests == 0 and l_res.total_log_entries_analyzed == 0:
            health = "UNKNOWN"
        else:
            health = "HEALTHY"

        dossier = DailyDossierResponse(
            dossier_id=dossier_id,
            executed_at=now_iso,
            next_scheduled_run=self._next_run_at,
            unit_tests=t_res,
            analytics=a_res,
            debugging_logs=l_res,
            executive_verdict=verdict,
            health_status=health
        )

        self._last_dossier = dossier

        # Persist to database if available
        if db is not None:
            try:
                await db.daily_audit_reports.insert_one(dossier.dict())
            except Exception as e:
                logger.warning(f"Could not persist daily audit dossier: {e}")

        return dossier

    async def _loop(self, db=None):
        logger.info("[DailyAudit] Started 24-Hour Autonomous Operations & Audit Swarm.")
        while self._running:
            try:
                await self.run_24hr_dossier(db=db)
            except Exception as e:
                logger.error(f"[DailyAudit] Error executing 24hr cycle: {e}")
            await asyncio.sleep(self._interval_seconds)

    def start(self, db=None):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop(db=db))

    def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()

    def get_latest_dossier(self) -> Optional[DailyDossierResponse]:
        return self._last_dossier

# Global singleton
daily_audit_service = DailyAuditOrchestratorService()
