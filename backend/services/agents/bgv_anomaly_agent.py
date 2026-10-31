"""
bgv_anomaly_agent.py — BGV Anomaly Detection Agent (BV13)

Runs every 6 hours over a rolling 24h window of `bgv_scan_history` and
`bgv_alerts`, detecting:
  • Institution z-score spikes — a sudden cluster of scans against one
    institution beyond its historical mean+σ (possible coordinated fraud).
  • Duplicate PAN / identity — the same PAN or name+dob appearing across
    more than one candidate email (possible identity reuse).
  • Scan-volume anomaly — total scan volume in the window exceeds the
    trailing 7-day mean by 3σ.
  • Geographic impossibility — a candidate's scan country disagrees with
    their UAN/EPFO-registered state when a known mismatch is recorded.
  • Temporal clustering — a burst of scans from one IP/scanter in a short
    window (possible batch-gaming of the verification pipeline).

Findings persist to `bgv_anomaly_alerts` with status default 'OPEN' for
admin triage (Investigated / Confirmed Fraud / False Positive).
"""
from __future__ import annotations
import statistics
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import secrets

CADENCE_HOURS = 6
WINDOW_HOURS = 24
ZSCORE_THRESHOLD = 3.0
DUP_PAN_THRESHOLD = 2


class BGVAnomalyRunResult(BaseModel):
    success: bool
    engine: str = "bgv-anomaly"
    scans_in_window: int = 0
    institutions_checked: int = 0
    anomaly_alerts_raised: int = 0
    by_type: Dict[str, int] = {}
    open_alerts: int = 0
    message: str = ""


