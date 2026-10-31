"""
deals_aggregator.py — SA Member Deals real-time aggregator + Tag Engine.

Mirrors the jobs_feed.py pattern:
  - Async parallel fetch from multiple sources via asyncio.gather
  - MongoDB cache (60 min) with manual refresh override
  - Per-source normalizer → unified Deal schema
  - Tag Engine auto-applies HOT, 30+OFF, STUDENT_VERIFIED, INSTANT,
    ENDING_SOON, NEW, TRENDING, INDIA_EXCLUSIVE, NO_EXPIRY, BEST_VALUE
  - INR conversion via free open.er-api.com
  - SA Credits earn-on-claim (+20 per claim, max 3/day per user)

Public endpoints (all under /api):
   GET  /deals/all?category=&country=IN          — aggregated feed
   GET  /deals/stats                              — for AI Savings Advisor
   POST /deals/refresh                            — bypass cache, re-fetch
   POST /deals/claim/{deal_id}                    — record claim, credit user
   POST /deals/ai-generate                        — Claude-generated trending
   GET  /deals/sources                            — list of all sources used
"""
from __future__ import annotations

import os
import re
import json
import uuid
import asyncio
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel



from core.db import db as _db

logger = logging.getLogger("deals_aggregator")
router = APIRouter()

# ─── Config ──────────────────────────────────────────────────────────────
CACHE_TTL_MIN = 60
PER_API_TIMEOUT_S = 8.0
CLAIM_CREDITS = 20            # +20 SA credits per claim
MAX_CLAIMS_PER_DAY = 3
AI_REFRESH_TTL_HRS = 6        # AI hot-deal cache window

# D3 — Crowdsourced verification & auto-expiry thresholds
VERIFICATION_PUSH_DELAY_HRS = 24   # "Did the deal work?" push after a claim
UNRELIABLE_MIN_REPORTS = 5        # <50% worked-rate after 5 reports → UNRELIABLE tag
UNRELIABLE_RATE = 0.50
EXPIRED_MIN_REPORTS = 10          # <20% worked-rate after 10 reports → expired
EXPIRED_RATE = 0.20
STALE_AFTER_DAYS = 30            # no verification reports for 30 days → STALE
USER_AGENT = "StudentAlumniBot/1.0 (+https://studentalumni.in)"

CATEGORIES = ["tech", "food", "learning", "entertainment", "insurance",
              "transport", "travel", "fashion", "grocery"]

TAG_RULES = {
    "HOT":              "Discount ≥ 50% OR expires within 7 days",
    "OFF_30":           "Discount ≥ 30% (and < 50%)",
    "STUDENT_VERIFIED": "Source flagged as student-only / requires .edu",
    "INSTANT":          "No code needed — applied automatically",
    "ENDING_SOON":      "Expires within 48 hours",
    "NEW":              "Added in last 7 days",
    "TRENDING":         "Top 10% by 24h claim count",
    "INDIA_EXCLUSIVE":  "Country=IN and not available globally",
    "NO_EXPIRY":        "Ongoing / no expiry date",
    "BEST_VALUE":       "Top 3 by absolute ₹ savings within its category",
    "UNRELIABLE":       "Community reports <50% worked after 5+ reports (auto-tagged)",
    "STALE":            "No verification reports for 30 days (auto-tagged)",
}

# ─── Helpers ─────────────────────────────────────────────────────────────
def _logo(brand: str) -> str:
    if not brand:
        return ""
    slug = re.sub(r'[^a-z0-9]+', '', brand.lower())[:30]
    return f"https://logo.clearbit.com/{slug}.com"


def _make_id(brand: str, title: str) -> str:
    raw = f"{(brand or '').strip().lower()}|{(title or '').strip().lower()}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]


def _calc_pct(orig: int, cur: int) -> int:
    if not orig or orig <= 0 or cur is None:
        return 0
    if cur >= orig:
        return 0
    return int(round(((orig - cur) / orig) * 100))


def _percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return float(s[f])
    return float(s[f] + (s[c] - s[f]) * (k - f))


