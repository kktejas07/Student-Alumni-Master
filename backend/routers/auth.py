import asyncio
import base64
import io
import logging
import os
import random
import re
import secrets
import string
import time
from datetime import datetime, timedelta, timezone, date as _date
from typing import Dict, List, Optional, Any

import jwt
import pyotp
import qrcode  # type: ignore
try:
    from google.oauth2 import id_token as g_id
    from google.auth.transport import requests as g_req
except ImportError:
    g_id = None
    g_req = None

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, EmailStr, field_validator
from bson import ObjectId

from core.middleware import get_real_ip
from core.db import db
from core.config import limiter, frontend_base_url
from core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    encrypt_value, decrypt_value, _audit_log, _audit_log_many,
    generate_unique_id, generate_qr_code,
)
from core.models import SelfServiceRole, AuthResponse, UserResponse
from core.security import serialize_user
from core.deps import get_current_user, decode_payload, decode_payload_silent, bearer_token
from core.email import send_email
from core.email_quality import assess
try:
    from firebase_admin import credentials, initialize_app, auth as fb_auth
except ImportError:
    credentials = None  # type: ignore
    initialize_app = None  # type: ignore
    fb_auth = None  # type: ignore

router = APIRouter(tags=["auth"])
logger = logging.getLogger("auth")

# ── Roles Allowed & Forbidden for Public Self-Registration ─────────────
ALLOWED_REGISTRATION_ROLES = {"student", "alumni", "mentor", "college"}
FORBIDDEN_REGISTRATION_ROLES = {
    "admin", "super_admin", "superadmin", "college_admin", "support",
    "administrator", "system_admin", "root"
}

# ── HttpOnly Cookie Helpers for Session Storage Hardening ──────────────
def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    is_prod = os.getenv("ENV") == "production"
    response.set_cookie(
        key="scd_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/api/auth",
        max_age=30 * 24 * 3600,
    )

def _clear_refresh_cookie(response: Response) -> None:
    is_prod = os.getenv("ENV") == "production"
    response.delete_cookie(
        key="scd_refresh_token",
        path="/api/auth",
        httponly=True,
        secure=is_prod,
        samesite="lax",
    )

# ── Login Rate Limiting & Failed Attempt Throttling ───────────────────
_failed_login_attempts: Dict[str, List[float]] = {}
_FAILED_LOGIN_WINDOW = 60.0  # 60-second sliding window
_MAX_FAILED_LOGINS = 5       # Max 5 failed attempts before throttling

def _record_failed_login(key: str) -> bool:
    now = time.time()
    cutoff = now - _FAILED_LOGIN_WINDOW
    history = [t for t in _failed_login_attempts.get(key, []) if t > cutoff]
    history.append(now)
    _failed_login_attempts[key] = history
    return len(history) >= _MAX_FAILED_LOGINS

def _is_login_throttled(key: str) -> bool:
    now = time.time()
    cutoff = now - _FAILED_LOGIN_WINDOW
    history = [t for t in _failed_login_attempts.get(key, []) if t > cutoff]
    _failed_login_attempts[key] = history
    return len(history) >= _MAX_FAILED_LOGINS

def _clear_failed_logins(key: str) -> None:
    _failed_login_attempts.pop(key, None)

try:
    from activity_credits import _record_activity
except ImportError:
    try:
        from backend.activity_credits import _record_activity
    except ImportError:
        _record_activity = None


async def _try_record_activity(user: dict, activity_type: str = "daily_login") -> None:
    """Best-effort activity credit recording. Never raises or breaks auth flows."""
    if not _record_activity or not user:
        return
    try:
        await _record_activity(user, activity_type)
    except Exception as e:
        logger.warning(f"[AUTH] Could not record {activity_type} activity: {e}")


def _compute_age(dob_str: Optional[str]) -> Optional[int]:
    """Compute age in whole years from an ISO YYYY-MM-DD DOB string."""
    if not dob_str:
        return None
    try:
        d = _date.fromisoformat(dob_str)
    except Exception:
        return None
    today = _date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


def _assert_min_age(role: str, age: Optional[int]) -> None:
    """Enforce platform age policy server-side.

    Students (and only students) may be 13+; all other roles require 18+.
    """
    if age is None:
        raise HTTPException(status_code=400, detail="Date of birth is required")
    if role == "student":
        if age < 13:
            raise HTTPException(status_code=400, detail="You must be at least 13 years old to register")
        return
    if age < 18:
        raise HTTPException(status_code=400, detail="You must be at least 18 years old to register")

