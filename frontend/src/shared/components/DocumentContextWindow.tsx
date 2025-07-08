import React, { useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { cn } from '../../lib/utils';
import { documentsAPI } from '../api/documentsAPI';
import { useLanguageStore } from '../stores/languageStore';
import type { UserDocument } from '../api/documentsAPI';

interface DocumentContextWindowProps {
  documents: UserDocument[];
  isOpen: boolean;
  onClose: () => void;
  onDocumentsUpdate?: () => void; // Callback to refresh documents
}

export const DocumentContextWindow: React.FC<DocumentContextWindowProps> = ({
  documents,
  isOpen,
  onClose,
  onDocumentsUpdate
}) => {
  const { t } = useLanguageStore();
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
    
    if (!confirm(t('documents.confirmDelete'))) {
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
      alert(t('documents.deleteFailed'));
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
    if (bytes === 0) return t('documents.0Bytes');
    const k = 1024;
    const sizes = [t('documents.bytes'), t('documents.kb'), t('documents.mb'), t('documents.gb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Context Window */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-30",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('documents.documentContext')}</h3>
            <p className="text-gray-500 text-sm">{t('documents.documentsSelected', { count: documents.length.toString() })}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-4 border-b border-gray-200">
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
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
                  : "bg-black hover:bg-gray-800 text-white"
              )}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>
                  {isUploading ? t('upload.uploading') : t('documents.uploadDocuments')}
                </span>
              </div>
            </label>
            
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{uploadError}</p>
                <button 
                  onClick={() => setUploadError(null)}
                  className="text-red-500 hover:text-red-700 text-xs mt-1"
                >
                  {t('common.dismiss')}
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
              <p className="text-gray-500">{t('documents.noDocuments')}</p>
              <p className="text-gray-400 text-sm mt-2">{t('documents.uploadToStart')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="group bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                  onClick={() => handleDocumentClick(document)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-50 transition-colors">
                        <span className="text-lg">{getFileIcon(document.file_type)}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-black transition-colors">
                          {document.original_filename}
                        </h4>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {document.file_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {document.summary}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>{t('documents.chunks', { count: document.chunks_count.toString() })}</span>
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all disabled:opacity-50"
                        title={t('documents.deleteDocument')}
                      >
                        {deletingDocuments.has(document.id) ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
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
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-400 text-center">
            {t('documents.clickToView')}
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
          className="fixed inset-0 bg-black/10 z-20"
          onClick={onClose}
        />
      )}
    </>
  );
}; 