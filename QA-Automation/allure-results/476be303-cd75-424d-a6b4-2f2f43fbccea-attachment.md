# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Student\Student.spec.js >> Student Portal Complete Suite >> TC01: Student Login with valid credentials
- Location: tests\Student\Student.spec.js:13:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:8081/login", waiting until "networkidle"

```

# Test source

```ts
  1  | class BasePage {
  2  |   constructor(page) {
  3  |     this.page = page;
  4  |   }
  5  | 
  6  |   async navigateTo(url) {
> 7  |     await this.page.goto(url, { waitUntil: 'networkidle' });
     |                     ^ Error: page.goto: Test timeout of 30000ms exceeded.
  8  |   }
  9  | 
  10 |   async getTitle() {
  11 |     return await this.page.title();
  12 |   }
  13 | 
  14 |   async checkConsoleErrors() {
  15 |     const errors = [];
  16 |     this.page.on('console', msg => {
  17 |       if (msg.type() === 'error') {
  18 |         errors.push(msg.text());
  19 |       }
  20 |     });
  21 |     return errors;
  22 |   }
  23 | 
  24 |   async checkBrokenImages() {
  25 |     const images = await this.page.$$eval('img', imgs => {
  26 |       return imgs.map(img => ({
  27 |         src: img.src,
  28 |         naturalWidth: img.naturalWidth,
  29 |         broken: img.naturalWidth === 0
  30 |       }));
  31 |     });
  32 |     return images.filter(img => img.broken);
  33 |   }
  34 | 
  35 |   async getPerformanceMetrics() {
  36 |     return await this.page.evaluate(() => {
  37 |       const timing = performance.timing;
  38 |       return {
  39 |         loadTime: timing.loadEventEnd - timing.navigationStart,
  40 |         domReady: timing.domComplete - timing.domLoading,
  41 |         ttfb: timing.responseStart - timing.requestStart
  42 |       };
  43 |     });
  44 |   }
  45 | }
  46 | 
  47 | module.exports = BasePage;
  48 | 
```