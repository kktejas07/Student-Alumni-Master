from playwright.sync_api import sync_playwright
import time
import json
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    # Login
    page.goto('http://localhost:8081')
    try:
        page.locator('text=Log In').click(timeout=3000)
        page.fill('input[type="email"]', 'acceptance_test@example.com')
        page.fill('input[type="password"]', 'password123')
        page.locator('button:has-text("Sign In")').click()
        page.wait_for_selector('text=AI Career Roadmap', timeout=8000)
    except:
        pass
    page.goto('http://localhost:8081/career-ai')
    time.sleep(3)
    text = page.inner_text("body")
    with open("body_text.txt", "w", encoding="utf-8") as f:
        f.write(text)
    browser.close()
