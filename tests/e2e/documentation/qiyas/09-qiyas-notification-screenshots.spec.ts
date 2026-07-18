import { test, expect } from '@playwright/test'
import { DOCS_ACCOUNTS, VIEWPORT_DESKTOP, captureScreenshot, loginDocs } from './helpers'

test.use({ viewport: VIEWPORT_DESKTOP, locale: 'ar' })

// The department manager account accumulates a real "requirement_assigned"
// notification for every one of the 17 seeded assignments (WorkflowService
// notifies department members on assign()) — no live action needed to have
// unread notifications to show.
test.describe('مركز الإشعارات', () => {
  test.beforeEach(async ({ page }) => {
    await loginDocs(page, DOCS_ACCOUNTS.departmentManager)
  })

  test('أيقونة الإشعارات وعدد غير المقروء', async ({ page }) => {
    await page.goto('/programs/QIYAS/dashboard')
    await expect(page.getByTestId('notification-unread-count')).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '55-notification-bell-unread-badge.png')
  })

  test('فتح قائمة الإشعارات', async ({ page }) => {
    await page.goto('/notifications')
    await expect(page.getByText('الإشعارات').first()).toBeVisible({ timeout: 10_000 })
    await captureScreenshot(page, '56-notifications-list.png')
  })

  test('تعليم الكل كمقروء', async ({ page }) => {
    await page.goto('/notifications')
    const markAllButton = page.getByRole('button', { name: 'تعليم الكل كمقروء' })
    await expect(markAllButton).toBeVisible({ timeout: 10_000 })
    await Promise.all([
      page.waitForResponse(resp => /\/notifications\/mark-all-read$/.test(resp.url()) && resp.request().method() === 'POST'),
      markAllButton.click(),
    ])
    await captureScreenshot(page, '57-notifications-all-read.png')
  })

  test('حذف إشعار', async ({ page }) => {
    await page.goto('/notifications')
    const deleteButton = page.getByRole('button', { name: 'حذف' }).first()
    await expect(deleteButton).toBeVisible({ timeout: 10_000 })
    await Promise.all([
      page.waitForResponse(resp => /\/notifications\/[^/]+$/.test(resp.url()) && resp.request().method() === 'DELETE'),
      deleteButton.click(),
    ])
    await captureScreenshot(page, '58-notification-deleted.png')
  })
})
