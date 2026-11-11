"""
Auth helpers — password hashing, token creation, ID generation, QR codes,
user serialization, and the get_current_user dependency.

Extracted from server.py to reduce its size. Other modules import these
helpers via `from core.auth_helpers import ...`.
"""
from __future__ import annotations

import io
import base64
import random
import string
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
import qrcode
from bson import ObjectId
from fastapi import HTTPException, Request

from core.config import JWT_SECRET, JWT_ALGORITHM
from core.deps import bearer_token, decode_payload
from core.db import db
from core.encryption import decrypt_value
from core.models import SchoolInfo, StudentInfo, AlumniInfo, MentorInfo, CollegeInfo

logger = logging.getLogger(__name__)

# Token expiry (same constants as were in server.py)
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    """Bcrypt is the industry standard for password hashing in 2026."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Short-lived access token for API authentication.
    Includes a JTI (JWT ID) for token revocation support (logout blacklist).
    """
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": secrets.token_hex(16),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Long-lived refresh token to obtain new access tokens without re-login."""
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_unique_id(role: str) -> str:
    """Platform unique ID format: SA-{YEAR}-{ROLE_CODE}-{6 RANDOM CHARS}.
    Example: SA-2026-STU-A7B2X9. Used as the user's QR code payload."""
    role_codes = {
        "student": "STU",
        "alumni": "ALM",
        "mentor": "MNT",
        "college": "CLG",
        "admin": "ADM",
    }
    code = role_codes.get(role, "USR")
    rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SA-{datetime.now().year}-{code}-{rand}"


