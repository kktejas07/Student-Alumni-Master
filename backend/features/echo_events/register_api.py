"""Registration + coupon-verify endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

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
    payload_token = decode_payload_silent(bearer_token(request.headers.get("Authorization", "")))
    if payload_token:
        try:
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
            from features.routers.admin.colleges import ensure_college
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
    frontend_url = frontend_base_url()
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
    payload = decode_payload_silent(bearer_token(request.headers.get("Authorization", "")))
    if payload:
        try:
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


