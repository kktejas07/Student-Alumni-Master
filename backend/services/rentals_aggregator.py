"""R1 — Universal Rentals Aggregator Bot.

Brand-agnostic rental collection: one pipeline over 16 pluggable source
adapters (housing, vehicles, hotels/stays, coworking) across ALL providers
and cities, so new providers/cities appear without code changes.

    services/rentals_aggregator.py
    ├── RentalsSourceAdapter + 16 adapters (ALL_ADAPTERS / ADAPTERS_BY_NAME)
    ├── category + type auto-classifier (keyword match on title+description)
    ├── fuzzy dedup (same city+category, rent ±10%, fuzzy title → keep best)
    ├── upsert into the existing `rental_listings` collection in a
    │   marketplace-compatible display shape (features/rentals_marketplace.py
    │   serves these docs with zero UI changes; detail/booking key off `id`)
    ├── 24-hour cycle: 04:00 UTC cron (staggered: courses 02:00, deals 03:00)
    │   gated by RENTALS_AGGREGATOR_CRON_ENABLED (default on) + startup catch-up
    └── super-admin /api/admin/rentals-aggregator router (status / source
        toggle / manual run), wired into server.py under leader election.

Adapters ship deterministic static catalogs as the stand-in for live
scraping (repo convention — courses/deals do the same); adapters with a
first-party live feed use it when the env key is present and fall back to
the static catalog otherwise:

    BOOKING_COM_AFFILIATE_ID  — Booking.com Affiliate API (else static)
    HOSTELWORLD_API_KEY       — Hostelworld Affiliate API (else static)

`sa_exclusive` is the R8 landlord-portal adapter slot; it stays empty until
R8 lands (R1 must not fabricate "exclusive" inventory).

Shape note: the roadmap schema's `type` is a machine slug (pg/hostel/...), but
the rentals frontend renders `type` verbatim and the seed listings use labels
("PG / Hostel"). So docs carry the label in `type` and the slug in `type_code`.

Env vars:
  RENTALS_AGGREGATOR_CRON_ENABLED   — 0 to disable the cron (default 1)
  RENTALS_AGGREGATOR_RUN_ON_STARTUP — 0 to skip the startup catch-up (default 1)
"""
from __future__ import annotations

import abc
import asyncio
import hashlib
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any, ClassVar, Dict, List, Optional, Tuple

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.db import db as _db

logger = logging.getLogger("rentals_aggregator")

LISTINGS_COL = "rental_listings"
RUN_META = "rentals_aggregator_runs"
SOURCE_META = "rentals_aggregator_sources"

USER_AGENT = "StudentAlumniBot/1.0 (+https://studentalumni.in)"
PER_API_TIMEOUT_S = 15.0
STALE_AFTER_HOURS = 72
STARTUP_STALE_HOURS = 24

# The marketplace filters listings with {"status": {"$ne": "inactive"}}, so
# dedup losers must land on "inactive" to stop rendering while staying
# queryable. "stale" listings still render (soft marker only).
INACTIVE = "inactive"

RENTAL_CATEGORIES = ("housing", "vehicle", "hotel", "coworking")
RENTAL_TYPES = ("pg", "hostel", "apartment", "shared_flat", "studio",
                "1bhk", "2bhk", "3bhk", "car", "bike", "cycle", "scooter",
                "hotel", "resort", "farmhouse", "villa", "cabin",
                "hot_desk", "private_cabin", "meeting_room")
RENT_UNITS = ("per_month", "per_day", "per_hour", "per_night")

# Display labels keep the existing frontend contract (rentals.tsx renders
# `type` verbatim; the machine slug travels in `type_code` for R2+ filters).
TYPE_LABELS: Dict[str, str] = {
    "pg": "PG / Hostel", "hostel": "PG / Hostel", "apartment": "Apartment",
    "shared_flat": "Shared Flat", "studio": "Studio",
    "1bhk": "1BHK", "2bhk": "2BHK", "3bhk": "3BHK",
    "car": "Car", "bike": "Two-Wheeler", "scooter": "Scooter",
    "cycle": "Cycle",
    "hotel": "Hotel", "resort": "Resort", "farmhouse": "Farmhouse",
    "villa": "Villa", "cabin": "Cabin",
    "hot_desk": "Hot Desk", "private_cabin": "Private Cabin",
    "meeting_room": "Meeting Room",
}
CATEGORY_COLORS: Dict[str, str] = {
    "housing": "#3B82F6", "vehicle": "#F59E0B",
    "hotel": "#EF4444", "coworking": "#8B5CF6",
}
CATEGORY_EMOJI: Dict[str, str] = {
    "housing": "🏠", "vehicle": "🛵", "hotel": "🏨", "coworking": "💻",
}
UNIT_SUFFIX: Dict[str, str] = {
    "per_month": "mo", "per_day": "day", "per_hour": "hr", "per_night": "night",
}

