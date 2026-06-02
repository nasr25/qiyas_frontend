<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <h1 class="text-xl font-bold text-content">{{ t('reports.title') }}</h1>
      <!-- Cycle picker -->
      <select v-model="selectedCycle" class="input w-full sm:w-48" @change="loadCurrentTab">
        <option value="">{{ t('common.all') }} {{ t('cycles.title') }}</option>
        <option v-for="c in cycles" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-line gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === tab.key
          ? 'border-b-2 border-primary-700 text-primary-700 dark:text-primary-400 dark:border-primary-400'
          : 'text-content-muted hover:text-content'"
        @click="activeTab = tab.key; loadCurrentTab()"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else>
      <!-- By Department -->
      <template v-if="activeTab === 'department'">
        <!-- Completion bars chart -->
        <div v-if="reportData.length" class="card p-6">
          <h3 class="text-sm font-semibold text-content mb-4">{{ t('reports.byDepartment') }}</h3>
          <div class="space-y-3">
            <div v-for="row in reportData" :key="row.id" class="flex items-center gap-3">
              <p class="text-sm text-content w-40 truncate shrink-0">{{ row.name_ar || row.name }}</p>
              <div class="flex-1 h-3 bg-surface-inset rounded-full overflow-hidden">
                <div class="h-full bg-success-500 rounded-full transition-all" :style="{ width: `${row.completion_rate ?? 0}%` }" />
              </div>
              <span class="text-xs font-medium text-content-muted w-12 text-end">{{ (row.completion_rate ?? 0).toFixed(0) }}%</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header flex items-center justify-between">
            <h3 class="text-sm font-semibold text-content">{{ t('reports.byDepartment') }}</h3>
            <div class="flex gap-2">
              <button class="btn-secondary btn-sm" @click="exportReport('excel')">{{ t('reports.exportExcel') }}</button>
              <button class="btn-secondary btn-sm" @click="exportReport('pdf')">{{ t('reports.exportPDF') }}</button>
            </div>
          </div>
          <div class="table-wrapper rounded-none border-0">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ t('departments.nameAr') }}</th>
                  <th>{{ t('dashboard.total') }}</th>
                  <th>{{ t('dashboard.approved') }}</th>
                  <th>{{ t('dashboard.underReview') }}</th>
                  <th>{{ t('dashboard.rejected') }}</th>
                  <th>{{ t('dashboard.overdue') }}</th>
                  <th>{{ t('dashboard.completionRate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!reportData.length">
                  <td colspan="7" class="text-center py-8 text-content-subtle">{{ t('common.noData') }}</td>
                </tr>
                <tr v-for="row in reportData" :key="row.id">
                  <td class="font-medium">{{ row.name_ar || row.name }}</td>
                  <td>{{ row.total ?? 0 }}</td>
                  <td><span class="badge-approved">{{ row.approved ?? 0 }}</span></td>
                  <td><span class="badge-under-review">{{ row.under_review ?? 0 }}</span></td>
                  <td><span class="badge-rejected">{{ row.rejected ?? 0 }}</span></td>
                  <td><span class="badge-overdue">{{ row.overdue ?? 0 }}</span></td>
                  <td class="font-semibold text-success-600">{{ (row.completion_rate ?? 0).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- By Standard -->
      <template v-else-if="activeTab === 'standard'">
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <h3 class="text-sm font-semibold text-content">{{ t('reports.byStandard') }}</h3>
            <div class="flex gap-2">
              <button class="btn-secondary btn-sm" @click="exportReport('excel')">{{ t('reports.exportExcel') }}</button>
              <button class="btn-secondary btn-sm" @click="exportReport('pdf')">{{ t('reports.exportPDF') }}</button>
            </div>
          </div>
          <div class="table-wrapper rounded-none border-0">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ t('standards.number') }}</th>
                  <th>{{ t('standards.nameAr') }}</th>
                  <th>{{ t('dashboard.total') }}</th>
                  <th>{{ t('dashboard.approved') }}</th>
                  <th>{{ t('dashboard.completionRate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!reportData.length">
                  <td colspan="5" class="text-center py-8 text-content-subtle">{{ t('common.noData') }}</td>
                </tr>
                <tr v-for="row in reportData" :key="row.id">
                  <td class="font-mono font-medium text-primary-700 dark:text-primary-400">{{ row.number }}</td>
                  <td>{{ row.name_ar }}</td>
                  <td>{{ row.total ?? 0 }}</td>
                  <td><span class="badge-approved">{{ row.approved ?? 0 }}</span></td>
                  <td class="font-semibold text-success-600">{{ (row.completion_rate ?? 0).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- By Status -->
      <template v-else-if="activeTab === 'status'">
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <h3 class="text-sm font-semibold text-content">{{ t('reports.byStatus') }}</h3>
            <div class="flex gap-2">
              <button class="btn-secondary btn-sm" @click="exportReport('excel')">{{ t('reports.exportExcel') }}</button>
            </div>
          </div>
          <div class="divide-y divide-line">
            <div v-if="!reportData.length" class="px-6 py-8 text-center text-content-subtle text-sm">{{ t('common.noData') }}</div>
            <div v-for="row in (reportData.statuses || reportData)" :key="row.status" class="flex items-center gap-4 px-6 py-3">
              <StatusBadge :status="row.status" />
              <div class="flex-1 h-3 bg-surface-inset rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" :class="statusBarColor(row.status)"
                  :style="{ width: `${row.percentage ?? 0}%` }" />
              </div>
              <span class="text-sm font-semibold text-content w-10 text-end">{{ row.count ?? 0 }}</span>
              <span class="text-xs text-content-muted w-12 text-end">{{ (row.percentage ?? 0).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Cycle Summary -->
      <template v-else-if="activeTab === 'summary'">
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <h3 class="text-sm font-semibold text-content">{{ t('reports.cycleSummary') }}</h3>
            <div class="flex gap-2">
              <button class="btn-secondary btn-sm" @click="exportReport('excel')">{{ t('reports.exportExcel') }}</button>
              <button class="btn-secondary btn-sm" @click="exportReport('pdf')">{{ t('reports.exportPDF') }}</button>
            </div>
          </div>
          <div class="card-body">
            <div v-if="!reportData || (!reportData.length && !reportData.cycle)" class="text-center py-8 text-content-subtle text-sm">{{ t('common.noData') }}</div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div v-for="(val, key) in summaryItems" :key="key" class="text-center">
                <p class="text-xs text-content-muted mb-1">{{ key }}</p>
                <p class="text-xl font-bold text-content">{{ val }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { reportsService, cyclesService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading      = ref(true)
const cycles       = ref([])
const selectedCycle = ref('')
const activeTab    = ref('department')
const reportData   = ref([])

const tabs = computed(() => [
  { key: 'department', label: t('reports.byDepartment') },
  { key: 'standard',   label: t('reports.byStandard') },
  { key: 'status',     label: t('reports.byStatus') },
  { key: 'summary',    label: t('reports.cycleSummary') },
])

const summaryItems = computed(() => {
  const d = reportData.value
  if (!d || typeof d !== 'object' || Array.isArray(d)) return {}
  return d
})

function statusBarColor(status) {
  return {
    approved:     'bg-success-500',
    under_review: 'bg-warning-500',
    rejected:     'bg-danger-500',
    draft:        'bg-surface-inset',
    overdue:      'bg-warning-500',
  }[status] || 'bg-surface-inset'
}

async function loadCurrentTab() {
  loading.value = true
  try {
    const params = {}
    if (selectedCycle.value) params.cycle_id = selectedCycle.value
    if (activeTab.value === 'department') {
      reportData.value = await reportsService.byDepartment(params)
    } else if (activeTab.value === 'standard') {
      reportData.value = await reportsService.byStandard(params)
    } else if (activeTab.value === 'status') {
      const res = await reportsService.byStatus(params)
      reportData.value = res.data || res
    } else if (activeTab.value === 'summary') {
      reportData.value = await reportsService.cycleSummary(params)
    }
  } catch {
    appStore.showToast(t('common.error'), 'error')
    reportData.value = []
  } finally {
    loading.value = false
  }
}

function exportReport(format) {
  // Trigger download via window.open or api call
  const params = new URLSearchParams()
  if (selectedCycle.value) params.set('cycle_id', selectedCycle.value)
  params.set('format', format)
  window.open(`/api/reports/${activeTab.value}/export?${params}`, '_blank')
}

onMounted(async () => {
  try {
    const res = await cyclesService.list()
    cycles.value = res.data || res
    const active = cycles.value.find(c => c.status === 'active')
    if (active) selectedCycle.value = active.id
  } catch {}
  await loadCurrentTab()
})
</script>
