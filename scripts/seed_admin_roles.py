#!/usr/bin/env python3
"""
Seed admin roles into MongoDB.
Call this after deployment to ensure system roles exist.

Usage:
    cd backend && venv/bin/python scripts/seed_admin_roles.py

Requires MONGO_URL in .env or environment.
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

BASE = Path(__file__).parent.parent
load_dotenv(BASE / ".env")

sys.path.insert(0, str(BASE / "backend"))
from core.roles import SYSTEM_ROLES


async def seed():
    MONGO_URL = os.environ.get("MONGO_URL")
    DB_NAME = os.environ.get("DB_NAME", "studentalumniadmin")
    if not MONGO_URL:
        print("❌ MONGO_URL not set")
        sys.exit(1)

    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]
    count = 0

    print(f"🌱 Seeding {len(SYSTEM_ROLES)} system roles...")
    for role_def in SYSTEM_ROLES:
        existing = await db.admin_roles.find_one({"key": role_def["key"]})
        if existing:
            print(f"  ⏭  {role_def['key']:20s} already exists — skipping")
            continue
        from datetime import datetime
        doc = {**role_def, "created_at": datetime.utcnow(), "user_count": 0}
        await db.admin_roles.insert_one(doc)
        print(f"  ✅ {role_def['key']:20s} created")
        count += 1

    print(f"\n📊 Result: {count} created, {len(SYSTEM_ROLES) - count} already existed")
    print("✅ Done")


if __name__ == "__main__":
    asyncio.run(seed())
