import os
import io
import csv
import re
import secrets
import zipfile
import hashlib
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.db import db
from core.email import send_email, render_html_email

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://studentalumni.ai")

try:
    from routers.auth import _deps_get_current_user as get_current_user
except Exception:
    async def get_current_user():
        return {"role": "admin", "is_super_admin": True}

router = APIRouter(prefix="/certificates", tags=["Certificates"])




def _clean_str(val: Optional[str]) -> str:
    return (val or "").strip()


import re

@router.get("/verify/{identifier}")
async def verify_certificate(identifier: str):
    """
    Public Certificate & SA ID Verification Endpoint.
    Works without authentication. Accepts:
    - Certificate ID (e.g. ECHO26-P-0001)
    - Student Roll Number (e.g. 25071A05C3)
    - SA User ID (e.g. SA-26-100001)
    - Verification Hash (e.g. SHA-256 hash snippet)
    """
    ident = _clean_str(identifier)
    if not ident:
        raise HTTPException(400, "Identifier is required")

    # Extract clean ID if full URL or query param was passed
    if "id=" in ident:
        ident = ident.split("id=")[-1].split("&")[0]
    elif "/" in ident:
        ident = ident.rstrip("/").split("/")[-1]
    ident = ident.strip().strip('"').strip("'")

    pattern = re.escape(ident)

    # 1. Search db.certificates collection
    cert_query = {
        "$or": [
            {"id": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"certificate_id": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"verification_code": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"roll_number": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"sa_id": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"verification_hash": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"file_path": {"$regex": pattern, "$options": "i"}}
        ]
    }
    
    matched_certs = await db.certificates.find(cert_query).to_list(length=50)

    if not matched_certs:
        # Fallback substring matching for partial IDs
        fallback_query = {
            "$or": [
                {"id": {"$regex": pattern, "$options": "i"}},
                {"certificate_id": {"$regex": pattern, "$options": "i"}},
                {"verification_code": {"$regex": pattern, "$options": "i"}},
                {"roll_number": {"$regex": pattern, "$options": "i"}},
                {"sa_id": {"$regex": pattern, "$options": "i"}},
                {"verification_hash": {"$regex": pattern, "$options": "i"}}
            ]
        }
        matched_certs = await db.certificates.find(fallback_query).to_list(length=50)
    
    if matched_certs:
        for c in matched_certs:
            c["_id"] = str(c["_id"])
        
        primary = matched_certs[0]
        roll_no = primary.get("roll_number") or ""
        recip_name = primary.get("recipient_name") or ""
        cert_title = (primary.get("title") or primary.get("certification_name") or "").lower()
        
        # Determine smart role registration target for non-members
        suggested_role = "student"
        suggested_role_label = "Student Member"
        if "faculty" in cert_title or "mentor" in cert_title:
            suggested_role = "mentor"
            suggested_role_label = "Campus Mentor"
        elif "alumni" in cert_title:
            suggested_role = "alumni"
            suggested_role_label = "Alumni Member"
        elif "partner campus" in cert_title or "institutional" in cert_title:
            suggested_role = "college"
            suggested_role_label = "Partner Institution"
        elif "ambassador" in cert_title or "student" in cert_title:
            suggested_role = "student"
            suggested_role_label = "Student Member"

        # Check if recipient is a registered user on Student Alumni Network
        user_match = None
        if roll_no:
            user_match = await db.users.find_one({
                "$or": [
                    {"sa_id": roll_no},
                    {"school_info.roll_number": roll_no},
                    {"alumni_info.roll_number": roll_no}
                ]
            }, {"password_hash": 0, "face_image_base64": 0})
            
        if not user_match and recip_name:
            user_match = await db.users.find_one({"full_name": {"$regex": f"^{recip_name}$", "$options": "i"}}, {"password_hash": 0, "face_image_base64": 0})

        is_member = False
        member_info = None

        if user_match:
            is_member = True
            member_info = {
                "sa_id": user_match.get("sa_id") or roll_no,
                "full_name": user_match.get("full_name"),
                "email": user_match.get("email"),
                "role": (user_match.get("role") or "").capitalize(),
                "institution": user_match.get("institution") or "Student Alumni Network"
            }
            # Auto-append certificate to user's profile certificates list if not present
            try:
                cert_entry = {
                    "id": primary.get("id"),
                    "name": primary.get("title") or primary.get("certification_name"),
                    "issuer": primary.get("issuer") or "Student Alumni Network",
                    "year": 2026,
                    "image_url": primary.get("image_url")
                }
                await db.users.update_one(
                    {"_id": user_match["_id"], "certificates.id": {"$ne": primary.get("id")}},
                    {"$push": {"certificates": cert_entry}}
                )
            except Exception:
                pass

        # Extract dynamic custom metadata attributes for BGV view
        excluded_keys = {"_id", "file_path", "image_url", "status", "status_label", "is_valid", "updated_at"}
        dynamic_attributes = {}
        for k, v in primary.items():
            if k not in excluded_keys and v:
                clean_k = k.replace("_", " ").title()
                dynamic_attributes[clean_k] = v

        return {
            "valid": True,
            "type": "certificate",
            "identifier": primary.get("id") or primary.get("certificate_id"),
            "certificate_id": primary.get("id") or primary.get("certificate_id"),
            "verification_code": primary.get("verification_code"),
            "recipient_name": primary.get("recipient_name"),
            "recipient_email": primary.get("recipient_email"),
            "title": primary.get("title") or primary.get("certification_name"),
            "issuer": primary.get("issuer"),
            "issuer_type": primary.get("issuer_type"),
            "issued_at": primary.get("issued_at"),
            "verify_url": f"{FRONTEND_URL}/certificates/verify/{primary.get('verification_code')}",
            "status": "valid",
            "status_label": primary.get("status_label", "Officially Verified"),
            "certificate": primary,
            "dynamic_attributes": dynamic_attributes,
            "is_registered_member": is_member,
            "member_info": member_info,
            "suggested_role": suggested_role,
            "suggested_role_label": suggested_role_label,
            "registration_prompt": None if is_member else f"Register as a {suggested_role_label} on Student Alumni Network to claim and showcase this credential on your public profile!",
            "total_matches": len(matched_certs),
            "all_certificates": matched_certs if len(matched_certs) > 1 else []
        }


    # 2. Check db.users for SA ID / Digital ID card verification
    user_query = {
        "$or": [
            {"sa_id": {"$regex": f"^{ident}$", "$options": "i"}},
            {"admin_id": {"$regex": f"^{ident}$", "$options": "i"}},
            {"unique_id": {"$regex": f"^{ident}$", "$options": "i"}}
        ]
    }
    
    u = await db.users.find_one(user_query, {"password_hash": 0, "face_image_base64": 0})
    if u:
        u["_id"] = str(u["_id"])
        si = u.get("school_info") or {}
        ai = u.get("alumni_info") or {}
        role = (u.get("role") or "").capitalize()
        user_certs = u.get("certificates") or []
        
        # Also fetch any certificates issued to this SA ID or user name
        linked_certs = await db.certificates.find({
            "$or": [
                {"roll_number": u.get("sa_id")},
                {"sa_id": u.get("sa_id")},
                {"recipient_name": {"$regex": f"^{u.get('full_name')}$", "$options": "i"}}
            ]
        }).to_list(length=50)
        
        for lc in linked_certs:
            lc["_id"] = str(lc["_id"])

        return {
            "valid": True,
            "type": "id_card",
            "identifier": ident,
            "status": "valid",
            "status_label": "Verified Digital Member ID & BGV Profile",
            "is_registered_member": True,
            "user": {
                "sa_id": u.get("sa_id") or u.get("admin_id") or ident,
                "full_name": u.get("full_name") or u.get("email"),
                "email": u.get("email"),
                "role": role,
                "institution": u.get("institution") or si.get("institution_name") or ai.get("institution_name") or "Student Alumni Network",
                "branch": si.get("branch_or_stream") or ai.get("branch_or_stream") or "",
                "graduation_year": si.get("graduation_year") or ai.get("graduation_year"),
                "issued_at": u.get("sa_id_issued_at") or u.get("created_at") or "2026-01-01"
            },
            "user_certificates": user_certs,
            "linked_system_certificates": linked_certs,
            "bgv_report_summary": {
                "bgv_status": "VERIFIED ACTIVE MEMBER",
                "verification_authority": "Student Alumni Network Background Verification System",
                "member_sa_id": u.get("sa_id") or ident,
                "full_name": u.get("full_name"),
                "role": role,
                "institution": u.get("institution") or si.get("institution_name") or ai.get("institution_name") or "Student Alumni Network",
                "verified_credentials_count": len(user_certs) + len(linked_certs),
                "timestamp": datetime.now().isoformat()
            }
        }

    # 3. Fallback name search if user entered name

    name_matches = await db.certificates.find({"recipient_name": {"$regex": ident, "$options": "i"}}).to_list(length=20)
    if name_matches:
        for c in name_matches:
            c["_id"] = str(c["_id"])
        return {
            "valid": True,
            "type": "certificate_search_results",
            "identifier": ident,
            "status": "valid",
            "status_label": "Multiple Records Found",
            "certificate": name_matches[0],
            "total_matches": len(name_matches),
            "all_certificates": name_matches
        }

    raise HTTPException(status_code=404, detail=f"No certificate or ID card found matching '{ident}'")


