"""
Portal Dashboard APIs
=====================
Mock-backed endpoints that the 4 RN portal dashboards call to populate
their UIs. Each endpoint returns a stable JSON shape that the frontend
maps directly to its dashboard tiles.

When real DB queries are wired up later, only the body of these
functions changes — the JSON contract stays identical.

Endpoints:
  GET /api/mentor/dashboard        — mentor portal dashboard
  GET /api/student/dashboard       — student portal dashboard
  GET /api/admin/college-stats     — college admin portal dashboard
  GET /api/admin/super-overview    — super admin portal overview
"""
from fastapi import APIRouter

router = APIRouter()


# ── Mentor Portal ────────────────────────────────────────────────
@router.get("/mentor/dashboard")
async def mentor_dashboard():
    return {
        "mentor": {
            "name": "Dr. Suresh Rao",
            "initials": "SR",
            "role": "CTO",
            "company": "Zepto",
            "rating": 4.9,
            "sessions": 142,
            "price": 999,
            "college": "IIT Bombay",
            "batch": 2008,
            "expertise": ["System Design", "DSA", "Career Strategy", "Startups"],
        },
        "kpis": [
            {"id": "earnings",   "label": "Earnings",         "value": "₹28k", "delta": "↑ 12%",  "color": "amber"},
            {"id": "sessions",   "label": "Sessions",         "value": "32",   "delta": "↑ 4",    "color": "teal"},
            {"id": "students",   "label": "Active Students",  "value": "12",   "delta": "↑ 2 new","color": "blue"},
            {"id": "rating",     "label": "Avg Rating",       "value": "4.9",  "delta": "stable", "color": "green"},
        ],
        "todaySessions": [
            {"avatar": "AS", "color": "#A78BFA", "student": "Arjun Sharma",  "topic": "System Design — Scaling Notification Services", "time": "16:00", "duration": 45},
            {"avatar": "PN", "color": "#34D399", "student": "Priya Nair",    "topic": "Career: PM at Big Tech, year 1 plan",            "time": "18:30", "duration": 30},
            {"avatar": "KD", "color": "#FBBF24", "student": "Kabir Das",     "topic": "Startup pitch review v3",                        "time": "20:00", "duration": 60},
        ],
        "monthly": [
            {"month": "Dec", "amount": 14200, "sessions": 18},
            {"month": "Jan", "amount": 16800, "sessions": 22},
            {"month": "Feb", "amount": 19500, "sessions": 24},
            {"month": "Mar", "amount": 17200, "sessions": 21},
            {"month": "Apr", "amount": 25400, "sessions": 30},
            {"month": "May", "amount": 28700, "sessions": 32},
        ],
        "pendingRequests": 3,
    }


# ── Student Portal ───────────────────────────────────────────────
@router.get("/student/dashboard")
async def student_dashboard():
    return {
        "student": {
            "name": "Arjun Sharma",
            "initials": "AS",
            "year": "Final Year",
            "saId": "SA-26-834291",
            "career": {"goal": "Product Designer at a Top Tech Company", "progressPct": 42},
            "career_score": 74,
        },
        "kpis": [
            {"id": "matches",  "label": "Internship Matches",  "value": "48", "delta": "↑ 12 new today",      "color": "blue"},
            {"id": "courses",  "label": "Courses In Progress", "value": "3",  "delta": "68% avg completion",  "color": "purple"},
            {"id": "mentors",  "label": "Mentor Connections",  "value": "5",  "delta": "2 sessions this week","color": "green"},
            {"id": "score",    "label": "Career Score",        "value": "74", "delta": "↑ 8pts this month",   "color": "amber"},
        ],
        "topMatches": [
            {"id": 1, "role": "Software Engineering Intern", "company": "Google",   "location": "Bengaluru", "match": 87, "type": "Internship", "logo": "G", "logoBg": "#4285F4"},
            {"id": 2, "role": "Product Management Intern",   "company": "Flipkart", "location": "Bengaluru", "match": 87, "type": "Internship", "logo": "F", "logoBg": "#2874F0"},
            {"id": 3, "role": "Data Science Intern",         "company": "Swiggy",   "location": "Remote",    "match": 87, "type": "Internship", "logo": "S", "logoBg": "#FC8019"},
        ],
        "recommendedMentors": [
            {"id": 1, "name": "Dr. Suresh Rao", "initials": "SR", "role": "CTO",        "company": "Zepto", "rating": 5.0, "sessions": 142, "price": 999, "color": "#7B3DBF"},
            {"id": 2, "name": "Nisha Kapoor",   "initials": "NK", "role": "VP Product", "company": "CRED",  "rating": 4.9, "sessions":  89, "price": 799, "color": "#EC4899"},
        ],
        "upcomingEvents": [
            {"id": 1, "title": "HackIndia 2026",            "date": "May 10–12", "mode": "Hybrid", "kind": "free", "accent": "#A78BFA"},
            {"id": 2, "title": "DSA Championship S4",       "date": "May 15",    "mode": "Online", "kind": "free", "accent": "#34D399"},
            {"id": 3, "title": "System Design Masterclass", "date": "May 18",    "mode": "Online", "kind": "paid", "price": 499, "accent": "#FCD34D"},
        ],
        "profileCompletion": {"score": 68, "missing": ["Skills", "Projects", "Resume"]},
    }


