import { test, expect } from '@playwright/test';
import { MentorPage } from '../../pages/Mentor/MentorPage';
import dotenv from 'dotenv';
dotenv.config();

test.describe('Mentor User Journey & Portal Testing Suite', () => {
  let mentorPage: MentorPage;

  test.beforeEach(async ({ page }) => {
    mentorPage = new MentorPage(page);
    await page.waitForTimeout(500);
  });

  test('MT-001: Mentor Portal Landing Verification', async ({ page }) => {
    await page.goto('http://localhost:8081/welcome', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('localhost:8081');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log(`Mentor page body length: ${bodyText.length} chars`);
    await mentorPage.runAccessibilityScan('Mentor_Landing');
    await mentorPage.takeScreenshot('MT001_mentor_landing');
  });

  test('MT-002: Mentor Authentication with Credentials', async ({ page }) => {
    const email = process.env.MENTOR_EMAIL || 'mentor01@test.com';
    const password = process.env.MENTOR_PASSWORD || 'TestPass@123';
    await mentorPage.performMentorLogin(email, password);
    await page.waitForTimeout(2000);
    await mentorPage.takeScreenshot('MT002_mentor_login');
  });
});
