import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from core.db import db
from core.security import JWT_SECRET, JWT_ALGORITHM

router = APIRouter()

class VendorLoginRequest(BaseModel):
    vendor_id: str
    passcode: str

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
            if item.get("vendor_id") == vendor_id:
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
                "created_at": order.get("created_at"),
                "items": vendor_items
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
    
    for item in all_items:
        if item.get("vendor_id") == vendor_id:
            has_vendor_items = True
            item["fulfillment_status"] = "FULFILLED"
            
    if not has_vendor_items:
        raise HTTPException(400, "No items found for this vendor in this order")
        
    # Update the order
    await db.echo_orders.update_one(
        {"id": order_id},
        {"$set": {"items": all_items}}
    )
    
    return {"success": True, "message": "Order fulfilled successfully"}

class VendorCatalogItemInput(BaseModel):
    name: str
    price: float
    category: str = "food"
    stock: int = 0
    description: Optional[str] = None
    event_id: str
    images: List[str] = []

@router.get("/api/vendors/catalog")
async def get_vendor_catalog(vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    items = await db.echo_catalog_items.find({"vendor_id": vendor_id}).to_list(length=1000)
    for item in items:
        item["_id"] = str(item["_id"])
    return {"success": True, "data": items}

@router.post("/api/vendors/catalog")
async def create_vendor_catalog_item(item: VendorCatalogItemInput, vendor: dict = Depends(get_current_vendor)):
    vendor_id = vendor["vendor_id"]
    vendor_name = vendor.get("name", "Vendor")
    
    item_dict = item.dict()
    item_dict["vendor_id"] = vendor_id
    item_dict["vendor_name"] = vendor_name
    item_dict["is_active"] = True
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
