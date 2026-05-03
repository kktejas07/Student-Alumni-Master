"""
events_aggregator.py — A free-tier multi-source event aggregator covering the
12-prompt Events spec (search, dedup, cache, RSVP w/ SA Credits, capacity caps,
waitlist, .ics export, AI recommendations, host/create flow, college approval).

Stack remap: FastAPI + MongoDB instead of Express + Postgres + Redis.

Endpoints (all under /api):

  Discovery / search:
    GET    /events/search                — aggregated search (filters + pagination)
    GET    /events/{event_id}             — detail with RSVP status
    GET    /events/recommendations        — AI-powered "Best events for me"
    GET    /events/category-counts        — counts per event_type for filter pills

  User actions:
    POST   /events/{event_id}/save        — toggle bookmark
    POST   /events/{event_id}/rsvp        — register (capacity + waitlist + SA Credits)
    POST   /events/{event_id}/cancel-rsvp — cancel RSVP, refund SA Credits if free-tier
    POST   /events/{event_id}/activity    — track view/save/click_redirect
    GET    /events/me/saved               — saved events
    GET    /events/me/registered          — registered events
    GET    /events/{event_id}/ics         — .ics calendar export
    GET    /events/preferences            — user event preferences
    PATCH  /events/preferences            — update prefs (price + locations + types)

  Hosting (mentor / college / admin):
    POST   /events                        — create event (mentor=auto-publish, college=needs admin approval)
    PATCH  /events/{event_id}             — update event (host or admin)
    DELETE /events/{event_id}             — soft-delete (set is_active=false)
    GET    /events/me/hosted              — events I host
    GET    /admin/events/pending          — admin: pending college events
    POST   /admin/events/{event_id}/approve   — admin: approve a pending event
    POST   /admin/events/{event_id}/reject    — admin: reject with reason

  Aggregation refresh:
    POST   /events/refresh                — force refresh from upstream APIs (admin)

Mongo collections:
   events_v2                — primary store
   user_event_preferences   — per-user filters
   event_cache              — upstream API responses (TTL-indexed)
   event_activity_log       — view/save/register clicks
   event_registrations      — RSVPs (status: registered | waitlisted | cancelled)
"""
from __future__ import annotations

import os
import re
import json
import asyncio
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import aiohttp
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

logger = logging.getLogger("events_aggregator")
router = APIRouter()


# ─── Constants ──────────────────────────────────────────────────────────
EVENT_TYPES = ["hackathon", "codethon", "workshop", "tech_talk", "training",
               "founder_talk", "meetup", "fest", "boot_camp"]

EVENT_TYPE_TINTS = {
    "hackathon":    "#3B82F6",  # blue
    "codethon":     "#10B981",  # green
    "workshop":     "#F97316",  # orange
    "tech_talk":    "#8B5CF6",  # purple
    "training":     "#14B8A6",  # teal
    "founder_talk": "#EC4899",  # pink
    "meetup":       "#64748B",  # slate
    "fest":         "#F59E0B",  # amber
    "boot_camp":    "#A855F7",  # violet
}

CACHE_TTL_MIN = 30
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 60

# Institution tier classification (regex patterns -> tier)
TIER_PATTERNS: List[tuple] = [
    ("top_tier",   re.compile(r"\b(IIT[ -]?(Bombay|Delhi|Madras|Kanpur|Kharagpur|Roorkee|Guwahati|Hyderabad)|ISB|XLRI|IIM[ -]?(Ahmedabad|Bangalore|Calcutta|Lucknow)|Stanford|Harvard|MIT|Oxford|Cambridge|Berkeley|CMU)\b", re.I)),
    ("tier_one",   re.compile(r"\b(NIT|BITS|IIIT|VIT|Manipal|Ashoka|Anna University|Delhi University|JNU|Jadavpur)\b", re.I)),
    ("tier_two",   re.compile(r"\b(SRM|Amity|LPU|Symbiosis|Christ University|Thapar|DTU|NSIT|COEP|PEC)\b", re.I)),
]

# Topic keyword detection (token presence in title+description)
TOPIC_KEYWORDS: Dict[str, List[str]] = {
    "ai":               ["ai", "artificial intelligence", "ml", "machine learning", "deep learning", "llm", "neural"],
    "machine_learning": ["machine learning", "ml ", "ai/ml", "data science"],
    "cloud":            ["aws", "azure", "gcp", "cloud", "kubernetes", "devops", "docker"],
    "startup":          ["startup", "entrepreneur", "founder", "yc ", "ycombinator", "incubat"],
    "innovation":       ["innovation", "innovative", "disrupt"],
    "engineering":      ["engineering", "engineer", "system design", "architecture"],
    "technical":        ["technical", "technology", "tech ", "developer", "software"],
    "leadership":       ["leadership", "leader", "management", "ceo", "cto", "executive"],
}

# Region India cities
INDIA_REGIONS = ["hyderabad", "bangalore", "mumbai", "chennai", "pune", "delhi",
                 "kolkata", "ahmedabad", "gurgaon", "cochin"]


def _classify_institution_tier(text: str) -> str:
    """Returns top_tier / tier_one / tier_two / regional based on text match."""
    if not text:
        return "regional"
    for tier, pat in TIER_PATTERNS:
        if pat.search(text):
            return tier
    return "regional"


def _extract_topics(text: str) -> List[str]:
    if not text:
        return []
    t = text.lower()
    out = []
    for topic, kws in TOPIC_KEYWORDS.items():
        if any(kw in t for kw in kws):
            out.append(topic)
    return out


def _classify_event_mode(city: str, country: str, description: str = "") -> str:
    blob = f"{city or ''} {description or ''}".lower()
    if "online" in blob or "virtual" in blob or "remote" in blob or "webinar" in blob:
        return "virtual"
    if "hybrid" in blob:
        return "hybrid"
    return "in_person"


# ─── Auth dependency lazy import ────────────────────────────────────────
def _get_current_user_dependency():
    from server import get_current_user  # noqa
    return get_current_user


# ─── Helpers ────────────────────────────────────────────────────────────
def _dedup_hash(title: str, city: str, when: str) -> str:
    raw = f"{(title or '').lower().strip()}|{(city or '').lower().strip()}|{(when or '').strip()[:10]}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _safe_iso(dt: Any) -> Optional[str]:
    if not dt:
        return None
    if isinstance(dt, datetime):
        return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()
    if isinstance(dt, str):
        try:
            d = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            return d.isoformat()
        except Exception:
            return dt
    return None


