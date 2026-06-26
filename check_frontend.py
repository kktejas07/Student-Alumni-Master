import sys
from playwright.sync_api import sync_playwright

def main():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto("http://localhost:8081", timeout=30000)
            print("Title:", page.title())
            page.screenshot(path="frontend_state.png")
            browser.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
