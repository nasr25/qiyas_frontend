<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-content">{{ t('nav.profile') }}</h1>

    <!-- Profile card -->
    <div class="card p-6">
      <div class="flex items-start gap-5 flex-wrap">
        <!-- Avatar -->
        <div class="h-20 w-20 rounded-full bg-primary-700 flex items-center justify-center text-white font-bold text-2xl shrink-0">
          {{ userInitials }}
        </div>
        <!-- Info -->
        <div class="flex-1 min-w-0 space-y-1">
          <h2 class="text-lg font-bold text-content">{{ authStore.user?.name }}</h2>
          <p class="text-sm font-mono text-content-muted">@{{ authStore.user?.username }}</p>
          <p class="text-sm text-content-muted">{{ authStore.user?.email }}</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-for="role in (authStore.user?.roles || [])" :key="role" class="badge badge-under-review">{{ role }}</span>
          </div>
        </div>
      </div>

      <hr class="my-5 border-line" />

      <!-- Details grid -->
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-xs text-content-muted mb-0.5">{{ t('users.department') }}</dt>
          <dd class="font-medium text-content">{{ authStore.user?.department?.name_ar || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-content-muted mb-0.5">Auth Type</dt>
          <dd class="font-medium text-content">
            {{ authStore.user?.auth_type === 'ldap' ? t('users.authType.ldap') : t('users.authType.local') }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-content-muted mb-0.5">Last Login</dt>
          <dd class="font-medium text-content">{{ formatDate(authStore.user?.last_login_at) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-content-muted mb-0.5">{{ t('common.status') }}</dt>
          <dd>
            <span :class="authStore.user?.is_active ? 'badge-approved' : 'badge-rejected'">
              {{ authStore.user?.is_active ? t('common.active') : t('common.inactive') }}
            </span>
          </dd>
        </div>
      </dl>
    </div>

    <!-- Change Password (only for local auth) -->
    <div v-if="authStore.user?.auth_type !== 'ldap'" class="card p-6">
      <h2 class="text-sm font-semibold text-content mb-4">{{ t('auth.changePassword') }}</h2>

      <!-- Error/Success -->
      <div v-if="pwMsg" class="mb-4 rounded-lg px-4 py-3 text-sm" :class="pwError ? 'bg-danger-50 border border-danger-200 text-danger-700' : 'bg-success-50 border border-success-200 text-success-700'">
        {{ pwMsg }}
      </div>

      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <div>
          <label class="label">{{ t('auth.currentPassword') }}</label>
          <input v-model="pwForm.current_password" type="password" class="input" required autocomplete="current-password" />
        </div>
        <div>
          <label class="label">{{ t('auth.newPassword') }}</label>
          <input v-model="pwForm.password" type="password" class="input" required autocomplete="new-password" />
        </div>
        <div>
          <label class="label">{{ t('auth.confirmPassword') }}</label>
          <input v-model="pwForm.password_confirmation" type="password" class="input" required autocomplete="new-password" />
          <p v-if="mismatch" class="text-xs text-danger-500 mt-1">Passwords do not match</p>
        </div>
        <button type="submit" class="btn-primary btn-sm" :disabled="pwSaving || mismatch">
          <svg v-if="pwSaving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ t('auth.changePassword') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { authService } from '@/services/index'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore  = useAppStore()

const pwSaving = ref(false)
const pwMsg    = ref('')
const pwError  = ref(false)

const pwForm = ref({
  current_password: '',
  password: '',
  password_confirmation: '',
})

const userInitials = computed(() => {
  const name = authStore.user?.name || ''
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
})

const mismatch = computed(() =>
  pwForm.value.password_confirmation.length > 0 &&
  pwForm.value.password !== pwForm.value.password_confirmation
)

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

async function handleChangePassword() {
  if (mismatch.value) return
  pwSaving.value = true
  pwMsg.value = ''
  try {
    await authService.changePassword(pwForm.value)
    pwMsg.value  = t('auth.passwordChanged')
    pwError.value = false
    pwForm.value = { current_password: '', password: '', password_confirmation: '' }
  } catch (err) {
    pwMsg.value  = err?.response?.data?.message || t('common.error')
    pwError.value = true
  } finally {
    pwSaving.value = false
  }
}
</script>
