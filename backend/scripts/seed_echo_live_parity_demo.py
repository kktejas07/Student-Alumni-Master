"""
DEV-ONLY, OPT-IN seed fixture - "live ECHO card parity demo".

WHAT
----
Mutates the LOCAL database's three ECHO showcase records so the local /echo
landing page demonstrates the same PUBLIC CARD CONTENT as the production page
(https://studentalumni.ai/echo):

    slug            title                  event_status_badge  registration
    snist           Hack Wave 3.0 - SNIST  Completed           enabled=false ("Closed")
    vnr-echo-2026   VNR ECHO 2026          Completed           enabled=true
    cbit            (unchanged content)    status -> "archived" (excluded from the
                                                public list, mirroring production
                                                where no CBIT record exists)

Only PUBLIC CARD FIELDS are written (title/subtitle/description/date/time/
venue/college/category/event_status_badge/hero_image_url/organizer_name/
aliases/registration.enabled+fee+payment_note). No registrations, orders,
users, tickets, or any other collection is touched. No record is deleted.

IMAGE SUBSTITUTION (deliberate, not fabricated):
Production card images live in the production Mongo/uploads filesystem
(/uploads/echo/...) and do not exist on this machine. The fixture therefore:
  - snist -> /images/hackwave/hackwave_main_poster.png  (a real poster bundled
    in frontend/public - served by the web origin after the resolveImageUrl fix)
  - vnr-echo-2026 -> ""  (no image -> the card's deliberate no-image fallback:
    gradient panel + event title)
Upload real assets any time via Superadmin -> ECHO Showcase CMS -> Hero tab.

SAFETY
------
* Requires an explicit --apply (or --restore) flag. NEVER runs implicitly.
* Refuses to run when ENV=production or when MONGO_URL does not point at
  localhost/127.0.0.1. It can never touch the production database.
* Snapshots every doc it touches to backend/backups/ before mutating.
* --restore writes the snapshotted original documents back verbatim
  (replace_one), returning the local DB to its exact pre-demo state.

USAGE (from backend/ with the backend venv)
-------------------------------------------
    venv/Scripts/python.exe scripts/seed_echo_live_parity_demo.py --apply
    venv/Scripts/python.exe scripts/seed_echo_live_parity_demo.py --restore
"""
import asyncio
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")

import os  # noqa: E402

from bson import json_util  # noqa: E402

from db import db  # noqa: E402

SNAPSHOT_PATH = BACKEND_DIR / "backups" / "echo_live_parity_demo_snapshot.json"

# Public card fields only - everything a visitor can see on /echo cards.
PUBLIC_CARD_FIELDS = [
    "title",
    "subtitle",
    "description",
    "date",
    "time",
    "venue",
    "college",
    "category",
    "event_status_badge",
    "hero_image_url",
    "organizer_name",
    "aliases",
]

# Mirrors the PUBLIC production API response (https://studentalumni.ai/api/echo/showcases).
# No private data. Images substituted with locally-available assets (see module docstring).
LIVE_CARD_DEMO = {
    "snist": {
        "title": "Hack Wave 3.0 - SNIST",
        "subtitle": "Empowering Tomorrow's Leaders | Organized by cdc snist and in collaboration with StudentAlumni.ai",
        "description": "A day of inspiration, learning, and networking",
        "date": "September 04, 2026",
        "time": "09:00 AM",
        "venue": "Sreenidhi Institute of Science & Technology",
        "college": "SNIST",
        "category": "college-event",
        "event_status_badge": "Completed",
        "hero_image_url": "/images/hackwave/hackwave_main_poster.png",
        "organizer_name": "CDC SNIST and in collaboration with StudentAlumni.ai",
        "aliases": ["hackwave", "hackwave-3.0", "hackwave-3", "hackwave3"],
        "registration.enabled": False,
        "registration.fee": 599.0,
        "registration.payment_note": "",
    },
    "vnr-echo-2026": {
        "title": "VNR ECHO 2026",
        "subtitle": "Empowering Tomorrow's Leaders",
        "description": (
            "A day of inspiration, learning, and networking as industry leaders, alumni, and "
            "students came together to explore opportunities and shape the future of technology."
        ),
        "date": "July 31, 2026",
        "time": "10:00 AM - 6:30 PM",
        "venue": "Main Auditorium, VNR VJIET",
        "college": "",
        "category": "college-event",
        "event_status_badge": "Completed",
        # Empty on purpose -> deliberate no-image fallback (gradient + title).
        "hero_image_url": "",
        "organizer_name": "Student Alumni",
        "aliases": ["vnr-echo-2026"],
        "registration.enabled": True,
        "registration.fee": 0.0,
        "registration.payment_note": "Free entry for VNR VJIET students. Registrations close 1 day before the event.",
    },
    # Production has no CBIT record; archiving excludes it from the public
    # list without deleting anything.
    "cbit": {
        "status": "archived",
    },
}


def _safety_checks() -> None:
    env = (os.environ.get("ENV") or "").strip().lower()
    if env == "production":
        sys.exit("REFUSED: ENV=production. This fixture is dev-only.")
    mongo_url = os.environ.get("MONGO_URL") or ""
    host = mongo_url.split("://", 1)[-1].split("/")[0].split("@")[-1].split(":")[0].lower()
    if host not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("REFUSED: MONGO_URL does not point at localhost. This fixture is dev-only.")


def _set_nested(doc: dict, dotted_key: str, value) -> None:
    parts = dotted_key.split(".")
    node = doc
    for p in parts[:-1]:
        node = node.setdefault(p, {})
    node[parts[-1]] = value


async def _apply() -> None:
    snapshot = {}
    for slug, fields in LIVE_CARD_DEMO.items():
        doc = await db.echo_showcases.find_one({"slug": slug})
        if doc is None:
            print(f"  - skip {slug!r}: no local record (nothing to do)")
            continue
        snapshot[slug] = doc
        update = {"$set": {}}
        for key, value in fields.items():
            if "." in key:
                _set_nested(update["$set"], key, value)
            else:
                update["$set"][key] = value
        await db.echo_showcases.update_one({"_id": doc["_id"]}, update)
        print(f"  - updated {slug!r}: {', '.join(sorted(fields))}")

    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    # bson.json_util Extended JSON round-trips ObjectId / datetime / etc.
    # EXACTLY, so --restore can always rewrite the original documents verbatim.
    SNAPSHOT_PATH.write_text(json_util.dumps(snapshot, indent=2))
    print(f"Snapshot of pre-demo documents written to {SNAPSHOT_PATH}")
    print("Run with --restore to return the local DB to its exact prior state.")


async def _restore() -> None:
    if not SNAPSHOT_PATH.exists():
        sys.exit(f"No snapshot found at {SNAPSHOT_PATH} - nothing to restore.")
    snapshot = json_util.loads(SNAPSHOT_PATH.read_text())
    for slug, original in snapshot.items():
        await db.echo_showcases.replace_one({"slug": slug}, original)
        print(f"  - restored {slug!r} to its pre-demo state")
    print("Restore complete.")


async def main() -> None:
    _safety_checks()
    if "--apply" in sys.argv and "--restore" in sys.argv:
        sys.exit("Pass either --apply or --restore, not both.")
    if "--restore" in sys.argv:
        await _restore()
    elif "--apply" in sys.argv:
        await _apply()
    else:
        print(__doc__)
        sys.exit("\nNothing done. Pass --apply or --restore explicitly.")


if __name__ == "__main__":
    asyncio.run(main())
