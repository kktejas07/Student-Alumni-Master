"""LA7 — Cross-Brand Lead Deduplication.

Phone normalization (E.164 via the platform's whatsapp.normalize_phone),
email canonicalization, name similarity (Jaro-Winkler), and merge logic.
"""
from __future__ import annotations

import logging
import re
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from db import db
from .database import leads_col

logger = logging.getLogger(__name__)

dedup_audit_col = db.la_dedup_audit


# ---------------------------------------------------------------------------
# Phone Normalization — E.164 format
# ---------------------------------------------------------------------------
def normalize_phone_e164(phone: str, country_code: str = "91") -> str:
    """Normalize phone to E.164 format: +{cc}{national}.

    Handles: +919876543210, 09876543210, 9876543210, 919876543210
    """
    digits = re.sub(r"[^\d]", "", phone)
    if not digits:
        return phone

    # Strip leading zeros
    digits = digits.lstrip("0")

    # If starts with country code already
    if digits.startswith(country_code) and len(digits) == len(country_code) + 10:
        return f"+{digits}"

    # Assume national number
    if len(digits) == 10:
        return f"+{country_code}{digits}"

    # Already has CC or unknown format
    if len(digits) > 10:
        return f"+{digits}"

    return f"+{country_code}{digits}"


# ---------------------------------------------------------------------------
# Email Canonicalization
# ---------------------------------------------------------------------------
def canonicalize_email(email: str) -> str:
    """Normalize email: lowercase, remove Gmail dots, strip plus aliases.

    j.doe@gmail.com → jdoe@gmail.com
    john+test@gmail.com → john@gmail.com
    John.Doe@Yahoo.COM → john.doe@yahoo.com
    """
    email = email.strip().lower()
    if not email or "@" not in email:
        return email

    local, domain = email.rsplit("@", 1)

    # Gmail-specific: dots are insignificant, strip plus aliases
    gmail_domains = {"gmail.com", "googlemail.com"}
    if domain in gmail_domains:
        # Remove dots
        local = local.replace(".", "")
        # Strip plus alias
        if "+" in local:
            local = local.split("+")[0]

    # Other domains: just strip plus aliases
    elif "+" in local:
        local = local.split("+")[0]

    return f"{local}@{domain}"


# ---------------------------------------------------------------------------
# Name Similarity — Jaro-Winkler Distance
# ---------------------------------------------------------------------------
def jaro_winkler_similarity(s1: str, s2: str) -> float:
    """Calculate Jaro-Winkler similarity (0.0 to 1.0)."""
    s1 = s1.strip().lower()
    s2 = s2.strip().lower()

    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    # Jaro distance
    len1, len2 = len(s1), len(s2)
    match_distance = max(len1, len2) // 2 - 1
    if match_distance < 0:
        match_distance = 0

    s1_matches = [False] * len1
    s2_matches = [False] * len2

    matches = 0
    transpositions = 0

    for i in range(len1):
        start = max(0, i - match_distance)
        end = min(i + match_distance + 1, len2)
        for j in range(start, end):
            if s2_matches[j] or s1[i] != s2[j]:
                continue
            s1_matches[i] = True
            s2_matches[j] = True
            matches += 1
            break

    if matches == 0:
        return 0.0

    k = 0
    for i in range(len1):
        if not s1_matches[i]:
            continue
        while not s2_matches[k]:
            k += 1
        if s1[i] != s2[k]:
            transpositions += 1
        k += 1

    jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

    # Winkler prefix bonus
    prefix = 0
    for i in range(min(4, len1, len2)):
        if s1[i] == s2[i]:
            prefix += 1
        else:
            break

    return jaro + prefix * 0.1 * (1 - jaro)


# ---------------------------------------------------------------------------
# Duplicate Detection
# ---------------------------------------------------------------------------
_NAME_SIMILARITY_THRESHOLD = 0.85


async def find_duplicates(lead: dict) -> list[dict]:
    """Find potential duplicate leads by phone, email, or name similarity."""
    phone_norm = normalize_phone_e164(lead.get("phone", ""))
    email_canon = canonicalize_email(lead.get("email", ""))
    name = lead.get("full_name", "")
    lead_id = lead.get("lead_id")

    candidates: list[dict] = []
    seen_ids: set[str] = set()

    # 1. Phone match (all format variants)
    phone_digits = re.sub(r"[^\d]", "", lead.get("phone", ""))
    if phone_digits:
        phone_patterns = [
            phone_norm,
            phone_digits,
            phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits,
        ]
        for pattern in phone_patterns:
            cursor = leads_col.find({
                "lead_id": {"$ne": lead_id},
                "$or": [
                    {"phone": {"$regex": re.escape(pattern[-10:]) if len(pattern) >= 10 else re.escape(pattern)}},
                ],
            }).limit(20)
            async for doc in cursor:
                did = doc.get("lead_id", str(doc["_id"]))
                if did not in seen_ids:
                    seen_ids.add(did)
                    candidates.append({**doc, "_match_type": "phone", "_id": str(doc["_id"])})

    # 2. Email match (canonical form)
    if email_canon:
        cursor = leads_col.find({
            "lead_id": {"$ne": lead_id},
            "email": {"$regex": f"^{re.escape(email_canon.split('@')[0])}.*@{re.escape(email_canon.split('@')[1])}$", "$options": "i"},
        }).limit(20)
        async for doc in cursor:
            did = doc.get("lead_id", str(doc["_id"]))
            if did not in seen_ids:
                seen_ids.add(did)
                candidates.append({**doc, "_match_type": "email", "_id": str(doc["_id"])})

    # 3. Name similarity (Jaro-Winkler) — check against phone/email candidates
    if name:
        for c in list(candidates):
            sim = jaro_winkler_similarity(name, c.get("full_name", ""))
            c["_name_similarity"] = round(sim, 3)

    # Filter to strong candidates
    strong: list[dict] = []
    for c in candidates:
        match_type = c.get("_match_type")
        name_sim = c.get("_name_similarity", 0)

        if match_type == "phone":
            strong.append(c)
        elif match_type == "email":
            strong.append(c)
        elif name_sim >= _NAME_SIMILARITY_THRESHOLD:
            strong.append(c)

    return strong


