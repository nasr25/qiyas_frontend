<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <h1 class="text-xl font-bold text-content">{{ t('documents.title') }}</h1>
    </div>

    <!-- Filters -->
    <div class="card p-4 flex flex-wrap gap-3">
      <select v-model="filters.cycle_id" class="input w-full xs:w-44" @change="fetchDocs(1)">
        <option value="">{{ t('common.all') }} {{ t('cycles.title') }}</option>
        <option v-for="c in cycles" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="filters.department_id" class="input w-full xs:w-44" @change="fetchDocs(1)">
        <option value="">{{ t('common.all') }} {{ t('departments.title') }}</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name_ar }}</option>
      </select>
      <select v-model="filters.status" class="input w-full xs:w-44" @change="fetchDocs(1)">
        <option value="">{{ t('common.all') }} {{ t('common.status') }}</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ t(`documents.status.${s}`) }}</option>
      </select>
      <select v-model="filters.requirement_id" class="input w-full xs:w-44" @change="fetchDocs(1)">
        <option value="">{{ t('common.all') }} {{ t('standards.requirements') }}</option>
        <option v-for="r in requirements" :key="r.id" :value="r.id">{{ r.title_ar }}</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="loading" class="flex justify-center py-16">
        <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <template v-else>
        <div class="table-wrapper rounded-none border-0">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t('documents.title') }}</th>
                <th>{{ t('departments.title') }}</th>
                <th>{{ t('standards.requirements') }}</th>
                <th>{{ t('common.status') }}</th>
                <th>Submitted By</th>
                <th>{{ t('common.date') }}</th>
                <th>v</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!docs.length">
                <td colspan="8" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="doc in docs" :key="doc.id">
                <td class="font-medium max-w-[180px] truncate">{{ doc.title }}</td>
                <td>{{ doc.department?.name_ar }}</td>
                <td class="max-w-[160px] truncate">{{ doc.requirement?.title_ar }}</td>
                <td><StatusBadge :status="doc.status" /></td>
                <td>{{ doc.submitted_by?.name }}</td>
                <td>{{ formatDate(doc.submitted_at) }}</td>
                <td class="font-mono text-xs">v{{ doc.current_version }}</td>
                <td>
                  <div class="flex items-center gap-1">
                    <RouterLink :to="`/documents/${doc.id}`" class="btn-secondary btn-sm">{{ t('common.view') }}</RouterLink>
                    <button
                      v-if="canUpload(doc)"
                      class="btn-secondary btn-sm"
                      @click="openUpload(doc)"
                    >{{ t('documents.upload') }}</button>
                    <button
                      v-if="canSubmit(doc)"
                      class="btn-primary btn-sm"
                      @click="handleSubmit(doc)"
                    >{{ t('documents.submit') }}</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination
          v-if="meta.last_page > 1"
          :current-page="meta.current_page"
          :last-page="meta.last_page"
          :total="meta.total"
          @page-change="fetchDocs"
        />
      </template>
    </div>

    <!-- Upload Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="uploadModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="uploadModal.show = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="uploadModal.show = false" />
          <div class="relative card w-full max-w-md p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ t('documents.upload') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">File</label>
                <input type="file" class="input" @change="e => uploadModal.file = e.target.files[0]" />
              </div>
              <div>
                <label class="label">{{ t('documents.changeReason') }}</label>
                <textarea v-model="uploadModal.reason" class="input" rows="3" />
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="uploadModal.show = false">{{ t('common.cancel') }}</button>
                <button class="btn-primary" :disabled="!uploadModal.file || uploadModal.saving" @click="handleUpload">
                  {{ uploadModal.saving ? t('common.loading') : t('documents.upload') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { documentsService, cyclesService, departmentsService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppPagination from '@/components/common/AppPagination.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading     = ref(true)
const docs        = ref([])
const cycles      = ref([])
const departments = ref([])
const requirements = ref([])

const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const statuses = ['draft', 'under_review', 'approved', 'rejected', 'overdue']

const filters = reactive({
  cycle_id: '',
  department_id: '',
  status: '',
  requirement_id: '',
})

const uploadModal = reactive({
  show: false,
  docId: null,
  file: null,
  reason: '',
  saving: false,
})

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

function canUpload(doc) {
  return ['draft', 'rejected'].includes(doc.status)
}

function canSubmit(doc) {
  return ['draft', 'rejected'].includes(doc.status) && doc.has_file
}

function openUpload(doc) {
  uploadModal.docId = doc.id
  uploadModal.file = null
  uploadModal.reason = ''
  uploadModal.show = true
}

async function fetchDocs(page = 1) {
  loading.value = true
  try {
    const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
    const res = await documentsService.list(params)
    docs.value = res.data || res
    if (res.meta) meta.value = res.meta
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function handleUpload() {
  uploadModal.saving = true
  try {
    await documentsService.upload(uploadModal.docId, uploadModal.file, uploadModal.reason)
    appStore.showToast(t('common.success'), 'success')
    uploadModal.show = false
    await fetchDocs(meta.value.current_page)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    uploadModal.saving = false
  }
}

async function handleSubmit(doc) {
  try {
    await documentsService.submit(doc.id)
    appStore.showToast(t('common.success'), 'success')
    await fetchDocs(meta.value.current_page)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

onMounted(async () => {
  try {
    const [cyclesRes, deptsRes] = await Promise.all([
      cyclesService.list(),
      departmentsService.list(),
    ])
    cycles.value = cyclesRes.data || cyclesRes
    departments.value = deptsRes.data || deptsRes
  } catch {}
  await fetchDocs()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
