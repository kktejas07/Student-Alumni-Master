"""
ECHO Marketplace — catalog + orders + admin management + discount coupons.

Mounted at prefix `/api/echo` to match the frontend `request()` helper, which
prepends `/api` to paths like `/echo/showcases/{slug}/catalog`.

Public routes (no auth):
  GET  /showcases/{slug}/catalog         active, in-stock catalog items
  POST /orders/checkout                  create/quote an order (Razorpay or free)
  POST /orders/verify-payment            confirm a paid marketplace order
  GET  /orders/{order_id}/qr             pickup QR for a paid order
  GET  /my-marketplace-orders            user's marketplace orders
  GET  /marketplace-invoices/{order_id}  render marketplace invoice HTML

Admin routes (super-admin JWT required):
  GET  /admin/showcases/{id}/catalog     list catalog items for a showcase
  POST /admin/showcases/{id}/catalog     create a catalog item
  PUT  /admin/catalog/{item_id}          update a catalog item
  DELETE /admin/catalog/{item_id}        delete a catalog item
  GET  /admin/showcases/{id}/orders      list marketplace orders for a showcase
  GET  /admin/coupons                    list discount coupons (event_slug query)
  POST /admin/coupons                    create a discount coupon (event-scoped)
"""

from __future__ import annotations
import os
import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field

from core.db import db

router = APIRouter(prefix="/api/echo", tags=["echo-marketplace"])

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"


# ── GST configuration ────────────────────────────────────────────────────────
# Per-category GST slabs (India). GST is EXCLUSIVE — added on top of item prices
# and included in the final payable amount. CGST + SGST are split 50/50 for
# intra-state invoices.
GST_RATES = {
    "food": 0.05,
    "beverage": 0.05,
    "cafe": 0.05,
    "snacks": 0.05,
    "drink": 0.05,
    "beverages": 0.05,
    "handcraft": 0.12,
    "handicraft": 0.12,
    "merch": 0.18,
    "merchandise": 0.18,
}
GST_DEFAULT_RATE = 0.18


def gst_rate_for(category: str | None) -> float:
    """Return the GST rate (0..1) for a catalog category, defaulting to 18%."""
    cat = (category or "").strip().lower()
    return GST_RATES.get(cat, GST_DEFAULT_RATE)


def gst_split(total: float) -> dict:
    """Split a GST total into CGST + SGST halves (intra-state)."""
    half = round(total / 2, 2)
    return {"cgst": round(half, 2), "sgst": round(total - half, 2)}



# ── Auth helpers ─────────────────────────────────────────────────────────────
async def _require_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]
    import jwt as _jwt
    try:
        payload = _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if (payload.get("role") or "").lower() not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


async def _resolve_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    import jwt as _jwt
    try:
        payload = _jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            return None
        try:
            return await db.users.find_one({"_id": ObjectId(uid)})
        except Exception:
            return None
    except Exception:
        return None


# ── Razorpay helpers ─────────────────────────────────────────────────────────
async def _razorpay_config():
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


async def _razorpay_create_order(amount: float, currency: str, receipt: str, notes: dict):
    cfg = await _razorpay_config()
    if not cfg:
        return None
    import httpx
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(cfg["key_id"], cfg["key_secret"]),
                json={"amount": round(amount * 100), "currency": currency, "receipt": receipt, "notes": notes},
            )
            if r.status_code in (200, 201):
                return r.json()
            return None
    except Exception:
        return None


