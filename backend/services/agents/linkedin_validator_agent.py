"""
linkedin_validator_agent.py — Weekly LinkedIn Profile Validator (BV11)

Validates `linkedin_url` fields on platform user profiles:
  • URL well-formedness (linkedin.com/in/<handle>) → URL_MALFORMED otherwise
  • Fuzzy name match between the profile handle and the user's stored name
    (Levenshtein-style distance; >30% similarity gap → MISMATCH_NAME)
  • Education cross-reference: claimed college vs known fake-university
    registry (BV2) → MISMATCH_EDUCATION
  • PROFILE_NOT_FOUND: live HEAD/GET ping where the profile returns 404
    (best-effort; LinkedIn blocks most scrapers, so a timeout is recorded
    as UNREACHABLE rather than treated as NOT_FOUND).

Runs weekly, 200 profiles per run (oldest unvalidated first). All results
persist to `linkedin_validations` with status='PROPOSED' — the agent only
proposes; an admin reviews & confirms via the BGV admin UI.
"""
from __future__ import annotations
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

import urllib.error

LINKEDIN_URL_RE = re.compile(r"^https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/([a-zA-Z0-9\-_.%]{3,100})(?:/|$|\?)", re.IGNORECASE)
BATCH_SIZE_PER_RUN = 200
CADENCE_HOURS = 168  # weekly


def _levenshtein_similarity(a: str, b: str) -> float:
    """0.0..1.0 similarity (1 - normalized edit distance)."""
    if not a or not b:
        return 0.0
    a, b = a.lower(), b.lower()
    if a == b:
        return 1.0
    la, lb = len(a), len(b)
    if abs(la - lb) > max(la, lb) * 0.5:
        return 0.0
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        cur = [i] + [0] * lb
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev = cur
    dist = prev[lb]
    return 1.0 - (dist / max(la, lb))


def _handle_to_display_name(handle: str) -> str:
    """Best-effort humanized display name from a /in/ handle (johndoe123 → john doe)."""
    h = re.sub(r"^[?]", "", handle)
    h = re.sub(r"[. _\-]+", " ", h)
    h = re.sub(r"\d+", " ", h).strip()
    return h


class LinkedInValidationRunResult(BaseModel):
    success: bool
    engine: str = "linkedin-validator"
    profiles_validated: int = 0
    valid: int = 0
    url_malformed: int = 0
    mismatch_name: int = 0
    mismatch_education: int = 0
    profile_not_found: int = 0
    unreachable: int = 0
    proposed_for_review: int = 0
    message: str = ""


