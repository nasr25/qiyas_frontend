import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'

/**
 * Multi-Role User Test (Phase 6 brief) — one user with THREE different
 * roles across all three programs: Qiyas Program Manager, Sumoud Auditor,
 * ECC Employee. Proves role context is re-resolved per program on every
 * switch, never cached or inherited from a previously-visited program.
 */
test('Tri-program user resolves a different, correct role in each of the three programs', async ({ page }) => {
  await loginAs(page, USERS.triProgramA)

  await page.goto('/programs')
  await expect(page.getByTestId('program-card-QIYAS')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('program-card-SUMOUD')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('program-card-ECC')).toBeVisible({ timeout: 10_000 })

  // Qiyas: Program Manager actions available.
  await page.goto('/programs/QIYAS/assignments')
  await expect(page.getByTestId('new-assignment-button')).toBeVisible({ timeout: 10_000 })

  // Switch to Sumoud: Auditor actions available, Program Manager actions unavailable.
  await page.goto('/programs/SUMOUD/assignments')
  await page.waitForURL(/\/programs$/, { timeout: 10_000 })
  await page.goto('/programs/SUMOUD/reviews/auditor')
  await expect(page).toHaveURL(/\/programs\/SUMOUD\/reviews\/auditor$/)

  // Switch to ECC: Employee only — management actions unavailable.
  await page.goto('/programs/ECC/assignments')
  await page.waitForURL(/\/programs$/, { timeout: 10_000 })
  await page.goto('/programs/ECC/my-requirements')
  await expect(page).toHaveURL(/\/programs\/ECC\/my-requirements$/)

  // Backend must independently deny a direct ECC Program-Manager-only call.
  const { context, token } = await apiLoginAs(USERS.triProgramA)
  const denied = await context.post('/api/v1/programs/ECC/hierarchy', {
    headers: authHeaders(token),
    data: { node_type: 'domain', code: 'DENIED', name_ar: 'مرفوض', cycle_id: 1 },
  })
  expect(denied.status()).toBe(403)
  await context.dispose()

  // Return to Qiyas: Program Manager role context correctly restored, not
  // left as "Employee" (the last-visited program's role) or cached stale.
  await page.goto('/programs/QIYAS/assignments')
  await expect(page.getByTestId('new-assignment-button')).toBeVisible({ timeout: 10_000 })

  await logout(page)
})
