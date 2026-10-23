"""
Blog & Editorial Router for StudentAlumni Platform
Handles article listing, details, creation, and MongoDB synchronization.
"""

import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Depends
from core.deps import require_admin_role
from pydantic import BaseModel, Field
from db import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/blog", tags=["Blog"])

# ── Initial Seed Data ────────────────────────────────────────────────────────
SEED_BLOG_POSTS = [
    {
    "id": "snist-hackwave-3-national-tech-fest-guide",
    "slug": "snist-hackwave-3-national-tech-fest-guide",
    "title": "HackWave 3.0 at SNIST: 7 Verticals, \u20b92,00,000 Mega Prize Pool, and the International Cyber Security Conclave",
    "category": "EVENTS",
    "subcategory": "PREVIEW & GUIDE",
    "description": "Full guide to SNIST's upcoming National 24-Hour Tech Fest on September 4\u20135, 2026. Featuring 7 verticals, global keynotes from ISC2 New Jersey, and $100+ in sponsor perks per attendee.",
    "date": "Aug 28, 2026",
    "readTime": "10 min read",
    "author": "SNIST CDC & StudentAlumni Editorial",
    "authorInitials": "SN",
    "authorTitle": "Career Development Centre, SNIST",
    "isFeatured": True,
    "tagColor": "#A78BFA",
    "tagBg": "rgba(124, 92, 252, 0.18)",
    "tagLine": "#2C2A52",
    "sections": [
        {
            "id": "snist-0",
            "label": "A National-Level Tech Fest Across 7 Verticals",
            "content": [
                "Sreenidhi Institute of Science and Technology (SNIST) in collaboration with StudentAlumni.ai presents HackWave 3.0 on September 4\u20135, 2026.",
                "HackWave 3.0 is structured across 7 flagship verticals: Build by Sunset (24-hour hackathon), Codethon, Voices That Build, Meet the People Who Hire, Cyber Security Conclave, International Panel, and Build by Fireside."
            ]
        },
        {
            "id": "snist-1",
            "label": "International Cyber Security Conclave",
            "content": [
                "On Friday, Sep 4 at 6:00 PM IST, the Cyber Security Conclave features a live virtual panel with top US experts:",
                "Dr. Stan Mierzwa (Director, Center for Cybersecurity, Kean University, USA), Ken Fishkin (President, ISC2 New Jersey Chapter), Sharon Kelley (Board Member, ISC2 NJ), Jeremy Livingston (CISO & Deputy CIO, Stevens Institute of Technology), and Dr. Suman Kalia (Chair CS, Saint Peter's University)."
            ]
        },
        {
            "id": "snist-2",
            "label": "Recruiter Room & On-The-Spot Offers",
            "content": [
                "Recruiters from Deloitte and leading tech firms will be physically present in the hall, reviewing live code and issuing on-the-spot internship and job offers."
            ]
        },
        {
            "id": "snist-3",
            "label": "\u20b92,00,000 Mega Grand Pool & Participant Perks",
            "content": [
                "Every \u20b9599 ticket includes entry to all 7 verticals, 4 meal coupons (lunch, dinner, midnight snack, breakfast), verifiable digital certificates, $29 Featherless AI accounts, $50 SetupMark AI credits, and CodeSpectra assessments."
            ]
        }
    ]
},
    {
    "id": "vnr-vjiet-build-by-sunset-retrospective",
    "slug": "vnr-vjiet-build-by-sunset-retrospective",
    "title": "How VNR VJIET Students Built & Shipped 64 Products in 12 Hours: Build by Sunset Retrospective",
    "category": "CAMPUS",
    "subcategory": "EVENT RETROSPECTIVE",
    "description": "320+ students, 64 teams, \u20b935,000 prize pool, and keynotes from Google & Microsoft. A look back at the Build by Sunset sprint held at VNR VJIET Auditorium.",
    "date": "Aug 02, 2026",
    "readTime": "7 min read",
    "author": "VNR Student Council & SA Team",
    "authorInitials": "VN",
    "authorTitle": "ECHO Series Organizers at VNR VJIET",
    "isFeatured": True,
    "tagColor": "#38BDF8",
    "tagBg": "rgba(56, 189, 248, 0.15)",
    "tagLine": "#1E3A8A",
    "sections": [
        {
            "id": "vnr-0",
            "label": "Walk In with an Idea, Walk Out with a Product",
            "content": [
                "On July 31, 2026, the Main Auditorium at VNR Vignana Jyothi Institute of Engineering & Technology (VNR VJIET) was transformed into a high-octane 12-hour build arena.",
                "Over 320 students forming 64 teams arrived at 9:00 AM with empty repos and left by 9:00 PM with working web, mobile, and AI applications deployed to production servers."
            ]
        },
        {
            "id": "vnr-1",
            "label": "Keynotes from Google & Microsoft AI Engineers",
            "content": [
                "The morning kicked off with a keynote by Vijay Raghavan (Chief AI Architect at Google), demonstrating LLM orchestration and real-time agentic workflows.",
                "Sneha Reddy (VP Engineering at Microsoft) shared insights on system reliability, encouraging student teams to test their APIs under simulated load before final demo."
            ]
        },
        {
            "id": "vnr-2",
            "label": "Corporate Partner Collaborations",
            "content": [
                "Industry partners Deloitte, Microsoft, Google, Atlast, and Featherless AI backed the event with developer tool access, API grants, and direct recruiter presence.",
                "Mentors conducted floor walks throughout the sprint, giving real-time architecture feedback to team leads."
            ]
        },
        {
            "id": "vnr-3",
            "label": "Winning Projects & \u20b935,000 Cash Awards",
            "content": [
                "The \u20b935,000 prize pool was awarded across top categories: Smart Mobility, FinTech, and AI Health Diagnostics.",
                "Winning teams received fast-tracked interview vouchers for upcoming 2026 fall placement drives."
            ]
        }
    ]
},
    {
    "id": "inside-the-corporate-ecosystem-powering-echo-2026",
    "slug": "inside-the-corporate-ecosystem-powering-echo-2026",
    "title": "Inside the Ecosystem: How Tech Giants and AI Startups Partnered with StudentAlumni for ECHO 2026",
    "category": "PARTNERSHIPS",
    "subcategory": "INDUSTRY SPOTLIGHT",
    "description": "How Google, Microsoft, Deloitte, Featherless AI, SetupMark, CodeSpectra, and ISC2 New Jersey Chapter partnered with StudentAlumni to empower campus builders.",
    "date": "Aug 25, 2026",
    "readTime": "8 min read",
    "author": "SA Partnerships Desk",
    "authorInitials": "SP",
    "authorTitle": "Corporate Relations & Strategic Ecosystems",
    "isFeatured": False,
    "tagColor": "#34D399",
    "tagBg": "rgba(16, 185, 129, 0.13)",
    "tagLine": "#17503E",
    "sections": [
        {
            "id": "corp-0",
            "label": "Why Global Tech Giants Back Campus Build Sprints",
            "content": [
                "Traditional campus placement drives often rely on resume filtering. By partnering with ECHO, companies like Deloitte, Google, and Microsoft evaluate students on live execution, problem-solving, and team collaboration."
            ]
        },
        {
            "id": "corp-1",
            "label": "Free AI Tools & Tool Grants for Every Builder",
            "content": [
                "Every participant receives over $100 in production tool grants: Featherless AI full accounts for LLM API access, SetupMark AI 50 credits for automated testing, and CodeSpectra automated skill evaluations."
            ]
        },
        {
            "id": "corp-2",
            "label": "Global Academic & Professional Alliances",
            "content": [
                "Through alliances with ISC2 New Jersey Chapter, Kean University, Stevens Institute of Technology, and Saint Peter's University, students connect directly with global cybersecurity leaders."
            ]
        }
    ]
},
    {
        "id": "what-12400-student-profiles-tell-us-about-the-first-job",
        "slug": "what-12400-student-profiles-tell-us-about-the-first-job",
        "title": "What 12,400 student profiles tell us about the first job",
        "category": "PLACEMENTS",
        "subcategory": "DATA STUDY",
        "description": "Readiness scores rise fastest in the eight weeks after a student's first mentor session — not after their first application. We looked at why, and what it means for how colleges sequence placement prep.",
        "date": "Aug 18, 2026",
        "readTime": "9 min read",
        "author": "Aisha Kapoor",
        "authorInitials": "AK",
        "authorTitle": "Head of Data at StudentAlumni.",
        "isFeatured": True,
        "tagColor": "#A78BFA",
        "tagBg": "rgba(124, 92, 252, 0.18)",
        "tagLine": "#2C2A52",
        "chartTitle": "READINESS OVER 24 WEEKS · BY FIRST ACTION TAKEN",
        "sections": [
            {
                "id": "po-0",
                "label": "The pattern we did not expect",
                "content": [
                    "Every placement cell we work with sequences the same way. Resume workshop in week one, aptitude drills in week two, then applications open and students start firing. Mentorship, if it appears at all, arrives late — a panel in the final month, or a WhatsApp group nobody uses.",
                    "We had 12,400 verified student profiles across 42 institutions and two full placement cycles. We wanted to know whether that order was right. It is not."
                ]
            },
            {
                "id": "po-1",
                "label": "What the data actually shows",
                "content": [
                    "We split students by their first substantive action on the platform — booking a mentor session, or submitting a job application — and tracked readiness for 24 weeks after.",
                    "Students whose first action was a mentor session reached 74% average readiness by week 24. Students who applied first reached 43%. The gap opens in weeks 4 to 8 and never closes.",
                    "It is not selection bias in the obvious direction. The application-first group started with marginally higher average CGPA and marginally more prior internships. They were, on paper, the stronger cohort."
                ]
            },
            {
                "id": "po-2",
                "label": "Why sequence matters",
                "content": [
                    "Three mechanisms show up clearly in the session notes and the application logs.",
                    "Rejection without feedback teaches nothing. A student who sends 40 applications and hears back from none has 40 data points and zero information. The same student after one mentor call knows their resume buries the only project a recruiter cares about.",
                    "Mentors correct the target, not just the artefact. A third of first sessions end with the student changing the role they are aiming for. Applying first locks in a target chosen with no market information.",
                    "Referrals compound and cold applications do not. A mentor who has met you once forwards your profile without being asked. Across the dataset, 61% of interviews traced back to a referral from someone the student had spoken to."
                ]
            },
            {
                "id": "po-3",
                "label": "What we changed in the product",
                "content": [
                    "We stopped showing the job board as the first thing on a new dashboard. Onboarding now ends on a suggested-mentors screen, and the roadmap's first milestone is a session rather than an application.",
                    "Agent K also holds back batch applications until a student has completed one session or explicitly overrides it. That override exists — we are not going to block someone who knows what they are doing — but it is a deliberate choice now, not the default path.",
                    "For placement cells we published a revised eight-week sequence: mentor matching in week one, target-setting in week two, resume work in week three against a target that now exists, and applications from week four."
                ]
            },
            {
                "id": "po-4",
                "label": "Method and limits",
                "content": [
                    "Observational data, not a randomised trial — students chose their own first action, and we cannot fully rule out that the kind of student who books a mentor call differs in ways we did not measure. Readiness is our own composite score, so it is not independent of the product.",
                    "Two cycles is also not many. We will publish again after the 2027 cycle, and we will say so plainly if the effect shrinks. The anonymised, aggregated dataset is available to placement officers at partner institutions on request."
                ]
            }
        ]
    },
    {
        "id": "the-three-questions-that-make-a-mentor-call-useful",
        "slug": "the-three-questions-that-make-a-mentor-call-useful",
        "title": "The three questions that make a mentor call useful",
        "category": "MENTORSHIP",
        "subcategory": "GUIDE",
        "description": "Students who arrive with a specific artefact — a resume, a repo, a rejection — get twice the follow-up.",
        "date": "Aug 12, 2026",
        "readTime": "6 min read",
        "author": "Aisha Kapoor",
        "authorInitials": "AK",
        "authorTitle": "Head of Data at StudentAlumni.",
        "isFeatured": False,
        "tagColor": "#6FD6FF",
        "tagBg": "rgba(47, 184, 198, 0.12)",
        "tagLine": "#1F4E5C",
        "sections": [
            {
                "id": "po-0",
                "label": "The prep that changes everything",
                "content": [
                    "A 30-minute mentor call can easily devolve into generic career advice if you do not bring an artefact. When students bring concrete code or a tailored resume, conversations shift from abstract tips to tactical feedback.",
                    "Over 4,200 logged mentor calls, students who uploaded a specific project repo or rejection letter before the call received 2.4x more referrals and follow-ups."
                ]
            },
            {
                "id": "po-1",
                "label": "Question 1: What am I missing in this specific diff?",
                "content": [
                    "Instead of asking 'How do I become a backend engineer?', ask 'Why did this API implementation fail performant load tests under 100 req/sec?'",
                    "Mentors love specific technical problems because it showcases your current execution depth."
                ]
            },
            {
                "id": "po-2",
                "label": "Question 2: Where would you cut this resume?",
                "content": [
                    "Every senior engineer skims resumes in under 15 seconds. Ask your mentor to point out the single line that adds the least value.",
                    "Pruning noise is usually more effective than adding buzzwords."
                ]
            },
            {
                "id": "po-3",
                "label": "Question 3: Who should I talk to next?",
                "content": [
                    "Closing a mentor session with a request for a warm introduction opens doors that cold LinkedIn messages never will."
                ]
            }
        ]
    },
    {
        "id": "agent-k-now-runs-multi-step-tasks-end-to-end",
        "slug": "agent-k-now-runs-multi-step-tasks-end-to-end",
        "title": "Agent K now runs multi-step tasks end to end",
        "category": "PRODUCT",
        "subcategory": "RELEASE",
        "description": "Referral requests, resume passes and batch applications now complete without a hand-off back to you.",
        "date": "Aug 06, 2026",
        "readTime": "5 min read",
        "author": "SA Product Team",
        "authorInitials": "PT",
        "authorTitle": "Core Platform Developers.",
        "isFeatured": False,
        "tagColor": "#A78BFA",
        "tagBg": "rgba(124, 92, 252, 0.18)",
        "tagLine": "#2C2A52",
        "sections": [
            {
                "id": "po-0",
                "label": "Automating multi-step workflows",
                "content": [
                    "Agent K is moving from a single-response AI assistant to an autonomous task runner.",
                    "When you ask Agent K to prepare a referral request, it cross-references open roles, finds matching alumni, crafts personalized context, and queues the message for approval in one workflow."
                ]
            },
            {
                "id": "po-1",
                "label": "Zero-latency resume parsing",
                "content": [
                    "The updated ATS scoring engine now parses resumes in real-time, highlighting exact missing keywords for your target role."
                ]
            }
        ]
    },
    {
        "id": "how-snist-ran-hackwave-with-985-registrations",
        "slug": "how-snist-ran-hackwave-with-985-registrations",
        "title": "How SNIST ran HackWave with 985 registrations",
        "category": "CAMPUS",
        "subcategory": "CASE STUDY",
        "description": "The CDC team's playbook for an overnight build sprint, from recruiter outreach to team formation on the floor.",
        "date": "Jul 29, 2026",
        "readTime": "8 min read",
        "author": "Sreenidhi CDC",
        "authorInitials": "SN",
        "authorTitle": "Career Development Centre, SNIST.",
        "isFeatured": False,
        "tagColor": "#34D399",
        "tagBg": "rgba(16, 185, 129, 0.13)",
        "tagLine": "#17503E",
        "sections": [
            {
                "id": "po-0",
                "label": "Building the event pipeline",
                "content": [
                    "Sreenidhi Institute of Science & Technology (SNIST) hosted HackWave with 985 student registrations across 42 partner colleges.",
                    "Using the ECHO event management suite, team formation and badge issuance were automated at the entrance, reducing check-in time to 12 seconds per attendee."
                ]
            },
            {
                "id": "po-1",
                "label": "On-the-floor team formation",
                "content": [
                    "Solo participants used the StudentAlumni QR match system to discover teammates with complementary skills (e.g. Frontend developer + ML specialist) within minutes of entering the hall."
                ]
            }
        ]
    },
    {
        "id": "matching-students-to-roles-without-leaking-their-data",
        "slug": "matching-students-to-roles-without-leaking-their-data",
        "title": "Matching students to roles without leaking their data",
        "category": "ENGINEERING",
        "subcategory": "PRIVACY",
        "description": "How the match score is computed on hashed skill vectors, so a recruiter never sees a profile you haven't shared.",
        "date": "Jul 21, 2026",
        "readTime": "11 min read",
        "author": "SA Security",
        "authorInitials": "SE",
        "authorTitle": "Security & Privacy Engineering.",
        "isFeatured": False,
        "tagColor": "#F5B342",
        "tagBg": "rgba(245, 179, 66, 0.13)",
        "tagLine": "#4A3410",
        "sections": [
            {
                "id": "po-0",
                "label": "Privacy-first recruitment matching",
                "content": [
                    "Recruiters look for specific skill sets, but students should control when their personal identity and contact info are revealed.",
                    "StudentAlumni computes candidate match scores using homomorphically encrypted skill vectors. Recruiters see compatibility percentages without access to student names until the student accepts an approach."
                ]
            }
        ]
    },
    {
        "id": "tier-2-colleges-are-closing-the-referral-gap",
        "slug": "tier-2-colleges-are-closing-the-referral-gap",
        "title": "Tier-2 colleges are closing the referral gap",
        "category": "PLACEMENTS",
        "subcategory": "REPORT",
        "description": "Alumni networks, not campus rank, now predict who gets a first-round interview. The numbers from 42 institutions.",
        "date": "Jul 14, 2026",
        "readTime": "7 min read",
        "author": "Aisha Kapoor",
        "authorInitials": "AK",
        "authorTitle": "Head of Data at StudentAlumni.",
        "isFeatured": False,
        "tagColor": "#6FD6FF",
        "tagBg": "rgba(47, 184, 198, 0.12)",
        "tagLine": "#1F4E5C",
        "sections": [
            {
                "id": "po-0",
                "label": "The rise of network-driven hiring",
                "content": [
                    "Data from 42 partner institutions shows that warm alumni referrals account for 61% of all tech interview invites for tier-2 college students."
                ]
            }
        ]
    },
    {
        "id": "your-sa-id-card-and-why-verification-matters",
        "slug": "your-sa-id-card-and-why-verification-matters",
        "title": "Your SA ID card, and why verification matters",
        "category": "PRODUCT",
        "subcategory": "IDENTITY",
        "description": "One verified identity across events, referrals, rentals and student pricing — without re-proving who you are.",
        "date": "Jul 08, 2026",
        "readTime": "4 min read",
        "author": "SA Product Team",
        "authorInitials": "PT",
        "authorTitle": "Core Identity Team.",
        "isFeatured": False,
        "tagColor": "#A78BFA",
        "tagBg": "rgba(124, 92, 252, 0.18)",
        "tagLine": "#2C2A52",
        "sections": [
            {
                "id": "po-0",
                "label": "Unified student credential",
                "content": [
                    "The digital SA ID card combines DigiLocker degree verification with campus email credentials into a single tamper-proof QR pass."
                ]
            }
        ]
    }
]


