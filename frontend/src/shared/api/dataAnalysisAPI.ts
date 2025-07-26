import axios from 'axios'

// Create axios instance for data analysis API
// Production ready: baseURL includes /api/ for Nginx routing
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`,
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
  // Upload file for analysis
  uploadFile: async (
    file: File,
    analysisType?: string
  ): Promise<VisualizationResult> => {
    const formData = new FormData()
    formData.append('file', file)
    if (analysisType) {
      formData.append('analysis_type', analysisType)
    }

    const response = await api.post<VisualizationResult>('/data-analysis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Analyze data with specific parameters
  analyzeData: async (request: {
    filename: string
    analysis_type: string
    parameters?: Record<string, any>
  }): Promise<DataAnalysisResult> => {
    const response = await api.post<DataAnalysisResult>('/data-analysis/analyze', {
      filename: request.filename,
      analysis_type: request.analysis_type,
      parameters: request.parameters || {},
    })
    return response.data
  },

  // Create custom visualization
  createCustomVisualization: async (request: {
    filename: string
    chart_type: string
    x_column: string
    y_column?: string
    color_column?: string
    title?: string
    parameters?: Record<string, any>
  }): Promise<VisualizationResult> => {
    const requestData = {
      filename: request.filename,
      chart_type: request.chart_type,
      x_column: request.x_column,
      y_column: request.y_column,
      color_column: request.color_column,
      title: request.title,
      parameters: request.parameters || {},
    }
    const response = await api.post<VisualizationResult>('/data-analysis/custom-visualization', requestData)
    return response.data
  },

  // Generate visualization
  generateVisualization: async (request: { filename: string; chart_type: string; parameters?: Record<string, any> }): Promise<VisualizationResult> => {
    const response = await api.post<VisualizationResult>('/data-analysis/visualize', {
      filename: request.filename,
      chart_type: request.chart_type,
      parameters: request.parameters || {},
    })
    return response.data
  },

  // Get uploaded files
  getUploadedFiles: async (): Promise<{
    success: boolean
    files: Array<{
      filename: string
      upload_time: string
      size: number
      columns?: string[]
    }>
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
    max_file_size: string
  }> => {
    const response = await api.get('/data-analysis/supported-formats')
    return response.data
  },

  // Health check
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/data-analysis/health')
    return response.data
  },

  // Quick analysis helper
  quickAnalysis: async (file: File, chartType: string = 'auto'): Promise<VisualizationResult> => {
    return dataAnalysisAPI.createCustomVisualization({
      filename: file.name,
      chart_type: chartType,
      x_column: 'auto',
    })
  },
}

export default dataAnalysisAPI