"""
Migration: Add perks / ticker_messages / cyber_conclave / speaker location+category
to existing ECHO showcases in MongoDB.

These fields were added to the Pydantic schemas and seed data but existing
documents in production won't have them until either:
  a) the CMS is used to edit and save the showcase, or
  b) this migration runs.

Run:
    cd backend && python -m scripts.migrate_echo_showcase_fields

Idempotent — safe to run multiple times.  Only touches fields that are missing
(or empty lists / None dicts).
"""

from __future__ import annotations
import asyncio
import os
import sys
from datetime import datetime, timezone

# ── path setup ───────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import db  # motor async db handle

COLLECTION = "echo_showcases"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── per-slug seed data ──────────────────────────────────────────────────────
# Only fields that didn't exist before the schema update.
# Kept lean — the CMS already has the full editor.

SNIST_DATA = {
    "perks": [
        {"name": "Networking with Industry Leaders", "description": "Direct access to professionals from Google, Microsoft, and startups", "value": "Live", "icon": "users"},
        {"name": "Hackathon Prizes", "description": "₹2,00,000 Mega Grand Pool (₹50,000 Track Pool)", "value": "₹2,00,000", "icon": "trophy"},
        {"name": "Certificates for all", "description": "Participation and winner certificates with QR verification", "value": "Verifiable", "icon": "award"},
        {"name": "Free Food & Refreshments", "description": "Meals, snacks, and beverages throughout the overnight sprint", "value": "Included", "icon": "coffee"},
        {"name": "Internship Opportunities", "description": "On-the-spot internship offers from partner companies", "value": "Live", "icon": "briefcase"},
        {"name": "Cyber Security Certs", "description": "ISC2-powered cert prep track with global panelists", "value": "Premium", "icon": "shield"},
        {"name": "Open Source Bounties", "description": "Bounties and prizes for best open-source contributions", "value": "Live", "icon": "code"},
        {"name": "Workshop Kits", "description": "Hands-on lab materials for AI, Security and Cloud tracks", "value": "Included", "icon": "wrench"},
        {"name": "Exclusive Swag", "description": "HackWave 3.0 t-shirt, stickers, and badges for all participants", "value": "Included", "icon": "shirt"},
    ],
    "ticker_messages": [
        {"text": "HackWave 3.0 — National-Level 24-Hour Tech Fest"},
        {"text": "7 Verticals · AI, Security, Hiring & Firesides"},
        {"text": "₹2,00,000 Mega Grand Pool · ₹50,000 Track Pool"},
        {"text": "Free entry · Certificates · Internship offers"},
        {"text": "September 04–05, 2026 · SNIST Campus, Hyderabad"},
        {"text": "Built with love for students across all campuses"},
    ],
    "cyber_conclave": {
        "enabled": True,
        "badge": "INTERNATIONAL VIRTUAL CONCLAVE",
        "title": "Cyber Security with AI",
        "subtitle": "ISC2 New Jersey Chapter × StudentAlumni.ai — Global insights for students building a career in security",
        "date_label": "Friday, September 4, 2026",
        "time_label": "6:00 PM IST · 8:30 AM ET",
        "sessions": [
            {"title": "Global security trends", "description": "Where the threat landscape is moving."},
            {"title": "AI on both sides", "description": "How AI is reshaping defence and attack."},
            {"title": "Certifications that matter", "description": "CISSP, CC and the paths worth it."},
            {"title": "Career pathways", "description": "How to enter the field from campus."},
        ],
    },
    "speakers_patch": [
        {"name": "Stan Mierzwa, Ph.D.", "location": "Union, New Jersey, USA", "category": "International Panel"},
        {"name": "Ken Fishkin", "location": "New Jersey, USA", "category": "International Panel"},
        {"name": "Sharon Kelley", "location": "Hoboken, New Jersey, USA", "category": "International Panel"},
        {"name": "Jeremy Livingston", "location": "Effort, Pennsylvania, USA", "category": "International Panel"},
        {"name": "Suman Kalia", "location": "Jersey City, New Jersey, USA", "category": "International Panel"},
        {"name": "Jonna Dheeraj", "location": "Hyderabad, India", "category": "Voices That Build"},
        {"name": "Harish Kotra", "location": "Hyderabad, India", "category": "Voices That Build"},
        {"name": "M Avinash Rao", "location": "Hyderabad, India", "category": "Voices That Build"},
        {"name": "Gopichand Anumolu", "location": "Hyderabad, India", "category": "Voices That Build"},
    ],
}