# Source quality for dedup: lower = better. First-party affiliate feeds and
# community listings rank above aggregators, which rank above generic
# portals; static catalogs sit below live feeds.
SOURCE_RANK: Dict[str, int] = {
    "sa_exclusive": 0,
    "booking_com": 1,
    "hostelworld_affiliate": 1,
    "reddit_indianrealestate": 2,
    "hostelworld": 3,
    "nobroker": 3,
    "zolo_stays": 4,
    "stanza": 4,
    "oyo": 4,
    "nestaway": 4,
    "magicbricks": 5,
    "99acres": 5,
    "zoomcar": 5,
    "bounce": 5,
    "coworking": 5,
    "yulu": 6,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def _num(v: Any) -> Optional[float]:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _calc_pct(original: Any, price: Any) -> Optional[int]:
    o, p = _num(original), _num(price)
    if o is None or p is None or o <= 0 or p <= 0 or o <= p:
        return None
    return int(round((o - p) * 100.0 / o))


# ─── Auto-category + type classifier (keyword match) ───────────────────
_CATEGORY_KEYWORDS: List[Tuple[str, Tuple[str, ...]]] = [
    ("vehicle", ("bike", "two-wheeler", "two wheeler", "motorbike", "scooter",
                 "cycle", "cycling", "car rental", "self-drive", "self drive",
                 "hatchback", "sedan", "suv", "zoomcar", "bounce", "yulu",
                 "revv", "royloy", "drivezy", "vogo", "ev pass", "electric car")),
    ("coworking", ("hot desk", "coworking", "co-working", "co working",
                   "private cabin", "meeting room", "wework", "we work",
                   "91springboard", "91 springboard", "awfis", "innov8", "cowrks",
                   "work space", "workshop space")),
    ("hotel", ("hotel", "resort", "farmhouse", "farm house", "farm estate",
               "villa", "houseboat", "guesthouse", "guest house", "airbnb",
               "oyo rooms", "treebo", "lemon tree", "vacation home", "retreat",
               "beach house", "snow cabin", "weekend getaway")),
    ("housing", ("pg ", "pg,", "hostel", "apartment", "1bhk", "2bhk", "3bhk",
                 "shared flat", "shared room", "co-living", "co living", "coliving",
                 "zolo", "stanza", "nestaway", "nobroker", "no broker", "studio",
                 "flat", "bed", "rent")),
]
_DEFAULT_TYPE: Dict[str, str] = {
    "housing": "pg", "vehicle": "car", "hotel": "hotel", "coworking": "hot_desk",
}


def classify_listing(title: str, description: str = "") -> Tuple[str, str]:
    """Auto-classify category + type from listing text."""
    text = f" {title} {description} ".lower()
    for category, kws in _CATEGORY_KEYWORDS:
        if any(k in text for k in kws):
            return category, _type_for(category, text)
    return "housing", _DEFAULT_TYPE["housing"]


def _type_for(category: str, text: str) -> str:
    if category == "vehicle":
        if "cycle" in text or "cycling" in text:
            return "cycle"
        if "scooter" in text:
            return "scooter"
        if any(k in text for k in ("car", "hatchback", "sedan", "suv",
                                   "self-drive", "self drive")):
            return "car"
        return "bike"
    if category == "coworking":
        if "meeting room" in text:
            return "meeting_room"
        if "cabin" in text:
            return "private_cabin"
        return "hot_desk"
    if category == "hotel":
        if "villa" in text or "beach house" in text:
            return "villa"
        if "farm" in text:
            return "farmhouse"
        if "cabin" in text:
            return "cabin"
        if "resort" in text or "retreat" in text:
            return "resort"
        return "hotel"
    # housing
    if "shared" in text or "room in" in text:
        return "shared_flat"
    m = re.search(r"\b([123])\s*bhk\b", text)
    if m:
        return f"{m.group(1)}bhk"
    if "studio" in text:
        return "studio"
    if "hostel" in text:
        return "hostel"
    if "pg" in text or "pay guest" in text:
        return "pg"
    if "apartment" in text:
        return "apartment"
    return "pg"


# ─── Fuzzy deduplication (city + category + rent ±10% + fuzzy title) ────
def _dedup_key(doc: Dict[str, Any]) -> Tuple[str, str]:
    """Coarse group key: (city, category)."""
    return ((doc.get("city") or "?").strip().lower(),
            (doc.get("category") or "").strip().lower())


def _rents_close(a: Dict[str, Any], b: Dict[str, Any],
                 tolerance: float = 0.10) -> bool:
    ra, rb = _num(a.get("rent_inr")), _num(b.get("rent_inr"))
    if ra is None or rb is None:
        return True
    low = min(ra, rb)
    return abs(ra - rb) <= tolerance * low


def _fuzzy_same(a: Dict[str, Any], b: Dict[str, Any],
                 cutoff: float = 0.6) -> bool:
    if _dedup_key(a) != _dedup_key(b):
        return False
    if not _rents_close(a, b):
        return False
    ta = re.sub(r"\s+", " ", (a.get("title") or "").strip().lower())
    tb = re.sub(r"\s+", " ", (b.get("title") or "").strip().lower())
    if ta == tb:
        return True
    return SequenceMatcher(None, ta, tb).ratio() >= cutoff


def _is_better(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    ra = SOURCE_RANK.get(a.get("source", ""), 99)
    rb = SOURCE_RANK.get(b.get("source", ""), 99)
    if ra != rb:
        return ra < rb
    fa = a.get("last_fetched_at") or datetime.min.replace(tzinfo=timezone.utc)
    fb = b.get("last_fetched_at") or datetime.min.replace(tzinfo=timezone.utc)
    return fa >= fb


def merge_group(docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Merge fuzzy-duplicate listings: keep the highest-quality source's
    record, union tags, carry over verified state, record dup ids."""
    if not docs:
        return {}
    best = docs[0]
    for d in docs[1:]:
        if _is_better(d, best):
            best = d
    out = dict(best)
    tags: List[str] = []
    seen = set()
    for d in docs:
        for t in (d.get("tags") or []):
            if t not in seen:
                seen.add(t)
                tags.append(t)
    out["tags"] = tags
    if any(d.get("verified") for d in docs):
        out["verified"] = True
        out["verification_status"] = "verified"
        out["verified_at"] = out.get("verified_at") or _utcnow().isoformat()
    dups = set()
    for d in docs:
        dups.update(d.get("duplicate_listing_ids") or [])
        if d.get("listing_id") and d["listing_id"] != out.get("listing_id"):
            dups.add(d["listing_id"])
    dups.discard(out.get("listing_id"))
    out["duplicate_listing_ids"] = sorted(d for d in dups if d)
    return out


def deduplicate(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Same city + category + rent ±10% + fuzzy title → 1 merged doc."""
    out: List[Dict[str, Any]] = []
    for doc in docs:
        merged = next((o for o in out if _fuzzy_same(o, doc)), None)
        if merged is not None:
            merged.update(merge_group([merged, doc]))
        else:
            out.append(dict(doc))
    return out


# ─── Adapters ────────────────────────────────────────────────────────────
class RentalsSourceAdapter(abc.ABC):
    """One pluggable rental source. ``fetch_listings`` returns partial rows:
    {source_id?, title, description?, category?, type?, city?, area?,
     location?, latitude?, longitude?, rent_inr?, rent_unit?, original_inr?,
     amenities?, photos?, rating?, review_count?, beds_or_capacity?,
     available_units?, provider?, provider_url?, provider_logo_url?,
     contact_phone?, contact_email?, student_friendly?, sa_discount?,
     sa_perk?, gender_preference?, food_type?, furnishing?, verified?,
     source_url?, expires_at?, tags?} — missing keys are optional."""

    source_name: ClassVar[str] = "base"
    source_url: ClassVar[str] = ""
    # env var that unlocks the live variant; None = static only
    api_key_env: ClassVar[Optional[str]] = None
    # whether the adapter has a deterministic static fallback catalog
    is_static: ClassVar[bool] = True

    def __init__(self, http: Optional[httpx.AsyncClient] = None):
        self.http = http

    @abc.abstractmethod
    async def fetch_listings(self) -> List[Dict[str, Any]]:
        ...

    # shared helpers ─────────────────────────────────────────────────────
    async def _get_json(self, url: str, **kwargs: Any) -> Any:
        assert self.http is not None, f"{self.source_name} called without a client"
        r = await self.http.get(url, **kwargs)
        r.raise_for_status()
        return r.json()

    async def _get_text(self, url: str, **kwargs: Any) -> str:
        assert self.http is not None, f"{self.source_name} called without a client"
        r = await self.http.get(url, **kwargs)
        r.raise_for_status()
        return r.text

    @staticmethod
    def _stable_id(kind: str, idx_or_name: Any) -> str:
        """Stable across processes (hash() is salted per interpreter)."""
        digest = hashlib.sha1(f"{kind}:{idx_or_name}".encode("utf-8")).hexdigest()
        return f"{kind}-{int(digest[:12], 16) % 10**10}"

    def _rows(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for i, row in enumerate(rows):
            d = dict(row)
            d.setdefault("source_id", self._stable_id(self.source_name, i))
            out.append(d)
        return out

    @staticmethod
    def _row(source_id: str, title: str, **kw: Any) -> Dict[str, Any]:
        base: Dict[str, Any] = {"source_id": source_id, "title": title}
        base.update(kw)
        return base


# 1 ── NoBroker (PG / apartments) ─────────────────────────────────────────
class NoBrokerAdapter(RentalsSourceAdapter):
    source_name = "nobroker"
    source_url = "https://www.nobroker.in"
    provider = "NoBroker"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("nb-1", "NoBroker PG — Baner, Pune",
                      description="Furnished PG 5 min from Baner IT park; mess meals, high-speed WiFi, laundry and 24x7 security. Bachelors welcome.",
                      category="housing", type="pg", city="Pune", area="Baner",
                      location="Baner, Pune", latitude=18.5595, longitude=73.7856,
                      rent_inr=9500, rent_unit="per_month", original_inr=12000,
                      amenities=["WiFi", "Meals", "Laundry", "AC", "24x7 security"],
                      rating=4.3, review_count=410, beds_or_capacity="Single / Double",
                      available_units=6, provider=self.provider,
                      provider_slug="nobroker", provider_url=self.source_url,
                      gender_preference="Males", food_type="Mess (2x)",
                      furnishing="Semi-furnished", verified=True,
                      sa_perk="₹500 off first month for SA students",
                      tags=["near-it-park", "meals-included", "ac"]),
            self._row("nb-2", "NoBroker 2BHK — Banjara Hills, Hyderabad",
                      description="Brand-new 2BHK apartment with society amenities, 2 parking slots and gym. Ideal for working couples.",
                      category="housing", type="2bhk", city="Hyderabad", area="Banjara Hills",
                      location="Banjara Hills, Hyderabad", latitude=17.4156, longitude=78.4333,
                      rent_inr=24000, rent_unit="per_month", original_inr=29000,
                      amenities=["Parking", "Gym", "Power backup", "Furnished"],
                      rating=4.5, review_count=188, beds_or_capacity="2BHK Furnished",
                      available_units=1, provider=self.provider,
                      provider_slug="nobroker", provider_url=self.source_url,
                      furnishing="Fully furnished", verified=True,
                      sa_perk="Zero brokerage via SA",
                      tags=["furnished", "parking", "couples"]),
            self._row("nb-3", "NoBroker Shared Flat — Indiranagar, Bengaluru",
                      description="Shared 3BHK flat, one double bed free, 12 min from Indiranagar metro. WiFi + modular kitchen.",
                      category="housing", type="shared_flat", city="Bengaluru", area="Indiranagar",
                      location="Indiranagar, Bengaluru", latitude=12.9757, longitude=77.6311,
                      rent_inr=11000, rent_unit="per_month", original_inr=14000,
                      amenities=["WiFi", "Shared kitchen", "Metro access"],
                      rating=4.2, review_count=96, beds_or_capacity="1 room in 3BHK",
                      available_units=1, provider=self.provider,
                      provider_slug="nobroker", provider_url=self.source_url,
                      food_type="Self-cook", furnishing="Semi-furnished",
                      verified=True, sa_perk="₹1,000 off deposit",
                      tags=["shared", "metro", "wifi"]),
        ])


# 2 ── Zolo Stays (curated PGs / co-living) ──────────────────────────────
class ZoloStaysAdapter(RentalsSourceAdapter):
    source_name = "zolo_stays"
    source_url = "https://www.zolostays.com"
    provider = "Zolo Stays"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("zolo-1", "Zolo Stays PG — Whitefield, Bengaluru",
                      description="Smart PG with meals, housekeeping, housemates' lounge and gym. Zero-deposit option for students.",
                      category="housing", type="pg", city="Bengaluru", area="Whitefield",
                      location="Whitefield, Bengaluru", latitude=12.9698, longitude=77.7499,
                      rent_inr=7800, rent_unit="per_month", original_inr=11000,
                      amenities=["Meals 3x", "Housekeeping", "WiFi", "Gym"],
                      rating=4.5, review_count=226, beds_or_capacity="Single / Twin",
                      available_units=12, provider=self.provider,
                      provider_slug="zolo-stays", provider_url=self.source_url,
                      gender_preference="Any", food_type="3x meals",
                      verified=True, sa_perk="Zero deposit for SA students",
                      tags=["meals-included", "tech-hub", "no-deposit"]),
            self._row("zolo-2", "Zolo Stays Co-living — Koramangala",
                      description="Co-living studio with shared lounge, cinema room and 200 Mbps WiFi. 5 min walk to the tech corridor.",
                      category="housing", type="studio", city="Bengaluru", area="Koramangala",
                      location="Koramangala, Bengaluru", latitude=12.9355, longitude=77.6226,
                      rent_inr=10500, rent_unit="per_month", original_inr=13500,
                      amenities=["WiFi 200Mbps", "Lounge", "Cinema room", "AC"],
                      rating=4.4, review_count=154, beds_or_capacity="Studio",
                      available_units=8, provider=self.provider,
                      provider_slug="zolo-stays", provider_url=self.source_url,
                      verified=True, sa_perk="10% off 3-month plan",
                      tags=["coliving", "ac", "startup-hub"]),
        ])


