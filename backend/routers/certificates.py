import os
import io
import csv
import zipfile
import hashlib
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile
from fastapi.responses import JSONResponse

from core.db import db

try:
    from routers.auth import _deps_get_current_user as get_current_user
except Exception:
    async def get_current_user():
        return {"role": "admin", "is_super_admin": True}

router = APIRouter(prefix="/certificates", tags=["Certificates"])




def _clean_str(val: Optional[str]) -> str:
    return (val or "").strip()


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

    # 1. Search db.certificates collection
    cert_query = {
        "$or": [
            {"id": {"$regex": f"^{ident}$", "$options": "i"}},
            {"certificate_id": {"$regex": f"^{ident}$", "$options": "i"}},
            {"roll_number": {"$regex": f"^{ident}$", "$options": "i"}},
            {"sa_id": {"$regex": f"^{ident}$", "$options": "i"}},
            {"verification_hash": {"$regex": f"^{ident}$", "$options": "i"}}
        ]
    }
    
    matched_certs = await db.certificates.find(cert_query).to_list(length=50)
    
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
