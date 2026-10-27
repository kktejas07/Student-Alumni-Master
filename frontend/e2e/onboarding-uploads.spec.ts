import { expect, test, type Page } from '@playwright/test';
import { dismissConsentBanner } from './helpers';

const API = 'http://localhost:8001/api';

async function openOnboardingResumeStep(page: Page) {
  await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'First, who are you?' })).toBeVisible();
  await dismissConsentBanner(page);
  await page.locator('.ob-pick').filter({ hasText: 'Find mentors, build a roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

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

  await page.getByLabel('Full Name').fill('Playwright Upload Test');
  await page.getByLabel('Email Address').fill(`onboarding-upload-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Safe-Test-Password-2026!');
  await page.getByLabel('Date of Birth').fill('2000-01-01');
  await page.locator('#ob-next').click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await page.locator('#ob-next').click();
  await expect(page.getByRole('heading', { name: 'What are you studying?' })).toBeVisible();
  await page.locator('#ob-skip').click();
  await expect(page.getByRole('heading', { name: 'Where do you want to land?' })).toBeVisible();
  await page.locator('#ob-skip').click();
  await expect(page.getByRole('heading', { name: 'Be honest about where you are' })).toBeVisible();
  await page.locator('#ob-skip').click();
  await expect(page.getByRole('heading', { name: 'Add your resume' })).toBeVisible();
}

test('selects a real resume and saves the uploaded photo to the profile and ID card', async ({ page }) => {
  let resumeRequest: Record<string, unknown> | undefined;
  let profileRequest: Record<string, unknown> | undefined;

  await page.route(`${API}/auth/register`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'isolated-playwright-user', email: 'onboarding-upload@example.test', role: 'student' },
        access_token: 'isolated-access-token',
        refresh_token: 'isolated-refresh-token',
      }),
    }),
  );
  await page.route(`${API}/users/me`, async (route) => {
    profileRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'isolated-playwright-user',
        role: 'student',
        photo_data: profileRequest.photo_data,
        face_image_base64: profileRequest.face_image_base64,
      }),
    });
  });
  await page.route(`${API}/users/me/resume`, async (route) => {
    if (route.request().method() === 'POST') {
      resumeRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'isolated-resume-id', name: resumeRequest.name, active: true }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [] }) });
  });
  await page.route(`${API}/users/me/id-card`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sa_id: 'SA-PLAYWRIGHT-001',
        full_name: 'Playwright Upload Test',
        email: 'onboarding-upload@example.test',
        role: 'student',
        status: { label: 'Student', color: '#60A5FA' },
        institution: 'Test University',
        branch: 'Computer Science',
        photo_data: profileRequest?.face_image_base64,
        issued_at: new Date().toISOString(),
        verify_url: 'http://localhost:8081/verify/SA-PLAYWRIGHT-001',
        qr_payload: 'http://localhost:8081/verify/SA-PLAYWRIGHT-001',
      }),
    });
  });
  await page.route(`${API}/users/onboarding`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
  );

  await openOnboardingResumeStep(page);
  const resumeContents = '%PDF-1.4 Playwright resume data';
  await page.getByTestId('onboarding-resume-input').setInputFiles({
    name: 'my-resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(resumeContents),
  });
  await expect(page.getByTestId('onboarding-resume-name')).toHaveText('my-resume.pdf');
  await expect(page.getByTestId('onboarding-resume-status')).toContainText('Selected');

  await page.locator('#ob-next').click();
  await expect(page.getByRole('heading', { name: 'Add your profile picture' })).toBeVisible();
  await page.getByTestId('onboarding-photo-input').setInputFiles({
    name: 'my-profile.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=', 'base64'),
  });
  await expect(page.getByTestId('onboarding-photo-preview').locator('img[alt="Selected profile photo"]')).toBeVisible();

  for (let step = 0; step < 16; step += 1) {
    const finishButton = page.getByRole('button', { name: /continue to dashboard/i });
    if (await finishButton.isVisible().catch(() => false)) break;
    await page.locator('#ob-next').click();
  }

  await page.getByRole('button', { name: /continue to dashboard/i }).click();
  await expect(page).toHaveURL(/\/student-portal\/dashboard/);
  const uploadedPhoto = profileRequest?.face_image_base64 as string;
  await expect(page.getByTestId('topbar-user-avatar-btn').locator('img')).toHaveAttribute('src', uploadedPhoto);

  expect(resumeRequest).toMatchObject({
    name: 'my-resume.pdf',
    size: Buffer.byteLength(resumeContents),
  });
  expect(resumeRequest?.data_url).toBe(`data:application/pdf;base64,${Buffer.from(resumeContents).toString('base64')}`);
  expect(profileRequest?.face_image_base64).toEqual(expect.stringMatching(/^data:image\/png;base64,/));
  expect(profileRequest?.photo_data).toBe(profileRequest?.face_image_base64);

  await page.goto('/id-card', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('id-card')).toBeVisible();
  await expect(page.locator('img[alt="Playwright Upload Test"]')).toHaveAttribute('src', uploadedPhoto);
});

test('rejects unsupported and over-limit resumes selected during onboarding', async ({ page }) => {
  await openOnboardingResumeStep(page);

  await page.getByTestId('onboarding-resume-input').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a resume'),
  });
  await expect(page.getByRole('alert')).toContainText('Unsupported file type');
  await expect(page.getByTestId('onboarding-resume-name')).toHaveCount(0);

  await page.getByTestId('onboarding-resume-input').setInputFiles({
    name: 'large-resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('alert')).toContainText('File too large (max 5MB)');
  await expect(page.getByTestId('onboarding-resume-name')).toHaveCount(0);
});

test('rejects unsupported profile photo formats in onboarding', async ({ page }) => {
  await openOnboardingResumeStep(page);
  await page.locator('#ob-skip').click();
  await expect(page.getByRole('heading', { name: 'Add your profile picture' })).toBeVisible();

  await page.getByTestId('onboarding-photo-input').setInputFiles({
    name: 'document.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF'),
  });

  await expect(page.getByRole('alert')).toContainText('Unsupported image type');
  await expect(page.getByTestId('onboarding-photo-preview').locator('img')).toHaveCount(0);
});
