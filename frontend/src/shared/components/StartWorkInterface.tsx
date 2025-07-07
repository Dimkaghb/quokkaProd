import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { 
  Upload, 
  MessageSquare, 
  Brain, 
  HelpCircle, 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Search,
  Sparkles,
  Send
} from 'lucide-react';

interface StartWorkInterfaceProps {
  onStartWork: (query?: string) => void;
}

export const StartWorkInterface: React.FC<StartWorkInterfaceProps> = ({ onStartWork }) => {
  const [query, setQuery] = useState('');

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
    <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-8 min-h-screen">
      <div className="max-w-4xl w-full text-center">
        {/* Header */}
        <div className="mb-12">
          <div className="w-24 h-24 mx-auto mb-8 bg-black rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="text-white w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to QuokkaAI
          </h1>
          <p className="text-xl text-gray-600">
            Your intelligent data analysis assistant
          </p>
        </div>

        {/* Main Input */}
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your data..."
              className="w-full px-6 py-4 text-lg border-gray-200 rounded-2xl focus:border-gray-300 shadow-sm"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onStartWork()}
                className="text-gray-400 hover:text-gray-600"
              >
                <Upload className="w-5 h-5" />
              </Button>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-600"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </form>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="cursor-pointer transition-all duration-200 hover:shadow-md border-gray-200 hover:border-gray-300"
              onClick={action.onClick}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                  <action.icon className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Templates Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-8">
            or get started quickly with a{' '}
            <span className="font-semibold text-gray-900">one-click template</span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quantitative */}
            <Card className="border-gray-200">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Quantitative Analysis</h3>
                <p className="text-gray-600 mb-6">Generate tables, charts, insights & more.</p>
                
                <div className="space-y-3">
                  {quantitativeTemplates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={template.onClick}
                    >
                      <template.icon className="w-4 h-4 mr-2" />
                      {template.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Qualitative */}
            <Card className="border-gray-200">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Qualitative Analysis</h3>
                <p className="text-gray-600 mb-6">Add intelligent columns and insights with AI.</p>
                
                <div className="space-y-3">
                  {qualitativeTemplates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={template.onClick}
                    >
                      <template.icon className="w-4 h-4 mr-2" />
                      {template.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Powered by advanced AI • Secure & Private • Enterprise Ready
          </p>
        </div>
      </div>
    </div>
  );
}; 