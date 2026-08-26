import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

test.describe('مدير الإدارة — مراجعة الطلبات', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.departmentManager)
  })

  test('عرض قائمة المراجعة', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/department-manager')
    await expect(page.getByTestId(/^review-queue-row-/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '29-department-review-queue.png')
  })

  test('الموافقة على طلب', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/department-manager')
    const row = page.getByTestId(/^review-queue-row-/).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/department-manager\/\d+$/, { timeout: 10_000 })
    await expect(page.getByTestId('approve-button')).toBeVisible()
    await captureScreenshot(page, '30-department-review-detail.png')

    await page.getByTestId('review-notes-input').fill('تمت المراجعة والتأكد من اكتمال الأدلة.')
    await Promise.all([
      page.waitForResponse(resp => /\/approve$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('approve-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '31-department-review-approved.png')
  })

  test('رفض طلب', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/department-manager')
    const row = page.getByTestId(/^review-queue-row-/).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/department-manager\/\d+$/, { timeout: 10_000 })

    await page.getByTestId('reject-button').click()
    await expect(page.getByTestId('rejection-reason-input')).toBeVisible()
    await page.getByTestId('rejection-reason-input').fill('يرجى إرفاق نسخة موقعة من المستند.')
    await captureScreenshot(page, '32-department-review-reject-form.png')

    await Promise.all([
      page.waitForResponse(resp => /\/reject$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('confirm-reject-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '33-department-review-rejected.png')
  })
})
