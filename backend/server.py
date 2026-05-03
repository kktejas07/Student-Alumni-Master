"""
Student Alumni Platform - Backend
==================================
A FastAPI + MongoDB backend for a student career development platform.

ARCHITECTURE:
- 3 primary user roles: student, alumni, mentor (admin/college handled separately)
- JWT auth with email/password (Google/LinkedIn OAuth handled by separate Phase)
- Claude Sonnet 4.5 AI for personalized career guidance
- Role-based registration with role-specific validation
- Mentor accounts require admin review (status=pending until approved)
- Education-level + career-path-based content prioritization
- Multi-tenant (college) support for institutional dashboards

CONTENT PRIORITIZATION LOGIC:
1. Interest-based filtering: career_path drives content
2. Educational level segmentation:
   - Class 11/12: prioritize Campus Tours, Scholarships
   - University students: prioritize Internships, Hackathons, Higher Ed
3. Real-time event priority (deadlines surface to top)
4. 8 modular categories visible per Student dashboard
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import io
import base64
import logging
import secrets
import random
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Dict, Any

import bcrypt
import jwt
import pyotp
import qrcode
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator

# Content prioritization engine — implements interest + edu-level + deadline + frequency scoring
from personalization import (
    build_personalized_dashboard,
    track_module_click,
    transition_to_alumni,
    CAREER_PATH_TO_MENTOR_CATEGORY,
)

# Multi-role badge engine
from badges import (
    compute_badges, refresh_user_badges, compute_all_users_badges, get_tier_theme,
)

# Role-based analytics + external API integrations
from analytics import get_analytics_for, super_admin_analytics, college_analytics, mentor_analytics
from integrations import (
    fetch_coursera_courses, fetch_udemy_courses, fetch_adzuna_internships,
    sync_courses_to_db, sync_internships_to_db, integrations_status,
)

# Mentor reviews/ratings + Push notifications
from reviews import (
    create_review, list_mentor_reviews, get_mentor_rating_stats,
    seed_sample_reviews, refresh_mentor_rating,
)
from notifications import (
    register_push_token, deregister_push_token, send_push, list_inbox,
    mark_inbox_read, unread_count, notify_booking_created, notify_booking_confirmed,
    notify_event_registered, notify_mentor_approved, notify_review_received,
)

# ----------------------------------------------------------------------------
# Setup & Configuration
# ----------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection comes from .env (NEVER hardcoded)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days for mobile (less re-login friction)
REFRESH_TOKEN_EXPIRE_DAYS = 30

app = FastAPI(title="Student Alumni Platform API")
api_router = APIRouter(prefix="/api")  # All routes prefixed with /api (Kubernetes ingress requirement)


# ----------------------------------------------------------------------------
# Encryption-at-Rest — Fernet (AES-128 in CBC mode + HMAC-SHA256)
# ----------------------------------------------------------------------------
# Per spec — encrypt sensitive personal data (dob, phone, postal_code) at rest.
# Backwards-compat: legacy users may have plaintext values; decrypt() returns
# the input as-is when it can't be decoded as Fernet ciphertext.
from cryptography.fernet import Fernet, InvalidToken  # noqa: E402

_FERNET_KEY = os.environ.get("FERNET_KEY")
if not _FERNET_KEY:
    # Auto-generate a session key in dev so the app boots; logs a warning.
    _FERNET_KEY = Fernet.generate_key().decode()
    print(f"⚠️  FERNET_KEY not set — using ephemeral key (dev only): {_FERNET_KEY[:12]}…")
_FERNET = Fernet(_FERNET_KEY.encode() if isinstance(_FERNET_KEY, str) else _FERNET_KEY)
# Marker so we can recognise our ciphertexts in mixed-format collections.
_ENC_PREFIX = "enc::"


def encrypt_value(plain: Optional[str]) -> Optional[str]:
    """Wrap a string with the Fernet token + a recognisable prefix."""
    if plain is None or plain == "":
        return plain
    if isinstance(plain, str) and plain.startswith(_ENC_PREFIX):
        return plain  # already encrypted
    try:
        token = _FERNET.encrypt(plain.encode("utf-8")).decode("utf-8")
        return f"{_ENC_PREFIX}{token}"
    except Exception:
        return plain  # never block the write on encryption failure


def decrypt_value(value: Optional[str]) -> Optional[str]:
    """Unwrap a Fernet ciphertext. Returns the input unchanged if not ours."""
    if value is None or value == "":
        return value
    if isinstance(value, str) and value.startswith(_ENC_PREFIX):
        try:
            return _FERNET.decrypt(value[len(_ENC_PREFIX):].encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return None  # tampered or wrong key — return None defensively
        except Exception:
            return None
    return value  # legacy plaintext


# ----------------------------------------------------------------------------
# Audit Log Helpers — write every personal-data change to `audit_logs`
# ----------------------------------------------------------------------------
# Schema: { user_id, field_name, old_value, new_value, source, validation_status,
#           ts (UTC datetime), is_manual_entry }
async def _audit_log(user_id: str, field: str, old_value, new_value, *,
                     source: str = "onboarding",
                     validation_status: str = "passed",
                     is_manual_entry: bool = False) -> None:
    """Insert a single audit entry. Best-effort — never raise to caller."""
    try:
        await db.audit_logs.insert_one({
            "user_id": user_id,
            "field_name": field,
            "old_value": old_value if old_value is not None else None,
            "new_value": new_value if new_value is not None else None,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": bool(is_manual_entry),
            "ts": datetime.now(timezone.utc),
        })
    except Exception:
        # Don't let audit failures break the user's flow.
        pass


async def _audit_log_many(user_id: str, source: str, entries: list,
                          validation_status: str = "passed") -> None:
    """Bulk insert audit entries. `entries` is a list of (field, old, new) tuples."""
    if not entries:
        return
    try:
        docs = [{
            "user_id": user_id,
            "field_name": f,
            "old_value": o,
            "new_value": n,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": False,
            "ts": datetime.now(timezone.utc),
        } for (f, o, n) in entries if n is not None and n != ""]
        if docs:
            await db.audit_logs.insert_many(docs, ordered=False)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Type Definitions
# ----------------------------------------------------------------------------
# UserRole: 3 primary user types + admin/college (managed roles)
UserRole = Literal["student", "alumni", "mentor", "college", "admin"]

# CareerPath: Drives all personalization on the platform
CareerPath = Literal["job", "higher_education", "startup", "business"]

# EducationLevel: Used for content segmentation per spec
# (+1=Class 11, +2=Class 12, btech=undergrad, masters=postgrad, phd=research)
EducationLevel = Literal["plus_one", "plus_two", "btech", "bachelors", "masters", "phd", "other"]

# MentorCategory: Per spec — 4 distinct categories (split startup vs business)
# MentorCategory: 10-category taxonomy organized by function.
# Tech & Engineering: it_software, engineering_manager
# Talent & People:    tech_recruiter, hr_mentor
# Career Development: career_coach, higher_education
# Entrepreneurship:   startup_mentor, startup_advisor
# Business:           business_mentor, industry_advisor
MentorCategory = Literal[
    "it_software", "engineering_manager",
    "tech_recruiter", "hr_mentor",
    "career_coach", "higher_education",
    "startup_mentor", "startup_advisor",
    "business_mentor", "industry_advisor",
    # Per Mentor Onboarding spec — 10 archetype tiles. Below are the 3 new
    # archetype slugs that don't map cleanly to legacy values above.
    "interview_prep",       # Mock interviews, DSA, system design rounds
    "creative_design",      # UX/UI, branding, creative careers & portfolios
    "life_wellness",        # Work-life balance, mental health & mindfulness
    # Backward-compat aliases (read-only — old data may still have these)
    "startup", "business", "education", "startup_business",
]

# MentorStatus: Mentors are reviewed by admins before being visible to students
MentorStatus = Literal["pending", "approved", "rejected"]


# ----------------------------------------------------------------------------
# Pydantic Models — Request / Response payloads
# ----------------------------------------------------------------------------
class SchoolInfo(BaseModel):
    """Institution / education info common to all roles."""
    institution_name: str
    institution_type: Literal["school", "college", "university"] = "college"
    # Made optional — in the new onboarding flow we collect graduation_year +
    # branch_or_stream instead, and this field is derived downstream when needed.
    class_or_year: Optional[str] = None
    branch_or_stream: Optional[str] = None
    board_or_university: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    graduation_year: Optional[int] = None  # Required for alumni


class MentorInfo(BaseModel):
    """Mentor-specific fields per spec — requires admin approval."""
    category: MentorCategory  # Primary archetype (derived from categories[0] if multi-select used)
    organization: str  # Mandatory: company / institution name
    job_title: str  # Mandatory: designation
    linkedin_url: Optional[str] = None  # Recommended for credibility
    years_of_experience: Optional[int] = None
    bio: Optional[str] = None
    # Per HTML spec — 1:1 session price in INR (revenue-critical).
    # Suggested chips: 499 / 799 / 999 / 1499; free custom values allowed.
    session_price_inr: Optional[int] = None
    # Per Mentor Onboarding 8-step wizard (Step 2: "Mentorship Archetype")
    # — multi-select tile grid; mentor can pick all that apply.
    categories: Optional[List[MentorCategory]] = None
    # Step 3: Education Background (single select; same taxonomy as students)
    education_level: Optional[str] = None
    # Step 4: "Your Expertise" — chip multi-select (free-form skill labels)
    expertise: Optional[List[str]] = None
    # Step 5: Availability — list of weekly recurring slot keys
    # e.g. ["mon_18_19", "sat_10_12"] — see frontend AVAILABILITY_SLOTS map.
    availability: Optional[List[str]] = None
    # Step 6: Profile photo (base64) — also stored on user.face_image_base64
    profile_photo: Optional[str] = None
    # Step 7: College & Batch (institution name + graduation year)
    college: Optional[str] = None
    college_batch: Optional[int] = None  # graduation year


class CollegeInfo(BaseModel):
    """College / Institution-specific fields per College 6-step Onboarding spec."""
    institution_name: str
    institution_type: Optional[Literal["school", "college", "university", "institute"]] = "university"
    affiliated_university: Optional[str] = None  # e.g. "Delhi University" (for affiliated colleges)
    official_website: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    # Optional admin contact details the college can fill later
    accreditation: Optional[str] = None  # e.g. "NAAC A+", "NBA"
    year_established: Optional[int] = None
    # Step 1 — National Ranking Tier (single-select chip)
    # Slugs: top_50 / top_51_200 / top_201_500 / not_ranked
    ranking_tier: Optional[str] = None
    # Step 1 — Accreditations & Rankings (multi-select chips — see frontend ACCRED list)
    accreditations: Optional[List[str]] = None
    # Step 2 — Contact Person (primary admin)
    contact_name: Optional[str] = None
    contact_designation: Optional[str] = None  # e.g. "TPO", "Dean Students", "Principal"
    contact_official_email: Optional[str] = None  # MUST end in .ac.in / .edu (validated client-side)
    contact_phone: Optional[str] = None
    # Step 3 — Features Needed (multi-select tile keys — see frontend FEATURES list)
    # Possible values: student_placement, alumni_network, mentor_connections,
    #                  industry_tieups, event_management, job_portal
    features_needed: Optional[List[str]] = None
    # Step 4 — Logo & Cover Photo (base64)
    logo: Optional[str] = None
    cover_photo: Optional[str] = None
    # Step 5 — Bio + writing style
    bio: Optional[str] = None
    writing_style: Optional[str] = None


class AlumniInfo(BaseModel):
    """Alumni-specific fields per Alumni 6-step Onboarding Wizard spec."""
    graduation_year: int
    university: str
    current_employer: Optional[str] = None
    current_role: Optional[str] = None
    employment_status: Literal["employed", "self_employed", "studying", "between_jobs"] = "employed"
    # Per spec — LinkedIn highly recommended for alumni
    linkedin_url: Optional[str] = None
    # Per spec — alumni may opt-in as mentors with a category
    wants_to_mentor: bool = False
    mentor_category: Optional[MentorCategory] = None
    mentor_categories: Optional[List[MentorCategory]] = None    # multi-select archetypes
    # Step 1 — Your Career Now: years of experience (auto-derived from grad year if blank)
    years_of_experience: Optional[int] = None
    # Step 2 — Interests & Skills: 4 multi-select chip groups
    domain_expertise: Optional[List[str]] = None  # e.g. Software Engineering, Product, Finance
    tech_skills: Optional[List[str]] = None       # Python, React, ML/AI, …
    business_skills: Optional[List[str]] = None   # Excel, Financial Modelling, Sales, …
    soft_skills: Optional[List[str]] = None       # Communication, Leadership, …
    # Step 3 — Your Next Chapter: single-select from 6 paths
    # Slugs: become_mentor / level_up_career / build_startup / higher_education / explore_options / give_back
    next_chapter: Optional[str] = None
    # Step 4 — Profile Photo (base64; also stored on user.face_image_base64)
    profile_photo: Optional[str] = None
    # Step 5 — Bio + writing style chip
    bio: Optional[str] = None
    writing_style: Optional[str] = None  # Friendly & warm / Professional / Inspiring / Concise / Detailed


class StudentInfo(BaseModel):
    """Student-specific fields per spec."""
    age: Optional[int] = None  # Minimum age 10+ per spec (collected during onboarding)
    education_level: Optional[EducationLevel] = None
    career_interests: List[str] = Field(default_factory=list)
    # Per spec — specific aspiration (e.g. "Software Developer", "Web Developer")
    # Used directly in AI roadmap prompts to drive interest-based filtering
    career_goal: Optional[str] = None
    # Per HTML spec — Academic GPA (0.0–10.0 CGPA scale or 0.0–4.0 if GPA).
    # Used by college dashboards and AI recommendations for scholarship matching.
    cgpa: Optional[float] = None


# ----- Auth payloads -----
class RegisterRequest(BaseModel):
    """Initial registration. Role-specific fields collected in onboarding step."""
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    # Per spec — Date of Birth is mandatory at registration. ISO 8601 (YYYY-MM-DD).
    # Backend enforces minimum age of 18 unless the role is 'student' (>=13).
    dob: Optional[str] = None
    # Country alpha-2 code for phone/postal code validation context.
    country_code: Optional[str] = None
    # Postal / PIN code (validated per country at the frontend; stored verbatim).
    postal_code: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v):
        # Enforce minimum 6 chars (frontend should also enforce stronger rules)
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

    @field_validator("dob")
    @classmethod
    def _dob_valid(cls, v):
        if not v:
            return v  # mandatory enforcement happens in the route (role-aware)
        from datetime import date as _date
        try:
            d = _date.fromisoformat(v)
        except Exception:
            raise ValueError("Date of birth must be in YYYY-MM-DD format")
        today = _date.today()
        if d > today:
            raise ValueError("Date of birth cannot be in the future")
        # Min age guard — 13 absolute floor; route can re-enforce 18 by role.
        age = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
        if age < 13:
            raise ValueError("You must be at least 13 years old to register")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OnboardingRequest(BaseModel):
    """Unified onboarding payload — only the fields relevant to the user's role
    are validated. Field validation by role is enforced in the handler."""
    school_info: SchoolInfo
    career_path: Optional[CareerPath] = None  # Required for student/alumni
    student_info: Optional[StudentInfo] = None  # Required if role=student
    alumni_info: Optional[AlumniInfo] = None  # Required if role=alumni
    mentor_info: Optional[MentorInfo] = None  # Required if role=mentor
    college_info: Optional[CollegeInfo] = None  # Required if role=college (per spec)
    interests: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    face_image_base64: Optional[str] = None  # Profile photo (base64-encoded)
    # Per HTML spec — collect phone number during onboarding for all roles.
    # Stored at the root user level (not role-specific).
    phone: Optional[str] = None


class UserResponse(BaseModel):
    """Public user payload — never includes password_hash."""
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    unique_id: Optional[str] = None
    qr_code_base64: Optional[str] = None
    school_info: Optional[SchoolInfo] = None
    career_path: Optional[CareerPath] = None
    student_info: Optional[StudentInfo] = None
    alumni_info: Optional[AlumniInfo] = None
    mentor_info: Optional[MentorInfo] = None
    college_info: Optional[CollegeInfo] = None
    mentor_status: Optional[MentorStatus] = None  # Only set for mentors
    interests: List[str] = []
    skills: List[str] = []
    bio: Optional[str] = None
    face_image_base64: Optional[str] = None
    onboarding_completed: bool = False
    two_fa_enabled: bool = False
    dob: Optional[str] = None  # ISO 8601 (YYYY-MM-DD)
    country_code: Optional[str] = None
    postal_code: Optional[str] = None
    created_at: datetime
    # Phase-4 SA Profile Web fields (set via PUT /users/me — must round-trip)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    headline: Optional[str] = None
    photo_data: Optional[str] = None
    institution: Optional[str] = None
    branch: Optional[str] = None
    stream: Optional[str] = None
    department: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    primary_skill: Optional[str] = None
    profile_visibility: Optional[str] = None
    section_toggles: Optional[Dict[str, Any]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    preferences: Optional[Dict[str, Any]] = None
    is_verified: Optional[bool] = None
    ranking_tier: Optional[str] = None
    badges: List[Dict[str, Any]] = []


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse


class TwoFAChallengeResponse(BaseModel):
    """Returned by /auth/login when 2FA is enabled — client must call /auth/2fa/verify."""
    requires_2fa: bool = True
    challenge_id: str
    methods: List[str] = ["totp"]
    user_email: str  # show on challenge screen for context


class TwoFASetupRequest(BaseModel):
    pass  # auth-only


class TwoFASetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    qr_code_base64: str  # PNG, base64-encoded


class TwoFAEnableRequest(BaseModel):
    code: str  # 6-digit TOTP code from authenticator app


class TwoFAEnableResponse(BaseModel):
    enabled: bool = True
    backup_codes: List[str]  # show ONCE


class TwoFAVerifyRequest(BaseModel):
    challenge_id: str
    code: str  # 6-digit TOTP or 10-char backup code


class TwoFADisableRequest(BaseModel):
    password: str
    code: str


# ----- AI payloads -----
class CareerSuggestionRequest(BaseModel):
    additional_context: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    message: str


# ----- Booking payloads -----
class BookingRequest(BaseModel):
    """Student books a mentor for a 1:1 session."""
    mentor_id: str
    slot_start_iso: str  # ISO datetime string
    slot_end_iso: str
    topic: str
    notes: Optional[str] = None


# ----------------------------------------------------------------------------
# Helpers — Auth, hashing, ID generation
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Bcrypt is the industry standard for password hashing in 2026."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Short-lived access token for API authentication."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
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
    role_codes = {"student": "STU", "alumni": "ALM", "mentor": "MNT", "college": "CLG", "admin": "ADM"}
    code = role_codes.get(role, "USR")
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SA-{datetime.now().year}-{code}-{rand}"


def generate_qr_code(data: str) -> str:
    """Generate base64-encoded PNG QR code for a unique platform ID."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#5F259F", back_color="#FFFFFF")  # Brand purple QR
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _safe_block(model_cls, value):
    """Try to coerce a stored dict into the given Pydantic model. If it fails
    validation (e.g. seed data missing required fields), return None instead of
    crashing the whole user payload. Logged so we know it happened."""
    if value is None:
        return None
    try:
        # Validate but return as dict so FastAPI re-validates with the parent model
        return model_cls(**value).model_dump(exclude_none=False)
    except Exception:
        return None


