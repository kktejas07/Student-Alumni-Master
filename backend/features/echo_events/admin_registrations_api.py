"""Admin registrations, revenue, certificates, broadcast, export endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

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

    # Find all registrations for this user — match user_key, user_id, and email.
    # Use case-insensitive email match ($regex) to handle stored variations.
    query: dict = {"$or": [{"user_id": uid}, {"user_key": uid}]}
    if email:
        query["$or"].append({"email": email})
        # Also match case-insensitively for legacy registrations with mixed case
        query["$or"].append({"email": {"$regex": f"^{email}$", "$options": "i"}})
    regs = await db.echo_registrations.find(query).sort("created_at", -1).to_list(100)

    results = []
    for reg in regs:
        reg_ser = _ser(reg)
        slug = reg.get("showcase_slug") or reg.get("slug", "")

        # Build nested payment object for frontend compatibility
        payment = {}
        if "payment_status" in reg:
            payment["status"] = reg["payment_status"]
        if reg.get("failed_reason"):
            payment["failed_reason"] = reg["failed_reason"]
        if reg.get("failed_reason_code"):
            payment["failed_reason_code"] = reg["failed_reason_code"]
        if reg.get("paid_at"):
            payment["paid_at"] = reg["paid_at"]
        if reg.get("failed_at"):
            payment["failed_at"] = reg["failed_at"]
        if reg.get("amount"):
            payment["amount"] = reg["amount"]
        if reg.get("currency"):
            payment["currency"] = reg["currency"]
        if reg.get("razorpay_payment_id"):
            payment["payment_id"] = reg["razorpay_payment_id"]
        if reg.get("payment_provider"):
            payment["gateway"] = reg["payment_provider"]
        payment["method"] = reg.get("payment_provider") or "online"
        reg_ser["payment"] = payment

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

        # Fetch event/showcase details for title and banner
        showcase = None
        try:
            if slug:
                showcase = await db.event_showcases.find_one({"slug": slug})
        except Exception:
            pass

        if showcase:
            reg_ser["event_title"] = showcase.get("title") or showcase.get("name") or reg_ser.get("event_title")
            reg_ser["showcase_title"] = showcase.get("title") or showcase.get("name") or reg_ser.get("showcase_title")
            reg_ser["banner_url"] = showcase.get("banner_url") or showcase.get("cover_image") or reg_ser.get("banner_url")
            reg_ser["start_date"] = showcase.get("start_date") or reg_ser.get("start_date")

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
    showcase = await db.echo_showcases.find_one({"slug": reg.get("showcase_slug") or reg.get("slug")})

    # Payment gate: free events (fee <= 0 registered) are pass-eligible; paid
    # events only after the payment is verified (payment.status == "paid").
    fee = float(reg.get("fee") or 0)
    payment = reg.get("payment") or {}
    reg_status = reg.get("status") or "pending"
    payment_status = payment.get("status") or reg.get("payment_status") or "pending"
    
    is_free = fee <= 0 and (payment_status == "paid" or reg_status in ("registered", "confirmed"))
    is_paid = payment_status == "paid" and reg_status in ("registered", "confirmed")
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
        email_str = email.strip().lower() if isinstance(email, str) else ""
        email_match = bool(email_str and email_str in allowed_emails)
        if not owner_match and not email_match:
            raise HTTPException(status_code=403, detail="You do not have access to this ticket")
    
    html_content = _build_ticket_html(reg_ser, showcase or {}, reg.get("ticket_template"))
    if isinstance(format, str) and format.lower() == "json":
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
    has_sa_account: Optional[bool] = None,
    profile_status: Optional[str] = Query(None, description="'all', 'complete_100', 'incomplete', 'no_account'"),
    limit: int = Query(100000, ge=1, le=1000000),
    _=Depends(_require_admin),
):
    """List ECHO registrations with attendee, payment, SA account completion, and certificate details."""
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
    all_emails = list({r.get("email").lower().strip() for r in regs if r.get("email")})
    all_phones = list({r.get("phone").strip() for r in regs if r.get("phone")})

    # Batch-fetch issued artifacts (coupons + invoices)
    coupons_map: Dict[str, list] = {}
    invoice_map: Dict[str, dict] = {}
    if reg_ids:
        for c in await db.echo_coupons.find({"reg_id": {"$in": reg_ids}}).to_list(5000):
            used_at = c.get("used_at")
            if used_at and hasattr(used_at, 'isoformat'):
                used_at = used_at.isoformat()
            elif used_at and isinstance(used_at, str) and 'T' in used_at and '+' not in used_at and 'Z' not in used_at:
                used_at = used_at + 'Z'
            coupons_map.setdefault(c.get("reg_id"), []).append({
                "session_key": c.get("session_key"),
                "session_name": c.get("session_name"),
                "session_day": c.get("session_day") or 1,
                "coupon_code": c.get("coupon_code"),
                "used": bool(c.get("used")),
                "used_at": used_at,
                "scanned_location": c.get("scanned_location"),
                "scanned_lat": c.get("scanned_lat"),
                "scanned_lng": c.get("scanned_lng"),
                "scanned_by": c.get("scanned_by")
            })
        for inv in await db.invoices.find({"reg_id": {"$in": reg_ids}}).to_list(2000):
            invoice_map[inv.get("reg_id")] = {"invoice_no": inv.get("invoice_no"), "issued": True}

    # Batch-fetch SA accounts from db.users & compute profile completion
    user_map: Dict[str, dict] = {}
    if all_emails or all_phones:
        from services.profile_service import compute_profile_completion
        u_or = []
        if all_emails:
            u_or.append({"email": {"$in": all_emails}})
        if all_phones:
            u_or.append({"phone": {"$in": all_phones}})
        async for u in db.users.find({"$or": u_or}, {"password_hash": 0, "face_image_base64": 0}):
            comp_info = compute_profile_completion(u)
            u_data = {
                "user_id": str(u.get("_id")),
                "sa_id": u.get("sa_id") or (u.get("school_info") or {}).get("roll_number") or "",
                "email": u.get("email"),
                "phone": u.get("phone"),
                "full_name": u.get("full_name"),
                "role": u.get("role"),
                "profile_completion_pct": comp_info.get("percentage", 0),
                "is_profile_100": comp_info.get("percentage", 0) >= 100,
                "missing_items": [item["label"] for item in comp_info.get("items", []) if not item["done"]]
            }
            if u.get("email"):
                user_map[u.get("email").lower().strip()] = u_data
            if u.get("phone"):
                user_map[u.get("phone").strip()] = u_data

    # Batch-fetch issued certificates from db.certificates
    cert_map: Dict[str, list] = {}  # reg_id/email → list of cert docs
    frontend_url = frontend_base_url()
    if reg_ids or all_emails:
        c_or = []
        if reg_ids:
            c_or.append({"reg_id": {"$in": reg_ids}})
        if all_emails:
            c_or.append({"recipient_email": {"$in": all_emails}})
        async for c in db.certificates.find({"$or": c_or}):
            c_code = c.get("verification_code") or c.get("certificate_id") or c.get("id")
            c_data = {
                "id": c.get("id") or str(c.get("_id")),
                "verification_code": c_code,
                "title": c.get("title") or c.get("certification_name") or "ECHO Certificate",
                "category_key": c.get("category_key"),
                "issued_at": c.get("issued_at") or c.get("created_at"),
                "verify_url": f"{frontend_url}/certificates/verify/{c_code}",
                "image_url": c.get("image_url"),
            }
            for k in [c.get("reg_id"), c.get("recipient_email", "").lower().strip()]:
                if k:
                    cert_map.setdefault(k, [])
                    if c_code not in [x.get("verification_code") for x in cert_map[k]]:
                        cert_map[k].append(c_data)

    items = []
    for r in regs:
        s = _ser(r)
        payment = s.get("payment") or {}
        paid = payment.get("status") == "paid" and s.get("status") == "registered"
        rid = str(s.get("id") or "")
        inv_rec = invoice_map.get(rid) or {}
        
        u_email = (s.get("email") or "").lower().strip()
        u_phone = (s.get("phone") or "").strip()
        sa_user = user_map.get(u_email) or user_map.get(u_phone)
        has_sa = bool(sa_user or s.get("user_id") or u_email)

        if sa_user:
            comp_pct = sa_user.get("profile_completion_pct", 0)
        else:
            reg_eval = {
                "email": u_email,
                "full_name": s.get("full_name"),
                "institution": s.get("college"),
                "branch": s.get("branch"),
                "year_of_study": s.get("year"),
                "phone": u_phone,
            }
            eval_res = compute_profile_completion(reg_eval)
            comp_pct = eval_res.get("percentage", 0)

        # Allow explicitly flag or 100% score
        is_100 = bool(s.get("is_profile_100") or (sa_user and sa_user.get("is_profile_100")) or comp_pct >= 100)
        if is_100 and comp_pct < 100:
            comp_pct = 100

        certs_all = []
        _seen_codes = set()
        for _cc in (cert_map.get(rid) or []) + (cert_map.get(u_email) or []):
            _code = _cc.get("verification_code")
            if _code and _code not in _seen_codes:
                _seen_codes.add(_code)
                certs_all.append(_cc)
        cert_data = certs_all[0] if certs_all else None
        has_cert = bool(certs_all or s.get("certificate_issued") or s.get("has_3_certificates"))

        # Synthesize the 3-cert matrix from actual certs when the reg has no flags set
        c3 = s.get("certificates_3_status") or {}
        if not c3 and certs_all:
            def _match_cat(keyword: str):
                for cc in certs_all:
                    t = (cc.get("title") or "").lower()
                    ck = (cc.get("category_key") or "").lower()
                    if keyword in ck or keyword in t:
                        return {
                            "issued": True,
                            "code": cc.get("verification_code"),
                            "title": cc.get("title"),
                            "verify_url": cc.get("verify_url"),
                        }
                return None
            c3 = {
                "built_by_sunset": _match_cat("sunset") or {"issued": False, "code": None},
                "hackwave_participation": _match_cat("hackwave") or {"issued": False, "code": None},
                "cyber_conclave": _match_cat("cyber") or {"issued": False, "code": None},
            }

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
            "has_account": has_sa,
            "has_sa_account": has_sa,
            "profile_completion_pct": comp_pct,
            "is_profile_100": is_100,
            "sa_account": sa_user,
            "has_certificate": has_cert,
            "certificate": cert_data,
            "last_profile_reminder_at": s.get("last_profile_reminder_at"),
            "profile_reminder_count": s.get("profile_reminder_count") or 0,
            "failed_at": payment.get("failed_at"),
            "failed_reason": payment.get("failed_reason"),
            "reminder_sent_at": s.get("payment_reminder_sent_at"),
            "checked_in_at": s.get("checked_in_at"),
            "ticket_issued": paid and bool(s.get("qr_code_base64")),
            "coupons": coupons_map.get(rid) or [],
            "coupons_issued": len(coupons_map.get(rid) or []),
            "invoice_issued": bool(inv_rec.get("issued")),
            "registration_type": s.get("registration_type") or "individual",
            "source": s.get("source") or "our_platform",
            "team_name": s.get("team_name"),
            "team_size": s.get("team_size") or 1,
            "team_members": s.get("team_members") or [],
            "is_team_member": bool(s.get("is_team_member")),
            "parent_reg_id": s.get("parent_reg_id"),
            "team_leader_name": s.get("team_leader_name"),
            "team_leader_email": s.get("team_leader_email"),
            "certificates_3_status": c3,
            "has_3_certificates": s.get("has_3_certificates") or len([v for v in c3.values() if v.get("issued")]) >= 2,
            "cert_email_status": s.get("cert_email_status"),
            "cert_email_updated_at": s.get("cert_email_updated_at"),
        })

    # Apply filters
    filtered_items = items
    if has_sa_account is not None:
        filtered_items = [i for i in filtered_items if i["has_sa_account"] == has_sa_account]
    if profile_status:
        if profile_status == "complete_100":
            filtered_items = [i for i in filtered_items if i["is_profile_100"]]
        elif profile_status == "incomplete":
            filtered_items = [i for i in filtered_items if i["has_sa_account"] and not i["is_profile_100"]]
        elif profile_status == "no_account":
            filtered_items = [i for i in filtered_items if not i["has_sa_account"]]

    stats = {
        "total": len(items),
        "sa_members_count": sum(1 for i in items if i["has_sa_account"]),
        "members_100_percent_count": sum(1 for i in items if i["is_profile_100"]),
        "members_incomplete_count": sum(1 for i in items if i["has_sa_account"] and not i["is_profile_100"]),
        "non_sa_members_count": sum(1 for i in items if not i["has_sa_account"]),
        "certificates_issued_count": sum(1 for i in items if i["has_certificate"]),
    }

    return {
        "items": filtered_items,
        "total": len(filtered_items),
        "stats": stats
    }


@router.post("/admin/registrations/{reg_id}/issue-certificate")
async def admin_echo_issue_certificate(
    reg_id: str,
    request: Request,
    title: Optional[str] = Query(None, description="Custom certificate title"),
    _=Depends(_require_admin),
):
    """Issue a verifiable ECHO certificate for a registration."""
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg and ObjectId.is_valid(reg_id):
        reg = await db.echo_registrations.find_one({"_id": ObjectId(reg_id)})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    email = reg.get("email", "").lower().strip()
    full_name = reg.get("full_name", "").strip() or "ECHO Participant"
    showcase_title = reg.get("showcase_title") or "ECHO Showcase 2026"
    cert_title = title or f"Certificate of Completion — {showcase_title}"
    
    code = f"ECHO26-CERT-{secrets.token_hex(4).upper()}"
    frontend_url = frontend_base_url()
    verify_url = f"{frontend_url}/certificates/verify/{code}"

    cert_doc = {
        "id": code,
        "certificate_id": code,
        "verification_code": code,
        "title": cert_title,
        "certification_name": cert_title,
        "recipient_name": full_name,
        "recipient_email": email,
        "recipient_phone": reg.get("phone"),
        "roll_number": reg.get("roll_number") or reg.get("sa_id") or "",
        "reg_id": reg.get("id"),
        "slug": reg.get("slug"),
        "showcase_title": showcase_title,
        "issuer": "StudentAlumni × ECHO Showcase",
        "issued_at": _now(),
        "issue_date": datetime.now(timezone.utc).strftime("%d %B %Y"),
        "created_at": _now(),
        "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
        "verify_url": verify_url,
    }

    await db.certificates.update_one({"verification_code": code}, {"$set": cert_doc}, upsert=True)
    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": {
            "certificate_issued": True,
            "certificate_code": code,
            "certificate_url": verify_url,
            "certificate_issued_at": _now(),
        }}
    )

    try:
        email_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
          <h2 style="color: #6D28D9;">Your ECHO Certificate is Ready! 🎓</h2>
          <p>Dear <strong>{full_name}</strong>,</p>
          <p>Congratulations! Your official certificate for <strong>{showcase_title}</strong> has been issued.</p>
          <div style="margin: 20px 0; padding: 16px; background: #F3E8FF; border-radius: 12px; border: 1px solid #DDD6FE;">
            <p style="margin: 0; font-weight: bold; color: #5B21B6;">Verification Code: {code}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px;"><a href="{verify_url}" style="color: #6D28D9; font-weight: bold;">Click here to View & Verify Certificate</a></p>
          </div>
          <p style="font-size: 13px; color: #6B7280;">You can share this link on LinkedIn, your resume, or with employers.</p>
        </div>
        """
        await send_email(email, f"🎓 Your Certificate for {showcase_title}", render_html_email(email_content))
    except Exception as e:
        logger.warning(f"Certificate email notice error: {e}")

    return {
        "status": "success",
        "message": f"Certificate issued for {full_name}",
        "code": code,
        "verify_url": verify_url,
        "certificate": cert_doc
    }


