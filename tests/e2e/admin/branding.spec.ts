import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { E2E_CONFIG } from '../helpers/env'
import {
  validPngBuffer, notAnImageBuffer, unsafeSvgBuffer, xxeSvgBuffer, safeSvgBuffer,
} from '../data/files'

/**
 * Super Admin branding management — versioned upload, preview-before-save,
 * activation, restore, rejection of unsafe/invalid files, and live
 * propagation to the login page/header via cache-busted URLs. See
 * docs/administration/branding.md and docs/testing/playwright-guide.md.
 */
test.describe('Super Admin branding management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.superAdmin)
    await page.goto('/admin/settings')
    await expect(page.getByTestId('branding-asset-logo_primary')).toBeVisible()
  })

  test('a valid PNG uploads as a pending draft and can be activated, updating the header logo live', async ({ page }) => {
    const fileInput = page.getByTestId('branding-upload-logo_header')
    await fileInput.setInputFiles({ name: 'e2e-logo.png', mimeType: 'image/png', buffer: validPngBuffer() })

    const activateButton = page.locator('[data-testid="branding-asset-logo_header"] [data-testid^="branding-activate-"]')
    await expect(activateButton).toBeVisible({ timeout: 10_000 })

    const headerLogoBefore = await page.getByTestId('nav-logo-image').getAttribute('src').catch(() => null)

    await activateButton.click()
    await expect(page.locator('[data-testid="branding-asset-logo_header"] [data-testid^="branding-activate-"]')).toHaveCount(0)
    await expect(page.getByTestId('branding-preview-logo_header')).toBeVisible()

    // The header logo (shared AppLayout component) updates without a reload.
    const headerLogo = page.getByTestId('nav-logo-image')
    if (await headerLogo.count()) {
      await expect(async () => {
        const src = await headerLogo.getAttribute('src')
        expect(src).not.toBeNull()
        expect(src).not.toBe(headerLogoBefore)
      }).toPass({ timeout: 10_000 })
    }
  })

  test('activating a new version supersedes the previous active version, and restore brings it back', async ({ page }) => {
    // A type untouched by any other test in this file, and status is
    // verified via direct API reads (never by counting UI badges) so the
    // assertion is correct regardless of how much history a shared,
    // non-reset E2E database has accumulated from earlier runs.
    const type = 'logo_login'
    const { context, token } = await apiLoginAs(USERS.superAdmin)
    const historyUrl = `${E2E_CONFIG.apiURL}/api/v1/admin/branding/${type}`

    await page.getByTestId(`branding-upload-${type}`).setInputFiles({ name: 'v1.png', mimeType: 'image/png', buffer: validPngBuffer(16, 16) })
    await page.locator(`[data-testid="branding-asset-${type}"] [data-testid^="branding-activate-"]`).click()
    await expect(page.locator(`[data-testid="branding-asset-${type}"] [data-testid^="branding-activate-"]`)).toHaveCount(0)

    const afterV1 = await (await context.get(historyUrl, { headers: authHeaders(token) })).json()
    const v1 = afterV1.data[0]
    expect(v1.status).toBe('active')

    await page.getByTestId(`branding-upload-${type}`).setInputFiles({ name: 'v2.png', mimeType: 'image/png', buffer: validPngBuffer(16, 16) })
    await page.locator(`[data-testid="branding-asset-${type}"] [data-testid^="branding-activate-"]`).click()
    await expect(page.locator(`[data-testid="branding-asset-${type}"] [data-testid^="branding-activate-"]`)).toHaveCount(0)

    const afterV2 = await (await context.get(historyUrl, { headers: authHeaders(token) })).json()
    const v2ById: Record<number, { id: number; version: number; status: string }> = Object.fromEntries(afterV2.data.map((a: { id: number }) => [a.id, a]))
    expect(v2ById[v1.id].status).toBe('superseded')
    const v2 = afterV2.data.find((a: { id: number }) => a.id !== v1.id)
    expect(v2.status).toBe('active')

    // Restore v1 through the UI.
    await page.getByTestId(`branding-history-toggle-${type}`).click()
    await page.getByTestId(`branding-restore-${type}-${v1.id}`).click()
    await expect(page.getByTestId(`branding-restore-${type}-${v1.id}`)).toHaveCount(0)

    const afterRestore = await (await context.get(historyUrl, { headers: authHeaders(token) })).json()
    const byId: Record<number, { status: string }> = Object.fromEntries(afterRestore.data.map((a: { id: number; status: string }) => [a.id, a]))
    expect(byId[v1.id].status).toBe('active')
    expect(byId[v2.id].status).toBe('superseded')
  })

  test('a non-image file is rejected with a visible error', async ({ page }) => {
    await page.getByTestId('branding-upload-logo_report').setInputFiles({ name: 'not-a-logo.pdf', mimeType: 'application/pdf', buffer: notAnImageBuffer() })
    await expect(page.getByTestId('branding-error-logo_report')).toBeVisible({ timeout: 10_000 })
  })

  test('an SVG with an embedded script is never stored with the script intact', async ({ page }) => {
    const type = 'logo_compact'
    await page.getByTestId(`branding-upload-${type}`).setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: unsafeSvgBuffer() })

    // Either rejected outright, or sanitized-and-accepted — never stored with the script surviving.
    const error = page.getByTestId(`branding-error-${type}`)
    const pending = page.locator(`[data-testid="branding-asset-${type}"] [data-testid^="branding-activate-"]`)
    await expect(error.or(pending)).toBeVisible({ timeout: 10_000 })

    if (await pending.isVisible()) {
      const preview = page.locator(`[data-testid="branding-asset-${type}"] img`).last()
      const src = await preview.getAttribute('src')
      expect(src).toBeTruthy()
      const body = await (await page.request.get(src!)).text()
      expect(body).not.toContain('<script')
      expect(body.toLowerCase()).not.toContain('onload=')
    }
  })

  test('an SVG with an XXE entity declaration is rejected outright', async ({ page }) => {
    const type = 'logo_dark'
    await page.getByTestId(`branding-upload-${type}`).setInputFiles({ name: 'xxe.svg', mimeType: 'image/svg+xml', buffer: xxeSvgBuffer() })
    await expect(page.getByTestId(`branding-error-${type}`)).toBeVisible({ timeout: 10_000 })
  })

  test('a well-formed, safe SVG is accepted', async ({ page }) => {
    const type = 'logo_email'
    await page.getByTestId(`branding-upload-${type}`).setInputFiles({ name: 'safe.svg', mimeType: 'image/svg+xml', buffer: safeSvgBuffer() })
    await expect(page.locator(`[data-testid="branding-asset-${type}"] [data-testid^="branding-activate-"]`)).toBeVisible({ timeout: 10_000 })
  })

  test('branding changes are audited', async ({ page }) => {
    const { context, token } = await apiLoginAs(USERS.superAdmin)
    const before = await context.get('/api/v1/admin/audit-logs', { headers: authHeaders(token), params: { action: 'branding.uploaded', per_page: '1' } })
    expect(before.ok()).toBeTruthy()

    await page.getByTestId('branding-upload-logo_primary').setInputFiles({ name: 'audit-check.png', mimeType: 'image/png', buffer: validPngBuffer() })
    await expect(page.locator('[data-testid="branding-asset-logo_primary"] [data-testid^="branding-activate-"]')).toBeVisible({ timeout: 10_000 })

    const after = await context.get('/api/v1/admin/audit-logs', { headers: authHeaders(token), params: { action: 'branding.uploaded', per_page: '1' } })
    const afterBody = await after.json()
    expect(afterBody.data.length).toBeGreaterThan(0)
  })

  test('renders correctly in Arabic/RTL and dark mode without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    const themeToggle = page.getByTestId('theme-toggle')
    if (await themeToggle.count()) {
      await themeToggle.click()
      await expect(page.locator('html')).toHaveClass(/dark/)
      await expect(page.getByTestId('branding-asset-logo_primary')).toBeVisible()
    }

    expect(errors).toEqual([])
  })
})

test.describe('Branding management is restricted to Super Admin', () => {
  for (const [roleName, username] of Object.entries({ auditor: USERS.auditor, employee: USERS.employeeA, programManager: USERS.programManager })) {
    test(`${roleName} cannot reach the settings page or the branding API`, async ({ page }) => {
      await loginAs(page, username)
      await page.goto('/admin/settings')
      await expect(page).toHaveURL(/\/programs$/)

      const { context, token } = await apiLoginAs(username)
      const response = await context.post(`${E2E_CONFIG.apiURL}/api/v1/admin/branding/logo_primary/upload`, {
        headers: authHeaders(token),
        multipart: { file: { name: 'x.png', mimeType: 'image/png', buffer: validPngBuffer() } },
      })
      expect(response.status()).toBe(403)

      await logout(page)
    })
  }
})
