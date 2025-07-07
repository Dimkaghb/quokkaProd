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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-collapse sidebar on mobile
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen && isMobile) {
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen, isMobile]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, isMobile]);

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
    // Close mobile menu after action
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    onThreadSelect(threadId);
    // Close mobile menu after selection
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
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
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="h-10 w-10"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-gray-900">QuokkaAI</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="h-10 w-10"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity" />
      )}

      {/* Sidebar */}
      <div 
        id="mobile-sidebar"
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0",
          // Desktop behavior
          !isMobile && (isCollapsed ? 'w-20' : 'w-80'),
          // Mobile behavior
          isMobile && [
            'fixed inset-y-0 left-0 z-50 w-80 transform transition-transform',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          ]
        )}
      >
        {/* Header */}
        <div className={cn(
          "border-b border-gray-100 flex items-center justify-center",
          isCollapsed && !isMobile ? "p-4" : "p-6",
          isMobile && "pt-16" // Account for mobile header
        )}>
          {isCollapsed && !isMobile ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 hover:bg-gray-100"
              >
                <Menu className="w-4 h-4 text-gray-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-gray-900">QuokkaAI</span>
                  <div className="text-xs text-gray-500">Data Analysis Assistant</div>
                </div>
              </div>
              {isMobile ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="h-8 w-8 hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-8 w-8 hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dashboard Stats */}
        {(!isCollapsed || isMobile) && (
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
        <div className={cn("p-4", (!isCollapsed || isMobile) && "px-6")}>
          {isCollapsed && !isMobile ? (
            <div className="flex justify-center">
              <Button
                onClick={handleNewChat}
                disabled={isLoading}
                size="icon"
                className="w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-lg"
                title="New Analysis"
              >
                {isLoading ? (
                  <LoadingDots />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleNewChat}
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              {isLoading ? (
                <LoadingDots />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="ml-2">New Analysis</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {isCollapsed && !isMobile ? (
            <div className="flex flex-col items-center space-y-4 p-4">
              {/* Collapsed Navigation Icons */}
              <div className="flex flex-col items-center space-y-3">
                {/* Recent Chats Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 hover:bg-gray-100 rounded-lg"
                  title={`${threads.length} Recent Analyses`}
                >
                  <div className="relative">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    {threads.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {threads.length > 9 ? '9+' : threads.length}
                      </span>
                    )}
                  </div>
                </Button>

                {/* Documents Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 hover:bg-gray-100 rounded-lg"
                  title={`${documents.length} Documents`}
                >
                  <div className="relative">
                    <FileText className="w-5 h-5 text-gray-600" />
                    {documents.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                        {documents.length > 9 ? '9+' : documents.length}
                      </span>
                    )}
                  </div>
                </Button>

                {/* Analytics Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 hover:bg-gray-100 rounded-lg"
                  title={`${dashboardStats.totalAnalyses} Total Analyses`}
                >
                  <div className="relative">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                    {dashboardStats.activeToday > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                    )}
                  </div>
                </Button>
              </div>

              {/* Recent Thread Indicators */}
              {threads.slice(0, 3).map((thread) => (
                <Button
                  key={thread.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => handleThreadSelect(thread.id)}
                  className={cn(
                    "w-8 h-8 hover:bg-gray-100 rounded-lg",
                    selectedThreadId === thread.id && "bg-gray-100 ring-2 ring-gray-300"
                  )}
                  title={formatThreadTitle(thread)}
                >
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </Button>
              ))}
            </div>
          ) : (
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
                        onClick={() => handleThreadSelect(thread.id)}
                        className={cn(
                          "group relative p-3 rounded-lg cursor-pointer transition-all duration-200 border touch-manipulation",
                          selectedThreadId === thread.id
                            ? 'bg-gray-50 border-gray-300'
                            : 'hover:bg-gray-50 border-transparent hover:border-gray-200 active:bg-gray-100'
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
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-gray-400 hover:text-red-500 touch-manipulation"
                          >
                            {deletingThreadId === thread.id ? (
                              <LoadingDots />
                            ) : (
                              <Trash2 className="w-4 h-4" />
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
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation"
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
        <div className={cn(
          "border-t border-gray-100",
          isCollapsed && !isMobile ? "p-3 flex justify-center" : "p-4"
        )}>
          {isCollapsed && !isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 hover:bg-gray-100 rounded-lg"
              title="User Profile"
            >
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">U</span>
              </div>
            </Button>
          ) : (
            <ProfileDropdown />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        isMobile && "pt-16" // Account for mobile header
      )}>
        {children}
      </div>
    </div>
  );
}; 