"""Phone OTP verification (LA2) — real OTP with WhatsApp + Email delivery.

Uses the platform's existing messaging stack:
  - WhatsApp via OpenWA (core.whatsapp.send_wa_message) — primary
  - Email via Postal/SendGrid/Gmail (core.email.send_email) — fallback

Security:
  - Cryptographically random 6-digit codes (secrets.randbelow)
  - SHA-256 hashed storage in MongoDB with 5-min TTL
  - Rate limiting: 3 sends per phone per 10 min, 3 verify attempts per OTP
  - 30s cooldown between sends
  - Auto-block after 10 failed attempts in 24h
  - Full audit trail
"""
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from .database import otp_col

logger = logging.getLogger(__name__)

_OTP_TTL_SECONDS = 300  # 5 minutes
_COOLDOWN_SECONDS = 30
_MAX_SENDS_PER_WINDOW = 3
_SEND_WINDOW_SECONDS = 600  # 10 minutes
_MAX_VERIFY_ATTEMPTS = 3
_BLOCK_THRESHOLD = 10  # failed attempts in 24h
_BLOCK_WINDOW_SECONDS = 86400  # 24 hours


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


async def send_otp(
    phone: str,
    purpose: str = "lead_verify",
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    email: Optional[str] = None,
) -> dict:
    """Generate and send a 6-digit OTP to the given phone number.

    Delivery: WhatsApp (primary) + Email (fallback if email provided).
    Returns {"status": "ok", "message": "...", "expires_in": 300}
    or an error dict.
    """
    now = datetime.now(timezone.utc)

    existing = await otp_col.find_one({"phone": phone})

    if existing:
        # Check block status
        if existing.get("blocked_until"):
            blocked_until = existing["blocked_until"]
            if blocked_until.tzinfo is None:
                blocked_until = blocked_until.replace(tzinfo=timezone.utc)
            if now < blocked_until:
                return {"status": "error", "code": 429, "message": "Too many failed attempts. Try again later."}

        # Cooldown check (30s between sends)
        last_sent = existing.get("last_sent_at")
        if last_sent:
            if last_sent.tzinfo is None:
                last_sent = last_sent.replace(tzinfo=timezone.utc)
            if (now - last_sent).total_seconds() < _COOLDOWN_SECONDS:
                retry_after = _COOLDOWN_SECONDS - int((now - last_sent).total_seconds())
                return {
                    "status": "error",
                    "code": 429,
                    "message": "Please wait before requesting a new code.",
                    "retry_after": retry_after,
                }

        # Rate limit: max 3 sends per 10 min window
        window_start = existing.get("window_start")
        send_count = existing.get("send_count", 0)
        if window_start:
            if window_start.tzinfo is None:
                window_start = window_start.replace(tzinfo=timezone.utc)
            if (now - window_start).total_seconds() < _SEND_WINDOW_SECONDS:
                if send_count >= _MAX_SENDS_PER_WINDOW:
                    return {
                        "status": "error",
                        "code": 429,
                        "message": "Too many OTP requests. Please try again later.",
                        "retry_after": _SEND_WINDOW_SECONDS - int((now - window_start).total_seconds()),
                    }
            else:
                send_count = 0
                window_start = now
        else:
            window_start = now
    else:
        send_count = 0
        window_start = now

    otp = _generate_otp()
    otp_hash = _hash_otp(otp)
    expires_at = now + timedelta(seconds=_OTP_TTL_SECONDS)

    await otp_col.update_one(
        {"phone": phone},
        {"$set": {
            "phone": phone,
            "otp_hash": otp_hash,
            "purpose": purpose,
            "expires_at": expires_at,
            "last_sent_at": now,
            "window_start": window_start,
            "send_count": send_count + 1,
            "verify_attempts": 0,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }},
        upsert=True,
    )

    # Audit trail
    try:
        from db import db
        await db.la_otp_audit.insert_one({
            "phone": phone,
            "event": "otp_sent",
            "purpose": purpose,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": now,
        })
    except Exception:
        pass

    delivered = await _deliver_otp(phone, otp, email=email)

    if not delivered:
        logger.warning("[LA-OTP] OTP delivery failed for phone ending ...%s", phone[-4:])

    return {
        "status": "ok",
        "message": "Verification code sent" if delivered else "Code generated (delivery pending)",
        "expires_in": _OTP_TTL_SECONDS,
    }


