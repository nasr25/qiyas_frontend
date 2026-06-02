<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3 border-t border-line">
    <!-- Total records -->
    <p class="text-sm text-content-muted">
      {{ total.toLocaleString(locale) }} {{ t('common.rows') }}
    </p>

    <!-- Page buttons -->
    <div class="flex items-center gap-1 flex-wrap">
      <!-- Prev -->
      <button
        class="btn btn-secondary btn-sm"
        :disabled="currentPage <= 1"
        @click="emit('page-change', currentPage - 1)"
      >
        {{ t('common.prev') }}
      </button>

      <!-- Page numbers -->
      <template v-for="page in visiblePages" :key="page">
        <span v-if="page === '...'" class="px-2 py-1 text-sm text-content-subtle">…</span>
        <button
          v-else
          class="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
          :class="page === currentPage
            ? 'bg-brand text-brand-contrast'
            : 'text-content-muted hover:bg-surface-inset'"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="emit('page-change', page)"
        >
          {{ page.toLocaleString(locale) }}
        </button>
      </template>

      <!-- Next -->
      <button
        class="btn btn-secondary btn-sm"
        :disabled="currentPage >= lastPage"
        @click="emit('page-change', currentPage + 1)"
      >
        {{ t('common.next') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const appStore = useAppStore()
const locale = computed(() => appStore.locale)

const props = defineProps({
  currentPage: { type: Number, required: true },
  lastPage:    { type: Number, required: true },
  total:       { type: Number, default: 0 },
})

const emit = defineEmits(['page-change'])

const visiblePages = computed(() => {
  const { currentPage, lastPage } = props
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, i) => i + 1)
  }
  const pages = []
  pages.push(1)
  if (currentPage > 4) pages.push('...')
  const start = Math.max(2, currentPage - 2)
  const end   = Math.min(lastPage - 1, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  if (currentPage < lastPage - 3) pages.push('...')
  pages.push(lastPage)
  return pages
})
</script>
