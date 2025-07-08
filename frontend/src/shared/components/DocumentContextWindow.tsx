import React, { useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { cn } from '../../lib/utils';
import { documentsAPI } from '../api/documentsAPI';
import type { UserDocument } from '../api/documentsAPI';

interface DocumentContextWindowProps {
  documents: UserDocument[];
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onDocumentsUpdate?: () => void; // Callback to refresh documents
}

export const DocumentContextWindow: React.FC<DocumentContextWindowProps> = ({
  documents,
  isOpen,
  onClose,
  onToggle,
  onDocumentsUpdate
}) => {
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set());

  const handleDocumentClick = (document: UserDocument) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const file of files) {
        await documentsAPI.uploadDocument(file);
      }
      
      // Refresh documents list
      if (onDocumentsUpdate) {
        onDocumentsUpdate();
      }
      
      // Clear file input
      event.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setDeletingDocuments(prev => new Set(prev).add(documentId));

    try {
      await documentsAPI.deleteDocument(documentId);
      
      // Refresh documents list
      if (onDocumentsUpdate) {
        onDocumentsUpdate();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document');
    } finally {
      setDeletingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case '.pdf':
        return '📄';
      case '.docx':
      case '.doc':
        return '📝';
      case '.xlsx':
      case '.xls':
        return '📊';
      case '.csv':
        return '📈';
      case '.json':
        return '📋';
      case '.txt':
      case '.md':
        return '📝';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed right-6 top-1/2 transform -translate-y-1/2 z-40 p-3 rounded-l-xl transition-all duration-300 shadow-lg",
          isOpen 
            ? "bg-gray-800 border border-gray-700 text-white" 
            : "bg-blue-600 hover:bg-blue-700 text-white"
        )}
        title={isOpen ? "Close context" : "Show document context"}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {!isOpen && (
            <span className="text-sm font-medium">
              {documents.length} doc{documents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {/* Context Window */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-30",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Document Context</h3>
            <p className="text-gray-400 text-sm">{documents.length} document{documents.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-4 border-b border-gray-800">
          <div className="space-y-3">
            <label className="block">
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.pdf,.json,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <div className={cn(
                "w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors cursor-pointer",
                isUploading 
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>
                  {isUploading ? 'Uploading...' : 'Upload Documents'}
                </span>
              </div>
            </label>
            
            {uploadError && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{uploadError}</p>
                <button 
                  onClick={() => setUploadError(null)}
                  className="text-red-400 hover:text-red-300 text-xs mt-1"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-gray-400">No documents selected</p>
              <p className="text-gray-500 text-sm mt-2">Upload documents to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="group bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 hover:bg-gray-750 transition-all duration-200 cursor-pointer"
                  onClick={() => handleDocumentClick(document)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                        <span className="text-lg">{getFileIcon(document.file_type)}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                          {document.original_filename}
                        </h4>
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {document.file_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {document.summary}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>{document.chunks_count} chunks</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {/* View button */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteDocument(document.id, e)}
                        disabled={deletingDocuments.has(document.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all disabled:opacity-50"
                        title="Delete document"
                      >
                        {deletingDocuments.has(document.id) ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4">
          <div className="text-xs text-gray-500 text-center">
            Click on any document to view its content
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20"
          onClick={onClose}
        />
      )}
    </>
  );
}; 