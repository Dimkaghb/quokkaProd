import axios from 'axios'

// Create axios instance for documents API
// Production ready: baseURL includes /api/ for Nginx routing
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 30000,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quokka-auth-storage')
    if (token) {
      const authData = JSON.parse(token)
      if (authData.state?.token) {
        config.headers.Authorization = `Bearer ${authData.state.token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('quokka-auth-storage')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

// Types for Documents API
export interface UserDocument {
  id: string
  user_id: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  file_path: string
  summary: string
  chunks_count: number
  processed_at: string
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DocumentUploadResponse {
  success: boolean
  document?: UserDocument
  message: string
}

export interface DocumentListResponse {
  success: boolean
  documents: UserDocument[]
  total_count: number
  message: string
}

export interface DocumentUpdateRequest {
  tags?: string[]
  summary?: string
}

export const documentsAPI = {
  // Upload document
  uploadDocument: async (file: File, name?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (name) {
      formData.append('name', name)
    }

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Get all documents
  getDocuments: async () => {
    const response = await api.get('/documents')
    return response.data
  },

  // Get document by ID
  getDocument: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}`)
    return response.data
  },

  // Delete document
  deleteDocument: async (documentId: string) => {
    const response = await api.delete(`/documents/${documentId}`)
    return response.data
  },

  // Update document
  updateDocument: async (documentId: string, updates: { name?: string }) => {
    const response = await api.put(`/documents/${documentId}`, updates)
    return response.data
  },

  // Get document content/preview
  getDocumentContent: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/content`)
    return response.data
  }
}

export default documentsAPI