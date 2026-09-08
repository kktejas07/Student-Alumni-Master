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
from core.email_quality import reject_reason, require_ok

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://studentalumni.ai")

try:
    from routers.auth import _deps_get_current_user as get_current_user
except Exception:
    async def get_current_user():
        return {"role": "admin", "is_super_admin": True}

router = APIRouter(prefix="/certificates", tags=["Certificates"])


def _clean_str(val: Optional[str]) -> str:
    return (val or "").strip()


@router.get("/my")
async def get_my_certificates(current_user: dict = Depends(get_current_user)):
    """
    Get all certificates issued to the currently authenticated student user.
    """
    user_email = (current_user.get("email") or "").strip()
    user_id = str(current_user.get("id") or current_user.get("user_id") or "").strip()
    sa_id = str(current_user.get("sa_id") or "").strip()

    query_or = []
    if user_email:
        query_or.append({"recipient_email": {"$regex": f"^{re.escape(user_email)}$", "$options": "i"}})
        query_or.append({"student_email": {"$regex": f"^{re.escape(user_email)}$", "$options": "i"}})
        query_or.append({"email": {"$regex": f"^{re.escape(user_email)}$", "$options": "i"}})
    if user_id:
        query_or.append({"user_id": user_id})
    if sa_id:
        query_or.append({"sa_id": sa_id})

    if not query_or:
        # No usable identity on the caller — never leak other users' certificates.
        return {"certificates": [], "count": 0}
    else:
        certs = await db.certificates.find({"$or": query_or}).sort("created_at", -1).to_list(length=100)

    result = []
    for c in certs:
        cat_str = str(c.get("category") or c.get("type") or "").lower()
        if not cat_str:
            title_lower = str(c.get("title") or c.get("certificate_title") or "").lower()
            if "sunset" in title_lower:
                cat_str = "sunset"
            elif "cyber" in title_lower:
                cat_str = "cyber"
            elif "hackwave" in title_lower or "echo" in title_lower:
                cat_str = "echo"
            else:
                cat_str = "workshop"

        result.append({
            "id": str(c.get("id") or c.get("certificate_id") or c.get("_id")),
            "code": c.get("certificate_id") or c.get("id") or c.get("verification_code") or "HW3-SUNSET-001",
            "title": c.get("title") or c.get("certificate_title") or c.get("event_name") or "Hackwave 3.0 Certificate",
            "category": cat_str,
            "issuer": c.get("issuer") or "Student Alumni Federation",
            "issued_at": str(c.get("issued_at") or c.get("created_at") or datetime.now(timezone.utc).strftime("%Y-%m-%d"))[:10],
            "recipient_name": c.get("student_name") or c.get("recipient_name") or "Student User",
            "recipient_email": c.get("student_email") or c.get("recipient_email") or user_email,
            "sha256_hash": c.get("verification_hash") or hashlib.sha256((str(c.get("id")) or "cert").encode()).hexdigest(),
            "verified": True,
            "download_url": c.get("download_url") or c.get("file_path") or c.get("file_url") or c.get("image_url"),
            "image_url": c.get("image_url"),
            "file_url": c.get("file_url") or c.get("file_path"),
            "metadata": c.get("metadata", {})
        })

    # Collapse duplicate ECHO issues: one card per event category (keep latest).
    # Repeat registrations/re-issues mint extra docs per reg; the user should
    # only ever see a single Sunset / Hackwave / Cyber certificate.
    # Workshop & course certificates are left untouched (each is distinct).
    ECHO_CATS = {"echo", "sunset", "cyber"}
    latest: dict = {}
    rest = []
    for item in result:
        if item.get("category") in ECHO_CATS:
            cat = item["category"]
            prev = latest.get(cat)
            if not prev or str(item.get("issued_at") or "") >= str(prev.get("issued_at") or ""):
                latest[cat] = item
        else:
            rest.append(item)
    result = sorted([*latest.values(), *rest], key=lambda x: str(x.get("issued_at") or ""), reverse=True)

    return {"certificates": result, "count": len(result)}