def _to_dt(s: Any) -> Optional[datetime]:
    if not s:
        return None
    if isinstance(s, datetime):
        return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def _normalize(record: Dict[str, Any], source: str) -> Optional[Dict[str, Any]]:
    """Map upstream payload → unified schema. Returns None if missing required fields."""
    title = (record.get("title") or record.get("name") or "").strip()
    if not title:
        return None
    when = _safe_iso(record.get("event_date_start") or record.get("starts_at")
                    or record.get("start") or record.get("startDate"))
    if not when:
        return None
    organizer = record.get("organizer_name") or record.get("organizer") or source.title()
    desc = (record.get("description") or "")[:2000]
    city = record.get("location_city") or record.get("city") or "Online"
    country = record.get("location_country") or record.get("country") or "Global"
    classify_text = f"{title} {organizer} {desc}"
    return {
        "event_id": record.get("event_id") or record.get("id") or hashlib.md5(
            f"{source}|{title}|{when}".encode()).hexdigest()[:12],
        "title": title[:255],
        "description": desc,
        "event_type": record.get("event_type") or "meetup",
        "location_country": country,
        "location_city": city,
        "event_date_start": when,
        "event_date_end": _safe_iso(record.get("event_date_end") or record.get("ends_at")
                                    or record.get("end") or record.get("endDate")) or when,
        "price_type": record.get("price_type") or ("free" if not record.get("price_amount") else "paid"),
        "price_amount": float(record.get("price_amount") or 0),
        "currency": record.get("currency") or "INR",
        "registration_url": record.get("registration_url") or record.get("url") or "",
        "organizer_name": organizer,
        "attendee_count": int(record.get("attendee_count") or 0),
        "capacity": int(record.get("capacity") or 0),
        "image_url": record.get("image_url") or record.get("image") or "",
        "source_url_array": record.get("source_url_array") or [record.get("url")] if record.get("url") else [],
        "posted_date": _safe_iso(record.get("posted_date")) or datetime.now(timezone.utc).isoformat(),
        "source": source,
        "is_active": True,
        # New v2 fields
        "event_mode": record.get("event_mode") or _classify_event_mode(city, country, desc),
        "institution_tier": record.get("institution_tier") or _classify_institution_tier(classify_text),
        "topic_keywords": record.get("topic_keywords") or _extract_topics(classify_text),
        "region_india": (city or "").lower() if (country or "").lower() == "india" else None,
    }


