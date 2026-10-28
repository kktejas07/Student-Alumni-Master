"""
qa_agent.py — Synthetic QA probes.

Earlier versions of this agent returned a fixed list of "passed" assertions
with made-up latencies. It now issues real in-process HTTP requests against
the FastAPI app (httpx ASGITransport, no network) and reports what actually
came back: status code, measured latency, and pass/fail against an expected
status. Unauthenticated probes expect 401 for protected routes, which proves
the auth gate is in place without needing credentials.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Sequence, Tuple

from pydantic import BaseModel, Field


class TestAssertion(BaseModel):
    name: str
    target_endpoint: str
    status: str = "passed"  # passed, failed, warning
    response_time_ms: float
    message: str
    http_status: Optional[int] = None
    expected_status: Optional[Sequence[int]] = None


class QASimulationReport(BaseModel):
    run_id: str
    persona: str
    scenario_name: str
    assertions: List[TestAssertion]
    total_passed: int
    total_failed: int
    health_score: float
    mode: str = "live-probe"  # live-probe | unavailable
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# (name, path, expected statuses). 401 on a protected route is a pass: it
# shows the route exists and is gated.
PROBES: Dict[str, List[Tuple[str, str, Tuple[int, ...]]]] = {
    "student": [
        ("API health", "/api/health", (200,)),
        ("Jobs feed", "/api/jobs/feed?per_page=1", (200,)),
        ("Events search", "/api/events/search?limit=1", (200,)),
        ("Courses list", "/api/courses/list?limit=1", (200,)),
        ("Student dashboard requires login", "/api/student/dashboard", (401, 403)),
    ],
    "mentor": [
        ("API health", "/api/health", (200,)),
        ("Mentor catalog", "/api/catalog/mentors", (200,)),
        ("Mentor earnings requires login", "/api/mentor/earnings", (401, 403)),
    ],
    "college": [
        ("API health", "/api/health", (200,)),
        ("Live counters", "/api/live/counters", (200,)),
        ("College students requires login", "/api/college/students", (401, 403)),
    ],
    "superadmin": [
        ("API health", "/api/health", (200,)),
        ("ECHO showcases", "/api/echo/showcases", (200,)),
        ("Admin overview requires login", "/api/admin/super-overview", (401, 403)),
        ("BGV admin list requires login", "/api/bgv/admin/list", (401, 403)),
    ],
}

SLOW_MS = 1500.0


class AutonomousQAAgent:
    """Runs real HTTP probes against the running app and reports the results."""

    async def _probe(self, client, name: str, path: str, expected: Tuple[int, ...]) -> TestAssertion:
        t0 = time.perf_counter()
        try:
            resp = await client.get(path)
            ms = (time.perf_counter() - t0) * 1000.0
            ok = resp.status_code in expected
            status = "passed" if ok else "failed"
            if ok and ms > SLOW_MS:
                status = "warning"
            msg = f"HTTP {resp.status_code} in {ms:.0f} ms (expected {', '.join(map(str, expected))})"
            return TestAssertion(name=name, target_endpoint=path, status=status, response_time_ms=round(ms, 1),
                                 message=msg, http_status=resp.status_code, expected_status=list(expected))
        except Exception as e:
            ms = (time.perf_counter() - t0) * 1000.0
            return TestAssertion(name=name, target_endpoint=path, status="failed", response_time_ms=round(ms, 1),
                                 message=f"request error: {e}", expected_status=list(expected))

    async def run_persona_simulation(self, persona: str = "student") -> QASimulationReport:
        run_id = f"qa-{uuid.uuid4().hex[:8]}"
        persona = persona if persona in PROBES else "superadmin"
        probes = PROBES[persona]
        assertions: List[TestAssertion] = []
        mode = "live-probe"
        try:
            import httpx  # noqa: WPS433
            from server import app  # local import: server imports this module
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://qa.local", timeout=20.0) as client:
                for name, path, expected in probes:
                    assertions.append(await self._probe(client, name, path, expected))
        except Exception as e:
            mode = "unavailable"
            assertions.append(TestAssertion(
                name="QA harness", target_endpoint="(in-process)", status="failed", response_time_ms=0.0,
                message=f"could not run probes: {e}",
            ))

        passed = sum(1 for a in assertions if a.status == "passed")
        failed = sum(1 for a in assertions if a.status == "failed")
        score = round(passed / len(assertions) * 100.0, 1) if assertions else 0.0
        return QASimulationReport(
            run_id=run_id,
            persona=persona,
            scenario_name=f"{persona.capitalize()} journey — live endpoint probes",
            assertions=assertions,
            total_passed=passed,
            total_failed=failed,
            health_score=score,
            mode=mode,
        )

    async def run_full_suite(self) -> List[QASimulationReport]:
        return [await self.run_persona_simulation(p) for p in PROBES]


# Global singleton
qa_agent = AutonomousQAAgent()
