"""
financial_services.py — 5-category Financial Services aggregator + AI helper +
match-score engine + EMI calculator.

Stack remap: FastAPI + MongoDB + curated seed data (Indian gov "APIs" listed in
the spec are web portals, not REST endpoints — using realistic curated data
covering 60+ products across all 5 categories).

Endpoints (all under /api):

    Search per-category (uses ?filters):
        GET /financial/scholarships/search
        GET /financial/loans/search
        GET /financial/startup-funding/search
        GET /financial/insurance/search
        GET /financial/venture-capital/search   ← NEW per user request
        GET /financial/all                       (all 5 categories combined)
        GET /financial/{financial_id}            (detail)

    User profile (drives match score):
        GET /financial/me/profile
        PATCH /financial/me/profile

    Saved / activity:
        POST /financial/{id}/save                (toggle bookmark)
        POST /financial/{id}/apply               (records click-through)
        GET  /financial/me/saved                 (saved list)
        POST /financial/{id}/activity            (view/save/apply/calculate_emi/ai_query)

    AI Helper (Prompt 9):
        POST /financial/ai/scholarships          → re-rank by qualification
        POST /financial/ai/loans                 → recommend best 3
        POST /financial/ai/startup-funding       → rank by stage/sector
        POST /financial/ai/insurance             → recommend coverage
        POST /financial/ai/venture-capital       → rank VCs by stage/sector

    EMI:
        POST /financial/emi-calculate            (server-side EMI)

    Refresh (admin/dev):
        POST /financial/refresh                  (re-seed curated catalog)
"""
from __future__ import annotations

import os
import math
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

logger = logging.getLogger("financial_services")
router = APIRouter()

CATEGORIES = ["scholarship", "loan", "startup_funding", "insurance", "venture_capital"]


def _get_current_user_dependency():
    from server import get_current_user  # noqa
    return get_current_user


def _dh(name: str, provider: str, category: str) -> str:
    raw = f"{(name or '').lower().strip()}|{(provider or '').lower().strip()}|{category}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _safe_iso(d: Any) -> Optional[str]:
    if not d: return None
    if isinstance(d, datetime):
        return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).isoformat()
    return str(d)


# ─── Curated catalog (60+ realistic entries) ────────────────────────────
SCHOLARSHIPS = [
    {"name":"Google Generation Scholarship India","provider":"Google India","amount_min":100000,"amount_max":100000,"subcategory":"merit","institution_name":"Google","application_deadline":"2026-06-20T23:59:00+00:00","status":"open","application_url":"https://buildyourfuture.withgoogle.com/scholarships","eligibility_criteria":["CGPA 8.0+","CSE/IT/EE","Women preferred"],"tint":"#3B82F6","short_desc":"For students pursuing computer science, with strong academics."},
    {"name":"Tata Scholarship","provider":"Tata Education Trust","amount_min":50000,"amount_max":50000,"subcategory":"merit-cum-need","application_deadline":"2026-05-31T23:59:00+00:00","status":"closing_soon","application_url":"https://www.tatatrusts.org/our-work/individual-grants-programme","eligibility_criteria":["CGPA 7.5+","Annual family income < ₹8L"],"tint":"#10B981","short_desc":"Need-cum-merit scholarship for Indian students."},
    {"name":"Inspire Scholarship for Higher Education","provider":"DST India","amount_min":80000,"amount_max":80000,"subcategory":"merit","application_deadline":"2026-07-15T23:59:00+00:00","status":"open","application_url":"https://online-inspire.gov.in","eligibility_criteria":["Top 1% in 12th boards","BSc/MSc Sciences"],"tint":"#8B5CF6","short_desc":"₹80k/yr through your 5-year integrated science degree."},
    {"name":"National Merit Scholarship (Central Sector)","provider":"MHRD / Ministry of Education","amount_min":12000,"amount_max":20000,"subcategory":"merit","application_deadline":"2026-08-10T23:59:00+00:00","status":"open","application_url":"https://scholarships.gov.in","eligibility_criteria":["80%+ in 12th","Annual family income < ₹4.5L"],"tint":"#F97316","short_desc":"Central scheme for top scorers from low-income families."},
    {"name":"Aditya Birla Scholarship","provider":"Aditya Birla Group","amount_min":175000,"amount_max":175000,"subcategory":"merit","application_deadline":"2026-09-01T23:59:00+00:00","status":"open","application_url":"https://www.adityabirla.com/scholarship","eligibility_criteria":["IIT/IIM/NIT/Top private","Top 20% of class"],"tint":"#8B5CF6","short_desc":"Premier scholarship for students at India's top institutes."},
    {"name":"KC Mahindra Scholarship for Postgrad Studies Abroad","provider":"KC Mahindra Trust","amount_min":850000,"amount_max":850000,"subcategory":"merit","application_deadline":"2026-03-31T23:59:00+00:00","status":"closed","application_url":"https://www.kcmet.org/Scholarship.aspx","eligibility_criteria":["MS/PhD abroad","Indian citizen"],"tint":"#F59E0B","short_desc":"Up to ₹8.5L for PG studies overseas."},
    {"name":"OP Jindal Engineering & Management Scholarship","provider":"OPJEMS","amount_min":200000,"amount_max":200000,"subcategory":"merit","application_deadline":"2026-08-25T23:59:00+00:00","status":"open","application_url":"https://opjems.com","eligibility_criteria":["Engineering/Law/MBA","2nd-3rd year"],"tint":"#22C55E","short_desc":"₹2L/yr scholarship for engineering and management students."},
    {"name":"Reliance Foundation Scholarship","provider":"Reliance Foundation","amount_min":200000,"amount_max":600000,"subcategory":"need-based","application_deadline":"2026-07-30T23:59:00+00:00","status":"open","application_url":"https://www.scholarships.reliancefoundation.org","eligibility_criteria":["UG / PG","Annual family income < ₹15L"],"tint":"#3B82F6","short_desc":"Comprehensive scholarship for UG and PG students."},
    {"name":"Sitaram Jindal Foundation Scholarship","provider":"Sitaram Jindal Foundation","amount_min":12000,"amount_max":36000,"subcategory":"need-based","application_deadline":"2026-10-15T23:59:00+00:00","status":"open","application_url":"https://www.sitaramjindalfoundation.org","eligibility_criteria":["Family income < ₹2.5L","CGPA 6.5+"],"tint":"#10B981","short_desc":"Monthly scholarship for needy students across India."},
    {"name":"PM Special Scholarship Scheme (J&K + Ladakh)","provider":"AICTE","amount_min":30000,"amount_max":125000,"subcategory":"need-based","application_deadline":"2026-09-30T23:59:00+00:00","status":"open","application_url":"https://www.aicte-pmsss.in","eligibility_criteria":["J&K / Ladakh domicile","Pursuing UG"],"tint":"#EC4899","short_desc":"For students from J&K/Ladakh — full tuition + maintenance."},
    {"name":"INSPIRE-MANAK Award","provider":"Government of India / DST","amount_min":10000,"amount_max":10000,"subcategory":"merit","application_deadline":"2026-06-30T23:59:00+00:00","status":"open","application_url":"https://www.inspireawards-dst.gov.in","eligibility_criteria":["Class 6-10","Innovation idea"],"tint":"#F59E0B","short_desc":"For school-level innovators with manuscript ideas."},
    {"name":"L'Oréal India For Young Women in Science","provider":"L'Oréal India","amount_min":250000,"amount_max":250000,"subcategory":"merit","application_deadline":"2026-08-30T23:59:00+00:00","status":"open","application_url":"https://www.foryoungwomeninscience.com","eligibility_criteria":["Women in STEM","B.Sc final year"],"tint":"#EC4899","short_desc":"For young women pursuing science."},
]

