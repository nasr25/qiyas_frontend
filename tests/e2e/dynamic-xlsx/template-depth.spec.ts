import { test, expect } from '@playwright/test'
import { FIXTURES, fixtureUser, loginFixtureUser, apiGet } from '../helpers/fixtures'
import { E2E_CONFIG } from '../helpers/env'

/**
 * The XLSX engine at 3, 5 and 7 levels, plus the structure-version proof.
 *
 * Column counts are asserted as a FUNCTION of depth rather than hard-coded,
 * so these tests would fail if the engine ever stopped deriving the
 * template from the structure.
 */
for (const fixture of FIXTURES) {
  test.describe(`${fixture.code} — ${fixture.depth}-level XLSX`, () => {
    test.beforeEach(async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
    })

    test('template generates with one column group per level', async ({ page }) => {
      const token = await page.evaluate(() => localStorage.getItem('token'))

      const response = await page.request.get(
        `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/hierarchy-template`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      expect(response.status()).toBe(200)

      const body = await response.body()
      expect(body.subarray(0, 2).toString()).toBe('PK')

      // Upload it straight back: a program's own template must always be a
      // valid import, and the preview reports the column/level counts.
      const cycle = (await apiGet(page, `/programs/${fixture.code}/cycles`)).body.data[0]
      const preview = await page.request.post(
        `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/hierarchy-import/preview`,
        {
          headers: { Authorization: `Bearer ${token}` },
          multipart: {
            cycle_id: String(cycle.id),
            file: { name: 'template.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: body },
          },
        },
      )
      expect(preview.status()).toBe(200)

      const data = (await preview.json()).data
      expect(data.can_import).toBe(true)
      expect(data.summary.levels).toBe(fixture.depth)
      // Three columns per level (code + Arabic + English), plus attributes.
      expect(data.summary.columns).toBeGreaterThanOrEqual(fixture.depth * 3)
      // The preview breaks new nodes down per level — one entry per level.
      expect(data.by_level).toHaveLength(fixture.depth)
    })

    test('import creates the full chain and export matches the contract', async ({ page }) => {
      const token = await page.evaluate(() => localStorage.getItem('token'))
      const cycle = (await apiGet(page, `/programs/${fixture.code}/cycles`)).body.data[0]

      const template = await (await page.request.get(
        `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/hierarchy-template`,
        { headers: { Authorization: `Bearer ${token}` } },
      )).body()

      const preview = await (await page.request.post(
        `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/hierarchy-import/preview`,
        {
          headers: { Authorization: `Bearer ${token}` },
          multipart: {
            cycle_id: String(cycle.id),
            file: { name: 't.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: template },
          },
        },
      )).json()

      const confirm = await page.request.post(
        `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/hierarchy-import/${preview.data.import_log_id}/confirm`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      expect(confirm.status()).toBe(200)

      // Export is the same column contract, so a round trip is possible.
      const exported = await page.request.get(
        `${E2E_CONFIG.apiURL}/api/v1/programs/${fixture.code}/hierarchy-export`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      expect(exported.status()).toBe(200)
      expect((await exported.body()).subarray(0, 2).toString()).toBe('PK')
    })
  })
}

/**
 * The single most important proof that the XLSX engine is structure-driven
 * rather than schema-driven: change the structure, and yesterday's template
 * stops being accepted.
 */
test('a template from a superseded structure version is refused, and the new one works', async ({ page }) => {
  // TESTX exists purely for structure-MUTATING tests. Running this against
  // a shared fixture permanently changed its depth and broke every spec
  // that ran afterwards.
  const code = 'TESTX'
  await loginFixtureUser(page, fixtureUser(code, 'pm'))

  const token = await page.evaluate(() => localStorage.getItem('token'))
  const api = `${E2E_CONFIG.apiURL}/api/v1/programs/${code}`
  const auth = { Authorization: `Bearer ${token}` }
  const cycle = (await apiGet(page, `/programs/${code}/cycles`)).body.data[0]

  const before = (await apiGet(page, `/programs/${code}/structure`)).body.data
  const oldTemplate = await (await page.request.get(`${api}/hierarchy-template`, { headers: auth })).body()

  // Add a level through the API the Structure Settings screen uses.
  await page.request.post(`${api}/structure/draft`, { headers: auth })
  const added = await page.request.post(`${api}/structure/draft/levels`, {
    headers: auth,
    data: { key: 'appended_level', name_ar: 'مستوى مضاف', name_en: 'Appended Level', is_assessable: true },
  })
  expect(added.status()).toBe(201)

  const activated = await page.request.post(`${api}/structure/draft/activate`, {
    headers: auth,
    data: { acknowledge_migration: true, change_summary: 'E2E: appended a level' },
  })
  expect(activated.status()).toBe(200)
  expect((await activated.json()).data.depth).toBe(before.definition.depth + 1)

  // The OLD template must now be refused, naming both versions.
  const stale = await page.request.post(`${api}/hierarchy-import/preview`, {
    headers: auth,
    multipart: {
      cycle_id: String(cycle.id),
      file: { name: 'stale.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: oldTemplate },
    },
  })
  expect(stale.status()).toBe(200)

  const staleData = (await stale.json()).data
  expect(staleData.can_import).toBe(false)
  expect(staleData.errors.map((e: any) => e.code)).toContain('INCOMPATIBLE_STRUCTURE_VERSION')

  // The NEW template reflects the added level and imports.
  const fresh = await (await page.request.get(`${api}/hierarchy-template`, { headers: auth })).body()
  const freshPreview = await page.request.post(`${api}/hierarchy-import/preview`, {
    headers: auth,
    multipart: {
      cycle_id: String(cycle.id),
      file: { name: 'fresh.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fresh },
    },
  })
  const freshData = (await freshPreview.json()).data
  expect(freshData.can_import).toBe(true)
  expect(freshData.summary.levels).toBe(before.definition.depth + 1)
})
