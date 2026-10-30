"""DB dependency, admin/scan auth helpers, small shared helpers.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── DB dependency ────────────────────────────────────────────────────────────
def _get_db(request: Request) -> AsyncIOMotorDatabase:
    from db import db  # imported lazily to avoid circular imports at module load
    return db


# ── Auth helper ──────────────────────────────────────────────────────────────
async def _require_admin(request: Request):
    """Reuse the shared strict JWT decode from core.deps."""
    token = bearer_token(request.headers.get("Authorization", ""))
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    payload = decode_payload(token)
    ensure_admin(payload, roles=("admin", "super_admin"))
    return payload


async def _require_scan_access(request: Request):
    """Allow scan access to super_admins, admins, AND authorized volunteers."""
    token = bearer_token(request.headers.get("Authorization", ""))
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    payload = decode_payload(token)

    role = (payload.get("role") or "").lower()
    if role in ("super_admin", "admin"):
        return payload

    db = _get_db(request)
    email = (payload.get("email") or "").strip().lower()
    vol = await db.echo_volunteers.find_one({"email": email})
    if vol:
        # Volunteer is authorized. Attach their identity for audit.
        payload["scanned_by"] = vol.get("name") or email
        payload["role"] = "volunteer"
        return payload

    raise HTTPException(status_code=403, detail="Scanner access denied")


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


# ── Helpers ──────────────────────────────────────────────────────────────────
def _oid(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {v}")


def _ser(doc: Optional[dict]) -> dict:
    """Recursively serialise ObjectId → str for JSON responses."""
    if doc is None:
        return {}
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [_ser(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            out[k] = _ser(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    if "slug" in doc and "gallery_layout" not in out:
        out["gallery_layout"] = "grid"
    return out


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _reverse_geocode(lat: float, lng: float) -> str:
    """Convert lat/lng to a human-readable address using Nominatim (free, no API key)."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 18},
                headers={"User-Agent": "StudentAlumni-ECHO/1.0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("display_name", "")
    except Exception:
        pass
    return ""


async def _send_checkin_email(reg: dict, event_title: str, checked_in_at: str, address: str = ""):
    """Send a check-in confirmation email to the attendee."""
    email = reg.get("email")
    if not email:
        return
    name = reg.get("full_name", "Attendee")
    subject = f"Welcome to {event_title} — You're Checked In!"
    body = render_html_email(f"""
    <div style="text-align:center;padding:32px 0">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <h1 style="font-size:24px;color:#1a1a2e;margin:0 0 8px">You're Checked In!</h1>
        <p style="font-size:15px;color:#666;margin:0 0 24px">Welcome to <strong>{event_title}</strong></p>
    </div>
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:0 0 20px">
        <table style="width:100%;font-size:14px;color:#333">
            <tr><td style="padding:6px 0;color:#888">Attendee</td><td style="padding:6px 0;font-weight:600">{name}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Event</td><td style="padding:6px 0;font-weight:600">{event_title}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Checked In At</td><td style="padding:6px 0;font-weight:600">{checked_in_at}</td></tr>
            {"<tr><td style='padding:6px 0;color:#888'>Location</td><td style='padding:6px 0;font-weight:600'>" + address + "</td></tr>" if address else ""}
        </table>
    </div>
    <p style="font-size:13px;color:#999;text-align:center">Show this email or your QR code at the venue counters.</p>
    """)
    try:
        await send_email(email, subject, body)
    except Exception:
        pass


async def _send_coupon_scan_email(reg: dict, session_name: str, coupon_code: str, scanned_at: str, address: str = ""):
    """Send an email when a session coupon is scanned/used."""
    email = reg.get("email")
    if not email:
        return
    name = reg.get("full_name", "Attendee")
    subject = f"{session_name} Pass Used — ECHO"
    body = render_html_email(f"""
    <div style="text-align:center;padding:32px 0">
        <div style="font-size:48px;margin-bottom:16px">🎫</div>
        <h1 style="font-size:22px;color:#1a1a2e;margin:0 0 8px">{session_name} Pass Confirmed</h1>
        <p style="font-size:15px;color:#666;margin:0 0 24px">Your session pass has been scanned successfully</p>
    </div>
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:0 0 20px">
        <table style="width:100%;font-size:14px;color:#333">
            <tr><td style="padding:6px 0;color:#888">Attendee</td><td style="padding:6px 0;font-weight:600">{name}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Session</td><td style="padding:6px 0;font-weight:600">{session_name}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Coupon Code</td><td style="padding:6px 0;font-weight:600;font-family:monospace">{coupon_code}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Scanned At</td><td style="padding:6px 0;font-weight:600">{scanned_at}</td></tr>
            {"<tr><td style='padding:6px 0;color:#888'>Location</td><td style='padding:6px 0;font-weight:600'>" + address + "</td></tr>" if address else ""}
        </table>
    </div>
    <p style="font-size:13px;color:#999;text-align:center">Show this email at the {session_name.lower()} counter to collect your item.</p>
    """)
    try:
        await send_email(email, subject, body)
    except Exception:
        pass


_ALIAS_MAP = {
    # VNR ECHO 2026 canonical slug and historical aliases
    "vnrvjit": "vnr-echo-2026",
    "vnr": "vnr-echo-2026",
    "vnr-vjiet": "vnr-echo-2026",
    "vnr-echo": "vnr-echo-2026",
    "vnr-2026": "vnr-echo-2026",
    # SNIST / HackWave canonical slug and historical aliases
    "snist-hackwave": "snist",
    "hackwave": "snist",
    "hackwave3": "snist",
    "hackwave-3": "snist",
    "hackwave-3.0": "snist",
}


def resolve_canonical_slug(slug: str) -> str:
    """Resolve an incoming slug alias to its canonical showcase slug."""
    s = (slug or "").strip().lower()
    return _ALIAS_MAP.get(s, s)


def _slug_query(slug: str) -> dict:
    """Match a showcase by its canonical slug OR any of its legacy aliases."""
    s = (slug or "").strip().lower()
    if not s:
        return {}
    canonical = _ALIAS_MAP.get(s, s)
    return {
        "$or": [
            {"slug": canonical},
            {"slug": s},
            {"aliases": canonical},
            {"aliases": s},
        ]
    }


