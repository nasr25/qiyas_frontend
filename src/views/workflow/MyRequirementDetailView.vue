<template>
  <div class="page">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="assignment">
      <div>
        <h1 class="text-xl font-bold text-content">{{ assignment.requirement.code }} — {{ assignment.requirement.name }}</h1>
        <p class="text-sm text-content-subtle mt-1">{{ assignment.department.name || assignment.department }}</p>
      </div>

      <div v-if="assignment.instructions_ar || assignment.instructions_en" class="card p-4">
        <h2 class="card-title mb-2">{{ t('workflow.instructions') }}</h2>
        <p class="text-sm text-content">{{ locale === 'ar' ? assignment.instructions_ar : assignment.instructions_en }}</p>
      </div>

      <div class="card p-4" v-if="submission">
        <div class="flex items-center justify-between mb-3">
          <h2 class="card-title">{{ t('workflow.evidenceSubmission') }} v{{ submission.version_number }}</h2>
          <StatusBadge :status="submission.status" namespace="workflow.status" />
        </div>

        <div v-if="canEdit && lastRejectionReason" class="card border-danger-200 bg-danger-50 dark:bg-danger-950/30 p-3 mb-4" data-testid="rejection-reason-banner">
          <p class="text-sm font-medium text-danger-700 dark:text-danger-300">{{ t('workflow.rejectionReason') }}</p>
          <p class="text-sm text-danger-700 dark:text-danger-300">{{ lastRejectionReason }}</p>
        </div>

        <!-- Files -->
        <div class="space-y-2 mb-4" data-testid="evidence-file-list">
          <div v-for="f in submission.files" :key="f.id" class="flex items-center justify-between p-2 rounded-lg bg-surface-inset" :data-testid="`evidence-file-${f.original_name}`">
            <span class="text-sm text-content truncate">{{ f.original_name }} ({{ f.file_size }})</span>
            <div class="flex gap-2">
              <button class="btn-icon" @click="download(f.id, f.original_name)" :aria-label="t('common.download')">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
              </button>
              <button v-if="canEdit" class="btn-icon text-danger-600" @click="removeFile(f.id)" :aria-label="t('common.delete')">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <p v-if="submission.files.length === 0" class="text-sm text-content-subtle">{{ t('workflow.noFiles') }}</p>
        </div>

        <div v-if="canEdit" class="space-y-3">
          <input type="file" ref="fileInput" class="input" data-testid="evidence-upload" @change="onFileChange" />
          <textarea v-model="comment" :placeholder="t('workflow.employeeComment')" class="input" rows="3" data-testid="employee-comment-input"></textarea>
          <div class="flex gap-2">
            <button class="btn-primary" :disabled="submitting || submission.files.length === 0" data-testid="submit-evidence-button" @click="submit">
              {{ t('workflow.submitForReview') }}
            </button>
            <button class="btn-secondary" data-testid="extension-request-button" @click="showExtensionForm = !showExtensionForm">{{ t('workflow.requestExtension') }}</button>
          </div>

          <div v-if="showExtensionForm" class="card p-3 space-y-2">
            <label class="label">{{ t('workflow.requestedDueDate') }}</label>
            <input type="date" v-model="extensionForm.requested_due_date" class="input" data-testid="extension-date-input" />
            <label class="label">{{ t('workflow.extensionReason') }}</label>
            <textarea v-model="extensionForm.reason" class="input" rows="2" data-testid="extension-reason-input"></textarea>
            <button class="btn-primary btn-sm" data-testid="extension-submit-button" @click="requestExtension">{{ t('common.submit') }}</button>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="card p-4" data-testid="workflow-timeline">
        <h2 class="card-title mb-3">{{ t('workflow.history') }}</h2>
        <ul class="space-y-2">
          <li v-for="(e, i) in timeline" :key="i" class="text-sm border-s-2 border-line ps-3 py-1" :data-testid="`timeline-event-${e.event_type}`">
            <span class="font-medium text-content">{{ t(`workflow.events.${e.event_type}`, e.event_type) }}</span>
            <span class="text-content-subtle"> — {{ e.user || t('workflow.system') }} · {{ formatDate(e.created_at) }}</span>
            <p v-if="e.notes" class="text-content-subtle">{{ e.notes }}</p>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { assignmentsService, evidenceService } from '@/services/index'
import { saveBlob } from '@/composables/useFileDownload'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAppStore } from '@/stores/app'

const { t, locale } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const loading = ref(true)
const assignment = ref(null)
const submission = ref(null)
const timeline = ref([])
const comment = ref('')
const submitting = ref(false)
const fileInput = ref(null)
const showExtensionForm = ref(false)
const extensionForm = ref({ requested_due_date: '', reason: '' })

const programCode = () => route.params.programCode
const canEdit = computed(() => submission.value && ['draft', 'returned_for_revision'].includes(submission.value.status))
// Read from the assignment-level timeline, not submission.decisions:
// reopening a returned submission immediately starts a new evidence
// version (see WorkflowService::getOrCreateDraft()), which has no
// decisions of its own yet — the rejection that produced it lives on the
// PREVIOUS version. The timeline is scoped to the assignment across every
// version, so the most recent "*_rejected" event there is always the
// right one to show, whether the new draft has been created yet or not.
const lastRejectionReason = computed(() => {
  const rejectionEvents = timeline.value.filter(e => e.event_type?.endsWith('_rejected'))
  return rejectionEvents.length ? rejectionEvents[rejectionEvents.length - 1].notes : ''
})

function formatDate(d) {
  return d ? new Date(d).toLocaleString(locale.value) : ''
}

async function loadTimeline() {
  if (!submission.value) return
  timeline.value = await evidenceService.timeline(programCode(), submission.value.id)
}

async function load() {
  loading.value = true
  try {
    const draft = await assignmentsService.openDraft(programCode(), route.params.id)
    submission.value = draft
    assignment.value = { requirement: draft.requirement, department: draft.department, instructions_ar: '', instructions_en: '' }
    const detail = await assignmentsService.get(programCode(), route.params.id)
    assignment.value = detail
    await loadTimeline()
  } finally {
    loading.value = false
  }
}

async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    await evidenceService.uploadFile(programCode(), submission.value.id, file)
    appStore.showToast(t('workflow.fileUploaded'), 'success')
    await refreshSubmission()
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function removeFile(fileId) {
  await evidenceService.removeFile(programCode(), fileId)
  await refreshSubmission()
}

async function refreshSubmission() {
  submission.value = await evidenceService.get(programCode(), submission.value.id)
}

async function download(fileId, name) {
  const blob = await evidenceService.download(programCode(), fileId)
  saveBlob(blob, name)
}

async function submit() {
  submitting.value = true
  try {
    const res = await evidenceService.submit(programCode(), submission.value.id, comment.value)
    appStore.showToast(t('workflow.submitted'), 'success')
    submission.value = res.data
    await loadTimeline()
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    submitting.value = false
  }
}

async function requestExtension() {
  try {
    await assignmentsService.requestExtension(programCode(), route.params.id, extensionForm.value)
    appStore.showToast(t('workflow.extensionRequested'), 'success')
    showExtensionForm.value = false
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  }
}

onMounted(load)
</script>