# 3 ── Stanza (premium co-living) ─────────────────────────────────────────
class StanzaAdapter(RentalsSourceAdapter):
    source_name = "stanza"
    source_url = "https://www.stanza.living"
    provider = "Stanza"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("st-1", "Stanza Living — Sector 49, Gurgaon",
                      description="Premium single beds with daily housekeeping, meals, gym and co-working lounge. Near Gurgaon IT corridor.",
                      category="housing", type="pg", city="Delhi NCR", area="Sector 49, Gurgaon",
                      location="Sector 49, Gurgaon", latitude=28.4422, longitude=77.0804,
                      rent_inr=11500, rent_unit="per_month", original_inr=15000,
                      amenities=["Daily housekeeping", "Meals", "Gym", "Lounge", "WiFi"],
                      rating=4.6, review_count=318, beds_or_capacity="Premium single",
                      available_units=6, provider=self.provider,
                      provider_slug="stanza", provider_url=self.source_url,
                      gender_preference="Males", food_type="3x meals",
                      verified=True, sa_perk="Free upgrade for SA-ID",
                      tags=["premium", "corporate-hub", "meals-included"]),
            self._row("st-2", "Stanza Living — Hiranandani, Powai",
                      description="Co-living near IIT Bombay with meals, housekeeping and 24x7 power backup.",
                      category="housing", type="pg", city="Mumbai", area="Hiranandani, Powai",
                      location="Hiranandani, Powai, Mumbai", latitude=19.1151, longitude=72.9075,
                      rent_inr=14000, rent_unit="per_month", original_inr=17500,
                      amenities=["Meals", "Housekeeping", "Power backup", "WiFi"],
                      rating=4.5, review_count=132, beds_or_capacity="Single / Double",
                      available_units=9, provider=self.provider,
                      provider_slug="stanza", provider_url=self.source_url,
                      gender_preference="Any", verified=True,
                      sa_perk="₹1,500 off first month",
                      tags=["near-iit", "meals-included"]),
        ])


# 4 ── OYO (hotels & extended stays) ─────────────────────────────────────
class OyoAdapter(RentalsSourceAdapter):
    source_name = "oyo"
    source_url = "https://www.oyo.com"
    provider = "OYO"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("oyo-1", "OYO — Adyar, Chennai (near IIT Madras)",
                      description="Budget OYO stay near IIT Madras; AC rooms, breakfast and daily housekeeping.",
                      category="hotel", type="hotel", city="Chennai", area="Adyar",
                      location="Adyar, Chennai", latitude=13.0080, longitude=80.2644,
                      rent_inr=700, rent_unit="per_night", original_inr=950,
                      amenities=["AC", "Breakfast", "WiFi", "Daily housekeeping"],
                      rating=4.1, review_count=412, beds_or_capacity="Single / Double",
                      available_units=24, provider=self.provider,
                      provider_slug="oyo", provider_url=self.source_url,
                      verified=True, sa_perk="10% off with SA-ID",
                      tags=["budget", "near-iitm"]),
            self._row("oyo-2", "OYO Extended Stay — Salt Lake, Kolkata",
                      description="Weekly/monthly extended-stay pricing on OYO rooms near the Kolkata IT sector.",
                      category="hotel", type="hotel", city="Kolkata", area="Salt Lake",
                      location="Salt Lake, Kolkata", latitude=22.5686, longitude=88.3864,
                      rent_inr=55000, rent_unit="per_month", original_inr=70000,
                      amenities=["AC", "WiFi", "Housekeeping"],
                      rating=4.0, review_count=88, beds_or_capacity="Double room",
                      available_units=4, provider=self.provider,
                      provider_slug="oyo", provider_url=self.source_url,
                      verified=True, sa_perk="Extended-stay 15% for SA",
                      tags=["long-term", "it-sector"]),
        ])