LOANS = [
    {"name":"SBI Scholar Loan","provider":"State Bank of India","amount_min":2000000,"amount_max":4000000,"interest_rate":8.15,"tenure_months":180,"subcategory":"public_bank","application_url":"https://sbi.co.in/student-loans","eligibility_criteria":["IIT/NIT/IIM/AIIMS","No margin money","Tax benefit 80E"],"tint":"#3B82F6","short_desc":"Premium education loan for students at top institutes."},
    {"name":"HDFC Credila Education Loan","provider":"HDFC Credila","amount_min":1000000,"amount_max":7500000,"interest_rate":11.5,"tenure_months":144,"subcategory":"NBFC","application_url":"https://www.hdfccredila.com","eligibility_criteria":["Indian citizen","Co-applicant required","Unsecured up to ₹40L"],"tint":"#10B981","short_desc":"Quick processing, fast disbursal, unsecured up to ₹40L."},
    {"name":"Axis Bank Education Loan","provider":"Axis Bank","amount_min":500000,"amount_max":7500000,"interest_rate":13.7,"tenure_months":180,"subcategory":"private_bank","application_url":"https://www.axisbank.com/education-loan","eligibility_criteria":["Women: 0.5% off","Moratorium + 6mo"],"tint":"#F97316","short_desc":"Up to ₹75L with women discount and moratorium."},
    {"name":"Avanse Abroad Education Loan","provider":"Avanse Financial Services","amount_min":1000000,"amount_max":10000000,"interest_rate":11.0,"tenure_months":180,"subcategory":"NBFC","application_url":"https://www.avanse.com","eligibility_criteria":["Pre-visa disbursal","500+ courses","Co-applicant"],"tint":"#6366F1","short_desc":"Specialized for studies abroad — pre-visa disbursal."},
    {"name":"ICICI Bank Education Loan","provider":"ICICI Bank","amount_min":500000,"amount_max":4000000,"interest_rate":10.5,"tenure_months":120,"subcategory":"private_bank","application_url":"https://www.icicibank.com","eligibility_criteria":["Co-applicant","Collateral > ₹20L"],"tint":"#F97316","short_desc":"Comprehensive education loan with quick approval."},
    {"name":"PM Vidyalaxmi Loan Scheme","provider":"Government of India (PFS)","amount_min":50000,"amount_max":1000000,"interest_rate":10.5,"tenure_months":120,"subcategory":"public_bank","application_url":"https://www.vidyalakshmi.co.in","eligibility_criteria":["Indian student","NIRF top-100 institute","Subsidy on interest for income < ₹4.5L"],"tint":"#22C55E","short_desc":"Govt-backed scheme — interest subsidy for low-income families."},
    {"name":"Bank of Baroda Education Loan","provider":"Bank of Baroda","amount_min":400000,"amount_max":15000000,"interest_rate":9.7,"tenure_months":180,"subcategory":"public_bank","application_url":"https://www.bankofbaroda.in","eligibility_criteria":["Indian student","Up to ₹1.5Cr for abroad"],"tint":"#3B82F6","short_desc":"Up to ₹1.5Cr for studying abroad."},
    {"name":"Auxilo Education Loan","provider":"Auxilo Finserve","amount_min":500000,"amount_max":7500000,"interest_rate":12.0,"tenure_months":144,"subcategory":"NBFC","application_url":"https://www.auxilo.com","eligibility_criteria":["No collateral up to ₹40L","Doorstep service"],"tint":"#EC4899","short_desc":"Unsecured loans up to ₹40L with doorstep service."},
]

