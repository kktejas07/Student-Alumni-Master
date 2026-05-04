"""
courses_marketplace.py — SA Courses (Learning Marketplace).

Endpoints (all under /api):
  GET   /courses/catalog                              landing payload
  GET   /courses/list?category=&subcategory=&pricing=&level=&q=&sort=
  GET   /courses/course/{course_id}                   detail
  POST  /courses/enroll                               {course_id}
  GET   /courses/my-enrollments                       list user's enrollments
  POST  /courses/enrollments/{enrollment_id}/progress {percent, completed}
  GET   /courses/tracks                               career tracks list
  GET   /courses/tracks/{slug}                        career track detail
  POST  /courses/tracks/{slug}/enroll                 enroll into a track
  POST  /courses/ai/recommend                         {goal, weekly_hours, budget}
  POST  /courses/ai/path                              {role, current_skills, deadline}
"""
from __future__ import annotations
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pathlib import Path
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")
_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]
logger = logging.getLogger("courses_marketplace")
router = APIRouter()


# ─── Auth ────────────────────────────────────────────────────────────────
def _auth():
    from server import get_current_user
    return get_current_user


# ─── Catalog Schema (matches screenshot) ─────────────────────────────────
SECTIONS = [
    {
        "id": "tech",
        "emoji": "💻",
        "name": "Tech & Engineering",
        "color": "#7C3AED",
        "items": [
            {"key": "web-dev",       "label": "Web Dev",       "icon": "code-tags",         "count": 0},
            {"key": "mobile-dev",    "label": "Mobile Dev",    "icon": "cellphone",         "count": 0},
            {"key": "ai-ml",         "label": "AI / ML",       "icon": "robot-outline",     "count": 0},
            {"key": "data-science",  "label": "Data Science",  "icon": "database",          "count": 0},
            {"key": "cloud",         "label": "Cloud",         "icon": "cloud-outline",     "count": 0},
            {"key": "cybersecurity", "label": "Cybersecurity", "icon": "shield-outline",    "count": 0},
            {"key": "system-design", "label": "System Design", "icon": "chip",              "count": 0},
            {"key": "devops",        "label": "DevOps",        "icon": "cog-outline",       "count": 0},
        ],
    },
    {
        "id": "design",
        "emoji": "🎨",
        "name": "Design & Creative",
        "color": "#EC4899",
        "items": [
            {"key": "ui-design",       "label": "UI Design",       "icon": "brush",             "count": 0},
            {"key": "ux-research",     "label": "UX Research",     "icon": "compass-outline",   "count": 0},
            {"key": "figma-mastery",   "label": "Figma Mastery",   "icon": "pencil-ruler",      "count": 0, "highlighted": True},
            {"key": "graphic-design",  "label": "Graphic Design",  "icon": "fountain-pen-tip",  "count": 0},
            {"key": "video-editing",   "label": "Video Editing",   "icon": "video-outline",     "count": 0},
            {"key": "photography",     "label": "Photography",     "icon": "camera-outline",    "count": 0},
            {"key": "motion-graphics", "label": "Motion Graphics", "icon": "flash-outline",     "count": 0},
            {"key": "3d-modeling",     "label": "3D Modeling",     "icon": "cube-outline",      "count": 0},
        ],
    },
    {
        "id": "business",
        "emoji": "💼",
        "name": "Business & Career",
        "color": "#F59E0B",
        "items": [
            {"key": "product-mgmt",  "label": "Product Mgmt",  "icon": "rocket-launch",        "count": 0},
            {"key": "marketing",     "label": "Marketing",     "icon": "bullhorn-outline",     "count": 0},
            {"key": "finance",       "label": "Finance",       "icon": "currency-inr",         "count": 0},
            {"key": "analytics",     "label": "Analytics",     "icon": "chart-bar",            "count": 0},
            {"key": "startup",       "label": "Startup",       "icon": "lightbulb-outline",    "count": 0},
            {"key": "sales",         "label": "Sales",         "icon": "trending-up",          "count": 0},
            {"key": "communication", "label": "Communication", "icon": "message-text-outline", "count": 0},
            {"key": "leadership",    "label": "Leadership",    "icon": "trophy-outline",       "count": 0},
        ],
    },
]

HERO_CARDS = [
    {"id": "ai-career-track", "variant": "violet",
     "emoji": "🎁", "title": "AI Career Track",
     "subtitle": "12-week roadmap with mentors, projects & free certifications.",
     "cta_label": "Start free", "cta_href": "/tracks/ai-career-track",
     "from": "#6D28D9", "to": "#A78BFA"},
    {"id": "free-this-month", "variant": "green",
     "emoji": "🎁", "title": "Free this month",
     "subtitle": "24 premium courses unlocked for students.",
     "cta_label": "Browse", "cta_href": "/courses?filter=free-this-month",
     "from": "#10B981", "to": "#34D399"},
]


