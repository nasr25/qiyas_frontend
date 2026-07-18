import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'

/**
 * Multi-Program Role Test (Phase 7 brief) — one user with FOUR different
 * roles across all four programs: Qiyas Program Manager, Sumoud Auditor,
 * ECC Employee, NDMO Department Manager. Proves role context is
 * re-resolved per program on every switch, never cached or inherited.
 */
test('Quad-program user resolves a different, correct role in each of the four programs', async ({ page }) => {
  await loginAs(page, USERS.quadProgramUser)

  await page.goto('/programs')
  await expect(page.getByTestId('program-card-QIYAS')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('program-card-SUMOUD')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('program-card-ECC')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('program-card-NDMO')).toBeVisible({ timeout: 10_000 })

  // Qiyas: Program Manager actions available.
  await page.goto('/programs/QIYAS/assignments')
  await expect(page.getByTestId('new-assignment-button')).toBeVisible({ timeout: 10_000 })

  // Sumoud: Auditor actions available, Program Manager actions unavailable.
  await page.goto('/programs/SUMOUD/assignments')
  await page.waitForURL(/\/programs$/, { timeout: 10_000 })
  await page.goto('/programs/SUMOUD/reviews/auditor')
  await expect(page).toHaveURL(/\/programs\/SUMOUD\/reviews\/auditor$/)

  // ECC: Employee only.
  await page.goto('/programs/ECC/assignments')
  await page.waitForURL(/\/programs$/, { timeout: 10_000 })
  await page.goto('/programs/ECC/my-requirements')
  await expect(page).toHaveURL(/\/programs\/ECC\/my-requirements$/)

  // NDMO: Department Manager review queue available, Program-Manager-only
  // assignment management unavailable.
  await page.goto('/programs/NDMO/assignments')
  await page.waitForURL(/\/programs$/, { timeout: 10_000 })
  await page.goto('/programs/NDMO/reviews/department-manager')
  await expect(page).toHaveURL(/\/programs\/NDMO\/reviews\/department-manager$/)

  // Backend must independently deny a direct NDMO Program-Manager-only call.
  const { context, token } = await apiLoginAs(USERS.quadProgramUser)
  const denied = await context.post('/api/v1/programs/NDMO/hierarchy', {
    headers: authHeaders(token),
    data: { node_type: 'domain', code: 'DENIED', name_ar: 'مرفوض', cycle_id: 1 },
  })
  expect(denied.status()).toBe(403)
  await context.dispose()

  // Return to Qiyas: Program Manager role context correctly restored.
  await page.goto('/programs/QIYAS/assignments')
  await expect(page.getByTestId('new-assignment-button')).toBeVisible({ timeout: 10_000 })

  await logout(page)
})
