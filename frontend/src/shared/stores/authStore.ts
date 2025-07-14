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

      refreshAuth: async () => {
        const { token } = get()
        if (!token) return

        try {
          set({ isLoading: true })
          
          // Verify token with backend
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
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
          } else {
            // Token is invalid, logout
            get().logout()
          }
        } catch (error) {
          console.error('Auth refresh failed:', error)
          get().logout()
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