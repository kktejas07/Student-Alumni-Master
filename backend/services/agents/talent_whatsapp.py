"""
talent_whatsapp.py — TP30: WhatsApp Business Cloud API (Meta Graph) outreach
with OpenWA-gateway fallback and email last-resort.

Channel priority for `send_whatsapp`:
    1. Meta WhatsApp Cloud API — when credentials exist (installed_tools
       tool_id="whatsapp_cloud" {token, phone_number_id} or env
       WHATSAPP_CLOUD_TOKEN + WHATSAPP_CLOUD_PHONE_NUMBER_ID). Pre-approved
       templates only (Meta allows no free-form template sends).
    2. OpenWA gateway (core.whatsapp.send_wa_message) — supports free-form
       text; in unconfigured/dev environments it simulates and returns
       {"status": "sent", "mock": True}.
    3. Email fallback (core.email.send_email) — same content, plain text.

STOP opt-out: inbound replies whose body is "STOP"/"stop" flip
`talent_pool.whatsapp_opt_out = True` (the opt-out flag every outbound path
checks first). Outbound is skipped — not retried — for opted-out numbers.

Free tier: Meta allows ~250 free *service* conversations per month;
`usage_alert` counts outbound messages from whatsapp_message_log for the
calendar month and raises `alert: True` at >= 80% of the tier.

Collection: db.whatsapp_message_log
    {id, profile_id, phone, template, channel: "cloud"|"openwa"|"email_fallback",
     message_id, status: "queued"|"delivered"|"read"|"failed"|"replied",
     direction: "out"|"in", payload_excerpt, sent_at, delivered_at?, read_at?}

Webhook payload shapes the router should forward into `record_delivery` /
`record_reply` (Meta Graph messaging webhook):
    {"object": "whatsapp_business_account", "entry": [
        {"id": "...", "changes": [{"field": "messages", "value": {
            "messaging_product": "whatsapp", "from": "919812000000",
            "to": "<phone_number_id>", "messages": [
                {"id": "wamid.HBg...", "from": "919812000000",
                 "timestamp": "1729401600", "type": "text",
                 "text": {"body": "..."},
                 "status": "delivered"|"read"|None}
            ]}}]}]}
Delivered/read status events share the same shape with `status` set on the
message. Inbound user messages have no `status` and `to` is our own
phone_number_id (that's how record_reply recognises them).
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from services.agents.talent_common import agent_run_log, log_activity, now_utc

_WA_GRAPH_VERSION = "v20.0"
WABA_FREE_TIER_CONVERSATIONS = 250
_USAGE_ALERT_PCT = 80

# Pre-approved templates. Each body may use {{1}} {{2}} {{3}} variables.
_WHATSAPP_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "introduction": {
        "name": "talent_intro",
        "lang": "en_IN",
        "body": (
            "Hi {{1}}, this is the Student-Alumni Masters team. We're reviewing "
            "your profile for the {{2}} opening and would love to learn more about "
            "your work. Reply to continue, or reply STOP to opt out."
        ),
        "variables": ["name", "opening"],
    },
    "interview_invite": {
        "name": "interview_invite",
        "lang": "en_IN",
        "body": (
            "Hi {{1}}, thanks for your interest. Your interview is scheduled for "
            "{{2}}. Join via: {{3}}. Reply STOP to opt out."
        ),
        "variables": ["name", "datetime", "link"],
    },
    "follow_up": {
        "name": "talent_follow_up",
        "lang": "en_IN",
        "body": (
            "Hi {{1}}, a quick update on your application: {{2}}. We'll keep this "
            "thread updated. Reply STOP to opt out."
        ),
        "variables": ["name", "next_steps"],
    },
}


def _utc(s: Optional[str]) -> Optional[datetime]:
    try:
        return datetime.fromtimestamp(int(s), tz=timezone.utc)
    except Exception:
        return None


def _log_doc(db, *, profile_id: str, phone: str, template: str, channel: str,
              message_id: str, status: str, direction: str,
              payload_excerpt: str, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    doc: Dict[str, Any] = {
        "id": f"wml_{uuid.uuid4().hex[:12]}",
        "profile_id": profile_id,
        "phone": phone,
        "template": template,
        "channel": channel,
        "message_id": message_id,
        "status": status,
        "direction": direction,
        "payload_excerpt": payload_excerpt[:400],
        "sent_at": now_utc(),
    }
    if extra:
        doc.update(extra)
    return doc


async def _get_cloud_creds(db) -> Dict[str, Any]:
    """Meta Cloud API creds from installed_tools, else env. {} when unconfigured."""
    doc = await db.installed_tools.find_one({"tool_id": "whatsapp_cloud", "status": "connected"})
    if doc and (doc.get("credentials") or {}).get("token"):
        return {"token": doc["credentials"]["token"],
                "phone_number_id": doc["credentials"].get("phone_number_id")}
    token = os.getenv("WHATSAPP_CLOUD_TOKEN")
    waba = os.getenv("WHATSAPP_CLOUD_PHONE_NUMBER_ID")
    if token and waba:
        return {"token": token, "phone_number_id": waba}
    return {}


def _profile_phone(profile: Dict[str, Any]) -> Optional[str]:
    """Best available phone for the profile (raw digits, country-code-agnostic)."""
    p = profile.get("phone") or profile.get("whatsapp_phone") or profile.get("mobile")
    if not p:
        return None
    return str(p)


async def _find_profile(db, profile_id: str) -> Optional[Dict[str, Any]]:
    p = await db.talent_pool.find_one({"id": profile_id})
    if not p and profile_id and profile_id == str(profile_id):
        from bson import ObjectId, InvalidId
        try:
            p = await db.talent_pool.find_one({"_id": ObjectId(profile_id)})
        except (InvalidId, TypeError, ValueError):
            p = None
    return p


async def _send_cloud(profile_id: str, phone: str, template_key: str, variables: Dict[str, str]) -> Dict[str, Any]:
    """POST to the Meta Graph messaging endpoint. Returns a normalized result dict.

    On 200/202 returns {"ok": True, "message_id", "status": "queued"}.
    Any exception/4xx/5xx returns {"ok": False, "error"} — never raises.
    """
    creds = await _get_cloud_creds(_db_holder["db"])
    token, waba = creds.get("token"), creds.get("phone_number_id")
    if not (token and waba):
        return {"ok": False, "error": "cloud api unconfigured"}
    t = _WHATSAPP_TEMPLATES[template_key]
    components: List[Dict[str, Any]] = []
    body_params = []
    for i, key in enumerate(t["variables"], start=1):
        body_params.append({"type": "text", "text": str(variables.get(key, key))[:120]})
    if body_params:
        components.append({"type": "body", "parameters": body_params})
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {"name": t["name"], "language": {"code": t["lang"]},
                     "components": components or [{"type": "body", "parameters": body_params}]},
    }
    url = f"https://graph.facebook.com/{_WA_GRAPH_VERSION}/{waba}/messages"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
    if r.status_code in (200, 202):
        data = r.json()
        mid = (((data.get("messages") or [{}])[0]).get("id")) or str(uuid.uuid4())
        return {"ok": True, "message_id": mid, "status": "queued"}
    return {"ok": False, "error": f"graph {r.status_code}: {str(r.text)[:300]}"}


_db_holder: Dict[str, Any] = {"db": None}  # module-level, set per call (see send_whatsapp)


async def send_whatsapp(db, profile_id: str, template: str, variables: Dict[str, str], actor: str = "system") -> Dict[str, Any]:
    """Send a template to a candidate. Never raises.

    Returns {"channel": "cloud"|"openwa"|"email_fallback"|"skipped",
             "status": "sent"|"queued"|"failed"|"skipped",
             "message_id": str|None, "reason": str|None}
    """
    _db_holder["db"] = db
    t0 = now_utc()
    result: Dict[str, Any] = {"channel": "skipped", "status": "skipped", "message_id": None, "reason": None}

    if template not in _WHATSAPP_TEMPLATES:
        result.update(reason=f"unknown template '{template}' (valid: {list(_WHATSAPP_TEMPLATES)})")
        await agent_run_log(db, "whatsapp_cloud", f"send:{template}", status="FAILED",
                            detail=result, error=result["reason"])
        return result

    p = await _find_profile(db, profile_id)
    if not p:
        result.update(reason="profile not found")
        await agent_run_log(db, "whatsapp_cloud", f"send:{template}", status="FAILED",
                            detail=result, error=result["reason"])
        return result

    if p.get("whatsapp_opt_out") is True:
        result.update(reason="whatsapp opt-out set on profile")
        await log_activity(db, actor, "WhatsApp", object_id=profile_id,
                           summary=f"{template} send skipped — candidate opted out")
        await agent_run_log(db, "whatsapp_cloud", f"send:{template}", status="SKIPPED",
                            detail={"profile_id": profile_id, "reason": result["reason"]})
        return result

    phone = _profile_phone(p)
    profile_id = str(p.get("id") or p["_id"])
    text_preview = _WHATSAPP_TEMPLATES[template]["body"]
    for i, key in enumerate(_WHATSAPP_TEMPLATES[template]["variables"], start=1):
        text_preview = text_preview.replace("{{%d}}" % i, str(variables.get(key, key)))

    # 1 — Meta Cloud API (template, pre-approved only)
    cloud = await _send_cloud(profile_id, phone or "", template, variables)
    if cloud["ok"] and phone:
        result = {"channel": "cloud", "status": "queued", "message_id": cloud["message_id"], "reason": None}
        doc = _log_doc(db, profile_id=profile_id, phone=phone, template=template,
                       channel="cloud", message_id=cloud["message_id"],
                       status="queued", direction="out", payload_excerpt=text_preview)
        await db.whatsapp_message_log.insert_one(doc)
        await log_activity(db, actor, "WhatsApp", object_id=profile_id,
                           summary=f"WhatsApp template '{template}' sent via Cloud API")
        await agent_run_log(db, "whatsapp_cloud", f"send:{template}", status="SUCCESS",
                            detail={"profile_id": profile_id, "channel": "cloud"},
                            duration_ms=int((now_utc() - t0).total_seconds() * 1000))
        return result

    # 2 — OpenWA gateway (free-form; simulates when no gateway is bound)
    if phone:
        from core.whatsapp import normalize_phone, strip_phone, send_wa_message
        normalized = normalize_phone(phone) or phone
        wa = await send_wa_message(phone=strip_phone(normalized), text=text_preview,
                                   kind="outreach", reg_id=profile_id, opt_in=True)
        if wa.get("status") == "sent":
            mock = wa.get("mock") is True
            result = {"channel": "openwa", "status": "sent", "message_id": wa.get("id") or f"openwa_{uuid.uuid4().hex[:10]}",
                      "reason": "mock_gateway" if mock else None}
            doc = _log_doc(db, profile_id=profile_id, phone=phone, template=template,
                           channel="openwa", message_id=result["message_id"],
                           status="delivered" if mock else "sent", direction="out",
                           payload_excerpt=text_preview, extra={"mock": mock} if mock else {})
            await db.whatsapp_message_log.insert_one(doc)
            await log_activity(db, actor, "WhatsApp", object_id=profile_id,
                               summary=f"WhatsApp template '{template}' sent via OpenWA gateway")
            await agent_run_log(db, "whatsapp_cloud", f"send:{template}", status="SUCCESS",
                                detail={"profile_id": profile_id, "channel": "openwa", "mock": mock},
                                duration_ms=int((now_utc() - t0).total_seconds() * 1000))
            return result

    # 3 — Email fallback (same content, plain)
    email = p.get("email")
    if email:
        from core.email import send_email
        subject = f"[{template.replace('_', ' ').title()} — Student-Alumni Masters]"
        body_html = (
            f"<p>{text_preview}</p>"
            "<p style='color:#666;font-size:12px'>Sent by the Talent Pool outreach agent. "
            "To stop outreach, reply STOP or ask us to mark you opted out.</p>"
        )
        ok = await send_email(email, subject, body_html)
        if ok:
            result = {"channel": "email_fallback", "status": "sent",
                     "message_id": f"email_{uuid.uuid4().hex[:10]}", "reason": None}
            doc = _log_doc(db, profile_id=profile_id, phone=phone or "", template=template,
                           channel="email_fallback", message_id=result["message_id"],
                           status="sent", direction="out", payload_excerpt=text_preview,
                           extra={"to_email": email})
            await db.whatsapp_message_log.insert_one(doc)
            await log_activity(db, actor, "WhatsApp", object_id=profile_id,
                               summary=f"WhatsApp '{template}' fell back to email ({email})")
        else:
            result = {"channel": "email_fallback", "status": "failed", "message_id": None,
                     "reason": "no delivery channel succeeded (no phone for WA / email send failed)"}
    else:
        result["reason"] = "no phone or email on profile — no delivery channel available"

    if result["status"] in ("failed", "skipped"):
        doc = _log_doc(db, profile_id=profile_id, phone=phone or "", template=template,
                       channel=result["channel"], message_id=result["message_id"] or "",
                       status="failed", direction="out", payload_excerpt=text_preview,
                       extra={"failure_reason": result["reason"]})
        await db.whatsapp_message_log.insert_one(doc)
        await log_activity(db, actor, "WhatsApp", object_id=profile_id,
                           summary=f"WhatsApp '{template}' FAILED: {result['reason']}")

    await agent_run_log(db, "whatsapp_cloud", f"send:{template}",
                        status="FAILED" if result["status"] == "failed" else "SKIPPED",
                        detail={"profile_id": profile_id, **result},
                        error=result["reason"],
                        duration_ms=int((now_utc() - t0).total_seconds() * 1000))
    return result


def _iter_messages(payload: Dict[str, Any]):
    """Yield (message, status_event) tuples from a Meta Graph webhook payload."""
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            for m in value.get("messages") or []:
                yield m, value


async def record_delivery(db, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Meta webhook `messaging` event: mark outbound messages delivered/read.

    Payload shape (subset we use):
        {"entry": [{"changes": [{"value": {"messages": [
            {"id": "wamid...", "from": "91...", "status": "delivered"|"read"}
        ]}}]}]}
    """
    updated = 0
    for m, _v in _iter_messages(payload):
        status = m.get("status")
        if status not in ("delivered", "read"):
            continue
        mid = m.get("id")
        q: Dict[str, Any] = {"direction": "out"}
        if mid:
            q["message_id"] = mid
        doc = await db.whatsapp_message_log.find_one(
            q, sort=[("sent_at", -1)])
        if not doc:
            continue
        patch: Dict[str, Any] = {"status": status}
        if status == "delivered":
            patch["delivered_at"] = now_utc()
        else:
            patch["read_at"] = now_utc()
        await db.whatsapp_message_log.update_one({"_id": doc["_id"]}, {"$set": patch})
        updated += 1
    if updated:
        await agent_run_log(db, "whatsapp_cloud", "record_delivery", status="SUCCESS",
                            detail={"updated": updated})
    return {"updated": updated}


