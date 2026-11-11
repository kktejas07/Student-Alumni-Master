"""
backend/routers/careers.py — First-Party Careers & Opportunities Module.

This router manages StudentAlumni's internal/first-party career openings
and direct student applications.
NOTE: Completely separate from the external Jobs & Internships feed (jobs_feed.py).
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from core.db import db
from core.deps import get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/careers", tags=["First-Party Careers"])

ADMIN_ROLES = ("admin", "superadmin", "super_admin")


# ── Pydantic Request Models ──────────────────────────────────────────────────

class CareerOpeningCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    company_name: str = Field(..., min_length=2, max_length=200)
    company_logo: Optional[str] = None
    description: str = Field(..., min_length=10)
    responsibilities: Optional[List[str]] = []
    requirements: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    employment_type: str = Field(default="FULL_TIME")  # FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT
    work_mode: str = Field(default="REMOTE")           # REMOTE, HYBRID, ON_SITE
    location: str = Field(default="Remote")
    experience_level: str = Field(default="ANY")       # ENTRY, MID, SENIOR, LEAD, ANY
    salary_range: Optional[str] = None
    application_deadline: Optional[datetime] = None
    number_of_openings: Optional[int] = 1
    status: str = Field(default="DRAFT")               # DRAFT, PUBLISHED, CLOSED
    featured: bool = False
    application_url: Optional[str] = None
    benefits: Optional[List[str]] = []


class CareerOpeningUpdate(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    location: Optional[str] = None
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    application_deadline: Optional[datetime] = None
    number_of_openings: Optional[int] = None
    status: Optional[str] = None
    featured: Optional[bool] = None
    application_url: Optional[str] = None
    benefits: Optional[List[str]] = None


class CareerApplicationSubmit(BaseModel):
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    phone: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(APPLIED|UNDER_REVIEW|SHORTLISTED|INTERVIEW|SELECTED|REJECTED|WITHDRAWN)$")
    admin_notes: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_mongo_doc(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    res = dict(doc)
    if "_id" in res:
        res["_id"] = str(res["_id"])
    return res


def _clean_student_app(app: dict) -> dict:
    """Ensure student cannot see internal admin notes."""
    cleaned = _serialize_mongo_doc(app)
    if cleaned and "admin_notes" in cleaned:
        del cleaned["admin_notes"]
    return cleaned


# ── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────────

@router.get("")
@router.get("/")
async def list_public_career_openings(
    search: Optional[str] = Query(None, description="Search role title or company"),
    work_mode: Optional[str] = Query(None, description="REMOTE, HYBRID, ON_SITE"),
    employment_type: Optional[str] = Query(None, description="FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT"),
    experience_level: Optional[str] = Query(None, description="ENTRY, MID, SENIOR, LEAD, ANY"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Public listing of first-party Career Openings.
    Only PUBLISHED openings are returned.
    """
    query = {"status": "PUBLISHED"}

    if work_mode and work_mode.upper() != "ALL":
        query["work_mode"] = work_mode.upper()

    if employment_type and employment_type.upper() != "ALL":
        query["employment_type"] = employment_type.upper()

    if experience_level and experience_level.upper() != "ALL":
        query["experience_level"] = experience_level.upper()

    if search and search.strip():
        s = search.strip()
        query["$or"] = [
            {"title": {"$regex": s, "$options": "i"}},
            {"company_name": {"$regex": s, "$options": "i"}},
            {"location": {"$regex": s, "$options": "i"}},
            {"skills": {"$in": [{"$regex": s, "$options": "i"}]}},
        ]

    total = await db.career_openings.count_documents(query)
    cursor = db.career_openings.find(query).sort([("featured", -1), ("published_at", -1)]).skip(skip).limit(limit)
    items = [_serialize_mongo_doc(d) async for d in cursor]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "openings": items,
    }


