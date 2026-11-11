"""
Student Alumni Platform - Backend
A FastAPI + MongoDB backend for a student career development platform.

ARCHITECTURE:
- 3 primary user roles: student, alumni, mentor (admin/college handled separately)
- JWT auth with email/password (Google/LinkedIn OAuth handled by separate Phase)
- Claude Sonnet 4.5 AI for personalized career guidance
- Role-based registration with role-specific validation
- Mentor accounts require admin review (status=pending until approved)
- Education-level + career-path-based content prioritization
- Multi-tenant (college) support for institutional dashboards

CONTENT PRIORITIZATION LOGIC:
1. Interest-based filtering: career_path drives content
2. Educational level segmentation:
   - Class 11/12: prioritize Campus Tours, Scholarships
   - University students: prioritize Internships, Hackathons, Higher Ed
3. Real-time event priority (deadlines surface to top)
4. 8 modular categories visible per Student dashboard
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
# Root .env holds the LLM gateway config (ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL / ANTHROPIC_MODEL)
load_dotenv(ROOT_DIR.parent / '.env')

import os
import socket
import logging

# Agent K & all emergentintegrations code expect EMERGENT_LLM_KEY. When unset,
# fall back to the BroCode/Anthropic gateway key so every agent has a default.
if not os.environ.get("EMERGENT_LLM_KEY") and os.environ.get("ANTHROPIC_API_KEY"):
    os.environ["EMERGENT_LLM_KEY"] = os.environ["ANTHROPIC_API_KEY"]

# --- GLOBALLY PATCH DNS TO PREVENT 34-SECOND IPv6 HANGS ON WINDOWS ---
import sys
if sys.platform == "win32" and not getattr(socket, "_ipv4_patched", False):
    _original_getaddrinfo = socket.getaddrinfo

    def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        if family == 0:
            family = socket.AF_INET
        return _original_getaddrinfo(host, port, family, type, proto, flags)

    socket.getaddrinfo = _ipv4_getaddrinfo
    socket._ipv4_patched = True  # type: ignore[attr-defined]
# ---------------------------------------------------------------------
logger = logging.getLogger(__name__)
import re
import uuid
import io
import base64
import logging
import secrets
import random
import string
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Dict, Any

import bcrypt
import jwt
import httpx
import pyotp
import qrcode
from bson import ObjectId
from fastapi import FastAPI, APIRouter, File, HTTPException, Depends, Request, Response, UploadFile, Query
# trigger reload
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field  # noqa: F401 (re-exported for backward compat)
from fastapi.middleware.gzip import GZipMiddleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.middleware import get_real_ip, register_security_middleware
from core.deps import get_current_user as _deps_get_current_user, bearer_token, decode_payload, decode_payload_silent

from core.config import limiter, JWT_SECRET, JWT_ALGORITHM, frontend_base_url

# Content prioritization engine — implements interest + edu-level + deadline + frequency scoring
from features.personalization import (
    build_personalized_dashboard,
    track_module_click,
    transition_to_alumni,
    CAREER_PATH_TO_MENTOR_CATEGORY,
)

# Multi-role badge engine
from features.badges import (
    compute_badges, refresh_user_badges, compute_all_users_badges, get_tier_theme,
)

# Role-based analytics + external API integrations
from features.analytics import get_analytics_for, super_admin_analytics, college_analytics, mentor_analytics
from features.integrations_base import (
    fetch_coursera_courses, fetch_udemy_courses, fetch_adzuna_internships,
    sync_courses_to_db, sync_internships_to_db, integrations_status,
)

# Mentor reviews/ratings + Push notifications
from features.reviews import (
    create_review, list_mentor_reviews, get_mentor_rating_stats,
    seed_sample_reviews, refresh_mentor_rating,
)
from features.notifications import (
    register_push_token, deregister_push_token, send_push, list_inbox,
    mark_inbox_read, unread_count, notify_booking_created, notify_booking_confirmed,
    notify_event_registered, notify_mentor_approved, notify_review_received,
)

# Services -- single source of truth for business logic
# compute_full_intelligence, compute_profile_completion moved to dashboard router
from services.career_roadmap_service import get_roadmap_summary

# Email sending
from core.email import send_email

# ----------------------------------------------------------------------------
# Setup & Configuration
# ----------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import time
_t0_mongo = time.perf_counter()
print("[DB TRACE] Mongo client created")
# MONGO_URL configuration — REQUIRED from environment (never hardcode).
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("MONGO_URL is not set. Copy backend/.env.example to backend/.env and set MONGO_URL.")
from db import client, db as _db_default, fetch_users_with_mock_limit
db = _db_default

# JWT configuration — REQUIRED from environment (never hardcode).
# Using JWT secrets from core.config
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour — short-lived; use refresh token for re-auth
REFRESH_TOKEN_EXPIRE_DAYS = 30

from contextlib import asynccontextmanager


@asynccontextmanager
async def _lifespan(application):
    """Single lifespan context replacing the deprecated @app.on_event handlers.

    Everything before `yield` runs on startup; everything after runs on shutdown.
    """
    # ── STARTUP ──────────────────────────────────────────────────────────────
    # 1. Warm Mongo connection pool (forces topology discovery before first request)
    try:
        from core.db import warm_db
        ping_ms = await warm_db()
        print(f"[DB TRACE] Mongo connection established | Duration: {ping_ms:.1f}ms", flush=True)
        print(f"[DB TRACE] Mongo Topology: {client.topology_description}", flush=True)
    except Exception as e:
        print(f"[DB TRACE] Mongo connection failed: {e}", flush=True)

    # 2. DB indexes + admin seed + schedulers (runs after Mongo is warm)
    async def _safe_create_index(collection, *args, **kwargs):
        try:
            await collection.create_index(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Skipping index creation for {collection.name} {args}: {e}")

    # Create all database indexes concurrently to prevent startup latency
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
        # Marketplace performance indexes
        _safe_create_index(db.echo_catalog_items, "event_id"),
        _safe_create_index(db.echo_catalog_items, [("event_id", 1), ("is_active", 1)]),
        _safe_create_index(db.echo_discount_coupons, [("event_id", 1), ("active", 1)]),
        _safe_create_index(db.echo_discount_coupons, "code", unique=True, sparse=True),
        _safe_create_index(db.echo_orders, [("user_id", 1), ("created_at", -1)]),
        _safe_create_index(db.echo_orders, [("status", 1)]),
        # First-Party Careers & Opportunities indexes
        _safe_create_index(db.career_openings, [("status", 1), ("published_at", -1)]),
        _safe_create_index(db.career_openings, [("featured", -1), ("published_at", -1)]),
        _safe_create_index(db.career_openings, [("created_at", -1)]),
        _safe_create_index(db.career_applications, [("career_opening_id", 1), ("student_id", 1)], unique=True),
        _safe_create_index(db.career_applications, [("student_id", 1), ("created_at", -1)]),
        _safe_create_index(db.career_applications, [("career_opening_id", 1), ("status", 1)]),
        _safe_create_index(db.career_application_history, [("application_id", 1), ("changed_at", -1)]),
        # Wallet coupon engine (W1) — partner catalog + per-user claims
        _safe_create_index(db.sa_coupons, "slug", unique=True),
        _safe_create_index(db.sa_user_coupons, [("user_id", 1), ("status", 1)]),
        _safe_create_index(db.sa_user_coupons, [("status", 1), ("expires_at", 1)]),
        # Wallet referral engine (W5) + badges (W6)
        _safe_create_index(db.sa_referrals, "referrer_id", unique=True),
        _safe_create_index(db.sa_referrals, "referral_code", unique=True),
        _safe_create_index(db.sa_referrals, "referred_users"),
        _safe_create_index(db.sa_badges, [("user_id", 1), ("slug", 1)], unique=True),
        _safe_create_index(db.sa_challenges, [("user_id", 1), ("week", 1)], unique=True),
        _safe_create_index(db.sa_wallet_audit, [("user_id", 1), ("ts", -1)]),
        # Wallet notifications (W9) — wallet-scoped in-app feed + weekly digest sweep
        _safe_create_index(db.notifications, [("user_id", 1), ("type", 1), ("created_at", -1)]),
        _safe_create_index(db.wallet_transactions, [("user_id", 1), ("ts", -1)]),
        _safe_create_index(db.users, [("wallet.last_credited_at", -1)]),
        _safe_create_index(db.users, [("wallet.last_used_at", -1)]),
        # Wallet reward marketplace (W2) — catalog + redemptions
        _safe_create_index(db.sa_rewards, "title"),
        _safe_create_index(db.sa_redemptions, [("user_id", 1), ("ts", -1)]),
        _safe_create_index(db.sa_redemptions, [("user_id", 1), ("reward_id", 1), ("ts", 1)]),
        _safe_create_index(db.sa_ai_resume_reviews, [("user_id", 1), ("status", 1)]),
        _safe_create_index(db.sa_marketplace_purchases, [("user_id", 1), ("ts", -1)]),
        _safe_create_index(db.sa_marketplace_purchases, [("user_id", 1), ("service", 1), ("ts", 1)]),
        # Talent Pool agent suite (TP15-TP32)
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
        # Partners & Promotions marketing suite (PT5/PT6/PM6/PM7)
        _safe_create_index(db.partner_event_daily, [("partner_id", 1), ("day", 1)], unique=True),
        _safe_create_index(db.promotion_event_daily, [("promo_id", 1), ("day", 1)], unique=True),
        _safe_create_index(db.promotion_ab_sessions, "client_key", unique=True),
    ]
    await asyncio.gather(*index_tasks, return_exceptions=True)

    # 2b. Lead Aggregator indexes (LA1)
    try:
        from features.lead_aggregator.database import ensure_indexes as _la_indexes
        await _la_indexes()
    except Exception as _e:
        logger.warning("Could not create Lead Aggregator indexes: %s", _e)

    # 2c. Lead Aggregator analytics indexes
    try:
        from features.lead_aggregator.analytics import ensure_analytics_indexes as _la_analytics_idx
        await _la_analytics_idx()
    except Exception as _e:
        logger.warning("Could not create LA analytics indexes: %s", _e)

    # 2d. Lead Aggregator structured logging
    try:
        from features.lead_aggregator.logging_config import setup_la_logging
        setup_la_logging()
    except Exception as _e:
        logger.warning("Could not setup LA logging: %s", _e)

    # 3. Auto seed certificates on startup if count is 0
    try:
        from scripts.seed_certificates import seed_certificates
        await seed_certificates()
    except Exception as e:
        logger.warning(f"Auto certificate seeding skipped: {e}")
    try:
        from features.echo_showcase import seed_echo_showcase
        await seed_echo_showcase(db)
    except Exception as _e:
        logger.warning("Could not seed ECHO showcases: %s", _e)

    # Seed admin account and baseline data
    # Seed admin account and baseline catalog data (extracted to seed_data.py)
    await seed_admin()
    await seed_data()

    # Start Agent K systems
    try:
        from features.agent_k.rag.store import init_collection
        init_collection() # Ensure Qdrant collection is ready
    except Exception as _e:
        logger.warning("Could not init Agent K collection: %s", _e)

    try:
        from core.email_quality import warmup as _email_warmup
        asyncio.create_task(_email_warmup())
    except Exception as _e:
        logger.warning("Could not warm email quality list: %s", _e)

    # Background schedulers run in exactly ONE worker. With UVICORN_WORKERS>1
    # every process used to start them, so crons, payment sweeps and
    # newsletter sends ran N times. core.leader hands out a Mongo lease.
    async def _start_background_jobs():
        # Start the hourly content sync scheduler.
        try:
            from background_sync import start_sync_scheduler, check_dependencies
            check_dependencies()
            start_sync_scheduler()
        except Exception as _e:
            logger.warning("Could not start background sync scheduler: %s", _e)

        # Start the workflow automation cron tick (60s polling).
        try:
            from features.workflow_automation import run_cron_workflows as _run_cron
            from features.newsletter import process_scheduled_campaigns as _process_sched
            from features.echo_showcase import sweep_expired_echo_payments as _sweep_echo_pay

            async def _wf_cron_tick():
                while True:
                    try:
                        await _run_cron()
                    except Exception as _ce:
                        logger.exception("workflow cron tick failed: %s", _ce)
                    try:
                        await _process_sched(db)
                    except Exception as _ce:
                        logger.exception("scheduled newsletter processing failed: %s", _ce)
                    try:
                        sweep_summary = await _sweep_echo_pay(db)
                        if sweep_summary.get("failed") or sweep_summary.get("reminded"):
                            logger.info("ECHO payment sweep: %s", sweep_summary)
                    except Exception as _ce:
                        logger.exception("ECHO payment sweep failed: %s", _ce)
                    await asyncio.sleep(60)
            asyncio.create_task(_wf_cron_tick())
        except Exception as _e:
            logger.warning("Could not start Workflow cron: %s", _e)

        # Start the 30-minute recurring multi-agent scheduler worker
        try:
            from services.agents.agent_scheduler import agent_scheduler
            agent_scheduler.start(db=db)
        except Exception as _e:
            logger.warning("Could not start 30-minute Agent Scheduler: %s", _e)

        # Weekly platform health briefing (AI4): Monday 09:00 IST cron.
        # Opt-in via HEALTH_BRIEFING_CRON_ENABLED=1.
        try:
            from services.agents.health_briefing_scheduler import start_health_briefing_scheduler
            start_health_briefing_scheduler()
        except Exception as _e:
            logger.warning("Could not start weekly health briefing cron: %s", _e)

        # Talent Pool agent suite (TP23): opt-in startup catch-up run
        # (TP_RUN_ON_STARTUP=1). The 30-min cycle covers the steady state.
        try:
            async def _talent_suite_startup(d):
                from services.agents.talent_scheduler import talent_scheduler_agent
                try:
                    out = await talent_scheduler_agent.run_on_startup(d)
                    if out.get("skipped") != "TP_RUN_ON_STARTUP not set":
                        logger.info("Talent suite startup catch-up: %s", out)
                except Exception as _ce:
                    logger.warning("Talent suite startup catch-up failed: %s", _ce)
            asyncio.create_task(_talent_suite_startup(db))
        except Exception as _e:
            logger.warning("Could not schedule Talent Pool suite startup run: %s", _e)

        # Start the 24-hour autonomous operations & audit swarm
        try:
            from services.agents.daily_audit_agents import daily_audit_service
            daily_audit_service.start(db=db)
        except Exception as _e:
            logger.warning("Could not start 24-hour Daily Audit Swarm: %s", _e)

        # Start the 24-hour course aggregator cron (daily 02:00 UTC + startup catch-up)
        try:
            from services.course_aggregator import start_course_aggregator_scheduler
            start_course_aggregator_scheduler()
        except Exception as _e:
            logger.warning("Could not start Course Aggregator scheduler: %s", _e)

        # Start the staggered deals aggregator crons (banks 01:00, coupons 02:00,
        # cashback 02:30, community 6h, APIs 03:00, student/airlines weekly,
        # affiliate 6h — all UTC + startup catch-up)
        try:
            from services.deals_aggregator import start_deals_aggregator_scheduler
            start_deals_aggregator_scheduler()
        except Exception as _e:
            logger.warning("Could not start Deals Aggregator scheduler: %s", _e)

        # Start the 6-hour Lead Aggregator bot cycle (opt-in:
        # LA_BOT_SCHEDULER_ENABLED=1; optional startup catch-up via
        # LA_BOT_STARTUP_CATCHUP=1)
        try:
            from features.lead_aggregator.bot_scheduler import start_lead_aggregator_scheduler
            start_lead_aggregator_scheduler()
        except Exception as _e:
            logger.warning("Could not start Lead Aggregator 6h scheduler: %s", _e)


    try:
        from core.leader import run_as_leader
        _leader_task = asyncio.create_task(run_as_leader(db, _start_background_jobs))
        application.state.leader_task = _leader_task
    except Exception as _e:
        logger.warning("Could not start scheduler leader supervisor: %s", _e)

    yield  # ← application runs here

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────

    try:
        _lt = getattr(application.state, "leader_task", None)
        if _lt and not _lt.done():
            _lt.cancel()
            try:
                await _lt
            except (asyncio.CancelledError, Exception):
                pass
    except Exception:
        pass

    try:
        from services.agents.daily_audit_agents import daily_audit_service
        daily_audit_service.stop()
    except Exception:
        pass

    try:
        from services.agents.agent_scheduler import agent_scheduler
        agent_scheduler.stop()
    except Exception:
        pass

    try:
        from background_sync import stop_sync_scheduler
        stop_sync_scheduler()
    except Exception:
        pass

    try:
        from services.course_aggregator import stop_course_aggregator_scheduler
        stop_course_aggregator_scheduler()
    except Exception:
        pass

    try:
        from services.deals_aggregator import stop_deals_aggregator_scheduler
        stop_deals_aggregator_scheduler()
    except Exception:
        pass

    try:
        from features.lead_aggregator.bot_scheduler import stop_lead_aggregator_scheduler
        stop_lead_aggregator_scheduler()
    except Exception:
        pass
    client.close()


app = FastAPI(title="Student Alumni Platform API", lifespan=_lifespan)

# App-wide HTTP Request/Response & Performance Logging Middleware
from core.logging_middleware import AppLoggingMiddleware
app.add_middleware(AppLoggingMiddleware)

# SECURITY: CORSMiddleware is registered once at the bottom of this file,
# configured from env vars (ALLOWED_ORIGINS). Do NOT add a second registration here.
def _custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    from fastapi.responses import JSONResponse
    retry_after = getattr(exc, "retry_after", 60) or 60
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later.", "retry_after": int(retry_after)},
        headers={"Retry-After": str(int(retry_after))}
    )

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _custom_rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")  # All routes prefixed with /api (Kubernetes ingress requirement)

# ECHO Showcase sub-router
from features.echo_showcase import router as echo_router
from features.routers.vendors import router as vendors_router
from features.routers.marketplace import router as marketplace_router
app.include_router(echo_router)
app.include_router(vendors_router)
app.include_router(marketplace_router)

# Newsletter sub-router
from features.newsletter import router as newsletter_router
app.include_router(newsletter_router)

# Contacts sub-router
from features.routers.contacts import router as contacts_router
app.include_router(contacts_router)

# Student Perks sub-router
from features.routers.student_perks import router as student_perks_router
app.include_router(student_perks_router)

# Lead Aggregator (LA1–LA14)
from features.lead_aggregator.api import router as lead_aggregator_router
app.include_router(lead_aggregator_router)

# Lead Aggregator request logging middleware
try:
    from features.lead_aggregator.logging_config import RequestLogMiddleware
    app.add_middleware(RequestLogMiddleware)
except Exception as _e:
    logger.warning("Could not add LA request logging middleware: %s", _e)

from core.email_quality import router as email_quality_router
api_router.include_router(email_quality_router)

# Static file serving for uploads (ECHO Showcase images & documents)
import os
from fastapi.staticfiles import StaticFiles
_UPLOADS_DIR = str(ROOT_DIR / "uploads")
os.makedirs(os.path.join(_UPLOADS_DIR, "echo"), exist_ok=True)
os.makedirs(os.path.join(_UPLOADS_DIR, "general"), exist_ok=True)
os.makedirs(os.path.join(_UPLOADS_DIR, "coupons"), exist_ok=True)
os.makedirs(os.path.join(_UPLOADS_DIR, "certificates"), exist_ok=True)
os.makedirs(os.path.join(_UPLOADS_DIR, "newsletter"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")


# ----------------------------------------------------------------------------
# Shared file upload endpoint (ads, coupons, promotions, newsletter)
# ----------------------------------------------------------------------------
@api_router.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Query("general"),
    user: dict = Depends(_deps_get_current_user),
):
    """Upload an image file and return its static URL. Used by ads, coupons, promotions, newsletter."""
    role = (user.get("role") or "").lower()
    if role not in ("admin", "superadmin", "super_admin", "hr admin", "hr_admin"):
        raise HTTPException(403, "Only admins can upload files")
    from pathlib import Path
    from datetime import datetime as _dt, timezone as _tz
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    filename = file.filename or "upload.png"
    ext = Path(filename).suffix.lower() or ".png"
    if ext not in allowed:
        raise HTTPException(400, f"File type {ext} not allowed. Use JPG, PNG, WebP, or GIF.")
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(500, f"Failed to read uploaded file: {e}")
    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(contents)
    max_size = 5 * 1024 * 1024  # 5 MB
    if len(contents) > max_size:
        raise HTTPException(413, "File too large. Maximum 5 MB allowed.")
    if len(contents) == 0:
        raise HTTPException(400, "Uploaded file is empty")
    # Sanitize folder name to prevent path traversal
    safe_folder = Path(folder).name if folder else "general"
    upload_dir = ROOT_DIR / "uploads" / safe_folder
    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(500, f"Failed to create upload directory: {e}")
    ts = int(_dt.now(_tz.utc).timestamp())
    stem = Path(filename).stem.replace(" ", "_").replace("/", "_")[:80]
    safe_name = f"{ts}_{stem}{ext}"
    out_path = upload_dir / safe_name
    try:
        with open(out_path, "wb") as f:
            f.write(contents)
    except PermissionError:
        # Self-healing: try to fix permissions and retry once
        import subprocess
        try:
            subprocess.run(["chmod", "-R", "777", str(ROOT_DIR / "uploads")], check=False, timeout=5)
            uid = getattr(os, "getuid", lambda: 1000)()
            gid = getattr(os, "getgid", lambda: 1000)()
            subprocess.run(["chown", "-R", f"{uid}:{gid}", str(ROOT_DIR / "uploads")], check=False, timeout=5)
        except Exception:
            pass
        try:
            with open(out_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            raise HTTPException(500, f"Permission denied writing to {out_path}. Run: chmod -R 777 {ROOT_DIR / 'uploads'}")
    except Exception as e:
        raise HTTPException(500, f"Failed to save file: {e}")
    url = f"/uploads/{safe_folder}/{safe_name}"
    return {"status": "ok", "url": url}


# (Mongo warm-up and shutdown handling are now handled in the _lifespan context above)


# ----------------------------------------------------------------------------
# Encryption-at-Rest — Fernet (AES-128 in CBC mode + HMAC-SHA256)
# ----------------------------------------------------------------------------
# Per spec — encrypt sensitive personal data (dob, phone, postal_code) at rest.
# Backwards-compat: legacy users may have plaintext values; decrypt() returns
# the input as-is when it can't be decoded as Fernet ciphertext.
try:
    from cryptography.fernet import Fernet, InvalidToken  # noqa: E402
    _HAS_CRYPTOGRAPHY = True
except Exception:
    _HAS_CRYPTOGRAPHY = False
    class Fernet:
        @staticmethod
        def generate_key():
            return b"dummy_key_for_dev_booting_without_cryptography_32b_len="
        def __init__(self, key):
            pass
        def encrypt(self, data: bytes) -> bytes:
            return data
        def decrypt(self, data: bytes) -> bytes:
            return data
    class InvalidToken(Exception):
        pass

_FERNET_KEY = os.environ.get("FERNET_KEY")
if not _FERNET_KEY:
    if os.getenv("ENV") == "production":
        raise RuntimeError(
            "FERNET_KEY environment variable is required in production. "
            "PII encryption (phone, dob, postal_code) would be non-persistent without it."
        )
    # Auto-generate a session key in dev so the app boots; logs a warning.
    if _HAS_CRYPTOGRAPHY:
        _FERNET_KEY = Fernet.generate_key().decode()
    else:
        _FERNET_KEY = Fernet.generate_key().decode('utf-8')
    logger.warning(
        "⚠️  FERNET_KEY not set — using ephemeral key (dev only). "
        "Set FERNET_KEY in .env for persistent PII encryption."
    )
_FERNET = Fernet(_FERNET_KEY.encode() if isinstance(_FERNET_KEY, str) else _FERNET_KEY)
# Marker so we can recognise our ciphertexts in mixed-format collections.
_ENC_PREFIX = "enc::"


def encrypt_value(plain: Optional[str]) -> Optional[str]:
    """Wrap a string with the Fernet token + a recognisable prefix."""
    if plain is None or plain == "":
        return plain
    if isinstance(plain, str) and plain.startswith(_ENC_PREFIX):
        return plain  # already encrypted
    try:
        token = _FERNET.encrypt(plain.encode("utf-8")).decode("utf-8")
        return f"{_ENC_PREFIX}{token}"
    except Exception:
        return plain  # never block the write on encryption failure


def decrypt_value(value: Optional[str]) -> Optional[str]:
    """Unwrap a Fernet ciphertext. Returns the input unchanged if not ours."""
    if value is None or value == "":
        return value
    if isinstance(value, str) and value.startswith(_ENC_PREFIX):
        try:
            return _FERNET.decrypt(value[len(_ENC_PREFIX):].encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return None  # tampered or wrong key — return None defensively
        except Exception:
            return None
    return value  # legacy plaintext


# ----------------------------------------------------------------------------
# Audit Log Helpers — write every personal-data change to `audit_logs`
# ----------------------------------------------------------------------------
# Schema: { user_id, field_name, old_value, new_value, source, validation_status,
#           ts (UTC datetime), is_manual_entry }
async def _audit_log(user_id: str, field: str, old_value, new_value, *,
                     source: str = "onboarding",
                     validation_status: str = "passed",
                     is_manual_entry: bool = False) -> None:
    """Insert a single audit entry. Best-effort — never raise to caller."""
    try:
        await db.audit_logs.insert_one({
            "user_id": user_id,
            "field_name": field,
            "old_value": old_value if old_value is not None else None,
            "new_value": new_value if new_value is not None else None,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": is_manual_entry,
            "ts": datetime.now(timezone.utc),
        })
    except Exception:
        # Don't let audit failures break the user's flow.
        pass


async def _audit_log_many(user_id: str, source: str, entries: list,
                          validation_status: str = "passed") -> None:
    """Bulk insert audit entries. `entries` is a list of (field, old, new) tuples."""
    if not entries:
        return
    try:
        docs = [{
            "user_id": user_id,
            "field_name": f,
            "old_value": o,
            "new_value": n,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": False,
            "ts": datetime.now(timezone.utc),
        } for (f, o, n) in entries if n is not None and n != ""]
        if docs:
            await db.audit_logs.insert_many(docs, ordered=False)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Type Definitions & Pydantic Models — imported from core.models
# (canonical definitions live in core/models.py to avoid duplication)
# ----------------------------------------------------------------------------
from core.models import (  # noqa: E402
    UserRole, CareerPath, EducationLevel, MentorCategory, MentorStatus,
    SchoolInfo, MentorInfo, CollegeInfo, AlumniInfo, StudentInfo,
    RegisterRequest, LoginRequest, ForgotPasswordRequest,
    VerifyResetOtpRequest, ResetPasswordRequest, OnboardingRequest,
    UserResponse, AuthResponse,
    TwoFAChallengeResponse, TwoFASetupRequest, TwoFASetupResponse,
    TwoFAEnableRequest, TwoFAEnableResponse, TwoFAVerifyRequest, TwoFADisableRequest,
    CareerSuggestionRequest, ChatRequest, ChatResponse,
    BookingRequest, ConnectRequestIn, MentorBookingCreateRequest, RescheduleRequest,
)


# Pydantic Models removed — now imported from core.models above.
# All request/response models now live in core/models.py


# ----------------------------------------------------------------------------
# Helpers — Auth, hashing, ID generation
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Bcrypt is the industry standard for password hashing in 2026."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Short-lived access token for API authentication.
    Includes a JTI (JWT ID) for token revocation support (logout blacklist).
    """
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": secrets.token_hex(16),  # unique token ID for revocation
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Long-lived refresh token to obtain new access tokens without re-login."""
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_unique_id(role: str) -> str:
    """Platform unique ID format: SA-{YEAR}-{ROLE_CODE}-{6 RANDOM CHARS}.
    Example: SA-2026-STU-A7B2X9. Used as the user's QR code payload."""
    role_codes = {"student": "STU", "alumni": "ALM", "mentor": "MNT", "college": "CLG", "admin": "ADM"}
    code = role_codes.get(role, "USR")
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SA-{datetime.now().year}-{code}-{rand}"