def serialize_user(user: dict) -> dict:
    """Strip internal fields (_id, password_hash) from user dict before sending to client.
    Decrypts at-rest fields (phone / dob / postal_code) on the way out.
    """
    if not user:
        return None
    return {
        "id": str(user.get("_id")),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "role": user.get("role"),
        # Sensitive fields — decrypt before exposing.
        "phone":        decrypt_value(user.get("phone")),
        "unique_id": user.get("unique_id"),
        "qr_code_base64": user.get("qr_code_base64"),
        "school_info":  _safe_block(SchoolInfo,  user.get("school_info")),
        "career_path":  user.get("career_path"),
        "student_info": _safe_block(StudentInfo, user.get("student_info")),
        "alumni_info":  _safe_block(AlumniInfo,  user.get("alumni_info")),
        "mentor_info":  _safe_block(MentorInfo,  user.get("mentor_info")),
        "college_info": _safe_block(CollegeInfo, user.get("college_info")),
        "mentor_status": user.get("mentor_status"),
        "interests": user.get("interests", []),
        "skills": user.get("skills", []),
        "bio": user.get("bio"),
        "face_image_base64": user.get("face_image_base64"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "two_fa_enabled": user.get("two_fa_enabled", False),
        # Phase A — DOB / country / postal — exposed on every user response.
        "dob":          decrypt_value(user.get("dob")),
        "country_code": user.get("country_code"),
        "postal_code":  decrypt_value(user.get("postal_code")),
        "created_at": user.get("created_at"),
        # Phase-4 SA Profile Web fields — round-trip through PUT /users/me & /auth/me
        "first_name":     user.get("first_name"),
        "last_name":      user.get("last_name"),
        "headline":       user.get("headline"),
        "photo_data":     user.get("photo_data"),
        "institution":    user.get("institution"),
        "branch":         user.get("branch"),
        "stream":         user.get("stream"),
        "department":     user.get("department"),
        "graduation_year": user.get("graduation_year"),
        "cgpa":           user.get("cgpa"),
        "location":       user.get("location"),
        "city":           user.get("city"),
        "state":          user.get("state"),
        "linkedin_url":   user.get("linkedin_url"),
        "github_url":     user.get("github_url"),
        "portfolio_url":  user.get("portfolio_url"),
        "primary_skill":  user.get("primary_skill"),
        "profile_visibility": user.get("profile_visibility"),
        "section_toggles": user.get("section_toggles"),
        "badges":         user.get("badges", []),
        "projects":       user.get("projects"),
        "preferences":    user.get("preferences"),
        "is_verified":    user.get("is_verified"),
        "ranking_tier":   user.get("ranking_tier"),
    }


async def get_current_user(request: Request) -> dict:
    """JWT auth dependency. Reads `Authorization: Bearer <token>` header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def validate_student_class(school_info: SchoolInfo, age: Optional[int] = None) -> None:
    """Per spec: students must be age 10+ AND in Class 11 (+1) or above."""
    if age is not None and age < 10:
        raise HTTPException(400, "Students must be at least 10 years old to register.")
    cls = (school_info.class_or_year or "").strip().lower()
    # If user typed a single number, reject 1-10
    if cls.isdigit() and int(cls) < 11:
        raise HTTPException(400, "Students must be in Class 11 (+1) or above.")


# ----------------------------------------------------------------------------
# Auth Endpoints
# ----------------------------------------------------------------------------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    """Register a new user. Role is captured upfront — onboarding collects role-specific fields."""
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")

    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "full_name": req.full_name.strip(),
        "role": req.role,
        # Sensitive PII — encrypted at rest with Fernet (decrypted on read).
        "phone": encrypt_value(req.phone),
        "dob": encrypt_value(req.dob),
        "country_code": req.country_code,  # not sensitive, kept plain for indexing
        "postal_code": encrypt_value(req.postal_code),
        "unique_id": None,
        "qr_code_base64": None,
        "school_info": None,
        "career_path": None,
        "student_info": None,
        "alumni_info": None,
        "mentor_info": None,
        # Mentors are pending until admin approves (per spec).
        "mentor_status": "pending" if req.role == "mentor" else None,
        "interests": [],
        "skills": [],
        "bio": None,
        "face_image_base64": None,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    user_doc["_id"] = result.inserted_id

    # Audit log — capture the full registration payload for compliance.
    # Sensitive PII (phone / dob / postal_code) are encrypted in audit_logs
    # too — never store plaintext outside the in-flight request.
    await _audit_log_many(user_id=user_id, source="register", entries=[
        ("email",        None, req.email),
        ("full_name",    None, req.full_name),
        ("role",         None, req.role),
        ("phone",        None, encrypt_value(req.phone or "")),
        ("dob",          None, encrypt_value(req.dob or "")),
        ("country_code", None, req.country_code or ""),
        ("postal_code",  None, encrypt_value(req.postal_code or "")),
    ])

    return AuthResponse(
        access_token=create_access_token(user_id, email, req.role),
        refresh_token=create_refresh_token(user_id),
        user=UserResponse(**serialize_user(user_doc)),
    )


class CheckEmailRequest(BaseModel):
    email: EmailStr


@api_router.post("/auth/check-email")
async def check_email(req: CheckEmailRequest):
    """Smart Email Detect (per HTML spec) — checks whether an email already has
    an account so the client can decide whether to route to Login (existing)
    or Register (new). Also returns the user's role if we have one, so Login
    can show the correct branding.

    NOTE: This endpoint intentionally reveals account existence — it's the
    explicit UX contract of the Smart Email Detect screen in the spec. Rate
    limiting is the responsibility of the ingress layer.
    """
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"role": 1, "full_name": 1, "onboarding_completed": 1})
    if not user:
        return {"exists": False}
    return {
        "exists": True,
        "role": user.get("role"),
        "full_name": user.get("full_name"),
        "onboarding_completed": user.get("onboarding_completed", False),
    }


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    """Email + password login. Returns JWT pair, OR a 2FA challenge if user has 2FA enabled."""
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    # If 2FA is enabled — issue a short-lived challenge token instead of full session
    if user.get("two_fa_enabled"):
        challenge_id = secrets.token_urlsafe(24)
        await db.two_fa_challenges.insert_one({
            "_id": challenge_id,
            "user_id": str(user["_id"]),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "consumed": False,
            "created_at": datetime.now(timezone.utc),
        })
        return TwoFAChallengeResponse(
            requires_2fa=True,
            challenge_id=challenge_id,
            methods=["totp", "backup"],
            user_email=email,
        )

    return AuthResponse(
        access_token=create_access_token(str(user["_id"]), email, user["role"]),
        refresh_token=create_refresh_token(str(user["_id"])),
        user=UserResponse(**serialize_user(user)),
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Returns the currently authenticated user."""
    return UserResponse(**serialize_user(user))


# ----------------------------------------------------------------------------
# Mentor Onboarding — Suggestions (organizations + job titles)
# ----------------------------------------------------------------------------
# A curated, India-first list tailored for the core mentor archetypes
# (IT/Software · Career Coaching · Business / MBA · Academia). The frontend
# calls this on mount to populate its autocomplete & dropdown. The lists are
# intentionally broad — user can always type a custom value if not listed.
_MENTOR_ORGANIZATIONS = [
    # Big tech / product
    "Google", "Microsoft", "Meta", "Amazon", "Apple", "Netflix",
    "Adobe", "Salesforce", "Oracle", "IBM", "SAP", "Intel", "NVIDIA",
    "LinkedIn", "Uber", "Airbnb", "Stripe", "Atlassian", "Shopify",
    "Samsung Research", "Qualcomm", "Cisco", "VMware", "ServiceNow",
    # India Tech
    "Flipkart", "Swiggy", "Zomato", "Paytm", "PhonePe", "Razorpay",
    "Cred", "Meesho", "Zerodha", "Groww", "Nykaa", "Ola", "Myntra",
    "Byjus", "Unacademy", "Vedantu", "upGrad",
    "Freshworks", "Zoho", "Postman", "Hackerrank", "BrowserStack",
    # Services & consulting
    "TCS", "Infosys", "Wipro", "HCL Tech", "Tech Mahindra",
    "Cognizant", "Accenture", "Capgemini", "Deloitte", "EY",
    "PwC", "KPMG", "McKinsey & Company", "BCG", "Bain & Company",
    "JP Morgan Chase", "Goldman Sachs", "Morgan Stanley", "Barclays",
    # Enterprise / hardware / core
    "Reliance Jio", "Tata Motors", "Mahindra", "Bajaj Auto", "L&T",
    "Bharti Airtel", "ITC", "HDFC Bank", "ICICI Bank", "SBI",
    "Maruti Suzuki", "Hero MotoCorp", "Mahindra & Mahindra",
    # AI / emerging
    "OpenAI", "Anthropic", "Hugging Face", "Cohere",
    # Indian R&D / Public-sector
    "DRDO", "ISRO", "BARC", "BEL", "HAL",
    # Academia — top IITs / NITs / IISc
    "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur",
    "IIT Kharagpur", "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad",
    "IISc Bangalore", "IIIT Bangalore", "IIIT Hyderabad",
    "NIT Trichy", "NIT Warangal", "NIT Surathkal",
    "BITS Pilani", "VIT Vellore", "Manipal Institute of Technology",
    "ISB Hyderabad", "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta",
    "XLRI Jamshedpur",
    # Fallback
    "Independent / Freelancer", "Startup (Stealth)",
]

_MENTOR_JOB_TITLES = [
    # IT / Software Engineering
    "Software Engineer",
    "Senior Software Engineer",
    "Staff Software Engineer",
    "Principal Engineer",
    "Engineering Manager",
    "Senior Engineering Manager",
    "Director of Engineering",
    "VP of Engineering",
    "CTO",
    "Tech Lead",
    "Architect / Solution Architect",
    "DevOps / SRE Engineer",
    "Data Engineer",
    "Machine Learning Engineer",
    "Data Scientist",
    "AI / Research Scientist",
    "Product Manager",
    "Senior Product Manager",
    "Director of Product",
    "UX / Product Designer",
    "QA / Test Engineer",
    "Mobile Engineer (iOS / Android)",
    "Front-end Engineer",
    "Full-stack Engineer",
    "Cybersecurity Engineer",
    # HR / Recruiting
    "Technical Recruiter",
    "HR Manager",
    "Talent Acquisition Lead",
    "People Partner",
    # Career Coaching / Higher-Ed
    "Career Coach",
    "Career Counsellor",
    "Study Abroad Consultant",
    "Admissions Consultant",
    "Professor / Assistant Professor",
    "Associate Professor",
    "Dean",
    "Head of Department",
    # Business / MBA / Advisory
    "Founder",
    "Co-founder",
    "CEO",
    "COO",
    "CFO",
    "CMO",
    "Business Head",
    "VP of Sales",
    "VP of Marketing",
    "Management Consultant",
    "Industry Advisor",
    "Investor / Venture Partner",
    # Fallback
    "Other",
]


@api_router.get("/mentors/suggestions")
async def mentor_suggestions():
    """Return organization + job title suggestion lists used by the mentor
    onboarding form (role-details). No auth required — these are static
    reference lists that help users complete the form quickly."""
    return {
        "organizations": _MENTOR_ORGANIZATIONS,
        "job_titles": _MENTOR_JOB_TITLES,
    }


# ----------------------------------------------------------------------------
# Course / Stream Catalog — Indian Engineering + Popular Global Disciplines
# ----------------------------------------------------------------------------
_COURSES_CATALOG = [
    "Computer Science Engineering (CSE)",
    "Information Technology (IT)",
    "Electronics & Communication (ECE)",
    "Electrical & Electronics (EEE)",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Aerospace Engineering",
    "Automobile Engineering",
    "Biomedical Engineering",
    "Biotechnology",
    "Metallurgical Engineering",
    "Mining Engineering",
    "Marine Engineering",
    "Production / Industrial Engineering",
    "Agricultural Engineering",
    "Textile Engineering",
    "Artificial Intelligence & Machine Learning",
    "Data Science",
    "Cyber Security",
    "Robotics & Automation",
    "Electronics & Instrumentation",
    "Mechatronics",
    "Nanotechnology",
    "Bioinformatics",
    "Architecture (B.Arch)",
    "Pharmacy (B.Pharm)",
    "Design (B.Des)",
    "Commerce / BBA",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Economics",
    "Management (MBA)",
    "Law (LLB)",
    "Medicine (MBBS)",
    "Other",
]


@api_router.get("/courses")
async def courses():
    """Return the curated course/stream catalog used by Student onboarding.
    Engineering-heavy per SA's India-first rollout + a fallback 'Other'."""
    return {"courses": _COURSES_CATALOG}




# ----------------------------------------------------------------------------
# Badge endpoints (multi-role tiered + universal)
# ----------------------------------------------------------------------------
@api_router.get("/users/me/badges")
async def my_badges(user: dict = Depends(get_current_user)):
    """Compute & return the current user's badges + theme metadata."""
    badges = await compute_badges(db, user)
    try:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"badges": badges, "badges_updated_at": datetime.utcnow()}},
        )
    except Exception:
        pass
    return {"badges": badges, "theme": get_tier_theme()}


@api_router.get("/users/{user_id}/badges")
async def user_badges(user_id: str):
    """Public — fetch any user's badges (used on mentor cards / profile pages)."""
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        target = None
    if not target:
        raise HTTPException(404, "User not found")
    cached = target.get("badges")
    if cached and target.get("badges_updated_at"):
        return {"badges": cached, "theme": get_tier_theme(), "cached": True}
    badges = await compute_badges(db, target)
    try:
        await db.users.update_one(
            {"_id": target["_id"]},
            {"$set": {"badges": badges, "badges_updated_at": datetime.utcnow()}},
        )
    except Exception:
        pass
    return {"badges": badges, "theme": get_tier_theme()}


@api_router.get("/users/{user_id}/public-profile")
async def get_public_profile(user_id: str):
    """Sanitized public profile for the Social View page.
    Returns role-tinted fields with viewer-aware visibility.
    """
    # Simple no-auth fetch — visibility is enforced inside via privacy settings.
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        target = None
    if not target:
        raise HTTPException(404, "User not found")

    visibility = target.get("profile_visibility") or "public"
    if visibility == "private":
        raise HTTPException(403, "This profile is private")

    prefs = (target.get("preferences") or {}).get("privacy") or {}
    show_email = bool(prefs.get("show_email"))
    show_phone = bool(prefs.get("show_phone"))

    # Compute badges (cached path)
    badges = target.get("badges") or []
    if not badges:
        try:
            badges = await compute_badges(db, target)
        except Exception:
            badges = []

    si = target.get("school_info") or {}
    role = target.get("role") or "student"
    is_mentor = role == "mentor"

    # Mentor session stats (mocked for now if not present)
    session_stats = target.get("session_stats") or ({
        "total": int(target.get("sessions_completed") or 0),
        "avg_rating": target.get("rating"),
        "active_mentees": int(target.get("active_mentees") or 0),
    } if is_mentor else None)

    # Mock LinkedIn / GitHub / Experience until real integrations land
    out = {
        "id": str(target.get("_id")),
        "sa_id": target.get("sa_id"),
        "role": role,
        "full_name": target.get("full_name"),
        "first_name": target.get("first_name"),
        "last_name": target.get("last_name"),
        "headline": target.get("headline"),
        "bio": target.get("bio"),
        "photo_data": target.get("photo_data") or target.get("face_image_base64"),
        "is_online": target.get("is_online", True),
        # Identity meta
        "institution": target.get("institution") or si.get("institution_name"),
        "branch": target.get("branch"),
        "graduation_year": target.get("graduation_year") or target.get("year"),
        "cgpa": target.get("cgpa"),
        "city": target.get("city") or target.get("location"),
        "state": target.get("state"),
        "career_path": target.get("career_path"),
        # Career
        "job_title": target.get("job_title"),
        "organization": target.get("organization"),
        # Skills
        "skills": target.get("skills") or [],
        "interests": target.get("interests") or si.get("interests") or [],
        "primary_skill": target.get("primary_skill"),
        # Social — privacy-aware
        "linkedin_url": target.get("linkedin_url"),
        "github_url": target.get("github_url"),
        "portfolio_url": target.get("portfolio_url"),
        "email": target.get("email") if show_email else None,
        "phone": target.get("phone") if show_phone else None,
        "show_email": show_email,
        "show_phone": show_phone,
        # Badges
        "badges": badges,
        "badges_total": len(badges),
        # Mentor-only
        "is_mentor": is_mentor,
        "rating": target.get("rating"),
        "sessions": target.get("sessions"),
        "expected_rate_inr": target.get("expected_rate_inr"),
        "session_stats": session_stats,
        # Experience / education / projects (use whatever's stored, otherwise empty)
        "experience": target.get("experience") or [],
        "education": target.get("education") or ([{
            "institution": target.get("institution") or si.get("institution_name") or "—",
            "degree": target.get("branch") or "—",
            "year": target.get("graduation_year") or target.get("year") or "—",
        }] if (target.get("institution") or si.get("institution_name")) else []),
        "projects": target.get("projects") or [],
        # Mock GitHub stats (UI shows it when github_url present)
        "github_stats": target.get("github_stats") or ({
            "languages": [
                {"name": "Python", "pct": 38, "color": "#3776ab"},
                {"name": "TypeScript", "pct": 26, "color": "#3178c6"},
                {"name": "JavaScript", "pct": 18, "color": "#f1e05a"},
                {"name": "Go", "pct": 10, "color": "#00ADD8"},
                {"name": "Other", "pct": 8, "color": "#94a3b8"},
            ],
            "contributions_last_year": 642,
            "longest_streak": 21,
            "current_streak": 4,
            "pinned_repos": [
                {"name": "career-coach", "desc": "AI-powered career planner.", "stars": 28, "language": "TypeScript", "language_color": "#3178c6"},
                {"name": "mentor-match", "desc": "Recsys for student-mentor pairing.", "stars": 14, "language": "Python", "language_color": "#3776ab"},
                {"name": "study-buddy-cli", "desc": "Pomodoro CLI for study sprints.", "stars": 9, "language": "Go", "language_color": "#00ADD8"},
                {"name": "portfolio-v2", "desc": "Personal portfolio website.", "stars": 6, "language": "TypeScript", "language_color": "#3178c6"},
            ],
        } if target.get("github_url") else None),
        # Privacy meta
        "profile_visibility": visibility,
    }
    return out


@api_router.post("/users/me/badges/refresh")
async def refresh_my_badges(user: dict = Depends(get_current_user)):
    """Force-recompute & persist (called after key events from the client)."""
    badges = await compute_badges(db, user)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"badges": badges, "badges_updated_at": datetime.utcnow()}},
    )
    return {"badges": badges, "theme": get_tier_theme()}


@api_router.post("/admin/badges/recompute-all")
async def admin_recompute_all_badges(user: dict = Depends(get_current_user)):
    """Admin-only — nightly batch recompute (manually triggerable)."""
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    count = 0
    async for u in db.users.find({}, {"_id": 1, "role": 1, "email_verified": 1, "two_fa_enabled": 1}):
        full = await db.users.find_one({"_id": u["_id"]})
        if full:
            badges = await compute_badges(db, full)
            await db.users.update_one(
                {"_id": full["_id"]},
                {"$set": {"badges": badges, "badges_updated_at": datetime.utcnow()}},
            )
            count += 1
    return {"processed": count}


# ─── Certificates CRUD ──────────────────────────────────────────────────
@api_router.get("/users/me/certificates")
async def my_certificates(user: dict = Depends(get_current_user)):
    """List the current user's certificates."""
    return {"certificates": user.get("certificates") or []}


@api_router.post("/users/me/certificates")
async def add_my_certificate(payload: dict, user: dict = Depends(get_current_user)):
    """Add a certificate. Required: name, issuer, year."""
    name = (payload.get("name") or "").strip()
    issuer = (payload.get("issuer") or "").strip()
    year_raw = payload.get("year")
    if not name or not issuer:
        raise HTTPException(400, "name and issuer are required")
    try:
        year = int(year_raw) if year_raw else None
    except Exception:
        raise HTTPException(400, "year must be a number")
    cert = {
        "id": uuid.uuid4().hex[:12],
        "name": name,
        "issuer": issuer,
        "year": year,
        "credential_url": (payload.get("credential_url") or "").strip() or None,
        "added_at": datetime.utcnow().isoformat(),
    }
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$push": {"certificates": cert}, "$set": {"updated_at": datetime.utcnow()}},
    )
    # Recompute badges (certificates count badge will refresh)
    fresh = await db.users.find_one({"_id": user["_id"]})
    if fresh:
        try:
            badges = await compute_badges(db, fresh)
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"badges": badges, "badges_updated_at": datetime.utcnow()}},
            )
        except Exception:
            pass
    return {"ok": True, "certificate": cert}


@api_router.delete("/users/me/certificates/{cert_id}")
async def delete_my_certificate(cert_id: str, user: dict = Depends(get_current_user)):
    """Remove a certificate by id."""
    res = await db.users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"certificates": {"id": cert_id}}},
    )
    if res.modified_count == 0:
        raise HTTPException(404, "Certificate not found")
    # Recompute badges
    fresh = await db.users.find_one({"_id": user["_id"]})
    if fresh:
        try:
            badges = await compute_badges(db, fresh)
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"badges": badges, "badges_updated_at": datetime.utcnow()}},
            )
        except Exception:
            pass
    return {"ok": True, "deleted": cert_id}



# ─── Digital ID Card ────────────────────────────────────────────────────
def _generate_sa_id() -> str:
    """Generate a fresh SA-{YY}-{6digit} identifier."""
    yy = datetime.utcnow().year % 100
    n = random.randint(100000, 999999)
    return f"SA-{yy:02d}-{n}"


def _student_status_label(user: dict) -> dict:
    """Compute display status (Final Year / Pre-Final / Junior / Alumni / etc.)."""
    role = (user.get("role") or "").lower()
    if role == "alumni":
        return {"label": "Alumni", "color": "#A78BFA"}
    if role == "mentor":
        return {"label": "Mentor", "color": "#F59E0B"}
    if role == "college":
        return {"label": "Institution", "color": "#22D3EE"}
    si = user.get("school_info") or {}
    cls = (si.get("class_or_year") or si.get("current_course") or "").lower()
    gy = si.get("graduation_year")
    now = datetime.utcnow().year
    try:
        gy = int(gy) if gy else None
    except Exception:
        gy = None
    if gy:
        years_left = gy - now
        if years_left <= 0:
            return {"label": "Graduating", "color": "#10B981"}
        if years_left == 1:
            return {"label": "Final Year", "color": "#10B981"}
        if years_left == 2:
            return {"label": "Pre-Final Year", "color": "#22D3EE"}
        return {"label": "Junior", "color": "#A78BFA"}
    if "12" in cls or "plus two" in cls:
        return {"label": "Class 12 · Senior", "color": "#10B981"}
    if "11" in cls or "plus one" in cls:
        return {"label": "Class 11", "color": "#22D3EE"}
    if "10" in cls:
        return {"label": "Class 10", "color": "#A78BFA"}
    return {"label": "Student", "color": "#A78BFA"}


@api_router.get("/users/me/id-card")
async def my_id_card(user: dict = Depends(get_current_user)):
    """
    Return the user's Digital ID Card payload.

    Lazy-assigns sa_id on first call. Returns:
      sa_id, full_name, role, status (label+color), college, batch,
      branch, photo_data, verify_url, qr_payload, issued_at
    """
    sa_id = user.get("sa_id")
    if not sa_id:
        # Lazy-assign — retry up to 5 times to avoid duplicate IDs.
        for _ in range(5):
            sa_id = _generate_sa_id()
            existing = await db.users.find_one({"sa_id": sa_id})
            if not existing:
                break
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"sa_id": sa_id, "sa_id_issued_at": datetime.utcnow()}},
        )
        user["sa_id"] = sa_id

    si = user.get("school_info") or {}
    ai = user.get("alumni_info") or {}
    cp = user.get("college_profile") or {}
    role = (user.get("role") or "").lower()
    status = _student_status_label(user)

    institution = (
        si.get("institution_name")
        or ai.get("institution_name")
        or (user.get("full_name") if role == "college" else None)
        or "—"
    )
    branch = si.get("branch_or_stream") or ai.get("branch_or_stream") or si.get("current_course") or ""
    batch = si.get("graduation_year") or ai.get("graduation_year")
    if batch:
        try:
            batch = f"Class of {int(batch)}"
        except Exception:
            batch = str(batch)

    public_verify_url = f"/api/id-cards/{sa_id}"

    return {
        "sa_id": sa_id,
        "full_name": user.get("full_name") or user.get("email"),
        "email": user.get("email"),
        "role": role,
        "status": status,
        "institution": institution,
        "branch": branch,
        "batch": batch,
        "city": si.get("city") or cp.get("city"),
        "state": si.get("state") or cp.get("state"),
        "photo_data": user.get("face_image_base64"),
        "linkedin_url": user.get("linkedin_url"),
        "issued_at": (user.get("sa_id_issued_at") or datetime.utcnow()).isoformat()
            if isinstance(user.get("sa_id_issued_at"), datetime) else str(user.get("sa_id_issued_at") or datetime.utcnow().isoformat()),
        "verify_url": public_verify_url,
        # QR encodes a JSON-friendly compact string for offline verification
        "qr_payload": f"sa://verify?id={sa_id}",
    }


@api_router.get("/id-cards/{sa_id}")
async def verify_id_card(sa_id: str):
    """
    Public ID verification endpoint — returns ONLY non-sensitive fields,
    used by anyone scanning the QR code.
    """
    u = await db.users.find_one(
        {"sa_id": sa_id},
        {"password_hash": 0, "phone": 0, "face_image_base64": 0, "two_fa_secret": 0},
    )
    if not u:
        raise HTTPException(404, "Invalid SA-ID")
    si = u.get("school_info") or {}
    institution = si.get("institution_name") or u.get("full_name") or "—"
    return {
        "sa_id": sa_id,
        "valid": True,
        "full_name": u.get("full_name") or "—",
        "role": u.get("role"),
        "institution": institution,
        "status": _student_status_label(u),
        "issued_at": (u.get("sa_id_issued_at") or u.get("created_at") or "").isoformat()
            if isinstance(u.get("sa_id_issued_at") or u.get("created_at"), datetime) else "",
    }





