/**
 * Vue Router — role-based navigation guards, program-scoped routing.
 *
 * Program-scoped pages (dashboard/cycles/requirements/documents/auditor/
 * reports/my-standards) live under /programs/:programCode/... . The legacy
 * flat paths (/dashboard, /cycles, ...) are kept as redirects to the QIYAS
 * program for backward compatibility with any bookmarked/shared links, since
 * Qiyas is the only program that exists in Phase 1 — they are deprecated and
 * may be removed once nothing references them.
 *
 * The nested views themselves are unchanged: they still call the legacy flat
 * API endpoints (/cycles, /standards, ...), which continue to work exactly
 * as before because only one program's data exists. Wiring these views to
 * the new /api/v1/programs/{program}/... endpoints is deferred — see
 * docs/multi-program-architecture.md, "Deferred technical debt".
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canAccessInProgram } from '@/utils/roleAccess'

const DEFAULT_PROGRAM_CODE = 'QIYAS'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Auth
    { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true } },
    { path: '/change-password', name: 'change-password', component: () => import('@/views/auth/ChangePasswordView.vue'), meta: { requiresAuth: true } },

    // ── App Layout
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/programs' },

        // ── Platform-level pages ────────────────────────────────────────
        { path: 'programs', name: 'programs', component: () => import('@/views/programs/ProgramSelectionView.vue') },
        { path: 'executive-dashboard', name: 'executive-dashboard', component: () => import('@/views/executive/ExecutiveDashboardView.vue'), meta: { roles: ['super-admin', 'executive'] } },
        { path: 'departments', name: 'departments', component: () => import('@/views/departments/DepartmentsView.vue') },
        { path: 'admin/users', name: 'admin-users', component: () => import('@/views/admin/UsersView.vue'), meta: { roles: ['super-admin'] } },
        { path: 'admin/settings', name: 'admin-settings', component: () => import('@/views/admin/SettingsView.vue'), meta: { roles: ['super-admin'] } },
        { path: 'admin/audit-logs', name: 'audit-logs', component: () => import('@/views/admin/AuditLogsView.vue'), meta: { roles: ['super-admin', 'auditor'] } },
        { path: 'admin/email-logs', name: 'email-logs', component: () => import('@/views/admin/EmailLogsView.vue'), meta: { roles: ['super-admin'] } },
        { path: 'profile', name: 'profile', component: () => import('@/views/profile/ProfileView.vue') },
        { path: 'notifications', name: 'notifications', component: () => import('@/views/notifications/NotificationsView.vue') },

        // ── Program-level pages ─────────────────────────────────────────
        {
          path: 'programs/:programCode',
          children: [
            { path: '', redirect: to => ({ name: 'program-dashboard', params: to.params }) },
            { path: 'dashboard', name: 'program-dashboard', component: () => import('@/views/dashboards/DashboardView.vue') },
            { path: 'cycles', name: 'program-cycles', component: () => import('@/views/cycles/CyclesView.vue') },
            { path: 'cycles/:id', name: 'program-cycle-detail', component: () => import('@/views/cycles/CycleDetailView.vue') },
            { path: 'reports', name: 'program-reports', component: () => import('@/views/reports/ReportsView.vue'), meta: { roles: ['super-admin', 'qiyas-admin', 'auditor', 'executive'] } },

            // ── Phase 2: Qiyas operational workflow ─────────────────────
            { path: 'my-requirements', name: 'program-my-requirements', component: () => import('@/views/workflow/MyRequirementsView.vue'), meta: { roles: ['employee', 'coordinator', 'super-admin'] } },
            { path: 'my-requirements/:id', name: 'program-my-requirement-detail', component: () => import('@/views/workflow/MyRequirementDetailView.vue'), meta: { roles: ['employee', 'coordinator', 'super-admin'] } },
            { path: 'reviews/:stage', name: 'program-review-queue', component: () => import('@/views/workflow/ReviewQueueView.vue'), meta: { roles: ['super-admin', 'qiyas-admin', 'auditor', 'coordinator'] } },
            { path: 'reviews/:stage/:id', name: 'program-review-detail', component: () => import('@/views/workflow/ReviewDetailView.vue'), meta: { roles: ['super-admin', 'qiyas-admin', 'auditor', 'coordinator'] } },
            { path: 'assignments', name: 'program-assignments', component: () => import('@/views/workflow/RequirementAssignmentsView.vue'), meta: { roles: ['super-admin', 'qiyas-admin'] } },
            { path: 'extension-requests', name: 'program-extension-queue', component: () => import('@/views/workflow/AuditorExtensionQueueView.vue'), meta: { roles: ['super-admin', 'auditor'] } },
            { path: 'sla-settings', name: 'program-sla-settings', component: () => import('@/views/workflow/SlaSettingsView.vue'), meta: { roles: ['super-admin', 'qiyas-admin'] } },

            // ── Phase 6: generic arbitrary-depth hierarchy (used by ECC) ──
            { path: 'hierarchy', name: 'program-hierarchy', component: () => import('@/views/hierarchy/HierarchyExplorerView.vue'), meta: { roles: ['super-admin', 'qiyas-admin'] } },
            // Program Structure Settings. No role meta: the page is readable
            // by anyone with program access (it explains the structure their
            // screens use) and the backend refuses writes from anyone who is
            // not this program's Program Manager. Gating the route by the
            // legacy platform role would wrongly exclude a program-manager
            // who holds no platform role at all.
            // Hierarchy analytics: universal metrics, metadata-driven
            // drill-down, cascading filters and the dynamic report. Readable
            // by anyone with program access; every query is department- and
            // program-scoped server-side.
            { path: 'analytics', name: 'program-analytics', component: () => import('@/views/analytics/StructureAnalyticsView.vue') },
            { path: 'settings/structure', name: 'program-structure-settings', component: () => import('@/views/structure/ProgramStructureSettingsView.vue') },
          ],
        },

        // ── Legacy flat routes (deprecated — redirect into the QIYAS program) ──
        { path: 'dashboard', redirect: { name: 'program-dashboard', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'cycles', redirect: { name: 'program-cycles', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'cycles/:id', redirect: to => ({ name: 'program-cycle-detail', params: { programCode: DEFAULT_PROGRAM_CODE, id: to.params.id } }) },
        { path: 'reports', redirect: { name: 'program-reports', params: { programCode: DEFAULT_PROGRAM_CODE } } },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.token && !auth.user) await auth.fetchUser()

  if (to.meta.public) {
    if (auth.isAuthenticated) return { name: 'programs' }
    return true
  }

  if (to.meta.requiresAuth || to.matched.some(r => r.meta.requiresAuth)) {
    if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
    if (auth.mustChangePassword && to.name !== 'change-password') return { name: 'change-password' }
    const requiredRoles = to.meta.roles
    if (!canAccessInProgram(auth, to.params.programCode, requiredRoles)) return { name: 'programs' }
  }

  return true
})

export default router