async def issue_3_echo_certificates(db, reg: dict) -> dict:
    """
    Issue 3 official certificates for Hackwave 3.0 / ECHO Showcase:
      1. Built by Sunset (Project Build Certificate)
      2. Common Certificate of Participation — Hackwave 3.0
      3. Cyber Conclave Certificate
    Upserts into db.certificates (enabling /certificates/verify/{code} & profile sync).
    """
    frontend_url = frontend_base_url()
    email = (reg.get("email") or "").lower().strip()
    full_name = (reg.get("full_name") or "").strip() or "ECHO Participant"
    showcase_title = reg.get("showcase_title") or "Hackwave 3.0"
    reg_id = reg.get("id") or str(reg.get("_id"))
    
    cert_types = [
        ("built_by_sunset", "Built by Sunset — Project Build Certificate", "HW3-SUNSET"),
        ("hackwave_participation", f"Certificate of Participation — {showcase_title}", "HW3-PART"),
        ("cyber_conclave", "Cyber Conclave — Professional Certificate", "HW3-CYBER"),
    ]

    existing_certs = reg.get("certificates_3_status") or {}
    results = {}
    now_str = _now()

    for key, title, prefix in cert_types:
        existing = existing_certs.get(key)
        if existing and existing.get("code"):
            code = existing["code"]
        else:
            # Email-level dedup: one set of certs per email per category per event.
            # Re-issues across repeat registrations must reuse the original code,
            # otherwise one user accumulates N×3 certificates in My Certificates.
            code = None
            if email:
                # Legacy docs predate category_key — match it OR the exact title.
                prior = await db.certificates.find_one({
                    "recipient_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"},
                    "slug": reg.get("slug"),
                    "$or": [{"category_key": key}, {"title": title}],
                })
                if prior:
                    code = prior.get("verification_code") or prior.get("certificate_id") or prior.get("id")
            if not code:
                code = f"{prefix}-{secrets.token_hex(4).upper()}"

        verify_url = f"{frontend_url}/certificates/verify/{code}"
        
        cert_doc = {
            "id": code,
            "certificate_id": code,
            "verification_code": code,
            "title": title,
            "certification_name": title,
            "category_key": key,
            "recipient_name": full_name,
            "recipient_email": email,
            "recipient_phone": reg.get("phone"),
            "roll_number": reg.get("roll_number") or reg.get("sa_id") or "",
            "reg_id": reg_id,
            "slug": reg.get("slug"),
            "showcase_title": showcase_title,
            "issuer": "StudentAlumni × Hackwave 3.0",
            "issued_at": now_str,
            "issue_date": datetime.now(timezone.utc).strftime("%d %B %Y"),
            "created_at": now_str,
            "status": "valid",
            "status_label": "Officially Verified Certificate",
            "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
            "verify_url": verify_url,
        }

        await db.certificates.update_one({"verification_code": code}, {"$set": cert_doc}, upsert=True)
        results[key] = {
            "issued": True,
            "code": code,
            "title": title,
            "verify_url": verify_url,
            "delivered_at": now_str,
        }

    # Update echo_registrations document with 3-certificate delivery status
    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$set": {
            "certificates_3_status": results,
            "has_3_certificates": True,
            "certificate_issued": True,
            "certificate_code": results["hackwave_participation"]["code"],
            "certificate_url": results["hackwave_participation"]["verify_url"],
            "certificates_delivered_count": 3,
            "certificates_updated_at": now_str,
        }}
    )

    return results


