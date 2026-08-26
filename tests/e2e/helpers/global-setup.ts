import { E2E_CONFIG } from './env'

/**
 * Playwright global setup — runs once before any test file. Fails the
 * entire run immediately if the backend isn't reachable, rather than
 * letting every individual test fail with a confusing connection error.
 */
export default async function globalSetup(): Promise<void> {
  const healthUrl = `${E2E_CONFIG.apiURL}/up`

  let response: Response
  try {
    response = await fetch(healthUrl)
  } catch (error) {
    throw new Error(
      `E2E preflight failed: could not reach the backend health check at ${healthUrl}. ` +
      `Start the isolated E2E backend first (see docs/playwright-e2e-guide.md). Original error: ${error}`
    )
  }

  if (!response.ok) {
    throw new Error(`E2E preflight failed: backend health check at ${healthUrl} returned HTTP ${response.status}.`)
  }

  // eslint-disable-next-line no-console
  console.log(`[e2e] Preflight passed — backend reachable at ${E2E_CONFIG.apiURL}, frontend target ${E2E_CONFIG.baseURL}, db hint "${E2E_CONFIG.dbNameHint}".`)
}
