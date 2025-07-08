import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { ConnectionStatus } from './ConnectionStatus';

interface MainContentProps {
  onStartChat: () => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  onStartChat
}) => {
  const { user } = useAuthStore();

  return (
    <div className="flex-1 overflow-auto bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                What do you want to analyze today?
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.email?.split('@')[0] || 'User'}! Ready to dive into your data?
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <ConnectionStatus />
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Default
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Tools
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Advanced Reasoning
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Extended Memory
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="max-w-2xl w-full text-center">
          {/* Welcome Message */}
          <div className="mb-12">
            <div className="text-6xl mb-6">🤖</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to QuokkaAI
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Feel free to upload your data files and start your analytical work! 
              I'm here to help you visualize, analyze, and understand your data through intelligent conversations.
            </p>
          </div>

          {/* Chat Input */}
          <div className="relative">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 hover:border-gray-300 transition-colors">
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-gray-400 text-xl">💬</span>
                <input
                  type="text"
                  placeholder="Upload your data and start chatting! Try: 'Upload my sales data and create a visualization'"
                  className="flex-1 bg-transparent border-0 focus:outline-none text-gray-900 placeholder-gray-500 text-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      onStartChat();
                    }
                  }}
                />
              </div>
              <button 
                onClick={onStartChat}
                className="ml-4 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="mt-8 text-sm text-gray-500">
            <p>💡 <strong>Pro tip:</strong> You can upload files directly in the chat or drag & drop them here</p>
            <p className="mt-2">Supported formats: CSV, Excel, PDF, TXT, DOCX</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 