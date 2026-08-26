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

  /**
   * Rewritten for the dynamic hierarchy engine. The guide still documents
   * "open a cycle and add content", but content is now a ComplianceNode
   * authored through the generic screen, and the form's fields and the
   * button's label come from the program's own structure rather than from
   * hard-coded Perspective/Axis inputs.
   */
  test('فتح تفاصيل الدورة وإضافة عنصر جديد إلى الهيكل', async ({ page }) => {
    await page.goto('/programs/QIYAS/cycles')
    const activeRow = page.getByTestId('cycle-row-active').first()
    await activeRow.getByTestId('open-cycle-link').click()
    await page.waitForURL(/\/cycles\/\d+$/, { timeout: 15_000 })

    await expect(page.getByTestId('hierarchy-browser')).toBeVisible({ timeout: 15_000 })
    await captureScreenshot(page, '11-cycle-detail-hierarchy.png')

    await page.getByTestId('add-node-button').click()
    await expect(page.getByTestId('node-name-ar-input')).toBeVisible()
    await captureScreenshot(page, '12-add-node-form-empty.png')

    const code = `QIYAS-DOC-${Date.now()}`
    await page.getByTestId('node-code-input').fill(code)
    await page.getByTestId('node-name-ar-input').fill('عنصر توضيحي لأغراض الدليل')
    await page.getByTestId('node-name-en-input').fill('Illustrative guide item')
    await captureScreenshot(page, '13-add-node-form-completed.png')

    await Promise.all([
      page.waitForResponse(resp => /\/hierarchy$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('save-node-button').click(),
    ])
    await expect(page.getByTestId(`node-row-${code}`)).toBeVisible({ timeout: 15_000 })
    await captureScreenshot(page, '14-node-created-success.png')
  })
})
