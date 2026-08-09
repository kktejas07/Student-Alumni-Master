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
import base64
import json
import secrets
import mimetypes
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from core.security import generate_qr_code
from core.email import send_email, render_html_email

router = APIRouter(prefix="/api/echo", tags=["echo-showcase"])

UPLOAD_DIR = Path("uploads/echo")
MEDIA_META_FILE = UPLOAD_DIR / ".media_meta.json"


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
    JWT_SECRET = os.environ.get("JWT_SECRET", "studentalumni_jwt_secret_key_2026")
    try:
        payload = _jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


# ── Helpers ──────────────────────────────────────────────────────────────────
def _oid(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {v}")


def _ser(doc: dict) -> dict:
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
                    "amount": int(round(amount * 100)),
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
        return False
    secret = cfg.get("webhook_secret") or cfg.get("key_secret")
    if not secret:
        return False
    import hashlib
    import hmac
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, (signature or ""))


async def _finalize_paid_registration(db, reg: dict, showcase: dict, payment_id: str) -> Optional[dict]:
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

    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": {
            "payment": paid_payment,
            "status": "registered",
            "registered_at": now_iso,
            "qr_code_base64": generate_qr_code(
                f"ECHO:{canonical_slug}|{reg.get('user_key')}|{reg.get('id')}"
            ),
            "payment_order": None,
        }},
    )

    updated = await db.echo_registrations.find_one({"_id": reg["_id"]})
    updated_ser = _ser(updated)
    user = None
    if updated.get("user_id"):
        try:
            user = await db.users.find_one({"_id": ObjectId(updated["user_id"])})
        except Exception:
            user = None
    await _mirror_to_event_registration(db, updated_ser, showcase, user)
    invoice = await _store_invoice_and_email(db, updated_ser, showcase)
    return {**updated_ser, "invoice": invoice}


def _payment_label(method: str) -> str:
    return {
        "upi": "UPI",
        "card": "Credit / Debit Card",
        "netbanking": "Net Banking",
        "wallet": "Wallet",
        "external": "External gateway",
    }.get(method or "", (method or "").title())


def _parse_iso(s: str):
    """Parse an ISO 8601 string to an aware datetime. Returns None if unparseable."""
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
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


async def _send_registration_confirmation(db, reg: dict, showcase: dict) -> None:
    """Email a confirmation (with QR) for FREE or confirmed registrations.

    Paid registrations get a payment invoice via _store_invoice_and_email; this
    covers the free/no-charge path so every attendee receives an email receipt.
    """
    try:
        email = (reg.get("email") or "").strip()
        if not email:
            return
        title = reg.get("showcase_title") or showcase.get("title") or "Event Registration"
        qr = reg.get("qr_code_base64") or ""
        qr_block = ""
        if qr:
            qr_block = f"""
            <div style="margin:0 0 18px 0;text-align:center;">
              <img src="data:image/png;base64,{qr}" alt="Check-in QR" width="160" height="160"
                   style="border-radius:10px;border:1px solid #e5e7eb;" />
              <p style="margin:8px 0 0 0;color:#9ca3af;font-size:12px;">Scan this QR at the venue for check-in.</p>
            </div>"""
        subject = f"Registration Confirmed — {title}"
        body = render_html_email(
            f"""
            <h2 style="margin:0 0 14px 0;color:#111827;">You're registered!</h2>
            <p style="margin:0 0 18px 0;color:#374151;">Thank you for registering for <strong>{title}</strong>.
            Here are your registration details:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Registration ID</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{reg.get('id')}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Event</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{title}</td></tr>
              <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Attendee</td>
                  <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{reg.get('full_name')}</td></tr>
            </table>
            {qr_block}
            <p style="margin:0 0 22px 0;color:#374151;">
              You can view your ticket anytime from your dashboard under <strong>My Tickets</strong>.
            </p>
            <a href="https://studentalumni.ai/dashboard"
               style="display:inline-block;padding:12px 26px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Open My Dashboard</a>
            """
        )
        await send_email(email, subject, body)
    except Exception as e:
        print(f"[ECHO] Confirmation email error: {e}")


