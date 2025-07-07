import React, { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../api/chatAPI';
import { documentsAPI } from '../api/documentsAPI';
import { RechartsVisualization } from './RechartsVisualization';
import { LoadingDots } from './LoadingSpinner';
import { useToast } from './Toast';
import { DocumentContextWindow } from './DocumentContextWindow';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { Send, Upload, FileText, Bot, User, Sparkles } from 'lucide-react';
import type { UserDocument } from '../api/documentsAPI';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  visualization?: any;
  analysis?: string;
  metadata?: any;
}

interface ChatInterfaceProps {
  threadId?: string;
  onThreadCreated?: (threadId: string) => void;
  onNewChat?: () => void;
  selectedDocuments?: UserDocument[];
  initialContextOpen?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  threadId,
  onThreadCreated,
  selectedDocuments = [],
  initialContextOpen = false
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [contextWindowOpen, setContextWindowOpen] = useState(initialContextOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Initialize with welcome message when no thread is selected
  useEffect(() => {
    if (!threadId && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: "Hello! I'm your AI data analysis assistant. Upload a file or ask me anything about data analysis, and I'll help you create visualizations and insights!",
        timestamp: new Date()
      }]);
      setCurrentThreadId(null);
    }
  }, [threadId, messages.length]);

  // Load thread context when threadId changes
  useEffect(() => {
    if (threadId && threadId !== currentThreadId) {
      loadThreadContext(threadId);
      setCurrentThreadId(threadId);
    } else if (!threadId && currentThreadId) {
      // Reset to new thread
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: "Hello! I'm your AI data analysis assistant. Upload a file or ask me anything about data analysis, and I'll help you create visualizations and insights!",
        timestamp: new Date()
      }]);
      setCurrentThreadId(null);
    }
  }, [threadId, currentThreadId]);

  const loadThreadContext = async (threadId: string) => {
    try {
      setIsLoading(true);
      const response = await chatAPI.getThreadContext(threadId);
      
      if (response.success && response.messages) {
        const threadMessages: Message[] = response.messages.map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          visualization: msg.metadata?.visualization,
          analysis: msg.metadata?.analysis,
          metadata: msg.metadata
        }));
        
        setMessages(threadMessages);
        showToast('Thread loaded successfully', 'success');
      } else {
        showToast('Failed to load thread context', 'error');
        console.error('Failed to load thread context:', response);
      }
    } catch (error) {
      console.error('Error loading thread context:', error);
      showToast('Error loading thread context', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewThread = async (firstMessage: string) => {
    try {
      console.log('Creating new thread with message:', firstMessage);
      const response = await chatAPI.createThread({
        first_message: firstMessage,
        selected_documents: []
      });
      
      console.log('Create thread response:', response);
      
      if (response.success && response.thread) {
        setCurrentThreadId(response.thread.id);
        if (onThreadCreated) {
          onThreadCreated(response.thread.id);
        }
        showToast('New thread created', 'success');
        return response.thread.id;
      } else {
        throw new Error(response.message || 'Failed to create thread');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      showToast('Failed to create thread', 'error');
      return null;
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!content.trim() && !file) return;

    let messageContent = content;
    let uploadedDocumentId: string | null = null;
    
    // If file is provided, upload it first
    if (file) {
      messageContent = `Проанализируй загруженный файл: ${file.name}`;
      
      // Add user message about file upload
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `📁 Загружаю файл: ${file.name}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Upload file to documents
        const uploadResponse = await documentsAPI.uploadDocument(file);
        if (uploadResponse.success && uploadResponse.document) {
          uploadedDocumentId = uploadResponse.document.id;
          showToast(`Файл ${file.name} загружен успешно!`, 'success');
          
          // Update message to show successful upload
          const uploadSuccessMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `✅ Файл ${file.name} загружен! Создаю визуализацию...`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, uploadSuccessMessage]);
        } else {
          throw new Error('Failed to upload file');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Ошибка загрузки файла', 'error');
        setIsLoading(false);
        return;
      }
    } else {
      // Regular text message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: messageContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
    }

    setInputValue('');
    setIsLoading(true);

    try {
      let useThreadId = currentThreadId;
      
      // Create new thread if we don't have one
      if (!useThreadId) {
        useThreadId = await createNewThread(messageContent);
        if (!useThreadId) {
          throw new Error('Failed to create thread');
        }
      }

      // Send message to backend
      const response = await chatAPI.sendMessage(useThreadId, {
        content: messageContent,
        selected_documents: uploadedDocumentId ? [uploadedDocumentId] : []
      });

      if (response.success && response.assistant_message) {
        const assistantMessage: Message = {
          id: response.assistant_message.id || Date.now().toString(),
          type: 'assistant',
          content: response.assistant_message.content || '',
          timestamp: new Date(response.assistant_message.timestamp || Date.now()),
          visualization: response.assistant_message.metadata?.visualization,
          analysis: response.assistant_message.metadata?.analysis,
          metadata: response.assistant_message.metadata
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        showToast('Message sent successfully', 'success');
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleSendMessage(inputValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (file: File) => {
    handleSendMessage('', file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">QuokkaAI</h1>
              <p className="text-sm text-gray-500">Data Analysis Assistant</p>
            </div>
          </div>
          
          {selectedDocuments.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContextWindowOpen(!contextWindowOpen)}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>{selectedDocuments.length} files</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start space-x-4",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'assistant' && (
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[80%] space-y-2",
                message.type === 'user' ? 'order-first' : ''
              )}>
                <Card className={cn(
                  "shadow-sm",
                  message.type === 'user' 
                    ? 'bg-gray-900 text-white border-gray-800' 
                    : 'bg-white border-gray-200'
                )}>
                  <CardContent className="p-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    
                    {message.visualization && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <RechartsVisualization 
                          chartConfig={message.visualization}
                        />
                      </div>
                    )}
                    
                    {message.analysis && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-200">
                        <p className="text-sm text-blue-800">{message.analysis}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <div className={cn(
                  "flex items-center space-x-2 text-xs text-gray-500",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}>
                  <span>{formatTime(message.timestamp)}</span>
                </div>
              </div>
              
              {message.type === 'user' && (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <LoadingDots />
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div 
        className={cn(
          "border-t border-gray-100 px-6 py-4 bg-white",
          dragActive && "bg-blue-50 border-blue-200"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your data..."
                className="min-h-[44px] max-h-32 resize-none border-gray-200 focus:border-gray-300 focus:ring-0"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="h-11 w-11"
              >
                <Upload className="w-4 h-4" />
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-11 w-11 bg-black hover:bg-gray-800"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json,.txt,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
            className="hidden"
          />
          
          {dragActive && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-blue-700">Drop your file here</p>
                <p className="text-sm text-blue-600">Supports CSV, Excel, JSON, TXT, PDF</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Window */}
      {contextWindowOpen && (
        <DocumentContextWindow
          documents={selectedDocuments}
          isOpen={contextWindowOpen}
          onClose={() => setContextWindowOpen(false)}
          onToggle={() => setContextWindowOpen(!contextWindowOpen)}
        />
      )}
    </div>
  );
}; 