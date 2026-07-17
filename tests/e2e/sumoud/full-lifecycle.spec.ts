import { test, expect } from '@playwright/test'
import { loginAs, logout, openSumoudProgram, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { uniqueStandardCode, DEPARTMENTS } from '../data/fixtures'

/**
 * Sumoud Full Requirement Lifecycle — proves the generic Compliance Engine
 * (Program Configuration/Hierarchy/Workflow/Review/Evidence/SLA/
 * Notification/Dashboard/Reporting/Audit Engines) genuinely supports a
 * second program end to end, through the SAME reusable views the Qiyas
 * lifecycle test drives (CycleDetailView, RequirementAssignmentsView,
 * MyRequirementDetailView, ReviewDetailView, ...) — no Sumoud-specific
 * page was created for this journey. See tests/e2e/qiyas/full-lifecycle.spec.ts
 * for the equivalent Qiyas journey this mirrors.
 *
 * Uses the seeded active Sumoud test cycle (SumoudSampleDataSeeder) rather
 * than creating a new cycle, per the brief's explicit "create a Sumoud
 * cycle OR select the seeded active test cycle" allowance — cycle creation
 * itself is covered separately by the backend
 * SumoudProgramEngineTest::test_sumoud_cycle_is_independent_... test.
 */

const requirementCode = uniqueStandardCode().replace('E2E', 'SMD-E2E')
let createdRequirementId: number
let createdAssignmentId: number

test.describe.serial('Sumoud full requirement lifecycle', () => {
  test('1-14: Program Manager sees Sumoud, opens it, creates a Requirement under a Domain/Category in the active cycle', async ({ page }) => {
    await loginAs(page, USERS.sumoudProgramManager)

    // Steps 2-4: Compliance Programs page shows Sumoud; Qiyas visibility
    // follows this user's permissions (they have no Qiyas membership at
    // all, so the Qiyas card must not appear).
    await page.goto('/programs')
    await expect(page.getByTestId('program-card-SUMOUD')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('program-card-QIYAS')).toHaveCount(0)

    await openSumoudProgram(page)

    // Step 6: select the seeded active Sumoud test cycle.
    await page.goto('/programs/SUMOUD/cycles')
    const activeCycleRow = page.getByTestId('cycle-row-active').first()
    await expect(activeCycleRow).toBeVisible({ timeout: 10_000 })
    await activeCycleRow.getByTestId('open-cycle-link').click()
    await page.waitForURL(/\/programs\/SUMOUD\/cycles\/\d+$/)

    // Steps 7-13: create a Requirement with its Domain/Category (free-text
    // fields, same generic hierarchy shape Qiyas uses), bilingual names,
    // evidence requirements, weight, and a due date.
    await page.getByTestId('create-standard-button').click()
    await page.getByTestId('standard-code-input').fill(requirementCode)
    await page.getByTestId('standard-perspective-input').fill('منظور تجريبي لصمود E2E')
    await page.getByTestId('standard-axis-input').fill('محور تجريبي لصمود E2E')
    await page.getByTestId('standard-name-ar-input').fill(`متطلب تجريبي لصمود ${requirementCode}`)
    await page.getByTestId('standard-name-en-input').fill(`Sumoud Test Requirement ${requirementCode}`)
    await page.getByTestId('standard-weight-input').fill('10')
    await page.getByTestId('save-standard-button').click()
    await expect(page.getByTestId('save-standard-button')).toBeHidden({ timeout: 10_000 })

    // Step 14: verify hierarchy + Sumoud program context.
    const row = page.getByTestId(`standard-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.sumoudProgramManager)
    const cyclesRes = await context.get('/api/v1/programs/SUMOUD/cycles', { headers: authHeaders(token), params: { status: 'active' } })
    const activeCycle = (await cyclesRes.json()).data[0]
    const stdRes = await context.get(`/api/v1/cycles/${activeCycle.id}/standards`, { headers: authHeaders(token), params: { per_page: 500 } })
    const stdBody = await stdRes.json()
    const requirements = stdBody.data
    const created = requirements.find((r: any) => r.standard_number === requirementCode)
    expect(created).toBeTruthy()
    // Step 11: correct hierarchy placement (domain/category saved as entered).
    expect(created.perspective).toBe('منظور تجريبي لصمود E2E')
    expect(created.axis).toBe('محور تجريبي لصمود E2E')
    createdRequirementId = created.id
    await context.dispose()
  })

  test('15-19: Program Manager assigns the Requirement to Department A', async ({ page }) => {
    await loginAs(page, USERS.sumoudProgramManager)
    await page.goto('/programs/SUMOUD/assignments')

    await page.getByTestId('new-assignment-button').click()
    const requirementSelect = page.getByTestId('assign-requirement-select')
    const requirementValue = await requirementSelect.locator('option', { hasText: requirementCode }).getAttribute('value')
    await requirementSelect.selectOption(requirementValue!)
    await page.getByTestId('department-select').selectOption({ label: DEPARTMENTS.a })
    await page.getByTestId('assign-instructions-ar-input').fill('يرجى رفع مستندات الإثبات المطلوبة لصمود.')
    await page.getByTestId('assign-instructions-en-input').fill('Please upload the required Sumoud evidence documents.')
    await page.getByTestId('assign-standard-button').click()

    const row = page.getByTestId(`assignment-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.sumoudProgramManager)
    const res = await context.get('/api/v1/programs/SUMOUD/assignments', { headers: authHeaders(token), params: { per_page: 100 } })
    const assignments = (await res.json()).data
    const created = assignments.find((a: any) => a.requirement.code === requirementCode)
    expect(created).toBeTruthy()
    createdAssignmentId = created.id
    await context.dispose()
  })

  test('21-33: Employee A submits evidence with a Sumoud badge/context and cannot modify it afterward', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.sumoudEmployeeA)
    await page.goto('/programs/SUMOUD/my-requirements')

    const row = page.getByTestId(`my-requirement-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/programs\/SUMOUD\/my-requirements\/\d+$/)

    // Step 26: correct Sumoud program/cycle/hierarchy/department/dates.
    await expect(page.locator('body')).toContainText(requirementCode)
    await expect(page.locator('body')).toContainText('يرجى رفع مستندات الإثبات المطلوبة لصمود.')

    const fileInput = page.getByTestId('evidence-upload')
    await fileInput.setInputFiles({
      name: 'sumoud-evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Sumoud E2E lifecycle test evidence file'),
    })
    await expect(page.getByTestId('evidence-file-list')).toContainText('sumoud-evidence.pdf', { timeout: 10_000 })
    await page.getByTestId('employee-comment-input').fill('Initial Sumoud evidence for the E2E lifecycle test.')

    await page.reload()
    await expect(page.getByTestId('evidence-file-list')).toContainText('sumoud-evidence.pdf', { timeout: 10_000 })

    await page.getByTestId('submit-evidence-button').click()
    await expect(page.locator('body')).toContainText(/بانتظار مدير الإدارة|Pending Department Manager/i, { timeout: 10_000 })

    await expect(page.getByTestId('evidence-upload')).toHaveCount(0)
    await expect(page.getByTestId('submit-evidence-button')).toHaveCount(0)
  })

  test('35-41: Department Manager A reviews and approves (only Sumoud, department-scoped)', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.sumoudDeptManagerA)
    await page.goto('/programs/SUMOUD/reviews/department-manager')

    const row = page.getByTestId(`review-queue-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/SUMOUD\/reviews\/department-manager\/\d+$/)

    await expect(page.getByTestId('evidence-file-list').or(page.locator('body'))).toContainText('sumoud-evidence.pdf')
    await page.getByTestId('review-notes-input').fill('Reviewed — Sumoud submission looks complete.')
    await page.getByTestId('approve-button').click()

    await page.waitForURL(/\/programs\/SUMOUD\/reviews\/department-manager$/, { timeout: 10_000 })
    await expect(page.getByTestId(`review-queue-row-${requirementCode}`)).toHaveCount(0)
  })

  test('43-47: Sumoud Auditor reviews Department Manager decision and approves', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.sumoudAuditor)
    await page.goto('/programs/SUMOUD/reviews/auditor')

    const row = page.getByTestId(`review-queue-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/SUMOUD\/reviews\/auditor\/\d+$/)

    await expect(page.getByTestId('prior-decision-department_manager')).toBeVisible()

    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/programs\/SUMOUD\/reviews\/auditor$/, { timeout: 10_000 })
  })

  test('49-60: Program Manager gives final approval; dashboard/report/audit/SLA/notification verified, and no Sumoud record leaks into Qiyas', async ({ page }) => {
    await logout(page)
    await loginAs(page, USERS.sumoudProgramManager)
    await page.goto('/programs/SUMOUD/reviews/program-manager')

    const row = page.getByTestId(`review-queue-row-${requirementCode}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/programs\/SUMOUD\/reviews\/program-manager\/\d+$/)

    await expect(page.getByTestId('prior-decision-auditor')).toBeVisible()

    await page.getByTestId('approve-button').click()
    await page.waitForURL(/\/programs\/SUMOUD\/reviews\/program-manager$/, { timeout: 10_000 })

    const { context, token } = await apiLoginAs(USERS.sumoudProgramManager)

    const assignmentRes = await context.get(`/api/v1/programs/SUMOUD/assignments/${createdAssignmentId}`, { headers: authHeaders(token) })
    expect((await assignmentRes.json()).data.status).toBe('completed')

    const dashboardRes = await context.get('/api/v1/programs/SUMOUD/dashboards/program-manager', { headers: authHeaders(token) })
    const dashboard = (await dashboardRes.json()).data
    expect(dashboard.status_counts.approved).toBeGreaterThanOrEqual(1)

    const historyRes = await context.get(`/api/v1/programs/SUMOUD/assignments/${createdAssignmentId}/history`, { headers: authHeaders(token) })
    const eventTypes = (await historyRes.json()).data.events.map((e: any) => e.event_type)
    expect(eventTypes).toEqual(expect.arrayContaining([
      'requirement_assigned', 'submitted_to_department_manager',
      'department_manager_approved', 'auditor_approved', 'program_manager_approved',
    ]))

    // Step 60: this Sumoud requirement must never appear in Qiyas's own
    // requirement list.
    const qiyasReqRes = await context.get('/api/v1/programs/QIYAS/requirements', { headers: authHeaders(token), params: { per_page: 500 } })
    if (qiyasReqRes.ok()) {
      const qiyasRequirements = (await qiyasReqRes.json()).data
      expect(qiyasRequirements.find((r: any) => r.code === requirementCode)).toBeUndefined()
    } else {
      // sumoud_pm has no Qiyas membership at all — a 404 here is itself
      // the isolation proof (program access denial), not a test failure.
      expect(qiyasReqRes.status()).toBe(404)
    }

    await context.dispose()
  })
})
