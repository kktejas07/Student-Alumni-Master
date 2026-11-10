"""Enhancement #12 — Zapier/Make Webhook Templates & Integration Hub.

Pre-built integration recipes for connecting the Lead Aggregator
to external platforms (Zapier, Make, Slack, CRMs, Google Sheets).
"""
from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from db import db

logger = logging.getLogger(__name__)

integrations_col = db.la_integrations
integration_logs_col = db.la_integration_logs

LEAD_PAYLOAD_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "lead_id": {"type": "string"},
        "full_name": {"type": "string"},
        "email": {"type": "string", "format": "email"},
        "phone": {"type": "string"},
        "age": {"type": "integer"},
        "city": {"type": "string"},
        "domain": {"type": "string"},
        "score": {"type": "integer"},
        "temperature": {"type": "string", "enum": ["hot", "warm", "cold", "low"]},
        "skills": {"type": "array", "items": {"type": "string"}},
        "profile_completeness": {"type": "number"},
        "created_at": {"type": "string", "format": "date-time"},
    },
}

CLAIM_PAYLOAD_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "claim_id": {"type": "string"},
        "lead_id": {"type": "string"},
        "offer_id": {"type": "string"},
        "brand_id": {"type": "string"},
        "phone": {"type": "string"},
        "email": {"type": "string"},
        "claimed_at": {"type": "string", "format": "date-time"},
    },
}

_SAMPLE_LEAD = {
    "lead_id": "LEAD-a1b2c3d4e5f6g7h8",
    "full_name": "Priya Sharma",
    "email": "priya.sharma@example.com",
    "phone": "+919876543210",
    "age": 22,
    "city": "Hyderabad",
    "domain": "technology",
    "score": 82,
    "temperature": "hot",
    "skills": ["python", "react", "machine-learning"],
    "profile_completeness": 0.89,
    "created_at": "2026-10-31T10:30:00Z",
}

_SAMPLE_CLAIM = {
    "claim_id": "CLM-a1b2c3d4e5f6g7h8",
    "lead_id": "LEAD-a1b2c3d4e5f6g7h8",
    "offer_id": "OFR-x1y2z3w4v5u6t7s8",
    "brand_id": "BRD-m1n2o3p4q5r6s7t8",
    "phone": "+919876543210",
    "email": "priya.sharma@example.com",
    "claimed_at": "2026-10-31T11:00:00Z",
}

