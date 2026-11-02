"""Enhancement #5 — WhatsApp Lead Capture Bot.

Conversational lead collection via OpenWA. Walks users through a
multi-step form (name → email → age → city → domain → skills → consent)
and auto-submits the lead with scoring on completion.
"""
from __future__ import annotations

import re
import secrets
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from .database import leads_col, brands_col, consent_col
from .models import SUPPORTED_DOMAINS
from .scoring import compute_lead_score

logger = logging.getLogger(__name__)

STATES = ("greeting", "name", "email", "age", "city", "domain", "skills", "consent", "done")
SESSION_TTL = 30 * 60  # 30 minutes

# In-memory sessions keyed by phone number
wa_sessions: dict[str, dict[str, Any]] = {}

TOP_DOMAINS = SUPPORTED_DOMAINS[:10]
_DOMAIN_LIST_TEXT = "\n".join(f"  {i+1}. {d}" for i, d in enumerate(TOP_DOMAINS))
_ALL_DOMAINS_SET = {d.lower() for d in SUPPORTED_DOMAINS}

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _cleanup_stale_sessions() -> int:
    now = time.time()
    stale = [p for p, s in wa_sessions.items() if now - s.get("last_active", 0) > SESSION_TTL]
    for p in stale:
        del wa_sessions[p]
    return len(stale)


def _get_or_create_session(phone: str) -> dict[str, Any]:
    _cleanup_stale_sessions()
    if phone not in wa_sessions:
        wa_sessions[phone] = {
            "phone": phone,
            "state": "greeting",
            "data": {},
            "last_active": time.time(),
        }
    else:
        wa_sessions[phone]["last_active"] = time.time()
    return wa_sessions[phone]


async def handle_wa_message(phone: str, message: str, sender_name: str = "") -> str:
    """Process an inbound WhatsApp message and return the bot's reply."""
    text = message.strip()

    if text.upper() == "RESET":
        wa_sessions.pop(phone, None)
        return "Session reset. Send any message to start again!"

    session = _get_or_create_session(phone)
    state = session["state"]
    data = session["data"]

    if state == "greeting":
        session["state"] = "name"
        name_hint = f" Is it {sender_name}?" if sender_name else ""
        return (
            "Welcome to AXISS! I'll help you find the best student & alumni offers.\n\n"
            f"Let's get started. What's your full name?{name_hint}"
        )

    if state == "name":
        if len(text) < 2:
            return "Please enter your full name (at least 2 characters)."
        data["full_name"] = text.title()
        session["state"] = "email"
        return f"Thanks, {data['full_name']}! What's your email address?"

    if state == "email":
        if not _EMAIL_RE.match(text):
            return "That doesn't look like a valid email. Please try again (e.g. name@example.com)."
        data["email"] = text.lower()
        session["state"] = "age"
        return "Got it. How old are you?"

    if state == "age":
        if not text.isdigit() or not (15 <= int(text) <= 60):
            return "Please enter a valid age between 15 and 60."
        data["age"] = int(text)
        session["state"] = "city"
        return "Which city are you in?"

    if state == "city":
        if len(text) < 2:
            return "Please enter a valid city name."
        data["city"] = text.title()
        session["state"] = "domain"
        return (
            "What field are you interested in? Pick a number or type the name:\n\n"
            f"{_DOMAIN_LIST_TEXT}\n\n"
            "Or type any other domain name."
        )

    if state == "domain":
        chosen = text.lower()
        if text.isdigit():
            idx = int(text) - 1
            if 0 <= idx < len(TOP_DOMAINS):
                chosen = TOP_DOMAINS[idx].lower()
            else:
                return f"Please pick a number between 1 and {len(TOP_DOMAINS)}, or type a domain name."

        if chosen not in _ALL_DOMAINS_SET:
            return (
                f"'{text}' isn't a recognised domain. Pick from the list or type one of our "
                f"{len(SUPPORTED_DOMAINS)} supported domains. Send LIST to see all."
            )
        data["domain"] = chosen
        session["state"] = "skills"
        return "List your key skills, separated by commas (e.g. Python, React, Data Analysis):"

    if state == "skills":
        skills = [s.strip() for s in text.split(",") if s.strip()]
        if not skills:
            return "Please list at least one skill, separated by commas."
        data["skills"] = skills
        session["state"] = "consent"
        return (
            "Almost done! As per the DPDP Act 2023, we need your consent.\n\n"
            "Your data will be processed to match you with relevant student/alumni "
            "offers from verified brands. Data is retained for 180 days and you can "
            "withdraw consent anytime.\n\n"
            "Do you consent? Reply *YES* or *NO*."
        )

    if state == "consent":
        answer = text.upper()
        if answer in ("YES", "Y"):
            result = await submit_from_wa(session)
            session["state"] = "done"
            score = result.get("score", 0)
            temp = result.get("temperature", "cold")
            matches = result.get("matched_brands", 0)
            return (
                f"You're registered! Here's your summary:\n\n"
                f"Lead ID: {result.get('lead_id')}\n"
                f"Score: {score}/100 ({temp})\n"
                f"Matched brands: {matches}\n\n"
                f"We'll notify you when offers match your profile. "
                f"Type RESET anytime to update your info."
            )
        elif answer in ("NO", "N"):
            wa_sessions.pop(phone, None)
            return (
                "No problem — your data has not been stored. "
                "You can reach out anytime if you change your mind. Goodbye!"
            )
        else:
            return "Please reply *YES* or *NO*."

    if state == "done":
        if text.upper() == "LIST":
            return "Supported domains:\n" + "\n".join(f"  - {d}" for d in SUPPORTED_DOMAINS)
        return (
            "You've already registered! Type *RESET* to start a new registration, "
            "or *LIST* to see supported domains."
        )

    return "Something went wrong. Type RESET to start over."


