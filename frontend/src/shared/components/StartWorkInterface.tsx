import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { 
  Upload, 
  MessageSquare, 
  Brain, 
  HelpCircle, 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Search,
  Send
} from 'lucide-react';
import logo3 from '../../assets/logo3.png';

interface StartWorkInterfaceProps {
  onStartWork: (query?: string) => void;
}

export const StartWorkInterface: React.FC<StartWorkInterfaceProps> = ({ onStartWork }) => {
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartWork(query.trim() || undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickActions = [
    {
      icon: Upload,
      title: 'Upload Data',
      description: 'Upload spreadsheets, PDFs or integrate data sources for analysis.',
      onClick: () => onStartWork()
    },
    {
      icon: MessageSquare,
      title: 'Ask Questions',
      description: 'Generate charts, tables, insights, advanced models & more.',
      onClick: () => onStartWork('Generate charts and insights')
    },
    {
      icon: Brain,
      title: 'AI Analysis',
      description: 'Execute AI-powered analysis across your data with smart prompts.',
      onClick: () => onStartWork('Add AI-based columns')
    },
    {
      icon: HelpCircle,
      title: 'Expert Help',
      description: 'Get help with formulas, queries, analysis techniques & more.',
      onClick: () => onStartWork('Help with data analysis')
    }
  ];

  const quantitativeTemplates = [
    {
      icon: FileText,
      label: 'Clean/Prep Data',
      onClick: () => onStartWork('Clean and prepare data')
    },
    {
      icon: Search,
      label: 'Uncover Insights',
      onClick: () => onStartWork('Uncover insights from data')
    },
    {
      icon: BarChart3,
      label: 'Generate Charts',
      onClick: () => onStartWork('Generate charts and visualizations')
    },
    {
      icon: TrendingUp,
      label: 'Identify Correlations',
      onClick: () => onStartWork('Identify correlations in data')
    }
  ];

  const qualitativeTemplates = [
    {
      icon: Brain,
      label: 'Sentiment Analysis',
      onClick: () => onStartWork('Perform sentiment analysis')
    },
    {
      icon: MessageSquare,
      label: 'Text Classification',
      onClick: () => onStartWork('Classify text data')
    },
    {
      icon: Search,
      label: 'Extract Entities',
      onClick: () => onStartWork('Extract entities from text')
    },
    {
      icon: TrendingUp,
      label: 'Topic Modeling',
      onClick: () => onStartWork('Perform topic modeling')
    }
  ];

  return (
    <div className={cn(
      "flex-1 flex flex-col items-center justify-start bg-white overflow-y-auto",
      isMobile ? "px-4 py-6" : "px-6 py-8"
    )}>
      <div className="max-w-4xl w-full text-center flex-shrink-0">
        {/* Header */}
        <div className={cn(
          "mb-6",
          isMobile ? "mt-4" : "mt-8 mb-8"
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
            Welcome to QuokkaAI
          </h1>
          <p className={cn(
            "text-gray-600",
            isMobile ? "text-base" : "text-lg lg:text-xl"
          )}>
            Your intelligent data analysis assistant
          </p>
        </div>

        {/* Main Input */}
        <form onSubmit={handleSubmit} className={cn(
          isMobile ? "mb-6" : "mb-8"
        )}>
          <div className="relative max-w-2xl mx-auto">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isMobile ? "Ask me anything..." : "Ask me anything about your data..."}
              className={cn(
                "w-full border-gray-200 rounded-2xl focus:border-gray-300 shadow-sm",
                isMobile ? [
                  "px-4 py-3 text-base", // Prevent zoom on iOS
                  "pr-20" // Space for buttons
                ] : [
                  "px-6 py-4 text-lg",
                  "pr-24"
                ]
              )}
            />
            <div className={cn(
              "absolute top-1/2 transform -translate-y-1/2 flex items-center space-x-1",
              isMobile ? "right-2" : "right-4 space-x-2"
            )}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onStartWork()}
                className={cn(
                  "text-gray-400 hover:text-gray-600 touch-manipulation",
                  isMobile ? "h-8 w-8" : ""
                )}
              >
                <Upload className={cn(
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                )} />
              </Button>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className={cn(
                  "text-gray-400 hover:text-gray-600 touch-manipulation",
                  isMobile ? "h-8 w-8" : ""
                )}
              >
                <Send className={cn(
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                )} />
              </Button>
            </div>
          </div>
        </form>

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

        {/* Templates Section */}
        <div className="text-center">
          <p className={cn(
            "text-gray-600 mb-4",
            isMobile ? "text-sm" : "mb-6"
          )}>
            or get started quickly with a{' '}
            <span className="font-semibold text-gray-900">one-click template</span>
          </p>
          
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-1 gap-4" : "grid-cols-1 lg:grid-cols-2 gap-6"
          )}>
            {/* Quantitative */}
            <Card className="border-gray-200">
              <CardContent className={cn(
                isMobile ? "p-4" : "p-8"
              )}>
                <h3 className={cn(
                  "font-semibold text-gray-900 mb-3",
                  isMobile ? "text-lg" : "text-xl mb-4"
                )}>Quantitative Analysis</h3>
                <p className={cn(
                  "text-gray-600 mb-4",
                  isMobile ? "text-sm" : "mb-6"
                )}>Generate tables, charts, insights & more.</p>
                
                <div className="space-y-2">
                  {quantitativeTemplates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={cn(
                        "w-full justify-start touch-manipulation",
                        isMobile ? "h-10 text-sm" : ""
                      )}
                      onClick={template.onClick}
                    >
                      <template.icon className={cn(
                        "mr-2",
                        isMobile ? "w-3 h-3" : "w-4 h-4"
                      )} />
                      {template.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Qualitative */}
            <Card className="border-gray-200">
              <CardContent className={cn(
                isMobile ? "p-4" : "p-8"
              )}>
                <h3 className={cn(
                  "font-semibold text-gray-900 mb-3",
                  isMobile ? "text-lg" : "text-xl mb-4"
                )}>Qualitative Analysis</h3>
                <p className={cn(
                  "text-gray-600 mb-4",
                  isMobile ? "text-sm" : "mb-6"
                )}>Add intelligent columns and insights with AI.</p>
                
                <div className="space-y-2">
                  {qualitativeTemplates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={cn(
                        "w-full justify-start touch-manipulation",
                        isMobile ? "h-10 text-sm" : ""
                      )}
                      onClick={template.onClick}
                    >
                      <template.icon className={cn(
                        "mr-2",
                        isMobile ? "w-3 h-3" : "w-4 h-4"
                      )} />
                      {template.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
            Powered by advanced AI • Secure & Private • Enterprise Ready
          </p>
        </div>
      </div>
    </div>
  );
}; 