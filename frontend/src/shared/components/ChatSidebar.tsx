import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThreadStore } from '../stores/threadStore'
import { useAuthStore } from '../stores/authStore'
import DocumentUploadModal from './DocumentUploadModal'
import DocumentSelectionModal from './DocumentSelectionModal'

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    threads,
    currentThread,
    documents,
    isLoading,
    error,
    loadThreads,
    createThread,
    selectThread,
    deleteThread,
    clearError,
    clearAll,
    loadDocuments
  } = useThreadStore()

  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [newChatMessage, setNewChatMessage] = useState('')
  const [showNewChatInput, setShowNewChatInput] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDocumentSelection, setShowDocumentSelection] = useState(false)

  // Load threads and documents on component mount
  useEffect(() => {
    if (user) {
      loadThreads()
      loadDocuments()
    }
  }, [user, loadThreads, loadDocuments])

  // Handle new chat creation with document selection
  const handleCreateNewChat = () => {
    if (!newChatMessage.trim()) return
    
    setShowDocumentSelection(true)
    setShowNewChatInput(false)
  }

  // Handle document selection confirmation
  const handleDocumentSelectionConfirm = async (selectedDocuments: string[], firstMessage: string) => {
    setIsCreatingThread(true)
    setShowDocumentSelection(false)
    
    try {
      const thread = await createThread(firstMessage, selectedDocuments)
      if (thread) {
        setNewChatMessage('')
      }
    } catch (error) {
      console.error('Failed to create new chat:', error)
    } finally {
      setIsCreatingThread(false)
    }
  }

  // Handle direct chat creation without document selection
  const handleQuickCreateChat = async () => {
    if (!newChatMessage.trim()) return

    setIsCreatingThread(true)
    try {
      const thread = await createThread(newChatMessage.trim(), [])
      if (thread) {
        setNewChatMessage('')
        setShowNewChatInput(false)
      }
    } catch (error) {
      console.error('Failed to create new chat:', error)
    } finally {
      setIsCreatingThread(false)
    }
  }

  // Handle thread selection
  const handleSelectThread = async (threadId: string) => {
    clearError()
    await selectThread(threadId)
  }

  // Handle thread deletion
  const handleDeleteThread = async (threadId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (confirm('Are you sure you want to delete this chat?')) {
      await deleteThread(threadId)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Truncate thread title
  const truncateTitle = (title: string, maxLength: number = 35) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
  }

  // Handle logout
  const handleLogout = () => {
    clearAll() // Clear all thread data
    logout()   // Clear auth data
    navigate('/')
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-80 bg-gray-950 border-r border-gray-800 
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-black font-bold">🐨</span>
            </div>
            <h2 className="text-lg font-semibold text-white">QuokkaAI</h2>
          </div>
          
          {/* Close button for mobile */}
          <button 
            onClick={onToggle}
            className="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Section */}
        <div className="p-4 border-b border-gray-800">
          {!showNewChatInput ? (
            <div className="space-y-2">
              <button
                onClick={() => setShowNewChatInput(true)}
                disabled={isLoading || isCreatingThread}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 
                         bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 
                         text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>
                  {isCreatingThread ? 'Creating...' : isLoading ? 'Loading...' : 'New Chat'}
                </span>
              </button>
              
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 
                         bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 
                         text-white rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload Documents</span>
              </button>
              
              {documents.length > 0 && (
                <div className="text-xs text-gray-400 text-center">
                  {documents.length} document{documents.length > 1 ? 's' : ''} in library
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder="Start a new conversation..."
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg 
                         text-white placeholder-gray-400 resize-none focus:outline-none 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
                    e.preventDefault()
                    handleQuickCreateChat()
                  }
                  if (e.key === 'Escape') {
                    setShowNewChatInput(false)
                    setNewChatMessage('')
                  }
                }}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateNewChat}
                  disabled={!newChatMessage.trim() || isCreatingThread}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 
                           disabled:bg-gray-700 disabled:cursor-not-allowed
                           text-white rounded text-sm transition-colors"
                  title="Create chat with document selection"
                >
                  📄 With Docs
                </button>
                <button
                  onClick={handleQuickCreateChat}
                  disabled={!newChatMessage.trim() || isCreatingThread}
                  className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 
                           disabled:bg-gray-700 disabled:cursor-not-allowed
                           text-white rounded text-sm transition-colors"
                  title="Create quick chat without documents"
                >
                  💬 Quick
                </button>
                <button
                  onClick={() => {
                    setShowNewChatInput(false)
                    setNewChatMessage('')
                  }}
                  className="py-2 px-3 bg-gray-700 hover:bg-gray-600 
                           text-white rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="text-xs text-gray-400 text-center">
                Ctrl+Enter for quick chat
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
            <button 
              onClick={clearError}
              className="text-red-400 hover:text-red-300 text-xs mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && threads.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading chats...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No chats yet</p>
              <p className="text-xs text-gray-500 mt-1">Start a new conversation to get started</p>
            </div>
          ) : (
            <div className="py-2">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`
                    mx-2 mb-1 p-3 rounded-lg cursor-pointer transition-colors group
                    ${currentThread?.id === thread.id 
                      ? 'bg-blue-600/20 border border-blue-500/30' 
                      : 'hover:bg-gray-800 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`
                        text-sm font-medium truncate
                        ${currentThread?.id === thread.id ? 'text-blue-300' : 'text-white'}
                      `}>
                        {truncateTitle(thread.title)}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {formatDate(thread.updated_at)}
                        </span>
                        {thread.message_count > 0 && (
                          <span className="text-xs text-gray-500">
                            {thread.message_count} messages
                          </span>
                        )}
                        {thread.selected_documents.length > 0 && (
                          <span className="text-xs text-blue-400">
                            📄 {thread.selected_documents.length}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 
                               hover:text-red-400 transition-all"
                      title="Delete chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-800">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 
                              rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white 
                         rounded-lg transition-colors text-sm flex items-center 
                         justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-sm">Not signed in</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Document Selection Modal */}
      <DocumentSelectionModal
        isOpen={showDocumentSelection}
        onClose={() => {
          setShowDocumentSelection(false)
          setNewChatMessage('')
        }}
        onConfirm={handleDocumentSelectionConfirm}
        initialMessage={newChatMessage}
      />
    </>
  )
}

export default ChatSidebar 