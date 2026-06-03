<template>
  <div class="space-y-6">
    <!-- Back -->
    <RouterLink to="/standards" class="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline dark:text-primary-400">
      <svg class="h-4 w-4 rotate-180 rtl:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      {{ t('standards.title') }}
    </RouterLink>

    <div v-if="loading" class="flex justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="standard">
      <!-- Standard info -->
      <div class="card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="font-mono text-primary-700 dark:text-primary-400 text-sm font-semibold">{{ standard.standard_number }}</span>
              <span v-if="standard.perspective" class="badge bg-brand-subtle text-brand">{{ standard.perspective }}</span>
              <span v-if="standard.axis" class="badge badge-draft">{{ standard.axis }}</span>
            </div>
            <h1 class="text-xl font-bold text-content">{{ standard.name_ar }}</h1>
            <p v-if="standard.name_en" class="text-sm text-content-muted mt-0.5" dir="ltr">{{ standard.name_en }}</p>
          </div>
          <div class="flex flex-wrap gap-4 text-sm text-content-muted">
            <div v-if="standard.weight">
              <p class="text-xs text-content-subtle">{{ t('standards.weight') }}</p>
              <p class="font-semibold text-content">{{ standard.weight }}</p>
            </div>
            <div v-if="standard.due_date">
              <p class="text-xs text-content-subtle">{{ t('standards.dueDate') }}</p>
              <p class="font-semibold text-content">{{ formatDate(standard.due_date) }}</p>
            </div>
          </div>
        </div>
        <!-- Departments -->
        <div class="flex items-center justify-between gap-3 mb-2">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-content-subtle">{{ t('standards.departments') }}</h3>
          <button v-if="canManage" class="btn-secondary btn-sm" @click="openDeptModal">
            {{ t('standards.assignDepartments') }}
          </button>
        </div>
        <div v-if="standard.departments?.length" class="flex flex-wrap gap-2">
          <span v-for="d in standard.departments" :key="d.id" class="badge-draft">{{ d.name_ar }}</span>
        </div>
        <p v-else class="text-xs text-content-subtle">{{ t('standards.noDepartments') }}</p>
      </div>

      <!-- Standard details (DGA Qiyas fields) -->
      <div v-if="hasDetails" class="card p-6 space-y-5">
        <div v-for="f in detailFields" :key="f.key" v-show="standard[f.key]">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-content-subtle mb-1">{{ f.label }}</h3>
          <p class="text-sm text-content-muted whitespace-pre-line leading-relaxed" dir="rtl">{{ standard[f.key] }}</p>
        </div>
      </div>

      <!-- Requirements -->
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h2 class="text-sm font-semibold text-content">{{ t('standards.requirements') }}</h2>
          <button v-if="authStore.isSuperAdmin || authStore.isCoordinator" class="btn-primary btn-sm" @click="showAddReq = true">
            + {{ t('common.save') }}
          </button>
        </div>
        <div class="divide-y divide-line">
          <div v-if="!requirements.length" class="px-6 py-8 text-center text-content-subtle text-sm">{{ t('common.noData') }}</div>
          <div v-for="req in requirements" :key="req.id" class="px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <p class="font-medium text-content">{{ req.title_ar }}</p>
                  <span v-if="req.is_mandatory" class="badge badge-rejected text-xs">{{ t('standards.requirements') }}</span>
                </div>
                <p v-if="req.title_en" class="text-xs text-content-subtle mb-2" dir="ltr">{{ req.title_en }}</p>
                <p v-if="req.description" class="text-sm text-content-muted">{{ req.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Documents per department -->
      <div v-if="documents.length" class="card">
        <div class="card-header">
          <h2 class="text-sm font-semibold text-content">{{ t('documents.title') }}</h2>
        </div>
        <div class="table-wrapper rounded-none border-0">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t('departments.title') }}</th>
                <th>{{ t('common.status') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in documents" :key="doc.id">
                <td>{{ doc.department?.name_ar }}</td>
                <td><StatusBadge :status="doc.status" /></td>
                <td><RouterLink :to="`/documents/${doc.id}`" class="btn-secondary btn-sm">{{ t('common.view') }}</RouterLink></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Add Requirement Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddReq" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="showAddReq = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showAddReq = false" />
          <div class="relative card w-full max-w-lg p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ t('standards.requirements') }}</h3>
            <form @submit.prevent="handleAddReq" class="space-y-4">
              <div>
                <label class="label">{{ t('standards.nameAr') }}</label>
                <input v-model="reqForm.title_ar" class="input" required dir="rtl" />
              </div>
              <div>
                <label class="label">{{ t('standards.nameEn') }}</label>
                <input v-model="reqForm.title_en" class="input" dir="ltr" />
              </div>
              <div>
                <label class="label">{{ t('standards.description') }}</label>
                <textarea v-model="reqForm.description" class="input" rows="3" />
              </div>
              <div class="flex items-center gap-3">
                <input id="mandatory" v-model="reqForm.is_mandatory" type="checkbox" class="h-4 w-4 rounded border-line text-primary-600" />
                <label for="mandatory" class="text-sm font-medium text-content">Mandatory</label>
              </div>
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="btn-secondary" @click="showAddReq = false">{{ t('common.cancel') }}</button>
                <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? t('common.loading') : t('common.save') }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Assign Departments Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeptModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="showDeptModal = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showDeptModal = false" />
          <div class="relative card w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true">
            <h3 class="text-lg font-semibold mb-1">{{ t('standards.assignDepartments') }}</h3>
            <p class="text-sm text-content-muted mb-4 truncate">{{ standard?.standard_number }} — {{ standard?.name_ar }}</p>
            <div class="max-h-72 overflow-y-auto -mx-2 px-2 space-y-1">
              <label v-for="d in allDepartments" :key="d.id" class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-inset cursor-pointer">
                <input type="checkbox" :value="d.id" v-model="selectedDeptIds" class="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500" />
                <span class="text-sm text-content">{{ d.name_ar }}</span>
              </label>
              <p v-if="!allDepartments.length" class="text-sm text-content-subtle py-6 text-center">{{ t('common.noData') }}</p>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-line mt-2">
              <button class="btn-secondary" @click="showDeptModal = false">{{ t('common.cancel') }}</button>
              <button class="btn-primary" :disabled="savingDept" @click="saveDepartments">{{ savingDept ? t('common.loading') : t('common.save') }}</button>
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
import { standardsService, requirementsService, documentsService, departmentsService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'

const { t } = useI18n()
const route     = useRoute()
const authStore = useAuthStore()
const appStore  = useAppStore()

const loading     = ref(true)
const saving      = ref(false)
const standard    = ref(null)
const requirements = ref([])
const documents    = ref([])
const showAddReq   = ref(false)
const reqForm = ref({ title_ar: '', title_en: '', description: '', is_mandatory: false })

// Department assignment
const canManage      = computed(() => authStore.isSuperAdmin || authStore.isCoordinator)
const showDeptModal  = ref(false)
const allDepartments = ref([])
const selectedDeptIds = ref([])
const savingDept     = ref(false)

async function openDeptModal() {
  if (!allDepartments.value.length) {
    try {
      const r = await departmentsService.list()
      allDepartments.value = r.data || r
    } catch { appStore.showToast(t('common.error'), 'error') }
  }
  selectedDeptIds.value = (standard.value.departments || []).map(d => d.id)
  showDeptModal.value = true
}

async function saveDepartments() {
  savingDept.value = true
  try {
    await standardsService.update(standard.value.cycle_id, standard.value.id, { department_ids: selectedDeptIds.value })
    appStore.showToast(t('common.success'), 'success')
    showDeptModal.value = false
    standard.value = await standardsService.show(standard.value.id)
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    savingDept.value = false
  }
}

// DGA Qiyas catalog fields rendered (in order) when present.
const detailFields = computed(() => [
  { key: 'description',              label: t('standards.objective') },
  { key: 'application_requirements', label: t('standards.applicationRequirements') },
  { key: 'evidence_documents',       label: t('standards.evidenceDocuments') },
  { key: 'scope',                    label: t('standards.scope') },
  { key: 'related_references',       label: t('standards.references') },
])
const hasDetails = computed(() =>
  !!standard.value && detailFields.value.some(f => standard.value[f.key]))

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

async function load() {
  loading.value = true
  try {
    const id = route.params.id
    const [std, reqs, docsRes] = await Promise.all([
      standardsService.show(id),
      requirementsService.list(id).catch(() => []),
      documentsService.list({ standard_id: id }).catch(() => ({ data: [] })),
    ])
    standard.value = std
    requirements.value = reqs || []
    documents.value = docsRes.data || docsRes || []
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function handleAddReq() {
  saving.value = true
  try {
    await requirementsService.create(route.params.id, reqForm.value)
    appStore.showToast(t('common.success'), 'success')
    showAddReq.value = false
    requirements.value = await requirementsService.list(route.params.id)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
