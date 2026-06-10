<template>
  <div class="space-y-6">
    <!-- Back -->
    <RouterLink to="/documents" class="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline dark:text-primary-400">
      <svg class="h-4 w-4 rotate-180 rtl:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      {{ t('documents.title') }}
    </RouterLink>

    <div v-if="loading" class="flex justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <template v-else-if="doc">
      <!-- Header card -->
      <div class="card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 flex-wrap mb-2">
              <h1 class="text-xl font-bold text-content">{{ doc.title }}</h1>
              <StatusBadge :status="doc.status" />
            </div>
            <div class="flex flex-wrap gap-4 text-sm text-content-muted">
              <span>{{ t('departments.title') }}: <strong class="text-content">{{ doc.department?.name_ar }}</strong></span>
              <span>{{ t('standards.requirements') }}: <strong class="text-content">{{ doc.requirement?.title_ar }}</strong></span>
              <span>{{ t('cycles.title') }}: <strong class="text-content">{{ doc.cycle?.name }}</strong></span>
            </div>
          </div>
          <!-- Current version download -->
          <button v-if="doc.current_version" class="btn-secondary" @click="downloadVersion(doc.current_version)">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {{ t('documents.download') }} v{{ doc.current_version }}
          </button>
        </div>

        <!-- Rejection reason -->
        <div v-if="doc.status === 'rejected' && doc.rejection_reason" class="mt-4 rounded-lg bg-danger-50 border border-danger-200 dark:bg-danger-900/20 dark:border-danger-700 px-4 py-3">
          <p class="text-sm font-medium text-danger-700 dark:text-danger-300">{{ t('documents.rejectionReason') }}</p>
          <p class="text-sm text-danger-600 dark:text-danger-400 mt-1">{{ doc.rejection_reason }}</p>
        </div>
      </div>

      <!-- Version history -->
      <div class="card">
        <div class="card-header">
          <h2 class="text-sm font-semibold text-content">{{ t('documents.versions') }}</h2>
        </div>
        <div class="table-wrapper rounded-none border-0">
          <table class="table">
            <thead>
              <tr>
                <th>v</th>
                <th>Filename</th>
                <th>Size</th>
                <th>Uploaded By</th>
                <th>{{ t('common.date') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!versions.length">
                <td colspan="6" class="text-center py-6 text-content-subtle">{{ t('common.noData') }}</td>
              </tr>
              <tr v-for="v in versions" :key="v.id">
                <td class="font-mono font-semibold text-primary-700 dark:text-primary-400">v{{ v.version_number }}</td>
                <td class="max-w-[200px] truncate">{{ v.original_filename }}</td>
                <td class="text-xs">{{ formatSize(v.file_size) }}</td>
                <td>{{ v.uploader?.name }}</td>
                <td>{{ formatDate(v.created_at) }}</td>
                <td>
                  <button class="btn-secondary btn-sm" @click="downloadVersion(v.version_number)">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Upload new version -->
      <div v-if="canUpload" class="card p-6">
        <h2 class="text-sm font-semibold text-content mb-4">{{ t('documents.upload') }}</h2>
        <div class="space-y-4">
          <div>
            <label class="label">{{ t('documents.file') }}</label>
            <input type="file" class="input" :accept="appStore.acceptAttr" @change="onPickFile" />
            <p class="hint">{{ t('documents.allowedTypes') }}: {{ appStore.upload.allowed_types.join(', ') }} · {{ t('common.max') }} {{ appStore.upload.max_size_mb }}MB</p>
          </div>
          <div>
            <label class="label">{{ t('documents.changeReason') }}</label>
            <textarea v-model="uploadForm.reason" class="input" rows="2" />
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <button class="btn-primary" :disabled="!uploadForm.file || uploading" @click="handleUpload">
              <svg v-if="uploading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ uploading ? t('common.loading') : t('documents.upload') }}
            </button>
            <button v-if="canSubmit" class="btn btn-sm bg-success-600 text-white hover:bg-success-700" @click="handleSubmit">
              {{ t('documents.submit') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Extension request -->
      <div v-if="doc.cycle?.status === 'active'" class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-content">{{ t('documents.extensionRequest') }}</h2>
          <button class="btn-secondary btn-sm" @click="showExtension = !showExtension">
            {{ showExtension ? t('common.cancel') : t('documents.extensionRequest') }}
          </button>
        </div>
        <Transition name="expand">
          <div v-if="showExtension" class="space-y-4">
            <div>
              <label class="label">Requested Date</label>
              <input v-model="extForm.requested_date" type="date" class="input" />
            </div>
            <div>
              <label class="label">Reason</label>
              <textarea v-model="extForm.reason" class="input" rows="3" minlength="20" />
              <p class="hint">{{ t('myStd.reasonHint') }}</p>
            </div>
            <button class="btn-primary btn-sm" :disabled="!extForm.requested_date || extForm.reason.trim().length < 20 || extSaving" @click="handleExtension">
              {{ extSaving ? t('common.loading') : t('common.save') }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Comments -->
      <div class="card">
        <div class="card-header">
          <h2 class="text-sm font-semibold text-content">{{ t('documents.comments') }}</h2>
        </div>
        <div class="divide-y divide-line">
          <div v-if="!comments.length" class="px-6 py-8 text-center text-content-subtle text-sm">{{ t('common.noData') }}</div>
          <div v-for="comment in comments" :key="comment.id" class="px-6 py-4">
            <div class="flex items-start gap-3">
              <div class="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm shrink-0">
                {{ (comment.user?.name || '?')[0].toUpperCase() }}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <p class="text-sm font-medium text-content">{{ comment.user?.name }}</p>
                  <p class="text-xs text-content-subtle">{{ formatDate(comment.created_at) }}</p>
                </div>
                <p class="text-sm text-content-muted">{{ comment.body }}</p>
                <button class="text-xs text-primary-600 mt-1 hover:underline" @click="replyTo = comment.id">Reply</button>
              </div>
            </div>
            <!-- Replies -->
            <div v-if="comment.replies?.length" class="ms-11 mt-2 space-y-2 border-s-2 border-line ps-4">
              <div v-for="reply in comment.replies" :key="reply.id" class="flex items-start gap-2">
                <div class="h-6 w-6 rounded-full bg-surface-inset flex items-center justify-center text-xs font-medium shrink-0">
                  {{ (reply.user?.name || '?')[0].toUpperCase() }}
                </div>
                <div>
                  <p class="text-xs font-medium text-content">{{ reply.user?.name }}</p>
                  <p class="text-xs text-content-muted">{{ reply.body }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add comment -->
        <div class="px-6 py-4 border-t border-line">
          <div v-if="replyTo" class="text-xs text-content-muted mb-2">
            Replying to comment #{{ replyTo }}
            <button class="ms-2 text-danger-500 hover:underline" @click="replyTo = null">× Cancel</button>
          </div>
          <div class="flex gap-3">
            <textarea
              v-model="newComment"
              class="input flex-1 resize-none"
              rows="2"
              :placeholder="t('documents.comments')"
            />
            <button class="btn-primary self-end" :disabled="!newComment.trim() || commentSaving" @click="handleComment">
              {{ commentSaving ? t('common.loading') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { documentsService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'

const { t } = useI18n()
const route    = useRoute()
const appStore = useAppStore()

const loading  = ref(true)
const doc      = ref(null)
const versions = ref([])
const comments = ref([])

const uploading    = ref(false)
const extSaving    = ref(false)
const commentSaving = ref(false)
const showExtension = ref(false)
const replyTo      = ref(null)
const newComment   = ref('')

const uploadForm = ref({ file: null, reason: '' })
const extForm    = ref({ requested_date: '', reason: '' })

const canUpload = computed(() =>
  doc.value && ['draft', 'rejected'].includes(doc.value.status) && doc.value.cycle?.status === 'active'
)
const canSubmit = computed(() =>
  canUpload.value && doc.value.has_file
)

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString()
}

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

async function downloadVersion(versionNumber) {
  try {
    const resp = await documentsService.download(doc.value.id, versionNumber)
    const url  = URL.createObjectURL(new Blob([resp.data]))
    const a    = document.createElement('a')
    a.href = url
    a.download = `document-v${versionNumber}`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

function onPickFile(e) {
  const file = e.target.files?.[0] || null
  const err = file ? appStore.validateUploadFile(file) : null
  if (err) { appStore.showToast(err, 'error'); e.target.value = ''; uploadForm.value.file = null; return }
  uploadForm.value.file = file
}

async function handleUpload() {
  const err = appStore.validateUploadFile(uploadForm.value.file)
  if (err) { appStore.showToast(err, 'error'); return }
  uploading.value = true
  try {
    await documentsService.upload(doc.value.id, uploadForm.value.file, uploadForm.value.reason)
    appStore.showToast(t('common.success'), 'success')
    uploadForm.value = { file: null, reason: '' }
    await load()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    uploading.value = false
  }
}

async function handleSubmit() {
  try {
    await documentsService.submit(doc.value.id)
    appStore.showToast(t('common.success'), 'success')
    await load()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

async function handleExtension() {
  extSaving.value = true
  try {
    await documentsService.requestExtension(doc.value.id, extForm.value.requested_date, extForm.value.reason)
    appStore.showToast(t('common.success'), 'success')
    showExtension.value = false
    extForm.value = { requested_date: '', reason: '' }
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    extSaving.value = false
  }
}

async function handleComment() {
  commentSaving.value = true
  try {
    const comment = await documentsService.addComment(doc.value.id, newComment.value, replyTo.value)
    comments.value = await documentsService.listComments(doc.value.id)
    newComment.value = ''
    replyTo.value = null
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    commentSaving.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const id = route.params.id
    const [docData, versionData, commentData] = await Promise.all([
      documentsService.get(id),
      documentsService.list({ document_id: id }).catch(() => ({ data: [] })),
      documentsService.listComments(id).catch(() => []),
    ])
    doc.value = docData
    versions.value = docData.versions || versionData.data || []
    comments.value = commentData
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.expand-enter-active, .expand-leave-active { transition: all 0.3s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
.expand-enter-to, .expand-leave-from { max-height: 400px; opacity: 1; }
</style>
