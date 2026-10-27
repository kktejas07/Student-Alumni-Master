import { expect, type Page } from '@playwright/test';

export async function dismissConsentBanner(page: Page) {
  await page.waitForFunction(
    () => Boolean(window.localStorage.getItem('sa.consent.v1'))
      || document.body.innerText.includes('We use cookies to make this better'),
    undefined,
    { timeout: 5_000 },
  );

  const rejectOptional = page.getByText('Reject optional', { exact: true });
  if (await rejectOptional.isVisible()) {
    await rejectOptional.click();
    await expect(page.getByText('We use cookies to make this better')).toBeHidden();
  }
}
