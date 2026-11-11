"""
Database index definitions — extracted from server.py lifespan.

All indexes are created concurrently on startup via asyncio.gather.
Each index creation is wrapped in try/except to tolerate collections
that don't exist yet.
"""
from __future__ import annotations

import asyncio
import logging
from core.db import db

logger = logging.getLogger(__name__)


async def _safe_create_index(collection, *args, **kwargs):
    try:
        await collection.create_index(*args, **kwargs)
    except Exception as e:
        logger.warning(f"Skipping index creation for {collection.name} {args}: {e}")


async def ensure_all_indexes():
    """Create all database indexes concurrently."""
    index_tasks = [
        _safe_create_index(db.users, "email", unique=True),
        _safe_create_index(db.users, "unique_id"),
        _safe_create_index(db.users, [("role", 1), ("_id", -1)]),
        _safe_create_index(db.users, [("role", 1), ("mentor_status", 1)]),
        _safe_create_index(db.users, "sa_id", unique=True, sparse=True),
        _safe_create_index(db.career_suggestions, "user_id"),
        _safe_create_index(db.career_roadmaps, "user_id"),
        _safe_create_index(db.college_students, [("college_id", 1), ("id", 1)]),
        _safe_create_index(db.chat_messages, [("user_id", 1), ("session_id", 1)]),
        _safe_create_index(db.bookings, [("student_id", 1), ("slot_start_iso", -1)]),
        _safe_create_index(db.bookings, [("mentor_id", 1), ("slot_start_iso", -1)]),
        _safe_create_index(db.audit_logs, "user_id"),
        _safe_create_index(db.audit_logs, [("ts", -1)]),
        _safe_create_index(db.sessions, "user_id"),
        _safe_create_index(db.sessions, [("expires_at", 1)], expireAfterSeconds=0),
        _safe_create_index(db.agent_k_schedules, [("status", 1), ("next_run_at", 1)]),
        _safe_create_index(db.agent_k_schedules, [("user_id", 1), ("created_at", -1)]),
        _safe_create_index(db.agent_runs, [("schedule_id", 1), ("started_at", -1)]),
        _safe_create_index(db.workflow_events, "event_type"),
        _safe_create_index(db.workflow_events, [("fired_at", -1)]),
        _safe_create_index(db.connections, "a"),
        _safe_create_index(db.connections, "b"),
        _safe_create_index(db.connections, [("from_id", 1), ("status", 1)]),
        _safe_create_index(db.connections, [("to_id", 1), ("status", 1)]),
        _safe_create_index(db.connections, "mentor_id"),
        _safe_create_index(db.applications, "user_id"),
        _safe_create_index(db.jobs_cache, "dedup_hash"),
        _safe_create_index(db.jobs_cache, [("expires_at", 1), ("job_type", 1)]),
        _safe_create_index(db.mentor_sessions, [("mentee_id", 1), ("status", 1)]),
        _safe_create_index(db.mentor_sessions, [("mentor_id", 1), ("status", 1)]),
        _safe_create_index(db.events, "mentor_id"),
        _safe_create_index(db.events, [("status", 1), ("start_date", -1)]),
        _safe_create_index(db.event_registrations, "event_id"),
        _safe_create_index(db.token_blacklist, [("expires_at", 1)], expireAfterSeconds=0),
        _safe_create_index(db.token_blacklist, "jti", unique=True, sparse=True),
        _safe_create_index(db.certificates, "verification_code", unique=True),
        _safe_create_index(db.certificates, "recipient_email"),
        _safe_create_index(db.payment_refunds, "payment_id"),
        _safe_create_index(db.payment_refunds, [("created_at", -1)]),
        _safe_create_index(db.approval_audit_trail, [("at", -1)]),
        _safe_create_index(db.approval_audit_trail, [("item_id", 1), ("at", -1)]),
        _safe_create_index(db.platform_briefings, [("generated_at", -1)]),
        _safe_create_index(db.settings_changelog, [("at", -1)]),
        _safe_create_index(db.settings_changelog, [("section", 1), ("at", -1)]),
        _safe_create_index(db.email_suppressions, "email", unique=True),
        _safe_create_index(db.email_quality_events, [("created_at", -1)]),
        _safe_create_index(db.echo_showcases, "slug", unique=True, sparse=True),
        _safe_create_index(db.echo_showcases, [("status", 1), ("date", -1)]),
        _safe_create_index(db.echo_registrations, [("slug", 1), ("user_key", 1)]),
        _safe_create_index(db.echo_registrations, [("payment.status", 1), ("slug", 1)]),
        _safe_create_index(db.invoices, "invoice_no", unique=True, sparse=True),
        _safe_create_index(db.invoices, [("user_id", 1), ("created_at", -1)]),
        _safe_create_index(db.email_campaigns, "campaign_id", unique=True, sparse=True),
        _safe_create_index(db.email_campaign_events, [("campaign_id", 1), ("email", 1)]),
        _safe_create_index(db.coupons, "code", unique=True),
        _safe_create_index(db.email_verifications, "email"),
        _safe_create_index(db.email_verifications, [("expires_at", 1)], expireAfterSeconds=0),
        _safe_create_index(db.echo_volunteers, "email"),
        _safe_create_index(db.echo_volunteers, "slug"),
        _safe_create_index(db.echo_volunteers, [("slug", 1), ("email", 1)], unique=True),
        # Marketplace
        _safe_create_index(db.echo_catalog_items, "event_id"),
        _safe_create_index(db.echo_catalog_items, [("event_id", 1), ("is_active", 1)]),
        _safe_create_index(db.echo_discount_coupons, [("event_id", 1), ("active", 1)]),
        _safe_create_index(db.echo_discount_coupons, "code", unique=True, sparse=True),
        _safe_create_index(db.echo_orders, [("user_id", 1), ("created_at", -1)]),
        _safe_create_index(db.echo_orders, [("status", 1)]),
        # Careers
        _safe_create_index(db.career_openings, [("status", 1), ("published_at", -1)]),
        _safe_create_index(db.career_openings, [("featured", -1), ("published_at", -1)]),
        _safe_create_index(db.career_openings, [("created_at", -1)]),
        _safe_create_index(db.career_applications, [("career_opening_id", 1), ("student_id", 1)], unique=True),
        _safe_create_index(db.career_applications, [("student_id", 1), ("created_at", -1)]),
        _safe_create_index(db.career_applications, [("career_opening_id", 1), ("status", 1)]),
        _safe_create_index(db.career_application_history, [("application_id", 1), ("changed_at", -1)]),
        # Wallet
        _safe_create_index(db.sa_coupons, "slug", unique=True),
        _safe_create_index(db.sa_user_coupons, [("user_id", 1), ("status", 1)]),
        _safe_create_index(db.sa_user_coupons, [("status", 1), ("expires_at", 1)]),
        _safe_create_index(db.sa_referrals, "referrer_id", unique=True),
        _safe_create_index(db.sa_referrals, "referral_code", unique=True),
        _safe_create_index(db.sa_referrals, "referred_users"),
        _safe_create_index(db.sa_badges, [("user_id", 1), ("slug", 1)], unique=True),
        _safe_create_index(db.sa_challenges, [("user_id", 1), ("week", 1)], unique=True),
        _safe_create_index(db.sa_wallet_audit, [("user_id", 1), ("ts", -1)]),
        _safe_create_index(db.notifications, [("user_id", 1), ("type", 1), ("created_at", -1)]),
        _safe_create_index(db.wallet_transactions, [("user_id", 1), ("ts", -1)]),
        _safe_create_index(db.users, [("wallet.last_credited_at", -1)]),
        _safe_create_index(db.users, [("wallet.last_used_at", -1)]),
        _safe_create_index(db.sa_rewards, "title"),
        _safe_create_index(db.sa_redemptions, [("user_id", 1), ("ts", -1)]),
        _safe_create_index(db.sa_redemptions, [("user_id", 1), ("reward_id", 1), ("ts", 1)]),
        _safe_create_index(db.sa_ai_resume_reviews, [("user_id", 1), ("status", 1)]),
        _safe_create_index(db.sa_marketplace_purchases, [("user_id", 1), ("ts", -1)]),
        _safe_create_index(db.sa_marketplace_purchases, [("user_id", 1), ("service", 1), ("ts", 1)]),
        # Talent Pool
        _safe_create_index(db.outreach_campaigns, "status"),
        _safe_create_index(db.outreach_campaigns, [("created_at", -1)]),
        _safe_create_index(db.outreach_messages, "token", unique=True, sparse=True),
        _safe_create_index(db.outreach_messages, [("campaign_id", 1), ("profile_id", 1)]),
        _safe_create_index(db.canonical_skills, "canonical", unique=True, sparse=True),
        _safe_create_index(db.talent_pool_consent, "email"),
        _safe_create_index(db.talent_pool_consent, "profile_id"),
        _safe_create_index(db.talent_pool_consent, "status"),
        _safe_create_index(db.erasure_log, [("erased_at", -1)]),
        _safe_create_index(db.talent_pool_activity_log, [("startTime", -1)]),
        _safe_create_index(db.talent_pool_activity_log, "object.id"),
        _safe_create_index(db.talent_pool_activity_log, "action"),
        _safe_create_index(db.scheduler_logs, [("agent", 1), ("started_at", -1)]),
        _safe_create_index(db.settings, "id", unique=True),
        _safe_create_index(db.external_job_listings, "dedup_hash"),
        _safe_create_index(db.external_job_listings, [("is_active", 1), ("created_at", -1)]),
        _safe_create_index(db.whatsapp_message_log, "external_id"),
        _safe_create_index(db.whatsapp_message_log, "status"),
        _safe_create_index(db.interview_feedback, [("candidate_id", 1), ("created_at", -1)]),
        _safe_create_index(db.ats_field_mappings, "system"),
        # Partners & Promotions
        _safe_create_index(db.partner_event_daily, [("partner_id", 1), ("day", 1)], unique=True),
        _safe_create_index(db.promotion_event_daily, [("promo_id", 1), ("day", 1)], unique=True),
        _safe_create_index(db.promotion_ab_sessions, "client_key", unique=True),
    ]
    await asyncio.gather(*index_tasks, return_exceptions=True)

    # Lead Aggregator indexes
    try:
        from features.lead_aggregator.database import ensure_indexes as _la_indexes
        await _la_indexes()
    except Exception as _e:
        logger.warning("Could not create Lead Aggregator indexes: %s", _e)

    try:
        from features.lead_aggregator.analytics import ensure_analytics_indexes as _la_analytics_idx
        await _la_analytics_idx()
    except Exception as _e:
        logger.warning("Could not create LA analytics indexes: %s", _e)

    try:
        from features.lead_aggregator.logging_config import setup_la_logging
        setup_la_logging()
    except Exception as _e:
        logger.warning("Could not setup LA logging: %s", _e)
