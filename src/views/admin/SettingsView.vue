<template>
  <div class="space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ t('settings.title') }}</h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 gap-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
          :class="activeTab === tab.key
            ? 'border-b-2 border-primary-700 text-primary-700 dark:text-primary-400 dark:border-primary-400'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Branding -->
      <div v-if="activeTab === 'branding'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('settings.branding') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Platform Name (AR)</label>
            <input v-model="settings.platform_name_ar" class="input" dir="rtl" />
          </div>
          <div>
            <label class="label">Platform Name (EN)</label>
            <input v-model="settings.platform_name_en" class="input" dir="ltr" />
          </div>
        </div>
        <!-- Logo upload -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Logo</label>
            <div class="flex items-center gap-4">
              <img v-if="settings.logo_url" :src="settings.logo_url" class="h-12 w-12 object-contain rounded border border-gray-200" />
              <div v-else class="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">Logo</div>
              <input type="file" accept="image/*" class="input text-xs" @change="e => uploadBranding('logo', e)" />
            </div>
          </div>
          <div>
            <label class="label">Favicon</label>
            <div class="flex items-center gap-4">
              <img v-if="settings.favicon_url" :src="settings.favicon_url" class="h-8 w-8 object-contain rounded border border-gray-200" />
              <div v-else class="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">Fav</div>
              <input type="file" accept="image/*" class="input text-xs" @change="e => uploadBranding('favicon', e)" />
            </div>
          </div>
        </div>
        <button class="btn-primary btn-sm" :disabled="saving" @click="saveTab">{{ saving ? t('common.loading') : t('settings.save') }}</button>
      </div>

      <!-- SMTP -->
      <div v-else-if="activeTab === 'smtp'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('settings.smtp') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">SMTP Host</label>
            <input v-model="settings.smtp_host" class="input" dir="ltr" />
          </div>
          <div>
            <label class="label">SMTP Port</label>
            <input v-model="settings.smtp_port" type="number" class="input" />
          </div>
          <div>
            <label class="label">SMTP Username</label>
            <input v-model="settings.smtp_username" class="input" dir="ltr" />
          </div>
          <div>
            <label class="label">SMTP Password</label>
            <input v-model="settings.smtp_password" type="password" class="input" />
          </div>
          <div>
            <label class="label">Encryption</label>
            <select v-model="settings.smtp_encryption" class="input">
              <option value="">None</option>
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
            </select>
          </div>
          <div>
            <label class="label">From Address</label>
            <input v-model="settings.smtp_from" type="email" class="input" dir="ltr" />
          </div>
        </div>
        <button class="btn-primary btn-sm" :disabled="saving" @click="saveTab">{{ saving ? t('common.loading') : t('settings.save') }}</button>
      </div>

      <!-- Upload -->
      <div v-else-if="activeTab === 'upload'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('settings.upload') }}</h2>
        <div>
          <label class="label">Max File Size (MB)</label>
          <input v-model="settings.max_file_size_mb" type="number" class="input w-32" />
        </div>
        <div>
          <label class="label">Allowed File Types</label>
          <div class="flex flex-wrap gap-3 mt-2">
            <label v-for="ext in fileTypes" :key="ext" class="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-primary-600"
                :value="ext"
                v-model="settings.allowed_file_types"
              />
              .{{ ext }}
            </label>
          </div>
        </div>
        <button class="btn-primary btn-sm" :disabled="saving" @click="saveTab">{{ saving ? t('common.loading') : t('settings.save') }}</button>
      </div>

      <!-- Notifications -->
      <div v-else-if="activeTab === 'notifications'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('settings.notifications') }}</h2>
        <div class="space-y-3">
          <div v-for="notif in notifToggles" :key="notif.key" class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ notif.label }}</p>
              <p class="text-xs text-gray-400">{{ notif.desc }}</p>
            </div>
            <button
              class="relative inline-flex h-5 w-9 rounded-full transition-colors"
              :class="settings[notif.key] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
              @click="settings[notif.key] = !settings[notif.key]"
            >
              <span class="inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform"
                :class="settings[notif.key] ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0.5 rtl:-translate-x-0.5'" />
            </button>
          </div>
        </div>
        <button class="btn-primary btn-sm" :disabled="saving" @click="saveTab">{{ saving ? t('common.loading') : t('settings.save') }}</button>
      </div>

      <!-- Localization -->
      <div v-else-if="activeTab === 'localization'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('settings.localization') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Default Locale</label>
            <select v-model="settings.default_locale" class="input">
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label class="label">Timezone</label>
            <select v-model="settings.timezone" class="input">
              <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label class="label">Date Format</label>
            <select v-model="settings.date_format" class="input">
              <option value="d/m/Y">DD/MM/YYYY</option>
              <option value="Y-m-d">YYYY-MM-DD</option>
              <option value="m/d/Y">MM/DD/YYYY</option>
            </select>
          </div>
        </div>
        <button class="btn-primary btn-sm" :disabled="saving" @click="saveTab">{{ saving ? t('common.loading') : t('settings.save') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminService } from '@/services/index'

const { t } = useI18n()
const appStore = useAppStore()

const loading   = ref(true)
const saving    = ref(false)
const activeTab = ref('branding')

const tabs = computed(() => [
  { key: 'branding',      label: t('settings.branding') },
  { key: 'smtp',          label: t('settings.smtp') },
  { key: 'upload',        label: t('settings.upload') },
  { key: 'notifications', label: t('settings.notifications') },
  { key: 'localization',  label: t('settings.localization') },
])

const fileTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip']

const notifToggles = [
  { key: 'notify_on_submit',   label: 'Notify on Submission',     desc: 'Notify auditors when a document is submitted' },
  { key: 'notify_on_approve',  label: 'Notify on Approval',       desc: 'Notify users when their document is approved' },
  { key: 'notify_on_reject',   label: 'Notify on Rejection',      desc: 'Notify users when their document is rejected' },
  { key: 'notify_on_deadline', label: 'Deadline Reminders',       desc: 'Send reminders before document deadlines' },
  { key: 'notify_on_extension',label: 'Extension Notifications',  desc: 'Notify on extension request decisions' },
]

const settings = reactive({
  platform_name_ar: '',
  platform_name_en: '',
  logo_url: '',
  favicon_url: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_encryption: 'tls',
  smtp_from: '',
  max_file_size_mb: 20,
  allowed_file_types: ['pdf', 'docx'],
  default_locale: 'ar',
  timezone: 'Asia/Riyadh',
  date_format: 'd/m/Y',
  notify_on_submit: true,
  notify_on_approve: true,
  notify_on_reject: true,
  notify_on_deadline: true,
  notify_on_extension: true,
})

async function loadSettings() {
  loading.value = true
  try {
    const data = await adminService.getSettings()
    Object.assign(settings, data)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function saveTab() {
  saving.value = true
  try {
    await adminService.updateSettings(settings)
    appStore.showToast(t('common.success'), 'success')
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

async function uploadBranding(type, event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    const form = new FormData()
    form.append('type', type)
    form.append('file', file)
    const res = await adminService.uploadBranding(form)
    if (type === 'logo') settings.logo_url = res.url
    else settings.favicon_url = res.url
    appStore.showToast(t('common.success'), 'success')
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

onMounted(loadSettings)
</script>
