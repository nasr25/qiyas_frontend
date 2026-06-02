/**
 * Notifications store — manages in-app notification state and polling.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsService } from '@/services/index'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications  = ref([])
  const unreadCount    = ref(0)
  const loading        = ref(false)
  let pollInterval     = null

  async function fetchNotifications(params = {}) {
    loading.value = true
    try {
      const result      = await notificationsService.list(params)
      notifications.value = result.data
      unreadCount.value   = result.meta.unread_count
    } finally {
      loading.value = false
    }
  }

  async function fetchCount() {
    unreadCount.value = await notificationsService.count()
  }

  async function markRead(id) {
    await notificationsService.markRead(id)
    const n = notifications.value.find(n => n.id === id)
    if (n) {
      n.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllRead() {
    await notificationsService.markAllRead()
    notifications.value.forEach(n => { n.read_at = new Date().toISOString() })
    unreadCount.value = 0
  }

  async function remove(id) {
    await notificationsService.destroy(id)
    const n = notifications.value.find(n => n.id === id)
    if (n && !n.read_at) unreadCount.value = Math.max(0, unreadCount.value - 1)
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  /** Starts polling for new notifications every 30 seconds. */
  function startPolling() {
    fetchCount()
    pollInterval = setInterval(fetchCount, 30000)
  }

  /** Stops the polling interval. */
  function stopPolling() {
    if (pollInterval) clearInterval(pollInterval)
  }

  return {
    notifications, unreadCount, loading,
    fetchNotifications, fetchCount,
    markRead, markAllRead, remove,
    startPolling, stopPolling,
  }
})