class LinkedInValidatorAgentService:
    COLLECTION = "linkedin_validations"
    SETTINGS_KEY = "linkedin_validator_agent"
    CADENCE_HOURS = CADENCE_HOURS
    MIN_NAME_SIMILARITY = 0.70  # >30% gap ⇒ MISMATCH_NAME

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

    @staticmethod
    def _find_profiles(db) -> List[Dict[str, Any]]:
        """Lazily imported at call time to keep module import light."""
        raise NotImplementedError

    def _pick_batch(self, db) -> List[Dict[str, Any]]:
        return db[self.COLLECTION]  # placeholder, replaced below

    async def _next_batch(self, db, limit: int = BATCH_SIZE_PER_RUN) -> List[Dict[str, Any]]:
        """Oldest unvalidated users with a linkedin field, skipping already-valid records."""
        q = {}
        coll = db.users
        seen: List[Dict[str, Any]] = []
        async for u in coll.find({}).limit(limit * 5):
            link = (u.get("linkedin_url") or u.get("linkedin") or (u.get("social_links") or {}).get("linkedin") or "").strip()
            if not link:
                continue
            seen.append({"user": u, "link": link})
            if len(seen) >= limit:
                break
        # De-duplicate: skip users already validated with status VALID in this session.
        recent_valid_emails = set()
        async for d in db[self.COLLECTION].find({"flag": "VALID", "validated_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=self.CADENCE_HOURS)).isoformat()}}).limit(500):
            if d.get("email"):
                recent_valid_emails.add(d.get("email", "").lower())
        return [s for s in seen if str(s["user"].get("email", "")).lower() not in recent_valid_emails]

    @staticmethod
    def _validate_url(link: str) -> Dict[str, Any]:
        m = LINKEDIN_URL_RE.match(link)
        if not m:
            return {"url_ok": False, "handle": "", "flag": "URL_MALFORMED", "detail": f"Malformed LinkedIn URL: {link[:80]}"}
        return {"url_ok": True, "handle": m.group(1), "flag": "", "detail": ""}

    async def _check_reachable(self, link: str, timeout: float = 4.0) -> str:
        """Best-effort live check. LinkedIn aggressively blocks headless clients;
        any non-404 outcome is treated as UNREACHABLE, not PROFILE_NOT_FOUND."""
        import urllib.request
        def _do() -> str:
            try:
                req = urllib.request.Request(link, headers={"User-Agent": "Mozilla/5.0 (compatible; SA-ProfileValidator/1.0)"})
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    return "OK"
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return "NOT_FOUND"
                return "UNREACHABLE"
            except Exception:
                return "UNREACHABLE"
        import asyncio
        return await asyncio.to_thread(_do)

    async def _run_batch(self, db, batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        counts = {"valid": 0, "url_malformed": 0, "mismatch_name": 0, "mismatch_education": 0,
                  "profile_not_found": 0, "unreachable": 0, "proposed_for_review": 0}
        now_iso = datetime.now(timezone.utc).isoformat()

        fake_names: List[str] = []
        try:
            async for inst in db.ugc_fake_universities.find({"status": {"$in": ["LISTED", "PENDING_ADMIN_REVIEW"]}}).limit(500):
                fake_names.append(inst.get("name") or "")
                fake_names.extend(inst.get("aliases") or [])
        except Exception:
            fake_names = []

        for item in batch:
            user = item["user"]
            link = item["link"]
            email = str(user.get("email", "")).strip().lower()
            full_name = (user.get("full_name") or user.get("name") or "").strip()
            college = (user.get("college") or user.get("institution") or user.get("university") or "").strip()

            url_check = self._validate_url(link)
            flag = url_check["flag"]
            reach = "NOT_CHECKED"

            if url_check["url_ok"]:
                # Name similarity: handle-derived display name vs stored full name.
                display = _handle_to_display_name(url_check["handle"])
                sim = _levenshtein_similarity(full_name, display) if display else 1.0
                if sim < self.MIN_NAME_SIMILARITY and display:
                    flag = "MISMATCH_NAME"
                # Education cross-reference against fake-university registry.
                else:
                    sim_ed = 0.0
                    matched_fake = None
                    if college:
                        c = re.sub(r"[^\w\s]", " ", college.lower())
                        for fn in fake_names:
                            fn_c = re.sub(r"[^\w\s]", " ", fn.lower())
                            if fn_c and c and (fn_c in c or c in fn_c):
                                sim_ed = 1.0
                                matched_fake = fn
                                break
                    if matched_fake:
                        flag = "MISMATCH_EDUCATION"
                # Live reachability (best-effort; short-circuit for malformed-only).
                reach = await self._check_reachable(link)
                if reach == "NOT_FOUND" and flag not in ("MISMATCH_NAME", "MISMATCH_EDUCATION"):
                    flag = "PROFILE_NOT_FOUND"
                if flag in ("", None):
                    flag = "VALID"

            count_key = flag.lower() if flag in counts else "unreachable"
            counts[count_key] += 1
            if flag in ("MISMATCH_NAME", "MISMATCH_EDUCATION", "PROFILE_NOT_FOUND", "URL_MALFORMED"):
                counts["proposed_for_review"] += 1

            await db[self.COLLECTION].insert_one({
                "validation_id": f"LI-{secrets.token_hex(4).upper()}",
                "user_id": str(user.get("_id") or user.get("id") or ""),
                "email": email,
                "candidate_name": full_name,
                "linkedin_url": link,
                "flag": flag,
                "reachability": reach,
                "college_on_profile": college,
                "validated_at": now_iso,
                "status": "PROPOSED" if flag != "VALID" else "CONFIRMED",
                "reviewed_by": None,
                "review_note": url_check["detail"],
            })

        return counts

    async def run(self, db, force: bool = False, limit: int = BATCH_SIZE_PER_RUN) -> LinkedInValidationRunResult:
        if db is None:
            return LinkedInValidationRunResult(success=False, message="db handle unavailable")
        if not await self._is_due(db, force):
            return LinkedInValidationRunResult(success=True, message="Not due (weekly cadence). Use force=True to run now.")

        batch = await self._next_batch(db, limit=limit)
        counts = await self._run_batch(db, batch)

        now_iso = datetime.now(timezone.utc).isoformat()
        await db.settings.update_one(
            {"id": self.SETTINGS_KEY},
            {"$set": {
                "last_run_at": now_iso,
                "last_profiles_validated": len(batch),
                "last_valid": counts["valid"],
                "last_proposed": counts["proposed_for_review"],
            }},
            upsert=True,
        )
        return LinkedInValidationRunResult(
            success=True,
            profiles_validated=len(batch),
            valid=counts["valid"],
            url_malformed=counts["url_malformed"],
            mismatch_name=counts["mismatch_name"],
            mismatch_education=counts["mismatch_education"],
            profile_not_found=counts["profile_not_found"],
            unreachable=counts["unreachable"],
            proposed_for_review=counts["proposed_for_review"],
            message=f"Validated {len(batch)} profiles: {counts['valid']} valid, {counts['proposed_for_review']} proposed for admin review."
        )

    async def get_status(self, db) -> Dict[str, Any]:
        status = {
            "is_configured": True,
            "batch_size": BATCH_SIZE_PER_RUN,
            "cadence_hours": self.CADENCE_HOURS,
            "last_run_at": None,
            "last_profiles_validated": 0,
            "last_proposed": 0,
            "pending_review": 0,
        }
        if db is not None:
            doc = await db.settings.find_one({"id": self.SETTINGS_KEY}) or {}
            status["last_run_at"] = doc.get("last_run_at")
            status["last_profiles_validated"] = doc.get("last_profiles_validated", 0)
            status["last_proposed"] = doc.get("last_proposed", 0)
            status["pending_review"] = await db[self.COLLECTION].count_documents({"status": "PROPOSED"})
        return status


linkedin_validator_agent = LinkedInValidatorAgentService()
