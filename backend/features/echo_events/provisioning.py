"""StudentAlumni account provisioning + welcome/mirror flows.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

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
    frontend_url = frontend_base_url()
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
    frontend_url = frontend_base_url()
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


