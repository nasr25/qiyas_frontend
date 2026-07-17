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
            { path: 'requirements', name: 'program-requirements', component: () => import('@/views/standards/StandardsView.vue') },
            { path: 'requirements/:id', name: 'program-requirement-detail', component: () => import('@/views/standards/StandardDetailView.vue') },
            { path: 'documents', name: 'program-documents', component: () => import('@/views/documents/DocumentsView.vue') },
            { path: 'documents/:id', name: 'program-document-detail', component: () => import('@/views/documents/DocumentDetailView.vue') },
            { path: 'auditor', name: 'program-auditor', component: () => import('@/views/auditor/AuditorView.vue'), meta: { roles: ['auditor', 'super-admin'] } },
            { path: 'auditor/extensions', name: 'program-auditor-extensions', component: () => import('@/views/auditor/ExtensionsView.vue'), meta: { roles: ['auditor', 'super-admin'] } },
            { path: 'reports', name: 'program-reports', component: () => import('@/views/reports/ReportsView.vue'), meta: { roles: ['super-admin', 'auditor', 'executive'] } },
            { path: 'my-standards', name: 'program-my-standards', component: () => import('@/views/employee/MyDepartmentStandardsView.vue'), meta: { roles: ['employee', 'coordinator', 'super-admin'] } },
          ],
        },

        // ── Legacy flat routes (deprecated — redirect into the QIYAS program) ──
        { path: 'dashboard', redirect: { name: 'program-dashboard', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'cycles', redirect: { name: 'program-cycles', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'cycles/:id', redirect: to => ({ name: 'program-cycle-detail', params: { programCode: DEFAULT_PROGRAM_CODE, id: to.params.id } }) },
        { path: 'standards', redirect: { name: 'program-requirements', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'standards/:id', redirect: to => ({ name: 'program-requirement-detail', params: { programCode: DEFAULT_PROGRAM_CODE, id: to.params.id } }) },
        { path: 'documents', redirect: { name: 'program-documents', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'documents/:id', redirect: to => ({ name: 'program-document-detail', params: { programCode: DEFAULT_PROGRAM_CODE, id: to.params.id } }) },
        { path: 'auditor', redirect: { name: 'program-auditor', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'auditor/extensions', redirect: { name: 'program-auditor-extensions', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'reports', redirect: { name: 'program-reports', params: { programCode: DEFAULT_PROGRAM_CODE } } },
        { path: 'my-standards', redirect: { name: 'program-my-standards', params: { programCode: DEFAULT_PROGRAM_CODE } } },
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
    if (requiredRoles?.length && !requiredRoles.some(r => auth.hasRole(r))) return { name: 'programs' }
  }

  return true
})

export default router
