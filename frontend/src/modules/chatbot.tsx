import React, { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../shared/stores/authStore';
import { useChatStore, type Message, type UploadedFile } from '../shared/stores/chatStore';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const chatAPI = axios.create({
  baseURL: `${API_BASE_URL}/agents`,
  timeout: 60000, // 60 second timeout for agent responses
});

// Add auth interceptor
chatAPI.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const Chatbot: React.FC = () => {
  const { user, token } = useAuthStore();
  const {
    // Chat state
    messages,
    sessionId,
    isLoading,
    isTyping,
    error,
    
    // File state
    uploadedFiles,
    isUploading,
    
    // UI state
    showIntermediateSteps,
    showFileManager,
    
    // Actions
    addMessage,
    updateMessage,
    clearMessages,
    setLoading,
    setTyping,
    setError,
    
    // File actions
    addUploadedFile,
    removeUploadedFile,
    setUploadedFiles,
    setUploading,
    
    // UI actions
    setShowIntermediateSteps,
    setShowFileManager,
    
    // Session actions
    initializeChat
  } = useChatStore();

  const [inputMessage, setInputMessage] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize chat on component mount
  useEffect(() => {
    initializeChat();
    loadUploadedFiles();
  }, [initializeChat]);

  // Load uploaded files from backend
  const loadUploadedFiles = async () => {
    if (!token) return;
    
    try {
      const response = await chatAPI.get('/files');
      const files = response.data.files || [];
      setUploadedFiles(files);
      
      // Sync with backend by adding files to conversation memory
      if (files.length > 0) {
        for (const file of files) {
          await syncFileWithBackend(file);
        }
      }
    } catch (err) {
      console.error('Failed to load uploaded files:', err);
    }
  };

  // Sync uploaded file with backend conversation memory
  const syncFileWithBackend = async (file: UploadedFile) => {
    try {
      await chatAPI.post('/sync-file', {
        filename: file.filename,
        metadata: {
          file_type: file.file_type,
          size: file.size,
          chunks_count: file.chunks_count,
          summary: file.summary,
          upload_status: 'success'
        }
      });
    } catch (err) {
      console.error('Failed to sync file with backend:', err);
    }
  };

  // Send message to agent
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      status: 'sent'
    };

    addMessage(userMessage);
    setInputMessage('');
    setLoading(true);
    setTyping(true);
    setError(null);

    try {
      const response = await chatAPI.post('/chat', {
        message: content.trim(),
        user_id: user?.id,
        session_id: sessionId
      });

      const agentMessage: Message = {
        id: crypto.randomUUID(),
        type: 'agent',
        content: response.data.response,
        timestamp: new Date(response.data.timestamp),
        status: 'sent',
        intermediateSteps: response.data.intermediate_steps
      };

      addMessage(agentMessage);

    } catch (err: any) {
      console.error('Chat error:', err);
      
      let errorMessage = 'Sorry, I encountered an error processing your request.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Please log in to continue chatting.';
      } else if (err.response?.status === 500) {
        errorMessage = 'I\'m experiencing technical difficulties. Please try again in a moment.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try a simpler query or try again later.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      const errorAgentMessage: Message = {
        id: crypto.randomUUID(),
        type: 'agent',
        content: errorMessage,
        timestamp: new Date(),
        status: 'error',
        error: err.message
      };

      addMessage(errorAgentMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Add file message to chat
    const fileMessage: Message = {
      id: crypto.randomUUID(),
      type: 'file',
      content: `Uploading file: ${file.name}`,
      timestamp: new Date(),
      status: 'sending',
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };
    
    addMessage(fileMessage);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await chatAPI.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update file message with success
      updateMessage(fileMessage.id, {
        content: `✅ File uploaded successfully: ${file.name}\n\n📊 **Summary:** ${response.data.summary}\n\n**File Type:** ${response.data.file_type}\n**Size:** ${response.data.size}\n**Chunks:** ${response.data.chunks}`,
        status: 'sent'
      });

      // Add to uploaded files store
      const uploadedFile: UploadedFile = {
        filename: response.data.filename,
        file_type: response.data.file_type,
        size: response.data.size,
        processed_at: response.data.timestamp,
        chunks_count: response.data.chunks,
        summary: response.data.summary
      };
      
      addUploadedFile(uploadedFile);

    } catch (err: any) {
      console.error('File upload failed:', err);
      
      let errorMessage = 'File upload failed.';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.status === 413) {
        errorMessage = 'File too large. Maximum size is 50MB.';
      }

      // Update file message with error
      updateMessage(fileMessage.id, {
        content: `❌ ${errorMessage}`,
        status: 'error'
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete file handler
  const handleDeleteFile = async (filename: string) => {
    try {
      await chatAPI.delete(`/files/${filename}`);
      removeUploadedFile(filename);
      
      // Add system message
      const deleteMessage: Message = {
        id: crypto.randomUUID(),
        type: 'system',
        content: `🗑️ File "${filename}" deleted successfully.`,
        timestamp: new Date(),
        status: 'sent'
      };
      addMessage(deleteMessage);
      
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Clear conversation
  const handleClearConversation = async () => {
    try {
      await chatAPI.delete('/conversation/history');
      clearMessages();
      setError(null);
      
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  };

  // Format message content with markdown support
  const formatMessageContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  // Quick action buttons
  const quickActions = [
    "What are the latest AI trends in 2024?",
    "Show me statistics about renewable energy adoption", 
    "Find recent market data for tech stocks",
    "Analyze current inflation rates globally"
  ];

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-lg">🐨</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">QuokkaAI Assistant</h1>
            <p className="text-sm text-gray-400">
              {user ? `Chatting as ${user.name}` : 'Anonymous session'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:bg-gray-600"
          >
            {isUploading ? 'Uploading...' : '📁 Upload File'}
          </button>
          <button
            onClick={() => setShowFileManager(!showFileManager)}
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
          >
            📂 Files ({uploadedFiles.length})
          </button>
          <button
            onClick={() => setShowIntermediateSteps(!showIntermediateSteps)}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            {showIntermediateSteps ? 'Hide' : 'Show'} Reasoning
          </button>
          <button
            onClick={handleClearConversation}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* File Manager Panel */}
      {showFileManager && (
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-white">📂 Uploaded Files</h3>
            <button
              onClick={() => setShowFileManager(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {uploadedFiles.length === 0 ? (
            <p className="text-gray-400 text-sm">No files uploaded yet. Upload files to analyze your data!</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <div key={file.filename} className="flex items-center justify-between bg-gray-800 p-3 rounded border border-gray-700">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">{file.filename}</span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{file.file_type}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {Math.round(file.size / 1024)} KB • {file.chunks_count} chunks • {new Date(file.processed_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-300 mt-1 line-clamp-2">{file.summary}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.filename)}
                    className="ml-3 text-red-400 hover:text-red-300 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'system'
                  ? 'bg-green-900/30 text-green-300 border border-green-700'
                  : message.type === 'file'
                  ? 'bg-blue-900/30 text-blue-300 border border-blue-700'
                  : message.status === 'error'
                  ? 'bg-red-900/30 text-red-300 border border-red-700'
                  : 'bg-gray-900/50 text-gray-100 border border-gray-700'
              }`}
            >
              <div
                className="prose prose-sm max-w-none prose-invert"
                dangerouslySetInnerHTML={{
                  __html: formatMessageContent(message.content)
                }}
              />
              
              {/* Show intermediate steps if enabled and available */}
              {showIntermediateSteps && message.intermediateSteps && message.intermediateSteps.length > 0 && (
                <details className="mt-3 text-xs opacity-75">
                  <summary className="cursor-pointer hover:opacity-100">
                    🔍 View Reasoning Steps ({message.intermediateSteps.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {message.intermediateSteps.map((step, index) => (
                      <div key={index} className="bg-gray-800 p-2 rounded border-l-2 border-blue-500">
                        <pre className="whitespace-pre-wrap text-xs text-gray-300">{JSON.stringify(step, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              
              <div className="text-xs opacity-60 mt-2">
                {message.timestamp.toLocaleTimeString()}
                {message.status === 'error' && ' • Error'}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">QuokkaAI is thinking...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="px-6 py-2">
          <div className="text-sm text-gray-400 mb-2">💡 Try these examples:</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => sendMessage(action)}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 rounded-full border border-blue-700 transition-colors disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
          
          {/* File Upload Suggestion */}
          <div className="mt-3 p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-700">
            <div className="text-sm text-purple-300 font-medium mb-1">📊 Advanced Data Analysis</div>
            <div className="text-xs text-purple-400">
              Upload CSV, Excel, PDF, or text files to get detailed statistical analysis, predictions, and insights!
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-2 px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : '📁 Upload Your Data'}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-6 py-2">
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-md text-sm">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-gray-900/50 border-t border-gray-800 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything about data, statistics, or current events..."
            disabled={isLoading}
            className="flex-1 border border-gray-700 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-700 disabled:cursor-not-allowed placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </form>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          QuokkaAI can search the web, analyze data, and provide insights. Always verify important information.
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,.txt,.json,.md"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
