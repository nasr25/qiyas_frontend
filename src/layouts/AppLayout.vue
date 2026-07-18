<template>
  <div class="min-h-screen bg-surface-muted">

    <!-- Sidebar backdrop (mobile only) -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
        @click="appStore.toggleSidebar()"
        aria-hidden="true"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed top-0 bottom-0 z-30 flex flex-col w-64 bg-primary-900 dark:bg-primary-950 border-e border-white/10 transition-transform duration-300 lg:translate-x-0"
      :class="[
        appStore.isRTL ? 'right-0' : 'left-0',
        sidebarOpen ? 'translate-x-0' : (appStore.isRTL ? 'translate-x-full' : '-translate-x-full')
      ]"
      aria-label="Sidebar"
    >
      <!-- Logo / current program indicator -->
      <div class="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-white/10">
        <div class="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
          <img v-if="appStore.branding.logo_url" :src="appStore.branding.logo_url" class="h-full w-full object-contain" alt="logo" />
          <svg v-else class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-white truncate">
            {{ currentProgramCode ? (programsStore.currentProgram?.name || currentProgramCode) : (appStore.branding.platform_name || t('app.name')) }}
          </p>
          <p class="text-xs text-primary-200/80 truncate">{{ t('app.tagline') }}</p>
        </div>
      </div>

      <!-- Switch Program -->
      <div v-if="currentProgramCode" class="px-3 pt-3">
        <RouterLink
          :to="{ name: 'programs' }"
          class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-primary-100 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {{ t('programs.switchProgram') }}
        </RouterLink>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <template v-for="item in navItems" :key="item.name">
          <RouterLink
            v-if="canSee(item)"
            :to="item.to"
            class="nav-link group"
            :class="{ active: isActive(item.to) }"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :data-testid="`nav-${item.name}`"
            @click="closeMobileSidebar"
          >
            <span class="text-lg leading-none" v-html="item.icon" />
            <span>{{ t(item.label) }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- User info -->
      <div class="border-t border-white/10 px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-white truncate">{{ authStore.user?.name }}</p>
            <p class="text-xs text-primary-200/80 truncate capitalize">{{ userRoleLabel }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex flex-col min-h-screen lg:ms-64">
      <!-- Header -->
      <header class="sticky top-0 z-10 h-16 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 bg-surface-raised border-b border-line shadow-sm">
        <!-- Hamburger (mobile only — sidebar is permanent on lg+) -->
        <button
          class="btn-icon lg:hidden"
          @click="appStore.toggleSidebar()"
          aria-label="Toggle sidebar"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- Page title -->
        <h1 class="text-sm sm:text-base font-semibold text-content truncate flex-1">
          {{ pageTitle }}
        </h1>

        <!-- Actions -->
        <div class="flex items-center gap-0.5 sm:gap-1">
          <!-- Notifications -->
          <RouterLink to="/notifications" class="btn-icon relative" aria-label="Notifications" data-testid="notification-center">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span
              v-if="notifStore.unreadCount > 0"
              class="absolute top-1 end-1 min-w-[18px] h-[18px] flex items-center justify-center bg-danger-500 text-white text-xs font-bold rounded-full px-1"
              data-testid="notification-unread-count"
            >
              {{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}
            </span>
          </RouterLink>

          <!-- Language switcher -->
          <button
            class="btn-icon text-xs font-semibold"
            @click="toggleLocale"
            :aria-label="appStore.isRTL ? 'Switch to English' : 'التبديل إلى العربية'"
          >
            {{ appStore.isRTL ? 'EN' : 'ع' }}
          </button>

          <!-- Dark mode -->
          <button
            class="btn-icon"
            @click="appStore.toggleTheme()"
            :aria-label="appStore.isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          >
            <svg v-if="appStore.isDark" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          <!-- Avatar + logout -->
          <div class="relative" ref="userMenuRef">
            <button
              class="flex items-center gap-2 ps-1.5 pe-2 sm:pe-3 py-1.5 rounded-lg hover:bg-surface-inset transition-colors"
              @click="userMenuOpen = !userMenuOpen"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
            >
              <div class="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-brand-contrast font-semibold text-sm shrink-0">
                {{ userInitials }}
              </div>
              <span class="hidden sm:block text-sm font-medium text-content max-w-[120px] truncate">
                {{ authStore.user?.name }}
              </span>
            </button>

            <!-- Dropdown -->
            <Transition name="dropdown">
              <div
                v-if="userMenuOpen"
                class="absolute top-full mt-1 end-0 w-48 card shadow-xl z-50 py-1"
                role="menu"
              >
                <RouterLink to="/profile" class="flex items-center gap-2 px-4 py-2 text-sm text-content hover:bg-surface-inset" @click="userMenuOpen = false">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {{ t('nav.profile') }}
                </RouterLink>
                <hr class="my-1 border-line">
                <button
                  class="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-950/40"
                  @click="handleLogout"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {{ t('nav.logout') }}
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-4 sm:p-6 3xl:p-8">
        <div class="mx-auto w-full max-w-content">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useProgramsStore } from '@/stores/programs'
import { canAccessInProgram } from '@/utils/roleAccess'

const { t, locale } = useI18n()
const router    = useRouter()
const route     = useRoute()
const appStore  = useAppStore()
const authStore = useAuthStore()
const notifStore = useNotificationsStore()
const programsStore = useProgramsStore()

// The current program context, derived from the :programCode route param.
// Kept loaded so the sidebar/header can show its name — see the watcher below.
const currentProgramCode = computed(() => route.params.programCode || null)

// Refetch on program-code change AND on language switch, since the API
// response embeds locale-resolved name/description fields server-side.
watch([currentProgramCode, locale], ([code]) => {
  if (code) {
    programsStore.fetchCurrentProgram(code).catch(() => {})
  } else {
    programsStore.clearCurrentProgram()
  }
}, { immediate: true })

const sidebarOpen  = computed(() => appStore.sidebarOpen)
const userMenuOpen = ref(false)
const userMenuRef  = ref(null)

// Close the mobile drawer after navigating (no-op on lg+ where it stays closed).
function closeMobileSidebar() {
  if (appStore.sidebarOpen) appStore.toggleSidebar()
}

// Nav items are program-aware: inside a program context they point at that
// program's pages (/programs/:programCode/...); outside one, they show the
// platform-level pages. `roles: []` = visible to everyone.
function programNavItems(code) {
  const base = `/programs/${code}`
  return [
    { name: 'dashboard',       to: `${base}/dashboard`,          label: 'nav.dashboard',      icon: '🏠', roles: [] },
    { name: 'my-requirements', to: `${base}/my-requirements`,    label: 'nav.myRequirements', icon: '📂', roles: ['employee', 'coordinator'] },
    { name: 'assignments',     to: `${base}/assignments`,        label: 'nav.assignments',    icon: '📌', roles: ['super-admin', 'qiyas-admin'] },
    { name: 'cycles',          to: `${base}/cycles`,             label: 'nav.cycles',         icon: '🔄', roles: ['super-admin', 'qiyas-admin'] },
    { name: 'requirements',    to: `${base}/requirements`,       label: 'nav.standards',      icon: '📋', roles: ['super-admin', 'qiyas-admin'] },
    { name: 'hierarchy',       to: `${base}/hierarchy`,          label: 'nav.hierarchy',      icon: '🌳', roles: ['super-admin', 'qiyas-admin'] },
    { name: 'review-department-manager', to: `${base}/reviews/department-manager`, label: 'nav.departmentManagerReview', icon: '✅', roles: ['coordinator', 'super-admin'] },
    { name: 'review-auditor', to: `${base}/reviews/auditor`,     label: 'nav.pendingReviews', icon: '🔍', roles: ['super-admin', 'auditor'] },
    { name: 'review-program-manager', to: `${base}/reviews/program-manager`, label: 'nav.programManagerReview', icon: '🏁', roles: ['super-admin', 'qiyas-admin'] },
    { name: 'auditor-extensions', to: `${base}/auditor/extensions`, label: 'nav.extensions',  icon: '⏳', roles: ['super-admin', 'auditor'] },
    { name: 'extension-queue', to: `${base}/extension-requests`, label: 'workflow.extensionQueue', icon: '📆', roles: ['super-admin', 'auditor'] },
    { name: 'requirements-import', to: `${base}/requirements-import`, label: 'nav.requirementsImport', icon: '📥', roles: ['super-admin', 'qiyas-admin'] },
    { name: 'sla-settings',    to: `${base}/sla-settings`,       label: 'nav.slaSettings',    icon: '⏱️', roles: ['super-admin', 'qiyas-admin'] },
    { name: 'reports',         to: `${base}/reports`,            label: 'nav.reports',        icon: '📊', roles: ['super-admin', 'qiyas-admin', 'auditor', 'executive'] },
  ]
}

const platformNavItems = [
  { name: 'programs',      to: '/programs',           label: 'nav.programs',       icon: '🗂️', roles: [] },
  { name: 'executive-dashboard', to: '/executive-dashboard', label: 'nav.executiveDashboard', icon: '📈', roles: ['super-admin', 'executive'] },
  { name: 'departments',   to: '/departments',        label: 'nav.departments',    icon: '🏢', roles: ['super-admin', 'qiyas-admin'] },
  { name: 'notifications', to: '/notifications',      label: 'nav.notifications',  icon: '🔔', roles: ['employee', 'coordinator'] },
  { name: 'auditLogs',     to: '/admin/audit-logs',   label: 'nav.auditLogs',      icon: '📝', roles: ['super-admin', 'auditor'] },
  { name: 'users',         to: '/admin/users',        label: 'nav.users',          icon: '👥', roles: ['super-admin'] },
  { name: 'settings',      to: '/admin/settings',     label: 'nav.settings',       icon: '⚙️', roles: ['super-admin'] },
  { name: 'email-logs',    to: '/admin/email-logs',   label: 'nav.emailLogs',      icon: '✉️', roles: ['super-admin'] },
]

const navItems = computed(() =>
  currentProgramCode.value ? programNavItems(currentProgramCode.value) : platformNavItems
)

function canSee(item) {
  return canAccessInProgram(authStore, currentProgramCode.value, item.roles)
}

function isActive(path) {
  return route.path.startsWith(path)
}

const userInitials = computed(() => {
  const name = authStore.user?.name || ''
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
})

const userRoleLabel = computed(() => {
  const roles = authStore.user?.roles || []
  return roles.map(r => r.replace('-', ' ')).join(', ')
})

const pageTitle = computed(() => {
  const name = route.name
  const map = {
    programs:                  'programs.title',
    'executive-dashboard':     'nav.executiveDashboard',
    'program-dashboard':       'nav.dashboard',
    'program-cycles':          'nav.cycles',
    'program-cycle-detail':    'nav.cycles',
    departments:               'nav.departments',
    'program-requirements':        'nav.standards',
    'program-requirement-detail':  'nav.standards',
    'program-documents':       'nav.documents',
    'program-document-detail': 'nav.documents',
    'program-auditor':         'nav.auditor',
    'program-auditor-extensions': 'nav.auditor',
    'program-reports':         'nav.reports',
    'admin-users':    'nav.users',
    'admin-settings': 'nav.settings',
    'audit-logs':     'nav.auditLogs',
    profile:          'nav.profile',
    notifications:    'nav.notifications',
    'program-my-standards': 'nav.myStandards',
    'program-my-requirements': 'nav.myRequirements',
    'program-my-requirement-detail': 'nav.myRequirements',
    'program-review-queue': 'nav.pendingReviews',
    'program-review-detail': 'nav.pendingReviews',
    'program-assignments': 'nav.assignments',
    'program-sla-settings': 'nav.slaSettings',
    'program-requirements-import': 'nav.requirementsImport',
    'email-logs':     'nav.emailLogs',
  }
  const base = map[name] ? t(map[name]) : t('app.name')
  return currentProgramCode.value && programsStore.currentProgram
    ? `${programsStore.currentProgram.name} · ${base}`
    : base
})

function toggleLocale() {
  const next = appStore.isRTL ? 'en' : 'ar'
  appStore.setLocale(next)
  locale.value = next
}

async function handleLogout() {
  userMenuOpen.value = false
  await authStore.logout()
  router.push({ name: 'login' })
}

function handleClickOutside(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  notifStore.startPolling()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  notifStore.stopPolling()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
