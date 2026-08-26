import { Page, expect } from '@playwright/test'
import { E2E_CONFIG } from '../../helpers/env'

/**
 * Shared helpers for the Qiyas illustrated-guide screenshot suite. See
 * docs/user-guides/qiyas/analysis-matrix.md for the underlying analysis
 * this suite captures evidence for, and
 * docs/user-guides/qiyas/screenshot-inventory.md for the resulting index.
 *
 * Targets a dedicated documentation-only environment (never the shared
 * dev/E2E database): backend on :8002 against `qiyas_docs_test_db`,
 * frontend on :5176 built with `--mode docs`. Every account below is
 * seeded by `database/seeders/QiyasDocumentationSeeder.php` with a
 * neutral, artificial name — never a real person.
 */
export const DOCS_ACCOUNTS = {
  programManager: 'qiyas_pm_docs',
  departmentManager: 'qiyas_dm_docs',
  auditor: 'qiyas_auditor_docs',
  employee: 'qiyas_employee_docs',
  executive: 'qiyas_exec_docs',
} as const

export const DOCS_PASSWORD = 'Password123!'

export const VIEWPORT_DESKTOP = { width: 1440, height: 1000 }
export const VIEWPORT_MOBILE = { width: 390, height: 844 }

export async function loginDocs(page: Page, username: string): Promise<void> {
  await page.goto('/login')
  await page.getByTestId('login-username-input').fill(username)
  await page.getByTestId('login-password-input').fill(DOCS_PASSWORD)
  await page.getByTestId('login-submit-button').click()
  await page.waitForURL(/\/programs$/, { timeout: 10_000 })
}

export async function openQiyas(page: Page): Promise<void> {
  await page.goto('/programs')
  const card = page.getByTestId('program-card-QIYAS')
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.click()
  await page.waitForURL(/\/programs\/QIYAS\//, { timeout: 10_000 })
}

/**
 * Clicks a sidebar nav-item testid and waits for the resulting URL.
 * Observed (and reported in docs/user-guides/qiyas/verification-report.md
 * as a real, non-blocking discrepancy): the app occasionally bounces back
 * to /programs within ~1s of a valid, authorized navigation, even without
 * any user action in between — reproduced independently of this test
 * suite's own timing. Retries once after a short delay, which reliably
 * clears it; this is a workaround for capturing accurate screenshots, not
 * a fix for the underlying app behavior.
 */
export async function clickNavAndWait(page: Page, testId: string, urlPattern: RegExp): Promise<void> {
  await page.getByTestId(testId).click()
  try {
    await page.waitForURL(urlPattern, { timeout: 6_000 })
  } catch {
    // Retry: re-open Qiyas fresh, then click again.
    await openQiyas(page)
    await page.getByTestId(testId).click()
    await page.waitForURL(urlPattern, { timeout: 10_000 })
  }
}

/**
 * Captures a full-page screenshot into docs/user-guides/qiyas/screenshots/
 * with the guide's structured naming convention. Waits for network
 * idle-ish stability (fonts/icons/layout) before capturing, and hides any
 * element carrying `data-hide-in-screenshot` (used for unstable
 * timestamps) beforehand.
 */
export async function captureScreenshot(page: Page, filename: string): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => {
    document.querySelectorAll('[data-hide-in-screenshot]').forEach((el) => {
      ;(el as HTMLElement).style.visibility = 'hidden'
    })
  }).catch(() => {})
  await page.waitForTimeout(150) // settle any pending transition/animation
  await page.screenshot({
    path: `docs/user-guides/qiyas/screenshots/${filename}`,
    fullPage: false, // fixed viewport frame — matches what a reader's screen actually shows
  })
}

/**
 * Opens the first assignment whose detail page offers the given control.
 *
 * Not every assignment can do everything: only a draft can upload, only a
 * returned submission shows the rejection banner, only an assignment with
 * no pending request can ask for an extension.
 *
 * Resolves the candidate through the API first and navigates straight to
 * it. Walking the rendered rows one by one worked but cost a page load per
 * candidate, which pushed the spec past its timeout once the fixture grew.
 */
export async function openRequirementOffering(page: Page, testId: string): Promise<void> {
  // Which assignment states can offer which control.
  const wanted: Record<string, string[]> = {
    'evidence-upload': ['draft', 'returned_for_revision', 'assigned'],
    'rejection-reason-banner': ['returned_for_revision'],
    'extension-request-button': ['draft', 'returned_for_revision', 'assigned'],
  }

  const states = wanted[testId] ?? []
  const list = await page.evaluate(async (apiURL) => {
    const res = await fetch(`${apiURL}/api/v1/programs/QIYAS/my-requirements`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, Accept: 'application/json' },
    })
    return res.ok ? (await res.json()).data : []
  }, E2E_CONFIG.apiURL)

  const candidates = list.filter((row: any) => states.includes(row.status))
  expect(candidates.length, `no assignment is in a state that can offer "${testId}"`).toBeGreaterThan(0)

  for (const candidate of candidates) {
    await page.goto(`/programs/QIYAS/my-requirements/${candidate.id}`)

    // An assignment on a level that does not accept evidence has no
    // submission and therefore no timeline. That is correct behaviour, not
    // a failure — move on to the next candidate.
    const settled = await page.getByTestId('workflow-timeline')
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false)

    if (settled && await page.getByTestId(testId).count()) {
      return
    }
  }

  throw new Error(`No assignment offers "${testId}" — the documentation fixture must seed one.`)
}
