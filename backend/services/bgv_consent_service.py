"""
bgv_consent_service.py — Candidate Consent Service (DPDP / GDPR aligned).

Every BGV scan (single or batch) is gated on an active, un-revoked consent
record for the candidate email. Consent tokens are signed, carry a
12-month default expiry, and can be revoked by the candidate at any time.

Collection schema: `bgv_consents`
{
    consent_id, email, candidate_name,
    token (public lookup key), sha_token (hashed token for integrity),
    status: ACTIVE | REVOKED | EXPIRED,
    scope: [fields the candidate authorized],
    requested_at, consented_at, expires_at, revoked_at,
    consent_version, ip, user_agent
}
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from core.db import db

CONSENT_DEFAULT_TTL_DAYS = 12 * 30  # ~12 months
CONSENT_EXPIRY_WINDOW_DAYS = 30


class BGVConsentService:
    COLLECTION = "bgv_consents"

    # ------------------------------------------------------------------
    # Token issuance
    # ------------------------------------------------------------------
    def _issue_token(self, email: str) -> str:
        """Signed token: base64url payload . signature (HMAC)."""
        payload = f"{email}|{secrets.token_hex(8)}|{secrets.token_hex(4)}"
        sig = hmac.new(
            self._signing_key().encode(), payload.encode(), hashlib.sha256
        ).hexdigest()[:32]
        import base64
        token = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=") + "." + sig
        return token

    @staticmethod
    def _signing_key() -> str:
        # Use a stable server-level secret when available; fall back to a
        # deterministic digest so tokens remain verifiable across restarts.
        try:
            import os
            env = os.environ.get("BGV_CONSENT_SIGNING_KEY", "")
            if env:
                return env
        except Exception:
            pass
        return hashlib.sha256(b"student-alumni-bg-consent-v1").hexdigest()

    def _token_signature_ok(self, token: str) -> bool:
        import base64
        parts = token.split(".")
        if len(parts) != 2:
            return False
        payload_b64, sig = parts
        try:
            pad = 4 - len(payload_b64) % 4
            payload = base64.urlsafe_b64decode(payload_b64 + "=" * pad).decode()
        except Exception:
            return False
        expected = hmac.new(
            self._signing_key().encode(), payload.encode(), hashlib.sha256
        ).hexdigest()[:32]
        return hmac.compare_digest(expected, sig)

    # ------------------------------------------------------------------
    # Request / verify / status
    # ------------------------------------------------------------------
    async def request_consent(
        self,
        email: str,
        candidate_name: str = "",
        scope: Optional[List[str]] = None,
        requested_by: str = "system",
    ) -> Dict[str, Any]:
        email = (email or "").strip().lower()
        if not email:
            return {"ok": False, "error": "email is required"}

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=CONSENT_DEFAULT_TTL_DAYS)
        token = self._issue_token(email)
        sha_token = hashlib.sha256(token.encode()).hexdigest()

        doc = {
            "email": email,
            "candidate_name": (candidate_name or "").strip(),
            "token": token,
            "sha_token": sha_token,
            "status": "PENDING",
            "scope": scope or [
                "identity", "education", "watchlist", "employment", "litigation",
            ],
            "requested_by": requested_by,
            "requested_at": now.isoformat(),
            "consented_at": None,
            "expires_at": expires_at.isoformat(),
            "revoked_at": None,
            "consent_version": 1,
        }
        existing = await db[self.COLLECTION].find_one({"email": email, "status": "PENDING"})
        if existing:
            # Re-issue: overwrite the stale pending token so the new token is the only live one.
            await db[self.COLLECTION].update_one(
                {"_id": existing["_id"]}, {"$set": {k: v for k, v in doc.items() if k != "email"}}
            )
            created = False
        else:
            await db[self.COLLECTION].insert_one(doc)
            created = True
        return {
            "ok": True,
            "email": email,
            "token": token,
            "expires_at": doc["expires_at"],
            "created": created,
        }

    async def verify_consent_token(self, token: str) -> Dict[str, Any]:
        """Public endpoint logic: is this consent link valid & actionable?"""
        if not self._token_signature_ok(token):
            return {"valid": False, "reason": "MALFORMED"}
        import base64
        payload_b64 = token.split(".")[0]
        try:
            pad = 4 - len(payload_b64) % 4
            payload = base64.urlsafe_b64decode(payload_b64 + "=" * pad).decode()
            email = payload.split("|")[0].strip().lower()
        except Exception:
            return {"valid": False, "reason": "MALFORMED"}

        doc = await db[self.COLLECTION].find_one({"email": email, "sha_token": hashlib.sha256(token.encode()).hexdigest()})
        if not doc:
            return {"valid": False, "email": email, "reason": "NO_CONSENT_RECORD"}
        if doc.get("status") == "REVOKED":
            return {"valid": False, "email": email, "reason": "REVOKED", "revoked_at": doc.get("revoked_at")}
        now = datetime.now(timezone.utc)
        try:
            expires = datetime.fromisoformat(doc.get("expires_at"))
            if expires and expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires and now > expires:
                await db[self.COLLECTION].update_one(
                    {"email": email}, {"$set": {"status": "EXPIRED"}}
                )
                return {"valid": False, "email": email, "reason": "EXPIRED", "expires_at": doc.get("expires_at")}
        except Exception:
            pass

        return {
            "valid": True,
            "email": email,
            "candidate_name": doc.get("candidate_name"),
            "status": doc.get("status"),
            "scope": doc.get("scope"),
            "expires_at": doc.get("expires_at"),
        }

    async def mark_consented(self, token: str, ip: str = "", user_agent: str = "") -> Dict[str, Any]:
        """Candidate action: consent is given."""
        check = await self.verify_consent_token(token)
        if not check.get("valid"):
            return {"ok": False, "error": check.get("reason", "INVALID_TOKEN")}
        now = datetime.now(timezone.utc)
        email = check["email"]
        res = await db[self.COLLECTION].update_one(
            {"email": email},
            {
                "$set": {
                    "status": "ACTIVE",
                    "consented_at": now.isoformat(),
                    "expires_at": (now + timedelta(days=CONSENT_DEFAULT_TTL_DAYS)).isoformat(),
                    "ip": ip,
                    "user_agent": user_agent[:400],
                }
            },
        )
        if not res.matched_count:
            return {"ok": False, "error": "CONSENT_RECORD_MISSING"}
        return {"ok": True, "email": email, "status": "ACTIVE", "expires_at": None}

    async def revoke_consent(self, email: str, token: str = "", reason: str = "") -> Dict[str, Any]:
        """Candidate (or system) revokes consent — DPDP right to withdraw."""
        email = (email or "").strip().lower()
        q: Dict[str, Any] = {"email": email}
        if token:
            q["sha_token"] = hashlib.sha256(token.encode()).hexdigest()
        now = datetime.now(timezone.utc)
        res = await db[self.COLLECTION].update_many(
            q, {"$set": {"status": "REVOKED", "revoked_at": now.isoformat(), "revoke_reason": reason}}
        )
        return {"ok": res.modified_count > 0, "email": email, "updated": res.modified_count}

    async def get_status(self, email: str) -> Dict[str, Any]:
        email = (email or "").strip().lower()
        doc = await db[self.COLLECTION].find_one({"email": email}, {"token": 0, "sha_token": 0})
        if not doc:
            return {"email": email, "has_record": False, "active": False}
        active = doc.get("status") == "ACTIVE"
        expires = doc.get("expires_at")
        if active and expires:
            try:
                exp = datetime.fromisoformat(expires)
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                active = datetime.now(timezone.utc) < exp
            except Exception:
                pass
        return {"email": email, "has_record": True, "active": active, "record": doc}

    async def has_active_consent(self, email: str) -> bool:
        st = await self.get_status(email)
        return bool(st.get("active"))

    async def dashboard(self, limit: int = 100) -> Dict[str, Any]:
        coll = db[self.COLLECTION]
        now = datetime.now(timezone.utc)
        total = await coll.count_documents({})
        active = await coll.count_documents({"status": "ACTIVE"})
        pending = await coll.count_documents({"status": "PENDING"})
        revoked = await coll.count_documents({"status": "REVOKED"})

        soon_cutoff = (now + timedelta(days=CONSENT_EXPIRY_WINDOW_DAYS)).isoformat()
        expiring_soon = await coll.count_documents(
            {"status": "ACTIVE", "expires_at": {"$lt": soon_cutoff}}
        )

        recent = []
        async for doc in coll.find({"status": {"$in": ["ACTIVE", "PENDING"]}}).sort("updated_at", -1).limit(limit):
            recent.append({k: v for k, v in doc.items() if k not in ("token", "sha_token")})

        return {
            "totals": {"all": total, "active": active, "pending": pending, "revoked": revoked, "expiring_30d": expiring_soon},
            "recent": recent,
        }


bgv_consent_service = BGVConsentService()
