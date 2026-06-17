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
import io
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

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
_client    = AsyncIOMotorClient(_MONGO_URL)
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
    "first_name":           ["first name", "firstname", "given name"],
    "last_name":            ["last name", "lastname", "surname", "family name"],
    "email":                ["email", "email address", "e-mail", "mail"],
    "phone":                ["phone", "phone number", "mobile", "contact number"],
    "linkedin_url":         ["linkedin url", "linkedin", "profile url", "linkedin profile"],
    "college":              ["college / institution", "college", "institution",
                             "education institution", "university", "school"],
    "education":            ["education"],
    "degree":               ["degree", "education degree", "qualification"],
    "graduation_year":      ["graduation year", "grad year", "year of graduation"],
    "designation":          ["designation / job title", "designation", "current title",
                             "title", "job title", "role"],
    "company":              ["current company", "company", "employer", "organization", "organisation"],
    "experience_years_raw": ["years of experience", "experience years", "experience",
                             "self reported experience", "yoe"],
    "location":             ["general location", "location", "city"],
    "zip":                  ["zip", "zipcode", "zip code", "pin", "pincode"],
    "headline":             ["headline", "tagline", "about"],
    "date_applied":         ["date applied", "applied on"],
    "position_start_date":  ["current position start date", "position start date", "start date"],
    "category":             ["category", "user category", "type"],   # optional pre-label
}


def auto_map_headers(headers: List[str]) -> Dict[str, str]:
    """Return {source_header: target_field}. Source headers not matched are dropped."""
    out: Dict[str, str] = {}
    for h in headers:
        if h is None:
            continue
        norm = str(h).strip().lower()
        for target, aliases in HEADER_MAP.items():
            if norm in aliases:
                out[h] = target
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


def _norm_phone(v) -> str:
    s = _to_str(v)
    if not s:
        return ""
    s = re.sub(r"[\s\-\(\)]", "", s)
    if s.startswith("+"):
        return s
    digits = re.sub(r"\D", "", s)
    if len(digits) == 10:
        return "+91" + digits  # default India when unspecified
    return "+" + digits if digits else ""


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
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v))


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

    raise HTTPException(400, "Unsupported file type. Use .xlsx, .xls, or .csv")


# ─── Row → user transform ──────────────────────────────────────────
def transform_row(raw: dict, mapping: Dict[str, str]) -> Dict[str, Any]:
    """Apply header-mapping, normalize values, compute derived fields, categorize."""
    mapped: Dict[str, Any] = {}
    for src, tgt in mapping.items():
        mapped[tgt] = raw.get(src)

    first_name = _to_str(mapped.get("first_name"))
    last_name  = _to_str(mapped.get("last_name"))
    full_name  = (first_name + " " + last_name).strip() or "—"

    email      = _norm_email(mapped.get("email"))
    phone      = _norm_phone(mapped.get("phone"))
    linkedin   = _norm_linkedin(mapped.get("linkedin_url"))
    college    = _to_str(mapped.get("college"))
    degree     = _to_str(mapped.get("degree"))
    designation= _to_str(mapped.get("designation"))
    company    = _to_str(mapped.get("company"))
    location   = _to_str(mapped.get("location"))
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
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "File exceeds 10 MB limit")

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


# ─── Filtered user list (for dashboard tabs / search) ──────────────
@router.get("/admin/users/list")
async def list_users(
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    authorization: Optional[str] = Header(None),
):
    await _require_admin(authorization)
    match: Dict[str, Any] = {}
    if category and category != "all":
        match["category"] = category
    if q:
        match["$or"] = [
            {"full_name":    {"$regex": q, "$options": "i"}},
            {"email":        {"$regex": q, "$options": "i"}},
            {"college":      {"$regex": q, "$options": "i"}},
            {"company":      {"$regex": q, "$options": "i"}},
        ]
    total = await _db.users.count_documents(match)
    # Sort newest first — created_at desc, falling back to _id desc
    cur = _db.users.find(match).sort([("created_at", -1), ("_id", -1)]).skip(offset).limit(limit)
    items = []
    async for u in cur:
        # Derive 2 tags from category + degree/headline keywords
        tags: List[str] = []
        cat = u.get("category") or u.get("role") or "student"
        if cat == "mentor":  tags.append("Mentor")
        if cat == "masters": tags.append("Master's")
        if cat == "alumni":  tags.append("Alumni")
        if u.get("degree"):
            deg = (u.get("degree") or "").upper()
            if "CSE" in deg or "COMPUTER" in deg: tags.append("CSE")
            elif "ECE" in deg: tags.append("ECE")
            elif "MBA" in deg: tags.append("MBA")
            elif "MECH" in deg: tags.append("Mech")
        items.append({
            "id":         str(u["_id"]),
            "first_name": u.get("first_name") or "",
            "last_name":  u.get("last_name") or "",
            "name":       u.get("full_name") or "—",
            "email":      u.get("email"),
            "phone":      u.get("phone"),
            "linkedin_url": u.get("linkedin_url"),
            "category":   cat,
            "college":    u.get("college") or (u.get("school_info") or {}).get("institution_name") or "",
            "degree":     u.get("degree"),
            "graduation_year": u.get("graduation_year"),
            "designation": u.get("designation"),
            "company":     u.get("company"),
            "location":   u.get("location"),
            "experience_years": u.get("experience_years"),
            "profile_status": u.get("profile_status") or "complete",
            "approved":   bool(u.get("approved", False)),
            "tags":       tags[:2],
            "is_new":     bool(u.get("created_by") in ("import", "manual")) and not u.get("approved"),
            "created_at": (u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else None),
        })
    counts = {
        "all":     await _db.users.count_documents({}),
        "student": await _db.users.count_documents({"category": "student"}),
        "masters": await _db.users.count_documents({"category": "masters"}),
        "alumni":  await _db.users.count_documents({"category": "alumni"}),
        "mentor":  await _db.users.count_documents({"category": "mentor"}),
        "pending_approval": await _db.users.count_documents({"approved": False, "created_by": {"$in": ["import", "manual"]}}),
    }
    return {"items": items, "total": total, "counts": counts}
