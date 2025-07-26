import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { 
  Upload, 
  MessageSquare, 
  Brain, 
  Zap,
  Network
} from 'lucide-react';
import logo3 from '../../assets/logo3.png';
import { useLanguageStore } from '../stores/languageStore';
import { LanguageSwitcher } from './LanguageSwitcher';
import { DataCleaningModal } from './DataCleaningModal';
import { QuickDataReportModal } from './QuickDataReportModal';
import GraphsModal from '../../components/modals/GraphsModal';

interface StartWorkInterfaceProps {
  onStartWork: (query?: string) => void;
}

export const StartWorkInterface: React.FC<StartWorkInterfaceProps> = ({ onStartWork }) => {
  const { t } = useLanguageStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isDataCleaningModalOpen, setIsDataCleaningModalOpen] = useState(false);
  const [isQuickDataReportModalOpen, setIsQuickDataReportModalOpen] = useState(false);
  const [isGraphsModalOpen, setIsGraphsModalOpen] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const quickActions = [
    {
      icon: Network,
      title: t('startWork.visualizeManage'),
      description: t('startWork.visualizeManageDesc'),
      onClick: () => setIsGraphsModalOpen(true)
    },
    {
      icon: MessageSquare,
      title: t('startWork.quickDataReport'),
      description: t('startWork.quickDataReportDesc'),
      onClick: () => setIsQuickDataReportModalOpen(true)
    },
    {
      icon: Brain,
      title: t('startWork.aiAnalysis'),
      description: t('startWork.aiAnalysisDesc'),
      onClick: () => onStartWork('Add AI-based columns')
    },
    {
      icon: Zap,
      title: t('dataCleaning.title'),
      description: t('dataCleaning.description'),
      onClick: () => setIsDataCleaningModalOpen(true)
    }
  ];



  return (
    <div className={cn(
      "flex-1 flex flex-col items-center justify-start bg-white overflow-y-auto relative",
      isMobile ? "px-4 py-6" : "px-6 py-8"
    )}>
      {/* Language Switcher - Only on desktop */}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>
      )}
      
      <div className="max-w-4xl w-full text-center flex-shrink-0">
        {/* Header */}
        <div className={cn(
          "mb-6",
          isMobile ? "mt-8" : "mt-16 mb-8" // Reduced top margin since no language switcher overlap
        )}>
          <div className={cn(
            "mx-auto mb-4 bg-black rounded-2xl flex items-center justify-center shadow-lg",
            isMobile ? "w-16 h-16" : "w-20 h-20 mb-6"
          )}>
            <img 
              src={logo3} 
              alt="QuokkaAI Logo" 
              className={cn(
                "object-contain",
                isMobile ? "w-10 h-10" : "w-12 h-12"
              )}
            />
          </div>
          <h1 className={cn(
            "font-bold text-gray-900 mb-3 break-words",
            isMobile ? "text-2xl" : "text-3xl lg:text-4xl mb-4"
          )}>
            {t('startWork.title')}
          </h1>
          <p className={cn(
            "text-gray-600",
            isMobile ? "text-base" : "text-lg lg:text-xl"
          )}>
            {t('startWork.subtitle')}
          </p>
        </div>

        {/* Welcome Banner */}
        <div className={cn(
          "bg-gray-50 border border-gray-200 rounded-xl text-center shadow-sm",
          isMobile ? "p-4 mb-6" : "p-8 mb-8"
        )}>
          <h2 className={cn(
            "font-semibold text-gray-800 mb-6",
            isMobile ? "text-lg" : "text-xl"
          )}>
            {t('startWork.welcomeBanner')}
          </h2>
          <div className={cn(
            "space-y-3 text-gray-700",
            isMobile ? "text-sm" : "text-base"
          )}>
            <div className="flex items-center justify-center gap-2">
              <span>{t('startWork.uploadTable')}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>{t('startWork.clickNewAnalysis')}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>{t('startWork.startAsking')}</span>
            </div>
          </div>
        </div>

        {/* File Upload Button */}
        <div className={cn(
          "flex justify-center mb-8",
          isMobile ? "mb-6" : "mb-10"
        )}>
          <Button
            onClick={() => onStartWork()}
            className={cn(
              "bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium flex items-center gap-3 shadow-sm transition-colors",
              isMobile ? "px-8 py-4 text-base" : "px-12 py-4 text-lg"
            )}
          >
            <Upload className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
            {t('startWork.uploadData')}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className={cn(
          "grid gap-4 mb-6",
          isMobile ? [
            "grid-cols-1 gap-3"
          ] : [
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 mb-8"
          ]
        )}>
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="cursor-pointer transition-all duration-200 hover:shadow-md border-gray-200 hover:border-gray-300 active:scale-95 touch-manipulation"
              onClick={action.onClick}
            >
              <CardContent className={cn(
                "text-center",
                isMobile ? "p-4" : "p-6"
              )}>
                <div className={cn(
                  "mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center",
                  isMobile ? "w-10 h-10" : "w-12 h-12 mb-4"
                )}>
                  <action.icon className={cn(
                    "text-gray-600",
                    isMobile ? "w-5 h-5" : "w-6 h-6"
                  )} />
                </div>
                <h3 className={cn(
                  "font-semibold text-gray-900 mb-2",
                  isMobile ? "text-sm" : ""
                )}>{action.title}</h3>
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {action.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className={cn(
          "pt-4 border-t border-gray-200",
          isMobile ? "mt-6" : "mt-8 pt-6"
        )}>
          <p className={cn(
            "text-gray-500",
            isMobile ? "text-xs" : "text-sm"
          )}>
            {t('startWork.footer')}
          </p>
        </div>
      </div>
      
      {/* Data Cleaning Modal */}
      <DataCleaningModal
        isOpen={isDataCleaningModalOpen}
        onClose={() => setIsDataCleaningModalOpen(false)}
      />
      
      {/* Quick Data Report Modal */}
       <QuickDataReportModal
         isOpen={isQuickDataReportModalOpen}
         onClose={() => setIsQuickDataReportModalOpen(false)}
       />
       
      {/* Graphs Modal */}
      <GraphsModal
        isOpen={isGraphsModalOpen}
        onClose={() => setIsGraphsModalOpen(false)}
      />
    </div>
  );
};