<template>
  <span :class="badgeClass">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  status: { type: String, required: true },
})

const classMap = {
  draft:        'badge-draft',
  under_review: 'badge-under-review',
  approved:     'badge-approved',
  rejected:     'badge-rejected',
  overdue:      'badge-overdue',
  // cycle statuses
  active:       'badge badge-approved',
  closed:       'badge badge-under-review',
  archived:     'badge badge-draft',
}

const badgeClass = computed(() => classMap[props.status] || 'badge-draft')

const label = computed(() => {
  try {
    return t(`documents.status.${props.status}`)
  } catch {
    return props.status
  }
})
</script>
