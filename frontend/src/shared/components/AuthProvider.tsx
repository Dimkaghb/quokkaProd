import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useThreadStore } from '../stores/threadStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, token, isAuthenticated, refreshAuth, setLoading } = useAuthStore()
  const { clearAll } = useThreadStore()
  const previousUserIdRef = useRef<string | null>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only initialize once when the component mounts
    if (!hasInitialized.current) {
      hasInitialized.current = true
      
      // Check if we have a token in the auth store (from persistence)
      if (token && !isAuthenticated) {
        // Token found but not authenticated, verify it with the backend
        console.log('Found token, validating with backend...')
        refreshAuth()
      } else {
        // No token or already authenticated, stop loading
        setLoading(false)
      }
    }
  }, []) // Empty dependency array to run only once

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