VNR_DATA = {
    "perks": [
        {"name": "Networking with Industry Leaders", "description": "Direct access to professionals from Google, Microsoft, and startups", "value": "Live", "icon": "users"},
        {"name": "Hackathon Prizes", "description": "₹30,000 prize pool across 5 categories", "value": "₹30,000", "icon": "trophy"},
        {"name": "Certificates for all", "description": "Participation and winner certificates with QR verification", "value": "Verifiable", "icon": "award"},
        {"name": "Free Food & Refreshments", "description": "Lunch, snacks, and beverages throughout the event", "value": "Included", "icon": "coffee"},
        {"name": "Internship Opportunities", "description": "On-the-spot internship offers from partner companies", "value": "Live", "icon": "briefcase"},
    ],
    "ticker_messages": [
        {"text": "VNR ECHO 2026 — Empowering Tomorrow's Leaders"},
        {"text": "320+ students · 12 speakers · 5 hackathon tracks"},
        {"text": "Free entry for all VNR VJIET students"},
        {"text": "Certificates, networking, and internship opportunities"},
        {"text": "August 15, 2026 · Main Auditorium, VNR VJIET"},
    ],
    "cyber_conclave": {
        "enabled": False,
        "badge": "",
        "title": "",
        "subtitle": "",
        "date_label": "",
        "time_label": "",
        "sessions": [],
    },
    "speakers_patch": [
        {"name": "Vijay Raghavan", "location": "Bangalore, India", "category": "Keynote Speaker"},
        {"name": "Sneha Reddy", "location": "Hyderabad, India", "category": "Panelist"},
        {"name": "Dr. Kavitha Nair", "location": "Hyderabad, India", "category": "Academic Mentor"},
        {"name": "Arjun Mehta", "location": "Hyderabad, India", "category": "Industry Speaker"},
    ],
}

CBIT_DATA = {
    "perks": [
        {"name": "Networking with Industry Leaders", "description": "Direct access to professionals from top companies", "value": "Live", "icon": "users"},
        {"name": "Hackathon Prizes", "description": "₹35,000 prize pool", "value": "₹35,000", "icon": "trophy"},
        {"name": "Certificates for all", "description": "Participation and winner certificates", "value": "Verifiable", "icon": "award"},
        {"name": "Free Food", "description": "Lunch and refreshments included", "value": "Included", "icon": "coffee"},
        {"name": "Internship Opportunities", "description": "On-the-spot offers from partner companies", "value": "Live", "icon": "briefcase"},
    ],
    "ticker_messages": [
        {"text": "CBIT ECHO 2026 — Empowering Tomorrow's Leaders"},
        {"text": "320+ students · 12 speakers · 3 hackathon tracks"},
        {"text": "Free entry for all CBIT students"},
        {"text": "Certificates, networking, and internship opportunities"},
        {"text": "July 31, 2026 · Main Auditorium, CBIT Hyderabad"},
    ],
    "cyber_conclave": {
        "enabled": False,
        "badge": "",
        "title": "",
        "subtitle": "",
        "date_label": "",
        "time_label": "",
        "sessions": [],
    },
    "speakers_patch": [
        {"name": "Vijay Raghavan", "location": "Bangalore, India", "category": "Keynote Speaker"},
        {"name": "Sneha Reddy", "location": "Hyderabad, India", "category": "Panelist"},
        {"name": "Dr. Kavitha Nair", "location": "Hyderabad, India", "category": "Academic Mentor"},
        {"name": "Arjun Mehta", "location": "Hyderabad, India", "category": "Industry Speaker"},
    ],
}

# Generic defaults for any showcase that doesn't match above slugs
GENERIC_DEFAULTS = {
    "perks": [
        {"name": "Networking", "description": "Connect with industry professionals and alumni", "value": "Live", "icon": "users"},
        {"name": "Certificates", "description": "Participation certificates for all attendees", "value": "Verifiable", "icon": "award"},
        {"name": "Free Food", "description": "Refreshments during the event", "value": "Included", "icon": "coffee"},
    ],
    "ticker_messages": [
        {"text": "ECHO Events — Connecting students, alumni, and industry"},
        {"text": "Verified certificates · Career opportunities · Free for students"},
    ],
    "cyber_conclave": {
        "enabled": False,
        "badge": "",
        "title": "",
        "subtitle": "",
        "date_label": "",
        "time_label": "",
        "sessions": [],
    },
    "speakers_patch": [],
}

