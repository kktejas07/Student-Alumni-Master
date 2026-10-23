"""
backend/routers/public_contact.py — public "Contact us" inquiry endpoint.

The website contact form previously showed "submitted" after a timer without
sending anything. This router stores each inquiry, forwards it to the
support inbox, and adds the sender to the CRM contacts collection so the
admin Contacts view can follow up.

Mounted under api_router (/api) → POST /api/contact
"""
from __future__ import annotations

import html
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from core.config import limiter
from core.db import db
from core.email import send_email, render_html_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["public-contact"])

TOPICS = {"general", "hr", "colleges", "mentors"}
TOPIC_LABEL = {
    "general": "General inquiry",
    "hr": "HR & Careers",
    "colleges": "College partnership",
    "mentors": "Mentor network",
}


class ContactInquiry(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=32)
    organization: Optional[str] = Field(default=None, max_length=160)
    topic: str = "general"
    message: str = Field(min_length=10, max_length=4000)
    # Honeypot: real users never fill this; bots often do.
    website: Optional[str] = None


@router.post("")
@limiter.limit("5/minute")
async def submit_contact_inquiry(request: Request, payload: ContactInquiry):
    if payload.website:
        # Silently accept so the bot learns nothing.
        return {"ok": True}
    topic = payload.topic if payload.topic in TOPICS else "general"
    now = datetime.now(timezone.utc)
    email = payload.email.lower().strip()

    doc = {
        "full_name": payload.full_name.strip(),
        "email": email,
        "phone": (payload.phone or "").strip(),
        "organization": (payload.organization or "").strip(),
        "topic": topic,
        "message": payload.message.strip(),
        "status": "new",
        "source": "website_contact_form",
        "ip": request.client.host if request.client else None,
        "created_at": now,
    }
    res = await db.contact_inquiries.insert_one(dict(doc))

    # Keep the CRM in sync without failing the request if that part breaks.
    try:
        await db.contacts.update_one(
            {"email": email},
            {
                "$setOnInsert": {
                    "name": doc["full_name"],
                    "email": email,
                    "phone": doc["phone"],
                    "source": "website",
                    "tags": ["website-inquiry", topic],
                    "lists": [],
                    "subscribed": True,
                    "created_at": now.isoformat(),
                },
                "$set": {"updated_at": now.isoformat(), "last_inquiry_at": now.isoformat()},
                "$push": {"notes_log": {"at": now.isoformat(), "topic": topic, "message": doc["message"][:500]}},
            },
            upsert=True,
        )
    except Exception as e:  # pragma: no cover - best effort
        logger.warning("[CONTACT] CRM upsert failed: %s", e)

    to_addr = (os.environ.get("CONTACT_INBOX") or os.environ.get("SUPPORT_EMAIL") or "hr@studentalumni.ai").strip()
    try:
        body = render_html_email(
            f"<h2 style='margin:0 0 12px'>New website inquiry — {html.escape(TOPIC_LABEL[topic])}</h2>"
            f"<p><b>From:</b> {html.escape(doc['full_name'])} &lt;{html.escape(email)}&gt;<br>"
            f"<b>Phone:</b> {html.escape(doc['phone'] or '—')}<br>"
            f"<b>Organization:</b> {html.escape(doc['organization'] or '—')}</p>"
            f"<p style='white-space:pre-wrap'>{html.escape(doc['message'])}</p>"
            f"<p style='color:#888;font-size:12px'>Inquiry id {res.inserted_id}</p>"
        )
        await send_email(to_addr, f"[Contact] {TOPIC_LABEL[topic]} — {doc['full_name']}", body)
    except Exception as e:  # pragma: no cover - email outage must not lose the inquiry
        logger.warning("[CONTACT] Notification email failed: %s", e)

    return {"ok": True, "id": str(res.inserted_id)}
