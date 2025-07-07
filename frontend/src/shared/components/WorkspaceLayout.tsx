import React, { useState, useEffect } from 'react';
import { ProfileDropdown } from './ProfileDropdown';
import { LoadingDots } from './LoadingSpinner';
import type { ChatThread } from '../api/chatAPI';
import { documentsAPI } from '../api/documentsAPI';
import type { UserDocument } from '../api/documentsAPI';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { 
  Plus, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  Clock, 
  Trash2, 
  Menu, 
  X,
  Sparkles 
} from 'lucide-react';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  threads: ChatThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => Promise<void>;
  isLoading?: boolean;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  threads,
  selectedThreadId,
  onThreadSelect,
  onNewChat,
  onDeleteThread,
  isLoading = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await documentsAPI.getUserDocuments();
      if (response.success) {
        setDocuments(response.documents);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleNewChat = () => {
    onNewChat();
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      setDeletingThreadId(threadId);
      try {
        await onDeleteThread(threadId);
      } finally {
        setDeletingThreadId(null);
      }
    }
  };

  const formatThreadTitle = (thread: ChatThread) => {
    if (thread.title && thread.title.trim()) {
      return thread.title;
    }
    // Generate title from first message or creation date
    return `Chat ${new Date(thread.created_at).toLocaleDateString()}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case '.pdf':
        return FileText;
      case '.csv':
        return BarChart3;
      case '.xlsx':
      case '.xls':
        return BarChart3;
      case '.json':
        return FileText;
      case '.txt':
      case '.md':
        return FileText;
      default:
        return FileText;
    }
  };

  // Dashboard metrics
  const dashboardStats = {
    totalChats: threads.length,
    totalDocuments: documents.length,
    activeToday: threads.filter(t => {
      const today = new Date();
      const threadDate = new Date(t.updated_at);
      return threadDate.toDateString() === today.toDateString();
    }).length,
    totalAnalyses: threads.reduce((sum, t) => sum + (t.message_count || 0), 0)
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? 'w-16' : 'w-80'
      )}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-gray-900">QuokkaAI</span>
                  <div className="text-xs text-gray-500">Data Analysis Assistant</div>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        {!isCollapsed && (
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-gray-200">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Total Chats</div>
                  <div className="text-lg font-semibold text-gray-900">{dashboardStats.totalChats}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Documents</div>
                  <div className="text-lg font-semibold text-gray-900">{dashboardStats.totalDocuments}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Active Today</div>
                  <div className="text-lg font-semibold text-green-600">{dashboardStats.activeToday}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500 mb-1">Analyses</div>
                  <div className="text-lg font-semibold text-blue-600">{dashboardStats.totalAnalyses}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* New Chat Button */}
        <div className="p-6">
          <Button
            onClick={handleNewChat}
            disabled={isLoading}
            className={cn(
              "w-full bg-black hover:bg-gray-800 text-white",
              isCollapsed ? 'px-2' : ''
            )}
          >
            {isLoading ? (
              <LoadingDots />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {!isCollapsed && <span className="ml-2">New Analysis</span>}
              </>
            )}
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-6 py-2">
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Recent Analyses
                </h3>
                
                <div className="space-y-2">
                  {threads.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No analyses yet</p>
                      <p className="text-xs text-gray-400 mt-1">Create your first analysis to get started</p>
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <div
                        key={thread.id}
                        onClick={() => onThreadSelect(thread.id)}
                        className={cn(
                          "group relative p-3 rounded-lg cursor-pointer transition-all duration-200 border",
                          selectedThreadId === thread.id
                            ? 'bg-gray-50 border-gray-300'
                            : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {formatThreadTitle(thread)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(thread.updated_at).toLocaleDateString()}</span>
                              {thread.message_count && (
                                <span className="text-gray-400">• {thread.message_count} messages</span>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteThread(thread.id, e)}
                            disabled={deletingThreadId === thread.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-gray-400 hover:text-red-500"
                          >
                            {deletingThreadId === thread.id ? (
                              <LoadingDots />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Documents Section */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Documents
                </h3>
                
                {isLoadingDocuments ? (
                  <div className="text-center py-4">
                    <LoadingDots />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No documents yet</p>
                    <p className="text-xs text-gray-400 mt-1">Upload files to start analyzing</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.slice(0, 5).map((doc) => {
                      const IconComponent = getFileIcon(doc.file_type);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <IconComponent className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.file_size)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {documents.length > 5 && (
                      <p className="text-xs text-gray-500 text-center pt-2">
                        +{documents.length - 5} more files
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="border-t border-gray-100 p-4">
          <ProfileDropdown />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}; 