@api_router.post("/auth/refresh")
async def refresh_token(payload: dict):
    """Exchanges a valid refresh token for a fresh access token."""
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(400, "Missing refresh_token")
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if data.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(data["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return {"access_token": create_access_token(str(user["_id"]), user["email"], user["role"])}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")


# ----------------------------------------------------------------------------
# 2FA (Two-Factor Authentication) Endpoints — TOTP-based (RFC 6238)
# ----------------------------------------------------------------------------
# Flow:
#   1. POST /auth/2fa/setup    → returns secret + QR for authenticator app
#   2. POST /auth/2fa/enable   → user verifies first code → 2FA flipped on + backup codes
#   3. POST /auth/login        → if 2fa_enabled, returns challenge instead of tokens
#   4. POST /auth/2fa/verify   → user submits code → tokens issued
#   5. POST /auth/2fa/disable  → password + code → 2FA disabled
# ----------------------------------------------------------------------------
TOTP_ISSUER = "Student Alumni"


def _generate_backup_codes(n: int = 10) -> List[str]:
    """Returns N human-readable backup codes (XXXX-XXXX format)."""
    out = []
    for _ in range(n):
        a = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        b = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        out.append(f"{a}-{b}")
    return out


def _generate_totp_qr(uri: str) -> str:
    """Generate base64-encoded PNG QR for a TOTP otpauth:// URI."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#7C3AED", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@api_router.get("/downloads/sa_flows.zip")
async def download_sa_flows_zip():
    """Serves the bundled flow-screenshots ZIP for the current user session."""
    from fastapi.responses import FileResponse
    p = "/app/backend/static_downloads/sa_flows.zip"
    if not os.path.exists(p):
        raise HTTPException(404, "Archive not found")
    return FileResponse(p, media_type="application/zip", filename="sa_flows.zip")


@api_router.get("/downloads/expo_qr.png")
async def download_expo_qr():
    """Serves the QR code that Expo Go can scan to open the live app."""
    from fastapi.responses import FileResponse
    p = "/app/backend/static_downloads/expo_qr.png"
    if not os.path.exists(p):
        raise HTTPException(404, "QR not found")
    return FileResponse(p, media_type="image/png")


# ----------------------------------------------------------------------------
# Institution Autocomplete (OpenStreetMap Nominatim) + Logo (Clearbit/Google)
# ----------------------------------------------------------------------------
import httpx
from urllib.parse import urlparse

_NOMINATIM_HEADERS = {"User-Agent": "StudentAlumni/1.0 (contact@studentalumni.app)"}

# In-memory cache (q+type → results) to avoid repeated Nominatim hits.
# TTL ~ 30 min. Bounded size 256 entries.
_INST_CACHE: dict = {}
_INST_CACHE_TTL = 60 * 30
_INST_CACHE_MAX = 256


def _cache_get(key: str):
    entry = _INST_CACHE.get(key)
    if not entry:
        return None
    ts, val = entry
    if (datetime.utcnow().timestamp() - ts) > _INST_CACHE_TTL:
        _INST_CACHE.pop(key, None)
        return None
    return val


def _cache_set(key: str, val):
    if len(_INST_CACHE) >= _INST_CACHE_MAX:
        # drop oldest
        try:
            oldest = min(_INST_CACHE, key=lambda k: _INST_CACHE[k][0])
            _INST_CACHE.pop(oldest, None)
        except ValueError:
            pass
    _INST_CACHE[key] = (datetime.utcnow().timestamp(), val)


# Educational types we want to KEEP from Nominatim
_EDU_TYPES = {
    "school", "college", "university", "kindergarten", "language_school",
    "music_school", "driving_school", "research_institute",
    "educational_institution",
}
# Types we want to REJECT (roads, hostels, hotels, residences, etc.)
_REJECT_TYPES = {
    "hostel", "apartments", "apartment", "house", "residential", "dormitory",
    "road", "highway", "motorway", "trunk", "primary", "secondary", "tertiary",
    "service", "footway", "path", "bridge", "junction", "roundabout",
    "yes", "hotel", "guest_house", "motel", "neighbourhood", "suburb",
    "village", "town", "city", "construction", "garage", "shop",
}
# Educational keywords for name-based fallback detection
_EDU_KEYWORDS = (
    "school", "college", "university", "vidyalaya", "vidhyalaya", "vidya",
    "kendriya", "navodaya", "academy", "institute", "polytechnic", "campus",
    "convent", "gurukul", "mahavidyalaya", "iit ", "iim ", "nit ", "iiit",
    "public school", "high school", "junior", "senior secondary",
    "intermediate", "inter college", "junior college", "pu college",
    "pre-university", "pre university",
)


def _smart_titlecase(s: str) -> str:
    """Title-case but preserve common acronyms & joins (DPS, JNTU, IIT, etc.)."""
    if not s:
        return s
    parts = s.split()
    out = []
    for p in parts:
        # Keep mostly-uppercase short words as acronyms (IIT, JNTU, KPHB, NH44 etc.)
        letters = "".join(c for c in p if c.isalpha())
        if letters and letters.isupper() and len(letters) <= 5:
            out.append(p.upper())
        elif p.lower() in {"of", "the", "and", "for", "in", "at", "on"}:
            out.append(p.lower())
        else:
            out.append(p[:1].upper() + p[1:].lower() if p else p)
    if out:
        out[0] = out[0][:1].upper() + out[0][1:]
    return " ".join(out)


def _looks_like_institution(item: dict) -> tuple[bool, str]:
    """Returns (keep, normalized_name)."""
    typ = (item.get("type") or "").lower()
    cat = (item.get("category") or "").lower()
    full = (item.get("display_name") or "").strip()
    primary = full.split(",")[0].strip() if full else ""
    primary_lower = primary.lower()

    # Hard reject obvious non-institutions
    if typ in _REJECT_TYPES or cat in {"highway"}:
        return False, primary

    # Reject names that look like landmarks/POIs near an institution but not the institution itself
    bad_endings = (
        " gate", " gate 1", " gate 2", " gate 3", " phase 1", " phase 2", " phase 3",
        " phase 4", " phase 5", " phase 6", " road", " highway", " flyover", " bridge",
        " junction", " crossing", " circle", " square", " stop", " bus stop",
        " metro station", " railway station", " station", " hostel", " ladies hostel",
        " boys hostel", " girls hostel", " apartments", " apartment", " quarters",
    )
    if any(primary_lower.endswith(b) for b in bad_endings):
        return False, primary

    # Reject if first segment is just a road/highway-style label without edu keyword
    road_markers = ("road", "highway", "flyover", "bridge", "lane", "marg", "street", "nagar")
    if any(primary_lower.endswith(" " + m) or primary_lower == m for m in road_markers):
        if not any(k in primary_lower for k in _EDU_KEYWORDS):
            return False, primary

    # Reject hostels / apartments by name when they don't include an edu keyword
    junk_markers = ("hostel", "apartment", "apartments", "pg ", "lodge", "guest house")
    if any(j in primary_lower for j in junk_markers) and not any(
        k in primary_lower for k in _EDU_KEYWORDS
    ):
        return False, primary

    # Accept educational types
    if typ in _EDU_TYPES:
        return True, _smart_titlecase(primary)
    if cat in {"amenity", "building", "office"} and typ in _EDU_TYPES:
        return True, _smart_titlecase(primary)
    # Accept by name keyword (covers cases where Nominatim mislabels type)
    if any(k in primary_lower for k in _EDU_KEYWORDS):
        return True, _smart_titlecase(primary)
    return False, primary


@api_router.get("/institutions/search")
async def institution_search(q: str, country: str = "India", type: str = ""):
    """Autocomplete proxy for institution search via Photon (Komoot, OSM-based).
    Photon supports OSM tag filtering and is more permissive with rate limits.

    Args:
        q: free-text query (min 2 chars)
        country: country bias (default India) — used only for cache key
        type: optional 'school' | 'college' | 'university' — maps to amenity tags
    """
    q = (q or "").strip()
    if len(q) < 2:
        return {"results": []}

    type_lower = (type or "").lower().strip()

    # Cache key
    cache_key = f"{q.lower()}|{type_lower}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {"results": cached, "cached": True}

    # Build Photon params. amenity:school/college/university filters precisely.
    # type=school (now semantically "Inter / Inter Board College") → primarily
    # amenity:college (where Indian Junior / Intermediate / Inter Board / PU
    # colleges are tagged in OSM). amenity:school kept as a fallback because
    # many composite K-12+Inter schools are tagged only as schools in OSM.
    osm_tags: list[str] = []
    if type_lower == "school":
        # Inter Board Colleges first, regular schools as backup.
        osm_tags = ["amenity:college", "amenity:school"]
    elif type_lower == "college":
        # Engineering / technical focus: IITs / NITs / IIITs are often tagged
        # as amenity:university in OSM, so include both.
        osm_tags = ["amenity:university", "amenity:college"]
    elif type_lower == "university":
        osm_tags = ["amenity:university", "amenity:college"]
    else:
        osm_tags = ["amenity:school", "amenity:college", "amenity:university"]

    # Photon accepts repeated osm_tag params via query string.
    params: list[tuple[str, str]] = [
        ("q", q),
        ("limit", "20"),
        ("lang", "en"),
    ]
    for tag in osm_tags:
        params.append(("osm_tag", tag))

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://photon.komoot.io/api/",
                params=params,
                headers=_NOMINATIM_HEADERS,
            )
            if r.status_code == 429:
                return {"results": [], "rate_limited": True}
            r.raise_for_status()
            payload = r.json() or {}
            features = payload.get("features", []) or []
    except Exception as e:
        return {"results": [], "error": str(e)}

    out: list[dict] = []
    seen: set[str] = set()
    # Medical / health-science institutions to EXCLUDE for type=college
    # (the user wants only technical engineering institutions under College).
    MEDICAL_KEYWORDS = (
        "medical", "dental", "pharmacy", "pharma ", "ayurved", "homeopath",
        "nursing", "veterinary", "siddha", "unani", "physiotherapy",
        "physiotherapy", "yoga ", "naturopathy", "homoeopathic", "homoeopathy",
        " mbbs", " bds", " bhms", " bams", "paramedical",
        "aiims", "jipmer", "kgmu", "afmc", "cmc vellore",
        "all india institute of medical",
    )
    # Ranking boosts based on type
    INTER_KEYWORDS = ("junior college", "inter college", "intermediate college",
                      "pu college", "puc", "jr college", "jr. college",
                      "intermediate", "junior", " inter ", "+1", "+2",
                      "pre-university", "pre university", "pre-univ")
    # Engineering / technical institution keywords (Indian context)
    ENG_KEYWORDS = (
        # Premier institutes (IITs / NITs / IIITs / IISc / IISER)
        "iit ", "indian institute of technology",
        "nit ", "national institute of technology",
        "iiit ", "indian institute of information technology",
        "iisc", "indian institute of science",
        "iiser", "indian institute of science education",
        # Private deemed universities
        "bits ", "birla institute of technology", "birla institute of science",
        "vit ", "vellore institute", "srm ", "manipal", "amrita",
        "thapar", "lpu", "lovely professional", "shiv nadar",
        "ashoka university", "ashoka", "iiit hyderabad", "dhirubhai",
        # Generic engineering keywords
        "engineering", "technology", "technical", "polytechnic",
        "tech university", "technological", "school of engineering",
        "college of engineering", "institute of technology",
        "nirma", "psg ", "coimbatore institute", "cit ", "kits",
        "rec ", "anna university",
    )

    def _inter_score(props: dict) -> int:
        n = (props.get("name") or "").lower()
        return -sum(1 for k in INTER_KEYWORDS if k in n)

    def _eng_score(props: dict) -> int:
        n = (props.get("name") or "").lower()
        # Boost for engineering keyword + extra boost for premier institutes
        base = -sum(1 for k in ENG_KEYWORDS if k in n)
        if "iit " in n or "indian institute of technology" in n:
            base -= 5
        if "nit " in n or "national institute of technology" in n:
            base -= 4
        if "iiit " in n or "indian institute of information" in n:
            base -= 3
        return base

    if type_lower == "school":
        features = sorted(features, key=lambda f: _inter_score(f.get("properties") or {}))
    elif type_lower == "college":
        features = sorted(features, key=lambda f: _eng_score(f.get("properties") or {}))
    for feat in features:
        props = (feat.get("properties") or {})
        name = (props.get("name") or "").strip()
        if not name:
            continue
        # Reject if not in target country (India by default)
        country_name = props.get("country") or country
        if country and country.lower() not in country_name.lower():
            continue
        primary = _smart_titlecase(name)
        primary_lower = primary.lower()

        # Apply name-quality guards (reuse existing reject lists for safety)
        bad_endings = (
            " gate", " phase 1", " phase 2", " phase 3", " phase 4", " phase 5",
            " phase 6", " road", " highway", " flyover", " bridge",
            " junction", " crossing", " circle", " square", " stop",
            " bus stop", " metro station", " railway station", " station",
            " hostel", " ladies hostel", " boys hostel", " girls hostel",
            " apartments", " apartment", " quarters",
        )
        if any(primary_lower.endswith(b) for b in bad_endings):
            continue

        # For type=college, exclude medical / dental / pharmacy / nursing institutions.
        # User wants only Technical Engineering institutions under College.
        if type_lower == "college" and any(k in primary_lower for k in MEDICAL_KEYWORDS):
            continue

        city = (
            props.get("city") or props.get("town") or props.get("village")
            or props.get("locality") or props.get("district")
            or props.get("county") or ""
        )
        state = props.get("state") or ""

        key = f"{primary.lower()}|{city.lower()}"
        if key in seen:
            continue
        seen.add(key)

        # Photon doesn't expose a website tag, but we can probe extra props.
        domain = ""

        # Build a clean address line from street/postcode/city/state
        street = props.get("street") or ""
        postcode = props.get("postcode") or ""
        addr_line = ", ".join(
            x for x in [street, props.get("locality"), city, state, postcode, country_name] if x
        )

        out.append({
            "id": f"{props.get('osm_type','')}{props.get('osm_id','')}",
            "name": primary,
            "display_name": addr_line,
            "address_line": addr_line,
            "city": city,
            "state": state,
            "country": country_name,
            "lat": (feat.get("geometry") or {}).get("coordinates", [None, None])[1],
            "lon": (feat.get("geometry") or {}).get("coordinates", [None, None])[0],
            "domain": domain,
            "type": props.get("osm_value") or "",
        })
        if len(out) >= 8:
            break
    _cache_set(cache_key, out)
    return {"results": out}


@api_router.get("/institutions/logo")
async def institution_logo(name: str = "", domain: str = ""):
    """Returns CANDIDATE logo URLs for an institution. Frontend tries them in order
    via <Image onError> and falls back to a default icon if all fail.
      1) Clearbit if domain is known
      2) Clearbit on guessed domain (slug + .ac.in/.edu.in/.in/.com)
      3) Google Favicon (always works for any domain)
    """
    name = (name or "").strip()
    domain = (domain or "").strip().lower().replace("www.", "")

    candidates = []
    if domain:
        candidates.append(domain)
    if name:
        slug = "".join(c.lower() for c in name if c.isalnum())
        if slug:
            candidates.extend([f"{slug}.ac.in", f"{slug}.edu.in", f"{slug}.in", f"{slug}.com"])

    urls = []
    for d in candidates:
        urls.append({"url": f"https://logo.clearbit.com/{d}", "source": "clearbit", "domain": d})
    # Always include Google Favicon as a final fallback (high success rate)
    if candidates:
        d = candidates[0]
        urls.append({"url": f"https://www.google.com/s2/favicons?domain={d}&sz=128", "source": "google_favicon", "domain": d})
    return {"candidates": urls}


@api_router.post("/auth/2fa/setup", response_model=TwoFASetupResponse)
async def two_fa_setup(user: dict = Depends(get_current_user)):
    """Generate a fresh TOTP secret and QR for the authenticator app.
    Stored as `pending_two_fa_secret` until the user confirms with /enable."""
    secret = pyotp.random_base32()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user["email"], issuer_name=TOTP_ISSUER,
    )
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"pending_two_fa_secret": secret}},
    )
    return TwoFASetupResponse(
        secret=secret,
        otpauth_uri=uri,
        qr_code_base64=_generate_totp_qr(uri),
    )


@api_router.post("/auth/2fa/enable", response_model=TwoFAEnableResponse)
async def two_fa_enable(req: TwoFAEnableRequest, user: dict = Depends(get_current_user)):
    """User confirms TOTP code → 2FA officially enabled + backup codes returned ONCE."""
    pending = user.get("pending_two_fa_secret")
    if not pending:
        raise HTTPException(400, "No pending 2FA setup. Call /auth/2fa/setup first.")

    code = (req.code or "").strip().replace(" ", "")
    if not pyotp.TOTP(pending).verify(code, valid_window=1):
        raise HTTPException(400, "Invalid 2FA code. Try again.")

    backup_codes = _generate_backup_codes()
    # Store hashed backup codes (bcrypt) — never plaintext
    backup_hashes = [hash_password(c) for c in backup_codes]

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "two_fa_secret": pending,
                "two_fa_enabled": True,
                "two_fa_backup_codes": backup_hashes,
            },
            "$unset": {"pending_two_fa_secret": ""},
        },
    )
    return TwoFAEnableResponse(enabled=True, backup_codes=backup_codes)


@api_router.post("/auth/2fa/verify", response_model=AuthResponse)
async def two_fa_verify(req: TwoFAVerifyRequest):
    """User submits TOTP/backup code with the challenge_id from /auth/login.
    On success → returns full access + refresh JWT pair."""
    challenge = await db.two_fa_challenges.find_one({"_id": req.challenge_id})
    if not challenge:
        raise HTTPException(401, "Invalid or expired challenge")
    if challenge.get("consumed"):
        raise HTTPException(401, "Challenge already used")
    if challenge["expires_at"].replace(tzinfo=None) < datetime.utcnow():
        raise HTTPException(401, "Challenge expired. Please log in again.")

    user = await db.users.find_one({"_id": ObjectId(challenge["user_id"])})
    if not user:
        raise HTTPException(401, "User not found")

    code = (req.code or "").strip().replace(" ", "")

    # 1) Try TOTP first
    secret = user.get("two_fa_secret")
    valid = bool(secret) and pyotp.TOTP(secret).verify(code, valid_window=1)

    # 2) Try backup codes (one-time-use)
    used_backup_idx = None
    if not valid and "-" in code:
        for i, h in enumerate(user.get("two_fa_backup_codes") or []):
            if verify_password(code, h):
                valid = True
                used_backup_idx = i
                break

    if not valid:
        raise HTTPException(401, "Invalid 2FA code")

    # Consume challenge + invalidate used backup code
    await db.two_fa_challenges.update_one(
        {"_id": req.challenge_id},
        {"$set": {"consumed": True, "consumed_at": datetime.now(timezone.utc)}},
    )
    if used_backup_idx is not None:
        backup_codes = user.get("two_fa_backup_codes", [])
        backup_codes.pop(used_backup_idx)
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"two_fa_backup_codes": backup_codes}})

    return AuthResponse(
        access_token=create_access_token(str(user["_id"]), user["email"], user["role"]),
        refresh_token=create_refresh_token(str(user["_id"])),
        user=UserResponse(**serialize_user(user)),
    )


@api_router.post("/auth/2fa/disable")
async def two_fa_disable(req: TwoFADisableRequest, user: dict = Depends(get_current_user)):
    """Disable 2FA — requires current password AND valid TOTP code (or backup)."""
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid password")

    secret = user.get("two_fa_secret")
    code = (req.code or "").strip().replace(" ", "")
    valid = bool(secret) and pyotp.TOTP(secret).verify(code, valid_window=1)
    if not valid:
        # try backup
        for h in user.get("two_fa_backup_codes") or []:
            if verify_password(code, h):
                valid = True
                break
    if not valid:
        raise HTTPException(401, "Invalid 2FA code")

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"two_fa_enabled": False},
            "$unset": {
                "two_fa_secret": "",
                "two_fa_backup_codes": "",
                "pending_two_fa_secret": "",
            },
        },
    )
    return {"disabled": True}


@api_router.post("/auth/2fa/regenerate-backup-codes", response_model=TwoFAEnableResponse)
async def two_fa_regenerate_backup(req: TwoFAEnableRequest, user: dict = Depends(get_current_user)):
    """Regenerate backup codes — requires current TOTP code. Old codes invalidated."""
    if not user.get("two_fa_enabled"):
        raise HTTPException(400, "2FA is not enabled")
    secret = user.get("two_fa_secret")
    code = (req.code or "").strip().replace(" ", "")
    if not (secret and pyotp.TOTP(secret).verify(code, valid_window=1)):
        raise HTTPException(401, "Invalid 2FA code")

    backup_codes = _generate_backup_codes()
    backup_hashes = [hash_password(c) for c in backup_codes]
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"two_fa_backup_codes": backup_hashes}},
    )
    return TwoFAEnableResponse(enabled=True, backup_codes=backup_codes)



# ----------------------------------------------------------------------------
# OAuth Endpoints (Google + LinkedIn)
# ----------------------------------------------------------------------------
# NOTE: These endpoints currently use a MOCKED token-validation flow for the
# development build. To switch to real OAuth verification:
#   1. Set GOOGLE_OAUTH_CLIENT_ID / LINKEDIN_OAUTH_CLIENT_ID + secrets in .env
#   2. Replace the `_verify_google_token` / `_verify_linkedin_token` stubs below
#      with real google.auth + httpx calls (see integration_playbook).
# The endpoint shape and the upstream JWT issuance flow stay identical, so the
# frontend doesn't need any changes when we wire up real verification.
#
# Frontend flow (per Option C):
#   - User taps "Continue with Google" → opens browser via expo-auth-session
#   - Returns id_token / access_token → frontend POSTs to /auth/google
#   - Backend verifies (mocked for now), upserts user, returns our JWT
# ----------------------------------------------------------------------------
class OAuthCallback(BaseModel):
    """Generic OAuth callback payload sent from the Expo client."""
    id_token: Optional[str] = None         # Google ID token (JWT)
    access_token: Optional[str] = None     # Provider access token (LinkedIn)
    # MOCK MODE — the client may pass these directly in dev. In production
    # these are extracted server-side from the verified provider token.
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[UserRole] = "student"   # Used only when creating a new account


async def _upsert_oauth_user(provider: str, email: str, full_name: str,
                              picture: Optional[str], role: str = "student") -> dict:
    """Find or create a user from an OAuth profile. Marks them with `oauth_provider`."""
    email = email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        # Update OAuth metadata if user signed in with this provider
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"oauth_provider": provider, "oauth_picture": picture}},
        )
        return await db.users.find_one({"_id": user["_id"]})

    # New OAuth user — create with onboarding NOT yet completed so the client
    # routes them through the onboarding flow.
    user_doc = {
        "email": email,
        "password_hash": hash_password(secrets.token_urlsafe(16)),  # random unguessable password
        "full_name": full_name or email.split("@")[0].title(),
        "role": role or "student",
        "phone": None,
        "unique_id": generate_unique_id(role or "student"),
        "qr_code_base64": None,
        "school_info": None,
        "career_path": None,
        "interests": [],
        "skills": [],
        "bio": None,
        "face_image_base64": None,
        "oauth_provider": provider,
        "oauth_picture": picture,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(user_doc)
    user_doc["_id"] = res.inserted_id
    user_doc["qr_code_base64"] = generate_qr_code(
        f"SA-USER:{user_doc['unique_id']}|{email}|{user_doc['role']}"
    )
    await db.users.update_one(
        {"_id": res.inserted_id},
        {"$set": {"qr_code_base64": user_doc["qr_code_base64"]}},
    )
    return user_doc


def _verify_google_token(id_token: Optional[str]) -> Optional[dict]:
    """STUB — verifies a Google ID token. In production replace with:
        from google.auth.transport import requests as g_req
        from google.oauth2 import id_token as g_id
        g_id.verify_oauth2_token(id_token, g_req.Request(), GOOGLE_OAUTH_CLIENT_ID)
    For dev/Option-C: returns None so the route falls back to the email/full_name
    sent in the body.
    """
    return None


def _verify_linkedin_token(access_token: Optional[str]) -> Optional[dict]:
    """STUB — verifies a LinkedIn access token by calling /v2/userinfo.
    In production replace with:
        async with httpx.AsyncClient() as c:
            r = await c.get('https://api.linkedin.com/v2/userinfo',
                            headers={'Authorization': f'Bearer {access_token}'})
            return r.json() if r.is_success else None
    """
    return None


@api_router.post("/auth/google", response_model=AuthResponse)
async def auth_google(req: OAuthCallback):
    """Continue-with-Google flow.

    Real flow: client (Expo) opens Google OAuth → receives `id_token` → POSTs here.
    Mock flow (Option C): client sends {email, full_name} directly for now.
    Returns our JWT pair so the rest of the app remains agnostic of the provider.
    """
    profile = _verify_google_token(req.id_token)
    if profile is None:
        if not req.email or not req.full_name:
            raise HTTPException(400, "Missing email/full_name (mock OAuth requires these in dev mode)")
        profile = {"email": req.email, "name": req.full_name, "picture": req.picture}

    user = await _upsert_oauth_user(
        provider="google",
        email=profile["email"],
        full_name=profile.get("name") or profile.get("full_name") or "",
        picture=profile.get("picture"),
        role=req.role or "student",
    )
    return AuthResponse(
        access_token=create_access_token(str(user["_id"]), user["email"], user["role"]),
        refresh_token=create_refresh_token(str(user["_id"])),
        user=UserResponse(**serialize_user(user)),
    )


@api_router.post("/auth/linkedin", response_model=AuthResponse)
async def auth_linkedin(req: OAuthCallback):
    """Continue-with-LinkedIn flow. Same structure as /auth/google."""
    profile = _verify_linkedin_token(req.access_token)
    if profile is None:
        if not req.email or not req.full_name:
            raise HTTPException(400, "Missing email/full_name (mock OAuth requires these in dev mode)")
        profile = {"email": req.email, "name": req.full_name, "picture": req.picture}

    user = await _upsert_oauth_user(
        provider="linkedin",
        email=profile["email"],
        full_name=profile.get("name") or profile.get("full_name") or "",
        picture=profile.get("picture"),
        role=req.role or "student",
    )
    return AuthResponse(
        access_token=create_access_token(str(user["_id"]), user["email"], user["role"]),
        refresh_token=create_refresh_token(str(user["_id"])),
        user=UserResponse(**serialize_user(user)),
    )


# ----------------------------------------------------------------------------
# Onboarding & Profile Endpoints
# ----------------------------------------------------------------------------
@api_router.post("/users/onboarding", response_model=UserResponse)
async def complete_onboarding(req: OnboardingRequest, user: dict = Depends(get_current_user)):
    """Complete role-specific onboarding & generate unique ID + QR code."""
    role = user["role"]

    # ---- Role-specific validation ----
    # NOTE: We auto-derive role-specific data from existing fields when missing,
    # so legacy onboarding flows continue to work. Strict validation is
    # enforced for clearly-required fields only.
    if role == "student":
        if not req.career_path:
            raise HTTPException(400, "Career path is required for students")
        # Validate Class 11+ even if no detailed student_info is provided
        validate_student_class(req.school_info, req.student_info.age if req.student_info else None)
        # Auto-create student_info if missing (use sensible defaults)
        if not req.student_info:
            cls = (req.school_info.class_or_year or "").strip().lower()
            edu_level = "plus_one" if "11" in cls else "plus_two" if "12" in cls else "btech"
            req.student_info = StudentInfo(age=18, education_level=edu_level,
                                            career_interests=req.interests)
    elif role == "alumni":
        if not req.career_path:
            raise HTTPException(400, "Career path is required for alumni")
        # Auto-create alumni_info if missing
        if not req.alumni_info:
            req.alumni_info = AlumniInfo(
                graduation_year=req.school_info.graduation_year or datetime.now().year,
                university=req.school_info.institution_name,
            )
    elif role == "mentor":
        # Mentors strictly require org + job_title (per spec)
        if not req.mentor_info:
            raise HTTPException(400, "mentor_info is required for mentors (organization, job_title)")
        if not req.mentor_info.organization or not req.mentor_info.job_title:
            raise HTTPException(400, "Organization and job title are mandatory for mentors")

    # ---- Generate unique ID + QR code (idempotent — only on first onboarding) ----
    unique_id = user.get("unique_id") or generate_unique_id(role)
    qr_payload = f"SA-USER:{unique_id}|{user['email']}|{role}"
    qr_code = generate_qr_code(qr_payload)

    # ---- Build update document ----
    update = {
        "school_info": req.school_info.model_dump(),
        "career_path": req.career_path,
        "interests": req.interests,
        "skills": req.skills,
        "bio": req.bio,
        "face_image_base64": req.face_image_base64,
        "unique_id": unique_id,
        "qr_code_base64": qr_code,
        "onboarding_completed": True,
        "updated_at": datetime.now(timezone.utc),
    }
    # Phone (collected during onboarding for all roles per spec) — encrypted at rest.
    if req.phone:
        update["phone"] = encrypt_value(req.phone.strip())
    if req.student_info:
        update["student_info"] = req.student_info.model_dump()
    if req.alumni_info:
        update["alumni_info"] = req.alumni_info.model_dump()
    if req.mentor_info:
        update["mentor_info"] = req.mentor_info.model_dump()
    if req.college_info:
        update["college_info"] = req.college_info.model_dump()
        # Mirror institution_name into school_info so existing aggregations keep working
        si = update.get("school_info") or {}
        si.setdefault("institution_name", req.college_info.institution_name)
        si.setdefault("institution_type", req.college_info.institution_type or "university")
        if req.college_info.city:    si.setdefault("city", req.college_info.city)
        if req.college_info.state:   si.setdefault("state", req.college_info.state)
        update["school_info"] = si

    # ---- Audit log — capture every onboarding field change ----
    user_id_str = str(user["_id"])
    audit_entries = []
    for field in ("school_info", "career_path", "interests", "skills", "bio",
                  "student_info", "alumni_info", "mentor_info", "college_info"):
        if field in update and update[field] is not None:
            old_val = user.get(field)
            new_val = update[field]
            if old_val != new_val:
                audit_entries.append((field, old_val, new_val))
    if req.phone:
        # Log encrypted form so audit collection never holds plaintext PII.
        audit_entries.append(("phone", None, update.get("phone")))

    await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    if audit_entries:
        await _audit_log_many(user_id=user_id_str, source="onboarding", entries=audit_entries)
    return UserResponse(**serialize_user(await db.users.find_one({"_id": user["_id"]})))


@api_router.get("/audit-logs/me")
async def get_my_audit_logs(
    user: dict = Depends(get_current_user),
    limit: int = 100,
    skip: int = 0,
):
    """Phase B — return the calling user's audit trail (most recent first).

    Response shape: { total, items: [{field_name, old_value, new_value, source,
    validation_status, is_manual_entry, ts}] }.

    Sensitive fields (phone, dob, postal_code) are decrypted on-the-fly so
    the user can audit their own changes without seeing ciphertext.
    """
    uid = str(user["_id"])
    total = await db.audit_logs.count_documents({"user_id": uid})
    cursor = db.audit_logs.find({"user_id": uid}).sort("ts", -1).skip(int(skip)).limit(min(int(limit), 500))
    items = []
    async for doc in cursor:
        items.append({
            "field_name": doc.get("field_name"),
            "old_value": (decrypt_value(doc.get("old_value"))
                          if isinstance(doc.get("old_value"), str)
                          and doc["old_value"].startswith(_ENC_PREFIX)
                          else doc.get("old_value")),
            "new_value": (decrypt_value(doc.get("new_value"))
                          if isinstance(doc.get("new_value"), str)
                          and doc["new_value"].startswith(_ENC_PREFIX)
                          else doc.get("new_value")),
            "source": doc.get("source"),
            "validation_status": doc.get("validation_status"),
            "is_manual_entry": bool(doc.get("is_manual_entry", False)),
            "ts": doc.get("ts").isoformat() if doc.get("ts") else None,
        })
    return {"total": total, "items": items}


@api_router.put("/users/me", response_model=UserResponse)
async def update_profile(updates: dict, user: dict = Depends(get_current_user)):
    """Self-profile update — expanded field set (Phase 4 SA Profile Web)."""
    allowed = {
        # Identity / basics
        "full_name", "first_name", "last_name", "headline", "bio",
        "phone", "city", "state", "location", "face_image_base64", "photo_data",
        # Academic
        "institution", "branch", "graduation_year", "year", "cgpa",
        "stream", "department",
        # Career
        "career_path", "primary_skill", "interests", "skills",
        # Social
        "linkedin_url", "github_url", "portfolio_url",
        # Visibility
        "profile_visibility",
        # Section toggles + sections content (free-form)
        "section_toggles", "projects",
        # Preferences (settings page)
        "preferences",
    }
    safe = {k: v for k, v in updates.items() if k in allowed}
    # Synthesize full_name when first/last provided
    if ("first_name" in safe or "last_name" in safe) and "full_name" not in safe:
        u_now = user
        fn = safe.get("first_name", u_now.get("first_name") or (u_now.get("full_name") or "").split(" ")[0])
        ln = safe.get("last_name",  u_now.get("last_name")  or " ".join((u_now.get("full_name") or "").split(" ")[1:]))
        safe["full_name"] = (str(fn or "").strip() + " " + str(ln or "").strip()).strip()
    if safe:
        safe["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": user["_id"]}, {"$set": safe})
    return UserResponse(**serialize_user(await db.users.find_one({"_id": user["_id"]})))


# ----------------------------------------------------------------------------
# Profile completion + Resume + Preferences (SA Profile Web — Phase 4)
# ----------------------------------------------------------------------------
def _compute_profile_completion(u: dict) -> dict:
    """Return per-item checklist + overall percentage."""
    fn = (u.get("full_name") or "").strip()
    has_first = bool((u.get("first_name") or fn.split(" ")[0]) and fn)
    has_last = len(fn.split(" ")) > 1
    has_photo = bool(u.get("face_image_base64") or u.get("photo_data"))
    has_bio = bool((u.get("bio") or u.get("headline") or "").strip())
    has_college = bool((u.get("institution") or "").strip()) and bool((u.get("branch") or "").strip())
    has_social = bool((u.get("linkedin_url") or u.get("github_url") or u.get("portfolio_url") or "").strip())
    interests_count = len(u.get("interests") or [])
    has_interests = interests_count >= 3
    skills_count = len(u.get("skills") or [])
    has_skills = skills_count >= 1
    items = [
        {"key": "basic", "label": "Basic info", "done": bool(has_first and has_last), "weight": 14},
        {"key": "photo", "label": "Profile photo", "done": has_photo, "weight": 14},
        {"key": "bio", "label": "Bio / headline", "done": has_bio, "weight": 14},
        {"key": "college", "label": "College details", "done": has_college, "weight": 14},
        {"key": "social", "label": "Social links", "done": has_social, "weight": 14},
        {"key": "interests", "label": "3+ interests", "done": has_interests, "weight": 15},
        {"key": "skills", "label": "Skills listed", "done": has_skills, "weight": 15},
    ]
    pct = sum(i["weight"] for i in items if i["done"])
    return {"percentage": pct, "items": items}


@api_router.get("/users/me/completion")
async def get_my_completion(user: dict = Depends(get_current_user)):
    return _compute_profile_completion(user)


@api_router.get("/users/me/stats")
async def get_my_stats(user: dict = Depends(get_current_user)):
    uid = str(user.get("id") or user.get("_id"))

    # Sessions completed (mentor sessions where user was mentee/mentor and status=completed)
    sessions_completed = 0
    mentor_sessions = 0
    try:
        sessions_completed = await db.mentor_sessions.count_documents({
            "$or": [{"mentor_id": uid}, {"mentee_id": uid}],
            "status": {"$in": ["completed", "done", "finished"]},
        })
        mentor_sessions = await db.mentor_sessions.count_documents({
            "mentee_id": uid,
            "status": {"$in": ["scheduled", "confirmed", "upcoming", "completed"]},
        })
    except Exception:
        sessions_completed = int(user.get("sessions_completed") or user.get("sessions") or 0)
        mentor_sessions = int(user.get("mentor_sessions") or 0)

    # Connections made
    connections_made = 0
    try:
        connections_made = await db.connections.count_documents({
            "$or": [{"from_id": uid}, {"to_id": uid}],
            "status": "accepted",
        })
    except Exception:
        connections_made = int(user.get("connections_made") or 0)

    # Profile views (counter incremented elsewhere; fallback to user field)
    profile_views = int(user.get("profile_views") or 0)

    # Applications sent (internship/job applications)
    applications_sent = 0
    try:
        applications_sent = await db.applications.count_documents({"user_id": uid})
    except Exception:
        applications_sent = int(user.get("applications_sent") or 0)

    # Mentor-specific aggregates (rating + monthly earnings) — cheap if collections empty
    avg_rating = 0.0
    rating_count = 0
    earnings_this_month = 0
    try:
        rating_pipeline = [
            {"$match": {"mentor_id": uid, "rating": {"$gte": 1}}},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "n": {"$sum": 1}}},
        ]
        async for doc in db.feedback.aggregate(rating_pipeline):
            avg_rating = round(float(doc.get("avg") or 0), 2)
            rating_count = int(doc.get("n") or 0)
    except Exception:
        avg_rating = float(user.get("rating_avg") or 0)
        rating_count = int(user.get("rating_count") or 0)

    try:
        from datetime import datetime as _dt
        now = _dt.utcnow()
        earnings_pipeline = [
            {"$match": {
                "user_id": uid, "type": "earning",
                "created_at": {"$gte": _dt(now.year, now.month, 1)},
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]
        async for doc in db.payments.aggregate(earnings_pipeline):
            earnings_this_month = int(doc.get("total") or 0)
    except Exception:
        earnings_this_month = int(user.get("earnings_this_month") or 0)

    return {
        "sessions_completed": sessions_completed,
        "connections_made": connections_made,
        "profile_views": profile_views,
        "mentor_sessions": mentor_sessions,
        "applications_sent": applications_sent,
        "avg_rating": avg_rating,
        "rating_count": rating_count,
        "earnings_this_month": earnings_this_month,
    }


# ════════════════════════════════════════════════════════════════════════════
# Tools & Integrations (Profile sub-tab)
# Stores per-user external tool connections used to power AI brief context,
# default session platform selection and outreach tooling.
# ════════════════════════════════════════════════════════════════════════════
INTEGRATION_PROVIDERS = {
    # AI providers — used for personalising the AI brief
    "ai":       {"openai_chatgpt", "anthropic_claude", "google_gemini"},
    # Email services
    "email":    {"gmail", "outlook", "icloud"},
    # Video conferencing
    "video":    {"google_meet", "zoom", "ms_teams"},
    # Calendar & productivity
    "calendar": {"google_calendar", "outlook_calendar", "notion", "slack"},
}
ALL_INTEGRATION_PROVIDERS: set[str] = {p for s in INTEGRATION_PROVIDERS.values() for p in s}


@api_router.get("/users/me/integrations")
async def list_my_integrations(user: dict = Depends(get_current_user)):
    """List the current user's connected tools/integrations + default platform."""
    integrations = (user.get("integrations") or {})
    prefs = (user.get("preferences") or {})
    return {
        "integrations": integrations,
        "default_video_platform": prefs.get("default_video_platform"),
        "default_ai_provider":    prefs.get("default_ai_provider"),
    }


