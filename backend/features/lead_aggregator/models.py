"""Pydantic v2 models for all 6 Lead Aggregator collections."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums & Constants
# ---------------------------------------------------------------------------
class LeadDomain(str, Enum):
    education = "education"
    technology = "technology"
    finance = "finance"
    medical = "medical"
    travel = "travel"
    staffing = "staffing"
    real_estate = "real_estate"
    insurance = "insurance"
    automotive = "automotive"
    telecom = "telecom"
    ecommerce = "ecommerce"
    food_beverage = "food_beverage"
    fitness = "fitness"
    legal = "legal"
    entertainment = "entertainment"
    media = "media"
    hospitality = "hospitality"
    logistics = "logistics"
    agriculture = "agriculture"
    energy = "energy"
    pharma = "pharma"
    retail = "retail"
    banking = "banking"
    consulting = "consulting"
    nonprofit = "nonprofit"
    government = "government"
    manufacturing = "manufacturing"


SUPPORTED_DOMAINS = [d.value for d in LeadDomain]

BrandTier = Literal["free", "pro", "enterprise"]
BrandStatus = Literal["active", "pending", "suspended"]
LeadStatus = Literal["new", "contacted", "qualified", "converted", "invalid"]
LeadTemperature = Literal["hot", "warm", "cold", "low"]
ConsentAction = Literal["grant", "revoke", "update"]
CampusRole = Literal["tpo", "student_leader", "student_club", "campus_ambassador"]
WebhookStatus = Literal["pending", "delivered", "failed", "dead_letter"]


# ---------------------------------------------------------------------------
# Brand
# ---------------------------------------------------------------------------
class BrandCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    domain: LeadDomain
    tier: BrandTier = "free"
    contact_email: str
    contact_phone: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    lead_quota: int = Field(default=50, ge=0)
    target_age_min: int = Field(default=16, ge=10, le=100)
    target_age_max: int = Field(default=30, ge=10, le=100)
    target_cities: list[str] = Field(default_factory=list)
    target_skills: list[str] = Field(default_factory=list)
    target_education_levels: list[str] = Field(default_factory=list)

    @field_validator("contact_email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email format")
        return v.lower().strip()


class BrandDoc(BaseModel):
    """MongoDB document shape for brands collection."""
    brand_id: str
    name: str
    domain: str
    tier: BrandTier = "free"
    status: BrandStatus = "active"
    contact_email: str
    contact_phone: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    lead_quota: int = 50
    leads_used: int = 0
    target_age_min: int = 16
    target_age_max: int = 30
    target_cities: list[str] = Field(default_factory=list)
    target_skills: list[str] = Field(default_factory=list)
    target_education_levels: list[str] = Field(default_factory=list)
    api_key_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Offer
# ---------------------------------------------------------------------------
class OfferCreate(BaseModel):
    brand_id: str
    title: str = Field(..., min_length=3, max_length=300)
    description: Optional[str] = None
    domain: LeadDomain
    offer_type: Literal["discount", "free_trial", "cashback", "scholarship", "job", "internship", "event", "other"] = "other"
    value: Optional[str] = None
    target_age_min: int = Field(default=16, ge=10, le=100)
    target_age_max: int = Field(default=30, ge=10, le=100)
    target_cities: list[str] = Field(default_factory=list)
    target_skills: list[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None
    max_claims: int = Field(default=100, ge=1)
    is_active: bool = True


class OfferDoc(BaseModel):
    offer_id: str
    brand_id: str
    title: str
    description: Optional[str] = None
    domain: str
    offer_type: str = "other"
    value: Optional[str] = None
    target_age_min: int = 16
    target_age_max: int = 30
    target_cities: list[str] = Field(default_factory=list)
    target_skills: list[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None
    max_claims: int = 100
    claims_used: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Lead
# ---------------------------------------------------------------------------
class LeadSubmit(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    email: str
    phone: str = Field(..., min_length=10, max_length=15)
    age: Optional[int] = Field(default=None, ge=10, le=100)
    city: Optional[str] = None
    state: Optional[str] = None
    education_level: Optional[str] = None
    institution: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    domain: Optional[LeadDomain] = None
    source_platform: Literal["studentalumni", "wehive", "applylane", "hyra", "immi_axiss", "direct", "other"] = "direct"
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referral_code: Optional[str] = None
    campus_role: Optional[CampusRole] = None

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email format")
        return v.lower().strip()

    @field_validator("phone")
    @classmethod
    def _clean_phone(cls, v: str) -> str:
        digits = re.sub(r"[^\d+]", "", v)
        if len(digits) < 10:
            raise ValueError("Phone number must be at least 10 digits")
        return digits


class LeadDoc(BaseModel):
    lead_id: str
    full_name: str
    email: str
    phone: str
    phone_verified: bool = False
    age: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    education_level: Optional[str] = None
    institution: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    domain: Optional[str] = None
    source_platform: str = "direct"
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referral_code: Optional[str] = None
    campus_role: Optional[str] = None
    status: LeadStatus = "new"
    temperature: LeadTemperature = "cold"
    score: int = 0
    score_breakdown: dict[str, Any] = Field(default_factory=dict)
    matched_brands: list[str] = Field(default_factory=list)
    matched_offers: list[str] = Field(default_factory=list)
    profile_completeness: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Consent Log (DPDP Act 2023)
# ---------------------------------------------------------------------------
class ConsentRecord(BaseModel):
    consent_id: str
    lead_id: Optional[str] = None
    phone: str
    email: Optional[str] = None
    brand_id: Optional[str] = None
    offer_id: Optional[str] = None
    action: ConsentAction = "grant"
    purpose: str = "lead_processing"
    platform: str = "studentalumni"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    retention_period: int = Field(default=180, description="Days to retain before auto-expiry")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Referral Events
# ---------------------------------------------------------------------------
class ReferralEvent(BaseModel):
    event_id: str
    referrer_code: str
    referrer_id: Optional[str] = None
    referred_lead_id: str
    referred_phone: str
    campus_role: Optional[str] = None
    level: int = 1
    commission_pct: float = 0.0
    status: Literal["pending", "verified", "paid", "rejected"] = "pending"
    platform: str = "studentalumni"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Claim Log
# ---------------------------------------------------------------------------
class ClaimRecord(BaseModel):
    claim_id: str
    lead_id: str
    offer_id: str
    brand_id: str
    phone: str
    email: Optional[str] = None
    status: Literal["claimed", "verified", "converted", "rejected", "expired"] = "claimed"
    claimed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Campus Ecosystem
# ---------------------------------------------------------------------------
class CampusContact(BaseModel):
    contact_id: str
    name: str
    role: CampusRole
    institution: str
    city: str
    phone: Optional[str] = None
    email: Optional[str] = None
    is_verified: bool = False
    leads_generated: int = 0
    referral_code: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# OTP (Phone Verification — LA2)
# ---------------------------------------------------------------------------
class OTPSendRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    purpose: Literal["lead_verify", "brand_login", "consent"] = "lead_verify"

    @field_validator("phone")
    @classmethod
    def _clean_phone(cls, v: str) -> str:
        digits = re.sub(r"[^\d+]", "", v)
        if len(digits) < 10:
            raise ValueError("Phone number must be at least 10 digits")
        return digits


class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)

    @field_validator("phone")
    @classmethod
    def _clean_phone(cls, v: str) -> str:
        digits = re.sub(r"[^\d+]", "", v)
        if len(digits) < 10:
            raise ValueError("Phone number must be at least 10 digits")
        return digits


# ---------------------------------------------------------------------------
# Bot Agent Status
# ---------------------------------------------------------------------------
class BotRunStatus(BaseModel):
    run_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: Literal["running", "completed", "failed"] = "running"
    leads_processed: int = 0
    leads_rescored: int = 0
    serial_claimers_flagged: int = 0
    offers_expiring: int = 0
    webhooks_retried: int = 0
    reports_generated: int = 0
    revenue_credits_updated: int = 0
    errors: list[str] = Field(default_factory=list)