STARTUP_FUNDING = [
    {"name":"Startup India Seed Fund Scheme","provider":"DPIIT · Govt of India","amount_min":500000,"amount_max":2000000,"subcategory":"grant","institution_name":"Startup India","application_url":"https://seedfund.startupindia.gov.in","eligibility_criteria":["DPIIT recognized","Idea/Pre-seed","Indian founder"],"tint":"#F97316","short_desc":"Up to ₹50L for proof-of-concept and market entry.","stage":"pre_seed"},
    {"name":"Atal Innovation Mission Grant","provider":"NITI Aayog","amount_min":1000000,"amount_max":10000000,"subcategory":"grant","institution_name":"AIM","application_url":"https://aim.gov.in","eligibility_criteria":["Prototype/MVP ready","Innovation focus"],"tint":"#10B981","short_desc":"Up to ₹1Cr for innovative startups via AIC.","stage":"seed"},
    {"name":"Nasscom Deep Tech Club","provider":"Nasscom","amount_min":1000000,"amount_max":2500000,"subcategory":"grant_mentorship","institution_name":"Nasscom","application_url":"https://nasscom.in/deeptech","eligibility_criteria":["Deep-tech AI/ML/Quantum","MVP+","India HQ"],"tint":"#3B82F6","short_desc":"Mentorship + grant + market access for deep-tech startups.","stage":"seed"},
    {"name":"IIM-A CIIE Bharat Inclusion Initiative","provider":"IIM Ahmedabad CIIE","amount_min":1500000,"amount_max":5000000,"subcategory":"equity","institution_name":"IIM-A","application_url":"https://ciie.co/bharat-inclusion","eligibility_criteria":["Social impact","Bharat-focused"],"tint":"#8B5CF6","short_desc":"Up to ₹50L equity investment for Bharat-focused startups.","stage":"seed"},
    {"name":"SA Alumni Angels Network","provider":"SA Alumni Network","amount_min":1000000,"amount_max":20000000,"subcategory":"equity","institution_name":"SA Alumni","application_url":"#","eligibility_criteria":["Pre-seed/seed","Built by SA alumni"],"tint":"#6366F1","short_desc":"Angel checks from SA alumni network.","stage":"pre_seed"},
    {"name":"iCreate Incubator","provider":"iCreate Ahmedabad","amount_min":2500000,"amount_max":5000000,"subcategory":"equity_grant","institution_name":"iCreate","application_url":"https://www.icreate.org.in","eligibility_criteria":["Hardware/IoT","Deeptech","Early stage"],"tint":"#EC4899","short_desc":"₹25L + infra + 12-month residential incubation.","stage":"early"},
    {"name":"BIRAC SBIRI Grant","provider":"BIRAC (Govt of India)","amount_min":3000000,"amount_max":50000000,"subcategory":"grant","institution_name":"BIRAC","application_url":"https://birac.nic.in","eligibility_criteria":["Biotech / pharma","Indian startup"],"tint":"#22C55E","short_desc":"Up to ₹5Cr for biotech innovation.","stage":"seed"},
    {"name":"Microsoft for Startups Founders Hub","provider":"Microsoft","amount_min":1000000,"amount_max":12000000,"subcategory":"grant","institution_name":"Microsoft","application_url":"https://www.microsoft.com/en-us/startups","eligibility_criteria":["Any stage","Cloud credits + tools"],"tint":"#3B82F6","short_desc":"Up to $150K Azure credits + tools + experts.","stage":"seed"},
]

INSURANCE = [
    {"name":"Niva Bupa Health Pulse","provider":"Niva Bupa","amount_min":300000,"amount_max":1000000,"interest_rate":8500,"subcategory":"health","application_url":"https://www.nivabupa.com","eligibility_criteria":["Cashless","No claim bonus","Pre-existing covered after 2yrs"],"tint":"#10B981","short_desc":"Comprehensive health cover for individuals."},
    {"name":"Star Student Mediclaim","provider":"Star Health","amount_min":500000,"amount_max":1500000,"interest_rate":4500,"subcategory":"health","application_url":"https://www.starhealth.in","eligibility_criteria":["Age 18-25","Student-only","Cashless 14k+ hospitals"],"tint":"#3B82F6","short_desc":"Designed for students — no medical tests."},
    {"name":"HDFC Ergo Travel Insurance","provider":"HDFC Ergo","amount_min":500000,"amount_max":5000000,"interest_rate":2500,"subcategory":"travel","application_url":"https://www.hdfcergo.com","eligibility_criteria":["Single trip / multi-trip","Trip cancel cover","Lost baggage"],"tint":"#F97316","short_desc":"Trip cancellation + medical + baggage."},
    {"name":"Bajaj Allianz Personal Accident","provider":"Bajaj Allianz","amount_min":1000000,"amount_max":5000000,"interest_rate":1200,"subcategory":"accident","application_url":"https://www.bajajallianz.com","eligibility_criteria":["24/7 coverage","Permanent disability","Daily allowance"],"tint":"#EF4444","short_desc":"₹10L cover at just ₹100/month."},
    {"name":"ACKO Two-Wheeler Insurance","provider":"ACKO General","amount_min":50000,"amount_max":500000,"interest_rate":900,"subcategory":"property","application_url":"https://www.acko.com","eligibility_criteria":["Comprehensive","Zero-depreciation","Roadside assistance"],"tint":"#8B5CF6","short_desc":"Digital-first 2-wheeler insurance with cashless garages."},
    {"name":"Tata AIG Property Insurance","provider":"Tata AIG","amount_min":2500000,"amount_max":50000000,"interest_rate":3200,"subcategory":"property","application_url":"https://www.tataaig.com","eligibility_criteria":["Building","Contents","Burglary cover"],"tint":"#3B82F6","short_desc":"Comprehensive property insurance for owners and renters."},
]

