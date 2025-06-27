import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../shared/stores/authStore'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const navigate = useNavigate()
  const { login, setLoading, setError, clearError, isLoading, error: authError } = useAuthStore()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Signup specific validations
    if (!isLogin) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required'
      }
      
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    clearError()
    
    try {
      if (isLogin) {
        // Login
        const response = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        })
        
        const { access_token } = response.data
        
        // Get user info
        const userResponse = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        })
        
        // Login with user data and token
        login(userResponse.data, access_token)
        
        navigate('/dashboard')
        
      } else {
        // Signup
        await api.post('/auth/signup', {
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
        
        // Auto-login after signup
        const loginResponse = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        })
        
        const { access_token } = loginResponse.data
        
        // Get user info
        const userResponse = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        })
        
        // Login with user data and token
        login(userResponse.data, access_token)
        
        navigate('/dashboard')
      }
      
    } catch (err: any) {
      console.error('Auth error:', err)
      
      let errorMessage = 'An error occurred'
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid email or password'
      } else if (err.response?.status === 422) {
        errorMessage = 'Please check your input and try again'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    
    // Clear auth error
    if (authError) {
      clearError()
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setFormData({ email: '', password: '', name: '', confirmPassword: '' })
    setErrors({})
    clearError()
  }

  return (
    <div className="min-h-screen bg-black text-white flex relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-20 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
      >
        <svg 
          className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-light">Back</span>
      </button>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-white/5 rounded-full blur-lg animate-pulse delay-500"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-20">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xl">🐨</span>
              </div>
              <span className="text-2xl font-bold">quokkaAI</span>
            </div>
            
            <h1 className="text-4xl font-light mb-6 leading-tight">
              Transform your data into
              <span className="block font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                intelligent insights
              </span>
            </h1>
            
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Join thousands of professionals who trust quokkaAI to analyze their data 
              and generate beautiful visualizations with the power of artificial intelligence.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Advanced AI-powered analytics</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">Beautiful data visualizations</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">Secure and reliable platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-lg">🐨</span>
            </div>
            <span className="text-xl font-bold">quokkaAI</span>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-light text-white mb-3">
              {isLogin ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isLogin ? 'Sign in to continue to your dashboard' : 'Create your account to begin analyzing data'}
            </p>
          </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-light text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-0 py-4 bg-transparent border-0 border-b-2 focus:outline-none focus:ring-0 transition-all text-white placeholder-gray-500 ${
                      errors.name ? 'border-red-400' : 'border-gray-700 focus:border-white'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-light text-gray-300">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-0 py-4 bg-transparent border-0 border-b-2 focus:outline-none focus:ring-0 transition-all text-white placeholder-gray-500 ${
                    errors.email ? 'border-red-400' : 'border-gray-700 focus:border-white'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-light text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-0 py-4 bg-transparent border-0 border-b-2 focus:outline-none focus:ring-0 transition-all text-white placeholder-gray-500 ${
                    errors.password ? 'border-red-400' : 'border-gray-700 focus:border-white'
                  }`}
                  placeholder="Enter your password"
                />
                {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-light text-gray-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-0 py-4 bg-transparent border-0 border-b-2 focus:outline-none focus:ring-0 transition-all text-white placeholder-gray-500 ${
                      errors.confirmPassword ? 'border-red-400' : 'border-gray-700 focus:border-white'
                    }`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              {/* Auth error */}
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-6">
                  <p className="text-red-400 text-sm">{authError}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 px-6 rounded-lg font-light text-lg transition-all duration-300 mt-8 ${
                  isLoading
                    ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                    : 'bg-white text-black hover:bg-gray-100 transform hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Toggle mode */}
            <div className="mt-8 text-center">
              <p className="text-gray-400 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="ml-2 text-white hover:text-gray-300 font-medium underline underline-offset-4 transition-colors"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            {/* Forgot password for login */}
            {isLogin && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
