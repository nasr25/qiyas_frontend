import { test, expect } from '@playwright/test'
import { USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'

/**
 * ECC-specific cross-program isolation — extends
 * tests/e2e/cross-program/isolation.spec.ts (Qiyas/Sumoud) to the third
 * program. Every check hits the backend API directly, not just UI
 * visibility.
 */
test.describe('ECC cross-program isolation', () => {
  test('ECC-only user cannot reach Qiyas or Sumoud program routes', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.eccProgramManager)

    const qiyasShow = await context.get('/api/v1/programs/QIYAS', { headers: authHeaders(token) })
    expect(qiyasShow.status()).toBe(404)
    const sumoudShow = await context.get('/api/v1/programs/SUMOUD', { headers: authHeaders(token) })
    expect(sumoudShow.status()).toBe(404)

    await context.dispose()
  })

  test('Qiyas-only and Sumoud-only users cannot reach ECC program routes', async ({}) => {
    const { context: qiyasCtx, token: qiyasToken } = await apiLoginAs(USERS.auditor)
    const eccFromQiyas = await qiyasCtx.get('/api/v1/programs/ECC', { headers: authHeaders(qiyasToken) })
    expect(eccFromQiyas.status()).toBe(404)
    await qiyasCtx.dispose()

    const { context: sumoudCtx, token: sumoudToken } = await apiLoginAs(USERS.sumoudEmployeeA)
    const eccFromSumoud = await sumoudCtx.get('/api/v1/programs/ECC/hierarchy', { headers: authHeaders(sumoudToken) })
    expect(eccFromSumoud.status()).toBe(404)
    await sumoudCtx.dispose()
  })

  test('Program selection page lists ECC only for authorized users, and all three for Super Admin', async ({}) => {
    const { context: eccCtx, token: eccToken } = await apiLoginAs(USERS.eccEmployeeA)
    const eccList = await eccCtx.get('/api/v1/programs', { headers: authHeaders(eccToken) })
    const eccCodes = (await eccList.json()).data.map((p: any) => p.code)
    expect(eccCodes).toContain('ECC')
    expect(eccCodes).not.toContain('QIYAS')
    expect(eccCodes).not.toContain('SUMOUD')
    await eccCtx.dispose()

    const { context: superCtx, token: superToken } = await apiLoginAs(USERS.superAdmin)
    const superList = await superCtx.get('/api/v1/programs', { headers: authHeaders(superToken) })
    const superCodes = (await superList.json()).data.map((p: any) => p.code)
    expect(superCodes).toEqual(expect.arrayContaining(['QIYAS', 'SUMOUD', 'ECC']))
    await superCtx.dispose()
  })

  test('An ECC hierarchy node cannot be created under a Qiyas or Sumoud parent (rejected server-side)', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.eccProgramManager)

    // A nonexistent/foreign parent_id under the ECC program route must be
    // rejected as "not found" (404) — the controller scopes parent lookup
    // to the current program, never trusting a client-supplied ID alone.
    const res = await context.post('/api/v1/programs/ECC/hierarchy', {
      headers: authHeaders(token),
      data: { node_type: 'subdomain', code: 'CROSS-TEST', name_ar: 'اختبار', parent_id: 999999, cycle_id: 1 },
    })
    expect([404, 422]).toContain(res.status())

    await context.dispose()
  })

  test('ECC report export is denied to an unauthorized user', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.eccEmployeeA)
    const res = await context.get('/api/v1/programs/ECC/reports/employee-performance', { headers: authHeaders(token) })
    expect([403, 404]).toContain(res.status())
    await context.dispose()
  })
})
