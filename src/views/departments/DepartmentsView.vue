<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <h1 class="text-xl font-bold text-content">{{ t('departments.title') }}</h1>
      <button class="btn-primary btn-sm" @click="openCreate">+ {{ t('departments.new') }}</button>
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
              <th>{{ t('departments.nameAr') }}</th>
              <th>{{ t('departments.nameEn') }}</th>
              <th>{{ t('departments.active') }}</th>
              <th>{{ t('users.title') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!departments.length">
              <td colspan="5" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
            </tr>
            <tr v-for="dept in departments" :key="dept.id">
              <td class="font-medium">{{ dept.name_ar }}</td>
              <td>{{ dept.name_en }}</td>
              <td>
                <span :class="dept.is_active ? 'badge-approved' : 'badge-rejected'">
                  {{ dept.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td>{{ dept.users_count ?? 0 }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <button class="btn-secondary btn-sm" @click="openEdit(dept)">{{ t('common.edit') }}</button>
                  <button class="btn-danger btn-sm" @click="openDelete(dept)">{{ t('common.delete') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="showModal = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false" />
          <div class="relative card w-full max-w-lg p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ editId ? t('common.edit') : t('departments.new') }}</h3>
            <form @submit.prevent="handleSave" class="space-y-4">
              <div>
                <label class="label">{{ t('departments.nameAr') }}</label>
                <input v-model="form.name_ar" class="input" required dir="rtl" />
              </div>
              <div>
                <label class="label">{{ t('departments.nameEn') }}</label>
                <input v-model="form.name_en" class="input" dir="ltr" />
              </div>
              <div>
                <label class="label">{{ t('departments.description') }}</label>
                <textarea v-model="form.description" class="input" rows="3" />
              </div>
              <div class="flex items-center gap-3">
                <input id="isActive" v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-line text-primary-600" />
                <label for="isActive" class="text-sm font-medium text-content">{{ t('departments.active') }}</label>
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

    <!-- Delete Confirm -->
    <ConfirmModal
      :show="confirmDelete.show"
      :title="t('common.delete')"
      :message="`${t('common.delete')} &quot;${confirmDelete.name}&quot;?`"
      :confirm-text="t('common.delete')"
      :danger-mode="true"
      @confirm="handleDelete"
      @cancel="confirmDelete.show = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { departmentsService } from '@/services/index'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const { t } = useI18n()
const appStore = useAppStore()

const loading     = ref(true)
const saving      = ref(false)
const departments = ref([])
const showModal   = ref(false)
const editId      = ref(null)

const form = ref({ name_ar: '', name_en: '', description: '', is_active: true })
const confirmDelete = ref({ show: false, id: null, name: '' })

async function fetchDepts() {
  loading.value = true
  try {
    const res = await departmentsService.list()
    departments.value = res.data || res
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editId.value = null
  form.value = { name_ar: '', name_en: '', description: '', is_active: true }
  showModal.value = true
}

function openEdit(dept) {
  editId.value = dept.id
  form.value = { name_ar: dept.name_ar, name_en: dept.name_en, description: dept.description || '', is_active: dept.is_active }
  showModal.value = true
}

function openDelete(dept) {
  confirmDelete.value = { show: true, id: dept.id, name: dept.name_ar }
}

async function handleSave() {
  saving.value = true
  try {
    if (editId.value) {
      await departmentsService.update(editId.value, form.value)
    } else {
      await departmentsService.create(form.value)
    }
    appStore.showToast(t('common.success'), 'success')
    showModal.value = false
    await fetchDepts()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  try {
    await departmentsService.destroy(confirmDelete.value.id)
    appStore.showToast(t('common.success'), 'success')
    confirmDelete.value.show = false
    await fetchDepts()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

onMounted(fetchDepts)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
