"""Lead Aggregator API — FastAPI router for all LA1-LA14 features."""
from __future__ import annotations

import asyncio
import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect

from .database import (
    brands_col, offers_col, leads_col, consent_col,
    referrals_col, claims_col, campus_col, bot_runs_col,
    webhook_log_col,
)
from .models import (
    BrandCreate, BrandDoc, OfferCreate, OfferDoc,
    LeadSubmit, LeadDoc, ConsentRecord,
    ReferralEvent, ClaimRecord, CampusContact,
    OTPSendRequest, OTPVerifyRequest, BotRunStatus,
    SUPPORTED_DOMAINS,
)
from .scoring import compute_lead_score
from . import otp as otp_service
from . import webhooks as wh_service
from . import ai_matching as ai_service
from . import notifications as notif_service
from . import dedup as dedup_service
from . import geo as geo_service
from . import ab_testing as ab_service
from . import attribution as attr_service
from . import fraud as fraud_service
from . import smart_pricing as pricing_service
from . import campus_growth as campus_growth_service
from . import offer_analytics as analytics_service
from . import rate_limiting as rate_service
from . import guards as auth_guards
from . import export as export_service
from . import wa_capture as wa_service
from . import email_digest as digest_service
from . import bulk_import as import_service
from . import assignment as assign_service
from . import consent_i18n as consent_i18n_service
from . import ml_scoring as ml_service
from . import integrations as integ_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lead-aggregator", tags=["Lead Aggregator"])


