import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

export interface User {
  id?: string
  name: string
  email: string
  createdAt?: string
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add interceptor to add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface AuthState {
  user: User | null
  token: string | null
  error: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  error: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      })
      const { access_token } = response.data

      localStorage.setItem('token', access_token)
      
      set({ 
        user: { email, name: email.split('@')[0] }, // Extract name from email for now
        token: access_token,
        isAuthenticated: true,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'An error occurred during login',
        isLoading: false 
      })
    }
  },

  signup: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/signup', {
        name,
        email,
        password
      })

      // After successful signup, log the user in
      const loginResponse = await api.post('/auth/login', {
        email,
        password
      })
      const { access_token } = loginResponse.data

      localStorage.setItem('token', access_token)
      
      set({ 
        user: { name, email },
        token: access_token,
        isAuthenticated: true,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'An error occurred during signup',
        isLoading: false 
      })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  clearError: () => set({ error: null })
})) 