INTEGRATION_TEMPLATES: dict[str, dict[str, Any]] = {
    "zapier_new_lead": {
        "name": "Zapier — New Lead",
        "description": "Triggers a Zapier Zap whenever a new lead is submitted. Use with any of Zapier's 6000+ app integrations.",
        "trigger_event": "new_lead",
        "payload_schema": LEAD_PAYLOAD_SCHEMA,
        "setup_instructions": (
            "1. Create a new Zap in Zapier.\n"
            "2. Choose 'Webhooks by Zapier' as the trigger, select 'Catch Hook'.\n"
            "3. Copy the webhook URL Zapier gives you.\n"
            "4. Paste it into the webhook_url field when setting up this integration.\n"
            "5. Send a test event from AXISS to verify Zapier receives it.\n"
            "6. Add your desired action steps in Zapier (e.g. Google Sheets, email, CRM)."
        ),
        "sample_payload": _SAMPLE_LEAD,
    },
    "zapier_hot_lead": {
        "name": "Zapier — Hot Leads Only",
        "description": "Triggers only for leads scored 70+ (hot temperature). Ideal for high-priority follow-up automations.",
        "trigger_event": "new_lead",
        "filter": {"temperature": "hot"},
        "payload_schema": LEAD_PAYLOAD_SCHEMA,
        "setup_instructions": (
            "1. Create a new Zap in Zapier with 'Webhooks by Zapier' → 'Catch Hook'.\n"
            "2. Copy the webhook URL and paste it here.\n"
            "3. This integration only fires for leads with temperature = 'hot' (score ≥ 70).\n"
            "4. Add action steps like sending an urgent Slack message or creating a CRM task."
        ),
        "sample_payload": _SAMPLE_LEAD,
    },
    "zapier_claim": {
        "name": "Zapier — Offer Claimed",
        "description": "Triggers when a lead claims an offer. Track redemptions in your CRM or spreadsheet.",
        "trigger_event": "offer_claimed",
        "payload_schema": CLAIM_PAYLOAD_SCHEMA,
        "setup_instructions": (
            "1. Create a new Zap with 'Webhooks by Zapier' → 'Catch Hook'.\n"
            "2. Copy the webhook URL and paste it here.\n"
            "3. This fires each time any lead claims one of your offers.\n"
            "4. Use it to update your CRM pipeline stage, send a confirmation email, or log to sheets."
        ),
        "sample_payload": _SAMPLE_CLAIM,
    },
    "make_google_sheets": {
        "name": "Make.com — Google Sheets",
        "description": "Push new leads directly to a Google Sheet via Make.com (formerly Integromat).",
        "trigger_event": "new_lead",
        "payload_schema": LEAD_PAYLOAD_SCHEMA,
        "setup_instructions": (
            "1. Create a new Scenario in Make.com.\n"
            "2. Add a 'Webhooks' module → 'Custom webhook'. Copy the URL.\n"
            "3. Add a 'Google Sheets' module → 'Add a Row'.\n"
            "4. Map the lead fields (name, email, phone, city, score, temperature) to sheet columns.\n"
            "5. Paste the Make.com webhook URL here.\n"
            "6. Activate the scenario and send a test event."
        ),
        "sample_payload": _SAMPLE_LEAD,
    },
    "make_hubspot": {
        "name": "Make.com — HubSpot CRM",
        "description": "Auto-create HubSpot contacts from new leads via Make.com.",
        "trigger_event": "new_lead",
        "payload_schema": LEAD_PAYLOAD_SCHEMA,
        "setup_instructions": (
            "1. Create a Make.com Scenario.\n"
            "2. Add a 'Webhooks' module → 'Custom webhook'. Copy the URL.\n"
            "3. Add a 'HubSpot CRM' module → 'Create a Contact'.\n"
            "4. Map: full_name → First/Last Name, email → Email, phone → Phone, city → City.\n"
            "5. Optionally add a Router to handle hot leads differently (create a Deal).\n"
            "6. Paste the webhook URL here and send a test."
        ),
        "sample_payload": _SAMPLE_LEAD,
    },
    "slack_notification": {
        "name": "Slack — Lead Alerts",
        "description": "Post real-time lead notifications to a Slack channel using Incoming Webhooks.",
        "trigger_event": "new_lead",
        "payload_schema": LEAD_PAYLOAD_SCHEMA,
        "payload_transform": "slack",
        "setup_instructions": (
            "1. Go to your Slack workspace → Apps → Incoming Webhooks.\n"
            "2. Add a new webhook and select the target channel.\n"
            "3. Copy the webhook URL (starts with https://hooks.slack.com/...).\n"
            "4. Paste it here. Leads will appear as formatted Slack messages.\n"
            "5. Hot leads are marked with 🔥, warm with ⚡, cold with ❄️."
        ),
        "sample_payload": {
            "text": "New Lead: Priya Sharma",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🔥 *New Hot Lead*\n*Name:* Priya Sharma\n*Score:* 82 | *City:* Hyderabad\n*Domain:* technology\n*Skills:* python, react, machine-learning",
                    },
                }
            ],
        },
    },
    "google_sheets_direct": {
        "name": "Google Sheets — Direct API",
        "description": "Append lead rows directly to a Google Sheet via the Sheets API (requires service account).",
        "trigger_event": "new_lead",
        "payload_schema": LEAD_PAYLOAD_SCHEMA,
        "setup_instructions": (
            "1. Create a Google Cloud service account with Sheets API access.\n"
            "2. Share your target spreadsheet with the service account email.\n"
            "3. Provide the spreadsheet ID and sheet name in the config.\n"
            "4. Paste the service account JSON key as auth_header.\n"
            "5. Leads will be appended as new rows with columns matching the payload schema."
        ),
        "sample_payload": _SAMPLE_LEAD,
    },
    "crm_generic": {
        "name": "Generic CRM Webhook",
        "description": "Send lead data to any CRM that accepts webhook/REST callbacks (Salesforce, Zoho, Pipedrive, Freshsales, etc.).",
        "trigger_event": "new_lead",
        "payload_schema": LEAD_PAYLOAD_SCHEMA,
        "setup_instructions": (
            "1. In your CRM, set up a webhook receiver or REST endpoint for new contacts/leads.\n"
            "2. Copy the endpoint URL.\n"
            "3. If auth is required, provide the API key or Bearer token in auth_header.\n"
            "4. Use custom_fields to map AXISS fields to your CRM's expected field names.\n"
            "   Example: {\"full_name\": \"contact_name\", \"phone\": \"mobile\", \"city\": \"location\"}\n"
            "5. Paste the URL here and send a test."
        ),
        "sample_payload": _SAMPLE_LEAD,
    },
}


