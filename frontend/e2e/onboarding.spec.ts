import { expect, test } from '@playwright/test';
import { dismissConsentBanner } from './helpers';

async function openStudentAccountForm(page: import('@playwright/test').Page) {
  await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'First, who are you?' })).toBeVisible();
  await dismissConsentBanner(page);

  await page.locator('.ob-pick').filter({ hasText: 'Find mentors, build a roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
}

test('Get Started opens the student account form', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openStudentAccountForm(page);
  await expect(page.getByLabel('Date of Birth')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('student role can be selected with the keyboard', async ({ page }) => {
  await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'First, who are you?' })).toBeVisible();
  await dismissConsentBanner(page);

  const studentOption = page.locator('.ob-pick').filter({ hasText: 'Find mentors, build a roadmap' });
  await studentOption.focus();
  await expect(studentOption).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
});

test('missing date of birth is reported and scrolled into view', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openStudentAccountForm(page);

  await page.getByPlaceholder('e.g. Aisha Khan').fill('Playwright Test User');
  await page.getByPlaceholder('you@college.edu').fill('student@example.test');
  await page.getByPlaceholder('••••••••••').fill('Safe-Test-Password-2026!');
  const dateOfBirth = page.getByLabel('Date of Birth');
  await page.locator('#ob-next').click();

  await expect(page.getByRole('alert')).toContainText('Please enter your date of birth');
  await expect(dateOfBirth).toBeFocused();
  const isVisibleWithinScrollContainer = await dateOfBirth.evaluate((input) => {
    const container = document.querySelector('#ob-root');
    if (!container) return false;
    const inputBounds = input.getBoundingClientRect();
    const containerBounds = container.getBoundingClientRect();
    return inputBounds.top >= containerBounds.top && inputBounds.bottom <= containerBounds.bottom;
  });
  expect(isVisibleWithinScrollContainer).toBe(true);
});

test('Get Started form renders without horizontal overflow on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/get-started');
  await expect(page.getByRole('heading', { name: 'First, who are you?' })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
