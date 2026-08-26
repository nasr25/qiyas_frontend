import { test, expect } from '@playwright/test'
import { fixtureUser, loginFixtureUser, apiGet, MUTABLE_FIXTURE } from '../helpers/fixtures'
import { E2E_CONFIG } from '../helpers/env'

/**
 * Unsafe structural changes against a POPULATED, ACTIVE cycle.
 *
 * Runs against TESTX — the fixture reserved for mutation — because these
 * tests deliberately open drafts and attempt destructive edits, which would
 * poison a shared fixture for every spec that follows.
 *
 * Each case asserts the BACKEND refuses, not merely that the UI hides a
 * button: a direct API call is made in every one.
 */
test.describe.serial(`${MUTABLE_FIXTURE} — active-cycle structure protection`, () => {
  let auth: Record<string, string>
  let api: string
  let levels: any[]

  test.beforeEach(async ({ page }) => {
    await loginFixtureUser(page, fixtureUser(MUTABLE_FIXTURE, 'pm'))
    const token = await page.evaluate(() => localStorage.getItem('token'))
    auth = { Authorization: `Bearer ${token}` }
    api = `${E2E_CONFIG.apiURL}/api/v1/programs/${MUTABLE_FIXTURE}`

    const structure = await apiGet(page, `/programs/${MUTABLE_FIXTURE}/structure`)
    levels = structure.body.data.definition.levels

    // Every case below needs a clean draft to work from.
    await page.request.post(`${api}/structure/draft`, { headers: auth })
  })

  test.afterEach(async ({ page }) => {
    // Discard the whole draft so the next case re-clones from the ACTIVE
    // structure. Emptying it instead would leave the next case editing a
    // levelless draft.
    await page.request.delete(`${api}/structure/draft`, { headers: auth })
  })

  test('the cycle is active and the hierarchy is populated', async ({ page }) => {
    const cycles = await apiGet(page, `/programs/${MUTABLE_FIXTURE}/cycles`)
    expect(cycles.body.data.some((c: any) => c.status === 'active')).toBe(true)

    const impact = await (await page.request.get(`${api}/structure/draft/impact`, { headers: auth })).json()
    expect(impact.data.affected.nodes).toBeGreaterThan(0)
    expect(impact.data.affected.active_cycles).toBeGreaterThan(0)
  })

  test('removing a populated level is refused', async ({ page }) => {
    const draft = await apiGet(page, `/programs/${MUTABLE_FIXTURE}/structure/draft`)
    const deepest = draft.body.data.levels.at(-1)

    await page.request.delete(`${api}/structure/draft/levels/${deepest.id}`, { headers: auth })

    const impact = await (await page.request.get(`${api}/structure/draft/impact`, { headers: auth })).json()
    expect(impact.data.classification).toBe('not_allowed')
    expect(impact.data.blocking).toBe(true)

    // Even explicit acknowledgement cannot force a blocked change.
    const forced = await page.request.post(`${api}/structure/draft/activate`, {
      headers: auth, data: { acknowledge_migration: true },
    })
    expect(forced.status()).toBe(422)
  })

  test('reordering a populated hierarchy is refused', async ({ page }) => {
    const draft = await apiGet(page, `/programs/${MUTABLE_FIXTURE}/structure/draft`)
    const second = draft.body.data.levels[1]

    const moved = await page.request.post(`${api}/structure/draft/levels/${second.id}/move`, {
      headers: auth, data: { direction: 'up' },
    })
    expect(moved.status()).toBe(200)

    const impact = await (await page.request.get(`${api}/structure/draft/impact`, { headers: auth })).json()
    expect(impact.data.classification).toBe('not_allowed')

    const forced = await page.request.post(`${api}/structure/draft/activate`, {
      headers: auth, data: { acknowledge_migration: true },
    })
    expect(forced.status()).toBe(422)
  })

  test('inserting a level mid-cycle requires explicit acknowledgement', async ({ page }) => {
    const added = await page.request.post(`${api}/structure/draft/levels`, {
      headers: auth,
      data: { key: `inserted_${Date.now()}`, name_ar: 'مضاف', name_en: 'Inserted', is_assessable: true },
    })
    expect(added.status()).toBe(201)

    const impact = await (await page.request.get(`${api}/structure/draft/impact`, { headers: auth })).json()
    expect(impact.data.classification).toBe('requires_migration')
    expect(impact.data.blocking).toBe(false)

    // Refused without acknowledgement…
    const unacknowledged = await page.request.post(`${api}/structure/draft/activate`, { headers: auth, data: {} })
    expect(unacknowledged.status()).toBe(422)
  })

  test('disabling the assignable, assessable or evidence level is refused as invalid', async ({ page }) => {
    const draft = await apiGet(page, `/programs/${MUTABLE_FIXTURE}/structure/draft`)

    // The deepest level carries all three semantics in these fixtures.
    const leaf = draft.body.data.levels.at(-1)
    expect(leaf.is_assignable || leaf.is_assessable || leaf.accepts_evidence).toBe(true)

    const disabled = await page.request.put(`${api}/structure/draft/levels/${leaf.id}`, {
      headers: auth, data: { is_active: false },
    })
    expect(disabled.status()).toBe(200)

    // A structure with nothing assessable cannot activate: no requirement
    // could ever enter a workflow.
    const refreshed = await apiGet(page, `/programs/${MUTABLE_FIXTURE}/structure/draft`)
    expect(refreshed.body.data.validation_errors.length).toBeGreaterThan(0)

    const activated = await page.request.post(`${api}/structure/draft/activate`, {
      headers: auth, data: { acknowledge_migration: true },
    })
    expect(activated.status()).toBe(422)
  })

  test('display-only changes remain possible mid-cycle', async ({ page }) => {
    const draft = await apiGet(page, `/programs/${MUTABLE_FIXTURE}/structure/draft`)
    const first = draft.body.data.levels[0]

    const renamed = await page.request.put(`${api}/structure/draft/levels/${first.id}`, {
      headers: auth,
      data: { name_ar: 'تسمية محدثة', name_en: 'Updated label', appears_in_reports: true },
    })
    expect(renamed.status()).toBe(200)

    const impact = await (await page.request.get(`${api}/structure/draft/impact`, { headers: auth })).json()
    // Renaming touches no structure, so it is never blocking.
    expect(impact.data.blocking).toBe(false)
    expect(impact.data.changes.levels_added).toHaveLength(0)
    expect(impact.data.changes.levels_removed).toHaveLength(0)
  })
})
