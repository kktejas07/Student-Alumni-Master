"""
One-shot migration: local MongoDB → MongoDB Atlas (studentalumniadmin).
Mirrors all collections 1:1 including _id fields and indexes.

Run:
    python3 /app/backend/migrate_to_atlas.py
"""
import asyncio
import os
import sys
from typing import Any, Dict, List
from pathlib import Path

from dotenv import load_dotenv

# Load env variables from backend/.env or root .env
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

LOCAL_URI = os.environ.get("LOCAL_MONGO_URL", "mongodb://localhost:27017")
LOCAL_DB  = os.environ.get("LOCAL_DB_NAME", "career_platform")

# MONGO_URL must be set in the environment — no hardcoded credential fallback.
ATLAS_URI = os.environ.get("MONGO_URL")
if not ATLAS_URI:
    raise RuntimeError(
        "MONGO_URL environment variable is not set.\n"
        "Set it before running: export MONGO_URL='mongodb+srv://...' or populate backend/.env"
    )
ATLAS_DB  = os.environ.get("DB_NAME", "studentalumniadmin")

BATCH = 500
DROP_TARGET = True   # wipe target collections before insert (clean 1:1 mirror)


async def migrate_collection(src_db, dst_db, coll: str, stats: Dict[str, Any]) -> None:
    src = src_db[coll]
    dst = dst_db[coll]

    total = await src.estimated_document_count()
    if total == 0:
        stats[coll] = {"src": 0, "copied": 0, "indexes": 0}
        print(f"  · {coll:35} 0 docs (skipped)")
        return

    # Drop target first
    if DROP_TARGET:
        try:
            await dst.drop()
        except Exception:
            pass

    # Copy in batches
    copied = 0
    buf: List[dict] = []
    async for doc in src.find({}):
        buf.append(doc)
        if len(buf) >= BATCH:
            try:
                await dst.insert_many(buf, ordered=False)
            except Exception as e:
                print(f"    ⚠ insert error in {coll}: {str(e)[:120]}")
            copied += len(buf)
            buf = []
            print(f"    {coll}: {copied}/{total}", end="\r", flush=True)
    if buf:
        try:
            await dst.insert_many(buf, ordered=False)
        except Exception as e:
            print(f"    ⚠ insert error in {coll}: {str(e)[:120]}")
        copied += len(buf)

    # Copy indexes (skip _id_ which is auto-created)
    idx_count = 0
    try:
        idxs = await src.list_indexes().to_list(length=None)
        for idx in idxs:
            name = idx.get("name")
            if name == "_id_":
                continue
            keys = list(idx["key"].items())
            opts = {k: v for k, v in idx.items()
                    if k not in ("v", "key", "ns", "background")}
            try:
                await dst.create_index(keys, **opts)
                idx_count += 1
            except Exception as e:
                print(f"    ⚠ index {name} skip: {str(e)[:80]}")
    except Exception:
        pass

    stats[coll] = {"src": total, "copied": copied, "indexes": idx_count}
    print(f"  ✓ {coll:35} {copied}/{total}  + {idx_count} indexes")


async def main():
    print("─" * 70)
    print("LOCAL  →  ATLAS  migration")
    print(f"  src: {LOCAL_URI}  /  {LOCAL_DB}")
    print(f"  dst: …mongodb.net  /  {ATLAS_DB}")
    print("─" * 70)

    from db import client as src_client
    from db import client as dst_client

    await src_client.admin.command("ping")
    await dst_client.admin.command("ping")
    print("✓ Both connections OK\n")

    src_db = src_client[LOCAL_DB]
    dst_db = dst_client[ATLAS_DB]

    collections = await src_db.list_collection_names()
    collections = [c for c in collections if not c.startswith("system.")]
    print(f"Found {len(collections)} collections to migrate\n")

    stats: Dict[str, Any] = {}

    # Smaller / metadata collections first to surface errors fast
    collections.sort(key=lambda c: 0 if c in ("users", "roles", "platform_controls", "installed_tools") else 1)

    for coll in collections:
        await migrate_collection(src_db, dst_db, coll, stats)

    # Summary
    print("\n" + "─" * 70)
    print("SUMMARY")
    print("─" * 70)
    total_src = sum(s["src"] for s in stats.values())
    total_copied = sum(s["copied"] for s in stats.values())
    total_idx = sum(s["indexes"] for s in stats.values())
    print(f"  Collections: {len(stats)}")
    print(f"  Documents : {total_copied}/{total_src}")
    print(f"  Indexes   : {total_idx}")

    # Verify a few key collections
    print("\nSpot-check counts on Atlas:")
    for k in ("users", "events", "internships", "wallet_transactions",
              "auth_events", "analytics_events", "roles", "platform_controls",
              "installed_tools", "admin_audit_log"):
        try:
            n = await dst_db[k].estimated_document_count()
            print(f"  {k:30} {n}")
        except Exception as e:
            print(f"  {k:30} ERROR {e}")

    src_client.close()
    dst_client.close()
    print("\nDONE.")


if __name__ == "__main__":
    asyncio.run(main())
