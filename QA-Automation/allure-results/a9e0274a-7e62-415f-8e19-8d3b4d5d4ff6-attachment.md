# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Student\Student.spec.js >> Student Portal Complete Suite >> TC03: Security Injection Check on Login Inputs
- Location: tests\Student\Student.spec.js:28:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- progressbar [ref=e5]
```

# Test source

```ts
  1  | const BasePage = require('./BasePage');
  2  | 
  3  | class LoginPage extends BasePage {
  4  |   constructor(page) {
  5  |     super(page);
  6  |     this.emailInput = 'input[type="email"], input[placeholder*="email" i], input[name="email"]';
  7  |     this.passwordInput = 'input[type="password"], input[placeholder*="password" i], input[name="password"]';
  8  |     this.submitButton = 'button[type="submit"], [role="button"]:has-text("Login"), [role="button"]:has-text("Sign In")';
  9  |     this.forgotPasswordLink = 'text=Forgot Password';
  10 |     this.signUpLink = 'text=Sign Up';
  11 |   }
  12 | 
  13 |   async login(email, password) {
  14 |     await this.page.fill(this.emailInput, email);
  15 |     await this.page.fill(this.passwordInput, password);
  16 |     await this.page.click(this.submitButton, { force: true });
> 17 |     await this.page.waitForTimeout(2000);
     |                     ^ Error: page.waitForTimeout: Test timeout of 60000ms exceeded.
  18 |   }
  19 | }
  20 | 
  21 | module.exports = LoginPage;
  22 | 
```