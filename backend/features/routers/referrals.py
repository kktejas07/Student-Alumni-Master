"""
Alumni Referrals
================
- GET  /jobs/{job_id}/alumni   — up to 10 matching alumni/mentors, privacy-gated
- POST /referrals              — student requests a referral (rate-limited)
- GET  /referrals/inbox        — alumni views requests directed to them
- POST /referrals/{id}/respond — alumni accepts / declines / refers
- PATCH /users/me/referral-settings — toggle accepts_referrals (default ON)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.deps import get_current_user
from features.notifications import send_push
from services.company_norm import (
    company_key,
    extract_company_name,
    extract_college_name,
    extract_role,
    extract_grad_year,
)

router = APIRouter(tags=["referrals"])

VALID_STATUSES = ("requested", "accepted", "declined", "referred")
REFERRAL_TYPES = ("accepted", "declined", "referred")


# ── helpers ──────────────────────────────────────────────────────────────────

async def _accepted_connection_ids(user_id: str) -> set:
    cur = db.connections.find(
        {"status": "accepted", "$or": [{"a": user_id}, {"b": user_id}]},
        {"a": 1, "b": 1},
    )
    ids = set()
    async for doc in cur:
        ids.add(doc.get("a"))
        ids.add(doc.get("b"))
    ids.discard(user_id)
    return ids


def _normalizes_equal(a: str, b: str) -> bool:
    """True if two raw strings share a company_key/college_key (or exact text)."""
    if not a or not b:
        return False
    if a == b:
        return True
    return company_key(a) == company_key(b)


def _accepts_referrals(user: dict) -> bool:
    """Default ON unless explicitly disabled."""
    return user.get("accepts_referrals") is not False


async def _alumni_for_job(job: dict, viewer: dict, viewer_role: str) -> dict:
    """Find up to 10 alumni/mentors sharing company_key with the job.

    Only surfaces users whose profile_visibility allows discovery.
    Never includes email / phone.
    """
    job_ck = job.get("company_key") or company_key(job.get("company") or "")
    if not job_ck:
        return {"items": [], "total": 0, "total_from_viewer_college": 0}

    viewer_college = (extract_college_name(viewer) or "").strip()

    role_in = ["alumni", "mentor"]
    if viewer_role in ("alumni", "mentor"):
        role_in.append("student")

    base_q = {
        "role": {"$in": role_in},
        "profile_visibility": {"$ne": "private"},
    }
    # Exclude the viewer themselves so they can't "referral" themselves
    base_q["_id"] = {"$ne": ObjectId(str(viewer["_id"]))}

    # First pass: try to match on the pre-backfilled alumni_info.company_key.
    # Fall back to scanning a bounded user set and matching the raw company string
    # so the endpoint works before the nightly backfill has run.
    matched: list[dict] = []

    cur = db.users.find(
        {**base_q, "$or": [
            {"alumni_info.company_key": job_ck},
            {"mentor_profile.organization_key": job_ck},
        ]},
    ).limit(200)
    seen_ids = set()
    async for u in cur:
        if u["_id"] in seen_ids:
            continue
        seen_ids.add(u["_id"])
        matched.append(u)

    if len(matched) < 10:
        # Backfill may not have run yet — scan users who have a company field
        # and compare normalized names directly. Bound the scan.
        cur2 = db.users.find(
            {
                **base_q,
                "$or": [
                    {"alumni_info.company": {"$exists": True}},
                    {"alumni_info.current_employer": {"$exists": True}},
                    {"alumni_info.alumni_employer": {"$exists": True}},
                    {"mentor_profile.organization": {"$exists": True}},
                ],
                "alumni_info.company_key": {"$in": [None, ""]},
            },
        ).limit(200)
        async for u in cur2:
            if u["_id"] in seen_ids:
                continue
            if _normalizes_equal(extract_company_name(u), job.get("company") or ""):
                seen_ids.add(u["_id"])
                matched.append(u)

    def _college_name(u: dict) -> str:
        return (extract_college_name(u) or "").strip()

    # Rank: same-college-first (if viewer college known), then stable by id
    def _sort_key(u: dict):
        college = _college_name(u).lower()
        same_college = 0
        if viewer_college:
            same_college = 0 if (_college_name(u) and _normalizes_equal(college, viewer_college)) else 1
        return (same_college, str(u["_id"]))

    matched.sort(key=_sort_key)
    matched = matched[:10]

    conn_ids = await _accepted_connection_ids(str(viewer["_id"]))

    items = []
    same_college_count = 0
    for u in matched:
        u_college = _college_name(u)
        if viewer_college and u_college and _normalizes_equal(u_college, viewer_college):
            same_college_count += 1
        photo = (
            u.get("face_image_base64")
            or (u.get("alumni_info") or {}).get("profile_photo")
            or u.get("photo_data")
            or u.get("photo")
        )
        items.append({
            "id": str(u["_id"]),
            "name": u.get("full_name") or u.get("name"),
            "photo": photo,
            "role": extract_role(u),
            "grad_year": extract_grad_year(u),
            "college": u_college or None,
            "is_connected": str(u["_id"]) in conn_ids,
            "accepts_referrals": _accepts_referrals(u),
        })

    return {"items": items, "total": len(items), "total_from_viewer_college": same_college_count}


# ── schemas ──────────────────────────────────────────────────────────────────

class ReferralCreate(BaseModel):
    job_id: str
    alumni_id: str
    note: Optional[str] = Field(default="", max_length=500)


class ReferralRespond(BaseModel):
    status: str


# ── GET /jobs/{job_id}/alumni ───────────────────────────────────────────────

@router.get("/jobs/{job_id}/alumni")
async def job_alumni(job_id: str, user: dict = Depends(get_current_user)):
    """List up to 10 matching alumni/mentors for a job. Privacy-gated."""
    viewer_role = user.get("role") or "student"
    if viewer_role not in ("student", "alumni", "mentor"):
        raise HTTPException(403, "role not allowed to view referral candidates")

    job = await db.jobs_cache.find_one({"dedup_hash": job_id})
    if not job:
        # The job may not be cached yet — still let the request through by
        # keying on nothing. Without a job we cannot match.
        raise HTTPException(404, "Job not found")

    return await _alumni_for_job(job, user, viewer_role)


# ── POST /referrals ─────────────────────────────────────────────────────────

@router.post("/referrals")
async def create_referral(req: ReferralCreate, user: dict = Depends(get_current_user)):
    """Create a referral request. Rate-limited per student."""
    viewer_role = user.get("role") or "student"
    if viewer_role not in ("student",):
        raise HTTPException(403, "Only students can request referrals")

    note = (req.note or "").strip()
    if len(note) > 500:
        raise HTTPException(400, "note must be at most 500 characters")

    job = await db.jobs_cache.find_one({"dedup_hash": req.job_id})
    if not job:
        raise HTTPException(404, "Job not found")

    try:
        alumni_oid = ObjectId(req.alumni_id)
    except Exception:
        raise HTTPException(400, "Invalid alumni_id")
    alumni = await db.users.find_one({"_id": alumni_oid})
    if not alumni:
        raise HTTPException(404, "Alumni not found")
    if alumni.get("role") not in ("alumni", "mentor"):
        raise HTTPException(400, "Recipient must be an alumni or mentor")
    if not _accepts_referrals(alumni):
        raise HTTPException(403, "This alumni is not currently open to referral requests")

    my_id = str(user["_id"])
    alumni_id_str = str(alumni_oid)

    # 1 per (student, alumni, job)
    existing = await db.referral_requests.find_one(
        {
            "student_id": my_id,
            "alumni_id": alumni_id_str,
            "job_id": req.job_id,
        }
    )
    if existing:
        raise HTTPException(409, "You have already requested a referral from this alumni for this job")

    # 5 per student per (UTC) day
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.referral_requests.count_documents(
        {"student_id": my_id, "created_at": {"$gte": start_of_day}}
    )
    if today_count >= 5:
        raise HTTPException(429, "Daily referral request limit reached (max 5 per day)")

    ref_id = ObjectId()
    doc = {
        "_id": ref_id,
        "student_id": my_id,
        "alumni_id": alumni_id_str,
        "job_id": req.job_id,
        "job_title": job.get("title"),
        "job_company": job.get("company"),
        "note": note,
        "status": "requested",
        "created_at": now,
        "updated_at": now,
    }
    await db.referral_requests.insert_one(doc)

    # Notification + DM to alumni (reuse existing services)
    student_name = user.get("full_name") or user.get("name") or "A student"
    body = f"{student_name} requested a referral for a {job.get('company') or ''} {job.get('title') or ''} role."
    if note:
        body += f" Note: {note[:140]}"
    await send_push(
        db,
        user_id=alumni_id_str,
        title="New referral request",
        body=body,
        data={"type": "referral_requested", "referral_id": str(ref_id)},
    )
    await db.chat_messages.insert_one({
        "session_id": f"referral-{ref_id}",
        "from_user": my_id,
        "to_user": alumni_id_str,
        "text": body,
        "kind": "referral_request",
        "referral_id": str(ref_id),
        "created_at": now,
    })

    return {
        "success": True,
        "id": str(ref_id),
        "status": "requested",
        "daily_used": today_count + 1,
        "daily_limit": 5,
    }


# ── GET /referrals/my-requests ─────────────────────────────────────────────

@router.get("/referrals/my-requests")
async def my_referral_requests(user: dict = Depends(get_current_user)):
    """Student: their own referral requests (latest 20) — drives status chips in the sheet."""
    viewer_role = user.get("role") or "student"
    if viewer_role != "student":
        raise HTTPException(403, "Only students have personal referral requests")

    my_id = str(user["_id"])
    cursor = db.referral_requests.find({"student_id": my_id}).sort("created_at", -1).limit(20)
    out = []
    async for doc in cursor:
        out.append({
            "id": str(doc["_id"]),
            "alumni_id": doc["alumni_id"],
            "job_id": doc.get("job_id"),
            "job_title": doc.get("job_title"),
            "job_company": doc.get("job_company"),
            "status": doc.get("status"),
            "created_at": doc.get("created_at"),
        })
    return {"items": out, "total": len(out)}


# ── GET /referrals/inbox ────────────────────────────────────────────────────

@router.get("/referrals/inbox")
async def referral_inbox(user: dict = Depends(get_current_user)):
    """Alumni/mentor: list requests directed to them."""
    viewer_role = user.get("role") or ""
    if viewer_role not in ("alumni", "mentor"):
        raise HTTPException(403, "Only alumni or mentors have a referral inbox")

    my_id = str(user["_id"])
    cursor = (
        db.referral_requests.find({"alumni_id": my_id})
        .sort("created_at", -1)
        .limit(50)
    )
    out = []
    async for doc in cursor:
        student = await db.users.find_one({"_id": ObjectId(doc["student_id"])}, {"full_name": 1, "name": 1})
        out.append({
            "id": str(doc["_id"]),
            "student_id": doc["student_id"],
            "student_name": (student or {}).get("full_name") or (student or {}).get("name"),
            "job_id": doc.get("job_id"),
            "job_title": doc.get("job_title"),
            "job_company": doc.get("job_company"),
            "note": doc.get("note"),
            "status": doc.get("status"),
            "created_at": doc.get("created_at"),
        })
    return {"items": out, "total": len(out)}


# ── POST /referrals/{id}/respond ────────────────────────────────────────────

@router.post("/referrals/{referral_id}/respond")
async def respond_referral(referral_id: str, req: ReferralRespond, user: dict = Depends(get_current_user)):
    """Alumni/mentor accepts / declines / refers."""
    viewer_role = user.get("role") or ""
    if viewer_role not in ("alumni", "mentor"):
        raise HTTPException(403, "Only alumni or mentors can respond")

    if req.status not in REFERRAL_TYPES:
        raise HTTPException(400, f"status must be one of {REFERRAL_TYPES}")

    try:
        ref_oid = ObjectId(referral_id)
    except Exception:
        raise HTTPException(404, "Referral not found")
    doc = await db.referral_requests.find_one({"_id": ref_oid, "alumni_id": str(user["_id"])})
    if not doc:
        raise HTTPException(404, "Referral not found")
    if doc.get("status") != "requested":
        raise HTTPException(409, "This referral was already handled")

    await db.referral_requests.update_one(
        {"_id": ref_oid},
        {"$set": {"status": req.status, "responded_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}},
    )

    student_name = (await db.users.find_one({"_id": ObjectId(doc["student_id"])}, {"full_name": 1, "name": 1}) or {}).get("full_name")
    alumni_name = user.get("full_name") or user.get("name") or "An alumni"
    if req.status == "accepted":
        title = "Referral accepted"
        body = f"{alumni_name} accepted your referral request for {doc.get('job_company') or 'a role'}."
        ev = "referral_accepted"
    elif req.status == "referred":
        title = "Referred"
        body = f"{alumni_name} has referred you for {doc.get('job_company') or 'a role'}."
        ev = "referral_accepted"
    else:
        title = "Referral declined"
        body = f"{alumni_name} declined your referral request for {doc.get('job_company') or 'a role'}."
        ev = "referral_declined"

    await send_push(
        db,
        user_id=doc["student_id"],
        title=title,
        body=body,
        data={"type": ev, "referral_id": referral_id},
    )

    return {"success": True, "id": referral_id, "status": req.status}


# ── PATCH /users/me/referral-settings ──────────────────────────────────────

class ReferralSettings(BaseModel):
    accepts_referrals: bool


@router.patch("/users/me/referral-settings")
async def update_referral_settings(req: ReferralSettings, user: dict = Depends(get_current_user)):
    """Alumni/mentor toggles their open-to-referrals flag (default ON)."""
    viewer_role = user.get("role") or ""
    if viewer_role not in ("alumni", "mentor"):
        raise HTTPException(403, "Only alumni or mentors can manage referral settings")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"accepts_referrals": req.accepts_referrals, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"success": True, "accepts_referrals": req.accepts_referrals}


# ── GET /users/me (referral flag) — informational ───────────────────────────
# The user document already carries accepts_referrals; no new endpoint needed.
