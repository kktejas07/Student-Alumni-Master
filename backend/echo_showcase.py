"""
ECHO Showcase — FastAPI router & CMS engine.

Public routes  (no auth required for published showcases):
  GET  /api/echo/showcases              list published showcases
  GET  /api/echo/showcases/{slug}       single full showcase

Admin routes   (super-admin JWT required):
  POST   /api/echo/admin/showcases
  PUT    /api/echo/admin/showcases/{id}
  DELETE /api/echo/admin/showcases/{id}
  PATCH  /api/echo/admin/showcases/{id}/publish
  PATCH  /api/echo/admin/showcases/{id}/draft
  PATCH  /api/echo/admin/showcases/{id}/archive
  GET    /api/echo/admin/showcases      (all statuses)
  POST   /api/echo/admin/upload         (media & document upload)
  GET    /api/echo/admin/media          (media library listing)
  DELETE /api/echo/admin/media/{filename}  (delete media file)
"""

from __future__ import annotations
import os
import base64
import json
import mimetypes
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/echo", tags=["echo-showcase"])

UPLOAD_DIR = Path("uploads/echo")
MEDIA_META_FILE = UPLOAD_DIR / ".media_meta.json"


# ── DB dependency ────────────────────────────────────────────────────────────
def _get_db(request: Request) -> AsyncIOMotorDatabase:
    from db import db  # imported lazily to avoid circular imports at module load
    return db


