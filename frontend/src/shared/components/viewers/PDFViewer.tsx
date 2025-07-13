import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from '../../../lib/utils';
import { useLanguageStore } from '../../stores/languageStore';

// Ensure PDF.js worker is properly configured
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  content: any; // PDF data
  filename: string;
  isMobile?: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  content,
  filename,
  isMobile = false
}) => {
  const { t } = useLanguageStore();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError('');
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError(error.message || t('documents.pdfLoadError'));
    setIsLoading(false);
  }, [t]);

  const onPageLoadError = useCallback((error: Error) => {
    console.error('Error loading page:', error);
  }, []);

  const handlePageChange = (newPage: number) => {
    setPageNumber(Math.max(1, Math.min(numPages, newPage)));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.25));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getPageWidth = () => {
    if (isFullscreen) {
      return Math.min(1000, window.innerWidth - 100);
    }
    return isMobile ? Math.min(350, window.innerWidth - 100) : Math.min(700, window.innerWidth - 500);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">📄</div>
          <p className="text-red-600 mb-2">{t('documents.pdfLoadError')}</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-4",
      isFullscreen && "fixed inset-0 z-50 bg-white overflow-auto p-4"
    )}>
      {/* PDF Header Info */}
      <div className={cn(
        "bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200",
        isMobile ? "p-3" : "p-4"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 rounded-lg p-2">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <h3 className={cn(
                "font-semibold text-gray-900",
                isMobile ? "text-base" : "text-lg"
              )}>
                {filename}
              </h3>
              <p className={cn(
                "text-gray-600",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {numPages > 0 && `${numPages} ${t('documents.pages')}`}
                {scale !== 1.0 && ` • ${Math.round(scale * 100)}%`}
              </p>
            </div>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={cn(
              "p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors",
              isMobile ? "text-sm" : "text-base"
            )}
            title={isFullscreen ? t('documents.exitFullscreen') : t('documents.fullscreen')}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9l5-5M15 15v4.5M15 15h4.5M15 15l-5 5" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className={cn(
        "bg-white rounded-lg border border-gray-200 space-y-4",
        isMobile ? "p-3" : "p-4"
      )}>
        {/* Zoom Controls */}
        <div className={cn(
          "flex gap-4",
          isMobile ? "flex-col" : "flex-row items-center justify-between"
        )}>
          <div className="flex items-center space-x-2">
            <span className={cn(
              "text-gray-700 font-medium",
              isMobile ? "text-sm" : "text-base"
            )}>
              {t('documents.zoom')}:
            </span>
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('documents.zoomOut')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className={cn(
              "min-w-16 text-center text-gray-900 font-mono",
              isMobile ? "text-sm" : "text-base"
            )}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('documents.zoomIn')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={handleResetZoom}
              className={cn(
                "px-2 py-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors",
                isMobile ? "text-xs" : "text-sm"
              )}
              title={t('documents.resetZoom')}
            >
              {t('documents.reset')}
            </button>
          </div>

          {/* Page Navigation */}
          {numPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pageNumber === 1}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={t('documents.firstPage')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(pageNumber - 1)}
                disabled={pageNumber <= 1}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={t('documents.previousPage')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={(e) => handlePageChange(Number(e.target.value))}
                  className={cn(
                    "w-16 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    isMobile ? "px-1 py-1 text-sm" : "px-2 py-1"
                  )}
                />
                <span className={cn(
                  "text-gray-600",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  / {numPages}
                </span>
              </div>
              
              <button
                onClick={() => handlePageChange(pageNumber + 1)}
                disabled={pageNumber >= numPages}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={t('documents.nextPage')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(numPages)}
                disabled={pageNumber === numPages}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={t('documents.lastPage')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading && (
            <div className={cn(
              "flex items-center justify-center bg-gray-100",
              isMobile ? "h-64" : "h-96"
            )}>
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">{t('documents.loadingPdf')}</p>
              </div>
            </div>
          )}

          <Document
            file={content}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null} // We handle loading state above
            error={null} // We handle error state above
          >
            <Page
              pageNumber={pageNumber}
              width={getPageWidth() * scale}
              className="shadow-sm"
              loading={
                <div className={cn(
                  "flex items-center justify-center bg-gray-100",
                  isMobile ? "h-64" : "h-96"
                )}>
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              }
              error={
                <div className={cn(
                  "flex items-center justify-center bg-gray-100",
                  isMobile ? "h-64" : "h-96"
                )}>
                  <p className="text-red-600">{t('documents.pageLoadError')}</p>
                </div>
              }
              onLoadError={onPageLoadError}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}; 