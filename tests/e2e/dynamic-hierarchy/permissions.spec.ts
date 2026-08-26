import { test, expect } from '@playwright/test'
import { FIXTURES, fixtureUser, loginFixtureUser, apiGet } from '../helpers/fixtures'

/**
 * Program- and department-scope enforcement, asserted against the API the
 * browser session actually holds a token for — so this proves the BACKEND
 * refuses, not merely that a button is hidden.
 */
test.describe('structure management scope', () => {
  test('a Program Manager cannot manage another program', async ({ page }) => {
    await loginFixtureUser(page, fixtureUser('TEST3', 'pm'))

    const own = await apiGet(page, '/programs/TEST3/structure')
    expect(own.status).toBe(200)
    expect(own.body.data.can_manage).toBe(true)

    // No membership in TEST5 at all: 404, never 403, so program codes
    // cannot be enumerated by a probing client.
    const foreign = await apiGet(page, '/programs/TEST5/structure')
    expect(foreign.status).toBe(404)
  })

  test('a non-manager member may read the structure but not manage it', async ({ page }) => {
    await loginFixtureUser(page, fixtureUser('TEST5', 'employee'))

    const structure = await apiGet(page, '/programs/TEST5/structure')
    expect(structure.status).toBe(200)
    expect(structure.body.data.can_manage).toBe(false)

    await page.goto('/programs/TEST5/settings/structure')
    await expect(page.getByTestId('structure-read-only')).toBeVisible()
    await expect(page.getByTestId('open-draft-button')).toHaveCount(0)
  })

  for (const fixture of FIXTURES) {
    test(`${fixture.code}: an employee's dashboard is limited to their own department`, async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
      const asManager = await apiGet(page, `/programs/${fixture.code}/dashboard/metrics`)

      await loginFixtureUser(page, fixtureUser(fixture.code, 'employee'))
      const asEmployee = await apiGet(page, `/programs/${fixture.code}/dashboard/metrics`)

      expect(asManager.status).toBe(200)
      expect(asEmployee.status).toBe(200)

      // The fixture spreads assignments across two departments, so an
      // employee must see strictly fewer than the manager.
      expect(asEmployee.body.data.metrics.count_assigned)
        .toBeLessThan(asManager.body.data.metrics.count_assigned)
    })
  }
})
