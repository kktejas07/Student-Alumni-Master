"""Internal hiring & interns pipeline endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ─────────────────────────────────────────────────────────────────────────────
# ── INTERNAL HIRING & INTERNS MODULE (ECHO VNRVJIET, SNIST, ETC.) ───────────
# ─────────────────────────────────────────────────────────────────────────────

STAGE_NEXT_MAP = {
    "applicant_pool": "shortlisted",
    "shortlisted": "unpaid_intern",
    "unpaid_intern": "paid_intern",
    "paid_intern": "full_time",
    "full_time": "full_time",
}

@router.post("/admin/interns/sync-registrations")
async def sync_echo_registrations_to_interns(request: Request, _=Depends(_require_admin)):
    """Sync all event registrations from Echo VNRVJIET, SNIST, etc. into the Internal Hiring applicant pool."""
    db = _get_db(request)
    regs = await db.echo_registrations.find({}).to_list(10000)
    synced = 0
    now_iso = _now()

    for r in regs:
        reg_id = r.get("id") or str(r.get("_id"))
        email = (r.get("email") or "").strip().lower()
        if not email:
            continue

        existing = await db.echo_intern_candidates.find_one({"$or": [{"reg_id": reg_id}, {"email": email}]})
        if not existing:
            branch = (r.get("branch") or "").lower()
            skills = []
            if any(k in branch for k in ["cs", "cse", "it", "code", "tech", "computer", "data", "ai", "ml"]):
                skills.append("Technical")
            if any(k in branch for k in ["mkt", "market", "biz", "comm", "media", "mgmt", "management"]):
                skills.append("Marketing")
            if not skills:
                skills.append("Technical")

            candidate = {
                "reg_id": reg_id,
                "full_name": r.get("full_name") or email.split("@")[0].title(),
                "email": email,
                "phone": r.get("phone") or "",
                "college": r.get("college") or r.get("showcase_college") or "VNRVJIET / SNIST",
                "branch": r.get("branch") or "",
                "year": r.get("year") or "",
                "slug": r.get("slug") or "echo-event",
                "event_title": r.get("showcase_title") or r.get("event_title") or r.get("slug") or "Echo Event",
                "stage": "applicant_pool",
                "skills": skills,
                "stipend": 0,
                "role_title": "Intern Prospect",
                "notes": f"Auto-synced from {r.get('showcase_title') or r.get('slug')} registration.",
                "created_at": r.get("created_at") or now_iso,
                "updated_at": now_iso,
                "status": "active",
            }
            await db.echo_intern_candidates.insert_one(candidate)
            synced += 1

    return {"ok": True, "synced_count": synced}


@router.get("/admin/interns")
async def list_intern_candidates(
    request: Request,
    slug: Optional[str] = None,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    domain: Optional[str] = None,
    limit: int = Query(1000, ge=1, le=5000),
    _=Depends(_require_admin),
):
    """List internal hiring candidates and intern pipeline."""
    db = _get_db(request)

    # First auto-sync any new registrations seamlessly
    try:
        regs = await db.echo_registrations.find({}).to_list(10000)
        now_iso = _now()
        for r in regs:
            reg_id = r.get("id") or str(r.get("_id"))
            email = (r.get("email") or "").strip().lower()
            if not email:
                continue
            existing = await db.echo_intern_candidates.find_one({"$or": [{"reg_id": reg_id}, {"email": email}]})
            if not existing:
                branch = (r.get("branch") or "").lower()
                skills = []
                if any(k in branch for k in ["cs", "cse", "it", "code", "tech", "computer", "data", "ai", "ml"]):
                    skills.append("Technical")
                if any(k in branch for k in ["mkt", "market", "biz", "comm", "media", "mgmt", "management"]):
                    skills.append("Marketing")
                if not skills:
                    skills.append("Technical")

                candidate = {
                    "reg_id": reg_id,
                    "full_name": r.get("full_name") or email.split("@")[0].title(),
                    "email": email,
                    "phone": r.get("phone") or "",
                    "college": r.get("college") or r.get("showcase_college") or "VNRVJIET / SNIST",
                    "branch": r.get("branch") or "",
                    "year": r.get("year") or "",
                    "slug": r.get("slug") or "echo-event",
                    "event_title": r.get("showcase_title") or r.get("event_title") or r.get("slug") or "Echo Event",
                    "stage": "applicant_pool",
                    "skills": skills,
                    "stipend": 0,
                    "role_title": "Intern Prospect",
                    "notes": f"Auto-imported from {r.get('showcase_title') or r.get('slug')} registration.",
                    "created_at": r.get("created_at") or now_iso,
                    "updated_at": now_iso,
                    "status": "active",
                }
                await db.echo_intern_candidates.insert_one(candidate)
    except Exception as e:
        print(f"[INTERNS SYNC WARN] {e}")

    query: Dict[str, Any] = {"status": {"$ne": "deleted"}}
    if slug and slug != "all":
        query["slug"] = slug
    if stage and stage != "all":
        query["stage"] = stage
    if domain and domain != "all":
        query["skills"] = domain
    if search:
        rx = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [
            {"full_name": rx},
            {"email": rx},
            {"phone": rx},
            {"college": rx},
            {"role_title": rx},
        ]

    docs = await db.echo_intern_candidates.find(query).sort("updated_at", -1).limit(limit).to_list(limit)

    items = []
    counts = {"applicant_pool": 0, "shortlisted": 0, "unpaid_intern": 0, "paid_intern": 0, "full_time": 0}

    all_docs = await db.echo_intern_candidates.find({"status": {"$ne": "deleted"}}).to_list(10000)
    for d in all_docs:
        st = d.get("stage") or "applicant_pool"
        if st in counts:
            counts[st] += 1

    for d in docs:
        d_ser = _ser(d)
        items.append(d_ser)

    return {"items": items, "total": len(items), "counts": counts}


@router.post("/admin/interns/convert")
async def convert_registration_to_intern(request: Request, _=Depends(_require_admin)):
    """Convert an event attendee into an Intern Candidate."""
    db = _get_db(request)
    body = await request.json()
    reg_id = body.get("reg_id")
    email = (body.get("email") or "").strip().lower()
    target_stage = body.get("target_stage") or "shortlisted"
    skills = body.get("skills") or ["Technical"]
    notes = body.get("notes") or ""
    role_title = body.get("role_title") or "Intern Prospect"
    stipend = body.get("stipend") or 0

    now_iso = _now()
    existing = None
    if reg_id:
        existing = await db.echo_intern_candidates.find_one({"reg_id": reg_id})
    if not existing and email:
        existing = await db.echo_intern_candidates.find_one({"email": email})

    if existing:
        await db.echo_intern_candidates.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "stage": target_stage,
                "skills": skills,
                "notes": notes or existing.get("notes"),
                "role_title": role_title or existing.get("role_title"),
                "stipend": stipend if stipend else existing.get("stipend", 0),
                "updated_at": now_iso,
            }}
        )
        updated = await db.echo_intern_candidates.find_one({"_id": existing["_id"]})
        return {"ok": True, "candidate": _ser(updated), "message": "Updated candidate stage"}

    reg_doc = None
    if reg_id:
        reg_doc = await db.echo_registrations.find_one({"id": reg_id})

    candidate = {
        "reg_id": reg_id or "",
        "full_name": body.get("full_name") or (reg_doc.get("full_name") if reg_doc else email.split("@")[0].title()),
        "email": email or (reg_doc.get("email") if reg_doc else ""),
        "phone": body.get("phone") or (reg_doc.get("phone") if reg_doc else ""),
        "college": body.get("college") or (reg_doc.get("college") if reg_doc else "VNRVJIET / SNIST"),
        "branch": body.get("branch") or (reg_doc.get("branch") if reg_doc else ""),
        "year": body.get("year") or (reg_doc.get("year") if reg_doc else ""),
        "slug": body.get("slug") or (reg_doc.get("slug") if reg_doc else "echo-event"),
        "event_title": reg_doc.get("showcase_title") if reg_doc else "Echo Event",
        "stage": target_stage,
        "skills": skills,
        "stipend": stipend,
        "role_title": role_title,
        "notes": notes or "Converted from event registration.",
        "created_at": now_iso,
        "updated_at": now_iso,
        "status": "active",
    }
    res = await db.echo_intern_candidates.insert_one(candidate)
    candidate["_id"] = str(res.inserted_id)

    return {"ok": True, "candidate": _ser(candidate), "message": "Candidate added to internal hiring"}


@router.post("/admin/interns/{candidate_id}/advance")
async def advance_intern_stage(candidate_id: str, request: Request, _=Depends(_require_admin)):
    """Advance candidate to the next hiring stage (Applicant -> Shortlisted -> Unpaid Intern -> Paid Intern -> Full Time)."""
    db = _get_db(request)
    body = await request.json()

    from bson import ObjectId
    query: Dict[str, Any] = {}
    try:
        query = {"_id": ObjectId(candidate_id)}
    except Exception:
        query = {"id": candidate_id}

    candidate = await db.echo_intern_candidates.find_one(query)
    if not candidate:
        query = {"reg_id": candidate_id}
        candidate = await db.echo_intern_candidates.find_one(query)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cur_stage = candidate.get("stage") or "applicant_pool"
    next_stage = body.get("next_stage") or STAGE_NEXT_MAP.get(cur_stage, "unpaid_intern")
    now_iso = _now()

    updates: Dict[str, Any] = {
        "stage": next_stage,
        "updated_at": now_iso,
    }

    if "skills" in body and body["skills"]:
        updates["skills"] = body["skills"]
    if "stipend" in body and body["stipend"] is not None:
        updates["stipend"] = body["stipend"]
    if "role_title" in body and body["role_title"]:
        updates["role_title"] = body["role_title"]
    if "notes" in body and body["notes"]:
        updates["notes"] = body["notes"]

    await db.echo_intern_candidates.update_one({"_id": candidate["_id"]}, {"$set": updates})
    updated = await db.echo_intern_candidates.find_one({"_id": candidate["_id"]})

    return {
        "ok": True,
        "candidate": _ser(updated),
        "prev_stage": cur_stage,
        "new_stage": next_stage,
        "message": f"Advanced {updated.get('full_name')} to {next_stage.replace('_', ' ').title()}",
    }


@router.put("/admin/interns/{candidate_id}")
async def update_intern_candidate(candidate_id: str, request: Request, _=Depends(_require_admin)):
    """Update intern candidate details (skills, notes, stipend, stage)."""
    db = _get_db(request)
    body = await request.json()

    from bson import ObjectId
    try:
        query = {"_id": ObjectId(candidate_id)}
    except Exception:
        query = {"id": candidate_id}

    candidate = await db.echo_intern_candidates.find_one(query)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    now_iso = _now()
    body["updated_at"] = now_iso
    body.pop("_id", None)
    body.pop("id", None)

    await db.echo_intern_candidates.update_one({"_id": candidate["_id"]}, {"$set": body})
    updated = await db.echo_intern_candidates.find_one({"_id": candidate["_id"]})
    return {"ok": True, "candidate": _ser(updated)}


@router.delete("/admin/interns/{candidate_id}")
async def delete_intern_candidate(candidate_id: str, request: Request, _=Depends(_require_admin)):
    """Delete candidate from internal hiring pipeline."""
    db = _get_db(request)
    from bson import ObjectId
    try:
        query = {"_id": ObjectId(candidate_id)}
    except Exception:
        query = {"id": candidate_id}

    res = await db.echo_intern_candidates.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return {"ok": True, "message": "Candidate deleted"}

