"""
Certificate registry + public verification endpoints.
==================================================================
Modeled on the industry-standard verification flow used by
Coursera (/verify/{code}), freeCodeCamp (/certification/...),
Udemy (/certificate/UC-...), and LinkedIn (credential URL):

  - Every certificate the platform issues gets a unique
    `verification_code` stored in the `certificates` collection.
  - Anyone (no login) can hit GET /api/certificates/verify/{code}
    to confirm the certificate is genuine and see the facts.
  - Externally-issued certificates (Udemy, Coursera, LinkedIn,
    codespectra, ...) cannot be cryptographically verified by us —
    only the issuing platform can. For those we store the issuer +
    credential URL and the verify page deep-links to the issuer's
    own verification page, plus does a URL sanity check.

Collections:
  certificates
"""
from __future__ import annotations

import base64
import mimetypes
import os
import re
import secrets
import string
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, File, UploadFile, Form
from pydantic import BaseModel

from core.db import db

router = APIRouter()

_JWT_SECRET = os.environ.get("JWT_SECRET", "")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gen_code() -> str:
    """Human-friendly unique verification code: SA-XXXX-XXXX (no 0/O/1/I)."""
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "SA-" + "".join(secrets.choice(alphabet) for _ in range(4)) + "-" + "".join(
        secrets.choice(alphabet) for _ in range(4)
    )


