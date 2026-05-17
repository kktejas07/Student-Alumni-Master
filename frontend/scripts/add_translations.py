#!/usr/bin/env python3
"""
Add missing translation keys to the database for English.
Run this script to add all the translation keys used in the UI.
"""

import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, 'backend')

# Set environment variables for database connection
os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'hyra')

try:
    from database import get_db
except ImportError as e:
    print(f"Error: Could not import database module: {e}")
    print("Make sure you're running this from the project root.")
    sys.exit(1)

# Essential translation keys used in the application
TRANSLATIONS = {
    # Navigation - TopBar
    "nav.dashboard": "Dashboard",
    "nav.employees": "Employees",
    "nav.payroll_runs": "Payroll Runs",
    "nav.timeoff_requests": "Time Off Requests",
    "nav.attendance": "Attendance",
    "nav.performance_reviews": "Performance Reviews",
    "nav.recruitment": "Recruitment",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.help_center": "Help Center",
    "nav.documents": "Documents",
    "nav.news": "News",
    "nav.payslip": "Payslip",
    "nav.report": "Report",
    
    # Search
    "search.shortcut": "⌘ F",
    "search.placeholder": "Search anything...",
    "search.no_results": "No results found",
    
    # Language
    "language.select": "Select Language",
    "language.refresh": "Refresh Translations",
    "language.change": "Change Language",
    
    # Messages
    "messages.title": "Messages",
    "messages.unread": "unread",
    "messages.open_inbox": "Open Inbox",
    "messages.empty": "No messages yet",
    "messages.no_content": "No messages yet",
    
    # Notifications
    "notifications.title": "Notifications",
    "notifications.new": "new",
    "notifications.mark_all_read": "Mark all read",
    "notifications.view_all": "View all notifications",
    
    # Profile
    "profile.my_profile": "My Profile",
    "profile.signed_in_as": "Signed in as",
    
    # Tenant
    "tenant.label": "Tenant:",
    
    # Auth
    "auth.logout": "Log out",
    "auth.login": "Log in",
    
    # Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search",
    "common.close": "Close",
    "common.open": "Open",
    "common.view": "View",
    "common.download": "Download",
    "common.upload": "Upload",
    "common.import": "Import",
    "common.export": "Export",
    "common.refresh": "Refresh",
    "common.filter": "Filter",
    "common.sort": "Sort",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.pending": "Pending",
    "common.approved": "Approved",
    "common.rejected": "Rejected",
    "common.completed": "Completed",
    "common.error": "Error",
    "common.success": "Success",
    "common.warning": "Warning",
    "common.info": "Info",
    "common.confirm": "Confirm",
    "common.are_you_sure": "Are you sure?",
    "common.cannot_undo": "This action cannot be undone",
    "common.confirm_delete": "Are you sure you want to delete this?",
    "common.changes_saved": "Changes saved successfully",
    "common.unsaved_changes": "You have unsaved changes",
}

async def add_translations():
    """Add all translation keys to the database."""
    print(f"Adding {len(TRANSLATIONS)} translation keys to English...\n")
    
    db = get_db()
    added = 0
    skipped = 0
    
    for key, value in TRANSLATIONS.items():
        # Check if translation already exists
        existing = await db.translations.find_one({
            "language_code": "en",
            "key": key
        })
        
        if existing:
            skipped += 1
            print(f"  SKIP: {key}")
            continue
        
        # Add new translation
        await db.translations.insert_one({
            "language_code": "en",
            "key": key,
            "value": value
        })
        added += 1
        print(f"  ADD: {key} = {value}")
    
    print(f"\n✓ Done! Added: {added}, Skipped: {skipped}")
    print("\nNext steps:")
    print("1. Go to Language Management page")
    print("2. Select a language (e.g., Spanish)")
    print("3. Use AI translation to translate these new keys")

if __name__ == "__main__":
    asyncio.run(add_translations())
