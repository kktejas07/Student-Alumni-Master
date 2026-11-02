import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_BACKEND_URL || 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [{ name: 'api', use: { ...devices['Desktop Chrome'] } }],
});
