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
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from core.config import limiter
from core.db import db
from core.deps import get_current_user, ensure_admin
from core.email import send_email, render_html_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["public-contact"])
admin_router = APIRouter(tags=["admin-contact"])

TOPICS = {
    "general", "hr", "colleges", "mentors",
    "podcast", "product_interest", "ambassador", "echo_event", "visa_abroad", "staffing",
}
TOPIC_LABEL = {
    "general": "General inquiry",
    "hr": "HR & Careers",
    "colleges": "College partnership",
    "mentors": "Mentor network",
    "podcast": "Podcast collaboration",
    "product_interest": "Product interest",
    "ambassador": "Campus ambassador",
    "echo_event": "ECHO event partnership",
    "visa_abroad": "Visa & study abroad",
    "staffing": "Staffing & recruitment",
}

# Canonical AXISS ecosystem products the contact form's product grid offers.
PRODUCT_KEYS = [
    "studentkare", "studentalumni", "hyra", "wehive", "codespectra", "outpass",
]
PRODUCT_LABELS = {
    "studentkare": "StudentKare.co",
    "studentalumni": "StudentAlumni.ai",
    "hyra": "Hyra.org.in",
    "wehive": "WeHive.co.in",
    "codespectra": "CodeSpectra.ai",
    "outpass": "Outpass.StudentAlumni.ai",
}