@router.get("/{opening_id}")
async def get_public_career_opening(opening_id: str, request: Request):
    """
    Public detail view of a single Career Opening.
    Non-admin visitors can only view PUBLISHED openings.
    """
    opening = await db.career_openings.find_one({"$or": [{"id": opening_id}, {"_id": opening_id}]})
    if not opening:
        # Check by ObjectId string if valid
        from bson import ObjectId
        if ObjectId.is_valid(opening_id):
            opening = await db.career_openings.find_one({"_id": ObjectId(opening_id)})

    if not opening:
        raise HTTPException(status_code=404, detail="Career opportunity not found.")

    if opening.get("status") != "PUBLISHED":
        # Check if caller is admin
        is_admin = False
        try:
            user = await get_current_user(request)
            if (user.get("role") or "").lower() in ADMIN_ROLES:
                is_admin = True
        except Exception:
            pass

        if not is_admin:
            raise HTTPException(status_code=404, detail="Career opportunity not found.")

    return _serialize_mongo_doc(opening)


# ── STUDENT APPLICATION ENDPOINTS ────────────────────────────────────────────

@router.post("/{opening_id}/apply")
async def apply_to_career_opening(
    opening_id: str,
    payload: CareerApplicationSubmit,
    current_user: dict = Depends(get_current_user),
):
    """
    Student submits an application to a first-party Career Opening.
    Server-side validations:
    - User is authenticated
    - Opening exists and is PUBLISHED
    - Deadline has not passed
    - Student has not already applied (server-enforced duplicate protection)
    """
    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_name = current_user.get("name") or current_user.get("fullName") or "Student Candidate"
    user_email = current_user.get("email") or ""

    # 1. Fetch opening
    opening = await db.career_openings.find_one({"$or": [{"id": opening_id}, {"_id": opening_id}]})
    if not opening:
        from bson import ObjectId
        if ObjectId.is_valid(opening_id):
            opening = await db.career_openings.find_one({"_id": ObjectId(opening_id)})

    if not opening:
        raise HTTPException(status_code=404, detail="Career opportunity not found.")

    actual_opening_id = opening.get("id") or str(opening["_id"])

    # 2. Status verification
    if opening.get("status") != "PUBLISHED":
        raise HTTPException(status_code=400, detail="Applications are closed.")

    # 3. Deadline verification
    deadline = opening.get("application_deadline")
    if deadline:
        if isinstance(deadline, str):
            try:
                deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            except Exception:
                deadline = None
        if deadline and datetime.now(timezone.utc) > (deadline.replace(tzinfo=timezone.utc) if deadline.tzinfo is None else deadline):
            raise HTTPException(status_code=400, detail="Applications for this opportunity are closed.")

    # 4. Duplicate application check
    existing = await db.career_applications.find_one({
        "career_opening_id": actual_opening_id,
        "student_id": user_id,
    })
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this opportunity.")

    now = datetime.now(timezone.utc)
    app_id = str(uuid.uuid4())

    app_doc = {
        "id": app_id,
        "career_opening_id": actual_opening_id,
        "student_id": user_id,
        "student_name": user_name,
        "student_email": user_email,
        "student_phone": payload.phone or current_user.get("phone") or "",
        "resume_url": payload.resume_url or current_user.get("resume_url") or "",
        "cover_letter": payload.cover_letter or "",
        "status": "APPLIED",
        "admin_notes": "",
        "reviewed_at": None,
        "reviewed_by": None,
        "created_at": now,
        "updated_at": now,
    }

    try:
        await db.career_applications.insert_one(app_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="You have already applied to this opportunity.")

    # Record initial audit entry
    history_entry = {
        "id": str(uuid.uuid4()),
        "application_id": app_id,
        "previous_status": None,
        "new_status": "APPLIED",
        "changed_by": user_id,
        "changed_at": now,
        "note": "Application submitted by student.",
    }
    try:
        await db.career_application_history.insert_one(history_entry)
    except Exception as e:
        logger.warning(f"Failed to record application history: {e}")

    logger.debug(f"[CAREERS] Student {user_id} applied to opening {actual_opening_id}")
    return {
        "success": True,
        "message": "Application submitted successfully.",
        "application": _clean_student_app(app_doc),
    }


