"""
higher_ed_aggregator.py — 24-hour Higher-Ed Aggregator Bot (roadmap H1).

Refreshes four Mongo cache collections every 24h (daily 03:00 IST cron) so
the Higher-Ed platform (features/higher_ed_platform.py) serves live data
instead of hardcoded seed lists:

  he_programmes_cache   — programme rows (rankings / study portals / UGC)
  he_scholarships_cache — scholarship rows (DAAD / Buddy4Study)
  he_countries_cache    — per-country profile rows (cost of living, counts)
  he_forex_cache        — currency → INR rates (open.er-api.com, key-free)

Design mirrors services/course_aggregator + services/rentals_aggregator:
  - one ``HESourceAdapter`` per source (pluggable, httpx-based, per-adapter
    error isolation)
  - adapters without a stable public API serve a deterministic static catalog
    instead of scraping (documented on each adapter)
  - programme dedup by compound key ``slugify(institution)|slugify(programme)
    |degree|country``; multi-source merge keeps the richest detail and marks
    losers ``status="duplicate"`` (the platform reads only ``active``)
  - caches carry a 24h TTL index on ``updated_at``; the platform falls back
    to its seed lists whenever the cache is empty
  - APScheduler CronTrigger(hour=3, minute=0) tz Asia/Kolkata,
    leader-elected in server.py
  - env-gated: HE_AGGREGATOR_CRON_ENABLED (default 1) /
    HE_AGGREGATOR_RUN_ON_STARTUP (default 1, catch-up when last run >24h)

Admin (super_admin only):
  POST  /he/refresh                          (manual trigger; ?source={name})
  GET   /he/refresh/status
  PATCH /he/refresh/sources/{name}           {"enabled": true|false}

Free open sources used:
  - OpenAlex  (api.openalex.org)   — institutional research output, no key
  - er-api    (open.er-api.com)    — live currency→INR rates, no key
"""
from __future__ import annotations

import abc
import asyncio
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, ClassVar, Dict, List, Optional, Tuple

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.db import db as _db

logger = logging.getLogger("higher_ed_aggregator")

PROG_COL = "he_programmes_cache"
SCHOL_COL = "he_scholarships_cache"
COUNTRY_COL = "he_countries_cache"
FOREX_COL = "he_forex_cache"
RUN_META = "he_aggregator_runs"
SOURCE_META = "he_aggregator_sources"

CACHE_COLS = (PROG_COL, SCHOL_COL, COUNTRY_COL, FOREX_COL)

USER_AGENT = "StudentAlumniBot/1.0 (+https://studentalumni.in)"
PER_API_TIMEOUT_S = 15.0
TTL_SECONDS = 86400          # 24h cache lifetime
STARTUP_STALE_HOURS = 24

# Mirror of features/higher_ed_platform.FX_TO_INR — used only when the
# he_forex_cache is empty/stale (H2 switches the UI to the live FX cache).
FX_FALLBACK_TO_INR: Dict[str, float] = {
    "INR": 1.0, "USD": 83.5, "GBP": 105.0, "EUR": 90.0,
    "CAD": 61.0, "AUD": 55.0, "SGD": 62.0,
}