@api_router.post("/users/me/integrations")
async def connect_integration(
    body: Dict[str, Any],
    user: dict = Depends(get_current_user),
):
    """Connect (or update) a single integration.
    Body: { provider: 'gmail'|'zoom'|..., email?: str, account_label?: str }

    NOTE: This is a metadata-only stub for MVP — full OAuth flows for
    each provider will be wired separately when client credentials are
    supplied.  We persist the user-supplied email/label so the AI brief
    and session-link generators know which account to use.
    """
    provider = (body or {}).get("provider", "").strip().lower()
    if provider not in ALL_INTEGRATION_PROVIDERS:
        raise HTTPException(400, f"unknown provider: {provider}")
    email = (body or {}).get("email") or ""
    label = (body or {}).get("account_label") or email or provider
    rec = {
        "provider": provider,
        "email": email,
        "account_label": label,
        "status": "connected",
        "connected_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {f"integrations.{provider}": rec}}
    )
    try:
        await _audit_log(  # type: ignore
            user_id=str(user["_id"]),
            field_name=f"integrations.{provider}",
            old_value=None, new_value=rec,
            source="integration_connect",
        )
    except Exception:
        pass
    return {"ok": True, "integration": rec}


@api_router.delete("/users/me/integrations/{provider}")
async def disconnect_integration(
    provider: str,
    user: dict = Depends(get_current_user),
):
    p = provider.strip().lower()
    if p not in ALL_INTEGRATION_PROVIDERS:
        raise HTTPException(400, f"unknown provider: {p}")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$unset": {f"integrations.{p}": ""}}
    )
    try:
        await _audit_log(  # type: ignore
            user_id=str(user["_id"]),
            field_name=f"integrations.{p}",
            old_value=user.get("integrations", {}).get(p),
            new_value=None,
            source="integration_disconnect",
        )
    except Exception:
        pass
    return {"ok": True}


@api_router.patch("/users/me/preferences")
async def patch_preferences(
    body: Dict[str, Any],
    user: dict = Depends(get_current_user),
):
    """Update user preferences (default_video_platform, default_ai_provider, etc.)."""
    allowed = {"default_video_platform", "default_ai_provider"}
    payload = {f"preferences.{k}": v for k, v in (body or {}).items() if k in allowed}
    if not payload:
        return {"ok": True, "noop": True}
    await db.users.update_one({"_id": user["_id"]}, {"$set": payload})
    return {"ok": True, "updated": list(payload.keys())}


@api_router.get("/users/me/resume")
async def get_my_resume(user: dict = Depends(get_current_user)):
    """Return resume metadata (not the binary data URL — call /resume/raw for that)."""
    docs = (user.get("resume_documents") or [])
    return {"documents": [{
        "id": d.get("id"), "name": d.get("name"), "size": d.get("size"),
        "uploaded_at": d.get("uploaded_at"), "active": d.get("active", False),
    } for d in docs]}


@api_router.get("/users/me/resume/{doc_id}/raw")
async def download_my_resume(doc_id: str, user: dict = Depends(get_current_user)):
    """Return the data URL of a specific resume document (used by client to trigger download)."""
    docs = (user.get("resume_documents") or [])
    for d in docs:
        if d.get("id") == doc_id:
            return {"id": doc_id, "name": d.get("name"), "data_url": d.get("data_url")}
    raise HTTPException(404, "Document not found")


@api_router.post("/users/me/resume")
async def upload_my_resume(payload: dict, user: dict = Depends(get_current_user)):
    """Upload a resume as base64 data URL.
    Body: { name: str, size: int (bytes), data_url: 'data:application/pdf;base64,...' }
    """
    name = (payload.get("name") or "").strip() or "Resume.pdf"
    size = int(payload.get("size") or 0)
    data_url = payload.get("data_url") or ""
    if not data_url.startswith("data:"):
        raise HTTPException(400, "data_url must be a base64 data URL")
    # Soft size cap: 5 MB
    if size > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 5MB)")
    docs = list(user.get("resume_documents") or [])
    # Mark all existing as inactive
    for d in docs:
        d["active"] = False
    new_doc = {
        "id": str(ObjectId()),
        "name": name,
        "size": size,
        "data_url": data_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    }
    docs.insert(0, new_doc)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"resume_documents": docs, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"id": new_doc["id"], "name": new_doc["name"], "active": True}


@api_router.delete("/users/me/resume/{doc_id}")
async def delete_my_resume(doc_id: str, user: dict = Depends(get_current_user)):
    docs = list(user.get("resume_documents") or [])
    new_docs = [d for d in docs if d.get("id") != doc_id]
    if len(new_docs) == len(docs):
        raise HTTPException(404, "Document not found")
    # Ensure at least one is marked active if any remain
    if new_docs and not any(d.get("active") for d in new_docs):
        new_docs[0]["active"] = True
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"resume_documents": new_docs, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "deleted", "id": doc_id}


@api_router.post("/users/me/resume/{doc_id}/activate")
async def activate_my_resume(doc_id: str, user: dict = Depends(get_current_user)):
    docs = list(user.get("resume_documents") or [])
    found = False
    for d in docs:
        if d.get("id") == doc_id:
            d["active"] = True
            found = True
        else:
            d["active"] = False
    if not found:
        raise HTTPException(404, "Document not found")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"resume_documents": docs, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "activated", "id": doc_id}


@api_router.patch("/users/me/preferences")
async def update_my_preferences(updates: dict, user: dict = Depends(get_current_user)):
    """Merge into user.preferences. Free-form — UI sends partial dicts."""
    current = dict(user.get("preferences") or {})
    for k, v in updates.items():
        if isinstance(v, dict) and isinstance(current.get(k), dict):
            current[k].update(v)
        else:
            current[k] = v
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"preferences": current, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"preferences": current}


@api_router.post("/users/me/password")
async def change_my_password(payload: dict, user: dict = Depends(get_current_user)):
    """Change password. Body: { current_password, new_password }"""
    cur_pw = payload.get("current_password") or ""
    new_pw = payload.get("new_password") or ""
    if len(new_pw) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not bcrypt.checkpw(cur_pw.encode("utf-8"), user.get("password_hash", "").encode("utf-8")):
        raise HTTPException(400, "Current password is incorrect")
    new_hash = bcrypt.hashpw(new_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "ok"}


# ----------------------------------------------------------------------------
# Mentor Approval Endpoints (Admin only)
# ----------------------------------------------------------------------------
@api_router.get("/admin/mentors/pending")
async def list_pending_mentors(user: dict = Depends(get_current_user)):
    """Admin: list mentors awaiting approval."""
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    mentors = await db.users.find(
        {"role": "mentor", "mentor_status": "pending"},
        {"password_hash": 0, "face_image_base64": 0},
    ).to_list(100)
    for m in mentors:
        m["id"] = str(m["_id"])
        m.pop("_id", None)
    return {"mentors": mentors}


