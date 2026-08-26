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
  // 30s was too tight for the specs that legitimately perform many
  // sequential navigations (the documentation screenshot suite) or file
  // uploads (branding). Under full-suite load on a machine also running two
  // API servers and two Vite instances, those tests intermittently hit the
  // limit and were reported as failures despite passing in isolation — a
  // flaky threshold, not a weakened assertion. No expectation was relaxed.
  timeout: 60_000,
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
      // production-smoke targets a DEPLOYED environment and is run
      // explicitly by path (see docs/testing/production-smoke.md). It must
      // never be picked up by a normal regression run.
      testIgnore: /production-smoke/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Smoke-only — see docs/playwright-e2e-guide.md for what's run per browser.
      testMatch: /smoke\.spec\.ts/,
      testIgnore: /production-smoke/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /smoke\.spec\.ts/,
      testIgnore: /production-smoke/,
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
