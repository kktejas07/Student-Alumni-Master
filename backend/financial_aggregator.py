"""
financial_aggregator.py — 24-hour Financial Products Aggregator Bot
(roadmap F1).

Refreshes the shared ``financial_products`` collection every 24h (daily
05:00 IST cron) so the /financial platform serves live rates, deadlines and
funding windows instead of only the hardcoded curated catalog:

  - 5 adapter groups (one pluggable adapter per source, httpx-based,
    per-adapter error isolation):
      ScholarshipAggregator   — NSP, Buddy4Study, IndiaScholarships.in,
                                 state portals (TS ePass, AP Jnanabhumi)
      LoanRateRefresher       — GradRight, WeMakeScholars, BankBazaar,
                                 Vidyalaxmi (govt scheme)
      StartupFundingTracker   — StartupGrantsIndia, Startup India portal,
                                 govt schemes (BIRAC, AIM, MeitY)
      InsurancePremiumRefresher — PolicyBazaar student plans, Coverfox,
                                 IRDAI data
      VCDirectoryUpdater      — OpenVC India, VCDir.com, Inc42 directory

Design mirrors features/higher_ed_aggregator + services/course_aggregator:
  - curated catalog rows are upserted into financial_products as the
    "verified" tier (tier="verified", source="curated"); scraped rows
    overlay live rates/deadlines onto matching verified docs and insert
    new products otherwise
  - dedup on ``slugify(name)|slugify(provider)|category`` (spec key); the
    md5 dedup_hash is computed identically to features/financial_services
    so scraped rows can find and overlay their verified counterpart
  - adapters without a stable public API serve a deterministic static
    catalog instead of scraping (documented on each adapter)
  - refresh tiers: 1 = quarterly seed (daily cron keeps it fresh),
    2 = monthly refresh (run daily by the cron), 3 = on-demand
    (Coverfox + the EMI/80E calculators live in financial_services) —
    tier 3 only refreshes via the manual trigger
  - APScheduler CronTrigger(hour=5, minute=0) tz Asia/Kolkata,
    leader-elected in server.py
  - env-gated: FINANCIAL_AGGREGATOR_CRON_ENABLED (default 1) /
    FINANCIAL_AGGREGATOR_RUN_ON_STARTUP (default 1, catch-up when the
    last run is >24h stale)

Collections (financial_products already exists, owned by
features/financial_services.py):
  financial_products          — verified + scraped product docs
  financial_aggregator_runs   — run reports
  financial_aggregator_sources— per-source enable/disable meta

Admin (super_admin only):
  POST  /financial/aggregate                  (manual trigger; ?source=&tier=)
  GET   /admin/financial-aggregator/status
  PATCH /admin/financial-aggregator/sources/{name}  {"enabled": bool}
"""
from __future__ import annotations

import abc
import asyncio
import hashlib
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
from core.catalogs.financial import FINANCIAL_CATALOG

logger = logging.getLogger("financial_aggregator")

PRODUCTS_COL = "financial_products"
RUN_META = "financial_aggregator_runs"
SOURCE_META = "financial_aggregator_sources"

USER_AGENT = "StudentAlumniBot/1.0 (+https://studentalumni.in)"
PER_API_TIMEOUT_S = 15.0
STARTUP_STALE_HOURS = 24

# Categories the cron refreshes daily (tiers 1+2); tier 3 is on-demand only.
CRON_TIERS = {1, 2}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slugify(text: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(text or "").lower()).strip("-")
    return slug[:max_len].rstrip("-") or "x"


def dedup_key(name: str, provider: str, category: str) -> str:
    """Spec dedup key: slugify(name) + slugify(provider) + category."""
    return f"{slugify(name)}|{slugify(provider)}|{category}"


def dedup_hash(name: str, provider: str, category: str) -> str:
    """MD5 mirror of features/financial_services._dh — same identity."""
    raw = (f"{(name or '').lower().strip()}"
           f"|{(provider or '').lower().strip()}|{category}")
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


# Overlay fields a scraped row may refresh on a matching verified doc.
OVERLAY_FIELDS = ("interest_rate", "tenure_months", "application_deadline",
                  "status", "amount_min", "amount_max", "application_url")

# detail fields the richest-wins merge backfills across sources
_DETAIL_FIELDS = ("interest_rate", "tenure_months", "amount_min", "amount_max",
                  "application_deadline", "application_url", "short_desc")


