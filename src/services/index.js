/**
 * Central export of all API services.
 */
import api from './api'

export { authService } from './auth.service'

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


export const requirementsService = {
  list:    (standardId)       => api.get(`/standards/${standardId}/requirements`).then(r => r.data.data),
  create:  (standardId, data) => api.post(`/standards/${standardId}/requirements`, data).then(r => r.data),
  update:  (standardId, id, d)=> api.put(`/standards/${standardId}/requirements/${id}`, d).then(r => r.data),
  destroy: (standardId, id)   => api.delete(`/standards/${standardId}/requirements/${id}`).then(r => r.data),
}


export const dashboardService = {
  // Program-scoped: the unscoped /dashboard endpoint mixed every program's
  // data together on a per-program screen and has been retired.
  get: (program, params) => api.get(`/programs/${program}/dashboard`, { params }).then(r => r.data.data),
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

/**
 * Generic, arbitrary-depth hierarchy engine (Phase 6) — used by ECC, not
 * ECC-specific in code. Qiyas/Sumoud have no `hierarchy` configuration and
 * the levels() call returns an empty list for them; the UI treats that as
 * "this program manages its hierarchy through the Cycles page instead."
 */
/**
 * Program Structure Settings — the Program Manager's control over their own
 * program's hierarchy shape and terminology.
 *
 * Reads (`get`, `versions`) are available to anyone with program access,
 * because level labels drive every hierarchy screen. Writes require the
 * program-manager role for THAT program and return 403 otherwise (or 404 if
 * the caller has no access to the program at all) — enforced by
 * HierarchyStructurePolicy on the backend, never by hiding buttons.
 */
/**
 * Hierarchy-driven dashboard and reporting. Every endpoint takes the level
 * as a PARAMETER rather than having one route per level, so a program that
 * adds a seventh level needs no client change (audit findings H1, H2, H3).
 */
export const hierarchyAnalyticsService = {
  dashboardLevels: (program)                 => api.get(`/programs/${program}/dashboard/levels`).then(r => r.data.data),
  metrics:         (program, params)         => api.get(`/programs/${program}/dashboard/metrics`, { params }).then(r => r.data.data),
  byLevel:         (program, levelKey, params) => api.get(`/programs/${program}/dashboard/by-level/${levelKey}`, { params }).then(r => r.data.data),

  dimensions:      (program)                 => api.get(`/programs/${program}/reports/dimensions`).then(r => r.data.data),
  filterOptions:   (program, levelKey, parentNodeId) =>
    api.get(`/programs/${program}/reports/filter-options/${levelKey}`, { params: { parent_node_id: parentNodeId } }).then(r => r.data.data),
  report:          (program, params)         => api.get(`/programs/${program}/reports/hierarchy`, { params }).then(r => r.data.data),
  exportUrl:       (program, params = {})    => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString()
    return `${api.defaults.baseURL}/programs/${program}/reports/hierarchy/export${qs ? `?${qs}` : ''}`
  },
}

export const structureService = {
  get:         (program)            => api.get(`/programs/${program}/structure`).then(r => r.data.data),
  versions:    (program)            => api.get(`/programs/${program}/structure/versions`).then(r => r.data.data),
  getDraft:    (program)            => api.get(`/programs/${program}/structure/draft`).then(r => r.data.data),
  openDraft:   (program)            => api.post(`/programs/${program}/structure/draft`).then(r => r.data.data),
  discardDraft:(program)            => api.delete(`/programs/${program}/structure/draft`).then(r => r.data),
  impact:      (program)            => api.get(`/programs/${program}/structure/draft/impact`).then(r => r.data.data),
  activate:    (program, data)      => api.post(`/programs/${program}/structure/draft/activate`, data).then(r => r.data.data),
  addLevel:    (program, data)      => api.post(`/programs/${program}/structure/draft/levels`, data).then(r => r.data.data),
  updateLevel: (program, id, data)  => api.put(`/programs/${program}/structure/draft/levels/${id}`, data).then(r => r.data.data),
  removeLevel: (program, id)        => api.delete(`/programs/${program}/structure/draft/levels/${id}`).then(r => r.data.data),
  moveLevel:   (program, id, dir)   => api.post(`/programs/${program}/structure/draft/levels/${id}/move`, { direction: dir }).then(r => r.data.data),
}

/**
 * Structure-driven XLSX: template download, import preview and confirm.
 * Column count follows the program's structure, so this client needs no
 * knowledge of depth.
 */
