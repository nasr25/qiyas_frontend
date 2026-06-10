<template>
  <th
    class="cursor-pointer select-none group"
    :aria-sort="active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'"
    @click="$emit('sort', field)"
  >
    <span class="inline-flex items-center gap-1">
      <slot />
      <svg class="h-3 w-3 shrink-0 transition-opacity"
        :class="active ? 'opacity-100 text-brand' : 'opacity-25 group-hover:opacity-60'"
        viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <template v-if="!active">
          <path d="M6 1.5 3.5 4.5h5L6 1.5Z" /><path d="M6 10.5 3.5 7.5h5L6 10.5Z" />
        </template>
        <path v-else-if="sortDir === 'asc'" d="M6 2 2.5 7h7L6 2Z" />
        <path v-else d="M6 10 2.5 5h7L6 10Z" />
      </svg>
    </span>
  </th>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  field:   { type: String, required: true },
  sortKey: { type: String, default: null },
  sortDir: { type: String, default: 'asc' },
})
defineEmits(['sort'])

const active = computed(() => props.sortKey === props.field)
</script>
