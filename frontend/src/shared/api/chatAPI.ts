import axios from 'axios'

// Create axios instance for chat API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Using Bearer token, no need for credentials
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
      // Token expired or invalid
      localStorage.removeItem('quokka-auth-storage')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

// Types for Chat Thread API
export interface ChatThread {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  selected_documents: string[]
  is_active: boolean
}

export interface ChatMessage {
  id: string
  thread_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: {
    ai_response_type?: string
    confidence?: number
    visualization?: any
    analysis?: string
    sources?: string[]
    selected_documents?: string[]
  }
}

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

export interface CreateThreadRequest {
  first_message: string
  selected_documents?: string[]
}

export interface SendMessageRequest {
  content: string
  selected_documents?: string[]
}

export interface ThreadResponse {
  success: boolean
  thread?: ChatThread
  message: string
}

export interface ThreadListResponse {
  success: boolean
  threads: ChatThread[]
  total_count: number
  message: string
}

export interface MessageResponse {
  success: boolean
  user_message?: ChatMessage
  assistant_message?: ChatMessage
  thread_id: string
  message: string
}

export interface MessagesListResponse {
  success: boolean
  messages: ChatMessage[]
  thread_id: string
  total_count: number
  message: string
}

export interface DocumentListResponse {
  success: boolean
  documents: UserDocument[]
  total_count: number
  message: string
}

export const chatAPI = {
  // ===== THREAD MANAGEMENT =====
  
  // Get all user threads
  getThreads: async (): Promise<ThreadListResponse> => {
    const response = await api.get<ThreadListResponse>('/chat/threads')
    return response.data
  },

  // Create new thread
  createThread: async (request: CreateThreadRequest): Promise<ThreadResponse> => {
    const response = await api.post<ThreadResponse>('/chat/threads', request)
    return response.data
  },

  // Get thread details
  getThread: async (threadId: string): Promise<ThreadResponse> => {
    const response = await api.get<ThreadResponse>(`/chat/threads/${threadId}`)
    return response.data
  },

  // Update thread (title or documents)
  updateThread: async (
    threadId: string, 
    updates: { title?: string; selected_documents?: string[] }
  ): Promise<ThreadResponse> => {
    const response = await api.put<ThreadResponse>(`/chat/threads/${threadId}`, updates)
    return response.data
  },

  // Delete thread
  deleteThread: async (threadId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/chat/threads/${threadId}`)
    return response.data
  },

  // ===== MESSAGE MANAGEMENT =====

  // Get thread messages
  getMessages: async (threadId: string, limit?: number): Promise<MessagesListResponse> => {
    const params = limit ? { limit } : {}
    const response = await api.get<MessagesListResponse>(`/chat/threads/${threadId}/messages`, { params })
    return response.data
  },

  // Send message to thread (with AI response)
  sendMessage: async (threadId: string, request: SendMessageRequest): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>(`/chat/threads/${threadId}/messages`, request)
    return response.data
  },

  // ===== DOCUMENT MANAGEMENT =====

  // Get user documents library
  getDocuments: async (): Promise<DocumentListResponse> => {
    const response = await api.get<DocumentListResponse>('/documents')
    return response.data
  },

  // Upload new document
  uploadDocument: async (file: File, tags?: string[]): Promise<{
    success: boolean
    document?: UserDocument
    message: string
  }> => {
    const formData = new FormData()
    formData.append('file', file)
    if (tags && tags.length > 0) {
      formData.append('tags', tags.join(','))
    }

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Update document metadata
  updateDocument: async (
    documentId: string, 
    updates: { tags?: string[]; summary?: string }
  ): Promise<{
    success: boolean
    document?: UserDocument
    message: string
  }> => {
    const response = await api.put(`/documents/${documentId}`, updates)
    return response.data
  },

  // Delete document
  deleteDocument: async (documentId: string): Promise<{
    success: boolean
    message: string
  }> => {
    const response = await api.delete(`/documents/${documentId}`)
    return response.data
  },

  // ===== THREAD-SPECIFIC FEATURES =====

  // Update thread documents
  updateThreadDocuments: async (
    threadId: string, 
    selectedDocuments: string[]
  ): Promise<{
    thread_id: string
    selected_documents: string[]
    status: string
  }> => {
    const response = await api.post(`/chat/threads/${threadId}/documents`, {
      selected_documents: selectedDocuments
    })
    return response.data
  },

  // Get thread agent stats
  getThreadAgentStats: async (threadId: string): Promise<{
    thread_id: string
    has_active_agent: boolean
    global_stats: {
      active_agents: number
      total_configs: number
      cleanup_task_running: boolean
      max_concurrent_agents: number
      max_inactive_minutes: number
    }
  }> => {
    const response = await api.get(`/chat/threads/${threadId}/agent/stats`)
    return response.data
  },

  // Get thread context (thread + messages + documents)
  getThreadContext: async (threadId: string): Promise<{
    success: boolean
    thread?: ChatThread
    messages: ChatMessage[]
    selected_documents: Array<{
      id: string
      filename: string
      file_type: string
      summary: string
      tags: string[]
    }>
    message: string
  }> => {
    const response = await api.get(`/chat/threads/${threadId}/context`)
    return response.data
  },

  // Get thread documents with full details
  getThreadDocuments: async (threadId: string): Promise<{
    success: boolean
    thread_id: string
    documents: UserDocument[]
    total_count: number
    message: string
  }> => {
    const response = await api.get(`/chat/threads/${threadId}/documents`)
    return response.data
  },
}

export default chatAPI