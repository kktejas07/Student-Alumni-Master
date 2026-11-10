"""Payment, invoice & ticket rendering helpers + expired-payment sweep.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

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
    result = {"checked": 0, "failed": 0, "reminded": 0, "rescued": 0, "closed": 0}
    try:
        now = datetime.now(timezone.utc)
        cutoff_fail = now.timestamp() - ECHO_PAYMENT_SESSION_TTL_SECONDS
        cutoff_remind = now.timestamp() - ECHO_PAYMENT_REMINDER_SECONDS

        # Auto-close any showcase whose temporary open window has expired.
        try:
            expired = await db.echo_showcases.find({
                "registration.temporary_open": True,
                "registration.temporary_close_at": {"$ne": ""},
            }).to_list(200)
            for sc in expired:
                close_at = _parse_iso((sc.get("registration") or {}).get("temporary_close_at"))
                if close_at and close_at < now:
                    reg_upd = dict((sc.get("registration") or {}))
                    reg_upd["enabled"] = False
                    reg_upd["temporary_open"] = False
                    reg_upd["temporary_close_at"] = ""
                    await db.echo_showcases.update_one(
                        {"_id": sc["_id"]},
                        {"$set": {"registration": reg_upd, "updated_at": _now()}},
                    )
                    result["closed"] += 1
                    print(f"[ECHO-SWEEP] Auto-closed temporary registration window for {sc.get('slug')}")
        except Exception as _temp_err:
            print(f"[ECHO-SWEEP] temporary-close scan failed: {_temp_err}")

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
    frontend_url = frontend_base_url()

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
        if len(s) == 10 and "-" in s:
            # Date-only format e.g. "2026-09-04" -> set to 1:00 PM IST (13:00:00+05:30)
            dt = datetime.fromisoformat(f"{s}T13:00:00+05:30")
        else:
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

    # Temporary auto-close window: if the showcase was opened for a limited window
    # and that window has passed, treat registrations as closed (fail-closed) even
    # before the background sweep flips enabled to False.
    if reg_cfg.get("temporary_open"):
        temp_close = _parse_iso(reg_cfg.get("temporary_close_at"))
        if temp_close and temp_close < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Registrations have closed for this event")

    slug = (showcase.get("slug") or "").lower()
    if slug in ("snist", "hackwave-3.0", "hackwave-3", "hackwave"):
        # For HackWave 3.0 SNIST, deadline is Sep 4, 2026 1:00 PM IST
        deadline = datetime.fromisoformat("2026-09-04T13:00:00+05:30")
    else:
        deadline = _parse_iso(reg_cfg.get("deadline") or showcase.get("reg_closes"))

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


def _get_showcase_handbook_file(showcase: Optional[dict]) -> tuple[Optional[Path], str]:
    if not showcase:
        return None, ""
    url = (showcase.get("handbook_url") or "").strip()
    if not url:
        for d in showcase.get("downloads") or []:
            if isinstance(d, dict):
                u = (d.get("file_url") or "").strip()
                cat = (d.get("category") or "").strip().lower()
                tit = (d.get("title") or "").strip().lower()
                if u and (cat in ("handbook", "brochure", "guide") or "handbook" in tit or "guide" in tit or "brochure" in tit):
                    url = u
                    break
    if url and not url.startswith("http://") and not url.startswith("https://"):
        fname = Path(url).name
        for cand in [
            Path(__file__).parent.parent / "static" / fname,
            Path(__file__).parent.parent.parent / "frontend" / "public" / fname,
            Path(__file__).parent.parent / fname,
        ]:
            if cand.exists():
                return cand, fname
    return None, ""


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
        slug = (showcase or {}).get("slug") or reg.get("slug") or ""
        import urllib.parse
        ticket_url = f"https://studentalumni.ai/api/echo/tickets/{reg_id}?email={urllib.parse.quote(email)}"
        handbook_url = f"https://studentalumni.ai/api/echo/showcases/{slug}/handbook/download" if slug else "https://studentalumni.ai/api/echo/handbook/download"
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
        pdf_file, pdf_filename = _get_showcase_handbook_file(showcase)
        if pdf_file and pdf_file.exists():
            try:
                attachments.append({
                    "filename": pdf_filename,
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
              <h3 style="margin:0 0 6px 0;color:#6d28d9;font-size:15px;">Official Event Handbook</h3>
              <p style="margin:0 0 12px 0;color:#4c1d95;font-size:13px;">
                Find full details on schedule, tracks, meals, rules, and rewards in the official event handbook.
              </p>
              <a href="{handbook_url}"
                 style="display:inline-block;padding:8px 16px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Download Event Handbook</a>
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
        frontend_url = frontend_base_url()
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
        slug = (showcase or {}).get("slug") or member_reg.get("slug") or ""
        ticket_url = f"https://studentalumni.ai/api/echo/tickets/{reg_id}?email={urllib.parse.quote(email)}"
        handbook_url = f"https://studentalumni.ai/api/echo/showcases/{slug}/handbook/download" if slug else "https://studentalumni.ai/api/echo/handbook/download"
        ticket_block = _ticket_email_block(member_reg, showcase or {}, ticket_url)
        
        # Attach Handbook PDF if present
        attachments = []
        pdf_file, pdf_filename = _get_showcase_handbook_file(showcase)
        if pdf_file and pdf_file.exists():
            try:
                attachments.append({
                    "filename": pdf_filename,
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
              <h3 style="margin:0 0 6px 0;color:#6d28d9;font-size:15px;">Official Event Handbook</h3>
              <p style="margin:0 0 12px 0;color:#4c1d95;font-size:13px;">
                Find full details on schedule, tracks, meals, rules, and rewards in the official event handbook.
              </p>
              <a href="{handbook_url}"
                 style="display:inline-block;padding:8px 16px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Download Event Handbook</a>
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
        frontend_url = frontend_base_url()
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
        frontend_url = frontend_base_url()
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
        frontend_url = frontend_base_url()
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

    qr = reg.get("qr_code_base64")
    if not qr and reg.get("id"):
        frontend_url = frontend_base_url()
        qr = generate_qr_code(f"{frontend_url}/echo/scan/{reg.get('id')}")
    elif not qr:
        qr = ""
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

    is_checked_in = bool(reg.get("checked_in_at"))
    badge_label = "CHECKED IN" if is_checked_in else "CONFIRMED PASS"
    badge_html = f'<span class="badge">{badge_label}</span>'

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
                <div class="c-sub" style="margin-top:8px;">{badge_html}</div>
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
          {badge_html}
          <span class="m-note">Scan the QR at check-in · Keep this pass handy</span>
        </div>
        {sponsors_html}
      </div>"""
    else:  # aurora (default)
        checkin_banner = ''
        if is_checked_in:
            checkin_at = reg.get('checked_in_at') or ''
            checkin_banner = f'<div class="aur-checkin-banner"><span class="aur-checkin-icon">✓</span> Checked In{" · " + checkin_at[:16].replace("T"," ") if checkin_at else ""}</div>'
        reg_id_short = reg_id[:24] + ('…' if len(reg_id) > 24 else '')
        inner = f"""
      <div class="sheet aurora">
        <div class="aur-glow aur-glow-a"></div>
        <div class="aur-glow aur-glow-b"></div>
        <div class="aur-glow aur-glow-c"></div>
        <div class="aur-main">

          <!-- Header -->
          <div class="aur-header">
            <div class="aur-toprow">
              <div>
                <div class="aur-brand">{brand}</div>
                <div class="aur-org">{organizer}</div>
              </div>
              <div class="aur-badge-pill">{badge_label}</div>
            </div>
            <h1 class="aur-title">{title}</h1>
            <div class="aur-pills">
              {'<span class="aur-pill">📅 ' + event_date + '</span>' if event_date else '<span class="aur-pill">📅 TBA</span>'}
              {'<span class="aur-pill">🕐 ' + event_time + '</span>' if event_time else ''}
              {'<span class="aur-pill">📍 ' + venue + '</span>' if venue else ''}
            </div>
          </div>

          {checkin_banner}

          <!-- Body -->
          <div class="aur-body">
            <div class="aur-info">
              <div class="aur-field">
                <div class="dl-label">Attendee</div>
                <div class="dl-val">{name}</div>
                <div class="aur-sub">{email}</div>
                {f'<div class="aur-sub">{attendee_line}</div>' if attendee_line else ''}
              </div>
              <div class="aur-field">
                <div class="dl-label">Reg ID</div>
                <div class="aur-reg-id">{reg_id_short}</div>
              </div>
            </div>
            <div class="aur-qr-wrap">
              <div class="aur-qr">{qr_img}</div>
              <div class="aur-qr-hint">Scan at venue</div>
            </div>
          </div>

          <!-- Stub -->
          <div class="aur-stub">
            <div class="aur-stub-dots"></div>
            <div class="aur-stub-inner">
              <div class="aur-stub-left">
                <div class="aur-stub-event">{title}</div>
                <div class="aur-stub-detail">{event_date or 'TBA'} · {name}</div>
                <div class="aur-stub-id">REG: {reg_id_short}</div>
              </div>
              {qr_img_sm}
            </div>
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
  .aurora {{ background:linear-gradient(160deg,#09071f 0%,#130d3b 35%,#1e1050 65%,#0d0825 100%); color:#fff; }}
  .aurora .dl-label {{ color:rgba(165,180,252,0.7); font-size:9px; letter-spacing:1.5px; }}
  .aurora .dl-val {{ color:#fff; font-size:22px; }}
  .aurora .sponsors {{ border-top-color:rgba(255,255,255,0.07); }}
  .aurora .sp-label {{ color:rgba(255,255,255,0.3); }}
  .aur-glow {{ position:absolute; border-radius:50%; filter:blur(90px); opacity:.22; pointer-events:none; }}
  .aur-glow-a {{ width:420px; height:420px; top:-160px; right:-80px; background:#a855f7; }}
  .aur-glow-b {{ width:320px; height:320px; bottom:-120px; left:-60px; background:#6366f1; }}
  .aur-glow-c {{ width:200px; height:200px; top:50%; left:50%; transform:translate(-50%,-50%); background:#8b5cf6; opacity:.12; }}
  .aur-main {{ position:relative; z-index:1; }}
  .aur-header {{ padding:40px 40px 24px; border-bottom:1px solid rgba(255,255,255,0.06); }}
  .aur-toprow {{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }}
  .aur-brand {{ font-size:9px; font-weight:800; letter-spacing:3px; color:rgba(255,255,255,0.4); text-transform:uppercase; }}
  .aur-org {{ font-size:13px; font-weight:600; margin-top:6px; color:rgba(255,255,255,0.6); }}
  .aur-badge-pill {{ background:rgba(52,211,153,0.15); border:1px solid rgba(52,211,153,0.3); color:#6ee7b7; font-size:10px; font-weight:800; letter-spacing:.5px; padding:6px 14px; border-radius:999px; white-space:nowrap; text-transform:uppercase; }}
  .aur-title {{ font-size:38px; font-weight:900; line-height:1.05; letter-spacing:-1px; margin-bottom:18px; }}
  .aur-pills {{ display:flex; gap:8px; flex-wrap:wrap; }}
  .aur-pill {{ background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.8); font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px; white-space:nowrap; }}
  .aur-checkin-banner {{ background:rgba(16,185,129,0.12); border-top:1px solid rgba(16,185,129,0.2); border-bottom:1px solid rgba(16,185,129,0.2); padding:10px 40px; display:flex; align-items:center; gap:10px; }}
  .aur-checkin-icon {{ font-size:14px; color:#34d399; }}
  .aur-checkin-banner {{ font-size:12px; font-weight:700; color:#6ee7b7; letter-spacing:.3px; }}
  .aur-body {{ display:flex; justify-content:space-between; align-items:center; gap:32px; padding:32px 40px; }}
  .aur-info {{ flex:1; display:flex; flex-direction:column; gap:24px; }}
  .aur-field {{ min-width:0; }}
  .aur-sub {{ font-size:12px; color:rgba(255,255,255,0.45); margin-top:3px; line-height:1.5; }}
  .aur-reg-id {{ font-size:13px; font-weight:700; color:rgba(255,255,255,0.7); letter-spacing:1px; margin-top:4px; font-family:monospace; }}
  .aur-qr-wrap {{ display:flex; flex-direction:column; align-items:center; gap:8px; flex-shrink:0; }}
  .aur-qr {{ background:#fff; padding:14px; border-radius:20px; box-shadow:0 8px 40px rgba(0,0,0,0.4); }}
  .aur-qr .qr {{ width:180px; height:180px; border-radius:8px; }}
  .aur-qr-hint {{ font-size:10px; color:rgba(255,255,255,0.35); font-weight:600; letter-spacing:.5px; text-transform:uppercase; }}
  .aur-stub {{ border-top:2px dashed rgba(255,255,255,0.12); position:relative; overflow:hidden; }}
  .aur-stub-inner {{ display:flex; align-items:center; gap:20px; padding:20px 40px; }}
  .aur-stub-left {{ flex:1; min-width:0; }}
  .aur-stub-event {{ font-size:14px; font-weight:700; opacity:.85; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
  .aur-stub-detail {{ font-size:11px; opacity:.45; margin-top:4px; }}
  .aur-stub-id {{ font-size:10px; font-weight:800; letter-spacing:1.5px; opacity:.35; margin-top:5px; font-family:monospace; }}
  .aur-stub .qr-sm {{ width:68px; height:68px; border-radius:8px; opacity:.8; }}
  .aur-stub-dots {{ position:absolute; top:-9px; left:0; right:0; height:18px; background:repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 10px); }}

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
    qr = reg.get("qr_code_base64")
    if not qr and reg.get("id"):
        frontend_url = frontend_base_url()
        qr = generate_qr_code(f"{frontend_url}/echo/scan/{reg.get('id')}")
    elif not qr:
        qr = ""
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


