"""
=============================================================================
COMPREHENSIVE QA E2E AUDIT — Student Alumni Platform
=============================================================================
Senior QA Automation Engineer Audit Script
Covers: Auth, Dashboard, Career AI, Jobs, Mentors, Courses, Events,
        Universities, Profile, Settings, Networking, Notifications,
        UI/UX, Performance, Security, Accessibility, API Health

App:  http://localhost:8081  (Expo Web Frontend)
API:  http://localhost:8000  (FastAPI Backend)
=============================================================================
"""
import io, asyncio, json, sys, time, re
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext, Response

# ── Fix Windows UTF-8 ───────────────────────────────────────────────────────────
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── Config ─────────────────────────────────────────────────────────────────────
FRONTEND_URL = "http://localhost:8081"
BACKEND_URL  = "http://localhost:8002"
API_BASE     = f"{BACKEND_URL}/api"

REPORT_DIR   = Path(__file__).parent / "qa_audit_report"
SS_DIR       = REPORT_DIR / "screenshots"
REPORT_DIR.mkdir(parents=True, exist_ok=True)
SS_DIR.mkdir(parents=True, exist_ok=True)

TIMEOUT = 20_000   # 20s default

# ── Test Accounts ───────────────────────────────────────────────────────────────
STUDENT_ACCOUNTS = [
    {"email": "student01@test.com",        "password": "TestPass@123", "label": "Student-01"},
    {"email": "student02@test.com",        "password": "TestPass@123", "label": "Student-02"},
    {"email": "student03@test.com",        "password": "TestPass@123", "label": "Student-03"},
    {"email": "student04@test.com",        "password": "TestPass@123", "label": "Student-04"},
    {"email": "testmjlwsm@test.com",       "password": "TestPass@123", "label": "Student-05"},
    {"email": "beginner1@persona.demo",    "password": "TestPass@123", "label": "Beginner-Student"},
    {"email": "booked1@persona.demo",      "password": "TestPass@123", "label": "Booked-Student"},
    {"email": "incomplete1@persona.demo",  "password": "TestPass@123", "label": "Incomplete-Student"},
]
MENTOR_ACCOUNTS = [
    {"email": "mentor01@test.com",          "password": "TestPass@123", "label": "Mentor-01"},
    {"email": "mentor02@test.com",          "password": "TestPass@123", "label": "Mentor-02"},
    {"email": "mentor-active1@persona.demo","password": "TestPass@123", "label": "Active-Mentor"},
    {"email": "mentor-new1@persona.demo",   "password": "TestPass@123", "label": "New-Mentor"},
]
ADMIN_ACCOUNTS = [
    {"email": "admin@careerpath.app",       "password": "Admin@12345",  "label": "Super-Admin"},
    {"email": "admin-super1@persona.demo",  "password": "TestPass@123", "label": "Persona-Admin"},
]
OTHER_ACCOUNTS = [
    {"email": "alumni01@test.com",          "password": "TestPass@123", "label": "Alumni-01"},
    {"email": "iitb@university.in",         "password": "TestPass@123", "label": "College-IITB"},
]
ALL_ACCOUNTS = STUDENT_ACCOUNTS + MENTOR_ACCOUNTS + ADMIN_ACCOUNTS + OTHER_ACCOUNTS

# ── Global report data ──────────────────────────────────────────────────────────
findings = {
    "critical": [], "high": [], "medium": [], "low": [], "info": []
}
feature_matrix = {}
console_errors_all = []
failed_requests_all = []
perf_metrics = {}
screenshots_taken = []
api_findings = []

def log(msg): print(f"  >> {msg}")
def ok(msg):  print(f"  [PASS] {msg}")
def fail(msg):print(f"  [FAIL] {msg}")

def add_finding(severity: str, module: str, desc: str, fix: str = ""):
    findings[severity].append({"module": module, "desc": desc, "fix": fix})
    print(f"  [FINDING-{severity.upper()}] [{module}] {desc}")

def set_feature(name: str, status: str, notes: str = ""):
    feature_matrix[name] = {"status": status, "notes": notes}

async def ss(page: Page, name: str) -> str:
    path = str(SS_DIR / f"{name}.png")
    try:
        await page.screenshot(path=path, full_page=True, timeout=8000)
        screenshots_taken.append(path)
    except: pass
    return path

async def get_body_text(page: Page) -> str:
    try:
        return (await page.locator("body").inner_text(timeout=5000)).lower()
    except:
        return ""