# ─── Adapters ────────────────────────────────────────────────────────────
class FinancialSourceAdapter(abc.ABC):
    """One pluggable financial-product source. ``fetch_rows`` returns rows
    in the product shape for ``category``; the aggregator shapes them into
    financial_products documents (see FinancialAggregator)."""

    source_name: ClassVar[str] = "base"
    provider: ClassVar[str] = ""
    category: ClassVar[str] = "scholarship"
    tier: ClassVar[int] = 1
    api_key_env: ClassVar[Optional[str]] = None
    is_static: ClassVar[bool] = False

    def __init__(self, http: Optional[httpx.AsyncClient] = None):
        self.http = http

    @abc.abstractmethod
    async def fetch_rows(self) -> List[Dict[str, Any]]:
        ...

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


# ── ScholarshipAggregator group ───────────────────────────────────────────
class NSPScholarshipAdapter(FinancialSourceAdapter):
    source_name = "nsp"
    provider = "National Scholarship Portal (NSP)"
    category = "scholarship"
    tier = 1
    is_static = True
    # scholarships.gov.in is a portal with no public API; deterministic
    # static mirror of the current-year NSP central-scheme listings.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="PM YASASVI Scholarship", provider="National Scholarship Portal",
             amount_min=10000, amount_max=25000, subcategory="merit-cum-need",
             application_deadline="2026-11-30T23:59:00+00:00", status="open",
             application_url="https://scholarships.gov.in",
             eligibility_criteria=["Class 11-12 / UG / PG", "Family income < ₹2.5L"],
             short_desc=("Central sector scholarship "
                         "for students from low-income families")),
        dict(name="Post-Matric Scholarship for Minorities",
             provider="NSP (Minority Affairs)",
             amount_min=10000, amount_max=25000, subcategory="need-based",
             application_deadline="2026-12-15T23:59:00+00:00", status="open",
             application_url="https://scholarships.gov.in",
             eligibility_criteria=[
                 "Minority community", "Post-matric admission",
                 "Income < ₹6L"],
             short_desc="₹10k–₹25k per year for minority students."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class Buddy4StudyScholarshipAdapter(FinancialSourceAdapter):
    source_name = "buddy4study"
    provider = "Buddy4Study"
    category = "scholarship"
    tier = 1
    is_static = True
    # buddy4study.com (3000+ listings) has no public API; deterministic
    # static mirror of representative flagship scholarships.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Buddy4Study Merit Scholarship", provider="Buddy4Study",
             amount_min=100000, amount_max=2000000, subcategory="merit",
             application_deadline="2026-08-31T23:59:00+00:00", status="open",
             application_url="https://buddy4study.com/scholarships/",
             eligibility_criteria=["CGPA 7.5+", "UG or PG"],
             short_desc="Flagship merit scholarships across 3000+ listings."),
        dict(name="Buddy4Study Study Abroad Award", provider="Buddy4Study",
             amount_min=500000, amount_max=2500000, subcategory="merit",
             application_deadline="2026-09-30T23:59:00+00:00", status="open",
             application_url="https://buddy4study.com/scholarships/abroad/",
             eligibility_criteria=["CGPA 8.0+", "Admission to foreign university"],
             short_desc="Tuition support for top-ranked study-abroad admits."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class IndiaScholarshipsAdapter(FinancialSourceAdapter):
    source_name = "indiascholarships"
    provider = "IndiaScholarships.in"
    category = "scholarship"
    tier = 1
    is_static = True
    # indiascholarships.in publishes listings without an API; deterministic
    # static mirror of currently-running private trusts.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Vidya Prada Scholarship", provider="IndiaScholarships.in",
             amount_min=5000, amount_max=50000, subcategory="need-based",
             application_deadline="2026-10-31T23:59:00+00:00", status="open",
             application_url="https://indiascholarships.in/",
             eligibility_criteria=["Family income < ₹1L", "Any university course"],
             short_desc="₹500–₹5000/month for economically weaker students."),
        dict(name="Guru Nanak Memorial Scholarship", provider="IndiaScholarships.in",
             amount_min=15000, amount_max=30000, subcategory="merit",
             application_deadline="2026-09-15T23:59:00+00:00", status="open",
             application_url="https://indiascholarships.in/",
             eligibility_criteria=["CGPA 8.0+", "PG admission"],
             short_desc="₹15k–₹30k award for postgraduate toppers."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class TSEPassAdapter(FinancialSourceAdapter):
    source_name = "ts_epass"
    provider = "Government of Telangana (TS ePass)"
    category = "scholarship"
    tier = 2
    is_static = True
    # tePASS (epass.telangana.gov.in) is a state portal without an API;
    # deterministic static mirror of the annual state-engineering awards.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Telangana Engineering Scholarship (ePASS)",
             provider="Government of Telangana (TS ePass)",
             amount_min=45000, amount_max=45000, subcategory="need-based",
             application_deadline="2026-11-15T23:59:00+00:00", status="open",
             application_url="https://epass.telangana.gov.in",
             eligibility_criteria=[
                 "Telangana domicile", "UG engineering", "Income < ₹10L"],
             short_desc="₹45k/year for Telangana engineering students."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class APJnanabhumiAdapter(FinancialSourceAdapter):
    source_name = "ap_jnanabhumi"
    provider = "Government of Andhra Pradesh (Jnanabhumi)"
    category = "scholarship"
    tier = 2
    is_static = True
    # jnanabhumi.ap.gov.in has no public API; deterministic static mirror
    # of the state merit-award listings.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="AP State Merit Scholarship for PG",
             provider="Government of Andhra Pradesh (Jnanabhumi)",
             amount_min=30000, amount_max=30000, subcategory="merit",
             application_deadline="2026-10-20T23:59:00+00:00", status="open",
             application_url="https://jnanabhumi.ap.gov.in",
             eligibility_criteria=[
                 "AP domicile", "PG admission",
                 "Top 20% in prior degree"],
             short_desc="₹30k/year merit award for AP postgraduates."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── LoanRateRefresher group ───────────────────────────────────────────────
class GradRightAdapter(FinancialSourceAdapter):
    source_name = "gradright"
    provider = "GradRight"
    category = "loan"
    tier = 2
    is_static = True
    # gradright.co.in rate cards change monthly but expose no API;
    # deterministic static mirror of the current personal-loan card.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="GradRight Personal Loan", provider="GradRight",
             amount_min=50000, amount_max=500000, interest_rate=12.5,
             tenure_months=36, subcategory="personal_bank",
             application_url="https://www.gradright.co.in",
             eligibility_criteria=["Salary account", "CIBIL 700+", "No collateral"],
             short_desc="Quick-approval personal loans from ₹50k."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class WeMakeScholarsAdapter(FinancialSourceAdapter):
    source_name = "wemakescholars"
    provider = "WeMakeScholars"
    category = "loan"
    tier = 2
    is_static = True
    # wemakescholars.com lists education-loan products without an API;
    # deterministic static mirror of the featured loan.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="WeMakeScholars Education Loan", provider="WeMakeScholars",
             amount_min=100000, amount_max=2000000, interest_rate=10.99,
             tenure_months=120, subcategory="NBFC",
             application_url="https://www.wemakescholars.com",
             eligibility_criteria=["Indian citizen", "Co-applicant", "Any institution"],
             short_desc="₹1L–₹20L education loans at 10.99% p.a."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class BankBazaarAdapter(FinancialSourceAdapter):
    source_name = "bankbazaar"
    provider = "BankBazaar"
    category = "loan"
    tier = 1
    is_static = True
    # bankbazaar.com aggregates bank rate cards with no public API;
    # deterministic static mirror of its best education-loan comparison.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="BankBazaar Best Education Loan Offer", provider="BankBazaar",
             amount_min=100000, amount_max=15000000, interest_rate=8.1,
             tenure_months=180, subcategory="public_bank",
             application_url="https://www.bankbazaar.com/education-loans/",
             eligibility_criteria=[
                 "Compare 30+ banks", "Pre & post degree",
                 "Overseas cover"],
             short_desc="Lowest published education-loan rate among partner banks."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class VidyalaxmiAdapter(FinancialSourceAdapter):
    source_name = "vidyalaxmi"
    provider = "Vidyalaxmi · PMSS (PFS)"
    category = "loan"
    tier = 1
    is_static = True
    # vidyalakshmi.co.in is the govt portal for the Pradhan Mantri
    # Vidyalaxmi scheme; no API, static mirror of the subsidised card.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Vidyalaxmi Subsidised Scheme Loan",
             provider="Government of India (Vidyalaxmi)",
             amount_min=50000, amount_max=1000000, interest_rate=8.0,
             tenure_months=120, subcategory="govt_scheme",
             application_url="https://www.vidyalakshmi.co.in",
             eligibility_criteria=[
                 "NIRF top-100 institute", "Income < ₹4.5L for subsidy"],
             short_desc=("Govt-backed scheme with an interest "
                         "subsidy for low-income families")),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── StartupFundingTracker group ───────────────────────────────────────────
