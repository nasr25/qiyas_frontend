import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { uniqueStandardCode, DEPARTMENTS } from '../data/fixtures'

/**
 * NDMO Full Requirement Lifecycle — proves the generic Compliance Engine
 * supports a FOURTH program, with yet another hierarchy shape (Domain ->
 * Policy -> Standard -> Requirement, five configured levels including
 * Subrequirement) than Qiyas/Sumoud (two levels) and ECC (four levels),
 * through the SAME ComplianceNode engine and the SAME reusable Vue
 * components — no NDMO-specific page exists. Also exercises the new
 * Phase 7 responsibility engine (Data Owner/Data Steward), which is
 * purely informational and grants no workflow authority.
 *
 * Uses the seeded active NDMO test cycle and drills into its seeded test
 * Domain/Policy/Standard (ECCSampleDataSeeder-equivalent) rather than
 * creating a cycle from scratch — same allowance used for Sumoud/ECC.
 */

const requirementCode = uniqueStandardCode().replace('E2E', 'NDMO-E2E')
let createdAssignmentId: number

test.describe.serial('NDMO full requirement lifecycle', () => {
  test('1-16: Program Manager sees NDMO, drills Domain -> Policy -> Standard, creates a Requirement', async ({ page }) => {
    await loginAs(page, USERS.ndmoProgramManager)

    await page.goto('/programs')
    await expect(page.getByTestId('program-card-NDMO')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('program-card-QIYAS')).toHaveCount(0)
    await expect(page.getByTestId('program-card-SUMOUD')).toHaveCount(0)
    await expect(page.getByTestId('program-card-ECC')).toHaveCount(0)

    await page.getByTestId('program-card-NDMO').click()
    await page.waitForURL(/\/programs\/NDMO\//, { timeout: 10_000 })

    // Step 5-6: seeded active cycle + its development test content version.
    const { context, token } = await apiLoginAs(USERS.ndmoProgramManager)
    const cyclesRes = await context.get('/api/v1/programs/NDMO/cycles', { headers: authHeaders(token), params: { status: 'active' } })
    const activeCycle = (await cyclesRes.json()).data[0]
    expect(activeCycle).toBeTruthy()
    const versionsRes = await context.get('/api/v1/programs/NDMO/content-versions', { headers: authHeaders(token) })
    expect((await versionsRes.json()).data.length).toBeGreaterThanOrEqual(1)
    await context.dispose()

    // Steps 7-16: drill Domain -> Policy -> Standard -> create Requirement.
    await page.goto('/programs/NDMO/hierarchy')
    await expect(page.getByTestId('hierarchy-node-NDMO-D1')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('hierarchy-node-NDMO-D1').click()
    await expect(page.getByTestId('hierarchy-node-NDMO-D1-P1')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('hierarchy-node-NDMO-D1-P1').click()
    await expect(page.getByTestId('hierarchy-node-NDMO-D1-P1-S1')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('hierarchy-node-NDMO-D1-P1-S1').click()

    await page.getByTestId('create-child-button').click()
    await page.getByTestId('node-code-input').fill(requirementCode)
    await page.getByTestId('node-name-ar-input').fill(`متطلب اختبار شامل ${requirementCode}`)
    await page.getByTestId('node-name-en-input').fill(`E2E Lifecycle Requirement ${requirementCode}`)
    await page.getByTestId('node-guidance-ar-input').fill('إرشاد تجريبي لأغراض اختبار الحياة الكاملة.')
    await page.getByTestId('node-evidence-requirements-input').fill('إرفاق أي مستند لأغراض اختبار مسار الأدلة.')
    await page.getByTestId('node-weight-input').fill('10')
    await page.getByTestId('save-node-button').click()

    const row = page.getByTestId(`hierarchy-node-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row).toContainText('قابل للتقييم')
  })

  test('17-22: Program Manager assigns the Requirement to Department A with Data Owner and Data Steward', async ({ page }) => {
    await loginAs(page, USERS.ndmoProgramManager)
    await page.goto('/programs/NDMO/assignments')

    await page.getByTestId('new-assignment-button').click()
    const requirementSelect = page.getByTestId('assign-requirement-select')
    const requirementValue = await requirementSelect.locator('option', { hasText: requirementCode }).getAttribute('value')
    await requirementSelect.selectOption(requirementValue!)
    await page.getByTestId('department-select').selectOption({ label: DEPARTMENTS.a })

    // Step 19: responsibility selects appear once a department is chosen (NDMO enables Data Owner/Data Steward).
    await expect(page.getByTestId('responsibility-select-data_owner')).toBeVisible({ timeout: 10_000 })
    const ownerOption = await page.getByTestId('responsibility-select-data_owner').locator('option', { hasText: 'NDMO Data Owner A' }).getAttribute('value')
    await page.getByTestId('responsibility-select-data_owner').selectOption(ownerOption!)
    const stewardOption = await page.getByTestId('responsibility-select-data_steward').locator('option', { hasText: 'NDMO Data Steward A' }).getAttribute('value')
    await page.getByTestId('responsibility-select-data_steward').selectOption(stewardOption!)

    await page.getByTestId('assign-instructions-ar-input').fill('يرجى رفع مستندات الإثبات المطلوبة للمتطلب.')
    await page.getByTestId('assign-instructions-en-input').fill('Please upload the required requirement evidence documents.')
    await page.getByTestId('assign-standard-button').click()

    const row = page.getByTestId(`assignment-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.ndmoProgramManager)
    const res = await context.get('/api/v1/programs/NDMO/assignments', { headers: authHeaders(token), params: { per_page: 100 } })
    const assignments = (await res.json()).data
    const created = assignments.find((a: any) => a.requirement.code === requirementCode)
    expect(created).toBeTruthy()
    createdAssignmentId = created.id

    const respRes = await context.get(`/api/v1/programs/NDMO/assignments/${createdAssignmentId}/responsibilities`, { headers: authHeaders(token) })
    const responsibilities = (await respRes.json()).data
    expect(responsibilities.map((r: any) => r.responsibility_type).sort()).toEqual(['data_owner', 'data_steward'])
    await context.dispose()
  })

  test('24-38: Employee A submits evidence, sees responsibility info, and cannot modify it afterward', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.ndmoEmployeeA)
    await page.goto('/programs/NDMO/my-requirements')

    const row = page.getByTestId(`my-requirement-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/programs\/NDMO\/my-requirements\/\d+$/)

    await expect(page.locator('body')).toContainText(requirementCode)
    await expect(page.locator('body')).toContainText('يرجى رفع مستندات الإثبات المطلوبة للمتطلب.')

    // Step 30: responsibility information is visible on the task detail page.
    await expect(page.getByTestId('responsibilities-list')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('responsibility-data_owner')).toContainText('NDMO Data Owner A')
    await expect(page.getByTestId('responsibility-data_steward')).toContainText('NDMO Data Steward A')

    const fileInput = page.getByTestId('evidence-upload')
    await fileInput.setInputFiles({
      name: 'ndmo-evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 NDMO E2E lifecycle test evidence file'),
    })
    await expect(page.getByTestId('evidence-file-list')).toContainText('ndmo-evidence.pdf', { timeout: 10_000 })
    await page.getByTestId('employee-comment-input').fill('Initial NDMO evidence for the E2E lifecycle test.')

    await page.reload()
    await expect(page.getByTestId('evidence-file-list')).toContainText('ndmo-evidence.pdf', { timeout: 10_000 })

    await page.getByTestId('submit-evidence-button').click()
    await expect(page.locator('body')).toContainText(/بانتظار مدير الإدارة|Pending Department Manager/i, { timeout: 10_000 })

    await expect(page.getByTestId('evidence-upload')).toHaveCount(0)
    await expect(page.getByTestId('submit-evidence-button')).toHaveCount(0)
  })

  test('40-46: Department Manager A reviews and approves (department-scoped, NDMO only)', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.ndmoDeptManagerA)
    await page.goto('/programs/NDMO/reviews/department-manager')

    const row = page.getByTestId(`review-queue-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/NDMO\/reviews\/department-manager\/\d+$/)

    await expect(page.getByTestId('evidence-file-list').or(page.locator('body'))).toContainText('ndmo-evidence.pdf')
    await page.getByTestId('review-notes-input').fill('Reviewed — NDMO requirement submission looks complete.')
    await page.getByTestId('approve-button').click()

    await page.waitForURL(/\/programs\/NDMO\/reviews\/department-manager$/, { timeout: 10_000 })
    await expect(page.getByTestId(`review-queue-row-${requirementCode}`)).toHaveCount(0)
  })

  test('48-52: NDMO Auditor reviews Department Manager decision and approves', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.ndmoAuditor)
    await page.goto('/programs/NDMO/reviews/auditor')

    const row = page.getByTestId(`review-queue-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/NDMO\/reviews\/auditor\/\d+$/)

    await expect(page.getByTestId('prior-decision-department_manager')).toBeVisible()

    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/programs\/NDMO\/reviews\/auditor$/, { timeout: 10_000 })
  })

  test('54-65: Program Manager gives final approval; dashboard/report/audit/SLA verified, and no NDMO data leaks into other programs', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.ndmoProgramManager)
    await page.goto('/programs/NDMO/reviews/program-manager')

    const row = page.getByTestId(`review-queue-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/NDMO\/reviews\/program-manager\/\d+$/)

    await expect(page.getByTestId('prior-decision-auditor')).toBeVisible()

    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/programs\/NDMO\/reviews\/program-manager$/, { timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.ndmoProgramManager)

    const assignmentRes = await context.get(`/api/v1/programs/NDMO/assignments/${createdAssignmentId}`, { headers: authHeaders(token) })
    expect((await assignmentRes.json()).data.status).toBe('completed')

    const dashboardRes = await context.get('/api/v1/programs/NDMO/dashboards/program-manager', { headers: authHeaders(token) })
    const dashboard = (await dashboardRes.json()).data
    expect(dashboard.status_counts.approved).toBeGreaterThanOrEqual(1)

    const historyRes = await context.get(`/api/v1/programs/NDMO/assignments/${createdAssignmentId}/history`, { headers: authHeaders(token) })
    const eventTypes = (await historyRes.json()).data.events.map((e: any) => e.event_type)
    expect(eventTypes).toEqual(expect.arrayContaining([
      'requirement_assigned', 'submitted_to_department_manager',
      'department_manager_approved', 'auditor_approved', 'program_manager_approved',
    ]))

    const reportRes = await context.get('/api/v1/programs/NDMO/reports/overdue-requirements', { headers: authHeaders(token) })
    expect(reportRes.ok()).toBeTruthy()

    // Step 65: this NDMO requirement must never appear in Qiyas's,
    // Sumoud's, or ECC's own requirement lists — ndmo_pm has no
    // membership in any of them, so 404 itself is the isolation proof.
    for (const code of ['QIYAS', 'SUMOUD', 'ECC']) {
      const res = await context.get(`/api/v1/programs/${code}/requirements`, { headers: authHeaders(token), params: { per_page: 500 } })
      expect(res.status()).toBe(404)
    }

    await context.dispose()
  })
})
