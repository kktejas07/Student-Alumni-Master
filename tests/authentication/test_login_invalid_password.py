from playwright.sync_api import Page, expect
from tests.helpers.auth_helper import login
from tests.helpers.test_data import INVALID_LOGIN, BASE_URL

def test_login_invalid_password(page: Page):
    login(page, INVALID_LOGIN["email"], INVALID_LOGIN["password"])
    
    # Assert validation error or toast is visible
    expect(page.get_by_text("Invalid email or password")).to_be_visible()
    # Ensure we remain on the login page
    expect(page).to_have_url(f"{BASE_URL}/login")
