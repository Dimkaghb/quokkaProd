import React, { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { token } = useAuthStore()

  useEffect(() => {
    // Initialize auth state on app startup
    if (token) {
      // If we have a token, we could validate it here
      // For now, we'll just assume it's valid if it exists
      console.log('Token found in localStorage, user should be authenticated')
    }
  }, [token])

  return <>{children}</>
}

export default AuthProvider 