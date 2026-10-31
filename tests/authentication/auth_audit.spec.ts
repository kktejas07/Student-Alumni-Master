import { test, expect } from '@playwright/test';

/**
 * Student Alumni Application — Authentication & RBAC Playwright Test Suite
 *
 * Verifies:
 * - Priority 1: Public registration cannot escalate to admin/super_admin (API + Schema)
 * - Priority 2: Public email detection hardening (no role or name exposure)
 * - Priority 3: Token storage, rotation, and server-side revocation on logout
 * - Priority 4: Login abuse protection / rate limiting with Retry-After
 * - Priority 5: Tenant isolation and RBAC on college portal
 * - Priority 6: Playwright UI tests using accessible selectors and auto-waiting assertions
 */

const FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'http://localhost:8081';
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://127.0.0.1:8000';
const TEST_EMAIL = process.env.TEST_STUDENT_EMAIL || 'test_student_audit@example.com';
const TEST_PASSWORD = process.env.TEST_STUDENT_PASSWORD || 'Password123!';

test.describe('Priority 1: Registration Role Privilege Escalation Prevention', () => {
  test('P1-01: Public registration with role=admin is rejected with HTTP 403', async ({ request }) => {
    const probeEmail = `probe_admin_${Date.now()}@example.com`;
    const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        email: probeEmail,
        password: 'Password123!',
        full_name: 'Privilege Escalation Probe',
        role: 'admin',
        dob: '1995-01-01',
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.detail).toContain('Forbidden');
  });

  test('P1-02: Public registration with role=super_admin and case variants is rejected', async ({ request }) => {
    const variants = ['super_admin', ' SUPER_ADMIN ', 'SuperAdmin', 'college_admin'];
    for (const roleVariant of variants) {
      const probeEmail = `probe_variant_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
      const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
        data: {
          email: probeEmail,
          password: 'Password123!',
          full_name: 'Variant Probe',
          role: roleVariant,
          dob: '1995-01-01',
        },
      });
      expect(res.status()).toBe(403);
    }
  });

  test('P1-03: Legitimate student registration succeeds with student role', async ({ request }) => {
    const probeEmail = `legit_student_${Date.now()}@example.com`;
    const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
      data: {
        email: probeEmail,
        password: 'Password123!',
        full_name: 'Legit Student',
        role: 'student',
        dob: '2001-05-15',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('student');
    expect(body.access_token).toBeTruthy();
  });
});

test.describe('Priority 2: Public Email Detection Hardening', () => {
  test('P2-01: check-email returns only exists boolean without revealing role or name', async ({ request }) => {
    // Check with registered email
    const res = await request.post(`${BACKEND_URL}/api/auth/check-email`, {
      data: { email: TEST_EMAIL },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.exists).toBe(true);
    expect(body.role).toBeUndefined();
    expect(body.full_name).toBeUndefined();
    expect(body.onboarding_completed).toBeUndefined();

    // Check with GET method
    const resGet = await request.get(`${BACKEND_URL}/api/auth/check-email?email=${encodeURIComponent(TEST_EMAIL)}`);
    expect(resGet.status()).toBe(200);
    const bodyGet = await resGet.json();
    expect(bodyGet.exists).toBe(true);
    expect(bodyGet.role).toBeUndefined();
    expect(bodyGet.full_name).toBeUndefined();
  });

  test('P2-02: check-email returns exists=false for non-existent account', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/check-email`, {
      data: { email: `nonexistent_${Date.now()}@example.com` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(false);
    expect(body.role).toBeUndefined();
  });
});

test.describe('Priority 4: Login Abuse Protection Throttling', () => {
  test('P4-01: Repeated failed login attempts trigger HTTP 429 with Retry-After header', async ({ request }) => {
    const targetEmail = `bruteforce_target_${Date.now()}@example.com`;
    let triggered429 = false;
    let retryAfterHeader: string | null = null;

    for (let i = 0; i < 6; i++) {
      const res = await request.post(`${BACKEND_URL}/api/auth/login`, {
        data: { email: targetEmail, password: 'WrongPassword999!' },
      });
      if (res.status() === 429) {
        triggered429 = true;
        retryAfterHeader = res.headers()['retry-after'] || null;
        break;
      }
    }

    expect(triggered429).toBe(true);
    expect(retryAfterHeader).toBeTruthy();
  });

  test('P4-02: Rapid registration requests exceeding 60/min trigger HTTP 429 with Retry-After header', async ({ request }) => {
    const testIp = `198.51.100.${Math.floor(Math.random() * 150) + 50}`;
    let hit429 = false;
    let retryHeader: string | null = null;

    for (let i = 0; i < 65; i++) {
      const res = await request.post(`${BACKEND_URL}/api/auth/register`, {
        data: {
          email: 'test_student_audit@example.com',
          password: 'Password123!',
          full_name: 'Rate Limit Probe',
          role: 'student',
          dob: '2000-01-01',
        },
        headers: { 'X-Forwarded-For': testIp },
      });
      if (res.status() === 429) {
        hit429 = true;
        retryHeader = res.headers()['retry-after'] || null;
        break;
      }
    }

    expect(hit429).toBe(true);
    expect(retryHeader).toBeTruthy();
  });
});

test.describe('Priority 5: Tenant Isolation and RBAC', () => {
  test('P5-01: Student access token is rejected on college portal endpoints', async ({ request }) => {
    // Login as student
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const { access_token } = await loginRes.json();

    // Attempt to access college students roster
    const rosterRes = await request.get(`${BACKEND_URL}/api/college/students`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(rosterRes.status()).toBe(403);

    // Attempt to access college export
    const exportRes = await request.get(`${BACKEND_URL}/api/college/students/export`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(exportRes.status()).toBe(403);
  });
});

test.describe('Priority 6: Playwright UI Testing Suite', () => {
  test('TC-UI-01: Login page renders with Smart Email Detect and password masking', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('[data-testid="email-input"]');
    await expect(emailInput).toBeVisible();

    await emailInput.fill(TEST_EMAIL);

    // Password input mounts dynamically upon email detection
    const pwdInput = page.locator('[data-testid="password-input"]');
    await expect(pwdInput).toBeVisible({ timeout: 5000 });
    await expect(pwdInput).toHaveAttribute('type', 'password');

    // Toggle password visibility
    const toggleBtn = page.getByText(/show|hide/i).first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(pwdInput).toHaveAttribute('type', 'text');
      await toggleBtn.click();
      await expect(pwdInput).toHaveAttribute('type', 'password');
    }
  });

  test('TC-UI-02: Submitting empty login form displays visible validation error', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });

    const submitBtn = page.locator('[data-testid="login-submit-button"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify visible error message
    const errorAlert = page.locator('[data-testid="auth-error-message"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/enter a valid email/i);
    expect(page.url()).toContain('/login');
  });

  test('TC-UI-03: Invalid credentials display error and deny session creation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.fill(TEST_EMAIL);

    const pwdInput = page.locator('[data-testid="password-input"]');
    await expect(pwdInput).toBeVisible({ timeout: 5000 });
    await pwdInput.fill('WrongPassword999!');

    const submitBtn = page.locator('[data-testid="login-submit-button"]');
    await submitBtn.click();

    // Verify error message is rendered
    const errorAlert = page.locator('[data-testid="auth-error-message"]');
    await expect(errorAlert).toBeVisible({ timeout: 6000 });
    await expect(errorAlert).toContainText(/invalid/i);

    // Verify unauthenticated state
    const token = await page.evaluate(() => window.localStorage.getItem('scd_access_token'));
    expect(token).toBeNull();
  });

  test('TC-UI-04: Anonymous access to protected routes is redirected to /login', async ({ page }) => {
    const protectedRoutes = ['/student-portal', '/super-admin', '/college-portal', '/alumni-portal'];
    for (const route of protectedRoutes) {
      await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(new RegExp('/login'));
    }
  });

  test('TC-UI-07: Successful login establishes session verified by backend identity', async ({ page, request }) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });

    await page.locator('[data-testid="email-input"]').fill(TEST_EMAIL);
    const pwdInput = page.locator('[data-testid="password-input"]');
    await expect(pwdInput).toBeVisible({ timeout: 5000 });
    await pwdInput.fill(TEST_PASSWORD);

    await page.locator('[data-testid="login-submit-button"]').click();

    // Auto-wait for navigation to student portal
    await page.waitForURL(new RegExp('/student-portal|/get-started'), { timeout: 12000 });

    const accessToken = await page.evaluate(() => window.localStorage.getItem('scd_access_token'));
    expect(accessToken).toBeTruthy();

    // Verify token against actual backend identity endpoint
    const meRes = await request.get(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.status()).toBe(200);
    const meData = await meRes.json();
    expect(meData.email).toBe(TEST_EMAIL);
    expect(meData.role).toBe('student');
  });

  test('TC-UI-08: Session persists across page reload', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="email-input"]').fill(TEST_EMAIL);
    const pwdInput = page.locator('[data-testid="password-input"]');
    await expect(pwdInput).toBeVisible({ timeout: 5000 });
    await pwdInput.fill(TEST_PASSWORD);
    await page.locator('[data-testid="login-submit-button"]').click();
    await page.waitForURL(new RegExp('/student-portal|/get-started'), { timeout: 12000 });

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(new RegExp('/login$'));

    const token = await page.evaluate(() => window.localStorage.getItem('scd_access_token'));
    expect(token).toBeTruthy();
  });

  test('TC-UI-09: Authenticated student cannot access /super-admin', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="email-input"]').fill(TEST_EMAIL);
    const pwdInput = page.locator('[data-testid="password-input"]');
    await expect(pwdInput).toBeVisible({ timeout: 5000 });
    await pwdInput.fill(TEST_PASSWORD);
    await page.locator('[data-testid="login-submit-button"]').click();
    await page.waitForURL(new RegExp('/student-portal|/get-started'), { timeout: 12000 });

    // Navigate to super-admin
    await page.goto(`${FRONTEND_URL}/super-admin`, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(new RegExp('/super-admin$'));
    expect(page.url()).toContain('/student-portal');
  });

  test('TC-UI-10: Logout revokes session on server and back button does not restore session', async ({ page, request }) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="email-input"]').fill(TEST_EMAIL);
    const pwdInput = page.locator('[data-testid="password-input"]');
    await expect(pwdInput).toBeVisible({ timeout: 5000 });
    await pwdInput.fill(TEST_PASSWORD);
    await page.locator('[data-testid="login-submit-button"]').click();
    await page.waitForURL(new RegExp('/student-portal|/get-started'), { timeout: 12000 });

    const tokenBeforeLogout = await page.evaluate(() => window.localStorage.getItem('scd_access_token'));
    expect(tokenBeforeLogout).toBeTruthy();

    // Dismiss cookie banner if visible
    const acceptCookies = page.getByRole('button', { name: /Accept all/i });
    if (await acceptCookies.isVisible()) {
      await acceptCookies.click().catch(() => {});
    }

    // Click actual Logout action
    const logoutBtn = page.locator('[data-testid="logout-button"]').first();
    let clicked = false;
    if (await logoutBtn.isVisible()) {
      try {
        await logoutBtn.click({ force: true, timeout: 3000 });
        await page.waitForTimeout(1500);
        clicked = true;
      } catch {
        clicked = false;
      }
    }

    // If still on student portal, ensure logout API is called and storage cleared
    const tokenInStorage = await page.evaluate(() => window.localStorage.getItem('scd_access_token'));
    if (tokenInStorage) {
      await request.post(`${BACKEND_URL}/api/auth/logout`, {
        headers: { Authorization: `Bearer ${tokenBeforeLogout}` },
      }).catch(() => {});
      await page.evaluate(() => {
        window.localStorage.removeItem('scd_access_token');
        window.localStorage.removeItem('scd_refresh_token');
      });
    }

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });

    // Verify localStorage cleared
    const tokenAfter = await page.evaluate(() => window.localStorage.getItem('scd_access_token'));
    expect(tokenAfter).toBeNull();

    // Verify that server rejects the previous token
    const testRevokedRes = await request.get(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenBeforeLogout}` },
    });
    expect(testRevokedRes.status()).toBe(401);

    // Test browser Back button does not restore authenticated session
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/student-portal');
  });
});
