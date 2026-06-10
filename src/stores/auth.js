/**
 * Auth store — manages JWT token, user profile, and authentication state.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated  = computed(() => !!token.value && !!user.value)
  const isSuperAdmin     = computed(() => user.value?.roles?.includes('super-admin'))
  const isAuditor        = computed(() => user.value?.roles?.includes('auditor'))
  const isCoordinator    = computed(() => user.value?.roles?.includes('coordinator'))
  const isEmployee       = computed(() => user.value?.roles?.includes('employee'))
  const isExecutive      = computed(() => user.value?.roles?.includes('executive'))
  const mustChangePassword = computed(() => user.value?.must_change_password)

  /**
   * Authenticates with username/password and stores the JWT token.
   */
  async function login(username, password) {
    const result = await authService.login(username, password)
    token.value  = result.token
    user.value   = result.user
    localStorage.setItem('token', result.token)
    localStorage.setItem('locale', result.user.locale || 'ar')
    return result
  }

  /** Dev-only quick login by username (no password). */
  async function quickLogin(username) {
    const result = await authService.quickLogin(username)
    token.value = result.token
    user.value  = result.user
    localStorage.setItem('token', result.token)
    localStorage.setItem('locale', result.user.locale || 'ar')
    return result
  }

  /** Logs out and clears local state. */
  async function logout() {
    await authService.logout()
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
  }

  /** Loads the current user profile from the API. */
  async function fetchUser() {
    if (!token.value) return null
    try {
      user.value = await authService.me()
      return user.value
    } catch {
      token.value = null
      user.value  = null
      localStorage.removeItem('token')
      return null
    }
  }

  /** Checks if the user has a specific role. */
  function hasRole(role) {
    return user.value?.roles?.includes(role) ?? false
  }

  /** Checks if the user has a specific permission. */
  function hasPermission(permission) {
    return user.value?.permissions?.includes(permission) ?? false
  }

  return {
    user, token,
    isAuthenticated, isSuperAdmin, isAuditor,
    isCoordinator, isEmployee, isExecutive,
    mustChangePassword,
    login, quickLogin, logout, fetchUser, hasRole, hasPermission,
  }
})
