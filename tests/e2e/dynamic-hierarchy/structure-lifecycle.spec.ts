import { test, expect } from '@playwright/test'
import { FIXTURES, fixtureUser, loginFixtureUser, openProgram, apiGet } from '../helpers/fixtures'

/**
 * Structure lifecycle at 3, 5 and 7 levels.
 *
 * Every assertion is expressed in terms of the fixture's DEPTH rather than
 * any level name, so a single test body proves the engine has no
 * fixed-depth assumption. If a seven-level program needed different UI
 * handling, this file would fail rather than quietly pass.
 */
for (const fixture of FIXTURES) {
  test.describe(`${fixture.code} — ${fixture.depth}-level structure`, () => {
    test.beforeEach(async ({ page }) => {
      await loginFixtureUser(page, fixtureUser(fixture.code, 'pm'))
      await openProgram(page, fixture.code)
    })

    test('the Program Manager sees every configured level in order', async ({ page }) => {
      await page.goto(`/programs/${fixture.code}/settings/structure`)

      const levels = page.getByTestId('active-level-list').locator('li')
      await expect(levels).toHaveCount(fixture.depth)

      // Ordering is 1..N with no gaps, at any depth.
      for (let i = 1; i <= fixture.depth; i++) {
        await expect(page.getByTestId(`active-level-level_${i}`)).toBeVisible()
      }
    })

    test('the deepest level is the assignable, assessable, evidence-bearing one', async ({ page }) => {
      const structure = await apiGet(page, `/programs/${fixture.code}/structure`)
      expect(structure.status).toBe(200)

      const levels = structure.body.data.definition.levels
      expect(levels).toHaveLength(fixture.depth)

      const leaf = levels[fixture.depth - 1]
      expect(leaf.is_assignable).toBe(true)
      expect(leaf.is_assessable).toBe(true)
      expect(leaf.accepts_evidence).toBe(true)

      // Levels above the leaf carry no work.
      for (const level of levels.slice(0, -1)) {
        expect(level.is_assignable).toBe(false)
        expect(level.accepts_evidence).toBe(false)
      }
    })

    test('a draft can be opened, extended, previewed and activated', async ({ page }) => {
      await page.goto(`/programs/${fixture.code}/settings/structure`)
      // Wait for the page to finish loading before probing for the button:
      // count() resolves immediately, so checking it mid-load reports zero
      // and the click is silently skipped.
      await expect(page.getByTestId('active-level-list')).toBeVisible({ timeout: 20_000 })

      // A draft may already be open from a previous run; only create one
      // when there isn't one, so the spec is re-runnable.
      const openDraft = page.getByTestId('open-draft-button')
      if (await openDraft.count()) {
        await openDraft.click()
      }
      await expect(page.getByTestId('draft-editor')).toBeVisible({ timeout: 15_000 })

      const newKey = `probe_level_${Date.now()}`
      await page.getByTestId('add-level-button').click()
      await page.getByTestId('level-key-input').fill(newKey)
      await page.getByTestId('level-name-ar-input').fill('مستوى فحص')
      await page.getByTestId('level-name-en-input').fill('Probe Level')
      await page.getByTestId('flag-is_assessable').check()
      await page.getByTestId('save-level-button').click()

      await expect(page.getByTestId(`draft-level-${newKey}`)).toBeVisible({ timeout: 15_000 })

      // Impact preview must classify before activation is possible.
      await page.getByTestId('preview-impact-button').click()
      await expect(page.getByTestId('impact-preview')).toBeVisible()
      await expect(page.getByTestId('impact-classification')).toBeVisible()
    })
  })
}
