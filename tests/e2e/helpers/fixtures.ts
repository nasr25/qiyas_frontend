import { Page, expect } from '@playwright/test'
import { E2E_CONFIG } from './env'

/**
 * The 3/5/7-level fixture programs, seeded by the backend's
 * `compliance:seed-test-fixtures` command (TestHierarchyFixtureSeeder).
 *
 * These specs are written against DEPTH, never against a program name or a
 * level label — the whole point of the fixtures is that the same test body
 * passes at three different depths without a branch.
 */
export const FIXTURES = [
  { code: 'TEST3', depth: 3 },
  { code: 'TEST5', depth: 5 },
  { code: 'TEST7', depth: 7 },
] as const

/**
 * A fourth 5-level program reserved for tests that MUTATE a structure.
 * Deliberately absent from FIXTURES: a mutation test running against a
 * shared fixture changes its depth for every spec that follows.
 */
export const MUTABLE_FIXTURE = 'TESTX'

export type Fixture = (typeof FIXTURES)[number]

export const fixtureUser = (code: string, role: 'pm' | 'auditor' | 'dept_manager' | 'employee' | 'employee_b') =>
  `${code.toLowerCase()}_${role}`

/** Logs in with username/password (fixture users are not in the Quick Login panel). */
export async function loginFixtureUser(page: Page, username: string): Promise<void> {
  // Reaching /login while already authenticated is bounced by the router
  // guard, so any prior session is cleared first. This makes the helper
  // safe to call more than once in a test.
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')

  await page.getByTestId('login-username-input').fill(username)
  await page.getByTestId('login-password-input').fill(E2E_CONFIG.password)
  await page.getByTestId('login-submit-button').click()
  await page.waitForURL(/\/programs$/, { timeout: 15_000 })
}

export async function openProgram(page: Page, code: string): Promise<void> {
  await page.goto('/programs')
  const card = page.getByTestId(`program-card-${code}`)
  await expect(card).toBeVisible({ timeout: 15_000 })
  await card.click()
  await page.waitForURL(new RegExp(`/programs/${code}/`), { timeout: 15_000 })
}

/** Direct API call with the token the browser session already holds. */
export async function apiGet(page: Page, path: string): Promise<any> {
  return page.evaluate(async ({ apiURL, path }) => {
    const res = await fetch(`${apiURL}/api/v1${path}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        Accept: 'application/json',
      },
    })
    return { status: res.status, body: res.ok ? await res.json() : null }
  }, { apiURL: E2E_CONFIG.apiURL, path })
}
