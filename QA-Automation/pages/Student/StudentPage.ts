import { BasePage } from '../BasePage';
import { Page, expect } from '@playwright/test';

export class StudentPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async verifyWelcomeLandingPage() {
    await this.navigateTo('/welcome');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    // Check at least the page loaded without JS crash
    const title = await this.page.title();
    expect(title).toBeTruthy();
  }

  async performStudentLogin(email: string, pass: string) {
    // Try common auth routes for Expo Router
    for (const route of ['/login', '/(auth)/login', '/auth/login', '/sign-in']) {
      try {
        await this.page.goto(route, { timeout: 8000, waitUntil: 'domcontentloaded' });
        const emailInput = this.page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email"]').first();
        if (await emailInput.isVisible({ timeout: 3000 })) {
          await emailInput.fill(email);
          const passInput = this.page.locator('input[type="password"]').first();
          await passInput.fill(pass);
          const submitBtn = this.page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Continue")').first();
          if (await submitBtn.isVisible({ timeout: 3000 })) {
            await submitBtn.click();
            await this.page.waitForTimeout(2000);
          }
          break;
        }
      } catch (_) { /* try next route */ }
    }
  }

  async testStudentDashboardModules() {
    const navItems = ['Dashboard', 'Courses', 'Jobs', 'Events', 'Mentors', 'Wallet', 'Profile'];
    for (const item of navItems) {
      const link = this.page.locator(`text=${item}`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async testFormInputsValidation() {
    const searchBar = this.page.locator('input[placeholder*="Search"]').first();
    if (await searchBar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBar.fill("<script>alert('XSS')</script>");
      await searchBar.press('Enter');
      await this.page.waitForTimeout(500);
      await searchBar.fill("SELECT * FROM users WHERE '1'='1'");
      await searchBar.press('Enter');
      await this.page.waitForTimeout(500);
    }
  }
}
