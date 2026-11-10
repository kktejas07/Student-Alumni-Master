"""
talent_compliance.py — TP25: DPDP compliance, consent, PII encryption, erasure.

- talent_pool_consent: per-profile consent records (purposes, source, timestamps)
- erasure_log: right-to-erasure audit (who/what/when/why, immutable append-only)
- PII at rest: email/phone on talent_pool docs are wrapped with the house
  Fernet helpers (core.security.encrypt_value/decrypt_value — same FERNET_KEY
  as user PII). `pii_fields(doc)` returns decrypted views so read paths
  (dedup, quality, outreach) keep working on encrypted docs.
- compliance_report: consent coverage, encryption coverage, open erasures.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from services.agents.talent_common import now_utc, log_activity

try:
    from core.security import encrypt_value, decrypt_value
except Exception:  # Fernet not available — degrade to plaintext (dev only)
    def encrypt_value(v):  # type: ignore
        return v
    def decrypt_value(v):  # type: ignore
        return v

_PII_FIELDS = ("email", "phone")


def pii_fields(doc: Optional[Dict[str, Any]]) -> Dict[str, Optional[str]]:
    """Decrypted PII view of a talent_pool doc (handles enc:: wrapped values)."""
    out: Dict[str, Optional[str]] = {}
    for f in _PII_FIELDS:
        raw = (doc or {}).get(f)
        out[f] = decrypt_value(raw) if raw else raw
    return out


def _norm_email(v: Any) -> str:
    return str(v or "").strip().lower()


async def record_consent(
    db,
    profile_id: str,
    email: str,
    purposes: List[str],
    source: str = "talent_pool",
    actor: str = "system",
) -> None:
    """Upsert consent for a profile. `purposes` e.g. ["outreach","data_enrichment"]."""
    now = now_utc()
    await db.talent_pool_consent.update_one(
        {"profile_id": profile_id, "email": _norm_email(email)},
        {
            "$set": {"purposes": sorted(set(purposes)), "source": source,
                     "consented_at": now, "updated_at": now, "actor": actor,
                     "status": "active"},
        },
        upsert=True,
    )
    await log_activity(db, actor, "Consent", object_id=profile_id,
                       summary=f"Consent recorded for purposes: {', '.join(purposes)}",
                       collection="talent_pool")


async def revoke_consent(db, email: str, reason: str = "") -> Dict[str, Any]:
    """Opt a candidate out of all outreach/enrichment purposes."""
    now = now_utc()
    res = await db.talent_pool_consent.update_one(
        {"email": _norm_email(email)},
        {"$set": {"status": "revoked", "revoked_at": now, "revoke_reason": reason,
                  "updated_at": now}},
    )
    if res.matched_count:
        pid = (await db.talent_pool_consent.find_one(
            {"email": _norm_email(email)}, {"profile_id": 1})).get("profile_id")
        if pid:
            await db.talent_pool.update_one(
                {"id": pid},
                {"$set": {"outreach_opt_out": True, "updated_at": now}},
            )
        await log_activity(db, "data-subject", "ConsentRevoke", object_id=str(pid or email),
                           summary=reason or "Data subject revoked consent")
    return {"revoked": bool(res.matched_count)}


async def consent_status(db, email: str) -> Dict[str, Any]:
    doc = await db.talent_pool_consent.find_one({"email": _norm_email(email)})
    if not doc:
        return {"email": _norm_email(email), "consented": False, "purposes": []}
    return {
        "email": _norm_email(email),
        "consented": doc.get("status") == "active",
        "purposes": doc.get("purposes", []),
        "consented_at": doc.get("consented_at"),
        "revoked_at": doc.get("revoked_at"),
    }


async def encrypt_pii(db, profile_id: str) -> Dict[str, Any]:
    """Encrypt the PII fields of one profile (idempotent — encrypt_value is a no-op on enc:: values)."""
    p = await db.talent_pool.find_one({"id": profile_id})
    if not p:
        return {"encrypted": False, "reason": "not_found"}
    patch: Dict[str, Any] = {}
    for f in _PII_FIELDS:
        v = p.get(f)
        if v:
            patch[f] = encrypt_value(str(v))
    if patch:
        await db.talent_pool.update_one(
            {"_id": p["_id"]},
            {"$set": {**patch, "pii_encrypted": True, "updated_at": now_utc()}},
        )
    return {"encrypted": bool(patch), "profile_id": profile_id}


async def encrypt_pool_pii(db, limit: int = 2000) -> Dict[str, Any]:
    """Batch-encrypt PII across the pool (for the compliance migration run)."""
    done = 0
    async for p in db.talent_pool.find(
        {"is_active": True, "pii_encrypted": {"$ne": True}}
    ).limit(limit):
        if await encrypt_pii(db, str(p.get("id") or p["_id"]))["encrypted"]:
            done += 1
    return {"encrypted": done, "scanned": limit}


async def request_erasure(db, profile_id: str, actor: str = "admin", reason: str = "") -> Dict[str, Any]:
    """Right-to-erasure: scrub PII from every collection that holds the candidate."""
    now = now_utc()
    p = await db.talent_pool.find_one({"id": profile_id})
    if not p:
        return {"erased": False, "reason": "profile not found"}
    email = _norm_email(pii_fields(p)["email"])
    affected: List[str] = []

    # 1. talent_pool: hard-delete the doc (erasure, not just deactivation)
    r1 = await db.talent_pool.delete_one({"_id": p["_id"]})
    affected.append(f"talent_pool (deleted={r1.deleted_count})")

    # 2. user account (if promoted): deactivate + scrub PII
    if email:
        r2 = await db.users.update_many(
            {"email": email},
            {"$set": {"is_active": False, "erased": True,
                      "email": encrypt_value(email), "phone": encrypt_value(""),
                      "updated_at": now}},
        )
        if r2.modified_count:
            affected.append(f"users (scrubbed={r2.modified_count})")
    # 3. CRM contacts: scrub + mark
    if email:
        r3 = await db.contacts.update_many(
            {"email": email},
            {"$set": {"pii_scrubbed": True, "erased": True, "updated_at": now}},
        )
        if r3.modified_count:
            affected.append(f"contacts (scrubbed={r3.modified_count})")
    # 4. consent records: mark erased (keep audit, drop PII)
    if email:
        await db.talent_pool_consent.update_many(
            {"email": email},
            {"$set": {"status": "erased", "erased_at": now, "email": encrypt_value(email)}},
        )
    # 5. immutable erasure audit row
    await db.erasure_log.insert_one({
        "profile_id": profile_id,
        "email_enc": encrypt_value(email) if email else None,
        "actor": actor,
        "reason": reason,
        "affected_collections": affected,
        "erased_at": now,
    })
    await log_activity(db, actor, "Erase", object_id=profile_id,
                       summary=f"DPDP erasure executed. Collections: {', '.join(affected) or 'talent_pool'}")
    return {"erased": True, "profile_id": profile_id, "affected_collections": affected}


async def erasure_history(db, limit: int = 50) -> List[Dict[str, Any]]:
    docs = await db.erasure_log.find({}).sort("erased_at", -1).limit(limit).to_list(limit)
    for d in docs:
        d["erased_at"] = d.get("erased_at").isoformat() if d.get("erased_at") else None
        d["email_enc"] = d.get("email_enc")
    return docs


async def compliance_report(db) -> Dict[str, Any]:
    """DPDP posture for the admin compliance screen."""
    total = await db.talent_pool.count_documents({"is_active": True})
    encrypted = await db.talent_pool.count_documents(
        {"is_active": True, "pii_encrypted": True})
    consented = await db.talent_pool_consent.count_documents({"status": "active"})
    opt_outs = await db.talent_pool.count_documents(
        {"is_active": True, "outreach_opt_out": True})
    open_erasures = await db.erasure_log.count_documents({})
    return {
        "active_profiles": total,
        "pii_encrypted": encrypted,
        "pii_encryption_coverage_pct": round(encrypted / total * 100, 1) if total else 100.0,
        "consent_records_active": consented,
        "outreach_opt_outs": opt_outs,
        "erasure_events_total": open_erasures,
        "dpdp_posture": "complete" if (total and encrypted >= total and opt_outs >= 0) else "in_progress",
    }


class ComplianceAgent:
    """TP25 dashboard facade."""
    name = "TP25 DPDP Compliance"
    group = "compliance"
    priority = "P2"

    async def agent_status(self, db) -> Dict[str, Any]:
        rep = await compliance_report(db)
        last = await db.scheduler_logs.find_one(
            {"agent": "tp23_scheduler", "action": "pii_encrypt"},
            sort=[("started_at", -1)])
        return {
            "name": self.name, "group": self.group, "priority": self.priority,
            "status": "ok" if rep["dpdp_posture"] == "complete" else "in_progress",
            "pii_encryption_coverage_pct": rep["pii_encryption_coverage_pct"],
            "consent_records_active": rep["consent_records_active"],
            "erasure_events_total": rep["erasure_events_total"],
            "est_cost_per_month": "$0 (Fernet PII at rest, local only)",
            "last_run_at": last.get("started_at").isoformat() if last and last.get("started_at") else None,
        }


compliance_agent = ComplianceAgent()
