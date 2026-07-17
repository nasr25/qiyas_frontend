import { APIRequestContext, request } from '@playwright/test'
import { E2E_CONFIG } from './env'

/**
 * Direct backend API access for test setup and verification only — never
 * used to perform the workflow actions under test themselves (those go
 * through real UI interactions). See docs/playwright-e2e-guide.md.
 */
export async function apiLoginAs(username: string): Promise<{ context: APIRequestContext; token: string }> {
  const context = await request.newContext({ baseURL: E2E_CONFIG.apiURL })
  const response = await context.post('/api/v1/auth/quick-login', { data: { username } })
  if (!response.ok()) {
    throw new Error(`API quick-login failed for "${username}": ${response.status()} ${await response.text()}`)
  }
  const body = await response.json()
  const token = body.data.token as string

  return { context, token }
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}
