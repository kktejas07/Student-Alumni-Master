"""
Company name normalization
==========================
Produces a stable, lowercase key for free-text company names so that
"VNR", "VNR Vidda" and "VNR-Vidda" collapse toward the same key and can be
matched across users.jobs_cache.

Design: cleanco-style — strip punctuation/whitespace, lowercase, then drop
known trailing corporate suffixes. If the result is shorter than three
characters, fall back to the stripped string so we never produce an empty key.
"""
from __future__ import annotations

import re
import unicodedata

_CORP_SUFFIXES = (
    "private",
    "pvt",
    "limited",
    "llc",
    "ltd",
    "pte",
    "plc",
    "srl",
    "sarl",
    "sa",
    "se",
    "corp",
    "corporation",
    "inc",
    "incorporated",
    "co",
    "company",
    "group",
    "international",
    "india",
)

_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_WS_RE = re.compile(r"\s+")


def _normalize_whitespace_and_punct(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    # Drop diacritics on latin letters (e.g. "Müller" -> "Muller")
    text = "".join(
        ch for ch in text if not unicodedata.combining(ch)
    )
    text = _PUNCT_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip().lower()
    return text


def company_key(company_name: str) -> str:
    """Return a normalized key for a company name.

    Returns an empty string when no company name can be derived.
    """
    if not company_name or not isinstance(company_name, str):
        return ""
    cleaned = _normalize_whitespace_and_punct(company_name)
    if not cleaned:
        return ""

    tokens = cleaned.split()
    # Drop trailing corporate suffixes one at a time ("VNR Vidda Pvt Ltd" -> "VNR Vidda")
    while len(tokens) > 1 and tokens[-1] in _CORP_SUFFIXES:
        tokens.pop()
    key = " ".join(tokens).strip()
    return key if key else cleaned


def extract_company_name(user_doc: dict) -> str:
    """Best-effort read of the company name from a user document.

    Historical docs use several field names — probe them all.
    """
    ai = user_doc.get("alumni_info") or {}
    mp = user_doc.get("mentor_profile") or {}
    return (
        ai.get("company")
        or ai.get("current_employer")
        or ai.get("alumni_employer")
        or user_doc.get("alumni_employer")
        or user_doc.get("current_employer")
        or mp.get("organization")
        or user_doc.get("company")
        or ""
    )


def extract_college_name(user_doc: dict) -> str:
    """Best-effort read of the college/university name from a user document."""
    ai = user_doc.get("alumni_info") or {}
    si = user_doc.get("school_info") or {}
    cp = user_doc.get("college_info") or user_doc.get("college_profile") or {}
    return (
        user_doc.get("college")
        or user_doc.get("institution")
        or ai.get("university")
        or ai.get("institution_name")
        or si.get("institution_name")
        or cp.get("institution_name")
        or ""
    )


def extract_role(user_doc: dict) -> str:
    ai = user_doc.get("alumni_info") or {}
    mp = user_doc.get("mentor_profile") or {}
    return (
        ai.get("current_role")
        or ai.get("alumni_role")
        or user_doc.get("alumni_role")
        or mp.get("job_title")
        or ""
    )


def extract_grad_year(user_doc: dict):
    ai = user_doc.get("alumni_info") or {}
    si = user_doc.get("school_info") or {}
    return ai.get("graduation_year") or si.get("graduation_year") or user_doc.get("graduation_year")


async def backfill_company_keys(db) -> dict:
    """One-shot pass that writes company_key onto users and jobs_cache.

    Called nightly by background_sync.run_company_key_backfill. Kept here so
    it stays importable without the heavy background_sync dependency chain.
    Returns counters for logging.
    """
    users_updated = 0
    cursor = db.users.find(
        {"alumni_info.company_key": {"$in": [None, ""]}}
    ).batch_size(200)
    async for user in cursor:
        name = extract_company_name(user)
        key = company_key(name)
        if key:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"alumni_info.company_key": key, "alumni_info.company_key_source": name}},
            )
            users_updated += 1

    jobs_updated = 0
    cursor = db.jobs_cache.find({"company_key": {"$in": [None, ""]}}).batch_size(200)
    async for job in cursor:
        key = company_key(job.get("company") or "")
        if key:
            await db.jobs_cache.update_one(
                {"_id": job["_id"]},
                {"$set": {"company_key": key, "company_key_source": job.get("company") or ""}},
            )
            jobs_updated += 1

    mentors_updated = 0
    cursor = db.users.find({
        "mentor_profile.organization_key": {"$in": [None, ""]},
        "mentor_profile.organization": {"$exists": True},
    }).batch_size(200)
    async for user in cursor:
        name = (user.get("mentor_profile") or {}).get("organization") or ""
        key = company_key(name)
        if key:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"mentor_profile.organization_key": key, "mentor_profile.organization_key_source": name}},
            )
            mentors_updated += 1

    return {"users": users_updated, "jobs": jobs_updated, "mentors": mentors_updated}
