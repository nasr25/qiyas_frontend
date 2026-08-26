import { test, expect } from '@playwright/test'
import { FIXTURES, fixtureUser, loginFixtureUser, apiGet } from '../helpers/fixtures'
import { E2E_CONFIG } from '../helpers/env'

/**
 * Authorization scope after the legacy path was retired.
 *
 * The specific risk this guards is that hierarchy filtering became a way to
 * WIDEN visibility — a filter parameter reaching data a role should not
 * see. Every case therefore asks for MORE than the caller is entitled to
 * and asserts they still get only their own slice.
 */
for (const fixture of FIXTURES) {
  test.describe(`${fixture.code} (${fixture.depth} levels) — scope enforcement`, () => {
    test('an Employee cannot widen scope with a root hierarchy filter', async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
      const asManager = (await apiGet(page, `/programs/${fixture.code}/dashboard/metrics`)).body.data.metrics

      // The root node covers the entire program.
      const roots = await apiGet(page, `/programs/${fixture.code}/hierarchy`)
      const rootId = roots.body.data[0].id

      await loginFixtureUser(page, fixtureUser(fixture.code, 'employee'))

      const unfiltered = (await apiGet(page, `/programs/${fixture.code}/dashboard/metrics`)).body.data.metrics
      const filteredToRoot = (await apiGet(page,
        `/programs/${fixture.code}/dashboard/metrics?node_id=${rootId}`)).body.data.metrics

      // Filtering to everything must not reveal more than filtering to nothing.
      expect(filteredToRoot.count_assigned).toBeLessThanOrEqual(unfiltered.count_assigned)
      expect(unfiltered.count_assigned).toBeLessThan(asManager.count_assigned)
    })

    test('an Employee cannot widen scope through report filters', async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
      const managerRows = (await apiGet(page, `/programs/${fixture.code}/reports/hierarchy`)).body.data.row_count

      const roots = await apiGet(page, `/programs/${fixture.code}/hierarchy`)
      const rootId = roots.body.data[0].id

      await loginFixtureUser(page, fixtureUser(fixture.code, 'employee'))
      const employeeRows = (await apiGet(page,
        `/programs/${fixture.code}/reports/hierarchy?node_id=${rootId}`)).body.data.row_count

      expect(employeeRows).toBeLessThan(managerRows)
    })

    test('crafted query parameters do not bypass scoping', async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'employee'))

      const baseline = (await apiGet(page, `/programs/${fixture.code}/reports/hierarchy`)).body.data.row_count

      for (const query of [
        'department_id=1&department_id=2',
        'node_id=0',
        'node_id=999999',
        'group_by[]=department&department_id=99999',
      ]) {
        const attempt = await apiGet(page, `/programs/${fixture.code}/reports/hierarchy?${query}`)
        expect(attempt.status, query).toBe(200)
        expect(attempt.body.data.row_count, query).toBeLessThanOrEqual(baseline)
      }
    })

    test('a Department Manager sees only their own department', async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
      const all = (await apiGet(page, `/programs/${fixture.code}/reports/hierarchy`)).body.data.row_count

      await loginFixtureUser(page, fixtureUser(fixture.code, 'dept_manager'))
      const mine = (await apiGet(page, `/programs/${fixture.code}/reports/hierarchy`)).body.data.row_count

      // The fixture spreads work across two departments.
      expect(mine).toBeLessThan(all)
      expect(mine).toBeGreaterThan(0)
    })

    test('an Auditor sees across departments but only their own program', async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'auditor'))

      const own = await apiGet(page, `/programs/${fixture.code}/reports/hierarchy`)
      expect(own.status).toBe(200)

      // An auditor is not department-scoped…
      const deptManager = fixtureUser(fixture.code, 'dept_manager')
      await loginFixtureUser(page, deptManager)
      const managerRows = (await apiGet(page, `/programs/${fixture.code}/reports/hierarchy`)).body.data.row_count

      await loginFixtureUser(page, fixtureUser(fixture.code, 'auditor'))
      const auditorRows = (await apiGet(page, `/programs/${fixture.code}/reports/hierarchy`)).body.data.row_count
      expect(auditorRows).toBeGreaterThanOrEqual(managerRows)

      // …but is confined to their own program.
      const other = FIXTURES.find(f => f.code !== fixture.code)!
      const foreign = await apiGet(page, `/programs/${other.code}/reports/hierarchy`)
      expect(foreign.status).toBe(404)
    })

    test('a Program Manager cannot reach another program', async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))

      const other = FIXTURES.find(f => f.code !== fixture.code)!
      for (const path of ['structure', 'dashboard/metrics', 'reports/dimensions', 'hierarchy']) {
        const attempt = await apiGet(page, `/programs/${other.code}/${path}`)
        expect(attempt.status, `${other.code}/${path}`).toBe(404)
      }
    })
  })
}

test('an Executive Viewer is read-only across programs', async ({ page }) => {
  await loginFixtureUser(page, 'executive_viewer')

  // Implicit read access to an active program…
  const read = await apiGet(page, '/programs/QIYAS/dashboard/metrics')
  expect(read.status).toBe(200)

  // …but no structure management anywhere.
  const structure = await apiGet(page, '/programs/QIYAS/structure')
  expect(structure.status).toBe(200)
  expect(structure.body.data.can_manage).toBe(false)

  // A real POST — apiGet only issues GETs, so passing a method to it would
  // have silently asserted the wrong verb.
  const token = await page.evaluate(() => localStorage.getItem('token'))
  const write = await page.request.post(
    `${E2E_CONFIG.apiURL}/api/v1/programs/QIYAS/structure/draft`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  )
  expect(write.status()).toBe(403)
})
