import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Building, Mail, User, MessageSquare, Send, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguageStore } from '../stores/languageStore';

interface EnterpriseContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ContactFormData {
    name: string;
    email: string;
    company: string;
    phone: string;
    message: string;
}

interface ContactResponse {
    success: boolean;
    message: string;
    timestamp: string;
}

export const EnterpriseContactModal: React.FC<EnterpriseContactModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguageStore();
    const [formData, setFormData] = useState<ContactFormData>({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset status when user starts typing
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
      setStatusMessage('');
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      return t('enterprise.nameValidation');
    }
    
    if (!formData.email.trim() || !formData.email.includes('@')) {
      return t('enterprise.emailValidation');
    }
    
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      return t('enterprise.messageValidation');
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const validationError = validateForm();
    if (validationError) {
      setSubmitStatus('error');
      setStatusMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/contact/enterprise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim() || null,
          phone: formData.phone.trim() || null,
          message: formData.message.trim()
        }),
      });

      const result: ContactResponse = await response.json();
      
      if (response.ok && result.success) {
        setSubmitStatus('success');
        setStatusMessage(result.message);
        setFormData({ name: '', email: '', company: '', phone: '', message: '' });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
          setSubmitStatus('idle');
          setStatusMessage('');
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
      setStatusMessage(
        error instanceof Error 
          ? error.message 
          : t('enterprise.errorGeneral')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const enterpriseFeatures = [
    t('enterprise.feature1'),
    t('enterprise.feature2'),
    t('enterprise.feature3'),
    t('enterprise.feature4'),
    t('enterprise.feature5'),
    t('enterprise.feature6'),
    t('enterprise.feature7'),
    t('enterprise.feature8')
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-black">
            {t('enterprise.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Message */}
          {submitStatus !== 'idle' && (
            <div className={`p-4 rounded-lg border flex items-center space-x-3 ${
              submitStatus === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {submitStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{statusMessage}</span>
            </div>
          )}

          {/* Enterprise Features */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-100">
            <h3 className="font-semibold text-black mb-3 flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-600" />
              {t('enterprise.features')}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {enterpriseFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
                {t('enterprise.fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t('enterprise.fullNamePlaceholder')}
                  value={formData.name}
                  onChange={handleInputChange}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                {t('enterprise.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('enterprise.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-black mb-2">
                {t('enterprise.companyName')}
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="company"
                  name="company"
                  type="text"
                  placeholder={t('enterprise.companyPlaceholder')}
                  value={formData.company}
                  onChange={handleInputChange}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-black mb-2">
                {t('enterprise.phoneNumber')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={t('enterprise.phonePlaceholder')}
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-black mb-2">
                {t('enterprise.tellUsAbout')}
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <Textarea
                  id="message"
                  name="message"
                  placeholder={t('enterprise.messagePlaceholder')}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="pl-10 min-h-[100px] resize-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="flex space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
{t('enterprise.cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                disabled={isSubmitting || submitStatus === 'success'}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('enterprise.sending')}
                  </>
                ) : submitStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('enterprise.sent')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('enterprise.sendMessage')}
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="text-center text-sm text-gray-500">
            {t('enterprise.responseTime')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};