# ----- Auth payloads -----
class RegisterRequest(BaseModel):
    """Initial registration. Role-specific fields collected in onboarding step."""
    email: EmailStr
    password: str
    full_name: str
    # Typed allowlist (core.models.SelfServiceRole) plus the validator below,
    # which normalises case/whitespace and answers 403 for privileged roles.
    role: SelfServiceRole
    phone: Optional[str] = None
    # Per spec — Date of Birth is mandatory at registration. ISO 8601 (YYYY-MM-DD).
    # Backend enforces minimum age of 18 unless the role is 'student' (>=13).
    dob: Optional[str] = None
    # Country alpha-2 code for phone/postal code validation context.
    country_code: Optional[str] = None
    # Postal / PIN code (validated per country at the frontend; stored verbatim).
    postal_code: Optional[str] = None

    @field_validator("role", mode="before")
    @classmethod
    def _validate_role_field(cls, v):
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in FORBIDDEN_REGISTRATION_ROLES or clean in ("admin", "super_admin", "superadmin", "college_admin", "system_admin"):
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: Self-assignment of privileged role '{v}' is prohibited"
                )
            if clean not in ALLOWED_REGISTRATION_ROLES:
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: Role '{v}' is not permitted for self-registration"
                )
            return clean
        return v

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


class CheckEmailRequest(BaseModel):
    email: EmailStr


class OAuthCallback(BaseModel):
    """Generic OAuth callback payload sent from the Expo client."""
    id_token: Optional[str] = None         # Google ID token (JWT)
    access_token: Optional[str] = None     # Provider access token (LinkedIn)
    # MOCK MODE — the client may pass these directly in dev. In production
    # these are extracted server-side from the verified provider token.
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[SelfServiceRole] = "student"   # Used only when creating a new account



# ----- Auth Endpoints -----
@router.post("/auth/register", response_model=AuthResponse)
@limiter.limit("60/minute")
async def register(request: Request, response: Response, req: RegisterRequest):
    """Register a new user. Public registration strictly enforces non-privileged roles."""
    role_norm = str(req.role or "").strip().lower()
    if role_norm in FORBIDDEN_REGISTRATION_ROLES or role_norm not in ALLOWED_REGISTRATION_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Administrative roles cannot be self-assigned during registration."
        )

    email = req.email.lower().strip()
    blocked = await assess(email, mx=True)
    if blocked:
        raise HTTPException(400, blocked)
    if await db.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(400, "Email already registered")

    # Server-side age gate — role-aware (students 13+, everyone else 18+).
    _assert_min_age(role_norm, _compute_age(req.dob))

    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "full_name": req.full_name.strip(),
        "role": role_norm,
        "is_super_admin": False,
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
        "mentor_status": "pending" if role_norm == "mentor" else None,
        "interests": [],
        "skills": [],
        "bio": None,
        "face_image_base64": None,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc),
        "last_login": datetime.now(timezone.utc),
    }
    try:
        result = await db.users.insert_one(user_doc)
    except Exception as e:
        # Duplicate-key race: another request created the same email between the
        # find_one above and this insert (unique email index enforces it).
        if "duplicate key" in str(e).lower() or getattr(e, "code", None) == 11000:
            raise HTTPException(400, "Email already registered")
        raise
    user_id = str(result.inserted_id)
    user_doc["_id"] = result.inserted_id

    # Audit log — capture the registration payload for compliance.
    await _audit_log_many(user_id=user_id, source="register", entries=[
        ("email",        None, req.email),
        ("full_name",    None, req.full_name),
        ("role",         None, role_norm),
        ("phone",        None, encrypt_value(req.phone or "")),
        ("dob",          None, encrypt_value(req.dob or "")),
        ("country_code", None, req.country_code or ""),
        ("postal_code",  None, encrypt_value(req.postal_code or "")),
    ])

    access_token = create_access_token(user_id, email, role_norm)
    refresh_token = create_refresh_token(user_id)
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(**serialize_user(user_doc)),
    )


async def _check_email_core(request: Request, email_raw: str):
    email = str(email_raw or "").lower().strip()
    if not email or "@" not in email:
        raise HTTPException(422, "Invalid email address")
    user = await db.users.find_one({"email": email}, {"_id": 1})
    if not user:
        blocked = await assess(email, mx=False)
        if blocked:
            return {"exists": False, "blocked": True, "reason": blocked}
        return {"exists": False}
    # Security hardening: Never disclose full_name, role, or user metadata to unauthenticated callers
    return {"exists": True}


@router.get("/auth/check-email")
@limiter.limit("10/minute")
async def check_email_get(request: Request, email: str = Query(...)):
    """Smart Email Detect (GET) — minimal existence check without leaking PII or roles."""
    return await _check_email_core(request, email)


