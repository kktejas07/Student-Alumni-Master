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
import io
import base64
import logging
import secrets
import random
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import qrcode
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator

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
# Type Definitions
# ----------------------------------------------------------------------------
# UserRole: 3 primary user types + admin/college (managed roles)
UserRole = Literal["student", "alumni", "mentor", "college", "admin"]

# CareerPath: Drives all personalization on the platform
CareerPath = Literal["job", "higher_education", "startup", "business"]

# EducationLevel: Used for content segmentation per spec
# (+1=Class 11, +2=Class 12, btech=undergrad, masters=postgrad, phd=research)
EducationLevel = Literal["plus_one", "plus_two", "btech", "bachelors", "masters", "phd", "other"]

# MentorCategory: Per spec, mentors must select one specialization
MentorCategory = Literal["it_software", "higher_education", "startup_business", "education"]

# MentorStatus: Mentors are reviewed by admins before being visible to students
MentorStatus = Literal["pending", "approved", "rejected"]


# ----------------------------------------------------------------------------
# Pydantic Models — Request / Response payloads
# ----------------------------------------------------------------------------
class SchoolInfo(BaseModel):
    """Institution / education info common to all roles."""
    institution_name: str
    institution_type: Literal["school", "college", "university"] = "college"
    class_or_year: str  # e.g. "11", "12", "B.Tech 2nd Year", "MBA 1st Year"
    branch_or_stream: Optional[str] = None
    board_or_university: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    graduation_year: Optional[int] = None  # Required for alumni


class MentorInfo(BaseModel):
    """Mentor-specific fields per spec — requires admin approval."""
    category: MentorCategory  # IT/Software, Higher Ed, Startup/Business, Education
    organization: str  # Mandatory: company / institution name
    job_title: str  # Mandatory: designation
    linkedin_url: Optional[str] = None  # Recommended for credibility
    years_of_experience: Optional[int] = None
    bio: Optional[str] = None


class AlumniInfo(BaseModel):
    """Alumni-specific fields per spec."""
    graduation_year: int
    university: str
    current_employer: Optional[str] = None
    current_role: Optional[str] = None
    employment_status: Literal["employed", "self_employed", "studying", "between_jobs"] = "employed"


class StudentInfo(BaseModel):
    """Student-specific fields per spec."""
    age: int  # Minimum age 10+ per spec
    education_level: EducationLevel
    career_interests: List[str] = Field(default_factory=list)


# ----- Auth payloads -----
class RegisterRequest(BaseModel):
    """Initial registration. Role-specific fields collected in onboarding step."""
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v):
        # Enforce minimum 6 chars (frontend should also enforce stronger rules)
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
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
    interests: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    face_image_base64: Optional[str] = None  # Profile photo (base64-encoded)


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
    mentor_status: Optional[MentorStatus] = None  # Only set for mentors
    interests: List[str] = []
    skills: List[str] = []
    bio: Optional[str] = None
    face_image_base64: Optional[str] = None
    onboarding_completed: bool = False
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse


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


