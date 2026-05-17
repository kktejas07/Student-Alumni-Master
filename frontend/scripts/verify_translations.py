#!/usr/bin/env python3
"""
Verify translation keys in database and check for any issues.
"""

import asyncio
import os
import sys

sys.path.insert(0, 'backend')

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'hyra')

from database import get_db, close_db

# The keys we expect to have (from seed_translations.py)
EXPECTED_KEYS = {
    # Core TopBar keys that must exist
    "nav.dashboard", "nav.employees", "nav.payroll_runs", "nav.timeoff_requests",
    "nav.attendance", "nav.performance_reviews", "nav.recruitment", "nav.reports",
    "nav.settings", "nav.help_center", "nav.documents", "nav.news", "nav.payslip",
    
    # Search
    "search.placeholder", "search.shortcut", "search.no_results",
    
    # Language
    "language.select", "language.refresh", "language.change",
    
    # Messages
    "messages.title", "messages.unread", "messages.open_inbox", "messages.empty",
    "messages.no_content", "messages.loading",
    
    # Notifications
    "notifications.title", "notifications.new", "notifications.mark_all_read",
    "notifications.view_all",
    
    # Profile
    "profile.my_profile", "profile.signed_in_as",
    
    # Tenant
    "tenant.label",
    
    # Auth
    "auth.logout", "auth.login",
    
    # Common
    "common.loading", "common.save", "common.cancel", "common.delete", "common.edit",
    "common.create", "common.search", "common.close", "common.open", "common.view",
    "common.status", "common.active", "common.pending", "common.approved",
    "common.completed", "common.error", "common.success",
}

async def verify_translations():
    """Verify translations in database."""
    db = get_db()
    
    print("🔍 Verifying translations in database...\n")
    
    # Get all English translations
    cursor = db.translations.find({"language_code": "en"})
    all_translations = await cursor.to_list(length=None)
    
    existing_keys = {t["key"] for t in all_translations}
    
    print(f"📊 Database Stats:")
    print(f"  Total English translations: {len(all_translations)}")
    print(f"  Unique keys: {len(existing_keys)}\n")
    
    # Check for missing critical keys
    missing = EXPECTED_KEYS - existing_keys
    if missing:
        print(f"❌ MISSING CRITICAL KEYS ({len(missing)}):")
        for key in sorted(missing):
            print(f"    - {key}")
        print()
    else:
        print(f"✅ All {len(EXPECTED_KEYS)} critical keys present!\n")
    
    # Check for keys with empty values
    empty_values = [t for t in all_translations if not t.get("value") or t.get("value") == ""]
    if empty_values:
        print(f"⚠️  Keys with empty values ({len(empty_values)}):")
        for t in empty_values[:10]:  # Show first 10
            print(f"    - {t['key']}")
        if len(empty_values) > 10:
            print(f"    ... and {len(empty_values) - 10} more")
        print()
    
    # Show sample of existing keys
    print(f"📋 Sample of existing keys:")
    sample_keys = sorted(existing_keys)[:20]
    for key in sample_keys:
        trans = next((t for t in all_translations if t["key"] == key), None)
        if trans:
            value = trans["value"][:40] + "..." if len(trans["value"]) > 40 else trans["value"]
            print(f"    {key}: {value}")
    
    if len(existing_keys) > 20:
        print(f"    ... and {len(existing_keys) - 20} more keys\n")
    
    # Check other languages
    print(f"🌍 Translations by language:")
    pipeline = [
        {"$group": {"_id": "$language_code", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    lang_counts = await db.translations.aggregate(pipeline).to_list(length=None)
    for lang in lang_counts:
        print(f"    {lang['_id']}: {lang['count']} keys")
    
    print(f"\n{'='*60}")
    if missing:
        print(f"⚠️  VERIFICATION: {len(missing)} critical keys missing!")
        print(f"   Run: cd backend && python seed_translations.py")
    else:
        print(f"✅ VERIFICATION PASSED: All critical keys present!")
    print(f"{'='*60}\n")
    
    await close_db()

if __name__ == "__main__":
    asyncio.run(verify_translations())
