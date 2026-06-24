"""
college_portal.py — College Admin Phase 3 (Student Roster + Analytics).

Endpoints (all under /api):
  GET  /college/students                paginated roster with filters
  GET  /college/students/{id}           single student detail
  GET  /college/analytics               full analytics payload
  GET  /college/departments             dept distribution
  GET  /college/recruiters              top recruiting companies
  POST /college/announcements           create a new announcement
"""
from __future__ import annotations
import os
import logging
import random
from datetime import datetime, timezone
from typing import Any, Dict, List
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from pydantic import BaseModel
import csv
import io
from db import client as _mongo
_db = _mongo[os.environ["DB_NAME"]]
logger = logging.getLogger("college_portal")
router = APIRouter()


# ─── Auth ────────────────────────────────────────────────────────────────
def _auth():
    from core.deps import get_current_user
    return get_current_user


# ─── Seed Roster ─────────────────────────────────────────────────────────
DEPTS = ["CSE", "ECE", "ME", "EEE", "Civil", "Chem", "MBA"]
YEARS = ["1st", "2nd", "3rd", "4th", "Final"]
COLORS = {"CSE": "#3B82F6", "ECE": "#A78BFA", "ME": "#F59E0B",
           "EEE": "#10B981", "Civil": "#EF4444", "Chem": "#EC4899", "MBA": "#6366F1"}
FIRST_NAMES = ["Aarav", "Riya", "Karan", "Anika", "Vivek", "Diya", "Arjun", "Sara",
                "Rohan", "Priya", "Kabir", "Meera", "Krish", "Ishita", "Yash", "Ananya",
                "Aryan", "Nisha", "Dev", "Tara", "Rahul", "Pooja", "Aditya", "Kavya",
                "Siddharth", "Neha", "Vikram", "Aisha", "Sahil", "Divya"]
LAST_NAMES  = ["Mehta", "Verma", "Singh", "Iyer", "Patel", "Sharma", "Gupta", "Reddy",
                "Kumar", "Nair", "Shah", "Rao", "Bose", "Khan", "Pillai", "Joshi",
                "Saxena", "Bhatt", "Pandey", "Choudhary"]
TOP_COMPANIES = ["Google", "Microsoft", "Amazon", "Razorpay", "Swiggy", "Zomato",
                  "Flipkart", "Goldman Sachs", "Adobe", "Meta", "Atlassian", "Salesforce",
                  "Intuit", "Oracle", "TCS", "Infosys", "Wipro", "Accenture",
                  "JPMorgan", "Morgan Stanley"]
SECTORS = [{"name": "Technology",       "color": "#3B82F6"},
            {"name": "Finance",          "color": "#10B981"},
            {"name": "Consulting",       "color": "#F59E0B"},
            {"name": "Product Mgmt",     "color": "#A78BFA"},
            {"name": "Manufacturing",    "color": "#EF4444"},
            {"name": "Research",         "color": "#EC4899"}]


def _seed_roster() -> List[Dict[str, Any]]:
    random.seed(42)
    out: List[Dict[str, Any]] = []
    for i in range(120):
        first = FIRST_NAMES[i % len(FIRST_NAMES)]
        last  = LAST_NAMES[(i * 7) % len(LAST_NAMES)]
        dept  = DEPTS[i % len(DEPTS)]
        year  = YEARS[i % len(YEARS)]
        cgpa  = round(6.5 + ((i * 13) % 35) / 10.0, 2)  # 6.5 → 9.9
        att   = 70 + ((i * 11) % 30)
        # Determine status: top 5% (cgpa>=9.0), at_risk (cgpa<7 or att<75), good
        if cgpa >= 9.0:
            status = "top"
        elif cgpa < 7.0 or att < 75:
            status = "at_risk"
        else:
            status = "good"
        # Placement
        placed = (cgpa >= 7.5) and ((i * 17) % 100 < 78)
        company = TOP_COMPANIES[i % len(TOP_COMPANIES)] if placed else None
        package_lpa = None
        sector = None
        if placed:
            base = 6.0 + (cgpa - 7.5) * 4.0
            package_lpa = round(base + ((i * 23) % 40) / 10.0, 1)
            sector = SECTORS[i % len(SECTORS)]["name"]
        out.append({
            "id": f"STU-{i+1001}",
            "name": f"{first} {last}",
            "initials": (first[0] + last[0]).upper(),
            "email": f"{first.lower()}.{last.lower()}@college.edu",
            "dept": dept,
            "year": year,
            "cgpa": cgpa,
            "attendance": att,
            "status": status,
            "color": COLORS[dept],
            "placed": placed,
            "company": company,
            "package_lpa": package_lpa,
            "sector": sector,
        })
    return out


