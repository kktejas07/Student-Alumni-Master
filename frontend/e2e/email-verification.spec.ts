import { expect, test } from '@playwright/test';

const API = 'http://localhost:8001/api';
const email = 'verification-test@example.test';

test('accepts a valid verification link and displays verified status', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route(`${API}/auth/verify-email`, async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', message: 'Email verified successfully' }),
    });
  });

  await page.goto(`/email-verify?email=${encodeURIComponent(email)}&token=valid-test-token`);
  await expect(page.getByText('Email verified!', { exact: true })).toBeVisible();
  await expect(page.getByText('Account Verified', { exact: true })).toBeVisible();
  expect(submitted).toEqual({ email, token: 'valid-test-token' });
});

test('does not mark an invalid verification link as verified', async ({ page }) => {
  await page.route(`${API}/auth/verify-email`, (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Invalid verification token' }),
    }),
  );

  await page.goto(`/email-verify?email=${encodeURIComponent(email)}&token=invalid-test-token`);
  await expect(page.getByText('Invalid verification token')).toBeVisible();
  await expect(page.getByText('Email verified!', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Verify your email address', { exact: true })).toBeVisible();
});

test('does not mark an expired verification link as verified', async ({ page }) => {
  await page.route(`${API}/auth/verify-email`, (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Verification token has expired' }),
    }),
  );

  await page.goto(`/email-verify?email=${encodeURIComponent(email)}&token=expired-test-token`);
  await expect(page.getByText('Verification token has expired')).toBeVisible();
  await expect(page.getByText('Email verified!', { exact: true })).toHaveCount(0);
});

test('does not mark an unconfirmed email as verified when the pending-state button is clicked', async ({ page }) => {
  await page.goto(`/email-verify?email=${encodeURIComponent(email)}`);
  await page.getByTestId('verify-email').click();

  await expect(page.getByText('Email verified!', { exact: true })).toHaveCount(0);
});

test('backend-generated /verify-email links resolve to the verification screen', async ({ page }) => {
  await page.route(`${API}/auth/verify-email`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', message: 'Email verified successfully' }),
    }),
  );

  await page.goto(`/verify-email?email=${encodeURIComponent(email)}&token=valid-test-token`);
  await expect(page.getByText('Email verified!', { exact: true })).toBeVisible();
});

test('mobile verification screen has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/email-verify?email=verification-test%40example.test');
  await expect(page.getByText('Verify your email address', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
