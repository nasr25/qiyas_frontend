import { Page, expect } from '@playwright/test'

/**
 * Test account usernames — seeded by the backend's TestUsersSeeder (see
 * docs/e2e-test-data.md). Quick Login (no password) is used for speed and
 * determinism; it is only reachable when APP_ENV=local/APP_DEBUG=true on
 * the target backend, which the E2E backend is deliberately configured as
 * — the same gate that keeps it disabled in production is exercised
 * separately in tests/e2e/security/quick-login-disabled.spec.ts.
 */
export const USERS = {
  superAdmin: 'superadmin',
  executiveViewer: 'executive_viewer',
  programManager: 'qiyas_admin',
  auditor: 'auditor_1',
  auditor2: 'auditor_2',
  deptManagerA: 'it_manager',
  employeeA: 'it_employee_1',
  employeeA2: 'it_employee_2',
  deptManagerB: 'hr_manager',
  employeeB: 'hr_employee_1',
} as const

export type TestUsername = (typeof USERS)[keyof typeof USERS]

/** Logs in via Quick Login and waits for navigation to the program selection page. */
export async function loginAs(page: Page, username: TestUsername): Promise<void> {
  await page.goto('/login')
  const quickLoginButton = page.getByTestId(`quick-login-${username}`)
  await expect(quickLoginButton).toBeVisible({ timeout: 10_000 })
  await quickLoginButton.click()
  await page.waitForURL(/\/programs$/, { timeout: 10_000 })
}

/** Logs in with a real username/password through the standard form — used where Quick Login itself must not be relied on. */
export async function loginWithPassword(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByTestId('login-username-input').fill(username)
  await page.getByTestId('login-password-input').fill(password)
  await page.getByTestId('login-submit-button').click()
}

export async function logout(page: Page): Promise<void> {
  // localStorage is inaccessible on about:blank (a fresh page's default
  // origin) — navigate to the app's own origin first, then clear it.
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
}

export async function openQiyasProgram(page: Page): Promise<void> {
  await page.goto('/programs')
  const card = page.getByTestId('program-card-QIYAS')
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.click()
  await page.waitForURL(/\/programs\/QIYAS\//, { timeout: 10_000 })
}
