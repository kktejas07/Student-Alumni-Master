import { expect, test } from '@playwright/test';

test('View Full Analysis opens readiness and skills details', async ({ page }) => {
  await page.goto('/career-ai', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'View full career analysis' }).click();
  await expect(page.getByText('Full readiness analysis')).toBeVisible();
  await expect(page.getByText(/Current readiness for/)).toBeVisible();

  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(page.getByText('Skill scores are based on the career intelligence profile and shown on a 0–100 scale.')).toBeVisible();

  await page.getByRole('button', { name: 'Close career analysis' }).click();
  await expect(page.getByText('Full readiness analysis')).toBeHidden();
});
