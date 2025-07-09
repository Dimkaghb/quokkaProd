import axios from 'axios'
import type { User } from '../stores/authStore'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Using Bearer token authentication
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('quokka-auth-token')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

export interface LoginResponse {
  user: User
  token: string
  message: string
}

export interface SignupResponse {
  user: User
  token: string
  message: string
}

export interface AuthError {
  message: string
  errors?: Record<string, string>
}

export const authAPI = {
  // Login user
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      })
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Register new user
  signup: async (name: string, email: string, password: string): Promise<SignupResponse> => {
    try {
      const response = await api.post<SignupResponse>('/api/auth/signup', {
        name,
        email,
        password,
      })
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    try {
      const response = await api.get<User>('/api/auth/profile')
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Update user profile
  updateProfile: async (name: string): Promise<User> => {
    try {
      const response = await api.put<User>('/api/auth/profile', {
        name,
      })
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Refresh token
  refreshToken: async (): Promise<{ token: string }> => {
    try {
      const response = await api.post<{ token: string }>('/api/auth/refresh')
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Logout (optional API call for server-side logout)
  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout')
    } catch (error: any) {
      // Ignore logout errors
      console.warn('Logout API call failed:', error)
    }
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>('/api/auth/forgot-password', {
        email,
      })
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>('/api/auth/reset-password', {
        token,
        password,
      })
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Utility functions
  setAuthToken: (token: string) => {
    const storageData = {
      state: {
        token,
        isAuthenticated: true
      }
    }
    localStorage.setItem('quokka-auth-storage', JSON.stringify(storageData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  },

  clearAuthToken: () => {
    localStorage.removeItem('quokka-auth-storage')
    delete api.defaults.headers.common['Authorization']
  },

  getAuthToken: (): string | null => {
    const storage = localStorage.getItem('quokka-auth-storage')
    if (storage) {
      const data = JSON.parse(storage)
      return data.state?.token || null
    }
    return null
  },
}

export default authAPI 