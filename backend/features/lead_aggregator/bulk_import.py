"""Enhancement #7 — Bulk Lead Import.

CSV upload for brands migrating existing leads. Validates, deduplicates,
scores, and imports up to 5000 rows per file.
"""
from __future__ import annotations

import csv
import io
import re
import secrets
import logging
from datetime import datetime, timezone
from typing import Optional

from db import db
from .database import leads_col, brands_col
from .models import SUPPORTED_DOMAINS
from .scoring import compute_lead_score
from .dedup import normalize_phone_e164, canonicalize_email

logger = logging.getLogger(__name__)

bulk_imports_col = db.la_bulk_imports

MAX_ROWS = 5000

EXPECTED_COLUMNS = {
    "full_name", "email", "phone", "age", "city", "domain",
    "skills", "education_level", "institution", "interests",
}

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_DOMAIN_SET = {d.lower() for d in SUPPORTED_DOMAINS}


def _gen_id(prefix: str = "LA") -> str:
    return f"{prefix}-{secrets.token_hex(8)}"


def parse_csv(file_content: bytes, encoding: str = "utf-8") -> tuple[list[dict], list[str]]:
    """Parse CSV bytes into validated row dicts.

    Returns (valid_rows, errors). Each error is like "Row 5: invalid email format".
    """
    try:
        text = file_content.decode(encoding)
    except (UnicodeDecodeError, LookupError) as e:
        return [], [f"Encoding error: {e}"]

    reader = csv.DictReader(io.StringIO(text))

    if not reader.fieldnames:
        return [], ["CSV has no header row"]

    normalised_fields = {f.strip().lower(): f for f in reader.fieldnames}
    missing_required = {"full_name", "phone"} - set(normalised_fields.keys())
    if missing_required:
        return [], [f"Missing required columns: {', '.join(sorted(missing_required))}"]

    rows: list[dict] = []
    errors: list[str] = []

    for i, raw in enumerate(reader, start=2):
        if i - 1 > MAX_ROWS:
            errors.append(f"Row {i}: exceeds maximum of {MAX_ROWS} rows — truncated")
            break

        row: dict = {}
        row_errors: list[str] = []

        cleaned = {k.strip().lower(): (v.strip() if v else "") for k, v in raw.items()}

        full_name = cleaned.get("full_name", "")
        if not full_name:
            row_errors.append(f"Row {i}: full_name is required")
        row["full_name"] = full_name

        phone = cleaned.get("phone", "")
        if not phone:
            row_errors.append(f"Row {i}: phone is required")
        else:
            digits = re.sub(r"[^\d+]", "", phone)
            if len(digits) < 10:
                row_errors.append(f"Row {i}: phone too short ({digits})")
        row["phone"] = phone

        email = cleaned.get("email", "")
        if email and not _EMAIL_RE.match(email):
            row_errors.append(f"Row {i}: invalid email format")
        row["email"] = email or None

        age_str = cleaned.get("age", "")
        if age_str:
            try:
                age = int(age_str)
                if age < 15 or age > 60:
                    row_errors.append(f"Row {i}: age {age} out of range 15-60")
                row["age"] = age
            except ValueError:
                row_errors.append(f"Row {i}: age is not a number")
                row["age"] = None
        else:
            row["age"] = None

        row["city"] = cleaned.get("city", "") or None

        domain = cleaned.get("domain", "").lower()
        if domain and domain not in _DOMAIN_SET:
            row_errors.append(f"Row {i}: unknown domain '{domain}'")
            domain = ""
        row["domain"] = domain or None

        skills_raw = cleaned.get("skills", "")
        row["skills"] = [s.strip() for s in skills_raw.split(",") if s.strip()] if skills_raw else []

        row["education_level"] = cleaned.get("education_level", "") or None
        row["institution"] = cleaned.get("institution", "") or None

        interests_raw = cleaned.get("interests", "")
        row["interests"] = [s.strip() for s in interests_raw.split(",") if s.strip()] if interests_raw else []

        if row_errors:
            errors.extend(row_errors)
        else:
            rows.append(row)

    return rows, errors


