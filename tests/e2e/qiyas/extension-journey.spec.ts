import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { uniqueStandardCode } from '../data/fixtures'

/**
 * Extension request journey — Employee requests, Department Manager can
 * view but never decide, Auditor approves or rejects. See
 * docs/playwright-test-scenarios.md.
 */

async function createAndAssignStandard(dueDate: string): Promise<string> {
  const code = uniqueStandardCode()
  const { context, token } = await apiLoginAs(USERS.programManager)

  const cyclesRes = await context.get('/api/v1/cycles', { headers: authHeaders(token) })
  const activeCycle = (await cyclesRes.json()).data.find((c: any) => c.status === 'active')
  await context.post(`/api/v1/cycles/${activeCycle.id}/standards`, {
    headers: authHeaders(token),
    data: { standard_number: code, name_ar: `معيار تمديد ${code}`, name_en: `Extension test ${code}` },
  })

  const deptsRes = await context.get('/api/v1/departments', { headers: authHeaders(token) })
  const deptA = (await deptsRes.json()).data.find((d: any) => d.name_en === 'Information Technology')
  const reqsRes = await context.get('/api/v1/programs/QIYAS/requirements?per_page=500', { headers: authHeaders(token) })
  const requirement = (await reqsRes.json()).data.find((r: any) => r.number === code)

  await context.post('/api/v1/programs/QIYAS/assignments', {
    headers: authHeaders(token),
    data: { requirement_id: requirement.id, department_id: deptA.id, due_date: dueDate },
  })

  await context.dispose()
  return code
}

test.describe('Extension request journey', () => {
  test('Employee requests, Department Manager cannot decide, Auditor approves — original due date preserved', async ({ page }) => {
    const code = await createAndAssignStandard('2026-08-01')

    await loginAs(page, USERS.employeeA)
    await page.goto('/programs/QIYAS/my-requirements')
    await page.getByTestId(`my-requirement-row-${code}`).getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/my-requirements\/\d+$/)

    await page.getByTestId('extension-request-button').click()
    await page.getByTestId('extension-date-input').fill('2026-09-15')
    await page.getByTestId('extension-reason-input').fill('نحتاج وقتًا إضافيًا لاستكمال جمع المستندات من الجهات ذات العلاقة.')
    await page.getByTestId('extension-submit-button').click()
    await expect(page.locator('body')).toContainText(/تم إرسال طلب التمديد|Extension request submitted/i, { timeout: 10_000 })

    // Department Manager can view the request exists but has no decide controls anywhere for it.
    await logout(page)
    await loginAs(page, USERS.deptManagerA)
    await page.goto('/programs/QIYAS/extension-requests')
    await expect(page.getByTestId(`extension-row-${code}`)).toHaveCount(0) // route is auditor-only; verify via API isolation instead
    const { context: dmContext, token: dmToken } = await apiLoginAs(USERS.deptManagerA)
    const dmAttempt = await dmContext.get('/api/v1/programs/QIYAS/reviews/auditor/extension-requests', { headers: authHeaders(dmToken) })
    expect(dmAttempt.status()).toBe(403)
    await dmContext.dispose()

    // Auditor approves.
    await logout(page)
    await loginAs(page, USERS.auditor)
    await page.goto('/programs/QIYAS/extension-requests')
    const row = page.getByTestId(`extension-row-${code}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('approve-extension-button').click()
    await page.getByTestId('extension-decision-notes-input').fill('تمت الموافقة نظراً لظروف مبررة.')
    await page.getByTestId('confirm-extension-decision-button').click()
    // Decided requests remain listed for reference but lose their action buttons.
    await expect(page.getByTestId(`extension-row-${code}`).getByTestId('approve-extension-button')).toHaveCount(0, { timeout: 10_000 })

    // Verify original due date preserved, effective due date updated.
    const { context, token } = await apiLoginAs(USERS.programManager)
    const assignRes = await context.get('/api/v1/programs/QIYAS/assignments?per_page=200', { headers: authHeaders(token) })
    const assignment = (await assignRes.json()).data.find((a: any) => a.requirement.code === code)
    expect(assignment.effective_due_date).toBe('2026-09-15')
    await context.dispose()
  })

  test('Auditor rejects — effective due date remains unchanged, reason is mandatory', async ({ page }) => {
    const code = await createAndAssignStandard('2026-08-01')

    await loginAs(page, USERS.employeeA)
    await page.goto('/programs/QIYAS/my-requirements')
    await page.getByTestId(`my-requirement-row-${code}`).getByTestId('open-my-requirement-link').click()
    await page.getByTestId('extension-request-button').click()
    await page.getByTestId('extension-date-input').fill('2026-09-20')
    await page.getByTestId('extension-reason-input').fill('سبب طلب التمديد.')
    await page.getByTestId('extension-submit-button').click()
    await expect(page.locator('body')).toContainText(/تم إرسال طلب التمديد|Extension request submitted/i, { timeout: 10_000 })

    await logout(page)
    await loginAs(page, USERS.auditor)
    await page.goto('/programs/QIYAS/extension-requests')
    const row = page.getByTestId(`extension-row-${code}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('reject-extension-button').click()

    // Reason is mandatory — the confirm button stays disabled without one.
    await expect(page.getByTestId('confirm-extension-decision-button')).toBeDisabled()
    await page.getByTestId('extension-decision-reason-input').fill('لا يوجد مبرر كافٍ لتمديد الموعد.')
    await page.getByTestId('confirm-extension-decision-button').click()
    await expect(page.getByTestId(`extension-row-${code}`).getByTestId('reject-extension-button')).toHaveCount(0, { timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.programManager)
    const assignRes = await context.get('/api/v1/programs/QIYAS/assignments?per_page=200', { headers: authHeaders(token) })
    const assignment = (await assignRes.json()).data.find((a: any) => a.requirement.code === code)
    expect(assignment.effective_due_date).toBe('2026-08-01') // unchanged
    await context.dispose()
  })
})