OPENALEX_COUNTRIES: Dict[str, str] = {
    "IN": "India", "GB": "UK", "US": "USA", "DE": "Germany", "SG": "Singapore",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slugify(text: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(text or "").lower()).strip("-")
    return slug[:max_len].rstrip("-") or "x"


def programme_key(institution: str, programme: str, degree: str,
                  country: str) -> str:
    deg = str(degree or '').strip().lower()
    cty = str(country or '').strip().lower()
    return f"{slugify(institution)}|{slugify(programme)}|{deg}|{cty}"


def scholarship_key(funder: str, name: str, degree: str) -> str:
    return (f"{slugify(funder)}|{slugify(name)}"
            f"|{str(degree or '').strip().lower()}")


def estimate_match(p: Dict[str, Any]) -> int:
    """Deterministic match estimate from real ranking/acceptance signals
    (replaces the hardcoded seed percentages; H2's weighted engine will
    refine this with the user profile)."""
    score = 60.0
    qs = p.get("qs_rank")
    if qs:
        score += (100 - min(int(qs), 100)) / 10.0
    nirf = p.get("nirf_rank")
    if nirf:
        score += (100 - min(int(nirf), 100)) / 10.0
    openalex = p.get("openalex") or 0
    if openalex:
        score += min((openalex - 800) / 10.0, 10.0)
    ar = p.get("acceptance_rate")
    if ar is not None:
        score += max(0.0, (40 - float(ar))) * 0.5
    return int(max(55, min(95, round(score))))


# ─── Adapters ────────────────────────────────────────────────────────────
class HESourceAdapter(abc.ABC):
    """One pluggable higher-ed source. ``fetch_rows`` returns partial docs;
    each row carries a ``feed`` key ("programmes" | "scholarships" |
    "countries" | "forex") that routes it to the matching cache
    collection. Missing optional keys are fine — the aggregator shapes
    them into the platform display document (see HigherEdAggregator).
    """

    source_name: ClassVar[str] = "base"
    provider: ClassVar[str] = ""
    feed: ClassVar[str] = "programmes"
    api_key_env: ClassVar[Optional[str]] = None
    is_static: ClassVar[bool] = False

    def __init__(self, http: Optional[httpx.AsyncClient] = None):
        self.http = http

    @abc.abstractmethod
    async def fetch_rows(self) -> List[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement fetch_rows()")

    # shared helpers ───────────────────────────────────────────────────────
    async def _get_json(self, url: str, **kwargs: Any) -> Any:
        assert self.http is not None, f"{self.source_name} called without a client"
        r = await self.http.get(url, **kwargs)
        r.raise_for_status()
        return r.json()

    def _static(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Wrap a deterministic static catalog; backfill a stable source_id."""
        out = []
        for i, row in enumerate(rows):
            d = dict(row)
            d.setdefault("source_id", f"{self.source_name}-{i + 1}")
            out.append(d)
        return out


# ── 1. QS Rankings (topuniversities.com) ─────────────────────────────────
class QSRankingsAdapter(HESourceAdapter):
    source_name = "qs_rankings"
    provider = "QS World University Rankings"
    feed = "programmes"
    is_static = True
    # topuniversities.com has no public API; deterministic static mirror of
    # the current QS top-university postgraduate catalogue.
    _CATALOG: List[Dict[str, Any]] = [
        dict(institution="University of Oxford", name="MSc Computer Science",
             degree="MSc", country="UK", qs_rank=3, fee_amount=36000,
             currency="GBP", fee="£36,000", duration="1 year",
             intake="Oct 2026", deadline="2026-01-19", apply_url="https://www.ox.ac.uk/admissions/graduate",
             min_cgpa=8.5, acceptance_rate=15, openalex=990, fields=["cs", "ai"]),
        dict(institution="Cambridge University", name="Master of Engineering",
             degree="MEng", country="UK", qs_rank=6, fee_amount=58000,
             currency="GBP", fee="£58,000", duration="1 year",
             intake="Sep 2026", deadline="2026-01-31", apply_url="https://www.eng.cam.ac.uk/graduates/",
             min_cgpa=8.0, acceptance_rate=12, openalex=980, fields=["engineering"]),
        dict(institution="Imperial College London", name="MSc Artificial Intelligence",
             degree="MSc", country="UK", qs_rank=9, fee_amount=48000,
             currency="GBP", fee="£48,000", duration="1 year",
             intake="Sep 2026", deadline="2026-01-15", apply_url="https://www.imperial.ac.uk/study/graduate/",
             min_cgpa=8.0, acceptance_rate=20, openalex=975, fields=["ai", "ml"]),
        dict(institution="Massachusetts Institute of Technology",
             name="MEng Computer Science & Engineering",
             degree="MEng", country="USA", qs_rank=2, fee_amount=70000,
             currency="USD", fee="$70,000", duration="1 year",
             intake="Sep 2026", deadline="2025-12-01", apply_url="https://ocw.mit.edu/",
             min_cgpa=8.5, acceptance_rate=10, openalex=1000, fields=["cs", "ai"]),
        dict(institution="National University of Singapore",
             name="MSc Computer Science",
             degree="MSc", country="Singapore", qs_rank=8, fee_amount=40000,
             currency="SGD", fee="S$40,000", duration="1.5 years",
             intake="Aug 2026", deadline="2026-03-15", apply_url="https://www.nus.edu.sg/admissions",
             min_cgpa=8.0, acceptance_rate=20, openalex=940, fields=["cs", "ai"]),
        dict(institution="University of Toronto",
             name="MSc Computer Science",
             degree="MSc", country="Canada", qs_rank=22, fee_amount=32000,
             currency="CAD", fee="C$32,000", duration="2 years",
             intake="Sep 2026", deadline="2026-02-01", apply_url="https://www.utoronto.ca/study/graduate",
             min_cgpa=7.5, acceptance_rate=30, openalex=930, fields=["cs"]),
        dict(institution="University of Melbourne",
             name="Master of Computing",
             degree="MSc", country="Australia", qs_rank=13, fee_amount=44000,
             currency="AUD", fee="A$44,000", duration="2 years",
             intake="Feb 2026", deadline="2025-11-30", apply_url="https://www.unimelb.edu.au/grad-schools",
             min_cgpa=7.0, acceptance_rate=35, openalex=920, fields=["cs", "it"]),
        dict(institution="Technical University of Munich",
             name="MSc Data Science & Engineering",
             degree="MSc", country="Germany", qs_rank=37, fee_amount=600,
             currency="EUR", fee="€300/sem", duration="2 years",
             intake="Oct 2026", deadline="2026-05-31",
             apply_url="https://www.tum.de/en/studies",
             min_cgpa=7.5, acceptance_rate=30, openalex=900,
             fields=["cs", "data-science"]),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── 2. NIRF Rankings (nirfrankings.org) ──────────────────────────────────
class NIRFRankingsAdapter(HESourceAdapter):
    source_name = "nirf_rankings"
    provider = "NIRF India"
    feed = "programmes"
    is_static = True
    # nirfrankings.org has no public API; deterministic static mirror of the
    # NIRF-ranked Indian institution postgraduate catalogue.
    _CATALOG: List[Dict[str, Any]] = [
        dict(institution="Indian Institute of Science", name="PhD in Computer Science",
             degree="PhD", country="India", nirf_rank=3, fee_amount=0,
             currency="INR", fee="Fully Funded", duration="4-5 years",
             intake="Aug 2026", deadline="2026-02-15", apply_url="https://www.iisc.ac.in/admissions/",
             min_cgpa=8.0, acceptance_rate=8, openalex=950, fields=["cs", "research"]),
        dict(institution="IIT Madras", name="M.Tech in Data Science",
             degree="M.Tech", country="India", nirf_rank=2, fee_amount=250000,
             currency="INR", fee="₹2.5L/yr", duration="2 years",
             intake="Aug 2026", deadline="2026-05-15", apply_url="https://www.iitm.ac.in/admissions",
             min_cgpa=7.5, acceptance_rate=10, openalex=870, fields=["data-science"]),
        dict(institution="IIT Delhi", name="M.Tech in Computer Science",
             degree="M.Tech", country="India", nirf_rank=2, fee_amount=240000,
             currency="INR", fee="₹2.4L/yr", duration="2 years",
             intake="Aug 2026", deadline="2026-05-10", apply_url="https://www.iitd.ac.in/admissions",
             min_cgpa=8.0, acceptance_rate=12, openalex=880, fields=["cs"]),
        dict(institution="IIT Bombay", name="M.Tech in VLSI Design",
             degree="M.Tech", country="India", nirf_rank=4, fee_amount=250000,
             currency="INR", fee="₹2.5L/yr", duration="2 years",
             intake="Aug 2026", deadline="2026-04-30", apply_url="https://www.iitb.ac.in/en/admissions",
             min_cgpa=8.0, acceptance_rate=6, openalex=850, fields=["vlsi", "ee"]),
        dict(institution="IIM Ahmedabad", name="MBA — Innovation Management",
             degree="MBA", country="India", nirf_rank=1, fee_amount=1150000,
             currency="INR", fee="₹23L total", duration="2 years",
             intake="Jun 2026", deadline="2026-01-31", apply_url="https://www.iima.ac.in/programmes",
             min_cgpa=7.5, acceptance_rate=2, openalex=600, fields=["mba", "strategy"]),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── 3. OpenAlex (FREE API — api.openalex.org, no key, ~100k/day) ─────────
class OpenAlexAdapter(HESourceAdapter):
    source_name = "openalex"
    provider = "OpenAlex"
    feed = "programmes"
    is_static = False

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for cc, name in OPENALEX_COUNTRIES.items():
            url = (f"https://api.openalex.org/institutions"
                   f"?filter=country_code:{cc},type:university"
                   f"&sort=cited_by_count:desc&per-page=3&mailto=bot@studentalumni.in")
            data = await self._get_json(url)
            for inst in (data.get("results") or []):
                sid = str(inst.get("id") or inst.get("display_name"))
                rows.append({
                    "source_id": sid.split("/")[-1] or inst.get("display_name"),
                    "feed": "programmes",
                    "institution": inst.get("display_name", ""),
                    "name": "Research & Postgraduate Programmes",
                    "degree": "PG",
                    "country": name,
                    # c10 on a 0-1000 scale, aligned with the platform's
                    # openalex quality tag threshold (H4 adds per-field detail)
                    "openalex": int(min(float(inst.get("c10_index") or 0), 1000)),
                    "works": inst.get("works_count"),
                    "url": inst.get("id") or "https://openalex.org",
                    "apply_url": "",
                })
            rows.append({
                "source_id": f"openalex-country-{cc}",
                "feed": "countries",
                "name": name,
                "flag": {"IN": "🇮🇳", "GB": "🇬🇧", "US": "🇺🇸",
                         "DE": "🇩🇪", "SG": "🇸🇬"}.get(cc, "🏳️"),
            })
        return rows


# ── 4. Study Portals (mastersportal.com, 200k+ programmes) ──────────────
class StudyPortalsAdapter(HESourceAdapter):
    source_name = "study_portals"
    provider = "MastersPortal"
    feed = "programmes"
    is_static = True
    # mastersportal.com has no public API; deterministic static mirror of
    # representative master's programmes from the portal catalogue.
    _CATALOG: List[Dict[str, Any]] = [
        dict(institution="Griffith University", name="Master of Data Science",
             degree="MSc", country="Australia", qs_rank=168, fee_amount=43000,
             currency="AUD", fee="A$43,000/yr", duration="1.5 years",
             intake="Feb 2026", deadline="2025-12-31", apply_url="https://www.griffith.edu.au/study-at-griffith",
             min_cgpa=6.5, acceptance_rate=45, openalex=520, fields=["data-science"]),
        dict(institution="Monash University", name="MSc Data Science",
             degree="MSc", country="Australia", qs_rank=37, fee_amount=52000,
             currency="AUD", fee="A$52,000/yr", duration="1 year",
             intake="Mar 2026", deadline="2026-01-15",
             apply_url="https://www.monash.edu/study",
             min_cgpa=7.0, acceptance_rate=35, openalex=880,
             fields=["data-science", "ai"]),
        dict(institution="University of New South Wales",
             name="MSc Artificial Intelligence",
             degree="MSc", country="Australia", qs_rank=19, fee_amount=49000,
             currency="AUD", fee="A$49,000/yr", duration="1.5 years",
             intake="Feb 2026", deadline="2025-12-15", apply_url="https://www.unsw.edu.au/study/postgraduate",
             min_cgpa=7.0, acceptance_rate=30, openalex=900, fields=["ai", "ml"]),
        dict(institution="University of Waterloo",
             name="MSc Applied Data Science",
             degree="MSc", country="Canada", qs_rank=112, fee_amount=38000,
             currency="CAD", fee="C$38,000", duration="1.3 years",
             intake="Sep 2026", deadline="2026-02-01", apply_url="https://uwaterloo.ca/graduate-studies/",
             min_cgpa=7.0, acceptance_rate=35, openalex=820, fields=["data-science"]),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── 5. DAAD (daad.de) ────────────────────────────────────────────────────
class DAADAdapter(HESourceAdapter):
    source_name = "daad"
    provider = "German Academic Exchange Service"
    feed = "programmes"
    is_static = True
    # daad.de has no public API; deterministic static mirror of DAAD
    # scholarship listings + partner postgraduate programmes.
    _CATALOG: List[Dict[str, Any]] = [
        dict(institution="RWTH Aachen University", name="MSc Computer Science",
             degree="MSc", country="Germany", qs_rank=90, fee_amount=3500,
             currency="EUR", fee="€3,500/yr", duration="2 years",
             intake="Oct 2026", deadline="2026-06-15", apply_url="https://www.rwth-aachen.de/en",
             min_cgpa=7.0, acceptance_rate=35, openalex=780, fields=["cs"]),
        dict(institution="Humboldt University Berlin", name="MSc Informatics",
             degree="MSc", country="Germany", qs_rank=140, fee_amount=3500,
             currency="EUR", fee="€3,500/yr", duration="2 years",
             intake="Oct 2026", deadline="2026-07-15",
             apply_url="https://www.hu-berlin.de/en",
             min_cgpa=6.5, acceptance_rate=40, openalex=720,
             fields=["cs", "informatics"]),
        dict(feed="scholarships", name="DAAD WISE",
             funder="DAAD Germany", country="Germany", degree_levels=["UG", "PG"],
             award_inr=550000, coverage="₹5.5L stipend + travel",
             deadline="2025-12-15", eligibility="B.E./B.Tech with CGPA ≥ 8.0",
             url="https://www.daad.in/", fields=["science", "engineering"]),
        dict(feed="scholarships", name="DAAD Research Grant",
             funder="DAAD Germany", country="Germany", degree_levels=["PG", "PhD"],
             award_inr=900000, coverage="Stipend + travel for research stay",
             deadline="2026-09-30", eligibility="Research stay 3-24 months",
             url="https://www.daad.de/en/programmes/", fields=["research"]),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── 6. UGC List (ugc.gov.in) ─────────────────────────────────────────────
class UGCListAdapter(HESourceAdapter):
    source_name = "ugc_list"
    provider = "UGC India"
    feed = "programmes"
    is_static = True
    # ugc.gov.in lists recognised postgraduate courses but exposes no API;
    # deterministic static mirror of UGC-recognised programme rows.
    _CATALOG: List[Dict[str, Any]] = [
        dict(institution="IIT Kharagpur", name="M.Tech in AI & Data Science",
             degree="M.Tech", country="India", nirf_rank=5, fee_amount=250000,
             currency="INR", fee="₹2.5L/yr", duration="2 years",
             intake="Aug 2026", deadline="2026-05-20",
             apply_url="https://www.iitkgu.ac.in/admissions",
             min_cgpa=7.5, acceptance_rate=12, openalex=840,
             fields=["ai", "data-science"]),
        dict(institution="NIT Trichy", name="M.Tech in Computer Science",
             degree="M.Tech", country="India", nirf_rank=6, fee_amount=150000,
             currency="INR", fee="₹1.5L/yr", duration="2 years",
             intake="Aug 2026", deadline="2026-05-30", apply_url="https://www.nitt.edu/admissions",
             min_cgpa=7.0, acceptance_rate=18, openalex=700, fields=["cs"]),
        dict(institution="IIT Kanpur", name="PhD in Computer Science",
             degree="PhD", country="India", nirf_rank=9, fee_amount=0,
             currency="INR", fee="Fully Funded", duration="4-5 years",
             intake="Aug 2026", deadline="2026-03-31", apply_url="https://www.iitk.ac.in/admissions",
             min_cgpa=8.0, acceptance_rate=10, openalex=830, fields=["cs", "research"]),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── 7. Buddy4Study (buddy4study.com, 3000+ scholarships) ────────────────
class Buddy4StudyAdapter(HESourceAdapter):
    source_name = "buddy4study"
    provider = "Buddy4Study"
    feed = "scholarships"
    is_static = True
    # buddy4study.com has no public API; deterministic static mirror of
    # representative scholarship listings from the 3000+ catalogue.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Buddy4Study Excellence Scholarship",
             funder="Buddy4Study Foundation", country="Multiple",
             degree_levels=["PG"], award_inr=2000000,
             coverage="Tuition + living for top applicants",
             deadline="2026-05-31", eligibility="CGPA ≥ 8.0; study abroad",
             url="https://buddy4study.com/scholarships/", fields=["any"]),
        dict(name="Schwab Foundation Scholarship",
             funder="Joseph P. Schwab Foundation", country="USA",
             degree_levels=["PG"], award_inr=2500000,
             coverage="Up to $100k for US MS programmes",
             deadline="2026-03-15", eligibility="Full-ride; US universities",
             url="https://www.schwabscholarships.com/", fields=["any"]),
        dict(name="Fulbright DST Programme",
             funder="USIEF", country="USA", degree_levels=["PG"],
             award_inr=3500000,
             coverage="Tuition + stipend + travel + insurance",
             deadline="2026-07-15", eligibility="Bachelor with 55%+; 3+ yr exp",
             url="https://www.usief.org.in/", fields=["any"]),
        dict(name="MEXT Japanese Government Scholarship",
             funder="Ministry of Education, Japan", country="Multiple",
             degree_levels=["PG", "PhD"], award_inr=2200000,
             coverage="Full tuition + stipend for Japan",
             deadline="2026-04-30", eligibility="18-35; embassy examination",
             url="https://www.mext.go.jp/", fields=["any"]),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── 8. Exchange Rates (FREE — open.er-api.com, no key) ──────────────────
class ExchangeRateAdapter(HESourceAdapter):
    source_name = "exchange_rate"
    provider = "open.er-api.com"
    feed = "forex"
    is_static = False

    TARGET_CURRENCIES = ("USD", "GBP", "EUR", "CAD", "AUD", "SGD")

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        try:
            data = await self._get_json("https://open.er-api.com/v6/latest/INR")
            rates = data.get("rates") or {}
            rows = []
            for cur in self.TARGET_CURRENCIES:
                per_inr = rates.get(cur)
                if per_inr:
                    rows.append({"source_id": cur, "currency": cur,
                                 "rate_to_inr": round(1.0 / float(per_inr), 4),
                                 "fx_source": "open.er-api.com"})
            if rows:
                return rows
        except Exception as e:  # noqa: BLE001 — fall back to the static table
            logger.warning("[he_agg] open.er-api.com failed, using fallback: %s", e)
        return [{"source_id": cur, "currency": cur,
                 "rate_to_inr": FX_FALLBACK_TO_INR.get(cur, 1.0),
                 "fx_source": "fallback"}
                for cur in self.TARGET_CURRENCIES]


# ── 9. Numbeo (numbeo.com cost of living) ────────────────────────────────
class NumbeoAdapter(HESourceAdapter):
    source_name = "numbeo"
    provider = "Numbeo"
    feed = "countries"
    is_static = True
    # numbeo.com cost-of-living data is scraped behind browser-only pages;
    # deterministic static mirror of the annual cost-of-living snapshot.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="India", flag="🇮🇳", avg_fee_inr=500000, avg_living_inr=120000),
        dict(name="USA", flag="🇺🇸", avg_fee_inr=4500000, avg_living_inr=1700000),
        dict(name="UK", flag="🇬🇧", avg_fee_inr=2900000, avg_living_inr=1250000),
        dict(name="Canada", flag="🇨🇦", avg_fee_inr=2200000, avg_living_inr=900000),
        dict(name="Germany", flag="🇩🇪", avg_fee_inr=50000, avg_living_inr=900000),
        dict(name="Australia", flag="🇦🇺", avg_fee_inr=2700000, avg_living_inr=1100000),
        dict(name="Singapore", flag="🇸🇬", avg_fee_inr=2500000, avg_living_inr=900000),
        dict(name="Netherlands", flag="🇳🇱", avg_fee_inr=1800000, avg_living_inr=950000),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


ALL_ADAPTERS: List[HESourceAdapter] = [
    QSRankingsAdapter(),
    NIRFRankingsAdapter(),
    OpenAlexAdapter(),
    StudyPortalsAdapter(),
    DAADAdapter(),
    UGCListAdapter(),
    Buddy4StudyAdapter(),
    ExchangeRateAdapter(),
    NumbeoAdapter(),
]
ADAPTERS_BY_NAME: Dict[str, HESourceAdapter] = {a.source_name: a for a in ALL_ADAPTERS}

# detail fields used by the "richest wins" dedup merge
_DETAIL_FIELDS = ("qs_rank", "nirf_rank", "openalex", "acceptance_rate",
                  "min_cgpa", "post_grad_salary_inr", "living_cost_inr",
                  "apply_url", "deadline", "fee_amount")


def _richness(doc: Dict[str, Any]) -> int:
    return sum(1 for f in _DETAIL_FIELDS if doc.get(f) not in (None, 0, ""))


# ─── Aggregator ──────────────────────────────────────────────────────────
class HigherEdAggregator:
    def __init__(self, db=_db):
        self.prog = db[PROG_COL]
        self.schol = db[SCHOL_COL]
        self.country = db[COUNTRY_COL]
        self.forex = db[FOREX_COL]
        self.runs = db[RUN_META]
        self.meta = db[SOURCE_META]

    async def ensure_indexes(self) -> None:
        for col in (self.prog, self.schol, self.country, self.forex):
            await col.create_index([("source", 1), ("source_id", 1)], unique=True)
            await col.create_index([("updated_at", 1)], expireAfterSeconds=TTL_SECONDS)
        await self.prog.create_index([("country", 1), ("degree", 1), ("status", 1)])

    # ── document shaping ─────────────────────────────────────────────────
    def _fx_rate(self, rates: Dict[str, float], currency: Optional[str]) -> float:
        return rates.get((currency or "INR").upper(), 1.0)

    def _to_prog_doc(self, adapter: HESourceAdapter, row: Dict[str, Any],
                     rates: Dict[str, float], now: datetime) -> Dict[str, Any]:
        institution = row.get("institution", "")
        programme = row.get("name", "")
        degree = row.get("degree", "")
        country = row.get("country", "")
        fee_amount = float(row.get("fee_amount") or 0)
        currency = row.get("currency") or "INR"
        fee_inr = int(round(fee_amount * self._fx_rate(rates, currency)))
        duration = row.get("duration") or "2 years"
        years = 2 if "2" in duration and "year" in duration else (
            1 if "1" in duration and "year" in duration else 2)
        living = int(row.get("living_cost_inr") or 0)
        total = (fee_inr * years + living * years) if fee_inr > 0 else living * years
        key = programme_key(institution, programme, degree, country)
        doc = {
            "id": key.replace("|", "-"),
            "source": adapter.source_name,
            "source_id": str(row.get("source_id") or slugify(programme or institution)),
            "institution": institution,
            "name": programme,
            "degree": degree or "PG",
            "country": country,
            "fee": row.get("fee") or ("Fully funded" if fee_amount == 0 else "TBC"),
            "currency": currency,
            "fee_amount": fee_amount,
            "fee_inr": fee_inr,
            "living_cost_inr": living,
            "total_cost_inr": total,
            "duration": duration,
            "mode": row.get("mode") or "Full-time",
            "intake": row.get("intake") or "",
            "intake_date": row.get("intake_date"),
            "deadline": row.get("deadline"),
            "decision_days": row.get("decision_days") or 60,
            "apply_url": row.get("apply_url") or row.get("url") or "",
            "min_cgpa": row.get("min_cgpa"),
            "acceptance_rate": row.get("acceptance_rate"),
            "qs_rank": row.get("qs_rank"),
            "nirf_rank": row.get("nirf_rank"),
            "openalex": row.get("openalex"),
            "post_grad_salary_inr": row.get("post_grad_salary_inr") or 0,
            "gre_required": bool(row.get("gre_required", False)),
            "ielts_required": bool(row.get("ielts_required", False)),
            "fields": row.get("fields") or [],
            "match": None,   # filled below
            "sources": [adapter.source_name],
            "status": "active",
            "updated_at": now,
            "created_at": now,
        }
        doc["match"] = estimate_match(doc)
        return doc

    def _to_schol_doc(self, adapter: HESourceAdapter, row: Dict[str, Any],
                      now: datetime) -> Dict[str, Any]:
        funder = row.get("funder", "")
        name = row.get("name", "")
        degree = (row.get("degree_levels") or ["PG"])[0]
        key = scholarship_key(funder, name, degree)
        return {
            "id": key.replace("|", "-"),
            "source": adapter.source_name,
            "source_id": str(row.get("source_id") or slugify(name)),
            "name": name,
            "funder": funder,
            "country": row.get("country", "Multiple"),
            "degree_levels": row.get("degree_levels") or ["PG"],
            "award_inr": int(row.get("award_inr") or 0),
            "coverage": row.get("coverage", ""),
            "deadline": row.get("deadline"),
            "eligibility": row.get("eligibility", ""),
            "url": row.get("url", ""),
            "fields": row.get("fields") or ["any"],
            "sources": [adapter.source_name],
            "status": "active",
            "updated_at": now,
            "created_at": now,
        }

    def _to_country_doc(self, adapter: HESourceAdapter, row: Dict[str, Any],
                        now: datetime) -> Dict[str, Any]:
        name = row.get("name", "")
        return {
            "id": slugify(name),
            "source": adapter.source_name,
            "source_id": str(row.get("source_id") or slugify(name)),
            "name": name,
            "flag": row.get("flag", ""),
            "avg_fee_inr": int(row.get("avg_fee_inr") or 0),
            "avg_living_inr": int(row.get("avg_living_inr") or 0),
            "programmes": row.get("programmes", 0),
            "scholarships": row.get("scholarships", 0),
            "updated_at": now,
            "created_at": now,
        }

    def _to_forex_doc(self, adapter: HESourceAdapter, row: Dict[str, Any],
                      now: datetime) -> Dict[str, Any]:
        cur = (row.get("currency") or "USD").upper()
        return {
            "source": adapter.source_name,
            "source_id": cur,
            "currency": cur,
            "rate_to_inr": float(row.get("rate_to_inr") or 1.0),
            "fx_source": row.get("fx_source", "open.er-api.com"),
            "updated_at": now,
            "created_at": now,
        }

    # ── fetch / upsert ───────────────────────────────────────────────────
    async def fetch_source(self, name: str) -> Tuple[List[Dict[str, Any]], str]:
        """Returns (rows, status). status ∈ ok | disabled | error | unknown_source.
        Preserves an injected mock client (tests) — it is NOT closed here."""
        adapter = ADAPTERS_BY_NAME.get(name)
        if adapter is None:
            return [], "unknown_source"
        if not await self.source_enabled(name):
            return [], "disabled"
        injected = adapter.http
        if injected is not None:
            client = injected
        else:
            client = httpx.AsyncClient(
                timeout=PER_API_TIMEOUT_S, headers={"User-Agent": USER_AGENT})
            adapter.http = client
        try:
            rows = await adapter.fetch_rows()
            return (rows or []), "ok"
        except Exception as e:  # noqa: BLE001 — isolate per adapter
            logger.warning("[he_agg] source %s failed: %s", name, e)
            return [], "error"
        finally:
            if injected is None:
                await client.aclose()
            else:
                adapter.http = None

    async def source_enabled(self, name: str) -> bool:
        doc = await self.meta.find_one({"source": name})
        return doc.get("enabled", True) if doc else True

    async def get_fx_rates(self) -> Dict[str, float]:
        """Live FX cache ∪ fallback table (cache wins)."""
        rates: Dict[str, float] = dict(FX_FALLBACK_TO_INR)
        try:
            docs = await self.forex.find({}).to_list(length=64)
        except Exception:  # noqa: BLE001
            docs = []
        for d in docs:
            if d.get("currency"):
                rates[d["currency"]] = float(d.get("rate_to_inr") or 1.0)
        return rates

    async def upsert_rows(self, name: str, rows: List[Dict[str, Any]],
                          now: datetime, rates: Dict[str, float]) -> int:
        adapter = ADAPTERS_BY_NAME[name]
        upserted = 0
        for row in rows:
            feed = row.get("feed") or adapter.feed
            if feed == "programmes":
                doc = self._to_prog_doc(adapter, row, rates, now)
                col = self.prog
            elif feed == "scholarships":
                doc = self._to_schol_doc(adapter, row, now)
                col = self.schol
            elif feed == "countries":
                doc = self._to_country_doc(adapter, row, now)
                col = self.country
            elif feed == "forex":
                doc = self._to_forex_doc(adapter, row, now)
                col = self.forex
            else:
                continue
            res = await col.update_one(
                {"source": name, "source_id": doc["source_id"]},
                {"$set": {k: v for k, v in doc.items() if k != "created_at"},
                 "$setOnInsert": {"created_at": now}},
                upsert=True,
            )
            if res.upserted_id:
                upserted += 1
        return upserted

    async def run_source(self, name: str) -> Dict[str, Any]:
        rows, status = await self.fetch_source(name)
        now = _utcnow()
        if status == "ok":
            rates = await self.get_fx_rates()
            upserted = await self.upsert_rows(name, rows, now, rates)
            return {"source": name, "status": "ok", "fetched": len(rows),
                    "upserted": upserted}
        return {"source": name, "status": status, "fetched": 0, "upserted": 0}

    # ── dedup (compound key; richest detail wins) ───────────────────────
    async def dedup_run(self, sources: Optional[List[str]] = None,
                        collection: str = PROG_COL) -> int:
        col = self.prog if collection == PROG_COL else self.schol
        flt: Dict[str, Any] = {"status": "active"}
        if sources:
            flt["source"] = {"$in": list(sources)}
        docs = await col.find(flt).to_list(length=5000)
        groups: Dict[str, List[Dict[str, Any]]] = {}
        for d in docs:
            groups.setdefault(d.get("id", ""), []).append(d)
        marked = 0
        for group in groups.values():
            if len(group) < 2:
                continue
            group.sort(key=_richness, reverse=True)
            winner = group[0]
            for loser in group[1:]:
                for f in _DETAIL_FIELDS:
                    wv, lv = winner.get(f), loser.get(f)
                    if wv in (None, 0, "") and lv not in (None, 0, ""):
                        winner[f] = lv
                winner.setdefault("sources", [])
                for s in loser.get("sources") or [loser.get("source")]:
                    if s not in winner["sources"]:
                        winner["sources"].append(s)
                await col.update_one(
                    {"_id": loser["_id"]},
                    {"$set": {"status": "duplicate", "duplicate_of": winner.get("id"),
                               "updated_at": _utcnow()}})
                marked += 1
            if marked:
                merged = {"sources": winner["sources"], "updated_at": _utcnow()}
                for f in _DETAIL_FIELDS:
                    if winner.get(f) not in (None, 0, ""):
                        merged[f] = winner[f]
                await col.update_one(
                    {"_id": winner["_id"]}, {"$set": merged})
        return marked

    # ── run / status ─────────────────────────────────────────────────────
    async def run(self, source: Optional[str] = None) -> Dict[str, Any]:
        await self.ensure_indexes()
        names = [source] if source else list(ADAPTERS_BY_NAME)
        summary = await asyncio.gather(*(self.run_source(n) for n in names))
        # FX rows just upserted now enrich the FX table for next runs;
        # re-dedup the two keyed caches after this run's upserts.
        dup_prog = await self.dedup_run(
            [source] if source else None, PROG_COL)
        dup_schol = await self.dedup_run(
            [source] if source else None, SCHOL_COL)
        report = {
            "ran_at": _utcnow().isoformat(),
            "results": list(summary),
            "dupes_marked": dup_prog + dup_schol,
            "total_programmes":
                await self.prog.count_documents({"status": "active"}),
            "total_scholarships":
                await self.schol.count_documents({"status": "active"}),
            "total_countries": await self.country.count_documents({}),
        }
        await self.runs.insert_one({**report, "_id": ObjectId()})
        logger.info("[he_agg] run complete: %d sources, %d dupes marked",
                    len(summary), report["dupes_marked"])
        return report

    async def status(self) -> Dict[str, Any]:
        last = await self.runs.find_one({}, sort=[("ran_at", -1)])
        per_source = []
        for name, adapter in ADAPTERS_BY_NAME.items():
            sdoc = await self.meta.find_one({"source": name})
            feed = adapter.feed
            col = (self.prog if feed == "programmes" else
                   self.schol if feed == "scholarships" else
                   self.country if feed == "countries" else self.forex)
            count = await col.count_documents({"source": name})
            per_source.append({
                "source": name,
                "enabled": sdoc.get("enabled", True) if sdoc else True,
                "doc_count": count,
            })
        return {
            "collections": {
                "programmes": await self.prog.count_documents({"status": "active"}),
                "scholarships": await self.schol.count_documents({"status": "active"}),
                "countries": await self.country.count_documents({}),
                "forex": await self.forex.count_documents({}),
            },
            "last_run_at": last.get("ran_at") if last else None,
            "last_results": last.get("results") if last else [],
            "sources": per_source,
        }


aggregator = HigherEdAggregator()


async def run_aggregation(source: Optional[str] = None) -> Dict[str, Any]:
    return await aggregator.run(source)


# ─── Cache readers (used by features/higher_ed_platform) ────────────────
def _strip(d: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(d)
    out.pop("_id", None)
    return out


async def read_programme_cache() -> List[Dict[str, Any]]:
    docs = await aggregator.prog.find({"status": "active"}).to_list(length=5000)
    return [_strip(d) for d in docs]


async def read_scholarship_cache() -> List[Dict[str, Any]]:
    docs = await aggregator.schol.find({"status": "active"}).to_list(length=5000)
    return [_strip(d) for d in docs]


async def read_country_cache() -> List[Dict[str, Any]]:
    docs = await aggregator.country.find({}).to_list(length=5000)
    return [_strip(d) for d in docs]


async def get_fx_cache() -> Dict[str, float]:
    return await aggregator.get_fx_rates()


# ─── Scheduler ───────────────────────────────────────────────────────────
_scheduler: Optional[Any] = None


def _flag_set(var: str, default: str) -> bool:
    val = (os.environ.get(var) or default).strip().lower()
    return val in {"1", "true", "yes", "on"}


def start_higher_ed_aggregator_scheduler() -> None:
    """Start the daily 03:00 IST cron + optional startup catch-up run.
    Called from server.py under leader election (single-worker safe)."""
    global _scheduler
    if _scheduler is not None:
        return
    if not _flag_set("HE_AGGREGATOR_CRON_ENABLED", "1"):
        logger.info("[he_agg] cron disabled via HE_AGGREGATOR_CRON_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz
        ist = pytz.timezone("Asia/Kolkata")
        _scheduler = AsyncIOScheduler(timezone=ist)
        _scheduler.add_job(
            run_aggregation,
            CronTrigger(hour=3, minute=0, timezone=ist),
            id="higher_ed_aggregator_daily",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _scheduler.start()
        logger.info("[he_agg] daily aggregator cron started (03:00 IST)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[he_agg] failed to start scheduler: %s", e)

    if _flag_set("HE_AGGREGATOR_RUN_ON_STARTUP", "1"):
        async def _startup_run():
            try:
                last = await aggregator.runs.find_one({}, sort=[("ran_at", -1)])
                last_at = last.get("ran_at") if last else None
                if last_at:
                    last_dt = datetime.fromisoformat(last_at)
                    if _utcnow() - last_dt < timedelta(hours=STARTUP_STALE_HOURS):
                        return
                await run_aggregation()
            except Exception as e:  # noqa: BLE001
                logger.warning("[he_agg] startup run failed: %s", e)
        asyncio.ensure_future(_startup_run())


def stop_higher_ed_aggregator_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
        _scheduler = None


# ─── Admin endpoints (super_admin only) ─────────────────────────────────
from core.deps import get_current_user  # noqa: E402


async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    """Strict super_admin gate (require_role would let 'admin' through via
    the admin-bypass; these endpoints are super_admin only)."""
    if (user.get("role") or "").lower() not in {"super_admin", "superadmin"}:
        raise HTTPException(403, "super_admin role required")
    return user


# Public router — the platform-facing manual trigger (roadmap H1: POST /he/refresh)
router = APIRouter()


@router.post("/he/refresh")
async def he_refresh(source: Optional[str] = Query(None),
                     user: dict = Depends(require_super_admin)):
    """Admin manual trigger of the 24h higher-ed aggregation run."""
    if source and source not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown higher-ed aggregator source '{source}'")
    report = await run_aggregation(source)
    return {"ok": True, **report}


# Admin router — status + per-source toggles (lineage convention, like
# /admin/rentals-aggregator and /admin/deals-aggregator)
admin_router = APIRouter(
    prefix="/admin/he-aggregator",
    tags=["admin-he-aggregator"],
)


class SourceToggle(BaseModel):
    enabled: bool


@admin_router.get("/status")
async def he_status(user: dict = Depends(require_super_admin)):
    return await aggregator.status()


@admin_router.patch("/sources/{name}")
async def toggle_source(name: str, body: SourceToggle,
                        user: dict = Depends(require_super_admin)):
    if name not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown higher-ed aggregator source '{name}'")
    await aggregator.meta.update_one(
        {"source": name},
        {"$set": {"enabled": body.enabled, "updated_at": _utcnow()}},
        upsert=True,
    )
    return {"source": name, "enabled": body.enabled}
