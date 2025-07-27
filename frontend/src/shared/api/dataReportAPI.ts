import axios from 'axios'

// Create axios instance for data report API
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('quokka-auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Types
export interface FileUploadResponse {
  success: boolean
  message: string
  file_id: string
  filename: string
  file_size: number
}

export interface DataReportRequest {
  preview_file_id: string
  data_file_id: string
  llm_provider: 'openai' | 'anthropic' | 'ollama'
  llm_model?: string
  openai_api_key?: string
  anthropic_api_key?: string
  ollama_base_url?: string
  custom_prompt?: string
}

export interface DataReportResponse {
  success: boolean
  message: string
  report_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface ReportStatus {
  report_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  created_at: string
  completed_at?: string
  error_message?: string
  download_url?: string
}

export interface ReportListItem {
  report_id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  file_size?: number
  download_url?: string
}

export interface ReportListResponse {
  success: boolean
  reports: ReportListItem[]
  total_count: number
}

export interface SupportedFormatsResponse {
  success: boolean
  preview_formats: string[]
  data_formats: string[]
}

// API functions
export const dataReportAPI = {
  // Upload file for data report
  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<FileUploadResponse>('/data-report/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Generate data report
  generateReport: async (request: DataReportRequest): Promise<DataReportResponse> => {
    const response = await api.post<DataReportResponse>('/data-report/generate', request)
    return response.data
  },

  // Get report status
  getReportStatus: async (reportId: string): Promise<ReportStatus> => {
    const response = await api.get<ReportStatus>(`/data-report/status/${reportId}`)
    return response.data
  },

  // List all reports
  listReports: async (): Promise<ReportListResponse> => {
    const response = await api.get<ReportListResponse>('/data-report/list')
    return response.data
  },

  // Download report
  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/data-report/download/${reportId}`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Delete report
  deleteReport: async (reportId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/data-report/delete/${reportId}`)
    return response.data
  },

  // Cleanup old reports
  cleanupReports: async (): Promise<{ success: boolean; message: string; deleted_count: number }> => {
    const response = await api.post('/data-report/cleanup')
    return response.data
  },

  // Get supported formats
  getSupportedFormats: async (): Promise<{
    success: boolean
    preview_formats: string[]
    data_formats: string[]
  }> => {
    const response = await api.get('/data-report/supported-formats')
    return response.data
  },
}

export default dataReportAPI