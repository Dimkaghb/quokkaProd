import React, { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../api/chatAPI';
import { documentsAPI } from '../api/documentsAPI';
import { RechartsVisualization } from './RechartsVisualization';
import { LoadingDots } from './LoadingSpinner';
import { useToast } from './Toast';
import { DocumentContextWindow } from './DocumentContextWindow';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguageStore } from '../stores/languageStore';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

import { Send, Upload, FileText, Paperclip } from 'lucide-react';
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
  threadTitle?: string;
  onThreadCreated?: (threadId: string) => void;
  onNewChat?: () => void;
  selectedDocuments?: UserDocument[];
  initialContextOpen?: boolean;
  onDocumentsUpdate?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  threadId,
  threadTitle,
  onThreadCreated,
  selectedDocuments = [],
  initialContextOpen = false,
  onDocumentsUpdate
}) => {
  const { t } = useLanguageStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [contextWindowOpen, setContextWindowOpen] = useState(initialContextOpen);
  const [isMobile, setIsMobile] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea with mobile considerations
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = isMobile ? 120 : 160; // Smaller max height on mobile
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue, isMobile]);

  // Handle mobile keyboard appearance
  useEffect(() => {
    if (isMobile && isInputFocused) {
      // Small delay to ensure keyboard is shown
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    }
  }, [isInputFocused, isMobile]);

  // Initialize with welcome message when no thread is selected
  useEffect(() => {
    if (!threadId && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: t('chat.welcome'),
        timestamp: new Date()
      }]);
      setCurrentThreadId(null);
    }
  }, [threadId, messages.length, t]);

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
        content: t('chat.welcome'),
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
        // showToast(t('chat.threadLoaded'), 'success'); // Removed annoying toast
      } else {
        showToast(t('chat.threadLoadError'), 'error');
        console.error('Failed to load thread context:', response);
      }
    } catch (error) {
      console.error('Error loading thread context:', error);
      showToast(t('chat.threadLoadError'), 'error');
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
        // showToast(t('chat.threadCreated'), 'success'); // Removed annoying toast
        return response.thread.id;
      } else {
        throw new Error(response.message || 'Failed to create thread');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      showToast(t('chat.threadCreateError'), 'error');
      return null;
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!content.trim() && !file) return;

    let messageContent = content;
    let uploadedDocumentId: string | null = null;
    
    // If file is provided, upload it first
    if (file) {
      messageContent = t('chat.analyzeFile', { fileName: file.name });
      
      // Add user message about file upload
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `📁 ${t('chat.uploadingFile', { fileName: file.name })}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Upload file to documents
        const uploadResponse = await documentsAPI.uploadDocument(file);
        if (uploadResponse.success && uploadResponse.document) {
          uploadedDocumentId = uploadResponse.document.id;
          showToast(t('chat.fileUploaded', { fileName: file.name }), 'success');
          
          // Update message to show successful upload
          const uploadSuccessMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: t('chat.fileUploadedCreatingViz', { fileName: file.name }),
            timestamp: new Date()
          };
          setMessages(prev => [...prev, uploadSuccessMessage]);
        } else {
          throw new Error('Failed to upload file');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        showToast(t('chat.fileUploadError'), 'error');
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
        // showToast(t('chat.messageSent'), 'success'); // Removed annoying toast
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast(t('chat.messageSendError'), 'error');
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: t('chat.errorMessage'),
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
      {/* Fixed Docs Button - Top Right */}
      {selectedDocuments.length > 0 && (
        <button
          onClick={() => setContextWindowOpen(!contextWindowOpen)}
          className={cn(
            "fixed z-50 flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 shadow-lg",
            isMobile ? "top-20 right-4" : "top-4 right-4", // Adjust position on mobile to avoid header overlap
            contextWindowOpen 
              ? "bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200" 
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          )}
          title={contextWindowOpen ? t('chat.closeDocuments') : t('chat.showDocuments')}
        >
          <FileText className="w-3 h-3" />
          <span className="text-xs font-medium">{selectedDocuments.length} {t('chat.files')}</span>
        </button>
      )}

      {/* Header - Hidden on mobile since we have the mobile header in WorkspaceLayout */}
      {!isMobile && threadTitle && (
        <div className="border-b border-gray-100 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-gray-900">{threadTitle}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ 
          paddingBottom: isMobile ? '120px' : '0px' // Extra padding for mobile keyboard
        }}
      >
        <div className={cn(
          "max-w-4xl mx-auto space-y-4",
          isMobile ? "px-3 py-4" : "px-6 py-6"
        )}>
          {messages.map((message) => (
            <div
              key={message.id}
              className="space-y-3"
            >
              {/* Message Content */}
              <div className={cn(
                "w-full",
                message.type === 'user' ? 'flex justify-end' : 'flex justify-start'
              )}>
                <div className={cn(
                  "max-w-none w-full",
                  message.type === 'user' ? 'bg-gray-50 border border-gray-200' : 'bg-white',
                  "rounded-lg"
                )}>
                  <div className={cn(
                    isMobile ? "p-3" : "p-4"
                  )}>
                    <div className="prose prose-sm max-w-none">
                      <p className={cn(
                        "whitespace-pre-wrap leading-relaxed text-gray-900",
                        isMobile ? "text-sm" : "text-sm"
                      )}>
                        {message.content}
                      </p>
                    </div>
                    
                    {message.visualization && (
                      <div className={cn(
                        "mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100",
                        isMobile && "p-2"
                      )}>
                        <RechartsVisualization 
                          chartConfig={message.visualization}
                        />
                      </div>
                    )}
                    
                    {message.analysis && (
                      <div className={cn(
                        "mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100",
                        isMobile && "p-2"
                      )}>
                        <p className="text-xs text-blue-800 leading-relaxed">{message.analysis}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Timestamp */}
              <div className={cn(
                "flex items-center text-xs text-gray-400",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}>
                <span>{formatTime(message.timestamp)}</span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="space-y-3">
              <div className="w-full bg-white rounded-lg">
                <div className={cn(
                  isMobile ? "p-4" : "p-6"
                )}>
                  <LoadingDots />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div 
        className={cn(
          "border-t border-gray-100 bg-white flex-shrink-0",
          isMobile ? [
            "fixed bottom-0 left-0 right-0 z-40",
            "px-3 py-3",
            "border-t border-gray-200"
          ] : [
            "px-6 py-4"
          ],
          dragActive && "bg-blue-50 border-blue-200"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={cn(
          "mx-auto",
          !isMobile && "max-w-4xl"
        )}>
          <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder={t('chat.typeMessage')}
                className={cn(
                  "resize-none border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-200 rounded-lg",
                  isMobile ? [
                    "min-h-[40px] max-h-[100px]",
                    "text-sm px-3 py-2", // Prevent zoom on iOS
                  ] : [
                    "min-h-[44px] max-h-[120px] px-3 py-2 text-sm"
                  ]
                )}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex space-x-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className={cn(
                  "h-10 w-10 border-gray-200 hover:bg-gray-50",
                  isMobile && "touch-manipulation"
                )}
              >
                {isMobile ? (
                  <Paperclip className="w-3 h-3" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={cn(
                  "h-10 w-10 bg-black hover:bg-gray-800 text-white rounded-lg",
                  "touch-manipulation"
                )}
              >
                {isLoading ? (
                  <LoadingDots />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,.txt,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelect(file);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Context Window */}
      <DocumentContextWindow
        documents={selectedDocuments}
        isOpen={contextWindowOpen}
        onClose={() => setContextWindowOpen(false)}
        onDocumentsUpdate={onDocumentsUpdate}
      />
    </div>
  );
}; 