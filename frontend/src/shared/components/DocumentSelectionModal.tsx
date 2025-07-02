import React, { useState, useEffect } from 'react'
import { useThreadStore } from '../stores/threadStore'

interface DocumentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedDocuments: string[], firstMessage: string) => void
  initialMessage: string
}

export const DocumentSelectionModal: React.FC<DocumentSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialMessage
}) => {
  const { documents, loadDocuments, isLoadingDocuments } = useThreadStore()
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [message, setMessage] = useState(initialMessage)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Always reload documents when modal opens to ensure fresh data
      console.log('DocumentSelectionModal: Modal opened, loading documents...')
      loadDocuments()
    }
  }, [isOpen, loadDocuments])

  useEffect(() => {
    setMessage(initialMessage)
  }, [initialMessage])

  if (!isOpen) return null

  // Debug logging
  console.log('DocumentSelectionModal render:', {
    documentsCount: documents.length,
    isLoadingDocuments,
    documents: documents.map(d => ({ id: d.id, filename: d.original_filename }))
  })

  const filteredDocuments = documents.filter(doc => {
    const query = searchQuery.toLowerCase()
    return (
      doc.original_filename.toLowerCase().includes(query) ||
      doc.summary.toLowerCase().includes(query) ||
      doc.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const handleSelectAll = () => {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(filteredDocuments.map(doc => doc.id))
    }
  }

  const handleConfirm = () => {
    if (!message.trim()) {
      alert('Please enter a message to start the chat')
      return
    }
    onConfirm(selectedDocs, message.trim())
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case '.pdf':
        return '📄'
      case '.csv':
        return '📊'
      case '.xlsx':
      case '.xls':
        return '📗'
      case '.json':
        return '🔧'
      case '.txt':
      case '.md':
        return '📝'
      default:
        return '📁'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Start New Chat</h3>
            <p className="text-sm text-gray-400 mt-1">
              Choose documents for your AI assistant to work with
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your first message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Start a conversation with your AI assistant..."
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white 
                     placeholder-gray-400 resize-none focus:outline-none focus:ring-2 
                     focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Documents Section */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-white">
              Select Documents ({selectedDocs.length} selected)
            </h4>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  console.log('Manual refresh clicked')
                  loadDocuments()
                }}
                disabled={isLoadingDocuments}
                className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh documents"
              >
                <svg className={`w-4 h-4 ${isLoadingDocuments ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {filteredDocuments.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {selectedDocs.length === filteredDocuments.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          {documents.length > 0 && (
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by name, content, or tags..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white 
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent"
              />
            </div>
          )}

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingDocuments ? (
              <div className="text-center py-8 text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No documents uploaded yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  You can start a chat without documents or upload some from the sidebar
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No documents match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className={`block p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedDocs.includes(doc.id)
                        ? 'bg-blue-600/20 border-blue-500/50 ring-1 ring-blue-500/30'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => handleDocumentToggle(doc.id)}
                        className="mt-1 text-blue-600 bg-gray-700 border-gray-600 rounded 
                                 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{getFileIcon(doc.file_type)}</span>
                          <h5 className="text-sm font-medium text-white truncate">
                            {doc.original_filename}
                          </h5>
                        </div>
                        
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                          {doc.summary}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatFileSize(doc.file_size)}</span>
                          {doc.chunks_count > 0 && (
                            <span>{doc.chunks_count} chunks</span>
                          )}
                        </div>
                        
                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {doc.tags.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{doc.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-700 mt-6">
          <div className="text-sm text-gray-400">
            {selectedDocs.length > 0 
              ? `${selectedDocs.length} document${selectedDocs.length > 1 ? 's' : ''} selected`
              : 'No documents selected - chat will work without document context'
            }
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!message.trim()}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                       disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Start Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentSelectionModal 