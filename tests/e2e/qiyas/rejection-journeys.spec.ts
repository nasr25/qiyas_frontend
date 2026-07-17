import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { uniqueStandardCode } from '../data/fixtures'

/**
 * Rejection journeys at all three review stages — every rejection must
 * return the submission directly to the Employee (never to an intermediate
 * reviewer), and resubmission must always restart at the Department
 * Manager. See docs/playwright-test-scenarios.md.
 */

async function createAndAssignStandard(request: any): Promise<{ code: string; assignmentId: number }> {
  const code = uniqueStandardCode()
  const { context, token } = await apiLoginAs(USERS.programManager)

  const cyclesRes = await context.get('/api/v1/cycles', { headers: authHeaders(token) })
  const activeCycle = (await cyclesRes.json()).data.find((c: any) => c.status === 'active')

  await context.post(`/api/v1/cycles/${activeCycle.id}/standards`, {
    headers: authHeaders(token),
    data: { standard_number: code, name_ar: `معيار رفض ${code}`, name_en: `Rejection test ${code}` },
  })

  const deptsRes = await context.get('/api/v1/departments', { headers: authHeaders(token) })
  const deptA = (await deptsRes.json()).data.find((d: any) => d.name_en === 'Information Technology')

  const reqsRes = await context.get('/api/v1/programs/QIYAS/requirements?per_page=500', { headers: authHeaders(token) })
  const requirement = (await reqsRes.json()).data.find((r: any) => r.number === code)

  const assignRes = await context.post('/api/v1/programs/QIYAS/assignments', {
    headers: authHeaders(token),
    data: { requirement_id: requirement.id, department_id: deptA.id, due_date: '2026-12-01' },
  })
  const assignment = (await assignRes.json()).data

  await context.dispose()
  return { code, assignmentId: assignment.id }
}

async function employeeUploadAndSubmit(page: any, code: string) {
  await loginAs(page, USERS.employeeA)
  await page.goto('/programs/QIYAS/my-requirements')
  const row = page.getByTestId(`my-requirement-row-${code}`)
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.getByTestId('open-my-requirement-link').click()
  await page.waitForURL(/\/my-requirements\/\d+$/)

  await page.getByTestId('evidence-upload').setInputFiles({
    name: 'evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 rejection test evidence'),
  })
  await expect(page.getByTestId('evidence-file-list')).toContainText('evidence.pdf', { timeout: 10_000 })
  await page.getByTestId('submit-evidence-button').click()
  await expect(page.locator('body')).toContainText(/بانتظار مدير الإدارة|Pending Department Manager/i, { timeout: 10_000 })
}

