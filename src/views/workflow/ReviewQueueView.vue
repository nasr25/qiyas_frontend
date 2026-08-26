<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t(`workflow.queues.${stage}`) }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('workflow.reviewQueueSubtitle') }}</p>
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
            <th class="px-4 py-2 text-start">{{ t('workflow.requirementName') }}</th>
            <th class="px-4 py-2 text-start">{{ t('nav.departments') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.submittedAt') }}</th>
            <th class="px-4 py-2 text-start">{{ t('workflow.effectiveDueDate') }}</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="border-b border-line last:border-0" :data-testid="`review-queue-row-${item.requirement.code}`">
            <td class="px-4 py-2 font-medium text-content">{{ item.requirement.code }}</td>
            <td class="px-4 py-2 text-content">{{ item.requirement.name }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ item.department }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ formatDate(item.submitted_at) }}</td>
            <td class="px-4 py-2 text-content-subtle">{{ item.effective_due_date || '—' }}</td>
            <td class="px-4 py-2 text-end">
              <RouterLink :to="{ name: 'program-review-detail', params: { stage, id: item.id } }" class="btn-secondary btn-sm" data-testid="open-review-link">
                {{ t('workflow.review') }}
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { reviewQueueService } from '@/services/index'

const { t, locale } = useI18n()
const route = useRoute()
const loading = ref(true)
const items = ref([])
const stage = computed(() => route.params.stage)

function formatDate(d) {
  return d ? new Date(d).toLocaleString(locale.value) : ''
}

async function load() {
  loading.value = true
  try {
    const res = await reviewQueueService.list(route.params.programCode, stage.value)
    items.value = res.data
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(stage, load)
onMounted(load)
</script>
