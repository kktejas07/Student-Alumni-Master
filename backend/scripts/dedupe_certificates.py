"""
dedupe_certificates.py — report (and optionally remove) duplicate ECHO certificates.

Duplicates accumulate when one email has several echo_registrations and each
registration mints its own 3 codes (no email-level dedup existed at issue time).

Usage (run from backend/ on a machine with DB access):
    python3 scripts/dedupe_certificates.py                 # dry-run report only
    python3 scripts/dedupe_certificates.py --email x@y.z   # scope to one user
    python3 scripts/dedupe_certificates.py --execute       # actually delete dupes
    python3 scripts/dedupe_certificates.py --execute --yes # skip confirmation

Rule: for ECHO categories (echo/sunset/cyber), keep the NEWEST doc per
(recipient_email, category, slug); everything older is a duplicate.
Workshop/course certificates are never touched.
"""
import os
import sys
import asyncio
import argparse
from collections import defaultdict
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from motor.motor_asyncio import AsyncIOMotorClient

ECHO_CATS = {"echo", "sunset", "cyber"}


def infer_category(doc: dict) -> str:
    cat = str(doc.get("category") or doc.get("type") or "").lower()
    if cat:
        return cat
    title = str(doc.get("title") or doc.get("certificate_title") or "").lower()
    if "sunset" in title:
        return "sunset"
    if "cyber" in title:
        return "cyber"
    if "hackwave" in title or "echo" in title:
        return "echo"
    return "workshop"


def doc_date(doc: dict) -> str:
    return str(doc.get("issued_at") or doc.get("created_at") or "")


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", default=None, help="Scope to one recipient email")
    ap.add_argument("--execute", action="store_true", help="Delete dupes (default: dry-run only)")
    ap.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    args = ap.parse_args()

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "studentalumniadmin")
    if not mongo_url:
        print("MONGO_URL not set — aborting.")
        sys.exit(1)
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
    db = client[db_name]

    query: dict = {}
    if args.email:
        query["recipient_email"] = {"$regex": f"^{args.email.strip()}$", "$options": "i"}
    docs = await db.certificates.find(query).to_list(50000)
    print(f"Scanned {len(docs)} certificate docs.")

    groups: dict = defaultdict(list)
    for d in docs:
        cat = infer_category(d)
        if cat not in ECHO_CATS:
            continue
        email = str(d.get("recipient_email") or d.get("student_email") or d.get("email") or "").lower().strip()
        if not email:
            continue
        groups[(email, cat, str(d.get("slug") or ""))].append(d)

    dupes = {k: sorted(v, key=doc_date) for k, v in groups.items() if len(v) > 1}
    total_extra = sum(len(v) - 1 for v in dupes.values())
    print(f"Users with duplicate ECHO sets: {len(dupes)} | extra docs: {total_extra}")

    to_delete_ids = []
    for (email, cat, slug), ordered in sorted(dupes.items()):
        keep = ordered[-1]
        drop = ordered[:-1]
        keep_code = keep.get("verification_code") or keep.get("certificate_id")
        print(f"\n{email} | {cat} | slug={slug or '-'}: {len(ordered)} docs, keeping {keep_code} ({doc_date(keep)})")
        for d in drop:
            code = d.get("verification_code") or d.get("certificate_id")
            print(f"  - DUPE {code} issued {doc_date(d)} _id={d.get('_id')}")
            to_delete_ids.append(d["_id"])

    if not to_delete_ids:
        print("\nNo duplicates found. Nothing to do.")
        return

    if not args.execute:
        print(f"\nDRY-RUN: would delete {len(to_delete_ids)} docs. Re-run with --execute to delete.")
        return

    if not args.yes:
        ans = input(f"Delete {len(to_delete_ids)} duplicate docs? Type YES to confirm: ").strip()
        if ans != "YES":
            print("Aborted.")
            return

    res = await db.certificates.delete_many({"_id": {"$in": to_delete_ids}})
    print(f"Deleted {res.deleted_count} duplicate docs.")


if __name__ == "__main__":
    asyncio.run(main())
