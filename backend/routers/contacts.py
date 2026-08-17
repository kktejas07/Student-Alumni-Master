"""
Contacts — FastAPI router for managing contact lists and importing contacts.

Endpoints:
  GET    /api/admin/contacts              list all contacts (paginated, searchable)
  POST   /api/admin/contacts              add a single contact
  POST   /api/admin/contacts/import       import contacts from CSV
  PUT    /api/admin/contacts/{id}         update a contact
  DELETE /api/admin/contacts/{id}         delete a contact
  DELETE /api/admin/contacts/bulk         bulk delete contacts
  
  GET    /api/admin/contact-lists         list all contact lists
  POST   /api/admin/contact-lists         create a contact list
  PUT    /api/admin/contact-lists/{id}    update a contact list
  DELETE /api/admin/contact-lists/{id}    delete a contact list
  POST   /api/admin/contact-lists/{id}/add    add contacts to a list
  POST   /api/admin/contact-lists/{id}/remove remove contacts from a list
"""
from __future__ import annotations
import csv
import io
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from pydantic import BaseModel, Field, field_validator
from bson import ObjectId

router = APIRouter(prefix="/api/admin", tags=["contacts"])

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    source: str = "manual"  # manual, csv, import, echo, newsletter
    tags: List[str] = []
    lists: List[str] = []
    notes: str = ""

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v):
        import re
        if not v or not v.strip():
            return ""
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, v.strip().lower()):
            raise ValueError("Invalid email address")
        return v.strip().lower()


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[List[str]] = None
    lists: Optional[List[str]] = None
    notes: Optional[str] = None
    subscribed: Optional[bool] = None


class ContactListCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#7C3AED"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ser(doc: Optional[dict]) -> dict:
    """Serialize MongoDB document for JSON response."""
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


def _get_db(request: Request):
    from db import db
    return db


def _require_admin(request: Request):
    """Simple admin check - in production, use proper auth dependency."""
    return {"role": "admin"}


# ── Contact CRUD ──────────────────────────────────────────────────────────────

