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
  const upload       = ref({ allowed_types: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'jpg', 'jpeg', 'png'], max_size_mb: 20 })

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
        if (b.upload?.allowed_types?.length) upload.value = b.upload
        if (b.favicon_url) applyFavicon(b.favicon_url)
      }
    } catch { /* keep defaults */ }
  }

  /** Accept attribute string for file inputs, e.g. ".pdf,.docx,.png". */
  const acceptAttr = computed(() => upload.value.allowed_types.map(e => '.' + e).join(','))

  /** Validates a File against the configured types/size. Returns an error message or null. */
  function validateUploadFile(file) {
    if (!file) return null
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!upload.value.allowed_types.includes(ext)) {
      return `${isRTL.value ? 'نوع ملف غير مدعوم. المسموح:' : 'Unsupported file type. Allowed:'} ${upload.value.allowed_types.join(', ')}`
    }
    if (file.size > upload.value.max_size_mb * 1024 * 1024) {
      return `${isRTL.value ? 'حجم الملف يتجاوز الحد' : 'File exceeds the max size'} (${upload.value.max_size_mb}MB)`
    }
    return null
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
    locale, theme, sidebarOpen, toasts, branding, upload,
    isRTL, isDark, acceptAttr,
    setLocale, toggleTheme, toggleSidebar,
    showToast, removeToast, loadBranding, validateUploadFile,
  }
})
