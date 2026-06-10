<template>
  <div class="page">
    <!-- Cycle info -->
    <div v-if="data?.cycle" class="card border-0 p-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 bg-gradient-to-br from-primary-800 to-primary-950 text-white">
      <div class="flex-1 min-w-0">
        <p class="text-primary-200 text-xs font-medium uppercase tracking-wide mb-1">{{ t('cycles.title') }}</p>
        <h2 class="text-lg font-bold truncate">{{ data.cycle.name }}</h2>
      </div>
      <div class="flex flex-wrap gap-4 sm:gap-6 text-sm">
        <div>
          <p class="text-primary-200/80 text-xs">{{ t('cycles.year') }}</p>
          <p class="font-semibold">{{ data.cycle.year }}</p>
        </div>
        <div>
          <p class="text-primary-200/80 text-xs">{{ t('common.status') }}</p>
          <span class="badge badge-approved capitalize">{{ data.cycle.status }}</span>
        </div>
        <div>
          <p class="text-primary-200/80 text-xs">{{ t('cycles.endDate') }}</p>
          <p class="font-semibold">{{ formatDate(data.cycle.end_date) }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="data">
      <!-- Assigned catalog counts (employee / coordinator) -->
      <div v-if="data.standards_count !== undefined" class="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.assignedStandards') }}</p>
          <p class="kpi-value text-brand">{{ (data.standards_count ?? 0).toLocaleString(locale) }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.requirements') }}</p>
          <p class="kpi-value">{{ (data.requirements_count ?? 0).toLocaleString(locale) }}</p>
        </div>
      </div>

      <!-- Auditor KPIs -->
      <div v-if="data.pending_reviews !== undefined" class="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div class="kpi-card">
          <p class="kpi-label">{{ t('auditor.pendingReviews') }}</p>
          <p class="kpi-value text-warning-600 dark:text-warning-400">{{ (data.pending_reviews ?? 0).toLocaleString(locale) }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('auditor.approvedToday') }}</p>
          <p class="kpi-value text-success-600 dark:text-success-400">{{ (data.approved_today ?? 0).toLocaleString(locale) }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.rejected') }}</p>
          <p class="kpi-value text-danger-600 dark:text-danger-400">{{ (data.rejected_count ?? 0).toLocaleString(locale) }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('auditor.extensionRequests') }}</p>
          <p class="kpi-value">{{ (data.extension_requests ?? 0).toLocaleString(locale) }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.overdue') }}</p>
          <p class="kpi-value text-warning-700 dark:text-warning-400">{{ (data.overdue_count ?? 0).toLocaleString(locale) }}</p>
        </div>
      </div>

      <!-- KPI cards (employee / coordinator / executive) -->
      <div v-if="data.stats" class="grid-kpi">
        <div v-for="stat in stats" :key="stat.key" class="kpi-card">
          <p class="kpi-label">{{ stat.label }}</p>
          <p class="kpi-value" :class="stat.color">
            {{ (data.stats?.[stat.key] ?? 0).toLocaleString(locale) }}
          </p>
        </div>
      </div>

      <!-- Completion rate + donut chart -->
      <div v-if="data.stats" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <!-- Completion rate -->
        <div class="card p-5">
          <h3 class="card-title mb-4">{{ t('dashboard.completionRate') }}</h3>
          <div class="relative h-3 bg-surface-inset rounded-full overflow-hidden mb-2">
            <div
              class="absolute inset-y-0 start-0 bg-success-500 rounded-full transition-all duration-700"
              :style="{ width: `${data.stats?.completion_rate ?? 0}%` }"
            />
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-content-subtle">0%</span>
            <span class="font-bold text-success-600 dark:text-success-400 text-lg">{{ (data.stats?.completion_rate ?? 0).toFixed(1) }}%</span>
            <span class="text-content-subtle">100%</span>
          </div>
        </div>

        <!-- Donut chart -->
        <div class="card p-5 lg:col-span-2">
          <h3 class="card-title mb-4">{{ t('documents.title') }}</h3>
          <div class="flex flex-col sm:flex-row sm:items-center gap-6">
            <!-- Responsive chart box: fixed height, fluid width -->
            <div class="relative h-48 w-full sm:w-48 sm:shrink-0">
              <canvas ref="chartRef" />
            </div>
            <div class="space-y-2 flex-1 w-full">
              <div v-for="item in chartLegend" :key="item.key" class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="h-3 w-3 rounded-full shrink-0" :style="{ background: item.color }" />
                  <span class="text-xs text-content-muted truncate">{{ item.label }}</span>
                </div>
                <span class="text-xs font-semibold text-content tabular-nums">
                  {{ (data.stats?.[item.key] ?? 0).toLocaleString(locale) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Department comparison table (super-admin / executive) -->
      <div v-if="authStore.isSuperAdmin || authStore.isExecutive" class="card overflow-hidden">
        <div class="card-header">
          <h3 class="card-title">{{ t('departments.title') }}</h3>
        </div>
        <div class="table-wrapper rounded-none border-0 border-t border-line">
          <table class="table">
            <thead>
              <tr>
                <SortableTh field="name_ar" :sort-key="deptSortKey" :sort-dir="deptSortDir" @sort="sortDepts">{{ t('departments.nameAr') }}</SortableTh>
                <SortableTh field="total" :sort-key="deptSortKey" :sort-dir="deptSortDir" @sort="sortDepts">{{ t('dashboard.total') }}</SortableTh>
                <SortableTh field="approved" :sort-key="deptSortKey" :sort-dir="deptSortDir" @sort="sortDepts">{{ t('dashboard.approved') }}</SortableTh>
                <SortableTh field="under_review" :sort-key="deptSortKey" :sort-dir="deptSortDir" @sort="sortDepts">{{ t('dashboard.underReview') }}</SortableTh>
                <SortableTh field="rejected" :sort-key="deptSortKey" :sort-dir="deptSortDir" @sort="sortDepts">{{ t('dashboard.rejected') }}</SortableTh>
                <SortableTh field="completion_rate" :sort-key="deptSortKey" :sort-dir="deptSortDir" @sort="sortDepts" class="min-w-[10rem]">{{ t('dashboard.completionRate') }}</SortableTh>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedDepts.length">
                <td colspan="6" class="text-center py-8 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="dept in sortedDepts" :key="dept.id">
                <td class="font-medium text-content">{{ dept.name_ar || dept.name }}</td>
                <td>{{ dept.total }}</td>
                <td><span class="badge-approved">{{ dept.approved }}</span></td>
                <td><span class="badge-under-review">{{ dept.under_review }}</span></td>
                <td><span class="badge-rejected">{{ dept.rejected }}</span></td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-surface-inset rounded-full overflow-hidden">
                      <div class="h-full bg-success-500 rounded-full" :style="{ width: `${dept.completion_rate ?? 0}%` }" />
                    </div>
                    <span class="text-xs font-medium text-content-muted w-10 text-end tabular-nums">{{ (dept.completion_rate ?? 0).toFixed(0) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent activity -->
      <div v-if="data.recent_activity" class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('dashboard.recentActivity') }}</h3>
        </div>
        <div class="divide-y divide-line">
          <div v-if="!data.recent_activity?.length" class="px-6 py-8 text-center text-content-subtle text-sm">
            {{ t('common.noData') }}
          </div>
          <div
            v-for="(act, i) in data.recent_activity"
            :key="i"
            class="flex items-start gap-3 px-4 sm:px-6 py-3"
          >
            <div class="h-8 w-8 rounded-full bg-brand-subtle flex items-center justify-center shrink-0 text-sm">
              📄
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-content-muted truncate">{{ act.description }}</p>
              <p class="text-xs text-content-subtle mt-0.5">{{ formatDate(act.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { dashboardService } from '@/services/index'
import { chartTheme, baseChartOptions } from '@/utils/chartTheme'
import SortableTh from '@/components/common/SortableTh.vue'
import { useSort } from '@/composables/useSort'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore  = useAppStore()
const locale    = computed(() => appStore.locale)

const loading  = ref(true)
const data     = ref(null)
const chartRef = ref(null)
let chartInstance = null

// Sortable department comparison rows.
const deptRows = computed(() => data.value?.departments || [])
const { sorted: sortedDepts, sortKey: deptSortKey, sortDir: deptSortDir, sortBy: sortDepts } = useSort(deptRows)

const stats = computed(() => [
  { key: 'total',        label: t('dashboard.total'),       color: 'text-content' },
  { key: 'approved',     label: t('dashboard.approved'),    color: 'text-success-600 dark:text-success-400' },
  { key: 'under_review', label: t('dashboard.underReview'), color: 'text-warning-600 dark:text-warning-400' },
  { key: 'rejected',     label: t('dashboard.rejected'),    color: 'text-danger-600 dark:text-danger-400' },
  { key: 'draft',        label: t('dashboard.draft'),       color: 'text-content-muted' },
  { key: 'overdue',      label: t('dashboard.overdue'),     color: 'text-warning-700 dark:text-warning-400' },
])

// Legend swatches use the same theme-aware data-viz colors as the chart.
const chartLegend = computed(() => {
  const c = chartTheme().status
  return [
    { key: 'approved',     label: t('dashboard.approved'),    color: c.approved },
    { key: 'under_review', label: t('dashboard.underReview'), color: c.under_review },
    { key: 'rejected',     label: t('dashboard.rejected'),    color: c.rejected },
    { key: 'draft',        label: t('dashboard.draft'),       color: c.draft },
    { key: 'overdue',      label: t('dashboard.overdue'),     color: c.overdue },
  ]
})

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function renderChart() {
  if (!chartRef.value || !data.value) return
  try {
    const { Chart, DoughnutController, ArcElement, Tooltip, Legend } = await import('chart.js')
    Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

    if (chartInstance) { chartInstance.destroy(); chartInstance = null }

    const s = data.value.stats || {}
    const th = chartTheme()
    chartInstance = new Chart(chartRef.value, {
      type: 'doughnut',
      data: {
        labels: chartLegend.value.map(l => l.label),
        datasets: [{
          data: chartLegend.value.map(l => s[l.key] ?? 0),
          backgroundColor: chartLegend.value.map(l => l.color),
          borderWidth: 2,
          borderColor: th.border,   // blends arcs with the card surface
        }],
      },
      options: {
        ...baseChartOptions(appStore.isRTL),
        cutout: '70%',
      },
    })
  } catch (e) {
    console.warn('Chart.js not available:', e.message)
  }
}

// Re-render when the theme or language changes so colors/RTL stay in sync.
watch(() => [appStore.theme, appStore.locale], () => nextTick(renderChart))

onMounted(async () => {
  try {
    data.value = await dashboardService.get()
  } catch (err) {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
    await nextTick()
    renderChart()
  }
})

onBeforeUnmount(() => {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
})
</script>