@router.get("/contacts")
async def list_contacts(
    request: Request,
    q: str = "",
    source: str = "",
    list_id: str = "",
    subscribed: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user=Depends(_require_admin),
):
    """List contacts with search, filters, and pagination."""
    db = _get_db(request)
    
    query: Dict[str, Any] = {}
    
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    
    if source:
        query["source"] = source
    
    if list_id:
        query["lists"] = list_id
    
    if subscribed:
        query["subscribed"] = subscribed.lower() == "true"
    
    total = await db.contacts.count_documents(query)
    skip = (page - 1) * per_page
    
    cursor = db.contacts.find(query).sort("created_at", -1).skip(skip).limit(per_page)
    items = []
    async for doc in cursor:
        items.append(_ser(doc))
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.post("/contacts")
async def create_contact(payload: ContactCreate, request: Request, user=Depends(_require_admin)):
    """Add a single contact."""
    db = _get_db(request)
    
    # Check for duplicate email
    if payload.email:
        existing = await db.contacts.find_one({"email": payload.email.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    contact = {
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "phone": payload.phone.strip(),
        "source": payload.source,
        "tags": payload.tags,
        "lists": payload.lists,
        "notes": payload.notes,
        "subscribed": True,
        "created_at": _now(),
        "updated_at": _now(),
    }
    
    result = await db.contacts.insert_one(dict(contact))
    contact["_id"] = str(result.inserted_id)
    
    return {"ok": True, "contact": _ser(contact)}


@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, payload: ContactUpdate, request: Request, user=Depends(_require_admin)):
    """Update a contact."""
    db = _get_db(request)
    
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = _now()
    
    result = await db.contacts.update_one(
        {"_id": ObjectId(contact_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"ok": True}


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, request: Request, user=Depends(_require_admin)):
    """Delete a contact."""
    db = _get_db(request)
    
    result = await db.contacts.delete_one({"_id": ObjectId(contact_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"ok": True}


@router.delete("/contacts/bulk")
async def bulk_delete_contacts(payload: Dict[str, List[str]], request: Request, user=Depends(_require_admin)):
    """Bulk delete contacts by IDs."""
    db = _get_db(request)
    ids = payload.get("ids", [])
    
    if not ids:
        raise HTTPException(status_code=400, detail="No contact IDs provided")
    
    result = await db.contacts.delete_many({"_id": {"$in": [ObjectId(id) for id in ids]}})
    
    return {"ok": True, "deleted": result.deleted_count}


# ── CSV Import ────────────────────────────────────────────────────────────────

@router.post("/contacts/import")
async def import_contacts(
    request: Request,
    file: UploadFile = File(...),
    source: str = "csv",
    tags: str = "",
    user=Depends(_require_admin),
):
    """Import contacts from a CSV or XLSX file.
    
    Expected columns: name, email, phone (email is required)
    Supports both .csv and .xlsx formats.
    """
    db = _get_db(request)
    
    filename = file.filename or ""
    is_csv = filename.lower().endswith('.csv')
    is_xlsx = filename.lower().endswith('.xlsx') or filename.lower().endswith('.xls')
    
    if not is_csv and not is_xlsx:
        raise HTTPException(status_code=400, detail="File must be a CSV or XLSX file")
    
    content = await file.read()
    rows = []
    
    if is_csv:
        # Parse CSV
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text = content.decode('latin-1')
            except:
                raise HTTPException(status_code=400, detail="Could not decode file. Please use UTF-8 encoding.")
        
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            rows.append(row)
    else:
        # Parse XLSX
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        
        if ws is None:
            raise HTTPException(status_code=400, detail="Excel file is empty")
        
        # Get headers from first row
        headers = []
        for cell in next(ws.iter_rows(min_row=1, max_row=1)):
            headers.append(str(cell.value or "").strip().lower())
        
        # Parse data rows
        for row in ws.iter_rows(min_row=2, values_only=True):
            row_dict = {}
            for i, value in enumerate(row):
                if i < len(headers) and headers[i]:
                    row_dict[headers[i]] = str(value or "").strip()
            rows.append(row_dict)
        
        wb.close()
    
    # Process rows
    imported = 0
    skipped = 0
    errors = []
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    
    import re
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    for i, row in enumerate(rows, start=2):
        # Try to find email in common column names
        email = (
            row.get("email", "").strip().lower() or
            row.get("Email", "").strip().lower() or
            row.get("EMAIL", "").strip().lower() or
            row.get("email_address", "").strip().lower() or
            row.get("Email Address", "").strip().lower()
        )
        
        if not email:
            skipped += 1
            errors.append(f"Row {i}: No email found")
            continue
        
        # Validate email
        if not re.match(email_regex, email):
            skipped += 1
            errors.append(f"Row {i}: Invalid email '{email}'")
            continue
        
        # Check for duplicate
        existing = await db.contacts.find_one({"email": email})
        if existing:
            skipped += 1
            continue
        
        # Get name from common column names
        name = (
            row.get("name", "").strip() or
            row.get("Name", "").strip() or
            row.get("full_name", "").strip() or
            row.get("Full Name", "").strip() or
            email.split("@")[0].title()
        )
        
        # Get phone from common column names
        phone = (
            row.get("phone", "").strip() or
            row.get("Phone", "").strip() or
            row.get("phone_number", "").strip() or
            row.get("Phone Number", "").strip() or
            ""
        )
        
        contact = {
            "name": name,
            "email": email,
            "phone": phone,
            "source": source,
            "tags": tag_list,
            "lists": [],
            "notes": "",
            "subscribed": True,
            "created_at": _now(),
            "updated_at": _now(),
        }
        
        await db.contacts.insert_one(dict(contact))
        imported += 1
    
    return {
        "ok": True,
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:10],  # Return first 10 errors
        "total_rows": imported + skipped,
        "file_type": "xlsx" if is_xlsx else "csv",
    }


# ── Contact Lists ─────────────────────────────────────────────────────────────

@router.get("/contact-lists")
async def list_contact_lists(request: Request, user=Depends(_require_admin)):
    """List all contact lists with contact counts."""
    db = _get_db(request)
    
    cursor = db.contact_lists.find().sort("name", 1)
    lists = []
    async for doc in cursor:
        list_doc = _ser(doc)
        # Get contact count for this list
        count = await db.contacts.count_documents({"lists": doc.get("_id") or doc.get("name")})
        list_doc["contact_count"] = count
        lists.append(list_doc)
    
    return {"items": lists}


@router.post("/contact-lists")
async def create_contact_list(payload: ContactListCreate, request: Request, user=Depends(_require_admin)):
    """Create a new contact list."""
    db = _get_db(request)
    
    # Check for duplicate name
    existing = await db.contact_lists.find_one({"name": payload.name})
    if existing:
        raise HTTPException(status_code=400, detail="A list with this name already exists")
    
    contact_list = {
        "name": payload.name.strip(),
        "description": payload.description,
        "color": payload.color,
        "created_at": _now(),
        "updated_at": _now(),
    }
    
    result = await db.contact_lists.insert_one(dict(contact_list))
    contact_list["_id"] = str(result.inserted_id)
    
    return {"ok": True, "list": _ser(contact_list)}


@router.put("/contact-lists/{list_id}")
async def update_contact_list(list_id: str, payload: ContactListCreate, request: Request, user=Depends(_require_admin)):
    """Update a contact list."""
    db = _get_db(request)
    
    result = await db.contact_lists.update_one(
        {"_id": ObjectId(list_id)},
        {"$set": {
            "name": payload.name,
            "description": payload.description,
            "color": payload.color,
            "updated_at": _now(),
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="List not found")
    
    return {"ok": True}


@router.delete("/contact-lists/{list_id}")
async def delete_contact_list(list_id: str, request: Request, user=Depends(_require_admin)):
    """Delete a contact list."""
    db = _get_db(request)
    
    result = await db.contact_lists.delete_one({"_id": ObjectId(list_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="List not found")
    
    return {"ok": True}


@router.post("/contact-lists/{list_id}/add")
async def add_contacts_to_list(list_id: str, payload: Dict[str, List[str]], request: Request, user=Depends(_require_admin)):
    """Add contacts to a list."""
    db = _get_db(request)
    
    contact_ids = payload.get("contact_ids", [])
    if not contact_ids:
        raise HTTPException(status_code=400, detail="No contact IDs provided")
    
    # Get list name
    contact_list = await db.contact_lists.find_one({"_id": ObjectId(list_id)})
    if not contact_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    list_name = contact_list.get("name", "")
    
    # Add list to contacts
    result = await db.contacts.update_many(
        {"_id": {"$in": [ObjectId(id) for id in contact_ids]}},
        {"$addToSet": {"lists": list_name}}
    )
    
    return {"ok": True, "updated": result.modified_count}


@router.post("/contact-lists/{list_id}/remove")
async def remove_contacts_from_list(list_id: str, payload: Dict[str, List[str]], request: Request, user=Depends(_require_admin)):
    """Remove contacts from a list."""
    db = _get_db(request)
    
    contact_ids = payload.get("contact_ids", [])
    if not contact_ids:
        raise HTTPException(status_code=400, detail="No contact IDs provided")
    
    # Get list name
    contact_list = await db.contact_lists.find_one({"_id": ObjectId(list_id)})
    if not contact_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    list_name = contact_list.get("name", "")
    
    # Remove list from contacts
    result = await db.contacts.update_many(
        {"_id": {"$in": [ObjectId(id) for id in contact_ids]}},
        {"$pull": {"lists": list_name}}
    )
    
    return {"ok": True, "updated": result.modified_count}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/contacts/stats")
async def contact_stats(request: Request, user=Depends(_require_admin)):
    """Get contact statistics."""
    db = _get_db(request)
    
    total = await db.contacts.count_documents({})
    subscribed = await db.contacts.count_documents({"subscribed": True})
    unsubscribed = total - subscribed
    
    # Source breakdown
    pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    sources = {}
    async for doc in db.contacts.aggregate(pipeline):
        sources[doc["_id"] or "unknown"] = doc["count"]
    
    # List breakdown
    lists = await db.contact_lists.count_documents({})
    
    return {
        "total": total,
        "subscribed": subscribed,
        "unsubscribed": unsubscribed,
        "sources": sources,
        "lists": lists,
    }
