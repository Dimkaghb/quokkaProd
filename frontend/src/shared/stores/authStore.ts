import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (user: User, token: string) => void
  logout: () => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  clearError: () => void
  clearAuthData: () => void
  refreshAuth: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
          isLoading: false
        })
      },

      logout: () => {
        // Clear all stored data
        localStorage.removeItem('quokka-chat-session')
        localStorage.removeItem('quokka-uploaded-files')
        localStorage.removeItem('quokka-thread-storage') // Clear thread storage
        localStorage.removeItem('quokka-auth-storage')   // Clear auth storage
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false
        })
      },

      setError: (error: string | null) => {
        set({ error, isLoading: false })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      clearError: () => {
        set({ error: null })
      },

      // Debug function to clear all auth data
      clearAuthData: () => {
        localStorage.removeItem('quokka-auth-storage')
        localStorage.removeItem('quokka-chat-session')
        localStorage.removeItem('quokka-uploaded-files')
        localStorage.removeItem('quokka-thread-storage')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false
        })
        console.log('Auth data cleared')
      },

      refreshAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isLoading: false })
          return
        }

        try {
          set({ isLoading: true })
          
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          // Verify token with backend using the correct endpoint
          const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const userData = await response.json()
            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            console.log('Token validation successful')
          } else {
            // Token is invalid, logout
            console.log('Token validation failed, status:', response.status)
            if (response.status === 401) {
              get().logout()
            } else {
              // For other errors, just stop loading but don't logout
              set({ isLoading: false })
            }
          }
        } catch (error) {
          console.error('Auth refresh failed:', error)
          // Only logout on network errors if we're sure the token is invalid
          set({ isLoading: false })
          // Don't automatically logout on network errors
        }
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: { ...state.user, ...userData } as User,
          error: null,
          isLoading: false
        }))
      }
    }),
    {
      name: 'quokka-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)