async def merge_leads(primary_id: str, duplicate_id: str, approver: str = "system") -> dict:
    """Merge duplicate into primary lead, keeping the most complete profile."""
    primary = await leads_col.find_one({"lead_id": primary_id})
    duplicate = await leads_col.find_one({"lead_id": duplicate_id})

    if not primary:
        return {"status": "error", "message": "Primary lead not found"}
    if not duplicate:
        return {"status": "error", "message": "Duplicate lead not found"}

    # Merge strategy: fill blanks in primary from duplicate
    merge_fields = ["age", "city", "state", "education_level", "institution", "domain",
                    "campus_role", "utm_source", "utm_medium", "utm_campaign"]
    updates: dict[str, Any] = {}

    for field in merge_fields:
        if not primary.get(field) and duplicate.get(field):
            updates[field] = duplicate[field]

    # Merge lists (skills, interests, matched_brands, matched_offers)
    for list_field in ["skills", "interests", "matched_brands", "matched_offers"]:
        primary_list = set(primary.get(list_field, []))
        dup_list = set(duplicate.get(list_field, []))
        merged = list(primary_list | dup_list)
        if len(merged) > len(primary.get(list_field, [])):
            updates[list_field] = merged

    # Keep the higher score
    if duplicate.get("score", 0) > primary.get("score", 0):
        updates["score"] = duplicate["score"]
        updates["score_breakdown"] = duplicate.get("score_breakdown", {})
        updates["temperature"] = duplicate.get("temperature", "cold")

    # Recalculate profile completeness
    fields_check = ["full_name", "email", "phone", "age", "city", "education_level",
                     "institution", "skills", "interests"]
    merged_doc = {**primary, **updates}
    filled = sum(1 for f in fields_check if merged_doc.get(f))
    updates["profile_completeness"] = round(filled / len(fields_check), 2)
    updates["updated_at"] = datetime.now(timezone.utc)

    if updates:
        await leads_col.update_one({"lead_id": primary_id}, {"$set": updates})

    # Mark duplicate as merged
    await leads_col.update_one(
        {"lead_id": duplicate_id},
        {"$set": {"status": "invalid", "merged_into": primary_id, "updated_at": datetime.now(timezone.utc)}},
    )

    # Audit log
    await dedup_audit_col.insert_one({
        "audit_id": f"DDP-{secrets.token_hex(6)}",
        "primary_lead_id": primary_id,
        "duplicate_lead_id": duplicate_id,
        "fields_merged": list(updates.keys()),
        "approver": approver,
        "timestamp": datetime.now(timezone.utc),
    })

    return {
        "status": "ok",
        "primary": primary_id,
        "merged_from": duplicate_id,
        "fields_updated": list(updates.keys()),
    }


async def bulk_dedup_scan() -> dict:
    """Nightly scan: find and flag duplicates across all leads."""
    now = datetime.now(timezone.utc)
    flagged = 0
    groups: list[dict] = []

    # Group by normalized phone (last 10 digits)
    pipeline = [
        {"$match": {"status": {"$ne": "invalid"}}},
        {"$addFields": {"phone_tail": {"$substr": ["$phone", {"$subtract": [{"$strLenCP": "$phone"}, 10]}, 10]}}},
        {"$group": {"_id": "$phone_tail", "count": {"$sum": 1}, "lead_ids": {"$push": "$lead_id"}}},
        {"$match": {"count": {"$gte": 2}}},
        {"$limit": 100},
    ]

    async for group in leads_col.aggregate(pipeline):
        if len(group["lead_ids"]) >= 2:
            groups.append({
                "phone_tail": group["_id"],
                "lead_ids": group["lead_ids"],
                "count": group["count"],
            })
            flagged += group["count"] - 1

    return {
        "duplicate_groups": len(groups),
        "total_flagged": flagged,
        "groups": groups[:50],
        "scanned_at": now.isoformat(),
    }
