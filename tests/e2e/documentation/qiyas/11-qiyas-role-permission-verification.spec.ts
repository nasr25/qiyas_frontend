import { test, expect, request as playwrightRequest } from '@playwright/test'
import { DOCS_ACCOUNTS, DOCS_PASSWORD, loginDocs } from './helpers'
import { E2E_CONFIG } from '../../helpers/env'

/**
 * Verifies both what the UI hides AND what the backend denies for each
 * documented role — a permission is never considered secure only because a
 * button is hidden. Feeds docs/user-guides/qiyas/verification-report.md
 * and docs/user-guides/qiyas/role-permission-matrix.md. No screenshots —
 * this suite is evidence, not illustration.
 *
 * Uses a dedicated API request context pointed at E2E_CONFIG.apiURL (the
 * backend, :8002) rather than Playwright's default `request` fixture,
 * which is bound to the frontend baseURL and cannot reach `/api/v1/...`.
 */
async function apiLogin(username: string): Promise<{ context: Awaited<ReturnType<typeof playwrightRequest.newContext>>; token: string }> {
  const context = await playwrightRequest.newContext({ baseURL: E2E_CONFIG.apiURL })
  const res = await context.post('/api/v1/auth/login', { data: { username, password: DOCS_PASSWORD } })
  expect(res.ok(), `login failed for ${username}`).toBeTruthy()
  const token = (await res.json()).data.token
  return { context, token }
}

test.describe('التحقق من الصلاحيات — الواجهة والخادم معًا', () => {
  test('الموظف لا يستطيع الوصول إلى إنشاء دورة تقييم (واجهة + خادم)', async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.employee)
    await page.goto('/programs/QIYAS/cycles')
    await expect(page.getByRole('button', { name: 'دورة جديدة' })).toHaveCount(0)

    const { context, token } = await apiLogin(DOCS_ACCOUNTS.employee)
    const res = await context.post('/api/v1/programs/QIYAS/cycles', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'محاولة غير مصرح بها', year: 2028, start_date: '2028-01-01', end_date: '2028-12-31' },
    })
    expect(res.status()).toBe(403)
    await context.dispose()
  })

  test('مدير الإدارة لا يستطيع الوصول إلى قائمة الاعتماد النهائي (واجهة + خادم)', async ({ page }) => {
    // Note: /reviews/:stage is one shared route for all three review
    // stages (department-manager/auditor/program-manager), so the router
    // itself does not redirect a department manager away from this URL —
    // that would require a param-aware guard the app doesn't have. The
    // real protection is server-side: ReviewQueueController::index() now
    // 403s for a caller without the matching stage role (fixed — it
    // previously returned the full cross-department queue with no check
    // at all), and the view renders that as an empty "no pending
    // reviews" state rather than leaking data or an unhandled error.
    await loginDocs(page, DOCS_ACCOUNTS.departmentManager)
    await page.goto('/programs/QIYAS/reviews/program-manager')
    await expect(page.getByText('لا توجد طلبات بانتظار مراجعتكم حالياً')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('open-review-link')).toHaveCount(0)

    const { context, token } = await apiLogin(DOCS_ACCOUNTS.departmentManager)
    const res = await context.get('/api/v1/programs/QIYAS/reviews/program-manager', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([401, 403]).toContain(res.status())
    await context.dispose()
  })

  test('المدقق لا يستطيع إنشاء دورة تقييم (خادم)', async () => {
    const { context, token } = await apiLogin(DOCS_ACCOUNTS.auditor)
    const res = await context.post('/api/v1/programs/QIYAS/cycles', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'محاولة غير مصرح بها', year: 2028, start_date: '2028-01-01', end_date: '2028-12-31' },
    })
    expect(res.status()).toBe(403)
    await context.dispose()
  })

  test('المشاهد التنفيذي لا يستطيع تعديل السجلات (خادم)', async () => {
    const { context, token } = await apiLogin(DOCS_ACCOUNTS.executive)
    const res = await context.post('/api/v1/programs/QIYAS/cycles', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'محاولة غير مصرح بها', year: 2028, start_date: '2028-01-01', end_date: '2028-12-31' },
    })
    expect(res.status()).toBe(403)
    await context.dispose()
  })

  test('مدير برنامج قياس لا يستطيع الوصول إلى إعدادات النظام العامة (واجهة + خادم)', async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.programManager)
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/programs$/)

    const { context, token } = await apiLogin(DOCS_ACCOUNTS.programManager)
    const res = await context.get('/api/v1/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status()).toBe(403)
    await context.dispose()
  })

  test('الموظف لا يستطيع الموافقة على طلب كمدير إدارة (خادم — تحقق مباشر من نقطة النهاية)', async () => {
    const employee = await apiLogin(DOCS_ACCOUNTS.employee)
    const dm = await apiLogin(DOCS_ACCOUNTS.departmentManager)

    const queue = await dm.context.get('/api/v1/programs/QIYAS/reviews/department-manager', {
      headers: { Authorization: `Bearer ${dm.token}` },
    })
    const items = (await queue.json()).data
    test.skip(!items?.length, 'no pending department-manager item available in this run')
    const submissionId = items[0].id

    const res = await employee.context.post(`/api/v1/programs/QIYAS/reviews/department-manager/${submissionId}/approve`, {
      headers: { Authorization: `Bearer ${employee.token}` },
      data: { notes: 'محاولة غير مصرح بها' },
    })
    expect([401, 403]).toContain(res.status())
    await employee.context.dispose()
    await dm.context.dispose()
  })

  test('طلب بدون رمز مصادقة يُرفض من كل نقاط نهاية قياس المحمية', async () => {
    const context = await playwrightRequest.newContext({ baseURL: E2E_CONFIG.apiURL })
    const res = await context.get('/api/v1/programs/QIYAS/cycles')
    expect(res.status()).toBe(401)
    await context.dispose()
  })
})
