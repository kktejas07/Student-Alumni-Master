from playwright.sync_api import Page, expect
from tests.helpers.auth_helper import request_password_reset
from tests.helpers.test_data import VALID_STUDENT, BASE_URL

def test_forgot_password_success(page: Page):
    request_password_reset(page, VALID_STUDENT["email"])
    
    # Should stay on the same page and show OTP verification step
    expect(page).to_have_url(f"{BASE_URL}/forgot-password", timeout=10000)
    # Check that OTP inputs are visible
    expect(page.get_by_test_id("otp-input-1")).to_be_visible()
