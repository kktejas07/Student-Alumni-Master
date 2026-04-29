"""
Student Career Development Platform - Backend
FastAPI + MongoDB + JWT Auth + Claude AI
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
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import HTTPBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator

# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days for mobile
REFRESH_TOKEN_EXPIRE_DAYS = 30

app = FastAPI(title="Student Career Development Platform API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ----------------------------------------------------------------------------
# Pydantic Models
# ----------------------------------------------------------------------------
UserRole = Literal["student", "alumni", "mentor", "college", "admin"]
CareerPath = Literal["job", "higher_education", "startup", "business"]


class SchoolInfo(BaseModel):
    institution_name: str
    institution_type: Literal["school", "college", "university"] = "college"
    class_or_year: str  # e.g., "11", "12", "B.Tech 2nd Year", "MBA 1st Year"
    branch_or_stream: Optional[str] = None  # e.g., "Science", "Computer Science"
    board_or_university: Optional[str] = None  # e.g., "CBSE", "Anna University"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    graduation_year: Optional[int] = None  # for alumni or future grad year


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str] = None


class RegisterRequest(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OnboardingRequest(BaseModel):
    school_info: SchoolInfo
    career_path: Optional[CareerPath] = None  # required for student/alumni
    interests: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    face_image_base64: Optional[str] = None  # base64 encoded face image


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    unique_id: Optional[str] = None
    qr_code_base64: Optional[str] = None
    school_info: Optional[SchoolInfo] = None
    career_path: Optional[CareerPath] = None
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


class CareerSuggestionRequest(BaseModel):
    additional_context: Optional[str] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    message: str


class JDGeneratorRequest(BaseModel):
    role_title: str
    key_skills: List[str]
    tone: Literal["formal", "casual", "inclusive"] = "formal"


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_unique_id(role: str) -> str:
    """Generate a unique platform ID like SCD-2026-STU-XXXXXX"""
    role_codes = {
        "student": "STU",
        "alumni": "ALM",
        "mentor": "MNT",
        "college": "CLG",
        "admin": "ADM",
    }
    code = role_codes.get(role, "USR")
    year = datetime.now().year
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SCD-{year}-{code}-{rand}"


def generate_qr_code(data: str) -> str:
    """Generate a QR code as base64-encoded PNG."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#121212", back_color="#FDFBF7")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def serialize_user(user_doc: dict) -> dict:
    """Convert a MongoDB user doc into safe response data (no _id, no password_hash)."""
    if not user_doc:
        return None
    return {
        "id": str(user_doc.get("_id")),
        "email": user_doc.get("email"),
        "full_name": user_doc.get("full_name"),
        "role": user_doc.get("role"),
        "phone": user_doc.get("phone"),
        "unique_id": user_doc.get("unique_id"),
        "qr_code_base64": user_doc.get("qr_code_base64"),
        "school_info": user_doc.get("school_info"),
        "career_path": user_doc.get("career_path"),
        "interests": user_doc.get("interests", []),
        "skills": user_doc.get("skills", []),
        "bio": user_doc.get("bio"),
        "face_image_base64": user_doc.get("face_image_base64"),
        "onboarding_completed": user_doc.get("onboarding_completed", False),
        "created_at": user_doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    """Extract & validate JWT from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload["sub"]
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def validate_class_for_student(school_info: SchoolInfo, role: str) -> None:
    """For students, enforce class 11 (+1) and above validation."""
    if role != "student":
        return
    cls = (school_info.class_or_year or "").strip().lower()
    # Reject class 1-10 explicitly. Allow 11, 12, college years, etc.
    if cls.isdigit():
        n = int(cls)
        if n < 11:
            raise HTTPException(
                status_code=400,
                detail="Students must be in Class 11 (+1) or above to register.",
            )
    elif cls in {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10"}:
        raise HTTPException(
            status_code=400,
            detail="Students must be in Class 11 (+1) or above to register.",
        )


# ----------------------------------------------------------------------------
# Auth Endpoints
# ----------------------------------------------------------------------------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "full_name": req.full_name.strip(),
        "role": req.role,
        "phone": req.phone,
        "unique_id": None,  # generated post-onboarding
        "qr_code_base64": None,
        "school_info": None,
        "career_path": None,
        "interests": [],
        "skills": [],
        "bio": None,
        "face_image_base64": None,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access = create_access_token(user_id, email, req.role)
    refresh = create_refresh_token(user_id)
    user_doc["_id"] = result.inserted_id

    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserResponse(**serialize_user(user_doc)),
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    access = create_access_token(user_id, email, user["role"])
    refresh = create_refresh_token(user_id)

    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserResponse(**serialize_user(user)),
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**serialize_user(user))


@api_router.post("/auth/refresh")
async def refresh_token(payload: dict):
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing refresh_token")
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(data["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"], user["role"])
        return {"access_token": access}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ----------------------------------------------------------------------------
# Onboarding & Profile Endpoints
# ----------------------------------------------------------------------------
@api_router.post("/users/onboarding", response_model=UserResponse)
async def complete_onboarding(req: OnboardingRequest, user: dict = Depends(get_current_user)):
    role = user["role"]

    # Validation: student must be class 11+
    validate_class_for_student(req.school_info, role)

    # career_path is required for student/alumni
    if role in {"student", "alumni"} and not req.career_path:
        raise HTTPException(status_code=400, detail="Career path is required for students and alumni")

    # Generate unique ID + QR code (only on first onboarding)
    unique_id = user.get("unique_id") or generate_unique_id(role)
    qr_payload = f"SCD-USER:{unique_id}|{user['email']}|{role}"
    qr_code = generate_qr_code(qr_payload)

    update_data = {
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

    await db.users.update_one({"_id": user["_id"]}, {"$set": update_data})
    updated = await db.users.find_one({"_id": user["_id"]})
    return UserResponse(**serialize_user(updated))


@api_router.put("/users/me", response_model=UserResponse)
async def update_profile(updates: dict, user: dict = Depends(get_current_user)):
    """Allow updating limited profile fields."""
    allowed = {"full_name", "phone", "bio", "interests", "skills", "face_image_base64"}
    safe_updates = {k: v for k, v in updates.items() if k in allowed}
    if safe_updates:
        safe_updates["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": user["_id"]}, {"$set": safe_updates})
    updated = await db.users.find_one({"_id": user["_id"]})
    return UserResponse(**serialize_user(updated))


# ----------------------------------------------------------------------------
# AI Endpoints (Claude via emergentintegrations)
# ----------------------------------------------------------------------------
async def get_claude_chat(session_id: str, system_message: str):
    from emergentintegrations.llm.chat import LlmChat
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    return chat


CAREER_PATH_SYSTEM_PROMPTS = {
    "job": "You are an expert career counselor specializing in employment & job-market readiness. Your goal is to give a clear, actionable career roadmap focused on landing roles in industry.",
    "higher_education": "You are an academic advisor specializing in higher education paths (Masters, PhD, research). Recommend the best academic trajectory, top universities, entrance exams, and research areas.",
    "startup": "You are a startup mentor and entrepreneurship coach. Help students prepare to build their own startup with the right skills, network, MVP strategy, and funding readiness.",
    "business": "You are a business strategy advisor. Guide students toward leadership, MBA prep, family-business modernization, and corporate / business career trajectories.",
}


@api_router.post("/ai/career-suggestions")
async def get_career_suggestions(req: CareerSuggestionRequest, user: dict = Depends(get_current_user)):
    """Generate AI-powered career roadmap based on user's profile and chosen career path."""
    if not user.get("onboarding_completed"):
        raise HTTPException(status_code=400, detail="Please complete onboarding first")

    career_path = user.get("career_path")
    if not career_path:
        raise HTTPException(status_code=400, detail="Career path not selected")

    system_msg = CAREER_PATH_SYSTEM_PROMPTS.get(career_path, CAREER_PATH_SYSTEM_PROMPTS["job"])
    session_id = f"career-{user['_id']}"

    school = user.get("school_info") or {}
    profile_summary = (
        f"User: {user.get('full_name')}\n"
        f"Role: {user.get('role')}\n"
        f"Career Path: {career_path}\n"
        f"Institution: {school.get('institution_name')}\n"
        f"Class/Year: {school.get('class_or_year')}\n"
        f"Branch: {school.get('branch_or_stream')}\n"
        f"Interests: {', '.join(user.get('interests', []))}\n"
        f"Skills: {', '.join(user.get('skills', []))}\n"
    )

    prompt = (
        f"Here is a student's profile:\n{profile_summary}\n"
        f"Additional context: {req.additional_context or 'None'}\n\n"
        "Provide a personalized career roadmap as JSON with this exact structure (no extra text):\n"
        "{\n"
        '  "summary": "1-2 sentence overview of the recommended path",\n'
        '  "milestones": [\n'
        '    {"title": "...", "timeframe": "0-3 months", "actions": ["...", "..."]},\n'
        '    {"title": "...", "timeframe": "3-12 months", "actions": ["..."]},\n'
        '    {"title": "...", "timeframe": "1-3 years", "actions": ["..."]}\n'
        '  ],\n'
        '  "recommended_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],\n'
        '  "recommended_courses": ["course1", "course2", "course3"],\n'
        '  "mentor_traits": ["trait1", "trait2", "trait3"]\n'
        "}\n"
        "Respond with raw JSON only."
    )

    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = await get_claude_chat(session_id, system_msg)
        response = await chat.send_message(UserMessage(text=prompt))
        # Try to parse JSON
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
            data = {"summary": response, "milestones": [], "recommended_skills": [], "recommended_courses": [], "mentor_traits": []}

        # Cache the suggestion
        await db.career_suggestions.update_one(
            {"user_id": str(user["_id"])},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc), "career_path": career_path}},
            upsert=True,
        )
        return data
    except Exception as e:
        logger.error(f"Career AI failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@api_router.get("/ai/career-suggestions/cached")
async def get_cached_suggestions(user: dict = Depends(get_current_user)):
    cached = await db.career_suggestions.find_one({"user_id": str(user["_id"])}, {"_id": 0})
    return cached or {}


@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    """AI chatbot for career guidance."""
    session_id = req.session_id or f"chat-{user['_id']}-{secrets.token_hex(4)}"
    career_path = user.get("career_path") or "job"
    base_prompt = CAREER_PATH_SYSTEM_PROMPTS.get(career_path, CAREER_PATH_SYSTEM_PROMPTS["job"])
    system_msg = (
        f"{base_prompt}\n\n"
        f"You are speaking with {user.get('full_name')}, a {user.get('role')}. "
        "Keep replies concise (2-4 short paragraphs), friendly, and actionable."
    )

    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = await get_claude_chat(session_id, system_msg)
        reply = await chat.send_message(UserMessage(text=req.message))

        # Persist chat history
        await db.chat_messages.insert_many([
            {
                "user_id": str(user["_id"]),
                "session_id": session_id,
                "role": "user",
                "content": req.message,
                "created_at": datetime.now(timezone.utc),
            },
            {
                "user_id": str(user["_id"]),
                "session_id": session_id,
                "role": "assistant",
                "content": reply,
                "created_at": datetime.now(timezone.utc),
            },
        ])

        return ChatResponse(session_id=session_id, message=reply)
    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@api_router.get("/ai/chat/history")
async def chat_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": str(user["_id"])}
    if session_id:
        query["session_id"] = session_id
    msgs = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(200)
    # Convert datetime to ISO
    for m in msgs:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return {"messages": msgs}


@api_router.post("/ai/jd-generator")
async def generate_jd(req: JDGeneratorRequest, user: dict = Depends(get_current_user)):
    """Generate Job Description from role + skills (placeholder for future ATS phase)."""
    system_msg = "You are an expert HR copywriter. Generate concise, inclusive job descriptions."
    session_id = f"jd-{user['_id']}-{secrets.token_hex(4)}"
    prompt = (
        f"Role: {req.role_title}\n"
        f"Key Skills: {', '.join(req.key_skills)}\n"
        f"Tone: {req.tone}\n"
        "Generate a job description with sections: Overview, Responsibilities, Requirements, Nice-to-Have, Benefits."
    )
    try:
        from emergentintegrations.llm.chat import UserMessage
        chat = await get_claude_chat(session_id, system_msg)
        text = await chat.send_message(UserMessage(text=prompt))
        return {"job_description": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


# ----------------------------------------------------------------------------
# Catalog / Discovery Endpoints (curated seed data)
# ----------------------------------------------------------------------------
@api_router.get("/catalog/courses")
async def list_courses(career_path: Optional[str] = None, limit: int = 20):
    query = {}
    if career_path:
        query["career_paths"] = career_path
    courses = await db.courses.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"courses": courses}


@api_router.get("/catalog/mentors")
async def list_mentors(career_path: Optional[str] = None, limit: int = 20):
    query = {"role": "mentor"}
    if career_path:
        query["expertise"] = career_path
    mentors = await db.users.find(query, {"password_hash": 0, "face_image_base64": 0}).limit(limit).to_list(limit)
    for m in mentors:
        m["id"] = str(m["_id"])
        m.pop("_id", None)
    # Plus seeded sample mentors
    sample = await db.sample_mentors.find(query if query else {}, {"_id": 0}).limit(limit).to_list(limit)
    return {"mentors": mentors + sample}


@api_router.get("/catalog/internships")
async def list_internships(career_path: Optional[str] = None, limit: int = 20):
    query = {}
    if career_path:
        query["career_paths"] = career_path
    items = await db.internships.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"internships": items}


