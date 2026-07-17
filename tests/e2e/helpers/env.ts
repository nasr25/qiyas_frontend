/**
 * Mandatory safety preflight — see docs/playwright-e2e-guide.md. Every test
 * file imports E2E_CONFIG from here (never process.env directly), and the
 * check below runs at module-load time (before any test executes) so a
 * misconfigured run fails immediately rather than after touching data.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5175'
const apiURL = process.env.E2E_API_URL || 'http://localhost:8001'
const dbNameHint = process.env.E2E_DB_NAME_HINT || 'qiyas_e2e_db'

function assertSafeToRun(): void {
  if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run E2E tests: APP_ENV/NODE_ENV is production.')
  }

  const productionMarkers = ['qiyas.gov.sa', 'production', 'prod.']
  for (const marker of productionMarkers) {
    if (baseURL.includes(marker) || apiURL.includes(marker)) {
      throw new Error(`Refusing to run E2E tests: target URL "${baseURL}" looks like production (matched "${marker}").`)
    }
  }

  if (!baseURL.includes('localhost') && !baseURL.includes('127.0.0.1')) {
    throw new Error(`Refusing to run E2E tests: E2E_BASE_URL "${baseURL}" is not a recognized local/test host. Set E2E_ALLOW_REMOTE=1 to override for an explicitly provisioned remote test environment.`)
  }

  if (!dbNameHint.toLowerCase().includes('e2e') && !dbNameHint.toLowerCase().includes('test')) {
    throw new Error(`Refusing to run E2E tests: E2E_DB_NAME_HINT "${dbNameHint}" does not contain "e2e" or "test" — this must name an isolated test database, never the shared dev/production database.`)
  }
}

if (!process.env.E2E_ALLOW_REMOTE) {
  assertSafeToRun()
}

export const E2E_CONFIG = {
  baseURL,
  apiURL,
  dbNameHint,
  password: 'Password123!',
}
