"""
Talent Pool module — searchable database of candidate profiles.

Sources:
  - LinkedIn API / Proxycurl   (enriched profile data)
  - CSV bulk import             (admin upload)
  - Platform user opt-in        (self-serve toggle)
  - Manual admin entry

All profiles are stored in the `talent_pool` collection and are visible
to all authenticated users. Admin can manage (CRUD, sync, import).
"""

import io
import os
import csv
import re
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

load_dotenv()

router = APIRouter()
logger = logging.getLogger("talent_pool")

# ─── Mongo ─────────────────────────────────────────────────────────
# Share the app's single Mongo connection pool + DB name (core.db raises at
# import if MONGO_URL is unset, matching core.config's fail-fast behavior —
# no localhost fallback, so the module can never silently hit the wrong DB).
from core.db import db as _db
from core.deps import bearer_token, decode_payload_silent
from core.query_helpers import nonempty
from core.config import frontend_base_url


# ─── Auth helpers ──────────────────────────────────────────────────
async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    payload = decode_payload_silent(bearer_token(authorization))
    if not payload:
        return None
    uid = payload.get("sub") or payload.get("user_id") or payload.get("id")
    if not uid:
        return None
    try:
        return await _db.users.find_one({"_id": ObjectId(uid)})
    except Exception:
        return await _db.users.find_one({"_id": uid})


async def _require_auth(authorization: Optional[str]) -> dict:
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


async def _require_admin(authorization: Optional[str]) -> dict:
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    role = (user.get("role") or "").lower()
    if role not in {"admin", "super_admin"}:
        raise HTTPException(403, "Admin role required")
    return user


async def _actor_for(authorization: Optional[str]) -> str:
    """Stable actor identity for the activity log (W3C Activity Stream).
    A bare string (no ':') is recorded as a Person; system agents use
    `:<name>` Service form elsewhere. Falls back to "admin" when unauthed."""
    user = await _resolve_user(authorization)
    if not user:
        return "admin"
    return user.get("email") or str(user.get("_id")) or "admin"


# ─── Models ────────────────────────────────────────────────────────
class TalentProfileIn(BaseModel):
    full_name: str
    headline: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience_years: Optional[float] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    education: Optional[str] = None
    graduation_year: Optional[int] = None
    photo_url: Optional[str] = None
    bio: Optional[str] = None
    source: str = "manual"
    # Extended ID & Evaluation fields
    sa_id: Optional[str] = None
    is_registered_user: Optional[bool] = False
    account_status: Optional[str] = "unregistered"
    certificate_id: Optional[str] = None
    bgv_id: Optional[str] = None
    visa: Optional[str] = None
    exp_level: Optional[str] = None
    c2c_w2: Optional[str] = None
    f2f: Optional[str] = None
    interest_status: Optional[str] = None
    preferred_location: Optional[str] = None
    screening_notes: Optional[str] = None


class TalentProfileOut(BaseModel):
    id: str
    sa_id: Optional[str] = None
    full_name: str
    headline: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    experience_years: Optional[float] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    education: Optional[str] = None
    graduation_year: Optional[int] = None
    photo_url: Optional[str] = None
    bio: Optional[str] = None
    source: str = "manual"
    is_active: bool = True
    is_registered_user: bool = False
    account_status: str = "unregistered"
    certificate_id: Optional[str] = None
    bgv_id: Optional[str] = None
    # Recruiter Evaluation Columns
    visa: Optional[str] = None
    exp_level: Optional[str] = None
    c2c_w2: Optional[str] = None
    f2f: Optional[str] = None
    interest_status: Optional[str] = None
    preferred_location: Optional[str] = None
    screening_notes: Optional[str] = None
    imported_at: Optional[str] = None
    last_synced_at: Optional[str] = None
    created_at: Optional[str] = None


class TalentPoolSearch(BaseModel):
    q: Optional[str] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    experience_min: Optional[float] = None
    experience_max: Optional[float] = None
    source: Optional[str] = None
    page: int = 1
    limit: int = 24


