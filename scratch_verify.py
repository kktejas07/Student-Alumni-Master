from playwright.sync_api import sync_playwright
import time

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        errors = []
        page.on("console", lambda msg: errors.append(f"Console {msg.type}: {msg.text}") if msg.type in ['error', 'warning'] else None)
        page.on("pageerror", lambda exc: errors.append(f"Runtime error: {exc}"))

        base_url = "http://localhost:8081"
        
        routes = [
            "/login",
            "/register",
            "/forgot-password"
        ]
        
        for route in routes:
            url = f"{base_url}{route}"
            print(f"Loading {url}...")
            page.goto(url, wait_until="networkidle", timeout=15000)
            time.sleep(1)
            
            if route == "/login":
                email_input = page.locator("[data-testid='login-email']")
                submit_btn = page.locator("[data-testid='login-submit']")
                print(f"Login elements present: email={email_input.is_visible()}, submit={submit_btn.is_visible()}")
            
            elif route == "/forgot-password":
                email_input = page.locator("[data-testid='forgot-email']")
                send_btn = page.locator("[data-testid='forgot-send-code']")
                print(f"Forgot elements present: email={email_input.is_visible()}, send={send_btn.is_visible()}")
                
                # simulate going to OTP
                email_input.fill("test@alumni.edu")
                # we won't click send since it hits backend, but we verified the page loads
                
        browser.close()
        
        if errors:
            print("Errors encountered:")
            for e in errors:
                print(e)
        else:
            print("No console or runtime errors!")

if __name__ == "__main__":
    verify()
