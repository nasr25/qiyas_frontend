<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('structure.title') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('structure.subtitle') }}</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else>
      <!-- Read-only notice: the backend refuses writes regardless, this only
           explains why the actions are absent. -->
      <div v-if="!canManage" class="card p-4 border-s-4 border-amber-500" data-testid="structure-read-only">
        <p class="text-sm text-content-subtle">{{ t('structure.readOnly') }}</p>
      </div>

      <!-- ── Active structure ───────────────────────────────────────────── -->
      <section class="card p-5 space-y-4">
        <header class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="font-bold text-content">{{ t('structure.activeStructure') }}</h2>
            <p v-if="active" class="text-xs text-content-subtle mt-0.5">
              {{ t('structure.version') }} {{ active.version }} ·
              {{ active.depth }} {{ t('structure.levelCount') }} ·
              {{ t('structure.maxLevels') }}: {{ maxLevels }}
            </p>
          </div>
          <button
            v-if="canManage && !draft"
            class="btn-primary"
            data-testid="open-draft-button"
            @click="openDraft"
          >{{ t('structure.openDraft') }}</button>
        </header>

        <p v-if="!active" class="text-content-subtle text-sm">{{ t('structure.noStructure') }}</p>

        <ol v-else class="space-y-2" data-testid="active-level-list">
          <li
            v-for="level in active.levels"
            :key="level.id"
            class="flex items-center gap-3 rounded-lg border border-subtle p-3"
            :class="{ 'opacity-50': !level.is_active }"
            :data-testid="`active-level-${level.key}`"
          >
            <span class="badge badge-draft shrink-0">{{ level.level_order }}</span>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-content truncate">{{ level.name }}</p>
              <p class="text-xs text-content-subtle truncate">{{ level.key }}</p>
            </div>
            <div class="flex flex-wrap gap-1 justify-end">
              <span v-for="tag in tagsFor(level)" :key="tag" class="badge badge-approved">{{ tag }}</span>
            </div>
          </li>
        </ol>
      </section>

      <!-- ── Draft editor ───────────────────────────────────────────────── -->
      <section v-if="canManage && draft" class="card p-5 space-y-4" data-testid="draft-editor">
        <header class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="font-bold text-content">
              {{ t('structure.draft') }} · {{ t('structure.version') }} {{ draft.version }}
            </h2>
            <p class="text-xs text-content-subtle mt-0.5">{{ t('structure.draftInProgress') }}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn-secondary" data-testid="add-level-button" @click="openLevelModal(null)">
              + {{ t('structure.addLevel') }}
            </button>
            <button class="btn-secondary" data-testid="preview-impact-button" @click="loadImpact">
              {{ t('structure.preview') }}
            </button>
          </div>
        </header>

        <ul v-if="draft.levels.length" class="space-y-2" data-testid="draft-level-list">
          <li
            v-for="(level, index) in draft.levels"
            :key="level.id"
            class="rounded-lg border border-subtle p-3"
            :class="{ 'opacity-60': !level.is_active }"
            :data-testid="`draft-level-${level.key}`"
          >
            <div class="flex items-center gap-3 flex-wrap">
              <span class="badge badge-draft shrink-0">{{ level.level_order }}</span>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-content truncate">{{ level.name_ar }} · {{ level.name_en }}</p>
                <p class="text-xs text-content-subtle truncate">{{ level.key }}</p>
              </div>
              <div class="flex gap-1">
                <button class="btn-secondary text-xs" :disabled="index === 0"
                        :data-testid="`move-up-${level.key}`" @click="move(level, 'up')">↑ {{ t('structure.moveUp') }}</button>
                <button class="btn-secondary text-xs" :disabled="index === draft.levels.length - 1"
                        :data-testid="`move-down-${level.key}`" @click="move(level, 'down')">↓ {{ t('structure.moveDown') }}</button>
                <button class="btn-secondary text-xs" :data-testid="`edit-${level.key}`" @click="openLevelModal(level)">
                  {{ t('structure.editLevel') }}
                </button>
                <button class="btn-secondary text-xs" :data-testid="`toggle-${level.key}`" @click="toggleActive(level)">
                  {{ level.is_active ? t('structure.disable') : t('structure.enable') }}
                </button>
                <button class="btn-secondary text-xs" :data-testid="`remove-${level.key}`" @click="remove(level)">
                  {{ t('structure.remove') }}
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
              <span v-for="tag in tagsFor(level)" :key="tag" class="badge badge-approved">{{ tag }}</span>
            </div>
          </li>
        </ul>

        <!-- Validation problems block activation; shown before the manager tries. -->
        <div v-if="draft.validation_errors?.length" class="rounded-lg bg-red-50 p-3" data-testid="validation-errors">
          <p class="text-sm font-semibold text-red-800">{{ t('structure.validationErrors') }}</p>
          <ul class="list-disc list-inside text-sm text-red-700 mt-1">
            <li v-for="(err, i) in draft.validation_errors" :key="i">{{ err }}</li>
          </ul>
        </div>

        <!-- ── Impact preview ─────────────────────────────────────────── -->
        <div v-if="impact" class="rounded-lg border border-subtle p-4 space-y-3" data-testid="impact-preview">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-semibold text-content">{{ t('structure.impactTitle') }}</h3>
            <span class="badge" :class="impactBadgeClass" data-testid="impact-classification">
              {{ t(`structure.${impactKey}`) }}
            </span>
          </div>

          <ul class="list-disc list-inside text-sm text-content-subtle">
            <li v-for="(reason, i) in impact.reasons" :key="i">{{ reason }}</li>
          </ul>

          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div v-for="row in impactRows" :key="row.label">
              <dt class="text-content-subtle text-xs">{{ row.label }}</dt>
              <dd class="font-semibold text-content">{{ row.value }}</dd>
            </div>
          </dl>

          <div>
            <label class="label">{{ t('structure.changeSummary') }}</label>
            <input v-model="changeSummary" class="input" data-testid="change-summary-input" />
          </div>

          <label v-if="impact.classification === 'requires_migration'" class="flex items-center gap-2 text-sm">
            <input v-model="acknowledge" type="checkbox" data-testid="acknowledge-migration" />
            <span>{{ t('structure.acknowledgeMigration') }}</span>
          </label>

          <button
            class="btn-primary"
            :disabled="activating || impact.blocking || draft.validation_errors?.length || (impact.classification === 'requires_migration' && !acknowledge)"
            data-testid="activate-button"
            @click="activate"
          >{{ activating ? t('common.saving') : t('structure.activate') }}</button>
        </div>
      </section>

      <!-- ── Version history ────────────────────────────────────────────── -->
      <section v-if="versions.length" class="card p-5 space-y-3">
        <h2 class="font-bold text-content">{{ t('structure.versionHistory') }}</h2>
        <ul class="space-y-2" data-testid="version-history">
          <li v-for="v in versions" :key="v.id" class="rounded-lg border border-subtle p-3">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="badge" :class="v.status === 'active' ? 'badge-approved' : 'badge-draft'">
                {{ t('structure.version') }} {{ v.version }}
              </span>
              <span class="text-xs text-content-subtle">{{ v.level_count }} {{ t('structure.levelCount') }}</span>
              <span v-if="v.change_summary" class="text-xs text-content-subtle">· {{ v.change_summary }}</span>
            </div>
            <p class="text-xs text-content-subtle mt-1 truncate">
              {{ v.levels.map(l => localeName(l)).join(' → ') }}
            </p>
          </li>
        </ul>
      </section>
    </template>

    <!-- ── Level modal ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
        <div class="card w-full max-w-2xl p-5 space-y-3 my-8">
          <h3 class="font-bold text-content">
            {{ editing ? t('structure.editLevel') : t('structure.addLevel') }}
          </h3>

          <div v-if="!editing">
            <label class="label">{{ t('structure.levelKey') }}</label>
            <input v-model="form.key" class="input" dir="ltr" data-testid="level-key-input" />
            <p class="text-xs text-content-subtle mt-1">{{ t('structure.levelKeyHint') }}</p>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="label">{{ t('structure.nameAr') }}</label>
              <input v-model="form.name_ar" class="input" dir="rtl" data-testid="level-name-ar-input" />
            </div>
            <div>
              <label class="label">{{ t('structure.nameEn') }}</label>
              <input v-model="form.name_en" class="input" dir="ltr" data-testid="level-name-en-input" />
            </div>
            <div>
              <label class="label">{{ t('structure.pluralAr') }}</label>
              <input v-model="form.plural_name_ar" class="input" dir="rtl" data-testid="level-plural-ar-input" />
            </div>
            <div>
              <label class="label">{{ t('structure.pluralEn') }}</label>
              <input v-model="form.plural_name_en" class="input" dir="ltr" data-testid="level-plural-en-input" />
            </div>
          </div>

          <fieldset v-for="group in flagGroups" :key="group.label" class="border border-subtle rounded-lg p-3">
            <legend class="text-xs font-semibold text-content-subtle px-1">{{ group.label }}</legend>
            <div class="grid sm:grid-cols-2 gap-2">
              <label v-for="flag in group.flags" :key="flag" class="flex items-center gap-2 text-sm">
                <input v-model="form[flag]" type="checkbox" :data-testid="`flag-${flag}`" />
                <span>{{ t(`structure.${flagLabels[flag]}`) }}</span>
              </label>
            </div>
          </fieldset>

          <p v-if="modalError" class="text-sm text-red-700" data-testid="modal-error">{{ modalError }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button class="btn-secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
            <button class="btn-primary" :disabled="saving" data-testid="save-level-button" @click="saveLevel">
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { structureService } from '@/services/index'
import { useAppStore } from '@/stores/app'

const { t, locale } = useI18n()
const route = useRoute()
const appStore = useAppStore()
const programCode = () => route.params.programCode

const loading = ref(true)
const saving = ref(false)
const activating = ref(false)
const canManage = ref(false)
const maxLevels = ref(null)
const active = ref(null)
const draft = ref(null)
const versions = ref([])
const impact = ref(null)
const acknowledge = ref(false)
const changeSummary = ref('')
const showModal = ref(false)
const editing = ref(null)
const modalError = ref('')

/**
 * Grouped exactly as the level definition groups them, so the manager sees
 * "what this level DOES" separately from "where it APPEARS" and "which form
 * fields it offers" — rather than one undifferentiated wall of checkboxes.
 */
const flagLabels = {
  is_active: 'isActive',
  is_assignable: 'isAssignable',
  is_assessable: 'isAssessable',
  accepts_evidence: 'acceptsEvidence',
  appears_in_dashboard: 'inDashboard',
  appears_in_reports: 'inReports',
  appears_in_filters: 'inFilters',
  appears_in_breadcrumb: 'inBreadcrumb',
  description_enabled: 'descriptionEnabled',
  objective_enabled: 'objectiveEnabled',
  weight_enabled: 'weightEnabled',
  due_date_enabled: 'dueDateEnabled',
  instructions_enabled: 'instructionsEnabled',
  code_required: 'codeRequired',
}

const flagGroups = computed(() => [
  { label: t('structure.behaviour'), flags: ['is_active', 'is_assignable', 'is_assessable', 'accepts_evidence'] },
  { label: t('structure.surfaces'), flags: ['appears_in_dashboard', 'appears_in_reports', 'appears_in_filters', 'appears_in_breadcrumb'] },
  { label: t('structure.formFields'), flags: ['code_required', 'description_enabled', 'objective_enabled', 'weight_enabled', 'due_date_enabled', 'instructions_enabled'] },
])

const blankForm = () => ({
  key: '', name_ar: '', name_en: '', plural_name_ar: '', plural_name_en: '',
  is_active: true, is_assignable: false, is_assessable: false, accepts_evidence: false,
  appears_in_dashboard: false, appears_in_reports: true, appears_in_filters: false, appears_in_breadcrumb: true,
  code_required: true, description_enabled: true, objective_enabled: false,
  weight_enabled: false, due_date_enabled: false, instructions_enabled: false,
})
const form = ref(blankForm())

const impactKey = computed(() => ({
  safe: 'safe',
  requires_migration: 'requiresMigration',
  not_allowed: 'notAllowed',
}[impact.value?.classification] ?? 'safe'))

const impactBadgeClass = computed(() => ({
  safe: 'badge-approved',
  requires_migration: 'badge-draft',
  not_allowed: 'badge-rejected',
}[impact.value?.classification] ?? 'badge-draft'))

const impactRows = computed(() => {
  if (!impact.value) return []
  const a = impact.value.affected
  return [
    { label: t('structure.affectedNodes'), value: a.nodes },
    { label: t('structure.affectedAssignments'), value: a.assignments },
    { label: t('structure.affectedEvidence'), value: a.evidence_submissions },
    { label: t('structure.activeCycles'), value: a.active_cycles },
    { label: t('structure.historicalCycles'), value: a.historical_cycles },
    { label: t('structure.levelsAdded'), value: impact.value.changes.levels_added.join(', ') || '—' },
    { label: t('structure.levelsRemoved'), value: impact.value.changes.levels_removed.join(', ') || '—' },
  ]
})

/** Snapshot rows carry raw bilingual fields only, so resolve here. */
function localeName(level) {
  return locale.value === 'ar'
    ? (level.name_ar || level.name_en)
    : (level.name_en || level.name_ar)
}

function tagsFor(level) {
  const tags = []
  if (level.is_assignable) tags.push(t('structure.isAssignable'))
  if (level.is_assessable) tags.push(t('structure.isAssessable'))
  if (level.accepts_evidence) tags.push(t('structure.acceptsEvidence'))
  if (level.appears_in_dashboard) tags.push(t('structure.inDashboard'))
  if (level.appears_in_filters) tags.push(t('structure.inFilters'))
  return tags
}

async function load() {
  loading.value = true
  try {
    const data = await structureService.get(programCode())
    active.value = data.definition
    canManage.value = data.can_manage
    maxLevels.value = data.max_levels
    versions.value = await structureService.versions(programCode())
    draft.value = data.can_manage && data.has_draft
      ? await structureService.getDraft(programCode())
      : null
  } finally {
    loading.value = false
  }
}

async function refreshDraft() {
  draft.value = await structureService.getDraft(programCode())
  impact.value = null
}

async function openDraft() {
  await structureService.openDraft(programCode())
  await refreshDraft()
}

function openLevelModal(level) {
  modalError.value = ''
  editing.value = level
  form.value = level ? { ...blankForm(), ...level } : blankForm()
  showModal.value = true
}

async function saveLevel() {
  saving.value = true
  modalError.value = ''
  try {
    const payload = { ...form.value }
    if (editing.value) {
      delete payload.key
      await structureService.updateLevel(programCode(), editing.value.id, payload)
    } else {
      await structureService.addLevel(programCode(), payload)
    }
    showModal.value = false
    await refreshDraft()
    appStore.showToast(t('common.success'), 'success')
  } catch (e) {
    modalError.value = e?.response?.data?.message ?? t('common.error')
  } finally {
    saving.value = false
  }
}

async function move(level, direction) {
  try {
    await structureService.moveLevel(programCode(), level.id, direction)
    await refreshDraft()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  }
}

async function toggleActive(level) {
  try {
    await structureService.updateLevel(programCode(), level.id, { is_active: !level.is_active })
    await refreshDraft()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  }
}

async function remove(level) {
  try {
    await structureService.removeLevel(programCode(), level.id)
    await refreshDraft()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  }
}

async function loadImpact() {
  try {
    impact.value = await structureService.impact(programCode())
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  }
}

async function activate() {
  activating.value = true
  try {
    await structureService.activate(programCode(), {
      acknowledge_migration: acknowledge.value,
      change_summary: changeSummary.value || null,
    })
    acknowledge.value = false
    changeSummary.value = ''
    impact.value = null
    appStore.showToast(t('common.success'), 'success')
    await load()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message ?? t('common.error'), 'error')
  } finally {
    activating.value = false
  }
}

onMounted(load)
</script>