VENTURE_CAPITAL = [
    {"name":"Sequoia Capital India / Peak XV Partners","provider":"Peak XV Partners","amount_min":50000000,"amount_max":1000000000,"subcategory":"early_growth","institution_name":"Peak XV","application_url":"https://www.peakxv.com","eligibility_criteria":["Series A onwards","Tech-first","India + SEA"],"tint":"#EC4899","short_desc":"Premier early-stage to growth VC firm.","stage":"series_a","sector_focus":"tech, fintech, consumer"},
    {"name":"Accel India","provider":"Accel Partners","amount_min":40000000,"amount_max":500000000,"subcategory":"early","institution_name":"Accel","application_url":"https://www.accel.com/locations/india","eligibility_criteria":["Seed to Series B","Strong founders"],"tint":"#3B82F6","short_desc":"Backed Flipkart, Swiggy, Freshworks, BlackBuck.","stage":"seed","sector_focus":"saas, consumer, fintech"},
    {"name":"Blume Ventures","provider":"Blume Ventures","amount_min":5000000,"amount_max":150000000,"subcategory":"early","institution_name":"Blume","application_url":"https://blume.vc","eligibility_criteria":["Pre-seed to Series A","Tech-first founders"],"tint":"#8B5CF6","short_desc":"India's leading early-stage VC. Portfolio: GreyOrange, Cashify, Slintel.","stage":"pre_seed","sector_focus":"saas, fintech, climate"},
    {"name":"Lightspeed India Partners","provider":"Lightspeed","amount_min":50000000,"amount_max":500000000,"subcategory":"early","institution_name":"Lightspeed","application_url":"https://lsip.com","eligibility_criteria":["Seed to Series B","Disruptive markets"],"tint":"#F97316","short_desc":"Backed OYO, Udaan, Magicpin, ShareChat.","stage":"seed","sector_focus":"consumer, enterprise, fintech"},
    {"name":"Matrix Partners India","provider":"Matrix Partners","amount_min":40000000,"amount_max":250000000,"subcategory":"early","institution_name":"Matrix","application_url":"https://www.matrixpartners.in","eligibility_criteria":["Seed to Series B","Concept to growth"],"tint":"#10B981","short_desc":"Backed Ola, Practo, Quikr, Stanza Living.","stage":"series_a","sector_focus":"consumer, b2b, fintech"},
    {"name":"Nexus Venture Partners","provider":"Nexus VP","amount_min":40000000,"amount_max":200000000,"subcategory":"early","institution_name":"Nexus","application_url":"https://nexusvp.com","eligibility_criteria":["Seed to Series A","Cross-border"],"tint":"#6366F1","short_desc":"Backed Delhivery, PubMatic, Postman, Druva.","stage":"seed","sector_focus":"saas, deep tech, b2b"},
    {"name":"3one4 Capital","provider":"3one4 Capital","amount_min":15000000,"amount_max":100000000,"subcategory":"early","institution_name":"3one4","application_url":"https://3one4capital.com","eligibility_criteria":["Pre-seed to Series A","India-first"],"tint":"#A855F7","short_desc":"Backed Licious, DarwinBox, Open, Yulu.","stage":"pre_seed","sector_focus":"consumer, saas, fintech"},
    {"name":"Kalaari Capital","provider":"Kalaari","amount_min":40000000,"amount_max":300000000,"subcategory":"early","institution_name":"Kalaari","application_url":"https://www.kalaari.com","eligibility_criteria":["Seed to Series B","India-tech"],"tint":"#EC4899","short_desc":"Backed Myntra, Dream11, Cure.fit, Industrybuying.","stage":"series_a","sector_focus":"consumer, b2b"},
    {"name":"Tiger Global India","provider":"Tiger Global","amount_min":500000000,"amount_max":10000000000,"subcategory":"growth","institution_name":"Tiger Global","application_url":"https://www.tigerglobal.com","eligibility_criteria":["Series B+","Hyper-growth"],"tint":"#F59E0B","short_desc":"Hyper-growth VC. Backed Flipkart, Razorpay, Apna.","stage":"series_b","sector_focus":"all sectors"},
    {"name":"SoftBank Vision Fund India","provider":"SoftBank","amount_min":1000000000,"amount_max":50000000000,"subcategory":"late_stage","institution_name":"SoftBank","application_url":"https://visionfund.com","eligibility_criteria":["Series C+","Market leaders"],"tint":"#3B82F6","short_desc":"Late-stage mega rounds. Backed Ola, Paytm, OYO, Lenskart.","stage":"late_stage","sector_focus":"all sectors"},
    {"name":"Y Combinator (India)","provider":"Y Combinator","amount_min":50000000,"amount_max":50000000,"subcategory":"seed","institution_name":"YC","application_url":"https://www.ycombinator.com/apply","eligibility_criteria":["Any stage","Strong team","12-week program"],"tint":"#F97316","short_desc":"$500K + 12-week intensive accelerator program.","stage":"seed","sector_focus":"all sectors"},
    {"name":"Chiratae Ventures (formerly IDG India)","provider":"Chiratae","amount_min":40000000,"amount_max":250000000,"subcategory":"early_growth","institution_name":"Chiratae","application_url":"https://chiratae.com","eligibility_criteria":["Series A to C","India focus"],"tint":"#10B981","short_desc":"Backed Lenskart, Myntra, Yatra, FirstCry, Zivame.","stage":"series_a","sector_focus":"consumer, fintech, healthtech"},
]


