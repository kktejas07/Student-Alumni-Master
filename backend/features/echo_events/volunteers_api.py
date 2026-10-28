"""Volunteer / ambassador management endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── Volunteer / Ambassador Management ────────────────────────────────────────

@router.get("/admin/volunteers")
async def list_all_volunteers(request: Request, _=Depends(_require_admin)):
    """List all volunteers across every event, joined with the event title."""
    db = _get_db(request)
    vols = await db.echo_volunteers.find().sort("created_at", -1).to_list(1000)
    # Build slug -> showcase title map
    slugs = {v.get("slug") for v in vols if v.get("slug")}
    title_map = {}
    if slugs:
        for s in await db.echo_showcases.find({"slug": {"$in": list(slugs)}}, {"slug": 1, "title": 1}).to_list(500):
            title_map[s.get("slug")] = s.get("title") or s.get("slug")
    for v in vols:
        v["_id"] = str(v["_id"])
        v["event_title"] = title_map.get(v.get("slug")) or v.get("slug") or "—"
        if v.get("email"):
            user = await db.users.find_one({"email": v["email"].lower().strip()})
            v["has_account"] = user is not None
            v["user_name"] = user.get("full_name", "") if user else ""
        else:
            v["has_account"] = False
            v["user_name"] = ""
    return {"volunteers": vols, "total": len(vols)}


@router.get("/admin/{slug}/volunteers")
async def list_volunteers(slug: str, request: Request, _=Depends(_require_admin)):
    """List all volunteers for an event."""
    db = _get_db(request)
    vols = await db.echo_volunteers.find({"slug": slug}).sort("created_at", -1).to_list(200)
    for v in vols:
        v["_id"] = str(v["_id"])
        # Check if volunteer has an SA account
        if v.get("email"):
            user = await db.users.find_one({"email": v["email"].lower().strip()})
            v["has_account"] = user is not None
            v["user_name"] = user.get("full_name", "") if user else ""
        else:
            v["has_account"] = False
            v["user_name"] = ""
    return {"volunteers": vols}


@router.post("/admin/{slug}/volunteers")
async def add_volunteer(slug: str, request: Request, admin=Depends(_require_admin)):
    """Add a volunteer/ambassador to an event by email."""
    db = _get_db(request)
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    role = body.get("role", "volunteer")

    if not email or "@" not in email:
        raise HTTPException(400, "Valid email required")
    from core.email_quality import require_ok
    email = require_ok(email)
    if role not in ("volunteer", "ambassador"):
        raise HTTPException(400, "Role must be 'volunteer' or 'ambassador'")

    # Check duplicate
    existing = await db.echo_volunteers.find_one({"slug": slug, "email": email})
    if existing:
        raise HTTPException(409, "User already added as volunteer for this event")

    from datetime import datetime, timezone
    record = {
        "slug": slug,
        "email": email,
        "role": role,
        "added_by": admin.get("email", "admin"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.echo_volunteers.insert_one(record)

    # Check if user has SA account
    user = await db.users.find_one({"email": email})
    has_account = user is not None
    user_name = user.get("full_name", "") if user else ""

    # TODO: Send invitation email if no account exists

    return {"ok": True, "has_account": has_account, "user_name": user_name, "email": email}


@router.delete("/admin/{slug}/volunteers/{volunteer_id}")
async def remove_volunteer(slug: str, volunteer_id: str, request: Request, _=Depends(_require_admin)):
    """Remove a volunteer from an event."""
    db = _get_db(request)
    from bson import ObjectId
    try:
        vid = ObjectId(volunteer_id)
    except Exception:
        raise HTTPException(400, "Invalid volunteer ID")
    result = await db.echo_volunteers.delete_one({"_id": vid, "slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(404, "Volunteer not found")
    return {"ok": True}


@router.get("/volunteer/events")
async def my_volunteer_events(request: Request, user=Depends(_get_current_user_dependency())):
    """Get events the current user is a volunteer for."""
    db = _get_db(request)
    email = (user.get("email") or "").strip().lower()
    vols = await db.echo_volunteers.find({"email": email}).to_list(50)
    events = []
    for v in vols:
        showcase = await db.echo_showcases.find_one({"slug": v["slug"]})
        if showcase:
            events.append({
                "slug": v["slug"],
                "title": showcase.get("title", ""),
                "role": v.get("role", "volunteer"),
                "event_date": showcase.get("date", ""),
                "venue": showcase.get("venue", ""),
            })
    return {"events": events}


@router.get("/volunteer/scan-access")
async def check_scan_access(request: Request, user=Depends(_get_current_user_dependency())):
    """Check if current user has scan access (super_admin or volunteer)."""
    db = _get_db(request)
    role = (user.get("role") or "").lower()
    if role in ("super_admin", "admin"):
        return {"access": True, "role": "admin"}

    email = (user.get("email") or "").strip().lower()
    vol = await db.echo_volunteers.find_one({"email": email})
    if vol:
        return {"access": True, "role": vol.get("role", "volunteer"), "slug": vol.get("slug")}

    return {"access": False}


