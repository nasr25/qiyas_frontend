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
          <div>
            <span class="font-mono text-primary-700 dark:text-primary-400 text-sm font-semibold">{{ standard.number }}</span>
            <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{{ standard.name_ar }}</h1>
            <p v-if="standard.name_en" class="text-sm text-gray-500 mt-0.5" dir="ltr">{{ standard.name_en }}</p>
          </div>
          <div class="flex flex-wrap gap-4 text-sm text-gray-500">
            <div>
              <p class="text-xs text-gray-400">{{ t('standards.weight') }}</p>
              <p class="font-semibold text-gray-900 dark:text-gray-100">{{ standard.weight }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-400">{{ t('standards.dueDate') }}</p>
              <p class="font-semibold text-gray-900 dark:text-gray-100">{{ formatDate(standard.due_date) }}</p>
            </div>
          </div>
        </div>
        <p v-if="standard.description" class="text-sm text-gray-600 dark:text-gray-400">{{ standard.description }}</p>
        <!-- Departments -->
        <div class="mt-3 flex flex-wrap gap-2">
          <span v-for="d in standard.departments" :key="d.id" class="badge-draft">{{ d.name_ar }}</span>
        </div>
      </div>

      <!-- Requirements -->
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('standards.requirements') }}</h2>
          <button v-if="authStore.isSuperAdmin || authStore.isCoordinator" class="btn-primary btn-sm" @click="showAddReq = true">
            + {{ t('common.save') }}
          </button>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-if="!requirements.length" class="px-6 py-8 text-center text-gray-400 text-sm">{{ t('common.noData') }}</div>
          <div v-for="req in requirements" :key="req.id" class="px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <p class="font-medium text-gray-900 dark:text-gray-100">{{ req.title_ar }}</p>
                  <span v-if="req.is_mandatory" class="badge badge-rejected text-xs">{{ t('standards.requirements') }}</span>
                </div>
                <p v-if="req.title_en" class="text-xs text-gray-400 mb-2" dir="ltr">{{ req.title_en }}</p>
                <p v-if="req.description" class="text-sm text-gray-600 dark:text-gray-400">{{ req.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Documents per department -->
      <div v-if="documents.length" class="card">
        <div class="card-header">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('documents.title') }}</h2>
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
                <input id="mandatory" v-model="reqForm.is_mandatory" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600" />
                <label for="mandatory" class="text-sm font-medium text-gray-700 dark:text-gray-300">Mandatory</label>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { requirementsService, documentsService } from '@/services/index'
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

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

async function load() {
  loading.value = true
  try {
    const id = route.params.id
    // Get requirements – standard info comes embedded
    requirements.value = await requirementsService.list(id)
    // Try to get documents for this standard
    const docsRes = await documentsService.list({ standard_id: id })
    documents.value = docsRes.data || docsRes
    // Build standard info from first requirement if available
    standard.value = requirements.value[0]?.standard || { id, name_ar: 'Standard', number: id }
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