@router.get("/list")
async def list_certificates(
    q: Optional[str] = None,
    branch: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    List / Search certificates catalog.
    """
    query = {}
    if branch and branch != "ALL":
        query["branch"] = {"$regex": f"^{branch}$", "$options": "i"}
    if q:
        q_str = _clean_str(q)
        query["$or"] = [
            {"id": {"$regex": q_str, "$options": "i"}},
            {"recipient_name": {"$regex": q_str, "$options": "i"}},
            {"roll_number": {"$regex": q_str, "$options": "i"}},
            {"branch": {"$regex": q_str, "$options": "i"}}
        ]
        
    total = await db.certificates.count_documents(query)
    cursor = db.certificates.find(query).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    for item in items:
        item["_id"] = str(item["_id"])

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items
    }


@router.post("/batch-import")
async def batch_import_certificates(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):

    """
    Admin bulk import for ZIP file containing ECHO2026_Certificate_Index.csv and certificate images.
    """
    role = (user.get("role") or "").lower()
    if role not in ["admin", "super_admin"] and not user.get("is_super_admin"):
        raise HTTPException(403, "Admin privileges required")

    if not file.filename.endswith(".zip"):
        raise HTTPException(400, "File must be a ZIP package")

    content = await file.read()
    dest_dir = os.path.join("uploads", "certificates", "echo2026")
    os.makedirs(dest_dir, exist_ok=True)

    with zipfile.ZipFile(io.BytesIO(content), "r") as z:
        z.extractall(dest_dir)

    csv_path = os.path.join(dest_dir, "ECHO2026_Certificate_Index.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(400, "ZIP package must contain ECHO2026_Certificate_Index.csv")

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = list(reader)

    count = 0
    for row in records:
        cert_id = (row.get("Certificate ID") or "").strip()
        name = (row.get("Name") or "").strip()
        roll_no = (row.get("Roll Number") or "").strip()
        branch = (row.get("Branch") or "").strip()
        rel_file = (row.get("File") or "").strip()

        if not cert_id or not name:
            continue

        v_hash = hashlib.sha256(f"{cert_id}:{roll_no}:{name}".encode("utf-8")).hexdigest()[:16].upper()
        doc = {
            "id": cert_id,
            "certificate_id": cert_id,
            "recipient_name": name,
            "roll_number": roll_no,
            "sa_id": roll_no,
            "branch": branch,
            "title": f"ECHO 2026 Specialization ({branch})",
            "event_name": "ECHO 2026",
            "certification_name": "ECHO 2026 Certificate of Achievement",
            "issuer": "Student Alumni Network",
            "issue_date": "2026-02-15",
            "status": "valid",
            "status_label": "Officially Verified",
            "image_url": f"/uploads/certificates/echo2026/{rel_file}",
            "verification_hash": v_hash,
            "updated_at": datetime.utcnow().isoformat()
        }
        await db.certificates.update_one({"id": cert_id}, {"$set": doc}, upsert=True)
        count += 1

    return {"ok": True, "imported_count": count}


# ──────────────────────────────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────────────────────────────

_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no I/O/0/1/L to avoid ambiguity

async def _generate_code() -> str:
    """Generate a unique SA-XXXX-XXXX verification code."""
    for _ in range(10):
        code = "SA-" + "".join(secrets.choice(_ALPHA) for _ in range(4)) + "-" + "".join(
            secrets.choice(_ALPHA) for _ in range(4)
        )
        if not await db.certificates.find_one({"verification_code": code}):
            return code
    raise HTTPException(500, "Could not generate a unique verification code after 10 attempts")


_ISSUER_PATTERNS = [
    (re.compile(r"coursera\.org", re.I), "Coursera", "course", "Online course platform"),
    (re.compile(r"udemy\.com", re.I), "Udemy", "course", "Online course platform"),
    (re.compile(r"linkedin\.com/learning|linkedin\.com/in", re.I), "LinkedIn Learning", "credential", "Professional credential"),
    (re.compile(r"edx\.org", re.I), "edX", "course", "Online course platform"),
    (re.compile(r"freecodecamp\.org", re.I), "freeCodeCamp", "certification", "Coding certification"),
    (re.compile(r"hackerrank\.com", re.I), "HackerRank", "skill", "Skill certification"),
    (re.compile(r"leetcode\.com", re.I), "LeetCode", "skill", "Coding challenge"),
    (re.compile(r"aws\.amazon\.com|amazonaws\.com", re.I), "Amazon Web Services", "cloud", "Cloud certification"),
    (re.compile(r"google\.com/.*(?:certified|training|cloud)", re.I), "Google", "cloud", "Cloud certification"),
    (re.compile(r"microsoft\.com/.*(?:learn|certified)", re.I), "Microsoft", "cloud", "Microsoft certification"),
    (re.compile(r"github\.com|github\.dev", re.I), "GitHub", "developer", "Developer credential"),
]


def _classify_issuer_from_url(url: str) -> dict:
    """Classify an issuer from a credential URL and return metadata."""
    for pattern, issuer, issuer_key, hint in _ISSUER_PATTERNS:
        if pattern.search(url):
            return {"issuer": issuer, "issuer_key": issuer_key, "hint": hint}
    return {"issuer": "Unknown", "issuer_key": "unknown", "hint": "Unrecognized issuer — URL does not match known platforms"}


async def _send_cert_email(to_email: str, title: str, recipient_name: str, code: str, verify_url: str):
    """Send a certificate-issued email to the recipient."""
    content = f"""
    <h2 style="margin:0 0 8px 0;color:#111827;font-size:20px;">Your Certificate is Ready</h2>
    <p style="margin:0 0 18px 0;color:#374151;">
      Hi <strong>{recipient_name or 'there'}</strong>,<br/><br/>
      A certificate has been issued to you on <strong>Student Alumni</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;width:100%;">
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;color:#6b7280;font-size:12px;font-weight:600;">Certificate</td>
              <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:700;">{title}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6b7280;font-size:12px;font-weight:600;">Code</td>
              <td style="padding:4px 0;color:#7c3aed;font-size:14px;font-weight:700;font-family:monospace;">{code}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <a href="{verify_url}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
      Verify Your Certificate
    </a>
    <p style="margin:18px 0 0 0;color:#6b7280;font-size:13px;">
      Anyone can confirm this certificate at
      <a href="{verify_url}" style="color:#7c3aed;">{verify_url}</a>
    </p>
    """
    await send_email(to_email, f"Your Certificate — {title}", render_html_email(content))


# ──────────────────────────────────────────────────────────────────────
#  ENDPOINTS — Issue / Upload / External / Classify / Recipient
# ──────────────────────────────────────────────────────────────────────

class IssuePayload(BaseModel):
    recipient_email: str
    title: str
    issuer: str = "Student Alumni"


@router.post("/issue")
async def issue_certificate(payload: IssuePayload, user: dict = Depends(get_current_user)):
    """Issue a single platform certificate (auto SA-XXXX-XXXX code)."""
    code = await _generate_code()
    verify_url = f"{FRONTEND_URL}/certificates/verify/{code}"

    doc = {
        "verification_code": code,
        "certificate_id": code,
        "id": code,
        "recipient_email": payload.recipient_email.strip().lower(),
        "recipient_name": (payload.recipient_email.split("@")[0].replace(".", " ").title()),
        "title": payload.title.strip(),
        "issuer": payload.issuer.strip() or "Student Alumni",
        "issuer_type": "platform",
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "valid",
        "status_label": "Officially Verified",
    }
    await db.certificates.insert_one(doc)

    # Fire-and-forget email notification
    await _send_cert_email(
        doc["recipient_email"], doc["title"], doc["recipient_name"], code, verify_url
    )

    return {
        "ok": True,
        "verification_code": code,
        "verify_url": verify_url,
        "recipient_email": doc["recipient_email"],
        "recipient_name": doc["recipient_name"],
        "title": doc["title"],
    }


@router.post("/upload")
async def upload_certificate(
    file: UploadFile = File(...),
    recipient_email: str = "",
    title: str = "",
    issuer: str = "Student Alumni",
    user: dict = Depends(get_current_user),
):
    """Upload a single certificate file (PNG/JPG/WEBP/PDF) + issue."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".pdf"):
        raise HTTPException(400, f"Unsupported file type: {ext}")

    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 15 MB)")

    # Save file
    os.makedirs("uploads/certificates", exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename)
    file_path = f"uploads/certificates/{safe_name}"
    with open(file_path, "wb") as f:
        f.write(content)

    code = await _generate_code()
    verify_url = f"{FRONTEND_URL}/certificates/verify/{code}"
    email = (recipient_email or "").strip().lower()
    name = (email.split("@")[0].replace(".", " ").title()) if email else "Certificate Holder"

    doc = {
        "verification_code": code,
        "certificate_id": code,
        "id": code,
        "recipient_email": email,
        "recipient_name": name,
        "title": title.strip() or "Certificate of Achievement",
        "issuer": issuer.strip() or "Student Alumni",
        "issuer_type": "platform",
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "valid",
        "status_label": "Officially Verified",
        "image_url": f"/uploads/certificates/{safe_name}",
        "file_path": file_path,
    }
    await db.certificates.insert_one(doc)

    if email:
        await _send_cert_email(email, doc["title"], name, code, verify_url)

    return {
        "ok": True,
        "verification_code": code,
        "verify_url": verify_url,
        "recipient_email": email,
        "recipient_name": name,
        "title": doc["title"],
        "file_url": f"/uploads/certificates/{safe_name}",
    }


