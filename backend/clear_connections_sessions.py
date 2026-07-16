"""
clear_connections_sessions.py — Wipe connections & session data to start fresh.

Clears:
  - connections          (network connection requests / accepted pairs)
  - bookings             (mentor–student session bookings)
  - mentor_sessions      (open session slots posted by mentors)
  - notifications of type connection_request / connection_accepted

Run from Student-Alumni-Master/:
    cd backend && python clear_connections_sessions.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Load .env before importing core.db
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / '.env')

from core.db import db, client  # noqa: E402


COLLECTIONS_TO_CLEAR = [
    "connections",
    "bookings",
    "mentor_sessions",
]

NOTIFICATION_TYPES_TO_REMOVE = [
    "connection_request",
    "connection_accepted",
]


async def main():
    print("=" * 60)
    print("  Clearing connections & sessions data")
    print("=" * 60)

    # 1. Drop entire collections
    for name in COLLECTIONS_TO_CLEAR:
        coll = db[name]
        count = await coll.count_documents({})
        await coll.drop()
        print(f"  [DROP] {name:25s} — removed {count} documents")

    # 2. Remove connection-related notifications
    notif_coll = db["notifications"]
    result = await notif_coll.delete_many({"type": {"$in": NOTIFICATION_TYPES_TO_REMOVE}})
    print(f"  [DEL]  {'notifications':25s} — removed {result.deleted_count} documents (connection types)")

    # 3. Disconnect
    client.close()

    print("=" * 60)
    print("  Done. Your account is now clean — like a fresh start.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