def kw(text: str, *words) -> bool:
    return any(w in text for w in words)

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — DISCOVERY: Build sitemap from frontend
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_discovery(browser) -> dict:
    print("\n" + "="*60)
    print("PHASE 1: DISCOVERY — Building Sitemap")
    print("="*60)
    sitemap = {"routes": [], "api_endpoints": [], "nav_items": []}

    ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.set_default_timeout(TIMEOUT)
    page = await ctx.new_page()

    # Collect all navigation requests
    nav_urls = set()
    page.on("request", lambda req: nav_urls.add(req.url) if req.resource_type in ("xhr", "fetch") else None)

    try:
        # Load home page
        resp = await page.goto(FRONTEND_URL, wait_until="networkidle", timeout=30000)
        await ss(page, "00_homepage")
        title = await page.title()
        log(f"Homepage: {FRONTEND_URL} | status={resp.status if resp else 'N/A'} | title='{title}'")

        # Check if there's a login redirect
        current = page.url
        log(f"After load, URL = {current}")

        # Grab visible navigation links
        nav_links = await page.locator("nav a, header a, [role='navigation'] a, a[href]").all()
        for link in nav_links[:50]:
            try:
                href = await link.get_attribute("href")
                text = (await link.inner_text()).strip()
                if href and href not in sitemap["routes"]:
                    sitemap["routes"].append(href)
                    if text:
                        sitemap["nav_items"].append({"text": text, "href": href})
            except: pass

        log(f"Found {len(sitemap['routes'])} routes, {len(sitemap['nav_items'])} nav items")
        await ss(page, "00_sitemap_nav")

    except Exception as e:
        log(f"Discovery error: {e}")
    finally:
        await ctx.close()

    # Collect API calls discovered
    sitemap["api_endpoints"] = list(nav_urls)[:50]
    return sitemap


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — AUTHENTICATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_auth(browser) -> dict:
    print("\n" + "="*60)
    print("PHASE 2: AUTHENTICATION TESTS")
    print("="*60)
    auth_results = {}

    ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.set_default_timeout(TIMEOUT)
    page = await ctx.new_page()

    console_errors = []
    page.on("console", lambda m: console_errors.append({"type": m.type, "text": m.text}) if m.type in ("error", "warning") else None)

    try:
        # Navigate to login
        await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_load_state("networkidle", timeout=10000)
        await ss(page, "auth_01_login_page")
        log(f"Login page URL: {page.url}")

        # Check login form elements
        email_field = page.locator("input[type='email'], input[name='email'], input[placeholder*='email' i]").first
        pass_field  = page.locator("input[type='password'], input[name='password']").first
        submit_btn  = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in'), button:has-text('Log in')").first

        email_visible = await email_field.is_visible().then(lambda v: v).catch(lambda: False) if hasattr(await email_field.count(), '__await__') else False
        try:
            email_visible = await email_field.is_visible()
            pass_visible  = await pass_field.is_visible()
            btn_visible   = await submit_btn.is_visible()
        except:
            email_visible = pass_visible = btn_visible = False

        auth_results["login_form_present"] = email_visible and pass_visible and btn_visible
        if auth_results["login_form_present"]:
            ok("Login form elements present (email, password, submit)")
            set_feature("Login Form", "WORKING")
        else:
            fail("Login form elements missing")
            add_finding("high", "Auth", "Login form elements not found — email/password/submit missing")
            set_feature("Login Form", "BROKEN")

        # TEST: Invalid credentials
        print("\n  -- Test: Invalid credentials --")
        try:
            await email_field.fill("invalid@nonexistent.xyz")
            await pass_field.fill("WrongPass123!")
            await submit_btn.click()
            await page.wait_for_timeout(3000)
            body = await get_body_text(page)
            has_error = kw(body, "invalid", "incorrect", "wrong", "error", "failed", "not found")
            auth_results["invalid_creds_error"] = has_error
            if has_error:
                ok("Invalid credentials shows error message")
                set_feature("Auth - Invalid Credentials Rejection", "WORKING")
            else:
                fail("No error shown for invalid credentials")
                add_finding("high", "Auth", "No error message for invalid credentials", "Show 'Invalid email or password' error")
                set_feature("Auth - Invalid Credentials Rejection", "BROKEN")
            await ss(page, "auth_02_invalid_creds")
        except Exception as e:
            auth_results["invalid_creds_error"] = False
            fail(f"Invalid creds test error: {e}")

        # TEST: Empty form submission
        print("\n  -- Test: Empty form submission --")
        try:
            await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(2000)
            submit_btn2 = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
            await submit_btn2.click()
            await page.wait_for_timeout(2000)
            body = await get_body_text(page)
            still_on_login = "login" in page.url or kw(body, "required", "email", "password")
            auth_results["empty_form_validated"] = still_on_login
            if still_on_login:
                ok("Empty form prevented submission / shows validation")
                set_feature("Auth - Empty Form Validation", "WORKING")
            else:
                fail("Empty form not validated - submitted or redirected")
                add_finding("medium", "Auth", "Empty login form can be submitted without validation")
                set_feature("Auth - Empty Form Validation", "BROKEN")
        except Exception as e:
            fail(f"Empty form test: {e}")

        # TEST: Forgot Password link
        print("\n  -- Test: Forgot Password --")
        try:
            await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(2000)
            forgot_link = page.locator("a:has-text('Forgot'), a:has-text('Reset'), button:has-text('Forgot')").first
            forgot_visible = await forgot_link.is_visible()
            auth_results["forgot_password_link"] = forgot_visible
            if forgot_visible:
                ok("Forgot password link visible")
                await forgot_link.click()
                await page.wait_for_timeout(2000)
                forgot_url = page.url
                await ss(page, "auth_03_forgot_password")
                log(f"Forgot password URL: {forgot_url}")
                set_feature("Forgot Password", "WORKING")
            else:
                fail("Forgot password link NOT visible")
                add_finding("medium", "Auth", "No 'Forgot Password' link on login page", "Add forgot password functionality")
                set_feature("Forgot Password", "BROKEN")
        except Exception as e:
            auth_results["forgot_password_link"] = False
            fail(f"Forgot password test: {e}")

        # TEST: Successful login (first working student account)
        print("\n  -- Test: Successful Login --")
        login_success = False
        working_account = None
        for acc in STUDENT_ACCOUNTS[:3]:
            try:
                await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(1500)
                ef = page.locator("input[type='email'], input[name='email']").first
                pf = page.locator("input[type='password']").first
                sb = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
                await ef.fill(acc["email"])
                await pf.fill(acc["password"])
                await sb.click()
                await page.wait_for_timeout(4000)
                post_url = page.url
                body = await get_body_text(page)
                is_logged_in = "login" not in post_url.lower() or kw(body, "dashboard", "home", "welcome", "profile")
                if is_logged_in:
                    login_success = True
                    working_account = acc
                    ok(f"Successful login: {acc['email']} -> {post_url}")
                    await ss(page, "auth_04_login_success")
                    break
                else:
                    log(f"Login failed for {acc['email']} -> {post_url} | body={body[:100]}")
            except Exception as e:
                log(f"Login attempt error ({acc['email']}): {e}")

        auth_results["login_success"] = login_success
        auth_results["working_account"] = working_account
        if login_success:
            set_feature("Authentication - Login", "WORKING")

            # TEST: Session persistence - navigate to another page
            print("\n  -- Test: Session Persistence --")
            try:
                await page.goto(f"{FRONTEND_URL}/", wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)
                still_logged = "login" not in page.url
                auth_results["session_persists"] = still_logged
                if still_logged:
                    ok("Session persists after navigation")
                    set_feature("Session Persistence", "WORKING")
                else:
                    fail("Session lost after navigation")
                    add_finding("critical", "Auth", "Session not persisted - user redirected to login after navigation")
                    set_feature("Session Persistence", "BROKEN")
            except Exception as e:
                fail(f"Session persistence test: {e}")

            # TEST: Logout
            print("\n  -- Test: Logout --")
            try:
                logout_btn = page.locator(
                    "button:has-text('Logout'), button:has-text('Sign out'), "
                    "a:has-text('Logout'), a:has-text('Sign out'), [data-testid*='logout']"
                ).first
                logout_visible = await logout_btn.is_visible()
                if logout_visible:
                    await logout_btn.click()
                    await page.wait_for_timeout(3000)
                    post_logout = page.url
                    is_logged_out = "login" in post_logout or post_logout == f"{FRONTEND_URL}/"
                    auth_results["logout_works"] = is_logged_out
                    await ss(page, "auth_05_logout")
                    if is_logged_out:
                        ok(f"Logout works -> {post_logout}")
                        set_feature("Logout", "WORKING")
                    else:
                        fail(f"Logout didn't redirect to login -> {post_logout}")
                        add_finding("high", "Auth", "Logout button found but does not redirect to login")
                        set_feature("Logout", "PARTIAL")
                else:
                    fail("Logout button NOT found")
                    add_finding("high", "Auth", "No visible logout button - UX issue", "Add logout in header/sidebar menu")
                    set_feature("Logout", "BROKEN")
            except Exception as e:
                fail(f"Logout test: {e}")
        else:
            add_finding("critical", "Auth", "ALL student login attempts failed - system may be down or credentials invalid")
            set_feature("Authentication - Login", "BROKEN")

        # Google Login check
        try:
            await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=10000)
            await page.wait_for_timeout(2000)
            body = await get_body_text(page)
            has_google = kw(body, "google", "continue with google", "sign in with google")
            auth_results["google_login"] = has_google
            if has_google:
                ok("Google OAuth login button present")
                set_feature("Google OAuth Login", "WORKING" if has_google else "NOT_IMPLEMENTED")
            else:
                log("No Google login button found")
                set_feature("Google OAuth Login", "NOT_IMPLEMENTED")
        except: pass

        auth_results["console_errors"] = console_errors
        console_errors_all.extend(console_errors)

    except Exception as e:
        log(f"Auth phase error: {e}")
    finally:
        await ctx.close()

    return auth_results


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — STUDENT DASHBOARD FULL AUDIT (multiple accounts)
# ═══════════════════════════════════════════════════════════════════════════════
async def audit_student_account(browser, acc: dict, is_primary: bool = False) -> dict:
    label = acc["label"]
    print(f"\n  ---- Student Account: {label} ({acc['email']}) ----")
    result = {"account": acc["email"], "label": label, "modules": {}}

    ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.set_default_timeout(TIMEOUT)
    page = await ctx.new_page()

    console_errs = []
    failed_reqs  = []
    slow_reqs    = []

    page.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
    page.on("response", lambda r: failed_reqs.append({"url": r.url, "status": r.status}) if r.status >= 400 else None)

    # Track slow requests
    req_times = {}
    page.on("request",  lambda r: req_times.update({r.url: time.time()}))
    page.on("response", lambda r: slow_reqs.append({"url": r.url, "ms": int((time.time() - req_times.get(r.url, time.time())) * 1000)}) if (time.time() - req_times.get(r.url, time.time())) > 2 else None)

    try:
        # Login
        await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(1500)
        ef = page.locator("input[type='email'], input[name='email']").first
        pf = page.locator("input[type='password']").first
        sb = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
        await ef.fill(acc["email"])
        await pf.fill(acc["password"])
        await sb.click()
        await page.wait_for_timeout(5000)
        post_login_url = page.url

        if "login" in post_login_url.lower():
            body = await get_body_text(page)
            if kw(body, "error", "invalid", "incorrect", "failed"):
                fail(f"Login failed for {label}: wrong credentials or account not approved")
                result["login"] = "FAILED"
                return result
            # Maybe requires onboarding
            if kw(body, "onboard", "setup", "welcome"):
                log(f"{label}: Redirected to onboarding")
                result["login"] = "ONBOARDING"
        else:
            ok(f"Login success: {label}")
            result["login"] = "OK"

        await ss(page, f"student_{label}_01_after_login")

        # ── Dashboard ──────────────────────────────────────────────────────────
        print(f"    [Dashboard]")
        t0 = time.time()
        try:
            # Navigate to dashboard / home
            dash_paths = ["/student-portal", "/dashboard", "/home", "/"]
            dash_loaded = False
            for path in dash_paths:
                try:
                    r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                    if r and r.status < 400:
                        await page.wait_for_timeout(2000)
                        body = await get_body_text(page)
                        if kw(body, "dashboard", "career", "profile", "mentor", "skill", "welcome"):
                            dash_loaded = True
                            break
                except: pass

            load_time = int((time.time() - t0) * 1000)
            body = await get_body_text(page)
            await ss(page, f"student_{label}_02_dashboard")

            has_widgets  = kw(body, "skill", "career", "mentor", "job", "notification", "progress", "streak")
            has_profile  = kw(body, "profile", "name", "welcome")
            has_nav      = await page.locator("nav, [role='navigation'], [class*='sidebar']").count() > 0

            result["modules"]["dashboard"] = {
                "loaded": dash_loaded, "load_ms": load_time,
                "has_widgets": has_widgets, "has_profile": has_profile, "has_nav": has_nav,
                "url": page.url
            }
            if is_primary:
                if dash_loaded and has_widgets:
                    ok(f"Dashboard loaded with widgets ({load_time}ms)")
                    set_feature("Student Dashboard", "WORKING", f"Load: {load_time}ms")
                elif dash_loaded:
                    ok(f"Dashboard loaded but missing widgets")
                    set_feature("Student Dashboard", "PARTIAL", "Missing data widgets")
                    add_finding("medium", "Dashboard", "Dashboard loaded but widget data appears empty", "Check API data population")
                else:
                    fail(f"Dashboard not loaded properly")
                    set_feature("Student Dashboard", "BROKEN")
                    add_finding("high", "Dashboard", "Student dashboard page not loading")

                if load_time > 3000:
                    add_finding("medium", "Performance", f"Dashboard slow load: {load_time}ms (>3s)")
        except Exception as e:
            fail(f"Dashboard error: {e}")
            result["modules"]["dashboard"] = {"loaded": False, "error": str(e)}

        # ── Career AI ─────────────────────────────────────────────────────────
        print(f"    [Career AI]")
        if is_primary:
            try:
                for path in ["/career-ai", "/ai", "/career", "/student-portal/career-ai"]:
                    r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                    if r and r.status < 400:
                        body = await get_body_text(page)
                        if kw(body, "career", "ai", "recommendation", "goal", "skill", "chat", "ask"):
                            await ss(page, f"student_{label}_03_career_ai")
                            has_ai_content = kw(body, "ai", "recommendation", "suggest", "career", "path")
                            if has_ai_content:
                                ok(f"Career AI page loaded")
                                set_feature("Career AI", "WORKING")
                            else:
                                ok(f"Career AI page accessible (minimal content)")
                                set_feature("Career AI", "PARTIAL", "Page loads but AI content minimal")
                            result["modules"]["career_ai"] = {"loaded": True, "url": page.url}
                            break
                else:
                    fail("Career AI page not found at any path")
                    set_feature("Career AI", "NOT_IMPLEMENTED")
                    result["modules"]["career_ai"] = {"loaded": False}
            except Exception as e:
                fail(f"Career AI error: {e}")

        # ── Profile ────────────────────────────────────────────────────────────
        print(f"    [Profile]")
        try:
            for path in ["/profile", "/student-portal/profile", "/my-profile"]:
                try:
                    r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                    if r and r.status < 400:
                        body = await get_body_text(page)
                        if kw(body, "profile", "name", "email", "skill", "about", "bio"):
                            await ss(page, f"student_{label}_04_profile")
                            has_edit = await page.locator("button:has-text('Edit'), input, textarea").count() > 0
                            result["modules"]["profile"] = {"loaded": True, "has_edit": has_edit}
                            if is_primary:
                                ok(f"Profile page loaded (edit: {has_edit})")
                                set_feature("Student Profile", "WORKING" if has_edit else "PARTIAL")
                            break
                except: pass
            else:
                if is_primary:
                    fail("Profile page not found")
                    set_feature("Student Profile", "BROKEN")
        except Exception as e:
            fail(f"Profile error: {e}")

        # ── Jobs / Opportunities ───────────────────────────────────────────────
        print(f"    [Jobs]")
        if is_primary:
            try:
                for path in ["/jobs", "/opportunities", "/student-portal/jobs"]:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if kw(body, "job", "opportunity", "apply", "internship", "position"):
                                await ss(page, f"student_{label}_05_jobs")
                                count = await page.locator("[class*='card'], [class*='job'], [class*='listing']").count()
                                has_filter = await page.locator("select, input[type='search'], [class*='filter']").count() > 0
                                ok(f"Jobs page loaded | cards={count} | filters={has_filter}")
                                set_feature("Jobs/Opportunities", "WORKING" if count > 0 else "PARTIAL")
                                if count == 0:
                                    add_finding("low", "Jobs", "Jobs page loads but no job listings visible", "Check job data seeding")
                                break
                    except: pass
                else:
                    fail("Jobs page not found")
                    set_feature("Jobs/Opportunities", "NOT_IMPLEMENTED")
            except Exception as e:
                fail(f"Jobs error: {e}")

        # ── Mentors ───────────────────────────────────────────────────────────
        print(f"    [Mentors]")
        if is_primary:
            try:
                for path in ["/mentors", "/mentor", "/find-mentor", "/student-portal/mentors"]:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if kw(body, "mentor", "session", "book", "expert"):
                                await ss(page, f"student_{label}_06_mentors")
                                mentor_cards = await page.locator("[class*='mentor'], [class*='card']").count()
                                has_book = kw(body, "book", "schedule", "connect")
                                ok(f"Mentors page loaded | mentor cards={mentor_cards} | book_cta={has_book}")
                                set_feature("Mentor Discovery", "WORKING" if mentor_cards > 0 else "PARTIAL")
                                if not has_book:
                                    add_finding("medium", "Mentors", "Mentor page lacks booking CTA", "Add 'Book Session' button")
                                break
                    except: pass
                else:
                    fail("Mentors page not found")
                    set_feature("Mentor Discovery", "NOT_IMPLEMENTED")
            except Exception as e:
                fail(f"Mentors error: {e}")

        # ── Courses ────────────────────────────────────────────────────────────
        print(f"    [Courses]")
        if is_primary:
            try:
                for path in ["/courses", "/learn", "/student-portal/courses"]:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if kw(body, "course", "learn", "module", "enroll", "lesson"):
                                await ss(page, f"student_{label}_07_courses")
                                ok("Courses page loaded")
                                set_feature("Courses/Learning", "WORKING")
                                break
                    except: pass
                else:
                    fail("Courses page not found")
                    set_feature("Courses/Learning", "NOT_IMPLEMENTED")
            except Exception as e:
                fail(f"Courses error: {e}")

        # ── Events ─────────────────────────────────────────────────────────────
        print(f"    [Events]")
        if is_primary:
            try:
                for path in ["/events", "/student-portal/events"]:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if kw(body, "event", "webinar", "workshop", "hackathon", "rsvp", "register"):
                                await ss(page, f"student_{label}_08_events")
                                ok("Events page loaded")
                                set_feature("Events", "WORKING")
                                break
                    except: pass
                else:
                    fail("Events page not found")
                    set_feature("Events", "NOT_IMPLEMENTED")
            except Exception as e:
                fail(f"Events error: {e}")

        # ── Networking ─────────────────────────────────────────────────────────
        print(f"    [Networking]")
        if is_primary:
            try:
                for path in ["/network", "/connections", "/community", "/student-portal/network"]:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if kw(body, "network", "connect", "community", "peer", "alumni", "connection"):
                                await ss(page, f"student_{label}_09_network")
                                ok("Networking page loaded")
                                set_feature("Networking/Community", "WORKING")
                                break
                    except: pass
                else:
                    fail("Networking page not found")
                    set_feature("Networking/Community", "NOT_IMPLEMENTED")
            except Exception as e:
                fail(f"Networking error: {e}")

        # ── Notifications ──────────────────────────────────────────────────────
        if is_primary:
            try:
                notif_icon = page.locator("[class*='notif'], button[aria-label*='notification'], [data-testid*='notification']").first
                notif_visible = await notif_icon.is_visible()
                set_feature("Notifications", "WORKING" if notif_visible else "PARTIAL")
                if notif_visible:
                    ok("Notification icon visible")
                else:
                    log("Notification icon not found")
                    add_finding("low", "Notifications", "Notification icon/bell not visible in header")
            except: pass

        # ── Settings ──────────────────────────────────────────────────────────
        print(f"    [Settings]")
        if is_primary:
            try:
                for path in ["/settings", "/account", "/preferences", "/student-portal/settings"]:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if kw(body, "setting", "account", "preference", "password", "notification", "privacy"):
                                await ss(page, f"student_{label}_10_settings")
                                ok("Settings page loaded")
                                set_feature("Settings", "WORKING")
                                break
                    except: pass
                else:
                    fail("Settings page not found")
                    set_feature("Settings", "NOT_IMPLEMENTED")
            except Exception as e:
                fail(f"Settings error: {e}")

        # ── Universities ───────────────────────────────────────────────────────
        if is_primary:
            try:
                for path in ["/universities", "/colleges", "/institutions"]:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=10000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if kw(body, "university", "college", "institution", "campus"):
                                await ss(page, f"student_{label}_11_universities")
                                ok("Universities page loaded")
                                set_feature("Universities", "WORKING")
                                break
                    except: pass
                else:
                    set_feature("Universities", "NOT_IMPLEMENTED")
            except: pass

        # ── Search ─────────────────────────────────────────────────────────────
        if is_primary:
            try:
                search_input = page.locator("input[type='search'], input[placeholder*='search' i]").first
                search_visible = await search_input.is_visible()
                if search_visible:
                    await search_input.fill("python")
                    await page.wait_for_timeout(2000)
                    body = await get_body_text(page)
                    has_results = kw(body, "result", "python", "found", "search")
                    ok(f"Search functional: results={has_results}")
                    set_feature("Search", "WORKING" if has_results else "PARTIAL")
                else:
                    log("No global search input found")
                    set_feature("Search", "NOT_IMPLEMENTED")
            except Exception as e:
                fail(f"Search error: {e}")

        # Collect errors
        result["console_errors"] = console_errs
        result["failed_requests"] = failed_reqs
        result["slow_requests"] = slow_reqs
        console_errors_all.extend(console_errs)
        failed_requests_all.extend(failed_reqs)

    except Exception as e:
        fail(f"Student audit error ({label}): {e}")
    finally:
        await ctx.close()

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 4 — MENTOR PORTAL AUDIT
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_mentor(browser) -> dict:
    print("\n" + "="*60)
    print("PHASE 4: MENTOR PORTAL AUDIT")
    print("="*60)
    result = {}

    for acc in MENTOR_ACCOUNTS[:2]:
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.set_default_timeout(TIMEOUT)
        page = await ctx.new_page()
        page.on("console", lambda m: console_errors_all.append({"type": m.type, "text": m.text, "page": "mentor"}) if m.type == "error" else None)

        try:
            # Login
            await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(1500)
            ef = page.locator("input[type='email'], input[name='email']").first
            pf = page.locator("input[type='password']").first
            sb = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
            await ef.fill(acc["email"])
            await pf.fill(acc["password"])
            await sb.click()
            await page.wait_for_timeout(4000)

            if "login" in page.url:
                fail(f"Mentor login failed: {acc['email']}")
                continue

            ok(f"Mentor login success: {acc['email']}")
            await ss(page, f"mentor_{acc['label']}_01_dashboard")

            body = await get_body_text(page)
            has_sessions    = kw(body, "session", "booking", "slot", "schedule", "appointment")
            has_earnings    = kw(body, "earning", "payout", "wallet", "revenue", "income")
            has_profile     = kw(body, "profile", "bio", "expertise", "rating")
            has_avail       = kw(body, "availab", "calendar", "slot", "time")
            is_pending      = kw(body, "pending", "approval", "await", "review")

            result[acc["label"]] = {
                "login": True, "has_sessions": has_sessions, "has_earnings": has_earnings,
                "has_availability": has_avail, "is_pending": is_pending
            }

            set_feature("Mentor Dashboard", "WORKING" if has_sessions else ("PARTIAL" if not is_pending else "PARTIAL"))
            if is_pending:
                add_finding("info", "Mentor", f"Mentor '{acc['email']}' still pending approval")
            if not has_earnings:
                add_finding("low", "Mentor", "Mentor earnings section not visible on dashboard")

            # Check mentor-specific pages
            for path in ["/mentor-portal", "/mentor/dashboard", "/mentor"]:
                try:
                    r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=8000)
                    if r and r.status < 400:
                        body = await get_body_text(page)
                        if kw(body, "mentor", "session", "booking"):
                            await ss(page, f"mentor_{acc['label']}_02_portal")
                            break
                except: pass

            break  # Test first successful mentor

        except Exception as e:
            fail(f"Mentor audit error: {e}")
        finally:
            await ctx.close()

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 5 — ADMIN PORTAL AUDIT
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_admin(browser) -> dict:
    print("\n" + "="*60)
    print("PHASE 5: ADMIN PORTAL AUDIT")
    print("="*60)
    result = {}

    for acc in ADMIN_ACCOUNTS:
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.set_default_timeout(TIMEOUT)
        page = await ctx.new_page()
        page.on("console", lambda m: console_errors_all.append({"type": m.type, "text": m.text}) if m.type == "error" else None)

        try:
            await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(1500)
            ef = page.locator("input[type='email'], input[name='email']").first
            pf = page.locator("input[type='password']").first
            sb = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
            await ef.fill(acc["email"])
            await pf.fill(acc["password"])
            await sb.click()
            await page.wait_for_timeout(4000)

            if "login" in page.url:
                fail(f"Admin login failed: {acc['email']}")
                continue

            ok(f"Admin login success: {acc['email']}")
            await ss(page, f"admin_{acc['label']}_01_dashboard")

            body = await get_body_text(page)
            has_admin_features = kw(body, "admin", "user", "manage", "import", "analytics", "student")
            has_sidebar        = await page.locator("nav, [class*='sidebar'], aside").count() > 0

            # Test admin-specific routes
            admin_modules = {
                "Users": ["/admin/users", "/super-admin-portal/users", "/admin"],
                "Analytics": ["/admin/analytics", "/analytics"],
                "Imports": ["/admin/imports", "/import"],
                "Colleges": ["/admin/colleges", "/colleges"],
                "Settings": ["/admin/settings"],
            }

            result[acc["label"]] = {"login": True, "modules_accessible": {}}
            for mod_name, paths in admin_modules.items():
                for path in paths:
                    try:
                        r = await page.goto(f"{FRONTEND_URL}{path}", wait_until="domcontentloaded", timeout=8000)
                        if r and r.status < 400:
                            body = await get_body_text(page)
                            if not kw(body, "403", "unauthorized", "forbidden", "not found"):
                                ok(f"Admin module '{mod_name}' accessible: {path}")
                                result[acc["label"]]["modules_accessible"][mod_name] = True
                                await ss(page, f"admin_{acc['label']}_{mod_name.lower()}")
                                set_feature(f"Admin - {mod_name}", "WORKING")
                                break
                    except: pass
                else:
                    result[acc["label"]]["modules_accessible"][mod_name] = False
                    set_feature(f"Admin - {mod_name}", "NOT_IMPLEMENTED")

            set_feature("Admin Portal", "WORKING" if has_admin_features else "PARTIAL")
            if has_admin_features:
                ok(f"Admin portal has management features")
            else:
                add_finding("high", "Admin", "Admin dashboard missing management features")
            break

        except Exception as e:
            fail(f"Admin audit error: {e}")
        finally:
            await ctx.close()

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 6 — UI/UX REVIEW
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_uiux(browser, working_acc: dict) -> dict:
    print("\n" + "="*60)
    print("PHASE 6: UI/UX REVIEW")
    print("="*60)
    uiux = {}

    if not working_acc:
        log("No working account for UX review, skipping")
        return uiux

    ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.set_default_timeout(TIMEOUT)
    page = await ctx.new_page()

    try:
        # Login
        await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(1500)
        ef = page.locator("input[type='email'], input[name='email']").first
        pf = page.locator("input[type='password']").first
        sb = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
        await ef.fill(working_acc["email"])
        await pf.fill(working_acc["password"])
        await sb.click()
        await page.wait_for_timeout(4000)

        if "login" in page.url:
            fail("Login failed for UX review")
            return uiux

        # ── Check responsive: Mobile view ──────────────────────────────────────
        await page.set_viewport_size({"width": 375, "height": 812})  # iPhone
        await page.wait_for_timeout(1000)
        body = await get_body_text(page)
        mobile_body = await get_body_text(page)
        await ss(page, "uiux_01_mobile_375")
        mobile_nav_broken = await page.locator("nav").count() == 0 and await page.locator("[class*='menu']").count() == 0
        if mobile_nav_broken:
            add_finding("high", "UI/UX", "Navigation disappears on mobile (375px)", "Add hamburger menu for mobile")
        else:
            ok("Mobile navigation visible at 375px")

        # Tablet view
        await page.set_viewport_size({"width": 768, "height": 1024})
        await page.wait_for_timeout(1000)
        await ss(page, "uiux_02_tablet_768")
        ok("Tablet viewport screenshot taken")

        # Back to desktop
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.wait_for_timeout(1000)

        # ── Check for broken images ─────────────────────────────────────────────
        images = await page.locator("img").all()
        broken_imgs = 0
        for img in images[:30]:
            try:
                src = await img.get_attribute("src")
                if src:
                    nat_w = await img.evaluate("el => el.naturalWidth")
                    if nat_w == 0:
                        broken_imgs += 1
            except: pass
        uiux["broken_images"] = broken_imgs
        if broken_imgs > 0:
            add_finding("medium", "UI/UX", f"{broken_imgs} broken images detected", "Fix image paths/URLs")
        else:
            ok(f"No broken images found (checked {len(images)} images)")

        # ── Check for console errors ────────────────────────────────────────────
        js_errors = []
        page.on("console", lambda m: js_errors.append(m.text) if m.type == "error" else None)
        await page.wait_for_timeout(2000)
        if js_errors:
            add_finding("medium", "UI/UX", f"{len(js_errors)} JS console errors on dashboard")
        uiux["js_errors"] = js_errors

        # ── Check overlapping/overflow ──────────────────────────────────────────
        overflow_els = await page.evaluate("""
            () => {
                const els = document.querySelectorAll('*');
                let count = 0;
                for (const el of Array.from(els).slice(0, 200)) {
                    if (el.scrollWidth > el.clientWidth + 10 && el.clientWidth > 50) count++;
                }
                return count;
            }
        """)
        if overflow_els > 5:
            add_finding("medium", "UI/UX", f"{overflow_els} elements have horizontal overflow", "Fix CSS overflow: hidden")
        else:
            ok(f"Minimal overflow: {overflow_els} elements")
        uiux["overflow_elements"] = overflow_els

        # ── Accessibility: aria labels, alt text ───────────────────────────────
        imgs_without_alt = await page.evaluate("""
            () => document.querySelectorAll('img:not([alt])').length
        """)
        btns_without_label = await page.evaluate("""
            () => document.querySelectorAll('button:not([aria-label]):not([title])').length
        """)
        if imgs_without_alt > 0:
            add_finding("medium", "Accessibility", f"{imgs_without_alt} images missing alt text", "Add alt attributes to all <img>")
        if btns_without_label > 3:
            add_finding("low", "Accessibility", f"{btns_without_label} buttons without aria-label or title")

        uiux["accessibility"] = {"imgs_no_alt": imgs_without_alt, "btns_no_label": btns_without_label}
        ok(f"Accessibility: images_no_alt={imgs_without_alt}, buttons_no_label={btns_without_label}")

        # ── Dark mode check ────────────────────────────────────────────────────
        body_text = await get_body_text(page)
        dark_mode_support = kw(body_text, "dark", "theme", "night") or await page.locator("[class*='dark'], button[aria-label*='dark'], button[aria-label*='theme']").count() > 0
        uiux["dark_mode"] = dark_mode_support
        set_feature("Dark Mode", "WORKING" if dark_mode_support else "NOT_IMPLEMENTED")
        if not dark_mode_support:
            add_finding("low", "UI/UX", "No dark mode toggle detected", "Add dark/light theme toggle")
        else:
            ok("Dark mode support detected")

        await ss(page, "uiux_03_desktop_final")

    except Exception as e:
        fail(f"UI/UX review error: {e}")
    finally:
        await ctx.close()

    return uiux


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 7 — API HEALTH CHECK (backend direct)
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_api_health(browser, working_token: str = None) -> dict:
    print("\n" + "="*60)
    print("PHASE 7: API HEALTH CHECK")
    print("="*60)

    import requests as req_lib
    api_result = {}

    # Get a token first via API
    token = working_token
    if not token:
        for acc in STUDENT_ACCOUNTS[:4]:
            try:
                r = req_lib.post(f"{API_BASE}/auth/login",
                                 json={"email": acc["email"], "password": acc["password"]},
                                 timeout=8)
                if r.status_code == 200:
                    token = r.json().get("access_token")
                    ok(f"API: Got token for {acc['email']}")
                    break
                else:
                    log(f"API: Login {acc['email']} -> {r.status_code}")
            except Exception as e:
                log(f"API: Login error: {e}")

    H = {"Authorization": f"Bearer {token}"} if token else {}

    # Test known API endpoints
    endpoints = [
        ("GET", "/health",                    {},    200, "Health Check"),
        ("GET", "/auth/me",                   H,     200, "Auth: Get Current User"),
        ("GET", "/dashboard",                 H,     200, "Dashboard Data"),
        ("GET", "/jobs",                      H,     200, "Jobs List"),
        ("GET", "/mentors",                   H,     200, "Mentors List"),
        ("GET", "/events",                    H,     200, "Events List"),
        ("GET", "/courses",                   H,     200, "Courses List"),
        ("GET", "/notifications",             H,     200, "Notifications"),
        ("GET", "/profile",                   H,     200, "Profile"),
        ("GET", "/admin/users",               H,     200, "Admin: Users"),
        ("GET", "/student-portal/dashboard",  H,     200, "Student Portal Dashboard"),
    ]

    for method, path, headers, exp_status, name in endpoints:
        try:
            url = f"{API_BASE}{path}"
            r = req_lib.get(url, headers=headers, timeout=8) if method == "GET" else req_lib.post(url, headers=headers, timeout=8)
            status = r.status_code
            latency_ms = int(r.elapsed.total_seconds() * 1000)
            ok_check = status < 500  # Accept 200, 401, 403, 404 but not 500
            api_result[name] = {"status": status, "latency_ms": latency_ms, "url": url}
            api_findings.append({"name": name, "url": url, "status": status, "latency_ms": latency_ms})

            if status == 500:
                add_finding("critical", "API", f"{name} returns 500: {url}", "Fix server error")
                fail(f"API {name}: {status} ({latency_ms}ms)")
            elif status == 200:
                ok(f"API {name}: {status} ({latency_ms}ms)")
                if latency_ms > 2000:
                    add_finding("medium", "Performance", f"API slow: {name} took {latency_ms}ms", "Optimize query or add caching")
            else:
                log(f"API {name}: {status} ({latency_ms}ms) -- non-200 but not 500")
        except Exception as e:
            api_result[name] = {"error": str(e)}
            log(f"API {name}: connection error - {e}")

    return api_result


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 8 — SECURITY CHECKS
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_security(browser) -> dict:
    print("\n" + "="*60)
    print("PHASE 8: SECURITY CHECKS")
    print("="*60)
    sec = {}

    import requests as req_lib

    # Check 1: Protected routes without auth
    protected_routes = ["/admin", "/admin/users", "/dashboard", "/profile", "/settings"]
    for path in protected_routes:
        try:
            r = req_lib.get(f"{API_BASE}{path}", timeout=5)
            if r.status_code == 200:
                add_finding("critical", "Security", f"Route {path} accessible without authentication!", "Add auth middleware")
                sec[f"unprotected_{path}"] = True
            elif r.status_code in (401, 403):
                ok(f"Security: {path} properly protected ({r.status_code})")
                sec[f"protected_{path}"] = True
            else:
                log(f"Security: {path} returns {r.status_code}")
        except Exception as e:
            log(f"Security check error: {e}")

    # Check 2: No secrets in HTML/JS source
    ctx = await browser.new_context()
    ctx.set_default_timeout(15000)
    page = await ctx.new_page()
    source_secrets = []
    try:
        await page.goto(FRONTEND_URL, wait_until="domcontentloaded", timeout=15000)
        content = await page.content()
        secret_patterns = [r"sk-[a-zA-Z0-9]{20,}", r"api_key\s*=\s*['\"][^'\"]{10,}", r"password\s*=\s*['\"][^'\"]{6,}"]
        for pat in secret_patterns:
            matches = re.findall(pat, content, re.I)
            if matches:
                source_secrets.extend(matches)
                add_finding("critical", "Security", f"Possible secret in HTML source: pattern='{pat}'", "Remove secrets from frontend code")

        if not source_secrets:
            ok("No obvious secrets found in frontend source")

        # Check token storage
        local_storage_token = await page.evaluate("() => localStorage.getItem('token') || localStorage.getItem('access_token') || Object.keys(localStorage).join(',')")
        sec["localStorage_keys"] = local_storage_token
        if local_storage_token:
            log(f"LocalStorage keys: {local_storage_token[:100]}")
            if "token" in local_storage_token.lower():
                add_finding("low", "Security", "Auth token stored in localStorage (vulnerable to XSS)", "Consider httpOnly cookies instead")

    except Exception as e:
        log(f"Security source check error: {e}")
    finally:
        await ctx.close()

    sec["secrets_found"] = source_secrets
    return sec


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 9 — PERFORMANCE REVIEW
# ═══════════════════════════════════════════════════════════════════════════════
async def phase_performance(browser, working_acc: dict) -> dict:
    print("\n" + "="*60)
    print("PHASE 9: PERFORMANCE REVIEW")
    print("="*60)
    perf = {}

    if not working_acc:
        log("No working account for performance review")
        return perf

    ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.set_default_timeout(TIMEOUT)
    page = await ctx.new_page()

    large_resources = []
    page.on("response", lambda r: large_resources.append({"url": r.url, "size": r.headers.get("content-length", "0")})
            if int(r.headers.get("content-length", 0) or 0) > 500_000 else None)

    try:
        # Login
        await page.goto(f"{FRONTEND_URL}/login", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(1500)
        ef = page.locator("input[type='email'], input[name='email']").first
        pf = page.locator("input[type='password']").first
        sb = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first
        await ef.fill(working_acc["email"])
        await pf.fill(working_acc["password"])
        await sb.click()
        await page.wait_for_timeout(4000)

        if "login" in page.url:
            fail("Perf review: login failed")
            return perf

        # Measure page load times
        pages_to_measure = [
            ("/", "Homepage/Dashboard"),
            ("/profile", "Profile"),
            ("/jobs", "Jobs"),
            ("/mentors", "Mentors"),
            ("/events", "Events"),
            ("/courses", "Courses"),
        ]

        for path, name in pages_to_measure:
            t0 = time.time()
            try:
                await page.goto(f"{FRONTEND_URL}{path}", wait_until="networkidle", timeout=20000)
                load_ms = int((time.time() - t0) * 1000)
                perf[name] = load_ms
                if load_ms > 5000:
                    add_finding("high", "Performance", f"{name} extremely slow: {load_ms}ms", "Optimize with code splitting / lazy loading")
                elif load_ms > 3000:
                    add_finding("medium", "Performance", f"{name} slow: {load_ms}ms", "Target <2s load time")
                else:
                    ok(f"Perf {name}: {load_ms}ms")
            except Exception as e:
                perf[name] = -1
                log(f"Perf {name}: error - {e}")

        # Check for largest contentful paint via Performance API
        try:
            lcp = await page.evaluate("""
                () => new Promise(resolve => {
                    new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        resolve(entries.length > 0 ? entries[entries.length-1].startTime : 0);
                    }).observe({type: 'largest-contentful-paint', buffered: true});
                    setTimeout(() => resolve(-1), 3000);
                })
            """)
            perf["lcp_ms"] = lcp
            if lcp > 2500:
                add_finding("medium", "Performance", f"LCP: {lcp:.0f}ms (>2500ms threshold)", "Optimize largest contentful paint")
            elif lcp > 0:
                ok(f"LCP: {lcp:.0f}ms")
        except: pass

        perf["large_resources"] = large_resources
        if large_resources:
            for r in large_resources[:5]:
                log(f"Large resource: {r['url'][:80]} ({r['size']} bytes)")

    except Exception as e:
        fail(f"Performance review error: {e}")
    finally:
        await ctx.close()

    return perf


# ═══════════════════════════════════════════════════════════════════════════════
# REPORT GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════
def generate_report(sitemap, auth, student_results, mentor_res, admin_res, uiux, api_res, security, perf) -> str:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Score calculation
    total_features = len(feature_matrix)
    working  = sum(1 for v in feature_matrix.values() if v["status"] == "WORKING")
    partial  = sum(1 for v in feature_matrix.values() if v["status"] == "PARTIAL")
    broken   = sum(1 for v in feature_matrix.values() if v["status"] in ("BROKEN","NOT_IMPLEMENTED"))
    score    = int((working * 1.0 + partial * 0.5) / max(total_features, 1) * 100)
    mvp_pct  = int((working + partial * 0.5) / max(total_features, 1) * 100)

    crit  = len(findings["critical"])
    high  = len(findings["high"])
    med   = len(findings["medium"])
    low   = len(findings["low"])
    info  = len(findings["info"])

    L = []

    # ── Header ──────────────────────────────────────────────────────────────────
    L.append("# QA E2E Audit Report — Student Alumni Platform")
    L.append(f"\n**Generated:** {ts}")
    L.append(f"**App URL:** {FRONTEND_URL}")
    L.append(f"**API URL:** {API_BASE}")
    L.append(f"**Tester:** Automated QA — Senior Engineer Audit")
    L.append("")

    # ── Executive Summary ───────────────────────────────────────────────────────
    L.append("---")
    L.append("## Executive Summary")
    L.append("")
    L.append(f"| Metric | Value |")
    L.append(f"|--------|-------|")
    L.append(f"| **Overall Health Score** | **{score}/100** |")
    L.append(f"| **MVP Readiness** | **{mvp_pct}%** |")
    L.append(f"| Features Tested | {total_features} |")
    L.append(f"| Working | {working} |")
    L.append(f"| Partially Working | {partial} |")
    L.append(f"| Broken / Not Implemented | {broken} |")
    L.append(f"| Critical Issues | {crit} |")
    L.append(f"| High Priority Issues | {high} |")
    L.append(f"| Medium Priority Issues | {med} |")
    L.append(f"| Low Priority Issues | {low} |")
    L.append(f"| Screenshots Captured | {len(screenshots_taken)} |")
    L.append(f"| API Endpoints Tested | {len(api_res)} |")
    L.append(f"| Console Errors Found | {len(console_errors_all)} |")
    L.append(f"| Failed Network Requests | {len(failed_requests_all)} |")
    L.append("")

    # Major findings summary
    L.append("### Major Findings")
    if crit > 0:
        L.append(f"\n**CRITICAL ({crit}):**")
        for f in findings["critical"]:
            L.append(f"- [{f['module']}] {f['desc']}")
    if high > 0:
        L.append(f"\n**HIGH ({high}):**")
        for f in findings["high"]:
            L.append(f"- [{f['module']}] {f['desc']}")

    # ── Sitemap ─────────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Application Sitemap (Discovered)")
    L.append("")
    if sitemap.get("nav_items"):
        L.append("| Menu Item | URL |")
        L.append("|-----------|-----|")
        for item in sitemap["nav_items"][:30]:
            L.append(f"| {item.get('text','—')} | `{item.get('href','—')}` |")
    else:
        L.append("*No navigation items discovered — app may require login to expose navigation.*")

    # ── Feature Matrix ──────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Feature Matrix")
    L.append("")
    L.append("| Feature | Status | Notes |")
    L.append("|---------|--------|-------|")
    status_icons = {
        "WORKING": "✅ Working",
        "PARTIAL": "⚠️ Partial",
        "BROKEN":  "❌ Broken",
        "NOT_IMPLEMENTED": "⬜ Not Found",
    }
    for feat, data in feature_matrix.items():
        icon = status_icons.get(data["status"], data["status"])
        notes = data.get("notes", "")[:80]
        L.append(f"| {feat} | {icon} | {notes} |")

    # ── Authentication ──────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Authentication Review")
    L.append("")
    L.append("| Test | Result | Detail |")
    L.append("|------|--------|--------|")
    L.append(f"| Login Form Present | {'✅' if auth.get('login_form_present') else '❌'} | Email + password + submit |")
    L.append(f"| Invalid Credentials Error | {'✅' if auth.get('invalid_creds_error') else '❌'} | Shows error on wrong password |")
    L.append(f"| Empty Form Validation | {'✅' if auth.get('empty_form_validated') else '❌'} | Prevents empty submission |")
    L.append(f"| Forgot Password Link | {'✅' if auth.get('forgot_password_link') else '❌'} | Visible on login page |")
    L.append(f"| Successful Login | {'✅' if auth.get('login_success') else '❌'} | Account: {auth.get('working_account',{}).get('email','N/A') if auth.get('working_account') else 'N/A'} |")
    L.append(f"| Session Persistence | {'✅' if auth.get('session_persists') else '❌'} | Survives navigation |")
    L.append(f"| Logout | {'✅' if auth.get('logout_works') else '❌'} | Redirects to login |")
    L.append(f"| Google OAuth | {'✅' if auth.get('google_login') else '⬜'} | |")

    # ── Student Accounts ─────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Student Account Testing")
    L.append("")
    L.append("| Account | Login | Dashboard | Profile | Jobs | Mentors | Courses | Events | Console Errors |")
    L.append("|---------|-------|-----------|---------|------|---------|---------|--------|----------------|")
    for r in student_results:
        mods = r.get("modules", {})
        login = "✅" if r.get("login") == "OK" else ("⚠️" if r.get("login") == "ONBOARDING" else "❌")
        dash  = "✅" if mods.get("dashboard", {}).get("loaded") else "❌"
        prof  = "✅" if mods.get("profile", {}).get("loaded") else "❌"
        jobs  = "✅" if mods.get("career_ai", {}).get("loaded") else "—"
        mentors = "—"
        courses = "—"
        events = "—"
        errs = len(r.get("console_errors", []))
        L.append(f"| {r['label']} | {login} | {dash} | {prof} | {jobs} | {mentors} | {courses} | {events} | {errs} |")

    # ── Dashboard ───────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Dashboard Review")
    L.append("")
    primary = next((r for r in student_results if r.get("login") == "OK"), None)
    if primary:
        d = primary.get("modules", {}).get("dashboard", {})
        L.append(f"- **Load Time:** {d.get('load_ms', 'N/A')}ms")
        L.append(f"- **Has Widgets:** {'Yes' if d.get('has_widgets') else 'No'}")
        L.append(f"- **Has Profile Info:** {'Yes' if d.get('has_profile') else 'No'}")
        L.append(f"- **Has Navigation:** {'Yes' if d.get('has_nav') else 'No'}")
        L.append(f"- **URL:** `{d.get('url', 'N/A')}`")
    else:
        L.append("*Dashboard could not be audited — all logins failed.*")

    # Module reviews
    for module_name in ["Career AI Review", "Jobs Review", "Mentors Review", "Courses Review", "Events Review", "Networking Review", "Profile Review", "Settings Review"]:
        feat = module_name.replace(" Review", "")
        status = feature_matrix.get(feat, feature_matrix.get(f"Student {feat}", {".": "."})).get("status", "UNKNOWN")
        L.append(f"\n---")
        L.append(f"## {module_name}")
        L.append(f"\n**Status:** {status_icons.get(status, status)}")
        relevant_findings = [f for f in findings["critical"] + findings["high"] + findings["medium"] if feat.lower() in f["module"].lower() or feat.lower() in f["desc"].lower()]
        if relevant_findings:
            L.append("\n**Findings:**")
            for f in relevant_findings:
                L.append(f"- {f['desc']}")
                if f.get("fix"):
                    L.append(f"  - *Fix: {f['fix']}*")

    # ── Mentor Review ───────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Mentor Portal Review")
    L.append("")
    if mentor_res:
        for label, data in mentor_res.items():
            L.append(f"**Account: {label}**")
            L.append(f"- Login: {'✅' if data.get('login') else '❌'}")
            L.append(f"- Sessions Section: {'✅' if data.get('has_sessions') else '❌'}")
            L.append(f"- Earnings Section: {'✅' if data.get('has_earnings') else '❌'}")
            L.append(f"- Availability: {'✅' if data.get('has_availability') else '❌'}")
            L.append(f"- Status: {'⚠️ Pending Approval' if data.get('is_pending') else '✅ Active'}")
    else:
        L.append("*Mentor portal could not be tested — all mentor logins failed.*")

    # ── Admin Review ─────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Admin Portal Review")
    L.append("")
    if admin_res:
        for label, data in admin_res.items():
            L.append(f"**Account: {label}**")
            L.append(f"- Login: {'✅' if data.get('login') else '❌'}")
            mods = data.get("modules_accessible", {})
            L.append("- Modules:")
            for m, acc in mods.items():
                L.append(f"  - {m}: {'✅' if acc else '❌'}")
    else:
        L.append("*Admin portal could not be tested — all admin logins failed.*")

    # ── UI/UX ────────────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## UI/UX Findings")
    L.append("")
    L.append("| Finding | Severity | Detail | Suggested Fix |")
    L.append("|---------|----------|--------|---------------|")
    uiux_findings = [f for f in findings["critical"] + findings["high"] + findings["medium"] + findings["low"] if "ui" in f["module"].lower() or "ux" in f["module"].lower() or "access" in f["module"].lower()]
    for f in uiux_findings:
        sev = "🔴" if f in findings["critical"] else ("🟠" if f in findings["high"] else ("🟡" if f in findings["medium"] else "🔵"))
        L.append(f"| {f['desc'][:80]} | {sev} | {f['module']} | {f.get('fix','—')[:60]} |")

    if uiux:
        L.append(f"\n**Broken Images:** {uiux.get('broken_images', 'N/A')}")
        L.append(f"**Horizontal Overflow Elements:** {uiux.get('overflow_elements', 'N/A')}")
        a = uiux.get("accessibility", {})
        L.append(f"**Images Missing Alt Text:** {a.get('imgs_no_alt', 'N/A')}")
        L.append(f"**Buttons Without aria-label:** {a.get('btns_no_label', 'N/A')}")
        L.append(f"**Dark Mode Support:** {'Yes' if uiux.get('dark_mode') else 'No'}")

    # ── Performance ──────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Performance Findings")
    L.append("")
    if perf:
        L.append("| Page | Load Time | Rating |")
        L.append("|------|-----------|--------|")
        for name, ms in perf.items():
            if isinstance(ms, (int, float)) and ms > 0:
                rating = "🟢 Fast" if ms < 2000 else ("🟡 Slow" if ms < 4000 else "🔴 Very Slow")
                L.append(f"| {name} | {ms}ms | {rating} |")
        lcp = perf.get("lcp_ms", -1)
        if lcp > 0:
            L.append(f"\n**Largest Contentful Paint (LCP):** {lcp:.0f}ms")

    perf_findings = [f for f in findings["high"] + findings["medium"] if "perf" in f["module"].lower()]
    if perf_findings:
        L.append("\n**Performance Issues:**")
        for f in perf_findings:
            L.append(f"- {f['desc']}")

    # ── Accessibility ─────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Accessibility Findings")
    L.append("")
    acc_findings = [f for f in findings["critical"] + findings["high"] + findings["medium"] + findings["low"] if "access" in f["module"].lower()]
    if acc_findings:
        for f in acc_findings:
            L.append(f"- **{f['module']}:** {f['desc']}")
            if f.get("fix"):
                L.append(f"  - Fix: {f['fix']}")
    else:
        L.append("*No critical accessibility issues detected beyond automated checks.*")

    # ── API Findings ─────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## API Findings")
    L.append("")
    if api_res:
        L.append("| Endpoint | Status | Latency | Result |")
        L.append("|----------|--------|---------|--------|")
        for name, data in api_res.items():
            if isinstance(data, dict) and "error" not in data:
                status = data.get("status", "N/A")
                latency = data.get("latency_ms", "N/A")
                rating = "✅" if status == 200 else ("⚠️" if status < 500 else "❌")
                L.append(f"| {name} | {status} | {latency}ms | {rating} |")
            elif isinstance(data, dict) and "error" in data:
                L.append(f"| {name} | ERR | — | ❌ {data['error'][:50]} |")

    # ── Security ────────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Security Findings")
    L.append("")
    sec_findings = [f for f in findings["critical"] + findings["high"] + findings["medium"] + findings["low"] if "security" in f["module"].lower() or "sec" in f["module"].lower()]
    if sec_findings:
        for f in sec_findings:
            L.append(f"- **[{f['module']}]** {f['desc']}")
            if f.get("fix"):
                L.append(f"  - *Fix: {f['fix']}*")
    if security.get("secrets_found"):
        add_finding("critical", "Security", f"Secrets exposed in source: {security['secrets_found'][:2]}")
        L.append(f"\n**Secrets in source code:** {security['secrets_found']}")
    if security.get("localStorage_keys"):
        L.append(f"\n**LocalStorage keys:** `{security['localStorage_keys'][:100]}`")

    # ── Console Errors ───────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Browser Console Errors")
    L.append("")
    unique_errors = list(set(e.get("text","") if isinstance(e,dict) else str(e) for e in console_errors_all))[:30]
    if unique_errors:
        L.append(f"**{len(unique_errors)} unique console errors detected:**")
        L.append("```")
        for e in unique_errors[:20]:
            L.append(f"  {str(e)[:150]}")
        L.append("```")
    else:
        L.append("*No console errors detected (or login failed before errors could be captured).*")

    # ── Failed Requests ──────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Failed Network Requests")
    L.append("")
    if failed_requests_all:
        L.append("| URL | Status |")
        L.append("|-----|--------|")
        unique_fails = {f["url"]: f["status"] for f in failed_requests_all}.items()
        for url, status in list(unique_fails)[:25]:
            L.append(f"| `{url[:100]}` | {status} |")
    else:
        L.append("*No failed network requests detected.*")

    # ── Recommended Fix Order ────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## Recommended Fix Order")
    L.append("")
    L.append("Fix in this priority order:")
    L.append("")
    idx = 1
    for sev, sev_label in [("critical","🔴 CRITICAL"), ("high","🟠 HIGH"), ("medium","🟡 MEDIUM"), ("low","🔵 LOW")]:
        for f in findings[sev]:
            fix = f.get("fix","").strip()
            L.append(f"{idx}. **{sev_label} [{f['module']}]** — {f['desc']}" + (f" → *{fix}*" if fix else ""))
            idx += 1

    # ── MVP Readiness ────────────────────────────────────────────────────────────
    L.append("\n---")
    L.append("## MVP Readiness Assessment")
    L.append("")
    launch_risk = "HIGH" if crit > 0 else ("MEDIUM" if high > 2 else "LOW")
    L.append(f"| Metric | Value |")
    L.append(f"|--------|-------|")
    L.append(f"| **Current MVP %** | **{mvp_pct}%** |")
    L.append(f"| Remaining Work % | {100 - mvp_pct}% |")
    L.append(f"| Launch Risk | **{launch_risk}** |")
    L.append(f"| Critical Blockers | {crit} |")
    L.append(f"| High Priority Fixes | {high} |")
    L.append("")
    L.append("### Recommended Next Steps")
    L.append("")
    if not auth.get("login_success"):
        L.append("1. **[BLOCKER]** Fix authentication — no accounts could log in during audit")
    if crit > 0:
        L.append(f"2. **[BLOCKER]** Resolve {crit} critical issue(s) before any release")
    if high > 0:
        L.append(f"3. **[HIGH]** Address {high} high-priority issues in next sprint")
    L.append("4. **[MEDIUM]** Complete missing features (see feature matrix)")
    L.append("5. **[QA]** Run automated regression suite after fixes")
    L.append("6. **[PERF]** Load test with 100+ concurrent users before launch")
    L.append("")
    L.append("---")
    L.append(f"\n*Report generated by Automated QA Audit Engine at {ts}*")
    L.append(f"*Screenshots saved to: `{SS_DIR}`*")

    return "\n".join(L)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════
async def main():
    print("=" * 60)
    print("QA E2E AUDIT — Student Alumni Platform")
    print(f"Frontend: {FRONTEND_URL}")
    print(f"Backend:  {API_BASE}")
    print(f"Started:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            slow_mo=150,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--start-maximized"],
        )

        # Phase 1: Discovery
        sitemap = await phase_discovery(browser)

        # Phase 2: Authentication
        auth_results = await phase_auth(browser)
        working_acc = auth_results.get("working_account")

        # Phase 3: Student accounts (test multiple)
        student_results_list = []
        for i, acc in enumerate(STUDENT_ACCOUNTS[:5]):
            r = await audit_student_account(browser, acc, is_primary=(i == 0))
            student_results_list.append(r)

        # Phase 4: Mentor portal
        mentor_results = await phase_mentor(browser)

        # Phase 5: Admin portal
        admin_results = await phase_admin(browser)

        # Phase 6: UI/UX review
        uiux_results = await phase_uiux(browser, working_acc)

        # Phase 7: API health
        api_results = await phase_api_health(browser)

        # Phase 8: Security
        security_results = await phase_security(browser)

        # Phase 9: Performance
        perf_results = await phase_performance(browser, working_acc)

        await browser.close()

    # Generate report
    report_md = generate_report(
        sitemap, auth_results, student_results_list,
        mentor_results, admin_results, uiux_results,
        api_results, security_results, perf_results
    )

    report_path = REPORT_DIR / "QA_E2E_Audit_Report.md"
    report_path.write_text(report_md, encoding="utf-8")

    # Summary JSON
    summary = {
        "generated_at": datetime.now().isoformat(),
        "frontend_url": FRONTEND_URL,
        "api_url": API_BASE,
        "feature_matrix": feature_matrix,
        "findings": {k: len(v) for k, v in findings.items()},
        "all_findings": findings,
        "console_errors_count": len(console_errors_all),
        "failed_requests_count": len(failed_requests_all),
        "screenshots_count": len(screenshots_taken),
    }
    (REPORT_DIR / "qa_audit_summary.json").write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")

    print("\n" + "="*60)
    print("QA AUDIT COMPLETE")
    print(f"  Report: {report_path}")
    print(f"  Screenshots: {len(screenshots_taken)}")
    print(f"  Critical Issues: {len(findings['critical'])}")
    print(f"  High Issues: {len(findings['high'])}")
    print(f"  Medium Issues: {len(findings['medium'])}")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