# ── Auth helper ──────────────────────────────────────────────────────────────
async def _require_admin(request: Request):
    """Reuse the same JWT logic as the rest of server.py."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]
    import jwt as _jwt
    JWT_SECRET = os.environ.get("JWT_SECRET", "studentalumni_jwt_secret_key_2026")
    try:
        payload = _jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


# ── Helpers ──────────────────────────────────────────────────────────────────
def _oid(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {v}")


def _ser(doc: dict) -> dict:
    """Recursively serialise ObjectId → str for JSON responses."""
    if doc is None:
        return {}
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [_ser(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            out[k] = _ser(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Media metadata helpers ────────────────────────────────────────────────────
def _load_media_meta() -> dict:
    """Load persistent media metadata from JSON sidecar file."""
    try:
        if MEDIA_META_FILE.exists():
            return json.loads(MEDIA_META_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_media_meta(meta: dict) -> None:
    """Persist media metadata to JSON sidecar file."""
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        MEDIA_META_FILE.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    except Exception:
        pass


def _human_size(size: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size = size / 1024
    return f"{size:.1f} TB"


# ── Pydantic schemas ─────────────────────────────────────────────────────────
class StatItem(BaseModel):
    label: str
    value: str
    icon: Optional[str] = "users"
    color: Optional[str] = None
    display_order: Optional[int] = 0

class HighlightItem(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""
    color: Optional[str] = None
    display_order: Optional[int] = 0

class TestimonialItem(BaseModel):
    name: str
    branch: Optional[str] = ""
    department: Optional[str] = ""
    year: Optional[str] = ""
    quote: str
    rating: Optional[int] = 5
    avatar_url: Optional[str] = None
    photo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    visible: Optional[bool] = True
    sort_order: Optional[int] = 0

class TimelineItem(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""

class PartnerItem(BaseModel):
    name: str
    logo_url: Optional[str] = None
    kind: Optional[str] = "association"  # association | sponsor
    website_url: Optional[str] = None

class SponsorItem(BaseModel):
    name: str
    logo_url: Optional[str] = None
    tier: Optional[str] = "Gold Sponsor"  # Title Sponsor | Platinum | Gold | Silver | Associate
    website_url: Optional[str] = None
    priority: Optional[int] = 0

class GalleryItem(BaseModel):
    url: str
    caption: Optional[str] = ""
    alt: Optional[str] = ""
    credit: Optional[str] = ""
    tags: Optional[List[str]] = []
    featured: Optional[bool] = False
    order: Optional[int] = 0
    hero: Optional[bool] = False

class DownloadItem(BaseModel):
    title: str
    file_url: str
    description: Optional[str] = ""
    file_size: Optional[str] = ""
    category: Optional[str] = "Document"

class VideoItem(BaseModel):
    title: str
    video_url: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = ""
    platform: Optional[str] = "youtube"  # youtube | vimeo | mp4

class AboutCard(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""
    color: Optional[str] = None

class ShowcaseCreateSchema(BaseModel):
    title: str
    slug: str
    subtitle: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = ""
    time: Optional[str] = ""
    venue: Optional[str] = ""
    college: Optional[str] = ""
    category: Optional[str] = "college-event"
    status: Optional[str] = "draft"           # draft | published | archived
    event_status_badge: Optional[str] = "Upcoming"  # Upcoming | Live | Completed
    hero_image_url: Optional[str] = None
    hero_cover_url: Optional[str] = None
    hero_thumbnail_url: Optional[str] = None
    hero_bg_url: Optional[str] = None
    organizer_name: Optional[str] = ""
    organizer_logo_url: Optional[str] = None
    stats: Optional[List[StatItem]] = []
    highlights: Optional[List[HighlightItem]] = []
    about_cards: Optional[List[AboutCard]] = []
    testimonials: Optional[List[TestimonialItem]] = []
    timeline: Optional[List[TimelineItem]] = []
    partners: Optional[List[PartnerItem]] = []
    sponsors: Optional[List[SponsorItem]] = []
    gallery: Optional[List[GalleryItem]] = []
    gallery_layout: Optional[str] = "grid"  # grid | masonry | mixed | featured-grid | carousel
    downloads: Optional[List[DownloadItem]] = []
    videos: Optional[List[VideoItem]] = []
    cta_title: Optional[str] = "Stay tuned for more events!"
    cta_subtitle: Optional[str] = "Join our community and never miss an opportunity to learn, connect, and grow."
    cta_button_text: Optional[str] = "View Upcoming Events"
    cta_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None

# ShowcaseUpdateSchema makes every field optional (for partial PATCH-style updates).
# Defined as a standalone model (not inheriting ShowcaseCreateSchema) to avoid
# mutable-attribute override type errors with strict type-checkers.
class ShowcaseUpdateSchema(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    college: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    event_status_badge: Optional[str] = None
    hero_image_url: Optional[str] = None
    hero_cover_url: Optional[str] = None
    hero_thumbnail_url: Optional[str] = None
    hero_bg_url: Optional[str] = None
    organizer_name: Optional[str] = None
    organizer_logo_url: Optional[str] = None
    stats: Optional[List[StatItem]] = None
    highlights: Optional[List[HighlightItem]] = None
    about_cards: Optional[List[AboutCard]] = None
    testimonials: Optional[List[TestimonialItem]] = None
    timeline: Optional[List[TimelineItem]] = None
    partners: Optional[List[PartnerItem]] = None
    sponsors: Optional[List[SponsorItem]] = None
    gallery: Optional[List[GalleryItem]] = None
    gallery_layout: Optional[str] = None
    downloads: Optional[List[DownloadItem]] = None
    videos: Optional[List[VideoItem]] = None
    cta_title: Optional[str] = None
    cta_subtitle: Optional[str] = None
    cta_button_text: Optional[str] = None
    cta_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None


# ── Seed Default Data ────────────────────────────────────────────────────────
DEFAULT_SHOWCASE_SEED = {
    "title": "VNR ECHO 2026",
    "slug": "vnr-echo-2026",
    "subtitle": "Empowering Tomorrow's Leaders",
    "description": "A day of inspiration, learning, and networking as industry leaders, alumni, and students came together to explore opportunities and shape the future of technology.",
    "date": "August 15, 2026",
    "time": "10:00 AM – 4:30 PM",
    "venue": "Main Auditorium, VNR VJIET",
    "college": "VNR VJIET",
    "category": "college-event",
    "status": "published",
    "event_status_badge": "Upcoming",
    "hero_image_url": None,
    "hero_cover_url": None,
    "hero_thumbnail_url": None,
    "hero_bg_url": None,
    "organizer_name": "Student Alumni Cell",
    "organizer_logo_url": None,
    "stats": [
        { "label": "Students Attended", "value": "320+", "icon": "users", "display_order": 0 },
        { "label": "Expert Speakers",   "value": "12",   "icon": "speakers", "display_order": 1 },
        { "label": "Sessions",          "value": "6",    "icon": "sessions", "display_order": 2 },
        { "label": "Networking Connections", "value": "48", "icon": "network", "display_order": 3 },
        { "label": "Feedback Score",    "value": "95%",  "icon": "feedback", "display_order": 4 }
    ],
    "highlights": [
        { "icon": "book", "title": "Learn",   "description": "Industry insights", "display_order": 0 },
        { "icon": "network", "title": "Connect", "description": "Build your network", "display_order": 1 },
        { "icon": "trending", "title": "Grow", "description": "Shape your future", "display_order": 2 }
    ],
    "about_cards": [
        { "icon": "book", "title": "Learn", "description": "Industry insights from leading professionals" },
        { "icon": "network", "title": "Connect", "description": "Build lasting networks with peers and alumni" },
        { "icon": "trending", "title": "Grow", "description": "Shape your professional future" }
    ],
    "testimonials": [
        { "name": "Ananya S.", "branch": "Computer Science", "department": "Computer Science", "year": "Final Year", "quote": "Amazing event! The sessions were insightful and helped me understand industry expectations much better.", "rating": 5, "visible": True, "sort_order": 0 },
        { "name": "Rohit M.", "branch": "Information Technology", "department": "Information Technology", "year": "Pre-final Year", "quote": "Great opportunity to network with professionals and connect with like-minded peers.", "rating": 5, "visible": True, "sort_order": 1 },
        { "name": "Priya K.", "branch": "Electronics & Communication", "department": "Electronics & Communication", "year": "Final Year", "quote": "The workshops were hands-on and very practical. Looking forward to more such events!", "rating": 5, "visible": True, "sort_order": 2 }
    ],
    "timeline": [
        { "icon": "star", "title": "Inspiring Keynotes", "description": "Industry leaders shared their journey and insights" },
        { "icon": "users", "title": "Panel Discussions", "description": "Engaging conversations on career and tech trends" },
        { "icon": "code", "title": "Hands-on Workshops", "description": "Practical learning and skill-building sessions" },
        { "icon": "network", "title": "Networking Sessions", "description": "Students connected with experts and alumni" }
    ],
    "partners": [
        { "name": "Microsoft", "kind": "association", "logo_url": None },
        { "name": "Google", "kind": "association", "logo_url": None },
        { "name": "LinkedIn", "kind": "association", "logo_url": None }
    ],
    "sponsors": [
        { "name": "Tech Corp", "tier": "Title Sponsor", "website_url": "https://example.com", "logo_url": None, "priority": 0 },
        { "name": "InnoLabs", "tier": "Gold Sponsor", "website_url": "https://example.com", "logo_url": None, "priority": 1 }
    ],
    "downloads": [
        { "title": "VNR ECHO 2026 Brochure", "description": "Official event guide & schedule", "file_url": "", "file_size": "2.4 MB", "category": "Brochure" }
    ],
    "videos": [],
    "gallery": [],
    "gallery_layout": "grid",
    "cta_title": "Stay tuned for more events!",
    "cta_subtitle": "Join our community and never miss an opportunity to learn, connect, and grow.",
    "cta_button_text": "View Upcoming Events",
    "cta_url": None,
    "seo_title": "VNR ECHO 2026 — Student Alumni Flagship Showcase",
    "seo_description": "Join VNR ECHO 2026 for inspiration, workshops, networking, and industry keynotes.",
    "seo_keywords": "VNR VJIET, ECHO 2026, Student Alumni, Hackathon, Networking",
    "created_at": _now(),
    "updated_at": _now(),
    "created_by": "system"
}


async def seed_echo_showcase(db: AsyncIOMotorDatabase):
    """Seed initial VNR ECHO 2026 showcase if missing."""
    try:
        existing = await db.echo_showcases.find_one({"slug": "vnr-echo-2026"})
        if not existing:
            doc = dict(DEFAULT_SHOWCASE_SEED)
            doc["created_at"] = _now()
            doc["updated_at"] = _now()
            await db.echo_showcases.insert_one(doc)
            print("[ECHO CMS] Seeded default vnr-echo-2026 showcase")
    except Exception as e:
        print(f"[ECHO CMS] Seed warning: {e}")


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
    doc = await db.echo_showcases.find_one({"slug": slug})
    if not doc and slug == "vnr-echo-2026":
        await seed_echo_showcase(db)
        doc = await db.echo_showcases.find_one({"slug": slug})

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
    return _ser(doc)


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
    doc = await db.echo_showcases.find_one({"_id": _oid(showcase_id)})
    return _ser(doc or {})


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


@router.post("/admin/upload")
async def upload_echo_media(
    request: Request,
    file: Optional[UploadFile] = File(None),
    admin=Depends(_require_admin)
):
    """Upload images or document assets for ECHO Showcase CMS."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_bytes = None
    filename = None
    original_name = None

    content_type = request.headers.get("content-type", "")

    if file and file.filename:
        filename = file.filename
        original_name = filename
        file_bytes = await file.read()
    elif "application/json" in content_type:
        body = await request.json()
        data = body.get("data", "")
        filename = body.get("filename") or f"upload_{int(datetime.now().timestamp())}.png"
        original_name = filename
        if "," in data:
            data = data.split(",", 1)[1]
        file_bytes = base64.b64decode(data)
    else:
        raise HTTPException(status_code=400, detail="No file or base64 data provided")

    # Validate file size (25 MB max)
    MAX_SIZE = 25 * 1024 * 1024
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 25 MB allowed.")

    ext = Path(filename).suffix.lower() or ".png"
    # Allow only safe extensions
    ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".pdf", ".docx", ".xlsx", ".pptx", ".zip"}
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed.")

    ts = int(datetime.now().timestamp())
    safe_name = f"{ts}_{Path(filename).stem.replace(' ', '_')}{ext}"
    out_path = UPLOAD_DIR / safe_name

    with open(out_path, "wb") as f:
        f.write(file_bytes)

    url = f"/uploads/echo/{safe_name}"

    # Track in metadata sidecar
    meta = _load_media_meta()
    meta[safe_name] = {
        "filename": safe_name,
        "original_name": original_name,
        "url": url,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "ext": ext.lstrip("."),
        "content_type": mimetypes.guess_type(safe_name)[0] or "application/octet-stream",
        "uploaded_at": _now(),
        "uploaded_by": admin.get("sub") or admin.get("user_id") or "admin",
    }
    _save_media_meta(meta)

    return {
        "ok": True,
        "url": url,
        "filename": safe_name,
        "original_name": original_name,
        "size": len(file_bytes),
        "size_human": _human_size(len(file_bytes)),
        "content_type": ext.strip(".")
    }


