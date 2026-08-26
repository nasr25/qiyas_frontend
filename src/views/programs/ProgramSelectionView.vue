<template>
  <div class="page">
    <div>
      <h1 class="text-xl font-bold text-content">{{ t('programs.title') }}</h1>
      <p class="text-sm text-content-subtle mt-1">{{ t('programs.subtitle') }}</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <svg class="h-10 w-10 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <div v-else-if="programsStore.programs.length === 0" class="card p-10 text-center">
      <p class="text-content-subtle">{{ t('programs.empty') }}</p>
    </div>

    <div v-else class="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="program in programsStore.programs"
        :key="program.code"
        type="button"
        class="card p-5 text-start hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-brand"
        :data-testid="`program-card-${program.code}`"
        @click="openProgram(program)"
      >
        <div class="flex items-center gap-3 mb-3">
          <div
            class="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 text-white font-bold"
            :style="{ backgroundColor: program.primary_color || 'var(--brand)' }"
          >
            {{ (program.name || program.code)[0] }}
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-bold text-content truncate">{{ program.name }}</h2>
            <span class="badge" :class="program.status === 'active' ? 'badge-approved' : 'badge-draft'">
              {{ t(`programs.status.${program.status}`) }}
            </span>
          </div>
        </div>

        <p v-if="program.description" class="text-sm text-content-subtle line-clamp-2 mb-4">
          {{ program.description }}
        </p>

        <div class="flex items-center justify-between text-sm border-t border-line pt-3">
          <div v-if="program.current_cycle" class="min-w-0">
            <p class="text-xs text-content-subtle">{{ t('programs.currentCycle') }}</p>
            <p class="font-medium text-content truncate">{{ program.current_cycle.name }}</p>
          </div>
          <div v-if="program.summary" class="text-end shrink-0">
            <p class="text-xs text-content-subtle">{{ t('programs.completion') }}</p>
            <p class="font-bold text-brand">{{ program.summary.completion_rate }}%</p>
          </div>
        </div>

        <span class="btn-primary w-full mt-4 justify-center">{{ t('programs.open') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useProgramsStore } from '@/stores/programs'

const { t, locale } = useI18n()
const router = useRouter()
const programsStore = useProgramsStore()
const loading = ref(true)

function openProgram(program) {
  router.push({ name: 'program-dashboard', params: { programCode: program.code } })
}

// Program names/descriptions resolve server-side from the current locale —
// refetch on language switch so cards update without a full page reload.
watch(locale, () => programsStore.fetchPrograms().catch(() => {}))

onMounted(async () => {
  loading.value = true
  try {
    await programsStore.fetchPrograms()
  } finally {
    loading.value = false
  }
})
</script>
