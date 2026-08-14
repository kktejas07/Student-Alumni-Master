"""Automatic email quality gate (free, no paid APIs).

Blocks disposable/temp domains, junk local-parts (test@gmail.com),
and addresses Postal already hard-bounced. Disposable list refreshes
itself from GitHub; no one has to copy lists around.
"""
from __future__ import annotations

import os
import re
import time
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse

# Community list used by PyPI. Fetched automatically; fallback if offline.
_LIST_URL = (
    "https://raw.githubusercontent.com/disposable-email-domains/"
    "disposable-email-domains/master/disposable_email_blocklist.conf"
)
_REFRESH_SECS = 24 * 3600

_FALLBACK = {
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
    "grr.la", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
    "throwawaymail.com", "yopmail.com", "yopmail.fr", "trashmail.com", "trashmail.net",
    "getnada.com", "emailondeck.com", "fakeinbox.com", "maildrop.cc", "dispostable.com",
    "mailnesia.com", "moakt.com", "tempail.com", "discard.email", "mailcatch.com",
    "mytrashmail.com", "tempinbox.com", "mailnull.com", "spamgourmet.com",
    "inboxkitten.com", "burnermail.io", "guerrillamailblock.com", "pokemail.net",
    "spam4.me", "bccto.me", "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com",
    "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com",
    "teleworm.us", "ein.email",
}

_JUNK_LOCAL = {
    "test", "testing", "tester", "asdf", "asdfg", "qwerty", "abc", "abcd",
    "xyz", "xxx", "fake", "dummy", "sample", "example", "noreply", "no-reply",
    "donotreply", "temp", "tmp", "guest", "bounce", "spam", "invalid", "null",
}

_JUNK_PREFIX = re.compile(r"^(test|testing|tester|fake|dummy|temp|tmp|asdf|qwerty)[0-9._-]*$")

# Placeholder locals like test@ are only blocked on public webmail.
# College inboxes (test@snist.edu.in) stay valid for events and fixtures.
_CONSUMER = {
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in",
    "ymail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
    "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
    "aol.com", "rediffmail.com", "zoho.com", "zohomail.com", "gmx.com",
    "mail.com",
}

_domains: set[str] = set(_FALLBACK)
_loaded_at = 0.0
_lock = asyncio.Lock()

router = APIRouter(tags=["webhooks"])


def _norm(email: str) -> str:
    return (email or "").strip().lower()


def _parts(email: str) -> Tuple[str, str]:
    e = _norm(email)
    if "@" not in e:
        return "", ""
    local, domain = e.rsplit("@", 1)
    return local, domain


def _junk_local(local: str) -> bool:
    base = local.split("+", 1)[0]
    if base in _JUNK_LOCAL:
        return True
    return bool(_JUNK_PREFIX.match(base))


def _consumer_mailbox(domain: str) -> bool:
    d = domain.rstrip(".")
    return any(d == s or d.endswith("." + s) for s in _CONSUMER)


def _domain_blocked(domain: str) -> bool:
    d = domain.rstrip(".")
    while d:
        if d in _domains:
            return True
        if "." not in d:
            break
        d = d.split(".", 1)[1]
    return False


async def _refresh_list(force: bool = False) -> None:
    global _domains, _loaded_at
    now = time.time()
    if not force and _domains and (now - _loaded_at) < _REFRESH_SECS:
        return
    async with _lock:
        now = time.time()
        if not force and _domains and (now - _loaded_at) < _REFRESH_SECS:
            return
        try:
            import httpx
            async with httpx.AsyncClient(timeout=12) as c:
                r = await c.get(_LIST_URL)
            if r.status_code == 200:
                fetched = {
                    line.strip().lower()
                    for line in r.text.splitlines()
                    if line.strip() and not line.startswith("#")
                }
                if len(fetched) > 100:
                    _domains = fetched | _FALLBACK
                    _loaded_at = now
                    return
        except Exception:
            pass
        if not _loaded_at:
            _domains = set(_FALLBACK)
            _loaded_at = now


