"""
ECHO Marketplace — catalog + orders + admin management + discount coupons.

Mounted at prefix `/api/echo` to match the frontend `request()` helper, which
prepends `/api` to paths like `/echo/showcases/{slug}/catalog`.

Public routes (no auth):
  GET  /showcases/{slug}/catalog         active catalog items for an event
  POST /orders/checkout                  create/quote an order (Razorpay or free)
  POST /orders/verify-payment            confirm a paid marketplace order

Admin routes (super-admin JWT required):
  GET  /admin/showcases/{id}/catalog     list catalog items for a showcase
  POST /admin/showcases/{id}/catalog     create a catalog item
  PUT  /admin/catalog/{item_id}          update a catalog item
  DELETE /admin/catalog/{item_id}        delete a catalog item
  GET  /admin/showcases/{id}/orders      list marketplace orders for a showcase
  GET  /admin/coupons                    list discount coupons (event_slug query)
  POST /admin/coupons                    create a discount coupon (event-scoped)
"""

from __future__ import annotations
import os
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from core.db import db

router = APIRouter(prefix="/api/echo", tags=["echo-marketplace"])

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"


# ── Auth helpers ─────────────────────────────────────────────────────────────
async def _require_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]
    import jwt as _jwt
    try:
        payload = _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if (payload.get("role") or "").lower() not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


async def _resolve_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    import jwt as _jwt
    try:
        payload = _jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            return None
        try:
            return await db.users.find_one({"_id": ObjectId(uid)})
        except Exception:
            return None
    except Exception:
        return None


# ── Razorpay helpers (mirrors echo_showcase) ────────────────────────────────
async def _razorpay_config():
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


async def _razorpay_create_order(amount: float, currency: str, receipt: str, notes: dict):
    cfg = await _razorpay_config()
    if not cfg:
        return None
    import httpx
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(cfg["key_id"], cfg["key_secret"]),
                json={"amount": round(amount * 100), "currency": currency, "receipt": receipt, "notes": notes},
            )
            if r.status_code in (200, 201):
                return r.json()
            return None
    except Exception:
        return None