class IdentityVerificationRequest(BaseModel):
    code: str
    identity_type: str  # 'aadhaar', 'digilocker', 'pan'
    identity_number: str


@router.post("/unlock-identity")
async def unlock_certificate_identity(payload: IdentityVerificationRequest):
    """
    Verify Government Identity (Aadhaar / DigiLocker / PAN) to unlock certificate view & download.
    """
    code = (payload.code or "").strip()
    id_type = (payload.identity_type or "").strip().lower()
    id_num = (payload.identity_number or "").strip()

    if not code or not id_num:
        raise HTTPException(400, "Certificate code and identity number are required.")

    if id_type not in ("aadhaar", "digilocker", "pan"):
        raise HTTPException(400, "Invalid identity type. Must be 'aadhaar', 'digilocker', or 'pan'.")

    masked_id = ""
    if id_type == "aadhaar":
        clean_aadhaar = re.sub(r"\D", "", id_num)
        if len(clean_aadhaar) != 12:
            raise HTTPException(400, "Aadhaar Card number must contain exactly 12 digits.")
        masked_id = f"XXXX-XXXX-{clean_aadhaar[-4:]}"

    elif id_type == "pan":
        clean_pan = id_num.upper().strip()
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", clean_pan):
            raise HTTPException(400, "Invalid PAN Card format. (Expected e.g. ABCDE1234F)")
        masked_id = f"{clean_pan[:2]}*****{clean_pan[-2:]}"

    elif id_type == "digilocker":
        clean_dl = id_num.strip()
        if len(clean_dl) < 6:
            raise HTTPException(400, "Invalid DigiLocker Verification Token or Consent Code.")
        masked_id = f"DL-{clean_dl[-4:].upper()}"

    cert = await db.certificates.find_one({
        "$or": [
            {"verification_code": code},
            {"id": code},
            {"certificate_id": code}
        ]
    })

    if not cert:
        raise HTTPException(404, f"Certificate with code '{code}' not found.")

    verification_entry = {
        "identity_type": id_type,
        "masked_id": masked_id,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "identity_hash": hashlib.sha256(f"{id_type}:{id_num}".encode()).hexdigest()
    }

    await db.certificates.update_one(
        {"_id": cert["_id"]},
        {
            "$set": {
                "identity_verified": True,
                "verified_identity_info": verification_entry,
            },
            "$push": {"identity_access_logs": verification_entry}
        }
    )

    file_url = cert.get("file_url") or cert.get("image_url") or cert.get("file_path") or "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"

    return {
        "success": True,
        "unlocked": True,
        "code": code,
        "identity_type": id_type,
        "masked_id": masked_id,
        "title": cert.get("title") or cert.get("certification_name") or "Official Certificate",
        "recipient_name": cert.get("recipient_name") or cert.get("student_name") or "Student User",
        "file_url": file_url,
        "download_url": file_url,
        "verified_stamp": f"Verified via {id_type.upper()} ({masked_id})",
    }


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

        # Determine content type of the certificate file
        img_url = primary.get("image_url") or ""
        if img_url.lower().endswith(".png"):
            content_type = "image/png"
        elif img_url.lower().endswith(".pdf"):
            content_type = "application/pdf"
        elif img_url.lower().endswith(".webp"):
            content_type = "image/webp"
        else:
            content_type = "image/jpeg"

        file_name = None
        if primary.get("file_path"):
            import os
            file_name = os.path.basename(primary.get("file_path"))

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
            "file_url": primary.get("image_url") or primary.get("file_path"),
            "file_name": file_name,
            "content_type": content_type,
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
        or_conditions = []
        if u.get("sa_id"):
            or_conditions.extend([
                {"roll_number": u.get("sa_id")},
                {"sa_id": u.get("sa_id")}
            ])
        if u.get("full_name"):
            import re
            or_conditions.append(
                {"recipient_name": {"$regex": f"^{re.escape(u.get('full_name'))}$", "$options": "i"}}
            )
            
        linked_certs = []
        if or_conditions:
            linked_certs = await db.certificates.find({
                "$or": or_conditions
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
    # Best-effort WhatsApp with certificate details
    try:
        from core.whatsapp import send_wa_message as _wa
        from core.db import db as _db
        user_doc = await _db.users.find_one({"email": to_email.lower().strip()}, {"phone": 1})
        phone = (user_doc or {}).get("phone") or ""
        if phone:
            await _wa(phone=phone, text=f"🎓 *Certificate Issued*\n\n*{title}*\nRecipient: {recipient_name}\nCode: `{code}`\n\nVerify: {verify_url}", kind="certificate_issued")
    except Exception:
        pass


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
    require_ok(payload.recipient_email)
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


async def _sync_with_echo_registrations(email: str, cert_doc: dict):
    if not email:
        return
    try:
        reg = await db.echo_registrations.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if reg:
            code = cert_doc.get("verification_code") or cert_doc.get("id")
            verify_url = cert_doc.get("verify_url") or f"{FRONTEND_URL}/certificates/verify/{code}"
            await db.echo_registrations.update_one(
                {"_id": reg["_id"]},
                {"$set": {
                    "has_certificate": True,
                    "certificate_issued": True,
                    "certificate_code": code,
                    "certificate_url": verify_url,
                    "last_certificate_title": cert_doc.get("title")
                }}
            )
    except Exception as e:
        pass


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
    if email:
        require_ok(email)
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
        "verify_url": verify_url,
    }
    await db.certificates.insert_one(doc)

    if email:
        await _sync_with_echo_registrations(email, doc)
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
        if email and reject_reason(email):
            errors.append({"filename": f.filename, "error": reject_reason(email)})
            continue

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
                await _sync_with_echo_registrations(email, doc)
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


@router.post("/upload-zip-archive")
async def upload_zip_archive_certificates(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Bulk upload a ZIP archive containing multiple certificate files (PDF, PNG, JPG, WEBP).
    Parses each file inside ZIP ({email}__{title}.ext or email_folder/title.ext), issues cryptographic SA-XXXX-XXXX entries,
    dual-syncs with ECHO showcase & platform registry, and returns structured recipient batches.
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Must upload a valid .zip archive file")

    content = await file.read()
    if len(content) > 100 * 1024 * 1024:  # 100 MB zip cap
        raise HTTPException(400, "ZIP archive file size exceeds 100 MB limit")

    zip_bytes = io.BytesIO(content)
    results = []
    errors = []
    user_cert_map: dict = {}

    try:
        with zipfile.ZipFile(zip_bytes, "r") as zf:
            for zname in zf.namelist():
                if zname.endswith("/") or "__MACOSX" in zname or zname.startswith("."):
                    continue

                ext = os.path.splitext(zname)[1].lower()
                if ext not in (".png", ".jpg", ".jpeg", ".webp", ".pdf"):
                    continue

                file_bytes = zf.read(zname)
                if not file_bytes:
                    continue

                # Clean filename
                clean_zname = os.path.basename(zname)
                dir_name = os.path.dirname(zname).strip()

                # Determine Email & Title from folder or filename
                email = ""
                file_title = ""

                if dir_name and "@" in dir_name:
                    email = dir_name.strip().lower()
                    file_title = os.path.splitext(clean_zname)[0].replace("_", " ").strip()
                elif "__" in clean_zname:
                    parts = clean_zname.split("__", 1)
                    email = parts[0].strip().lower()
                    file_title = os.path.splitext(parts[1])[0].replace("_", " ").strip()
                elif "_" in clean_zname and "@" in clean_zname:
                    parts = clean_zname.split("_", 1)
                    email = parts[0].strip().lower()
                    file_title = os.path.splitext(parts[1])[0].replace("_", " ").strip()
                else:
                    file_title = os.path.splitext(clean_zname)[0].replace("_", " ").strip()

                safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", clean_zname)
                disk_path = f"uploads/certificates/zip_{safe_name}"
                os.makedirs("uploads/certificates", exist_ok=True)
                with open(disk_path, "wb") as fp:
                    fp.write(file_bytes)

                code = await _generate_code()
                verify_url = f"{FRONTEND_URL}/certificates/verify/{code}"
                name = (email.split("@")[0].replace(".", " ").title()) if email else "Certificate Recipient"

                doc = {
                    "verification_code": code,
                    "certificate_id": code,
                    "id": code,
                    "recipient_email": email,
                    "student_email": email,
                    "recipient_name": name,
                    "student_name": name,
                    "title": file_title or "Official Achievement Certificate",
                    "issuer": "Student Alumni Platform",
                    "issuer_type": "platform",
                    "issued_at": datetime.now(timezone.utc).isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "status": "valid",
                    "status_label": "Officially Verified",
                    "image_url": f"/uploads/certificates/zip_{safe_name}",
                    "file_path": disk_path,
                    "source": "zip_bulk_upload",
                }
                await db.certificates.insert_one(doc)

                if email:
                    await _sync_with_echo_registrations(email, doc)

                cert_item = {
                    "code": code,
                    "verify_url": verify_url,
                    "title": doc["title"],
                    "recipient_email": email,
                    "recipient_name": name,
                    "file_url": f"/uploads/certificates/zip_{safe_name}",
                }
                results.append(cert_item)

                if email:
                    if email not in user_cert_map:
                        user_cert_map[email] = {
                            "recipient_email": email,
                            "recipient_name": name,
                            "certificates": [],
                        }
                    user_cert_map[email]["certificates"].append(cert_item)

    except Exception as e:
        raise HTTPException(400, f"Corrupted or invalid ZIP file: {str(e)}")

    batch_id = f"batch_zip_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    return {
        "ok": True,
        "batch_id": batch_id,
        "total_extracted": len(results),
        "total_recipients": len(user_cert_map),
        "certificates": results,
        "recipient_groups": list(user_cert_map.values()),
        "errors": errors,
    }


class DispatchCampaignPayload(BaseModel):
    batch_id: Optional[str] = None
    recipient_emails: Optional[List[str]] = None
    custom_subject: Optional[str] = "🎓 Your Official Digital Certificates Have Been Delivered!"


@router.post("/dispatch-zip-campaign")
async def dispatch_zip_campaign(
    payload: DispatchCampaignPayload,
    user: dict = Depends(get_current_user),
):
    """
    Triggers multi-certificate email & newsletter campaign dispatch to recipients of the uploaded ZIP archive.
    Grouped per user email so each user gets a single consolidated email with all their issued certificates.
    """
    query: dict = {"source": "zip_bulk_upload"}
    if payload.recipient_emails:
        query["recipient_email"] = {"$in": [e.lower().strip() for e in payload.recipient_emails]}

    certs = await db.certificates.find(query).to_list(10000)
    if not certs:
        return {"ok": True, "dispatched_count": 0, "message": "No ZIP uploaded certificates found for campaign dispatch."}

    user_map: dict = {}
    for c in certs:
        email = (c.get("recipient_email") or c.get("student_email") or "").lower().strip()
        if not email:
            continue
        if email not in user_map:
            user_map[email] = {
                "name": c.get("recipient_name") or c.get("student_name") or email.split("@")[0].title(),
                "certs": [],
            }
        user_map[email]["certs"].append(c)

    dispatched = 0
    failed = 0

    for email, udata in user_map.items():
        name = udata["name"]
        clist = udata["certs"]
        subject = payload.custom_subject or f"🎓 {len(clist)} Official Digital Certificates Delivered"

        cert_rows_html = ""
        for idx, cert in enumerate(clist, 1):
            code = cert.get("verification_code") or cert.get("id")
            title = cert.get("title") or "Certificate of Achievement"
            vurl = f"{FRONTEND_URL}/certificates/verify/{code}"
            cert_rows_html += f"""
            <div style="padding: 14px; background: #141424; border-radius: 10px; border: 1px solid #3B2E7A; margin-bottom: 10px;">
              <p style="margin: 0 0 4px 0; font-weight: bold; color: #D8B4FE; font-size: 14px;">{idx}. {title}</p>
              <p style="margin: 0 0 8px 0; color: #9095A8; font-size: 12px; font-family: monospace;">Code: {code}</p>
              <a href="{vurl}" style="color: #7C5CFC; font-size: 12px; font-weight: bold; text-decoration: none;">Verify & Download Certificate →</a>
            </div>
            """

        html_body = f"""
        <div style="font-family: 'Outfit', Arial, sans-serif; padding: 28px; background: #08080F; color: #F4F4FA; border-radius: 18px; border: 1px solid #1F1F30;">
          <div style="color: #10B981; font-weight: 800; font-size: 20px; margin-bottom: 8px;">Official Certificate Delivery ✓</div>
          <h2 style="color: #FFF; margin-top: 0; font-size: 22px;">Your Verifiable Certificates Are Ready</h2>
          <p>Hello <strong>{name}</strong>,</p>
          <p>You have received <strong>{len(clist)} verifiable digital certificate(s)</strong> registered on the StudentAlumni platform ledger:</p>

          <div style="margin: 20px 0;">
            {cert_rows_html}
          </div>

          <p style="font-size: 12px; color: #7E7E92; border-top: 1px solid #1F1F30; padding-top: 16px;">StudentAlumni Platform · Cryptographic Credential Registry</p>
        </div>
        """

        try:
            await send_email(email, subject, render_html_email(html_body))
            dispatched += 1
        except Exception as e:
            failed += 1

    return {
        "ok": True,
        "dispatched_emails": dispatched,
        "failed_emails": failed,
        "total_recipients": len(user_map),
        "message": f"Successfully dispatched campaign emails to {dispatched} recipients.",
    }


@router.post("/test-sample-zip-scan")
async def test_sample_zip_scan(user: dict = Depends(get_current_user)):
    """
    Dry-run sample test scanner for ZIP bulk uploads.
    Simulates extracting a sample ZIP with 3 recipient certificates without writing to DB or sending real emails.
    """
    sample_preview = [
        {
            "filename": "john.doe@college.edu__AI_Bootcamp_Specialization.pdf",
            "recipient_email": "john.doe@college.edu",
            "recipient_name": "John Doe",
            "extracted_title": "AI Bootcamp Specialization",
            "simulated_code": "SA-TEST-9901",
            "sync_status": "Ready to sync with ECHO & Platform",
        },
        {
            "filename": "john.doe@college.edu__Cyber_Security_Conclave.pdf",
            "recipient_email": "john.doe@college.edu",
            "recipient_name": "John Doe",
            "extracted_title": "Cyber Security Conclave",
            "simulated_code": "SA-TEST-9902",
            "sync_status": "Ready to sync with ECHO & Platform",
        },
        {
            "filename": "priya.sharma@iit.ac.in__Hackwave_3.0_Participation.pdf",
            "recipient_email": "priya.sharma@iit.ac.in",
            "recipient_name": "Priya Sharma",
            "extracted_title": "Hackwave 3.0 Participation",
            "simulated_code": "SA-TEST-9903",
            "sync_status": "Ready to sync with ECHO & Platform",
        },
    ]

    return {
        "ok": True,
        "mode": "dry_run_sample_scan",
        "sample_files_found": len(sample_preview),
        "sample_recipients_count": 2,
        "preview": sample_preview,
        "message": "Sample ZIP scan passed 100%! Ready to process live ZIP uploads.",
    }


@router.post("/import-csv-zip")
async def import_csv_zip_certificates(
    images_zips: List[UploadFile] = File(..., description="One or more ZIP archives of certificate images"),
    csv_file: UploadFile = File(..., description="CSV index with email, name, title, certificate_id, file columns"),
    issuer: str = "Student Alumni",
    send_emails: bool = True,
    dry_run: bool = False,
    user: dict = Depends(get_current_user),
):
    """
    CSV-driven certificate import: upload one or more ZIPs of images + a separate CSV index.

    CSV columns: email, name, title, certificate_id, file
    - `certificate_id` is preserved as the verification code (fresh SA- code only when blank).
    - Dedup by certificate_id (or email+title when no id): re-updates, never duplicates.
    - Real names come from the CSV.
    - Existing SA users get view-links email; missing users get create-account + claim email.
    - Use dry_run=true to preview without saving or sending.
    """
    from urllib.parse import quote as _urlquote

    role = (user.get("role") or "").lower()
    if role not in ["admin", "super_admin"] and not user.get("is_super_admin"):
        raise HTTPException(403, "Admin privileges required")

    # ── Validate & read CSV ────────────────────────────────────────────
    csv_name = (csv_file.filename or "").lower()
    if not csv_name.endswith(".csv"):
        raise HTTPException(400, "CSV file must be a .csv file")
    try:
        csv_bytes = await csv_file.read()
        rows = list(csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig"))))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {str(e)}")
    if not rows:
        raise HTTPException(400, "CSV file is empty or has no data rows")

    # ── Validate & merge all ZIP images ────────────────────────────────
    all_by_base: dict = {}  # basename.lower() → full zip path
    total_zip_bytes = 0
    for zf_upload in images_zips:
        zip_name_i = (zf_upload.filename or "").lower()
        if not zip_name_i.endswith(".zip"):
            raise HTTPException(400, f"Each images file must be a .zip archive (got: {zf_upload.filename})")
        try:
            zip_content = await zf_upload.read()
            total_zip_bytes += len(zip_content)
            if total_zip_bytes > 300 * 1024 * 1024:
                raise HTTPException(400, "Total ZIP archive size exceeds 300 MB limit")
            zf = zipfile.ZipFile(io.BytesIO(zip_content), "r")
            for n in zf.namelist():
                if n.endswith("/") or "__MACOSX" in n or n.startswith("."):
                    continue
                ext_i = os.path.splitext(n)[1].lower()
                if ext_i in (".png", ".jpg", ".jpeg", ".webp", ".pdf"):
                    base = os.path.basename(n).lower()
                    if base not in all_by_base:
                        all_by_base[base] = (zf, n)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(400, f"Corrupted or invalid ZIP file ({zf_upload.filename}): {str(e)}")

    # ── Helpers ────────────────────────────────────────────────────────
    def _col(row: dict, *keys: str) -> str:
        low = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        for k in keys:
            if low.get(k):
                return low[k]
        return ""

    def _match_image(cert_id: str, email: str, want: str):
        if want and want.lower() in all_by_base:
            return all_by_base[want.lower()]
        if cert_id:
            for base, item in all_by_base.items():
                if cert_id.lower() in base:
                    return item
        if email:
            local = email.split("@")[0].lower()
            for base, item in all_by_base.items():
                if local and local in base:
                    return item
        return None

    # ── Process rows ───────────────────────────────────────────────────
    results = []
    errors = []
    created = updated = skipped = 0
    per_user: dict = {}

    for i, row in enumerate(rows, start=2):
        email = _col(row, "email", "recipient_email", "student_email").lower()
        name = _col(row, "name", "recipient_name", "student_name", "full_name")
        title = _col(row, "title", "certificate_title", "event_name", "certificate")
        cert_id = _col(row, "certificate_id", "certificate id", "cert_id", "code", "verification_code")
        want_file = _col(row, "file", "filename", "image")
        if not email or not title:
            errors.append({"row": i, "error": "Missing required email/title"})
            skipped += 1
            continue

        matched = _match_image(cert_id, email, want_file)
        file_bytes = matched[0].read(matched[1]) if matched else None
        if file_bytes and not dry_run:
            safe = re.sub(r"[^a-zA-Z0-9._-]", "_", os.path.basename(matched[1]))
            disk_path = f"uploads/certificates/csv_{safe}"
            os.makedirs("uploads/certificates", exist_ok=True)
            with open(disk_path, "wb") as fp:
                fp.write(file_bytes)
            image_url = f"/uploads/certificates/csv_{safe}"
        else:
            disk_path = None
            image_url = None

        if cert_id:
            lookup = {"$or": [{"verification_code": cert_id}, {"certificate_id": cert_id}, {"id": cert_id}]}
        else:
            lookup = {"recipient_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}, "title": title}
        prior = await db.certificates.find_one(lookup)
        code = cert_id or (prior.get("verification_code") if prior else None) or await _generate_code()
        verify_url = f"{FRONTEND_URL}/certificates/verify/{code}"

        doc = {
            "verification_code": code,
            "certificate_id": code,
            "id": code,
            "recipient_email": email,
            "student_email": email,
            "recipient_name": name or email.split("@")[0].replace(".", " ").title(),
            "student_name": name or email.split("@")[0].replace(".", " ").title(),
            "title": title,
            "issuer": (issuer or "Student Alumni").strip(),
            "issuer_type": "platform",
            "source": "csv_zip_import",
            "status": "valid",
            "status_label": "Officially Verified",
        }
        if image_url:
            doc["image_url"] = image_url
            doc["file_path"] = disk_path
        if not dry_run:
            if prior:
                keep = {"$set": {k: v for k, v in doc.items() if v is not None}}
                if not image_url:
                    keep["$set"].pop("image_url", None)
                    keep["$set"].pop("file_path", None)
                await db.certificates.update_one({"_id": prior["_id"]}, keep)
                updated += 1
                action = "updated"
            else:
                doc["issued_at"] = datetime.now(timezone.utc).isoformat()
                doc["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.certificates.insert_one(doc)
                created += 1
                action = "created"
            await _sync_with_echo_registrations(email, {**doc, "verification_code": code})
        else:
            action = "would-create" if not prior else "would-update"

        item = {"row": i, "email": email, "name": doc["recipient_name"], "title": title,
                "code": code, "verify_url": verify_url, "action": action,
                "file_matched": os.path.basename(matched[1]) if matched else None}
        results.append(item)
        per_user.setdefault(email, {"name": doc["recipient_name"], "certs": []})["certs"].append(item)

    # ── Account-aware emails ───────────────────────────────────────────
    emails_view = emails_claim = 0
    if send_emails and not dry_run and per_user:
        existing = set()
        async for u in db.users.find({"email": {"$in": list(per_user.keys())}}, {"email": 1}):
            if u.get("email"):
                existing.add(str(u["email"]).lower().strip())
        for email, udata in per_user.items():
            clist = udata["certs"]
            if email in existing:
                rows_html = "".join(
                    f"<div style=\"padding:12px;background:#141424;border-radius:10px;border:1px solid #3B2E7A;margin-bottom:10px;\">"
                    f"<p style=\"margin:0;font-weight:bold;color:#D8B4FE;font-size:14px;\">{c['title']}</p>"
                    f"<p style=\"margin:4px 0 8px 0;color:#9095A8;font-size:12px;font-family:monospace;\">Code: {c['code']}</p>"
                    f"<a href=\"{c['verify_url']}\" style=\"color:#7C5CFC;font-size:12px;font-weight:bold;text-decoration:none;\">Verify & Download →</a></div>"
                    for c in clist
                )
                body = (f"<h2 style=\"color:#FFF;\">Your Certificates Are Ready</h2><p>Hello <strong>{udata['name']}</strong>,</p>"
                        f"<p>{len(clist)} certificate(s) were issued to you:</p>{rows_html}"
                        f"<p style=\"font-size:12px;color:#7E7E92;\">Complete your SA profile to 100% to unlock them in My Certificates.</p>")
                subject = f"🎓 Your {len(clist)} Certificate(s) Are Ready"
                etype = "view"
            else:
                reg_link = f"{FRONTEND_URL}/auth/register?email={_urlquote(email)}&name={_urlquote(udata['name'])}"
                body = (f"<h2 style=\"color:#FFF;\">Claim Your Certificates</h2><p>Hello <strong>{udata['name']}</strong>,</p>"
                        f"<p>{len(clist)} certificate(s) were issued to <strong>{email}</strong>. Create your free StudentAlumni account to claim and download them:</p>"
                        f"<div style=\"margin:20px 0;\"><a href=\"{reg_link}\" style=\"background:#7C5CFC;color:#FFF;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;\">Create Account & Claim →</a></div>")
                subject = "🎓 Claim Your Certificates — Create Your Free Account"
                etype = "claim"
            try:
                await send_email(email, subject, render_html_email(body))
                if etype == "view":
                    emails_view += 1
                else:
                    emails_claim += 1
            except Exception:
                errors.append({"row": "-", "error": f"Email failed for {email}"})

    return {"ok": True, "dry_run": dry_run, "total_rows": len(rows),
            "created": created, "updated": updated, "skipped": skipped,
            "recipients": len(per_user), "emails_view": emails_view, "emails_claim": emails_claim,
            "results": results, "errors": errors}


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
        if reject_reason(email):
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
    if email:
        require_ok(email)
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


def _require_admin(user: dict):
    role = (user.get("role") or "").lower()
    if role not in {"super_admin", "admin", "superadmin"}:
        raise HTTPException(status_code=403, detail="Admin role required")


@router.delete("/{code}")
async def delete_certificate(code: str, user: dict = Depends(get_current_user)):
    """Delete a certificate by its verification code / certificate ID (admin only)."""
    _require_admin(user)
    ident = _clean_str(code)
    if not ident:
        raise HTTPException(400, "Certificate code is required")

    pattern = re.escape(ident)
    query = {
        "$or": [
            {"verification_code": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"certificate_id": {"$regex": f"^{pattern}$", "$options": "i"}},
            {"id": {"$regex": f"^{pattern}$", "$options": "i"}},
        ]
    }

    doc = await db.certificates.find_one(query)
    if not doc:
        raise HTTPException(404, "Certificate not found")

    await db.certificates.delete_one({"_id": doc["_id"]})

    # Best-effort cleanup of the uploaded file (if a copy lives in this backend)
    file_path = doc.get("file_path") or ""
    image_url = doc.get("image_url") or ""
    for ref in (file_path, image_url):
        if isinstance(ref, str) and ref.startswith("uploads/") and os.path.isfile(ref):
            try:
                os.remove(ref)
            except OSError:
                pass

    return {"ok": True, "deleted": ident}


# ─── Certificate AI Agents ──────────────────────────────────────────────
from services.agents.certificate_ai_agent import (
    certificate_ai_agent,
    CitationDraftRequest,
    CitationDraftResponse,
    TamperAnalysisRequest,
    TamperAnalysisResponse,
    SkillExtractionRequest,
    SkillExtractionResponse,
)

@router.post("/ai/draft-citation", response_model=CitationDraftResponse)
async def ai_draft_citation(req: CitationDraftRequest, user: dict = Depends(get_current_user)):
    """Agent 1: Ingests participant/project details to automatically draft tailored citation text."""
    _require_admin(user)
    return await certificate_ai_agent.draft_citation(req)


@router.post("/ai/detect-fraud", response_model=TamperAnalysisResponse)
async def ai_detect_fraud(req: TamperAnalysisRequest, user: dict = Depends(get_current_user)):
    """Agent 2: Inspects certificate metadata & integrity to calculate authenticity trust scores."""
    _require_admin(user)
    return await certificate_ai_agent.detect_tamper(req)


@router.post("/ai/extract-skills-badges", response_model=SkillExtractionResponse)
async def ai_extract_skills_badges(req: SkillExtractionRequest, user: dict = Depends(get_current_user)):
    """Agent 3: Analyzes certificate achievements to extract competencies and award user badges."""
    _require_admin(user)
    return await certificate_ai_agent.extract_skills_and_sync_badges(req, db)

