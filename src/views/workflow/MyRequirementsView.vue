<template>
  <div class="page">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-content">{{ t('workflow.myRequirements') }}</h1>
        <p class="text-sm text-content-subtle mt-1">{{ t('workflow.myRequirementsSubtitle') }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label class="label">{{ t('common.status') }}</label>
        <select v-model="filters.status" class="input">
          <option value="">{{ t('common.all') }}</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ t(`workflow.status.${s}`) }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <input id="overdue" type="checkbox" v-model="filters.overdue" class="h-4 w-4" />
        <label for="overdue" class="text-sm text-content">{{ t('workflow.overdueOnly') }}</label>
      </div>
      <div class="flex items-center gap-2">
        <input id="mine" type="checkbox" v-model="filters.mine_only" class="h-4 w-4" />
        <label for="mine" class="text-sm text-content">{{ t('workflow.assignedToMeOnly') }}</label>
      </div>
      <button class="btn-secondary btn-sm" @click="load">{{ t('common.filter') }}</button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <div v-else-if="items.length === 0" class="card p-10 text-center text-content-subtle">
      {{ t('workflow.noRequirements') }}
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
          <tr v-for="item in items" :key="item.id" class="border-b border-line last:border-0" :data-testid="`my-requirement-row-${item.requirement.code}`">
            <td class="px-4 py-2 font-medium text-content">{{ item.requirement.code }}</td>
            <td class="px-4 py-2 text-content">{{ item.requirement.name }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ item.department }}</td>
            <td class="px-4 py-2">
              <StatusBadge :status="item.status" namespace="workflow.status" />
              <span v-if="item.is_overdue" class="badge badge-overdue ms-1">{{ t('workflow.overdue') }}</span>
            </td>
            <td class="px-4 py-2 text-content-subtle">{{ item.effective_due_date || '—' }}</td>
            <td class="px-4 py-2 text-end">
              <RouterLink :to="{ name: 'program-my-requirement-detail', params: { id: item.id } }" class="btn-secondary btn-sm" data-testid="open-my-requirement-link">
                {{ t('common.view') }}
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { myRequirementsService } from '@/services/index'
import StatusBadge from '@/components/common/StatusBadge.vue'

const { t } = useI18n()
const route = useRoute()
const loading = ref(true)
const items = ref([])
const statuses = ['unassigned', 'assigned', 'draft', 'pending_department_manager', 'pending_auditor', 'pending_program_manager', 'returned_for_revision', 'approved']

const filters = reactive({ status: '', overdue: false, mine_only: false })

async function load() {
  loading.value = true
  try {
    const res = await myRequirementsService.list(route.params.programCode, {
      status: filters.status || undefined,
      overdue: filters.overdue || undefined,
      mine_only: filters.mine_only || undefined,
    })
    items.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
