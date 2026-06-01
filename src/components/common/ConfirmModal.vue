<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="emit('cancel')"
        @keydown.esc="emit('cancel')"
      >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('cancel')" />

        <!-- Dialog -->
        <div
          class="relative card w-full max-w-md p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <!-- Icon -->
          <div
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            :class="dangerMode ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary-50 dark:bg-primary-900/30'"
          >
            <svg
              class="h-7 w-7"
              :class="dangerMode ? 'text-red-600' : 'text-primary-700'"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path v-if="dangerMode" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 class="text-center text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {{ title }}
          </h3>
          <p class="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
            {{ message }}
          </p>

          <div class="flex gap-3 justify-center">
            <button class="btn-secondary min-w-[90px]" @click="emit('cancel')">
              {{ t('common.cancel') }}
            </button>
            <button
              :class="dangerMode ? 'btn-danger' : 'btn-primary'"
              class="min-w-[90px]"
              @click="emit('confirm')"
            >
              {{ confirmText || t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  show:        { type: Boolean, default: false },
  title:       { type: String, default: '' },
  message:     { type: String, default: '' },
  confirmText: { type: String, default: '' },
  dangerMode:  { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
