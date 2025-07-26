import React from 'react';
import { useLanguageStore, Language } from '../stores/languageStore';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Button } from '../../components/ui/button';
import { Check } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

// SVG Flag Components
const USFlag = () => (
  <svg 
    width="18" 
    height="12" 
    viewBox="0 0 18 12" 
    className="inline-block rounded-sm border border-gray-300 shadow-sm"
    style={{ minWidth: '18px', minHeight: '12px' }}
  >
    <rect width="18" height="12" fill="#B22234"/>
    <rect width="18" height="0.92" y="0.92" fill="white"/>
    <rect width="18" height="0.92" y="2.77" fill="white"/>
    <rect width="18" height="0.92" y="4.62" fill="white"/>
    <rect width="18" height="0.92" y="6.46" fill="white"/>
    <rect width="18" height="0.92" y="8.31" fill="white"/>
    <rect width="18" height="0.92" y="10.15" fill="white"/>
    <rect width="7.2" height="6.46" fill="#3C3B6E"/>
    <g fill="white">
      <circle cx="1.2" cy="1.2" r="0.25"/>
      <circle cx="2.4" cy="1.2" r="0.25"/>
      <circle cx="3.6" cy="1.2" r="0.25"/>
      <circle cx="4.8" cy="1.2" r="0.25"/>
      <circle cx="6" cy="1.2" r="0.25"/>
      <circle cx="1.8" cy="2" r="0.25"/>
      <circle cx="3" cy="2" r="0.25"/>
      <circle cx="4.2" cy="2" r="0.25"/>
      <circle cx="5.4" cy="2" r="0.25"/>
      <circle cx="1.2" cy="2.8" r="0.25"/>
      <circle cx="2.4" cy="2.8" r="0.25"/>
      <circle cx="3.6" cy="2.8" r="0.25"/>
      <circle cx="4.8" cy="2.8" r="0.25"/>
      <circle cx="6" cy="2.8" r="0.25"/>
      <circle cx="1.8" cy="3.6" r="0.25"/>
      <circle cx="3" cy="3.6" r="0.25"/>
      <circle cx="4.2" cy="3.6" r="0.25"/>
      <circle cx="5.4" cy="3.6" r="0.25"/>
      <circle cx="1.2" cy="4.4" r="0.25"/>
      <circle cx="2.4" cy="4.4" r="0.25"/>
      <circle cx="3.6" cy="4.4" r="0.25"/>
      <circle cx="4.8" cy="4.4" r="0.25"/>
      <circle cx="6" cy="4.4" r="0.25"/>
      <circle cx="1.8" cy="5.2" r="0.25"/>
      <circle cx="3" cy="5.2" r="0.25"/>
      <circle cx="4.2" cy="5.2" r="0.25"/>
      <circle cx="5.4" cy="5.2" r="0.25"/>
    </g>
  </svg>
);

const RussianFlag = () => (
  <svg 
    width="18" 
    height="12" 
    viewBox="0 0 18 12" 
    className="inline-block rounded-sm border border-gray-300 shadow-sm"
    style={{ minWidth: '18px', minHeight: '12px' }}
  >
    <rect width="18" height="4" fill="white"/>
    <rect width="18" height="4" y="4" fill="#0039A6"/>
    <rect width="18" height="4" y="8" fill="#D52B1E"/>
  </svg>
);

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'ghost',
  size = 'sm',
  className = ''
}) => {
  const { language, setLanguage, t } = useLanguageStore();

  const languages: { code: Language; name: string; flag: React.ReactNode }[] = [
    { code: 'en', name: t('common.english'), flag: <USFlag /> },
    { code: 'ru', name: t('common.russian'), flag: <RussianFlag /> },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`flex items-center justify-center space-x-1 ${className}`}
        >
          {currentLanguage?.flag}
          <span className="text-sm font-medium">
            {currentLanguage?.code.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              {lang.flag}
              <span className="text-sm font-medium text-gray-600">
                {lang.code.toUpperCase()}
              </span>
              <span>{lang.name}</span>
            </div>
            {language === lang.code && (
              <Check className="w-4 h-4 text-green-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};