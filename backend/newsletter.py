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
import os
import re
import hashlib
import hmac
import secrets
from datetime import datetime, timezone, date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from core.email import send_email, render_html_email
from core.deps import require_role
from notifications import send_push, _log_inbox, list_user_tokens

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])


def _get_db(request: Request):
    from db import db
    return db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _unsub_token(email: str) -> str:
    secret = os.environ.get("JWT_SECRET", "studentalumni_jwt_secret_key_2026")
    return hmac.new(secret.encode("utf-8"), email.strip().lower().encode("utf-8"), hashlib.sha256).hexdigest()[:16]


async def _all_subscribers(db, limit: int = 20000) -> list:
    """All registered users with a valid email who haven't unsubscribed. Returns list of dicts with _id, email."""
    unsubscribed = {
        doc.get("email", "").strip().lower()
        for doc in await db.email_preferences.find({"newsletter": False}).to_list(20000)
    }
    subscribers: list = []
    cur = db.users.find(
        {"email": {"$regex": r"@", "$options": "i"}},
        {"_id": 1, "email": 1},
    ).limit(limit)
    async for u in cur:
        email = (u.get("email") or "").strip().lower()
        if email and email not in unsubscribed:
            subscribers.append({"_id": str(u["_id"]), "email": email})
    return subscribers


def _upcoming_events_html(events: list) -> str:
    if not events:
        return ""
    cards = []
    for ev in events:
        title = ev.get("title") or ev.get("slug")
        college = ev.get("college") or "Student Alumni Cell"
        when = ev.get("date") or ""
        venue = ev.get("venue") or ""
        img = ev.get("hero_image_url") or ev.get("poster_image") or ""
        img_html = f"<img src='{img}' alt='' style='width:100%;height:auto;display:block;border-radius:10px 10px 0 0;' />" if img else ""
        badge = "FREE ENTRY" if float((ev.get("registration") or {}).get("fee") or 0) <= 0 else f"₹{float((ev.get('registration') or {}).get('fee') or 0):,.0f} ENTRY"
        cards.append(
            f"""
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
              <tr>
                <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                  {img_html}
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:16px 18px;">
                        <div style="font-size:11px;font-weight:700;color:#7C3AED;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">{badge}</div>
                        <div style="font-size:16px;font-weight:700;color:#111827;">{title}</div>
                        <div style="font-size:12.5px;color:#6b7280;margin-top:6px;">{college}{' · ' + when if when else ''}</div>
                        <div style="font-size:12.5px;color:#6b7280;">{venue}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            """
        )
    return "".join(cards)


