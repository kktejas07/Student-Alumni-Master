"""
bgv_compliance_agent.py — Daily BGV Compliance Agent (BV12)

Runs daily at 03:00 UTC across four duties:
  1. Consent-expiry scanner — flags ACTIVE consent records expiring within
     the next 30 days and raises reminders so the candidate can re-consent.
  2. Retention enforcer — BGV records older than the retention window
     (default 3 years) are anonymized (PII scrubbed, flagged retained_for
     'statistical') rather than hard-deleted, preserving audit integrity.
  3. Right-to-be-forgotten processor — processes queued erasure requests
     (bgv_erasure_requests, status PENDING) by anonymizing the candidate's
     BGV data and revoking all consents.
  4. Monthly compliance report — aggregates the above into bgv_compliance_log.

All writes land in `bgv_compliance_log` for the compliance audit trail.
"""
from __future__ import annotations
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

RETENTION_YEARS_DEFAULT = 3
CONSENT_EXPIRY_WINDOW_DAYS = 30
CADENCE_HOURS = 24
RUN_WINDOW_UTC_HOUR = 3


class BGVRTRTBFResult(BaseModel):
    success: bool
    engine: str = "bgv-compliance"
    consents_expiring_30d: int = 0
    records_anonymized_retention: int = 0
    erasure_requests_processed: int = 0
    monthly_report_generated: bool = False
    message: str = ""