@router.post("/auth/check-email")
@limiter.limit("10/minute")
async def check_email_post(request: Request, req: CheckEmailRequest):
    """Smart Email Detect (POST) — minimal existence check without leaking PII or roles."""
    return await _check_email_core(request, req.email)


@router.post("/auth/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, req: ForgotPasswordRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        # Return success even if user doesn't exist to prevent email enumeration
        return {"success": True}
        
    import random
    import hashlib
    
    otp = str(random.randint(100000, 999999))
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    # Use timezone-aware datetime (UTC) — avoids naive vs aware comparison bugs
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_otp_hash": otp_hash,
                "reset_otp_expires": expires,
                "reset_otp_attempts": 0,          # reset brute-force counter
            },
            "$unset": {"reset_otp": ""}
        }
    )
    
    body = f"<p>Your password reset code is: <strong>{otp}</strong></p><p>This code will expire in 15 minutes.</p>"
    
    import asyncio
    asyncio.create_task(send_email(email, "Password Reset Code", body))
    # Best-effort WhatsApp with the reset code
    try:
        from core.whatsapp import send_wa_message as _wa
        phone = (user.get("phone") or "").strip()
        if phone:
            asyncio.create_task(_wa(phone=phone, text=f"🔑 *Password Reset Code*\n\nYour code is: *{otp}*\n\nExpires in 15 minutes. If you didn't request this, ignore this message.", kind="password_reset"))
    except Exception:
        pass

    return {"success": True}


@router.post("/auth/verify-reset-otp")
@limiter.limit("5/minute")
async def verify_reset_otp(request: Request, req: VerifyResetOtpRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(400, "Invalid email or OTP")

    import hashlib
    otp_hash = user.get("reset_otp_hash")
    expires = user.get("reset_otp_expires")
    attempts = user.get("reset_otp_attempts", 0)

    # Brute-force guard: 5 wrong attempts invalidates the OTP
    if attempts >= 5:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$unset": {"reset_otp_hash": "", "reset_otp_expires": "", "reset_otp_attempts": ""}}
        )
        raise HTTPException(429, "Too many attempts. Please request a new OTP.")

    # Timezone-aware expiry check
    now_utc = datetime.now(timezone.utc)
    exp_aware = expires.replace(tzinfo=timezone.utc) if expires and expires.tzinfo is None else expires
    if not otp_hash or not expires or now_utc > exp_aware:
        raise HTTPException(400, "OTP expired or invalid")

    req_hash = hashlib.sha256(req.otp.strip().encode()).hexdigest()
    if otp_hash != req_hash:
        # Increment failed attempt counter
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"reset_otp_attempts": 1}}
        )
        raise HTTPException(400, "Invalid OTP")

    return {"success": True}


@router.post("/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, req: ResetPasswordRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(400, "Invalid email or OTP")

    import hashlib
    otp_hash = user.get("reset_otp_hash")
    expires = user.get("reset_otp_expires")
    attempts = user.get("reset_otp_attempts", 0)

    # Brute-force guard
    if attempts >= 5:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$unset": {"reset_otp_hash": "", "reset_otp_expires": "", "reset_otp_attempts": ""}}
        )
        raise HTTPException(429, "Too many attempts. Please request a new OTP.")

    # Timezone-aware expiry check
    now_utc = datetime.now(timezone.utc)
    exp_aware = expires.replace(tzinfo=timezone.utc) if expires and expires.tzinfo is None else expires
    if not otp_hash or not expires or now_utc > exp_aware:
        raise HTTPException(400, "OTP expired or invalid")

    req_hash = hashlib.sha256(req.otp.strip().encode()).hexdigest()
    if otp_hash != req_hash:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"reset_otp_attempts": 1}}
        )
        raise HTTPException(400, "OTP expired or invalid")

    new_hashed = hash_password(req.new_password)

    # CRITICAL FIX: write to "password_hash" — same field that login reads.
    # Previous code wrote to "hashed_password" (wrong field) which silently
    # broke login for any user who had reset their password.
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": new_hashed},
            "$unset": {
                "reset_otp_hash": "",
                "reset_otp_expires": "",
                "reset_otp_attempts": "",
            }
        }
    )

    return {"success": True}