class StartupGrantsIndiaAdapter(FinancialSourceAdapter):
    source_name = "startup_grants_india"
    provider = "StartupGrantsIndia"
    category = "startup_funding"
    tier = 1
    is_static = True
    # startupgrantsindia.in indexes 400+ grants without a public API;
    # deterministic static mirror of its flagship listings.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="StartupGrantsIndia Match Fund", provider="StartupGrantsIndia",
             amount_min=500000, amount_max=5000000, subcategory="grant",
             institution_name="StartupGrantsIndia",
             application_url="https://startupgrantsindia.in",
             eligibility_criteria=["400+ grant index", "Idea to early stage"],
             short_desc="Curated access to 400+ Indian startup grants.",
             stage="pre_seed"),
        dict(name="StartupGrantsIndia Accelerator Grant", provider="StartupGrantsIndia",
             amount_min=200000, amount_max=1000000, subcategory="grant_mentorship",
             institution_name="StartupGrantsIndia",
             application_url="https://startupgrantsindia.in/accelerator",
             eligibility_criteria=["6-month program", "MVP required"],
             short_desc="Grant + mentorship for early-stage Indian startups.",
             stage="seed"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class StartupIndiaPortalAdapter(FinancialSourceAdapter):
    source_name = "startup_india_portal"
    provider = "Startup India Portal"
    category = "startup_funding"
    tier = 2
    is_static = True
    # startupindia.gov.in publishes scheme pages only; deterministic
    # static mirror of the market-access fund line.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Startup India SEED — Market Access Fund",
             provider="DPIIT · Govt of India",
             amount_min=500000, amount_max=2000000, subcategory="grant_mentorship",
             institution_name="Startup India",
             application_url="https://www.startupindia.gov.in",
             eligibility_criteria=["DPIIT-recognised", "Market-entry expense"],
             short_desc="Reimbursement-style fund for market access and events.",
             stage="pre_seed"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class BIRACAdapter(FinancialSourceAdapter):
    source_name = "birac"
    provider = "BIRAC (Govt of India)"
    category = "startup_funding"
    tier = 2
    is_static = True
    # birac.nic.in runs annual call windows with no API; deterministic
    # static mirror of the ATIRA award card.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="BIRAC ATIRA Grant", provider="BIRAC (Govt of India)",
             amount_min=1000000, amount_max=50000000, subcategory="grant",
             institution_name="BIRAC",
             application_url="https://birac.nic.in",
             eligibility_criteria=["Biotech / pharma / agri", "Indian startup"],
             short_desc="Annual innovation grants up to ₹5Cr for deep-bio startups.",
             stage="seed"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class AIMAdapter(FinancialSourceAdapter):
    source_name = "aim"
    provider = "Atal Innovation Mission"
    category = "startup_funding"
    tier = 2
    is_static = True
    # aim.gov.in publishes scheme pages; deterministic static mirror of the
    # AIDE award card.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="AIM AIDE Startup Grant", provider="NITI Aayog · AIM",
             amount_min=1000000, amount_max=10000000, subcategory="grant",
             institution_name="AIM",
             application_url="https://aim.gov.in",
             eligibility_criteria=["Prototype ready", "Innovation focus"],
             short_desc="Up to ₹1Cr for Atal Incubator–backed startups.",
             stage="early"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class MeitYAdapter(FinancialSourceAdapter):
    source_name = "meity"
    provider = "MeitY (Govt of India)"
    category = "startup_funding"
    tier = 2
    is_static = True
    # meity.gov.in grant windows have no API; deterministic static mirror
    # of the deep-tech grant card.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="MeitY Deep-Tech Startup Grant", provider="MeitY · Govt of India",
             amount_min=500000, amount_max=2500000, subcategory="grant",
             institution_name="MeitY",
             application_url="https://www.meity.gov.in",
             eligibility_criteria=[
                 "AI / quantum / deeptech", "Indian registered entity"],
             short_desc="₹5L–₹25L grants for AI and deep-tech startups.",
             stage="pre_seed", sector_focus="ai, deep tech, quantum"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── InsurancePremiumRefresher group ───────────────────────────────────────
class PolicyBazaarAdapter(FinancialSourceAdapter):
    source_name = "policybazaar"
    provider = "PolicyBazaar"
    category = "insurance"
    tier = 2
    is_static = True
    # policybazaar.com publishes student-plan premium cards without an
    # API; deterministic static mirror of the student plans.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="PolicyBazaar Student Health Plan", provider="PolicyBazaar",
             amount_min=500000, amount_max=1000000, interest_rate=3200,
             subcategory="health",
             application_url="https://www.policybazaar.com/insurance/health",
             eligibility_criteria=[
                 "Age 18-30", "Cashless hospitals",
                 "No pre-existing cap"],
             short_desc="₹3,200/yr student health cover with cashless 3k+ hospitals."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class CoverfoxAdapter(FinancialSourceAdapter):
    source_name = "coverfox"
    provider = "Coverfox"
    category = "insurance"
    tier = 3
    is_static = True
    # coverfox.co.in premium calculators run in-browser; deterministic
    # static mirror of the student mediclaim + travel cards (tier 3 =
    # on-demand refresh only, per the 3-tier strategy).
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Coverfox Student Mediclaim", provider="Coverfox",
             amount_min=500000, amount_max=5000000, interest_rate=2800,
             subcategory="health",
             application_url="https://www.coverfox.co.in",
             eligibility_criteria=["Age 18-25", "No medical tests", "Day-care covered"],
             short_desc=("₹2,800/yr student mediclaim with day-care "
                         "and maternity add-ons")),
        dict(name="Coverfox Travel Shield", provider="Coverfox",
             amount_min=1000000, amount_max=5000000, interest_rate=1200,
             subcategory="travel",
             application_url="https://www.coverfox.co.in",
             eligibility_criteria=["Single / multi-trip", "Trip-cancellation cover"],
             short_desc="₹1,200/yr travel cover with cancellation + baggage."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class IRDAIAdapter(FinancialSourceAdapter):
    source_name = "irdai"
    provider = "IRDAI"
    category = "insurance"
    tier = 1
    is_static = True
    # irdai.gov.in publishes regulator data, not product APIs;
    # deterministic static mirror of a standard-regulation cover card.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="IRDAI Standard Term Life Plan", provider="IRDAI",
             amount_min=500000, amount_max=20000000, interest_rate=950,
             subcategory="life",
             application_url="https://www.irdai.gov.in",
             eligibility_criteria=["Regulated term plan", "Age 18-50"],
             short_desc="₹950/yr regulated term cover benchmark from IRDAI data."),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


