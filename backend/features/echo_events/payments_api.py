"""Razorpay payment-order / verify / webhook endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

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
    payload = decode_payload_silent(bearer_token(request.headers.get("Authorization", "")))
    if not payload:
        return None
    try:
        return await db.users.find_one({"_id": ObjectId(payload.get("sub"))})
    except Exception:
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