async def get_roster(college_id: str, user_doc: dict) -> List[Dict[str, Any]]:
    if not user_doc.get("demo_seeded"):
        count = await _db.college_students.count_documents({"college_id": college_id})
        if count == 0:
            demo_students = _seed_roster()
            for s in demo_students:
                s["college_id"] = college_id
                s.pop("_id", None)
            if demo_students:
                await _db.college_students.insert_many(demo_students)
                await _db.counters.update_one(
                    {"_id": f"student_seq_{college_id}"},
                    {"$set": {"seq": len(demo_students)}},
                    upsert=True
                )
        await _db.users.update_one({"_id": user_doc["_id"]}, {"$set": {"demo_seeded": True}})
    
    cursor = _db.college_students.find({"college_id": college_id}, {"_id": 0}).sort("id", 1)
    return await cursor.to_list(None)


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.get("/college/students")
async def college_students(
    q: str = Query(""),
    dept: str = Query("all"),
    year: str = Query("all"),
    status: str = Query("all"),
    page: int = Query(1),
    page_size: int = Query(20),
    user: dict = Depends(_auth()),
):
    items = await get_roster(str(user["_id"]), user)
    if dept and dept != "all":
        items = [s for s in items if s["dept"] == dept]
    if year and year != "all":
        items = [s for s in items if s["year"] == year]
    if status and status != "all":
        items = [s for s in items if s["status"] == status]
    if q:
        ql = q.lower()
        items = [s for s in items if ql in s["name"].lower()
                 or ql in s["email"].lower() or ql in s["dept"].lower()
                 or ql in s["id"].lower()]
    total = len(items)
    page = max(1, page)
    page_size = min(max(page_size, 1), 100)
    start = (page - 1) * page_size
    paged = items[start:start + page_size]
    return {"items": paged, "total": total, "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
            "filters": {
                "departments": [{"id": d, "label": d} for d in DEPTS],
                "years":       [{"id": y, "label": y} for y in YEARS],
                "statuses":    [{"id": "top", "label": "Top 5%"},
                                {"id": "good", "label": "On track"},
                                {"id": "at_risk", "label": "At-risk"}],
            },
            "fetched_at": datetime.now(timezone.utc).isoformat()}


class AddStudentPayload(BaseModel):
    name: str
    email: str
    dept: str
    year: str
    cgpa: float
    attendance: int


