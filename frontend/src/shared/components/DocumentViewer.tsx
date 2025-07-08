import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from '../../lib/utils';
import { useLanguageStore } from '../stores/languageStore';
import type { UserDocument } from '../api/documentsAPI';
import { DocumentViewerService, type DocumentContent } from '../services/documentViewerService';

// Set up PDF.js worker - use cdnjs which has proper CORS support and correct file extension
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

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
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
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

  useEffect(() => {
    if (isOpen && document) {
      loadDocument();
    }
  }, [isOpen, document]);

  const loadDocument = async () => {
    setLoading(true);
    setDocumentContent(null);
    setPageNumber(1);

    try {
      const content = await documentService.loadDocumentContent(document);
      setDocumentContent(content);
      
      if (content.type === 'excel' && content.excelData) {
        setActiveSheet(content.excelData.sheetNames[0] || '');
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setDocumentContent({
        type: 'unknown',
        error: t('documents.loadError')
      });
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setDocumentContent({
      type: 'pdf',
      error: t('documents.pdfLoadError')
    });
    setLoading(false);
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
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">{t('documents.loading')}</p>
                </div>
              </div>
            )}

            {documentContent?.error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-500 text-4xl mb-4">⚠️</div>
                  <p className="text-red-600">{documentContent.error}</p>
                </div>
              </div>
            )}

            {/* PDF Viewer */}
            {documentContent?.type === 'pdf' && !loading && !documentContent.error && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 max-w-full overflow-auto">
                  <Document
                    file={documentContent.content || ''}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">{t('documents.loadingPdf')}</p>
                      </div>
                    }
                    error={
                      <div className="text-center py-8">
                        <div className="text-red-500 text-4xl mb-4">📄</div>
                        <p className="text-red-600">{t('documents.pdfLoadError')}</p>
                        <p className="text-gray-500 text-sm mt-2">{t('documents.pdfCorrupted')}</p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={isMobile ? Math.min(350, window.innerWidth - 100) : Math.min(700, window.innerWidth - 500)}
                      className="shadow-sm border border-gray-200 rounded"
                      loading={
                        <div className={cn(
                          "flex items-center justify-center bg-gray-100 rounded",
                          isMobile ? "h-64" : "h-96"
                        )}>
                          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full"></div>
                        </div>
                      }
                      error={
                        <div className={cn(
                          "flex items-center justify-center bg-gray-100 rounded",
                          isMobile ? "h-64" : "h-96"
                        )}>
                          <p className="text-red-600">{t('documents.pageLoadError')}</p>
                        </div>
                      }
                    />
                  </Document>
                </div>
                
                {/* PDF Navigation */}
                {numPages > 0 && (
                  <div className={cn(
                    "flex items-center space-x-4 bg-white rounded-lg border border-gray-200 shadow-sm",
                    isMobile ? "px-4 py-2" : "px-6 py-3"
                  )}>
                    <button
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      title={t('documents.previousPage')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className={cn(
                      "text-gray-900 font-medium",
                      isMobile ? "text-sm" : "text-base"
                    )}>
                      {t('documents.pageOf', { current: pageNumber.toString(), total: numPages.toString() })}
                    </span>
                    <button
                      onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                      disabled={pageNumber >= numPages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      title={t('documents.nextPage')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Word Document Viewer */}
            {documentContent?.type === 'word' && documentContent.content && !loading && !documentContent.error && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto overflow-hidden">
                <div className={cn(
                  "bg-gray-50 border-b border-gray-200",
                  isMobile ? "px-4 py-2" : "px-6 py-3"
                )}>
                  <h3 className={cn(
                    "font-semibold text-gray-900",
                    isMobile ? "text-sm" : "text-lg"
                  )}>{t('documents.documentContent')}</h3>
                </div>
                <div className={cn(
                  "overflow-y-auto",
                  isMobile ? "p-4 max-h-64" : "p-8 max-h-96"
                )}>
                  <div 
                    className={cn(
                      "prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700",
                      isMobile ? "prose-sm" : "prose-lg"
                    )}
                    dangerouslySetInnerHTML={{ __html: documentContent.content }}
                  />
                </div>
              </div>
            )}

            {/* Text Document Viewer */}
            {documentContent?.type === 'text' && documentContent.content && !loading && !documentContent.error && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto overflow-hidden">
                <div className={cn(
                  "bg-gray-50 border-b border-gray-200",
                  isMobile ? "px-4 py-2" : "px-6 py-3"
                )}>
                  <h3 className={cn(
                    "font-semibold text-gray-900",
                    isMobile ? "text-sm" : "text-lg"
                  )}>{t('documents.textContent')}</h3>
                </div>
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
            )}

            {/* Excel/CSV Viewer */}
            {(documentContent?.type === 'excel' || documentContent?.type === 'csv') && documentContent.excelData && !loading && !documentContent.error && (
              <div className="space-y-4">
                {/* Sheet Tabs */}
                {documentContent.excelData.sheetNames.length > 1 && (
                  <div className="flex space-x-2 border-b border-gray-200 pb-2 overflow-x-auto">
                    {documentContent.excelData.sheetNames.map((sheetName) => (
                      <button
                        key={sheetName}
                        onClick={() => setActiveSheet(sheetName)}
                        className={cn(
                          "rounded-lg font-medium transition-colors whitespace-nowrap touch-manipulation",
                          isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                          activeSheet === sheetName
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {sheetName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Excel Table */}
                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                  <div className={cn(
                    "overflow-auto",
                    isMobile ? "max-h-64" : "max-h-96"
                  )}>
                    {documentContent.excelData.sheets[activeSheet]?.length > 0 ? (
                      <table className="min-w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0">
                          {documentContent.excelData.sheets[activeSheet][0] && (
                            <tr>
                              {documentContent.excelData.sheets[activeSheet][0].map((header, cellIndex) => (
                                <th
                                  key={cellIndex}
                                  className={cn(
                                    "border border-gray-200 text-left font-semibold text-gray-900 bg-gray-50",
                                    isMobile ? "px-2 py-1.5 text-xs" : "px-4 py-3 text-sm"
                                  )}
                                >
                                  {header || `${t('documents.column')} ${cellIndex + 1}`}
                                </th>
                              ))}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {documentContent.excelData.sheets[activeSheet]?.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className={cn(
                                    "border border-gray-200 text-gray-700",
                                    isMobile ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm"
                                  )}
                                >
                                  {cell !== null && cell !== undefined ? String(cell) : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">📊</div>
                        <p className="text-gray-600">{t('documents.noDataInSheet')}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Table Info */}
                  <div className={cn(
                    "bg-gray-50 border-t border-gray-200",
                    isMobile ? "px-3 py-2" : "px-4 py-2"
                  )}>
                    <div className={cn(
                      "flex justify-between items-center text-gray-600",
                      isMobile ? "text-xs" : "text-sm"
                    )}>
                      <span>
                        {t('documents.sheet')}: <strong>{activeSheet}</strong>
                      </span>
                      <span>
                        {t('documents.tableSize', { 
                          rows: (documentContent.excelData.sheets[activeSheet]?.length || 0).toString(),
                          cols: (documentContent.excelData.sheets[activeSheet]?.[0]?.length || 0).toString()
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Document Info Sidebar - Hidden on mobile */}
          {!isMobile && (
            <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('documents.documentInfo')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('documents.fileName')}</label>
                  <p className="text-gray-900 mt-1">{document.original_filename}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('documents.fileType')}</label>
                  <p className="text-gray-900 mt-1">{document.file_type.toUpperCase()}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('documents.fileSize')}</label>
                  <p className="text-gray-900 mt-1">{formatFileSize(document.file_size)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('documents.chunks')}</label>
                  <p className="text-gray-900 mt-1">{document.chunks_count}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('documents.uploaded')}</label>
                  <p className="text-gray-900 mt-1">{new Date(document.created_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('documents.summary')}</label>
                  <p className="text-gray-700 text-sm leading-relaxed mt-1">{document.summary}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 