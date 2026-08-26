<template>
  <div class="page">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-content">{{ t('workflow.assignments') }}</h1>
        <p class="text-sm text-content-subtle mt-1">{{ t('workflow.assignmentsSubtitle') }}</p>
      </div>
      <button class="btn-primary" data-testid="new-assignment-button" @click="showForm = !showForm">{{ t('workflow.newAssignment') }}</button>
    </div>

    <div v-if="showForm" class="card p-4 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="label">{{ t('workflow.requirement') }}</label>
          <select v-model="form.requirement_id" class="input" data-testid="assign-requirement-select">
            <option value="">{{ t('common.select') }}</option>
            <option v-for="r in requirements" :key="r.id" :value="r.id">{{ r.number }} — {{ r.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">{{ t('nav.departments') }}</label>
          <select v-model="form.department_id" class="input" data-testid="department-select" @change="onDepartmentChange">
            <option value="">{{ t('common.select') }}</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">{{ t('workflow.dueDate') }}</label>
          <input type="date" v-model="form.due_date" class="input" data-testid="assign-due-date-input" />
        </div>
        <div>
          <label class="label">{{ t('workflow.priority') }}</label>
          <select v-model="form.priority" class="input">
            <option value="">{{ t('common.select') }}</option>
            <option value="low">{{ t('workflow.priorityLow') }}</option>
            <option value="medium">{{ t('workflow.priorityMedium') }}</option>
            <option value="high">{{ t('workflow.priorityHigh') }}</option>
          </select>
        </div>
        <div>
          <label class="label">{{ t('workflow.instructionsAr') }}</label>
          <textarea v-model="form.instructions_ar" class="input" rows="2" dir="rtl" data-testid="assign-instructions-ar-input"></textarea>
        </div>
        <div>
          <label class="label">{{ t('workflow.instructionsEn') }}</label>
          <textarea v-model="form.instructions_en" class="input" rows="2" dir="ltr" data-testid="assign-instructions-en-input"></textarea>
        </div>
      </div>

      <!-- Phase 7: optional responsibility labels, only shown when the program enables them -->
      <div v-if="responsibilityTypes.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line">
        <div v-for="type in responsibilityTypes" :key="type.type">
          <label class="label">{{ type.label_ar }}</label>
          <select v-model="responsibilityAssignees[type.type]" class="input" :data-testid="`responsibility-select-${type.type}`" :disabled="!departmentUsers.length">
            <option :value="undefined">{{ t('common.select') }}</option>
            <option v-for="u in departmentUsers" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>

      <button class="btn-primary" :disabled="saving" data-testid="assign-standard-button" @click="createAssignment">{{ t('workflow.assign') }}</button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <div v-else class="card overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-start text-content-subtle border-b border-line">
            <th class="px-4 py-2 text-start">{{ t('standards.code') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.requirementName') }}</th>
            <th class="px-4 py-2 text-start">{{ t('nav.departments') }}</th>
            <th class="px-4 py-2 text-start">{{ t('common.status') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.effectiveDueDate') }}</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="border-b border-line last:border-0" :data-testid="`assignment-row-${item.requirement.code}`">
            <td class="px-4 py-2 font-medium text-content">{{ item.requirement.code }}</td>
            <td class="px-4 py-2 text-content">{{ item.requirement.name }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ item.department.name }}</td>
            <td class="px-4 py-2"><StatusBadge :status="item.display_status" namespace="workflow.status" /></td>
            <td class="px-4 py-2 text-content-subtle">{{ item.effective_due_date || '—' }}</td>
            <td class="px-4 py-2 text-end">
              <button class="btn-secondary btn-sm" @click="openReassign(item)">{{ t('workflow.reassign') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Reassign modal (simple inline) -->
    <div v-if="reassignTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="reassignTarget = null">
      <div class="card p-4 w-full max-w-md space-y-3">
        <h2 class="card-title">{{ t('workflow.reassign') }} — {{ reassignTarget.requirement.code }}</h2>
        <label class="label">{{ t('nav.departments') }}</label>
        <select v-model="reassignForm.department_id" class="input">
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <label class="label">{{ t('workflow.reassignReasonRequired') }}</label>
        <textarea v-model="reassignForm.reason" class="input" rows="2"></textarea>
        <div class="flex gap-2 justify-end">
          <button class="btn-secondary" @click="reassignTarget = null">{{ t('common.cancel') }}</button>
          <button class="btn-primary" :disabled="!reassignForm.reason" @click="confirmReassign">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { assignmentsService, departmentsService, responsibilityService } from '@/services/index'
import api from '@/services/api'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const loading = ref(true)
const saving = ref(false)
const items = ref([])
const departments = ref([])
const requirements = ref([])
const showForm = ref(false)
const reassignTarget = ref(null)
const reassignForm = reactive({ department_id: '', reason: '' })

const form = reactive({ requirement_id: '', department_id: '', due_date: '', priority: '', instructions_ar: '', instructions_en: '' })

// Phase 7: optional responsibility labels (Data Owner, Data Steward, ...)
// — empty for any program that has not enabled the feature (Qiyas/
// Sumoud/ECC), so this section renders nothing for them.
const responsibilityTypes = ref([])
const departmentUsers = ref([])
const responsibilityAssignees = reactive({}) // { [type]: userId }

const programCode = () => route.params.programCode

async function load() {
  loading.value = true
  try {
    const [assignRes, deptRes, reqRes, respTypes] = await Promise.all([
      assignmentsService.list(programCode()),
      departmentsService.list(),
      api.get(`/programs/${programCode()}/requirements`, { params: { per_page: 200 } }),
      responsibilityService.types(programCode()),
    ])
    items.value = assignRes.data
    departments.value = deptRes.data.map(d => ({ id: d.id, name: d.name }))
    requirements.value = reqRes.data.data
    responsibilityTypes.value = respTypes
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

async function onDepartmentChange() {
  departmentUsers.value = []
  Object.keys(responsibilityAssignees).forEach(k => delete responsibilityAssignees[k])
  if (form.department_id) {
    departmentUsers.value = await responsibilityService.departmentUsers(programCode(), form.department_id)
  }
}

async function createAssignment() {
  saving.value = true
  try {
    const res = await assignmentsService.create(programCode(), form)
    const assignmentId = res.data.id

    for (const type of responsibilityTypes.value) {
      const userId = responsibilityAssignees[type.type]
      if (userId) {
        await responsibilityService.assign(programCode(), assignmentId, { responsibility_type: type.type, user_id: userId })
      }
    }

    appStore.showToast(t('workflow.assignmentCreated'), 'success')
    showForm.value = false
    await load()
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  } finally {
    saving.value = false
  }
}

function openReassign(item) {
  reassignTarget.value = item
  reassignForm.department_id = ''
  reassignForm.reason = ''
}

async function confirmReassign() {
  try {
    await assignmentsService.reassign(programCode(), reassignTarget.value.id, reassignForm)
    appStore.showToast(t('workflow.reassigned'), 'success')
    reassignTarget.value = null
    await load()
  } catch (err) {
    appStore.showToast(err?.response?.data?.message || t('common.error'), 'error')
  }
}

onMounted(load)
</script>
