from playwright.sync_api import sync_playwright
import time
import os

BASE_URL = "http://localhost:8081"
OUT_DIR = "acceptance_screenshots/auth"

os.makedirs(OUT_DIR, exist_ok=True)

def run():
    print("Starting screenshot capture...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Pages to visit
            pages = {
                "Login": f"{BASE_URL}/login",
                "Register": f"{BASE_URL}/register",
                "Forgot_Password": f"{BASE_URL}/forgot-password",
                "Email_Verify": f"{BASE_URL}/email-verify",
                "Reset_Password": f"{BASE_URL}/reset-password",
                "Two_FA_Challenge": f"{BASE_URL}/two-fa-challenge"
            }

            for name, url in pages.items():
                print(f"Visiting {name} at {url}...")
                try:
                    page.goto(url, wait_until="networkidle", timeout=10000)
                    time.sleep(1) # wait for animations
                    page.screenshot(path=f"{OUT_DIR}/{name}.png", full_page=True)
                    print(f"Captured {name}")
                except Exception as e:
                    print(f"Failed to capture {name}: {e}")

            browser.close()
            print("Capture complete.")
    except Exception as e:
        print(f"Playwright error: {e}")

if __name__ == "__main__":
    run()
