"""Coupon System — CRUD + redemption. Extracted from server.py (architecture audit Step 4b)."""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from db import db
from server import get_current_user

router = APIRouter()

# ----------------------------------------------------------------------------
# Coupon System — CRUD + redemption
# ----------------------------------------------------------------------------
def _coupon_fields(d: dict) -> dict:
    """Whitelist of coupon fields returned to clients (never leaks internals).
    When locked, the code, description, and instructions are masked."""
    locked = bool(d.get("locked", False))
    return {
        "id": str(d["_id"]),
        "code": "****" if locked else d.get("code", ""),
        "description": "" if locked else d.get("description", ""),
        "discount_type": d.get("discount_type", "percentage"),
        "discount_pct": 0 if locked else d.get("discount_pct", 0),
        "max_uses": d.get("max_uses", 0),
        "used_count": d.get("used_count", 0),
        "active": bool(d.get("active", True)),
        "expires_at": d.get("expires_at"),
        "image_url": d.get("image_url"),
        "partner_name": "" if locked else d.get("partner_name"),
        "partner_website_url": "" if locked else d.get("partner_website_url"),
        "instructions": "" if locked else d.get("instructions", ""),
        "audience": d.get("audience") or ["all"],
        "display_order": int(d.get("display_order", 0)),
        "created_at": d.get("created_at"),
        "locked": locked,
    }


@router.get("/coupons")
async def list_coupons():
    """Public — list active coupons for display."""
    docs = await db.coupons.find({"active": True}).sort("display_order", 1).to_list(100)
    return {"coupons": [_coupon_fields(d) for d in docs]}


@router.get("/coupons/active")
async def list_active_coupons_for_me(user: dict = Depends(get_current_user)):
    """Role-targeted coupons for the logged-in user's dashboard."""
    role = (user.get("role") or "student").lower()
    role_map = {"superadmin": "super_admin", "admin": "super_admin"}
    role = role_map.get(role, role)
    docs = await db.coupons.find({
        "active": True,
        "$or": [{"audience": "all"}, {"audience": role}],
    }).sort("display_order", 1).to_list(100)
    return {"coupons": [_coupon_fields(d) for d in docs], "role": role}


@router.post("/admin/coupons")
async def create_coupon(payload: dict, user: dict = Depends(get_current_user)):
    """Admin — create a new coupon."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin"):
        raise HTTPException(403, "Only admins can manage coupons")
    code = (payload.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Coupon code is required")
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(409, "Coupon code already exists")
    audience = payload.get("audience") or ["all"]
    if not isinstance(audience, list) or not audience:
        audience = ["all"]
    doc = {
        "code": code,
        "description": (payload.get("description") or "").strip(),
        "discount_type": payload.get("discount_type", "percentage"),
        "discount_pct": max(0, int(payload.get("discount_pct", 0) or 0)),
        "max_uses": max(1, int(payload.get("max_uses", 1))),
        "used_count": 0,
        "active": True,
        "expires_at": payload.get("expires_at"),
        "image_url": payload.get("image_url") or None,
        "partner_name": (payload.get("partner_name") or "").strip() or None,
        "partner_website_url": (payload.get("partner_website_url") or "").strip() or None,
        "instructions": (payload.get("instructions") or "").strip(),
        "audience": list(dict.fromkeys(audience)),
        "display_order": int(payload.get("display_order", 0) or 0),
        "created_by": str(user.get("_id")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.coupons.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return {"status": "ok", "coupon": doc}


@router.get("/admin/coupons")
async def admin_list_coupons(user: dict = Depends(get_current_user)):
    """Admin — list all coupons (active + inactive)."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin"):
        raise HTTPException(403, "Only admins can manage coupons")
    docs = await db.coupons.find().sort("created_at", -1).to_list(200)
    return {"coupons": [_coupon_fields(d) for d in docs]}


@router.patch("/admin/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Admin — toggle active or update coupon fields."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin"):
        raise HTTPException(403, "Only admins can manage coupons")
    from bson import ObjectId
    try:
        oid = ObjectId(coupon_id)
    except Exception:
        raise HTTPException(400, "Invalid coupon ID")
    existing = await db.coupons.find_one({"_id": oid})
    if not existing:
        raise HTTPException(404, "Coupon not found")
    update = {}
    for k in ("description", "discount_pct", "discount_type", "max_uses", "active", "expires_at",
              "image_url", "partner_name", "partner_website_url", "instructions",
              "audience", "display_order", "locked"):
        if k in payload:
            update[k] = payload[k]
    if not update:
        raise HTTPException(400, "No fields to update")
    result = await db.coupons.update_one({"_id": oid}, {"$set": update})
    if result.modified_count == 0:
        # Even if nothing changed, return success (values may be the same)
        pass
    updated = await db.coupons.find_one({"_id": oid})
    return {"status": "ok", "coupon": _coupon_fields(updated) if updated else None}


@router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(get_current_user)):
    """Admin — delete a coupon."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin"):
        raise HTTPException(403, "Only admins can manage coupons")
    from bson import ObjectId
    await db.coupons.delete_one({"_id": ObjectId(coupon_id)})
    return {"status": "ok"}


@router.post("/admin/coupons/upload")
async def upload_coupon_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Admin — upload coupon image. Returns the static URL."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin"):
        raise HTTPException(403, "Only admins can manage coupons")
    from pathlib import Path
    from datetime import datetime, timezone
    upload_dir = Path("uploads/coupons")
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix.lower() if file.filename else ".png"
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"}
    if ext not in allowed:
        raise HTTPException(400, f"File type {ext} not allowed")
    contents = await file.read()
    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(contents)
    max_size = 5 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(413, "File too large. Maximum 5 MB allowed")
    ts = int(datetime.now(timezone.utc).timestamp())
    stem = Path(file.filename).stem.replace(" ", "_") if file.filename else "coupon"
    safe_name = f"{ts}_{stem}{ext}"
    out_path = upload_dir / safe_name
    with open(out_path, "wb") as f:
        f.write(contents)
    url = f"/uploads/coupons/{safe_name}"
    return {"status": "ok", "url": url}


@router.post("/coupons/redeem")
async def redeem_coupon(payload: dict, user: dict = Depends(get_current_user)):
    """Redeem a coupon code — increments used_count if valid."""
    code = (payload.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Coupon code is required")
    coupon = await db.coupons.find_one({"code": code, "active": True})
    if not coupon:
        raise HTTPException(404, "Invalid or expired coupon code")
    if coupon.get("used_count", 0) >= coupon.get("max_uses", 1):
        raise HTTPException(400, "Coupon has reached its usage limit")
    if coupon.get("expires_at"):
        from datetime import datetime as _dt
        try:
            expires = _dt.fromisoformat(coupon["expires_at"].replace("Z", "+00:00"))
            if expires < _dt.now(timezone.utc):
                raise HTTPException(400, "Coupon has expired")
        except ValueError:
            pass
    await db.coupons.update_one(
        {"_id": coupon["_id"]},
        {"$inc": {"used_count": 1}}
    )
    return {"status": "ok", "discount_pct": coupon.get("discount_pct", 0), "code": code}
