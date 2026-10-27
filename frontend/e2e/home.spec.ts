import { expect, test } from '@playwright/test';
import { dismissConsentBanner } from './helpers';

test('home page loads', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('body')).not.toBeEmpty();
  await dismissConsentBanner(page);
  await page.getByRole('button', { name: /get started/i }).first().click();
  await expect(page).toHaveURL(/\/get-started/);
  await expect(page.getByRole('heading', { name: 'First, who are you?' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
