import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

// Generated in-memory, never a checked-in binary fixture — matches the
// convention in tests/e2e/data/files.ts and the guide (docs/user-guides/
// qiyas/*) "دليل إثبات تجريبي" naming.
const EVIDENCE_FILE = {
  name: 'دليل-إثبات-تجريبي.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%مستند تجريبي لأغراض التوثيق فقط\n', 'utf8'),
}

test.describe('الموظف — متطلباتي', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.employee)
  })

  test('عرض قائمة متطلباتي', async ({ page }) => {
    await page.goto('/programs/QIYAS/my-requirements')
    await expect(page.getByTestId(/^my-requirement-row-/).first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '20-my-requirements-list.png')
  })

  test('رفع دليل إثبات وحفظه كمسودة ثم الإرسال', async ({ page }) => {
    await page.goto('/programs/QIYAS/my-requirements')
    const row = page.getByTestId('my-requirement-row-QIYAS-TEST-002')
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/my-requirements\/\d+$/, { timeout: 10_000 })
    await expect(page.getByTestId('evidence-upload')).toBeVisible()
    await captureScreenshot(page, '21-requirement-detail-before-upload.png')

    await Promise.all([
      page.waitForResponse(resp => /\/files$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('evidence-upload').setInputFiles(EVIDENCE_FILE),
    ])
    await expect(page.getByText('تم رفع الملف')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('employee-comment-input').fill('الأدلة جاهزة للمراجعة.')
    await captureScreenshot(page, '22-requirement-draft-with-evidence.png')

    await Promise.all([
      page.waitForResponse(resp => /\/submit$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('submit-evidence-button').click(),
    ])
    await expect(page.getByText('تم الإرسال للمراجعة')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '23-requirement-submitted-success.png')
  })

  test('تصحيح مستند مرفوض وإعادة إرساله', async ({ page }) => {
    await page.goto('/programs/QIYAS/my-requirements')
    const row = page.getByTestId('my-requirement-row-QIYAS-TEST-003')
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/my-requirements\/\d+$/, { timeout: 10_000 })
    await expect(page.getByTestId('rejection-reason-banner')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '24-rejected-requirement-reason.png')

    await Promise.all([
      page.waitForResponse(resp => /\/files$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('evidence-upload').setInputFiles(EVIDENCE_FILE),
    ])
    await expect(page.getByText('تم رفع الملف')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('employee-comment-input').fill('تم إرفاق الصفحة الموقعة المطلوبة.')
    await captureScreenshot(page, '25-corrected-evidence-ready.png')

    await Promise.all([
      page.waitForResponse(resp => /\/submit$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('submit-evidence-button').click(),
    ])
    await expect(page.getByText('تم الإرسال للمراجعة')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '26-resubmission-success.png')
  })

  test('طلب تمديد', async ({ page }) => {
    await page.goto('/programs/QIYAS/my-requirements')
    const row = page.getByTestId('my-requirement-row-QIYAS-TEST-016')
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByTestId('open-my-requirement-link').click()
    await page.waitForURL(/\/my-requirements\/\d+$/, { timeout: 10_000 })

    await page.getByTestId('extension-request-button').click()
    await expect(page.getByTestId('extension-date-input')).toBeVisible()
    const requestedDate = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)
    await page.getByTestId('extension-date-input').fill(requestedDate)
    await page.getByTestId('extension-reason-input').fill('الوقت الحالي غير كافٍ لتجميع الأدلة المطلوبة.')
    await captureScreenshot(page, '27-extension-request-form.png')

    await Promise.all([
      page.waitForResponse(resp => /\/extension-requests$/.test(resp.url()) && resp.request().method() === 'POST'),
      page.getByTestId('extension-submit-button').click(),
    ])
    await expect(page.getByText('تم إرسال طلب التمديد')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '28-extension-request-success.png')
  })
})
