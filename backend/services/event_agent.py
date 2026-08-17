"""
backend/services/event_agent.py

AI Agent Scraping Pipeline for Global Events.
Scrapes open events (Hackathons, Workshops, Quizzes, Competitions, Webinars, Fests)
from global sources (Unstop, open portals, etc.) and transforms/upserts them
into the `events_v2` collection in MongoDB. `echo_showcases` is curated
manually and must NOT be auto-populated by this agent.
"""

import sys
import os
import re
import ssl
import json
import logging
import asyncio
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger("event_agent")

CATEGORY_MAPPING = {
    "hackathons": {
        "category": "Hackathons & Coding",
        "type": "hackathon",
        "badge": "Hackathon",
        "accent": "#3B82F6",
    },
    "workshops": {
        "category": "Workshops & Webinars",
        "type": "workshop",
        "badge": "Workshop",
        "accent": "#F59E0B",
    },
    "quizzes": {
        "category": "Quizzes & Contests",
        "type": "quiz",
        "badge": "Quiz",
        "accent": "#10B981",
    },
    "competitions": {
        "category": "Competitions & Case Studies",
        "type": "competition",
        "badge": "Competition",
        "accent": "#8B5CF6",
    },
}

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:80].strip("-")

class GlobalEventAgent:
    """AI Agent responsible for pulling, transforming, and deduplicating open global events."""

    def __init__(self, limit_per_category: int = 15):
        self.limit = limit_per_category

    def fetch_unstop_events(self, cat_key: str) -> List[Dict[str, Any]]:
        """Fetch live open events from Unstop public API endpoint."""
        url = f"https://unstop.com/api/public/opportunity/search-result?opportunity={cat_key}&per_page={self.limit}"
        logger.debug(f"[EventAgent DEBUG] Initializing HTTP request to endpoint: {url}")
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
            },
        )

        start_time = datetime.now(timezone.utc)
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                elapsed_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
                raw_data = json.loads(resp.read().decode("utf-8"))
                items = raw_data.get("data", {}).get("data", [])
                logger.info(f"[EventAgent] Fetched {len(items)} items for '{cat_key}' in {elapsed_ms:.1f}ms")
                logger.debug(f"[EventAgent DEBUG] Category '{cat_key}' response payload size: {len(json.dumps(items))} bytes")
                return items
        except Exception as e:
            logger.error(f"[EventAgent] Error fetching category '{cat_key}': {e}", exc_info=True)
            return []

    def transform_item(self, item: Dict[str, Any], cat_key: str) -> Dict[str, Any]:
        """Transform raw scraped payload into standardized schema."""
        cat_info = CATEGORY_MAPPING.get(cat_key, {
            "category": "General Event",
            "type": "event",
            "badge": "Event",
            "accent": "#EC4899",
        })

        title = (item.get("title") or "Global Event").strip()
        org_name = (item.get("organisation") or {}).get("name") or "Global Partner"
        public_url = f"https://unstop.com/{item.get('seo_url') or ''}" if item.get("seo_url") else "https://unstop.com"

        banner_img = (item.get("banner_mobile") or {}).get("image_url") or (item.get("logo") or {}).get("image_url") or "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200"

        reg_req = item.get("regnRequirements") or {}
        start_dt = reg_req.get("start_regn_dt") or item.get("start_date") or ""
        end_dt = reg_req.get("end_regn_dt") or item.get("end_date") or ""

        date_label = "Open"
        if start_dt and end_dt:
            date_label = f"{start_dt[:10]} – {end_dt[:10]}"
        elif end_dt:
            date_label = f"Ends {end_dt[:10]}"

        unstop_id = str(item.get("id") or "")
        slug = f"unstop-{cat_key}-{slugify(title)}-{unstop_id}"

        raw_status = (item.get("status") or "LIVE").upper()
        badge_status = "Live" if raw_status == "LIVE" else "Upcoming"

        description = f"""### {title}
Organized by **{org_name}**.

**Category:** {cat_info['category']}
**Registration Deadline:** {end_dt[:10] if end_dt else 'Open'}

#### Overview
Participate in this official global event! Enhance your skills, collaborate with peers, and showcase your expertise to recruiters and sponsors worldwide.

* **Eligibility:** Open for Students, Freshers & Young Professionals
* **Mode:** Online / Virtual
* **Official URL:** [{public_url}]({public_url})
"""

        doc = {
            "event_id": slug,
            "slug": slug,
            "title": title,
            "tagline": f"Organized by {org_name}",
            "category": cat_info["category"],
            "type": cat_info["type"],
            "event_type": cat_info["type"],
            "status": "published",
            "is_active": True,
            "event_status_badge": badge_status,
            "organizer_name": org_name,
            "organizer_type": "Partner",
            "date": date_label,
            "end_date": end_dt[:10] if end_dt else "",
            "time": "10:00 AM IST",
            "venue": "Online / Virtual",
            "mode": "online",
            "city": "Online",
            "banner_url": banner_img,
            "description": description,
            "fee": 0.0,
            "price_type": "free",
            "currency": "INR",
            "source": "unstop",
            "unstop_id": unstop_id,
            "external_url": public_url,
            "attending": item.get("register_count") or 120,
            "capacity": 1000,
            "registration": {
                "enabled": True,
                "deadline": end_dt if end_dt else "2026-12-31T23:59:59+05:30",
                "ticket_template": "aurora",
                "max_seats": 1000,
            },
            "tags": [cat_info["badge"], "Global", "Student Opportunities"],
            "accent": cat_info["accent"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        logger.debug(f"[EventAgent DEBUG] Transformed '{title}' -> slug: {slug}")
        return doc

    async def sync_to_db(self, db) -> int:
        """Run the scraping pipeline and update MongoDB collections."""
        total_synced = 0
        sync_start = datetime.now(timezone.utc)
        logger.debug("[EventAgent DEBUG] Beginning database sync loop across categories...")
        for cat_key in CATEGORY_MAPPING:
            raw_items = self.fetch_unstop_events(cat_key)
            for raw_item in raw_items:
                doc = self.transform_item(raw_item, cat_key)
                slug = doc["slug"]

                # Upsert into events_v2 for global search APIs.
                # NOTE: echo_showcases is intentionally NOT written here —
                # it is a curated collection (see module docstring).
                await db.events_v2.update_one(
                    {"event_id": slug},
                    {"$set": doc},
                    upsert=True,
                )
                total_synced += 1

        elapsed = (datetime.now(timezone.utc) - sync_start).total_seconds()
        logger.info(f"[EventAgent] Successfully synced {total_synced} global events in {elapsed:.2f}s.")
        return total_synced


async def run_global_event_agent(db_client=None) -> int:
    """Async runner function called periodically every 30 minutes."""
    try:
        if db_client is None:
            from core.db import db as db_client
        agent = GlobalEventAgent(limit_per_category=15)
        return await agent.sync_to_db(db_client)
    except Exception as e:
        logger.error(f"[EventAgent] Background sync task failed: {e}")
        return 0


if __name__ == "__main__":
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "studentalumniadmin")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    async def main():
        agent = GlobalEventAgent()
        res = await agent.sync_to_db(db)
        print(f"Synced {res} events successfully.")
        client.close()

    asyncio.run(main())
