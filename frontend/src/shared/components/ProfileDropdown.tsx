import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore } from '../stores/languageStore';
import { Button } from '../../components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { 
  User, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Crown,
  ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileDropdownProps {
  isCollapsed?: boolean;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isCollapsed = false }) => {
  const { user, logout } = useAuthStore();
  const { t } = useLanguageStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/auth';
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  const getUserName = () => {
    if (!user?.email) return 'User';
    return user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isCollapsed) {
    return (
      <div className="flex justify-center">
        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {getUserInitials()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start p-0 h-auto hover:bg-gray-50">
          <div className="flex items-center space-x-3 w-full">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium text-sm">
                {getUserInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-medium text-sm text-gray-900 truncate">
                {user?.name || getUserName()}
              </div>
              <div className="text-xs text-gray-500">
                {t('profile.freePlan')}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium">
                {getUserInitials()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">
                {user?.name || getUserName()}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {user?.email || 'user@example.com'}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Plan Info */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900 flex items-center">
                <Crown className="w-4 h-4 mr-1 text-yellow-500" />
                {t('profile.freePlan')}
              </div>
              <div className="text-xs text-gray-500">3 {t('profile.queriesRemaining')}</div>
            </div>
            <Button size="sm" className="bg-black hover:bg-gray-800 text-white text-xs">
              {t('profile.upgrade')}
            </Button>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            {t('profile.profileSettings')}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <Settings className="w-4 h-4 mr-2" />
          {t('profile.preferences')}
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <HelpCircle className="w-4 h-4 mr-2" />
          {t('profile.helpSupport')}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          {t('profile.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 