import { Page, expect } from '@playwright/test'
import { E2E_CONFIG } from './env'

/**
 * Every program the browser lifecycle runs against.
 *
 * Four production programs at three different depths, plus the three depth
 * fixtures. One spec body covers all of them: if any program needed special
 * handling, that spec would fail rather than quietly pass. This replaces
 * four near-identical per-program lifecycle files (audit finding M3).
 */
export const LIFECYCLE_PROGRAMS = [
  { code: 'SUMOUD', depth: 3, users: { pm: 'sumoud_pm', auditor: 'sumoud_auditor', deptManager: 'sumoud_dept_a_manager', employee: 'sumoud_employee_a' } },
  { code: 'QIYAS', depth: 5, users: { pm: 'qiyas_admin', auditor: 'auditor_1', deptManager: 'it_manager', employee: 'it_employee_1' } },
  { code: 'ECC', depth: 5, users: { pm: 'ecc_pm', auditor: 'ecc_auditor', deptManager: 'ecc_dept_a_manager', employee: 'ecc_employee_a' } },
  { code: 'NDMO', depth: 6, users: { pm: 'ndmo_pm', auditor: 'ndmo_auditor', deptManager: 'ndmo_dept_a_manager', employee: 'ndmo_employee_a' } },
  { code: 'TEST3', depth: 3, users: { pm: 'test3_pm', auditor: 'test3_auditor', deptManager: 'test3_dept_manager', employee: 'test3_employee' } },
  { code: 'TEST5', depth: 5, users: { pm: 'test5_pm', auditor: 'test5_auditor', deptManager: 'test5_dept_manager', employee: 'test5_employee' } },
  { code: 'TEST7', depth: 7, users: { pm: 'test7_pm', auditor: 'test7_auditor', deptManager: 'test7_dept_manager', employee: 'test7_employee' } },
] as const

export type LifecycleProgram = (typeof LIFECYCLE_PROGRAMS)[number]

export async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  await page.getByTestId('login-username-input').fill(username)
  await page.getByTestId('login-password-input').fill(E2E_CONFIG.password)
  await page.getByTestId('login-submit-button').click()
  await page.waitForURL(/\/programs$/, { timeout: 20_000 })
}

/** Authenticated JSON call using the session's own token. */
export async function api(page: Page, path: string, init: { method?: string; body?: any } = {}): Promise<any> {
  return page.evaluate(async ({ apiURL, path, init }) => {
    const res = await fetch(`${apiURL}/api/v1${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  }, { apiURL: E2E_CONFIG.apiURL, path, init })
}

/**
 * Uploads one evidence file to a draft submission. The workflow refuses to
 * submit without at least one file, which is the behaviour under test — so
 * this goes through the real upload endpoint rather than around it.
 */
export async function uploadEvidence(page: Page, code: string, submissionId: number): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('token'))

  const response = await page.request.post(
    `${E2E_CONFIG.apiURL}/api/v1/programs/${code}/evidence-submissions/${submissionId}/files`,
    {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: 'evidence.pdf',
          mimeType: 'application/pdf',
          // A minimal but structurally valid PDF.
          buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'),
        },
      },
    },
  )
  expect(response.status(), await response.text()).toBe(201)
}

/**
 * The department a user belongs to. An assignment must land on the
 * EMPLOYEE's own department, or department scoping correctly hides it from
 * them — which is the behaviour under test elsewhere, not a bug here.
 */
export async function departmentOf(page: Page, username: string): Promise<number> {
  await login(page, username)
  const me = await api(page, '/auth/me')
  expect(me.status).toBe(200)

  const departmentId = me.body.data?.department_id ?? me.body.data?.department?.id
  expect(departmentId, `${username} must belong to a department`).toBeTruthy()

  return departmentId
}

/**
 * An assignable node with no active assignment, so a lifecycle run always
 * has something fresh to work on regardless of seeded state.
 */
export async function findFreeAssignableNode(page: Page, code: string): Promise<any> {
  const requirements = await api(page, `/programs/${code}/requirements?per_page=200`)
  expect(requirements.status, `requirements for ${code}`).toBe(200)

  const assignments = await api(page, `/programs/${code}/assignments?per_page=200`)
  const taken = new Set((assignments.body?.data ?? [])
    .filter((a: any) => a.status === 'active')
    .map((a: any) => a.requirement?.id))

  // The journey submits evidence, so prefer a node that accepts it: a level
  // may legitimately be assignable WITHOUT being evidence-bearing (a
  // Criterion groups the Application Requirements that carry the files).
  const free = (requirements.body.data ?? [])
    .find((r: any) => r.is_assignable && r.accepts_evidence && !taken.has(r.id))
  if (free) {
    return free
  }

  // Nothing free (earlier runs consumed the seeded nodes), so author one.
  // This keeps the spec self-sufficient AND exercises node creation through
  // the same generic endpoint the authoring screen uses.
  return createAssignableNode(page, code)
}

/**
 * Creates a fresh node at the program's assignable level, under an existing
 * parent. Uses only the generic hierarchy endpoint — no program-specific
 * path — so it works at any depth.
 */
export async function createAssignableNode(page: Page, code: string): Promise<any> {
  const structure = await api(page, `/programs/${code}/structure`)
  const levels = structure.body.data.definition.levels.filter((l: any) => l.is_active)

  // Same preference as above when authoring a fresh node.
  let assignableIndex = levels.findIndex((l: any) => l.is_assignable && l.accepts_evidence)
  if (assignableIndex === -1) {
    assignableIndex = levels.findIndex((l: any) => l.is_assignable)
  }
  expect(assignableIndex, `${code} must configure an assignable level`).toBeGreaterThan(-1)

  const assignable = levels[assignableIndex]
  const parentLevel = levels[assignableIndex - 1] ?? null

  const cycle = (await api(page, `/programs/${code}/cycles`)).body.data[0]

  let parentId: number | null = null
  if (parentLevel) {
    // Any existing node at the parent level will do as the anchor.
    const search = await api(page, `/programs/${code}/hierarchy/search?q=${code}`)
    const parent = (search.body.data ?? []).find((n: any) => n.level_key === parentLevel.key)
    expect(parent, `${code} must have a node at level ${parentLevel.key}`).toBeTruthy()
    parentId = parent.id
  }

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  const created = await api(page, `/programs/${code}/hierarchy`, {
    method: 'POST',
    body: {
      node_type: assignable.key,
      code: `E2E-${suffix}`,
      name_ar: `عنصر اختبار ${suffix}`,
      name_en: `E2E node ${suffix}`,
      parent_id: parentId,
      cycle_id: cycle.id,
    },
  })
  expect(created.status, JSON.stringify(created.body)).toBe(201)

  // Re-read the single node so the caller gets the same shape (path,
  // is_assignable) as a seeded one. Scanning the paginated list missed it
  // once a program grew past one page.
  const node = await api(page, `/programs/${code}/requirements/${created.body.data.id}`)
  expect(node.status, 'the newly created node must be readable as a requirement').toBe(200)

  return node.body.data
}