# ── VCDirectoryUpdater group ──────────────────────────────────────────────
class OpenVCIndiaAdapter(FinancialSourceAdapter):
    source_name = "openvc_india"
    provider = "OpenVC India"
    category = "venture_capital"
    tier = 1
    is_static = True
    # openvcindia.in indexes 500+ VCs without a public API; deterministic
    # static mirror of representative funds.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="OpenVC India Seed Fund", provider="OpenVC India",
             amount_min=5000000, amount_max=50000000, subcategory="early",
             institution_name="OpenVC",
             application_url="https://openvcindia.in",
             eligibility_criteria=["Pre-seed/seed", "Tech-first founders"],
             short_desc="₹50L–₹5Cr seed checks across 500+ indexed Indian VCs.",
             stage="seed", sector_focus="saas, fintech, deep tech"),
        dict(name="OpenVC India Angels Network", provider="OpenVC India",
             amount_min=500000, amount_max=10000000, subcategory="seed",
             institution_name="OpenVC",
             application_url="https://openvcindia.in/angels",
             eligibility_criteria=["Angel round", "India-HQ startups"],
             short_desc="Angel checks from the OpenVC network.",
             stage="pre_seed", sector_focus="all sectors"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class VCDirAdapter(FinancialSourceAdapter):
    source_name = "vcdir"
    provider = "VCDir.com"
    category = "venture_capital"
    tier = 2
    is_static = True
    # vcdir.com's directory has no API; deterministic static mirror of a
    # directory-featured fund.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="VCDir Verified Consumer Fund", provider="VCDir.com",
             amount_min=25000000, amount_max=200000000, subcategory="early_growth",
             institution_name="VCDir",
             application_url="https://vcdir.com",
             eligibility_criteria=["Series A onwards", "India consumer"],
             short_desc="Directory-verified consumer fund with published ticket sizes.",
             stage="series_a", sector_focus="consumer, commerce"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


class Inc42Adapter(FinancialSourceAdapter):
    source_name = "inc42"
    provider = "Inc42"
    category = "venture_capital"
    tier = 2
    is_static = True
    # inc42.com's VC directory and deal data expose no API; deterministic
    # static mirror of an Inc42-tracked fund.
    _CATALOG: List[Dict[str, Any]] = [
        dict(name="Inc42 Tracked Fund — India Tech", provider="Inc42 Media",
             amount_min=10000000, amount_max=100000000, subcategory="early",
             institution_name="Inc42",
             application_url="https://inc42.com",
             eligibility_criteria=["Seed to Series A", "India-focused"],
             short_desc="Inc42-tracked fund with published check sizes.",
             stage="seed", sector_focus="all sectors"),
    ]

    async def fetch_rows(self) -> List[Dict[str, Any]]:
        return self._static(self._CATALOG)


ALL_ADAPTERS: List[FinancialSourceAdapter] = [
    NSPScholarshipAdapter(),
    Buddy4StudyScholarshipAdapter(),
    IndiaScholarshipsAdapter(),
    TSEPassAdapter(),
    APJnanabhumiAdapter(),
    GradRightAdapter(),
    WeMakeScholarsAdapter(),
    BankBazaarAdapter(),
    VidyalaxmiAdapter(),
    StartupGrantsIndiaAdapter(),
    StartupIndiaPortalAdapter(),
    BIRACAdapter(),
    AIMAdapter(),
    MeitYAdapter(),
    PolicyBazaarAdapter(),
    CoverfoxAdapter(),
    IRDAIAdapter(),
    OpenVCIndiaAdapter(),
    VCDirAdapter(),
    Inc42Adapter(),
]
ADAPTERS_BY_NAME: Dict[str, FinancialSourceAdapter] = {
    a.source_name: a for a in ALL_ADAPTERS
}


def _richness(doc: Dict[str, Any]) -> int:
    return sum(1 for f in _DETAIL_FIELDS if doc.get(f) not in (None, 0, ""))


# ─── Aggregator ──────────────────────────────────────────────────────────
class FinancialAggregator:
    def __init__(self, db=_db):
        self.products = db[PRODUCTS_COL]
        self.runs = db[RUN_META]
        self.meta = db[SOURCE_META]

    async def ensure_indexes(self) -> None:
        # financial_products is shared with features/financial_services,
        # whose seeded rows predate the aggregator's fields — so no unique
        # keys here (a unique build would hit null-dup on those rows);
        # dedup itself is enforced in upsert_scraped / seed_verified.
        await self.products.create_index([("dedup_key", 1)])
        await self.products.create_index([("source", 1), ("source_id", 1)])
        await self.products.create_index(
            [("category", 1), ("tier", 1), ("status", 1)])

    # ── document shaping (mirrors financial_services._seed_doc) ─────────
    def _product_doc(self, adapter_or_none: Optional[FinancialSourceAdapter],
                     row: Dict[str, Any], now: datetime,
                     tier: str) -> Dict[str, Any]:
        category = (adapter_or_none.category if adapter_or_none
                    else row.get("category", "scholarship"))
        name = row.get("name", "")
        provider_default = (adapter_or_none.provider
                           if adapter_or_none else "")
        provider = row.get("provider", provider_default)
        h = dedup_hash(name, provider, category)
        source_name = (adapter_or_none.source_name if adapter_or_none else "curated")
        doc = {
            "financial_id": f"{category}-{h[:10]}",
            "dedup_hash": h,
            "dedup_key": dedup_key(name, provider, category),
            "category": category,
            "name": name,
            "provider": provider,
            "subcategory": row.get("subcategory", ""),
            "institution_name": row.get("institution_name", provider),
            "amount_min": row.get("amount_min", 0),
            "amount_max": row.get("amount_max", 0),
            "currency": row.get("currency", "INR"),
            "interest_rate": row.get("interest_rate"),
            "tenure_months": row.get("tenure_months"),
            "eligibility_criteria": row.get("eligibility_criteria", []),
            "application_deadline": row.get("application_deadline"),
            "status": row.get("status", "open"),
            "application_url": row.get("application_url", ""),
            "tint": row.get("tint", "#7C3AED"),
            "short_desc": row.get("short_desc", ""),
            "stage": row.get("stage"),
            "sector_focus": row.get("sector_focus", ""),
            "region": "india",
            "is_active": True,
            "tier": tier,
            "source": source_name,
            "source_id": str(row.get("source_id") or source_name),
            "sources": [source_name],
            "updated_at": now,
        }
        return doc

    # ── verified tier (curated catalog) ──────────────────────────────────
    async def seed_verified(self, now: datetime) -> int:
        """Upsert the curated catalog as tier 'verified'. Bare rows seeded
        by financial_services._ensure_seeded gain tier/dedup_key here;
        existing docs only get gap-filled so a scraped overlay
        (live rates/deadlines) survives re-seeding."""
        upserted = 0
        for cat in sorted(FINANCIAL_CATALOG):
            for j, item in enumerate(FINANCIAL_CATALOG[cat]):
                row = dict(item)
                row.setdefault("category", cat)
                doc = self._product_doc(None, row, now, "verified")
                doc["source_id"] = f"curated-{cat}-{j}"
                base = {k: v for k, v in doc.items() if k != "created_at"}
                existing = await self.products.find_one(
                    {"dedup_hash": doc["dedup_hash"]})
                if existing:
                    fill = {k: v for k, v in base.items()
                            if existing.get(k) in (None, 0, "")}
                    if fill:
                        await self.products.update_one(
                            {"_id": existing["_id"]},
                            {"$set": {**fill, "updated_at": now},
                             "$addToSet": {"sources": "curated"}})
                    continue
                res = await self.products.update_one(
                    {"dedup_hash": doc["dedup_hash"]},
                    {"$set": base,
                     "$setOnInsert": {"created_at": now}},
                    upsert=True,
                )
                if res.upserted_id:
                    upserted += 1
        return upserted

    # ── scraped overlay ──────────────────────────────────────────────────
    async def upsert_scraped(self, name: str,
                             rows: List[Dict[str, Any]],
                             now: datetime) -> Dict[str, int]:
        """Overlay live rates/deadlines onto matching verified docs;
        insert new products otherwise. Dedup on the spec key."""
        adapter = ADAPTERS_BY_NAME[name]
        stats = {"overlaid": 0, "inserted": 0, "skipped": 0}
        for row in rows:
            doc = self._product_doc(adapter, row, now, "scraped")
            live = {k: row[k] for k in OVERLAY_FIELDS if row.get(k) is not None}
            match = await self.products.find_one(
                {"dedup_hash": doc["dedup_hash"], "tier": "verified"})
            if match:
                upd: Dict[str, Any] = {"$set": {**live, "updated_at": now,
                                                "last_overlay": name},
                                       "$addToSet": {"sources": name}}
                await self.products.update_one(
                    {"_id": match["_id"]}, upd)
                stats["overlaid"] += 1
                continue
            res = await self.products.update_one(
                {"dedup_key": doc["dedup_key"]},
                {"$setOnInsert": {**doc, "created_at": now},
                 "$addToSet": {"sources": name}},
                upsert=True,
            )
            if res.upserted_id:
                stats["inserted"] += 1
            else:
                # another source already owns this dedup key — richest wins
                other = await self.products.find_one({"dedup_key": doc["dedup_key"]})
                if other and _richness(doc) > _richness(other):
                    backfill = {f: doc[f] for f in _DETAIL_FIELDS
                                if other.get(f) in (None, 0, "")
                                and doc.get(f) not in (None, 0, "")}
                    await self.products.update_one(
                        {"_id": other["_id"]},
                        {"$set": {**backfill, "updated_at": now},
                         "$addToSet": {"sources": name}})
                stats["skipped"] += 1
        return stats

    # ── fetch / run_source ────────────────────────────────────────────────
    async def fetch_source(self, name: str) -> Tuple[List[Dict[str, Any]], str]:
        """Returns (rows, status); status ∈ ok|disabled|error|unknown_source.
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
            logger.warning("[fin_agg] source %s failed: %s", name, e)
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
        if status != "ok":
            return {"source": name, "status": status, "fetched": 0}
        now = _utcnow()
        stats = await self.upsert_scraped(name, rows, now)
        return {"source": name, "status": "ok", "fetched": len(rows), **stats}

    # ── run / status ──────────────────────────────────────────────────────
    async def run(self, source: Optional[str] = None,
                  tiers: Optional[set] = None) -> Dict[str, Any]:
        await self.ensure_indexes()
        now = _utcnow()
        verified = await self.seed_verified(now)
        names = list(ADAPTERS_BY_NAME)
        if source:
            names = [source]
        if tiers is not None:
            names = [n for n in names if ADAPTERS_BY_NAME[n].tier in tiers]
        summary = await asyncio.gather(*(self.run_source(n) for n in names))
        report = {
            "ran_at": now.isoformat(),
            "verified_seeded": verified,
            "results": list(summary),
            "products_total": await self.products.count_documents({"is_active": True}),
        }
        await self.runs.insert_one({**report, "_id": ObjectId()})
        logger.info("[fin_agg] run complete: %d sources, verified=%d",
                    len(summary), verified)
        return report

    async def status(self) -> Dict[str, Any]:
        last = await self.runs.find_one({}, sort=[("ran_at", -1)])
        per_source = []
        for name in ADAPTERS_BY_NAME:
            sdoc = await self.meta.find_one({"source": name})
            count = await self.products.count_documents({"source": name})
            per_source.append({
                "source": name,
                "category": ADAPTERS_BY_NAME[name].category,
                "tier": ADAPTERS_BY_NAME[name].tier,
                "enabled": sdoc.get("enabled", True) if sdoc else True,
                "doc_count": count,
            })
        return {
            "collections": {
                "verified": await self.products.count_documents({"tier": "verified"}),
                "scraped": await self.products.count_documents({"tier": "scraped"}),
                "total": await self.products.count_documents({"is_active": True}),
            },
            "last_run_at": last.get("ran_at") if last else None,
            "last_results": last.get("results") if last else [],
            "sources": per_source,
        }


aggregator = FinancialAggregator()


async def run_aggregation(source: Optional[str] = None,
                          tiers: Optional[set] = None) -> Dict[str, Any]:
    """Cron entrypoint: tiers 1+2 only (tier 3 is on-demand, see spec)."""
    return await aggregator.run(source, tiers if tiers is not None else CRON_TIERS)


# ─── Scheduler ───────────────────────────────────────────────────────────
_scheduler: Optional[Any] = None


def _flag_set(var: str, default: str) -> bool:
    val = (os.environ.get(var) or default).strip().lower()
    return val in {"1", "true", "yes", "on"}


def start_financial_aggregator_scheduler() -> None:
    """Start the daily 05:00 IST cron + optional startup catch-up run.
    Called from server.py under leader election (single-worker safe)."""
    global _scheduler
    if _scheduler is not None:
        return
    if not _flag_set("FINANCIAL_AGGREGATOR_CRON_ENABLED", "1"):
        logger.info("[fin_agg] cron disabled via FINANCIAL_AGGREGATOR_CRON_ENABLED")
        return
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        import pytz
        ist = pytz.timezone("Asia/Kolkata")
        _scheduler = AsyncIOScheduler(timezone=ist)
        _scheduler.add_job(
            run_aggregation,
            CronTrigger(hour=5, minute=0, timezone=ist),
            id="financial_aggregator_daily",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        _scheduler.start()
        logger.info("[fin_agg] daily financial aggregator cron started (05:00 IST)")
    except Exception as e:  # noqa: BLE001
        logger.warning("[fin_agg] failed to start scheduler: %s", e)

    if _flag_set("FINANCIAL_AGGREGATOR_RUN_ON_STARTUP", "1"):
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
                logger.warning("[fin_agg] startup run failed: %s", e)
        asyncio.ensure_future(_startup_run())


def stop_financial_aggregator_scheduler() -> None:
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


# Public router — the platform-facing manual trigger (roadmap F1).
router = APIRouter()


@router.post("/financial/aggregate")
async def fin_aggregate(source: Optional[str] = Query(None),
                        tier: Optional[int] = Query(None),
                        user: dict = Depends(require_super_admin)):
    """Admin manual trigger of the financial aggregation run.

    ``tier=3`` unlocks the on-demand sources (Coverfox); a specific
    ``source`` runs just that adapter regardless of tier."""
    if source and source not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown financial aggregator source '{source}'")
    if tier is not None and tier not in (1, 2, 3):
        raise HTTPException(400, "tier must be 1, 2 or 3")
    if tier is not None:
        report = await aggregator.run(tiers={tier})
    elif source:
        report = await aggregator.run(source)
    else:
        report = await run_aggregation()
    return {"ok": True, **report}


# Admin router — status + per-source toggles (lineage convention, like
# /admin/he-aggregator and /admin/rentals-aggregator)
admin_router = APIRouter(
    prefix="/admin/financial-aggregator",
    tags=["admin-financial-aggregator"],
)


class SourceToggle(BaseModel):
    enabled: bool


@admin_router.get("/status")
async def fin_status(user: dict = Depends(require_super_admin)):
    return await aggregator.status()


@admin_router.patch("/sources/{name}")
async def toggle_source(name: str, body: SourceToggle,
                       user: dict = Depends(require_super_admin)):
    if name not in ADAPTERS_BY_NAME:
        raise HTTPException(404, f"Unknown financial aggregator source '{name}'")
    await aggregator.meta.update_one(
        {"source": name},
        {"$set": {"enabled": body.enabled, "updated_at": _utcnow()}},
        upsert=True,
    )
    return {"source": name, "enabled": body.enabled}
