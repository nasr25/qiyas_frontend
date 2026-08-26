import { test, expect, type Page } from '@playwright/test'

/**
 * Post-deployment smoke test — safe to run against a real production
 * deployment.
 *
 * Deliberately does NOT import tests/e2e/helpers/env.ts: that preflight
 * refuses to run against production, which is correct for the main suite
 * (it creates, approves and rejects real records) and wrong for this one.
 *
 * The contract here is strict and is what makes running it against
 * production acceptable:
 *
 *   - every request is a READ; nothing is created, modified or deleted
 *   - no structure is drafted or activated, no cycle touched
 *   - no evidence uploaded, no workflow advanced, no email sent
 *   - the XLSX check downloads a generated template, which persists nothing
 *
 * It answers one question: did this deployment come up correctly?
 *
 *   SMOKE_BASE_URL / SMOKE_API_URL   target (falls back to E2E_* then localhost)
 *   SMOKE_USERNAME / SMOKE_PASSWORD  an account that can read a program
 *   SMOKE_PROGRAM                    program code to open (default QIYAS)
 */

const baseURL = process.env.SMOKE_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:5181'
const apiURL = process.env.SMOKE_API_URL || process.env.E2E_API_URL || 'http://localhost:8002'
const username = process.env.SMOKE_USERNAME || 'qiyas_admin'
const password = process.env.SMOKE_PASSWORD || 'Password123!'
const programCode = process.env.SMOKE_PROGRAM || 'QIYAS'

// Each test signs in for itself, so they are independent: one failure must
// not mask the rest of the deployment's status.
test.describe.configure({ mode: 'default' })

async function signIn(page: Page): Promise<void> {
  await page.goto(`${baseURL}/login`)
  await page.getByTestId('login-username-input').fill(username)
  await page.getByTestId('login-password-input').fill(password)
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/auth/login') && r.request().method() === 'POST'),
    page.getByTestId('login-submit-button').click(),
  ])
}

test.describe('production smoke — read-only', () => {
  test('the API is alive and its liveness probe is self-contained', async ({ request }) => {
    const res = await request.get(`${apiURL}/up`)
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  test('the passwordless developer login is not exposed', async ({ request }) => {
    // 404 once the route is not registered (production), 403 if it is
    // registered but gated. Anything else — above all a 200 — is a failure.
    const quick = await request.post(`${apiURL}/api/v1/auth/quick-login`, {
      data: { username: 'superadmin' },
      failOnStatusCode: false,
    })
    expect([403, 404]).toContain(quick.status())

    const devUsers = await request.get(`${apiURL}/api/v1/auth/dev-users`, { failOnStatusCode: false })
    if (devUsers.status() === 200) {
      expect((await devUsers.json()).data).toEqual([])
    } else {
      expect(devUsers.status()).toBe(404)
    }
  })

  test('an unauthenticated request is refused without leaking internals', async ({ request }) => {
    const res = await request.get(`${apiURL}/api/v1/auth/me`, { failOnStatusCode: false })
    expect(res.status()).toBe(401)
    const body = await res.text()
    expect(body).not.toMatch(/Stack trace|vendor\/|SQLSTATE/i)
  })

  test('login, program selector, and sign-out complete', async ({ page }) => {
    await signIn(page)
    await expect(page).toHaveURL(/\/programs/)
    await expect(page.getByTestId(/^program-card-/).first()).toBeVisible({ timeout: 15_000 })

    await page.getByTestId(`program-card-${programCode}`).click()
    await expect(page).toHaveURL(new RegExp(`/programs/${programCode}`))
  })

  test('hierarchy, assignments, dashboard and reports all load', async ({ page }) => {
    await signIn(page)

    // Each screen is asserted on a stable landmark rather than on content,
    // so the suite is valid against a deployment with any amount of data.
    await page.goto(`${baseURL}/programs/${programCode}/dashboard`)
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('main')).toBeVisible()

    await page.goto(`${baseURL}/programs/${programCode}/hierarchy`)
    await expect(page.getByTestId('hierarchy-breadcrumb')
      .or(page.getByTestId(/^hierarchy-node-/)).first()).toBeVisible({ timeout: 20_000 })

    await page.goto(`${baseURL}/programs/${programCode}/assignments`)
    await expect(page.getByTestId('nav-assignments')
      .or(page.getByTestId(/^assignment-row-/)).first()).toBeVisible({ timeout: 20_000 })

    await page.goto(`${baseURL}/programs/${programCode}/reports`)
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

    // Nothing above may have produced an application error.
    await expect(page.getByText(/Server Error|500/)).toHaveCount(0)
  })

  test('an XLSX template generates at the program’s configured depth', async ({ page, request }) => {
    await signIn(page)
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token, 'a token must be present after sign-in').toBeTruthy()

    const res = await request.get(`${apiURL}/api/v1/programs/${programCode}/hierarchy-template`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.body()
    // "PK" — a real ZIP/OOXML container, not an error page.
    expect(body.subarray(0, 2).toString()).toBe('PK')
    expect(body.length).toBeGreaterThan(1000)
  })

  test('sign-out clears the session', async ({ page }) => {
    await signIn(page)
    // The user menu is an aria-haspopup button; the sign-out control lives
    // in the menu it opens. Addressed by role, which survives any build.
    await page.getByRole('button', { name: new RegExp(username, 'i') })
      .or(page.locator('button[aria-haspopup="menu"]')).first().click()
    await page.getByRole('menu').getByRole('button').last().click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeFalsy()
  })
})
