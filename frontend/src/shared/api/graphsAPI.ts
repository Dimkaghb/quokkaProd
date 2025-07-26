import axios from 'axios'

// Create axios instance for graphs API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 60000, // 60 second timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quokka-auth-storage')
    if (token) {
      try {
        const authData = JSON.parse(token)
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth token:', error)
        localStorage.removeItem('quokka-auth-storage')
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
      // Token expired or invalid
      localStorage.removeItem('quokka-auth-storage')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

// Graph interfaces
export interface GraphNode {
  id: string
  position: { x: number; y: number }
  data: any
  style?: any
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  style?: any
}

export interface GraphFile {
  id: string
  name: string
  type: string
  size: number
  uploaded_at: string
}

export interface UserGraph {
  id: string
  user_id: string
  name: string
  description: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  files: GraphFile[]
  thumbnail?: string
  is_public: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export interface GraphSummary {
  id: string
  name: string
  description: string
  files_count: number
  nodes_count: number
  edges_count: number
  thumbnail?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface GraphCreateRequest {
  name: string
  description?: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  files: GraphFile[]
  thumbnail?: string
  tags?: string[]
}

export interface GraphUpdateRequest {
  name?: string
  description?: string
  nodes?: GraphNode[]
  edges?: GraphEdge[]
  files?: GraphFile[]
  thumbnail?: string
  tags?: string[]
}

export interface GraphResponse {
  success: boolean
  graph?: UserGraph
  message: string
}

export interface GraphListResponse {
  success: boolean
  graphs: GraphSummary[]
  total_count: number
  message: string
}

// API functions
export const graphsAPI = {
  // Create a new graph
  createGraph: async (graphData: GraphCreateRequest): Promise<GraphResponse> => {
    const response = await api.post('/graphs/', graphData)
    return response.data
  },

  // Get user's graphs (summary view)
  getUserGraphs: async (skip = 0, limit = 100): Promise<GraphListResponse> => {
    const response = await api.get(`/graphs/?skip=${skip}&limit=${limit}`)
    return response.data
  },

  // Get a specific graph by ID
  getGraph: async (graphId: string): Promise<GraphResponse> => {
    const response = await api.get(`/graphs/${graphId}`)
    return response.data
  },

  // Update an existing graph
  updateGraph: async (graphId: string, updateData: GraphUpdateRequest): Promise<GraphResponse> => {
    const response = await api.put(`/graphs/${graphId}`, updateData)
    return response.data
  },

  // Delete a graph
  deleteGraph: async (graphId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/graphs/${graphId}`)
    return response.data
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; service: string }> => {
    const response = await api.get('/graphs/health/check')
    return response.data
  }
}

export default graphsAPI