"""Ticket verify / check-in endpoints (venue staff).

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── Ticket verification / check-in (venue staff) ─────────────────────────────
class AdminUpdateTeamSchema(BaseModel):
    team_members: List[dict] = []
    team_name: Optional[str] = None

class TicketVerifySchema(BaseModel):
    ticket: str
    lat: Optional[float] = None
    lng: Optional[float] = None  # raw QR scan payload or a bare registration id


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
    if not reg and parsed.get("reg_id") and len(parsed.get("reg_id")) == 8:
        # Fallback: short-code manual entry
        reg = await db.echo_registrations.find_one({"id": {"$regex": f"^{parsed.get('reg_id')}", "$options": "i"}})
    if not reg:
        raise HTTPException(status_code=404, detail="Ticket not found")

    payment = reg.get("payment") or {}
    ser = _ser(reg)
    payment_status = payment.get("status") or reg.get("payment_status") or "pending"
    reg_status = reg.get("status") or "pending"
    fee = float(reg.get("fee") or 0)
    
    is_free = fee <= 0 and (payment_status == "paid" or reg_status in ("registered", "confirmed"))
    is_paid = payment_status == "paid" and reg_status in ("registered", "confirmed")
    verified = is_free or is_paid
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
async def check_in_attendee(payload: TicketVerifySchema, request: Request, _=Depends(_require_scan_access)):
    """Check an attendee in at the venue (idempotent).

    Only confirmed (paid or free) registrations can be checked in. Returns the
    attendee summary plus a 'first_checkin' flag.
    """
    db = _get_db(request)
    parsed = _parse_ticket(payload.ticket)
    if not parsed:
        raise HTTPException(status_code=400, detail="Invalid ticket code — could not parse")

    query: Dict[str, Any] = {}
    if parsed.get("slug"):
        query["slug"] = parsed["slug"]
    reg_id = parsed.get("reg_id") or ""
    if reg_id:
        query["id"] = reg_id

    reg = await db.echo_registrations.find_one(query)
    # Exact lookup is case-sensitive; ids are stored in mixed case (e.g.
    # `dc08b4e9a27d`, `9a361543a98b_M1`, `Echo-A6F1B42219E50B32`). Fall back to a
    # case-insensitive exact match so scans resolve regardless of scanned casing.
    if not reg and reg_id:
        import re as _re
        escaped = _re.escape(reg_id)
        reg = await db.echo_registrations.find_one({
            "id": {"$regex": f"^{escaped}$", "$options": "i"},
            **( {"slug": parsed["slug"]} if parsed.get("slug") else {} ),
        })
    if not reg:
        raise HTTPException(status_code=404, detail="Ticket not found in registrations")

    payment = reg.get("payment") or {}
    payment_status = payment.get("status") or reg.get("payment_status") or "pending"
    reg_status = reg.get("status") or "pending"
    fee = float(reg.get("fee") or 0)

    is_free = fee <= 0 and (payment_status == "paid" or reg_status in ("registered", "confirmed"))
    is_paid = payment_status == "paid" and reg_status in ("registered", "confirmed")
    verified = is_free or is_paid

    if not verified:
        raise HTTPException(status_code=400, detail="Ticket not confirmed — attendee cannot be checked in. Payment may be pending.")

    now_iso = _now()
    first_checkin = not bool(reg.get("checked_in_at"))

    update_data: dict[str, Any] = {"checked_in_at": now_iso}
    address = ""
    if payload.lat is not None and payload.lng is not None:
        update_data["scanned_lat"] = payload.lat
        update_data["scanned_lng"] = payload.lng
        address = await _reverse_geocode(payload.lat, payload.lng)
        if address:
            update_data["scanned_location"] = address

    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": update_data, "$setOnInsert": {"checked_in_count": 1}},
    )
    if first_checkin:
        await db.echo_registrations.update_one(
            {"_id": reg["_id"]}, {"$inc": {"checked_in_count": 1}}
        )

    # Send check-in email (fire-and-forget)
    if first_checkin:
        event_title = reg.get("showcase_title") or reg.get("slug", "ECHO Event")
        await _send_checkin_email(reg, event_title, now_iso, address)

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


@router.patch("/admin/registrations/{reg_id}")
async def update_registration(reg_id: str, payload: dict, request: Request, _=Depends(_require_admin)):
    """Admin: update registration fields (email, full_name, phone, etc.)."""
    from bson import ObjectId
    db = _get_db(request)
    try:
        oid = ObjectId(reg_id)
    except Exception:
        oid = None
    reg = await db.echo_registrations.find_one({"_id": oid} if oid else {"id": reg_id})
    if not reg:
        raise HTTPException(404, "Registration not found")
    update = {}
    for k in ("email", "full_name", "phone", "college", "branch", "year", "slug"):
        if k in payload and payload[k] is not None:
            update[k] = str(payload[k]).strip()
    if not update:
        raise HTTPException(400, "No fields to update")
    await db.echo_registrations.update_one({"_id": reg["_id"]}, {"$set": update})
    # Also update coupons if email changed
    if "email" in update:
        await db.echo_coupons.update_many(
            {"reg_id": reg.get("id")},
            {"$set": {"attendee_email": update["email"]}}
        )
    updated = _ser(await db.echo_registrations.find_one({"_id": reg["_id"]}))
    return {"ok": True, "registration": updated}


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


