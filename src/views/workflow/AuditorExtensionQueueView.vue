<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('workflow.extensionQueue') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('workflow.extensionQueueSubtitle') }}</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <div v-else-if="items.length === 0" class="card p-10 text-center text-content-subtle">
      {{ t('workflow.noPendingReviews') }}
    </div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-start text-content-subtle border-b border-line">
            <th class="px-4 py-2 text-start">{{ t('standards.code') }}</th>
            <th class="px-4 py-2 text-start">{{ t('nav.departments') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.requestedBy') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.currentDueDate') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.requestedDueDate') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.extensionReason') }}</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ext in items" :key="ext.id" class="border-b border-line last:border-0" :data-testid="`extension-row-${ext.requirement?.code}`">
            <td class="px-4 py-2 font-medium text-content">{{ ext.requirement?.code }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ ext.department }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ ext.requested_by }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ ext.current_due_date || '—' }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ ext.requested_due_date }}</td>
            <td class="px-4 py-2 text-content-subtle max-w-[200px] truncate">{{ ext.reason }}</td>
            <td class="px-4 py-2 text-end">
              <div v-if="ext.status === 'pending'" class="flex gap-2 justify-end">
                <button class="btn-success btn-sm" data-testid="approve-extension-button" @click="openAction('approve', ext)">{{ t('auditor.approveExtension') }}</button>
                <button class="btn-danger btn-sm" data-testid="reject-extension-button" @click="openAction('reject', ext)">{{ t('auditor.rejectExtension') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="actionModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="actionModal.show = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="actionModal.show = false" />
          <div class="relative card w-full max-w-md p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">
              {{ actionModal.type === 'approve' ? t('auditor.approveExtension') : t('auditor.rejectExtension') }}
            </h3>
            <div class="space-y-4">
              <div v-if="actionModal.type === 'reject'">
                <label class="label">{{ t('workflow.rejectionReasonRequired') }}</label>
                <textarea v-model="actionModal.reason" class="input" rows="3" data-testid="extension-decision-reason-input" />
              </div>
              <div>
                <label class="label">{{ t('workflow.reviewNotes') }}</label>
                <textarea v-model="actionModal.notes" class="input" rows="2" data-testid="extension-decision-notes-input" />
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="actionModal.show = false">{{ t('common.cancel') }}</button>
                <button
                  :class="actionModal.type === 'approve' ? 'btn-success' : 'btn-danger'"
                  :disabled="(actionModal.type === 'reject' && !actionModal.reason) || actionModal.saving"
                  data-testid="confirm-extension-decision-button"
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
import { useRoute } from 'vue-router'
import { reviewQueueService } from '@/services/index'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const loading = ref(true)
const items = ref([])
const actionModal = reactive({ show: false, type: '', target: null, reason: '', notes: '', saving: false })

async function load() {
  loading.value = true
  try {
    const res = await reviewQueueService.extensionRequests(route.params.programCode)
    items.value = res.data
  } finally {
    loading.value = false
  }
}

function openAction(type, ext) {
  actionModal.type = type
  actionModal.target = ext
  actionModal.reason = ''
  actionModal.notes = ''
  actionModal.show = true
}

async function handleAction() {
  actionModal.saving = true
  try {
    if (actionModal.type === 'approve') {
      await reviewQueueService.approveExtension(route.params.programCode, actionModal.target.id, actionModal.notes)
    } else {
      await reviewQueueService.rejectExtension(route.params.programCode, actionModal.target.id, actionModal.reason, actionModal.notes)
    }
    appStore.showToast(t('workflow.decisionRecorded'), 'success')
    actionModal.show = false
    await load()
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    actionModal.saving = false
  }
}

onMounted(load)
</script>
