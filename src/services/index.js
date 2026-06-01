/**
 * Central export of all API services.
 */
import api from './api'

export { authService } from './auth.service'
export { documentsService } from './documents.service'

// ── Inline services for simpler CRUD resources ───────────────────────────────

export const cyclesService = {
  list:     (params) => api.get('/cycles', { params }).then(r => r.data),
  get:      (id)     => api.get(`/cycles/${id}`).then(r => r.data.data),
  create:   (data)   => api.post('/cycles', data).then(r => r.data),
  update:   (id, d)  => api.put(`/cycles/${id}`, d).then(r => r.data),
  activate: (id)     => api.post(`/cycles/${id}/activate`).then(r => r.data),
  close:    (id, d)  => api.post(`/cycles/${id}/close`, d).then(r => r.data),
  archive:  (id)     => api.post(`/cycles/${id}/archive`).then(r => r.data),
}

export const departmentsService = {
  list:    (params) => api.get('/departments', { params }).then(r => r.data),
  get:     (id)     => api.get(`/departments/${id}`).then(r => r.data.data),
  create:  (data)   => api.post('/departments', data).then(r => r.data),
  update:  (id, d)  => api.put(`/departments/${id}`, d).then(r => r.data),
  destroy: (id)     => api.delete(`/departments/${id}`).then(r => r.data),
}

export const standardsService = {
  list:    (cycleId, params) => api.get(`/cycles/${cycleId}/standards`, { params }).then(r => r.data),
  get:     (cycleId, id)     => api.get(`/cycles/${cycleId}/standards/${id}`).then(r => r.data.data),
  create:  (cycleId, data)   => api.post(`/cycles/${cycleId}/standards`, data).then(r => r.data),
  update:  (cycleId, id, d)  => api.put(`/cycles/${cycleId}/standards/${id}`, d).then(r => r.data),
  destroy: (cycleId, id)     => api.delete(`/cycles/${cycleId}/standards/${id}`).then(r => r.data),
}

export const requirementsService = {
  list:    (standardId)       => api.get(`/standards/${standardId}/requirements`).then(r => r.data.data),
  create:  (standardId, data) => api.post(`/standards/${standardId}/requirements`, data).then(r => r.data),
  update:  (standardId, id, d)=> api.put(`/standards/${standardId}/requirements/${id}`, d).then(r => r.data),
  destroy: (standardId, id)   => api.delete(`/standards/${standardId}/requirements/${id}`).then(r => r.data),
}

export const auditorService = {
  pendingReviews:    (params) => api.get('/auditor/pending-reviews', { params }).then(r => r.data),
  approve:           (id)     => api.post(`/auditor/documents/${id}/approve`).then(r => r.data),
  reject:            (id, d)  => api.post(`/auditor/documents/${id}/reject`, d).then(r => r.data),
  extensions:        (params) => api.get('/auditor/extension-requests', { params }).then(r => r.data),
  approveExtension:  (id, d)  => api.post(`/auditor/extension-requests/${id}/approve`, d).then(r => r.data),
  rejectExtension:   (id, d)  => api.post(`/auditor/extension-requests/${id}/reject`, d).then(r => r.data),
}

export const dashboardService = {
  get: (params) => api.get('/dashboard', { params }).then(r => r.data.data),
}

export const notificationsService = {
  list:        (params) => api.get('/notifications', { params }).then(r => r.data),
  count:       ()       => api.get('/notifications/count').then(r => r.data.data.unread),
  markRead:    (id)     => api.post(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: ()       => api.post('/notifications/mark-all-read').then(r => r.data),
  destroy:     (id)     => api.delete(`/notifications/${id}`).then(r => r.data),
}

export const reportsService = {
  byDepartment: (params) => api.get('/reports/by-department', { params }).then(r => r.data.data),
  byStandard:   (params) => api.get('/reports/by-standard', { params }).then(r => r.data.data),
  byStatus:     (params) => api.get('/reports/by-status', { params }).then(r => r.data),
  cycleSummary: (params) => api.get('/reports/cycle-summary', { params }).then(r => r.data.data),
}

export const adminService = {
  // Users
  listUsers:    (params) => api.get('/admin/users', { params }).then(r => r.data),
  getUser:      (id)     => api.get(`/admin/users/${id}`).then(r => r.data.data),
  createUser:   (data)   => api.post('/admin/users', data).then(r => r.data),
  updateUser:   (id, d)  => api.put(`/admin/users/${id}`, d).then(r => r.data),
  ldapSearch:   (query)  => api.get('/admin/users/ldap-search', { params: { query } }).then(r => r.data.data),
  importLdap:   (data)   => api.post('/admin/users/import-ldap', data).then(r => r.data),
  resetPassword:(id, d)  => api.post(`/admin/users/${id}/reset-password`, d).then(r => r.data),
  toggleActive: (id)     => api.post(`/admin/users/${id}/toggle-active`).then(r => r.data),
  // Settings
  getSettings:  ()       => api.get('/admin/settings').then(r => r.data.data),
  updateSettings:(data)  => api.post('/admin/settings', data).then(r => r.data),
  uploadBranding:(form)  => api.post('/admin/settings/branding/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  // Audit Logs
  auditLogs:    (params) => api.get('/admin/audit-logs', { params }).then(r => r.data),
}