def list_integrations() -> list[dict]:
    return [
        {
            "template_id": tid,
            "name": t["name"],
            "description": t["description"],
            "trigger_event": t["trigger_event"],
        }
        for tid, t in INTEGRATION_TEMPLATES.items()
    ]


def get_integration(template_id: str) -> dict:
    template = INTEGRATION_TEMPLATES.get(template_id)
    if not template:
        return {"status": "error", "message": f"Template '{template_id}' not found"}
    return {"template_id": template_id, **template}


async def setup_integration(brand_id: str, template_id: str, config: dict) -> dict:
    template = INTEGRATION_TEMPLATES.get(template_id)
    if not template:
        return {"status": "error", "message": f"Template '{template_id}' not found"}

    webhook_url = config.get("webhook_url")
    if not webhook_url:
        return {"status": "error", "message": "webhook_url is required"}

    integration_id = f"INT-{secrets.token_hex(8)}"
    now = datetime.now(timezone.utc)

    doc = {
        "integration_id": integration_id,
        "brand_id": brand_id,
        "template_id": template_id,
        "name": template["name"],
        "trigger_event": template["trigger_event"],
        "filter": template.get("filter"),
        "payload_transform": template.get("payload_transform"),
        "webhook_url": webhook_url,
        "auth_header": config.get("auth_header"),
        "custom_fields": config.get("custom_fields", {}),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_fired_at": None,
        "fire_count": 0,
        "error_count": 0,
    }

    await integrations_col.insert_one(doc)

    return {
        "status": "ok",
        "integration_id": integration_id,
        "template": template_id,
        "trigger_event": template["trigger_event"],
        "message": f"Integration '{template['name']}' configured. Send a test to verify.",
    }


async def test_integration(brand_id: str, integration_id: str) -> dict:
    integration = await integrations_col.find_one(
        {"integration_id": integration_id, "brand_id": brand_id}
    )
    if not integration:
        return {"status": "error", "message": "Integration not found"}

    template = INTEGRATION_TEMPLATES.get(integration["template_id"], {})
    sample = template.get("sample_payload", _SAMPLE_LEAD)
    payload = _transform_payload(sample, integration)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            headers = {"Content-Type": "application/json"}
            if integration.get("auth_header"):
                headers["Authorization"] = integration["auth_header"]

            resp = await client.post(
                integration["webhook_url"],
                json=payload,
                headers=headers,
            )

        success = 200 <= resp.status_code < 300
        await _log_delivery(integration, payload, resp.status_code, resp.text[:500], success)

        return {
            "status": "ok" if success else "failed",
            "integration_id": integration_id,
            "http_status": resp.status_code,
            "response_preview": resp.text[:200],
            "test": True,
        }
    except Exception as e:
        await _log_delivery(integration, payload, 0, str(e), False)
        return {"status": "error", "message": str(e)}