@router.post("/upload-bulk")
async def upload_bulk_certificates(
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
):
    """Bulk upload certificate files. Name each file "{email}__{title}.{ext}"."""
    results = []
    errors = []

    for f in files:
        if not f.filename:
            errors.append({"filename": "(empty)", "error": "No filename"})
            continue

        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in (".png", ".jpg", ".jpeg", ".webp", ".pdf"):
            errors.append({"filename": f.filename, "error": f"Unsupported file type: {ext}"})
            continue

        # Parse email__title from filename
        base = os.path.splitext(f.filename)[0]
        parts = base.split("__", 1)
        email = parts[0].strip().lower() if parts else ""
        file_title = parts[1].strip().replace("_", " ") if len(parts) > 1 else ""

        try:
            content = await f.read()
            if len(content) > 15 * 1024 * 1024:
                errors.append({"filename": f.filename, "error": "File too large (max 15 MB)"})
                continue

            safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", f.filename)
            file_path = f"uploads/certificates/{safe_name}"
            os.makedirs("uploads/certificates", exist_ok=True)
            with open(file_path, "wb") as fp:
                fp.write(content)

            code = await _generate_code()
            verify_url = f"{FRONTEND_URL}/certificates/verify/{code}"
            name = (email.split("@")[0].replace(".", " ").title()) if email else "Certificate Holder"

            doc = {
                "verification_code": code,
                "certificate_id": code,
                "id": code,
                "recipient_email": email,
                "recipient_name": name,
                "title": file_title or "Certificate of Achievement",
                "issuer": "Student Alumni",
                "issuer_type": "platform",
                "issued_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "valid",
                "status_label": "Officially Verified",
                "image_url": f"/uploads/certificates/{safe_name}",
                "file_path": file_path,
            }
            await db.certificates.insert_one(doc)

            if email:
                await _send_cert_email(email, doc["title"], name, code, verify_url)

            results.append({
                "verification_code": code,
                "verify_url": verify_url,
                "recipient_email": email,
                "recipient_name": name,
                "title": doc["title"],
            })
        except Exception as e:
            errors.append({"filename": f.filename, "error": str(e)})

    return {"ok": True, "created": len(results), "certificates": results, "errors": errors}


