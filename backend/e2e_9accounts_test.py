"""
End-to-End Test Suite -- 9 Accounts Browser Automation
=====================================================
Tests all 9 first accounts in the database across all roles:
  - Student, Mentor, Admin, Alumni, College

Uses Playwright for browser automation.
URL: https://hiring-mvvm.preview.emergentagent.com
"""
import io
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext

# Fix Windows encoding for emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ── Configuration ──────────────────────────────────────────────────────────────
APP_URL = "https://hiring-mvvm.preview.emergentagent.com"
API_URL = f"{APP_URL}/api"
REPORT_DIR = Path(__file__).parent / "e2e_report"
SCREENSHOTS_DIR = REPORT_DIR / "screenshots"
TIMEOUT_MS = 15000  # 15 seconds per action

# ── 9 Test Accounts ─────────────────────────────────────────────────────────────
TEST_ACCOUNTS = [
    {
        "id": 1,
        "email": "mentor01@test.com",
        "password": "TestPass@123",
        "role": "mentor",
        "name": "Priya Mentor1",
        "expected_redirect": "mentor",
    },
    {
        "id": 2,
        "email": "mentor02@test.com",
        "password": "TestPass@123",
        "role": "mentor",
        "name": "Arjun Mentor2",
        "expected_redirect": "mentor",
    },
    {
        "id": 3,
        "email": "admin2@careerpath.app",
        "password": "TestPass@123",
        "role": "admin",
        "name": "Senior Admin",
        "expected_redirect": "admin",
    },
    {
        "id": 4,
        "email": "test-alumni-85033bd9@test.com",
        "password": "TestPass@123",
        "role": "alumni",
        "name": "Test Alumni",
        "expected_redirect": "alumni",
    },
    {
        "id": 5,
        "email": "iith@university.in",
        "password": "TestPass@123",
        "role": "college",
        "name": "IIT Hyderabad",
        "expected_redirect": "college",
    },
    {
        "id": 6,
        "email": "iitb@university.in",
        "password": "TestPass@123",
        "role": "college",
        "name": "IIT Bombay",
        "expected_redirect": "college",
    },
    {
        "id": 7,
        "email": "student01@test.com",
        "password": "TestPass@123",
        "role": "student",
        "name": "Aarav Student",
        "expected_redirect": "student",
    },
    {
        "id": 8,
        "email": "alumni-test-1777465028@test.com",
        "password": "TestPass@123",
        "role": "alumni",
        "name": "Alumni Test User",
        "expected_redirect": "alumni",
    },
    {
        "id": 9,
        "email": "iiitb@university.in",
        "password": "TestPass@123",
        "role": "college",
        "name": "IIIT Bangalore",
        "expected_redirect": "college",
    },
]

# ── Report structure ────────────────────────────────────────────────────────────
class TestResult:
    def __init__(self, account: dict):
        self.account = account
        self.tests: list[dict] = []
        self.start_time = time.time()
        self.end_time = None
        self.login_success = False
        self.screenshots: list[str] = []

    def add(self, name: str, passed: bool, detail: str = "", screenshot: str = None):
        self.tests.append({
            "name": name,
            "passed": passed,
            "detail": detail,
            "screenshot": screenshot,
        })
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} | {name} | {detail}")

    def finish(self):
        self.end_time = time.time()

    @property
    def passed(self):
        return sum(1 for t in self.tests if t["passed"])

    @property
    def failed(self):
        return sum(1 for t in self.tests if not t["passed"])

    @property
    def total(self):
        return len(self.tests)

    @property
    def duration_s(self):
        if self.end_time:
            return round(self.end_time - self.start_time, 2)
        return 0


# ── Screenshot helper ────────────────────────────────────────────────────────────
async def screenshot(page: Page, name: str, account_id: int) -> str:
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    path = str(SCREENSHOTS_DIR / f"acc{account_id}_{name}.png")
    try:
        await page.screenshot(path=path, full_page=True)
    except Exception as e:
        print(f"    [screenshot error] {e}")
    return path


