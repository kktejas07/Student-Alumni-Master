"""
Super Admin — Imports module.

Bulk-import users from XLSX / XLS / CSV with automatic categorization.

Pipeline:
    1. Upload     → parse file in-memory, return preview + auto-mapped headers + per-row validation
    2. Categorize → apply the 6-rule cascade (mentor / masters / alumni / student)
    3. Commit     → upsert into `users` collection (email is the primary key,
                    linkedin_url as fallback). Categorized records flow into
                    the existing Students / Alumni / Mentors directory views
                    because they query `_db.users` by `role`.
    4. Audit      → every commit creates an `import_runs` record so the admin
                    can review history.

Categorization rules (applied in order, first match wins):
    1. experience_years ≥ 4                                                → mentor
    2. degree contains "Master/MBA/M.Tech/MA/MSc/MS/PG/Post Graduate"      → masters
    3. degree is Bachelor's AND experience ≥ 1 AND start date in past     → alumni
    4. headline/degree shows "Student/pursuing/future grad year/X year"   → student
    5. degree is Bachelor's AND no current education                       → alumni
    6. default                                                              → student

Internships (Intern / Internship / Trainee in designation) do NOT count.
"""
from pydantic import BaseModel
import io
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, File, Header, HTTPException, UploadFile, Query

load_dotenv()

router = APIRouter()

# Auto-onboard colleges from imports/manual-add
try:
    from admin_colleges import ensure_college  # type: ignore
except Exception:
    async def ensure_college(name: str, created_by: str = "import"):  # type: ignore
        return None

# ─── Mongo ─────────────────────────────────────────────────────────
_MONGO_URL = os.getenv("MONGO_URL") or "mongodb://localhost:27017"
_DB_NAME   = os.getenv("DB_NAME") or "career_platform"
from db import client as _client
_db        = _client[_DB_NAME]

# ─── Token / role helpers ──────────────────────────────────────────
try:
    import jwt  # PyJWT
    _JWT_SECRET = os.getenv("JWT_SECRET", "")
except Exception:
    jwt = None  # type: ignore
    _JWT_SECRET = ""


async def _resolve_user(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        if jwt is None:
            return None
        payload = jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None
    uid = payload.get("sub") or payload.get("user_id") or payload.get("id")
    if not uid:
        return None
    try:
        return await _db.users.find_one({"_id": ObjectId(uid)})
    except Exception:
        return await _db.users.find_one({"_id": uid})


async def _require_admin(authorization: Optional[str]) -> dict:
    user = await _resolve_user(authorization)
    if not user:
        raise HTTPException(401, "Not authenticated")
    role = (user.get("role") or "").lower()
    if role not in {"admin", "super_admin"}:
        raise HTTPException(403, "Super-admin role required")
    return user


# ─── Header mapping ────────────────────────────────────────────────
# Each target field → list of acceptable source header aliases (lowercased)
HEADER_MAP: Dict[str, List[str]] = {
    "first_name":           ["first name", "firstname", "given name", "fname", "f_name", "first", "candidate name", "full name", "name"],
    "last_name":            ["last name", "lastname", "surname", "family name", "lname", "l_name", "last"],
    "email":                ["email", "email address", "e-mail", "mail", "primary email", "email_id", "email id", "contact email"],
    "phone":                ["phone", "phone number", "mobile", "contact number", "mobile number", "whatsapp", "contact", "cell", "phone_no", "mobile_no", "tel"],
    "linkedin_url":         ["linkedin url", "linkedin", "profile url", "linkedin profile", "linkedin link", "social url", "linkedin profile url"],
    "college":              ["college / institution", "college", "institution", "institution name",
                             "education institution", "university", "school", "alma mater", "college name", "university name", "campus"],
    "education":            ["education", "academic background", "highest qualification"],
    "degree":               ["degree", "education degree", "qualification", "course", "program", "stream", "branch", "department", "major"],
    "graduation_year":      ["graduation year", "grad year", "year of graduation", "passout year", "pass out", "batch", "class of", "passing year", "yop", "passout"],
    "designation":          ["designation / job title", "designation", "current title",
                             "title", "job title", "role", "current role", "position", "occupation", "headline", "job role"],
    "company":              ["current company", "company", "employer", "organization", "organisation", "workplace", "firm", "company name"],
    "experience_years_raw": ["years of experience", "experience years", "experience",
                             "self reported experience", "yoe", "exp", "total experience", "total exp"],
    "location":             ["general location", "location", "city", "current city", "state", "address", "country", "current location"],
    "zip":                  ["zip", "zipcode", "zip code", "pin", "pincode", "postal code"],
    "headline":             ["headline", "tagline", "about", "bio", "summary", "profile summary"],
    "skills":               ["skills", "technical skills", "tech stack", "key skills", "expertise", "competencies", "technologies"],
    "date_applied":         ["date applied", "applied on", "import date"],
    "position_start_date":  ["current position start date", "position start date", "start date"],
    "category":             ["category", "user category", "type", "user type", "role category", "account type"],   # optional pre-label
}


def auto_map_headers(headers: List[str]) -> Dict[str, str]:
    """Return {source_header: target_field}. Source headers matched via exact or normalized tokens."""
    out: Dict[str, str] = {}
    for h in headers:
        if h is None:
            continue
        norm = str(h).strip().lower()
        clean = re.sub(r"[^a-z0-9]", "", norm)
        matched = False
        for target, aliases in HEADER_MAP.items():
            for alias in aliases:
                alias_clean = re.sub(r"[^a-z0-9]", "", alias)
                if norm == alias or clean == alias_clean:
                    out[h] = target
                    matched = True
                    break
            if matched:
                break
    return out


# ─── Helpers ───────────────────────────────────────────────────────
INTERN_RE   = re.compile(r"\b(intern|internship|trainee|apprentice)\b", re.I)
MASTERS_RE  = re.compile(r"\b(master|masters|mba|m\.tech|mtech|m\s*a|m\.a|msc|m\.sc|ms\b|pg\b|post[\s-]?graduate|phd|doctorate|ma\b)\b", re.I)
BACHELORS_RE = re.compile(r"\b(bachelor|b\.tech|btech|be\b|bcom|bba|ba\b|bsc|b\.sc|bpharm|bbm|b\.e)\b", re.I)
STUDENT_RE  = re.compile(r"\b(student|pursuing|currently studying|undergrad|undergraduate|engineering undergrad)\b", re.I)
YEAR_RE     = re.compile(r"\b(19|20)\d{2}\b")
CURRENT_YEAR = datetime.now(timezone.utc).year


def _is_missing(v) -> bool:
    if v is None:
        return True
    s = str(v).strip()
    return s in ("", "n/a", "na", "--", "-", "null", "none")


def _to_str(v) -> str:
    if _is_missing(v):
        return ""
    return str(v).strip()


def _norm_phone(v, location: str = "") -> str:
    s = _to_str(v)
    if not s:
        return ""
    s = re.sub(r"[\s\-\(\)]", "", s)
    if s.startswith("+"):
        return s
    digits = re.sub(r"\D", "", s)
    if not digits:
        return ""
    if digits.startswith("00"):
        return "+" + digits[2:]
    if digits.startswith("0") and len(digits) in (10, 11):
        digits = digits.lstrip("0")

    from core.whatsapp import detect_country_code
    cc = detect_country_code(location, default_country="91")

    if len(digits) == 10:
        return f"+{cc}{digits}"
    if len(digits) in (8, 9) and cc not in ("91", "1"):
        return f"+{cc}{digits}"

    return f"+{digits}"


def _norm_linkedin(v) -> str:
    s = _to_str(v)
    if not s:
        return ""
    if not s.startswith("http"):
        s = "https://" + s
    return s


def _norm_email(v) -> str:
    return _to_str(v).lower()


def _valid_email(v: str) -> bool:
    if not bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v)):
        return False
    from core.email_quality import reject_reason
    return reject_reason(v) is None


