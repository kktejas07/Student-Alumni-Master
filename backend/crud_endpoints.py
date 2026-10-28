"""
CRUD endpoints — append-only mutations for personas + dashboards.
==================================================================
Wires the missing POST/DELETE endpoints so personas can actually
book mentor sessions, register for events, enroll in workshops,
apply to internships, create courses, and so on. The dashboards
auto-refresh every 30s on the FE, so any POST here will reflect
in the corresponding dashboard within one polling cycle.

ENDPOINTS:
  Student-side
    POST   /api/student/bookings                  — book a mentor session
    DELETE /api/student/bookings/{id}             — cancel a booking
    GET    /api/student/my-bookings               — list current student bookings
    POST   /api/student/internships/{id}/apply    — apply to an internship
    GET    /api/student/my-applications           — list applications
    POST   /api/student/workshops/{id}/enroll     — enroll in a workshop
    GET    /api/student/my-workshops              — list workshop registrations
    GET    /api/student/my-events                 — list event RSVPs
    DELETE /api/student/events/{id}/rsvp          — cancel an RSVP

  Mentor-side
    POST   /api/mentor/courses                    — publish a new course
    GET    /api/mentor/my-courses                 — list mentor's courses
    POST   /api/mentor/availability               — set availability slots
    GET    /api/mentor/my-bookings                — mentor's confirmed sessions

  Admin/College-side
    POST   /api/admin/users                       — invite/add a user
    POST   /api/college/events                    — create a new event
    GET    /api/college/my-students               — students of this college

  Live-counts (drives the auto-refresh demos)
    GET    /api/live/counters                     — global counters for FE refresh banner
"""
from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
import asyncio
from typing import Any, Dict, Optional, List

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request, Depends

from core.deps import get_current_user, require_role, bearer_token, decode_payload_silent
from core.config import frontend_base_url
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

from core.db import db as _db
from core.email import send_email, render_html_email
router = APIRouter()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _short_id(oid) -> str:
    return str(oid)[-8:] if oid else ""


async def _issue_workshop_certificate(reg: Dict[str, Any], student: Dict[str, Any], email: str) -> Optional[Dict[str, Any]]:
    """Issue a verifiable certificate into the `certificates` registry.

    Follows the Coursera/Udemy model: a unique verification code is stored
    in the registry and exposed via a public /certificates/verify/{code}
    page, so anyone can confirm authenticity without logging in.
    """
    try:
        import secrets as _secrets
        alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
        code = "SA-" + "".join(_secrets.choice(alphabet) for _ in range(4)) + "-" + "".join(
            _secrets.choice(alphabet) for _ in range(4)
        )
        for _ in range(5):
            if not await _db.certificates.find_one({"verification_code": code}):
                break
            code = "SA-" + "".join(_secrets.choice(alphabet) for _ in range(4)) + "-" + "".join(
                _secrets.choice(alphabet) for _ in range(4)
            )

        recipient_name = student.get("full_name") or student.get("name") or ""
        if not recipient_name:
            recipient_name = (email or "").split("@")[0].replace(".", " ").title()

        cert_doc = {
            "verification_code": code,
            "recipient_email": (email or "").lower(),
            "recipient_name": recipient_name,
            "title": reg.get("workshop_title") or "Workshop Completion",
            "issuer": "Student Alumni",
            "issuer_type": "platform",
            "issued_at": _now(),
            "credential_url": None,
            "meta": {"source": "workshop", "registration_id": str(reg["_id"]), "weeks": reg.get("weeks")},
            "created_at": _now(),
        }
        await _db.certificates.insert_one(cert_doc)
        verify_url = f"{frontend_base_url()}/certificates/verify/{code}"
        # Send certificate notification email
        try:
            cert_name = (email or "").split("@")[0].replace(".", " ").title()
            content_html = f"""
            <h2 style="margin:0 0 8px 0;color:#111827;font-size:20px;">Your Certificate is Ready</h2>
            <p style="margin:0 0 18px 0;color:#374151;">
              Hi <strong>{cert_name}</strong>,<br/><br/>
              You have completed the workshop and your certificate has been issued on <strong>Student Alumni</strong>.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;width:100%;">
              <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:4px 0;color:#6b7280;font-size:12px;font-weight:600;">Certificate</td>
                      <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:700;">{cert_doc.get('title','Workshop Completion')}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-size:12px;font-weight:600;">Code</td>
                      <td style="padding:4px 0;color:#7c3aed;font-size:14px;font-weight:700;font-family:monospace;">{code}</td></tr>
                </table>
              </td></tr>
            </table>
            <a href="{verify_url}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
              Verify Your Certificate
            </a>
            <p style="margin:18px 0 0 0;color:#6b7280;font-size:13px;">
              Anyone can confirm this certificate at
              <a href="{verify_url}" style="color:#7c3aed;">{verify_url}</a>
            </p>
            """
            await send_email(email, f"Your Certificate — {cert_doc.get('title','Workshop Completion')}", render_html_email(content_html))
            # Best-effort WhatsApp with certificate details
            try:
                from core.whatsapp import send_wa_message as _wa
                user_doc = await _db.users.find_one({"email": email.lower().strip()}, {"phone": 1})
                phone = (user_doc or {}).get("phone") or ""
                if phone:
                    await _wa(phone=phone, text=f"🎓 *Certificate Issued*\n\n*{cert_doc.get('title','Workshop Completion')}*\nCode: `{code}`\n\nVerify: {verify_url}", kind="certificate_issued")
            except Exception:
                pass
        except Exception as email_err:
            print(f"[CERTIFICATE] Email notification failed: {email_err}", flush=True)
        return {
            "verification_code": code,
            "verify_url": verify_url,
        }
    except Exception as e:
        print(f"[CERTIFICATE] Workshop issuance failed: {e}", flush=True)
        return None


async def _resolve_user(role: str, email: Optional[str]) -> Dict[str, Any]:
    if email:
        user = await _db.users.find_one({"email": email})
        if user:
            return user
    q: Dict[str, Any] = {"role": role}
    if email:
        q["email"] = email
    user = await _db.users.find_one(q)
    if not user:
        user = await _db.users.find_one({"role": role})
    if not user:
        raise HTTPException(404, f"No {role} user found")
    return user


from crud.student_api import router as student_api_router
router.include_router(student_api_router)
from crud.mentor_api import router as mentor_api_router
router.include_router(mentor_api_router)
from crud.college_api import router as college_api_router
router.include_router(college_api_router)
from crud.misc_api import router as misc_api_router
router.include_router(misc_api_router)