@router.get("/student/my-applications")
async def list_my_career_applications(current_user: dict = Depends(get_current_user)):
    """
    Returns list of all first-party career applications submitted by the current student.
    Never reveals internal admin notes.
    """
    user_id = str(current_user.get("_id") or current_user.get("id"))
    cursor = db.career_applications.find({"student_id": user_id}).sort("created_at", -1)

    results = []
    async for app in cursor:
        cleaned = _clean_student_app(app)
        # Attach opening summary for student convenience
        opening = await db.career_openings.find_one({"id": cleaned.get("career_opening_id")})
        if opening:
            cleaned["opening"] = {
                "id": opening.get("id"),
                "title": opening.get("title"),
                "company_name": opening.get("company_name"),
                "company_logo": opening.get("company_logo"),
                "work_mode": opening.get("work_mode"),
                "employment_type": opening.get("employment_type"),
                "location": opening.get("location"),
                "salary_range": opening.get("salary_range"),
            }
        results.append(cleaned)

    return {"applications": results, "total": len(results)}


@router.get("/student/my-applications/{application_id}")
async def get_my_career_application(application_id: str, current_user: dict = Depends(get_current_user)):
    """
    Returns details and status history of a single application submitted by the student.
    """
    user_id = str(current_user.get("_id") or current_user.get("id"))
    app = await db.career_applications.find_one({"id": application_id, "student_id": user_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    cleaned = _clean_student_app(app)

    # Attach opening info
    opening = await db.career_openings.find_one({"id": cleaned.get("career_opening_id")})
    if opening:
        cleaned["opening"] = _serialize_mongo_doc(opening)

    # Attach status history timeline
    h_cursor = db.career_application_history.find({"application_id": application_id}).sort("changed_at", 1)
    history = [_serialize_mongo_doc(h) async for h in h_cursor]
    cleaned["status_history"] = history

    return cleaned


@router.post("/student/my-applications/{application_id}/withdraw")
async def withdraw_career_application(application_id: str, current_user: dict = Depends(get_current_user)):
    """
    Student withdraws their own application.
    """
    user_id = str(current_user.get("_id") or current_user.get("id"))
    app = await db.career_applications.find_one({"id": application_id, "student_id": user_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if app.get("status") in ("WITHDRAWN", "SELECTED", "REJECTED"):
        raise HTTPException(status_code=400, detail=f"Cannot withdraw application with status {app.get('status')}.")

    prev_status = app.get("status")
    now = datetime.now(timezone.utc)

    await db.career_applications.update_one(
        {"id": application_id},
        {"$set": {"status": "WITHDRAWN", "updated_at": now}}
    )

    await db.career_application_history.insert_one({
        "id": str(uuid.uuid4()),
        "application_id": application_id,
        "previous_status": prev_status,
        "new_status": "WITHDRAWN",
        "changed_by": user_id,
        "changed_at": now,
        "note": "Withdrawn by candidate.",
    })

    return {"success": True, "message": "Application withdrawn successfully."}


# ── SUPER ADMIN MANAGEMENT ENDPOINTS ─────────────────────────────────────────

@router.get("/admin/stats")
async def get_career_admin_stats(admin_user: dict = Depends(require_role(*ADMIN_ROLES))):
    """
    Returns aggregate stats for Super Admin Careers management.
    """
    total_openings = await db.career_openings.count_documents({})
    published_openings = await db.career_openings.count_documents({"status": "PUBLISHED"})
    draft_openings = await db.career_openings.count_documents({"status": "DRAFT"})
    closed_openings = await db.career_openings.count_documents({"status": "CLOSED"})
    total_applications = await db.career_applications.count_documents({})

    return {
        "total_openings": total_openings,
        "published_openings": published_openings,
        "draft_openings": draft_openings,
        "closed_openings": closed_openings,
        "total_applications": total_applications,
    }


@router.get("/admin/openings")
async def list_admin_career_openings(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Super Admin listing of all Career Openings with application counts.
    """
    query = {}
    if status and status.upper() != "ALL":
        query["status"] = status.upper()

    if search and search.strip():
        s = search.strip()
        query["$or"] = [
            {"title": {"$regex": s, "$options": "i"}},
            {"company_name": {"$regex": s, "$options": "i"}},
            {"location": {"$regex": s, "$options": "i"}},
        ]

    total = await db.career_openings.count_documents(query)
    cursor = db.career_openings.find(query).sort("created_at", -1).skip(skip).limit(limit)

    openings = []
    async for doc in cursor:
        s_doc = _serialize_mongo_doc(doc)
        opening_id = s_doc.get("id")
        app_count = await db.career_applications.count_documents({"career_opening_id": opening_id})
        s_doc["application_count"] = app_count
        openings.append(s_doc)

    return {"total": total, "skip": skip, "limit": limit, "openings": openings}


@router.post("/admin/openings")
async def create_admin_career_opening(
    payload: CareerOpeningCreate,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Super Admin creates a new Career Opening (DRAFT or PUBLISHED).
    """
    admin_id = str(admin_user.get("_id") or admin_user.get("id"))
    now = datetime.now(timezone.utc)
    opening_id = str(uuid.uuid4())

    doc = payload.model_dump()
    doc["id"] = opening_id
    doc["created_by"] = admin_id
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["published_at"] = now if doc.get("status") == "PUBLISHED" else None
    doc["closed_at"] = None

    await db.career_openings.insert_one(doc)
    logger.debug(f"[CAREERS] Created opening {opening_id}: {payload.title}")
    return _serialize_mongo_doc(doc)


@router.get("/admin/openings/{opening_id}")
async def get_admin_career_opening(
    opening_id: str,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Get full opening details for admin editing.
    """
    opening = await db.career_openings.find_one({"$or": [{"id": opening_id}, {"_id": opening_id}]})
    if not opening:
        from bson import ObjectId
        if ObjectId.is_valid(opening_id):
            opening = await db.career_openings.find_one({"_id": ObjectId(opening_id)})

    if not opening:
        raise HTTPException(status_code=404, detail="Career opening not found.")

    res = _serialize_mongo_doc(opening)
    res["application_count"] = await db.career_applications.count_documents({"career_opening_id": res.get("id")})
    return res


@router.put("/admin/openings/{opening_id}")
async def update_admin_career_opening(
    opening_id: str,
    payload: CareerOpeningUpdate,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Super Admin updates an existing Career Opening.
    """
    opening = await db.career_openings.find_one({"id": opening_id})
    if not opening:
        raise HTTPException(status_code=404, detail="Career opening not found.")

    update_fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    now = datetime.now(timezone.utc)
    update_fields["updated_at"] = now

    if update_fields.get("status") == "PUBLISHED" and opening.get("status") != "PUBLISHED":
        update_fields["published_at"] = now
    elif update_fields.get("status") == "CLOSED" and opening.get("status") != "CLOSED":
        update_fields["closed_at"] = now

    await db.career_openings.update_one({"id": opening_id}, {"$set": update_fields})
    updated = await db.career_openings.find_one({"id": opening_id})
    return _serialize_mongo_doc(updated)


@router.post("/admin/openings/{opening_id}/publish")
async def publish_admin_career_opening(
    opening_id: str,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Publish a career opening immediately.
    """
    now = datetime.now(timezone.utc)
    res = await db.career_openings.update_one(
        {"id": opening_id},
        {"$set": {"status": "PUBLISHED", "published_at": now, "updated_at": now}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Career opening not found.")
    return {"success": True, "message": "Opening published successfully."}


@router.post("/admin/openings/{opening_id}/close")
async def close_admin_career_opening(
    opening_id: str,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Close a career opening immediately.
    """
    now = datetime.now(timezone.utc)
    res = await db.career_openings.update_one(
        {"id": opening_id},
        {"$set": {"status": "CLOSED", "closed_at": now, "updated_at": now}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Career opening not found.")
    return {"success": True, "message": "Opening closed successfully."}


@router.delete("/admin/openings/{opening_id}")
async def delete_admin_career_opening(
    opening_id: str,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Delete a career opening.
    Only permitted if DRAFT or has 0 applications.
    """
    opening = await db.career_openings.find_one({"id": opening_id})
    if not opening:
        raise HTTPException(status_code=404, detail="Career opening not found.")

    app_count = await db.career_applications.count_documents({"career_opening_id": opening_id})
    if app_count > 0 and opening.get("status") != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete opening with {app_count} existing applications. Please close the opening instead."
        )

    await db.career_openings.delete_one({"id": opening_id})
    return {"success": True, "message": "Career opening deleted."}


@router.get("/admin/applications")
async def list_admin_career_applications(
    opening_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Super Admin views candidate applications with pagination and filters.
    """
    query = {}
    if opening_id and opening_id.upper() != "ALL":
        query["career_opening_id"] = opening_id

    if status and status.upper() != "ALL":
        query["status"] = status.upper()

    if search and search.strip():
        s = search.strip()
        query["$or"] = [
            {"student_name": {"$regex": s, "$options": "i"}},
            {"student_email": {"$regex": s, "$options": "i"}},
        ]

    total = await db.career_applications.count_documents(query)
    cursor = db.career_applications.find(query).sort("created_at", -1).skip(skip).limit(limit)

    applications = []
    async for app in cursor:
        s_app = _serialize_mongo_doc(app)
        # Fetch opening title for convenience
        op = await db.career_openings.find_one({"id": s_app.get("career_opening_id")})
        if op:
            s_app["opening_title"] = op.get("title")
            s_app["company_name"] = op.get("company_name")
        applications.append(s_app)

    return {"total": total, "skip": skip, "limit": limit, "applications": applications}


@router.get("/admin/applications/{application_id}")
async def get_admin_career_application(
    application_id: str,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Super Admin views full candidate application details, student profile, status history, and private notes.
    """
    app = await db.career_applications.find_one({"id": application_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    res = _serialize_mongo_doc(app)

    # Attach opening details
    op = await db.career_openings.find_one({"id": res.get("career_opening_id")})
    if op:
        res["opening"] = _serialize_mongo_doc(op)

    # Attach student user profile details if available
    from bson import ObjectId
    student_id = res.get("student_id")
    student_user = None
    if ObjectId.is_valid(student_id):
        student_user = await db.users.find_one({"_id": ObjectId(student_id)})
    if not student_user:
        student_user = await db.users.find_one({"id": student_id})

    if student_user:
        res["student_profile"] = {
            "name": student_user.get("name") or student_user.get("fullName"),
            "email": student_user.get("email"),
            "phone": student_user.get("phone"),
            "college": student_user.get("college"),
            "department": student_user.get("department") or student_user.get("branch"),
            "graduation_year": student_user.get("graduationYear") or student_user.get("year"),
            "skills": student_user.get("skills") or [],
            "bio": student_user.get("bio") or student_user.get("about"),
            "linkedin_url": student_user.get("linkedinUrl"),
            "github_url": student_user.get("githubUrl"),
            "resume_url": student_user.get("resumeUrl") or res.get("resume_url"),
        }

    # Attach status history audit log
    h_cursor = db.career_application_history.find({"application_id": application_id}).sort("changed_at", 1)
    res["status_history"] = [_serialize_mongo_doc(h) async for h in h_cursor]

    return res


@router.patch("/admin/applications/{application_id}/status")
async def update_admin_career_application_status(
    application_id: str,
    payload: ApplicationStatusUpdate,
    admin_user: dict = Depends(require_role(*ADMIN_ROLES)),
):
    """
    Super Admin updates application status, records status history audit trail,
    and optionally adds/updates private internal notes.
    """
    app = await db.career_applications.find_one({"id": application_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    admin_id = str(admin_user.get("_id") or admin_user.get("id"))
    now = datetime.now(timezone.utc)
    prev_status = app.get("status")

    update_fields = {
        "status": payload.status,
        "reviewed_at": now,
        "reviewed_by": admin_id,
        "updated_at": now,
    }
    if payload.admin_notes is not None:
        update_fields["admin_notes"] = payload.admin_notes

    await db.career_applications.update_one({"id": application_id}, {"$set": update_fields})

    # Record history if status changed
    if prev_status != payload.status:
        await db.career_application_history.insert_one({
            "id": str(uuid.uuid4()),
            "application_id": application_id,
            "previous_status": prev_status,
            "new_status": payload.status,
            "changed_by": admin_id,
            "changed_at": now,
            "note": f"Status updated to {payload.status} by admin.",
        })

    logger.debug(f"[CAREERS] Application {application_id} status updated from {prev_status} to {payload.status}")
    updated = await db.career_applications.find_one({"id": application_id})
    return _serialize_mongo_doc(updated)
