<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('workflow.requirementsImport') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('workflow.requirementsImportSubtitle') }}</p>
    </div>

    <div class="card p-4 flex flex-wrap items-center gap-3">
      <button class="btn-secondary" @click="downloadTemplate">{{ t('workflow.downloadTemplate') }}</button>
      <select v-model="cycleId" class="input w-auto">
        <option value="">{{ t('workflow.selectCycle') }}</option>
        <option v-for="c in cycles" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="card p-4 space-y-3">
      <h2 class="card-title">{{ t('workflow.uploadCompletedFile') }}</h2>
      <input type="file" accept=".xlsx" @change="onFileChange" class="input" />
      <button class="btn-primary" :disabled="!file || !cycleId || previewing" @click="preview">{{ t('workflow.previewImport') }}</button>
    </div>

    <div v-if="result" class="card p-4 space-y-4">
      <h2 class="card-title">{{ t('workflow.importPreview') }}</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="kpi-card"><p class="kpi-label">{{ t('workflow.totalRows') }}</p><p class="kpi-value">{{ result.summary.total_rows }}</p></div>
        <div class="kpi-card"><p class="kpi-label">{{ t('workflow.validRows') }}</p><p class="kpi-value text-success-600">{{ result.summary.valid_rows }}</p></div>
        <div class="kpi-card"><p class="kpi-label">{{ t('workflow.newStandards') }}</p><p class="kpi-value">{{ result.summary.new_standards }}</p></div>
        <div class="kpi-card"><p class="kpi-label">{{ t('workflow.errorCount') }}</p><p class="kpi-value text-danger-600">{{ result.summary.error_count }}</p></div>
      </div>

      <div v-if="result.errors.length" class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-content">{{ t('workflow.errors') }}</h3>
          <button class="btn-secondary btn-sm" @click="downloadErrorReport">{{ t('workflow.downloadErrorReport') }}</button>
        </div>
        <div class="max-h-64 overflow-y-auto">
          <table class="w-full text-xs">
            <thead><tr class="text-start text-content-subtle"><th class="px-2 py-1">{{ t('workflow.row') }}</th><th class="px-2 py-1">{{ t('workflow.column') }}</th><th class="px-2 py-1">{{ t('common.message') }}</th></tr></thead>
            <tbody>
              <tr v-for="(e, i) in result.errors" :key="i" class="border-t border-line">
                <td class="px-2 py-1">{{ e.row }}</td>
                <td class="px-2 py-1">{{ e.column }}</td>
                <td class="px-2 py-1">{{ locale === 'ar' ? e.message_ar : e.message_en }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button v-if="result.summary.error_count === 0" class="btn-primary" :disabled="confirming" @click="confirmImport">
        {{ t('workflow.confirmImport') }}
      </button>
    </div>

    <div v-if="importedResult" class="card p-4 border-success-200 bg-success-50 dark:bg-success-950/30">
      <p class="text-sm text-success-700 dark:text-success-300">
        {{ t('workflow.importCompleted', { created: importedResult.created, updated: importedResult.updated }) }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { qiyasImportService, cyclesService } from '@/services/index'
import { saveBlob } from '@/composables/useFileDownload'
import { useAppStore } from '@/stores/app'

const { t, locale } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const cycles = ref([])
const cycleId = ref('')
const file = ref(null)
const previewing = ref(false)
const confirming = ref(false)
const result = ref(null)
const importedResult = ref(null)

const programCode = () => route.params.programCode

function onFileChange(e) {
  file.value = e.target.files[0] || null
  result.value = null
  importedResult.value = null
}

async function downloadTemplate() {
  const blob = await qiyasImportService.downloadTemplate(programCode(), cycleId.value || undefined)
  saveBlob(blob, 'qiyas-requirements-template.xlsx')
}

async function preview() {
  previewing.value = true
  try {
    result.value = await qiyasImportService.preview(programCode(), file.value, cycleId.value)
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    previewing.value = false
  }
}

async function confirmImport() {
  confirming.value = true
  try {
    const res = await qiyasImportService.confirm(programCode(), result.value.import_log_id)
    importedResult.value = res.data
    appStore.showToast(t('workflow.importCompletedShort'), 'success')
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    confirming.value = false
  }
}

async function downloadErrorReport() {
  const blob = await qiyasImportService.downloadErrorReport(programCode(), result.value.import_log_id)
  saveBlob(blob, 'import-errors.xlsx')
}

onMounted(async () => {
  const res = await cyclesService.list(programCode())
  cycles.value = res.data
})
</script>
