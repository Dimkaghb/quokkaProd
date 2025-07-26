import axios from 'axios'

// Create axios instance for data cleaning API
// Production ready: baseURL includes /api/ for Nginx routing
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 120000, // 2 minute timeout for cleaning operations
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
  // Clean data
  cleanData: async (data: any, options?: any) => {
    const response = await api.post('/data-cleaning/clean', {
      data,
      options
    })
    return response.data
  },

  // Get cleaning suggestions
  getCleaningSuggestions: async (data: any) => {
    const response = await api.post('/data-cleaning/suggestions', { data })
    return response.data
  },

  // Apply cleaning rules
  applyCleaningRules: async (data: any, rules: any[]) => {
    const response = await api.post('/data-cleaning/apply-rules', {
      data,
      rules
    })
    return response.data
  },

  // Validate data quality
  validateDataQuality: async (data: any) => {
    const response = await api.post('/data-cleaning/validate', { data })
    return response.data
  },

  // Upload file for cleaning
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
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/data-cleaning/health')
    return response.data
  },

  // Cancel operation
  cancelOperation: async (operationId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/data-cleaning/cancel/${operationId}`)
    return response.data
  },

  // Add to documents
  addToDocuments: async (filename: string, tags?: string[]): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/data-cleaning/add-to-docs', {
      filename,
      tags: tags || [],
    })
    return response.data
  },

  // Get download URL
  getDownloadUrl: (filename: string): string => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    return `${baseURL}/api/data-cleaning/download/${filename}`
  },

  // Trigger download
  triggerDownload: async (filename: string, originalName?: string): Promise<void> => {
    try {
      const blob = await dataCleaningAPI.downloadFile(filename)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = originalName || filename
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  },

  // Delete file
  deleteFile: async (filename: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/data-cleaning/cancel/${filename}`)
    return response.data
  },

  // Add cleaned file to documents library
  addCleanedFileToDocuments: async (
    filename: string,
    tags?: string[]
  ): Promise<{ success: boolean; message: string; document_id?: string }> => {
    const response = await api.post(`/api/data-cleaning/add-to-docs/${filename}`)
    return response.data
  },
}

export default dataCleaningAPI