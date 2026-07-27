"""
Student Alumni Platform - Backend
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
import socket

# --- GLOBALLY PATCH DNS TO PREVENT 34-SECOND IPv6 HANGS ON WINDOWS ---
import sys
if sys.platform == "win32" and not getattr(socket, "_ipv4_patched", False):
    _original_getaddrinfo = socket.getaddrinfo

    def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        if family == 0:
            family = socket.AF_INET
        return _original_getaddrinfo(host, port, family, type, proto, flags)

    socket.getaddrinfo = _ipv4_getaddrinfo
    socket._ipv4_patched = True  # type: ignore[attr-defined]
# ---------------------------------------------------------------------
import re
import uuid
import io
import base64
import logging
import secrets
import random
import string
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Dict, Any

import bcrypt
import jwt
import pyotp
import qrcode
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator
from fastapi.middleware.gzip import GZipMiddleware

# Rate limiting — uses real client IP (proxy-aware, not raw REMOTE_ADDR)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.middleware import get_real_ip, register_security_middleware

limiter = Limiter(key_func=get_real_ip, default_limits=["200/minute"])

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

# Services -- single source of truth for business logic
from services.career_intelligence_service import compute_full_intelligence, invalidate_intel_cache
from services.profile_service import compute_profile_completion
from services.career_roadmap_service import get_roadmap_summary

# ----------------------------------------------------------------------------
# Setup & Configuration
# ----------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import time
_t0_mongo = time.perf_counter()
print("[DB TRACE] Mongo client created")
# MONGO_URL must be set — no hardcoded fallback (prevents accidental prod data exposure)
mongo_url = os.environ['MONGO_URL']
from db import client, db as _db_default, fetch_users_with_mock_limit
db = _db_default

# JWT configuration — JWT_SECRET must be set explicitly; no fallback to prevent
# accidental deployment with a publicly-known secret value.
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days for mobile (less re-login friction)
REFRESH_TOKEN_EXPIRE_DAYS = 30

from contextlib import asynccontextmanager


@asynccontextmanager
async def _lifespan(application):
    """Single lifespan context replacing the deprecated @app.on_event handlers.

    Everything before `yield` runs on startup; everything after runs on shutdown.
    """
    # ── STARTUP ──────────────────────────────────────────────────────────────
    # 1. Warm Mongo connection pool (forces topology discovery before first request)
    try:
        from core.db import warm_db
        ping_ms = await warm_db()
        print(f"[DB TRACE] Mongo connection established | Duration: {ping_ms:.1f}ms", flush=True)
        print(f"[DB TRACE] Mongo Topology: {client.topology_description}", flush=True)
    except Exception as e:
        print(f"[DB TRACE] Mongo connection failed: {e}", flush=True)

    # 2. DB indexes + admin seed + schedulers (runs after Mongo is warm)
    async def _safe_create_index(collection, *args, **kwargs):
        try:
            await collection.create_index(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Skipping index creation for {collection.name} {args}: {e}")

    await _safe_create_index(db.users, "email", unique=True)
    await _safe_create_index(db.users, "unique_id")
    await _safe_create_index(db.users, [("role", 1), ("_id", -1)])
    await _safe_create_index(db.users, [("role", 1), ("mentor_status", 1)])
    await _safe_create_index(db.users, "sa_id", unique=True, sparse=True)
    await _safe_create_index(db.career_suggestions, "user_id")
    await _safe_create_index(db.career_roadmaps, "user_id")
    await _safe_create_index(db.college_students, [("college_id", 1), ("id", 1)])
    await _safe_create_index(db.chat_messages, [("user_id", 1), ("session_id", 1)])
    await _safe_create_index(db.bookings, [("student_id", 1), ("slot_start_iso", -1)])
    await _safe_create_index(db.bookings, [("mentor_id", 1), ("slot_start_iso", -1)])
    await _safe_create_index(db.audit_logs, "user_id")
    await _safe_create_index(db.audit_logs, [("ts", -1)])
    await _safe_create_index(db.sessions, "user_id")
    await _safe_create_index(db.sessions, [("expires_at", 1)], expireAfterSeconds=0)
    await _safe_create_index(db.agent_k_schedules, [("status", 1), ("next_run_at", 1)])
    await _safe_create_index(db.agent_k_schedules, [("user_id", 1), ("created_at", -1)])
    await _safe_create_index(db.agent_runs, [("schedule_id", 1), ("started_at", -1)])
    await _safe_create_index(db.workflow_events, "event_type")
    await _safe_create_index(db.workflow_events, [("fired_at", -1)])
    await _safe_create_index(db.connections, "a")
    await _safe_create_index(db.connections, "b")
    await _safe_create_index(db.connections, [("from_id", 1), ("status", 1)])
    await _safe_create_index(db.connections, [("to_id", 1), ("status", 1)])
    await _safe_create_index(db.connections, "mentor_id")
    await _safe_create_index(db.applications, "user_id")
    await _safe_create_index(db.jobs_cache, "dedup_hash")
    await _safe_create_index(db.jobs_cache, [("expires_at", 1), ("job_type", 1)])
    await _safe_create_index(db.mentor_sessions, [("mentee_id", 1), ("status", 1)])
    await _safe_create_index(db.mentor_sessions, [("mentor_id", 1), ("status", 1)])
    await _safe_create_index(db.events, "mentor_id")
    await _safe_create_index(db.events, [("status", 1), ("start_date", -1)])
    await _safe_create_index(db.event_registrations, "event_id")

    # Seed admin account and baseline data
    # (seed_admin / seed_data are defined later in server.py and are in scope at runtime)
    await seed_admin()
    await seed_data()

    # Start the Agent K scheduler (60s polling tick).
    try:
        from agent_k_scheduled import start_scheduler as _ak_start
        _ak_start()
    except Exception as _e:
        logger.warning("Could not start Agent K scheduler: %s", _e)

    # Start the hourly content sync scheduler.
    try:
        from background_sync import start_sync_scheduler, check_dependencies
        check_dependencies()
        start_sync_scheduler()
    except Exception as _e:
        logger.warning("Could not start background sync scheduler: %s", _e)

    # Start the workflow automation cron tick (60s polling).
    try:
        from workflow_automation import run_cron_workflows as _run_cron
        async def _wf_cron_tick():
            while True:
                try:
                    await _run_cron()
                except Exception:
                    pass
                await asyncio.sleep(60)
        asyncio.create_task(_wf_cron_tick())
    except Exception as _e:
        logger.warning("Could not start Workflow cron: %s", _e)

    yield  # ← application runs here

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────
    try:
        from agent_k_scheduled import stop_scheduler as _ak_stop
        _ak_stop()
    except Exception:
        pass
    try:
        from background_sync import stop_sync_scheduler
        stop_sync_scheduler()
    except Exception:
        pass
    client.close()


app = FastAPI(title="Student Alumni Platform API", lifespan=_lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
api_router = APIRouter(prefix="/api")  # All routes prefixed with /api (Kubernetes ingress requirement)


# (Mongo warm-up and shutdown handling are now handled in the _lifespan context above)


# ----------------------------------------------------------------------------
# Encryption-at-Rest — Fernet (AES-128 in CBC mode + HMAC-SHA256)
# ----------------------------------------------------------------------------
# Per spec — encrypt sensitive personal data (dob, phone, postal_code) at rest.
# Backwards-compat: legacy users may have plaintext values; decrypt() returns
# the input as-is when it can't be decoded as Fernet ciphertext.
try:
    from cryptography.fernet import Fernet, InvalidToken  # noqa: E402
    _HAS_CRYPTOGRAPHY = True
except Exception:
    _HAS_CRYPTOGRAPHY = False
    class Fernet:
        @staticmethod
        def generate_key():
            return b"dummy_key_for_dev_booting_without_cryptography_32b_len="
        def __init__(self, key):
            pass
        def encrypt(self, data: bytes) -> bytes:
            return data
        def decrypt(self, data: bytes) -> bytes:
            return data
    class InvalidToken(Exception):
        pass

_FERNET_KEY = os.environ.get("FERNET_KEY")
if not _FERNET_KEY:
    # Auto-generate a session key in dev so the app boots; logs a warning.
    if _HAS_CRYPTOGRAPHY:
        _FERNET_KEY = Fernet.generate_key().decode()
    else:
        _FERNET_KEY = Fernet.generate_key().decode('utf-8')
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
            "is_manual_entry": is_manual_entry,
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
UserRole = Literal["student", "alumni", "mentor", "college", "admin", "super_admin"]

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
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*...)")
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

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


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
    banner_data: Optional[str] = None
    college_logo_data: Optional[str] = None
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
    session_id: Optional[str] = None


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


class ConnectRequestIn(BaseModel):
    message: Optional[str] = None


class MentorBookingCreateRequest(BaseModel):
    """Mentor schedules a booking with a student."""
    student_id: str
    slot_start_iso: str  # ISO datetime string
    topic: str
    notes: Optional[str] = None


class RescheduleRequest(BaseModel):
    """Request payload to reschedule a session."""
    slot_start_iso: str  # ISO datetime string



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
    getattr(img, "save")(buf, format="PNG")
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


def serialize_user(user: dict) -> dict | None:
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
        "photo_data":     user.get("photo_data") or user.get("face_image_base64") or user.get("oauth_picture"),
        "banner_data":    user.get("banner_data"),
        "college_logo_data": user.get("college_logo_data"),
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
        "badges":         [b for b in user.get("badges", []) if isinstance(b, dict)],
        "projects":       user.get("projects"),
        "preferences":    user.get("preferences"),
        "is_verified":    user.get("is_verified"),
        "ranking_tier":   user.get("ranking_tier"),
    }


async def get_current_user(request: Request) -> dict:
    """JWT auth dependency. Reads `Authorization: Bearer <token>` header."""
    import time
    _t0 = time.perf_counter()
    auth = request.headers.get("Authorization", "")
    print(f"[AUTH TRACE] path={request.url.path}", flush=True)
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        print(f'[AUTH TRACE] DB_QUERY_START | t={(time.perf_counter()-_t0)*1000:.1f}ms', flush=True)
        user = await db.users.find_one(
            {"_id": ObjectId(payload["sub"])}
        )
        print(f'[AUTH TRACE] DB_QUERY_END | t={(time.perf_counter()-_t0)*1000:.1f}ms', flush=True)
        if not user:
            raise HTTPException(401, "User not found")

        # ── Schema Unification Migration Helper ──
        needs_migration = False
        updates = {"$set": {}, "$unset": {}}

        # 1. Image Schema
        if not user.get("photo_data") and (user.get("photo_data")):
            user["photo_data"] = user.get("photo_data")
            updates["$set"]["photo_data"] = user["photo_data"]
            if "face_image_base64" in user: updates["$unset"]["face_image_base64"] = ""
            if "photo" in user: updates["$unset"]["photo"] = ""
            needs_migration = True

        # 2. Career Goal
        si = user.get("student_info") or {}
        if not si.get("career_goal") and (user.get("career_goal") or user.get("career_path")):
            si["career_goal"] = user.get("career_goal") or user.get("career_path")
            user["student_info"] = si
            updates["$set"]["student_info"] = si
            if "career_goal" in user: updates["$unset"]["career_goal"] = ""
            if "career_path" in user: updates["$unset"]["career_path"] = ""
            needs_migration = True

        # 3. Education
        s_info = user.get("school_info") or {}
        has_edu_legacy = False
        for legacy_key, target_key in [
            ("branch", "branch_or_stream"),
            ("cgpa", "cgpa"),
            ("graduation_year", "graduation_year"),
            ("class_or_year", "class_or_year"),
            ("department", "branch_or_stream")
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
                "active": True
            }
            updates["$push"] = {"resume_documents": new_doc}
            if not user.get("resume_documents"):
                user["resume_documents"] = []
            user["resume_documents"].append(new_doc)
            if "resume_url" in user: updates["$unset"]["resume_url"] = ""
            if "resume_data" in user: updates["$unset"]["resume_data"] = ""
            needs_migration = True

        if needs_migration:
            try:
                if not updates["$unset"]: del updates["$unset"]
                if not updates["$set"]: del updates["$set"]
                if not updates.get("$push"): updates.pop("$push", None)
                if updates:
                    await db.users.update_one({"_id": user["_id"]}, updates)
            except Exception as e:
                print(f"Migration error: {e}", flush=True)
        
        # Remove large binary fields from response to match legacy behavior
        if "resume_documents" in user:
            del user["resume_documents"]
            
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





@api_router.get("/dashboard/student-summary")
async def student_dashboard_summary(user: dict = Depends(get_current_user)):
    """Student Dashboard Command Center — one endpoint that bundles all data needed
    for the redesigned Job Readiness Command Center dashboard.

    Combines (all from existing cached/fast sources):
      • skill_intelligence  — readiness score, skill scores, ranked_actions
      • profile_completion  — percentage + item checklist
      • user_stats          — connections, sessions, applications, streak
      • career_roadmap      — target_role, progress_pct, next milestone (from cache)
      • featured_content    — top 3 internships, top 3 mentors, top 3 events
      • notification_count  — count of unread notifications
    """
    import asyncio as _asyncio

    uid = str(user.get("id") or user.get("_id"))

    # ── 1. Skill Intelligence (delegates to compute_full_intelligence which uses service cache) ─
    async def _get_intel():
        try:
            return await compute_full_intelligence(user, uid, db)
        except Exception:
            return {
                "readiness_score": {"score": 0, "level": "Getting Started", "next_level": "Builder", "next_threshold": 25},
                "skill_scores": {"Technical Excellence": 0, "Professional Communication": 0, "Personal Brand": 0,
                                 "Leadership & Collaboration": 0, "Career Preparation": 0, "Industry Presence": 0},
                "potential_score": 100,
                "ranked_actions": [],
                "score_explanations": {},
            }

    # ── 2. Profile Completion ───────────────────────────────────────────────
    async def _get_completion():
        try:
            user_db = await db.users.find_one({"_id": user["_id"]}, {"resume_documents": 1})
            u2 = dict(user)
            if user_db:
                u2["resume_documents"] = user_db.get("resume_documents") or []
            return compute_profile_completion(u2)
        except Exception:
            return {"percentage": 0, "items": []}

    # ── 3. User Stats ───────────────────────────────────────────────────────
    async def _get_stats():
        connections = sessions = applications = streak = 0
        try:
            connections = await db.connections.count_documents({
                "$or": [
                    {"from_id": uid},
                    {"to_id": uid},
                    {"a": uid},
                    {"b": uid},
                    {"mentor_id": uid},
                    {"user_id": uid},
                    {"student_id": uid},
                    {"from_user": uid},
                    {"to_user": uid}
                ],
                "status": {"$in": ["accepted", "active"]},
            })
        except Exception:
            pass
        try:
            sessions = await db.mentor_sessions.count_documents({
                "mentee_id": uid, "status": {"$in": ["completed", "done"]},
            })
        except Exception:
            pass
        try:
            applications = await db.applications.count_documents({"user_id": uid})
        except Exception:
            pass
        # streak from user stats
        try:
            from datetime import datetime as _dt2, timedelta as _td2, timezone as _tz2
            today2 = _dt2.now(_tz2.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
            thirty_ago = today2 - _td2(days=30)
            streak_days = set()
            async for ev in db.activity_events.find({"user_id": uid, "ts": {"$gte": thirty_ago}}, {"ts": 1}):
                d_ts = ev.get("ts")
                if isinstance(d_ts, _dt2):
                    streak_days.add(d_ts.date().isoformat())
            d_day = today2.date()
            if d_day.isoformat() not in streak_days:
                yesterday2 = d_day - _td2(days=1)
                if yesterday2.isoformat() in streak_days:
                    d_day = yesterday2
            while d_day.isoformat() in streak_days:
                streak += 1
                d_day = d_day - _td2(days=1)
        except Exception:
            pass
        return {"connections": connections, "sessions": sessions, "applications": applications, "streak": streak}

    # ── 4. Career Roadmap (cache-only, no LLM trigger) ─────────────────────
    async def _get_roadmap_summary():
        try:
            existing = await db.career_roadmaps.find_one({"user_id": uid})
            if not existing:
                return None
            milestones = existing.get("milestones") or []
            completed = [m for m in milestones if m.get("completed")]
            progress_pct = round(len(completed) / len(milestones) * 100) if milestones else 0
            pending = [m for m in milestones if not m.get("completed")]
            next_milestone = pending[0] if pending else None
            return {
                "target_role": existing.get("target_role", ""),
                "target_company_type": existing.get("target_company_type", ""),
                "progress_pct": progress_pct,
                "milestones_total": len(milestones),
                "milestones_completed": len(completed),
                "next_milestone": {
                    "title": next_milestone.get("title", "") if next_milestone else "",
                    "milestone_type": next_milestone.get("milestone_type", "") if next_milestone else "",
                    "description": next_milestone.get("description", "") if next_milestone else "",
                } if next_milestone else None,
            }
        except Exception:
            return None

    # ── 5. Featured Content ──────────────────────────────────────────────────
    async def _get_featured():
        career_path = (user.get("career_path") or "").lower()
        # Internships
        intern_q: dict = {}
        if career_path:
            intern_q["career_paths"] = career_path
        internships = await db.internships.find(intern_q, {"_id": 0}).limit(5).to_list(5)
        # Mentors (approved only, real users first)
        mentor_q = {"role": "mentor", "mentor_status": "approved"}
        if career_path:
            mentor_q["mentor_info.category"] = {
                "job": "it_software",
                "higher_education": "higher_education",
                "startup": "startup",
                "business": "business",
            }.get(career_path, "it_software")
        mentors_raw = await db.users.find(mentor_q, {"password_hash": 0}).limit(4).to_list(4)
        mentors = []
        for m in mentors_raw:
            mr = m.get("mentor_rating", {})
            mentors.append({
                "id": str(m["_id"]),
                "full_name": m.get("full_name", ""),
                "designation": (m.get("mentor_info") or {}).get("designation", ""),
                "organization": (m.get("mentor_info") or {}).get("organization", ""),
                "category": (m.get("mentor_info") or {}).get("category", ""),
                "rating": mr.get("rating", mr.get("average", 5.0)),
                "total_reviews": mr.get("total_reviews", mr.get("total", 0)),
                "bio": m.get("bio", ""),
                "skills": (m.get("mentor_info") or {}).get("skills_offered", []),
                "photo_url": m.get("face_image_base64", "") or m.get("photo_url", ""),
            })
        # Events
        from datetime import datetime as _dt3, timezone as _tz3
        events = await db.events.find(
            {"start_date": {"$gte": _dt3.now(_tz3.utc).replace(tzinfo=None)}},  
            {"_id": 0, "title": 1, "date_str": 1, "time_str": 1, "mode": 1, "category": 1, "coverColor": 1, "capacity": 1, "mentor_id": 1}
        ).sort("start_date", 1).limit(4).to_list(4)
        return {"internships": internships, "mentors": mentors, "events": events}

    # ── 6. Notification Count ────────────────────────────────────────────────
    async def _get_notif_count():
        try:
            notifs = await db.notifications.find({"user_id": uid, "read": {"$ne": True}}).to_list(100)
            return len(notifs)
        except Exception:
            try:
                all_notifs = await db.notifications.find({"user_id": uid}).to_list(100)
                unread = [n for n in all_notifs if not n.get("read")]
                return len(unread)
            except Exception:
                return 0

    # ── 7. AI Coach Data (computed, no LLM) ─────────────────────────────────
    async def _get_coach_data(intel_data):
        try:
            rs = intel_data.get("readiness_score", {})
            scores = intel_data.get("skill_scores", {})
            actions = intel_data.get("ranked_actions", [])
            expl = intel_data.get("score_explanations", {})

            # Sort categories by score
            sorted_cats = sorted(scores.items(), key=lambda x: x[1])
            weakest = sorted_cats[0] if sorted_cats else ("Unknown", 0)
            strongest = sorted_cats[-1] if sorted_cats else ("Unknown", 100)

            top_action = actions[0] if actions else None
            total_gain = sum(a.get("gain", 0) for a in actions[:3])

            # Confidence score = how well-understood the weakness is
            # = inverse of (weakest_score / 100) → lower score = higher confidence we know the gap
            raw_confidence = max(0, 100 - weakest[1])
            confidence = min(95, max(60, raw_confidence))  # clamp 60-95

            # Category explanation for weakest
            cat_expl = (expl.get("categories") or {}).get(weakest[0], {})
            factors = cat_expl.get("factors", []) if cat_expl else []

            return {
                "current_readiness": rs.get("score", 0),
                "current_tier": rs.get("level", "Getting Started"),
                "next_tier": rs.get("next_level", "Builder"),
                "points_to_next": max(0, rs.get("next_threshold", 100) - rs.get("score", 0)),
                "weakest_category": weakest[0],
                "weakest_score": weakest[1],
                "strongest_category": strongest[0],
                "strongest_score": strongest[1],
                "top_action": top_action,
                "total_potential_gain_today": total_gain,
                "confidence_score": confidence,
                "score_factors": factors[:3],  # top 3 for the weakest category
            }
        except Exception:
            return {}

    # ── 8. Career Insights (dynamic, from real DB signals) ──────────────────
    async def _get_career_insights(intel_data, completion_data, stats_data):
        insights = []
        try:
            rs = intel_data.get("readiness_score", {})
            scores = intel_data.get("skill_scores", {})
            actions = intel_data.get("ranked_actions", [])
            sorted_cats = sorted(scores.items(), key=lambda x: x[1]) if scores else []
            weakest = sorted_cats[0] if sorted_cats else None
            profile_pct = completion_data.get("percentage", 0)

            # Profile views from student/intelligence KPIs
            # Pull directly from db.analytics_events to get profile view count
            from datetime import datetime as _dti, timedelta as _tdi, timezone as _tzi
            thirty_ago = _dti.now(_tzi.utc).replace(tzinfo=None) - _tdi(days=30)
            profile_views = 0
            try:
                profile_views = await db.analytics_events.count_documents({
                    "target_id": uid, "event_type": "profile_view",
                    "ts": {"$gte": thirty_ago}
                })
                if profile_views == 0:
                    # fallback: check page_views collection
                    profile_views = await db.page_views.count_documents({
                        "target_user_id": uid, "ts": {"$gte": thirty_ago}
                    })
            except Exception:
                profile_views = 0

            # Resume age signal
            try:
                user_doc = await db.users.find_one({"_id": user["_id"]}, {"resume_documents": 1, "updated_at": 1})
                resume_docs = (user_doc or {}).get("resume_documents") or []
                has_resume = len(resume_docs) > 0
                if has_resume:
                    # Find most recent resume
                    latest_resume_ts = None
                    for r in resume_docs:
                        rt = r.get("uploaded_at") or r.get("created_at")
                        if rt and (latest_resume_ts is None or rt > latest_resume_ts):
                            latest_resume_ts = rt
                    if latest_resume_ts:
                        delta = _dti.now(_tzi.utc).replace(tzinfo=None) - latest_resume_ts
                        days_old = delta.days
                        if days_old > 30:
                            insights.append({
                                "icon": "file-text",
                                "color": "#F59E0B",
                                "text": f"Resume hasn't been updated in {days_old} days",
                                "type": "warning",
                                "priority": 2,
                            })
                        else:
                            insights.append({
                                "icon": "file-text",
                                "color": "#34D399",
                                "text": f"Resume uploaded {days_old} days ago — keep it current",
                                "type": "positive",
                                "priority": 5,
                            })
                else:
                    insights.append({
                        "icon": "file-text",
                        "color": "#F87171",
                        "text": "No resume uploaded yet — this blocks most applications",
                        "type": "blocker",
                        "priority": 1,
                    })
            except Exception:
                pass

            # Profile views insight
            if profile_views > 0:
                insights.append({
                    "icon": "eye",
                    "color": "#60A5FA",
                    "text": f"Profile viewed {profile_views} time{'s' if profile_views != 1 else ''} this month",
                    "type": "positive",
                    "priority": 4,
                })

            # Weakest category insight
            if weakest and weakest[1] < 50:
                insights.append({
                    "icon": "alert-triangle",
                    "color": "#F87171",
                    "text": f"{weakest[0]} is your weakest area at {weakest[1]}% — focus here for fastest gains",
                    "type": "warning",
                    "priority": 1,
                })
            elif weakest:
                insights.append({
                    "icon": "trending-up",
                    "color": "#A78BFA",
                    "text": f"{weakest[0]} has room to grow ({weakest[1]}%) — targeted effort could push it up",
                    "type": "info",
                    "priority": 3,
                })

            # Connections insight
            connections = stats_data.get("connections", 0)
            if connections == 0:
                insights.append({
                    "icon": "users",
                    "color": "#A78BFA",
                    "text": "No connections yet — networking is below average for your career stage",
                    "type": "action",
                    "priority": 2,
                })
            elif connections < 5:
                insights.append({
                    "icon": "users",
                    "color": "#60A5FA",
                    "text": f"{connections} connection{'s' if connections != 1 else ''} — aim for 10+ to strengthen your network score",
                    "type": "info",
                    "priority": 4,
                })

            # Applications insight
            apps = stats_data.get("applications", 0)
            if apps == 0:
                insights.append({
                    "icon": "briefcase",
                    "color": "#F59E0B",
                    "text": "No internship applications sent — start applying to boost Career Preparation",
                    "type": "action",
                    "priority": 2,
                })

            # Potential gain insight
            total_gain = sum(a.get("gain", 0) for a in actions[:3])
            if total_gain > 0:
                insights.append({
                    "icon": "zap",
                    "color": "#2DD4BF",
                    "text": f"+{total_gain}% readiness possible if you complete today's top {min(len(actions), 3)} actions",
                    "type": "highlight",
                    "priority": 0,
                })

            # Profile completion insight
            if profile_pct < 60:
                insights.append({
                    "icon": "target",
                    "color": "#F87171",
                    "text": f"Profile is only {profile_pct}% complete — recruiters skip incomplete profiles",
                    "type": "blocker",
                    "priority": 1,
                })

            # Readiness tier insight
            score = rs.get("score", 0)
            next_level = rs.get("next_level", "")
            pts_to_next = max(0, rs.get("next_threshold", 100) - score)
            if pts_to_next > 0 and pts_to_next <= 15:
                insights.append({
                    "icon": "trophy",
                    "color": "#F59E0B",
                    "text": f"Only {pts_to_next}% away from {next_level} tier — you're almost there!",
                    "type": "highlight",
                    "priority": 0,
                })

            # Sort by priority (lower = more urgent), limit to 6
            insights.sort(key=lambda x: x.get("priority", 5))
            return insights[:6]
        except Exception:
            return []

    # ── 9. Yesterday's Activity Wins ────────────────────────────────────────
    async def _get_yesterday_wins():
        try:
            from datetime import datetime as _dty, timedelta as _tdy, timezone as _tzy
            yesterday_start = _dty.now(_tzy.utc).replace(tzinfo=None) - _tdy(hours=24)
            events = await db.activity_events.find(
                {"user_id": uid, "ts": {"$gte": yesterday_start}},
                {"title": 1, "sub": 1, "icon": 1, "tint": 1}
            ).sort("ts", -1).limit(5).to_list(5)
            wins = []
            for ev in events:
                wins.append({
                    "label": ev.get("title", "Activity"),
                    "detail": ev.get("sub", ""),
                    "icon": ev.get("icon", "check-circle"),
                    "color": ev.get("tint", "#34D399"),
                })
            return wins
        except Exception:
            return []

    # ── Run all in parallel ──────────────────────────────────────────────────
    intel, completion, stats, roadmap, featured, notif_count = await _asyncio.gather(
        _get_intel(),
        _get_completion(),
        _get_stats(),
        _get_roadmap_summary(),
        _get_featured(),
        _get_notif_count(),
    )

    # Coach + Insights depend on intel/completion/stats — run after gather
    coach_data, career_insights, yesterday_wins = await _asyncio.gather(
        _get_coach_data(intel),
        _get_career_insights(intel, completion, stats),
        _get_yesterday_wins(),
    )

    return {
        "skill_intelligence": intel,
        "profile_completion": completion,
        "stats": stats,
        "career_roadmap": roadmap,
        "featured": featured,
        "notification_count": notif_count,
        "ai_coach": coach_data,
        "career_insights": career_insights,
        "yesterday_wins": yesterday_wins,
        "predictions": intel.get("predictions", {}) if isinstance(intel, dict) else {},
        "readiness_estimates": intel.get("readiness_estimates", {}) if isinstance(intel, dict) else {},
        "user": {
            "full_name": user.get("full_name", ""),
            "role": user.get("role", "student"),
            "career_path": user.get("career_path", ""),
            "career_goal": (user.get("student_info") or {}).get("career_goal") or user.get("career_goal", ""),
        },
    }







# ----------------------------------------------------------------------------
# Advertisement — cross-portal sidebar banner
# ----------------------------------------------------------------------------
# A single active "ad" (label + image_url + redirect_url) set by admin that
# appears at the bottom of every portal sidebar. All users (no auth) can
# fetch the active ad to display it.

@api_router.get("/ad/image")
async def get_ad_images():
    """Return all active advertisements as an array.
    Supports both legacy format (flat label/image_url/redirect_url fields)
    and new format (items array).
    """
    doc = await db.site_config.find_one({"_key": "advertisement"})
    if not doc:
        return {"ads": []}
    # New format: { items: [...] }
    if doc.get("items") and isinstance(doc["items"], list):
        return {"ads": doc["items"]}
    # Legacy format: { label, image_url, redirect_url }
    if doc.get("image_url"):
        return {"ads": [{
            "label": doc.get("label", ""),
            "image_url": doc.get("image_url", ""),
            "redirect_url": doc.get("redirect_url", ""),
        }]}
    return {"ads": []}


@api_router.post("/admin/ad/image")
async def set_ad_images(payload: dict, user: dict = Depends(get_current_user)):
    """Save all ads at once (admin only). Body: { items: [{ label, image_url, redirect_url }] }.
    Also accepts legacy single-ad format: { label, image_url, redirect_url }."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin"):
        raise HTTPException(403, "Only admins can set advertisements")
    # Support new items array format
    items = payload.get("items")
    if items is not None:
        if not isinstance(items, list) or len(items) == 0:
            raise HTTPException(400, "items must be a non-empty array")
        for item in items:
            item["label"] = (item.get("label") or "").strip()
            item["image_url"] = (item.get("image_url") or "").strip()
            item["redirect_url"] = (item.get("redirect_url") or "").strip()
        await db.site_config.update_one(
            {"_key": "advertisement"},
            {"$set": {
                "_key": "advertisement",
                "items": items,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": str(user.get("_id")),
            }},
            upsert=True,
        )
        return {"status": "ok", "items": items}
    # Legacy single-ad format
    label = (payload.get("label") or "").strip()
    image_url = (payload.get("image_url") or "").strip()
    redirect_url = (payload.get("redirect_url") or "").strip()
    if not label or not image_url or not redirect_url:
        raise HTTPException(400, "items array or (label, image_url, redirect_url) are required")
    await db.site_config.update_one(
        {"_key": "advertisement"},
        {"$set": {
            "_key": "advertisement",
            "label": label,
            "image_url": image_url,
            "redirect_url": redirect_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": str(user.get("_id")),
        }},
        upsert=True,
    )
    return {"status": "ok", "label": label, "image_url": image_url, "redirect_url": redirect_url}



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
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Super admin access required")
    return await super_admin_analytics(db, include_revenue=True)