async def bulk_import_leads(
    rows: list[dict],
    brand_id: str,
    source: str = "csv_import",
) -> dict:
    """Import validated rows as leads for a brand."""
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not brand:
        return {"status": "error", "message": "Brand not found"}

    import_id = _gen_id("IMP")
    now = datetime.now(timezone.utc)

    await bulk_imports_col.insert_one({
        "import_id": import_id,
        "brand_id": brand_id,
        "source": source,
        "total_rows": len(rows),
        "status": "processing",
        "imported": 0,
        "duplicates": 0,
        "errors": [],
        "started_at": now,
        "completed_at": None,
    })

    imported = 0
    duplicates = 0
    import_errors: list[str] = []
    lead_ids: list[str] = []

    for idx, row in enumerate(rows):
        try:
            phone_norm = normalize_phone_e164(row["phone"])
            email_canon = canonicalize_email(row["email"]) if row.get("email") else None

            dupe_query: dict = {"$or": [{"phone": phone_norm}]}
            if row.get("phone") != phone_norm:
                dupe_query["$or"].append({"phone": row["phone"]})
            if email_canon:
                dupe_query["$or"].append({"email": email_canon})
                if row.get("email") and row["email"].lower() != email_canon:
                    dupe_query["$or"].append({"email": row["email"].lower()})

            existing = await leads_col.find_one(dupe_query)
            if existing:
                duplicates += 1
                continue

            lead_id = _gen_id("LEAD")

            fields = [
                "full_name", "email", "phone", "age", "city",
                "education_level", "institution", "skills", "interests",
            ]
            filled = sum(1 for f in fields if row.get(f))
            completeness = round(filled / len(fields), 2)

            score, breakdown, temp = compute_lead_score(row, brand)

            lead_doc = {
                "lead_id": lead_id,
                "full_name": row["full_name"],
                "email": email_canon or row.get("email"),
                "phone": phone_norm,
                "age": row.get("age"),
                "city": row.get("city"),
                "domain": row.get("domain"),
                "skills": row.get("skills", []),
                "education_level": row.get("education_level"),
                "institution": row.get("institution"),
                "interests": row.get("interests", []),
                "phone_verified": False,
                "status": "new",
                "temperature": temp,
                "score": score,
                "score_breakdown": breakdown,
                "matched_brands": [brand_id] if score >= 25 else [],
                "matched_offers": [],
                "profile_completeness": completeness,
                "source_platform": source,
                "import_id": import_id,
                "created_at": now,
                "updated_at": now,
            }

            await leads_col.insert_one(lead_doc)
            lead_ids.append(lead_id)
            imported += 1

        except Exception as e:
            import_errors.append(f"Row {idx + 1}: {e}")

    await bulk_imports_col.update_one(
        {"import_id": import_id},
        {"$set": {
            "status": "completed",
            "imported": imported,
            "duplicates": duplicates,
            "errors": import_errors,
            "lead_ids": lead_ids,
            "completed_at": datetime.now(timezone.utc),
        }},
    )

    return {
        "status": "ok",
        "import_id": import_id,
        "imported": imported,
        "duplicates": duplicates,
        "errors": import_errors,
        "lead_ids": lead_ids,
    }


async def import_status(import_id: str) -> dict:
    """Return status of a bulk import job."""
    doc = await bulk_imports_col.find_one({"import_id": import_id})
    if not doc:
        return {"status": "error", "message": "Import not found"}
    doc["_id"] = str(doc["_id"])
    return doc


async def list_imports(brand_id: str) -> list[dict]:
    """Return import history for a brand, newest first."""
    cursor = bulk_imports_col.find(
        {"brand_id": brand_id},
    ).sort("started_at", -1).limit(50)
    results = await cursor.to_list(length=50)
    for r in results:
        r["_id"] = str(r["_id"])
    return results
