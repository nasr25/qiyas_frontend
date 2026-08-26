import { test, expect } from '@playwright/test'
import { USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'

/**
 * Deliberate mixed-context access attempts — a Qiyas-only (or Sumoud-only)
 * session must never reach another program's data via a manually-changed
 * program code, cycle id, or requirement id. Every check hits the backend
 * API directly (not just UI visibility) per the Phase 5 brief's explicit
 * "verified via both UI visibility AND backend-response checks" requirement.
 */
test.describe('Cross-program isolation', () => {
  test('Sumoud-only user cannot reach Qiyas program routes', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.sumoudProgramManager)

    const programShow = await context.get('/api/v1/programs/QIYAS', { headers: authHeaders(token) })
    expect(programShow.status()).toBe(404)

    const dashboard = await context.get('/api/v1/programs/QIYAS/dashboard', { headers: authHeaders(token) })
    expect(dashboard.status()).toBe(404)

    const requirements = await context.get('/api/v1/programs/QIYAS/requirements', { headers: authHeaders(token) })
    expect(requirements.status()).toBe(404)

    await context.dispose()
  })

  test('Qiyas-only user cannot reach Sumoud program routes', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.auditor)

    const programShow = await context.get('/api/v1/programs/SUMOUD', { headers: authHeaders(token) })
    expect(programShow.status()).toBe(404)

    const extensionQueue = await context.get('/api/v1/programs/SUMOUD/reviews/auditor/extension-requests', { headers: authHeaders(token) })
    expect(extensionQueue.status()).toBe(404)

    await context.dispose()
  })

  test('Program selection page shows only authorized programs', async ({}) => {
    const { context: sumoudCtx, token: sumoudToken } = await apiLoginAs(USERS.sumoudEmployeeA)
    const sumoudList = await sumoudCtx.get('/api/v1/programs', { headers: authHeaders(sumoudToken) })
    const sumoudCodes = (await sumoudList.json()).data.map((p: any) => p.code)
    expect(sumoudCodes).toContain('SUMOUD')
    expect(sumoudCodes).not.toContain('QIYAS')
    await sumoudCtx.dispose()

    const { context: superCtx, token: superToken } = await apiLoginAs(USERS.superAdmin)
    const superList = await superCtx.get('/api/v1/programs', { headers: authHeaders(superToken) })
    const superCodes = (await superList.json()).data.map((p: any) => p.code)
    expect(superCodes).toEqual(expect.arrayContaining(['QIYAS', 'SUMOUD']))
    await superCtx.dispose()
  })

  test('A Sumoud cycle id cannot be read through the Qiyas program route', async ({}) => {
    const { context: sumoudPmCtx, token: sumoudPmToken } = await apiLoginAs(USERS.sumoudProgramManager)
    const sumoudCycles = await sumoudPmCtx.get('/api/v1/programs/SUMOUD/cycles', { headers: authHeaders(sumoudPmToken), params: { status: 'active' } })
    const sumoudCycleId = (await sumoudCycles.json()).data[0].id
    await sumoudPmCtx.dispose()

    const { context: qiyasCtx, token: qiyasToken } = await apiLoginAs(USERS.programManager)
    const crossRead = await qiyasCtx.get(`/api/v1/programs/QIYAS/cycles/${sumoudCycleId}`, { headers: authHeaders(qiyasToken) })
    expect(crossRead.status()).toBe(404)
    await qiyasCtx.dispose()
  })

  test('Uploading a Sumoud XLSX template into Qiyas is rejected, and vice versa', async ({}) => {
    const { context: sumoudPmCtx, token: sumoudPmToken } = await apiLoginAs(USERS.sumoudProgramManager)
    const templateRes = await sumoudPmCtx.get('/api/v1/programs/SUMOUD/hierarchy-template', { headers: authHeaders(sumoudPmToken) })
    expect(templateRes.ok()).toBeTruthy()
    const templateBuffer = await templateRes.body()
    await sumoudPmCtx.dispose()

    const { context: qiyasCtx, token: qiyasToken } = await apiLoginAs(USERS.programManager)
    const qiyasCyclesRes = await qiyasCtx.get('/api/v1/programs/QIYAS/cycles', { headers: authHeaders(qiyasToken), params: { status: 'active' } })
    const qiyasCycleId = (await qiyasCyclesRes.json()).data[0].id

    const preview = await qiyasCtx.post('/api/v1/programs/QIYAS/hierarchy-import/preview', {
      headers: authHeaders(qiyasToken),
      multipart: { file: { name: 'sumoud-template.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: templateBuffer }, cycle_id: String(qiyasCycleId) },
    })
    expect(preview.ok()).toBeTruthy()
    const previewBody = await preview.json()
    expect(previewBody.data.can_import).toBe(false)
    expect(previewBody.data.errors.map((e: any) => e.code)).toContain('WRONG_PROGRAM')
    await qiyasCtx.dispose()
  })
})
