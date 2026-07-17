import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'

/**
 * Cross-Program Role Resolution — proves a single user's role is resolved
 * per-program, never cached/reused across programs. `cross_pm_qiyas_auditor_sumoud`
 * (User A from the Phase 5 brief) is Program Manager in Qiyas and Auditor in
 * Sumoud only — see backend/database/seeders/SumoudTestAccountsSeeder.php.
 */
test.describe.serial('Cross-program role resolution', () => {
  test('User A sees both programs, with correctly different role-gated actions in each', async ({ page }) => {
    await loginAs(page, USERS.crossProgramManagerAuditor)

    await page.goto('/programs')
    await expect(page.getByTestId('program-card-QIYAS')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('program-card-SUMOUD')).toBeVisible({ timeout: 10_000 })

    // In Qiyas: Program Manager actions (assignments, cycles) are visible;
    // Auditor-only actions must not be incorrectly granted just because
    // this user IS an Auditor somewhere (Sumoud).
    await page.goto('/programs/QIYAS/assignments')
    await expect(page.getByTestId('new-assignment-button')).toBeVisible({ timeout: 10_000 })

    // Switch to Sumoud: Auditor actions available, Program Manager
    // configuration actions (assignments) unavailable.
    await page.goto('/programs/SUMOUD/assignments')
    // The route guard redirects an unauthorized program-scoped route back
    // to /programs — this user has no Sumoud program-manager role, only auditor.
    await page.waitForURL(/\/programs$/, { timeout: 10_000 })

    await page.goto('/programs/SUMOUD/reviews/auditor')
    await expect(page).toHaveURL(/\/programs\/SUMOUD\/reviews\/auditor$/)

    // Backend must independently deny a Sumoud Program Manager-only
    // endpoint for this user — never trust frontend visibility alone.
    const { context, token } = await apiLoginAs(USERS.crossProgramManagerAuditor)
    const denied = await context.post('/api/v1/programs/SUMOUD/assignments', {
      headers: authHeaders(token),
      data: { requirement_id: 999999, department_id: 1 },
    })
    expect(denied.status()).toBe(403)

    // The equivalent Qiyas action must still succeed authorization-wise
    // (validation error for a bogus requirement_id is fine — a 403 would
    // not be).
    const qiyasAttempt = await context.post('/api/v1/programs/QIYAS/assignments', {
      headers: authHeaders(token),
      data: { requirement_id: 999999, department_id: 1 },
    })
    expect(qiyasAttempt.status()).not.toBe(403)
    await context.dispose()

    // Return to Qiyas: role context correctly switches back.
    await page.goto('/programs/QIYAS/assignments')
    await expect(page.getByTestId('new-assignment-button')).toBeVisible({ timeout: 10_000 })

    await logout(page)
  })

  test('User B (Employee in Qiyas, Department Manager in Sumoud) sees different actions per program', async ({ page }) => {
    await loginAs(page, USERS.crossEmployeeDeptManager)

    // In Qiyas: Employee — no assignment-management access.
    await page.goto('/programs/QIYAS/assignments')
    await page.waitForURL(/\/programs$/, { timeout: 10_000 })

    // In Sumoud: Department Manager — can open the department-manager review queue.
    await page.goto('/programs/SUMOUD/reviews/department-manager')
    await expect(page).toHaveURL(/\/programs\/SUMOUD\/reviews\/department-manager$/)

    await logout(page)
  })
})