async def seed_blog_posts_if_empty():
    """Seeds the blog_posts collection if currently empty."""
    try:
        count = await db.blog_posts.count_documents({})
        if count == 0:
            for post in SEED_BLOG_POSTS:
                post["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.blog_posts.insert_many([dict(p) for p in SEED_BLOG_POSTS])
            logger.info(f"Seeded {len(SEED_BLOG_POSTS)} blog posts into db.blog_posts")
    except Exception as e:
        logger.error(f"Error seeding blog posts: {e}")


class SectionModel(BaseModel):
    id: str
    label: str
    content: List[str]

class BlogPostCreate(BaseModel):
    title: str
    category: str
    subcategory: Optional[str] = None
    description: str
    date: Optional[str] = None
    readTime: Optional[str] = "5 min read"
    author: str
    authorInitials: str
    authorTitle: str
    isFeatured: Optional[bool] = False
    tagColor: Optional[str] = "#A78BFA"
    tagBg: Optional[str] = "rgba(124, 92, 252, 0.18)"
    tagLine: Optional[str] = "#2C2A52"
    chartTitle: Optional[str] = None
    sections: Optional[List[SectionModel]] = []


@router.get("/posts")
async def list_blog_posts(
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None)
):
    """List blog articles from MongoDB with optional category and search query filters."""
    await seed_blog_posts_if_empty()
    query = {}
    
    if category and category.lower() != 'all' and category.lower() != 'saved':
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}
        
    if q and q.strip():
        search_regex = {"$regex": q.strip(), "$options": "i"}
        query["$or"] = [
            {"title": search_regex},
            {"description": search_regex},
            {"category": search_regex},
            {"author": search_regex}
        ]

    posts = await db.blog_posts.find(query, {"_id": 0}).to_list(100)
    return {"posts": posts, "total": len(posts)}


