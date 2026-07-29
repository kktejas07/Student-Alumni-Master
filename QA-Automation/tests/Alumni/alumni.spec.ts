import { test, expect } from '@playwright/test';
import { AlumniPage } from '../../pages/Alumni/AlumniPage';
import dotenv from 'dotenv';
dotenv.config();

test.describe('Alumni User Journey & Portal Testing Suite', () => {
  let alumniPage: AlumniPage;

  test.beforeEach(async ({ page }) => {
    alumniPage = new AlumniPage(page);
    await page.waitForTimeout(500);
  });

  test('AL-001: Alumni Portal Landing Verification', async ({ page }) => {
    await page.goto('http://localhost:8081/welcome', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('localhost:8081');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log(`Alumni page body length: ${bodyText.length} chars`);
    await alumniPage.runAccessibilityScan('Alumni_Landing');
    await alumniPage.takeScreenshot('AL001_alumni_landing');
  });

  test('AL-002: Alumni Authentication with Credentials', async ({ page }) => {
    const email = process.env.ALUMNI_EMAIL || 'alumni01@test.com';
    const password = process.env.ALUMNI_PASSWORD || 'TestPass@123';
    await alumniPage.performAlumniLogin(email, password);
    await page.waitForTimeout(2000);
    await alumniPage.takeScreenshot('AL002_alumni_login');
  });
});
