/**
 * Document management service.
 */
import api from './api'

export const documentsService = {
  /** Lists documents with optional filters. */
  async list(params = {}) {
    const { data } = await api.get('/documents', { params })
    return data
  },

  /** Creates a document record for a requirement. */
  async create(payload) {
    const { data } = await api.post('/documents', payload)
    return data.data
  },

  /** Gets full document details. */
  async get(id) {
    const { data } = await api.get(`/documents/${id}`)
    return data.data
  },

  /**
   * Uploads a file version to a document.
   * @param {number} documentId
   * @param {File}   file
   * @param {string} changeReason
   */
  async upload(documentId, file, changeReason = '') {
    const form = new FormData()
    form.append('file', file)
    if (changeReason) form.append('change_reason', changeReason)

    const { data } = await api.post(`/documents/${documentId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Submits a document for review. */
  async submit(documentId) {
    const { data } = await api.post(`/documents/${documentId}/submit`)
    return data
  },

  /**
   * Downloads a document version.
   * Returns a Blob for the browser to handle.
   */
  async download(documentId, versionNumber) {
    const response = await api.get(
      `/documents/${documentId}/versions/${versionNumber}/download`,
      { responseType: 'blob' }
    )
    return response
  },

  /** Lists comments on a document. */
  async listComments(documentId) {
    const { data } = await api.get(`/documents/${documentId}/comments`)
    return data.data
  },

  /** Adds a comment to a document. */
  async addComment(documentId, body, parentId = null) {
    const { data } = await api.post(`/documents/${documentId}/comments`, {
      body,
      parent_id: parentId,
    })
    return data.data
  },

  /** Lists extension requests for a document. */
  async listExtensions(documentId) {
    const { data } = await api.get(`/documents/${documentId}/extension-requests`)
    return data.data
  },

  /** Submits an extension request. */
  async requestExtension(documentId, requestedDate, reason) {
    const { data } = await api.post(`/documents/${documentId}/extension-requests`, {
      requested_date: requestedDate,
      reason,
    })
    return data.data
  },
}
