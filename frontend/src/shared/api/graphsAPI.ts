import axios from 'axios'

// Create axios instance for graphs API
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
    const response = await api.post<GraphResponse>('/graphs/', graphData)
    return response.data
  },

  // List all graphs
  listGraphs: async (): Promise<GraphListResponse> => {
    const response = await api.get<GraphListResponse>('/graphs/')
    return response.data
  },

  // Get graph by ID
  getGraph: async (graphId: string): Promise<GraphResponse> => {
    const response = await api.get<GraphResponse>(`/graphs/${graphId}`)
    return response.data
  },

  // Update graph
  updateGraph: async (graphId: string, updates: GraphUpdateRequest): Promise<GraphResponse> => {
    const response = await api.put<GraphResponse>(`/graphs/${graphId}`, updates)
    return response.data
  },

  // Delete graph
  deleteGraph: async (graphId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/graphs/${graphId}`)
    return response.data
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; service: string }> => {
    const response = await api.get('/graphs/health')
    return response.data
  }
}

export default graphsAPI