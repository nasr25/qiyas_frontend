/**
 * Vue Router — role-based navigation guards.
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboards/DashboardView.vue') },
        { path: 'cycles', name: 'cycles', component: () => import('@/views/cycles/CyclesView.vue') },
        { path: 'cycles/:id', name: 'cycle-detail', component: () => import('@/views/cycles/CycleDetailView.vue') },
        { path: 'departments', name: 'departments', component: () => import('@/views/departments/DepartmentsView.vue') },
        { path: 'standards', name: 'standards', component: () => import('@/views/standards/StandardsView.vue') },
        { path: 'standards/:id', name: 'standard-detail', component: () => import('@/views/standards/StandardDetailView.vue') },
        { path: 'documents', name: 'documents', component: () => import('@/views/documents/DocumentsView.vue') },
        { path: 'documents/:id', name: 'document-detail', component: () => import('@/views/documents/DocumentDetailView.vue') },
        { path: 'auditor', name: 'auditor', component: () => import('@/views/auditor/AuditorView.vue'), meta: { roles: ['auditor', 'super-admin'] } },
        { path: 'auditor/extensions', name: 'auditor-extensions', component: () => import('@/views/auditor/ExtensionsView.vue'), meta: { roles: ['auditor', 'super-admin'] } },
        { path: 'reports', name: 'reports', component: () => import('@/views/reports/ReportsView.vue'), meta: { roles: ['super-admin', 'auditor', 'executive'] } },
        { path: 'admin/users', name: 'admin-users', component: () => import('@/views/admin/UsersView.vue'), meta: { roles: ['super-admin'] } },
        { path: 'admin/settings', name: 'admin-settings', component: () => import('@/views/admin/SettingsView.vue'), meta: { roles: ['super-admin'] } },
        { path: 'admin/audit-logs', name: 'audit-logs', component: () => import('@/views/admin/AuditLogsView.vue'), meta: { roles: ['super-admin'] } },
        { path: 'profile', name: 'profile', component: () => import('@/views/profile/ProfileView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.token && !auth.user) await auth.fetchUser()

  if (to.meta.public) {
    if (auth.isAuthenticated) return { name: 'dashboard' }
    return true
  }

  if (to.meta.requiresAuth || to.matched.some(r => r.meta.requiresAuth)) {
    if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
    if (auth.mustChangePassword && to.name !== 'change-password') return { name: 'change-password' }
    const requiredRoles = to.meta.roles
    if (requiredRoles?.length && !requiredRoles.some(r => auth.hasRole(r))) return { name: 'dashboard' }
  }

  return true
})

export default router
