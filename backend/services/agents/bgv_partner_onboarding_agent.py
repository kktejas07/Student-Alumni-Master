"""
bgv_partner_onboarding_agent.py — BGV Enterprise Partner Onboarding Agent (BV14)

Drives the BGV enterprise partner lifecycle:
    APPLIED → SANDBOX → VALIDATED → PRODUCTION → SUSPENDED

Duties (runnable on a schedule or on-demand):
  • Issue sandbox API keys with mock BGV payloads for newly-APPLIED partners
    so they can integrate before live credentials are issued.
  • Nudge partners who have been idle in SANDBOX for 7+ days.
  • Promote a partner to VALIDATED once they've made 10+ successful sandbox
    calls (as recorded in `bgv_sandbox_calls`).
  • Raise quota alerts at 80% / 90% / 100% of a PRODUCTION partner's allotted
    monthly call quota.

All partner records live in `bgv_enterprise_partners`.
"""
from __future__ import annotations
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

LIFECYCLE = ["APPLIED", "SANDBOX", "VALIDATED", "PRODUCTION", "SUSPENDED"]
NUDGE_IDLE_DAYS = 7
SANDBOX_PROMOTE_CALLS = 10
QUOTA_THRESHOLDS = [0.80, 0.90, 1.00]
CADENCE_HOURS = 24


class PartnerOnboardingResult(BaseModel):
    success: bool
    engine: str = "bgv-partner-onboarding"
    partners_tracked: int = 0
    sandbox_keys_issued: int = 0
    nudges_sent: int = 0
    partners_promoted_validated: int = 0
    quota_alerts_raised: int = 0
    message: str = ""


