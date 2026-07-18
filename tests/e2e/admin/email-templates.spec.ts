import { test, expect } from '@playwright/test'
import { loginAs, logout, USERS } from '../helpers/auth'
import { apiLoginAs, authHeaders } from '../helpers/api'
import { E2E_CONFIG } from '../helpers/env'

/**
 * Super Admin email template administration — edit, preview, test-send, and
 * rejection of unsupported template variables. See
 * docs/administration/email-templates.md and docs/testing/playwright-guide.md.
 */
test.describe('Super Admin email template administration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.superAdmin)
    await page.goto('/admin/settings')
    await page.getByTestId('settings-tab-email-templates').click()
    await expect(page.getByTestId('email-template-row-requirement_assigned')).toBeVisible()
  })

  test('lists seeded templates with their enabled status', async ({ page }) => {
    const row = page.getByTestId('email-template-row-requirement_assigned')
    await expect(row).toContainText('requirement_assigned')
  })

  test('editing subject/body, saving, and re-opening reflects the saved change', async ({ page }) => {
    await page.getByTestId('email-template-row-requirement_assigned').click()
    await expect(page.getByTestId('email-template-editor')).toBeVisible()

    const marker = `E2E marker ${Date.now()}`
    await page.getByTestId('email-template-subject-en').fill(`Requirement assigned ${marker}`)
    await Promise.all([
      page.waitForResponse(resp => /\/admin\/email-templates\/\d+$/.test(resp.url()) && resp.request().method() === 'PUT'),
      page.getByTestId('email-template-save').click(),
    ])
    await expect(page.getByTestId('email-template-editor')).toBeVisible()

    await page.reload()
    await page.getByTestId('settings-tab-email-templates').click()
    await page.getByTestId('email-template-row-requirement_assigned').click()
    await expect(page.getByTestId('email-template-subject-en')).toHaveValue(`Requirement assigned ${marker}`)
  })

  test('disabling a template persists and re-enabling restores delivery', async ({ page }) => {
    await page.getByTestId('email-template-row-sla_warning').click()
    await expect(page.getByTestId('email-template-editor')).toBeVisible()
    await page.getByTestId('email-template-enabled').uncheck()
    await Promise.all([
      page.waitForResponse(resp => /\/admin\/email-templates\/\d+$/.test(resp.url()) && resp.request().method() === 'PUT'),
      page.getByTestId('email-template-save').click(),
    ])

    await page.reload()
    await page.getByTestId('settings-tab-email-templates').click()
    await expect(page.getByTestId('email-template-row-sla_warning')).toContainText('غير نشط')

    await page.getByTestId('email-template-row-sla_warning').click()
    await page.getByTestId('email-template-enabled').check()
    await Promise.all([
      page.waitForResponse(resp => /\/admin\/email-templates\/\d+$/.test(resp.url()) && resp.request().method() === 'PUT'),
      page.getByTestId('email-template-save').click(),
    ])
    await page.reload()
    await page.getByTestId('settings-tab-email-templates').click()
    await expect(page.getByTestId('email-template-row-sla_warning')).not.toContainText('غير')
  })

  test('preview renders sample-substituted subject and body for both locales', async ({ page }) => {
    await page.getByTestId('email-template-row-requirement_assigned').click()
    await page.getByTestId('email-template-preview-en').click()
    const result = page.getByTestId('email-template-preview-result')
    await expect(result).toBeVisible({ timeout: 10_000 })
    await expect(result).not.toContainText('{{')

    await page.getByTestId('email-template-preview-ar').click()
    await expect(result).toBeVisible()
  })

  test('an unsupported template variable is rejected by the API', async ({ page }) => {
    const { context, token } = await apiLoginAs(USERS.superAdmin)
    const listResponse = await context.get(`${E2E_CONFIG.apiURL}/api/v1/admin/email-templates`, { headers: authHeaders(token) })
    const templates = (await listResponse.json()).data
    const target = templates.find((t: { template_key: string }) => t.template_key === 'requirement_assigned')

    const response = await context.put(`${E2E_CONFIG.apiURL}/api/v1/admin/email-templates/${target.id}`, {
      headers: authHeaders(token),
      data: {
        subject_ar: target.subject_ar,
        subject_en: 'Contains {{not_a_real_variable}}',
        body_ar: target.body_ar,
        body_en: target.body_en,
        is_enabled: true,
      },
    })
    expect(response.status()).toBe(422)
  })

  test('a script tag typed into the template body is never rendered as live HTML in preview', async ({ page }) => {
    await page.getByTestId('email-template-row-requirement_assigned').click()
    await page.getByTestId('email-template-body-en').fill('Hello {{recipient_name}} <script>window.__xss = true</script>')
    await page.getByTestId('email-template-save').click()
    await page.getByTestId('email-template-preview-en').click()
    await expect(page.getByTestId('email-template-preview-result')).toBeVisible({ timeout: 10_000 })

    const xssFired = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)
    expect(xssFired).toBeUndefined()
  })
})

test.describe('Email template administration is restricted to Super Admin', () => {
  for (const [roleName, username] of Object.entries({ auditor: USERS.auditor, employee: USERS.employeeA })) {
    test(`${roleName} cannot reach email template administration`, async ({ page }) => {
      await loginAs(page, username)
      await page.goto('/admin/settings')
      await expect(page).toHaveURL(/\/programs$/)

      const { context, token } = await apiLoginAs(username)
      const response = await context.get(`${E2E_CONFIG.apiURL}/api/v1/admin/email-templates`, { headers: authHeaders(token) })
      expect(response.status()).toBe(403)

      await logout(page)
    })
  }
})
