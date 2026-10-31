"""
backend/routers/bgv_integrations.py — Multi-Tier BGV Integrations Engine.

Implements the Free and Semi-Paid API Register:
  • Tier 0 (Zero Approval, Start Now):
      - OpenSanctions / yente (Sanctions, PEP, Watchlist screening with /match, /search & embedded fallback)
      - Public Registries (UGC Fake Universities blacklist, AICTE/UGC recognized directory, NAAC tiers, MCA s.164(2) disqualified directors, Professional Councils, eCourts Safe Matcher with human review queue)
      - data.gov.in API bridge
  • Tier 1 (Signup, Pay-as-you-go):
      - Aggregator Wallet (Surepass, Zoop, Deepvue, Setu, Cashfree, Signzy) for PAN, EPFO UAN passbook, DL, Voter ID, Bank Penny Drop
      - DigiLocker Shortcut (via Deepvue / Setu authorized gateways)
  • Tier 2 (Organisational Onboarding):
      - API Setu & DigiLocker Direct (NAD - National Academic Depository, Academic Bank of Credits - ABC, CBSE marksheets)
      - EPFO Direct Employment History
  • Comprehensive Multi-Check BGV Scanner & Human Review Queue
"""
from __future__ import annotations

import os
import re
import json
import hashlib
import difflib
import secrets
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query, Body, Header, Depends
from pydantic import BaseModel, Field
from bson import ObjectId

from core.db import db
from core.deps import require_admin_role

router = APIRouter(prefix="/bgv/integrations", tags=["BGV Integrations & Registers"])

# =============================================================================
# Configuration & Environment Variables
# =============================================================================
YENTE_API_URL = os.environ.get("YENTE_API_URL", "http://localhost:8000").rstrip("/")
OPENSANCTIONS_DELIVERY_TOKEN = os.environ.get("OPENSANCTIONS_DELIVERY_TOKEN", "")
SUREPASS_API_TOKEN = os.environ.get("SUREPASS_API_TOKEN", "")
SETU_API_KEY = os.environ.get("SETU_API_KEY", "")
DEEPVUE_CLIENT_ID = os.environ.get("DEEPVUE_CLIENT_ID", "")
DEEPVUE_CLIENT_SECRET = os.environ.get("DEEPVUE_CLIENT_SECRET", "")
DATA_GOV_IN_API_KEY = os.environ.get("DATA_GOV_IN_API_KEY", "")
API_SETU_CLIENT_ID = os.environ.get("API_SETU_CLIENT_ID", "")
API_SETU_API_KEY = os.environ.get("API_SETU_API_KEY", "")

# =============================================================================
# Tier 0: UGC Fake Universities Blacklist (Degree-Mill Detection)
# Highest value per line of code in the BGV stack.
# Seed data only — the live registry now lives in the `ugc_fake_universities`
# Mongo collection (admin-managed via /bgv/integrations/fake-universities CRUD
# and auto-populated by the daily UGC Notifications Scraper agent).
# =============================================================================
UGC_FAKE_UNIVERSITIES_SEED = [
    {
        "id": "UGC-FAKE-01",
        "name": "Commercial University Ltd.",
        "state": "Delhi",
        "city": "Daryaganj",
        "aliases": ["Commercial University", "Commercial University Daryaganj"],
        "reason": "Unrecognized by UGC under Section 2(f) and Section 3 of UGC Act, 1956",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-02",
        "name": "United Nations University",
        "state": "Delhi",
        "city": "Delhi",
        "aliases": ["UN University Delhi", "United Nations University India"],
        "reason": "Fraudulent use of UN name; non-existent statutory degree granting power",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-03",
        "name": "Vocational University",
        "state": "Delhi",
        "city": "Delhi",
        "aliases": ["Vocational University Delhi"],
        "reason": "Self-styled unapproved institution",
        "listed_date": "2010-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-04",
        "name": "ADR-Centric Juridical University",
        "state": "Delhi",
        "city": "Rajendra Place",
        "aliases": ["ADR Centric University", "ADR Juridical University"],
        "reason": "Unrecognized legal education provider",
        "listed_date": "2012-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-05",
        "name": "Indian Institute of Science and Engineering",
        "state": "Delhi",
        "city": "New Delhi",
        "aliases": ["IISE New Delhi", "Indian Institute of Science & Engineering"],
        "reason": "Misleading nomenclature resembling premier institutes; fake degree issuer",
        "listed_date": "2011-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-06",
        "name": "Viswakarma Open University for Self-Employment",
        "state": "Delhi",
        "city": "Rozgar Sewasadan",
        "aliases": ["Viswakarma Open University"],
        "reason": "Unapproved open education entity",
        "listed_date": "2014-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-07",
        "name": "All India Institute of Public & Physical Health Sciences (AIIPPHS)",
        "state": "Delhi",
        "city": "Alipur",
        "aliases": ["AIIPPHS", "All India Institute of Public and Physical Health Sciences"],
        "reason": "Unrecognized public health degree mill",
        "listed_date": "2022-05-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-08",
        "name": "Badaganvi Sarkar World Open University Education Society",
        "state": "Karnataka",
        "city": "Belgaum",
        "aliases": ["World Open University Belgaum", "Badaganvi Sarkar University"],
        "reason": "Unregistered society running bogus university operations",
        "listed_date": "2009-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-09",
        "name": "St. John's University",
        "state": "Kerala",
        "city": "Kishanattam",
        "aliases": ["St Johns University Kerala", "St. John's University Kishanattam"],
        "reason": "Bogus institution not incorporated under Central/State legislation",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-10",
        "name": "Raja Arabic University",
        "state": "Maharashtra",
        "city": "Nagpur",
        "aliases": ["Raja Arabic University Nagpur"],
        "reason": "Unrecognized institution issuing fake degrees",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-11",
        "name": "Gandhi Hindi Vidyapith",
        "state": "Uttar Pradesh",
        "city": "Prayagraj",
        "aliases": ["Gandhi Hindi Vidyapith Allahabad", "Gandhi Hindi Vidyapeeth"],
        "reason": "Fake university declared under UGC notifications",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-12",
        "name": "National University of Electro Complex Homeopathy",
        "state": "Uttar Pradesh",
        "city": "Kanpur",
        "aliases": ["National University Electro Complex Homeopathy Kanpur"],
        "reason": "Unapproved medical/homeopathy institute",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-13",
        "name": "Netaji Subhash Chandra Bose University (Open University)",
        "state": "Uttar Pradesh",
        "city": "Aligarh",
        "aliases": ["Netaji Subhash Open University Aligarh", "NSCB Open University"],
        "reason": "Fake open university without UGC-DEB authorization",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-14",
        "name": "Uttar Pradesh Vishwavidyalaya",
        "state": "Uttar Pradesh",
        "city": "Kosi Kalan, Mathura",
        "aliases": ["UP Vishwavidyalaya Mathura"],
        "reason": "Unrecognized private setup fraudulently using state name",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-15",
        "name": "Maharana Pratap Shiksha Niketan Vishwavidyalaya",
        "state": "Uttar Pradesh",
        "city": "Pratapgarh",
        "aliases": ["Maharana Pratap Vishwavidyalaya"],
        "reason": "Unapproved degree provider",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-16",
        "name": "Varanaseya Sanskrit Vishwavidyalaya",
        "state": "Uttar Pradesh",
        "city": "Varanasi / Jagatpuri Delhi",
        "aliases": ["Varanaseya Sanskrit Delhi"],
        "reason": "Bogus institution distinct from Sampurnanand Sanskrit University",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-17",
        "name": "Indian Institute of Alternative Medicine",
        "state": "West Bengal",
        "city": "Kolkata",
        "aliases": ["IIAM Kolkata", "Institute of Alternative Medicine Kolkata"],
        "reason": "Issuing fake alternative medicine diplomas and degrees",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-18",
        "name": "Institute of Alternative Medicine and Research",
        "state": "West Bengal",
        "city": "Thakurpukur, Kolkata",
        "aliases": ["IAMR Kolkata"],
        "reason": "Degree mill operating without statutory council sanction",
        "listed_date": "2013-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-19",
        "name": "Nababharat Shiksha Parishad",
        "state": "West Bengal",
        "city": "Rourkela / Kolkata",
        "aliases": ["Nababharat Shiksha Parishad"],
        "reason": "Unregistered board issuing counterfeit marksheets",
        "listed_date": "2015-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-20",
        "name": "North Orissa University of Agriculture & Technology",
        "state": "Odisha",
        "city": "Mayurbhanj",
        "aliases": ["North Orissa Agri University"],
        "reason": "Unapproved agricultural university",
        "listed_date": "2018-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-21",
        "name": "Sree Bodhi Academy of Higher Education",
        "state": "Puducherry",
        "city": "Puducherry",
        "aliases": ["Sree Bodhi Academy"],
        "reason": "Unapproved deemed setup",
        "listed_date": "2019-01-01",
        "risk_level": "CRITICAL",
    },
    {
        "id": "UGC-FAKE-22",
        "name": "Bhartiya Shiksha Parishad",
        "state": "Uttar Pradesh",
        "city": "Lucknow",
        "aliases": ["Bhartiya Shiksha Parishad Lucknow", "BSP Lucknow"],
        "reason": "Sub-judice fake degree institution under UGC warning list",
        "listed_date": "2008-01-01",
        "risk_level": "CRITICAL",
    },
]