def reject_reason(email: str) -> Optional[str]:
    """Fast sync checks (no DNS, no DB). None = looks acceptable."""
    e = _norm(email)
    local, domain = _parts(e)
    if not local or not domain or "." not in domain:
        return "Invalid email address"
    if _junk_local(local) and _consumer_mailbox(domain):
        return "This looks like a test or placeholder email. Use your real inbox."
    if _domain_blocked(domain):
        return "Temporary / disposable email addresses are not allowed."
    return None


def require_ok(email: str) -> str:
    """Raise HTTP 400 if junk/disposable. Returns the normalized address."""
    e = _norm(email)
    reason = reject_reason(e)
    if reason:
        try:
            asyncio.get_running_loop().create_task(_log_event(e, reason, "form_block"))
        except RuntimeError:
            pass
        raise HTTPException(status_code=400, detail=reason)
    return e


def _has_mx(domain: str) -> Optional[bool]:
    """True/False if we know; None if DNS timed out (do not block)."""
    try:
        import dns.resolver
        resolver = dns.resolver.Resolver()
        resolver.lifetime = 1.5
        resolver.timeout = 1.5
        try:
            resolver.resolve(domain, "MX")
            return True
        except dns.resolver.NoAnswer:
            try:
                resolver.resolve(domain, "A")
                return True
            except Exception:
                return False
        except (dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
            return False
        except Exception:
            return None
    except Exception:
        return None


async def assess(email: str, *, mx: bool = False) -> Optional[str]:
    await _refresh_list()
    reason = reject_reason(email)
    if reason:
        return reason
    if mx:
        _, domain = _parts(email)
        hit = await asyncio.to_thread(_has_mx, domain)
        if hit is False:
            return "This email domain cannot receive mail."
    return None


async def is_suppressed(email: str) -> bool:
    try:
        from core.db import db
        doc = await db.email_suppressions.find_one({"email": _norm(email)}, {"_id": 1})
        return bool(doc)
    except Exception:
        return False


async def _log_event(email: str, reason: str, kind: str, source: str = "") -> None:
    try:
        from core.db import db
        await db.email_quality_events.insert_one({
            "email": _norm(email),
            "reason": (reason or "")[:400],
            "kind": kind,
            "source": source,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def suppress(email: str, reason: str, source: str = "postal") -> None:
    e = _norm(email)
    if not e or "@" not in e:
        return
    try:
        from core.db import db
        await db.email_suppressions.update_one(
            {"email": e},
            {"$set": {
                "email": e,
                "reason": (reason or "hard_bounce")[:400],
                "source": source,
                "updated_at": datetime.now(timezone.utc),
            }, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        await _log_event(e, reason or "hard_bounce", "bounce", source)
    except Exception as ex:
        print(f"[WARN] email suppress failed: {ex}")


async def allow_send(email: str) -> Tuple[bool, str]:
    """Gate every outbound message. False = do not hand to Postal."""
    await _refresh_list()
    reason = reject_reason(email)
    if reason:
        await _log_event(email, reason, "skipped_send", "quality_gate")
        return False, reason
    if await is_suppressed(email):
        await _log_event(email, "suppressed", "skipped_send", "suppression")
        return False, "Address is on the bounce suppression list"
    return True, ""


def _extract_bounce_email(body: dict) -> Tuple[str, str]:
    """Postal webhook payloads vary; pull the recipient + bounce type."""
    payload = body.get("payload") if isinstance(body.get("payload"), dict) else body
    bounce = payload.get("bounce") if isinstance(payload.get("bounce"), dict) else {}
    msg = payload.get("message") or payload.get("original_message") or {}
    if not isinstance(msg, dict):
        msg = {}
    to = (
        bounce.get("email")
        or payload.get("to")
        or payload.get("rcpt_to")
        or (msg.get("to")[0] if isinstance(msg.get("to"), list) and msg.get("to") else None)
        or msg.get("to")
        or body.get("to")
        or ""
    )
    if isinstance(to, list):
        to = to[0] if to else ""
    if isinstance(to, dict):
        to = to.get("address") or to.get("email") or ""
    status = str(
        bounce.get("bounce_type")
        or bounce.get("status")
        or payload.get("status")
        or body.get("event")
        or ""
    ).lower()
    return _norm(str(to)), status


@router.post("/webhooks/postal")
async def postal_webhook(request: Request):
    """Postal → POST this URL for MessageBounced / MessageDeliveryFailed.

    Configure in Postal: Webhooks → this path on the API host.
    Optional header check: POSTAL_WEBHOOK_SECRET vs X-Postal-Signature / query.
    """
    secret = (os.environ.get("POSTAL_WEBHOOK_SECRET") or "").strip()
    if not secret:
        try:
            from core.db import db
            doc = await db.settings.find_one({"id": "global"}) or {}
            secret = (doc.get("postal_webhook_secret") or "").strip()
            if not secret:
                it = await db.installed_tools.find_one({"tool_id": "postal"})
                secret = str(((it or {}).get("credentials") or {}).get("webhook_secret") or "").strip()
        except Exception:
            secret = ""
    if secret:
        got = (request.headers.get("x-postal-token") or request.query_params.get("token") or "").strip()
        if got != secret:
            return JSONResponse({"ok": False}, status_code=401)
    try:
        body = await request.json()
    except Exception:
        return {"ok": True}
    if not isinstance(body, dict):
        return {"ok": True}
    email, status = _extract_bounce_email(body)
    hard = any(k in status for k in ("hard", "bounce", "failed", "error"))
    event = str(body.get("event") or "").lower()
    if "bounce" in event or "fail" in event:
        hard = True
    if email and "@" in email and hard:
        await suppress(email, status or event or "bounce", source="postal_webhook")
    return {"ok": True}


async def warmup() -> None:
    try:
        await _refresh_list(force=True)
    except Exception:
        pass
    try:
        from routers.admin.settings import ensure_postal_webhook_secret
        await ensure_postal_webhook_secret()
    except Exception:
        pass


def _iso(v):
    return v.isoformat() if hasattr(v, "isoformat") else v


def _ser(doc: dict) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id"}
    for k in ("created_at", "updated_at"):
        if k in out:
            out[k] = _iso(out[k])
    return out


async def _admin_user(request: Request) -> dict:
    from core.deps import get_current_user
    user = await get_current_user(request)
    role = (user.get("role") or "").lower()
    if role not in ("admin", "super_admin") and not user.get("is_super_admin"):
        raise HTTPException(403, "Insufficient privileges")
    return user


@router.get("/admin/email-quality")
async def email_quality_report(
    q: str = Query(""),
    _user: dict = Depends(_admin_user),
):
    from core.db import db
    needle = (q or "").strip().lower()
    filt: dict = {}
    if needle:
        filt["email"] = {"$regex": re.escape(needle)}
    suppressed = await db.email_suppressions.find(filt).sort("updated_at", -1).to_list(500)
    since = datetime.now(timezone.utc) - timedelta(days=7)
    events = await db.email_quality_events.find(filt).sort("created_at", -1).to_list(200)
    return {
        "suppressed_count": await db.email_suppressions.count_documents({}),
        "events_7d": await db.email_quality_events.count_documents({"created_at": {"$gte": since}}),
        "suppressions": [_ser(d) for d in suppressed],
        "events": [_ser(d) for d in events],
    }


@router.delete("/admin/email-quality/suppressions")
async def unsuppress_email(
    email: str = Query(...),
    _user: dict = Depends(_admin_user),
):
    from core.db import db
    e = _norm(email)
    res = await db.email_suppressions.delete_one({"email": e})
    if not res.deleted_count:
        raise HTTPException(404, "Not on the suppression list")
    return {"ok": True, "email": e}