# ── Serialization ────────────────────────────────────────────────────────────
def _serialize(item: dict) -> dict:
    out = {}
    for k, v in item.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [_serialize(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            out[k] = _serialize(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _oid_or(v: str):
    try:
        return ObjectId(v)
    except Exception:
        return v


def _new_order_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d") + secrets.token_hex(5).upper()


# ── Catalog helpers ──────────────────────────────────────────────────────────
def _normalize_item(doc: dict) -> dict:
    """Return catalog item in the shape the frontend UI expects."""
    item = _serialize(doc)
    item["id"] = item.get("_id")
    item.setdefault("stock_limit", item.get("stock", 0))
    item.setdefault("stock_remaining", item.get("stock_remaining", item.get("stock", 0)))
    item.setdefault("images", [])
    item.setdefault("image_base64", None)
    item.setdefault("stall_no", None)
    item.setdefault("stall_location", None)
    item.setdefault("is_active", True)
    item.setdefault("description", "")
    item.setdefault("category", "food")
    return item


def _filter_active_items(items: list[dict]) -> list[dict]:
    """Strip inactive and out-of-stock items for the public-facing catalog."""
    result = []
    for item in items:
        if item.get("is_active") is False:
            continue
        stock = int(item.get("stock_limit", 0) or 0)
        remaining = int(item.get("stock_remaining", stock) or 0)
        if stock > 0 and remaining <= 0:
            continue
        result.append(item)
    return result


async def _catalog_for_event(event_id: str) -> list[dict]:
    """Find catalog items tied to an event, matching by slug, object id, or 'master'."""
    query_lines = [{"event_id": event_id}]
    try:
        query_lines.append({"_id": ObjectId(event_id)})
    except Exception:
        pass
    docs = await db.echo_catalog_items.find(
        {"$or": query_lines}
    ).to_list(length=5000)
    return [_normalize_item(d) for d in docs]


# ── Smart coupon evaluation ──────────────────────────────────────────────────
async def _evaluate_coupon(code: str, subtotal: float, event_id: str, user_id: str, cart_items: list[dict] | None = None) -> tuple[float, str, dict]:
    """Validate a coupon and return (discount_amount, applied_code, coupon_doc).
    Supports: percentage / fixed, min_order_value, max_discount cap,
    max_uses global, per_user_limit, event scoping, vendor scoping.
    If coupon has vendor_id, discount only applies to that vendor's items.
    Raises HTTPException on failure. Returns (0, None, {}) if no code.
    """
    if not code:
        return 0.0, None, {}

    code_upper = code.strip().upper()
    coupon = await db.echo_discount_coupons.find_one({"code": code_upper})
    if not coupon or coupon.get("active", True) is False:
        raise HTTPException(status_code=400, detail="Invalid coupon code")

    # Lock check — locked coupons can't be used
    if coupon.get("locked", False):
        raise HTTPException(status_code=400, detail="This coupon is currently locked and cannot be used yet")

    # Event scope
    c_event = coupon.get("event_id")
    if c_event and c_event != event_id:
        raise HTTPException(status_code=400, detail="Coupon is not valid for this event")

    # Vendor scope — compute vendor-specific subtotal if coupon is vendor-scoped
    c_vendor = coupon.get("vendor_id")
    effective_subtotal = subtotal
    if c_vendor and cart_items:
        # Only count items from this vendor
        effective_subtotal = sum(
            float(it.get("price", 0)) * it.get("quantity", 1)
            for it in cart_items
            if it.get("vendor_id") == c_vendor
        )
        if effective_subtotal <= 0:
            raise HTTPException(status_code=400, detail="This coupon is only valid for items from a specific vendor")

    # Global usage cap
    uses = int(coupon.get("uses_count", 0) or 0)
    max_uses = int(coupon.get("max_uses", 0) or 0)
    if max_uses and uses >= max_uses:
        raise HTTPException(status_code=400, detail="Coupon has reached its usage limit")

    # Per-user limit
    per_user = int(coupon.get("per_user_limit", 0) or 0)
    if per_user and user_id:
        user_uses = await db.echo_orders.count_documents({
            "coupon_code": code_upper,
            "user_id": user_id,
            "status": "paid",
        })
        if user_uses >= per_user:
            raise HTTPException(status_code=400, detail="You have already used this coupon the maximum number of times")

    # Min order value (checked against effective subtotal)
    min_order = float(coupon.get("min_order_value", 0) or 0)
    if min_order and effective_subtotal < min_order:
        raise HTTPException(
            status_code=400,
            detail=f"Coupon requires a minimum order of ₹{min_order:.0f}",
        )

    # Compute discount on effective subtotal
    if coupon.get("discount_type") == "fixed":
        discount = float(coupon.get("discount_value", 0) or 0)
    else:
        discount = round(effective_subtotal * float(coupon.get("discount_value", 0) or 0) / 100.0, 2)

    # Max discount cap
    max_disc = float(coupon.get("max_discount", 0) or 0)
    if max_disc and discount > max_disc:
        discount = max_disc

    discount = min(discount, effective_subtotal)
    return round(discount, 2), code_upper, coupon


# ── Email + invoice for marketplace orders ───────────────────────────────────
async def _send_marketplace_order_email(order: dict):
    """Send payment confirmation + QR code + PDF invoice to the order's email."""
    from core.email import send_email, render_html_email

    email = (order.get("user_email") or "").strip()
    if not email:
        print(f"[MARKETPLACE] No email for order {order.get('id')}, skipping email")
        return

    order_id = order.get("id", "")
    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    user_name = esc(order.get("user_name") or "Customer")
    total = float(order.get("final_amount", 0) or 0)
    discount = float(order.get("discount", 0) or 0)
    subtotal = float(order.get("subtotal", 0) or 0)
    coupon_code = order.get("coupon_code") or ""
    is_free = order.get("payment_status") == "free"
    payment_id = order.get("razorpay_payment_id") or ""
    currency = order.get("currency") or "INR"
    invoice_url = f"https://studentalumni.ai/api/echo/marketplace-invoices/{order_id}"

    # ── Generate pickup QR code as base64 data URL ──
    qr_data_url = ""
    try:
        import qrcode as _qrcode
        import io, base64
        qr = _qrcode.QRCode(version=1, box_size=8, border=2, error_correction=_qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(order_id)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#5F259F", back_color="#FFFFFF")
        buf = io.BytesIO()
        qr_img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        qr_data_url = f"data:image/png;base64,{qr_b64}"
    except Exception as e:
        print(f"[MARKETPLACE] QR generation failed for email: {e}")

    # ── Generate PDF invoice attachment ──
    pdf_attachment = None
    try:
        from fpdf import FPDF
        import io as _io

        class InvoicePDF(FPDF):
            def header(self):
                self.set_font("Helvetica", "B", 18)
                self.set_text_color(91, 79, 233)
                self.cell(0, 12, "STUDENT ALUMNI", new_x="LMARGIN", new_y="NEXT", align="C")
                self.set_font("Helvetica", "", 10)
                self.set_text_color(120, 120, 120)
                self.cell(0, 6, "MARKETPLACE INVOICE", new_x="LMARGIN", new_y="NEXT", align="C")
                self.ln(4)

            def footer(self):
                self.set_y(-15)
                self.set_font("Helvetica", "I", 8)
                self.set_text_color(160, 160, 160)
                self.cell(0, 10, f"Order {order_id} | studentalumni.ai", align="C")

        pdf = InvoicePDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=20)

        # Status badge
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(22, 163, 74)
        pdf.cell(0, 8, f"{'FREE ORDER' if is_free else 'PAYMENT CONFIRMED'} — {currency} {total:,.2f}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Order info
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(60, 60, 60)
        pdf.cell(0, 6, f"Order ID: {order_id}", new_x="LMARGIN", new_y="NEXT")
        if payment_id:
            pdf.cell(0, 6, f"Payment ID: {payment_id}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f"Date: {order.get('created_at', '')[:10]}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f"Billed to: {order.get('user_name', 'Customer')}", new_x="LMARGIN", new_y="NEXT")
        if order.get("user_email"):
            pdf.cell(0, 6, f"Email: {order['user_email']}", new_x="LMARGIN", new_y="NEXT")
        if order.get("user_phone"):
            pdf.cell(0, 6, f"Phone: {order['user_phone']}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(6)

        # Items table header
        pdf.set_fill_color(248, 250, 252)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(90, 7, "ITEM", border=1, fill=True)
        pdf.cell(25, 7, "QTY", border=1, fill=True, align="C")
        pdf.cell(25, 7, "RATE", border=1, fill=True, align="C")
        pdf.cell(30, 7, "AMOUNT", border=1, fill=True, align="R")
        pdf.ln()

        # Item rows
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(30, 30, 30)
        for item in order.get("items", []):
            name = str(item.get("name", "Item"))[:40]
            qty = item.get("quantity", 1)
            rate = float(item.get("price", 0) or 0)
            line_total = float(item.get("line_total", 0) or rate * qty)
            gst_rate = item.get("gst_rate", 0)
            pdf.cell(90, 7, name, border=1)
            pdf.cell(25, 7, str(qty), border=1, align="C")
            pdf.cell(25, 7, f"{rate:,.0f}", border=1, align="C")
            pdf.cell(30, 7, f"{line_total:,.2f}", border=1, align="R")
            pdf.ln()
            if gst_rate:
                pdf.set_font("Helvetica", "I", 8)
                pdf.set_text_color(120, 120, 120)
                pdf.cell(90, 5, f"  incl. GST {gst_rate*100:.0f}%")
                pdf.ln()
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(30, 30, 30)

        # Discount
        if discount > 0:
            pdf.set_text_color(22, 163, 74)
            pdf.cell(115, 7, f"Discount ({coupon_code})", border=1)
            pdf.cell(30, 7, f"-{discount:,.2f}", border=1, align="R")
            pdf.ln()
            pdf.set_text_color(30, 30, 30)

        # Totals
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(115, 7, "Subtotal")
        pdf.cell(30, 7, f"{subtotal:,.2f}", align="R")
        pdf.ln()
        if discount > 0:
            pdf.set_text_color(22, 163, 74)
            pdf.cell(115, 7, "Discount")
            pdf.cell(30, 7, f"-{discount:,.2f}", align="R")
            pdf.ln()
            pdf.set_text_color(30, 30, 30)
        gst_total = float(order.get("gst_total", 0) or 0)
        if gst_total > 0:
            pdf.cell(115, 7, "GST (CGST + SGST)")
            pdf.cell(30, 7, f"{gst_total:,.2f}", align="R")
            pdf.ln()
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(115, 9, "Total (incl. GST)")
        pdf.cell(30, 9, f"{currency} {total:,.2f}", align="R")
        pdf.ln(12)

        # Pickup QR
        if qr_data_url:
            import base64 as _b64
            qr_bytes = _b64.b64decode(qr_b64)
            qr_path = _io.BytesIO(qr_bytes)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(60, 60, 60)
            pdf.cell(0, 7, "Pickup QR Code", new_x="LMARGIN", new_y="NEXT")
            pdf.image(qr_path, x=60, w=40)
            pdf.ln(2)
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(120, 120, 120)
            pdf.cell(0, 6, "Show this QR code at the stall to collect your order.", new_x="LMARGIN", new_y="NEXT")

        pdf_buf = _io.BytesIO()
        pdf.output(pdf_buf)
        pdf_bytes = pdf_buf.getvalue()
        pdf_attachment = [{"filename": f"Invoice-{order_id}.pdf", "content": pdf_bytes}]
    except Exception as e:
        print(f"[MARKETPLACE] PDF generation failed: {e}")

    # ── Build item rows for HTML email ──
    item_rows = ""
    for item in order.get("items", []):
        item_rows += f"""<tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">{esc(item.get('name', 'Item'))} × {item.get('quantity', 1)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#1e293b;font-weight:600;">{currency} {float(item.get('line_total', 0) or 0):,.2f}</td>
        </tr>"""

    discount_block = ""
    if discount > 0:
        discount_block = f"""
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#16a34a;">Discount ({esc(coupon_code)})</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#16a34a;font-weight:600;">-{currency} {discount:,.2f}</td>
        </tr>"""

    pickup_section = ""
    stall_info = ""
    for item in order.get("items", []):
        sn = item.get("stall_no") or ""
        sl = item.get("stall_location") or ""
        if sn or sl:
            stall_info = f"Stall {sn}" + (f", {sl}" if sl else "")
            break
    if stall_info:
        pickup_section = f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
          <tr><td style="padding:14px 20px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 10px 10px 0;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:#3b82f6;margin-bottom:4px;">Pickup Location</div>
            <div style="font-size:15px;font-weight:700;color:#1e293b;">{esc(stall_info)}</div>
          </td></tr>
        </table>"""

    # QR code inline in email
    qr_section = ""
    if qr_data_url:
        qr_section = f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          <tr><td align="center">
            <div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;">Pickup QR Code</div>
            <img src="{qr_data_url}" width="160" height="160" alt="Pickup QR Code" style="border:2px solid #e2e8f0;border-radius:12px;" />
            <div style="font-size:12px;color:#64748b;margin-top:8px;">Show this QR at the stall to collect your order</div>
          </td></tr>
        </table>"""

    status_text = "FREE ORDER" if is_free else "PAYMENT CONFIRMED"
    status_color = "#16a34a" if is_free else "#16a34a"
    paid_line = ""
    if payment_id:
        paid_line = f"""<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;">
          <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Payment ID</span>
          <span style="font-weight:600;color:#111827;font-size:13px;font-family:monospace;">{esc(payment_id)}</span>
        </div>"""

    body = render_html_email(f"""
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Order Confirmed!</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Hi {user_name}, your marketplace order has been confirmed. The PDF invoice is attached to this email.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
        <tr><td style="padding:16px 20px;background:#f0fdf4;border-left:4px solid {status_color};border-radius:0 10px 10px 0;">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:{status_color};margin-bottom:4px;">{status_text}</div>
          <div style="font-size:26px;font-weight:800;color:#111827;">{currency} {total:,.2f}</div>
        </td></tr>
      </table>

      {pickup_section}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Order ID</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#111827;font-size:13px;font-family:monospace;">{esc(order_id)}</td></tr>
        {paid_line}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 20px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr><th style="text-align:left;padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Item</th>
          <th style="text-align:right;padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Amount</th></tr>
        {item_rows}
        {discount_block}
        <tr><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#111827;">Total (incl. GST)</td>
          <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:800;color:#111827;">{currency} {total:,.2f}</td></tr>
      </table>

      {qr_section}

      <a href="{invoice_url}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px;">View Invoice Online</a>

      <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">Your PDF invoice is attached above. You can also view it online via the button above or in the Marketplace section of your Student Alumni dashboard.</p>
    """)

    try:
        ok = await send_email(email, f"Marketplace Order Confirmed — {order_id}", body, attachments=pdf_attachment)
        if ok:
            print(f"[MARKETPLACE] Order confirmation email sent to {email} for order {order_id}")
        else:
            print(f"[MARKETPLACE] Email provider failed for {email}")
    except Exception as e:
        print(f"[MARKETPLACE] Email error for {email}: {e}")


def _build_marketplace_invoice_html(order: dict) -> str:
    """Render a printable HTML invoice for a marketplace order."""
    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    order_id = order.get("id", "")
    total = float(order.get("final_amount", 0) or 0)
    discount = float(order.get("discount", 0) or 0)
    subtotal = float(order.get("subtotal", 0) or 0)
    taxable = float(order.get("taxable", subtotal) or 0)
    gst_total = float(order.get("gst_total", 0) or 0)
    gst_split = order.get("gst_split") or {}
    coupon_code = order.get("coupon_code") or ""
    currency = order.get("currency") or "INR"
    created = order.get("created_at") or ""
    payment_id = order.get("razorpay_payment_id") or ""
    user_name = esc(order.get("user_name") or "Customer")
    user_email = esc(order.get("user_email") or "")
    is_free = order.get("payment_status") == "free"

    rows = ""
    for item in order.get("items", []):
        name = esc(item.get("name", "Item"))
        qty = item.get("quantity", 1)
        line_total = float(item.get("line_total", 0) or 0)
        gst_rate = float(item.get("gst_rate", 0) or 0)
        stall = item.get("stall_no") or ""
        stall_str = f" <span style='color:#94a3b8;font-size:11px;'>(Stall {esc(stall)})</span>" if stall else ""
        rate_note = f"<span style='color:#94a3b8;font-size:11px;'> incl. GST {gst_rate*100:.0f}%</span>" if gst_rate else ""
        rows += f"""<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;">{name}{stall_str}{rate_note}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b;font-size:13px;">{qty}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#0f172a;font-weight:600;font-size:13px;">{currency} {line_total:,.2f}</td>
        </tr>"""

    discount_row = ""
    if discount > 0:
        discount_row = f"""<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#16a34a;font-size:13px;">Discount ({esc(coupon_code)})</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;"></td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#16a34a;font-weight:600;font-size:13px;">-{currency} {discount:,.2f}</td>
        </tr>"""

    gst_rows = ""
    if gst_total > 0:
        cgst = float(gst_split.get("cgst", gst_total / 2) or 0)
        sgst = float(gst_split.get("sgst", gst_total / 2) or 0)
        gst_rows = f"""
          <tr><td style="padding:10px 16px;color:#475569;font-size:13px;">Taxable Amount</td><td style="padding:10px 16px;"></td><td style="padding:10px 16px;text-align:right;color:#0f172a;font-weight:600;font-size:13px;">{currency} {taxable:,.2f}</td></tr>
          <tr><td style="padding:10px 16px;color:#475569;font-size:13px;">CGST (50%)</td><td style="padding:10px 16px;"></td><td style="padding:10px 16px;text-align:right;color:#0f172a;font-weight:600;font-size:13px;">{currency} {cgst:,.2f}</td></tr>
          <tr><td style="padding:10px 16px;color:#475569;font-size:13px;">SGST (50%)</td><td style="padding:10px 16px;"></td><td style="padding:10px 16px;text-align:right;color:#0f172a;font-weight:600;font-size:13px;">{currency} {sgst:,.2f}</td></tr>"""

    paid_str = "FREE" if is_free else f"{currency} {total:,.2f}"
    badge_text = "FREE ORDER" if is_free else "PAID"

    if created and "T" in str(created):
        created = str(created)[:16].replace("T", " ")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" /><title>Invoice {esc(order_id)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
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
      <div class="head-brand">STUDENT ALUMNI — MARKETPLACE</div>
      <div class="head-badge">{badge_text}</div>
    </div>
    <div class="body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
        <div><div style="font-size:20px;font-weight:700;">Invoice</div><div style="font-size:12px;color:#64748b;margin-top:2px;">{esc(order_id)}</div></div>
        <div style="text-align:right;"><div style="font-size:12px;color:#94a3b8;">Date</div><div style="font-size:13px;font-weight:600;">{esc(created)}</div></div>
      </div>
      <div class="meta-row">
        <div class="meta-col"><div class="meta-label">Billed To</div><div class="meta-val">{user_name}</div><div class="meta-sub">{user_email}</div></div>
        <div class="meta-col"><div class="meta-label">Payment</div><div class="meta-val">{paid_str}</div><div class="meta-sub">{esc(payment_id) or '—'}</div></div>
      </div>
      <table style="margin-top:20px;"><tr><th>Description</th><th style="text-align:center;">Qty</th><th class="r">Amount</th></tr>{rows}{discount_row}{gst_rows}
        <tr style="border-top:2px solid #e2e8f0;"><td style="padding:12px 16px;color:#0f172a;font-size:13px;font-weight:700;">Total (incl. GST)</td><td style="padding:12px 16px;"></td><td class="r" style="padding:12px 16px;color:#0f172a;font-weight:800;font-size:15px;">{currency} {total:,.2f}</td></tr></table>
      <div class="total"><div class="total-box"><div class="total-label">Total</div><div class="total-amt">{currency} {total:,.2f}</div></div></div>
    </div>
    <div class="foot"><div class="foot-text">Thank you for your purchase. Show your pickup QR at the event stall to collect your items.</div></div>
  </div>
</body>
</html>"""


# ── Public: catalog ─────────────────────────────────────────────────────────

@router.get("/showcases/{slug}/catalog")
async def get_showcase_catalog(slug: str, request: Request):
    """Return the active, in-stock marketplace catalog for an ECHO showcase."""
    import asyncio
    from fastapi.responses import JSONResponse

    showcase = await db.echo_showcases.find_one({
        "$or": [{"slug": slug}, {"aliases": slug}],
    })
    event_key = slug
    if showcase:
        event_key = str(showcase.get("_id")) if showcase.get("_id") else slug
    scopes = [event_key, slug, "master"]

    # Parallelize catalog queries
    results = await asyncio.gather(*[_catalog_for_event(s) for s in scopes])

    by_id = {}
    items = []
    for scope_items in results:
        for it in scope_items:
            key = it.get("id") or it.get("_id")
            if key and key not in by_id:
                by_id[key] = True
                items.append(it)
    items = _filter_active_items(items)

    response = JSONResponse({"success": True, "data": items, "event_id": event_key})
    # Cache for 30 seconds (catalog doesn't change often)
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    return response


# ── Checkout ────────────────────────────────────────────────────────────────

class CheckoutItemInput(BaseModel):
    item_id: str
    quantity: int = Field(1, ge=1)


class CheckoutRequest(BaseModel):
    event_id: str
    user_id: Optional[str] = None
    items: List[CheckoutItemInput]
    coupon_code: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None


@router.post("/orders/checkout")
async def marketplace_checkout(payload: CheckoutRequest, request: Request):
    """Create an order. Validates items are active and in-stock. Applies smart coupon evaluation."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Resolve catalog items across all scopes
    showcase = await db.echo_showcases.find_one({
        "$or": [{"slug": payload.event_id}, {"aliases": payload.event_id}],
    })
    event_key = payload.event_id
    if showcase and showcase.get("_id"):
        event_key = str(showcase.get("_id"))
    by_id = {}
    for scope in [event_key, payload.event_id, "master"]:
        for it in await _catalog_for_event(scope):
            key = it.get("id") or it.get("_id")
            by_id[key] = it
            if it.get("_id"):
                by_id[str(it.get("_id"))] = it

    # Resolve user for per-user coupon checks
    user = await _resolve_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in to place an order")
    user_id = str(user["_id"])

    order_items = []
    subtotal = 0.0
    gst_total = 0.0
    for line in payload.items:
        item = by_id.get(line.item_id) or by_id.get(str(line.item_id))
        if not item:
            raise HTTPException(status_code=404, detail=f"Item not found: {line.item_id}")
        # Validate availability
        if item.get("is_active") is False:
            raise HTTPException(status_code=400, detail=f"Item '{item.get('name', line.item_id)}' is currently unavailable")
        stock_limit = int(item.get("stock_limit", 0) or 0)
        stock_remaining = int(item.get("stock_remaining", stock_limit) or stock_limit)
        if stock_limit > 0 and line.quantity > stock_remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Only {stock_remaining} of '{item.get('name', line.item_id)}' remaining in stock",
            )
        price = float(item.get("price", 0))
        line_total = round(price * line.quantity, 2)
        gst_rate = gst_rate_for(item.get("category"))
        gst_amount = round(line_total * gst_rate, 2)
        subtotal += line_total
        gst_total += gst_amount
        order_items.append({
            "item_id": item.get("id") or item.get("_id"),
            "vendor_id": item.get("vendor_id"),
            "vendor_name": item.get("vendor_name"),
            "name": item.get("name"),
            "category": item.get("category", "food"),
            "price": price,
            "price_at_time": price,
            "quantity": line.quantity,
            "line_total": line_total,
            "gst_rate": gst_rate,
            "gst_amount": round(gst_amount, 2),
            "fulfillment_status": None,
            "stall_no": item.get("stall_no"),
            "stall_location": item.get("stall_location"),
        })

    # Smart coupon evaluation (vendor-aware)
    discount, applied_coupon, coupon_doc = await _evaluate_coupon(
        payload.coupon_code or "", subtotal, event_key, user_id, cart_items=order_items,
    )

    gst_total = round(gst_total, 2)
    taxable = round(subtotal - discount, 2)
    total = round(taxable + gst_total, 2)
    currency = "INR"
    user_name = (user.get("name") if user else None) or (payload.user_name or "Guest")
    user_email = (user.get("email") if user else None) or (payload.user_email or None)
    user_phone = (user.get("phone") if user else None) or (payload.user_phone or None)

    order_id = _new_order_id()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Build order doc
    base_doc = {
        "id": order_id,
        "event_id": payload.event_id,
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "user_phone": user_phone,
        "items": order_items,
        "subtotal": round(subtotal, 2),
        "taxable": taxable,
        "discount": round(discount, 2),
        "gst_total": gst_total,
        "gst_split": gst_split(gst_total),
        "currency": currency,
        "coupon_code": applied_coupon,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    if total <= 0:
        order_doc = {**base_doc, "final_amount": 0.0, "status": "paid", "payment_status": "free"}
        await db.echo_orders.insert_one(order_doc)
        if applied_coupon:
            await _bump_coupon_uses(applied_coupon)
        # Decrement stock
        for line in payload.items:
            item = by_id.get(line.item_id) or by_id.get(str(line.item_id))
            if item:
                await _decrement_stock(item.get("id") or item.get("_id"), line.quantity)
        # Send confirmation email
        await _send_marketplace_order_email(order_doc)
        return {"success": True, "amount": 0, "order_id": order_id, "free": True}

    # Paid: create Razorpay order
    cfg = await _razorpay_config()
    if not cfg:
        raise HTTPException(
            status_code=503,
            detail="Online payments are temporarily unavailable — please try again later",
        )
    rzp = await _razorpay_create_order(total, currency, order_id, {
        "type": "echo_marketplace",
        "event_id": payload.event_id,
        "order_id": order_id,
    })
    if not rzp:
        raise HTTPException(status_code=503, detail="Unable to create payment order")

    order_doc = {**base_doc, "final_amount": total, "status": "pending", "payment_status": "pending", "razorpay_order_id": rzp.get("id")}
    await db.echo_orders.insert_one(order_doc)

    return {
        "success": True,
        "amount": total,
        "order_id": order_id,
        "razorpay_order": rzp,
        "key_id": cfg.get("key_id", ""),
    }


class VerifyPaymentRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None


@router.post("/orders/verify-payment")
async def verify_marketplace_payment(payload: VerifyPaymentRequest, request: Request):
    """Verify Razorpay signature, mark paid, bump coupon, decrement stock, send email."""
    order = await db.echo_orders.find_one({"id": payload.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") == "paid":
        return {"success": True, "order_id": payload.order_id}

    cfg = await _razorpay_config()
    if not cfg:
        raise HTTPException(status_code=503, detail="Payments unavailable")
    if not payload.razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    expected = hmac.new(
        cfg["key_secret"].encode("utf-8"),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.echo_orders.update_one(
        {"id": payload.order_id},
        {"$set": {
            "status": "paid",
            "payment_status": "paid",
            "razorpay_payment_id": payload.razorpay_payment_id,
            "updated_at": now_iso,
        }},
    )

    if order.get("coupon_code"):
        await _bump_coupon_uses(order["coupon_code"])

    # Decrement stock
    for item in order.get("items", []):
        await _decrement_stock(item.get("item_id"), item.get("quantity", 1))

    # Send confirmation email
    order["status"] = "paid"
    order["payment_status"] = "paid"
    order["razorpay_payment_id"] = payload.razorpay_payment_id
    await _send_marketplace_order_email(order)

    return {"success": True, "order_id": payload.order_id}


# ── Stock helpers ────────────────────────────────────────────────────────────

async def _decrement_stock(item_id: str, quantity: int):
    """Decrement stock_remaining for a catalog item after an order is confirmed."""
    if not item_id:
        return
    try:
        oid = ObjectId(item_id)
    except Exception:
        return
    await db.echo_catalog_items.update_one(
        {"_id": oid, "stock_limit": {"$gt": 0}},
        {"$inc": {"stock_remaining": -quantity}},
    )


# ── Attendee pickup QR ──────────────────────────────────────────────────────

@router.get("/orders/{order_id}/qr")
async def order_pickup_qr(order_id: str, request: Request):
    """Generate the F&B pickup QR for a paid marketplace order."""
    order = await db.echo_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") != "paid":
        raise HTTPException(status_code=400, detail="Order is not paid yet")

    import qrcode
    import io
    import base64
    qr = qrcode.QRCode(version=1, box_size=10, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(order_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#5F259F", back_color="#FFFFFF")
    buf = io.BytesIO()
    getattr(img, "save")(buf, format="PNG")
    qr_image = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {"success": True, "order_id": order_id, "qr_image": qr_image, "status": order.get("status")}


# ── User: my marketplace orders ─────────────────────────────────────────────

@router.get("/my-marketplace-orders")
async def my_marketplace_orders(request: Request):
    """Return the current user's marketplace orders with item details."""
    user = await _resolve_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    email = (user.get("email") or "").strip().lower()
    uid = str(user["_id"])
    query = {"$or": [{"user_id": uid}]}
    if email:
        query = {"$or": [{"user_id": uid}, {"user_email": email}]}
    orders = await db.echo_orders.find(query).sort("created_at", -1).to_list(100)
    
    results = []
    for o in orders:
        ser = _serialize(o)
        slug = o.get("event_id") or o.get("event_slug")
        if slug:
            showcase = await db.event_showcases.find_one({"slug": slug})
            if showcase:
                ser["event_title"] = showcase.get("title") or showcase.get("name") or ser.get("event_title")
        results.append(ser)

    return {"success": True, "data": results}


# ── User: marketplace invoice ───────────────────────────────────────────────

@router.get("/marketplace-invoices/{order_id}")
async def marketplace_invoice(order_id: str, request: Request):
    """Render a printable HTML invoice for a marketplace order."""
    order = await db.echo_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Authorization: order owner, matching email, or admin
    user = await _resolve_user(request)
    is_admin = False
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            await _require_admin(request)
            is_admin = True
        except HTTPException:
            is_admin = False
    if not is_admin:
        allowed_email = (order.get("user_email") or "").strip().lower()
        owner_match = user is not None and (
            order.get("user_id") == str(user["_id"])
            or (user.get("email") or "").strip().lower() == allowed_email
        )
        email_match = request.query_params.get("email", "").strip().lower() == allowed_email
        if not owner_match and not email_match:
            raise HTTPException(status_code=403, detail="You do not have access to this invoice")

    html = _build_marketplace_invoice_html(order)
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


# ── Discount coupon preview (public, for cart UI) ───────────────────────────

@router.post("/orders/coupon-preview")
async def coupon_preview(payload: dict, request: Request):
    """Preview coupon discount + GST without placing an order."""
    code = (payload.get("code") or "").strip()
    subtotal = float(payload.get("subtotal", 0) or 0)
    event_id = payload.get("event_id", "")
    cart_items = payload.get("items") or []
    user = await _resolve_user(request)
    user_id = str(user["_id"]) if user else "anon"

    # Compute GST on the cart (per-category rates) for an accurate preview.
    gst_total = 0.0
    if cart_items:
        showcase = await db.echo_showcases.find_one({
            "$or": [{"slug": event_id}, {"aliases": event_id}],
        })
        event_key = event_id
        if showcase and showcase.get("_id"):
            event_key = str(showcase.get("_id"))
        by_id = {}
        for scope in [event_key, event_id, "master"]:
            for it in await _catalog_for_event(scope):
                if it.get("id"):
                    by_id[it["id"]] = it
                if it.get("_id"):
                    by_id[str(it["_id"])] = it
        for line in cart_items:
            item = by_id.get(str(line.get("item_id"))) if line.get("item_id") else None
            if not item:
                continue
            rate = gst_rate_for(item.get("category"))
            qty = int(line.get("quantity", 1) or 1)
            gst_total += float(item.get("price", 0)) * qty * rate
    gst_total = round(gst_total, 2)

    discount = 0.0
    applied = None
    doc = {}
    if code:
        # Build enriched cart items with vendor_id for vendor-scoped coupons
        enriched_items = []
        if cart_items:
            showcase2 = await db.echo_showcases.find_one({
                "$or": [{"slug": event_id}, {"aliases": event_id}],
            })
            event_key2 = event_id
            if showcase2 and showcase2.get("_id"):
                event_key2 = str(showcase2.get("_id"))
            by_id2 = {}
            for scope in [event_key2, event_id, "master"]:
                for it in await _catalog_for_event(scope):
                    if it.get("id"):
                        by_id2[it["id"]] = it
                    if it.get("_id"):
                        by_id2[str(it["_id"])] = it
            for line in cart_items:
                item = by_id2.get(str(line.get("item_id"))) if line.get("item_id") else None
                if item:
                    enriched_items.append({
                        "vendor_id": item.get("vendor_id"),
                        "price": float(item.get("price", 0)),
                        "quantity": int(line.get("quantity", 1) or 1),
                    })
        try:
            discount, applied, doc = await _evaluate_coupon(code, subtotal, event_id, user_id, cart_items=enriched_items or None)
        except HTTPException as e:
            return {"success": False, "error": e.detail}

    taxable = round(subtotal - discount, 2)
    return {"success": True, "discount": discount, "code": applied,
            "type": doc.get("discount_type"), "value": doc.get("discount_value"),
            "min_order_value": doc.get("min_order_value", 0),
            "max_discount": doc.get("max_discount", 0),
            "subtotal": round(subtotal, 2), "taxable": taxable,
            "gst": gst_total, "gst_split": gst_split(gst_total),
            "grand_total": round(taxable + gst_total, 2)}


# ── Admin: catalog ──────────────────────────────────────────────────────────

class AdminCatalogItemInput(BaseModel):
    name: str
    price: float
    category: str = "food"
    stock: int = 0
    stock_limit: Optional[int] = None
    description: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_id: Optional[str] = None
    images: List[str] = []
    image_base64: Optional[str] = None
    stall_no: Optional[str] = None
    stall_location: Optional[str] = None
    is_active: Optional[bool] = True


@router.get("/admin/showcases/{showcase_id}/catalog")
async def admin_list_catalog(showcase_id: str, request: Request, _=Depends(_require_admin)):
    items = await _catalog_for_event(showcase_id)
    return {"success": True, "data": items}


@router.post("/admin/showcases/{showcase_id}/catalog")
async def admin_create_catalog_item(showcase_id: str, payload: AdminCatalogItemInput, request: Request, _=Depends(_require_admin)):
    showcase = await db.echo_showcases.find_one({"_id": _oid_or(showcase_id)})
    event_id = str(showcase["_id"]) if showcase else showcase_id
    doc = payload.model_dump(exclude_none=True)
    doc["event_id"] = event_id
    if payload.stock_limit is None:
        doc["stock_limit"] = payload.stock
    doc.setdefault("stock_remaining", doc.get("stock_limit", doc.get("stock", 0)))
    doc["is_active"] = payload.is_active if payload.is_active is not None else True
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.echo_catalog_items.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return {"success": True, "data": _normalize_item(doc)}


@router.put("/admin/catalog/{item_id}")
async def admin_update_catalog_item(item_id: str, payload: dict, request: Request, _=Depends(_require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    allowed = {
        "name", "price", "category", "stock", "stock_limit", "stock_remaining",
        "description", "vendor_name", "vendor_id", "images", "image_base64",
        "stall_no", "stall_location", "is_active", "event_id",
    }
    update = {k: v for k, v in payload.items() if k in allowed and k != "_id"}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.echo_catalog_items.update_one({"_id": ObjectId(item_id)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True}


@router.delete("/admin/catalog/{item_id}")
async def admin_delete_catalog_item(item_id: str, request: Request, _=Depends(_require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    res = await db.echo_catalog_items.delete_one({"_id": ObjectId(item_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True}


# ── Admin: orders ───────────────────────────────────────────────────────────

@router.get("/admin/showcases/{showcase_id}/orders")
async def admin_list_orders(showcase_id: str, request: Request, _=Depends(_require_admin)):
    showcase = await db.echo_showcases.find_one({"_id": _oid_or(showcase_id)})
    event_id = str(showcase["_id"]) if showcase else showcase_id
    docs = await db.echo_orders.find({"event_id": {"$in": [event_id, showcase_id]}}).sort("created_at", -1).to_list(500)
    return {"success": True, "data": [_serialize(d) for d in docs]}


# ── Admin: discount coupons ─────────────────────────────────────────────────

class AdminCouponInput(BaseModel):
    code: str
    discount_type: str = "percentage"  # percentage|fixed|duration
    discount_value: float = 0
    duration_months: Optional[int] = None  # for duration type: 1, 2, 3, 6, 12
    event_id: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    max_uses: int = 0
    min_order_value: float = 0
    max_discount: float = 0
    per_user_limit: int = 0
    description: Optional[str] = None
    category: Optional[str] = "marketplace"  # marketplace|partner|event|promo
    locked: Optional[bool] = False  # locked coupons can't be used at checkout
    instructions: Optional[str] = None  # how to avail the coupon
    website_url: Optional[str] = None  # partner website URL
    logo_url: Optional[str] = None  # brand/partner logo (URL or base64 data URL)
    partner_name: Optional[str] = None  # partner/brand name (e.g. Coursera, Spotify)


@router.get("/admin/coupons")
async def admin_list_coupons(request: Request, event_slug: Optional[str] = None, _=Depends(_require_admin)):
    query = {}
    if event_slug:
        query["event_id"] = event_slug
    docs = await db.echo_discount_coupons.find(query).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        c = _serialize(d)
        c["code"] = c.get("code", "")
        c["discount_value"] = c.get("discount_value", 0)
        c["discount_type"] = c.get("discount_type", "percentage")
        c["uses_count"] = c.get("uses_count", 0) or 0
        c["max_uses"] = c.get("max_uses", 0) or 0
        c["min_order_value"] = c.get("min_order_value", 0) or 0
        c["max_discount"] = c.get("max_discount", 0) or 0
        c["per_user_limit"] = c.get("per_user_limit", 0) or 0
        out.append(c)
    return {"success": True, "data": out}


@router.get("/available-coupons")
async def list_available_coupons(event_id: str, category: Optional[str] = None):
    """Public endpoint: return active discount coupons for an event, optionally filtered by category."""
    from fastapi.responses import JSONResponse
    query: dict = {"active": True}
    if event_id:
        query["event_id"] = event_id
    if category:
        query["category"] = category
    docs = await db.echo_discount_coupons.find(query).sort("created_at", -1).to_list(50)
    out = []
    for d in docs:
        c = _serialize(d)
        out.append({
            "code": c.get("code", ""),
            "discount_type": c.get("discount_type", "percentage"),
            "discount_value": c.get("discount_value", 0),
            "duration_months": c.get("duration_months"),
            "min_order_value": c.get("min_order_value", 0),
            "max_discount": c.get("max_discount", 0),
            "vendor_id": c.get("vendor_id"),
            "vendor_name": c.get("vendor_name"),
            "category": c.get("category", "marketplace"),
            "description": c.get("description", ""),
            "locked": c.get("locked", False),
            "instructions": c.get("instructions", ""),
        })
    response = JSONResponse({"success": True, "data": out})
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    return response


@router.get("/coupons/by-category")
async def list_coupons_by_category(category: Optional[str] = None):
    """Public endpoint: return all active coupons grouped by category (for wallet page)."""
    query: dict = {"active": True}
    if category:
        query["category"] = category
    docs = await db.echo_discount_coupons.find(query).sort("created_at", -1).to_list(200)
    grouped: dict = {}
    for d in docs:
        c = _serialize(d)
        cat = c.get("category", "marketplace")
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append({
            "code": c.get("code", ""),
            "discount_type": c.get("discount_type", "percentage"),
            "discount_value": c.get("discount_value", 0),
            "duration_months": c.get("duration_months"),
            "min_order_value": c.get("min_order_value", 0),
            "max_discount": c.get("max_discount", 0),
            "vendor_name": c.get("vendor_name"),
            "partner_name": c.get("partner_name"),
            "event_id": c.get("event_id"),
            "description": c.get("description", ""),
            "category": cat,
            "locked": c.get("locked", False),
            "instructions": c.get("instructions", ""),
            "website_url": c.get("website_url"),
            "logo_url": c.get("logo_url"),
        })
    return {"success": True, "data": grouped}


@router.post("/admin/coupons")
async def admin_create_coupon(payload: AdminCouponInput, request: Request, _=Depends(_require_admin)):
    code = (payload.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required")
    existing = await db.echo_discount_coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=409, detail="Coupon code already exists")
    doc = {
        "code": code,
        "discount_type": payload.discount_type,
        "discount_value": payload.discount_value,
        "duration_months": payload.duration_months,
        "event_id": payload.event_id,
        "vendor_id": payload.vendor_id or None,
        "vendor_name": payload.vendor_name or None,
        "max_uses": payload.max_uses,
        "min_order_value": payload.min_order_value,
        "max_discount": payload.max_discount,
        "per_user_limit": payload.per_user_limit,
        "description": payload.description or "",
        "category": payload.category or "marketplace",
        "locked": payload.locked if payload.locked is not None else False,
        "instructions": payload.instructions or "",
        "website_url": payload.website_url or None,
        "logo_url": payload.logo_url or None,
        "partner_name": payload.partner_name or None,
        "uses_count": 0,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.echo_discount_coupons.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return {"success": True, "data": doc}


@router.put("/admin/coupons/{coupon_id}")
async def admin_update_coupon(coupon_id: str, payload: AdminCouponInput, request: Request, _=Depends(_require_admin)):
    """Update an existing discount coupon."""
    from bson import ObjectId
    try:
        oid = ObjectId(coupon_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid coupon ID")
    existing = await db.echo_discount_coupons.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found")
    code = (payload.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required")
    # Check code uniqueness if changed
    if code != existing.get("code"):
        dup = await db.echo_discount_coupons.find_one({"code": code})
        if dup:
            raise HTTPException(status_code=409, detail="Coupon code already exists")
    update = {
        "code": code,
        "discount_type": payload.discount_type,
        "discount_value": payload.discount_value,
        "duration_months": payload.duration_months,
        "event_id": payload.event_id,
        "vendor_id": payload.vendor_id or None,
        "vendor_name": payload.vendor_name or None,
        "partner_name": payload.partner_name or None,
        "max_uses": payload.max_uses,
        "min_order_value": payload.min_order_value,
        "max_discount": payload.max_discount,
        "per_user_limit": payload.per_user_limit,
        "description": payload.description or "",
        "category": payload.category or "marketplace",
        "locked": payload.locked if payload.locked is not None else False,
        "instructions": payload.instructions or "",
        "website_url": payload.website_url or None,
        "logo_url": payload.logo_url or None,
    }
    await db.echo_discount_coupons.update_one({"_id": oid}, {"$set": update})
    return {"success": True, "data": {**existing, **update, "_id": coupon_id}}


@router.delete("/admin/coupons/{coupon_id}")
async def admin_delete_coupon(coupon_id: str, request: Request, _=Depends(_require_admin)):
    """Delete a discount coupon."""
    from bson import ObjectId
    try:
        oid = ObjectId(coupon_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid coupon ID")
    result = await db.echo_discount_coupons.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"success": True}


# ── Helpers ─────────────────────────────────────────────────────────────────

async def _bump_coupon_uses(code: str):
    await db.echo_discount_coupons.update_one({"code": code}, {"$inc": {"uses_count": 1}})