# ── Media Library endpoints ───────────────────────────────────────────────────

@router.get("/admin/media")
async def list_echo_media(request: Request, _=Depends(_require_admin)):
    """List all uploaded media files for the ECHO Media Library."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    meta = _load_media_meta()

    files = []
    total_bytes = 0

    # Scan actual files on disk, merge with metadata
    try:
        all_files = sorted(
            [p for p in UPLOAD_DIR.iterdir() if p.is_file() and not p.name.startswith(".")],
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )
    except Exception:
        all_files = []

    for p in all_files:
        size = p.stat().st_size
        total_bytes += size
        ext = p.suffix.lower().lstrip(".")
        m = meta.get(p.name, {})
        files.append({
            "filename": p.name,
            "original_name": m.get("original_name", p.name),
            "url": f"/uploads/echo/{p.name}",
            "size": size,
            "size_human": _human_size(size),
            "ext": ext,
            "content_type": mimetypes.guess_type(p.name)[0] or "application/octet-stream",
            "uploaded_at": m.get(
                "uploaded_at",
                datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat()
            ),
            "uploaded_by": m.get("uploaded_by", "admin"),
            "is_image": ext in ("jpg", "jpeg", "png", "webp", "avif", "gif"),
        })

    return {
        "items": files,
        "total": len(files),
        "total_size": total_bytes,
        "total_size_human": _human_size(total_bytes),
    }


@router.delete("/admin/media/{filename}")
async def delete_echo_media(filename: str, request: Request, _=Depends(_require_admin)):
    """Delete a media file from the ECHO Media Library."""
    # Security: strip any path traversal attempts
    safe_filename = Path(filename).name
    if safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    target = UPLOAD_DIR / safe_filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")

    target.unlink()

    # Remove from metadata
    meta = _load_media_meta()
    meta.pop(safe_filename, None)
    _save_media_meta(meta)

    return {"ok": True, "deleted": safe_filename}
