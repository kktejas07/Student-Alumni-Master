"""
OpenWA WhatsApp Gateway
========================
Sends WhatsApp messages (text, documents, images) via a self-hosted OpenWA
gateway (https://github.com/rmyndharis/OpenWA). OpenWA is a free, open-source
REST wrapper around the WhatsApp Web protocol (Baileys) — QR-pair a dedicated
number, then call its HTTP API from this backend.

Config sources (priority order):
  1. `installed_tools` → tool_id="openwa" with status connected (superadmin UI)
  2. Environment variables: OPENWA_BASE_URL, OPENWA_API_KEY, OPENWA_SESSION_ID,
     OPENWA_DEFAULT_COUNTRY_CODE

Sending is always best-effort and non-blocking to the caller:
  • Missing/blank phone or opt-out  → skipped
  • Gateway unreachable / 4xx-5xx   → recorded in `whatsapp_failures`
  • Every attempt is logged in `whatsapp_sends`

WhatsApp Web number format: <country><national>@c.us (no +, no spaces).
"""
from __future__ import annotations
import os
import re
import asyncio
import base64
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from core.db import db


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
async def get_openwa_config() -> Optional[Dict[str, Any]]:
    """Resolve OpenWA connection settings from installed_tools, then env fallback."""
    try:
        config = await db.installed_tools.find_one({
            "tool_id": "openwa",
            "status": {"$in": ["connected", "mock_connected"]},
        })
        if config:
            creds = config.get("credentials") or config.get("config") or {}
            base_url = (creds.get("base_url") or "").strip().rstrip("/")
            api_key = (creds.get("api_key") or "").strip()
            session_id = (creds.get("session_id") or "").strip()
            country = (creds.get("default_country_code") or "").strip() or "91"
            if base_url and api_key and session_id:
                return {
                    "base_url": base_url,
                    "api_key": api_key,
                    "session_id": session_id,
                    "default_country_code": country,
                }
    except Exception:
        pass

    base_url = (os.environ.get("OPENWA_BASE_URL") or "").strip().rstrip("/")
    api_key = (os.environ.get("OPENWA_API_KEY") or "").strip()
    session_id = (os.environ.get("OPENWA_SESSION_ID") or "").strip()
    if base_url and api_key and session_id:
        return {
            "base_url": base_url,
            "api_key": api_key,
            "session_id": session_id,
            "default_country_code": (os.environ.get("OPENWA_DEFAULT_COUNTRY_CODE") or "").strip() or "91",
        }
    return None


# ---------------------------------------------------------------------------
# Phone helpers
# ---------------------------------------------------------------------------
def normalize_phone(phone: str, default_country: str = "91") -> Optional[str]:
    """Convert a raw phone string to OpenWA chatId (`<cc><national>@c.us`).

    Accepts formats like `+91 98765 43210`, `9876543210`, `+919876543210`,
    `0091 98765 43210`. If no country code is present, `default_country` is
    prepended. Returns None for blank/invalid input.
    """
    if not phone:
        return None
    digits = re.sub(r"\D", "", str(phone))
    # Strip a leading international dialing prefix (00)
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) < 7 or len(digits) > 15:
        return None
    # If it already carries a country code (starts with default_country and is
    # longer than a national number), keep as-is.
    if digits.startswith(default_country) and len(digits) > len(default_country) + 6:
        full = digits
    else:
        full = f"{default_country}{digits}"
    return f"{full}@c.us"


def strip_phone(phone: str) -> str:
    """Best-effort E.164-ish digits for logging (never sent)."""
    return re.sub(r"\D", "", str(phone or ""))


# ---------------------------------------------------------------------------
# Rate limiting — keep delivery under WhatsApp's informal rate caps.
# ---------------------------------------------------------------------------
_wa_semaphore: Optional[asyncio.Semaphore] = None


def _get_semaphore() -> asyncio.Semaphore:
    global _wa_semaphore
    if _wa_semaphore is None:
        _wa_semaphore = asyncio.Semaphore(int(os.environ.get("OPENWA_MAX_CONCURRENCY", "3")))
    return _wa_semaphore


async def _rate_limited_call(fn):
    """Run a gateway call inside the concurrency semaphore with a small inter-call delay."""
    sem = _get_semaphore()
    async with sem:
        delay = float(os.environ.get("OPENWA_SEND_DELAY_MS", "400")) / 1000.0
        if delay > 0:
            await asyncio.sleep(delay)
        return await fn()


