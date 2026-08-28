"""
community_blog_agent.py — AI Community & Event Blog Generator Agent
Auto-generates structured editorial blog posts highlighting student communities, hackathon achievements, and campus chapters,
syncing them directly to MongoDB `db.blogs` for public display on the platform blog (`/blog`).
"""
from __future__ import annotations
import uuid
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

class CommunityBlogAgent:
    """Agent that auto-generates and publishes blogs for student communities and events."""

    async def generate_community_blog(self, db: Any, community_id: str) -> Dict[str, Any]:
        """Generates a structured community spotlight blog post and publishes it to db.blogs."""
        try:
            comm = await db.community_directory.find_one({"id": community_id}, {"_id": 0})
        except Exception:
            comm = None

        if not comm:
            from services.agents.outreach_scout_service import INITIAL_COMMUNITIES
            for c in INITIAL_COMMUNITIES:
                if c["id"] == community_id:
                    comm = c
                    break

        if not comm:
            raise ValueError(f"Community {community_id} not found")

        comm_name = comm.get("name", "Student Tech Community")
        domain = comm.get("domain", "general").upper()
        organizer = comm.get("organizer_name", "Community Leader")
        location = comm.get("location", "Global")
        members = comm.get("members_count", 500)

        slug = f"community-spotlight-{re.sub(r'[^a-z0-9]+', '-', comm_name.lower()).strip('-')}"
        now_date = datetime.now(timezone.utc).strftime("%b %d, %Y")
        blog_id = f"blog-{uuid.uuid4().hex[:8]}"

        blog_doc = {
            "id": blog_id,
            "slug": slug,
            "title": f"Community Spotlight: How {comm_name} is Empowering {members}+ Student Builders in {domain}",
            "category": "COMMUNITY SPOTLIGHT",
            "subcategory": f"{domain} BUILDERS",
            "description": f"An inside look at {comm_name} in {location}, led by {organizer}. Discover how student developers are leveraging Student Alumni cloud perks, mentorship, and hackathons.",
            "date": now_date,
            "readTime": "6 min read",
            "author": "SA Editorial Team",
            "authorInitials": "SA",
            "authorTitle": "Core Community & Ecosystem Team",
            "isFeatured": True,
            "tagColor": "#8B5CF6",
            "tagBg": "rgba(139, 92, 246, 0.18)",
            "tagLine": "#4C1D95",
            "chartTitle": f"MEMBER GROWTH & PERK ADOPTION · {comm_name.upper()}",
            "community_id": community_id,
            "sections": [
                {
                    "id": "sec-0",
                    "label": f"Building the future of {domain} on campus",
                    "content": [
                        f"{comm_name} started as a group of passionate students in {location} and has expanded into a flourishing collective of {members}+ developers, researchers, and creators.",
                        f"Led by {organizer}, the community brings together students from diverse academic streams to collaborate on open-source software, AI models, and hackathon projects."
                    ]
                },
                {
                    "id": "sec-1",
                    "label": "Bridging campus learning with industry mentorship",
                    "content": [
                        f"Through the Student Alumni (SA) network, members of {comm_name} gain direct access to verified alumni mentors working at top tech firms, along with exclusive student cloud credits and tool vouchers.",
                        "Mentorship sessions focus on real-world code architecture, portfolio reviews, and career acceleration, ensuring students graduate job-ready."
                    ]
                },
                {
                    "id": "sec-2",
                    "label": "Unlocked student perks and upcoming hackathons",
                    "content": [
                        f"As an official SA Partner Community, members of {comm_name} have unlocked verified cloud compute credits, API vouchers, and swag kits.",
                        "Looking ahead, the chapter is co-hosting the upcoming ECHO 2026 Hackathon series to showcase student innovations on a global stage."
                    ]
                }
            ],
            "published_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            await db.blogs.update_one(
                {"slug": slug},
                {"$set": blog_doc},
                upsert=True
            )
            await db.community_directory.update_one(
                {"id": community_id},
                {"$set": {"published_blog": blog_doc}}
            )
        except Exception as e:
            print(f"Error publishing blog to DB: {e}")

        return {"ok": True, "blog": blog_doc}

    async def generate_event_blog(self, db: Any, event_title: str = "ECHO 2026 Hackathon") -> Dict[str, Any]:
        """Generates an event recap/guide blog post and publishes it to db.blogs."""
        slug = f"event-recap-{re.sub(r'[^a-z0-9]+', '-', event_title.lower()).strip('-')}"
        now_date = datetime.now(timezone.utc).strftime("%b %d, %Y")
        blog_id = f"blog-event-{uuid.uuid4().hex[:8]}"

        blog_doc = {
            "id": blog_id,
            "slug": slug,
            "title": f"{event_title}: Uniting 10,000+ Student Developers Across 40+ Campuses",
            "category": "EVENTS & HACKATHONS",
            "subcategory": "ECHO SHOWCASE",
            "description": f"Highlights, winning projects, and key takeaways from {event_title}. See how student teams built AI applications, open-source tools, and cloud platforms overnight.",
            "date": now_date,
            "readTime": "8 min read",
            "author": "SA Events Desk",
            "authorInitials": "ED",
            "authorTitle": "ECHO Hackathon & Events Team",
            "isFeatured": True,
            "tagColor": "#EC4899",
            "tagBg": "rgba(236, 72, 153, 0.18)",
            "tagLine": "#831843",
            "chartTitle": "STUDENT REGISTRATIONS & PROJECT SUBMISSIONS",
            "sections": [
                {
                    "id": "sec-ev-0",
                    "label": "Overnight innovation at scale",
                    "content": [
                        f"{event_title} brought together student teams from premier engineering colleges to build high-impact tech solutions.",
                        "Using the ECHO automated verification suite, badge issuance and team matching were completed seamlessly on the floor."
                    ]
                },
                {
                    "id": "sec-ev-1",
                    "label": "Mentorship on the floor",
                    "content": [
                        "Over 120 verified alumni mentors provided live project feedback, architecture guidance, and code reviews throughout the sprint.",
                        "Winning student projects received cash bounties, cloud credits, and direct interview fast-tracks from corporate partners."
                    ]
                }
            ],
            "published_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            await db.blogs.update_one(
                {"slug": slug},
                {"$set": blog_doc},
                upsert=True
            )
        except Exception as e:
            print(f"Error publishing event blog to DB: {e}")

        return {"ok": True, "blog": blog_doc}


community_blog_agent = CommunityBlogAgent()
