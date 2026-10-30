"""
course_aggregator.py — 24-hour Course Aggregator Bot (roadmap C1).

Refreshes the ``external_courses`` Mongo collection every 24h (daily 02:00 UTC
cron) from 21 external free-course sources, and merges them into
``GET /api/courses/list`` behind a ``source`` filter (internal / external /
community / all).

Design mirrors deals_aggregator / events_aggregator:
  - one ``SourceAdapter`` per source (pluggable, httpx-based, per-adapter
    error isolation via asyncio.gather + return_exceptions)
  - adapters with no stable public API serve a deterministic static catalog
    instead of scraping (documented on each adapter)
  - docs missing for >48h are marked ``stale``
  - APScheduler CronTrigger(hour=2, minute=0), leader-elected in server.py
  - optional startup run when the last run is >24h old (AGGREGATOR_RUN_ON_STARTUP)

Admin (super_admin):
  GET   /api/admin/aggregator/status
  PATCH /api/admin/aggregator/sources/{name}        {"enabled": true|false}
  POST  /api/admin/aggregator/run?source={name}     (omit for all sources)

Env:
  YOUTUBE_API_KEY          — enables the fCC-YouTube adapter live listing
  UDEMY_API_KEY            — enables the Udemy-free adapter live search
  AGGREGATOR_CRON_ENABLED  — 0 to disable the daily cron (default 1)
  AGGREGATOR_RUN_ON_STARTUP — 0 to disable the startup catch-up run (default 1)
"""
from __future__ import annotations

import abc
import asyncio
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, ClassVar, Dict, List, Optional, Tuple

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.db import db as _db

logger = logging.getLogger("course_aggregator")

COL = "external_courses"
RUN_META = "aggregator_runs"
SOURCE_META = "aggregator_sources"

USER_AGENT = "StudentAlumniBot/1.0 (+https://studentalumni.in)"
PER_API_TIMEOUT_S = 15.0
STALE_AFTER_HOURS = 48
STARTUP_STALE_HOURS = 24


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─── Category heuristics ─────────────────────────────────────────────────
# Maps free-text titles/descriptions onto the (category, subcategory) pairs
# used by the courses UI section keys.

_CATEGORY_RULES: List[Tuple[str, str, str, Tuple[str, ...]]] = [
    # (category, subcategory, keywords)
    ("tech", "ai-ml", ("machine learning", "deep learning", "neural", "llm",
                        "pytorch", "tensorflow", "ai engineer", "gen ai",
                        "generative ai", "nlp", "computer vision", "scikit")),
    ("tech", "data-science", ("data science", "data analysis", "analytics",
                               "pandas", "sql", "big data", "tableau", "power bi",
                               "statistic")),
    ("tech", "web-dev", ("html", "css", "javascript", "typescript", "react",
                          "node.js", "nodejs", "angular", "vue", "django",
                          "flask", "fastapi", "full stack", "full-stack",
                          "frontend", "front-end", "web dev", "rest api")),
    ("tech", "mobile-dev", ("android", "ios", "flutter", "react native",
                            "swift", "kotlin mobile", "mobile app")),
    ("tech", "cloud", ("aws", "azure", "google cloud", "gcp", "cloud computing",
                        "cloud architect", "s3", "lambda")),
    ("tech", "cybersecurity", ("cybersecurity", "cyber security", "ethical hacking",
                                "security engineer", "network security", "cryptography",
                                "incident response", "penetration")),
    ("tech", "devops", ("devops", "docker", "kubernetes", "ci/cd", "linux sysadmin",
                        "terraform", "ansible", "site reliability", "jenkins")),
    ("tech", "system-design", ("system design", "distributed systems", "algorithms",
                                "data structures", "computer architecture",
                                "circuit", "embedded", "computer organization")),
    ("design", "ui-design", ("ui design", "ux design", "figma", "design thinking",
                              "product design", "interaction design")),
    ("design", "video-editing", ("video editing", "video production", "motion graphics",
                                  "3d animation", "blender", "after effects")),
    ("design", "photography", ("photography", "photoshop", "lightroom", "image editing")),
    ("business", "product-mgmt", ("product management", "product manager", "scrum",
                                   "agile", "jira", "user research")),
    ("business", "marketing", ("digital marketing", "marketing", "seo", "content marketing",
                                "social media", "branding")),
    ("business", "finance", ("finance", "accounting", "financial modelling", "audit",
                              "investing", "budgeting", "corporate finance")),
    ("business", "communication", ("communication", "public speaking", "business writing",
                                    "storytelling", "negotiation")),
    ("business", "leadership", ("leadership", "management", "executive", "organizational",
                                 "people management")),
    ("business", "startup", ("startup", "entrepreneur", "venture", "business plan",
                              "founder", "pitch")),
    ("tech", "web-dev", ("programming", "python", "java", "c++", "golang", "rust",
                          "coding", "software development", "computer science")),
]


def classify(title: str, description: str = "") -> Tuple[str, str]:
    text = f"{title} {description}".lower()
    for category, subcategory, keywords in _CATEGORY_RULES:
        if any(k in text for k in keywords):
            return category, subcategory
    return "tech", "web-dev"


def classify_level(text: str) -> str:
    t = text.lower()
    if "advanced" in t:
        return "Advanced"
    if "intermediate" in t:
        return "Intermediate"
    if "beginner" in t or "intro" in t or "fundamental" in t or "getting started" in t:
        return "Beginner"
    return "Beginner"


