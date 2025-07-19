import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThreadStore } from '../shared/stores/threadStore'
import { useAuthStore } from '../shared/stores/authStore'
import { useLanguageStore } from '../shared/stores/languageStore'
import ChatSidebar from '../shared/components/ChatSidebar'

export const ThreadChatbot: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { t } = useLanguageStore()
  const {
    currentThread,
    messages,
    documents,
    selectedDocuments,
    isLoadingMessages,
    isSendingMessage,
    isLoadingDocuments,
    error,
    sendMessage,
    loadDocuments,
    setSelectedDocuments,
    updateThreadDocuments,
    clearError,
    clearCurrentThread
  } = useThreadStore()

  const [inputMessage, setInputMessage] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showDocumentSelector, setShowDocumentSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load documents on mount and validate current thread
  useEffect(() => {
    if (user) {
      loadDocuments()
      
      // Validate current thread belongs to the current user
      if (currentThread && currentThread.user_id !== user.id) {
        console.log('Current thread belongs to different user, clearing...')
        clearCurrentThread()
      }
    }
      }, [user, loadDocuments, currentThread, clearCurrentThread])

  // Focus input when thread changes
  useEffect(() => {
    if (currentThread && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentThread])

  // Handle message sending
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSendingMessage || !currentThread) return

    const message = inputMessage.trim()
    setInputMessage('')
    
    await sendMessage(message, selectedDocuments)
  }

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle logout
  const handleLogout = () => {
    logout()
    clearError() // Clear any thread errors
    navigate('/')
  }

  // Handle document selection change
  const handleDocumentSelectionChange = async (documentId: string, isSelected: boolean) => {
    let newSelection: string[]
    
    if (isSelected) {
      newSelection = [...selectedDocuments, documentId]
    } else {
      newSelection = selectedDocuments.filter(id => id !== documentId)
    }
    
    setSelectedDocuments(newSelection)
    
    // Update thread if there's a current thread
    if (currentThread) {
      await updateThreadDocuments(currentThread.id, newSelection)
    }
  }

  // Format message content
  const formatMessageContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br/>')
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <ChatSidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Thread info */}
            {currentThread ? (
              <div>
                <h1 className="text-lg font-semibold text-white">{currentThread.title}</h1>
                <p className="text-sm text-gray-400">
                  {t('threadChatbot.messagesCount', { count: messages.length.toString() })}
                  {selectedDocuments.length > 0 && ` • ${t('threadChatbot.documentsSelected', { count: selectedDocuments.length.toString() })}`}
                </p>
              </div>
            ) : (
              <div>
                <h1 className="text-lg font-semibold text-white">QuokkaAI</h1>
                <p className="text-sm text-gray-400">{t('threadChatbot.selectChatOrStart')}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* User info and logout */}
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <span>👤 {user?.name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center space-x-1"
                title={t('threadChatbot.logout')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{t('threadChatbot.logout')}</span>
              </button>
            </div>

            {/* Back to Landing button */}
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1 text-sm rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{t('threadChatbot.backToLanding')}</span>
            </button>
            
            {currentThread && (
              <button
                onClick={() => setShowDocumentSelector(!showDocumentSelector)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  showDocumentSelector 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                📄 {t('threadChatbot.documents')} ({selectedDocuments.length})
              </button>
            )}
          </div>
        </div>

        {/* Document Selector Panel */}
        {showDocumentSelector && currentThread && (
          <div className="border-b border-gray-800 bg-gray-900 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-white">{t('threadChatbot.selectDocumentsForChat')}</h3>
              <button
                onClick={() => setShowDocumentSelector(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {isLoadingDocuments ? (
              <div className="text-center text-gray-400">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                {t('threadChatbot.loadingDocuments')}
              </div>
            ) : documents.length === 0 ? (
              <p className="text-gray-400 text-sm">
                {t('threadChatbot.noDocumentsUploaded')}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={(e) => handleDocumentSelectionChange(doc.id, e.target.checked)}
                      className="mt-1 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white truncate">
                          {doc.original_filename}
                        </span>
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {doc.file_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {doc.summary}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {Math.round(doc.file_size / 1024)} KB
                        </span>
                        <span className="text-xs text-gray-500">
                          {doc.chunks_count} {t('threadChatbot.chunks')}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
            <button 
              onClick={clearError}
              className="text-red-400 hover:text-red-300 text-xs mt-1"
            >
              {t('threadChatbot.dismiss')}
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentThread ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-black text-2xl">🐨</span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">{t('threadChatbot.welcomeTitle')}</h2>
                <p className="text-gray-400 mb-4">
                  {t('threadChatbot.welcomeDescription')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('threadChatbot.welcomeSubtext')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {isLoadingMessages ? (
                <div className="flex justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400">
                  <p>{t('threadChatbot.startConversation')}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${message.role === 'user' ? 'flex justify-end' : 'w-full'}`}
                  >
                    <div
                      className={`${
                        message.role === 'user'
                          ? 'max-w-3xl bg-blue-600 text-white rounded-lg px-4 py-3'
                          : 'w-full bg-transparent text-gray-100 px-6 py-4 text-base'
                      }`}
                    >
                      <div
                        className="prose prose-sm max-w-none prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(message.content)
                        }}
                      />
                      
                      {/* Visualization support */}
                      {message.metadata?.visualization && (
                        <div className="mt-4 p-3 bg-gray-900 rounded border">
                          <p className="text-sm font-medium text-gray-300 mb-2">📊 {t('threadChatbot.visualization')}</p>
                          {/* Add visualization rendering here when needed */}
                          <p className="text-xs text-gray-400">{t('threadChatbot.visualizationAvailable')}</p>
                        </div>
                      )}
                      
                      {/* Message metadata */}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.metadata?.confidence && (
                          <span>{t('threadChatbot.confidence', { percent: Math.round(message.metadata.confidence * 100).toString() })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing indicator */}
              {isSendingMessage && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        {currentThread && (
          <div className="border-t border-gray-800 p-4 bg-gray-950">
            <div className="flex space-x-3">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t('threadChatbot.typeMessage')}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white 
                           placeholder-gray-400 resize-none focus:outline-none focus:ring-2 
                           focus:ring-blue-500 focus:border-transparent"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                  }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSendingMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 
                         disabled:cursor-not-allowed text-white rounded-lg transition-colors 
                         flex items-center space-x-2"
              >
                {isSendingMessage ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            
            {selectedDocuments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedDocuments.map((docId) => {
                  const doc = documents.find(d => d.id === docId)
                  return doc ? (
                    <span key={docId} className="inline-flex items-center px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded border border-blue-500/30">
                      📄 {doc.original_filename}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ThreadChatbot