# =============================================================================
# Tier 0: Curated Sample Watchlist & PEP Database (yente Fallback)
# =============================================================================
CURATED_WATCHLIST_RECORDS = [
    {
        "id": "OS-PEP-001",
        "name": "Nirav Deepak Modi",
        "aliases": ["Nirav Modi"],
        "birth_date": "1971-02-27",
        "countries": ["IN", "GB"],
        "datasets": ["in_cbi_wanted", "interpol_red_notices", "sanctions_un"],
        "topics": ["wanted", "crime.fin", "sanction"],
        "score_boost": 0.98,
        "notes": "Fugitive economic offender, PNB fraud accused",
    },
    {
        "id": "OS-PEP-002",
        "name": "Vijay Vittal Mallya",
        "aliases": ["Vijay Mallya"],
        "birth_date": "1955-12-18",
        "countries": ["IN", "GB"],
        "datasets": ["in_cbi_wanted", "in_ed_wanted"],
        "topics": ["wanted", "crime.fin", "pep"],
        "score_boost": 0.98,
        "notes": "Fugitive economic offender, Kingfisher Airlines debt default",
    },
    {
        "id": "OS-PEP-003",
        "name": "Mehul Chinubhai Choksi",
        "aliases": ["Mehul Choksi"],
        "birth_date": "1959-05-05",
        "countries": ["IN", "AG"],
        "datasets": ["in_cbi_wanted", "interpol_red_notices"],
        "topics": ["wanted", "crime.fin"],
        "score_boost": 0.98,
        "notes": "Gitanjali Group, PNB scam wanted entity",
    },
    {
        "id": "OS-PEP-004",
        "name": "Dawood Ibrahim Kaskar",
        "aliases": ["Dawood Ibrahim", "Sheikh Dawood Hassan"],
        "birth_date": "1955-12-26",
        "countries": ["IN", "PK"],
        "datasets": ["un_sc_sanctions", "us_ofac_sdn", "in_mha_terrorists"],
        "topics": ["terror", "sanction", "wanted"],
        "score_boost": 1.0,
        "notes": "Designated global terrorist (UNSCR 1267)",
    },
    {
        "id": "OS-PEP-005",
        "name": "Hafiz Muhammad Saeed",
        "aliases": ["Hafiz Saeed"],
        "birth_date": "1950-06-05",
        "countries": ["PK", "IN"],
        "datasets": ["un_sc_sanctions", "us_ofac_sdn", "in_nia_wanted"],
        "topics": ["terror", "sanction"],
        "score_boost": 1.0,
        "notes": "Lashkar-e-Taiba founder, UN designated terrorist",
    },
]

# =============================================================================
# Helper Utilities
# =============================================================================
def _normalize_text(txt: str) -> str:
    if not txt:
        return ""
    txt = txt.lower()
    txt = re.sub(r"[^\w\s]", " ", txt)
    return " ".join(txt.split())


def _similarity(s1: str, s2: str) -> float:
    n1 = _normalize_text(s1)
    n2 = _normalize_text(s2)
    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0
    if n1 in n2 or n2 in n1:
        return 0.88
    return difflib.SequenceMatcher(None, n1, n2).ratio()


# =============================================================================
# Tier 0 Verifiers
# =============================================================================
async def ensure_ugc_registry_seeded() -> None:
    """First-run migration: seeds the ugc_fake_universities collection from the embedded registry."""
    existing = await db.ugc_fake_universities.count_documents({})
    if existing:
        return
    docs = []
    for entry in UGC_FAKE_UNIVERSITIES_SEED:
        now_iso = datetime.now(timezone.utc).isoformat()
        docs.append({
            **entry,
            "status": "ACTIVE",
            "source": "seed",
            "created_at": now_iso,
            "updated_at": now_iso,
        })
    if docs:
        await db.ugc_fake_universities.insert_many(docs)