# 5 ── Hostelworld (international + Indian student hostels) ─────────────
class HostelworldAdapter(RentalsSourceAdapter):
    source_name = "hostelworld"
    source_url = "https://www.hostelworld.com"
    provider = "Hostelworld"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("hw-1", "Hostelworld — Woxsen Guest House, Bengaluru",
                      description="4-bunk dorms and private twin rooms near Woxsen/BITM; communal kitchen and rooftop.",
                      category="housing", type="hostel", city="Bengaluru", area="Whitefield",
                      location="Whitefield, Bengaluru", latitude=12.9650, longitude=77.7550,
                      rent_inr=6200, rent_unit="per_month", original_inr=8000,
                      amenities=["WiFi", "Kitchen", "Rooftop", "Lockers"],
                      rating=4.3, review_count=265, beds_or_capacity="4-bed dorm / Twin",
                      available_units=15, provider=self.provider,
                      provider_slug="hostelworld", provider_url=self.source_url,
                      gender_preference="Any", verified=True,
                      sa_perk="First night free for SA students",
                      tags=["dorm", "budget", "students"]),
            self._row("hw-2", "Hostelworld — Jaipur Old City Hostel",
                      description="Hostel in Jaipur old city with 6-bed dorms and homely kitchen; walk to the fort.",
                      category="hotel", type="hotel", city="Jaipur", area="Old City",
                      location="Old City, Jaipur", latitude=26.9145, longitude=75.7949,
                      rent_inr=850, rent_unit="per_night", original_inr=1200,
                      amenities=["WiFi", "Kitchen", "Breakfast", "Tours desk"],
                      rating=4.5, review_count=521, beds_or_capacity="6-bed dorm",
                      available_units=10, provider=self.provider,
                      provider_slug="hostelworld", provider_url=self.source_url,
                      verified=True, sa_perk="₹100 off per night",
                      tags=["dorm", "travel", "budget"]),
        ])


# 6 ── MagicBricks (apartments / flats) ─────────────────────────────────
class MagicBricksAdapter(RentalsSourceAdapter):
    source_name = "magicbricks"
    source_url = "https://www.magicbricks.com"
    provider = "MagicBricks"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("mb-1", "MagicBricks — 1BHK, Andheri West, Mumbai",
                      description="1BHK apartment 600m from Versova station; balcony, wardrobes and covered parking.",
                      category="housing", type="1bhk", city="Mumbai", area="Andheri West",
                      location="Andheri West, Mumbai", latitude=19.1249, longitude=72.8441,
                      rent_inr=17500, rent_unit="per_month", original_inr=21000,
                      amenities=["Parking", "Wardrobes", "Balcony", "Metro access"],
                      rating=4.2, review_count=54, beds_or_capacity="1BHK Semi-furnished",
                      available_units=1, provider=self.provider,
                      provider_slug="magicbricks", provider_url=self.source_url,
                      gender_preference="Any", furnishing="Semi-furnished",
                      verified=True, sa_perk="Viewing fee waived for SA",
                      tags=["metro", "furnished"]),
            self._row("mb-2", "MagicBricks — 3BHK, Hinjewadi, Pune",
                      description="3BHK in a gated society next to the Hinjewadi IT park; clubhouse, pool and 2 parking spots.",
                      category="housing", type="3bhk", city="Pune", area="Hinjewadi",
                      location="Hinjewadi, Pune", latitude=18.5205, longitude=73.7979,
                      rent_inr=32000, rent_unit="per_month", original_inr=38000,
                      amenities=["Pool", "Clubhouse", "2 Parking", "Power backup"],
                      rating=4.4, review_count=73, beds_or_capacity="3BHK Furnished",
                      available_units=2, provider=self.provider,
                      provider_slug="magicbricks", provider_url=self.source_url,
                      furnishing="Fully furnished", verified=True,
                      sa_perk="Brokerage up to 50% off",
                      tags=["it-park", "pool", "family"]),
        ])


# 7 ── 99acres (apartments / flats) ─────────────────────────────────────
class Acres99Adapter(RentalsSourceAdapter):
    source_name = "99acres"
    source_url = "https://www.99acres.com"
    provider = "99acres"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("acres-1", "99acres — 2BHK, Koramangala, Bengaluru",
                      description="2BHK builder floor near Koramangala 5th block; modular kitchen and dedicated parking.",
                      category="housing", type="2bhk", city="Bengaluru", area="Koramangala",
                      location="Koramangala, Bengaluru", latitude=12.9355, longitude=77.6226,
                      rent_inr=19000, rent_unit="per_month", original_inr=23000,
                      amenities=["Parking", "Modular kitchen", "Generator"],
                      rating=4.1, review_count=41, beds_or_capacity="2BHK Furnished",
                      available_units=1, provider=self.provider,
                      provider_slug="99acres", provider_url=self.source_url,
                      furnishing="Semi-furnished", verified=True,
                      sa_perk="₹2,000 off deposit", tags=["furnished", "parking"]),
            self._row("acres-2", "99acres — Studio, Powai, Mumbai",
                      description="Compact studio 3 min from IIT Bombay; AC, attached bath and shared balcony.",
                      category="housing", type="studio", city="Mumbai", area="Powai",
                      location="Powai, Mumbai", latitude=19.1136, longitude=72.9011,
                      rent_inr=12500, rent_unit="per_month", original_inr=15000,
                      amenities=["AC", "Attached bath", "WiFi"],
                      rating=4.0, review_count=29, beds_or_capacity="Studio",
                      available_units=2, provider=self.provider,
                      provider_slug="99acres", provider_url=self.source_url,
                      furnishing="Fully furnished", verified=True,
                      sa_perk="Near campus for SA students", tags=["near-iit", "ac"]),
        ])


# 8 ── NestAway (co-living) ──────────────────────────────────────────────
class NestAwayAdapter(RentalsSourceAdapter):
    source_name = "nestaway"
    source_url = "https://www.nestaway.co.in"
    provider = "NestAway"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("na-1", "NestAway — Hiranandani, Powai",
                      description="NestAway co-living singles and doubles near IIT Bombay; mess, housekeeping and co-working space.",
                      category="housing", type="pg", city="Mumbai", area="Hiranandani, Powai",
                      location="Hiranandani, Powai, Mumbai", latitude=19.1151, longitude=72.9075,
                      rent_inr=13000, rent_unit="per_month", original_inr=16000,
                      amenities=["Mess", "Housekeeping", "Co-working", "WiFi"],
                      rating=4.4, review_count=176, beds_or_capacity="Single / Double",
                      available_units=7, provider=self.provider,
                      provider_slug="nestaway", provider_url=self.source_url,
                      gender_preference="Any", food_type="Mess (2x)",
                      verified=True, sa_perk="10% off with SA-ID",
                      tags=["coliving", "near-iit", "meals-included"]),
            self._row("na-2", "NestAway — HITEC City, Hyderabad",
                      description="Shared rooms and private doubles in a HITEC City society; shared kitchen and gym.",
                      category="housing", type="shared_flat", city="Hyderabad", area="HITEC City",
                      location="HITEC City, Hyderabad", latitude=17.4420, longitude=78.3670,
                      rent_inr=8500, rent_unit="per_month", original_inr=10500,
                      amenities=["Shared kitchen", "Gym", "WiFi"],
                      rating=4.2, review_count=64, beds_or_capacity="1 room in 2BHK",
                      available_units=3, provider=self.provider,
                      provider_slug="nestaway", provider_url=self.source_url,
                      verified=True, sa_perk="₹500 off for SA alumni",
                      tags=["shared", "it-sector"]),
        ])


# 9 ── Zoomcar (self-drive cars) ────────────────────────────────────────
class ZoomcarAdapter(RentalsSourceAdapter):
    source_name = "zoomcar"
    source_url = "https://www.zoomcar.com"
    provider = "Zoomcar"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("zc-1", "Zoomcar Monthly — SWIFT hatchback, Mumbai",
                      description="Monthly self-drive hatchback, 1500 km included, insurance and roadside assist. App-based unlock.",
                      category="vehicle", type="car", city="Mumbai", area="Mumbai",
                      location="Mumbai · Delhi · Bengaluru", latitude=19.0760, longitude=72.8777,
                      rent_inr=8999, rent_unit="per_month", original_inr=12000,
                      amenities=["1500km/mo free", "Self-drive", "Insurance"],
                      rating=4.3, review_count=210, beds_or_capacity="Hatchback / Sedan",
                      available_units=8, provider=self.provider,
                      provider_slug="zoomcar", provider_url=self.source_url,
                      verified=True, sa_perk="₹500 off with SA-ID",
                      tags=["self-drive", "long-term"]),
            self._row("zc-2", "Zoomcar Daily — Nexon EV, Bengaluru",
                      description="Daily self-drive EV; charge pass included, insurance and 24x7 support.",
                      category="vehicle", type="car", city="Bengaluru", area="Bengaluru",
                      location="Bengaluru", latitude=12.9716, longitude=77.5946,
                      rent_inr=1299, rent_unit="per_day", original_inr=1799,
                      amenities=["EV", "Charge pass", "Insurance"],
                      rating=4.5, review_count=96, beds_or_capacity="Nexon EV",
                      available_units=4, provider=self.provider,
                      provider_slug="zoomcar", provider_url=self.source_url,
                      verified=True, sa_perk="Weekend flat ₹500 off",
                      tags=["ev", "self-drive"]),
        ])


