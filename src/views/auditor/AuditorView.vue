<template>
  <div class="space-y-6">
    <!-- Header -->
    <h1 class="text-xl font-bold text-content">{{ t('auditor.title') }}</h1>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card p-4">
        <p class="text-xs text-content-muted mb-1">{{ t('auditor.pendingReviews') }}</p>
        <p class="text-2xl font-bold text-warning-600">{{ stats.pending.toLocaleString() }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-content-muted mb-1">{{ t('auditor.approve') }} (Today)</p>
        <p class="text-2xl font-bold text-success-600">{{ stats.approvedToday.toLocaleString() }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-content-muted mb-1">{{ t('auditor.reject') }} (Today)</p>
        <p class="text-2xl font-bold text-danger-600">{{ stats.rejectedToday.toLocaleString() }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 flex flex-wrap gap-3">
      <select v-model="filters.cycle_id" class="input w-44" @change="fetchPending(1)">
        <option value="">{{ t('common.all') }} {{ t('cycles.title') }}</option>
        <option v-for="c in cycles" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="filters.department_id" class="input w-44" @change="fetchPending(1)">
        <option value="">{{ t('common.all') }} {{ t('departments.title') }}</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name_ar }}</option>
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
                <th>{{ t('departments.title') }}</th>
                <th>{{ t('standards.title') }}</th>
                <th>{{ t('standards.requirements') }}</th>
                <th>Submitted By</th>
                <th>{{ t('common.date') }}</th>
                <th>v</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!reviews.length">
                <td colspan="7" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="review in reviews" :key="review.id">
                <td>{{ review.department?.name_ar }}</td>
                <td>{{ review.standard?.number }}</td>
                <td class="max-w-[160px] truncate">{{ review.requirement?.title_ar }}</td>
                <td>{{ review.submitted_by?.name }}</td>
                <td>{{ formatDate(review.submitted_at) }}</td>
                <td class="font-mono text-xs">v{{ review.current_version }}</td>
                <td>
                  <div class="flex items-center gap-1">
                    <RouterLink :to="`/documents/${review.id}`" class="btn-secondary btn-sm">{{ t('common.view') }}</RouterLink>
                    <button class="btn-success btn-sm" @click="handleApprove(review)">{{ t('auditor.approve') }}</button>
                    <button class="btn-danger btn-sm" @click="openReject(review)">{{ t('auditor.reject') }}</button>
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
          @page-change="fetchPending"
        />
      </template>
    </div>

    <!-- Reject Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="rejectModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="rejectModal.show = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="rejectModal.show = false" />
          <div class="relative card w-full max-w-md p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ t('auditor.reject') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">{{ t('auditor.rejectionReason') }}</label>
                <textarea v-model="rejectModal.reason" class="input" rows="4" required />
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="rejectModal.show = false">{{ t('common.cancel') }}</button>
                <button class="btn-danger" :disabled="!rejectModal.reason.trim() || rejectModal.saving" @click="handleReject">
                  {{ rejectModal.saving ? t('common.loading') : t('auditor.reject') }}
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
import { auditorService, cyclesService, departmentsService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppPagination from '@/components/common/AppPagination.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading     = ref(true)
const reviews     = ref([])
const cycles      = ref([])
const departments = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })

const stats = reactive({ pending: 0, approvedToday: 0, rejectedToday: 0 })

const filters = reactive({ cycle_id: '', department_id: '' })

const rejectModal = reactive({ show: false, docId: null, reason: '', saving: false })

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

async function fetchPending(page = 1) {
  loading.value = true
  try {
    const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
    const res = await auditorService.pendingReviews(params)
    reviews.value = res.data || res
    if (res.meta) {
      meta.value = res.meta
      stats.pending = res.meta.total || reviews.value.length
    } else {
      stats.pending = reviews.value.length
    }
    if (res.stats) {
      stats.approvedToday = res.stats.approved_today || 0
      stats.rejectedToday = res.stats.rejected_today || 0
    }
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

function openReject(review) {
  rejectModal.docId  = review.id
  rejectModal.reason = ''
  rejectModal.show   = true
}

async function handleApprove(review) {
  try {
    await auditorService.approve(review.id)
    appStore.showToast(t('common.success'), 'success')
    stats.approvedToday++
    await fetchPending(meta.value.current_page)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

async function handleReject() {
  rejectModal.saving = true
  try {
    await auditorService.reject(rejectModal.docId, { rejection_reason: rejectModal.reason })
    appStore.showToast(t('common.success'), 'success')
    rejectModal.show = false
    stats.rejectedToday++
    await fetchPending(meta.value.current_page)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    rejectModal.saving = false
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
  await fetchPending()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