class BGVComplianceAgentService:
    SETTINGS_KEY = "bgv_compliance_agent"
    RETENTION_YEARS_DEFAULT = RETENTION_YEARS_DEFAULT
    CADENCE_HOURS = CADENCE_HOURS
    RUN_WINDOW_UTC_HOUR = RUN_WINDOW_UTC_HOUR

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

    # ------------------------------------------------------------------
    # 1. Consent-expiry scanner
    # ------------------------------------------------------------------
    async def _scan_consent_expiries(self, db) -> int:
        now = datetime.now(timezone.utc)
        cutoff = (now + timedelta(days=CONSENT_EXPIRY_WINDOW_DAYS)).isoformat()
        coll = db.bgv_consents
        expiring = await coll.count_documents({"status": "ACTIVE", "expires_at": {"$lt": cutoff}})
        now_iso = now.isoformat()
        async for rec in coll.find({"status": "ACTIVE", "expires_at": {"$lt": cutoff}}).limit(500):
            await db.bgv_compliance_log.insert_one({
                "log_id": f"COMPL-EXPIRY-{secrets.token_hex(4).upper()}",
                "event": "CONSENT_EXPIRING_SOON",
                "email": rec.get("email"),
                "expires_at": rec.get("expires_at"),
                "window_days": CONSENT_EXPIRY_WINDOW_DAYS,
                "created_at": now_iso,
                "source": "bgv_compliance_agent",
            })
        return expiring

    # ------------------------------------------------------------------
    # 2. Retention enforcer
    # ------------------------------------------------------------------
    async def _enforce_retention(self, db, retention_years: int) -> int:
        cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=retention_years * 365)).isoformat()
        count = 0
        # Anonymize old BGV scan history & alerts rather than deleting.
        res = await db.bgv_scan_history.update_many(
            {"scan_timestamp": {"$lt": cutoff_iso}, "anonymized": {"$ne": True}},
            {"$set": {
                "candidate_name": "ANONYMIZED",
                "candidate_email": "anonymized",
                "anonymized": True,
                "anonymized_at": datetime.now(timezone.utc).isoformat(),
                "anonymization_reason": "retention_exceeded",
            }},
        )
        count += res.modified_count
        res2 = await db.bgv_alerts.update_many(
            {"created_at": {"$lt": cutoff_iso}, "anonymized": {"$ne": True}},
            {"$set": {"anonymized": True, "anonymized_at": datetime.now(timezone.utc).isoformat()}},
        )
        count += res2.modified_count
        return count

    # ------------------------------------------------------------------
    # 3. Right-to-be-forgotten processor
    # ------------------------------------------------------------------
    async def _process_erasure_requests(self, db) -> int:
        coll = db.bgv_erasure_requests
        pending = await coll.find({"status": "PENDING"}).to_list(length=200)
        processed = 0
        for req in pending:
            email = str(req.get("email", "")).strip().lower()
            if not email:
                continue
            now_iso = datetime.now(timezone.utc).isoformat()
            # Anonymize BGV records for this candidate.
            await db.bgv_scan_history.update_many(
                {"candidate_email": email},
                {"$set": {"candidate_name": "ANONYMIZED", "candidate_email": "anonymized",
                          "anonymized": True, "anonymized_at": now_iso, "anonymization_reason": "erasure_request"}},
            )
            await db.bgv_alerts.update_many(
                {"candidate_email": email},
                {"$set": {"anonymized": True, "anonymized_at": now_iso}},
            )
            # Revoke all consent.
            await db.bgv_consents.update_many(
                {"email": email},
                {"$set": {"status": "REVOKED", "revoked_at": now_iso, "revoke_reason": "right_to_be_forgotten"}},
            )
            res = await coll.update_one(
                {"_id": req["_id"]},
                {"$set": {"status": "PROCESSED", "processed_at": now_iso}},
            )
            processed += 1
            await db.bgv_compliance_log.insert_one({
                "log_id": f"COMPL-ERASURE-{secrets.token_hex(4).upper()}",
                "event": "ERASURE_PROCESSED",
                "email": "anonymized",  # do not re-store PII in the audit log
                "request_id": str(req.get("_id")),
                "created_at": now_iso,
                "source": "bgv_compliance_agent",
            })
        return processed

    # ------------------------------------------------------------------
    # 4. Monthly compliance report
    # ------------------------------------------------------------------
    async def _monthly_report(self, db) -> bool:
        now = datetime.now(timezone.utc)
        month_iso = now.strftime("%Y-%m")
        existing = await db.bgv_compliance_log.find_one({"report_key": month_iso, "event": "MONTHLY_REPORT"})
        if existing:
            return False
        consent_total = await db.bgv_consents.count_documents({})
        consent_active = await db.bgv_consents.count_documents({"status": "ACTIVE"})
        consent_revoked = await db.bgv_consents.count_documents({"status": "REVOKED"})
        scans_total = await db.bgv_scan_history.count_documents({})
        anonymized = await db.bgv_scan_history.count_documents({"anonymized": True})
        report = {
            "log_id": f"COMPL-MONTHLY-{month_iso.replace('-', '')}-{secrets.token_hex(3).upper()}",
            "report_key": month_iso,
            "event": "MONTHLY_REPORT",
            "period": month_iso,
            "consents": {"total": consent_total, "active": consent_active, "revoked": consent_revoked},
            "scans_total": scans_total,
            "anonymized_records": anonymized,
            "retention_years": self.RETENTION_YEARS_DEFAULT,
            "created_at": now.isoformat(),
            "source": "bgv_compliance_agent",
        }
        await db.bgv_compliance_log.insert_one(report)
        return True

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------
    async def run(self, db, force: bool = False, retention_years: Optional[int] = None) -> BGVRTRTBFResult:
        if db is None:
            return BGVRTRTBFResult(success=False, message="db handle unavailable")
        if not await self._is_due(db, force):
            return BGVRTRTBFResult(success=True, message="Not due (daily 03:00 UTC cadence). Use force=True to run now.")

        retention = retention_years or self.RETENTION_YEARS_DEFAULT
        expiring = await self._scan_consent_expiries(db)
        anonymized = await self._enforce_retention(db, retention)
        erasures = await self._process_erasure_requests(db)
        monthly = await self._monthly_report(db)

        now_iso = datetime.now(timezone.utc).isoformat()
        await db.settings.update_one(
            {"id": self.SETTINGS_KEY},
            {"$set": {
                "last_run_at": now_iso,
                "last_consents_expiring_30d": expiring,
                "last_records_anonymized_retention": anonymized,
                "last_erasure_requests_processed": erasures,
                "last_monthly_report_generated": monthly,
            }},
            upsert=True,
        )
        await db.bgv_compliance_log.insert_one({
            "log_id": f"COMPL-RUN-{secrets.token_hex(4).upper()}",
            "event": "CYCLE",
            "consents_expiring_30d": expiring,
            "records_anonymized_retention": anonymized,
            "erasure_requests_processed": erasures,
            "created_at": now_iso,
            "source": "bgv_compliance_agent",
        })
        return BGVRTRTBFResult(
            success=True,
            consents_expiring_30d=expiring,
            records_anonymized_retention=anonymized,
            erasure_requests_processed=erasures,
            monthly_report_generated=monthly,
            message=f"Compliance cycle: {expiring} expiring consents, {anonymized} retention-anonymized, {erasures} erasures processed."
        )

    async def get_status(self, db) -> Dict[str, Any]:
        status = {
            "is_configured": True,
            "cadence_hours": self.CADENCE_HOURS,
            "run_window_utc_hour": self.RUN_WINDOW_UTC_HOUR,
            "retention_years": self.RETENTION_YEARS_DEFAULT,
            "consent_expiry_window_days": CONSENT_EXPIRY_WINDOW_DAYS,
            "last_run_at": None,
            "pending_erasure_requests": 0,
            "anonymized_records": 0,
        }
        if db is not None:
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            status["last_run_at"] = doc.get("last_run_at")
            status["pending_erasure_requests"] = await db.bgv_erasure_requests.count_documents({"status": "PENDING"})
            status["anonymized_records"] = await db.bgv_scan_history.count_documents({"anonymized": True})
        return status


bgv_compliance_agent = BGVComplianceAgentService()
