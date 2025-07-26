import React, { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import { HelpCircle, Send, Clock, CheckCircle } from 'lucide-react'
import { useToast } from './Toast'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SupportFormData {
  email: string
  problem: string
}

export const SupportModal: React.FC<SupportModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { showToast } = useToast()
  const [formData, setFormData] = useState<SupportFormData>({
    email: '',
    problem: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (field: keyof SupportFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      showToast('Please enter your email address', 'error')
      return false
    }
    
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      showToast('Please enter a valid email address', 'error')
      return false
    }
    
    if (!formData.problem.trim()) {
      showToast('Please describe your problem', 'error')
      return false
    }
    
    if (formData.problem.trim().length < 10) {
      showToast('Please provide more details about your problem (at least 10 characters)', 'error')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/contact/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setIsSubmitted(true)
        showToast('Support request sent successfully! We\'ll respond within 24 hours.', 'success')
        
        // Reset form after a delay
        setTimeout(() => {
          setFormData({ email: '', problem: '' })
          setIsSubmitted(false)
          onClose()
        }, 3000)
      } else {
        throw new Error(result.detail || 'Failed to send support request')
      }
    } catch (error) {
      console.error('Support form error:', error)
      showToast('Failed to send support request. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ email: '', problem: '' })
      setIsSubmitted(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <span>Help & Support</span>
          </DialogTitle>
        </DialogHeader>

        {isSubmitted ? (
          <div className="space-y-4 flex-1 overflow-y-auto py-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Request Sent Successfully!
                </h3>
                <p className="text-gray-600 text-sm">
                  Thank you for contacting us. We've received your support request and will respond within 24 hours.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Response Time: Within 24 hours</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto">
            {/* Response Time Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-blue-700">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Response Time: Within 24 hours</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                We aim to respond to all support requests during business hours
              </p>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Your Email Address *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className="w-full"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                We'll use this email to respond to your request
              </p>
            </div>

            {/* Problem Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Describe Your Problem *
              </label>
              <Textarea
                value={formData.problem}
                onChange={(e) => handleInputChange('problem', e.target.value)}
                placeholder="Please describe the issue you're experiencing in detail..."
                className="w-full min-h-[120px] resize-none"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                Please provide as much detail as possible to help us assist you better
              </p>
            </div>

            {/* Support Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                What to include in your message:
              </h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Steps you took before the issue occurred</li>
                <li>• Any error messages you received</li>
                <li>• Your browser and operating system</li>
                <li>• Screenshots if applicable</li>
              </ul>
            </div>
          </form>
        )}

        {!isSubmitted && (
          <DialogFooter className="gap-2 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.email.trim() || !formData.problem.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}