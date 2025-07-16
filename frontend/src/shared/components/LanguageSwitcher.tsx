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

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'ghost',
  size = 'sm',
  className = ''
}) => {
  const { language, setLanguage, t } = useLanguageStore();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: t('common.english'), flag: '🇺🇸' },
    { code: 'ru', name: t('common.russian'), flag: '🇷🇺' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`flex items-center justify-center ${className}`}
        >
          <span className="text-lg">{currentLanguage?.flag}</span>
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
              <span>{lang.flag}</span>
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