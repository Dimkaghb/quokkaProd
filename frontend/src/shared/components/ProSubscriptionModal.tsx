import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Mail, Star, Zap, Shield, Clock } from 'lucide-react';
import { useLanguageStore } from '../stores/languageStore';

interface ProSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProSubscriptionModal: React.FC<ProSubscriptionModalProps> = ({
  isOpen,
  onClose
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguageStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      alert(t('proModal.emailRequired'));
      return;
    }

    if (!email.includes('@')) {
      alert(t('proModal.emailInvalid'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual API call to save email for pro subscription
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Show development message instead of success for now
      alert(t('proModal.apiNotImplemented'));
      setEmail('');
      onClose();
    } catch (error) {
      alert(t('proModal.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const proFeatures = [
    {
      icon: <Zap className="w-5 h-5 text-blue-500" />,
      title: t('proModal.advancedAnalytics'),
      description: t('proModal.advancedAnalyticsDesc')
    },
    {
      icon: <Shield className="w-5 h-5 text-green-500" />,
      title: t('proModal.prioritySupport'),
      description: t('proModal.prioritySupportDesc')
    },
    {
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      title: t('proModal.premiumFeatures'),
      description: t('proModal.premiumFeaturesDesc')
    },
    {
      icon: <Clock className="w-5 h-5 text-purple-500" />,
      title: t('proModal.apiAccess'),
      description: t('proModal.apiAccessDesc')
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-black">
            {t('proModal.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Coming Soon Message */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {t('proModal.description')}
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-700 font-medium">
                {t('proModal.earlyDiscount')}
              </p>
            </div>
          </div>

          {/* Pro Features Preview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-black text-center mb-3">{t('proModal.whatsComingTitle')}</h3>
            <div className="grid gap-3">
              {proFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-black text-sm">{feature.title}</h4>
                    <p className="text-gray-600 text-xs">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Email Subscription Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                {t('proModal.earlyAccessLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('proModal.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                {t('proModal.maybeLater')}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-black text-white hover:bg-gray-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('proModal.subscribing') : t('proModal.getEarlyAccess')}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};