def _gen_id(prefix: str = "LA") -> str:
    return f"{prefix}-{secrets.token_hex(8)}"


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ═══════════════════════════════════════════════════════════════════════════
# Dashboard / Stats
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/stats")
async def get_stats():
    """Aggregate stats for the Lead Aggregator dashboard."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_brands = await brands_col.count_documents({})
    active_offers = await offers_col.count_documents({"is_active": True})
    total_leads = await leads_col.count_documents({})
    leads_this_week = await leads_col.count_documents({"created_at": {"$gte": week_ago}})

    hot_leads = await leads_col.count_documents({"temperature": "hot"})
    warm_leads = await leads_col.count_documents({"temperature": "warm"})
    cold_leads = await leads_col.count_documents({"temperature": "cold"})
    low_leads = await leads_col.count_documents({"temperature": "low"})

    converted = await leads_col.count_documents({"status": "converted"})
    conversion_rate = round((converted / total_leads * 100), 1) if total_leads else 0

    # Domain distribution
    pipeline = [
        {"$group": {"_id": "$domain", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    domain_dist = {doc["_id"]: doc["count"] async for doc in leads_col.aggregate(pipeline) if doc["_id"]}

    # City distribution
    pipeline_city = [
        {"$match": {"city": {"$ne": None}}},
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    city_dist = {doc["_id"]: doc["count"] async for doc in leads_col.aggregate(pipeline_city)}

    # Campus contacts
    campus_total = await campus_col.count_documents({})
    campus_verified = await campus_col.count_documents({"is_verified": True})

    # Domains covered
    distinct_domains = await offers_col.distinct("domain", {"is_active": True})

    # Bot runs
    last_bot = await bot_runs_col.find_one(sort=[("started_at", -1)])
    bot_runs_total = await bot_runs_col.count_documents({})

    # Referral sources
    pipeline_ref = [
        {"$group": {"_id": "$source_platform", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    referral_sources = {doc["_id"]: doc["count"] async for doc in leads_col.aggregate(pipeline_ref) if doc["_id"]}

    # Lead funnel
    funnel = {}
    for status in ["new", "contacted", "qualified", "converted", "invalid"]:
        funnel[status] = await leads_col.count_documents({"status": status})

    return {
        "total_brands": total_brands,
        "active_offers": active_offers,
        "total_leads": total_leads,
        "leads_this_week": leads_this_week,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
        "low_leads": low_leads,
        "conversion_rate": conversion_rate,
        "domains_covered": len(distinct_domains),
        "campus_contacts": campus_total,
        "campus_verified": campus_verified,
        "bot_runs": bot_runs_total,
        "last_bot_run": {
            "run_id": last_bot["run_id"],
            "started_at": last_bot["started_at"].isoformat(),
            "status": last_bot.get("status", "unknown"),
        } if last_bot else None,
        "scoring_distribution": {
            "hot": hot_leads,
            "warm": warm_leads,
            "cold": cold_leads,
            "low": low_leads,
        },
        "domain_distribution": domain_dist,
        "city_distribution": city_dist,
        "referral_sources": referral_sources,
        "lead_funnel": funnel,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Brands CRUD
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/brands")
async def register_brand(payload: BrandCreate):
    existing = await brands_col.find_one({"contact_email": payload.contact_email, "name": payload.name})
    if existing:
        raise HTTPException(409, "Brand already registered with this email")

    brand_id = _gen_id("BRD")
    api_key = secrets.token_urlsafe(32)
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    webhook_secret = secrets.token_urlsafe(24) if payload.webhook_url else None

    doc = BrandDoc(
        brand_id=brand_id,
        api_key_hash=api_key_hash,
        webhook_secret=webhook_secret,
        **payload.model_dump(),
    ).model_dump()

    await brands_col.insert_one(doc)

    return {
        "status": "ok",
        "brand_id": brand_id,
        "api_key": api_key,
        "webhook_secret": webhook_secret,
        "message": "Brand registered. Save your API key — it won't be shown again.",
    }


@router.get("/brands")
async def list_brands(
    domain: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query: dict = {}
    if domain:
        query["domain"] = domain
    if status:
        query["status"] = status

    cursor = brands_col.find(query, {"api_key_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    brands = await cursor.to_list(length=limit)
    total = await brands_col.count_documents(query)

    for b in brands:
        b["_id"] = str(b["_id"])

    return {"brands": brands, "total": total}


@router.get("/brands/{brand_id}")
async def get_brand(brand_id: str):
    brand = await brands_col.find_one({"brand_id": brand_id}, {"api_key_hash": 0})
    if not brand:
        raise HTTPException(404, "Brand not found")
    brand["_id"] = str(brand["_id"])
    return brand


@router.patch("/brands/{brand_id}")
async def update_brand(brand_id: str, payload: dict):
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not brand:
        raise HTTPException(404, "Brand not found")

    allowed = {"name", "tier", "status", "webhook_url", "lead_quota",
               "target_age_min", "target_age_max", "target_cities",
               "target_skills", "target_education_levels", "contact_phone"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(400, "No valid fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    await brands_col.update_one({"brand_id": brand_id}, {"$set": updates})
    return {"status": "ok", "updated": list(updates.keys())}


# ═══════════════════════════════════════════════════════════════════════════
# Offers CRUD
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/offers")
async def create_offer(payload: OfferCreate):
    brand = await brands_col.find_one({"brand_id": payload.brand_id})
    if not brand:
        raise HTTPException(404, "Brand not found")

    offer_id = _gen_id("OFR")
    doc = OfferDoc(offer_id=offer_id, **payload.model_dump()).model_dump()
    await offers_col.insert_one(doc)
    return {"status": "ok", "offer_id": offer_id}


@router.get("/offers")
async def list_offers(
    brand_id: Optional[str] = None,
    domain: Optional[str] = None,
    active_only: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query: dict = {}
    if brand_id:
        query["brand_id"] = brand_id
    if domain:
        query["domain"] = domain
    if active_only:
        query["is_active"] = True

    cursor = offers_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    offers = await cursor.to_list(length=limit)
    total = await offers_col.count_documents(query)

    for o in offers:
        o["_id"] = str(o["_id"])

    return {"offers": offers, "total": total}


@router.patch("/offers/{offer_id}")
async def update_offer(offer_id: str, payload: dict):
    offer = await offers_col.find_one({"offer_id": offer_id})
    if not offer:
        raise HTTPException(404, "Offer not found")

    allowed = {"title", "description", "is_active", "max_claims",
               "target_age_min", "target_age_max", "target_cities",
               "target_skills", "expires_at", "value"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(400, "No valid fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    await offers_col.update_one({"offer_id": offer_id}, {"$set": updates})
    return {"status": "ok", "updated": list(updates.keys())}


# ═══════════════════════════════════════════════════════════════════════════
# Leads — Submit + Match + Score
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/leads")
async def submit_lead(payload: LeadSubmit, request: Request):
    """Submit a new lead. Auto-scores against all active brands and records DPDP consent."""
    lead_id = _gen_id("LEAD")

    # Profile completeness
    fields = ["full_name", "email", "phone", "age", "city", "education_level",
              "institution", "skills", "interests"]
    filled = sum(1 for f in fields if getattr(payload, f, None))
    completeness = round(filled / len(fields), 2)

    lead_data = payload.model_dump()
    if lead_data.get("domain"):
        lead_data["domain"] = lead_data["domain"].value if hasattr(lead_data["domain"], "value") else lead_data["domain"]

    lead_doc = {
        "lead_id": lead_id,
        **lead_data,
        "phone_verified": False,
        "status": "new",
        "temperature": "cold",
        "score": 0,
        "score_breakdown": {},
        "matched_brands": [],
        "matched_offers": [],
        "profile_completeness": completeness,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    # Score against all active brands
    brands_cursor = brands_col.find({"status": "active"})
    best_score = 0
    best_breakdown: dict = {}
    best_temp = "cold"
    matched_brands: list[str] = []
    matched_offers: list[str] = []

    async for brand in brands_cursor:
        score, breakdown, temp = compute_lead_score(lead_data, brand)
        if score >= 25:
            matched_brands.append(brand["brand_id"])
            # Find matching offers for this brand
            offer_cursor = offers_col.find({
                "brand_id": brand["brand_id"],
                "is_active": True,
            })
            async for offer in offer_cursor:
                matched_offers.append(offer["offer_id"])

        if score > best_score:
            best_score = score
            best_breakdown = breakdown
            best_temp = temp

    lead_doc["score"] = best_score
    lead_doc["score_breakdown"] = best_breakdown
    lead_doc["temperature"] = best_temp
    lead_doc["matched_brands"] = matched_brands
    lead_doc["matched_offers"] = matched_offers

    await leads_col.insert_one(lead_doc)

    # Fire background tasks: fraud check, dedup, webhooks, notifications, pricing
    asyncio.create_task(_post_lead_pipeline(lead_doc, _get_client_ip(request), request.headers.get("user-agent", "")))

    # DPDP consent record
    consent_id = _gen_id("CNS")
    retention_days = 180
    now = datetime.now(timezone.utc)
    await consent_col.insert_one({
        "consent_id": consent_id,
        "lead_id": lead_id,
        "phone": payload.phone,
        "email": payload.email,
        "action": "grant",
        "purpose": "lead_processing",
        "platform": payload.source_platform,
        "ip_address": _get_client_ip(request),
        "user_agent": request.headers.get("user-agent"),
        "retention_period": retention_days,
        "timestamp": now,
        "expires_at": now + timedelta(days=retention_days),
    })

    # Referral tracking
    if payload.referral_code:
        await referrals_col.insert_one({
            "event_id": _gen_id("REF"),
            "referrer_code": payload.referral_code,
            "referred_lead_id": lead_id,
            "referred_phone": payload.phone,
            "campus_role": payload.campus_role,
            "level": 1,
            "commission_pct": 0.0,
            "status": "pending",
            "platform": payload.source_platform,
            "created_at": now,
        })

    return {
        "status": "ok",
        "lead_id": lead_id,
        "score": best_score,
        "temperature": best_temp,
        "matched_brands": len(matched_brands),
        "matched_offers": len(matched_offers),
        "profile_completeness": completeness,
    }


@router.get("/leads")
async def list_leads(
    brand_id: Optional[str] = None,
    domain: Optional[str] = None,
    status: Optional[str] = None,
    temperature: Optional[str] = None,
    min_score: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query: dict = {}
    if brand_id:
        query["matched_brands"] = brand_id
    if domain:
        query["domain"] = domain
    if status:
        query["status"] = status
    if temperature:
        query["temperature"] = temperature
    if min_score is not None:
        query["score"] = {"$gte": min_score}

    cursor = leads_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    leads = await cursor.to_list(length=limit)
    total = await leads_col.count_documents(query)

    for lead in leads:
        lead["_id"] = str(lead["_id"])

    return {"leads": leads, "total": total}


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    lead = await leads_col.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead not found")
    lead["_id"] = str(lead["_id"])
    return lead


@router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, payload: dict):
    lead = await leads_col.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead not found")

    new_status = payload.get("status")
    valid = {"new", "contacted", "qualified", "converted", "invalid"}
    if new_status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(valid)}")

    await leads_col.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"status": "ok", "lead_id": lead_id, "new_status": new_status}


# ═══════════════════════════════════════════════════════════════════════════
# Offers — Claim
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/offers/{offer_id}/claim")
async def claim_offer(offer_id: str, payload: dict, request: Request):
    """Lead claims an offer. Requires lead_id."""
    lead_id = payload.get("lead_id")
    if not lead_id:
        raise HTTPException(400, "lead_id is required")

    offer = await offers_col.find_one({"offer_id": offer_id})
    if not offer:
        raise HTTPException(404, "Offer not found")
    if not offer.get("is_active"):
        raise HTTPException(400, "Offer is no longer active")
    if offer.get("claims_used", 0) >= offer.get("max_claims", 100):
        raise HTTPException(400, "Offer has reached maximum claims")

    lead = await leads_col.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead not found")

    # Check duplicate claim
    existing_claim = await claims_col.find_one({"lead_id": lead_id, "offer_id": offer_id})
    if existing_claim:
        raise HTTPException(409, "Already claimed this offer")

    claim_id = _gen_id("CLM")
    now = datetime.now(timezone.utc)

    await claims_col.insert_one({
        "claim_id": claim_id,
        "lead_id": lead_id,
        "offer_id": offer_id,
        "brand_id": offer["brand_id"],
        "phone": lead["phone"],
        "email": lead.get("email"),
        "status": "claimed",
        "claimed_at": now,
    })

    await offers_col.update_one({"offer_id": offer_id}, {"$inc": {"claims_used": 1}})

    return {"status": "ok", "claim_id": claim_id}


# ═══════════════════════════════════════════════════════════════════════════
# Phone OTP (LA2)
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/otp/send")
async def send_otp(payload: OTPSendRequest, request: Request):
    result = await otp_service.send_otp(
        phone=payload.phone,
        purpose=payload.purpose,
        ip_address=_get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        email=payload.email,
    )
    if result.get("status") == "error":
        raise HTTPException(
            status_code=result.get("code", 400),
            detail=result["message"],
            headers={"Retry-After": str(result.get("retry_after", 60))} if result.get("retry_after") else None,
        )
    return result


@router.post("/otp/verify")
async def verify_otp(payload: OTPVerifyRequest, request: Request):
    result = await otp_service.verify_otp(
        phone=payload.phone,
        otp=payload.otp,
        ip_address=_get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=result.get("code", 400), detail=result["message"])

    # Mark the lead's phone as verified
    await leads_col.update_many(
        {"phone": payload.phone, "phone_verified": False},
        {"$set": {"phone_verified": True, "updated_at": datetime.now(timezone.utc)}},
    )

    return result


# ═══════════════════════════════════════════════════════════════════════════
# DPDP Consent Log
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/consent")
async def list_consent(
    phone: Optional[str] = None,
    lead_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query: dict = {}
    if phone:
        query["phone"] = phone
    if lead_id:
        query["lead_id"] = lead_id

    cursor = consent_col.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    records = await cursor.to_list(length=limit)
    total = await consent_col.count_documents(query)

    for r in records:
        r["_id"] = str(r["_id"])

    return {"consent_records": records, "total": total}


@router.post("/consent/revoke")
async def revoke_consent(payload: dict, request: Request):
    """Revoke consent per DPDP Act — data subject's right to withdraw."""
    phone = payload.get("phone")
    if not phone:
        raise HTTPException(400, "phone is required")

    now = datetime.now(timezone.utc)
    consent_id = _gen_id("CNS")

    await consent_col.insert_one({
        "consent_id": consent_id,
        "phone": phone,
        "email": payload.get("email"),
        "brand_id": payload.get("brand_id"),
        "action": "revoke",
        "purpose": "consent_withdrawal",
        "platform": payload.get("platform", "direct"),
        "ip_address": _get_client_ip(request),
        "user_agent": request.headers.get("user-agent"),
        "retention_period": 0,
        "timestamp": now,
        "expires_at": now + timedelta(days=30),
    })

    return {"status": "ok", "consent_id": consent_id, "message": "Consent revoked successfully"}