def _serialize(item: dict) -> dict:
    out = {}
    for k, v in item.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [_serialize(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            out[k] = _serialize(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# ── Catalog helpers ──────────────────────────────────────────────────────────
def _normalize_item(doc: dict) -> dict:
    """Return catalog item in the shape the frontend UI expects (id, stock_limit, images)."""
    item = _serialize(doc)
    item["id"] = item.get("_id")
    # Support both 'stock' (vendor portal) and 'stock_limit' (admin manager)
    item.setdefault("stock_limit", item.get("stock", 0))
    if not item.get("images"):
        item["images"] = []
    return item


async def _catalog_for_event(event_id: str):
    """Find active catalog items tied to an event, matching by slug, object id, or 'master'."""
    query_lines = [{"event_id": event_id}]
    try:
        query_lines.append({"_id": ObjectId(event_id)})
    except Exception:
        pass
    docs = await db.echo_catalog_items.find(
        {"$or": query_lines, "is_active": {"$ne": False}}
    ).to_list(length=1000)
    return [_normalize_item(d) for d in docs]


# ── Public: catalog ─────────────────────────────────────────────────────────

@router.get("/showcases/{slug}/catalog")
async def get_showcase_catalog(slug: str, request: Request):
    """Return the active marketplace catalog for an ECHO showcase.

    Merges items across scopes (showcase id, slug, and 'master') so items added
    by vendors via the vendor portal (which default to event_id='master') appear
    alongside admin-created event-scoped items.
    """
    showcase = await db.echo_showcases.find_one({
        "$or": [{"slug": slug}, {"aliases": slug}],
    })
    event_key = slug
    if showcase:
        event_key = str(showcase.get("_id")) if showcase.get("_id") else slug
    scopes = [event_key, slug, "master"]
    by_id = {}
    items = []
    for scope in scopes:
        for it in await _catalog_for_event(scope):
            key = it.get("id") or it.get("_id")
            if key and key not in by_id:
                by_id[key] = True
                items.append(it)
    return {"success": True, "data": items, "event_id": event_key}


# ── Checkout ────────────────────────────────────────────────────────────────

class CheckoutItemInput(BaseModel):
    item_id: str
    quantity: int = Field(1, ge=1)


class CheckoutRequest(BaseModel):
    event_id: str
    user_id: Optional[str] = None
    items: List[CheckoutItemInput]
    coupon_code: Optional[str] = None


@router.post("/orders/checkout")
async def marketplace_checkout(payload: CheckoutRequest, request: Request):
    """Create an order for marketplace items. Returns a Razorpay order id for
    paid orders, or marks the order paid immediately when the total is ₹0."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Resolve catalog items across all scopes (event, slug, master) so checkout
    # matches exactly what the merged catalog fetch returns.
    showcase = await db.echo_showcases.find_one({
        "$or": [{"slug": payload.event_id}, {"aliases": payload.event_id}],
    })
    event_key = payload.event_id
    if showcase and showcase.get("_id"):
        event_key = str(showcase.get("_id"))
    by_id = {}
    for scope in [event_key, payload.event_id, "master"]:
        for it in await _catalog_for_event(scope):
            key = it.get("id") or it.get("_id")
            by_id[key] = it
            if it.get("_id"):
                by_id[str(it.get("_id"))] = it

    order_items = []
    subtotal = 0.0
    for line in payload.items:
        item = by_id.get(line.item_id) or by_id.get(str(line.item_id))
        if not item:
            raise HTTPException(status_code=404, detail=f"Item not found: {line.item_id}")
        price = float(item.get("price", 0))
        line_total = round(price * line.quantity, 2)
        subtotal += line_total
        order_items.append({
            "item_id": item.get("id") or item.get("_id"),
            "vendor_id": item.get("vendor_id"),
            "vendor_name": item.get("vendor_name"),
            "name": item.get("name"),
            "category": item.get("category", "food"),
            "price": price,
            "price_at_time": price,
            "quantity": line.quantity,
            "line_total": line_total,
            "fulfillment_status": None,
        })

    # Discount coupon
    discount = 0.0
    applied_coupon = None
    if payload.coupon_code:
        coupon = await db.echo_discount_coupons.find_one({"code": payload.coupon_code.upper()})
        if not coupon or coupon.get("active", True) is False:
            raise HTTPException(status_code=400, detail="Invalid coupon code")
        if coupon.get("event_id") and coupon.get("event_id") != payload.event_id:
            raise HTTPException(status_code=400, detail="Coupon is not valid for this event")
        uses = int(coupon.get("uses_count", 0) or 0)
        max_uses = int(coupon.get("max_uses", 0) or 0)
        if max_uses and uses >= max_uses:
            raise HTTPException(status_code=400, detail="Coupon has reached its usage limit")
        if coupon.get("discount_type") == "fixed":
            discount = float(coupon.get("discount_value", 0) or 0)
        else:
            discount = round(subtotal * float(coupon.get("discount_value", 0) or 0) / 100.0, 2)
        discount = min(discount, subtotal)
        applied_coupon = payload.coupon_code.upper()

    total = round(subtotal - discount, 2)
    currency = "INR"

    user = await _resolve_user(request)
    user_id = payload.user_id or (str(user["_id"]) if user else "anon")
    user_name = (user.get("name") if user else None) or (payload.user_id or "Guest")
    user_email = user.get("email") if user else None

    order_id = _new_order_id()
    now_iso = datetime.now(timezone.utc).isoformat()

    if total <= 0:
        order_doc = {
            "id": order_id,
            "event_id": payload.event_id,
            "user_id": user_id,
            "user_name": user_name,
            "user_email": user_email,
            "items": order_items,
            "subtotal": round(subtotal, 2),
            "discount": round(discount, 2),
            "final_amount": 0.0,
            "currency": currency,
            "coupon_code": applied_coupon,
            "status": "paid",
            "payment_status": "free",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.echo_orders.insert_one(order_doc)
        if applied_coupon:
            await _bump_coupon_uses(applied_coupon)
        return {"success": True, "amount": 0, "order_id": order_id, "free": True}

    # Paid: create a Razorpay order and store a pending order.
    cfg = await _razorpay_config()
    if not cfg:
        raise HTTPException(
            status_code=503,
            detail="Online payments are temporarily unavailable — please try again later",
        )
    rzp = await _razorpay_create_order(total, currency, order_id, {
        "type": "echo_marketplace",
        "event_id": payload.event_id,
        "order_id": order_id,
    })
    if not rzp:
        raise HTTPException(status_code=503, detail="Unable to create payment order")

    order_doc = {
        "id": order_id,
        "event_id": payload.event_id,
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "items": order_items,
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "final_amount": total,
        "currency": currency,
        "coupon_code": applied_coupon,
        "status": "pending",
        "payment_status": "pending",
        "razorpay_order_id": rzp.get("id"),
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.echo_orders.insert_one(order_doc)

    return {
        "success": True,
        "amount": total,
        "order_id": order_id,
        "razorpay_order": rzp,
        "key_id": cfg.get("key_id", ""),
    }


class VerifyPaymentRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None


@router.post("/orders/verify-payment")
async def verify_marketplace_payment(payload: VerifyPaymentRequest, request: Request):
    """Verify a Razorpay payment signature and mark the marketplace order as paid."""
    order = await db.echo_orders.find_one({"id": payload.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") == "paid":
        return {"success": True, "order_id": payload.order_id}

    cfg = await _razorpay_config()
    if not cfg:
        raise HTTPException(status_code=503, detail="Payments unavailable")
    if not payload.razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    expected = hmac.new(
        cfg["key_secret"].encode("utf-8"),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    await db.echo_orders.update_one(
        {"id": payload.order_id},
        {"$set": {
            "status": "paid",
            "payment_status": "paid",
            "razorpay_payment_id": payload.razorpay_payment_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if order.get("coupon_code"):
        await _bump_coupon_uses(order["coupon_code"])
    return {"success": True, "order_id": payload.order_id}


# ── Admin: catalog ──────────────────────────────────────────────────────────

class AdminCatalogItemInput(BaseModel):
    name: str
    price: float
    category: str = "food"
    stock: int = 0
    stock_limit: Optional[int] = None
    description: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_id: Optional[str] = None
    images: List[str] = []


@router.get("/admin/showcases/{showcase_id}/catalog")
async def admin_list_catalog(showcase_id: str, request: Request, _=Depends(_require_admin)):
    items = await _catalog_for_event(showcase_id)
    return {"success": True, "data": items}


@router.post("/admin/showcases/{showcase_id}/catalog")
async def admin_create_catalog_item(showcase_id: str, payload: AdminCatalogItemInput, request: Request, _=Depends(_require_admin)):
    showcase = await db.echo_showcases.find_one({"_id": _oid_or(showcase_id)})
    event_id = str(showcase["_id"]) if showcase else showcase_id
    doc = payload.dict()
    doc["event_id"] = event_id
    if payload.stock_limit is None:
        doc["stock_limit"] = payload.stock
    doc["is_active"] = True
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.echo_catalog_items.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return {"success": True, "data": _normalize_item(doc)}


@router.put("/admin/catalog/{item_id}")
async def admin_update_catalog_item(item_id: str, payload: dict, request: Request, _=Depends(_require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    allowed = {"name", "price", "category", "stock", "stock_limit", "description",
               "vendor_name", "vendor_id", "images", "is_active", "event_id"}
    update = {k: v for k, v in payload.items() if k in allowed and k != "_id"}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.echo_catalog_items.update_one({"_id": ObjectId(item_id)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True}


@router.delete("/admin/catalog/{item_id}")
async def admin_delete_catalog_item(item_id: str, request: Request, _=Depends(_require_admin)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    res = await db.echo_catalog_items.delete_one({"_id": ObjectId(item_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True}


# ── Admin: orders ───────────────────────────────────────────────────────────

@router.get("/admin/showcases/{showcase_id}/orders")
async def admin_list_orders(showcase_id: str, request: Request, _=Depends(_require_admin)):
    showcase = await db.echo_showcases.find_one({"_id": _oid_or(showcase_id)})
    event_id = str(showcase["_id"]) if showcase else showcase_id
    docs = await db.echo_orders.find({"event_id": {"$in": [event_id, showcase_id]}}).sort("created_at", -1).to_list(500)
    return {"success": True, "data": [_serialize(d) for d in docs]}


# ── Admin: discount coupons ─────────────────────────────────────────────────

class AdminCouponInput(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float = 0
    event_id: Optional[str] = None
    max_uses: int = 0


@router.get("/admin/coupons")
async def admin_list_coupons(request: Request, event_slug: Optional[str] = None, _=Depends(_require_admin)):
    query = {}
    if event_slug:
        query["event_id"] = event_slug
    docs = await db.echo_discount_coupons.find(query).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        c = _serialize(d)
        c["code"] = c.get("code", "")
        c["discount_value"] = c.get("discount_value", 0)
        c["discount_type"] = c.get("discount_type", "percentage")
        c["uses_count"] = c.get("uses_count", 0) or 0
        c["max_uses"] = c.get("max_uses", 0) or 0
        out.append(c)
    return {"success": True, "data": out}


@router.post("/admin/coupons")
async def admin_create_coupon(payload: AdminCouponInput, request: Request, _=Depends(_require_admin)):
    code = (payload.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required")
    existing = await db.echo_discount_coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=409, detail="Coupon code already exists")
    doc = {
        "code": code,
        "discount_type": payload.discount_type,
        "discount_value": payload.discount_value,
        "event_id": payload.event_id,
        "max_uses": payload.max_uses,
        "uses_count": 0,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.echo_discount_coupons.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return {"success": True, "data": doc}


# ── Helpers ─────────────────────────────────────────────────────────────────
def _new_order_id() -> str:
    import secrets
    return datetime.now(timezone.utc).strftime("%Y%m%d") + secrets.token_hex(5).upper()


async def _bump_coupon_uses(code: str):
    await db.echo_discount_coupons.update_one({"code": code}, {"$inc": {"uses_count": 1}})


def _oid_or(v: str):
    try:
        return ObjectId(v)
    except Exception:
        return v
