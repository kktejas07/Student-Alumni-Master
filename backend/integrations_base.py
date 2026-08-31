"""
External API Integrations
==========================
Connectors for course/internship enrichment with mock-fallback behaviour.

Real-mode triggers ONLY when the corresponding API key is present in env.
Otherwise each function returns a curated mock list so the app keeps working.

Environment variables:
  UDEMY_CLIENT_ID, UDEMY_CLIENT_SECRET   → Udemy Affiliate API
  ADZUNA_APP_ID, ADZUNA_APP_KEY          → Adzuna jobs/internships API
  COURSERA_API_TOKEN                     → Coursera Partner API (optional)

To switch from MOCK → LIVE: just set the env var. No code change needed.
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional
import httpx
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Coursera
# ---------------------------------------------------------------------------
async def fetch_coursera_courses(query: str = "computer science", limit: int = 10) -> List[Dict[str, Any]]:
    """Coursera removed their public catalog API. Use the Partner-program JSON
    endpoint if a token is set, otherwise fall back to a curated list."""
    token = os.environ.get("COURSERA_API_TOKEN")
    if token:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(
                    "https://api.coursera.com/api/courses.v1",
                    params={"q": "search", "query": query, "limit": limit,
                            "fields": "name,slug,photoUrl,description,partners,workload"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                if r.is_success:
                    items = (r.json() or {}).get("elements", [])
                    return [_normalize_coursera(c) for c in items]
        except Exception as e:  # noqa: BLE001
            print(f"[coursera] live fetch failed → falling back to mock: {e}")
    return _mock_coursera(limit)


def _normalize_coursera(c: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": f"coursera-{c.get('slug') or c.get('id')}",
        "title": c.get("name"),
        "provider": "Coursera",
        "url": f"https://www.coursera.org/learn/{c.get('slug')}" if c.get("slug") else "https://www.coursera.org",
        "image": c.get("photoUrl") or "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800",
        "duration": c.get("workload") or "Self-paced",
        "level": "All",
        "is_free": False,
        "career_paths": ["job", "higher_education"],
        "source": "coursera",
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


def _mock_coursera(limit: int) -> List[Dict[str, Any]]:
    items = [
        {"slug": "machine-learning", "name": "Machine Learning - Andrew Ng", "workload": "8 weeks"},
        {"slug": "python-data-analysis", "name": "Python for Data Analysis", "workload": "4 weeks"},
        {"slug": "google-cybersecurity", "name": "Google Cybersecurity Professional Certificate", "workload": "6 months"},
        {"slug": "ibm-data-science", "name": "IBM Data Science Professional", "workload": "10 months"},
        {"slug": "meta-frontend", "name": "Meta Frontend Developer Certificate", "workload": "7 months"},
    ][:limit]
    return [_normalize_coursera({**i, "photoUrl": None}) for i in items]


# ---------------------------------------------------------------------------
# Udemy
# ---------------------------------------------------------------------------
async def fetch_udemy_courses(query: str = "python", limit: int = 10) -> List[Dict[str, Any]]:
    cid = os.environ.get("UDEMY_CLIENT_ID")
    csec = os.environ.get("UDEMY_CLIENT_SECRET")
    if cid and csec:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(
                    "https://www.udemy.com/api-2.0/courses/",
                    params={"search": query, "page_size": limit, "ratings": 4},
                    auth=(cid, csec),
                )
                if r.is_success:
                    items = (r.json() or {}).get("results", [])
                    return [_normalize_udemy(c) for c in items]
        except Exception as e:  # noqa: BLE001
            print(f"[udemy] live fetch failed → mock fallback: {e}")
    return _mock_udemy(limit)


def _normalize_udemy(c: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": f"udemy-{c.get('id')}",
        "title": c.get("title"),
        "provider": "Udemy",
        "url": f"https://www.udemy.com{c.get('url', '')}" if c.get("url") else "https://www.udemy.com",
        "image": c.get("image_480x270") or "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
        "duration": f"{int(float(c.get('content_info_short', '5').split()[0]))} hours" if c.get("content_info_short") else "Self-paced",
        "level": c.get("instructional_level", "All"),
        "is_free": (c.get("price") == "Free"),
        "career_paths": ["job", "startup"],
        "source": "udemy",
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


def _mock_udemy(limit: int) -> List[Dict[str, Any]]:
    items = [
        {"id": 5001, "title": "The Complete Python Bootcamp 2026", "url": "/course/complete-python-bootcamp/", "content_info_short": "22 hours", "instructional_level": "Intermediate", "price": "₹449"},
        {"id": 5002, "title": "100 Days of Code: Python", "url": "/course/100-days-of-code/", "content_info_short": "60 hours", "instructional_level": "Beginner", "price": "₹449"},
        {"id": 5003, "title": "JavaScript - The Complete Guide 2026", "url": "/course/javascript-the-complete-guide/", "content_info_short": "52 hours", "instructional_level": "All", "price": "₹449"},
        {"id": 5004, "title": "React - The Complete Guide", "url": "/course/react-the-complete-guide/", "content_info_short": "48 hours", "instructional_level": "All", "price": "₹449"},
        {"id": 5005, "title": "AWS Certified Solutions Architect", "url": "/course/aws-certified-solutions-architect/", "content_info_short": "27 hours", "instructional_level": "Intermediate", "price": "Free"},
    ][:limit]
    return [_normalize_udemy(i) for i in items]


# ---------------------------------------------------------------------------
# Adzuna
# ---------------------------------------------------------------------------
async def fetch_adzuna_internships(query: str = "internship", country: str = "in",
                                    limit: int = 10) -> List[Dict[str, Any]]:
    """Adzuna jobs API — supports India, USA, UK, etc. Free tier ~1k req/month."""
    aid = os.environ.get("ADZUNA_APP_ID")
    akey = os.environ.get("ADZUNA_APP_KEY")
    if aid and akey:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(
                    f"https://api.adzuna.com/v1/api/jobs/{country}/search/1",
                    params={
                        "app_id": aid,
                        "app_key": akey,
                        "what": query,
                        "results_per_page": limit,
                        "content-type": "application/json",
                    },
                )
                if r.is_success:
                    items = (r.json() or {}).get("results", [])
                    return [_normalize_adzuna(c) for c in items]
        except Exception as e:  # noqa: BLE001
            print(f"[adzuna] live fetch failed → mock fallback: {e}")
    return _mock_adzuna(limit)


def _normalize_adzuna(j: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": f"adzuna-{j.get('id')}",
        "title": j.get("title"),
        "company": (j.get("company") or {}).get("display_name"),
        "location": (j.get("location") or {}).get("display_name"),
        "stipend": (
            f"₹{int(j['salary_min']):,} – ₹{int(j['salary_max']):,}"
            if j.get("salary_min") and j.get("salary_max")
            else "Not disclosed"
        ),
        "duration": "3-6 months",
        "skills": (j.get("category") or {}).get("tag", "").split(",")[:4],
        "url": j.get("redirect_url"),
        "image": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800",
        "career_paths": ["job"],
        "source": "adzuna",
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


def _mock_adzuna(limit: int) -> List[Dict[str, Any]]:
    items = [
        {"id": 7001, "title": "Software Engineering Intern", "company": {"display_name": "Atlassian"}, "location": {"display_name": "Bangalore"}, "salary_min": 70000, "salary_max": 90000, "redirect_url": "https://www.atlassian.com/company/careers"},
        {"id": 7002, "title": "Data Analyst Intern", "company": {"display_name": "Walmart Labs"}, "location": {"display_name": "Bangalore"}, "salary_min": 55000, "salary_max": 70000, "redirect_url": "https://careers.walmart.com"},
        {"id": 7003, "title": "Frontend Intern", "company": {"display_name": "Hotstar"}, "location": {"display_name": "Mumbai / Remote"}, "salary_min": 50000, "salary_max": 65000, "redirect_url": "https://careers.hotstar.com"},
        {"id": 7004, "title": "AI / ML Research Intern", "company": {"display_name": "Samsung R&D"}, "location": {"display_name": "Noida"}, "salary_min": 75000, "salary_max": 95000, "redirect_url": "https://www.samsung.com/in/aboutsamsung/careers"},
        {"id": 7005, "title": "Cyber Security Intern", "company": {"display_name": "Cisco"}, "location": {"display_name": "Bangalore"}, "salary_min": 80000, "salary_max": 100000, "redirect_url": "https://jobs.cisco.com"},
        {"id": 7006, "title": "Product Intern", "company": {"display_name": "Meesho"}, "location": {"display_name": "Bangalore"}, "salary_min": 60000, "salary_max": 80000, "redirect_url": "https://www.meesho.io/careers"},
    ][:limit]
    return [_normalize_adzuna(i) for i in items]


# ---------------------------------------------------------------------------
# Sync engine — call from admin endpoint to refresh DB
# ---------------------------------------------------------------------------
async def sync_courses_to_db(db, limit_per_source: int = 8) -> Dict[str, int]:
    coursera = await fetch_coursera_courses(limit=limit_per_source)
    udemy = await fetch_udemy_courses(limit=limit_per_source)
    inserted = 0
    for c in coursera + udemy:
        await db.courses.update_one({"id": c["id"]}, {"$set": c}, upsert=True)
        inserted += 1
    return {"coursera": len(coursera), "udemy": len(udemy), "total": inserted}


async def sync_internships_to_db(db, limit: int = 10) -> Dict[str, int]:
    items = await fetch_adzuna_internships(limit=limit)
    for it in items:
        await db.internships.update_one({"id": it["id"]}, {"$set": it}, upsert=True)
    return {"adzuna": len(items), "total": len(items)}


def integrations_status() -> Dict[str, Any]:
    """Returns which integrations are LIVE (env vars set) vs in MOCK mode."""
    return {
        "coursera": "live" if os.environ.get("COURSERA_API_TOKEN") else "mock",
        "udemy": "live" if (os.environ.get("UDEMY_CLIENT_ID") and os.environ.get("UDEMY_CLIENT_SECRET")) else "mock",
        "adzuna": "live" if (os.environ.get("ADZUNA_APP_ID") and os.environ.get("ADZUNA_APP_KEY")) else "mock",
    }
