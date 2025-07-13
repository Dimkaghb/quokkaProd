import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../shared/stores/authStore'
import { useLanguageStore } from '../shared/stores/languageStore'
import { LanguageSwitcher } from '../shared/components/LanguageSwitcher'
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

interface OTPVerificationProps {
  email: string
  name: string
  password: string
  onBack: () => void
}

export const OTPVerification = ({ email, name, password, onBack }: OTPVerificationProps) => {
  const { t } = useLanguageStore()
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(false)
  
  const navigate = useNavigate()
  const { login } = useAuthStore()
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer for OTP expiration
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [timeLeft])

  // Auto-focus next input
  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newOtpCode = [...otpCode]
    newOtpCode[index] = value
    setOtpCode(newOtpCode)
    
    // Clear error when user starts typing
    if (otpError) {
      setOtpError('')
    }
    
    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (/^\d{6}$/.test(pastedData)) {
      const newOtpCode = pastedData.split('')
      setOtpCode([...newOtpCode, ...Array(6 - newOtpCode.length).fill('')])
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerifyOTP = async () => {
    const code = otpCode.join('')
    if (code.length !== 6) {
      setOtpError(t('otp.enterCode'))
      return
    }

    setIsLoading(true)
    setOtpError('')
    
    try {
      await api.post('/auth/verify-otp', {
        email,
        otp_code: code
      })
      
      // Auto-login after successful verification
      const loginResponse = await api.post('/auth/login', {
        email,
        password
      })
      
      const { access_token } = loginResponse.data
      
      // Get user info
      const userResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      
      // Login with user data and token
      login(userResponse.data, access_token)
      
      navigate('/dashboard')
      
    } catch (err: any) {
      console.error('OTP verification error:', err)
      
      let errorMessage = t('otp.verificationFailed')
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.response?.status === 400) {
        errorMessage = t('otp.invalidCode')
      }
      
      setOtpError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setIsLoading(true)
    setOtpError('')
    
    try {
      await api.post('/auth/request-otp', {
        email,
        name,
        password
      })
      
      // Reset timer and OTP code
      setTimeLeft(60)
      setCanResend(false)
      setOtpCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      
    } catch (err: any) {
      console.error('Resend OTP error:', err)
      
      let errorMessage = t('otp.resendFailed')
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }
      
      setOtpError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-white flex relative overflow-hidden">
      {/* Back Button and Language Switcher */}
      <button
        onClick={onBack}
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

      {/* Left Side - Background */}
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
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              {t('auth.heroTitle')}
            </h1>
            <p className="text-white/90 text-lg leading-relaxed max-w-xl mx-auto">
              {t('auth.heroDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - OTP Form */}
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
              {t('otp.verifyEmail')}
            </h2>
            <p className="text-gray-600 text-sm">
              {t('otp.codeSent')} <strong>{email}</strong>
            </p>
          </div>

          {/* OTP Input */}
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                  placeholder=""
                />
              ))}
            </div>

            {/* Timer */}
            <div className="text-center">
              {timeLeft > 0 ? (
                <p className="text-sm text-gray-500">
                  {t('otp.codeExpires')} {formatTime(timeLeft)}
                </p>
              ) : (
                <p className="text-sm text-red-500">
                  {t('otp.codeExpired')}
                </p>
              )}
            </div>

            {/* Error */}
            {otpError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{otpError}</p>
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || otpCode.join('').length !== 6}
              className={`w-full py-2.5 px-5 rounded-lg font-medium text-base transition-all duration-300 ${
                isLoading || otpCode.join('').length !== 6
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
                  {t('otp.verifying')}
                </div>
              ) : (
                t('otp.verifyCode')
              )}
            </button>

            {/* Resend Button */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                {t('otp.didntReceive')}
                {canResend ? (
                  <button
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="ml-2 text-gray-900 hover:text-black font-medium underline underline-offset-4 transition-colors"
                  >
                    {t('otp.resend')}
                  </button>
                ) : (
                  <span className="ml-2 text-gray-400">
                    {t('otp.resendAvailable')} {formatTime(timeLeft)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 