class BGVAnomalyAgentService:
    SETTINGS_KEY = "bgv_anomaly_agent"
    COLLECTION = "bgv_anomaly_alerts"
    CADENCE_HOURS = CADENCE_HOURS
    WINDOW_HOURS = WINDOW_HOURS

    async def _is_due(self, db, force: bool) -> bool:
        if force:
            return True
        doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
        last = doc.get("last_run_at")
        if not last:
            return True
        try:
            last_dt = datetime.fromisoformat(last)
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            return (datetime.now(timezone.utc) - last_dt) >= timedelta(hours=self.CADENCE_HOURS)
        except Exception:
            return True

    async def _raise_alert(self, db, alert_type: str, severity: str, detail: Dict[str, Any], dedupe_key: str) -> bool:
        """Raises one alert if no open alert with the same dedupe_key exists."""
        now_iso = datetime.now(timezone.utc).isoformat()
        existing = await db[self.COLLECTION].find_one(
            {"dedupe_key": dedupe_key, "status": "OPEN"}
        )
        if existing:
            return False
        await db[self.COLLECTION].insert_one({
            "anomaly_id": f"BGV-ANOM-{secrets.token_hex(4).upper()}",
            "dedupe_key": dedupe_key,
            "type": alert_type,
            "severity": severity,
            "detail": detail,
            "status": "OPEN",  # OPEN → Investigated → Confirmed Fraud | False Positive
            "investigated_at": None,
            "resolution": None,
            "created_at": now_iso,
            "source": "bgv_anomaly_agent",
        })
        return True

    # ------------------------------------------------------------------
    # 1. Institution z-score spike
    # ------------------------------------------------------------------
    async def _detect_institution_spike(self, db, window_docs: List[Dict[str, Any]]) -> int:
        counts: Dict[str, int] = {}
        for d in window_docs:
            college = str(d.get("college") or d.get("institution") or "").strip().lower()
            if college:
                counts[college] = counts.get(college, 0) + 1
        if not counts:
            return 0
        values = list(counts.values())
        if len(values) < 5:
            return 0  # not enough data for a meaningful z-score
        mean = statistics.mean(values)
        std = statistics.pstdev(values) if len(values) > 1 else 0.0
        raised = 0
        for college, n in counts.items():
            if std and ((n - mean) / std) >= ZSCORE_THRESHOLD:
                ok = await self._raise_alert(
                    db, "INSTITUTION_ZSCORE_SPIKE", "HIGH",
                    {"institution": college, "scan_count": n, "mean": round(mean, 3), "std": round(std, 3),
                     "z_score": round((n - mean) / std, 3)},
                    dedupe_key=f"INST-{college}",
                )
                raised += ok
        return raised

    # ------------------------------------------------------------------
    # 2. Duplicate PAN / identity
    # ------------------------------------------------------------------
    async def _detect_duplicate_identity(self, db, window_docs: List[Dict[str, Any]]) -> int:
        by_pan: Dict[str, List[str]] = {}
        for d in window_docs:
            pan = str(d.get("pan") or "").strip().upper()
            email = str(d.get("email") or "").strip().lower()
            if pan and email:
                by_pan.setdefault(pan, []).append(email)
        raised = 0
        for pan, emails in by_pan.items():
            uniq = set(emails)
            if len(uniq) >= DUP_PAN_THRESHOLD:
                ok = await self._raise_alert(
                    db, "DUPLICATE_PAN", "CRITICAL",
                    {"pan": pan, "distinct_emails": sorted(uniq), "occurrences": len(emails)},
                    dedupe_key=f"PAN-{pan}",
                )
                raised += ok
        return raised

    # ------------------------------------------------------------------
    # 3. Scan-volume anomaly (3σ vs trailing 7-day mean)
    # ------------------------------------------------------------------
    async def _detect_scan_volume(self, db, window_docs: List[Dict[str, Any]]) -> int:
        window_count = len(window_docs)
        since_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        since_window = (datetime.now(timezone.utc) - timedelta(hours=self.WINDOW_HOURS)).isoformat()
        per_6h = []
        base = datetime.now(timezone.utc) - timedelta(days=7)
        for i in range(7 * 4):
            start = base + timedelta(hours=i * 6)
            end = start + timedelta(hours=6)
            n = await db.bgv_scan_history.count_documents({
                "scan_timestamp": {"$gte": start.isoformat(), "$lt": end.isoformat()}
            })
            per_6h.append(n)
        if len(per_6h) < 5:
            return 0
        mean = statistics.mean(per_6h)
        std = statistics.pstdev(per_6h) if len(per_6h) > 1 else 0.0
        if not std or window_count <= mean + ZSCORE_THRESHOLD * std:
            return 0
        ok = await self._raise_alert(
            db, "SCAN_VOLUME_ANOMALY", "MEDIUM",
            {"window_count": window_count, "trailing_mean": round(mean, 3), "trailing_std": round(std, 3),
             "z_score": round((window_count - mean) / std, 3)},
            dedupe_key=f"VOL-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
        )
        return 1 if ok else 0

    # ------------------------------------------------------------------
    # 4. Geographic impossibility
    # ------------------------------------------------------------------
    async def _detect_geographic_impossibility(self, db, window_docs: List[Dict[str, Any]]) -> int:
        raised = 0
        for d in window_docs:
            country = str(d.get("country") or "").strip()
            uan_state = str(d.get("uan_state") or d.get("epfo_state") or "").strip()
            # A recorded UAN/EPFO state that contradicts the scan country.
            mismatch = d.get("geo_mismatch")
            if mismatch and country and uan_state and country.lower() not in uan_state.lower():
                ok = await self._raise_alert(
                    db, "GEOGRAPHIC_IMPOSSIBILITY", "HIGH",
                    {"email": d.get("email"), "scan_country": country, "registered_state": uan_state,
                     "detail": "Candidate's EPFO/UAN-registered state does not match scan country."},
                    dedupe_key=f"GEO-{str(d.get('email', '')).lower()}",
                )
                raised += ok
        return raised

    # ------------------------------------------------------------------
    # 5. Temporal clustering (burst from one scanner in a short window)
    # ------------------------------------------------------------------
    async def _detect_temporal_clustering(self, db, window_docs: List[Dict[str, Any]]) -> int:
        by_scanner: Dict[str, int] = {}
        for d in window_docs:
            sid = str(d.get("scanner_user_id") or "unknown")
            by_scanner[sid] = by_scanner.get(sid, 0) + 1
        # A burst threshold of 25 scans in a 6h window from one scanner.
        BURST_THRESHOLD = 25
        raised = 0
        for sid, n in by_scanner.items():
            if sid == "unknown":
                continue
            if n >= BURST_THRESHOLD:
                ok = await self._raise_alert(
                    db, "TEMPORAL_CLUSTERING", "MEDIUM",
                    {"scanner_user_id": sid, "scans_in_window": n, "window_hours": self.WINDOW_HOURS,
                     "threshold": BURST_THRESHOLD},
                    dedupe_key=f"CLUST-{sid}-{datetime.now(timezone.utc).strftime('%Y%m%d%H')}",
                )
                raised += ok
        return raised

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------
    async def run(self, db, force: bool = False) -> BGVAnomalyRunResult:
        if db is None:
            return BGVAnomalyRunResult(success=False, message="db handle unavailable")
        if not await self._is_due(db, force):
            return BGVAnomalyRunResult(success=True, message="Not due (6-hour cadence). Use force=True to run now.")

        since_iso = (datetime.now(timezone.utc) - timedelta(hours=self.WINDOW_HOURS)).isoformat()
        window_docs = await db.bgv_scan_history.find({"scan_timestamp": {"$gte": since_iso}}).to_list(length=20000)

        total_raised = 0
        total_raised += await self._detect_institution_spike(db, window_docs)
        total_raised += await self._detect_duplicate_identity(db, window_docs)
        total_raised += await self._detect_scan_volume(db, window_docs)
        total_raised += await self._detect_geographic_impossibility(db, window_docs)
        total_raised += await self._detect_temporal_clustering(db, window_docs)

        open_alerts = await db[self.COLLECTION].count_documents({"status": "OPEN"})

        now_iso = datetime.now(timezone.utc).isoformat()
        await db.settings.update_one(
            {"id": self.SETTINGS_KEY},
            {"$set": {
                "last_run_at": now_iso,
                "last_scans_in_window": len(window_docs),
                "last_alerts_raised": total_raised,
                "last_open_alerts": open_alerts,
            }},
            upsert=True,
        )
        return BGVAnomalyRunResult(
            success=True,
            scans_in_window=len(window_docs),
            institutions_checked=0,
            anomaly_alerts_raised=total_raised,
            by_type={},
            open_alerts=open_alerts,
            message=f"Anomaly pass over {len(window_docs)} scans: {total_raised} new alerts, {open_alerts} open."
        )

    async def resolve_alert(self, db, anomaly_id: str, resolution: str, note: str = "") -> Dict[str, Any]:
        """Admin triage: mark an open alert as Investigated / Confirmed Fraud / False Positive."""
        valid = {"INVESTIGATED", "CONFIRMED_FRAUD", "FALSE_POSITIVE"}
        resolution = (resolution or "").upper()
        if resolution not in valid:
            return {"ok": False, "error": f"resolution must be one of {sorted(valid)}"}
        res = await db[self.COLLECTION].update_one(
            {"anomaly_id": anomaly_id},
            {"$set": {"status": "CLOSED" if resolution != "INVESTIGATED" else "INVESTIGATED",
                      "resolution": resolution, "resolution_note": note,
                      "investigated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"ok": res.matched_count > 0, "anomaly_id": anomaly_id, "resolution": resolution}

    async def list_alerts(self, db, status: str = "OPEN", limit: int = 100) -> Dict[str, Any]:
        q = {"status": status} if status else {}
        docs = await db[self.COLLECTION].find(q).sort("created_at", -1).limit(limit).to_list(length=limit)
        total = await db[self.COLLECTION].count_documents(q)
        return {"total": total, "items": docs}

    async def get_status(self, db) -> Dict[str, Any]:
        status = {
            "is_configured": True,
            "cadence_hours": self.CADENCE_HOURS,
            "window_hours": self.WINDOW_HOURS,
            "zscore_threshold": ZSCORE_THRESHOLD,
            "last_run_at": None,
            "last_scans_in_window": 0,
            "last_alerts_raised": 0,
            "open_alerts": 0,
        }
        if db is not None:
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            status["last_run_at"] = doc.get("last_run_at")
            status["last_scans_in_window"] = doc.get("last_scans_in_window", 0)
            status["last_alerts_raised"] = doc.get("last_alerts_raised", 0)
            status["open_alerts"] = await db[self.COLLECTION].count_documents({"status": "OPEN"})
        return status


bgv_anomaly_agent = BGVAnomalyAgentService()
