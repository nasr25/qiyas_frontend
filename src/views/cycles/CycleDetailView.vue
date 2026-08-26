<template>
  <div class="page">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="cycle">
      <!-- Cycle header -->
      <div class="card p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-bold text-content" data-testid="cycle-name">{{ cycle.name }}</h1>
            <p class="text-sm text-content-subtle mt-1">
              {{ cycle.year }} · {{ cycle.start_date }} → {{ cycle.end_date }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge" :class="cycle.status === 'active' ? 'badge-approved' : 'badge-draft'">
              {{ t(`cycles.statusLabels.${cycle.status}`) }}
            </span>
            <span v-if="structureVersion" class="badge badge-draft" data-testid="cycle-structure-version">
              {{ t('content.structureVersion') }} {{ structureVersion }}
            </span>
          </div>
        </div>
      </div>

      <!-- No structure yet: authoring is impossible until one exists. -->
      <div v-if="!levels.length" class="card p-8 text-center space-y-3" data-testid="no-structure">
        <p class="text-content-subtle">{{ t('content.noStructure') }}</p>
        <RouterLink class="btn-primary inline-block" :to="`/programs/${programCode()}/settings/structure`">
          {{ t('content.goToStructure') }}
        </RouterLink>
      </div>

      <template v-else>
        <!-- Hierarchy browser -->
        <section class="card p-5 space-y-4" data-testid="hierarchy-browser">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-bold text-content">{{ t('content.hierarchyTitle') }}</h2>
            <div class="flex items-center gap-2">
              <input
                v-model="searchTerm"
                class="input w-56"
                :placeholder="t('content.search')"
                data-testid="node-search-input"
                @keyup.enter="runSearch"
              />
              <button v-if="canManage && nextLevel" class="btn-primary" data-testid="add-node-button" @click="openCreate()">
                + {{ currentParent ? t('content.addChild') : t('content.addRoot') }}
                <span class="opacity-80">({{ nextLevel.name }})</span>
              </button>
            </div>
          </div>

          <HierarchyBreadcrumb :trail="trail" :root-label="cycle.name" @navigate="navigateTo" />

          <p class="text-sm text-content-subtle">
            <span class="font-medium text-content">{{ currentLevel?.plural_name ?? currentLevel?.name ?? rootLevel?.plural_name }}</span>
          </p>

          <!-- Search results replace the browser while a term is active. -->
          <div v-if="searchResults" class="space-y-2" data-testid="search-results">
            <button class="btn-secondary text-xs" data-testid="clear-search" @click="clearSearch">{{ t('common.clear') }}</button>
            <p v-if="!searchResults.length" class="text-content-subtle text-sm">{{ t('common.noData') }}</p>
            <ul v-else class="space-y-2">
              <li v-for="node in searchResults" :key="node.id" class="rounded-lg border border-subtle p-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="badge badge-draft">{{ node.code }}</span>
                  <span class="text-content font-medium">{{ node.name }}</span>
                  <span class="text-xs text-content-subtle">{{ node.level_name }}</span>
                </div>
                <p class="text-xs text-content-subtle mt-1">
                  {{ node.path.map(p => p.name).join(' / ') }}
                </p>
              </li>
            </ul>
          </div>

          <template v-else>
            <p v-if="!nodes.length" class="text-content-subtle text-sm" data-testid="no-nodes">{{ t('content.noNodes') }}</p>

            <ul v-else class="space-y-2" data-testid="node-list">
              <li
                v-for="node in nodes"
                :key="node.id"
                class="rounded-lg border border-subtle p-3"
                :class="{ 'opacity-60': node.status === 'archived' }"
                :data-testid="`node-row-${node.code}`"
              >
                <div class="flex items-center gap-3 flex-wrap">
                  <button
                    class="min-w-0 flex-1 text-start"
                    :data-testid="`open-node-${node.code}`"
                    @click="drillInto(node)"
                  >
                    <span class="badge badge-draft me-2">{{ node.code }}</span>
                    <span class="font-medium text-content">{{ node.name }}</span>
                    <span v-if="node.children_count" class="text-xs text-content-subtle ms-2">
                      {{ node.children_count }} {{ t('content.children') }}
                    </span>
                  </button>

                  <div class="flex flex-wrap gap-1 justify-end">
                    <span v-if="node.is_assignable" class="badge badge-approved">{{ t('content.assignable') }}</span>
                    <span v-if="node.is_assessable" class="badge badge-approved">{{ t('content.assessable') }}</span>
                    <span v-if="node.accepts_evidence" class="badge badge-approved">{{ t('content.evidence') }}</span>
                    <span v-if="node.status === 'archived'" class="badge badge-rejected">{{ t('content.archived') }}</span>
                  </div>

                  <div v-if="canManage" class="flex gap-1">
                    <button class="btn-secondary text-xs" :data-testid="`edit-node-${node.code}`" @click="openEdit(node)">
                      {{ t('content.editNode') }}
                    </button>
                    <button class="btn-secondary text-xs" :data-testid="`archive-node-${node.code}`" @click="archive(node)">
                      {{ t('content.archiveNode') }}
                    </button>
                  </div>
                  <RouterLink
                    v-if="node.is_assignable"
                    class="btn-secondary text-xs"
                    :data-testid="`assign-node-${node.code}`"
                    :to="`/programs/${programCode()}/assignments?requirement_id=${node.id}`"
                  >{{ t('content.assign') }}</RouterLink>
                </div>
              </li>
            </ul>
          </template>
        </section>

        <!-- Requirements import -->
        <section v-if="canManage" class="card p-5 space-y-4" data-testid="import-panel">
          <h2 class="font-bold text-content">{{ t('content.importTitle') }}</h2>

          <div class="flex flex-wrap items-center gap-3">
            <a class="btn-secondary" :href="templateHref" data-testid="download-template">
              {{ t('content.downloadTemplate') }}
            </a>
            <input type="file" accept=".xlsx" class="input" data-testid="import-file-input" @change="onFileChosen" />
            <button class="btn-primary" :disabled="!importFile || validating" data-testid="validate-import" @click="validateImport">
              {{ validating ? t('common.loading') : t('content.validate') }}
            </button>
          </div>

          <div v-if="importPreview" class="rounded-lg border border-subtle p-4 space-y-3" data-testid="import-preview">
            <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div v-for="row in previewTiles" :key="row.label">
                <dt class="text-xs text-content-subtle">{{ row.label }}</dt>
                <dd class="font-semibold text-content">{{ row.value }}</dd>
              </div>
            </dl>

            <div v-if="importPreview.by_level?.length">
              <p class="text-sm font-semibold text-content mb-1">{{ t('content.newByLevel') }}</p>
              <ul class="text-sm text-content-subtle space-y-0.5" data-testid="preview-by-level">
                <li v-for="lvl in importPreview.by_level" :key="lvl.level_key">
                  {{ lvl.level_name }}: <span class="text-content font-medium">{{ lvl.new }}</span>
                  <span v-if="lvl.reused"> · {{ t('content.reused') }}: {{ lvl.reused }}</span>
                </li>
              </ul>
            </div>

            <div v-if="importPreview.error_count" class="rounded-lg bg-red-50 p-3 space-y-2" data-testid="import-errors">
              <p class="text-sm font-semibold text-red-800">
                {{ t('content.errors') }}: {{ importPreview.error_count }}
              </p>
              <ul class="list-disc list-inside text-sm text-red-700">
                <li v-for="(err, i) in importPreview.errors.slice(0, 8)" :key="i">
                  {{ err.row ? `#${err.row} ` : '' }}{{ err.column }} — {{ localeMessage(err) }}
                </li>
              </ul>
              <a class="btn-secondary text-xs inline-block" :href="errorReportHref" data-testid="download-error-report">
                {{ t('content.downloadErrors') }}
              </a>
              <p class="text-xs text-red-700">{{ t('content.cannotImport') }}</p>
            </div>

            <button
              class="btn-primary"
              :disabled="!importPreview.can_import || importing"
              data-testid="confirm-import"
              @click="confirmImport"
            >{{ importing ? t('common.saving') : t('content.confirmImport') }}</button>
          </div>
        </section>
      </template>
    </template>

    <!-- Dynamic node form: fields come from the target level's configuration -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
        <div class="card w-full max-w-2xl p-5 space-y-3 my-8">
          <h3 class="font-bold text-content">
            {{ editing ? t('content.editNode') : t('content.addChild') }}
            <span class="text-content-subtle font-normal">· {{ formLevel?.name }}</span>
          </h3>

          <div v-if="formLevel?.code_required">
            <label class="label">{{ t('content.code') }}</label>
            <input v-model="form.code" class="input" dir="ltr" data-testid="node-code-input" />
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="label">{{ t('content.nameAr') }}</label>
              <input v-model="form.name_ar" class="input" dir="rtl" data-testid="node-name-ar-input" />
            </div>
            <div>
              <label class="label">{{ t('content.nameEn') }}</label>
              <input v-model="form.name_en" class="input" dir="ltr" data-testid="node-name-en-input" />
            </div>
          </div>

          <div v-if="formLevel?.description_enabled">
            <label class="label">{{ t('content.description') }}</label>
            <textarea v-model="form.description_ar" class="input" rows="2" dir="rtl" data-testid="node-description-input"></textarea>
          </div>
          <div v-if="formLevel?.objective_enabled">
            <label class="label">{{ t('content.objective') }}</label>
            <textarea v-model="form.objective_ar" class="input" rows="2" dir="rtl" data-testid="node-objective-input"></textarea>
          </div>
          <div v-if="formLevel?.instructions_enabled">
            <label class="label">{{ t('content.instructions') }}</label>
            <textarea v-model="form.guidance_ar" class="input" rows="2" dir="rtl" data-testid="node-instructions-input"></textarea>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div v-if="formLevel?.weight_enabled">
              <label class="label">{{ t('content.weight') }}</label>
              <input v-model="form.weight" type="number" step="0.1" class="input" data-testid="node-weight-input" />
            </div>
            <div v-if="formLevel?.due_date_enabled">
              <label class="label">{{ t('content.dueDate') }}</label>
              <input v-model="form.due_date" type="date" class="input" data-testid="node-due-date-input" />
            </div>
          </div>

          <p v-if="formError" class="text-sm text-red-700" data-testid="node-form-error">{{ formError }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button class="btn-secondary" @click="showForm = false">{{ t('common.cancel') }}</button>
            <button class="btn-primary" :disabled="saving" data-testid="save-node-button" @click="saveNode">
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * Cycle content authoring.
 *
 * This screen owns no model of its own. It reads the program's structure
 * (levels, terminology, per-level field flags) and renders whatever that
 * structure says — three levels for Sumoud, seven for a test program — with
 * no program-specific branch anywhere. It replaced a version that authored
 * legacy `Standard` rows with hard-coded Perspective/Axis inputs.
 */
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, RouterLink } from 'vue-router'
import HierarchyBreadcrumb from '@/components/hierarchy/HierarchyBreadcrumb.vue'
import { cyclesService, structureService, hierarchyService, hierarchyImportService } from '@/services/index'
import { useAppStore } from '@/stores/app'

const { t, locale } = useI18n()
const route = useRoute()
const appStore = useAppStore()
const programCode = () => route.params.programCode

const loading = ref(true)
const saving = ref(false)
const cycle = ref(null)
const levels = ref([])
const canManage = ref(false)
const structureVersion = ref(null)
const trail = ref([])
const nodes = ref([])
const searchTerm = ref('')
const searchResults = ref(null)

const showForm = ref(false)
const editing = ref(null)
const formLevel = ref(null)
const formError = ref('')
const blankForm = () => ({ code: '', name_ar: '', name_en: '', description_ar: '', objective_ar: '', guidance_ar: '', weight: '', due_date: '' })
const form = ref(blankForm())

const importFile = ref(null)
const importPreview = ref(null)
const validating = ref(false)
const importing = ref(false)

const rootLevel = computed(() => levels.value[0] ?? null)
const currentParent = computed(() => trail.value.at(-1) ?? null)
const currentLevel = computed(() =>
  currentParent.value ? levels.value.find(l => l.key === currentParent.value.level_key) : null)

/** The level a new child would occupy — one deeper than the current one. */
const nextLevel = computed(() => {
  if (!currentLevel.value) return rootLevel.value
  const index = levels.value.findIndex(l => l.key === currentLevel.value.key)
  return levels.value[index + 1] ?? null
})

const templateHref = computed(() => hierarchyImportService.templateUrl(programCode()))
const errorReportHref = computed(() =>
  importPreview.value ? hierarchyImportService.errorReportUrl(programCode(), importPreview.value.import_log_id) : '#')

const previewTiles = computed(() => {
  const p = importPreview.value
  if (!p) return []
  return [
    { label: t('content.totalRows'), value: p.summary.total_rows },
    { label: t('content.validRows'), value: p.summary.valid_rows },
    { label: t('content.errorRows'), value: p.summary.error_rows },
    { label: t('content.structureVersion'), value: p.structure_version ?? '—' },
  ]
})

const localeMessage = (err) => (locale.value === 'ar' ? err.message_ar : err.message_en) || err.code

async function loadStructure() {
  const data = await structureService.get(programCode())
  levels.value = (data.definition?.levels ?? []).filter(l => l.is_active)
  canManage.value = data.can_manage
  structureVersion.value = data.structure_version
}

async function loadNodes() {
  nodes.value = await hierarchyService.children(programCode(), currentParent.value?.id ?? null, cycle.value.id)
}

function drillInto(node) {
  if (!node.children_count && !nextLevel.value) return
  trail.value.push({ id: node.id, level_key: node.level_key, level_name: node.level_name, code: node.code, name: node.name })
  loadNodes()
}

function navigateTo(crumb, index) {
  trail.value = index < 0 ? [] : trail.value.slice(0, index + 1)
  loadNodes()
}

async function runSearch() {
  if (!searchTerm.value.trim()) return clearSearch()
  searchResults.value = await hierarchyService.search(programCode(), searchTerm.value.trim(), cycle.value.id)
}

function clearSearch() {
  searchTerm.value = ''
  searchResults.value = null
}

function openCreate() {
  formError.value = ''
  editing.value = null
  formLevel.value = nextLevel.value
  form.value = blankForm()
  showForm.value = true
}

function openEdit(node) {
  formError.value = ''
  editing.value = node
  formLevel.value = levels.value.find(l => l.key === node.level_key) ?? null
  form.value = {
    code: node.code, name_ar: node.name_ar, name_en: node.name_en ?? '',
    description_ar: node.description_ar ?? '', objective_ar: node.objective_ar ?? '',
    guidance_ar: node.guidance_ar ?? '', weight: node.weight ?? '', due_date: node.default_due_date ?? '',
  }
  showForm.value = true
}

async function saveNode() {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await hierarchyService.update(programCode(), editing.value.id, {
        ...form.value, default_due_date: form.value.due_date || null,
      })
    } else {
      await hierarchyService.create(programCode(), {
        ...form.value,
        node_type: formLevel.value.key,
        parent_id: currentParent.value?.id ?? null,
        cycle_id: cycle.value.id,
      })
    }
    showForm.value = false
    await loadNodes()
    appStore.showToast(t('common.success'), 'success')
  } catch (e) {
    formError.value = e?.response?.data?.message ?? t('common.error')
  } finally {
    saving.value = false
  }
}

async function archive(node) {
  try {
    await hierarchyService.archive(programCode(), node.id)
    await loadNodes()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  }
}

function onFileChosen(event) {
  importFile.value = event.target.files?.[0] ?? null
  importPreview.value = null
}

async function validateImport() {
  validating.value = true
  try {
    importPreview.value = await hierarchyImportService.preview(programCode(), importFile.value, cycle.value.id)
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  } finally {
    validating.value = false
  }
}

async function confirmImport() {
  importing.value = true
  try {
    await hierarchyImportService.confirm(programCode(), importPreview.value.import_log_id)
    importPreview.value = null
    importFile.value = null
    appStore.showToast(t('content.importDone'), 'success')
    await loadNodes()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    cycle.value = await cyclesService.get(programCode(), route.params.id)
    await loadStructure()
    if (levels.value.length) await loadNodes()
  } finally {
    loading.value = false
  }
})
</script>
