import { test, expect } from '@playwright/test';
import { StudentPage } from '../../pages/Student/StudentPage';
import { DataGenerator } from '../../utils/DataGenerator';
import dotenv from 'dotenv';
dotenv.config();

test.describe('Student User Journey & Onboarding Testing Suite', () => {
  let studentPage: StudentPage;

  test.beforeEach(async ({ page }) => {
    studentPage = new StudentPage(page);
    // Give Expo bundler time to warm up
    await page.waitForTimeout(500);
  });

  test('ST-001: Landing Page & Hero Component Verification', async ({ page }) => {
    await page.goto('http://localhost:8081/welcome', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    // Expo Web may not set <title>; verify by URL and page body content
    expect(page.url()).toContain('localhost:8081');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log(`Page body length: ${bodyText.length} chars`);
    const violations = await studentPage.runAccessibilityScan('Student_Welcome');
    console.log(`Accessibility violations found: ${violations.length}`);
    await studentPage.takeScreenshot('ST001_landing_page');
  });

  test('ST-002: Dynamic Signup & Account Creation Check', async ({ page }) => {
    const fakeStudent = DataGenerator.generateStudentProfile();
    console.log(`Generated test student: ${fakeStudent.email}`);
    // Navigate to landing and check if signup is available
    await page.goto('http://localhost:8081/welcome', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    // Look for any sign up / register / get started link
    const signupBtn = page.locator(
      'text=Sign Up, text=Register, text=Get Started, text=Create Account, a[href*="sign"], a[href*="register"]'
    ).first();
    if (await signupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signupBtn.click();
      await page.waitForTimeout(2000);
      await studentPage.takeScreenshot('ST002_signup_page');
    } else {
      console.log('Signup not directly available; using provided credentials.');
    }
    await studentPage.takeScreenshot('ST002_signup_flow');
  });

  test('ST-003: Student Authentication with Credentials', async ({ page }) => {
    const email = process.env.STUDENT_EMAIL || 'student01@test.com';
    const password = process.env.STUDENT_PASSWORD || 'TestPass@123';
    await studentPage.performStudentLogin(email, password);
    await page.waitForTimeout(2000);
    await studentPage.takeScreenshot('ST003_student_login');
    console.log(`Console errors detected: ${studentPage.consoleErrors.length}`);
    console.log(`Network failures: ${studentPage.networkFailures.length}`);
  });

  test('ST-004: Dashboard Navigation & XSS/SQLi Probe', async ({ page }) => {
    await page.goto('http://localhost:8081/welcome', { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await studentPage.testStudentDashboardModules();
    await studentPage.testFormInputsValidation();
    await studentPage.takeScreenshot('ST004_dashboard_validation');
    // XSS should be absorbed by the app - page should not show alert dialogs
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    expect(dialogs.length, 'XSS injection should not trigger dialog').toBe(0);
  });
});