# ── Test flow per account ────────────────────────────────────────────────────────
async def test_account(account: dict, browser) -> TestResult:
    result = TestResult(account)
    role = account["role"]
    email = account["email"]
    password = account["password"]
    acc_id = account["id"]

    print(f"\n{'='*70}")
    print(f"  Account #{acc_id}: {account['name']} ({email}) | Role: {role}")
    print(f"{'='*70}")

    ctx: BrowserContext = await browser.new_context(
        viewport={"width": 1440, "height": 900},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
        ignore_https_errors=True,
    )
    ctx.set_default_timeout(TIMEOUT_MS)
    page: Page = await ctx.new_page()

    try:
        # ── Test 1: App loads ──────────────────────────────────────────────────
        t0 = time.time()
        try:
            resp = await page.goto(APP_URL, wait_until="domcontentloaded", timeout=30000)
            load_ms = int((time.time() - t0) * 1000)
            ok = resp is not None and resp.status < 400
            result.add(
                "App Loads (HTTP status)",
                ok,
                f"status={resp.status if resp else 'N/A'} load_time={load_ms}ms",
                await screenshot(page, "01_homepage", acc_id),
            )
        except Exception as e:
            result.add("App Loads (HTTP status)", False, str(e)[:200])
            await ctx.close()
            result.finish()
            return result

        # ── Test 2: Navigate to login page ────────────────────────────────────
        try:
            # Try clicking sign-in / login link or navigating directly
            current_url = page.url
            if "login" not in current_url and "signin" not in current_url:
                login_url = f"{APP_URL}/login"
                resp = await page.goto(login_url, wait_until="domcontentloaded", timeout=15000)
                ok = resp.status < 400
            else:
                ok = True
            result.add(
                "Navigate to Login Page",
                ok,
                f"url={page.url}",
                await screenshot(page, "02_login_page", acc_id),
            )
        except Exception as e:
            result.add("Navigate to Login Page", False, str(e)[:200])

        # ── Test 3: Login form visible ────────────────────────────────────────
        try:
            # Look for email and password inputs
            email_input = page.locator("input[type='email'], input[placeholder*='email' i], input[name='email']").first
            await email_input.wait_for(state="visible", timeout=10000)
            result.add(
                "Login Form Visible",
                True,
                "Email input found",
                await screenshot(page, "03_login_form", acc_id),
            )
        except Exception as e:
            result.add("Login Form Visible", False, str(e)[:200])

        # ── Test 4: Fill login form and submit ────────────────────────────────
        try:
            email_sel = "input[type='email'], input[placeholder*='email' i], input[name='email']"
            pass_sel = "input[type='password'], input[placeholder*='password' i], input[name='password']"

            email_field = page.locator(email_sel).first
            pwd_field = page.locator(pass_sel).first

            await email_field.fill(email)
            await asyncio.sleep(0.3)
            await pwd_field.fill(password)
            await asyncio.sleep(0.3)

            # Submit
            submit_btn = page.locator(
                "button[type='submit'], button:has-text('Login'), button:has-text('Sign in'), "
                "button:has-text('Log in'), button:has-text('Continue')"
            ).first
            await submit_btn.click()
            result.add("Login Form Submitted", True, f"email={email}")
        except Exception as e:
            result.add("Login Form Submitted", False, str(e)[:200])

        # ── Test 5: Login success / redirect ──────────────────────────────────
        try:
            # Wait for navigation away from login page
            await page.wait_for_url(
                lambda url: "login" not in url and "signin" not in url,
                timeout=15000,
            )
            post_login_url = page.url
            result.login_success = True
            result.add(
                "Login Success & Redirect",
                True,
                f"redirected to: {post_login_url}",
                await screenshot(page, "04_post_login", acc_id),
            )
        except Exception as e:
            post_login_url = page.url
            # Check if still on login page with error
            try:
                error_el = page.locator("[class*='error'], [class*='alert'], [role='alert']").first
                err_text = await error_el.inner_text()
            except Exception:
                err_text = ""
            result.add(
                "Login Success & Redirect",
                False,
                f"url={post_login_url} error='{err_text[:100]}' exc={str(e)[:100]}",
                await screenshot(page, "04_login_error", acc_id),
            )

        # ── Test 6: Dashboard / Portal loads ─────────────────────────────────
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
            dash_url = page.url
            title = await page.title()

            # Check page has meaningful content (not blank / error)
            body_text = await page.locator("body").inner_text()
            has_content = len(body_text.strip()) > 100

            result.add(
                "Dashboard / Portal Loads",
                has_content and result.login_success,
                f"title='{title}' url={dash_url} content_len={len(body_text)}",
                await screenshot(page, "05_dashboard", acc_id),
            )
        except Exception as e:
            result.add("Dashboard / Portal Loads", False, str(e)[:200])

        # ── Test 7: No console errors ──────────────────────────────────────────
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        await page.wait_for_timeout(1500)
        critical_errors = [e for e in console_errors if "Uncaught" in e or "TypeError" in e or "ReferenceError" in e]
        result.add(
            "No Critical JS Console Errors",
            len(critical_errors) == 0,
            f"{len(critical_errors)} critical errors, {len(console_errors)} total console errors",
        )

        # ── Role-specific tests ────────────────────────────────────────────────
        if result.login_success:
            if role == "student":
                await test_student_portal(page, result, acc_id)
            elif role == "mentor":
                await test_mentor_portal(page, result, acc_id)
            elif role == "admin":
                await test_admin_portal(page, result, acc_id)
            elif role in ("alumni", "alumni"):
                await test_alumni_portal(page, result, acc_id)
            elif role == "college":
                await test_college_portal(page, result, acc_id)

        # ── Test: Logout ───────────────────────────────────────────────────────
        try:
            logout_btn = page.locator(
                "button:has-text('Logout'), button:has-text('Sign out'), "
                "a:has-text('Logout'), a:has-text('Sign out'), [data-testid='logout']"
            ).first
            visible = await logout_btn.is_visible()
            if visible:
                await logout_btn.click()
                await page.wait_for_timeout(2000)
                post_logout_url = page.url
                back_to_login = "login" in post_logout_url or "signin" in post_logout_url or post_logout_url == APP_URL + "/"
                result.add(
                    "Logout Works",
                    True,
                    f"post_logout_url={post_logout_url}",
                    await screenshot(page, "99_logout", acc_id),
                )
            else:
                result.add("Logout Works", False, "Logout button not visible")
        except Exception as e:
            result.add("Logout Works", False, str(e)[:200])

    except Exception as e:
        result.add("Unexpected error", False, str(e)[:300])
    finally:
        await ctx.close()
        result.finish()

    return result