def _valid_linkedin(v: str) -> bool:
    if not v:
        return True  # optional
    return "linkedin.com/in/" in v.lower()


def _parse_years(v) -> Optional[float]:
    """Extract years from string like '3.5', '3 years', '3+ years', '1-2'."""
    if _is_missing(v):
        return None
    s = str(v).strip().lower()
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if not m:
        return None
    return float(m.group(1))


def _parse_date(v) -> Optional[datetime]:
    if _is_missing(v):
        return None
    if isinstance(v, datetime):
        return v
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y", "%b %Y", "%B %Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _extract_grad_year(headline: str, degree: str) -> Optional[int]:
    for src in (headline, degree):
        if not src:
            continue
        # "2027 Graduate", "MBA'24", "B.Tech (2025)", "Class of 2026"
        m = re.search(r"['\"]?(\d{2})\b", src)
        m4 = YEAR_RE.search(src)
        if m4:
            return int(m4.group(0))
        if m:
            yy = int(m.group(1))
            return 2000 + yy if yy < 60 else 1900 + yy
    return None


def _compute_experience(start_date: Optional[datetime], self_reported: Optional[float],
                        designation: str) -> Tuple[float, str]:
    """Returns (years, source) — source ∈ {'derived','self_reported','none'}."""
    # Internships excluded
    if designation and INTERN_RE.search(designation):
        return 0.0, "intern_excluded"
    if start_date:
        now = datetime.now(timezone.utc)
        sd = start_date if start_date.tzinfo else start_date.replace(tzinfo=timezone.utc)
        if sd > now:
            return 0.0, "future_start"
        months = (now.year - sd.year) * 12 + (now.month - sd.month)
        return round(months / 12.0, 2), "derived"
    if self_reported is not None:
        return float(self_reported), "self_reported"
    return 0.0, "none"


def categorize(row: dict) -> Tuple[str, str, bool]:
    """Apply the 6-rule cascade. Returns (category, rule_label, needs_review)."""
    degree   = _to_str(row.get("degree"))
    headline = _to_str(row.get("headline"))
    desig    = _to_str(row.get("designation"))
    exp      = float(row.get("experience_years") or 0.0)
    start    = row.get("position_start_date")
    grad_yr  = row.get("graduation_year")

    # Rule 1 — Mentor (≥4 yrs experience, internship excluded)
    if exp >= 4 and not (desig and INTERN_RE.search(desig)):
        return "mentor", "Rule 1 · ≥4 yrs experience", False

    # Rule 2 — Master's
    if degree and MASTERS_RE.search(degree):
        return "masters", "Rule 2 · Master's degree", False

    # Rule 3 — Alumni (Bachelor's + ≥1 yr exp + past start date)
    if degree and BACHELORS_RE.search(degree) and exp >= 1:
        is_past = isinstance(start, datetime) and start <= datetime.now(timezone.utc).replace(tzinfo=start.tzinfo) if (start and start.tzinfo) else (isinstance(start, datetime) and start <= datetime.now())
        if is_past or start is None and exp >= 1:
            return "alumni", "Rule 3 · Bachelor's + work experience", False

    # Rule 4 — Currently studying
    if STUDENT_RE.search(headline + " " + degree):
        return "student", "Rule 4 · Headline/degree indicates student", False
    if grad_yr and isinstance(grad_yr, int) and grad_yr >= CURRENT_YEAR:
        return "student", f"Rule 4 · Future graduation ({grad_yr})", False
    if start is None and exp == 0:
        return "student", "Rule 4 · No work history", False

    # Rule 5 — Bachelor's without current education in progress
    if degree and BACHELORS_RE.search(degree):
        return "alumni", "Rule 5 · Bachelor's without ongoing study", False

    # Both degree and headline missing → student + needs review
    if not degree and not headline:
        return "student", "Default · profile incomplete", True

    return "student", "Default · fallback", False


# ─── File parsing ──────────────────────────────────────────────────
def _find_header_row(rows: List[Any]) -> int:
    """Return index of the first row that looks like a header (contains 'email'
    plus at least one of name/phone/linkedin/headline/degree/college)."""
    for i, r in enumerate(rows[:20]):
        if not r:
            continue
        cells = [str(c).strip().lower() if c is not None else "" for c in r]
        if "email" in cells or "email address" in cells or "e-mail" in cells:
            other = {"first name", "last name", "phone", "phone number", "linkedin url",
                     "headline", "degree", "college", "college / institution",
                     "education degree", "designation", "designation / job title"}
            if any(c in other for c in cells):
                return i
    return 0


