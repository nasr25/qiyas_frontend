import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs, openQiyas } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

test.describe('مدير برنامج قياس — دورات التقييم', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.programManager)
  })

  test('فتح قائمة دورات التقييم', async ({ page }) => {
    await page.goto('/programs/QIYAS/cycles')
    await expect(page.getByTestId(/^cycle-row-/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '04-open-assessment-cycles.png')
  })

  test('إنشاء دورة تقييم جديدة', async ({ page }) => {
    await page.goto('/programs/QIYAS/cycles')
    await expect(page.getByTestId(/^cycle-row-/).first()).toBeVisible({ timeout: 10_000 })

    const addButton = page.getByRole('button', { name: 'دورة جديدة' })
    await captureScreenshot(page, '05-click-add-cycle.png')
    await addButton.click()

    await expect(page.getByText('دورة جديدة').last()).toBeVisible()
    await captureScreenshot(page, '06-cycle-form-empty.png')

    await page.getByTestId('cycle-name-input').fill('دورة قياس التجريبية للتوثيق — عرض توضيحي')
    await page.getByTestId('cycle-year-input').fill('2027')
    await page.getByTestId('cycle-start-date-input').fill('2027-01-01')
    await page.getByTestId('cycle-end-date-input').fill('2027-12-31')
    await captureScreenshot(page, '07-cycle-form-completed.png')

    await Promise.all([
      page.waitForResponse(resp => /\/programs\/QIYAS\/cycles$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('cycle-save-button').click(),
    ])
    await expect(page.getByTestId('cycle-name-input')).toHaveCount(0) // the modal closed
    await captureScreenshot(page, '08-cycle-created-success.png')
  })

  test('تفعيل دورة وإغلاقها', async ({ page }) => {
    await page.goto('/programs/QIYAS/cycles')
    const draftRow = page.getByTestId('cycle-row-draft').first()
    if (await draftRow.count()) {
      await draftRow.getByRole('button', { name: 'تفعيل الدورة' }).click()
      await expect(page.getByText('تمت العملية بنجاح')).toBeVisible({ timeout: 10_000 })
      await captureScreenshot(page, '09-cycle-activation-confirmation.png')
    }
    await expect(page.getByTestId(/^cycle-row-active$/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '10-cycle-active-status.png')
  })

  test('فتح تفاصيل الدورة وإضافة معيار جديد', async ({ page }) => {
    await page.goto('/programs/QIYAS/cycles')
    const activeRow = page.getByTestId('cycle-row-active').filter({ hasText: 'دورة قياس التجريبية 2026' })
    await activeRow.getByTestId('open-cycle-link').click()
    await page.waitForURL(/\/cycles\/\d+$/, { timeout: 10_000 })
    await expect(page.getByTestId(/^standard-row-/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '11-cycle-detail-standards-list.png')

    await page.getByTestId('create-standard-button').click()
    await expect(page.getByTestId('standard-code-input')).toBeVisible()
    await captureScreenshot(page, '12-add-standard-form-empty.png')

    await page.getByTestId('standard-code-input').fill('QIYAS-DOC-DEMO-001')
    await page.getByTestId('standard-perspective-input').fill('المنظور التجريبي')
    await page.getByTestId('standard-axis-input').fill('المحور التجريبي')
    await page.getByTestId('standard-name-ar-input').fill('معيار توضيحي لأغراض الدليل')
    await captureScreenshot(page, '13-add-standard-form-completed.png')

    await Promise.all([
      page.waitForResponse(resp => /\/cycles\/\d+\/standards$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('save-standard-button').click(),
    ])
    await expect(page.getByTestId('create-standard-button')).toBeVisible({ timeout: 10_000 }) // the modal closed and the page returned to the standards list
    await captureScreenshot(page, '14-standard-created-success.png')
  })
})