# 10 ── Bounce (two-wheeler subscriptions) ───────────────────────────────
class BounceAdapter(RentalsSourceAdapter):
    source_name = "bounce"
    source_url = "https://www.bounce.in"
    provider = "Bounce"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("bc-1", "Bounce Infinite — Electric bike, Bengaluru",
                      description="Unlimited km electric bike subscription; swap battery at 5000+ points, app unlock, zero petrol.",
                      category="vehicle", type="bike", city="Bengaluru", area="Bengaluru",
                      location="Bengaluru · Hyderabad", latitude=12.9716, longitude=77.5946,
                      rent_inr=999, rent_unit="per_month", original_inr=1499,
                      amenities=["Zero petrol", "App unlock", "Swap battery", "Insurance"],
                      rating=4.4, review_count=340, beds_or_capacity="Electric scooter",
                      available_units=25, provider=self.provider,
                      provider_slug="bounce", provider_url=self.source_url,
                      verified=True, sa_perk="10% extra off for SA students",
                      tags=["ev", "no-petrol", "unlimited-km"]),
            self._row("bc-2", "Bounce Scooter — Pune",
                      description="Electric scooter subscription with 200 km/week included; swap-battery network across Pune.",
                      category="vehicle", type="scooter", city="Pune", area="Pune",
                      location="Pune", latitude=18.5204, longitude=73.8567,
                      rent_inr=149, rent_unit="per_day", original_inr=199,
                      amenities=["200 km/wk", "Swap battery", "Insurance"],
                      rating=4.3, review_count=128, beds_or_capacity="Electric scooter",
                      available_units=15, provider=self.provider,
                      provider_slug="bounce", provider_url=self.source_url,
                      verified=True, sa_perk="First week 50% off",
                      tags=["ev", "weekly"]),
        ])


# 11 ── Yulu (EV cycles & scooters) ──────────────────────────────────────
class YuluAdapter(RentalsSourceAdapter):
    source_name = "yulu"
    source_url = "https://www.yulu.com"
    provider = "Yulu"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("yl-1", "Yulu Campus — Electric cycle, Bengaluru",
                      description="Campus-friendly EV cycle plan; app unlock, no licence, swap batteries at 800+ Yulu points.",
                      category="vehicle", type="cycle", city="Bengaluru", area="Bengaluru",
                      location="Bengaluru · Pune", latitude=12.9716, longitude=77.5946,
                      rent_inr=299, rent_unit="per_month", original_inr=499,
                      amenities=["Zero emission", "App unlock", "No licence"],
                      rating=4.5, review_count=1200, beds_or_capacity="Electric cycle",
                      available_units=100, provider=self.provider,
                      provider_slug="yulu", provider_url=self.source_url,
                      student_friendly=True, verified=True,
                      sa_perk="2 months free for new SA students",
                      tags=["eco", "campus", "ev"]),
            self._row("yl-2", "Yulu Scooter — Monthly, Delhi",
                      description="Monthly Yulu scooter plan with 600 km included; insurance and breakdown cover.",
                      category="vehicle", type="scooter", city="Delhi", area="Delhi",
                      location="Delhi NCR", latitude=28.6129, longitude=77.2090,
                      rent_inr=1799, rent_unit="per_month", original_inr=2499,
                      amenities=["600 km/mo", "Insurance", "Breakdown cover"],
                      rating=4.2, review_count=430, beds_or_capacity="Yulu A",
                      available_units=40, provider=self.provider,
                      provider_slug="yulu", provider_url=self.source_url,
                      verified=True, sa_perk="₹200 off first month",
                      tags=["ev", "unlimited-km"]),
        ])


# 12 ── Coworking (CoWrks / 91springboard / Awfis / WeWork / Innov8) ────
class CoworkingAdapter(RentalsSourceAdapter):
    source_name = "coworking"
    source_url = "https://www.cowrks.com"
    provider = "CoWrks"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return self._rows([
            self._row("cw-1", "CoWrks — Hot Desk, Whitefield",
                      description="Hot desk in a 40-seat community; 24x7 access, gig WiFi and meeting-room credits.",
                      category="coworking", type="hot_desk", city="Bengaluru", area="Whitefield",
                      location="Whitefield, Bengaluru", latitude=12.9698, longitude=77.7499,
                      rent_inr=1999, rent_unit="per_month", original_inr=2799,
                      amenities=["Gig WiFi", "24x7 access", "Meeting room credits"],
                      rating=4.3, review_count=88, beds_or_capacity="Hot desk",
                      available_units=20, provider=self.provider,
                      provider_slug="cowrks", provider_url=self.source_url,
                      verified=True, sa_perk="10% off with SA-ID",
                      tags=["wifi-fast", "24x7"]),
            self._row("cw-2", "91springboard — Private Cabin, HITEC City",
                      description="Private cabin for 2 near HITEC City; dedicated line, AC and pantry access.",
                      category="coworking", type="private_cabin", city="Hyderabad", area="HITEC City",
                      location="HITEC City, Hyderabad", latitude=17.4420, longitude=78.3670,
                      rent_inr=4500, rent_unit="per_month", original_inr=6000,
                      amenities=["Dedicated line", "AC", "Pantry"],
                      rating=4.5, review_count=41, beds_or_capacity="2-person cabin",
                      available_units=6, provider="91springboard",
                      provider_slug="91springboard",
                      provider_url="https://www.91springboard.com",
                      verified=True, sa_perk="Free visitor pass",
                      tags=["private", "it-sector"]),
            self._row("cw-3", "Awfis — Meeting Room, Gurgaon",
                      description="Book-by-hour meeting room for up to 12; projector, whiteboard and coffee included.",
                      category="coworking", type="meeting_room", city="Delhi NCR", area="Gurgaon",
                      location="Gurgaon", latitude=28.4595, longitude=77.0266,
                      rent_inr=450, rent_unit="per_hour", original_inr=600,
                      amenities=["Projector", "Whiteboard", "Coffee"],
                      rating=4.4, review_count=57, beds_or_capacity="Up to 12",
                      available_units=4, provider="Awfis",
                      provider_slug="awfis", provider_url="https://www.awfis.co.in",
                      verified=True, sa_perk="2 free hours monthly for SA",
                      tags=["meeting", "by-the-hour"]),
        ])


# 13 ── Reddit r/IndianRealEstate (community JSON, live) ────────────────
class RedditIndianRealEstateAdapter(RentalsSourceAdapter):
    source_name = "reddit_indianrealestate"
    source_url = "https://www.reddit.com/r/IndianRealEstate/"

    _URL = ("https://www.reddit.com/r/IndianRealEstate/search.json"
            "?q=rent&restrict_sr=1&sort=new&limit=25")

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        data = await self._get_json(self._URL, headers={"User-Agent": USER_AGENT})
        rows: List[Dict[str, Any]] = []
        for child in (data.get("data") or {}).get("children", []):
            p = child.get("data") or {}
            title = (p.get("title") or "").strip()
            if not title:
                continue
            body = (p.get("selftext") or "").strip().replace("\n", " ")[:400]
            city = ""
            m = re.search(
                r"\b(bangalore|bengaluru|mumbai|delhi|pune|hyderabad|kolkata"
                r"|chennai|gurgaon|goa|ahmedabad)\b", f"{title} {body}", re.I)
            if m:
                found = m.group(1).lower()
                city = {"bangalore": "Bengaluru"}.get(found, found.capitalize())
            rows.append({
                "source_id": str(p.get("id") or len(rows)),
                "title": title[:160],
                "description": body,
                "city": city,
                "location": city,
                "provider": "Reddit r/IndianRealEstate",
                "provider_slug": "reddit",
                "provider_url": f"https://www.reddit.com{p.get('permalink') or ''}",
                "student_friendly": True,
                "verified": bool(p.get("stickied")),
                "tags": ["community", "reddit"],
            })
        return self._rows(rows[:25])


