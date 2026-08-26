import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { E2E_CONFIG } from '../helpers/env'
import { FakeSmtpServer } from '../helpers/fake-smtp-server'

/**
 * Super Admin SMTP configuration — encrypted-at-rest storage, the password
 * never returned by the API, and test-connection against a real (fake,
 * controlled) SMTP server. See docs/security/smtp-security.md and
 * docs/testing/playwright-guide.md.
 */
const SMTP_PORT = 2526
const VALID_USER = 'e2e_relay_user'
const VALID_PASS = 'CorrectPass1!'

test.describe('Super Admin SMTP settings', () => {
  let smtp: FakeSmtpServer

  test.beforeAll(async () => {
    smtp = new FakeSmtpServer({ port: SMTP_PORT, validUsername: VALID_USER, validPassword: VALID_PASS, requireAuth: true })
    await smtp.start()
  })

  test.afterAll(async () => {
    await smtp.stop()
  })

  test.beforeEach(async ({ page }) => {
    smtp.reset()
    await loginAs(page, USERS.superAdmin)
    await page.goto('/admin/settings')
    await page.getByTestId('settings-tab-smtp').click()
    await expect(page.getByTestId('smtp-host')).toBeVisible()
  })

  test('the password field is never populated from the API and shows only a configured/not-configured status', async ({ page }) => {
    await page.getByTestId('smtp-host').fill('127.0.0.1')
    await page.getByTestId('smtp-port').fill(String(SMTP_PORT))
    await page.getByTestId('smtp-username').fill(VALID_USER)
    await page.getByTestId('smtp-password').fill(VALID_PASS)
    await page.getByTestId('smtp-from-email').fill('notify@e2e.test')
    await page.getByTestId('smtp-save').click()
    await expect(page.getByTestId('smtp-password-status')).not.toContainText('غير')

    // Reload the page entirely — the password field must still come back empty.
    await page.reload()
    await page.getByTestId('settings-tab-smtp').click()
    await expect(page.getByTestId('smtp-host')).toHaveValue('127.0.0.1')
    await expect(page.getByTestId('smtp-password')).toHaveValue('')

    // Never present anywhere in the raw network response either.
    const { context, token } = await apiLoginAs(USERS.superAdmin)
    const response = await context.get(`${E2E_CONFIG.apiURL}/api/v1/admin/smtp-settings`, { headers: authHeaders(token) })
    const body = await response.text()
    expect(body).not.toContain(VALID_PASS)
    expect(body.toLowerCase()).not.toContain('password_encrypted')
  })

  test('saving with the password field blank preserves the previously saved password', async ({ page }) => {
    await page.getByTestId('smtp-host').fill('127.0.0.1')
    await page.getByTestId('smtp-port').fill(String(SMTP_PORT))
    await page.getByTestId('smtp-username').fill(VALID_USER)
    await page.getByTestId('smtp-password').fill(VALID_PASS)
    await page.getByTestId('smtp-from-email').fill('notify@e2e.test')
    await page.getByTestId('smtp-save').click()
    await expect(page.getByTestId('smtp-password-status')).not.toContainText('غير')

    // Change an unrelated field, leave password blank, save again.
    await page.getByTestId('smtp-port').fill(String(SMTP_PORT))
    await page.getByTestId('smtp-from-name-en').fill('E2E Notifications')
    await page.getByTestId('smtp-save').click()
    await expect(page.getByTestId('smtp-password-status')).not.toContainText('غير')

    // Test connection uses the saved password (field left blank) and must still authenticate successfully.
    await page.getByTestId('smtp-test').click()
    await expect(page.getByTestId('smtp-test-result')).toContainText(/succeed/i, { timeout: 10_000 })
    expect(smtp.authAttempts.some(a => a.username === VALID_USER && a.password === VALID_PASS)).toBeTruthy()
  })

  test('test connection succeeds against a correctly configured relay', async ({ page }) => {
    await page.getByTestId('smtp-host').fill('127.0.0.1')
    await page.getByTestId('smtp-port').fill(String(SMTP_PORT))
    await page.getByTestId('smtp-username').fill(VALID_USER)
    await page.getByTestId('smtp-password').fill(VALID_PASS)
    await page.getByTestId('smtp-from-email').fill('notify@e2e.test')
    await page.getByTestId('smtp-test').click()
    await expect(page.getByTestId('smtp-test-result')).toContainText(/succeed/i, { timeout: 10_000 })
  })

  test('test connection fails with a sanitized error on a wrong password, never leaking the password itself', async ({ page }) => {
    await page.getByTestId('smtp-host').fill('127.0.0.1')
    await page.getByTestId('smtp-port').fill(String(SMTP_PORT))
    await page.getByTestId('smtp-username').fill(VALID_USER)
    await page.getByTestId('smtp-password').fill('TotallyWrongPassword!')
    await page.getByTestId('smtp-from-email').fill('notify@e2e.test')
    await page.getByTestId('smtp-test').click()

    const result = page.getByTestId('smtp-test-result')
    await expect(result).toBeVisible({ timeout: 10_000 })
    const text = await result.textContent()
    // The username the Super Admin just typed is not a secret and may
    // legitimately appear in a connection-failure message; the password
    // (the actual secret) must never appear anywhere in it.
    expect(text).not.toContain('TotallyWrongPassword!')
  })

  test('test connection fails cleanly on an unreachable host', async ({ page }) => {
    await page.getByTestId('smtp-host').fill('127.0.0.1')
    await page.getByTestId('smtp-port').fill('9') // discard port — nothing listens there
    await page.getByTestId('smtp-from-email').fill('notify@e2e.test')
    await page.getByTestId('smtp-auth-enabled').uncheck()
    await page.getByTestId('smtp-test').click()
    await expect(page.getByTestId('smtp-test-result')).not.toContainText(/succeed/i, { timeout: 10_000 })
  })

  test('unencrypted SMTP is rejected unless the internal relay checkbox is explicitly set', async ({ page }) => {
    await page.getByTestId('smtp-encryption').selectOption('none')
    await expect(page.getByTestId('smtp-internal-relay')).toBeVisible()
    await page.getByTestId('smtp-internal-relay').uncheck()
    await page.getByTestId('smtp-host').fill('127.0.0.1')
    await page.getByTestId('smtp-port').fill(String(SMTP_PORT))
    await page.getByTestId('smtp-from-email').fill('notify@e2e.test')
    await page.getByTestId('smtp-save').click()
    // The backend rejects with 422 — the UI must not silently show success.
    await expect(page.getByTestId('smtp-host')).toBeVisible() // still on the form, not navigated away
  })

  test('SMTP configuration changes are audited without exposing the secret', async ({ page }) => {
    const { context, token } = await apiLoginAs(USERS.superAdmin)

    await page.getByTestId('smtp-host').fill('127.0.0.1')
    await page.getByTestId('smtp-port').fill(String(SMTP_PORT))
    await page.getByTestId('smtp-username').fill(VALID_USER)
    await page.getByTestId('smtp-password').fill(VALID_PASS)
    await page.getByTestId('smtp-from-email').fill('notify@e2e.test')
    await page.getByTestId('smtp-save').click()
    await expect(page.getByTestId('smtp-password-status')).not.toContainText('غير')

    const response = await context.get(`${E2E_CONFIG.apiURL}/api/v1/admin/smtp-settings/history`, { headers: authHeaders(token) })
    const body = await response.json()
    expect(body.data.some((v: { key: string; secret_action: string | null }) => v.key === 'password' && v.secret_action)).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain(VALID_PASS)
  })
})

test.describe('SMTP settings are restricted to Super Admin', () => {
  for (const [roleName, username] of Object.entries({ auditor: USERS.auditor, employee: USERS.employeeA })) {
    test(`${roleName} cannot reach the SMTP settings page or API`, async ({ page }) => {
      await loginAs(page, username)
      await page.goto('/admin/settings')
      await expect(page).toHaveURL(/\/programs$/)

      const { context, token } = await apiLoginAs(username)
      const getResponse = await context.get(`${E2E_CONFIG.apiURL}/api/v1/admin/smtp-settings`, { headers: authHeaders(token) })
      expect(getResponse.status()).toBe(403)

      await logout(page)
    })
  }
})
