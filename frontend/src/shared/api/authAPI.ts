import axios from 'axios'
import type { User } from '../stores/authStore'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quokka-auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
      const response = await api.post<LoginResponse>('/auth/login', {
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
      const response = await api.post<SignupResponse>('/auth/signup', {
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
      const response = await api.get<User>('/auth/profile')
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Refresh token
  refreshToken: async (): Promise<{ token: string }> => {
    try {
      const response = await api.post<{ token: string }>('/auth/refresh')
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  // Logout (optional API call for server-side logout)
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch (error: any) {
      // Ignore logout errors
      console.warn('Logout API call failed:', error)
    }
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>('/auth/forgot-password', {
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
      const response = await api.post<{ message: string }>('/auth/reset-password', {
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
    localStorage.setItem('quokka-auth-token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  },

  clearAuthToken: () => {
    localStorage.removeItem('quokka-auth-token')
    delete api.defaults.headers.common['Authorization']
  },

  getAuthToken: (): string | null => {
    return localStorage.getItem('quokka-auth-token')
  },
}

export default authAPI 