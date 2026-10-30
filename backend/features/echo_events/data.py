"""Ticket templates & default session-coupon configuration.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── Ticket / pass templates ───────────────────────────────────────────────────
# Selected per event via the super-admin CMS (Registration tab →
# `registration.ticket_template`). Each entry carries display metadata for the
# picker; the actual rendering lives in _build_ticket_html below.
TICKET_TEMPLATES = {
    "aurora": {
        "name": "Aurora",
        "description": "Dark gradient pass with glow accents — modern & bold",
        "theme": "dark",
    },
    "classic": {
        "name": "Classic",
        "description": "Clean white ticket with a purple header band — formal",
        "theme": "light",
    },
    "minimal": {
        "name": "Minimal",
        "description": "Bare-bones borderless pass — crisp and lightweight",
        "theme": "light",
    },
}
DEFAULT_TICKET_TEMPLATE = "aurora"

# Session coupon configuration — per-event
DEFAULT_SESSIONS = [
    {"key": "breakfast", "label": "Breakfast", "icon": "egg-fried", "day": 1, "enabled": False, "locked": False},
    {"key": "lunch", "label": "Lunch", "icon": "utensils", "day": 1, "enabled": True, "locked": False},
    {"key": "snacks", "label": "Snacks", "icon": "cookie", "day": 1, "enabled": True, "locked": False},
    {"key": "dinner", "label": "Dinner", "icon": "utensils-crossed", "day": 1, "enabled": False, "locked": False},
    {"key": "tiffin", "label": "Tiffin", "icon": "sandwich", "day": 1, "enabled": False, "locked": False},
    {"key": "coffee", "label": "Coffee & Tea", "icon": "cup-soda", "day": 1, "enabled": False, "locked": False},
]


def _generate_coupon_code(session_key: str, reg_id: str) -> str:
    """Generate a unique coupon code like LUNCH-A7X9K2."""
    raw = f"{session_key}:{reg_id}:{secrets.token_hex(4)}"
    h = hashlib.sha256(raw.encode()).hexdigest()[:6].upper()
    return f"{session_key.upper()}-{h}"


async def _generate_coupons_for_registration(db, slug: str, reg_id: str, sessions: list):
    """Generate coupon records for all enabled sessions."""
    from datetime import timezone
    existing = await db.echo_coupons.find({"reg_id": reg_id}).to_list(500)
    existing_keys = {c.get("session_key") for c in existing}

    coupons = []
    for s in sessions:
        if s.get("enabled") is False or s["key"] in existing_keys:
            continue
        code = _generate_coupon_code(s["key"], reg_id)
        day = int(s.get("day") or 1)
        day_label = f"Day {day} · " if day > 1 else ""
        coupons.append({
            "slug": slug,
            "reg_id": reg_id,
            "session_key": s["key"],
            "session_name": f"{day_label}{s.get('label', s['key'])}",
            "session_day": day,
            "coupon_code": code,
            "used": False,
            "used_at": None,
            "scanned_by": None,
            "created_at": datetime.now(timezone.utc),
        })
    if coupons:
        await db.echo_coupons.insert_many(coupons)
    return coupons


async def _reconcile_coupons_for_paid(db, showcase: dict) -> dict:
    """Sync enabled session coupons to registrations that already paid.

    When an organizer adds/updates session passes after people have registered,
    previously-paid attendees must still receive coupons for the newly-enabled
    passes. This finds every paid ("registered") registration for the event and
    for each enabled session:
      • creates a missing coupon (matched by session_key) if the attendee never
        got one,
      • refreshes session_day / session_name on existing coupons so day changes
        on the pass config reflect on the attendee's coupon, and
      • removes coupons for sessions that were disabled, so paid users always
        reflect the current enabled set.
    """
    sessions = showcase.get("sessions") or []
    enabled = [s for s in sessions if s.get("enabled")]
    enabled_keys = {s.get("key") for s in enabled if s.get("key")}
    slug = showcase.get("slug") or ""
    if not slug:
        return {"added": 0, "updated": 0, "removed": 0}
    added = 0
    updated = 0
    removed = 0
    regs = await db.echo_registrations.find(
        {"slug": slug, "status": "registered"}
    ).to_list(5000)
    for reg in regs:
        reg_id = reg.get("id")
        if not reg_id:
            continue
        existing = await db.echo_coupons.find(
            {"slug": slug, "reg_id": reg_id}
        ).to_list(500)
        by_key = {c.get("session_key"): c for c in existing}
        new_coupons = []
        for s in enabled:
            from datetime import timezone
            day = int(s.get("day") or 1)
            day_label = f"Day {day} · " if day > 1 else ""
            name = f"{day_label}{s.get('label', s['key'])}"
            old = by_key.get(s.get("key"))
            if old is None:
                new_coupons.append({
                    "slug": slug,
                    "reg_id": reg_id,
                    "session_key": s["key"],
                    "session_name": name,
                    "session_day": day,
                    "coupon_code": _generate_coupon_code(s["key"], reg_id),
                    "used": False,
                    "used_at": None,
                    "scanned_by": None,
                    "created_at": datetime.now(timezone.utc),
                })
            elif (old.get("session_day") or 1) != day or old.get("session_name") != name:
                await db.echo_coupons.update_one(
                    {"_id": old.get("_id") or old.get("id")},
                    {"$set": {"session_day": day, "session_name": name}}
                )
                updated += 1
        if new_coupons:
            await db.echo_coupons.insert_many(new_coupons)
            added += len(new_coupons)
        # Remove coupons for sessions that are no longer enabled so the set a
        # paid user holds always matches the organizer's current configuration.
        stale_keys = [k for k in set(by_key.keys()) - enabled_keys if k]
        if stale_keys:
            res = await db.echo_coupons.delete_many(
                {"slug": slug, "reg_id": reg_id, "session_key": {"$in": stale_keys}}
            )
            removed += res.deleted_count
    return {"added": added, "updated": updated, "removed": removed}


