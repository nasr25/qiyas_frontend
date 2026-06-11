<template>
  <div class="space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-content">{{ t('nav.auditLogs') }}</h1>

    <!-- Filters -->
    <div class="card p-4 flex flex-wrap gap-3">
      <input v-model="filters.search" class="input w-44" :placeholder="t('common.search')" @input="debouncedFetch" />
      <select v-model="filters.action" class="input w-36" @change="fetch(1)">
        <option value="">{{ t('common.all') }} Actions</option>
        <option v-for="action in actions" :key="action" :value="action">{{ action }}</option>
      </select>
      <input v-model="filters.date_from" type="date" class="input w-36" @change="fetch(1)" />
      <input v-model="filters.date_to" type="date" class="input w-36" @change="fetch(1)" />
    </div>

    <!-- Table -->
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
                <SortableTh field="user.name" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">User</SortableTh>
                <SortableTh field="action" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">Action</SortableTh>
                <SortableTh field="description" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">Description</SortableTh>
                <SortableTh field="ip_address" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">IP</SortableTh>
                <SortableTh field="auditable_type" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">Model</SortableTh>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sorted.length">
                <td colspan="6" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="log in sorted" :key="log.id">
                <td class="text-xs whitespace-nowrap">{{ formatDate(log.created_at) }}</td>
                <td>
                  <div>
                    <p class="text-sm font-medium">{{ log.user?.name }}</p>
                    <p class="text-xs text-content-subtle font-mono">{{ log.user?.username }}</p>
                  </div>
                </td>
                <td>
                  <span class="badge text-xs" :class="actionClass(log.action)">{{ actionLabel(log.action) }}</span>
                </td>
                <td class="max-w-[240px]">
                  <p class="text-sm text-content-muted truncate" :title="log.description">{{ log.description }}</p>
                </td>
                <td class="font-mono text-xs text-content-subtle">{{ log.ip_address }}</td>
                <td class="text-xs text-content-muted">{{ log.auditable_type }}</td>
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

const { t, te } = useI18n()
const appStore = useAppStore()

/** Translated action label, falling back to a humanized form. */
function actionLabel(action) {
  const key = `audit.actions.${action}`
  if (te(key)) return t(key)
  return String(action || '').split(/[._]/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const loading = ref(true)
const logs    = ref([])
const { sorted, sortKey, sortDir, sortBy } = useSort(logs)
const meta    = ref({ current_page: 1, last_page: 1, total: 0 })

const actions = [
  'login', 'logout', 'create', 'update', 'delete',
  'submit', 'approve', 'reject', 'upload', 'download',
]

const filters = reactive({
  search: '',
  action: '',
  date_from: '',
  date_to: '',
})

let fetchTimeout = null

function debouncedFetch() {
  clearTimeout(fetchTimeout)
  fetchTimeout = setTimeout(() => fetch(1), 400)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString()
}

function actionClass(action) {
  const verb = String(action || '').split('.').pop()
  const map = {
    login: 'bg-info-100 text-info-700', quick_login: 'bg-info-100 text-info-700',
    logout: 'bg-surface-inset text-content-muted',
    created: 'bg-success-100 text-success-700', approved: 'bg-success-100 text-success-700',
    updated: 'bg-warning-100 text-warning-700', requested: 'bg-warning-100 text-warning-700',
    deleted: 'bg-danger-100 text-danger-700', rejected: 'bg-danger-100 text-danger-700',
    submitted: 'bg-primary-100 text-primary-700', assigned: 'bg-primary-100 text-primary-700',
    uploaded: 'bg-info-100 text-info-700', imported: 'bg-info-100 text-info-700',
  }
  return map[verb] || 'bg-surface-inset text-content-muted'
}

async function fetch(page = 1) {
  loading.value = true
  try {
    const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
    const res = await adminService.auditLogs(params)
    logs.value = res.data || res
    if (res.meta) meta.value = res.meta
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

onMounted(fetch)
</script>
