import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { useLanguageStore } from '../stores/languageStore';
import type { UserDocument } from '../api/documentsAPI';
import { DocumentViewerService, type DocumentContent } from '../services/documentViewerService';
import { CSVViewer, PDFViewer, DOCXViewer } from './viewers';

interface DocumentViewerProps {
  document: UserDocument;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  isOpen,
  onClose
}) => {
  const { t } = useLanguageStore();
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const documentService = DocumentViewerService.getInstance();

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflow = 'hidden';
    } else {
      window.document.body.style.overflow = 'unset';
    }

    return () => {
      window.document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setDocumentContent(null);

    try {
      const content = await documentService.loadDocumentContent(document);
      setDocumentContent(content);
    } catch (err) {
      console.error('Error loading document:', err);
      setDocumentContent({
        type: 'unknown',
        error: t('documents.loadError')
      });
    } finally {
      setLoading(false);
    }
  }, [document, documentService, t]);

  useEffect(() => {
    if (isOpen && document) {
      loadDocument();
    }
  }, [isOpen, document, loadDocument]);

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

  // Smart file type detection for viewer selection
  const getViewerType = () => {
    if (!documentContent) return null;
    
    const fileType = document.file_type.toLowerCase();
    
    // Direct mapping based on file extension
    if (fileType === '.pdf') return 'pdf';
    if (fileType === '.docx' || fileType === '.doc') return 'docx';
    if (fileType === '.csv') return 'csv';
    if (fileType === '.xlsx' || fileType === '.xls') return 'excel';
    if (fileType === '.txt' || fileType === '.md') return 'text';
    
    // Fallback to content type
    return documentContent.type;
  };

  const renderDocumentContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">{t('documents.loading')}</p>
          </div>
        </div>
      );
    }

    if (documentContent?.error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-red-600">{documentContent.error}</p>
          </div>
        </div>
      );
    }

    const viewerType = getViewerType();

    switch (viewerType) {
      case 'pdf':
        return documentContent?.content ? (
          <PDFViewer 
            content={documentContent.content}
            filename={document.original_filename}
            isMobile={isMobile}
          />
        ) : null;

      case 'docx':
      case 'word':
        return documentContent?.content ? (
          <DOCXViewer 
            content={documentContent.content}
            filename={document.original_filename}
            isMobile={isMobile}
          />
        ) : null;

      case 'csv':
        return documentContent?.excelData ? (
          <CSVViewer 
            data={documentContent.excelData.sheets[documentContent.excelData.sheetNames[0]] || []}
            filename={document.original_filename}
            isMobile={isMobile}
          />
        ) : null;

      case 'excel':
        return documentContent?.excelData ? (
          <div className="space-y-4">
            {/* Enhanced Excel Header */}
            <div className={cn(
              "bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200",
              isMobile ? "p-3" : "p-4"
            )}>
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h3 className={cn(
                    "font-semibold text-gray-900",
                    isMobile ? "text-base" : "text-lg"
                  )}>
                    {document.original_filename}
                  </h3>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {documentContent.excelData.sheetNames.length} sheets • Excel Workbook
                  </p>
                </div>
              </div>
            </div>

            {/* Use CSV Viewer for Excel data */}
            <CSVViewer 
              data={documentContent.excelData.sheets[documentContent.excelData.sheetNames[0]] || []}
              filename={`${document.original_filename} - ${documentContent.excelData.sheetNames[0]}`}
              isMobile={isMobile}
            />
          </div>
        ) : null;

      case 'text':
        return documentContent?.content ? (
          <div className="space-y-4">
            {/* Text Header */}
            <div className={cn(
              "bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200",
              isMobile ? "p-3" : "p-4"
            )}>
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 rounded-lg p-2">
                  <span className="text-2xl">📝</span>
                </div>
                <div>
                  <h3 className={cn(
                    "font-semibold text-gray-900",
                    isMobile ? "text-base" : "text-lg"
                  )}>
                    {document.original_filename}
                  </h3>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Text Document
                  </p>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className={cn(
                "overflow-y-auto",
                isMobile ? "p-4 max-h-64" : "p-6 max-h-96"
              )}>
                <div 
                  className={cn(
                    "prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700",
                    isMobile ? "prose-sm" : "prose-lg"
                  )}
                  dangerouslySetInnerHTML={{ __html: documentContent.content }}
                />
              </div>
            </div>
          </div>
        ) : null;

      default:
        return (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-gray-400 text-4xl mb-4">📄</div>
              <p className="text-gray-600">Unsupported file format</p>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={cn(
        "bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden flex flex-col",
        isMobile ? "m-4 h-[90vh] w-[calc(100vw-2rem)]" : "max-w-6xl w-full max-h-[90vh] mx-4"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between border-b border-gray-200 bg-gray-50",
          isMobile ? "p-4" : "p-6"
        )}>
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className={cn(
              "bg-white border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0",
              isMobile ? "w-8 h-8" : "w-10 h-10"
            )}>
              <span className={cn(isMobile ? "text-base" : "text-lg")}>{getFileIcon(document.file_type)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={cn(
                "font-semibold text-gray-900 truncate",
                isMobile ? "text-base" : "text-xl"
              )}>{document.original_filename}</h2>
              <p className={cn(
                "text-gray-500",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {document.file_type.toUpperCase()} • {formatFileSize(document.file_size)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0 touch-manipulation",
              isMobile ? "p-2" : "p-2"
            )}
          >
            <svg className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-hidden",
          isMobile ? "flex flex-col" : "flex"
        )}>
          {/* Document Viewer */}
          <div className={cn(
            "overflow-auto bg-gray-50",
            isMobile ? "flex-1 p-4" : "flex-1 p-6"
          )}>
            {renderDocumentContent()}
          </div>
        </div>
      </div>
    </div>
  );
};