@api_router.get("/catalog/deals")
async def list_deals(category: Optional[str] = None, limit: int = 20):
    query = {}
    if category:
        query["category"] = category
    deals = await db.deals.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"deals": deals}


@api_router.get("/catalog/resources")
async def list_resources(category: Optional[str] = None):
    """Returns insurance/housing/loans resources."""
    query = {}
    if category:
        query["category"] = category
    items = await db.resources.find(query, {"_id": 0}).to_list(100)
    return {"resources": items}


# ----------------------------------------------------------------------------
# Dashboard
# ----------------------------------------------------------------------------
@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    role = user["role"]
    career = user.get("career_path")

    # Pull personalized counts/items
    course_q = {"career_paths": career} if career else {}
    courses = await db.courses.find(course_q, {"_id": 0}).limit(4).to_list(4)
    deals = await db.deals.find({}, {"_id": 0}).limit(4).to_list(4)
    internships = await db.internships.find(course_q, {"_id": 0}).limit(4).to_list(4)
    mentors_count = await db.sample_mentors.count_documents({})
    cached_suggestions = await db.career_suggestions.find_one({"user_id": str(user["_id"])}, {"_id": 0})

    return {
        "user": serialize_user(user),
        "stats": {
            "courses_available": await db.courses.count_documents({}),
            "mentors_available": mentors_count,
            "internships_available": await db.internships.count_documents({}),
            "deals_available": await db.deals.count_documents({}),
        },
        "featured_courses": courses,
        "featured_deals": deals,
        "featured_internships": internships,
        "career_suggestions": cached_suggestions or None,
    }


