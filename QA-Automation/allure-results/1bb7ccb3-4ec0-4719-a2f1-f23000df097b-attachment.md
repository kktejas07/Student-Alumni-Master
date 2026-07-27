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
- generic [ref=e16]:
  - generic [ref=e18]:
    - generic [ref=e20]:
      - img [ref=e21]:
        - generic [ref=e23]: SA
      - generic [ref=e24]:
        - generic [ref=e25]: Student
        - generic [ref=e26]: Alumni
    - generic [ref=e28]:
      - generic [ref=e29]: Turn ambition into opportunity.
      - generic [ref=e30]: Connect with mentors, discover internships, and accelerate your future — all in one place built for students.
      - generic [ref=e31]:
        - generic [ref=e32]: AI Career Guidance
        - generic [ref=e38]: Mentor Connections
        - generic [ref=e46]: Jobs & Internships
        - generic [ref=e52]: Alumni Network
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]: 12.4K+
          - generic [ref=e61]: Students
        - generic [ref=e62]:
          - generic [ref=e63]: 500+
          - generic [ref=e64]: Mentors
        - generic [ref=e65]:
          - generic [ref=e66]: 200+
          - generic [ref=e67]: Colleges
  - generic [ref=e71]:
    - generic [ref=e72] [cursor=pointer]: Back
    - generic [ref=e76]:
      - generic [ref=e77]: Welcome back
      - generic [ref=e78]: Sign in to continue your journey on Student Alumni
    - generic [ref=e79]:
      - button "Continue with Google" [ref=e80] [cursor=pointer]
      - button "Continue with LinkedIn" [ref=e88] [cursor=pointer]
      - button "Continue with GitHub" [ref=e94] [cursor=pointer]
    - generic [ref=e99]: or continue with email
    - generic [ref=e103]:
      - generic [ref=e104]:
        - generic [ref=e105]: Email
        - textbox "Email" [active] [ref=e107]:
          - /placeholder: you@university.edu
      - generic [ref=e108]:
        - generic [ref=e109]: Password
        - generic [ref=e110]:
          - textbox "Password" [ref=e111]:
            - /placeholder: Enter your password
          - button "Show password" [ref=e112] [cursor=pointer]
    - generic [ref=e116]: Forgot password?
    - button "Sign in" [ref=e119] [cursor=pointer]
    - generic [ref=e122]: New to Student Alumni? Get started
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