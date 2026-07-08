"""
test_login_success.py — Uses synchronous pymongo for DB setup to avoid
the asyncio.run() conflict with pytest-asyncio's running event loop.
"""
import bcrypt
from datetime import datetime, timezone
from pymongo import MongoClient
from playwright.sync_api import Page, expect
from tests.helpers.auth_helper import login
from tests.helpers.test_data import VALID_STUDENT, BASE_URL, MONGO_URL, DB_NAME


def setup_valid_student_sync():
    """Ensure the test student exists in MongoDB using sync pymongo."""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    user = db.users.find_one({"email": VALID_STUDENT["email"]})
    if not user:
        hashed = bcrypt.hashpw(
            VALID_STUDENT["password"].encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        db.users.insert_one({
            "email": VALID_STUDENT["email"],
            "password_hash": hashed,
            "full_name": VALID_STUDENT["full_name"],
            "role": "student",
            "onboarding_completed": True,
            "school_info": {"institution_name": "Test University", "country": "India"},
            "student_info": {"career_interests": []},
            "interests": [],
            "skills": [],
            "created_at": datetime.now(timezone.utc),
        })

    client.close()


def test_login_success(page: Page):
    setup_valid_student_sync()

    login(page, VALID_STUDENT["email"], VALID_STUDENT["password"])

    # Should redirect to the student portal/dashboard
    expect(page).not_to_have_url(f"{BASE_URL}/login", timeout=20000)
    # Confirm we landed somewhere inside the student portal
    page.wait_for_url("**/student**", timeout=20000)