async def submit_from_wa(session: dict) -> dict:
    """Build a lead doc from the WA session and insert it into the database."""
    data = session["data"]
    phone = session["phone"]
    lead_id = f"LA-{secrets.token_hex(8)}"
    now = datetime.now(timezone.utc)

    fields = ["full_name", "email", "phone", "age", "city", "domain", "skills"]
    filled = sum(1 for f in fields if data.get(f) or (f == "phone" and phone))
    completeness = round(filled / len(fields), 2)

    lead_doc = {
        "lead_id": lead_id,
        "full_name": data.get("full_name", ""),
        "email": data.get("email", ""),
        "phone": phone,
        "age": data.get("age"),
        "city": data.get("city", ""),
        "domain": data.get("domain", ""),
        "skills": data.get("skills", []),
        "interests": [],
        "education_level": None,
        "institution": None,
        "source_platform": "whatsapp",
        "phone_verified": False,
        "status": "new",
        "temperature": "cold",
        "score": 0,
        "score_breakdown": {},
        "matched_brands": [],
        "matched_offers": [],
        "profile_completeness": completeness,
        "created_at": now,
        "updated_at": now,
    }

    # Score against active brands
    best_score = 0
    best_breakdown: dict = {}
    best_temp = "cold"
    matched_brands: list[str] = []

    brands_cursor = brands_col.find({"status": "active"})
    async for brand in brands_cursor:
        score, breakdown, temp = compute_lead_score(lead_doc, brand)
        if score >= 25:
            matched_brands.append(brand["brand_id"])
        if score > best_score:
            best_score = score
            best_breakdown = breakdown
            best_temp = temp

    lead_doc["score"] = best_score
    lead_doc["score_breakdown"] = best_breakdown
    lead_doc["temperature"] = best_temp
    lead_doc["matched_brands"] = matched_brands

    await leads_col.insert_one(lead_doc)

    # DPDP consent record
    consent_id = f"CNS-{secrets.token_hex(8)}"
    await consent_col.insert_one({
        "consent_id": consent_id,
        "lead_id": lead_id,
        "phone": phone,
        "email": data.get("email"),
        "action": "grant",
        "purpose": "lead_processing",
        "platform": "whatsapp",
        "ip_address": "whatsapp",
        "user_agent": "whatsapp_bot",
        "retention_period": 180,
        "timestamp": now,
        "expires_at": now + timedelta(days=180),
    })

    return {
        "lead_id": lead_id,
        "score": best_score,
        "temperature": best_temp,
        "matched_brands": len(matched_brands),
    }


async def wa_webhook_handler(payload: dict) -> dict:
    """Handle incoming OpenWA webhook payload.

    Expected payload shape (OpenWA simple-api format):
    {
        "event": "onMessage",
        "data": {
            "from": "919876543210@c.us",
            "body": "Hello",
            "sender": {"pushname": "Krishna"},
            ...
        }
    }
    """
    event = payload.get("event", "")
    if event != "onMessage":
        return {"status": "ignored", "reason": f"event={event}"}

    data = payload.get("data", {})
    from_raw = data.get("from", "")
    body = data.get("body", "")
    sender_name = data.get("sender", {}).get("pushname", "")

    # Extract phone from "919876543210@c.us"
    phone = from_raw.split("@")[0] if "@" in from_raw else from_raw
    if not phone or not body:
        return {"status": "ignored", "reason": "empty phone or body"}

    # Normalize to +91 format
    if not phone.startswith("+"):
        phone = f"+{phone}"

    reply = await handle_wa_message(phone, body, sender_name)

    # Send reply via OpenWA
    try:
        from core.whatsapp import send_wa_message
        await send_wa_message(from_raw, reply)
    except Exception as e:
        logger.error("[WA-Bot] Failed to send reply to %s: %s", from_raw, e)

    return {"status": "ok", "phone": phone, "reply_length": len(reply)}
