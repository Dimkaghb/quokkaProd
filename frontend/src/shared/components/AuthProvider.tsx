import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useThreadStore } from '../stores/threadStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, refreshAuth, setLoading } = useAuthStore()
  const { clearAll } = useThreadStore()
  const previousUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const persistedToken = localStorage.getItem('token')
    
    if (persistedToken) {
      // Token found in localStorage, user should be authenticated
      refreshAuth()
    } else {
      setLoading(false)
    }
  }, [refreshAuth, setLoading])

  // Clear thread data when user changes
  useEffect(() => {
    const currentUserId = user?.id || null
    
    if (previousUserIdRef.current !== null && 
        previousUserIdRef.current !== currentUserId) {
      console.log('User changed, clearing thread data...')
      clearAll()
    }
    
    previousUserIdRef.current = currentUserId
  }, [user?.id, clearAll])

  return <>{children}</>
}

export default AuthProvider 