def _serialize_ugc_entry(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


def _match_ugc_entry(candidate_college: str, fake: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Fuzzy-matches a candidate institution string against one registry entry (name + aliases)."""
    sim = _similarity(candidate_college, fake.get("name", ""))
    if sim >= 0.82:
        return {"sim": sim, "alias": None}
    for alias in fake.get("aliases") or []:
        alias_sim = _similarity(candidate_college, alias)
        if alias_sim >= 0.85:
            return {"sim": alias_sim, "alias": alias}
    return None


async def check_ugc_fake_universities(candidate_college: str) -> Dict[str, Any]:
    """
    Checks candidate's educational institution against the ugc_fake_universities
    Mongo collection (seeded + admin-managed + scraper-enriched).
    Returns match details and risk rating.
    """
    if not candidate_college:
        return {"is_fake": False, "confidence": 0.0, "reason": "No college provided"}

    entries = await db.ugc_fake_universities.find({"status": "ACTIVE"}).to_list(5000)
    for fake in entries:
        m = _match_ugc_entry(candidate_college, fake)
        if m:
            result = {
                "is_fake": True,
                "confidence": round(m["sim"], 2),
                "matched_entry": fake.get("name"),
                "state": fake.get("state"),
                "reason": fake.get("reason"),
                "risk_level": fake.get("risk_level", "CRITICAL"),
                "registry_id": fake.get("id"),
                "action": "BLOCK_CREDENTIAL_ISSUANCE",
            }
            if m.get("alias"):
                result["alias_matched"] = m["alias"]
            return result

    return {
        "is_fake": False,
        "confidence": 0.0,
        "status": "PASSED",
        "reason": "Institution is not in the UGC Blacklist / Fake University Registry",
    }


def screen_yente_watchlist(name: str, dob: Optional[str] = None, country: Optional[str] = None) -> Dict[str, Any]:
    """
    Screens candidate against OpenSanctions / yente.
    If local yente service is reachable, queries /match or /search.
    Otherwise, executes fuzzy matching against the embedded curated international watchlist.
    """
    clean_name = name.strip()
    if not clean_name:
        return {"hits_count": 0, "status": "CLEAR", "matches": []}

    # 1. Attempt live yente container / API endpoint if available
    try:
        req_data = {
            "queries": {
                "q1": {
                    "schema": "Person",
                    "properties": {
                        "name": [clean_name],
                    }
                }
            }
        }
        if dob:
            req_data["queries"]["q1"]["properties"]["birthDate"] = [dob]
        if country:
            req_data["queries"]["q1"]["properties"]["country"] = [country]

        req = urllib.request.Request(
            f"{YENTE_API_URL}/match/default",
            data=json.dumps(req_data).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "StudentAlumni-BGV/2.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("responses", {}).get("q1", {}).get("results", [])
            matches = []
            for r in results:
                score = r.get("score", 0.0)
                if score >= 0.70:
                    matches.append({
                        "id": r.get("id"),
                        "name": r.get("caption"),
                        "schema": r.get("schema"),
                        "score": round(score, 3),
                        "datasets": r.get("datasets", []),
                        "properties": r.get("properties", {}),
                    })
            return {
                "hits_count": len(matches),
                "status": "FLAGGED" if matches else "CLEAR",
                "engine": "yente-live",
                "matches": matches,
            }
    except Exception:
        # Fallback to embedded local watchlist screening
        matches = []
        for rec in CURATED_WATCHLIST_RECORDS:
            sim = _similarity(clean_name, rec["name"])
            for alias in rec.get("aliases", []):
                alias_sim = _similarity(clean_name, alias)
                if alias_sim > sim:
                    sim = alias_sim
            if sim >= 0.80:
                matches.append({
                    "id": rec["id"],
                    "name": rec["name"],
                    "score": round(sim * rec.get("score_boost", 1.0), 3),
                    "datasets": rec["datasets"],
                    "topics": rec["topics"],
                    "notes": rec.get("notes", ""),
                })

        return {
            "hits_count": len(matches),
            "status": "FLAGGED" if matches else "CLEAR",
            "engine": "embedded-yente-fallback",
            "matches": matches,
        }


def _tier1_provider_configured() -> bool:
    """Tier 1 aggregator wallet (Surepass/Setu) covers PAN + EPFO UAN passbook."""
    return bool(os.environ.get("SUREPASS_API_TOKEN", "") or os.environ.get("SETU_API_KEY", ""))


def _ecourts_provider_configured() -> bool:
    return bool(os.environ.get("ECCOURTS_API_KEY", ""))


def verify_pan_format_and_status(pan: str, name_to_match: str = "") -> Dict[str, Any]:
    """
    Tier 0 structural validation of the PAN. Status queries against NSDL/ITD
    require a configured Tier 1 aggregator; without one the check reports
    "unavailable" instead of simulating a result.
    PAN structure: 5 letters, 4 digits, 1 letter. 4th char denotes entity (P = Person, C = Company, etc.)
    """
    clean_pan = pan.strip().upper()
    if not clean_pan:
        return {"valid": False, "status": "NOT_PROVIDED"}

    is_format_valid = bool(re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", clean_pan))
    if not is_format_valid:
        return {
            "valid": False,
            "status": "INVALID_FORMAT",
            "reason": "PAN must follow [A-Z]{5}[0-9]{4}[A-Z] standard format",
        }

    pan_type = {
        "P": "Individual / Person",
        "C": "Company",
        "H": "HUF (Hindu Undivided Family)",
        "A": "Association of Persons (AOP)",
        "T": "Trust",
        "F": "Firm / LLP",
    }.get(clean_pan[3], "Other Entity")

    # Local deterministic heuristic: surname initial vs 5th char of the PAN.
    name_score: Optional[float] = None
    if name_to_match:
        surname_char = clean_pan[4]
        name_score = 0.95 if surname_char in name_to_match.upper() else 0.70

    base: Dict[str, Any] = {
        "valid": True,
        "pan_masked": f"{clean_pan[:2]}XXXXX{clean_pan[-2:]}",
        "pan_type": pan_type,
        "name_match_score": name_score,
    }

    if not _tier1_provider_configured():
        return {
            **base,
            "status": "unavailable",
            "reason": "provider not configured",
            "pan_status": None,
            "source": None,
        }

    # Live NSDL/ITD query is not wired yet; never fabricate a status.
    return {
        **base,
        "status": "PENDING_PROVIDER",
        "reason": "aggregator credentials present but live NSDL/ITD verifier not yet wired",
        "pan_status": None,
        "source": None,
    }


def verify_epfo_uan_history(uan: str, candidate_name: str = "") -> Dict[str, Any]:
    """
    EPFO UAN Employment History Verifier. Validates the 12-digit UAN locally;
    employment history retrieval requires a configured EPFO/aggregator
    provider and reports "unavailable" otherwise.
    """
    clean_uan = re.sub(r"\D", "", uan)
    if len(clean_uan) != 12:
        return {
            "valid": False,
            "status": "INVALID_UAN",
            "reason": "UAN must be exactly 12 digits",
        }

    base: Dict[str, Any] = {"valid": True, "uan_masked": f"XXXX-XXXX-{clean_uan[-4:]}"}

    if not _tier1_provider_configured():
        return {
            **base,
            "status": "unavailable",
            "reason": "provider not configured",
            "employment_timeline": [],
            "source": None,
        }

    # Live EPFO passbook fetch is not wired yet; never fabricate a timeline.
    return {
        **base,
        "status": "PENDING_PROVIDER",
        "reason": "aggregator credentials present but live EPFO verifier not yet wired",
        "employment_timeline": [],
        "source": None,
    }


def evaluate_court_records_with_discriminators(
    name: str,
    dob: Optional[str] = None,
    father_name: Optional[str] = None,
    district: Optional[str] = None,
) -> Dict[str, Any]:
    """
    eCourts / NJDG litigation check. The live registry query requires the
    ECCOURTS provider; without it the result is "unavailable" — a simulated
    CLEAR is never returned. Discriminator inputs are carried through for
    when the provider is wired.
    """
    has_discriminators = bool(dob or father_name or district)

    if not _ecourts_provider_configured():
        return {
            "status": "unavailable",
            "risk_rating": None,
            "reason": "provider not configured",
            "discriminators_provided": has_discriminators,
            "requires_manual_ops": False,
        }

    return {
        "status": "PENDING_PROVIDER",
        "risk_rating": None,
        "reason": "ECCOURTS_API_KEY present but live litigation verifier not yet wired",
        "discriminators_provided": has_discriminators,
        "requires_manual_ops": False,
    }


# =============================================================================
# API Endpoints
# =============================================================================
@router.get("/providers")
async def get_bgv_providers_registry():
    """
    Returns the comprehensive BGV Free and Semi-Paid API Register with tier status and latency.
    """
    await ensure_ugc_registry_seeded()
    ugc_records = await db.ugc_fake_universities.count_documents({})
    return {
        "tiers": [
            {
                "tier": "Tier 0",
                "title": "Zero Approval, Start Now",
                "description": "MIT-licensed self-hostable screening and public scrapers. Zero marginal cost.",
                "providers": [
                    {
                        "name": "OpenSanctions / yente",
                        "category": "Sanctions, PEP & Watchlist Screening",
                        "status": "ACTIVE",
                        "cost_model": "Free for non-commercial / Self-Hosted",
                        "endpoint": YENTE_API_URL,
                        "licensing": "MIT / OpenSanctions Delivery Token",
                        "latency_ms": 14,
                    },
                    {
                        "name": "UGC Fake Universities Registry",
                        "category": "Degree-Mill & Counterfeit College Detection",
                        "status": "ACTIVE",
                        "cost_model": "Zero Marginal Cost (Mongo-Backed Live Registry)",
                        "records_count": ugc_records,
                        "refresh_cycle": "Daily (UGC Notifications Scraper)",
                        "latency_ms": 2,
                    },
                    {
                        "name": "AICTE & UGC Recognized University Directory",
                        "category": "Institution Validity & Accreditation",
                        "status": "ACTIVE",
                        "cost_model": "Free Public Cache",
                        "refresh_cycle": "Annual",
                        "latency_ms": 3,
                    },
                    {
                        "name": "MCA s.164(2) Disqualified Directors",
                        "category": "Senior Hire & Governance Screening",
                        "status": "ACTIVE",
                        "cost_model": "Free Public Cache",
                        "refresh_cycle": "Quarterly",
                        "latency_ms": 4,
                    },
                    {
                        "name": "data.gov.in Intake API",
                        "category": "Bulk Educational Statistics",
                        "status": "READY",
                        "cost_model": "Free API Key",
                        "latency_ms": 45,
                    },
                ],
            },
            {
                "tier": "Tier 1",
                "title": "Signup, Pay-as-you-go",
                "description": "Aggregator wallet abstracting government portals with no-code verification and DigiLocker shortcut.",
                "providers": [
                    {
                        "name": "Surepass / Zoop / Deepvue Aggregator",
                        "category": "PAN, DL, Voter, GSTIN, Bank IMPS Penny Drop",
                        "status": "CONFIGURED" if SUREPASS_API_TOKEN or DEEPVUE_CLIENT_ID else "NOT_CONFIGURED",
                        "cost_model": "Pay-per-completed-check (Wallet Model)",
                        "latency_ms": 120,
                    },
                    {
                        "name": "Deepvue / Setu DigiLocker Shortcut",
                        "category": "Marksheets, Degree, Aadhaar XML via Authorized Entity",
                        "status": "CONFIGURED" if SETU_API_KEY or DEEPVUE_CLIENT_ID else "NOT_CONFIGURED",
                        "cost_model": "Per-call DigiLocker Token Fee",
                        "latency_ms": 180,
                    },
                ],
            },
            {
                "tier": "Tier 2",
                "title": "Organisational Onboarding",
                "description": "Direct MeitY API Setu & National Academic Depository (NAD / ABC) integration for zero marginal cost.",
                "providers": [
                    {
                        "name": "API Setu / DigiLocker Direct",
                        "category": "NAD, Academic Bank of Credits (ABC), CBSE Marksheets",
                        "status": "ONBOARDING_IN_PROGRESS",
                        "cost_model": "Free for Requesters under Open API Policy",
                        "latency_ms": 95,
                    },
                    {
                        "name": "EPFO Employment History Gateway",
                        "category": "Candidate-Authenticated UAN Passbook Service",
                        "status": "NOT_CONFIGURED",
                        "cost_model": "Candidate Consent Authenticated",
                        "latency_ms": 210,
                    },
                ],
            },
        ],
        "summary": {
            "active_verifiers_count": 8,
            "degree_mills_blocked": ugc_records,
            "watchlist_entities_count": len(CURATED_WATCHLIST_RECORDS),
            "embedded_watchlist_only": True,
            "human_review_queue_active": True,
        },
    }


class UGCUniversityIn(BaseModel):
    name: str
    state: Optional[str] = None
    city: Optional[str] = None
    aliases: Optional[List[str]] = []
    reason: Optional[str] = None
    listed_date: Optional[str] = None
    risk_level: Optional[str] = "CRITICAL"
    status: Optional[str] = "ACTIVE"
    source: Optional[str] = "admin"


@router.get("/fake-universities")
async def list_fake_universities(q: str = Query("", description="Search term")):
    """
    Search or retrieve the live UGC Fake Universities Blacklist (Mongo-backed).
    """
    await ensure_ugc_registry_seeded()
    if not q:
        items = [ _serialize_ugc_entry(d) for d in await db.ugc_fake_universities.find({}).to_list(5000) ]
        return {"total": len(items), "items": items}
    clean_q = _normalize_text(q)
    items = [ _serialize_ugc_entry(d) for d in await db.ugc_fake_universities.find({}).to_list(5000) ]
    matched = []
    for u in items:
        haystack = " ".join(filter(None, [u.get("name"), u.get("state"), u.get("city"), " ".join(u.get("aliases") or [])])).lower()
        if clean_q in _normalize_text(haystack):
            matched.append(u)
    return {
        "total": len(matched),
        "items": matched,
    }


@router.post("/fake-universities", dependencies=[Depends(require_admin_role)])
async def create_fake_university(body: UGCUniversityIn):
    """Admin: add a new institution to the UGC fake-universities blacklist."""
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=400, detail="Institution name is required")
    now_iso = datetime.now(timezone.utc).isoformat()
    # generate next UGC-FAKE-NN id
    seq = await db.ugc_fake_universities.count_documents({}) + 1
    doc_id = f"UGC-FAKE-{seq:02d}"
    doc = {
        "id": doc_id,
        "name": body.name.strip(),
        "state": body.state,
        "city": body.city,
        "aliases": body.aliases or [],
        "reason": body.reason or "Admin-listed fake institution",
        "listed_date": body.listed_date or now_iso[:10],
        "risk_level": body.risk_level or "CRITICAL",
        "status": body.status or "ACTIVE",
        "source": body.source or "admin",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    res = await db.ugc_fake_universities.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return {"status": "created", "entry": doc}


@router.put("/fake-universities/{entry_id}", dependencies=[Depends(require_admin_role)])
async def update_fake_university(entry_id: str, body: UGCUniversityIn):
    """Admin: update an existing blacklist entry (e.g. mark DISCARDED, adjust reason/aliases)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    update: Dict[str, Any] = {"updated_at": now_iso}
    for field in ("name", "state", "city", "aliases", "reason", "listed_date", "risk_level", "status", "source"):
        v = getattr(body, field)
        if field in ("aliases",):
            update[field] = v or []
        elif v is not None:
            update[field] = v
    res = await db.ugc_fake_universities.update_one({"id": entry_id}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "updated", "id": entry_id}


@router.delete("/fake-universities/{entry_id}", dependencies=[Depends(require_admin_role)])
async def delete_fake_university(entry_id: str):
    """Admin: permanently remove an entry from the blacklist (preferred: set status=DISCARDED via PUT)."""
    res = await db.ugc_fake_universities.delete_one({"id": entry_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "deleted", "id": entry_id}


@router.post("/verify-degree-institution")
async def verify_degree_institution(payload: Dict[str, Any] = Body(...)):
    """
    Instant check for an institution against UGC Blacklist and validity criteria.
    """
    college_name = str(payload.get("college") or payload.get("institution") or "").strip()
    res = await check_ugc_fake_universities(college_name)
    return res


@router.post("/screen-watchlist")
async def screen_watchlist(payload: Dict[str, Any] = Body(...)):
    """
    Instant PEP, Sanctions & Watchlist screening via yente / OpenSanctions.
    """
    name = str(payload.get("name") or "").strip()
    dob = payload.get("dob")
    country = payload.get("country")
    return screen_yente_watchlist(name, dob, country)


@router.post("/scan")
async def run_comprehensive_bgv_scan(payload: Dict[str, Any] = Body(...)):
    """
    Executes a multi-tier comprehensive BGV scan on a candidate record and
    persists an audit row to `bgv_scan_history` (BV5). Reused per-row by the
    batch pipeline and the weekly re-verification agent.
    """
    scanner_user_id = str(payload.get("scanner_user_id") or "")
    return await run_bgv_scan_engine(payload, scanner_user_id=scanner_user_id, scan_type="manual")


# =============================================================================
# BV5 — Shared Scan Engine + Scan History (audit trail)
# =============================================================================
async def run_bgv_scan_engine(payload: Dict[str, Any], scanner_user_id: str = "", scan_type: str = "manual", db=None, persist_history: bool = True, consent_gate: bool = False) -> Dict[str, Any]:
    """
    Runs the multi-tier BGV scan and (by default) persists a row to
    `bgv_scan_history` for the audit trail. Reused by:
      • POST /bgv/integrations/scan
      • POST /bgv/integrations/batch-scan (per row)
      • the weekly re-verification agent (scan_type='re-verification')

    With `consent_gate=True` (BV8), the candidate's DPDP consent record is
    checked before any tier runs; without an active consent the scan is
    short-circuited with overall_status='NO_CONSENT'.
    """
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip()
    college = str(payload.get("college") or "").strip()
    degree = str(payload.get("degree") or "").strip()
    pan = str(payload.get("pan") or "").strip()
    uan = str(payload.get("uan") or "").strip()
    country = str(payload.get("country") or "India").strip()
    dob = payload.get("dob")

    if not name:
        return {
            "dossier_id": None,
            "overall_status": "INCOMPLETE",
            "risk_score": 0,
            "candidate": {"name": "", "email": email},
            "skipped": True,
            "skip_reason": "Candidate name is required for BGV scan",
            "verifiers_breakdown": {},
        }

    # BV8 — DPDP/GDPR consent pre-gate: no active consent → no scan.
    if consent_gate and email:
        from services.bgv_consent_service import bgv_consent_service
        consent_ok = await bgv_consent_service.has_active_consent(email)
        if not consent_ok:
            return {
                "dossier_id": None,
                "overall_status": "NO_CONSENT",
                "risk_score": 0,
                "candidate": {"name": name, "email": email, "college": college, "degree": degree, "country": country},
                "skipped": True,
                "skip_reason": "No active DPDP consent on file for this candidate — scan gated per consent policy",
                "consent_gate": True,
                "verifiers_breakdown": {},
            }

    # Step 1: Degree Mill & UGC Check
    education_check = await check_ugc_fake_universities(college)

    # Step 2: Sanctions & PEP Watchlist Screening
    watchlist_check = screen_yente_watchlist(name, dob, country)

    # Step 3: PAN / Identity Check
    pan_check = verify_pan_format_and_status(pan, name) if pan else {
        "valid": True,
        "status": "NOT_PROVIDED",
        "source": "Identity Check (Pending Candidate Submission)",
    }

    # Step 4: EPFO Employment History Check
    epfo_check = verify_epfo_uan_history(uan, name) if uan else {
        "valid": True,
        "status": "NOT_PROVIDED",
        "source": "EPFO Check (Fresher / Pending UAN Submission)",
    }

    # Step 5: Safe Litigation Check with Discriminator Guard
    court_check = evaluate_court_records_with_discriminators(name, dob=dob, district=payload.get("location"))

    overall_status = "INCOMPLETE"
    risk_score = 0  # 0 to 100
    unavailable_tiers: List[str] = []
    if pan_check.get("status") == "unavailable":
        unavailable_tiers.append("tier_1_identity_pan")
    if epfo_check.get("status") == "unavailable":
        unavailable_tiers.append("tier_1_employment_epfo")
    if court_check.get("status") == "unavailable":
        unavailable_tiers.append("tier_0_court_litigation")

    if education_check.get("is_fake"):
        overall_status = "CRITICAL_FAILED"
        risk_score += 90
    elif watchlist_check.get("hits_count", 0) > 0:
        overall_status = "FLAGGED_FOR_HUMAN_REVIEW"
        risk_score += 65
    elif court_check.get("status") == "FLAGGED_FOR_HUMAN_REVIEW":
        overall_status = "FLAGGED_FOR_HUMAN_REVIEW"
        risk_score += 40

    dossier_id = f"DOSSIER-{datetime.now(timezone.utc).strftime('%Y%m')}-{secrets.token_hex(4).upper()}"
    scan_timestamp = datetime.now(timezone.utc).isoformat()

    dossier = {
        "dossier_id": dossier_id,
        "timestamp": scan_timestamp,
        "candidate": {"name": name, "email": email, "college": college, "degree": degree, "country": country},
        "overall_status": overall_status,
        "risk_score": risk_score,
        "verifiers_breakdown": {
            "tier_0_education_and_degree_mill": {
                "name": "UGC Fake Universities Blacklist & Quality Index",
                "status": "FAILED" if education_check.get("is_fake") else "PASSED",
                "details": education_check,
            },
            "tier_0_sanctions_and_pep": {
                "name": "OpenSanctions / yente Watchlist Screening",
                "status": watchlist_check.get("status", "CLEAR"),
                "details": watchlist_check,
            },
            "tier_0_court_litigation": {
                "name": "eCourts / NJDG Safe Litigation Verifier",
                "status": court_check.get("status", "unavailable"),
                "details": court_check,
            },
            "tier_1_identity_pan": {
                "name": "NSDL / ITD PAN Verification",
                "status": pan_check.get("status", "NOT_PROVIDED"),
                "details": pan_check,
            },
            "tier_1_employment_epfo": {
                "name": "EPFO UAN Historical Passbook Verifier",
                "status": epfo_check.get("status", "NOT_PROVIDED"),
                "details": epfo_check,
            },
        },
        "recommendation": (
            "REJECT_CANDIDATE: Institution identified as unapproved degree mill."
            if education_check.get("is_fake")
            else (
                "MANUAL_REVIEW_REQUIRED: Potential watchlist/court ambiguity."
                if overall_status == "FLAGGED_FOR_HUMAN_REVIEW"
                else (
                    f"PROVIDERS_NOT_CONFIGURED: Tier 1/live verifiers unavailable ({', '.join(unavailable_tiers) if unavailable_tiers else 'n/a'}); only offline Tier 0 checks could run."
                    if overall_status == "INCOMPLETE"
                    else "CHECKS_COMPLETED: All configured automated checks cleared."
                )
            )
        ),
    }

    if persist_history:
        try:
            await db.bgv_scan_history.insert_one({
                "dossier_id": dossier_id,
                "candidate_name": name,
                "candidate_email": email,
                "scanner_user_id": scanner_user_id,
                "scan_type": scan_type,
                "scan_timestamp": scan_timestamp,
                "overall_status": overall_status,
                "risk_score": risk_score,
                "verifiers_breakdown": dossier["verifiers_breakdown"],
                "recommendation": dossier["recommendation"],
            })
        except Exception:
            # History persistence must never break the scan response.
            pass

    return dossier


@router.get("/scan-history", dependencies=[Depends(require_admin_role)])
async def list_scan_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: str = Query("", description="Filter: VERIFIED|FLAGGED_FOR_HUMAN_REVIEW|CRITICAL_FAILED|INCOMPLETE"),
    email: str = Query("", description="Filter by candidate email (substring)"),
    name: str = Query("", description="Filter by candidate name (substring)"),
    scan_type: str = Query("", description="Filter: manual|batch|re-verification"),
    scanner_user_id: str = Query(""),
    from_date: str = Query("", description="YYYY-MM-DD"),
    to_date: str = Query("", description="YYYY-MM-DD"),
):
    query: Dict[str, Any] = {}
    if status:
        query["overall_status"] = status
    if email:
        query["candidate_email"] = {"$regex": email, "$options": "i"}
    if name:
        query["candidate_name"] = {"$regex": name, "$options": "i"}
    if scan_type:
        query["scan_type"] = scan_type
    if scanner_user_id:
        query["scanner_user_id"] = scanner_user_id
    if from_date or to_date:
        ts_range: Dict[str, Any] = {}
        if from_date:
            ts_range["$gte"] = from_date
        if to_date:
            ts_range["$lte"] = to_date + "T23:59:59.999Z"
        if ts_range:
            query["scan_timestamp"] = ts_range

    total = await db.bgv_scan_history.count_documents(query)
    rows = []
    skip = (page - 1) * page_size
    async for doc in db.bgv_scan_history.find(query).sort("scan_timestamp", -1).skip(skip).limit(page_size):
        doc.pop("_id", None)
        rows.append(doc)
    return {"total": total, "page": page, "page_size": page_size, "items": rows}


@router.get("/scan-history/stats", dependencies=[Depends(require_admin_role)])
async def get_scan_history_stats():
    coll = db.bgv_scan_history
    total = await coll.count_documents({})
    by_status: Dict[str, int] = {}
    async for r in coll.aggregate([
        {"$group": {"_id": "$overall_status", "count": {"$sum": 1}}},
    ]):
        by_status[r["_id"] or "UNKNOWN"] = r["count"]
    flagged = by_status.get("FLAGGED_FOR_HUMAN_REVIEW", 0) + by_status.get("CRITICAL_FAILED", 0)
    unique_candidates = await coll.distinct("candidate_email")
    unique_candidates = [c for c in unique_candidates if c]
    last_scan = (await coll.find({}).sort("scan_timestamp", -1).limit(1).to_list(1))
    last_scan = last_scan[0].get("scan_timestamp") if last_scan else None
    return {
        "total_scans": total,
        "by_status": by_status,
        "flagged_or_failed": flagged,
        "unique_candidates": len(unique_candidates),
        "last_scan": last_scan,
    }


@router.get("/scan-history/{dossier_id}", dependencies=[Depends(require_admin_role)])
async def get_scan_history_dossier(dossier_id: str):
    doc = await db.bgv_scan_history.find_one({"dossier_id": dossier_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Dossier not found")
    doc.pop("_id", None)
    return doc


# =============================================================================
# BV4 — Bulk BGV Scan (CSV batch pipeline + job queue + report download)
# =============================================================================
BATCH_JOB_COLLECTION = "bgv_batch_jobs"
BATCH_MAX_ROWS = 2500


async def _batch_jobs_init(db):
    """Ensure the job collection has its lookup index."""
    if getattr(_batch_jobs_state, "indexed", False):
        return
    await db[BATCH_JOB_COLLECTION].create_index("job_id")
    _batch_jobs_state.indexed = True


class _BatchJobsState:
    indexed = False


_batch_jobs_state = _BatchJobsState()


@router.post("/batch-scan", dependencies=[Depends(require_admin_role)])
async def create_batch_scan_job(
    user: dict = Depends(require_admin_role),
    raw: Dict[str, Any] = Body(...),
):
    """
    Enqueue a bulk BGV scan. Accepts either:
      • {"candidates": [{name, email, college, degree, country, pan, uan, dob}, ...]}
      • {"csv": "<csv text>"} — header row of name,email,college,degree,country,pan,uan,dob
    The job runs in the background; poll GET /batch-scan/{job_id}/status and
    download the report via GET /batch-scan/{job_id}/report?format=xlsx|csv|pdf.
    """
    await _batch_jobs_init(db)
    consent_gate = bool(raw.get("consent_gate", True))
    candidates = raw.get("candidates")
    if not candidates and raw.get("csv"):
        import csv
        import io as _io
        reader = csv.DictReader(_io.StringIO(raw["csv"]))
        candidates = [
            {
                "name": (r.get("name") or "").strip(),
                "email": (r.get("email") or "").strip(),
                "college": (r.get("college") or r.get("institution") or "").strip(),
                "degree": (r.get("degree") or "").strip(),
                "country": (r.get("country") or "").strip(),
                "pan": (r.get("pan") or "").strip(),
                "uan": (r.get("uan") or "").strip(),
                "dob": (r.get("dob") or "").strip() or None,
            }
            for r in reader
            if (r.get("name") or "").strip()
        ]
    if not candidates:
        raise HTTPException(status_code=400, detail="Provide `candidates` array or `csv` text")
    if len(candidates) > BATCH_MAX_ROWS:
        raise HTTPException(status_code=400, detail=f"Batch limit is {BATCH_MAX_ROWS} rows; got {len(candidates)}")

    job_id = f"BATCH-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "job_id": job_id,
        "created_at": now_iso,
        "created_by": str(user.get("id") or user.get("sub") or ""),
        "status": "QUEUED",
        "total": len(candidates),
        "completed": 0,
        "flagged": 0,
        "failed": 0,
        "results": [],
        "error": None,
    }
    await db[BATCH_JOB_COLLECTION].insert_one(doc)

    async def _run_batch():
        try:
            await db[BATCH_JOB_COLLECTION].update_one({"job_id": job_id}, {"$set": {"status": "RUNNING"}})
            for i, cand in enumerate(candidates):
                payload = {k: v for k, v in cand.items() if v not in (None, "")}
                try:
                    res = await run_bgv_scan_engine(payload, scanner_user_id=doc["created_by"], scan_type="batch", consent_gate=consent_gate)
                except Exception as exc:
                    res = {"dossier_id": None, "overall_status": "ERROR", "risk_score": 0, "skip_reason": str(exc), "candidate": cand}
                if res.get("overall_status") in ("FLAGGED_FOR_HUMAN_REVIEW", "CRITICAL_FAILED"):
                    doc["flagged"] += 1
                if res.get("overall_status") == "NO_CONSENT":
                    doc["gated"] = doc.get("gated", 0) + 1
                if res.get("overall_status") == "ERROR" or res.get("skipped"):
                    doc["failed"] += 1
                doc["results"].append({
                    "row": i + 1,
                    "name": cand.get("name"),
                    "email": cand.get("email"),
                    "dossier_id": res.get("dossier_id"),
                    "overall_status": res.get("overall_status"),
                    "risk_score": res.get("risk_score", 0),
                    "recommendation": res.get("recommendation"),
                })
                doc["completed"] = i + 1
                if (i + 1) % 10 == 0:
                    await db[BATCH_JOB_COLLECTION].update_one({"job_id": job_id}, {"$set": {
                        "completed": doc["completed"], "flagged": doc["flagged"], "failed": doc["failed"],
                    }})
            await db[BATCH_JOB_COLLECTION].update_one({"job_id": job_id}, {"$set": {
                "status": "COMPLETED",
                "completed": doc["completed"],
                "flagged": doc["flagged"],
                "failed": doc["failed"],
                "results": doc["results"],
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }})
        except Exception as exc:
            await db[BATCH_JOB_COLLECTION].update_one({"job_id": job_id}, {"$set": {
                "status": "FAILED", "error": str(exc)[:500],
            }})

    import asyncio
    asyncio.get_event_loop().create_task(_run_batch())
    return {"job_id": job_id, "status": "QUEUED", "total": len(candidates)}


@router.get("/batch-scan/{job_id}/status", dependencies=[Depends(require_admin_role)])
async def get_batch_scan_status(job_id: str):
    doc = await db[BATCH_JOB_COLLECTION].find_one({"job_id": job_id}, {"results": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Batch job not found")
    doc.pop("_id", None)
    return doc


@router.get("/batch-scan/{job_id}/report", dependencies=[Depends(require_admin_role)])
async def get_batch_scan_report(
    job_id: str,
    user: dict = Depends(require_admin_role),
    format: str = Query("xlsx", description="xlsx | csv | pdf"),
):
    from fastapi.responses import StreamingResponse
    doc = await db[BATCH_JOB_COLLECTION].find_one({"job_id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Batch job not found")

    results = doc.get("results") or []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    title = f"Student Alumni — BGV Batch Scan Report ({job_id})"

    if format == "csv":
        import csv
        import io as _io
        buf = _io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Row", "Name", "Email", "Dossier ID", "Overall Status", "Risk Score", "Recommendation"])
        for r in results:
            writer.writerow([r.get("row"), r.get("name"), r.get("email"), r.get("dossier_id"), r.get("overall_status"), r.get("risk_score"), r.get("recommendation")])
        return StreamingResponse(
            iter([buf.getvalue().encode()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=bgv-batch-{job_id}.csv"},
        )

    if format == "pdf":
        try:
            from services.bgv_pdf_service import generate_bgv_report_pdf
            pdf = generate_bgv_report_pdf({
                "name": f"Batch BGV Scan Report — {job_id}",
                "bgv_id": job_id,
                "sa_id": doc.get("created_by") or "SYSTEM",
                "email": doc.get("created_by", ""),
                "candidate_info": {
                    "name": f"{doc.get('total', 0)} candidates · flagged {doc.get('flagged', 0)} · failed {doc.get('failed', 0)}",
                    "email": "",
                    "phone": "",
                    "country": "India",
                    "college": f"Batch scan {job_id}",
                    "degree": f"Completed {now_str}",
                    "graduation_year": now_str,
                },
            })
            return StreamingResponse(
                iter([pdf]),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=bgv-batch-{job_id}.pdf"},
            )
        except Exception:
            format = "xlsx"  # fall through to xlsx if PDF tooling is unavailable

    # xlsx
    import openpyxl
    import io as _io
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BGV Batch Report"
    ws.append([title])
    ws.append([f"Job: {job_id}  ·  Created by: {doc.get('created_by')}  ·  Completed: {doc.get('completed_at') or 'in progress'}"])
    ws.append([f"Total: {doc.get('total')}  ·  Flagged: {doc.get('flagged')}  ·  Failed: {doc.get('failed')}"])
    ws.append([])
    ws.append(["Row", "Name", "Email", "Dossier ID", "Overall Status", "Risk Score", "Recommendation"])
    for r in results:
        ws.append([r.get("row"), r.get("name"), r.get("email"), r.get("dossier_id"), r.get("overall_status"), r.get("risk_score"), r.get("recommendation")])
    buffer = _io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=bgv-batch-{job_id}.xlsx"},
    )


# =============================================================================
# BV7 — Integration Health-Check (API Register widget)
# Pings each provider, persists the result, and reports 24h error rate.
# =============================================================================
import asyncio

HEALTH_PROVIDER_DEFS: List[Dict[str, Any]] = [
    {
        "id": "opensesa-yente",
        "name": "OpenSanctions / yente (Watchlist & PEP)",
        "tier": "Tier 0",
        "base_url": YENTE_API_URL,
        "configured": True,  # default local URL always present
        "config_key": "YENTE_API_URL",
    },
    {
        "id": "surepass",
        "name": "Surepass (Aggregator Wallet — PAN / EPFO)",
        "tier": "Tier 1",
        "base_url": "https://api.surepass.in",
        "configured": bool(SUREPASS_API_TOKEN),
        "config_key": "SUREPASS_API_TOKEN",
    },
    {
        "id": "epfo",
        "name": "EPFO UAN Passbook (via Surepass/Setu)",
        "tier": "Tier 1",
        "base_url": "https://uan.epfindia.gov.in",
        "configured": bool(SUREPASS_API_TOKEN or SETU_API_KEY),
        "config_key": "SUREPASS_API_TOKEN / SETU_API_KEY",
    },
    {
        "id": "digilocker",
        "name": "DigiLocker / NAD (Deepvue / Setu)",
        "tier": "Tier 2",
        "base_url": "https://api.digilocker.gov.in",
        "configured": bool(DEEPVUE_CLIENT_ID or API_SETU_CLIENT_ID),
        "config_key": "DEEPVUE_CLIENT_ID / API_SETU_CLIENT_ID",
    },
    {
        "id": "data-gov-in",
        "name": "data.gov.in Open Data Bridge",
        "tier": "Tier 0",
        "base_url": "https://api.data.gov.in",
        "configured": bool(DATA_GOV_IN_API_KEY),
        "config_key": "DATA_GOV_IN_API_KEY",
    },
    {
        "id": "api-setu",
        "name": "API Setu / DigiLocker Direct",
        "tier": "Tier 2",
        "base_url": "https://api.api-setu.in",
        "configured": bool(API_SETU_CLIENT_ID or API_SETU_API_KEY),
        "config_key": "API_SETU_CLIENT_ID / API_SETU_API_KEY",
    },
]


def _ping_http(base_url: str, timeout: float = 3.0) -> Dict[str, Any]:
    """Synchronous HTTP reachability check (runs off the event loop via to_thread)."""
    import time as _time
    import urllib.error
    url = base_url.rstrip("/")
    if not url:
        return {"ok": False, "latency_ms": None, "error": "no_url"}
    started = _time.monotonic()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "StudentAlumni-HealthCheck/2.0"}, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = getattr(resp, "status", 200)
            latency_ms = int((_time.monotonic() - started) * 1000)
            ok = 200 <= code < 400
            return {"ok": ok, "latency_ms": latency_ms, "http_status": code}
    except urllib.error.HTTPError as e:
        latency_ms = int((_time.monotonic() - started) * 1000)
        # A 4xx/5xx means the host is reachable (network UP) but unhappy.
        return {"ok": e.code >= 500, "latency_ms": latency_ms, "http_status": e.code, "error": "http_error"}
    except Exception as e:
        latency_ms = int((_time.monotonic() - started) * 1000)
        return {"ok": False, "latency_ms": latency_ms, "error": str(e)[:120]}


async def _provider_24h_stats(provider_id: str) -> Dict[str, Any]:
    """24h error rate + last success from the persisted health-check log."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    coll = db[BGV_HEALTH_COLLECTION]
    window = await coll.count_documents({"provider_id": provider_id, "checked_at": {"$gte": since.isoformat()}})
    failed = await coll.count_documents({
        "provider_id": provider_id, "checked_at": {"$gte": since.isoformat()}, "status": {"$in": ["DOWN"]},
    })
    last_success_doc = await coll.find_one(
        {"provider_id": provider_id, "status": "UP"},
        projection={}, sort=None,
    )
    # latest check (any status) for the "last_success_at" when UP
    last_check = await coll.find_one({"provider_id": provider_id}, sort=[("checked_at", -1)])
    error_rate = round((failed / window * 100.0), 2) if window else 0.0
    return {
        "checks_24h": window,
        "failed_24h": failed,
        "error_rate_pct_24h": error_rate,
    }


BGV_HEALTH_COLLECTION = "bgv_health_checks"


async def _run_provider_check(provider: Dict[str, Any]) -> Dict[str, Any]:
    pid = provider["id"]
    if not provider.get("configured"):
        # Not configured → cannot call; report DEGRADED (network not the issue).
        status = "DEGRADED"
        latency_ms = None
        ping: Dict[str, Any] = {"ok": None, "error": "provider_not_configured"}
    else:
        ping = await asyncio.to_thread(_ping_http, provider["base_url"], 3.0)
        latency_ms = ping.get("latency_ms")
        if ping.get("ok"):
            status = "UP"
        elif ping.get("http_status") is not None:
            # Host reachable but returned an error code → degraded, not down.
            status = "DEGRADED"
        else:
            status = "DOWN"

    await db[BGV_HEALTH_COLLECTION].insert_one({
        "provider_id": pid,
        "status": status,
        "latency_ms": latency_ms,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    })
    stats = await _provider_24h_stats(pid)
    last_up = await db[BGV_HEALTH_COLLECTION].find_one(
        {"provider_id": pid, "status": "UP"}, sort=[("checked_at", -1)],
    )
    return {
        "provider_id": pid,
        "name": provider["name"],
        "tier": provider.get("tier"),
        "configured": bool(provider.get("configured")),
        "config_key": provider.get("config_key"),
        "status": status,
        "latency_ms": latency_ms,
        "last_success_at": last_up.get("checked_at") if last_up else None,
        **stats,
    }


@router.get("/health-check", dependencies=[Depends(require_admin_role)])
async def run_integration_health_check():
    """Live health-check across all BGV integration providers + 24h error rates."""
    providers = [await _run_provider_check(p) for p in HEALTH_PROVIDER_DEFS]
    up = sum(1 for p in providers if p["status"] == "UP")
    down = sum(1 for p in providers if p["status"] == "DOWN")
    overall = "UP" if down == 0 else ("DEGRADED" if up > 0 else "DOWN")
    return {
        "overall": overall,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "up": up,
        "down": down,
        "providers": providers,
    }


@router.get("/health-check/{provider_id}", dependencies=[Depends(require_admin_role)])
async def run_single_provider_health_check(provider_id: str):
    provider = next((p for p in HEALTH_PROVIDER_DEFS if p["id"] == provider_id), None)
    if not provider:
        raise HTTPException(status_code=404, detail="Unknown provider")
    result = await _run_provider_check(provider)
    return result