test.describe('Rejection journeys — every level returns directly to the Employee', () => {
  test('A: Department Manager rejection — restarts at Department Manager on resubmission', async ({ page, request }) => {
    const { code } = await createAndAssignStandard(request)
    await employeeUploadAndSubmit(page, code)

    await logout(page)
    await loginAs(page, USERS.deptManagerA)
    await page.goto('/programs/QIYAS/reviews/department-manager')
    await page.getByTestId(`review-queue-row-${code}`).getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/department-manager\/\d+$/)
    await page.getByTestId('reject-button').click()
    await page.getByTestId('rejection-reason-input').fill('الوثائق غير مكتملة، يرجى إضافة التوقيعات المطلوبة.')
    await page.getByTestId('confirm-reject-button').click()
    await page.waitForURL(/\/reviews\/department-manager$/, { timeout: 10_000 })

    // Employee sees the returned status and the rejection reason.
    await logout(page)
    await loginAs(page, USERS.employeeA)
    await page.goto('/programs/QIYAS/my-requirements')
    await page.getByTestId(`my-requirement-row-${code}`).getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/my-requirements\/\d+$/)
    await expect(page.getByTestId('rejection-reason-banner')).toContainText('الوثائق غير مكتملة')

    // Corrected evidence -> new version -> resubmit -> restarts at Department Manager.
    await page.getByTestId('evidence-upload').setInputFiles({
      name: 'corrected.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 corrected evidence v2'),
    })
    await expect(page.getByTestId('evidence-file-list')).toContainText('corrected.pdf', { timeout: 10_000 })
    await page.getByTestId('submit-evidence-button').click()
    await expect(page.locator('body')).toContainText(/بانتظار مدير الإدارة|Pending Department Manager/i, { timeout: 10_000 })

    await logout(page)
    await loginAs(page, USERS.deptManagerA)
    await page.goto('/programs/QIYAS/reviews/department-manager')
    await expect(page.getByTestId(`review-queue-row-${code}`)).toBeVisible({ timeout: 10_000 })
  })

  test('B: Auditor rejection — returns directly to Employee, not to Department Manager', async ({ page, request }) => {
    const { code } = await createAndAssignStandard(request)
    await employeeUploadAndSubmit(page, code)

    await logout(page)
    await loginAs(page, USERS.deptManagerA)
    await page.goto('/programs/QIYAS/reviews/department-manager')
    await page.getByTestId(`review-queue-row-${code}`).getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/department-manager\/\d+$/)
    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/reviews\/department-manager$/, { timeout: 10_000 })

    await logout(page)
    await loginAs(page, USERS.auditor)
    await page.goto('/programs/QIYAS/reviews/auditor')
    await page.getByTestId(`review-queue-row-${code}`).getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/auditor\/\d+$/)
    await page.getByTestId('reject-button').click()
    await page.getByTestId('rejection-reason-input').fill('الأدلة لا تغطي جميع متطلبات المعيار.')
    await page.getByTestId('confirm-reject-button').click()
    await page.waitForURL(/\/reviews\/auditor$/, { timeout: 10_000 })

    // Must NOT reappear in the Department Manager's queue.
    await logout(page)
    await loginAs(page, USERS.deptManagerA)
    await page.goto('/programs/QIYAS/reviews/department-manager')
    await expect(page.getByTestId(`review-queue-row-${code}`)).toHaveCount(0)

    // Must appear back with the Employee, with the reason visible.
    await logout(page)
    await loginAs(page, USERS.employeeA)
    await page.goto('/programs/QIYAS/my-requirements')
    await page.getByTestId(`my-requirement-row-${code}`).getByTestId('open-my-requirement-link').click()
    await expect(page.getByTestId('rejection-reason-banner')).toContainText('الأدلة لا تغطي')
  })

  test('C: Program Manager rejection — returns directly to Employee; resubmission runs a full new review cycle', async ({ page, request }) => {
    const { code } = await createAndAssignStandard(request)
    await employeeUploadAndSubmit(page, code)

    await logout(page)
    await loginAs(page, USERS.deptManagerA)
    await page.goto('/programs/QIYAS/reviews/department-manager')
    await page.getByTestId(`review-queue-row-${code}`).getByTestId('open-review-link').click()
    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/reviews\/department-manager$/, { timeout: 10_000 })

    await logout(page)
    await loginAs(page, USERS.auditor)
    await page.goto('/programs/QIYAS/reviews/auditor')
    await page.getByTestId(`review-queue-row-${code}`).getByTestId('open-review-link').click()
    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/reviews\/auditor$/, { timeout: 10_000 })

    await logout(page)
    await loginAs(page, USERS.programManager)
    await page.goto('/programs/QIYAS/reviews/program-manager')
    await page.getByTestId(`review-queue-row-${code}`).getByTestId('open-review-link').click()
    await page.getByTestId('reject-button').click()
    await page.getByTestId('rejection-reason-input').fill('يلزم اعتماد إضافي من الجهة المعنية.')
    await page.getByTestId('confirm-reject-button').click()
    await page.waitForURL(/\/reviews\/program-manager$/, { timeout: 10_000 })

    await logout(page)
    await loginAs(page, USERS.employeeA)
    await page.goto('/programs/QIYAS/my-requirements')
    await page.getByTestId(`my-requirement-row-${code}`).getByTestId('open-my-requirement-link').click()
    await expect(page.getByTestId('rejection-reason-banner')).toContainText('يلزم اعتماد إضافي')

    await page.getByTestId('evidence-upload').setInputFiles({
      name: 'final-corrected.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 final corrected evidence'),
    })
    await page.getByTestId('submit-evidence-button').click()
    await expect(page.locator('body')).toContainText(/بانتظار مدير الإدارة|Pending Department Manager/i, { timeout: 10_000 })
  })
})