async def _send_single_cert_email(
    email: str,
    full_name: str,
    title: str,
    code: str,
    verify_url: str,
    idx: int,
    total: int,
) -> bool:
    """Send ONE individual certificate email (professional template). Returns True on provider accept."""
    from core.email_templates import render_single_cert_email
    email_content = render_single_cert_email(full_name, title, code, verify_url, idx, total)
    try:
        return bool(await send_email(email, f"🎓 {title} — {code}", email_content))
    except Exception as e:
        logger.warning(f"Single-cert email error ({code}): {e}")
        return False


ORDERED_3_CERT_KEYS = ["built_by_sunset", "hackwave_participation", "cyber_conclave"]


async def _issue_3_with_emails(db, reg: dict, force_resend: bool = False) -> tuple:
    """Issue all 3 certs for one registration + per-cert individual emails.

    force_resend=False skips regs that already have all 3 codes AND emailed
    status (safe to re-run bulk without spamming). Returns
    (certs, email_status, new_count, skipped).
    """
    pre = reg.get("certificates_3_status") or {}
    pre_codes = {k: (pre.get(k) or {}).get("code") for k in ORDERED_3_CERT_KEYS}
    pre_emailed = {
        k: bool((pre.get(k) or {}).get("email_sent"))
        or bool(((reg.get("cert_email_status") or {}).get(k) or {}).get("email_sent"))
        for k in ORDERED_3_CERT_KEYS
    }

    certs = await issue_3_echo_certificates(db, reg)
    new_count = sum(1 for k in ORDERED_3_CERT_KEYS if certs.get(k, {}).get("code") != pre_codes.get(k))

    if not force_resend and new_count == 0 and all(pre_emailed.values()):
        return certs, {k: {"email_sent": True, "skipped_resend": True,
                           "code": (certs.get(k) or {}).get("code")} for k in ORDERED_3_CERT_KEYS}, 0, True

    email = (reg.get("email") or "").lower().strip()
    full_name = (reg.get("full_name") or "").strip() or "ECHO Participant"
    email_status: dict = {}
    now_str = _now()
    try:
        total = len([k for k in ORDERED_3_CERT_KEYS if k in certs])
        for i, key in enumerate(ORDERED_3_CERT_KEYS, start=1):
            c = certs.get(key)
            if not c:
                continue
            title = c.get("title", key)
            code = c.get("code", "")
            verify_url = c.get("verify_url", "")
            sent = await _send_single_cert_email(email, full_name, title, code, verify_url, i, total) if email else False
            err = None if sent else ("no recipient email" if not email else "provider rejected / not configured — see email_failures")
            email_status[key] = {
                "email_sent": sent,
                "email_sent_at": now_str if sent else None,
                "email_error": err,
                "code": code,
                "title": title,
            }
            certs[key]["email_sent"] = sent
            certs[key]["email_sent_at"] = now_str if sent else None
            certs[key]["email_error"] = err
        await db.echo_registrations.update_one(
            {"_id": reg["_id"]},
            {"$set": {
                "certificates_3_status": certs,
                "cert_email_status": email_status,
                "cert_email_updated_at": now_str,
            }},
        )
        for key in ORDERED_3_CERT_KEYS:
            c = certs.get(key)
            if c and c.get("code"):
                await db.certificates.update_one(
                    {"verification_code": c["code"]},
                    {"$set": {
                        "email_sent": c.get("email_sent", False),
                        "email_sent_at": c.get("email_sent_at"),
                        "email_error": c.get("email_error"),
                    }},
                )
    except Exception as e:
        logger.warning(f"Issue-3-certificates per-cert email error: {e}")

    return certs, email_status, new_count, False


