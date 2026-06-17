"""
MongoDB migration: seed default payout tiers and create indexes.
Run:  python migrate_payout_tiers.py
"""
import asyncio
DB_NAME = "student_alumni"

DEFAULT_TIERS = [
    {"name": "Platinum mentor", "cut_percent": 70, "color": "#A78BFA", "sort_order": 1},
    {"name": "Gold mentor",     "cut_percent": 60, "color": "#F5C842", "sort_order": 2},
    {"name": "Silver mentor",   "cut_percent": 50, "color": "#C0C0C0", "sort_order": 3},
    {"name": "College MoU",     "cut_percent": 30, "color": "#3B82F6", "sort_order": 4},
]


async def migrate():
    from db import client as client
    db = client[DB_NAME]

    existing = await db.payout_tiers.count_documents({})
    if existing == 0:
        await db.payout_tiers.insert_many(DEFAULT_TIERS)
        print(f"Seeded {len(DEFAULT_TIERS)} default payout tiers.")
    else:
        print(f"Found {existing} existing payout tiers — skipping seed.")

    await db.payout_tiers.create_index("sort_order")
    await db.admin_audit_log.create_index("action")
    print("Indexes ensured.")

    client.close()
    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
