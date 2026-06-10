<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <h1 class="text-xl font-bold text-content">{{ t('cycles.title') }}</h1>
      <button v-if="authStore.isSuperAdmin" class="btn-primary btn-sm" @click="openCreateModal">
        + {{ t('cycles.new') }}
      </button>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="loading" class="flex justify-center py-16">
        <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <div v-else class="table-wrapper rounded-xl border-0">
        <table class="table">
          <thead>
            <tr>
              <SortableTh field="name" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('cycles.name') }}</SortableTh>
              <SortableTh field="year" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('cycles.year') }}</SortableTh>
              <SortableTh field="status" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('common.status') }}</SortableTh>
              <SortableTh field="start_date" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('cycles.startDate') }}</SortableTh>
              <SortableTh field="end_date" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('cycles.endDate') }}</SortableTh>
              <SortableTh field="standards_count" :sort-key="sortKey" :sort-dir="sortDir" @sort="sortBy">{{ t('standards.title') }}</SortableTh>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sorted.length">
              <td colspan="7" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
            </tr>
            <tr v-for="cycle in sorted" :key="cycle.id">
              <td class="font-medium">
                <RouterLink :to="`/cycles/${cycle.id}`" class="text-primary-700 hover:underline dark:text-primary-400">
                  {{ cycle.name }}
                </RouterLink>
              </td>
              <td>{{ cycle.year }}</td>
              <td><StatusBadge :status="cycle.status" /></td>
              <td>{{ formatDate(cycle.start_date) }}</td>
              <td>{{ formatDate(cycle.end_date) }}</td>
              <td>{{ cycle.standards_count ?? 0 }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <RouterLink :to="`/cycles/${cycle.id}`" class="btn-secondary btn-sm">{{ t('common.view') }}</RouterLink>
                  <template v-if="authStore.isSuperAdmin">
                    <button v-if="cycle.status === 'draft'" class="btn-primary btn-sm" @click="confirmAction('activate', cycle)">{{ t('cycles.activate') }}</button>
                    <button v-if="cycle.status === 'active'" class="btn btn-sm bg-warning-500 text-white hover:bg-warning-600" @click="openCloseModal(cycle)">{{ t('cycles.close') }}</button>
                    <button v-if="cycle.status === 'closed'" class="btn-secondary btn-sm" @click="confirmAction('archive', cycle)">{{ t('cycles.archive') }}</button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showModal = false" @keydown.esc="showModal = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false" />
          <div class="relative card w-full max-w-lg p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ t('cycles.new') }}</h3>
            <form @submit.prevent="handleCreate" class="space-y-4">
              <div>
                <label class="label">{{ t('cycles.name') }}</label>
                <input v-model="form.name" class="input" required />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('cycles.year') }}</label>
                  <input v-model="form.year" type="number" class="input" required />
                </div>
                <div>
                  <label class="label">{{ t('cycles.copyFromPrevious') }}</label>
                  <select v-model="form.copy_from_cycle" class="input">
                    <option value="">{{ t('cycles.createEmpty') }}</option>
                    <option v-for="c in cycles" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('cycles.startDate') }}</label>
                  <input v-model="form.start_date" type="date" class="input" required />
                </div>
                <div>
                  <label class="label">{{ t('cycles.endDate') }}</label>
                  <input v-model="form.end_date" type="date" class="input" required />
                </div>
              </div>
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="btn-secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
                <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? t('common.loading') : t('common.save') }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Close Cycle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCloseModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showCloseModal = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showCloseModal = false" />
          <div class="relative card w-full max-w-md p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ t('cycles.close') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">{{ t('cycles.finalScore') }}</label>
                <input v-model="closeForm.final_score" type="number" step="0.01" class="input" />
              </div>
              <div>
                <label class="label">{{ t('cycles.closingNotes') }}</label>
                <textarea v-model="closeForm.closing_notes" class="input" rows="3" />
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="showCloseModal = false">{{ t('common.cancel') }}</button>
                <button class="btn-danger" @click="handleClose" :disabled="saving">{{ t('cycles.close') }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="confirm.show"
      :title="confirm.title"
      :message="confirm.message"
      :danger-mode="confirm.danger"
      @confirm="confirm.action"
      @cancel="confirm.show = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { cyclesService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import SortableTh from '@/components/common/SortableTh.vue'
import { useSort } from '@/composables/useSort'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore  = useAppStore()

const loading = ref(true)
const saving  = ref(false)
const cycles  = ref([])
const { sorted, sortKey, sortDir, sortBy } = useSort(cycles)

const showModal     = ref(false)
const showCloseModal = ref(false)
const selectedCycle  = ref(null)

const form = ref({ name: '', year: new Date().getFullYear(), start_date: '', end_date: '', copy_from_cycle: '' })
const closeForm = ref({ final_score: '', closing_notes: '' })

const confirm = ref({ show: false, title: '', message: '', danger: false, action: () => {} })

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

function openCreateModal() {
  form.value = { name: '', year: new Date().getFullYear(), start_date: '', end_date: '', copy_from_cycle: '' }
  showModal.value = true
}

function openCloseModal(cycle) {
  selectedCycle.value = cycle
  closeForm.value = { final_score: '', closing_notes: '' }
  showCloseModal.value = true
}

function confirmAction(type, cycle) {
  const actions = {
    activate: { title: t('cycles.activate'), action: () => handleActivate(cycle), danger: false },
    archive:  { title: t('cycles.archive'),  action: () => handleArchive(cycle),  danger: false },
  }
  const a = actions[type]
  confirm.value = {
    show: true,
    title: a.title,
    message: `${a.title} "${cycle.name}"?`,
    danger: a.danger,
    action: async () => { confirm.value.show = false; await a.action() },
  }
}

async function fetchCycles() {
  loading.value = true
  try {
    const res = await cyclesService.list()
    cycles.value = res.data || res
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  saving.value = true
  try {
    await cyclesService.create(form.value)
    appStore.showToast(t('common.success'), 'success')
    showModal.value = false
    await fetchCycles()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

async function handleActivate(cycle) {
  try {
    await cyclesService.activate(cycle.id)
    appStore.showToast(t('common.success'), 'success')
    await fetchCycles()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

async function handleClose() {
  saving.value = true
  try {
    await cyclesService.close(selectedCycle.value.id, closeForm.value)
    appStore.showToast(t('common.success'), 'success')
    showCloseModal.value = false
    await fetchCycles()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

async function handleArchive(cycle) {
  try {
    await cyclesService.archive(cycle.id)
    appStore.showToast(t('common.success'), 'success')
    await fetchCycles()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

onMounted(fetchCycles)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
