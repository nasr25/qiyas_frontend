import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

test.describe('مدير برنامج قياس — إسناد المعايير', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.programManager)
  })

  test('عرض قائمة الإسناد وإسناد معيار جديد', async ({ page }) => {
    await page.goto('/programs/QIYAS/assignments')
    await expect(page.getByTestId('new-assignment-button')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '15-assignments-list.png')

    await page.getByTestId('new-assignment-button').click()
    await expect(page.getByTestId('assign-requirement-select')).toBeVisible()
    await captureScreenshot(page, '16-assign-form-empty.png')

    // Pick the first available option rather than a specific record: the
    // guide illustrates the SCREEN, and binding to one seeded code coupled
    // this spec to a fixture that no longer exists.
    await page.getByTestId('assign-requirement-select').selectOption({ index: 1 })
    await page.getByTestId('department-select').selectOption({ index: 1 })
    const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    await page.getByTestId('assign-due-date-input').fill(dueDate)
    await page.getByTestId('assign-instructions-ar-input').fill('تعليمات تجريبية لأغراض الدليل.')
    await captureScreenshot(page, '17-assign-form-completed.png')

    await Promise.all([
      page.waitForResponse(resp => /\/assignments$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('assign-standard-button').click(),
    ])
    await expect(page.getByTestId(/^assignment-row-/).first()).toBeVisible({ timeout: 15_000 })
    await captureScreenshot(page, '18-assign-success.png')
  })

  test('إعادة إسناد معيار', async ({ page }) => {
    await page.goto('/programs/QIYAS/assignments')
    const row = page.getByTestId(/^assignment-row-/).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByRole('button', { name: 'إعادة الإسناد' }).click()
    await expect(page.getByText('سبب إعادة الإسناد (إلزامي)')).toBeVisible()
    await captureScreenshot(page, '19-reassign-form.png')
  })
})
