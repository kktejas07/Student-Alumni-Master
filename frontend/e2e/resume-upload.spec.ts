import { expect, test, type Page } from '@playwright/test';
import { dismissConsentBanner } from './helpers';

const API = 'http://localhost:8001/api';
const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function openResumeManager(page: Page) {
  test.skip(!testEmail || !testPassword, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD for isolated-account resume tests.');

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await dismissConsentBanner(page);
  await page.locator('input[type="email"]').fill(testEmail!);
  await expect(page.getByText('Account found — enter your password to continue.')).toBeVisible();
  await page.locator('input[type="password"]').fill(testPassword!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);

  if (!page.url().includes('/student-portal')) {
    test.skip(true, 'The supplied authorized test account is not a student account.');
  }

  await page.getByTestId('student-nav-profile').click();
  await page.getByTestId('pf-tab-manage').click();
  await expect(page.getByText('Resume & Documents', { exact: true })).toBeVisible();
}

async function mockResumeApi(page: Page, onUpload: (body: Record<string, unknown>) => void) {
  let uploadedDocument: Record<string, unknown> | undefined;
  await page.route(`${API}/users/me/resume`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      onUpload(body);
      uploadedDocument = {
        id: 'playwright-resume',
        name: body.name,
        size: body.size,
        uploaded_at: new Date().toISOString(),
        active: true,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'playwright-resume', name: body.name, active: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ documents: uploadedDocument ? [uploadedDocument] : [] }),
    });
  });
}

test('uploads an allowed PDF and submits its contents to the resume API', async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await mockResumeApi(page, (body) => { payload = body; });
  await openResumeManager(page);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('pf-resume-upload').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'playwright-resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 isolated test file'),
  });

  await expect.poll(() => payload).toMatchObject({
    name: 'playwright-resume.pdf',
    size: Buffer.byteLength('%PDF-1.4 isolated test file'),
  });
  expect(payload?.data_url).toEqual(expect.stringMatching(/^data:application\/pdf;base64,/));
  await expect(page.getByText('playwright-resume.pdf', { exact: true })).toBeVisible();
});

test('rejects unsupported resume file types without submitting them', async ({ page }) => {
  let uploadRequested = false;
  await mockResumeApi(page, () => { uploadRequested = true; });
  await openResumeManager(page);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('pf-resume-upload').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'not-a-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('unsupported'),
  });

  await expect.poll(() => uploadRequested, { timeout: 1_000 }).toBe(false);
});

test('rejects resume files larger than 5 MB before submitting them', async ({ page }) => {
  let uploadRequested = false;
  await mockResumeApi(page, () => { uploadRequested = true; });
  await openResumeManager(page);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('pf-resume-upload').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'too-large.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });

  await expect(page.getByText('File too large (max 5MB)')).toBeVisible();
  expect(uploadRequested).toBe(false);
});
