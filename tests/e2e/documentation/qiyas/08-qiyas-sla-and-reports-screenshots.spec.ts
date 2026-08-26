import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs, openQiyas, clickNavAndWait } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

// Navigates via the sidebar nav link (client-side SPA routing) rather than
// page.goto() to a nested program route directly — a raw goto() triggers a
// full page reload, and re-hydrating the auth store (fetchUser()) races
// with the router guard's role check on this specific app, occasionally
// bouncing back to /programs even for a correctly-authorized account
// (confirmed by inspecting the network/navigation log; the account's own
// /auth/me response is correct). Clicking the nav link is both more
// reliable and a more realistic user journey.

test.describe('مدير برنامج قياس — إعدادات SLA', () => {
  test('عرض وحفظ إعدادات SLA', async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.programManager)
    await openQiyas(page)
    await clickNavAndWait(page, 'nav-sla-settings', /\/sla-settings$/)
    await expect(page.getByText('قيم SLA لكل مرحلة')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '49-sla-settings.png')

    const saveButton = page.getByRole('button', { name: 'حفظ' })
    await Promise.all([
      page.waitForResponse(resp => /\/sla-settings$/.test(resp.url()) && resp.request().method() === 'PUT'),
      saveButton.click(),
    ])
    await page.waitForTimeout(500)
    await captureScreenshot(page, '50-sla-settings-saved.png')
  })
})

test.describe('التقارير', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.programManager)
    await openQiyas(page)
    await clickNavAndWait(page, 'nav-reports', /\/reports$/)
  })

  test('تقرير حسب الإدارة', async ({ page }) => {
    await expect(page.getByText('تقرير حسب الإدارة')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '51-report-by-department.png')
  })

  test('تقرير حسب المعيار', async ({ page }) => {
    await page.getByRole('button', { name: 'تقرير حسب المعيار' }).click()
    await page.waitForTimeout(500)
    await captureScreenshot(page, '52-report-by-standard.png')
  })

  test('تقرير حسب الحالة', async ({ page }) => {
    await page.getByRole('button', { name: 'تقرير حسب الحالة' }).click()
    await page.waitForTimeout(500)
    await captureScreenshot(page, '53-report-by-status.png')
  })

  test('ملخص الدورة', async ({ page }) => {
    await page.getByRole('button', { name: 'ملخص الدورة' }).click()
    await page.waitForTimeout(500)
    await captureScreenshot(page, '54-report-cycle-summary.png')
  })
})