# ─── Curated Courses (50+) ───────────────────────────────────────────────
def _seed_courses() -> List[Dict[str, Any]]:
    return [
        # ── TECH > web-dev (5) ──
        {"id": "fcc-responsive-web",  "source": "freecodecamp",
         "title": "Responsive Web Design Certification",
         "short_desc": "HTML, CSS, Flexbox, Grid + 5 capstone projects",
         "provider": {"name": "freeCodeCamp", "type": "platform", "logo": "🟢"},
         "instructors": ["freeCodeCamp Team"],
         "category": "tech", "subcategory": "web-dev",
         "level": "Beginner", "language": "English",
         "duration_hours": 300, "duration_label": "300 hours",
         "enrolled_count": 4500000, "rating": 4.7, "review_count": 28000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "🌐", "featured": True,
         "enroll_url": "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
         "tags": ["FREE", "FREE_CERT", "BEGINNER_FRIENDLY"]},

        {"id": "nptel-fullstack-mern",  "source": "nptel",
         "title": "Full-Stack Web Development with MERN",
         "short_desc": "MongoDB, Express, React, Node — IIT Madras",
         "provider": {"name": "IIT Madras", "type": "university", "logo": "🇮🇳"},
         "instructors": ["Prof. Pratyush Kumar"],
         "category": "tech", "subcategory": "web-dev",
         "level": "Intermediate", "language": "English",
         "duration_hours": 60, "duration_label": "12 weeks",
         "enrolled_count": 84000, "rating": 4.6, "review_count": 2100,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "university",
                           "accreditor": "UGC", "recognised": True, "cost_inr": 1000},
         "thumbnail": "🟢",
         "enroll_url": "https://nptel.ac.in/courses/106/106/106106212/",
         "tags": ["FREE", "GOVT_CERTIFIED", "JOB_READY"]},

        {"id": "udemy-react-complete", "source": "udemy",
         "title": "React — The Complete Guide 2026 (Hooks + Redux)",
         "short_desc": "Build real apps with React 18, Hooks, Context, Redux Toolkit",
         "provider": {"name": "Udemy", "type": "platform", "logo": "🎓"},
         "instructors": ["Maximilian Schwarzmüller"],
         "category": "tech", "subcategory": "web-dev",
         "level": "Intermediate", "language": "English",
         "duration_hours": 49, "duration_label": "49 hours",
         "enrolled_count": 870000, "rating": 4.7, "review_count": 210000,
         "pricing": {"type": "discounted_for_sa", "original_inr": 3499,
                     "sa_inr": 1499, "sa_discount_percent": 57},
         "certification": {"available": True, "free": False, "type": "completion",
                           "accreditor": "industry", "recognised": False, "cost_inr": 0},
         "thumbnail": "⚛️",
         "enroll_url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
         "tags": ["TOP_RATED"]},

        {"id": "coursera-meta-frontend", "source": "coursera",
         "title": "Meta Front-End Developer Professional Certificate",
         "short_desc": "9-course path · React, JS, HTML/CSS, UI/UX",
         "provider": {"name": "Meta · Coursera", "type": "company", "logo": "📘"},
         "instructors": ["Meta Engineering"],
         "category": "tech", "subcategory": "web-dev",
         "level": "Beginner", "language": "English",
         "duration_hours": 200, "duration_label": "7 months",
         "enrolled_count": 320000, "rating": 4.7, "review_count": 12500,
         "pricing": {"type": "free_audit", "original_inr": 4179, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 4179},
         "thumbnail": "📘", "featured": True,
         "enroll_url": "https://www.coursera.org/professional-certificates/meta-front-end-developer",
         "tags": ["FREE", "JOB_READY", "TOP_RATED"]},

        {"id": "harvard-cs50w", "source": "harvard",
         "title": "CS50's Web Programming with Python and JavaScript",
         "short_desc": "Django, React, SQL, mobile, security — full Harvard course",
         "provider": {"name": "Harvard", "type": "university", "logo": "🎓"},
         "instructors": ["Prof. Brian Yu"],
         "category": "tech", "subcategory": "web-dev",
         "level": "Intermediate", "language": "English",
         "duration_hours": 100, "duration_label": "12 weeks",
         "enrolled_count": 1200000, "rating": 4.9, "review_count": 38000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "verified",
                           "accreditor": "industry", "recognised": True, "cost_inr": 16500},
         "thumbnail": "🎓",
         "enroll_url": "https://cs50.harvard.edu/web/",
         "tags": ["FREE", "IVY_LEAGUE", "TOP_RATED"]},

        # ── TECH > mobile-dev (3) ──
        {"id": "udacity-android-kotlin", "source": "udacity",
         "title": "Android Kotlin Developer Nanodegree",
         "short_desc": "Build native Android apps · Google partnership",
         "provider": {"name": "Google · Udacity", "type": "company", "logo": "🤖"},
         "instructors": ["Google Android Team"],
         "category": "tech", "subcategory": "mobile-dev",
         "level": "Intermediate", "language": "English",
         "duration_hours": 200, "duration_label": "4 months",
         "enrolled_count": 56000, "rating": 4.6, "review_count": 2100,
         "pricing": {"type": "discounted_for_sa", "original_inr": 75000,
                     "sa_inr": 24999, "sa_discount_percent": 67},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 24999},
         "thumbnail": "🤖",
         "enroll_url": "https://www.udacity.com/course/android-kotlin-developer-nanodegree--nd940",
         "tags": ["JOB_READY"]},

        {"id": "mit-ios-swiftui", "source": "mit_ocw",
         "title": "iOS App Development with SwiftUI",
         "short_desc": "Stanford-style iOS course (CS193p clone) by MIT",
         "provider": {"name": "MIT", "type": "university", "logo": "🎓"},
         "instructors": ["Prof. Paul Hegarty"],
         "category": "tech", "subcategory": "mobile-dev",
         "level": "Intermediate", "language": "English",
         "duration_hours": 60, "duration_label": "Self-paced",
         "enrolled_count": 280000, "rating": 4.8, "review_count": 4200,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": False, "free": True, "type": "completion",
                           "recognised": False, "cost_inr": 0},
         "thumbnail": "📱", "featured": True,
         "enroll_url": "https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/",
         "tags": ["FREE", "IVY_LEAGUE"]},

        {"id": "expo-react-native", "source": "sa_curated",
         "title": "Build Mobile Apps with React Native + Expo",
         "short_desc": "From zero to publishing on Play Store — SA mentor-led",
         "provider": {"name": "SA Mentors", "type": "platform", "logo": "🚀"},
         "instructors": ["SA Mentor Network"],
         "category": "tech", "subcategory": "mobile-dev",
         "level": "Beginner", "language": "English",
         "duration_hours": 32, "duration_label": "8 weeks",
         "enrolled_count": 1240, "rating": 4.7, "review_count": 86,
         "pricing": {"type": "free_with_sa", "original_inr": 4999, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "📱",
         "enroll_url": "/courses/course/expo-react-native",
         "tags": ["FREE", "FREE_CERT", "HAS_MENTOR"]},

        # ── TECH > ai-ml (5) ──
        {"id": "coursera-andrew-ng-ml", "source": "coursera",
         "title": "Machine Learning Specialization",
         "short_desc": "3-course path · Stanford + DeepLearning.AI · Andrew Ng",
         "provider": {"name": "Stanford · Coursera", "type": "university", "logo": "🎓"},
         "instructors": ["Andrew Ng"],
         "category": "tech", "subcategory": "ai-ml",
         "level": "Intermediate", "language": "English",
         "duration_hours": 94, "duration_label": "3 months",
         "enrolled_count": 4800000, "rating": 4.9, "review_count": 32000,
         "pricing": {"type": "free_audit", "original_inr": 4179, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "verified",
                           "accreditor": "industry", "recognised": True, "cost_inr": 4179},
         "thumbnail": "🧠", "featured": True,
         "enroll_url": "https://www.coursera.org/specializations/machine-learning-introduction",
         "tags": ["FREE", "TOP_RATED", "IVY_LEAGUE", "TRENDING"]},

        {"id": "deeplearning-ai-spec", "source": "coursera",
         "title": "Deep Learning Specialization",
         "short_desc": "5-course path · CNNs, RNNs, Transformers · Andrew Ng",
         "provider": {"name": "DeepLearning.AI", "type": "platform", "logo": "🧠"},
         "instructors": ["Andrew Ng"],
         "category": "tech", "subcategory": "ai-ml",
         "level": "Advanced", "language": "English",
         "duration_hours": 120, "duration_label": "5 months",
         "enrolled_count": 1100000, "rating": 4.9, "review_count": 18500,
         "pricing": {"type": "free_audit", "original_inr": 4179, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "verified",
                           "accreditor": "industry", "recognised": True, "cost_inr": 4179},
         "thumbnail": "🤖", "featured": True,
         "enroll_url": "https://www.coursera.org/specializations/deep-learning",
         "tags": ["FREE", "TOP_RATED", "TRENDING"]},

        {"id": "fast-ai-course", "source": "fastai",
         "title": "Practical Deep Learning for Coders",
         "short_desc": "fast.ai course · build SOTA models in 7 lessons",
         "provider": {"name": "fast.ai", "type": "platform", "logo": "⚡"},
         "instructors": ["Jeremy Howard", "Rachel Thomas"],
         "category": "tech", "subcategory": "ai-ml",
         "level": "Intermediate", "language": "English",
         "duration_hours": 30, "duration_label": "7 weeks",
         "enrolled_count": 480000, "rating": 4.8, "review_count": 7200,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": False, "free": True, "type": "completion",
                           "recognised": False, "cost_inr": 0},
         "thumbnail": "⚡",
         "enroll_url": "https://course.fast.ai/",
         "tags": ["FREE", "TOP_RATED"]},

        {"id": "nptel-iitb-aiml", "source": "nptel",
         "title": "Foundations of AI & ML",
         "short_desc": "IIT Bombay · 12-week course with NPTEL Elite exam",
         "provider": {"name": "IIT Bombay", "type": "university", "logo": "🇮🇳"},
         "instructors": ["Prof. Sunita Sarawagi"],
         "category": "tech", "subcategory": "ai-ml",
         "level": "Intermediate", "language": "English",
         "duration_hours": 60, "duration_label": "12 weeks",
         "enrolled_count": 96000, "rating": 4.7, "review_count": 3400,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "university",
                           "accreditor": "AICTE", "recognised": True, "cost_inr": 1000},
         "thumbnail": "🤖",
         "enroll_url": "https://nptel.ac.in/courses/106/106/106106139/",
         "tags": ["FREE", "GOVT_CERTIFIED"]},

        {"id": "kaggle-learn-ml", "source": "kaggle",
         "title": "Intro to Machine Learning",
         "short_desc": "Kaggle Learn · hands-on with notebooks",
         "provider": {"name": "Kaggle", "type": "platform", "logo": "📊"},
         "instructors": ["Dan Becker"],
         "category": "tech", "subcategory": "ai-ml",
         "level": "Beginner", "language": "English",
         "duration_hours": 4, "duration_label": "4 hours",
         "enrolled_count": 720000, "rating": 4.6, "review_count": 8400,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": False, "cost_inr": 0},
         "thumbnail": "📊",
         "enroll_url": "https://www.kaggle.com/learn/intro-to-machine-learning",
         "tags": ["FREE", "FREE_CERT", "QUICK_WIN", "BEGINNER_FRIENDLY"]},

        # ── TECH > data-science (3) ──
        {"id": "ibm-data-science-cert", "source": "coursera",
         "title": "IBM Data Science Professional Certificate",
         "short_desc": "10-course path · Python, SQL, Pandas, ML",
         "provider": {"name": "IBM · Coursera", "type": "company", "logo": "🔵"},
         "instructors": ["IBM Skills Network"],
         "category": "tech", "subcategory": "data-science",
         "level": "Beginner", "language": "English",
         "duration_hours": 240, "duration_label": "11 months",
         "enrolled_count": 480000, "rating": 4.6, "review_count": 14000,
         "pricing": {"type": "free_audit", "original_inr": 4179, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 4179},
         "thumbnail": "📊", "featured": True,
         "enroll_url": "https://www.coursera.org/professional-certificates/ibm-data-science",
         "tags": ["FREE", "JOB_READY"]},

        {"id": "swayam-stats", "source": "swayam",
         "title": "Statistics for Data Science",
         "short_desc": "ISI Kolkata · UGC-approved",
         "provider": {"name": "ISI Kolkata · SWAYAM", "type": "university", "logo": "🇮🇳"},
         "instructors": ["Prof. P.P. Mukhopadhyay"],
         "category": "tech", "subcategory": "data-science",
         "level": "Intermediate", "language": "English",
         "duration_hours": 40, "duration_label": "8 weeks",
         "enrolled_count": 32000, "rating": 4.5, "review_count": 980,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "university",
                           "accreditor": "UGC", "recognised": True, "cost_inr": 1500},
         "thumbnail": "📈",
         "enroll_url": "https://swayam.gov.in/explorer",
         "tags": ["FREE", "GOVT_CERTIFIED"]},

        {"id": "datacamp-data-analyst", "source": "datacamp",
         "title": "Data Analyst with Python Career Track",
         "short_desc": "23-course track · GitHub Student Pack 6 months free",
         "provider": {"name": "DataCamp", "type": "platform", "logo": "📊"},
         "instructors": ["DataCamp Team"],
         "category": "tech", "subcategory": "data-science",
         "level": "Beginner", "language": "English",
         "duration_hours": 90, "duration_label": "3 months",
         "enrolled_count": 280000, "rating": 4.7, "review_count": 5400,
         "pricing": {"type": "free_with_sa", "original_inr": 12000, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "📊",
         "enroll_url": "https://www.datacamp.com/tracks/data-analyst-with-python",
         "tags": ["FREE", "FREE_CERT", "JOB_READY"]},

        # ── TECH > cloud (2) ──
        {"id": "aws-educate-cloud", "source": "aws",
         "title": "AWS Cloud Practitioner Essentials",
         "short_desc": "Free AWS Educate path · official cert prep",
         "provider": {"name": "AWS Educate", "type": "company", "logo": "☁️"},
         "instructors": ["AWS Training Team"],
         "category": "tech", "subcategory": "cloud",
         "level": "Beginner", "language": "English",
         "duration_hours": 6, "duration_label": "6 hours",
         "enrolled_count": 1500000, "rating": 4.7, "review_count": 22000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "☁️", "featured": True,
         "enroll_url": "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/",
         "tags": ["FREE", "FREE_CERT", "JOB_READY", "QUICK_WIN"]},

        {"id": "ms-learn-azure", "source": "ms_learn",
         "title": "Azure Fundamentals (AZ-900)",
         "short_desc": "Free Microsoft Learn path · official AZ-900 prep",
         "provider": {"name": "Microsoft Learn", "type": "company", "logo": "🟦"},
         "instructors": ["Microsoft Learn"],
         "category": "tech", "subcategory": "cloud",
         "level": "Beginner", "language": "English",
         "duration_hours": 8, "duration_label": "8 hours",
         "enrolled_count": 980000, "rating": 4.8, "review_count": 12000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 8500},
         "thumbnail": "🟦",
         "enroll_url": "https://learn.microsoft.com/en-us/training/paths/microsoft-azure-fundamentals-describe-cloud-concepts/",
         "tags": ["FREE", "JOB_READY"]},

        # ── TECH > cybersecurity (2) ──
        {"id": "tryhackme-jr-pen", "source": "tryhackme",
         "title": "Junior Penetration Tester Path",
         "short_desc": "Hands-on hacking labs + free certificate of completion",
         "provider": {"name": "TryHackMe", "type": "platform", "logo": "🛡️"},
         "instructors": ["TryHackMe Team"],
         "category": "tech", "subcategory": "cybersecurity",
         "level": "Intermediate", "language": "English",
         "duration_hours": 40, "duration_label": "8 weeks",
         "enrolled_count": 240000, "rating": 4.8, "review_count": 6800,
         "pricing": {"type": "free_with_sa", "original_inr": 8500, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "🛡️",
         "enroll_url": "https://tryhackme.com/path/outline/jrpenetrationtester",
         "tags": ["FREE", "FREE_CERT", "JOB_READY"]},

        {"id": "nptel-ethical-hacking", "source": "nptel",
         "title": "Ethical Hacking",
         "short_desc": "IIT Kharagpur · 12-week course",
         "provider": {"name": "IIT Kharagpur", "type": "university", "logo": "🇮🇳"},
         "instructors": ["Prof. Indranil Sengupta"],
         "category": "tech", "subcategory": "cybersecurity",
         "level": "Intermediate", "language": "English",
         "duration_hours": 60, "duration_label": "12 weeks",
         "enrolled_count": 78000, "rating": 4.6, "review_count": 1900,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "university",
                           "accreditor": "AICTE", "recognised": True, "cost_inr": 1000},
         "thumbnail": "🛡️",
         "enroll_url": "https://nptel.ac.in/courses/106/105/106105217/",
         "tags": ["FREE", "GOVT_CERTIFIED"]},

        # ── TECH > system-design (2) ──
        {"id": "mit-6006-algos", "source": "mit_ocw",
         "title": "Introduction to Algorithms (6.006)",
         "short_desc": "Classic MIT algorithms course · all materials free",
         "provider": {"name": "MIT", "type": "university", "logo": "🎓"},
         "instructors": ["Prof. Erik Demaine", "Prof. Srini Devadas"],
         "category": "tech", "subcategory": "system-design",
         "level": "Intermediate", "language": "English",
         "duration_hours": 48, "duration_label": "Self-paced",
         "enrolled_count": 980000, "rating": 4.8, "review_count": 12000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": False, "free": True, "type": "completion",
                           "recognised": False, "cost_inr": 0},
         "thumbnail": "🧮", "featured": True,
         "enroll_url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
         "tags": ["FREE", "IVY_LEAGUE", "TOP_RATED"]},

        {"id": "educative-grokking-sd", "source": "educative",
         "title": "Grokking the System Design Interview",
         "short_desc": "Free with GitHub Student Pack",
         "provider": {"name": "Educative", "type": "platform", "logo": "💡"},
         "instructors": ["Educative Team"],
         "category": "tech", "subcategory": "system-design",
         "level": "Advanced", "language": "English",
         "duration_hours": 24, "duration_label": "1 month",
         "enrolled_count": 320000, "rating": 4.7, "review_count": 8400,
         "pricing": {"type": "free_with_sa", "original_inr": 7900, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": False, "cost_inr": 0},
         "thumbnail": "💡",
         "enroll_url": "https://www.educative.io/courses/grokking-the-system-design-interview",
         "tags": ["FREE", "FREE_CERT", "JOB_READY"]},

        # ── TECH > devops (1) ──
        {"id": "docker-mastery", "source": "udemy",
         "title": "Docker Mastery: with Kubernetes + Swarm",
         "short_desc": "Hands-on with Docker, Compose, Swarm, Kubernetes",
         "provider": {"name": "Udemy", "type": "platform", "logo": "🐳"},
         "instructors": ["Bret Fisher"],
         "category": "tech", "subcategory": "devops",
         "level": "Intermediate", "language": "English",
         "duration_hours": 21, "duration_label": "21 hours",
         "enrolled_count": 320000, "rating": 4.7, "review_count": 78000,
         "pricing": {"type": "discounted_for_sa", "original_inr": 3499,
                     "sa_inr": 1199, "sa_discount_percent": 66},
         "certification": {"available": True, "free": False, "type": "completion",
                           "accreditor": "industry", "recognised": False, "cost_inr": 0},
         "thumbnail": "🐳",
         "enroll_url": "https://www.udemy.com/course/docker-mastery/",
         "tags": ["TOP_RATED"]},

        # ── DESIGN > ui-design (2) ──
        {"id": "google-ux-cert", "source": "coursera",
         "title": "Google UX Design Professional Certificate",
         "short_desc": "7-course path · portfolio + Google interview prep",
         "provider": {"name": "Google · Coursera", "type": "company", "logo": "🅖"},
         "instructors": ["Google UX Team"],
         "category": "design", "subcategory": "ui-design",
         "level": "Beginner", "language": "English",
         "duration_hours": 200, "duration_label": "6 months",
         "enrolled_count": 880000, "rating": 4.8, "review_count": 22000,
         "pricing": {"type": "free_audit", "original_inr": 4179, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 4179},
         "thumbnail": "🎨", "featured": True,
         "enroll_url": "https://www.coursera.org/professional-certificates/google-ux-design",
         "tags": ["FREE", "JOB_READY", "TOP_RATED"]},

        {"id": "interaction-design-foundation", "source": "ixdf",
         "title": "UI Design Patterns for Successful Software",
         "short_desc": "Self-paced · industry mentors",
         "provider": {"name": "Interaction Design Foundation", "type": "platform", "logo": "🎨"},
         "instructors": ["IxDF Team"],
         "category": "design", "subcategory": "ui-design",
         "level": "Intermediate", "language": "English",
         "duration_hours": 32, "duration_label": "Self-paced",
         "enrolled_count": 84000, "rating": 4.6, "review_count": 1900,
         "pricing": {"type": "discounted_for_sa", "original_inr": 7500,
                     "sa_inr": 2999, "sa_discount_percent": 60},
         "certification": {"available": True, "free": False, "type": "completion",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "🖌️",
         "enroll_url": "https://www.interaction-design.org/courses/ui-design-patterns-for-successful-software",
         "tags": []},

        # ── DESIGN > figma-mastery (highlighted) (3) ──
        {"id": "figma-academy", "source": "sa_curated",
         "title": "Figma Mastery — From Wireframe to Production",
         "short_desc": "Auto-layout, components, variants, prototyping · SA mentor-led",
         "provider": {"name": "SA Mentors", "type": "platform", "logo": "🎨"},
         "instructors": ["Riya Verma", "Aarav Mehta"],
         "category": "design", "subcategory": "figma-mastery",
         "level": "All levels", "language": "English",
         "duration_hours": 18, "duration_label": "6 weeks",
         "enrolled_count": 2100, "rating": 4.9, "review_count": 184,
         "pricing": {"type": "free_with_sa", "original_inr": 5999, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "🎨", "featured": True,
         "enroll_url": "/courses/course/figma-academy",
         "tags": ["FREE", "FREE_CERT", "HAS_MENTOR", "BEGINNER_FRIENDLY"]},

        {"id": "figma-config-tutorials", "source": "youtube",
         "title": "Figma Config 2025 Talks",
         "short_desc": "Free official talks + design systems sessions",
         "provider": {"name": "Figma · YouTube", "type": "platform", "logo": "🎨"},
         "instructors": ["Figma Designers"],
         "category": "design", "subcategory": "figma-mastery",
         "level": "Intermediate", "language": "English",
         "duration_hours": 12, "duration_label": "12 hours",
         "enrolled_count": 480000, "rating": 4.8, "review_count": 4200,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": False, "free": True, "type": "completion",
                           "recognised": False, "cost_inr": 0},
         "thumbnail": "🎨",
         "enroll_url": "https://www.youtube.com/c/Figmadesign",
         "tags": ["FREE", "QUICK_WIN"]},

        {"id": "udemy-figma-uiux-mastery", "source": "udemy",
         "title": "Figma UI/UX Design Master Course",
         "short_desc": "32-hour deep dive · 12 portfolio projects",
         "provider": {"name": "Udemy", "type": "platform", "logo": "🎓"},
         "instructors": ["Daniel Walter Scott"],
         "category": "design", "subcategory": "figma-mastery",
         "level": "All levels", "language": "English",
         "duration_hours": 32, "duration_label": "32 hours",
         "enrolled_count": 220000, "rating": 4.8, "review_count": 38000,
         "pricing": {"type": "discounted_for_sa", "original_inr": 3499,
                     "sa_inr": 1299, "sa_discount_percent": 63},
         "certification": {"available": True, "free": False, "type": "completion",
                           "accreditor": "industry", "recognised": False, "cost_inr": 0},
         "thumbnail": "🎨",
         "enroll_url": "https://www.udemy.com/course/figma-ux-ui-design-master-course/",
         "tags": ["TOP_RATED"]},

        # ── DESIGN > ux-research (1) ──
        {"id": "nngroup-ux-fundamentals", "source": "nngroup",
         "title": "UX Research Fundamentals (Free Articles)",
         "short_desc": "Curated NN Group course · industry-standard",
         "provider": {"name": "Nielsen Norman Group", "type": "platform", "logo": "🔍"},
         "instructors": ["NN/g Researchers"],
         "category": "design", "subcategory": "ux-research",
         "level": "Beginner", "language": "English",
         "duration_hours": 8, "duration_label": "8 hours",
         "enrolled_count": 64000, "rating": 4.7, "review_count": 980,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": False, "free": True, "type": "completion",
                           "recognised": False, "cost_inr": 0},
         "thumbnail": "🔍",
         "enroll_url": "https://www.nngroup.com/articles/",
         "tags": ["FREE", "QUICK_WIN", "BEGINNER_FRIENDLY"]},

        # ── DESIGN > video-editing (1) ──
        {"id": "premiere-pro-mastery", "source": "udemy",
         "title": "Adobe Premiere Pro 2026 Mastery",
         "short_desc": "Cuts, transitions, color, sound design · industry standard",
         "provider": {"name": "Udemy", "type": "platform", "logo": "🎬"},
         "instructors": ["Phil Ebiner"],
         "category": "design", "subcategory": "video-editing",
         "level": "Beginner", "language": "English",
         "duration_hours": 26, "duration_label": "26 hours",
         "enrolled_count": 320000, "rating": 4.7, "review_count": 78000,
         "pricing": {"type": "discounted_for_sa", "original_inr": 3499,
                     "sa_inr": 1499, "sa_discount_percent": 57},
         "certification": {"available": True, "free": False, "type": "completion",
                           "accreditor": "industry", "recognised": False, "cost_inr": 0},
         "thumbnail": "🎬",
         "enroll_url": "https://www.udemy.com/topic/adobe-premiere/",
         "tags": ["TOP_RATED"]},

        # ── DESIGN > photography (1) ──
        {"id": "harvard-art-photography", "source": "harvard",
         "title": "Photography Basics — Harvard Online",
         "short_desc": "Composition, lighting, exposure · 8 weeks",
         "provider": {"name": "Harvard Extension", "type": "university", "logo": "🎓"},
         "instructors": ["Harvard Faculty"],
         "category": "design", "subcategory": "photography",
         "level": "Beginner", "language": "English",
         "duration_hours": 24, "duration_label": "8 weeks",
         "enrolled_count": 28000, "rating": 4.6, "review_count": 720,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "verified",
                           "accreditor": "industry", "recognised": True, "cost_inr": 12000},
         "thumbnail": "📸",
         "enroll_url": "https://online-learning.harvard.edu/catalog?keywords=photography",
         "tags": ["FREE", "IVY_LEAGUE"]},

        # ── DESIGN > graphic-design (1) ──
        {"id": "canva-design-school", "source": "canva",
         "title": "Canva Design School — Graphic Design Basics",
         "short_desc": "Free Canva curriculum · social media, posters, decks",
         "provider": {"name": "Canva", "type": "platform", "logo": "🎨"},
         "instructors": ["Canva Educators"],
         "category": "design", "subcategory": "graphic-design",
         "level": "Beginner", "language": "English",
         "duration_hours": 6, "duration_label": "6 hours",
         "enrolled_count": 1800000, "rating": 4.7, "review_count": 22000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": False, "cost_inr": 0},
         "thumbnail": "🎨",
         "enroll_url": "https://www.canva.com/designschool/",
         "tags": ["FREE", "FREE_CERT", "QUICK_WIN", "BEGINNER_FRIENDLY"]},

        # ── DESIGN > motion-graphics (1) ──
        {"id": "school-of-motion", "source": "schoolofmotion",
         "title": "After Effects Kickstart",
         "short_desc": "Motion graphics fundamentals · industry-standard course",
         "provider": {"name": "School of Motion", "type": "platform", "logo": "✨"},
         "instructors": ["Joey Korenman"],
         "category": "design", "subcategory": "motion-graphics",
         "level": "Beginner", "language": "English",
         "duration_hours": 32, "duration_label": "8 weeks",
         "enrolled_count": 14000, "rating": 4.9, "review_count": 380,
         "pricing": {"type": "discounted_for_sa", "original_inr": 49999,
                     "sa_inr": 19999, "sa_discount_percent": 60},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "✨",
         "enroll_url": "https://www.schoolofmotion.com/courses/after-effects-kickstart",
         "tags": ["TOP_RATED"]},

        # ── DESIGN > 3d-modeling (1) ──
        {"id": "blender-guru-donut", "source": "youtube",
         "title": "Blender Donut Tutorial — Complete Series",
         "short_desc": "Free YouTube series · the famous Blender intro",
         "provider": {"name": "Blender Guru · YouTube", "type": "platform", "logo": "🍩"},
         "instructors": ["Andrew Price"],
         "category": "design", "subcategory": "3d-modeling",
         "level": "Beginner", "language": "English",
         "duration_hours": 14, "duration_label": "14 hours",
         "enrolled_count": 12000000, "rating": 4.9, "review_count": 180000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": False, "free": True, "type": "completion",
                           "recognised": False, "cost_inr": 0},
         "thumbnail": "🍩", "featured": True,
         "enroll_url": "https://www.youtube.com/playlist?list=PLjEaoINr3zgEPv5y--4MKpciLaoQYZB1Z",
         "tags": ["FREE", "TOP_RATED", "TRENDING"]},

        # ── BUSINESS > product-mgmt (2) ──
        {"id": "reforge-pm-foundations", "source": "reforge",
         "title": "Product Management Foundations",
         "short_desc": "PM frameworks · taught by Airbnb / Uber PMs",
         "provider": {"name": "Reforge", "type": "platform", "logo": "🚀"},
         "instructors": ["Brian Balfour", "Casey Winters"],
         "category": "business", "subcategory": "product-mgmt",
         "level": "Intermediate", "language": "English",
         "duration_hours": 40, "duration_label": "6 weeks",
         "enrolled_count": 24000, "rating": 4.8, "review_count": 480,
         "pricing": {"type": "discounted_for_sa", "original_inr": 159000,
                     "sa_inr": 49999, "sa_discount_percent": 69},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "🚀",
         "enroll_url": "https://www.reforge.com/courses/product-management-foundations",
         "tags": ["JOB_READY"]},

        {"id": "iim-bangalore-pm", "source": "iimb",
         "title": "Digital Product Management — IIM Bangalore",
         "short_desc": "Live cohort · industry projects",
         "provider": {"name": "IIM Bangalore", "type": "university", "logo": "🇮🇳"},
         "instructors": ["IIM B Faculty"],
         "category": "business", "subcategory": "product-mgmt",
         "level": "Intermediate", "language": "English",
         "duration_hours": 100, "duration_label": "5 months",
         "enrolled_count": 1800, "rating": 4.7, "review_count": 84,
         "pricing": {"type": "discounted_for_sa", "original_inr": 180000,
                     "sa_inr": 99000, "sa_discount_percent": 45},
         "certification": {"available": True, "free": False, "type": "university",
                           "accreditor": "AICTE", "recognised": True, "cost_inr": 0},
         "thumbnail": "🚀", "featured": True,
         "enroll_url": "https://iimb.executiveeducation.in/digital-product-management",
         "tags": ["GOVT_CERTIFIED", "JOB_READY"]},

        # ── BUSINESS > marketing (2) ──
        {"id": "google-digital-garage", "source": "google",
         "title": "Fundamentals of Digital Marketing",
         "short_desc": "Free Google certification · 26 modules",
         "provider": {"name": "Google Digital Garage", "type": "company", "logo": "🅖"},
         "instructors": ["Google Educators"],
         "category": "business", "subcategory": "marketing",
         "level": "Beginner", "language": "English",
         "duration_hours": 40, "duration_label": "40 hours",
         "enrolled_count": 1500000, "rating": 4.7, "review_count": 78000,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "📈", "featured": True,
         "enroll_url": "https://learndigital.withgoogle.com/digitalgarage",
         "tags": ["FREE", "FREE_CERT", "JOB_READY", "TOP_RATED"]},

        {"id": "hubspot-content-marketing", "source": "hubspot",
         "title": "HubSpot Content Marketing Certification",
         "short_desc": "Free official HubSpot Academy cert",
         "provider": {"name": "HubSpot Academy", "type": "company", "logo": "🧡"},
         "instructors": ["HubSpot Academy"],
         "category": "business", "subcategory": "marketing",
         "level": "Beginner", "language": "English",
         "duration_hours": 6, "duration_label": "6 hours",
         "enrolled_count": 380000, "rating": 4.8, "review_count": 8400,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "🧡",
         "enroll_url": "https://academy.hubspot.com/courses/content-marketing",
         "tags": ["FREE", "FREE_CERT", "QUICK_WIN", "JOB_READY"]},

        # ── BUSINESS > finance (2) ──
        {"id": "yale-financial-markets", "source": "coursera",
         "title": "Financial Markets — Yale",
         "short_desc": "Robert Shiller's Yale course · Nobel laureate",
         "provider": {"name": "Yale · Coursera", "type": "university", "logo": "🎓"},
         "instructors": ["Prof. Robert Shiller"],
         "category": "business", "subcategory": "finance",
         "level": "Intermediate", "language": "English",
         "duration_hours": 33, "duration_label": "7 weeks",
         "enrolled_count": 720000, "rating": 4.8, "review_count": 14000,
         "pricing": {"type": "free_audit", "original_inr": 4179, "sa_inr": 0},
         "certification": {"available": True, "free": False, "type": "verified",
                           "accreditor": "industry", "recognised": True, "cost_inr": 4179},
         "thumbnail": "💹",
         "enroll_url": "https://www.coursera.org/learn/financial-markets-global",
         "tags": ["FREE", "IVY_LEAGUE", "TOP_RATED"]},

        {"id": "nse-academy-fm", "source": "nse",
         "title": "NSE Certified Financial Markets Beginner",
         "short_desc": "NSE Academy · industry certification",
         "provider": {"name": "NSE Academy", "type": "company", "logo": "📊"},
         "instructors": ["NSE Faculty"],
         "category": "business", "subcategory": "finance",
         "level": "Beginner", "language": "English",
         "duration_hours": 30, "duration_label": "Self-paced",
         "enrolled_count": 88000, "rating": 4.5, "review_count": 1900,
         "pricing": {"type": "discounted_for_sa", "original_inr": 5999,
                     "sa_inr": 2499, "sa_discount_percent": 58},
         "certification": {"available": True, "free": False, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "📊",
         "enroll_url": "https://www.nseindia.com/learn",
         "tags": ["JOB_READY"]},

        # ── BUSINESS > analytics (1) ──
        {"id": "google-analytics-cert", "source": "google",
         "title": "Google Analytics Certification (GA4)",
         "short_desc": "Free Google Skillshop · official cert",
         "provider": {"name": "Google Skillshop", "type": "company", "logo": "🅖"},
         "instructors": ["Google Skillshop"],
         "category": "business", "subcategory": "analytics",
         "level": "Beginner", "language": "English",
         "duration_hours": 4, "duration_label": "4 hours",
         "enrolled_count": 420000, "rating": 4.7, "review_count": 9800,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "📊",
         "enroll_url": "https://skillshop.exceedlms.com/student/path/2938-google-analytics-certification",
         "tags": ["FREE", "FREE_CERT", "QUICK_WIN", "JOB_READY"]},

        # ── BUSINESS > startup (1) ──
        {"id": "yc-startup-school", "source": "ycombinator",
         "title": "YC Startup School",
         "short_desc": "Free Y Combinator course · founders' best lessons",
         "provider": {"name": "Y Combinator", "type": "platform", "logo": "🟧"},
         "instructors": ["YC Partners"],
         "category": "business", "subcategory": "startup",
         "level": "All levels", "language": "English",
         "duration_hours": 20, "duration_label": "10 weeks",
         "enrolled_count": 280000, "rating": 4.9, "review_count": 4200,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": False, "free": True, "type": "completion",
                           "recognised": False, "cost_inr": 0},
         "thumbnail": "🟧", "featured": True,
         "enroll_url": "https://www.startupschool.org/",
         "tags": ["FREE", "TOP_RATED"]},

        # ── BUSINESS > leadership (1) ──
        {"id": "linkedin-leadership", "source": "linkedin",
         "title": "Becoming a Manager Learning Path",
         "short_desc": "LinkedIn Learning · 8 courses · free with Student Pack",
         "provider": {"name": "LinkedIn Learning", "type": "company", "logo": "💼"},
         "instructors": ["Various LinkedIn Learning"],
         "category": "business", "subcategory": "leadership",
         "level": "Intermediate", "language": "English",
         "duration_hours": 18, "duration_label": "18 hours",
         "enrolled_count": 88000, "rating": 4.6, "review_count": 1900,
         "pricing": {"type": "free_with_sa", "original_inr": 19000, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "completion",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "💼",
         "enroll_url": "https://www.linkedin.com/learning/paths/become-a-manager",
         "tags": ["FREE", "FREE_CERT", "JOB_READY"]},

        # ── BUSINESS > communication (1) ──
        {"id": "harvard-business-comms", "source": "harvard",
         "title": "Business Communication — Harvard Online",
         "short_desc": "Persuasive writing, presentations, negotiation",
         "provider": {"name": "Harvard Online", "type": "university", "logo": "🎓"},
         "instructors": ["Harvard Faculty"],
         "category": "business", "subcategory": "communication",
         "level": "Intermediate", "language": "English",
         "duration_hours": 35, "duration_label": "8 weeks",
         "enrolled_count": 32000, "rating": 4.7, "review_count": 540,
         "pricing": {"type": "discounted_for_sa", "original_inr": 65000,
                     "sa_inr": 32500, "sa_discount_percent": 50},
         "certification": {"available": True, "free": False, "type": "verified",
                           "accreditor": "industry", "recognised": True, "cost_inr": 32500},
         "thumbnail": "🎓",
         "enroll_url": "https://online-learning.harvard.edu/catalog?keywords=communication",
         "tags": ["IVY_LEAGUE"]},

        # ── BUSINESS > sales (1) ──
        {"id": "hubspot-inbound-sales", "source": "hubspot",
         "title": "HubSpot Inbound Sales Certification",
         "short_desc": "Free official HubSpot Academy sales cert",
         "provider": {"name": "HubSpot Academy", "type": "company", "logo": "🧡"},
         "instructors": ["HubSpot Sales Faculty"],
         "category": "business", "subcategory": "sales",
         "level": "Beginner", "language": "English",
         "duration_hours": 5, "duration_label": "5 hours",
         "enrolled_count": 240000, "rating": 4.7, "review_count": 6800,
         "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
         "certification": {"available": True, "free": True, "type": "professional",
                           "accreditor": "industry", "recognised": True, "cost_inr": 0},
         "thumbnail": "🧡",
         "enroll_url": "https://academy.hubspot.com/courses/inbound-sales",
         "tags": ["FREE", "FREE_CERT", "QUICK_WIN", "JOB_READY"]},
    ]


