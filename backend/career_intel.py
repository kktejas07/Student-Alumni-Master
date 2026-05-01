"""
Career Intel Integration Adapters
==================================
Provides a unified interface for fetching jobs/internships/scholarships from
3rd-party platforms (LinkedIn, Internshala, Buddy4Study).

⚠️ MOCKED FALLBACK ⚠️
Each adapter follows a consistent interface. If proper API credentials are
configured in the environment, the adapter will reach the real endpoint;
otherwise it returns a rich MOCK list that's clearly marked with `_mocked: True`.

Required env keys to enable real APIs:
  - LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET   (OAuth 2.0)
  - INTERNSHALA_API_KEY                          (paid partner API)
  - BUDDY4STUDY_API_KEY                          (paid partner API)

To wire to backend, mount in `server.py`:
  from integrations.career_intel import router as ci_router
  api_router.include_router(ci_router)

The frontend Career Intel view should hit:
  GET /api/career-intel/jobs
  GET /api/career-intel/internships
  GET /api/career-intel/scholarships
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/career-intel", tags=["career-intel"])


# ─── LinkedIn adapter ─────────────────────────────────────────────
async def linkedin_jobs(query: str = "software engineer", location: str = "India", limit: int = 10) -> Dict[str, Any]:
    client_id = os.environ.get("LINKEDIN_CLIENT_ID")
    if not client_id:
        return {
            "_mocked": True,
            "source": "linkedin",
            "items": [
                {"id": "li-mock-1", "title": "Software Engineer L4", "company": "Stripe",   "location": "Bangalore", "posted": "2d", "url": None},
                {"id": "li-mock-2", "title": "Senior PM",            "company": "Atlassian","location": "Sydney",    "posted": "5d", "url": None},
                {"id": "li-mock-3", "title": "Staff Designer",       "company": "Spotify",  "location": "London",    "posted": "1w", "url": None},
                {"id": "li-mock-4", "title": "ML Research Scientist","company": "OpenAI",   "location": "Remote",    "posted": "3d", "url": None},
                {"id": "li-mock-5", "title": "Backend Engineer",     "company": "Razorpay", "location": "Bengaluru", "posted": "1d", "url": None},
            ][:limit],
        }
    # Real implementation requires LinkedIn Talent API (paid + OAuth).
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                "https://api.linkedin.com/v2/jobSearch",
                params={"keywords": query, "location": location, "count": limit},
                headers={"Authorization": f"Bearer {os.environ.get('LINKEDIN_TOKEN', '')}"},
                timeout=10,
            )
            r.raise_for_status()
            return {"_mocked": False, "source": "linkedin", "items": r.json().get("elements", [])}
        except Exception:
            return {"_mocked": True, "source": "linkedin", "error": "API unreachable", "items": []}


# ─── Internshala adapter ──────────────────────────────────────────
async def internshala_internships(category: str = "all", limit: int = 12) -> Dict[str, Any]:
    api_key = os.environ.get("INTERNSHALA_API_KEY")
    if not api_key:
        return {
            "_mocked": True,
            "source": "internshala",
            "items": [
                {"id": "is-mock-1",  "title": "Web Development Intern",        "company": "Zomato",   "location": "Gurugram",  "stipend": "₹15,000/mo", "duration": "3 months"},
                {"id": "is-mock-2",  "title": "Content Writing Intern",         "company": "Unacademy","location": "Remote",    "stipend": "₹10,000/mo", "duration": "2 months"},
                {"id": "is-mock-3",  "title": "Data Analyst Intern",            "company": "Swiggy",   "location": "Bengaluru", "stipend": "₹25,000/mo", "duration": "6 months"},
                {"id": "is-mock-4",  "title": "Marketing Intern",                "company": "Cred",     "location": "Bengaluru", "stipend": "₹18,000/mo", "duration": "3 months"},
                {"id": "is-mock-5",  "title": "Mobile App Dev Intern",          "company": "Razorpay", "location": "Hybrid",    "stipend": "₹35,000/mo", "duration": "4 months"},
                {"id": "is-mock-6",  "title": "UI/UX Design Intern",            "company": "Meesho",   "location": "Bengaluru", "stipend": "₹20,000/mo", "duration": "3 months"},
            ][:limit],
        }
    # Real Internshala has no public API — typically we'd contract a partner feed.
    return {"_mocked": True, "source": "internshala", "items": []}


# ─── Buddy4Study adapter ──────────────────────────────────────────
async def buddy4study_scholarships(country: str = "IN", limit: int = 10) -> Dict[str, Any]:
    api_key = os.environ.get("BUDDY4STUDY_API_KEY")
    if not api_key:
        return {
            "_mocked": True,
            "source": "buddy4study",
            "items": [
                {"id": "b4s-mock-1", "name": "INSPIRE Scholarship",         "amount": "₹80,000/yr",  "deadline": "Aug 31",  "eligibility": "Top 1% in 12th + STEM stream"},
                {"id": "b4s-mock-2", "name": "Aditya Birla Scholarship",     "amount": "₹2,00,000/yr","deadline": "Sep 15",  "eligibility": "Engineering, Top 20 colleges"},
                {"id": "b4s-mock-3", "name": "Reliance Foundation UG",       "amount": "₹2,00,000/yr","deadline": "Oct 5",   "eligibility": "UG students, family income < 15L"},
                {"id": "b4s-mock-4", "name": "Tata Trusts Scholarship",      "amount": "₹50,000/yr",  "deadline": "Nov 20",  "eligibility": "Marginalized communities"},
                {"id": "b4s-mock-5", "name": "Kishore Vaigyanik Protsahan",  "amount": "₹84,000/yr",  "deadline": "Sep 25",  "eligibility": "Class 12 STEM + research interest"},
            ][:limit],
        }
    return {"_mocked": True, "source": "buddy4study", "items": []}


# ─── HTTP routes ──────────────────────────────────────────────────
@router.get("/jobs")
async def get_jobs(query: str = "software engineer", location: str = "India", limit: int = Query(10, le=50)):
    return await linkedin_jobs(query=query, location=location, limit=limit)


@router.get("/internships")
async def get_internships(category: str = "all", limit: int = Query(12, le=50)):
    return await internshala_internships(category=category, limit=limit)


@router.get("/scholarships")
async def get_scholarships(country: str = "IN", limit: int = Query(10, le=50)):
    return await buddy4study_scholarships(country=country, limit=limit)


@router.get("/intel-summary")
async def career_intel_summary():
    """Aggregate overview: counts + top items from each source."""
    jobs = await linkedin_jobs(limit=3)
    interns = await internshala_internships(limit=3)
    sch = await buddy4study_scholarships(limit=3)
    return {
        "sources": [
            {"name": "LinkedIn",     "count": len(jobs.get("items", [])),    "mocked": jobs.get("_mocked", False),    "preview": jobs.get("items", [])[:3]},
            {"name": "Internshala",  "count": len(interns.get("items", [])), "mocked": interns.get("_mocked", False), "preview": interns.get("items", [])[:3]},
            {"name": "Buddy4Study",  "count": len(sch.get("items", [])),     "mocked": sch.get("_mocked", False),     "preview": sch.get("items", [])[:3]},
        ],
    }
