<template>
  <div class="space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-content">{{ t('settings.title') }}</h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex border-b border-line gap-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
          :class="activeTab === tab.key
            ? 'border-b-2 border-primary-700 text-primary-700 dark:text-primary-400 dark:border-primary-400'
            : 'text-content-muted hover:text-content'"
          :data-testid="`settings-tab-${tab.key}`"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Branding -->
      <div v-if="activeTab === 'branding'" class="space-y-4">
        <div class="card p-6 space-y-4">
          <h2 class="text-sm font-semibold text-content">{{ t('settings.branding') }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Platform Name (AR)</label>
              <input v-model="settings.platform_name_ar" class="input" dir="rtl" data-testid="branding-platform-name-ar" />
            </div>
            <div>
              <label class="label">Platform Name (EN)</label>
              <input v-model="settings.platform_name_en" class="input" dir="ltr" data-testid="branding-platform-name-en" />
            </div>
          </div>
          <button class="btn-primary btn-sm" :disabled="saving" @click="saveTab" data-testid="branding-save-names">{{ saving ? t('common.loading') : t('settings.save') }}</button>
        </div>

        <!-- One card per versioned logo/favicon asset type -->
        <div v-for="asset in ASSET_TYPES" :key="asset.type" class="card p-6 space-y-3" :data-testid="`branding-asset-${asset.type}`">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-content">{{ asset.labelEn }} <span class="text-content-subtle">/ {{ asset.labelAr }}</span></h3>
              <p class="text-xs text-content-subtle">{{ asset.descEn }}</p>
            </div>
            <button
              class="text-xs text-primary-700 dark:text-primary-400 hover:underline"
              :data-testid="`branding-history-toggle-${asset.type}`"
              @click="assetState[asset.type].showHistory = !assetState[asset.type].showHistory"
            >
              {{ assetState[asset.type].showHistory ? t('common.close') : t('settings.versionHistory') }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-4">
            <img
              v-if="activeVersion(asset.type)"
              :src="activeVersion(asset.type).url"
              class="h-12 w-12 object-contain rounded border border-line bg-surface-inset"
              :data-testid="`branding-preview-${asset.type}`"
              alt=""
            />
            <div v-else class="h-12 w-12 bg-surface-inset rounded border border-line flex items-center justify-center text-[10px] text-content-subtle">
              {{ t('common.none') }}
            </div>

            <input
              type="file"
              accept="image/png,image/jpeg,.ico,image/svg+xml"
              class="input text-xs max-w-xs"
              :data-testid="`branding-upload-${asset.type}`"
              :disabled="assetState[asset.type].uploading"
              @change="e => onSelectFile(asset.type, e)"
            />

            <span v-if="assetState[asset.type].error" class="text-xs text-danger-600" :data-testid="`branding-error-${asset.type}`">
              {{ assetState[asset.type].error }}
            </span>
          </div>

          <!-- Pending (uploaded, not yet active) draft — preview before save -->
          <div v-if="pendingVersion(asset.type)" class="flex items-center gap-3 rounded border border-warning-400 bg-warning-50 dark:bg-warning-950/30 p-3">
            <img :src="pendingVersion(asset.type).url" class="h-10 w-10 object-contain rounded border border-line bg-surface-inset" alt="" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-content">{{ t('settings.pendingVersion') }} (v{{ pendingVersion(asset.type).version }})</p>
              <p class="text-[11px] text-content-subtle truncate">{{ pendingVersion(asset.type).original_filename }}</p>
            </div>
            <button class="btn-primary btn-sm" :data-testid="`branding-activate-${asset.type}-${pendingVersion(asset.type).id}`" @click="activateAsset(asset.type, pendingVersion(asset.type).id)">
              {{ t('settings.save') }}
            </button>
            <button class="btn-secondary btn-sm" :data-testid="`branding-cancel-${asset.type}`" @click="cancelPending(asset.type)">
              {{ t('common.cancel') }}
            </button>
          </div>

          <!-- Version history -->
          <div v-if="assetState[asset.type].showHistory" class="space-y-1.5" :data-testid="`branding-history-${asset.type}`">
            <div
              v-for="v in assetState[asset.type].history"
              :key="v.id"
              class="flex items-center gap-3 text-xs py-1.5 border-b border-line last:border-0"
            >
              <img :src="v.url" class="h-7 w-7 object-contain rounded border border-line bg-surface-inset shrink-0" alt="" />
              <span class="w-14 shrink-0">v{{ v.version }}</span>
              <span
                class="px-1.5 py-0.5 rounded shrink-0"
                :class="{
                  'bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-400': v.status === 'active',
                  'bg-surface-inset text-content-subtle': v.status === 'inactive',
                  'bg-warning-100 text-warning-700 dark:bg-warning-950/40 dark:text-warning-400': v.status === 'superseded',
                }"
              >{{ v.status }}</span>
              <span class="flex-1 truncate text-content-subtle">{{ v.uploaded_by }} · {{ formatDate(v.uploaded_at) }}</span>
              <button
                v-if="v.status === 'superseded'"
                class="text-primary-700 dark:text-primary-400 hover:underline shrink-0"
                :data-testid="`branding-restore-${asset.type}-${v.id}`"
                @click="restoreAsset(asset.type, v.id)"
              >
                {{ t('settings.restore') }}
              </button>
            </div>
            <p v-if="!assetState[asset.type].history.length" class="text-xs text-content-subtle">{{ t('common.noData') }}</p>
          </div>
        </div>
      </div>

      <!-- SMTP -->
      <div v-else-if="activeTab === 'smtp'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-content">{{ t('settings.smtp') }}</h2>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="smtp.is_enabled" class="h-4 w-4 rounded border-line" data-testid="smtp-enabled" />
          {{ t('settings.smtpEnabled') }}
        </label>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">SMTP Host</label>
            <input v-model="smtp.host" class="input" dir="ltr" data-testid="smtp-host" />
          </div>
          <div>
            <label class="label">SMTP Port</label>
            <input v-model.number="smtp.port" type="number" class="input" data-testid="smtp-port" />
          </div>
          <div>
            <label class="label">Encryption</label>
            <select v-model="smtp.encryption" class="input" data-testid="smtp-encryption">
              <option value="starttls">STARTTLS</option>
              <option value="tls">TLS</option>
              <option value="none">None (approved internal relay only)</option>
            </select>
          </div>
          <div v-if="smtp.encryption === 'none'" class="flex items-center">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="smtp.internal_relay_mode" class="h-4 w-4 rounded border-line" data-testid="smtp-internal-relay" />
              {{ t('settings.internalRelayMode') }}
            </label>
          </div>
          <div>
            <label class="label">{{ t('settings.smtpAuth') }}</label>
            <label class="flex items-center gap-2 text-sm h-9">
              <input type="checkbox" v-model="smtp.auth_enabled" class="h-4 w-4 rounded border-line" data-testid="smtp-auth-enabled" />
              {{ t('common.yes') }}
            </label>
          </div>
          <div>
            <label class="label">SMTP Username</label>
            <input v-model="smtp.username" class="input" dir="ltr" autocomplete="off" data-testid="smtp-username" />
          </div>
          <div>
            <label class="label">SMTP Password</label>
            <input v-model="smtp.password" type="password" class="input" autocomplete="new-password"
              :placeholder="smtp.password_configured ? t('settings.passwordConfigured') : t('settings.passwordNotConfigured')"
              data-testid="smtp-password" />
            <p class="text-[11px] text-content-subtle mt-1" data-testid="smtp-password-status">
              {{ smtp.password_configured ? t('settings.passwordConfigured') : t('settings.passwordNotConfigured') }}
              <span v-if="smtp.password_last_changed_at">— {{ formatDate(smtp.password_last_changed_at) }}</span>
            </p>
          </div>
          <div>
            <label class="label">From Address</label>
            <input v-model="smtp.from_email" type="email" class="input" dir="ltr" data-testid="smtp-from-email" />
          </div>
          <div>
            <label class="label">From Name (AR)</label>
            <input v-model="smtp.from_name_ar" class="input" dir="rtl" data-testid="smtp-from-name-ar" />
          </div>
          <div>
            <label class="label">From Name (EN)</label>
            <input v-model="smtp.from_name_en" class="input" dir="ltr" data-testid="smtp-from-name-en" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button class="btn-primary btn-sm" :disabled="smtpSaving" @click="saveSmtp" data-testid="smtp-save">
            {{ smtpSaving ? t('common.loading') : t('settings.save') }}
          </button>
          <button class="btn-secondary btn-sm" :disabled="smtpTesting" @click="testSmtp" data-testid="smtp-test">
            {{ smtpTesting ? t('common.loading') : t('settings.testConnection') }}
          </button>
          <input v-model="smtpTestRecipient" type="email" class="input max-w-xs" placeholder="test recipient (optional)" data-testid="smtp-test-recipient" />
        </div>
        <p v-if="smtpTestResult" class="text-xs" :class="smtpTestResult.success ? 'text-success-600' : 'text-danger-600'" data-testid="smtp-test-result">
          {{ smtpTestResult.message }}
        </p>
      </div>

      <!-- Email Templates -->
      <div v-else-if="activeTab === 'email-templates'" class="space-y-4">
        <div class="card divide-y divide-line">
          <button
            v-for="tpl in emailTemplates"
            :key="tpl.id"
            class="w-full flex items-center justify-between px-4 py-3 text-start hover:bg-surface-inset transition-colors"
            :data-testid="`email-template-row-${tpl.template_key}`"
            @click="selectEmailTemplate(tpl)"
          >
            <div>
              <p class="text-sm font-medium text-content">{{ tpl.event_type }}</p>
              <p class="text-xs text-content-subtle">{{ tpl.template_key }}</p>
            </div>
            <span
              class="text-xs px-2 py-0.5 rounded"
              :class="tpl.is_enabled ? 'bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-400' : 'bg-surface-inset text-content-subtle'"
            >{{ tpl.is_enabled ? t('common.active') : t('common.inactive') }}</span>
          </button>
          <p v-if="!emailTemplates.length" class="px-4 py-6 text-sm text-content-subtle">{{ t('common.noData') }}</p>
        </div>

        <div v-if="editingTemplate" class="card p-6 space-y-4" data-testid="email-template-editor">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-content">{{ editingTemplate.event_type }}</h3>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="editingTemplate.is_enabled" class="h-4 w-4 rounded border-line" data-testid="email-template-enabled" />
              {{ t('common.active') }}
            </label>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Subject (AR)</label>
              <input v-model="editingTemplate.subject_ar" class="input" dir="rtl" data-testid="email-template-subject-ar" />
            </div>
            <div>
              <label class="label">Subject (EN)</label>
              <input v-model="editingTemplate.subject_en" class="input" dir="ltr" data-testid="email-template-subject-en" />
            </div>
            <div>
              <label class="label">Body (AR)</label>
              <textarea v-model="editingTemplate.body_ar" rows="5" class="textarea" dir="rtl" data-testid="email-template-body-ar" />
            </div>
            <div>
              <label class="label">Body (EN)</label>
              <textarea v-model="editingTemplate.body_en" rows="5" class="textarea" dir="ltr" data-testid="email-template-body-en" />
            </div>
          </div>

          <div>
            <p class="label">{{ t('settings.availableVariables') }}</p>
            <div class="flex flex-wrap gap-1.5 mt-1" data-testid="email-template-variables">
              <code v-for="v in wrappedVariables" :key="v" class="text-[11px] px-1.5 py-0.5 rounded bg-surface-inset text-content-subtle">{{ v }}</code>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="btn-primary btn-sm" :disabled="emailTemplateSaving" @click="saveEmailTemplate" data-testid="email-template-save">
              {{ emailTemplateSaving ? t('common.loading') : t('settings.save') }}
            </button>
            <button class="btn-secondary btn-sm" @click="previewEmailTemplate('ar')" data-testid="email-template-preview-ar">{{ t('settings.previewAr') }}</button>
            <button class="btn-secondary btn-sm" @click="previewEmailTemplate('en')" data-testid="email-template-preview-en">{{ t('settings.previewEn') }}</button>
            <input v-model="emailTestRecipient" type="email" class="input max-w-xs" placeholder="test recipient" data-testid="email-template-test-email" />
            <button class="btn-secondary btn-sm" :disabled="!emailTestRecipient" @click="testSendEmailTemplate" data-testid="email-template-test-send">
              {{ t('settings.testSend') }}
            </button>
          </div>

          <div v-if="emailPreview" class="rounded border border-line p-3 space-y-1" data-testid="email-template-preview-result">
            <p class="text-xs font-semibold text-content">{{ emailPreview.subject }}</p>
            <p class="text-xs text-content-subtle whitespace-pre-wrap">{{ emailPreview.body }}</p>
          </div>
          <p v-if="emailActionMessage" class="text-xs text-success-600" data-testid="email-template-action-message">{{ emailActionMessage }}</p>
        </div>
      </div>

      <!-- Upload -->
      <div v-else-if="activeTab === 'upload'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-content">{{ t('settings.upload') }}</h2>
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
                class="h-4 w-4 rounded border-line text-primary-600"
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
        <h2 class="text-sm font-semibold text-content">{{ t('settings.notifications') }}</h2>
        <div class="space-y-3">
          <div v-for="notif in notifToggles" :key="notif.key" class="flex items-center justify-between py-2 border-b border-line">
            <div>
              <p class="text-sm font-medium text-content">{{ notif.label }}</p>
              <p class="text-xs text-content-subtle">{{ notif.desc }}</p>
            </div>
            <button
              class="relative inline-flex h-5 w-9 rounded-full transition-colors"
              :class="settings[notif.key] ? 'bg-success-500' : 'bg-surface-inset'"
              @click="settings[notif.key] = !settings[notif.key]"
            >
              <span class="inline-block h-4 w-4 mt-0.5 rounded-full bg-surface-raised shadow transition-transform"
                :class="settings[notif.key] ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0.5 rtl:-translate-x-0.5'" />
            </button>
          </div>
        </div>
        <button class="btn-primary btn-sm" :disabled="saving" @click="saveTab">{{ saving ? t('common.loading') : t('settings.save') }}</button>
      </div>

      <!-- Localization -->
      <div v-else-if="activeTab === 'localization'" class="card p-6 space-y-4">
        <h2 class="text-sm font-semibold text-content">{{ t('settings.localization') }}</h2>
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
import { adminService, brandingAdminService, smtpSettingsService, emailTemplateService } from '@/services/index'

const { t } = useI18n()
const appStore = useAppStore()

const loading   = ref(true)
const saving    = ref(false)
const activeTab = ref('branding')

const tabs = computed(() => [
  { key: 'branding',        label: t('settings.branding') },
  { key: 'smtp',            label: t('settings.smtp') },
  { key: 'email-templates', label: t('settings.emailTemplates') },
  { key: 'upload',          label: t('settings.upload') },
  { key: 'notifications',   label: t('settings.notifications') },
  { key: 'localization',    label: t('settings.localization') },
])

const fileTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip']

const notifToggles = [
  { key: 'notify_on_submit',   label: 'Notify on Submission',     desc: 'Notify auditors when a document is submitted' },
  { key: 'notify_on_approve',  label: 'Notify on Approval',       desc: 'Notify users when their document is approved' },
  { key: 'notify_on_reject',   label: 'Notify on Rejection',      desc: 'Notify users when their document is rejected' },
  { key: 'notify_on_deadline', label: 'Deadline Reminders',       desc: 'Send reminders before document deadlines' },
  { key: 'notify_on_extension',label: 'Extension Notifications',  desc: 'Notify on extension request decisions' },
]

// Maps each form field to the backend's group/key/type. `csv` fields convert
// between an array (UI) and a comma-separated string (storage). SMTP fields
// are deliberately absent here — they're managed exclusively through the
// dedicated, encrypted-at-rest smtpSettingsService below, never through this
// generic key-value store. See docs/security/smtp-security.md.
const FIELDS = [
  { f: 'platform_name_ar',  g: 'branding',     k: 'platform_name',     t: 'string',  tab: 'branding' },
  { f: 'platform_name_en',  g: 'branding',     k: 'platform_name_en',  t: 'string',  tab: 'branding' },
  { f: 'max_file_size_mb',  g: 'upload',       k: 'max_size_mb',       t: 'integer', tab: 'upload' },
  { f: 'allowed_file_types',g: 'upload',       k: 'allowed_types',     t: 'string',  tab: 'upload', csv: true },
  { f: 'default_locale',    g: 'localization', k: 'default_locale',    t: 'string',  tab: 'localization' },
  { f: 'timezone',          g: 'localization', k: 'timezone',          t: 'string',  tab: 'localization' },
  { f: 'date_format',       g: 'localization', k: 'date_format',       t: 'string',  tab: 'localization' },
  { f: 'notify_on_submit',   g: 'notifications', k: 'notify_on_submit',    t: 'boolean', tab: 'notifications' },
  { f: 'notify_on_approve',  g: 'notifications', k: 'notify_on_approve',   t: 'boolean', tab: 'notifications' },
  { f: 'notify_on_reject',   g: 'notifications', k: 'notify_on_reject',    t: 'boolean', tab: 'notifications' },
  { f: 'notify_on_deadline', g: 'notifications', k: 'notify_on_deadline',  t: 'boolean', tab: 'notifications' },
  { f: 'notify_on_extension',g: 'notifications', k: 'notify_on_extension', t: 'boolean', tab: 'notifications' },
]

const settings = reactive({
  platform_name_ar: '',
  platform_name_en: '',
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
    // Backend returns settings grouped: { branding: {...}, upload: {...}, ... }
    const data = await adminService.getSettings()
    for (const fd of FIELDS) {
      const v = data?.[fd.g]?.[fd.k]
      if (v === undefined || v === null) continue
      settings[fd.f] = fd.csv ? String(v).split(',').map(s => s.trim()).filter(Boolean) : v
    }
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function saveTab() {
  saving.value = true
  try {
    // Send only the active tab's fields, shaped as the backend expects.
    const payload = FIELDS
      .filter(fd => fd.tab === activeTab.value)
      .map(fd => ({
        group: fd.g,
        key:   fd.k,
        type:  fd.t,
        value: fd.csv ? (settings[fd.f] || []).join(',') : settings[fd.f],
      }))
    await adminService.updateSettings({ settings: payload })
    appStore.showToast(t('common.success'), 'success')
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

// ── Branding: versioned logo/favicon assets ──────────────────────────────

const ASSET_TYPES = [
  { type: 'logo_primary', labelEn: 'Primary Logo',   labelAr: 'الشعار الرئيسي',    descEn: 'Default logo used across the app.' },
  { type: 'logo_header',  labelEn: 'Header Logo',    labelAr: 'شعار الترويسة',      descEn: 'Shown in the sidebar/header (dark background).' },
  { type: 'logo_login',   labelEn: 'Login Logo',     labelAr: 'شعار تسجيل الدخول',  descEn: 'Shown on the login page.' },
  { type: 'logo_dark',    labelEn: 'Dark Mode Logo', labelAr: 'شعار الوضع الداكن',  descEn: 'Light-on-dark variant, where needed.' },
  { type: 'logo_compact', labelEn: 'Compact Logo',   labelAr: 'الشعار المصغر',      descEn: 'Small-space variant (e.g. collapsed sidebar).' },
  { type: 'favicon',      labelEn: 'Favicon',        labelAr: 'أيقونة المتصفح',     descEn: 'Browser tab icon.' },
  { type: 'logo_report',  labelEn: 'Report Logo',    labelAr: 'شعار التقارير',      descEn: 'Used in generated report headers.' },
  { type: 'logo_email',   labelEn: 'Email Logo',     labelAr: 'شعار البريد الإلكتروني', descEn: 'Used in outgoing email templates.' },
]

const assetState = reactive(
  Object.fromEntries(ASSET_TYPES.map(a => [a.type, { history: [], uploading: false, error: '', showHistory: false }]))
)

function activeVersion(type) {
  return assetState[type].history.find(v => v.status === 'active') || null
}

function pendingVersion(type) {
  return assetState[type].history.find(v => v.status === 'inactive') || null
}

async function loadBrandingHistory(type) {
  try {
    assetState[type].history = await brandingAdminService.history(type)
  } catch {
    // Leave existing (possibly stale) history in place rather than clearing it.
  }
}

async function loadAllBrandingHistory() {
  await Promise.all(ASSET_TYPES.map(a => loadBrandingHistory(a.type)))
}

async function onSelectFile(type, event) {
  const file = event.target.files[0]
  event.target.value = '' // allow re-selecting the same filename after a rejection
  if (!file) return
  assetState[type].error = ''
  assetState[type].uploading = true
  try {
    await brandingAdminService.upload(type, file)
    await loadBrandingHistory(type)
  } catch (e) {
    assetState[type].error = e?.response?.data?.message || t('common.error')
  } finally {
    assetState[type].uploading = false
  }
}

async function activateAsset(type, assetId) {
  try {
    await brandingAdminService.activate(type, assetId)
    await loadBrandingHistory(type)
    // Refresh the global branding cache so the sidebar/login logo updates immediately.
    await appStore.loadBranding()
    appStore.showToast(t('common.success'), 'success')
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

async function restoreAsset(type, assetId) {
  try {
    await brandingAdminService.restore(type, assetId)
    await loadBrandingHistory(type)
    await appStore.loadBranding()
    appStore.showToast(t('common.success'), 'success')
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

// An uploaded-but-inactive draft has no delete endpoint (it's already
// validated, stored history) — "Cancel" just means never activating it.
function cancelPending(type) {
  assetState[type].error = ''
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(appStore.isRTL ? 'ar-SA' : 'en-US')
  } catch {
    return iso
  }
}

// ── SMTP: encrypted-at-rest, write-only password ─────────────────────────

const smtp = reactive({
  is_enabled: false, host: '', port: 587, encryption: 'starttls', auth_enabled: true,
  username: '', password: '', password_configured: false, password_last_changed_at: null,
  from_email: '', from_name_ar: '', from_name_en: '', reply_to_email: '', reply_to_name: '',
  connection_timeout: 10, send_timeout: null, verify_certificate: true, queue_enabled: true,
  retry_count: 3, retry_delay: 60, environment_label: '', internal_relay_mode: false,
})
const smtpSaving = ref(false)
const smtpTesting = ref(false)
const smtpTestRecipient = ref('')
const smtpTestResult = ref(null)

async function loadSmtp() {
  try {
    const data = await smtpSettingsService.get()
    // The API never returns the real password — only a configured/not-configured
    // status — so the local field always starts empty (write-only).
    Object.assign(smtp, data, { password: '' })
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

async function saveSmtp() {
  if (smtp.encryption === 'none' && !smtp.internal_relay_mode) {
    appStore.showToast(t('settings.smtpUnencryptedRejected'), 'error')
    return
  }
  smtpSaving.value = true
  try {
    const { password_configured, password_last_changed_at, ...payload } = smtp
    await smtpSettingsService.update(payload)
    await loadSmtp()
    appStore.showToast(t('common.success'), 'success')
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    smtpSaving.value = false
  }
}

async function testSmtp() {
  smtpTesting.value = true
  smtpTestResult.value = null
  try {
    smtpTestResult.value = await smtpSettingsService.test({
      host: smtp.host,
      port: smtp.port,
      encryption: smtp.encryption,
      auth_enabled: smtp.auth_enabled,
      username: smtp.username,
      password: smtp.password || undefined,
      use_saved_password: !smtp.password && smtp.password_configured,
      from_email: smtp.from_email,
      test_recipient: smtpTestRecipient.value || undefined,
    })
  } catch (e) {
    smtpTestResult.value = { success: false, message: e?.response?.data?.message || t('common.error') }
  } finally {
    smtpTesting.value = false
  }
}

// ── Email templates: global, Super-Admin-managed ──────────────────────────

const supportedVariables = [
  'recipient_name', 'employee_name', 'reviewer_name', 'department_name',
  'program_name', 'cycle_name', 'requirement_code', 'requirement_name',
  'current_status', 'due_date', 'effective_due_date', 'requested_due_date',
  'days_remaining', 'days_overdue', 'sla_due_at', 'sla_breach_duration',
  'rejection_reason', 'review_notes', 'action_url',
]
const wrappedVariables = supportedVariables.map(v => `{{${v}}}`)

const emailTemplates = ref([])
const editingTemplate = ref(null)
const emailTemplateSaving = ref(false)
const emailPreview = ref(null)
const emailTestRecipient = ref('')
const emailActionMessage = ref('')

async function loadEmailTemplates() {
  try {
    emailTemplates.value = await emailTemplateService.list()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

function selectEmailTemplate(tpl) {
  editingTemplate.value = { ...tpl }
  emailPreview.value = null
  emailActionMessage.value = ''
}

async function saveEmailTemplate() {
  if (!editingTemplate.value) return
  emailTemplateSaving.value = true
  try {
    const saved = await emailTemplateService.update(editingTemplate.value.id, {
      subject_ar: editingTemplate.value.subject_ar,
      subject_en: editingTemplate.value.subject_en,
      body_ar: editingTemplate.value.body_ar,
      body_en: editingTemplate.value.body_en,
      is_enabled: editingTemplate.value.is_enabled,
      cc_rules: editingTemplate.value.cc_rules ?? null,
    })
    const idx = emailTemplates.value.findIndex(t2 => t2.id === saved.id)
    if (idx !== -1) emailTemplates.value[idx] = saved
    editingTemplate.value = { ...saved }
    appStore.showToast(t('common.success'), 'success')
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    emailTemplateSaving.value = false
  }
}

async function previewEmailTemplate(locale) {
  if (!editingTemplate.value) return
  try {
    emailPreview.value = await emailTemplateService.preview(editingTemplate.value.id, locale)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

async function testSendEmailTemplate() {
  if (!editingTemplate.value || !emailTestRecipient.value) return
  emailActionMessage.value = ''
  try {
    const result = await emailTemplateService.testSend(editingTemplate.value.id, emailTestRecipient.value)
    emailActionMessage.value = result.message
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  }
}

onMounted(async () => {
  await loadSettings()
  await Promise.all([loadAllBrandingHistory(), loadSmtp(), loadEmailTemplates()])
})
</script>