export const hierarchyImportService = {
  templateUrl: (program) => `${api.defaults.baseURL}/programs/${program}/hierarchy-template`,
  exportUrl:   (program) => `${api.defaults.baseURL}/programs/${program}/hierarchy-export`,
  preview:     (program, file, cycleId) => {
    const form = new FormData()
    form.append('file', file)
    form.append('cycle_id', cycleId)
    return api.post(`/programs/${program}/hierarchy-import/preview`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data)
  },
  confirm:     (program, importLogId) =>
    api.post(`/programs/${program}/hierarchy-import/${importLogId}/confirm`).then(r => r.data.data),
  errorReportUrl: (program, importLogId) =>
    `${api.defaults.baseURL}/programs/${program}/hierarchy-import/${importLogId}/error-report`,
}

export const hierarchyService = {
  levels:         (program)             => api.get(`/programs/${program}/hierarchy-levels`).then(r => r.data.data),
  children:       (program, parentId, cycleId) => api.get(`/programs/${program}/hierarchy`, { params: { parent_id: parentId, cycle_id: cycleId } }).then(r => r.data.data),
  show:           (program, id)         => api.get(`/programs/${program}/hierarchy/${id}`).then(r => r.data.data),
  create:         (program, data)       => api.post(`/programs/${program}/hierarchy`, data).then(r => r.data.data),
  update:         (program, id, data)   => api.put(`/programs/${program}/hierarchy/${id}`, data).then(r => r.data.data),
  archive:        (program, id)         => api.post(`/programs/${program}/hierarchy/${id}/archive`).then(r => r.data.data),
  search:         (program, q, cycleId) => api.get(`/programs/${program}/hierarchy/search`, { params: { q, cycle_id: cycleId } }).then(r => r.data.data),
  contentVersions: (program)            => api.get(`/programs/${program}/content-versions`).then(r => r.data.data),
}

/**
 * Generic responsibility labels (Data Owner, Data Steward, ...) — Phase 7.
 * Returns an empty types() list for any program that has not enabled the
 * feature (Qiyas/Sumoud/ECC); the UI renders nothing in that case.
 */
export const responsibilityService = {
  types:            (program)              => api.get(`/programs/${program}/responsibility-types`).then(r => r.data.data),
  departmentUsers:  (program, departmentId) => api.get(`/programs/${program}/departments/${departmentId}/users`).then(r => r.data.data),
  list:             (program, assignmentId) => api.get(`/programs/${program}/assignments/${assignmentId}/responsibilities`).then(r => r.data.data),
  assign:           (program, assignmentId, data) => api.post(`/programs/${program}/assignments/${assignmentId}/responsibilities`, data).then(r => r.data.data),
  revoke:           (program, responsibilityId, reason) => api.delete(`/programs/${program}/responsibilities/${responsibilityId}`, { data: { reason } }).then(r => r.data),
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
  // Audit Logs
  auditLogs:    (params) => api.get('/admin/audit-logs', { params }).then(r => r.data),
  // Email delivery log
  emailLogs:    (params) => api.get('/admin/email-logs', { params }).then(r => r.data),
}

/**
 * Super-Admin-only versioned branding asset management (logos/favicon).
 * Every upload is a new, inactive version — activate() promotes it live,
 * restore() reactivates a superseded version. Distinct from the public
 * `brandingService` above (GET /branding), which only reads the current
 * active state. See docs/administration/branding.md.
 */
export const brandingAdminService = {
  history:  (type)        => api.get(`/admin/branding/${type}`).then(r => r.data.data),
  upload:   (type, file)  => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/admin/branding/${type}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data)
  },
  activate: (type, assetId) => api.post(`/admin/branding/${type}/${assetId}/activate`).then(r => r.data.data),
  restore:  (type, assetId) => api.post(`/admin/branding/${type}/${assetId}/restore`).then(r => r.data.data),
}

/**
 * Super Admin SMTP configuration. The password is write-only: the API
 * never returns it, only a `password_configured` boolean — see
 * docs/security/smtp-security.md.
 */
export const smtpSettingsService = {
  get:     ()     => api.get('/admin/smtp-settings').then(r => r.data.data),
  update:  (data) => api.put('/admin/smtp-settings', data).then(r => r.data.data),
  test:    (data) => api.post('/admin/smtp-settings/test', data).then(r => r.data),
  history: ()     => api.get('/admin/smtp-settings/history').then(r => r.data.data),
}

/** Global, Super-Admin-managed email notification templates. See docs/email-notifications.md. */
export const emailTemplateService = {
  list:     ()               => api.get('/admin/email-templates').then(r => r.data.data),
  get:      (id)              => api.get(`/admin/email-templates/${id}`).then(r => r.data.data),
  update:   (id, data)        => api.put(`/admin/email-templates/${id}`, data).then(r => r.data.data),
  preview:  (id, locale)      => api.post(`/admin/email-templates/${id}/preview`, { locale }).then(r => r.data.data),
  testSend: (id, email)       => api.post(`/admin/email-templates/${id}/test-send`, { email }).then(r => r.data),
}
