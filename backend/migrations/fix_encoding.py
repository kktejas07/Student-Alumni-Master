"""
Fix UTF-8 encoding issues in MongoDB documents.

Problem: Some documents contain mojibake — e.g. "München" stored as "MÃ¼nchen"
when UTF-8 bytes were interpreted as Latin-1/Windows-1252 on insert.

This script scans all user-facing text collections, detects mojibake patterns,
and fixes them in place. Safe to run multiple times (idempotent).

Usage:
    cd backend
    PYTHONPATH=. python migrations/fix_encoding.py [--dry-run]
"""
from __future__ import annotations

import asyncio
import logging
import sys
from typing import Optional

logger = logging.getLogger(__name__)

# Common mojibake patterns: UTF-8 bytes misread as Latin-1
# Each tuple is (broken_sequence, correct_char)
MOJIBAKE_FIXES = [
    ("Ã¼", "ü"),  # ü — München, Zürich, Düsseldorf
    ("Ã¶", "ö"),  # ö — Köln, Göteborg
    ("Ã¤", "ä"),  # ä — Malmö → not ä but common
    ("Ã©", "é"),  # é — café, résumé
    ("Ã¨", "è"),  # è — crème
    ("Ã±", "ñ"),  # ñ — España
    ("Ã³", "ó"),  # ó — São
    ("Ã\xad", "í"),  # í
    ("Ã¡", "á"),  # á
    ("Ã\xa0", "à"),  # à
    ("Ã§", "ç"),  # ç — français
    ("Ã\x9f", "ß"),  # ß — Straße
    ("Ã\x84", "Ä"),  # Ä
    ("Ã\x96", "Ö"),  # Ö
    ("Ã\x9c", "Ü"),  # Ü
    ("Ã\x89", "É"),  # É
    ("â\x80\x93", "–"),  # en-dash
    ("â\x80\x94", "—"),  # em-dash
    ("â\x80\x99", "'"),  # right single quote
    ("â\x80\x9c", "“"),  # left double quote
    ("â\x80\x9d", "”"),  # right double quote
    ("â\x80¦", "…"),  # ellipsis
]


def fix_mojibake(text: Optional[str]) -> Optional[str]:
    """Attempt to repair common UTF-8-as-Latin-1 mojibake in a string."""
    if not text or not isinstance(text, str):
        return text
    result = text
    for broken, correct in MOJIBAKE_FIXES:
        if broken in result:
            result = result.replace(broken, correct)
    # Fallback: try the encode/decode round-trip for anything we missed
    if result == text:
        try:
            candidate = text.encode("latin-1").decode("utf-8")
            if candidate != text:
                result = candidate
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass  # Not mojibake — leave as-is
    return result


def has_mojibake(text: Optional[str]) -> bool:
    """Quick check if a string contains likely mojibake patterns."""
    if not text or not isinstance(text, str):
        return False
    for broken, _ in MOJIBAKE_FIXES:
        if broken in text:
            return True
    return False


# Collections and their text fields to scan
SCAN_TARGETS = [
    ("users", ["full_name", "first_name", "last_name", "headline", "bio",
               "location", "city", "state", "institution", "branch",
               "stream", "department", "primary_skill"]),
    ("events", ["title", "description", "location", "venue"]),
    ("career_openings", ["title", "description", "location", "company_name"]),
    ("courses", ["title", "description", "provider", "institution"]),
    ("echo_showcases", ["title", "description", "venue"]),
    ("bookings", ["notes"]),
    ("chat_messages", ["content"]),
    ("mentor_sessions", ["notes", "summary"]),
]


async def fix_collection(db, collection_name: str, fields: list[str],
                         dry_run: bool = True) -> dict:
    """Scan and fix mojibake in one collection. Returns stats."""
    coll = db[collection_name]
    stats = {"scanned": 0, "fixed": 0, "errors": 0}

    # Build an OR query for any field containing common mojibake markers
    or_clauses = []
    for field in fields:
        or_clauses.append({field: {"$regex": "Ã"}})
        or_clauses.append({field: {"$regex": "â\u0080"}})

    if not or_clauses:
        return stats

    query = {"$or": or_clauses}

    try:
        cursor = coll.find(query)
        async for doc in cursor:
            stats["scanned"] += 1
            updates = {}
            for field in fields:
                value = doc.get(field)
                if value and isinstance(value, str) and has_mojibake(value):
                    fixed = fix_mojibake(value)
                    if fixed != value:
                        updates[field] = fixed

                # Also check nested dicts (e.g. school_info.city)
                if value and isinstance(value, dict):
                    for k, v in value.items():
                        if isinstance(v, str) and has_mojibake(v):
                            fixed_v = fix_mojibake(v)
                            if fixed_v != v:
                                updates[f"{field}.{k}"] = fixed_v

            if updates:
                if dry_run:
                    logger.info(
                        "[DRY RUN] %s/%s: would fix %d fields: %s",
                        collection_name, doc["_id"], len(updates),
                        {k: updates[k][:50] for k in list(updates)[:3]}
                    )
                else:
                    try:
                        await coll.update_one(
                            {"_id": doc["_id"]},
                            {"$set": updates}
                        )
                        logger.info(
                            "Fixed %s/%s: %d fields",
                            collection_name, doc["_id"], len(updates)
                        )
                    except Exception as e:
                        logger.error("Error fixing %s/%s: %s", collection_name, doc["_id"], e)
                        stats["errors"] += 1
                        continue
                stats["fixed"] += 1

    except Exception as e:
        logger.error("Error scanning %s: %s", collection_name, e)
        stats["errors"] += 1

    return stats


async def run_migration(dry_run: bool = True):
    """Run the encoding fix migration across all target collections."""
    from core.db import db

    mode = "DRY RUN" if dry_run else "LIVE"
    logger.info("=== UTF-8 Encoding Fix Migration [%s] ===", mode)

    total = {"scanned": 0, "fixed": 0, "errors": 0}

    for coll_name, fields in SCAN_TARGETS:
        stats = await fix_collection(db, coll_name, fields, dry_run=dry_run)
        logger.info(
            "  %s: scanned=%d, fixed=%d, errors=%d",
            coll_name, stats["scanned"], stats["fixed"], stats["errors"]
        )
        for k in total:
            total[k] += stats[k]

    logger.info(
        "=== Migration complete [%s]: scanned=%d, fixed=%d, errors=%d ===",
        mode, total["scanned"], total["fixed"], total["errors"]
    )
    return total


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s"
    )
    dry = "--dry-run" in sys.argv or len(sys.argv) == 1
    if dry and "--dry-run" not in sys.argv:
        logger.info("No --dry-run flag found; defaulting to dry run. Pass --live to apply fixes.")
    if "--live" in sys.argv:
        dry = False
    asyncio.run(run_migration(dry_run=dry))
