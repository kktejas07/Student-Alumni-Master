from playwright.sync_api import Page, expect
from tests.helpers.test_data import generate_email, BASE_URL

def test_register_success(page: Page):
    email = generate_email("new_student")
    password = "Password123!"
    
    page.goto(f"{BASE_URL}/register")
    
    # Check if role picker is shown
    if page.get_by_test_id("register-role-selector").is_visible():
        pass # already selected a role, we can change it if needed
    else:
        # If the picker is open, select Student
        student_btn = page.locator("text=Student").first
        if student_btn.is_visible():
            student_btn.click()

    page.get_by_test_id("register-first-name").fill("John")
    page.get_by_test_id("register-last-name").fill("Doe")
    page.get_by_test_id("register-email").fill(email)
    page.get_by_test_id("register-phone").fill("9876543210")
    
    # Date of Birth
    page.get_by_test_id("dob-day").fill("01")
    page.get_by_test_id("dob-month").fill("01")
    page.get_by_test_id("dob-year").fill("2000")
        
    page.get_by_test_id("register-password").fill(password)
    
    page.get_by_test_id("register-submit").click()
    
    # We should land on referral code or onboarding
    expect(page).not_to_have_url(f"{BASE_URL}/register", timeout=15000)
