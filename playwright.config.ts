import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/authentication',
  testMatch: /.*\.spec\.ts/,
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_FRONTEND_URL || 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