@router.get("/posts/{slug}")
async def get_blog_post(slug: str):
    """Fetch single blog article by slug/id."""
    await seed_blog_posts_if_empty()
    post = await db.blog_posts.find_one(
        {"$or": [{"slug": slug.lower()}, {"id": slug.lower()}]},
        {"_id": 0}
    )
    if not post:
        # Check case-insensitive
        post = await db.blog_posts.find_one(
            {"slug": {"$regex": f"^{slug}$", "$options": "i"}},
            {"_id": 0}
        )
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post


@router.post("/posts", dependencies=[Depends(require_admin_role)])
async def create_blog_post(payload: BlogPostCreate):
    """Create and publish a new blog post."""
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', payload.title.lower()).strip('-')
    
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"

    post_doc = payload.model_dump()
    post_doc["id"] = slug
    post_doc["slug"] = slug
    if not post_doc.get("date"):
        post_doc["date"] = datetime.now(timezone.utc).strftime("%b %d, %Y")
    post_doc["created_at"] = datetime.now(timezone.utc).isoformat()

    await db.blog_posts.insert_one(post_doc)
    post_doc.pop("_id", None)
    return {"status": "created", "post": post_doc}


@router.delete("/posts/{slug}", dependencies=[Depends(require_admin_role)])
async def delete_blog_post(slug: str):
    """Delete a blog post by slug."""
    res = await db.blog_posts.delete_one({"$or": [{"slug": slug}, {"id": slug}]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {"status": "deleted", "slug": slug}
