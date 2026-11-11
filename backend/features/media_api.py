"""Logo serving + cross-portal ad images. Extracted from server.py (architecture audit Step 4b)."""
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from db import db
from server import get_current_user

router = APIRouter()

# ----------------------------------------------------------------------------
# Logo serving — sa-icon.png
# ----------------------------------------------------------------------------
import os as _os
_STATIC_DIR = Path(__file__).parent.parent / "static"
_STATIC_DIR.mkdir(exist_ok=True)


@router.get("/static/logo")
async def serve_logo():
    """Return the platform logo (sa-icon.png) for email templates and UI."""
    logo_path = _STATIC_DIR / "sa-icon.png"
    if not logo_path.exists():
        raise HTTPException(404, "Logo not found")
    from fastapi.responses import FileResponse
    return FileResponse(str(logo_path), media_type="image/png")


# ----------------------------------------------------------------------------
# Advertisement — cross-portal sidebar banner
# ----------------------------------------------------------------------------
# A single active "ad" (label + image_url + redirect_url) set by admin that
# appears at the bottom of every portal sidebar. All users (no auth) can
# fetch the active ad to display it.

@router.get("/ad/image")
async def get_ad_images():
    """Return all active advertisements as an array.
    Supports both legacy format (flat label/image_url/redirect_url fields)
    and new format (items array).
    """
    doc = await db.site_config.find_one({"_key": "advertisement"})
    if not doc:
        return {"ads": []}
    # New format: { items: [...] }
    if doc.get("items") and isinstance(doc["items"], list):
        return {"ads": doc["items"]}
    # Legacy format: { label, image_url, redirect_url }
    if doc.get("image_url"):
        return {"ads": [{
            "label": doc.get("label", ""),
            "image_url": doc.get("image_url", ""),
            "redirect_url": doc.get("redirect_url", ""),
        }]}
    return {"ads": []}


@router.post("/admin/ad/image")
async def set_ad_images(payload: dict, user: dict = Depends(get_current_user)):
    """Save all ads at once (admin only). Body: { items: [{ label, image_url, redirect_url }] }.
    Also accepts legacy single-ad format: { label, image_url, redirect_url }."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin"):
        raise HTTPException(403, "Only admins can set advertisements")
    # Support new items array format
    items = payload.get("items")
    if items is not None:
        if not isinstance(items, list):
            raise HTTPException(400, "items must be an array")
        if len(items) == 0:
            await db.site_config.update_one(
                {"_key": "advertisement"},
                {"$set": {
                    "_key": "advertisement",
                    "items": [],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": str(user.get("_id")),
                }},
                upsert=True,
            )
            return {"status": "ok", "items": []}
        for item in items:
            item["label"] = (item.get("label") or "").strip()
            item["image_url"] = (item.get("image_url") or "").strip()
            item["redirect_url"] = (item.get("redirect_url") or "").strip()
        await db.site_config.update_one(
            {"_key": "advertisement"},
            {"$set": {
                "_key": "advertisement",
                "items": items,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": str(user.get("_id")),
            }},
            upsert=True,
        )
        return {"status": "ok", "items": items}
    # Legacy single-ad format
    label = (payload.get("label") or "").strip()
    image_url = (payload.get("image_url") or "").strip()
    redirect_url = (payload.get("redirect_url") or "").strip()
    if not label or not image_url or not redirect_url:
        raise HTTPException(400, "items array or (label, image_url, redirect_url) are required")
    await db.site_config.update_one(
        {"_key": "advertisement"},
        {"$set": {
            "_key": "advertisement",
            "label": label,
            "image_url": image_url,
            "redirect_url": redirect_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": str(user.get("_id")),
        }},
        upsert=True,
    )
    return {"status": "ok", "label": label, "image_url": image_url, "redirect_url": redirect_url}
