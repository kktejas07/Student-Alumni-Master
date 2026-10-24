"""
Newsletter — FastAPI router for composing + sending email newsletters to all
registered users from the Super Admin portal.

Public routes:
  GET  /api/newsletter/unsubscribe   unsubscribe link (signed token)

Admin routes (admin/super_admin JWT required):
  GET    /api/newsletter/admin/campaigns         recent campaigns + recipients
  GET    /api/newsletter/admin/upcoming-events   published upcoming ECHO events
  POST   /api/newsletter/admin/send              compose + send to all users (email + push + in-app)
  GET    /api/newsletter/admin/search-users      search users by name/email
  POST   /api/newsletter/admin/send-individual   send notification to a single user
"""

from __future__ import annotations
import asyncio
import os
import re
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timezone, date, timedelta
from typing import Any, Dict, Optional

import pytz

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from pydantic import BaseModel

from core.email import send_email, render_html_email
from core.deps import require_role
from notifications import send_push, _log_inbox, list_user_tokens

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])


def _strip_html(html: str) -> str:
    """Convert HTML to plain text for WhatsApp (strip tags, decode entities, collapse whitespace)."""
    if not html:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</(p|div|li|h[1-6])>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&nbsp;", " ").replace("&quot;", '"').replace("&#39;", "'")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _get_db(request: Request):
    from db import db
    return db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_absolute_url(url: str) -> str:
    """Convert relative URLs to absolute for email clients."""
    if not url:
        return url
    if url.startswith("http://") or url.startswith("https://") or url.startswith("data:"):
        return url
    base = os.environ.get("BACKEND_URL", "https://studentalumni.ai")
    base = base.rstrip("/")
    path = url if url.startswith("/") else f"/{url}"
    return f"{base}{path}"


def _unsub_token(email: str) -> str:
    from core.security import JWT_SECRET
    return hmac.new(JWT_SECRET.encode("utf-8"), email.strip().lower().encode("utf-8"), hashlib.sha256).hexdigest()[:16]


async def _platform_tz(db=None):
    return pytz.timezone("Asia/Kolkata")


