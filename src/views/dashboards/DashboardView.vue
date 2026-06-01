<template>
  <div class="space-y-6">
    <!-- Cycle info -->
    <div v-if="data?.cycle" class="card p-5 flex flex-wrap items-center gap-4 bg-gradient-to-e from-primary-800 to-primary-700 text-white border-0">
      <div class="flex-1 min-w-0">
        <p class="text-primary-200 text-xs font-medium uppercase tracking-wide mb-1">{{ t('cycles.title') }}</p>
        <h2 class="text-lg font-bold truncate">{{ data.cycle.name }}</h2>
      </div>
      <div class="flex flex-wrap gap-4 text-sm">
        <div>
          <p class="text-primary-300 text-xs">{{ t('cycles.year') }}</p>
          <p class="font-semibold">{{ data.cycle.year }}</p>
        </div>
        <div>
          <p class="text-primary-300 text-xs">{{ t('common.status') }}</p>
          <span class="badge badge-approved capitalize">{{ data.cycle.status }}</span>
        </div>
        <div>
          <p class="text-primary-300 text-xs">{{ t('cycles.endDate') }}</p>
          <p class="font-semibold">{{ formatDate(data.cycle.end_date) }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="data">
      <!-- Stat cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <div v-for="stat in stats" :key="stat.key" class="card p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ stat.label }}</p>
          <p class="text-2xl font-bold" :class="stat.color">
            {{ (data.stats?.[stat.key] ?? 0).toLocaleString(locale) }}
          </p>
        </div>
      </div>

      <!-- Completion rate + donut chart -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Completion rate -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{{ t('dashboard.completionRate') }}</h3>
          <div class="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              class="absolute inset-y-0 start-0 bg-green-500 rounded-full transition-all duration-700"
              :style="{ width: `${data.stats?.completion_rate ?? 0}%` }"
            />
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">0%</span>
            <span class="font-bold text-green-600 text-lg">{{ (data.stats?.completion_rate ?? 0).toFixed(1) }}%</span>
            <span class="text-gray-500">100%</span>
          </div>
        </div>

        <!-- Donut chart -->
        <div class="card p-5 col-span-1 lg:col-span-2">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{{ t('documents.title') }}</h3>
          <div class="flex items-center gap-6">
            <canvas ref="chartRef" width="160" height="160" class="shrink-0" />
            <div class="space-y-2 flex-1">
              <div v-for="item in chartLegend" :key="item.key" class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="h-3 w-3 rounded-full shrink-0" :style="{ background: item.color }" />
                  <span class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ item.label }}</span>
                </div>
                <span class="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {{ (data.stats?.[item.key] ?? 0).toLocaleString(locale) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Department table (super-admin / executive) -->
      <div v-if="authStore.isSuperAdmin || authStore.isExecutive" class="card">
        <div class="card-header">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('departments.title') }}</h3>
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
                <th>{{ t('dashboard.completionRate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data.departments?.length">
                <td colspan="6" class="text-center py-8 text-gray-400">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="dept in data.departments" :key="dept.id">
                <td class="font-medium">{{ dept.name_ar || dept.name }}</td>
                <td>{{ dept.total }}</td>
                <td><span class="badge-approved">{{ dept.approved }}</span></td>
                <td><span class="badge-under-review">{{ dept.under_review }}</span></td>
                <td><span class="badge-rejected">{{ dept.rejected }}</span></td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full bg-green-500 rounded-full" :style="{ width: `${dept.completion_rate ?? 0}%` }" />
                    </div>
                    <span class="text-xs font-medium text-gray-600 w-10 text-end">{{ (dept.completion_rate ?? 0).toFixed(0) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="card">
        <div class="card-header">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('dashboard.recentActivity') }}</h3>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-if="!data.recent_activity?.length" class="px-6 py-8 text-center text-gray-400 text-sm">
            {{ t('common.noData') }}
          </div>
          <div
            v-for="(act, i) in data.recent_activity"
            :key="i"
            class="flex items-start gap-3 px-6 py-3"
          >
            <div class="h-8 w-8 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0 text-sm">
              📄
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ act.description }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(act.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { dashboardService } from '@/services/index'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore  = useAppStore()
const locale    = computed(() => appStore.locale)

const loading  = ref(true)
const data     = ref(null)
const chartRef = ref(null)

const stats = computed(() => [
  { key: 'total',        label: t('dashboard.total'),       color: 'text-gray-900 dark:text-gray-100' },
  { key: 'approved',     label: t('dashboard.approved'),    color: 'text-green-600' },
  { key: 'under_review', label: t('dashboard.underReview'), color: 'text-yellow-600' },
  { key: 'rejected',     label: t('dashboard.rejected'),    color: 'text-red-600' },
  { key: 'draft',        label: t('dashboard.draft'),       color: 'text-gray-500' },
  { key: 'overdue',      label: t('dashboard.overdue'),     color: 'text-orange-600' },
])

const chartLegend = computed(() => [
  { key: 'approved',     label: t('dashboard.approved'),    color: '#22c55e' },
  { key: 'under_review', label: t('dashboard.underReview'), color: '#eab308' },
  { key: 'rejected',     label: t('dashboard.rejected'),    color: '#ef4444' },
  { key: 'draft',        label: t('dashboard.draft'),       color: '#9ca3af' },
  { key: 'overdue',      label: t('dashboard.overdue'),     color: '#f97316' },
])

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function renderChart() {
  if (!chartRef.value || !data.value) return
  try {
    const { Chart, DoughnutController, ArcElement, Tooltip, Legend } = await import('chart.js')
    Chart.register(DoughnutController, ArcElement, Tooltip, Legend)
    const s = data.value.stats || {}
    new Chart(chartRef.value, {
      type: 'doughnut',
      data: {
        labels: chartLegend.value.map(l => l.label),
        datasets: [{
          data: chartLegend.value.map(l => s[l.key] ?? 0),
          backgroundColor: chartLegend.value.map(l => l.color),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { rtl: appStore.isRTL } },
      },
    })
  } catch (e) {
    console.warn('Chart.js not installed:', e.message)
  }
}

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
</script>
