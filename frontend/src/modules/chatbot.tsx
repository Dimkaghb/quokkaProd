import React, { useState, useEffect } from 'react';
import { WorkspaceLayout } from '../shared/components/WorkspaceLayout';
import { ChatInterface } from '../shared/components/ChatInterface';
import { StartWorkInterface } from '../shared/components/StartWorkInterface';
import { DocumentSelectionModal } from '../shared/components/DocumentSelectionModal';
import { useThreadStore } from '../shared/stores/threadStore';
import { useToast } from '../shared/components/Toast';
import type { UserDocument } from '../shared/api/documentsAPI';
import { chatAPI } from '../shared/api/chatAPI';

export const Chatbot: React.FC = () => {
  const {
    threads, 
    selectedThreadId, 
    currentThread,
    setSelectedThread, 
    loadUserThreads, 
    deleteThread,
    clearSelectedThread,
    loadDocuments
  } = useThreadStore();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');
  const [currentDocuments, setCurrentDocuments] = useState<UserDocument[]>([]);
  const [showContextWindow, setShowContextWindow] = useState(false);

  // Load user threads on component mount
  useEffect(() => {
    loadUserThreads();
  }, [loadUserThreads]);

  const handleThreadCreated = (threadId: string) => {
    // Reload threads to include the new one
    loadUserThreads();
    // Select the new thread
    setSelectedThread(threadId);
    // showToast('New analysis created successfully', 'success'); // Removed annoying toast
  };

  const handleThreadSelect = async (threadId: string) => {
    setSelectedThread(threadId);
    
    // Fetch thread documents when a thread is selected
    try {
      const response = await chatAPI.getThreadDocuments(threadId);
      if (response.success) {
        setCurrentDocuments(response.documents);
        // Don't automatically show context window - let user open it manually
        setShowContextWindow(false);
      }
    } catch (error) {
      console.error('Error fetching thread documents:', error);
      setCurrentDocuments([]);
    }
  };

  const handleStartWork = (query?: string) => {
    setInitialQuery(query || '');
    setShowDocumentModal(true);
  };

  const handleDocumentSelectionConfirm = async (selectedDocuments: UserDocument[], query?: string) => {
    setShowDocumentModal(false);
    
    try {
      setIsLoading(true);
      
      // Create thread with selected documents
      const documentIds = selectedDocuments.map(doc => doc.id);
      const firstMessage = query || 'Hello! I\'m ready to analyze the selected documents.';
      
      const response = await chatAPI.createThread({
        first_message: firstMessage,
        selected_documents: documentIds
      });
      
      if (response.success && response.thread) {
        // Load threads to update the sidebar
        await loadUserThreads();
        // Select the new thread
        setSelectedThread(response.thread.id);
        // Store current documents
        setCurrentDocuments(selectedDocuments);
        // Don't automatically show context window - let user open it manually
        setShowContextWindow(false);
        // showToast(`New analysis created with ${selectedDocuments.length} documents`, 'success'); // Removed annoying toast
      } else {
        showToast('Failed to create analysis thread', 'error');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      showToast('Error creating analysis thread', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // Clear selected thread to start a new chat
    clearSelectedThread();
    showToast('Starting new analysis', 'info');
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      setIsLoading(true);
      await deleteThread(threadId);
      showToast('Analysis deleted successfully', 'success');
      
      // If we deleted the currently selected thread, clear selection
      if (selectedThreadId === threadId) {
        clearSelectedThread();
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      showToast('Failed to delete analysis', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const MainContent = () => {
    if (selectedThreadId) {
      // Generate thread title from current thread or fallback
      const threadTitle = currentThread?.title || 
        (currentThread ? `Chat ${new Date(currentThread.created_at).toLocaleDateString()}` : 'New Chat');
      
      return (
        <ChatInterface
          threadId={selectedThreadId}
          threadTitle={threadTitle}
          selectedDocuments={currentDocuments}
          initialContextOpen={showContextWindow}
          onThreadCreated={handleThreadCreated}
          onNewChat={handleNewChat}
          onDocumentsUpdate={loadDocuments}
        />
      );
    }

    // Show StartWorkInterface when no thread is selected
    return <StartWorkInterface onStartWork={handleStartWork} />;
  };

  return (
    <div className="bg-gray-950 min-h-screen">
      <WorkspaceLayout
        threads={threads}
        selectedThreadId={selectedThreadId}
        onThreadSelect={handleThreadSelect}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        isLoading={isLoading}
      >
        <MainContent />
      </WorkspaceLayout>

      <DocumentSelectionModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onConfirm={handleDocumentSelectionConfirm}
        initialQuery={initialQuery}
      />
    </div>
  );
};
