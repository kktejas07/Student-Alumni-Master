import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  workers: 1,
  outputDir: './reports/playwright-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: './reports/playwright-html-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
  },
});
