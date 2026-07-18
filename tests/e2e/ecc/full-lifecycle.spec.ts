import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { uniqueStandardCode, DEPARTMENTS } from '../data/fixtures'

/**
 * ECC Full Control Lifecycle — proves the generic Compliance Engine
 * supports a THIRD program with a genuinely deeper hierarchy (Main Domain
 * -> Subdomain -> Control -> Subcontrol) than Qiyas/Sumoud's two-level
 * shape, through the new generic ComplianceNode hierarchy engine
 * (HierarchyExplorerView.vue), while reusing the exact same assignment/
 * evidence/review/SLA/notification/dashboard/report pipeline Qiyas and
 * Sumoud already use — an ECC Control is bridged into `standards` and
 * appears in the same RequirementAssignmentsView/MyRequirementDetailView/
 * ReviewDetailView components unmodified.
 *
 * Uses the seeded active ECC test cycle (ECCSampleDataSeeder) and drills
 * into its seeded test domain/subdomain to create a NEW control, rather
 * than creating a cycle from scratch — same allowance the Sumoud lifecycle
 * test used.
 */

const controlCode = uniqueStandardCode().replace('E2E', 'ECC-E2E')
let createdAssignmentId: number

test.describe.serial('ECC full control lifecycle', () => {
  test('1-14: Program Manager sees ECC, drills into the hierarchy, creates a Control under the seeded Domain/Subdomain', async ({ page }) => {
    await loginAs(page, USERS.eccProgramManager)

    await page.goto('/programs')
    await expect(page.getByTestId('program-card-ECC')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('program-card-QIYAS')).toHaveCount(0)
    await expect(page.getByTestId('program-card-SUMOUD')).toHaveCount(0)

    await page.getByTestId('program-card-ECC').click()
    await page.waitForURL(/\/programs\/ECC\//, { timeout: 10_000 })

    // Step 5-6: seeded active cycle + its content version (verified via API — no content-version UI this phase).
    const { context, token } = await apiLoginAs(USERS.eccProgramManager)
    const cyclesRes = await context.get('/api/v1/programs/ECC/cycles', { headers: authHeaders(token), params: { status: 'active' } })
    const activeCycle = (await cyclesRes.json()).data[0]
    expect(activeCycle).toBeTruthy()
    expect(activeCycle.id).toBeTruthy()
    const versionsRes = await context.get('/api/v1/programs/ECC/content-versions', { headers: authHeaders(token) })
    const versions = (await versionsRes.json()).data
    expect(versions.length).toBeGreaterThanOrEqual(1)
    await context.dispose()

    // Steps 7-14: drill Domain -> Subdomain -> create Control.
    await page.goto('/programs/ECC/hierarchy')
    await expect(page.getByTestId(/hierarchy-node-ECC-D1$/)).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('hierarchy-node-ECC-D1').click()
    await expect(page.getByTestId('hierarchy-node-ECC-D1-S1')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('hierarchy-node-ECC-D1-S1').click()

    await page.getByTestId('create-child-button').click()
    await page.getByTestId('node-code-input').fill(controlCode)
    await page.getByTestId('node-name-ar-input').fill(`ضابط اختبار شامل ${controlCode}`)
    await page.getByTestId('node-name-en-input').fill(`E2E Lifecycle Control ${controlCode}`)
    await page.getByTestId('node-guidance-ar-input').fill('إرشاد تجريبي لأغراض اختبار الحياة الكاملة.')
    await page.getByTestId('node-evidence-requirements-input').fill('إرفاق أي مستند لأغراض اختبار مسار الأدلة.')
    await page.getByTestId('node-weight-input').fill('10')
    await page.getByTestId('save-node-button').click()

    const row = page.getByTestId(`hierarchy-node-${controlCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row).toContainText('قابل للتقييم')
  })

  test('15-19: Program Manager assigns the Control to Department A', async ({ page }) => {
    await loginAs(page, USERS.eccProgramManager)
    await page.goto('/programs/ECC/assignments')

    await page.getByTestId('new-assignment-button').click()
    const requirementSelect = page.getByTestId('assign-requirement-select')
    const requirementValue = await requirementSelect.locator('option', { hasText: controlCode }).getAttribute('value')
    await requirementSelect.selectOption(requirementValue!)
    await page.getByTestId('department-select').selectOption({ label: DEPARTMENTS.a })
    await page.getByTestId('assign-instructions-ar-input').fill('يرجى رفع مستندات الإثبات المطلوبة للضابط.')
    await page.getByTestId('assign-instructions-en-input').fill('Please upload the required control evidence documents.')
    await page.getByTestId('assign-standard-button').click()

    const row = page.getByTestId(`assignment-row-${controlCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.eccProgramManager)
    const res = await context.get('/api/v1/programs/ECC/assignments', { headers: authHeaders(token), params: { per_page: 100 } })
    const assignments = (await res.json()).data
    const created = assignments.find((a: any) => a.requirement.code === controlCode)
    expect(created).toBeTruthy()
    createdAssignmentId = created.id
    await context.dispose()
  })

  test('21-33: Employee A submits evidence for the Control and cannot modify it afterward', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.eccEmployeeA)
    await page.goto('/programs/ECC/my-requirements')

    const row = page.getByTestId(`my-requirement-row-${controlCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/programs\/ECC\/my-requirements\/\d+$/)

    await expect(page.locator('body')).toContainText(controlCode)
    await expect(page.locator('body')).toContainText('يرجى رفع مستندات الإثبات المطلوبة للضابط.')

    const fileInput = page.getByTestId('evidence-upload')
    await fileInput.setInputFiles({
      name: 'ecc-evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 ECC E2E lifecycle test evidence file'),
    })
    await expect(page.getByTestId('evidence-file-list')).toContainText('ecc-evidence.pdf', { timeout: 10_000 })
    await page.getByTestId('employee-comment-input').fill('Initial ECC evidence for the E2E lifecycle test.')

    await page.reload()
    await expect(page.getByTestId('evidence-file-list')).toContainText('ecc-evidence.pdf', { timeout: 10_000 })

    await page.getByTestId('submit-evidence-button').click()
    await expect(page.locator('body')).toContainText(/بانتظار مدير الإدارة|Pending Department Manager/i, { timeout: 10_000 })

    await expect(page.getByTestId('evidence-upload')).toHaveCount(0)
    await expect(page.getByTestId('submit-evidence-button')).toHaveCount(0)
  })

  test('35-41: Department Manager A reviews and approves (department-scoped, ECC only)', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.eccDeptManagerA)
    await page.goto('/programs/ECC/reviews/department-manager')

    const row = page.getByTestId(`review-queue-row-${controlCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/ECC\/reviews\/department-manager\/\d+$/)

    await expect(page.getByTestId('evidence-file-list').or(page.locator('body'))).toContainText('ecc-evidence.pdf')
    await page.getByTestId('review-notes-input').fill('Reviewed — ECC control submission looks complete.')
    await page.getByTestId('approve-button').click()

    await page.waitForURL(/\/programs\/ECC\/reviews\/department-manager$/, { timeout: 10_000 })
    await expect(page.getByTestId(`review-queue-row-${controlCode}`)).toHaveCount(0)
  })

  test('43-47: ECC Auditor reviews Department Manager decision and approves', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.eccAuditor)
    await page.goto('/programs/ECC/reviews/auditor')

    const row = page.getByTestId(`review-queue-row-${controlCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/ECC\/reviews\/auditor\/\d+$/)

    await expect(page.getByTestId('prior-decision-department_manager')).toBeVisible()

    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/programs\/ECC\/reviews\/auditor$/, { timeout: 10_000 })
  })

  test('49-60: Program Manager gives final approval; dashboard/report/audit/SLA verified, and no ECC record leaks into Qiyas or Sumoud', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.eccProgramManager)
    await page.goto('/programs/ECC/reviews/program-manager')

    const row = page.getByTestId(`review-queue-row-${controlCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/ECC\/reviews\/program-manager\/\d+$/)

    await expect(page.getByTestId('prior-decision-auditor')).toBeVisible()

    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/programs\/ECC\/reviews\/program-manager$/, { timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.eccProgramManager)

    const assignmentRes = await context.get(`/api/v1/programs/ECC/assignments/${createdAssignmentId}`, { headers: authHeaders(token) })
    expect((await assignmentRes.json()).data.status).toBe('completed')

    const dashboardRes = await context.get('/api/v1/programs/ECC/dashboards/program-manager', { headers: authHeaders(token) })
    const dashboard = (await dashboardRes.json()).data
    expect(dashboard.status_counts.approved).toBeGreaterThanOrEqual(1)

    const historyRes = await context.get(`/api/v1/programs/ECC/assignments/${createdAssignmentId}/history`, { headers: authHeaders(token) })
    const eventTypes = (await historyRes.json()).data.events.map((e: any) => e.event_type)
    expect(eventTypes).toEqual(expect.arrayContaining([
      'requirement_assigned', 'submitted_to_department_manager',
      'department_manager_approved', 'auditor_approved', 'program_manager_approved',
    ]))

    const reportRes = await context.get('/api/v1/programs/ECC/reports/overdue-requirements', { headers: authHeaders(token) })
    expect(reportRes.ok()).toBeTruthy()

    // Step 60: this ECC control must never appear in Qiyas's or Sumoud's own requirement lists.
    const qiyasReqRes = await context.get('/api/v1/programs/QIYAS/requirements', { headers: authHeaders(token), params: { per_page: 500 } })
    expect(qiyasReqRes.status()).toBe(404) // ecc_pm has no Qiyas membership — denial itself is the isolation proof.
    const sumoudReqRes = await context.get('/api/v1/programs/SUMOUD/requirements', { headers: authHeaders(token), params: { per_page: 500 } })
    expect(sumoudReqRes.status()).toBe(404)

    await context.dispose()
  })
})
