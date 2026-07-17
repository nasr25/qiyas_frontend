/**
 * Programs store — the list of compliance programs the current user can
 * access, and the currently selected program context (derived from the
 * :programCode route param). The backend is always the source of truth for
 * access: this store never decides who can see a program, it only caches
 * what the API already returned.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { programsService } from '@/services/index'

export const useProgramsStore = defineStore('programs', () => {
  const programs = ref([])
  const currentProgram = ref(null)
  const loading = ref(false)

  const hasMultiplePrograms = computed(() => programs.value.length > 1)

  async function fetchPrograms() {
    loading.value = true
    try {
      programs.value = await programsService.list()
      return programs.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Loads the program for the given code (route param), used to render the
   * program context in the layout. Always refetches — the API response is
   * locale-dependent (name/description resolve server-side from the current
   * language), so a cached-by-code result would go stale on a language
   * switch without a full navigation.
   */
  async function fetchCurrentProgram(code) {
    currentProgram.value = await programsService.get(code)
    return currentProgram.value
  }

  function clearCurrentProgram() {
    currentProgram.value = null
  }

  return {
    programs, currentProgram, loading, hasMultiplePrograms,
    fetchPrograms, fetchCurrentProgram, clearCurrentProgram,
  }
})
