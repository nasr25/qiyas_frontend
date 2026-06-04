<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
onMounted(() => appStore.loadBranding())
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>
