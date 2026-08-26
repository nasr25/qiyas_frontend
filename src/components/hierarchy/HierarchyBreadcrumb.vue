<template>
  <!-- Always rendered, even at the root: a breadcrumb showing only the
       program is still the user's "you are here", and hiding it entirely
       made the root level look like it had no position at all. -->
  <nav class="flex flex-wrap items-center gap-1.5 text-sm" data-testid="hierarchy-breadcrumb">
    <button
      type="button"
      class="text-brand hover:underline"
      data-testid="breadcrumb-root"
      @click="$emit('navigate', null, -1)"
    >{{ rootLabel }}</button>

    <template v-for="(crumb, i) in trail" :key="crumb.id ?? i">
      <span class="text-content-subtle select-none" aria-hidden="true">/</span>
      <button
        type="button"
        class="hover:underline"
        :class="i === trail.length - 1 ? 'text-content font-medium' : 'text-brand'"
        :data-testid="`breadcrumb-${crumb.level_key}`"
        :title="crumb.level_name"
        @click="$emit('navigate', crumb, i)"
      >{{ crumb.name }}</button>
    </template>
  </nav>
</template>

<script setup>
/**
 * Renders a hierarchy path of ARBITRARY depth. It has no notion of how many
 * levels exist: it walks whatever trail it is given, so the same component
 * renders Sumoud's three entries and NDMO's six.
 *
 * Each crumb carries its own `level_name` (Perspective, Domain, …) resolved
 * server-side for the active locale, so no terminology is hard-coded here
 * either — the defect behind audit findings H5 and C2.
 */
defineProps({
  /** @type {{id:number, level_key:string, level_name:string, code:string, name:string}[]} */
  trail: { type: Array, default: () => [] },
  rootLabel: { type: String, required: true },
})

defineEmits(['navigate'])
</script>
