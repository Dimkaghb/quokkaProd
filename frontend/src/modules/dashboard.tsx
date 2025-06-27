import { useAuthStore } from '../shared/stores/authStore'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chatbot } from './chatbot'

export const Dashboard = () => {
  const { user, logout, refreshAuth } = useAuthStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const navigate = useNavigate()

  // Refresh auth on component mount to ensure user data persists
  useEffect(() => {
    if (user && !user.name) {
      refreshAuth()
    }
  }, [user, refreshAuth])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back Button */}
      <button
        onClick={() => {
          console.log('Back button clicked')
          navigate('/')
        }}
        className="fixed top-6 left-6 z-[60] flex items-center space-x-2 text-white hover:text-gray-300 transition-colors group bg-gray-800/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-600 hover:border-gray-500 shadow-lg"
      >
        <svg 
          className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">🐨</span>
              </div>
              <span className="text-xl font-bold">QuokkaAI</span>
            </div>
            
            {/* Profile Section */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all group"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-400">{user?.email || 'No email'}</p>
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{user?.email || 'No email'}</p>
                  </div>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                    Account
                  </button>
                  <div className="border-t border-gray-800 mt-2 pt-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Interface */}
      <div className="h-[calc(100vh-4rem)]">
        <Chatbot />
      </div>
    </div>
  )
} 