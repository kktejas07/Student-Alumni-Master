import { Page, Locator, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

export class BasePage {
  readonly page: Page;
  readonly consoleErrors: string[] = [];
  readonly networkFailures: { url: string; status: number; method: string }[] = [];

  constructor(page: Page) {
    this.page = page;

    // Listen to console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    // Listen to network failures
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.networkFailures.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });
  }

  async navigateTo(pathUrl: string = '/') {
    await this.page.goto(pathUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  async runAccessibilityScan(scanName: string) {
    try {
      const accessibilityScanResults = await new AxeBuilder({ page: this.page }).analyze();
      const reportPath = path.resolve(__dirname, `../reports/json/accessibility-${scanName.replace(/[^a-z0-9]/gi, '_')}.json`);
      const dir = path.dirname(reportPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(accessibilityScanResults.violations, null, 2));
      return accessibilityScanResults.violations;
    } catch (e) {
      console.warn(`Accessibility scan skipped or failed: ${e}`);
      return [];
    }
  }

  async fillInput(selector: string | Locator, value: string) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.fill(value);
  }

  async clickElement(selector: string | Locator) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.click();
  }

  async checkElementVisible(selector: string | Locator) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toBeVisible({ timeout: 10000 });
  }

  async takeScreenshot(name: string) {
    const screenshotPath = path.resolve(__dirname, `../screenshots/${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`);
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }
}
