import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../shared/stores/authStore';
import { useLanguageStore } from '../shared/stores/languageStore';
import { authAPI } from '../shared/api/authAPI';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { cn } from '../lib/utils';
import { 
  User, 
  Settings, 
  Crown,
  ChevronLeft,
  Save,
  Edit3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import logo3 from '../assets/logo3.png';

type ProfileSection = 'account' | 'settings' | 'subscription';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { t } = useLanguageStore();
  const [activeSection, setActiveSection] = useState<ProfileSection>('account');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: ''
  });

  // Initialize form data when user data changes
  useEffect(() => {
    if (user) {
      const nameParts = user.name ? user.name.split(' ') : [];
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        company: '',
        phone: ''
      });
    }
  }, [user]);

  const getUserInitials = () => {
    if (user?.name) {
      const nameParts = user.name.split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      }
      return user.name.charAt(0).toUpperCase();
    }
    if (!user?.email) return 'U';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  const getUserName = () => {
    if (user?.name) return user.name;
    if (!user?.email) return 'User';
    return user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const updatedUser = await authAPI.updateProfile(fullName);
      
      // Update the user in the store
      updateUser(updatedUser);
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      // You could add toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  const sidebarItems = [
    {
      id: 'account' as ProfileSection,
      label: t('profile.accountSettings'),
      icon: User,
      description: 'Manage your personal information'
    },
    {
      id: 'settings' as ProfileSection,
      label: t('profile.preferences'),
      icon: Settings,
      description: 'App settings and preferences'
    },
    {
      id: 'subscription' as ProfileSection,
      label: t('profile.subscription'),
      icon: Crown,
      description: 'Manage your plan and billing'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('profile.accountSettings')}</h2>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? t('profile.cancel') : t('profile.edit')}</span>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>{t('profile.personalInfo')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{getUserName()}</h3>
                    <p className="text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.firstName')}
                    </label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      disabled={!isEditing}
                      placeholder={t('profile.firstNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.lastName')}
                    </label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      disabled={!isEditing}
                      placeholder={t('profile.lastNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.email')}
                    </label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditing}
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.phone')}
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!isEditing}
                      placeholder={t('profile.phonePlaceholder')}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.company')}
                    </label>
                    <Input
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      disabled={!isEditing}
                      placeholder={t('profile.companyPlaceholder')}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={handleSave} className="bg-black hover:bg-gray-800" disabled={isSaving}>
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? t('profile.saving') : t('profile.save')}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      {t('profile.cancel')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('profile.preferences')}</h2>
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.appSettings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('profile.settingsComingSoon')}</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'subscription':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('profile.subscription')}</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <span>{t('profile.currentPlan')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t('profile.freePlan')}</h3>
                      <p className="text-sm text-gray-600">3 {t('profile.queriesRemaining')}</p>
                    </div>
                    <Button className="bg-black hover:bg-gray-800">
                      {t('profile.upgradePlan')}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 border rounded-lg">
                      <h4 className="font-semibold text-gray-900">{t('profile.subscription.free')}</h4>
                      <p className="text-2xl font-bold text-gray-900 my-2">$0</p>
                      <p className="text-sm text-gray-600">{t('profile.storage20MB')}</p>
                    </div>
                    <div className="text-center p-4 border-2 border-black rounded-lg">
                      <h4 className="font-semibold text-gray-900">{t('profile.subscription.pro')}</h4>
                      <p className="text-2xl font-bold text-gray-900 my-2">$10</p>
                      <p className="text-sm text-gray-600">{t('profile.storage500MB')}</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <h4 className="font-semibold text-gray-900">{t('profile.subscription.enterprise')}</h4>
                      <p className="text-2xl font-bold text-gray-900 my-2">{t('profile.subscription.custom')}</p>
                      <p className="text-sm text-gray-600">{t('profile.subscription.unlimitedStorage')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/chat" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>{t('profile.backToChat')}</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <img 
                  src={logo3} 
                  alt="QuokkaAI Logo" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <span className="font-semibold text-gray-900">QuokkaAI</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-1">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors",
                          activeSection === item.id
                            ? "bg-black text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{item.label}</div>
                          <div className={cn(
                            "text-xs",
                            activeSection === item.id ? "text-gray-300" : "text-gray-500"
                          )}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};