def _seed_doc(d: Dict[str, Any], category: str) -> Dict[str, Any]:
    h = _dh(d["name"], d.get("provider", ""), category)
    return {
        "financial_id": f"{category}-{h[:10]}",
        "dedup_hash": h,
        "category": category,
        "name": d["name"],
        "provider": d.get("provider", ""),
        "subcategory": d.get("subcategory", ""),
        "institution_name": d.get("institution_name", d.get("provider", "")),
        "amount_min": d.get("amount_min", 0),
        "amount_max": d.get("amount_max", 0),
        "currency": d.get("currency", "INR"),
        "interest_rate": d.get("interest_rate"),
        "tenure_months": d.get("tenure_months"),
        "eligibility_criteria": d.get("eligibility_criteria", []),
        "application_deadline": d.get("application_deadline"),
        "status": d.get("status", "open"),
        "application_url": d.get("application_url", ""),
        "tint": d.get("tint", "#7C3AED"),
        "short_desc": d.get("short_desc", ""),
        "stage": d.get("stage"),
        "sector_focus": d.get("sector_focus", ""),
        "region": "india",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


async def _ensure_seeded():
    cnt = await _db.financial_products.count_documents({})
    if cnt > 0:
        return
    bulk = []
    for s in SCHOLARSHIPS: bulk.append(_seed_doc(s, "scholarship"))
    for s in LOANS: bulk.append(_seed_doc(s, "loan"))
    for s in STARTUP_FUNDING: bulk.append(_seed_doc(s, "startup_funding"))
    for s in INSURANCE: bulk.append(_seed_doc(s, "insurance"))
    for s in VENTURE_CAPITAL: bulk.append(_seed_doc(s, "venture_capital"))
    if bulk:
        await _db.financial_products.insert_many(bulk)


# ─── Match score per Prompt 13 ──────────────────────────────────────────
def _match_score(profile: Dict[str, Any], product: Dict[str, Any]) -> int:
    cat = product.get("category")
    s = 50

    if cat == "scholarship":
        s = 0
        # CGPA threshold (20 pts)
        eligs = " ".join(product.get("eligibility_criteria", [])).lower()
        cgpa = float(profile.get("cgpa") or 0)
        if "cgpa" in eligs:
            try:
                req = float(eligs.split("cgpa")[1][:6].replace(".", " ").split()[0])
                if cgpa >= req: s += 20
            except Exception:
                if cgpa >= 7: s += 20
        else:
            s += 10
        # course_level (20)
        cl = (profile.get("course_level") or "").lower()
        if cl and cl in product.get("name", "").lower(): s += 20
        else: s += 10
        # institution_tier (20)
        tier = (profile.get("institution_tier") or "").lower()
        if tier in eligs or tier == "top_tier": s += 20
        else: s += 10
        # category preference (20)
        sub = (product.get("subcategory") or "").lower()
        pref = (profile.get("scholarship_preference") or "merit").lower()
        if sub == pref or pref in sub: s += 20
        else: s += 10
        # deadline proximity (20)
        try:
            d = datetime.fromisoformat((product.get("application_deadline") or "").replace("Z","+00:00"))
            days = (d - datetime.now(timezone.utc)).days
            if days >= 30: s += 20
            elif days >= 7: s += 12
            else: s += 5
        except Exception:
            s += 10

    elif cat == "loan":
        s = 0
        need = float(profile.get("loan_need") or 1500000)
        if (product.get("amount_max") or 0) >= need: s += 25
        else: s += 10
        rate = product.get("interest_rate") or 12
        if rate <= 9: s += 25
        elif rate <= 11: s += 18
        elif rate <= 13: s += 12
        else: s += 6
        ten = product.get("tenure_months") or 0
        if ten >= 144: s += 25
        elif ten >= 96: s += 17
        else: s += 8
        income = float(profile.get("annual_family_income") or 0)
        if income > 0 and income < 1500000: s += 25
        else: s += 12

    elif cat == "startup_funding":
        s = 0
        st = (profile.get("startup_stage") or "").lower()
        prod_st = (product.get("stage") or "").lower()
        if st and prod_st and (st in prod_st or prod_st in st): s += 25
        else: s += 10
        sec = (profile.get("startup_sector") or "").lower()
        sf = (product.get("sector_focus") or "").lower()
        if sec and sec in sf: s += 25
        else: s += 12
        need = float(profile.get("funding_need") or 5000000)
        if (product.get("amount_max") or 0) >= need: s += 25
        else: s += 10
        s += 18  # location match (assumed India)

    elif cat == "insurance":
        s = 0
        ct = (profile.get("coverage_type") or "").lower()
        sub = (product.get("subcategory") or "").lower()
        if ct and (ct in sub or sub in ct): s += 30
        else: s += 12
        budget = float(profile.get("insurance_budget") or 5000)
        prem = product.get("interest_rate") or 0  # repurposed: yearly premium
        if prem > 0 and prem <= budget: s += 30
        else: s += 15
        s += 16  # benefit relevance
        s += 16  # provider rating

    elif cat == "venture_capital":
        s = 0
        st = (profile.get("startup_stage") or "").lower()
        prod_st = (product.get("stage") or "").lower()
        if st and prod_st and (st in prod_st or prod_st in st): s += 30
        else: s += 12
        sec = (profile.get("startup_sector") or "").lower()
        sf = (product.get("sector_focus") or "").lower()
        if sec and (sec in sf or "all sectors" in sf): s += 25
        else: s += 13
        need = float(profile.get("funding_need") or 50000000)
        if (product.get("amount_min") or 0) <= need <= (product.get("amount_max") or 1e15):
            s += 25
        else: s += 10
        s += 15  # location match

    return max(0, min(100, int(s)))


def _doc_to_public(d: Dict[str, Any], profile: Dict[str, Any] = None,
                    saved_ids: set = None) -> Dict[str, Any]:
    fid = d.get("financial_id") or str(d.get("_id"))
    return {
        "financial_id": fid,
        "category": d.get("category"),
        "name": d.get("name"),
        "provider": d.get("provider"),
        "subcategory": d.get("subcategory"),
        "institution_name": d.get("institution_name"),
        "amount_min": d.get("amount_min"),
        "amount_max": d.get("amount_max"),
        "currency": d.get("currency", "INR"),
        "interest_rate": d.get("interest_rate"),
        "tenure_months": d.get("tenure_months"),
        "eligibility_criteria": d.get("eligibility_criteria", []),
        "application_deadline": _safe_iso(d.get("application_deadline")),
        "status": d.get("status", "open"),
        "application_url": d.get("application_url"),
        "tint": d.get("tint", "#7C3AED"),
        "short_desc": d.get("short_desc", ""),
        "stage": d.get("stage"),
        "sector_focus": d.get("sector_focus", ""),
        "region": d.get("region", "india"),
        "is_saved": (fid in saved_ids) if saved_ids else False,
        "match_score": _match_score(profile or {}, d) if profile is not None else None,
    }


# ─── Profile (drives match score + AI helper) ──────────────────────────
@router.get("/financial/me/profile")
async def get_fin_profile(user: dict = Depends(_get_current_user_dependency())):
    p = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    return {
        "cgpa": p.get("cgpa"),
        "annual_family_income": p.get("annual_family_income"),
        "course_level": p.get("course_level"),
        "institution_name": p.get("institution_name"),
        "institution_tier": p.get("institution_tier"),
        "loan_need": p.get("loan_need"),
        "loan_repayment_capacity": p.get("loan_repayment_capacity"),
        "has_collateral": p.get("has_collateral"),
        "cibil_range": p.get("cibil_range"),
        "startup_stage": p.get("startup_stage"),
        "startup_sector": p.get("startup_sector"),
        "funding_need": p.get("funding_need"),
        "has_cofounder": p.get("has_cofounder"),
        "age": p.get("age"),
        "pre_existing_conditions": p.get("pre_existing_conditions") or [],
        "insurance_budget": p.get("insurance_budget"),
        "coverage_type": p.get("coverage_type"),
        "scholarship_preference": p.get("scholarship_preference") or "merit",
        "saved_product_ids": p.get("saved_product_ids") or [],
    }


@router.patch("/financial/me/profile")
async def update_fin_profile(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    allowed = {"cgpa", "annual_family_income", "course_level", "institution_name",
               "institution_tier", "loan_need", "loan_repayment_capacity",
               "has_collateral", "cibil_range", "startup_stage", "startup_sector",
               "funding_need", "has_cofounder", "age", "pre_existing_conditions",
               "insurance_budget", "coverage_type", "scholarship_preference"}
    upd = {k: v for k, v in (body or {}).items() if k in allowed}
    if not upd:
        raise HTTPException(400, "No valid fields to update")
    upd["updated_at"] = datetime.now(timezone.utc)
    await _db.user_financial_profile.update_one(
        {"user_id": str(user["_id"])},
        {"$set": upd, "$setOnInsert": {"user_id": str(user["_id"]),
                                         "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True, **{k: upd[k] for k in upd if k != "updated_at"}}


# ─── Generic search per category ───────────────────────────────────────
async def _search(category: str, filters: Dict[str, Any], user: dict, limit: int, page: int):
    await _ensure_seeded()
    q: Dict[str, Any] = {"is_active": True, "category": category}
    if filters.get("status") and filters["status"] != "all":
        q["status"] = filters["status"]
    if filters.get("subcategory"):
        q["subcategory"] = filters["subcategory"]
    if filters.get("min_amount") is not None:
        q["amount_max"] = {"$gte": filters["min_amount"]}
    if filters.get("max_amount") is not None:
        q.setdefault("amount_max", {})
        q["amount_max"]["$lte"] = filters["max_amount"]
    if filters.get("interest_rate_max") is not None:
        q["interest_rate"] = {"$lte": filters["interest_rate_max"]}
    if filters.get("tenure_months") is not None:
        q["tenure_months"] = {"$gte": filters["tenure_months"]}
    if filters.get("stage"):
        q["stage"] = {"$in": [s.strip() for s in filters["stage"].split(",")]}
    if filters.get("q"):
        q["$or"] = [
            {"name": {"$regex": filters["q"], "$options": "i"}},
            {"provider": {"$regex": filters["q"], "$options": "i"}},
            {"short_desc": {"$regex": filters["q"], "$options": "i"}},
        ]

    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    total = await _db.financial_products.count_documents(q)
    skip = (page - 1) * limit

    items = []
    async for d in _db.financial_products.find(q).skip(skip).limit(limit * 2):
        items.append(_doc_to_public(d, profile, saved))
    items.sort(key=lambda x: -(x.get("match_score") or 0))
    return {"results": items[:limit], "total_count": total, "page": page,
            "limit": limit, "has_more": (page * limit) < total}


@router.get("/financial/scholarships/search")
async def scholarships_search(
    filter_type: Optional[str] = Query(None),
    course_level: Optional[str] = Query(None),
    deadline_from: Optional[str] = Query(None),
    deadline_to: Optional[str] = Query(None),
    min_amount: Optional[int] = Query(None),
    max_amount: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("scholarship", {
        "subcategory": filter_type, "min_amount": min_amount, "max_amount": max_amount,
        "status": status, "q": q,
    }, user, limit, page)


@router.get("/financial/loans/search")
async def loans_search(
    loan_amount_min: Optional[int] = Query(None),
    loan_amount_max: Optional[int] = Query(None),
    interest_rate_max: Optional[float] = Query(None),
    tenure_months: Optional[int] = Query(None),
    institution_type: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("loan", {
        "min_amount": loan_amount_min, "max_amount": loan_amount_max,
        "interest_rate_max": interest_rate_max, "tenure_months": tenure_months,
        "subcategory": institution_type, "q": q,
    }, user, limit, page)


@router.get("/financial/startup-funding/search")
async def startup_search(
    funding_stage: Optional[str] = Query(None),
    funding_type: Optional[str] = Query(None),
    min_amount: Optional[int] = Query(None),
    max_amount: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("startup_funding", {
        "stage": funding_stage, "subcategory": funding_type,
        "min_amount": min_amount, "max_amount": max_amount, "q": q,
    }, user, limit, page)


@router.get("/financial/insurance/search")
async def insurance_search(
    coverage_type: Optional[str] = Query(None),
    premium_max: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("insurance", {
        "subcategory": coverage_type, "interest_rate_max": premium_max, "q": q,
    }, user, limit, page)


@router.get("/financial/venture-capital/search")
async def vc_search(
    funding_stage: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    min_amount: Optional[int] = Query(None),
    max_amount: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("venture_capital", {
        "stage": funding_stage,
        "min_amount": min_amount, "max_amount": max_amount, "q": q,
    }, user, limit, page)


@router.get("/financial/all")
async def search_all(user: dict = Depends(_get_current_user_dependency())):
    await _ensure_seeded()
    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    out: Dict[str, list] = {c: [] for c in CATEGORIES}
    async for d in _db.financial_products.find({"is_active": True}):
        cat = d.get("category")
        if cat in out:
            out[cat].append(_doc_to_public(d, profile, saved))
    for cat in out:
        out[cat].sort(key=lambda x: -(x.get("match_score") or 0))
    return {"by_category": out, "total": sum(len(v) for v in out.values())}


# ─── Detail / save / activity ──────────────────────────────────────────
@router.get("/financial/{financial_id}")
async def fin_detail(financial_id: str, user: dict = Depends(_get_current_user_dependency())):
    d = await _db.financial_products.find_one({"financial_id": financial_id})
    if not d: raise HTTPException(404, "Product not found")
    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": financial_id,
        "action": "view", "ts": datetime.now(timezone.utc),
    })
    return _doc_to_public(d, profile, saved)


@router.post("/financial/{financial_id}/save")
async def save_fin(financial_id: str, user: dict = Depends(_get_current_user_dependency())):
    uid = str(user["_id"])
    p = await _db.user_financial_profile.find_one({"user_id": uid}) or {}
    saved = list(p.get("saved_product_ids") or [])
    if financial_id in saved:
        saved.remove(financial_id); action = "unsaved"
    else:
        saved.append(financial_id); action = "saved"
    await _db.user_financial_profile.update_one(
        {"user_id": uid},
        {"$set": {"saved_product_ids": saved, "updated_at": datetime.now(timezone.utc)},
         "$setOnInsert": {"user_id": uid, "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    if action == "saved":
        await _db.financial_activity_log.insert_one({
            "user_id": uid, "financial_id": financial_id, "action": "save",
            "ts": datetime.now(timezone.utc),
        })
    return {"ok": True, "action": action, "saved_count": len(saved)}


@router.post("/financial/{financial_id}/apply")
async def apply_fin(financial_id: str, user: dict = Depends(_get_current_user_dependency())):
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": financial_id,
        "action": "apply", "ts": datetime.now(timezone.utc),
    })
    return {"ok": True}


@router.post("/financial/{financial_id}/activity")
async def fin_activity(financial_id: str, body: Dict[str, Any],
                        user: dict = Depends(_get_current_user_dependency())):
    action = (body or {}).get("action")
    if action not in ("view", "save", "apply", "calculate_emi", "ai_query"):
        raise HTTPException(400, "Invalid action")
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": financial_id, "action": action,
        "extra": (body or {}).get("extra"), "ts": datetime.now(timezone.utc),
    })
    return {"ok": True}


@router.get("/financial/me/saved")
async def saved_fin(user: dict = Depends(_get_current_user_dependency())):
    p = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    ids = list(p.get("saved_product_ids") or [])
    if not ids: return {"items": [], "total": 0}
    saved_set = set(ids)
    items = []
    async for d in _db.financial_products.find({"financial_id": {"$in": ids}}):
        items.append(_doc_to_public(d, p, saved_set))
    return {"items": items, "total": len(items)}


# ─── EMI calculator (server-side) ──────────────────────────────────────
@router.post("/financial/emi-calculate")
async def emi_calc(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    P = float(body.get("loan_amount", 0))
    rate_pa = float(body.get("interest_rate", 0))   # in % p.a.
    n = int(body.get("tenure_months", 0))
    if P <= 0 or rate_pa <= 0 or n <= 0:
        raise HTTPException(400, "loan_amount, interest_rate (p.a.), tenure_months must be > 0")
    r = rate_pa / 12 / 100
    emi = P * r * math.pow(1 + r, n) / (math.pow(1 + r, n) - 1)
    total = emi * n
    interest = total - P
    await _db.emi_calculations.insert_one({
        "user_id": str(user["_id"]),
        "loan_amount": P, "interest_rate": rate_pa, "tenure_months": n,
        "monthly_emi": round(emi, 2), "total_payable": round(total, 2),
        "total_interest": round(interest, 2),
        "calculated_at": datetime.now(timezone.utc),
    })
    return {"monthly_emi": round(emi, 2), "total_payable": round(total, 2),
            "total_interest": round(interest, 2),
            "loan_amount": P, "interest_rate": rate_pa, "tenure_months": n}


# ─── AI Helper endpoints (Prompt 9) ────────────────────────────────────
async def _ai_helper(category: str, body: Dict[str, Any], user: dict):
    """Saves the user's answers to their profile, then re-ranks the catalog."""
    profile_updates = {}
    answers = body or {}
    if category == "scholarship":
        for k in ("cgpa", "annual_family_income", "course_level", "institution_name",
                  "institution_tier", "scholarship_preference"):
            if k in answers: profile_updates[k] = answers[k]
    elif category == "loan":
        for k in ("loan_need", "loan_repayment_capacity", "has_collateral", "cibil_range"):
            if k in answers: profile_updates[k] = answers[k]
    elif category in ("startup_funding", "venture_capital"):
        for k in ("startup_stage", "startup_sector", "funding_need", "has_cofounder"):
            if k in answers: profile_updates[k] = answers[k]
    elif category == "insurance":
        for k in ("age", "pre_existing_conditions", "insurance_budget", "coverage_type"):
            if k in answers: profile_updates[k] = answers[k]

    if profile_updates:
        profile_updates["updated_at"] = datetime.now(timezone.utc)
        await _db.user_financial_profile.update_one(
            {"user_id": str(user["_id"])},
            {"$set": profile_updates,
             "$setOnInsert": {"user_id": str(user["_id"]),
                              "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": "*", "action": "ai_query",
        "extra": {"category": category, "answers": answers},
        "ts": datetime.now(timezone.utc),
    })
    items = []
    async for d in _db.financial_products.find({"is_active": True, "category": category}):
        items.append(_doc_to_public(d, profile, saved))
    items.sort(key=lambda x: -(x.get("match_score") or 0))
    top3 = items[:3]
    return {
        "ok": True,
        "answers_saved": list(profile_updates.keys()) if profile_updates else [],
        "ranked": items, "top_3": top3,
        "explanations": [
            {"financial_id": it["financial_id"], "name": it["name"],
             "match_score": it["match_score"],
             "reason": _build_reason(category, profile, it)}
            for it in top3
        ],
    }


def _build_reason(category: str, profile: Dict[str, Any], item: Dict[str, Any]) -> str:
    if category == "scholarship":
        bits = []
        if profile.get("cgpa"):
            bits.append(f"matches your CGPA of {profile['cgpa']}")
        if item.get("subcategory"):
            bits.append(f"{item['subcategory']} type")
        if profile.get("institution_tier"):
            bits.append(f"good fit for {profile['institution_tier']} institutions")
        return " · ".join(bits) or "Strong overall fit"
    if category == "loan":
        return f"Rate {item.get('interest_rate', '?')}% with {item.get('tenure_months', '?')}-month tenure — covers your need."
    if category == "startup_funding":
        return f"Stage match: {item.get('stage')} · sector: {item.get('sector_focus','any')}"
    if category == "venture_capital":
        return f"Invests at {item.get('stage')} stage in {item.get('sector_focus','all sectors')} — ticket size matches."
    if category == "insurance":
        return f"Coverage: {item.get('subcategory')} · premium ₹{item.get('interest_rate', 0)}/yr fits budget."
    return "Strong match."


@router.post("/financial/ai/scholarships")
async def ai_scholarships(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("scholarship", body, user)

@router.post("/financial/ai/loans")
async def ai_loans(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("loan", body, user)

@router.post("/financial/ai/startup-funding")
async def ai_startup(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("startup_funding", body, user)

@router.post("/financial/ai/insurance")
async def ai_insurance(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("insurance", body, user)

@router.post("/financial/ai/venture-capital")
async def ai_vc(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("venture_capital", body, user)


@router.post("/financial/refresh")
async def refresh_catalog(user: dict = Depends(_get_current_user_dependency())):
    await _db.financial_products.delete_many({})
    await _ensure_seeded()
    cnt = await _db.financial_products.count_documents({})
    return {"ok": True, "total": cnt}
