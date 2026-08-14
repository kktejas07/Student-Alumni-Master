"""
backend/scripts/scrape_unstop_events.py

Scrapes events, workshops, hackathons, quizzes, and competitions from Unstop (https://unstop.com)
and seeds/upserts them into the StudentAlumni ECHO Showcase collection (`echo_showcases`).
"""

import sys
import os
import re
import ssl
import json
import asyncio
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "studentalumniadmin")

CATEGORY_MAPPING = {
  "hackathons": {
      "category": "Hackathons & Coding",
      "type": "hackathon",
      "badge": "Hackathon",
  },
  "workshops": {
      "category": "Workshops & Webinars",
      "type": "workshop",
      "badge": "Workshop",
  },
  "quizzes": {
      "category": "Quizzes & Contests",
      "type": "quiz",
      "badge": "Quiz",
  },
  "competitions": {
      "category": "Competitions & Case Studies",
      "type": "competition",
      "badge": "Competition",
  },
}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:80].strip("-")


def fetch_unstop_category(cat_key: str, limit: int = 15) -> list[dict]:
    url = f"https://unstop.com/api/public/opportunity/search-result?opportunity={cat_key}&per_page={limit}"
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

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            raw_data = json.loads(resp.read().decode("utf-8"))
            items = raw_data.get("data", {}).get("data", [])
            print(f"Fetched {len(items)} items from Unstop [{cat_key}]")
            return items
    except Exception as e:
        print(f"Error fetching Unstop category {cat_key}: {e}")
        return []


def transform_unstop_item(item: dict, cat_key: str) -> dict:
    cat_info = CATEGORY_MAPPING.get(cat_key, {
        "category": "General Event",
        "type": "event",
        "badge": "Event",
    })

    title = (item.get("title") or "Unstop Event").strip()
    org_name = (item.get("organisation") or {}).get("name") or "Unstop Partner"
    public_url = f"https://unstop.com/{item.get('seo_url') or ''}" if item.get("seo_url") else "https://unstop.com"

    # Extract images
    banner_img = (item.get("banner_mobile") or {}).get("image_url") or (item.get("logo") or {}).get("image_url") or "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200"

    # Extract dates
    reg_req = item.get("regnRequirements") or {}
    start_dt = reg_req.get("start_regn_dt") or item.get("start_date") or ""
    end_dt = reg_req.get("end_regn_dt") or item.get("end_date") or ""

    date_label = "Open"
    if start_dt and end_dt:
        date_label = f"{start_dt[:10]} – {end_dt[:10]}"
    elif end_dt:
        date_label = f"Ends {end_dt[:10]}"

    slug = f"unstop-{cat_key}-{slugify(title)}-{item.get('id') or ''}"

    # Determine status
    raw_status = (item.get("status") or "LIVE").upper()
    badge_status = "Live" if raw_status == "LIVE" else "Upcoming"

    description = f"""### {title}
Organized by **{org_name}** via Unstop.

**Event Category:** {cat_info['category']}
**Registration Deadline:** {end_dt[:10] if end_dt else 'Open'}

#### Event Details
Participate in this official event organized on Unstop. Enhance your skills, collaborate with peers, and showcase your expertise!

* **Eligible Candidates:** Students, Freshers & Professionals
* **Mode:** Online / Hybrid
* **Official Link:** [View on Unstop]({public_url})
"""

    return {
        "slug": slug,
        "title": title,
        "tagline": f"Organized by {org_name} on Unstop",
        "category": cat_info["category"],
        "type": cat_info["type"],
        "status": "published",
        "event_status_badge": badge_status,
        "organizer_name": org_name,
        "organizer_type": "Partner",
        "date": date_label,
        "end_date": end_dt[:10] if end_dt else "",
        "time": "10:00 AM IST",
        "venue": "Online / Virtual",
        "banner_url": banner_img,
        "description": description,
        "fee": 0.0,
        "currency": "INR",
        "source": "unstop",
        "unstop_id": item.get("id"),
        "external_url": public_url,
        "registration": {
            "enabled": True,
            "deadline": end_dt if end_dt else "2026-12-31T23:59:59+05:30",
            "ticket_template": "aurora",
            "max_seats": 1000,
        },
        "tags": [cat_info["badge"], "Unstop", "National Level", "Student Opportunities"],
        "gallery_layout": "grid",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


async def run_unstop_sync():
    print(f"Connecting to MongoDB: {MONGO_URL} (db: {DB_NAME})...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    total_synced = 0

    for cat_key in CATEGORY_MAPPING:
        print(f"\nProcessing category: {cat_key}...")
        raw_items = fetch_unstop_category(cat_key, limit=15)

        for raw_item in raw_items:
            doc = transform_unstop_item(raw_item, cat_key)

            # Upsert into echo_showcases by slug or unstop_id
            res = await db.echo_showcases.update_one(
                {"slug": doc["slug"]},
                {"$set": doc},
                upsert=True,
            )
            total_synced += 1

    print(f"\nSuccessfully synced {total_synced} Unstop events & workshops into `echo_showcases` collection!")
    client.close()
    return total_synced


if __name__ == "__main__":
    asyncio.run(run_unstop_sync())
