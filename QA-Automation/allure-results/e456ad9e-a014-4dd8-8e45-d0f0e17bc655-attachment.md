# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Student\Student.spec.js >> Student Portal Complete Suite >> TC03: Security Injection Check on Login Inputs
- Location: tests\Student\Student.spec.js:28:3

# Error details

```
Test timeout of 60000ms exceeded while running "beforeEach" hook.
```

# Page snapshot

```yaml
- progressbar [ref=e5]
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
> 8  |   test.beforeEach(async ({ page }) => {
     |        ^ Test timeout of 60000ms exceeded while running "beforeEach" hook.
  9  |     loginPage = new LoginPage(page);
  10 |     await loginPage.navigateTo(process.env.STUDENT_PORTAL_URL || 'http://localhost:8081/login');
  11 |   });
  12 | 
  13 |   test('TC01: Student Login with valid credentials', async ({ page }) => {
  14 |     await loginPage.login(process.env.STUDENT_USERNAME, process.env.STUDENT_PASSWORD);
  15 |     await expect(page).not.toHaveURL(/\/login$/);
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