class BGVPartnerOnboardingAgentService:
    COLLECTION = "bgv_enterprise_partners"
    SANDBOX_CALLS = "bgv_sandbox_calls"
    SETTINGS_KEY = "bgv_partner_onboarding_agent"
    QUOTA_THRESHOLDS = QUOTA_THRESHOLDS
    CADENCE_HOURS = CADENCE_HOURS

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
    # Sandbox key issuance
    # ------------------------------------------------------------------
    def _issue_sandbox_key(self, partner_id: str) -> str:
        return f"SBX-{partner_id}-{secrets.token_hex(12)}"

    async def _issue_sandbox_keys_for_applied(self, db) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        issued = 0
        async for p in db[self.COLLECTION].find({"lifecycle": "APPLIED", "sandbox_key": None}):
            key = self._issue_sandbox_key(str(p.get("partner_id", p.get("_id", ""))))
            res = await db[self.COLLECTION].update_one(
                {"_id": p["_id"]},
                {"$set": {
                    "sandbox_key": key,
                    "lifecycle": "SANDBOX",
                    "sandbox_key_issued_at": now_iso,
                    "sandbox_quota": p.get("sandbox_quota", 100),
                }},
            )
            if res.modified_count:
                issued += 1
        return issued

    # ------------------------------------------------------------------
    # 7-day idle nudge
    # ------------------------------------------------------------------
    async def _nudge_idle_sandbox(self, db) -> int:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=NUDGE_IDLE_DAYS)).isoformat()
        nudged = 0
        async for p in db[self.COLLECTION].find({"lifecycle": "SANDBOX", "sandbox_key_issued_at": {"$ne": None}}):
            last_call = await db[self.SANDBOX_CALLS].find_one(
                {"partner_id": str(p.get("partner_id", p.get("_id", "")))},
                sort=[("called_at", -1)],
            )
            last_active = last_call.get("called_at") if last_call else p.get("sandbox_key_issued_at")
            if last_active and last_active < cutoff:
                res = await db[self.COLLECTION].update_one(
                    {"_id": p["_id"]},
                    {"$set": {"last_nudged_at": datetime.now(timezone.utc).isoformat(),
                              "nudges_sent": (p.get("nudges_sent") or 0) + 1}},
                )
                if res.modified_count:
                    nudged += 1
        return nudged

    # ------------------------------------------------------------------
    # Sandbox → VALIDATED promotion
    # ------------------------------------------------------------------
    async def _promote_validated(self, db) -> int:
        promoted = 0
        async for p in db[self.COLLECTION].find({"lifecycle": "SANDBOX"}):
            pid = str(p.get("partner_id", p.get("_id", "")))
            calls = await db[self.SANDBOX_CALLS].count_documents({
                "partner_id": pid, "status": "SUCCESS",
            })
            if calls >= SANDBOX_PROMOTE_CALLS:
                res = await db[self.COLLECTION].update_one(
                    {"_id": p["_id"]},
                    {"$set": {"lifecycle": "VALIDATED", "sandbox_calls_observed": calls,
                              "validated_at": datetime.now(timezone.utc).isoformat()}},
                )
                if res.modified_count:
                    promoted += 1
        return promoted

    # ------------------------------------------------------------------
    # Quota alerts at 80/90/100%
    # ------------------------------------------------------------------
    async def _check_quota_alerts(self, db) -> int:
        alerts = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        async for p in db[self.COLLECTION].find({"lifecycle": "PRODUCTION"}):
            pid = str(p.get("partner_id", p.get("_id", "")))
            quota = p.get("monthly_quota") or p.get("production_quota") or 0
            if not quota:
                continue
            used = await db.bgv_api_calls.count_documents({
                "partner_id": pid,
                "called_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()},
            })
            ratio = (used / quota) if quota else 0.0
            already = set(p.get("quota_alerts_sent") or [])
            for th in self.QUOTA_THRESHOLDS:
                if ratio >= th and f"{int(th*100)}%" not in already:
                    alert = f"{int(th*100)}%"
                    await db.bgv_anomaly_alerts.insert_one({
                        "anomaly_id": f"BGV-QUOTA-{pid}-{alert.replace('%', '')}-{secrets.token_hex(3).upper()}",
                        "dedupe_key": f"QUOTA-{pid}-{alert}",
                        "type": "PARTNER_QUOTA_ALERT",
                        "severity": "CRITICAL" if th >= 1.0 else ("HIGH" if th >= 0.9 else "MEDIUM"),
                        "detail": {"partner_id": pid, "quota": quota, "used": used, "threshold": alert,
                                   "ratio": round(ratio, 3)},
                        "status": "OPEN",
                        "created_at": now_iso,
                        "source": "bgv_partner_onboarding_agent",
                    })
                    already.add(alert)
                    await db[self.COLLECTION].update_one({"_id": p["_id"]}, {"$set": {"quota_alerts_sent": list(already)}})
                    alerts += 1
        return alerts

    # ------------------------------------------------------------------
    # Lifecycle transition
    # ------------------------------------------------------------------
    async def transition(self, db, partner_id: str, to_lifecycle: str) -> Dict[str, Any]:
        to_lifecycle = (to_lifecycle or "").upper()
        if to_lifecycle not in LIFECYCLE:
            return {"ok": False, "error": f"lifecycle must be one of {LIFECYCLE}"}
        res = await db[self.COLLECTION].update_one(
            {"$or": [{"partner_id": partner_id}, {"_id": partner_id}]},
            {"$set": {"lifecycle": to_lifecycle, "lifecycle_changed_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"ok": res.matched_count > 0, "partner_id": partner_id, "lifecycle": to_lifecycle}

    async def list_partners(self, db, lifecycle: Optional[str] = None, limit: int = 200) -> Dict[str, Any]:
        q = {"lifecycle": lifecycle} if lifecycle else {}
        docs = await db[self.COLLECTION].find(q).sort("created_at", -1).limit(limit).to_list(length=limit)
        total = await db[self.COLLECTION].count_documents(q)
        return {"total": total, "items": docs}

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------
    async def run(self, db, force: bool = False) -> PartnerOnboardingResult:
        if db is None:
            return PartnerOnboardingResult(success=False, message="db handle unavailable")
        if not await self._is_due(db, force):
            return PartnerOnboardingResult(success=True, message="Not due (daily cadence). Use force=True to run now.")
        partners = await db[self.COLLECTION].count_documents({})
        sandbox_issued = await self._issue_sandbox_keys_for_applied(db)
        nudges = await self._nudge_idle_sandbox(db)
        promoted = await self._promote_validated(db)
        quota = await self._check_quota_alerts(db)

        now_iso = datetime.now(timezone.utc).isoformat()
        await db.settings.update_one(
            {"id": self.SETTINGS_KEY},
            {"$set": {
                "last_run_at": now_iso,
                "last_partners_tracked": partners,
                "last_sandbox_issued": sandbox_issued,
                "last_nudges_sent": nudges,
                "last_promoted_validated": promoted,
                "last_quota_alerts": quota,
            }},
            upsert=True,
        )
        return PartnerOnboardingResult(
            success=True,
            partners_tracked=partners,
            sandbox_keys_issued=sandbox_issued,
            nudges_sent=nudges,
            partners_promoted_validated=promoted,
            quota_alerts_raised=quota,
            message=f"Onboarding cycle: {sandbox_issued} sandbox keys, {nudges} nudges, {promoted} promoted, {quota} quota alerts."
        )

    async def get_status(self, db) -> Dict[str, Any]:
        status = {
            "is_configured": True,
            "lifecycle": LIFECYCLE,
            "cadence_hours": self.CADENCE_HOURS,
            "nudge_idle_days": NUDGE_IDLE_DAYS,
            "sandbox_promote_calls": SANDBOX_PROMOTE_CALLS,
            "quota_thresholds": [f"{int(t*100)}%" for t in self.QUOTA_THRESHOLDS],
            "last_run_at": None,
            "partners_by_lifecycle": {},
        }
        if db is not None:
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            status["last_run_at"] = doc.get("last_run_at")
            for lc in LIFECYCLE:
                status["partners_by_lifecycle"][lc] = await db[self.COLLECTION].count_documents({"lifecycle": lc})
        return status


bgv_partner_onboarding_agent = BGVPartnerOnboardingAgentService()