async def record_reply(db, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Inbound user reply. Marks the last outbound message 'replied'; a STOP
    reply also sets the profile's whatsapp_opt_out flag.

    Inbound shape: {"entry": [{"changes": [{"value": {"from": "919812000000",
        "messages": [{"id": "wamid...", "type": "text", "text": {"body": "..."}}]}}]}]}
    """
    processed: List[Dict[str, Any]] = []
    for m, v in _iter_messages(payload):
        if m.get("status") in ("delivered", "read", "sent"):  # status events, not user replies
            continue
        body = ((m.get("text") or {}).get("body") or "").strip()
        sender = m.get("from") or v.get("from")
        stop = body.upper() in {"STOP", "stop"}
        last_out = await db.whatsapp_message_log.find_one(
            {"direction": "out", "phone": sender}, sort=[("sent_at", -1)])
        if last_out:
            await db.whatsapp_message_log.update_one(
                {"_id": last_out["_id"]}, {"$set": {"status": "replied"}})
        if stop and sender:
            # resolve the profile by raw phone digits (stored un-normalized)
            p = await db.talent_pool.find_one({"phone": sender}) or \
                await db.talent_pool.find_one({"whatsapp_phone": sender})
            if p:
                await db.talent_pool.update_one(
                    {"_id": p["_id"]},
                    {"$set": {"whatsapp_opt_out": True, "updated_at": now_utc()}})
                await log_activity(db, "candidate", "Outreach", object_id=str(p.get("id") or p["_id"]),
                                   summary="Inbound STOP reply — WhatsApp opt-out set")
            else:
                await db.whatsapp_opt_outs.update_one(
                    {"phone": sender}, {"$set": {"opted_out_at": now_utc()}}, upsert=True)
        processed.append({
            "from": sender,
            "message_id": m.get("id"),
            "body": body[:300],
            "stop": stop,
        })
    if processed:
        await agent_run_log(db, "whatsapp_cloud", "record_reply", status="SUCCESS",
                            detail={"replies": len(processed),
                                    "stops": sum(1 for x in processed if x["stop"])})
    return {"replies": processed}


async def usage_alert(db) -> Dict[str, Any]:
    """Outbound message count for the current calendar month vs the free tier."""
    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    used = await db.whatsapp_message_log.count_documents(
        {"direction": "out", "sent_at": {"$gte": month_start}})
    pct = min(100.0, round(used / WABA_FREE_TIER_CONVERSATIONS * 100, 1))
    return {
        "used": used,
        "free_tier": WABA_FREE_TIER_CONVERSATIONS,
        "pct": pct,
        "alert": pct >= _USAGE_ALERT_PCT,
        "window": {"from": month_start, "to": now},
    }


async def agent_status(db) -> Dict[str, Any]:
    """Dashboard 'Agents' card entry for TP30."""
    creds = await _get_cloud_creds(db)
    if creds.get("token"):
        status = "cloud"
    else:
        from core.whatsapp import get_openwa_status
        try:
            wa = await get_openwa_status()
            status = "openwa" if wa.get("connected") or wa.get("configured") else "unconfigured"
        except Exception:
            status = "unconfigured"
    usage = await usage_alert(db)
    entry = {
        "name": "TP30 WhatsApp",
        "group": "integrations",
        "priority": "P2",
        "status": status,
        "usage": usage,
        "est_cost_per_month": "Free tier (250 service conversations)",
    }
    return {"agent": entry, "agents": [entry]}


class WhatsAppAgent:
    """House singleton so the scheduler/router can hold one instance."""
    agent_id = "whatsapp_cloud"

    def __init__(self) -> None:
        self.db = None

    async def run(self, db, usage_only: bool = True) -> Dict[str, Any]:
        self.db = db
        _db_holder["db"] = db
        if usage_only:
            return await usage_alert(db)
        return await agent_status(db)


whatsapp_agent = WhatsAppAgent()
