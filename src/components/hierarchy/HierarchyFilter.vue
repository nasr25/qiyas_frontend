<template>
  <div class="flex flex-wrap gap-3" data-testid="hierarchy-filter">
    <div v-for="(level, i) in levels" :key="level.key" class="min-w-[11rem]">
      <label class="label">{{ level.name }}</label>
      <select
        class="input"
        :value="selected[i] ?? ''"
        :disabled="i > 0 && !selected[i - 1]"
        :data-testid="`filter-${level.key}`"
        @change="onChange(i, $event.target.value)"
      >
        <option value="">{{ t('common.all') }}</option>
        <option v-for="opt in options[i] || []" :key="opt.id" :value="opt.id">
          {{ opt.code }} — {{ opt.name }}
        </option>
      </select>
    </div>

    <div v-if="selected.some(Boolean)" class="self-end">
      <button class="btn-secondary" data-testid="filter-clear" @click="clear">
        {{ t('common.clear') }}
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * Cascading hierarchy filters generated entirely from metadata.
 *
 * The chain is built from the program's filterable levels — three selects
 * for Sumoud, up to six for NDMO — and each select's options are fetched
 * scoped to the selection above it. Nothing here knows a level name or a
 * chain length, which is what audit finding H3 required (the old API could
 * only ever offer two: /domains and /categories).
 */
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  /** Filterable levels, shallowest first. */
  levels: { type: Array, required: true },
  /** async (levelKey, parentNodeId) => [{id, code, name}] */
  loadOptions: { type: Function, required: true },
})

const emit = defineEmits(['change'])

const options = ref([])
const selected = ref([])

async function loadLevel(index) {
  const level = props.levels[index]
  if (!level) return
  const parent = index === 0 ? null : selected.value[index - 1]
  options.value[index] = (index === 0 || parent)
    ? await props.loadOptions(level.key, parent)
    : []
}

async function onChange(index, rawValue) {
  const value = rawValue ? Number(rawValue) : null
  selected.value[index] = value

  // Everything below a changed level is invalidated, which is what makes
  // the chain cascade rather than show stale children.
  for (let i = index + 1; i < props.levels.length; i++) {
    selected.value[i] = null
    options.value[i] = []
  }
  if (value) await loadLevel(index + 1)

  emit('change', deepestSelection())
}

function deepestSelection() {
  for (let i = selected.value.length - 1; i >= 0; i--) {
    if (selected.value[i]) return selected.value[i]
  }
  return null
}

async function clear() {
  selected.value = []
  options.value = []
  await loadLevel(0)
  emit('change', null)
}

watch(() => props.levels, async (levels) => {
  selected.value = []
  options.value = []
  if (levels?.length) await loadLevel(0)
}, { immediate: true, deep: false })
</script>
