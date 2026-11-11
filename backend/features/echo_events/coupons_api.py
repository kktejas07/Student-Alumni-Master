"""Public my-coupons, scan, ICS + admin coupon endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations



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
        slug = coupon.get("slug")
        session_locked = False
        showcase = await db.echo_showcases.find_one({"slug": slug}) if slug else None
        if showcase:
            sessions = showcase.get("sessions") or []
            locked_keys = {s["key"] for s in sessions if s.get("locked")}
            if coupon.get("session_key") in locked_keys:
                session_locked = True
        return {
            "ok": True,
            "type": "coupon",
            "coupon_code": coupon.get("coupon_code"),
            "session_name": coupon.get("session_name"),
            "session_key": coupon.get("session_key"),
            "session_day": coupon.get("session_day") or 1,
            "used": coupon.get("used", False),
            "used_at": coupon.get("used_at"),
            "slug": slug,
            "session_locked": session_locked,
            "event_name": showcase.get("showcase_title") if showcase else "",
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


@router.get("/ics/{slug}")
async def echo_ics(slug: str, request: Request):
    """Generate an iCalendar (.ics) file for an ECHO showcase event.

    Used for 'Add to calendar' flows from the payment success screen.
    """
    from fastapi.responses import Response
    from datetime import datetime as _dt

    db = _get_db(request)
    showcase = await db.echo_showcases.find_one(_slug_query(slug))
    if not showcase:
        raise HTTPException(status_code=404, detail="Showcase not found")

    def _esc(s: str) -> str:
        return (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

    def _dt(v) -> str:
        try:
            if isinstance(v, str):
                v = _dt.strptime(v, "%Y-%m-%d")
            if isinstance(v, _dt):
                v = v
            else:
                from datetime import date as _d
                if isinstance(v, _d):
                    v = _dt.combine(v, _dt.min.time())
            return v.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        except Exception:
            return _dt.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    title = _esc(showcase.get("title") or showcase.get("showcase_title") or "ECHO Event")
    desc = _esc((showcase.get("description") or showcase.get("subtitle") or "")[:600])
    venue = _esc(showcase.get("venue") or showcase.get("location") or "Online")
    dates_raw = showcase.get("dates") or showcase.get("date") or showcase.get("date_pill") or ""
    time_str = showcase.get("time") or "09:00 AM"

    start_date = _dt(datetime.now(timezone.utc))
    end_date = _dt(datetime.now(timezone.utc))

    if dates_raw:
        try:
            parts = dates_raw.replace("–", "-").replace(" - ", " to ").split(" to ")
            start_part = parts[0].strip()
            end_part = parts[1].strip() if len(parts) > 1 else start_part
            for fmt in ["%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]:
                try:
                    start_date = _dt(datetime.strptime(start_part, fmt))
                    break
                except ValueError:
                    continue
            for fmt in ["%B %d, %Y", "%b %d, %Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]:
                try:
                    end_date = _dt(datetime.strptime(end_part, fmt))
                    break
                except ValueError:
                    end_date = start_date
        except Exception:
            pass

    uid = f"{slug}@studentalumni.in"
    now = _dt(datetime.now(timezone.utc))
    frontend_url = frontend_base_url()

    ics = "\r\n".join([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StudentAlumni//ECHO//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now}",
        f"DTSTART:{start_date}",
        f"DTEND:{end_date}",
        f"SUMMARY:{title}",
        f"DESCRIPTION:{desc}",
        f"LOCATION:{venue}",
        f"URL:{_esc(frontend_url + '/echo/' + slug)}",
        "END:VEVENT",
        "END:VCALENDAR",
    ])

    return Response(
        content=ics,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{slug}.ics"'},
    )


@router.post("/admin/scan-coupon")
async def scan_coupon(request: Request, admin=Depends(_require_scan_access)):
    """Scan a coupon QR code."""
    db = _get_db(request)
    body = await request.json()
    code = (body.get("code") or "").strip().upper()
    if not code:
        return {"ok": False, "status": "invalid", "message": "Coupon code is required"}

    coupon = await db.echo_coupons.find_one({"coupon_code": code})
    if not coupon:
        return {"ok": False, "status": "invalid", "message": f"Coupon '{code}' not found. Make sure this is a valid session pass from My Tickets."}
    # Check if session is locked
    if coupon.get("session_locked"):
        return {
            "ok": False,
            "status": "locked",
            "message": f"This session ({coupon.get('session_name', '')}) is currently locked. It will be available soon.",
            "coupon": {k: v for k, v in coupon.items() if k != "_id"},
        }
    if coupon.get("used"):
        return {
            "ok": False,
            "status": "already_used",
            "message": f"Already scanned at {coupon.get('used_at', 'unknown time')} by {coupon.get('scanned_by', 'unknown')}",
            "coupon": {k: v for k, v in coupon.items() if k != "_id"},
        }

    lat = body.get("lat")
    lng = body.get("lng")

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    update_data = {
        "used": True,
        "used_at": now.isoformat(),  # Store as ISO string with timezone
        "scanned_by": admin.get("email", "admin")
    }
    address = ""
    if lat is not None and lng is not None:
        update_data["scanned_lat"] = lat
        update_data["scanned_lng"] = lng
        address = await _reverse_geocode(lat, lng)
        if address:
            update_data["scanned_location"] = address

    await db.echo_coupons.update_one(
        {"_id": coupon["_id"]},
        {"$set": update_data}
    )

    # Get attendee info
    reg = await db.echo_registrations.find_one({"id": coupon.get("reg_id")})

    # Send coupon scan email (fire-and-forget)
    if reg:
        await _send_coupon_scan_email(
            reg,
            coupon.get("session_name", "Session"),
            code,
            now.strftime("%b %d, %Y · %I:%M %p UTC"),
            address,
        )

    return {
        "ok": True,
        "status": "valid",
        "message": f"Valid — {coupon.get('session_name', 'Session')} for {reg.get('full_name', 'Attendee') if reg else 'Attendee'}",
        "coupon": {
            "code": code,
            "session_name": coupon.get("session_name", "Session"),
            "session_day": coupon.get("session_day") or 1,
            "attendee_name": (reg.get("full_name") or reg.get("first_name") or "") if reg else "",
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


