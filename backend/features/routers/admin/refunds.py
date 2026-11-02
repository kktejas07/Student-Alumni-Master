"""
refunds.py — Super Admin refund management (PY1).

Surfaces every refund-eligible transaction, executes full or partial refunds
through the payment gateway (Stripe Refund API when Stripe credentials are
installed, Razorpay otherwise), and records each refund append-only in the
`payment_refunds` collection.

Endpoints
  GET  /admin/refunds/candidates   — refundable transactions w/ already-refunded amount
  GET  /admin/refunds               — refund history (newest first)
  POST /admin/refunds               — issue a full/partial refund
  GET  /admin/refunds/export.csv    — CSV export of refund history
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from core.db import db
from core.deps import require_role
from core.email import render_html_email, send_email

router = APIRouter(prefix="/admin/refunds", tags=["Admin Refunds"])

# Refund reasons an admin can pick from — the audit trail stores the label.
REFUND_REASONS = [
    "Event cancelled",
    "Duplicate payment",
    "Attendee requested cancellation",
    "Technical failure / double charge",
    "Platform policy exception",
    "Other",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _as_date(value: Any) -> str:
    """Coerce a stored timestamp (str or datetime) into a YYYY-MM-DD string."""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, str):
        return value[:10]
    return ""


def _ser(doc: Optional[dict]) -> dict:
    if not doc:
        return {}
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["id"] = str(doc.get("_id", ""))
    return out


# ──────────────────────────────────────────────────────────────────────
#  Gateway adapters
# ──────────────────────────────────────────────────────────────────────

async def _stripe_secret() -> Optional[str]:
    tool = await db.installed_tools.find_one({"tool_id": "stripe", "status": "connected"})
    if not tool:
        return None
    sk = ((tool.get("credentials") or {}).get("secret_key") or "").strip()
    return sk or None


async def _razorpay_credentials() -> Optional[tuple]:
    tool = await db.installed_tools.find_one({"tool_id": "razorpay", "status": "connected"})
    if not tool:
        return None
    creds = tool.get("credentials") or {}
    key_id = (creds.get("key_id") or creds.get("api_key") or "").strip()
    key_secret = (creds.get("key_secret") or creds.get("api_secret") or "").strip()
    if not key_id or not key_secret:
        return None
    return key_id, key_secret


async def _stripe_refund(payment_id: str, amount_inr: Optional[float], reason: str) -> dict:
    """Create a Stripe refund. `amount_inr` None means full refund."""
    secret = await _stripe_secret()
    if not secret:
        return {"ok": False, "error": "Stripe is not connected"}

    # Resolve the charge so a payment intent id also works.
    charge_id = payment_id
    if not payment_id.startswith("ch_"):
        async with httpx.AsyncClient(timeout=20) as client:
            lookup = await client.get(
                f"https://api.stripe.com/v1/payment_intents/{payment_id}",
                auth=(secret, ""),
            )
            if lookup.status_code == 200:
                latest_charge = (lookup.json().get("latest_charge")) or ""
                if latest_charge:
                    charge_id = latest_charge

    data: Dict[str, str] = {"reason": "requested_by_customer"}
    if amount_inr is not None:
        data["amount"] = str(int(round(amount_inr * 100)))
    if reason:
        data["metadata[reason]"] = reason[:200]

    async with httpx.AsyncClient(timeout=25) as client:
        r = await client.post(
            "https://api.stripe.com/v1/refunds",
            auth=(secret, ""),
            data=data,
            params={"charge": charge_id},
        )
    if r.status_code not in (200, 201):
        return {"ok": False, "error": f"Stripe error {r.status_code}: {r.text[:200]}"}
    body = r.json()
    return {
        "ok": True,
        "gateway": "stripe",
        "gateway_refund_id": body.get("id"),
        "amount": (body.get("amount") or 0) / 100,
        "status": body.get("status") or "succeeded",
        "raw": {"charge": charge_id, "status": body.get("status")},
    }


async def _razorpay_refund(payment_id: str, amount_inr: Optional[float], reason: str) -> dict:
    """Create a Razorpay refund against a captured payment."""
    creds = await _razorpay_credentials()
    if not creds:
        return {"ok": False, "error": "Razorpay is not connected"}
    key_id, key_secret = creds

    async with httpx.AsyncClient(timeout=25) as client:
        # Razorpay refunds are always issued against a payment; fetch it first
        # so we know how much is still refundable.
        pr = await client.get(
            f"https://api.razorpay.com/v1/payments/{payment_id}",
            auth=(key_id, key_secret),
        )
        if pr.status_code != 200:
            return {"ok": False, "error": f"Razorpay error {pr.status_code}: {pr.text[:200]}"}
        payment = pr.json()
        paid_amount = float(payment.get("amount") or 0) / 100
        already = float(payment.get("amount_refunded") or 0) / 100
        refundable = round(paid_amount - already, 2)

        if refundable <= 0:
            return {"ok": False, "error": "Payment is already fully refunded"}

        amount = refundable if amount_inr is None else round(amount_inr, 2)
        if amount <= 0:
            return {"ok": False, "error": "Refund amount must be greater than zero"}
        if amount > refundable:
            return {"ok": False, "error": f"Refundable amount is only ₹{refundable}"}

        payload: Dict[str, Any] = {"amount": int(round(amount * 100))}
        if reason:
            payload["notes"] = {"reason": reason[:180]}
        rr = await client.post(
            f"https://api.razorpay.com/v1/payments/{payment_id}/refund",
            auth=(key_id, key_secret),
            json=payload,
        )
    if rr.status_code not in (200, 201):
        return {"ok": False, "error": f"Razorpay error {rr.status_code}: {rr.text[:200]}"}
    body = rr.json()
    return {
        "ok": True,
        "gateway": "razorpay",
        "gateway_refund_id": body.get("id"),
        "amount": (body.get("amount") or 0) / 100,
        "status": body.get("status") or "processed",
        "raw": {"payment_id": payment_id, "status": body.get("status")},
    }


# ──────────────────────────────────────────────────────────────────────
#  Transaction discovery
# ──────────────────────────────────────────────────────────────────────

async def _refunded_map() -> Dict[str, dict]:
    """Map payment_id → refund aggregate from the payment_refunds collection."""
    out: Dict[str, dict] = {}
    async for r in db.payment_refunds.find({"status": {"$ne": "failed"}}):
        pid = r.get("payment_id") or ""
        if not pid:
            continue
        entry = out.setdefault(pid, {"refunded": 0.0, "count": 0, "last_reason": "", "last_at": ""})
        entry["refunded"] = round(entry["refunded"] + float(r.get("amount") or 0), 2)
        entry["count"] += 1
        entry["last_reason"] = r.get("reason") or entry["last_reason"]
        entry["last_at"] = r.get("created_at") or entry["last_at"]
    return out


async def _collect_candidates() -> List[dict]:
    """Every captured transaction that can still be refunded."""
    refunded = await _refunded_map()
    candidates: List[dict] = []
    seen: set = set()

    # 1) ECHO event registrations (Razorpay)
    async for reg in db.echo_registrations.find({"payment.status": "paid"}).limit(3000):
        payment = reg.get("payment") or {}
        pid = payment.get("payment_id") or ""
        if not pid or pid.startswith("ADMIN_PAY_"):
            continue
        if pid in seen:
            continue
        seen.add(pid)
        amount = round(float(payment.get("amount") or reg.get("fee") or 0), 2)
        if amount <= 0:
            continue
        agg = refunded.get(pid, {})
        already = float(agg.get("refunded") or 0)
        candidates.append({
            "payment_id": pid,
            "gateway": payment.get("gateway") or "razorpay",
            "source": "event_registration",
            "description": f"ECHO registration — {reg.get('showcase_title') or reg.get('slug') or 'Event'}",
            "reference": reg.get("id") or str(reg.get("_id", "")),
            "event_slug": reg.get("slug") or reg.get("showcase_slug") or "",
            "payer": reg.get("full_name") or reg.get("email") or "Attendee",
            "payer_email": reg.get("email") or "",
            "date": _as_date(payment.get("paid_at") or reg.get("registered_at") or reg.get("created_at")),
            "amount": amount,
            "currency": payment.get("currency") or "INR",
            "refunded": already,
            "refund_count": agg.get("count", 0),
            "refundable": round(max(amount - already, 0), 2),
            "last_refund_reason": agg.get("last_reason") or "",
        })

    # 2) Mentor session bookings
    async for b in db.bookings.find({"payment_status": {"$in": ["paid", "success", "confirmed"]}}).limit(1000):
        amount = round(float(b.get("amount") or b.get("amount_paid") or 0), 2)
        pid = b.get("payment_id") or f"booking_{b.get('_id')}"
        if pid in seen:
            continue
        seen.add(pid)
        if amount <= 0:
            continue
        agg = refunded.get(pid, {})
        already = float(agg.get("refunded") or 0)
        candidates.append({
            "payment_id": pid,
            "gateway": b.get("gateway") or "stripe",
            "source": "mentor_booking",
            "description": f"Mentor session — {b.get('topic') or 'Career session'}",
            "reference": str(b.get("_id", "")),
            "event_slug": "",
            "payer": b.get("student_name") or b.get("student_email") or "Student",
            "payer_email": b.get("student_email") or "",
            "date": _as_date(b.get("created_at")),
            "amount": amount,
            "currency": b.get("currency") or "INR",
            "refunded": already,
            "refund_count": agg.get("count", 0),
            "refundable": round(max(amount - already, 0), 2),
            "last_refund_reason": agg.get("last_reason") or "",
        })

    candidates.sort(key=lambda c: (c.get("date") or ""), reverse=True)
    return candidates


# ──────────────────────────────────────────────────────────────────────
#  Endpoints
# ──────────────────────────────────────────────────────────────────────

@router.get("/candidates")
async def list_refund_candidates(user: dict = Depends(require_role("admin"))):
    """Refundable transactions with the amount already refunded per payment."""
    candidates = await _collect_candidates()
    has_stripe = bool(await _stripe_secret())
    has_razorpay = bool(await _razorpay_credentials())
    return {
        "ok": True,
        "candidates": candidates,
        "reasons": REFUND_REASONS,
        "gateways": {
            "stripe": has_stripe,
            "razorpay": has_razorpay,
        },
        "totals": {
            "count": len(candidates),
            "gross": round(sum(c["amount"] for c in candidates), 2),
            "refunded": round(sum(c["refunded"] for c in candidates), 2),
            "refundable": round(sum(c["refundable"] for c in candidates), 2),
        },
    }


@router.get("")
async def list_refunds(
    limit: int = 100,
    skip: int = 0,
    user: dict = Depends(require_role("admin")),
):
    """Refund history — newest first."""
    limit = max(1, min(int(limit or 100), 500))
    skip = max(0, int(skip or 0))
    total = await db.payment_refunds.count_documents({})
    cursor = db.payment_refunds.find({}).sort("created_at", -1).skip(skip).limit(limit)
    items = [_ser(r) async for r in cursor]
    return {
        "ok": True,
        "items": items,
        "total": total,
        "limit": limit,
        "skip": skip,
    }


class RefundRequest(BaseModel):
    payment_id: str
    amount: Optional[float] = None       # None → full refund
    reason: str = "Other"
    reason_note: Optional[str] = None
    notify_payer: bool = True


@router.post("")
async def create_refund(payload: RefundRequest, user: dict = Depends(require_role("admin"))):
    """Issue a full or partial refund through the payment gateway."""
    payment_id = (payload.payment_id or "").strip()
    if not payment_id:
        raise HTTPException(status_code=400, detail="payment_id is required")

    reason_label = (payload.reason or "Other").strip() or "Other"
    note = (payload.reason_note or "").strip()
    reason = f"{reason_label} — {note}" if note else reason_label

    candidates = {c["payment_id"]: c for c in await _collect_candidates()}
    candidate = candidates.get(payment_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="No refundable transaction found for that payment id")

    if candidate["refundable"] <= 0:
        raise HTTPException(status_code=400, detail="This transaction is already fully refunded")

    amount = candidate["refundable"] if payload.amount is None else round(float(payload.amount), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Refund amount must be greater than zero")
    if amount > candidate["refundable"]:
        raise HTTPException(
            status_code=400,
            detail=f"Refundable amount is only ₹{candidate['refundable']}",
        )

    gateway = candidate.get("gateway") or "stripe"
    if gateway == "stripe":
        result = await _stripe_refund(payment_id, amount, reason)
    else:
        result = await _razorpay_refund(payment_id, amount, reason)

    record = {
        "payment_id": payment_id,
        "gateway": gateway,
        "amount": amount,
        "currency": candidate.get("currency") or "INR",
        "type": "full" if amount >= candidate["refundable"] else "partial",
        "reason": reason,
        "reason_label": reason_label,
        "reason_note": note,
        "status": "succeeded" if result.get("ok") else "failed",
        "gateway_refund_id": result.get("gateway_refund_id"),
        "gateway_status": result.get("status"),
        "error": result.get("error"),
        "source": candidate.get("source"),
        "reference": candidate.get("reference"),
        "description": candidate.get("description"),
        "payer": candidate.get("payer"),
        "payer_email": candidate.get("payer_email"),
        "original_amount": candidate.get("amount"),
        "requested_by": {
            "user_id": str(user.get("_id", "")),
            "email": user.get("email") or "",
            "name": user.get("full_name") or "",
        },
        "created_at": _now_iso(),
    }
    await db.payment_refunds.insert_one(record)

    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result.get("error") or "Refund failed at the gateway")

    await db.admin_audit_log.insert_one({
        "user_id": str(user.get("_id", "")),
        "action": "payment.refunded",
        "target": payment_id,
        "amount": amount,
        "gateway": gateway,
        "gateway_refund_id": result.get("gateway_refund_id"),
        "reason": reason,
        "at": datetime.now(timezone.utc),
    })

    # Notify the payer
    if payload.notify_payer and candidate.get("payer_email"):
        try:
            body = f"""
            <h2 style="margin:0 0 8px 0;color:#111827;font-size:20px;">Refund processed</h2>
            <p style="margin:0 0 12px 0;color:#374151;font-size:14px;line-height:1.6;">
              Your refund of <strong>₹{amount:,.2f}</strong> for
              <strong>{candidate.get('description')}</strong> has been processed.
            </p>
            <p style="margin:0 0 12px 0;color:#6b7280;font-size:13px;">
              Payment reference: <span style="font-family:monospace;">{payment_id}</span><br/>
              Reason: {reason}<br/>
              Refund ID: <span style="font-family:monospace;">{result.get('gateway_refund_id') or '—'}</span>
            </p>
            <p style="margin:0;color:#6b7280;font-size:12px;">
              The amount usually reaches your account within 5–10 business days depending on your bank.
            </p>
            """
            await send_email(
                candidate["payer_email"],
                f"Refund processed — ₹{amount:,.2f}",
                render_html_email(body),
            )
        except Exception:
            pass

    return {
        "ok": True,
        "refund": _ser(record),
        "message": f"Refunded ₹{amount:,.2f} via {gateway}",
    }


@router.get("/export.csv")
async def export_refunds_csv(user: dict = Depends(require_role("admin"))):
    """CSV export of the full refund history."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "created_at", "payment_id", "gateway", "gateway_refund_id", "type", "amount",
        "currency", "status", "reason", "description", "payer", "payer_email",
        "requested_by", "original_amount",
    ])
    async for r in db.payment_refunds.find({}).sort("created_at", -1):
        writer.writerow([
            r.get("created_at", ""),
            r.get("payment_id", ""),
            r.get("gateway", ""),
            r.get("gateway_refund_id", ""),
            r.get("type", ""),
            r.get("amount", ""),
            r.get("currency", ""),
            r.get("status", ""),
            r.get("reason", ""),
            r.get("description", ""),
            r.get("payer", ""),
            r.get("payer_email", ""),
            (r.get("requested_by") or {}).get("email", ""),
            r.get("original_amount", ""),
        ])

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=refunds_export.csv"},
    )