async def list_brand_integrations(brand_id: str) -> list:
    cursor = integrations_col.find(
        {"brand_id": brand_id}, {"_id": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(length=100)


async def fire_integration_event(brand_id: str, event: str, data: dict) -> None:
    cursor = integrations_col.find({
        "brand_id": brand_id,
        "trigger_event": event,
        "is_active": True,
    })

    async for integration in cursor:
        event_filter = integration.get("filter")
        if event_filter and not _matches_filter(data, event_filter):
            continue

        payload = _transform_payload(data, integration)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                headers = {"Content-Type": "application/json"}
                if integration.get("auth_header"):
                    headers["Authorization"] = integration["auth_header"]

                resp = await client.post(
                    integration["webhook_url"],
                    json=payload,
                    headers=headers,
                )

            success = 200 <= resp.status_code < 300
            await _log_delivery(integration, payload, resp.status_code, resp.text[:500], success)

            update: dict[str, Any] = {
                "last_fired_at": datetime.now(timezone.utc),
            }
            inc: dict[str, int] = {"fire_count": 1}
            if not success:
                inc["error_count"] = 1

            await integrations_col.update_one(
                {"integration_id": integration["integration_id"]},
                {"$set": update, "$inc": inc},
            )

        except Exception as e:
            logger.warning(
                "[Integration] Failed %s for brand %s: %s",
                integration["integration_id"], brand_id, e,
            )
            await _log_delivery(integration, payload, 0, str(e), False)
            await integrations_col.update_one(
                {"integration_id": integration["integration_id"]},
                {"$inc": {"error_count": 1}},
            )


async def integration_logs(brand_id: str, limit: int = 50) -> list:
    cursor = integration_logs_col.find(
        {"brand_id": brand_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def toggle_integration(integration_id: str, active: bool) -> dict:
    result = await integrations_col.update_one(
        {"integration_id": integration_id},
        {"$set": {"is_active": active, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        return {"status": "error", "message": "Integration not found"}
    return {"status": "ok", "integration_id": integration_id, "is_active": active}


async def delete_integration(integration_id: str) -> dict:
    result = await integrations_col.delete_one({"integration_id": integration_id})
    if result.deleted_count == 0:
        return {"status": "error", "message": "Integration not found"}
    return {"status": "ok", "deleted": integration_id}


def _matches_filter(data: dict, event_filter: dict) -> bool:
    for key, expected in event_filter.items():
        if data.get(key) != expected:
            return False
    return True


def _transform_payload(data: dict, integration: dict) -> dict:
    transform = integration.get("payload_transform")

    if transform == "slack":
        return _to_slack_payload(data)

    custom_fields = integration.get("custom_fields", {})
    if custom_fields:
        mapped: dict[str, Any] = {}
        for src_field, dst_field in custom_fields.items():
            if src_field in data:
                mapped[dst_field] = data[src_field]
        for k, v in data.items():
            if k not in custom_fields:
                mapped[k] = v
        return mapped

    return data


def _to_slack_payload(data: dict) -> dict:
    temp = data.get("temperature", "cold")
    icon = {"hot": "\U0001f525", "warm": "⚡", "cold": "❄️", "low": "⏰"}.get(temp, "")
    name = data.get("full_name", "Unknown")
    score = data.get("score", 0)
    city = data.get("city", "N/A")
    domain = data.get("domain", "N/A")
    skills = ", ".join(data.get("skills", [])) or "N/A"

    return {
        "text": f"New Lead: {name}",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"{icon} *New {temp.title()} Lead*\n"
                        f"*Name:* {name}\n"
                        f"*Score:* {score} | *City:* {city}\n"
                        f"*Domain:* {domain}\n"
                        f"*Skills:* {skills}"
                    ),
                },
            }
        ],
    }


async def _log_delivery(
    integration: dict, payload: dict, status_code: int, response: str, success: bool
) -> None:
    await integration_logs_col.insert_one({
        "log_id": f"ILOG-{secrets.token_hex(6)}",
        "integration_id": integration["integration_id"],
        "brand_id": integration["brand_id"],
        "trigger_event": integration["trigger_event"],
        "webhook_url": integration["webhook_url"],
        "payload_size": len(json.dumps(payload)),
        "http_status": status_code,
        "response_preview": response[:500],
        "success": success,
        "timestamp": datetime.now(timezone.utc),
    })