# ── College Admin Portal ─────────────────────────────────────────
@router.get("/admin/college-stats")
async def college_admin_stats():
    return {
        "college": {
            "name": "St. Xavier's College",
            "shortName": "St. Xavier's",
            "initials": "SX",
            "rank": "NAAC A++",
            "emoji": "🌅",
            "placementRate": 94,
            "upcomingHighlight": "Google drive confirmed for May 10",
        },
        "kpis": [
            {"id": "students",  "label": "Total Students",    "value": "3,240", "delta": "↑ 180 enrolled this sem",    "color": "blue"},
            {"id": "alumni",    "label": "Alumni Network",    "value": "8,400", "delta": "↑ 320 this year",            "color": "purple"},
            {"id": "placement", "label": "Placement Rate",    "value": "94%",   "delta": "↑ 4% vs last year",          "color": "green"},
            {"id": "events",    "label": "Events This Month", "value": "12",    "delta": "3 upcoming this week",       "color": "amber"},
        ],
        "deptPlacement": [
            {"dept": "Computer Science", "pct": 98, "placed": 235, "color": "#22D3EE"},
            {"dept": "Design",           "pct": 96, "placed":  43, "color": "#A78BFA"},
            {"dept": "Electronics",      "pct": 92, "placed":  90, "color": "#34D399"},
            {"dept": "Management",       "pct": 91, "placed":  77, "color": "#FBBF24"},
            {"dept": "Mechanical",       "pct": 88, "placed":  63, "color": "#F472B6"},
        ],
        "recentActivity": [
            {"id": 1, "kind": "enrollment",  "text": "180 students enrolled for Semester 5",            "time": "Today, 9:00 AM",  "icon": "GraduationCap", "tint": "#22D3EE"},
            {"id": 2, "kind": "alumni",      "text": "Priya Singh (Batch 2022) joined the alumni network", "time": "Today, 11:30 AM", "icon": "UserPlus",      "tint": "#A78BFA"},
            {"id": 3, "kind": "event",       "text": "Tech Fest 2026 — RSVP count reached 240",          "time": "Today, 2:15 PM",  "icon": "Calendar",      "tint": "#FBBF24"},
            {"id": 4, "kind": "placement",   "text": "Google campus drive confirmed for May 10",         "time": "Yesterday",       "icon": "Briefcase",     "tint": "#34D399"},
            {"id": 5, "kind": "announcement","text": "Exam schedule sent to 1,200 students",             "time": "1 day ago",       "icon": "Bell",          "tint": "#F472B6"},
            {"id": 6, "kind": "placement",   "text": "Siddharth Pai (Batch 2023) placed at OpenAI — $180K","time": "2 days ago",      "icon": "TrendingUp",    "tint": "#FCD34D"},
        ],
        "upcomingEvents": [
            {"id": 1, "title": "Tech Fest 2026",      "date": "May 5–7, 2026", "attending": 240, "color": "#22D3EE"},
            {"id": 2, "title": "Google Campus Drive", "date": "May 10, 2026",  "attending":  85, "color": "#34D399"},
            {"id": 3, "title": "Convocation 2026",    "date": "May 18, 2026",  "attending": 620, "color": "#A78BFA"},
            {"id": 4, "title": "Alumni Meet 2026",    "date": "May 25, 2026",  "attending": 380, "color": "#FBBF24"},
        ],
        "topRecruiters": [
            {"id": 1, "name": "Google",    "offers": 24, "ctc": "38 LPA", "color": "#4285F4"},
            {"id": 2, "name": "Microsoft", "offers": 18, "ctc": "32 LPA", "color": "#00A4EF"},
            {"id": 3, "name": "Amazon",    "offers": 22, "ctc": "28 LPA", "color": "#FF9900"},
            {"id": 4, "name": "Razorpay",  "offers": 15, "ctc": "22 LPA", "color": "#02C0F1"},
            {"id": 5, "name": "Infosys",   "offers": 42, "ctc": "6 LPA",  "color": "#007CC3"},
        ],
    }


