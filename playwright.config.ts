import { defineConfig, devices } from '@playwright/test'

/**
 * See docs/playwright-e2e-guide.md. Targets an isolated E2E environment
 * only — tests/e2e/helpers/env.ts refuses to run against anything that
 * looks like production before this config file is even evaluated further.
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5175'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/helpers/global-setup.ts',
  fullyParallel: false, // workflow tests share seeded fixtures with real state transitions — order within a file matters
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Smoke-only — see docs/playwright-e2e-guide.md for what's run per browser.
      testMatch: /smoke\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /smoke\.spec\.ts/,
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Mini'] },
      testDir: './tests/e2e/responsive',
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testDir: './tests/e2e/responsive',
    },
  ],
})
