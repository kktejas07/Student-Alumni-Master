"""
ECHO Showcase — FastAPI router & CMS engine.

Public routes  (no auth required for published showcases):
  GET  /api/echo/showcases              list published showcases
  GET  /api/echo/showcases/{slug}       single full showcase

Admin routes   (super-admin JWT required):
  POST   /api/echo/admin/showcases
  PUT    /api/echo/admin/showcases/{id}
  DELETE /api/echo/admin/showcases/{id}
  PATCH  /api/echo/admin/showcases/{id}/publish
  PATCH  /api/echo/admin/showcases/{id}/draft
  PATCH  /api/echo/admin/showcases/{id}/archive
  GET    /api/echo/admin/showcases      (all statuses)
  POST   /api/echo/admin/upload         (media & document upload)
  GET    /api/echo/admin/media          (media library listing)
  DELETE /api/echo/admin/media/{filename}  (delete media file)
"""

from __future__ import annotations
import os
import re
import string
import base64
import hashlib
import json
import secrets
import mimetypes
from pathlib import Path
from datetime import datetime, timezone, date as _date
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger("studentalumni.echo_showcase")
from pydantic import BaseModel, Field, field_validator

from core.security import (
    generate_qr_code,
    generate_unique_id,
    hash_password,
    encrypt_value,
)
from core.email import send_email, render_html_email, generate_pdf_from_html
from core.whatsapp import send_wa_message, send_wa_documents

router = APIRouter(prefix="/api/echo", tags=["echo-showcase"])


@router.post("/sync-unstop")
async def sync_unstop_opportunities():
    """Scrape and sync live hackathons, workshops, quizzes, and competitions from Unstop into ECHO showcases."""
    try:
        logger.info("⚡ [UNSTOP SYNC] Manual trigger received. Scraping opportunities from Unstop...")
        from scripts.scrape_unstop_events import run_unstop_sync
        count = await run_unstop_sync()
        logger.info(f"[UNSTOP SYNC] Successfully synced {count} opportunities into DB.")
        return {"status": "success", "synced_count": count, "message": f"Successfully synced {count} opportunities from Unstop"}
    except Exception as e:
        logger.error(f"💥 [UNSTOP SYNC ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unstop sync failed: {str(e)}")




# ── Ticket / pass templates ───────────────────────────────────────────────────
# Selected per event via the super-admin CMS (Registration tab →
# `registration.ticket_template`). Each entry carries display metadata for the
# picker; the actual rendering lives in _build_ticket_html below.
TICKET_TEMPLATES = {
    "aurora": {
        "name": "Aurora",
        "description": "Dark gradient pass with glow accents — modern & bold",
        "theme": "dark",
    },
    "classic": {
        "name": "Classic",
        "description": "Clean white ticket with a purple header band — formal",
        "theme": "light",
    },
    "minimal": {
        "name": "Minimal",
        "description": "Bare-bones borderless pass — crisp and lightweight",
        "theme": "light",
    },
}
DEFAULT_TICKET_TEMPLATE = "aurora"

# Session coupon configuration — per-event
DEFAULT_SESSIONS = [
    {"key": "breakfast", "label": "Breakfast", "icon": "egg-fried", "day": 1, "enabled": False, "locked": False},
    {"key": "lunch", "label": "Lunch", "icon": "utensils", "day": 1, "enabled": True, "locked": False},
    {"key": "snacks", "label": "Snacks", "icon": "cookie", "day": 1, "enabled": True, "locked": False},
    {"key": "dinner", "label": "Dinner", "icon": "utensils-crossed", "day": 1, "enabled": False, "locked": False},
    {"key": "tiffin", "label": "Tiffin", "icon": "sandwich", "day": 1, "enabled": False, "locked": False},
    {"key": "coffee", "label": "Coffee & Tea", "icon": "cup-soda", "day": 1, "enabled": False, "locked": False},
]


def _generate_coupon_code(session_key: str, reg_id: str) -> str:
    """Generate a unique coupon code like LUNCH-A7X9K2."""
    raw = f"{session_key}:{reg_id}:{secrets.token_hex(4)}"
    h = hashlib.sha256(raw.encode()).hexdigest()[:6].upper()
    return f"{session_key.upper()}-{h}"


async def _generate_coupons_for_registration(db, slug: str, reg_id: str, sessions: list):
    """Generate coupon records for all enabled sessions."""
    from datetime import timezone
    coupons = []
    for s in sessions:
        if s.get("enabled") is False:
            continue
        code = _generate_coupon_code(s["key"], reg_id)
        day = int(s.get("day") or 1)
        day_label = f"Day {day} · " if day > 1 else ""
        coupons.append({
            "slug": slug,
            "reg_id": reg_id,
            "session_key": s["key"],
            "session_name": f"{day_label}{s.get('label', s['key'])}",
            "session_day": day,
            "coupon_code": code,
            "used": False,
            "used_at": None,
            "scanned_by": None,
            "created_at": datetime.now(timezone.utc),
        })
    if coupons:
        await db.echo_coupons.insert_many(coupons)
    return coupons


async def _reconcile_coupons_for_paid(db, showcase: dict) -> dict:
    """Sync enabled session coupons to registrations that already paid.

    When an organizer adds/updates session passes after people have registered,
    previously-paid attendees must still receive coupons for the newly-enabled
    passes. This finds every paid ("registered") registration for the event and
    for each enabled session:
      • creates a missing coupon (matched by session_key) if the attendee never
        got one,
      • refreshes session_day / session_name on existing coupons so day changes
        on the pass config reflect on the attendee's coupon, and
      • removes coupons for sessions that were disabled, so paid users always
        reflect the current enabled set.
    """
    sessions = showcase.get("sessions") or []
    enabled = [s for s in sessions if s.get("enabled")]
    enabled_keys = {s.get("key") for s in enabled if s.get("key")}
    slug = showcase.get("slug") or ""
    if not slug:
        return {"added": 0, "updated": 0, "removed": 0}
    added = 0
    updated = 0
    removed = 0
    regs = await db.echo_registrations.find(
        {"slug": slug, "status": "registered"}
    ).to_list(5000)
    for reg in regs:
        reg_id = reg.get("id")
        if not reg_id:
            continue
        existing = await db.echo_coupons.find(
            {"slug": slug, "reg_id": reg_id}
        ).to_list(500)
        by_key = {c.get("session_key"): c for c in existing}
        new_coupons = []
        for s in enabled:
            from datetime import timezone
            day = int(s.get("day") or 1)
            day_label = f"Day {day} · " if day > 1 else ""
            name = f"{day_label}{s.get('label', s['key'])}"
            old = by_key.get(s.get("key"))
            if old is None:
                new_coupons.append({
                    "slug": slug,
                    "reg_id": reg_id,
                    "session_key": s["key"],
                    "session_name": name,
                    "session_day": day,
                    "coupon_code": _generate_coupon_code(s["key"], reg_id),
                    "used": False,
                    "used_at": None,
                    "scanned_by": None,
                    "created_at": datetime.now(timezone.utc),
                })
            elif (old.get("session_day") or 1) != day or old.get("session_name") != name:
                await db.echo_coupons.update_one(
                    {"_id": old.get("_id") or old.get("id")},
                    {"$set": {"session_day": day, "session_name": name}}
                )
                updated += 1
        if new_coupons:
            await db.echo_coupons.insert_many(new_coupons)
            added += len(new_coupons)
        # Remove coupons for sessions that are no longer enabled so the set a
        # paid user holds always matches the organizer's current configuration.
        stale_keys = [k for k in set(by_key.keys()) - enabled_keys if k]
        if stale_keys:
            res = await db.echo_coupons.delete_many(
                {"slug": slug, "reg_id": reg_id, "session_key": {"$in": stale_keys}}
            )
            removed += res.deleted_count
    return {"added": added, "updated": updated, "removed": removed}


# ── DB dependency ────────────────────────────────────────────────────────────
def _get_db(request: Request) -> AsyncIOMotorDatabase:
    from db import db  # imported lazily to avoid circular imports at module load
    return db


