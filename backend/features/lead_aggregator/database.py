"""MongoDB collection setup, indexes, and TTL for Lead Aggregator (LA1)."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from db import db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Collection references (all under the shared `studentalumniadmin` database)
# ---------------------------------------------------------------------------
brands_col = db.la_brands
offers_col = db.la_offers
leads_col = db.la_leads
consent_col = db.la_consent_log
referrals_col = db.la_referral_events
claims_col = db.la_claim_log
otp_col = db.la_phone_otp
campus_col = db.la_campus_contacts
bot_runs_col = db.la_bot_runs
webhook_log_col = db.la_webhook_log

# LA3 — Webhooks (delivery_id unique, dead_letter TTL)
# (webhook_log_col above covers this)

# LA4 — AI Matching
ai_match_cache_col = db.la_ai_match_cache
ai_cost_log_col = db.la_ai_cost_log

# LA5 — Notifications
notif_prefs_col = db.la_notification_prefs
notif_inbox_col = db.la_notifications
notif_tokens_col = db.la_push_tokens

# LA7 — Deduplication
dedup_audit_col = db.la_dedup_audit

# LA8 — Geo
geo_cities_col = db.la_geo_cities

# LA9 — A/B Testing
ab_experiments_col = db.la_ab_experiments
ab_assignments_col = db.la_ab_assignments

# LA10 — Attribution
attribution_col = db.la_attribution_events
attribution_models_col = db.la_attribution_models

# LA11 — Fraud Detection
fraud_signals_col = db.la_fraud_signals
fraud_rules_col = db.la_fraud_rules

# LA12 — Smart Pricing
pricing_tiers_col = db.la_pricing_tiers
pricing_log_col = db.la_pricing_log

# LA13 — Campus Growth
campus_growth_col = db.la_campus_growth
campus_targets_col = db.la_campus_targets

# LA14 — Offer Analytics
offer_analytics_col = db.la_offer_analytics

# Enhancement #1 — Rate Limiting
rate_limits_col = db.la_rate_limits
rate_overrides_col = db.la_rate_overrides

# Enhancement #2 — Admin Guards
admins_col = db.la_admins

# Enhancement #6 — Email Digests
digest_prefs_col = db.la_digest_prefs

# Enhancement #7 — Bulk Import
bulk_imports_col = db.la_bulk_imports

# Enhancement #8 — Lead Assignment
assignment_rules_col = db.la_assignment_rules
lead_assignments_col = db.la_lead_assignments

# Enhancement #10 — Multi-language Consent (uses consent_col)

# Enhancement #11 — ML Scoring
ml_models_col = db.la_ml_models

# Enhancement #12 — Integrations
integrations_col = db.la_integrations
integration_logs_col = db.la_integration_logs


async def ensure_indexes() -> None:
    """Create compound indexes, TTL indexes, and unique constraints.

    Called once from the FastAPI lifespan startup event.
    """

    async def _idx(col, keys, **kw):
        try:
            await col.create_index(keys, **kw)
        except Exception as e:
            logger.warning("Index skip %s %s: %s", col.name, keys, e)

    # ── Brands ──
    await _idx(brands_col, "brand_id", unique=True)
    await _idx(brands_col, [("domain", 1), ("status", 1)])
    await _idx(brands_col, "api_key_hash", sparse=True)

    # ── Offers ──
    await _idx(offers_col, "offer_id", unique=True)
    await _idx(offers_col, [("brand_id", 1), ("is_active", 1)])
    await _idx(offers_col, [("domain", 1), ("is_active", 1), ("created_at", -1)])
    await _idx(offers_col, [("expires_at", 1)], expireAfterSeconds=0)

    # ── Leads ──
    await _idx(leads_col, "lead_id", unique=True)
    await _idx(leads_col, [("lead_id", 1), ("matched_brands", 1)])
    await _idx(leads_col, [("domain", 1), ("created_at", -1)])
    await _idx(leads_col, [("phone", 1), ("email", 1)])
    await _idx(leads_col, [("status", 1), ("temperature", 1)])
    await _idx(leads_col, [("score", -1)])

    # ── Consent Log (DPDP TTL) ──
    await _idx(consent_col, "consent_id", unique=True)
    await _idx(consent_col, [("phone", 1), ("brand_id", 1)])
    await _idx(consent_col, [("lead_id", 1)])
    await _idx(consent_col, [("expires_at", 1)], expireAfterSeconds=0)

    # ── Referral Events ──
    await _idx(referrals_col, "event_id", unique=True)
    await _idx(referrals_col, [("referrer_code", 1), ("created_at", -1)])
    await _idx(referrals_col, [("referred_lead_id", 1)])

    # ── Claim Log ──
    await _idx(claims_col, "claim_id", unique=True)
    await _idx(claims_col, [("lead_id", 1), ("offer_id", 1)])
    await _idx(claims_col, [("phone", 1), ("claimed_at", -1)])
    await _idx(claims_col, [("brand_id", 1), ("status", 1)])

    # ── Phone OTP (LA2) — 5-min TTL ──
    await _idx(otp_col, [("phone", 1)], unique=True)
    await _idx(otp_col, [("expires_at", 1)], expireAfterSeconds=0)

    # ── Campus Contacts ──
    await _idx(campus_col, "contact_id", unique=True)
    await _idx(campus_col, [("role", 1), ("institution", 1)])
    await _idx(campus_col, "referral_code", sparse=True)

    # ── Webhook Log (LA3) ──
    await _idx(webhook_log_col, "delivery_id", unique=True)
    await _idx(webhook_log_col, [("brand_id", 1), ("status", 1)])
    await _idx(webhook_log_col, [("status", 1), ("next_retry_at", 1)])
    await _idx(webhook_log_col, [("created_at", -1)])
    await _idx(webhook_log_col, [("dead_letter_expires_at", 1)], expireAfterSeconds=0)

    # ── Bot Runs ──
    await _idx(bot_runs_col, "run_id", unique=True)
    await _idx(bot_runs_col, [("started_at", -1)])

    # ── AI Match Cache (LA4) — 24h TTL ──
    await _idx(ai_match_cache_col, "cache_key", unique=True)
    await _idx(ai_match_cache_col, [("expires_at", 1)], expireAfterSeconds=0)

    # ── AI Cost Log (LA4) ──
    await _idx(ai_cost_log_col, [("brand_id", 1), ("month", 1)])
    await _idx(ai_cost_log_col, [("timestamp", -1)])

    # ── Notification Prefs (LA5) ──
    await _idx(notif_prefs_col, "brand_id", unique=True)

    # ── Notification Inbox (LA5) ──
    await _idx(notif_inbox_col, "notif_id", unique=True)
    await _idx(notif_inbox_col, [("brand_id", 1), ("read", 1), ("created_at", -1)])

    # ── Push Tokens (LA5) ──
    await _idx(notif_tokens_col, [("brand_id", 1), ("device_id", 1)], unique=True)

    # ── Dedup Audit (LA7) ──
    await _idx(dedup_audit_col, "audit_id", unique=True)
    await _idx(dedup_audit_col, [("primary_lead_id", 1)])
    await _idx(dedup_audit_col, [("timestamp", -1)])

    # ── A/B Experiments (LA9) ──
    await _idx(ab_experiments_col, "experiment_id", unique=True)
    await _idx(ab_experiments_col, [("offer_id", 1), ("status", 1)])

    # ── A/B Assignments (LA9) ──
    await _idx(ab_assignments_col, [("experiment_id", 1), ("lead_id", 1)], unique=True)

    # ── Attribution Events (LA10) ──
    await _idx(attribution_col, "event_id", unique=True)
    await _idx(attribution_col, [("lead_id", 1), ("created_at", -1)])
    await _idx(attribution_col, [("brand_id", 1), ("channel", 1)])

    # ── Fraud Signals (LA11) ──
    await _idx(fraud_signals_col, "signal_id", unique=True)
    await _idx(fraud_signals_col, [("lead_id", 1)])
    await _idx(fraud_signals_col, [("phone", 1), ("created_at", -1)])
    await _idx(fraud_signals_col, [("risk_level", 1)])

    # ── Smart Pricing (LA12) ──
    await _idx(pricing_tiers_col, [("domain", 1), ("temperature", 1)], unique=True)

    # ── Campus Growth (LA13) ──
    await _idx(campus_growth_col, [("institution", 1), ("month", 1)])

    # ── Offer Analytics (LA14) ──
    await _idx(offer_analytics_col, [("offer_id", 1), ("date", 1)], unique=True)
    await _idx(offer_analytics_col, [("brand_id", 1), ("date", -1)])

    # ── Rate Limits (Enh #1) — TTL sliding window ──
    await _idx(rate_limits_col, "key", unique=True)
    await _idx(rate_limits_col, [("expires_at", 1)], expireAfterSeconds=0)
    await _idx(rate_overrides_col, [("brand_id", 1), ("endpoint", 1)], unique=True)

    # ── Admins (Enh #2) ──
    await _idx(admins_col, "email", unique=True)

    # ── Digest Prefs (Enh #6) ──
    await _idx(digest_prefs_col, "brand_id", unique=True)

    # ── Bulk Imports (Enh #7) ──
    await _idx(bulk_imports_col, "import_id", unique=True)
    await _idx(bulk_imports_col, [("brand_id", 1), ("created_at", -1)])

    # ── Assignment Rules (Enh #8) ──
    await _idx(assignment_rules_col, "rule_id", unique=True)
    await _idx(assignment_rules_col, [("brand_id", 1), ("is_active", 1)])
    await _idx(lead_assignments_col, [("lead_id", 1), ("brand_id", 1)])
    await _idx(lead_assignments_col, [("rep_email", 1), ("status", 1)])

    # ── ML Models (Enh #11) ──
    await _idx(ml_models_col, "model_id", unique=True)
    await _idx(ml_models_col, [("is_active", 1)])

    # ── Integrations (Enh #12) ──
    await _idx(integrations_col, "integration_id", unique=True)
    await _idx(integrations_col, [("brand_id", 1), ("is_active", 1)])
    await _idx(integration_logs_col, [("brand_id", 1), ("created_at", -1)])
    await _idx(integration_logs_col, [("integration_id", 1)])

    logger.info("[LA] Lead Aggregator indexes created (LA1-LA14 + Enhancements)")
