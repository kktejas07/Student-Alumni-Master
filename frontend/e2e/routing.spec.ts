import { expect, test } from '@playwright/test';

test('redirects unauthenticated visitors away from protected student routes', async ({ page }) => {
  await page.goto('/student-portal/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test('login page stays within a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="email"]')).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test('captures uncaught browser errors and failed API requests on login', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  const failedApiRequests: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/')) failedApiRequests.push(request.url());
  });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.waitForTimeout(500);

  await testInfo.attach('browser-diagnostics.json', {
    body: JSON.stringify({ browserErrors, failedApiRequests }, null, 2),
    contentType: 'application/json',
  });
});