@api_router.get("/analytics/admin")
async def analytics_admin_endpoint(user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    return await super_admin_analytics(db, include_revenue=False)


@api_router.get("/analytics/college")
async def analytics_college_endpoint(user: dict = Depends(get_current_user),
                                      institution_name: Optional[str] = None):
    if user["role"] not in ("college", "admin", "super_admin"):
        raise HTTPException(403, "College / admin access required")
    inst = institution_name or (user.get("school_info") or {}).get("institution_name") or user.get("full_name") or ""
    return await college_analytics(db, inst)


@api_router.get("/analytics/mentor")
async def analytics_mentor_endpoint(user: dict = Depends(get_current_user),
                                     mentor_id: Optional[str] = None):
    if user["role"] in ("admin", "super_admin") and mentor_id:
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
    if user["role"] not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    res = await sync_courses_to_db(db)
    return {"synced": res, "status": integrations_status()}


@api_router.post("/integrations/sync/internships")
async def sync_internships(user: dict = Depends(get_current_user)):
    """Admin-only: pull Adzuna data into our internships collection."""
    if user["role"] not in ("admin", "super_admin"):
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
    mentor_id = req.mentor_id
    if mentor_id == "auto-resolved" and req.booking_id:
        b_id = req.booking_id
        booking = None
        try:
            if ObjectId.is_valid(b_id):
                booking = await db.bookings.find_one({"_id": ObjectId(b_id)})
                if not booking:
                    booking = await db.sessions.find_one({"_id": ObjectId(b_id)})
        except Exception:
            pass
        if not booking:
            import re
            booking_rx = f"{re.escape(b_id)}$"
            
            bookings_matches = []
            async for b in db.bookings.find({"$expr": {"$regexMatch": {"input": {"$toString": "$_id"}, "regex": booking_rx, "options": "i"}}}, {"mentor_id": 1}):
                bookings_matches.append(b)
                
            sessions_matches = []
            async for s in db.sessions.find({"$expr": {"$regexMatch": {"input": {"$toString": "$_id"}, "regex": booking_rx, "options": "i"}}}, {"mentor_id": 1}):
                sessions_matches.append(s)
                
            total_matches = len(bookings_matches) + len(sessions_matches)
            if total_matches == 1:
                booking = bookings_matches[0] if bookings_matches else sessions_matches[0]

        if booking and "mentor_id" in booking:
            mentor_id = str(booking["mentor_id"])

    review = await create_review(
        db,
        mentor_id=mentor_id,
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
    if "_id" in review:
        if isinstance(review["_id"], ObjectId):
            review["_id"] = str(review["_id"])
        review["id"] = review["_id"]
    return review


class ReviewReplyIn(BaseModel):
    reply: str


@api_router.post("/reviews/{review_id}/reply")
async def reply_to_review(review_id: str, req: ReviewReplyIn, user: dict = Depends(get_current_user)):
    """Mentor replies to a review."""
    if user["role"] != "mentor":
        raise HTTPException(403, "Only mentors can reply to reviews")
    
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(404, "Review not found")
        
    if str(review["mentor_id"]) != str(user["_id"]):
        raise HTTPException(403, "You can only reply to your own reviews")
        
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {"mentor_reply": req.reply, "mentor_reply_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True}


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


@api_router.post("/notifications/dismiss")
async def notifications_dismiss(payload: Optional[dict] = None,
                                user: dict = Depends(get_current_user)):
    from notifications import dismiss_inbox
    ids = (payload or {}).get("ids") if payload else None
    n = await dismiss_inbox(db, str(user["_id"]), ids)
    return {"deleted": n}


# Admin-only: send a manual broadcast (for announcements)
class ManualPushIn(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


@api_router.post("/notifications/send")
async def notifications_send_manual(req: ManualPushIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "super_admin"):
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
            "qr_code_base64": generate_qr_code("https://studentalumni.app/verify/000001"),
            "school_info": None,
            "career_path": None,
            "interests": [],
            "skills": [],
            "bio": None,
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


# (Shutdown logic — stopping schedulers and closing the Mongo client — lives in _lifespan above)


# ----------------------------------------------------------------------------
# Mount router & CORS middleware
# ----------------------------------------------------------------------------
from portals import router as portals_router
api_router.include_router(portals_router)

from career_intel import router as career_intel_router
api_router.include_router(career_intel_router)
from jobs_feed import router as jobs_feed_router  # live job aggregator (7 free APIs + tier filter)
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

# Agent K — automation operator (Claude tool-use loop)
from agent_k import router as agent_k_router
api_router.include_router(agent_k_router)

# Agent K — scheduled (cron) automations
from agent_k_scheduled import router as agent_k_scheduled_router
api_router.include_router(agent_k_scheduled_router)

# Admin settings — Roles & Permissions + Marketplace
from routers.admin.settings import router as admin_settings_router
api_router.include_router(admin_settings_router)

# Admin imports — bulk-upload + categorization (Students / Alumni / Mentors)
from routers.admin.imports import router as admin_imports_router
api_router.include_router(admin_imports_router)
from routers.admin.colleges import router as admin_colleges_router
api_router.include_router(admin_colleges_router)

# Talent Pool — searchable candidate profiles (LinkedIn, CSV, platform opt-in)
from talent_pool import router as talent_pool_router
api_router.include_router(talent_pool_router)

# CRUD endpoints — append-only mutations (book, RSVP, enroll, apply)
from crud_endpoints import router as crud_router
api_router.include_router(crud_router)

# Collaboration partners (Phase A) — public landing strip + admin CRUD
from routers.partners import router as partners_router
app.include_router(partners_router)

# Phase B — consent (privacy/cookies) + product tour status
from routers.consent import router as consent_router
from routers.tour import router as tour_router
app.include_router(consent_router)
app.include_router(tour_router)

# Phase C — promotional banners (cross-portal)
from routers.promotions import router as promotions_router
app.include_router(promotions_router)

from routers.auth import router as auth_router
api_router.include_router(auth_router)

from routers.users import router as users_router
api_router.include_router(users_router)

# Career AI — skill intelligence, roadmaps, simulator, predictions, suggestions
from routers.career_ai import router as career_ai_router
api_router.include_router(career_ai_router)

app.include_router(api_router)

# ── CORS — origins configurable via env for production deployments ──
# Comma-separated list, e.g.
#   ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com"
# Use "*" only when allow_credentials is False; we coerce safely below.
_origins_env = (os.getenv("ALLOWED_ORIGINS") or os.getenv("FRONTEND_URL") or "*").strip()
_origins_list = [o.strip() for o in _origins_env.split(",") if o.strip()]
_allow_creds = "*" not in _origins_list  # browsers reject credentials+wildcard

# Fail-fast: wildcard CORS is insecure in production
if os.getenv("ENV") == "production" and "*" in _origins_list:
    raise ValueError("CORS wildcard (*) is not allowed in production. Set ALLOWED_ORIGINS to specific domains.")

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=_allow_creds,
    allow_origins=_origins_list or ["*"],
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX") or None,
    # Explicit method/header lists — "*" is overly permissive
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id", "Accept"],
    expose_headers=["Content-Length", "X-Request-Id"],
)

# Security middleware — registers RequestId, SecurityHeaders, MongoSanitize
register_security_middleware(app)


# ── Health-check endpoints (used by Dokploy / Docker / load-balancers) ──
@app.get("/api/health")
@app.get("/health")
async def _health():
    """Lightweight liveness + Mongo connectivity probe."""
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False
    return {
        "status": "ok" if mongo_ok else "degraded",
        "service": "studentalumni-backend",
        "mongo": "ok" if mongo_ok else "down",
        "time": datetime.now(timezone.utc).isoformat(),
    }