# ----------------------------------------------------------------------------
# Health
# ----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "Student Career Development Platform"}


# ----------------------------------------------------------------------------
# Seed Data
# ----------------------------------------------------------------------------
SAMPLE_COURSES = [
    {"id": "c1", "title": "CS50 - Introduction to Computer Science", "provider": "Harvard / edX", "url": "https://cs50.harvard.edu", "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", "duration": "12 weeks", "level": "Beginner", "is_free": True, "career_paths": ["job", "higher_education", "startup"]},
    {"id": "c2", "title": "Google Data Analytics Professional", "provider": "Coursera (Google)", "url": "https://www.coursera.org/professional-certificates/google-data-analytics", "image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", "duration": "6 months", "level": "Intermediate", "is_free": False, "career_paths": ["job", "business"]},
    {"id": "c3", "title": "How to Start a Startup", "provider": "Y Combinator (Free)", "url": "https://www.startupschool.org", "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "duration": "10 weeks", "level": "Beginner", "is_free": True, "career_paths": ["startup", "business"]},
    {"id": "c4", "title": "MIT 6.006 - Introduction to Algorithms", "provider": "MIT OCW", "url": "https://ocw.mit.edu", "image": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800", "duration": "Self-paced", "level": "Advanced", "is_free": True, "career_paths": ["higher_education", "job"]},
    {"id": "c5", "title": "GRE / GMAT Prep Masterclass", "provider": "Khan Academy", "url": "https://www.khanacademy.org", "image": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800", "duration": "Self-paced", "level": "All", "is_free": True, "career_paths": ["higher_education"]},
    {"id": "c6", "title": "The Lean Startup MBA", "provider": "Udemy", "url": "https://www.udemy.com", "image": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800", "duration": "20 hours", "level": "Intermediate", "is_free": False, "career_paths": ["startup", "business"]},
    {"id": "c7", "title": "AWS Cloud Practitioner", "provider": "AWS (Free)", "url": "https://aws.amazon.com/training", "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", "duration": "8 weeks", "level": "Beginner", "is_free": True, "career_paths": ["job"]},
    {"id": "c8", "title": "Financial Markets - Yale", "provider": "Coursera (Yale)", "url": "https://www.coursera.org/learn/financial-markets-global", "image": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=800", "duration": "33 hours", "level": "Beginner", "is_free": True, "career_paths": ["business", "higher_education"]},
]

SAMPLE_MENTORS = [
    {"id": "m1", "full_name": "Priya Sharma", "title": "Senior SWE @ Google", "expertise": ["job"], "tags": ["Tech", "FAANG"], "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", "bio": "10+ years in distributed systems. Helping students prep for top tech roles.", "rating": 4.9, "sessions": 230},
    {"id": "m2", "full_name": "Arjun Mehta", "title": "Founder @ FintechX", "expertise": ["startup", "business"], "tags": ["Entrepreneur", "Fintech"], "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "bio": "Built and sold 2 startups. Currently advising YC companies.", "rating": 4.8, "sessions": 110},
    {"id": "m3", "full_name": "Dr. Anjali Rao", "title": "Professor @ IIT Bombay", "expertise": ["higher_education"], "tags": ["Research", "PhD"], "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400", "bio": "Computer Vision researcher. Mentor for grad school applications.", "rating": 5.0, "sessions": 88},
    {"id": "m4", "full_name": "Rahul Iyer", "title": "VP Strategy @ Tata", "expertise": ["business", "job"], "tags": ["Corporate", "Strategy"], "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400", "bio": "MBA from INSEAD. Helping students navigate corporate careers.", "rating": 4.7, "sessions": 156},
    {"id": "m5", "full_name": "Sneha Kapoor", "title": "Product Lead @ Stripe", "expertise": ["job", "startup"], "tags": ["Product", "Tech"], "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400", "bio": "Product management mentor. From engineer to PM transitions.", "rating": 4.9, "sessions": 175},
    {"id": "m6", "full_name": "Vikram Singh", "title": "Investor @ Sequoia", "expertise": ["startup", "business"], "tags": ["VC", "Funding"], "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "bio": "Helping startup founders pitch and raise their seed rounds.", "rating": 4.8, "sessions": 92},
]

SAMPLE_INTERNSHIPS = [
    {"id": "i1", "title": "Software Engineering Intern", "company": "Microsoft", "location": "Hyderabad / Remote", "stipend": "₹80,000/month", "duration": "3 months", "skills": ["Python", "C++", "Algorithms"], "url": "https://careers.microsoft.com", "image": "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=800", "career_paths": ["job", "higher_education"]},
    {"id": "i2", "title": "Data Science Intern", "company": "Flipkart", "location": "Bangalore", "stipend": "₹60,000/month", "duration": "6 months", "skills": ["Python", "SQL", "ML"], "url": "https://www.flipkartcareers.com", "image": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", "career_paths": ["job"]},
    {"id": "i3", "title": "Product Management Intern", "company": "Razorpay", "location": "Bangalore / Remote", "stipend": "₹50,000/month", "duration": "3 months", "skills": ["Product", "SQL", "Communication"], "url": "https://razorpay.com/jobs", "image": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", "career_paths": ["job", "startup"]},
    {"id": "i4", "title": "Founders Office Intern", "company": "Zerodha", "location": "Bangalore", "stipend": "₹40,000/month", "duration": "6 months", "skills": ["Strategy", "Business", "Writing"], "url": "https://zerodha.com/careers", "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", "career_paths": ["business", "startup"]},
    {"id": "i5", "title": "Research Intern", "company": "IIT Madras", "location": "Chennai", "stipend": "₹15,000/month", "duration": "2 months", "skills": ["Research", "LaTeX", "Python"], "url": "https://www.iitm.ac.in", "image": "https://images.unsplash.com/photo-1562774053-701939374585?w=800", "career_paths": ["higher_education"]},
    {"id": "i6", "title": "Marketing Intern", "company": "Swiggy", "location": "Bangalore / Remote", "stipend": "₹35,000/month", "duration": "3 months", "skills": ["Marketing", "Analytics", "Content"], "url": "https://careers.swiggy.com", "image": "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800", "career_paths": ["job", "business"]},
]

SAMPLE_DEALS = [
    {"id": "d1", "title": "GitHub Student Developer Pack", "brand": "GitHub", "category": "Tech", "discount": "Free Pro tools worth $200K+", "code": "STUDENT-PACK", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800", "url": "https://education.github.com/pack"},
    {"id": "d2", "title": "Notion Personal Pro - Free for Students", "brand": "Notion", "category": "Productivity", "discount": "100% OFF Pro plan", "code": "STUDENT-FREE", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800", "url": "https://www.notion.so/students"},
    {"id": "d3", "title": "Figma Education Plan", "brand": "Figma", "category": "Design", "discount": "100% OFF Professional", "code": "EDU-FIGMA", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800", "url": "https://www.figma.com/education"},
    {"id": "d4", "title": "Zomato Pro - 50% OFF for Students", "brand": "Zomato", "category": "Food", "discount": "50% OFF first 6 months", "code": "STUDENT50", "expires": "31 Dec 2026", "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", "url": "https://www.zomato.com"},
    {"id": "d5", "title": "Spotify Premium Student Plan", "brand": "Spotify", "category": "Entertainment", "discount": "₹59/month (₹119 OFF)", "code": "STUDENT-IND", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800", "url": "https://www.spotify.com/student"},
    {"id": "d6", "title": "Apple Education Store - Up to 10% OFF Macs", "brand": "Apple", "category": "Tech", "discount": "Up to 10% OFF + Free AirPods", "code": "EDU-APPLE", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", "url": "https://www.apple.com/in-edu/store"},
    {"id": "d7", "title": "Coursera Plus - 1 Year Free Courses", "brand": "Coursera", "category": "Education", "discount": "Free for select students", "code": "COURSERA-EDU", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800", "url": "https://www.coursera.org"},
    {"id": "d8", "title": "Amazon Prime Student - 50% OFF", "brand": "Amazon", "category": "Shopping", "discount": "₹749/year (50% OFF)", "code": "PRIME-STUDENT", "expires": "Ongoing", "image": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800", "url": "https://www.amazon.in/amazonprime"},
]

SAMPLE_RESOURCES = [
    {"id": "r1", "category": "insurance", "title": "Star Health Student Care", "provider": "Star Health Insurance", "description": "Comprehensive health cover for students aged 16-25", "url": "https://www.starhealth.in", "highlight": "₹2,500/year"},
    {"id": "r2", "category": "insurance", "title": "HDFC ERGO Student Travel", "provider": "HDFC ERGO", "description": "Travel & study-abroad insurance for international students", "url": "https://www.hdfcergo.com", "highlight": "From ₹5,000"},
    {"id": "r3", "category": "housing", "title": "Stanza Living - Co-living Hostels", "provider": "Stanza Living", "description": "Premium co-living spaces for students across 25+ Indian cities", "url": "https://www.stanzaliving.com", "highlight": "From ₹8,000/mo"},
    {"id": "r4", "category": "housing", "title": "OYO Life - Long Stay PG", "provider": "OYO Life", "description": "Furnished PG accommodation near major colleges", "url": "https://www.oyorooms.com/oyo-life", "highlight": "From ₹6,500/mo"},
    {"id": "r5", "category": "loans", "title": "HDFC Credila Education Loan", "provider": "HDFC Credila", "description": "Education loans up to ₹1.5 Cr for India and abroad", "url": "https://www.hdfccredila.com", "highlight": "From 9.5% p.a."},
    {"id": "r6", "category": "loans", "title": "SBI Scholar Loan", "provider": "State Bank of India", "description": "Government-backed education loan with subsidy options", "url": "https://www.sbi.co.in", "highlight": "From 8.55% p.a."},
    {"id": "r7", "category": "loans", "title": "Avanse Global Education Loan", "provider": "Avanse Financial Services", "description": "Loans for studying abroad with flexible repayment", "url": "https://www.avanse.com", "highlight": "Up to ₹75 L"},
]


async def seed_data():
    """Seed catalog collections if empty."""
    if await db.courses.count_documents({}) == 0:
        await db.courses.insert_many([dict(c) for c in SAMPLE_COURSES])
        logger.info("Seeded courses")
    if await db.sample_mentors.count_documents({}) == 0:
        await db.sample_mentors.insert_many([dict(m) for m in SAMPLE_MENTORS])
        logger.info("Seeded mentors")
    if await db.internships.count_documents({}) == 0:
        await db.internships.insert_many([dict(i) for i in SAMPLE_INTERNSHIPS])
        logger.info("Seeded internships")
    if await db.deals.count_documents({}) == 0:
        await db.deals.insert_many([dict(d) for d in SAMPLE_DEALS])
        logger.info("Seeded deals")
    if await db.resources.count_documents({}) == 0:
        await db.resources.insert_many([dict(r) for r in SAMPLE_RESOURCES])
        logger.info("Seeded resources")


async def seed_admin():
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
            "unique_id": "SCD-2026-ADM-000001",
            "qr_code_base64": generate_qr_code(f"SCD-USER:SCD-2026-ADM-000001|{admin_email}|admin"),
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
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info("Admin password updated to match .env")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("unique_id")
    await db.career_suggestions.create_index("user_id")
    await db.chat_messages.create_index([("user_id", 1), ("session_id", 1)])
    await seed_admin()
    await seed_data()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ----------------------------------------------------------------------------
# Mount router & middleware
# ----------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
