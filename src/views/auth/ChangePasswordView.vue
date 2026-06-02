<template>
  <div class="min-h-screen flex items-center justify-center bg-primary-900 px-4 py-12">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-4">
          <svg class="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">{{ t('app.name') }}</h1>
      </div>

      <div class="card p-8 shadow-2xl">
        <h2 class="text-xl font-semibold text-content mb-2">
          {{ t('auth.changePassword') }}
        </h2>
        <p class="text-sm text-content-muted mb-6">
          {{ t('auth.mustChangePassword') }}
        </p>

        <!-- Error -->
        <div
          v-if="error"
          class="mb-4 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 text-sm"
        >
          {{ error }}
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="label">{{ t('auth.currentPassword') }}</label>
            <input
              v-model="form.current_password"
              type="password"
              class="input"
              required
              autocomplete="current-password"
            />
          </div>

          <div>
            <label class="label">{{ t('auth.newPassword') }}</label>
            <input
              v-model="form.password"
              type="password"
              class="input"
              required
              autocomplete="new-password"
            />
          </div>

          <div>
            <label class="label">{{ t('auth.confirmPassword') }}</label>
            <input
              v-model="form.password_confirmation"
              type="password"
              class="input"
              required
              autocomplete="new-password"
            />
            <p v-if="passwordMismatch" class="text-xs text-danger-500 mt-1">
              {{ t('auth.passwordMismatch', 'Passwords do not match') }}
            </p>
          </div>

          <button type="submit" class="btn-primary w-full mt-2" :disabled="loading || passwordMismatch">
            <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ t('auth.changePassword') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { authService } from '@/services/index'

const { t } = useI18n()
const router    = useRouter()
const authStore = useAuthStore()
const appStore  = useAppStore()

const form = ref({
  current_password: '',
  password: '',
  password_confirmation: '',
})
const loading = ref(false)
const error   = ref('')

const passwordMismatch = computed(() =>
  form.value.password_confirmation.length > 0 &&
  form.value.password !== form.value.password_confirmation
)

async function handleSubmit() {
  if (passwordMismatch.value) return
  error.value = ''
  loading.value = true
  try {
    await authService.changePassword(
      form.value.current_password,
      form.value.password,
      form.value.password_confirmation,
    )
    // Refresh user so must_change_password = false
    await authStore.fetchUser()
    appStore.showToast(t('auth.passwordChanged'), 'success')
    router.push({ name: 'dashboard' })
  } catch (err) {
    error.value = err?.response?.data?.message || t('common.error')
  } finally {
    loading.value = false
  }
}
</script>
