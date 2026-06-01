<template>
  <div class="space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ t('nav.auditLogs') }}</h1>

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
                <th>{{ t('common.date') }}</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP</th>
                <th>Model</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!logs.length">
                <td colspan="6" class="text-center py-10 text-gray-400">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="log in logs" :key="log.id">
                <td class="text-xs whitespace-nowrap">{{ formatDate(log.created_at) }}</td>
                <td>
                  <div>
                    <p class="text-sm font-medium">{{ log.user?.name }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ log.user?.username }}</p>
                  </div>
                </td>
                <td>
                  <span class="badge font-mono text-xs" :class="actionClass(log.action)">{{ log.action }}</span>
                </td>
                <td class="max-w-[240px]">
                  <p class="text-sm text-gray-600 dark:text-gray-400 truncate" :title="log.description">{{ log.description }}</p>
                </td>
                <td class="font-mono text-xs text-gray-400">{{ log.ip_address }}</td>
                <td class="text-xs text-gray-500">{{ log.auditable_type }}</td>
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
import AppPagination from '@/components/common/AppPagination.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading = ref(true)
const logs    = ref([])
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
  const map = {
    login: 'bg-blue-100 text-blue-700',
    logout: 'bg-gray-100 text-gray-600',
    create: 'bg-green-100 text-green-700',
    update: 'bg-yellow-100 text-yellow-700',
    delete: 'bg-red-100 text-red-700',
    approve: 'bg-green-100 text-green-700',
    reject: 'bg-red-100 text-red-700',
    submit: 'bg-primary-100 text-primary-700',
  }
  return map[action] || 'bg-gray-100 text-gray-600'
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
