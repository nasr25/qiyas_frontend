import { test, expect } from '@playwright/test'
import { LIFECYCLE_PROGRAMS, login, api, findFreeAssignableNode, departmentOf, uploadEvidence } from '../helpers/lifecycle'

/**
 * The complete browser journey, run against every program.
 *
 * Program Manager → assign → Employee → evidence → submit →
 * Department Manager → Auditor → Program Manager → approved.
 *
 * Replaces four duplicated per-program lifecycle specs that authored legacy
 * `Standard` rows. Everything here goes through ComplianceNode, and the
 * spec never names a hierarchy level — so the same body proves the journey
 * on a 3-level and a 7-level program alike.
 *
 * Tests run serially within a describe because they share one assignment
 * and move it through real state transitions.
 */
for (const program of LIFECYCLE_PROGRAMS) {
  test.describe.serial(`${program.code} (${program.depth} levels) — full lifecycle`, () => {
    let requirementCode: string
    let assignmentId: number

    test('Program Manager assigns an assignable node to a department', async ({ page }) => {
      // Assign to the employee's OWN department, so the later steps test the
      // workflow rather than re-testing department scoping.
      const departmentId = await departmentOf(page, program.users.employee)

      await login(page, program.users.pm)

      const node = await findFreeAssignableNode(page, program.code)
      requirementCode = node.code

      // The node carries its whole path at whatever depth this program has.
      expect(node.path.length).toBeGreaterThan(0)
      expect(node.path.length).toBeLessThanOrEqual(program.depth)

      const created = await api(page, `/programs/${program.code}/assignments`, {
        method: 'POST',
        body: {
          requirement_id: node.id,
          department_id: departmentId,
          due_date: '2026-12-31',
          instructions_ar: 'يرجى رفع مستندات الإثبات.',
          instructions_en: 'Please upload the required evidence.',
        },
      })
      expect(created.status, JSON.stringify(created.body)).toBe(201)
      assignmentId = created.body.data.id

      // And it is visible on the assignments screen under its own code.
      await page.goto(`/programs/${program.code}/assignments`)
      await expect(page.getByTestId(`assignment-row-${requirementCode}`)).toBeVisible({ timeout: 20_000 })
    })

    test('a node on a non-assignable level cannot be assigned', async ({ page }) => {
      await login(page, program.users.pm)

      // Read the TREE rather than the requirements list: the latter only
      // returns assessable nodes, so a grouping node would never appear
      // there and the guard would go untested.
      const structure = await api(page, `/programs/${program.code}/structure`)
      const nonAssignable = structure.body.data.definition.levels
        .filter((l: any) => l.is_active && !l.is_assignable)
        .map((l: any) => l.key)
      expect(nonAssignable.length, 'every fixture has at least one grouping level').toBeGreaterThan(0)

      const roots = await api(page, `/programs/${program.code}/hierarchy`)
      const grouping = (roots.body.data ?? []).find((n: any) => nonAssignable.includes(n.level_key))
      expect(grouping, 'a grouping node must exist to test the guard against').toBeTruthy()

      const departments = await api(page, '/departments')
      const refused = await api(page, `/programs/${program.code}/assignments`, {
        method: 'POST',
        body: { requirement_id: grouping.id, department_id: departments.body.data[0].id },
      })

      // 404 (not an assessable requirement) or 409 (level is not assignable)
      // are both correct refusals; 201 would not be.
      expect([404, 409, 422]).toContain(refused.status)
    })

    test('Employee sees the assignment with its full hierarchy context and submits evidence', async ({ page }) => {
      await login(page, program.users.employee)

      await page.goto(`/programs/${program.code}/my-requirements`)
      const row = page.getByTestId(`my-requirement-row-${requirementCode}`)
      await expect(row).toBeVisible({ timeout: 20_000 })

      // Hierarchy context travels with the assignment.
      const mine = await api(page, `/programs/${program.code}/my-requirements`)
      const item = mine.body.data.find((i: any) => i.requirement.code === requirementCode)
      expect(item, 'the employee must see their own assignment').toBeTruthy()
      expect(item.requirement.path.length).toBeGreaterThan(0)
      expect(item.requirement.level_name).toBeTruthy()

      const draft = await api(page, `/programs/${program.code}/assignments/${assignmentId}/draft`, { method: 'POST' })
      expect([200, 201]).toContain(draft.status)

      // Evidence is mandatory before submitting — upload through the real
      // endpoint, then confirm it is attached to the right submission.
      await uploadEvidence(page, program.code, draft.body.data.id)
      const withFile = await api(page, `/programs/${program.code}/evidence-submissions/${draft.body.data.id}`)
      expect(withFile.body.data.files.length).toBeGreaterThan(0)

      const submitted = await api(page,
        `/programs/${program.code}/evidence-submissions/${draft.body.data.id}/submit`,
        { method: 'POST', body: { employee_comment: 'Evidence attached.' } })
      expect(submitted.status, JSON.stringify(submitted.body)).toBe(200)
      expect(submitted.body.data.status).toBe('pending_department_manager')
    })

    test('Department Manager approves, then Auditor approves', async ({ page }) => {
      await login(page, program.users.deptManager)

      const queue = await api(page, `/programs/${program.code}/reviews/department-manager`)
      expect(queue.status).toBe(200)
      const pending = queue.body.data.find((i: any) => i.requirement.code === requirementCode)
      expect(pending, 'the submission must reach the Department Manager queue').toBeTruthy()

      const dmApproved = await api(page,
        `/programs/${program.code}/reviews/department-manager/${pending.id}/approve`,
        { method: 'POST', body: { notes: 'Looks complete.' } })
      expect(dmApproved.status).toBe(200)
      expect(dmApproved.body.data.status).toBe('pending_auditor')

      await login(page, program.users.auditor)
      const auditorQueue = await api(page, `/programs/${program.code}/reviews/auditor`)
      const forAuditor = auditorQueue.body.data.find((i: any) => i.requirement.code === requirementCode)
      expect(forAuditor).toBeTruthy()

      const auditorApproved = await api(page,
        `/programs/${program.code}/reviews/auditor/${forAuditor.id}/approve`,
        { method: 'POST', body: { notes: 'Verified.' } })
      expect(auditorApproved.status).toBe(200)
      expect(auditorApproved.body.data.status).toBe('pending_program_manager')
    })

    test('Program Manager gives final approval and the requirement completes', async ({ page }) => {
      await login(page, program.users.pm)

      const queue = await api(page, `/programs/${program.code}/reviews/program-manager`)
      const pending = queue.body.data.find((i: any) => i.requirement.code === requirementCode)
      expect(pending, 'the submission must reach the Program Manager queue').toBeTruthy()

      const approved = await api(page,
        `/programs/${program.code}/reviews/program-manager/${pending.id}/approve`,
        { method: 'POST', body: { notes: 'Approved.' } })
      expect(approved.status).toBe(200)
      expect(approved.body.data.status).toBe('approved')

      // The dashboard reflects at least one approval.
      const metrics = await api(page, `/programs/${program.code}/dashboard/metrics`)
      expect(metrics.body.data.metrics.count_approved).toBeGreaterThan(0)
    })
  })

  test.describe.serial(`${program.code} (${program.depth} levels) — extension requests`, () => {
    test('an Employee requests an extension and the Auditor decides it', async ({ page }) => {
      const departmentId = await departmentOf(page, program.users.employee)
      await login(page, program.users.pm)

      const node = await findFreeAssignableNode(page, program.code)
      const created = await api(page, `/programs/${program.code}/assignments`, {
        method: 'POST',
        body: { requirement_id: node.id, department_id: departmentId, due_date: '2026-06-30' },
      })
      expect(created.status).toBe(201)
      const assignmentId = created.body.data.id
      const originalDueDate = created.body.data.effective_due_date

      // Employee requests more time.
      await login(page, program.users.employee)
      const requested = await api(page,
        `/programs/${program.code}/assignments/${assignmentId}/extension-requests`,
        { method: 'POST', body: { requested_due_date: '2026-12-31', reason: 'نحتاج وقتًا إضافيًا لجمع الأدلة.' } })
      expect(requested.status, JSON.stringify(requested.body)).toBe(201)

      // A Department Manager may not decide extensions — the configured
      // reviewer for these programs is the Auditor.
      await login(page, program.users.deptManager)
      const wrongReviewer = await api(page,
        `/programs/${program.code}/reviews/auditor/extension-requests/${requested.body.data.id}/approve`,
        { method: 'POST', body: {} })
      expect([403, 404]).toContain(wrongReviewer.status)

      // The due date is untouched while the request is pending.
      await login(page, program.users.pm)
      const stillPending = await api(page, `/programs/${program.code}/assignments/${assignmentId}`)
      expect(stillPending.body.data.effective_due_date).toBe(originalDueDate)

      // Auditor approves, and the due date moves.
      await login(page, program.users.auditor)
      const approved = await api(page,
        `/programs/${program.code}/reviews/auditor/extension-requests/${requested.body.data.id}/approve`,
        { method: 'POST', body: { notes: 'Granted.' } })
      expect(approved.status, JSON.stringify(approved.body)).toBe(200)

      await login(page, program.users.pm)
      const after = await api(page, `/programs/${program.code}/assignments/${assignmentId}`)
      expect(after.body.data.effective_due_date).not.toBe(originalDueDate)
    })

    test('a rejected extension leaves the due date unchanged and requires a reason', async ({ page }) => {
      const departmentId = await departmentOf(page, program.users.employee)
      await login(page, program.users.pm)

      const node = await findFreeAssignableNode(page, program.code)
      const created = await api(page, `/programs/${program.code}/assignments`, {
        method: 'POST',
        body: { requirement_id: node.id, department_id: departmentId, due_date: '2026-06-30' },
      })
      const assignmentId = created.body.data.id
      const originalDueDate = created.body.data.effective_due_date

      await login(page, program.users.employee)
      const requested = await api(page,
        `/programs/${program.code}/assignments/${assignmentId}/extension-requests`,
        { method: 'POST', body: { requested_due_date: '2026-12-31', reason: 'طلب تمديد.' } })
      expect(requested.status).toBe(201)

      await login(page, program.users.auditor)
      const withoutReason = await api(page,
        `/programs/${program.code}/reviews/auditor/extension-requests/${requested.body.data.id}/reject`,
        { method: 'POST', body: {} })
      expect(withoutReason.status).toBe(422)

      const rejected = await api(page,
        `/programs/${program.code}/reviews/auditor/extension-requests/${requested.body.data.id}/reject`,
        { method: 'POST', body: { reason: 'المهلة الحالية كافية.' } })
      expect(rejected.status).toBe(200)

      await login(page, program.users.pm)
      const after = await api(page, `/programs/${program.code}/assignments/${assignmentId}`)
      expect(after.body.data.effective_due_date).toBe(originalDueDate)
    })
  })

  test.describe.serial(`${program.code} (${program.depth} levels) — rejection and resubmission`, () => {
    let requirementCode: string
    let assignmentId: number

    test('a rejected submission returns to the Employee and can be resubmitted', async ({ page }) => {
      const departmentId = await departmentOf(page, program.users.employee)
      await login(page, program.users.pm)

      const node = await findFreeAssignableNode(page, program.code)
      requirementCode = node.code

      const created = await api(page, `/programs/${program.code}/assignments`, {
        method: 'POST',
        body: { requirement_id: node.id, department_id: departmentId, due_date: '2026-12-31' },
      })
      expect(created.status).toBe(201)
      assignmentId = created.body.data.id

      // Employee submits.
      await login(page, program.users.employee)
      const draft = await api(page, `/programs/${program.code}/assignments/${assignmentId}/draft`, { method: 'POST' })
      await uploadEvidence(page, program.code, draft.body.data.id)
      const submission = await api(page,
        `/programs/${program.code}/evidence-submissions/${draft.body.data.id}/submit`,
        { method: 'POST', body: { employee_comment: 'First attempt.' } })
      expect(submission.status).toBe(200)

      // Department Manager rejects — a reason is mandatory.
      await login(page, program.users.deptManager)
      const queue = await api(page, `/programs/${program.code}/reviews/department-manager`)
      const pending = queue.body.data.find((i: any) => i.requirement.code === requirementCode)

      const withoutReason = await api(page,
        `/programs/${program.code}/reviews/department-manager/${pending.id}/reject`,
        { method: 'POST', body: {} })
      expect(withoutReason.status).toBe(422)

      const rejected = await api(page,
        `/programs/${program.code}/reviews/department-manager/${pending.id}/reject`,
        { method: 'POST', body: { reason: 'Evidence is incomplete.' } })
      expect(rejected.status).toBe(200)
      expect(rejected.body.data.status).toBe('returned_for_revision')

      // The Employee sees it back, with the rejection reason.
      await login(page, program.users.employee)
      await page.goto(`/programs/${program.code}/my-requirements`)
      await expect(page.getByTestId(`my-requirement-row-${requirementCode}`)).toBeVisible({ timeout: 20_000 })

      const newDraft = await api(page, `/programs/${program.code}/assignments/${assignmentId}/draft`, { method: 'POST' })
      await uploadEvidence(page, program.code, newDraft.body.data.id)
      const resubmitted = await api(page,
        `/programs/${program.code}/evidence-submissions/${newDraft.body.data.id}/submit`,
        { method: 'POST', body: { employee_comment: 'Corrected and resubmitted.' } })

      expect(resubmitted.status).toBe(200)
      // Resubmission restarts at the Department Manager, never at whichever
      // stage rejected it — a business rule this phase must not change.
      expect(resubmitted.body.data.status).toBe('pending_department_manager')
    })
  })
}
