import { Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from '../modules/landing'
import { Auth } from '../modules/auth'
import { Dashboard } from '../modules/dashboard'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'
import { AuthProvider } from '../shared/components/AuthProvider'
import { useAuthStore } from '../shared/stores/authStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Profile } from '../modules/profile'
export const App = () => {
  const queryClient = useMemo(() => new QueryClient(), [])
  const { isAuthenticated } = useAuthStore()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={<Landing />} 
          />
          <Route 
            path="/auth" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />} 
          />
          <Route path="/profile" element={<Profile />} />          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  )
}