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
    socket._ipv4_patched = True
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
from starlette.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

# Rate limiting (imports only, setup after app is created)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

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

import time
_t0_mongo = time.perf_counter()
print("[DB TRACE] Mongo client created")
mongo_url = os.environ.get('MONGO_URL', 'mongodb+srv://studentalumniadmin_db_user:wDruHz5sCPoEVuFy@studentalumniadmin.hhu4uao.mongodb.net/?appName=studentalumniadmin')
from db import client, db as _db_default
db = _db_default

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', '44ef879c2317ef383b123617fdac89bc7291a27e3848b8dbdfb9a1c1d8e8f8e9')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days for mobile (less re-login friction)
REFRESH_TOKEN_EXPIRE_DAYS = 30

app = FastAPI(title="Student Alumni Platform API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")  # All routes prefixed with /api (Kubernetes ingress requirement)



@app.on_event("startup")
async def verify_mongo_connection():
    """Warm the Mongo connection pool before any requests are served.

    Calling warm_db() here forces Motor to complete Atlas topology discovery
    (DNS → TCP → TLS → hello handshake) during server startup rather than
    on the first user request.  Without this warm-up, the first 10-20
    concurrent requests all block for ~47 s waiting for topology resolution.
    """
    try:
        from core.db import warm_db
        ping_ms = await warm_db()
        print(f"[DB TRACE] Mongo connection established | Duration: {ping_ms:.1f}ms", flush=True)
        print(f"[DB TRACE] Mongo Topology: {client.topology_description}", flush=True)
    except Exception as e:
        print(f"[DB TRACE] Mongo connection failed: {e}", flush=True)


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
# Type Definitions & Shared Models
# ----------------------------------------------------------------------------
from core.models import (
    UserRole, CareerPath, EducationLevel, MentorCategory, MentorStatus,
    SchoolInfo, MentorInfo, CollegeInfo, AlumniInfo, StudentInfo,
    UserResponse, AuthResponse
)




# ----- Auth payloads -----





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



# ----------------------------------------------------------------------------
# Backward-compat re-exports — imported by legacy code & other modules.
# The canonical implementations now live in core/security.py and core/deps.py.
# ----------------------------------------------------------------------------
from core.security import serialize_user, validate_student_class, _safe_block  # noqa: F401
from core.deps import get_current_user  # noqa: F401



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
    async def safe_create_index(collection, *args, **kwargs):
        try:
            await collection.create_index(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Skipping index creation for {collection.name} {args}: {e}")

    await safe_create_index(db.users, "email", unique=True)
    await safe_create_index(db.users, "unique_id")
    await safe_create_index(db.users, [("role", 1), ("mentor_status", 1)])
    await safe_create_index(db.users, "sa_id", unique=True, sparse=True)
    await safe_create_index(db.career_suggestions, "user_id")
    await safe_create_index(db.chat_messages, [("user_id", 1), ("session_id", 1)])
    await safe_create_index(db.bookings, [("student_id", 1), ("slot_start_iso", -1)])
    await safe_create_index(db.bookings, [("mentor_id", 1), ("slot_start_iso", -1)])
    await safe_create_index(db.audit_logs, "user_id")
    await safe_create_index(db.audit_logs, [("ts", -1)])
    await safe_create_index(db.sessions, "user_id")
    await safe_create_index(db.sessions, [("expires_at", 1)], expireAfterSeconds=0)
    # Agent K scheduled — indexes that the tick query and per-user list rely on
    await safe_create_index(db.agent_k_schedules, [("status", 1), ("next_run_at", 1)])
    await safe_create_index(db.agent_k_schedules, [("user_id", 1), ("created_at", -1)])
    await safe_create_index(db.agent_runs, [("schedule_id", 1), ("started_at", -1)])
    await safe_create_index(db.workflow_events, "event_type")
    await safe_create_index(db.workflow_events, [("fired_at", -1)])
    
    # Missing indexes for performance
    await safe_create_index(db.connections, "a")
    await safe_create_index(db.connections, "b")
    await safe_create_index(db.connections, "mentor_id")
    await safe_create_index(db.events, "mentor_id")
    await safe_create_index(db.event_registrations, "event_id")
    await seed_admin()
    await seed_data()

    # Start the Agent K scheduler (60s polling tick).
    try:
        from agent_k_scheduled import start_scheduler as _ak_start_scheduler
        _ak_start_scheduler()
    except Exception as _e:
        logger.warning("Could not start Agent K scheduler: %s", _e)

    # Start the Hourly Content Sync scheduler (jobs, events, courses).
    try:
        from background_sync import start_sync_scheduler, check_dependencies
        check_dependencies()
        start_sync_scheduler()
    except Exception as _e:
        logger.warning("Could not start background sync scheduler: %s", _e)

    # Start the Workflow Automation cron tick (60s polling).
    try:
        from workflow_automation import run_cron_workflows
        async def _wf_cron_tick():
            while True:
                try:
                    await run_cron_workflows()
                except Exception:
                    pass
                await asyncio.sleep(60)
        asyncio.create_task(_wf_cron_tick())
    except Exception as _e:
        logger.warning("Could not start Workflow cron: %s", _e)


@app.on_event("shutdown")
async def on_shutdown():
    try:
        from agent_k_scheduled import stop_scheduler as _ak_stop_scheduler
        _ak_stop_scheduler()
    except Exception:
        pass
    try:
        from background_sync import stop_sync_scheduler
        stop_sync_scheduler()
    except Exception:
        pass
    client.close()


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

from routers.analytics import router as analytics_router
api_router.include_router(analytics_router)

from routers.integrations import router as integrations_router
api_router.include_router(integrations_router)

from routers.reviews import router as reviews_router
api_router.include_router(reviews_router)

from routers.notifications import router as notifications_router
api_router.include_router(notifications_router)

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
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-Request-Id"],
)

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
