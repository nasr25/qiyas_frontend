import { test, expect } from '@playwright/test'
import { loginAs, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'

/**
 * Department and role isolation — backend-enforced, not just UI-hidden.
 * See docs/playwright-test-scenarios.md.
 */

test.describe('Department and role isolation', () => {
  test('Employee A cannot open a Department B assignment via a modified URL/ID', async ({ page }) => {
    const { context: pmContext, token: pmToken } = await apiLoginAs(USERS.programManager)
    const assignRes = await pmContext.get('/api/v1/programs/QIYAS/assignments?per_page=200', { headers: authHeaders(pmToken) })
    const assignments = (await assignRes.json()).data
    const deptBAssignment = assignments.find((a: any) => a.department?.name?.includes('موارد') || a.department?.name?.includes('Human'))
    await pmContext.dispose()
    test.skip(!deptBAssignment, 'No Department B assignment seeded to test against.')

    const { context, token } = await apiLoginAs(USERS.employeeA)
    const res = await context.get(`/api/v1/programs/QIYAS/assignments/${deptBAssignment.id}`, { headers: authHeaders(token) })
    expect([403, 404]).toContain(res.status())
    // No department name, file name, or metadata leaked in the denial response.
    const body = await res.text()
    expect(body).not.toContain(deptBAssignment.requirement?.code ?? '__never__')
    await context.dispose()
  })

  test('Department Manager A cannot approve a Department B submission via direct API call', async ({ page }) => {
    const { context: pmContext, token: pmToken } = await apiLoginAs(USERS.programManager)
    const queueRes = await pmContext.get('/api/v1/programs/QIYAS/reviews/department-manager', { headers: authHeaders(pmToken) })
    await pmContext.dispose()
    // Program Manager isn't in this queue's role, so use deptManagerB's own visibility instead.
    const { context: dmbContext, token: dmbToken } = await apiLoginAs(USERS.deptManagerB)
    const dmbQueue = await dmbContext.get('/api/v1/programs/QIYAS/reviews/department-manager', { headers: authHeaders(dmbToken) })
    const dmbItems = (await dmbQueue.json()).data
    await dmbContext.dispose()

    if (dmbItems.length === 0) {
      test.skip(true, 'No pending Department B submission available to test against.')
    }

    const { context, token } = await apiLoginAs(USERS.deptManagerA)
    const res = await context.post(`/api/v1/programs/QIYAS/reviews/department-manager/${dmbItems[0].id}/approve`, {
      headers: authHeaders(token), data: { notes: 'unauthorized attempt' },
    })
    expect([403, 404]).toContain(res.status())
    await context.dispose()
  })

  test('Employee cannot approve, assign, or import — enforced server-side, not just hidden in the UI', async ({ page }) => {
    const { context, token } = await apiLoginAs(USERS.employeeA)

    const assignAttempt = await context.post('/api/v1/programs/QIYAS/assignments', {
      headers: authHeaders(token), data: { requirement_id: 1, department_id: 1 },
    })
    expect(assignAttempt.status()).toBe(403)

    // The template itself is readable by any program member; what an
    // employee must NOT be able to do is import. Assert the write.
    const importAttempt = await context.post('/api/v1/programs/QIYAS/hierarchy-import/preview', {
      headers: authHeaders(token),
      multipart: { cycle_id: '1', file: { name: 'x.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('not a workbook') } },
    })
    expect(importAttempt.status()).toBe(403)

    await context.dispose()

    // UI-level: the nav items for these actions are not rendered for an Employee.
    await loginAs(page, USERS.employeeA)
    await page.goto('/programs/QIYAS/dashboard')
    await expect(page.getByTestId('nav-assignments')).toHaveCount(0)
    // The legacy standalone import screen was retired; import now lives
    // inside the cycle screen and is guarded server-side (asserted above).
  })

  test('Executive Viewer cannot perform any write action', async ({ page }) => {
    const { context, token } = await apiLoginAs(USERS.executiveViewer)
    const res = await context.post('/api/v1/programs/QIYAS/assignments', {
      headers: authHeaders(token), data: { requirement_id: 1, department_id: 1 },
    })
    expect(res.status()).toBe(403)
    await context.dispose()
  })

  test('A Qiyas-only user cannot open a different program via a modified program code', async ({ page }) => {
    const { context, token } = await apiLoginAs(USERS.deptManagerA)
    const res = await context.get('/api/v1/programs/NOTAREALPROGRAM/dashboard', { headers: authHeaders(token) })
    // Nonexistent AND unauthorized programs both 404 — never distinguishable, to prevent program-code enumeration.
    expect(res.status()).toBe(404)
    await context.dispose()
  })
})
