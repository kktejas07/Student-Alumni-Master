"""
bgv_reverification_agent.py — Weekly BGV Re-Verification Agent (BV9)

Re-scans candidates whose last BGV scan is >180 days old, produces a delta
report (previous vs new overall_status / risk_score), raises alerts when a
candidate's status changes, and persists the new scan into `bgv_scan_history`
with scan_type='re-verification' (BV5 audit trail).

Cadence: weekly (168h minimum between runs, admin can force).
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

REVERIFY_GAP_DAYS = 180
CADENCE_HOURS = 168  # weekly


class BGVRereviewResult(BaseModel):
    success: bool
    engine: str = "bgv-rereview"
    candidates_checked: int = 0
    rescan_required: int = 0
    rescan_completed: int = 0
    status_changed: int = 0
    skipped: int = 0
    errors: int = 0
    next_eligible_at: Optional[str] = None
    rescan_candidates: List[Dict[str, Any]] = []
    message: str = ""


class BGVRereviewAgentService:
    SETTINGS_KEY = "bgv_reverify_agent"
    CADENCE_HOURS = CADENCE_HOURS

    # ------------------------------------------------------------------
    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _parse_iso(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            dt = datetime.fromisoformat(value)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return None

    async def _is_due(self, db, force: bool) -> bool:
        if force:
            return True
        doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
        last = self._parse_iso(doc.get("last_run_at"))
        if not last:
            return True
        return (self._now() - last) >= timedelta(hours=self.CADENCE_HOURS)

    async def _due_candidates(self, db, limit: int = 200) -> List[Dict[str, Any]]:
        """Candidates whose last scan is >180 days old (or never re-verified)."""
        cutoff_iso = (self._now() - timedelta(days=REVERIFY_GAP_DAYS)).isoformat()
        coll = db.bgv_scan_history
        pipeline = [
            {"$match": {"candidate_email": {"$ne": ""}}},
            {"$sort": {"scan_timestamp": -1}},
            {"$group": {
                "_id": "$candidate_email",
                "name": {"$first": "$candidate_name"},
                "last_scan": {"$first": "$scan_timestamp"},
                "last_status": {"$first": "$overall_status"},
                "last_dossier": {"$first": "$dossier_id"},
            }},
            {"$match": {"last_scan": {"$lt": cutoff_iso}}},
            {"$sort": {"last_scan": 1}},
            {"$limit": limit},
        ]
        docs = await coll.aggregate(pipeline).to_list(limit)
        out = []
        for d in docs:
            out.append({
                "email": d.get("_id") or "",
                "name": d.get("name") or "",
                "last_scan": d.get("last_scan"),
                "last_status": d.get("last_status"),
                "last_dossier": d.get("last_dossier"),
            })
        return out

    async def run(self, db, force: bool = False, limit: int = 200) -> BGVRereviewResult:
        """Run one weekly re-verification cycle."""
        if db is None:
            return BGVRereviewResult(success=False, message="db handle unavailable")
        if not await self._is_due(db, force):
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            last = self._parse_iso(doc.get("last_run_at")) or self._now()
            return BGVRereviewResult(
                success=True, skipped=1,
                message="Not due (weekly cadence). Force with force=True.",
                next_eligible_at=(last + timedelta(hours=self.CADENCE_HOURS)).isoformat(),
            )

        from features.routers.bgv_integrations import run_bgv_scan_engine

        candidates = await self._due_candidates(db, limit=limit)
        rescan_completed = 0
        status_changed = 0
        errors = 0
        rescan_log: List[Dict[str, Any]] = []

        for cand in candidates:
            prev_status = cand.get("last_status")
            prev_doc = await db.bgv_scan_history.find_one(
                {"dossier_id": cand.get("last_dossier")}, projection={"candidate_name": 1, "candidate_email": 1, "risk_score": 1}
            ) or {}
            try:
                result = await run_bgv_scan_engine(
                    {"name": cand.get("name") or "", "email": cand.get("email") or ""},
                    scanner_user_id="bgv_reverify_agent",
                    scan_type="re-verification",
                    db=db,
                    persist_history=True,
                )
                new_status = result.get("overall_status")
                changed = prev_status and new_status and prev_status != new_status
                if changed:
                    status_changed += 1
                rescan_completed += 1
                rescan_log.append({
                    "email": cand.get("email"),
                    "name": cand.get("name"),
                    "prev_dossier": cand.get("last_dossier"),
                    "prev_status": prev_status,
                    "new_dossier": result.get("dossier_id"),
                    "new_status": new_status,
                    "status_changed": bool(changed),
                })
                if changed:
                    await db.bgv_alerts.insert_one({
                        "alert_id": f"REREVIEW-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{rescan_completed:03d}",
                        "type": "STATUS_CHANGE_ON_REVERIFY",
                        "severity": "HIGH" if new_status in ("FLAGGED_FOR_HUMAN_REVIEW", "CRITICAL_FAILED") else "MEDIUM",
                        "candidate_email": cand.get("email"),
                        "candidate_name": cand.get("name"),
                        "prev_status": prev_status,
                        "new_status": new_status,
                        "prev_dossier": cand.get("last_dossier"),
                        "new_dossier": result.get("dossier_id"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "acknowledged": False,
                        "source": "bgv_reverify_agent",
                    })
            except Exception:
                errors += 1

        now_iso = self._now().isoformat()
        await db.settings.update_one(
            {"id": self.SETTINGS_KEY},
            {"$set": {
                "last_run_at": now_iso,
                "last_candidates_checked": len(candidates),
                "last_rescanned": rescan_completed,
                "last_status_changed": status_changed,
            }},
            upsert=True,
        )
        next_at = (self._now() + timedelta(hours=self.CADENCE_HOURS)).isoformat()
        return BGVRereviewResult(
            success=True,
            candidates_checked=len(candidates),
            rescan_required=len(candidates),
            rescan_completed=rescan_completed,
            status_changed=status_changed,
            errors=errors,
            next_eligible_at=next_at,
            rescan_candidates=rescan_log[:50],
            message=f"Re-verification run complete: {rescan_completed}/{len(candidates)} re-scanned, {status_changed} status changes alerted."
        )

    async def get_status(self, db) -> Dict[str, Any]:
        status = {
            "is_configured": True,
            "cadence_hours": self.CADENCE_HOURS,
            "reverify_gap_days": REVERIFY_GAP_DAYS,
            "last_run_at": None,
            "last_candidates_checked": 0,
            "last_rescanned": 0,
            "last_status_changed": 0,
            "pending_candidates": 0,
        }
        if db is not None:
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            status["last_run_at"] = doc.get("last_run_at")
            status["last_candidates_checked"] = doc.get("last_candidates_checked", 0)
            status["last_rescanned"] = doc.get("last_rescanned", 0)
            status["last_status_changed"] = doc.get("last_status_changed", 0)
            status["pending_candidates"] = len(await self._due_candidates(db, limit=5000))
            next_iso = (self._parse_iso(doc.get("last_run_at")) or self._now()) + timedelta(hours=self.CADENCE_HOURS)
            status["next_run_at"] = next_iso.isoformat()
        return status


bgv_reverify_agent = BGVRereviewAgentService()
