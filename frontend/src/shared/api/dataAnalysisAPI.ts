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
  analyticalText?: string
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
  // Upload file and create automatic visualization with optional user query
  uploadFile: async (file: File, userQuery?: string): Promise<VisualizationResult> => {
    const formData = new FormData()
    formData.append('file', file)
    if (userQuery) {
      formData.append('user_query', userQuery)
    }

    const response = await api.post<VisualizationResult>('/api/data-analysis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Analyze data file for recommendations
  analyzeDataFile: async (filePath: string, userQuery?: string): Promise<DataAnalysisResult> => {
    const response = await api.post<DataAnalysisResult>('/api/data-analysis/analyze', {
      file_path: filePath,
      user_query: userQuery || ''
    })
    return response.data
  },

  // Create custom visualization based on user query
  // Now supports both file-based and data-based customization
  createCustomVisualization: async (
    userQuery: string,
    filePath?: string,
    selectedColumns?: string[],
    currentData?: any[]
  ): Promise<VisualizationResult> => {
    const requestData: any = {
      user_query: userQuery,
      selected_columns: selectedColumns
    }

    // Either file path or current data must be provided
    if (filePath) {
      requestData.file_path = filePath
    } else if (currentData) {
      requestData.current_data = currentData
    } else {
      throw new Error('Either filePath or currentData must be provided')
    }

    const response = await api.post<VisualizationResult>('/api/data-analysis/custom-visualization', requestData)
    return response.data
  },

  // Create visualization from existing file
  createVisualization: async (filePath: string, chartType?: string, query?: string): Promise<VisualizationResult> => {
    const response = await api.post<VisualizationResult>('/api/data-analysis/visualize', {
      file_path: filePath,
      chart_type: chartType,
      query: query || ''
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
    const response = await api.get('/api/data-analysis/files')
    return response.data
  },

  // Delete uploaded file
  deleteFile: async (filename: string): Promise<{
    success: boolean
    message: string
  }> => {
    const response = await api.delete(`/api/data-analysis/files/${filename}`)
    return response.data
  },

  // Get supported file formats
  getSupportedFormats: async (): Promise<{
    success: boolean
    formats: string[]
    descriptions: Record<string, string>
  }> => {
    const response = await api.get('/api/data-analysis/supported-formats')
    return response.data
  },

  // Health check
  healthCheck: async (): Promise<{
    status: string
    service: string
  }> => {
    const response = await api.get('/api/data-analysis/health')
    return response.data
  },

  // Convenience method for customizing existing visualizations
  customizeExistingVisualization: async (
    currentData: any[],
    userQuery: string
  ): Promise<VisualizationResult> => {
    return dataAnalysisAPI.createCustomVisualization(userQuery, undefined, undefined, currentData)
  }
}

export default dataAnalysisAPI 