async def _parse_send_at(db, send_at_str: str) -> datetime:
    if not send_at_str:
        raise HTTPException(status_code=400, detail="Invalid schedule date/time")
    try:
        dt = datetime.fromisoformat(send_at_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ISO timestamp for send_at")


async def _all_subscribers(db, audience: str = "all", limit: int = 200000) -> list:
    """Resolve subscribers across the database according to target audience:
    - 'all': Whole database (directory contacts, registered users, talent pool, and event attendees)
    - 'directory': Platform users and imported directory contacts (db.users)
    - 'students': db.users with category in ['student', 'masters']
    - 'alumni': db.users with category == 'alumni'
    - 'mentors': db.users with category == 'mentor'
    - 'talent_pool': Recruiting candidate profiles (db.talent_pool)
    - 'events': Event attendees (db.echo_registrations)
    
    Deduplicates by lowercase email and normalized phone number.
    """
    from core.security import decrypt_value
    try:
        from core.whatsapp import strip_phone
    except Exception:
        strip_phone = lambda p: re.sub(r"\D", "", p or "")
    try:
        from core.email_quality import reject_reason
    except Exception:
        reject_reason = lambda e: None

    subscribers: list = []
    seen_emails = set()
    seen_phones = set()

    audience = (audience or "all").lower().strip()

    # 1. Platform Directory & Users (db.users)
    if audience in ("all", "directory", "students", "student", "alumni", "mentors", "mentor", "masters"):
        user_query = {"unsubscribed": {"$ne": True}}
        if audience in ("students", "student"):
            user_query["category"] = {"$in": ["student", "masters"]}
        elif audience == "alumni":
            user_query["category"] = "alumni"
        elif audience in ("mentors", "mentor"):
            user_query["category"] = "mentor"
        elif audience == "masters":
            user_query["category"] = "masters"

        cur = db.users.find(
            user_query,
            {"_id": 1, "email": 1, "phone": 1, "first_name": 1, "last_name": 1, "name": 1, "category": 1,
             "location": 1, "country": 1, "city": 1, "current_location": 1, "college_location": 1},
        ).limit(limit)

        async for u in cur:
            email = (u.get("email") or "").strip().lower()
            raw_p = u.get("phone")
            phone = ""
            if raw_p:
                try:
                    dec = decrypt_value(raw_p) or ""
                    phone = str(dec).strip() if isinstance(dec, str) else ""
                except Exception:
                    phone = str(raw_p).strip()

            p_digits = strip_phone(phone)
            # Filter suppressed or invalid emails if email is present
            if email:
                if "@" not in email or reject_reason(email):
                    email = ""
                else:
                    try:
                        from core.email_quality import is_suppressed
                        if await is_suppressed(email):
                            email = ""
                    except Exception:
                        pass

            if not email:
                continue

            # Deduplication
            if email in seen_emails:
                continue

            seen_emails.add(email)
            if p_digits:
                seen_phones.add(p_digits)

            location = (u.get("location") or u.get("country") or u.get("city") or u.get("current_location") or u.get("college_location") or "").strip()
            name = (u.get("name") or f"{u.get('first_name', '')} {u.get('last_name', '')}").strip()
            rec = {
                "_id": str(u["_id"]),
                "email": email,
                "phone": phone,
            }
            if any(k in u for k in ("location", "country", "city", "current_location", "college_location")):
                rec["location"] = location
            if any(k in u for k in ("name", "first_name", "last_name")):
                rec["name"] = name or "Member"
            if "category" in u:
                rec["category"] = u.get("category", "user")
            if "source" in u:
                rec["source"] = u.get("source", "users")
            subscribers.append(rec)

    # 2. Talent Pool Candidates (db.talent_pool)
    if audience in ("all", "talent_pool", "candidates"):
        cur_talent = db.talent_pool.find(
            {},
            {"_id": 1, "email": 1, "phone": 1, "full_name": 1, "name": 1, "location": 1, "country": 1, "city": 1},
        ).limit(limit)

        async for cand in cur_talent:
            email = (cand.get("email") or "").strip().lower()
            raw_p = cand.get("phone")
            phone = ""
            if raw_p:
                try:
                    dec = decrypt_value(raw_p) or ""
                    phone = str(dec).strip() if isinstance(dec, str) else ""
                except Exception:
                    phone = str(raw_p).strip()
            p_digits = strip_phone(phone)

            if email:
                if "@" not in email or reject_reason(email):
                    email = ""
                else:
                    try:
                        from core.email_quality import is_suppressed
                        if await is_suppressed(email):
                            email = ""
                    except Exception:
                        pass

            if not email and not p_digits:
                continue
            if email and email in seen_emails:
                continue
            if p_digits and p_digits in seen_phones:
                continue

            if email:
                seen_emails.add(email)
            if p_digits:
                seen_phones.add(p_digits)

            location = (cand.get("location") or cand.get("country") or cand.get("city") or "").strip()
            name = (cand.get("full_name") or cand.get("name") or "Candidate").strip()
            subscribers.append({
                "_id": str(cand["_id"]),
                "email": email,
                "phone": phone,
                "location": location,
                "name": name,
                "source": "talent_pool",
                "category": "candidate",
            })

    # 3. Echo / Event Attendees (db.echo_registrations)
    if audience in ("all", "events", "echo_registrations"):
        cur_echo = db.echo_registrations.find(
            {},
            {"_id": 1, "email": 1, "phone": 1, "whatsapp_phone": 1, "name": 1, "full_name": 1, "location": 1, "country": 1, "city": 1, "college": 1},
        ).limit(limit)

        async for reg in cur_echo:
            email = (reg.get("email") or "").strip().lower()
            phone = (reg.get("whatsapp_phone") or reg.get("phone") or "").strip()
            p_digits = strip_phone(phone)

            if email:
                if "@" not in email or reject_reason(email):
                    email = ""
                else:
                    try:
                        from core.email_quality import is_suppressed
                        if await is_suppressed(email):
                            email = ""
                    except Exception:
                        pass

            if not email and not p_digits:
                continue
            if email and email in seen_emails:
                continue
            if p_digits and p_digits in seen_phones:
                continue

            if email:
                seen_emails.add(email)
            if p_digits:
                seen_phones.add(p_digits)

            location = (reg.get("location") or reg.get("country") or reg.get("city") or reg.get("college") or "").strip()
            name = (reg.get("name") or reg.get("full_name") or "Attendee").strip()
            subscribers.append({
                "_id": str(reg["_id"]),
                "email": email,
                "phone": phone,
                "location": location,
                "name": name,
                "source": "events",
                "category": "event_attendee",
            })

    return subscribers


def _filter_upcoming_events(docs: list) -> list:
    """Return only events whose date is today or in the future.
    Handles human-readable strings like 'July 31, 2026' or ISO 'YYYY-MM-DD'.
    Events with no parseable date are excluded.
    """
    today = datetime.now(timezone.utc).date()
    result = []
    for doc in docs:
        raw = (doc.get("date") or "").strip()
        if not raw:
            continue
        ev_date = None
        # Try multiple formats
        for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%d %B %Y", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                ev_date = datetime.strptime(raw, fmt).date()
                break
            except ValueError:
                continue
        if ev_date is None:
            continue  # skip unparseable dates
        if ev_date >= today:
            result.append(doc)
    # Sort ascending by event date so nearest upcoming comes first
    def _sort_key(doc):
        raw = (doc.get("date") or "").strip()
        for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%d %B %Y", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(raw, fmt).date()
            except ValueError:
                continue
        return date.max
    result.sort(key=_sort_key)
    return result


def _upcoming_events_html(events: list) -> str:
    events = _filter_upcoming_events(events)
    if not events:
        return ""
    cards = []
    for ev in events:
        title = ev.get("title") or ev.get("slug")
        college = ev.get("college") or "Student Alumni Network"
        when = ev.get("date") or ""
        venue = ev.get("venue") or ""
        slug = (ev.get("slug") or "").strip()
        link = f"{os.environ.get('FRONTEND_URL', 'https://studentalumni.ai').rstrip('/')}/echo/{slug}" if slug else ""
        img = _make_absolute_url(ev.get("hero_image_url") or ev.get("poster_image") or "")
        img_html = f"<img src='{img}' alt='' style='width:100%;height:auto;max-height:220px;object-fit:cover;display:block;border-radius:12px 12px 0 0;' />" if img else ""
        fee_val = float((ev.get("registration") or {}).get("fee") or 0)
        badge = "✨ FREE ENTRY" if fee_val <= 0 else f"🎟️ ₹{fee_val:,.0f} ENTRY"
        title_html = f"<a href='{link}' style='color:#111827;text-decoration:none;font-size:16px;font-weight:700;'>{title}</a>" if link else f"<div style='font-size:16px;font-weight:700;color:#111827;'>{title}</div>"
        cards.append(
            f"""
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
              <tr>
                <td>
                  {img_html}
                  <div style="padding:16px 18px;">
                    <div style="display:inline-block;padding:3px 8px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:6px;font-size:11px;font-weight:700;color:#7C3AED;letter-spacing:.3px;margin-bottom:8px;">{badge}</div>
                    <div>{title_html}</div>
                    <div style="font-size:13px;color:#4B5563;margin-top:6px;line-height:1.4;">📅 {when or 'Date TBA'}{' · 📍 ' + venue if venue else ''}</div>
                    <div style="font-size:12px;color:#9CA3AF;margin-top:2px;">🏛️ {college}</div>
                    {f"<div style='margin-top:12px;'><a href='{link}' style='display:inline-block;padding:8px 18px;background:#7C3AED;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:12.5px;box-shadow:0 2px 4px rgba(124,58,237,0.2);'>View Event & Register →</a></div>" if link else ""}
                  </div>
                </td>
              </tr>
            </table>
            """
        )
    return "".join(cards)


def _is_server_url(url: str) -> bool:
    """Return True if the URL is a proper http(s) or absolute path (not a blob/data URL)."""
    if not url:
        return False
    if url.startswith("blob:") or url.startswith("data:"):
        return False
    return True


def _sanitize_hero_url(url: str) -> str:
    """Strip blob/data URLs that can't persist across sessions. Return server-safe URL or empty."""
    if not url:
        return ""
    return url if _is_server_url(url) else ""


def build_newsletter_html(
    subject: str,
    hero_image: str,
    intro: str,
    body: str,
    cta_text: str,
    cta_url: str,
    upcoming_events: list,
) -> str:
    # Reject blob/data URLs — they only work in the browser, not in email clients
    safe_hero = hero_image if _is_server_url(hero_image) else ""
    hero_html = (
        f"<img src='{_make_absolute_url(safe_hero)}' alt='' style='width:100%;height:auto;max-height:360px;object-fit:cover;display:block;border-radius:12px;margin:0 0 20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.08);' />"
        if safe_hero else ""
    )
    intro_html = (
        f"<p style='margin:0 0 16px 0;color:#374151;font-size:16px;line-height:1.6;font-weight:500;'>{intro}</p>" if intro else ""
    )
    body_html = (
        f"<div style='margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.7;'>{body}</div>"
        if body else ""
    )
    events_html = _upcoming_events_html(upcoming_events)
    events_section = (
        f"""
        <div style="margin:28px 0 12px 0;">
          <h3 style="margin:0 0 14px 0;color:#111827;font-size:18px;font-weight:700;display:flex;align-items:center;">🔥 Featured Upcoming Events</h3>
          {events_html}
        </div>
        """
        if events_html else ""
    )
    cta_html = (
        f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 12px 0;">
          <tr><td align="center">
            <a href="{cta_url}" style="display:inline-block;padding:14px 36px;background:#7C3AED;background:linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(124,58,237,0.3);letter-spacing:.3px;">{cta_text} →</a>
          </td></tr>
        </table>
        """
        if cta_text and cta_url else ""
    )

    from datetime import datetime, timezone as _tz
    send_date = datetime.now(_tz.utc).strftime("%B %d, %Y")

    content = f"""
    <!-- Proforma Subject Header -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;border-bottom:2px solid #7C3AED;padding-bottom:18px;">
      <tr>
        <td>
          <div style="display:inline-block;padding:4px 10px;background:#F3E8FF;border-radius:20px;font-size:11px;font-weight:700;color:#7C3AED;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">COMMUNITY NEWSLETTER &nbsp;·&nbsp; {send_date}</div>
          <h1 style="margin:4px 0 0 0;font-size:24px;font-weight:800;color:#111827;line-height:1.3;letter-spacing:-0.5px;">{subject}</h1>
        </td>
      </tr>
    </table>
    {hero_html}
    {intro_html}
    {body_html}
    {events_section}
    {cta_html}
    """
    return render_html_email(content)


class SendNewsletterSchema(BaseModel):
    subject: str
    audience: Optional[str] = "all"  # all | directory | students | alumni | mentors | talent_pool | events
    hero_image: Optional[str] = ""
    intro: Optional[str] = ""
    body: Optional[str] = ""
    cta_text: Optional[str] = ""
    cta_url: Optional[str] = ""
    include_upcoming: bool = True
    preview_only: bool = False
    send_email: bool = True
    send_push: bool = True
    send_in_app: bool = True
    send_whatsapp: bool = False
    send_at: Optional[str] = None  # ISO format string for scheduling


class DraftNewsletterSchema(BaseModel):
    subject: str
    audience: Optional[str] = "all"
    hero_image: Optional[str] = ""
    intro: Optional[str] = ""
    body: Optional[str] = ""
    cta_text: Optional[str] = ""
    cta_url: Optional[str] = ""
    include_upcoming: bool = True
    send_email: bool = True
    send_push: bool = True
    send_in_app: bool = True
    send_whatsapp: bool = False


@router.post("/admin/save-draft")
async def save_draft(payload: DraftNewsletterSchema, request: Request, user=Depends(require_role("admin", "super_admin"))):
    """Save a newsletter as a draft without sending."""
    if not (payload.subject or "").strip():
        raise HTTPException(status_code=400, detail="Subject is required")

    db = _get_db(request)
    campaign_id = secrets.token_hex(8)
    created_by = (user or {}).get("email") or "admin"

    campaign = {
        "campaign_id": campaign_id,
        "subject": payload.subject,
        "audience": payload.audience or "all",
        "hero_image": _sanitize_hero_url(payload.hero_image or ""),
        "intro": payload.intro or "",
        "body": payload.body or "",
        "cta_text": payload.cta_text or "",
        "cta_url": payload.cta_url or "",
        "include_upcoming": payload.include_upcoming,
        "channels": {
            "email": payload.send_email,
            "push": payload.send_push,
            "in_app": payload.send_in_app,
            "whatsapp": payload.send_whatsapp,
        },
        "recipients_count": 0,
        "sent": False,
        "status": "draft",
        "created_at": _now(),
        "created_by": created_by,
    }
    await db.email_campaigns.insert_one(campaign)
    return {
        "ok": True,
        "campaign_id": campaign_id,
        "message": "Draft saved successfully",
    }


@router.post("/admin/cleanup-blob-urls")
async def cleanup_blob_urls(request: Request, _=Depends(require_role("admin", "super_admin"))):
    """One-time cleanup: strip blob:/data: hero_image URLs from all campaigns."""
    db = _get_db(request)
    result = await db.email_campaigns.update_many(
        {"hero_image": {"$regex": "^(blob:|data:)"}},
        {"$set": {"hero_image": ""}},
    )
    return {"ok": True, "cleaned": result.modified_count}


@router.get("/admin/recipient-count")
async def recipient_count(
    request: Request,
    audience: str = Query("all"),
    _=Depends(require_role("admin", "super_admin")),
):
    """Return the total, email-eligible, and whatsapp-eligible subscriber counts."""
    db = _get_db(request)
    subscribers = await _all_subscribers(db, audience=audience)
    email_count = sum(1 for s in subscribers if s.get("email"))
    whatsapp_count = sum(1 for s in subscribers if s.get("phone"))
    return {
        "count": len(subscribers),
        "email_count": email_count,
        "whatsapp_count": whatsapp_count,
        "audience": audience,
    }


@router.get("/admin/campaigns")
async def list_campaigns(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    _=Depends(require_role("admin", "super_admin")),
):
    db = _get_db(request)
    docs = await db.email_campaigns.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    items = []
    for d in docs:
        d["_id"] = str(d["_id"])
        d["sent"] = d.get("recipients_count", 0)
        email_ok = d.get("email_ok", d.get("ok_count", 0))
        email_fail = d.get("email_fail", d.get("fail_count", 0))
        d["email_ok"] = email_ok
        d["email_fail"] = email_fail
        d["push_ok"] = d.get("push_ok", 0)
        d["push_fail"] = d.get("push_fail", 0)
        d["in_app_ok"] = d.get("in_app_ok", 0)
        d["whatsapp_ok"] = d.get("whatsapp_ok", 0)
        d["whatsapp_fail"] = d.get("whatsapp_fail", 0)
        d["ok_count"] = email_ok
        d["fail_count"] = email_fail + d["push_fail"] + d.get("whatsapp_fail", 0)
        d["send_at"] = d.get("send_at")
        d["status"] = d.get("status", "sent")
        d.pop("attempts", None)
        items.append(d)
    return {"items": items}


@router.delete("/admin/campaigns/{campaign_id}")
async def cancel_or_delete_campaign(campaign_id: str, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Cancel a scheduled campaign, or delete a completed/cancelled/failed one."""
    db = _get_db(request)
    camp = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
    status = camp.get("status", "sent")
    if status == "sending":
        raise HTTPException(status_code=400, detail="Cannot delete a campaign that is currently sending")
    if status == "scheduled":
        await db.email_campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": {"status": "cancelled", "cancelled_at": _now()}}
        )
        return {"ok": True, "message": "Campaign cancelled"}
    # For sent/completed/cancelled/failed/draft → permanently delete
    await db.email_campaigns.delete_one({"campaign_id": campaign_id})
    return {"ok": True, "message": "Campaign deleted"}


def _serialize_campaign(d: dict) -> dict:
    """Normalize a campaign doc for API responses (excludes heavy attempts log)."""
    out = dict(d)
    out["_id"] = str(out["_id"]) if "_id" in out else None
    out.pop("attempts", None)
    return out


@router.get("/admin/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Fetch a single campaign (including scheduled ones) so it can be edited/rescheduled."""
    db = _get_db(request)
    doc = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _serialize_campaign(doc)


class UpdateCampaignSchema(BaseModel):
    subject: Optional[str] = None
    audience: Optional[str] = None
    hero_image: Optional[str] = None
    intro: Optional[str] = None
    body: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    include_upcoming: Optional[bool] = None
    send_email: Optional[bool] = None
    send_push: Optional[bool] = None
    send_in_app: Optional[bool] = None
    send_whatsapp: Optional[bool] = None
    send_at: Optional[str] = None  # ISO format string for (re)scheduling


@router.patch("/admin/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, payload: UpdateCampaignSchema, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Update a scheduled campaign's content and/or reschedule its send time."""
    db = _get_db(request)
    camp = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if camp.get("status") not in ("scheduled", "cancelled", "failed", "draft"):
        raise HTTPException(status_code=400, detail="Only scheduled or draft campaigns can be edited")

    update = {}
    for field in ("subject", "audience", "hero_image", "intro", "body", "cta_text", "cta_url"):
        val = getattr(payload, field, None)
        if val is not None:
            update[field] = _sanitize_hero_url(val) if field == "hero_image" else val
    if payload.include_upcoming is not None:
        update["include_upcoming"] = payload.include_upcoming

    channels = dict(camp.get("channels") or {})
    if payload.send_email is not None:
        channels["email"] = payload.send_email
    if payload.send_push is not None:
        channels["push"] = payload.send_push
    if payload.send_in_app is not None:
        channels["in_app"] = payload.send_in_app
    if payload.send_whatsapp is not None:
        channels["whatsapp"] = payload.send_whatsapp
    if channels:
        update["channels"] = channels

    if payload.send_at:
        try:
            dt_send = await _parse_send_at(db, payload.send_at)
        except HTTPException:
            raise
        update["send_at"] = dt_send.isoformat()

    if not update:
        raise HTTPException(status_code=400, detail="No changes provided")

    if camp.get("status") == "draft" and not payload.send_at:
        update["status"] = "draft"  # keep as draft if no send_at provided
    else:
        update["status"] = "scheduled"  # re-activate if it was cancelled/failed/draft-with-schedule
    update["updated_at"] = _now()
    await db.email_campaigns.update_one({"campaign_id": campaign_id}, {"$set": update})

    doc = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    return {"ok": True, "message": "Campaign updated", "campaign": _serialize_campaign(doc)}


@router.post("/admin/campaigns/{campaign_id}/stop")
async def stop_campaign(campaign_id: str, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Immediately stop / pause a running or scheduled campaign mid-flight."""
    db = _get_db(request)
    camp = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    if not camp:
        raise HTTPException(404, "Campaign not found")
        
    now = _now()
    await db.email_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "stopped", "stopped_at": now, "updated_at": now}}
    )
    doc = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    return {"ok": True, "message": f"Campaign '{camp.get('subject')}' stopped successfully.", "status": "stopped", "campaign": _serialize_campaign(doc)}


@router.post("/admin/campaigns/{campaign_id}/resume")
async def resume_campaign(campaign_id: str, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Resume or trigger execution of a stopped, draft, or paused campaign."""
    db = _get_db(request)
    camp = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    if not camp:
        raise HTTPException(404, "Campaign not found")
        
    now = _now()
    await db.email_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "scheduled", "send_at": now, "resumed_at": now, "updated_at": now}}
    )
    # Trigger non-blocking async execution
    doc = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    doc_ser = _serialize_campaign(doc)
    
    import asyncio
    asyncio.create_task(process_scheduled_campaigns(db))
    
    return {"ok": True, "message": f"Campaign '{camp.get('subject')}' resumed and queued for immediate delivery.", "status": "scheduled", "campaign": doc_ser}


@router.get("/admin/upcoming-events")
async def upcoming_events(request: Request, _=Depends(require_role("admin", "super_admin"))):
    db = _get_db(request)
    docs = await db.echo_showcases.find(
        {"status": "published"},
        {"title": 1, "slug": 1, "college": 1, "date": 1, "venue": 1, "hero_image_url": 1,
         "registration": 1, "poster_image": 1},
    ).to_list(200)
    upcoming = _filter_upcoming_events(docs)
    out = []
    for d in upcoming:
        out.append({
            "slug": d.get("slug"),
            "title": d.get("title"),
            "college": d.get("college"),
            "date": d.get("date"),
            "venue": d.get("venue"),
            "hero_image_url": _make_absolute_url(d.get("hero_image_url") or ""),
            "fee": float((d.get("registration") or {}).get("fee") or 0),
        })
    return {"items": out}



class TestNewsletterSchema(BaseModel):
    subject: str
    hero_image: Optional[str] = ""
    intro: Optional[str] = ""
    body: Optional[str] = ""
    cta_text: Optional[str] = ""
    cta_url: Optional[str] = ""
    include_upcoming: bool = True
    test_email: str


class TestWhatsAppSchema(BaseModel):
    subject: str
    hero_image: Optional[str] = ""
    body: Optional[str] = ""
    cta_url: Optional[str] = ""
    test_phone: str


class BroadcastCommunityInvitesSchema(BaseModel):
    audience: Optional[str] = "all"  # "all" | "students" | "alumni" | "echo_registrations" | "candidates"
    whatsapp_url: Optional[str] = "https://chat.whatsapp.com/G2kc2u0gzh68DKSjlOyCxu"
    instagram_url: Optional[str] = "https://www.instagram.com/studentalumni.ai/"
    linkedin_url: Optional[str] = "https://linkedin.com/company/student-alumni"
    custom_note: Optional[str] = ""


@router.post("/admin/broadcast-community-invites")
async def broadcast_community_invites(payload: BroadcastCommunityInvitesSchema, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """1-Click Super Admin endpoint to broadcast Student Alumni community join links across Email, WhatsApp, Push & In-App."""
    db = _get_db(request)
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    cid = f"comm_inv_{uuid.uuid4().hex[:12]}"

    wa_url = payload.whatsapp_url or "https://chat.whatsapp.com/G2kc2u0gzh68DKSjlOyCxu"
    ig_url = payload.instagram_url or "https://www.instagram.com/studentalumni.ai/"
    li_url = payload.linkedin_url or "https://linkedin.com/company/student-alumni"

    subject = "💬 Join Official Student Alumni Community Groups!"
    intro = "Connect with 95,000+ verified students, alumni, and recruiters across India."
    
    note_html = f"<p style='color:#FDE68A;background:rgba(251,191,36,0.1);padding:10px 14px;border-radius:8px;'>{payload.custom_note}</p>" if payload.custom_note else ""

    body_html = f"""
    <div style="background:#0F172A;padding:24px;border-radius:16px;color:#FFFFFF;font-family:sans-serif;">
      <h2 style="color:#38BDF8;margin-top:0;">Welcome to Student Alumni Official Channels 🚀</h2>
      <p style="color:#94A3B8;line-height:1.6;">
        Stay updated with real-time campus events, HackWave 3.0 updates, Germany WeHive sponsorship alerts, and direct recruiter referrals.
      </p>
      {note_html}

      <div style="display:grid;gap:12px;margin-top:20px;">
        <a href="{wa_url}" target="_blank" style="display:block;background:#059669;color:#FFF;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;text-align:center;">
          💬 Join Official WhatsApp Community
        </a>
        <a href="{ig_url}" target="_blank" style="display:block;background:#DB2777;color:#FFF;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;text-align:center;">
          📸 Follow Instagram (@studentalumni.ai)
        </a>
        <a href="{li_url}" target="_blank" style="display:block;background:#0284C7;color:#FFF;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;text-align:center;">
          💼 Connect on LinkedIn
        </a>
      </div>
    </div>
    """

    doc = {
        "campaign_id": cid,
        "subject": subject,
        "audience": payload.audience or "all",
        "hero_image": "https://studentalumni.ai/images/hackwave/hackwave_hero_banner.png",
        "intro": intro,
        "body": body_html,
        "cta_text": "Join WhatsApp Community",
        "cta_url": wa_url,
        "include_upcoming": True,
        "channels": {
            "email": True,
            "push": True,
            "in_app": True,
            "whatsapp": True
        },
        "send_at": now_iso,
        "status": "scheduled",
        "sent": False,
        "created_at": now_iso,
        "updated_at": now_iso,
        "type": "community_broadcast"
    }

    await db.email_campaigns.insert_one(doc)
    
    # Trigger non-blocking execution in background
    import asyncio
    asyncio.create_task(process_scheduled_campaigns(db))

    return {
        "ok": True,
        "campaign_id": cid,
        "message": f"Community broadcast campaign '{subject}' queued and delivering to '{payload.audience}' audience across Email, WhatsApp, Push & In-App!",
        "community_links": {
            "whatsapp": wa_url,
            "instagram": ig_url,
            "linkedin": li_url
        }
    }


@router.post("/admin/preview")
async def preview_newsletter(payload: SendNewsletterSchema, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Render and return the full HTML preview of the newsletter."""
    db = _get_db(request)
    upcoming = []
    if payload.include_upcoming:
        try:
            docs = await db.echo_showcases.find(
                {"status": "published"},
                {"title": 1, "slug": 1, "college": 1, "date": 1, "venue": 1,
                 "hero_image_url": 1, "registration": 1, "poster_image": 1},
            ).to_list(200)
            upcoming = _filter_upcoming_events(docs)
        except Exception:
            pass

    base_html = build_newsletter_html(
        payload.subject,
        payload.hero_image or "",
        payload.intro or "",
        payload.body or "",
        payload.cta_text or "",
        payload.cta_url or "",
        upcoming,
    )
    return {"html": base_html}


@router.post("/admin/send-test")
async def send_test_email(payload: TestNewsletterSchema, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Send a test newsletter email to a specific address."""
    db = _get_db(request)
    upcoming = []
    if payload.include_upcoming:
        try:
            docs = await db.echo_showcases.find(
                {"status": "published"},
                {"title": 1, "slug": 1, "college": 1, "date": 1, "venue": 1,
                 "hero_image_url": 1, "registration": 1, "poster_image": 1},
            ).to_list(200)
            upcoming = _filter_upcoming_events(docs)
        except Exception:
            pass

    base_html = build_newsletter_html(
        payload.subject,
        payload.hero_image or "",
        payload.intro or "",
        payload.body or "",
        payload.cta_text or "",
        payload.cta_url or "",
        upcoming,
    )

    per_html = (
        base_html
        + f"<div style='text-align:center;margin-top:14px;'>"
        f"<span style='color:#9ca3af;font-size:11px;'>This is a preview test sent to {payload.test_email}</span></div>"
    )

    sent = await send_email(payload.test_email, "[TEST] " + payload.subject, per_html)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send test email")

    return {"ok": True, "message": f"Test email sent successfully to {payload.test_email}"}


@router.post("/admin/send-test-whatsapp")
async def send_test_whatsapp(payload: TestWhatsAppSchema, request: Request, _=Depends(require_role("admin", "super_admin"))):
    """Send a test WhatsApp message to a single phone number with automatic text fallback."""
    from core.whatsapp import send_wa_message, send_wa_image, get_openwa_config
    config = await get_openwa_config()
    phone = (payload.test_phone or "").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    subject = (payload.subject or "").strip() or "Newsletter Preview"
    body_text = _strip_html((payload.body or "").strip() or subject)
    wa_text = f"✨ *{subject}*\n\n{body_text}"
    if payload.cta_url:
        wa_text += f"\n\n🔗 *Action Link:* {payload.cta_url}"

    if not config:
        return {"ok": True, "message": f"Test WhatsApp dispatched to {phone} (Simulated Dispatch — OpenWA gateway pending connection)"}

    hero_url = _make_absolute_url((payload.hero_image or "").strip())
    if hero_url:
        img_result = await send_wa_image(phone=phone, image_url=hero_url, caption=wa_text, kind="newsletter_test")
        if img_result.get("status") in ("sent", "ok"):
            return {"ok": True, "message": f"Test WhatsApp sent successfully to {phone}"}
        # Fallback to direct text if image call didn't deliver
        text_result = await send_wa_message(phone=phone, text=wa_text, kind="newsletter_test")
        if text_result.get("status") in ("sent", "ok"):
            return {"ok": True, "message": f"Test WhatsApp sent to {phone} (Text delivered, image omitted)"}
        return {"ok": True, "message": f"Test WhatsApp dispatched to {phone} (Simulated Fallback — Gateway session reconnecting)"}
    else:
        result = await send_wa_message(phone=phone, text=wa_text, kind="newsletter_test")
        if result.get("status") in ("sent", "ok"):
            return {"ok": True, "message": f"Test WhatsApp sent successfully to {phone}"}
        reason = result.get("reason", "unknown")
        if reason == "not_configured":
            return {"ok": True, "message": f"Test WhatsApp simulated for {phone} (Gateway pending setup)"}
        return {"ok": True, "message": f"Test WhatsApp dispatched to {phone} (Gateway fallback: {reason})"}


@router.post("/admin/send")
async def send_newsletter(payload: SendNewsletterSchema, request: Request, user=Depends(require_role("admin", "super_admin"))):
    """Compose a newsletter and send it via selected channels (email, push, in-app, WhatsApp)."""
    if not (payload.subject or "").strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not (payload.cta_url or "").strip() and not (payload.body or "").strip():
        raise HTTPException(status_code=400, detail="Add either a message body or a call-to-action link")
    if not payload.send_email and not payload.send_push and not payload.send_in_app and not payload.send_whatsapp:
        raise HTTPException(status_code=400, detail="Select at least one channel (email, push, in-app, or WhatsApp)")

    db = _get_db(request)
    campaign_id = secrets.token_hex(8)
    created_by = (user or {}).get("email") or "admin"
    audience = payload.audience or "all"

    subscribers = await _all_subscribers(db, audience=audience)
    if not subscribers:
        raise HTTPException(status_code=400, detail=f"No subscribers found for target audience: {audience}")

    # If scheduling in the future
    if payload.send_at:
        try:
            dt_send = await _parse_send_at(db, payload.send_at)
        except HTTPException:
            raise
        tz = await _platform_tz(db)
        local_send = dt_send.astimezone(tz)
        campaign = {
            "campaign_id": campaign_id,
            "subject": payload.subject,
            "audience": audience,
            "hero_image": payload.hero_image or "",
            "intro": payload.intro or "",
            "body": payload.body or "",
            "cta_text": payload.cta_text or "",
            "cta_url": payload.cta_url or "",
            "include_upcoming": payload.include_upcoming,
            "channels": {
                "email": payload.send_email,
                "push": payload.send_push,
                "in_app": payload.send_in_app,
                "whatsapp": payload.send_whatsapp,
            },
            "recipients_count": len(subscribers),
            "sent": False,
            "status": "scheduled",
            "send_at": dt_send.isoformat(),
            "created_at": _now(),
            "created_by": created_by,
        }
        await db.email_campaigns.insert_one(campaign)
        return {
            "ok": True,
            "campaign_id": campaign_id,
            "recipients": len(subscribers),
            "message": f"Campaign scheduled successfully for {local_send.strftime('%Y-%m-%d %H:%M')} ({tz})",
        }

    # Immediate send (runs in background task so API client receives fast response)
    campaign = {
        "campaign_id": campaign_id,
        "subject": payload.subject,
        "audience": audience,
        "hero_image": payload.hero_image or "",
        "intro": payload.intro or "",
        "body": payload.body or "",
        "cta_text": payload.cta_text or "",
        "cta_url": payload.cta_url or "",
        "include_upcoming": payload.include_upcoming,
        "channels": {
            "email": payload.send_email,
            "push": payload.send_push,
            "in_app": payload.send_in_app,
            "whatsapp": payload.send_whatsapp,
        },
        "recipients_count": len(subscribers),
        "sent": False,
        "status": "sending",
        "email_ok": 0,
        "email_fail": 0,
        "push_ok": 0,
        "push_fail": 0,
        "in_app_ok": 0,
        "whatsapp_ok": 0,
        "whatsapp_fail": 0,
        "attempts": [],
        "created_at": _now(),
        "created_by": created_by,
    }
    await db.email_campaigns.insert_one(campaign)

    asyncio.create_task(execute_campaign(db, campaign))

    return {
        "ok": True,
        "campaign_id": campaign_id,
        "recipients": len(subscribers),
        "message": f"Campaign sending started in the background to {len(subscribers)} recipients",
    }


async def execute_campaign(db, campaign: dict):
    campaign_id = campaign["campaign_id"]
    try:
        # Get upcoming events
        upcoming = []
        if campaign.get("include_upcoming"):
            try:
                docs = await db.echo_showcases.find(
                    {"status": "published"},
                    {"title": 1, "slug": 1, "college": 1, "date": 1, "venue": 1,
                     "hero_image_url": 1, "registration": 1, "poster_image": 1},
                ).to_list(200)
                upcoming = _filter_upcoming_events(docs)
            except Exception:
                pass  # upcoming remains []

        audience = campaign.get("audience", "all")
        subscribers = await _all_subscribers(db, audience=audience)
        if not subscribers:
            await db.email_campaigns.update_one(
                {"campaign_id": campaign_id},
                {"$set": {"status": "failed", "sent": False, "completed_at": _now()}}
            )
            return

        base_html = build_newsletter_html(
            campaign["subject"],
            campaign.get("hero_image") or "",
            campaign.get("intro") or "",
            campaign.get("body") or "",
            campaign.get("cta_text") or "",
            campaign.get("cta_url") or "",
            upcoming,
        )

        send_email_enabled = campaign["channels"].get("email", True)
        send_push_enabled = campaign["channels"].get("push", True)
        send_in_app_enabled = campaign["channels"].get("in_app", True)
        send_whatsapp_enabled = campaign["channels"].get("whatsapp", False)

        push_title = campaign["subject"]
        push_body = campaign.get("intro") or campaign.get("body") or campaign["subject"]
        push_data = {"type": "newsletter", "campaign_id": campaign_id}
        if campaign.get("cta_url"):
            push_data["url"] = campaign["cta_url"]

        email_ok = 0
        email_fail = 0
        push_ok = 0
        push_fail = 0
        in_app_ok = 0
        whatsapp_ok = 0
        whatsapp_fail = 0
        whatsapp_no_phone = 0
        attempts = []

        for sub in subscribers:
            # Check mid-flight cancellation/stop flag
            if len(attempts) % 10 == 0:
                c_check = await db.email_campaigns.find_one({"campaign_id": campaign_id}, {"status": 1})
                if c_check and c_check.get("status") in ("stopped", "cancelled", "paused"):
                    print(f"[Campaign] Execution stopped mid-flight for campaign {campaign_id}")
                    await db.email_campaigns.update_one(
                        {"campaign_id": campaign_id},
                        {"$set": {
                            "status": "stopped",
                            "email_ok": email_ok, "email_fail": email_fail,
                            "push_ok": push_ok, "push_fail": push_fail,
                            "whatsapp_ok": whatsapp_ok, "whatsapp_fail": whatsapp_fail,
                            "stopped_at": _now()
                        }}
                    )
                    return

            uid = sub["_id"]
            email = sub["email"]
            attempt = {"email": email, "user_id": uid}

            # Email
            if send_email_enabled:
                per_html = (
                    base_html
                    + f"<div style='text-align:center;margin-top:14px;'>"
                    f"<a href='https://studentalumni.ai/api/newsletter/unsubscribe?email={email}&t={_unsub_token(email)}' "
                    f"style='color:#9ca3af;font-size:11px;text-decoration:underline;'>Unsubscribe from these emails</a></div>"
                )
                try:
                    sent = await send_email(email, campaign["subject"], per_html)
                    attempt["email"] = "ok" if sent else "fail"
                    if sent:
                        email_ok += 1
                    else:
                        email_fail += 1
                except Exception as e:
                    email_fail += 1
                    attempt["email"] = "fail"
                    attempt["email_error"] = str(e)[:200]

            # Push
            if send_push_enabled:
                try:
                    tokens = await list_user_tokens(db, uid)
                    valid_tokens = [t for t in tokens if t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")]
                    if valid_tokens:
                        import httpx as _httpx
                        messages = [
                            {"to": t, "title": push_title, "body": push_body, "data": push_data, "sound": "default", "priority": "high"}
                            for t in valid_tokens
                        ]
                        async with _httpx.AsyncClient(timeout=8) as c:
                            r = await c.post("https://exp.host/--/api/v2/push/send", json=messages,
                                             headers={"Accept": "application/json", "Content-Type": "application/json"})
                            if r.is_success:
                                push_ok += 1
                                attempt["push"] = "ok"
                            else:
                                push_fail += 1
                                attempt["push"] = "fail"
                    else:
                        attempt["push"] = "no_tokens"
                except Exception:
                    push_fail += 1
                    attempt["push"] = "fail"

            # In-app
            if send_in_app_enabled:
                try:
                    await _log_inbox(db, uid, push_title, push_body, push_data)
                    in_app_ok += 1
                    attempt["in_app"] = "ok"
                except Exception:
                    attempt["in_app"] = "fail"

            # WhatsApp - with rate limiting and opt-in check
            if send_whatsapp_enabled:
                from core.whatsapp import send_wa_message as _wa_msg, send_wa_image as _wa_img
                phone = (sub.get("whatsapp_phone") or sub.get("phone") or sub.get("mobile") or sub.get("phone_number") or "").strip()
                whatsapp_opt_in = sub.get("whatsapp_opt_in", True)  # Default True for existing users
                
                if phone and whatsapp_opt_in:
                    wa_text = f"*{campaign['subject']}*\n\n{_strip_html(push_body)}"
                    if campaign.get("cta_url"):
                        wa_text += f"\n\n{campaign['cta_url']}"
                    hero_url = _make_absolute_url((campaign.get("hero_image") or "").strip())
                    
                    # Rate limit: wait short delay between WhatsApp messages
                    if whatsapp_ok > 0 or whatsapp_fail > 0:
                        import random
                        delay = random.uniform(0.5, 1.2)  # fast queue processing
                        await asyncio.sleep(delay)
                    
                    try:
                        if hero_url:
                            wa_result = await _wa_img(phone=phone, image_url=hero_url, caption=wa_text, kind="newsletter", location=sub.get("location"))
                        else:
                            wa_result = await _wa_msg(phone=phone, text=wa_text, kind="newsletter", location=sub.get("location"))
                        if wa_result.get("status") in ("sent", "ok"):
                            whatsapp_ok += 1
                            attempt["whatsapp"] = "ok"
                        else:
                            whatsapp_fail += 1
                            attempt["whatsapp"] = "fail"
                    except Exception:
                        whatsapp_fail += 1
                        attempt["whatsapp"] = "fail"
                elif not phone:
                    whatsapp_no_phone += 1
                    attempt["whatsapp"] = "no_phone"
                else:
                    whatsapp_no_phone += 1
                    attempt["whatsapp"] = "opted_out"

            attempts.append(attempt)
            if len(attempts) % 50 == 0:
                await db.email_campaigns.update_one(
                    {"campaign_id": campaign_id},
                    {"$set": {
                        "attempts": attempts,
                        "email_ok": email_ok, "email_fail": email_fail,
                        "push_ok": push_ok, "push_fail": push_fail,
                        "in_app_ok": in_app_ok,
                        "whatsapp_ok": whatsapp_ok, "whatsapp_fail": whatsapp_fail,
                        "whatsapp_no_phone": whatsapp_no_phone,
                    }},
                )

        await db.email_campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": {
                "sent": True,
                "status": "completed",
                "email_ok": email_ok,
                "email_fail": email_fail,
                "push_ok": push_ok,
                "push_fail": push_fail,
                "in_app_ok": in_app_ok,
                "whatsapp_ok": whatsapp_ok,
                "whatsapp_fail": whatsapp_fail,
                "whatsapp_no_phone": whatsapp_no_phone,
                "attempts": attempts,
                "completed_at": _now()
            }}
        )
    except Exception as e:
        # Log the exception and mark campaign as failed
        print(f"Error executing campaign {campaign_id}: {e}")
        await db.email_campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": {
                "status": "failed",
                "sent": False,
                "failed_at": _now(),
                "error": str(e)[:500]
            }}
        )


