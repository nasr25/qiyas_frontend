<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('nav.executiveDashboard') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('dashboard.executiveSubtitle') }}</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="data">
      <!-- Overall KPIs -->
      <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.completionRate') }}</p>
          <p class="kpi-value text-brand">{{ data.overall_completion_rate }}%</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.approved') }}</p>
          <p class="kpi-value text-success-600 dark:text-success-400">{{ (data.overall_stats.approved ?? 0).toLocaleString(locale) }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.underReview') }}</p>
          <p class="kpi-value text-warning-600 dark:text-warning-400">{{ (data.overall_stats.under_review ?? 0).toLocaleString(locale) }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">{{ t('dashboard.overdue') }}</p>
          <p class="kpi-value text-danger-600 dark:text-danger-400">{{ (data.overall_stats.overdue ?? 0).toLocaleString(locale) }}</p>
        </div>
      </div>

      <!-- Per-program breakdown -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">{{ t('programs.title') }}</h2>
        </div>
        <div class="card-body space-y-3">
          <div
            v-for="p in data.programs"
            :key="p.program.code"
            class="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface-inset"
          >
            <div class="min-w-0">
              <p class="font-medium text-content truncate">{{ p.program.name }}</p>
              <p class="text-xs text-content-subtle truncate">{{ p.cycle?.name || '—' }}</p>
            </div>
            <div class="text-end shrink-0">
              <p class="font-bold text-brand">{{ p.completion_rate }}%</p>
              <p class="text-xs text-content-subtle">{{ (p.stats.total ?? 0).toLocaleString(locale) }} {{ t('nav.documents') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Department comparison -->
      <div class="card overflow-x-auto">
        <div class="card-header">
          <h2 class="card-title">{{ t('reports.byDepartment') }}</h2>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-start text-content-subtle border-b border-line">
              <th class="px-4 py-2 text-start">{{ t('departments.title') }}</th>
              <th class="px-4 py-2 text-end">{{ t('dashboard.total') }}</th>
              <th class="px-4 py-2 text-end">{{ t('dashboard.approved') }}</th>
              <th class="px-4 py-2 text-end">{{ t('dashboard.completionRate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in data.department_comparison" :key="d.id" class="border-b border-line last:border-0">
              <td class="px-4 py-2 font-medium text-content">{{ locale === 'ar' ? d.name_ar : d.name_en }}</td>
              <td class="px-4 py-2 text-end tabular-nums">{{ d.total.toLocaleString(locale) }}</td>
              <td class="px-4 py-2 text-end tabular-nums">{{ d.approved.toLocaleString(locale) }}</td>
              <td class="px-4 py-2 text-end font-semibold text-brand">{{ d.completion_rate }}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="kpi-card w-fit">
        <p class="kpi-label">{{ t('dashboard.upcomingDeadlines') }}</p>
        <p class="kpi-value text-warning-600 dark:text-warning-400">{{ data.upcoming_deadlines }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { executiveDashboardService } from '@/services/index'

const { t, locale } = useI18n()
const loading = ref(true)
const data = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    data.value = await executiveDashboardService.get()
  } finally {
    loading.value = false
  }
})
</script>