@router.post("/admin/registrations/{reg_id}/issue-3-certificates")
async def admin_echo_issue_3_certificates(
    reg_id: str,
    request: Request,
    _=Depends(_require_admin),
):
    """Issue all 3 certificates (Built by Sunset, Hackwave 3.0, Cyber Conclave) for a registration."""
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg and ObjectId.is_valid(reg_id):
        reg = await db.echo_registrations.find_one({"_id": ObjectId(reg_id)})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Per-certificate individual emails (1 email per cert — scales to 1..N certs)
    # + per-cert delivery status persisted for admin visibility.
    certs, email_status, _new_count, _skipped = await _issue_3_with_emails(db, reg, force_resend=True)

    sent_count = sum(1 for v in email_status.values() if v.get("email_sent"))
    return {
        "status": "success",
        "message": f"All 3 certificates issued for {reg.get('full_name')} — {sent_count}/3 emails sent",
        "certificates": certs,
        "email_status": email_status,
    }


@router.post("/admin/bulk-issue-3-certificates")
async def admin_echo_bulk_issue_3_certificates(
    request: Request,
    slug: Optional[str] = Query(None, description="Optional showcase slug filter"),
    resend: bool = Query(False, description="Resend emails even where already sent"),
    _=Depends(_require_admin),
):
    """One-click bulk: issue all 3 certificates to ALL registrations at once.

    Dedup-safe (email+category+event reuse) — re-runs skip fully-issued+emailed
    regs unless resend=true. Returns per-run summary with email delivery counts.
    """
    db = _get_db(request)
    q: dict = {"slug": slug} if slug else {}
    regs = await db.echo_registrations.find(q).to_list(10000)

    processed = 0
    regs_new_certs = 0
    emails_sent = 0
    emails_failed = 0
    skipped = 0
    failures: list = []
    for reg in regs:
        try:
            _certs, estatus, new_count, was_skipped = await _issue_3_with_emails(
                db, reg, force_resend=resend
            )
            processed += 1
            if was_skipped:
                skipped += 1
                emails_sent += sum(1 for v in estatus.values() if v.get("email_sent"))
                continue
            if new_count > 0:
                regs_new_certs += 1
            emails_sent += sum(1 for v in estatus.values() if v.get("email_sent"))
            emails_failed += sum(1 for v in estatus.values() if not v.get("email_sent"))
        except Exception as e:
            failures.append({"reg_id": reg.get("id"), "email": reg.get("email"), "error": str(e)[:200]})

    return {
        "status": "success",
        "message": f"Bulk issue complete: {processed} processed, {regs_new_certs} newly issued, {emails_sent} emails sent, {skipped} skipped (already done)",
        "total_registrations": len(regs),
        "processed": processed,
        "regs_newly_issued": regs_new_certs,
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "skipped_already_done": skipped,
        "failures": failures[:50],
    }


