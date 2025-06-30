import React, { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { refreshAuth, setLoading } = useAuthStore()

  useEffect(() => {
    const persistedToken = localStorage.getItem('token')
    
    if (persistedToken) {
      // Token found in localStorage, user should be authenticated
      refreshAuth()
    } else {
      setLoading(false)
    }
  }, [])

  return <>{children}</>
}

export default AuthProvider 