import requests
from playwright.sync_api import Page, expect
from tests.helpers.test_data import VALID_STUDENT, BASE_URL

def test_duplicate_email(page: Page):
    # Seed the user via API first
    requests.post("http://localhost:8000/api/auth/register", json={
        "email": VALID_STUDENT["email"],
        "password": "Password123!",
        "role": "student",
        "full_name": "Test Student"
    })
    
    # Attempt to register with VALID_STUDENT["email"] which already exists
    page.goto(f"{BASE_URL}/register")
    
    # Check if role picker is shown
    if page.get_by_test_id("register-role-selector").is_visible():
        pass
    else:
        student_btn = page.locator("text=Student").first
        if student_btn.is_visible():
            student_btn.click()

    page.get_by_test_id("register-first-name").fill("John")
    page.get_by_test_id("register-last-name").fill("Doe")
    page.get_by_test_id("register-email").fill(VALID_STUDENT["email"])
    page.get_by_test_id("register-phone").fill("9876543210")
    
    page.get_by_test_id("dob-day").fill("01")
    page.get_by_test_id("dob-month").fill("01")
    page.get_by_test_id("dob-year").fill("2000")
        
    page.get_by_test_id("register-password").fill("Password123!")
    
    page.get_by_test_id("register-submit").click()
    
    # Should show an error message
    expect(page.get_by_text("Email already registered")).to_be_visible(timeout=10000)
    # Should stay on the register page
    expect(page).to_have_url(f"{BASE_URL}/register")
