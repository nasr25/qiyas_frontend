<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <h1 class="text-xl font-bold text-content">{{ t('auditor.extensions') }}</h1>
    </div>

    <!-- Filter -->
    <div class="card p-4 flex flex-wrap gap-3">
      <select v-model="filters.status" class="input w-full sm:w-48" @change="fetchExtensions(1)">
        <option value="">{{ t('common.all') }} {{ t('common.status') }}</option>
        <option value="pending">Pending</option>
        <option value="approved">{{ t('documents.status.approved') }}</option>
        <option value="rejected">{{ t('documents.status.rejected') }}</option>
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
        <div class="table-wrapper rounded-xl border-0">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t('documents.title') }}</th>
                <th>{{ t('departments.title') }}</th>
                <th>Requested By</th>
                <th>{{ t('common.date') }}</th>
                <th>Requested Date</th>
                <th>Reason</th>
                <th>{{ t('common.status') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!extensions.length">
                <td colspan="8" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="ext in extensions" :key="ext.id">
                <td class="max-w-[160px] truncate font-medium">{{ ext.document?.title }}</td>
                <td>{{ ext.department?.name_ar }}</td>
                <td>{{ ext.requested_by?.name }}</td>
                <td>{{ formatDate(ext.created_at) }}</td>
                <td>{{ formatDate(ext.requested_date) }}</td>
                <td class="max-w-[160px] truncate text-xs">{{ ext.reason }}</td>
                <td>
                  <span :class="statusClass(ext.status)" class="badge">{{ ext.status }}</span>
                </td>
                <td>
                  <div v-if="ext.status === 'pending'" class="flex items-center gap-1">
                    <button class="btn-success btn-sm" @click="openAction('approve', ext)">{{ t('auditor.approveExtension') }}</button>
                    <button class="btn-danger btn-sm" @click="openAction('reject', ext)">{{ t('auditor.rejectExtension') }}</button>
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
          @page-change="fetchExtensions"
        />
      </template>
    </div>

    <!-- Action modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="actionModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="actionModal.show = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="actionModal.show = false" />
          <div class="relative card w-full max-w-md p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">
              {{ actionModal.type === 'approve' ? t('auditor.approveExtension') : t('auditor.rejectExtension') }}
            </h3>
            <div class="space-y-4">
              <div>
                <label class="label">Notes{{ actionModal.type === 'reject' ? ' (required)' : '' }}</label>
                <textarea v-model="actionModal.notes" class="input" rows="4" :required="actionModal.type === 'reject'" />
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="actionModal.show = false">{{ t('common.cancel') }}</button>
                <button
                  :class="actionModal.type === 'approve' ? 'btn-success' : 'btn-danger'"
                  :disabled="(actionModal.type === 'reject' && !actionModal.notes.trim()) || actionModal.saving"
                  @click="handleAction"
                >
                  {{ actionModal.saving ? t('common.loading') : t('common.confirm') }}
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
import { auditorService } from '@/services/index'
import AppPagination from '@/components/common/AppPagination.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading    = ref(true)
const extensions = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const filters = reactive({ status: '' })

const actionModal = reactive({
  show: false, type: '', extId: null, notes: '', saving: false,
})

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

function statusClass(status) {
  return { pending: 'badge-under-review', approved: 'badge-approved', rejected: 'badge-rejected' }[status] || 'badge-draft'
}

async function fetchExtensions(page = 1) {
  loading.value = true
  try {
    const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
    const res = await auditorService.extensions(params)
    extensions.value = res.data || res
    if (res.meta) meta.value = res.meta
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

function openAction(type, ext) {
  actionModal.type  = type
  actionModal.extId = ext.id
  actionModal.notes = ''
  actionModal.show  = true
}

async function handleAction() {
  actionModal.saving = true
  try {
    const payload = { notes: actionModal.notes }
    if (actionModal.type === 'approve') {
      await auditorService.approveExtension(actionModal.extId, payload)
    } else {
      await auditorService.rejectExtension(actionModal.extId, payload)
    }
    appStore.showToast(t('common.success'), 'success')
    actionModal.show = false
    await fetchExtensions(meta.value.current_page)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    actionModal.saving = false
  }
}

onMounted(fetchExtensions)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
