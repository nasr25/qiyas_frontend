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
                  <SortableTh field="name_ar" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('departments.nameAr') }}</SortableTh>
                  <SortableTh field="total" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.total') }}</SortableTh>
                  <SortableTh field="approved" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.approved') }}</SortableTh>
                  <SortableTh field="under_review" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.underReview') }}</SortableTh>
                  <SortableTh field="rejected" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.rejected') }}</SortableTh>
                  <SortableTh field="overdue" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.overdue') }}</SortableTh>
                  <SortableTh field="completion_rate" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.completionRate') }}</SortableTh>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!sortedRows.length">
                  <td colspan="7" class="text-center py-8 text-content-subtle">{{ t('common.noData') }}</td>
                </tr>
                <tr v-for="row in sortedRows" :key="row.id">
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
                  <SortableTh field="number" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('standards.number') }}</SortableTh>
                  <SortableTh field="name_ar" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('standards.nameAr') }}</SortableTh>
                  <SortableTh field="total" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.total') }}</SortableTh>
                  <SortableTh field="approved" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.approved') }}</SortableTh>
                  <SortableTh field="completion_rate" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('dashboard.completionRate') }}</SortableTh>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!sortedRows.length">
                  <td colspan="5" class="text-center py-8 text-content-subtle">{{ t('common.noData') }}</td>
                </tr>
                <tr v-for="row in sortedRows" :key="row.id">
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
            <div v-if="!reportData?.cycle" class="text-center py-8 text-content-subtle text-sm">{{ t('common.noData') }}</div>
            <template v-else>
              <!-- Cycle header -->
              <div class="mb-5">
                <h4 class="font-bold text-content">{{ reportData.cycle.name }}</h4>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-content-muted mt-1">
                  <span>{{ t('cycles.year') }}: <strong class="text-content">{{ reportData.cycle.year }}</strong></span>
                  <span class="inline-flex items-center gap-1">{{ t('common.status') }}: <StatusBadge :status="reportData.cycle.status" /></span>
                  <span>{{ formatDate(reportData.cycle.start_date) }} → {{ formatDate(reportData.cycle.end_date) }}</span>
                </div>
              </div>
              <!-- Headline KPIs -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="kpi-card"><p class="kpi-label">{{ t('standards.title') }}</p><p class="kpi-value text-brand">{{ reportData.standards_count ?? 0 }}</p></div>
                <div class="kpi-card"><p class="kpi-label">{{ t('departments.title') }}</p><p class="kpi-value">{{ reportData.departments_count ?? 0 }}</p></div>
                <div class="kpi-card"><p class="kpi-label">{{ t('dashboard.total') }}</p><p class="kpi-value">{{ reportData.document_stats?.total ?? 0 }}</p></div>
                <div class="kpi-card"><p class="kpi-label">{{ t('dashboard.completionRate') }}</p><p class="kpi-value text-success-600 dark:text-success-400">{{ (reportData.completion_rate ?? 0).toFixed(1) }}%</p></div>
              </div>
              <!-- Document status breakdown -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                <div v-for="s in summaryStatuses" :key="s.key" class="card p-3 text-center">
                  <p class="text-xs text-content-muted mb-1">{{ s.label }}</p>
                  <p class="text-lg font-bold text-content tabular-nums">{{ reportData.document_stats?.[s.key] ?? 0 }}</p>
                </div>
              </div>
            </template>
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
import SortableTh from '@/components/common/SortableTh.vue'
import { useSort } from '@/composables/useSort'

const { t } = useI18n()
const appStore = useAppStore()

const loading      = ref(true)
const cycles       = ref([])
const selectedCycle = ref('')
const activeTab    = ref('department')
const reportData   = ref([])

// Sortable rows (department / standard tabs hold arrays).
const { sorted: sortedRows, sortKey, sortDir, sortBy } = useSort(reportData)

const summaryStatuses = computed(() => [
  { key: 'draft',        label: t('dashboard.draft') },
  { key: 'under_review', label: t('dashboard.underReview') },
  { key: 'approved',     label: t('dashboard.approved') },
  { key: 'rejected',     label: t('dashboard.rejected') },
  { key: 'overdue',      label: t('dashboard.overdue') },
])

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(appStore.isRTL ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

const tabs = computed(() => [
  { key: 'department', label: t('reports.byDepartment') },
  { key: 'standard',   label: t('reports.byStandard') },
  { key: 'status',     label: t('reports.byStatus') },
  { key: 'summary',    label: t('reports.cycleSummary') },
])

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
