/**
 * Route/nav `meta.roles`/`item.roles` entries were written using the
 * platform-wide spatie role names Qiyas historically shipped with
 * ('qiyas-admin', 'coordinator', ...). Those names happen to equal Qiyas's
 * program-scoped role_key 1:1 for 'auditor' and 'employee', but diverge for
 * Program Manager ('qiyas-admin' vs. 'program-manager') and Department
 * Manager ('coordinator' vs. 'department-manager'). This map translates a
 * role-list entry to the generic program_roles role_key so the SAME
 * `roles: [...]` list gates access correctly for a second program (e.g.
 * Sumoud) whose users have no matching platform-wide spatie role at all —
 * only a program_roles entry. See docs/cross-program-role-resolution.md.
 */
const SPATIE_ROLE_TO_PROGRAM_ROLE_KEY = {
  'qiyas-admin': 'program-manager',
  auditor: 'auditor',
  coordinator: 'department-manager',
  employee: 'employee',
}

/**
 * Returns true if the user satisfies `requiredRoles` either through a
 * platform-wide spatie role (`authStore.hasRole`) or, when `programCode` is
 * known, through the equivalent program-scoped role
 * (`authStore.hasProgramRole`). Never authorizes on the global role name
 * alone when a program context is present and only a program-scoped grant
 * exists.
 */
export function canAccessInProgram(authStore, programCode, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true
  if (requiredRoles.some(r => authStore.hasRole(r))) return true
  if (!programCode) return false

  return requiredRoles.some(r => {
    const programRoleKey = SPATIE_ROLE_TO_PROGRAM_ROLE_KEY[r] ?? r
    return authStore.hasProgramRole(programCode, programRoleKey)
  })
}
