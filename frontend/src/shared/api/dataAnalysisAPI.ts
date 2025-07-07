import axios from 'axios'

// Create axios instance for data analysis API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 60000, // 60 second timeout for AI responses
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

// Types for Data Analysis API
export interface FileInfo {
  filename: string
  size: number
  type: string
  upload_time: string
  file_id: string
}

export interface ChartConfig {
  chartType: string
  data: any[]
  config: {
    xKey: string
    yKey: string | string[]
    title: string
    xLabel: string
    yLabel: string
    colors: string[]
  }
}

export interface DataRecommendation {
  chart_type: string
  columns: string[]
  description: string
  confidence: number
  reasoning: string
}

export interface DataAnalysisResult {
  success: boolean
  complexity_score?: number
  summary?: string
  recommendations?: DataRecommendation[]
  suggested_questions?: string[]
  column_info?: {
    shape: [number, number]
    columns: string[]
    numeric_columns: string[]
    categorical_columns: string[]
    datetime_columns: string[]
    unique_values: Record<string, number>
    data_types: Record<string, string>
    sample_data: any[]
  }
  error?: string
}

export interface VisualizationResult {
  success: boolean
  chart_config?: ChartConfig
  analytical_text?: string
  error?: string
  file_info?: FileInfo
  thread_id?: string
}

export const dataAnalysisAPI = {
  // Upload file and create automatic visualization
  uploadFile: async (file: File): Promise<VisualizationResult> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<VisualizationResult>('/data-analysis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Analyze data file for recommendations
  analyzeDataFile: async (filePath: string, userQuery?: string): Promise<DataAnalysisResult> => {
    const response = await api.post<DataAnalysisResult>('/data-analysis/analyze', {
      file_path: filePath,
      user_query: userQuery || ''
    })
    return response.data
  },

  // Create custom visualization based on user query
  createCustomVisualization: async (
    filePath: string, 
    userQuery: string, 
    selectedColumns?: string[]
  ): Promise<VisualizationResult> => {
    const response = await api.post<VisualizationResult>('/data-analysis/custom-visualization', {
      file_path: filePath,
      user_query: userQuery,
      selected_columns: selectedColumns
    })
    return response.data
  },

  // Create visualization from existing file
  createVisualization: async (filePath: string, chartType?: string, query?: string): Promise<VisualizationResult> => {
    const response = await api.post<VisualizationResult>('/data-analysis/visualize', {
      file_path: filePath,
      chart_type: chartType,
      query: query
    })
    return response.data
  },

  // Get list of uploaded files
  getUploadedFiles: async (): Promise<{
    success: boolean
    files: Array<{
      filename: string
      size: number
      modified: string
      path: string
    }>
    total_count: number
  }> => {
    const response = await api.get('/data-analysis/files')
    return response.data
  },

  // Delete uploaded file
  deleteFile: async (filename: string): Promise<{
    success: boolean
    message: string
  }> => {
    const response = await api.delete(`/data-analysis/files/${filename}`)
    return response.data
  },

  // Get supported file formats
  getSupportedFormats: async (): Promise<{
    success: boolean
    formats: string[]
    descriptions: Record<string, string>
  }> => {
    const response = await api.get('/data-analysis/supported-formats')
    return response.data
  },

  // Health check
  healthCheck: async (): Promise<{
    status: string
    service: string
  }> => {
    const response = await api.get('/data-analysis/health')
    return response.data
  },
}

export default dataAnalysisAPI 