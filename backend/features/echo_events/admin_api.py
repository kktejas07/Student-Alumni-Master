"""Admin settings, branding, showcase CMS, media, session-coupon + passcode endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── Admin settings ────────────────────────────────────────────────────────────
@router.get("/admin/settings")
async def get_echo_settings(request: Request):
    """Read-only: fetch current Echo settings. No auth required (template prefs are not sensitive)."""
    db = _get_db(request)
    settings = await db.echo_settings.find_one({"_id": "global"}) or {}
    hero = settings.get("hero_config") or {}
    return {
        "default_ticket_template": settings.get("default_ticket_template", "aurora"),
        "default_invoice_template": settings.get("default_invoice_template", "modern"),
        "default_email_style": settings.get("default_email_style", "modern"),
        "email_brand_color": settings.get("email_brand_color", "#7C3AED"),
        "brand_name": settings.get("brand_name", "Student Alumni"),
        "email_footer": settings.get("email_footer", "Student Alumni Cell — Empowering the next generation of leaders."),
        "hero_config": {
            "badge": hero.get("badge", "ON THE GROUND"),
            "title": hero.get("title", "The network is a feed until it meets in person."),
            "description": hero.get("description", "Eighty-six ECHO events across thirty-one campuses. Alumni in the room, recruiters at the table, and a build sprint that runs overnight."),
            "stats": hero.get("stats", [
                {"value": "86", "label": "events run", "color": "#4B3FD6"},
                {"value": "31", "label": "cities", "color": "#0E6E8C"},
                {"value": "4.8", "label": "average rating", "color": "#A21C63"},
            ]),
            "recent_hosts": hero.get("recent_hosts", ["Sreenidhi Institute", "VNR VJIET", "Khammam Institute", "CBIT Hyderabad"]),
            "cta_primary": hero.get("cta_primary", "Browse all events"),
            "cta_secondary": hero.get("cta_secondary", "Host on your campus"),
            "section_badge": hero.get("section_badge", "ECHO EVENTS"),
            "section_title": hero.get("section_title", "Explore ECHO Events by College"),
            "section_description": hero.get("section_description", "Image galleries, partners, sponsors, speakers, testimonials and registration for every ECHO event we've conducted."),
        },
    }


@router.put("/admin/settings")
async def update_echo_settings(request: Request, admin=Depends(_require_admin)):
    """Update global ECHO settings."""
    db = _get_db(request)
    body = await request.json()
    update = {}
    if "default_ticket_template" in body:
        tpl = body["default_ticket_template"]
        if tpl in TICKET_TEMPLATES:
            update["default_ticket_template"] = tpl
    if "default_invoice_template" in body:
        tpl = body["default_invoice_template"]
        if tpl in ("modern", "minimal", "classic"):
            update["default_invoice_template"] = tpl
    if "default_email_style" in body:
        tpl = body["default_email_style"]
        if tpl in ("modern", "minimal", "professional"):
            update["default_email_style"] = tpl
    if "email_brand_color" in body:
        update["email_brand_color"] = str(body["email_brand_color"])[:20]
    if "brand_name" in body:
        update["brand_name"] = str(body["brand_name"])[:60]
    if "email_footer" in body:
        update["email_footer"] = str(body["email_footer"])[:300]
    if "hero_config" in body:
        hc = body["hero_config"]
        if isinstance(hc, dict):
            # Merge with existing hero_config to preserve unset fields
            existing = (await db.echo_settings.find_one({"_id": "global"}) or {}).get("hero_config") or {}
            merged = {**existing, **{k: v for k, v in hc.items() if v is not None}}
            update["hero_config"] = merged
    if update:
        await db.echo_settings.update_one(
            {"_id": "global"}, {"$set": update}, upsert=True
        )
    return {"ok": True, **update}


@router.get("/admin/settings/preview/invoice/{template_id}")
async def preview_invoice_template(template_id: str, request: Request):
    """Return a preview HTML for an invoice template variant. No auth required (mock data only)."""
    """Return a preview HTML for an invoice template variant."""
    if template_id not in ("modern", "minimal", "classic"):
        raise HTTPException(400, "Invalid template")
    mock_inv = {
        "invoice_no": "INV-DEMO123456",
        "full_name": "Priya Sharma",
        "email": "priya@example.com",
        "phone": "+91 98765 43210",
        "college": "VNR VJIET",
        "event_title": "ECHO 2026 — Tech Summit",
        "event_date": "August 15, 2026",
        "event_venue": "Main Auditorium, VNR VJIET",
        "payment_id": "pay_DEMO789",
        "payment_method": "online",
        "paid_at": "2026-08-10T14:30:00",
        "amount": 499,
        "currency": "INR",
        "items": [{"desc": "Registration — ECHO 2026", "qty": 1, "amount": 499}],
    }
    return {"html": _build_invoice_html(mock_inv, template_id)}


# ── Branding Settings ─────────────────────────────────────────────────────────

@router.get("/admin/branding")
async def get_branding(request: Request, _=Depends(_require_admin)):
    """Return branding settings."""
    db = _get_db(request)
    settings = await db.echo_settings.find_one({"_id": "global"}) or {}
    return {
        "logo_url": settings.get("logo_url", ""),
        "favicon_url": settings.get("favicon_url", ""),
        "brand_name": settings.get("brand_name", "StudentAlumni"),
        "copyright": settings.get("copyright", "2026 StudentAlumni. All rights reserved."),
        "address": settings.get("address", ""),
        "phone": settings.get("phone", ""),
        "email": settings.get("email", ""),
        "website": settings.get("website", ""),
    }


@router.put("/admin/branding")
async def update_branding(request: Request, admin=Depends(_require_admin)):
    """Update branding settings."""
    db = _get_db(request)
    body = await request.json()
    update = {}
    for k in ("logo_url", "favicon_url", "brand_name", "copyright", "address", "phone", "email", "website"):
        if k in body:
            update[k] = str(body[k])[:500]
    if update:
        await db.echo_settings.update_one(
            {"_id": "global"}, {"$set": update}, upsert=True
        )
    return {"ok": True, **update}


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
    outcome = _ser(doc or {})
    if "sessions" in update:
        recon = await _reconcile_coupons_for_paid(db, doc or {})
        outcome["coupon_sync"] = recon
    return outcome


class TemporaryOpenSchema(BaseModel):
    duration_minutes: int = 60


@router.post("/admin/showcases/{showcase_id}/temporary-open")
async def temporary_open_showcase(
    showcase_id: str,
    payload: TemporaryOpenSchema,
    request: Request,
    _=Depends(_require_admin),
):
    """Open ECHO registration for a limited window, then auto-close it.

    Sets registration.enabled=True and registration.temporary_open=True with a
    temporary_close_at timestamp = now + duration. A background sweep (and the
    registration gate itself) auto-closes the showcase once that window passes.
    """
    from datetime import timedelta
    db = _get_db(request)
    minutes = max(1, min(int(payload.duration_minutes or 60), 7 * 24 * 60))  # 1 min .. 7 days
    now = datetime.now(timezone.utc)
    close_at = now + timedelta(minutes=minutes)

    result = await db.echo_showcases.update_one(
        {"_id": _oid(showcase_id)},
        {"$set": {
            "registration.enabled": True,
            "registration.temporary_open": True,
            "registration.temporary_close_at": close_at.isoformat(),
            "updated_at": _now(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Showcase not found")

    doc = await db.echo_showcases.find_one({"_id": _oid(showcase_id)})
    ser = _ser(doc or {})
    ser["temporary_open"] = {
        "active": True,
        "closes_at": close_at.isoformat(),
        "duration_minutes": minutes,
    }
    return ser


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
    """Upload an image file to the filesystem and store its URL in the database."""
    from pathlib import Path as _Path
    from datetime import datetime as _dt, timezone as _tz
    db = _get_db(request)
    content_type_header = request.headers.get("content-type", "")

    filename = "upload.png"
    original_name = "upload.png"
    file_bytes = b""

    if file and file.filename:
        filename = file.filename
        original_name = filename
        file_bytes = await file.read()
    elif "multipart/form-data" in content_type_header:
        form = await request.form()
        uploaded_file = form.get("file") or form.get("image") or form.get("media")
        if uploaded_file and hasattr(uploaded_file, "filename") and hasattr(uploaded_file, "read"):
            filename = str(getattr(uploaded_file, "filename", "") or "")
            original_name = filename
            file_bytes = await uploaded_file.read() # type: ignore
        else:
            raise HTTPException(status_code=400, detail="No file found in multipart upload")
    elif "application/json" in content_type_header:
        body = await request.json()
        data = body.get("data", "")
        filename = str(body.get("filename") or f"upload_{int(_dt.now(_tz.utc).timestamp())}.png")
        original_name = filename
        if "," in data:
            data = data.split(",", 1)[1]
        file_bytes = base64.b64decode(data)
    else:
        raise HTTPException(status_code=400, detail="No file or base64 data provided")

    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(file_bytes)

    MAX_SIZE = 10 * 1024 * 1024
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MB allowed.")

    ext = Path(filename or "").suffix.lower() or ".png"
    ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif", ".pdf", ".docx", ".xlsx", ".pptx", ".zip"}
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed.")

    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    # Save to filesystem instead of base64-in-MongoDB
    upload_dir = _Path("uploads") / "echo"
    upload_dir.mkdir(parents=True, exist_ok=True)
    ts = int(_dt.now(_tz.utc).timestamp())
    stem = Path(filename or "").stem.replace(" ", "_").replace("/", "_") if filename else f"upload_{ts}"
    safe_name = f"{ts}_{stem}{ext}"
    out_path = upload_dir / safe_name
    with open(out_path, "wb") as f:
        f.write(file_bytes)

    url = f"/uploads/echo/{safe_name}"

    record = {
        "filename": safe_name,
        "original_name": original_name,
        "content_type": content_type,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "ext": ext.lstrip("."),
        "url": url,
        "uploaded_by": admin.get("sub") or admin.get("user_id") or "admin",
        "uploaded_at": _now(),
    }
    await db.echo_media.insert_one(record)

    return {
        "ok": True,
        "url": url,
        "filename": safe_name,
        "original_name": original_name,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "content_type": content_type,
    }


# ── Media Library endpoints ───────────────────────────────────────────────────

@router.get("/admin/media")
async def list_echo_media(request: Request, _=Depends(_require_admin)):
    """List all uploaded media from the database."""
    db = _get_db(request)
    files = []
    total_bytes = 0
    async for doc in db.echo_media.find().sort("uploaded_at", -1):
        doc["_id"] = str(doc["_id"])
        size = doc.get("size", 0)
        total_bytes += size
        ext = doc.get("filename", "").rsplit(".", 1)[-1] if "." in doc.get("filename", "") else ""
        files.append({
            "filename": doc.get("filename", ""),
            "original_name": doc.get("original_name", doc.get("filename", "")),
            "url": doc.get("url") or doc.get("data_url", ""),
            "size": size,
            "size_human": _human_size(size),
            "ext": ext,
            "content_type": doc.get("content_type", ""),
            "uploaded_at": doc.get("uploaded_at", ""),
            "uploaded_by": doc.get("uploaded_by", "admin"),
            "is_image": ext.lower() in ("png", "jpg", "jpeg", "gif", "webp", "svg"),
        })
    return {"items": files, "total": len(files), "total_size_human": _human_size(total_bytes)}


@router.delete("/admin/media/{filename}")
async def delete_echo_media(filename: str, request: Request, _=Depends(_require_admin)):
    """Delete a media file from the database."""
    db = _get_db(request)
    result = await db.echo_media.delete_one({"filename": filename})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"ok": True}


# ── Session Coupons ─────────────────────────────────────────────────────────

@router.get("/admin/{slug}/sessions")
async def get_sessions(slug: str, request: Request, _=Depends(_require_admin)):
    """Get session configuration for an event."""
    db = _get_db(request)
    showcase = await db.echo_showcases.find_one({"slug": slug})
    if not showcase:
        raise HTTPException(404, "Showcase not found")
    sessions = showcase.get("sessions") or DEFAULT_SESSIONS
    return {"sessions": sessions}


@router.put("/admin/{slug}/sessions")
async def update_sessions(slug: str, request: Request, admin=Depends(_require_admin)):
    """Update session configuration for an event."""
    db = _get_db(request)
    body = await request.json()
    sessions = body.get("sessions", [])
    await db.echo_showcases.update_one(
        {"slug": slug}, {"$set": {"sessions": sessions}}, upsert=True
    )
    show = await db.echo_showcases.find_one({"slug": slug}) or {"slug": slug, "sessions": sessions}
    recon = await _reconcile_coupons_for_paid(db, show)
    return {"ok": True, "sessions": sessions, "coupon_sync": recon}


@router.put("/admin/{slug}/sessions/{session_key}/lock")
async def toggle_session_lock(slug: str, session_key: str, request: Request, admin=Depends(_require_admin)):
    """Toggle lock status for a session. When locked, coupons show 'Available soon'."""
    db = _get_db(request)
    body = await request.json()
    locked = body.get("locked", True)

    showcase = await db.echo_showcases.find_one({"slug": slug})
    if not showcase:
        raise HTTPException(404, "Showcase not found")

    sessions = showcase.get("sessions") or DEFAULT_SESSIONS
    updated = False
    for s in sessions:
        if s.get("key") == session_key:
            s["locked"] = locked
            updated = True
            break

    if not updated:
        raise HTTPException(404, "Session not found")

    await db.echo_showcases.update_one(
        {"slug": slug}, {"$set": {"sessions": sessions}}
    )

    # Also update all coupons for this session to reflect the lock status
    if locked:
        await db.echo_coupons.update_many(
            {"slug": slug, "session_key": session_key, "used": False},
            {"$set": {"session_locked": True}}
        )
    else:
        await db.echo_coupons.update_many(
            {"slug": slug, "session_key": session_key},
            {"$set": {"session_locked": False}}
        )

    return {"ok": True, "session_key": session_key, "locked": locked}


# ── Registration tab passcode (server-side, hashed) ─────────────────────────
_PASSCODE_SALT = "studentalumni::echo::registration::v1"
_PASSCODE_COLL = "echo_admin_config"


def _hash_passcode(passcode: str) -> str:
    return hashlib.sha256((_PASSCODE_SALT + passcode).encode("utf-8")).hexdigest()


async def _get_passcode_config(db) -> dict:
    return await db[_PASSCODE_COLL].find_one({"key": "registration_passcode"})


@router.get("/admin/registration-passcode")
async def get_registration_passcode(request: Request, admin=Depends(_require_admin)):
    """Return whether a registration-tab passcode is enabled. Never returns the value."""
    db = _get_db(request)
    cfg = await _get_passcode_config(db)
    return {
        "ok": True,
        "enabled": bool(cfg and cfg.get("enabled")),
        "has_passcode": bool(cfg and cfg.get("hash")),
    }


@router.put("/admin/registration-passcode")
async def set_registration_passcode(request: Request, admin=Depends(_require_admin)):
    """Set/update the registration-tab passcode and enable it, or disable it."""
    db = _get_db(request)
    body = await request.json()
    if body.get("disable"):
        await db[_PASSCODE_COLL].update_one(
            {"key": "registration_passcode"},
            {"$set": {"enabled": False}},
            upsert=True,
        )
        return {"ok": True, "enabled": False}

    passcode = (body.get("passcode") or "").strip()
    if not passcode:
        raise HTTPException(status_code=400, detail="Passcode required")
    if not (4 <= len(passcode) <= 12):
        raise HTTPException(
            status_code=400,
            detail="Passcode must be 4-12 characters",
        )
    await db[_PASSCODE_COLL].update_one(
        {"key": "registration_passcode"},
        {"$set": {"hash": _hash_passcode(passcode), "enabled": True}},
        upsert=True,
    )
    return {"ok": True, "enabled": True}


@router.post("/admin/registration-passcode/verify")
async def verify_registration_passcode(request: Request, admin=Depends(_require_admin)):
    """Verify a submitted passcode against the stored (hashed) value."""
    db = _get_db(request)
    cfg = await _get_passcode_config(db)
    if not (cfg and cfg.get("enabled") and cfg.get("hash")):
        return {"ok": False, "enabled": False, "reason": "not_configured"}
    body = await request.json()
    guess = (body.get("passcode") or "").strip()
    if not guess:
        return {"ok": False, "enabled": True, "reason": "empty"}
    if _hash_passcode(guess) != cfg.get("hash"):
        return {"ok": False, "enabled": True, "reason": "invalid"}
    return {"ok": True, "enabled": True}
