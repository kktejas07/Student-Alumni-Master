# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Student\Student.spec.js >> Student Portal Complete Suite >> TC01: Student Login with valid credentials
- Location: tests\Student\Student.spec.js:13:3

# Error details

```
Error: expect(page).not.toHaveURL(expected) failed

Expected pattern: not /\/login$/
Received string: "http://localhost:8081/login"
Timeout: 10000ms

Call log:
  - Expect "not toHaveURL" with timeout 10000ms
    22 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:8081/login"

```

```yaml
- img: SA
- text: Student Alumni Turn ambition into opportunity. Connect with mentors, discover internships, and accelerate your future — all in one place built for students.
- img
- text: AI Career Guidance
- img
- text: Mentor Connections
- img
- text: Jobs & Internships
- img
- text: Alumni Network 12.4K+ Students 500+ Mentors 200+ Colleges
- img
- text: Back Welcome back Sign in to continue your journey on Student Alumni
- button "Continue with Google":
  - img
  - text: Continue with Google
- button "Continue with LinkedIn":
  - img
  - text: Continue with LinkedIn
- button "Continue with GitHub":
  - img
  - text: Continue with GitHub
- text: or continue with email Email
- textbox "Email":
  - /placeholder: you@university.edu
  - text: student01@test.com
- text: Password
- textbox "Password":
  - /placeholder: Enter your password
  - text: TestPass@123
- button "Show password":
  - img
- text: Secure Password Forgot password?
- button "Sign in"
- text: New to Student Alumni? Get started
- dialog:
  - img
  - text: Privacy & Cookie preferences Toggle the categories you're comfortable with. Essential cookies are always on — they keep the platform secure.
  - img
  - img
  - text: Essential · always on Required for login, security, and core platform functions. Cannot be disabled.
  - img
  - text: Analytics Helps us understand how the platform is used so we can improve features (PostHog / Firebase).
  - img
  - text: Functional Remembers your preferences (theme, last-viewed portal, language) across sessions.
  - img
  - text: Marketing Lets us share contextual updates about new features, courses, and partner offers. Reject optional
  - img
  - text: Save preferences
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | const LoginPage = require('../../pages/LoginPage');
  3  | const TestDataGenerator = require('../../utils/TestDataGenerator');
  4  | 
  5  | test.describe('Student Portal Complete Suite', () => {
  6  |   let loginPage;
  7  | 
  8  |   test.beforeEach(async ({ page }) => {
  9  |     loginPage = new LoginPage(page);
  10 |     await loginPage.navigateTo(process.env.STUDENT_PORTAL_URL || 'http://localhost:8081/login');
  11 |   });
  12 | 
  13 |   test('TC01: Student Login with valid credentials', async ({ page }) => {
  14 |     await loginPage.login(process.env.STUDENT_USERNAME, process.env.STUDENT_PASSWORD);
> 15 |     await expect(page).not.toHaveURL(/\/login$/);
     |                            ^ Error: expect(page).not.toHaveURL(expected) failed
  16 |   });
  17 | 
  18 |   test('TC02: Form Validation - Invalid Credentials & Empty Fields', async ({ page }) => {
  19 |     await loginPage.login('', '');
  20 |     // Expect form validation trigger or stayed on login
  21 |     expect(page.url()).toContain('login');
  22 | 
  23 |     await loginPage.login('invalid@student.com', 'WrongPass123!');
  24 |     await page.waitForTimeout(1000);
  25 |     expect(page.url()).toContain('login');
  26 |   });
  27 | 
  28 |   test('TC03: Security Injection Check on Login Inputs', async ({ page }) => {
  29 |     const payloads = TestDataGenerator.generateSecurityPayloads();
  30 |     for (const sqli of payloads.sqli) {
  31 |       await loginPage.login(sqli, sqli);
  32 |       expect(page.url()).toContain('login');
  33 |     }
  34 |   });
  35 | 
  36 |   test('TC04: Console & Performance Audit', async ({ page }) => {
  37 |     const consoleErrors = await loginPage.checkConsoleErrors();
  38 |     await loginPage.login(process.env.STUDENT_USERNAME, process.env.STUDENT_PASSWORD);
  39 |     const metrics = await loginPage.getPerformanceMetrics();
  40 |     console.log('Student Dashboard Navigation Metrics:', metrics);
  41 |   });
  42 | });
  43 | 
```