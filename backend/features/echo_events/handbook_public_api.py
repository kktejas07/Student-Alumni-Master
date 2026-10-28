"""Handbook downloads + public showcase endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── Showcase-specific handbook download endpoints ────────────────────────────
from fastapi.responses import FileResponse, RedirectResponse

@router.get("/showcases/{slug}/handbook")
@router.get("/showcases/{slug}/handbook/download")
async def download_showcase_handbook(slug: str, request: Request):
    db = _get_db(request)
    doc = await db.echo_showcases.find_one(_slug_query(slug))
    if not doc:
        raise HTTPException(status_code=404, detail="Showcase not found")

    # 1. Check showcase.handbook_url
    handbook_url = (doc.get("handbook_url") or "").strip()

    # 2. Check showcase.downloads for a handbook/brochure/guide item
    if not handbook_url:
        downloads = doc.get("downloads") or []
        for d in downloads:
            cat = (d.get("category") or "").lower()
            title = (d.get("title") or "").lower()
            url = (d.get("file_url") or "").strip()
            if url and (cat in ("handbook", "brochure", "guide") or "handbook" in title or "guide" in title or "brochure" in title):
                handbook_url = url
                break

    if not handbook_url:
        raise HTTPException(status_code=404, detail="Handbook not available for this showcase")

    # If it's an external URL (http/https), redirect
    if handbook_url.startswith("http://") or handbook_url.startswith("https://"):
        return RedirectResponse(url=handbook_url)

    # If it's a local static path, resolve it
    filename = Path(handbook_url).name
    candidate_paths = [
        Path(__file__).parent.parent / "static" / filename,
        Path(__file__).parent.parent / "uploads" / filename,
        Path(__file__).parent.parent / "uploads" / "documents" / filename,
        Path(__file__).parent.parent.parent / "uploads" / filename,
    ]
    for p in candidate_paths:
        if p.is_file():
            return FileResponse(
                path=str(p),
                filename=filename,
                media_type="application/pdf"
            )

    raise HTTPException(status_code=404, detail="Handbook file not found on server")


# ── Legacy handbook redirect endpoint (preserves backwards compatibility) ──
@router.get("/handbook")
@router.get("/handbook/download")
async def download_handbook_legacy(slug: Optional[str] = Query(None)):
    target_slug = slug or "snist"
    return RedirectResponse(url=f"/api/echo/showcases/{target_slug}/handbook", status_code=307)


# ── Public endpoints ─────────────────────────────────────────────────────────
@router.get("/showcases")
async def list_showcases(request: Request):
    db = _get_db(request)
    docs = await db.echo_showcases.find(
        {"status": "published"},
        {"gallery": 0, "testimonials": 0, "timeline": 0}
    ).sort("date", -1).to_list(100)

    # Auto-seed if empty
    if len(docs) == 0:
        await seed_echo_showcase(db)
        docs = await db.echo_showcases.find(
            {"status": "published"},
            {"gallery": 0, "testimonials": 0, "timeline": 0}
        ).sort("date", -1).to_list(100)

    return {"items": [_ser(d) for d in docs]}


@router.get("/showcases/{slug}")
async def get_showcase(slug: str, request: Request):
    db = _get_db(request)
    doc = await db.echo_showcases.find_one(_slug_query(slug))
    if not doc:
        # Auto-seed default showcases if fresh database
        await seed_echo_showcase(db)
        doc = await db.echo_showcases.find_one(_slug_query(slug))

    if not doc:
        raise HTTPException(status_code=404, detail="Showcase not found")
    if doc.get("status") != "published":
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            raise HTTPException(status_code=404, detail="Showcase not found")
        try:
            await _require_admin(request)
        except HTTPException:
            raise HTTPException(status_code=404, detail="Showcase not found")
    result = _ser(doc)
    # Attach live registration counts for seat display
    slug_val = doc.get("slug", slug)
    paid_count = await db.echo_registrations.count_documents({
        "slug": slug_val, "payment.status": "paid",
    })
    total_count = await db.echo_registrations.count_documents({
        "slug": slug_val,
    })
    reg_cfg = result.get("registration") or {}
    reg_cfg["paid_count"] = paid_count
    reg_cfg["total_registrations"] = total_count
    # Truthful seat availability derived from the real capacity gate (max_seats),
    # not the hardcoded seed default. max_seats=0 means unlimited.
    max_seats = int(reg_cfg.get("max_seats") or 0)
    if max_seats > 0:
        available = max_seats - paid_count
        reg_cfg["available_seats"] = max(available, 0)
    else:
        reg_cfg["available_seats"] = None
    result["registration"] = reg_cfg
    result["available_seats"] = reg_cfg["available_seats"]
    return result


