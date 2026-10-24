"""
code_health_agent.py — Code Health Continuous Auditor & Auto-Fix Loop Agent (v2.0).

Mirrors EchoProfileLoopAgent architecture:
  - execute_cycle(scope="repo", families=None, autofix=False)
  - _background_loop_worker(interval_seconds=86400)
  - start_background_loop() / stop_background_loop() / get_status()
  - Registered with agent_scheduler.py

Persistence (MongoDB):
  - db.code_health_findings (upserted by line-invariant fingerprint)
  - db.code_health_runs (per-run metrics, score, counts)
  - db.code_health_autofixes (auto-fix audit trail)
"""

from __future__ import annotations
import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from core.db import db
from services.agents.code_health_rules import CodeHealthRuleEngine, CodeHealthFinding, generate_fingerprint

logger = logging.getLogger(__name__)


class CodeHealthAgent:
    """Autonomous continuous auditor and auto-fix loop agent for codebase hygiene."""

    def __init__(self):
        self._is_running = False
        self._loop_task: Optional[asyncio.Task] = None
        self._last_run_at: Optional[str] = None
        self._last_run_stats: Dict[str, Any] = {}
        self._total_cycles: int = 0

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _get_workspace_root(self) -> str:
        # Resolve path relative to backend directory
        cur = os.path.dirname(os.path.abspath(__file__))
        return os.path.abspath(os.path.join(cur, "..", "..", ".."))

    def compute_health_score(self, counts_by_sev: Dict[str, int], kloc_scanned: float) -> float:
        """Computes Code Health Score (0-100) using standards formula."""
        if kloc_scanned <= 0:
            kloc_scanned = 100.0  # Default fallback
        penalty = (
            counts_by_sev.get("P0", 0) * 20.0
            + counts_by_sev.get("P1", 0) * 8.0
            + counts_by_sev.get("P2", 0) * 2.0
            + counts_by_sev.get("P3", 0) * 0.5
        ) / kloc_scanned * 10.0
        score = max(0.0, min(100.0, 100.0 - penalty))
        return round(score, 1)

    async def execute_cycle(
        self,
        scope: str = "repo",  # "repo" | "diff" | "paths"
        families: Optional[List[str]] = None,
        autofix: bool = False,
    ) -> Dict[str, Any]:
        """Executes one complete code health audit & remediation cycle."""
        start_dt = datetime.now(timezone.utc)
        start_iso = start_dt.isoformat()
        run_id = f"run_{start_dt.strftime('%Y%m%d_%H%M%S')}"

        logger.info(f"🛡️ [CODE HEALTH AGENT] Executing cycle {run_id} (scope={scope}, autofix={autofix})...")

        # 1. Run Rule Engine
        workspace_root = self._get_workspace_root()
        engine = CodeHealthRuleEngine(workspace_root)
        findings: List[CodeHealthFinding] = engine.scan_all(families=families)

        # Calculate KLOC scanned across backend and frontend/src
        total_lines = 0
        skip_dirs = {".git", "node_modules", "__pycache__", ".next", "build", "dist", ".expo", "ios", "android", "scratch", ".gemini"}
        scan_target_dirs = [os.path.join(workspace_root, "backend"), os.path.join(workspace_root, "frontend", "src")]
        for sdir in scan_target_dirs:
            if os.path.exists(sdir):
                for root, dirs, files in os.walk(sdir):
                    dirs[:] = [d for d in dirs if d not in skip_dirs]
                    for f in files:
                        if f.endswith((".py", ".ts", ".tsx", ".js", ".jsx")):
                            try:
                                with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as fp:
                                    total_lines += sum(1 for _ in fp)
                            except Exception:
                                pass
        kloc_scanned = round(total_lines / 1000.0, 1) if total_lines > 0 else 100.0

        # 2. Persist / Upsert Findings in Mongo
        current_fingerprints: Set[str] = set()
        counts_by_severity = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
        counts_by_family = {"DEAD": 0, "FAKE": 0, "TEST": 0, "LOG": 0, "ANALYTICS": 0, "FALLBACK": 0}

        findings_new = 0
        findings_resolved = 0

        try:
            for f in findings:
                current_fingerprints.add(f.fingerprint)
                counts_by_severity[f.severity] = counts_by_severity.get(f.severity, 0) + 1
                counts_by_family[f.family] = counts_by_family.get(f.family, 0) + 1

                doc = f.to_dict()
                existing = await db.code_health_findings.find_one({"fingerprint": f.fingerprint})
                if not existing:
                    doc["first_seen_at"] = start_iso
                    doc["last_seen_at"] = start_iso
                    doc["age_days"] = 0
                    await db.code_health_findings.insert_one(doc)
                    findings_new += 1
                else:
                    first_seen = existing.get("first_seen_at") or start_iso
                    try:
                        fs_dt = datetime.fromisoformat(first_seen.replace("Z", "+00:00"))
                        age = (start_dt - fs_dt).days
                    except Exception:
                        age = 0

                    await db.code_health_findings.update_one(
                        {"fingerprint": f.fingerprint},
                        {
                            "$set": {
                                "last_seen_at": start_iso,
                                "line": f.line,
                                "evidence": f.evidence,
                                "age_days": age,
                                "status": "open" if existing.get("status") in ("open", "fixed_manual", "fixed_auto") else existing.get("status"),
                            }
                        },
                    )

            # 3. Detect Resolved Findings (Absent from current run)
            all_open_in_db = await db.code_health_findings.find({"status": "open"}).to_list(10000)
            for db_f in all_open_in_db:
                fp = db_f.get("fingerprint")
                if fp and fp not in current_fingerprints:
                    await db.code_health_findings.update_one(
                        {"fingerprint": fp},
                        {
                            "$set": {
                                "status": "fixed_manual",
                                "resolved_at": start_iso,
                            }
                        },
                    )
                    findings_resolved += 1
        except Exception as e:
            logger.warning(f"Could not persist code health findings to DB: {e}")

        # 4. Auto-Fix Pipeline (Enforced OFF by default & during Gate 2 / when CODE_HEALTH_AUTOFIX_ENABLED=false)
        autofix_enabled_env = os.environ.get("CODE_HEALTH_AUTOFIX_ENABLED", "false").lower() == "true"
        autofix_prs: List[str] = []

        if autofix and autofix_enabled_env:
            logger.info("⚡ Auto-fix requested & enabled. Processing Tier A findings...")
            # Gate 3 auto-fix logic goes here when enabled in Gate 3

        # 5. Compute Metrics & Health Score
        health_score = self.compute_health_score(counts_by_severity, kloc_scanned)
        end_dt = datetime.now(timezone.utc)
        duration_ms = int((end_dt - start_dt).total_seconds() * 1000)

        run_doc = {
            "run_id": run_id,
            "started_at": start_iso,
            "completed_at": end_dt.isoformat(),
            "duration_ms": duration_ms,
            "scope": scope,
            "commit_sha": os.environ.get("GIT_COMMIT_SHA", "head"),
            "kloc_scanned": kloc_scanned,
            "health_score": health_score,
            "counts_by_severity": counts_by_severity,
            "counts_by_family": counts_by_family,
            "findings_new": findings_new,
            "findings_resolved": findings_resolved,
            "autofix_prs": autofix_prs,
            "errors": [],
        }
        try:
            await db.code_health_runs.insert_one(run_doc)
        except Exception as e:
            logger.warning(f"Could not persist code health run to DB: {e}")

        self._last_run_at = start_iso
        self._total_cycles += 1
        self._last_run_stats = {
            "run_id": run_id,
            "executed_at": start_iso,
            "duration_ms": duration_ms,
            "health_score": health_score,
            "total_open_findings": len(findings),
            "findings_new": findings_new,
            "findings_resolved": findings_resolved,
            "counts_by_severity": counts_by_severity,
            "counts_by_family": counts_by_family,
            "kloc_scanned": kloc_scanned,
        }

        logger.info(f"✅ [CODE HEALTH AGENT] Cycle {run_id} completed: Score={health_score}/100, Open={len(findings)}, New={findings_new}, Resolved={findings_resolved} in {duration_ms}ms.")

        return {
            "status": "success",
            "message": f"CodeHealthAgent cycle completed. Score: {health_score}/100",
            "run_id": run_id,
            "health_score": health_score,
            "total_findings": len(findings),
            "findings_new": findings_new,
            "findings_resolved": findings_resolved,
            "counts_by_severity": counts_by_severity,
            "counts_by_family": counts_by_family,
            "cycle_time_seconds": round(duration_ms / 1000.0, 2),
            "logs": [f"Audited {kloc_scanned} KLOC. Identified {len(findings)} open findings across {len(counts_by_family)} rule families."],
        }

    async def _background_loop_worker(self, interval_seconds: int = 86400):
        """Nightly background loop worker (default: 86400s / 24 hours)."""
        logger.info(f"🔄 [CODE HEALTH AGENT LOOP] Background worker active (interval={interval_seconds}s)")
        while self._is_running:
            try:
                await self.execute_cycle(scope="repo", autofix=False)
            except Exception as e:
                logger.error(f"💥 [CODE HEALTH AGENT LOOP ERROR] {e}", exc_info=True)
            await asyncio.sleep(interval_seconds)

    def start_background_loop(self, interval_seconds: int = 86400) -> bool:
        """Starts the recurring background loop worker if not already running."""
        if self._is_running:
            return False
        self._is_running = True
        self._loop_task = asyncio.create_task(self._background_loop_worker(interval_seconds))
        return True

    def stop_background_loop(self) -> bool:
        """Stops the recurring background loop worker."""
        if not self._is_running:
            return False
        self._is_running = False
        if self._loop_task:
            self._loop_task.cancel()
            self._loop_task = None
        return True

    def get_status(self) -> Dict[str, Any]:
        """Returns agent health, lifecycle state and last execution metrics."""
        return {
            "agent_name": "CodeHealthAgent",
            "is_running": self._is_running,
            "total_cycles_executed": self._total_cycles,
            "last_run_at": self._last_run_at,
            "last_run_stats": self._last_run_stats,
            "autofix_enabled_env": os.environ.get("CODE_HEALTH_AUTOFIX_ENABLED", "false").lower() == "true",
        }


# Global Singleton Instance
code_health_agent = CodeHealthAgent()
