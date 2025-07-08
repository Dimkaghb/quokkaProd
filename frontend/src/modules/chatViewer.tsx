import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../shared/stores/authStore';
import { chatAPI } from '../shared/api/chatAPI';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

export const ChatViewer: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (!threadId) {
      navigate('/chat');
      return;
    }

    loadThreadData();
  }, [threadId, isAuthenticated, navigate]);

  const loadThreadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load thread details
      const threadResponse = await chatAPI.getThread(threadId!);
      if (threadResponse.success && threadResponse.thread) {
        setThread(threadResponse.thread);
      }

      // Load messages
      const messagesResponse = await chatAPI.getMessages(threadId!);
      if (messagesResponse.success) {
        setMessages(messagesResponse.messages);
      }
    } catch (err: any) {
      console.error('Failed to load thread data:', err);
      setError('Failed to load chat thread');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-4">
            Please log in to view chat threads
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading chat thread...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/chat')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Data Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Data Analysis
          </button>
        </div>
        
        {thread && (
          <div className="bg-white border rounded-lg p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {thread.title}
            </h1>
            <div className="text-sm text-gray-600">
              Created: {new Date(thread.created_at).toLocaleString()} • 
              {thread.message_count} messages
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-600">No messages in this thread yet</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-3xl p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center mb-2">
                  <span className="font-medium">
                    {message.role === 'user' ? 'You' : 'QuokkaAI'}
                  </span>
                  <span className="text-xs opacity-75 ml-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Simple note about functionality */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <div className="text-yellow-600 mr-2">💡</div>
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> This is a basic chat viewer. Full chat functionality 
            with message sending will be implemented in future updates. For now, you can 
            view the analysis thread created when you uploaded your data file.
          </div>
        </div>
      </div>
    </div>
  );
}; 