def build_newsletter_html(
    subject: str,
    hero_image: str,
    intro: str,
    body: str,
    cta_text: str,
    cta_url: str,
    upcoming_events: list,
) -> str:
    hero_html = (
        f"<img src='{hero_image}' alt='' style='width:100%;height:auto;display:block;border-radius:12px;margin:0 0 20px 0;' />"
        if hero_image else ""
    )
    intro_html = (
        f"<p style='margin:0 0 14px 0;color:#374151;font-size:15px;'>{intro}</p>" if intro else ""
    )
    body_html = (
        f"<div style='margin:0 0 18px 0;color:#374151;font-size:15px;line-height:1.65;'>{body}</div>"
        if body else ""
    )
    events_html = _upcoming_events_html(upcoming_events)
    events_section = (
        f"""
        <h3 style="margin:24px 0 12px 0;color:#111827;font-size:17px;">Upcoming Events</h3>
        {events_html}
        """
        if events_html else ""
    )
    cta_html = (
        f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px 0;">
          <tr><td align="center">
            <a href="{cta_url}" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">{cta_text}</a>
          </td></tr>
        </table>
        """
        if cta_text and cta_url else ""
    )

    content = f"""
    <h2 style="margin:0 0 6px 0;color:#111827;">{subject}</h2>
    {hero_html}
    {intro_html}
    {body_html}
    {events_section}
    {cta_html}
    """
    return render_html_email(content)


class SendNewsletterSchema(BaseModel):
    subject: str
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


@router.get("/admin/campaigns")
async def list_campaigns(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    _=Depends(require_role("admin")),
):
    db = _get_db(request)
    docs = await db.email_campaigns.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    items = []
    for d in docs:
        d["_id"] = str(d["_id"])
        d["sent"] = d.get("recipients_count", 0)
        # Multi-channel campaigns store per-channel counters. Fall back to the
        # legacy ok_count/fail_count so pre-multichannel campaigns still render.
        # (New campaigns always store email_ok/email_fail — even 0 — so the
        # default only kicks in for pre-multichannel docs.)
        email_ok = d.get("email_ok", d.get("ok_count", 0))
        email_fail = d.get("email_fail", d.get("fail_count", 0))
        d["email_ok"] = email_ok
        d["email_fail"] = email_fail
        d["push_ok"] = d.get("push_ok", 0)
        d["push_fail"] = d.get("push_fail", 0)
        d["in_app_ok"] = d.get("in_app_ok", 0)
        d["ok_count"] = email_ok
        d["fail_count"] = email_fail + d["push_fail"]
        d.pop("attempts", None)
        items.append(d)
    return {"items": items}


@router.get("/admin/upcoming-events")
async def upcoming_events(request: Request, _=Depends(require_role("admin"))):
    db = _get_db(request)
    docs = await db.echo_showcases.find(
        {"status": "published"},
        {"title": 1, "slug": 1, "college": 1, "date": 1, "venue": 1, "hero_image_url": 1,
         "registration": 1, "poster_image": 1},
    ).to_list(200)
    out = []
    for d in docs:
        out.append({
            "slug": d.get("slug"),
            "title": d.get("title"),
            "college": d.get("college"),
            "date": d.get("date"),
            "venue": d.get("venue"),
            "hero_image_url": d.get("hero_image_url"),
            "fee": float((d.get("registration") or {}).get("fee") or 0),
        })
    out.sort(key=lambda e: e.get("date") or "9999")
    return {"items": out}


@router.post("/admin/send")
async def send_newsletter(payload: SendNewsletterSchema, request: Request, user=Depends(require_role("admin"))):
    """Compose a newsletter and send it via selected channels (email, push, in-app)."""
    if not (payload.subject or "").strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not (payload.cta_url or "").strip() and not (payload.body or "").strip():
        raise HTTPException(status_code=400, detail="Add either a message body or a call-to-action link")
    if not payload.send_email and not payload.send_push and not payload.send_in_app:
        raise HTTPException(status_code=400, detail="Select at least one channel (email, push, or in-app)")

    db = _get_db(request)
    campaign_id = secrets.token_hex(8)
    created_by = (user or {}).get("email") or "admin"

    upcoming = []
    if payload.include_upcoming:
        docs = await db.echo_showcases.find(
            {"status": "published"},
            {"title": 1, "slug": 1, "college": 1, "date": 1, "venue": 1,
             "hero_image_url": 1, "registration": 1, "poster_image": 1},
        ).to_list(200)
        upcoming = [d for d in docs if d.get("date") or True]

    subscribers = await _all_subscribers(db)
    if not subscribers:
        raise HTTPException(status_code=400, detail="No subscribed user emails found")

    # Build email HTML once
    base_html = build_newsletter_html(
        payload.subject,
        payload.hero_image or "",
        payload.intro or "",
        payload.body or "",
        payload.cta_text or "",
        payload.cta_url or "",
        upcoming,
    )

    campaign = {
        "campaign_id": campaign_id,
        "subject": payload.subject,
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
        },
        "recipients_count": len(subscribers),
        "sent": False,
        "status": "sending",
        "email_ok": 0,
        "email_fail": 0,
        "push_ok": 0,
        "push_fail": 0,
        "in_app_ok": 0,
        "attempts": [],
        "created_at": _now(),
        "created_by": created_by,
    }
    await db.email_campaigns.insert_one(campaign)

    # Build push notification content
    push_title = payload.subject
    push_body = payload.intro or payload.body or payload.subject
    push_data = {"type": "newsletter", "campaign_id": campaign_id}
    if payload.cta_url:
        push_data["url"] = payload.cta_url

    email_ok = 0
    email_fail = 0
    push_ok = 0
    push_fail = 0
    in_app_ok = 0

    for sub in subscribers:
        uid = sub["_id"]
        email = sub["email"]
        attempt: Dict[str, Any] = {"email": email, "user_id": uid}

        # ── Email ──
        if payload.send_email:
            per_html = (
                base_html
                + f"<div style='text-align:center;margin-top:14px;'>"
                f"<a href='https://studentalumni.ai/api/newsletter/unsubscribe?email={email}&t={_unsub_token(email)}' "
                f"style='color:#9ca3af;font-size:11px;text-decoration:underline;'>Unsubscribe from these emails</a></div>"
            )
            try:
                sent = await send_email(email, payload.subject, per_html)
                attempt["email"] = "ok" if sent else "fail"
                if sent:
                    email_ok += 1
                else:
                    email_fail += 1
            except Exception as e:
                email_fail += 1
                attempt["email"] = "fail"
                attempt["email_error"] = str(e)[:200]

        # ── Push notification ──
        if payload.send_push:
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

        # ── In-app inbox ──
        if payload.send_in_app:
            try:
                await _log_inbox(db, uid, push_title, push_body, push_data)
                in_app_ok += 1
                attempt["in_app"] = "ok"
            except Exception:
                attempt["in_app"] = "fail"

        campaign["attempts"].append(attempt)

        # Checkpoint every 50 users
        if len(campaign["attempts"]) % 50 == 0:
            await db.email_campaigns.update_one(
                {"campaign_id": campaign_id},
                {"$set": {
                    "attempts": campaign["attempts"],
                    "email_ok": email_ok, "email_fail": email_fail,
                    "push_ok": push_ok, "push_fail": push_fail,
                    "in_app_ok": in_app_ok,
                }},
            )

    campaign["sent"] = True
    campaign["status"] = "completed"
    campaign["email_ok"] = email_ok
    campaign["email_fail"] = email_fail
    campaign["push_ok"] = push_ok
    campaign["push_fail"] = push_fail
    campaign["in_app_ok"] = in_app_ok
    campaign["completed_at"] = _now()
    await db.email_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {
            "sent": True, "status": "completed",
            "email_ok": email_ok, "email_fail": email_fail,
            "push_ok": push_ok, "push_fail": push_fail,
            "in_app_ok": in_app_ok,
            "completed_at": campaign["completed_at"],
            "attempts": campaign["attempts"],
        }},
    )

    parts = []
    if payload.send_email:
        parts.append(f"email to {email_ok}")
    if payload.send_push:
        parts.append(f"push to {push_ok}")
    if payload.send_in_app:
        parts.append(f"in-app to {in_app_ok}")

    return {
        "ok": True,
        "campaign_id": campaign_id,
        "recipients": len(subscribers),
        "email_sent": email_ok,
        "email_failed": email_fail,
        "push_sent": push_ok,
        "push_failed": push_fail,
        "in_app_sent": in_app_ok,
        "message": f"Sent {', '.join(parts)} of {len(subscribers)} subscribers",
    }


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
    if not payload.send_email and not payload.send_push and not payload.send_in_app:
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

    result["ok"] = True
    result["message"] = f"Notification sent to {user_doc.get('full_name') or user_email}"
    return result
