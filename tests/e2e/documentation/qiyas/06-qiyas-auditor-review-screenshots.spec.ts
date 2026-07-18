import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

test.describe('المدقق — مراجعة الطلبات وطلبات التمديد', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.auditor)
  })

  test('عرض قائمة مراجعة المدقق', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/auditor')
    await expect(page.getByTestId(/^review-queue-row-/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '34-auditor-review-queue.png')
  })

  test('الموافقة على طلب', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/auditor')
    const row = page.getByTestId('review-queue-row-QIYAS-TEST-008')
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/auditor\/\d+$/, { timeout: 10_000 })
    await expect(page.getByTestId('prior-decisions')).toBeVisible()
    await captureScreenshot(page, '35-auditor-review-detail.png')

    await Promise.all([
      page.waitForResponse(resp => /\/approve$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('approve-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '36-auditor-review-approved.png')
  })

  test('رفض طلب', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/auditor')
    const row = page.getByTestId('review-queue-row-QIYAS-TEST-009')
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/auditor\/\d+$/, { timeout: 10_000 })

    await page.getByTestId('reject-button').click()
    await page.getByTestId('rejection-reason-input').fill('الدليل المرفق لا يغطي جميع بنود المتطلب.')
    await Promise.all([
      page.waitForResponse(resp => /\/reject$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('confirm-reject-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '37-auditor-review-rejected.png')
  })

  test('عرض طلبات التمديد والبتّ فيها', async ({ page }) => {
    await page.goto('/programs/QIYAS/extension-requests')
    await expect(page.getByTestId(/^extension-row-/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '38-extension-queue.png')

    // QIYAS-TEST-017 has a pre-seeded pending extension — approve it.
    const approveRow = page.getByTestId('extension-row-QIYAS-TEST-017')
    await approveRow.getByTestId('approve-extension-button').click()
    await expect(page.getByTestId('confirm-extension-decision-button')).toBeVisible()
    await page.getByTestId('extension-decision-notes-input').fill('مبرر مقبول.')
    await captureScreenshot(page, '39-extension-approve-form.png')
    await Promise.all([
      page.waitForResponse(resp => /\/extension-requests\/\d+\/approve$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('confirm-extension-decision-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '40-extension-approved-success.png')
  })

  test('رفض طلب تمديد', async ({ page }) => {
    // QIYAS-TEST-016 got its extension requested live by the employee spec.
    await page.goto('/programs/QIYAS/extension-requests')
    const rejectRow = page.getByTestId('extension-row-QIYAS-TEST-016')
    await expect(rejectRow).toBeVisible({ timeout: 10_000 })
    await rejectRow.getByTestId('reject-extension-button').click()
    await expect(page.getByTestId('extension-decision-reason-input')).toBeVisible()
    await page.getByTestId('extension-decision-reason-input').fill('المهلة الحالية كافية لإنجاز المتطلب.')
    await captureScreenshot(page, '41-extension-reject-form.png')
    await Promise.all([
      page.waitForResponse(resp => /\/extension-requests\/\d+\/reject$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('confirm-extension-decision-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '42-extension-rejected-success.png')
  })
})
