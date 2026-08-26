import { test, expect } from '@playwright/test'
import { FIXTURES, fixtureUser, loginFixtureUser, apiGet } from '../helpers/fixtures'

/**
 * Universal metrics, metadata-driven drill-down and dynamic breadcrumbs.
 *
 * The drill test walks the whole configured path by following `next_level`
 * from the API — it never names a level — so it exercises two hops on a
 * 3-level program and six on a 7-level one from the same code.
 */
for (const fixture of FIXTURES) {
  test.describe(`${fixture.code} — ${fixture.depth}-level dashboard`, () => {
    test.beforeEach(async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
    })

    test('universal metrics render and are hierarchy-neutral', async ({ page }) => {
      await page.goto(`/programs/${fixture.code}/analytics`)

      await expect(page.getByTestId('universal-metrics')).toBeVisible({ timeout: 15_000 })
      for (const metric of ['count_assessable', 'count_assigned', 'count_unassigned', 'count_approved']) {
        await expect(page.getByTestId(`metric-${metric}`)).toBeVisible()
      }

      const response = await apiGet(page, `/programs/${fixture.code}/dashboard/metrics`)
      // The metric SET must be identical whatever the depth.
      expect(Object.keys(response.body.data.metrics)).toEqual(response.body.data.supported_metrics)
    })

    test('drill-down follows the structure to its deepest dashboard level', async ({ page }) => {
      await page.goto(`/programs/${fixture.code}/analytics`)
      await expect(page.getByTestId('universal-metrics')).toBeVisible({ timeout: 15_000 })

      const levels = (await apiGet(page, `/programs/${fixture.code}/dashboard/levels`)).body.data
      // The fixture hides the leaf from the dashboard, so drillable levels
      // are depth - 1.
      expect(levels.length).toBe(fixture.depth - 1)

      let hops = 0
      let levelKey: string | null = levels[0].key
      let nodeId: number | null = null

      while (levelKey) {
        const query: string = nodeId ? `?node_id=${nodeId}` : ''
        const result = await apiGet(page, `/programs/${fixture.code}/dashboard/by-level/${levelKey}${query}`)
        expect(result.status).toBe(200)
        expect(result.body.data.rows.length).toBeGreaterThan(0)

        nodeId = result.body.data.rows[0].node.id
        levelKey = result.body.data.next_level?.key ?? null
        hops++
      }

      expect(hops).toBe(levels.length)
    })

    test('breadcrumb grows one entry per drill and returns to root', async ({ page }) => {
      await page.goto(`/programs/${fixture.code}/analytics`)
      await expect(page.getByTestId('hierarchy-breadcrumb')).toBeVisible({ timeout: 15_000 })

      const firstRow = page.getByTestId('report-tree').locator('xpath=.')  // ensure page settled
      await expect(firstRow).toBeAttached()

      // Drill one level via the UI and confirm the breadcrumb extended.
      const rows = page.locator('[data-testid^="group-row-"]')
      await expect(rows.first()).toBeVisible({ timeout: 15_000 })

      const before = await page.getByTestId('hierarchy-breadcrumb').locator('button').count()
      await rows.first().click()
      await expect
        .poll(async () => page.getByTestId('hierarchy-breadcrumb').locator('button').count(), { timeout: 15_000 })
        .toBe(before + 1)

      await page.getByTestId('breadcrumb-root').click()
      await expect
        .poll(async () => page.getByTestId('hierarchy-breadcrumb').locator('button').count(), { timeout: 15_000 })
        .toBe(before)
    })
  })
}
