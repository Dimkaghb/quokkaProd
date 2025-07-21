import React, { useState } from 'react';

interface QuickPromptsTestProps {
  onPromptSelect?: (prompt: string) => void;
}

const QuickPromptsTest: React.FC<QuickPromptsTestProps> = ({ onPromptSelect }) => {
  const [message, setMessage] = useState('');
  const [previousResponse, setPreviousResponse] = useState('');
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateQuickPrompts = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat/quick-prompts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token auth
        },
        body: JSON.stringify({
          message: message.trim(),
          previous_response: previousResponse.trim(),
          thread_id: null // Optional
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.quick_prompts) {
        setQuickPrompts(data.quick_prompts);
      } else {
        setError('Failed to generate quick prompts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (onPromptSelect) {
      onPromptSelect(prompt);
    } else {
      // Default behavior: copy to clipboard
      navigator.clipboard.writeText(prompt);
      alert('Prompt copied to clipboard!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🚀 Enhanced Quick Prompts Test
      </h2>
      
      <div className="space-y-4">
        {/* Message Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User Message *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message or data context..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Previous Response Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Previous AI Response (Optional)
          </label>
          <textarea
            value={previousResponse}
            onChange={(e) => setPreviousResponse(e.target.value)}
            placeholder="Enter the previous AI response for context..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={generateQuickPrompts}
          disabled={loading || !message.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '🔄 Generating...' : '✨ Generate Quick Prompts'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            ❌ {error}
          </div>
        )}

        {/* Quick Prompts Display */}
        {quickPrompts.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              💡 Generated Quick Prompts ({quickPrompts.length})
            </h3>
            <div className="space-y-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(prompt)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-gray-800 flex-1">
                      <span className="font-medium text-blue-600">
                        {index + 1}.
                      </span>{' '}
                      {prompt}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to use
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-semibold text-blue-800 mb-2">📋 How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Enter your message or data context</li>
            <li>• Optionally add previous AI response for better context</li>
            <li>• Click "Generate Quick Prompts" to get 2-3 smart suggestions</li>
            <li>• Click on any prompt to use it (or copy to clipboard)</li>
            <li>• Prompts are generated based on LLM analysis of your context</li>
          </ul>
        </div>

        {/* API Info */}
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="font-semibold text-gray-700 mb-1">🔗 API Endpoint:</h4>
          <code className="text-xs text-gray-600">
            POST /api/chat/quick-prompts/generate
          </code>
        </div>
      </div>
    </div>
  );
};

export default QuickPromptsTest;