# ═══════════════════════════════════════════════════════════════════════════
# Serial Claimer Detection
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/serial-claimers")
async def detect_serial_claimers(days: int = Query(7, ge=1, le=90)):
    """Find phones that have claimed 5+ different offers in the given window."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"claimed_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$phone",
            "offer_count": {"$addToSet": "$offer_id"},
            "total_claims": {"$sum": 1},
        }},
        {"$project": {
            "phone": "$_id",
            "offer_count": {"$size": "$offer_count"},
            "total_claims": 1,
            "_id": 0,
        }},
        {"$match": {"offer_count": {"$gte": 5}}},
        {"$sort": {"offer_count": -1}},
    ]
    results = []
    async for doc in claims_col.aggregate(pipeline):
        results.append(doc)
    return {"serial_claimers": results, "window_days": days}


# ═══════════════════════════════════════════════════════════════════════════
# Campus Ecosystem
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/campus/contacts")
async def add_campus_contact(payload: dict):
    required = {"name", "role", "institution", "city"}
    missing = required - set(payload.keys())
    if missing:
        raise HTTPException(400, f"Missing fields: {', '.join(missing)}")

    valid_roles = {"tpo", "student_leader", "student_club", "campus_ambassador"}
    if payload["role"] not in valid_roles:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    contact_id = _gen_id("CAM")
    referral_code = f"CAM-{secrets.token_hex(4).upper()}"
    now = datetime.now(timezone.utc)

    await campus_col.insert_one({
        "contact_id": contact_id,
        "name": payload["name"],
        "role": payload["role"],
        "institution": payload["institution"],
        "city": payload["city"],
        "phone": payload.get("phone"),
        "email": payload.get("email"),
        "is_verified": False,
        "leads_generated": 0,
        "referral_code": referral_code,
        "created_at": now,
    })

    return {"status": "ok", "contact_id": contact_id, "referral_code": referral_code}


@router.get("/campus/contacts")
async def list_campus_contacts(
    role: Optional[str] = None,
    institution: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query: dict = {}
    if role:
        query["role"] = role
    if institution:
        query["institution"] = {"$regex": institution, "$options": "i"}

    cursor = campus_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    contacts = await cursor.to_list(length=limit)
    total = await campus_col.count_documents(query)

    for c in contacts:
        c["_id"] = str(c["_id"])

    return {"contacts": contacts, "total": total}


@router.patch("/campus/contacts/{contact_id}/verify")
async def verify_campus_contact(contact_id: str):
    result = await campus_col.update_one(
        {"contact_id": contact_id},
        {"$set": {"is_verified": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Contact not found")
    return {"status": "ok", "verified": True}


# ═══════════════════════════════════════════════════════════════════════════
# Bot Agent
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/bot/run")
async def trigger_bot_run():
    """Trigger the 6h aggregator bot manually. In production, runs on a schedule."""
    run_id = _gen_id("BOT")
    now = datetime.now(timezone.utc)

    bot_doc = {
        "run_id": run_id,
        "started_at": now,
        "status": "running",
        "leads_processed": 0,
        "leads_rescored": 0,
        "serial_claimers_flagged": 0,
        "offers_expiring": 0,
        "webhooks_retried": 0,
        "reports_generated": 0,
        "revenue_credits_updated": 0,
        "errors": [],
    }
    await bot_runs_col.insert_one(bot_doc)

    # Run bot tasks
    errors: list[str] = []
    leads_rescored = 0
    serial_flagged = 0
    offers_expiring = 0
    webhooks_retried = 0

    # 1. Re-score all leads
    try:
        leads_cursor = leads_col.find({})
        async for lead in leads_cursor:
            brands_cursor = brands_col.find({"status": "active"})
            best_score = 0
            best_breakdown: dict = {}
            best_temp = "cold"
            matched: list[str] = []
            async for brand in brands_cursor:
                score, breakdown, temp = compute_lead_score(lead, brand)
                if score >= 25:
                    matched.append(brand["brand_id"])
                if score > best_score:
                    best_score = score
                    best_breakdown = breakdown
                    best_temp = temp

            await leads_col.update_one(
                {"lead_id": lead["lead_id"]},
                {"$set": {
                    "score": best_score,
                    "score_breakdown": best_breakdown,
                    "temperature": best_temp,
                    "matched_brands": matched,
                    "updated_at": now,
                }},
            )
            leads_rescored += 1
    except Exception as e:
        errors.append(f"Rescore error: {e}")

    # 2. Detect serial claimers
    try:
        cutoff = now - timedelta(days=7)
        pipeline = [
            {"$match": {"claimed_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$phone", "cnt": {"$addToSet": "$offer_id"}}},
            {"$project": {"cnt": {"$size": "$cnt"}}},
            {"$match": {"cnt": {"$gte": 5}}},
        ]
        async for _ in claims_col.aggregate(pipeline):
            serial_flagged += 1
    except Exception as e:
        errors.append(f"Serial claimer detection error: {e}")

    # 3. Flag expiring offers
    try:
        expiry_window = now + timedelta(hours=48)
        offers_expiring = await offers_col.count_documents({
            "is_active": True,
            "expires_at": {"$lte": expiry_window, "$gte": now},
        })
    except Exception as e:
        errors.append(f"Offer expiry check error: {e}")

    # 4. Retry failed webhooks (LA3)
    try:
        retry_result = await wh_service.process_retry_queue()
        webhooks_retried = retry_result.get("retried", 0)
    except Exception as e:
        errors.append(f"Webhook retry error: {e}")

    # 5. Dedup scan (LA7)
    dedup_groups = 0
    try:
        dedup_result = await dedup_service.bulk_dedup_scan()
        dedup_groups = dedup_result.get("duplicate_groups", 0)
    except Exception as e:
        errors.append(f"Dedup scan error: {e}")

    # 6. Process notification digests (LA5)
    digests_sent = 0
    try:
        digest_result = await notif_service.send_pending_digests()
        digests_sent = digest_result.get("digests_sent", 0)
    except Exception as e:
        errors.append(f"Digest error: {e}")

    # Update bot run record
    await bot_runs_col.update_one(
        {"run_id": run_id},
        {"$set": {
            "completed_at": datetime.now(timezone.utc),
            "status": "completed" if not errors else "completed",
            "leads_processed": await leads_col.count_documents({}),
            "leads_rescored": leads_rescored,
            "serial_claimers_flagged": serial_flagged,
            "offers_expiring": offers_expiring,
            "webhooks_retried": webhooks_retried,
            "dedup_groups": dedup_groups,
            "digests_sent": digests_sent,
            "errors": errors,
        }},
    )

    return {
        "status": "ok",
        "run_id": run_id,
        "leads_rescored": leads_rescored,
        "serial_claimers_flagged": serial_flagged,
        "offers_expiring": offers_expiring,
        "webhooks_retried": webhooks_retried,
        "dedup_groups": dedup_groups,
        "digests_sent": digests_sent,
        "errors": errors,
    }


@router.get("/bot/status")
async def bot_status():
    """Get the latest bot run status."""
    last = await bot_runs_col.find_one(sort=[("started_at", -1)])
    if not last:
        return {"status": "no_runs", "message": "No bot runs recorded yet"}
    last["_id"] = str(last["_id"])
    return last


# ═══════════════════════════════════════════════════════════════════════════
# Supported Domains
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/domains")
async def list_domains():
    return {"domains": SUPPORTED_DOMAINS, "count": len(SUPPORTED_DOMAINS)}


# ═══════════════════════════════════════════════════════════════════════════
# Leads for a specific brand
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/leads/brand/{brand_id}")
async def get_leads_for_brand(
    brand_id: str,
    status: Optional[str] = None,
    min_score: int = Query(0, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not brand:
        raise HTTPException(404, "Brand not found")

    query: dict = {"matched_brands": brand_id, "score": {"$gte": min_score}}
    if status:
        query["status"] = status

    cursor = leads_col.find(query).sort("score", -1).skip(skip).limit(limit)
    leads = await cursor.to_list(length=limit)
    total = await leads_col.count_documents(query)

    for lead in leads:
        lead["_id"] = str(lead["_id"])

    return {"brand_id": brand_id, "leads": leads, "total": total}


# ═══════════════════════════════════════════════════════════════════════════
# Export (CSV-ready)
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/export/leads")
async def export_leads(
    brand_id: Optional[str] = None,
    domain: Optional[str] = None,
    limit: int = Query(1000, ge=1, le=10000),
):
    """Return leads as a flat JSON array suitable for CSV conversion."""
    query: dict = {}
    if brand_id:
        query["matched_brands"] = brand_id
    if domain:
        query["domain"] = domain

    cursor = leads_col.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    leads = await cursor.to_list(length=limit)
    return {"leads": leads, "count": len(leads)}


# ═══════════════════════════════════════════════════════════════════════════
# Post-Lead Pipeline (background tasks after lead creation)
# ═══════════════════════════════════════════════════════════════════════════
async def _post_lead_pipeline(lead: dict, ip: str, ua: str) -> None:
    """Background: fraud check → dedup → webhooks → notifications → pricing."""
    try:
        # Fraud check
        risk = await fraud_service.analyze_lead(lead, ip_address=ip, user_agent=ua)
        if risk.get("action") == "block":
            await leads_col.update_one(
                {"lead_id": lead["lead_id"]},
                {"$set": {"status": "invalid", "fraud_blocked": True}},
            )
            return

        # Dedup check
        duplicates = await dedup_service.find_duplicates(lead)
        if duplicates:
            await leads_col.update_one(
                {"lead_id": lead["lead_id"]},
                {"$set": {"possible_duplicates": [d.get("lead_id") for d in duplicates[:5]]}},
            )

        # Price the lead
        await pricing_service.price_lead(lead)

        # Notify matched brands + fire webhooks
        for brand_id in lead.get("matched_brands", []):
            await notif_service.notify_new_lead(brand_id, lead)
            await wh_service.deliver_webhook(brand_id, "new_lead", {
                "lead_id": lead["lead_id"],
                "score": lead.get("score"),
                "temperature": lead.get("temperature"),
                "domain": lead.get("domain"),
            })

        # Auto-assign lead to reps
        await assign_service.auto_assign_lead(lead)

        # Fire integration webhooks
        for brand_id in lead.get("matched_brands", []):
            await integ_service.fire_integration_event(brand_id, "new_lead", {
                "lead_id": lead["lead_id"],
                "score": lead.get("score"),
                "temperature": lead.get("temperature"),
                "domain": lead.get("domain"),
                "city": lead.get("city"),
            })

        # Attribution touchpoint
        await attr_service.record_touchpoint(
            lead_id=lead["lead_id"],
            channel=lead.get("source_platform", "direct"),
            utm_source=lead.get("utm_source"),
            utm_medium=lead.get("utm_medium"),
            utm_campaign=lead.get("utm_campaign"),
        )

    except Exception as e:
        logger.error("[LA-Pipeline] Error for lead %s: %s", lead.get("lead_id"), e)


# ═══════════════════════════════════════════════════════════════════════════
# LA3 — Webhooks
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/webhooks/health/{brand_id}")
async def webhook_health(brand_id: str):
    return await wh_service.health_check_webhook(brand_id)


@router.post("/webhooks/retry")
async def process_webhook_retries():
    return await wh_service.process_retry_queue()


@router.get("/webhooks/dead-letter")
async def dead_letter_queue(
    brand_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query: dict = {"status": "dead_letter"}
    if brand_id:
        query["brand_id"] = brand_id
    cursor = webhook_log_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await webhook_log_col.count_documents(query)
    for item in items:
        item["_id"] = str(item["_id"])
    return {"dead_letters": items, "total": total}


# ═══════════════════════════════════════════════════════════════════════════
# LA4 — AI Matching
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/ai/match")
async def ai_match_lead(payload: dict):
    lead_id = payload.get("lead_id")
    brand_id = payload.get("brand_id")
    if not lead_id or not brand_id:
        raise HTTPException(400, "lead_id and brand_id required")

    lead = await leads_col.find_one({"lead_id": lead_id})
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not brand:
        raise HTTPException(404, "Brand not found")

    result = await ai_service.match_lead_to_brand(lead, brand)
    return result


@router.get("/ai/cost")
async def ai_cost_summary(brand_id: Optional[str] = None, month: Optional[str] = None):
    return await ai_service.get_cost_summary(brand_id=brand_id, month=month)


# ═══════════════════════════════════════════════════════════════════════════
# LA5 — Notifications
# ═══════════════════════════════════════════════════════════════════════════
@router.websocket("/ws/notifications/{brand_id}")
async def ws_notifications(ws: WebSocket, brand_id: str):
    await notif_service.connect_brand(brand_id, ws)
    heartbeat_task = asyncio.create_task(notif_service.ws_heartbeat(ws, brand_id))
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
        notif_service.disconnect_brand(brand_id, ws)


@router.put("/notifications/preferences/{brand_id}")
async def set_notification_prefs(brand_id: str, payload: dict):
    mode = payload.get("mode", "instant")
    return await notif_service.set_preferences(brand_id, mode)


@router.get("/notifications/inbox/{brand_id}")
async def notification_inbox(
    brand_id: str,
    unread_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    return await notif_service.get_inbox(brand_id, skip=skip, limit=limit, unread_only=unread_only)


@router.post("/notifications/read/{brand_id}")
async def mark_notifications_read(brand_id: str, payload: dict):
    notif_ids = payload.get("notif_ids", [])
    if not notif_ids:
        raise HTTPException(400, "notif_ids required")
    count = await notif_service.mark_read(brand_id, notif_ids)
    return {"status": "ok", "marked_read": count}


@router.post("/notifications/push-token")
async def register_push_token(payload: dict):
    brand_id = payload.get("brand_id")
    token = payload.get("token")
    device_id = payload.get("device_id")
    if not all([brand_id, token, device_id]):
        raise HTTPException(400, "brand_id, token, and device_id required")
    return await notif_service.register_push_token(brand_id, token, device_id)


@router.post("/notifications/digest")
async def process_digests():
    return await notif_service.send_pending_digests()


# ═══════════════════════════════════════════════════════════════════════════
# LA7 — Deduplication
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/dedup/check")
async def check_duplicates(payload: dict):
    lead_id = payload.get("lead_id")
    if not lead_id:
        raise HTTPException(400, "lead_id required")
    lead = await leads_col.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(404, "Lead not found")
    dupes = await dedup_service.find_duplicates(lead)
    return {"lead_id": lead_id, "duplicates": dupes, "count": len(dupes)}


@router.post("/dedup/merge")
async def merge_leads(payload: dict):
    primary = payload.get("primary_id")
    duplicate = payload.get("duplicate_id")
    if not primary or not duplicate:
        raise HTTPException(400, "primary_id and duplicate_id required")
    return await dedup_service.merge_leads(primary, duplicate, approver=payload.get("approver", "manual"))


@router.get("/dedup/scan")
async def bulk_dedup_scan():
    return await dedup_service.bulk_dedup_scan()


# ═══════════════════════════════════════════════════════════════════════════
# LA8 — Geo Intelligence
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/geo/density")
async def lead_density(limit: int = Query(50, ge=1, le=200)):
    return await geo_service.lead_density_by_city(limit=limit)


@router.get("/geo/regions")
async def regional_summary():
    return await geo_service.regional_summary()


@router.get("/geo/resolve/{city}")
async def resolve_city(city: str):
    canonical = geo_service.resolve_city(city)
    region = geo_service.get_region(city)
    return {"input": city, "canonical": canonical, "region": region}


@router.post("/geo/score")
async def geo_score(payload: dict):
    lead_city = payload.get("lead_city", "")
    target_cities = payload.get("target_cities", [])
    max_radius = payload.get("max_radius_km", 50)
    score, matched = geo_service.geo_score_for_brand(lead_city, target_cities, max_radius)
    return {"score": score, "matched_city": matched}


# ═══════════════════════════════════════════════════════════════════════════
# LA9 — A/B Testing
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/ab/experiments")
async def create_experiment(payload: dict):
    required = {"offer_id", "brand_id", "name", "variants"}
    missing = required - set(payload.keys())
    if missing:
        raise HTTPException(400, f"Missing: {', '.join(missing)}")
    return await ab_service.create_experiment(
        offer_id=payload["offer_id"],
        brand_id=payload["brand_id"],
        name=payload["name"],
        variants=payload["variants"],
        traffic_pct=payload.get("traffic_pct", 100.0),
    )


@router.post("/ab/assign")
async def assign_variant(payload: dict):
    exp_id = payload.get("experiment_id")
    lead_id = payload.get("lead_id")
    if not exp_id or not lead_id:
        raise HTTPException(400, "experiment_id and lead_id required")
    return await ab_service.assign_variant(exp_id, lead_id)


@router.post("/ab/convert")
async def record_conversion(payload: dict):
    exp_id = payload.get("experiment_id")
    lead_id = payload.get("lead_id")
    if not exp_id or not lead_id:
        raise HTTPException(400, "experiment_id and lead_id required")
    return await ab_service.record_conversion(exp_id, lead_id)


@router.get("/ab/results/{experiment_id}")
async def experiment_results(experiment_id: str):
    return await ab_service.get_experiment_results(experiment_id)


@router.post("/ab/stop/{experiment_id}")
async def stop_experiment(experiment_id: str, payload: dict = {}):
    return await ab_service.stop_experiment(experiment_id, winner_variant=payload.get("winner"))


# ═══════════════════════════════════════════════════════════════════════════
# LA10 — Attribution
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/attribution/touchpoint")
async def record_touchpoint(payload: dict):
    lead_id = payload.get("lead_id")
    channel = payload.get("channel")
    if not lead_id or not channel:
        raise HTTPException(400, "lead_id and channel required")
    return await attr_service.record_touchpoint(
        lead_id=lead_id, channel=channel,
        brand_id=payload.get("brand_id"),
        utm_source=payload.get("utm_source"),
        utm_medium=payload.get("utm_medium"),
        utm_campaign=payload.get("utm_campaign"),
        referrer_url=payload.get("referrer_url"),
        page_url=payload.get("page_url"),
    )


@router.get("/attribution/journey/{lead_id}")
async def lead_journey(lead_id: str):
    journey = await attr_service.get_lead_journey(lead_id)
    return {"lead_id": lead_id, "touchpoints": journey}


@router.post("/attribution/convert/{lead_id}")
async def attribute_conversion(lead_id: str, payload: dict = {}):
    model = payload.get("model", "linear")
    return await attr_service.attribute_conversion(lead_id, model=model)


@router.get("/attribution/channels")
async def channel_performance(brand_id: Optional[str] = None, days: int = Query(30, ge=1, le=365)):
    return await attr_service.channel_performance(brand_id=brand_id, days=days)


@router.get("/attribution/campaigns/{brand_id}")
async def campaign_roi(brand_id: str, days: int = Query(30, ge=1, le=365)):
    return await attr_service.campaign_roi(brand_id, days=days)


# ═══════════════════════════════════════════════════════════════════════════
# LA11 — Fraud Detection
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/fraud/risk/{lead_id}")
async def lead_risk(lead_id: str):
    risk = await fraud_service.get_lead_risk(lead_id)
    if not risk:
        raise HTTPException(404, "No risk assessment found")
    return risk


@router.get("/fraud/summary")
async def fraud_summary(days: int = Query(7, ge=1, le=90)):
    return await fraud_service.get_risk_summary(days=days)


# ═══════════════════════════════════════════════════════════════════════════
# LA12 — Smart Pricing
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/pricing/quote")
async def price_quote(payload: dict):
    return pricing_service.calculate_lead_price(
        temperature=payload.get("temperature", "cold"),
        domain=payload.get("domain", ""),
        profile_completeness=payload.get("profile_completeness", 0),
        phone_verified=payload.get("phone_verified", False),
        score=payload.get("score", 0),
    )


@router.get("/pricing/revenue")
async def revenue_summary(brand_id: Optional[str] = None, days: int = Query(30, ge=1, le=365)):
    return await pricing_service.revenue_summary(brand_id=brand_id, days=days)


@router.get("/pricing/breakdown")
async def pricing_breakdown(days: int = Query(30, ge=1, le=365)):
    return await pricing_service.pricing_breakdown_by_domain(days=days)


@router.post("/pricing/tiers")
async def set_pricing_tier(payload: dict):
    domain = payload.get("domain")
    temperature = payload.get("temperature")
    price = payload.get("price_inr")
    if not all([domain, temperature, price]):
        raise HTTPException(400, "domain, temperature, and price_inr required")
    return await pricing_service.set_custom_tier(domain, temperature, price)


# ═══════════════════════════════════════════════════════════════════════════
# LA13 — Campus Growth
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/campus/stats/{institution}")
async def campus_stats(institution: str):
    return await campus_growth_service.compute_campus_stats(institution)


@router.get("/campus/ranking")
async def campus_ranking(limit: int = Query(20, ge=1, le=100)):
    return await campus_growth_service.institution_ranking(limit=limit)


@router.get("/campus/leaderboard")
async def ambassador_leaderboard(limit: int = Query(20, ge=1, le=100)):
    return await campus_growth_service.ambassador_leaderboard(limit=limit)


@router.post("/campus/targets")
async def set_campus_target(payload: dict):
    institution = payload.get("institution")
    target = payload.get("monthly_target")
    quarter = payload.get("quarter")
    if not all([institution, target, quarter]):
        raise HTTPException(400, "institution, monthly_target, and quarter required")
    return await campus_growth_service.set_growth_target(institution, target, quarter)


@router.get("/campus/growth-tracker")
async def growth_tracker():
    return await campus_growth_service.growth_tracker()


# ═══════════════════════════════════════════════════════════════════════════
# LA14 — Offer Analytics
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/analytics/offer/{offer_id}")
async def offer_performance(offer_id: str):
    return await analytics_service.offer_performance(offer_id)


@router.get("/analytics/brand/{brand_id}")
async def brand_analytics(brand_id: str, days: int = Query(30, ge=1, le=365)):
    return await analytics_service.brand_performance(brand_id, days=days)


@router.post("/analytics/compare")
async def compare_offers(payload: dict):
    offer_ids = payload.get("offer_ids", [])
    if not offer_ids:
        raise HTTPException(400, "offer_ids required")
    return await analytics_service.offer_comparison(offer_ids)


@router.get("/analytics/daily")
async def daily_snapshot(brand_id: Optional[str] = None):
    return await analytics_service.daily_snapshot(brand_id=brand_id)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #1 — Rate Limiting & API Key Auth
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/rate-limits/{brand_id}")
async def get_rate_limits(brand_id: str):
    return await rate_service.get_rate_limits(brand_id)


@router.post("/rate-limits/set")
async def set_brand_rate_limit(payload: dict):
    brand_id = payload.get("brand_id")
    endpoint = payload.get("endpoint", "*")
    max_requests = payload.get("max_requests")
    if not brand_id or not max_requests:
        raise HTTPException(400, "brand_id and max_requests required")
    return await rate_service.set_brand_rate_limit(brand_id, endpoint, max_requests)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #2 — Admin Auth
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/auth/login")
async def admin_login(payload: dict):
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        raise HTTPException(400, "email and password required")
    user = await auth_guards.authenticate_admin(email, password)
    if not user:
        raise HTTPException(401, "Invalid credentials")
    token = auth_guards.create_access_token({"email": email, "role": "admin", "user_id": str(user["_id"])})
    return {"token": token, "role": "admin", "email": email}


@router.post("/auth/brand-login")
async def brand_login(payload: dict, request: Request):
    api_key = payload.get("api_key")
    if not api_key:
        raise HTTPException(400, "api_key required")
    brand = await rate_service.verify_api_key_from_key(api_key)
    if not brand:
        raise HTTPException(401, "Invalid API key")
    token = auth_guards.create_access_token({"brand_id": brand["brand_id"], "role": "brand"})
    return {"token": token, "role": "brand", "brand_id": brand["brand_id"]}


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #3 — CSV/Excel Export
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/export/leads/csv")
async def export_leads_csv(brand_id: Optional[str] = None, domain: Optional[str] = None, limit: int = Query(1000, ge=1, le=10000)):
    query: dict = {}
    if brand_id:
        query["matched_brands"] = brand_id
    if domain:
        query["domain"] = domain
    return await export_service.export_leads_csv(query, limit)


@router.get("/export/leads/excel")
async def export_leads_excel(brand_id: Optional[str] = None, domain: Optional[str] = None, limit: int = Query(1000, ge=1, le=10000)):
    query: dict = {}
    if brand_id:
        query["matched_brands"] = brand_id
    if domain:
        query["domain"] = domain
    return await export_service.export_leads_excel(query, limit)


@router.get("/export/brands/csv")
async def export_brands_csv():
    return await export_service.export_brands_csv({})


@router.get("/export/claims/csv")
async def export_claims_csv(brand_id: Optional[str] = None, limit: int = Query(1000, ge=1, le=10000)):
    query: dict = {}
    if brand_id:
        query["brand_id"] = brand_id
    return await export_service.export_claims_csv(query, limit)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #5 — WhatsApp Lead Capture Bot
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/wa/webhook")
async def wa_webhook(payload: dict):
    return await wa_service.wa_webhook_handler(payload)


@router.get("/wa/sessions")
async def wa_session_count():
    return {"active_sessions": len(wa_service.wa_sessions)}


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #6 — Email Digest Reports
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/digests/send/{brand_id}")
async def send_digest(brand_id: str, payload: dict = {}):
    period = payload.get("period", "weekly")
    return await digest_service.send_digest_email(brand_id, period)


@router.post("/digests/send-all")
async def send_all_digests(payload: dict = {}):
    period = payload.get("period", "weekly")
    return await digest_service.process_all_digests(period)


@router.post("/digests/schedule/{brand_id}")
async def schedule_digest(brand_id: str, payload: dict):
    frequency = payload.get("frequency", "weekly")
    day_of_week = payload.get("day_of_week", 0)
    return await digest_service.schedule_digest(brand_id, frequency, day_of_week)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #7 — Bulk Lead Import
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/import/leads")
async def bulk_import_leads(payload: dict):
    brand_id = payload.get("brand_id")
    csv_data = payload.get("csv_data")
    if not brand_id or not csv_data:
        raise HTTPException(400, "brand_id and csv_data (base64) required")
    import base64
    try:
        file_bytes = base64.b64decode(csv_data)
    except Exception:
        raise HTTPException(400, "Invalid base64 csv_data")
    rows, errors = import_service.parse_csv(file_bytes)
    if not rows and errors:
        return {"status": "error", "parse_errors": errors, "imported": 0}
    result = await import_service.bulk_import_leads(rows, brand_id)
    result["parse_errors"] = errors
    return result


@router.get("/import/status/{import_id}")
async def import_status(import_id: str):
    result = await import_service.import_status(import_id)
    if not result:
        raise HTTPException(404, "Import not found")
    return result


@router.get("/import/history/{brand_id}")
async def import_history(brand_id: str):
    return await import_service.list_imports(brand_id)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #8 — Lead Assignment Rules
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/assignments/rules")
async def create_assignment_rule(payload: dict):
    brand_id = payload.get("brand_id")
    rep_name = payload.get("rep_name")
    rep_email = payload.get("rep_email")
    conditions = payload.get("conditions", {})
    if not brand_id or not rep_name or not rep_email:
        raise HTTPException(400, "brand_id, rep_name, and rep_email required")
    return await assign_service.create_rule(brand_id, rep_name, rep_email, conditions, weight=payload.get("weight", 1))


@router.get("/assignments/rules/{brand_id}")
async def list_assignment_rules(brand_id: str):
    return await assign_service.list_rules(brand_id)


@router.get("/assignments/lead/{lead_id}")
async def get_lead_assignments(lead_id: str):
    assignments = await assign_service.get_assignments(lead_id)
    return {"lead_id": lead_id, "assignments": assignments}


@router.post("/assignments/reassign")
async def reassign_lead(payload: dict):
    lead_id = payload.get("lead_id")
    brand_id = payload.get("brand_id")
    new_rep = payload.get("rep_email")
    if not all([lead_id, brand_id, new_rep]):
        raise HTTPException(400, "lead_id, brand_id, and rep_email required")
    return await assign_service.reassign_lead(lead_id, brand_id, new_rep)


@router.get("/assignments/workload/{brand_id}")
async def rep_workload(brand_id: str):
    return await assign_service.rep_workload(brand_id)


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #10 — Multi-language Consent
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/consent/languages")
async def consent_languages():
    return {"languages": consent_i18n_service.supported_languages()}


@router.get("/consent/form/{lang}")
async def consent_form(lang: str, brand_name: str = "AXISS"):
    if not consent_i18n_service.validate_consent_language(lang):
        raise HTTPException(400, f"Unsupported language: {lang}")
    return consent_i18n_service.get_consent_form(lang)


@router.get("/consent/form/{lang}/html")
async def consent_form_html(lang: str, brand_name: str = "AXISS"):
    from fastapi.responses import HTMLResponse
    if not consent_i18n_service.validate_consent_language(lang):
        raise HTTPException(400, f"Unsupported language: {lang}")
    html = consent_i18n_service.render_consent_html(lang, brand_name)
    return HTMLResponse(content=html)


@router.post("/consent/record")
async def record_consent_i18n(payload: dict, request: Request):
    lead_id = payload.get("lead_id")
    phone = payload.get("phone")
    lang = payload.get("language", "en")
    if not phone:
        raise HTTPException(400, "phone required")
    return await consent_i18n_service.record_consent_with_language(
        lead_id=lead_id, phone=phone, email=payload.get("email"),
        lang=lang, ip_address=_get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        brand_id=payload.get("brand_id"),
    )


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #11 — ML Lead Scoring V2
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/ml/retrain")
async def retrain_ml_model(payload: dict = {}):
    min_samples = payload.get("min_samples", 100)
    return await ml_service.retrain_model(min_samples)


@router.get("/ml/model-info")
async def ml_model_info():
    return await ml_service.model_info()


@router.post("/ml/score")
async def ml_score_lead(payload: dict):
    lead_id = payload.get("lead_id")
    brand_id = payload.get("brand_id")
    if not lead_id or not brand_id:
        raise HTTPException(400, "lead_id and brand_id required")
    lead = await leads_col.find_one({"lead_id": lead_id})
    brand = await brands_col.find_one({"brand_id": brand_id})
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not brand:
        raise HTTPException(404, "Brand not found")
    score, breakdown, temp = ml_service.compute_lead_score_v2(lead, brand)
    return {"lead_id": lead_id, "brand_id": brand_id, "score": score, "breakdown": breakdown, "temperature": temp}


# ═══════════════════════════════════════════════════════════════════════════
# Enhancement #12 — Integrations Hub
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/integrations/templates")
async def list_integration_templates():
    return integ_service.list_integrations()


@router.get("/integrations/templates/{template_id}")
async def get_integration_template(template_id: str):
    result = integ_service.get_integration(template_id)
    if not result:
        raise HTTPException(404, "Template not found")
    return result


@router.post("/integrations/setup")
async def setup_integration(payload: dict):
    brand_id = payload.get("brand_id")
    template_id = payload.get("template_id")
    config = payload.get("config", {})
    if not brand_id or not template_id:
        raise HTTPException(400, "brand_id and template_id required")
    return await integ_service.setup_integration(brand_id, template_id, config)


@router.post("/integrations/test/{integration_id}")
async def test_integration(integration_id: str, payload: dict = {}):
    brand_id = payload.get("brand_id")
    if not brand_id:
        raise HTTPException(400, "brand_id required")
    return await integ_service.test_integration(brand_id, integration_id)


@router.get("/integrations/brand/{brand_id}")
async def list_brand_integrations(brand_id: str):
    return await integ_service.list_brand_integrations(brand_id)


@router.get("/integrations/logs/{brand_id}")
async def integration_logs(brand_id: str, limit: int = Query(50, ge=1, le=200)):
    return await integ_service.integration_logs(brand_id, limit)


@router.post("/integrations/toggle/{integration_id}")
async def toggle_integration(integration_id: str, payload: dict = {}):
    active = payload.get("active", True)
    return await integ_service.toggle_integration(integration_id, active)


@router.delete("/integrations/{integration_id}")
async def delete_integration(integration_id: str):
    return await integ_service.delete_integration(integration_id)