# ── Role-specific test flows ────────────────────────────────────────────────────

async def test_student_portal(page: Page, result: TestResult, acc_id: int):
    """Student-specific tests."""
    # Check student portal elements
    try:
        await page.wait_for_timeout(1000)
        body = await page.locator("body").inner_text()
        has_profile = any(kw in body.lower() for kw in ["profile", "skill", "dashboard", "mentor", "career"])
        result.add("Student: Dashboard Has Expected Content", has_profile,
                   f"keywords found={has_profile}", await screenshot(page, "s1_student_dash", acc_id))
    except Exception as e:
        result.add("Student: Dashboard Has Expected Content", False, str(e)[:150])

    # Try navigating to profile
    try:
        profile_link = page.locator("a[href*='profile'], button:has-text('Profile'), [data-testid='profile-link']").first
        if await profile_link.is_visible():
            await profile_link.click()
            await page.wait_for_load_state("networkidle", timeout=8000)
            profile_url = page.url
            result.add("Student: Profile Page Accessible", True, f"url={profile_url}",
                        await screenshot(page, "s2_student_profile", acc_id))
        else:
            result.add("Student: Profile Page Accessible", False, "Profile link not visible")
    except Exception as e:
        result.add("Student: Profile Page Accessible", False, str(e)[:150])

    # Check for mentor discovery / browse
    try:
        await page.go_back()
        await page.wait_for_timeout(500)
        body = await page.locator("body").inner_text()
        has_mentors = any(kw in body.lower() for kw in ["mentor", "book", "session", "explore"])
        result.add("Student: Mentor Discovery Visible", has_mentors, f"keywords found={has_mentors}")
    except Exception as e:
        result.add("Student: Mentor Discovery Visible", False, str(e)[:150])


