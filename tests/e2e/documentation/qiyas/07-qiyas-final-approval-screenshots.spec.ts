import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

test.describe('مدير برنامج قياس — الاعتماد النهائي', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.programManager)
  })

  test('عرض قائمة الاعتماد النهائي', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/program-manager')
    await expect(page.getByTestId(/^review-queue-row-/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '43-final-approval-queue.png')
  })

  test('الاعتماد النهائي — موافقة', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/program-manager')
    const row = page.getByTestId(/^review-queue-row-/).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/program-manager\/\d+$/, { timeout: 10_000 })
    await expect(page.getByTestId('prior-decisions')).toBeVisible()
    await captureScreenshot(page, '44-final-approval-detail.png')

    await page.getByTestId('review-notes-input').fill('تم التحقق من مطابقة جميع مراحل المراجعة السابقة.')
    await Promise.all([
      page.waitForResponse(resp => /\/approve$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('approve-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '45-final-approval-success.png')
  })

  test('الاعتماد النهائي — رفض', async ({ page }) => {
    await page.goto('/programs/QIYAS/reviews/program-manager')
    const row = page.getByTestId(/^review-queue-row-/).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-review-link').click()
    await page.waitForURL(/\/reviews\/program-manager\/\d+$/, { timeout: 10_000 })

    await page.getByTestId('reject-button').click()
    await page.getByTestId('rejection-reason-input').fill('يلزم توضيح إضافي قبل الاعتماد النهائي.')
    await captureScreenshot(page, '46-final-rejection-form.png')

    await Promise.all([
      page.waitForResponse(resp => /\/reject$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('confirm-reject-button').click(),
    ])
    await expect(page.getByText('تم تسجيل القرار')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '47-final-rejection-success.png')
  })

  // A fully approved requirement disappears from the employee's "متطلباتي"
  // list entirely — MyRequirementsController scopes to
  // RequirementAssignment::active() (status='active'), and a final
  // approval sets status='completed'. Confirmed via the live API response
  // (18 seeded items, only 16 — everything except the two approved ones —
  // returned). There is no page where an employee can browse their own
  // completed/approved history; the only visible confirmation of approval
  // is the "45-final-approval-success.png" status transition captured
  // above. Documented as a real, verified limitation in the guide rather
  // than worked around with a screenshot of unreachable behavior.
})
