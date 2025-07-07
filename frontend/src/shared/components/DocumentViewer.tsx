import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from '../../lib/utils';
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
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const documentService = DocumentViewerService.getInstance();

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
        error: 'Failed to load document'
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
      error: 'Failed to load PDF'
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
      default:
        return '📄';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-lg">{getFileIcon(document.file_type)}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{document.original_filename}</h2>
              <p className="text-gray-400 text-sm">
                {document.file_type.toUpperCase()} • {Math.round(document.file_size / 1024)} KB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Document Viewer */}
          <div className="flex-1 overflow-auto bg-gray-800 p-6">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading document...</p>
                </div>
              </div>
            )}

            {documentContent?.error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-400 text-4xl mb-4">⚠️</div>
                  <p className="text-red-400">{documentContent.error}</p>
                </div>
              </div>
            )}

            {/* PDF Viewer */}
            {documentContent?.type === 'pdf' && !loading && !documentContent.error && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-gray-700 rounded-lg p-4 max-w-full overflow-auto">
                  <Document
                    file={documentContent.content || ''}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading PDF...</p>
                      </div>
                    }
                    error={
                      <div className="text-center py-8">
                        <div className="text-red-400 text-4xl mb-4">📄</div>
                        <p className="text-red-400">Failed to load PDF</p>
                        <p className="text-gray-400 text-sm mt-2">The PDF file might be corrupted or unsupported</p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={Math.min(800, window.innerWidth - 500)}
                      className="shadow-lg border border-gray-600 rounded"
                      loading={
                        <div className="flex items-center justify-center h-96 bg-gray-600 rounded">
                          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center h-96 bg-gray-600 rounded">
                          <p className="text-red-400">Failed to load page</p>
                        </div>
                      }
                    />
                  </Document>
                </div>
                
                {/* PDF Navigation */}
                {numPages > 0 && (
                  <div className="flex items-center space-x-4 bg-gray-700 rounded-lg px-6 py-3">
                    <button
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous page"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-white font-medium">
                      Page {pageNumber} of {numPages}
                    </span>
                    <button
                      onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                      disabled={pageNumber >= numPages}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next page"
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
              <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Document Content</h3>
                </div>
                <div className="p-8 max-h-96 overflow-y-auto">
                  <div 
                    className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                    dangerouslySetInnerHTML={{ __html: documentContent.content }}
                  />
                </div>
              </div>
            )}

            {/* Text Document Viewer */}
            {documentContent?.type === 'text' && documentContent.content && !loading && !documentContent.error && (
              <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Text Content</h3>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto">
                  <div 
                    className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
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
                  <div className="flex space-x-2 border-b border-gray-700 pb-2 overflow-x-auto">
                    {documentContent.excelData.sheetNames.map((sheetName) => (
                      <button
                        key={sheetName}
                        onClick={() => setActiveSheet(sheetName)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                          activeSheet === sheetName
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        )}
                      >
                        {sheetName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Excel Table */}
                <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                  <div className="overflow-auto max-h-96">
                    {documentContent.excelData.sheets[activeSheet]?.length > 0 ? (
                      <table className="min-w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0">
                          {documentContent.excelData.sheets[activeSheet][0] && (
                            <tr>
                              {documentContent.excelData.sheets[activeSheet][0].map((header, cellIndex) => (
                                <th
                                  key={cellIndex}
                                  className="px-4 py-3 border border-gray-300 text-left text-sm font-semibold text-gray-900 bg-gray-100"
                                >
                                  {header || `Column ${cellIndex + 1}`}
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
                                  className="px-4 py-2 border border-gray-300 text-sm text-gray-700"
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
                        <p className="text-gray-600">No data found in this sheet</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Table Info */}
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>
                        Sheet: <strong>{activeSheet}</strong>
                      </span>
                      <span>
                        {documentContent.excelData.sheets[activeSheet]?.length || 0} rows × {documentContent.excelData.sheets[activeSheet]?.[0]?.length || 0} columns
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Document Info Sidebar */}
          <div className="w-80 border-l border-gray-800 bg-gray-900 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Document Info</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400">File Name</label>
                <p className="text-white">{document.original_filename}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">File Type</label>
                <p className="text-white">{document.file_type.toUpperCase()}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">File Size</label>
                <p className="text-white">{Math.round(document.file_size / 1024)} KB</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Chunks</label>
                <p className="text-white">{document.chunks_count}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Uploaded</label>
                <p className="text-white">{new Date(document.created_at).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Summary</label>
                <p className="text-gray-300 text-sm leading-relaxed">{document.summary}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 