async def verify_otp(
    phone: str,
    otp: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> dict:
    """Verify a 6-digit OTP for the given phone number.

    Returns {"status": "ok", "verified": True} on success.
    """
    now = datetime.now(timezone.utc)

    record = await otp_col.find_one({"phone": phone})

    if not record or not record.get("otp_hash"):
        return {"status": "error", "code": 400, "message": "Verification failed. Please request a new code."}

    # Check block
    if record.get("blocked_until"):
        blocked_until = record["blocked_until"]
        if blocked_until.tzinfo is None:
            blocked_until = blocked_until.replace(tzinfo=timezone.utc)
        if now < blocked_until:
            return {"status": "error", "code": 429, "message": "Too many failed attempts. Try again later."}

    # Check attempts
    if record.get("verify_attempts", 0) >= _MAX_VERIFY_ATTEMPTS:
        await otp_col.delete_one({"phone": phone})
        return {"status": "error", "code": 429, "message": "Too many attempts. Please request a new code."}

    # Check expiry
    expires_at = record.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            await otp_col.delete_one({"phone": phone})
            return {"status": "error", "code": 400, "message": "Code expired. Please request a new one."}

    # Verify hash
    if record["otp_hash"] != _hash_otp(otp):
        attempts = record.get("verify_attempts", 0) + 1
        total_failures = record.get("total_failures_24h", 0) + 1

        update: dict = {"$inc": {"verify_attempts": 1, "total_failures_24h": 1}}

        if total_failures >= _BLOCK_THRESHOLD:
            update["$set"] = {"blocked_until": now + timedelta(seconds=_BLOCK_WINDOW_SECONDS)}

        await otp_col.update_one({"phone": phone}, update)

        # Audit
        try:
            from db import db
            await db.la_otp_audit.insert_one({
                "phone": phone,
                "event": "otp_verify_failed",
                "attempt": attempts,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "timestamp": now,
            })
        except Exception:
            pass

        return {"status": "error", "code": 400, "message": "Verification failed. Please try again."}

    # Success — delete the OTP record
    await otp_col.delete_one({"phone": phone})

    # Audit
    try:
        from db import db
        await db.la_otp_audit.insert_one({
            "phone": phone,
            "event": "otp_verified",
            "purpose": record.get("purpose"),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": now,
        })
    except Exception:
        pass

    return {"status": "ok", "verified": True, "message": "Phone number verified successfully"}


# ---------------------------------------------------------------------------
# OTP Delivery — WhatsApp (primary) + Email (fallback)
# ---------------------------------------------------------------------------
async def _deliver_otp(phone: str, otp: str, *, email: Optional[str] = None) -> bool:
    """Send OTP via WhatsApp (primary) and Email (fallback).

    Uses the platform's existing messaging infrastructure:
      - core.whatsapp.send_wa_message (OpenWA gateway)
      - core.email.send_email (Postal → SendGrid → Gmail)
    """
    wa_ok = await _send_via_whatsapp(phone, otp)
    email_ok = False

    if email:
        email_ok = await _send_via_email(email, otp)

    return wa_ok or email_ok


async def _send_via_whatsapp(phone: str, otp: str) -> bool:
    """Send OTP via WhatsApp using OpenWA gateway."""
    try:
        from core.whatsapp import send_wa_message

        result = await send_wa_message(
            phone=phone,
            text=(
                f"\U0001f510 *AXISS Verification Code*\n\n"
                f"Your one-time code is: *{otp}*\n\n"
                f"Valid for 5 minutes. Do not share this code with anyone."
            ),
            kind="lead_otp",
        )
        status = result.get("status")
        if status == "sent":
            logger.info("[LA-OTP] WhatsApp OTP sent to ...%s", phone[-4:])
            return True
        logger.warning("[LA-OTP] WhatsApp OTP status=%s for ...%s", status, phone[-4:])
        return status == "sent"
    except Exception as e:
        logger.warning("[LA-OTP] WhatsApp delivery error: %s", e)
        return False


async def _send_via_email(email_addr: str, otp: str) -> bool:
    """Send OTP via email using the platform's email stack (Postal/SendGrid/Gmail)."""
    try:
        from core.email import send_email

        body = f"""
        <h2 style="margin:0 0 14px 0;color:#111827;">Your AXISS Verification Code</h2>
        <p style="margin:0 0 8px 0;color:#374151;">Use the code below to verify your phone number. It expires in 5 minutes.</p>
        <p style="margin:0 0 20px 0;color:#374151;">
            <strong style="font-size:28px;letter-spacing:4px;color:#7C3AED;">{otp}</strong>
        </p>
        <p style="margin:0;color:#9ca3af;font-size:12px;">
            If you didn't request this code, you can safely ignore this email.
        </p>
        """
        sent = await send_email(email_addr, "Your AXISS Verification Code", body)
        if sent:
            logger.info("[LA-OTP] Email OTP sent to %s", email_addr[:3] + "***")
            return True
        logger.warning("[LA-OTP] Email OTP delivery failed for %s", email_addr[:3] + "***")
        return False
    except Exception as e:
        logger.warning("[LA-OTP] Email delivery error: %s", e)
        return False
