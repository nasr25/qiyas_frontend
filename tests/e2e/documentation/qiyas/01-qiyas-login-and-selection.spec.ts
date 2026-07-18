import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, DOCS_PASSWORD, VIEWPORT_DESKTOP, captureScreenshot } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

test.describe('تسجيل الدخول واختيار برنامج قياس', () => {
  test('صفحة تسجيل الدخول', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-username-input')).toBeVisible()
    await captureScreenshot(page, '01-login-page.png')
  })

  test('اختيار برنامج قياس بعد تسجيل الدخول', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-username-input').fill(DOCS_ACCOUNTS.programManager)
    await page.getByTestId('login-password-input').fill(DOCS_PASSWORD)
    await page.getByTestId('login-submit-button').click()
    await page.waitForURL(/\/programs$/, { timeout: 10_000 })
    await expect(page.getByTestId('program-card-QIYAS')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '02-program-selection-qiyas.png')

    await page.getByTestId('program-card-QIYAS').click()
    await page.waitForURL(/\/programs\/QIYAS\//, { timeout: 10_000 })
    await captureScreenshot(page, '03-qiyas-dashboard-program-manager.png')
  })
})
