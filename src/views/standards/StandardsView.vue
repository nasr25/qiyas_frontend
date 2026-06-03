<template>
  <div class="space-y-6">
    <!-- Header + filters -->
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-bold text-content flex-1">{{ t('standards.title') }}</h1>
      <select v-model="filters.cycleId" class="input w-full sm:w-48" @change="fetchStandards">
        <option value="">{{ t('common.all') }} {{ t('cycles.title') }}</option>
        <option v-for="c in cycles" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="filters.departmentId" class="input w-full sm:w-48" @change="fetchStandards">
        <option value="">{{ t('common.all') }} {{ t('departments.title') }}</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name_ar }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <!-- Table -->
    <div v-else class="card">
      <div class="table-wrapper rounded-xl border-0">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('standards.number') }}</th>
              <th>{{ t('standards.nameAr') }}</th>
              <th>{{ t('standards.departments') }}</th>
              <th>{{ t('standards.weight') }}</th>
              <th>{{ t('standards.dueDate') }}</th>
              <th>{{ t('standards.requirements') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!standards.length">
              <td colspan="7" class="text-center py-10 text-content-subtle">{{ t('common.noData') }}</td>
            </tr>
            <tr v-for="std in standards" :key="std.id">
              <td class="font-mono font-medium text-primary-700 dark:text-primary-400 whitespace-nowrap">{{ std.standard_number }}</td>
              <td>
                <p class="font-medium">{{ std.name_ar || std.name_en }}</p>
                <p v-if="std.axis" class="text-xs text-content-subtle mt-0.5">{{ std.axis }}</p>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <span v-for="d in (std.departments || []).slice(0, 2)" :key="d.id" class="badge-draft">{{ d.name_ar }}</span>
                  <span v-if="(std.departments || []).length > 2" class="badge-draft">+{{ std.departments.length - 2 }}</span>
                </div>
              </td>
              <td>{{ std.weight }}</td>
              <td>{{ formatDate(std.due_date) }}</td>
              <td>{{ std.requirements_count ?? 0 }}</td>
              <td>
                <RouterLink :to="`/standards/${std.id}`" class="btn-secondary btn-sm">{{ t('common.view') }}</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { standardsService, cyclesService, departmentsService } from '@/services/index'

const { t } = useI18n()
const appStore = useAppStore()

const loading     = ref(true)
const standards   = ref([])
const cycles      = ref([])
const departments = ref([])
const filters     = ref({ cycleId: '', departmentId: '' })

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

async function fetchStandards() {
  if (!filters.value.cycleId) {
    standards.value = []
    return
  }
  loading.value = true
  try {
    const params = {}
    if (filters.value.departmentId) params.department_id = filters.value.departmentId
    const res = await standardsService.list(filters.value.cycleId, params)
    standards.value = res.data || res
  } catch {
    appStore.showToast(t('common.error'), 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const [cyclesRes, deptsRes] = await Promise.all([
      cyclesService.list(),
      departmentsService.list(),
    ])
    cycles.value = cyclesRes.data || cyclesRes
    departments.value = deptsRes.data || deptsRes
    // Auto-select active cycle
    const active = cycles.value.find(c => c.status === 'active')
    if (active) {
      filters.value.cycleId = active.id
      await fetchStandards()
    } else {
      loading.value = false
    }
  } catch {
    appStore.showToast(t('common.error'), 'error')
    loading.value = false
  }
})
</script>
