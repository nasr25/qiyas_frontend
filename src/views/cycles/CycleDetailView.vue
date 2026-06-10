<template>
  <div class="space-y-6">
    <!-- Back -->
    <RouterLink to="/cycles" class="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline dark:text-primary-400">
      <svg class="h-4 w-4 rotate-180 rtl:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      {{ t('cycles.title') }}
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="cycle">
      <!-- Cycle header -->
      <div class="card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h1 class="text-xl font-bold text-content">{{ cycle.name }}</h1>
              <StatusBadge :status="cycle.status" />
            </div>
            <div class="flex flex-wrap gap-4 text-sm text-content-muted mt-2">
              <span>{{ t('cycles.year') }}: <strong class="text-content">{{ cycle.year }}</strong></span>
              <span>{{ t('cycles.startDate') }}: <strong class="text-content">{{ formatDate(cycle.start_date) }}</strong></span>
              <span>{{ t('cycles.endDate') }}: <strong class="text-content">{{ formatDate(cycle.end_date) }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Standards tab -->
      <div class="card">
        <div class="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-content">{{ t('standards.title') }}</h2>
          <div v-if="(authStore.isSuperAdmin || authStore.isCoordinator) && !cycleReadOnly" class="flex flex-wrap gap-2">
            <button class="btn-secondary btn-sm" :disabled="downloadingTemplate" @click="downloadTemplate">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
              {{ t('standards.downloadTemplate') }}
            </button>
            <button class="btn-secondary btn-sm" @click="openImport">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12" /></svg>
              {{ t('standards.importExcel') }}
            </button>
            <button class="btn-primary btn-sm" @click="showAddStandard = true">
              + {{ t('standards.new') }}
            </button>
          </div>
        </div>
        <div class="table-wrapper rounded-none border-0">
          <table class="table">
            <thead>
              <tr>
                <SortableTh field="standard_number" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('standards.number') }}</SortableTh>
                <SortableTh field="name_ar" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('standards.nameAr') }}</SortableTh>
                <th>{{ t('standards.departments') }}</th>
                <SortableTh field="requirements_count" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('standards.requirements') }}</SortableTh>
                <SortableTh field="due_date" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('standards.dueDate') }}</SortableTh>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sorted.length">
                <td colspan="6" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="std in sorted" :key="std.id">
                <td class="font-mono font-medium text-primary-700 dark:text-primary-400">{{ std.standard_number }}</td>
                <td>{{ std.name_ar }}</td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="d in (std.departments || []).slice(0, 3)" :key="d.id" class="badge-draft text-xs">{{ d.name_ar }}</span>
                    <span v-if="(std.departments || []).length > 3" class="badge-draft text-xs">+{{ std.departments.length - 3 }}</span>
                  </div>
                </td>
                <td>{{ std.requirements_count ?? 0 }}</td>
                <td>{{ formatDate(std.due_date) }}</td>
                <td>
                  <RouterLink :to="`/standards/${std.id}`" class="btn-secondary btn-sm">{{ t('common.view') }}</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Add Standard Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddStandard" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="showAddStandard = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showAddStandard = false" />
          <div class="relative card w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <h3 class="text-lg font-semibold p-6 pb-3 border-b border-line shrink-0">{{ t('standards.new') }}</h3>
            <form @submit.prevent="handleAddStandard" class="space-y-4 p-6 overflow-y-auto">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('standards.number') }}</label>
                  <input v-model="stdForm.standard_number" class="input" required />
                </div>
                <div>
                  <label class="label">{{ t('standards.version') }}</label>
                  <input v-model="stdForm.version" class="input" />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('standards.perspective') }}</label>
                  <input v-model="stdForm.perspective" class="input" dir="rtl" />
                </div>
                <div>
                  <label class="label">{{ t('standards.axis') }}</label>
                  <input v-model="stdForm.axis" class="input" dir="rtl" />
                </div>
              </div>
              <div>
                <label class="label">{{ t('standards.nameAr') }}</label>
                <input v-model="stdForm.name_ar" class="input" required dir="rtl" />
              </div>
              <div>
                <label class="label">{{ t('standards.nameEn') }}</label>
                <input v-model="stdForm.name_en" class="input" dir="ltr" />
              </div>
              <div>
                <label class="label">{{ t('standards.objective') }}</label>
                <textarea v-model="stdForm.description" class="input" rows="2" dir="rtl" />
              </div>
              <div>
                <label class="label">{{ t('standards.applicationRequirements') }}</label>
                <textarea v-model="stdForm.application_requirements" class="input" rows="3" dir="rtl" />
              </div>
              <div>
                <label class="label">{{ t('standards.evidenceDocuments') }}</label>
                <textarea v-model="stdForm.evidence_documents" class="input" rows="3" dir="rtl" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('standards.scope') }}</label>
                  <input v-model="stdForm.scope" class="input" dir="rtl" />
                </div>
                <div>
                  <label class="label">{{ t('standards.references') }}</label>
                  <input v-model="stdForm.related_references" class="input" dir="rtl" />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('standards.weight') }}</label>
                  <input v-model="stdForm.weight" type="number" step="0.1" class="input" />
                </div>
                <div>
                  <label class="label">{{ t('standards.dueDate') }}</label>
                  <input v-model="stdForm.due_date" type="date" class="input" />
                </div>
              </div>
              <!-- Departments -->
              <div>
                <label class="label">{{ t('standards.departments') }}</label>
                <div class="max-h-40 overflow-y-auto rounded-lg border border-line p-2 space-y-1">
                  <label v-for="d in departments" :key="d.id" class="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-surface-inset cursor-pointer">
                    <input type="checkbox" :value="d.id" v-model="stdForm.department_ids" class="h-4 w-4 rounded border-line text-primary-600" />
                    <span class="text-sm text-content">{{ d.name_ar }}</span>
                  </label>
                  <p v-if="!departments.length" class="text-sm text-content-subtle py-3 text-center">{{ t('common.noData') }}</p>
                </div>
              </div>
            </form>
            <div class="flex justify-end gap-3 p-6 pt-3 border-t border-line shrink-0">
              <button type="button" class="btn-secondary" @click="showAddStandard = false">{{ t('common.cancel') }}</button>
              <button type="button" class="btn-primary" :disabled="saving" @click="handleAddStandard">{{ saving ? t('common.loading') : t('common.save') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Import Standards (Excel) Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showImport" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="closeImport">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeImport" />
          <div class="relative card w-full max-w-lg p-6 shadow-xl" role="dialog" aria-modal="true">
            <h3 class="text-lg font-semibold mb-1">{{ t('standards.importExcel') }}</h3>
            <p class="text-sm text-content-muted mb-4">{{ t('standards.importHint') }}</p>

            <!-- Drop zone -->
            <label
              class="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-line px-4 py-8 text-center cursor-pointer hover:border-brand hover:bg-surface-inset transition-colors"
              @dragover.prevent="dragOver = true"
              @dragleave.prevent="dragOver = false"
              @drop.prevent="onDrop"
              :class="dragOver ? 'border-brand bg-surface-inset' : ''"
            >
              <svg class="h-8 w-8 text-content-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <span class="text-sm text-content">{{ importFile ? importFile.name : t('standards.dropFile') }}</span>
              <span class="text-xs text-content-subtle">xlsx, xls, csv · {{ t('common.max') }} 5MB</span>
              <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFilePick" />
            </label>

            <!-- Result summary -->
            <div v-if="importResult" class="mt-4 space-y-2 text-sm">
              <div class="flex flex-wrap gap-4">
                <span class="text-success-600 dark:text-success-400 font-medium">{{ t('standards.created') }}: {{ importResult.created }}</span>
                <span class="text-info-600 dark:text-info-400 font-medium">{{ t('standards.updated') }}: {{ importResult.updated }}</span>
                <span v-if="importResult.errors?.length" class="text-danger-600 dark:text-danger-400 font-medium">{{ t('common.errors') }}: {{ importResult.errors.length }}</span>
              </div>
              <ul v-if="importResult.errors?.length" class="max-h-40 overflow-y-auto rounded-lg bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-900 p-3 space-y-1">
                <li v-for="(e, i) in importResult.errors" :key="i" class="text-xs text-danger-700 dark:text-danger-300">
                  {{ t('common.row') }} {{ e.row }}: {{ e.message }}
                </li>
              </ul>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" class="btn-secondary" @click="closeImport">{{ t('common.close') }}</button>
              <button type="button" class="btn-primary" :disabled="!importFile || importing" @click="handleImport">
                {{ importing ? t('common.loading') : t('standards.runImport') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { cyclesService, standardsService, departmentsService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'
import SortableTh from '@/components/common/SortableTh.vue'
import { useSort } from '@/composables/useSort'

const { t } = useI18n()
const route     = useRoute()
const authStore = useAuthStore()
const appStore  = useAppStore()

const loading        = ref(true)
const saving         = ref(false)
const cycle          = ref(null)
const standards      = ref([])
const { sorted, sortKey, sortDir, sortBy } = useSort(standards)
const departments    = ref([])
const showAddStandard = ref(false)

const emptyStdForm = () => ({
  standard_number: '', name_ar: '', name_en: '', version: '', weight: '', due_date: '',
  perspective: '', axis: '', description: '', application_requirements: '',
  evidence_documents: '', scope: '', related_references: '', department_ids: [],
})
const stdForm = ref(emptyStdForm())

// Import state
const showImport         = ref(false)
const importFile         = ref(null)
const importing          = ref(false)
const importResult       = ref(null)
const dragOver           = ref(false)
const downloadingTemplate = ref(false)

const cycleReadOnly = computed(() => ['closed', 'archived'].includes(cycle.value?.status))

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

async function load() {
  loading.value = true
  try {
    const id = route.params.id
    cycle.value = await cyclesService.get(id)
    const [, deptsRes] = await Promise.all([
      refreshStandards(),
      departmentsService.list().catch(() => ({ data: [] })),
    ])
    departments.value = deptsRes.data || deptsRes || []
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function refreshStandards() {
  // High per_page so the cycle overview lists all its standards (catalog has 89).
  const res = await standardsService.list(cycle.value.id, { per_page: 500 })
  standards.value = res.data || res
}

async function handleAddStandard() {
  saving.value = true
  try {
    await standardsService.create(cycle.value.id, stdForm.value)
    appStore.showToast(t('common.success'), 'success')
    showAddStandard.value = false
    stdForm.value = emptyStdForm()
    await refreshStandards()
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

// ── Excel template / import ──────────────────────────────────────────────────
async function downloadTemplate() {
  downloadingTemplate.value = true
  try {
    const blob = await standardsService.template(cycle.value.id)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = 'standards-import-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    downloadingTemplate.value = false
  }
}

function openImport() {
  importFile.value = null
  importResult.value = null
  showImport.value = true
}

function closeImport() {
  showImport.value = false
}

function onFilePick(e) {
  importFile.value = e.target.files?.[0] || null
  importResult.value = null
}

function onDrop(e) {
  dragOver.value = false
  importFile.value = e.dataTransfer.files?.[0] || null
  importResult.value = null
}

async function handleImport() {
  if (!importFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const res = await standardsService.importExcel(cycle.value.id, importFile.value)
    importResult.value = res.data
    const { created, updated, errors } = res.data
    appStore.showToast(
      t('standards.importDone', { created, updated, errors: errors?.length || 0 }),
      errors?.length ? 'warning' : 'success',
    )
    await refreshStandards()
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    importing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