def generate_qr_code(data: str) -> str:
    """Generate base64-encoded PNG QR code for a unique platform ID."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#5F259F", back_color="#FFFFFF")  # Brand purple QR
    buf = io.BytesIO()
    getattr(img, "save")(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _safe_block(model_cls, value):
    """Try to coerce a stored dict into the given Pydantic model. If it fails
    validation (e.g. seed data missing required fields), return None instead of
    crashing the whole user payload. Logged so we know it happened."""
    if value is None:
        return None
    try:
        # Validate but return as dict so FastAPI re-validates with the parent model
        return model_cls(**value).model_dump(exclude_none=False)
    except Exception:
        return None


def serialize_user(user: dict) -> dict | None:
    """Strip internal fields (_id, password_hash) from user dict before sending to client.
    Decrypts at-rest fields (phone / dob / postal_code) on the way out.
    """
    if not user:
        return None
    return {
        "id": str(user.get("_id")),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "role": user.get("role"),
        # Sensitive fields — decrypt before exposing.
        "phone":        decrypt_value(user.get("phone")),
        "unique_id": user.get("unique_id"),
        "qr_code_base64": user.get("qr_code_base64"),
        "school_info":  _safe_block(SchoolInfo,  user.get("school_info")),
        "career_path":  user.get("career_path"),
        "student_info": _safe_block(StudentInfo, user.get("student_info")),
        "alumni_info":  _safe_block(AlumniInfo,  user.get("alumni_info")),
        "mentor_info":  _safe_block(MentorInfo,  user.get("mentor_info")),
        "college_info": _safe_block(CollegeInfo, user.get("college_info")),
        "mentor_status": user.get("mentor_status"),
        "interests": user.get("interests", []),
        "skills": user.get("skills", []),
        "bio": user.get("bio"),
        "face_image_base64": user.get("face_image_base64"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "two_fa_enabled": user.get("two_fa_enabled", False),
        # Phase A — DOB / country / postal — exposed on every user response.
        "dob":          decrypt_value(user.get("dob")),
        "country_code": user.get("country_code"),
        "postal_code":  decrypt_value(user.get("postal_code")),
        "created_at": user.get("created_at"),
        # Phase-4 SA Profile Web fields — round-trip through PUT /users/me & /auth/me
        "first_name":     user.get("first_name"),
        "last_name":      user.get("last_name"),
        "headline":       user.get("headline"),
        "photo_data":     user.get("face_image_base64") or user.get("photo_data") or user.get("oauth_picture"),
        "banner_data":    user.get("banner_data"),
        "college_logo_data": user.get("college_logo_data"),
        "institution":    user.get("institution") or (user.get("school_info") or {}).get("institution_name") or (user.get("alumni_info") or {}).get("institution_name") or (user.get("college_info") or {}).get("institution_name"),
        "branch":         user.get("branch") or (user.get("school_info") or {}).get("branch_or_stream"),
        "stream":         user.get("stream"),
        "department":     user.get("department"),
        "graduation_year": user.get("graduation_year") or (user.get("school_info") or {}).get("graduation_year") or (user.get("alumni_info") or {}).get("graduation_year"),
        "cgpa":           user.get("cgpa") or (user.get("school_info") or {}).get("cgpa"),
        "location":       user.get("location"),
        "city":           user.get("city") or (user.get("school_info") or {}).get("city") or (user.get("college_info") or {}).get("city"),
        "state":          user.get("state") or (user.get("school_info") or {}).get("state") or (user.get("college_info") or {}).get("state"),
        "linkedin_url":   user.get("linkedin_url"),
        "github_url":     user.get("github_url"),
        "portfolio_url":  user.get("portfolio_url"),
        "primary_skill":  user.get("primary_skill"),
        "profile_visibility": user.get("profile_visibility"),
        "section_toggles": user.get("section_toggles"),
        "badges":         [b for b in user.get("badges", []) if isinstance(b, dict)],
        "projects":       user.get("projects"),
        "preferences":    user.get("preferences"),
        "is_verified":    user.get("is_verified"),
        "ranking_tier":   user.get("ranking_tier"),
        # Identity & DigiLocker
        "aadhaar_number": user.get("aadhaar_number"),
        "aadhaar_masked": user.get("aadhaar_masked") or (f"•••• •••• {str(user.get('aadhaar_number'))[-4:]}" if user.get("aadhaar_number") and len(str(user.get("aadhaar_number")).replace(" ","")) >= 4 else None),
        "aadhaar_verified": bool(user.get("aadhaar_verified", False)),
        "digilocker_id": user.get("digilocker_id"),
        "digilocker_verified": bool(user.get("digilocker_verified", False)),
        "digilocker_doc_count": int(user.get("digilocker_doc_count", 0)),
        "digilocker_uri": user.get("digilocker_uri"),
        "digilocker_linked_at": user.get("digilocker_linked_at"),
    }


async def get_current_user(request: Request) -> dict:
    """JWT auth dependency. Reads `Authorization: Bearer <token>` header.

    Shared decode + blacklist checks live in core.deps; the schema-migration
    block below is kept here because it mutates the user document.
    """
    payload = decode_payload(bearer_token(request.headers.get("Authorization", "")), token_type="access")
    # Check token blacklist (logout revocation)
    jti = payload.get("jti")
    if jti:
        blacklisted = await db.token_blacklist.find_one({"jti": jti})
        if blacklisted:
            raise HTTPException(401, "Token has been revoked")
    user = await db.users.find_one(
        {"_id": ObjectId(payload["sub"])}
    )
    if not user:
        raise HTTPException(401, "User not found")

    # ── Schema Unification Migration Helper ──
    needs_migration = False
    updates = {"$set": {}, "$unset": {}}

    # 1. Image Schema
    if not user.get("photo_data") and (user.get("photo_data")):
        user["photo_data"] = user.get("photo_data")
        updates["$set"]["photo_data"] = user["photo_data"]
        if "face_image_base64" in user: updates["$unset"]["face_image_base64"] = ""
        if "photo" in user: updates["$unset"]["photo"] = ""
        needs_migration = True

    # 2. Career Goal
    si = user.get("student_info") or {}
    if not si.get("career_goal") and (user.get("career_goal") or user.get("career_path")):
        si["career_goal"] = user.get("career_goal") or user.get("career_path")
        user["student_info"] = si
        updates["$set"]["student_info"] = si
        if "career_goal" in user: updates["$unset"]["career_goal"] = ""
        if "career_path" in user: updates["$unset"]["career_path"] = ""
        needs_migration = True

    # 3. Education
    s_info = user.get("school_info") or {}
    has_edu_legacy = False
    for legacy_key, target_key in [
        ("branch", "branch_or_stream"),
        ("cgpa", "cgpa"),
        ("graduation_year", "graduation_year"),
        ("class_or_year", "class_or_year"),
        ("department", "branch_or_stream")
    ]:
        if legacy_key in user:
            if target_key not in s_info or not s_info[target_key]:
                s_info[target_key] = user[legacy_key]
            updates["$unset"][legacy_key] = ""
            has_edu_legacy = True
    if has_edu_legacy:
        user["school_info"] = s_info
        updates["$set"]["school_info"] = s_info
        needs_migration = True

    # 4. Resume
    if user.get("resume_url"):
        legacy_url = user.get("resume_url")
        new_doc = {
            "id": "legacy_migrated",
            "name": "Legacy_Resume.pdf",
            "size": 0,
            "data_url": legacy_url,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "active": True
        }
        updates["$push"] = {"resume_documents": new_doc}
        if not user.get("resume_documents"):
            user["resume_documents"] = []
        user["resume_documents"].append(new_doc)
        if "resume_url" in user: updates["$unset"]["resume_url"] = ""
        if "resume_data" in user: updates["$unset"]["resume_data"] = ""
        needs_migration = True

    if needs_migration:
        try:
            if not updates["$unset"]: del updates["$unset"]
            if not updates["$set"]: del updates["$set"]
            if not updates.get("$push"): updates.pop("$push", None)
            if updates:
                await db.users.update_one({"_id": user["_id"]}, updates)
        except Exception as e:
            print(f"Migration error: {e}", flush=True)

    # Remove large binary fields from response to match legacy behavior
    if "resume_documents" in user:
        del user["resume_documents"]

    return user


def validate_student_class(school_info: SchoolInfo, age: Optional[int] = None) -> None:
    """Per spec: students must be age 10+ AND in Class 11 (+1) or above."""
    if age is not None and age < 10:
        raise HTTPException(400, "Students must be at least 10 years old to register.")
    cls = (school_info.class_or_year or "").strip().lower()
    # If user typed a single number, reject 1-10
    if cls.isdigit() and int(cls) < 11:
        raise HTTPException(400, "Students must be in Class 11 (+1) or above.")





# Dashboard endpoint extracted to features/routers/dashboard.py
from features.routers.dashboard import router as dashboard_router
api_router.include_router(dashboard_router)


from features.coupons_api import router as coupons_api_router
api_router.include_router(coupons_api_router)


from features.auth_verify_api import router as auth_verify_api_router
api_router.include_router(auth_verify_api_router)


from features.media_api import router as media_api_router
api_router.include_router(media_api_router)



from features.analytics_api import router as analytics_api_router
api_router.include_router(analytics_api_router)


from features.integrations_api import router as integrations_api_router
api_router.include_router(integrations_api_router)


from features.teams_api import router as teams_api_router
api_router.include_router(teams_api_router)


from features.reviews_api import router as reviews_api_router
api_router.include_router(reviews_api_router)


from features.notifications_api import router as notifications_api_router
api_router.include_router(notifications_api_router)


# ----------------------------------------------------------------------------
# Health
# ----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "Student Alumni Platform"}


# ----------------------------------------------------------------------------
# Seed Data (extracted to seed_data.py)
# ----------------------------------------------------------------------------
from seed_data import seed_data, seed_admin


# ----------------------------------------------------------------------------
# Auth — Logout (token revocation)
# ----------------------------------------------------------------------------
@api_router.post("/auth/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    """Invalidate the current access token by adding its JTI to the blacklist.

    The blacklist entry auto-expires via MongoDB TTL index when the token
    itself would have expired, so the collection stays bounded.
    """
    token = bearer_token(request.headers.get("Authorization", ""))
    payload = decode_payload_silent(token) if token else None
    if payload:
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else (
                datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            try:
                await db.token_blacklist.insert_one({
                    "jti": jti,
                    "user_id": str(user["_id"]),
                    "expires_at": expires_at,
                    "revoked_at": datetime.now(timezone.utc),
                })
            except Exception:
                pass  # Duplicate JTI insert is fine — token already revoked
    return {"status": "logged_out"}


# ----------------------------------------------------------------------------
# Mount router & CORS middleware
# ----------------------------------------------------------------------------
from portals import router as portals_router
api_router.include_router(portals_router)

from features.jobs_feed import router as jobs_feed_router  # live job aggregator (7 free APIs + tier filter)
api_router.include_router(jobs_feed_router)
from features.mentor_ai import router as mentor_ai_router  # mentor AI studio (mentee pulse, skill gaps, impact, session prep)
api_router.include_router(mentor_ai_router)
from features.wallet_and_availability import router as wallet_router  # SA Credits + mentor availability + demo seed
api_router.include_router(wallet_router)
from features.reward_marketplace import router as reward_marketplace_router  # Reward marketplace (W2): sa_rewards catalog + fulfillment engine
api_router.include_router(reward_marketplace_router)
from features.activity_credits import router as activity_credits_router  # Activity-based earnings + Wallet summary/topup/withdraw
api_router.include_router(activity_credits_router)
from features.coupon_engine import router as coupon_engine_router  # Wallet coupons (W1): partner catalog, claims, expiry
api_router.include_router(coupon_engine_router)
from features.referral_engine import router as referral_engine_router  # Wallet referrals (W5): code, milestones, leaderboard
api_router.include_router(referral_engine_router)
from features.gamification_engine import router as gamification_engine_router  # Wallet streaks, wallet badges, weekly challenges, leaderboard (W6)
api_router.include_router(gamification_engine_router)
from features.wallet_security import router as wallet_security_router  # Wallet security: rate limits, audit log, KYC-lite (W8)
api_router.include_router(wallet_security_router)
from features.wallet_notifications import router as wallet_notifications_router  # Wallet notifications: inbox feed, prefs, weekly digest (W9)
api_router.include_router(wallet_notifications_router)
from features.wallet_transfer import router as wallet_transfer_router  # Wallet-to-wallet transfers (W11): 10-500cr, 3/day, both notified
api_router.include_router(wallet_transfer_router)
from features.credit_marketplace import router as credit_marketplace_router  # SA credit marketplace (W12): buy platform services with credits
api_router.include_router(credit_marketplace_router)
from features.wallet_analytics import router as wallet_analytics_router  # Wallet spending analytics (W3): donut/bars/trend/milestones/projection
api_router.include_router(wallet_analytics_router)
from features.deals_aggregator import router as deals_aggregator_router  # SA Member Deals + Tag Engine + AI generator
api_router.include_router(deals_aggregator_router)
from features.higher_ed_platform import router as higher_ed_router  # SA Higher Education programmes/scholarships/tracker/AI tools
api_router.include_router(higher_ed_router)
from features.events_aggregator import router as events_aggregator_router  # Events v2: aggregator + RSVP + waitlist + AI recs + host flow
api_router.include_router(events_aggregator_router)
from features.financial_services import router as financial_router  # Financial v2: scholarships, loans, startup_funding, insurance, venture_capital + match score + AI helper + EMI
api_router.include_router(financial_router)
from features.rentals_marketplace import router as rentals_router  # SA Stay: housing, vehicles, hotels, coworking + bookings + AI recommend
api_router.include_router(rentals_router)
from features.courses_marketplace import router as courses_router  # SA Courses: catalog + tracks + enrollments + AI advisor
api_router.include_router(courses_router)
# Course Aggregator (C1) — 24h external course bot: admin status / source toggle / manual run
from services.course_aggregator import admin_router as course_aggregator_admin_router
api_router.include_router(course_aggregator_admin_router)
# Deals Aggregator (D1) — universal deal bot: admin status / source toggle / manual run
from services.deals_aggregator import admin_router as deals_aggregator_admin_router
api_router.include_router(deals_aggregator_admin_router)
from features.college_portal import router as college_router  # College admin Phase 3: roster + analytics
api_router.include_router(college_router)

# Auth analytics & session tracking
from features.auth_analytics import router as auth_analytics_router
api_router.include_router(auth_analytics_router)

# Visitor analytics & telemetry engine (Unregistered + Registered visitors)
from features.visitor_analytics import router as visitor_analytics_router
api_router.include_router(visitor_analytics_router)

# Visitor Radar real-time WebSocket hub (VR7) — /api/ws/visitor-radar
from websocket_hub import router as visitor_radar_ws_router
api_router.include_router(visitor_radar_ws_router)

# PostHog analytics proxy
from features.posthog_proxy import router as posthog_proxy_router
api_router.include_router(posthog_proxy_router)

# AI Daily Brief (on-demand Claude integration)
from features.ai_briefs import router as ai_briefs_router
api_router.include_router(ai_briefs_router)

# Agent K — automation operator (Claude tool-use loop)
from features.agent_k.api.routes import router as agent_k_router
api_router.include_router(agent_k_router)

# Agent K — provider configurations
from features.agent_k.api.provider_routes import router as agent_k_provider_router
api_router.include_router(agent_k_provider_router)

# Agent K — RAG routes
from features.agent_k.api.rag_routes import router as agent_k_rag_router
api_router.include_router(agent_k_rag_router)

# Admin settings — Roles & Permissions + Marketplace
from features.routers.admin.settings import router as admin_settings_router
api_router.include_router(admin_settings_router)

# Admin imports — bulk-upload + categorization (Students / Alumni / Mentors)
from features.routers.admin.imports import router as admin_imports_router
api_router.include_router(admin_imports_router)
from features.routers.admin.colleges import router as admin_colleges_router
api_router.include_router(admin_colleges_router)

# Mentor Super Admin (MT1–MT14) — KPIs, taxonomy, approval workflow, session
# analytics, connections, alumni pipeline + autonomous agent suite surface
from features.mentor_admin import router as mentor_admin_router
api_router.include_router(mentor_admin_router)

# Refund management (PY1) — full/partial refunds via Stripe/Razorpay + ledger
from features.routers.admin.refunds import router as admin_refunds_router
api_router.include_router(admin_refunds_router)

# Revenue analytics (PY4) — trend / by-source / top events with period deltas
from features.routers.admin.revenue import router as admin_revenue_router
api_router.include_router(admin_revenue_router)

# Approval SLA tracking + audit trail (AP1 / AP4)
from features.routers.admin.approvals import router as admin_approvals_router
api_router.include_router(admin_approvals_router)

# Weekly platform health briefings (AI4)
from features.routers.admin.briefings import router as admin_briefings_router
api_router.include_router(admin_briefings_router)

# Settings changelog + rollback (ST2)
from features.routers.admin.settings_changelog import router as admin_settings_changelog_router
api_router.include_router(admin_settings_changelog_router)

# Talent Pool — searchable candidate profiles (LinkedIn, CSV, platform opt-in)
from features.talent_pool import router as talent_pool_router
api_router.include_router(talent_pool_router)

# CRUD endpoints — append-only mutations (book, RSVP, enroll, apply)
from crud_endpoints import router as crud_router
api_router.include_router(crud_router)

# Collaboration partners (Phase A) — public landing strip + admin CRUD
from features.routers.partners import router as partners_router
app.include_router(partners_router)

# Phase B — consent (privacy/cookies) + product tour status
from features.routers.consent import router as consent_router
from features.routers.tour import router as tour_router
app.include_router(consent_router)
app.include_router(tour_router)

# Phase C — promotional banners (cross-portal)
from features.routers.promotions import router as promotions_router
app.include_router(promotions_router)

from features.routers.auth import router as auth_router
api_router.include_router(auth_router)

from features.routers.users import router as users_router
api_router.include_router(users_router)

# Career AI — skill intelligence, roadmaps, simulator, predictions, suggestions
from features.routers.career_ai import router as career_ai_router
api_router.include_router(career_ai_router)

# Certificates & SA ID Verification
from features.routers.certificates import router as certificates_router
api_router.include_router(certificates_router)

# AI Platform Services — Platform RAG Semantic Search & Automated AI Agents
from features.routers.ai_platform_services import router as ai_platform_services_router
api_router.include_router(ai_platform_services_router)

# Autonomous Agent Ecosystem (MetaGPT Swarm, AutoGPT Autopilot, QA & Security Agents)
from features.routers.admin.agents import router as admin_agents_router
api_router.include_router(admin_agents_router)

# CodeHealthAgent Autonomous Auditor & Auto-Fix Router
from features.routers.code_health import router as code_health_router
api_router.include_router(code_health_router)

# PDF Document Generation & Download Router
from features.routers.pdf_routes import router as pdf_routes_router
api_router.include_router(pdf_routes_router)

# SuperAdmin Account Verticals & Background Verification (BGV) Router
from features.routers.bgv import router as bgv_router
api_router.include_router(bgv_router)

# BGV Free & Semi-Paid API Integrations Register Router
from features.routers.bgv_integrations import router as bgv_integrations_router
api_router.include_router(bgv_integrations_router)

# Blog & Community Routers
from features.routers.blog import router as blog_router
api_router.include_router(blog_router)

from features.routers.community import router as community_router
api_router.include_router(community_router)

# First-Party Careers & Opportunities Router (Dedicated, isolated from jobs_feed)
from features.routers.careers import router as careers_router
api_router.include_router(careers_router)

# Public website contact form (POST /api/contact) + admin contact analytics
from features.routers.public_contact import router as public_contact_router, admin_router as public_contact_admin_router
api_router.include_router(public_contact_router)
api_router.include_router(public_contact_admin_router)

# Public AXISS-ecosystem promo coupons (contact-form welcome codes)
from features.routers.coupons_public import router as coupons_public_router, admin_router as coupons_public_admin_router
api_router.include_router(coupons_public_router)
api_router.include_router(coupons_public_admin_router)

# Alumni Referrals (GET /api/jobs/{job_id}/alumni, /api/referrals, ...)
from features.routers.referrals import router as referrals_router
api_router.include_router(referrals_router)

app.include_router(api_router)



# ── CORS — origins configurable via env for production deployments ──
# Comma-separated list, e.g.
#   ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com"
# Use "*" only when allow_credentials is False; we coerce safely below.
_origins_env = (os.getenv("ALLOWED_ORIGINS") or os.getenv("FRONTEND_URL") or "http://localhost:8081,http://localhost:3000,http://127.0.0.1:8081").strip()
_origins_list = [o.strip() for o in _origins_env.split(",") if o.strip()]
_allow_creds = True

# Fail-fast: wildcard CORS is insecure in production
if os.getenv("ENV") == "production" and "*" in _origins_list:
    raise ValueError("CORS wildcard (*) is not allowed in production. Set ALLOWED_ORIGINS to specific domains.")

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=_allow_creds,
    allow_origins=_origins_list,
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX") or None,
    # Explicit method/header lists — "*" is overly permissive
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-Request-Id"],
)

# Security middleware — registers RequestId, SecurityHeaders, MongoSanitize
register_security_middleware(app)


# ── Health-check endpoints (used by Dokploy / Docker / load-balancers) ──
@app.get("/api/health")
@app.get("/health")
async def _health():
    """Lightweight liveness + Mongo connectivity probe."""
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False
    return {
        "status": "ok" if mongo_ok else "degraded",
        "service": "studentalumni-backend",
        "mongo": "ok" if mongo_ok else "down",
        "time": datetime.now(timezone.utc).isoformat(),
    }
