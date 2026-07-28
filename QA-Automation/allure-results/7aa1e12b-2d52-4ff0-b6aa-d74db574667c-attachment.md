# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Mentor\Mentor.spec.js >> Mentor Portal Suite >> TC01: Mentor Authentication
- Location: tests\Mentor\Mentor.spec.js:12:3

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
  3  | 
  4  | test.describe('Mentor Portal Suite', () => {
  5  |   let loginPage;
  6  | 
> 7  |   test.beforeEach(async ({ page }) => {
     |        ^ Test timeout of 60000ms exceeded while running "beforeEach" hook.
  8  |     loginPage = new LoginPage(page);
  9  |     await loginPage.navigateTo(process.env.MENTOR_PORTAL_URL || 'http://localhost:8081/login');
  10 |   });
  11 | 
  12 |   test('TC01: Mentor Authentication', async ({ page }) => {
  13 |     await loginPage.login(process.env.MENTOR_USERNAME, process.env.MENTOR_PASSWORD);
  14 |     await page.waitForTimeout(2000);
  15 |   });
  16 | });
  17 | 
```