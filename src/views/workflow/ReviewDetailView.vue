<template>
  <div class="page">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="submission">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-bold text-content">{{ submission.requirement.code }} — {{ submission.requirement.name }}</h1>
          <p class="text-sm text-content-subtle mt-1">{{ submission.department }} · v{{ submission.version_number }}</p>
        </div>
        <StatusBadge :status="submission.status" namespace="workflow.status" />
      </div>

      <div v-if="submission.employee_comment" class="card p-4">
        <h2 class="card-title mb-1">{{ t('workflow.employeeComment') }}</h2>
        <p class="text-sm text-content">{{ submission.employee_comment }}</p>
      </div>

      <div class="card p-4">
        <h2 class="card-title mb-3">{{ t('workflow.evidenceFiles') }}</h2>
        <div class="space-y-2">
          <div v-for="f in submission.files" :key="f.id" class="flex items-center justify-between p-2 rounded-lg bg-surface-inset">
            <span class="text-sm text-content truncate">{{ f.original_name }} ({{ f.file_size }})</span>
            <button class="btn-icon" @click="download(f.id, f.original_name)" :aria-label="t('common.download')">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
            </button>
          </div>
          <p v-if="submission.files.length === 0" class="text-sm text-content-subtle">{{ t('workflow.noFiles') }}</p>
        </div>
      </div>

      <div class="card p-4" v-if="submission.decisions.length" data-testid="prior-decisions">
        <h2 class="card-title mb-3">{{ t('workflow.priorDecisions') }}</h2>
        <ul class="space-y-2 text-sm">
          <li v-for="(d, i) in submission.decisions" :key="i" class="border-s-2 border-line ps-3" :data-testid="`prior-decision-${d.stage}`">
            <span class="font-medium">{{ t(`workflow.stages.${d.stage}`) }}</span> —
            <span :class="d.decision === 'approved' ? 'text-success-600' : 'text-danger-600'">{{ t(`workflow.decision.${d.decision}`) }}</span>
            <span class="text-content-subtle"> · {{ d.reviewer }}</span>
            <p v-if="d.rejection_reason" class="text-content-subtle">{{ d.rejection_reason }}</p>
          </li>
        </ul>
      </div>

      <div v-if="isPendingThisStage" class="card p-4 space-y-3">
        <h2 class="card-title">{{ t('workflow.makeDecision') }}</h2>
        <textarea v-model="notes" :placeholder="t('workflow.reviewNotes')" class="input" rows="2" data-testid="review-notes-input"></textarea>
        <div class="flex gap-2">
          <button class="btn-primary" :disabled="acting" data-testid="approve-button" @click="approve">{{ t('workflow.approve') }}</button>
          <button class="btn-secondary text-danger-600" :disabled="acting" data-testid="reject-button" @click="showReject = !showReject">{{ t('workflow.reject') }}</button>
        </div>
        <div v-if="showReject" class="space-y-2">
          <label class="label">{{ t('workflow.rejectionReasonRequired') }}</label>
          <textarea v-model="rejectionReason" class="input" rows="2" data-testid="rejection-reason-input"></textarea>
          <button class="btn-primary btn-sm" :disabled="!rejectionReason || acting" data-testid="confirm-reject-button" @click="reject">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { evidenceService, reviewQueueService } from '@/services/index'
import { saveBlob } from '@/composables/useFileDownload'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const loading = ref(true)
const submission = ref(null)
const notes = ref('')
const rejectionReason = ref('')
const showReject = ref(false)
const acting = ref(false)

const stageStatusMap = {
  'department-manager': 'pending_department_manager',
  auditor: 'pending_auditor',
  'program-manager': 'pending_program_manager',
}

const isPendingThisStage = computed(() => submission.value?.status === stageStatusMap[route.params.stage])

async function load() {
  loading.value = true
  try {
    submission.value = await evidenceService.get(route.params.programCode, route.params.id)
  } finally {
    loading.value = false
  }
}

async function download(fileId, name) {
  const blob = await evidenceService.download(route.params.programCode, fileId)
  saveBlob(blob, name)
}

async function approve() {
  acting.value = true
  try {
    await reviewQueueService.approve(route.params.programCode, route.params.stage, submission.value.id, notes.value)
    appStore.showToast(t('workflow.decisionRecorded'), 'success')
    router.push({ name: 'program-review-queue', params: { stage: route.params.stage } })
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    acting.value = false
  }
}

async function reject() {
  acting.value = true
  try {
    await reviewQueueService.reject(route.params.programCode, route.params.stage, submission.value.id, rejectionReason.value, notes.value)
    appStore.showToast(t('workflow.decisionRecorded'), 'success')
    router.push({ name: 'program-review-queue', params: { stage: route.params.stage } })
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>