@router.post("/admin/registrations/{reg_id}/reset-certificates")
async def admin_echo_reset_certificates(
    reg_id: str,
    request: Request,
    _=Depends(_require_admin),
):
    """Reset certificate issued flags on a registration so it can be re-issued.

    Clears: certificate_issued, has_3_certificates, certificates_3_status,
    cert_email_status, certificate_code, certificate_url.
    Does NOT delete existing db.certificates docs (those remain verifiable).
    """
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg and ObjectId.is_valid(reg_id):
        reg = await db.echo_registrations.find_one({"_id": ObjectId(reg_id)})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    await db.echo_registrations.update_one(
        {"_id": reg["_id"]},
        {"$unset": {
            "certificate_issued": "",
            "has_3_certificates": "",
            "certificates_3_status": "",
            "cert_email_status": "",
            "cert_email_updated_at": "",
            "certificate_code": "",
            "certificate_url": "",
            "certificate_issued_at": "",
            "certificates_delivered_count": "",
            "certificates_updated_at": "",
        }},
    )
    return {"status": "success", "message": f"Certificate flags reset for {reg.get('full_name')} — ready to re-issue"}


@router.post("/admin/certificates/upload-template")
async def admin_echo_upload_cert_template(
    request: Request,
    category: str = Body(..., description="built_by_sunset, hackwave_participation, cyber_conclave"),
    title: str = Body(..., description="Template title"),
    file_url: str = Body(..., description="Template file URL or base64"),
    _=Depends(_require_admin),
):
    """Upload or configure a custom certificate template asset for Hackwave / ECHO events."""
    db = _get_db(request)
    template_doc = {
        "category": category,
        "title": title,
        "file_url": file_url,
        "updated_at": _now(),
    }
    await db.echo_cert_templates.update_one({"category": category}, {"$set": template_doc}, upsert=True)
    return {"status": "success", "template": template_doc}