# ─── Upstream fetchers (free-tier, no API key) ──────────────────────────
async def _fetch_devpost(session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
    """Devpost Hackathons API — no auth required."""
    out: List[Dict[str, Any]] = []
    try:
        async with session.get(
            "https://devpost.com/api/hackathons?challenge_type[]=online&order_by=recently-added&page=1",
            timeout=aiohttp.ClientTimeout(total=8),
            headers={"Accept": "application/json"},
        ) as r:
            if r.status != 200:
                return []
            j = await r.json(content_type=None)
            for h in (j.get("hackathons") or [])[:30]:
                start = h.get("submission_period_dates", "").split(" - ")[0] if h.get("submission_period_dates") else None
                # Devpost returns "Apr 30, 2026" — convert to ISO
                start_iso = None
                if start:
                    try:
                        start_iso = datetime.strptime(start.strip(), "%b %d, %Y").replace(tzinfo=timezone.utc).isoformat()
                    except Exception:
                        try:
                            start_iso = datetime.strptime(start.strip(), "%B %d, %Y").replace(tzinfo=timezone.utc).isoformat()
                        except Exception:
                            pass
                out.append({
                    "id": f"devpost-{h.get('id')}",
                    "title": h.get("title"),
                    "description": (h.get("description") or "")[:1000],
                    "event_type": "hackathon",
                    "location_country": "Global",
                    "location_city": "Online" if "online" in (h.get("submission_period_dates") or "").lower() else "Hybrid",
                    "event_date_start": start_iso,
                    "event_date_end": start_iso,
                    "price_type": "free",
                    "registration_url": h.get("url"),
                    "organizer_name": (h.get("organization_name") or "Devpost"),
                    "image_url": h.get("thumbnail_url") or "",
                    "attendee_count": int(h.get("registrations_count") or 0),
                    "url": h.get("url"),
                })
    except Exception as e:
        logger.warning(f"devpost fetch failed: {e}")
    return out


async def _fetch_hackclub(session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
    """Hack Club hackathons — open API."""
    out: List[Dict[str, Any]] = []
    try:
        async with session.get(
            "https://hackathons.hackclub.com/api/events/upcoming",
            timeout=aiohttp.ClientTimeout(total=8),
        ) as r:
            if r.status != 200:
                return []
            j = await r.json(content_type=None)
            for h in (j if isinstance(j, list) else [])[:30]:
                start = h.get("start")
                end = h.get("end")
                country = (h.get("country") or "Global")
                city = h.get("city") or ("Online" if h.get("virtual") else (h.get("state") or country))
                out.append({
                    "id": f"hackclub-{h.get('id')}",
                    "title": h.get("name"),
                    "description": h.get("description") or f"Hack Club hackathon — {h.get('name')}",
                    "event_type": "hackathon",
                    "location_country": country,
                    "location_city": city,
                    "event_date_start": _safe_iso(start),
                    "event_date_end": _safe_iso(end) or _safe_iso(start),
                    "price_type": "free",
                    "registration_url": h.get("website"),
                    "organizer_name": h.get("organizer") or "Hack Club",
                    "image_url": h.get("logo", {}).get("url") if isinstance(h.get("logo"), dict) else (h.get("logo") or ""),
                    "attendee_count": int(h.get("attendees") or 0),
                    "url": h.get("website"),
                })
    except Exception as e:
        logger.warning(f"hackclub fetch failed: {e}")
    return out


async def _fetch_eventyay(session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
    """Open Event Server (Eventyay) — free, no auth required."""
    out: List[Dict[str, Any]] = []
    try:
        url = "https://api.eventyay.com/v1/events?filter=[{\"name\":\"state\",\"op\":\"eq\",\"val\":\"published\"}]&page[size]=30"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as r:
            if r.status != 200:
                return []
            j = await r.json(content_type=None)
            for h in (j.get("data") or [])[:30]:
                a = h.get("attributes") or {}
                title = a.get("name")
                if not title:
                    continue
                location_name = a.get("location-name") or "Online"
                # heuristic city/country split
                parts = [p.strip() for p in (location_name or "").split(",")]
                city = parts[0] if parts else "Online"
                country = parts[-1] if len(parts) > 1 else "Global"
                kind_lower = (a.get("event-type") or "").lower()
                etype = "meetup"
                for et in EVENT_TYPES:
                    if et.replace("_", " ") in kind_lower or et in kind_lower:
                        etype = et
                        break
                out.append({
                    "id": f"eventyay-{h.get('id')}",
                    "title": title,
                    "description": (a.get("description") or "")[:1000],
                    "event_type": etype,
                    "location_country": country,
                    "location_city": city,
                    "event_date_start": _safe_iso(a.get("starts-at")),
                    "event_date_end": _safe_iso(a.get("ends-at")),
                    "price_type": "paid" if a.get("is-ticketing-enabled") else "free",
                    "registration_url": (a.get("external-event-url") or "https://eventyay.com/e/" + str(h.get("identifier") or h.get("id"))),
                    "organizer_name": a.get("organizer-name") or "Eventyay",
                    "image_url": a.get("large-image-url") or a.get("thumbnail-image-url") or "",
                    "attendee_count": 0,
                    "url": a.get("external-event-url"),
                })
    except Exception as e:
        logger.warning(f"eventyay fetch failed: {e}")
    return out


# ─── Curated India fallback (always seeded) ─────────────────────────────
INDIA_FALLBACK_EVENTS = [
    {"id":"in-sih-26","title":"Smart India Hackathon 2026","description":"India's biggest national-level hackathon to solve real-world problems.","event_type":"hackathon","location_country":"India","location_city":"Bangalore","event_date_start":"2026-08-15T09:00:00+00:00","event_date_end":"2026-08-17T18:00:00+00:00","price_type":"free","registration_url":"https://www.sih.gov.in","organizer_name":"AICTE & MoE","image_url":"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800","capacity":1000,"attendee_count":823},
    {"id":"in-iith-ai","title":"AI/ML Bootcamp @ IIT Hyderabad","description":"5-day intensive AI/ML bootcamp covering transformers, RAG, fine-tuning.","event_type":"workshop","location_country":"India","location_city":"Hyderabad","event_date_start":"2026-06-12T09:00:00+00:00","event_date_end":"2026-06-16T18:00:00+00:00","price_type":"paid","price_amount":499,"currency":"INR","registration_url":"https://www.iith.ac.in","organizer_name":"IIT Hyderabad","image_url":"https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800","capacity":200,"attendee_count":141},
    {"id":"in-yc-talk","title":"Founder Talk: Building B2B SaaS in India","description":"Live AMA with successful Indian B2B SaaS founders on GTM strategy.","event_type":"founder_talk","location_country":"India","location_city":"Bangalore","event_date_start":"2026-05-20T18:30:00+00:00","event_date_end":"2026-05-20T20:00:00+00:00","price_type":"free","registration_url":"https://example.com/yc-talk","organizer_name":"YC India","image_url":"https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800","capacity":500,"attendee_count":312},
    {"id":"in-techfest","title":"Techfest IIT Bombay 2026","description":"Asia's largest science & tech festival — robotics, AI, hackathons, and more.","event_type":"fest","location_country":"India","location_city":"Mumbai","event_date_start":"2026-12-15T09:00:00+00:00","event_date_end":"2026-12-17T22:00:00+00:00","price_type":"free","registration_url":"https://techfest.org","organizer_name":"IIT Bombay","image_url":"https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800","capacity":10000,"attendee_count":7821},
    {"id":"in-pyconf","title":"PyCon India 2026","description":"Annual conference for the Python community in India — talks, tutorials, hackathons.","event_type":"tech_talk","location_country":"India","location_city":"Pune","event_date_start":"2026-09-26T09:00:00+00:00","event_date_end":"2026-09-29T18:00:00+00:00","price_type":"paid","price_amount":1499,"currency":"INR","registration_url":"https://in.pycon.org","organizer_name":"PyCon India Team","image_url":"https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800","capacity":1500,"attendee_count":943},
    {"id":"in-react-meetup","title":"React Native Meetup Bangalore","description":"Monthly meetup for React Native devs. Demos, lightning talks, networking.","event_type":"meetup","location_country":"India","location_city":"Bangalore","event_date_start":"2026-05-25T18:00:00+00:00","event_date_end":"2026-05-25T21:00:00+00:00","price_type":"free","registration_url":"https://example.com/rn-blr","organizer_name":"Bangalore RN Meetup","image_url":"https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800","capacity":80,"attendee_count":52},
    {"id":"in-data-trn","title":"Data Engineering Training (Live)","description":"4-week live training: Spark, Airflow, Snowflake, dbt. Industry mentors.","event_type":"training","location_country":"India","location_city":"Online","event_date_start":"2026-07-01T19:00:00+00:00","event_date_end":"2026-07-28T21:00:00+00:00","price_type":"paid","price_amount":3999,"currency":"INR","registration_url":"https://example.com/data-trn","organizer_name":"Data Council India","image_url":"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800","capacity":120,"attendee_count":78},
    {"id":"in-codeathon-26","title":"Codeathon 2026 — Build for Bharat","description":"24-hour online codeathon: build solutions for rural India.","event_type":"codethon","location_country":"India","location_city":"Online","event_date_start":"2026-06-22T08:00:00+00:00","event_date_end":"2026-06-23T08:00:00+00:00","price_type":"free","registration_url":"https://example.com/codeathon","organizer_name":"MLH India","image_url":"https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800","capacity":2000,"attendee_count":1402},
    {"id":"gl-aws-summit","title":"AWS Summit Singapore 2026","description":"Cloud summit with keynotes, hands-on labs, and customer stories.","event_type":"tech_talk","location_country":"Singapore","location_city":"Singapore","event_date_start":"2026-07-08T09:00:00+00:00","event_date_end":"2026-07-09T17:00:00+00:00","price_type":"free","registration_url":"https://aws.amazon.com/summits","organizer_name":"AWS","image_url":"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800","capacity":3000,"attendee_count":1843},
    {"id":"gl-gh-uni","title":"GitHub Universe 2026","description":"GitHub's flagship developer conference — AI, OSS, security.","event_type":"tech_talk","location_country":"USA","location_city":"San Francisco","event_date_start":"2026-10-28T09:00:00+00:00","event_date_end":"2026-10-29T18:00:00+00:00","price_type":"paid","price_amount":499,"currency":"USD","registration_url":"https://githubuniverse.com","organizer_name":"GitHub","image_url":"https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800","capacity":4000,"attendee_count":3120},
    {"id":"in-yc-startup","title":"Founder Talk: From Idea to Series A","description":"Indian unicorn founders share their fundraising journey.","event_type":"founder_talk","location_country":"India","location_city":"Delhi","event_date_start":"2026-06-08T18:30:00+00:00","event_date_end":"2026-06-08T20:30:00+00:00","price_type":"paid","price_amount":299,"currency":"INR","registration_url":"https://example.com/founder-talk","organizer_name":"100x Entrepreneur","image_url":"https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800","capacity":300,"attendee_count":210},
    {"id":"in-hackpune","title":"HackPune 2026","description":"36-hour hackathon at COEP, Pune — building for sustainability.","event_type":"hackathon","location_country":"India","location_city":"Pune","event_date_start":"2026-09-14T08:00:00+00:00","event_date_end":"2026-09-15T20:00:00+00:00","price_type":"free","registration_url":"https://example.com/hackpune","organizer_name":"COEP TechClub","image_url":"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800","capacity":500,"attendee_count":287},
    {"id":"in-design-meet","title":"UX Design Meetup Hyderabad","description":"Quarterly UX meetup with portfolio reviews and lightning talks.","event_type":"meetup","location_country":"India","location_city":"Hyderabad","event_date_start":"2026-05-30T18:00:00+00:00","event_date_end":"2026-05-30T21:00:00+00:00","price_type":"free","registration_url":"https://example.com/ux-meet","organizer_name":"UX Hyderabad","image_url":"https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800","capacity":60,"attendee_count":41},
    {"id":"in-sys-design","title":"System Design Workshop","description":"Weekend workshop covering scalable architectures, sharding, caching.","event_type":"workshop","location_country":"India","location_city":"Chennai","event_date_start":"2026-06-29T09:00:00+00:00","event_date_end":"2026-06-29T18:00:00+00:00","price_type":"paid","price_amount":799,"currency":"INR","registration_url":"https://example.com/sysdesign","organizer_name":"AlgoExpert India","image_url":"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800","capacity":150,"attendee_count":98},
]


# ─── Aggregator: refresh + dedup ────────────────────────────────────────
async def _aggregate_and_store() -> Dict[str, int]:
    """Pull from upstream APIs in parallel, normalize, dedupe, upsert."""
    timeout = aiohttp.ClientTimeout(total=10)
    async with aiohttp.ClientSession(timeout=timeout) as s:
        results = await asyncio.gather(
            _fetch_devpost(s),
            _fetch_hackclub(s),
            _fetch_eventyay(s),
            return_exceptions=True,
        )

    upstream: List[Dict[str, Any]] = []
    for source_idx, (data, src) in enumerate(zip(results, ["devpost", "hackclub", "eventyay"])):
        if isinstance(data, Exception) or not data:
            continue
        for item in data:
            n = _normalize(item, src)
            if n:
                upstream.append(n)

    # Add curated India fallback (always part of the corpus)
    for item in INDIA_FALLBACK_EVENTS:
        n = _normalize(item, "curated")
        if n:
            upstream.append(n)

    # Dedup + upsert
    new_count = 0
    update_count = 0
    seen_hashes = set()
    for ev in upstream:
        h = _dedup_hash(ev["title"], ev["location_city"], ev["event_date_start"])
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        ev["dedup_hash"] = h

        existing = await _db.events_v2.find_one({"dedup_hash": h})
        if existing:
            # Update mutable + v2 enrichment fields
            await _db.events_v2.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "title": ev["title"],
                    "description": ev["description"],
                    "image_url": ev["image_url"] or existing.get("image_url"),
                    "attendee_count": max(ev.get("attendee_count", 0), existing.get("attendee_count", 0) or 0),
                    "registration_url": ev["registration_url"] or existing.get("registration_url"),
                    "is_active": True,
                    # Backfill v2 fields
                    "event_mode": ev.get("event_mode"),
                    "institution_tier": ev.get("institution_tier"),
                    "topic_keywords": ev.get("topic_keywords"),
                    "region_india": ev.get("region_india"),
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            update_count += 1
        else:
            ev["created_at"] = datetime.now(timezone.utc)
            ev["updated_at"] = ev["created_at"]
            ev["status"] = "published"
            ev["host_user_id"] = None
            await _db.events_v2.insert_one(ev)
            new_count += 1

    # Bump cache marker
    await _db.event_cache.update_one(
        {"cache_key": "global_aggregator"},
        {"$set": {
            "cache_key": "global_aggregator",
            "ttl_expires_at": datetime.now(timezone.utc) + timedelta(minutes=CACHE_TTL_MIN),
            "last_fetched": datetime.now(timezone.utc),
            "new_count": new_count, "update_count": update_count,
        }},
        upsert=True,
    )
    return {"new": new_count, "updated": update_count, "total_upstream": len(upstream)}


async def _ensure_fresh():
    """Refresh aggregate if cache TTL expired or DB empty. Best-effort, non-blocking."""
    cache = await _db.event_cache.find_one({"cache_key": "global_aggregator"})
    needs_refresh = False
    if not cache:
        needs_refresh = True
    else:
        ttl = cache.get("ttl_expires_at")
        if not ttl or (ttl.tzinfo is None and ttl < datetime.utcnow()) or \
           (ttl.tzinfo is not None and ttl < datetime.now(timezone.utc)):
            needs_refresh = True
    if not needs_refresh:
        return
    try:
        await asyncio.wait_for(_aggregate_and_store(), timeout=12)
    except Exception as e:
        logger.warning(f"events: aggregate failed (using cached/curated): {e}")
        # If DB completely empty, at least insert curated events
        cnt = await _db.events_v2.count_documents({})
        if cnt == 0:
            for item in INDIA_FALLBACK_EVENTS:
                n = _normalize(item, "curated")
                if n:
                    n["dedup_hash"] = _dedup_hash(n["title"], n["location_city"], n["event_date_start"])
                    n["created_at"] = datetime.now(timezone.utc)
                    n["status"] = "published"
                    n["is_active"] = True
                    await _db.events_v2.update_one(
                        {"dedup_hash": n["dedup_hash"]},
                        {"$set": n}, upsert=True,
                    )


# ─── Search / list ──────────────────────────────────────────────────────
def _doc_to_public(doc: Dict[str, Any], user_id: Optional[str] = None,
                   prefs: Optional[Dict[str, Any]] = None,
                   saved_ids: Optional[set] = None,
                   reg_map: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    eid = doc.get("event_id") or str(doc.get("_id"))
    return {
        "event_id": eid,
        "title": doc.get("title"),
        "description": doc.get("description"),
        "event_type": doc.get("event_type"),
        "tint": EVENT_TYPE_TINTS.get(doc.get("event_type"), "#8B5CF6"),
        "location_country": doc.get("location_country"),
        "location_city": doc.get("location_city"),
        "event_date_start": _safe_iso(doc.get("event_date_start")),
        "event_date_end": _safe_iso(doc.get("event_date_end")),
        "price_type": doc.get("price_type"),
        "price_amount": doc.get("price_amount", 0),
        "currency": doc.get("currency") or "INR",
        "registration_url": doc.get("registration_url"),
        "organizer_name": doc.get("organizer_name"),
        "attendee_count": doc.get("attendee_count", 0),
        "capacity": doc.get("capacity") or 0,
        "spots_left": max(0, (doc.get("capacity") or 0) - (doc.get("attendee_count") or 0)) if doc.get("capacity") else None,
        "image_url": doc.get("image_url"),
        "source": doc.get("source"),
        "host_user_id": doc.get("host_user_id"),
        "status": doc.get("status", "published"),
        "is_saved": (eid in saved_ids) if saved_ids is not None else False,
        "rsvp_status": (reg_map or {}).get(eid),
        "posted_date": _safe_iso(doc.get("posted_date") or doc.get("created_at")),
        "is_featured": bool(doc.get("is_featured") or doc.get("attendee_count", 0) > 100),
    }


@router.get("/events/search")
async def events_search(
    event_type: Optional[str] = Query(None, description="comma-separated"),
    location_country: Optional[str] = Query(None),
    location_city: Optional[str] = Query(None),
    region_india: Optional[str] = Query(None, description="comma-separated India city slugs"),
    institution_tier: Optional[str] = Query(None, description="comma-separated tiers: top_tier,tier_one,tier_two,regional"),
    event_mode: Optional[str] = Query(None, description="virtual|in_person|hybrid|all"),
    topic: Optional[str] = Query(None, description="comma-separated topics"),
    price_type: Optional[str] = Query(None, regex="^(free|paid|all)?$"),
    date_range_start: Optional[str] = Query(None),
    date_range_end: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user: dict = Depends(_get_current_user_dependency()),
):
    await _ensure_fresh()
    query: Dict[str, Any] = {"is_active": True, "status": {"$in": ["published", "approved"]}}
    if event_type:
        types = [t.strip() for t in event_type.split(",") if t.strip()]
        if types and "all" not in [t.lower() for t in types]:
            query["event_type"] = {"$in": types}
    if location_country and location_country.lower() not in ("all", "global", ""):
        if location_country.upper() in ("IN", "INDIA"):
            query["location_country"] = "India"
        else:
            query["location_country"] = location_country
    if location_city and location_city.lower() not in ("all", ""):
        query["location_city"] = {"$regex": f"^{re.escape(location_city)}", "$options": "i"}
    if region_india:
        regs = [r.strip().lower() for r in region_india.split(",") if r.strip()]
        if regs and "all_india" not in regs and "all" not in regs:
            query["location_country"] = "India"
            query["region_india"] = {"$in": regs}
    if institution_tier:
        tiers = [t.strip() for t in institution_tier.split(",") if t.strip()]
        if tiers:
            query["institution_tier"] = {"$in": tiers}
    if event_mode and event_mode != "all":
        query["event_mode"] = event_mode
    if topic:
        topics = [t.strip().lower() for t in topic.split(",") if t.strip()]
        if topics:
            query["topic_keywords"] = {"$in": topics}
    if price_type and price_type in ("free", "paid"):
        query["price_type"] = price_type
    if date_range_start:
        query["event_date_start"] = {"$gte": date_range_start}
    if date_range_end:
        query.setdefault("event_date_start", {})
        query["event_date_start"]["$lte"] = date_range_end
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"organizer_name": {"$regex": q, "$options": "i"}},
            {"location_city": {"$regex": q, "$options": "i"}},
        ]

    total = await _db.events_v2.count_documents(query)
    skip = (page - 1) * limit
    # Tier-priority sort: top_tier (1) → tier_one (2) → tier_two (3) → regional (4) → null (5)
    tier_order = {"top_tier": 1, "tier_one": 2, "tier_two": 3, "regional": 4}
    cursor = _db.events_v2.find(query).sort("event_date_start", 1).skip(skip).limit(limit * 2)

    saved_ids = set()
    reg_map: Dict[str, str] = {}
    user_id = str(user["_id"]) if user else None
    if user_id:
        prefs = await _db.user_event_preferences.find_one({"user_id": user_id}) or {}
        saved_ids = set(prefs.get("saved_event_ids") or [])
        async for r in _db.event_registrations.find({"user_id": user_id}):
            reg_map[r["event_id"]] = r["status"]

    raw = []
    async for d in cursor:
        raw.append(d)
    # Stable secondary sort by tier_order, then by date
    raw.sort(key=lambda d: (tier_order.get(d.get("institution_tier"), 5),
                             d.get("event_date_start") or ""))
    raw = raw[:limit]

    results = []
    indian = []
    intl = []
    for d in raw:
        item = _doc_to_public(d, user_id=user_id, saved_ids=saved_ids, reg_map=reg_map)
        item["event_mode"] = d.get("event_mode")
        item["institution_tier"] = d.get("institution_tier")
        item["topic_keywords"] = d.get("topic_keywords") or []
        results.append(item)
        if (d.get("location_country") or "").lower() == "india":
            indian.append(item)
        else:
            intl.append(item)

    return {
        "results": results,
        "india_results": indian,
        "international_results": intl,
        "page": page,
        "limit": limit,
        "total_count": total,
        "has_more": (page * limit) < total,
    }


@router.get("/events/category-counts")
async def events_category_counts(user: dict = Depends(_get_current_user_dependency())):
    await _ensure_fresh()
    pipe = [
        {"$match": {"is_active": True, "status": {"$in": ["published", "approved"]}}},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
    ]
    counts = {t: 0 for t in EVENT_TYPES}
    total = 0
    async for row in _db.events_v2.aggregate(pipe):
        if row["_id"] in counts:
            counts[row["_id"]] = row["count"]
        total += row["count"]
    return {"all": total, **counts}


@router.get("/events/{event_id}")
async def event_detail(event_id: str, user: dict = Depends(_get_current_user_dependency())):
    doc = await _db.events_v2.find_one({"event_id": event_id})
    if not doc:
        try:
            doc = await _db.events_v2.find_one({"_id": ObjectId(event_id)})
        except Exception:
            doc = None
    if not doc:
        raise HTTPException(404, "Event not found")

    user_id = str(user["_id"])
    prefs = await _db.user_event_preferences.find_one({"user_id": user_id}) or {}
    saved = set(prefs.get("saved_event_ids") or [])
    reg = await _db.event_registrations.find_one({"user_id": user_id, "event_id": doc.get("event_id")})

    public = _doc_to_public(
        doc, user_id=user_id,
        saved_ids=saved,
        reg_map={doc.get("event_id"): reg["status"]} if reg else None,
    )
    if reg:
        public["registration"] = {
            "status": reg.get("status"),
            "confirmation_id": reg.get("confirmation_id"),
            "registered_at": _safe_iso(reg.get("registered_at")),
            "waitlist_position": reg.get("waitlist_position"),
        }

    # Activity log: view
    await _db.event_activity_log.insert_one({
        "user_id": user_id, "event_id": doc.get("event_id"),
        "action": "view", "ts": datetime.now(timezone.utc),
    })
    return public


# ─── User preferences ───────────────────────────────────────────────────
@router.get("/events/me/preferences")
async def get_event_prefs(user: dict = Depends(_get_current_user_dependency())):
    p = await _db.user_event_preferences.find_one({"user_id": str(user["_id"])}) or {}
    return {
        "saved_event_types": p.get("saved_event_types") or [],
        "preferred_locations": p.get("preferred_locations") or [],
        "price_preference": p.get("price_preference") or "both",
        "location_scope": p.get("location_scope") or "india",
        "preferred_city": p.get("preferred_city"),
    }


@router.patch("/events/me/preferences")
async def update_event_prefs(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    allowed = {"saved_event_types", "preferred_locations", "price_preference",
               "location_scope", "preferred_city"}
    update = {k: v for k, v in (body or {}).items() if k in allowed}
    if not update:
        raise HTTPException(400, "No valid fields to update")
    update["updated_at"] = datetime.now(timezone.utc)
    await _db.user_event_preferences.update_one(
        {"user_id": str(user["_id"])},
        {"$set": update, "$setOnInsert": {"user_id": str(user["_id"]),
                                           "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True, **update, "updated_at": _safe_iso(update["updated_at"])}


# ─── Save / activity ────────────────────────────────────────────────────
@router.post("/events/{event_id}/save")
async def toggle_save(event_id: str, user: dict = Depends(_get_current_user_dependency())):
    uid = str(user["_id"])
    p = await _db.user_event_preferences.find_one({"user_id": uid}) or {}
    saved = list(p.get("saved_event_ids") or [])
    if event_id in saved:
        saved.remove(event_id)
        action = "unsaved"
    else:
        saved.append(event_id)
        action = "saved"
        await _db.event_activity_log.insert_one({
            "user_id": uid, "event_id": event_id, "action": "save",
            "ts": datetime.now(timezone.utc),
        })
    await _db.user_event_preferences.update_one(
        {"user_id": uid},
        {"$set": {"saved_event_ids": saved, "updated_at": datetime.now(timezone.utc)},
         "$setOnInsert": {"user_id": uid, "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True, "action": action, "saved_count": len(saved)}


@router.post("/events/{event_id}/activity")
async def track_activity(event_id: str, body: Dict[str, Any],
                         user: dict = Depends(_get_current_user_dependency())):
    action = (body or {}).get("action")
    if action not in ("view", "save", "register", "click_redirect"):
        raise HTTPException(400, "Invalid action")
    await _db.event_activity_log.insert_one({
        "user_id": str(user["_id"]), "event_id": event_id, "action": action,
        "redirect_url": (body or {}).get("redirect_url"),
        "ts": datetime.now(timezone.utc),
    })
    return {"ok": True}


@router.get("/events/me/saved")
async def saved_events(user: dict = Depends(_get_current_user_dependency())):
    uid = str(user["_id"])
    p = await _db.user_event_preferences.find_one({"user_id": uid}) or {}
    saved_ids = list(p.get("saved_event_ids") or [])
    if not saved_ids:
        return {"items": [], "total": 0}
    cursor = _db.events_v2.find({"event_id": {"$in": saved_ids}})
    items = []
    async for d in cursor:
        items.append(_doc_to_public(d, user_id=uid, saved_ids=set(saved_ids)))
    return {"items": items, "total": len(items)}


@router.get("/events/me/registered")
async def registered_events(user: dict = Depends(_get_current_user_dependency())):
    uid = str(user["_id"])
    regs = []
    async for r in _db.event_registrations.find({"user_id": uid, "status": {"$in": ["registered", "waitlisted"]}}):
        regs.append(r)
    if not regs:
        return {"items": [], "total": 0}
    ids = [r["event_id"] for r in regs]
    reg_map = {r["event_id"]: r["status"] for r in regs}
    items = []
    async for d in _db.events_v2.find({"event_id": {"$in": ids}}):
        items.append({**_doc_to_public(d, user_id=uid, reg_map=reg_map),
                      "confirmation_id": next((r.get("confirmation_id") for r in regs if r["event_id"] == d["event_id"]), None)})
    return {"items": items, "total": len(items)}


# ─── RSVP / Capacity / Waitlist / SA Credits ────────────────────────────
async def _try_deduct_credits(user_doc: dict, amount: int, reason: str) -> bool:
    """Deduct from wallet. Returns True if deducted, False if insufficient."""
    if amount <= 0:
        return True
    wallet = user_doc.get("wallet") or {}
    bal = int(wallet.get("balance_credits", 0))
    if bal < amount:
        return False
    new_bal = bal - amount
    await _db.users.update_one(
        {"_id": user_doc["_id"]},
        {"$set": {"wallet.balance_credits": new_bal,
                  "wallet.last_used_at": datetime.now(timezone.utc)},
         "$inc": {"wallet.lifetime_spent": amount}},
    )
    await _db.wallet_transactions.insert_one({
        "user_id": str(user_doc["_id"]),
        "type": "debit", "amount": amount, "reason": reason,
        "balance_after": new_bal,
        "ts": datetime.now(timezone.utc),
    })
    return True


@router.post("/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, body: Dict[str, Any] = None,
                     user: dict = Depends(_get_current_user_dependency())):
    body = body or {}
    use_credits = bool(body.get("use_credits"))

    doc = await _db.events_v2.find_one({"event_id": event_id})
    if not doc:
        raise HTTPException(404, "Event not found")
    if not doc.get("is_active"):
        raise HTTPException(400, "Event no longer active")

    uid = str(user["_id"])
    existing = await _db.event_registrations.find_one({"user_id": uid, "event_id": event_id})
    if existing and existing.get("status") in ("registered", "waitlisted"):
        return {"ok": True, "duplicate": True, "status": existing["status"],
                "confirmation_id": existing.get("confirmation_id"),
                "waitlist_position": existing.get("waitlist_position")}

    capacity = int(doc.get("capacity") or 0)
    attendee_count = int(doc.get("attendee_count") or 0)
    is_full = capacity > 0 and attendee_count >= capacity

    # Pay if needed
    paid_credits = 0
    if doc.get("price_type") == "paid" and use_credits:
        amt = int(doc.get("price_amount") or 0)
        if amt > 0:
            ok = await _try_deduct_credits(user, amt, f"Event RSVP: {doc.get('title')}")
            if not ok:
                raise HTTPException(402, "Insufficient SA Credits to register for this paid event")
            paid_credits = amt
    elif doc.get("price_type") == "paid" and not use_credits:
        # Allow registering paid event without paying — backend records as "pending_payment"
        pass

    confirmation_id = f"SA-EVT-{datetime.now(timezone.utc).strftime('%y%m%d')}-{hashlib.md5((event_id+uid+str(datetime.now(timezone.utc).timestamp())).encode()).hexdigest()[:6].upper()}"

    if is_full:
        # Waitlist
        wl_count = await _db.event_registrations.count_documents({"event_id": event_id, "status": "waitlisted"})
        wl_position = wl_count + 1
        reg_doc = {
            "user_id": uid, "event_id": event_id,
            "status": "waitlisted",
            "waitlist_position": wl_position,
            "confirmation_id": confirmation_id,
            "registered_at": datetime.now(timezone.utc),
            "credits_paid": paid_credits,
        }
    else:
        reg_doc = {
            "user_id": uid, "event_id": event_id,
            "status": "registered",
            "confirmation_id": confirmation_id,
            "registered_at": datetime.now(timezone.utc),
            "credits_paid": paid_credits,
        }

    await _db.event_registrations.update_one(
        {"user_id": uid, "event_id": event_id},
        {"$set": reg_doc}, upsert=True,
    )
    if reg_doc["status"] == "registered":
        await _db.events_v2.update_one(
            {"event_id": event_id}, {"$inc": {"attendee_count": 1}},
        )
    await _db.event_activity_log.insert_one({
        "user_id": uid, "event_id": event_id, "action": "register",
        "ts": datetime.now(timezone.utc),
    })

    return {"ok": True, "duplicate": False, "status": reg_doc["status"],
            "confirmation_id": confirmation_id,
            "waitlist_position": reg_doc.get("waitlist_position"),
            "credits_paid": paid_credits}


@router.post("/events/{event_id}/cancel-rsvp")
async def cancel_rsvp(event_id: str, user: dict = Depends(_get_current_user_dependency())):
    uid = str(user["_id"])
    reg = await _db.event_registrations.find_one({"user_id": uid, "event_id": event_id})
    if not reg or reg.get("status") == "cancelled":
        raise HTTPException(404, "No active registration to cancel")
    was_registered = reg.get("status") == "registered"

    await _db.event_registrations.update_one(
        {"_id": reg["_id"]}, {"$set": {"status": "cancelled",
                                       "cancelled_at": datetime.now(timezone.utc)}},
    )
    if was_registered:
        await _db.events_v2.update_one(
            {"event_id": event_id}, {"$inc": {"attendee_count": -1}},
        )
        # Promote head of waitlist
        wl_head = await _db.event_registrations.find_one(
            {"event_id": event_id, "status": "waitlisted"},
            sort=[("waitlist_position", 1)],
        )
        if wl_head:
            await _db.event_registrations.update_one(
                {"_id": wl_head["_id"]}, {"$set": {"status": "registered",
                                                   "promoted_at": datetime.now(timezone.utc)}},
            )
            await _db.events_v2.update_one(
                {"event_id": event_id}, {"$inc": {"attendee_count": 1}},
            )

    # Refund credits if paid
    refunded = 0
    if reg.get("credits_paid"):
        refunded = int(reg["credits_paid"])
        wallet = user.get("wallet") or {}
        new_bal = int(wallet.get("balance_credits", 0)) + refunded
        await _db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"wallet.balance_credits": new_bal}},
        )
        await _db.wallet_transactions.insert_one({
            "user_id": uid, "type": "credit", "amount": refunded,
            "reason": f"Refund: cancelled RSVP for event {event_id}",
            "balance_after": new_bal, "ts": datetime.now(timezone.utc),
        })

    return {"ok": True, "refunded_credits": refunded}


# ─── .ics calendar export ───────────────────────────────────────────────
def _ics_escape(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def _ics_dt(s: Any) -> str:
    d = _to_dt(s)
    if not d:
        d = datetime.now(timezone.utc)
    return d.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


@router.get("/events/{event_id}/ics")
async def event_ics(event_id: str, user: dict = Depends(_get_current_user_dependency())):
    doc = await _db.events_v2.find_one({"event_id": event_id})
    if not doc:
        raise HTTPException(404, "Event not found")

    title = _ics_escape(doc.get("title", "Event"))
    desc = _ics_escape((doc.get("description") or "")[:600])
    loc = _ics_escape(f"{doc.get('location_city','')}, {doc.get('location_country','')}")
    url = doc.get("registration_url") or ""
    uid = f"{event_id}@studentalumni.in"
    dtstart = _ics_dt(doc.get("event_date_start"))
    dtend = _ics_dt(doc.get("event_date_end") or doc.get("event_date_start"))
    now = _ics_dt(datetime.now(timezone.utc))

    ics = "\r\n".join([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StudentAlumni//Events//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now}",
        f"DTSTART:{dtstart}",
        f"DTEND:{dtend}",
        f"SUMMARY:{title}",
        f"DESCRIPTION:{desc}",
        f"LOCATION:{loc}",
        f"URL:{_ics_escape(url)}",
        "END:VEVENT",
        "END:VCALENDAR",
    ])

    return Response(content=ics, media_type="text/calendar",
                    headers={"Content-Disposition": f'attachment; filename="{event_id}.ics"'})


# ─── AI Recommendations ────────────────────────────────────────────────
@router.get("/events/me/recommendations")
async def event_recommendations(limit: int = Query(8, ge=1, le=20),
                                user: dict = Depends(_get_current_user_dependency())):
    """
    Pure-Python recommendation engine — no LLM call required for speed.

    Score = base + interest_overlap*4 + city_match*3 + price_pref*2
            + recency_bonus + activity_boost
    """
    await _ensure_fresh()
    uid = str(user["_id"])

    interests = set([s.lower() for s in (user.get("interests") or [])])
    skills = set([s.lower() for s in (user.get("skills") or [])])
    user_city = (user.get("city") or "").lower()

    prefs = await _db.user_event_preferences.find_one({"user_id": uid}) or {}
    pref_loc = (prefs.get("preferred_city") or user_city or "").lower()
    pref_price = prefs.get("price_preference") or "both"

    # Engagement boost from event_activity_log
    activity_pipe = [
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
    ]
    activity_counts = {}
    async for r in _db.event_activity_log.aggregate(activity_pipe):
        activity_counts[r["_id"]] = r["count"]

    type_pipe = [
        {"$match": {"user_id": uid, "action": "register"}},
        {"$lookup": {"from": "events_v2", "localField": "event_id",
                     "foreignField": "event_id", "as": "ev"}},
        {"$unwind": "$ev"},
        {"$group": {"_id": "$ev.event_type", "count": {"$sum": 1}}},
    ]
    type_boost = {}
    async for r in _db.event_activity_log.aggregate(type_pipe):
        type_boost[r["_id"]] = r["count"]

    saved_ids = set(prefs.get("saved_event_ids") or [])
    reg_ids = set()
    async for r in _db.event_registrations.find({"user_id": uid}):
        reg_ids.add(r["event_id"])

    now = datetime.now(timezone.utc)
    out = []
    async for d in _db.events_v2.find({"is_active": True,
                                        "status": {"$in": ["published", "approved"]}}).limit(200):
        if d.get("event_id") in reg_ids:
            continue
        score = 50.0
        # Interest overlap (title + description tokens)
        text_lower = f"{d.get('title','')} {d.get('description','')}".lower()
        for kw in interests | skills:
            if kw and kw in text_lower:
                score += 4
        # City / location pref
        ev_city = (d.get("location_city") or "").lower()
        if pref_loc and ev_city == pref_loc:
            score += 12
        elif user_city and ev_city == user_city:
            score += 8
        # Price preference
        if pref_price == "free_only" and d.get("price_type") == "free":
            score += 6
        elif pref_price == "paid_only" and d.get("price_type") == "paid":
            score += 6
        # Type boost
        score += min(type_boost.get(d.get("event_type"), 0) * 3, 10)
        # Recency / urgency
        start = _to_dt(d.get("event_date_start"))
        if start:
            days_to = (start - now).total_seconds() / 86400
            if 0 <= days_to <= 7:
                score += 8
            elif 7 < days_to <= 30:
                score += 4
            elif days_to < 0:
                score -= 30  # past event
        # Engagement signals
        if d.get("attendee_count", 0) > 100:
            score += 3
        if d.get("event_id") in saved_ids:
            score += 5

        item = _doc_to_public(d, user_id=uid, saved_ids=saved_ids)
        item["match_score"] = round(min(100, max(0, score)), 1)
        item["why"] = []
        if any(k in text_lower for k in interests):
            item["why"].append("matches your interests")
        if pref_loc and ev_city == pref_loc:
            item["why"].append("in your preferred city")
        if d.get("price_type") == "free":
            item["why"].append("free")
        out.append(item)

    out.sort(key=lambda x: -x["match_score"])
    return {"items": out[:limit], "generated_at": now.isoformat()}


# ─── Hosting (mentor / college / admin) ─────────────────────────────────
@router.post("/events")
async def create_event(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    role = user.get("role")
    if role not in ("mentor", "alumni", "college", "admin"):
        raise HTTPException(403, "Only mentors, alumni, colleges, and admins can host events")

    required = ["title", "event_type", "event_date_start", "location_city", "location_country"]
    missing = [k for k in required if not body.get(k)]
    if missing:
        raise HTTPException(400, f"Missing required fields: {', '.join(missing)}")
    etype = body.get("event_type")
    if etype not in EVENT_TYPES:
        raise HTTPException(400, f"event_type must be one of {EVENT_TYPES}")

    when = _safe_iso(body.get("event_date_start"))
    uid_str = str(user["_id"])
    title_str = str(body.get("title") or "")
    raw_eid = f"{uid_str}|{title_str}|{when}"
    eid = "host-" + role + "-" + hashlib.md5(raw_eid.encode()).hexdigest()[:10]
    h = _dedup_hash(body.get("title"), body.get("location_city"), when)
    existing = await _db.events_v2.find_one({"dedup_hash": h})
    if existing:
        raise HTTPException(409, "An event with this title/city/date already exists")

    # College → admin approval gate
    needs_approval = role == "college"

    doc = {
        "event_id": eid,
        "dedup_hash": h,
        "title": body["title"][:255],
        "description": (body.get("description") or "")[:2000],
        "event_type": etype,
        "location_country": body["location_country"],
        "location_city": body["location_city"],
        "event_date_start": when,
        "event_date_end": _safe_iso(body.get("event_date_end")) or when,
        "price_type": body.get("price_type") or "free",
        "price_amount": float(body.get("price_amount") or 0),
        "currency": body.get("currency") or "INR",
        "registration_url": body.get("registration_url") or "",
        "organizer_name": body.get("organizer_name") or user.get("full_name") or user.get("email"),
        "attendee_count": 0,
        "capacity": int(body.get("capacity") or 0),
        "image_url": body.get("image_url") or "",
        "source": "host",
        "host_user_id": str(user["_id"]),
        "host_role": role,
        "is_active": True,
        "status": "pending_approval" if needs_approval else "published",
        "tags": body.get("tags") or [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await _db.events_v2.insert_one(doc)
    return {"ok": True, "event_id": eid, "status": doc["status"],
            "needs_approval": needs_approval}


@router.patch("/events/{event_id}")
async def update_event(event_id: str, body: Dict[str, Any],
                       user: dict = Depends(_get_current_user_dependency())):
    doc = await _db.events_v2.find_one({"event_id": event_id})
    if not doc:
        raise HTTPException(404, "Event not found")
    is_host = str(user["_id"]) == doc.get("host_user_id")
    is_admin = user.get("role") == "admin"
    if not (is_host or is_admin):
        raise HTTPException(403, "Only the host or an admin can edit")
    allowed = {"title", "description", "event_type", "location_country", "location_city",
               "event_date_start", "event_date_end", "price_type", "price_amount", "currency",
               "registration_url", "image_url", "capacity", "tags", "organizer_name"}
    update = {k: v for k, v in (body or {}).items() if k in allowed}
    if not update:
        raise HTTPException(400, "No valid fields to update")
    update["updated_at"] = datetime.now(timezone.utc)
    await _db.events_v2.update_one({"_id": doc["_id"]}, {"$set": update})
    return {"ok": True, **{k: update[k] for k in update if k != "updated_at"}}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(_get_current_user_dependency())):
    doc = await _db.events_v2.find_one({"event_id": event_id})
    if not doc:
        raise HTTPException(404, "Event not found")
    is_host = str(user["_id"]) == doc.get("host_user_id")
    is_admin = user.get("role") == "admin"
    if not (is_host or is_admin):
        raise HTTPException(403, "Only the host or an admin can delete")
    await _db.events_v2.update_one({"_id": doc["_id"]},
                                    {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}})
    return {"ok": True}


@router.get("/events/me/hosted")
async def hosted_events(user: dict = Depends(_get_current_user_dependency())):
    cursor = _db.events_v2.find({"host_user_id": str(user["_id"]), "is_active": True}).sort("event_date_start", -1)
    items = []
    async for d in cursor:
        items.append(_doc_to_public(d, user_id=str(user["_id"])))
    return {"items": items, "total": len(items)}


# ─── Admin approval queue ──────────────────────────────────────────────
@router.get("/admin/events/pending")
async def admin_pending_events(user: dict = Depends(_get_current_user_dependency())):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    cursor = _db.events_v2.find({"status": "pending_approval", "is_active": True}).sort("created_at", -1)
    items = []
    async for d in cursor:
        items.append(_doc_to_public(d, user_id=str(user["_id"])))
    return {"items": items, "total": len(items)}


@router.post("/admin/events/{event_id}/approve")
async def admin_approve_event(event_id: str, user: dict = Depends(_get_current_user_dependency())):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    res = await _db.events_v2.update_one(
        {"event_id": event_id, "status": "pending_approval"},
        {"$set": {"status": "published", "approved_by": str(user["_id"]),
                  "approved_at": datetime.now(timezone.utc)}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Pending event not found")
    return {"ok": True, "status": "published"}


@router.post("/admin/events/{event_id}/reject")
async def admin_reject_event(event_id: str, body: Dict[str, Any] = None,
                              user: dict = Depends(_get_current_user_dependency())):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    reason = ((body or {}).get("reason") or "").strip()
    res = await _db.events_v2.update_one(
        {"event_id": event_id, "status": "pending_approval"},
        {"$set": {"status": "rejected", "rejection_reason": reason or "Not specified",
                  "rejected_by": str(user["_id"]),
                  "rejected_at": datetime.now(timezone.utc), "is_active": False}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Pending event not found")
    return {"ok": True, "status": "rejected"}


# ─── Manual refresh (admin) ────────────────────────────────────────────
@router.post("/events/refresh")
async def force_refresh(user: dict = Depends(_get_current_user_dependency())):
    # Allow any auth user during dev to trigger; tighten in prod
    res = await _aggregate_and_store()
    return {"ok": True, **res}