def _profile_out(doc: dict) -> dict:
    oid_str = str(doc["_id"])
    is_reg = bool(doc.get("is_registered_user") or doc.get("user_id") or doc.get("source_platform_user_id"))
    return {
        "id": oid_str,
        "sa_id": doc.get("sa_id") or f"SA-{oid_str[-6:].upper()}",
        "full_name": doc.get("full_name", ""),
        "headline": doc.get("headline"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "linkedin_url": doc.get("linkedin_url"),
        "github_url": doc.get("github_url"),
        "portfolio_url": doc.get("portfolio_url"),
        "location": doc.get("location"),
        "skills": doc.get("skills") or [],
        "experience_years": doc.get("experience_years"),
        "current_company": doc.get("current_company"),
        "current_role": doc.get("current_role"),
        "education": doc.get("education"),
        "graduation_year": doc.get("graduation_year"),
        "photo_url": doc.get("photo_url"),
        "bio": doc.get("bio"),
        "source": doc.get("source", "manual"),
        "is_active": doc.get("is_active", True),
        "is_registered_user": is_reg,
        "account_status": "registered" if is_reg else "unregistered",
        "certificate_id": doc.get("certificate_id") or (f"CERT-{oid_str[-6:].upper()}" if doc.get("certified") else None),
        "bgv_id": doc.get("bgv_id") or (f"BGV-{oid_str[-6:].upper()}" if doc.get("bgv_verified") else None),
        # Recruiter Evaluation Columns
        "visa": doc.get("visa") or doc.get("work_authorization"),
        "exp_level": doc.get("exp_level") or doc.get("exp") or (f"{doc.get('experience_years')} yrs" if doc.get("experience_years") is not None else None),
        "c2c_w2": doc.get("c2c_w2") or doc.get("c2c/w2") or doc.get("work_type"),
        "f2f": doc.get("f2f") or doc.get("f2f_interview"),
        "interest_status": doc.get("interest_status") or doc.get("intersted/notinter") or doc.get("status") or "Interested",
        "preferred_location": doc.get("preferred_location") or doc.get("target_location") or doc.get("location"),
        "screening_notes": doc.get("screening_notes") or doc.get("notes"),
        # TP24 real quality score (persisted by quality scanner; None = not yet scored)
        "quality_score": doc.get("quality_score"),
        "needs_attention": bool(doc.get("needs_attention")),
        "quality_missing": [
            k for k, v in (doc.get("quality_breakdown") or {}).items() if not v.get("passed")
        ],
        # TP18 semantic match result, persisted at last scoring run (per opening)
        "match_score": doc.get("match_score"),
        "match_badge": doc.get("match_badge"),
        "match_opening": doc.get("match_opening"),
        "imported_at": doc.get("imported_at").isoformat() if doc.get("imported_at") else None,
        "last_synced_at": doc.get("last_synced_at").isoformat() if doc.get("last_synced_at") else None,
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


# ─── CSV header mapping ─────────────────────────────────────────────
CSV_HEADER_MAP: Dict[str, List[str]] = {
    "full_name":    ["full name", "name", "fullname", "candidate name", "first name"],
    "first_name":   ["first name", "firstname", "given name"],
    "last_name":    ["last name", "lastname", "surname", "family name"],
    "headline":     ["headline", "tagline", "title", "designation"],
    "email":        ["email", "email address", "e-mail", "mail"],
    "phone":        ["phone", "phone number", "mobile", "contact number"],
    "linkedin_url": ["linkedin url", "linkedin", "profile url", "linkedin profile", "profile url"],
    "github_url":   ["github url", "github", "github profile"],
    "location":     ["location", "city", "region", "address", "general location"],
    "skills":       ["skills", "skill", "tech stack", "technologies", "key skills"],
    "experience_years": ["experience years", "experience", "years of experience", "yoe", "total experience"],
    "current_company": ["current company", "company", "employer", "organization"],
    "current_role": ["current role", "role", "job title", "position", "current title"],
    "education":    ["education", "education degree", "degree", "qualification", "highest education"],
    "education_institution": ["education institution", "institution", "college", "university", "school"],
    "graduation_year": ["graduation year", "grad year", "year of graduation", "passing year"],
    "bio":          ["bio", "about", "summary", "description", "evaluation summary"],
    "zip_code":     ["zip code", "zip", "postal code", "postcode"],
    # Recruiter Evaluation Aliases
    "sa_id":        ["sa id", "sa_id", "student alumni id", "unique id", "candidate id"],
    "visa":         ["visa", "visa status", "work authorization", "work status", "us visa", "visa type"],
    "exp_level":    ["exp", "exp level", "evaluated exp", "recruiter exp", "experience level"],
    "c2c_w2":       ["c2c/w2", "c2c_w2", "c2c", "w2", "work model", "employment type", "tax terms"],
    "f2f":          ["f2f", "f2f interview", "face to face", "f2f ready", "in-person ready", "in person"],
    "interest_status": ["intersted/notinter", "interested/not interested", "interest status", "interest", "status", "candidate interest", "intersted", "not interested"],
    "preferred_location": ["preferred location", "relocation", "target location", "pref location"],
    "certificate_id": ["certificate id", "cert id", "certification id", "cert_id"],
    "bgv_id":       ["bgv id", "bgv", "background verification id", "bgv_id", "verification id"],
}


async def _ensure_indexes():
    try:
        await _db.talent_pool.create_index("email", sparse=True)
        await _db.talent_pool.create_index("linkedin_url", sparse=True)
        await _db.talent_pool.create_index("skills")
        await _db.talent_pool.create_index("source")
        await _db.talent_pool.create_index("is_active")
        await _db.talent_pool.create_index([("full_name", "text"), ("headline", "text"),
                                            ("skills", "text"), ("current_company", "text")])
        # TP24 quality-score admin filters
        await _db.talent_pool.create_index([("quality_score", 1), ("is_active", 1)])
        await _db.talent_pool.create_index("needs_attention")
        await _db.talent_pool.create_index("interest_status")
        await _db.talent_pool.create_index("outreach_opt_out")
        # TP25 compliance / DPDP
        await _db.talent_pool_consent.create_index([("email", 1), ("status", 1)])
        await _db.erasure_log.create_index("erased_at")
        # TP26 activity timeline (W3C Activity Stream)
        await _db.talent_pool_activity_log.create_index("startTime")
        await _db.talent_pool_activity_log.create_index([("object.id", 1), ("startTime", -1)])
        # TP20 dedup groups + merge audit
        await _db.talent_pool_dedup_groups.create_index("group_id")
        await _db.talent_pool_merge_log.create_index("merged_at")
        # TP21 outreach campaigns + tracking
        await _db.outreach_campaigns.create_index("status")
        await _db.outreach_campaigns.create_index("next_drip_at")
        await _db.outreach_campaigns.create_index("token")
        # TP23 scheduler state
        await _db.scheduler_logs.create_index([("agent", 1), ("action", 1), ("started_at", -1)])
        await _db.settings.create_index("id", unique=True)
        # TP27 weekly insights
        await _db.talent_pool_insights.create_index("week_start")
        # TP18 embedding cache + match-score audit
        await _db.candidate_embeddings.create_index("candidate_id", unique=True)
        await _db.talent_pool_match_scores.create_index([("candidate_id", 1), ("opening_ref", 1)])
        # TP28/29 external job boards
        await _db.external_job_listings.create_index("id", unique=True)
        await _db.external_job_listings.create_index([("board", 1), ("fetched_at", -1)])
        await _db.external_job_listings.create_index("deadline")
        # TP30 WhatsApp Business
        await _db.whatsapp_message_log.create_index([("direction", 1), ("sent_at", -1)])
        await _db.whatsapp_message_log.create_index("message_id")
        await _db.whatsapp_opt_outs.create_index("phone")
        # TP15/16 enrichment audit trail
        await _db.talent_pool_raw_scrapes.create_index([("profile_id", 1), ("fetched_at", -1)])
        # TP22 canonical skill index
        await _db.canonical_skills.create_index("status")
        # TP31 field mappings + TP32 interview loop
        await _db.ats_field_mappings.create_index("ats", unique=True)
        await _db.talent_interviews.create_index([("profile_id", 1), ("created_at", -1)])
        await _db.interview_feedback.create_index([("interview_id", 1), ("profile_id", 1)])
    except Exception as e:
        logger.warning(f"Index creation skipped: {e}")


# ─── Public endpoints ───────────────────────────────────────────────

@router.get("/talent-pool")
async def list_talent_pool(
    authorization: Optional[str] = Header(None),
    q: Optional[str] = Query(None, description="Search name, skills, company"),
    skills: Optional[str] = Query(None, description="Comma-separated skills filter"),
    location: Optional[str] = Query(None),
    experience_min: Optional[float] = Query(None),
    experience_max: Optional[float] = Query(None),
    source: Optional[str] = Query(None, description="linkedin | csv | platform | manual"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
):
    await _require_auth(authorization)

    mongo_filter: Dict[str, Any] = {"is_active": True}

    if q:
        mongo_filter["$text"] = {"$search": q}
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
        if skill_list:
            mongo_filter["skills"] = {"$in": skill_list}
    if location:
        mongo_filter["location"] = {"$regex": re.escape(location), "$options": "i"}
    if experience_min is not None or experience_max is not None:
        exp_filter: Dict[str, Any] = {}
        if experience_min is not None:
            exp_filter["$gte"] = experience_min
        if experience_max is not None:
            exp_filter["$lte"] = experience_max
        if exp_filter:
            mongo_filter["experience_years"] = exp_filter
    if source:
        mongo_filter["source"] = source

    skip = (page - 1) * limit
    cursor = _db.talent_pool.find(mongo_filter).sort("created_at", -1).skip(skip).limit(limit)
    items = [_profile_out(doc) async for doc in cursor]
    total = await _db.talent_pool.count_documents(mongo_filter)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/talent-pool/{profile_id}")
async def get_talent_profile(profile_id: str, authorization: Optional[str] = Header(None)):
    await _require_auth(authorization)
    try:
        doc = await _db.talent_pool.find_one({"_id": ObjectId(profile_id)})
    except Exception:
        raise HTTPException(404, "Invalid profile ID")
    if not doc:
        raise HTTPException(404, "Profile not found")
    return _profile_out(doc)


@router.get("/talent-pool/stats/summary")
async def talent_pool_stats(authorization: Optional[str] = Header(None)):
    await _require_auth(authorization)
    total = await _db.talent_pool.count_documents({"is_active": True})
    by_source = {}
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
    ]
    async for row in _db.talent_pool.aggregate(pipeline):
        by_source[row["_id"]] = row["count"]

    all_skills = set()
    async for doc in _db.talent_pool.find({"is_active": True}, {"skills": 1}).limit(1000):
        for s in doc.get("skills") or []:
            all_skills.add(s.lower().strip())

    return {
        "total": total,
        "by_source": by_source,
        "skill_count": len(all_skills),
        "top_skills": sorted(list(all_skills))[:50],
    }


# ─── Platform user opt-in / opt-out ─────────────────────────────────

@router.post("/talent-pool/opt-in")
async def talent_pool_opt_in(authorization: Optional[str] = Header(None)):
    user = await _require_auth(authorization)
    uid = str(user["_id"])

    existing = await _db.talent_pool.find_one({"source_platform_user_id": uid})
    if existing:
        await _db.talent_pool.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}},
        )
    else:
        skills_list = list(set(
            (user.get("skills") or []) +
            (user.get("interests") or [])
        ))
        profile_doc = {
            "full_name": user.get("full_name", ""),
            "headline": user.get("headline"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "linkedin_url": user.get("linkedin_url"),
            "github_url": user.get("github_url"),
            "portfolio_url": user.get("portfolio_url"),
            "location": user.get("location") or user.get("city"),
            "skills": skills_list,
            "experience_years": (
                user.get("alumni_info", {}).get("years_of_experience") or
                user.get("mentor_info", {}).get("years_of_experience")
            ),
            "current_company": (
                user.get("alumni_info", {}).get("current_employer") or
                user.get("mentor_info", {}).get("organization")
            ),
            "current_role": (
                user.get("alumni_info", {}).get("current_role") or
                user.get("mentor_info", {}).get("job_title")
            ),
            "education": (user.get("school_info") or {}).get("institution_name"),
            "graduation_year": (user.get("school_info") or {}).get("graduation_year"),
            "photo_url": user.get("photo_data") if user.get("photo_data") and not str(user.get("photo_data", "")).startswith("data:") else None,
            "photo_data": user.get("photo_data") if user.get("photo_data") and str(user.get("photo_data", "")).startswith("data:") else None,
            "bio": user.get("bio"),
            "source": "platform",
            "source_platform_user_id": uid,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await _db.talent_pool.insert_one(profile_doc)

    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"talent_pool_opt_in": True, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True, "message": "Profile added to Talent Pool"}


@router.post("/talent-pool/opt-out")
async def talent_pool_opt_out(authorization: Optional[str] = Header(None)):
    user = await _require_auth(authorization)
    uid = str(user["_id"])

    await _db.talent_pool.update_one(
        {"source_platform_user_id": uid},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    await _db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"talent_pool_opt_in": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True, "message": "Profile removed from Talent Pool"}


@router.get("/talent-pool/me/status")
async def talent_pool_my_status(authorization: Optional[str] = Header(None)):
    user = await _require_auth(authorization)
    uid = str(user["_id"])
    existing = await _db.talent_pool.find_one({"source_platform_user_id": uid, "is_active": True})
    return {
        "opted_in": bool(existing),
        "talent_pool_opt_in": user.get("talent_pool_opt_in", False),
    }


# ─── Admin: CRUD ────────────────────────────────────────────────────

@router.post("/admin/talent-pool")
async def admin_create_talent_profile(payload: TalentProfileIn, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    doc = payload.model_dump()
    doc["is_active"] = True
    doc["created_at"] = datetime.now(timezone.utc)
    doc["updated_at"] = datetime.now(timezone.utc)
    result = await _db.talent_pool.insert_one(doc)
    return {"ok": True, "id": str(result.inserted_id)}


@router.patch("/admin/talent-pool/{profile_id}")
async def admin_update_talent_profile(profile_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try:
        oid = ObjectId(profile_id)
    except Exception:
        raise HTTPException(400, "Invalid profile ID")
    existing = await _db.talent_pool.find_one({"_id": oid})
    if not existing:
        raise HTTPException(404, "Profile not found")
    payload["updated_at"] = datetime.now(timezone.utc)
    await _db.talent_pool.update_one({"_id": oid}, {"$set": payload})
    return {"ok": True}


@router.delete("/admin/talent-pool/{profile_id}")
async def admin_delete_talent_profile(profile_id: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try:
        oid = ObjectId(profile_id)
    except Exception:
        raise HTTPException(400, "Invalid profile ID")
    await _db.talent_pool.update_one(
        {"_id": oid},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True}


# ─── Admin: CSV Import ──────────────────────────────────────────────

@router.post("/admin/talent-pool/import/csv")
async def admin_import_talent_csv(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    await _require_admin(authorization)
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in [".csv", ".xlsx", ".xls"]):
        raise HTTPException(400, "Only CSV or XLSX files are supported")

    content = await file.read()

    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(content)

    rows: List[Dict[str, str]] = []
    if file.filename.lower().endswith(".csv"):
        text = content.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            rows.append({k.lower().strip(): (v or "").strip() for k, v in row.items()})
    else:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
            sheet = wb.active
            headers = [str(c.value or "").lower().strip() for c in next(sheet.iter_rows(min_row=1, max_row=1))]
            for r in sheet.iter_rows(min_row=2, values_only=True):
                row = {}
                for i, val in enumerate(r):
                    if i < len(headers):
                        row[headers[i]] = str(val or "").strip()
                if any(v for v in row.values()):
                    rows.append(row)
            wb.close()
        except ImportError:
            raise HTTPException(500, "openpyxl not installed for XLSX support")
        except Exception as e:
            raise HTTPException(400, f"Failed to parse XLSX: {str(e)}")

    if not rows:
        raise HTTPException(400, "No data rows found in file")

    # Map headers using CSV_HEADER_MAP
    mapped_rows = []
    for row in rows:
        mapped = {}
        for target, aliases in CSV_HEADER_MAP.items():
            for h in row:
                if h in aliases:
                    val = row[h]
                    if target == "experience_years" and val:
                        try:
                            mapped[target] = float(val)
                        except ValueError:
                            mapped[target] = 0.0
                    elif target == "skills" and val:
                        mapped[target] = [s.strip() for s in val.replace(";", ",").split(",") if s.strip()]
                    elif target == "graduation_year" and val:
                        try:
                            mapped[target] = int(float(val))
                        except ValueError:
                            pass
                    else:
                        mapped[target] = val
                    break
        if mapped.get("full_name") or mapped.get("email") or mapped.get("linkedin_url"):
            mapped_rows.append(mapped)

    preview = []
    errors = []
    for i, row in enumerate(mapped_rows):
        preview.append({
            "index": i,
            "full_name": row.get("full_name", ""),
            "headline": row.get("headline", ""),
            "email": row.get("email", ""),
            "linkedin_url": row.get("linkedin_url", ""),
            "current_company": row.get("current_company", ""),
            "current_role": row.get("current_role", ""),
            "skills": row.get("skills", []),
        })
        if not row.get("full_name"):
            errors.append({"row": i + 1, "field": "full_name", "message": "Name is required"})
        email = (row.get("email") or "").strip()
        if email:
            from core.email_quality import reject_reason
            why = reject_reason(email)
            if why:
                errors.append({"row": i + 1, "field": "email", "message": why})

    return {"ok": True, "total_rows": len(mapped_rows), "preview": preview, "errors": errors}


@router.post("/admin/talent-pool/import/commit")
async def admin_commit_talent_csv(
    payload: dict,
    authorization: Optional[str] = Header(None),
):
    """Commit previewed rows to talent_pool collection."""
    await _require_admin(authorization)
    rows = payload.get("rows") or payload.get("preview") or []
    if not rows:
        raise HTTPException(400, "No rows to import")

    upserted = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    for row in rows:
        full_name = (row.get("full_name") or "").strip()
        first_name = (row.get("first_name") or "").strip()
        last_name = (row.get("last_name") or "").strip()
        if not full_name and (first_name or last_name):
            full_name = f"{first_name} {last_name}".strip()
        email = (row.get("email") or "").strip().lower()
        linkedin_url = (row.get("linkedin_url") or "").strip()

        if not full_name and not email and not linkedin_url:
            skipped += 1
            continue
        if email:
            from core.email_quality import reject_reason
            if reject_reason(email):
                skipped += 1
                continue

        skills = row.get("skills")
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.replace(";", ",").split(",") if s.strip()]
        if not isinstance(skills, list):
            skills = []
        # TP22: fold raw spellings into canonical skill names so matching math
        # stays meaningful (k8s → Kubernetes, etc.)
        try:
            from services.agents import talent_skill_taxonomy as _tax
            skills = await _tax.canonicalize_skills(_db, [str(s) for s in skills], source="csv")
        except Exception as e:
            logger.warning(f"Skill canonicalization skipped: {e}")

        location = row.get("location") or ""
        zip_code = row.get("zip_code") or ""
        if zip_code and not location:
            location = zip_code
        elif zip_code:
            location = f"{location} {zip_code}".strip()

        doc = {
            "full_name": full_name,
            "headline": row.get("headline"),
            "email": email or None,
            "phone": row.get("phone"),
            "linkedin_url": linkedin_url or None,
            "github_url": row.get("github_url"),
            "location": location,
            "skills": skills,
            "experience_years": row.get("experience_years"),
            "current_company": row.get("current_company"),
            "current_role": row.get("current_role"),
            "education": row.get("education") or row.get("education_institution"),
            "graduation_year": row.get("graduation_year"),
            "bio": row.get("bio"),
            "sa_id": row.get("sa_id"),
            "visa": row.get("visa"),
            "exp_level": row.get("exp_level"),
            "c2c_w2": row.get("c2c_w2"),
            "f2f": row.get("f2f"),
            "interest_status": row.get("interest_status") or "Interested",
            "preferred_location": row.get("preferred_location") or location,
            "certificate_id": row.get("certificate_id"),
            "bgv_id": row.get("bgv_id"),
            "source": "csv",
            "is_active": True,
            "imported_at": now,
            "created_at": now,
            "updated_at": now,
        }

        # Upsert by email then linkedin_url
        existing = None
        if email:
            existing = await _db.talent_pool.find_one({"email": email})
        if not existing and linkedin_url:
            existing = await _db.talent_pool.find_one({"linkedin_url": linkedin_url})

        if existing:
            doc.pop("created_at", None)
            doc.pop("source", None)
            await _db.talent_pool.update_one(
                {"_id": existing["_id"]},
                {"$set": {**doc, "updated_at": now}},
            )
        else:
            await _db.talent_pool.insert_one(doc)
        upserted += 1

    return {"ok": True, "upserted": upserted, "skipped": skipped}


# ─── Admin: Sync ────────────────────────────────────────────────────

@router.post("/admin/talent-pool/sync-linkedin")
async def admin_sync_linkedin_profiles(
    authorization: Optional[str] = Header(None),
    limit: int = Query(50, ge=1, le=200),
):
    """Trigger LinkedIn enrichment for profiles with linkedin_url but stale data."""
    await _require_admin(authorization)

    try:
        from features.linkedin_sync import enrich_profile, enrich_profiles_batch
        from features.linkedin_sync import _get_proxycurl_key, _get_linkedin_api_creds

        proxycurl_key = await _get_proxycurl_key()
        linkedin_creds = await _get_linkedin_api_creds()

        if not proxycurl_key and not linkedin_creds.get("client_id"):
            return {
                "ok": False,
                "message": "No LinkedIn API or Proxycurl credentials configured. "
                           "Install LinkedIn API or Proxycurl from Admin → Marketplace.",
            }
    except ImportError:
        return {"ok": False, "message": "linkedin_sync module not available"}

    # Find profiles with linkedin_url that haven't been synced recently
    stale_threshold = datetime.now(timezone.utc) - timedelta(hours=24)
    cursor = _db.talent_pool.find({
        "linkedin_url": nonempty(),
        "is_active": True,
        "$or": [
            {"last_synced_at": {"$exists": False}},
            {"last_synced_at": None},
            {"last_synced_at": {"$lt": stale_threshold}},
        ],
    }).limit(limit)

    profiles = [doc async for doc in cursor]
    if not profiles:
        return {"ok": True, "synced": 0, "message": "No profiles need syncing"}

    enriched = await enrich_profiles_batch(profiles)
    now = datetime.now(timezone.utc)
    synced = 0

    for profile, data in enriched:
        if not data:
            continue
        update = {}
        for field in ["headline", "skills", "current_company", "current_role",
                       "location", "photo_url", "education", "bio"]:
            if data.get(field):
                update[field] = data[field]
        if update:
            update["last_synced_at"] = now
            update["updated_at"] = now
            await _db.talent_pool.update_one({"_id": profile["_id"]}, {"$set": update})
            synced += 1

    return {"ok": True, "synced": synced, "total_checked": len(profiles)}


@router.post("/admin/talent-pool/sync-from-users")
async def admin_sync_from_platform_users(
    authorization: Optional[str] = Header(None),
):
    """Sync opted-in platform users into talent_pool collection."""
    await _require_admin(authorization)

    cursor = _db.users.find({"talent_pool_opt_in": True, "profile_visibility": {"$ne": "private"}})
    synced = 0
    now = datetime.now(timezone.utc)

    async for user in cursor:
        uid = str(user["_id"])
        existing = await _db.talent_pool.find_one({"source_platform_user_id": uid})

        skills_list = list(set(
            (user.get("skills") or []) +
            (user.get("interests") or [])
        ))
        profile_data = {
            "full_name": user.get("full_name", ""),
            "headline": user.get("headline"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "linkedin_url": user.get("linkedin_url"),
            "github_url": user.get("github_url"),
            "portfolio_url": user.get("portfolio_url"),
            "location": user.get("location") or user.get("city"),
            "skills": skills_list,
            "experience_years": (
                user.get("alumni_info", {}).get("years_of_experience") or
                user.get("mentor_info", {}).get("years_of_experience")
            ),
            "current_company": (
                user.get("alumni_info", {}).get("current_employer") or
                user.get("mentor_info", {}).get("organization")
            ),
            "current_role": (
                user.get("alumni_info", {}).get("current_role") or
                user.get("mentor_info", {}).get("job_title")
            ),
            "education": (user.get("school_info") or {}).get("institution_name"),
            "graduation_year": (user.get("school_info") or {}).get("graduation_year"),
            "photo_url": user.get("photo_data") if user.get("photo_data") and not str(user.get("photo_data", "")).startswith("data:") else None,
            "photo_data": user.get("photo_data") if user.get("photo_data") and str(user.get("photo_data", "")).startswith("data:") else None,
            "bio": user.get("bio"),
            "source": "platform",
            "source_platform_user_id": uid,
            "is_active": True,
            "updated_at": now,
        }

        if existing:
            await _db.talent_pool.update_one(
                {"_id": existing["_id"]},
                {"$set": profile_data},
            )
        else:
            profile_data["created_at"] = now
            await _db.talent_pool.insert_one(profile_data)
        synced += 1

    return {"ok": True, "synced": synced}


@router.get("/admin/talent-pool")
async def admin_list_talent_pool(
    authorization: Optional[str] = Header(None),
    q: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    await _require_admin(authorization)

    mongo_filter: Dict[str, Any] = {}
    if q:
        escaped = re.escape(q.strip())
        mongo_filter["$or"] = [
            {"full_name":          {"$regex": escaped, "$options": "i"}},
            {"headline":           {"$regex": escaped, "$options": "i"}},
            {"current_role":       {"$regex": escaped, "$options": "i"}},
            {"current_company":    {"$regex": escaped, "$options": "i"}},
            {"location":           {"$regex": escaped, "$options": "i"}},
            {"education":          {"$regex": escaped, "$options": "i"}},
            {"bio":                {"$regex": escaped, "$options": "i"}},
            {"skills":             {"$regex": escaped, "$options": "i"}},
        ]
    if source:
        mongo_filter["source"] = source
    if is_active is not None:
        mongo_filter["is_active"] = is_active

    skip = (page - 1) * limit
    cursor = _db.talent_pool.find(mongo_filter).sort("created_at", -1).skip(skip).limit(limit)
    items = [_profile_out(doc) async for doc in cursor]
    total = await _db.talent_pool.count_documents(mongo_filter)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.post("/admin/talent-pool/bulk-action")
async def admin_bulk_action(
    payload: dict,
    authorization: Optional[str] = Header(None),
):
    """Bulk activate/deactivate/delete talent pool profiles."""
    await _require_admin(authorization)
    ids = payload.get("ids") or []
    action = payload.get("action", "")
    if not ids or action not in ("activate", "deactivate", "delete"):
        raise HTTPException(400, "Provide ids list and action (activate|deactivate|delete)")

    oids = []
    for id_ in ids:
        try:
            oids.append(ObjectId(id_))
        except Exception:
            continue

    if not oids:
        raise HTTPException(400, "No valid IDs provided")

    now = datetime.now(timezone.utc)
    if action == "delete":
        await _db.talent_pool.delete_many({"_id": {"$in": oids}})
    else:
        await _db.talent_pool.update_many(
            {"_id": {"$in": oids}},
            {"$set": {"is_active": action == "activate", "updated_at": now}},
        )

    return {"ok": True, "affected": len(oids)}


class PromoteCandidateBody(BaseModel):
    profile_id: str
    category: str = "alumni"  # student, alumni, mentor
    send_invite: bool = True


@router.post("/admin/talent-pool/promote-to-user")
async def promote_talent_to_user(
    body: PromoteCandidateBody,
    authorization: Optional[str] = Header(None),
):
    """Promote a candidate in talent_pool into a registered/approved platform user."""
    await _require_admin(authorization)
    try:
        oid = ObjectId(body.profile_id)
    except Exception:
        raise HTTPException(400, "Invalid profile_id")

    candidate = await _db.talent_pool.find_one({"_id": oid})
    if not candidate:
        raise HTTPException(404, "Candidate profile not found")

    email = (candidate.get("email") or "").strip().lower()
    full_name = (candidate.get("full_name") or "").strip()
    name_parts = full_name.split(" ", 1)
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    cat = body.category.lower()
    if cat not in ("student", "alumni", "mentor", "masters"):
        cat = "alumni"

    now = datetime.now(timezone.utc)
    user_data = {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": full_name,
        "name": full_name,
        "phone": candidate.get("phone"),
        "linkedin_url": candidate.get("linkedin_url"),
        "location": candidate.get("location"),
        "company": candidate.get("current_company"),
        "designation": candidate.get("current_role") or candidate.get("headline"),
        "headline": candidate.get("headline"),
        "college": candidate.get("education"),
        "graduation_year": candidate.get("graduation_year"),
        "experience_years": candidate.get("experience_years"),
        "skills": candidate.get("skills", []),
        "category": cat,
        "role": cat,
        "approved": True,
        "approved_at": now,
        "created_by": "talent_pool_promotion",
        "created_at": now,
        "updated_at": now,
    }

    existing_user = None
    if email:
        existing_user = await _db.users.find_one({"email": email})
    if not existing_user and candidate.get("linkedin_url"):
        existing_user = await _db.users.find_one({"linkedin_url": candidate["linkedin_url"]})

    if existing_user:
        await _db.users.update_one({"_id": existing_user["_id"]}, {"$set": user_data})
        user_id = str(existing_user["_id"])
    else:
        res = await _db.users.insert_one(user_data)
        user_id = str(res.inserted_id)

    # Link back to talent pool
    await _db.talent_pool.update_one(
        {"_id": oid},
        {"$set": {"source_platform_user_id": user_id, "updated_at": now}}
    )

    invite_sent = False
    if body.send_invite and email:
        try:
            from core.email import send_email, render_html_email
            portal_url = frontend_base_url()
            claim_url = f"{portal_url}/auth?mode=claim&email={email}"
            content = f"""
            <h2 style="color: #1E293B; margin-top: 0; font-size: 20px;">Welcome to Student Alumni Platform, {first_name or full_name}!</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Your candidate profile has been connected and activated on the <strong>Student Alumni Network</strong> as a <strong>{cat.capitalize()}</strong>.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Connect with alumni mentors, participate in hiring tracks, and expand your campus reach.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{claim_url}" style="background: linear-gradient(135deg, #7C3AED, #5B21B6); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">
                    Access Your Account
                </a>
            </div>
            """
            await send_email(email, f"Welcome to Student Alumni — {cat.capitalize()} Account Ready", render_html_email(content))
            invite_sent = True
            await _db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"invite_sent_at": now, "invite_status": "sent"}})
        except Exception as e:
            print(f"[Promote] Invite send error: {e}")

    return {"ok": True, "user_id": user_id, "invite_sent": invite_sent}


# ─── Talent Pool AI Scraping Agents ─────────────────────────────────
from services.agents.talent_scraper_ai_agent import (
    talent_scraper_ai_agent,
    ScrapeProfileRequest,
    ScrapeProfileResponse,
    BatchScrapeRequest,
    BatchScrapeResponse,
)

@router.post("/admin/talent-pool/ai/scrape-and-store", response_model=ScrapeProfileResponse)
async def ai_scrape_and_store(
    req: ScrapeProfileRequest,
    authorization: Optional[str] = Header(None)
):
    """Agent 1 & 2 & 3: Scrapes candidate URL/resume, extracts skills & seniority, and saves to MongoDB."""
    await _require_admin(authorization)
    return await talent_scraper_ai_agent.scrape_and_enrich_candidate(req, db=_db)


@router.post("/admin/talent-pool/ai/batch-source", response_model=BatchScrapeResponse)
async def ai_batch_source(
    req: BatchScrapeRequest,
    authorization: Optional[str] = Header(None)
):
    """Batch Agent: Ingests 50+ candidate URLs concurrently, normalizes data, and syncs talent pool."""
    await _require_admin(authorization)
    return await talent_scraper_ai_agent.batch_source_candidates(req, db=_db)


# ─── AI Resume Parser & Recruiter Skill-Matcher ──────────────────────
class MatchScoreRequest(BaseModel):
    candidate_id: str
    target_role: Optional[str] = "Full Stack Engineer"
    required_skills: Optional[List[str]] = ["React", "Python", "FastAPI", "MongoDB"]
    min_cgpa: Optional[float] = 7.5

@router.post("/admin/talent-pool/ai/parse-resume")
async def ai_parse_resume(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """TP17: real NLP resume parser (spaCy/skillNer/dateparser + PyMuPDF/python-docx).
    Keeps the legacy {filename, parsed_profile} shape; adds confidence + the
    structured extras the real extractor produces. House security scan first."""
    await _require_admin(authorization)
    filename = file.filename or "resume.pdf"

    from security_scanner import scan_file_for_viruses_async
    content = await file.read()
    await scan_file_for_viruses_async(content)

    from services.agents import talent_resume_parser as _tp17
    res = await _tp17.parse_resume(_db, content, filename)

    if not res.get("success"):
        return {"filename": filename, "parsed_profile": None, "error": res.get("error", "unparseable")}

    edu = res.get("education") or []
    parts = []
    for e in edu:
        if isinstance(e, dict):
            s = " ".join(str(e.get(k)) for k in ("degree", "field", "school", "year") if e.get(k))
            if s:
                parts.append(s)
        elif e:
            parts.append(str(e))
    edu_str = " | ".join(parts) or None

    parsed_profile = {
        "name": res.get("name"),
        "skills": res.get("skills", []),
        "education": edu_str,
        "education_detail": edu,
        "cgpa": res.get("cgpa"),
        "experience_years": res.get("experience_years"),
        "seniority": res.get("seniority"),
        "top_projects": res.get("top_projects", []),
        "certifications": res.get("certifications", []),
        "ai_summary": res.get("ai_summary"),
        "extraction_method": res.get("extraction_method"),
        "confidence": res.get("confidence"),
        "warnings": res.get("warnings", []),
    }
    return {"filename": filename, "parsed_profile": parsed_profile}


@router.post("/admin/talent-pool/ai/match-score")
async def calculate_ai_job_fit_score(
    req: MatchScoreRequest,
    authorization: Optional[str] = Header(None)
):
    """TP18: real hybrid match score (semantic + skill-overlap + experience fit)
    from the match engine, keeping the legacy response shape for the frontend."""
    await _require_admin(authorization)
    from services.agents import talent_match_engine as _tp18

    opening = {
        "title": req.target_role or "Full Stack Engineer",
        "skills": req.required_skills or [],
        "description": "",
    }
    try:
        res = await _tp18.match_score(_db, req.candidate_id, opening)
    except ValueError as e:
        raise HTTPException(404, str(e))
    res.setdefault("candidate_id", req.candidate_id)
    res.setdefault("target_role", req.target_role)
    res.setdefault("ai_recommendation", res.get("recommendation"))
    return res


# ─── Talent Pool Agent Suite (TP15-TP32) ─────────────────────────
# Foundation endpoints for the real open-source agents. The legacy
# `ai/parse-resume` (TP17) and `ai/match-score` (TP18) fakes are now
# wired to the real agents above.
from pydantic import BaseModel as _TPBaseModel

class DripCampaignRequest(_TPBaseModel):
    name: str
    opening_ref: Optional[str] = None

class ConsentRequest(_TPBaseModel):
    profile_id: str
    email: str
    purposes: List[str]

class ErasureRequest(_TPBaseModel):
    profile_id: str
    reason: str = ""

class NoteRequest(_TPBaseModel):
    profile_id: str
    note: str
    tag: str = "note"

class PromoteSkillRequest(_TPBaseModel):
    canonical: str
    aliases: List[str]

class ScoreNowRequest(_TPBaseModel):
    profile_id: str

# ── TP21: outreach drips ──────────────────────────────────────────
@router.post("/admin/talent-pool/drips/create")
async def tp_create_drip_campaign(req: DripCampaignRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_outreach as _tp21
    return await _tp21.create_drip_campaign(_db, actor=await _actor_for(authorization), name=req.name, opening_ref=req.opening_ref)

@router.get("/admin/talent-pool/drips")
async def tp_list_drips(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_outreach as _tp21
    return await _tp21.list_campaigns(_db)

@router.post("/admin/talent-pool/drips/run")
async def tp_run_drips(campaign_id: Optional[str] = None, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_outreach as _tp21
    return await _tp21.run_due_drips(_db, campaign_id=campaign_id)

@router.get("/admin/talent-pool/drips/{campaign_id}/stats")
async def tp_drip_stats(campaign_id: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_outreach as _tp21
    return await _tp21.campaign_stats(_db, campaign_id)

# Public tracking endpoints (fired by tracked links in drip emails; the
# token is the credential — no bearer required).
@router.get("/admin/talent-pool/outreach/track/{token}/open")
async def tp_track_open(token: str):
    from services.agents import talent_outreach as _tp21
    out = await _tp21.track_open(_db, token)
    return HTMLResponse("<meta http-equiv='refresh' content='0; url=/careers'/>")

@router.get("/admin/talent-pool/outreach/track/{token}/click")
async def tp_track_click(token: str, url: str = ""):
    from services.agents import talent_outreach as _tp21
    await _tp21.track_click(_db, token, url)
    if url:
        return HTMLResponse(f"<meta http-equiv='refresh' content='0; url={url}'/>")
    return HTMLResponse("<meta http-equiv='refresh' content='0; url=/careers'/>")

@router.get("/admin/talent-pool/outreach/optout/{token}")
async def tp_outreach_optout(token: str):
    """Public per-recipient opt-out link (one in each drip email)."""
    from services.agents import talent_outreach as _tp21
    out = await _tp21.record_optout(_db, token)
    return HTMLResponse(
        "<meta http-equiv='refresh' content='0; url=/careers'/>"
        "<p>You have been unsubscribed from AXISS outreach. "
        + ("Done." if out.get("ok") else "Your link is invalid or expired.") + "</p>")

@router.post("/admin/talent-pool/drips/optout")
async def tp_drip_optout(token: Optional[str] = None, profile_id: Optional[str] = None, email: Optional[str] = None,
                         authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_outreach as _tp21
    target = token or profile_id
    if not target:
        from fastapi import HTTPException
        raise HTTPException(400, "token, profile_id or email required")
    return await _tp21.record_optout(_db, target, email=email)

@router.post("/admin/talent-pool/drips/reply")
async def tp_drip_reply(token: str, direction: str = "inbound", authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_outreach as _tp21
    return await _tp21.record_reply(_db, token, direction=direction)

# ── TP24: data quality rubric ────────────────────────────────────
@router.post("/admin/talent-pool/quality/run")
async def tp_quality_run(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_quality_scorer as _tp24
    return await _tp24.score_profiles(_db)

@router.get("/admin/talent-pool/quality/report")
async def tp_quality_report(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_quality_scorer as _tp24
    return await _tp24.quality_report(_db)

@router.post("/admin/talent-pool/quality/score-now")
async def tp_quality_score_now(req: ScoreNowRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_quality_scorer as _tp24
    return await _tp24.score_single(_db, req.profile_id) or {"scored": False}

# ── TP22: skill taxonomy ─────────────────────────────────────────
@router.get("/admin/talent-pool/skills/taxonomy")
async def tp_taxonomy_report(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_skill_taxonomy as _tp22
    return await _tp22.taxonomy_report(_db)

@router.get("/admin/talent-pool/skills/status")
async def tp_skill_index_status(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_skill_taxonomy as _tp22
    return await _tp22.skill_index_status(_db)

@router.post("/admin/talent-pool/skills/promote")
async def tp_skill_promote(req: PromoteSkillRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_skill_taxonomy as _tp22
    return await _tp22.review_promote(_db, req.canonical, req.aliases)

@router.post("/admin/talent-pool/skills/canonicalize")
async def tp_skill_canonicalize(req: List[str], authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_skill_taxonomy as _tp22
    return {"canonical": await _tp22.canonicalize_skills(_db, req)}

# ── TP25: DPDP compliance ────────────────────────────────────────
@router.get("/admin/talent-pool/compliance/report")
async def tp_compliance_report(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_compliance as _tp25
    return await _tp25.compliance_report(_db)

@router.post("/admin/talent-pool/compliance/consent")
async def tp_record_consent(req: ConsentRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_compliance as _tp25
    await _tp25.record_consent(_db, req.profile_id, req.email, req.purposes, actor=await _actor_for(authorization))
    return {"ok": True}

@router.get("/admin/talent-pool/compliance/consent/{email}")
async def tp_consent_status(email: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_compliance as _tp25
    return await _tp25.consent_status(_db, email)

@router.post("/admin/talent-pool/compliance/consent/revoke")
async def tp_revoke_consent(email: str, reason: str = "", authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_compliance as _tp25
    return await _tp25.revoke_consent(_db, email, reason=reason)

@router.post("/admin/talent-pool/compliance/encrypt-pii")
async def tp_encrypt_pool_pii(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_compliance as _tp25
    return await _tp25.encrypt_pool_pii(_db)

@router.post("/admin/talent-pool/compliance/erasure")
async def tp_request_erasure(req: ErasureRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_compliance as _tp25
    return await _tp25.request_erasure(_db, req.profile_id, actor=await _actor_for(authorization), reason=req.reason)

@router.get("/admin/talent-pool/compliance/erasure/history")
async def tp_erasure_history(limit: int = 50, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_compliance as _tp25
    return {"events": await _tp25.erasure_history(_db, limit)}

# ── TP26: activity timeline ──────────────────────────────────────
@router.post("/admin/talent-pool/notes")
async def tp_add_note(req: NoteRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_activity_log as _tp26
    return await _tp26.add_manual_note(_db, req.profile_id, await _actor_for(authorization), req.note, tag=req.tag)

@router.get("/admin/talent-pool/activity")
async def tp_activity_timeline(profile_id: Optional[str] = None, action: Optional[str] = None,
                               limit: int = 50, window_days: Optional[int] = None,
                               authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_activity_log as _tp26
    return await _tp26.activity_timeline(_db, profile_id=profile_id, action=action, limit=limit, window_days=window_days)

@router.get("/admin/talent-pool/activity/recent/{profile_id}")
async def tp_recent_activity(profile_id: str, limit: int = 8, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_activity_log as _tp26
    return await _tp26.recent_activity(_db, profile_id, limit=limit)

# ── TP23: scheduler registry status ──────────────────────────────
@router.get("/admin/talent-pool/agents/scheduler-status")
async def tp_scheduler_status(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_scheduler as _tp23
    return await _tp23.status(_db)

# ── Dashboard aggregator: all agent cards (TP15-TP32) ────────────
# (key, module, optional-instance-attr, optional-singleton-attr)
_AGENT_MODULES = [
    ("tp15_16_enrichment", "services.agents.talent_enrichment", "talent_enrichment_agent"),
    ("tp17_resume", "services.agents.talent_resume_parser", "talent_resume_parser_agent"),
    ("tp18_matching", "services.agents.talent_match_engine", "talent_match_agent"),
    ("tp19_ranker", "services.agents.talent_ranker", "TalentRanker"),
    ("tp20_dedup", "services.agents.talent_dedup", "tp20_dedup_agent"),
    ("tp21_outreach", "services.agents.talent_outreach", "talent_outreach_agent"),
    ("tp22_taxonomy", "services.agents.talent_skill_taxonomy", "taxonomy_agent"),
    ("tp23_scheduler", "services.agents.talent_scheduler", "talent_scheduler_agent"),
    ("tp24_quality", "services.agents.talent_quality_scorer", "quality_agent"),
    ("tp25_compliance", "services.agents.talent_compliance", "compliance_agent"),
    ("tp26_activity", "services.agents.talent_activity_log", "activity_agent"),
    ("tp27_insights", "services.agents.talent_insights", "tp27_insights_agent"),
    ("tp28_29_external", "services.agents.talent_external_jobs", "external_jobs_agent"),
    ("tp30_whatsapp", "services.agents.talent_whatsapp", "whatsapp_agent"),
    ("tp31_ats", "services.agents.talent_integrations", "talent_integrations"),
    ("tp32_calendar", "services.agents.talent_interviews", "talent_interviews"),
]

@router.get("/admin/talent-pool/agents/status")
async def tp_all_agent_status(authorization: Optional[str] = Header(None)):
    """Dashboard: per-agent card data. Missing/optional modules report
    `available: false` instead of 500'ing the whole tab."""
    await _require_admin(authorization)
    out: Dict[str, Any] = {}
    import importlib
    for key, mod_path, attr in _AGENT_MODULES:
        try:
            mod = importlib.import_module(mod_path)
            agent = getattr(mod, attr, None)
            # agent_status may live on the singleton instance or at module level
            st_fn = getattr(agent, "agent_status", None) or getattr(mod, "agent_status", None)
            if st_fn is not None:
                st = await st_fn(_db)
                out[key] = {"available": True, **(st or {})}
            elif agent is not None:
                out[key] = {"available": True, "name": getattr(agent, "name", key), "status": "idle"}
            else:
                out[key] = {"available": True, "name": key, "status": "idle"}
        except Exception as e:
            out[key] = {"available": False, "reason": str(e)[:200]}
    return {"agents": out}


# ── Sub-tab data endpoints (Duplicates / Insights / External Jobs / Ranker) ─
class DuplicateMergeRequest(_TPBaseModel):
    group_id: Optional[str] = None
    keep_ref: Any
    drop_refs: List[Any]
    reasons: Optional[List[str]] = None


@router.get("/admin/talent-pool/duplicates")
async def tp_duplicate_groups(authorization: Optional[str] = Header(None)):
    """Duplicates tab: stored open groups (last scan), newest first."""
    await _require_admin(authorization)
    docs = await _db.talent_pool_dedup_groups.find(
        {"status": "open"}
    ).sort("updated_at", -1).limit(200).to_list(200)
    out = []
    for d in docs:
        found = d.get("found_at")
        updated = d.get("updated_at")
        out.append({
            "group_id": d.get("group_id"),
            "members": d.get("members", []),
            "reasons": d.get("reasons", []),
            "suggested_keeper": d.get("suggested_keeper"),
            "collections": d.get("collections", []),
            "found_at": found.isoformat() if found else None,
            "updated_at": updated.isoformat() if updated else None,
        })
    return {"open_groups": len(out), "groups": out}


@router.post("/admin/talent-pool/duplicates/rescan")
async def tp_duplicate_rescan(authorization: Optional[str] = Header(None)):
    """Re-run the blocking + rapidfuzz scan and upsert open groups."""
    await _require_admin(authorization)
    from services.agents import talent_dedup as _tp20
    res = await _tp20.find_duplicate_groups(_db)
    return {
        "groups_found": res.get("groups_found"),
        "pairs_checked": res.get("pairs_checked"),
        "groups": res.get("groups", [])[:100],
    }


@router.post("/admin/talent-pool/duplicates/merge")
async def tp_duplicate_merge(
    req: DuplicateMergeRequest,
    authorization: Optional[str] = Header(None),
):
    """Merge a group's duplicates into the keeper (soft, reversible, audited)."""
    await _require_admin(authorization)
    from services.agents import talent_dedup as _tp20
    res = await _tp20.merge_candidates(
        _db, req.keep_ref, req.drop_refs, actor="admin", reasons=req.reasons,
    )
    if req.group_id and res.get("merged"):
        await _db.talent_pool_dedup_groups.update_one(
            {"group_id": req.group_id},
            {"$set": {"status": "merged", "merged_at": datetime.now(timezone.utc)}},
        )
    return res


@router.get("/admin/talent-pool/insights")
async def tp_insights(authorization: Optional[str] = Header(None), limit: int = Query(8, le=24)):
    """Analytics tab: newest weekly insight reports."""
    await _require_admin(authorization)
    from services.agents import talent_insights as _tp27
    return await _tp27.latest_insights(_db, limit=limit)


@router.post("/admin/talent-pool/insights/generate")
async def tp_insights_generate(authorization: Optional[str] = Header(None)):
    """Force a weekly insights recomputation now (scheduler also runs it)."""
    await _require_admin(authorization)
    from services.agents import talent_insights as _tp27
    return await _tp27.generate_weekly_insights(_db)


@router.get("/admin/talent-pool/external-jobs")
async def tp_external_jobs(
    board: Optional[str] = Query(None),
    include_expired: bool = Query(True),
    limit: int = Query(100, le=500),
    authorization: Optional[str] = Header(None),
):
    """External Jobs tab: latest listings from the Naukri/Internshala spiders."""
    await _require_admin(authorization)
    from services.agents import talent_external_jobs as _tp28
    return await _tp28.list_external_jobs(_db, board=board, include_expired=include_expired, limit=limit)


@router.post("/admin/talent-pool/external-jobs/fetch")
async def tp_external_jobs_fetch(
    query: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    authorization: Optional[str] = Header(None),
):
    """Trigger an on-demand scrape of the key-gated boards (static fallback)."""
    await _require_admin(authorization)
    from services.agents import talent_external_jobs as _tp28
    return {"listings": await _tp28.fetch_external_jobs(_db, query=query, limit=limit)}


@router.get("/admin/talent-pool/external-jobs/deadlines")
async def tp_external_job_deadlines(
    days: int = Query(7, le=60),
    authorization: Optional[str] = Header(None),
):
    """Internships closing within `days` days (deadline alerts)."""
    await _require_admin(authorization)
    from services.agents import talent_external_jobs as _tp28
    return await _tp28.deadline_alerts(_db, days=days)


@router.get("/admin/talent-pool/ranker")
async def tp_ranker(
    title: Optional[str] = Query(None),
    skills: Optional[str] = Query(None, description="comma-separated required skills"),
    min_experience: Optional[float] = Query(None),
    max_experience: Optional[float] = Query(None),
    k: int = Query(20, le=100),
    authorization: Optional[str] = Header(None),
):
    """Rank candidates for an opening (ML when labels>=50, else cold-start)."""
    await _require_admin(authorization)
    from services.agents import talent_ranker as _tp19
    opening: Dict[str, Any] = {}
    if title:
        opening["title"] = title
    if skills:
        opening["skills"] = [s.strip() for s in skills.split(",") if s.strip()]
    if min_experience is not None:
        opening["min_experience"] = min_experience
    if max_experience is not None:
        opening["max_experience"] = max_experience
    ranked = await _tp19.rank_candidates(_db, opening or None, k=k)
    ranked["health"] = await _tp19.ranking_health(_db)
    return ranked


@router.post("/admin/talent-pool/ranker/retrain")
async def tp_ranker_retrain(authorization: Optional[str] = Header(None)):
    """Re-fit the LogisticRegression on career_application_history labels."""
    await _require_admin(authorization)
    from services.agents import talent_ranker as _tp19
    return await _tp19.retrain(_db)


# ── TP15/16: LinkedIn + GitHub enrichment (key-gated, audit-trailed) ─
class EnrichLinkedInRequest(_TPBaseModel):
    profile_id: Optional[str] = None
    linkedin_url: Optional[str] = None

class EnrichGitHubRequest(_TPBaseModel):
    profile_id: Optional[str] = None
    github_url: Optional[str] = None
    username: Optional[str] = None

class EnrichBatchRequest(_TPBaseModel):
    source: str
    limit: int = 50

@router.post("/admin/talent-pool/enrich/linkedin")
async def tp_enrich_linkedin(req: EnrichLinkedInRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_enrichment as _tp15
    return await _tp15.enrich_linkedin(_db, profile_id=req.profile_id, linkedin_url=req.linkedin_url)

@router.post("/admin/talent-pool/enrich/github")
async def tp_enrich_github(req: EnrichGitHubRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_enrichment as _tp16
    return await _tp16.enrich_github(_db, profile_id=req.profile_id, github_url=req.github_url, username=req.username)

@router.post("/admin/talent-pool/enrich/batch")
async def tp_enrich_batch(req: EnrichBatchRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_enrichment as _tp15
    return await _tp15.batch_reenrich(_db, source=req.source, limit=req.limit)

# ── TP30: WhatsApp Cloud API ───────────────────────────────────────
class WhatsAppSendRequest(_TPBaseModel):
    profile_id: str
    template: str
    variables: Dict[str, str] = {}

@router.post("/admin/talent-pool/whatsapp/send")
async def tp_whatsapp_send(req: WhatsAppSendRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_whatsapp as _tp30
    return await _tp30.send_whatsapp(_db, req.profile_id, req.template, req.variables,
                                     actor=await _actor_for(authorization))

@router.post("/admin/talent-pool/whatsapp/webhook")
async def tp_whatsapp_webhook(payload: Dict[str, Any], kind: str = "delivery",
                              authorization: Optional[str] = Header(None)):
    """Meta Graph status/reply webhook. Open by design (Meta signs via
    `TP_WHATSAPP_WEBHOOK_TOKEN` header check when that env is set); mirrors
    the public outreach tracker pattern — the payload itself is untrusted."""
    import os
    expected = os.environ.get("TP_WHATSAPP_WEBHOOK_TOKEN", "").strip()
    if expected:
        got = ""
        if authorization:
            got = authorization.replace("Bearer ", "").strip()
        if got != expected:
            from fastapi import HTTPException
            raise HTTPException(401, "webhook token mismatch")
    from services.agents import talent_whatsapp as _tp30
    return await (_tp30.record_delivery if kind == "delivery" else _tp30.record_reply)(_db, payload)

@router.get("/admin/talent-pool/whatsapp/usage-alert")
async def tp_whatsapp_usage(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_whatsapp as _tp30
    return await _tp30.usage_alert(_db)

# ── TP31: ATS/CRM push ────────────────────────────────────────────
class AtsPushRequest(_TPBaseModel):
    profile_id: str
    atses: Optional[List[str]] = None

@router.post("/admin/talent-pool/ats/push")
async def tp_ats_push(req: AtsPushRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_integrations as _tp31
    return await _tp31.push_candidate(_db, req.profile_id, atses=req.atses,
                                      actor=await _actor_for(authorization))

@router.get("/admin/talent-pool/ats/status")
async def tp_ats_status(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_integrations as _tp31
    return await _tp31.ats_status(_db)

@router.post("/admin/talent-pool/ats/field-mappings")
async def tp_ats_field_mappings(authorization: Optional[str] = Header(None)):
    """Seed default field maps for any unconfigured ATS."""
    await _require_admin(authorization)
    from services.agents import talent_integrations as _tp31
    return {"seeded": await _tp31.ensure_field_mappings(_db)}

# ── TP32: interviews / calendar ───────────────────────────────────
class InterviewRequest(_TPBaseModel):
    profile_id: str
    start: Any
    duration_min: int = 45
    organizer_email: Optional[str] = None
    invitee_email: Optional[str] = None
    location: str = ""
    summary: Optional[str] = None
    description: str = ""
    calendar: str = "auto"

class InterviewFeedbackRequest(_TPBaseModel):
    decision: str
    notes: str = ""
    rating: Optional[int] = None

@router.post("/admin/talent-pool/interviews")
async def tp_create_interview(req: InterviewRequest, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_interviews as _tp32
    return await _tp32.create_interview(
        _db, req.profile_id, req.start, duration_min=req.duration_min,
        organizer_email=req.organizer_email, invitee_email=req.invitee_email,
        location=req.location, summary=req.summary, description=req.description,
        calendar=req.calendar, actor=await _actor_for(authorization),
    )

@router.get("/admin/talent-pool/interviews")
async def tp_interview_list(profile_id: Optional[str] = None, limit: int = Query(50, le=200),
                           authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_interviews as _tp32
    return await _tp32.interview_list(_db, profile_id=profile_id, limit=limit)

@router.post("/admin/talent-pool/interviews/{interview_id}/feedback")
async def tp_interview_feedback(interview_id: str, req: InterviewFeedbackRequest,
                               authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    from services.agents import talent_interviews as _tp32
    return await _tp32.record_interview_feedback(
        _db, interview_id, req.decision, notes=req.notes, rating=req.rating,
        actor=await _actor_for(authorization),
    )


# ─── Startup ────────────────────────────────────────────────────────
def setup():
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(_ensure_indexes())
    except RuntimeError:
        pass

