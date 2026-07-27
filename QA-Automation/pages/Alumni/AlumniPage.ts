import { BasePage } from '../BasePage';
import { Page, expect } from '@playwright/test';

export class AlumniPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async verifyAlumniPortal() {
    await this.navigateTo('/welcome');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    const title = await this.page.title();
    expect(title).toBeTruthy();
  }

  async performAlumniLogin(email: string, pass: string) {
    for (const route of ['/login', '/(auth)/login', '/auth/login', '/sign-in']) {
      try {
        await this.page.goto(route, { timeout: 8000, waitUntil: 'domcontentloaded' });
        const emailInput = this.page.locator('input[type="email"], input[placeholder*="email" i]').first();
        if (await emailInput.isVisible({ timeout: 3000 })) {
          await emailInput.fill(email);
          const passInput = this.page.locator('input[type="password"]').first();
          await passInput.fill(pass);
          const submitBtn = this.page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
          if (await submitBtn.isVisible({ timeout: 3000 })) {
            await submitBtn.click();
            await this.page.waitForTimeout(2000);
          }
          break;
        }
      } catch (_) { /* try next route */ }
    }
    await this.takeScreenshot('alumni_login');
  }
}
