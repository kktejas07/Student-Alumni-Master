"""
college_portal.py — College Admin Phase 3 (Student Roster + Analytics).

Endpoints (all under /api):
  GET  /college/students                paginated roster with filters
  GET  /college/students/{id}           single student detail
  GET  /college/analytics               full analytics payload
  GET  /college/departments             dept distribution
  GET  /college/recruiters              top recruiting companies
"""
from __future__ import annotations
import os
import logging
import random
from datetime import datetime, timezone
from typing import Any, Dict, List
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")
_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]
logger = logging.getLogger("college_portal")
router = APIRouter()


# ─── Auth ────────────────────────────────────────────────────────────────
def _auth():
    from server import get_current_user
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


_ROSTER_CACHE = {"items": None, "ts": None}
def _roster() -> List[Dict[str, Any]]:
    if _ROSTER_CACHE["items"] is None:
        _ROSTER_CACHE["items"] = _seed_roster()
        _ROSTER_CACHE["ts"] = datetime.now(timezone.utc)
    return _ROSTER_CACHE["items"]


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
    items = list(_roster())
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


@router.get("/college/students/{student_id}")
async def college_student_detail(student_id: str, user: dict = Depends(_auth())):
    s = next((x for x in _roster() if x["id"] == student_id), None)
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
    items = _roster()
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
    items = _roster()
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
    items = _roster()
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