@router.post("/auth/login")
@limiter.limit("120/minute")
async def login(request: Request, response: Response, req: LoginRequest):
    """Email + password login with abuse throttling and HttpOnly cookie issuance."""
    client_ip = get_real_ip(request)
    email = req.email.lower().strip()
    throttle_key = f"{client_ip}:{email}"

    # Brute-force protection: throttle excessive failed login attempts per IP+account
    if _is_login_throttled(throttle_key):
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again later.",
            headers={"Retry-After": "60"}
        )

    user = await db.users.find_one({"email": email}, {"resume_documents": 0})
    if not user:
        _record_failed_login(throttle_key)
        raise HTTPException(401, "Invalid email or password")

    loop = asyncio.get_running_loop()
    pw_hash = user.get("password_hash") or user.get("hashed_password", "")
    is_valid = await loop.run_in_executor(None, verify_password, req.password, pw_hash) if pw_hash else False

    if not is_valid:
        _record_failed_login(throttle_key)
        raise HTTPException(401, "Invalid email or password")

    # Clear failed attempt counters upon successful credential validation
    _clear_failed_logins(throttle_key)

    # ── 2FA branch ──
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

    # ── Token generation ──
    access_token  = create_access_token(str(user["_id"]), email, user["role"])
    refresh_token = create_refresh_token(str(user["_id"]))

    try:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        await _try_record_activity(user, "daily_login")
    except Exception as e:
        logger.warning(f"[LOGIN] Failed to update last_login: {e}")

    # Set hardened HttpOnly cookie for web browsers
    _set_refresh_cookie(response, refresh_token)
    user_payload = UserResponse(**serialize_user(user))

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_payload,
    )


class RefreshTokenPayload(BaseModel):
    refresh_token: Optional[str] = None


@router.post("/auth/refresh")
@limiter.limit("30/minute")
async def refresh_token(request: Request, response: Response, payload: Optional[RefreshTokenPayload] = None):
    """Exchanges a valid refresh token for a fresh access token with server-side rotation."""
    token = payload.refresh_token if payload else None
    if not token:
        token = request.cookies.get("scd_refresh_token")
    if not token:
        try:
            req_body = await request.json()
            token = req_body.get("refresh_token")
        except Exception:
            pass
    if not token:
        raise HTTPException(400, "Missing refresh_token")

    try:
        data = decode_payload(token, token_type="refresh")

        # Reuse / Revocation check via blacklist
        old_jti = data.get("jti")
        if old_jti:
            blacklisted = await db.token_blacklist.find_one({"jti": old_jti})
            if blacklisted:
                raise HTTPException(401, "Refresh token has been revoked")

        try:
            user_oid = ObjectId(data["sub"])
        except Exception:
            raise HTTPException(401, "Invalid token")

        user = await db.users.find_one({"_id": user_oid})
        if not user:
            raise HTTPException(401, "User not found")

        # Invalidate old refresh token (refresh token rotation)
        if old_jti:
            exp_ts = data.get("exp")
            expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else (
                datetime.now(timezone.utc) + timedelta(days=30)
            )
            try:
                await db.token_blacklist.insert_one({
                    "jti": old_jti,
                    "user_id": str(user["_id"]),
                    "expires_at": expires_at,
                    "revoked_at": datetime.now(timezone.utc),
                    "reason": "rotation",
                })
            except Exception:
                pass

        new_access = create_access_token(str(user["_id"]), user["email"], user["role"])
        new_refresh = create_refresh_token(str(user["_id"]))

        _set_refresh_cookie(response, new_refresh)
        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")


