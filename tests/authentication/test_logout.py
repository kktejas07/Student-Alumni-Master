"""
test_logout.py — Uses synchronous pymongo via the shared setup helper.
"""
from playwright.sync_api import Page, expect
from tests.helpers.auth_helper import login, logout
from tests.helpers.test_data import VALID_STUDENT, BASE_URL
from tests.authentication.test_login_success import setup_valid_student_sync


def test_logout(page: Page):
    setup_valid_student_sync()
    login(page, VALID_STUDENT["email"], VALID_STUDENT["password"])

    # Wait until we're on the student portal
    page.wait_for_url("**/student**", timeout=20000)

    # Logout
    logout(page)

    # Should be redirected away from the portal
    expect(page).not_to_have_url(r".*\/student.*", timeout=10000)

    # Confirm the login page is accessible (not gated behind auth)
    page.goto(f"{BASE_URL}/login")
    expect(page.get_by_test_id("login-email")).to_be_visible(timeout=10000)
