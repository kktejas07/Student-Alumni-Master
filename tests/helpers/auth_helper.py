"""
auth_helper.py — Playwright test helpers using synchronous pymongo.

Using pymongo (sync) instead of motor (async) avoids the
`asyncio.run() cannot be called from a running event loop` error
that occurs when pytest-asyncio (asyncio_mode=auto) already has
a running loop when these sync test functions are called.

Uses client[DB_NAME] explicitly because the Atlas URI does not
embed a database name in the connection path.
"""
import hashlib
import time
from pymongo import MongoClient
from playwright.sync_api import Page, expect
from tests.helpers.test_data import BASE_URL, MONGO_URL, DB_NAME


def login(page: Page, email: str, password: str):
    page.goto(f"{BASE_URL}/login")
    page.get_by_test_id("login-email").fill(email)
    page.get_by_test_id("login-password").fill(password)
    page.get_by_test_id("login-submit").click()


def logout(page: Page):
    page.get_by_test_id("logout-button").click(force=True)


def request_password_reset(page: Page, email: str):
    page.goto(f"{BASE_URL}/forgot-password")
    page.get_by_test_id("forgot-email").fill(email)
    page.get_by_test_id("forgot-send-code").click()


def enter_otp(page: Page, otp: str):
    page.get_by_test_id("otp-input-1").wait_for(state="visible", timeout=10000)
    for i, char in enumerate(otp):
        page.get_by_test_id(f"otp-input-{i+1}").fill(char)
    page.get_by_test_id("otp-verify").click()


def reset_password(page: Page, new_password: str):
    page.get_by_test_id("reset-password").fill(new_password)
    page.get_by_test_id("reset-confirm-password").fill(new_password)
    try:
        page.get_by_text("Accept all").click(timeout=2000)
    except Exception:
        pass
    page.get_by_test_id("reset-submit").click(force=True)


def get_otp_for_email_sync(email: str) -> str:
    """Connects directly to Mongo via synchronous pymongo, reads reset_otp_hash,
    and brute-forces all 6-digit combinations (1M max) to crack the SHA-256 hash.
    Polls for up to 10 seconds in case the backend hasn't written the hash yet.
    """
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    user = None
    # Poll until the backend writes the OTP hash (max 10s)
    for _ in range(20):
        user = db.users.find_one({"email": email})
        if user and user.get("reset_otp_hash"):
            break
        time.sleep(0.5)

    client.close()

    if not user or not user.get("reset_otp_hash"):
        raise Exception(f"No reset_otp_hash found for {email} after polling")

    target_hash = user["reset_otp_hash"]

    # Brute-force 000000–999999 (< 1s in CPython)
    for i in range(1_000_000):
        otp_str = f"{i:06d}"
        if hashlib.sha256(otp_str.encode()).hexdigest() == target_hash:
            return otp_str

    raise Exception("Could not brute-force OTP hash — is it a 6-digit number?")
