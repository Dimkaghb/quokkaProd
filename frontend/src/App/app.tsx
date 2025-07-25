import { Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from '../modules/landing'
import { Auth } from '../modules/auth'
import { Chatbot } from '../modules/chatbot'
import { ChatViewer } from '../modules/chatViewer'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'
import { AuthProvider } from '../shared/components/AuthProvider'
import { useAuthStore } from '../shared/stores/authStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Profile } from '../modules/profile'
import { ToastContainer } from '../shared/components/Toast'
import QuickPromptsTest from '../shared/components/QuickPromptsTest'
import { DataReportsPage } from '../shared/components/DataReportsPage'

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
            element={isAuthenticated ? <Navigate to="/chat" replace /> : <Auth />} 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/test-quick-prompts" 
            element={
              <ProtectedRoute>
                <QuickPromptsTest />
              </ProtectedRoute>
            } 
          />          
          
          {/* Protected Routes */}
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat/:threadId" 
            element={
              <ProtectedRoute>
                <ChatViewer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/data-reports" 
            element={
              <ProtectedRoute>
                <DataReportsPage />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  )
}