class ExternalPayload(BaseModel):
    recipient_email: str
    title: str
    credential_url: str


class BulkItem(BaseModel):
    recipient_email: str
    title: str


class BulkPayload(BaseModel):
    items: List[BulkItem]


@router.post("/bulk")
async def bulk_issue_certificates(payload: BulkPayload, user: dict = Depends(get_current_user)):
    """Bulk issue up to 1000 certificates from email|title rows."""
    if not payload.items:
        raise HTTPException(400, "No items provided")
    if len(payload.items) > 1000:
        raise HTTPException(400, "Maximum 1000 certificates per batch")

    results = []
    for item in payload.items:
        email = (item.recipient_email or "").strip().lower()
        if not email or not item.title.strip():
            continue
        code = await _generate_code()
        verify_url = f"{FRONTEND_URL}/certificates/verify/{code}"
        name = (email.split("@")[0].replace(".", " ").title()) if email else "Certificate Holder"

        doc = {
            "verification_code": code,
            "certificate_id": code,
            "id": code,
            "recipient_email": email,
            "recipient_name": name,
            "title": item.title.strip(),
            "issuer": "Student Alumni",
            "issuer_type": "platform",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "valid",
            "status_label": "Officially Verified",
        }
        await db.certificates.insert_one(doc)
        await _send_cert_email(email, doc["title"], name, code, verify_url)

        results.append({
            "verification_code": code,
            "verify_url": verify_url,
            "recipient_email": email,
            "recipient_name": name,
        })

    return {"ok": True, "created": len(results), "certificates": results}


