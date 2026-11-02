"""
ugc_scraper_agent.py — Daily UGC Notifications Scraper Agent
Scrapes UGC public notifications (fake-university / degree-mill warning lists)
and queues candidate entries into the ugc_fake_universities collection with
status='PENDING_ADMIN_REVIEW' so an admin can approve, edit, or discard them
via the BGV admin CRUD endpoints. Entries that already match a listed
institution (fuzzy name/alias match) are marked as duplicates and skipped.
"""
from __future__ import annotations
import difflib
import re
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UGCScrapeRequest(BaseModel):
    notification_text: Optional[str] = None
    source_url: Optional[str] = "https://www.ugc.gov.in"
    auto_review_min_similarity: Optional[float] = 0.85


class UGCScrapeResult(BaseModel):
    success: bool
    engine: str = "ugc-scrape"
    new_candidates_queued: int = 0
    duplicates_skipped: int = 0
    queue_depth: int = 0
    entries: List[Dict[str, Any]] = []
    message: str = ""


def _normalize_text(txt: str) -> str:
    if not txt:
        return ""
    txt = str(txt).lower()
    txt = re.sub(r"[^\w\s]", " ", txt)
    return " ".join(txt.split())


class UGCScraperAgentService:
    COLLECTION = "ugc_fake_universities"

    @staticmethod
    def _extract_candidates(notification_text: str) -> List[Dict[str, Any]]:
        """
        Extracts institution names from UGC-style notification text. UGC
        notifications list fake institutions as bullet lines, e.g.
        '2. Commercial University Ltd., Daryaganj, Delhi' or
        'Commercial University Ltd. (Daryaganj, Delhi)'.
        """
        candidates: List[Dict[str, Any]] = []
        seen = set()
        for raw_line in re.split(r"[\n;]", notification_text or ""):
            line = raw_line.strip()
            m = re.match(r"^(?:\d+[\.\)]\s*)?(.+?)$", line)
            if not m:
                continue
            name = m.group(1)
            name = re.sub(r"\(.*?\)\s*$", "", name).strip()
            # Keep lines that plausibly look like institution names
            if len(name) < 6 or len(name) > 120:
                continue
            if not re.search(r"\b(universit|institute|vidyapith|vidyapeeth|parishad|shiksha|academ|college|school|deemed|sanskrit)\b", name, re.IGNORECASE):
                continue
            key = _normalize_text(name)
            if key in seen:
                continue
            seen.add(key)
            m2 = re.search(r"\(([^)]{2,40})\)\s*$", raw_line)
            location = m2.group(1).strip() if m2 else ""
            state, city = (location.split(",") + [None])[:2] if location else (None, None)
            candidates.append({
                "name": name,
                "city": (city or "").strip() or None,
                "state": (state or "").strip() or None,
            })
        return candidates

    async def scrape_and_queue(self, req: UGCScrapeRequest, db=None) -> UGCScrapeResult:
        """Runs one scrape cycle over provided notification text and queues entries."""
        if db is None:
            return UGCScrapeResult(success=False, message="db handle unavailable; cannot queue candidates")

        coll = db[self.COLLECTION]
        existing = await coll.find({"status": {"$ne": "DISCARDED"}}).to_list(5000)
        existing_norm = []
        for e in existing:
            for nm in [e.get("name"), * (e.get("aliases") or [])]:
                n = _normalize_text(nm)
                if n:
                    existing_norm.append(n)

        def is_duplicate(name: str) -> bool:
            n = _normalize_text(name)
            for ex in existing_norm:
                if n == ex or n in ex or ex in n:
                    return True
                if difflib.SequenceMatcher(None, n, ex).ratio() >= req.auto_review_min_similarity:
                    return True
            return False

        queued: List[Dict[str, Any]] = []
        duplicates = 0
        for cand in self._extract_candidates(req.notification_text or ""):
            if is_duplicate(cand["name"]):
                duplicates += 1
                continue
            now_iso = datetime.now(timezone.utc).isoformat()
            doc = {
                "id": f"UGC-SCRAPE-{secrets.token_hex(2).upper()}",
                "name": cand["name"],
                "state": cand.get("state"),
                "city": cand.get("city"),
                "aliases": [],
                "reason": "Queued by UGC Notifications Scraper — pending admin verification",
                "listed_date": now_iso[:10],
                "risk_level": "CRITICAL",
                "source": req.source_url,
                "status": "PENDING_ADMIN_REVIEW",
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            await coll.insert_one(doc)
            queued.append(doc)

        queue_depth = await coll.count_documents({"status": "PENDING_ADMIN_REVIEW"})

        await db.settings.update_one(
            {"id": "ugc_scraper_agent"},
            {"$set": {
                "last_run_at": datetime.now(timezone.utc).isoformat(),
                "last_queue_depth": queue_depth,
            }},
            upsert=True,
        )

        return UGCScrapeResult(
            success=True,
            new_candidates_queued=len(queued),
            duplicates_skipped=duplicates,
            queue_depth=queue_depth,
            entries=queued,
            message=f"Queued {len(queued)} candidate institutions for admin review; skipped {duplicates} duplicates."
        )

    async def get_status(self, db=None) -> Dict[str, Any]:
        status = {"is_configured": True, "last_run_at": None, "queue_depth": 0}
        if db is not None:
            doc = await db.settings.find_one({"id": "ugc_scraper_agent"}) or {}
            status["last_run_at"] = doc.get("last_run_at")
            status["queue_depth"] = await db[self.COLLECTION].count_documents({"status": "PENDING_ADMIN_REVIEW"})
        return status


# Global singleton
ugc_scraper_agent = UGCScraperAgentService()