@router.get("/admin/certificates/templates")
async def admin_echo_get_cert_templates(request: Request, _=Depends(_require_admin)):
    """List configured certificate templates for ECHO events."""
    db = _get_db(request)
    items = await db.echo_cert_templates.find({}).to_list(100)
    for i in items:
        i["_id"] = str(i["_id"])
    return {"templates": items}


@router.post("/admin/showcases/{slug}/bulk-issue-certificates")
async def admin_echo_bulk_issue_certificates(
    slug: str,
    request: Request,
    _=Depends(_require_admin),
):
    """Bulk issue certificates for all registered/paid attendees of an ECHO showcase."""
    db = _get_db(request)
    regs = await db.echo_registrations.find({"slug": slug, "payment.status": "paid"}).to_list(10000)
    if not regs:
        regs = await db.echo_registrations.find({"slug": slug, "status": "registered"}).to_list(10000)

    frontend_url = frontend_base_url()
    issued_count = 0
    skipped_count = 0

    for reg in regs:
        if reg.get("certificate_issued"):
            skipped_count += 1
            continue
        email = reg.get("email", "").lower().strip()
        full_name = reg.get("full_name", "").strip() or "ECHO Participant"
        showcase_title = reg.get("showcase_title") or "ECHO Showcase"
        code = f"ECHO26-CERT-{secrets.token_hex(4).upper()}"
        verify_url = f"{frontend_url}/certificates/verify/{code}"

        cert_doc = {
            "id": code,
            "certificate_id": code,
            "verification_code": code,
            "title": f"Certificate of Completion — {showcase_title}",
            "certification_name": f"Certificate of Completion — {showcase_title}",
            "recipient_name": full_name,
            "recipient_email": email,
            "recipient_phone": reg.get("phone"),
            "roll_number": reg.get("roll_number") or reg.get("sa_id") or "",
            "reg_id": reg.get("id"),
            "slug": slug,
            "showcase_title": showcase_title,
            "issuer": "StudentAlumni × ECHO Showcase",
            "issued_at": _now(),
            "issue_date": datetime.now(timezone.utc).strftime("%d %B %Y"),
            "created_at": _now(),
            "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
            "verify_url": verify_url,
        }
        await db.certificates.update_one({"verification_code": code}, {"$set": cert_doc}, upsert=True)
        await db.echo_registrations.update_one(
            {"_id": reg["_id"]},
            {"$set": {
                "certificate_issued": True,
                "certificate_code": code,
                "certificate_url": verify_url,
                "certificate_issued_at": _now(),
            }}
        )
        issued_count += 1

    return {
        "status": "success",
        "issued_count": issued_count,
        "skipped_count": skipped_count,
        "total_registrations": len(regs)
    }


@router.get("/registrations/{reg_id}/certificate")
async def get_echo_registration_certificate(
    reg_id: str,
    request: Request,
):
    """Public / Attendee endpoint to fetch certificate status & verification details."""
    db = _get_db(request)
    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg and ObjectId.is_valid(reg_id):
        reg = await db.echo_registrations.find_one({"_id": ObjectId(reg_id)})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    email = reg.get("email", "").lower().strip()
    cert = await db.certificates.find_one({"$or": [{"reg_id": reg.get("id")}, {"recipient_email": email}]})
    
    frontend_url = frontend_base_url()
    from urllib.parse import quote

    if not cert and reg.get("certificate_code"):
        code = reg.get("certificate_code")
        verify_url = f"{frontend_url}/certificates/verify/{code}"
        wa_text = quote(f"🎓 Check out my certificate for {reg.get('showcase_title', 'ECHO')} on StudentAlumni: {verify_url}")
        return {
            "has_certificate": True,
            "verification_code": code,
            "title": f"Certificate of Completion — {reg.get('showcase_title', 'ECHO')}",
            "recipient_name": reg.get("full_name"),
            "verify_url": verify_url,
            "share_url": f"https://wa.me/?text={wa_text}"
        }

    if not cert:
        return {"has_certificate": False, "message": "No certificate issued yet for this registration."}

    code = cert.get("verification_code") or cert.get("certificate_id") or cert.get("id")
    verify_url = f"{frontend_url}/certificates/verify/{code}"
    wa_text = quote(f"🎓 Check out my verified certificate for {cert.get('title', 'ECHO Showcase')} on StudentAlumni!\n\nVerify URL: {verify_url}")
    
    return {
        "has_certificate": True,
        "verification_code": code,
        "title": cert.get("title") or cert.get("certification_name"),
        "recipient_name": cert.get("recipient_name"),
        "issue_date": cert.get("issue_date") or cert.get("issued_at"),
        "verify_url": verify_url,
        "share_url": f"https://wa.me/?text={wa_text}",
        "certificate": {
            "id": cert.get("id"),
            "verification_code": code,
            "title": cert.get("title"),
            "recipient_name": cert.get("recipient_name"),
            "issuer": cert.get("issuer", "StudentAlumni"),
            "image_url": cert.get("image_url")
        }
    }