# ---------------------------------------------------------------------------
# Raw gateway calls
# ---------------------------------------------------------------------------
async def _gateway_post(config: Dict[str, Any], path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{config['base_url']}/api/sessions/{config['session_id']}/messages/{path}"
    headers = {"X-API-Key": config["api_key"], "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.is_success:
            try:
                return {"ok": True, "response": r.json()}
            except Exception:
                return {"ok": True, "response": r.text}
        return {"ok": False, "http": r.status_code, "error": r.text[:500]}


async def send_whatsapp_text(config: Dict[str, Any], chat_id: str, text: str) -> Dict[str, Any]:
    """Send a plain text message (max 4096 chars)."""
    return await _rate_limited_call(
        lambda: _gateway_post(config, "send-text", {"chatId": chat_id, "text": text[:4096]})
    )


async def send_whatsapp_document(config: Dict[str, Any], chat_id: str, filename: str, content: bytes, caption: str = "") -> Dict[str, Any]:
    """Send a file (PDF/image) as a WhatsApp document. `content` is raw bytes."""
    payload: Dict[str, Any] = {
        "chatId": chat_id,
        "filename": filename,
        "file": base64.b64encode(content).decode(),
        "caption": caption[:1000],
    }
    return await _rate_limited_call(
        lambda: _gateway_post(config, "send-document", payload)
    )


# ---------------------------------------------------------------------------
# High-level best-effort API used by the rest of the app
# ---------------------------------------------------------------------------
async def _log_send(phone_digits: str, kind: str, ok: bool, detail: str = "", reg_id: str = ""):
    try:
        await db.whatsapp_sends.insert_one({
            "phone": phone_digits,
            "kind": kind,
            "ok": ok,
            "detail": detail[:500],
            "reg_id": reg_id,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def _log_failure(phone_digits: str, kind: str, reason: str):
    try:
        await db.whatsapp_failures.insert_one({
            "phone": phone_digits,
            "kind": kind,
            "reason": reason[:500],
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def send_wa_message(*, phone: str, text: str, kind: str = "text", reg_id: str = "", opt_in: bool = True) -> Dict[str, Any]:
    """Best-effort WhatsApp text send. Never raises; returns a status dict.

    - phone: raw attendee phone (any format)
    - opt_in: attendee/consent gate (default True)
    - kind: logical category for logging (registration|invoice|reminder|coupon|newsletter)
    """
    phone_digits = strip_phone(phone)
    if not phone_digits:
        return {"status": "skipped", "reason": "no_phone"}
    if not opt_in:
        return {"status": "skipped", "reason": "opt_out"}

    config = await get_openwa_config()
    if not config:
        await _log_failure(phone_digits, kind, "OpenWA not configured")
        return {"status": "skipped", "reason": "not_configured"}

    chat_id = normalize_phone(phone, config.get("default_country_code", "91"))
    if not chat_id:
        await _log_failure(phone_digits, kind, "invalid phone")
        return {"status": "skipped", "reason": "invalid_phone"}

    try:
        result = await send_whatsapp_text(config, chat_id, text)
        if result.get("ok"):
            await _log_send(phone_digits, kind, True, str(result.get("response"))[:300], reg_id)
            return {"status": "sent", "chat_id": chat_id}
        reason = f"HTTP {result.get('http')} {result.get('error', '')}"
        await _log_send(phone_digits, kind, False, reason, reg_id)
        await _log_failure(phone_digits, kind, reason)
        return {"status": "failed", "reason": reason}
    except Exception as e:  # noqa: BLE001
        await _log_send(phone_digits, kind, False, str(e), reg_id)
        await _log_failure(phone_digits, kind, f"exception: {e}")
        return {"status": "failed", "reason": str(e)}


async def send_wa_documents(*, phone: str, docs: List[Dict[str, Any]], caption: str = "", kind: str = "document", reg_id: str = "", opt_in: bool = True) -> Dict[str, Any]:
    """Best-effort WhatsApp document send for a list of `{filename, content}`.

    Documents are sent one at a time (each is a separate WhatsApp message).
    """
    phone_digits = strip_phone(phone)
    if not phone_digits or not docs:
        return {"status": "skipped", "reason": "no_phone_or_docs"}
    if not opt_in:
        return {"status": "skipped", "reason": "opt_out"}

    config = await get_openwa_config()
    if not config:
        await _log_failure(phone_digits, kind, "OpenWA not configured")
        return {"status": "skipped", "reason": "not_configured"}

    chat_id = normalize_phone(phone, config.get("default_country_code", "91"))
    if not chat_id:
        await _log_failure(phone_digits, kind, "invalid phone")
        return {"status": "skipped", "reason": "invalid_phone"}

    sent = 0
    errors: List[str] = []
    for doc in docs:
        filename = doc.get("filename") or "document"
        content = doc.get("content")
        if not content:
            continue
        try:
            result = await send_whatsapp_document(config, chat_id, filename, content, caption=caption)
            if result.get("ok"):
                sent += 1
            else:
                err = f"{filename}: HTTP {result.get('http')} {result.get('error', '')}"
                errors.append(err[:200])
                await _log_failure(phone_digits, kind, err)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{filename}: {e}"[:200])
            await _log_failure(phone_digits, kind, f"{filename}: {e}")

    await _log_send(phone_digits, kind, sent == len(docs),
                    f"{sent}/{len(docs)} docs" + (f" errors={errors}" if errors else ""), reg_id)
    if sent == 0:
        return {"status": "failed", "reason": "; ".join(errors)}
    return {"status": "sent", "sent": sent, "total": len(docs)}


async def get_openwa_status() -> Dict[str, Any]:
    """Connection check used by the Settings → Tools "Test" button."""
    config = await get_openwa_config()
    if not config:
        return {"connected": False, "reason": "OpenWA not configured"}
    try:
        url = f"{config['base_url']}/api/sessions/{config['session_id']}"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers={"X-API-Key": config["api_key"]})
        return {
            "connected": r.is_success,
            "http": r.status_code,
            "session_id": config["session_id"],
            "base_url": config["base_url"],
        }
    except Exception as e:  # noqa: BLE001
        return {"connected": False, "reason": str(e)}
