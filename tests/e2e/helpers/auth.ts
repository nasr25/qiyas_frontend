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
  // Sumoud (Phase 5) — see backend/database/seeders/SumoudTestAccountsSeeder.php
  sumoudProgramManager: 'sumoud_pm',
  sumoudAuditor: 'sumoud_auditor',
  sumoudDeptManagerA: 'sumoud_dept_a_manager',
  sumoudEmployeeA: 'sumoud_employee_a',
  sumoudDeptManagerB: 'sumoud_dept_b_manager',
  sumoudEmployeeB: 'sumoud_employee_b',
  // Cross-program role scenarios.
  crossProgramManagerAuditor: 'cross_pm_qiyas_auditor_sumoud',
  crossEmployeeDeptManager: 'cross_employee_qiyas_deptmgr_sumoud',
  crossEmployeeBothPrograms: 'cross_employee_both_programs',
  // ECC (Phase 6) — see backend/database/seeders/ECCTestAccountsSeeder.php
  eccProgramManager: 'ecc_pm',
  eccAuditor: 'ecc_auditor',
  eccDeptManagerA: 'ecc_dept_a_manager',
  eccEmployeeA: 'ecc_employee_a',
  eccDeptManagerB: 'ecc_dept_b_manager',
  eccEmployeeB: 'ecc_employee_b',
  triProgramA: 'triprogram_qiyas_pm_sumoud_auditor_ecc_employee',
  triProgramB: 'triprogram_qiyas_emp_sumoud_deptmgr_ecc_pm',
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

export async function openSumoudProgram(page: Page): Promise<void> {
  await page.goto('/programs')
  const card = page.getByTestId('program-card-SUMOUD')
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.click()
  await page.waitForURL(/\/programs\/SUMOUD\//, { timeout: 10_000 })
}
