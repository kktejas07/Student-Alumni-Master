# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Student\Student.spec.js >> Student Portal Complete Suite >> TC04: Console & Performance Audit
- Location: tests\Student\Student.spec.js:36:3

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
```

# Page snapshot

```yaml
- progressbar [ref=f1e5]
```

# Test source

```ts
  1  | class BasePage {
  2  |   constructor(page) {
  3  |     this.page = page;
  4  |   }
  5  | 
  6  |   async navigateTo(url) {
  7  |     await this.page.goto(url, { waitUntil: 'commit', timeout: 60000 });
  8  |     await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  9  |   }
  10 | 
  11 |   async getTitle() {
  12 |     return await this.page.title();
  13 |   }
  14 | 
  15 |   async checkConsoleErrors() {
  16 |     const errors = [];
  17 |     this.page.on('console', msg => {
  18 |       if (msg.type() === 'error') {
  19 |         errors.push(msg.text());
  20 |       }
  21 |     });
  22 |     return errors;
  23 |   }
  24 | 
  25 |   async checkBrokenImages() {
  26 |     const images = await this.page.$$eval('img', imgs => {
  27 |       return imgs.map(img => ({
  28 |         src: img.src,
  29 |         naturalWidth: img.naturalWidth,
  30 |         broken: img.naturalWidth === 0
  31 |       }));
  32 |     });
  33 |     return images.filter(img => img.broken);
  34 |   }
  35 | 
  36 |   async getPerformanceMetrics() {
> 37 |     return await this.page.evaluate(() => {
     |                            ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
  38 |       const timing = performance.timing;
  39 |       return {
  40 |         loadTime: timing.loadEventEnd - timing.navigationStart,
  41 |         domReady: timing.domComplete - timing.domLoading,
  42 |         ttfb: timing.responseStart - timing.requestStart
  43 |       };
  44 |     });
  45 |   }
  46 | }
  47 | 
  48 | module.exports = BasePage;
  49 | 
```