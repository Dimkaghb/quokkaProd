import axios from 'axios'
import type { User } from '../stores/authStore'

// Create axios instance with base configuration
// Production ready: nginx handles API routing, no baseURL needed
const api = axios.create({
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
      try {
        const authData = JSON.parse(token)
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error)
        localStorage.removeItem('quokka-auth-storage')
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Initialize token on app load
const initializeToken = () => {
  const token = localStorage.getItem('quokka-auth-storage')
  if (token) {
    try {
      const authData = JSON.parse(token)
      if (authData.state?.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${authData.state.token}`
      }
    } catch (error) {
      console.error('Error initializing token:', error)
      localStorage.removeItem('quokka-auth-storage')
    }
  }
}

// Initialize token when module loads
initializeToken()

// Response interceptor to handle auth errors
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

export interface OTPRequestResponse {
  message: string
  email: string
}

export interface OTPVerifyResponse {
  message: string
  user: User
  token?: string
  token_type?: string
}

export interface AuthError {
  message: string
  errors?: Record<string, string>
}

export const authAPI = {
  // Login user
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    })
    return response.data
  },

  // Register new user
  signup: async (name: string, email: string, password: string): Promise<SignupResponse> => {
    const response = await api.post<SignupResponse>('/auth/signup', {
      name,
      email,
      password,
    })
    return response.data
  },

  // Request OTP for registration
  requestOTP: async (name: string, email: string, password: string): Promise<OTPRequestResponse> => {
    const response = await api.post<OTPRequestResponse>('/auth/request-otp', {
      name,
      email,
      password,
    })
    return response.data
  },

  // Verify OTP and complete registration
  verifyOTP: async (email: string, otp_code: string): Promise<OTPVerifyResponse> => {
    const response = await api.post<OTPVerifyResponse>('/auth/verify-otp', {
      email,
      otp_code,
    })
    return response.data
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/profile')
    return response.data
  },

  // Update user profile
  updateProfile: async (name: string): Promise<User> => {
    const response = await api.put<User>('/auth/profile', {
      name,
    })
    return response.data
  },

  // Refresh token
  refreshToken: async (): Promise<{ token: string }> => {
    const response = await api.post<{ token: string }>('/auth/refresh')
    return response.data
  },

  // Logout user
  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/forgot-password', {
      email,
    })
    return response.data
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      new_password: newPassword,
    })
    return response.data
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