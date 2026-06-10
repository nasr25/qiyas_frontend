<template>
  <div class="min-h-screen flex items-center justify-center bg-primary-900 px-4 py-12">
    <!-- Background pattern -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -start-40 h-80 w-80 rounded-full bg-primary-800/40 blur-3xl" />
      <div class="absolute -bottom-40 -end-40 h-80 w-80 rounded-full bg-secondary-900/30 blur-3xl" />
    </div>

    <div class="relative w-full max-w-md">
      <!-- Logo & Platform name -->
      <div class="text-center mb-8">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-4 overflow-hidden">
          <img v-if="appStore.branding.logo_url" :src="appStore.branding.logo_url" class="h-full w-full object-contain" alt="logo" />
          <svg v-else class="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">{{ appStore.branding.platform_name || t('app.name') }}</h1>
        <p class="text-primary-200/80 text-sm mt-1">{{ t('app.tagline') }}</p>
      </div>

      <!-- Card -->
      <div class="card p-6 sm:p-8 shadow-2xl">
        <h2 class="text-xl font-semibold text-content mb-6">
          {{ t('auth.login') }}
        </h2>

        <!-- Error -->
        <div
          v-if="error"
          class="mb-4 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 text-sm dark:bg-danger-950/40 dark:border-danger-900 dark:text-danger-300"
        >
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="label" for="username">{{ t('auth.username') }}</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              class="input"
              autocomplete="username"
              :placeholder="t('auth.username')"
              required
              :disabled="loading"
            />
          </div>

          <div>
            <label class="label" for="password">{{ t('auth.password') }}</label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="input pe-10"
                autocomplete="current-password"
                :placeholder="t('auth.password')"
                required
                :disabled="loading"
              />
              <button
                type="button"
                class="absolute inset-y-0 end-3 flex items-center text-content-subtle hover:text-content"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <svg v-if="showPassword" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="btn-primary w-full mt-2"
            :disabled="loading"
          >
            <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ loading ? t('auth.loginLoading') : t('auth.loginButton') }}
          </button>
        </form>
      </div>

      <!-- Dev-only quick login -->
      <div v-if="appStore.branding.quick_login" class="card p-4 mt-4 border-dashed">
        <p class="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3 flex items-center gap-2">
          <span class="badge badge-under-review">DEV</span> {{ t('auth.quickLogin') }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="acc in quickAccounts"
            :key="acc.username"
            type="button"
            class="btn-secondary btn-sm justify-start"
            :disabled="quickLoading"
            @click="handleQuickLogin(acc.username)"
          >
            <span class="text-base leading-none">{{ acc.icon }}</span>
            <span class="truncate">{{ acc.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()
const appStore  = useAppStore()

const form = ref({ username: '', password: '' })
const loading      = ref(false)
const error        = ref('')
const showPassword = ref(false)
const quickLoading = ref(false)

const quickAccounts = [
  { username: 'superadmin',  label: 'Super Admin', icon: '🛡️' },
  { username: 'auditor',     label: 'Auditor',     icon: '🔍' },
  { username: 'coordinator', label: 'Coordinator', icon: '🧭' },
  { username: 'employee',    label: 'Employee',    icon: '👤' },
  { username: 'executive',   label: 'Executive',   icon: '📊' },
]

async function handleQuickLogin(username) {
  error.value = ''
  quickLoading.value = true
  try {
    await authStore.quickLogin(username)
    const redirect = route.query.redirect
    router.push(redirect ? String(redirect) : { name: 'dashboard' })
  } catch (err) {
    error.value = err?.response?.data?.message || t('auth.loginFailed')
  } finally {
    quickLoading.value = false
  }
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(form.value.username, form.value.password)
    if (authStore.mustChangePassword) {
      router.push({ name: 'change-password' })
    } else {
      const redirect = route.query.redirect
      router.push(redirect ? String(redirect) : { name: 'dashboard' })
    }
  } catch (err) {
    error.value = err?.response?.data?.message || t('auth.loginFailed')
  } finally {
    loading.value = false
  }
}
</script>