# ── Auth helper ──────────────────────────────────────────────────────────────
async def _require_admin(request: Request):
    """Reuse the same JWT logic as the rest of server.py."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]
    import jwt as _jwt
    JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
    try:
        payload = _jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


# ── Helpers ──────────────────────────────────────────────────────────────────
def _oid(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {v}")


def _ser(doc: Optional[dict]) -> dict:
    """Recursively serialise ObjectId → str for JSON responses."""
    if doc is None:
        return {}
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [_ser(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            out[k] = _ser(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    if "slug" in doc and "gallery_layout" not in out:
        out["gallery_layout"] = "grid"
    return out


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slug_query(slug: str) -> dict:
    """Match a showcase by its canonical slug OR any of its legacy aliases."""
    slug = (slug or "").strip()
    if not slug:
        return {}
    return {"$or": [{"slug": slug}, {"aliases": slug}]}


# ── Payments + invoices helpers ──────────────────────────────────────────────
async def _razorpay_config(db) -> Optional[dict]:
    """Return {key_id, key_secret, webhook_secret} when Razorpay is connected, else None."""
    tool = await db.installed_tools.find_one({"tool_id": "razorpay", "status": "connected"})
    if not tool:
        return None
    creds = tool.get("credentials") or {}
    key_id = (creds.get("key_id") or creds.get("api_key") or "").strip()
    key_secret = (creds.get("key_secret") or creds.get("api_secret") or "").strip()
    if not key_id or not key_secret:
        return None
    return {
        "key_id": key_id,
        "key_secret": key_secret,
        "webhook_secret": (creds.get("webhook_secret") or "").strip(),
    }


async def _razorpay_create_order(db, amount: float, currency: str, receipt: str, notes: dict) -> Optional[dict]:
    """Create a Razorpay order via REST API. Returns None on failure."""
    cfg = await _razorpay_config(db)
    if not cfg:
        return None
    import httpx
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(cfg["key_id"], cfg["key_secret"]),
                json={
                    "amount": round(amount * 100),
                    "currency": currency,
                    "receipt": receipt,
                    "notes": notes,
                },
            )
            if r.status_code in (200, 201):
                return r.json()
            print(f"[ECHO] Razorpay order error: HTTP {r.status_code} {r.text[:300]}")
            return None
    except Exception as e:
        print(f"[ECHO] Razorpay order exception: {e}")
        return None


async def _razorpay_verify_signature(db, order_id: str, payment_id: str, signature: str) -> bool:
    """Verify a Razorpay payment signature (HMAC-SHA256 of order_id|payment_id)."""
    cfg = await _razorpay_config(db)
    if not cfg:
        return False
    import hashlib
    import hmac
    expected = hmac.new(
        cfg["key_secret"].encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, (signature or ""))


async def _razorpay_verify_webhook_signature(db, body: bytes, signature: str) -> bool:
    """Verify a Razorpay webhook signature — HMAC-SHA256 of the raw request body
    using the webhook signing secret (falls back to the API key secret).
    """
    cfg = await _razorpay_config(db)
    if not cfg:
        print("[ECHO-WEBHOOK-SIG] No Razorpay config found")
        return False
    secret = cfg.get("webhook_secret") or cfg.get("key_secret")
    if not secret:
        print("[ECHO-WEBHOOK-SIG] No webhook_secret or key_secret available")
        return False
    if not cfg.get("webhook_secret"):
        print("[ECHO-WEBHOOK-SIG] WARNING: webhook_secret is empty — falling back to key_secret. "
              "This WILL fail if Razorpay webhook secret differs from API key secret. "
              "Set the webhook_secret in Settings → Razorpay.")
    import hashlib
    import hmac
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    match = hmac.compare_digest(expected, (signature or ""))
    if not match:
        print(f"[ECHO-WEBHOOK-SIG] Signature mismatch — expected={expected[:16]}... got={(signature or '')[:16]}...")
    return match


# Payment-session default from Razorpay checkout (no payment, page left open).
ECHO_PAYMENT_SESSION_TTL_SECONDS = 15 * 60       # how long a pending order may stay open
ECHO_PAYMENT_REMINDER_SECONDS = 5 * 60           # remind the attendee after 5 minutes pending


async def sweep_expired_echo_payments(db) -> dict:
    """Background job: expire abandoned pending ECHO registrations and email attendees.

    Razorpay sessions expire on their own after ~15 minutes. Any registration still
    `payment.status == "pending"` beyond the TTL is marked FAILED:

      • payment.status          → "failed"
      • payment.failed_at       → now
      • payment.failed_reason   → "payment session expired"
      • reg.status              → "failed"

    No SA account is created, no ticket/pass/invoice is issued, and the attendee is
    emailed a "payment not completed" notice. Freshly-pending registrations that are
    within the TTL but past REMINDER_SECONDS get one payment-reminder email.

    Idempotent & safe to run every minute. Returns a small summary for logs.
    """
    result = {"checked": 0, "failed": 0, "reminded": 0, "rescued": 0}
    try:
        now = datetime.now(timezone.utc)
        cutoff_fail = now.timestamp() - ECHO_PAYMENT_SESSION_TTL_SECONDS
        cutoff_remind = now.timestamp() - ECHO_PAYMENT_REMINDER_SECONDS

        pending = await db.echo_registrations.find({"payment.status": "pending"}).to_list(500)
        cfg = await _razorpay_config(db)
        for reg in pending:
            result["checked"] += 1
            created_raw = (reg.get("payment_order") or {}).get("created_at") or reg.get("created_at")
            created = _parse_iso(created_raw) if created_raw else now
            if created is None:
                created = now
            age_seconds = (now - created).total_seconds()
            reg_id = reg.get("id")

            # Mark abandoned sessions as failed.
            if age_seconds > ECHO_PAYMENT_SESSION_TTL_SECONDS:
                # Before marking failed, check if Razorpay actually captured
                # the payment — if so, finalize instead of failing. This
                # prevents the race where the webhook arrives late (or was
                # missed) but the payment succeeded.
                order_id = (reg.get("payment_order") or {}).get("order_id")
                rescued = False
                if cfg and order_id:
                    try:
                        import httpx
                        async with httpx.AsyncClient(timeout=10) as http:
                            resp = await http.get(
                                f"https://api.razorpay.com/v1/orders/{order_id}",
                                auth=(cfg["key_id"], cfg["key_secret"]),
                            )
                            if resp.status_code == 200:
                                order_data = resp.json()
                                if order_data.get("status") == "paid":
                                    # Order is paid on Razorpay — rescue it!
                                    payment_id = ""
                                    for p in (order_data.get("payments") or []):
                                        if p.get("status") == "captured":
                                            payment_id = p.get("id") or ""
                                            break
                                    if not payment_id:
                                        # Fallback: any payment id from the order
                                        payments = order_data.get("payments") or []
                                        if payments:
                                            payment_id = payments[-1].get("id") or ""
                                    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))
                                    await _finalize_paid_registration(db, reg, showcase, payment_id)
                                    result["rescued"] += 1
                                    rescued = True
                                    print(f"[ECHO-SWEEP] Rescued order {order_id} — Razorpay shows paid")
                    except Exception as sweep_err:
                        print(f"[ECHO-SWEEP] Razorpay check failed for {order_id}: {sweep_err}")

                if not rescued:
                    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))
                    await db.echo_registrations.update_one(
                        {"_id": reg["_id"]},
                        {"$set": {
                            "payment.status": "failed",
                            "payment.failed_at": _now(),
                            "payment.failed_reason": "payment session expired",
                            "status": "failed",
                        }},
                    )
                    await _send_payment_failed_email(db, {**reg, "payment": {**reg.get("payment", {}), "status": "failed"}}, showcase,
                                                     reason="session expired before you completed it")
                    result["failed"] += 1
                continue

            # Fresh pending (past 5 minutes) → one reminder email.
            if age_seconds > ECHO_PAYMENT_REMINDER_SECONDS and not reg.get("payment_reminder_sent_at"):
                showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))
                await db.echo_registrations.update_one(
                    {"_id": reg["_id"]},
                    {"$set": {"payment_reminder_sent_at": _now()}},
                )
                await _send_payment_reminder_email(db, reg, showcase)
                result["reminded"] += 1
        return result
    except Exception as e:
        print(f"[ECHO-SWEEP] sweep failed: {e}")
        return result


async def _finalize_paid_registration(db, reg: dict, showcase: Optional[dict], payment_id: str) -> Optional[dict]:
    """Shared logic to mark a pending ECHO registration paid, generate its QR,
    mirror to event_registrations, and email the invoice. Idempotent.
    """
    if not reg or not reg.get("_id"):
        return None
    current = reg.get("payment") or {}
    if current.get("status") == "paid":
        return _ser(reg)

    now_iso = _now()
    paid_payment = {
        "payment_id": payment_id or f"PAY_{secrets.token_hex(8).upper()}",
        "gateway": "razorpay",
        "amount": float(reg.get("fee") or 0),
        "currency": reg.get("currency") or "INR",
        "status": "paid",
        "paid_at": now_iso,
        "method": current.get("method") or "upi",
    }
    canonical_slug = reg.get("slug") or (showcase or {}).get("slug")
    frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")

    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": {
            "payment": paid_payment,
            "status": "registered",
            "registered_at": now_iso,
            "qr_code_base64": generate_qr_code(
                f"{frontend_url}/echo/scan/{reg.get('id')}"
            ),
            "payment_order": None,
        }},
    )

    updated = await db.echo_registrations.find_one({"_id": reg["_id"]})
    updated_ser = _ser(updated)

    # Provision/find the SA account for the attendee (idempotent by email) so
    # every confirmed attendee has a StudentAlumni account, then mirror the
    # registration into it. The welcome email is sent only when a brand-new
    # SA account was created by this payment.
    sa_user, created, temp_password = await _provision_sa_account(db, updated_ser, showcase)
    fresh = await db.echo_registrations.find_one({"_id": reg["_id"]})
    updated_ser = _ser(fresh)
    if sa_user:
        await _mirror_to_event_registration(db, updated_ser, showcase, sa_user)
    if created and temp_password:
        await _send_sa_welcome_email(updated_ser, showcase, temp_password)
    # Generate session coupons for paid registrations (so the WhatsApp package
    # can include the codes and the invoice email knows coupons exist).
    sessions = (showcase or {}).get("sessions") or []
    coupon_list = []
    if sessions and canonical_slug and reg.get("id"):
        coupon_list = await _generate_coupons_for_registration(db, str(canonical_slug), str(reg.get("id")), sessions)

    # Provision SA accounts & issue tickets for all team members (members 2, 3, 4, 5...)
    if updated_ser.get("registration_type") == "team" and updated_ser.get("team_members"):
        await _fulfill_team_members(db, updated_ser, showcase)

    invoice = await _store_invoice_and_email(db, updated_ser, showcase, coupons=coupon_list)
    return {**updated_ser, "invoice": invoice}


def _payment_label(method: Optional[str]) -> str:
    return {
        "upi": "UPI",
        "card": "Credit / Debit Card",
        "netbanking": "Net Banking",
        "wallet": "Wallet",
        "external": "External gateway",
    }.get(method or "", (method or "").title())


def _event_date_label(showcase: Optional[dict]) -> str:
    """Return a human-readable date string, showing a range for multi-day events."""
    s = showcase or {}
    start = (s.get("date") or "").strip()
    end = (s.get("end_date") or "").strip()
    if start and end and end != start:
        return f"{start} – {end}"
    return start or end or ""


def _parse_iso(s: Optional[str]):
    """Parse an ISO 8601 string to an aware datetime. Returns None if unparseable."""
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


async def _assert_registration_open(db, showcase: dict) -> None:
    """Raise 400 when an ECHO event is closed: disabled, ended, past deadline, or full."""
    reg_cfg = showcase.get("registration") or {}
    if reg_cfg.get("enabled") is False:
        raise HTTPException(status_code=400, detail="Registrations are closed for this event")
    if showcase.get("event_status_badge") == "Completed":
        raise HTTPException(status_code=400, detail="This event has ended — registrations are closed")

    deadline = _parse_iso(reg_cfg.get("deadline"))
    if deadline and deadline < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Registrations have closed for this event")

    max_seats = int(reg_cfg.get("max_seats") or 0)
    if max_seats > 0:
        confirmed = await db.echo_registrations.count_documents({
            "slug": showcase.get("slug"),
            "payment.status": "paid",
        })
        if confirmed >= max_seats:
            raise HTTPException(status_code=400, detail="Sorry — this event has reached full capacity")


async def _send_registration_confirmation(db, reg: dict, showcase: dict | None, team_name: str | None = None) -> None:
    """Email a confirmation (with QR) for FREE or confirmed registrations.

    Paid registrations get a payment invoice via _store_invoice_and_email; this
    covers the free/no-charge path so every attendee receives an email receipt.
    
    If team_name is provided, includes team info in the email.
    """
    try:
        email = (reg.get("email") or "").strip()
        if not email:
            return
        title = reg.get("showcase_title") or (showcase or {}).get("title") or "Event Registration"
        reg_id = reg.get("id") or ""
        import urllib.parse
        ticket_url = f"https://studentalumni.ai/api/echo/tickets/{reg_id}?email={urllib.parse.quote(email)}"
        handbook_url = f"https://studentalumni.ai/api/echo/handbook/download"
        ticket_block = _ticket_email_block(reg, showcase or {}, ticket_url)
        
        # Team info block
        team_info_block = ""
        if team_name:
            team_info_block = f"""
            <div style="margin:0 0 18px 0;padding:16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;">
              <h3 style="margin:0 0 6px 0;color:#6d28d9;font-size:15px;">Team Registration</h3>
              <p style="margin:0 0 8px 0;color:#4c1d95;font-size:13px;">
                You're registered as the team captain for team <strong>{team_name}</strong>.
              </p>
              <p style="margin:0;color:#4c1d95;font-size:12px;">
                Your team members will receive separate confirmation emails with their entry passes.
              </p>
            </div>
            """
            subject = f"Team '{team_name}' Registration Confirmed — {title}"
        else:
            subject = f"Your Entry Pass & Event Handbook — {title}"

        # Attach Handbook PDF if present
        attachments = []
        pdf_file = Path(__file__).parent / "static" / "HackWave_3.0_Event_Handbook.pdf"
        if pdf_file.exists():
            try:
                attachments.append({
                    "filename": "HackWave_3.0_Event_Handbook.pdf",
                    "content": pdf_file.read_bytes(),
                })
            except Exception as _pdf_err:
                print(f"[ECHO] Handbook PDF attach error: {_pdf_err}")

        body = render_html_email(
            f"""
            <h2 style="margin:0 0 14px 0;color:#111827;">You're registered!</h2>
            <p style="margin:0 0 18px 0;color:#374151;">Thank you for registering for <strong>{title}</strong>.
            Here is your entry pass — scan the QR at the venue for check-in.</p>
            {team_info_block}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Registration ID</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{reg_id}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Event</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{title}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Attendee</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{reg.get('full_name')}</td></tr>
            </table>
            {ticket_block}
            <div style="margin:20px 0;padding:16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;">
              <h3 style="margin:0 0 6px 0;color:#6d28d9;font-size:15px;">Official Event Handbook Attached</h3>
              <p style="margin:0 0 12px 0;color:#4c1d95;font-size:13px;">
                Find full details on schedule, 5 hackathon tracks, meals, rules, and rewards in the attached <strong>HackWave_3.0_Event_Handbook.pdf</strong>.
              </p>
              <a href="{handbook_url}"
                 style="display:inline-block;padding:8px 16px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Download Event Handbook PDF</a>
            </div>
            <p style="margin:0 0 22px 0;color:#374151;">
              You can view your ticket anytime from your dashboard under <strong>My Tickets</strong>.
            </p>
            <a href="https://studentalumni.ai/dashboard"
               style="display:inline-block;padding:12px 26px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Open My Dashboard</a>
            """
        )
        await send_email(email, subject, body, attachments=attachments)
    except Exception as e:
        print(f"[ECHO] Confirmation email error: {e}")


def _wa_opt_in(reg: dict) -> bool:
    """Whether the attendee consents to WhatsApp delivery. Defaults to True for
    legacy registrations; the registration form captures an explicit opt-in."""
    v = reg.get("whatsapp_opt_in")
    return v is None or bool(v)


def _wa_ticket_url(reg: dict, email: str) -> str:
    import urllib.parse
    reg_id = reg.get("id") or ""
    return f"https://studentalumni.ai/api/echo/tickets/{reg_id}?email={urllib.parse.quote(email or '')}"


async def _send_wa_confirmation(db, reg: dict, showcase: dict, coupons: list) -> None:
    """Best-effort WhatsApp text with ticket link + coupon codes (free/confirmed)."""
    try:
        phone = (reg.get("phone") or "").strip()
        if not phone or not _wa_opt_in(reg):
            return
        title = reg.get("showcase_title") or showcase.get("title") or "Event"
        reg_id = reg.get("id") or ""
        lines = [f"🎟 *You're registered!*", f"Event: *{title}*", f"Registration ID: {reg_id}", ""]
        if coupons:
            lines.append("*Your passes:*")
            for c in coupons:
                name = c.get("session_name") or c.get("session_key")
                code = c.get("coupon_code") or ""
                lines.append(f"  • {name}: `{code}`")
            lines.append("")
        lines.append(f"Show this link at check-in: {_wa_ticket_url(reg, reg.get('email') or '')}")
        await send_wa_message(phone=phone, text="\n".join(lines), kind="registration", reg_id=reg_id, opt_in=_wa_opt_in(reg))
    except Exception as e:
        print(f"[ECHO] WhatsApp confirmation error: {e}")


async def _send_wa_payment_reminder(db, reg: dict, showcase: Optional[dict]) -> None:
    """Best-effort WhatsApp nudge to complete a pending payment."""
    try:
        phone = (reg.get("phone") or "").strip()
        if not phone or not _wa_opt_in(reg):
            return
        title = reg.get("showcase_title") or (showcase or {}).get("title") or "Event"
        fee = float(reg.get("fee") or 0)
        currency = reg.get("currency") or "INR"
        slug = reg.get("slug") or (showcase or {}).get("slug") or ""
        frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
        resume_url = f"{frontend_url}/echo/{slug}/register"
        text = (
            f"⏳ *Payment pending — {title}*\n\n"
            f"Hi {reg.get('full_name') or 'there'}, your registration for *{title}* is "
            f"still *pending payment* ({currency} {fee:,.2f}).\n\n"
            f"Your seat is NOT confirmed and no pass will be issued until you pay.\n\n"
            f"Complete your payment here: {resume_url}"
        )
        await send_wa_message(phone=phone, text=text, kind="reminder", reg_id=reg.get("id") or "", opt_in=_wa_opt_in(reg))
    except Exception as e:
        print(f"[ECHO] WhatsApp payment reminder error: {e}")


async def _send_team_member_confirmation(db, member_reg: dict, showcase: dict, primary_reg: dict, team_name: str, coupons: Optional[list] = None) -> None:
    """Send confirmation email to a team member with their visual entry pass (ticket card with QR), team details, and event handbook."""
    try:
        email = (member_reg.get("email") or "").strip()
        if not email:
            return
        title = member_reg.get("showcase_title") or (showcase or {}).get("title") or "Event Registration"
        reg_id = member_reg.get("id") or ""
        primary_name = primary_reg.get("full_name") or "Team Captain"
        member_name = member_reg.get("full_name") or "Team Member"
        
        import urllib.parse
        ticket_url = f"https://studentalumni.ai/api/echo/tickets/{reg_id}?email={urllib.parse.quote(email)}"
        handbook_url = f"https://studentalumni.ai/api/echo/handbook/download"
        ticket_block = _ticket_email_block(member_reg, showcase or {}, ticket_url)
        
        # Attach Handbook PDF if present
        attachments = []
        pdf_file = Path(__file__).parent / "static" / "HackWave_3.0_Event_Handbook.pdf"
        if pdf_file.exists():
            try:
                attachments.append({
                    "filename": "HackWave_3.0_Event_Handbook.pdf",
                    "content": pdf_file.read_bytes(),
                })
            except Exception as _pdf_err:
                print(f"[ECHO] Handbook PDF attach error: {_pdf_err}")

        body = render_html_email(
            f"""
            <h2 style="margin:0 0 14px 0;color:#111827;">You're registered as a team member!</h2>
            <p style="margin:0 0 18px 0;color:#374151;">You've been added to team <strong>{team_name}</strong> for <strong>{title}</strong> by {primary_name}.</p>
            
            <div style="margin:0 0 18px 0;padding:16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;">
              <h3 style="margin:0 0 6px 0;color:#6d28d9;font-size:15px;">Team Registration</h3>
              <p style="margin:0 0 8px 0;color:#4c1d95;font-size:13px;">
                Team Name: <strong>{team_name}</strong> · Team Captain: <strong>{primary_name}</strong>
              </p>
              <p style="margin:0;color:#4c1d95;font-size:12px;">
                Your team pass has been paid and confirmed. Your entry pass is ready below!
              </p>
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Team Name</td>
                  <td style="padding:12px 16px;text-align:right;color:#7C3AED;font-weight:700;">{team_name}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Attendee (Member)</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{member_name}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Event</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{title}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Your Ticket ID</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{reg_id}</td></tr>
            </table>

            {ticket_block}

            <div style="margin:20px 0;padding:16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;">
              <h3 style="margin:0 0 6px 0;color:#6d28d9;font-size:15px;">Official Event Handbook Attached</h3>
              <p style="margin:0 0 12px 0;color:#4c1d95;font-size:13px;">
                Find full details on schedule, 5 hackathon tracks, meals, rules, and rewards in the attached <strong>HackWave_3.0_Event_Handbook.pdf</strong>.
              </p>
              <a href="{handbook_url}"
                 style="display:inline-block;padding:8px 16px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Download Event Handbook PDF</a>
            </div>

            <p style="margin:18px 0 22px 0;color:#374151;">
              Show this pass at the venue for check-in. You can also view it from your dashboard under <strong>My Tickets</strong>.
            </p>
            <a href="https://studentalumni.ai/dashboard"
               style="display:inline-block;padding:12px 26px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Open My Dashboard</a>
            """
        )
        subject = f"Your Entry Pass (Team '{team_name}') — {title}"
        await send_email(email, subject, body, attachments=attachments)
    except Exception as e:
        print(f"[ECHO] Team member confirmation email error: {e}")


async def _send_wa_payment_failed(db, reg: dict, showcase: Optional[dict], reason: str = "payment session expired") -> None:
    """Best-effort WhatsApp notice that payment failed / was not completed."""
    try:
        phone = (reg.get("phone") or "").strip()
        if not phone or not _wa_opt_in(reg):
            return
        title = reg.get("showcase_title") or (showcase or {}).get("title") or "Event"
        slug = reg.get("slug") or (showcase or {}).get("slug") or ""
        frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
        resume_url = f"{frontend_url}/echo/{slug}/register"
        text = (
            f"❌ *Payment not completed — {title}*\n\n"
            f"Hi {reg.get('full_name') or 'there'}, we couldn't confirm your registration for "
            f"*{title}* because the payment {reason}.\n\n"
            f"No charge was made and no pass was issued. If you still want to attend, "
            f"please register again: {resume_url}"
        )
        await send_wa_message(phone=phone, text=text, kind="payment_failed", reg_id=reg.get("id") or "", opt_in=_wa_opt_in(reg))
    except Exception as e:
        print(f"[ECHO] WhatsApp payment failed error: {e}")


async def _send_wa_paid_package(db, reg: dict, showcase: dict, attachments: list, coupons: list) -> None:
    """Best-effort WhatsApp invoice+receipt+pass PDFs, then the coupon codes."""
    try:
        phone = (reg.get("phone") or "").strip()
        if not phone or not _wa_opt_in(reg):
            return
        title = reg.get("showcase_title") or showcase.get("title") or "Event"
        reg_id = reg.get("id") or ""
        docs = [{"filename": a["filename"], "content": a["content"]} for a in attachments if a.get("content")]
        caption = f"Your payment is confirmed for {title} 🎉"
        if docs:
            await send_wa_documents(phone=phone, docs=docs, caption=caption, kind="invoice", reg_id=reg_id, opt_in=True)
        if coupons:
            lines = [f"🎟 *Your passes for {title}*", ""]
            for c in coupons:
                name = c.get("session_name") or c.get("session_key")
                code = c.get("coupon_code") or ""
                lines.append(f"• {name}: `{code}`")
            lines.append("")
            lines.append(f"Show this link at check-in: {_wa_ticket_url(reg, reg.get('email') or '')}")
            await send_wa_message(phone=phone, text="\n".join(lines), kind="coupons", reg_id=reg_id, opt_in=True)
    except Exception as e:
        print(f"[ECHO] WhatsApp paid package error: {e}")


async def _send_payment_reminder_email(db, reg: dict, showcase: Optional[dict]) -> None:
    """Email an attendee whose registration is pending because payment was not completed.

    Reminds them their seat is NOT confirmed — no ticket or pass is issued until
    they complete payment. Uses the same resume URL as the register page so they
    can re-open the Razorpay checkout.
    """
    try:
        email = (reg.get("email") or "").strip()
        if not email:
            return
        esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        title = esc(reg.get("showcase_title") or (showcase or {}).get("title") or "Event")
        fee = float(reg.get("fee") or 0)
        currency = reg.get("currency") or "INR"
        slug = reg.get("slug") or (showcase or {}).get("slug") or ""
        frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
        resume_url = f"{frontend_url}/echo/{slug}/register"
        order_id = (reg.get("payment_order") or {}).get("order_id") or ""
        created_at = reg.get("created_at") or reg.get("registered_at") or ""

        subject = f"Complete your payment — {title}"
        body = render_html_email(
            f"""
            <h2 style="margin:0 0 14px 0;color:#111827;">Your payment is pending</h2>
            <p style="margin:0 0 18px 0;color:#374151;">
              Hi <strong>{esc(reg.get('full_name') or 'there')}</strong>,<br/><br/>
              You started registering for <strong>{title}</strong> but the payment has
              <strong>not been completed</strong>. Until payment is confirmed:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin:0 0 18px 0;">
              <tr>
                <td style="padding:14px 18px;color:#92400e;font-size:13px;">
                  • Your seat is <strong>not reserved</strong> and no entry pass will be issued.<br/>
                  • No ticket, QR code or invoice is sent until the payment succeeds.<br/>
                  • Your pending session expires shortly, after which you must re-register.
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Event</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{title}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Amount Due</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{currency} {fee:,.2f}</td></tr>
              {"<tr><td style='padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;'>Order</td><td style='padding:12px 16px;text-align:right;color:#111827;font-weight:700;font-family:monospace;font-size:12px;'>" + esc(order_id) + "</td></tr>" if order_id else ""}
              {"<tr><td style='padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;'>Started</td><td style='padding:12px 16px;text-align:right;color:#111827;font-weight:700;font-size:12px;'>" + esc(created_at)[:19].replace('T', ' ') + "</td></tr>" if created_at else ""}
            </table>
            <a href="{resume_url}"
               style="display:inline-block;padding:12px 26px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Complete Payment</a>
            <p style="margin:18px 0 0 0;color:#6b7280;font-size:12px;">
              If you do not complete the payment, your registration will be marked as failed and you will have to register again.
            </p>
            """
        )
        await send_email(email, subject, body)
        print(f"[ECHO] Payment reminder sent to {email} for {reg.get('id')}")
        await _send_wa_payment_reminder(db, reg, showcase)
    except Exception as e:
        print(f"[ECHO] Payment reminder email error: {e}")


async def _send_payment_failed_email(db, reg: dict, showcase: Optional[dict], reason: str = "payment session expired") -> None:
    """Email an attendee whose payment session expired/failed.

    Politely confirms no seat/ticket was issued, and they can re-register if they
    still want to attend. This is the ONLY email a failed registration gets.
    """
    try:
        email = (reg.get("email") or "").strip()
        if not email:
            return
        esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        title = esc(reg.get("showcase_title") or (showcase or {}).get("title") or "Event")
        fee = float(reg.get("fee") or 0)
        currency = reg.get("currency") or "INR"
        slug = reg.get("slug") or (showcase or {}).get("slug") or ""
        frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
        resume_url = f"{frontend_url}/echo/{slug}/register"

        subject = f"Payment not completed — {title}"
        body = render_html_email(
            f"""
            <h2 style="margin:0 0 14px 0;color:#111827;">Your payment was not completed</h2>
            <p style="margin:0 0 18px 0;color:#374151;">
              Hi <strong>{esc(reg.get('full_name') or 'there')}</strong>,<br/><br/>
              Your registration for <strong>{title}</strong> could not be confirmed because the
              payment {esc(reason)}. We did <strong>not</strong> issue a ticket, pass or invoice,
              and no charge was made.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin:0 0 18px 0;">
              <tr>
                <td style="padding:14px 18px;color:#991b1b;font-size:13px;">
                  No seat was reserved, and your registration was marked as failed.
                  If you still wish to attend, please register again and complete the payment.
                </td>
              </tr>
            </table>
            <a href="{resume_url}"
               style="display:inline-block;padding:12px 26px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Register Again</a>
            <p style="margin:18px 0 0 0;color:#6b7280;font-size:12px;">
              If you believe this is an error, or already completed a payment, reply to this email and our team will investigate.
            </p>
            """
        )
        await send_email(email, subject, body)
        print(f"[ECHO] Payment failure email sent to {email} for {reg.get('id')}")
        await _send_wa_payment_failed(db, reg, showcase, reason)
    except Exception as e:
        print(f"[ECHO] Payment failure email error: {e}")


def _build_invoice(reg: dict, showcase: Optional[dict]) -> dict:
    """Build a normalized invoice record from a registration + showcase."""
    payment = reg.get("payment") or {}
    fee = float(reg.get("fee") or 0)
    currency = reg.get("currency") or "INR"
    invoice_no = f"INV-{(reg.get('id') or str(reg.get('_id') or ''))[-10:].upper()}"
    items = [
        {
            "desc": f"Registration — {(showcase or {}).get('title') or reg.get('showcase_title')}",
            "qty": 1,
            "amount": fee,
        }
    ]
    return {
        "invoice_no": invoice_no,
        "reg_id": reg.get("id"),
        "slug": reg.get("slug"),
        "event_title": (showcase or {}).get("title") or reg.get("showcase_title"),
        "event_date": _event_date_label(showcase),
        "event_venue": (showcase or {}).get("venue") or "",
        "full_name": reg.get("full_name"),
        "email": reg.get("email"),
        "phone": reg.get("phone"),
        "branch": reg.get("branch"),
        "year": reg.get("year"),
        "college": reg.get("college"),
        "amount": fee,
        "currency": currency,
        "payment_id": payment.get("payment_id"),
        "payment_gateway": payment.get("gateway") or "razorpay",
        "payment_method": payment.get("method"),
        "paid_at": payment.get("paid_at") or reg.get("registered_at"),
        "status": payment.get("status") or reg.get("status"),
        "items": items,
        "user_id": reg.get("user_id"),
        "created_at": reg.get("registered_at") or _now(),
    }


def _build_invoice_html(inv: dict, template_id: str = "modern") -> str:
    """Render a professional, printable HTML invoice (browser-print → PDF).

    Templates:
      • modern   — gradient header, card-based layout
      • minimal  — clean white, thin borders, subtle
      • classic  — formal, dark header, traditional table
    """
    amount = float(inv.get("amount") or 0)
    currency = inv.get("currency") or "INR"
    rows = "".join(
        f"<tr><td style='padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;'>{i.get('desc')}</td>"
        f"<td style='padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b;font-size:13px;'>{i.get('qty')}</td>"
        f"<td style='padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#0f172a;font-weight:600;font-size:13px;'>{currency} {float(i.get('amount') or 0):,.2f}</td></tr>"
        for i in inv.get("items") or []
    )
    if not rows:
        rows = f"<tr><td style='padding:12px 16px;color:#0f172a;font-size:13px;'>Event registration</td><td style='padding:12px 16px;text-align:center;color:#64748b;font-size:13px;'>1</td><td style='padding:12px 16px;text-align:right;color:#0f172a;font-weight:600;font-size:13px;'>{currency} {amount:,.2f}</td></tr>"
    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    paid_at = inv.get("paid_at") or ""
    if paid_at and "T" in str(paid_at):
        paid_at = str(paid_at)[:16].replace("T", " ")
    if template_id == "minimal":
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" /><title>Invoice {esc(inv.get('invoice_no'))}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ padding:32px; background:#f8fafc; font-family:'Inter',sans-serif; color:#1e293b; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
  .sheet {{ max-width:700px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }}
  .head {{ padding:28px 36px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }}
  .head-brand {{ font-size:18px; font-weight:700; color:#0f172a; }}
  .head-badge {{ background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; padding:4px 14px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:.5px; }}
  .body {{ padding:28px 36px; }}
  .meta-row {{ display:flex; gap:32px; margin-bottom:24px; }}
  .meta-col {{ flex:1; }}
  .meta-label {{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; margin-bottom:4px; }}
  .meta-val {{ font-size:14px; font-weight:600; color:#1e293b; }}
  .meta-sub {{ font-size:12px; color:#64748b; margin-top:1px; }}
  table {{ width:100%; border-collapse:collapse; margin-top:8px; }}
  th {{ text-align:left; padding:8px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#94a3b8; border-bottom:1px solid #e2e8f0; }}
  th.r, td.r {{ text-align:right; }}
  td {{ padding:10px 12px; font-size:13px; color:#334155; border-bottom:1px solid #f1f5f9; }}
  .total {{ display:flex; justify-content:flex-end; margin-top:16px; padding-top:16px; border-top:2px solid #e2e8f0; }}
  .total-box {{ text-align:right; }}
  .total-label {{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; }}
  .total-amt {{ font-size:24px; font-weight:800; color:#1e293b; margin-top:2px; }}
  .foot {{ padding:20px 36px; border-top:1px solid #e2e8f0; background:#f8fafc; }}
  .foot-text {{ font-size:11px; color:#94a3b8; line-height:1.6; }}
  @media print {{ body {{ background:#fff; padding:0; }} .sheet {{ border:none; border-radius:0; max-width:100%; }} }}
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="head-brand">STUDENT ALUMNI</div>
      <div class="head-badge">PAID</div>
    </div>
    <div class="body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
        <div><div style="font-size:20px;font-weight:700;">Invoice</div><div style="font-size:12px;color:#64748b;margin-top:2px;">{esc(inv.get('invoice_no'))}</div></div>
        <div style="text-align:right;"><div style="font-size:12px;color:#94a3b8;">Paid</div><div style="font-size:13px;font-weight:600;">{esc(paid_at)}</div></div>
      </div>
      <div class="meta-row">
        <div class="meta-col"><div class="meta-label">Billed To</div><div class="meta-val">{esc(inv.get('full_name') or 'Attendee')}</div><div class="meta-sub">{esc(inv.get('email') or '')}</div><div class="meta-sub">{esc(inv.get('college') or '')}</div></div>
        <div class="meta-col"><div class="meta-label">Event</div><div class="meta-val">{esc(inv.get('event_title') or '')}</div><div class="meta-sub">{esc(inv.get('event_date') or '')}</div><div class="meta-sub">{esc(inv.get('event_venue') or '')}</div></div>
      </div>
      <div class="meta-row" style="margin-bottom:0;">
        <div class="meta-col"><div class="meta-label">Payment ID</div><div class="meta-val" style="font-size:12px;">{esc(inv.get('payment_id') or '—')}</div></div>
        <div class="meta-col"><div class="meta-label">Method</div><div class="meta-val" style="font-size:12px;">{_payment_label(inv.get('payment_method'))}</div></div>
      </div>
      <table style="margin-top:20px;"><tr><th>Description</th><th style="text-align:center;">Qty</th><th class="r">Amount</th></tr>{rows}</table>
      <div class="total"><div class="total-box"><div class="total-label">Total Paid</div><div class="total-amt">{currency} {amount:,.2f}</div></div></div>
    </div>
    <div class="foot"><div class="foot-text">Thank you for registering. Carry this invoice and your check-in pass to the venue.</div></div>
  </div>
</body>
</html>"""

    if template_id == "classic":
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" /><title>Invoice {esc(inv.get('invoice_no'))}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ padding:32px; background:#1e293b; font-family:'Inter',sans-serif; color:#0f172a; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
  .sheet {{ max-width:720px; margin:0 auto; background:#fff; border-radius:4px; overflow:hidden; border:1px solid #cbd5e1; }}
  .head {{ background:#0f172a; color:#fff; padding:28px 36px; }}
  .head-brand {{ font-size:9px; font-weight:800; letter-spacing:3px; opacity:.5; }}
  .head h1 {{ margin:6px 0 0; font-size:22px; font-weight:700; }}
  .head-meta {{ display:flex; gap:10px; margin-top:8px; flex-wrap:wrap; }}
  .head-pill {{ background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); padding:3px 10px; border-radius:3px; font-size:11px; font-weight:600; }}
  .body {{ padding:28px 36px; }}
  .meta-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }}
  .meta-col {{ }}
  .meta-label {{ font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; margin-bottom:4px; }}
  .meta-val {{ font-size:14px; font-weight:700; color:#0f172a; }}
  .meta-sub {{ font-size:12px; color:#64748b; margin-top:1px; }}
  table {{ width:100%; border-collapse:collapse; margin-top:4px; }}
  th {{ text-align:left; padding:8px 12px; background:#f1f5f9; color:#475569; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; border-bottom:2px solid #e2e8f0; }}
  th.r, td.r {{ text-align:right; }}
  td {{ padding:10px 12px; font-size:13px; color:#334155; border-bottom:1px solid #f1f5f9; }}
  .total {{ display:flex; justify-content:flex-end; margin-top:16px; }}
  .total-box {{ background:#f8fafc; border:1px solid #e2e8f0; padding:14px 20px; text-align:right; }}
  .total-label {{ font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; }}
  .total-amt {{ font-size:22px; font-weight:900; color:#0f172a; margin-top:2px; }}
  .foot {{ padding:18px 36px; border-top:2px solid #0f172a; background:#f8fafc; }}
  .foot-text {{ font-size:11px; color:#64748b; line-height:1.6; }}
  @media print {{ body {{ background:#fff; padding:0; }} .sheet {{ border:none; border-radius:0; max-width:100%; }} }}
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="head-brand">STUDENT ALUMNI · ECHO</div>
      <h1>Payment Invoice</h1>
      <div class="head-meta">
        <span class="head-pill">{esc(inv.get('invoice_no'))}</span>
        <span class="head-pill" style="background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.25);color:#4ade80;">PAID</span>
      </div>
    </div>
    <div class="body">
      <div class="meta-grid">
        <div class="meta-col"><div class="meta-label">Billed To</div><div class="meta-val">{esc(inv.get('full_name') or 'Attendee')}</div><div class="meta-sub">{esc(inv.get('email') or '')}</div><div class="meta-sub">{esc(inv.get('college') or '')}</div></div>
        <div class="meta-col"><div class="meta-label">Event</div><div class="meta-val">{esc(inv.get('event_title') or '')}</div><div class="meta-sub">{esc(inv.get('event_date') or '')}</div><div class="meta-sub">{esc(inv.get('event_venue') or '')}</div></div>
      </div>
      <div class="meta-grid" style="margin-bottom:0;"><div class="meta-col"><div class="meta-label">Payment ID</div><div class="meta-val" style="font-size:12px;">{esc(inv.get('payment_id') or '—')}</div></div><div class="meta-col"><div class="meta-label">Method</div><div class="meta-val" style="font-size:12px;">{_payment_label(inv.get('payment_method'))}</div></div></div>
      <div style="height:1px;background:#e2e8f0;margin:20px 0;"></div>
      <table><tr><th>Description</th><th style="text-align:center;">Qty</th><th class="r">Amount</th></tr>{rows}</table>
      <div class="total"><div class="total-box"><div class="total-label">Total Paid</div><div class="total-amt">{currency} {amount:,.2f}</div></div></div>
    </div>
    <div class="foot"><div class="foot-text">This is a computer-generated invoice. Carry it along with your entry pass to the venue.</div></div>
  </div>
</body>
</html>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice {esc(inv.get('invoice_no'))}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ padding:32px; background:#0f172a; font-family:'Inter',,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#0f172a; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
  .sheet {{ max-width:720px; margin:0 auto; background:#fff; border-radius:18px; overflow:hidden; border:1px solid rgba(0,0,0,0.04); box-shadow:0 25px 60px rgba(0,0,0,0.25); }}
  .head {{ background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%); color:#fff; padding:32px 36px; }}
  .head-brand {{ font-size:10px; font-weight:800; letter-spacing:3px; opacity:.6; }}
  .head h1 {{ margin:8px 0 0; font-size:28px; font-weight:900; letter-spacing:-0.3px; }}
  .head-meta {{ display:flex; align-items:center; gap:12px; margin-top:10px; flex-wrap:wrap; }}
  .head-pill {{ background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2); padding:4px 12px; border-radius:999px; font-size:12px; font-weight:600; }}
  .body {{ padding:32px 36px; }}
  .meta-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }}
  .meta-col {{ }}
  .meta-label {{ font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:#94a3b8; margin-bottom:6px; }}
  .meta-val {{ font-size:15px; font-weight:700; color:#0f172a; line-height:1.3; }}
  .meta-sub {{ font-size:12px; color:#64748b; margin-top:2px; line-height:1.4; }}
  table.items {{ width:100%; border-collapse:collapse; margin-top:4px; }}
  table.items th {{ text-align:left; padding:10px 16px; background:#f8fafc; color:#64748b; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; border-bottom:2px solid #f1f5f9; }}
  table.items th.r, table.items td.r {{ text-align:right; }}
  .total-section {{ margin-top:24px; display:flex; justify-content:flex-end; }}
  .total-box {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px 24px; text-align:right; min-width:220px; }}
  .total-label {{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; }}
  .total-amt {{ font-size:28px; font-weight:900; color:#7C3AED; margin-top:4px; letter-spacing:-0.5px; }}
  .total-currency {{ font-size:14px; font-weight:600; color:#a78bfa; }}
  .divider {{ height:1px; background:linear-gradient(90deg,transparent,#e2e8f0,transparent); margin:24px 0; }}
  .foot {{ padding:24px 36px; background:#f8fafc; border-top:1px solid #f1f5f9; }}
  .foot-text {{ font-size:11px; color:#94a3b8; line-height:1.7; }}
  .foot-brand {{ font-size:9px; font-weight:800; letter-spacing:2px; color:#cbd5e1; margin-top:12px; }}
  @media print {{
    body {{ background:#fff; padding:0; }}
    .sheet {{ border:none; border-radius:0; box-shadow:none; max-width:100%; }}
  }}
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="head-brand">STUDENT ALUMNI · ECHO</div>
      <h1>Payment Invoice</h1>
      <div class="head-meta">
        <span class="head-pill">INV: {esc(inv.get('invoice_no'))}</span>
        <span class="head-pill" style="background:rgba(52,211,153,0.2);border-color:rgba(52,211,153,0.3);color:#6ee7b7;">PAID</span>
        {f'<span class="head-pill">Paid {esc(paid_at)}</span>' if paid_at else ''}
      </div>
    </div>
    <div class="body">
      <table class="meta">
        <tr>
          <td style="width:50%;">
            <div class="label">Billed To</div>
            <div class="val">{esc(inv.get('full_name') or 'Attendee')}</div>
            <div style="color:#374151;font-size:13px;">{esc(inv.get('email') or '')}</div>
            <div style="color:#374151;font-size:13px;">{esc(inv.get('phone') or '')}</div>
          </td>
          <td>
            <div class="label">Event</div>
            <div class="val">{esc(inv.get('event_title') or '')}</div>
            <div style="color:#374151;font-size:13px;">{esc(inv.get('event_date') or '')}</div>
            <div style="color:#374151;font-size:13px;">{esc(inv.get('event_venue') or '')}</div>
          </td>
        </tr>
        <tr>
          <td style="padding-top:16px;">
            <div class="label">Payment ID</div>
            <div class="val">{esc(inv.get('payment_id') or '—')}</div>
          </td>
          <td style="padding-top:16px;">
            <div class="label">Payment Method</div>
            <div class="val">{_payment_label(inv.get('payment_method') or '')}</div>
          </td>
        </tr>
      </table>

      <table class="items">
        <tr><th>Description</th><th style="text-align:center;">Qty</th><th class="r">Amount</th></tr>
        {rows}
      </table>

      <div class="total-section">
        <div class="total-box">
          <div class="total-label">Total Paid</div>
          <div class="total-amt"><span class="total-currency">{currency}</span> {amount:,.2f}</div>
        </div>
      </div>
    </div>
    <div class="foot">
      <div class="foot-text">
        Thank you for registering for <strong style="color:#0f172a;">{esc(inv.get('event_title') or 'our event')}</strong>.
        Please carry this invoice and your check-in QR pass to the venue. This is a computer-generated
        invoice and does not require a signature. For queries, contact the Student Alumni Cell.
      </div>
      <div class="foot-brand">STUDENT ALUMNI · ECHO</div>
    </div>
  </div>
</body>
</html>"""


def _build_receipt_html(inv: dict) -> str:
    """Render a payment Receipt PDF — separate from the Invoice.

    Mirrors the industry-standard format (Stripe / Anomaly / Razorpay):
      • Heading: "Receipt"
      • Invoice number + Receipt number + Date paid
      • 'Amount paid on <date>' headline
      • Line-items table with Subtotal / Total / Amount paid
      • Payment history table: method, date, amount, receipt number
    """
    amount = float(inv.get("amount") or 0)
    currency = inv.get("currency") or "INR"
    inv_no = inv.get("invoice_no") or ""
    payment_id = inv.get("payment_id") or "—"
    # Receipt number = last 9 chars of payment_id (like Stripe's 2664-2355)
    raw_pid = str(payment_id).replace("pay_", "").replace("PAY_", "")
    receipt_no = f"{raw_pid[:4]}-{raw_pid[-4:]}" if len(raw_pid) >= 8 else raw_pid or inv_no.replace("INV-", "")

    paid_at_raw = inv.get("paid_at") or ""
    if paid_at_raw and "T" in str(paid_at_raw):
        paid_at_display = str(paid_at_raw)[:10]
    else:
        paid_at_display = str(paid_at_raw)[:10] if paid_at_raw else ""

    method_label = _payment_label(inv.get("payment_method") or inv.get("payment_gateway") or "")
    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    rows = "".join(
        f"<tr>"
        f"<td style='padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;'>{esc(i.get('desc'))}</td>"
        f"<td style='padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;'>{i.get('qty')}</td>"
        f"<td style='padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-size:14px;'>{currency} {float(i.get('amount') or 0):,.2f}</td>"
        f"</tr>"
        for i in inv.get("items") or []
    )
    if not rows:
        rows = (
            f"<tr>"
            f"<td style='padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;'>Event registration</td>"
            f"<td style='padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:14px;'>1</td>"
            f"<td style='padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-size:14px;'>{currency} {amount:,.2f}</td>"
            f"</tr>"
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" /><title>Receipt {esc(receipt_no)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ padding:40px 32px; background:#fff; font-family:'Inter',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111827; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
  .sheet {{ max-width:640px; margin:0 auto; }}
  .logo {{ font-size:11px; font-weight:800; letter-spacing:2px; color:#6b7280; margin-bottom:28px; }}
  h1 {{ font-size:26px; font-weight:800; color:#111827; margin-bottom:4px; }}
  .headline {{ font-size:18px; font-weight:700; color:#111827; margin:28px 0 20px; }}
  .meta-row {{ display:flex; justify-content:space-between; margin-bottom:18px; }}
  .meta-label {{ font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:3px; }}
  .meta-val {{ font-size:14px; font-weight:600; color:#111827; }}
  .meta-sub {{ font-size:13px; color:#374151; margin-top:1px; }}
  .divider {{ height:1px; background:#e5e7eb; margin:22px 0; }}
  table.items {{ width:100%; border-collapse:collapse; }}
  table.items th {{ text-align:left; padding:8px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; border-bottom:2px solid #111827; }}
  table.items th.r {{ text-align:right; }}
  .totals {{ margin-top:16px; }}
  .totals-row {{ display:flex; justify-content:space-between; padding:6px 0; font-size:14px; color:#374151; }}
  .totals-row.bold {{ font-weight:700; color:#111827; border-top:1px solid #e5e7eb; margin-top:6px; padding-top:10px; }}
  .history-head {{ font-size:16px; font-weight:700; color:#111827; margin:28px 0 12px; }}
  table.history {{ width:100%; border-collapse:collapse; }}
  table.history th {{ text-align:left; padding:8px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; border-bottom:1px solid #e5e7eb; }}
  table.history td {{ padding:10px 0; font-size:13px; color:#374151; border-bottom:1px solid #f3f4f6; vertical-align:top; }}
  .foot {{ margin-top:36px; font-size:11px; color:#9ca3af; line-height:1.6; border-top:1px solid #f3f4f6; padding-top:18px; }}
  @media print {{ body {{ padding:20px; }} }}
</style>
</head>
<body>
  <div class="sheet">
    <div class="logo">STUDENT ALUMNI · ECHO</div>
    <h1>Receipt</h1>
    <div class="meta-row" style="margin-top:20px;">
      <div><div class="meta-label">Invoice number</div><div class="meta-val">{esc(inv_no)}</div></div>
      <div style="text-align:right;"><div class="meta-label">Receipt number</div><div class="meta-val">{esc(receipt_no)}</div></div>
    </div>
    <div class="meta-row">
      <div><div class="meta-label">Date paid</div><div class="meta-val">{esc(paid_at_display)}</div></div>
    </div>
    <div class="divider"></div>
    <div class="meta-row">
      <div>
        <div class="meta-label">Bill to</div>
        <div class="meta-val">{esc(inv.get('full_name') or 'Attendee')}</div>
        <div class="meta-sub">{esc(inv.get('email') or '')}</div>
        <div class="meta-sub">{esc(inv.get('college') or '')}</div>
      </div>
      <div style="text-align:right;">
        <div class="meta-label">Event</div>
        <div class="meta-val">{esc(inv.get('event_title') or '')}</div>
        <div class="meta-sub">{esc(inv.get('event_date') or '')}</div>
        <div class="meta-sub">{esc(inv.get('event_venue') or '')}</div>
      </div>
    </div>
    <div class="headline">{currency} {amount:,.2f} paid on {esc(paid_at_display)}</div>
    <table class="items">
      <tr>
        <th>Description</th>
        <th style="text-align:center;">Qty</th>
        <th class="r">Unit price</th>
        <th class="r">Amount</th>
      </tr>
      {rows}
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>{currency} {amount:,.2f}</span></div>
      <div class="totals-row"><span>Total</span><span>{currency} {amount:,.2f}</span></div>
      <div class="totals-row bold"><span>Amount paid</span><span>{currency} {amount:,.2f}</span></div>
    </div>
    <div class="divider"></div>
    <div class="history-head">Payment history</div>
    <table class="history">
      <tr>
        <th>Payment method</th>
        <th>Date</th>
        <th style="text-align:right;">Amount paid</th>
        <th style="text-align:right;">Receipt number</th>
      </tr>
      <tr>
        <td>
          <div>{esc(method_label)}</div>
          <div style="color:#6b7280;font-size:12px;">{esc(payment_id)}</div>
        </td>
        <td>{esc(paid_at_display)}</td>
        <td style="text-align:right;">{currency} {amount:,.2f}</td>
        <td style="text-align:right;">{esc(receipt_no)}</td>
      </tr>
    </table>
    <div class="foot">
      This is a computer-generated receipt and does not require a signature.
      For queries, contact the Student Alumni Cell.<br/>
      <strong style="color:#6b7280;">STUDENT ALUMNI · ECHO</strong>
    </div>
  </div>
</body>
</html>"""


def _build_ticket_html(reg: dict, showcase: dict, template_id: Optional[str] = None) -> str:

    """Render a professional, printable entry pass (ticket) with QR for an attendee.

    Design follows Behance/Dribbble-grade event ticket conventions:
      • Perforated stub section with tear-off line
      • Sponsor logo strip at the bottom
      • Clean visual hierarchy: event name → date/venue → attendee → QR
      • Print-optimized @media rules

    Template is resolved from `registration.ticket_template` on the showcase,
    falling back to DEFAULT_TICKET_TEMPLATE. The returned page is standalone
    (browser-print → PDF), and is also served via GET /api/echo/tickets/{reg_id}
    so attendees can download and share their pass.
    """
    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    esc_img = lambda s: str(s or "").replace("&", "&amp;").replace('"', "&quot;")
    reg_cfg = showcase.get("registration") or {}
    template_id = template_id or reg_cfg.get("ticket_template") or DEFAULT_TICKET_TEMPLATE
    if template_id not in TICKET_TEMPLATES:
        template_id = DEFAULT_TICKET_TEMPLATE

    qr = reg.get("qr_code_base64") or ""
    brand = "STUDENT ALUMNI · ECHO"
    organizer = esc(showcase.get("organizer_name") or "Student Alumni Cell")
    title = esc(reg.get("showcase_title") or showcase.get("title") or "Event")
    event_date = esc(_event_date_label(showcase))
    event_time = esc(showcase.get("time") or "")
    venue = esc(showcase.get("venue") or "")
    name = esc(reg.get("full_name") or "Attendee")
    email = esc(reg.get("email") or "")
    phone = esc(reg.get("phone") or "")
    branch = esc(reg.get("branch") or "")
    year = esc(reg.get("year") or "")
    college = esc(reg.get("college") or "")
    reg_id = esc(reg.get("id") or "")
    meta = [v for v in (branch, year, college) if v]
    attendee_line = " · ".join(meta) if meta else (phone or "Student")

    # Sponsor logos strip
    sponsors = showcase.get("sponsors") or []
    sponsor_logos = []
    for sp in sponsors:
        logo = sp.get("logo_url") or ""
        sp_name = esc(sp.get("name") or "")
        if logo:
            sponsor_logos.append(f'<img src="{esc_img(logo)}" alt="{sp_name}" class="sp-logo" />')
        elif sp_name:
            sponsor_logos.append(f'<span class="sp-name">{sp_name}</span>')
    sponsors_html = ""
    if sponsor_logos:
        sponsors_html = f"""
        <div class="sponsors">
          <div class="sp-label">In Association With</div>
          <div class="sp-row">{" ".join(sponsor_logos)}</div>
        </div>"""

    qr_img = (
        f'<img src="data:image/png;base64,{qr}" alt="Check-in QR" class="qr" />'
        if qr
        else '<div class="qr qr-empty">QR unavailable</div>'
    )
    qr_img_sm = (
        f'<img src="data:image/png;base64,{qr}" alt="QR" class="qr-sm" />'
        if qr
        else '<div class="qr-sm qr-empty">QR</div>'
    )

    if template_id == "classic":
        inner = f"""
      <div class="sheet classic">
        <div class="c-main">
          <div class="c-header">
            <div class="c-brand">{brand}</div>
            <div class="c-org">{organizer}</div>
            <h1 class="c-title">{title}</h1>
            <div class="c-meta">
              <span class="c-pill">{event_date or 'TBA'}</span>
              <span class="c-pill">{event_time}</span>
              <span class="c-pill">{venue}</span>
            </div>
          </div>
          <div class="c-body">
            <div class="c-info">
              <div class="c-col">
                <div class="dl-label">ATTENDEE</div>
                <div class="dl-val">{name}</div>
                <div class="c-sub">{email}</div>
                {f'<div class="c-sub">{attendee_line}</div>' if attendee_line else ''}
              </div>
              <div class="c-col" style="text-align:right;">
                <div class="dl-label">REG ID</div>
                <div class="dl-val" style="font-size:14px;letter-spacing:1px;">{reg_id}</div>
                <div class="c-sub" style="margin-top:8px;"><span class="badge">CONFIRMED</span></div>
              </div>
            </div>
            <div class="c-qr">{qr_img}</div>
            <div class="c-note">This ticket is your entry pass. Scan the QR at check-in.</div>
          </div>
        </div>
        <div class="c-stub">
          <div class="c-stub-inner">
            <div class="c-stub-event">{title}</div>
            <div class="c-stub-date">{event_date}</div>
            <div class="c-stub-name">{name}</div>
            <div class="c-stub-id">REG: {reg_id}</div>
            {qr_img_sm}
          </div>
            <div class="c-stub-tear">TEAR HERE</div>
        </div>
        {sponsors_html}
      </div>"""
    elif template_id == "minimal":
        inner = f"""
      <div class="sheet minimal">
        <div class="m-top">
          <div class="m-brand">{brand}</div>
          <div class="m-org">{organizer}</div>
          <h1 class="m-title">{title}</h1>
          <div class="m-pills">
            <span class="m-pill">{event_date or 'TBA'}</span>
            <span class="m-pill">{event_time}</span>
            <span class="m-pill">{venue}</span>
          </div>
        </div>
        <div class="m-divider"></div>
        <div class="m-body">
          <div class="m-info">
            <div class="m-row"><span class="m-label">Attendee</span><span class="m-value">{name}</span></div>
            <div class="m-row"><span class="m-label">Email</span><span class="m-value">{email}</span></div>
            <div class="m-row"><span class="m-label">Reg ID</span><span class="m-value">{reg_id}</span></div>
            {f'<div class="m-row"><span class="m-label">College</span><span class="m-value">{attendee_line}</span></div>' if attendee_line else ''}
          </div>
          <div class="m-qr">{qr_img_sm}</div>
        </div>
        <div class="m-footer">
          <span class="badge">CONFIRMED</span>
          <span class="m-note">Scan the QR at check-in · Keep this pass handy</span>
        </div>
        {sponsors_html}
      </div>"""
    else:  # aurora (default)
        inner = f"""
      <div class="sheet aurora">
        <div class="aur-glow aur-glow-a"></div>
        <div class="aur-glow aur-glow-b"></div>
        <div class="aur-main">
          <div class="aur-header">
            <div class="aur-brand">{brand}</div>
            <div class="aur-org">{organizer}</div>
            <h1 class="aur-title">{title}</h1>
            <div class="aur-pills">
              <span class="aur-pill">{event_date or 'TBA'}</span>
              <span class="aur-pill">{event_time}</span>
              <span class="aur-pill">{venue}</span>
            </div>
          </div>
          <div class="aur-body">
            <div class="aur-info">
              <div class="aur-col">
                <div class="dl-label">ATTENDEE</div>
                <div class="dl-val">{name}</div>
                <div class="aur-sub">{email}</div>
                {f'<div class="aur-sub">{attendee_line}</div>' if attendee_line else ''}
              </div>
              <div class="aur-col">
                <div class="dl-label">REG ID</div>
                <div class="dl-val" style="letter-spacing:1px;">{reg_id}</div>
              </div>
            </div>
            <div class="aur-qr">{qr_img}</div>
          </div>
          <div class="aur-badge-row"><span class="badge">CONFIRMED PASS</span></div>
          <div class="aur-stub">
            <div class="aur-stub-left">
              <div class="aur-stub-event">{title}</div>
              <div class="aur-stub-detail">{event_date} · {name}</div>
              <div class="aur-stub-id">REG: {reg_id}</div>
            </div>
            {qr_img_sm}
            <div class="aur-stub-tear">|</div>
          </div>
        </div>
        {sponsors_html}
      </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Pass — {title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ padding:28px; background:#0f172a; font-family:'Inter',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  .sheet {{ position:relative; max-width:740px; margin:0 auto; background:#fff; border-radius:18px; overflow:hidden; border:1px solid rgba(0,0,0,0.06); box-shadow:0 25px 60px rgba(0,0,0,0.3); }}

  /* Common label/value tokens */
  .dl-label {{ color:#94a3b8; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; }}
  .dl-val {{ color:#0f172a; font-size:18px; font-weight:800; margin-top:3px; line-height:1.2; }}
  .badge {{ display:inline-flex; align-items:center; gap:4px; padding:5px 14px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.3px; background:#dcfce7; color:#15803d; }}
  .qr {{ width:160px; height:160px; border-radius:14px; display:block; }}
  .qr-sm {{ width:72px; height:72px; border-radius:8px; display:block; }}
  .qr-empty {{ display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#94a3b8; font-size:10px; font-weight:600; }}
  .sponsors {{ padding:16px 32px 20px; border-top:1px solid #f1f5f9; }}
  .sp-label {{ font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#cbd5e1; margin-bottom:10px; }}
  .sp-row {{ display:flex; align-items:center; gap:18px; flex-wrap:wrap; }}
  .sp-logo {{ height:28px; max-width:90px; object-fit:contain; opacity:.85; filter:grayscale(20%); }}
  .sp-name {{ font-size:11px; font-weight:600; color:#94a3b8; white-space:nowrap; }}

  /* ── AURORA (default) ────────────────────────────────────────────────── */
  .aurora {{ background:linear-gradient(160deg,#0f0a2e 0%,#1a1145 30%,#2d1b69 60%,#1a0e3e 100%); color:#fff; }}
  .aurora .dl-label {{ color:#a5b4fc; }}
  .aurora .dl-val {{ color:#fff; }}
  .aurora .badge {{ background:rgba(52,211,153,0.15); color:#6ee7b7; }}
  .aurora .sponsors {{ border-top-color:rgba(255,255,255,0.08); }}
  .aurora .sp-label {{ color:rgba(255,255,255,0.35); }}
  .aur-glow {{ position:absolute; width:350px; height:350px; border-radius:50%; filter:blur(100px); opacity:.30; pointer-events:none; }}
  .aur-glow-a {{ top:-140px; right:-100px; background:#a855f7; }}
  .aur-glow-b {{ bottom:-160px; left:-100px; background:#6366f1; }}
  .aur-main {{ position:relative; }}
  .aur-header {{ padding:36px 36px 20px; }}
  .aur-brand {{ font-size:10px; font-weight:800; letter-spacing:3px; opacity:.6; }}
  .aur-org {{ font-size:13px; font-weight:600; margin-top:8px; opacity:.7; }}
  .aur-title {{ margin:12px 0 16px; font-size:32px; font-weight:900; line-height:1.1; letter-spacing:-0.5px; }}
  .aur-pills {{ display:flex; gap:8px; flex-wrap:wrap; }}
  .aur-pill {{ background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.85); font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px; white-space:nowrap; }}
  .aur-body {{ display:flex; justify-content:space-between; align-items:flex-start; gap:28px; padding:20px 36px 28px; }}
  .aur-info {{ flex:1; display:grid; grid-template-columns:1fr 1fr; gap:18px; }}
  .aur-col {{ min-width:0; }}
  .aur-sub {{ font-size:12px; color:rgba(255,255,255,0.55); margin-top:3px; line-height:1.4; }}
  .aur-qr {{ background:#fff; padding:12px; border-radius:16px; flex-shrink:0; box-shadow:0 8px 30px rgba(0,0,0,0.25); }}
  .aur-qr .qr {{ width:150px; height:150px; }}
  .aur-badge-row {{ padding:0 36px 16px; }}
  .aur-stub {{ display:flex; align-items:center; gap:20px; padding:18px 36px; background:rgba(255,255,255,0.04); border-top:2px dashed rgba(255,255,255,0.15); position:relative; }}
  .aur-stub-left {{ flex:1; min-width:0; }}
  .aur-stub-event {{ font-size:14px; font-weight:700; opacity:.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
  .aur-stub-detail {{ font-size:11px; opacity:.5; margin-top:3px; }}
  .aur-stub-id {{ font-size:10px; font-weight:800; letter-spacing:1.5px; opacity:.45; margin-top:4px; }}
  .aur-stub-tear {{ position:absolute; right:20px; top:-10px; font-size:11px; opacity:.3; letter-spacing:1px; font-weight:600; }}

  /* ── CLASSIC ─────────────────────────────────────────────────────────── */
  .classic {{ background:#fff; }}
  .c-main {{ padding-bottom:0; }}
  .c-header {{ background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%); color:#fff; padding:32px 36px 24px; }}
  .c-brand {{ font-size:10px; font-weight:800; letter-spacing:3px; opacity:.65; }}
  .c-org {{ font-size:13px; font-weight:600; margin-top:8px; opacity:.75; }}
  .c-title {{ margin:12px 0 14px; font-size:30px; font-weight:900; line-height:1.1; letter-spacing:-0.3px; }}
  .c-meta {{ display:flex; gap:8px; flex-wrap:wrap; }}
  .c-pill {{ background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:12px; font-weight:600; padding:5px 12px; border-radius:999px; white-space:nowrap; }}
  .c-body {{ padding:28px 36px; }}
  .c-info {{ display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:24px; }}
  .c-col {{ min-width:0; }}
  .c-sub {{ font-size:12px; color:#94a3b8; margin-top:3px; line-height:1.4; }}
  .c-qr {{ text-align:center; margin-bottom:20px; }}
  .c-qr .qr {{ display:inline-block; }}
  .c-note {{ text-align:center; font-size:12px; color:#94a3b8; padding-top:16px; border-top:1px solid #f1f5f9; }}
  .c-stub {{ display:flex; align-items:center; padding:18px 36px; background:#f8fafc; border-top:2px dashed #d1d5db; position:relative; }}
  .c-stub-inner {{ flex:1; }}
  .c-stub-event {{ font-size:13px; font-weight:700; color:#111827; }}
  .c-stub-date {{ font-size:11px; color:#94a3b8; margin-top:2px; }}
  .c-stub-name {{ font-size:11px; color:#64748b; margin-top:2px; }}
  .c-stub-id {{ font-size:10px; font-weight:800; color:#a78bfa; letter-spacing:1px; margin-top:3px; }}
  .c-stub-tear {{ position:absolute; right:24px; top:-8px; font-size:10px; color:#cbd5e1; font-weight:600; letter-spacing:.5px; }}

  /* ── MINIMAL ─────────────────────────────────────────────────────────── */
  .minimal {{ background:#fff; }}
  .m-top {{ padding:36px 36px 20px; text-align:center; }}
  .m-brand {{ font-size:10px; font-weight:800; letter-spacing:3px; color:#7C3AED; }}
  .m-org {{ font-size:13px; font-weight:600; color:#64748b; margin-top:6px; }}
  .m-title {{ margin:12px 0 14px; font-size:30px; font-weight:900; color:#0f172a; letter-spacing:-0.3px; }}
  .m-pills {{ display:flex; justify-content:center; gap:8px; flex-wrap:wrap; }}
  .m-pill {{ background:#f1f5f9; color:#475569; font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px; }}
  .m-divider {{ height:1px; background:linear-gradient(90deg,transparent,#e2e8f0,transparent); margin:0 36px; }}
  .m-body {{ display:flex; justify-content:space-between; align-items:center; gap:28px; padding:24px 36px; }}
  .m-info {{ flex:1; }}
  .m-row {{ display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f8fafc; }}
  .m-row:last-child {{ border-bottom:none; }}
  .m-label {{ font-size:12px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; }}
  .m-value {{ font-size:14px; font-weight:700; color:#0f172a; text-align:right; }}
  .m-qr {{ flex-shrink:0; }}
  .m-qr .qr-sm {{ width:110px; height:110px; border:3px solid #f1f5f9; border-radius:14px; }}
  .m-footer {{ display:flex; align-items:center; justify-content:space-between; padding:14px 36px; background:#f8fafc; border-top:1px solid #f1f5f9; }}
  .m-note {{ font-size:11px; color:#94a3b8; }}
  .minimal .sponsors {{ border-top:1px solid #f1f5f9; text-align:center; }}
  .minimal .sp-row {{ justify-content:center; }}

  /* ── PRINT ───────────────────────────────────────────────────────────── */
  @media print {{
    body {{ background:#fff; padding:0; }}
    .sheet {{ border:none; border-radius:0; box-shadow:none; max-width:100%; }}
    .aur-glow {{ display:none; }}
    .sponsors .sp-logo {{ filter:none; opacity:1; }}
  }}
</style>
</head>
<body>{inner}
</body>
</html>"""


def _ticket_email_block(reg: dict, showcase: dict, ticket_url: str) -> str:
    """Inline ticket card embedded in confirmation / invoice emails.

    Professional design matching the downloadable pass. Includes sponsor logos
    when available. Email-safe HTML (inline styles, table layout).
    """
    qr = reg.get("qr_code_base64") or ""
    title = reg.get("showcase_title") or showcase.get("title") or "Event"
    reg_id = reg.get("id") or ""
    event_date = _event_date_label(showcase)
    event_time = showcase.get("time") or ""
    venue = showcase.get("venue") or ""
    organizer = showcase.get("organizer_name") or "Student Alumni Cell"
    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    esc_img = lambda s: str(s or "").replace("&", "&amp;").replace('"', "&quot;")
    email_addr = esc(reg.get("email") or "")

    base_url = ticket_url.split("/tickets/")[0]
    qr_img = (
        f'<img src="{base_url}/registrations/{reg_id}/qr.png" width="130" height="130" style="border-radius:12px;display:block;" alt="Check-in QR" />'
        if qr
        else ""
    )

    # Sponsor logos in email
    sponsors = showcase.get("sponsors") or []
    sponsor_cells = []
    for sp in sponsors:
        logo = sp.get("logo_url") or ""
        sp_name = esc(sp.get("name") or "")
        if logo:
            sponsor_cells.append(f'<td style="padding:0 10px;"><img src="{esc_img(logo)}" alt="{sp_name}" style="height:24px;max-width:80px;object-fit:contain;opacity:.7;" /></td>')
        elif sp_name:
            sponsor_cells.append(f'<td style="padding:0 10px;font-size:11px;font-weight:600;color:#94a3b8;white-space:nowrap;">{sp_name}</td>')
    sponsors_html = ""
    if sponsor_cells:
        sponsors_html = f"""
        <tr><td style="padding:14px 20px 18px;border-top:1px solid #f1f5f9;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#cbd5e1;margin-bottom:8px;">In Association With</div>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>{"".join(sponsor_cells)}</tr></table>
        </td></tr>"""

    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;margin:0 0 20px 0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
      <tr><td style="padding:22px 24px 16px;background:linear-gradient(135deg,#7C3AED,#5B21B6);">
        <div style="font-size:9px;font-weight:800;letter-spacing:3px;color:rgba(255,255,255,0.6);">YOUR ENTRY PASS</div>
        <div style="font-size:20px;font-weight:900;color:#fff;margin-top:4px;line-height:1.2;">{esc(title)}</div>
        <div style="margin-top:8px;">
          <span style="display:inline-block;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:999px;font-size:11px;font-weight:600;color:#fff;">{esc(event_date)}</span>
          <span style="display:inline-block;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:999px;font-size:11px;font-weight:600;color:#fff;margin-left:4px;">{esc(venue)}</span>
        </div>
      </td></tr>
      <tr><td style="padding:20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:top;padding-right:20px;width:60%;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Attendee</div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:3px;">{esc(reg.get('full_name') or 'Attendee')}</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">{email_addr}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Reg ID: <strong style="color:#475569;letter-spacing:.5px;">{esc(reg_id)}</strong></div>
              <div style="margin-top:16px;">
                <a href="{ticket_url}" style="display:inline-block;padding:11px 22px;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:13px;letter-spacing:.2px;">Download Pass</a>
              </div>
            </td>
            <td style="vertical-align:top;text-align:center;">{qr_img}</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 24px 18px;">
        <div style="padding:12px 16px;background:#f8fafc;border-radius:10px;font-size:11px;color:#64748b;line-height:1.6;">
          This pass is your entry ticket. Present it (printed or on your phone) along with a valid photo ID at the venue check-in desk.
        </div>
      </td></tr>
      {sponsors_html}
    </table>"""


async def _sync_user_profile_data(db, user: Optional[dict], payload: Any):
    if user is None:
        return
    dob_val = getattr(payload, "date_of_birth", None) or getattr(payload, "dob", None) or ""
    branch_val = getattr(payload, "branch", None) or ""
    year_val = getattr(payload, "year", None) or ""
    college_val = getattr(payload, "college", None) or ""

    user_updates = {}
    if dob_val and not user.get("dob"):
        user_updates["dob"] = dob_val
    if branch_val:
        user_updates["branch"] = branch_val
        user_updates["school_info.branch_or_stream"] = branch_val
    if year_val:
        user_updates["year"] = year_val
        user_updates["school_info.class_or_year"] = f"Y{year_val}"
    if college_val:
        user_updates["college"] = college_val
        user_updates["school_info.institution_name"] = college_val

    if user_updates:
        try:
            await db.users.update_one({"_id": user["_id"]}, {"$set": user_updates})
        except Exception:
            pass


async def _mirror_to_event_registration(db, reg: dict, showcase: Optional[dict], user: Optional[dict]):
    """Mirror an ECHO registration into the StudentAlumni event_registrations collection."""
    canonical_slug = reg.get("slug") or (showcase or {}).get("slug")
    event_id = f"echo-{canonical_slug}"
    event = await db.events.find_one({"id": event_id})
    if not event:
        event_doc = {
            "id": event_id,
            "title": (showcase or {}).get("title"),
            "category": (showcase or {}).get("category", "college-event"),
            "organizer": (showcase or {}).get("organizer_name") or "Student Alumni Cell",
            "venue": (showcase or {}).get("venue"),
            "start_date": (showcase or {}).get("date"),
            "description": (showcase or {}).get("description"),
            "image": (showcase or {}).get("hero_image_url"),
            "tags": ["ECHO", (showcase or {}).get("college", "")],
            "rsvp_count": 0,
            "created_at": _now(),
        }
        await db.events.insert_one(event_doc)
    sa_reg = {
        "id": reg.get("id"),
        "event_id": event_id,
        "event_title": (showcase or {}).get("title"),
        "user_id": reg.get("user_id") or (str(user["_id"]) if user else None),
        "user_name": reg.get("full_name") or (user.get("full_name") if user else ""),
        "user_unique_id": (user or {}).get("unique_id"),
        "qr_code_base64": reg.get("qr_code_base64"),
        "registered_at": reg.get("registered_at"),
        "status": reg.get("status"),
        "echo_slug": canonical_slug,
        "paid": (reg.get("payment") or {}).get("status") == "paid",
        "payment": reg.get("payment"),
    }
    existing = await db.event_registrations.find_one({"id": reg.get("id")})
    if existing:
        await db.event_registrations.update_one({"_id": existing["_id"]}, {"$set": sa_reg})
    else:
        await db.event_registrations.insert_one(sa_reg.copy())


# ── StudentAlumni account provisioning ─────────────────────────────────────────
def _generate_temp_password(length: int = 12) -> str:
    """Random, typable, strong-enough password emailed to newly-provisioned users.

    Uses a URL-safe alphabet so it can be typed from the email without confusion.
    """
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def _provision_sa_account(db, reg: dict, showcase: Optional[dict]):
    """Ensure every confirmed ECHO attendee has a StudentAlumni account.

    Returns (user, created, password):
      - user     — the SA user doc (existing, or freshly provisioned)
      - created  — True only when a brand-new account was created here
      - password — the generated password when created, else None

    Idempotent: looks the attendee up by email first; never creates duplicates
    (the users.email unique index also guards against races). The registration
    record is updated with the resolved user_id so admin tracking can link an
    attendee to their SA account.
    """
    email = (reg.get("email") or "").strip().lower()
    if not email:
        return None, False, None

    user = await db.users.find_one({"email": email})
    if user:
        reg["user_id"] = str(user["_id"])
        await db.echo_registrations.update_one(
            {"id": reg.get("id")}, {"$set": {"user_id": str(user["_id"])}}
        )
        return user, False, None

    password = _generate_temp_password()
    now = datetime.now(timezone.utc)
    uid = generate_unique_id("student")
    frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
    qr_code = generate_qr_code(f"{frontend_url}/verify/{uid.split('-')[-1]}")

    user_doc: Dict[str, Any] = {
        "email": email,
        "password_hash": hash_password(password),  # auto-generated, emailed to attendee
        "full_name": (reg.get("full_name") or "").strip() or email.split("@")[0].title(),
        "role": "student",
        "phone": encrypt_value(reg.get("phone")),
        "dob": encrypt_value(reg.get("dob")),
        "unique_id": uid,
        "qr_code_base64": qr_code,
        "school_info": None,
        "career_path": None,
        "student_info": None,
        "alumni_info": None,
        "mentor_info": None,
        "interests": [],
        "skills": [],
        "bio": None,
        "face_image_base64": None,
        "onboarding_completed": False,
        "email_verified": False,
        "account_source": "echo",
        "echo_slug": reg.get("slug"),
        "created_at": now,
        "last_login": None,
    }
    try:
        res = await db.users.insert_one(user_doc)
    except Exception as e:
        # Duplicate-key race — another request created the same email between
        # our find_one and insert. Fall back to the existing account.
        if "duplicate key" in str(e).lower() or getattr(e, "code", None) == 11000:
            user = await db.users.find_one({"email": email})
            if user:
                await db.echo_registrations.update_one(
                    {"id": reg.get("id")}, {"$set": {"user_id": str(user["_id"])}}
                )
                return user, False, None
            raise
        raise

    user_doc["_id"] = res.inserted_id
    reg["user_id"] = str(res.inserted_id)
    await db.echo_registrations.update_one(
        {"id": reg.get("id")}, {"$set": {"user_id": str(res.inserted_id)}}
    )
    return user_doc, True, password


async def _send_sa_welcome_email(reg: dict, showcase: Optional[dict], password: str) -> None:
    """Welcome email from StudentAlumni when an ECHO registration creates an SA account."""
    try:
        email = (reg.get("email") or "").strip()
        if not email:
            return
        title = reg.get("showcase_title") or (showcase or {}).get("title") or "Event Registration"
        login_url = "https://studentalumni.ai/login"
        dashboard_url = "https://studentalumni.ai/dashboard"
        body = render_html_email(
            f"""
            <h2 style="margin:0 0 14px 0;color:#111827;">Your StudentAlumni account is ready!</h2>
            <p style="margin:0 0 18px 0;color:#374151;">Because you registered for
            <strong>{title}</strong>, we've created a free account for you on the
            StudentAlumni platform.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Your Email</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{email}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Your Password</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{password}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Event Registered</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{title}</td></tr>
            </table>
            <p style="margin:0 0 22px 0;color:#374151;">
              Sign in with the email and password above. We recommend changing your password
              from your profile once you're in — for your security, please don't share it.
            </p>
            <a href="{login_url}"
               style="display:inline-block;padding:12px 26px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;margin-right:8px;">Sign In</a>
            <a href="{dashboard_url}"
               style="display:inline-block;padding:12px 26px;background:#f3f4f6;color:#111827;text-decoration:none;border-radius:10px;font-weight:600;">Open Dashboard</a>
            """
        )
        await send_email(email, f"Welcome to StudentAlumni — your account for {title}", body)
        # Best-effort WhatsApp with account details
        try:
            phone = (reg.get("phone") or "").strip()
            if phone:
                await send_wa_message(phone=phone, text=f"🎓 *Welcome to StudentAlumni!*\n\nBecause you registered for *{title}*, we created an account for you.\n\n📧 Email: {email}\n🔑 Password: `{password}`\n\nLogin: https://studentalumni.ai/login\n\nYou can change your password from your profile once you're in.", kind="sa_welcome")
        except Exception:
            pass
    except Exception as e:
        print(f"[ECHO] Welcome email error: {e}")


async def _fulfill_team_members(db, reg: dict, showcase: Optional[dict]) -> List[dict]:
    """Ensure every team member in a confirmed team registration has:
    1. A dedicated record in echo_registrations with their own unique ID and QR code.
    2. A StudentAlumni student account provisioned (with welcome email & password).
    3. An event_registrations mirrored record so it shows in their StudentAlumni portal.
    4. Session coupons (if applicable).
    5. A confirmation email with their entry pass (ticket block + QR) and handbook.
    """
    if reg.get("registration_type") != "team":
        return []
    
    team_members = reg.get("team_members") or []
    if not team_members:
        return []
    
    canonical_slug = reg.get("slug") or (showcase or {}).get("slug") or ""
    parent_id = reg.get("id") or ""
    frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
    sessions = (showcase or {}).get("sessions") or []
    fulfilled_members = []

    for idx, member in enumerate(team_members):
        member_email = (member.get("email") or "").strip().lower()
        if not member_email:
            continue
        
        member_name = (member.get("name") or member.get("full_name") or "").strip() or member_email.split("@")[0].title()
        member_phone = (member.get("phone") or "").strip()
        member_reg_id = f"{parent_id}_M{idx + 1}"
        
        # Check if already in echo_registrations
        existing = await db.echo_registrations.find_one({
            "$or": [
                {"id": member_reg_id},
                {"slug": canonical_slug, "email": member_email, "parent_reg_id": parent_id}
            ]
        })
        
        qr_payload = f"{frontend_url}/echo/scan/{member_reg_id}"
        now_iso = _now()
        
        if existing:
            member_reg_doc = dict(existing)
            # Ensure QR code is present if missing
            if not member_reg_doc.get("qr_code_base64"):
                member_reg_doc["qr_code_base64"] = generate_qr_code(qr_payload)
                await db.echo_registrations.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"qr_code_base64": member_reg_doc["qr_code_base64"]}}
                )
        else:
            member_reg_doc = {
                "id": member_reg_id,
                "parent_reg_id": parent_id,
                "is_team_member": True,
                "member_index": idx + 1,
                "slug": canonical_slug,
                "showcase_title": reg.get("showcase_title") or (showcase or {}).get("title"),
                "showcase_college": reg.get("showcase_college") or (showcase or {}).get("college"),
                "user_key": member_email,
                "user_id": None,
                "full_name": member_name,
                "email": member_email,
                "phone": member_phone or reg.get("phone") or "",
                "date_of_birth": member.get("dob") or member.get("date_of_birth") or reg.get("date_of_birth") or reg.get("dob") or "",
                "dob": member.get("dob") or member.get("date_of_birth") or reg.get("date_of_birth") or reg.get("dob") or "",
                "branch": member.get("branch") or reg.get("branch") or "",
                "year": member.get("year") or reg.get("year") or "",
                "college": member.get("college") or reg.get("college") or (showcase or {}).get("college") or "",
                "hackwave_theme": reg.get("hackwave_theme") or reg.get("theme") or "",
                "theme": reg.get("hackwave_theme") or reg.get("theme") or "",
                "fee": reg.get("fee") or 0,
                "team_fee": reg.get("fee") or 0,
                "currency": reg.get("currency") or "INR",
                "payment": {
                    "provider": (reg.get("payment") or {}).get("provider") or "razorpay",
                    "payment_id": (reg.get("payment") or {}).get("payment_id") or "team_covered",
                    "order_id": (reg.get("payment") or {}).get("order_id") or "",
                    "amount": float(reg.get("fee") or (reg.get("payment") or {}).get("amount") or 0),
                    "currency": reg.get("currency") or "INR",
                    "status": "paid",
                    "paid_at": (reg.get("payment") or {}).get("paid_at") or now_iso,
                    "method": "team_pass",
                    "is_team_pass": True,
                    "team_leader_name": reg.get("full_name") or "",
                    "team_leader_email": reg.get("email") or "",
                },
                "qr_code_base64": generate_qr_code(qr_payload),
                "registered_at": reg.get("registered_at") or now_iso,
                "status": "registered",
                "created_at": now_iso,
                "terms_accepted": True,
                "terms_accepted_at": now_iso,
                "whatsapp_opt_in": reg.get("whatsapp_opt_in", True),
                "registration_type": "team",
                "team_name": reg.get("team_name") or "",
                "team_size": reg.get("team_size") or len(team_members) + 1,
                "team_leader_name": reg.get("full_name") or "",
                "team_leader_email": reg.get("email") or "",
                "ticket_template": reg.get("ticket_template") or (showcase or {}).get("ticket_template"),
            }
            await db.echo_registrations.insert_one(dict(member_reg_doc))
        
        member_reg_ser = _ser(member_reg_doc)
        
        # 1) Provision SA Student account (creates account if new & generates password)
        sa_user, created, temp_password = await _provision_sa_account(db, member_reg_ser, showcase)
        if sa_user:
            sa_uid = sa_user.get("unique_id") or str(sa_user["_id"])
            member_reg_ser["user_id"] = str(sa_user["_id"])
            member_reg_ser["sa_unique_id"] = sa_uid
            member["sa_unique_id"] = sa_uid
            member["sa_user_id"] = str(sa_user["_id"])
            member["has_account"] = True
            member["reg_id"] = member_reg_id
            member["ticket_issued"] = True
            member["payment_status"] = "paid"
            member["payment_reference"] = f"Covered under Team Pass (Paid by {reg.get('full_name')})"
            
            await db.echo_registrations.update_one(
                {"id": member_reg_id},
                {"$set": {"user_id": str(sa_user["_id"]), "sa_unique_id": sa_uid}}
            )
            await _mirror_to_event_registration(db, member_reg_ser, showcase, sa_user)
        else:
            member["reg_id"] = member_reg_id
            member["ticket_issued"] = True
            member["has_account"] = False
            member["payment_status"] = "paid"
            member["payment_reference"] = f"Covered under Team Pass (Paid by {reg.get('full_name')})"
            
        # Send welcome email with login credentials if newly created
        if created and temp_password:
            await _send_sa_welcome_email(member_reg_ser, showcase, temp_password)
            
        # 2) Session coupons for the member
        coupons = []
        if sessions and canonical_slug:
            coupons = await _generate_coupons_for_registration(db, canonical_slug, member_reg_id, sessions)
            
        # 3) Send confirmation email with entry pass & QR code
        await _send_team_member_confirmation(db, member_reg_ser, showcase or {}, reg, reg.get("team_name") or "Your Team", coupons=coupons)
        
        # 4) Optional WhatsApp notification
        try:
            if member_phone and _wa_opt_in(reg):
                await _send_wa_confirmation(db, member_reg_ser, showcase or {}, coupons)
        except Exception as _wa_err:
            print(f"[ECHO] Team member WA error: {_wa_err}")
            
        fulfilled_members.append(member_reg_ser)

    # Update parent registration with enriched team members metadata
    if reg.get("_id"):
        try:
            await db.echo_registrations.update_one(
                {"_id": reg["_id"]},
                {"$set": {"team_members": team_members}}
            )
        except Exception as _parent_err:
            print(f"[ECHO] Error updating parent team_members metadata: {_parent_err}")

    return fulfilled_members


async def _store_invoice_and_email(db, reg: dict, showcase: Optional[dict], coupons: Optional[list] = None) -> dict:
    """Persist an invoice for a paid registration and email it to the attendee."""
    fresh = _build_invoice(reg, showcase)
    existing = await db.invoices.find_one({"reg_id": reg.get("id")})
    if existing:
        await db.invoices.update_one({"_id": existing["_id"]}, {"$set": fresh})
        inv = {**_ser(existing), **fresh}
    else:
        result = await db.invoices.insert_one(fresh)
        inv = {**fresh, "_id": result.inserted_id}
    inv_ser = _ser(inv)

    # Fire-and-forget email notification with PDF invoice attached
    try:
        email = reg.get("email") or ""
        esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if email:
            reg_id = reg.get("id") or ""
            import urllib.parse
            ticket_url = f"https://studentalumni.ai/api/echo/tickets/{reg_id}?email={urllib.parse.quote(email)}"
            ticket_block = _ticket_email_block(reg, showcase or {}, ticket_url)
            subject = f"Payment Receipt & Entry Pass — {inv_ser.get('event_title') or 'Event Registration'}"

            # Generate BOTH PDFs: Invoice + Receipt (like Stripe/Razorpay pattern)
            inv_no = inv_ser.get("invoice_no") or "invoice"
            attachments = []

            # 1) Invoice PDF
            invoice_html = _build_invoice_html(inv_ser)
            invoice_pdf = await generate_pdf_from_html(invoice_html)
            if invoice_pdf:
                attachments.append({"filename": f"Invoice-{inv_no}.pdf", "content": invoice_pdf})
                print(f"[ECHO] Invoice PDF generated ({len(invoice_pdf)} bytes) for {email}")

            # 2) Receipt PDF
            receipt_html = _build_receipt_html(inv_ser)
            receipt_pdf = await generate_pdf_from_html(receipt_html)
            if receipt_pdf:
                # derive receipt number same way as _build_receipt_html
                raw_pid = str(inv_ser.get("payment_id") or "").replace("pay_", "").replace("PAY_", "")
                rno = f"{raw_pid[:4]}-{raw_pid[-4:]}" if len(raw_pid) >= 8 else raw_pid
                attachments.append({"filename": f"Receipt-{rno or inv_no}.pdf", "content": receipt_pdf})
                print(f"[ECHO] Receipt PDF generated ({len(receipt_pdf)} bytes) for {email}")

            # 3) Ticket/Entry Pass PDF
            reg = reg  # already defined above
            ticket_url = f"https://studentalumni.ai/api/echo/tickets/{inv_ser.get('reg_id', '')}?email={urllib.parse.quote(email)}"
            ticket_html = _ticket_email_block(reg, showcase or {}, ticket_url)
            ticket_pdf = await generate_pdf_from_html(ticket_html)
            if ticket_pdf:
                attachments.append({"filename": f"EntryPass-{inv_no}.pdf", "content": ticket_pdf})
                print(f"[ECHO] Ticket PDF generated ({len(ticket_pdf)} bytes) for {email}")

            if not attachments:
                print(f"[WARN] PDF generation skipped for {email}")

            body = render_html_email(
                f"""
                <h2 style="margin:0 0 6px 0;color:#111827;font-size:22px;">Payment Confirmed</h2>
                <p style="margin:0 0 24px 0;color:#6b7280;font-size:14px;">Registration for <strong style="color:#111827;">{esc(inv_ser.get('event_title') or 'the event')}</strong> is complete.</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="margin:0 0 24px 0;">
                  <tr>
                    <td style="padding:16px 20px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 10px 10px 0;">
                      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:#16a34a;margin-bottom:4px;">Amount Paid</div>
                      <div style="font-size:26px;font-weight:800;color:#111827;">{inv_ser.get('currency') or 'INR'} {float(inv_ser.get('amount') or 0):,.2f}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="margin:0 0 24px 0;">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Invoice</span></td>
                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#111827;font-size:13px;">{esc(inv_ser.get('invoice_no') or '—')}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Payment ID</span></td>
                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#111827;font-size:13px;font-family:monospace;">{esc(inv_ser.get('payment_id') or '—')}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Date</span></td>
                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#111827;font-size:13px;">{esc(inv_ser.get('date') or '—')}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Event</span></td>
                    <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px;">{esc(inv_ser.get('event_title') or '—')}</td>
                  </tr>
                </table>

                {ticket_block}

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="margin:0 0 24px 0;">
                  <tr>
                    <td style="padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7c3aed;margin-bottom:12px;">Your Documents</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:8px 0;width:36px;vertical-align:middle;">
                            <div style="width:32px;height:32px;background:#ede9fe;border-radius:8px;text-align:center;line-height:32px;">
                              <span style="font-size:14px;font-weight:700;color:#7c3aed;">IN</span>
                            </div>
                          </td>
                          <td style="padding:8px 0;vertical-align:middle;">
                            <div style="font-size:13px;font-weight:600;color:#111827;">Tax Invoice</div>
                            <div style="font-size:12px;color:#94a3b8;">{esc(inv_no)}.pdf — attached to this email</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;width:36px;vertical-align:middle;">
                            <div style="width:32px;height:32px;background:#dcfce7;border-radius:8px;text-align:center;line-height:32px;">
                              <span style="font-size:14px;font-weight:700;color:#16a34a;">RC</span>
                            </div>
                          </td>
                          <td style="padding:8px 0;vertical-align:middle;">
                            <div style="font-size:13px;font-weight:600;color:#111827;">Payment Receipt</div>
                            <div style="font-size:12px;color:#94a3b8;">Official confirmation with payment history — attached</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;width:36px;vertical-align:middle;">
                            <div style="width:32px;height:32px;background:#fef3c7;border-radius:8px;text-align:center;line-height:32px;">
                              <span style="font-size:14px;font-weight:700;color:#d97706;">EP</span>
                            </div>
                          </td>
                          <td style="padding:8px 0;vertical-align:middle;">
                            <div style="font-size:13px;font-weight:600;color:#111827;">Entry Pass</div>
                            <div style="font-size:12px;color:#94a3b8;">Your event ticket with QR code — attached</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
                  <tr>
                    <td align="center" style="padding:0;">
                      <a href="https://studentalumni.ai/dashboard"
                         style="display:inline-block;padding:14px 32px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:.3px;">View My Tickets</a>
                    </td>
                  </tr>
                </table>
                """
            )
            sent = await send_email(email, subject, body, attachments=attachments or None)
            if not sent:
                print(f"[ECHO] WARNING: Email to {email} could not be sent — no email provider configured in Settings > Tools > Email")
            # Best-effort WhatsApp: send the same PDF docs + coupon codes.
            try:
                _coupons = coupons or await db.echo_coupons.find(
                    {"slug": inv_ser.get("slug") or "", "reg_id": reg.get("id")}
                ).to_list(100)
                await _send_wa_paid_package(db, reg, showcase or {}, attachments, _coupons)
            except Exception as wa_err:
                print(f"[ECHO] WhatsApp invoice delivery error: {wa_err}")
    except Exception as e:
        print(f"[ECHO] Invoice email error: {e}")
    return inv_ser


def _human_size(size: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size = size / 1024
    return f"{size:.1f} TB"


# ── Pydantic schemas ─────────────────────────────────────────────────────────
class StatItem(BaseModel):
    label: str
    value: str
    icon: Optional[str] = "users"
    color: Optional[str] = None
    display_order: Optional[int] = 0

class HighlightItem(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""
    color: Optional[str] = None
    display_order: Optional[int] = 0

class TestimonialItem(BaseModel):
    name: str
    branch: Optional[str] = ""
    department: Optional[str] = ""
    year: Optional[str] = ""
    quote: str
    rating: Optional[int] = 5
    avatar_url: Optional[str] = None
    photo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    visible: Optional[bool] = True
    sort_order: Optional[int] = 0

class TimelineItem(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""

class PartnerItem(BaseModel):
    name: str
    logo_url: Optional[str] = None
    kind: Optional[str] = "association"  # association | sponsor
    website_url: Optional[str] = None

class SponsorItem(BaseModel):
    name: str
    logo_url: Optional[str] = None
    tier: Optional[str] = "Gold Sponsor"  # Title Sponsor | Platinum | Gold | Silver | Associate
    website_url: Optional[str] = None
    priority: Optional[int] = 0

class GalleryItem(BaseModel):
    url: str
    caption: Optional[str] = ""
    alt: Optional[str] = ""
    credit: Optional[str] = ""
    tags: Optional[List[str]] = []
    featured: Optional[bool] = False
    order: Optional[int] = 0
    hero: Optional[bool] = False

class DownloadItem(BaseModel):
    title: str
    file_url: str
    description: Optional[str] = ""
    file_size: Optional[str] = ""
    category: Optional[str] = "Document"

class VideoItem(BaseModel):
    title: str
    video_url: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = ""
    platform: Optional[str] = "youtube"  # youtube | vimeo | mp4

class AboutCard(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""
    color: Optional[str] = None

class SpeakerItem(BaseModel):
    """A speaker/panelist on the showcase page.

    Mirrors the reference site (echo.studentalumni.ai): a speaker card shows
    photo, name, position · company, bio, and social links. Panel members are
    rendered in a distinct 'Panel Members' section.
    """
    name: str
    position: Optional[str] = ""       # e.g. "Chief AI Architect"
    company: Optional[str] = ""        # e.g. "Google"
    bio: Optional[str] = ""            # 1-2 line bio
    photo_url: Optional[str] = None    # square headshot
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = ""         # e.g. "Union, New Jersey, USA"
    category: Optional[str] = ""          # e.g. "International Panel", "Voices That Build"
    is_panel_member: Optional[bool] = False   # True → shows under "Panel Members"
    session_title: Optional[str] = ""        # keynote/panel/talk this speaker is part of
    visible: Optional[bool] = True
    sort_order: Optional[int] = 0

class EventCategoryItem(BaseModel):
    """One event track/category (e.g. hackathon problem statement category)."""
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "brain"   # lucide icon key
    color: Optional[str] = None

class ScheduleItem(BaseModel):
    """A time-boxed agenda entry on the schedule/timeline."""
    time: Optional[str] = ""        # e.g. "10:00 AM"
    title: str
    description: Optional[str] = ""
    session_type: Optional[str] = "session"  # keynote | panel | workshop | activity | break
    speaker_names: Optional[List[str]] = []  # speaker names taking part
    venue: Optional[str] = ""
    day: Optional[int] = 1

class PanelItem(BaseModel):
    """A panel discussion topic + list of panelist names."""
    topic: str
    description: Optional[str] = ""
    panelists: Optional[List[str]] = []

class FaqItem(BaseModel):
    question: str
    answer: str

class PerkItem(BaseModel):
    """A perk/benefit card shown on the event detail page."""
    name: str
    description: Optional[str] = ""
    value: Optional[str] = ""           # e.g. "$29 value", "Coupon", "Included"
    icon: Optional[str] = None           # lucide icon key
    display_order: Optional[int] = 0

class CyberConclaveSession(BaseModel):
    """One session card inside the Cyber Security Conclave section."""
    title: str
    description: Optional[str] = ""

class CyberConclaveConfig(BaseModel):
    """Configuration for the Cyber Security Conclave section."""
    enabled: Optional[bool] = True
    badge: Optional[str] = "INTERNATIONAL VIRTUAL CONCLAVE"
    title: Optional[str] = "Cyber Security with AI"
    subtitle: Optional[str] = ""
    date_label: Optional[str] = ""
    time_label: Optional[str] = ""
    sessions: Optional[List[CyberConclaveSession]] = []

class TickerMessage(BaseModel):
    """A single message in the top scrolling ticker bar."""
    text: str
    display_order: Optional[int] = 0

class PrizePoolItem(BaseModel):
    total: Optional[str] = ""
    first: Optional[str] = ""
    second: Optional[str] = ""
    third: Optional[str] = ""
    other_prizes: Optional[List[str]] = []

class RegistrationConfig(BaseModel):
    enabled: Optional[bool] = True
    fee: Optional[float] = 0
    individual_fee: Optional[float] = None
    team_fee: Optional[float] = None
    discount_coupons: Optional[Dict[str, float]] = Field(default_factory=dict)
    currency: Optional[str] = "INR"
    max_seats: Optional[int] = 0
    seat_leverage: Optional[float] = 0.8  # 0.0-1.0 — fraction of registrations that consume seats (0.8 = 20% buffer)
    deadline: Optional[str] = ""
    payment_note: Optional[str] = ""
    payment_url: Optional[str] = None  # External payment gateway link (e.g. Razorpay/Stripe) shown on the register page
    poster_images: Optional[List[str]] = []  # Poster images displayed on the register page
    ticket_template: Optional[str] = "aurora"  # aurora | classic | minimal
    contact_phones: Optional[List[str]] = []  # Contact phone numbers shown on the registration page


DEFAULT_SECTIONS = {
    "hero": True,
    "stats": True,
    "about": True,
    "gallery": True,
    "testimonials": True,
    "timeline": True,
    "speakers": True,
    "categories": True,
    "perks": True,
    "ticker": True,
    "conclave": True,
    "schedule": True,
    "panels": True,
    "faqs": True,
    "partners": True,
    "sponsors": True,
    "videos": True,
    "downloads": True,
    "cta": True,
    "registration": True,
}


class ShowcaseCreateSchema(BaseModel):
    title: str
    slug: str
    aliases: Optional[List[str]] = []  # Legacy/alternate slugs that resolve to this showcase
    subtitle: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = ""
    end_date: Optional[str] = ""
    time: Optional[str] = ""
    venue: Optional[str] = ""
    college: Optional[str] = ""
    category: Optional[str] = "college-event"
    status: Optional[str] = "draft"           # draft | published | archived
    event_status_badge: Optional[str] = "Upcoming"  # Upcoming | Live | Completed
    hero_image_url: Optional[str] = None
    hero_cover_url: Optional[str] = None
    hero_thumbnail_url: Optional[str] = None
    hero_bg_url: Optional[str] = None
    hero_banners: Optional[List[str]] = []
    organizer_name: Optional[str] = ""
    organizer_logo_url: Optional[str] = None
    stats: Optional[List[StatItem]] = []
    highlights: Optional[List[HighlightItem]] = []
    about_cards: Optional[List[AboutCard]] = []
    testimonials: Optional[List[TestimonialItem]] = []
    timeline: Optional[List[TimelineItem]] = []
    speakers: Optional[List[SpeakerItem]] = []
    categories: Optional[List[EventCategoryItem]] = []
    schedule: Optional[List[ScheduleItem]] = []
    panels: Optional[List[PanelItem]] = []
    faqs: Optional[List[FaqItem]] = []
    eligibility: Optional[str] = ""
    prize_pool: Optional[PrizePoolItem] = None
    team_composition: Optional[str] = ""
    partners: Optional[List[PartnerItem]] = []
    sponsors: Optional[List[SponsorItem]] = []
    gallery: Optional[List[GalleryItem]] = []
    gallery_layout: Optional[str] = "grid"  # grid | masonry | mixed | featured-grid | carousel
    downloads: Optional[List[DownloadItem]] = []
    videos: Optional[List[VideoItem]] = []
    cta_title: Optional[str] = "Stay tuned for more events!"
    cta_subtitle: Optional[str] = "Join our community and never miss an opportunity to learn, connect, and grow."
    cta_button_text: Optional[str] = "View Upcoming Events"
    cta_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None
    sections: Optional[Dict[str, bool]] = None
    registration: Optional[RegistrationConfig] = None
    perks: Optional[List[PerkItem]] = []
    ticker_messages: Optional[List[TickerMessage]] = []
    cyber_conclave: Optional[CyberConclaveConfig] = None

# ShowcaseUpdateSchema makes every field optional (for partial PATCH-style updates).
# Defined as a standalone model (not inheriting ShowcaseCreateSchema) to avoid
# mutable-attribute override type errors with strict type-checkers.
class ShowcaseUpdateSchema(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    aliases: Optional[List[str]] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    end_date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    college: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    event_status_badge: Optional[str] = None
    hero_image_url: Optional[str] = None
    hero_cover_url: Optional[str] = None
    hero_thumbnail_url: Optional[str] = None
    hero_bg_url: Optional[str] = None
    hero_banners: Optional[List[str]] = None
    organizer_name: Optional[str] = None
    organizer_logo_url: Optional[str] = None
    stats: Optional[List[StatItem]] = None
    highlights: Optional[List[HighlightItem]] = None
    about_cards: Optional[List[AboutCard]] = None
    testimonials: Optional[List[TestimonialItem]] = None
    timeline: Optional[List[TimelineItem]] = None
    speakers: Optional[List[SpeakerItem]] = None
    categories: Optional[List[EventCategoryItem]] = None
    schedule: Optional[List[ScheduleItem]] = None
    panels: Optional[List[PanelItem]] = None
    faqs: Optional[List[FaqItem]] = None
    eligibility: Optional[str] = None
    prize_pool: Optional[PrizePoolItem] = None
    team_composition: Optional[str] = None
    partners: Optional[List[PartnerItem]] = None
    sponsors: Optional[List[SponsorItem]] = None
    gallery: Optional[List[GalleryItem]] = None
    gallery_layout: Optional[str] = None
    downloads: Optional[List[DownloadItem]] = None
    videos: Optional[List[VideoItem]] = None
    cta_title: Optional[str] = None
    cta_subtitle: Optional[str] = None
    cta_button_text: Optional[str] = None
    cta_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None
    sections: Optional[Dict[str, bool]] = None
    registration: Optional[RegistrationConfig] = None
    sessions: Optional[List[Dict[str, Any]]] = None
    perks: Optional[List[PerkItem]] = None
    ticker_messages: Optional[List[TickerMessage]] = None
    cyber_conclave: Optional[CyberConclaveConfig] = None


# ── Seed Default Data ────────────────────────────────────────────────────────
DEFAULT_SHOWCASE_SEED = {
    "title": "HackWave 3.0 (2026)",
    "slug": "snist",
    "aliases": ["hackwave-3.0", "hackwave-3", "hackwave", "snist"],
    "subtitle": "Career Development Center · SNIST in collaboration with StudentAlumni.ai",
    "description": "Build something real. In one overnight sprint. National-Level 24-Hour Tech Fest with 7 Verticals across AI, Security, Hiring and Firesides.",
    "date": "September 04 – 05, 2026",
    "time": "Sep 4th, 08:00 AM — Sep 5th, 01:00 PM",
    "venue": "Sreenidhi Institute of Science and Technology (SNIST), Hyderabad",
    "college": "SNIST",
    "category": "college-event",
    "status": "published",
    "event_status_badge": "Upcoming",
    "hero_image_url": "https://picsum.photos/seed/echo2026-hero/1200/700",
    "hero_cover_url": "https://picsum.photos/seed/echo2026-hero/1200/700",
    "hero_thumbnail_url": "https://picsum.photos/seed/echo2026-hero/800/500",
    "hero_bg_url": "https://picsum.photos/seed/echo2026-bg/1600/900",
    "organizer_name": "Student Alumni Cell",
    "organizer_logo_url": None,
    "stats": [
        { "label": "Students Attended", "value": "320+", "icon": "users", "display_order": 0 },
        { "label": "Expert Speakers",   "value": "12",   "icon": "speakers", "display_order": 1 },
        { "label": "Sessions",          "value": "6",    "icon": "sessions", "display_order": 2 },
        { "label": "Networking Connections", "value": "48", "icon": "network", "display_order": 3 },
        { "label": "Feedback Score",    "value": "95%",  "icon": "feedback", "display_order": 4 }
    ],
    "highlights": [
        { "icon": "book", "title": "Learn",   "description": "Industry insights", "display_order": 0 },
        { "icon": "network", "title": "Connect", "description": "Build your network", "display_order": 1 },
        { "icon": "trending", "title": "Grow", "description": "Shape your future", "display_order": 2 }
    ],
    "about_cards": [
        { "icon": "book", "title": "Learn", "description": "Industry insights from leading professionals" },
        { "icon": "network", "title": "Connect", "description": "Build lasting networks with peers and alumni" },
        { "icon": "trending", "title": "Grow", "description": "Shape your professional future" }
    ],
    "testimonials": [
        { "name": "Ananya S.", "branch": "Computer Science", "department": "Computer Science", "year": "Final Year", "quote": "Amazing event! The sessions were insightful and helped me understand industry expectations much better.", "rating": 5, "visible": True, "sort_order": 0 },
        { "name": "Rohit M.", "branch": "Information Technology", "department": "Information Technology", "year": "Pre-final Year", "quote": "Great opportunity to network with professionals and connect with like-minded peers.", "rating": 5, "visible": True, "sort_order": 1 },
        { "name": "Priya K.", "branch": "Electronics & Communication", "department": "Electronics & Communication", "year": "Final Year", "quote": "The workshops were hands-on and very practical. Looking forward to more such events!", "rating": 5, "visible": True, "sort_order": 2 }
    ],
    "timeline": [
        { "icon": "star", "title": "Inspiring Keynotes", "description": "Industry leaders shared their journey and insights" },
        { "icon": "users", "title": "Panel Discussions", "description": "Engaging conversations on career and tech trends" },
        { "icon": "code", "title": "Hands-on Workshops", "description": "Practical learning and skill-building sessions" },
        { "icon": "network", "title": "Networking Sessions", "description": "Students connected with experts and alumni" }
    ],
    "speakers": [
        { "name": "Vijay Raghavan", "position": "Chief AI Architect", "company": "Google", "location": "Bangalore, India", "bio": "Leads large-scale ML systems and has mentored 100+ student teams.", "is_panel_member": True, "category": "Keynote Speaker", "session_title": "AI at Scale — Keynote", "sort_order": 0, "visible": True },
        { "name": "Sneha Reddy", "position": "VP Engineering", "company": "Microsoft", "location": "Hyderabad, India", "bio": "Product leader behind developer tooling at Microsoft. Passionate about D&I in tech.", "is_panel_member": True, "category": "Panelist", "session_title": "Careers in AI — Panel", "sort_order": 1, "visible": True },
        { "name": "Dr. Kavitha Nair", "position": "Professor & NLP Researcher", "company": "VNR VJIET", "location": "Hyderabad, India", "bio": "Researcher in NLP and student mentor for AI-DS program.", "is_panel_member": True, "category": "Academic Mentor", "session_title": "Careers in AI — Panel", "sort_order": 2, "visible": True },
        { "name": "Arjun Mehta", "position": "Founder", "company": "BrightFuture Labs", "location": "Hyderabad, India", "bio": "Serial entrepreneur building edtech for rural India.", "is_panel_member": False, "category": "Industry Speaker", "session_title": "Entrepreneurship 101", "sort_order": 3, "visible": True }
    ],
    "categories": [
        { "name": "Healthcare & MedTech", "description": "Build AI solutions for diagnosis, telemedicine and wellness.", "icon": "heartpulse", "color": "#F43F5E" },
        { "name": "EdTech & Learning", "description": "Personalised learning, accessibility and exam-prep tools.", "icon": "graduation-cap", "color": "#8B5CF6" },
        { "name": "Climate & Sustainability", "description": "Track, reduce and offset carbon with smart systems.", "icon": "leaf", "color": "#10B981" },
        { "name": "FinTech & Inclusion", "description": "Financial literacy, UPI innovation and rural banking.", "icon": "landmark", "color": "#F59E0B" },
        { "name": "Smart Cities & Mobility", "description": "Traffic, public transport and safer campuses.", "icon": "bus", "color": "#3B82F6" }
    ],
    "schedule": [
        { "time": "09:30 AM", "title": "Registration & Breakfast", "description": "Check-in with QR tickets and grab breakfast.", "session_type": "break", "day": 1 },
        { "time": "10:00 AM", "title": "Keynote — AI at Scale", "description": "Vijay Raghavan kicks off the day.", "session_type": "keynote", "speaker_names": ["Vijay Raghavan"], "day": 1 },
        { "time": "11:00 AM", "title": "Panel — Careers in AI", "description": "Industry veterans answer student questions.", "session_type": "panel", "speaker_names": ["Sneha Reddy", "Dr. Kavitha Nair"], "day": 1 },
        { "time": "12:30 PM", "title": "Hackathon Build Sprint", "description": "Teams build on their problem categories.", "session_type": "workshop", "day": 1 },
        { "time": "04:00 PM", "title": "Demo & Judging", "description": "Final demos, judging and prize distribution.", "session_type": "activity", "day": 1 }
    ],
    "panels": [
        { "topic": "Careers in AI", "description": "How students can break into AI roles and what companies look for.", "panelists": ["Sneha Reddy", "Dr. Kavitha Nair", "Arjun Mehta"] },
        { "topic": "From Campus to Company", "description": "Internships, placements and the alumni advantage.", "panelists": ["Vijay Raghavan", "Arjun Mehta"] }
    ],
    "faqs": [
        { "question": "Who can participate?", "answer": "Any student from an affiliated college with a valid student ID. Individual and team (4–5) entries are welcome." },
        { "question": "Is the event free?", "answer": "Yes — ECHO 2026 is free for college students. Food and certificates are included." },
        { "question": "Do I need to know AI/ML to attend?", "answer": "No. The keynotes and workshops are beginner-friendly. You can join a team with mixed skills." }
    ],
    "eligibility": "Open to all undergrad and postgrad students. Teams of 4–5 encouraged; individual starts welcome.",
    "prize_pool": { "total": "₹30,000", "first": "₹15,000", "second": "₹10,000", "third": "₹5,000", "other_prizes": ["Internship offers for top 3 teams"] },
    "team_composition": "4–5 members, at least one member from each of design, coding and presentation.",
    "partners": [
        { "name": "Microsoft", "kind": "association", "logo_url": None },
        { "name": "Google", "kind": "association", "logo_url": None },
        { "name": "LinkedIn", "kind": "association", "logo_url": None }
    ],
    "sponsors": [
        { "name": "Tech Corp", "tier": "Title Sponsor", "website_url": "https://example.com", "logo_url": None, "priority": 0 },
        { "name": "InnoLabs", "tier": "Gold Sponsor", "website_url": "https://example.com", "logo_url": None, "priority": 1 },
        { "name": "BrightFuture", "tier": "Silver Sponsor", "website_url": "https://example.com", "logo_url": None, "priority": 2 }
    ],
    "perks": [
        { "name": "Networking with Industry Leaders", "description": "Direct access to professionals from Google, Microsoft, and startups", "value": "Live", "icon": "users" },
        { "name": "Hackathon Prizes", "description": "₹30,000 prize pool across 5 categories", "value": "₹30,000", "icon": "trophy" },
        { "name": "Certificates for all", "description": "Participation and winner certificates with QR verification", "value": "Verifiable", "icon": "award" },
        { "name": "Free Food & Refreshments", "description": "Lunch, snacks, and beverages throughout the event", "value": "Included", "icon": "coffee" },
        { "name": "Internship Opportunities", "description": "On-the-spot internship offers from partner companies", "value": "Live", "icon": "briefcase" }
    ],
    "ticker_messages": [
        { "text": "VNR ECHO 2026 — Empowering Tomorrow's Leaders" },
        { "text": "320+ students · 12 speakers · 5 hackathon tracks" },
        { "text": "Free entry for all VNR VJIET students" },
        { "text": "Certificates, networking, and internship opportunities" },
        { "text": "August 15, 2026 · Main Auditorium, VNR VJIET" }
    ],
    "cyber_conclave": {
        "enabled": False,
        "badge": "",
        "title": "",
        "subtitle": "",
        "date_label": "",
        "time_label": "",
        "sessions": []
    },
    "downloads": [
        { "title": "VNR ECHO 2026 Brochure", "description": "Official event guide & schedule", "file_url": "", "file_size": "2.4 MB", "category": "Brochure" }
    ],
    "videos": [
        {
            "title": "HackWave 3.0 SNIST Official Teaser",
            "video_url": "/videos/hackwave_teaser.mp4",
            "thumbnail_url": "/images/hackwave/hackwave_main_poster.png",
            "description": "Watch the official teaser for HackWave 3.0 at SNIST — 7 Verticals, ₹2,00,000 Grand Pool.",
            "platform": "mp4"
        },
        {
            "title": "Cyber Security with AI Conclave Teaser",
            "video_url": "/videos/cybersecurity_conclave.mp4",
            "thumbnail_url": "/images/hackwave/hackwave_cybersecurity_conclave.jpg",
            "description": "Keynote highlights featuring ISC2 New Jersey Chapter and international cyber security experts.",
            "platform": "mp4"
        },
        {
            "title": "Build by Sunset — 24-Hour Hackathon Sprint Highlights",
            "video_url": "/videos/build_by_sunset.mp4",
            "thumbnail_url": "/images/hackwave/hackwave_techfest_verticals.jpg",
            "description": "Overnight build sprint, tech mentorship, and product showcases live from SNIST campus.",
            "platform": "mp4"
        }
    ],
    "gallery": [
        { "url": "https://picsum.photos/seed/echo2026-1/800/600", "caption": "Keynote session", "alt": "Keynote session at VNR ECHO 2026", "featured": True, "order": 0, "hero": True },
        { "url": "https://picsum.photos/seed/echo2026-2/800/600", "caption": "Audience & panels", "alt": "Panel discussion", "order": 1 },
        { "url": "https://picsum.photos/seed/echo2026-3/800/600", "caption": "Graduation ceremony", "alt": "Ceremony moments", "order": 2 },
        { "url": "https://picsum.photos/seed/echo2026-4/800/600", "caption": "Workshops", "alt": "Hands-on workshops", "order": 3 },
        { "url": "https://picsum.photos/seed/echo2026-5/800/600", "caption": "Event highlights", "alt": "Event highlights", "order": 4 },
        { "url": "https://picsum.photos/seed/echo2026-6/800/600", "caption": "Networking", "alt": "Networking session", "order": 5 },
        { "url": "https://picsum.photos/seed/echo2026-7/800/600", "caption": "Main hall", "alt": "Main auditorium", "order": 6 },
        { "url": "https://picsum.photos/seed/echo2026-8/800/600", "caption": "Student experience", "alt": "Student experience", "order": 7 }
    ],
    "gallery_layout": "grid",
    "cta_title": "Stay tuned for more events!",
    "cta_subtitle": "Join our community and never miss an opportunity to learn, connect, and grow.",
    "cta_button_text": "View Upcoming Events",
    "cta_url": None,
    "seo_title": "VNR ECHO 2026 — Student Alumni Flagship Showcase",
    "seo_description": "Join VNR ECHO 2026 for inspiration, workshops, networking, and industry keynotes.",
    "seo_keywords": "VNR VJIET, ECHO 2026, Student Alumni, Hackathon, Networking",
    "sections": dict(DEFAULT_SECTIONS),
    "registration": {
        "enabled": True,
        "fee": 0,
        "currency": "INR",
        "max_seats": 500,
        "deadline": "",
        "payment_note": "Free entry for VNR VJIET students. Registrations close 1 day before the event.",
        "payment_url": None,
        "poster_images": [
            "https://picsum.photos/seed/echo2026-poster1/900/1200",
            "https://picsum.photos/seed/echo2026-poster2/900/1200",
            "https://picsum.photos/seed/echo2026-poster3/900/1200"
        ],
        "contact_phones": [
            "91214 95077",
            "84669 65800",
            "+91 6281 083 332",
            "+91 63001 97713"
        ],
    },
    "created_at": _now(),
    "updated_at": _now(),
    "created_by": "system"
}


async def seed_echo_showcase(db: AsyncIOMotorDatabase):
    """Seed initial VNR ECHO 2026 showcase if missing, and ensure gallery_layout exists."""
    try:
        seed_slug = str(DEFAULT_SHOWCASE_SEED.get("slug") or "vnr-echo-2026")
        seed_aliases = DEFAULT_SHOWCASE_SEED.get("aliases") or []
        existing = await db.echo_showcases.find_one(_slug_query(seed_slug or ""))
        if not existing and seed_aliases:
            existing = await db.echo_showcases.find_one(
                {"aliases": {"$in": seed_aliases}}
            )
        if not existing:
            doc = dict(DEFAULT_SHOWCASE_SEED)
            doc["created_at"] = _now()
            doc["updated_at"] = _now()
            await db.echo_showcases.insert_one(doc)
            print("[ECHO CMS] Seeded default vnr-echo-2026 showcase")
        else:
            await db.echo_showcases.update_many({"gallery_layout": {"$exists": False}}, {"$set": {"gallery_layout": "grid"}})
    except Exception as e:
        print(f"[ECHO CMS] Seed warning: {e}")


# ── Public handbook download endpoint ─────────────────────────────────────
from fastapi.responses import FileResponse

@router.get("/handbook")
@router.get("/handbook/download")
async def download_handbook():
    pdf_file = Path(__file__).parent / "static" / "HackWave_3.0_Event_Handbook.pdf"
    if not pdf_file.exists():
        raise HTTPException(status_code=404, detail="Event handbook PDF not found")
    return FileResponse(
        path=str(pdf_file),
        filename="HackWave_3.0_Event_Handbook.pdf",
        media_type="application/pdf"
    )

# ── Public endpoints ─────────────────────────────────────────────────────────
@router.get("/showcases")
async def list_showcases(request: Request):
    db = _get_db(request)
    docs = await db.echo_showcases.find(
        {"status": "published"},
        {"gallery": 0, "testimonials": 0, "timeline": 0}
    ).sort("date", -1).to_list(100)

    # Auto-seed if empty
    if len(docs) == 0:
        await seed_echo_showcase(db)
        docs = await db.echo_showcases.find(
            {"status": "published"},
            {"gallery": 0, "testimonials": 0, "timeline": 0}
        ).sort("date", -1).to_list(100)

    return {"items": [_ser(d) for d in docs]}


@router.get("/showcases/{slug}")
async def get_showcase(slug: str, request: Request):
    db = _get_db(request)
    doc = await db.echo_showcases.find_one(_slug_query(slug))
    if not doc:
        # Auto-seed the default showcase on first hit so a fresh DB serves content,
        # but only when the requested slug is the seed's canonical slug/alias or hackwave.
        seed_slug = DEFAULT_SHOWCASE_SEED.get("slug")
        seed_aliases = DEFAULT_SHOWCASE_SEED.get("aliases") or []
        if slug in (seed_slug, *seed_aliases, "hackwave-3.0", "hackwave-3", "hackwave", "snist"):
            await seed_echo_showcase(db)
            doc = await db.echo_showcases.find_one(_slug_query(slug))
            if not doc and slug in ("hackwave-3.0", "hackwave-3", "hackwave", "snist"):
                hw_doc = {
                    "_id": ObjectId(),
                    "title": "HackWave 3.0 (2026)",
                    "slug": slug if slug == "snist" else "hackwave-3.0",
                    "aliases": ["hackwave-3.0", "hackwave-3", "hackwave", "snist"],
                    "subtitle": "Career Development Center · SNIST in collaboration with StudentAlumni.ai",
                    "description": "Build something real. In one overnight sprint. National-Level 24-Hour Tech Fest with 7 Verticals across AI, Security, Hiring and Firesides.",
                    "date": "September 04 – 05, 2026",
                    "dates": "September 04 – 05, 2026",
                    "time": "Sep 4th, 08:00 AM — Sep 5th, 01:00 PM",
                    "venue": "Sreenidhi Institute of Science and Technology (SNIST), Hyderabad",
                    "college": "SNIST",
                    "college_name": "Sreenidhi Institute of Science and Technology",
                    "college_full": "Sreenidhi Institute of Science and Technology",
                    "organizer_name": "Career Development Center · SNIST in collaboration with StudentAlumni.ai",
                    "status": "published",
                    "event_status_badge": "Upcoming",
                    "fee": 599,
                    "individual_fee": 599,
                    "team_fee": 2495,
                    "available_seats": 985,
                    "team_slots_available": 197,
                    "prize_pool": "₹2,00,000 Mega Grand Pool (₹50,000 Track Prize Pool)",
                    "reg_closes": "2026-09-01",
                    "hero_image_url": "/images/hackwave/hackwave_main_poster.png",
                    "banner_url": "/images/hackwave/hackwave_main_poster.png",
                    "poster_url": "/images/hackwave/hackwave_main_poster.png",
                    "gallery_images": [
                        "/images/hackwave/hackwave_main_poster.png",
                        "/images/hackwave/hackwave_cybersecurity_conclave.jpg",
                        "/images/hackwave/hackwave_speakers.jpg",
                        "/images/hackwave/hackwave_techfest_verticals.jpg",
                        "/images/hackwave/hackwave_perks_pool.jpg"
                    ],
                    "videos": [
                        {
                            "title": "HackWave 3.0 SNIST Official Teaser",
                            "video_url": "https://www.youtube.com/watch?v=M576WGiDBdQ",
                            "thumbnail_url": "/images/hackwave/hackwave_main_poster.png",
                            "description": "Watch the official teaser for HackWave 3.0 at SNIST — 7 Verticals, ₹2,00,000 Grand Pool.",
                            "platform": "youtube"
                        },
                        {
                            "title": "Cyber Security with AI Conclave Teaser",
                            "video_url": "https://www.youtube.com/watch?v=aircAruvnKk",
                            "thumbnail_url": "/images/hackwave/hackwave_cybersecurity_conclave.jpg",
                            "description": "Keynote highlights featuring ISC2 New Jersey Chapter and international cyber security experts.",
                            "platform": "youtube"
                        },
                        {
                            "title": "Build by Sunset — 24-Hour Hackathon Sprint Highlights",
                            "video_url": "https://www.youtube.com/watch?v=9bZkp7q19f0",
                            "thumbnail_url": "/images/hackwave/hackwave_techfest_verticals.jpg",
                            "description": "Overnight build sprint, tech mentorship, and product showcases live from SNIST campus.",
                            "platform": "youtube"
                        }
                    ],
                    "cyber_security_conclave": {
                        "title": "Cyber Security with AI",
                        "presented_by": "ISC2 New Jersey Chapter x StudentAlumni.ai",
                        "subtitle": "Global insights for students building a career in security",
                        "date_time": "Friday, September 4, 2026 · 6:00 PM IST · 8:30 AM ET",
                        "topics": [
                            {"title": "Global security trends", "description": "Where the threat landscape is moving."},
                            {"title": "AI on both sides", "description": "How AI is reshaping defence and attack."},
                            {"title": "Certifications that matter", "description": "CISSP, CC and the paths worth it."},
                            {"title": "Career pathways", "description": "How to enter the field from campus."}
                        ]
                    },
                    "speakers": [
                        {"name": "Stan Mierzwa, Ph.D.", "position": "Director, Center for Cybersecurity", "company": "Kean University", "location": "Union, New Jersey, USA", "linkedin_url": "https://linkedin.com/in/stanmierzwa", "bio": "Leading cybersecurity education and research.", "is_panel_member": True, "category": "International Panel", "sort_order": 0, "visible": True},
                        {"name": "Ken Fishkin", "position": "President", "company": "ISC2 New Jersey Chapter", "location": "New Jersey, USA", "linkedin_url": "https://linkedin.com/in/kfishkin", "bio": "Champion for cybersecurity career entry from university campus.", "is_panel_member": True, "category": "International Panel", "sort_order": 1, "visible": True},
                        {"name": "Sharon Kelley", "position": "Board Member", "company": "ISC2 New Jersey Chapter (MS, MBA, CISSP, CCSP)", "location": "Hoboken, New Jersey, USA", "linkedin_url": "https://linkedin.com/in/sharon-kelley-0292181", "bio": "Security leader, educator, and governance mentor.", "is_panel_member": True, "category": "International Panel", "sort_order": 2, "visible": True},
                        {"name": "Jeremy Livingston", "position": "CISO & Deputy CIO", "company": "Stevens Institute of Technology", "location": "Effort, Pennsylvania, USA", "linkedin_url": "https://linkedin.com/in/jeremylivin", "bio": "Leading cybersecurity and higher ed IT infrastructure.", "is_panel_member": True, "category": "International Panel", "sort_order": 3, "visible": True},
                        {"name": "Suman Kalia", "position": "Associate Professor & Chair, Computer Science", "company": "Saint Peter's University", "location": "Jersey City, New Jersey, USA", "linkedin_url": "https://linkedin.com/in/suman-kalia-300b521", "bio": "Academic leader in algorithms and security engineering.", "is_panel_member": True, "category": "International Panel", "sort_order": 4, "visible": True},
                        {"name": "Jonna Dheeraj", "position": "Account Delivery & Program Management", "company": "Embedded SW · AI · VLSI · 5G · IoT", "location": "Hyderabad, India", "bio": "Building high-performance embedded systems and VLSI architectures.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 5, "visible": True},
                        {"name": "Harish Kotra", "position": "DevX Lead", "company": "Quirq", "location": "Hyderabad, India", "bio": "Developer relations leader and community builder.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 6, "visible": True},
                        {"name": "M Avinash Rao", "position": "Client Account Manager", "company": "Deloitte", "location": "Hyderabad, India", "bio": "Enterprise tech consulting and digital delivery expert.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 7, "visible": True},
                        {"name": "Gopichand Anumolu", "position": "Founder", "company": "ATLAST", "location": "Hyderabad, India", "bio": "Startup founder engineering developer tools and student platforms.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 8, "visible": True}
                    ],
                    "verticals": [
                        {"title": "Build by Sunset", "description": "Ship something real between morning and dusk. Teams of 2–5, 5 AI tracks, ₹50,000 prize pool.", "icon": "rocket"},
                        {"title": "Codethon", "description": "Pre-event coding ladder: L1 to L2 to L3. Individual, scored, closes before Sep 4.", "icon": "code"},
                        {"title": "Voices That Build", "description": "A panel of people who have actually shipped — not people talking about shipping.", "icon": "mic"},
                        {"title": "Meet the People Who Hire", "description": "Recruiters in the room, not behind a portal. On-the-spot internship and placement offers.", "icon": "briefcase"},
                        {"title": "Cyber Security Conclave", "description": "Virtual, featuring the ISC2 New Jersey Chapter — global insights on trends, certifications, career pathways (Friday Sep 4, 6:00 PM IST · 8:30 AM ET).", "icon": "shield"},
                        {"title": "International Panel", "description": "Speakers joining live on the big screen from outside India.", "icon": "globe"},
                        {"title": "Between the Builds", "description": "Sleep, eat, work, find people. Open across both days.", "icon": "bed"},
                        {"title": "Play After Dark", "description": "Live music when the laptops finally close.", "icon": "music"},
                        {"title": "Build by Fireside", "description": "Where the idea you haven't shipped yet finally gets heard.", "icon": "flame"}
                    ],
                    "perks": [
                        {"name": "Featherless AI", "desc": "A full account, free", "value": "$29 value", "icon": "sparkles"},
                        {"name": "SetupMark AI", "desc": "50 credits, 2 months free", "value": "$50 value", "icon": "infinity"},
                        {"name": "CodeSpectra AI", "desc": "3 months completely free", "value": "Assessments", "icon": "code"},
                        {"name": "Bandiwala", "desc": "15% off food", "value": "Coupon", "icon": "utensils"},
                        {"name": "WeHive Consulting", "desc": "15% off services", "value": "Coupon", "icon": "briefcase"},
                        {"name": "Four meal coupons", "desc": "Lunch, dinner, midnight, breakfast", "value": "Included", "icon": "coffee"},
                        {"name": "Certificates for all", "desc": "Participation and winner certificates", "value": "Verifiable", "icon": "award"},
                        {"name": "On-the-spot offers", "desc": "Internship and placement offers, in the room", "value": "Live", "icon": "check"},
                        {"name": "Surprise goodies", "desc": "Extra prizes and drops announced on the day", "value": "Surprise", "icon": "gift"}
                    ],
                    "categories": [
                        {"name": "AI That Solves a Real Problem", "description": "Build an AI application that solves a meaningful, real-world problem with high value.", "icon": "target", "color": "#F43F5E"},
                        {"name": "Beyond the Chatbot", "description": "Reimagine AI interaction via voice, visual, workflows, and automation.", "icon": "rocket", "color": "#8B5CF6"},
                        {"name": "AI for Builders", "description": "Developer and creator tools that remove friction and accelerate workflows.", "icon": "wrench", "color": "#3B82F6"},
                        {"name": "Autonomous AI Workflows", "description": "Multi-step reasoning, tool-using autonomous agent systems.", "icon": "cpu", "color": "#10B981"},
                        {"name": "Build the Unexpected", "description": "Original, creative, and ambitious concepts that surprise and delight.", "icon": "sparkles", "color": "#F59E0B"}
                    ],
                    "registration": {
                        "status": "open",
                        "fee": 599,
                        "individual_fee": 599,
                        "team_fee": 2495,
                        "currency": "INR",
                        "available_seats": 985,
                        "team_slots_available": 197,
                        "deadline": "2026-09-01T23:59:59Z",
                        "external_url": None,
                        "payment_url": None
                    },
                    "ticker_messages": [
                        {"text": "The network is a feed until it meets in person."},
                        {"text": "86 ECHO events across 31 campuses."},
                        {"text": "267 roles matched, 41 with a warm referral path."},
                        {"text": "Verified by your college email — free forever for students."},
                        {"text": "HackWave 3.0 · Sep 4–5 · Sreenidhi (SNIST) · ₹2,00,000 Mega Grand Pool (₹50,000 Track Pool)"},
                        {"text": "Built with love for students across all campuses"}
                    ],
                    "cyber_conclave": {
                        "enabled": True,
                        "badge": "INTERNATIONAL VIRTUAL CONCLAVE",
                        "title": "Cyber Security with AI",
                        "subtitle": "Global insights for students building a career in security · Presented by ISC2 New Jersey Chapter (USA) × StudentAlumni.ai",
                        "date_label": "FRIDAY, SEPTEMBER 4, 2026",
                        "time_label": "6:00 PM IST · 8:30 AM ET",
                        "sessions": [
                            {"title": "Global security trends", "description": "Where the threat landscape is moving."},
                            {"title": "AI on both sides", "description": "How AI is reshaping defence and attack."},
                            {"title": "Certifications that matter", "description": "CISSP, CC and the paths worth it."},
                            {"title": "Career pathways", "description": "How to enter the field from campus."}
                        ]
                    },
                    "partners": [
                        {"name": "CodeSpectra", "kind": "association", "logo_url": None},
                        {"name": "Featherless", "kind": "association", "logo_url": None},
                        {"name": "Stepupmark", "kind": "association", "logo_url": None},
                        {"name": "Bandiwala", "kind": "perk", "logo_url": None},
                        {"name": "WeHive", "kind": "perk", "logo_url": None}
                    ],
                    "handbook_url": "/HackWave_3.0_Event_Handbook.pdf",
                    "created_at": _now(),
                    "updated_at": _now()
                }
                await db.echo_showcases.insert_one(hw_doc)
                doc = await db.echo_showcases.find_one(_slug_query(slug))

        # CBIT inline seed
        if not doc and slug == "cbit":
            cbit_doc = {
                "_id": ObjectId(),
                "title": "CBIT ECHO 2026",
                "slug": "cbit",
                "aliases": ["cbit-echo-2026", "cbit"],
                "subtitle": "Innovation, Careers & AI Engineering",
                "description": "Empowering Tomorrow's Leaders — a day of keynotes, hackathons, career tracks and AI workshops at CBIT Hyderabad.",
                "date": "July 31, 2026",
                "time": "09:30 AM — 04:30 PM",
                "venue": "Main Auditorium, CBIT Hyderabad",
                "college": "CBIT",
                "college_name": "Chaitanya Bharathi Institute of Technology",
                "college_full": "Chaitanya Bharathi Institute of Technology, Hyderabad",
                "organizer_name": "CBIT Student Council in collaboration with StudentAlumni.ai",
                "status": "published",
                "event_status_badge": "Upcoming",
                "fee": 499,
                "individual_fee": 499,
                "team_fee": 1999,
                "available_seats": 350,
                "team_slots_available": 70,
                "prize_pool": "₹35,000 prize pool",
                "reg_closes": "2026-07-28",
                "hero_image_url": "/images/hackwave/hackwave_techfest_verticals.jpg",
                "banner_url": "/images/hackwave/hackwave_techfest_verticals.jpg",
                "poster_url": "/images/hackwave/hackwave_techfest_verticals.jpg",
                "gallery_images": [],
                "speakers": [
                    {"name": "Vijay Raghavan", "position": "Chief AI Architect", "company": "Google", "location": "Bangalore, India", "bio": "Leads large-scale ML systems.", "is_panel_member": True, "category": "Keynote Speaker", "session_title": "AI at Scale", "sort_order": 0, "visible": True},
                    {"name": "Sneha Reddy", "position": "VP Engineering", "company": "Microsoft", "location": "Hyderabad, India", "bio": "Product leader behind developer tooling.", "is_panel_member": True, "category": "Panelist", "sort_order": 1, "visible": True},
                    {"name": "Dr. Kavitha Nair", "position": "Professor & NLP Researcher", "company": "VNR VJIET", "location": "Hyderabad, India", "bio": "Researcher in NLP and student mentor.", "is_panel_member": True, "category": "Academic Mentor", "sort_order": 2, "visible": True},
                    {"name": "Arjun Mehta", "position": "Founder", "company": "BrightFuture Labs", "location": "Hyderabad, India", "bio": "Serial entrepreneur building edtech.", "is_panel_member": False, "category": "Industry Speaker", "sort_order": 3, "visible": True}
                ],
                "categories": [
                    {"name": "Healthcare & MedTech", "description": "Build AI solutions for diagnosis and telemedicine.", "icon": "heartpulse", "color": "#F43F5E"},
                    {"name": "EdTech & Learning", "description": "Personalised learning and exam-prep tools.", "icon": "graduation-cap", "color": "#8B5CF6"},
                    {"name": "FinTech & Inclusion", "description": "Financial literacy and UPI innovation.", "icon": "landmark", "color": "#F59E0B"}
                ],
                "partners": [
                    {"name": "Deloitte", "kind": "association", "logo_url": None},
                    {"name": "Featherless", "kind": "association", "logo_url": None},
                    {"name": "Atlast", "kind": "association", "logo_url": None}
                ],
                "perks": [
                    {"name": "Networking with Industry Leaders", "description": "Direct access to professionals from top companies", "value": "Live", "icon": "users"},
                    {"name": "Hackathon Prizes", "description": "₹35,000 prize pool", "value": "₹35,000", "icon": "trophy"},
                    {"name": "Certificates for all", "description": "Participation and winner certificates", "value": "Verifiable", "icon": "award"},
                    {"name": "Free Food", "description": "Lunch and refreshments included", "value": "Included", "icon": "coffee"},
                    {"name": "Internship Opportunities", "description": "On-the-spot offers from partner companies", "value": "Live", "icon": "briefcase"}
                ],
                "ticker_messages": [
                    {"text": "CBIT ECHO 2026 — Empowering Tomorrow's Leaders"},
                    {"text": "320+ students · 12 speakers · 3 hackathon tracks"},
                    {"text": "Free entry for all CBIT students"},
                    {"text": "Certificates, networking, and internship opportunities"},
                    {"text": "July 31, 2026 · Main Auditorium, CBIT Hyderabad"}
                ],
                "cyber_conclave": {
                    "enabled": False,
                    "badge": "",
                    "title": "",
                    "subtitle": "",
                    "date_label": "",
                    "time_label": "",
                    "sessions": []
                },
                "schedule": [],
                "panels": [],
                "faqs": [],
                "highlights": [],
                "testimonials": [],
                "timeline": [],
                "downloads": [],
                "videos": [],
                "gallery": [],
                "sponsors": [],
                "sections": dict(DEFAULT_SECTIONS),
                "registration": {
                    "enabled": True,
                    "fee": 499,
                    "individual_fee": 499,
                    "team_fee": 1999,
                    "currency": "INR",
                    "max_seats": 350,
                    "deadline": "2026-07-28T23:59:59Z",
                    "payment_url": None,
                    "contact_phones": []
                },
                "handbook_url": None,
                "created_at": _now(),
                "updated_at": _now()
            }
            await db.echo_showcases.insert_one(cbit_doc)
            doc = await db.echo_showcases.find_one(_slug_query(slug))

    if not doc:
        raise HTTPException(status_code=404, detail="Showcase not found")
    if doc.get("status") != "published":
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            raise HTTPException(status_code=404, detail="Showcase not found")
        try:
            await _require_admin(request)
        except HTTPException:
            raise HTTPException(status_code=404, detail="Showcase not found")
    result = _ser(doc)
    # Attach live registration counts for seat display
    slug_val = doc.get("slug", slug)
    paid_count = await db.echo_registrations.count_documents({
        "slug": slug_val, "payment.status": "paid",
    })
    total_count = await db.echo_registrations.count_documents({
        "slug": slug_val,
    })
    reg_cfg = result.get("registration") or {}
    reg_cfg["paid_count"] = paid_count
    reg_cfg["total_registrations"] = total_count
    result["registration"] = reg_cfg
    return result


# ── Registration (real payments only — Razorpay) ─────────────────────────────
ALLOWED_BTECH_BRANCHES = {
    "CSE", "CSE-AIML", "AI-DS", "IT", "ECE", "EEE", "ME", "CE", "CHE", "BT", "Other",
    "Computer Science and Engineering",
    "Computer Science and Engineering (CSE)",
    "Computer Science and Engineering (AI & ML)",
    "Artificial Intelligence and Data Science",
    "Information Technology",
    "Electronics and Communication Engineering",
    "Electrical and Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Biotechnology",
}

BRANCH_CANONICAL_MAP = {
    "Computer Science and Engineering": "CSE",
    "Computer Science and Engineering (CSE)": "CSE",
    "Computer Science and Engineering (AI & ML)": "CSE-AIML",
    "Artificial Intelligence and Data Science": "AI-DS",
    "AI_DS": "AI-DS",
    "Information Technology": "IT",
    "Electronics and Communication Engineering": "ECE",
    "Electrical and Electronics Engineering": "EEE",
    "Mechanical Engineering": "ME",
    "MECH": "ME",
    "Civil Engineering": "CE",
    "CIVIL": "CE",
    "Chemical Engineering": "CHE",
    "Biotechnology": "BT",
    "OTHER": "Other",
}

YEAR_CANONICAL_MAP = {
    "1st Year": "1",
    "2nd Year": "2",
    "3rd Year": "3",
    "4th Year": "4",
    "Alumni": "Alumni",
    "Alumni / Passed Out": "Alumni",
    "Passed Out": "Alumni",
    "Final": "4",
    "Final Year": "4",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
}

# Phone number regex: optional leading +, 7-15 digits/spaces/dashes/parens
import re as _re
_PHONE_RE = _re.compile(r'^[+]?[\d\s\-().]{7,15}$')

def _validate_phone_value(v: str) -> str:
    """Shared phone validator: required, non-empty, valid format."""
    if not v or not v.strip():
        raise ValueError("Phone number is required.")
    digits = _re.sub(r'[^\d]', '', v)
    if len(digits) < 7 or len(digits) > 15:
        raise ValueError("Please enter a valid phone number.")
    if not _PHONE_RE.match(v.strip()):
        raise ValueError("Please enter a valid phone number.")
    return v.strip()


class TeamMemberSchema(BaseModel):
    name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v):
        if not v or not v.strip():
            raise ValueError("Team member email is required")
        import re
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, v.strip().lower()):
            raise ValueError("Please enter a valid email address")
        return v.strip().lower()

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v):
        return _validate_phone_value(v or "")


class RegisterSchema(BaseModel):
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    date_of_birth: Optional[str] = ""
    dob: Optional[str] = ""
    branch: Optional[str] = ""
    year: Optional[str] = ""
    college: Optional[str] = ""
    hackwave_theme: Optional[str] = ""
    theme: Optional[str] = ""
    payment_method: Optional[str] = ""
    terms_accepted: Optional[bool] = False
    terms_accepted_at: Optional[str] = ""
    whatsapp_opt_in: Optional[bool] = True
    registration_type: Optional[str] = "individual"
    team_name: Optional[str] = ""
    team_size: Optional[int] = 1
    team_members: Optional[List[TeamMemberSchema]] = []
    coupon_code: Optional[str] = ""

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v):
        if not v or not v.strip():
            raise ValueError("Email is required")
        import re
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, v.strip().lower()):
            raise ValueError("Please enter a valid email address")
        return v.strip().lower()

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v):
        return _validate_phone_value(v or "")

    @field_validator("date_of_birth", "dob")
    @classmethod
    def _validate_dob(cls, v):
        if not v or not v.strip():
            return ""
        val = v.strip()
        try:
            d = _date.fromisoformat(val)
        except Exception:
            raise ValueError("Date of birth must be in YYYY-MM-DD format")
        if d > _date.today():
            raise ValueError("Date of birth cannot be in the future")
        return val

    @field_validator("branch")
    @classmethod
    def _validate_branch(cls, v):
        if not v or not v.strip():
            return ""
        val = v.strip()
        norm = BRANCH_CANONICAL_MAP.get(val, val)
        if norm not in ALLOWED_BTECH_BRANCHES and val not in ALLOWED_BTECH_BRANCHES:
            raise ValueError(f"Invalid B.Tech branch: {val}")
        return norm

    @field_validator("year")
    @classmethod
    def _validate_year(cls, v):
        if not v or not v.strip():
            return ""
        val = v.strip()
        norm = YEAR_CANONICAL_MAP.get(val, val)
        if norm not in ("1", "2", "3", "4", "Alumni", "Passed Out", "Graduated", "5"):
            raise ValueError("Academic year must be 1, 2, 3, 4, or Alumni")
        return norm

    @field_validator("registration_type")
    @classmethod
    def _validate_registration_type(cls, v):
        if v and v not in ("individual", "team"):
            raise ValueError("Registration type must be 'individual' or 'team'")
        return v or "individual"

    @field_validator("team_size")
    @classmethod
    def _validate_team_size(cls, v, info):
        reg_type = info.data.get("registration_type", "individual")
        if reg_type == "team":
            if not v or v < 2:
                raise ValueError("Team size must be at least 2")
            if v > 5:
                raise ValueError("Team size cannot exceed 5")
        return v or 1

    @field_validator("team_name")
    @classmethod
    def _validate_team_name(cls, v, info):
        reg_type = info.data.get("registration_type", "individual")
        if reg_type == "team":
            if not v or not v.strip():
                raise ValueError("Team name is required for team registration")
            if len(v.strip()) < 2:
                raise ValueError("Team name must be at least 2 characters")
            if len(v.strip()) > 50:
                raise ValueError("Team name must be 50 characters or less")
        return v.strip() if v else ""

    @field_validator("team_members")
    @classmethod
    def _validate_team_members(cls, v, info):
        reg_type = info.data.get("registration_type", "individual")
        team_size = info.data.get("team_size", 1)
        if reg_type == "team":
            if not v or len(v) == 0:
                raise ValueError("Team members are required for team registration")
            if len(v) != team_size:
                raise ValueError(f"Expected {team_size} team members, got {len(v)}")
        return v or []
class CouponVerifyRequest(BaseModel):
    coupon_code: str

@router.post("/showcases/{slug}/verify-coupon")
async def verify_discount_coupon(
    slug: str,
    payload: CouponVerifyRequest,
    request: Request,
):
    """Verify a discount coupon for an Echo event registration."""
    db = _get_db(request)
    showcase = await db.echo_showcases.find_one(_slug_query(slug))
    if not showcase:
        raise HTTPException(status_code=404, detail="Showcase not found")
    if showcase.get("status") != "published":
        raise HTTPException(status_code=404, detail="Showcase not found")

    reg_cfg = showcase.get("registration") or {}
    coupons_dict = reg_cfg.get("discount_coupons") or {}
    
    if not payload.coupon_code:
        raise HTTPException(status_code=400, detail="Coupon code is required")
        
    coupon_upper = payload.coupon_code.strip().upper()
    
    for k, v in coupons_dict.items():
        if k.upper() == coupon_upper:
            return {"valid": True, "discount_percent": float(v), "coupon_code": coupon_upper}
            
    return {"valid": False, "discount_percent": 0.0, "message": "Invalid or expired coupon"}



@router.post("/showcases/{slug}/register")
async def register_for_showcase(
    slug: str,
    payload: RegisterSchema,
    request: Request,
):
    """Register a user for an ECHO event.

    Payment is 100% real — free events confirm instantly, paid events require a
    connected Razorpay gateway and are confirmed only after payment capture.

    Writes two records:
      1. `echo_registrations` — the event-side registration (paid status, QR).
      2. `event_registrations` — StudentAlumni-side registration so the user
         sees it in their SA account + gets a check-in QR (matches /events flow).
    Idempotent per (slug, user).
    """
    db = _get_db(request)

    # Resolve caller: optional auth (public registration is allowed, but if a
    # token is present we bind the registration to that user).
    user = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            import jwt as _jwt
            JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
            payload_token = _jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
            user = await db.users.find_one({"_id": ObjectId(payload_token.get("sub"))})
        except Exception:
            user = None

    showcase = await db.echo_showcases.find_one(_slug_query(slug))
    if not showcase:
        raise HTTPException(status_code=404, detail="Showcase not found")
    if showcase.get("status") != "published":
        raise HTTPException(status_code=404, detail="Showcase not found")

    # Use the canonical slug so alias URLs (legacy redirects) register under one identity.
    canonical_slug = showcase.get("slug") or slug

    reg_cfg = showcase.get("registration") or {}

    # Server-side gates: closed registrations, past deadline, full capacity.
    await _assert_registration_open(db, showcase)

    # Terms & Conditions acceptance is mandatory.
    if payload.terms_accepted is not True:
        raise HTTPException(
            status_code=400,
            detail="Terms and Conditions must be accepted before completing registration.",
        )

    # Auto-onboard manually-typed colleges (idempotent — no-op if already in DB).
    college_value = (payload.college or "").strip()
    if college_value:
        try:
            from routers.admin.colleges import ensure_college
            await ensure_college(college_value, created_by="echo-registration")
        except Exception:
            pass

    # Case-insensitive dedup — emails are normalized to lowercase so the same
    # person cannot register twice with different capitalisation.
    from core.email_quality import require_ok
    reg_email = require_ok(payload.email or "")
    user_key = str(user["_id"]) if user else (reg_email or (payload.phone or "").strip() or "anon")
    existing = await db.echo_registrations.find_one(
        {"slug": canonical_slug, "user_key": user_key}
    )
    if existing:
        return _ser(existing)

    # Team name uniqueness check — team names must be unique per event
    registration_type = payload.registration_type or "individual"
    team_name = (payload.team_name or "").strip()
    if registration_type == "team" and team_name:
        existing_team = await db.echo_registrations.find_one(
            {"slug": canonical_slug, "team_name": {"$regex": f"^{re.escape(team_name)}$", "$options": "i"}}
        )
        if existing_team:
            raise HTTPException(
                status_code=400,
                detail=f"Team name '{team_name}' is already taken for this event. Please choose a different name."
            )

    reg_id = secrets.token_hex(6)
    now_iso = datetime.now(timezone.utc).isoformat()
    frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
    qr_payload = f"{frontend_url}/echo/scan/{reg_id}"
    fee = float(reg_cfg.get("fee", 0) or 0)
    currency = reg_cfg.get("currency", "INR")

    # Payment: FREE events are confirmed immediately. PAID events REQUIRE a
    # connected Razorpay gateway — there is no demo/mock auto-approve path, so
    # paid registration never issues a QR or invoice unless money was captured.
    gateway_cfg = await _razorpay_config(db)
    
    # Calculate total fee for team registrations
    team_size = payload.team_size or 1
    registration_type = payload.registration_type or "individual"
    
    if registration_type == "team":
        team_fee_conf = reg_cfg.get("team_fee")
        total_fee = float(team_fee_conf) if team_fee_conf is not None else (fee * team_size)
    else:
        indiv_fee_conf = reg_cfg.get("individual_fee")
        total_fee = float(indiv_fee_conf) if indiv_fee_conf is not None else fee

    applied_discount_percent = 0.0
    applied_coupon = None
    if payload.coupon_code:
        coupon_upper = payload.coupon_code.strip().upper()
        coupons_dict = reg_cfg.get("discount_coupons") or {}
        for k, v in coupons_dict.items():
            if k.upper() == coupon_upper:
                applied_discount_percent = float(v)
                applied_coupon = coupon_upper
                break
        
        if applied_discount_percent > 0:
            discount_amount = total_fee * (applied_discount_percent / 100.0)
            total_fee = max(0.0, total_fee - discount_amount)
    
    auto_paid = total_fee <= 0

    if auto_paid:
        payment = {
            "payment_id": f"PAY_{secrets.token_hex(8).upper()}",
            "gateway": "free",
            "amount": total_fee,
            "currency": currency,
            "status": "paid",
            "paid_at": now_iso,
            "method": payload.payment_method or "free",
        }
    else:
        if gateway_cfg is None:
            raise HTTPException(
                status_code=503,
                detail="Online payments are temporarily unavailable — please try again later",
            )
        payment = {
            "payment_id": None,
            "gateway": "razorpay",
            "amount": total_fee,
            "currency": currency,
            "status": "pending",
            "paid_at": None,
            "method": payload.payment_method or "upi",
        }

    # 1) Event-side registration
    dob_val = payload.date_of_birth or payload.dob or ""
    
    # Prepare team members data
    team_members_data = []
    if registration_type == "team" and payload.team_members:
        team_members_data = [
            {
                "name": m.name or "",
                "email": m.email or "",
                "phone": m.phone or "",
            }
            for m in payload.team_members
        ]
    
    reg = {
        "id": reg_id,
        "slug": canonical_slug,
        "showcase_title": showcase.get("title"),
        "showcase_college": showcase.get("college"),
        "user_key": user_key,
        "user_id": str(user["_id"]) if user else None,
        "full_name": payload.full_name or (user.get("full_name") if user else "") or "Attendee",
        "email": reg_email or (user.get("email") if user else ""),
        "phone": payload.phone or (user.get("phone") if user else ""),
        "date_of_birth": dob_val,
        "dob": dob_val,
        "branch": payload.branch,
        "year": payload.year,
        "college": payload.college or showcase.get("college"),
        "hackwave_theme": payload.hackwave_theme or payload.theme or "",
        "theme": payload.hackwave_theme or payload.theme or "",
        "fee": total_fee,
        "currency": currency,
        "payment": payment,
        "qr_code_base64": generate_qr_code(qr_payload) if auto_paid else None,
        "registered_at": now_iso,
        "status": "registered" if auto_paid else "pending",
        "created_at": now_iso,
        "terms_accepted": payload.terms_accepted or False,
        "terms_accepted_at": payload.terms_accepted_at or now_iso,
        "whatsapp_opt_in": payload.whatsapp_opt_in if payload.whatsapp_opt_in is not None else True,
        "registration_type": registration_type,
        "team_name": team_name,
        "team_size": team_size,
        "team_members": team_members_data,
        "coupon_code": applied_coupon,
        "discount_percent": applied_discount_percent,
    }
    await db.echo_registrations.insert_one(dict(reg))
    await _sync_user_profile_data(db, user, payload)

    # 2) StudentAlumni-side: provision SA accounts for ALL attendees
    #    (primary registrant + team members), then send confirmation emails.
    if auto_paid:
        # Provision account for primary registrant
        sa_user, created, temp_password = await _provision_sa_account(db, reg, showcase)
        if sa_user:
            await _mirror_to_event_registration(db, reg, showcase, sa_user)
        if created and temp_password:
            await _send_sa_welcome_email(reg, showcase, temp_password)

        # Provision accounts for team members & issue passes
        if registration_type == "team" and team_members_data:
            await _fulfill_team_members(db, reg, showcase)

    # Free/confirmed registrations get a confirmation email (with QR).
    # Paid registrations on this path are impossible — they must pay first.
    invoice = None
    confirmation_sent = False
    if auto_paid:
        # Generate session coupons for primary registrant
        sessions = showcase.get("sessions") or []
        coupons = await _generate_coupons_for_registration(db, canonical_slug, reg_id, sessions)
        
        # Send confirmation to primary registrant (with team info if applicable)
        await _send_registration_confirmation(db, reg, showcase or {}, team_name if registration_type == "team" else None)
        await _send_wa_confirmation(db, reg, showcase or {}, coupons)
        confirmation_sent = True

    result = _ser(reg)
    result["confirmation_email_sent"] = confirmation_sent
    if invoice:
        result["invoice"] = invoice
    return result


@router.get("/showcases/{slug}/my-registration")
async def my_showcase_registration(slug: str, request: Request):
    """Return the caller's registration for a showcase (public if anon → by email/phone)."""
    db = _get_db(request)
    showcase = await db.echo_showcases.find_one(_slug_query(slug))
    canonical_slug = (showcase or {}).get("slug") or slug
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        import jwt as _jwt
        JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
        try:
            payload = _jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
            user = await db.users.find_one({"_id": ObjectId(payload.get("sub"))})
            if user:
                uid = str(user["_id"])
                reg = await db.echo_registrations.find_one(
                    {"slug": canonical_slug, "$or": [{"user_id": uid}, {"user_key": uid}]}
                )
                return _ser(reg or {})
        except Exception:
            pass
    return {}


@router.get("/registrations/{reg_id}/qr.png")
async def get_registration_qr_png(reg_id: str, request: Request):
    """Fetch registration QR code directly as a PNG image for email clients."""
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg or not reg.get("qr_code_base64"):
        raise HTTPException(status_code=404, detail="QR Code not found")
    import base64
    from fastapi import Response
    try:
        img_data = base64.b64decode(reg.get("qr_code_base64"))
        return Response(content=img_data, media_type="image/png")
    except Exception:
        raise HTTPException(status_code=500, detail="Error loading QR image")


# ── Payment endpoints (Razorpay) ─────────────────────────────────────────────
class PaymentOrderSchema(BaseModel):
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    date_of_birth: Optional[str] = ""
    dob: Optional[str] = ""
    branch: Optional[str] = ""
    year: Optional[str] = ""
    college: Optional[str] = ""
    terms_accepted: Optional[bool] = False
    registration_type: Optional[str] = "individual"
    team_name: Optional[str] = ""
    team_size: Optional[int] = 1
    team_members: Optional[List[TeamMemberSchema]] = []

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v):
        if not v or not v.strip():
            raise ValueError("Email is required")
        import re
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, v.strip().lower()):
            raise ValueError("Please enter a valid email address")
        return v.strip().lower()

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v):
        return _validate_phone_value(v or "")

    @field_validator("date_of_birth", "dob")
    @classmethod
    def _validate_dob(cls, v):
        if not v or not v.strip():
            return ""
        val = v.strip()
        try:
            d = _date.fromisoformat(val)
        except Exception:
            raise ValueError("Date of birth must be in YYYY-MM-DD format")
        if d > _date.today():
            raise ValueError("Date of birth cannot be in the future")
        return val

    @field_validator("branch")
    @classmethod
    def _validate_branch(cls, v):
        if not v or not v.strip():
            return ""
        val = v.strip()
        norm = BRANCH_CANONICAL_MAP.get(val, val)
        if norm not in ALLOWED_BTECH_BRANCHES and val not in ALLOWED_BTECH_BRANCHES:
            raise ValueError(f"Invalid B.Tech branch: {val}")
        return norm

    @field_validator("year")
    @classmethod
    def _validate_year(cls, v):
        if not v or not v.strip():
            return ""
        val = v.strip()
        norm = YEAR_CANONICAL_MAP.get(val, val)
        if norm not in ("1", "2", "3", "4", "Alumni", "Passed Out", "Graduated", "5"):
            raise ValueError("Academic year must be 1, 2, 3, 4, or Alumni")
        return norm


class VerifyPaymentSchema(PaymentOrderSchema):
    razorpay_payment_id: Optional[str] = ""
    razorpay_order_id: Optional[str] = ""
    razorpay_signature: Optional[str] = ""


async def _resolve_user(request: Request, db) -> Optional[dict]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        import jwt as _jwt
        JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
        try:
            p = _jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
            return await db.users.find_one({"_id": ObjectId(p.get("sub"))})
        except Exception:
            return None
    return None


@router.post("/showcases/{slug}/payment-order")
async def create_payment_order(slug: str, payload: PaymentOrderSchema, request: Request):
    """Create a Razorpay payment order for a paid ECHO registration.

    Returns an existing paid registration if the user already completed payment.
    Requires a connected Razorpay gateway — returns 503 otherwise (no demo path).
    """
    db = _get_db(request)
    user = await _resolve_user(request, db)
    showcase = await db.echo_showcases.find_one(_slug_query(slug))
    if not showcase:
        raise HTTPException(status_code=404, detail="Showcase not found")
    if showcase.get("status") != "published":
        raise HTTPException(status_code=404, detail="Showcase not found")
    reg_cfg = showcase.get("registration") or {}

    # Server-side gates: closed registrations, past deadline, full capacity.
    await _assert_registration_open(db, showcase)

    canonical_slug = showcase.get("slug") or slug
    fee = float(reg_cfg.get("fee", 0) or 0)
    currency = reg_cfg.get("currency", "INR")
    
    # Calculate total fee for team registrations
    team_size = payload.team_size or 1
    registration_type = payload.registration_type or "individual"
    total_fee = fee * team_size if registration_type == "team" else fee

    if total_fee <= 0:
        raise HTTPException(status_code=400, detail="This event is free — register directly")

    if not (payload.full_name or "").strip() or not (payload.email or "").strip():
        raise HTTPException(status_code=400, detail="Full name and email are required")

    # Terms & Conditions acceptance is mandatory.
    if payload.terms_accepted is not True:
        raise HTTPException(
            status_code=400,
            detail="Terms and Conditions must be accepted before completing registration.",
        )

    # A real Razorpay gateway must be configured — no demo/mock order creation.
    cfg = await _razorpay_config(db)
    if not cfg:
        raise HTTPException(
            status_code=503,
            detail="Online payments are temporarily unavailable — please try again later",
        )

    from core.email_quality import require_ok
    email = require_ok(payload.email or "")
    user_key = str(user["_id"]) if user else (email or (payload.phone or "").strip() or "anon")

    existing = await db.echo_registrations.find_one({"slug": canonical_slug, "user_key": user_key})
    if existing:
        payment = existing.get("payment") or {}
        if payment.get("status") == "paid":
            return {"already": True, "registration": _ser(existing)}
        # Reuse an existing fresh order ONLY if this registration is still pending
        # and the session hasn't expired. A failed/expired registration must get a
        # brand-new Razorpay order — old order ids are dead after ~15 minutes.
        order_created_raw = (existing.get("payment_order") or {}).get("created_at")
        order_created = _parse_iso(order_created_raw) if order_created_raw else None
        order_fresh = order_created and (datetime.now(timezone.utc) - order_created).total_seconds() <= ECHO_PAYMENT_SESSION_TTL_SECONDS
        status_pending = existing.get("status") == "pending" and payment.get("status") == "pending"
        order_id = (existing.get("payment_order") or {}).get("order_id")
        if order_id and order_fresh and status_pending:
            return {
                "already": False,
                "order_id": order_id,
                "amount": total_fee,
                "currency": currency,
                "key_id": cfg.get("key_id", ""),
                "receipt": existing.get("id"),
                "pending": True,
            }
        # Stale/failed → reset to a fresh pending state below (create a new order).

    # Use the existing registration id as the Razorpay receipt when re-registering
    # (failed/expired pending) so the order is attributable to that registration.
    reg_id = existing.get("id") if existing else secrets.token_hex(6)
    now_iso = _now()

    # Create the Razorpay order
    order = await _razorpay_create_order(
        db, total_fee, currency, reg_id,
        {"slug": canonical_slug, "email": email, "name": payload.full_name},
    )
    if order is None:
        raise HTTPException(status_code=502, detail="Payment gateway temporarily unavailable — please try again")

    # Persist a pending registration so verify-payment / webhook has a record
    if not existing:
        dob_val = payload.date_of_birth or payload.dob or ""
        
        # Prepare team members data
        team_members_data = []
        if registration_type == "team" and payload.team_members:
            team_members_data = [
                {
                    "name": m.name or "",
                    "email": m.email or "",
                    "phone": m.phone or "",
                }
                for m in payload.team_members
            ]
            
        reg = {
            "id": reg_id,
            "slug": canonical_slug,
            "showcase_title": showcase.get("title"),
            "showcase_college": showcase.get("college"),
            "user_key": user_key,
            "user_id": str(user["_id"]) if user else None,
            "full_name": payload.full_name,
            "email": email,
            "phone": payload.phone,
            "date_of_birth": dob_val,
            "dob": dob_val,
            "branch": payload.branch,
            "year": payload.year,
            "college": payload.college or showcase.get("college"),
            "fee": total_fee,
            "currency": currency,
            "payment": {
                "payment_id": None,
                "gateway": "razorpay",
                "amount": total_fee,
                "currency": currency,
                "status": "pending",
                "paid_at": None,
                "method": "upi",
            },
            "payment_order": {"order_id": order.get("id"), "created_at": now_iso},
            "qr_code_base64": None,
            "registered_at": now_iso,
            "status": "pending",
            "created_at": now_iso,
            "registration_type": registration_type,
            "team_name": (payload.team_name or "").strip(),
            "team_size": team_size,
            "team_members": team_members_data,
        }
        await db.echo_registrations.insert_one(dict(reg))
    else:
        reg_id = existing.get("id")
        
        # Prepare team members data for update
        team_members_data = []
        if registration_type == "team" and payload.team_members:
            team_members_data = [
                {
                    "name": m.name or "",
                    "email": m.email or "",
                    "phone": m.phone or "",
                }
                for m in payload.team_members
            ]
            
        dob_val = payload.date_of_birth or payload.dob or ""
        
        # Attach the freshly-created order to the pre-existing reg and reset any
        # expired/failed state back to pending so verify-payment / webhook can
        # resolve it by order id and the user can pay with the new session.
        # Also update all registration details in case they changed from IND to TEAM or updated info.
        await db.echo_registrations.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "full_name": payload.full_name,
                "phone": payload.phone,
                "date_of_birth": dob_val,
                "dob": dob_val,
                "branch": payload.branch,
                "year": payload.year,
                "college": payload.college or showcase.get("college"),
                "fee": total_fee,
                "payment.amount": total_fee,
                "registration_type": registration_type,
                "team_name": (payload.team_name or "").strip(),
                "team_size": team_size,
                "team_members": team_members_data,
                "payment_order": {"order_id": order.get("id"), "created_at": now_iso},
                "status": "pending",
                "payment.status": "pending",
                "payment.failed_at": None,
                "payment.failed_reason": None,
                "payment.payment_id": None,
            }},
        )

    return {
        "already": False,
        "order_id": order.get("id"),
        "amount": total_fee,
        "currency": currency,
        "key_id": cfg["key_id"],
        "receipt": reg_id,
        "pending": True,
    }


@router.post("/showcases/{slug}/verify-payment")
async def verify_payment(slug: str, payload: VerifyPaymentSchema, request: Request):
    """Verify a Razorpay payment (HMAC signature) and finalize the registration.

    Payment is only confirmed when the Razorpay signature validates against the
    configured key secret — there is no demo/accept-anything path.
    """
    db = _get_db(request)
    user = await _resolve_user(request, db)
    showcase = await db.echo_showcases.find_one(_slug_query(slug))
    if not showcase:
        raise HTTPException(status_code=404, detail="Showcase not found")

    canonical_slug = showcase.get("slug") or slug
    email = (payload.email or "").strip().lower()
    user_key = str(user["_id"]) if user else (email or (payload.phone or "").strip() or "anon")

    reg = await db.echo_registrations.find_one({"slug": canonical_slug, "user_key": user_key})
    if not reg:
        # Fallback: match the pending registration by the Razorpay order id we
        # stored during order creation (reg.id is a hex token, not the order id).
        reg = await db.echo_registrations.find_one({"payment_order.order_id": payload.razorpay_order_id})
    if not reg:
        raise HTTPException(status_code=404, detail="No pending registration found")

    # A real gateway must be configured — no demo acceptance.
    cfg = await _razorpay_config(db)
    if not cfg:
        raise HTTPException(
            status_code=503,
            detail="Online payments are temporarily unavailable — please try again later",
        )
    if not (payload.razorpay_payment_id and payload.razorpay_order_id and payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Missing payment verification parameters")
    if payload.razorpay_order_id != (reg.get("payment_order") or {}).get("order_id"):
        raise HTTPException(status_code=400, detail="Order mismatch")
    ok = await _razorpay_verify_signature(db, payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature)
    if not ok:
        raise HTTPException(status_code=400, detail="Payment verification failed — please contact support")

    finalized = await _finalize_paid_registration(db, reg, showcase, payload.razorpay_payment_id)
    registration = finalized or _ser(reg)
    await _sync_user_profile_data(db, user, payload)
    return {"registration": registration, "invoice": registration.get("invoice")}


# ── Razorpay webhook ─────────────────────────────────────────────────────────
@router.post("/showcases/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Server-confirmed payment capture webhook.

    Razorpay POSTs here when a payment is captured. We verify the HMAC signature
    over the raw body, then finalize the matching pending ECHO registration
    (QR + invoice + email + mirror). Always answers 200 so Razorpay does not
    retry already-handled events; failures are logged and re-drivable via
    verify-payment.
    """
    db = _get_db(request)
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    cfg = await _razorpay_config(db)
    if not cfg:
        print("[ECHO-WEBHOOK] Razorpay webhook received but gateway not configured")
        return {"received": True, "processed": False, "reason": "gateway_not_configured"}

    if not signature:
        print("[ECHO-WEBHOOK] No x-razorpay-signature header — Razorpay may not be configured to send webhooks")
        return {"received": True, "processed": False, "reason": "missing_signature"}
    if not await _razorpay_verify_webhook_signature(db, body, signature):
        print("[ECHO-WEBHOOK] Razorpay webhook signature verification failed — check webhook_secret in Settings → Razorpay matches the one in Razorpay Dashboard → Settings → Webhooks")
        return {"received": True, "processed": False, "reason": "signature_failed"}

    try:
        event = json.loads(body)
    except Exception as e:
        print(f"[ECHO-WEBHOOK] Invalid JSON body: {e}")
        return {"received": True, "processed": False, "reason": "invalid_json"}

    event_name = event.get("event") or ""
    entity = (event.get("payload") or {}).get("payment", {}).get("entity") or {}
    order_id = entity.get("order_id") or ""
    payment_id = entity.get("id") or ""
    amount_paise = int(entity.get("amount") or 0)

    print(f"[ECHO-WEBHOOK] event={event_name} order={order_id} payment={payment_id}")

    # Accept both payment.captured (final) and payment.authorized (pre-capture).
    # Some Razorpay integrations fire authorized first; we finalize on either
    # so the registration doesn't go stale while waiting for a second webhook.
    if event_name not in ("payment.captured", "payment.authorized"):
        return {"received": True, "processed": False, "reason": "ignored_event"}

    if not order_id:
        print("[ECHO-WEBHOOK] payment.captured without order_id")
        return {"received": True, "processed": False, "reason": "missing_order_id"}

    # The order id is stored on the pending registration's payment_order.
    reg = await db.echo_registrations.find_one({"payment_order.order_id": order_id})
    if not reg:
        # Also try receipt fallback (Razorpay puts our reg_id in receipt).
        # Search BOTH pending AND failed — the sweep job may have already
        # marked the registration "failed" before the webhook arrived.
        for r in await db.echo_registrations.find({
            "payment.status": {"$in": ["pending", "failed"]}
        }).to_list(500):
            if r.get("id") == order_id or (r.get("payment_order") or {}).get("order_id") == order_id:
                reg = r
                break
    if not reg:
        print(f"[ECHO-WEBHOOK] No pending registration for order {order_id}")
        return {"received": True, "processed": False, "reason": "no_registration"}

    expected_amount = int(float(reg.get("fee") or 0) * 100)
    if expected_amount and amount_paise != expected_amount:
        print(f"[ECHO-WEBHOOK] Amount mismatch: expected {expected_amount} got {amount_paise} for order {order_id}")
        return {"received": True, "processed": False, "reason": "amount_mismatch"}

    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug")))
    finalized = await _finalize_paid_registration(db, reg, showcase, payment_id)
    print(f"[ECHO-WEBHOOK] Finalized registration {reg.get('id')} (payment {payment_id})")
    return {"received": True, "processed": True, "registration_id": reg.get("id")}


# ── Invoices ─────────────────────────────────────────────────────────────────
@router.get("/my-invoices")
async def my_invoices(request: Request):
    """Return the current user's invoices (dashboard → My Tickets)."""
    db = _get_db(request)
    user = await _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    email = (user.get("email") or "").strip().lower()
    query = {"$or": [{"user_id": str(user["_id"])}]}
    if email:
        query = {"$or": [{"user_id": str(user["_id"])}, {"email": email}]}
    docs = await db.invoices.find(query).sort("created_at", -1).limit(100).to_list(100)
    return {"items": [_ser(d) for d in docs]}


@router.get("/my-registrations")
async def my_registrations(request: Request):
    """Return all of the user's Echo registrations with coupons and ticket info.

    Used by MyTicketsView to show a unified list of event registrations,
    passes, coupons, and invoices in one place.
    """
    db = _get_db(request)
    user = await _resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    email = (user.get("email") or "").strip().lower()
    uid = str(user["_id"])

    # Find all registrations for this user — match user_key too because paid
    # registrations can have user_id rewritten to a provisioned SA account.
    query = {"$or": [{"user_id": uid}, {"user_key": uid}]}
    if email:
        query = {"$or": [{"user_id": uid}, {"user_key": uid}, {"email": email}]}
    regs = await db.echo_registrations.find(query).sort("created_at", -1).to_list(100)

    results = []
    for reg in regs:
        reg_ser = _ser(reg)
        slug = reg.get("slug", "")

        # Fetch coupons for this registration
        coupons = []
        try:
            raw_coupons = await db.echo_coupons.find({"slug": slug, "reg_id": reg.get("id")}).to_list(100)
            for c in raw_coupons:
                c["_id"] = str(c["_id"])
                c["qr_url"] = f"/api/echo/scan/{c.get('coupon_code', '')}"
                coupons.append({k: v for k, v in c.items() if k != "_id"})
        except Exception:
            pass

        # Fetch invoice
        invoice = None
        try:
            inv = await db.invoices.find_one({"reg_id": reg.get("id")})
            if inv:
                invoice = _ser(inv)
        except Exception:
            pass

        results.append({
            "registration": reg_ser,
            "coupons": coupons,
            "invoice": invoice,
        })

    return {"items": results}


@router.get("/invoices/{invoice_no}")
async def get_invoice(invoice_no: str, request: Request, email: Optional[str] = Query(None)):
    """Fetch a single invoice (user-owned, email-match, or admin). Returns render-ready HTML."""
    db = _get_db(request)
    inv = await db.invoices.find_one({"invoice_no": invoice_no})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv_ser = _ser(inv)
    # Authorization: owner, matching email, or admin
    user = await _resolve_user(request, db)
    is_admin = False
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            await _require_admin(request)
            is_admin = True
        except HTTPException:
            is_admin = False
    if not is_admin:
        allowed_email = (inv.get("email") or "").strip().lower()
        owner_match = user is not None and (
            str(user["_id"]) == inv.get("user_id")
            or (user.get("email") or "").strip().lower() == allowed_email
        )
        # Also allow access if email query param matches (guest registrations)
        email_match = email and email.strip().lower() == allowed_email
        if not owner_match and not email_match:
            raise HTTPException(status_code=403, detail="You do not have access to this invoice")
    inv_ser["html"] = _build_invoice_html(inv_ser)
    return inv_ser


@router.get("/tickets/{reg_id}")
async def get_ticket(reg_id: str, request: Request, email: Optional[str] = Query(None), format: Optional[str] = Query(None)):
    """Fetch an attendee's entry pass (ticket) with QR — owner, email-match, or admin.

    Returns render-ready standalone HTML so the app can open a printable page,
    download it as PDF, or share the link as proof of purchase / entry pass.

    SECURITY: a paid event NEVER issues a pass until payment is confirmed. For a
    paid event with payment.status other than 'paid' (pending / failed / expired)
    this returns 402/403 — no ticket, pass, QR, or confirmation is generated so
    unpaid attendees cannot obtain an entry pass.
    """
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Ticket not found")
    reg_ser = _ser(reg)
    showcase = await db.echo_showcases.find_one({"slug": reg.get("slug")})

    # Payment gate: free events (fee <= 0 registered) are pass-eligible; paid
    # events only after the payment is verified (payment.status == "paid").
    fee = float(reg.get("fee") or 0)
    payment = reg.get("payment") or {}
    reg_status = reg.get("status") or "pending"
    is_free = fee <= 0 and payment.get("status") == "paid" and reg_status == "registered"
    is_paid = payment.get("status") == "paid" and reg_status == "registered"
    pass_eligible = is_free or is_paid
    if not pass_eligible:
        pending = payment.get("status") == "pending"
        raise HTTPException(
            status_code=402 if pending else 403,
            detail=(
                "Payment pending — complete your payment to receive your entry pass."
                if pending else
                "Payment required for this event. Your entry pass is issued only after payment is confirmed."
            ),
        )

    # Authorization: owner, matching email, or admin
    user = await _resolve_user(request, db)
    is_admin = False
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            await _require_admin(request)
            is_admin = True
        except HTTPException:
            is_admin = False
    if not is_admin:
        allowed_email = (reg.get("email") or "").strip().lower()
        allowed_emails = {allowed_email} if allowed_email else set()
        
        team_members = reg.get("team_members", [])
        if isinstance(team_members, list):
            for m in team_members:
                if isinstance(m, dict) and m.get("email"):
                    allowed_emails.add(m.get("email").strip().lower())
                    
        user_email = (user.get("email") or "").strip().lower() if user else ""
        owner_match = user is not None and (
            str(user["_id"]) == reg.get("user_id")
            or user_email in allowed_emails
        )
        # Also allow access if email query param matches (guest registrations)
        email_match = email and email.strip().lower() in allowed_emails
        if not owner_match and not email_match:
            raise HTTPException(status_code=403, detail="You do not have access to this ticket")
    
    html_content = _build_ticket_html(reg_ser, showcase or {}, reg.get("ticket_template"))
    if format == "json":
        return {
            "reg_id": reg_id,
            "status": reg.get("status"),
            "event_title": reg.get("showcase_title") or (showcase or {}).get("title"),
            "html": html_content,
        }
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)


@router.get("/tickets/preview/{template_id}")
async def preview_ticket(template_id: str, request: Request):
    """Render a sample ticket with mock data for the template picker. No auth required (mock data only)."""
    """Render a sample ticket with mock data for the superadmin template picker.

    Returns standalone HTML so the frontend can open it in a new tab for preview.
    Requires admin authentication.
    """
    from core.security import generate_qr_code
    sample_reg = {
        "id": "PREVIEW-001",
        "full_name": "Aarav Sharma",
        "email": "aarav@example.com",
        "phone": "+91 98765 43210",
        "branch": "Computer Science",
        "year": "3rd Year",
        "college": "VNR VJIET",
        "showcase_title": "ECHO Tech Summit 2026",
        "qr_code_base64": generate_qr_code("ECHO:preview|sample|PREVIEW-001"),
    }
    sample_showcase = {
        "title": "ECHO Tech Summit 2026",
        "date": "August 15, 2026",
        "time": "10:00 AM - 4:30 PM",
        "venue": "Main Auditorium, VNR VJIET",
        "organizer_name": "Student Alumni Cell",
        "sponsors": [
            {"name": "TechCorp", "logo_url": "https://via.placeholder.com/90x28/7C3AED/fff?text=TechCorp", "tier": "Title Sponsor"},
            {"name": "InnoLab", "logo_url": "https://via.placeholder.com/90x28/6366f1/fff?text=InnoLab", "tier": "Gold Sponsor"},
            {"name": "StartupXYZ", "logo_url": "", "tier": "Silver"},
        ],
        "registration": {"ticket_template": template_id},
    }
    if template_id not in TICKET_TEMPLATES:
        template_id = DEFAULT_TICKET_TEMPLATE
    return {
        "html": _build_ticket_html(sample_reg, sample_showcase, template_id),
        "template_id": template_id,
    }


# ── Admin: registrations + revenue ───────────────────────────────────────────
@router.get("/admin/registrations")
async def admin_echo_registrations(
    request: Request,
    slug: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(500, ge=1, le=2000),
    _=Depends(_require_admin),
):
    """List ECHO registrations with attendee + payment details for super-admin."""
    db = _get_db(request)
    query: Dict[str, Any] = {}
    if slug:
        query["slug"] = slug
    if status:
        query["payment.status"] = status
    if search:
        rx = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [
            {"full_name": rx},
            {"email": rx},
            {"phone": rx},
            {"college": rx},
            {"team_name": rx},
            {"id": rx},
        ]
    cur = db.echo_registrations.find(query).sort("created_at", -1).limit(limit)
    regs = await cur.to_list(limit)
    reg_ids = [r.get("id") for r in regs if r.get("id")]

    # Batch-fetch issued artifacts (coupons + invoices) for the visible page so
    # we can tell admins exactly what was issued per attendee.
    coupons_map: Dict[str, list] = {}
    invoice_map: Dict[str, dict] = {}
    if reg_ids:
        for c in await db.echo_coupons.find({"reg_id": {"$in": reg_ids}}).to_list(5000):
            coupons_map.setdefault(c.get("reg_id"), []).append({
                "session_key": c.get("session_key"),
                "session_name": c.get("session_name"),
                "session_day": c.get("session_day") or 1,
                "coupon_code": c.get("coupon_code"),
                "used": bool(c.get("used")),
            })
        for inv in await db.invoices.find({"reg_id": {"$in": reg_ids}}).to_list(2000):
            invoice_map[inv.get("reg_id")] = {"invoice_no": inv.get("invoice_no"), "issued": True}

    items = []
    for r in regs:
        s = _ser(r)
        payment = s.get("payment") or {}
        paid = payment.get("status") == "paid" and s.get("status") == "registered"
        rid = str(s.get("id") or "")
        inv_rec = invoice_map.get(rid) or {}
        items.append({
            "id": s.get("id"),
            "slug": s.get("slug"),
            "event_title": s.get("showcase_title"),
            "full_name": s.get("full_name"),
            "email": s.get("email"),
            "phone": s.get("phone"),
            "branch": s.get("branch"),
            "year": s.get("year"),
            "college": s.get("college"),
            "fee": s.get("fee"),
            "currency": s.get("currency"),
            "payment_status": payment.get("status"),
            "payment_id": payment.get("payment_id"),
            "gateway": payment.get("gateway"),
            "method": payment.get("method"),
            "paid_at": payment.get("paid_at"),
            "registered_at": s.get("registered_at"),
            "user_id": s.get("user_id"),
            "has_account": bool(s.get("user_id")),
            "failed_at": payment.get("failed_at"),
            "failed_reason": payment.get("failed_reason"),
            "reminder_sent_at": s.get("payment_reminder_sent_at"),
            "checked_in_at": s.get("checked_in_at"),
            "ticket_issued": paid and bool(s.get("qr_code_base64")),
            "coupons": coupons_map.get(rid) or [],
            "coupons_issued": len(coupons_map.get(rid) or []),
            "invoice_issued": bool(inv_rec.get("issued")),
            "registration_type": s.get("registration_type") or "individual",
            "team_name": s.get("team_name"),
            "team_size": s.get("team_size") or 1,
            "team_members": s.get("team_members") or [],
            "is_team_member": bool(s.get("is_team_member")),
            "parent_reg_id": s.get("parent_reg_id"),
            "team_leader_name": s.get("team_leader_name"),
            "team_leader_email": s.get("team_leader_email"),
        })
    return {"items": items, "total": len(items)}


@router.get("/admin/export-csv")
@router.get("/export-csv")
async def export_echo_registrations_csv(
    request: Request,
    slug: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Generate and stream CSV of student event & hackathon registrations (Hackwave 3.0 / ECHO 2026).
    Includes name, email, phone, campus, payment status (paid/unpaid), fee, team or individual details.
    """
    import csv
    import io
    from fastapi.responses import Response

    db = _get_db(request)
    query: Dict[str, Any] = {}
    if slug:
        query["slug"] = slug
    if status:
        query["payment.status"] = status

    docs = await db.echo_registrations.find(query).sort("created_at", -1).to_list(5000)

    output = io.StringIO()
    headers = [
        "Registration ID",
        "Event Title",
        "Event Slug",
        "Full Name",
        "Email",
        "Phone Number",
        "Campus / College",
        "Branch",
        "Year",
        "Registration Type",
        "Team Name",
        "Is Team Member",
        "Team Leader Name",
        "Team Leader Email",
        "Payment Status",
        "Payment Category",
        "Fee Amount (INR)",
        "Payment Gateway",
        "Payment ID",
        "Paid At",
        "Registration Date"
    ]
    
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()

    for d in docs:
        pay_info = d.get('payment') or {}
        raw_status = (pay_info.get('status') or d.get('payment_status') or 'unpaid').lower()
        fee = float(d.get('fee') or pay_info.get('amount') or 0.0)

        if raw_status == 'paid':
            payment_status = 'PAID'
            paid_category = 'Paid (Free)' if fee == 0 else 'Paid'
        elif raw_status == 'failed':
            payment_status = 'FAILED'
            paid_category = 'Failed / Unpaid'
        elif raw_status == 'pending':
            payment_status = 'PENDING'
            paid_category = 'Unpaid (Pending)'
        else:
            payment_status = 'UNPAID'
            paid_category = 'Unpaid'

        reg_type = d.get('registration_type') or ('Team' if d.get('team_name') or d.get('is_team_member') else 'Individual')

        writer.writerow({
            "Registration ID": d.get('id') or str(d.get('_id')),
            "Event Title": d.get('showcase_title') or d.get('event_title') or d.get('slug') or '',
            "Event Slug": d.get('slug') or '',
            "Full Name": d.get('full_name') or '',
            "Email": d.get('email') or d.get('user_key') or '',
            "Phone Number": d.get('phone') or '',
            "Campus / College": d.get('college') or d.get('showcase_college') or '',
            "Branch": d.get('branch') or '',
            "Year": d.get('year') or '',
            "Registration Type": str(reg_type).title(),
            "Team Name": d.get('team_name') or '',
            "Is Team Member": 'Yes' if d.get('is_team_member') else 'No',
            "Team Leader Name": d.get('team_leader_name') or '',
            "Team Leader Email": d.get('team_leader_email') or '',
            "Payment Status": payment_status,
            "Payment Category": paid_category,
            "Fee Amount (INR)": fee,
            "Payment Gateway": pay_info.get('gateway') or '',
            "Payment ID": pay_info.get('payment_id') or '',
            "Paid At": pay_info.get('paid_at') or '',
            "Registration Date": d.get('registered_at') or d.get('created_at') or ''
        })

    csv_data = output.getvalue()
    filename = f"hackwave_registrations_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



@router.post("/admin/registrations/sync-teams")
async def admin_sync_teams(request: Request, _=Depends(_require_admin)):
    """Super-admin: backfill/sync all team registrations to ensure every team member has an SA account, entry pass, and confirmation email."""
    db = _get_db(request)
    team_regs = await db.echo_registrations.find({
        "registration_type": "team",
        "team_members": {"$exists": True, "$ne": []},
        "$or": [{"payment.status": "paid"}, {"fee": 0, "status": "registered"}]
    }).to_list(1000)
    
    total_synced = 0
    synced_details = []
    
    for parent_reg in team_regs:
        showcase = await db.echo_showcases.find_one(_slug_query(parent_reg.get("slug") or ""))
        fulfilled = await _fulfill_team_members(db, parent_reg, showcase)
        total_synced += len(fulfilled)
        synced_details.append({
            "team_name": parent_reg.get("team_name"),
            "parent_id": parent_reg.get("id"),
            "lead_email": parent_reg.get("email"),
            "members_synced": len(fulfilled),
            "members": [m.get("email") for m in fulfilled]
        })
        
    return {
        "ok": True,
        "teams_processed": len(team_regs),
        "total_members_synced": total_synced,
        "details": synced_details
    }


@router.post("/admin/registrations/{reg_id}/resend-account-tickets")
async def admin_resend_account_tickets(reg_id: str, request: Request, _=Depends(_require_admin)):
    """Super-admin: re-issue entry passes, provision SA accounts, and re-send credentials and confirmation emails for a registration (primary registrant and all team members)."""
    db = _get_db(request)
    from bson import ObjectId
    q: Dict[str, Any] = {"id": reg_id}
    if ObjectId.is_valid(reg_id):
        q = {"$or": [{"id": reg_id}, {"_id": ObjectId(reg_id)}]}
    
    reg = await db.echo_registrations.find_one(q)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))
    reg_ser = _ser(reg)
    canonical_slug = reg.get("slug") or (showcase or {}).get("slug")
    sessions = (showcase or {}).get("sessions") or []

    # 1. Primary registrant account & ticket
    sa_user, created, temp_password = await _provision_sa_account(db, reg_ser, showcase)
    if sa_user:
        await _mirror_to_event_registration(db, reg_ser, showcase, sa_user)
        if temp_password:
            await _send_sa_welcome_email(reg_ser, showcase, temp_password)
    
    # Ensure QR code is generated
    frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
    if not reg.get("qr_code_base64"):
        qr_b64 = generate_qr_code(f"{frontend_url}/echo/scan/{reg.get('id')}")
        await db.echo_registrations.update_one({"_id": reg["_id"]}, {"$set": {"qr_code_base64": qr_b64}})
        reg_ser["qr_code_base64"] = qr_b64

    # Generate session coupons if missing
    coupon_list = []
    if sessions and canonical_slug and reg.get("id"):
        coupon_list = await _generate_coupons_for_registration(db, str(canonical_slug), str(reg.get("id")), sessions)

    # Re-send confirmation and invoice email
    await _send_registration_confirmation(db, reg_ser, showcase or {}, reg.get("team_name") if reg.get("registration_type") == "team" else None)
    try:
        await _send_wa_confirmation(db, reg_ser, showcase or {}, coupon_list)
    except Exception as _wa_e:
        print(f"[ECHO] Resend WA notice error: {_wa_e}")
        
    try:
        await _store_invoice_and_email(db, reg_ser, showcase, coupons=coupon_list)
    except Exception as _inv_e:
        print(f"[ECHO] Resend invoice error: {_inv_e}")

    # 2. Team members fulfillment if team registration
    fulfilled = []
    if reg.get("registration_type") == "team" and reg.get("team_members"):
        fulfilled = await _fulfill_team_members(db, reg_ser, showcase)

    return {
        "ok": True,
        "message": f"Successfully re-issued entry passes and sent accounts for {reg_ser.get('full_name')} and {len(fulfilled)} team members.",
        "primary_email": reg_ser.get("email"),
        "team_members_fulfilled": len(fulfilled),
        "team_members": [m.get("email") for m in fulfilled],
    }


class EchoBroadcastSchema(BaseModel):
    slug: Optional[str] = None
    target_group: str  # "pending_unpaid" | "confirmed_paid" | "unregistered_students"
    subject: Optional[str] = None
    custom_message: Optional[str] = None


@router.get("/admin/broadcast/audience-summary")
async def admin_broadcast_audience_summary(
    request: Request,
    slug: Optional[str] = None,
    _=Depends(_require_admin)
):
    """Return counts for target audience segments: pending/unpaid registrants, confirmed/paid attendees, and platform students not yet registered."""
    db = _get_db(request)
    slug_q = {"slug": slug} if slug and slug != "all" else {}

    # 1. Pending / Unpaid registrations
    pending_count = await db.echo_registrations.count_documents({
        **slug_q,
        "$or": [
            {"payment.status": "pending"},
            {"status": "pending"},
            {"payment.status": "failed"},
        ]
    })

    # 2. Confirmed / Paid attendees
    confirmed_count = await db.echo_registrations.count_documents({
        **slug_q,
        "$or": [
            {"payment.status": "paid"},
            {"status": "registered"},
            {"fee": 0, "status": "registered"}
        ]
    })

    # 3. Platform students not yet registered for this event
    registered_emails = await db.echo_registrations.distinct("email", slug_q)
    registered_emails_set = {e.lower() for e in registered_emails if e}

    all_students_count = await db.users.count_documents({"role": "student"})
    unregistered_count = max(0, all_students_count - len(registered_emails_set))

    return {
        "ok": True,
        "slug": slug or "all",
        "pending_unpaid": pending_count,
        "confirmed_paid": confirmed_count,
        "unregistered_students": unregistered_count,
        "total_platform_students": all_students_count,
    }


@router.post("/admin/broadcast/send")
async def admin_broadcast_send(
    payload: EchoBroadcastSchema,
    request: Request,
    _=Depends(_require_admin)
):
    """Broadcast notifications/newsletters to targeted audience segments with customizable message."""
    db = _get_db(request)
    slug = payload.slug
    target = payload.target_group
    custom_msg = payload.custom_message or ""
    
    showcase = None
    if slug and slug != "all":
        showcase = await db.echo_showcases.find_one(_slug_query(slug))
    if not showcase:
        showcase = await db.echo_showcases.find_one({"status": "published"}) or {}

    title = showcase.get("title") or "SNIST HackWave 3.0"
    event_date = showcase.get("date") or "September 04, 2026"
    venue = showcase.get("venue") or "Campus Auditorium"
    frontend_url = (os.environ.get("FRONTEND_URL") or "https://studentalumni.ai").strip().rstrip("/")
    event_slug = showcase.get("slug") or "snist"
    reg_url = f"{frontend_url}/echo/{event_slug}/register"

    attachments = []
    pdf_file = Path(__file__).parent / "static" / "HackWave_3.0_Event_Handbook.pdf"
    if pdf_file.exists():
        try:
            attachments.append({
                "filename": "HackWave_3.0_Event_Handbook.pdf",
                "content": pdf_file.read_bytes(),
            })
        except Exception:
            pass

    sent_count = 0
    failed_count = 0

    if target == "pending_unpaid":
        slug_q = {"slug": slug} if slug and slug != "all" else {}
        regs = await db.echo_registrations.find({
            **slug_q,
            "$or": [
                {"payment.status": "pending"},
                {"status": "pending"},
                {"payment.status": "failed"},
            ]
        }).to_list(2000)

        subject = payload.subject or f"Action Required: Complete Your Registration & Pass for {title}"

        for r in regs:
            email = (r.get("email") or "").strip()
            if not email:
                continue
            name = r.get("full_name") or "Student"
            is_team = r.get("registration_type") == "team"
            team_info = f"<p style='color:#7C3AED;font-weight:700;'>Team: {r.get('team_name')}</p>" if is_team and r.get("team_name") else ""
            
            body = render_html_email(
                f"""
                <h2 style="margin:0 0 14px 0;color:#111827;">Complete your registration for {title}</h2>
                <p style="margin:0 0 16px 0;color:#374151;">
                  Hi <strong>{name}</strong>,<br/><br/>
                  You have a registered Student Alumni account, but your registration pass for <strong>{title}</strong> has <strong>not yet been confirmed</strong>.
                </p>
                {team_info}
                {f'<div style="padding:14px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;margin-bottom:18px;color:#4c1d95;font-size:13.5px;">{custom_msg}</div>' if custom_msg else ''}

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;">Event</td>
                      <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{title}</td></tr>
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;">Date &amp; Venue</td>
                      <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:600;">{event_date} · {venue}</td></tr>
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;">Pass Status</td>
                      <td style="padding:12px 16px;text-align:right;color:#DC2626;font-weight:700;">Payment Pending / Incomplete</td></tr>
                </table>

                <div style="margin:20px 0;">
                  <a href="{reg_url}"
                     style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Complete Payment &amp; Claim Entry Pass</a>
                </div>

                <div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <h4 style="margin:0 0 6px 0;color:#334155;font-size:13.5px;">Official Event Handbook Attached</h4>
                  <p style="margin:0;color:#64748b;font-size:12px;">
                    Read about 5 hackathon tracks, prize pool, food coupons, and rules in the attached <strong>HackWave_3.0_Event_Handbook.pdf</strong>.
                  </p>
                </div>
                """
            )
            try:
                await send_email(email, subject, body, attachments=attachments)
                sent_count += 1
                await db.echo_registrations.update_one({"_id": r["_id"]}, {"$set": {"payment_reminder_sent_at": _now()}})
            except Exception as _err:
                failed_count += 1
                print(f"[ECHO-BROADCAST] Failed to send unpaid reminder to {email}: {_err}")

    elif target == "confirmed_paid":
        slug_q = {"slug": slug} if slug and slug != "all" else {}
        regs = await db.echo_registrations.find({
            **slug_q,
            "$or": [
                {"payment.status": "paid"},
                {"status": "registered"},
                {"fee": 0, "status": "registered"}
            ]
        }).to_list(3000)

        subject = payload.subject or f"Important Event Notice & Schedule Updates — {title}"

        for r in regs:
            email = (r.get("email") or "").strip()
            if not email:
                continue
            name = r.get("full_name") or "Attendee"
            reg_id = r.get("id") or ""
            import urllib.parse
            ticket_url = f"{frontend_url}/api/echo/tickets/{reg_id}?email={urllib.parse.quote(email)}"

            body = render_html_email(
                f"""
                <h2 style="margin:0 0 14px 0;color:#111827;">Official Event Notice &amp; Schedule</h2>
                <p style="margin:0 0 16px 0;color:#374151;">
                  Hi <strong>{name}</strong>,<br/><br/>
                  Here is an official announcement and update regarding <strong>{title}</strong>.
                </p>
                {f'<div style="padding:16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;margin-bottom:18px;color:#4c1d95;font-size:14px;line-height:1.5;">{custom_msg}</div>' if custom_msg else ''}

                <div style="margin:16px 0;padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
                  <h4 style="margin:0 0 6px 0;color:#065f46;font-size:14px;">✓ Your Ticket &amp; Entry Pass is Active</h4>
                  <p style="margin:0 0 10px 0;color:#047857;font-size:12.5px;">Registration ID: <strong>{reg_id}</strong></p>
                  <a href="{ticket_url}" style="display:inline-block;padding:8px 18px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:12.5px;">View Entry Pass &amp; QR</a>
                </div>

                <div style="margin:18px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <h4 style="margin:0 0 6px 0;color:#334155;font-size:13.5px;">Official Event Handbook Attached</h4>
                  <p style="margin:0;color:#64748b;font-size:12px;">
                    Find track guidelines, schedule, venue map, and meal timings in the attached PDF.
                  </p>
                </div>
                """
            )
            try:
                await send_email(email, subject, body, attachments=attachments)
                sent_count += 1
            except Exception as _err:
                failed_count += 1
                print(f"[ECHO-BROADCAST] Failed to send notice to {email}: {_err}")

    elif target == "unregistered_students":
        slug_q = {"slug": slug} if slug and slug != "all" else {}
        registered_emails = await db.echo_registrations.distinct("email", slug_q)
        registered_set = {e.lower() for e in registered_emails if e}

        students = await db.users.find({"role": "student"}).to_list(5000)
        subject = payload.subject or f"🚀 Invitation to {title} — Register Your Team Now!"

        for u in students:
            email = (u.get("email") or "").strip().lower()
            if not email or email in registered_set:
                continue
            name = u.get("full_name") or "Student"

            body = render_html_email(
                f"""
                <h2 style="margin:0 0 14px 0;color:#111827;">You're invited to {title}!</h2>
                <p style="margin:0 0 16px 0;color:#374151;">
                  Hi <strong>{name}</strong>,<br/><br/>
                  StudentAlumni is thrilled to invite you to participate in <strong>{title}</strong>.
                </p>
                {f'<div style="padding:16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;margin-bottom:18px;color:#4c1d95;font-size:14px;">{custom_msg}</div>' if custom_msg else ''}

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;">Event</td>
                      <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{title}</td></tr>
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;">Date &amp; Venue</td>
                      <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:600;">{event_date} · {venue}</td></tr>
                </table>

                <div style="margin:20px 0;">
                  <a href="{reg_url}"
                     style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Register Now (Individual / Team Pass)</a>
                </div>
                """
            )
            try:
                await send_email(email, subject, body, attachments=attachments)
                sent_count += 1
            except Exception as _err:
                failed_count += 1
                print(f"[ECHO-BROADCAST] Failed to send invite to {email}: {_err}")

    return {
        "ok": True,
        "target_group": target,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "message": f"Successfully broadcasted to {sent_count} recipient(s)."
    }


@router.post("/admin/registrations/{reg_id}/remind")
async def admin_send_payment_reminder(reg_id: str, request: Request, _=Depends(_require_admin)):
    """Super-admin: email the attendee a payment reminder for a pending registration."""
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    payment = reg.get("payment") or {}
    if payment.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Payment reminder only applies to pending payments")
    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))
    await db.echo_registrations.update_one(
        {"_id": reg["_id"]}, {"$set": {"payment_reminder_sent_at": _now()}}
    )
    await _send_payment_reminder_email(db, reg, showcase)
    return {"ok": True, "message": "Payment reminder emailed", "reminder_sent_at": _now()}


@router.post("/admin/registrations/{reg_id}/mark-failed")
async def admin_mark_registration_failed(reg_id: str, request: Request, _=Depends(_require_admin)):
    """Super-admin: manually mark a pending registration as failed (payment not completed).

    No SA account, ticket, pass, QR or invoice is ever generated for a failed
    registration. The attendee is emailed that payment was not completed.
    """
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    payment = reg.get("payment") or {}
    if payment.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending registrations can be marked failed")
    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))
    now_iso = _now()
    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": {
            "payment.status": "failed",
            "payment.failed_at": now_iso,
            "payment.failed_reason": "marked failed by admin (payment not completed)",
            "status": "failed",
        }},
    )
    await _send_payment_failed_email(db, {**reg, "payment": {**payment, "status": "failed"}}, showcase,
                                     reason="was not completed (your payment session has expired)")
    return {"ok": True, "message": "Registration marked as failed", "failed_at": now_iso}


class AdminMarkPaidSchema(BaseModel):
    payment_id: Optional[str] = None  # Razorpay payment id if known, else auto-generated
    reason: Optional[str] = None      # admin note for audit trail


@router.post("/admin/registrations/{reg_id}/mark-paid")
async def admin_mark_registration_paid(reg_id: str, payload: AdminMarkPaidSchema, request: Request, _=Depends(_require_admin)):
    """Super-admin: manually mark a failed/pending registration as paid.

    Use when Razorpay captured the payment but the webhook/verify-payment
    path missed it (e.g. webhook secret misconfigured, session expired
    before verify was called, or Razorpay dashboard shows the payment
    succeeded).  The registration is fully fulfilled: QR ticket, invoice,
    SA account provisioning, and confirmation emails are all issued.
    """
    db = _get_db(request)
    from bson import ObjectId
    q: Dict[str, Any] = {"id": reg_id}
    if ObjectId.is_valid(reg_id):
        q = {"$or": [{"id": reg_id}, {"_id": ObjectId(reg_id)}]}
    reg = await db.echo_registrations.find_one(q)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    payment = reg.get("payment") or {}
    if payment.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Registration is already marked as paid")

    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))

    # Use the provided payment_id or generate a marker so downstream
    # logic (invoice, QR) has something to record.
    payment_id = (payload.payment_id or "").strip() or f"ADMIN_PAY_{secrets.token_hex(8).upper()}"

    finalized = await _finalize_paid_registration(db, reg, showcase, payment_id)
    if not finalized:
        raise HTTPException(status_code=500, detail="Failed to finalize registration")

    # Append an admin note so the override is traceable.
    note = (payload.reason or "Payment confirmed manually by admin").strip()
    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": {"admin_payment_note": note, "admin_payment_at": _now()}},
    )

    return {"ok": True, "message": "Registration marked as paid", "payment_id": payment_id}


# ── Ticket verification / check-in (venue staff) ─────────────────────────────
class AdminUpdateTeamSchema(BaseModel):
    team_members: List[dict] = []
    team_name: Optional[str] = None

class TicketVerifySchema(BaseModel):
    ticket: str  # raw QR scan payload or a bare registration id


def _parse_ticket(ticket: str) -> dict:
    """Parse a QR payload into its components.

    Accepts:
    - the full 'ECHO:<slug>|<user_key>|<reg_id>' payload (as encoded in older
      registration QRs),
    - a bare registration id,
    - a URL-wrapped payload, e.g. 'https://host/echo/scan/<reg_id>' or
      'https://host/echo/scan/ECHO%3A<slug>%7C<user_key>%7C<reg_id>'.
    Returns {slug, user_key, reg_id}.
    """
    from urllib.parse import unquote
    t = (ticket or "").strip()
    if not t:
        return {}
    # Strip URL wrapper and any path prefix up to the payload.
    if t.startswith("http://") or t.startswith("https://"):
        t = t.split("/echo/scan/", 1)[-1]
    t = unquote(t)
    if t.startswith("ECHO:"):
        parts = t.split("|")
        if len(parts) >= 3:
            return {"slug": parts[0][5:], "user_key": parts[1], "reg_id": parts[2]}
        return {}
    return {"reg_id": t}



@router.put("/admin/registrations/{reg_id}/team")
async def admin_update_team_members(reg_id: str, request: Request, payload: AdminUpdateTeamSchema, _=Depends(_require_admin)):
    """Super-admin: update the team members for a registration and provision their SA accounts."""
    db = _get_db(request)

    team_members = payload.team_members
    team_name = payload.team_name
    
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(404, "Registration not found")
        
    update_data = {}
    update_data["team_members"] = team_members
    if team_name is not None:
        update_data["team_name"] = team_name
        
    await db.echo_registrations.update_one(
        {"id": reg_id},
        {"$set": update_data}
    )

    
    # After saving, let's provision SA accounts for any members that have an email.
    showcase = await db.echo_showcases.find_one({"slug": reg.get("slug")})
    
    for idx, member in enumerate(team_members):
        member_email = (member.get("email") or "").strip().lower()
        if not member_email:
            continue
            
        member_reg = dict(reg)
        member_reg["email"] = member_email
        member_reg["full_name"] = member.get("name", "")
        member_reg["phone"] = member.get("phone", "")
        member_reg["id"] = f"{reg_id}_m{idx + 1}"  # Unique ID for team member
        
        member_sa_user, member_created, member_password = await _provision_sa_account(db, member_reg, showcase)
        if member_sa_user:
            await _mirror_to_event_registration(db, member_reg, showcase, member_sa_user)
        if member_created and member_password:
            await _send_sa_welcome_email(member_reg, showcase, member_password)
            
        # Optional: Send them their own team member confirmation email too?
        # await _send_team_member_confirmation(db, member_reg, showcase, reg, reg.get("team_name", ""))

    return {"ok": True, "message": "Team members updated successfully"}


@router.post("/admin/registrations/{reg_id}/resend-tickets")
async def admin_resend_tickets(reg_id: str, request: Request, _=Depends(_require_admin)):
    """Super-admin: resend tickets and coupons for a paid registration."""
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(404, "Registration not found")
    
    if reg.get("payment", {}).get("status") != "paid":
        raise HTTPException(400, "Cannot resend tickets for an unpaid registration")
        
    showcase = await db.echo_showcases.find_one({"slug": reg.get("slug")})
    
    # Re-fetch coupons
    coupons = await db.echo_coupons.find({"reg_id": reg_id}).to_list(100)
    
    # 1. Resend email
    await _store_invoice_and_email(db, reg, showcase, coupons)
    
    # 2. Resend WhatsApp
    if reg.get("phone"):
        # We need the PDF attachments
        inv = await db.invoices.find_one({"reg_id": reg_id})
        attachments = []
        if inv:
            inv_ser = _ser(inv)
            inv_no = inv_ser.get("invoice_no") or "invoice"
            invoice_html = _build_invoice_html(inv_ser)
            invoice_pdf = await generate_pdf_from_html(invoice_html)
            if invoice_pdf:
                attachments.append({"filename": f"Invoice-{inv_no}.pdf", "content": invoice_pdf})
            
            receipt_html = _build_receipt_html(inv_ser)
            receipt_pdf = await generate_pdf_from_html(receipt_html)
            if receipt_pdf:
                raw_pid = str(inv_ser.get("payment_id") or "").replace("pay_", "").replace("PAY_", "")
                rno = f"{raw_pid[:4]}-{raw_pid[-4:]}" if len(raw_pid) >= 8 else raw_pid
                attachments.append({"filename": f"Receipt-{rno}.pdf", "content": receipt_pdf})
                
            ticket_html = _build_ticket_html(_ser(reg), showcase or {})
            ticket_pdf = await generate_pdf_from_html(ticket_html)
            if ticket_pdf:
                attachments.append({"filename": f"EntryPass-{reg_id}.pdf", "content": ticket_pdf})
                
        await _send_wa_paid_package(db, reg, showcase or {}, attachments, coupons)

    return {"ok": True, "message": "Tickets and coupons resent successfully"}

@router.post("/admin/registrations/verify")
async def verify_ticket(payload: TicketVerifySchema, request: Request, _=Depends(_require_admin)):
    """Verify an attendee ticket by QR payload (or registration id).

    Returns attendee details + payment/check-in status without mutating anything,
    so venue staff can confirm a ticket is valid before scanning someone in.
    """
    db = _get_db(request)
    parsed = _parse_ticket(payload.ticket)
    if not parsed:
        raise HTTPException(status_code=400, detail="Invalid ticket code")

    query: Dict[str, Any] = {}
    if parsed.get("slug"):
        query["slug"] = parsed["slug"]
    if parsed.get("reg_id"):
        query["id"] = parsed["reg_id"]

    reg = await db.echo_registrations.find_one(query)
    if not reg:
        # Fallback: raw registration id
        reg = await db.echo_registrations.find_one({"id": parsed.get("reg_id")})
    if not reg:
        raise HTTPException(status_code=404, detail="Ticket not found")

    payment = reg.get("payment") or {}
    ser = _ser(reg)
    verified = payment.get("status") == "paid" and reg.get("status") == "registered"
    checked_in = bool(reg.get("checked_in_at"))

    return {
        "valid": verified,
        "checked_in": checked_in,
        "checked_in_at": ser.get("checked_in_at"),
        "registration": {
            "id": ser.get("id"),
            "slug": ser.get("slug"),
            "event_title": ser.get("showcase_title"),
            "full_name": ser.get("full_name"),
            "email": ser.get("email"),
            "phone": ser.get("phone"),
            "branch": ser.get("branch"),
            "year": ser.get("year"),
            "college": ser.get("college"),
            "fee": ser.get("fee"),
            "currency": ser.get("currency"),
            "payment_status": payment.get("status"),
            "payment_id": payment.get("payment_id"),
            "registered_at": ser.get("registered_at"),
        },
        "message": (
            "Already checked in" if checked_in
            else ("Valid ticket" if verified else "Ticket not confirmed (payment pending or invalid)")
        ),
    }


@router.post("/admin/registrations/check-in")
async def check_in_attendee(payload: TicketVerifySchema, request: Request, _=Depends(_require_admin)):
    """Check an attendee in at the venue (idempotent).

    Only confirmed (paid or free) registrations can be checked in. Returns the
    attendee summary plus a 'first_checkin' flag.
    """
    db = _get_db(request)
    parsed = _parse_ticket(payload.ticket)
    if not parsed:
        raise HTTPException(status_code=400, detail="Invalid ticket code")

    query: Dict[str, Any] = {}
    if parsed.get("slug"):
        query["slug"] = parsed["slug"]
    if parsed.get("reg_id"):
        query["id"] = parsed["reg_id"]

    reg = await db.echo_registrations.find_one(query)
    if not reg:
        reg = await db.echo_registrations.find_one({"id": parsed.get("reg_id")})
    if not reg:
        raise HTTPException(status_code=404, detail="Ticket not found")

    payment = reg.get("payment") or {}
    if payment.get("status") != "paid" or reg.get("status") != "registered":
        raise HTTPException(status_code=400, detail="Ticket not confirmed — attendee cannot be checked in")

    now_iso = _now()
    first_checkin = not bool(reg.get("checked_in_at"))
    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": {"checked_in_at": now_iso}, "$setOnInsert": {"checked_in_count": 1}},
    )
    if first_checkin:
        await db.echo_registrations.update_one(
            {"_id": reg["_id"]}, {"$inc": {"checked_in_count": 1}}
        )

    updated = _ser(await db.echo_registrations.find_one({"_id": reg["_id"]}))
    return {
        "ok": True,
        "first_checkin": first_checkin,
        "checked_in_at": updated.get("checked_in_at"),
        "attendee": {
            "id": updated.get("id"),
            "event_title": updated.get("showcase_title"),
            "full_name": updated.get("full_name"),
            "email": updated.get("email"),
            "phone": updated.get("phone"),
            "college": updated.get("college"),
        },
    }


@router.delete("/admin/registrations/{reg_id}")
async def delete_registration(reg_id: str, request: Request, _=Depends(_require_admin)):
    """Delete a registration by ID (admin only)."""
    from bson import ObjectId
    db = _get_db(request)
    try:
        result = await db.echo_registrations.delete_one({"_id": ObjectId(reg_id)})
    except Exception:
        result = await db.echo_registrations.delete_one({"id": reg_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"ok": True, "deleted": reg_id}


@router.get("/admin/revenue")
async def admin_echo_revenue(request: Request, _=Depends(_require_admin)):
    """Per-event revenue aggregates from real ECHO registrations.

    Only counts registrations that actually went through Razorpay
    (fee > 0, payment.status == paid, and a real payment_id exists —
    not admin overrides like ADMIN_PAY_xxx).

    Deduplicates team payments: a team of 5 creates 5 registration docs
    each with the full team fee, but Razorpay only captures once.
    We group by payment_id to count each payment exactly once.
    """
    db = _get_db(request)
    all_paid = await db.echo_registrations.find({
        "payment.status": "paid",
        "fee": {"$gt": 0},
    }).to_list(5000)

    # Group by (slug, payment_id) to deduplicate team payments
    seen: Dict[str, dict] = {}
    for r in all_paid:
        pid = (r.get("payment") or {}).get("payment_id") or ""
        if pid.startswith("ADMIN_PAY_"):
            continue
        slug = r.get("slug") or "unknown"
        key = f"{slug}||{pid}"
        if key not in seen:
            seen[key] = {
                "slug": slug,
                "title": r.get("showcase_title") or slug,
                "fee": float(r.get("fee") or 0),
                "currency": r.get("currency") or "INR",
            }

    # Aggregate per-event
    events_map: Dict[str, dict] = {}
    for entry in seen.values():
        slug = entry["slug"]
        if slug not in events_map:
            events_map[slug] = {
                "slug": slug,
                "title": entry["title"],
                "paid": 0,
                "revenue": 0.0,
                "currency": entry["currency"],
            }
        events_map[slug]["paid"] += 1
        events_map[slug]["revenue"] += entry["fee"]

    events = sorted(events_map.values(), key=lambda e: e["revenue"], reverse=True)
    totals = {
        "total": len(all_paid),
        "paid": len(seen),
        "pending": 0,
        "revenue": sum(e["revenue"] for e in events),
        "free": 0,
    }
    return {"events": events, "totals": totals}


# ── Admin settings ────────────────────────────────────────────────────────────
@router.get("/admin/settings")
async def get_echo_settings(request: Request):
    """Read-only: fetch current Echo settings. No auth required (template prefs are not sensitive)."""
    db = _get_db(request)
    settings = await db.echo_settings.find_one({"_id": "global"}) or {}
    hero = settings.get("hero_config") or {}
    return {
        "default_ticket_template": settings.get("default_ticket_template", "aurora"),
        "default_invoice_template": settings.get("default_invoice_template", "modern"),
        "default_email_style": settings.get("default_email_style", "modern"),
        "email_brand_color": settings.get("email_brand_color", "#7C3AED"),
        "brand_name": settings.get("brand_name", "Student Alumni"),
        "email_footer": settings.get("email_footer", "Student Alumni Cell — Empowering the next generation of leaders."),
        "hero_config": {
            "badge": hero.get("badge", "ON THE GROUND"),
            "title": hero.get("title", "The network is a feed until it meets in person."),
            "description": hero.get("description", "Eighty-six ECHO events across thirty-one campuses. Alumni in the room, recruiters at the table, and a build sprint that runs overnight."),
            "stats": hero.get("stats", [
                {"value": "86", "label": "events run", "color": "#4B3FD6"},
                {"value": "31", "label": "cities", "color": "#0E6E8C"},
                {"value": "4.8", "label": "average rating", "color": "#A21C63"},
            ]),
            "recent_hosts": hero.get("recent_hosts", ["Sreenidhi Institute", "VNR VJIET", "Khammam Institute", "CBIT Hyderabad"]),
            "cta_primary": hero.get("cta_primary", "Browse all events"),
            "cta_secondary": hero.get("cta_secondary", "Host on your campus"),
            "section_badge": hero.get("section_badge", "ECHO EVENTS"),
            "section_title": hero.get("section_title", "Explore ECHO Events by College"),
            "section_description": hero.get("section_description", "Image galleries, partners, sponsors, speakers, testimonials and registration for every ECHO event we've conducted."),
        },
    }


@router.put("/admin/settings")
async def update_echo_settings(request: Request, admin=Depends(_require_admin)):
    """Update global ECHO settings."""
    db = _get_db(request)
    body = await request.json()
    update = {}
    if "default_ticket_template" in body:
        tpl = body["default_ticket_template"]
        if tpl in TICKET_TEMPLATES:
            update["default_ticket_template"] = tpl
    if "default_invoice_template" in body:
        tpl = body["default_invoice_template"]
        if tpl in ("modern", "minimal", "classic"):
            update["default_invoice_template"] = tpl
    if "default_email_style" in body:
        tpl = body["default_email_style"]
        if tpl in ("modern", "minimal", "professional"):
            update["default_email_style"] = tpl
    if "email_brand_color" in body:
        update["email_brand_color"] = str(body["email_brand_color"])[:20]
    if "brand_name" in body:
        update["brand_name"] = str(body["brand_name"])[:60]
    if "email_footer" in body:
        update["email_footer"] = str(body["email_footer"])[:300]
    if "hero_config" in body:
        hc = body["hero_config"]
        if isinstance(hc, dict):
            # Merge with existing hero_config to preserve unset fields
            existing = (await db.echo_settings.find_one({"_id": "global"}) or {}).get("hero_config") or {}
            merged = {**existing, **{k: v for k, v in hc.items() if v is not None}}
            update["hero_config"] = merged
    if update:
        await db.echo_settings.update_one(
            {"_id": "global"}, {"$set": update}, upsert=True
        )
    return {"ok": True, **update}


@router.get("/admin/settings/preview/invoice/{template_id}")
async def preview_invoice_template(template_id: str, request: Request):
    """Return a preview HTML for an invoice template variant. No auth required (mock data only)."""
    """Return a preview HTML for an invoice template variant."""
    if template_id not in ("modern", "minimal", "classic"):
        raise HTTPException(400, "Invalid template")
    mock_inv = {
        "invoice_no": "INV-DEMO123456",
        "full_name": "Priya Sharma",
        "email": "priya@example.com",
        "phone": "+91 98765 43210",
        "college": "VNR VJIET",
        "event_title": "ECHO 2026 — Tech Summit",
        "event_date": "August 15, 2026",
        "event_venue": "Main Auditorium, VNR VJIET",
        "payment_id": "pay_DEMO789",
        "payment_method": "online",
        "paid_at": "2026-08-10T14:30:00",
        "amount": 499,
        "currency": "INR",
        "items": [{"desc": "Registration — ECHO 2026", "qty": 1, "amount": 499}],
    }
    return {"html": _build_invoice_html(mock_inv, template_id)}


# ── Branding Settings ─────────────────────────────────────────────────────────

@router.get("/admin/branding")
async def get_branding(request: Request, _=Depends(_require_admin)):
    """Return branding settings."""
    db = _get_db(request)
    settings = await db.echo_settings.find_one({"_id": "global"}) or {}
    return {
        "logo_url": settings.get("logo_url", ""),
        "favicon_url": settings.get("favicon_url", ""),
        "brand_name": settings.get("brand_name", "StudentAlumni"),
        "copyright": settings.get("copyright", "2026 StudentAlumni. All rights reserved."),
        "address": settings.get("address", ""),
        "phone": settings.get("phone", ""),
        "email": settings.get("email", ""),
        "website": settings.get("website", ""),
    }


@router.put("/admin/branding")
async def update_branding(request: Request, admin=Depends(_require_admin)):
    """Update branding settings."""
    db = _get_db(request)
    body = await request.json()
    update = {}
    for k in ("logo_url", "favicon_url", "brand_name", "copyright", "address", "phone", "email", "website"):
        if k in body:
            update[k] = str(body[k])[:500]
    if update:
        await db.echo_settings.update_one(
            {"_id": "global"}, {"$set": update}, upsert=True
        )
    return {"ok": True, **update}


# ── Admin endpoints ───────────────────────────────────────────────────────────
@router.get("/admin/showcases")
async def admin_list_showcases(request: Request, _=Depends(_require_admin)):
    db = _get_db(request)
    docs = await db.echo_showcases.find({}).sort("created_at", -1).to_list(200)
    if len(docs) == 0:
        await seed_echo_showcase(db)
        docs = await db.echo_showcases.find({}).sort("created_at", -1).to_list(200)
    return {"items": [_ser(d) for d in docs]}


@router.post("/admin/showcases")
async def create_showcase(payload: ShowcaseCreateSchema, request: Request, admin=Depends(_require_admin)):
    db = _get_db(request)
    existing = await db.echo_showcases.find_one({"slug": payload.slug})
    if existing:
        raise HTTPException(status_code=409, detail="Slug already exists")
    doc = payload.model_dump()
    doc["sections"] = {**DEFAULT_SECTIONS, **(doc.get("sections") or {})}
    doc["registration"] = doc.get("registration") or {"enabled": True, "fee": 0, "currency": "INR"}
    doc["created_at"] = _now()
    doc["updated_at"] = _now()
    doc["created_by"] = admin.get("sub") or admin.get("user_id") or "admin"
    result = await db.echo_showcases.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _ser(doc)


@router.put("/admin/showcases/{showcase_id}")
async def update_showcase(showcase_id: str, payload: ShowcaseUpdateSchema, request: Request, _=Depends(_require_admin)):
    db = _get_db(request)
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = _now()
    result = await db.echo_showcases.update_one({"_id": _oid(showcase_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Showcase not found")
    print(f"[MONGO UPDATE EXECUTED] showcase_id={showcase_id} matched={result.matched_count} modified={result.modified_count} fields={list(update.keys())}")
    doc = await db.echo_showcases.find_one({"_id": _oid(showcase_id)})
    outcome = _ser(doc or {})
    if "sessions" in update:
        recon = await _reconcile_coupons_for_paid(db, doc or {})
        outcome["coupon_sync"] = recon
    return outcome


@router.delete("/admin/showcases/{showcase_id}")
async def delete_showcase(showcase_id: str, request: Request, _=Depends(_require_admin)):
    db = _get_db(request)
    result = await db.echo_showcases.delete_one({"_id": _oid(showcase_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@router.patch("/admin/showcases/{showcase_id}/publish")
async def publish_showcase(showcase_id: str, request: Request, _=Depends(_require_admin)):
    db = _get_db(request)
    await db.echo_showcases.update_one(
        {"_id": _oid(showcase_id)},
        {"$set": {"status": "published", "published_at": _now(), "updated_at": _now()}}
    )
    return {"ok": True, "status": "published"}


@router.patch("/admin/showcases/{showcase_id}/draft")
async def draft_showcase(showcase_id: str, request: Request, _=Depends(_require_admin)):
    db = _get_db(request)
    await db.echo_showcases.update_one(
        {"_id": _oid(showcase_id)},
        {"$set": {"status": "draft", "updated_at": _now()}}
    )
    return {"ok": True, "status": "draft"}


@router.patch("/admin/showcases/{showcase_id}/archive")
async def archive_showcase(showcase_id: str, request: Request, _=Depends(_require_admin)):
    db = _get_db(request)
    await db.echo_showcases.update_one(
        {"_id": _oid(showcase_id)},
        {"$set": {"status": "archived", "updated_at": _now()}}
    )
    return {"ok": True, "status": "archived"}


# ── File Upload Endpoint ──────────────────────────────────────────────────────

@router.post("/admin/upload")
async def upload_echo_media(request: Request, file: UploadFile = File(None), admin=Depends(_require_admin)):
    """Upload an image file to the filesystem and store its URL in the database."""
    from pathlib import Path as _Path
    from datetime import datetime as _dt, timezone as _tz
    db = _get_db(request)
    content_type_header = request.headers.get("content-type", "")

    filename = "upload.png"
    original_name = "upload.png"
    file_bytes = b""

    if file and file.filename:
        filename = file.filename
        original_name = filename
        file_bytes = await file.read()
    elif "multipart/form-data" in content_type_header:
        form = await request.form()
        uploaded_file = form.get("file") or form.get("image") or form.get("media")
        if uploaded_file and hasattr(uploaded_file, "filename") and hasattr(uploaded_file, "read"):
            filename = str(getattr(uploaded_file, "filename", "") or "")
            original_name = filename
            file_bytes = await uploaded_file.read() # type: ignore
        else:
            raise HTTPException(status_code=400, detail="No file found in multipart upload")
    elif "application/json" in content_type_header:
        body = await request.json()
        data = body.get("data", "")
        filename = str(body.get("filename") or f"upload_{int(_dt.now(_tz.utc).timestamp())}.png")
        original_name = filename
        if "," in data:
            data = data.split(",", 1)[1]
        file_bytes = base64.b64decode(data)
    else:
        raise HTTPException(status_code=400, detail="No file or base64 data provided")

    MAX_SIZE = 10 * 1024 * 1024
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MB allowed.")

    ext = Path(filename or "").suffix.lower() or ".png"
    ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif", ".pdf", ".docx", ".xlsx", ".pptx", ".zip"}
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed.")

    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    # Save to filesystem instead of base64-in-MongoDB
    upload_dir = _Path("uploads") / "echo"
    upload_dir.mkdir(parents=True, exist_ok=True)
    ts = int(_dt.now(_tz.utc).timestamp())
    stem = Path(filename or "").stem.replace(" ", "_").replace("/", "_") if filename else f"upload_{ts}"
    safe_name = f"{ts}_{stem}{ext}"
    out_path = upload_dir / safe_name
    with open(out_path, "wb") as f:
        f.write(file_bytes)

    url = f"/uploads/echo/{safe_name}"

    record = {
        "filename": safe_name,
        "original_name": original_name,
        "content_type": content_type,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "ext": ext.lstrip("."),
        "url": url,
        "uploaded_by": admin.get("sub") or admin.get("user_id") or "admin",
        "uploaded_at": _now(),
    }
    await db.echo_media.insert_one(record)

    return {
        "ok": True,
        "url": url,
        "filename": safe_name,
        "original_name": original_name,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "content_type": content_type,
    }


# ── Media Library endpoints ───────────────────────────────────────────────────

@router.get("/admin/media")
async def list_echo_media(request: Request, _=Depends(_require_admin)):
    """List all uploaded media from the database."""
    db = _get_db(request)
    files = []
    total_bytes = 0
    async for doc in db.echo_media.find().sort("uploaded_at", -1):
        doc["_id"] = str(doc["_id"])
        size = doc.get("size", 0)
        total_bytes += size
        ext = doc.get("filename", "").rsplit(".", 1)[-1] if "." in doc.get("filename", "") else ""
        files.append({
            "filename": doc.get("filename", ""),
            "original_name": doc.get("original_name", doc.get("filename", "")),
            "url": doc.get("url") or doc.get("data_url", ""),
            "size": size,
            "size_human": _human_size(size),
            "ext": ext,
            "content_type": doc.get("content_type", ""),
            "uploaded_at": doc.get("uploaded_at", ""),
            "uploaded_by": doc.get("uploaded_by", "admin"),
            "is_image": ext.lower() in ("png", "jpg", "jpeg", "gif", "webp", "svg"),
        })
    return {"items": files, "total": len(files), "total_size_human": _human_size(total_bytes)}


@router.delete("/admin/media/{filename}")
async def delete_echo_media(filename: str, request: Request, _=Depends(_require_admin)):
    """Delete a media file from the database."""
    db = _get_db(request)
    result = await db.echo_media.delete_one({"filename": filename})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"ok": True}


# ── Session Coupons ─────────────────────────────────────────────────────────

@router.get("/admin/{slug}/sessions")
async def get_sessions(slug: str, request: Request, _=Depends(_require_admin)):
    """Get session configuration for an event."""
    db = _get_db(request)
    showcase = await db.echo_showcases.find_one({"slug": slug})
    if not showcase:
        raise HTTPException(404, "Showcase not found")
    sessions = showcase.get("sessions") or DEFAULT_SESSIONS
    return {"sessions": sessions}


@router.put("/admin/{slug}/sessions")
async def update_sessions(slug: str, request: Request, admin=Depends(_require_admin)):
    """Update session configuration for an event."""
    db = _get_db(request)
    body = await request.json()
    sessions = body.get("sessions", [])
    await db.echo_showcases.update_one(
        {"slug": slug}, {"$set": {"sessions": sessions}}, upsert=True
    )
    show = await db.echo_showcases.find_one({"slug": slug}) or {"slug": slug, "sessions": sessions}
    recon = await _reconcile_coupons_for_paid(db, show)
    return {"ok": True, "sessions": sessions, "coupon_sync": recon}


@router.put("/admin/{slug}/sessions/{session_key}/lock")
async def toggle_session_lock(slug: str, session_key: str, request: Request, admin=Depends(_require_admin)):
    """Toggle lock status for a session. When locked, coupons show 'Available soon'."""
    db = _get_db(request)
    body = await request.json()
    locked = body.get("locked", True)

    showcase = await db.echo_showcases.find_one({"slug": slug})
    if not showcase:
        raise HTTPException(404, "Showcase not found")

    sessions = showcase.get("sessions") or DEFAULT_SESSIONS
    updated = False
    for s in sessions:
        if s.get("key") == session_key:
            s["locked"] = locked
            updated = True
            break

    if not updated:
        raise HTTPException(404, "Session not found")

    await db.echo_showcases.update_one(
        {"slug": slug}, {"$set": {"sessions": sessions}}
    )

    # Also update all coupons for this session to reflect the lock status
    if locked:
        await db.echo_coupons.update_many(
            {"slug": slug, "session_key": session_key, "used": False},
            {"$set": {"session_locked": True}}
        )
    else:
        await db.echo_coupons.update_many(
            {"slug": slug, "session_key": session_key},
            {"$set": {"session_locked": False}}
        )

    return {"ok": True, "session_key": session_key, "locked": locked}


@router.get("/{slug}/my-coupons")
async def my_coupons(slug: str, request: Request, email: Optional[str] = Query(None)):
    """Get current user's coupons for an event. Supports guest access via ?email= param."""
    db = _get_db(request)
    # Try to resolve user from auth token
    user = await _resolve_user(request, db)
    # Build query — match by user_id, user_key (the account id captured at
    # registration time), or email. user_id can drift from user_key when a paid
    # registration provisions an SA account under a different email, so we must
    # check user_key too or the original registrant loses access to coupons.
    query: Dict[str, Any] = {"slug": slug}
    if user:
        uid = str(user["_id"])
        uemail = (user.get("email") or "").lower()
        query["$or"] = [{"user_id": uid}, {"user_key": uid}, {"email": uemail}]
    elif email:
        uemail = email.strip().lower()
        # Resolve the email to a user _id so we can also match user_key. A paid
        # registration stores the provisioned SA account's email, so an exact
        # email match would miss the original guest registrant.
        u = await db.users.find_one({"email": uemail}, {"_id": 1, "email": 1})
        ukey = str(u["_id"]) if u else None
        parts: List[Dict[str, Any]] = [{"email": uemail}]
        if ukey:
            parts.append({"user_key": ukey})
        query["$or"] = parts
    else:
        raise HTTPException(401, "Authentication required or provide ?email= query parameter")
    # Find registration
    reg = await db.echo_registrations.find_one(query)
    if not reg:
        raise HTTPException(404, "No registration found")
    coupons = await db.echo_coupons.find({"slug": slug, "reg_id": reg["id"]}).to_list(100)
    # Check session lock status
    showcase = await db.echo_showcases.find_one({"slug": slug})
    sessions = showcase.get("sessions") if showcase else []
    locked_keys = {s["key"] for s in (sessions or []) if s.get("locked")}
    for c in coupons:
        if c.get("session_key") in locked_keys:
            c["session_locked"] = True
    # Generate QR data URLs
    for c in coupons:
        c["_id"] = str(c["_id"])
        c["qr_url"] = f"/api/echo/scan/{c['coupon_code']}"
    return {"coupons": coupons, "registration": {"id": reg["id"], "name": reg.get("full_name")}}


@router.get("/scan/{code}")
async def scan_coupon_get(code: str, request: Request):
    """Public GET used by QR scanner / previews.

    Resolves any of the following:
    - a coupon code (e.g. LUNCH-A7X9K2)
    - an entry-pass/ticket payload ECHO:<slug>|<user_key>|<reg_id>
    - a bare registration id
    Returns a unified shape with a `type` field ("coupon" | "ticket").
    """
    db = _get_db(request)
    raw = (code or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Missing code")

    # 1) Coupon lookup (case-insensitive)
    coupon = await db.echo_coupons.find_one({"coupon_code": raw.upper()})
    if coupon:
        return {
            "ok": True,
            "type": "coupon",
            "coupon_code": coupon.get("coupon_code"),
            "session_name": coupon.get("session_name"),
            "session_key": coupon.get("session_key"),
            "session_day": coupon.get("session_day") or 1,
            "used": coupon.get("used", False),
            "used_at": coupon.get("used_at"),
            "slug": coupon.get("slug"),
        }

    # 2) Ticket / entry-pass lookup
    parsed = _parse_ticket(raw)
    query: Dict[str, Any] = {}
    if parsed.get("slug"):
        query["slug"] = parsed["slug"]
    if parsed.get("reg_id"):
        query["id"] = parsed["reg_id"]
    reg = None
    if query:
        reg = await db.echo_registrations.find_one(query)
        if not reg and parsed.get("reg_id"):
            reg = await db.echo_registrations.find_one({
                "id": {"$regex": f"^{parsed['reg_id']}$", "$options": "i"}
            })
    if not reg:
        reg = await db.echo_registrations.find_one({
            "id": {"$regex": f"^{raw}$", "$options": "i"}
        })

    if not reg:
        raise HTTPException(status_code=404, detail="Invalid code")

    payment = reg.get("payment") or {}
    verified = payment.get("status") == "paid" and reg.get("status") == "registered"
    return {
        "ok": True,
        "type": "ticket",
        "reg_id": reg.get("id"),
        "slug": reg.get("slug"),
        "event_title": reg.get("showcase_title") or "",
        "full_name": reg.get("full_name") or "",
        "email": reg.get("email") or "",
        "college": reg.get("college") or "",
        "verified": verified,
        "checked_in": bool(reg.get("checked_in_at")),
        "checked_in_at": reg.get("checked_in_at"),
    }


@router.post("/admin/scan-coupon")
async def scan_coupon(request: Request, admin=Depends(_require_admin)):
    """Scan a coupon QR code."""
    db = _get_db(request)
    body = await request.json()
    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Coupon code required")

    coupon = await db.echo_coupons.find_one({"coupon_code": code})
    if not coupon:
        raise HTTPException(404, "Invalid coupon code")
    # Check if session is locked
    if coupon.get("session_locked"):
        return {
            "ok": False,
            "status": "locked",
            "message": f"This session ({coupon.get('session_name', '')}) is currently locked. It will be available soon.",
            "coupon": {k: v for k, v in coupon.items() if k != "_id"},
        }
    if coupon["used"]:
        return {
            "ok": False,
            "status": "already_used",
            "message": f"Already scanned at {coupon.get('used_at', 'unknown time')} by {coupon.get('scanned_by', 'unknown')}",
            "coupon": {k: v for k, v in coupon.items() if k != "_id"},
        }

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    await db.echo_coupons.update_one(
        {"_id": coupon["_id"]},
        {"$set": {"used": True, "used_at": now, "scanned_by": admin.get("email", "admin")}}
    )

    # Get attendee info
    reg = await db.echo_registrations.find_one({"id": coupon["reg_id"]})

    return {
        "ok": True,
        "status": "valid",
        "message": f"Valid — {coupon['session_name']} for {reg.get('full_name', 'Unknown') if reg else 'Unknown'}",
        "coupon": {
            "code": code,
            "session_name": coupon["session_name"],
            "session_day": coupon.get("session_day") or 1,
            "attendee_name": reg.get("full_name", "") if reg else "",
            "attendee_email": reg.get("email", "") if reg else "",
            "used_at": now.isoformat(),
        },
    }


@router.get("/admin/{slug}/coupon-stats")
async def coupon_stats(slug: str, request: Request, _=Depends(_require_admin)):
    """Get scan statistics for all sessions."""
    db = _get_db(request)
    pipeline = [
        {"$match": {"slug": slug}},
        {"$group": {
            "_id": "$session_key",
            "session_name": {"$first": "$session_name"},
            "total": {"$sum": 1},
            "used": {"$sum": {"$cond": ["$used", 1, 0]}},
            "unused": {"$sum": {"$cond": ["$used", 0, 1]}},
        }},
        {"$sort": {"_id": 1}},
    ]
    stats = await db.echo_coupons.aggregate(pipeline).to_list(50)
    return {"stats": stats, "slug": slug}


@router.get("/admin/{slug}/coupons")
async def admin_coupons(slug: str, request: Request, _=Depends(_require_admin)):
    """List all coupons for an event."""
    db = _get_db(request)
    coupons = await db.echo_coupons.find({"slug": slug}).sort("created_at", -1).to_list(500)
    for c in coupons:
        c["_id"] = str(c["_id"])
    return {"coupons": coupons, "total": len(coupons)}


# ── Volunteer / Ambassador Management ────────────────────────────────────────

@router.get("/admin/volunteers")
async def list_all_volunteers(request: Request, _=Depends(_require_admin)):
    """List all volunteers across every event, joined with the event title."""
    db = _get_db(request)
    vols = await db.echo_volunteers.find().sort("created_at", -1).to_list(1000)
    # Build slug -> showcase title map
    slugs = {v.get("slug") for v in vols if v.get("slug")}
    title_map = {}
    if slugs:
        for s in await db.echo_showcases.find({"slug": {"$in": list(slugs)}}, {"slug": 1, "title": 1}).to_list(500):
            title_map[s.get("slug")] = s.get("title") or s.get("slug")
    for v in vols:
        v["_id"] = str(v["_id"])
        v["event_title"] = title_map.get(v.get("slug")) or v.get("slug") or "—"
        if v.get("email"):
            user = await db.users.find_one({"email": v["email"].lower().strip()})
            v["has_account"] = user is not None
            v["user_name"] = user.get("full_name", "") if user else ""
        else:
            v["has_account"] = False
            v["user_name"] = ""
    return {"volunteers": vols, "total": len(vols)}


@router.get("/admin/{slug}/volunteers")
async def list_volunteers(slug: str, request: Request, _=Depends(_require_admin)):
    """List all volunteers for an event."""
    db = _get_db(request)
    vols = await db.echo_volunteers.find({"slug": slug}).sort("created_at", -1).to_list(200)
    for v in vols:
        v["_id"] = str(v["_id"])
        # Check if volunteer has an SA account
        if v.get("email"):
            user = await db.users.find_one({"email": v["email"].lower().strip()})
            v["has_account"] = user is not None
            v["user_name"] = user.get("full_name", "") if user else ""
        else:
            v["has_account"] = False
            v["user_name"] = ""
    return {"volunteers": vols}


@router.post("/admin/{slug}/volunteers")
async def add_volunteer(slug: str, request: Request, admin=Depends(_require_admin)):
    """Add a volunteer/ambassador to an event by email."""
    db = _get_db(request)
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    role = body.get("role", "volunteer")

    if not email or "@" not in email:
        raise HTTPException(400, "Valid email required")
    from core.email_quality import require_ok
    email = require_ok(email)
    if role not in ("volunteer", "ambassador"):
        raise HTTPException(400, "Role must be 'volunteer' or 'ambassador'")

    # Check duplicate
    existing = await db.echo_volunteers.find_one({"slug": slug, "email": email})
    if existing:
        raise HTTPException(409, "User already added as volunteer for this event")

    from datetime import datetime, timezone
    record = {
        "slug": slug,
        "email": email,
        "role": role,
        "added_by": admin.get("email", "admin"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.echo_volunteers.insert_one(record)

    # Check if user has SA account
    user = await db.users.find_one({"email": email})
    has_account = user is not None
    user_name = user.get("full_name", "") if user else ""

    # TODO: Send invitation email if no account exists

    return {"ok": True, "has_account": has_account, "user_name": user_name, "email": email}


@router.delete("/admin/{slug}/volunteers/{volunteer_id}")
async def remove_volunteer(slug: str, volunteer_id: str, request: Request, _=Depends(_require_admin)):
    """Remove a volunteer from an event."""
    db = _get_db(request)
    from bson import ObjectId
    try:
        vid = ObjectId(volunteer_id)
    except Exception:
        raise HTTPException(400, "Invalid volunteer ID")
    result = await db.echo_volunteers.delete_one({"_id": vid, "slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(404, "Volunteer not found")
    return {"ok": True}


@router.get("/volunteer/events")
async def my_volunteer_events(request: Request, user=Depends(_get_current_user_dependency())):
    """Get events the current user is a volunteer for."""
    db = _get_db(request)
    email = (user.get("email") or "").strip().lower()
    vols = await db.echo_volunteers.find({"email": email}).to_list(50)
    events = []
    for v in vols:
        showcase = await db.echo_showcases.find_one({"slug": v["slug"]})
        if showcase:
            events.append({
                "slug": v["slug"],
                "title": showcase.get("title", ""),
                "role": v.get("role", "volunteer"),
                "event_date": showcase.get("date", ""),
                "venue": showcase.get("venue", ""),
            })
    return {"events": events}


@router.get("/volunteer/scan-access")
async def check_scan_access(request: Request, user=Depends(_get_current_user_dependency())):
    """Check if current user has scan access (super_admin or volunteer)."""
    db = _get_db(request)
    role = (user.get("role") or "").lower()
    if role in ("super_admin", "admin"):
        return {"access": True, "role": "admin"}

    email = (user.get("email") or "").strip().lower()
    vol = await db.echo_volunteers.find_one({"email": email})
    if vol:
        return {"access": True, "role": vol.get("role", "volunteer"), "slug": vol.get("slug")}

    return {"access": False}