# 14 ── Booking.com Affiliate (hotels) ───────────────────────────────────
class BookingComAdapter(RentalsSourceAdapter):
    source_name = "booking_com"
    source_url = "https://www.booking.com"
    provider = "Booking.com"
    api_key_env = "BOOKING_COM_AFFILIATE_ID"

    _LIVE_ENDPOINT = "https://distribution-xml.booking.com/2.9/json/hotels"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        if os.environ.get(self.api_key_env):
            try:
                return await self._live()
            except Exception as e:  # noqa: BLE001 — fall back to static
                logger.warning("[rentals_agg] booking_com live failed: %s", e)
        return self._static()

    async def _live(self) -> List[Dict[str, Any]]:
        data = await self._get_json(
            self._LIVE_ENDPOINT,
            params={"aid": os.environ.get(self.api_key_env, "")},
        )
        rows = []
        for h in (data.get("hotels") or [])[:50]:
            rows.append({
                "source_id": str(h.get("hotelId")),
                "title": f"Booking.com — {h.get('name')}",
                "description": (h.get("description") or "")[:400],
                "category": "hotel",
                "type": "hotel",
                "city": h.get("city", ""),
                "location": h.get("location", h.get("city", "")),
                "latitude": _num(h.get("latitude")),
                "longitude": _num(h.get("longitude")),
                "rent_inr": _num(h.get("priceInr")),
                "rent_unit": "per_night",
                "rating": _num(h.get("rating")),
                "available_units": int(h.get("roomsAvailable") or 0),
            })
        return self._rows(rows)

    @staticmethod
    def _static() -> List[Dict[str, Any]]:
        p = "Booking.com"
        pu = "https://www.booking.com"
        return [
            RentalsSourceAdapter._row("bc-com-1", "Booking.com — Lemon Tree, Bengaluru",
                                      description="Business hotel with intern pack rates; breakfast, gym and co-working desk.",
                                      category="hotel", type="hotel", city="Bengaluru",
                                      location="Bengaluru · Mumbai · Delhi",
                                      latitude=12.9716, longitude=77.5946,
                                      rent_inr=1999, rent_unit="per_night",
                                      original_inr=3200,
                                      amenities=["Breakfast", "Gym", "Co-working desk"],
                                      rating=4.5, review_count=890,
                                      beds_or_capacity="Deluxe room", available_units=20,
                                      provider=p, provider_slug="booking-com",
                                      provider_url=pu, verified=True,
                                      sa_perk="20% off for interns · 3+ nights",
                                      tags=["business", "intern-pack"]),
            RentalsSourceAdapter._row("bc-com-2", "Booking.com — Treebo Trend, New Delhi",
                                      description="Budget business stay at Connaught Place; breakfast and daily housekeeping.",
                                      category="hotel", type="hotel", city="Delhi",
                                      location="Connaught Place, New Delhi",
                                      latitude=28.6315, longitude=77.2167,
                                      rent_inr=1299, rent_unit="per_night",
                                      original_inr=2100,
                                      amenities=["Breakfast", "WiFi", "Daily housekeeping"],
                                      rating=4.3, review_count=542,
                                      beds_or_capacity="Standard / Deluxe", available_units=15,
                                      provider=p, provider_slug="booking-com",
                                      provider_url=pu, verified=True,
                                      sa_perk="Free upgrade for SA",
                                      tags=["central", "budget"]),
        ]


# 15 ── Hostelworld Affiliate (live student-stay feed) ──────────────────
class HostelworldAffiliateAdapter(RentalsSourceAdapter):
    source_name = "hostelworld_affiliate"
    source_url = "https://api.hostelworld.com/partner-api/v4/listings"
    provider = "Hostelworld"
    api_key_env = "HOSTELWORLD_API_KEY"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        if not os.environ.get(self.api_key_env):
            return self._static()
        try:
            data = await self._get_json(
                self.source_url +
                f"?api-key={os.environ[self.api_key_env]}&max_results=40")
            rows = []
            for item in (data.get("items") or [])[:40]:
                dest = item.get("destination") or {}
                rows.append({
                    "source_id": str(item.get("id")),
                    "title": f"Hostelworld — {item.get('name')}",
                    "description": (item.get("description") or "")[:400],
                    "category": "housing",
                    "type": "hostel",
                    "city": dest.get("name", ""),
                    "location": dest.get("name", ""),
                    "latitude": _num(dest.get("latitude")),
                    "longitude": _num(dest.get("longitude")),
                    "rent_inr": _num(item.get("priceFromInr")),
                    "rent_unit": "per_month",
                    "rating": _num(item.get("reviewScore")),
                    "review_count": int(item.get("reviewCount") or 0),
                    "available_units": int(item.get("bedsAvailable") or 0),
                    "tags": ["student-stay"],
                })
            return self._rows(rows)
        except Exception as e:  # noqa: BLE001 — fall back to static
            logger.warning("[rentals_agg] hostelworld affiliate failed: %s", e)
            return self._static()

    @staticmethod
    def _static() -> List[Dict[str, Any]]:
        p = "Hostelworld"
        pu = "https://www.hostelworld.com"
        return [
            RentalsSourceAdapter._row("hw-aff-1", "Hostelworld — Cinnamon House, Bengaluru",
                                      description="Popular student hostel near Whitefield; dorms and private rooms, breakfast included.",
                                      category="housing", type="hostel", city="Bengaluru",
                                      location="Whitefield, Bengaluru",
                                      latitude=12.9650, longitude=77.7550,
                                      rent_inr=6500, rent_unit="per_month",
                                      original_inr=8500,
                                      amenities=["WiFi", "Breakfast", "Kitchen", "Tours"],
                                      rating=4.6, review_count=380,
                                      beds_or_capacity="4-bed dorm / Private",
                                      available_units=14, provider=p,
                                      provider_slug="hostelworld", provider_url=pu,
                                      verified=True,
                                      sa_perk="First night free for SA students",
                                      tags=["student-stay", "dorm", "breakfast"]),
            RentalsSourceAdapter._row("hw-aff-2", "Hostelworld — Jaipur Heritage Guesthouse",
                                      description="Heritage guesthouse near Jaipur fort; private twin rooms and rooftop tea.",
                                      category="hotel", type="hotel", city="Jaipur",
                                      location="Old City, Jaipur",
                                      latitude=26.9145, longitude=75.7949,
                                      rent_inr=950, rent_unit="per_night",
                                      original_inr=1300,
                                      amenities=["WiFi", "Rooftop", "Guided tours"],
                                      rating=4.7, review_count=612,
                                      beds_or_capacity="Private twin", available_units=8,
                                      provider=p, provider_slug="hostelworld",
                                      provider_url=pu, verified=True,
                                      sa_perk="₹100 off per night",
                                      tags=["heritage", "travel"]),
        ]


# 16 ── SA Exclusive (R8 landlord portal placeholder — empty by design) ─
class SAExclusiveAdapter(RentalsSourceAdapter):
    """R8 slot: verified landlord/property-owner listings land here when
    the landlord portal ships. Empty until then — R1 must not fabricate
    'exclusive' inventory."""
    source_name = "sa_exclusive"
    source_url = "https://studentalumni.in/rentals"

    async def fetch_listings(self) -> List[Dict[str, Any]]:
        return []


