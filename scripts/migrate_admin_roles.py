#!/usr/bin/env python3
"""
Migration: Normalize admin roles in MongoDB.
- Updates users with role 'super_admin' or 'superadmin' → role 'admin' + is_super_admin: true
- Adds is_super_admin: true to the platform admin (studentalumni.ai, plus the legacy careerpath.app address if it still exists)
- Ensures no user has role 'super_admin' or 'superadmin'
- Sets is_super_admin: false for all other admin users without this field

Usage:
    cd backend && venv/bin/python scripts/migrate_admin_roles.py

Requires:
    - MONGO_URL and DB_NAME in .env or environment
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent.parent / ".env")


async def migrate():
    MONGO_URL = os.environ.get("MONGO_URL")
    DB_NAME = os.environ.get("DB_NAME", "studentalumniadmin")
    if not MONGO_URL:
        print("❌ MONGO_URL not set in .env or environment")
        sys.exit(1)

    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]
    users_col = db.users
    total = 0

    print("🔍 Scanning for non-standard admin roles...")

    # 1. Fix users with role 'super_admin' or 'superadmin'
    cursor = users_col.find({"role": {"$in": ["super_admin", "superadmin"]}})
    async for u in cursor:
        result = await users_col.update_one(
            {"_id": u["_id"]},
            {"$set": {"role": "admin", "is_super_admin": True}}
        )
        if result.modified_count:
            total += 1
            print(f"  ✅ {u.get('email', '?'):40s} role: {u['role']} → admin, is_super_admin: true")

    # 2. Set is_super_admin for the platform admin (current + legacy login)
    for email in ("admin@studentalumni.ai", "admin@careerpath.app"):
        result = await users_col.update_one(
            {"email": email, "is_super_admin": {"$ne": True}},
            {"$set": {"is_super_admin": True}}
        )
        if result.modified_count:
            total += 1
            print(f"  ✅ {email} → is_super_admin: true")

    # 3. Set is_super_admin: false for all other admin users missing this field
    result = await users_col.update_many(
        {"role": "admin", "is_super_admin": {"$exists": False}},
        {"$set": {"is_super_admin": False}}
    )
    if result.modified_count:
        total += result.modified_count
        print(f"  ✅ {result.modified_count} admin users → is_super_admin: false")

    print(f"\n📊 Total updates: {total}")
    print("✅ Migration complete")


if __name__ == "__main__":
    asyncio.run(migrate())