def generate_qr_code(data: str) -> str:
    """Generate base64-encoded PNG QR code for a unique platform ID."""
    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=2,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#5F259F", back_color="#FFFFFF")
    buf = io.BytesIO()
    getattr(img, "save")(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _safe_block(model_cls, value):
    """Try to coerce a stored dict into the given Pydantic model. If it fails
    validation, return None instead of crashing the whole user payload."""
    if value is None:
        return None
    try:
        return model_cls(**value).model_dump(exclude_none=False)
    except Exception:
        return None


def serialize_user(user: dict) -> dict | None:
    """Strip internal fields (_id, password_hash) from user dict before sending
    to client. Decrypts at-rest fields (phone / dob / postal_code) on the way out.
    """
    if not user:
        return None
    return {
        "id": str(user.get("_id")),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "role": user.get("role"),
        "phone": decrypt_value(user.get("phone")),
        "unique_id": user.get("unique_id"),
        "qr_code_base64": user.get("qr_code_base64"),
        "school_info": _safe_block(SchoolInfo, user.get("school_info")),
        "career_path": user.get("career_path"),
        "student_info": _safe_block(StudentInfo, user.get("student_info")),
        "alumni_info": _safe_block(AlumniInfo, user.get("alumni_info")),
        "mentor_info": _safe_block(MentorInfo, user.get("mentor_info")),
        "college_info": _safe_block(CollegeInfo, user.get("college_info")),
        "mentor_status": user.get("mentor_status"),
        "interests": user.get("interests", []),
        "skills": user.get("skills", []),
        "bio": user.get("bio"),
        "face_image_base64": user.get("face_image_base64"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "two_fa_enabled": user.get("two_fa_enabled", False),
        "dob": decrypt_value(user.get("dob")),
        "country_code": user.get("country_code"),
        "postal_code": decrypt_value(user.get("postal_code")),
        "created_at": user.get("created_at"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "headline": user.get("headline"),
        "photo_data": user.get("face_image_base64")
        or user.get("photo_data")
        or user.get("oauth_picture"),
        "banner_data": user.get("banner_data"),
        "college_logo_data": user.get("college_logo_data"),
        "institution": user.get("institution")
        or (user.get("school_info") or {}).get("institution_name")
        or (user.get("alumni_info") or {}).get("institution_name")
        or (user.get("college_info") or {}).get("institution_name"),
        "branch": user.get("branch")
        or (user.get("school_info") or {}).get("branch_or_stream"),
        "stream": user.get("stream"),
        "department": user.get("department"),
        "graduation_year": user.get("graduation_year")
        or (user.get("school_info") or {}).get("graduation_year")
        or (user.get("alumni_info") or {}).get("graduation_year"),
        "cgpa": user.get("cgpa")
        or (user.get("school_info") or {}).get("cgpa"),
        "location": user.get("location"),
        "city": user.get("city")
        or (user.get("school_info") or {}).get("city")
        or (user.get("college_info") or {}).get("city"),
        "state": user.get("state")
        or (user.get("school_info") or {}).get("state")
        or (user.get("college_info") or {}).get("state"),
        "linkedin_url": user.get("linkedin_url"),
        "github_url": user.get("github_url"),
        "portfolio_url": user.get("portfolio_url"),
        "primary_skill": user.get("primary_skill"),
        "profile_visibility": user.get("profile_visibility"),
        "section_toggles": user.get("section_toggles"),
        "badges": [b for b in user.get("badges", []) if isinstance(b, dict)],
        "projects": user.get("projects"),
        "preferences": user.get("preferences"),
        "is_verified": user.get("is_verified"),
        "ranking_tier": user.get("ranking_tier"),
        "aadhaar_number": user.get("aadhaar_number"),
        "aadhaar_masked": user.get("aadhaar_masked")
        or (
            f"---- ---- {str(user.get('aadhaar_number'))[-4:]}"
            if user.get("aadhaar_number")
            and len(str(user.get("aadhaar_number")).replace(" ", "")) >= 4
            else None
        ),
        "aadhaar_verified": bool(user.get("aadhaar_verified", False)),
        "digilocker_id": user.get("digilocker_id"),
        "digilocker_verified": bool(user.get("digilocker_verified", False)),
        "digilocker_doc_count": int(user.get("digilocker_doc_count", 0)),
        "digilocker_uri": user.get("digilocker_uri"),
        "digilocker_linked_at": user.get("digilocker_linked_at"),
    }


async def get_current_user(request: Request) -> dict:
    """JWT auth dependency. Reads `Authorization: Bearer <token>` header.

    Shared decode + blacklist checks live in core.deps; the schema-migration
    block below is kept here because it mutates the user document.
    """
    payload = decode_payload(
        bearer_token(request.headers.get("Authorization", "")), token_type="access"
    )
    # Check token blacklist (logout revocation)
    jti = payload.get("jti")
    if jti:
        blacklisted = await db.token_blacklist.find_one({"jti": jti})
        if blacklisted:
            raise HTTPException(401, "Token has been revoked")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(401, "User not found")

    # -- Schema Unification Migration Helper --
    needs_migration = False
    updates: dict = {"$set": {}, "$unset": {}}

    # 1. Image Schema
    if not user.get("photo_data") and (user.get("photo_data")):
        user["photo_data"] = user.get("photo_data")
        updates["$set"]["photo_data"] = user["photo_data"]
        if "face_image_base64" in user:
            updates["$unset"]["face_image_base64"] = ""
        if "photo" in user:
            updates["$unset"]["photo"] = ""
        needs_migration = True

    # 2. Career Goal
    si = user.get("student_info") or {}
    if not si.get("career_goal") and (
        user.get("career_goal") or user.get("career_path")
    ):
        si["career_goal"] = user.get("career_goal") or user.get("career_path")
        user["student_info"] = si
        updates["$set"]["student_info"] = si
        if "career_goal" in user:
            updates["$unset"]["career_goal"] = ""
        if "career_path" in user:
            updates["$unset"]["career_path"] = ""
        needs_migration = True

    # 3. Education
    s_info = user.get("school_info") or {}
    has_edu_legacy = False
    for legacy_key, target_key in [
        ("branch", "branch_or_stream"),
        ("cgpa", "cgpa"),
        ("graduation_year", "graduation_year"),
        ("class_or_year", "class_or_year"),
        ("department", "branch_or_stream"),
    ]:
        if legacy_key in user:
            if target_key not in s_info or not s_info[target_key]:
                s_info[target_key] = user[legacy_key]
            updates["$unset"][legacy_key] = ""
            has_edu_legacy = True
    if has_edu_legacy:
        user["school_info"] = s_info
        updates["$set"]["school_info"] = s_info
        needs_migration = True

    # 4. Resume
    if user.get("resume_url"):
        legacy_url = user.get("resume_url")
        new_doc = {
            "id": "legacy_migrated",
            "name": "Legacy_Resume.pdf",
            "size": 0,
            "data_url": legacy_url,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "active": True,
        }
        updates["$push"] = {"resume_documents": new_doc}
        if not user.get("resume_documents"):
            user["resume_documents"] = []
        user["resume_documents"].append(new_doc)
        if "resume_url" in user:
            updates["$unset"]["resume_url"] = ""
        if "resume_data" in user:
            updates["$unset"]["resume_data"] = ""
        needs_migration = True

    if needs_migration:
        try:
            if not updates["$unset"]:
                del updates["$unset"]
            if not updates["$set"]:
                del updates["$set"]
            if not updates.get("$push"):
                updates.pop("$push", None)
            if updates:
                await db.users.update_one({"_id": user["_id"]}, updates)
        except Exception as e:
            print(f"Migration error: {e}", flush=True)

    # Remove large binary fields from response to match legacy behavior
    if "resume_documents" in user:
        del user["resume_documents"]

    return user


def validate_student_class(school_info: SchoolInfo, age: Optional[int] = None) -> None:
    """Per spec: students must be age 10+ AND in Class 11 (+1) or above."""
    if age is not None and age < 10:
        raise HTTPException(400, "Students must be at least 10 years old to register.")
    cls = (school_info.class_or_year or "").strip().lower()
    if cls.isdigit() and int(cls) < 11:
        raise HTTPException(400, "Students must be in Class 11 (+1) or above.")