@api_router.post("/admin/mentors/{mentor_id}/approve")
async def approve_mentor(mentor_id: str, user: dict = Depends(get_current_user)):
    """Admin: approve a pending mentor — they become visible to students."""
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    res = await db.users.update_one(
        {"_id": ObjectId(mentor_id), "role": "mentor"},
        {"$set": {
            "mentor_status": "approved",
            "approved_at": datetime.now(timezone.utc),
            "approved_by": str(user.get("_id") or user.get("id") or "admin"),
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Mentor not found")
    # Notify the mentor
    try:
        await db.notifications.insert_one({
            "id": str(ObjectId()),
            "user_id": mentor_id,
            "type": "mentor_approved",
            "title": "Application approved \U0001f389",
            "body": "Your mentor application has been approved. You can now host sessions.",
            "read": False,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass
    return {"status": "approved", "id": mentor_id}


@api_router.post("/admin/mentors/{mentor_id}/reject")
async def reject_mentor(
    mentor_id: str, payload: dict | None = None, user: dict = Depends(get_current_user),
):
    """Admin: reject a mentor application with optional reason."""
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    reason = (payload or {}).get("reason") if isinstance(payload, dict) else None
    update = {
        "mentor_status": "rejected",
        "rejected_at": datetime.now(timezone.utc),
        "rejected_by": str(user.get("_id") or user.get("id") or "admin"),
        "rejection_reason": reason or "",
        "updated_at": datetime.now(timezone.utc),
    }
    res = await db.users.update_one(
        {"_id": ObjectId(mentor_id), "role": "mentor"}, {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Mentor not found")
    try:
        await db.notifications.insert_one({
            "id": str(ObjectId()),
            "user_id": mentor_id,
            "type": "mentor_rejected",
            "title": "Application not approved",
            "body": reason or "Your application was not approved at this time.",
            "read": False,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass
    return {"status": "rejected", "id": mentor_id, "reason": reason}


@api_router.get("/admin/mentors/{mentor_id}")
async def admin_mentor_detail(mentor_id: str, user: dict = Depends(get_current_user)):
    """Full mentor detail for review panel."""
    _require_admin(user)
    try:
        m = await db.users.find_one(
            {"_id": ObjectId(mentor_id)},
            {"password_hash": 0, "face_image_base64": 0},
        )
    except Exception:
        m = None
    if not m:
        raise HTTPException(404, "Mentor not found")
    mp = m.get("mentor_profile") or {}
    return {
        "id": str(m["_id"]),
        "name": m.get("full_name") or m.get("email"),
        "email": m.get("email"),
        "phone": m.get("phone"),
        "mentor_status": m.get("mentor_status"),
        "rejection_reason": m.get("rejection_reason"),
        "approved_at": m.get("approved_at"),
        "rejected_at": m.get("rejected_at"),
        "linkedin_url": mp.get("linkedin_url") or m.get("linkedin_url"),
        "job_title": mp.get("job_title"),
        "organization": mp.get("organization"),
        "category": mp.get("category") or m.get("mentor_category"),
        "years_of_experience": mp.get("years_of_experience"),
        "skills": mp.get("skills") or [],
        "bio": mp.get("bio") or m.get("bio"),
        "expertise_areas": mp.get("expertise_areas") or [],
        "expected_rate_inr": mp.get("expected_rate_inr"),
        "languages": mp.get("languages") or [],
        "availability": mp.get("availability"),
        "education": mp.get("education") or [],
        "created_at": (m.get("created_at") or datetime.utcnow()).isoformat()
            if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", "")),
    }


# ----------------------------------------------------------------------------
# Super Admin Dashboard endpoints (Phase 1)
# ----------------------------------------------------------------------------
def _require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")


@api_router.get("/admin/overview")
async def admin_overview(user: dict = Depends(get_current_user)):
    """KPI aggregates + Top Colleges + recent activity for the admin Overview page."""
    _require_admin(user)
    # Headline counts
    students    = await db.users.count_documents({"role": "student"})
    mentors_app = await db.users.count_documents({"role": "mentor", "mentor_status": "approved"})
    mentors_pen = await db.users.count_documents({"role": "mentor", "mentor_status": "pending"})
    alumni      = await db.users.count_documents({"role": "alumni"})
    colleges    = await db.users.count_documents({"role": "college"})
    sessions    = await db.bookings.count_documents({}) if "bookings" in await db.list_collection_names() else 0
    events      = await db.events.count_documents({}) if "events" in await db.list_collection_names() else 0
    # Pending approvals across categories (mentors + maybe colleges later)
    pending     = mentors_pen
    # Revenue (sum) from sample bookings (placeholder until Stripe wires in)
    revenue_inr = 0
    try:
        agg = await db.bookings.aggregate([
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "sum": {"$sum": "$amount"}}},
        ]).to_list(1)
        revenue_inr = (agg[0].get("sum") or 0) if agg else 0
    except Exception:
        pass

    # Top colleges (by student count)
    top_pipeline = [
        {"$match": {"role": "student"}},
        {"$group": {"_id": "$school_info.institution_name",
                     "students": {"$sum": 1}}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"students": -1}},
        {"$limit": 8},
    ]
    top_raw = await db.users.aggregate(top_pipeline).to_list(8)
    top_colleges = [
        {
            "name": r["_id"] or "Unknown",
            "students": r["students"],
            "mentors": 0, "events": 0,
            "placement_rate": None,
            "status": "active",
        }
        for r in top_raw
    ]

    # Recent activity: latest registrations
    recent_users = await db.users.find(
        {}, {"password_hash": 0, "face_image_base64": 0},
    ).sort("created_at", -1).limit(8).to_list(8)
    activity = []
    for u in recent_users:
        activity.append({
            "id": str(u["_id"]),
            "kind": "user_joined",
            "label": f"{u.get('full_name', u.get('email', 'New user'))} joined as {u.get('role', 'user')}",
            "at": (u.get("created_at") or datetime.utcnow()).isoformat() if isinstance(u.get("created_at"), datetime) else str(u.get("created_at", "")),
        })

    # Monthly enrollments (last 6 months bucket)
    six_months: list = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        month = (now.replace(day=1) - timedelta(days=30 * i))
        label = month.strftime("%b")
        # Best-effort: count users created in the month bucket
        start = month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_start = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        cnt = await db.users.count_documents(
            {"created_at": {"$gte": start, "$lt": next_start}}
        )
        six_months.append({"label": label, "value": cnt})

    return {
        "kpis": {
            "students": students,
            "mentors": mentors_app,
            "mentors_pending": mentors_pen,
            "alumni": alumni,
            "colleges": colleges,
            "sessions": sessions,
            "events": events,
            "pending_approvals": pending,
            "revenue_inr": revenue_inr,
        },
        "top_colleges": top_colleges,
        "recent_activity": activity,
        "monthly_enrollments": six_months,
    }


@api_router.get("/admin/approvals")
async def admin_approvals(
    status: str = "pending", user: dict = Depends(get_current_user),
):
    """Lists mentor approval requests grouped by status — pending/approved/rejected."""
    _require_admin(user)
    if status not in ("pending", "approved", "rejected"):
        status = "pending"
    items = await db.users.find(
        {"role": "mentor", "mentor_status": status},
        {"password_hash": 0, "face_image_base64": 0},
    ).sort("created_at", -1).limit(100).to_list(100)
    counts = {
        s: await db.users.count_documents({"role": "mentor", "mentor_status": s})
        for s in ("pending", "approved", "rejected")
    }
    out = []
    for m in items:
        mp = m.get("mentor_profile") or {}
        out.append({
            "id": str(m["_id"]),
            "kind": "mentor",
            "name": m.get("full_name") or m.get("email"),
            "email": m.get("email"),
            "title": mp.get("job_title") or "",
            "organization": mp.get("organization") or "",
            "category": mp.get("category") or m.get("mentor_category"),
            "linkedin_url": mp.get("linkedin_url") or m.get("linkedin_url"),
            "years_of_experience": mp.get("years_of_experience"),
            "submitted_at": (m.get("created_at") or datetime.utcnow()).isoformat()
                if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", "")),
            "priority": "high" if (mp.get("years_of_experience") or 0) >= 10 else "normal",
        })
    return {"items": out, "counts": counts}


# ─── Phase 2 — User listings (Colleges/Students/Mentors/Alumni) ──────────
@api_router.get("/admin/users")
async def admin_users_list(
    role: str = "student",
    q: str = "",
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    """List users by role with optional search query."""
    _require_admin(user)
    if role not in ("student", "mentor", "alumni", "college", "admin"):
        raise HTTPException(400, "Invalid role")
    query: dict = {"role": role}
    if role == "mentor":
        query["mentor_status"] = "approved"
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"full_name": rx}, {"email": rx},
            {"school_info.institution_name": rx},
            {"mentor_profile.organization": rx},
            {"alumni_info.alumni_employer": rx},
        ]
    items = await db.users.find(
        query, {"password_hash": 0, "face_image_base64": 0},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    out = []
    for u in items:
        mp = u.get("mentor_profile") or {}
        si = u.get("school_info") or {}
        ai = u.get("alumni_info") or {}
        cp = u.get("college_profile") or {}
        out.append({
            "id": str(u["_id"]),
            "name": u.get("full_name") or u.get("email"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "role": u.get("role"),
            "career_path": u.get("career_path"),
            "institution": si.get("institution_name") or u.get("full_name"),
            "city": si.get("city") or cp.get("city"),
            "state": si.get("state") or cp.get("state"),
            "stream": si.get("branch_or_stream"),
            "course": si.get("current_course") or si.get("class_or_year"),
            "graduation_year": si.get("graduation_year"),
            "mentor_title": mp.get("job_title"),
            "mentor_org": mp.get("organization"),
            "mentor_category": mp.get("category") or u.get("mentor_category"),
            "mentor_rating": mp.get("rating"),
            "mentor_sessions": mp.get("sessions"),
            "alumni_employer": ai.get("alumni_employer"),
            "alumni_role": ai.get("alumni_role"),
            "alumni_wants_to_mentor": ai.get("alumni_wants_to_mentor"),
            "alumni_count": cp.get("alumni_count"),
            "placement_rate": cp.get("placement_rate"),
            "events_hosted": u.get("events_hosted_year") or 0,
            "email_verified": u.get("email_verified"),
            "two_fa_enabled": u.get("two_fa_enabled"),
            "badges": u.get("badges") or [],
            "created_at": (u.get("created_at") or datetime.utcnow()).isoformat()
                if isinstance(u.get("created_at"), datetime) else str(u.get("created_at", "")),
            "linkedin_url": u.get("linkedin_url") or mp.get("linkedin_url") or ai.get("alumni_linkedin_url"),
        })
    total = await db.users.count_documents(query)
    return {"items": out, "total": total}


# ─── Phase 3 — Events / Payments / Analytics / Settings ─────────────────
@api_router.get("/admin/events")
async def admin_events_list(user: dict = Depends(get_current_user)):
    """Events list (re-uses db.events seed)."""
    _require_admin(user)
    if "events" not in await db.list_collection_names():
        return {"items": []}
    items = await db.events.find({}, {"_id": 0}).limit(100).to_list(100)
    return {"items": items}


@api_router.post("/admin/events")
async def admin_event_create(payload: dict, user: dict = Depends(get_current_user)):
    """Create a new event."""
    _require_admin(user)
    payload["id"] = str(ObjectId())
    payload["created_at"] = datetime.utcnow()
    payload.setdefault("rsvp_count", 0)
    await db.events.insert_one(payload.copy())
    payload.pop("_id", None)
    return payload


@api_router.get("/admin/payments")
async def admin_payments(user: dict = Depends(get_current_user)):
    """Payments stats — mock revenue/payout time series + transactions list."""
    _require_admin(user)
    # Mock 6-month revenue/payouts (placeholder until Stripe wires in)
    months = []
    base = 80000
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        m = (now.replace(day=1) - timedelta(days=30 * i))
        months.append({
            "label": m.strftime("%b"),
            "revenue": base + (5 - i) * 12000 + (i * 3500),
            "payouts": int((base + (5 - i) * 12000) * 0.55),
        })
    transactions = []
    sample_users = await db.users.find(
        {"role": {"$in": ["student", "mentor"]}},
        {"_id": 1, "full_name": 1, "email": 1, "role": 1},
    ).limit(8).to_list(8)
    import random as _rd
    for i, u in enumerate(sample_users):
        amount = _rd.choice([499, 999, 1499, 2499, 4999])
        status = _rd.choice(["completed", "completed", "completed", "pending", "refunded"])
        transactions.append({
            "id": f"TXN-{1000 + i}",
            "user": u.get("full_name") or u.get("email"),
            "kind": "Mentor Session" if u.get("role") == "student" else "Mentor Payout",
            "amount": amount,
            "status": status,
            "date": (now - timedelta(days=i)).isoformat(),
        })
    revenue_total = sum(m["revenue"] for m in months)
    payouts_total = sum(m["payouts"] for m in months)
    return {
        "monthly": months,
        "transactions": transactions,
        "kpis": {
            "revenue_total":  revenue_total,
            "payouts_total":  payouts_total,
            "net":            revenue_total - payouts_total,
            "tx_count":       len(transactions),
        },
    }


@api_router.get("/admin/analytics")
async def admin_analytics(user: dict = Depends(get_current_user)):
    """Aggregated analytics for charts."""
    _require_admin(user)
    # Career path breakdown
    paths = ["job", "higher_education", "startup", "business"]
    cp_breakdown = []
    for p in paths:
        c = await db.users.count_documents({"career_path": p})
        cp_breakdown.append({"label": p.replace("_", " ").title(), "value": c})
    # Stream breakdown (top 6)
    stream_pipeline = [
        {"$match": {"school_info.branch_or_stream": {"$ne": None}}},
        {"$group": {"_id": "$school_info.branch_or_stream", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 6},
    ]
    streams = await db.users.aggregate(stream_pipeline).to_list(6)
    # Mentor categories
    cat_pipeline = [
        {"$match": {"role": "mentor", "mentor_status": "approved"}},
        {"$group": {"_id": "$mentor_profile.category", "count": {"$sum": 1}}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"count": -1}},
    ]
    mentor_cats = await db.users.aggregate(cat_pipeline).to_list(20)
    # Engagement metrics (mock blend for now)
    engagement = {
        "session_completion": 0.78,
        "mentor_response_avg_hr": 6.4,
        "placement_avg":         0.82,
        "active_dau":            148,
        "active_mau":            812,
    }
    return {
        "career_paths":    cp_breakdown,
        "top_streams":     [{"label": s["_id"], "value": s["count"]} for s in streams],
        "mentor_categories": [{"label": (c["_id"] or "").replace("_", " ").title(), "value": c["count"]} for c in mentor_cats],
        "engagement":      engagement,
    }


@api_router.get("/admin/settings/admins")
async def admin_settings_list(user: dict = Depends(get_current_user)):
    """List of admin users."""
    _require_admin(user)
    items = await db.users.find(
        {"role": "admin"}, {"password_hash": 0, "face_image_base64": 0},
    ).to_list(50)
    return {
        "items": [
            {
                "id": str(u["_id"]),
                "name": u.get("full_name") or u.get("email"),
                "email": u.get("email"),
                "role": "Super Admin" if u.get("is_super_admin") else "Admin",
                "two_fa_enabled": u.get("two_fa_enabled"),
                "created_at": (u.get("created_at") or datetime.utcnow()).isoformat()
                    if isinstance(u.get("created_at"), datetime) else str(u.get("created_at", "")),
            }
            for u in items
        ]
    }


# ─── Phase 4 — Master Admin CRUD ────────────────────────────────────────
def _user_oid(user_id: str):
    """Try to parse user_id as ObjectId (24-hex) else return raw string."""
    try:
        return ObjectId(user_id)
    except Exception:
        return user_id


def _user_query(user_id: str) -> dict:
    """Build a $or query that matches either ObjectId._id or string id field."""
    try:
        return {"$or": [{"_id": ObjectId(user_id)}, {"id": user_id}]}
    except Exception:
        return {"id": user_id}


# Editable fields per role — never expose password_hash, role escalation, etc.
_EDITABLE_FIELDS_TOP = {
    "full_name", "email", "phone", "career_path",
    "linkedin_url", "email_verified", "two_fa_enabled",
}
_EDITABLE_NESTED = {
    "school_info": {"institution_name", "city", "state", "branch_or_stream",
                    "current_course", "class_or_year", "graduation_year", "board_or_university"},
    "mentor_profile": {"job_title", "organization", "category", "rating",
                       "sessions", "years_of_experience", "linkedin_url"},
    "alumni_info": {"alumni_employer", "alumni_role", "alumni_wants_to_mentor",
                    "alumni_linkedin_url", "graduation_year", "linkedin_url",
                    "wants_to_mentor", "mentor_category"},
    "college_profile": {"city", "state", "alumni_count", "placement_rate",
                        "established_year", "website"},
}


@api_router.patch("/admin/users/{user_id}")
async def admin_user_update(user_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Update an arbitrary user's profile (admin-only)."""
    _require_admin(user)
    update: dict = {}
    for k, v in (payload or {}).items():
        if k in _EDITABLE_FIELDS_TOP:
            update[k] = v
        elif k in _EDITABLE_NESTED and isinstance(v, dict):
            for sub_k, sub_v in v.items():
                if sub_k in _EDITABLE_NESTED[k]:
                    update[f"{k}.{sub_k}"] = sub_v
    if not update:
        raise HTTPException(400, "No editable fields provided")
    update["updated_at"] = datetime.utcnow()
    res = await db.users.update_one(_user_query(user_id), {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    fresh = await db.users.find_one(
        _user_query(user_id), {"password_hash": 0, "face_image_base64": 0},
    )
    if fresh:
        fresh["id"] = str(fresh.get("_id"))
        fresh.pop("_id", None)
    # Recompute badges (since profile fields changed)
    try:
        await refresh_user_badges(db, fresh.get("id") if fresh else user_id)
    except Exception:
        pass
    return {"ok": True, "user": fresh}


@api_router.delete("/admin/users/{user_id}")
async def admin_user_delete(user_id: str, user: dict = Depends(get_current_user)):
    """Delete a user. Self-delete is blocked."""
    _require_admin(user)
    if str(user.get("_id")) == user_id or user.get("id") == user_id:
        raise HTTPException(400, "Cannot delete yourself")
    res = await db.users.delete_one(_user_query(user_id))
    if res.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"ok": True, "deleted": user_id}


@api_router.post("/admin/users")
async def admin_user_create(payload: dict, user: dict = Depends(get_current_user)):
    """Create a new user (any role). Used by admins to seed colleges/mentors/etc."""
    _require_admin(user)
    email = (payload.get("email") or "").strip().lower()
    full_name = (payload.get("full_name") or "").strip()
    role = (payload.get("role") or "student").strip().lower()
    if not email or not full_name:
        raise HTTPException(400, "email and full_name are required")
    if role not in ("student", "mentor", "alumni", "college", "admin"):
        raise HTTPException(400, "Invalid role")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already in use")
    pwd = payload.get("password") or "TempPass@123"
    doc = {
        "email": email,
        "full_name": full_name,
        "role": role,
        "phone": payload.get("phone"),
        "password_hash": hash_password(pwd),
        "onboarding_completed": True,  # admin-created users skip onboarding
        "email_verified": True,
        "created_at": datetime.utcnow(),
    }
    if role == "college":
        doc["college_profile"] = {
            "city": payload.get("city"),
            "state": payload.get("state"),
            "alumni_count": int(payload.get("alumni_count") or 0),
            "placement_rate": float(payload.get("placement_rate") or 0),
            "website": payload.get("website"),
        }
        doc["school_info"] = {"institution_name": full_name}
    elif role == "mentor":
        doc["mentor_status"] = "approved"
        doc["mentor_profile"] = {
            "job_title": payload.get("job_title"),
            "organization": payload.get("organization"),
            "category": payload.get("category"),
            "years_of_experience": int(payload.get("years_of_experience") or 0),
            "linkedin_url": payload.get("linkedin_url"),
            "sessions": 0,
            "rating": 0,
        }
    res = await db.users.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return {"ok": True, "user": doc, "temp_password": pwd}


@api_router.patch("/admin/events/{event_id}")
async def admin_event_update(event_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Edit an existing event."""
    _require_admin(user)
    allowed = {"title", "description", "date", "location", "capacity", "rsvp_count"}
    update = {k: v for k, v in (payload or {}).items() if k in allowed}
    if not update:
        raise HTTPException(400, "No editable fields")
    update["updated_at"] = datetime.utcnow()
    res = await db.events.update_one({"id": event_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Event not found")
    return {"ok": True, "id": event_id, "updates": update}


@api_router.delete("/admin/events/{event_id}")
async def admin_event_delete(event_id: str, user: dict = Depends(get_current_user)):
    """Delete an event."""
    _require_admin(user)
    res = await db.events.delete_one({"id": event_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    return {"ok": True, "deleted": event_id}




# ----------------------------------------------------------------------------
# AI Endpoints (Claude Sonnet 4.5 via emergentintegrations)
# ----------------------------------------------------------------------------
# Different system prompts per career path — Claude becomes a different specialist.
CAREER_PATH_SYSTEM_PROMPTS = {
    "job": "You are an expert career counselor specializing in employment & job-market readiness. "
           "Your goal is to give a clear, actionable career roadmap focused on landing roles in industry.",
    "higher_education": "You are an academic advisor specializing in higher education paths "
                        "(Masters, PhD, research). Recommend the best academic trajectory, top universities, "
                        "entrance exams, and research areas.",
    "startup": "You are a startup mentor and entrepreneurship coach. Help students prepare to build their "
               "own startup with the right skills, network, MVP strategy, and funding readiness.",
    "business": "You are a business strategy advisor. Guide students toward leadership, MBA prep, "
                "family-business modernization, and corporate / business career trajectories.",
}


async def get_claude_chat(session_id: str, system_message: str):
    """Lazy-import emergentintegrations and return a Claude chat instance."""
    from emergentintegrations.llm.chat import LlmChat
    return LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=session_id,
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")


@api_router.post("/ai/career-suggestions")
async def get_career_suggestions(req: CareerSuggestionRequest, user: dict = Depends(get_current_user)):
    """Generate AI-powered career roadmap based on user's profile + chosen path.
    Returns structured JSON: summary + milestones + skills + courses + mentor_traits."""
    if not user.get("onboarding_completed"):
        raise HTTPException(400, "Please complete onboarding first")
    career_path = user.get("career_path")
    if not career_path:
        raise HTTPException(400, "Career path not selected")

    system_msg = CAREER_PATH_SYSTEM_PROMPTS.get(career_path, CAREER_PATH_SYSTEM_PROMPTS["job"])
    session_id = f"career-{user['_id']}"

    school = user.get("school_info") or {}
    student = user.get("student_info") or {}
    edu_level = student.get("education_level", school.get("class_or_year", ""))

    profile = (
        f"User: {user.get('full_name')}\n"
        f"Role: {user.get('role')}\n"
        f"Career Path: {career_path}\n"
        f"Education Level: {edu_level}\n"
        f"Institution: {school.get('institution_name')}\n"
        f"Branch: {school.get('branch_or_stream')}\n"
        f"Interests: {', '.join(user.get('interests', []))}\n"
        f"Skills: {', '.join(user.get('skills', []))}\n"
    )

    prompt = (
        f"Profile:\n{profile}\n"
        f"Additional context: {req.additional_context or 'None'}\n\n"
        "Provide a personalized career roadmap as JSON ONLY (no markdown, no extra text):\n"
        "{\n"
        '  "summary": "1-2 sentence overview",\n'
        '  "milestones": [\n'
        '    {"title": "...", "timeframe": "0-3 months", "actions": ["...", "..."]},\n'
        '    {"title": "...", "timeframe": "3-12 months", "actions": ["..."]},\n'
        '    {"title": "...", "timeframe": "1-3 years", "actions": ["..."]}\n'
        '  ],\n'
        '  "recommended_skills": ["s1", "s2", "s3", "s4", "s5"],\n'
        '  "recommended_courses": ["c1", "c2", "c3"],\n'
        '  "mentor_traits": ["t1", "t2", "t3"]\n'
        "}"
    )

    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = await get_claude_chat(session_id, system_msg)
        response = await chat.send_message(UserMessage(text=prompt))

        # Strip code-fence wrappers if Claude added them
        import json
        text = response.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        try:
            data = json.loads(text)
        except Exception:
            # Fallback if Claude returns prose
            data = {"summary": response, "milestones": [], "recommended_skills": [],
                    "recommended_courses": [], "mentor_traits": []}

        # Cache the suggestion so the user doesn't pay for re-generation
        await db.career_suggestions.update_one(
            {"user_id": str(user["_id"])},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc), "career_path": career_path}},
            upsert=True,
        )
        return data
    except Exception as e:
        logger.error(f"Career AI failed: {e}")
        raise HTTPException(500, f"AI service error: {str(e)}")


@api_router.get("/ai/career-suggestions/cached")
async def get_cached_suggestions(user: dict = Depends(get_current_user)):
    """Return cached AI roadmap (avoid re-paying for the same query)."""
    return await db.career_suggestions.find_one({"user_id": str(user["_id"])}, {"_id": 0}) or {}


# ────────────────────────────────────────────────────────────────────────────
# Career Roadmap (12-week, richer schema for the /career-ai page)
# ────────────────────────────────────────────────────────────────────────────
@api_router.post("/ai/career-roadmap")
async def ai_career_roadmap(
    body: Dict[str, Any] = None,
    user: dict = Depends(get_current_user),
):
    """Generate (or return cached) a personalised 12-week career roadmap.

    Body: { force?: bool }
    Output:
      {
        target_role: str,
        target_company_type: str,
        progress_pct: int,
        skill_scores: { communication: pct, soft_skills: pct, technical: pct,
                         interview_prep: pct, networking: pct, leadership: pct },
        weekly_plan: [ { weeks: "1-2", title: str, tasks: [str, ...] }, ... ],   // 5 cards
        suggestion: str          // 1-line headline tip
      }
    Cached per user; pass `{force:true}` to regenerate.
    """
    body = body or {}
    force = bool(body.get("force"))
    cache_key = {"user_id": str(user["_id"])}

    if not force:
        existing = await db.career_roadmaps.find_one(cache_key)
        if existing and existing.get("weekly_plan"):
            existing["milestones_completed"] = existing.get("milestones_completed") or []
            return {k: v for k, v in existing.items() if k != "_id"}

    # Build profile context
    full_name = user.get("full_name") or "Student"
    interests = ", ".join((user.get("interests") or [])[:8]) or "general tech"
    skills = ", ".join((user.get("skills") or [])[:10]) or "core CS"
    institution = user.get("institution") or (user.get("school_info") or {}).get("institution_name") or ""
    branch = user.get("branch") or (user.get("school_info") or {}).get("branch_or_stream") or ""
    grad_year = user.get("graduation_year") or ""
    cgpa = user.get("cgpa") or ""
    si = user.get("student_info") or {}
    goal = si.get("career_goal") or "Software Engineer at a top tech company"

    sys_msg = (
        "You are a career strategist for the Student Alumni platform. "
        "Generate a concrete 12-week career roadmap as STRICT JSON only — no markdown, no prose. "
        "All weekly tasks must be specific and actionable (8-14 words each)."
    )
    schema_prompt = (
        "Return JSON with EXACTLY this shape:\n"
        "{\n"
        '  "target_role": "Specific role title",\n'
        '  "target_company_type": "Specific company tier description",\n'
        '  "progress_pct": <int 0-100>,\n'
        '  "skill_scores": {"communication": <int>, "soft_skills": <int>, "technical": <int>, "interview_prep": <int>, "networking": <int>, "leadership": <int>},\n'
        '  "weekly_plan": [\n'
        '    {"weeks":"1-2","title":"Foundation Assessment","tasks":["...","...","...","..."]},\n'
        '    {"weeks":"3-4","title":"Profile Building","tasks":["...","...","...","..."]},\n'
        '    {"weeks":"5-6","title":"Skill Development","tasks":["...","...","...","..."]},\n'
        '    {"weeks":"7-8","title":"Network & Apply","tasks":["...","...","...","..."]},\n'
        '    {"weeks":"9-10","title":"Interview Ready","tasks":["...","...","...","..."]}\n'
        '  ],\n'
        '  "suggestion": "1-line motivational headline (under 18 words)"\n'
        "}\n"
    )
    prompt = (
        f"Student: {full_name}\nInstitution: {institution} ({branch}, class of {grad_year}, CGPA {cgpa})\n"
        f"Interests: {interests}\nKey skills: {skills}\nGoal: {goal}\n\n{schema_prompt}"
    )

    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = await get_claude_chat(f"roadmap-{user['_id']}", sys_msg)
        raw = await chat.send_message(UserMessage(text=prompt))
        import json
        text = (raw or "").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"): text = text[4:]
            text = text.strip()
        data = json.loads(text)
    except Exception as e:
        logger.error(f"career-roadmap AI failed: {e}")
        # Reasonable fallback so UI never blanks
        data = {
            "target_role": "Software Engineer",
            "target_company_type": "Top Tech Company",
            "progress_pct": 42,
            "skill_scores": {"communication": 40, "soft_skills": 45, "technical": 70, "interview_prep": 35, "networking": 30, "leadership": 35},
            "weekly_plan": [
                {"weeks": "1-2", "title": "Foundation Assessment",
                 "tasks": ["Complete profile strength scan", "Take AI skill diagnostic across domains",
                           "Set career goal/OKR with mentor", "Upload resume for AI review"]},
                {"weeks": "3-4", "title": "Profile Building",
                 "tasks": ["Enhance resume with AI suggestions", "Add 3 projects to portfolio",
                           "Request LinkedIn endorsements", "Get certifications (NPTEL/Coursera)"]},
                {"weeks": "5-6", "title": "Skill Development",
                 "tasks": ["Complete Communication module", "Practice 5 mock interviews with AI",
                           "Improve System Design score by 20%", "Start DSA practice (3 problems/day)"]},
                {"weeks": "7-8", "title": "Network & Apply",
                 "tasks": ["Connect with 12 alumni in target domain", "Apply to 5 internship positions",
                           "Attend 1 industry event", "Book 2 mentor sessions"]},
                {"weeks": "9-10", "title": "Interview Ready",
                 "tasks": ["Complete mock interview modules", "Negotiate offer with AI salary coach",
                           "Get 3 referrals from network", "Final profile polish + go live"]},
            ],
            "suggestion": "Your trajectory is solid — focus this week on shipping one polished portfolio piece.",
        }

    # Persist
    payload = {**data, "user_id": str(user["_id"]),
               "generated_at": datetime.now(timezone.utc).isoformat()}
    # Preserve previously-completed milestones across regenerations
    existing_for_save = await db.career_roadmaps.find_one(cache_key) or {}
    payload["milestones_completed"] = existing_for_save.get("milestones_completed") or []
    await db.career_roadmaps.update_one(cache_key, {"$set": payload}, upsert=True)
    return {k: v for k, v in payload.items() if k not in ("_id",)}


# ────────────────────────────────────────────────────────────────────────────
# Milestone completion — marks a week's plan complete, awards new badges,
# and (when all 5 are done) auto-suggests the next 12-week phase.
# ────────────────────────────────────────────────────────────────────────────
@api_router.post("/ai/career-roadmap/milestone/{week_idx}/complete")
async def complete_roadmap_milestone(
    week_idx: int,
    body: Dict[str, Any] = None,
    user: dict = Depends(get_current_user),
):
    """Mark week_idx (0..N-1) of the current roadmap as completed.

    Returns:
      {
        milestones_completed: [int],
        new_badges: [badge],          # newly unlocked since last call
        all_badges: [badge],          # full sorted list for the user
        next_milestone: {weeks,title,tasks} | None,
        next_phase_unlocked: bool      # true when all 5 done, hint to call POST /ai/career-roadmap {force:true,extend:true}
      }
    """
    cache_key = {"user_id": str(user["_id"])}
    rm = await db.career_roadmaps.find_one(cache_key)
    if not rm or not rm.get("weekly_plan"):
        raise HTTPException(404, "Roadmap not found — generate one first.")

    plan = rm.get("weekly_plan") or []
    if week_idx < 0 or week_idx >= len(plan):
        raise HTTPException(400, "Invalid week_idx")

    completed = list(rm.get("milestones_completed") or [])
    undo = bool((body or {}).get("undo"))
    if undo:
        completed = [w for w in completed if w != week_idx]
    else:
        if week_idx not in completed:
            completed.append(week_idx)
    completed = sorted(set(int(x) for x in completed))

    await db.career_roadmaps.update_one(
        cache_key,
        {"$set": {"milestones_completed": completed,
                  "milestones_updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    # Capture old badge ids → tier so we can return only NEW unlocks.
    old_badges = list(user.get("badges") or [])
    old_keys = {f"{b.get('id')}:{b.get('tier')}" for b in old_badges}

    # Recompute & persist badges (uses updated career_roadmaps doc above)
    try:
        from badges import compute_badges
        # Re-fetch user from DB so compute_badges reads latest data
        u_full = await db.users.find_one({"_id": user["_id"]}) or user
        all_badges = await compute_badges(db, u_full)
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"badges": all_badges,
                      "badges_updated_at": datetime.now(timezone.utc)}},
        )
    except Exception as _e:
        logger.error(f"badge recompute failed: {_e}")
        all_badges = old_badges

    new_keys = [f"{b.get('id')}:{b.get('tier')}" for b in all_badges]
    new_badges = [b for b in all_badges if f"{b.get('id')}:{b.get('tier')}" not in old_keys]

    # Next milestone suggestion = first uncompleted week after week_idx, falling
    # back to the earliest uncompleted week if user just toggled an earlier one.
    pending = [i for i, _w in enumerate(plan) if i not in completed]
    next_idx = next((i for i in pending if i > week_idx), pending[0] if pending else None)
    next_milestone = plan[next_idx] if next_idx is not None else None

    return {
        "milestones_completed": completed,
        "total_milestones": len(plan),
        "new_badges": new_badges,
        "all_badges": all_badges,
        "next_milestone": next_milestone,
        "next_milestone_index": next_idx,
        "next_phase_unlocked": len(completed) >= len(plan),
    }


@api_router.post("/ai/daily-brief")
async def ai_daily_brief(
    body: Dict[str, Any] = None,
    user: dict = Depends(get_current_user),
):
    """
    Generate (or return cached) a personalized AI daily brief for the user.

    Caches per (user_id + UTC-date) so it's computed at most once a day.
    Pass `{"force": true}` in the body to regenerate.

    Output: { brief: str, generated_at: iso, cached: bool }
    """
    body = body or {}
    force = bool(body.get("force"))

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = {"user_id": str(user["_id"]), "date": today}

    if not force:
        existing = await db.daily_briefs.find_one(cache_key)
        if existing and existing.get("brief"):
            return {
                "brief": existing["brief"],
                "generated_at": existing.get("generated_at"),
                "cached": True,
            }

    # Build profile context
    full_name = user.get("full_name") or "there"
    role = user.get("role") or "student"
    interests = ", ".join((user.get("interests") or [])[:6]) or "general tech"
    skills = ", ".join((user.get("skills") or [])[:6]) or "core CS"
    institution = user.get("institution") or (user.get("school_info") or {}).get("institution_name") or ""
    branch = user.get("branch") or (user.get("school_info") or {}).get("branch_or_stream") or ""
    grad_year = user.get("graduation_year") or ""
    si = user.get("student_info") or {}
    goal = si.get("career_goal") or "Software Engineer at a top tech company"

    # Connected tools — feeds AI context so the brief can reference them.
    integrations = user.get("integrations") or {}
    tools_summary = ", ".join(integrations.keys()) if integrations else "none yet"
    pref_ai = ((user.get("preferences") or {}).get("default_ai_provider")) or ""

    system_msg = (
        "You are an upbeat AI career coach for the Student Alumni platform. "
        "Write a 2-3 sentence personalised morning brief tailored to the user. "
        "Keep it warm, action-oriented, and end with a single concrete suggestion. "
        "If the user has connected useful tools, gently weave one of them into the suggestion. "
        "Plain text only — no markdown, no lists, no emojis."
    )
    prompt = (
        f"User: {full_name}\nRole: {role}\nInstitution: {institution} ({branch}, class of {grad_year})\n"
        f"Interests: {interests}\nKey skills: {skills}\nGoal: {goal}\n"
        f"Connected tools: {tools_summary}\nPreferred AI: {pref_ai or 'auto'}\n\n"
        "Write today's morning brief now."
    )

    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = await get_claude_chat(f"daily-{user['_id']}-{today}", system_msg)
        brief_text = await chat.send_message(UserMessage(text=prompt))
        brief_text = (brief_text or "").strip().strip('"').strip()
        if not brief_text:
            raise ValueError("empty response")
    except Exception as e:
        logger.error(f"daily-brief AI failed: {e}")
        brief_text = (
            f"Good morning, {full_name.split(' ')[0]}! Today's a great day to push forward on your "
            f"{interests.split(',')[0].strip()} goals. Try one focused 25-minute deep-work session before lunch."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    # Resolve a friendly label for the AI provider that produced this brief.
    PROVIDER_LABELS = {
        "openai_chatgpt": "ChatGPT",
        "anthropic_claude": "Claude",
        "google_gemini": "Gemini",
    }
    # Internal default when user hasn't picked one
    used_provider = pref_ai if pref_ai in PROVIDER_LABELS else "anthropic_claude"
    provider_label = PROVIDER_LABELS.get(used_provider, "Claude")
    await db.daily_briefs.update_one(
        cache_key,
        {"$set": {**cache_key, "brief": brief_text, "generated_at": now_iso,
                  "provider": used_provider, "provider_label": provider_label}},
        upsert=True,
    )
    return {"brief": brief_text, "generated_at": now_iso, "cached": False,
            "provider": used_provider, "provider_label": provider_label}


@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    career_path = user.get("career_path") or "job"
    base = CAREER_PATH_SYSTEM_PROMPTS.get(career_path, CAREER_PATH_SYSTEM_PROMPTS["job"])
    system_msg = (
        f"{base}\n\nYou are speaking with {user.get('full_name')}, a {user.get('role')}. "
        "Keep replies concise (2-4 short paragraphs), friendly, and actionable."
    )
    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = await get_claude_chat(session_id, system_msg)
        reply = await chat.send_message(UserMessage(text=req.message))

        # Persist chat history (used to render conversation on reload)
        await db.chat_messages.insert_many([
            {"user_id": str(user["_id"]), "session_id": session_id, "role": "user",
             "content": req.message, "created_at": datetime.now(timezone.utc)},
            {"user_id": str(user["_id"]), "session_id": session_id, "role": "assistant",
             "content": reply, "created_at": datetime.now(timezone.utc)},
        ])
        return ChatResponse(session_id=session_id, message=reply)
    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        raise HTTPException(500, f"AI service error: {str(e)}")


@api_router.get("/ai/chat/history")
async def chat_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": str(user["_id"])}
    if session_id:
        query["session_id"] = session_id
    msgs = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(200)
    for m in msgs:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return {"messages": msgs}


# ----------------------------------------------------------------------------
# Catalog Endpoints (8 dashboard modules)
# ----------------------------------------------------------------------------
@api_router.get("/catalog/courses")
async def list_courses(career_path: Optional[str] = None, limit: int = 20):
    """Module 3: Courses (MIT, Harvard, K12, Coursera, etc.)"""
    query = {"career_paths": career_path} if career_path else {}
    items = await db.courses.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"courses": items}


@api_router.get("/catalog/mentors")
async def list_mentors(career_path: Optional[str] = None, limit: int = 20):
    """Mentor discovery — only APPROVED mentors are visible to students."""
    user_q = {"role": "mentor", "mentor_status": "approved"}
    sample_q: dict = {}
    if career_path:
        user_q["mentor_info.category"] = _path_to_mentor_cat(career_path)
        sample_q["expertise"] = career_path
    real = await db.users.find(user_q, {"password_hash": 0, "face_image_base64": 0}).limit(limit).to_list(limit)
    for m in real:
        m["id"] = str(m["_id"])
        m.pop("_id", None)
    sample = await db.sample_mentors.find(sample_q, {"_id": 0}).limit(limit).to_list(limit)
    return {"mentors": real + sample}


def _path_to_mentor_cat(path: str) -> str:
    """Map career_path → mentor category for matching logic.
    Per spec: 4 distinct categories — startup and business are now separate."""
    return {
        "job": "it_software",
        "higher_education": "higher_education",
        "startup": "startup",
        "business": "business",
    }.get(path, "it_software")


@api_router.get("/catalog/internships")
async def list_internships(career_path: Optional[str] = None, limit: int = 20):
    """Module 1: Career Guidelines — internships."""
    query = {"career_paths": career_path} if career_path else {}
    items = await db.internships.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"internships": items}


# ─── Opportunities (Phase 3) — unified Jobs + Internships flow ─────────
def _match_score(opp: dict, user: dict) -> int:
    """0-100 match score from user interests + career_path vs opp.match_signals."""
    if not opp:
        return 0
    sig = [s.lower() for s in (opp.get("match_signals") or [])]
    sig += [s.lower() for s in (opp.get("skills") or [])]
    sig += [(opp.get("domain") or "").lower()]
    sig = [s for s in sig if s]
    user_signals = []
    cp = (user.get("career_path") or "").lower()
    if cp:
        user_signals.append(cp)
        # career_path keys → human-readable mapping
        if cp == "job":               user_signals.append("software engineering")
        if cp == "higher_education":  user_signals.append("research")
        if cp == "startup":           user_signals.append("startup")
        if cp == "business":          user_signals.append("business")
    interests = user.get("interests") or (user.get("school_info") or {}).get("interests") or []
    user_signals += [str(i).lower() for i in interests]
    si = (user.get("school_info") or {})
    branch = (si.get("branch_or_stream") or "").lower()
    if branch:
        user_signals.append(branch)
        if "cse" in branch or "computer" in branch:
            user_signals.append("software engineering")
            user_signals.append("engineering")
    if not user_signals:
        return 50  # neutral score for new users
    # Count overlapping signals
    matches = sum(1 for s in sig if any(u in s or s in u for u in user_signals))
    score = min(100, int(40 + matches * 18))
    # Boost for matching career path explicitly
    if cp and cp in (opp.get("career_paths") or []):
        score = min(100, score + 12)
    return score


@api_router.get("/opportunities")
async def list_opportunities(
    type: Optional[str] = None,        # internship / job / null=both
    domain: Optional[str] = None,
    mode: Optional[str] = None,        # remote / hybrid / onsite
    q: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    """List opportunities with optional filters and per-item match score."""
    query: dict = {}
    if type and type in ("internship", "job"):
        query["type"] = type
    if domain:
        query["domain"] = domain
    if mode:
        query["mode"] = mode
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"title": rx}, {"company": rx}, {"skills": rx}, {"description": rx}, {"domain": rx}]
    items = await db.internships.find(query, {"_id": 0}).limit(limit).to_list(limit)
    saved = set(user.get("saved_opportunities") or [])
    applied = set(user.get("applied_opportunities") or [])
    out = []
    for it in items:
        it["match_score"] = _match_score(it, user)
        it["saved"] = it.get("id") in saved
        it["applied"] = it.get("id") in applied
        out.append(it)
    out.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    # Distinct domains for filter chips
    domains = sorted({i.get("domain") for i in items if i.get("domain")})
    return {"items": out, "total": len(out), "domains": list(domains)}


@api_router.get("/opportunities/me/saved")
async def my_saved_opportunities(user: dict = Depends(get_current_user)):
    ids = user.get("saved_opportunities") or []
    if not ids:
        return {"items": []}
    items = await db.internships.find({"id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))
    applied = set(user.get("applied_opportunities") or [])
    for it in items:
        it["match_score"] = _match_score(it, user)
        it["saved"] = True
        it["applied"] = it.get("id") in applied
    return {"items": items}


@api_router.get("/opportunities/me/applied")
async def my_applied_opportunities(user: dict = Depends(get_current_user)):
    apps = await db.opportunity_applications.find(
        {"user_id": str(user.get("_id") or user.get("id"))},
        {"_id": 0},
    ).sort("applied_at", -1).to_list(200)
    if not apps:
        return {"items": []}
    ids = [a["opportunity_id"] for a in apps]
    items = await db.internships.find({"id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))
    by_id = {i["id"]: i for i in items}
    saved = set(user.get("saved_opportunities") or [])
    out = []
    for a in apps:
        it = by_id.get(a["opportunity_id"])
        if not it:
            continue
        it = dict(it)
        it["match_score"] = _match_score(it, user)
        it["applied"] = True
        it["applied_at"] = a.get("applied_at")
        it["saved"] = it.get("id") in saved
        out.append(it)
    return {"items": out}


@api_router.post("/opportunities/{opp_id}/save")
async def toggle_save_opportunity(opp_id: str, user: dict = Depends(get_current_user)):
    """Toggle save state for the current user."""
    opp = await db.internships.find_one({"id": opp_id}, {"_id": 0, "id": 1})
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    saved = list(user.get("saved_opportunities") or [])
    if opp_id in saved:
        saved.remove(opp_id)
        action = "removed"
    else:
        saved.append(opp_id)
        action = "saved"
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"saved_opportunities": saved, "updated_at": datetime.utcnow()}},
    )
    return {"action": action, "saved_count": len(saved)}


@api_router.post("/opportunities/{opp_id}/apply")
async def apply_opportunity(opp_id: str, user: dict = Depends(get_current_user)):
    """Mark an opportunity as applied (idempotent)."""
    opp = await db.internships.find_one({"id": opp_id}, {"_id": 0})
    if not opp:
        raise HTTPException(404, "Opportunity not found")
    user_id = str(user.get("_id") or user.get("id"))
    existing = await db.opportunity_applications.find_one(
        {"user_id": user_id, "opportunity_id": opp_id},
    )
    if existing:
        return {"action": "already_applied", "url": opp.get("url")}
    await db.opportunity_applications.insert_one({
        "user_id": user_id,
        "opportunity_id": opp_id,
        "applied_at": datetime.utcnow(),
        "status": "applied",
    })
    applied = list(user.get("applied_opportunities") or [])
    if opp_id not in applied:
        applied.append(opp_id)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"applied_opportunities": applied, "updated_at": datetime.utcnow()}},
        upsert=False,
    )
    # Increment applicants_count on the opportunity
    await db.internships.update_one({"id": opp_id}, {"$inc": {"applicants_count": 1}})
    return {"action": "applied", "url": opp.get("url"), "applied_at": datetime.utcnow().isoformat()}


# ─── Phase 2 — Network ──────────────────────────────────────────────────
def _user_card(u: dict) -> dict:
    """Public card payload for a user — safe for network discovery."""
    si = u.get("school_info") or {}
    mp = u.get("mentor_profile") or {}
    ai = u.get("alumni_info") or {}
    raw_badges = u.get("badges") or []
    tier_rank = {"special": 4, "high": 3, "verified": 2, "moderate": 1, "low": 0}
    sorted_badges = sorted(raw_badges, key=lambda b: -tier_rank.get(b.get("tier"), 0))
    top_badges = [
        {"id": b.get("id"), "label": b.get("label"), "tier": b.get("tier"),
         "icon": b.get("icon"), "kind": b.get("kind"), "category": b.get("category")}
        for b in sorted_badges[:3]
    ]
    # Primary skill = first interest (highlighted in green) — rest stay grey
    interests = list(u.get("interests") or si.get("interests") or [])[:6]
    skills = list((mp.get("skills") or []))[:6]
    primary_skill = (interests[0] if interests else (skills[0] if skills else None))
    # Online: based on last_login within 5 minutes (or random for seed users)
    last = u.get("last_active") or u.get("last_login")
    is_online = False
    if last:
        try:
            delta = (datetime.utcnow() - last).total_seconds() if isinstance(last, datetime) else 9999
            is_online = delta < 5 * 60
        except Exception:
            pass
    # For seed users, fake-online based on user-id hash for visual variety
    if not is_online:
        uid = str(u.get("_id") or u.get("id") or "")
        is_online = (sum(ord(c) for c in uid) % 3) != 0

    return {
        "id": str(u.get("_id") or u.get("id")),
        "full_name": u.get("full_name") or u.get("email"),
        "role": u.get("role"),
        "institution": si.get("institution_name") or ai.get("institution_name") or u.get("full_name") if u.get("role") == "college" else si.get("institution_name") or ai.get("institution_name"),
        "city": si.get("city") or ai.get("city"),
        "state": si.get("state") or ai.get("state"),
        "branch": si.get("branch_or_stream") or ai.get("branch_or_stream"),
        "year": si.get("class_or_year") or si.get("graduation_year"),
        "graduation_year": si.get("graduation_year") or ai.get("graduation_year"),
        "career_path": u.get("career_path"),
        "interests": interests,
        "skills": skills,
        "primary_skill": primary_skill,
        "job_title": mp.get("job_title") or ai.get("alumni_role"),
        "organization": mp.get("organization") or ai.get("alumni_employer"),
        "category": mp.get("category"),
        "rating": mp.get("rating"),
        "sessions": mp.get("sessions"),
        "expected_rate_inr": mp.get("expected_rate_inr"),
        "linkedin_url": u.get("linkedin_url") or mp.get("linkedin_url") or ai.get("alumni_linkedin_url"),
        "github_url": mp.get("github_url") or u.get("github_url"),
        "photo_data": u.get("face_image_base64"),
        "wants_to_mentor": ai.get("wants_to_mentor") or ai.get("alumni_wants_to_mentor") or u.get("role") == "mentor",
        "is_online": is_online,
        "mutual_connections": _fake_mutual(u),  # deterministic placeholder
        "sa_id": u.get("sa_id"),
        "badges": top_badges,
        "badges_total": len(raw_badges),
    }


def _fake_mutual(u: dict) -> int:
    """Deterministic placeholder mutual-connections count until real graph is built."""
    uid = str(u.get("_id") or u.get("id") or "")
    return (sum(ord(c) for c in uid) % 22) + 1


def _matches_count(a: list, b: list) -> int:
    if not a or not b:
        return 0
    sa = {str(x).lower() for x in a}
    sb = {str(x).lower() for x in b}
    return len(sa & sb)


@api_router.get("/network/discover")
async def network_discover(user: dict = Depends(get_current_user), q: str = "", limit: int = 12):
    """
    Discover sections (each up to `limit` matches):
      • by_interest   — users with overlapping interests
      • by_career     — users with same career_path
      • by_college    — users from same institution
      • mentors       — recommended mentors (role=mentor, status=approved)
      • expand        — diverse roles outside user's bubble
    """
    me_id = str(user.get("_id") or user.get("id"))
    si = user.get("school_info") or {}
    my_interests = user.get("interests") or si.get("interests") or []
    my_skills = user.get("skills") or []
    my_cp = user.get("career_path")
    my_inst = si.get("institution_name")
    # Existing connection state to mark cards
    rels = await db.connections.find(
        {"$or": [{"a": me_id}, {"b": me_id}]},
        {"_id": 0},
    ).to_list(2000)
    state_by_user: Dict[str, str] = {}
    for r in rels:
        other = r["b"] if r["a"] == me_id else r["a"]
        state_by_user[other] = r.get("status", "pending")

    # Pull a healthy candidate set
    base_query: dict = {"_id": {"$ne": user["_id"]}}
    if q:
        rx = {"$regex": q, "$options": "i"}
        base_query["$or"] = [{"full_name": rx}, {"email": rx}]
    candidates = await db.users.find(base_query, {"password_hash": 0, "face_image_base64": 0}).to_list(500)

    cards = [_user_card(c) for c in candidates]
    # attach connection_state (none|pending|connected|incoming)
    for c in cards:
        st = state_by_user.get(c["id"])
        c["connection_state"] = st or "none"

    # Section: by_interest
    by_interest = [c for c in cards if _matches_count(my_interests, c["interests"]) > 0]
    by_interest.sort(key=lambda c: -_matches_count(my_interests, c["interests"]))

    # Section: by_career
    by_career = [c for c in cards if my_cp and c.get("career_path") == my_cp and c["role"] != "college"]

    # Section: by_skills (NEW)
    by_skills = [c for c in cards if _matches_count(my_skills, c.get("skills") or []) > 0]
    by_skills.sort(key=lambda c: -_matches_count(my_skills, c.get("skills") or []))

    # Section: by_college
    by_college = [c for c in cards if my_inst and c.get("institution") == my_inst]

    # Section: mentors (approved)
    approved_mentors = await db.users.find(
        {"_id": {"$ne": user["_id"]}, "role": "mentor", "mentor_status": "approved"},
        {"password_hash": 0, "face_image_base64": 0},
    ).limit(50).to_list(50)
    mentor_cards = [_user_card(m) for m in approved_mentors]
    for m in mentor_cards:
        m["connection_state"] = state_by_user.get(m["id"], "none")
    # Boost mentors matching career path
    if my_cp:
        mentor_cards.sort(key=lambda m: (m.get("category") or "").lower().find(my_cp.lower()) == -1)

    # Section: expand — diverse roles user hasn't matched on yet
    seen_ids = {c["id"] for c in (by_interest + by_career + by_skills + by_college)} | {m["id"] for m in mentor_cards}
    expand = [c for c in cards if c["id"] not in seen_ids and c["role"] in {"alumni", "college"}]

    interest_label = ", ".join(my_interests[:2]) if my_interests else "Your declared interests"
    skill_label    = ", ".join(my_skills[:3])     if my_skills    else "your declared skills"
    cp_label = (my_cp or "your goal").replace("_", " ").title() if my_cp else "Your career goal"

    return {
        "sections": [
            {"key": "by_interest", "title": "Matched by Interest",
             "subtitle": f"Based on: {interest_label}",
             "icon": "Heart", "tint": "#A78BFA",
             "items": by_interest[:limit]},
            {"key": "by_career", "title": "Matched by Career Path",
             "subtitle": f"Pursuing {cp_label}",
             "icon": "Briefcase", "tint": "#F59E0B",
             "items": by_career[:limit]},
            {"key": "by_skills", "title": "Matched by Skills",
             "subtitle": f"Shared skills: {skill_label}",
             "icon": "Code2", "tint": "#2DD4BF",
             "items": by_skills[:limit]},
            {"key": "by_college", "title": "From Your College",
             "subtitle": "People from " + (my_inst or "your school"),
             "icon": "GraduationCap", "tint": "#22D3EE",
             "items": by_college[:limit]},
            {"key": "mentors", "title": "Recommended Mentors",
             "subtitle": "Book a session \u00b7 First 2 free",
             "icon": "UserCheck", "tint": "#10B981",
             "items": mentor_cards[:limit]},
            {"key": "expand", "title": "Expand Your Horizons",
             "subtitle": "People outside your current interests",
             "icon": "Compass", "tint": "#EC4899",
             "items": expand[:limit]},
        ],
    }


@api_router.get("/network/connections")
async def my_connections(user: dict = Depends(get_current_user)):
    me_id = str(user.get("_id") or user.get("id"))
    rels = await db.connections.find(
        {"status": "accepted", "$or": [{"a": me_id}, {"b": me_id}]},
        {"_id": 0},
    ).to_list(500)
    other_ids = []
    for r in rels:
        other_ids.append(r["b"] if r["a"] == me_id else r["a"])
    if not other_ids:
        return {"items": []}
    objs = []
    for oid in other_ids:
        try:
            objs.append(ObjectId(oid))
        except Exception:
            pass
    users = await db.users.find(
        {"_id": {"$in": objs}}, {"password_hash": 0, "face_image_base64": 0},
    ).to_list(len(objs))
    cards = [_user_card(u) for u in users]
    for c in cards:
        c["connection_state"] = "connected"
    return {"items": cards}


@api_router.get("/network/requests")
async def my_connection_requests(user: dict = Depends(get_current_user)):
    """Incoming pending requests (people who want to connect with me)."""
    me_id = str(user.get("_id") or user.get("id"))
    rels = await db.connections.find(
        {"status": "pending", "b": me_id}, {"_id": 0},
    ).to_list(200)
    if not rels:
        return {"items": []}
    requester_ids = [r["a"] for r in rels]
    objs = []
    for rid in requester_ids:
        try:
            objs.append(ObjectId(rid))
        except Exception:
            pass
    users = await db.users.find({"_id": {"$in": objs}}, {"password_hash": 0, "face_image_base64": 0}).to_list(len(objs))
    by_id = {str(u["_id"]): u for u in users}
    out = []
    for r in rels:
        u = by_id.get(r["a"])
        if not u:
            continue
        c = _user_card(u)
        c["connection_state"] = "incoming"
        c["requested_at"] = r.get("created_at")
        out.append(c)
    return {"items": out}


@api_router.post("/network/connect/{other_id}")
async def send_connection_request(other_id: str, user: dict = Depends(get_current_user)):
    me_id = str(user.get("_id") or user.get("id"))
    if other_id == me_id:
        raise HTTPException(400, "Cannot connect to yourself")
    try:
        await db.users.find_one({"_id": ObjectId(other_id)}, {"_id": 1})
    except Exception:
        raise HTTPException(400, "Invalid user id")
    existing = await db.connections.find_one({
        "$or": [{"a": me_id, "b": other_id}, {"a": other_id, "b": me_id}],
    })
    if existing:
        if existing.get("status") == "accepted":
            return {"action": "already_connected"}
        if existing.get("a") == other_id and existing.get("b") == me_id:
            # The other user already requested — auto-accept
            await db.connections.update_one(
                {"_id": existing["_id"]},
                {"$set": {"status": "accepted", "accepted_at": datetime.utcnow()}},
            )
            return {"action": "auto_accepted"}
        return {"action": "already_pending"}
    await db.connections.insert_one({
        "a": me_id, "b": other_id, "status": "pending",
        "created_at": datetime.utcnow(),
    })
    # Notify recipient
    try:
        await db.notifications.insert_one({
            "id": str(ObjectId()),
            "user_id": other_id,
            "type": "connection_request",
            "title": "New connection request",
            "body": f"{user.get('full_name') or 'A user'} wants to connect with you.",
            "read": False,
            "created_at": datetime.utcnow(),
        })
    except Exception:
        pass
    return {"action": "pending"}


@api_router.post("/network/accept/{other_id}")
async def accept_connection(other_id: str, user: dict = Depends(get_current_user)):
    me_id = str(user.get("_id") or user.get("id"))
    res = await db.connections.update_one(
        {"a": other_id, "b": me_id, "status": "pending"},
        {"$set": {"status": "accepted", "accepted_at": datetime.utcnow()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "No pending request from this user")
    try:
        await db.notifications.insert_one({
            "id": str(ObjectId()),
            "user_id": other_id,
            "type": "connection_accepted",
            "title": "Connection accepted",
            "body": f"{user.get('full_name') or 'A user'} accepted your request.",
            "read": False,
            "created_at": datetime.utcnow(),
        })
    except Exception:
        pass
    return {"action": "accepted"}


@api_router.post("/network/reject/{other_id}")
async def reject_connection(other_id: str, user: dict = Depends(get_current_user)):
    me_id = str(user.get("_id") or user.get("id"))
    res = await db.connections.delete_one(
        {"a": other_id, "b": me_id, "status": "pending"},
    )
    if res.deleted_count == 0:
        raise HTTPException(404, "No pending request to reject")
    return {"action": "rejected"}






@api_router.get("/catalog/events")
async def list_events(category: Optional[str] = None, limit: int = 20):
    """Module 2: Events — hackathons, workshops, fests with QR registration."""
    query = {"category": category} if category else {}
    items = await db.events.find(query, {"_id": 0}).sort("start_date", 1).limit(limit).to_list(limit)
    return {"events": items}


@api_router.get("/catalog/deals")
async def list_deals(category: Optional[str] = None, limit: int = 20):
    """Module 8: Deals — student-only coupons & discounts."""
    query = {"category": category} if category else {}
    items = await db.deals.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"deals": items}


@api_router.get("/catalog/financial")
async def list_financial(kind: Optional[str] = None):
    """Module 5: Financial Services — loans + scholarships."""
    query = {"kind": kind} if kind else {}
    items = await db.financial.find(query, {"_id": 0}).to_list(100)
    return {"items": items}


@api_router.get("/catalog/insurance")
async def list_insurance(kind: Optional[str] = None):
    """Module 6: Insurance — medical, bike, travel."""
    query = {"kind": kind} if kind else {}
    items = await db.insurance.find(query, {"_id": 0}).to_list(100)
    return {"items": items}


@api_router.get("/catalog/housing")
async def list_housing(country: Optional[str] = None):
    """Module 7: Housing — global student accommodation (India, US, Canada)."""
    query = {"country": country} if country else {}
    items = await db.housing.find(query, {"_id": 0}).to_list(100)
    return {"items": items}


@api_router.get("/catalog/resources")
async def list_resources(category: Optional[str] = None):
    """Legacy catch-all for resources (insurance/housing/loans). Backward-compat."""
    query = {"category": category} if category else {}
    items = await db.resources.find(query, {"_id": 0}).to_list(100)
    return {"resources": items}


# ----------------------------------------------------------------------------
# Mentor Booking
# ----------------------------------------------------------------------------
@api_router.post("/bookings")
async def create_booking(req: BookingRequest, user: dict = Depends(get_current_user)):
    """Student books a mentor session. Mentor must be approved."""
    if user["role"] != "student":
        raise HTTPException(403, "Only students can book mentor sessions")
    mentor = await db.sample_mentors.find_one({"id": req.mentor_id})
    if not mentor:
        # Fall back to real mentor lookup
        try:
            mentor = await db.users.find_one({"_id": ObjectId(req.mentor_id), "role": "mentor",
                                               "mentor_status": "approved"})
        except Exception:
            mentor = None
    if not mentor:
        raise HTTPException(404, "Mentor not found or not approved yet")

    booking = {
        "student_id": str(user["_id"]),
        "student_name": user["full_name"],
        "mentor_id": req.mentor_id,
        "mentor_name": mentor.get("full_name"),
        "slot_start_iso": req.slot_start_iso,
        "slot_end_iso": req.slot_end_iso,
        "topic": req.topic,
        "notes": req.notes,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.bookings.insert_one(booking)
    booking["id"] = str(result.inserted_id)
    booking.pop("_id", None)
    # Best-effort notify the mentor about the new booking
    try:
        await notify_booking_created(
            db, mentor_id=req.mentor_id,
            student_name=user["full_name"], topic=req.topic,
            when=req.slot_start_iso,
        )
    except Exception:
        pass
    return booking


@api_router.get("/bookings/me")
async def my_bookings(user: dict = Depends(get_current_user)):
    """Returns bookings for the current user (as student or as mentor)."""
    query = {"student_id": str(user["_id"])} if user["role"] == "student" \
        else {"mentor_id": str(user["_id"])}
    items = await db.bookings.find(query, {"_id": 0}).sort("slot_start_iso", 1).to_list(100)
    return {"bookings": items}


# ----------------------------------------------------------------------------
# Mentor portal: confirm/decline booking + post session/availability
# ----------------------------------------------------------------------------
async def _update_booking_status(booking_id: str, mentor_id: str, new_status: str) -> dict:
    """Helper: update a booking's status if the caller owns it as mentor."""
    try:
        oid = ObjectId(booking_id)
    except Exception:
        oid = None
    query = {"$or": [{"id": booking_id}]}
    if oid:
        query["$or"].append({"_id": oid})
    booking = await db.bookings.find_one(query)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if str(booking.get("mentor_id")) != str(mentor_id):
        raise HTTPException(403, "You can only modify your own bookings")
    update_filter = {"_id": booking["_id"]} if booking.get("_id") else {"id": booking_id}
    await db.bookings.update_one(update_filter, {"$set": {
        "status": new_status,
        "status_updated_at": datetime.now(timezone.utc),
    }})
    booking["status"] = new_status
    booking.pop("_id", None)
    return booking


@api_router.post("/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Mentor confirms a pending booking request."""
    if user["role"] != "mentor":
        raise HTTPException(403, "Only mentors can confirm bookings")
    b = await _update_booking_status(booking_id, str(user["_id"]), "confirmed")
    # Best-effort notification to student
    try:
        await db.notifications.insert_one({
            "user_id": b.get("student_id"),
            "title": "Session confirmed",
            "message": f"{user.get('full_name')} confirmed your session on {b.get('topic') or 'mentorship'}.",
            "type": "booking_confirmed",
            "booking_id": booking_id,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass
    return {"ok": True, "booking": b}


@api_router.post("/bookings/{booking_id}/decline")
async def decline_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Mentor declines/cancels a booking request."""
    if user["role"] != "mentor":
        raise HTTPException(403, "Only mentors can decline bookings")
    b = await _update_booking_status(booking_id, str(user["_id"]), "cancelled")
    try:
        await db.notifications.insert_one({
            "user_id": b.get("student_id"),
            "title": "Session declined",
            "message": f"{user.get('full_name')} couldn't make this session — please book another slot.",
            "type": "booking_cancelled",
            "booking_id": booking_id,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass
    return {"ok": True, "booking": b}


class MentorSessionIn(BaseModel):
    title: str
    topic: str
    scheduled_at: str        # free-text or ISO; surfaced on UI as-is
    duration_minutes: int = 30
    max_attendees: int = 1


@api_router.post("/mentor/sessions")
async def create_mentor_session(payload: MentorSessionIn, user: dict = Depends(get_current_user)):
    """Mentor publishes an open session/availability slot that students can browse + book."""
    if user["role"] != "mentor":
        raise HTTPException(403, "Only mentors can post sessions")
    doc = {
        "id": uuid.uuid4().hex,
        "mentor_id": str(user["_id"]),
        "mentor_name": user.get("full_name"),
        "title": payload.title.strip(),
        "topic": payload.topic.strip(),
        "scheduled_at": payload.scheduled_at.strip(),
        "duration_minutes": int(payload.duration_minutes or 30),
        "max_attendees": int(payload.max_attendees or 1),
        "attendees": [],
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.mentor_sessions.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "session": doc}


@api_router.get("/mentor/sessions/me")
async def my_mentor_sessions(user: dict = Depends(get_current_user)):
    """List sessions the current mentor has posted."""
    if user["role"] != "mentor":
        raise HTTPException(403, "Only mentors can view this")
    items = await db.mentor_sessions.find(
        {"mentor_id": str(user["_id"])},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return {"sessions": items}


# ----------------------------------------------------------------------------
# Event Registration with QR Code
# ----------------------------------------------------------------------------
@api_router.post("/events/{event_id}/register")
async def register_event(event_id: str, user: dict = Depends(get_current_user)):
    """Register the user for an event and generate a unique attendance QR code.
    The QR contains: SA-EVENT:{event_id}|{user_unique_id}|{registration_id}
    Organizers scan it on entry to mark attendance."""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(404, "Event not found")

    # Idempotent — return existing registration if user already registered
    existing = await db.event_registrations.find_one(
        {"event_id": event_id, "user_id": str(user["_id"])}, {"_id": 0}
    )
    if existing:
        return existing

    reg_id = secrets.token_hex(8)
    qr_payload = f"SA-EVENT:{event_id}|{user.get('unique_id')}|{reg_id}"
    registration = {
        "id": reg_id,
        "event_id": event_id,
        "event_title": event["title"],
        "user_id": str(user["_id"]),
        "user_name": user["full_name"],
        "user_unique_id": user.get("unique_id"),
        "qr_code_base64": generate_qr_code(qr_payload),
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "status": "registered",
    }
    await db.event_registrations.insert_one(registration.copy())
    return registration


@api_router.get("/events/{event_id}/my-registration")
async def my_event_registration(event_id: str, user: dict = Depends(get_current_user)):
    """Returns the user's registration for a given event (or None)."""
    reg = await db.event_registrations.find_one(
        {"event_id": event_id, "user_id": str(user["_id"])}, {"_id": 0}
    )
    return reg or {}


@api_router.get("/events/my-registrations")
async def my_event_registrations(user: dict = Depends(get_current_user)):
    """Lists all events the user has registered for."""
    items = await db.event_registrations.find(
        {"user_id": str(user["_id"])}, {"_id": 0}
    ).sort("registered_at", -1).to_list(100)
    return {"registrations": items}


# ----------------------------------------------------------------------------
# Knowledge Rooms (Module 4: Networking) — chat-based discussion
# ----------------------------------------------------------------------------
KNOWLEDGE_ROOMS = [
    {"id": "tech", "name": "Tech & Engineering", "description": "Coding, AI/ML, software, hardware", "icon": "💻", "members": 1240},
    {"id": "higher_ed", "name": "Higher Education Abroad", "description": "GRE, GMAT, US/UK/Canada applications", "icon": "🎓", "members": 890},
    {"id": "startups", "name": "Startups & Entrepreneurship", "description": "Building, funding, scaling startups", "icon": "🚀", "members": 670},
    {"id": "careers", "name": "Career Guidance", "description": "Jobs, internships, interviews, resumes", "icon": "💼", "members": 1580},
    {"id": "design", "name": "Design & Product", "description": "UX, UI, product management", "icon": "🎨", "members": 420},
    {"id": "finance", "name": "Finance & Business", "description": "MBA, consulting, investment banking", "icon": "📊", "members": 540},
]


@api_router.get("/rooms")
async def list_rooms():
    """Lists available knowledge rooms (categorized chat groups). Reads from
    the seeded `rooms` collection if present; falls back to the constant list."""
    docs = await db.rooms.find({}, {"_id": 0}).to_list(50)
    if docs:
        return {"rooms": docs}
    return {"rooms": KNOWLEDGE_ROOMS}


@api_router.get("/rooms/{room_id}/messages")
async def room_messages(room_id: str, user: dict = Depends(get_current_user)):
    """Messages in a room. Returns most recent 100."""
    msgs = await db.room_messages.find(
        {"room_id": room_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    for m in msgs:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return {"messages": msgs}


@api_router.post("/rooms/{room_id}/messages")
async def post_room_message(room_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Post a message to a knowledge room."""
    msg = (payload.get("message") or "").strip()
    if not msg:
        raise HTTPException(400, "Message cannot be empty")
    doc = {
        "room_id": room_id,
        "user_id": str(user["_id"]),
        "user_name": user["full_name"],
        "user_role": user["role"],
        "message": msg,
        "created_at": datetime.now(timezone.utc),
    }
    await db.room_messages.insert_one(doc.copy())
    doc["created_at"] = doc["created_at"].isoformat()
    doc.pop("_id", None)
    return doc


# ----------------------------------------------------------------------------
# Dashboard — unified endpoint with content prioritization
# ----------------------------------------------------------------------------
@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    """
    Unified dashboard endpoint with full content prioritization.
    See personalization.py for the scoring engine. The payload combines:
      - Module priority order (PhonePe-style grid order)
      - "Recommended For You" hand-picks (mentor + urgent event + course)
      - "Closing Soon" rail (deadlines within 7 days)
      - Featured items per module (filtered by career_path)
      - Personalization metadata (education_level, can_transition_alumni, etc.)
    """
    payload = await build_personalized_dashboard(db, user)
    payload["user"] = serialize_user(user)
    return payload


# Preferences editor — the spec mandates "simple filters and dropdown menus"
# for changing focus / education_level / interests. This is the endpoint that
# powers them. AI re-prioritization happens automatically because the dashboard
# is recomputed on every fetch.
# NOTE: PATCH /users/me/preferences is now handled at L1731 (Phase 4 deep-merge
# endpoint) — the older typed version below was kept as dead code. Removed during
# Phase 4 cleanup to avoid confusion.


@api_router.post("/users/me/transition-alumni", response_model=UserResponse)
async def transition_alumni_endpoint(user: dict = Depends(get_current_user)):
    """Convert a student account into an alumni account (B.Tech complete).
    Per spec: this unlocks Knowledge Rooms emphasis + mentor application path."""
    if user.get("role") not in ("student", "alumni"):
        raise HTTPException(403, "Only students can transition to alumni")
    fresh = await transition_to_alumni(db, user)
    return UserResponse(**serialize_user(fresh))


@api_router.post("/dashboard/track-click")
async def track_click(payload: dict, user: dict = Depends(get_current_user)):
    """Increment usage counter for a dashboard module — powers the
    'frequency of use' weight in the priority engine."""
    module_id = (payload or {}).get("module_id")
    if not module_id:
        raise HTTPException(400, "module_id is required")
    await track_module_click(db, str(user["_id"]), module_id)
    return {"status": "tracked", "module_id": module_id}


# ----------------------------------------------------------------------------
# Analytics — role-aware dashboards
# ----------------------------------------------------------------------------
@api_router.get("/analytics")
async def analytics_dispatcher(user: dict = Depends(get_current_user)):
    """Returns the analytics payload appropriate for the caller's role.
    Admin/super_admin -> platform-wide. College -> their institution. Mentor -> their bookings."""
    return await get_analytics_for(db, user)


@api_router.get("/analytics/super-admin")
async def analytics_super_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Super admin access required")
    return await super_admin_analytics(db, include_revenue=True)


@api_router.get("/analytics/admin")
async def analytics_admin_endpoint(user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin",):
        raise HTTPException(403, "Admin access required")
    return await super_admin_analytics(db, include_revenue=False)


@api_router.get("/analytics/college")
async def analytics_college_endpoint(user: dict = Depends(get_current_user),
                                      institution_name: Optional[str] = None):
    if user["role"] not in ("college", "admin"):
        raise HTTPException(403, "College / admin access required")
    inst = institution_name or (user.get("school_info") or {}).get("institution_name") or user.get("full_name")
    return await college_analytics(db, inst)


@api_router.get("/analytics/mentor")
async def analytics_mentor_endpoint(user: dict = Depends(get_current_user),
                                     mentor_id: Optional[str] = None):
    if user["role"] == "admin" and mentor_id:
        return await mentor_analytics(db, mentor_id)
    if user["role"] != "mentor":
        raise HTTPException(403, "Mentor access required")
    return await mentor_analytics(db, str(user["_id"]))


# ----------------------------------------------------------------------------
# External API Integrations — Coursera / Udemy / Adzuna
# Mock-mode by default; real-mode activates when env vars are set.
# ----------------------------------------------------------------------------
@api_router.get("/integrations/status")
async def get_integrations_status():
    """Returns which integrations are running in 'live' vs 'mock' mode."""
    return integrations_status()


@api_router.get("/integrations/courses")
async def integrations_courses(query: str = "computer science", limit: int = 10):
    """Live fetch of courses from Coursera + Udemy (mock fallback if no keys)."""
    coursera = await fetch_coursera_courses(query, limit)
    udemy = await fetch_udemy_courses(query, limit)
    return {"items": coursera + udemy, "status": integrations_status()}


@api_router.get("/integrations/internships")
async def integrations_internships(query: str = "internship", country: str = "in", limit: int = 10):
    items = await fetch_adzuna_internships(query, country, limit)
    return {"items": items, "status": integrations_status()}


@api_router.post("/integrations/sync/courses")
async def sync_courses(user: dict = Depends(get_current_user)):
    """Admin-only: pull Coursera + Udemy data into our courses collection."""
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    res = await sync_courses_to_db(db)
    return {"synced": res, "status": integrations_status()}


@api_router.post("/integrations/sync/internships")
async def sync_internships(user: dict = Depends(get_current_user)):
    """Admin-only: pull Adzuna data into our internships collection."""
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    res = await sync_internships_to_db(db)
    return {"synced": res, "status": integrations_status()}


# ----------------------------------------------------------------------------
# Mentor Reviews — students rate completed sessions
# ----------------------------------------------------------------------------
class ReviewIn(BaseModel):
    mentor_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = ""
    booking_id: Optional[str] = None


@api_router.post("/reviews")
async def post_review(req: ReviewIn, user: dict = Depends(get_current_user)):
    """Submit a review — only students can review mentors. One review per booking_id."""
    if user["role"] not in ("student", "alumni"):
        raise HTTPException(403, "Only students/alumni can review mentors")
    review = await create_review(
        db,
        mentor_id=req.mentor_id,
        student_id=str(user["_id"]),
        student_name=user.get("full_name", "Student"),
        rating=req.rating,
        comment=req.comment or "",
        booking_id=req.booking_id,
    )
    # Best-effort notify mentor
    try:
        await notify_review_received(db, mentor_id=req.mentor_id,
                                      rating=req.rating,
                                      student_name=user.get("full_name", "Student"))
    except Exception:
        pass
    if isinstance(review.get("created_at"), datetime):
        review["created_at"] = review["created_at"].isoformat()
    return review


@api_router.get("/mentors/{mentor_id}/reviews")
async def get_reviews(mentor_id: str, limit: int = 20):
    """Public — returns review list + aggregate stats for a mentor."""
    items = await list_mentor_reviews(db, mentor_id, limit)
    stats = await get_mentor_rating_stats(db, mentor_id)
    return {"items": items, "stats": stats}


# ----------------------------------------------------------------------------
# Push Notifications — register tokens, fetch in-app inbox
# ----------------------------------------------------------------------------
class PushTokenRegister(BaseModel):
    token: str
    platform: Optional[str] = "unknown"


@api_router.post("/notifications/register")
async def notifications_register(req: PushTokenRegister, user: dict = Depends(get_current_user)):
    """Save the device's Expo push token. Called from client on first launch."""
    return await register_push_token(db, str(user["_id"]), req.token, req.platform or "unknown")


@api_router.delete("/notifications/register")
async def notifications_deregister(req: PushTokenRegister, user: dict = Depends(get_current_user)):
    """Remove a push token (e.g. on logout)."""
    n = await deregister_push_token(db, req.token)
    return {"removed": n}


@api_router.get("/notifications")
async def notifications_inbox(user: dict = Depends(get_current_user), limit: int = 30):
    """Returns the in-app notification inbox + unread count."""
    items = await list_inbox(db, str(user["_id"]), limit)
    unread = await unread_count(db, str(user["_id"]))
    return {"items": items, "unread": unread}


@api_router.post("/notifications/mark-read")
async def notifications_mark_read(payload: Optional[dict] = None,
                                   user: dict = Depends(get_current_user)):
    ids = (payload or {}).get("ids") if payload else None
    n = await mark_inbox_read(db, str(user["_id"]), ids)
    return {"updated": n}


# Admin-only: send a manual broadcast (for announcements)
class ManualPushIn(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


@api_router.post("/notifications/send")
async def notifications_send_manual(req: ManualPushIn, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    return await send_push(db, user_id=req.user_id, title=req.title, body=req.body, data=req.data)


# ----------------------------------------------------------------------------
# Health
# ----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "Student Alumni Platform"}


# ----------------------------------------------------------------------------
# Seed Data
# ----------------------------------------------------------------------------
SAMPLE_COURSES = [
    {"id": "c1", "title": "CS50 - Introduction to Computer Science", "provider": "Harvard / edX", "url": "https://cs50.harvard.edu", "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", "duration": "12 weeks", "level": "Beginner", "is_free": True, "career_paths": ["job", "higher_education", "startup"]},
    {"id": "c2", "title": "Google Data Analytics Professional", "provider": "Coursera (Google)", "url": "https://www.coursera.org/professional-certificates/google-data-analytics", "image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", "duration": "6 months", "level": "Intermediate", "is_free": False, "career_paths": ["job", "business"]},
    {"id": "c3", "title": "How to Start a Startup", "provider": "Y Combinator", "url": "https://www.startupschool.org", "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "duration": "10 weeks", "level": "Beginner", "is_free": True, "career_paths": ["startup", "business"]},
    {"id": "c4", "title": "MIT 6.006 - Introduction to Algorithms", "provider": "MIT OCW", "url": "https://ocw.mit.edu", "image": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800", "duration": "Self-paced", "level": "Advanced", "is_free": True, "career_paths": ["higher_education", "job"]},
    {"id": "c5", "title": "GRE / GMAT Prep Masterclass", "provider": "Khan Academy", "url": "https://www.khanacademy.org", "image": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800", "duration": "Self-paced", "level": "All", "is_free": True, "career_paths": ["higher_education"]},
    {"id": "c6", "title": "The Lean Startup MBA", "provider": "Udemy", "url": "https://www.udemy.com", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "duration": "20 hours", "level": "Intermediate", "is_free": False, "career_paths": ["startup", "business"]},
    {"id": "c7", "title": "AWS Cloud Practitioner", "provider": "AWS", "url": "https://aws.amazon.com/training", "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", "duration": "8 weeks", "level": "Beginner", "is_free": True, "career_paths": ["job"]},
    {"id": "c8", "title": "Financial Markets - Yale", "provider": "Coursera (Yale)", "url": "https://www.coursera.org/learn/financial-markets-global", "image": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=800", "duration": "33 hours", "level": "Beginner", "is_free": True, "career_paths": ["business", "higher_education"]},
]

SAMPLE_MENTORS = [
    {"id": "m1", "full_name": "Priya Sharma", "title": "Senior SWE @ Google", "expertise": ["job"], "category": "it_software", "tags": ["Tech", "FAANG"], "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", "bio": "10+ years in distributed systems.", "rating": 4.9, "sessions": 230, "linkedin_url": "https://linkedin.com/in/priya"},
    {"id": "m2", "full_name": "Arjun Mehta", "title": "Founder @ FintechX", "expertise": ["startup", "business"], "category": "startup_mentor", "tags": ["Entrepreneur", "Fintech"], "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "bio": "Built and sold 2 startups.", "rating": 4.8, "sessions": 110, "linkedin_url": "https://linkedin.com/in/arjun"},
    {"id": "m3", "full_name": "Dr. Anjali Rao", "title": "Professor @ IIT Bombay", "expertise": ["higher_education"], "category": "higher_education", "tags": ["Research", "PhD"], "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400", "bio": "CV researcher; PhD application mentor.", "rating": 5.0, "sessions": 88, "linkedin_url": "https://linkedin.com/in/anjali"},
    {"id": "m4", "full_name": "Rahul Iyer", "title": "VP Strategy @ Tata", "expertise": ["business", "job"], "category": "business_mentor", "tags": ["Corporate", "Strategy"], "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400", "bio": "INSEAD MBA; corporate career mentor.", "rating": 4.7, "sessions": 156, "linkedin_url": "https://linkedin.com/in/rahul"},
    {"id": "m5", "full_name": "Sneha Kapoor", "title": "Engineering Manager @ Stripe", "expertise": ["job", "startup"], "category": "engineering_manager", "tags": ["EM", "Product"], "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400", "bio": "Engineer-to-EM transitions; team scaling.", "rating": 4.9, "sessions": 175, "linkedin_url": "https://linkedin.com/in/sneha"},
    {"id": "m6", "full_name": "Vikram Singh", "title": "Investor @ Sequoia", "expertise": ["startup", "business"], "category": "startup_advisor", "tags": ["VC", "Funding"], "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "bio": "Helping founders raise their seed.", "rating": 4.8, "sessions": 92, "linkedin_url": "https://linkedin.com/in/vikram"},
    # ─── New mentor archetypes (6) ────────────────────────────────────────
    {"id": "m7", "full_name": "Karan Verma", "title": "Tech Recruiter @ Microsoft", "expertise": ["job"], "category": "tech_recruiter", "tags": ["Hiring", "Sourcing", "Big Tech"], "avatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400", "bio": "Sourced 500+ engineers for FAANG. Knows what hiring panels look for.", "rating": 4.8, "sessions": 142, "linkedin_url": "https://linkedin.com/in/karan"},
    {"id": "m8", "full_name": "Ritu Aggarwal", "title": "HR Director @ Flipkart", "expertise": ["job"], "category": "hr_mentor", "tags": ["HR", "People Ops", "Comp"], "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400", "bio": "12+ yrs in HR, talent acquisition & comp strategy.", "rating": 4.7, "sessions": 98, "linkedin_url": "https://linkedin.com/in/ritu"},
    {"id": "m9", "full_name": "Aditi Nair", "title": "Career Coach (ex-Deloitte)", "expertise": ["job"], "category": "career_coach", "tags": ["Resume", "Interviews", "Comm"], "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400", "bio": "Resume reviews, mock interviews, soft-skill workshops.", "rating": 4.9, "sessions": 312, "linkedin_url": "https://linkedin.com/in/aditi"},
    {"id": "m10", "full_name": "Vivek Bhat", "title": "Industry Advisor (Manufacturing)", "expertise": ["business"], "category": "industry_advisor", "tags": ["Manufacturing", "Strategy", "Supply Chain"], "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400", "bio": "30+ yrs in industrial ops. Advisor to 4 unicorns.", "rating": 4.8, "sessions": 64, "linkedin_url": "https://linkedin.com/in/vivek"},
]

SAMPLE_INTERNSHIPS = [
    {"id": "i1", "title": "Software Engineering Intern", "company": "Microsoft", "location": "Hyderabad / Remote", "stipend": "₹80,000/month", "duration": "3 months", "skills": ["Python", "C++", "Algorithms"], "url": "https://careers.microsoft.com", "image": "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=800", "career_paths": ["job", "higher_education"], "type": "internship", "domain": "Engineering", "mode": "hybrid", "deadline": "2026-08-15", "applicants_count": 1240, "description": "Build features for Office 365. Code in TypeScript & C#.", "match_signals": ["Software Engineering", "Engineering", "Computer Science"]},
    {"id": "i2", "title": "Data Science Intern", "company": "Flipkart", "location": "Bangalore", "stipend": "₹60,000/month", "duration": "6 months", "skills": ["Python", "SQL", "ML"], "url": "https://www.flipkartcareers.com", "image": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", "career_paths": ["job"], "type": "internship", "domain": "Data Science", "mode": "onsite", "deadline": "2026-07-30", "applicants_count": 856, "description": "Apply ML to e-commerce. Work with petabyte-scale data.", "match_signals": ["Data Science", "AI/ML", "Analytics"]},
    {"id": "i3", "title": "Product Management Intern", "company": "Razorpay", "location": "Bangalore / Remote", "stipend": "₹50,000/month", "duration": "3 months", "skills": ["Product", "SQL"], "url": "https://razorpay.com/jobs", "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "career_paths": ["job", "startup"], "type": "internship", "domain": "Product", "mode": "hybrid", "deadline": "2026-08-10", "applicants_count": 612, "description": "Drive payment-product roadmap end-to-end.", "match_signals": ["Product Manager", "Product", "Startup"]},
    {"id": "i4", "title": "Founders Office Intern", "company": "Zerodha", "location": "Bangalore", "stipend": "₹40,000/month", "duration": "6 months", "skills": ["Strategy", "Business"], "url": "https://zerodha.com/careers", "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", "career_paths": ["business", "startup"], "type": "internship", "domain": "Business", "mode": "onsite", "deadline": "2026-07-25", "applicants_count": 420, "description": "Work directly with founders on strategy & ops.", "match_signals": ["Business", "Startup", "Strategy"]},
    {"id": "i5", "title": "Research Intern", "company": "IIT Madras", "location": "Chennai", "stipend": "₹15,000/month", "duration": "2 months", "skills": ["Research", "Python"], "url": "https://www.iitm.ac.in", "image": "https://images.unsplash.com/photo-1562774053-701939374585?w=800", "career_paths": ["higher_education"], "type": "internship", "domain": "Research", "mode": "onsite", "deadline": "2026-07-15", "applicants_count": 188, "description": "Contribute to AI research with PhD-level mentors.", "match_signals": ["Research", "AI/ML", "Higher Education"]},
    {"id": "i6", "title": "Marketing Intern", "company": "Swiggy", "location": "Bangalore / Remote", "stipend": "₹35,000/month", "duration": "3 months", "skills": ["Marketing", "Analytics"], "url": "https://careers.swiggy.com", "image": "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800", "career_paths": ["job", "business"], "type": "internship", "domain": "Marketing", "mode": "hybrid", "deadline": "2026-08-20", "applicants_count": 950, "description": "Run growth & brand campaigns at scale.", "match_signals": ["Marketing", "Business"]},
    {"id": "j1", "title": "Backend Engineer (SDE-1)", "company": "Razorpay", "location": "Bangalore", "stipend": "₹22-32 LPA", "duration": "Full-time", "skills": ["Go", "Postgres", "Redis"], "url": "https://razorpay.com/jobs", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "onsite", "deadline": "2026-09-01", "applicants_count": 1420, "description": "Build payment APIs handling millions of TPS.", "match_signals": ["Software Engineering", "Engineering"]},
    {"id": "j2", "title": "Frontend Engineer (Remote)", "company": "Atlassian", "location": "Remote (India)", "stipend": "₹28-40 LPA", "duration": "Full-time", "skills": ["React", "TypeScript", "GraphQL"], "url": "https://atlassian.com/careers", "image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "remote", "deadline": "2026-08-30", "applicants_count": 920, "description": "Ship Jira UI used by 200K+ teams worldwide.", "match_signals": ["Software Engineering", "Engineering"]},
    {"id": "j3", "title": "ML Engineer", "company": "Sarvam AI", "location": "Bangalore", "stipend": "₹35-50 LPA", "duration": "Full-time", "skills": ["PyTorch", "LLMs", "CUDA"], "url": "https://www.sarvam.ai", "image": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800", "career_paths": ["job", "startup"], "type": "job", "domain": "Data Science", "mode": "hybrid", "deadline": "2026-09-15", "applicants_count": 480, "description": "Train India's first multilingual foundation model.", "match_signals": ["Data Science", "AI/ML", "Startup"]},
    {"id": "j4", "title": "Investment Analyst", "company": "Sequoia (Peak XV)", "location": "Bangalore / Mumbai", "stipend": "₹25-35 LPA", "duration": "Full-time", "skills": ["Excel", "Modeling", "Diligence"], "url": "https://www.peakxv.com", "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800", "career_paths": ["business"], "type": "job", "domain": "Finance", "mode": "onsite", "deadline": "2026-08-05", "applicants_count": 312, "description": "Source & evaluate seed-to-Series-B investments.", "match_signals": ["Finance", "Business", "Investment"]},
    {"id": "j5", "title": "PhD-Track Researcher", "company": "Microsoft Research", "location": "Bangalore", "stipend": "₹18-28 LPA", "duration": "Full-time", "skills": ["Research", "Publications"], "url": "https://www.microsoft.com/research", "image": "https://images.unsplash.com/photo-1532618793091-ec5fe9635fbd?w=800", "career_paths": ["higher_education", "job"], "type": "job", "domain": "Research", "mode": "onsite", "deadline": "2026-09-30", "applicants_count": 96, "description": "Publish in top venues, collaborate with global PhDs.", "match_signals": ["Research", "Higher Education"]},
    {"id": "j6", "title": "Founder's Associate", "company": "Cred", "location": "Bangalore", "stipend": "₹18-28 LPA", "duration": "Full-time", "skills": ["Strategy", "0-to-1"], "url": "https://cred.club", "image": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800", "career_paths": ["business", "startup"], "type": "job", "domain": "Business", "mode": "onsite", "deadline": "2026-08-12", "applicants_count": 540, "description": "Run new bets directly with the CEO.", "match_signals": ["Business", "Startup", "Strategy"]},
    {"id": "i7", "title": "UX Design Intern", "company": "Spotify", "location": "Remote", "stipend": "₹50,000/month", "duration": "4 months", "skills": ["Figma", "User Research"], "url": "https://www.lifeatspotify.com", "image": "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800", "career_paths": ["job"], "type": "internship", "domain": "Design", "mode": "remote", "deadline": "2026-08-25", "applicants_count": 720, "description": "Design listening experiences for 600M+ users.", "match_signals": ["Design", "UX"]},
    {"id": "i8", "title": "DevOps Intern", "company": "Postman", "location": "Bangalore / Remote", "stipend": "₹45,000/month", "duration": "6 months", "skills": ["AWS", "Kubernetes", "Terraform"], "url": "https://www.postman.com/company/careers", "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", "career_paths": ["job"], "type": "internship", "domain": "Engineering", "mode": "hybrid", "deadline": "2026-09-05", "applicants_count": 380, "description": "Scale APIs used by 30M+ developers.", "match_signals": ["Software Engineering", "Engineering", "DevOps"]},
    {"id": "i9", "title": "Content Strategy Intern", "company": "The Ken", "location": "Bangalore / Remote", "stipend": "₹25,000/month", "duration": "3 months", "skills": ["Writing", "Research"], "url": "https://the-ken.com", "image": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800", "career_paths": ["job", "business"], "type": "internship", "domain": "Content", "mode": "remote", "deadline": "2026-07-20", "applicants_count": 290, "description": "Investigate & write deep-dive business stories.", "match_signals": ["Content", "Writing", "Business"]},
    {"id": "j7", "title": "Mechanical Design Engineer", "company": "Ola Electric", "location": "Bangalore", "stipend": "₹14-22 LPA", "duration": "Full-time", "skills": ["CAD", "FEA", "Manufacturing"], "url": "https://olaelectric.com/careers", "image": "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "onsite", "deadline": "2026-08-22", "applicants_count": 410, "description": "Design EV powertrain components.", "match_signals": ["Mechanical", "Engineering"]},
    {"id": "j8", "title": "Clinical Data Scientist", "company": "Apollo Hospitals", "location": "Hyderabad", "stipend": "₹12-18 LPA", "duration": "Full-time", "skills": ["R", "Biostatistics"], "url": "https://www.apollohospitals.com/careers", "image": "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800", "career_paths": ["higher_education", "job"], "type": "job", "domain": "Healthcare", "mode": "onsite", "deadline": "2026-09-10", "applicants_count": 145, "description": "Use AI to improve patient outcomes.", "match_signals": ["Healthcare", "Data Science"]},
    {"id": "j9", "title": "Game Developer", "company": "Krafton India", "location": "Bangalore", "stipend": "₹16-26 LPA", "duration": "Full-time", "skills": ["Unreal Engine", "C++"], "url": "https://krafton.com/careers", "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800", "career_paths": ["job"], "type": "job", "domain": "Engineering", "mode": "onsite", "deadline": "2026-08-28", "applicants_count": 670, "description": "Build the next BGMI feature.", "match_signals": ["Software Engineering", "Engineering", "Gaming"]},
    {"id": "i10", "title": "Architecture Intern", "company": "WeWork India", "location": "Mumbai / Bangalore", "stipend": "₹20,000/month", "duration": "3 months", "skills": ["AutoCAD", "Sketch"], "url": "https://www.wework.co.in", "image": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800", "career_paths": ["job"], "type": "internship", "domain": "Architecture", "mode": "onsite", "deadline": "2026-07-28", "applicants_count": 110, "description": "Plan flexible workspaces of the future.", "match_signals": ["Architecture", "Design"]},
    {"id": "j10", "title": "Public Policy Associate", "company": "Niti Aayog", "location": "New Delhi", "stipend": "₹10-15 LPA", "duration": "Full-time", "skills": ["Policy", "Writing"], "url": "https://niti.gov.in", "image": "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800", "career_paths": ["business", "higher_education"], "type": "job", "domain": "Policy", "mode": "onsite", "deadline": "2026-09-20", "applicants_count": 234, "description": "Draft national-level economic policy.", "match_signals": ["Policy", "Business"]},
]

SAMPLE_EVENTS = [
    {"id": "e1", "title": "Smart India Hackathon 2026", "category": "hackathon", "organizer": "Govt. of India", "image": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800", "venue": "All India · Online + Offline", "start_date": "2026-08-15", "registration_deadline": "2026-07-30", "url": "https://www.sih.gov.in", "tags": ["AI/ML", "Innovation", "Govt"]},
    {"id": "e2", "title": "AI Training @ IIT Hyderabad", "category": "workshop", "organizer": "IIT Hyderabad", "image": "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800", "venue": "IIT Hyderabad", "start_date": "2026-06-12", "registration_deadline": "2026-06-05", "url": "https://www.iith.ac.in", "tags": ["AI", "Hands-on"]},
    {"id": "e3", "title": "Startup Demo Day - Bengaluru", "category": "startup", "organizer": "T-Hub", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "venue": "T-Hub, Hyderabad", "start_date": "2026-09-20", "registration_deadline": "2026-09-10", "url": "https://t-hub.co", "tags": ["Pitch", "Funding"]},
    {"id": "e4", "title": "Networking Meet - SF Tech", "category": "networking", "organizer": "TechSoc", "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", "venue": "Online", "start_date": "2026-07-05", "registration_deadline": "2026-07-04", "url": "https://example.com", "tags": ["Network", "Tech"]},
    {"id": "e5", "title": "TechFest IIT Bombay", "category": "fest", "organizer": "IIT Bombay", "image": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800", "venue": "IIT Bombay", "start_date": "2026-12-15", "registration_deadline": "2026-12-01", "url": "https://techfest.org", "tags": ["Cultural", "Tech"]},
    {"id": "e6", "title": "Codeathon 2026", "category": "hackathon", "organizer": "MLH India", "image": "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800", "venue": "Online", "start_date": "2026-05-22", "registration_deadline": "2026-05-20", "url": "https://mlh.io", "tags": ["Code", "Online"]},
]

SAMPLE_DEALS = [
    {"id": "d1", "title": "GitHub Student Developer Pack", "brand": "GitHub", "category": "Tech", "discount": "Free Pro tools worth $200K+", "code": "STUDENT-PACK", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800", "url": "https://education.github.com/pack"},
    {"id": "d2", "title": "Notion Personal Pro", "brand": "Notion", "category": "Productivity", "discount": "100% OFF", "code": "STUDENT-FREE", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800", "url": "https://www.notion.so/students"},
    {"id": "d3", "title": "Figma Education Plan", "brand": "Figma", "category": "Design", "discount": "100% OFF Professional", "code": "EDU-FIGMA", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800", "url": "https://www.figma.com/education"},
    {"id": "d4", "title": "Zomato Pro Student", "brand": "Zomato", "category": "Food", "discount": "50% OFF", "code": "STUDENT50", "expires": "31 Dec 2026", "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", "url": "https://www.zomato.com"},
    {"id": "d5", "title": "Spotify Premium Student", "brand": "Spotify", "category": "Entertainment", "discount": "₹59/month", "code": "STUDENT-IND", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800", "url": "https://www.spotify.com/student"},
    {"id": "d6", "title": "Apple Education Store", "brand": "Apple", "category": "Tech", "discount": "Up to 10% OFF + AirPods", "code": "EDU-APPLE", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", "url": "https://www.apple.com/in-edu/store"},
    {"id": "d7", "title": "Coursera Plus", "brand": "Coursera", "category": "Education", "discount": "Free for select students", "code": "COURSERA-EDU", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800", "url": "https://www.coursera.org"},
    {"id": "d8", "title": "Amazon Prime Student", "brand": "Amazon", "category": "Shopping", "discount": "₹749/year", "code": "PRIME-STUDENT", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800", "url": "https://www.amazon.in/amazonprime"},
]

SAMPLE_FINANCIAL = [
    {"id": "f1", "kind": "loan", "title": "HDFC Credila Education Loan", "provider": "HDFC Credila", "highlight": "Up to ₹1.5 Cr · From 9.5%", "url": "https://www.hdfccredila.com", "description": "Education loans for India and abroad with flexible repayment."},
    {"id": "f2", "kind": "loan", "title": "SBI Scholar Loan", "provider": "State Bank of India", "highlight": "From 8.55% p.a.", "url": "https://www.sbi.co.in", "description": "Government-backed education loan with subsidy options."},
    {"id": "f3", "kind": "loan", "title": "Avanse Global Loan", "provider": "Avanse Financial Services", "highlight": "Up to ₹75 L abroad", "url": "https://www.avanse.com", "description": "Loans for international study with deferred repayment."},
    {"id": "f4", "kind": "scholarship", "title": "Inspire Scholarship", "provider": "DST, Govt of India", "highlight": "₹80,000/year · BSc/MSc", "url": "https://online-inspire.gov.in", "description": "For top 1% rank holders in 12th board pursuing science."},
    {"id": "f5", "kind": "scholarship", "title": "Reliance Foundation Scholarship", "provider": "Reliance Foundation", "highlight": "Up to ₹2 L/year", "url": "https://www.scholarships.reliancefoundation.org", "description": "UG/PG merit + need-based scholarship for Indian students."},
    {"id": "f6", "kind": "scholarship", "title": "Tata Trusts Scholarship", "provider": "Tata Trusts", "highlight": "Need-based grants", "url": "https://www.tatatrusts.org", "description": "For deserving students across various streams."},
]

SAMPLE_INSURANCE = [
    {"id": "ins1", "kind": "medical", "title": "Star Health Student Care", "provider": "Star Health", "highlight": "₹2,500/year", "url": "https://www.starhealth.in", "description": "Comprehensive health cover for students aged 16-25."},
    {"id": "ins2", "kind": "medical", "title": "HDFC ERGO Student Travel", "provider": "HDFC ERGO", "highlight": "From ₹5,000", "url": "https://www.hdfcergo.com", "description": "Travel & study-abroad insurance for international students."},
    {"id": "ins3", "kind": "bike", "title": "Two-Wheeler Insurance", "provider": "Acko", "highlight": "From ₹999/year", "url": "https://www.acko.com", "description": "Affordable bike insurance with claim guarantee."},
    {"id": "ins4", "kind": "loan", "title": "Loan Protection Cover", "provider": "ICICI Lombard", "highlight": "Optional add-on", "url": "https://www.icicilombard.com", "description": "Covers EMI in case of unexpected events."},
]

SAMPLE_HOUSING = [
    {"id": "h1", "country": "India", "title": "Stanza Living - Co-living", "provider": "Stanza Living", "highlight": "From ₹8,000/mo", "url": "https://www.stanzaliving.com", "cities": ["Bangalore", "Mumbai", "Delhi"], "description": "Premium co-living for students across 25+ Indian cities."},
    {"id": "h2", "country": "India", "title": "OYO Life - PG", "provider": "OYO Life", "highlight": "From ₹6,500/mo", "url": "https://www.oyorooms.com/oyo-life", "cities": ["Pune", "Hyderabad"], "description": "Furnished PG accommodation near major colleges."},
    {"id": "h3", "country": "USA", "title": "Amber Student", "provider": "Amber", "highlight": "From $600/mo", "url": "https://amberstudent.com", "cities": ["Boston", "NYC", "SF"], "description": "Verified student housing across US universities."},
    {"id": "h4", "country": "Canada", "title": "Casita Housing", "provider": "Casita", "highlight": "From CAD 700/mo", "url": "https://casita.com", "cities": ["Toronto", "Vancouver"], "description": "Student housing across Canada."},
    {"id": "h5", "country": "USA", "title": "RentSpree Student", "provider": "RentSpree", "highlight": "Roommate matching", "url": "https://rentspree.com", "cities": ["LA", "Seattle"], "description": "Apartment + roommate finder for students."},
]


async def seed_data():
    """Seed catalog collections if empty."""
    seeders = [
        (db.courses, SAMPLE_COURSES),
        (db.sample_mentors, SAMPLE_MENTORS),
        (db.internships, SAMPLE_INTERNSHIPS),
        (db.events, SAMPLE_EVENTS),
        (db.deals, SAMPLE_DEALS),
        (db.financial, SAMPLE_FINANCIAL),
        (db.insurance, SAMPLE_INSURANCE),
        (db.housing, SAMPLE_HOUSING),
    ]
    for coll, data in seeders:
        if await coll.count_documents({}) == 0:
            await coll.insert_many([dict(d) for d in data])
            logger.info(f"Seeded {coll.name}")
    # Legacy resources collection (backward-compat)
    if await db.resources.count_documents({}) == 0:
        legacy = (
            [{**i, "category": "insurance"} for i in SAMPLE_INSURANCE]
            + [{**h, "category": "housing"} for h in SAMPLE_HOUSING]
            + [{**l, "category": "loans"} for l in SAMPLE_FINANCIAL if l.get("kind") == "loan"]
        )
        await db.resources.insert_many(legacy)


async def seed_admin():
    """Seed a default admin user from .env credentials (idempotent)."""
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@careerpath.app")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "full_name": "Platform Admin",
            "role": "admin",
            "phone": None,
            "unique_id": "SA-2026-ADM-000001",
            "qr_code_base64": generate_qr_code(f"SA-USER:SA-2026-ADM-000001|{admin_email}|admin"),
            "school_info": None,
            "career_path": None,
            "interests": [],
            "skills": [],
            "bio": None,
            "face_image_base64": None,
            "onboarding_completed": True,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        # Reseed password if .env credentials changed
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("unique_id")
    await db.users.create_index([("role", 1), ("mentor_status", 1)])
    await db.career_suggestions.create_index("user_id")
    await db.chat_messages.create_index([("user_id", 1), ("session_id", 1)])
    await db.bookings.create_index([("student_id", 1), ("mentor_id", 1)])
    await seed_admin()
    await seed_data()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ----------------------------------------------------------------------------
# Mount router & CORS middleware
# ----------------------------------------------------------------------------
from portals import router as portals_router
api_router.include_router(portals_router)

# Career Intel adapters (LinkedIn / Internshala / Buddy4Study) — MOCKED fallback
from career_intel import router as career_intel_router
api_router.include_router(career_intel_router)
from jobs_feed import router as jobs_feed_router  # live job aggregator (5 free APIs + tier filter)
api_router.include_router(jobs_feed_router)
from mentor_ai import router as mentor_ai_router  # mentor AI studio (mentee pulse, skill gaps, impact, session prep)
api_router.include_router(mentor_ai_router)
from wallet_and_availability import router as wallet_router  # SA Credits + mentor availability + demo seed
api_router.include_router(wallet_router)
from activity_credits import router as activity_credits_router  # Activity-based earnings + Wallet summary/topup/withdraw
api_router.include_router(activity_credits_router)
from deals_aggregator import router as deals_aggregator_router  # SA Member Deals + Tag Engine + AI generator
api_router.include_router(deals_aggregator_router)
from higher_ed_platform import router as higher_ed_router  # SA Higher Education programmes/scholarships/tracker/AI tools
api_router.include_router(higher_ed_router)
from events_aggregator import router as events_aggregator_router  # Events v2: aggregator + RSVP + waitlist + AI recs + host flow
api_router.include_router(events_aggregator_router)
from financial_services import router as financial_router  # Financial v2: scholarships, loans, startup_funding, insurance, venture_capital + match score + AI helper + EMI
api_router.include_router(financial_router)
from rentals_marketplace import router as rentals_router  # SA Stay: housing, vehicles, hotels, coworking + bookings + AI recommend
api_router.include_router(rentals_router)
from courses_marketplace import router as courses_router  # SA Courses: catalog + tracks + enrollments + AI advisor
api_router.include_router(courses_router)
from college_portal import router as college_router  # College admin Phase 3: roster + analytics
api_router.include_router(college_router)

# Auth analytics & session tracking
from auth_analytics import router as auth_analytics_router
api_router.include_router(auth_analytics_router)

# AI Daily Brief (on-demand Claude integration)
from ai_briefs import router as ai_briefs_router
api_router.include_router(ai_briefs_router)

# CRUD endpoints — append-only mutations (book, RSVP, enroll, apply)
from crud_endpoints import router as crud_router
api_router.include_router(crud_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