# slug → data mapping (aliases are checked separately below)
SLUG_MAP: dict[str, dict] = {
    "snist": SNIST_DATA,
    "hackwave-3.0": SNIST_DATA,
    "hackwave-3": SNIST_DATA,
    "hackwave": SNIST_DATA,
    "vnrvjit": VNR_DATA,
    "vnr-echo-2026": VNR_DATA,
    "cbit": CBIT_DATA,
    "cbit-echo-2026": CBIT_DATA,
}


def _data_for_doc(doc: dict) -> dict:
    """Return the seed-data dict matching a document's slug / aliases."""
    slug = (doc.get("slug") or "").strip().lower()
    if slug in SLUG_MAP:
        return SLUG_MAP[slug]
    aliases = [a.strip().lower() for a in (doc.get("aliases") or [])]
    for alias in aliases:
        if alias in SLUG_MAP:
            return SLUG_MAP[alias]
    return GENERIC_DEFAULTS


async def run_migration():
    print("=" * 72)
    print("Migration: ECHO showcase — perks / ticker / conclave / speaker fields")
    print("=" * 72)

    cursor = db[COLLECTION].find({})
    updated_count = 0
    skipped_count = 0

    async for doc in cursor:
        slug = doc.get("slug", doc.get("_id"))
        data = _data_for_doc(doc)
        updates: dict = {}
        unset: dict = {}

        # ── perks ───────────────────────────────────────────────────────
        if not doc.get("perks"):
            updates["perks"] = data.get("perks", [])

        # ── ticker_messages ─────────────────────────────────────────────
        if not doc.get("ticker_messages"):
            updates["ticker_messages"] = data.get("ticker_messages", [])

        # ── cyber_conclave ──────────────────────────────────────────────
        existing_conclave = doc.get("cyber_conclave")
        if not existing_conclave or not isinstance(existing_conclave, dict):
            updates["cyber_conclave"] = data.get("cyber_conclave", GENERIC_DEFAULTS["cyber_conclave"])
        else:
            # Ensure the structure has all required keys
            conclave_template = data.get("cyber_conclave", GENERIC_DEFAULTS["cyber_conclave"])
            patched = dict(existing_conclave)
            for key in ("enabled", "badge", "title", "subtitle", "date_label", "time_label", "sessions"):
                if key not in patched:
                    patched[key] = conclave_template.get(key)
            if patched != existing_conclave:
                updates["cyber_conclave"] = patched

        # ── speakers: add location + category if missing ────────────────
        speakers_patch = data.get("speakers_patch", [])
        speakers = doc.get("speakers") or []
        if speakers and speakers_patch:
            patch_by_name = {s["name"]: s for s in speakers_patch}
            patched_speakers = []
            speaker_changed = False
            for spk in speakers:
                name = spk.get("name", "")
                patch = patch_by_name.get(name)
                if patch:
                    new_spk = dict(spk)
                    if not new_spk.get("location") and patch.get("location"):
                        new_spk["location"] = patch["location"]
                        speaker_changed = True
                    if not new_spk.get("category") and patch.get("category"):
                        new_spk["category"] = patch["category"]
                        speaker_changed = True
                    patched_speakers.append(new_spk)
                else:
                    patched_speakers.append(spk)
            if speaker_changed:
                updates["speakers"] = patched_speakers

        # ── sections toggles: add perks / ticker / conclave if missing ──
        sections = doc.get("sections") or {}
        if isinstance(sections, dict):
            section_changed = False
            for key in ("perks", "ticker", "conclave"):
                if key not in sections:
                    sections[key] = True
                    section_changed = True
            if section_changed:
                updates["sections"] = sections

        # ── apply ───────────────────────────────────────────────────────
        if updates:
            updates["updated_at"] = _now()
            await db[COLLECTION].update_one(
                {"_id": doc["_id"]},
                {"$set": updates},
            )
            print(f"  ✅  Updated: {slug}  — fields: {', '.join(updates.keys())}")
            updated_count += 1
        else:
            print(f"  ⏭  Skipped: {slug}  (already has all fields)")
            skipped_count += 1

    print()
    print("-" * 72)
    print(f"Done.  Updated: {updated_count}  |  Skipped: {skipped_count}")
    print("-" * 72)


if __name__ == "__main__":
    asyncio.run(run_migration())
