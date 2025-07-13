import React, { useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { useLanguageStore } from '../../stores/languageStore';

interface DOCXViewerProps {
  content: string; // HTML content from mammoth
  filename: string;
  isMobile?: boolean;
}

export const DOCXViewer: React.FC<DOCXViewerProps> = ({
  content,
  filename,
  isMobile = false
}) => {
  const { t } = useLanguageStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showOutline, setShowOutline] = useState(false);

  // Extract text content for search
  const textContent = useMemo(() => {
    const div = document.createElement('div');
    div.innerHTML = content;
    return div.textContent || div.innerText || '';
  }, [content]);

  // Extract headings for outline
  const headings = useMemo(() => {
    const div = document.createElement('div');
    div.innerHTML = content;
    const headingElements = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    return Array.from(headingElements).map((heading, index) => ({
      id: `heading-${index}`,
      text: heading.textContent || '',
      level: parseInt(heading.tagName.charAt(1)),
      element: heading
    }));
  }, [content]);

  // Highlight search terms in content
  const highlightedContent = useMemo(() => {
    if (!searchTerm.trim()) return content;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-200 px-1 py-0.5 rounded">$1</mark>');
  }, [content, searchTerm]);

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Add IDs to headings for navigation
  const processedContent = useMemo(() => {
    let processedHtml = highlightedContent;
    
    headings.forEach((heading, index) => {
      const headingPattern = new RegExp(`<h${heading.level}([^>]*)>`, 'g');
      processedHtml = processedHtml.replace(headingPattern, `<h${heading.level} id="heading-${index}"$1>`);
    });

    return processedHtml;
  }, [highlightedContent, headings]);

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'prose-sm';
      case 'large': return 'prose-lg';
      default: return 'prose-base';
    }
  };

  const getWordCount = () => {
    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  };

  const getSearchResults = () => {
    if (!searchTerm.trim()) return 0;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (textContent.match(regex) || []).length;
  };

  if (!content || content.trim() === '') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <p className="text-gray-600">{t('documents.emptyDocument')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DOCX Header Info */}
      <div className={cn(
        "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200",
        isMobile ? "p-3" : "p-4"
      )}>
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <span className="text-2xl">📝</span>
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
              {getWordCount().toLocaleString()} {t('documents.words')}
              {headings.length > 0 && ` • ${headings.length} ${t('documents.headings')}`}
              {searchTerm && getSearchResults() > 0 && (
                <span className="text-blue-600">
                  {' • '}{getSearchResults()} {t('documents.matches')}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={cn(
        "bg-white rounded-lg border border-gray-200 space-y-4",
        isMobile ? "p-3" : "p-4"
      )}>
        {/* Search and Font Size */}
        <div className={cn(
          "flex gap-4",
          isMobile ? "flex-col" : "flex-row items-center justify-between"
        )}>
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('documents.searchDocument')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  isMobile ? "py-2 text-sm" : "py-2.5"
                )}
              />
            </div>
          </div>

          {/* Font Size and Outline Toggle */}
          <div className="flex items-center space-x-4">
            {/* Font Size */}
            <div className="flex items-center space-x-2">
              <label className={cn(
                "text-gray-700 font-medium",
                isMobile ? "text-sm" : "text-base"
              )}>
                {t('documents.fontSize')}:
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
                className={cn(
                  "border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  isMobile ? "px-2 py-1 text-sm" : "px-3 py-2"
                )}
              >
                <option value="small">{t('documents.small')}</option>
                <option value="medium">{t('documents.medium')}</option>
                <option value="large">{t('documents.large')}</option>
              </select>
            </div>

            {/* Outline Toggle */}
            {headings.length > 0 && (
              <button
                onClick={() => setShowOutline(!showOutline)}
                className={cn(
                  "px-3 py-2 rounded-lg font-medium transition-colors",
                  isMobile ? "text-sm" : "text-base",
                  showOutline
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {t('documents.outline')}
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchTerm && (
          <div className="border-t border-gray-200 pt-4">
            <p className={cn(
              "text-gray-600",
              isMobile ? "text-sm" : "text-base"
            )}>
              {getSearchResults() > 0 
                ? t('documents.searchResults', { count: getSearchResults().toString(), term: searchTerm })
                : t('documents.noSearchResults')
              }
            </p>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className={cn(
        "flex gap-4",
        isMobile ? "flex-col" : "flex-row"
      )}>
        {/* Outline Sidebar */}
        {showOutline && headings.length > 0 && (
          <div className={cn(
            "bg-white rounded-lg border border-gray-200 overflow-hidden",
            isMobile ? "w-full" : "w-64 flex-shrink-0"
          )}>
            <div className={cn(
              "bg-gray-50 border-b border-gray-200",
              isMobile ? "px-3 py-2" : "px-4 py-3"
            )}>
              <h3 className={cn(
                "font-semibold text-gray-900",
                isMobile ? "text-sm" : "text-base"
              )}>
                {t('documents.tableOfContents')}
              </h3>
            </div>
            <div className={cn(
              "overflow-y-auto",
              isMobile ? "max-h-48 p-2" : "max-h-96 p-3"
            )}>
              <nav className="space-y-1">
                {headings.map((heading, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToHeading(heading.id)}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors",
                      isMobile ? "text-xs" : "text-sm",
                      `ml-${(heading.level - 1) * 2}` // Indent based on heading level
                    )}
                    style={{ marginLeft: `${(heading.level - 1) * 0.5}rem` }}
                  >
                    <span className="text-gray-600 truncate block">
                      {heading.text}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Document Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className={cn(
              "overflow-y-auto",
              isMobile ? "max-h-64 p-4" : "max-h-96 p-8"
            )}>
              <div 
                className={cn(
                  "prose max-w-none",
                  getFontSizeClass(),
                  "prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900",
                  "prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700",
                  "prose-a:text-blue-600 prose-a:hover:text-blue-800",
                  "prose-blockquote:text-gray-600 prose-blockquote:border-gray-300",
                  "prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
                  "prose-pre:bg-gray-100 prose-pre:text-gray-800"
                )}
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 