def _build_invoice(reg: dict, showcase: dict) -> dict:
    """Build a normalized invoice record from a registration + showcase."""
    payment = reg.get("payment") or {}
    fee = float(reg.get("fee") or 0)
    currency = reg.get("currency") or "INR"
    invoice_no = f"INV-{(reg.get('id') or str(reg.get('_id') or ''))[-10:].upper()}"
    items = [
        {
            "desc": f"Registration — {showcase.get('title') or reg.get('showcase_title')}",
            "qty": 1,
            "amount": fee,
        }
    ]
    return {
        "invoice_no": invoice_no,
        "reg_id": reg.get("id"),
        "slug": reg.get("slug"),
        "event_title": showcase.get("title") or reg.get("showcase_title"),
        "event_date": showcase.get("date") or "",
        "event_venue": showcase.get("venue") or "",
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


def _build_invoice_html(inv: dict) -> str:
    """Render a clean, printable HTML invoice (browser-print → PDF)."""
    amount = float(inv.get("amount") or 0)
    currency = inv.get("currency") or "INR"
    rows = "".join(
        f"<tr><td style='padding:10px 12px;border-bottom:1px solid #eee;color:#111827;'>{i.get('desc')}</td>"
        f"<td style='padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:#111827;'>{i.get('qty')}</td>"
        f"<td style='padding:10px 12px;border-bottom:1px solid #eee;text-align:right;color:#111827;'>{currency} {float(i.get('amount') or 0):,.2f}</td></tr>"
        for i in inv.get("items") or []
    )
    if not rows:
        rows = f"<tr><td style='padding:10px 12px;color:#111827;'>Event registration</td><td style='padding:10px 12px;text-align:center;color:#111827;'>1</td><td style='padding:10px 12px;text-align:right;color:#111827;'>{currency} {amount:,.2f}</td></tr>"
    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice {esc(inv.get('invoice_no'))}</title>
<style>
  body {{ margin:0; padding:32px; background:#eef1f6; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111827; }}
  .sheet {{ max-width:720px; margin:0 auto; background:#fff; border-radius:14px; overflow:hidden; border:1px solid #e5e7eb; }}
  .head {{ background:linear-gradient(135deg,#7C3AED,#4C1D95); color:#fff; padding:28px 34px; }}
  .head .brand {{ font-size:13px; letter-spacing:2px; opacity:.85; }}
  .head h1 {{ margin:6px 0 0; font-size:26px; }}
  .head .invno {{ margin-top:8px; font-size:14px; opacity:.9; }}
  .body {{ padding:28px 34px; }}
  table.meta {{ width:100%; border-collapse:collapse; }}
  table.meta td {{ vertical-align:top; padding:4px 0; }}
  .label {{ color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:.4px; }}
  .val {{ color:#111827; font-size:14px; font-weight:600; }}
  table.items {{ width:100%; border-collapse:collapse; margin-top:22px; }}
  table.items th {{ text-align:left; padding:10px 12px; background:#f9fafb; color:#374151; font-size:12px; text-transform:uppercase; letter-spacing:.4px; }}
  table.items th.r, table.items td.r {{ text-align:right; }}
  .total {{ margin-top:18px; text-align:right; padding-top:14px; border-top:2px solid #e5e7eb; }}
  .total .amt {{ font-size:26px; font-weight:800; color:#7C3AED; }}
  .foot {{ padding:22px 34px; background:#f9fafb; color:#6b7280; font-size:12px; line-height:1.6; }}
  .badge {{ display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; background:#dcfce7; color:#15803d; }}
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">STUDENT ALUMNI · ECHO</div>
      <h1>Payment Invoice</h1>
      <div class="invno">Invoice No: {esc(inv.get('invoice_no'))} &nbsp;·&nbsp; <span class="badge" style="background:rgba(255,255,255,.2);color:#fff;">PAID</span></div>
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
            <div class="val">{_payment_label(inv.get('payment_method'))}</div>
          </td>
        </tr>
      </table>

      <table class="items">
        <tr><th>Description</th><th style="text-align:center;">Qty</th><th class="r">Amount</th></tr>
        {rows}
      </table>

      <div class="total">
        <div class="label" style="margin-bottom:4px;">Total Paid</div>
        <div class="amt">{currency} {amount:,.2f}</div>
      </div>
    </div>
    <div class="foot">
      Thank you for registering for <strong>{esc(inv.get('event_title') or 'our event')}</strong>. Please carry this
      invoice and your check-in QR to the venue. This is a computer-generated invoice and does not require a signature.
      For any queries, contact the Student Alumni Cell.
    </div>
  </div>
</body>
</html>"""


async def _mirror_to_event_registration(db, reg: dict, showcase: dict, user: Optional[dict]):
    """Mirror an ECHO registration into the StudentAlumni event_registrations collection."""
    canonical_slug = reg.get("slug") or (showcase or {}).get("slug")
    event_id = f"echo-{canonical_slug}"
    event = await db.events.find_one({"id": event_id})
    if not event:
        event_doc = {
            "id": event_id,
            "title": showcase.get("title"),
            "category": showcase.get("category", "college-event"),
            "organizer": showcase.get("organizer_name") or "Student Alumni Cell",
            "venue": showcase.get("venue"),
            "start_date": showcase.get("date"),
            "description": showcase.get("description"),
            "image": showcase.get("hero_image_url"),
            "tags": ["ECHO", showcase.get("college", "")],
            "rsvp_count": 0,
            "created_at": _now(),
        }
        await db.events.insert_one(event_doc)
    sa_reg = {
        "id": reg.get("id"),
        "event_id": event_id,
        "event_title": showcase.get("title"),
        "user_id": reg.get("user_id"),
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


async def _store_invoice_and_email(db, reg: dict, showcase: dict) -> dict:
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

    # Fire-and-forget email notification
    try:
        email = reg.get("email") or ""
        if email:
            subject = f"Payment Receipt & Invoice — {inv_ser.get('event_title') or 'Event Registration'}"
            body = render_html_email(
                f"""
                <h2 style="margin:0 0 14px 0;color:#111827;">Thank you for registering!</h2>
                <p style="margin:0 0 18px 0;color:#374151;">Your payment for <strong>{inv_ser.get('event_title')}</strong>
                has been received. Here are your payment details:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 18px 0;">
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Invoice No</td>
                      <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{inv_ser.get('invoice_no')}</td></tr>
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Payment ID</td>
                      <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{inv_ser.get('payment_id')}</td></tr>
                  <tr><td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;">Amount Paid</td>
                      <td style="padding:12px 16px;text-align:right;color:#111827;font-weight:700;">{inv_ser.get('currency')} {float(inv_ser.get('amount') or 0):,.2f}</td></tr>
                </table>
                <p style="margin:0 0 22px 0;color:#374151;">
                  You can view and download your invoice anytime from your dashboard under
                  <strong>My Tickets</strong>.
                </p>
                <a href="https://studentalumni.ai/dashboard"
                   style="display:inline-block;padding:12px 26px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Open My Dashboard</a>
                """
            )
            await send_email(email, subject, body)
    except Exception as e:
        print(f"[ECHO] Invoice email error: {e}")
    return inv_ser


# ── Media metadata helpers ────────────────────────────────────────────────────
def _load_media_meta() -> dict:
    """Load persistent media metadata from JSON sidecar file."""
    try:
        if MEDIA_META_FILE.exists():
            return json.loads(MEDIA_META_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_media_meta(meta: dict) -> None:
    """Persist media metadata to JSON sidecar file."""
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        MEDIA_META_FILE.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    except Exception:
        pass


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

class RegistrationConfig(BaseModel):
    enabled: Optional[bool] = True
    fee: Optional[float] = 0
    currency: Optional[str] = "INR"
    max_seats: Optional[int] = 0
    deadline: Optional[str] = ""
    payment_note: Optional[str] = ""
    payment_url: Optional[str] = None  # External payment gateway link (e.g. Razorpay/Stripe) shown on the register page
    poster_images: Optional[List[str]] = []  # Poster images displayed on the register page


DEFAULT_SECTIONS = {
    "hero": True,
    "stats": True,
    "about": True,
    "gallery": True,
    "testimonials": True,
    "timeline": True,
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


# ── Seed Default Data ────────────────────────────────────────────────────────
DEFAULT_SHOWCASE_SEED = {
    "title": "VNR ECHO 2026",
    "slug": "vnrvjit",
    "aliases": ["vnr-echo-2026"],
    "subtitle": "Empowering Tomorrow's Leaders",
    "description": "A day of inspiration, learning, and networking as industry leaders, alumni, and students came together to explore opportunities and shape the future of technology.",
    "date": "August 15, 2026",
    "time": "10:00 AM – 4:30 PM",
    "venue": "Main Auditorium, VNR VJIET",
    "college": "VNR VJIET",
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
    "downloads": [
        { "title": "VNR ECHO 2026 Brochure", "description": "Official event guide & schedule", "file_url": "", "file_size": "2.4 MB", "category": "Brochure" }
    ],
    "videos": [],
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
    },
    "created_at": _now(),
    "updated_at": _now(),
    "created_by": "system"
}


async def seed_echo_showcase(db: AsyncIOMotorDatabase):
    """Seed initial VNR ECHO 2026 showcase if missing, and ensure gallery_layout exists."""
    try:
        seed_slug = DEFAULT_SHOWCASE_SEED.get("slug")
        seed_aliases = DEFAULT_SHOWCASE_SEED.get("aliases") or []
        existing = await db.echo_showcases.find_one(_slug_query(seed_slug))
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
        # but only when the requested slug is the seed's canonical slug/alias.
        seed_slug = DEFAULT_SHOWCASE_SEED.get("slug")
        seed_aliases = DEFAULT_SHOWCASE_SEED.get("aliases") or []
        if slug == seed_slug or slug in seed_aliases:
            await seed_echo_showcase(db)
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
    return _ser(doc)


# ── Registration (real payments only — Razorpay) ─────────────────────────────
class RegisterSchema(BaseModel):
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    branch: Optional[str] = ""
    year: Optional[str] = ""
    college: Optional[str] = ""
    payment_method: Optional[str] = ""


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
            JWT_SECRET = os.environ.get("JWT_SECRET", "studentalumni_jwt_secret_key_2026")
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
    reg_email = (payload.email or "").strip().lower()
    user_key = str(user["_id"]) if user else (reg_email or (payload.phone or "").strip() or "anon")
    existing = await db.echo_registrations.find_one(
        {"slug": canonical_slug, "user_key": user_key}
    )
    if existing:
        return _ser(existing)

    reg_id = secrets.token_hex(6)
    now_iso = datetime.now(timezone.utc).isoformat()
    qr_payload = f"ECHO:{canonical_slug}|{user_key}|{reg_id}"
    fee = float(reg_cfg.get("fee", 0) or 0)
    currency = reg_cfg.get("currency", "INR")

    # Payment: FREE events are confirmed immediately. PAID events REQUIRE a
    # connected Razorpay gateway — there is no demo/mock auto-approve path, so
    # paid registration never issues a QR or invoice unless money was captured.
    gateway_cfg = await _razorpay_config(db)
    auto_paid = fee <= 0

    if auto_paid:
        payment = {
            "payment_id": f"PAY_{secrets.token_hex(8).upper()}",
            "gateway": "free",
            "amount": fee,
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
            "amount": fee,
            "currency": currency,
            "status": "pending",
            "paid_at": None,
            "method": payload.payment_method or "upi",
        }

    # 1) Event-side registration
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
        "branch": payload.branch,
        "year": payload.year,
        "college": payload.college or showcase.get("college"),
        "fee": fee,
        "currency": currency,
        "payment": payment,
        "qr_code_base64": generate_qr_code(qr_payload) if auto_paid else None,
        "registered_at": now_iso,
        "status": "registered" if auto_paid else "pending",
        "created_at": now_iso,
    }
    await db.echo_registrations.insert_one(dict(reg))

    # 2) StudentAlumni-side registration (mirror /events/:id/register)
    #    Only mirrored once payment is confirmed so no pending QR leaks across.
    if auto_paid and user is not None:
        await _mirror_to_event_registration(db, reg, showcase, user)

    # Free/confirmed registrations get a confirmation email (with QR).
    # Paid registrations on this path are impossible — they must pay first.
    invoice = None
    confirmation_sent = False
    if auto_paid:
        await _send_registration_confirmation(db, reg, showcase)
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
        JWT_SECRET = os.environ.get("JWT_SECRET", "studentalumni_jwt_secret_key_2026")
        try:
            payload = _jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
            user = await db.users.find_one({"_id": ObjectId(payload.get("sub"))})
            if user:
                reg = await db.echo_registrations.find_one(
                    {"slug": canonical_slug, "user_id": str(user["_id"])}
                )
                return _ser(reg or {})
        except Exception:
            pass
    return {}


# ── Payment endpoints (Razorpay) ─────────────────────────────────────────────
class PaymentOrderSchema(BaseModel):
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    branch: Optional[str] = ""
    year: Optional[str] = ""
    college: Optional[str] = ""


class VerifyPaymentSchema(PaymentOrderSchema):
    razorpay_payment_id: Optional[str] = ""
    razorpay_order_id: Optional[str] = ""
    razorpay_signature: Optional[str] = ""


async def _resolve_user(request: Request, db) -> Optional[dict]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        import jwt as _jwt
        JWT_SECRET = os.environ.get("JWT_SECRET", "studentalumni_jwt_secret_key_2026")
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

    if fee <= 0:
        raise HTTPException(status_code=400, detail="This event is free — register directly")

    if not (payload.full_name or "").strip() or not (payload.email or "").strip():
        raise HTTPException(status_code=400, detail="Full name and email are required")

    # A real Razorpay gateway must be configured — no demo/mock order creation.
    cfg = await _razorpay_config(db)
    if not cfg:
        raise HTTPException(
            status_code=503,
            detail="Online payments are temporarily unavailable — please try again later",
        )

    email = (payload.email or "").strip().lower()
    user_key = str(user["_id"]) if user else (email or (payload.phone or "").strip() or "anon")

    existing = await db.echo_registrations.find_one({"slug": canonical_slug, "user_key": user_key})
    if existing:
        payment = existing.get("payment") or {}
        if payment.get("status") == "paid":
            return {"already": True, "registration": _ser(existing)}
        order_id = (existing.get("payment_order") or {}).get("order_id")
        if order_id:
            return {
                "already": False,
                "order_id": order_id,
                "amount": fee,
                "currency": currency,
                "key_id": cfg.get("key_id", ""),
                "receipt": existing.get("id"),
                "pending": True,
            }

    reg_id = secrets.token_hex(6)
    now_iso = _now()

    # Create the Razorpay order
    order = await _razorpay_create_order(
        db, fee, currency, reg_id,
        {"slug": canonical_slug, "email": email, "name": payload.full_name},
    )
    if order is None:
        raise HTTPException(status_code=502, detail="Payment gateway temporarily unavailable — please try again")

    # Persist a pending registration so verify-payment / webhook has a record
    if not existing:
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
            "branch": payload.branch,
            "year": payload.year,
            "college": payload.college or showcase.get("college"),
            "fee": fee,
            "currency": currency,
            "payment": {
                "payment_id": None,
                "gateway": "razorpay",
                "amount": fee,
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
        }
        await db.echo_registrations.insert_one(dict(reg))
    else:
        reg_id = existing.get("id")
        # Attach the freshly-created order to the pre-existing pending reg so
        # verify-payment / webhook can resolve it by order id.
        await db.echo_registrations.update_one(
            {"_id": existing["_id"]},
            {"$set": {"payment_order": {"order_id": order.get("id"), "created_at": now_iso}}},
        )

    return {
        "already": False,
        "order_id": order.get("id"),
        "amount": fee,
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

    if not signature or not await _razorpay_verify_webhook_signature(db, body, signature):
        print("[ECHO-WEBHOOK] Razorpay webhook signature verification failed")
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

    if event_name != "payment.captured":
        return {"received": True, "processed": False, "reason": "ignored_event"}

    if not order_id:
        print("[ECHO-WEBHOOK] payment.captured without order_id")
        return {"received": True, "processed": False, "reason": "missing_order_id"}

    # The order id is stored on the pending registration's payment_order.
    reg = await db.echo_registrations.find_one({"payment_order.order_id": order_id})
    if not reg:
        # Also try receipt fallback (Razorpay puts our reg_id in receipt).
        for r in await db.echo_registrations.find({"payment.status": "pending"}).to_list(200):
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


@router.get("/invoices/{invoice_no}")
async def get_invoice(invoice_no: str, request: Request):
    """Fetch a single invoice (user-owned or admin). Returns render-ready HTML."""
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
        if not owner_match:
            raise HTTPException(status_code=403, detail="You do not have access to this invoice")
    inv_ser["html"] = _build_invoice_html(inv_ser)
    return inv_ser


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
        ]
    cur = db.echo_registrations.find(query).sort("created_at", -1).limit(limit)
    items = []
    for r in await cur.to_list(limit):
        s = _ser(r)
        payment = s.get("payment") or {}
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
        })
    return {"items": items, "total": len(items)}


# ── Ticket verification / check-in (venue staff) ─────────────────────────────
class TicketVerifySchema(BaseModel):
    ticket: str  # raw QR scan payload or a bare registration id


def _parse_ticket(ticket: str) -> dict:
    """Parse a QR payload into its components.

    Accepts the full 'ECHO:<slug>|<user_key>|<reg_id>' payload (as encoded in the
    registration QR) or a bare registration id. Returns {slug, user_key, reg_id}.
    """
    t = (ticket or "").strip()
    if not t:
        return {}
    if t.startswith("ECHO:"):
        parts = t.split("|")
        if len(parts) >= 3:
            return {"slug": parts[0][5:], "user_key": parts[1], "reg_id": parts[2]}
        return {}
    return {"reg_id": t}


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


@router.get("/admin/revenue")
async def admin_echo_revenue(request: Request, _=Depends(_require_admin)):
    """Per-event revenue aggregates from real ECHO registrations."""
    db = _get_db(request)
    pipeline = [
        {"$match": {}},
        {"$group": {
            "_id": "$slug",
            "title": {"$first": "$showcase_title"},
            "total": {"$sum": 1},
            "paid": {"$sum": {"$cond": [{"$eq": ["$payment.status", "paid"]}, 1, 0]}},
            "pending": {"$sum": {"$cond": [{"$eq": ["$payment.status", "pending"]}, 1, 0]}},
            "free": {"$sum": {"$cond": [{"$and": [{"$eq": ["$payment.status", "paid"]}, {"$eq": ["$fee", 0]}]}, 1, 0]}},
            "revenue": {"$sum": {"$cond": [{"$eq": ["$payment.status", "paid"]}, "$fee", 0]}},
            "currency": {"$first": "$currency"},
        }},
        {"$sort": {"revenue": -1}},
    ]
    events = []
    totals = {"total": 0, "paid": 0, "pending": 0, "revenue": 0.0, "free": 0}
    for row in await db.echo_registrations.aggregate(pipeline).to_list(200):
        events.append({
            "slug": row["_id"],
            "title": row.get("title") or row["_id"],
            "total": row["total"],
            "paid": row["paid"],
            "pending": row["pending"],
            "free": row.get("free", 0),
            "revenue": round(float(row.get("revenue") or 0), 2),
            "currency": row.get("currency") or "INR",
        })
        totals["total"] += row["total"]
        totals["paid"] += row["paid"]
        totals["pending"] += row["pending"]
        totals["revenue"] += float(row.get("revenue") or 0)
        totals["free"] += row.get("free", 0)
    return {"events": events, "totals": totals}


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
    return _ser(doc or {})


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
    """
    Accepts multipart/form-data with 'file', 'image', or 'media', OR base64 payload.
    Validates file size (max 25 MB) and file format.
    Generates responsive image variants (thumbnail, medium, large, original) using Pillow.
    """
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    content_type = request.headers.get("content-type", "")

    filename = "upload.png"
    original_name = "upload.png"
    file_bytes = b""

    if file and file.filename:
        filename = file.filename
        original_name = filename
        file_bytes = await file.read()
    elif "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file") or form.get("image") or form.get("media")
        if uploaded_file and hasattr(uploaded_file, "filename"):
            filename = uploaded_file.filename
            original_name = filename
            file_bytes = await uploaded_file.read()
        else:
            raise HTTPException(status_code=400, detail="No file found in multipart upload")
    elif "application/json" in content_type:
        body = await request.json()
        data = body.get("data", "")
        filename = body.get("filename") or f"upload_{int(datetime.now().timestamp())}.png"
        original_name = filename
        if "," in data:
            data = data.split(",", 1)[1]
        file_bytes = base64.b64decode(data)
    else:
        raise HTTPException(status_code=400, detail="No file or base64 data provided")

    # Validate file size (25 MB max)
    MAX_SIZE = 25 * 1024 * 1024
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 25 MB allowed.")

    ext = Path(filename).suffix.lower() or ".png"
    ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif", ".pdf", ".docx", ".xlsx", ".pptx", ".zip"}
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed.")

    ts = int(datetime.now().timestamp())
    stem = Path(filename).stem.replace(" ", "_")
    safe_name = f"{ts}_{stem}{ext}"
    out_path = UPLOAD_DIR / safe_name

    with open(out_path, "wb") as f:
        f.write(file_bytes)

    url = f"/uploads/echo/{safe_name}"

    # Generate Image Variants using Pillow if applicable
    variants = {"original": url, "large": url, "medium": url, "thumbnail": url}
    img_width, img_height = 0, 0

    if ext in (".jpg", ".jpeg", ".png", ".webp"):
        try:
            from PIL import Image as PILImage
            with PILImage.open(out_path) as im:
                img_width, img_height = im.size

                # Generate thumbnail (150x150)
                thumb_im = im.copy()
                thumb_im.thumbnail((150, 150))
                thumb_name = f"{ts}_{stem}_thumb{ext}"
                thumb_im.save(UPLOAD_DIR / thumb_name)
                variants["thumbnail"] = f"/uploads/echo/{thumb_name}"

                # Generate medium (600x400)
                med_im = im.copy()
                med_im.thumbnail((600, 600))
                med_name = f"{ts}_{stem}_med{ext}"
                med_im.save(UPLOAD_DIR / med_name)
                variants["medium"] = f"/uploads/echo/{med_name}"

                # Generate large (1200x800)
                large_im = im.copy()
                large_im.thumbnail((1200, 1200))
                large_name = f"{ts}_{stem}_large{ext}"
                large_im.save(UPLOAD_DIR / large_name)
                variants["large"] = f"/uploads/echo/{large_name}"
        except Exception:
            pass

    # Track in metadata sidecar
    meta = _load_media_meta()
    meta[safe_name] = {
        "filename": safe_name,
        "original_name": original_name,
        "url": url,
        "variants": variants,
        "width": img_width,
        "height": img_height,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "ext": ext.lstrip("."),
        "content_type": mimetypes.guess_type(safe_name)[0] or "application/octet-stream",
        "uploaded_at": _now(),
        "uploaded_by": admin.get("sub") or admin.get("user_id") or "admin",
    }
    _save_media_meta(meta)

    return {
        "ok": True,
        "url": url,
        "filename": safe_name,
        "original_name": original_name,
        "variants": variants,
        "width": img_width,
        "height": img_height,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "content_type": ext.strip(".")
    }


# ── Media Library endpoints ───────────────────────────────────────────────────

@router.get("/admin/media")
async def list_echo_media(request: Request, _=Depends(_require_admin)):
    """List all uploaded media files for the ECHO Media Library."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    meta = _load_media_meta()

    files = []
    total_bytes = 0

    # Scan actual files on disk, merge with metadata
    try:
        all_files = sorted(
            [p for p in UPLOAD_DIR.iterdir() if p.is_file() and not p.name.startswith(".")],
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )
    except Exception:
        all_files = []

    for p in all_files:
        size = p.stat().st_size
        total_bytes += size
        ext = p.suffix.lower().lstrip(".")
        m = meta.get(p.name, {})
        files.append({
            "filename": p.name,
            "original_name": m.get("original_name", p.name),
            "url": f"/uploads/echo/{p.name}",
            "variants": m.get("variants", {"original": f"/uploads/echo/{p.name}"}),
            "width": m.get("width", 0),
            "height": m.get("height", 0),
            "size": size,
            "size_human": _human_size(size),
            "ext": ext,
            "content_type": mimetypes.guess_type(p.name)[0] or "application/octet-stream",
            "uploaded_at": m.get(
                "uploaded_at",
                datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat()
            ),
            "uploaded_by": m.get("uploaded_by", "admin"),
            "is_image": ext in ("jpg", "jpeg", "png", "webp", "avif", "gif", "svg"),
        })

    return {
        "items": files,
        "total": len(files),
        "total_size": total_bytes,
        "total_size_human": _human_size(total_bytes),
    }


@router.delete("/admin/media/{filename}")
async def delete_echo_media(filename: str, request: Request, _=Depends(_require_admin)):
    """Delete a media file from the ECHO Media Library."""
    # Security: strip any path traversal attempts
    safe_filename = Path(filename).name
    if safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    target = UPLOAD_DIR / safe_filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")

    target.unlink()

    # Remove from metadata
    meta = _load_media_meta()
    meta.pop(safe_filename, None)
    _save_media_meta(meta)

    return {"ok": True, "deleted": safe_filename}