class ContactInquiry(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=32)
    organization: Optional[str] = Field(default=None, max_length=160)
    topic: str = "general"
    segment_detail: Optional[str] = Field(default=None, max_length=160)
    message: str = Field(min_length=10, max_length=4000)
    interested_products: Optional[list] = Field(default=None, max_length=6)
    custom_fields: Optional[dict] = None
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

    # Normalize product interests to the canonical key list so downstream
    # analytics/tags always match PRODUCT_KEYS.
    interested = [k for k in (payload.interested_products or []) if k in PRODUCT_KEYS]
    custom_fields = payload.custom_fields or {}
    if interested:
        custom_fields = dict(custom_fields)
        custom_fields.setdefault("interested_products", interested)

    doc = {
        "full_name": payload.full_name.strip(),
        "email": email,
        "phone": (payload.phone or "").strip(),
        "organization": (payload.organization or "").strip(),
        "topic": topic,
        "segment_detail": (payload.segment_detail or "").strip() or None,
        "message": payload.message.strip(),
        "interested_products": interested,
        "custom_fields": custom_fields or None,
        "status": "new",
        "source": "website_contact_form",
        "ip": request.client.host if request.client else None,
        "created_at": now,
    }
    res = await db.contact_inquiries.insert_one(dict(doc))

    # Keep the CRM in sync without failing the request if that part breaks.
    try:
        crm_tags = ["website-inquiry", topic]
        for prod in interested:
            crm_tags.append(f"product:{prod}")
        await db.contacts.update_one(
            {"email": email},
            {
                "$setOnInsert": {
                    "name": doc["full_name"],
                    "email": email,
                    "phone": doc["phone"],
                    "source": "website",
                    "tags": crm_tags,
                    "lists": [],
                    "subscribed": True,
                    "created_at": now.isoformat(),
                },
                "$addToSet": {
                    "tags": {"$each": crm_tags},
                    "interested_products": {"$each": interested} if interested else [],
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
        prod_line = ""
        if interested:
            prod_line = (
                f"<p><b>Interested in:</b> "
                f"{html.escape(', '.join(PRODUCT_LABELS.get(p, p) for p in interested))}</p>"
            )
        detail_line = (
            f"<p><b>Segment:</b> {html.escape(doc['segment_detail'])}</p>"
            if doc.get("segment_detail") else ""
        )
        body = render_html_email(
            f"<h2 style='margin:0 0 12px'>New website inquiry — {html.escape(TOPIC_LABEL[topic])}</h2>"
            f"<p><b>From:</b> {html.escape(doc['full_name'])} &lt;{html.escape(email)}&gt;<br>"
            f"<b>Phone:</b> {html.escape(doc['phone'] or '—')}<br>"
            f"<b>Organization:</b> {html.escape(doc['organization'] or '—')}</p>"
            f"{detail_line}{prod_line}"
            f"<p style='white-space:pre-wrap'>{html.escape(doc['message'])}</p>"
            f"<p style='color:#888;font-size:12px'>Inquiry id {res.inserted_id}</p>"
        )
        await send_email(to_addr, f"[Contact] {TOPIC_LABEL[topic]} — {doc['full_name']}", body)
    except Exception as e:  # pragma: no cover - email outage must not lose the inquiry
        logger.warning("[CONTACT] Notification email failed: %s", e)

    # CT8 — branded confirmation to the inquirer. Failure never blocks the submission.
    try:
        first_name = doc["full_name"].split(" ")[0]
        coupon_blocks = (
            "<p style='margin:18px 0 8px'><b>Welcome to the AXISS Ecosystem — exclusive offers for you:</b></p>"
            "<table style='border-spacing:10px;display:table;max-width:100%'><tr>"
            "<td style='border:1px solid #E5E7EB;border-radius:10px;padding:14px 18px;background:#FAFAFC;min-width:180px'>"
            "<div style='font-size:12px;font-weight:700;color:#5B4FE9'>CodeSpectra.ai — 3 months free</div>"
            "<div style='font-size:12px;color:#555;margin:6px 0 8px'>Free 3 months on our technical assessment platform.</div>"
            "<div style='font-family:monospace;font-size:14px;font-weight:700;background:#F0EEFF;color:#4C3FD6;border:1px dashed #8B84FF;border-radius:8px;padding:6px 10px;display:inline-block'>SACODE3M</div>"
            "<div style='font-size:11px;color:#666;margin-top:8px'>Register on StudentAlumni.ai, then apply at codespectra.ai checkout.</div>"
            "</td>"
            "<td style='border:1px solid #E5E7EB;border-radius:10px;padding:14px 18px;background:#FAFAFC;min-width:180px'>"
            "<div style='font-size:12px;font-weight:700;color:#10B981'>WeHive.co.in — 15% off</div>"
            "<div style='font-size:12px;color:#555;margin:6px 0 8px'>15% off visa, study-abroad &amp; travel services.</div>"
            f"<div style='font-family:monospace;font-size:14px;font-weight:700;background:#E7F9F1;color:#0E8A5F;border:1px dashed #10B981;border-radius:8px;padding:6px 10px;display:inline-block'>SAWEHIVE15</div>"
            "<div style='font-size:11px;color:#666;margin-top:8px'>Visit wehive.co.in and redeem at checkout.</div>"
            "</td>"
            "</tr></table>"
        )
        confirm_body = render_html_email(
            f"<h2 style='margin:0 0 10px'>Thank you for reaching out, {html.escape(first_name)}!</h2>"
            f"<p>We have received your message about <b>{html.escape(TOPIC_LABEL[topic])}</b> "
            f"and our campus relations team will respond within 24 hours.</p>"
            f"{coupon_blocks}"
            f"<p style='margin:20px 0 10px'><a href='https://studentalumni.ai/register' "
            "style='display:inline-block;background:#5B4FE9;color:#fff;text-decoration:none;font-weight:700;"
            "border-radius:10px;padding:11px 18px;font-size:14px'>Create Your Free StudentAlumni Account</a></p>"
            f"<p style='color:#888;font-size:12px'>Ref: inquiry {res.inserted_id} · You receive this because you "
            "submitted our public contact form. If you did not, reply to this email to be removed from our records. "
            "We store your details in line with our DPDP-consent notice: used only to respond to your inquiry and "
            "improve the product. Unsubscribe: reply 'unsubscribe' to this address.</p>"
        )
        await send_email(email, f"Your inquiry reached us, {first_name}", confirm_body)
    except Exception as e:  # pragma: no cover - confirmation must not block the submission
        logger.warning("[CONTACT] Confirmation email failed: %s", e)

    return {"ok": True, "id": str(res.inserted_id)}


# ----------------------------------------------------------------------------
# CT7 — Admin: contact-inquiry analytics (aggregates contact_inquiries)
# ----------------------------------------------------------------------------
@admin_router.get("/admin/contact/analytics")
async def contact_analytics(user: dict = Depends(get_current_user)):
    """Admin-only: aggregate contact_inquiries for the last 30 days."""
    ensure_admin(user)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=30)
    col = db.contact_inquiries

    # Total + last-30d totals
    total_30 = await col.count_documents({"created_at": {"$gte": start}})

    # Submissions per day (last 30d)
    per_day = await col.aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]).to_list(30)
    daily = {row["_id"]: row["count"] for row in per_day}
    # Fill gaps so the frontend line chart is dense
    daily_series = []
    for i in range(30, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_series.append({"date": d, "count": daily.get(d, 0)})

    # By topic
    by_topic = await col.aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {"_id": "$topic", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    topics = [{"topic": r["_id"] or "general", "label": TOPIC_LABEL.get(r["_id"] or "general", r["_id"] or "general"), "count": r["count"]} for r in by_topic]

    # Top organizations
    top_orgs = await col.aggregate([
        {"$match": {"created_at": {"$gte": start}, "organization": {"$nin": ["", None]}}},
        {"$group": {"_id": "$organization", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(10)
    orgs = [{"organization": r["_id"], "count": r["count"]} for r in top_orgs]

    # Product distribution (flattened interested_products, last 30d)
    prod_dist = await col.aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$unwind": {"path": "$interested_products", "preserveNullAndEmptyArrays": True}},
        {"$match": {"interested_products": {"$ne": None}}},
        {"$group": {"_id": "$interested_products", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    products = [
        {"product": r["_id"], "label": PRODUCT_LABELS.get(r["_id"], r["_id"]), "count": r["count"]}
        for r in prod_dist if r["_id"] in PRODUCT_KEYS
    ]

    return {
        "window_days": 30,
        "total_30d": total_30,
        "daily": daily_series,
        "by_topic": topics,
        "top_orgs": orgs,
        "product_distribution": products,
    }

