<template>
  <Teleport to="body">
    <div
      class="fixed bottom-6 z-50 flex flex-col gap-2 pointer-events-none"
      :class="appStore.isRTL ? 'left-6' : 'right-6'"
    >
      <TransitionGroup
        name="toast"
        tag="div"
        class="flex flex-col gap-2"
      >
        <div
          v-for="toast in appStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 min-w-[300px] max-w-sm rounded-xl shadow-lg border px-4 py-3 text-sm font-medium"
          :class="toastClass(toast.type)"
        >
          <span class="mt-0.5 shrink-0 text-base">{{ toastIcon(toast.type) }}</span>
          <span class="flex-1 leading-snug">{{ toast.message }}</span>
          <button
            class="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            @click="appStore.removeToast(toast.id)"
            aria-label="Close"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

function toastClass(type) {
  const map = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200',
    error:   'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200',
    info:    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200',
  }
  return map[type] || map.info
}

function toastIcon(type) {
  const map = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
  return map[type] || map.info
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(60px);
}
html[dir="rtl"] .toast-enter-from {
  transform: translateX(-60px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(60px);
}
html[dir="rtl"] .toast-leave-to {
  transform: translateX(-60px);
}
</style>
