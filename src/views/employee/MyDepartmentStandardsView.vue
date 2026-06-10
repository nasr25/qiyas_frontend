<template>
  <div class="page">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-content">{{ t('nav.myStandards') }}</h1>
        <p class="text-sm text-content-muted mt-0.5">
          <span v-if="authStore.user?.department">{{ authStore.user.department.name_ar }}</span>
          <span v-if="cycle"> · {{ cycle.name }}</span>
        </p>
      </div>
      <select v-if="cycles.length > 1" v-model="selectedCycleId" class="input w-full sm:w-56" @change="load">
        <option v-for="c in cycles" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <!-- Stat strip -->
    <div v-if="!loading" class="grid grid-cols-3 sm:grid-cols-6 gap-3">
      <div v-for="s in statCards" :key="s.key" class="kpi-card !p-3">
        <p class="kpi-label">{{ s.label }}</p>
        <p class="text-xl font-bold tabular-nums" :class="s.color">{{ s.value }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <svg class="h-9 w-9 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- No active cycle -->
    <div v-else-if="!cycle" class="card p-10 text-center text-content-subtle">{{ t('myStd.noCycle') }}</div>

    <!-- Empty -->
    <div v-else-if="!standards.length" class="card p-10 text-center text-content-subtle">{{ t('myStd.noStandards') }}</div>

    <!-- Standards -->
    <div v-else class="space-y-3">
      <div v-for="std in standards" :key="std.id" class="card overflow-hidden">
        <!-- Standard header -->
        <button class="w-full flex items-start gap-3 p-4 text-start hover:bg-surface-inset transition-colors" @click="toggle(std.id)">
          <span class="font-mono text-sm font-semibold text-primary-700 dark:text-primary-400 shrink-0 mt-0.5">{{ std.standard_number }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-content">{{ std.name_ar }}</p>
              <span v-if="std.perspective" class="badge bg-brand-subtle text-brand">{{ std.perspective }}</span>
              <span v-if="std.axis" class="badge badge-draft">{{ std.axis }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 mt-1.5">
              <span v-for="(n, key) in std._counts" :key="key" v-show="n" :class="badgeFor(key)">{{ statusLabel(key) }}: {{ n }}</span>
              <span v-if="std.due_date" class="text-xs text-content-subtle">{{ t('standards.dueDate') }}: {{ formatDate(std.due_date) }}</span>
            </div>
          </div>
          <svg class="h-5 w-5 text-content-subtle shrink-0 transition-transform" :class="{ 'rotate-180': expanded.has(std.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <!-- Expanded body -->
        <div v-if="expanded.has(std.id)" class="border-t border-line p-4 space-y-4">
          <p v-if="std.description" class="text-sm text-content-muted whitespace-pre-line" dir="rtl">
            <span class="font-semibold text-content">{{ t('standards.objective') }}:</span> {{ std.description }}
          </p>

          <div v-if="!std.evidence_requirements?.length" class="text-sm text-content-subtle">{{ t('myStd.noRequirements') }}</div>

          <!-- Requirements -->
          <div v-for="req in std.evidence_requirements" :key="req.id" class="rounded-lg border border-line p-3">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-content">{{ req.title_ar }}</p>
                <p v-if="req.description" class="text-xs text-content-muted mt-0.5 whitespace-pre-line" dir="rtl">{{ req.description }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2 shrink-0">
                <StatusBadge v-if="docFor(req.id)" :status="docFor(req.id).status" />
                <span v-else class="badge badge-draft">{{ t('myStd.notUploaded') }}</span>
              </div>
            </div>

            <!-- Auditor rejection note -->
            <div v-if="docFor(req.id)?.status === 'rejected' && docFor(req.id)?.rejection_reason" class="mt-2 rounded bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-900 px-3 py-2 text-xs text-danger-700 dark:text-danger-300">
              <span class="font-semibold">{{ t('auditor.rejectionReason') }}:</span> {{ docFor(req.id).rejection_reason }}
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <label v-if="canEditDoc(req.id)" class="btn-secondary btn-sm cursor-pointer" :class="{ 'opacity-50 pointer-events-none': busyReq === req.id }">
                {{ busyReq === req.id ? t('common.loading') : (docFor(req.id) ? t('myStd.replaceFile') : t('documents.uploadEvidence')) }}
                <input type="file" class="hidden" :accept="appStore.acceptAttr" @change="e => onUpload(std, req, e)" />
              </label>
              <button v-if="canSubmit(req.id)" class="btn-primary btn-sm" :disabled="busyReq === req.id" @click="submit(req.id)">{{ t('documents.submitForReview') }}</button>
              <button v-if="docFor(req.id)" class="btn-ghost btn-sm" @click="openExtension(req.id)">{{ t('myStd.requestExtension') }}</button>
              <button v-if="docFor(req.id)" class="btn-ghost btn-sm" @click="toggleComments(req.id)">{{ t('myStd.comments') }}</button>
              <RouterLink v-if="docFor(req.id)" :to="`/documents/${docFor(req.id).id}`" class="btn-ghost btn-sm">{{ t('documents.openUpload') }}</RouterLink>
            </div>

            <!-- Comments -->
            <div v-if="openComments.has(req.id)" class="mt-3 border-t border-line pt-3 space-y-2">
              <div v-for="c in (commentsByDoc[docFor(req.id).id] || [])" :key="c.id" class="text-xs">
                <span class="font-semibold text-content">{{ c.user?.name || c.author?.name }}</span>
                <span class="text-content-subtle"> · {{ formatDate(c.created_at) }}</span>
                <p class="text-content-muted">{{ c.body }}</p>
              </div>
              <p v-if="!(commentsByDoc[docFor(req.id).id] || []).length" class="text-xs text-content-subtle">{{ t('common.noData') }}</p>
              <div class="flex gap-2">
                <input v-model="commentDraft[req.id]" class="input text-sm" :placeholder="t('myStd.addComment')" @keydown.enter="addComment(req.id)" />
                <button class="btn-primary btn-sm" :disabled="!commentDraft[req.id]?.trim()" @click="addComment(req.id)">{{ t('common.save') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Extension modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="ext.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="ext.show = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="ext.show = false" />
          <div class="relative card w-full max-w-md p-6 shadow-xl">
            <h3 class="text-lg font-semibold mb-4">{{ t('myStd.requestExtension') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">{{ t('myStd.newDate') }}</label>
                <input v-model="ext.date" type="date" class="input" required />
              </div>
              <div>
                <label class="label">{{ t('myStd.reason') }}</label>
                <textarea v-model="ext.reason" class="input" rows="3" minlength="20" required />
                <p class="hint">{{ t('myStd.reasonHint') }}</p>
              </div>
              <div class="flex justify-end gap-3">
                <button class="btn-secondary" @click="ext.show = false">{{ t('common.cancel') }}</button>
                <button class="btn-primary" :disabled="!ext.date || ext.reason.trim().length < 20 || ext.saving" @click="submitExtension">{{ ext.saving ? t('common.loading') : t('common.save') }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { standardsService, documentsService, cyclesService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'

const { t } = useI18n()
const appStore  = useAppStore()
const authStore = useAuthStore()

const loading        = ref(true)
const cycles         = ref([])
const selectedCycleId = ref('')
const cycle          = ref(null)
const standards      = ref([])
const documents      = ref([])
const expanded       = ref(new Set())
const busyReq        = ref(null)
const openComments   = ref(new Set())
const commentsByDoc  = reactive({})
const commentDraft   = reactive({})
const ext            = reactive({ show: false, reqId: null, date: '', reason: '', saving: false })

function docFor(reqId) { return documents.value.find(d => d.requirement_id === reqId) }
function canEditDoc(reqId) {
  const d = docFor(reqId)
  return !d || ['draft', 'rejected'].includes(d.status)
}
function canSubmit(reqId) {
  const d = docFor(reqId)
  return !!d && ['draft', 'rejected'].includes(d.status) && (d.current_version ?? 0) >= 1
}

const statusKeys = ['draft', 'under_review', 'approved', 'rejected', 'overdue']
function statusLabel(k) { return t(`documents.status.${k}`) }
function badgeFor(k) {
  return { draft: 'badge-draft', under_review: 'badge-under-review', approved: 'badge-approved', rejected: 'badge-rejected', overdue: 'badge-overdue' }[k] || 'badge-draft'
}

const statCards = computed(() => {
  const tally = { total: standards.value.length, draft: 0, under_review: 0, approved: 0, rejected: 0, overdue: 0 }
  documents.value.forEach(d => { if (tally[d.status] !== undefined) tally[d.status]++ })
  return [
    { key: 'total',        label: t('dashboard.total'),       value: tally.total,        color: 'text-content' },
    { key: 'draft',        label: t('dashboard.draft'),       value: tally.draft,        color: 'text-content-muted' },
    { key: 'under_review', label: t('dashboard.underReview'), value: tally.under_review, color: 'text-warning-600 dark:text-warning-400' },
    { key: 'approved',     label: t('dashboard.approved'),    value: tally.approved,     color: 'text-success-600 dark:text-success-400' },
    { key: 'rejected',     label: t('dashboard.rejected'),    value: tally.rejected,     color: 'text-danger-600 dark:text-danger-400' },
    { key: 'overdue',      label: t('dashboard.overdue'),     value: tally.overdue,      color: 'text-warning-700 dark:text-warning-400' },
  ]
})

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(appStore.isRTL ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

function toggle(id) {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

function computeCounts() {
  standards.value.forEach(std => {
    const counts = { draft: 0, under_review: 0, approved: 0, rejected: 0, overdue: 0 }
    ;(std.evidence_requirements || []).forEach(req => {
      const d = docFor(req.id)
      if (d && counts[d.status] !== undefined) counts[d.status]++
    })
    std._counts = counts
  })
}

async function load() {
  loading.value = true
  try {
    if (!selectedCycleId.value) {
      const res = await cyclesService.list()
      cycles.value = res.data || res
      const active = cycles.value.find(c => c.status === 'active')
      selectedCycleId.value = active?.id || cycles.value[0]?.id || ''
    }
    cycle.value = cycles.value.find(c => c.id === selectedCycleId.value) || null
    if (!cycle.value) { standards.value = []; documents.value = []; return }

    const [stdRes, docRes] = await Promise.all([
      standardsService.list(selectedCycleId.value, { per_page: 500 }),
      documentsService.list({ cycle_id: selectedCycleId.value, per_page: 500 }),
    ])
    standards.value = stdRes.data || stdRes
    documents.value = docRes.data || docRes
    computeCounts()
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function refreshDocs() {
  const docRes = await documentsService.list({ cycle_id: selectedCycleId.value, per_page: 500 })
  documents.value = docRes.data || docRes
  computeCounts()
}

async function ensureDoc(std, req) {
  return docFor(req.id) || await documentsService.create({
    requirement_id: req.id,
    cycle_id: std.cycle_id,
    title: req.title_ar || std.name_ar,
  })
}

async function onUpload(std, req, e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const err = appStore.validateUploadFile(file)
  if (err) { appStore.showToast(err, 'error'); return }
  busyReq.value = req.id
  try {
    const doc = await ensureDoc(std, req)
    await documentsService.upload(doc.id, file)
    appStore.showToast(t('documents.uploaded'), 'success')
    await refreshDocs()
  } catch (e2) {
    appStore.showToast(e2?.response?.data?.message || t('common.error'), 'error')
  } finally {
    busyReq.value = null
  }
}

async function submit(reqId) {
  const doc = docFor(reqId)
  if (!doc) return
  busyReq.value = reqId
  try {
    await documentsService.submit(doc.id)
    appStore.showToast(t('common.success'), 'success')
    await refreshDocs()
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    busyReq.value = null
  }
}

function openExtension(reqId) {
  ext.reqId = reqId; ext.date = ''; ext.reason = ''; ext.show = true
}
async function submitExtension() {
  const doc = docFor(ext.reqId)
  if (!doc) return
  ext.saving = true
  try {
    await documentsService.requestExtension(doc.id, ext.date, ext.reason)
    appStore.showToast(t('common.success'), 'success')
    ext.show = false
  } catch (e) {
    appStore.showToast(e?.response?.data?.message || t('common.error'), 'error')
  } finally {
    ext.saving = false
  }
}

async function toggleComments(reqId) {
  const s = new Set(openComments.value)
  if (s.has(reqId)) { s.delete(reqId); openComments.value = s; return }
  s.add(reqId); openComments.value = s
  const doc = docFor(reqId)
  if (doc && !commentsByDoc[doc.id]) {
    try { commentsByDoc[doc.id] = await documentsService.listComments(doc.id) } catch { commentsByDoc[doc.id] = [] }
  }
}
async function addComment(reqId) {
  const doc = docFor(reqId)
  const body = commentDraft[reqId]?.trim()
  if (!doc || !body) return
  try {
    const c = await documentsService.addComment(doc.id, body)
    commentsByDoc[doc.id] = [...(commentsByDoc[doc.id] || []), c]
    commentDraft[reqId] = ''
  } catch {
    appStore.showToast(t('common.error'), 'error')
  }
}

onMounted(load)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