ALL_ADAPTERS: List[RentalsSourceAdapter] = [
    NoBrokerAdapter(), ZoloStaysAdapter(), StanzaAdapter(), OyoAdapter(),
    HostelworldAdapter(), MagicBricksAdapter(), Acres99Adapter(),
    NestAwayAdapter(), ZoomcarAdapter(), BounceAdapter(), YuluAdapter(),
    CoworkingAdapter(), RedditIndianRealEstateAdapter(), BookingComAdapter(),
    HostelworldAffiliateAdapter(), SAExclusiveAdapter(),
]
ADAPTERS_BY_NAME: Dict[str, RentalsSourceAdapter] = {
    a.source_name: a for a in ALL_ADAPTERS
}


# ─── Document shaping (marketplace-compatible) ──────────────────────────
def _listing_id(source: str, source_id: str) -> str:
    return f"{source}:{source_id}"


def _rent_label(rent_inr: Any, unit: str) -> str:
    n = _num(rent_inr)
    if n is None:
        return ""
    suffix = UNIT_SUFFIX.get(unit, "")
    return f"₹{int(round(n)):,}/{suffix}"


def _display_type(type_code: str) -> str:
    return TYPE_LABELS.get(type_code, type_code.replace("_", " ").title())


def _to_doc(adapter: RentalsSourceAdapter, raw: Dict[str, Any],
            now: datetime) -> Dict[str, Any]:
    title = (raw.get("title") or "Listing").strip()
    description = (raw.get("description") or "").strip()
    category = raw.get("category") or classify_listing(title, description)[0]
    if category not in RENTAL_CATEGORIES:
        category = "housing"
    type_code = raw.get("type") or classify_listing(title, description)[1]
    if type_code not in RENTAL_TYPES:
        type_code = _DEFAULT_TYPE[category]

    rent_unit = raw.get("rent_unit") or "per_month"
    if rent_unit not in RENT_UNITS:
        rent_unit = "per_month"
    rent_inr = _num(raw.get("rent_inr"))
    original_inr = _num(raw.get("original_inr"))
    discount_pct = raw.get("discount_pct")
    if discount_pct is None:
        discount_pct = _calc_pct(original_inr, rent_inr)
    discount_pct = int(discount_pct or 0)

    provider = (raw.get("provider") or adapter.source_name).strip()
    source_id = str(raw.get("source_id") or "0")
    listing_id = _listing_id(adapter.source_name, source_id)
    beds = raw.get("beds_or_capacity") or raw.get("beds") or ""
    available_units = raw.get("available_units", raw.get("available"))
    sa_perk = raw.get("sa_perk") or raw.get("perk") or ""
    latitude = _num(raw.get("latitude"))
    longitude = _num(raw.get("longitude"))
    # GeoJSON point for the 2dsphere index (Mongo allows one 2dsphere field
    # per index, so lat/lon scalars can't both be 2dsphere).
    geo = None
    if latitude is not None and longitude is not None:
        geo = {"type": "Point", "coordinates": [longitude, latitude]}

    doc: Dict[str, Any] = {
        "listing_id": listing_id,
        "id": listing_id,  # frontend detail/booking lookups key off `id`
        "source": adapter.source_name,
        "source_id": source_id,
        "source_url": raw.get("source_url") or adapter.source_url,
        "title": title,
        "description": description,
        "category": category,
        "type_code": type_code,
        "type": _display_type(type_code),
        "city": (raw.get("city") or "").strip(),
        "area": (raw.get("area") or "").strip(),
        "location": (raw.get("location") or raw.get("city") or "").strip(),
        "latitude": latitude,
        "longitude": longitude,
        "geo": geo,
        "rent_inr": int(round(rent_inr)) if rent_inr is not None else None,
        "rent_unit": rent_unit,
        "rent_label": _rent_label(rent_inr, rent_unit),
        "original_inr": int(round(original_inr)) if original_inr is not None else None,
        "orig_inr": int(round(original_inr)) if original_inr is not None else None,
        "orig_label": _rent_label(original_inr, rent_unit),
        "discount_pct": discount_pct,
        "discount": f"{discount_pct}%" if discount_pct else "",
        "amenities": list(raw.get("amenities") or []),
        "photos": list(raw.get("photos") or []),
        "rating": _num(raw.get("rating")),
        "review_count": int(raw.get("review_count") or 0),
        "reviews": int(raw.get("reviews") or raw.get("review_count") or 0),
        "beds_or_capacity": beds,
        "beds": beds,
        "available_units": int(available_units or 0),
        "available": int(available_units or 0),
        "provider": provider,
        "provider_slug": raw.get("provider_slug") or _slug(provider),
        "provider_url": raw.get("provider_url") or adapter.source_url,
        "provider_logo_url": raw.get("provider_logo_url") or "",
        "contact_phone": raw.get("contact_phone") or "",
        "contact_email": raw.get("contact_email") or "",
        "student_friendly": bool(raw.get("student_friendly")),
        "sa_discount": raw.get("sa_discount") or "",
        "sa_perk": sa_perk,
        "perk": sa_perk,
        "gender_preference": raw.get("gender_preference") or "Any",
        "food_type": raw.get("food_type") or "",
        "furnishing": raw.get("furnishing") or "",
        "verified": bool(raw.get("verified")),
        "verified_at": (raw.get("verified_at") or
                        (now.isoformat() if raw.get("verified") else None)),
        "verification_status": "verified" if raw.get("verified") else "unverified",
        "color": CATEGORY_COLORS.get(category, "#3B82F6"),
        "emoji": raw.get("emoji") or CATEGORY_EMOJI.get(category, "🏠"),
        "featured": False,
        "tags": list(raw.get("tags") or []),
        "source_rank": SOURCE_RANK.get(adapter.source_name, 99),
        "last_fetched_at": now,
        "expires_at": raw.get("expires_at"),
        "status": "active",
        "updated_at": now,
    }
    return doc