@router.post("/auth/logout")
async def logout(request: Request, response: Response, user: dict = Depends(get_current_user)):
    """Revokes the current access token and refresh token, clearing session cookies."""
    token_str = bearer_token(request.headers.get("Authorization", "")) or ""
    if token_str:
        payload = decode_payload_silent(token_str)
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti:
                expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else (
                    datetime.now(timezone.utc) + timedelta(minutes=15)
                )
                try:
                    await db.token_blacklist.insert_one({
                        "jti": jti,
                        "user_id": str(user["_id"]),
                        "expires_at": expires_at,
                        "revoked_at": datetime.now(timezone.utc),
                        "reason": "logout",
                    })
                except Exception:
                    pass

    # Revoke refresh token if provided in cookie or payload
    cookie_refresh = request.cookies.get("scd_refresh_token")
    body_refresh = None
    try:
        req_json = await request.json()
        body_refresh = req_json.get("refresh_token")
    except Exception:
        pass
    token_to_revoke = cookie_refresh or body_refresh
    if token_to_revoke:
        rf_payload = decode_payload_silent(token_to_revoke)
        if rf_payload:
            rf_jti = rf_payload.get("jti")
            if rf_jti:
                rf_exp = rf_payload.get("exp")
                rf_expires_at = datetime.fromtimestamp(rf_exp, tz=timezone.utc) if rf_exp else (
                    datetime.now(timezone.utc) + timedelta(days=30)
                )
                try:
                    await db.token_blacklist.insert_one({
                        "jti": rf_jti,
                        "user_id": str(user["_id"]),
                        "expires_at": rf_expires_at,
                        "revoked_at": datetime.now(timezone.utc),
                        "reason": "logout",
                    })
                except Exception:
                    pass

    _clear_refresh_cookie(response)
    return {"status": "logged_out"}


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
    getattr(img, "save")(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")






# ----------------------------------------------------------------------------
# Institution Autocomplete (OpenStreetMap Nominatim) + Logo (Clearbit/Google)
# ----------------------------------------------------------------------------
import httpx
from urllib.parse import urlparse

_NOMINATIM_HEADERS = {"User-Agent": "StudentAlumni/1.0 (contact@studentalumni.ai)"}

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
    if (__import__("time").time() - ts) > _INST_CACHE_TTL:
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
    _INST_CACHE[key] = (__import__("time").time(), val)


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


@router.get("/institutions/search")
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
                params=dict(params),
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


@router.get("/institutions/logo")
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


@router.post("/auth/2fa/setup", response_model=TwoFASetupResponse)
@limiter.limit("5/minute")
async def two_fa_setup(request: Request, user: dict = Depends(get_current_user)):
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


@router.post("/auth/2fa/enable", response_model=TwoFAEnableResponse)
@limiter.limit("5/minute")
async def two_fa_enable(request: Request, req: TwoFAEnableRequest, user: dict = Depends(get_current_user)):
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


@router.post("/auth/2fa/verify", response_model=AuthResponse)
@limiter.limit("5/minute")
async def two_fa_verify(request: Request, response: Response, req: TwoFAVerifyRequest):
    """User submits TOTP/backup code with the challenge_id from /auth/login.
    On success → returns full access + refresh JWT pair."""
    challenge = await db.two_fa_challenges.find_one({"_id": req.challenge_id})
    if not challenge:
        raise HTTPException(401, "Invalid or expired challenge")
    if challenge.get("consumed"):
        raise HTTPException(401, "Challenge already used")
    exp_at = challenge["expires_at"]
    if exp_at.tzinfo is None: exp_at = exp_at.replace(tzinfo=timezone.utc)
    if exp_at < datetime.now(timezone.utc):
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
    update_fields = {"last_login": datetime.now(timezone.utc)}
    if used_backup_idx is not None:
        backup_codes = user.get("two_fa_backup_codes", [])
        backup_codes.pop(used_backup_idx)
        update_fields["two_fa_backup_codes"] = backup_codes
    await db.users.update_one({"_id": user["_id"]}, {"$set": update_fields})

    access_token = create_access_token(str(user["_id"]), user["email"], user["role"])
    refresh_token = create_refresh_token(str(user["_id"]))
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(**serialize_user(user)),
    )


@router.post("/auth/2fa/disable")
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


@router.post("/auth/2fa/regenerate-backup-codes", response_model=TwoFAEnableResponse)
@limiter.limit("5/minute")
async def two_fa_regenerate_backup(request: Request, req: TwoFAEnableRequest, user: dict = Depends(get_current_user)):
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
async def _upsert_oauth_user(provider: str, email: str, full_name: str,
                              picture: Optional[str], role: str = "student") -> dict:
    """Find or create a user from an OAuth profile. Enforces non-privileged role assignment."""
    email = email.lower().strip()
    role_norm = str(role or "student").strip().lower()
    if role_norm in FORBIDDEN_REGISTRATION_ROLES or role_norm not in ALLOWED_REGISTRATION_ROLES:
        role_norm = "student"

    user = await db.users.find_one({"email": email})
    if user:
        update = {"oauth_provider": provider, "oauth_picture": picture, "last_login": datetime.now(timezone.utc)}
        if picture:
            is_custom = bool(user.get("face_image_base64"))
            if user.get("photo_data") and str(user.get("photo_data")).startswith("data:"):
                is_custom = True
            if not is_custom:
                update["photo_data"] = picture
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        updated = await db.users.find_one({"_id": user["_id"]})
        await _try_record_activity(updated or user, "daily_login")
        return updated if updated is not None else user

    # New OAuth user — create with onboarding NOT yet completed so the client
    uid = generate_unique_id(role_norm)
    frontend_url = frontend_base_url()
    qr_code = generate_qr_code(
        f"{frontend_url}/verify/{uid.split('-')[-1]}"
    )
    user_doc: Dict[str, Any] = {
        "email": email,
        "password_hash": hash_password(secrets.token_urlsafe(16)),  # random unguessable password
        "full_name": full_name or email.split("@")[0].title(),
        "role": role_norm,
        "is_super_admin": False,
        "phone": None,
        "unique_id": uid,
        "qr_code_base64": qr_code,
        "school_info": None,
        "career_path": None,
        "interests": [],
        "skills": [],
        "bio": None,
        "photo_data": picture,
        "face_image_base64": None,
        "oauth_provider": provider,
        "oauth_picture": picture,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc),
        "last_login": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(user_doc)
    user_doc["_id"] = res.inserted_id
    await _try_record_activity(user_doc, "daily_login")
    return user_doc


