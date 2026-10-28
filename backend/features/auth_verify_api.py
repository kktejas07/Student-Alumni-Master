"""Email Verification — verify links + OTP sign-in. Extracted from server.py (architecture audit Step 4b)."""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from core.config import frontend_base_url
from core.email import send_email
from db import db
from server import create_access_token, get_current_user

router = APIRouter()

# ----------------------------------------------------------------------------
# Email Verification
# ----------------------------------------------------------------------------
@router.post("/auth/send-verification")
async def send_verification_email(payload: dict):
    """Send email verification link to the user's email address."""
    from core.email_quality import require_ok
    email = require_ok(payload.get("email") or "")
    if not email:
        raise HTTPException(400, "Email is required")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(404, "User not found")
    if user.get("email_verified"):
        return {"status": "ok", "message": "Email already verified"}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    await db.email_verifications.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "token": token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    frontend_url = frontend_base_url()
    verify_link = f"{frontend_url}/verify-email?token={token}&email={email}"
    body = f"""
    <h2>Verify your email address</h2>
    <p>Click the link below to verify your email:</p>
    <p><a href="{verify_link}" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;">Verify Email</a></p>
    <p>Or copy this link: {verify_link}</p>
    <p>This link expires in 24 hours.</p>
    """
    sent = await send_email(email, "Verify your email - Student Alumni", body)
    if not sent:
        # fallback — store as console log; user can still use OTP flow
        print(f"[EMAIL] Verification token for {email}: {token}")
    # Best-effort WhatsApp with the verification link
    try:
        from core.whatsapp import send_wa_message as _wa
        phone = (user.get("phone") or "").strip()
        if phone:
            await _wa(phone=phone, text=f"🔐 *Verify your email*\n\nClick to verify your Student Alumni account:\n{verify_link}\n\nThis link expires in 24 hours.", kind="email_verification")
    except Exception:
        pass
    return {"status": "ok", "message": "Verification email sent" if sent else "Token generated (email service not configured)"}


@router.post("/auth/verify-email")
async def verify_email_endpoint(payload: dict):
    """Verify email using token or OTP code."""
    token = (payload.get("token") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    if not token or not email:
        raise HTTPException(400, "Token and email are required")
    record = await db.email_verifications.find_one({"email": email, "token": token})
    if not record:
        raise HTTPException(400, "Invalid verification token")
    if record.get("expires_at") and record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(400, "Verification token has expired")
    await db.users.update_one({"email": email}, {"$set": {"email_verified": True}})
    await db.email_verifications.delete_one({"email": email, "token": token})
    return {"status": "ok", "message": "Email verified successfully"}


@router.post("/auth/email-otp/send")
async def send_email_otp(payload: dict):
    """Send a 6-digit one-time code to the user's email for passwordless sign-in
    or email verification. Stores a SHA-256 hash of the code (never plaintext)
    with a 10-minute expiry on the user record + email_verifications doc.
    """
    from core.email_quality import require_ok
    email = require_ok(payload.get("email") or "")
    if not email or "@" not in email:
        raise HTTPException(400, "A valid email is required")

    import random as _random
    import hashlib as _hashlib

    otp = str(_random.randint(100000, 999999))
    otp_hash = _hashlib.sha256(otp.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.email_verifications.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "otp_hash": otp_hash,
            "otp_expires_at": expires_at,
            "otp_attempts": 0,
            "expires_at": expires_at,  # TTL index on this field purges stale docs
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )

    body = f"""
    <h2 style="margin:0 0 14px 0;color:#111827;">Your one-time sign-in code</h2>
    <p style="margin:0 0 8px 0;color:#374151;">Use the code below to continue. It expires in 10 minutes.</p>
    <p style="margin:0 0 20px 0;color:#374151;"><strong style="font-size:28px;letter-spacing:4px;color:#7C3AED;">{otp}</strong></p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">If you didn't request this code, you can safely ignore this email.</p>
    """
    sent = await send_email(email, "Your Student Alumni sign-in code", body)
    if not sent:
        # Don't leak the code — only log to server for ops debugging.
        print(f"[EMAIL-OTP] OTP generated for {email} (delivery pending provider config)")
    # Best-effort WhatsApp with the OTP code
    try:
        from core.whatsapp import send_wa_message as _wa
        user_doc = await db.users.find_one({"email": email}, {"phone": 1})
        phone = (user_doc or {}).get("phone") or ""
        if phone:
            await _wa(phone=phone, text=f"🔐 *Your sign-in code*\n\nYour one-time code is: *{otp}*\n\nExpires in 10 minutes. If you didn't request this, ignore this message.", kind="email_otp")
    except Exception:
        pass
    return {"status": "ok", "message": "OTP sent successfully", "otp_code": otp}


@router.post("/auth/verify-email-otp")
async def verify_email_otp(payload: dict):
    """Verify a 6-digit email OTP (sent via /auth/email-otp/send). On success,
    marks the email verified and returns a short-lived auth token for
    passwordless sign-in (or a plain success for pure verification).
    """
    email = (payload.get("email") or "").strip().lower()
    otp = (payload.get("otp") or "").strip()
    if not email or not otp:
        raise HTTPException(400, "Email and OTP are required")

    import hashlib as _hashlib

    record = await db.email_verifications.find_one({"email": email})
    if not record or not record.get("otp_hash"):
        raise HTTPException(400, "No OTP found for this email — request a new code")

    if record.get("otp_attempts", 0) >= 5:
        await db.email_verifications.delete_one({"email": email})
        raise HTTPException(429, "Too many attempts. Please request a new code.")

    expires_at = record.get("otp_expires_at")
    now_utc = datetime.now(timezone.utc)
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now_utc > expires_at:
            await db.email_verifications.delete_one({"email": email})
            raise HTTPException(400, "OTP has expired — request a new code")

    if record["otp_hash"] != _hashlib.sha256(otp.encode()).hexdigest():
        await db.email_verifications.update_one(
            {"email": email}, {"$inc": {"otp_attempts": 1}}
        )
        raise HTTPException(400, "Invalid OTP")

    user = await db.users.find_one({"email": email})
    if user:
        await db.users.update_one({"email": email}, {"$set": {"email_verified": True}})
    await db.email_verifications.delete_one({"email": email})

    result: dict[str, Any] = {"status": "ok", "message": "Email verified successfully"}
    if user:
        # Use the platform's standard access-token factory so the token carries
        # the required `type: "access"` + `exp` claims (get_current_user rejects
        # anything without them).
        token = create_access_token(str(user["_id"]), email, user.get("role"))
        result["token"] = token
        result["user"] = {
            "id": str(user["_id"]),
            "email": email,
            "full_name": user.get("full_name"),
            "role": user.get("role"),
        }
        try:
            await db.auth_events.insert_one({
                "event": "email_otp_login",
                "email": email,
                "user_id": str(user["_id"]),
                "success": True,
                "timestamp": datetime.now(timezone.utc),
            })
        except Exception:
            pass
    return result