# ── Super Admin Portal ───────────────────────────────────────────
@router.get("/admin/super-overview")
async def super_admin_overview():
    return {
        "admin": {
            "name": "Super Admin",
            "email": "admin@studentalumni.in",
            "initials": "SA",
            "role": "Platform Admin · Full Access",
        },
        "kpis": [
            {"id": "colleges",   "icon": "Building2",     "label": "Total Colleges",      "value": "48",       "delta": "↑ 6 this month"},
            {"id": "students",   "icon": "GraduationCap", "label": "Total Students",      "value": "1,24,800", "delta": "↑ 2.4% growth"},
            {"id": "mentors",    "icon": "UserCheck",     "label": "Active Mentors",      "value": "3,240",    "delta": "↑ 180 new"},
            {"id": "alumni",     "icon": "Users",         "label": "Alumni Network",      "value": "84,000",   "delta": "↑ 3,200 joined"},
            {"id": "revenue",    "icon": "CreditCard",    "label": "Revenue This Month",  "value": "₹28.4L",   "delta": "↑ 12% vs last"},
            {"id": "events",     "icon": "Calendar",      "label": "Active Events",       "value": "156",      "delta": "↑ 24 this week"},
            {"id": "approvals",  "icon": "CheckCircle",   "label": "Pending Approvals",   "value": "12",       "delta": "↓ 4 urgent"},
            {"id": "engagement", "icon": "BarChart3",     "label": "Platform Engagement", "value": "78%",      "delta": "↑ 3 pts"},
        ],
        "recentActivity": [
            {"id": 1, "icon": "Building2",     "text": "IIT Delhi joined the platform",              "sub": "College onboarded",     "time": "5 min ago"},
            {"id": 2, "icon": "Sparkles",      "text": "Dr. Priya Mehta completed 100 sessions",     "sub": "Mentor milestone",      "time": "22 min ago"},
            {"id": 3, "icon": "Users",         "text": "180 new students enrolled at St. Xavier's",  "sub": "Bulk enrollment",       "time": "1 hr ago"},
            {"id": 4, "icon": "CreditCard",    "text": "₹4.2L payout processed to 38 mentors",       "sub": "Monthly payout",        "time": "3 hrs ago"},
            {"id": 5, "icon": "AlertTriangle", "text": "BITS Pilani — College approval pending",     "sub": "Awaiting verification", "time": "5 hrs ago"},
        ],
        "platformUsers": [
            {"label": "Students", "pct": 72, "count": "1,24,800", "color": "#FBBF24"},
            {"label": "Alumni",   "pct": 18, "count": "84,000",   "color": "#F97316"},
            {"label": "Mentors",  "pct":  7, "count": "3,240",    "color": "#A78BFA"},
            {"label": "Colleges", "pct":  3, "count": "48",       "color": "#22C55E"},
        ],
        "monthlyEnrollments": [
            {"month": "Dec", "value": 1200},
            {"month": "Jan", "value": 1800},
            {"month": "Feb", "value": 2100},
            {"month": "Mar", "value": 1700},
            {"month": "Apr", "value": 2400},
            {"month": "May", "value": 3100},
        ],
        "revenueBreakdown": [
            {"source": "Mentor sessions",       "amount": "₹12.4L", "pct": 44, "color": "#FBBF24"},
            {"source": "Premium subscriptions", "amount": "₹8.6L",  "pct": 30, "color": "#F97316"},
            {"source": "Event tickets",         "amount": "₹4.8L",  "pct": 17, "color": "#A78BFA"},
            {"source": "College SaaS plans",    "amount": "₹2.6L",  "pct":  9, "color": "#22C55E"},
        ],
    }
