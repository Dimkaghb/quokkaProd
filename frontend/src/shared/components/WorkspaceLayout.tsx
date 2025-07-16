import React, { useState, useEffect } from 'react';
import { ProfileDropdown } from './ProfileDropdown';
import { LoadingDots } from './LoadingSpinner';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguageStore } from '../stores/languageStore';
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
  X
} from 'lucide-react';
import logo3 from '../../assets/logo3.png';

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
  const { t } = useLanguageStore();
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
            className="h-9 w-9"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
              <img 
                src={logo3} 
                alt="QuokkaAI Logo" 
                className="w-4 h-4 object-contain"
              />
            </div>
            <span className="font-semibold text-gray-900">quokkaAI</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <LanguageSwitcher variant="ghost" className="h-9 w-9 p-1" />
          </div>
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
                <img 
                  src={logo3} 
                  alt="QuokkaAI Logo" 
                  className="w-5 h-5 object-contain"
                />
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
                  <img 
                    src={logo3} 
                    alt="QuokkaAI Logo" 
                    className="w-6 h-6 object-contain"
                  />
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
          <div className={cn("border-b border-gray-100", isMobile ? "p-4" : "p-6")}>
            <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-2")}>
              <Card className="border-gray-200">
                <CardContent className={cn(isMobile ? "p-2.5" : "p-3")}>
                  <div className={cn("text-gray-500 mb-1", isMobile ? "text-xs" : "text-xs")}>{t('dashboard.totalChats')}</div>
                  <div className={cn("font-semibold text-gray-900", isMobile ? "text-base" : "text-lg")}>{dashboardStats.totalChats}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className={cn(isMobile ? "p-2.5" : "p-3")}>
                  <div className={cn("text-gray-500 mb-1", isMobile ? "text-xs" : "text-xs")}>{t('dashboard.documents')}</div>
                  <div className={cn("font-semibold text-gray-900", isMobile ? "text-base" : "text-lg")}>{dashboardStats.totalDocuments}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className={cn(isMobile ? "p-2.5" : "p-3")}>
                  <div className={cn("text-gray-500 mb-1", isMobile ? "text-xs" : "text-xs")}>{t('dashboard.activeToday')}</div>
                  <div className={cn("font-semibold text-green-600", isMobile ? "text-base" : "text-lg")}>{dashboardStats.activeToday}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className={cn(isMobile ? "p-2.5" : "p-3")}>
                  <div className={cn("text-gray-500 mb-1", isMobile ? "text-xs" : "text-xs")}>{t('dashboard.analyses')}</div>
                  <div className={cn("font-semibold text-blue-600", isMobile ? "text-base" : "text-lg")}>{dashboardStats.totalAnalyses}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* New Chat Button */}
        <div className={cn(isMobile ? "p-4" : "p-4", (!isCollapsed || isMobile) && !isMobile && "px-6")}>
          {isCollapsed && !isMobile ? (
            <div className="flex justify-center">
              <Button
                onClick={handleNewChat}
                disabled={isLoading}
                size="icon"
                className="w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-lg"
                title={t('dashboard.newAnalysis')}
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
              className={cn("w-full bg-black hover:bg-gray-800 text-white", isMobile ? "py-2.5" : "")}
            >
              {isLoading ? (
                <LoadingDots />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="ml-2">{t('dashboard.newAnalysis')}</span>
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
                  title={`${threads.length} ${t('sidebar.recentChats')}`}
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

                {/* Analytics Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 hover:bg-gray-100 rounded-lg"
                  title={`${dashboardStats.totalAnalyses} ${t('dashboard.analyses')}`}
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
            <div className={cn(isMobile ? "px-4 py-2" : "px-6 py-2")}>
              <div className={cn(isMobile ? "mb-4" : "mb-6")}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {t('sidebar.recentChats')}
                </h3>
                
                <div className={cn(isMobile ? "space-y-1.5" : "space-y-2")}>
                  {threads.length === 0 ? (
                    <div className={cn("text-center", isMobile ? "py-6" : "py-8")}>
                      <MessageSquare className={cn("text-gray-300 mx-auto mb-3", isMobile ? "w-6 h-6" : "w-8 h-8")} />
                      <p className={cn("text-gray-500", isMobile ? "text-xs" : "text-sm")}>No analyses yet</p>
                      <p className={cn("text-gray-400 mt-1", isMobile ? "text-xs" : "text-xs")}>Create your first analysis to get started</p>
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <div
                        key={thread.id}
                        onClick={() => handleThreadSelect(thread.id)}
                        className={cn(
                          "group relative rounded-lg cursor-pointer transition-all duration-200 border touch-manipulation",
                          isMobile ? "p-2.5" : "p-3",
                          selectedThreadId === thread.id
                            ? 'bg-gray-50 border-gray-300'
                            : 'hover:bg-gray-50 border-transparent hover:border-gray-200 active:bg-gray-100'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className={cn("flex items-center space-x-2", isMobile ? "mb-0.5" : "mb-1")}>
                              <MessageSquare className={cn("text-gray-400 flex-shrink-0", isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                              <p className={cn("font-medium text-gray-900 truncate", isMobile ? "text-xs" : "text-sm")}>
                                {formatThreadTitle(thread)}
                              </p>
                            </div>
                            <div className={cn("flex items-center space-x-2 text-gray-500", isMobile ? "text-xs" : "text-xs")}>
                              <Clock className={cn(isMobile ? "w-3 h-3" : "w-3 h-3")} />
                              <span>{new Date(thread.updated_at).toLocaleDateString()}</span>
                              {thread.message_count && !isMobile && (
                                <span className="text-gray-400">• {thread.message_count} messages</span>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteThread(thread.id, e)}
                            disabled={deletingThreadId === thread.id}
                            className={cn(
                              "opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 touch-manipulation",
                              isMobile ? "h-7 w-7" : "h-8 w-8"
                            )}
                          >
                            {deletingThreadId === thread.id ? (
                              <LoadingDots />
                            ) : (
                              <Trash2 className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Documents Section */}
              <div className={cn(isMobile ? "mb-4" : "mb-6")}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {t('dashboard.documents')}
                </h3>
                
                {isLoadingDocuments ? (
                  <div className={cn("text-center", isMobile ? "py-3" : "py-4")}>
                    <LoadingDots />
                  </div>
                ) : documents.length === 0 ? (
                  <div className={cn("text-center", isMobile ? "py-6" : "py-8")}>
                    <FileText className={cn("text-gray-300 mx-auto mb-3", isMobile ? "w-6 h-6" : "w-8 h-8")} />
                    <p className={cn("text-gray-500", isMobile ? "text-xs" : "text-sm")}>No documents yet</p>
                    <p className={cn("text-gray-400 mt-1", isMobile ? "text-xs" : "text-xs")}>Upload files to start analyzing</p>
                  </div>
                ) : (
                  <div className={cn(isMobile ? "space-y-1.5" : "space-y-2")}>
                    {documents.slice(0, 5).map((doc) => {
                      const IconComponent = getFileIcon(doc.file_type);
                      return (
                        <div
                          key={doc.id}
                          className={cn(
                            "flex items-center space-x-3 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation",
                            isMobile ? "p-2" : "p-2"
                          )}
                        >
                          <IconComponent className={cn("text-gray-400 flex-shrink-0", isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium text-gray-900 truncate", isMobile ? "text-xs" : "text-sm")}>
                              {doc.original_filename}
                            </p>
                            <p className={cn("text-gray-500", isMobile ? "text-xs" : "text-xs")}>
                              {formatFileSize(doc.file_size)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {documents.length > 5 && (
                      <p className={cn("text-gray-500 text-center", isMobile ? "text-xs pt-1" : "text-xs pt-2")}>
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
          isCollapsed && !isMobile ? "p-3 flex justify-center" : isMobile ? "p-3" : "p-4"
        )}>
          <ProfileDropdown isCollapsed={isCollapsed && !isMobile} />
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