@router.post("/admin/send-profile-reminders")
async def admin_echo_send_profile_reminders(
    request: Request,
    slug: Optional[str] = Query(None, description="Optional showcase slug filter"),
    target_group: str = Query("all_incomplete", description="'no_account', 'incomplete_profile', or 'all_incomplete'"),
    channel: str = Query("both", description="'email', 'whatsapp', or 'both'"),
    _=Depends(_require_admin),
):
    """Loop agent service: scans ECHO registrants without an SA account or with incomplete profile (<100%),
    and sends automated reminder notifications via Email and WhatsApp/SMS.
    """
    from services.agents.echo_profile_loop_agent import echo_profile_loop_agent
    return await echo_profile_loop_agent.execute_cycle(slug=slug, target_group=target_group, channel=channel)


@router.get("/admin/loop-agent/status")
async def admin_echo_loop_agent_status(
    request: Request,
    _=Depends(_require_admin),
):
    """Get status of the ECHO profile completion & account activation autonomous loop agent."""
    from services.agents.echo_profile_loop_agent import echo_profile_loop_agent
    return echo_profile_loop_agent.get_status()


@router.post("/admin/loop-agent/start")
async def admin_echo_loop_agent_start(
    request: Request,
    interval_seconds: int = Query(3600, ge=60, le=86400, description="Loop interval in seconds"),
    _=Depends(_require_admin),
):
    """Start the background recurring loop agent for 100% profile reminders."""
    from services.agents.echo_profile_loop_agent import echo_profile_loop_agent
    started = echo_profile_loop_agent.start_background_loop(interval_seconds=interval_seconds)
    return {
        "status": "success" if started else "already_running",
        "message": "Background loop agent started." if started else "Loop agent is already running.",
        "agent": echo_profile_loop_agent.get_status(),
    }


@router.post("/admin/loop-agent/stop")
async def admin_echo_loop_agent_stop(
    request: Request,
    _=Depends(_require_admin),
):
    """Stop the background recurring loop agent."""
    from services.agents.echo_profile_loop_agent import echo_profile_loop_agent
    stopped = echo_profile_loop_agent.stop_background_loop()
    return {
        "status": "success" if stopped else "not_running",
        "message": "Background loop agent stopped." if stopped else "Loop agent was not running.",
        "agent": echo_profile_loop_agent.get_status(),
    }