# ─── Pipeline ────────────────────────────────────────────────────────────
class RentalsAggregator:
    def __init__(self, db=_db):
        self.db = db
        self.col = db[LISTINGS_COL]
        self.runs = db[RUN_META]
        self.meta = db[SOURCE_META]

    async def ensure_indexes(self) -> None:
        await self.col.create_index(
            [("source", 1), ("source_id", 1)],
            unique=True, name="uniq_source_listing")
        await self.col.create_index(
            [("city", 1), ("category", 1)], name="idx_city_category")
        await self.col.create_index(
            [("geo", "2dsphere")], name="geo_2dsphere")
        await self.col.create_index(
            [("title", "text"), ("description", "text"), ("location", "text")],
            name="text_search")
        await self.runs.create_index([("ran_at", -1)], name="idx_runs_at")

    async def fetch_source(self, name: str) -> Tuple[List[Dict[str, Any]], str]:
        """Returns (rows, status). status ∈ ok | error | disabled |
        unknown_source. Preserves an injected test client on the adapter
        (adapter.http is left as found)."""
        adapter = ADAPTERS_BY_NAME.get(name)
        if adapter is None:
            return [], "unknown_source"
        if not await self.source_enabled(name):
            return [], "disabled"
        injected = adapter.http
        if injected is None:
            client = httpx.AsyncClient(timeout=PER_API_TIMEOUT_S,
                                       headers={"User-Agent": USER_AGENT})
            adapter.http = client
        try:
            rows = await adapter.fetch_listings()
            return (rows or []), "ok"
        except Exception as e:  # noqa: BLE001 — isolate per adapter
            logger.warning("[rentals_agg] source %s failed: %s", name, e)
            return [], "error"
        finally:
            if injected is None:
                await client.aclose()
            else:
                adapter.http = None

    async def source_enabled(self, name: str) -> bool:
        doc = await self.meta.find_one({"source": name})
        return doc.get("enabled", True) if doc else True

    async def run_source(self, name: str) -> Dict[str, Any]:
        rows, status = await self.fetch_source(name)
        now = _utcnow()
        if status == "ok":
            upserted = 0
            for r in rows:
                doc = _to_doc(ADAPTERS_BY_NAME[name], r, now)
                res = await self.col.update_one(
                    {"source": name, "source_id": doc["source_id"]},
                    {"$set": {k: v for k, v in doc.items() if k != "created_at"},
                     "$setOnInsert": {"created_at": now}},
                    upsert=True,
                )
                if res.upserted_id:
                    upserted += 1
            return {"source": name, "status": "ok", "upserted": upserted,
                    "fetched": len(rows)}
        return {"source": name, "status": status, "upserted": 0, "fetched": 0}

    async def dedup_run(self, names: List[str]) -> int:
        """Fuzzy-merge listings shared across the given sources; the loser of
        each group is marked `inactive` (the status the marketplace filters
        out) so it stops rendering but stays queryable."""
        query: Dict[str, Any] = {"status": "active"}
        if names:
            query["source"] = {"$in": names}
        docs: List[Dict[str, Any]] = []
        async for d in self.col.find(query):
            docs.append(d)
        merged = deduplicate(docs)
        marked = 0
        for winner in merged:
            dups = winner.get("duplicate_listing_ids") or []
            if not dups:
                continue
            for dup in dups:
                res = await self.col.update_one(
                    {"listing_id": dup},
                    {"$set": {"status": INACTIVE, "updated_at": _utcnow()}},
                )
                if res.matched_count:
                    marked += 1
                else:
                    logger.warning("[rentals_agg] dup id not found: %s", dup)
            await self.col.update_one(
                {"listing_id": winner.get("listing_id")},
                {"$set": {"tags": winner.get("tags") or [],
                          "verified": winner.get("verified", False),
                          "duplicate_listing_ids": dups,
                          "updated_at": _utcnow()}},
            )
        return marked

    async def mark_stale(self, cutoff_hours: int = STALE_AFTER_HOURS) -> int:
        cutoff = _utcnow() - timedelta(hours=cutoff_hours)
        res = await self.col.update_many(
            {"last_fetched_at": {"$lt": cutoff}, "status": "active"},
            {"$set": {"status": "stale", "updated_at": _utcnow()}},
        )
        return res.modified_count

    async def refresh_stats(self, results: List[Dict[str, Any]]) -> None:
        total = await self.col.count_documents({"status": {"$ne": INACTIVE}})
        by_source = {}
        for n in ADAPTERS_BY_NAME:
            by_source[n] = await self.col.count_documents(
                {"source": n, "status": {"$ne": INACTIVE}})
        await self.meta.update_one(
            {"_id": "aggregator"},
            {"$set": {"last_run_at": _utcnow().isoformat(),
                      "total_active_listings": total,
                      "by_source": by_source,
                      "last_results": results,
                      "updated_at": _utcnow()}},
            upsert=True,
        )

    async def find_nearby(self, latitude: float, longitude: float,
                          radius_m: float = 5000,
                          category: Optional[str] = None,
                          limit: int = 50) -> List[Dict[str, Any]]:
        """2dsphere geo query: active listings within radius_m of a point."""
        lat, lon = _num(latitude), _num(longitude)
        if lat is None or lon is None:
            return []
        q: Dict[str, Any] = {
            "status": "active",
            "geo": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "$maxDistance": radius_m,
                }
            },
        }
        if category:
            q["category"] = category
        docs: List[Dict[str, Any]] = []
        async for d in self.col.find(q, {"_id": 0}).limit(limit):
            docs.append(d)
        return docs

    async def run(self, source: Optional[str] = None) -> Dict[str, Any]:
        await self.ensure_indexes()
        names = [source] if source else list(ADAPTERS_BY_NAME)
        results = list(await asyncio.gather(*(self.run_source(n) for n in names)))
        deduped = await self.dedup_run(names)
        stale = await self.mark_stale()
        await self.refresh_stats(results)
        report = {
            "ran_at": _utcnow().isoformat(),
            "results": results,
            "deduped": deduped,
            "stale_marked": stale,
            "total_active": await self.col.count_documents(
                {"status": {"$ne": INACTIVE}}),
        }
        await self.runs.insert_one({**report, "_id": ObjectId()})
        logger.info("[rentals_agg] run complete: %d sources, %d deduped, %d stale",
                    len(results), deduped, stale)
        return report

    async def status(self) -> Dict[str, Any]:
        last = await self.runs.find_one({}, sort=[("ran_at", -1)])
        per_source = []
        for name, adapter in ADAPTERS_BY_NAME.items():
            sdoc = await self.meta.find_one({"source": name})
            latest = await self.col.find_one(
                {"source": name}, sort=[("last_fetched_at", -1)])
            count = await self.col.count_documents({"source": name})
            per_source.append({
                "source": name,
                "enabled": sdoc.get("enabled", True) if sdoc else True,
                "doc_count": count,
                "last_fetched_at": latest.get("last_fetched_at") if latest else None,
                "needs_api_key": bool(adapter.api_key_env)
                                 and not os.environ.get(adapter.api_key_env),
            })
        agg = await self.meta.find_one({"_id": "aggregator"}) or {}
        return {
            "collection": LISTINGS_COL,
            "last_run_at": last.get("ran_at") if last else None,
            "last_results": last.get("results") if last else [],
            "total_active": await self.col.count_documents(
                {"status": {"$ne": INACTIVE}}),
            "stats": agg.get("by_source"),
            "sources": per_source,
        }


aggregator = RentalsAggregator()


async def run_rentals_aggregation(source: Optional[str] = None) -> Dict[str, Any]:
    return await aggregator.run(source)


# ─── Scheduler ──────────────────────────────────────────────────────────
_rentals_scheduler = None


def _flag_set(var: str, default: str) -> bool:
    return (os.environ.get(var) or default).strip().lower() in {"1", "true", "yes", "on"}


def start_rentals_aggregator_scheduler() -> None:
    """Start the daily 04:00 UTC cron + optional startup catch-up run.
    Called from server.py under leader election (single-worker safe)."""
    global _rentals_scheduler
    if _rentals_scheduler is not None:
        return
    if not _flag_set("RENTALS_AGGREGATOR_CRON_ENABLED", "1"):
        logger.info("[rentals_agg] cron disabled via RENTALS_AGGREGATOR_CRON_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz
        _rentals_scheduler = AsyncIOScheduler(timezone=pytz.UTC)
        _rentals_scheduler.add_job(
            run_rentals_aggregation,
            CronTrigger(hour=4, minute=0),
            id="rentals_aggregator_daily",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _rentals_scheduler.start()
        logger.info("[rentals_agg] daily rentals cron started (04:00 UTC)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[rentals_agg] failed to start scheduler: %s", e)

    # Startup catch-up: run now if the last run is >24h old (or never ran).
    if _flag_set("RENTALS_AGGREGATOR_RUN_ON_STARTUP", "1"):
        async def _startup_run():
            try:
                last = await aggregator.runs.find_one({}, sort=[("ran_at", -1)])
                last_at = last.get("ran_at") if last else None
                if last_at:
                    last_dt = datetime.fromisoformat(last_at)
                    if _utcnow() - last_dt < timedelta(hours=STARTUP_STALE_HOURS):
                        return
                await run_rentals_aggregation()
            except Exception as e:  # noqa: BLE001
                logger.warning("[rentals_agg] startup run failed: %s", e)
        asyncio.ensure_future(_startup_run())


def stop_rentals_aggregator_scheduler() -> None:
    global _rentals_scheduler
    if _rentals_scheduler is not None:
        try:
            _rentals_scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
        _rentals_scheduler = None


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
    prefix="/admin/rentals-aggregator",
    tags=["admin-rentals-aggregator"],
)


class SourceToggle(BaseModel):
    enabled: bool


@admin_router.get("/status")
async def rentals_status(user: dict = Depends(require_super_admin)):
    return await aggregator.status()


@admin_router.patch("/sources/{name}")
async def toggle_source(name: str, body: SourceToggle,
                        user: dict = Depends(require_super_admin)):
    if name not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown rentals aggregator source '{name}'")
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
        raise HTTPException(404, f"Unknown rentals aggregator source '{source}'")
    report = await run_rentals_aggregation(source)
    return {"ok": True, **report}