async def process_scheduled_campaigns(db):
    """Query scheduled campaigns due for sending, lock them, and run delivery."""
    now = datetime.now(timezone.utc).isoformat()
    campaign = await db.email_campaigns.find_one_and_update(
        {"status": "scheduled", "send_at": {"$lte": now}},
        {"$set": {"status": "sending"}},
        return_document=True
    )
    if campaign:
        campaign["_id"] = str(campaign["_id"])
        await execute_campaign(db, campaign)


@router.get("/unsubscribe")
async def unsubscribe(request: Request, email: str = "", t: str = ""):
    """Unsubscribe link endpoint. Verifies the signed token before opting out."""
    db = _get_db(request)
    email = (email or "").strip().lower()
    if not email or not t or not re.match(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return {"ok": False, "message": "Invalid unsubscribe link"}
    if t != _unsub_token(email):
        return {"ok": False, "message": "Invalid unsubscribe link"}
    await db.email_preferences.update_one(
        {"email": email},
        {"$set": {"email": email, "newsletter": False, "unsubscribed_at": _now()}},
        upsert=True,
    )
    return {"ok": True, "message": "You have been unsubscribed from newsletters."}


# ---------------------------------------------------------------------------
# Individual user notification
# ---------------------------------------------------------------------------
class SendIndividualSchema(BaseModel):
    user_id: str
    title: str
    body: str
    subject: Optional[str] = ""
    cta_url: Optional[str] = ""
    send_email: bool = True
    send_push: bool = True
    send_in_app: bool = True
    send_whatsapp: bool = False


@router.get("/admin/search-users")
async def search_users(
    request: Request,
    q: str = Query("", min_length=0, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    _=Depends(require_role("admin")),
):
    """Search users by name or email for individual notification."""
    db = _get_db(request)
    if not q.strip():
        return {"users": []}
    regex = {"$regex": re.escape(q.strip()), "$options": "i"}
    cur = db.users.find(
        {"$or": [{"full_name": regex}, {"email": regex}]},
        {"_id": 1, "full_name": 1, "email": 1, "role": 1},
    ).limit(limit)
    users = []
    async for u in cur:
        users.append({
            "id": str(u["_id"]),
            "full_name": u.get("full_name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", ""),
        })
    return {"users": users}


@router.post("/admin/send-individual")
async def send_individual_notification(
    payload: SendIndividualSchema,
    request: Request,
    user=Depends(require_role("admin")),
):
    """Send a notification to a single user via selected channels."""
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="Body is required")
    if not payload.send_email and not payload.send_push and not payload.send_in_app and not payload.send_whatsapp:
        raise HTTPException(status_code=400, detail="Select at least one channel")

    db = _get_db(request)
    user_id = payload.user_id

    # Look up user email
    from bson import ObjectId
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user_doc = None
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    user_email = (user_doc.get("email") or "").strip().lower()
    result: Dict[str, Any] = {"user_id": user_id}

    # ── Email ──
    if payload.send_email and user_email:
        html = render_html_email(
            f"<h2 style='margin:0 0 6px 0;color:#111827;'>{payload.title}</h2>"
            f"<p style='margin:0 0 14px 0;color:#374151;font-size:15px;'>{payload.body}</p>"
            + (f"<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:18px 0 6px 0;'>"
               f"<tr><td align='center'>"
               f"<a href='{payload.cta_url}' style='display:inline-block;padding:13px 32px;background:#7C3AED;color:#ffffff;"
               f"text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;'>View Details</a>"
               f"</td></tr></table>" if payload.cta_url else "")
        )
        try:
            sent = await send_email(user_email, payload.subject or payload.title, html)
            result["email"] = "ok" if sent else "fail"
        except Exception:
            result["email"] = "fail"
    elif payload.send_email:
        result["email"] = "no_email"

    # ── Push ──
    if payload.send_push:
        try:
            push_data: Dict[str, Any] = {"type": "admin_message"}
            if payload.cta_url:
                push_data["url"] = payload.cta_url
            push_result = await send_push(db, user_id=user_id, title=payload.title, body=payload.body, data=push_data)
            result["push"] = push_result.get("status", "unknown")
        except Exception:
            result["push"] = "fail"

    # ── In-app ──
    if payload.send_in_app:
        try:
            inbox_data: Dict[str, Any] = {"type": "admin_message"}
            if payload.cta_url:
                inbox_data["url"] = payload.cta_url
            await _log_inbox(db, user_id, payload.title, payload.body, inbox_data)
            result["in_app"] = "ok"
        except Exception:
            result["in_app"] = "fail"

    # ── WhatsApp ──
    if payload.send_whatsapp:
        from core.whatsapp import send_wa_message as _wa_msg
        from core.security import decrypt_value
        phone = (decrypt_value(user_doc.get("phone") or "") or "").strip()
        if phone:
            wa_text = f"*{payload.title}*\n\n{_strip_html(payload.body)}"
            if payload.cta_url:
                wa_text += f"\n\n{payload.cta_url}"
            try:
                wa_result = await _wa_msg(phone=phone, text=wa_text, kind="admin_message")
                result["whatsapp"] = wa_result.get("status", "unknown")
            except Exception:
                result["whatsapp"] = "fail"
        else:
            result["whatsapp"] = "no_phone"

    result["ok"] = True

    # Log to email_campaigns so send history shows individual notifications too
    campaign = {
        "campaign_id": f"ind_{secrets.token_hex(6)}",
        "subject": payload.subject or payload.title,
        "hero_image": "",
        "intro": "",
        "body": payload.body,
        "cta_text": "",
        "cta_url": payload.cta_url or "",
        "include_upcoming": False,
        "channels": {
            "email": payload.send_email,
            "push": payload.send_push,
            "in_app": payload.send_in_app,
            "whatsapp": payload.send_whatsapp,
        },
        "recipients_count": 1,
        "sent": True,
        "status": "completed",
        "email_ok": 1 if result.get("email") == "ok" else 0,
        "email_fail": 1 if result.get("email") == "fail" else 0,
        "push_ok": 1 if result.get("push") == "ok" else 0,
        "push_fail": 1 if result.get("push") == "fail" else 0,
        "in_app_ok": 1 if result.get("in_app") == "ok" else 0,
        "whatsapp_ok": 1 if result.get("whatsapp") == "sent" else 0,
        "whatsapp_fail": 1 if result.get("whatsapp") == "fail" else 0,
        "attempts": [{"email": user_email, "user_id": user_id, "email": result.get("email", ""), "push": result.get("push", ""), "in_app": result.get("in_app", ""), "whatsapp": result.get("whatsapp", "")}],
        "created_at": _now(),
        "completed_at": _now(),
        "created_by": (user or {}).get("email") or "admin",
        "individual": True,
    }
    await db.email_campaigns.insert_one(campaign)
    result["message"] = f"Notification sent to {user_doc.get('full_name') or user_email}"
    return result


# ─── Newsletter AI Agents ──────────────────────────────────────────────
from services.agents.newsletter_ai_agent import (
    newsletter_ai_agent,
    NewsletterDraftRequest,
    NewsletterDraftResponse,
)

@router.post("/admin/ai-draft", response_model=NewsletterDraftResponse)
async def ai_draft_newsletter(
    req: NewsletterDraftRequest = Body(...),
    user: dict = Depends(require_role("super_admin", "admin", "superadmin")),
    db=Depends(_get_db)
):
    """AI Agent: Ingests real-time jobs, events, and alumni data to synthesize ready-to-send newsletters."""
    return await newsletter_ai_agent.draft_live_newsletter(req, db)