async def _get_oauth_creds() -> dict:
    """Read OAuth credentials from platform_controls DB collection, merged with defaults."""
    doc = await db.platform_controls.find_one({"_id": "singleton"})
    db_settings = {s["key"]: s.get("value", "") for s in (doc.get("system_settings") or [])} if doc else {}
    # Merge with defaults so new fields (like firebase_*) are included even before admin sets them
    try:
        from routers.admin.settings import DEFAULT_PLATFORM_CONTROLS
        for s in DEFAULT_PLATFORM_CONTROLS.get("system_settings") or []:
            if s["key"] not in db_settings:
                db_settings[s["key"]] = s.get("value", "")
    except Exception:
        pass
    return db_settings


@router.get("/auth/oauth-config")
async def oauth_config(response: Response):
    """Returns OAuth client IDs and redirect URI for frontend login buttons.
    Only returns client IDs (safe), never secrets. If not configured, returns empty strings."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    creds = await _get_oauth_creds()
    raw_url = frontend_base_url(default="")
    frontend_url = raw_url if (raw_url.startswith("http://") or raw_url.startswith("https://")) else "https://studentalumni.ai"
    
    # Fetch feature flags for login buttons
    doc = await db.platform_controls.find_one({"_id": "singleton"})
    def _parse_b(v, d=True):
        if v is None: return d
        if isinstance(v, bool): return v
        if isinstance(v, str): return v.strip().lower() in ("true", "1", "yes")
        return bool(v)

    flags = {}
    if doc and doc.get("feature_flags"):
        raw_ff = doc["feature_flags"]
        if isinstance(raw_ff, list):
            for f in raw_ff:
                if isinstance(f, dict):
                    k = f.get("key")
                    if k:
                        flags[k] = _parse_b(f.get("value"), True)
        elif isinstance(raw_ff, dict):
            for k, v in raw_ff.items():
                flags[k] = _parse_b(v, True)

    try:
        from routers.admin.settings import DEFAULT_PLATFORM_CONTROLS
        for f in DEFAULT_PLATFORM_CONTROLS.get("feature_flags") or []:
            k = f.get("key") if isinstance(f, dict) else None
            if k and k not in flags:
                flags[k] = _parse_b(f.get("value"), True)
    except Exception:
        pass

    return {
        "google_client_id": creds.get("google_oauth_client_id", ""),
        "linkedin_client_id": creds.get("linkedin_oauth_client_id", ""),
        "github_client_id": creds.get("github_oauth_client_id", ""),
        "enable_google_login": flags.get("enable_google_login", True),
        "enable_linkedin_login": flags.get("enable_linkedin_login", True),
        "enable_github_login": flags.get("enable_github_login", True),
        "firebase": {
            "apiKey": creds.get("firebase_api_key", ""),
            "authDomain": creds.get("firebase_auth_domain", ""),
            "projectId": creds.get("firebase_project_id", ""),
            "appId": creds.get("firebase_app_id", ""),
        } if creds.get("firebase_api_key") else None,
        "redirect_uri": f"{frontend_url}/oauth.html",
        "configured": bool(creds.get("google_oauth_client_id")) or bool(creds.get("linkedin_oauth_client_id")) or bool(creds.get("github_oauth_client_id")),
    }


def _verify_google_token(id_token: Optional[str], client_id: str = "") -> Optional[dict]:
    """Verify a Google ID token if credentials are configured, else return None (mock fallback)."""
    if not id_token or not client_id or not g_id or not g_req:
        return None
    try:
        info = g_id.verify_oauth2_token(id_token, g_req.Request(), client_id)
        if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            return None
        return {"email": info.get("email"), "name": info.get("name"), "picture": info.get("picture"),
                "sub": info.get("sub")}
    except Exception:
        return None


def _frontend_redirect_uri() -> str:
    """Build the OAuth redirect URI that matches what oauth_config returns."""
    raw = frontend_base_url(default="")
    base = raw if (raw.startswith("http://") or raw.startswith("https://")) else "https://studentalumni.ai"
    return f"{base}/oauth.html"


async def _verify_linkedin_token(code: Optional[str], client_id: str = "", client_secret: str = "") -> Optional[dict]:
    """Exchange LinkedIn OAuth authorization code for an access token, then fetch user info."""
    if not code or not client_id or not client_secret:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            # Exchange authorization code for access token
            token_res = await c.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": _frontend_redirect_uri(),
                },
                headers={"Accept": "application/json"},
            )
            if not token_res.is_success:
                return None
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return None

            # Fetch user profile with the access token
            user_res = await c.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if not user_res.is_success:
                return None
            data = user_res.json()
            return {"email": data.get("email"), "name": data.get("name"),
                    "picture": data.get("picture")}
    except Exception:
        return None


async def _verify_github_token(code: Optional[str], client_id: str = "", client_secret: str = "") -> Optional[dict]:
    """Verify GitHub OAuth code, exchange for access token, and fetch user profile."""
    if not code or not client_id or not client_secret:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            # Exchange code for access token
            token_res = await c.post(
                "https://github.com/login/oauth/access_token",
                json={"client_id": client_id, "client_secret": client_secret, "code": code},
                headers={"Accept": "application/json"},
            )
            if not token_res.is_success:
                return None
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return None

            # Fetch user profile
            user_res = await c.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if not user_res.is_success:
                return None
            user_data = user_res.json()

            # Fetch user emails (primary may be set or need to find it)
            emails_res = await c.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            email = None
            if emails_res.is_success:
                emails = emails_res.json()
                primary = next((e for e in emails if e.get("primary")), None)
                verified = next((e for e in emails if e.get("verified")), None)
                email = (primary or verified or {}).get("email") or (emails[0].get("email") if emails else None)
            if not email:
                email = user_data.get("email")

            return {
                "email": email,
                "name": user_data.get("name") or user_data.get("login", ""),
                "picture": user_data.get("avatar_url"),
                "sub": str(user_data.get("id")),
            }
    except Exception:
        return None


@router.post("/auth/google", response_model=AuthResponse)
@limiter.limit("20/minute")
async def auth_google(request: Request, req: OAuthCallback):
    """Continue-with-Google flow.

    Real flow: client (Expo/Web) opens Google OAuth → receives `id_token` → POSTs here.
    The `id_token` can be a Google JWT or Firebase ID token.
    """
    try:
        creds = await _get_oauth_creds()
        client_id = creds.get("google_oauth_client_id", "")
        profile = _verify_google_token(req.id_token, client_id) if req.id_token else None

        # If standard Google OAuth verification is not configured or fails, try Firebase token verification
        if profile is None and req.id_token:
            profile = _verify_firebase_token(req.id_token)

        if profile is None:
            # SECURITY: never trust a client-supplied email. Only allow the
            # unverified mock profile in explicit development mode, mirroring
            # the LinkedIn/GitHub handlers.
            if not client_id and os.getenv("ENV") == "development":
                if not req.email or not req.full_name:
                    raise HTTPException(400, "Development mock mode requires email/full_name")
                profile = {"email": req.email, "name": req.full_name, "picture": req.picture}
            else:
                raise HTTPException(401, "Google sign-in requires a valid id_token.")

        user = await _upsert_oauth_user(
            provider="google",
            email=profile.get("email") or "",
            full_name=profile.get("name") or profile.get("full_name") or req.full_name or "",
            picture=profile.get("picture") or req.picture,
            role=req.role or "student",
        )
        return AuthResponse(
            access_token=create_access_token(str(user["_id"]), user["email"], user["role"]),
            refresh_token=create_refresh_token(str(user["_id"])),
            user=UserResponse(**serialize_user(user)),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH_GOOGLE] Failed to authenticate Google user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")


@router.post("/auth/linkedin", response_model=AuthResponse)
@limiter.limit("20/minute")
async def auth_linkedin(request: Request, req: OAuthCallback):
    """Continue-with-LinkedIn flow. Same structure as /auth/google."""
    try:
        creds = await _get_oauth_creds()
        client_id = creds.get("linkedin_oauth_client_id", "")
        client_secret = creds.get("linkedin_oauth_client_secret", "")
        profile = await _verify_linkedin_token(req.access_token, client_id, client_secret) if req.access_token else None
        if profile is None:
            if not client_id and os.getenv("ENV") == "development":
                if not req.email or not req.full_name:
                    raise HTTPException(400, "Development mock mode requires email/full_name")
                profile = {"email": req.email, "name": req.full_name, "picture": req.picture}
            else:
                raise HTTPException(400, "LinkedIn OAuth requires a valid access_token. Configure linkedin_oauth_client_id in platform settings or set ENV=development for mock mode.")

        user = await _upsert_oauth_user(
            provider="linkedin",
            email=profile.get("email") or "",
            full_name=profile.get("name") or profile.get("full_name") or "",
            picture=profile.get("picture"),
            role=req.role or "student",
        )
        return AuthResponse(
            access_token=create_access_token(str(user["_id"]), user["email"], user["role"]),
            refresh_token=create_refresh_token(str(user["_id"])),
            user=UserResponse(**serialize_user(user)),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH_LINKEDIN] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LinkedIn authentication failed: {str(e)}")


@router.post("/auth/github", response_model=AuthResponse)
@limiter.limit("20/minute")
async def auth_github(request: Request, req: OAuthCallback):
    """Continue-with-GitHub flow. Uses OAuth code exchange (not id_token)."""
    try:
        creds = await _get_oauth_creds()
        client_id = creds.get("github_oauth_client_id", "")
        client_secret = creds.get("github_oauth_client_secret", "")
        profile = await _verify_github_token(req.access_token, client_id, client_secret) if req.access_token else None
        if profile is None:
            if not client_id and os.getenv("ENV") == "development":
                if not req.email or not req.full_name:
                    raise HTTPException(400, "Development mock mode requires email/full_name")
                profile = {"email": req.email, "name": req.full_name, "picture": req.picture}
            else:
                raise HTTPException(400, "GitHub OAuth requires a valid authorization code. Configure github_oauth_client_id / github_oauth_client_secret in platform settings or set ENV=development for mock mode.")

        user = await _upsert_oauth_user(
            provider="github",
            email=profile.get("email") or "",
            full_name=profile.get("name") or profile.get("full_name") or "",
            picture=profile.get("picture"),
            role=req.role or "student",
        )
        return AuthResponse(
            access_token=create_access_token(str(user["_id"]), user["email"], user["role"]),
            refresh_token=create_refresh_token(str(user["_id"])),
            user=UserResponse(**serialize_user(user)),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH_GITHUB] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"GitHub authentication failed: {str(e)}")


# ─── Firebase Auth ──────────────────────────────────────────────────
_firebase_app = None

def _get_or_init_firebase():
    """Initialize Firebase Admin SDK if not already initialized, using platform settings."""
    global _firebase_app
    if not credentials or not initialize_app or not fb_auth:
        return None
    if _firebase_app is not None:
        return _firebase_app
    try:
        creds_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
        if not creds_json:
            # Try reading from platform_controls synchronously (won't work in async context)
            return None
        cred_dict = __import__("json").loads(creds_json)
        cred = credentials.Certificate(cred_dict)
        _firebase_app = initialize_app(cred)
        return _firebase_app
    except Exception:
        return None


def _verify_firebase_token(id_token: str) -> Optional[dict]:
    """Verify a Firebase ID token using Firebase Admin SDK."""
    app = _get_or_init_firebase()
    if not app:
        return None
    try:
        decoded = fb_auth.verify_id_token(id_token, check_revoked=True)
        return {
            "email": decoded.get("email"),
            "name": decoded.get("name", ""),
            "picture": decoded.get("picture", ""),
            "sub": decoded.get("uid"),
            "phone": decoded.get("phone_number"),
            "firebase_provider": decoded.get("firebase", {}).get("sign_in_provider", ""),
        }
    except Exception:
        return None


@router.post("/auth/firebase", response_model=AuthResponse)
@limiter.limit("20/minute")
async def auth_firebase(request: Request, req: OAuthCallback):
    """Firebase Auth — accepts a Firebase ID token from any provider (Google, GitHub, phone, etc.)
    and issues a platform JWT. Configure firebase_service_account in platform settings."""
    try:
        creds = await _get_oauth_creds()
        fb_service_account = creds.get("firebase_service_account", "")

        if fb_service_account and not os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"] = fb_service_account

        profile = _verify_firebase_token(req.id_token) if req.id_token else None
        if profile is None:
            if not fb_service_account and os.getenv("ENV") == "development":
                if not req.email or not req.full_name:
                    raise HTTPException(400, "Development mock mode requires email/full_name")
                profile = {"email": req.email, "name": req.full_name, "picture": req.picture}
            else:
                raise HTTPException(400, "Firebase Auth requires a valid id_token. Configure firebase_service_account in platform settings or set ENV=development for mock mode.")

        provider = profile.get("firebase_provider", "firebase")
        user = await _upsert_oauth_user(
            provider=provider or "google",
            email=profile.get("email") or "",
            full_name=profile.get("name") or req.full_name or "",
            picture=profile.get("picture"),
            role=req.role or "student",
        )
        return AuthResponse(
            access_token=create_access_token(str(user["_id"]), user["email"], user["role"]),
            refresh_token=create_refresh_token(str(user["_id"])),
            user=UserResponse(**serialize_user(user)),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH_FIREBASE] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Firebase authentication failed: {str(e)}")


# ----------------------------------------------------------------------------
# Onboarding & Profile Endpoints
# ----------------------------------------------------------------------------
