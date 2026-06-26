from playwright.sync_api import Page, expect
from tests.helpers.auth_helper import request_password_reset, get_otp_for_email_sync, enter_otp, reset_password
from tests.helpers.test_data import VALID_STUDENT, BASE_URL
from tests.authentication.test_login_success import setup_valid_student_sync

def test_reset_password_success(page: Page):
    setup_valid_student_sync()
    email = VALID_STUDENT["email"]
    request_password_reset(page, email)
    
    # Retrieve the OTP directly from MongoDB using the brute-force technique
    otp = get_otp_for_email_sync(email)
    
    # Enter the OTP
    enter_otp(page, otp)
    
    # Should stay on forgot-password page but show reset password form
    expect(page).to_have_url(f"{BASE_URL}/forgot-password")
    expect(page.get_by_text("Set new password")).to_be_visible()
    
    # Fill in the new password
    new_pwd = "NewPassword123!"
    reset_password(page, new_pwd)
    
    # Should show success toast and redirect to login
    expect(page.get_by_text("Password reset successful")).to_be_visible(timeout=10000)
    page.get_by_test_id("forgot-success-login").click()
    expect(page).to_have_url(f"{BASE_URL}/login")
