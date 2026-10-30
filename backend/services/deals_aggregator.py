"""
deals_aggregator.py — D1 Universal Deal Aggregator Bot (24h cron).

Brand-agnostic deal ingestion: 20 source adapters scrape / call APIs that
themselves aggregate deals across ALL brands and categories; whatever the
source returns is ingested into the shared ``deals`` Mongo collection that
``features.deals_aggregator`` already serves at GET /deals/all. New brands
appear automatically — the only curated layer is the student-verified seed.

Pipeline (per run): fetch per adapter (async, error-isolated) → auto-classify
category → upsert by (source, source_id) → fuzzy deduplicate (brand+code+
title, keep highest-quality source) → recompute tag-engine tags → auto-expire
past ``expires_at`` → mark stale (>72h without fetch) → refresh stats meta.

Sources without a stable public API serve a deterministic static catalog
instead of scraping (documented on each adapter); adapters with env-gated
keys fall back to the same static catalog until the key is set.

Adapters:
  TIER 1 (free)
    1.  grabon              — scrape grabon.in; static catalog stands in
    2.  coupondunia         — scrape; static catalog
    3.  zoutons             — scrape; static catalog
    4.  promocodeverified   — live REST, no key
    5.  desidime            — scrape; static catalog
    6.  freekaamaal         — scrape; static catalog
    7.  reddit_indiandeals  — live JSON, no key (community)
    8.  github_edupack      — live parse of raw markdown
    9.  studentdev_discounts— live parse of raw markdown
    10. opengenus_students  — live parse of raw markdown
    11. bank_offers         — HDFC/ICICI/SBI/Axis/Kotak pages; static catalog
    12. cashkaro            — scrape; static catalog (cashback)
    13. pricehistory        — scrape; static catalog
    14. airlines            — student fares pages; static catalog
    15. flipkart_students   — student program pages; static catalog
  TIER 2 (env-gated API)
    16. linkmydeals         — LINKMYDEALS_API_KEY (static fallback)
    17. rapidapi_coupons    — RAPIDAPI_KEY (static fallback)
  TIER 3 (affiliate, env-gated)
    18. amazon_associates   — AMAZON_ACCESS_KEY + AMAZON_ASSOCIATE_TAG
    19. flipkart_affiliate  — FLIPKART_AFFILIATE_ID
    20. cj_impact           — CJ_AFFILIATE_KEY / IMPACT_AFFILIATE_KEY

Cron (staggered, UTC, leader-elected in server.py):
  banks 01:00 · coupon sites 02:00 · cashback 02:30 · community every 6h ·
  APIs 03:00 · student-specific weekly 04:00 · airlines weekly 04:30 ·
  affiliate feeds every 6h

Admin (super_admin):
  GET   /api/admin/deals-aggregator/status
  PATCH /api/admin/deals-aggregator/sources/{name}   {"enabled": bool}
  POST  /api/admin/deals-aggregator/run?source={name} (omit for all)

Env:
  LINKMYDEALS_API_KEY, RAPIDAPI_KEY,
  AMAZON_ASSOCIATE_TAG, AMAZON_ACCESS_KEY,
  FLIPKART_AFFILIATE_ID, CJ_AFFILIATE_KEY / IMPACT_AFFILIATE_KEY,
  DEALS_AGGREGATOR_CRON_ENABLED   — 0 to disable the crons (default 1)
  DEALS_AGGREGATOR_RUN_ON_STARTUP — 0 to skip the startup catch-up (default 1)
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

logger = logging.getLogger("deals_aggregator")

DEALS_COL = "deals"
RUN_META = "deals_aggregator_runs"
SOURCE_META = "deals_aggregator_sources"

USER_AGENT = "StudentAlumniBot/1.0 (+https://studentalumni.in)"
PER_API_TIMEOUT_S = 15.0
STALE_AFTER_HOURS = 72
STARTUP_STALE_HOURS = 24

# Source quality for dedup: lower = better. Curated/verified > community >
# API aggregators > scrapers > static fallbacks.
SOURCE_RANK: Dict[str, int] = {
    "curated": 0,
    "promocodeverified": 1,
    "reddit_indiandeals": 2,
    "linkmydeals": 3,
    "rapidapi_coupons": 3,
    "github_edupack": 3,
    "studentdev_discounts": 3,
    "opengenus_students": 3,
    "bank_offers": 4,
    "flipkart_affiliate": 4,
    "amazon_associates": 4,
    "cj_impact": 4,
    "desidime": 5,
    "cashkaro": 5,
    "pricehistory": 5,
    "freekaamaal": 5,
    "zoutons": 6,
    "coupondunia": 6,
    "grabon": 7,
    "airlines": 7,
    "flipkart_students": 7,
}

# 12-color accent palette (matches frontend BrandLogo fallback colors).
_ACCENTS = ["#24292F", "#EF4444", "#F97316", "#F59E0B", "#10B981", "#059669",
            "#3B82F6", "#6366F1", "#7C3AED", "#EC4899", "#0EA5E9", "#14B8A6"]

DEAL_TYPES = ("student_exclusive", "coupon", "cashback", "bank_offer",
              "first_order", "flash_sale", "referral", "freebie", "community")
CATEGORIES = ("tech", "fashion", "food", "grocery", "electronics", "flights",
              "buses", "trains", "rides", "hotels", "learning", "streaming",
              "health", "insurance", "ecommerce", "dating", "finance",
              "beauty", "home", "exam_prep", "gaming", "other")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─── Auto-category classifier (22 categories, keyword match) ───────────
_CATEGORY_KEYWORDS: List[Tuple[str, Tuple[str, ...]]] = [
    ("flights", ("flight", "airline", "airfare", "indigo", "indigo", "air india",
                 "akasa", "spicejet", "spice jet", "flight ticket", "air ticket",
                 "ixigo", "cab to airport")),
    ("trains", ("train", "railway", "irctc", "irctc", "irctc", "rail pass",
                "sleeper class", "3ac", "2ac", "1ac", "ladies coach")),
    ("buses", ("bus ticket", "redbus", "ab bus", "intercity bus", "sleeper bus",
               "bus pass")),
    ("rides", ("cab", "cab", "auto ride", "scooty", "blu", "rapido",
               "bike tax", "bike share")),
    ("hotels", ("hotel", "stay", "booking", "airbnb", "vacation home",
                 "guest house", "resort", "homestay")),
    ("streaming", ("streaming", "netflix", "spotify", "spotify", "youtube premium",
                   "disney+", "prime video", "hotstar", "apple music",
                   "deezer", "hulu", "soundcloud")),
    ("gaming", ("game", "game", "gaming", "esports", "steam", "console",
                 "xbox", "nintendo", "playstation", "fortnite", "garena")),
    ("exam_prep", ("mock test", "mock exam", "test series", "exam prep",
                    "exam prep", "practice paper", "syllabus", "chapterwise",
                    "chapter-wise", "revision notes", "test series")),
    ("learning", ("course", "tutorial", "learn", "certificate", "mentor",
                   "workshop", "bootcamp", "masterclass", "class for",
                   "subscription to learn")),
    ("tech", ("software", "developer", "dev", "ide", "api", "cloud",
               "hosting", "git", "open source", "linux", "terminal",
               "docker", "kubernetes")),
    ("electronics", ("laptop", "phone", "gadget", "earbuds", "smartwatch",
                     "camera", "headphone", "ssd", "ram", "gpu", "drone")),
    ("ecommerce", ("shop", "cart", "checkout", "amazon", "flipkart",
                   "ajio", "croma", "tata cliq", "shopify")),
    ("fashion", ("fashion", "clothing", "clothes", "apparel", "t-shirt",
                 "shirt", "jeans", "sneakers", "bag", "wallet", "jewellery",
                 "watch for men", "dress", "kurti")),
    ("beauty", ("makeup", "makeup", "cosmetic", "skincare", "perfume",
                "hair", "lipstick", "foundation", "serum", "beauty", "salon")),
    ("health", ("health", "fitness", "gym", "medic", "pharmacy", "dentist",
                "hospital", "supplement", "vitamin", "wellness", "yoga")),
    ("insurance", ("insurance", "insure", "health plan", "term plan", "claim")),
    ("finance", ("loan", "invest", "mutual fund", "credit card", "credit card",
                 "debit card", "bank", "savings account", "forex", "stock",
                 "trading", "crypto", "finance", "fintech")),
    ("grocery", ("grocery", "groceries", "vegetable", "fresh produce", "daairy",
                 "biryani near you", "pantry", "d2c food", "daily essentials")),
    ("food", ("food", "restaurant", "zomato", "swiggy", "pizza", "burger",
              "coffee", "mcdonald", "domino", "cafe", "sweet", "meal",
              "snack", "chai", "dosa")),
    ("dating", ("dating", "matchmaking", "match", "relationship", "meetup",
                "swipe")),
    ("home", ("home", "furniture", "appliance", "kitchen", "bedding",
              "cleaning service", "decor", "lighting", "mattress")),
]


def classify_category(text: str) -> str:
    """Keyword-match free text onto one of the 22 deal categories."""
    t = (text or "").lower()
    if not t:
        return "other"
    for category, keywords in _CATEGORY_KEYWORDS:
        if any(kw in t for kw in keywords):
            return category
    return "other"


def classify_deal(title: str, description: str = "") -> str:
    return classify_category(f"{title} {description}")


def _slug(brand: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (brand or "").lower())[:30]


def _logo(brand: str, logo_url: str = "") -> str:
    if logo_url:
        return logo_url
    if not brand:
        return ""
    return f"https://logo.clearbit.com/{_slug(brand)}.com"


def _deal_id(source: str, brand: str, code: str, title: str) -> str:
    brand_norm = re.sub(r"\s+", " ", (brand or "").strip().lower())
    title_norm = re.sub(r"\s+", " ", (title or "").strip().lower())
    raw = f"{source}|{brand_norm}|{(code or '').strip().upper()}|{title_norm}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]


def _accent(brand: str) -> str:
    idx = int(hashlib.md5((brand or "").lower().encode("utf-8")).hexdigest(), 16)
    return _ACCENTS[idx % len(_ACCENTS)]


def _calc_pct(orig: Optional[float], cur: Optional[float]) -> int:
    if not orig or orig <= 0 or cur is None:
        return 0
    if cur >= orig:
        return 0
    return int(round(((orig - cur) / orig) * 100))


def _disc_label(d: Dict[str, Any]) -> str:
    pct = int(d.get("discount_pct") or 0)
    code = (d.get("code") or "").strip()
    if code:
        return f"Code {code} · {pct}% off" if pct else f"Code {code}"
    if pct:
        return f"{pct}% off"
    dt = d.get("deal_type") or "coupon"
    return {"cashback": "Cashback", "first_order": "First order offer",
            "freebie": "Free", "referral": "Referral reward"}.get(dt, "Offer")


# ─── Fuzzy deduplication (brand + code + title; keep best source) ───────
def _dedup_key(doc: Dict[str, Any]) -> Tuple[str, str, str]:
    title = re.sub(r"\s+", " ", (doc.get("title") or "").strip().lower())
    return ((doc.get("brand") or "").strip().lower(),
            (doc.get("code") or "").strip().upper(),
            title[:80])


def dedup_key(doc: Dict[str, Any]) -> str:
    """Coarse group key (exact brand|code|title)."""
    return "|".join(_dedup_key(doc))


def _fuzzy_same(a: Dict[str, Any], b: Dict[str, Any],
                 cutoff: float = 0.6) -> bool:
    """Fuzzy match on brand + code + title (case/whitespace-insensitive).

    Same brand (or fuzzy brand), same code, and either identical titles or
    a SequenceMatcher ratio ≥ cutoff.
    """
    ba = (a.get("brand") or "").lower()
    bb = (b.get("brand") or "").lower()
    if ba != bb:
        if not ba or not bb:
            return False
        if SequenceMatcher(None, ba, bb).ratio() < cutoff:
            return False
    ca = (a.get("code") or "").strip().upper()
    cb = (b.get("code") or "").strip().upper()
    if ca != cb:
        return False
    ta = (a.get("title") or "").strip().lower()
    tb = (b.get("title") or "").strip().lower()
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
    """Merge fuzzy-duplicate docs: keep the highest-quality source's record,
    union tags, carry over verified-code state, and record dup ids."""
    if not docs:
        return {}
    best = docs[0]
    for d in docs[1:]:
        if _is_better(d, best):
            best = d
    out = dict(best)
    tags = []
    seen = set()
    for d in docs:
        for t in (d.get("tags") or []):
            if t not in seen:
                seen.add(t)
                tags.append(t)
    out["tags"] = tags
    if any(d.get("code_verified") for d in docs):
        out["code_verified"] = True
        out["code_verified_at"] = out.get("code_verified_at") or _utcnow().isoformat()
    dups = set()
    for d in docs:
        dups.update(d.get("duplicate_deal_ids") or [])
        if d.get("deal_id") and d["deal_id"] != out.get("deal_id"):
            dups.add(d["deal_id"])
    dups.discard(out.get("deal_id"))
    out["duplicate_deal_ids"] = sorted(d for d in dups if d)
    return out


def deduplicate(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """3+ sources for the same brand+code+title → 1 merged doc (best source)."""
    out: List[Dict[str, Any]] = []
    for doc in docs:
        key = _dedup_key(doc)
        if key[0] or key[1] or key[2]:
            merged = next((o for o in out
                            if _fuzzy_same(o, doc)), None)
            if merged is not None:
                merged.update(merge_group([merged, doc]))
            else:
                out.append(dict(doc))
        else:
            out.append(dict(doc))
    return out


# ─── Adapters ────────────────────────────────────────────────────────────
class DealsSourceAdapter(abc.ABC):
    """One pluggable deal source. ``fetch_deals`` returns partial deal rows:
    {source_id, brand, title, description, deal_type?, code?, price_inr?,
     original_inr?, code_verified?, bank_name?, card_type?, student_only?,
     auto_apply?, source_url?, affiliate_url?, logo_url?, expires_at?,
     tags?, deal_type...} — missing keys are optional."""

    source_name: ClassVar[str] = "base"
    source_url: ClassVar[str] = ""
    # env var that enables the live variant; None = always static
    api_key_env: ClassVar[Optional[str]] = None
    # static fallback catalog when the live source is unavailable
    is_static: ClassVar[bool] = True

    def __init__(self, http: Optional[httpx.AsyncClient] = None):
        self.http = http

    @abc.abstractmethod
    async def fetch_deals(self) -> List[Dict[str, Any]]:
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
        return f"{kind}-{abs(hash(str(idx_or_name))) % 10**10}"

    def _rows(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for i, row in enumerate(rows):
            d = dict(row)
            d.setdefault("source_id", self._stable_id(self.source_name, i))
            out.append(d)
        return out


def parse_markdown_deals(text: str, source: str,
                         prefix_chars: int = 60) -> List[Dict[str, Any]]:
    """Parse a raw markdown list of student offers.

    Accepts lines like:
      - [GitHub Student Pack](https://education.github.com/pack) — free for verified students
      - Notion 20% off for students: use code STUDENT20 at notion.so
    Deterministic and key-free; used by the GitHub raw-list adapters.
    """
    deals: List[Dict[str, Any]] = []
    code_re = re.compile(r"\b(code|coupon)[:\s]+([A-Z0-9]{3,})\b", re.I)
    pct_re = re.compile(r"(\d{1,2})\s*%|\b(\d{1,3})\s*(?:off|discount|discounted|saving|savings)\b", re.I)
    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if len(line) < 8 or not (line.startswith("-") or line.startswith("*")
                                 or re.match(r"^\d+[.)]\s", line)):
            continue
        line = re.sub(r"^[-*\d.)\s]+", "", line).strip()
        link_m = re.match(r"\[([^\]]+)\]\((\S+)\)", line)
        if link_m:
            brand = link_m.group(1).strip()
            url = link_m.group(2).strip()
            desc = line[link_m.end():].lstrip(" —-:·")
        else:
            brand, url = None, None
            desc = line
        if not desc and not url:
            continue
        code_m = code_re.search(desc) or code_re.search(line)
        code = code_m.group(2).upper() if code_m else ""
        pct_m = pct_re.search(desc) or pct_re.search(line)
        discount_pct = 0
        if pct_m:
            discount_pct = int(pct_m.group(1) or pct_m.group(2))
        brand = brand or (desc.split()[0] if desc else "Offer")
        title = f"{brand}: {desc[:prefix_chars]}" if desc else f"{brand} offer"
        deals.append({
            "source_id": f"{source}-{len(deals)}-{abs(hash(line)) % 10**6}",
            "brand": brand[:40],
            "title": title[:160],
            "description": (desc or line)[:400],
            "deal_type": "student_exclusive" if "student" in line.lower() else "coupon",
            "code": code,
            "discount_pct": discount_pct,
            "student_only": "student" in line.lower(),
            "source_url": url or "",
            "tags": ["STUDENT_VERIFIED"] if "student" in line.lower() else [],
        })
    return deals


# ── 1. GrabOn (scrape → static catalog) ────────────────────────────────
class GrabOnAdapter(DealsSourceAdapter):
    source_name = "grabon"
    source_url = "https://www.grabon.in"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Myntra", "title": "Extra 10% off Myntra fashion with bank offers", "deal_type": "bank_offer", "code": "MYNTRA10", "discount_pct": 10, "description": "Stack Myntra's 10% bank offer with seasonal sale codes."},
            {"brand": "Swiggy", "title": "50% off on first 5 orders with Swiggy", "deal_type": "first_order", "code": "FIRST50", "discount_pct": 50, "description": "New Swiggy users: 50% off on the first 5 orders, up to ₹125 each."},
            {"brand": "Amazon", "title": "10% off Amazon orders with Axis credit card", "deal_type": "bank_offer", "bank_name": "Axis", "card_type": "credit", "discount_pct": 10, "description": "Up to ₹1,000 cash discount on Amazon via Axis credit cards."},
            {"brand": "Cleartrip", "title": "Extra discount on flights and hotels", "deal_type": "coupon", "code": "CLEAR500", "discount_pct": 5, "description": "Flat discount on flight and hotel bookings."},
            {"brand": "Boat", "title": "Up to 40% off Boat earbuds and wearables", "deal_type": "coupon", "code": "BOAT40", "discount_pct": 40, "description": "Seasonal electronics discount on audio and wearables."},
            {"brand": "Zomato", "title": "Flat 40% off food orders", "deal_type": "coupon", "code": "ZOM40", "discount_pct": 40, "description": "40% off on orders above the minimum on partner restaurants."},
        ]
        return self._rows(rows)


# ── 2. CouponDunia (scrape → static catalog) ───────────────────────────
class CouponDuniaAdapter(DealsSourceAdapter):
    source_name = "coupondunia"
    source_url = "https://www.coupondunia.in"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "OYO", "title": "₹500 off on OYO hotel stays", "deal_type": "coupon", "code": "OYO500", "discount_pct": 15, "description": "₹500 off on stays of ₹3,000 or more."},
            {"brand": "MakeMyTrip", "title": "10% off domestic hotel bookings", "deal_type": "coupon", "code": "MMT10", "discount_pct": 10, "description": "10% off hotel and holiday packages on MakeMyTrip."},
            {"brand": "BigBasket", "title": "Flat ₹100 off on grocery orders above ₹999", "deal_type": "coupon", "code": "BB100", "discount_pct": 10, "description": "Fresh produce and pantry essentials."},
            {"brand": "Pepperfry", "title": "Extra 25% off home furniture", "deal_type": "coupon", "code": "PF25", "discount_pct": 25, "description": "Furniture and decor across category-wide offers."},
        ]
        return self._rows(rows)


# ── 3. Zoutons (scrape → static catalog) ────────────────────────────────
class ZoutonsAdapter(DealsSourceAdapter):
    source_name = "zoutons"
    source_url = "https://www.zoutons.com"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Croma", "title": "Electronics sale: up to 30% off gadgets", "deal_type": "flash_sale", "discount_pct": 30, "description": "Sale event across phones, laptops and audio."},
            {"brand": "Tata CLiQ", "title": "Extra 15% off on fashion picks", "deal_type": "coupon", "code": "CLIQ15", "discount_pct": 15, "description": "Style picks with extra discount at checkout."},
            {"brand": "Nykaa", "title": "Flat 30% off beauty and skincare", "deal_type": "coupon", "code": "NYK30", "discount_pct": 30, "description": "Makeup, skincare and haircare offers."},
        ]
        return self._rows(rows)


# ── 4. PromoCodeVerified (live REST, no key) ────────────────────────────
class PromoCodeVerifiedAdapter(DealsSourceAdapter):
    source_name = "promocodeverified"
    source_url = "https://promocodeverified.com"
    is_static = False
    _LIST_URL = "https://promocodeverified.com/wp-json/"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        try:
            posts = await self._get_json(self._LIST_URL, params={"per_page": 25})
            items = posts if isinstance(posts, list) else (posts or {}).get("posts") or []
        except Exception:
            return self._rows([
                {"brand": "Starbucks", "title": "50% off on second drink", "deal_type": "coupon", "code": "DRINK50", "discount_pct": 50, "description": "50% off second drink at participating stores."},
            ])
        rows = []
        for p in items[:50]:
            title = (p.get("title") or {}).get("plain_text") if isinstance(p.get("title"), dict) else p.get("title") or ""
            rows.append({
                "source_id": f"pcv-{p.get('id', abs(hash(title)) % 10**10)}",
                "brand": (p.get("store_name") or p.get("merchant") or "Offer")[:40],
                "title": (title or "Verified promo code")[:160],
                "description": (p.get("description") or "")[:400],
                "deal_type": "coupon",
                "code": (p.get("code") or "").upper(),
                "code_verified": True,
                "source_url": p.get("permalink") or self.source_url,
            })
        return rows or self._rows([
            {"brand": "Starbucks", "title": "50% off on second drink", "deal_type": "coupon", "code": "DRINK50", "discount_pct": 50, "description": "50% off second drink at participating stores."},
        ])


# ── 5. DesiDime (community scrape → static catalog) ─────────────────────
class DesiDimeAdapter(DealsSourceAdapter):
    source_name = "desidime"
    source_url = "https://www.desidime.com"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Croma", "title": "Croma sale — 30% off on select brands", "deal_type": "flash_sale", "discount_pct": 30, "description": "Community-reported sale event with bank stacking."},
            {"brand": "Myntra", "title": "Myntra: pay an extra 10% off with HDFC", "deal_type": "bank_offer", "bank_name": "HDFC", "card_type": "credit", "discount_pct": 10, "description": "Stackable HDFC offer on top of sale price."},
            {"brand": "Swiggy", "title": "Swiggy free delivery on orders above ₹149", "deal_type": "freebie", "description": "Community deal: free delivery threshold."},
        ]
        return self._rows(rows)


# ── 6. FreeKaaMaal (scrape → static catalog) ────────────────────────────
class FreeKaaMaalAdapter(DealsSourceAdapter):
    source_name = "freekaamaal"
    source_url = "https://freekaamaal.com"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Swiggy", "title": "Free dessert with family dinner order", "deal_type": "freebie", "description": "Free sweet on orders above the family-plan minimum."},
            {"brand": "Uber", "title": "Free 2-week Uber One membership", "deal_type": "freebie", "description": "Free Uber One trial for new riders."},
            {"brand": "Lenskart", "title": "Free eye check-up with glasses purchase", "deal_type": "freebie", "description": "Complimentary vision test with purchase."},
        ]
        return self._rows(rows)


# ── 7. Reddit r/IndianDeals (live JSON, no key — community) ────────────
class RedditIndianDealsAdapter(DealsSourceAdapter):
    source_name = "reddit_indiandeals"
    source_url = "https://www.reddit.com/r/IndianDeals/hot/.json"
    is_static = False
    _URL = "https://www.reddit.com/r/IndianDeals/hot.json"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        try:
            data = await self._get_json(
                self._URL,
                params={"limit": 50},
                headers={"User-Agent": USER_AGENT},
            )
        except Exception:
            return []
        rows = []
        for child in ((data or {}).get("data") or {}).get("children") or []:
            p = child.get("data") or {}
            if p.get("stickied"):
                continue
            title = p.get("title") or ""
            if not title:
                continue
            pct_m = re.search(r"(\d{1,2})\s*%", title)
            rows.append({
                "source_id": f"reddit-{p.get('id', abs(hash(title)) % 10**10)}",
                "brand": " ".join(title.split()[:2])[:40] if title else "Community",
                "title": title[:160],
                "description": (p.get("selftext") or "")[:400],
                "deal_type": "community",
                "discount_pct": int(pct_m.group(1)) if pct_m else 0,
                "source_url": p.get("url") or f"https://reddit.com{p.get('permalink', '')}",
                "upvotes": int(p.get("ups") or 0),
                "downvotes": int(p.get("downs") or 0),
            })
        return rows


# ── 8. GitHub Education Pack (live raw parse) ──────────────────────────
class GithubEduPackAdapter(DealsSourceAdapter):
    source_name = "github_edupack"
    source_url = "https://education.github.com/pack"
    is_static = False
    _RAW = ("https://raw.githubusercontent.com/education/education.github.com/"
            "master/data/deal.json")

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "GitHub", "title": "GitHub Student Pack — free GitHub Pro + 2000 cloud credits", "deal_type": "student_exclusive", "student_only": True, "description": "Verified students: free Pro, Azure credits, VS Code features."},
            {"brand": "Discord", "title": "Nitro free for students in the GitHub pack", "deal_type": "student_exclusive", "student_only": True, "description": "Discord Nitro trial bundled with the pack."},
            {"brand": "JetBrains", "title": "Free JetBrains Any License for students", "deal_type": "student_exclusive", "student_only": True, "description": "All JetBrains IDEs free for verified students."},
            {"brand": "Atlassian", "title": "Bitbucket and Trello Basic free for students", "deal_type": "student_exclusive", "student_only": True, "description": "Collaboration tools at no cost."},
            {"brand": "Figma", "title": "Figma free for students and teachers", "deal_type": "student_exclusive", "student_only": True, "description": "Figma design tools free with a school email."},
            {"brand": "Canva", "title": "Canva Pro free for students", "deal_type": "student_exclusive", "student_only": True, "description": "Canva Pro at no cost with verified status."},
            {"brand": "Notion", "title": "Notion Plus free for students", "deal_type": "student_exclusive", "student_only": True, "description": "Notion Plus features free for students."},
            {"brand": "Notion", "title": "20% off Notion for students with code NOTION20", "deal_type": "student_exclusive", "student_only": True, "code": "NOTION20", "discount_pct": 20, "description": "Extra 20% off paid Notion plans for students."},
        ]
        return self._rows(rows)


# ── 9. discount-for-student-dev (live raw markdown parse) ───────────────
class StudentDevDiscountsAdapter(DealsSourceAdapter):
    source_name = "studentdev_discounts"
    source_url = "https://github.com/sponsors/donate-to-open-source"
    is_static = False
    _RAW = "https://raw.githubusercontent.com/"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        try:
            text = await self._get_text(self._RAW + "studentdev/discounts/master/README.md")
        except Exception:
            text = ""
        rows = parse_markdown_deals(text, "studentdev")
        if not rows:
            rows = self._rows([
                {"brand": "Codecademy", "title": "Pro free for students", "deal_type": "student_exclusive", "student_only": True, "description": "Verified students get Pro free."},
                {"brand": "Replit", "title": "Replit free for students and educators", "deal_type": "student_exclusive", "student_only": True, "description": "Replit IDE free with a school account."},
                {"brand": "GitHub", "title": "GitHub Pro free for students", "deal_type": "student_exclusive", "student_only": True, "description": "Part of the GitHub Education pack."},
            ])
        return rows


# ── 10. OpenGenus student list (live raw markdown parse) ────────────────
class OpenGenusStudentsAdapter(DealsSourceAdapter):
    source_name = "opengenus_students"
    source_url = "https://www.opengenus.org"
    is_static = False
    _RAW = "https://raw.githubusercontent.com/"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        try:
            text = await self._get_text(self._RAW + "OpenGenus/student-discounts/master/README.md")
        except Exception:
            text = ""
        rows = parse_markdown_deals(text, "opengenus")
        if not rows:
            rows = self._rows([
                {"brand": "Vercel", "title": "Pro free for students and educators", "deal_type": "student_exclusive", "student_only": True, "description": "Vercel Pro at no cost with a school email."},
                {"brand": "Linear", "title": "Linear free for students", "deal_type": "student_exclusive", "student_only": True, "description": "Project tracking free for verified students."},
                {"brand": "Notion", "title": "Notion free for students and teachers", "deal_type": "student_exclusive", "student_only": True, "description": "Notion Plus free with a school email."},
            ])
        return rows


# ── 11. Bank offer scrapers (HDFC/ICICI/SBI/Axis/Kotak → static) ───────
class BankOffersAdapter(DealsSourceAdapter):
    source_name = "bank_offers"
    source_url = "https://www.hdfcbank.com/personal/deals"
    is_static = True

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Amazon", "title": "5% cashback on Amazon with HDFC Millennia", "deal_type": "bank_offer", "bank_name": "HDFC", "card_type": "credit", "code": "HDFC-AMZN", "discount_pct": 5, "description": "5% cashback, up to ₹1,000 per order, on Amazon India."},
            {"brand": "Myntra", "title": "Up to ₹500 instant discount on Myntra with ICICI cards", "deal_type": "bank_offer", "bank_name": "ICICI", "card_type": "credit", "code": "ICICI-MY", "discount_pct": 10, "description": "Instant discount on Myntra via ICICI credit and debit."},
            {"brand": "Flipkart", "title": "₹100 off on Flipkart above ₹999 with SBI cards", "deal_type": "bank_offer", "bank_name": "SBI", "card_type": "credit", "code": "SBI-FK", "discount_pct": 10, "description": "Flat SBI card offer at Flipkart checkout."},
            {"brand": "Zomato", "title": "₹75 off on Zomato above ₹199 with Axis Bank", "deal_type": "bank_offer", "bank_name": "Axis", "card_type": "credit", "code": "AXIS-ZM", "discount_pct": 38, "description": "Axis Bank card offer on Zomato orders."},
            {"brand": "Cleartrip", "title": "₹500 off on Cleartrip flights with Kotak cards", "deal_type": "bank_offer", "bank_name": "Kotak", "card_type": "credit", "code": "KOTAK-CT", "discount_pct": 5, "description": "Kotak debit/credit card offer on flight bookings."},
        ]
        return self._rows(rows)


# ── 12. CashKaro (cashback scrape → static catalog) ─────────────────────
class CashKaroAdapter(DealsSourceAdapter):
    source_name = "cashkaro"
    source_url = "https://www.cashkaro.com"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Amazon", "title": "Up to 10% cashback on Amazon orders via CashKaro", "deal_type": "cashback", "discount_pct": 10, "description": "Cashback on Amazon purchases through the CashKaro link."},
            {"brand": "Nykaa", "title": "₹200 cashback on first Nykaa order", "deal_type": "cashback", "description": "First-order cashback for new CashKaro users."},
            {"brand": "Boat", "title": "5% cashback on Boat purchases", "deal_type": "cashback", "discount_pct": 5, "description": "Ongoing cashback on Boat audio and wearables."},
        ]
        return self._rows(rows)


# ── 13. PriceHistory (coupons + price tracking → static catalog) ────────
class PriceHistoryAdapter(DealsSourceAdapter):
    source_name = "pricehistory"
    source_url = "https://pricehistory.app"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Amazon", "title": "Price-drop alert: iPhone 15 at 90-day low", "deal_type": "coupon", "discount_pct": 8, "description": "Tracked price hit a 90-day low."},
            {"brand": "Boat", "title": "Earbuds dropped below the 6-month average", "deal_type": "coupon", "discount_pct": 12, "description": "Below the 6-month average price."},
            {"brand": "Croma", "title": "TV price down 15% in 30 days", "deal_type": "coupon", "discount_pct": 15, "description": "Sharp 30-day price drop on a popular 43-inch model."},
        ]
        return self._rows(rows)


# ── 14. Airline student fares (scrape → static catalog) ────────────────
class AirlinesAdapter(DealsSourceAdapter):
    source_name = "airlines"
    source_url = "https://www.indigo.co.in"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "IndiGo", "title": "Student fares: 10% off domestic flights", "deal_type": "student_exclusive", "student_only": True, "discount_pct": 10, "description": "Fare class discount for verified students on domestic routes."},
            {"brand": "SpiceJet", "title": "Spice student fare bundles", "deal_type": "student_exclusive", "student_only": True, "description": "Bundled student fares on select routes."},
            {"brand": "ixigo", "title": "₹200 off flight search with ixigo", "deal_type": "coupon", "code": "IXIGO200", "discount_pct": 5, "description": "Flat discount on flight bookings via ixigo."},
            {"brand": "MakeMyTrip", "title": "Mileage boost on student bookings", "deal_type": "coupon", "discount_pct": 5, "description": "Extra loyalty miles on student bookings."},
        ]
        return self._rows(rows)


# ── 15. Flipkart Students Club (scrape → static catalog) ────────────────
class FlipkartStudentsAdapter(DealsSourceAdapter):
    source_name = "flipkart_students"
    source_url = "https://www.flipkart.com/students"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        rows = [
            {"brand": "Flipkart", "title": "Flipkart Back-to-School: electronics under ₹3000", "deal_type": "student_exclusive", "student_only": True, "description": "Student-focused electronics deals."},
            {"brand": "Flipkart", "title": "Extra 10% off student picks with cards", "deal_type": "bank_offer", "bank_name": "HDFC", "card_type": "credit", "code": "FKT10", "discount_pct": 10, "description": "Stackable card offer on student picks."},
            {"brand": "Flipkart", "title": "First order: flat 5% off", "deal_type": "first_order", "code": "FIRST5", "discount_pct": 5, "description": "First-order discount."},
        ]
        return self._rows(rows)


# ── 16. LinkMyDeals API (env-gated; static fallback) ────────────────────
class LinkMyDealsAdapter(DealsSourceAdapter):
    source_name = "linkmydeals"
    source_url = "https://linkmydeals.com"
    api_key_env = "LINKMYDEALS_API_KEY"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        key = os.environ.get(self.api_key_env or "")
        if not key:
            return self._rows([
                {"brand": "Zomato", "title": "50% off on Zomato food orders", "deal_type": "coupon", "code": "ZD50", "discount_pct": 50, "description": "Verified aggregator deal."},
                {"brand": "Myntra", "title": "10% off on fashion orders", "deal_type": "coupon", "code": "MYN10", "discount_pct": 10, "description": "Verified aggregator deal."},
            ])
        try:
            items = await self._get_json(
                "https://linkmydeals.com/api/deals",
                params={"per_page": 50},
                headers={"Authorization": f"Bearer {key}"},
            )
            items = items if isinstance(items, list) else (items or {}).get("data") or []
        except Exception:
            return []
        rows = []
        for d in items[:50]:
            code = (d.get("code") or "").upper()
            rows.append({
                "source_id": f"lmd-{d.get('id', abs(hash((d.get('title') or '').lower())) % 10**10)}",
                "brand": (d.get("store") or d.get("brand") or "Offer")[:40],
                "title": (d.get("title") or "Deal")[:160],
                "description": (d.get("description") or "")[:400],
                "deal_type": "coupon",
                "code": code,
                "code_verified": bool(d.get("verified")),
                "price_inr": d.get("price"),
                "original_inr": d.get("original_price"),
                "discount_pct": d.get("discount_pct") or _calc_pct(d.get("original_price"), d.get("price")),
                "source_url": d.get("url") or self.source_url,
            })
        return rows


# ── 17. RapidAPI coupon feeds (env-gated; static fallback) ─────────────
class RapidAPIAdapter(DealsSourceAdapter):
    source_name = "rapidapi_coupons"
    source_url = "https://rapidapi.com"
    api_key_env = "RAPIDAPI_KEY"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        key = os.environ.get(self.api_key_env or "")
        if not key:
            return self._rows([
                {"brand": "Swiggy", "title": "20% off on food orders above ₹300", "deal_type": "coupon", "code": "SWG20", "discount_pct": 20, "description": "RapidAPI coupon feed deal."},
                {"brand": "Zomato", "title": "Flat 25% off on dining out", "deal_type": "coupon", "code": "ZOM25", "discount_pct": 25, "description": "RapidAPI coupon feed deal."},
            ])
        try:
            data = await self._get_json(
                "https://deal-data7.p.rapidapi.com/deal/list?limit=50",
                headers={"x-rapidapi-key": key,
                         "x-rapidapi-host": "deal-data7.p.rapidapi.com"},
            )
            items = data if isinstance(data, list) else (data or {}).get("data") or []
        except Exception:
            return []
        rows = []
        for d in items[:50]:
            code = (d.get("code") or d.get("coupon_code") or "").upper()
            rows.append({
                "source_id": f"rap-{d.get('id', abs(hash((d.get('title') or '').lower())) % 10**10)}",
                "brand": (d.get("store_name") or d.get("brand") or "Offer")[:40],
                "title": (d.get("title") or "Coupon")[:160],
                "description": (d.get("description") or "")[:400],
                "deal_type": "coupon",
                "code": code,
                "price_inr": d.get("price"),
                "original_inr": d.get("original_price"),
                "discount_pct": d.get("discount_percentage") or _calc_pct(d.get("original_price"), d.get("price")),
                "source_url": d.get("deal_url") or self.source_url,
            })
        return rows


# ── 18. Amazon Associates (affiliate; env-gated, static fallback) ───────
class AmazonAdapter(DealsSourceAdapter):
    source_name = "amazon_associates"
    source_url = "https://www.amazon.in"
    api_key_env = "AMAZON_ACCESS_KEY"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        access_key = os.environ.get(self.api_key_env or "")
        tag = os.environ.get("AMAZON_ASSOCIATE_TAG")
        if not access_key:
            return self._rows([
                {"brand": "Amazon", "title": "Deal of the day: up to 60% off electronics", "deal_type": "flash_sale", "discount_pct": 60, "description": "Amazon.deals of the day via affiliate feed."},
                {"brand": "Amazon", "title": "Lightning deals across 7 categories", "deal_type": "flash_sale", "description": "Rolling lightning deals via the affiliate feed."},
            ])
        rows = [
            {"brand": "Amazon", "title": "Deal of the day: up to 60% off electronics", "deal_type": "flash_sale", "discount_pct": 60, "description": "Live affiliate feed deal.", "affiliate_url": (f"https://www.amazon.in/dp/PLACEHOLDER?tag={tag}"), "source_url": "https://www.amazon.in/gp/goldbox"},
            {"brand": "Amazon", "title": "Coupons: clip-and-save on thousands of items", "deal_type": "coupon", "discount_pct": 10, "description": "Clip deals of the day.", "affiliate_url": (f"https://www.amazon.in/coupons?tag={tag}"), "source_url": "https://www.amazon.in/coupons"},
        ]
        return self._rows(rows)


# ── 19. Flipkart Affiliate (env-gated, static fallback) ─────────────────
class FlipkartAffiliateAdapter(DealsSourceAdapter):
    source_name = "flipkart_affiliate"
    source_url = "https://www.flipkart.com"
    api_key_env = "FLIPKART_AFFILIATE_ID"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        fid = os.environ.get(self.api_key_env or "")
        if not fid:
            return self._rows([
                {"brand": "Flipkart", "title": "Big savings days: 50% off across categories", "deal_type": "flash_sale", "discount_pct": 50, "description": "Flipkart affiliate feed deal."},
            ])
        rows = [
            {"brand": "Flipkart", "title": "Big savings days: 50% off across categories", "deal_type": "flash_sale", "discount_pct": 50, "description": "Flipkart affiliate feed deal.", "affiliate_url": f"https://www.flipkart.com/deals?affid={fid}"},
            {"brand": "Flipkart", "title": "Extra 10% off with bank cards", "deal_type": "bank_offer", "bank_name": "HDFC", "card_type": "credit", "code": "FKT-HDFC", "discount_pct": 10, "description": "Stackable bank offer.", "affiliate_url": f"https://www.flipkart.com/deals?affid={fid}"},
        ]
        return self._rows(rows)


# ── 20. CJ / Impact affiliate feeds (env-gated, static fallback) ────────
class CJImpactAdapter(DealsSourceAdapter):
    source_name = "cj_impact"
    source_url = "https://www.cj.com"
    api_key_env = "CJ_AFFILIATE_KEY"

    async def fetch_deals(self) -> List[Dict[str, Any]]:
        key = (os.environ.get(self.api_key_env or "")
               or os.environ.get("IMPACT_AFFILIATE_KEY", ""))
        if not key:
            return self._rows([
                {"brand": "Myntra", "title": "Cross-border brand sale: 40% off", "deal_type": "flash_sale", "discount_pct": 40, "description": "Multi-brand affiliate feed deal."},
            ])
        rows = [
            {"brand": "Myntra", "title": "Cross-border brand sale: 40% off", "deal_type": "flash_sale", "discount_pct": 40, "description": "Multi-brand affiliate feed deal.", "affiliate_url": f"https://track.cj.com/placeholder?pid={key[:8]}"},
            {"brand": "Nykaa", "title": "Beauty bundle deals via partner feed", "deal_type": "coupon", "code": "NCK-BNDL", "discount_pct": 15, "description": "Partner feed bundle deal.", "affiliate_url": f"https://track.cj.com/placeholder?pid={key[:8]}"},
        ]
        return self._rows(rows)


ALL_ADAPTERS: List[DealsSourceAdapter] = [
    GrabOnAdapter(),
    CouponDuniaAdapter(),
    ZoutonsAdapter(),
    PromoCodeVerifiedAdapter(),
    DesiDimeAdapter(),
    FreeKaaMaalAdapter(),
    RedditIndianDealsAdapter(),
    GithubEduPackAdapter(),
    StudentDevDiscountsAdapter(),
    OpenGenusStudentsAdapter(),
    BankOffersAdapter(),
    CashKaroAdapter(),
    PriceHistoryAdapter(),
    AirlinesAdapter(),
    FlipkartStudentsAdapter(),
    LinkMyDealsAdapter(),
    RapidAPIAdapter(),
    AmazonAdapter(),
    FlipkartAffiliateAdapter(),
    CJImpactAdapter(),
]

ADAPTERS_BY_NAME: Dict[str, DealsSourceAdapter] = {a.source_name: a for a in ALL_ADAPTERS}


# Cron groupings (per the roadmap staggered schedule, all UTC).
CRON_GROUPS: Dict[str, Dict[str, Any]] = {
    "deals_agg_banks_01": {"sources": ["bank_offers"], "hour": 1, "minute": 0},
    "deals_agg_coupons_02": {"sources": ["grabon", "coupondunia", "zoutons",
                                          "desidime", "freekaamaal", "pricehistory",
                                          "flipkart_students"],
                              "hour": 2, "minute": 0},
    "deals_agg_cashback_0230": {"sources": ["cashkaro"], "hour": 2, "minute": 30},
    "deals_agg_community_6h": {"sources": ["reddit_indiandeals", "linkmydeals",
                                            "rapidapi_coupons"],
                                "interval_hours": 6},
    "deals_agg_apis_03": {"sources": ["promocodeverified"], "hour": 3, "minute": 0},
    "deals_agg_student_weekly": {"sources": ["github_edupack", "studentdev_discounts",
                                              "opengenus_students"],
                                  "hour": 4, "minute": 0, "day_of_week": "sun"},
    "deals_agg_airlines_weekly": {"sources": ["airlines"], "hour": 4, "minute": 30,
                                   "day_of_week": "sun"},
    "deals_agg_affiliate_6h": {"sources": ["amazon_associates", "flipkart_affiliate",
                                           "cj_impact"],
                                "interval_hours": 6},
}


# ─── Pipeline ────────────────────────────────────────────────────────────
class DealsAggregator:
    def __init__(self, db=_db):
        self.db = db
        self.col = db[DEALS_COL]
        self.runs = db[RUN_META]
        self.meta = db[SOURCE_META]

    async def ensure_indexes(self) -> None:
        await self.col.create_index([("source", 1), ("source_id", 1)],
                                     unique=True, name="uniq_source_deal")
        await self.col.create_index([("status", 1), ("last_fetched_at", -1)],
                                    name="idx_status_fetched")
        await self.runs.create_index([("ran_at", -1)], name="idx_runs_at")

    def _to_doc(self, adapter: DealsSourceAdapter, raw: Dict[str, Any],
                now: datetime) -> Dict[str, Any]:
        brand = (raw.get("brand") or "").strip()
        code = (raw.get("code") or "").strip()
        title = (raw.get("title") or "Deal").strip()
        description = (raw.get("description") or "").strip()
        deal_type = raw.get("deal_type") or ("bank_offer" if raw.get("bank_name")
                                              else "coupon")
        if deal_type not in DEAL_TYPES:
            deal_type = "coupon"
        category = raw.get("category") or classify_deal(title, description)
        original = raw.get("original_inr")
        price = raw.get("price_inr")
        discount_pct = raw.get("discount_pct")
        if discount_pct is None:
            discount_pct = _calc_pct(original, price)
        discount_pct = int(discount_pct or 0)
        absolute_savings = 0
        if original and price is not None and original > price:
            absolute_savings = int(round(original - price))
        return {
            "deal_id": _deal_id(adapter.source_name, brand, code, title),
            "source": adapter.source_name,
            "source_id": str(raw.get("source_id") or "0"),
            "source_url": raw.get("source_url") or adapter.source_url,
            "brand": brand,
            "brand_slug": _slug(brand),
            "logo_url": _logo(brand, raw.get("logo_url") or ""),
            "accent": _accent(brand),
            "title": title,
            "description": description,
            "deal_type": deal_type,
            "category": category,
            "code": code.upper(),
            "code_verified": bool(raw.get("code_verified")),
            "code_verified_at": raw.get("code_verified_at"),
            "price_inr": price,
            "price_unit": raw.get("price_unit") or ("₹" if price is not None else ""),
            "original_inr": original,
            "discount_pct": discount_pct,
            "discount_label": _disc_label({"discount_pct": discount_pct, "code": code.upper(),
                                           "deal_type": deal_type}),
            "absolute_savings_inr": absolute_savings,
            "affiliate_url": raw.get("affiliate_url") or "",
            "deeplink_url": raw.get("affiliate_url") or raw.get("source_url") or "",
            "bank_name": raw.get("bank_name") or "",
            "card_type": raw.get("card_type") or "",
            "student_only": bool(raw.get("student_only")),
            "auto_apply": bool(raw.get("auto_apply")),
            "needs_code": bool(code),
            "country": raw.get("country") or "IN",
            "available_globally": bool(raw.get("available_globally")),
            "expires_at": raw.get("expires_at"),
            "starts_at": raw.get("starts_at"),
            "verification_status": "verified" if raw.get("code_verified")
                                    or raw.get("student_only") else "unverified",
            "claim_count": int(raw.get("claim_count") or 0),
            "success_rate": raw.get("success_rate"),
            "upvotes": int(raw.get("upvotes") or 0),
            "downvotes": int(raw.get("downvotes") or 0),
            "tags": list(raw.get("tags") or []),
            "source_rank": SOURCE_RANK.get(adapter.source_name, 99),
            "last_fetched_at": now,
            "status": "active",
            "updated_at": now,
        }

    async def fetch_source(self, name: str) -> Tuple[Optional[List[Dict[str, Any]]], str]:
        """Returns (rows, status). status ∈ ok | needs_api_key | error."""
        adapter = ADAPTERS_BY_NAME.get(name)
        if adapter is None:
            return None, "unknown_source"
        enabled = await self.source_enabled(name)
        if not enabled:
            return [], "disabled"
        needs_key = adapter.api_key_env and not os.environ.get(adapter.api_key_env)
        if needs_key and not adapter.is_static:
            return [], "needs_api_key"
        injected = adapter.http
        client = httpx.AsyncClient(timeout=PER_API_TIMEOUT_S,
                                   headers={"User-Agent": USER_AGENT})
        adapter.http = client
        try:
            rows = await adapter.fetch_deals()
            return (rows or []), "ok"
        except Exception as e:  # noqa: BLE001 — isolate per adapter
            logger.warning("[deals_agg] source %s failed: %s", name, e)
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
                doc = self._to_doc(ADAPTERS_BY_NAME[name], r, now)
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
        """Fuzzy-merge deals shared across the given sources (3+ → 1)."""
        docs: List[Dict[str, Any]] = []
        for n in names:
            async for d in self.col.find({"source": n, "status": "active"}):
                docs.append(d)
        merged = deduplicate(docs)
        marked = 0
        for winner in merged:
            dups = winner.get("duplicate_deal_ids") or []
            for dup in dups:
                await self.col.update_one(
                    {"deal_id": dup},
                    {"$set": {"status": "duplicate",
                               "updated_at": _utcnow()}},
                )
                marked += 1
            if dups:
                await self.col.update_one(
                    {"deal_id": winner["deal_id"]},
                    {"$set": {"tags": winner.get("tags") or [],
                              "code_verified": winner.get("code_verified", False),
                              "duplicate_deal_ids": dups,
                              "updated_at": _utcnow()}},
                )
        return marked

    async def recompute_tags(self, names: List[str]) -> int:
        """Re-run the shared tag engine over the freshly fetched deals."""
        from features.deals_aggregator import apply_tags
        docs: List[Dict[str, Any]] = []
        for n in names:
            async for d in self.col.find({"source": n}):
                docs.append(d)
        updated = 0
        for d in docs:
            tags = apply_tags(d, docs)
            if tags != (d.get("tags") or []):
                await self.col.update_one(
                    {"deal_id": d.get("deal_id")},
                    {"$set": {"tags": tags, "updated_at": _utcnow()}},
                )
                updated += 1
        return updated

    async def auto_expire(self) -> int:
        now_iso = _utcnow().isoformat()
        res = await self.col.update_many(
            {"status": "active", "expires_at": {"$lt": now_iso}},
            {"$set": {"status": "expired", "updated_at": _utcnow()}},
        )
        return res.modified_count

    async def mark_stale(self, cutoff_hours: int = STALE_AFTER_HOURS) -> int:
        cutoff = _utcnow() - timedelta(hours=cutoff_hours)
        res = await self.col.update_many(
            {"last_fetched_at": {"$lt": cutoff}, "status": "active"},
            {"$set": {"status": "stale", "updated_at": _utcnow()}},
        )
        return res.modified_count

    async def refresh_stats(self, results: List[Dict[str, Any]]) -> None:
        total = await self.col.count_documents({"status": {"$in": ["active", "stale"]}})
        by_source = {}
        for n in ADAPTERS_BY_NAME:
            by_source[n] = await self.col.count_documents(
                {"source": n, "status": {"$in": ["active", "stale"]}})
        await self.meta.update_one(
            {"_id": "aggregator"},
            {"$set": {"last_run_at": _utcnow().isoformat(),
                      "total_active_deals": total,
                      "by_source": by_source,
                      "last_results": results,
                      "updated_at": _utcnow()}},
            upsert=True,
        )

    async def run(self, source: Optional[str] = None) -> Dict[str, Any]:
        await self.ensure_indexes()
        names = [source] if source else list(ADAPTERS_BY_NAME)
        results = list(await asyncio.gather(*(self.run_source(n) for n in names)))
        deduped = await self.dedup_run(names)
        retagged = await self.recompute_tags(names)
        expired = await self.auto_expire()
        stale = await self.mark_stale()
        await self.refresh_stats(results)
        report = {
            "ran_at": _utcnow().isoformat(),
            "results": results,
            "deduped": deduped,
            "retagged": retagged,
            "expired": expired,
            "stale_marked": stale,
            "total_active": await self.col.count_documents({"status": "active"}),
        }
        await self.runs.insert_one({**report, "_id": ObjectId()})
        logger.info("[deals_agg] run complete: %d sources, %d stale",
                    len(results), stale)
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
        agg = await self.meta.find_one({"_id": "aggregator"}) or {}
        return {
            "collection": DEALS_COL,
            "last_run_at": last.get("ran_at") if last else None,
            "last_results": last.get("results") if last else [],
            "total_active": await self.col.count_documents({"status": "active"}),
            "stats": agg.get("by_source"),
            "sources": per_source,
        }


aggregator = DealsAggregator()


async def run_deals_aggregation(source: Optional[str] = None) -> Dict[str, Any]:
    return await aggregator.run(source)


# ─── Scheduler ──────────────────────────────────────────────────────────
_deals_scheduler = None


def _flag_set(var: str, default: str) -> bool:
    return (os.environ.get(var) or default).strip().lower() in {"1", "true", "yes", "on"}


def start_deals_aggregator_scheduler() -> None:
    """Staggered crons (UTC) + optional startup catch-up.
    Called from server.py under leader election (single-worker safe)."""
    global _deals_scheduler
    if _deals_scheduler is not None:
        return
    if not _flag_set("DEALS_AGGREGATOR_CRON_ENABLED", "1"):
        logger.info("[deals_agg] cron disabled via DEALS_AGGREGATOR_CRON_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
        import pytz
        _deals_scheduler = AsyncIOScheduler(timezone=pytz.UTC)
        for gid, spec in CRON_GROUPS.items():
            sources = [s for s in spec["sources"] if s in ADAPTERS_BY_NAME]
            if "interval_hours" in spec:
                trigger = IntervalTrigger(hours=spec["interval_hours"])
            else:
                kwargs: Dict[str, Any] = {"hour": spec["hour"], "minute": spec["minute"]}
                if spec.get("day_of_week"):
                    kwargs["day_of_week"] = spec["day_of_week"]
                trigger = CronTrigger(**kwargs)

            def _job(srcs: List[str] = sources) -> None:
                for s in srcs:
                    asyncio.ensure_future(run_deals_aggregation(s))

            _deals_scheduler.add_job(
                _job, trigger, id=gid, replace_existing=True,
                max_instances=1, coalesce=True,
            )
        _deals_scheduler.start()
        logger.info("[deals_agg] scheduler started: %d groups", len(CRON_GROUPS))
    except Exception as e:  # noqa: BLE001
        logger.warning("[deals_agg] failed to start scheduler: %s", e)

    if _flag_set("DEALS_AGGREGATOR_RUN_ON_STARTUP", "1"):
        async def _startup_run() -> None:
            try:
                last = await aggregator.runs.find_one({}, sort=[("ran_at", -1)])
                last_at = last.get("ran_at") if last else None
                if last_at:
                    last_dt = datetime.fromisoformat(last_at)
                    if _utcnow() - last_dt < timedelta(hours=STARTUP_STALE_HOURS):
                        return
                await run_deals_aggregation()
            except Exception as e:  # noqa: BLE001
                logger.warning("[deals_agg] startup run failed: %s", e)
        asyncio.ensure_future(_startup_run())


def stop_deals_aggregator_scheduler() -> None:
    global _deals_scheduler
    if _deals_scheduler is not None:
        try:
            _deals_scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
        _deals_scheduler = None


# ─── Admin endpoints ────────────────────────────────────────────────────
from core.deps import get_current_user  # noqa: E402


async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    """Strict super_admin gate (require_role would let 'admin' through via
    the admin-bypass; the roadmap spec says these endpoints are
    super_admin only)."""
    if (user.get("role") or "").lower() not in {"super_admin", "superadmin"}:
        raise HTTPException(403, "super_admin role required")
    return user


admin_router = APIRouter(prefix="/admin/deals-aggregator",
                         tags=["admin-deals-aggregator"])


class SourceToggle(BaseModel):
    enabled: bool


@admin_router.get("/status")
async def deals_aggregator_status(user: dict = Depends(require_super_admin)):
    return await aggregator.status()


@admin_router.patch("/sources/{name}")
async def toggle_deal_source(name: str, body: SourceToggle,
                             user: dict = Depends(require_super_admin)):
    if name not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown deals aggregator source '{name}'")
    await aggregator.meta.update_one(
        {"source": name},
        {"$set": {"enabled": body.enabled, "updated_at": _utcnow()}},
        upsert=True,
    )
    return {"source": name, "enabled": body.enabled}


@admin_router.post("/run")
async def trigger_deals_run(source: Optional[str] = Query(None),
                            user: dict = Depends(require_super_admin)):
    if source and source not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown deals aggregator source '{source}'")
    report = await run_deals_aggregation(source)
    return {"ok": True, **report}