@router.post("/college/students")
async def add_college_student(payload: AddStudentPayload, user: dict = Depends(_auth())):
    counter_doc = await _db.counters.find_one_and_update(
        {"_id": f"student_seq_{user['_id']}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    student_id = f"STU-{1000 + counter_doc['seq']}"
    
    # Calculate status
    if payload.cgpa >= 9.0:
        status = "top"
    elif payload.cgpa < 7.0 or payload.attendance < 75:
        status = "at_risk"
    else:
        status = "good"
        
    initials = "".join([p[0] for p in payload.name.split() if p]).upper()[:2]
    if not initials:
        initials = "ST"
        
    new_student = {
        "college_id": str(user["_id"]),
        "id": student_id,
        "name": payload.name,
        "initials": initials,
        "email": payload.email,
        "dept": payload.dept,
        "year": payload.year,
        "cgpa": payload.cgpa,
        "attendance": payload.attendance,
        "status": status,
        "color": COLORS.get(payload.dept, "#3B82F6"),
        "placed": False,
        "company": None,
        "package_lpa": None,
        "sector": None
    }
    
    await _db.college_students.insert_one(new_student.copy())
    return {"ok": True, "student": new_student}


@router.get("/college/students/export")
async def export_college_students_csv(
    q: str = Query(""),
    dept: str = Query("all"),
    year: str = Query("all"),
    status: str = Query("all"),
):
    import csv
    import io

    items = await get_roster(str(user["_id"]), user)
    if dept and dept != "all":
        items = [s for s in items if s["dept"] == dept]
    if year and year != "all":
        items = [s for s in items if s["year"] == year]
    if status and status != "all":
        items = [s for s in items if s["status"] == status]
    if q:
        ql = q.lower()
        items = [s for s in items if ql in s["name"].lower()
                 or ql in s["email"].lower() or ql in s["dept"].lower()
                 or ql in s["id"].lower()]

    f = io.StringIO()
    w = csv.DictWriter(f, fieldnames=["ID", "Name", "Email", "Department", "Year", "CGPA", "Attendance %", "Status", "Placed", "Company", "Package (LPA)"])
    w.writeheader()
    for s in items:
        w.writerow({
            "ID": s["id"],
            "Name": s["name"],
            "Email": s["email"],
            "Department": s["dept"],
            "Year": s["year"],
            "CGPA": s["cgpa"],
            "Attendance %": s["attendance"],
            "Status": s["status"],
            "Placed": "Yes" if s["placed"] else "No",
            "Company": s["company"] or "",
            "Package (LPA)": s["package_lpa"] or "",
        })
    csv_content = f.getvalue()
    f.close()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=students_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"},
    )


@router.get("/college/students/{student_id}")
async def college_student_detail(student_id: str, user: dict = Depends(_auth())):
    items = await get_roster(str(user["_id"]), user)
    s = next((x for x in items if x["id"] == student_id), None)
    if not s:
        raise HTTPException(404, "Student not found")
    # Add mock activity feed
    activity = [
        {"date": "2026-04-12", "type": "course_completed",
         "label": "Completed: Machine Learning Specialization (Coursera)"},
        {"date": "2026-03-28", "type": "internship",
         "label": "Started internship at Razorpay"},
        {"date": "2026-02-15", "type": "event",
         "label": "Attended SA Career Fair 2026"},
    ]
    return {"student": s, "activity": activity}


@router.get("/college/analytics")
async def college_analytics(user: dict = Depends(_auth())):
    items = await get_roster(str(user["_id"]), user)
    total = len(items)
    placed_items = [s for s in items if s["placed"]]
    placed = len(placed_items)
    rate = round((placed / total) * 100, 1) if total else 0.0
    pkgs = [s["package_lpa"] for s in placed_items if s.get("package_lpa")]
    median = round(sorted(pkgs)[len(pkgs) // 2], 1) if pkgs else 0
    top_offer = round(max(pkgs), 1) if pkgs else 0

    # Placement trend (5-year mock)
    placement_trend = [
        {"year": 2022, "rate": 71.5, "median_lpa": 7.2},
        {"year": 2023, "rate": 74.8, "median_lpa": 8.0},
        {"year": 2024, "rate": 76.2, "median_lpa": 8.6},
        {"year": 2025, "rate": 78.1, "median_lpa": 9.4},
        {"year": 2026, "rate": rate, "median_lpa": median},
    ]
    yoy = round(rate - placement_trend[-2]["rate"], 1)

    # Salary distribution
    bands = [
        {"band": "< ₹6 LPA",   "min": 0,  "max": 6,   "color": "#94A3B8"},
        {"band": "₹6-10 LPA",  "min": 6,  "max": 10,  "color": "#3B82F6"},
        {"band": "₹10-15 LPA", "min": 10, "max": 15,  "color": "#A78BFA"},
        {"band": "₹15-25 LPA", "min": 15, "max": 25,  "color": "#10B981"},
        {"band": "₹25+ LPA",   "min": 25, "max": 9999,"color": "#F59E0B"},
    ]
    sal_dist = []
    for b in bands:
        cnt = sum(1 for p in pkgs if b["min"] <= p < b["max"])
        sal_dist.append({"band": b["band"], "count": cnt,
                          "pct": round((cnt / max(1, len(pkgs))) * 100, 1),
                          "color": b["color"]})

    # Sector distribution
    sector_counts: Dict[str, int] = {}
    for s in placed_items:
        if s.get("sector"):
            sector_counts[s["sector"]] = sector_counts.get(s["sector"], 0) + 1
    sectors = []
    for sec in SECTORS:
        c = sector_counts.get(sec["name"], 0)
        sectors.append({**sec, "count": c,
                          "pct": round((c / max(1, placed)) * 100, 1)})

    # Attrition / risk distribution
    attr_dist = {
        "top":     sum(1 for s in items if s["status"] == "top"),
        "good":    sum(1 for s in items if s["status"] == "good"),
        "at_risk": sum(1 for s in items if s["status"] == "at_risk"),
    }
    total_for_pct = max(1, total)
    attrition = [
        {"label": "Top performers", "pct": round(attr_dist["top"]    / total_for_pct * 100, 1), "color": "#10B981"},
        {"label": "On track",       "pct": round(attr_dist["good"]   / total_for_pct * 100, 1), "color": "#3B82F6"},
        {"label": "At-risk",        "pct": round(attr_dist["at_risk"]/ total_for_pct * 100, 1), "color": "#EF4444"},
    ]

    # Top recruiters
    company_counts: Dict[str, int] = {}
    for s in placed_items:
        if s["company"]:
            company_counts[s["company"]] = company_counts.get(s["company"], 0) + 1
    top_recruiters = sorted(
        [{"name": c, "hires": n,
          "logo": c[0]} for c, n in company_counts.items()],
        key=lambda x: -x["hires"])[:10]

    # Department-wise placement
    dept_placement = []
    for d in DEPTS:
        d_total = sum(1 for s in items if s["dept"] == d)
        d_placed = sum(1 for s in placed_items if s["dept"] == d)
        dept_placement.append({
            "dept": d, "total": d_total, "placed": d_placed,
            "rate": round((d_placed / max(1, d_total)) * 100, 1),
            "color": COLORS[d],
        })

    # Hiring funnel — counts must be monotonically non-increasing.
    applied = total
    offered = placed
    shortlisted = max(int(total * 0.34), offered + int(total * 0.05))
    interviewed = max(int(total * 0.62), shortlisted + int(total * 0.05))
    funnel = [
        {"stage": "Applied",      "count": applied,     "pct": 100.0,                                                "color": "#94A3B8"},
        {"stage": "Interviewed",  "count": interviewed, "pct": round(interviewed / max(1, applied) * 100, 1),       "color": "#3B82F6"},
        {"stage": "Shortlisted",  "count": shortlisted, "pct": round(shortlisted / max(1, applied) * 100, 1),       "color": "#A78BFA"},
        {"stage": "Offered",      "count": offered,     "pct": round(offered / max(1, applied) * 100, 1),           "color": "#10B981"},
    ]

    return {
        "kpi": {
            "students":     total,
            "placement":    f"{rate}%",
            "median_lpa":   f"₹{median} LPA",
            "top_offer":    f"₹{top_offer} LPA",
            "median_yoy":   ("↑ " if yoy >= 0 else "↓ ") + f"{abs(yoy)}%",
        },
        "placement_trend": placement_trend,
        "salary_dist":     sal_dist,
        "sectors":         sectors,
        "attrition":       attrition,
        "top_recruiters":  top_recruiters,
        "dept_placement":  dept_placement,
        "funnel":          funnel,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/college/departments")
async def college_departments(user: dict = Depends(_auth())):
    items = await get_roster(str(user["_id"]), user)
    out = []
    for d in DEPTS:
        d_items = [s for s in items if s["dept"] == d]
        d_placed = [s for s in d_items if s["placed"]]
        out.append({
            "name": d, "color": COLORS[d],
            "students": len(d_items),
            "placed": len(d_placed),
            "rate": round(len(d_placed) / max(1, len(d_items)) * 100, 1),
            "median_cgpa": round(sum(s["cgpa"] for s in d_items) / max(1, len(d_items)), 2),
        })
    return {"departments": out}


@router.get("/college/recruiters")
async def college_recruiters(user: dict = Depends(_auth())):
    items = await get_roster(str(user["_id"]), user)
    placed_items = [s for s in items if s["placed"]]
    company_counts: Dict[str, Dict[str, Any]] = {}
    for s in placed_items:
        c = s["company"]
        if not c:
            continue
        if c not in company_counts:
            company_counts[c] = {"name": c, "hires": 0,
                                  "min_pkg": 999, "max_pkg": 0,
                                  "depts": set()}
        company_counts[c]["hires"] += 1
        company_counts[c]["min_pkg"] = min(company_counts[c]["min_pkg"], s["package_lpa"])
        company_counts[c]["max_pkg"] = max(company_counts[c]["max_pkg"], s["package_lpa"])
        company_counts[c]["depts"].add(s["dept"])
    out = []
    for c, d in company_counts.items():
        out.append({
            "name": c, "hires": d["hires"],
            "min_pkg": round(d["min_pkg"], 1),
            "max_pkg": round(d["max_pkg"], 1),
            "depts": sorted(list(d["depts"])),
            "logo": c[0],
        })
    out.sort(key=lambda x: -x["hires"])
    return {"recruiters": out}


@router.delete("/college/students/clear")
async def clear_college_students(user: dict = Depends(_auth())):
    await _db.college_students.delete_many({"college_id": str(user["_id"])})
    return {"ok": True}


@router.post("/college/students/upload")
async def upload_college_students(file: UploadFile = File(...), user: dict = Depends(_auth())):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Must be a CSV file")
        
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(400, "File too large. Maximum size is 5MB.")

    try:
        decoded = contents.decode('utf-8')
    except Exception:
        raise HTTPException(400, "Invalid file encoding. Must be UTF-8.")
        
    reader = csv.DictReader(io.StringIO(decoded))
    to_insert = []
    
    for row in reader:
        cleaned_row = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
        
        name = cleaned_row.get("name") or "Unknown Student"
        email = cleaned_row.get("email") or ""
        dept = cleaned_row.get("department") or cleaned_row.get("dept") or "CSE"
        year = cleaned_row.get("year") or "1st"
        
        try:
            cgpa = float(cleaned_row.get("cgpa", 0))
        except ValueError:
            cgpa = 0.0
            
        try:
            attendance = int(cleaned_row.get("attendance %") or cleaned_row.get("attendance", 0))
        except ValueError:
            attendance = 0
            
        status_input = cleaned_row.get("status", "").lower()
        if status_input == "top" or cgpa >= 9.0:
            status = "top"
        elif status_input == "at_risk" or cgpa < 7.0 or attendance < 75:
            status = "at_risk"
        else:
            status = "good"
            
        placed_input = cleaned_row.get("placed", "").lower()
        placed = placed_input in ["yes", "true", "1", "y"]
        company = cleaned_row.get("company") if placed else None
        
        try:
            package_lpa = float(cleaned_row.get("package (lpa)") or cleaned_row.get("package", 0)) if placed else None
        except ValueError:
            package_lpa = None
            
        initials = "".join([p[0] for p in name.split() if p]).upper()[:2]
        if not initials:
            initials = "ST"
            
        to_insert.append({
            "college_id": str(user["_id"]),
            "name": name,
            "initials": initials,
            "email": email,
            "dept": dept,
            "year": year,
            "cgpa": cgpa,
            "attendance": attendance,
            "status": status,
            "color": COLORS.get(dept, "#3B82F6"),
            "placed": placed,
            "company": company,
            "package_lpa": package_lpa,
            "sector": None
        })
        
    if to_insert:
        counter_doc = await _db.counters.find_one_and_update(
            {"_id": f"student_seq_{user['_id']}"},
            {"$inc": {"seq": len(to_insert)}},
            upsert=True,
            return_document=True
        )
        start_seq = counter_doc['seq'] - len(to_insert)
        for i, s in enumerate(to_insert):
            s["id"] = f"STU-{1000 + start_seq + 1 + i}"

        await _db.college_students.insert_many(to_insert)
        
    return {"ok": True, "count": len(to_insert)}


# ─── Announcements ───────────────────────────────────────────────────────────
class AnnouncementPayload(BaseModel):
    title: str
    body: str
    audience: str = "all"
    tag: str = "general"
    pinned: bool = False


@router.post("/college/announcements")
async def create_college_announcement(
    payload: AnnouncementPayload,
    user: dict = Depends(_auth()),
):
    """Create a new announcement for the college and persist it in MongoDB."""
    if not payload.title.strip() or not payload.body.strip():
        raise HTTPException(status_code=422, detail="Title and body are required.")

    college_name = (
        (user.get("college_info") or {}).get("institution_name")
        or (user.get("school_info") or {}).get("institution_name")
        or user.get("college_name")
        or ""
    )
    author = user.get("full_name") or college_name or "Admin"

    doc = {
        "title": payload.title.strip(),
        "body": payload.body.strip(),
        "audience": payload.audience,
        "tag": payload.tag,
        "pinned": payload.pinned,
        "author": author,
        "college_name": college_name,
        "posted_at": datetime.now(timezone.utc),
    }
    result = await _db.announcements.insert_one(doc)
    return {
        "ok": True,
        "id": str(result.inserted_id),
        "title": doc["title"],
        "posted_at": doc["posted_at"].isoformat(),
    }
