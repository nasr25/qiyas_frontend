<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h1 class="text-xl font-bold text-content">{{ t('emailLogs.title') }}</h1>
      <div class="flex gap-2">
        <input v-model="filters.search" class="input w-full sm:w-56" :placeholder="t('common.search')" @input="debouncedFetch" />
        <select v-model="filters.status" class="input w-full sm:w-40" @change="fetch(1)">
          <option value="">{{ t('common.all') }}</option>
          <option value="sent">{{ t('emailLogs.sent') }}</option>
          <option value="failed">{{ t('emailLogs.failed') }}</option>
          <option value="pending">{{ t('emailLogs.pending') }}</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="flex justify-center py-16">
        <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <template v-else>
        <div class="table-wrapper rounded-xl border-0">
          <table class="table">
            <thead>
              <tr>
                <SortableTh field="created_at" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('common.date') }}</SortableTh>
                <SortableTh field="to" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('emailLogs.to') }}</SortableTh>
                <SortableTh field="subject" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('emailLogs.subject') }}</SortableTh>
                <SortableTh field="status" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('common.status') }}</SortableTh>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sorted.length">
                <td colspan="5" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="log in sorted" :key="log.id">
                <td class="text-xs whitespace-nowrap">{{ formatDate(log.created_at) }}</td>
                <td class="font-mono text-xs max-w-[220px] truncate" :title="log.to">{{ log.to }}</td>
                <td class="max-w-[260px] truncate" :title="log.subject">{{ log.subject }}</td>
                <td><span class="badge" :class="statusClass(log.status)">{{ t('emailLogs.' + log.status) }}</span></td>
                <td><button class="btn-secondary btn-sm" @click="openLog(log)">{{ t('common.view') }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination
          v-if="meta.last_page > 1"
          :current-page="meta.current_page"
          :last-page="meta.last_page"
          :total="meta.total"
          @page-change="fetch"
        />
      </template>
    </div>

    <!-- Email detail modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="selected = null">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="selected = null" />
          <div class="relative card w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div class="p-5 border-b border-line shrink-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="font-semibold text-content truncate">{{ selected.subject }}</h3>
                  <p class="text-xs text-content-muted mt-1 font-mono break-all">{{ t('emailLogs.to') }}: {{ selected.to }}</p>
                </div>
                <span class="badge shrink-0" :class="statusClass(selected.status)">{{ t('emailLogs.' + selected.status) }}</span>
              </div>
              <p class="text-xs text-content-subtle mt-2">
                {{ formatDate(selected.created_at) }}
                <span v-if="selected.sent_at"> · {{ t('emailLogs.sentAt') }}: {{ formatDate(selected.sent_at) }}</span>
                <span v-if="selected.mailer"> · {{ selected.mailer }}</span>
              </p>
              <p v-if="selected.error" class="mt-2 rounded bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-900 px-3 py-2 text-xs text-danger-700 dark:text-danger-300">
                {{ selected.error }}
              </p>
            </div>
            <div class="p-1 overflow-auto flex-1 bg-surface-inset">
              <iframe :srcdoc="selected.body || ''" sandbox="" class="w-full h-[55vh] bg-white rounded" title="email body" />
            </div>
            <div class="p-4 border-t border-line shrink-0 flex justify-end">
              <button class="btn-secondary" @click="selected = null">{{ t('common.close') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminService } from '@/services/index'
import SortableTh from '@/components/common/SortableTh.vue'
import { useSort } from '@/composables/useSort'
import AppPagination from '@/components/common/AppPagination.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading  = ref(true)
const logs     = ref([])
const { sorted, sortKey, sortDir, sortBy } = useSort(logs)
const meta     = ref({ current_page: 1, last_page: 1, total: 0 })
const filters  = reactive({ search: '', status: '' })
const selected = ref(null)

let fetchTimeout = null
function debouncedFetch() {
  clearTimeout(fetchTimeout)
  fetchTimeout = setTimeout(() => fetch(1), 400)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString(appStore.isRTL ? 'ar-SA' : 'en-GB')
}

function statusClass(status) {
  return { sent: 'badge-approved', failed: 'badge-rejected', pending: 'badge-under-review' }[status] || 'badge-draft'
}

function openLog(log) { selected.value = log }

async function fetch(page = 1) {
  loading.value = true
  try {
    const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
    const res = await adminService.emailLogs(params)
    logs.value = res.data || res
    if (res.meta) meta.value = res.meta
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => fetch())
</script>
