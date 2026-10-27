import { expect, test } from '@playwright/test';
import { dismissConsentBanner } from './helpers';

const API = 'http://localhost:8001/api';

async function openStudentAccountForm(page: import('@playwright/test').Page) {
  await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'First, who are you?' })).toBeVisible();
  await dismissConsentBanner(page);
  await page.locator('.ob-pick').filter({ hasText: 'Find mentors, build a roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
}

async function finishStudentRegistration(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  registerStatus = 200,
  onRegister?: (payload: Record<string, unknown>) => void,
  registerError = 'Email already registered',
) {
  await page.getByLabel('Full Name').fill('Playwright Isolated User');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Date of Birth').fill('2000-01-01');

  await page.route(`${API}/auth/email-otp/send`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'sent', otp_code: '123456' }),
    }),
  );
  await page.route(`${API}/auth/verify-email-otp`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    }),
  );
  await page.route(`${API}/auth/register`, async (route) => {
    onRegister?.(route.request().postDataJSON());
    if (registerStatus !== 200) {
      await route.fulfill({
        status: registerStatus,
        contentType: 'application/json',
        body: JSON.stringify({ detail: registerError }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'playwright-user', email, full_name: 'Playwright Isolated User', role: 'student' },
        access_token: 'playwright-access-token',
        refresh_token: 'playwright-refresh-token',
      }),
    });
  });
  await page.route(`${API}/users/onboarding`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
  );

  await page.locator('#ob-next').click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await page.locator('#ob-next').click();
  await expect(page.getByRole('heading', { name: 'What are you studying?' })).toBeVisible();

  for (let step = 0; step < 16; step += 1) {
    const dashboardButton = page.getByRole('button', { name: /continue to dashboard/i });
    if (await dashboardButton.isVisible().catch(() => false)) return;
    await page.locator('#ob-next').click();
  }
}

test.describe('registration', () => {
  test('shows required-field validation before requesting an email code', async ({ page }) => {
    let otpRequests = 0;
    await page.route(`${API}/auth/email-otp/send`, async (route) => {
      otpRequests += 1;
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'sent', otp_code: '123456' }) });
    });

    await openStudentAccountForm(page);
    await page.locator('#ob-next').click();

    await expect(page.getByRole('alert')).toContainText('Please enter your full name');
    expect(otpRequests).toBe(0);
  });

  test('rejects invalid email format and does not request an email code', async ({ page }) => {
    let otpRequests = 0;
    await page.route(`${API}/auth/email-otp/send`, async (route) => {
      otpRequests += 1;
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'sent', otp_code: '123456' }) });
    });

    await openStudentAccountForm(page);
    await page.getByLabel('Full Name').fill('Playwright Isolated User');
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('Safe-Test-Password-2026!');
    await page.getByLabel('Date of Birth').fill('2000-01-01');
    await page.locator('#ob-next').click();

    await expect(page.getByRole('alert')).toContainText('Please enter a valid email address');
    expect(otpRequests).toBe(0);
  });

  test('submits the registration payload and routes to the student portal', async ({ page }) => {
    const email = `playwright-${Date.now()}@example.test`;
    let registrationPayload: Record<string, unknown> | undefined;
    await openStudentAccountForm(page);
    await finishStudentRegistration(page, email, 'Safe-Test-Password-2026!', 200, (payload) => {
      registrationPayload = payload;
    });
    await expect(page.getByRole('button', { name: /continue to dashboard/i })).toBeVisible();
    await page.getByRole('button', { name: /continue to dashboard/i }).click();
    await expect(page).toHaveURL(/\/student-portal\/dashboard/);

    expect(registrationPayload).toMatchObject({
      email,
      full_name: 'Playwright Isolated User',
      role: 'student',
      dob: '2000-01-01',
      password: 'Safe-Test-Password-2026!',
    });
  });

  test('shows the backend duplicate-registration response without creating an account', async ({ page }) => {
    const email = `duplicate-${Date.now()}@example.test`;
    await openStudentAccountForm(page);
    await finishStudentRegistration(page, email, 'Safe-Test-Password-2026!', 400);
    await page.getByRole('button', { name: /continue to dashboard/i }).click();

    await expect(page.getByRole('alert')).toContainText('Email already registered');
  });

  test('surfaces the backend password-strength requirement', async ({ page }) => {
    const email = `weak-password-${Date.now()}@example.test`;
    await openStudentAccountForm(page);
    await finishStudentRegistration(
      page,
      email,
      'short',
      422,
      undefined,
      'Password must be at least 8 characters long',
    );
    await page.getByRole('button', { name: /continue to dashboard/i }).click();

    await expect(page.getByRole('alert')).toContainText('Password must be at least 8 characters long');
  });
});

test.describe('login', () => {
  test('validates empty email and password', async ({ page }) => {
    await page.route(`${API}/auth/check-email`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, role: 'student' }),
      }),
    );
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await dismissConsentBanner(page);
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();

    await page.locator('input[type="email"]').fill('student@example.test');
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await expect(page.getByText('Please enter your password.')).toBeVisible();
  });

  test('shows invalid-credentials errors from the login API', async ({ page }) => {
    await page.route(`${API}/auth/check-email`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, role: 'student' }),
      }),
    );
    await page.route(`${API}/auth/login`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid password or account credentials.' }),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await dismissConsentBanner(page);
    await page.locator('input[type="email"]').fill('invalid-user@example.test');
    await expect(page.getByText('Account found — enter your password to continue.')).toBeVisible();
    await page.locator('input[type="password"]').fill('incorrect-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
    await expect(page.getByRole('button', { name: /signing in/i }).last()).toBeVisible();
    await expect(page.getByText('Invalid password or account credentials.')).toBeVisible();
  });

  test('reports account-check network failures usefully', async ({ page }) => {
    const failedApiRequests: string[] = [];
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/auth/check-email')) failedApiRequests.push(request.url());
    });
    await page.route(`${API}/auth/check-email`, (route) => route.abort());

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await dismissConsentBanner(page);
    await page.locator('input[type="email"]').fill('network-error@example.test');
    await expect(page.getByText('Unable to reach the server. Please check your connection or try again later.')).toBeVisible();
    expect(failedApiRequests).toHaveLength(1);
  });

  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test('logs in with the authorized E2E account and follows its role redirect', async ({ page }) => {
    test.skip(!testEmail || !testPassword, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD for this isolated-account test.');

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await dismissConsentBanner(page);
    await page.locator('input[type="email"]').fill(testEmail!);
    await expect(page.getByText('Account found — enter your password to continue.')).toBeVisible();
    await page.locator('input[type="password"]').fill(testPassword!);
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/(student-portal|alumni-portal|mentor-portal|college-portal|super-admin)/);
  });
});
