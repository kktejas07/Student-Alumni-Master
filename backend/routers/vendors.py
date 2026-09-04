import jwt
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from core.db import db
from core.security import JWT_SECRET, JWT_ALGORITHM, decrypt_value
from core.email import send_email, render_html_email

router = APIRouter()

class VendorLoginRequest(BaseModel):
    vendor_id: str
    passcode: str


# ── Admin vendor provisioning ────────────────────────────────────────────────
async def _require_admin_token(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = auth.split(" ", 1)[1]
    import os
    secret = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token")
    if (payload.get("role") or "").lower() not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(403, "Admin only")
    return payload


class VendorCreateRequest(BaseModel):
    vendor_id: str
    passcode: str
    name: Optional[str] = None
    email: Optional[str] = None


def _public_vendor(v: dict) -> dict:
    return {
        "vendor_id": v.get("vendor_id"),
        "name": v.get("name", "Vendor"),
        "email": v.get("email"),
        "created_at": v.get("created_at"),
    }


@router.get("/api/echo/admin/vendors")
async def list_vendors(request: Request, _=Depends(_require_admin_token)):
    vendors = await db.echo_vendors.find({}).to_list(length=1000)
    return {"success": True, "data": [_public_vendor(v) for v in vendors]}


async def _email_vendor_credentials(vendor: dict, passcode: str, subject="Your ECHO Vendor login credentials"):
    """Send the vendor their login credentials by email. Returns (ok, detail)."""
    from core.email import send_email, render_html_email
    email = (vendor.get("email") or "").strip()
    if not email:
        return False, "No email on file"
    name = vendor.get("name") or vendor.get("vendor_id") or "Vendor"
    portal_url = "https://studentalumni.ai/vendor-portal/login"
    body = render_html_email(f"""
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Your ECHO Vendor account is ready</h2>
      <p style="margin:0 0 20px;color:#374151;">Hi {name}, you now have access to the Student Alumni ECHO vendor portal to manage your catalog, track orders, and fulfill purchases on the spot.</p>
      <p style="margin:0 0 8px;color:#374151;"><strong>Portal:</strong> <a href="{portal_url}" style="color:#7c3aed;">{portal_url}</a></p>
      <p style="margin:0 0 8px;color:#374151;"><strong>Vendor ID:</strong> {vendor['vendor_id']}</p>
      <p style="margin:0 0 20px;color:#374151;"><strong>Passcode:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">{passcode}</code></p>
      <p style="margin:0;color:#6b7280;font-size:13px;">Keep these credentials private. You can change your passcode from the portal anytime by contacting the admin.</p>
    """)
    try:
        ok = await send_email(email, subject, body)
        return (True, "sent") if ok else (False, "provider failed")
    except Exception as e:
        return False, f"send error: {e}"


@router.post("/api/echo/admin/vendors")
async def create_vendor(payload: VendorCreateRequest, request: Request, _=Depends(_require_admin_token)):
    vendor_id = (payload.vendor_id or "").strip()
    passcode = (payload.passcode or "").strip()
    if not vendor_id or not passcode:
        raise HTTPException(400, "Vendor ID and passcode are required")
    existing = await db.echo_vendors.find_one({"vendor_id": vendor_id})
    if existing:
        raise HTTPException(409, "Vendor ID already exists")
    doc = {
        "vendor_id": vendor_id,
        "passcode": passcode,
        "name": (payload.name or "").strip() or vendor_id,
        "email": (payload.email or "").strip() or None,
        "created_at": datetime.utcnow().isoformat(),
    }
    res = await db.echo_vendors.insert_one(doc)
    doc["_id"] = str(res.inserted_id)

    email_sent, detail = await _email_vendor_credentials(doc, passcode)
    return {
        "success": True,
        "vendor": _public_vendor(doc),
        "email": {"sent": email_sent, "detail": detail},
    }


class VendorUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


@router.put("/api/echo/admin/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, payload: VendorUpdateRequest, request: Request, _=Depends(_require_admin_token)):
    existing = await db.echo_vendors.find_one({"vendor_id": vendor_id})
    if not existing:
        raise HTTPException(404, "Vendor not found")
    update = {}
    if payload.name is not None:
        update["name"] = payload.name.strip() or vendor_id
    if payload.email is not None:
        update["email"] = payload.email.strip() or None
    if update:
        await db.echo_vendors.update_one({"vendor_id": vendor_id}, {"$set": update})
    fresh = await db.echo_vendors.find_one({"vendor_id": vendor_id})
    return {"success": True, "vendor": _public_vendor(fresh)}


class PasswordResetRequest(BaseModel):
    passcode: str


@router.post("/api/echo/admin/vendors/{vendor_id}/password-reset")
async def reset_vendor_password(vendor_id: str, payload: PasswordResetRequest, request: Request, _=Depends(_require_admin_token)):
    passcode = (payload.passcode or "").strip()
    if not passcode:
        raise HTTPException(400, "New passcode is required")
    existing = await db.echo_vendors.find_one({"vendor_id": vendor_id})
    if not existing:
        raise HTTPException(404, "Vendor not found")
    await db.echo_vendors.update_one({"vendor_id": vendor_id}, {"$set": {"passcode": passcode}})
    fresh = await db.echo_vendors.find_one({"vendor_id": vendor_id})
    email_sent, detail = await _email_vendor_credentials(fresh, passcode, subject="Your ECHO Vendor passcode was reset")
    return {
        "success": True,
        "message": "Passcode updated",
        "email": {"sent": email_sent, "detail": detail},
    }


@router.post("/api/echo/admin/vendors/{vendor_id}/send-credentials")
async def send_vendor_credentials(vendor_id: str, request: Request, _=Depends(_require_admin_token)):
    existing = await db.echo_vendors.find_one({"vendor_id": vendor_id})
    if not existing:
        raise HTTPException(404, "Vendor not found")
    email_sent, detail = await _email_vendor_credentials(existing, existing.get("passcode", ""))
    return {"success": True, "email": {"sent": email_sent, "detail": detail}}


@router.get("/api/echo/admin/vendors/stats")
async def vendor_stats(request: Request, _=Depends(_require_admin_token)):
    """Per-vendor revenue + order + fulfilment stats, aggregated from paid orders."""
    vendors = await db.echo_vendors.find({}).to_list(length=1000)
    orders = await db.echo_orders.find({"status": "paid"}).to_list(length=20000)
    by_vendor: dict = {}
    for v in vendors:
        by_vendor[v.get("vendor_id")] = {
            "vendor_id": v.get("vendor_id"),
            "name": v.get("name") or v.get("vendor_id"),
            "email": v.get("email"),
            "created_at": v.get("created_at"),
            "revenue": 0.0,
            "orders": 0,
            "items_sold": 0,
            "pending_items": 0,
            "fulfilled_items": 0,
            "refunded_items": 0,
            "refunded_amount": 0.0,
        }
    for o in orders:
        for item in o.get("items", []):
            vid = item.get("vendor_id")
            if not vid or vid not in by_vendor:
                continue
            row = by_vendor[vid]
            qty = int(item.get("quantity", 1) or 1)
            price = float(item.get("price", 0) or 0)
            row["revenue"] += price * qty
            row["items_sold"] += qty
            if item.get("fulfillment_status") == "REFUNDED":
                row["refunded_items"] += qty
                row["refunded_amount"] += price * qty
            elif item.get("fulfillment_status") == "FULFILLED":
                row["fulfilled_items"] += qty
            else:
                row["pending_items"] += qty
    # Count distinct paid orders per vendor
    seen = set()
    for o in orders:
        for item in o.get("items", []):
            vid = item.get("vendor_id")
            if vid and vid in by_vendor:
                seen.add((vid, o.get("id")))
    for vid, oid in seen:
        by_vendor[vid]["orders"] += 1
    totals = {
        "revenue": round(sum(r["revenue"] for r in by_vendor.values()), 2),
        "orders": sum(r["orders"] for r in by_vendor.values()),
        "items_sold": sum(r["items_sold"] for r in by_vendor.values()),
        "refunded_amount": round(sum(r["refunded_amount"] for r in by_vendor.values()), 2),
    }
    return {"success": True, "data": list(by_vendor.values()), "totals": totals}


@router.delete("/api/echo/admin/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, request: Request, _=Depends(_require_admin_token)):
    res = await db.echo_vendors.delete_one({"vendor_id": vendor_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Vendor not found")
    return {"success": True, "message": "Vendor deleted"}

async def get_current_vendor(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "vendor_access":
            raise HTTPException(401, "Invalid token type")
            
        vendor = await db.echo_vendors.find_one({"vendor_id": payload["sub"]})
        if not vendor:
            raise HTTPException(401, "Vendor not found")
        return vendor
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

@router.post("/api/vendors/login")
async def vendor_login(req: VendorLoginRequest):
    vendor = await db.echo_vendors.find_one({
        "vendor_id": req.vendor_id,
        "passcode": req.passcode
    })
    
    if not vendor:
        raise HTTPException(401, "Invalid Vendor ID or Passcode")
        
    payload = {
        "sub": vendor["vendor_id"],
        "name": vendor.get("name", "Vendor"),
        "role": "vendor",
        "type": "vendor_access"
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "success": True,
        "token": token,
        "vendor": {
            "vendor_id": vendor["vendor_id"],
            "name": vendor.get("name", "Vendor")
        }
    }

@router.get("/api/vendors/dashboard")
async def get_vendor_dashboard(vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    
    # Calculate stats based on orders
    # We look for echo_orders that have items for this vendor
    orders = await db.echo_orders.find({
        "status": "paid",
        "items.vendor_id": vendor_id
    }).to_list(length=None)
    
    total_sales = 0
    pending_items = 0
    fulfilled_items = 0
    
    pending_orders = []
    fulfilled_orders = []
    
    for order in orders:
        vendor_items = []
        is_order_pending = False
        
        for item in order.get("items", []):
            if item.get("vendor_id") == vendor_id or vendor_id == "Vendor_Admin":
                vendor_items.append(item)
                item_total = item.get("price", 0) * item.get("quantity", 1)
                total_sales += item_total
                
                if item.get("fulfillment_status") == "FULFILLED":
                    fulfilled_items += item.get("quantity", 1)
                else:
                    pending_items += item.get("quantity", 1)
                    is_order_pending = True
                    
        if vendor_items:
            order_summary = {
                "order_id": order.get("id"),
                "user_name": order.get("user_name"),
                "user_email": order.get("user_email"),
                "user_phone": decrypt_value(order.get("user_phone")),
                "created_at": order.get("created_at"),
                "items": vendor_items,
                "delivery_method": order.get("delivery_method", "pickup"),
                "delivery_info": order.get("delivery_info"),
                "order_status": order.get("order_status", "confirmed"),
            }
            if is_order_pending:
                pending_orders.append(order_summary)
            else:
                fulfilled_orders.append(order_summary)
                
    return {
        "success": True,
        "vendor": {
            "vendor_id": vendor_id,
            "name": vendor.get("name", "Vendor")
        },
        "stats": {
            "total_sales": total_sales,
            "pending_items": pending_items,
            "fulfilled_items": fulfilled_items,
            "total_orders": len(orders)
        },
        "pending_orders": pending_orders,
        "fulfilled_orders": fulfilled_orders
    }

class FulfillRequest(BaseModel):
    order_id: str

@router.post("/api/vendors/fulfill")
async def fulfill_vendor_order(req: FulfillRequest, vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    order_id = req.order_id
    
    order = await db.echo_orders.find_one({"id": order_id, "status": "paid"})
    if not order:
        raise HTTPException(404, "Order not found or not paid")
        
    has_vendor_items = False
    all_items = order.get("items", [])
    already_fulfilled = []
    just_fulfilled = []
    
    for item in all_items:
        if item.get("vendor_id") == vendor_id or vendor_id == "Vendor_Admin":
            has_vendor_items = True
            if item.get("fulfillment_status") == "FULFILLED":
                already_fulfilled.append(item.get("name", "Item"))
            else:
                item["fulfillment_status"] = "FULFILLED"
                just_fulfilled.append(item.get("name", "Item"))
            
    if not has_vendor_items:
        raise HTTPException(400, "No items found for this vendor in this order")
        
    if already_fulfilled:
        return {
            "success": False,
            "status": "already_fulfilled",
            "message": f"Already collected: {', '.join(already_fulfilled)}",
            "already_fulfilled": already_fulfilled,
        }
        
    # Update the order
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.echo_orders.update_one(
        {"id": order_id},
        {"$set": {"items": all_items, "updated_at": now_iso}}
    )
    
    # Send email notification if items were just fulfilled
    if just_fulfilled and order.get("user_email"):
        items_str = ", ".join(just_fulfilled)
        email_html = render_html_email(f"""
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #2B1E6E;">Order Ready for Pickup!</h2>
            <p>Your order for <strong>{items_str}</strong> has been prepared and is ready for pickup.</p>
            <p>Please collect your order at the vendor's stall.</p>
        </div>
        """)
        asyncio.create_task(send_email(
            order.get("user_email"),
            f"Your Order is Ready: {items_str}",
            email_html
        ))
    
    return {"success": True, "message": "Order fulfilled successfully"}


@router.post("/api/vendors/order-status")
async def update_order_status(req: Request, vendor: dict = Depends(get_current_vendor)):
    """Update order status: confirmed → preparing → out_for_delivery → delivered."""
    body = await req.json()
    order_id = body.get("order_id")
    new_status = body.get("status")
    valid_statuses = ["confirmed", "preparing", "out_for_delivery", "delivered"]
    if not order_id or new_status not in valid_statuses:
        raise HTTPException(400, f"Invalid request. Status must be one of: {', '.join(valid_statuses)}")

    db = _get_db(req)
    order = await db.echo_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    update = {"order_status": new_status, "updated_at": now_iso}
    if new_status == "delivered":
        update["delivered_at"] = now_iso

    await db.echo_orders.update_one({"id": order_id}, {"$set": update})

    # Send email notification on status change
    if order.get("user_email"):
        status_labels = {"confirmed": "Confirmed", "preparing": "Being Prepared", "out_for_delivery": "Out for Delivery", "delivered": "Delivered"}
        status_label = status_labels.get(new_status, new_status)
        email_html = render_html_email(f"""
        <div style="text-align:center;padding:32px 0">
            <div style="font-size:48px;margin-bottom:16px">{"📦" if new_status == "confirmed" else "👨‍🍳" if new_status == "preparing" else "🚚" if new_status == "out_for_delivery" else "✅"}</div>
            <h1 style="font-size:22px;color:#1a1a2e;margin:0 0 8px">Order {status_label}</h1>
            <p style="font-size:15px;color:#666;margin:0 0 24px">Your marketplace order has been updated</p>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:0 0 20px">
            <table style="width:100%;font-size:14px;color:#333">
                <tr><td style="padding:6px 0;color:#888">Order ID</td><td style="padding:6px 0;font-weight:600;font-family:monospace">#{order_id}</td></tr>
                <tr><td style="padding:6px 0;color:#888">Status</td><td style="padding:6px 0;font-weight:600;color:{"#10B981" if new_status == "delivered" else "#F59E0B"}">{status_label}</td></tr>
                {"<tr><td style='padding:6px 0;color:#888'>Delivery</td><td style='padding:6px 0;font-weight:600'>Delivering to " + (order.get('delivery_info') or 'your table') + "</td></tr>" if new_status == "out_for_delivery" and order.get("delivery_method") == "delivery" else ""}
            </table>
        </div>
        """)
        try:
            asyncio.create_task(send_email(
                order["user_email"],
                f"Order #{order_id} — {status_label}",
                email_html
            ))
        except Exception:
            pass

    return {"success": True, "status": new_status}


@router.post("/api/vendors/refund")
async def refund_order(req: Request, vendor: dict = Depends(get_current_vendor)):
    """Refund an order (full or partial) via Razorpay. Marks items as refunded."""
    body = await req.json()
    order_id = body.get("order_id")
    refund_amount = body.get("amount")  # optional: partial refund in paise
    reason = body.get("reason", "Item sold out")

    if not order_id:
        raise HTTPException(400, "order_id is required")

    db = _get_db(req)
    order = await db.echo_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")

    if order.get("refund_status") == "refunded":
        return {"success": False, "message": "Order already refunded"}

    payment = order.get("payment") or {}
    payment_id = payment.get("payment_id")
    if not payment_id:
        raise HTTPException(400, "No payment found for this order (free order?)")

    # Get Razorpay config
    cfg = await _razorpay_config()
    if not cfg:
        raise HTTPException(503, "Payment gateway not configured")

    # Calculate refund amount
    total_paid = int(order.get("final_amount", 0) * 100)  # convert to paise
    refund_paise = refund_amount if refund_amount else total_paid

    # Call Razorpay Refund API
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"https://api.razorpay.com/v1/payments/{payment_id}/refund",
                auth=(cfg["key_id"], cfg["key_secret"]),
                json={"amount": refund_paise, "notes": {"reason": reason, "order_id": order_id}},
            )
            rp_data = resp.json()
            if resp.status_code not in (200, 201):
                return {"success": False, "message": rp_data.get("error", {}).get("description", "Refund failed")}
    except Exception as e:
        return {"success": False, "message": f"Refund error: {str(e)}"}

    # Update order
    now_iso = datetime.now(timezone.utc).isoformat()
    refund_id = rp_data.get("id", "")
    await db.echo_orders.update_one(
        {"id": order_id},
        {"$set": {
            "refund_status": "refunded",
            "refund_id": refund_id,
            "refund_amount": refund_paise / 100,
            "refund_reason": reason,
            "refunded_at": now_iso,
            "updated_at": now_iso,
        }}
    )

    # Also mark items as refunded
    all_items = order.get("items", [])
    for item in all_items:
        if item.get("vendor_id") == vendor["vendor_id"] or vendor["vendor_id"] == "Vendor_Admin":
            item["fulfillment_status"] = "REFUNDED"
    await db.echo_orders.update_one({"id": order_id}, {"$set": {"items": all_items}})

    # Send refund email to customer
    if order.get("user_email"):
        refund_amt = refund_paise / 100
        email_html = render_html_email(f"""
        <div style="text-align:center;padding:32px 0">
            <div style="font-size:48px;margin-bottom:16px">💸</div>
            <h1 style="font-size:22px;color:#1a1a2e;margin:0 0 8px">Refund Processed</h1>
            <p style="font-size:15px;color:#666;margin:0 0 24px">Your refund has been initiated successfully</p>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:0 0 20px">
            <table style="width:100%;font-size:14px;color:#333">
                <tr><td style="padding:6px 0;color:#888">Order ID</td><td style="padding:6px 0;font-weight:600;font-family:monospace">#{order_id}</td></tr>
                <tr><td style="padding:6px 0;color:#888">Refund Amount</td><td style="padding:6px 0;font-weight:600;color:#10B981">₹{refund_amt}</td></tr>
                <tr><td style="padding:6px 0;color:#888">Reason</td><td style="padding:6px 0;font-weight:600">{reason}</td></tr>
                <tr><td style="padding:6px 0;color:#888">Refund ID</td><td style="padding:6px 0;font-weight:600;font-family:monospace;font-size:12">{refund_id}</td></tr>
                <tr><td style="padding:6px 0;color:#888">Status</td><td style="padding:6px 0;font-weight:600;color:#10B981">Initiated</td></tr>
            </table>
        </div>
        <p style="font-size:13px;color:#999;text-align:center">Refund will be credited to your original payment method within 5-7 business days.</p>
        """)
        try:
            asyncio.create_task(send_email(
                order["user_email"],
                f"Refund Processed — Order #{order_id}",
                email_html,
            ))
        except Exception:
            pass

    return {"success": True, "refund_id": refund_id, "amount": refund_paise / 100}


class VendorCatalogItemInput(BaseModel):
    name: str
    price: float
    category: str = "food"
    stock: int = 0
    stock_limit: Optional[int] = None
    stock_remaining: Optional[int] = None
    description: Optional[str] = None
    servings: Optional[str] = None
    event_id: str
    images: List[str] = []
    image_base64: Optional[str] = None
    stall_no: Optional[str] = None
    stall_location: Optional[str] = None
    is_active: Optional[bool] = True

@router.get("/api/vendors/catalog")
async def get_vendor_catalog(vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    items = await db.echo_catalog_items.find({"vendor_id": vendor_id}).to_list(length=1000)
    for item in items:
        item["_id"] = str(item["_id"])
        item.setdefault("stock_remaining", item.get("stock_limit", item.get("stock", 0)))
    return {"success": True, "data": items}

@router.post("/api/vendors/catalog")
async def create_vendor_catalog_item(item: VendorCatalogItemInput, vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    vendor_name = vendor.get("name", "Vendor")

    item_dict = item.dict(exclude_none=True)
    item_dict["vendor_id"] = vendor_id
    item_dict["vendor_name"] = vendor_name
    item_dict["is_active"] = item.is_active if item.is_active is not None else True
    if item_dict.get("stock_limit") is None:
        item_dict["stock_limit"] = item.stock
    item_dict.setdefault("stock_remaining", item_dict.get("stock_limit", item.stock))
    item_dict["created_at"] = datetime.utcnow()

    res = await db.echo_catalog_items.insert_one(item_dict)
    item_dict["_id"] = str(res.inserted_id)
    return {"success": True, "data": item_dict}

@router.put("/api/vendors/catalog/{item_id}")
async def update_vendor_catalog_item(item_id: str, updates: dict, vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    try:
        oid = ObjectId(item_id)
    except:
        raise HTTPException(400, "Invalid item ID")
        
    existing = await db.echo_catalog_items.find_one({"_id": oid, "vendor_id": vendor_id})
    if not existing:
        raise HTTPException(404, "Item not found or access denied")
        
    # Prevent updating critical fields
    updates.pop("_id", None)
    updates.pop("vendor_id", None)
    updates.pop("created_at", None)
    
    await db.echo_catalog_items.update_one({"_id": oid}, {"$set": updates})
    return {"success": True}

@router.delete("/api/vendors/catalog/{item_id}")
async def delete_vendor_catalog_item(item_id: str, vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    try:
        oid = ObjectId(item_id)
    except:
        raise HTTPException(400, "Invalid item ID")
        
    existing = await db.echo_catalog_items.find_one({"_id": oid, "vendor_id": vendor_id})
    if not existing:
        raise HTTPException(404, "Item not found or access denied")
        
    await db.echo_catalog_items.delete_one({"_id": oid})
    return {"success": True}