# ─── Adapters ────────────────────────────────────────────────────────────
class SourceAdapter(abc.ABC):
    """One pluggable source. ``fetch_courses`` returns a list of partial docs:
    {source_id, title, description, url, thumbnail_url?, duration_minutes?, level?,
     skills?, language?, price?, currency?, rating?, enrolled_count?,
     cert_available?, cert_free?, cert_provider?, cert_type?, cert_url?,
     cert_cost_inr?, tags?} — missing keys are optional.
    """

    source_name: ClassVar[str] = "base"
    provider: ClassVar[str] = ""
    provider_type: ClassVar[str] = "platform"
    # name of the env var holding a required API key, or None
    api_key_env: ClassVar[Optional[str]] = None
    is_static: ClassVar[bool] = False

    def __init__(self, http: Optional[httpx.AsyncClient] = None):
        self.http = http

    @abc.abstractmethod
    async def fetch_courses(self) -> List[Dict[str, Any]]:
        ...

    # shared helpers ───────────────────────────────────────────────────────
    async def _get_json(self, url: str, **kwargs: Any) -> Any:
        assert self.http is not None, f"{self.source_name} called without a client"
        r = await self.http.get(url, **kwargs)
        r.raise_for_status()
        return r.json()

    def _static(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Wrap a deterministic static catalog in the partial-doc shape."""
        out = []
        for row in rows:
            d = dict(row)
            d.setdefault("source_id", str(abs(hash(d.get("title", ""))) % 10**10))
            out.append(d)
        return out

    def map_category(self, raw: Dict[str, Any]) -> Dict[str, str]:
        category, subcategory = classify(raw.get("title", ""),
                                         raw.get("description", ""))
        return {"category": category, "subcategory": subcategory,
                "level": raw.get("level") or classify_level(
                    f"{raw.get('title','')} {raw.get('description','')}")}


# ── 1. MIT OpenCourseWare (live search API) ─────────────────────────────
class MITOCWAdapter(SourceAdapter):
    source_name = "mit_ocw"
    provider = "MIT"
    provider_type = "university"
    is_static = False

    TOPICS = ["machine learning", "python", "algorithms", "data science",
              "calculus", "circuit"]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        docs: Dict[str, Dict[str, Any]] = {}
        for topic in self.TOPICS:
            try:
                data = await self._get_json(
                    "https://ocw.mit.edu/ocw_search_api/v1/search",
                    params={"query": topic, "size": 50},
                )
            except Exception as e:  # noqa: BLE001 — isolate per topic
                logger.warning("[course_agg] mit_ocw topic %s failed: %s", topic, e)
                continue
            for hit in data.get("hits", {}).get("hits", []):
                src = hit.get("_source", {}).get("course", {})
                cid = src.get("course_id") or src.get("id")
                if not cid:
                    continue
                number = str(src.get("course_number", "")).replace(".", "-")
                docs[cid] = {
                    "source_id": str(cid),
                    "title": src.get("title", "MIT OCW Course"),
                    "description": (src.get("description") or "")[:300],
                    "url": f"https://ocw.mit.edu/courses/{number}" if number
                            else "https://ocw.mit.edu/",
                    "thumbnail_url": "",
                    "level": src.get("level") or None,
                    "skills": [src.get("department_code")] if src.get("department_code") else [],
                    "language": src.get("language") or "English",
                    "duration_minutes": None,
                    "price": 0, "currency": "USD",
                    "rating": None, "enrolled_count": None,
                    "cert_available": False, "cert_free": True,
                    "cert_provider": None, "cert_type": "none", "cert_url": None,
                    "cert_cost_inr": 0,
                    "tags": ["IVY_LEAGUE", "FREE"],
                }
        return list(docs.values())


# ── 2. freeCodeCamp (static certifications) ──────────────────────────────
class FreeCodeCampAdapter(SourceAdapter):
    source_name = "freecodecamp"
    provider = "freeCodeCamp"
    provider_type = "platform"
    is_static = True

    CERTS = [
        "Responsive Web Design Certification",
        "JavaScript Algorithms and Data Structures Certification",
        "Front End Library Certification",
        "Data Analysis with Python Certification",
        "JavaScript Algorithms and Data Structures (Infosec) — Ethical Hacking",
        "Machine Learning for Trading Certification",
        "Data Visualization Certification",
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"fcc-{i}",
                "title": c,
                "description": f"Self-paced freeCodeCamp certification: {c}. "
                               "Project-based, no time limit, free certificate of completion.",
                "url": "https://www.freecodecamp.org/learn",
                "skills": ["javascript", "python", "html", "css"],
                "duration_minutes": 18000,
                "level": "Beginner",
                "price": 0, "currency": "USD",
                "cert_available": True, "cert_free": True,
                "cert_provider": "freeCodeCamp", "cert_type": "completion",
                "tags": ["FREE", "FREE_CERT", "TOP_RATED"],
            }
            for i, c in enumerate(self.CERTS)
        ])


# ── 3. Odin Project (static) ────────────────────────────────────────────
class OdinProjectAdapter(SourceAdapter):
    source_name = "odin_project"
    provider = "The Odin Project"
    provider_type = "platform"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "full-stack", "title": "Full Stack JavaScript Path",
             "description": "Free full-stack JS path: HTML/CSS, JS, Node.js, "
                            "Express, databases and deployment.",
             "url": "https://www.theodinproject.com/paths/full-stack",
             "skills": ["javascript", "node", "html", "css"],
             "duration_minutes": 30000, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "The Odin Project", "cert_type": "completion",
             "tags": ["FREE", "FREE_CERT", "JOB_READY"]},
            {"source_id": "cs-foundations", "title": "Foundations of Computer Science",
             "description": "Math, logic and algorithms groundwork before web dev.",
             "url": "https://www.theodinproject.com/paths/foundations",
             "skills": ["algorithms", "math", "logic"],
             "duration_minutes": 12000, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
             "tags": ["FREE", "BEGINNER_FRIENDLY"]},
            {"source_id": "ruby", "title": "Ruby on Rails Path",
             "description": "Ruby and Rails web development with a real project focus.",
             "url": "https://www.theodinproject.com/paths/ruby",
             "skills": ["ruby", "rails"],
             "duration_minutes": 25000, "level": "Intermediate",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "The Odin Project", "cert_type": "completion",
             "tags": ["FREE", "JOB_READY"]},
        ])


# ── 4. NPTEL (static — catalogue is semester-based; link to search) ─────
class NPTELAdapter(SourceAdapter):
    source_name = "nptel"
    provider = "NPTEL"
    provider_type = "university"
    is_static = True

    TOPICS = [
        ("Python Programming for Everyone", "python"),
        ("Java: Programming Fundamentals", "java"),
        ("Machine Learning Fundamentals", "machine-learning"),
        ("Data Analytics Using Python", "data-analytics"),
        ("Introduction to IoT", "iot"),
        ("Fundamentals of Cyber Security", "cyber-security"),
        ("Blockchain and its Applications", "blockchain"),
        ("Differential Calculus", "calculus"),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"nptel-{slug}",
                "title": title,
                "description": f"NPTEL ({'IIT' if i % 2 else 'IISc'})-delivered "
                               "MOOC. Free audit; graded certificate via proctored exam.",
                "url": f"https://online.nptel.ac.in/search?keyword={slug}",
                "skills": [slug.replace("-", " ")],
                "duration_minutes": 50 * 60, "level": "Beginner",
                "price": 0, "currency": "INR",
                "cert_available": True, "cert_free": False,
                "cert_provider": "NPTEL", "cert_type": "academic",
                "cert_cost_inr": 1200,
                "tags": ["GOVT_CERTIFIED", "BEGINNER_FRIENDLY"],
            }
            for i, (title, slug) in enumerate(self.TOPICS)
        ])


# ── 5. Khan Academy (static) ────────────────────────────────────────────
class KhanAcademyAdapter(SourceAdapter):
    source_name = "khan_academy"
    provider = "Khan Academy"
    provider_type = "platform"
    is_static = True

    TOPICS = [
        ("Computer Science Foundations", "computing/computer-science"),
        ("AP Computer Science Principles", "computing/ap-computer-science-principles"),
        ("JavaScript & CSS", "computing/javascript-css"),
        ("Algebra I", "math/algebra-1"),
        ("Calculus", "math/calculus"),
        ("Statistics & Probability", "math/statistics-and-probability"),
        ("SAT Math", "test-prep/sat/mathematics"),
        ("Economics", "economics-finance/finance-accounting"),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"ka-{slug.split('/')[-1]}",
                "title": title,
                "description": "Free Khan Academy course: videos, practice "
                               "exercises and mastery-based progression.",
                "url": f"https://www.khanacademy.org/{slug}",
                "skills": [title.lower()],
                "duration_minutes": 90 * 60, "level": "Beginner",
                "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
                "tags": ["FREE", "BEGINNER_FRIENDLY"],
            }
            for title, slug in self.TOPICS
        ])


# ── 6. OpenStax (static textbooks) ──────────────────────────────────────
class OpenStaxAdapter(SourceAdapter):
    source_name = "openstax"
    provider = "OpenStax"
    provider_type = "university"
    is_static = True

    BOOKS = [
        ("Introduction to Computer Science", "introduction-to-computer-science", "web-dev"),
        ("Calculus Volume 1", "calculus-volume-1", "ai-ml"),
        ("Principles of Economics", "principles-of-microeconomics", "finance"),
        ("Psychology 2e", "psychology-2e", "communication"),
        ("Biology 2e", "biology-2e", "data-science"),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"os-{slug}",
                "title": f"OpenStax — {title}",
                "description": "Peer-reviewed open textbook, free to read online "
                               "or download.",
                "url": f"https://openstax.org/details/textbooks/{slug}",
                "skills": [title.lower()],
                "duration_minutes": 200 * 60, "level": "Beginner",
                "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
                "tags": ["FREE", "BEGINNER_FRIENDLY"],
            }
            for title, slug, _ in self.BOOKS
        ])


# ── 7. freeCodeCamp YouTube (live listing when YOUTUBE_API_KEY set) ─────
class FreeCodeCampYouTubeAdapter(SourceAdapter):
    source_name = "fcc_youtube"
    provider = "freeCodeCamp (YouTube)"
    provider_type = "platform"
    is_static = True
    api_key_env = "YOUTUBE_API_KEY"

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        key = os.environ.get(self.api_key_env)
        if not key:
            return self._static([
                {"source_id": "fcc-yt-channel",
                 "title": "freeCodeCamp — 1000+ Full Courses (YouTube)",
                 "description": "Full-length project courses: Python, JS, C++, "
                                "SQL, and more, streamed free on YouTube.",
                 "url": "https://www.youtube.com/@freecodecamp",
                 "skills": ["python", "javascript", "sql"],
                 "duration_minutes": None, "level": "Beginner",
                 "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
                 "tags": ["FREE", "BEGINNER_FRIENDLY"]},
            ])
        try:
            data = await self._get_json(
                "https://www.googleapis.com/youtube/v3/search",
                params={"part": "snippet", "type": "playlist", "channelId":
                        "UCXMBmbEFPkXysA-Ma-WJqGg",
                        "maxResults": 20, "key": key},
            )
            docs = []
            for i, item in enumerate(data.get("items", [])):
                sn = item.get("snippet", {})
                docs.append({
                    "source_id": sn.get("id", {}).get("videoId", f"fcc-yt-{i}"),
                    "title": sn.get("title", "Untitled"),
                    "description": (sn.get("description") or "")[:200],
                    "url": f"https://www.youtube.com/watch?v={sn.get('id', {}).get('videoId', '')}",
                    "duration_minutes": None, "level": None,
                    "price": 0, "currency": "USD",
                    "cert_available": False, "cert_free": True,
                    "tags": ["FREE"],
                })
            return docs
        except Exception as e:  # noqa: BLE001
            logger.warning("[course_agg] fcc_youtube live listing failed: %s", e)
            return []


# ── 8. Exercism (static language tracks) ────────────────────────────────
class ExercismAdapter(SourceAdapter):
    source_name = "exercism"
    provider = "Exercism"
    provider_type = "platform"
    is_static = True

    TRACKS = ["python", "javascript", "rust", "go", "c", "typescript", "java"]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"ex-{t}",
                "title": f"Exercism — {t.capitalize()} Track",
                "description": "Free mentor-guided exercises with code review from "
                               "expert mentors.",
                "url": f"https://exercism.org/tracks/{t}",
                "skills": [t], "duration_minutes": 30 * 60, "level": "Beginner",
                "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
                "tags": ["FREE", "JOB_READY"],
            }
            for t in self.TRACKS
        ])


# ── 9. Kaggle Learn (static micro-courses) ──────────────────────────────
class KaggleAdapter(SourceAdapter):
    source_name = "kaggle"
    provider = "Kaggle"
    provider_type = "company"
    is_static = True

    COURSES = [
        ("Python for Data Science and Machine Learning", "python", "python", "ai-ml"),
        ("Pandas", "pandas", "pandas", "data-science"),
        ("Data Analysis", "data-analysis", "data-analysis", "data-science"),
        ("Machine Learning", "machine-learning", "machine-learning", "ai-ml"),
        ("Data Visualization", "data-visualization", "visualization", "data-science"),
        ("SQL for Data Science", "kaggle-survey", "sql", "data-science"),
        ("Intermediate Python", "intermediate-python", "python", "ai-ml"),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"kg-{slug}",
                "title": f"Kaggle Learn — {title}",
                "description": "Hands-on micro-course with notebooks and a "
                               "verified certificate.",
                "url": f"https://www.kaggle.com/learn/{slug}",
                "skills": [skill], "duration_minutes": 5 * 60, "level": "Beginner",
                "price": 0, "currency": "USD",
                "cert_available": True, "cert_free": True,
                "cert_provider": "Kaggle", "cert_type": "completion",
                "tags": ["FREE", "FREE_CERT", "QUICK_WIN"],
            }
            for title, slug, skill, _ in self.COURSES
        ])


# ── 10. Google (static free courses) ────────────────────────────────────
class GoogleAdapter(SourceAdapter):
    source_name = "google"
    provider = "Google"
    provider_type = "company"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "g-cloud-fundamentals", "title": "Google Cloud Fundamentals: Core Concepts",
             "description": "Free Google Cloud architecture, services and billing "
                            "fundamentals.",
             "url": "https://cloud.google.com/learn/courses/cloud-fundamentals",
             "skills": ["cloud", "gcp"], "duration_minutes": 4 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Google", "cert_type": "digital_badge",
             "tags": ["FREE", "FREE_CERT"]},
            {"source_id": "g-digital-marketing", "title": "Google Digital Marketing & Ecommerce Fundamentals",
             "description": "Search, Shopping, YouTube, analytics and ecommerce "
                            "fundamentals.",
             "url": "https://grow.google/certification/digital-marketing-ecommerce-fundamentals/",
             "skills": ["marketing", "analytics"], "duration_minutes": 10 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Google", "cert_type": "digital_badge",
             "tags": ["FREE", "FREE_CERT"]},
            {"source_id": "g-ux-design", "title": "Google UX Design Certificate",
             "description": "Three course paths: UX foundations, tools, and the "
                            "capstone; Google-issued certificate.",
             "url": "https://uxdesign.google.com/",
             "skills": ["ux", "figma"], "duration_minutes": 90 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Google", "cert_type": "industry_cert",
             "tags": ["FREE", "FREE_CERT", "JOB_READY"]},
            {"source_id": "g-data-analytics", "title": "Google Data Analytics Certificate",
             "description": "SQL, Tableau and R fundamentals; available free via "
                            "Financial Aid on Coursera.",
             "url": "https://www.coursera.org/professional-certificates/google-data-analytics",
             "skills": ["sql", "tableau", "r"], "duration_minutes": 300 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Google/Coursera", "cert_type": "industry_cert",
             "tags": ["FREE", "FREE_CERT", "TOP_RATED"]},
            {"source_id": "g-it-support", "title": "Google IT Support Certificate",
             "description": "Linux, networking, web services and user support "
                            "fundamentals.",
             "url": "https://www.coursera.org/professional-certificates/google-it-support",
             "skills": ["linux", "networking"], "duration_minutes": 150 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Google/Coursera", "cert_type": "industry_cert",
             "tags": ["FREE", "FREE_CERT", "QUICK_WIN"]},
        ])


# ── 11. AWS (static digital training) ───────────────────────────────────
class AWSAdapter(SourceAdapter):
    source_name = "aws"
    provider = "Amazon Web Services"
    provider_type = "company"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "aws-cloud-practitioner", "title": "AWS Cloud Practitioner Essentials",
             "description": "Free AWS digital training: cloud concepts, core "
                            "services and the CCP exam prep track.",
             "url": "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/",
             "skills": ["aws", "cloud"], "duration_minutes": 8 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": False,
             "cert_provider": "AWS", "cert_type": "industry_cert", "cert_cost_inr": 12000,
             "tags": ["FREE", "JOB_READY"]},
            {"source_id": "aws-machine-learning", "title": "Machine Learning Foundations (AWS ML)",
             "description": "AWS free digital ML fundamentals: supervised/unsupervised "
                            "learning with hands-on labs.",
             "url": "https://aws.amazon.com/training/digital/machine-learning-foundations/",
             "skills": ["machine-learning", "aws"], "duration_minutes": 6 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
             "tags": ["FREE", "BEGINNER_FRIENDLY"]},
            {"source_id": "aws-database", "title": "Database Essentials on AWS",
             "description": "RDS, DynamoDB, and data modelling on AWS.",
             "url": "https://aws.amazon.com/training/digital/database-essentials/",
             "skills": ["database", "aws"], "duration_minutes": 4 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
             "tags": ["FREE"]},
        ])


# ── 12. Microsoft Learn (static learning paths) ─────────────────────────
class MicrosoftLearnAdapter(SourceAdapter):
    source_name = "microsoft_learn"
    provider = "Microsoft"
    provider_type = "company"
    is_static = True

    PATHS = [
        ("Microsoft Certified: Azure Fundamentals (AZ-900)",
         "https://learn.microsoft.com/en-us/training/paths/describe-azure-services/",
         ["azure", "cloud"]),
        ("Python for the Programmers",
         "https://learn.microsoft.com/en-us/training/paths/python-samples-quick-start/",
         ["python"]),
        ("Introduction to Machine Learning",
         "https://learn.microsoft.com/en-us/azure/machine-learning/user-guide/overview-what-is-azure-machine-learning",
         ["machine-learning"]),
        ("Power BI Data Analyst Essentials",
         "https://learn.microsoft.com/en-us/training/paths/power-bi-data-analyst-essentials/",
         ["power-bi", "data-analysis"]),
        ("Fundamentals of Networking and TCP/IP",
         "https://learn.microsoft.com/en-us/training/paths/networking-fundamentals/",
         ["networking"]),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"mslearn-{i}",
                "title": f"Microsoft Learn — {title}",
                "description": "Free Microsoft learning path with modules, labs and "
                               "assessments.",
                "url": url, "skills": skills, "duration_minutes": 20 * 60,
                "level": "Beginner", "price": 0, "currency": "USD",
                "cert_available": True, "cert_free": False,
                "cert_provider": "Microsoft", "cert_type": "industry_cert",
                "cert_cost_inr": 8000,
                "tags": ["FREE", "TOP_RATED"],
            }
            for i, (title, url, skills) in enumerate(self.PATHS)
        ])


# ── 13. IBM SkillsBuild (static) ───────────────────────────────────────
class IBMSkillsBuildAdapter(SourceAdapter):
    source_name = "ibm_skillsbuild"
    provider = "IBM"
    provider_type = "company"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "ibm-python", "title": "IBM — Python Basics",
             "description": "IBM SkillsBuild free Python fundamentals course.",
             "url": "https://www.ibm.com/skills/course/developer-edx-python-1",
             "skills": ["python"], "duration_minutes": 12 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "IBM", "cert_type": "completion",
             "tags": ["FREE", "FREE_CERT"]},
            {"source_id": "ibm-ai-engineer", "title": "IBM — AI Engineering Fundamentals",
             "description": "Generative AI fundamentals, APIs and RAG patterns on "
                            "watsonx.",
             "url": "https://www.ibm.com/skills/course/developer-generative-ai",
             "skills": ["ai", "llm"], "duration_minutes": 15 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "IBM", "cert_type": "completion",
             "tags": ["FREE", "FREE_CERT", "TRENDING"]},
            {"source_id": "ibm-cloud-practitioner", "title": "IBM — Cloud Computing and Cloud Foundations",
             "description": "Cloud concepts, SaaS/IaaS/PaaS and IBM Cloud basics.",
             "url": "https://www.ibm.com/skills/topic/cloud-computing",
             "skills": ["cloud"], "duration_minutes": 10 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
             "tags": ["FREE"]},
        ])


# ── 14. Meta (static certificates) ──────────────────────────────────────
class MetaAdapter(SourceAdapter):
    source_name = "meta"
    provider = "Meta"
    provider_type = "company"
    is_static = True

    CERTS = [
        ("Meta Front-End Developer", "meta-front-end-development",
         "Front-end development: HTML, CSS, JavaScript and React."),
        ("Meta Back-End Developer", "meta-back-end-development",
         "Back-end development with Node.js, databases and APIs."),
        ("Meta Social Media Marketing", "meta-social-media-marketing",
         "Content strategy, ads manager and performance measurement."),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"meta-{slug.split('-')[-1]}",
                "title": f"Meta — {name}",
                "description": desc,
                "url": f"https://www.coursera.org/professional-certificates/{slug}",
                "skills": [slug.replace("-", " ")],
                "duration_minutes": 250 * 60, "level": "Beginner",
                "price": 0, "currency": "USD",
                "cert_available": True, "cert_free": True,
                "cert_provider": "Meta/Coursera", "cert_type": "industry_cert",
                "tags": ["FREE", "FREE_CERT", "JOB_READY"],
            }
            for name, slug, desc in self.CERTS
        ])


# ── 15. Salesforce Trailhead (static) ──────────────────────────────────
class SalesforceTrailheadAdapter(SourceAdapter):
    source_name = "salesforce_trailhead"
    provider = "Salesforce"
    provider_type = "company"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "sf-sd-badge", "title": "Salesforce Developer Trail (Trailhead)",
             "description": "Apex, Lightning components, SOQL and developer "
                            "fundamentals with free badges.",
             "url": "https://trailhead.salesforce.com/trails/developer-basics",
             "skills": ["salesforce", "apex"], "duration_minutes": 30 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Salesforce", "cert_type": "digital_badge",
             "tags": ["FREE", "FREE_CERT"]},
            {"source_id": "sf-admin", "title": "Salesforce Administrator Trail (Trailhead)",
             "description": "Configuration, security and automation for Salesforce "
                            "admins.",
             "url": "https://trailhead.salesforce.com/trails/admin-basics",
             "skills": ["salesforce", "crm"], "duration_minutes": 40 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Salesforce", "cert_type": "digital_badge",
             "tags": ["FREE", "FREE_CERT", "JOB_READY"]},
            {"source_id": "sf-data-ai", "title": "Data & AI Trail (Trailhead)",
             "description": "Einstein AI, data modelling and analytics on Salesforce.",
             "url": "https://trailhead.salesforce.com/topics/data-ai",
             "skills": ["ai", "data"], "duration_minutes": 20 * 60, "level": "Intermediate",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Salesforce", "cert_type": "digital_badge",
             "tags": ["FREE", "FREE_CERT"]},
        ])


# ── 16. Cisco (static) ──────────────────────────────────────────────────
class CiscoAdapter(SourceAdapter):
    source_name = "cisco"
    provider = "Cisco"
    provider_type = "company"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "cisco-python-start", "title": "Cisco — Python Start",
             "description": "Free beginner Python with SkillsForAll badges.",
             "url": "https://skillsforall.com/course/python-start",
             "skills": ["python"], "duration_minutes": 15 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Cisco", "cert_type": "completion",
             "tags": ["FREE", "FREE_CERT"]},
            {"source_id": "cisco-networking", "title": "Cisco — Networking Start",
             "description": "Networking fundamentals: IP, switching, routing.",
             "url": "https://skillsforall.com/course/networking-start",
             "skills": ["networking"], "duration_minutes": 20 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Cisco", "cert_type": "completion",
             "tags": ["FREE", "BEGINNER_FRIENDLY"]},
            {"source_id": "cisco-cyber", "title": "Cisco — Cybersecurity Start",
             "description": "Security awareness, threat landscape and defensive "
                            "basics.",
             "url": "https://skillsforall.com/course/cybersecurity-start",
             "skills": ["cybersecurity"], "duration_minutes": 12 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "Cisco", "cert_type": "completion",
             "tags": ["FREE", "FREE_CERT"]},
        ])


# ── 17. Oracle (static) ─────────────────────────────────────────────────
class OracleAdapter(SourceAdapter):
    source_name = "oracle"
    provider = "Oracle"
    provider_type = "company"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "ora-java", "title": "Oracle — Java Programming (OCP Track)",
             "description": "Free Java SE fundamentals and OCP prep on Oracle "
                            "University.",
             "url": "https://education.oracle.com/java-programming/",
             "skills": ["java"], "duration_minutes": 40 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": False,
             "cert_provider": "Oracle", "cert_type": "industry_cert", "cert_cost_inr": 10000,
             "tags": ["FREE", "JOB_READY"]},
            {"source_id": "ora-cloud", "title": "Oracle — OCI Cloud Foundations",
             "description": "Oracle Cloud Infrastructure concepts and labs, "
                            "free tier.",
             "url": "https://learn.oracle.com/",
             "skills": ["cloud", "oci"], "duration_minutes": 20 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": False,
             "cert_provider": "Oracle", "cert_type": "industry_cert", "cert_cost_inr": 10000,
             "tags": ["FREE"]},
            {"source_id": "ora-sql", "title": "Oracle — SQL Essentials",
             "description": "SQL fundamentals on Oracle Database with free "
                            "cloud credentials.",
             "url": "https://learn.oracle.com/courses/learn-sql/",
             "skills": ["sql", "database"], "duration_minutes": 15 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
             "tags": ["FREE", "QUICK_WIN"]},
        ])


# ── 18. SAP (static) ────────────────────────────────────────────────────
class SAPAdapter(SourceAdapter):
    source_name = "sap"
    provider = "SAP"
    provider_type = "company"
    is_static = True

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {"source_id": "sap-rpa", "title": "SAP — RPA for Beginners",
             "description": "Robotic process automation with SAP Build and UiPath "
                            "integrations.",
             "url": "https://learning.sap.com/learning-journeys/rpa-for-beginners",
             "skills": ["rpa", "automation"], "duration_minutes": 15 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": True, "cert_free": True,
             "cert_provider": "SAP", "cert_type": "completion",
             "tags": ["FREE", "FREE_CERT"]},
            {"source_id": "sap-fi", "title": "SAP — Financial Accounting Basics",
             "description": "FI fundamentals, journals and reporting on SAP S/4HANA.",
             "url": "https://learning.sap.com/courses/sap-fundamentals-of-financial-accounting",
             "skills": ["finance", "sap"], "duration_minutes": 12 * 60, "level": "Beginner",
             "price": 0, "currency": "USD", "cert_available": False, "cert_free": True,
             "tags": ["FREE"]},
        ])


# ── 19. edX (static popular free courses) ───────────────────────────────
class EdXAdapter(SourceAdapter):
    source_name = "edx"
    provider = "edX"
    provider_type = "platform"
    is_static = True

    COURSES = [
        ("MIT — Introduction to Computer Science (6.001x)",
         "https://www.edx.org/learn/computer-science/mit-introduction-to-computer-science",
         ["algorithms", "python"], "system-design"),
        ("MIT — How to Choose to Become a Billionaire… (Math: Calculus)",
         "https://www.edx.org/learn/calculus/mit-calculus",
         ["calculus"], "ai-ml"),
        ("Harvard — CS50: Introduction to Computer Science",
         "https://www.edx.org/learn/computer-science/harvard-cs50x-introduction-computer-science",
         ["c", "python", "sql"], "web-dev"),
        ("MITx — Introduction to AI",
         "https://www.edx.org/learn/artificial-intelligence/mit-artificial-intelligence",
         ["ai"], "ai-ml"),
        ("Georgia Tech — Introduction to Statistics",
         "https://www.edx.org/learn/statistics/georgia-tech-introduction-statistics",
         ["statistics"], "data-science"),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"edx-{i}",
                "title": title,
                "description": f"edX free-audit course. Skills: {', '.join(skills)}.",
                "url": url, "skills": skills, "duration_minutes": 80 * 60,
                "level": "Beginner", "price": 0, "currency": "USD",
                "cert_available": True, "cert_free": False,
                "cert_provider": "edX", "cert_type": "verified",
                "cert_cost_inr": 3500,
                "tags": ["FREE", "TOP_RATED"],
            }
            for i, (title, url, skills, _sub) in enumerate(self.COURSES)
        ])


# ── 20. Coursera (static popular free audits) ───────────────────────────
class CourseraAdapter(SourceAdapter):
    source_name = "coursera"
    provider = "Coursera"
    provider_type = "platform"
    is_static = True

    COURSES = [
        ("Machine Learning (Stanford)", "machine-learning",
         "https://www.coursera.org/learn/machine-learning",
         ["machine-learning", "python"], "ai-ml"),
        ("Python for Everybody (University of Michigan)", "python-for-everybody",
         "https://www.coursera.org/learn/python-for-everybody",
         ["python"], "web-dev"),
        ("Data Science Specialization (IBM)", "data-science",
         "https://www.coursera.org/specializations/data-science",
         ["r", "machine-learning"], "data-science"),
        ("AI for Everyone (DeepLearning.AI)", "ai-for-everyone",
         "https://www.coursera.org/learn/ai-for-everyone",
         ["ai"], "ai-ml"),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        return self._static([
            {
                "source_id": f"coursera-{slug}",
                "title": title,
                "description": f"Coursera audit-free course. Skills: {', '.join(skills)}.",
                "url": url, "skills": skills, "duration_minutes": 60 * 60,
                "level": "Beginner", "price": 0, "currency": "USD",
                "cert_available": True, "cert_free": False,
                "cert_provider": "Coursera", "cert_type": "verified",
                "cert_cost_inr": 4000,
                "tags": ["FREE", "TOP_RATED"],
            }
            for title, slug, url, skills, _sub in self.COURSES
        ])


# ── 21. Udemy free (live search when UDEMY_API_KEY set) ────────────────
class UdemyFreeAdapter(SourceAdapter):
    source_name = "udemy_free"
    provider = "Udemy"
    provider_type = "platform"
    is_static = True
    api_key_env = "UDEMY_API_KEY"

    SEARCHES = [
        ("python free", "https://www.udemy.com/topic/programming/?price=price-range-0"),
        ("web development free", "https://www.udemy.com/topic/web-development/?price=price-range-0"),
        ("data science free", "https://www.udemy.com/topic/data-science/?price=price-range-0"),
    ]

    async def fetch_courses(self) -> List[Dict[str, Any]]:
        key = os.environ.get(self.api_key_env)
        if not key:
            rows: List[Dict[str, Any]] = []
            for query, url in self.SEARCHES:
                rows.append({
                    "source_id": f"ud-free-{query.split()[0]}",
                    "title": f"Udemy — Free {query.title()} Courses",
                    "description": "Curated list of Udemy free courses in "
                                   f"{query.replace(' free', '')}.",
                    "url": url,
                    "skills": [query.split()[0]],
                    "duration_minutes": None, "level": None,
                    "price": 0, "currency": "USD",
                    "cert_available": False, "cert_free": True,
                    "tags": ["FREE"],
                })
            return self._static(rows)
        docs: List[Dict[str, Any]] = []
        for i, (query, _fallback) in enumerate(self.SEARCHES):
            try:
                data = await self._get_json(
                    "https://api.udemy.com/api/1.0/courses/",
                    params={
                        "page_size": 100, "search": query,
                        "fields[courses]": "title,description,average_rating,"
                                           "enrolled_students,num_reviews,url,pricing,"
                                           "primary_category,level",
                        "sort_by": "reviews_count", "price": "free",
                    },
                    headers={"Authorization": f"Bearer {key}"},
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("[course_agg] udemy_free search %s failed: %s", query, e)
                continue
            for c in data.get("results", []):
                docs.append({
                    "source_id": c.get("url", f"udemy-{i}-{len(docs)}"),
                    "title": c.get("title", "Udemy free course"),
                    "description": (c.get("description") or "")[:300],
                    "url": c.get("url"),
                    "skills": [cat] if (cat := (c.get("primary_category") or {}).get("name")) else [query],
                    "level": c.get("level") or None,
                    "duration_minutes": None,
                    "price": 0, "currency": "USD",
                    "rating": c.get("average_rating"),
                    "enrolled_count": c.get("enrolled_students"),
                    "cert_available": True, "cert_free": True,
                    "cert_provider": "Udemy", "cert_type": "completion",
                    "tags": ["FREE", "FREE_CERT"],
                })
        return docs


ALL_ADAPTERS: List[SourceAdapter] = [
    MITOCWAdapter(), FreeCodeCampAdapter(), OdinProjectAdapter(), NPTELAdapter(),
    KhanAcademyAdapter(), OpenStaxAdapter(), FreeCodeCampYouTubeAdapter(),
    ExercismAdapter(), KaggleAdapter(), GoogleAdapter(), AWSAdapter(),
    MicrosoftLearnAdapter(), IBMSkillsBuildAdapter(), MetaAdapter(),
    SalesforceTrailheadAdapter(), CiscoAdapter(), OracleAdapter(), SAPAdapter(),
    EdXAdapter(), CourseraAdapter(), UdemyFreeAdapter(),
]
ADAPTERS_BY_NAME: Dict[str, SourceAdapter] = {a.source_name: a for a in ALL_ADAPTERS}


# ─── Aggregator pipeline ─────────────────────────────────────────────────
class CourseAggregator:
    def __init__(self, db=_db):
        self.col = db[COL]
        self.runs = db[RUN_META]
        self.meta = db[SOURCE_META]

    async def ensure_indexes(self) -> None:
        await self.col.create_index([("source", 1), ("source_id", 1)], unique=True)
        await self.col.create_index([("category", 1), ("level", 1), ("price", 1)])
        await self.col.create_index(
            [("title", "text"), ("description", "text"), ("skills", "text")])

    def _to_doc(self, adapter: SourceAdapter, raw: Dict[str, Any],
                now: datetime) -> Dict[str, Any]:
        cat = adapter.map_category(raw)
        rating = raw.get("rating")
        enrolled = raw.get("enrolled_count")
        return {
            "source": adapter.source_name,
            "source_id": str(raw.get("source_id")),
            "title": raw.get("title", ""),
            "description": raw.get("description", ""),
            "provider": adapter.provider,
            "provider_type": adapter.provider_type,
            "provider_logo_url": raw.get("provider_logo_url", ""),
            "url": raw.get("url", ""),
            "thumbnail_url": raw.get("thumbnail_url", ""),
            "duration_minutes": raw.get("duration_minutes"),
            "level": cat.get("level") or "Beginner",
            "category": cat.get("category", "tech"),
            "subcategory": cat.get("subcategory", "web-dev"),
            "skills": raw.get("skills", []),
            "language": raw.get("language") or "English",
            "certificate_available": bool(raw.get("cert_available", False)),
            "certificate_cost": raw.get("cert_cost_inr"),
            "certificate_provider": raw.get("cert_provider"),
            "certificate_type": raw.get("cert_type", "none"),
            "certificate_url": raw.get("cert_url"),
            "certificate_free": bool(raw.get("cert_free", False)),
            "price": raw.get("price", 0) or 0,
            "currency": raw.get("currency", "USD"),
            "rating": round(float(rating), 1) if rating is not None else 0.0,
            "enrolled_count": int(enrolled) if enrolled is not None else 0,
            "tags": raw.get("tags", ["FREE"]),
            "status": "active",
            "last_fetched_at": now,
            "created_at": now,
            "updated_at": now,
        }

    async def fetch_source(self, name: str) -> Tuple[Optional[List[Dict[str, Any]]], str]:
        """Returns (docs, status). status ∈ ok | needs_api_key | error."""
        adapter = ADAPTERS_BY_NAME.get(name)
        if adapter is None:
            return None, "unknown_source"
        enabled = await self.source_enabled(name)
        if not enabled:
            return [], "disabled"
        needs_key = adapter.api_key_env and not os.environ.get(adapter.api_key_env)
        if needs_key and not adapter.is_static:
            return [], "needs_api_key"
        client = httpx.AsyncClient(
            timeout=PER_API_TIMEOUT_S, headers={"User-Agent": USER_AGENT})
        adapter.http = client
        try:
            docs = await adapter.fetch_courses()
            return (docs or []), "ok"
        except Exception as e:  # noqa: BLE001 — isolate per adapter
            logger.warning("[course_agg] source %s failed: %s", name, e)
            return [], "error"
        finally:
            await client.aclose()

    async def source_enabled(self, name: str) -> bool:
        doc = await self.meta.find_one({"source": name})
        return doc.get("enabled", True) if doc else True

    async def run_source(self, name: str) -> Dict[str, Any]:
        docs, status = await self.fetch_source(name)
        now = _utcnow()
        if status == "ok":
            upserted = 0
            for d in docs:
                doc = self._to_doc(ADAPTERS_BY_NAME[name], d, now)
                res = await self.col.update_one(
                    {"source": name, "source_id": doc["source_id"]},
                    {"$set": {k: v for k, v in doc.items() if k != "created_at"},
                     "$setOnInsert": {"created_at": now}},
                    upsert=True,
                )
                if res.upserted_id:
                    upserted += 1
            return {"source": name, "status": "ok", "upserted": upserted,
                    "fetched": len(docs)}
        return {"source": name, "status": status, "upserted": 0, "fetched": 0}

    async def mark_stale(self, cutoff_hours: int = STALE_AFTER_HOURS) -> int:
        cutoff = _utcnow() - timedelta(hours=cutoff_hours)
        res = await self.col.update_many(
            {"last_fetched_at": {"$lt": cutoff}, "status": "active"},
            {"$set": {"status": "stale", "updated_at": _utcnow()}},
        )
        return res.modified_count

    async def run(self, source: Optional[str] = None) -> Dict[str, Any]:
        await self.ensure_indexes()
        names = [source] if source else list(ADAPTERS_BY_NAME)
        summary = await asyncio.gather(*(self.run_source(n) for n in names))
        stale = await self.mark_stale()
        report = {
            "ran_at": _utcnow().isoformat(),
            "results": list(summary),
            "stale_marked": stale,
            "total_external": await self.col.count_documents({}),
        }
        await self.runs.insert_one({**report, "_id": ObjectId()})
        logger.info("[course_agg] run complete: %d sources, %d stale",
                    len(summary), stale)
        return report

    async def status(self) -> Dict[str, Any]:
        last = await self.runs.find_one({}, sort=[("ran_at", -1)])
        per_source = []
        for name in ADAPTERS_BY_NAME:
            sdoc = await self.meta.find_one({"source": name})
            latest = await self.col.find_one(
                {"source": name}, sort=[("last_fetched_at", -1)])
            count = await self.col.count_documents({"source": name})
            per_source.append({
                "source": name,
                "enabled": sdoc.get("enabled", True) if sdoc else True,
                "doc_count": count,
                "last_fetched_at": latest.get("last_fetched_at") if latest else None,
                "needs_api_key": bool(ADAPTERS_BY_NAME[name].api_key_env)
                                 and not os.environ.get(
                                     ADAPTERS_BY_NAME[name].api_key_env),
            })
        return {
            "collection": COL,
            "last_run_at": last.get("ran_at") if last else None,
            "last_results": last.get("results") if last else [],
            "total_external": await self.col.count_documents({}),
            "sources": per_source,
        }


aggregator = CourseAggregator()


async def run_aggregation(source: Optional[str] = None) -> Dict[str, Any]:
    return await aggregator.run(source)


# ─── Scheduler ───────────────────────────────────────────────────────────
_aggregator_scheduler = None


def _flag_set(var: str, default: str) -> bool:
    return (os.environ.get(var) or default).strip().lower() in {"1", "true", "yes", "on"}


def start_course_aggregator_scheduler() -> None:
    """Start the daily 02:00 UTC cron + optional startup catch-up run.
    Called from server.py under leader election (single-worker safe)."""
    global _aggregator_scheduler
    if _aggregator_scheduler is not None:
        return
    if not _flag_set("AGGREGATOR_CRON_ENABLED", "1"):
        logger.info("[course_agg] cron disabled via AGGREGATOR_CRON_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz
        _aggregator_scheduler = AsyncIOScheduler(timezone=pytz.UTC)
        _aggregator_scheduler.add_job(
            run_aggregation,
            CronTrigger(hour=2, minute=0),
            id="course_aggregator_daily",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _aggregator_scheduler.start()
        logger.info("[course_agg] daily aggregator cron started (02:00 UTC)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[course_agg] failed to start scheduler: %s", e)

    # Startup catch-up: run now if the last run is >24h old (or never ran).
    if _flag_set("AGGREGATOR_RUN_ON_STARTUP", "1"):
        async def _startup_run():
            try:
                last = await aggregator.runs.find_one({}, sort=[("ran_at", -1)])
                last_at = last.get("ran_at") if last else None
                if last_at:
                    last_dt = datetime.fromisoformat(last_at)
                    if _utcnow() - last_dt < timedelta(hours=STARTUP_STALE_HOURS):
                        return
                await run_aggregation()
            except Exception as e:  # noqa: BLE001
                logger.warning("[course_agg] startup run failed: %s", e)
        asyncio.ensure_future(_startup_run())


def stop_course_aggregator_scheduler() -> None:
    global _aggregator_scheduler
    if _aggregator_scheduler is not None:
        try:
            _aggregator_scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
        _aggregator_scheduler = None


# ─── Frontend Course shape conversion ───────────────────────────────────
def external_to_frontend(d: Dict[str, Any]) -> Dict[str, Any]:
    """Convert an ``external_courses`` Mongo doc to the /courses/list shape
    the frontend Course type consumes."""
    duration_hours = (d.get("duration_minutes") or 0) / 60.0
    price = d.get("price", 0) or 0
    free = price == 0
    cost_inr = d.get("certificate_cost")
    return {
        "id": f"ext-{d.get('source')}:{d.get('source_id')}",
        "source": d.get("source", "external"),
        "title": d.get("title", ""),
        "short_desc": (d.get("description") or "")[:180],
        "provider": {
            "name": d.get("provider", ""),
            "type": d.get("provider_type", "platform"),
            "logo": d.get("provider_logo_url", ""),
        },
        "instructors": [d.get("provider")] if d.get("provider") else [],
        "category": d.get("category", "tech"),
        "subcategory": d.get("subcategory", "web-dev"),
        "level": d.get("level", "Beginner"),
        "language": d.get("language", "English"),
        "duration_hours": round(duration_hours),
        "duration_label": "Self-paced",
        "enrolled_count": d.get("enrolled_count", 0),
        "rating": d.get("rating", 0.0),
        "review_count": 0,
        "pricing": {
            "type": "free" if free else "paid",
            "original_inr": 0,
            "sa_inr": 0,
        },
        "certification": {
            "available": d.get("certificate_available", False),
            "free": d.get("certificate_free", False),
            "type": d.get("certificate_type", "none"),
            "accreditor": d.get("certificate_provider"),
            "recognised": False,
            "cost_inr": cost_inr or 0,
        },
        "thumbnail": d.get("thumbnail_url") or "🌐",
        "enroll_url": d.get("url", ""),
        "tags": d.get("tags", ["FREE"]),
        "skills": d.get("skills", []),
    }


async def fetch_external_courses(category: str = "all",
                                subcategory: str = "all",
                                pricing: str = "all",
                                level: str = "all",
                                q: str = "") -> List[Dict[str, Any]]:
    """Read external courses from Mongo (active + stale) and apply the same
    filters /courses/list supports."""
    docs = await _db[COL].find(
        {"status": {"$in": ["active", "stale"]}}
    ).to_list(length=5000)
    items = [external_to_frontend(d) for d in docs]
    if category and category != "all":
        items = [c for c in items if c["category"] == category]
    if subcategory and subcategory != "all":
        items = [c for c in items if c["subcategory"] == subcategory]
    if pricing and pricing != "all":
        if pricing == "free":
            items = [c for c in items if c["pricing"]["type"] == "free"]
        elif pricing == "paid":
            items = [c for c in items if c["pricing"]["type"] == "paid"]
        elif pricing == "discounted":
            items = [c for c in items if False]
    if level and level != "all":
        items = [c for c in items if c["level"].lower() == level.lower()]
    if q:
        ql = q.lower()
        items = [c for c in items
                 if ql in c["title"].lower()
                 or ql in c["short_desc"].lower()
                 or ql in c["provider"]["name"].lower()
                 or any(ql in s.lower() for s in c.get("skills", []))]
    return items


# ─── Admin endpoints ─────────────────────────────────────────────────────
from core.deps import get_current_user  # noqa: E402


async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    """Strict super_admin gate (require_role would let 'admin' through via
    the admin-bypass; the roadmap spec says these endpoints are
    super_admin only)."""
    if (user.get("role") or "").lower() not in {"super_admin", "superadmin"}:
        raise HTTPException(403, "super_admin role required")
    return user


admin_router = APIRouter(
    prefix="/admin/aggregator",
    tags=["admin-course-aggregator"],
)


class SourceToggle(BaseModel):
    enabled: bool


@admin_router.get("/status")
async def aggregator_status(user: dict = Depends(require_super_admin)):
    return await aggregator.status()


@admin_router.patch("/sources/{name}")
async def toggle_source(name: str, body: SourceToggle,
                        user: dict = Depends(require_super_admin)):
    if name not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown aggregator source '{name}'")
    await aggregator.meta.update_one(
        {"source": name},
        {"$set": {"enabled": body.enabled, "updated_at": _utcnow()}},
        upsert=True,
    )
    return {"source": name, "enabled": body.enabled}


@admin_router.post("/run")
async def trigger_run(source: Optional[str] = Query(None),
                      user: dict = Depends(require_super_admin)):
    if source and source not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown aggregator source '{source}'")
    report = await run_aggregation(source)
    return {"ok": True, **report}
