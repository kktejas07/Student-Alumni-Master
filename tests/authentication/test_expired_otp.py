"""
test_expired_otp.py — Uses synchronous pymongo for DB manipulation.
"""
from pymongo import MongoClient
from playwright.sync_api import Page, expect
from datetime import datetime, timedelta
from tests.helpers.auth_helper import request_password_reset, get_otp_for_email_sync, enter_otp
from tests.helpers.test_data import VALID_STUDENT, MONGO_URL, DB_NAME


def expire_otp_sync(email: str):
    """Directly sets reset_otp_expires to 30 minutes in the past using sync pymongo."""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    past_time = datetime.utcnow() - timedelta(minutes=30)
    db.users.update_one({"email": email}, {"$set": {"reset_otp_expires": past_time}})
    client.close()


def test_expired_otp(page: Page):
    email = VALID_STUDENT["email"]
    request_password_reset(page, email)

    otp = get_otp_for_email_sync(email)

    # Fast-forward the expiration in DB before submitting the OTP
    expire_otp_sync(email)

    # Enter the now-expired OTP
    enter_otp(page, otp)

    # The updated frontend now shows a specific expiry message
    expect(
        page.locator("text=/expired|Expired/")
    ).to_be_visible(timeout=10000)
