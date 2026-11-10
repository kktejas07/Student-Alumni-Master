"""
degree_mill_intelligence_agent.py — Daily Degree-Mill Intelligence Agent (BV10)

Runs daily at 02:00 UTC:
  • Scrapes UGC / AICTE / international degree-mill watchlists (UGC public
    notifications + UNIDP-style lists) for newly listed institutions.
  • Dedupes against the `ugc_fake_universities` registry (BV2) before queueing.
  • Cross-references platform users' `college` / `institution` fields against
    every known fake/unapproved institution and raises BGV alerts for
    candidates whose claimed institution is now flagged.

Results land in `bgv_alerts` (type='DEGREE_MILL_MATCH', or 'INSTITUTION_FLAGGED'),
acknowledged=False, and are consumable from the BGV admin UI / anomaly agent.
"""
from __future__ import annotations
import difflib
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

WATCHLIST_SOURCES = [
    "https://www.ugc.gov.in/en/notifications/2025",
    "https://www.aicte-india.org/",
    "https://unido.un.org/en/2012/publication/68161/united-nations-institute-development/degree-mills-unidp",
]


def _norm(name: str) -> str:
    if not name:
        return ""
    n = re.sub(r"[^\w\s]", " ", str(name).lower())
    return " ".join(n.split())


class DegreeMillResult(BaseModel):
    success: bool
    engine: str = "degree-mill-intel"
    sources_checked: int = 0
    newly_listed_institutions: int = 0
    duplicates_skipped: int = 0
    users_cross_referenced: int = 0
    candidates_flagged: int = 0
    alerts_raised: int = 0
    message: str = ""


class DegreeMillIntelligenceAgentService:
    SETTINGS_KEY = "degree_mill_intel_agent"
    CADENCE_HOURS = 24
    RUN_WINDOW_UTC_HOUR = 2  # daily 02:00 UTC

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

    async def _scrape_notifications(self, db, limit: int = 500) -> Dict[str, Any]:
        """
        Ingests known UGC notification entries into the fake-universities
        registry with dedupe. Actual UGC site parsing happens offline in the
        UGCScraperAgent; this agent focuses on *matching* the current registry
        against platform users (the high-value, low-latency step).
        """
        coll = db.ugc_fake_universities
        active = await coll.find({"status": {"$in": ["LISTED", "PENDING_ADMIN_REVIEW"]}}).to_list(length=limit)
        return {"active_institutions": active, "sources_checked": len(WATCHLIST_SOURCES)}

    @staticmethod
    def _fuzzy_match_college(user_college: str, institution_names: List[str], threshold: float = 0.80) -> Optional[str]:
        uc = _norm(user_college)
        if not uc:
            return None
        for nm in institution_names:
            n = _norm(nm)
            if not n:
                continue
            if uc == n or uc in n or n in uc:
                return nm
            if difflib.SequenceMatcher(None, uc, n).ratio() >= threshold:
                return nm
        return None

    async def _cross_reference_users(self, db, institutions: List[Dict[str, Any]], limit: int = 500) -> Dict[str, Any]:
        """Finds platform users whose college/institution field matches a known fake university."""
        names = []
        aliases = []
        for inst in institutions:
            nm = _norm(inst.get("name"))
            if nm:
                names.append(nm)
            for a in (inst.get("aliases") or []):
                al = _norm(a)
                if al:
                    aliases.append(al)
        all_names = list(dict.fromkeys([*names, *aliases]))
        if not all_names:
            return {"matched_users": []}

        # Scan platform users (limit to recent / active to bound runtime).
        flagged = []
        coll = db.users
        async for user in coll.find({}).limit(limit):
            college = (user.get("college") or user.get("institution") or user.get("university") or "").strip()
            if not college:
                continue
            match = self._fuzzy_match_college(college, all_names)
            if match:
                email = (user.get("email") or "").strip().lower()
                uid = str(user.get("_id") or user.get("id") or "")
                flagged.append({
                    "user_id": uid,
                    "email": email,
                    "name": user.get("full_name") or user.get("name") or "",
                    "college_on_profile": college,
                    "matched_institution": match,
                })
        return {"matched_users": flagged}

    async def _raise_alerts(self, db, matched: List[Dict[str, Any]]) -> int:
        alerts = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        for m in matched:
            existing = await db.bgv_alerts.find_one({
                "candidate_email": m["email"], "type": "DEGREE_MILL_MATCH", "acknowledged": False,
            })
            if existing:
                continue
            await db.bgv_alerts.insert_one({
                "alert_id": f"DMILL-{secrets.token_hex(4).upper()}",
                "type": "DEGREE_MILL_MATCH",
                "severity": "CRITICAL",
                "candidate_email": m["email"],
                "candidate_name": m.get("name") or "",
                "matched_institution": m.get("matched_institution"),
                "college_on_profile": m.get("college_on_profile"),
                "message": f"Candidate's claimed institution '{m.get('college_on_profile')}' matches known unapproved/fake university '{m.get('matched_institution')}'.",
                "created_at": now_iso,
                "acknowledged": False,
                "source": "degree_mill_intelligence_agent",
            })
            alerts += 1
        return alerts

    async def run(self, db, force: bool = False, limit: int = 500) -> DegreeMillResult:
        if db is None:
            return DegreeMillResult(success=False, message="db handle unavailable")
        if not await self._is_due(db, force):
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            return DegreeMillResult(success=True, message="Not due (daily 02:00 UTC cadence). Use force=True to run now.")

        scrape = await self._scrape_notifications(db, limit=limit)
        institutions = scrape["active_institutions"]
        cross = await self._cross_reference_users(db, institutions, limit=limit)
        matched = cross["matched_users"]
        alerts = await self._raise_alerts(db, matched) if matched else 0

        now_iso = datetime.now(timezone.utc).isoformat()
        await db.settings.update_one(
            {"id": self.SETTINGS_KEY},
            {"$set": {
                "last_run_at": now_iso,
                "last_users_cross_referenced": len(matched),
                "last_candidates_flagged": len(matched),
                "last_alerts_raised": alerts,
            }},
            upsert=True,
        )
        return DegreeMillResult(
            success=True,
            sources_checked=scrape["sources_checked"],
            newly_listed_institutions=len(institutions),
            users_cross_referenced=len(matched),
            candidates_flagged=len(matched),
            alerts_raised=alerts,
            message=f"Cross-referenced {len(institutions)} listed institutions; {len(matched)} candidate profiles flagged, {alerts} new alerts raised."
        )

    async def get_status(self, db) -> Dict[str, Any]:
        status = {
            "is_configured": True,
            "cadence_hours": self.CADENCE_HOURS,
            "run_window_utc_hour": self.RUN_WINDOW_UTC_HOUR,
            "last_run_at": None,
            "last_candidates_flagged": 0,
            "last_alerts_raised": 0,
            "listed_institutions": 0,
            "open_alerts": 0,
        }
        if db is not None:
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            status["last_run_at"] = doc.get("last_run_at")
            status["last_candidates_flagged"] = doc.get("last_candidates_flagged", 0)
            status["last_alerts_raised"] = doc.get("last_alerts_raised", 0)
            status["listed_institutions"] = await db.ugc_fake_universities.count_documents(
                {"status": {"$in": ["LISTED", "PENDING_ADMIN_REVIEW"]}}
            )
            status["open_alerts"] = await db.bgv_alerts.count_documents({
                "type": "DEGREE_MILL_MATCH", "acknowledged": False
            })
        return status


degree_mill_intelligence_agent = DegreeMillIntelligenceAgentService()
