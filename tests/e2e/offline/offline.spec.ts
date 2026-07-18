import { test, expect, type Page } from '@playwright/test'
import { loginAs, USERS } from '../helpers/auth'

/**
 * Full offline-operation verification — blocks every outbound request that
 * isn't to localhost/127.0.0.1 (the app itself and its API) and fails if
 * the application ever attempts one while exercising login, program
 * selection, dashboards, Super Admin branding/SMTP/email-template
 * administration, and AR/EN + dark/light mode. See docs/offline-assets.md.
 *
 * An explicit, narrow allowlist covers only what a genuinely offline
 * deployment still needs to resolve: the app's own origin. Nothing else —
 * no CDN, font host, analytics, or third-party API is ever permitted here.
 */
const ALLOWED_HOSTS = ['localhost', '127.0.0.1']

interface BlockedRequest {
  url: string
  resourceType: string
  page: string
}

function isAllowed(url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true
  try {
    const { hostname } = new URL(url)
    return ALLOWED_HOSTS.includes(hostname)
  } catch {
    return true // Not a network URL (e.g. a relative/chrome-extension scheme) — not a public-internet concern.
  }
}

async function enforceOfflineRouting(page: Page, blocked: BlockedRequest[]): Promise<void> {
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (isAllowed(url)) {
      await route.continue()
      return
    }
    blocked.push({ url, resourceType: route.request().resourceType(), page: page.url() })
    await route.abort('blockedbyclient')
  })
}

test.describe('Offline operation — zero public-internet dependency', () => {
  test('the full application works with only localhost reachable', async ({ page }) => {
    const blocked: BlockedRequest[] = []
    await enforceOfflineRouting(page, blocked)

    // Login + program selection.
    await loginAs(page, USERS.superAdmin)
    await expect(page).toHaveURL(/\/programs$/)
    await expect(page.getByTestId('program-card-QIYAS')).toBeVisible()

    // Enter a program, hit the dashboard (charts, cards).
    await page.getByTestId('program-card-QIYAS').click()
    await page.waitForURL(/\/programs\/QIYAS\//)
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/programs/QIYAS/my-requirements')
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/programs/QIYAS/reports')
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/notifications')
    await expect(page.locator('body')).toBeVisible()

    // Super Admin settings — branding, SMTP, email templates.
    await page.goto('/admin/settings')
    await expect(page.getByTestId('branding-asset-logo_primary')).toBeVisible()
    await page.getByTestId('settings-tab-smtp').click()
    await expect(page.getByTestId('smtp-host')).toBeVisible()
    await page.getByTestId('settings-tab-email-templates').click()
    await expect(page.getByTestId('email-template-row-requirement_assigned')).toBeVisible()

    // Locale + theme switches, which load different fonts/assets per mode.
    const localeToggle = page.locator('button', { hasText: /^(EN|ع)$/ })
    if (await localeToggle.count()) {
      await localeToggle.first().click()
      await expect(page.locator('html')).toHaveAttribute('dir', /ltr|rtl/)
    }
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toBeVisible()
    await page.getByTestId('theme-toggle').click()

    if (blocked.length > 0) {
      const summary = blocked.map(b => `  ${b.resourceType} ${b.url} (from ${b.page})`).join('\n')
      throw new Error(`${blocked.length} request(s) attempted a non-local host while offline:\n${summary}`)
    }
  })
})