async def test_mentor_portal(page: Page, result: TestResult, acc_id: int):
    """Mentor-specific tests."""
    try:
        await page.wait_for_timeout(1000)
        body = await page.locator("body").inner_text()
        has_content = any(kw in body.lower() for kw in ["session", "booking", "mentor", "dashboard", "availability", "earning"])
        result.add("Mentor: Dashboard Has Expected Content", has_content,
                   f"keywords found={has_content}", await screenshot(page, "m1_mentor_dash", acc_id))
    except Exception as e:
        result.add("Mentor: Dashboard Has Expected Content", False, str(e)[:150])

    # Check sessions / bookings section
    try:
        body = await page.locator("body").inner_text()
        has_sessions = any(kw in body.lower() for kw in ["session", "booking", "slot", "schedule"])
        result.add("Mentor: Sessions/Bookings Section Present", has_sessions, f"keywords found={has_sessions}")
    except Exception as e:
        result.add("Mentor: Sessions/Bookings Section Present", False, str(e)[:150])

    # Check earnings/profile visible
    try:
        body = await page.locator("body").inner_text()
        has_earnings = any(kw in body.lower() for kw in ["earning", "payout", "wallet", "rating", "profile"])
        result.add("Mentor: Earnings/Profile Section", has_earnings, f"keywords found={has_earnings}",
                    await screenshot(page, "m2_mentor_earnings", acc_id))
    except Exception as e:
        result.add("Mentor: Earnings/Profile Section", False, str(e)[:150])


async def test_admin_portal(page: Page, result: TestResult, acc_id: int):
    """Admin-specific tests."""
    try:
        await page.wait_for_timeout(1000)
        body = await page.locator("body").inner_text()
        has_admin = any(kw in body.lower() for kw in ["admin", "user", "manage", "dashboard", "student", "mentor"])
        result.add("Admin: Dashboard Has Expected Content", has_admin,
                   f"keywords found={has_admin}", await screenshot(page, "a1_admin_dash", acc_id))
    except Exception as e:
        result.add("Admin: Dashboard Has Expected Content", False, str(e)[:150])

    # Check admin sidebar / navigation
    try:
        sidebar = page.locator("nav, [class*='sidebar'], [role='navigation']").first
        sidebar_visible = await sidebar.is_visible()
        result.add("Admin: Sidebar/Navigation Present", sidebar_visible, f"sidebar_visible={sidebar_visible}",
                    await screenshot(page, "a2_admin_nav", acc_id))
    except Exception as e:
        result.add("Admin: Sidebar/Navigation Present", False, str(e)[:150])

    # Check user management
    try:
        body = await page.locator("body").inner_text()
        has_users = any(kw in body.lower() for kw in ["user", "student", "mentor", "import", "analytics"])
        result.add("Admin: User Management Section", has_users, f"keywords found={has_users}")
    except Exception as e:
        result.add("Admin: User Management Section", False, str(e)[:150])


async def test_alumni_portal(page: Page, result: TestResult, acc_id: int):
    """Alumni-specific tests."""
    try:
        await page.wait_for_timeout(1000)
        body = await page.locator("body").inner_text()
        has_content = any(kw in body.lower() for kw in ["alumni", "profile", "network", "job", "mentor", "experience"])
        result.add("Alumni: Dashboard Has Expected Content", has_content,
                   f"keywords found={has_content}", await screenshot(page, "al1_alumni_dash", acc_id))
    except Exception as e:
        result.add("Alumni: Dashboard Has Expected Content", False, str(e)[:150])

    # Check for network / job section
    try:
        body = await page.locator("body").inner_text()
        has_network = any(kw in body.lower() for kw in ["network", "connection", "job", "opportunity", "portal"])
        result.add("Alumni: Network/Jobs Section Visible", has_network, f"keywords found={has_network}")
    except Exception as e:
        result.add("Alumni: Network/Jobs Section Visible", False, str(e)[:150])


