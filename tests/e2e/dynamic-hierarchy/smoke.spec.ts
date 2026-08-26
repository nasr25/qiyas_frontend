import { test, expect } from '@playwright/test'
import { FIXTURES, fixtureUser, loginFixtureUser, apiGet } from '../helpers/fixtures'

/**
 * Critical structure/lifecycle smoke suite — this is the file the Firefox
 * and WebKit projects run (see playwright.config.ts `testMatch`).
 *
 * Deliberately narrow: login, program scoping, structure depth, drill-down
 * and the report contract at all three depths. If these pass on a browser,
 * the engine's core is exercised there.
 */
for (const fixture of FIXTURES) {
  test(`${fixture.code}: ${fixture.depth}-level structure loads end to end`, async ({ page }) => {
    await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))

    // Structure settings render every configured level.
    await page.goto(`/programs/${fixture.code}/settings/structure`)
    await expect(page.getByTestId('active-level-list').locator('li')).toHaveCount(fixture.depth, { timeout: 20_000 })

    // Analytics renders universal metrics and a breadcrumb.
    await page.goto(`/programs/${fixture.code}/analytics`)
    await expect(page.getByTestId('universal-metrics')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('hierarchy-breadcrumb')).toBeVisible()

    // The API agrees about depth.
    const structure = await apiGet(page, `/programs/${fixture.code}/structure`)
    expect(structure.status).toBe(200)
    expect(structure.body.data.definition.levels).toHaveLength(fixture.depth)

    const dimensions = await apiGet(page, `/programs/${fixture.code}/reports/dimensions`)
    expect(dimensions.body.data.dimensions.filter((d: any) => d.type === 'hierarchy')).toHaveLength(fixture.depth)
  })
}
