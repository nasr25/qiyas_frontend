import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

test.describe('المشاهد التنفيذي', () => {
  test('اللوحة التنفيذية — عرض فقط', async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.executive)
    await page.goto('/executive-dashboard')
    await expect(page.getByRole('main').getByRole('heading', { name: 'اللوحة التنفيذية' })).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '59-executive-dashboard.png')

    // Confirm no edit/action control exists anywhere on the page — verified
    // directly, not assumed, per docs/user-guides/qiyas/analysis-matrix.md.
    const buttons = await page.getByRole('button').all()
    const editLikeButtons = []
    for (const b of buttons) {
      const text = (await b.textContent())?.trim() ?? ''
      if (/حفظ|تعديل|حذف|إضافة|اعتماد|رفض|إسناد/.test(text)) editLikeButtons.push(text)
    }
    expect(editLikeButtons).toEqual([])
  })

  test('برنامج قياس من منظور المشاهد التنفيذي', async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.executive)
    await page.goto('/programs')
    await expect(page.getByTestId('program-card-QIYAS')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '60-executive-program-selection.png')
  })
})
