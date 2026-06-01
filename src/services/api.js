/**
 * Axios API client with JWT authentication and automatic token refresh.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
})

// ── Request Interceptor: attach JWT token ────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Set Accept-Language from stored locale
  const locale = localStorage.getItem('locale') || 'ar'
  config.headers['Accept-Language'] = locale
  return config
})

// ── Response Interceptor: handle 401 with token refresh ─────────────────────
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else       prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (error.response.data?.code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const { data } = await api.post('/auth/refresh')
          const newToken = data.data.token
          localStorage.setItem('token', newToken)
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`
          processQueue(null, newToken)
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          localStorage.removeItem('token')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // Other 401 — redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api