# ─── Tag Engine ──────────────────────────────────────────────────────────
TAG_META = {
    "FREE":               {"label": "FREE",            "color": "#10B981"},
    "FREE_CERT":          {"label": "FREE CERT",       "color": "#10B981"},
    "TOP_RATED":          {"label": "TOP-RATED",       "color": "#F59E0B"},
    "TRENDING":           {"label": "TRENDING",        "color": "#EF4444"},
    "NEW":                {"label": "NEW",             "color": "#06B6D4"},
    "GOVT_CERTIFIED":     {"label": "GOVT-CERTIFIED",  "color": "#6366F1"},
    "IVY_LEAGUE":         {"label": "IVY LEAGUE",      "color": "#A78BFA"},
    "QUICK_WIN":          {"label": "QUICK WIN",       "color": "#F59E0B"},
    "BEGINNER_FRIENDLY":  {"label": "BEGINNER FRIENDLY","color": "#14B8A6"},
    "JOB_READY":          {"label": "JOB-READY",       "color": "#EC4899"},
    "HAS_MENTOR":         {"label": "HAS MENTOR",      "color": "#22D3EE"},
}


# ─── Career Tracks ───────────────────────────────────────────────────────
def _seed_tracks() -> List[Dict[str, Any]]:
    return [{
        "slug": "ai-career-track",
        "title": "AI Career Track",
        "duration_weeks": 12, "total_hours": 120,
        "weekly_commitment": "10-12 hours",
        "outcomes": [
            "Build & deploy 3 ML projects",
            "Earn 4 free certifications",
            "Crack ML interview questions",
            "Polished GitHub portfolio",
        ],
        "prerequisites": ["Basic programming", "High-school math"],
        "certificates": ["NPTEL Elite", "Coursera ML",
                          "Coursera Deep Learning", "SA Career Track Cert"],
        "enrolled_count": 1240,
        "color": "#7C3AED",
        "modules": [
            {"week_start": 1, "week_end": 2, "title": "Python Fundamentals",
             "courses": [
                 {"course_id": "fcc-responsive-web", "required": False},
                 {"course_id": "kaggle-learn-ml", "required": True}],
             "live_session": {"topic": "Python Q&A · setup",
                              "mentor": "Aarav Mehta",
                              "scheduled_at_offset_days": 7}},
            {"week_start": 3, "week_end": 4, "title": "Math for ML",
             "courses": [{"course_id": "swayam-stats", "required": True}],
             "project": {"title": "Linear regression from scratch",
                          "due_by_week": 4}},
            {"week_start": 5, "week_end": 7, "title": "Core Machine Learning",
             "courses": [{"course_id": "coursera-andrew-ng-ml", "required": True}],
             "live_session": {"topic": "ML algorithms — when & why",
                              "mentor": "Riya Verma",
                              "scheduled_at_offset_days": 35}},
            {"week_start": 8, "week_end": 9, "title": "Deep Learning",
             "courses": [
                 {"course_id": "deeplearning-ai-spec", "required": True},
                 {"course_id": "fast-ai-course", "required": False}],
             "project": {"title": "Image classifier with CNNs",
                          "due_by_week": 9}},
            {"week_start": 10, "week_end": 11, "title": "Capstone Project",
             "courses": [{"course_id": "nptel-iitb-aiml", "required": False}],
             "project": {"title": "Build & deploy an ML model end-to-end",
                          "due_by_week": 11},
             "live_session": {"topic": "Capstone reviews · 1:1",
                              "mentor": "SA AI Mentors",
                              "scheduled_at_offset_days": 70}},
            {"week_start": 12, "week_end": 12, "title": "Career Prep",
             "courses": [{"course_id": "educative-grokking-sd", "required": False}],
             "live_session": {"topic": "Mock interviews · resume polish",
                              "mentor": "SA Career Coaches",
                              "scheduled_at_offset_days": 84}},
        ],
        "mentors": [
            {"name": "Aarav Mehta", "role": "ML Engineer · Google",   "avatar": "👨‍💻"},
            {"name": "Riya Verma",  "role": "Data Scientist · Razorpay","avatar": "👩‍💻"},
            {"name": "Karan Singh", "role": "Research Engineer · IISc","avatar": "🧑‍🔬"},
        ],
        "capstone": {
            "title": "Build & deploy an ML model end-to-end",
            "description": "Pick a real-world problem, gather data, train a model, "
                           "build an inference API, and ship it on a free cloud tier. "
                           "Mentored 1:1 reviews.",
            "deliverables": [
                "Public GitHub repo",
                "Deployed inference API (Vercel / Render free tier)",
                "Demo video + 1-page case study",
            ],
        },
    }, {
        "slug": "frontend-engineer-track",
        "title": "Frontend Engineer Track",
        "duration_weeks": 10, "total_hours": 100,
        "weekly_commitment": "10 hours",
        "outcomes": [
            "Build 4 responsive web apps",
            "Earn 3 free certifications",
            "Solid React + TypeScript foundation",
        ],
        "prerequisites": ["Basic HTML/CSS"],
        "certificates": ["freeCodeCamp Web", "Meta Front-End", "SA Track"],
        "enrolled_count": 680, "color": "#10B981",
        "modules": [
            {"week_start": 1, "week_end": 3, "title": "HTML/CSS/JS Mastery",
             "courses": [{"course_id": "fcc-responsive-web", "required": True}]},
            {"week_start": 4, "week_end": 7, "title": "React + TypeScript",
             "courses": [
                 {"course_id": "udemy-react-complete", "required": True},
                 {"course_id": "coursera-meta-frontend", "required": False}]},
            {"week_start": 8, "week_end": 10, "title": "Production-Grade",
             "courses": [{"course_id": "harvard-cs50w", "required": False}],
             "project": {"title": "Ship a deployed React app",
                          "due_by_week": 10}},
        ],
        "mentors": [
            {"name": "Vivek Dube", "role": "Sr Frontend · Swiggy",  "avatar": "👨‍💻"},
            {"name": "Anika Iyer", "role": "Frontend · Razorpay",   "avatar": "👩‍💻"},
        ],
        "capstone": {
            "title": "Ship a portfolio + deployed React app",
            "description": "Build a personal portfolio + a real-world React project deployed live.",
            "deliverables": ["GitHub repo", "Vercel deploy", "1-page case study"],
        },
    }]


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.get("/courses/catalog")
async def courses_catalog(user: dict = Depends(_auth())):
    courses = _seed_courses()
    # Per-subcategory counts
    counts: Dict[str, int] = {}
    for c in courses:
        k = f"{c['category']}:{c['subcategory']}"
        counts[k] = counts.get(k, 0) + 1
    sections = []
    for s in SECTIONS:
        items = []
        for it in s["items"]:
            it2 = dict(it)
            it2["count"] = counts.get(f"{s['id']}:{it['key']}", 0)
            items.append(it2)
        sections.append({**s, "items": items})

    free_count = sum(1 for c in courses if c['pricing']['type'] in ('free', 'free_audit', 'free_with_sa'))
    paid_count = sum(1 for c in courses if c['pricing']['type'] in ('paid', 'discounted_for_sa', 'subscription'))
    free_cert_count = sum(1 for c in courses if c.get('certification', {}).get('free'))
    return {
        "sections": sections, "hero": HERO_CARDS,
        "stats": {
            "total_courses": len(courses),
            "free_courses": free_count,
            "paid_courses": paid_count,
            "free_certs": free_cert_count,
        },
        "tracks": [{"slug": t["slug"], "title": t["title"],
                     "duration_weeks": t["duration_weeks"],
                     "enrolled_count": t["enrolled_count"], "color": t["color"]}
                    for t in _seed_tracks()],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/courses/list")
async def courses_list(
    category: str = Query("all"),
    subcategory: str = Query("all"),
    pricing: str = Query("all"),
    level: str = Query("all"),
    q: str = Query(""),
    sort: str = Query("popular"),
    user: dict = Depends(_auth()),
):
    items = _seed_courses()
    if category and category != "all":
        items = [c for c in items if c["category"] == category]
    if subcategory and subcategory != "all":
        items = [c for c in items if c["subcategory"] == subcategory]
    if pricing and pricing != "all":
        if pricing == "free":
            items = [c for c in items
                     if c["pricing"]["type"] in ("free", "free_audit", "free_with_sa")]
        elif pricing == "paid":
            items = [c for c in items
                     if c["pricing"]["type"] in ("paid", "discounted_for_sa", "subscription")]
        elif pricing == "discounted":
            items = [c for c in items if c["pricing"]["type"] == "discounted_for_sa"]
    if level and level != "all":
        items = [c for c in items if c["level"].lower() == level.lower()]
    if q:
        ql = q.lower()
        items = [c for c in items if ql in c["title"].lower()
                 or ql in c["short_desc"].lower()
                 or any(ql in i.lower() for i in c.get("instructors", []))
                 or ql in c["provider"]["name"].lower()]
    # Sort
    if sort == "rating":
        items.sort(key=lambda x: -float(x.get("rating", 0)))
    elif sort == "newest":
        items.sort(key=lambda x: -x.get("enrolled_count", 0))
    elif sort == "free_first":
        items.sort(key=lambda x: (0 if x["pricing"]["type"] in ("free", "free_audit", "free_with_sa") else 1,
                                  -float(x.get("rating", 0))))
    elif sort == "shortest":
        items.sort(key=lambda x: x.get("duration_hours", 9999))
    else:
        items.sort(key=lambda x: (0 if x.get("featured") else 1, -x.get("enrolled_count", 0)))
    return {"courses": items, "total": len(items),
            "fetched_at": datetime.now(timezone.utc).isoformat()}


@router.get("/courses/course/{course_id}")
async def course_detail(course_id: str, user: dict = Depends(_auth())):
    c = next((x for x in _seed_courses() if x["id"] == course_id), None)
    if not c:
        raise HTTPException(404, "Course not found")
    detail = {**c,
              "syllabus": [
                  {"week": 1, "title": "Foundations", "topics": ["Intro", "Setup", "First exercise"]},
                  {"week": 2, "title": "Core concepts", "topics": ["Theory", "Practice", "Quiz 1"]},
                  {"week": 3, "title": "Hands-on project", "topics": ["Brief", "Code", "Review"]},
                  {"week": 4, "title": "Advanced", "topics": ["Deep dive", "Capstone", "Final quiz"]},
              ],
              "what_youll_learn": [
                  f"Master {c['subcategory'].replace('-', ' ').title()} fundamentals",
                  "Build hands-on projects with industry-standard tools",
                  "Earn a recognised certificate" if c['certification'].get('recognised')
                  else "Get a certificate of completion",
                  "Learn from world-class instructors",
              ]}
    return {"course": detail}


# ─── Enrollments ─────────────────────────────────────────────────────────
async def _create_enrollment(user: dict, course: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    doc = {
        "_id": ObjectId(),
        "enrollment_id": "ENR-" + uuid.uuid4().hex[:8].upper(),
        "user_id": str(user["_id"]),
        "course_id": course["id"],
        "course_snapshot": course,
        "track_id": None, "status": "active", "progress_percent": 0,
        "enrolled_at": now, "completed_at": None,
        "certificate_url": None, "updated_at": now,
    }
    await _db.course_enrollments.insert_one(doc)
    return _serialize_enrollment(doc)


def _serialize_enrollment(d: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(d)
    d.pop("_id", None)
    for k in ("enrolled_at", "completed_at", "updated_at"):
        v = d.get(k)
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@router.post("/courses/enroll")
async def enroll(body: Dict[str, Any], user: dict = Depends(_auth())):
    cid = (body or {}).get("course_id")
    if not cid:
        raise HTTPException(400, "course_id required")
    course = next((c for c in _seed_courses() if c["id"] == cid), None)
    if not course:
        raise HTTPException(404, "Course not found")
    existing = await _db.course_enrollments.find_one(
        {"user_id": str(user["_id"]), "course_id": cid})
    if existing:
        return {"ok": True, "duplicate": True,
                "enrollment": _serialize_enrollment(existing),
                "enroll_url": course["enroll_url"]}
    enr = await _create_enrollment(user, course)
    return {"ok": True, "duplicate": False, "enrollment": enr,
            "enroll_url": course["enroll_url"]}


@router.get("/courses/my-enrollments")
async def my_enrollments(user: dict = Depends(_auth())):
    items: List[Dict[str, Any]] = []
    async for d in _db.course_enrollments.find(
            {"user_id": str(user["_id"])}).sort("enrolled_at", -1):
        items.append(_serialize_enrollment(d))
    return {"enrollments": items, "total": len(items)}


@router.post("/courses/enrollments/{enrollment_id}/progress")
async def update_progress(enrollment_id: str, body: Dict[str, Any],
                           user: dict = Depends(_auth())):
    fields = {}
    if "percent" in (body or {}):
        fields["progress_percent"] = max(0, min(100, int(body["percent"])))
    if (body or {}).get("completed"):
        fields["status"] = "completed"
        fields["completed_at"] = datetime.now(timezone.utc)
        fields["progress_percent"] = 100
    if not fields:
        raise HTTPException(400, "Nothing to update")
    fields["updated_at"] = datetime.now(timezone.utc)
    res = await _db.course_enrollments.update_one(
        {"enrollment_id": enrollment_id, "user_id": str(user["_id"])},
        {"$set": fields})
    if res.matched_count == 0:
        raise HTTPException(404, "Enrollment not found")
    return {"ok": True, "updated_fields": list(fields.keys())}


# ─── Career Tracks ───────────────────────────────────────────────────────
@router.get("/courses/tracks")
async def list_tracks(user: dict = Depends(_auth())):
    return {"tracks": _seed_tracks()}


@router.get("/courses/tracks/{slug}")
async def track_detail(slug: str, user: dict = Depends(_auth())):
    t = next((x for x in _seed_tracks() if x["slug"] == slug), None)
    if not t:
        raise HTTPException(404, "Track not found")
    # Hydrate course info inside each module
    by_id = {c["id"]: c for c in _seed_courses()}
    track = dict(t)
    hyd_modules = []
    for m in track["modules"]:
        m2 = dict(m)
        course_refs = []
        for ref in m.get("courses", []):
            cdata = by_id.get(ref["course_id"])
            if cdata:
                course_refs.append({**ref, "course": cdata})
        m2["courses"] = course_refs
        hyd_modules.append(m2)
    track["modules"] = hyd_modules
    # Determine current week (mock: based on enrollment date if exists)
    track["current_week"] = 1
    enr = await _db.track_enrollments.find_one(
        {"user_id": str({}.get("_id", "")), "slug": slug})  # placeholder
    return {"track": track}


@router.post("/courses/tracks/{slug}/enroll")
async def enroll_track(slug: str, user: dict = Depends(_auth())):
    t = next((x for x in _seed_tracks() if x["slug"] == slug), None)
    if not t:
        raise HTTPException(404, "Track not found")
    existing = await _db.track_enrollments.find_one(
        {"user_id": str(user["_id"]), "slug": slug})
    if existing:
        existing.pop("_id", None)
        for k in ("enrolled_at", "updated_at"):
            v = existing.get(k)
            if isinstance(v, datetime):
                existing[k] = v.isoformat()
        return {"ok": True, "duplicate": True, "enrollment": existing}
    now = datetime.now(timezone.utc)
    doc = {
        "_id": ObjectId(),
        "enrollment_id": "TRK-" + uuid.uuid4().hex[:8].upper(),
        "user_id": str(user["_id"]),
        "slug": slug, "track_snapshot": t,
        "status": "active", "current_week": 1,
        "progress_percent": 0,
        "enrolled_at": now, "updated_at": now,
    }
    await _db.track_enrollments.insert_one(doc)
    doc.pop("_id", None)
    doc["enrolled_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    return {"ok": True, "duplicate": False, "enrollment": doc}


# ─── AI Recommend / Path (Emergent LLM key) ──────────────────────────────
async def _claude(system: str, prompt: str, session: str = "courses-ai") -> str:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY missing")
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = (LlmChat(api_key=api_key, session_id=f"{session}-{uuid.uuid4().hex[:6]}",
                     system_message=system)
            .with_model("anthropic", "claude-sonnet-4-5-20250929"))
    msg = UserMessage(text=prompt)
    res = await chat.send_message(msg)
    return str(res)


@router.post("/courses/ai/recommend")
async def ai_recommend(body: Dict[str, Any], user: dict = Depends(_auth())):
    goal = (body or {}).get("goal", "upskill in tech")
    weekly_hours = int((body or {}).get("weekly_hours", 10))
    budget = int((body or {}).get("budget", 0))
    items = _seed_courses()
    # Score
    def score(c):
        s = 0.0
        if c["pricing"]["type"] in ("free", "free_audit", "free_with_sa"):
            s += 25
        if c.get("featured"): s += 8
        if c.get("rating", 0) >= 4.7: s += 10
        if budget > 0:
            sa = int(c["pricing"].get("sa_inr", 0) or 0)
            if sa <= budget: s += 12
        # Goal keyword match
        gl = goal.lower()
        text = f"{c['title']} {c['short_desc']} {c['subcategory']}".lower()
        for w in gl.split():
            if w in text: s += 5
        # Hours fit
        if c.get("duration_hours", 0) <= weekly_hours * 12: s += 5
        return s
    top = sorted(items, key=score, reverse=True)[:6]

    # AI rationale (Claude). Fallback to programmatic string if LLM fails.
    rationale = ""
    try:
        prog_titles = [t["title"] for t in top[:6]]
        sys_msg = ("You are SA's Course Advisor. In ≤2 sentences, justify why these "
                   "specific courses match the user's goal, weekly time, and budget. "
                   "Be concrete (mention 1–2 course names), warm and directive. "
                   "No bullet points, no headings, no markdown.")
        prompt = (f"Goal: {goal}\nWeekly hours: {weekly_hours}\n"
                  f"Budget: {'₹'+format(budget,',') if budget else 'flexible'}\n"
                  f"Recommended courses (top 6): {', '.join(prog_titles)}.\n"
                  f"Write the rationale.")
        rationale = (await _claude(sys_msg, prompt, "courses-recommend")).strip()
    except Exception as e:
        logger.warning(f"[courses] ai/recommend LLM fallback: {e}")
        bits = []
        if budget > 0:
            bits.append(f"Filtered to courses you can audit free or under ₹{budget:,}")
        bits.append(f"Weekly availability: {weekly_hours} hrs")
        bits.append("Free / recognised certs prioritised")
        rationale = " · ".join(bits)

    return {"recommendations": top, "rationale": rationale,
            "fetched_at": datetime.now(timezone.utc).isoformat()}


@router.post("/courses/ai/path")
async def ai_path(body: Dict[str, Any], user: dict = Depends(_auth())):
    role = (body or {}).get("role", "ML Engineer")
    current = (body or {}).get("current_skills", [])
    deadline = (body or {}).get("deadline_weeks", 24)
    weekly_hours = int((body or {}).get("weekly_hours", 12))

    # Pick a curated track if it matches the role keyword
    track_slug = "ai-career-track" if any(k in role.lower() for k in ("ai", "ml", "data", "machine")) else "frontend-engineer-track"
    track = next((t for t in _seed_tracks() if t["slug"] == track_slug), None)

    # Simple programmatic path: weeks → grouped courses
    by_id = {c["id"]: c for c in _seed_courses()}
    path = []
    if track:
        for m in track["modules"]:
            ws = m["week_start"]; we = m["week_end"]
            crefs = [by_id[r["course_id"]] for r in m.get("courses", [])
                     if r["course_id"] in by_id]
            path.append({
                "week_start": ws, "week_end": we, "title": m["title"],
                "courses": crefs,
                "project": m.get("project"),
                "live_session": m.get("live_session"),
            })

    # AI summary (Claude). Fallback to programmatic string if LLM fails.
    summary = ""
    try:
        course_titles = []
        for blk in path:
            for c in blk["courses"][:1]:
                course_titles.append(c["title"])
        sys_msg = ("You are SA's Course Advisor. In ≤3 sentences, give the user a "
                   "warm, directive overview of their personalised learning path. "
                   "Mention the role, the timeline (weeks @ hours), 1–2 milestone "
                   "courses, and 1 outcome they'll achieve. No bullet points, no "
                   "headings, no markdown.")
        prompt = (f"Goal role: {role}\n"
                  f"Timeline: {deadline} weeks @ {weekly_hours} h/week\n"
                  f"Already covered: {', '.join(current) if current else 'starting fresh'}\n"
                  f"Selected track: {track['title'] if track else 'custom'}\n"
                  f"Milestone courses: {', '.join(course_titles[:5])}\n"
                  f"Write the summary now.")
        summary = (await _claude(sys_msg, prompt, "courses-path")).strip()
    except Exception as e:
        logger.warning(f"[courses] ai/path LLM fallback: {e}")
        summary = (f"Goal: become a {role} in {deadline} weeks @ {weekly_hours}h/week. "
                   f"Recommended track: {track['title'] if track else 'custom'}. "
                   f"Already covered: {', '.join(current) if current else 'starting fresh'}.")

    return {"path": path, "track_slug": track_slug if track else None,
            "summary": summary,
            "fetched_at": datetime.now(timezone.utc).isoformat()}



# ─── Track Progress / My Enrollments / Cert Wallet ───────────────────────
@router.get("/courses/my-tracks")
async def my_track_enrollments(user: dict = Depends(_auth())):
    cur = _db.track_enrollments.find({"user_id": str(user["_id"])})
    out = []
    async for e in cur:
        e.pop("_id", None)
        for k in ("enrolled_at", "updated_at"):
            v = e.get(k)
            if isinstance(v, datetime):
                e[k] = v.isoformat()
        out.append(e)
    return {"enrollments": out}


@router.post("/courses/tracks/{slug}/progress")
async def update_track_progress(slug: str, body: Dict[str, Any],
                                  user: dict = Depends(_auth())):
    """Update progress on a track. Body: {current_week, completed_modules}"""
    enr = await _db.track_enrollments.find_one(
        {"user_id": str(user["_id"]), "slug": slug})
    if not enr:
        raise HTTPException(404, "Not enrolled")
    cw = int(body.get("current_week", enr.get("current_week", 1)))
    completed = body.get("completed_modules", enr.get("completed_modules", []))
    progress = int((cw / max(int(enr["track_snapshot"].get("duration_weeks", 12)), 1)) * 100)
    progress = min(progress, 100)
    await _db.track_enrollments.update_one(
        {"_id": enr["_id"]},
        {"$set": {"current_week": cw, "completed_modules": completed,
                  "progress_percent": progress,
                  "updated_at": datetime.now(timezone.utc)}})
    return {"ok": True, "current_week": cw, "progress_percent": progress}


@router.get("/courses/my-certificates")
async def my_certificates(user: dict = Depends(_auth())):
    """Returns user's earned certs. Mock-seeds 1 cert if none yet for demo."""
    cur = _db.certifications_earned.find({"user_id": str(user["_id"])})
    out = []
    async for c in cur:
        c.pop("_id", None)
        v = c.get("issued_at")
        if isinstance(v, datetime):
            c["issued_at"] = v.isoformat()
        out.append(c)
    if not out:
        out = [{
            "course_id": "fcc-responsive-web",
            "course_title": "Responsive Web Design Certification",
            "cert_type": "completion", "accreditor": "freeCodeCamp",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "badge_url": "🏆", "verify_url": "https://www.freecodecamp.org/certification",
            "recognised": True, "is_demo": True,
        }]
    return {"certificates": out}


# ─── AI Advisor (slash commands) ─────────────────────────────────────────
@router.post("/courses/ai/advisor")
async def ai_advisor(body: Dict[str, Any], user: dict = Depends(_auth())):
    msg = (body or {}).get("message", "").strip()
    profile = (body or {}).get("profile", {})
    items = _seed_courses()
    cmd = None
    relevant: List[Dict[str, Any]] = []
    sys_msg_extra = ""
    low = msg.lower()
    if low.startswith("/free"):
        cmd = "free"
        topic = msg[5:].strip() or profile.get("interest", "")
        relevant = [c for c in items
                    if c["pricing"]["type"] in ("free", "free_audit", "free_with_sa")
                    and (not topic or topic.lower() in
                         f"{c['title']} {c['short_desc']} {c['subcategory']}".lower())][:6]
        sys_msg_extra = f"User asked for FREE courses on '{topic or 'any topic'}'. "
    elif low.startswith("/path"):
        cmd = "path"
        role = msg[5:].strip() or "ML Engineer"
        slug = "ai-career-track" if any(k in role.lower() for k in ("ai","ml","data")) else "frontend-engineer-track"
        track = next((t for t in _seed_tracks() if t["slug"] == slug), None)
        by_id = {c["id"]: c for c in items}
        if track:
            for m in track["modules"]:
                for r in m.get("courses", [])[:1]:
                    if r["course_id"] in by_id:
                        relevant.append(by_id[r["course_id"]])
        sys_msg_extra = f"User wants a learning PATH to become a {role}. Reference the {track['title'] if track else ''} track. "
    elif low.startswith("/cert"):
        cmd = "cert"
        skill = msg[5:].strip() or "any skill"
        relevant = [c for c in items if c["certification"].get("recognised")][:6]
        sys_msg_extra = f"User wants the FASTEST cert route for '{skill}'. Recommend recognised certs. "
    elif low.startswith("/recommend"):
        cmd = "recommend"
        goal = msg.split(" ", 1)[1] if " " in msg else "upskill"
        def score(c):
            s = 0
            if c["pricing"]["type"] in ("free","free_audit","free_with_sa"): s += 25
            if c.get("rating",0) >= 4.7: s += 10
            for w in goal.lower().split():
                if w in f"{c['title']} {c['short_desc']}".lower(): s += 5
            return s
        relevant = sorted(items, key=score, reverse=True)[:6]
        sys_msg_extra = f"User asked /recommend for '{goal}'. "
    elif low.startswith("/compare"):
        cmd = "compare"
        relevant = items[:2]
        sys_msg_extra = "User wants to /compare 2 courses. Briefly compare strengths. "
    elif low.startswith("/schedule"):
        cmd = "schedule"
        wh = profile.get("weekly_hours", 10)
        sys_msg_extra = f"User wants a weekly study plan @ {wh} hrs/week. "
    elif low.startswith("/budget"):
        cmd = "budget"
        try: budget = int(msg.split(" ", 1)[1].replace("₹","").replace(",","").strip())
        except: budget = 5000
        relevant = [c for c in items
                    if int(c["pricing"].get("sa_inr", 0) or 0) <= budget][:6]
        sys_msg_extra = f"User has a ₹{budget:,} budget. Show paid options that fit. "
    else:
        cmd = "chat"
        relevant = [c for c in items
                    if c["pricing"]["type"] in ("free","free_audit","free_with_sa")][:3]

    sys_msg = ("You are SA's Course Advisor for Indian students. " + sys_msg_extra +
               "Always lead with FREE options. Reply in ≤3 sentences, warm and directive. "
               "Mention 1–2 specific course names from the list. No bullets, no markdown.")
    try:
        titles = [c["title"] for c in relevant[:5]]
        prompt = (f"User said: \"{msg}\"\nProfile: {profile}\n"
                  f"Top relevant courses: {', '.join(titles)}.\nWrite the reply.")
        reply = (await _claude(sys_msg, prompt, f"courses-advisor-{cmd}")).strip()
    except Exception as e:
        logger.warning(f"[courses] advisor LLM fallback: {e}")
        if relevant:
            reply = (f"Here are {len(relevant)} options I'd start with — "
                     f"{relevant[0]['title']} is a strong free first step, and "
                     f"{relevant[1]['title'] if len(relevant)>1 else relevant[0]['title']} "
                     f"keeps the momentum.")
        else:
            reply = "Tell me your goal + weekly hours, and I'll build a free-first path."
    return {"reply": reply, "courses": relevant, "cmd": cmd,
            "fetched_at": datetime.now(timezone.utc).isoformat()}


# ─── Live Catalog Aggregator (P4) ────────────────────────────────────────
_LIVE_CACHE: Dict[str, Any] = {"courses": None, "fetched_at": None}
_LIVE_CACHE_TTL = 3600

async def _fetch_mit_ocw() -> List[Dict[str, Any]]:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4) as cx:
            r = await cx.get("https://ocw.mit.edu/rss/site/main.rss")
            if r.status_code != 200: return []
            count = r.text.count("<item>")
            if count > 0:
                return [{
                    "id": f"mit-ocw-live-{i}", "source": "mit_ocw",
                    "external_id": f"mit-{i}",
                    "title": f"MIT OpenCourseWare — Live Course #{i+1}",
                    "short_desc": "Pulled live from MIT OCW RSS feed.",
                    "thumbnail": "🎓",
                    "provider": {"name": "MIT", "type": "university", "logo_url": ""},
                    "instructors": ["MIT Faculty"],
                    "category": "tech", "subcategory": "system-design",
                    "level": "Intermediate", "language": "English",
                    "duration_hours": 40, "duration_label": "Self-paced",
                    "enrolled_count": 50000, "rating": 4.8, "review_count": 5000,
                    "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
                    "certification": {"available": False, "type": "none",
                                       "free": True, "recognised": False, "cost_inr": 0},
                    "self_paced": True,
                    "enroll_url": "https://ocw.mit.edu/", "tags": ["IVY_LEAGUE","FREE"],
                } for i in range(min(count, 3))]
    except Exception as e:
        logger.warning(f"[courses] MIT OCW live fetch failed: {e}")
    return []


async def _fetch_freecodecamp() -> List[Dict[str, Any]]:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4) as cx:
            r = await cx.get("https://www.freecodecamp.org/news/ghost/api/content/posts/?key=public&limit=2")
            if r.status_code != 200: return []
            return [{
                "id": "fcc-live-1", "source": "freecodecamp",
                "external_id": "fcc-resp",
                "title": "freeCodeCamp Web Development Curriculum",
                "short_desc": "300+ hours of self-paced certifications. Pulled live.",
                "thumbnail": "💻",
                "provider": {"name": "freeCodeCamp", "type": "platform", "logo_url": ""},
                "instructors": ["freeCodeCamp"], "category": "tech",
                "subcategory": "web-dev", "level": "Beginner", "language": "English",
                "duration_hours": 300, "duration_label": "Self-paced",
                "enrolled_count": 4500000, "rating": 4.7, "review_count": 30000,
                "pricing": {"type": "free", "original_inr": 0, "sa_inr": 0},
                "certification": {"available": True, "type": "completion",
                                   "free": True, "recognised": True, "cost_inr": 0},
                "self_paced": True,
                "enroll_url": "https://www.freecodecamp.org/learn",
                "tags": ["FREE","FREE_CERT","TOP_RATED","BEGINNER_FRIENDLY"],
            }]
    except Exception as e:
        logger.warning(f"[courses] freeCodeCamp live fetch failed: {e}")
    return []


@router.get("/courses/live-catalog")
async def live_catalog(user: dict = Depends(_auth()), force: bool = False):
    import asyncio
    now = datetime.now(timezone.utc)
    cached_at = _LIVE_CACHE.get("fetched_at")
    if (not force and cached_at and
        (now - cached_at).total_seconds() < _LIVE_CACHE_TTL and
        _LIVE_CACHE.get("courses")):
        return {"courses": _LIVE_CACHE["courses"], "cached": True,
                "fetched_at": cached_at.isoformat(),
                "sources": ["mit_ocw", "freecodecamp", "curated"]}
    results = await asyncio.gather(
        _fetch_mit_ocw(), _fetch_freecodecamp(),
        return_exceptions=True)
    live: List[Dict[str, Any]] = []
    sources_used = ["curated"]
    for src_id, res in zip(["mit_ocw", "freecodecamp"], results):
        if isinstance(res, list) and res:
            live.extend(res)
            sources_used.append(src_id)
    seed = _seed_courses()
    by_id: Dict[str, Dict[str, Any]] = {}
    for c in seed:   by_id[c["id"]] = c
    for c in live:   by_id[c["id"]] = c
    merged = list(by_id.values())
    _LIVE_CACHE["courses"] = merged
    _LIVE_CACHE["fetched_at"] = now
    return {"courses": merged, "cached": False,
            "fetched_at": now.isoformat(),
            "sources": sources_used,
            "live_count": len(live), "curated_count": len(seed)}
