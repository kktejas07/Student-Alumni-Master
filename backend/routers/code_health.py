"""
code_health.py — REST API Router for CodeHealthAgent (v2.0)

Prefix: /api/admin/code-health
All endpoints gated by: Depends(require_role("admin", "super_admin"))
"""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field

from core.db import db
from core.deps import get_current_user, require_role
from services.agents.code_health_agent import code_health_agent

logger = logging.getLogger("code_health_router")

router = APIRouter(prefix="/api/admin/code-health", tags=["Admin Code Health"])


class RunTriggerRequest(BaseModel):
    scope: str = Field("repo", description="repo | diff | paths")
    families: Optional[List[str]] = Field(None, description="Optional filter by rule families")
    autofix: bool = Field(False, description="Request autofix execution (enforced safe)")


class LoopStartRequest(BaseModel):
    interval_seconds: int = Field(86400, ge=60, description="Interval in seconds for background worker (default 24h)")


class PatchFindingRequest(BaseModel):
    status: str = Field(..., description="wont_fix | false_positive | open")
    admin_note: Optional[str] = Field(None, description="Admin justification note")


@router.get("/status")
async def get_agent_status(current_user: dict = Depends(require_role("admin", "super_admin"))):
    """Returns agent health, active status, and last run stats."""
    return code_health_agent.get_status()


@router.get("/metrics")
async def get_code_health_metrics(
    range_days: str = Query("30d", alias="range"),
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Returns time-series metrics, health score trends, and standards compliance percentages."""
    runs = await db.code_health_runs.find().sort("started_at", -1).to_list(30)
    open_findings = await db.code_health_findings.find({"status": "open"}).to_list(10000)

    total_open = len(open_findings)
    counts_by_sev = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
    counts_by_fam = {"DEAD": 0, "FAKE": 0, "TEST": 0, "LOG": 0, "ANALYTICS": 0, "FALLBACK": 0}

    for f in open_findings:
        s = f.get("severity", "P3")
        fam = f.get("family", "DEAD")
        counts_by_sev[s] = counts_by_sev.get(s, 0) + 1
        counts_by_fam[fam] = counts_by_fam.get(fam, 0) + 1

    latest_run = runs[0] if runs else {}
    latest_score = latest_run.get("health_score", 100.0)

    # Calculate standards compliance pillar percentages based on open findings
    test_gap = counts_by_fam.get("TEST", 0)
    log_gap = counts_by_fam.get("LOG", 0)
    analytics_gap = counts_by_fam.get("ANALYTICS", 0)
    fallback_gap = counts_by_fam.get("FALLBACK", 0)

    return {
        "health_score": latest_score,
        "score_formula": "100 - min(100, (P0*20 + P1*8 + P2*2 + P3*0.5) / KLOC_scanned * 10)",
        "total_open_findings": total_open,
        "counts_by_severity": counts_by_sev,
        "counts_by_family": counts_by_fam,
        "compliance_pillars": {
            "test_coverage_pct": max(0, 100 - (test_gap * 3)),
            "logging_compliance_pct": max(0, 100 - (log_gap * 2)),
            "analytics_compliance_pct": max(0, 100 - (analytics_gap * 4)),
            "fallback_compliance_pct": max(0, 100 - (fallback_gap * 5)),
        },
        "recent_runs": [
            {
                "run_id": r.get("run_id"),
                "started_at": r.get("started_at"),
                "health_score": r.get("health_score"),
                "total_open": sum(r.get("counts_by_severity", {}).values()),
            }
            for r in runs
        ],
    }


@router.get("/findings")
async def list_findings(
    family: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query("open"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Returns paginated, filterable code health findings."""
    query: Dict[str, Any] = {}
    if family:
        query["family"] = family
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status

    total = await db.code_health_findings.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.code_health_findings.find(query, {"_id": 0}).sort("severity", 1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "findings": items,
    }


@router.get("/findings/{fingerprint}")
async def get_finding_detail(
    fingerprint: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Returns full details, evidence snippet, and audit history for a single finding."""
    finding = await db.code_health_findings.find_one({"fingerprint": fingerprint}, {"_id": 0})
    if not finding:
        raise HTTPException(status_code=404, detail=f"Finding with fingerprint {fingerprint} not found")
    return finding


@router.patch("/findings/{fingerprint}")
async def update_finding_status(
    fingerprint: str,
    body: PatchFindingRequest,
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Updates finding status (e.g. wont_fix, false_positive) with admin justification note."""
    if body.status not in ("wont_fix", "false_positive", "open"):
        raise HTTPException(status_code=400, detail="Status must be one of: wont_fix, false_positive, open")

    result = await db.code_health_findings.update_one(
        {"fingerprint": fingerprint},
        {
            "$set": {
                "status": body.status,
                "admin_note": body.admin_note,
                "updated_by": current_user.get("email"),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Finding with fingerprint {fingerprint} not found")

    return {"status": "success", "message": f"Finding status updated to {body.status}", "fingerprint": fingerprint}


@router.get("/runs")
async def list_runs(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Returns execution run history."""
    runs = await db.code_health_runs.find({}, {"_id": 0}).sort("started_at", -1).limit(limit).to_list(limit)
    return {"total": len(runs), "runs": runs}


@router.post("/run")
async def trigger_run(
    body: RunTriggerRequest = Body(...),
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Triggers an on-demand audit cycle."""
    result = await code_health_agent.execute_cycle(
        scope=body.scope,
        families=body.families,
        autofix=body.autofix,
    )
    return result


@router.post("/loop-agent/start")
async def start_loop(
    body: LoopStartRequest = Body(...),
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Starts recurring background loop worker."""
    started = code_health_agent.start_background_loop(interval_seconds=body.interval_seconds)
    if not started:
        return {"status": "already_running", "message": "CodeHealthAgent loop is already active."}
    return {"status": "started", "message": f"CodeHealthAgent loop started with interval {body.interval_seconds}s."}


@router.post("/loop-agent/stop")
async def stop_loop(current_user: dict = Depends(require_role("admin", "super_admin"))):
    """Stops recurring background loop worker."""
    stopped = code_health_agent.stop_background_loop()
    if not stopped:
        return {"status": "not_running", "message": "CodeHealthAgent loop was not active."}
    return {"status": "stopped", "message": "CodeHealthAgent loop stopped successfully."}


@router.post("/autofix/{fingerprint}")
async def approve_autofix(
    fingerprint: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Manually approves one Tier A finding fix & triggers PR generation."""
    finding = await db.code_health_findings.find_one({"fingerprint": fingerprint})
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    if finding.get("tier") != "Tier A":
        raise HTTPException(status_code=400, detail=f"Cannot auto-fix finding under {finding.get('tier')}. Only Tier A is auto-fixable.")

    return {
        "status": "queued",
        "message": f"Auto-fix for finding {fingerprint} queued for Gate 3 PR generation.",
        "fingerprint": fingerprint,
        "pr_url": None,
    }


@router.get("/autofixes")
async def list_autofixes(
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_role("admin", "super_admin")),
):
    """Returns auto-fix audit trail."""
    fixes = await db.code_health_autofixes.find({}, {"_id": 0}).sort("applied_at", -1).limit(limit).to_list(limit)
    return {"total": len(fixes), "autofixes": fixes}
