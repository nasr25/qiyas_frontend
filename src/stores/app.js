/**
 * App store — manages global UI state: locale, theme, sidebar, toasts.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { brandingService } from '@/services/index'

export const useAppStore = defineStore('app', () => {
  const locale       = ref(localStorage.getItem('locale') || 'ar')
  const theme        = ref(localStorage.getItem('theme') || 'light')
  // Mobile-first: drawer starts closed. On lg+ the sidebar is always shown
  // via CSS (lg:translate-x-0), so this flag only governs the mobile overlay.
  const sidebarOpen  = ref(false)
  const toasts       = ref([])
  const branding     = ref({ platform_name: '', platform_name_en: '', logo_url: '', favicon_url: '' })

  const isRTL  = computed(() => locale.value === 'ar')
  const isDark = computed(() => theme.value === 'dark')

  function setLocale(lang) {
    locale.value = lang
    localStorage.setItem('locale', lang)
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  function toggleTheme() {
    theme.value = isDark.value ? 'light' : 'dark'
    localStorage.setItem('theme', theme.value)
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  /**
   * Shows a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration  ms to show
   */
  function showToast(message, type = 'info', duration = 4000) {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    setTimeout(() => removeToast(id), duration)
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  /** Loads public branding (platform name + logo) and applies the favicon. */
  async function loadBranding() {
    try {
      const b = await brandingService.get()
      if (b) {
        branding.value = b
        if (b.favicon_url) applyFavicon(b.favicon_url)
      }
    } catch { /* keep defaults */ }
  }

  function applyFavicon(url) {
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = url
  }

  // Initialize on store creation
  document.documentElement.dir  = locale.value === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = locale.value
  document.documentElement.classList.toggle('dark', theme.value === 'dark')

  return {
    locale, theme, sidebarOpen, toasts, branding,
    isRTL, isDark,
    setLocale, toggleTheme, toggleSidebar,
    showToast, removeToast, loadBranding,
  }
})
