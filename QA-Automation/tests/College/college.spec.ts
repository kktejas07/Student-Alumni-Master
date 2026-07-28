import { test, expect } from '@playwright/test';
import { CollegePage } from '../../pages/College/CollegePage';
import dotenv from 'dotenv';
dotenv.config();

test.describe('College / Institution Admin Testing Suite', () => {
  let collegePage: CollegePage;

  test.beforeEach(async ({ page }) => {
    collegePage = new CollegePage(page);
    await page.waitForTimeout(500);
  });

  test('CL-001: College Portal Landing Verification', async ({ page }) => {
    await page.goto('http://localhost:8081/welcome', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('localhost:8081');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log(`College page body length: ${bodyText.length} chars`);
    await collegePage.runAccessibilityScan('College_Landing');
    await collegePage.takeScreenshot('CL001_college_landing');
  });

  test('CL-002: College Authentication with Credentials', async ({ page }) => {
    const email = process.env.COLLEGE_EMAIL || 'iitb@university.in';
    const password = process.env.COLLEGE_PASSWORD || 'TestPass@123';
    await collegePage.performCollegeLogin(email, password);
    await page.waitForTimeout(2000);
    await collegePage.takeScreenshot('CL002_college_login');
  });
});
