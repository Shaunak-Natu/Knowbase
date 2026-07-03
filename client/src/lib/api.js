import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// Pages
export const pagesApi = {
  getAll: (archived = false) => api.get('/pages', { params: { archived } }),
  get: (id) => api.get(`/pages/${id}`),
  create: (data) => api.post('/pages', data),
  update: (id, data) => api.put(`/pages/${id}`, data),
  delete: (id, permanent = false) => api.delete(`/pages/${id}`, { params: { permanent } }),
  restore: (id) => api.post(`/pages/${id}/restore`),
  duplicate: (id) => api.post(`/pages/${id}/duplicate`),
  search: (q) => api.get('/pages/search/query', { params: { q } }),
  addTag: (id, tag_id) => api.post(`/pages/${id}/tags`, { tag_id }),
  removeTag: (id, tagId) => api.delete(`/pages/${id}/tags/${tagId}`),
}

// Tags
export const tagsApi = {
  getAll: () => api.get('/tags'),
  create: (name, color) => api.post('/tags', { name, color }),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`),
  getPages: (id) => api.get(`/tags/${id}/pages`),
}

// Files
export const filesApi = {
  upload: (formData, onProgress) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0, // No timeout for uploads
    onUploadProgress: onProgress,
  }),
  getByPage: (pageId) => api.get(`/files/page/${pageId}`),
  getAll: () => api.get('/files'),
  delete: (id) => api.delete(`/files/${id}`),
  serveUrl: (id) => `/api/files/${id}/serve`,
  downloadUrl: (id) => `/api/files/${id}/serve?download=true`,
}

// Kanban
export const kanbanApi = {
  getBoard: (pageId) => api.get(`/kanban/${pageId}`),
  createColumn: (pageId, data) => api.post(`/kanban/${pageId}/columns`, data),
  updateColumn: (id, data) => api.put(`/kanban/columns/${id}`, data),
  deleteColumn: (id) => api.delete(`/kanban/columns/${id}`),
  createCard: (pageId, data) => api.post(`/kanban/${pageId}/cards`, data),
  updateCard: (id, data) => api.put(`/kanban/cards/${id}`, data),
  deleteCard: (id) => api.delete(`/kanban/cards/${id}`),
}

// Import / Export
export const ioApi = {
  exportJson: () => window.open('/api/export/json', '_blank'),
  exportNotion: () => window.open('/api/export/notion', '_blank'),
  exportPage: (id) => window.open(`/api/export/page/${id}`, '_blank'),
  importJson: (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/import/json', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  importNotion: (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/import/notion', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 })
  },
  importMarkdown: (files) => {
    const fd = new FormData(); files.forEach(f => fd.append('files', f))
    return api.post('/import/markdown', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export default api