# ─── 50+ Curated seed deals (9 categories) ───────────────────────────────
def _curated_deals() -> List[Dict[str, Any]]:
    """Source of truth for the 50+ baseline deals. Inserted once at startup."""
    base = [
        # ── TECH & TOOLS (10) ────────────────────────────────────────
        dict(brand="GitHub", title="GitHub Pro (Free for Students)",
             desc="Private repos, Codespaces, Actions, Copilot — free for verified students.",
             category="tech", price_inr=0, price_unit="per_year",
             original_inr=4000, currency="INR",
             affiliate_url="https://education.github.com/pack",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, logo="https://github.githubassets.com/favicons/favicon-dark.png",
             accent="#E8EAF0"),
        dict(brand="JetBrains", title="JetBrains All Products Pack",
             desc="IntelliJ, PyCharm, WebStorm, DataGrip, Rider — all free for students.",
             category="tech", price_inr=0, price_unit="per_year",
             original_inr=8000, currency="INR",
             affiliate_url="https://www.jetbrains.com/community/education/",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#F97316"),
        dict(brand="Figma", title="Figma Education",
             desc="Full Figma Professional plan — unlimited projects, dev mode, libraries.",
             category="tech", price_inr=0, price_unit="per_year",
             original_inr=6000, currency="INR",
             affiliate_url="https://www.figma.com/education/",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#F24E1E"),
        dict(brand="Notion", title="Notion Education Plan",
             desc="AI add-on, unlimited blocks, team workspaces — free for students.",
             category="tech", price_inr=0, price_unit="per_year",
             original_inr=1600, currency="INR",
             affiliate_url="https://www.notion.so/students",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#FFFFFF"),
        dict(brand="Microsoft", title="Microsoft 365 Education",
             desc="Office apps, 1TB OneDrive, Teams — free with student .edu email.",
             category="tech", price_inr=0, price_unit="per_year",
             original_inr=4900, currency="INR",
             affiliate_url="https://www.microsoft.com/en-in/education/products/office",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#00A4EF"),
        dict(brand="Canva", title="Canva Pro (1 yr free)",
             desc="Premium templates, brand kits, background remover — 1 year free.",
             category="tech", price_inr=0, price_unit="per_year",
             original_inr=3999, currency="INR",
             affiliate_url="https://www.canva.com/edu-signups",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#00C4CC"),
        dict(brand="GitHub Copilot", title="GitHub Copilot for Students",
             desc="AI pair programmer — free Pro tier for verified students.",
             category="tech", price_inr=0, price_unit="per_month",
             original_inr=830, currency="INR",
             affiliate_url="https://education.github.com/pack",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#7C3AED"),
        dict(brand="Vercel", title="Vercel Pro for Students",
             desc="Free Pro plan — collaborator seats, advanced analytics, faster builds.",
             category="tech", price_inr=0, price_unit="per_month",
             original_inr=1660, currency="INR",
             affiliate_url="https://vercel.com/education",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#000000"),
        dict(brand="Postman", title="Postman Student Program",
             desc="Free Postman Team workspace + premium learning paths.",
             category="tech", price_inr=0, price_unit="per_year",
             original_inr=12000, currency="INR",
             affiliate_url="https://www.postman.com/company/student-program/",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#FF6C37"),
        dict(brand="MongoDB", title="MongoDB Atlas Student Pack",
             desc="$50 Atlas credit + free certification voucher for students.",
             category="tech", price_inr=0, price_unit="one_time",
             original_inr=4150, currency="INR",
             affiliate_url="https://www.mongodb.com/students",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#10B981"),

        # ── FOOD & DELIVERY (6) ──────────────────────────────────────
        dict(brand="Swiggy", title="Swiggy One Student",
             desc="Unlimited free delivery + exclusive restaurant offers.",
             category="food", price_inr=99, price_unit="per_month",
             original_inr=299, currency="INR",
             affiliate_url="https://www.swiggy.com/one",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#FC8019",
             code="SWIGGY-SA"),
        dict(brand="Zomato", title="Zomato Gold Student",
             desc="1+1 on food and 20% off. Verified via SA-ID.",
             category="food", price_inr=149, price_unit="per_month",
             original_inr=299, currency="INR",
             affiliate_url="https://www.zomato.com/gold",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#EF4444",
             code="ZOMATO-SA"),
        dict(brand="Domino's", title="Domino's College Combo",
             desc="2 medium pizzas + garlic bread + Pepsi for ₹199 only.",
             category="food", price_inr=199, price_unit="one_time",
             original_inr=499, currency="INR",
             affiliate_url="https://www.dominos.co.in/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#0078AE",
             code="COLLEGE199"),
        dict(brand="McDonald's", title="McDonald's EveryDay Value (BOGO)",
             desc="Buy 1 Get 1 on McSpicy, McChicken — student deal weekdays.",
             category="food", price_inr=149, price_unit="one_time",
             original_inr=298, currency="INR",
             affiliate_url="https://www.mcdelivery.co.in/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#DA291C",
             code="MCD-SA-BOGO"),
        dict(brand="KFC", title="KFC Wow Box Student",
             desc="3pc Hot Wings + Krushers + Fries for ₹179 (regular ₹279).",
             category="food", price_inr=179, price_unit="one_time",
             original_inr=279, currency="INR",
             affiliate_url="https://online.kfc.co.in/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#E4002B",
             code="KFC-WOW179"),
        dict(brand="Dunzo", title="Dunzo Campus Pass",
             desc="Free delivery on groceries, dorm essentials & late-night runs.",
             category="food", price_inr=49, price_unit="per_month",
             original_inr=199, currency="INR",
             affiliate_url="https://www.dunzo.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#1DB954",
             code="DUNZO-SA"),

        # ── LEARNING (7) ─────────────────────────────────────────────
        dict(brand="Coursera", title="Coursera Plus Student",
             desc="7000+ courses, certificates, professional specializations.",
             category="learning", price_inr=1999, price_unit="per_year",
             original_inr=5999, currency="INR",
             affiliate_url="https://www.coursera.org/courseraplus",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#3B82F6",
             code="COURSERA-SA67"),
        dict(brand="Udemy", title="Udemy Course Bundle",
             desc="Top-rated DSA, ML, Web Dev courses — flat ₹499/course.",
             category="learning", price_inr=499, price_unit="per_course",
             original_inr=3499, currency="INR",
             affiliate_url="https://www.udemy.com/",
             student_only=False, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#A435F0",
             code="UDEMY-SA86"),
        dict(brand="edX", title="edX Verified Track Student",
             desc="50% off Verified Certificate from MIT, Harvard, Berkeley & more.",
             category="learning", price_inr=2499, price_unit="per_course",
             original_inr=4999, currency="INR",
             affiliate_url="https://www.edx.org/",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#022B40",
             code="EDX-SA50"),
        dict(brand="DataCamp", title="DataCamp Donates",
             desc="6 months free DataCamp Premium for verified students.",
             category="learning", price_inr=0, price_unit="per_year",
             original_inr=24000, currency="INR",
             affiliate_url="https://www.datacamp.com/donates",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#03EF62"),
        dict(brand="Brilliant", title="Brilliant Premium 50% Off",
             desc="Math, science, CS — interactive courses for problem-solvers.",
             category="learning", price_inr=2999, price_unit="per_year",
             original_inr=5999, currency="INR",
             affiliate_url="https://brilliant.org/",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#FACC15",
             code="BRILLIANT50"),
        dict(brand="Unacademy", title="Unacademy Plus Student",
             desc="Live classes, mock tests for JEE, NEET, UPSC.",
             category="learning", price_inr=3999, price_unit="per_year",
             original_inr=12000, currency="INR",
             affiliate_url="https://unacademy.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#08BD80",
             code="UAY-SA-67"),
        dict(brand="LinkedIn Learning", title="LinkedIn Learning + Premium",
             desc="3 months free Learning + Premium career insights.",
             category="learning", price_inr=0, price_unit="per_month",
             original_inr=600, currency="INR",
             affiliate_url="https://www.linkedin.com/learning/",
             student_only=True, auto_apply=True, country="GLOBAL",
             available_globally=True, accent="#0A66C2"),

        # ── ENTERTAINMENT (6) ────────────────────────────────────────
        dict(brand="Spotify", title="Spotify Student",
             desc="Ad-free music, podcasts + Hulu (in supported regions).",
             category="entertainment", price_inr=59, price_unit="per_month",
             original_inr=119, currency="INR",
             affiliate_url="https://www.spotify.com/in-en/student/",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#1DB954",
             code="SPOTIFY-SA"),
        dict(brand="YouTube", title="YouTube Premium Student",
             desc="Ad-free YouTube, YouTube Music, background play.",
             category="entertainment", price_inr=89, price_unit="per_month",
             original_inr=189, currency="INR",
             affiliate_url="https://www.youtube.com/premium/student",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#FF0000",
             code="YT-SA-53"),
        dict(brand="Amazon", title="Amazon Prime Student",
             desc="Prime Video, Music, free delivery, early access.",
             category="entertainment", price_inr=999, price_unit="per_year",
             original_inr=1499, currency="INR",
             affiliate_url="https://www.amazon.in/joinprimestudent",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#FF9900",
             code="AMZN-SA-EDU"),
        dict(brand="Apple Music", title="Apple Music Student",
             desc="100M songs, lossless audio, Apple TV+ included.",
             category="entertainment", price_inr=59, price_unit="per_month",
             original_inr=119, currency="INR",
             affiliate_url="https://www.apple.com/in/apple-music/",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#FA243C"),
        dict(brand="Hotstar", title="Disney+ Hotstar Mobile",
             desc="Live cricket, IPL, movies & shows on mobile only.",
             category="entertainment", price_inr=149, price_unit="per_year",
             original_inr=499, currency="INR",
             affiliate_url="https://www.hotstar.com/in",
             student_only=False, auto_apply=False, country="IN",
             available_globally=False, accent="#0F1419"),
        dict(brand="BookMyShow", title="BookMyShow Insider Student",
             desc="Priority access, student-only shows, ₹100 off events.",
             category="entertainment", price_inr=199, price_unit="per_year",
             original_inr=599, currency="INR",
             affiliate_url="https://in.bookmyshow.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#F84464",
             code="BMS-SA-2026"),

        # ── INSURANCE (5) ────────────────────────────────────────────
        dict(brand="Star Health", title="Star Student Health Care",
             desc="₹3L cover · Hospitalisation · Day care · OPD · Telemedicine.",
             category="insurance", price_inr=1499, price_unit="per_year",
             original_inr=2200, currency="INR",
             affiliate_url="https://www.starhealth.in/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#EF4444",
             code="SAHEALTH30"),
        dict(brand="ACKO", title="ACKO Student Travel",
             desc="Trip cancellation · Lost baggage · Medical abroad cover.",
             category="insurance", price_inr=299, price_unit="one_time",
             original_inr=499, currency="INR",
             affiliate_url="https://www.acko.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#EF4444",
             code="ACKO-SA40"),
        dict(brand="Digit", title="Digit Two-Wheeler Student",
             desc="Zero-dep cover, roadside assistance, instant claim.",
             category="insurance", price_inr=699, price_unit="per_year",
             original_inr=1199, currency="INR",
             affiliate_url="https://www.godigit.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#1F46DC",
             code="DIGIT-SA42"),
        dict(brand="Niva Bupa", title="Niva Bupa Student Health",
             desc="Mental health · Cashless 7000+ hospitals · No co-pay.",
             category="insurance", price_inr=1799, price_unit="per_year",
             original_inr=2999, currency="INR",
             affiliate_url="https://www.nivabupa.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#EC4899",
             code="SANIVA20"),
        dict(brand="Tata AIG", title="Tata AIG Multi-Trip Student",
             desc="Unlimited trips/yr · Adventure sports · Emergency evac.",
             category="insurance", price_inr=1499, price_unit="per_year",
             original_inr=1999, currency="INR",
             affiliate_url="https://www.tataaig.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#22C55E",
             code="SATATA25"),

        # ── TRANSPORT (5) ────────────────────────────────────────────
        dict(brand="Rapido", title="Rapido Student First 5 Rides",
             desc="First 5 bike/auto rides FREE for SA-ID verified students.",
             category="transport", price_inr=0, price_unit="per_ride",
             original_inr=300, currency="INR",
             affiliate_url="https://www.rapido.bike/",
             student_only=True, auto_apply=True, country="IN",
             available_globally=False, accent="#F59E0B",
             code="RAPIDO-SA5"),
        dict(brand="Uber", title="Uber Pass Student",
             desc="₹49/mo · 10% off rides + free delivery on Uber Eats.",
             category="transport", price_inr=49, price_unit="per_month",
             original_inr=149, currency="INR",
             affiliate_url="https://www.uber.com/in/en/pass/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#000000",
             code="UBER-SA49"),
        dict(brand="Yulu", title="Yulu Move Student",
             desc="Unlimited e-bike rides for ₹999/mo around campus.",
             category="transport", price_inr=999, price_unit="per_month",
             original_inr=2499, currency="INR",
             affiliate_url="https://www.yulu.bike/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#22C55E",
             code="YULU-MOVE"),
        dict(brand="BluSmart", title="BluSmart Student 15% Off",
             desc="All-electric, all the time. 15% off every ride.",
             category="transport", price_inr=85, price_unit="per_ride",
             original_inr=100, currency="INR",
             affiliate_url="https://www.blu-smart.com/",
             student_only=True, auto_apply=True, country="IN",
             available_globally=False, accent="#0EA5E9",
             code="BLU-SA15"),
        dict(brand="Indian Railways", title="IRCTC Student Concession",
             desc="SL 50% · AC 25% off on select trains for students.",
             category="transport", price_inr=200, price_unit="one_time",
             original_inr=400, currency="INR",
             affiliate_url="https://www.irctc.co.in/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#0F766E"),

        # ── TRAVEL (NEW) (5) ─────────────────────────────────────────
        dict(brand="MakeMyTrip", title="MakeMyTrip Student Hotels",
             desc="Flat 15% off stays at 50,000+ partner hotels.",
             category="travel", price_inr=1700, price_unit="per_year",
             original_inr=2000, currency="INR",
             affiliate_url="https://www.makemytrip.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#FF5F1F",
             code="MMT-SA15"),
        dict(brand="Yatra", title="Yatra Student Flights 10% Off",
             desc="Flat 10% off domestic flights, students-only.",
             category="travel", price_inr=4500, price_unit="one_time",
             original_inr=5000, currency="INR",
             affiliate_url="https://www.yatra.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#EAB308",
             code="YATRA-SA10"),
        dict(brand="RedBus", title="RedBus Student Saver",
             desc="₹150 off all bus bookings via SA-ID.",
             category="travel", price_inr=850, price_unit="one_time",
             original_inr=1000, currency="INR",
             affiliate_url="https://www.redbus.in/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#D84E55",
             code="RB-SA150"),
        dict(brand="Booking.com", title="Booking.com Genius Student",
             desc="10% off thousands of Genius properties worldwide.",
             category="travel", price_inr=4500, price_unit="one_time",
             original_inr=5000, currency="INR",
             affiliate_url="https://www.booking.com/",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#003580",
             code="BKG-SA10"),
        dict(brand="IndiGo", title="IndiGo Student Fare",
             desc="Book 7+ days in advance — flat 10% off via SA portal.",
             category="travel", price_inr=4050, price_unit="one_time",
             original_inr=4500, currency="INR",
             affiliate_url="https://www.goindigo.in/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#1A237E",
             code="INDIGO-SA10"),

        # ── FASHION (NEW) (5) ────────────────────────────────────────
        dict(brand="Myntra", title="Myntra Student 10% Off",
             desc="Flat 10% off on apparel, shoes & accessories.",
             category="fashion", price_inr=900, price_unit="one_time",
             original_inr=1000, currency="INR",
             affiliate_url="https://www.myntra.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#FF3F6C",
             code="MYNTRA-SA10"),
        dict(brand="Ajio", title="Ajio Campus 15% Off First Order",
             desc="₹500 off on orders above ₹2000 — campus exclusive.",
             category="fashion", price_inr=1500, price_unit="one_time",
             original_inr=2000, currency="INR",
             affiliate_url="https://www.ajio.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#3B0083",
             code="AJIO-CAMPUS"),
        dict(brand="H&M", title="H&M Student 10% Off",
             desc="Free Member discount + 10% extra for students.",
             category="fashion", price_inr=2700, price_unit="one_time",
             original_inr=3000, currency="INR",
             affiliate_url="https://www2.hm.com/",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#E50010",
             code="HM-SA10"),
        dict(brand="Nike", title="Nike Student 10% Off",
             desc="10% off shoes & apparel for verified students.",
             category="fashion", price_inr=4500, price_unit="one_time",
             original_inr=5000, currency="INR",
             affiliate_url="https://www.nike.com/in/",
             student_only=True, auto_apply=False, country="GLOBAL",
             available_globally=True, accent="#000000",
             code="NIKE-SA10"),
        dict(brand="Bewakoof", title="Bewakoof Campus ₹200 Off",
             desc="₹200 off orders above ₹999 — quirky tees & hoodies.",
             category="fashion", price_inr=799, price_unit="one_time",
             original_inr=999, currency="INR",
             affiliate_url="https://www.bewakoof.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#FFCB08",
             code="BWK-CAMPUS200"),

        # ── GROCERY (NEW) (4) ────────────────────────────────────────
        dict(brand="BigBasket", title="BigBasket Star Student",
             desc="₹100 off + free delivery on first 3 orders.",
             category="grocery", price_inr=400, price_unit="one_time",
             original_inr=500, currency="INR",
             affiliate_url="https://www.bigbasket.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#84C225",
             code="BB-SA100"),
        dict(brand="Blinkit", title="Blinkit First Order ₹150 Off",
             desc="Flat ₹150 off on your first 3 orders + free delivery.",
             category="grocery", price_inr=350, price_unit="one_time",
             original_inr=500, currency="INR",
             affiliate_url="https://www.blinkit.com/",
             student_only=False, auto_apply=False, country="IN",
             available_globally=False, accent="#F9C32C",
             code="BLINKIT150"),
        dict(brand="Zepto", title="Zepto Student First Order",
             desc="₹200 off first order + free delivery for 30 days.",
             category="grocery", price_inr=300, price_unit="one_time",
             original_inr=500, currency="INR",
             affiliate_url="https://www.zeptonow.com/",
             student_only=True, auto_apply=False, country="IN",
             available_globally=False, accent="#7C3AED",
             code="ZEPTO-SA200"),
        dict(brand="Amazon Fresh", title="Amazon Fresh Student Free Delivery",
             desc="Free delivery on Fresh orders for 90 days for students.",
             category="grocery", price_inr=0, price_unit="per_month",
             original_inr=99, currency="INR",
             affiliate_url="https://www.amazon.in/fresh",
             student_only=True, auto_apply=True, country="IN",
             available_globally=False, accent="#FF9900"),
    ]

    # Normalize each into Deal schema
    out = []
    now = datetime.now(timezone.utc)
    for d in base:
        deal_id = _make_id(d["brand"], d["title"])
        pct = _calc_pct(d["original_inr"], d["price_inr"])
        savings = max(0, int(d["original_inr"]) - int(d["price_inr"]))
        out.append({
            "deal_id": deal_id,
            "brand": d["brand"],
            "provider": d["brand"],
            "title": d["title"],
            "category": d["category"],
            "description": d["desc"],
            "price_inr": int(d["price_inr"]),
            "price_unit": d.get("price_unit", "one_time"),
            "price_label": _price_label(d["price_inr"], d.get("price_unit"), pct),
            "original_inr": int(d["original_inr"]),
            "original_label": _orig_label(d["original_inr"], d.get("price_unit")),
            "discount_pct": pct,
            "discount_label": f"{pct}% off" if pct > 0 else "Special",
            "absolute_savings_inr": savings,
            "currency": d.get("currency", "INR"),
            "affiliate_url": d["affiliate_url"],
            "code": d.get("code") or "",
            "logo_url": d.get("logo") or _logo(d["brand"]),
            "accent": d.get("accent", "#7C3AED"),
            "student_only": bool(d.get("student_only", False)),
            "auto_apply": bool(d.get("auto_apply", False)),
            "country": d.get("country", "GLOBAL"),
            "available_globally": bool(d.get("available_globally", True)),
            "expires_at": d.get("expires_at"),
            "added_at": now.isoformat(),
            "claim_count_24h": 0,
            "claim_count_total": 0,
            "source": "curated",
            "tags": [],
        })
    return out


def _price_label(price_inr: int, unit: str, pct: int) -> str:
    if price_inr <= 0:
        return "FREE"
    suffix = {
        "per_year": "/yr", "per_month": "/mo",
        "per_course": "/course", "per_ride": "/ride",
    }.get(unit, "")
    return f"₹{price_inr:,}{suffix}"


def _orig_label(orig_inr: int, unit: str) -> str:
    suffix = {
        "per_year": "/yr", "per_month": "/mo",
        "per_course": "/course", "per_ride": "/ride",
    }.get(unit, "")
    return f"₹{orig_inr:,}{suffix}"


# ─── Live Source: GitHub Student Pack ────────────────────────────────────
async def _fetch_github_pack(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """Fetch live GitHub Student Developer Pack offers (no auth)."""
    try:
        r = await client.get(
            "https://education.github.com/pack/offers.json",
            headers={"User-Agent": USER_AGENT},
            timeout=PER_API_TIMEOUT_S,
        )
        r.raise_for_status()
        data = r.json()
        items = data if isinstance(data, list) else (data.get("offers") or [])
        out = []
        now = datetime.now(timezone.utc)
        for it in items[:40]:
            title = (it.get("name") or it.get("title") or "").strip()
            brand = it.get("brand") or it.get("partner") or title.split(" ")[0]
            desc = (it.get("description") or it.get("short_description") or "")[:240]
            url = it.get("url") or it.get("link") or "https://education.github.com/pack"
            if not title:
                continue
            out.append({
                "deal_id": _make_id("ghpack-" + brand, title),
                "brand": brand,
                "provider": "GitHub Education",
                "title": title,
                "category": _guess_category(title + " " + desc),
                "description": desc,
                "price_inr": 0,
                "price_unit": "per_year",
                "price_label": "FREE",
                "original_inr": 1000,
                "original_label": "₹1,000+/yr",
                "discount_pct": 100,
                "discount_label": "100% off",
                "absolute_savings_inr": 1000,
                "currency": "INR",
                "affiliate_url": url,
                "code": "Via GitHub Education",
                "logo_url": _logo(brand),
                "accent": "#7C3AED",
                "student_only": True,
                "auto_apply": True,
                "country": "GLOBAL",
                "available_globally": True,
                "expires_at": None,
                "added_at": now.isoformat(),
                "claim_count_24h": 0,
                "claim_count_total": 0,
                "source": "githubPack",
                "tags": [],
            })
        return out
    except Exception as e:
        logger.warning(f"[deals] GitHub Pack fetch failed: {e}")
        return []


def _guess_category(text: str) -> str:
    t = (text or "").lower()
    if any(w in t for w in ("course", "learn", "tutorial", "school", "edu")):
        return "learning"
    if any(w in t for w in ("travel", "flight", "hotel", "trip")):
        return "travel"
    if any(w in t for w in ("food", "delivery", "restaurant")):
        return "food"
    if any(w in t for w in ("music", "video", "stream", "podcast")):
        return "entertainment"
    if any(w in t for w in ("insurance", "health", "cover")):
        return "insurance"
    return "tech"


# ─── Tag Engine ──────────────────────────────────────────────────────────
def apply_tags(deal: Dict[str, Any], all_deals: List[Dict[str, Any]]) -> List[str]:
    tags: List[str] = []
    now = datetime.now(timezone.utc)
    pct = int(deal.get("discount_pct") or 0)

    # Discount-based (HOT takes precedence)
    if pct >= 50:
        tags.append("HOT")
    elif pct >= 30:
        tags.append("OFF_30")

    # Time-based
    expires_at = deal.get("expires_at")
    if expires_at:
        try:
            ts = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            hours_left = (ts - now).total_seconds() / 3600
            if hours_left <= 48:
                if "ENDING_SOON" not in tags:
                    tags.append("ENDING_SOON")
            elif hours_left <= 24 * 7 and "HOT" not in tags:
                tags.append("HOT")
        except Exception:
            pass
    else:
        tags.append("NO_EXPIRY")

    # Recency
    added_at = deal.get("added_at")
    if added_at:
        try:
            ts = datetime.fromisoformat(added_at.replace("Z", "+00:00"))
            age_days = (now - ts).total_seconds() / 86400
            if age_days <= 7:
                tags.append("NEW")
        except Exception:
            pass

    # D3 — Crowdsourced verification: UNRELIABLE when the community reports
    # this deal's worked-rate below 50% (>= 5 reports, stamped by the sweep)
    rate = deal.get("success_rate")
    if rate is not None and int(deal.get("verification_count") or 0) >= 5 and rate < 0.5:
        tags.append("UNRELIABLE")
    if deal.get("staleness_flag"):
        tags.append("STALE")

    # Source-based
    if deal.get("student_only"):
        tags.append("STUDENT_VERIFIED")
    if deal.get("country") == "IN" and not deal.get("available_globally"):
        tags.append("INDIA_EXCLUSIVE")
    if deal.get("auto_apply"):
        tags.append("INSTANT")

    # Comparative — TRENDING & BEST_VALUE
    if all_deals:
        claims = [int(d.get("claim_count_24h") or 0) for d in all_deals]
        threshold = _percentile(claims, 90)
        if int(deal.get("claim_count_24h") or 0) >= max(threshold, 1):
            tags.append("TRENDING")

        same_cat = [d for d in all_deals if d.get("category") == deal.get("category")]
        same_cat_sorted = sorted(same_cat, key=lambda x: -int(x.get("absolute_savings_inr") or 0))[:3]
        top_ids = {d.get("deal_id") for d in same_cat_sorted if d.get("deal_id")}
        if deal.get("deal_id") in top_ids and (deal.get("absolute_savings_inr") or 0) > 0:
            tags.append("BEST_VALUE")

    # Dedup while preserving order
    seen = set()
    out = []
    for t in tags:
        if t not in seen:
            seen.add(t); out.append(t)
    return out


# ─── Cache + Aggregator ──────────────────────────────────────────────────
async def _seed_curated_if_missing() -> int:
    cnt = await _db.deals.count_documents({"source": "curated"})
    if cnt > 0:
        return 0
    created = 0
    for d in _curated_deals():
        await _db.deals.update_one(
            {"deal_id": d["deal_id"]},
            {"$set": d, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        created += 1
    return created


async def _refresh_live_sources() -> Dict[str, Any]:
    """Pull from live sources in parallel and upsert into db.deals."""
    now = datetime.now(timezone.utc)
    sources_status: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        results = await asyncio.gather(
            _fetch_github_pack(client),
            return_exceptions=True,
        )
    source_names = ["githubPack"]
    total_inserted = 0
    for name, res in zip(source_names, results):
        if isinstance(res, Exception):
            sources_status.append({"name": name, "status": "failed", "deals": 0, "error": str(res)})
            continue
        items = res or []
        for d in items:
            await _db.deals.update_one(
                {"deal_id": d["deal_id"]},
                {"$set": {**d, "last_synced_at": now},
                 "$setOnInsert": {"created_at": now}},
                upsert=True,
            )
        total_inserted += len(items)
        sources_status.append({"name": name, "status": "ok", "deals": len(items)})

    await _db.deals_meta.update_one(
        {"_id": "global"},
        {"$set": {"last_refresh_at": now, "sources_status": sources_status,
                  "last_refresh_count": total_inserted}},
        upsert=True,
    )
    return {"total_inserted": total_inserted, "sources": sources_status, "at": now.isoformat()}


async def _is_cache_fresh() -> bool:
    meta = await _db.deals_meta.find_one({"_id": "global"})
    if not meta or not meta.get("last_refresh_at"):
        return False
    last = meta["last_refresh_at"]
    if isinstance(last, datetime):
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - last) < timedelta(minutes=CACHE_TTL_MIN)
    return False


# ─── Endpoints ───────────────────────────────────────────────────────────
def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


@router.get("/deals/all")
async def deals_all(
    category: str = Query("all"),
    country: str = Query("IN"),
    student_only: bool = Query(False),
    refresh: bool = Query(False),
    user: dict = Depends(_get_current_user_dependency()),
):
    """Aggregated SA Member Deals — applies Tag Engine, sorts by HOT first."""
    await _seed_curated_if_missing()
    if refresh or not await _is_cache_fresh():
        await _refresh_live_sources()

    q: Dict[str, Any] = {}
    if category and category != "all":
        q["category"] = category
    if student_only:
        q["student_only"] = True
    if country and country != "ALL":
        # Allow country=IN to show both IN and GLOBAL deals
        q["$or"] = [{"country": country}, {"country": "GLOBAL"}]

    deals: List[Dict[str, Any]] = []
    cursor = _db.deals.find(q).sort("absolute_savings_inr", -1).limit(200)
    async for d in cursor:
        d.pop("_id", None)
        d.pop("created_at", None)
        d.pop("last_synced_at", None)
        deals.append(d)

    # Apply Tag Engine on the visible set (so TRENDING/BEST_VALUE scope correctly)
    for d in deals:
        d["tags"] = apply_tags(d, deals)

    # Sort: HOT first → NEW → recency → savings
    def _sort_key(d):
        is_hot = "HOT" in (d.get("tags") or [])
        is_new = "NEW" in (d.get("tags") or [])
        return (-int(is_hot), -int(is_new), -int(d.get("absolute_savings_inr") or 0))
    deals.sort(key=_sort_key)

    meta = await _db.deals_meta.find_one({"_id": "global"}) or {}
    last_refresh = meta.get("last_refresh_at")
    if isinstance(last_refresh, datetime):
        last_refresh = last_refresh.isoformat()

    return {
        "deals": deals,
        "total_count": len(deals),
        "last_updated": last_refresh,
        "cache_ttl_min": CACHE_TTL_MIN,
        "sources": meta.get("sources_status") or [{"name": "curated", "status": "ok", "deals": len(deals)}],
        "category": category,
        "country": country,
    }


@router.get("/deals/stats")
async def deals_stats(user: dict = Depends(_get_current_user_dependency())):
    """Computes AI Savings Advisor numbers from real deals."""
    await _seed_curated_if_missing()
    if not await _is_cache_fresh():
        await _refresh_live_sources()

    deals = []
    async for d in _db.deals.find({}):
        d.pop("_id", None)
        deals.append(d)

    total_savings = sum(int(d.get("absolute_savings_inr") or 0) for d in deals)
    yearly_savings = sum(int(d.get("absolute_savings_inr") or 0)
                         for d in deals if d.get("price_unit") in ("per_year", "per_month"))

    # Top category by total savings
    cat_savings: Dict[str, int] = {}
    for d in deals:
        c = d.get("category") or "other"
        cat_savings[c] = cat_savings.get(c, 0) + int(d.get("absolute_savings_inr") or 0)
    top_cat = max(cat_savings.items(), key=lambda x: x[1]) if cat_savings else ("—", 0)

    # Best ROI by absolute INR savings
    best_roi = max(deals, key=lambda d: int(d.get("absolute_savings_inr") or 0)) if deals else None

    # Top 4 by absolute savings (Smart Bundle)
    bundle = sorted(deals, key=lambda d: -int(d.get("absolute_savings_inr") or 0))[:4]
    bundle_total_savings = sum(int(d.get("absolute_savings_inr") or 0) for d in bundle)

    free_count = sum(1 for d in deals if int(d.get("price_inr") or 0) == 0)
    hot_count = 0
    for d in deals:
        d["tags"] = apply_tags(d, deals)
        if "HOT" in d["tags"]:
            hot_count += 1

    by_category = [{"category": c, "count": sum(1 for d in deals if d.get("category") == c),
                    "savings": cat_savings.get(c, 0)} for c in CATEGORIES]

    return {
        "total_deals": len(deals),
        "free_deals": free_count,
        "hot_deals": hot_count,
        "total_savings_inr": total_savings,
        "yearly_savings_inr": yearly_savings,
        "top_category": {"id": top_cat[0], "savings": int(top_cat[1])},
        "best_roi": {
            "deal_id": best_roi.get("deal_id") if best_roi else None,
            "title": best_roi.get("title") if best_roi else None,
            "brand": best_roi.get("brand") if best_roi else None,
            "savings_inr": int(best_roi.get("absolute_savings_inr") or 0) if best_roi else 0,
        } if best_roi else None,
        "smart_bundle": [
            {"deal_id": d["deal_id"], "title": d["title"], "brand": d["brand"],
             "savings_inr": int(d.get("absolute_savings_inr") or 0),
             "price_label": d.get("price_label"), "logo_url": d.get("logo_url"),
             "accent": d.get("accent")}
            for d in bundle
        ],
        "smart_bundle_total_savings_inr": bundle_total_savings,
        "by_category": by_category,
    }


@router.post("/deals/refresh")
async def deals_refresh(user: dict = Depends(_get_current_user_dependency())):
    """Manual refresh — bypass cache and re-fetch live sources."""
    await _seed_curated_if_missing()
    res = await _refresh_live_sources()
    # Also bust AI cache
    await _db.deals_meta.update_one(
        {"_id": "ai_trending"},
        {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}},
        upsert=True,
    )
    return {"ok": True, **res}


@router.post("/deals/claim/{deal_id}")
async def deals_claim(
    deal_id: str,
    user: dict = Depends(_get_current_user_dependency()),
):
    """Records a claim. Awards +20 SA Credits (max 3/day per user)."""
    deal = await _db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(404, "Deal not found")

    # Daily quota
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    todays_claims = await _db.deal_claims.count_documents({
        "user_id": str(user["_id"]),
        "ts": {"$gte": today},
    })
    if todays_claims >= MAX_CLAIMS_PER_DAY:
        # Still allow the redirect, just no credits.
        return {
            "ok": True,
            "credits_awarded": 0,
            "reason": f"Daily claim quota reached ({MAX_CLAIMS_PER_DAY}/day). Redirecting anyway.",
            "deal_id": deal_id,
            "affiliate_url": deal.get("affiliate_url"),
            "code": deal.get("code") or "",
            "brand": deal.get("brand"),
            "title": deal.get("title"),
        }

    # Record claim
    await _db.deal_claims.insert_one({
        "user_id": str(user["_id"]),
        "deal_id": deal_id,
        "brand": deal.get("brand"),
        "title": deal.get("title"),
        "category": deal.get("category"),
        "ts": datetime.now(timezone.utc),
    })

    # Increment counters
    await _db.deals.update_one(
        {"deal_id": deal_id},
        {"$inc": {"claim_count_24h": 1, "claim_count_total": 1}},
    )

    # Credit user via wallet helper from activity_credits
    new_balance = None
    try:
        from features.activity_credits import _credit_user, _resolve_user
        u = await _resolve_user(user["_id"])
        idem = f"deal-claim:{user['_id']}:{deal_id}:{today.isoformat()[:10]}"
        new_balance, dup = await _credit_user(
            u, CLAIM_CREDITS,
            f"Deal claim: {deal.get('brand')} — {deal.get('title')}",
            metadata={
                "kind": "deal_claim",
                "deal_id": deal_id,
                "brand": deal.get("brand"),
                "category": deal.get("category"),
                "icon": "tag",
            },
            idempotency_key=idem,
        )
    except Exception as e:
        logger.warning(f"[deals/claim] credit failed: {e}")

    return {
        "ok": True,
        "credits_awarded": CLAIM_CREDITS,
        "balance_credits": new_balance,
        "todays_claims": todays_claims + 1,
        "max_per_day": MAX_CLAIMS_PER_DAY,
        "deal_id": deal_id,
        "affiliate_url": deal.get("affiliate_url"),
        "code": deal.get("code") or "",
        "brand": deal.get("brand"),
        "title": deal.get("title"),
    }


@router.get("/deals/sources")
async def deals_sources(user: dict = Depends(_get_current_user_dependency())):
    meta = await _db.deals_meta.find_one({"_id": "global"}) or {}
    return {
        "sources": [
            {"name": "curated", "kind": "static-seed",
             "description": "50+ hand-picked Indian student deals across 9 categories"},
            {"name": "githubPack", "kind": "live-api",
             "description": "GitHub Student Developer Pack — official offer catalog"},
            {"name": "ai-trending", "kind": "ai-generator",
             "description": "Claude-powered weekly trending deal feed"},
        ],
        "last_refresh_at": (meta.get("last_refresh_at").isoformat()
                            if isinstance(meta.get("last_refresh_at"), datetime) else None),
        "status": meta.get("sources_status") or [],
    }


# ─── AI Trending Generator (Claude) ──────────────────────────────────────
@router.post("/deals/ai-generate")
async def deals_ai_generate(
    body: Optional[Dict[str, Any]] = None,
    user: dict = Depends(_get_current_user_dependency()),
):
    """Uses Claude (Emergent LLM key) to generate fresh trending deals.
    Cached for AI_REFRESH_TTL_HRS hours unless body.refresh=true.
    """
    body = body or {}
    force = bool(body.get("refresh"))

    cache = await _db.deals_meta.find_one({"_id": "ai_trending"})
    now = datetime.now(timezone.utc)
    if cache and not force:
        exp = cache.get("expires_at")
        if isinstance(exp, datetime):
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now:
                return {
                    "ok": True,
                    "cached": True,
                    "expires_at": exp.isoformat(),
                    "generated_count": int(cache.get("generated_count", 0)),
                    "deals": cache.get("deals", []),
                }

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        raise HTTPException(500, "emergentintegrations not installed")

    system = (
        "You are a deals research assistant for Indian students. "
        "You produce strict JSON only — no preamble, no markdown fences."
    )
    prompt = (
        "Generate 6 fresh, REAL trending deals for Indian college students this month. "
        "Cover at least 4 distinct categories from this list: tech, food, learning, "
        "entertainment, insurance, transport, travel, fashion, grocery. "
        "Only include real Indian or globally-available brands. "
        "Output a single JSON array — each item has these EXACT keys:\n"
        "  brand (string, real brand)\n"
        "  title (short, max 60 chars)\n"
        "  description (max 140 chars)\n"
        "  category (one of the categories above)\n"
        "  price_inr (number, INR — 0 if free)\n"
        "  original_inr (number, INR — must be > price_inr if there's a discount)\n"
        "  price_unit (one of: one_time, per_month, per_year, per_course, per_ride)\n"
        "  affiliate_url (real brand URL — official site)\n"
        "  code (coupon code or empty string)\n"
        "  accent (hex color matching the brand)\n"
        "  student_only (boolean)\n"
        "  auto_apply (boolean — true if no code needed)\n"
        "  country (IN or GLOBAL)\n"
        "Return ONLY a JSON array of 6 items, nothing else."
    )

    chat = (
        LlmChat(api_key=api_key, session_id=f"deals-trending-{uuid.uuid4().hex[:8]}",
                system_message=system)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )

    try:
        reply = await chat.send_message(UserMessage(text=prompt))
        text = (reply or "").strip()
    except Exception as e:
        raise HTTPException(502, f"LLM call failed: {e}")

    # Parse JSON (be lenient on stray fences)
    raw = text.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```(?:json)?\s*|```\s*$', '', raw, flags=re.MULTILINE).strip()
    try:
        items = json.loads(raw)
    except Exception:
        # Try to extract first [...] block
        m = re.search(r'\[[\s\S]*\]', raw)
        items = json.loads(m.group(0)) if m else []

    if not isinstance(items, list):
        items = []

    # Normalize and persist
    normalized = []
    for it in items:
        try:
            brand = str(it.get("brand") or "").strip()
            title = str(it.get("title") or "").strip()
            if not brand or not title:
                continue
            price_inr = int(it.get("price_inr") or 0)
            original_inr = int(it.get("original_inr") or 0)
            if original_inr <= 0:
                original_inr = price_inr or 1000
            pct = _calc_pct(original_inr, price_inr)
            unit = str(it.get("price_unit") or "one_time")
            cat = str(it.get("category") or "").lower()
            if cat not in CATEGORIES:
                cat = _guess_category(title + " " + (it.get("description") or ""))
            d = {
                "deal_id": _make_id("ai-" + brand, title),
                "brand": brand,
                "provider": brand,
                "title": title,
                "category": cat,
                "description": (it.get("description") or "")[:240],
                "price_inr": price_inr,
                "price_unit": unit,
                "price_label": _price_label(price_inr, unit, pct),
                "original_inr": original_inr,
                "original_label": _orig_label(original_inr, unit),
                "discount_pct": pct,
                "discount_label": f"{pct}% off" if pct > 0 else "Special",
                "absolute_savings_inr": max(0, original_inr - price_inr),
                "currency": "INR",
                "affiliate_url": it.get("affiliate_url") or "https://www.google.com/search?q=" + brand,
                "code": it.get("code") or "",
                "logo_url": _logo(brand),
                "accent": it.get("accent") or "#7C3AED",
                "student_only": bool(it.get("student_only", True)),
                "auto_apply": bool(it.get("auto_apply", False)),
                "country": str(it.get("country") or "IN"),
                "available_globally": str(it.get("country") or "IN") == "GLOBAL",
                "expires_at": None,
                "added_at": now.isoformat(),
                "claim_count_24h": 0,
                "claim_count_total": 0,
                "source": "ai-trending",
                "tags": [],
            }
            normalized.append(d)
        except Exception:
            continue

    # Upsert into DB so they appear in /deals/all
    for d in normalized:
        await _db.deals.update_one(
            {"deal_id": d["deal_id"]},
            {"$set": {**d, "last_synced_at": now},
             "$setOnInsert": {"created_at": now}},
            upsert=True,
        )

    expires_at = now + timedelta(hours=AI_REFRESH_TTL_HRS)
    await _db.deals_meta.update_one(
        {"_id": "ai_trending"},
        {"$set": {
            "deals": normalized,
            "generated_count": len(normalized),
            "generated_at": now,
            "expires_at": expires_at,
            "model": "claude-sonnet-4-5",
        }},
        upsert=True,
    )

    return {
        "ok": True,
        "cached": False,
        "generated_count": len(normalized),
        "expires_at": expires_at.isoformat(),
        "model": "claude-sonnet-4-5",
        "deals": normalized,
    }


# ─── D3: Crowdsourced Deal Verification + Auto-Expiry ───────────────────
class DealVerificationIn(BaseModel):
    worked: bool
    comment: Optional[str] = None


async def _recompute_verification_stats(db, deal_id: str) -> Dict[str, Any]:
    worked = await db.deal_verifications.count_documents(
        {"deal_id": deal_id, "worked": True})
    total = await db.deal_verifications.count_documents({"deal_id": deal_id})
    last = await db.deal_verifications.find_one(
        {"deal_id": deal_id}, sort=[("reported_at", -1)])
    rate = round(worked / total, 4) if total else 0.0
    stats = {"worked_count": worked, "total_reports": total,
             "success_rate": rate,
             "last_reported_at": last.get("reported_at") if last else None}
    # Stamped onto the deal doc so apply_tags / admin dashboard / client badge
    # can read a single canonical field (verification_count).
    await db.deals.update_one(
        {"deal_id": deal_id},
        {"$set": {**stats, "verification_count": total}})
    return stats


@router.post("/deals/verify/{deal_id}")
async def deals_verify(
    deal_id: str,
    body: DealVerificationIn,
    user: dict = Depends(_get_current_user_dependency()),
):
    """Report whether a claimed deal actually worked. One report per
    user per deal (a later report replaces the earlier one)."""
    deal = await _db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(404, "Deal not found")
    uid = str(user["_id"])
    now = datetime.now(timezone.utc)

    created = False
    existing = await _db.deal_verifications.find_one(
        {"deal_id": deal_id, "user_id": uid})
    if existing:
        await _db.deal_verifications.update_one(
            {"_id": existing["_id"]},
            {"$set": {"worked": body.worked,
                      "comment": (body.comment or "")[:500],
                      "reported_at": now,
                      "updated": True}},
        )
    else:
        created = True
        await _db.deal_verifications.insert_one({
            "deal_id": deal_id, "user_id": uid, "worked": body.worked,
            "comment": (body.comment or "")[:500], "reported_at": now,
            "updated": False,
        })

    # 24h reminder becomes irrelevant once reported
    if not existing:
        await _db.deal_claims.update_many(
            {"user_id": uid, "deal_id": deal_id,
             "verification_push_sent_at": None},
            {"$set": {"verification_push_sent_at": now}})

    stats = await _recompute_verification_stats(_db, deal_id)
    return {"ok": True, "reported": True, "created": created,
            "stats": stats}


@router.get("/deals/verification-stats/{deal_id}")
async def deals_verification_stats(
    deal_id: str,
    user: dict = Depends(_get_current_user_dependency()),
):
    """Per-deal verification stats + reporter breakdown for the client."""
    deal = await _db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(404, "Deal not found")
    stats = await _recompute_verification_stats(_db, deal_id)
    reports = []
    cur = _db.deal_verifications.find({"deal_id": deal_id}).sort("reported_at", -1).limit(10)
    async for r in cur:
        reports.append({"user_id": r.get("user_id"), "worked": r.get("worked"),
                       "comment": r.get("comment"), "reported_at": r.get("reported_at")})
    mine = await _db.deal_verifications.find_one(
        {"deal_id": deal_id, "user_id": str(user["_id"])})
    return {"deal_id": deal_id, "stats": stats,
            "my_report": {"worked": mine.get("worked")} if mine else None,
            "recent_reports": reports}


@router.get("/deals/verify-pending")
async def deals_verify_pending(user: dict = Depends(_get_current_user_dependency())):
    """Claims made >= 24h ago by this user, with whether a report exists and
    when — feeds the in-app 'Did the deal work?' quick yes/no card and
    matches the data payload of the 24h push notification."""
    def _utc(v) -> Optional[datetime]:
        if isinstance(v, str):
            try:
                v = datetime.fromisoformat(v.replace("Z", "+00:00"))
            except Exception:
                return None
        if isinstance(v, datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            return v
        return None

    now = datetime.now(timezone.utc)
    due = now - timedelta(hours=VERIFICATION_PUSH_DELAY_HRS)
    out: List[Dict[str, Any]] = []
    cur = _db.deal_claims.find({"user_id": str(user["_id"]), "ts": {"$lte": due}})
    async for c in cur:
        rep = await _db.deal_verifications.find_one(
            {"deal_id": c.get("deal_id"), "user_id": str(user["_id"])})
        deal = await _db.deals.find_one({"deal_id": c.get("deal_id")})
        claimed_at = _utc(c.get("ts"))
        out.append({
            "deal_id": c.get("deal_id"),
            "brand": c.get("brand") or (deal or {}).get("brand"),
            "title": c.get("title") or (deal or {}).get("title"),
            "claimed_at": claimed_at,
            "reported": bool(rep),
            "worked": rep.get("worked") if rep else None,
            "claimed_within_36h_of_now": bool(
                claimed_at and claimed_at >= now - timedelta(hours=36)),
        })
    out.sort(key=lambda x: x.get("claimed_at") or datetime.min.replace(tzinfo=timezone.utc),
             reverse=True)
    return {"pending": out}


async def run_deal_verification_sweep() -> Dict[str, Any]:
    """Hourly D3 pipeline (called from the deals scheduler):

    1. ``expires_at < now``                     -> status=expired
    2. <20% worked after 10+ reports            -> status=expired (auto)
    3. <50% worked after 5+ reports             -> UNRELIABLE tag (derived
       by apply_tags from the stamped success_rate / verification_count)
    4. no verification report for 30 days       -> STALE tag (staleness_flag)
    5. claimed 24h ago, still no report         -> 'Did the deal work?' push
    """
    db = _db
    now = datetime.now(timezone.utc)
    result: Dict[str, Any] = {"expired_time": 0, "expired_quality": 0,
                              "unreliable": 0, "stale": 0, "pushed": 0,
                              "at": now.isoformat()}

    try:
        await db.deal_verifications.create_index(
            [("deal_id", 1), ("user_id", 1)], unique=True, name="uniq_deal_user")
        await db.deal_claims.create_index(
            [("ts", 1), ("verification_push_sent_at", 1)], name="idx_claim_push")
    except Exception:
        pass

    # 1) time-based expiry
    res = await db.deals.update_many(
        {"status": {"$in": ["active", None]}, "expires_at": {"$lt": now}},
        {"$set": {"status": "expired", "expired_at": now}})
    result["expired_time"] = res.modified_count

    stale_cutoff = now - timedelta(days=STALE_AFTER_DAYS)
    # 2/3/4) per-deal quality + staleness from live verification counts
    async for d in db.deals.find({"deal_id": {"$ne": None}}):
        did = d.get("deal_id")
        total = await db.deal_verifications.count_documents({"deal_id": did})
        if total:
            worked = await db.deal_verifications.count_documents(
                {"deal_id": did, "worked": True})
            rate = worked / total
            await _recompute_verification_stats(db, str(did))
            if total >= UNRELIABLE_MIN_REPORTS and rate < UNRELIABLE_RATE:
                result["unreliable"] += 1
            if total >= EXPIRED_MIN_REPORTS and rate < EXPIRED_RATE:
                resq = await db.deals.update_one(
                    {"deal_id": did, "status": {"$ne": "expired"}},
                    {"$set": {"status": "expired", "expired_at": now,
                              "expiry_reason": "low_success_rate"}})
                if resq.modified_count:
                    result["expired_quality"] += 1

        # 4) STALE: no verification report for 30 days. The clock is the most
        # recent report, or the deal's creation if never reported.
        last_rep = await db.deal_verifications.find_one(
            {"deal_id": did}, sort=[("reported_at", -1)])
        clock = (last_rep.get("reported_at") if last_rep else None
                 or d.get("created_at") or d.get("last_synced_at"))
        if isinstance(clock, str):
            try:
                clock = datetime.fromisoformat(clock.replace("Z", "+00:00"))
            except Exception:
                clock = None
        if isinstance(clock, datetime) and clock.tzinfo is None:
            clock = clock.replace(tzinfo=timezone.utc)
        is_stale = bool(
            isinstance(clock, datetime) and clock < stale_cutoff
            and d.get("status") != "expired")
        if is_stale:
            if d.get("staleness_flag") is not True:
                result["stale"] += 1
            await db.deals.update_one({"deal_id": did},
                                      {"$set": {"staleness_flag": True}})
        elif d.get("staleness_flag") is True:
            await db.deals.update_one(
                {"deal_id": did, "staleness_flag": True},
                {"$unset": {"staleness_flag": ""}})

    # 5) 24h 'did it work?' push to claimers who never reported
    try:
        from features.notifications import send_push
    except Exception:
        send_push = None
    due_cutoff = now - timedelta(hours=VERIFICATION_PUSH_DELAY_HRS)
    claims_cursor = db.deal_claims.find(
        {"ts": {"$lte": due_cutoff}, "verification_push_sent_at": None})
    async for claim in claims_cursor:
        deal_id = claim.get("deal_id")
        uid = claim.get("user_id")
        already = await db.deal_verifications.find_one(
            {"deal_id": deal_id, "user_id": uid})
        await db.deal_claims.update_one(
            {"_id": claim.get("_id")},
            {"$set": {"verification_push_sent_at": now}})
        if already or not send_push:
            continue
        deal = await db.deals.find_one({"deal_id": deal_id})
        brand = (deal or {}).get("brand") or "This"
        try:
            await send_push(
                db,
                user_id=str(uid),
                title=f"Did the {brand} deal work?",
                body="You claimed this offer a day ago — tell us if it actually "
                      "applied, so we can keep bad deals out.",
                data={"type": "deal_verification", "deal_id": str(deal_id)},
            )
            result["pushed"] += 1
        except Exception as e:  # noqa: BLE001
            logger.warning("[deals/verify] push failed: %s", e)

    logger.info("[deals/verify] sweep: %s", result)
    return result
