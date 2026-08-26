<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('workflow.slaSettings') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('workflow.slaSettingsSubtitle') }}</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <form v-else class="space-y-4" @submit.prevent="save">
      <div class="card p-4">
        <h2 class="card-title mb-3">{{ t('workflow.slaStageValues') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="stage in stages" :key="stage.key" class="space-y-1">
            <label class="label">{{ t(`workflow.stages.${stage.key}`) }}</label>
            <p class="text-xs text-content-subtle">{{ t(`workflow.slaExplain.${stage.key}`) }}</p>
            <div class="flex gap-2">
              <input type="number" min="1" v-model.number="form[stage.valueField]" class="input w-24" />
              <select v-model="form[stage.unitField]" class="input">
                <option value="hours">{{ t('workflow.hours') }}</option>
                <option value="days">{{ t('workflow.days') }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-4 space-y-3">
        <h2 class="card-title">{{ t('workflow.slaCalendar') }}</h2>
        <div class="flex items-center gap-2">
          <input id="business-days" type="checkbox" v-model="form.use_business_days" class="h-4 w-4" />
          <label for="business-days" class="text-sm text-content">{{ t('workflow.useBusinessDays') }}</label>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="label">{{ t('workflow.workingDayStart') }}</label>
            <input type="time" v-model="form.working_day_start" class="input" />
          </div>
          <div>
            <label class="label">{{ t('workflow.workingDayEnd') }}</label>
            <input type="time" v-model="form.working_day_end" class="input" />
          </div>
          <div>
            <label class="label">{{ t('workflow.timezone') }}</label>
            <input type="text" v-model="form.timezone" class="input" />
          </div>
        </div>
        <div>
          <label class="label">{{ t('workflow.workingDays') }}</label>
          <div class="flex flex-wrap gap-3">
            <label v-for="d in weekdays" :key="d.value" class="flex items-center gap-1 text-sm">
              <input type="checkbox" :value="d.value" v-model="form.working_days" />
              {{ d.label }}
            </label>
          </div>
        </div>
      </div>

      <div class="card p-4 space-y-3">
        <h2 class="card-title">{{ t('workflow.slaRules') }}</h2>
        <div>
          <label class="label">{{ t('workflow.warningThreshold') }}</label>
          <input type="number" min="1" max="100" v-model.number="form.warning_threshold_percentage" class="input w-24" />
        </div>
        <div class="flex items-center gap-2">
          <input id="pause-return" type="checkbox" v-model="form.pause_sla_during_returned_revision" class="h-4 w-4" />
          <label for="pause-return" class="text-sm text-content">{{ t('workflow.pauseDuringReturn') }}</label>
        </div>
        <div class="flex items-center gap-2">
          <input id="pause-ext" type="checkbox" v-model="form.pause_sla_during_pending_extension" class="h-4 w-4" />
          <label for="pause-ext" class="text-sm text-content">{{ t('workflow.pauseDuringExtension') }}</label>
        </div>
        <div class="flex items-center gap-2">
          <input id="enabled" type="checkbox" v-model="form.is_enabled" class="h-4 w-4" />
          <label for="enabled" class="text-sm text-content">{{ t('workflow.slaEnabled') }}</label>
        </div>
      </div>

      <button type="submit" class="btn-primary" :disabled="saving">{{ t('common.save') }}</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { slaSettingsService } from '@/services/index'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const loading = ref(true)
const saving = ref(false)
const form = ref({})

const stages = [
  { key: 'employee', valueField: 'employee_submission_sla_value', unitField: 'employee_submission_sla_unit' },
  { key: 'department_manager', valueField: 'department_manager_review_sla_value', unitField: 'department_manager_review_sla_unit' },
  { key: 'auditor', valueField: 'auditor_review_sla_value', unitField: 'auditor_review_sla_unit' },
  { key: 'program_manager', valueField: 'program_manager_review_sla_value', unitField: 'program_manager_review_sla_unit' },
]

const weekdays = [
  { value: 0, label: t('workflow.weekday.0') }, { value: 1, label: t('workflow.weekday.1') },
  { value: 2, label: t('workflow.weekday.2') }, { value: 3, label: t('workflow.weekday.3') },
  { value: 4, label: t('workflow.weekday.4') }, { value: 5, label: t('workflow.weekday.5') },
  { value: 6, label: t('workflow.weekday.6') },
]

async function load() {
  loading.value = true
  try {
    form.value = await slaSettingsService.get(route.params.programCode)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    form.value = await slaSettingsService.update(route.params.programCode, form.value)
    appStore.showToast(t('common.saved'), 'success')
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
