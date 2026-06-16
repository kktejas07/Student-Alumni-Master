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
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv()

router = APIRouter()
logger = logging.getLogger("talent_pool")

# ─── Mongo ─────────────────────────────────────────────────────────
_MONGO_URL = os.getenv("MONGO_URL") or "mongodb://localhost:27017"
_DB_NAME   = os.getenv("DB_NAME") or "studentalumniadmin"
_client    = AsyncIOMotorClient(_MONGO_URL)
_db        = _client[_DB_NAME]

# ─── Token / auth helpers ──────────────────────────────────────────
try:
    import jwt
    _JWT_SECRET = os.getenv("JWT_SECRET", "")
except Exception:
    jwt = None  # type: ignore
    _JWT_SECRET = ""


async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        if jwt is None:
            return None
        payload = jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
    except Exception:
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


class TalentProfileOut(BaseModel):
    id: str
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
    return {
        "id": str(doc["_id"]),
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
        "imported_at": doc.get("imported_at").isoformat() if doc.get("imported_at") else None,
        "last_synced_at": doc.get("last_synced_at").isoformat() if doc.get("last_synced_at") else None,
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


# ─── CSV header mapping ─────────────────────────────────────────────
CSV_HEADER_MAP: Dict[str, List[str]] = {
    "full_name":    ["full name", "name", "fullname", "candidate name", "first name"],
    "headline":     ["headline", "tagline", "title", "designation"],
    "email":        ["email", "email address", "e-mail", "mail"],
    "phone":        ["phone", "phone number", "mobile", "contact number"],
    "linkedin_url": ["linkedin url", "linkedin", "profile url", "linkedin profile"],
    "github_url":   ["github url", "github", "github profile"],
    "location":     ["location", "city", "region", "address"],
    "skills":       ["skills", "skill", "tech stack", "technologies", "key skills"],
    "experience_years": ["experience years", "experience", "years of experience", "yoe", "total experience"],
    "current_company": ["current company", "company", "employer", "organization"],
    "current_role": ["current role", "role", "job title", "position"],
    "education":    ["education", "degree", "qualification", "highest education"],
    "graduation_year": ["graduation year", "grad year", "year of graduation", "passing year"],
    "bio":          ["bio", "about", "summary", "description"],
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
            "photo_url": user.get("photo_data"),
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
        email = (row.get("email") or "").strip().lower()
        linkedin_url = (row.get("linkedin_url") or "").strip()

        if not full_name and not email and not linkedin_url:
            skipped += 1
            continue

        skills = row.get("skills")
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.replace(";", ",").split(",") if s.strip()]
        if not isinstance(skills, list):
            skills = []

        doc = {
            "full_name": full_name,
            "headline": row.get("headline"),
            "email": email or None,
            "phone": row.get("phone"),
            "linkedin_url": linkedin_url or None,
            "github_url": row.get("github_url"),
            "location": row.get("location"),
            "skills": skills,
            "experience_years": row.get("experience_years"),
            "current_company": row.get("current_company"),
            "current_role": row.get("current_role"),
            "education": row.get("education"),
            "graduation_year": row.get("graduation_year"),
            "bio": row.get("bio"),
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
        from linkedin_sync import enrich_profile, enrich_profiles_batch
        from linkedin_sync import _get_proxycurl_key, _get_linkedin_api_creds

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
        "linkedin_url": {"$exists": True, "$ne": None, "$ne": ""},
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
            "photo_url": user.get("photo_data"),
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
        mongo_filter["$text"] = {"$search": q}
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


# ─── Startup ────────────────────────────────────────────────────────
def setup():
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(_ensure_indexes())
    except RuntimeError:
        pass
