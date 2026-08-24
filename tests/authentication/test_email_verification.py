from playwright.sync_api import Page, expect
from tests.helpers.test_data import VALID_STUDENT, BASE_URL

def test_email_verification(page: Page):
    # Go directly to the email verification page for the valid student
    page.goto(f"{BASE_URL}/email-verify?email={VALID_STUDENT['email'].replace('@', '%40')}")
    
    # Assert we are on the pending screen
    expect(page.get_by_text("Verify your email address")).to_be_visible()
    
    # Click "I've verified my email ->" (which fakes the verification check)
    page.get_by_test_id("verify-email").click()
    
    # Assert verifying spinner state appears briefly then resolves to success
    expect(page.get_by_text("Verifying your email…")).to_be_visible()
    
    # Wait for the success state
    expect(page.get_by_text("Email verified!")).to_be_visible(timeout=5000)
    
    # Click "Skip for now"
    page.get_by_test_id("email-verify-skip-btn").click()
    
    # Assert redirect to dashboard or welcome
    expect(page).not_to_have_url(f"{BASE_URL}/email-verify", timeout=10000)