def serialize_user(user: dict) -> dict:
    """Strip internal fields (_id, password_hash) from user dict before sending to client."""
    if not user:
        return None
    return {
        "id": str(user.get("_id")),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "role": user.get("role"),
        "phone": user.get("phone"),
        "unique_id": user.get("unique_id"),
        "qr_code_base64": user.get("qr_code_base64"),
        "school_info": user.get("school_info"),
        "career_path": user.get("career_path"),
        "student_info": user.get("student_info"),
        "alumni_info": user.get("alumni_info"),
        "mentor_info": user.get("mentor_info"),
        "mentor_status": user.get("mentor_status"),
        "interests": user.get("interests", []),
        "skills": user.get("skills", []),
        "bio": user.get("bio"),
        "face_image_base64": user.get("face_image_base64"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "created_at": user.get("created_at"),
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
        "phone": req.phone,
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

    return AuthResponse(
        access_token=create_access_token(user_id, email, req.role),
        refresh_token=create_refresh_token(user_id),
        user=UserResponse(**serialize_user(user_doc)),
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Email + password login. Returns JWT access + refresh tokens."""
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    return AuthResponse(
        access_token=create_access_token(str(user["_id"]), email, user["role"]),
        refresh_token=create_refresh_token(str(user["_id"])),
        user=UserResponse(**serialize_user(user)),
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Returns the currently authenticated user."""
    return UserResponse(**serialize_user(user))


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
    if req.student_info:
        update["student_info"] = req.student_info.model_dump()
    if req.alumni_info:
        update["alumni_info"] = req.alumni_info.model_dump()
    if req.mentor_info:
        update["mentor_info"] = req.mentor_info.model_dump()

    await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    return UserResponse(**serialize_user(await db.users.find_one({"_id": user["_id"]})))


@api_router.put("/users/me", response_model=UserResponse)
async def update_profile(updates: dict, user: dict = Depends(get_current_user)):
    """Limited profile self-update — students cannot bypass mentor approval."""
    allowed = {"full_name", "phone", "bio", "interests", "skills", "face_image_base64"}
    safe = {k: v for k, v in updates.items() if k in allowed}
    if safe:
        safe["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": user["_id"]}, {"$set": safe})
    return UserResponse(**serialize_user(await db.users.find_one({"_id": user["_id"]})))


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
    await db.users.update_one(
        {"_id": ObjectId(mentor_id), "role": "mentor"},
        {"$set": {"mentor_status": "approved", "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "approved"}


@api_router.post("/admin/mentors/{mentor_id}/reject")
async def reject_mentor(mentor_id: str, user: dict = Depends(get_current_user)):
    """Admin: reject a mentor application."""
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    await db.users.update_one(
        {"_id": ObjectId(mentor_id), "role": "mentor"},
        {"$set": {"mentor_status": "rejected", "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "rejected"}


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


@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    """Conversational AI chatbot. Persona adapts to user's chosen career path."""
    session_id = req.session_id or f"chat-{user['_id']}-{secrets.token_hex(4)}"
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
    """Map career_path → mentor category for matching logic."""
    return {
        "job": "it_software",
        "higher_education": "higher_education",
        "startup": "startup_business",
        "business": "startup_business",
    }.get(path, "it_software")


@api_router.get("/catalog/internships")
async def list_internships(career_path: Optional[str] = None, limit: int = 20):
    """Module 1: Career Guidelines — internships."""
    query = {"career_paths": career_path} if career_path else {}
    items = await db.internships.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"internships": items}


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
    return booking


@api_router.get("/bookings/me")
async def my_bookings(user: dict = Depends(get_current_user)):
    """Returns bookings for the current user (as student or as mentor)."""
    query = {"student_id": str(user["_id"])} if user["role"] == "student" \
        else {"mentor_id": str(user["_id"])}
    items = await db.bookings.find(query, {"_id": 0}).sort("slot_start_iso", 1).to_list(100)
    return {"bookings": items}


# ----------------------------------------------------------------------------
# Dashboard — unified endpoint with content prioritization
# ----------------------------------------------------------------------------
@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    """Unified dashboard payload. Implements the content-prioritization logic per spec.

    Logic:
    - Filter content by user's career_path (interest-based prioritization)
    - For Class 11/12 students → prioritize scholarships + campus tours
    - For university students → prioritize internships, hackathons, higher ed
    - Surface real-time events with deadlines first
    """
    role = user["role"]
    career = user.get("career_path")
    student = user.get("student_info") or {}
    edu = student.get("education_level", "")

    # ---- Education-level segmentation ----
    is_school_student = edu in ("plus_one", "plus_two")  # Class 11 / 12

    # Interest-based filter for content
    course_q = {"career_paths": career} if career else {}

    courses = await db.courses.find(course_q, {"_id": 0}).limit(4).to_list(4)
    deals = await db.deals.find({}, {"_id": 0}).limit(4).to_list(4)
    internships = await db.internships.find(course_q, {"_id": 0}).limit(4).to_list(4)
    # Real-time events: nearest first
    events = await db.events.find({}, {"_id": 0}).sort("start_date", 1).limit(4).to_list(4)

    cached = await db.career_suggestions.find_one({"user_id": str(user["_id"])}, {"_id": 0})

    return {
        "user": serialize_user(user),
        "stats": {
            "courses_available": await db.courses.count_documents({}),
            "mentors_available": await db.sample_mentors.count_documents({}),
            "internships_available": await db.internships.count_documents({}),
            "deals_available": await db.deals.count_documents({}),
            "events_available": await db.events.count_documents({}),
        },
        "featured_courses": courses,
        "featured_deals": deals,
        "featured_internships": internships,
        "featured_events": events,
        "career_suggestions": cached or None,
        # Personalization metadata for the frontend to adapt the dashboard
        "personalization": {
            "career_path": career,
            "education_level": edu,
            "is_school_student": is_school_student,
            # Module priority order for the dashboard cards
            "priority_modules": (
                ["events", "scholarships", "courses", "campus_tours", "deals", "insurance", "housing"]
                if is_school_student
                else ["career_guidelines", "events", "courses", "networking", "financial", "insurance", "housing", "deals"]
            ),
        },
    }


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
    {"id": "m2", "full_name": "Arjun Mehta", "title": "Founder @ FintechX", "expertise": ["startup", "business"], "category": "startup_business", "tags": ["Entrepreneur", "Fintech"], "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "bio": "Built and sold 2 startups.", "rating": 4.8, "sessions": 110, "linkedin_url": "https://linkedin.com/in/arjun"},
    {"id": "m3", "full_name": "Dr. Anjali Rao", "title": "Professor @ IIT Bombay", "expertise": ["higher_education"], "category": "higher_education", "tags": ["Research", "PhD"], "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400", "bio": "CV researcher; PhD application mentor.", "rating": 5.0, "sessions": 88, "linkedin_url": "https://linkedin.com/in/anjali"},
    {"id": "m4", "full_name": "Rahul Iyer", "title": "VP Strategy @ Tata", "expertise": ["business", "job"], "category": "education", "tags": ["Corporate", "Strategy"], "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400", "bio": "INSEAD MBA; corporate career mentor.", "rating": 4.7, "sessions": 156, "linkedin_url": "https://linkedin.com/in/rahul"},
    {"id": "m5", "full_name": "Sneha Kapoor", "title": "Product Lead @ Stripe", "expertise": ["job", "startup"], "category": "it_software", "tags": ["Product", "Tech"], "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400", "bio": "Engineer-to-PM transitions.", "rating": 4.9, "sessions": 175, "linkedin_url": "https://linkedin.com/in/sneha"},
    {"id": "m6", "full_name": "Vikram Singh", "title": "Investor @ Sequoia", "expertise": ["startup", "business"], "category": "startup_business", "tags": ["VC", "Funding"], "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "bio": "Helping founders raise their seed.", "rating": 4.8, "sessions": 92, "linkedin_url": "https://linkedin.com/in/vikram"},
]

SAMPLE_INTERNSHIPS = [
    {"id": "i1", "title": "Software Engineering Intern", "company": "Microsoft", "location": "Hyderabad / Remote", "stipend": "₹80,000/month", "duration": "3 months", "skills": ["Python", "C++", "Algorithms"], "url": "https://careers.microsoft.com", "image": "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=800", "career_paths": ["job", "higher_education"]},
    {"id": "i2", "title": "Data Science Intern", "company": "Flipkart", "location": "Bangalore", "stipend": "₹60,000/month", "duration": "6 months", "skills": ["Python", "SQL", "ML"], "url": "https://www.flipkartcareers.com", "image": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", "career_paths": ["job"]},
    {"id": "i3", "title": "Product Management Intern", "company": "Razorpay", "location": "Bangalore / Remote", "stipend": "₹50,000/month", "duration": "3 months", "skills": ["Product", "SQL"], "url": "https://razorpay.com/jobs", "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "career_paths": ["job", "startup"]},
    {"id": "i4", "title": "Founders Office Intern", "company": "Zerodha", "location": "Bangalore", "stipend": "₹40,000/month", "duration": "6 months", "skills": ["Strategy", "Business"], "url": "https://zerodha.com/careers", "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", "career_paths": ["business", "startup"]},
    {"id": "i5", "title": "Research Intern", "company": "IIT Madras", "location": "Chennai", "stipend": "₹15,000/month", "duration": "2 months", "skills": ["Research", "Python"], "url": "https://www.iitm.ac.in", "image": "https://images.unsplash.com/photo-1562774053-701939374585?w=800", "career_paths": ["higher_education"]},
    {"id": "i6", "title": "Marketing Intern", "company": "Swiggy", "location": "Bangalore / Remote", "stipend": "₹35,000/month", "duration": "3 months", "skills": ["Marketing", "Analytics"], "url": "https://careers.swiggy.com", "image": "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800", "career_paths": ["job", "business"]},
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
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
