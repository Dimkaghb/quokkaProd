import axios from 'axios'

// Create axios instance for data cleaning API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
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

// Types for Data Cleaning API
export interface CleaningOperation {
  id: string
  name: string
  description: string
}

export interface FileInfo {
  original_filename: string
  cleaned_filename: string
  size: number
  type: string
  cleaning_time: string
  file_id: string
}

export interface DataCleaningResult {
  success: boolean
  cleaned_file_path?: string
  download_url?: string
  operations_performed?: string[]
  error?: string
  file_info?: FileInfo
}

export interface SupportedOperationsResult {
  operations: CleaningOperation[]
}

export const dataCleaningAPI = {
  // Upload file for data cleaning
  uploadFile: async (file: File): Promise<DataCleaningResult> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<DataCleaningResult>('/data-cleaning/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Download cleaned file
  downloadFile: async (filename: string): Promise<Blob> => {
    const response = await api.get(`/data-cleaning/download/${filename}`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Get supported operations
  getSupportedOperations: async (): Promise<SupportedOperationsResult> => {
    const response = await api.get<SupportedOperationsResult>('/data-cleaning/supported-operations')
    return response.data
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; service: string }> => {
    const response = await api.get('/data-cleaning/health')
    return response.data
  },

  // Cancel operation
  cancelOperation: async (operationId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/data-cleaning/cancel/${operationId}`)
    return response.data
  },

  // Add cleaned file to documents
  addToDocuments: async (filename: string): Promise<{ success: boolean; message: string; document_id?: string }> => {
    const response = await api.post('/data-cleaning/add-to-docs', {
      filename: filename,
    })
    return response.data
  },

  // Get download URL for a file
  getDownloadUrl: (filename: string): string => {
    return `${API_URL}/data-cleaning/download/${filename}`
  },

  // Get file info
  getFileInfo: async (filename: string): Promise<{
    success: boolean
    filename: string
    size: number
    created_at: string
    operations_applied: string[]
  }> => {
    const response = await api.get(`/data-cleaning/info/${filename}`)
    return response.data
  },

  // Delete file
  deleteFile: async (filename: string): Promise<{
    success: boolean
    message: string
    deleted_files: string[]
  }> => {
    const response = await api.delete(`/data-cleaning/cancel/${filename}`)
    return response.data
  },

  // Add file to documents library
  addFileToDocuments: async (filename: string): Promise<{
    success: boolean
    message: string
    document_id: string
    deleted_temp_files: string[]
  }> => {
    const response = await api.post(`/data-cleaning/add-to-docs/${filename}`)
    return response.data
  }
}

export default dataCleaningAPI