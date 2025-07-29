import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../shared/stores/authStore'
import { useLanguageStore } from '../shared/stores/languageStore'
import { extractErrorMessage } from '../shared/api/authAPI';
import { LanguageSwitcher } from '../shared/components/LanguageSwitcher'
import { OTPVerification } from './OTPVerification'
import axios from 'axios'
import logo3 from '../assets/logo3.png'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Custom CSS animations for floating charts
const floatingAnimations = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(1deg); }
  }
  
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(-1deg); }
  }
  
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(0.5deg); }
  }
  
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }
  
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  
  .animate-float-delayed {
    animation: float-delayed 8s ease-in-out infinite 2s;
  }
  
  .animate-float-slow {
    animation: float-slow 10s ease-in-out infinite 1s;
  }
  
  .animate-bounce-slow {
    animation: bounce-slow 4s ease-in-out infinite;
  }
`

export const Auth = () => {
  const { t } = useLanguageStore()
  const [isLogin, setIsLogin] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [otpData, setOtpData] = useState({
    email: '',
    name: '',
    password: ''
  })
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
      newErrors.email = t('auth.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid')
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = t('auth.passwordRequired')
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.passwordMinLength')
    }

    // Signup specific validations
    if (!isLogin) {
      if (!formData.name.trim()) {
        newErrors.name = t('auth.nameRequired')
      }
      
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = t('auth.confirmPasswordRequired')
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('auth.passwordsDoNotMatch')
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
        
        const { token, user } = response.data
        
        // Login with user data and token
        login(user, token)
        
        navigate('/chat')
        
      } else {
        // Signup with OTP verification
        await api.post('/auth/request-otp', {
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
        
        // Store data for OTP verification
        setOtpData({
          email: formData.email,
          name: formData.name,
          password: formData.password
        })
        
        // Show OTP verification screen
        setShowOTP(true)
      }
      
    } catch (err) {
      console.error('Auth error:', err)
      
      let errorMessage = t('auth.errorOccurred')
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as any; // Type assertion for axios error
        errorMessage = extractErrorMessage(axiosError) || t('auth.errorOccurred')
        
        // Handle specific status codes
        if (axiosError.response?.status === 401) {
          errorMessage = t('auth.invalidCredentials')
        } else if (axiosError.response?.status === 422) {
          errorMessage = t('auth.checkInputAndRetry')
        }
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

  const handleBackFromOTP = () => {
    setShowOTP(false)
    setOtpData({ email: '', name: '', password: '' })
  }

  // Show OTP verification screen
  if (showOTP) {
    return (
      <OTPVerification
        email={otpData.email}
        name={otpData.name}
        password={otpData.password}
        onBack={handleBackFromOTP}
      />
    )
  }

  return (
    <>
      <style>{floatingAnimations}</style>
      <div className="h-screen bg-white flex relative overflow-hidden">
      {/* Back Button and Language Switcher */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-30 flex items-center space-x-2 text-white hover:text-gray-300 transition-colors group bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg"
      >
        <svg 
          className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">{t('nav.back')}</span>
      </button>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-30">
        <LanguageSwitcher variant="outline" className="text-white hover:text-gray-300 border-white/30 bg-black/20 backdrop-blur-sm" />
      </div>

      {/* Left Side - Charts Carousel */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-gray-800 via-gray-900 to-black relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-32 right-16 w-48 h-48 bg-white rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white rounded-full blur-2xl"></div>
        </div>
        
        {/* Logo */}
        <div className="absolute top-8 left-32 z-10 flex items-center space-x-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center p-1">
            <img src={logo3} alt="QuokkaAI" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <span className="text-white font-semibold text-lg">quokkaAI</span>
        </div>
        
        {/* Infinite Charts Carousel */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 py-8">
          {/* Main Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              {t('auth.heroTitle')}
            </h1>
            <p className="text-white/90 text-lg leading-relaxed max-w-xl mx-auto">
              {t('auth.heroDescription')}
            </p>
          </div>
          
          {/* Charts Container */}
          <div className="relative w-full max-w-3xl h-64">
            {/* Engagement Chart */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl animate-float">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('charts.engagement')}</div>
                  <div className="text-2xl font-bold text-gray-900">+78,12%</div>
                  <div className="text-xs text-gray-500">{t('charts.lastMonth')}</div>
                </div>
              </div>
              {/* Bar Chart */}
              <div className="flex items-end space-x-1.5 h-16">
                <div className="w-3 h-6 bg-gray-300 rounded-t"></div>
                <div className="w-3 h-8 bg-gray-400 rounded-t"></div>
                <div className="w-3 h-11 bg-gray-500 rounded-t"></div>
                <div className="w-3 h-13 bg-gray-600 rounded-t"></div>
                <div className="w-3 h-16 bg-gray-700 rounded-t"></div>
              </div>
            </div>
            
            {/* Sales Chart */}
            <div className="absolute top-6 right-0 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg animate-float-delayed">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('charts.totalSales')}</div>
              <div className="text-xl font-bold text-gray-900 mb-1">$527.8K</div>
              <div className="text-xs text-gray-500 mb-2">+32% {t('charts.lastMonth')}</div>
              {/* Line Chart */}
              <svg className="w-24 h-12" viewBox="0 0 100 50" preserveAspectRatio="none">
                <path 
                  d="M 0 40 Q 20 35 40 25 T 80 15 T 100 10" 
                  stroke="#374151" 
                  strokeWidth="2" 
                  fill="none"
                />
                <path 
                  d="M 0 40 Q 20 35 40 25 T 80 15 T 100 10 L 100 50 L 0 50 Z" 
                  fill="url(#grayGradient)"
                  opacity="0.2"
                />
                <defs>
                  <linearGradient id="grayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#374151" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Analytics Chart */}
            <div className="absolute top-40 left-4 bg-white/85 backdrop-blur-sm rounded-lg p-3 shadow-lg animate-float-slow">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('charts.analytics')}</div>
              <div className="flex space-x-1">
                <div className="w-2 h-8 bg-gray-400 rounded"></div>
                <div className="w-2 h-6 bg-gray-500 rounded"></div>
                <div className="w-2 h-10 bg-gray-600 rounded"></div>
                <div className="w-2 h-5 bg-gray-400 rounded"></div>
              </div>
            </div>
            
            {/* Revenue Chart */}
            <div className="absolute top-12 left-6 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg animate-float">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('charts.revenue')}</div>
              <div className="text-lg font-bold text-gray-900">$1.2M</div>
              <div className="text-xs text-gray-500 mb-2">{t('charts.growth')}</div>
              <div className="flex items-end space-x-1 h-6">
                <div className="w-1.5 h-2 bg-gray-400 rounded"></div>
                <div className="w-1.5 h-4 bg-gray-500 rounded"></div>
                <div className="w-1.5 h-3 bg-gray-400 rounded"></div>
                <div className="w-1.5 h-5 bg-gray-600 rounded"></div>
                <div className="w-1.5 h-6 bg-gray-700 rounded"></div>
              </div>
            </div>
            
            {/* Users Chart */}
            <div className="absolute top-26 right-20 bg-white/85 backdrop-blur-sm rounded-lg p-3 shadow-lg animate-float-delayed">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('charts.users')}</div>
              <div className="text-lg font-bold text-gray-900">24.5K</div>
              <div className="text-xs text-gray-500 mb-2">{t('charts.thisWeek')}</div>
              <div className="w-14 h-1.5 bg-gray-200 rounded-full">
                <div className="w-3/4 h-1.5 bg-gray-600 rounded-full"></div>
              </div>
            </div>
            
            {/* Performance Chart */}
            <div className="absolute top-52 right-6 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg animate-bounce-slow">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('charts.performance')}</div>
              <div className="text-base font-bold text-gray-900">95.2%</div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600">{t('charts.optimal')}</span>
              </div>
            </div>
            
            {/* Growth Indicator */}
            <div className="absolute top-66 left-28 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg animate-bounce-slow">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">{t('charts.liveData')}</span>
              </div>
            </div>
          </div>
          

        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center p-2">
              <img src={logo3} alt="QuokkaAI" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            <span className="text-xl font-bold text-gray-900">QuokkaAI</span>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? t('auth.signIn') : t('auth.signUp')}
            </h2>
            <p className="text-gray-600 text-sm">
              {isLogin ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
            </p>
          </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    {t('auth.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                      errors.name ? 'border-red-400 focus:ring-red-500' : ''
                    }`}
                    placeholder={t('auth.namePlaceholder')}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                    errors.email ? 'border-red-400 focus:ring-red-500' : ''
                  }`}
                  placeholder={t('auth.emailPlaceholder')}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                    errors.password ? 'border-red-400 focus:ring-red-500' : ''
                  }`}
                  placeholder={t('auth.passwordPlaceholder')}
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password field for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    {t('auth.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                      errors.confirmPassword ? 'border-red-400 focus:ring-red-500' : ''
                    }`}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              {/* Auth error */}
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                  <p className="text-red-600 text-sm">{authError}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 px-5 rounded-lg font-medium text-base transition-all duration-300 mt-6 ${
                  isLoading
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-gray-900 text-white hover:bg-black transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isLogin ? t('auth.processing') : t('otp.sendingCode')}
                  </div>
                ) : (
                  isLogin ? t('auth.signInButton') : t('auth.signUpButton')
                )}
              </button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="ml-2 text-gray-900 hover:text-black font-medium underline underline-offset-4 transition-colors"
                >
                  {isLogin ? t('auth.signUp') : t('auth.signIn')}
                </button>
              </p>
            </div>

            {/* Forgot password for login */}
            {isLogin && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
    </>
  )
}