# ── External issuer classification ─────────────────────────────────────────
ISSUERS: Dict[str, Dict[str, Any]] = {
    "udemy": {
        "label": "Udemy",
        "match": re.compile(r"udemy\.com/certificate/UC-[A-Za-z0-9-]{6,}", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "Udemy certificates are verifiable at the udemy.com/certificate/ link you saved.",
    },
    "coursera": {
        "label": "Coursera",
        "match": re.compile(r"coursera\.org/(?:learn|account/accomplishments)[^\s]*|coursera\.org/verify/[A-Z0-9]{4,}", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "Coursera credentials verify at coursera.org/verify/<code>.",
    },
    "linkedin": {
        "label": "LinkedIn Learning",
        "match": re.compile(r"linkedin\.com/(?:learning/certificates|in/|public-profile)[^\s]*", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "LinkedIn credentials are verified via the profile / learning certificate URL.",
    },
    "freecodecamp": {
        "label": "freeCodeCamp",
        "match": re.compile(r"freecodecamp\.org/certification/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "freeCodeCamp certificates verify at freecodecamp.org/certification/<user>/<slug>.",
    },
    "codespectra": {
        "label": "CodeSpectra",
        "match": re.compile(r"codespectra\.ai[^\s]*", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "CodeSpectra credentials verify on the issuing page.",
    },
    "edx": {
        "label": "edX",
        "match": re.compile(r"edx\.org[^\s]*|credentials\.edx\.org[^\s]*", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "edX certificates verify via your credentials.edx.org link.",
    },
    "google": {
        "label": "Google Career Certificates",
        "match": re.compile(r"grow\.google[^\s]*", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "Google certificates verify via the credential URL.",
    },
    "ibm": {
        "label": "IBM SkillsBuild / Credly",
        "match": re.compile(r"credly\.com[^\s]*|skillsbuild\.org[^\s]*|ibm\.com[^\s]*", re.IGNORECASE),
        "verify_url": lambda u: u,
        "hint": "IBM / Credly badges verify on the Credly page.",
    },
}

_DEFAULT_HINT = (
    "This certificate was issued by a third party. We store the issuer and "
    "credential link so employers can check authenticity at the source."
)


def classify_external(url: str) -> Dict[str, Any]:
    """Return issuer metadata for an external credential URL."""
    for key, meta in ISSUERS.items():
        if meta["match"].search(url or ""):
            return {
                "issuer": meta["label"],
                "issuer_key": key,
                "hint": meta["hint"],
                "verify_url": meta["verify_url"](url),
            }
    # Generic fallback — still store + deep-link.
    try:
        from urllib.parse import urlparse
        host = urlparse(url).netloc
    except Exception:
        host = ""
    return {
        "issuer": host or "Third-party issuer",
        "issuer_key": "other",
        "hint": _DEFAULT_HINT,
        "verify_url": url,
    }


# ── Models ─────────────────────────────────────────────────────────────────
class IssueRequest(BaseModel):
    recipient_email: str
    title: str
    issuer: str = "Student Alumni"
    credential_url: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class ExternalCertRequest(BaseModel):
    recipient_email: str
    title: str
    issuer: str
    credential_url: str
    year: Optional[int] = None


# ── Public verification ────────────────────────────────────────────────────
@router.get("/certificates/verify/{code}")
async def verify_certificate(code: str):
    """Publicly verify a platform-issued certificate by its verification code."""
    code = (code or "").strip().upper()
    if not code:
        raise HTTPException(400, "Missing verification code")
    doc = await db.certificates.find_one({"verification_code": code})
    if not doc:
        # Try prefix-insensitive (allow typing without SA-)
        doc = await db.certificates.find_one({"verification_code": {"$regex": f"^{code}$", "$options": "i"}})
    if not doc:
        raise HTTPException(404, "Certificate not found")
    issued = doc.get("issued_at")
    return {
        "valid": True,
        "verification_code": doc.get("verification_code"),
        "recipient_name": doc.get("recipient_name"),
        "recipient_email": doc.get("recipient_email"),
        "title": doc.get("title"),
        "issuer": doc.get("issuer"),
        "issuer_type": doc.get("issuer_type", "platform"),
        "issued_at": issued.isoformat() if hasattr(issued, "isoformat") else issued,
        "credential_url": doc.get("credential_url"),
        "file_url": doc.get("file_url"),
        "file_name": doc.get("file_name"),
        "content_type": doc.get("content_type"),
        "meta": doc.get("meta"),
    }


# ── External certificate lookup-by-URL classification ──────────────────────
class ClassifyRequest(BaseModel):
    credential_url: str


@router.post("/certificates/classify")
async def classify_certificate(payload: ClassifyRequest):
    """Given an external credential URL, classify the issuer and return a
    verification deep-link. No DB write — used by the profile form to give
    instant feedback + the correct issuer hint."""
    url = (payload.credential_url or "").strip()
    if not url:
        raise HTTPException(400, "credential_url is required")
    return classify_external(url)


# ── Admin: issue a platform certificate ────────────────────────────────────
async def _require_admin(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = auth.split(" ", 1)[1]
    try:
        import jwt as _jwt
        payload = _jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Invalid token")
    if payload.get("role") not in ("admin", "super_admin"):
        raise HTTPException(403, "Admin only")
    return payload


@router.post("/certificates/issue")
async def issue_certificate(payload: IssueRequest, request: Request, _=None):
    await _require_admin(request)
    email = (payload.recipient_email or "").strip().lower()
    title = (payload.title or "").strip()
    if not email or not title:
        raise HTTPException(400, "recipient_email and title are required")

    user = await db.users.find_one({"email": email})
    recipient_name = ""
    if user:
        recipient_name = (
            user.get("full_name") or user.get("name") or ""
        )
    if not recipient_name:
        recipient_name = email.split("@")[0].replace(".", " ").title()

    code = _gen_code()
    # Ensure uniqueness (retry on the astronomically unlikely collision)
    for _ in range(5):
        if not await db.certificates.find_one({"verification_code": code}):
            break
        code = _gen_code()

    cert_doc = {
        "verification_code": code,
        "recipient_email": email,
        "recipient_name": recipient_name,
        "title": title,
        "issuer": payload.issuer or "Student Alumni",
        "issuer_type": "platform",
        "issued_at": _now(),
        "credential_url": payload.credential_url,
        "meta": payload.meta or {},
        "created_at": _now(),
    }
    res = await db.certificates.insert_one(cert_doc)
    return {
        "ok": True,
        "verification_code": code,
        "certificate_id": str(res.inserted_id),
        "recipient_name": recipient_name,
        "verify_url": f"{os.environ.get('FRONTEND_URL', 'https://studentalumni.ai')}/certificates/verify/{code}",
    }


# ── Admin: store an external certificate with issuer classification ───────
@router.post("/certificates/external")
async def add_external_certificate(payload: ExternalCertRequest, request: Request, _=None):
    await _require_admin(request)
    email = (payload.recipient_email or "").strip().lower()
    title = (payload.title or "").strip()
    url = (payload.credential_url or "").strip()
    if not email or not title or not url:
        raise HTTPException(400, "recipient_email, title, and credential_url are required")

    classified = classify_external(url)
    doc = {
        "recipient_email": email,
        "recipient_name": (await _recipient_name(email)),
        "title": title,
        "issuer": payload.issuer or classified["issuer"],
        "issuer_type": "external",
        "issuer_key": classified["issuer_key"],
        "credential_url": url,
        "verify_url": classified["verify_url"],
        "hint": classified["hint"],
        "issued_at": _now(),
        "created_at": _now(),
    }
    res = await db.certificates.insert_one(doc)
    return {"ok": True, "certificate_id": str(res.inserted_id), "classification": classified}


# ── Bulk issue (400+ scale) ─────────────────────────────────────────────────
class BulkIssueItem(BaseModel):
    recipient_email: str
    title: str
    issuer: str = "Student Alumni"
    credential_url: Optional[str] = None


class BulkIssueRequest(BaseModel):
    items: List[BulkIssueItem]


@router.post("/certificates/bulk")
async def bulk_issue_certificates(payload: BulkIssueRequest, request: Request, _=None):
    """Admin bulk issue — accepts up to 1000 recipients at once. Each entry
    gets a unique SA-XXXX-XXXX code and is immediately verifiable. External
    credential URLs are classified and stored as third-party certs."""
    await _require_admin(request)
    items = (payload.items or [])[:1000]
    if not items:
        raise HTTPException(400, "items is required")

    existing = await db.certificates.find({}, {"verification_code": 1}).to_list(None)
    taken = {c.get("verification_code") for c in existing}

    created = 0
    created_codes = []
    for it in items:
        email = (it.recipient_email or "").strip().lower()
        title = (it.title or "").strip()
        if not email or not title:
            continue
        code = _gen_code()
        guard = 0
        while code in taken and guard < 10:
            code = _gen_code()
            guard += 1
        taken.add(code)
        url = (it.credential_url or "").strip()
        is_external = bool(url)
        doc = {
            "verification_code": code,
            "recipient_email": email,
            "recipient_name": await _recipient_name(email),
            "title": title,
            "issuer": it.issuer or "Student Alumni",
            "issuer_type": "external" if is_external else "platform",
            "issued_at": _now(),
            "created_at": _now(),
        }
        if is_external:
            cls = classify_external(url)
            doc["credential_url"] = url
            doc["verify_url"] = cls["verify_url"]
            doc["hint"] = cls["hint"]
            doc["issuer"] = cls["issuer"]
            doc["issuer_key"] = cls["issuer_key"]
        await db.certificates.insert_one(doc)
        created += 1
        created_codes.append({"recipient_email": email, "verification_code": code})

    return {"ok": True, "created": created, "certificates": created_codes}


# ── Legacy migration: make historical self-reported + placeholder certs verifiable ──
@router.post("/certificates/sync-legacy")
async def sync_legacy_certificates(request: Request, _=None):
    """One-shot admin migration. Pulls:
      1) users.certificates[] (self-reported profile certs) — platform-issued
         entries get a real SA code; entries with external credential_url get
         classified + stored as third-party.
      2) workshop_registrations whose certificate_url is still the old
         certificates.example.com placeholder — re-issued with a real code.
    Idempotent: skips anything already present in the registry by
    (recipient_email, title) fingerprint."""
    await _require_admin(request)
    migrated = {"self_reported": 0, "workshop": 0, "skipped": 0}

    existing = await db.certificates.find({}, {"verification_code": 1}).to_list(None)
    taken = {c.get("verification_code") for c in existing}
    fp_seen = set()

    def _fresh_code():
        code = _gen_code()
        guard = 0
        while code in taken and guard < 10:
            code = _gen_code()
            guard += 1
        taken.add(code)
        return code

    # 1) users.certificates[]
    users = await db.users.find(
        {"certificates": {"$exists": True, "$ne": []}},
        {"email": 1, "full_name": 1, "name": 1, "certificates": 1},
    ).to_list(None)
    for u in users:
        email = (u.get("email") or "").strip().lower()
        name = u.get("full_name") or u.get("name") or ""
        for c in (u.get("certificates") or []):
            title = (c.get("name") or c.get("title") or "").strip()
            if not title:
                continue
            fp = f"{email}|{title.lower()}"
            if fp in fp_seen:
                continue
            fp_seen.add(fp)
            dup = await db.certificates.find_one({"recipient_email": email, "title": title})
            if dup:
                migrated["skipped"] += 1
                continue
            url = (c.get("credential_url") or "").strip()
            is_external = bool(url)
            doc = {
                "verification_code": _fresh_code(),
                "recipient_email": email,
                "recipient_name": name or email.split("@")[0].replace(".", " ").title(),
                "title": title,
                "issuer": c.get("issuer") or "Student Alumni",
                "issuer_type": "external" if is_external else "platform",
                "credential_url": url or None,
                "issued_at": c.get("added_at") or _now(),
                "created_at": _now(),
            }
            if is_external:
                cls = classify_external(url)
                doc["verify_url"] = cls["verify_url"]
                doc["hint"] = cls["hint"]
                doc["issuer"] = cls["issuer"]
                doc["issuer_key"] = cls["issuer_key"]
            await db.certificates.insert_one(doc)
            migrated["self_reported"] += 1

    # 2) workshop_registrations with placeholder cert URLs
    regs = await db.workshop_registrations.find(
        {"certificate_url": {"$regex": "certificates\\.example\\.com"}},
    ).to_list(None)
    for reg in regs:
        email = (reg.get("student_email") or reg.get("email") or "").strip().lower()
        title = (reg.get("workshop_title") or "Workshop Completion").strip()
        student = await db.users.find_one({"email": email}) if email else None
        name = (student.get("full_name") or student.get("name") or "") if student else ""
        code = _fresh_code()
        cert_doc = {
            "verification_code": code,
            "recipient_email": email,
            "recipient_name": name or email.split("@")[0].replace(".", " ").title(),
            "title": title,
            "issuer": "Student Alumni",
            "issuer_type": "platform",
            "issued_at": reg.get("completed_at") or reg.get("registered_at") or _now(),
            "created_at": _now(),
            "meta": {"source": "workshop", "registration_id": str(reg["_id"])},
        }
        await db.certificates.insert_one(cert_doc)
        verify_url = f"{os.environ.get('FRONTEND_URL', 'https://studentalumni.ai')}/certificates/verify/{code}"
        await db.workshop_registrations.update_one(
            {"_id": reg["_id"]},
            {"$set": {"certificate_url": verify_url, "verification_code": code}},
        )
        migrated["workshop"] += 1

    return {"ok": True, "migrated": migrated}


# ── File uploads (PNG/JPEG/WEBP/PDF certificate files) ─────────────────────
_ALLOWED_CERT_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}
_MAX_CERT_FILE_BYTES = 15 * 1024 * 1024


async def _save_cert_file(file_bytes: bytes, original_name: str) -> str:
    """Persist a certificate file to uploads/certificates and return its URL."""
    ext = Path(original_name or "").suffix.lower() or ".png"
    if ext not in _ALLOWED_CERT_EXTS:
        raise HTTPException(400, f"Unsupported certificate file type '{ext}'. Allowed: png, jpg, jpeg, webp, pdf")
    if len(file_bytes) > _MAX_CERT_FILE_BYTES:
        raise HTTPException(413, "Certificate file too large. Maximum 15 MB allowed.")
    upload_dir = Path("uploads") / "certificates"
    upload_dir.mkdir(parents=True, exist_ok=True)
    ts = int(_now().timestamp())
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", Path(original_name).stem)[:80] or "certificate"
    safe_name = f"{ts}_{stem}{ext}"
    out_path = upload_dir / safe_name
    with open(out_path, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/certificates/{safe_name}"


@router.post("/certificates/upload")
async def upload_certificate(
    request: Request,
    file: UploadFile = File(None),
    recipient_email: str = Form(""),
    title: str = Form(""),
    issuer: str = Form("Student Alumni"),
):
    """Admin: upload a certificate image/PDF. The file is stored on disk and a
    verifiable registry entry (SA code) is created. Anyone can validate the
    result at /certificates/verify/{code} and see the uploaded file."""
    await _require_admin(request)
    email = (recipient_email or "").strip().lower()
    title = (title or "").strip()
    if not email or not title:
        raise HTTPException(400, "recipient_email and title are required")
    if file is None or not file.filename:
        raise HTTPException(400, "certificate file is required")

    file_bytes = await file.read()
    url = await _save_cert_file(file_bytes, file.filename)
    content_type = mimetypes.guess_type(url)[0] or "application/octet-stream"

    code = _gen_code()
    for _ in range(5):
        if not await db.certificates.find_one({"verification_code": code}):
            break
        code = _gen_code()

    doc = {
        "verification_code": code,
        "recipient_email": email,
        "recipient_name": await _recipient_name(email),
        "title": title,
        "issuer": issuer or "Student Alumni",
        "issuer_type": "platform",
        "file_url": url,
        "file_name": Path(file.filename).name,
        "content_type": content_type,
        "issued_at": _now(),
        "created_at": _now(),
        "meta": {"source": "admin_upload"},
    }
    res = await db.certificates.insert_one(doc)
    return {
        "ok": True,
        "verification_code": code,
        "certificate_id": str(res.inserted_id),
        "recipient_name": doc["recipient_name"],
        "verify_url": f"{os.environ.get('FRONTEND_URL', 'https://studentalumni.ai')}/certificates/verify/{code}",
        "file_url": url,
    }


@router.post("/certificates/upload-bulk")
async def upload_certificates_bulk(
    request: Request,
    files: List[UploadFile] = File(None),
):
    """Admin: bulk-upload multiple certificate files at once. Each file's
    recipient email + title are read from the filename in the form
    '{email}__{title}.{ext}' (e.g. john.doe@college.edu__Workshop.pdf).
    Falls back to a generic title if no '__' separator is present. Files with
    names that can't be linked to an email are reported in 'errors'."""
    await _require_admin(request)
    files = files or []
    if not files:
        raise HTTPException(400, "at least one file is required")
    if len(files) > 200:
        raise HTTPException(400, "maximum 200 files per request")

    created = 0
    errors: List[Dict[str, str]] = []
    created_codes: List[Dict[str, str]] = []
    for f in files:
        if not f or not f.filename:
            errors.append({"filename": "", "error": "missing file"})
            continue
        name = f.filename
        stem = Path(name).stem
        email = None
        title = "Certificate"
        if "__" in stem:
            parts = stem.split("__", 1)
            email = parts[0].strip().lower()
            if parts[1].strip():
                title = parts[1].strip().replace("_", " ")
        elif "@" in stem:
            email = stem.split("__")[0].strip().lower()
        if not email or "@" not in email:
            errors.append({"filename": name, "error": "cannot derive recipient email from filename — use '{email}__{title}.{ext}'"})
            continue
        try:
            file_bytes = await f.read()
            url = await _save_cert_file(file_bytes, name)
        except HTTPException as e:
            errors.append({"filename": name, "error": e.detail})
            continue
        code = _gen_code()
        for _ in range(5):
            if not await db.certificates.find_one({"verification_code": code}):
                break
            code = _gen_code()
        await db.certificates.insert_one({
            "verification_code": code,
            "recipient_email": email,
            "recipient_name": await _recipient_name(email),
            "title": title,
            "issuer": "Student Alumni",
            "issuer_type": "platform",
            "file_url": url,
            "file_name": Path(name).name,
            "content_type": mimetypes.guess_type(url)[0] or "application/octet-stream",
            "issued_at": _now(),
            "created_at": _now(),
            "meta": {"source": "admin_bulk_upload"},
        })
        created += 1
        created_codes.append({"recipient_email": email, "verification_code": code, "title": title})
    return {"ok": True, "created": created, "errors": errors, "certificates": created_codes}


async def _recipient_name(email: str) -> str:
    user = await db.users.find_one({"email": email})
    if user and (user.get("full_name") or user.get("name")):
        return user.get("full_name") or user.get("name") or ""
    return email.split("@")[0].replace(".", " ").title()


# ── Lookup a recipient's certificates (used by profile page) ───────────────
@router.get("/certificates/recipient/{email}")
async def recipient_certificates(email: str):
    docs = await db.certificates.find(
        {"recipient_email": (email or "").strip().lower()},
        {"verification_code": 1, "title": 1, "issuer": 1, "issuer_type": 1,
         "issued_at": 1, "credential_url": 1, "file_url": 1, "file_name": 1},
    ).sort("issued_at", -1).to_list(200)
    out = []
    for d in docs:
        issued = d.get("issued_at")
        out.append({
            "verification_code": d.get("verification_code"),
            "title": d.get("title"),
            "issuer": d.get("issuer"),
            "issuer_type": d.get("issuer_type", "platform"),
            "issued_at": issued.isoformat() if hasattr(issued, "isoformat") else issued,
            "credential_url": d.get("credential_url"),
            "file_url": d.get("file_url"),
            "file_name": d.get("file_name"),
        })
    return {"certificates": out}