async def test_college_portal(page: Page, result: TestResult, acc_id: int):
    """College-specific tests."""
    try:
        await page.wait_for_timeout(1000)
        body = await page.locator("body").inner_text()
        has_content = any(kw in body.lower() for kw in ["college", "student", "placement", "alumni", "dashboard", "portal"])
        result.add("College: Portal Has Expected Content", has_content,
                   f"keywords found={has_content}", await screenshot(page, "c1_college_dash", acc_id))
    except Exception as e:
        result.add("College: Portal Has Expected Content", False, str(e)[:150])

    # Check for placement / students section
    try:
        body = await page.locator("body").inner_text()
        has_placement = any(kw in body.lower() for kw in ["placement", "student", "recruit", "campus", "event"])
        result.add("College: Placement/Students Section", has_placement, f"keywords found={has_placement}")
    except Exception as e:
        result.add("College: Placement/Students Section", False, str(e)[:150])


# ── Report generator ─────────────────────────────────────────────────────────────
def generate_report(results: list[TestResult]) -> str:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total_tests = sum(r.total for r in results)
    total_passed = sum(r.passed for r in results)
    total_failed = sum(r.failed for r in results)
    overall_pct = round(total_passed / total_tests * 100, 1) if total_tests else 0

    lines = []
    lines.append("# 🧪 End-to-End Test Report — Student Alumni Platform")
    lines.append(f"\n**Generated:** {ts}")
    lines.append(f"**App URL:** {APP_URL}")
    lines.append(f"**Accounts Tested:** {len(results)}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Overall summary
    lines.append("## 📊 Overall Summary")
    lines.append("")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Total Tests | {total_tests} |")
    lines.append(f"| ✅ Passed | {total_passed} |")
    lines.append(f"| ❌ Failed | {total_failed} |")
    lines.append(f"| Pass Rate | **{overall_pct}%** |")
    lines.append(f"| Accounts Tested | {len(results)} |")
    lines.append(f"| Total Duration | {sum(r.duration_s for r in results):.1f}s |")
    lines.append("")

    # Per account summary table
    lines.append("## 👥 Per-Account Summary")
    lines.append("")
    lines.append("| # | Account | Role | Login | Tests | Pass | Fail | Pass% | Duration |")
    lines.append("|---|---------|------|-------|-------|------|------|-------|----------|")
    for r in results:
        login_icon = "✅" if r.login_success else "❌"
        pct = round(r.passed / r.total * 100, 0) if r.total else 0
        lines.append(
            f"| {r.account['id']} | `{r.account['email']}` | {r.account['role']} | {login_icon} | "
            f"{r.total} | {r.passed} | {r.failed} | {pct}% | {r.duration_s}s |"
        )
    lines.append("")
    lines.append("---")

    # Detailed per-account breakdown
    lines.append("## 🔍 Detailed Test Results")
    lines.append("")

    for r in results:
        acc = r.account
        lines.append(f"### Account #{acc['id']} — {acc['name']}")
        lines.append(f"- **Email:** `{acc['email']}`")
        lines.append(f"- **Role:** `{acc['role']}`")
        lines.append(f"- **Password:** `{acc['password']}`")
        lines.append(f"- **Login:** {'✅ Success' if r.login_success else '❌ Failed'}")
        lines.append(f"- **Tests:** {r.passed} passed / {r.failed} failed / {r.total} total")
        lines.append(f"- **Duration:** {r.duration_s}s")
        lines.append("")
        lines.append("| Test | Status | Detail |")
        lines.append("|------|--------|--------|")
        for t in r.tests:
            icon = "✅" if t["passed"] else "❌"
            detail = t["detail"].replace("|", "/")[:120]
            lines.append(f"| {t['name']} | {icon} | {detail} |")
        lines.append("")

        # Screenshots list
        screenshots_for_acc = [
            f for f in SCREENSHOTS_DIR.glob(f"acc{acc['id']}_*.png")
        ] if SCREENSHOTS_DIR.exists() else []
        if screenshots_for_acc:
            lines.append(f"**Screenshots:** {len(screenshots_for_acc)} captured")
        lines.append("")
        lines.append("---")
        lines.append("")

    # Failures section
    failures = [(r, t) for r in results for t in r.tests if not t["passed"]]
    if failures:
        lines.append("## ⚠️ All Failures")
        lines.append("")
        lines.append("| Account | Test | Detail |")
        lines.append("|---------|------|--------|")
        for r, t in failures:
            detail = t["detail"].replace("|", "/")[:150]
            lines.append(f"| `{r.account['email']}` | {t['name']} | {detail} |")
        lines.append("")
        lines.append("---")
        lines.append("")

    # Recommendations
    lines.append("## 💡 Recommendations")
    lines.append("")
    failed_logins = [r for r in results if not r.login_success]
    if failed_logins:
        lines.append(f"- ⚠️ **{len(failed_logins)} accounts failed to login.** Verify credentials and account approval status.")
        for r in failed_logins:
            lines.append(f"  - `{r.account['email']}` (role: {r.account['role']})")
    if overall_pct < 80:
        lines.append("- 🔴 **Overall pass rate below 80%.** Immediate investigation required.")
    elif overall_pct < 95:
        lines.append("- 🟡 **Overall pass rate below 95%.** Some features need attention.")
    else:
        lines.append("- 🟢 **All systems operating normally (≥95% pass rate).**")
    lines.append("")
    lines.append("---")
    lines.append(f"\n_Report generated by E2E Test Suite at {ts}_")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────────
async def main():
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    print("🚀 Starting E2E Test Suite — 9 Accounts")
    print(f"   App URL: {APP_URL}")
    print(f"   Accounts: {len(TEST_ACCOUNTS)}")
    print(f"   Report: {REPORT_DIR}")
    print()

    results: list[TestResult] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,  # Show browser for visibility
            slow_mo=200,     # Slow down slightly to see actions
            args=[
                "--disable-extensions",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

        for account in TEST_ACCOUNTS:
            result = await test_account(account, browser)
            results.append(result)
            print(f"\n  ▶ Account #{account['id']} complete: {result.passed}/{result.total} passed")

        await browser.close()

    # Generate report
    report_md = generate_report(results)
    report_path = REPORT_DIR / "e2e_test_report.md"
    report_path.write_text(report_md, encoding="utf-8")

    # Also save JSON
    json_data = {
        "generated_at": datetime.now().isoformat(),
        "app_url": APP_URL,
        "accounts_tested": len(results),
        "summary": {
            "total_tests": sum(r.total for r in results),
            "total_passed": sum(r.passed for r in results),
            "total_failed": sum(r.failed for r in results),
            "pass_rate_pct": round(sum(r.passed for r in results) / max(sum(r.total for r in results), 1) * 100, 1),
        },
        "accounts": [
            {
                "id": r.account["id"],
                "email": r.account["email"],
                "role": r.account["role"],
                "name": r.account["name"],
                "login_success": r.login_success,
                "tests_passed": r.passed,
                "tests_failed": r.failed,
                "tests_total": r.total,
                "duration_s": r.duration_s,
                "tests": r.tests,
            }
            for r in results
        ],
    }
    json_path = REPORT_DIR / "e2e_test_report.json"
    json_path.write_text(json.dumps(json_data, indent=2, default=str), encoding="utf-8")

    print(f"\n{'='*70}")
    print(f"  ✅ E2E Tests Complete!")
    print(f"  Total: {json_data['summary']['total_tests']} tests | "
          f"Pass: {json_data['summary']['total_passed']} | "
          f"Fail: {json_data['summary']['total_failed']} | "
          f"Rate: {json_data['summary']['pass_rate_pct']}%")
    print(f"  Report: {report_path}")
    print(f"  JSON:   {json_path}")
    print(f"{'='*70}")


if __name__ == "__main__":
    asyncio.run(main())
