/**
 * Central export of all API services.
 */
import api from './api'

export { authService } from './auth.service'
export { documentsService } from './documents.service'

// ── Inline services for simpler CRUD resources ───────────────────────────────

/**
 * Program-scoped cycle lifecycle — always through /programs/{program}/cycles
 * (see ProgramCycleController), never the legacy flat /cycles routes. The
 * legacy routes return/act on cycles across ALL programs with no filtering
 * (AssessmentCycleController::index() lists every cycle regardless of
 * program, and its create() silently defaults to QIYAS) — safe only for a
 * single-program platform. Once Sumoud exists, calling them from a
 * program-scoped page would leak another program's cycles into the list
 * and could create a new cycle under the wrong program. See
 * docs/cross-program-isolation.md.
 */
export const cyclesService = {
  list:     (program, params) => api.get(`/programs/${program}/cycles`, { params }).then(r => r.data),
  get:      (program, id)     => api.get(`/programs/${program}/cycles/${id}`).then(r => r.data.data),
  create:   (program, data)   => api.post(`/programs/${program}/cycles`, data).then(r => r.data),
  update:   (program, id, d)  => api.put(`/programs/${program}/cycles/${id}`, d).then(r => r.data),
  activate: (program, id)     => api.post(`/programs/${program}/cycles/${id}/activate`).then(r => r.data),
  close:    (program, id, d)  => api.post(`/programs/${program}/cycles/${id}/close`, d).then(r => r.data),
  archive:  (program, id)     => api.post(`/programs/${program}/cycles/${id}/archive`).then(r => r.data),
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
  show:    (id)              => api.get(`/standards/${id}`).then(r => r.data.data),
  create:  (cycleId, data)   => api.post(`/cycles/${cycleId}/standards`, data).then(r => r.data),
  update:  (cycleId, id, d)  => api.put(`/cycles/${cycleId}/standards/${id}`, d).then(r => r.data),
  destroy: (cycleId, id)     => api.delete(`/cycles/${cycleId}/standards/${id}`).then(r => r.data),
  template: (cycleId)        => api.get(`/cycles/${cycleId}/standards/template`, { responseType: 'blob' }).then(r => r.data),
  importExcel: (cycleId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/cycles/${cycleId}/standards/import`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
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

export const brandingService = {
  get: () => api.get('/branding').then(r => r.data.data),
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

// ── Phase 2: Qiyas operational workflow ──────────────────────────────────────

export const assignmentsService = {
  list:     (program, params) => api.get(`/programs/${program}/assignments`, { params }).then(r => r.data),
  get:      (program, id)     => api.get(`/programs/${program}/assignments/${id}`).then(r => r.data.data),
  create:   (program, data)   => api.post(`/programs/${program}/assignments`, data).then(r => r.data),
  update:   (program, id, d)  => api.put(`/programs/${program}/assignments/${id}`, d).then(r => r.data),
  reassign: (program, id, d)  => api.post(`/programs/${program}/assignments/${id}/reassign`, d).then(r => r.data),
  history:  (program, id)     => api.get(`/programs/${program}/assignments/${id}/history`).then(r => r.data.data),
  openDraft:(program, id)     => api.post(`/programs/${program}/assignments/${id}/draft`).then(r => r.data.data),
  requestExtension: (program, id, d) => api.post(`/programs/${program}/assignments/${id}/extension-requests`, d).then(r => r.data),
  extensionHistory: (program, id) => api.get(`/programs/${program}/assignments/${id}/extension-requests`).then(r => r.data.data),
}

export const myRequirementsService = {
  list: (program, params) => api.get(`/programs/${program}/my-requirements`, { params }).then(r => r.data),
}

export const evidenceService = {
  get:       (program, id) => api.get(`/programs/${program}/evidence-submissions/${id}`).then(r => r.data.data),
  timeline:  (program, id) => api.get(`/programs/${program}/evidence-submissions/${id}/timeline`).then(r => r.data.data),
  uploadFile:(program, id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/programs/${program}/evidence-submissions/${id}/files`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  removeFile:  (program, fileId) => api.delete(`/programs/${program}/evidence-files/${fileId}`).then(r => r.data),
  download:    (program, fileId) => api.get(`/programs/${program}/evidence-files/${fileId}/download`, { responseType: 'blob' }).then(r => r.data),
  submit:      (program, id, comment) => api.post(`/programs/${program}/evidence-submissions/${id}/submit`, { comment }).then(r => r.data),
}

export const reviewQueueService = {
  // stage: 'department-manager' | 'auditor' | 'program-manager'
  list:    (program, stage, params) => api.get(`/programs/${program}/reviews/${stage}`, { params }).then(r => r.data),
  approve: (program, stage, id, notes) => api.post(`/programs/${program}/reviews/${stage}/${id}/approve`, { notes }).then(r => r.data),
  reject:  (program, stage, id, reason, notes) => api.post(`/programs/${program}/reviews/${stage}/${id}/reject`, { reason, notes }).then(r => r.data),
  extensionRequests: (program, params) => api.get(`/programs/${program}/reviews/auditor/extension-requests`, { params }).then(r => r.data),
  approveExtension:  (program, id, notes) => api.post(`/programs/${program}/reviews/auditor/extension-requests/${id}/approve`, { notes }).then(r => r.data),
  rejectExtension:   (program, id, reason, notes) => api.post(`/programs/${program}/reviews/auditor/extension-requests/${id}/reject`, { reason, notes }).then(r => r.data),
}

export const slaSettingsService = {
  get:    (program)    => api.get(`/programs/${program}/sla-settings`).then(r => r.data.data),
  update: (program, d) => api.put(`/programs/${program}/sla-settings`, d).then(r => r.data.data),
}

export const workflowDashboardService = {
  programManager:    (program) => api.get(`/programs/${program}/dashboards/program-manager`).then(r => r.data.data),
  departmentManager: (program, params) => api.get(`/programs/${program}/dashboards/department-manager`, { params }).then(r => r.data.data),
  auditor:           (program) => api.get(`/programs/${program}/dashboards/auditor`).then(r => r.data.data),
  employee:          (program) => api.get(`/programs/${program}/dashboards/employee`).then(r => r.data.data),
}

export const qiyasImportService = {
  downloadTemplate: (program, cycleId) => api.get(`/programs/${program}/requirements-template`, { params: { cycle_id: cycleId }, responseType: 'blob' }).then(r => r.data),
  preview: (program, file, cycleId) => {
    const form = new FormData()
    form.append('file', file)
    form.append('cycle_id', cycleId)
    return api.post(`/programs/${program}/requirements-import/preview`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data)
  },
  confirm: (program, importLogId) => api.post(`/programs/${program}/requirements-import/${importLogId}/confirm`).then(r => r.data),
  downloadErrorReport: (program, importLogId) => api.get(`/programs/${program}/requirements-import/${importLogId}/error-report`, { responseType: 'blob' }).then(r => r.data),
  history: (program, params) => api.get(`/programs/${program}/requirements-imports`, { params }).then(r => r.data),
}

export const emailTemplatesService = {
  list:     ()        => api.get('/admin/email-templates').then(r => r.data.data),
  get:      (id)       => api.get(`/admin/email-templates/${id}`).then(r => r.data.data),
  update:   (id, d)    => api.put(`/admin/email-templates/${id}`, d).then(r => r.data.data),
  preview:  (id, locale) => api.post(`/admin/email-templates/${id}/preview`, { locale }).then(r => r.data.data),
  testSend: (id, email) => api.post(`/admin/email-templates/${id}/test-send`, { email }).then(r => r.data),
}

export const programsService = {
  list:      ()             => api.get('/programs').then(r => r.data.data),
  get:       (code)         => api.get(`/programs/${code}`).then(r => r.data.data),
  dashboard: (code, params) => api.get(`/programs/${code}/dashboard`, { params }).then(r => r.data.data),
}

export const executiveDashboardService = {
  get: () => api.get('/executive-dashboard').then(r => r.data.data),
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
  // Email delivery log
  emailLogs:    (params) => api.get('/admin/email-logs', { params }).then(r => r.data),
}
