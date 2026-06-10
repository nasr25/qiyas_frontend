/**
 * Authentication service wrapping API calls.
 */
import api from './api'

export const authService = {
  /**
   * Logs in with username and password.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{token, user}>}
   */
  async login(username, password) {
    const { data } = await api.post('/auth/login', { username, password })
    return data.data
  },

  /** Dev-only quick login (no password). Backend gates to local/debug. */
  async quickLogin(username) {
    const { data } = await api.post('/auth/quick-login', { username })
    return data.data
  },

  /** Logs out and invalidates the server-side JWT. */
  async logout() {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('token')
  },

  /** Returns the current authenticated user profile. */
  async me() {
    const { data } = await api.get('/auth/me')
    return data.data
  },

  /** Refreshes the JWT token. */
  async refresh() {
    const { data } = await api.post('/auth/refresh')
    return data.data.token
  },

  /**
   * Changes the user's password.
   * @param {string} currentPassword
   * @param {string} newPassword
   * @param {string} newPasswordConfirmation
   */
  async changePassword(currentPassword, newPassword, newPasswordConfirmation) {
    const { data } = await api.post('/auth/change-password', {
      current_password:              currentPassword,
      new_password:                  newPassword,
      new_password_confirmation:     newPasswordConfirmation,
    })
    return data
  },
}
