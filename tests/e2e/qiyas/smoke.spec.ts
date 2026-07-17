import { test, expect } from '@playwright/test'
import { loginAs, openQiyasProgram, USERS } from '../helpers/auth'

/**
 * Cross-browser smoke test — run on Chromium, Firefox, and WebKit (see
 * playwright.config.ts). Covers login, program selection, and the core
 * navigation surface without performing any data-mutating workflow action,
 * so it is safe and fast to run on every browser on every change. The full
 * scenario suite (lifecycle/rejection/extension/permissions) runs on
 * Chromium only — see docs/playwright-e2e-guide.md for the rationale.
 */
test('smoke: login, program selection, and core navigation render on this browser', async ({ page }) => {
  await loginAs(page, USERS.programManager)
  await openQiyasProgram(page)

  await expect(page).toHaveURL(/\/programs\/QIYAS\/dashboard/)
  await expect(page.getByTestId('nav-assignments')).toBeVisible()

  await page.goto('/programs/QIYAS/my-requirements')
  await expect(page.locator('body')).toBeVisible()

  await page.goto('/programs/QIYAS/reviews/program-manager')
  await expect(page.locator('body')).toBeVisible()

  await page.goto('/notifications')
  await expect(page.locator('body')).toBeVisible()
})
