import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright
import json, time

creds = json.load(open('test_credentials.json'))
TOKEN = creds['token']

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.on('console', lambda m: print(f'[{m.type}] {m.text}'.encode('utf-8', 'replace').decode('utf-8')))
    page.on('pageerror', lambda e: print(f'PAGE ERROR: {e.message}\n{e.stack}'))
    
    page.goto('http://localhost:8081')
    time.sleep(1)
    page.evaluate(f'''() => {{
        localStorage.setItem("scd_access_token", "{TOKEN}");
        localStorage.setItem("scd_refresh_token", "{TOKEN}");
    }}''')
    
    print('Navigating...')
    page.goto('http://localhost:8081/career-ai', wait_until='networkidle')
    time.sleep(3)
    
    browser.close()
