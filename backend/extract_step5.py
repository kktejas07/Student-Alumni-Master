import re
import os

with open("server.py", "r") as f:
    content = f.read()

def extract_section(start_marker, end_marker):
    pattern = re.compile(rf"{re.escape(start_marker)}(.*?){re.escape(end_marker)}", re.DOTALL)
    match = pattern.search(content)
    if match:
        return match.group(1).strip()
    return ""

def remove_section(start_marker, end_marker):
    pattern = re.compile(rf"({re.escape(start_marker)}.*?{re.escape(end_marker)})", re.DOTALL)
    return pattern.sub("", content)

# Sections:
# Analytics: from `# ----------------------------------------------------------------------------\n# Analytics — role-aware dashboards\n# ----------------------------------------------------------------------------` to `# External API Integrations`
analytics_block = extract_section(
    "# ----------------------------------------------------------------------------\n# Analytics — role-aware dashboards\n# ----------------------------------------------------------------------------",
    "# ----------------------------------------------------------------------------\n# External API Integrations"
)

integrations_block = extract_section(
    "# ----------------------------------------------------------------------------\n# External API Integrations — Coursera / Udemy / Adzuna\n# Mock-mode by default; real-mode activates when env vars are set.\n# ----------------------------------------------------------------------------",
    "# ----------------------------------------------------------------------------\n# Mentor Reviews"
)

reviews_block = extract_section(
    "# ----------------------------------------------------------------------------\n# Mentor Reviews — students rate completed sessions\n# ----------------------------------------------------------------------------",
    "# ----------------------------------------------------------------------------\n# Push Notifications"
)

notifications_block = extract_section(
    "# ----------------------------------------------------------------------------\n# Push Notifications — register tokens, fetch in-app inbox\n# ----------------------------------------------------------------------------",
    "# ----------------------------------------------------------------------------\n# Health"
)

# And remove them from server.py (from Analytics down to Health)
new_server_content = re.sub(
    r"# ----------------------------------------------------------------------------\n# Analytics — role-aware dashboards.*?# ----------------------------------------------------------------------------\n# Health",
    "# ----------------------------------------------------------------------------\n# Health",
    content,
    flags=re.DOTALL
)

with open("server.py", "w") as f:
    f.write(new_server_content)

def create_router_file(filename, body, extra_imports=""):
    # Fix the `from server import` to correct root imports since we are in `routers/`
    body = re.sub(r'from server import ', 'from ', body)
    
    # We also need to fix `from get_analytics_for` which is wrong, it should be `from analytics import get_analytics_for`
    # Let's just do imports at the top
    
    # Actually, it's easier to just keep the body, and let the developers fix the imports, or we can fix them here.
    
    template = f"""from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from bson import ObjectId

from core.db import db
from core.deps import get_current_user
{extra_imports}

router = APIRouter()

{body}
"""
    # Fix @api_router to @router
    template = template.replace("@api_router.", "@router.")
    
    # Write file
    with open(f"routers/{filename}", "w") as f:
        f.write(template)

create_router_file("analytics.py", analytics_block, "from analytics import get_analytics_for, super_admin_analytics, college_analytics, mentor_analytics\nfrom personalization import track_module_click")
create_router_file("integrations.py", integrations_block, "from integrations import fetch_coursera_courses, fetch_udemy_courses, fetch_adzuna_internships, sync_courses_to_db, sync_internships_to_db, integrations_status")
create_router_file("reviews.py", reviews_block, "from reviews import create_review, list_mentor_reviews, get_mentor_rating_stats\nfrom notifications import notify_review_received")
create_router_file("notifications.py", notifications_block, "from notifications import register_push_token, deregister_push_token, list_inbox, unread_count, mark_inbox_read, dismiss_inbox, send_push")

