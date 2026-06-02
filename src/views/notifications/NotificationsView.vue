<template>
  <div class="page">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h1 class="text-xl font-bold text-content">
        {{ t('nav.notifications') }}
        <span v-if="notifStore.unreadCount" class="ms-2 align-middle badge bg-brand text-brand-contrast">{{ notifStore.unreadCount }}</span>
      </h1>
      <button
        class="btn-secondary btn-sm self-start sm:self-auto"
        :disabled="!notifStore.unreadCount"
        @click="markAll"
      >
        {{ t('notifications.markAllRead') }}
      </button>
    </div>

    <!-- List -->
    <div class="card divide-y divide-line">
      <!-- Loading -->
      <div v-if="notifStore.loading" class="flex justify-center py-16">
        <svg class="h-8 w-8 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- Empty -->
      <div v-else-if="!notifStore.notifications.length" class="px-6 py-16 text-center">
        <div class="mx-auto mb-3 h-12 w-12 rounded-full bg-surface-inset flex items-center justify-center text-2xl">🔔</div>
        <p class="text-sm text-content-subtle">{{ t('notifications.empty') }}</p>
      </div>

      <!-- Items -->
      <component
        v-for="n in notifStore.notifications"
        :key="n.id"
        :is="linkFor(n) ? 'RouterLink' : 'div'"
        :to="linkFor(n)"
        class="flex items-start gap-3 px-4 sm:px-6 py-4 transition-colors hover:bg-surface-inset"
        :class="{ 'bg-brand-subtle/60': !n.read_at }"
        @click="onClick(n)"
      >
        <!-- Unread dot / icon -->
        <div class="relative shrink-0 mt-0.5">
          <div class="h-9 w-9 rounded-full bg-surface-inset flex items-center justify-center text-base">{{ iconFor(n) }}</div>
          <span v-if="!n.read_at" class="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-surface-raised" />
        </div>

        <!-- Body -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-content" :class="{ 'font-semibold': !n.read_at }">{{ messageFor(n) }}</p>
          <p class="text-xs text-content-subtle mt-0.5">{{ formatDate(n.created_at) }}</p>
        </div>

        <!-- Delete -->
        <button
          class="btn-icon h-8 w-8 shrink-0 text-content-subtle hover:text-danger-600"
          :aria-label="t('common.delete')"
          @click.stop.prevent="remove(n.id)"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </component>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useNotificationsStore } from '@/stores/notifications'

const { t } = useI18n()
const router    = useRouter()
const appStore  = useAppStore()
const notifStore = useNotificationsStore()

const ICONS = {
  document_submitted: '📄', document_approved: '✅', document_rejected: '❌',
  extension_requested: '⏳', extension_approved: '✅', extension_rejected: '❌',
  deadline_reminder: '⏰',
}

function iconFor(n)    { return ICONS[n.data?.type] || '🔔' }
function messageFor(n) {
  const d = n.data || {}
  return (appStore.isRTL ? d.message_ar : d.message_en) || d.message_ar || d.message_en || d.title || t('notifications.new')
}
function linkFor(n)    { return n.data?.document_id ? `/documents/${n.data.document_id}` : undefined }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString(appStore.isRTL ? 'ar-SA' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function onClick(n) {
  if (!n.read_at) { try { await notifStore.markRead(n.id) } catch { /* ignore */ } }
}

async function markAll() {
  try { await notifStore.markAllRead() }
  catch { appStore.showToast(t('common.error'), 'error') }
}

async function remove(id) {
  try { await notifStore.remove(id) }
  catch { appStore.showToast(t('common.error'), 'error') }
}

onMounted(async () => {
  try { await notifStore.fetchNotifications() }
  catch { appStore.showToast(t('common.error'), 'error') }
})
</script>
