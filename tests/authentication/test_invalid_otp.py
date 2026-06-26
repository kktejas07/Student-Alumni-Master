from playwright.sync_api import Page, expect
from tests.helpers.auth_helper import request_password_reset, enter_otp
from tests.helpers.test_data import VALID_STUDENT

def test_invalid_otp(page: Page):
    request_password_reset(page, VALID_STUDENT["email"])
    
    # Enter an invalid OTP
    enter_otp(page, "111111")
    
    # Assert error message is visible
    expect(page.get_by_text("Incorrect code — please try again.")).to_be_visible(timeout=10000)
