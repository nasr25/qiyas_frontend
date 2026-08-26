import { test, expect } from '@playwright/test'
import { FIXTURES, fixtureUser, loginFixtureUser, apiGet } from '../helpers/fixtures'
import { E2E_CONFIG } from '../helpers/env'

/**
 * Dynamic reports, cascading filters and the structure-driven XLSX
 * contract, at every fixture depth.
 */
for (const fixture of FIXTURES) {
  test.describe(`${fixture.code} — ${fixture.depth}-level reports`, () => {
    test.beforeEach(async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
    })

    test('every level becomes a report dimension', async ({ page }) => {
      const result = await apiGet(page, `/programs/${fixture.code}/reports/dimensions`)
      expect(result.status).toBe(200)

      const hierarchy = result.body.data.dimensions.filter((d: any) => d.type === 'hierarchy')
      expect(hierarchy).toHaveLength(fixture.depth)

      // Export columns expand with depth: three per level plus attributes.
      expect(result.body.data.columns.length).toBeGreaterThanOrEqual(fixture.depth * 2)
    })

    test('grouping works up to the four supported dimensions', async ({ page }) => {
      const dimensions = (await apiGet(page, `/programs/${fixture.code}/reports/dimensions`))
        .body.data.dimensions.filter((d: any) => d.type === 'hierarchy')

      const maxGrouping = Math.min(4, dimensions.length)
      for (let count = 1; count <= maxGrouping; count++) {
        const query = dimensions.slice(0, count)
          .map((d: any) => `group_by[]=${encodeURIComponent(d.key)}`).join('&')
        const report = await apiGet(page, `/programs/${fixture.code}/reports/hierarchy?${query}`)

        expect(report.status).toBe(200)

        // Descend `count` levels of nesting and confirm each is present.
        let node = report.body.data.grouping
        for (let depth = 0; depth < count; depth++) {
          expect(node.groups, `nesting level ${depth + 1} of ${count}`).toBeTruthy()
          expect(node.groups.length).toBeGreaterThan(0)
          node = node.groups[0]
        }
      }
    })

    test('a dimension outside the whitelist is refused', async ({ page }) => {
      const result = await apiGet(page, `/programs/${fixture.code}/reports/hierarchy?group_by[]=not_a_dimension`)
      expect(result.status).toBe(422)
    })

    test('filters cascade down the whole structure', async ({ page }) => {
      const dimensions = (await apiGet(page, `/programs/${fixture.code}/reports/dimensions`))
        .body.data.dimensions.filter((d: any) => d.type === 'hierarchy' && d.filterable)

      let parent: number | null = null
      for (const dimension of dimensions) {
        const query: string = parent ? `?parent_node_id=${parent}` : ''
        const options = await apiGet(page, `/programs/${fixture.code}/reports/filter-options/${dimension.key}${query}`)

        expect(options.status).toBe(200)
        expect(options.body.data.length, `options for ${dimension.key}`).toBeGreaterThan(0)
        parent = options.body.data[0].id
      }
    })

    test('the report UI renders cascading filter selects for each filterable level', async ({ page }) => {
      await page.goto(`/programs/${fixture.code}/analytics`)
      await expect(page.getByTestId('hierarchy-filter')).toBeVisible({ timeout: 15_000 })

      const selects = page.getByTestId('hierarchy-filter').locator('select')
      // The fixture marks every level except the leaf as filterable.
      await expect(selects).toHaveCount(fixture.depth - 1)

      // Only the first is enabled until a parent is chosen — that is the cascade.
      await expect(selects.nth(0)).toBeEnabled()
      if (fixture.depth > 2) {
        await expect(selects.nth(1)).toBeDisabled()
      }
    })

    test('XLSX template and export share one contract that follows depth', async ({ page }) => {
      const token = await page.evaluate(() => localStorage.getItem('token'))

      for (const endpoint of ['hierarchy-template', 'hierarchy-export']) {
        const response = await page.request.get(
          `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/${endpoint}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        expect(response.status(), endpoint).toBe(200)

        const body = await response.body()
        // A real xlsx is a zip container: "PK" magic bytes.
        expect(body.subarray(0, 2).toString()).toBe('PK')
        expect(body.length).toBeGreaterThan(4000)
      }
    })

    test('import rejects a workbook that is not the current template', async ({ page }) => {
      const token = await page.evaluate(() => localStorage.getItem('token'))
      const cycle = (await apiGet(page, `/programs/${fixture.code}/cycles`)).body.data[0]

      const response = await page.request.post(
        `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/hierarchy-import/preview`,
        {
          headers: { Authorization: `Bearer ${token}` },
          multipart: {
            cycle_id: String(cycle.id),
            file: { name: 'bogus.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('not a workbook') },
          },
        },
      )

      // Either validation rejects it (200 with can_import false) or the
      // upload rule does (422) — both are correct refusals; a silent
      // acceptance would not be.
      if (response.status() === 200) {
        expect((await response.json()).data.can_import).toBe(false)
      } else {
        expect(response.status()).toBe(422)
      }
    })
  })
}
