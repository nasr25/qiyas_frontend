import { defineConfig, devices } from '@playwright/test'

/**
 * Separate config for the post-deployment smoke suite.
 *
 * The main playwright.config.ts runs a globalSetup that imports
 * tests/e2e/helpers/env.ts, whose preflight REFUSES to run against a
 * production URL. That refusal is correct — the main suite creates,
 * approves and rejects real records — and is exactly why the smoke suite
 * needs its own config rather than a flag on the shared one.
 *
 * The smoke suite is read-only (see tests/e2e/production-smoke/smoke.spec.ts)
 * and is the only suite permitted to point at a live deployment.
 *
 *   SMOKE_BASE_URL / SMOKE_API_URL / SMOKE_USERNAME / SMOKE_PASSWORD / SMOKE_PROGRAM
 */
export default defineConfig({
  testDir: './tests/e2e/production-smoke',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1, // one retry absorbs a transient network blip against a real host
  workers: 1, // never load-test a production deployment
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.SMOKE_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:5181',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: false, // a bad certificate on a production host is a finding
  },
  projects: [
    { name: 'production-smoke', use: { ...devices['Desktop Chrome'] } },
  ],
})