@router.get("/admin/export-csv")
@router.get("/export-csv")
async def export_echo_registrations_csv(
    request: Request,
    slug: Optional[str] = None,
    status: Optional[str] = None,
    _=Depends(_require_admin),
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


@router.get("/admin/export-incomplete-profiles-csv")
@router.get("/export-incomplete-profiles-csv")
async def export_incomplete_profiles_csv(
    request: Request,
    slug: Optional[str] = None,
    filter_type: Optional[str] = Query("all", description="'all', 'no_account', 'incomplete_profile'"),
    _=Depends(_require_admin),
):
    """
    Generate and stream CSV of registrants who do NOT have an SA account or have incomplete (<100%) profiles.
    Includes full name, email, phone, college, account status, completion %, missing items, and registration date.
    """
    import csv
    import io
    from fastapi.responses import Response
    from services.profile_service import compute_profile_completion

    db = _get_db(request)
    query: Dict[str, Any] = {}
    if slug:
        query["slug"] = slug

    regs = await db.echo_registrations.find(query).sort("created_at", -1).to_list(10000)

    # Collect emails and phones for batch lookup
    all_emails = list({r.get("email").lower().strip() for r in regs if r.get("email")})
    all_phones = list({r.get("phone").strip() for r in regs if r.get("phone")})

    user_map: Dict[str, dict] = {}
    if all_emails or all_phones:
        u_or = []
        if all_emails:
            u_or.append({"email": {"$in": all_emails}})
        if all_phones:
            u_or.append({"phone": {"$in": all_phones}})
        
        async for u in db.users.find({"$or": u_or}):
            comp = compute_profile_completion(u)
            u_info = {
                "user_id": str(u.get("_id")),
                "email": u.get("email"),
                "phone": u.get("phone"),
                "full_name": u.get("full_name"),
                "profile_completion_pct": comp.get("percentage", 0),
                "is_100": comp.get("percentage", 0) >= 100,
                "missing_items": [item["label"] for item in comp.get("items", []) if not item["done"]],
            }
            if u.get("email"):
                user_map[u.get("email").lower().strip()] = u_info
            if u.get("phone"):
                user_map[u.get("phone").strip()] = u_info

    output = io.StringIO()
    headers = [
        "Registration ID",
        "Event Title",
        "Event Slug",
        "Full Name",
        "Email",
        "Phone Number",
        "College / Campus",
        "Account Status",
        "Profile Completion %",
        "Missing Profile Requirements",
        "Registration Date"
    ]

    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()

    exported_count = 0
    for r in regs:
        email = (r.get("email") or "").lower().strip()
        phone = (r.get("phone") or "").strip()
        
        sa_user = user_map.get(email) or user_map.get(phone)
        has_account = bool(sa_user or r.get("user_id"))
        pct = sa_user.get("profile_completion_pct", 0) if sa_user else 0

        if has_account and pct >= 100:
            continue  # Skip 100% complete accounts

        if filter_type == "no_account" and has_account:
            continue
        if filter_type == "incomplete_profile" and (not has_account or pct >= 100):
            continue

        account_status = "No SA Account" if not has_account else f"Incomplete SA Profile ({pct}%)"
        missing_str = "Create SA Account" if not has_account else (", ".join(sa_user.get("missing_items", [])) or "Incomplete profile details")

        writer.writerow({
            "Registration ID": r.get("id") or str(r.get("_id")),
            "Event Title": r.get("showcase_title") or r.get("event_title") or r.get("slug") or "",
            "Event Slug": r.get("slug") or "",
            "Full Name": r.get("full_name") or "",
            "Email": r.get("email") or "",
            "Phone Number": r.get("phone") or "",
            "College / Campus": r.get("college") or r.get("showcase_college") or "",
            "Account Status": account_status,
            "Profile Completion %": f"{pct}%" if has_account else "0%",
            "Missing Profile Requirements": missing_str,
            "Registration Date": r.get("registered_at") or r.get("created_at") or "",
        })
        exported_count += 1

    csv_data = output.getvalue()
    filename = f"incomplete_profiles_export_{filter_type}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )




@router.post("/admin/coupons/dedup")
async def admin_dedup_coupons(request: Request, _=Depends(_require_admin)):
    """Super-admin: remove duplicate coupons — keeps the oldest coupon per (reg_id, session_key) pair.
    Safe: skips any coupon that is already marked used=True to preserve redemption history.
    """
    db = _get_db(request)
    pipeline = [
        {"$group": {
            "_id": {"reg_id": "$reg_id", "session_key": "$session_key"},
            "count": {"$sum": 1},
            "docs": {"$push": {"_id": "$_id", "used": "$used", "created_at": "$created_at"}}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    dupes = await db.echo_coupons.aggregate(pipeline).to_list(5000)
    total_deleted = 0
    skipped_used = 0
    details = []
    for group in dupes:
        docs = group["docs"]
        docs.sort(key=lambda d: str(d.get("created_at") or ""))
        to_delete = docs[1:]
        for doc in to_delete:
            if doc.get("used"):
                skipped_used += 1
                continue
            result = await db.echo_coupons.delete_one({"_id": doc["_id"]})
            if result.deleted_count:
                total_deleted += 1
                details.append({
                    "reg_id": group["_id"]["reg_id"],
                    "session_key": group["_id"]["session_key"],
                    "deleted_id": str(doc["_id"]),
                })
    return {
        "ok": True,
        "duplicate_groups_found": len(dupes),
        "deleted": total_deleted,
        "skipped_used": skipped_used,
        "details": details[:100],  # cap to 100 for response size
    }


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
    frontend_url = frontend_base_url()
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


@router.post("/admin/registrations/{reg_id}/rescue-payment")
async def admin_rescue_payment(reg_id: str, request: Request, _=Depends(_require_admin)):
    """Super-admin: manually rescue a 'failed' or 'pending' registration where Razorpay
    actually captured the payment but the webhook was missed or arrived after the sweep timer.

    1. Looks up the registration by reg_id.
    2. If already 'registered' (paid), returns early — idempotent.
    3. Fetches the Razorpay order and checks its status.
    4. If 'paid' on Razorpay side, calls _finalize_paid_registration to complete the flow.
    5. Optionally the admin can pass ?payment_id=pay_xxx to force-finalize without Razorpay check.
    """
    from bson import ObjectId
    db = _get_db(request)
    payment_id_override = request.query_params.get("payment_id") or ""

    reg = await db.echo_registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    if reg.get("status") == "registered" and (reg.get("payment") or {}).get("status") == "paid":
        return {"ok": True, "message": "Registration is already finalized (paid).", "already_paid": True}

    showcase = await db.echo_showcases.find_one(_slug_query(reg.get("slug") or ""))

    # If admin explicitly provided a payment_id, force-finalize
    if payment_id_override:
        finalized = await _finalize_paid_registration(db, reg, showcase, payment_id_override)
        return {
            "ok": True,
            "message": f"Force-finalized registration {reg_id} with payment {payment_id_override}.",
            "registration": _ser(finalized) if finalized else None,
        }

    # Otherwise check Razorpay for captured payment
    order_id = (reg.get("payment_order") or {}).get("order_id") or reg.get("payment", {}).get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="No Razorpay order_id on this registration. Provide ?payment_id=pay_xxx to force-finalize.")

    cfg = await _razorpay_config(db)
    if not cfg:
        raise HTTPException(status_code=503, detail="Razorpay not configured.")

    import httpx
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.get(
            f"https://api.razorpay.com/v1/orders/{order_id}",
            auth=(cfg["key_id"], cfg["key_secret"]),
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Razorpay API error: HTTP {resp.status_code} — {resp.text[:200]}")

    order_data = resp.json()
    rp_status = order_data.get("status")

    if rp_status != "paid":
        return {
            "ok": False,
            "message": f"Razorpay order {order_id} status is '{rp_status}' (not paid). Cannot rescue.",
            "razorpay_status": rp_status,
        }

    # Find the captured payment_id
    payment_id = ""
    for p in (order_data.get("payments") or []):
        if p.get("status") == "captured":
            payment_id = p.get("id") or ""
            break
    if not payment_id:
        payments = order_data.get("payments") or []
        if payments:
            payment_id = payments[-1].get("id") or ""

    finalized = await _finalize_paid_registration(db, reg, showcase, payment_id)
    return {
        "ok": True,
        "message": f"Successfully rescued registration {reg_id}. Payment {payment_id} confirmed on Razorpay.",
        "razorpay_status": rp_status,
        "payment_id": payment_id,
        "registration": _ser(finalized) if finalized else None,
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
    frontend_url = frontend_base_url()
    event_slug = showcase.get("slug") or "snist"
    reg_url = f"{frontend_url}/echo/{event_slug}/register"

    attachments = []
    pdf_file, pdf_filename = _get_showcase_handbook_file(showcase)
    if pdf_file and pdf_file.exists():
        try:
            attachments.append({
                "filename": pdf_filename,
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