def parse_file(content: bytes, filename: str) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Returns (headers, rows[as dict using original headers]).

    Smart-detects:
      • multi-sheet workbooks → prefers a sheet that contains an Email-style header
      • leading title/blank rows → scans first 20 rows for the real header
      • PDF and DOCX files → extracts tabular records or structured contact rows
    """
    name = filename.lower()
    if name.endswith(".csv"):
        import csv
        text = content.decode("utf-8-sig", errors="replace")
        reader = csv.reader(io.StringIO(text))
        rows_raw = list(reader)
        if not rows_raw:
            return [], []
        hdr_idx = _find_header_row(rows_raw)
        headers = [str(h).strip() for h in rows_raw[hdr_idx]]
        data = rows_raw[hdr_idx + 1:]
        rows = [dict(zip(headers, [v for v in r])) for r in data if any(str(v).strip() for v in r)]
        return headers, rows

    if name.endswith(".xlsx") or name.endswith(".xls"):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)

        # Multi-sheet: try every sheet, prefer the one with the most data rows
        candidate: Tuple[int, List[str], List[Dict[str, Any]]] = (-1, [], [])
        for sn in wb.sheetnames:
            try:
                ws = wb[sn]
            except Exception:
                continue
            all_rows = list(ws.iter_rows(values_only=True))
            if not all_rows:
                continue
            hdr_idx = _find_header_row(all_rows)
            header_row = all_rows[hdr_idx]
            if header_row is None:
                continue
            headers = [str(h).strip() if h is not None else "" for h in header_row]
            # If the candidate header row has at least 3 mapped fields, accept this sheet
            mapped_count = len(auto_map_headers(headers))
            if mapped_count < 3:
                continue
            data_rows: List[Dict[str, Any]] = []
            for r in all_rows[hdr_idx + 1:]:
                if all(v is None or str(v).strip() == "" for v in r):
                    continue
                data_rows.append(dict(zip(headers, r)))
            if len(data_rows) > candidate[0]:
                candidate = (len(data_rows), headers, data_rows)

        if candidate[0] > 0:
            return candidate[1], candidate[2]

        # Fallback: first sheet, no header detection
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        try:
            first = next(rows_iter)
        except StopIteration:
            return [], []
        headers = [str(h).strip() if h is not None else "" for h in first]
        rows: List[Dict[str, Any]] = []
        for r in rows_iter:
            if all(v is None or str(v).strip() == "" for v in r):
                continue
            rows.append(dict(zip(headers, r)))
        return headers, rows

    if name.endswith(".docx") or name.endswith(".doc"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            all_rows = []
            # First look for tables
            for table in doc.tables:
                for row in table.rows:
                    cells = [cell.text.strip() for cell in row.cells]
                    if any(cells):
                        all_rows.append(cells)
            if all_rows:
                hdr_idx = _find_header_row(all_rows)
                headers = [str(h).strip() for h in all_rows[hdr_idx]]
                data = all_rows[hdr_idx + 1:]
                rows = [dict(zip(headers, r)) for r in data if any(str(v).strip() for v in r)]
                return headers, rows
        except Exception as e:
            print(f"[Import] docx parse error: {e}")

    if name.endswith(".pdf"):
        try:
            import fitz  # pymupdf
            doc = fitz.open(stream=content, filetype="pdf")
            all_rows = []
            for page in doc:
                tabs = page.find_tables()
                if tabs.tables:
                    for tab in tabs.tables:
                        extracted = tab.extract()
                        for row in extracted:
                            if any(row):
                                all_rows.append([str(c or "").strip() for c in row])
            if all_rows:
                hdr_idx = _find_header_row(all_rows)
                headers = [str(h).strip() for h in all_rows[hdr_idx]]
                data = all_rows[hdr_idx + 1:]
                rows = [dict(zip(headers, r)) for r in data if any(str(v).strip() for v in r)]
                return headers, rows
        except Exception as e:
            print(f"[Import] pdf parse error: {e}")

    raise HTTPException(400, "Unsupported file type. Use .xlsx, .xls, .csv, .pdf, or .docx")


# ─── Row → user transform ──────────────────────────────────────────
def transform_row(raw: dict, mapping: Dict[str, str]) -> Dict[str, Any]:
    """Apply header-mapping, normalize values, compute derived fields, categorize."""
    mapped: Dict[str, Any] = {}
    for src, tgt in mapping.items():
        mapped[tgt] = raw.get(src)

    first_name = _to_str(mapped.get("first_name"))
    last_name  = _to_str(mapped.get("last_name"))
    full_name  = (first_name + " " + last_name).strip() or "—"

    location   = _to_str(mapped.get("location"))
    email      = _norm_email(mapped.get("email"))
    phone      = _norm_phone(mapped.get("phone"), location=location)
    linkedin   = _norm_linkedin(mapped.get("linkedin_url"))
    college    = _to_str(mapped.get("college"))
    degree     = _to_str(mapped.get("degree"))
    designation= _to_str(mapped.get("designation"))
    company    = _to_str(mapped.get("company"))
    headline   = _to_str(mapped.get("headline"))
    grad_year  = mapped.get("graduation_year")
    if grad_year and not isinstance(grad_year, int):
        try: grad_year = int(re.sub(r"\D", "", str(grad_year))[:4] or 0) or None
        except: grad_year = None
    if not grad_year:
        grad_year = _extract_grad_year(headline, degree)

    start_date = _parse_date(mapped.get("position_start_date"))
    self_exp   = _parse_years(mapped.get("experience_years_raw"))
    exp_years, exp_source = _compute_experience(start_date, self_exp, designation)

    row_for_cat = {
        "degree": degree, "headline": headline, "designation": designation,
        "experience_years": exp_years, "position_start_date": start_date,
        "graduation_year": grad_year,
    }
    category, rule_label, needs_review = categorize(row_for_cat)

    # Profile status
    required = [first_name or last_name, email, college or degree or headline]
    filled = sum(1 for r in required if r)
    if filled == len(required) and (designation or headline or degree):
        profile_status = "complete"
    elif filled >= 2:
        profile_status = "partial"
    else:
        profile_status = "incomplete"

    # Role mapping (so existing Students / Alumni / Mentors views auto-pick up)
    role_map = {"mentor": "mentor", "masters": "student", "alumni": "alumni", "student": "student"}

    return {
        "full_name":       full_name,
        "first_name":      first_name,
        "last_name":       last_name,
        "email":           email,
        "phone":           phone,
        "linkedin_url":    linkedin,
        "college":         college,
        "school_info":     {"institution_name": college, "branch_or_stream": degree},
        "degree":          degree,
        "graduation_year": grad_year,
        "designation":     designation,
        "company":         company,
        "experience_years": exp_years,
        "experience_source": exp_source,
        "position_start_date": start_date,
        "location":        location,
        "headline":        headline,
        "category":        category,
        "category_rule":   rule_label,
        "needs_review":    needs_review,
        "profile_status":  profile_status,
        "role":            role_map[category],
        # Tag every imported user so we can filter/audit later
        "imported":        True,
    }


def validate_row(row: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    if not (row.get("first_name") or row.get("last_name")):
        errors.append("Name required (first or last)")
    if not row.get("email"):
        errors.append("Email required")
    elif not _valid_email(row["email"]):
        errors.append("Invalid email format")
    if row.get("linkedin_url") and not _valid_linkedin(row["linkedin_url"]):
        errors.append("LinkedIn URL must contain 'linkedin.com/in/'")
    return errors


# ─── API ───────────────────────────────────────────────────────────
@router.post("/admin/imports/upload")
async def upload_file(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """Parse file, return preview + auto-mapped headers + per-row validation report."""
    await _require_admin(authorization)
    content = await file.read()
    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(content)
    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(413, "File exceeds 500 MB limit")

    headers, rows = parse_file(content, file.filename or "upload.xlsx")
    if not rows:
        raise HTTPException(400, "File contains no data rows")

    mapping = auto_map_headers(headers)
    # Transform first 200 rows for preview/validation
    preview_rows = []
    counts = {"student": 0, "masters": 0, "alumni": 0, "mentor": 0, "errors": 0, "needs_review": 0}
    for idx, raw in enumerate(rows[:200]):
        try:
            transformed = transform_row(raw, mapping)
            errors = validate_row(transformed)
            if errors: counts["errors"] += 1
            if transformed.get("needs_review"): counts["needs_review"] += 1
            counts[transformed["category"]] = counts.get(transformed["category"], 0) + 1
            # Serialize datetime for JSON
            if isinstance(transformed.get("position_start_date"), datetime):
                transformed["position_start_date"] = transformed["position_start_date"].isoformat()
            preview_rows.append({"row": idx + 2, **transformed, "errors": errors})
        except Exception as e:
            counts["errors"] += 1
            preview_rows.append({"row": idx + 2, "errors": [f"Parse error: {e}"]})

    # Pre-flight impact calculation on preview batch
    emails_to_check = [r.get("email") for r in preview_rows if r.get("email") and not r.get("errors")]
    existing_emails = set()
    if emails_to_check:
        cursor = _db.users.find({"email": {"$in": emails_to_check}}, {"email": 1})
        async for doc in cursor:
            if doc.get("email"):
                existing_emails.add(doc["email"].lower())
    
    preflight_updates = sum(1 for r in preview_rows if (r.get("email") or "").lower() in existing_emails and not r.get("errors"))
    preflight_valid = len(preview_rows) - counts["errors"]
    preflight_new = max(0, preflight_valid - preflight_updates)

    preflight_stats = {
        "new_count": preflight_new,
        "update_count": preflight_updates,
        "invalid_count": counts["errors"],
        "valid_count": preflight_valid,
        "total_preview": len(preview_rows),
    }

    # Cache the full parsed content so /import doesn't re-upload
    cache_id = str(ObjectId())
    await _db.import_cache.insert_one({
        "_id": ObjectId(cache_id),
        "filename": file.filename,
        "headers": headers,
        "mapping": mapping,
        "rows": rows,
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "cache_id": cache_id,
        "filename": file.filename,
        "total_rows": len(rows),
        "preview_count": len(preview_rows),
        "headers": headers,
        "available_targets": list(HEADER_MAP.keys()),
        "auto_mapping": mapping,
        "preview": preview_rows,
        "summary": counts,
        "preflight": preflight_stats,
    }


class CommitBody(BaseModel):
    cache_id: str
    mapping: Optional[Dict[str, str]] = None  # admin override
    skip_invalid: bool = True
    on_duplicate: str = "update"  # "update" | "skip"


@router.post("/admin/imports/commit")
async def commit_import(body: CommitBody, authorization: Optional[str] = Header(None)):
    """Upsert rows from cached upload into `users` collection."""
    user = await _require_admin(authorization)
    cache = await _db.import_cache.find_one({"_id": ObjectId(body.cache_id)})
    if not cache:
        raise HTTPException(404, "Upload cache expired — please re-upload")

    mapping = body.mapping or cache.get("mapping") or {}
    rows = cache.get("rows") or []

    added, updated, skipped = 0, 0, 0
    skipped_rows: List[Dict[str, Any]] = []
    cat_counts = {"student": 0, "masters": 0, "alumni": 0, "mentor": 0}

    for idx, raw in enumerate(rows):
        try:
            row = transform_row(raw, mapping)
            errors = validate_row(row)
            if errors:
                if body.skip_invalid:
                    skipped += 1
                    skipped_rows.append({"row": idx + 2, "email": row.get("email"),
                                         "reason": "; ".join(errors)})
                    continue
                else:
                    raise HTTPException(400, f"Row {idx + 2}: {'; '.join(errors)}")

            # Duplicate by email then linkedin_url
            existing = None
            if row["email"]:
                existing = await _db.users.find_one({"email": row["email"]})
            if not existing and row.get("linkedin_url"):
                existing = await _db.users.find_one({"linkedin_url": row["linkedin_url"]})

            if existing and body.on_duplicate == "skip":
                skipped += 1
                skipped_rows.append({"row": idx + 2, "email": row.get("email"), "reason": "Duplicate (skipped per setting)"})
                continue

            row["updated_at"] = datetime.now(timezone.utc)
            if existing:
                await _db.users.update_one({"_id": existing["_id"]}, {"$set": row})
                updated += 1
            else:
                # Auto-revert: if archived snapshot exists for this email/linkedin,
                # restore it (preserve old goals/progress/tags/etc.) and merge new data on top.
                archived = await _try_restore_archived(row.get("email", ""), row.get("linkedin_url", ""))
                if archived:
                    archived.update(row)
                    archived["updated_at"] = datetime.now(timezone.utc)
                    res_ins = await _db.users.insert_one(archived)
                    updated += 1  # treat as updated since data existed before
                    cat_counts[archived.get("category", "student")] = cat_counts.get(archived.get("category", "student"), 0) + 1
                    continue
                row["created_at"] = datetime.now(timezone.utc)
                row["created_by"] = "import"
                row["approved"] = False
                await _db.users.insert_one(row)
                added += 1

            # Auto-sync to talent_pool collection for unified metrics
            try:
                tp_doc = {
                    "full_name": row.get("full_name"),
                    "headline": row.get("headline") or row.get("designation"),
                    "email": row.get("email"),
                    "phone": row.get("phone"),
                    "linkedin_url": row.get("linkedin_url"),
                    "location": row.get("location"),
                    "skills": [s.strip() for s in (row.get("skills") or "").split(",") if s.strip()] if isinstance(row.get("skills"), str) else (row.get("skills") or []),
                    "experience_years": row.get("experience_years"),
                    "current_company": row.get("company"),
                    "current_role": row.get("designation"),
                    "education": row.get("college") or row.get("degree"),
                    "graduation_year": row.get("graduation_year"),
                    "source": "import",
                    "is_active": True,
                    "imported_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
                if row.get("email"):
                    await _db.talent_pool.update_one({"email": row["email"]}, {"$set": tp_doc}, upsert=True)
                elif row.get("linkedin_url"):
                    await _db.talent_pool.update_one({"linkedin_url": row["linkedin_url"]}, {"$set": tp_doc}, upsert=True)
            except Exception as e:
                print(f"[Import] talent_pool sync warning: {e}")

            # Auto-onboard college (idempotent, async enrichment)
            if row.get("college"):
                try: await ensure_college(row["college"], created_by="import")
                except Exception: pass
            cat_counts[row["category"]] = cat_counts.get(row["category"], 0) + 1
        except HTTPException:
            raise
        except Exception as e:
            skipped += 1
            skipped_rows.append({"row": idx + 2, "reason": f"Error: {e}"})

    run = {
        "filename":  cache.get("filename"),
        "added":     added,
        "updated":   updated,
        "skipped":   skipped,
        "total":     len(rows),
        "by_category": cat_counts,
        "skipped_rows": skipped_rows[:200],
        "by_user":   str(user["_id"]),
        "by_name":   user.get("full_name") or user.get("email"),
        "at":        datetime.now(timezone.utc),
    }
    res = await _db.import_runs.insert_one(run)

    # Drop cache after commit
    await _db.import_cache.delete_one({"_id": ObjectId(body.cache_id)})

    return {
        "ok": True,
        "run_id": str(res.inserted_id),
        "added": added,
        "updated": updated,
        "skipped": skipped,
        "by_category": cat_counts,
        "skipped_rows": skipped_rows,
    }


# ─── Manual add ────────────────────────────────────────────────────
class ManualUser(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    designation: Optional[str] = None
    company: Optional[str] = None
    experience_years_raw: Optional[str] = None
    position_start_date: Optional[str] = None
    location: Optional[str] = None
    headline: Optional[str] = None


@router.post("/admin/imports/manual")
async def manual_add(body: ManualUser, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    raw = body.dict()
    mapping = {k: k for k in raw.keys()}
    row = transform_row(raw, mapping)
    errors = validate_row(row)
    if errors:
        raise HTTPException(400, "; ".join(errors))

    existing = await _db.users.find_one({"email": row["email"]})
    row["updated_at"] = datetime.now(timezone.utc)
    if existing:
        await _db.users.update_one({"_id": existing["_id"]}, {"$set": row})
        return {"ok": True, "action": "updated", "id": str(existing["_id"]),
                "category": row["category"], "rule": row["category_rule"]}
    # Auto-revert: same email/linkedin in archive → restore
    archived = await _try_restore_archived(row.get("email", ""), row.get("linkedin_url", ""))
    if archived:
        archived.update(row)
        archived["updated_at"] = datetime.now(timezone.utc)
        res = await _db.users.insert_one(archived)
        return {"ok": True, "action": "restored", "id": str(res.inserted_id),
                "category": archived.get("category"), "rule": archived.get("category_rule")}
    row["created_at"] = datetime.now(timezone.utc)
    row["created_by"] = "manual"
    row["approved"] = False
    res = await _db.users.insert_one(row)
    try:
        tp_doc = {
            "full_name": row.get("full_name"),
            "headline": row.get("headline") or row.get("designation"),
            "email": row.get("email"),
            "phone": row.get("phone"),
            "linkedin_url": row.get("linkedin_url"),
            "location": row.get("location"),
            "skills": [s.strip() for s in (row.get("skills") or "").split(",") if s.strip()] if isinstance(row.get("skills"), str) else (row.get("skills") or []),
            "experience_years": row.get("experience_years"),
            "current_company": row.get("company"),
            "current_role": row.get("designation"),
            "education": row.get("college") or row.get("degree"),
            "graduation_year": row.get("graduation_year"),
            "source": "manual",
            "is_active": True,
            "imported_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        if row.get("email"):
            await _db.talent_pool.update_one({"email": row["email"]}, {"$set": tp_doc}, upsert=True)
    except Exception:
        pass
    if row.get("college"):
        try: await ensure_college(row["college"], created_by="manual")
        except Exception: pass
    return {"ok": True, "action": "added", "id": str(res.inserted_id),
            "category": row["category"], "rule": row["category_rule"]}


@router.post("/admin/imports/preview-category")
async def preview_category(body: ManualUser, authorization: Optional[str] = Header(None)):
    """Live preview — used by Manual Add form as the admin types."""
    await _require_admin(authorization)
    raw = body.dict()
    mapping = {k: k for k in raw.keys()}
    row = transform_row(raw, mapping)
    return {
        "category": row["category"],
        "rule": row["category_rule"],
        "experience_years": row["experience_years"],
        "experience_source": row["experience_source"],
        "profile_status": row["profile_status"],
        "needs_review": row["needs_review"],
        "role": row["role"],
    }


# ─── History ───────────────────────────────────────────────────────
@router.get("/admin/imports/runs")
async def list_runs(authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    cur = _db.import_runs.find({}).sort("at", -1).limit(50)
    out = []
    async for r in cur:
        out.append({
            "id": str(r["_id"]),
            "filename": r.get("filename"),
            "added": r.get("added", 0),
            "updated": r.get("updated", 0),
            "skipped": r.get("skipped", 0),
            "total": r.get("total", 0),
            "by_category": r.get("by_category") or {},
            "by_name": r.get("by_name"),
            "at": (r.get("at") or datetime.now(timezone.utc)).isoformat(),
        })
    return {"runs": out}


@router.get("/admin/imports/runs/{run_id}")
async def run_detail(run_id: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    r = await _db.import_runs.find_one({"_id": ObjectId(run_id)})
    if not r:
        raise HTTPException(404, "Run not found")
    return {
        "id": str(r["_id"]),
        "filename": r.get("filename"),
        "added": r.get("added", 0),
        "updated": r.get("updated", 0),
        "skipped": r.get("skipped", 0),
        "total": r.get("total", 0),
        "by_category": r.get("by_category") or {},
        "skipped_rows": r.get("skipped_rows") or [],
        "by_name": r.get("by_name"),
        "at": (r.get("at") or datetime.now(timezone.utc)).isoformat(),
    }


# ─── Profile detail (used by detail side panel) ────────────────────
@router.get("/admin/users/profile/{user_id}")
async def get_profile(user_id: str, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "Invalid user id")
    u = await _db.users.find_one({"_id": oid})
    if not u:
        raise HTTPException(404, "User not found")
    return {
        "id": str(u["_id"]),
        "first_name": u.get("first_name") or "",
        "last_name":  u.get("last_name") or "",
        "full_name":  u.get("full_name") or "",
        "email":      u.get("email"),
        "phone":      u.get("phone"),
        "linkedin_url": u.get("linkedin_url"),
        "college":    u.get("college") or (u.get("school_info") or {}).get("institution_name"),
        "degree":     u.get("degree"),
        "graduation_year": u.get("graduation_year"),
        "designation": u.get("designation"),
        "company":     u.get("company"),
        "experience_years": u.get("experience_years"),
        "location":   u.get("location"),
        "headline":   u.get("headline"),
        "category":   u.get("category") or u.get("role") or "student",
        "category_rule": u.get("category_rule"),
        "profile_status": u.get("profile_status") or "complete",
        "needs_review": u.get("needs_review", False),
        "role":       u.get("role"),
        "created_at": (u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else None),
    }


class PatchUser(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    designation: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    headline: Optional[str] = None
    category: Optional[str] = None  # manual override


@router.patch("/admin/users/profile/{user_id}")
async def patch_profile(user_id: str, body: PatchUser, authorization: Optional[str] = Header(None)):
    await _require_admin(authorization)
    try: oid = ObjectId(user_id)
    except Exception: raise HTTPException(400, "Invalid user id")
    update = {k: v for k, v in body.dict().items() if v is not None}
    if update.get("category"):
        role_map = {"mentor": "mentor", "masters": "student", "alumni": "alumni", "student": "student"}
        update["role"] = role_map.get(update["category"], "student")
        update["category_rule"] = "Manual override"
    if update.get("phone"):
        update["phone"] = _norm_phone(update["phone"])
    if update.get("linkedin_url"):
        update["linkedin_url"] = _norm_linkedin(update["linkedin_url"])
    update["updated_at"] = datetime.now(timezone.utc)
    if "first_name" in update or "last_name" in update:
        u = await _db.users.find_one({"_id": oid}) or {}
        fn = update.get("first_name", u.get("first_name", ""))
        ln = update.get("last_name", u.get("last_name", ""))
        update["full_name"] = (fn + " " + ln).strip()
    await _db.users.update_one({"_id": oid}, {"$set": update})
    return {"ok": True}


@router.delete("/admin/users/profile/{user_id}")
async def delete_profile(user_id: str, authorization: Optional[str] = Header(None)):
    """Soft-delete: move user to `users_archive` so the record can be auto-
    restored if the same email/LinkedIn reappears in a future import."""
    user = await _require_admin(authorization)
    try: oid = ObjectId(user_id)
    except Exception: raise HTTPException(400, "Invalid user id")
    u = await _db.users.find_one({"_id": oid})
    if not u:
        return {"ok": True, "removed": 0}
    u["archived_at"] = datetime.now(timezone.utc)
    u["archived_by"] = str(user["_id"])
    # Insert into archive collection (preserving the original _id under archived_user_id)
    archive_doc = dict(u)
    archive_doc["archived_user_id"] = str(u["_id"])
    archive_doc.pop("_id", None)
    await _db.users_archive.insert_one(archive_doc)
    res = await _db.users.delete_one({"_id": oid})
    return {"ok": True, "removed": res.deleted_count, "archived": True}


@router.post("/admin/users/profile/{user_id}/approve")
async def approve_profile(user_id: str, authorization: Optional[str] = Header(None)):
    user = await _require_admin(authorization)
    try: oid = ObjectId(user_id)
    except Exception: raise HTTPException(400, "Invalid user id")
    await _db.users.update_one(
        {"_id": oid},
        {"$set": {
            "approved": True,
            "approved_at": datetime.now(timezone.utc),
            "approved_by": str(user["_id"]),
            "profile_status": "complete",
            "disabled": False,
        }},
    )
    return {"ok": True, "approved": True}


@router.post("/admin/users/profile/{user_id}/disable")
async def disable_profile(user_id: str, authorization: Optional[str] = Header(None)):
    """Disable an approved user — keep the record visible but mark inactive."""
    user = await _require_admin(authorization)
    try: oid = ObjectId(user_id)
    except Exception: raise HTTPException(400, "Invalid user id")
    await _db.users.update_one(
        {"_id": oid},
        {"$set": {
            "disabled": True,
            "approved": False,
            "disabled_at": datetime.now(timezone.utc),
            "disabled_by": str(user["_id"]),
        }},
    )
    return {"ok": True, "disabled": True}


@router.post("/admin/users/profile/{user_id}/restore")
async def restore_profile(user_id: str, authorization: Optional[str] = Header(None)):
    """Restore either a disabled user or one from `users_archive`."""
    await _require_admin(authorization)
    try: oid = ObjectId(user_id)
    except Exception: raise HTTPException(400, "Invalid user id")
    # Live user? Just re-enable.
    live = await _db.users.find_one({"_id": oid})
    if live:
        await _db.users.update_one(
            {"_id": oid},
            {"$set": {
                "disabled": False, "approved": True,
                "restored_at": datetime.now(timezone.utc),
            }},
        )
        return {"ok": True, "status": "re-enabled"}
    # Otherwise, pull back from archive
    arch = await _db.users_archive.find_one({"_id": oid})
    if not arch:
        # Try by archived_user_id (older docs)
        arch = await _db.users_archive.find_one({"archived_user_id": user_id})
    if not arch:
        raise HTTPException(404, "User not found in live records or archive")
    arch.pop("_id", None)
    arch["restored_at"] = datetime.now(timezone.utc)
    arch["disabled"] = False
    arch["approved"] = True
    res = await _db.users.insert_one(arch)
    await _db.users_archive.delete_one({"archived_user_id": user_id})
    return {"ok": True, "status": "restored", "id": str(res.inserted_id)}


async def _try_restore_archived(email: str, linkedin_url: str) -> Optional[dict]:
    """If the given email or LinkedIn matches an archived user, restore the
    archive snapshot and return its fields (caller will merge with new data)."""
    if not email and not linkedin_url:
        return None
    q: List[dict] = []
    if email:        q.append({"email":        email})
    if linkedin_url: q.append({"linkedin_url": linkedin_url})
    arch = await _db.users_archive.find_one({"$or": q})
    if not arch:
        return None
    # Delete the archive record (it will be re-inserted into users)
    await _db.users_archive.delete_one({"_id": arch["_id"]})
    arch.pop("_id", None)
    arch["restored_at"] = datetime.now(timezone.utc)
    return arch


# ─── Inline Cell & Bulk Operations ──────────────────────────────────
class InlineUpdateBody(BaseModel):
    user_id: str
    field: str
    value: Any


@router.post("/admin/users/inline-update")
async def inline_update_user(body: InlineUpdateBody, authorization: Optional[str] = Header(None)):
    """Update a single field directly from spreadsheet view."""
    await _require_admin(authorization)
    allowed_fields = {
        "first_name", "last_name", "full_name", "name", "designation", "company",
        "location", "phone", "email", "degree", "graduation_year", "experience_years",
        "headline", "category", "college"
    }
    if body.field not in allowed_fields:
        raise HTTPException(400, f"Field '{body.field}' cannot be updated inline")
    
    try:
        oid = ObjectId(body.user_id)
    except Exception:
        raise HTTPException(400, "Invalid user ID")

    update_data: Dict[str, Any] = {
        body.field: body.value,
        "updated_at": datetime.now(timezone.utc),
    }
    if body.field in ("first_name", "last_name"):
        doc = await _db.users.find_one({"_id": oid})
        if doc:
            fn = body.value if body.field == "first_name" else (doc.get("first_name") or "")
            ln = body.value if body.field == "last_name" else (doc.get("last_name") or "")
            update_data["full_name"] = f"{fn} {ln}".strip()
            update_data["name"] = update_data["full_name"]

    res = await _db.users.update_one({"_id": oid}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")

    # Mirror to talent pool if applicable
    try:
        user_doc = await _db.users.find_one({"_id": oid})
        if user_doc and user_doc.get("email"):
            tp_field_map = {
                "designation": "current_role",
                "company": "current_company",
                "full_name": "full_name",
                "name": "full_name",
                "location": "location",
                "phone": "phone",
                "headline": "headline"
            }
            if body.field in tp_field_map:
                await _db.talent_pool.update_one(
                    {"email": user_doc["email"]},
                    {"$set": {tp_field_map[body.field]: body.value, "updated_at": datetime.now(timezone.utc)}}
                )
    except Exception:
        pass

    return {"ok": True, "field": body.field, "value": body.value}


class BulkActionBody(BaseModel):
    user_ids: List[str]


@router.post("/admin/users/bulk/approve")
async def bulk_approve_users(body: BulkActionBody, authorization: Optional[str] = Header(None)):
    """Approve multiple imported/pending users at once."""
    await _require_admin(authorization)
    oids = []
    for uid in body.user_ids:
        try: oids.append(ObjectId(uid))
        except Exception: pass
    if not oids:
        raise HTTPException(400, "No valid user IDs provided")
    now = datetime.now(timezone.utc)
    res = await _db.users.update_many(
        {"_id": {"$in": oids}},
        {"$set": {"approved": True, "approved_at": now, "updated_at": now}}
    )
    return {"ok": True, "modified_count": res.modified_count}


class BulkDeleteBody(BaseModel):
    user_ids: List[str]
    permanent: bool = False


@router.post("/admin/users/bulk/delete")
async def bulk_delete_users(body: BulkDeleteBody, authorization: Optional[str] = Header(None)):
    """Batch delete or archive users."""
    await _require_admin(authorization)
    oids = []
    for uid in body.user_ids:
        try: oids.append(ObjectId(uid))
        except Exception: pass
    if not oids:
        raise HTTPException(400, "No valid user IDs provided")
    if body.permanent:
        res = await _db.users.delete_many({"_id": {"$in": oids}})
        return {"ok": True, "deleted_count": res.deleted_count}
    else:
        res = await _db.users.update_many(
            {"_id": {"$in": oids}},
            {"$set": {"archived": True, "is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        return {"ok": True, "archived_count": res.modified_count}


class BulkTagBody(BaseModel):
    user_ids: List[str]
    tag: str
    action: str = "add"


@router.post("/admin/users/bulk/tag")
async def bulk_tag_users(body: BulkTagBody, authorization: Optional[str] = Header(None)):
    """Add or remove a tag across selected users."""
    await _require_admin(authorization)
    oids = []
    for uid in body.user_ids:
        try: oids.append(ObjectId(uid))
        except Exception: pass
    if not oids:
        raise HTTPException(400, "No valid user IDs provided")
    clean_tag = body.tag.strip()
    if not clean_tag:
        raise HTTPException(400, "Tag cannot be empty")
    now = datetime.now(timezone.utc)
    if body.action == "remove":
        res = await _db.users.update_many(
            {"_id": {"$in": oids}},
            {"$pull": {"tags": clean_tag}, "$set": {"updated_at": now}}
        )
    else:
        res = await _db.users.update_many(
            {"_id": {"$in": oids}},
            {"$addToSet": {"tags": clean_tag}, "$set": {"updated_at": now}}
        )
    return {"ok": True, "modified_count": res.modified_count, "tag": clean_tag}


@router.post("/admin/users/bulk/invite")
async def bulk_invite_users(body: BulkActionBody, authorization: Optional[str] = Header(None)):
    """Send branded onboarding/activation email to selected users."""
    await _require_admin(authorization)
    from core.email import send_email, render_html_email
    oids = []
    for uid in body.user_ids:
        try: oids.append(ObjectId(uid))
        except Exception: pass
    if not oids:
        raise HTTPException(400, "No valid user IDs provided")
    
    users = await _db.users.find({"_id": {"$in": oids}}).to_list(length=1000)
    sent_count = 0
    now = datetime.now(timezone.utc)

    for u in users:
        email = u.get("email")
        if not email or "@" not in email:
            continue
        first_name = u.get("first_name") or u.get("name") or "there"
        cat = (u.get("category") or "member").capitalize()
        portal_url = os.getenv("FRONTEND_URL") or "https://studentalumni.ai"
        claim_url = f"{portal_url}/auth?mode=claim&email={email}"
        
        email_content = f"""
        <h2 style="color: #1E293B; margin-top: 0; font-size: 20px;">Welcome to Student Alumni Platform, {first_name}!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            You have been invited to the <strong>Student Alumni Network</strong> as a <strong>{cat}</strong>.
        </p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Connect with verified alumni, explore mentoring opportunities, discover career pathways, and unlock exclusive campus networks.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{claim_url}" style="background: linear-gradient(135deg, #7C3AED, #5B21B6); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">
                Activate Your Profile
            </a>
        </div>
        <p style="color: #94A3B8; font-size: 13px; line-height: 1.5; text-align: center;">
            Or copy and paste this link in your browser:<br/>
            <span style="color: #6366F1; word-break: break-all;">{claim_url}</span>
        </p>
        """
        html = render_html_email(email_content)
        subject = f"Activate Your Profile on Student Alumni — {cat} Access"
        try:
            await send_email(email, subject, html)
            sent_count += 1
            await _db.users.update_one(
                {"_id": u["_id"]},
                {"$set": {"invite_sent_at": now, "invite_status": "sent", "updated_at": now}}
            )
        except Exception as e:
            print(f"[Invite] error sending to {email}: {e}")

    return {"ok": True, "sent_count": sent_count, "total_requested": len(body.user_ids)}


class BulkPushToTalentBody(BaseModel):
    user_ids: List[str]
    skills: Optional[List[str]] = None


@router.post("/admin/users/bulk/push-to-talent")
async def bulk_push_to_talent_pool(body: BulkPushToTalentBody, authorization: Optional[str] = Header(None)):
    """Bridge selected directory users directly into the talent pool."""
    await _require_admin(authorization)
    oids = []
    for uid in body.user_ids:
        try: oids.append(ObjectId(uid))
        except Exception: pass
    if not oids:
        raise HTTPException(400, "No valid user IDs provided")
    
    users = await _db.users.find({"_id": {"$in": oids}}).to_list(length=1000)
    synced_count = 0
    now = datetime.now(timezone.utc)

    for u in users:
        skills = list(body.skills or [])
        if isinstance(u.get("skills"), list):
            skills = list(set(skills + u["skills"]))
        elif isinstance(u.get("skills"), str):
            skills = list(set(skills + [s.strip() for s in u["skills"].split(",") if s.strip()]))
            
        tp_doc = {
            "full_name": u.get("full_name") or u.get("name") or f"{u.get('first_name','')} {u.get('last_name','')}".strip(),
            "headline": u.get("headline") or u.get("designation"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "linkedin_url": u.get("linkedin_url"),
            "location": u.get("location"),
            "skills": skills,
            "experience_years": u.get("experience_years"),
            "current_company": u.get("company"),
            "current_role": u.get("designation"),
            "education": u.get("college") or u.get("degree"),
            "graduation_year": u.get("graduation_year"),
            "source": "platform_import",
            "source_platform_user_id": str(u["_id"]),
            "is_active": True,
            "imported_at": now,
            "updated_at": now,
        }
        if u.get("email"):
            await _db.talent_pool.update_one({"email": u["email"]}, {"$set": tp_doc}, upsert=True)
            synced_count += 1
        elif u.get("linkedin_url"):
            await _db.talent_pool.update_one({"linkedin_url": u["linkedin_url"]}, {"$set": tp_doc}, upsert=True)
            synced_count += 1

    return {"ok": True, "synced_count": synced_count}


# ─── Filtered user list (for dashboard tabs / search / spreadsheet grid) ──────────────
def format_e164_phone(phone: str, location: str = "") -> str:
    """Format phone number with country code prefix (+91 for India, +1 for US/Canada, etc.)."""
    if not phone:
        return ""
    p = str(phone).strip()
    if p.startswith("+"):
        return "+" + "".join(c for c in p[1:] if c.isdigit())

    digits = "".join(c for c in p if c.isdigit())
    if not digits:
        return ""

    loc_upper = (location or "").upper()
    is_us = any(k in loc_upper for k in ["USA", "UNITED STATES", "NEW JERSEY", "NJ", "CALIFORNIA", "CA", "NEW YORK", "NY", "CANADA"])

    if len(digits) == 10:
        if is_us:
            return f"+1{digits}"
        else:
            return f"+91{digits}"
    elif len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    elif len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"

    return f"+{digits}"


@router.get("/admin/users/list")
async def list_users(
    category: Optional[str] = None,
    account_filter: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = 24,
    offset: int = 0,
    authorization: Optional[str] = Header(None),
):
    """Return users matching category/search, enriched with completeness & account stats,
    pulling seamlessly from `users`, `contacts`, and `college_students` collections."""
    await _require_admin(authorization)
    
    # Handle page vs offset
    if offset > 0 and page == 1:
        skip = offset
    else:
        skip = (page - 1) * limit

    cat = (category or "all").lower()
    
    rx_cat = {"$regex": f"^{cat}$", "$options": "i"} if cat != "all" else None
    rx_tag = {"$regex": cat, "$options": "i"} if cat != "all" else None

    # 1. Fetch from db.users
    user_query: Dict[str, Any] = {"archived": {"$ne": True}}
    if cat != "all":
        if cat == "student":
            user_query["$or"] = [
                {"category": rx_cat},
                {"role": rx_cat},
                {"tags": rx_tag},
                {"role": {"$nin": ["mentor", "alumni", "college", "admin", "superadmin"]}},
                {"category": None},
                {"role": None}
            ]
        elif cat == "masters":
            user_query["$or"] = [
                {"school_info.current_degree": {"$in": ["Masters", "M.Tech", "MBA", "MS", "PhD"]}},
                {"degree": {"$in": ["Masters", "M.Tech", "MBA", "MS", "PhD"]}},
                {"education_degree": {"$in": ["Masters", "M.Tech", "MBA", "MS", "PhD"]}}
            ]
        else:
            user_query["$or"] = [
                {"category": rx_cat},
                {"role": rx_cat},
                {"tags": rx_tag}
            ]
            
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        user_query["$and"] = [
            {"$or": [
                {"name": rx}, {"full_name": rx}, {"first_name": rx}, {"last_name": rx},
                {"email": rx}, {"college": rx}, {"company": rx}, {"sa_id": rx},
                {"phone": rx}, {"current_title": rx}, {"designation": rx}
            ]}
        ]

    # 2. Fetch from db.contacts
    contact_query: Dict[str, Any] = {}
    if cat != "all":
        if cat == "student":
            contact_query["$or"] = [
                {"role": rx_cat},
                {"category": rx_cat},
                {"tags": rx_tag},
                {"role": {"$nin": ["mentor", "alumni", "college", "admin", "superadmin"]}},
                {"role": ""},
                {"role": None}
            ]
        elif cat == "masters":
            contact_query["$or"] = [
                {"education_degree": {"$in": ["Masters", "M.Tech", "MBA", "MS", "PhD"]}},
                {"degree": {"$in": ["Masters", "M.Tech", "MBA", "MS", "PhD"]}}
            ]
        else:
            contact_query["$or"] = [
                {"role": rx_cat},
                {"category": rx_cat},
                {"tags": rx_tag}
            ]

    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        contact_query["$and"] = [
            {"$or": [
                {"name": rx}, {"email": rx}, {"phone": rx},
                {"current_company": rx}, {"current_title": rx},
                {"education_institution": rx}, {"location": rx}
            ]}
        ]

    # 3. Fetch from db.college_students (if student or all)
    college_student_query: Dict[str, Any] = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        college_student_query["$or"] = [
            {"name": rx}, {"email": rx}, {"dept": rx}, {"college": rx}
        ]

    # Combine docs by lowercased email or ID
    by_email: Dict[str, dict] = {}
    
    async for u in _db.users.find(user_query).sort([("created_at", -1)]):
        em = (u.get("email") or "").strip().lower()
        key = em if em else str(u["_id"])
        by_email[key] = {
            "source": "users",
            "raw": u,
            "email": em or u.get("email"),
            "name": u.get("full_name") or u.get("name") or em,
            "role": u.get("role") or u.get("category") or "student",
            "created_at": u.get("created_at")
        }

    async for c in _db.contacts.find(contact_query).sort([("created_at", -1)]):
        em = (c.get("email") or "").strip().lower()
        key = em if em else str(c["_id"])
        if key not in by_email:
            by_email[key] = {
                "source": "contacts",
                "raw": c,
                "email": em or c.get("email"),
                "name": c.get("name") or c.get("full_name") or em,
                "role": c.get("role") or (c.get("tags")[0] if c.get("tags") else "student"),
                "created_at": c.get("created_at")
            }
        else:
            raw_u = by_email[key]["raw"]
            for f in ["phone", "current_company", "current_title", "education_institution", "location", "linkedin_url"]:
                if not raw_u.get(f) and c.get(f):
                    raw_u[f] = c[f]

    if cat in ("all", "student"):
        async for cs in _db.college_students.find(college_student_query):
            em = (cs.get("email") or "").strip().lower()
            key = em if em else str(cs["_id"])
            if key not in by_email:
                by_email[key] = {
                    "source": "college_students",
                    "raw": cs,
                    "email": em or cs.get("email"),
                    "name": cs.get("name") or em,
                    "role": "student",
                    "created_at": cs.get("created_at")
                }

    # Transform items
    combined_items = []
    for key, entry in by_email.items():
        u = entry["raw"]
        src = entry["source"]
        oid_str = str(u.get("_id", ""))
        
        tags: List[str] = list(u.get("tags") or [])
        item_cat = (u.get("category") or u.get("role") or "student").lower()
        if item_cat not in ("student", "alumni", "mentor"):
            item_cat = "student"

        if not tags:
            if item_cat == "mentor": tags.append("Mentor")
            elif item_cat == "alumni": tags.append("Alumni")
            elif item_cat == "student": tags.append("Student")
            deg = u.get("degree") or u.get("education_degree") or u.get("dept") or ""
            if "B.Tech" in deg: tags.append("B.Tech")
            elif "CSE" in deg: tags.append("CSE")
            elif "ECE" in deg: tags.append("ECE")
            elif "MBA" in deg: tags.append("MBA")

        is_reg = bool(
            u.get("password") or u.get("hashed_password") or u.get("password_hash") or 
            u.get("auth_provider") or u.get("is_registered_user") or 
            (u.get("profile_status") == "active" and u.get("created_by") not in ("import", "manual"))
        )

        name = u.get("full_name") or u.get("name") or u.get("email") or "—"
        institution = u.get("college") or u.get("education_institution") or (u.get("school_info") or {}).get("institution_name") or u.get("dept") or ""
        company = u.get("company") or u.get("current_company") or (u.get("alumni_info") or {}).get("alumni_employer") or ""
        title = u.get("designation") or u.get("current_title") or u.get("headline") or (u.get("mentor_profile") or {}).get("job_title") or ""
        location = u.get("location") or u.get("city") or ""
        raw_phone = u.get("phone") or ""
        phone = format_e164_phone(raw_phone, location)

        c_points = 0
        max_points = 8
        if name and name != "—": c_points += 1
        if u.get("email"): c_points += 1
        if phone: c_points += 1
        if institution: c_points += 1
        if title or u.get("degree"): c_points += 1
        if company: c_points += 1
        if location: c_points += 1
        if is_reg: c_points += 1
        completeness = int((c_points / max_points) * 100)

        if account_filter == "registered" and not is_reg: continue
        if account_filter == "unregistered" and is_reg: continue
        if account_filter == "complete" and completeness < 60: continue

        created_val = u.get("created_at")
        if isinstance(created_val, datetime):
            created_str = created_val.isoformat()
        else:
            created_str = str(created_val) if created_val else datetime.now(timezone.utc).isoformat()

        approved = u.get("approved", True) if src in ("contacts", "college_students") else not (
            (u.get("role") == "mentor" and u.get("mentor_status") != "approved") or
            (u.get("role") == "college" and u.get("college_status") != "approved")
        )

        combined_items.append({
            "id": oid_str,
            "sa_id": u.get("sa_id") or f"SA-{oid_str[-6:].upper()}",
            "first_name": u.get("first_name") or (name.split()[0] if name and name != "—" else ""),
            "last_name": u.get("last_name") or (" ".join(name.split()[1:]) if name and len(name.split()) > 1 else ""),
            "name": name,
            "full_name": name,
            "email": u.get("email"),
            "phone": phone,
            "role": item_cat,
            "category": item_cat,
            "institution": institution,
            "college": institution,
            "degree": u.get("degree") or u.get("education_degree") or u.get("dept"),
            "graduation_year": u.get("graduation_year") or u.get("year"),
            "designation": title,
            "company": company,
            "location": location,
            "mentor_title": title,
            "mentor_org": company,
            "mentor_category": u.get("category"),
            "alumni_employer": company,
            "alumni_role": title,
            "profile_status": u.get("profile_status") or "complete",
            "is_registered": is_reg,
            "account_status": "registered" if is_reg else "unregistered",
            "completeness_score": completeness,
            "approved": approved,
            "tags": tags[:4],
            "badges": tags[:4],
            "is_new": bool(u.get("created_by") in ("import", "manual")) and not u.get("approved"),
            "created_at": created_str,
            "linkedin_url": u.get("linkedin_url") or u.get("profile_url"),
        })

    # Sort strictly by created_at DESC (newest uploaded contacts shown FIRST in the top row)
    combined_items.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)

    # Global Total
    total_count = len(combined_items)
    
    # Calculate counts for KPI tiles
    all_users_docs = await _db.users.find({"archived": {"$ne": True}}).to_list(100000)
    all_contacts_docs = await _db.contacts.find().to_list(100000)
    all_college_students_docs = await _db.college_students.find().to_list(100000)
    
    cat_tally = {"student": 0, "alumni": 0, "mentor": 0, "masters": 0, "all": 0, "pending_approval": 0}
    seen_kpi_emails = set()
    for d in (all_users_docs + all_contacts_docs + all_college_students_docs):
        e = (d.get("email") or "").strip().lower()
        if e:
            if e in seen_kpi_emails: continue
            seen_kpi_emails.add(e)
        r = (d.get("role") or d.get("category") or "").lower()
        if not r and d.get("tags"):
            r = str(d.get("tags")[0]).lower()
        if r in cat_tally:
            cat_tally[r] += 1
        else:
            cat_tally["student"] += 1
        cat_tally["all"] += 1
        if d.get("degree") in ["Masters", "M.Tech", "MBA", "MS", "PhD"] or (d.get("education_degree") in ["Masters", "M.Tech", "MBA", "MS", "PhD"]):
            cat_tally["masters"] += 1

    # Slice page
    paginated_items = combined_items[skip : skip + limit]
    total_pages = max(1, (total_count + limit - 1) // limit)

    return {
        "items": paginated_items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "counts": cat_tally,
    }