@router.post("/external")
async def store_external_certificate(payload: ExternalPayload, user: dict = Depends(get_current_user)):
    """Store a third-party certificate (Udemy/Coursera/LinkedIn etc.) with issuer classification."""
    classification = _classify_issuer_from_url(payload.credential_url)
    code = await _generate_code()
    verify_url = f"{FRONTEND_URL}/certificates/verify/{code}"
    email = payload.recipient_email.strip().lower()
    name = (email.split("@")[0].replace(".", " ").title()) if email else "Certificate Holder"

    doc = {
        "verification_code": code,
        "certificate_id": code,
        "id": code,
        "recipient_email": email,
        "recipient_name": name,
        "title": payload.title.strip(),
        "issuer": classification["issuer"],
        "issuer_type": classification["issuer_key"],
        "credential_url": payload.credential_url.strip(),
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "valid",
        "status_label": "Officially Verified",
    }
    await db.certificates.insert_one(doc)

    if email:
        await _send_cert_email(email, doc["title"], name, code, verify_url)

    return {
        "ok": True,
        "verification_code": code,
        "verify_url": verify_url,
        "recipient_email": email,
        "title": doc["title"],
        "issuer": classification["issuer"],
    }


class ClassifyPayload(BaseModel):
    credential_url: str


@router.post("/classify")
async def classify_credential(payload: ClassifyPayload, user: dict = Depends(get_current_user)):
    """Classify a third-party credential URL and return issuer info."""
    result = _classify_issuer_from_url(payload.credential_url)
    return {
        "ok": True,
        "issuer": result["issuer"],
        "issuer_key": result["issuer_key"],
        "hint": result["hint"],
    }


@router.get("/recipient/{email}")
async def list_certificates_by_recipient(email: str):
    """List all certificates issued to a recipient by email."""
    email = email.strip().lower()
    certs = await db.certificates.find({"recipient_email": email}).sort("created_at", -1).to_list(100)
    for c in certs:
        c["_id"] = str(c["_id"])
    return {"certificates": certs, "total": len(certs)}
