import { test, expect } from '@playwright/test'
import { USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'

/**
 * NDMO-specific cross-program isolation — extends the Qiyas/Sumoud/ECC
 * isolation specs to the fourth program. Every check hits the backend API
 * directly, not just UI visibility.
 */
test.describe('NDMO cross-program isolation', () => {
  test('NDMO-only user cannot reach Qiyas, Sumoud, or ECC program routes', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.ndmoProgramManager)

    for (const code of ['QIYAS', 'SUMOUD', 'ECC']) {
      const res = await context.get(`/api/v1/programs/${code}`, { headers: authHeaders(token) })
      expect(res.status()).toBe(404)
    }

    await context.dispose()
  })

  test('Qiyas-only, Sumoud-only, and ECC-only users cannot reach NDMO program routes', async ({}) => {
    const { context: qiyasCtx, token: qiyasToken } = await apiLoginAs(USERS.auditor)
    expect((await qiyasCtx.get('/api/v1/programs/NDMO', { headers: authHeaders(qiyasToken) })).status()).toBe(404)
    await qiyasCtx.dispose()

    const { context: sumoudCtx, token: sumoudToken } = await apiLoginAs(USERS.sumoudEmployeeA)
    expect((await sumoudCtx.get('/api/v1/programs/NDMO/hierarchy', { headers: authHeaders(sumoudToken) })).status()).toBe(404)
    await sumoudCtx.dispose()

    const { context: eccCtx, token: eccToken } = await apiLoginAs(USERS.eccEmployeeA)
    expect((await eccCtx.get('/api/v1/programs/NDMO/assignments', { headers: authHeaders(eccToken) })).status()).toBe(404)
    await eccCtx.dispose()
  })

  test('Program selection page lists NDMO only for authorized users, and all four for Super Admin', async ({}) => {
    const { context: ndmoCtx, token: ndmoToken } = await apiLoginAs(USERS.ndmoEmployeeA)
    const ndmoList = await ndmoCtx.get('/api/v1/programs', { headers: authHeaders(ndmoToken) })
    const ndmoCodes = (await ndmoList.json()).data.map((p: any) => p.code)
    expect(ndmoCodes).toContain('NDMO')
    expect(ndmoCodes).not.toEqual(expect.arrayContaining(['QIYAS', 'SUMOUD', 'ECC']))
    await ndmoCtx.dispose()

    const { context: superCtx, token: superToken } = await apiLoginAs(USERS.superAdmin)
    const superList = await superCtx.get('/api/v1/programs', { headers: authHeaders(superToken) })
    const superCodes = (await superList.json()).data.map((p: any) => p.code)
    expect(superCodes).toEqual(expect.arrayContaining(['QIYAS', 'SUMOUD', 'ECC', 'NDMO']))
    await superCtx.dispose()
  })

  test('An NDMO hierarchy node cannot be created under a foreign parent (rejected server-side)', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.ndmoProgramManager)

    const res = await context.post('/api/v1/programs/NDMO/hierarchy', {
      headers: authHeaders(token),
      data: { node_type: 'policy', code: 'CROSS-TEST', name_ar: 'اختبار', parent_id: 999999, cycle_id: 1 },
    })
    expect([404, 422]).toContain(res.status())

    await context.dispose()
  })

  test('NDMO report export is denied to an unauthorized user', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.ndmoEmployeeA)
    const res = await context.get('/api/v1/programs/NDMO/reports/employee-performance', { headers: authHeaders(token) })
    expect([403, 404]).toContain(res.status())
    await context.dispose()
  })

  test('An unauthorized user cannot assign a responsibility on an NDMO assignment', async ({}) => {
    const { context, token } = await apiLoginAs(USERS.ndmoEmployeeA)
    const res = await context.post('/api/v1/programs/NDMO/assignments/1/responsibilities', {
      headers: authHeaders(token),
      data: { responsibility_type: 'data_owner', user_id: 1 },
    })
    expect(res.status()).toBe(403)
    await context.dispose()
  })
})
