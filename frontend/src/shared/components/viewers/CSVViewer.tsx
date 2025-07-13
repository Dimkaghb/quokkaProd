import React, { useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { useLanguageStore } from '../../stores/languageStore';

interface CSVViewerProps {
  data: any[][];
  filename: string;
  isMobile?: boolean;
}

export const CSVViewer: React.FC<CSVViewerProps> = ({
  data,
  filename,
  isMobile = false
}) => {
  const { t } = useLanguageStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 10 : 20);

  // Get headers and data rows
  const headers = data.length > 0 ? data[0] : [];
  const rows = data.length > 1 ? data.slice(1) : [];

  // Filter data based on search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    
    return rows.filter(row =>
      row.some(cell =>
        String(cell || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [rows, searchTerm]);

  // Sort data
  const sortedRows = useMemo(() => {
    if (sortColumn === null) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aVal = String(a[sortColumn] || '');
      const bVal = String(b[sortColumn] || '');
      
      // Try to parse as numbers for numeric sorting
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // String sorting
      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <p className="text-gray-600">{t('documents.emptyCsv')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CSV Header Info */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 rounded-lg p-2">
            <span className="text-2xl">📊</span>
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
              {rows.length.toLocaleString()} {t('documents.rows')} • {headers.length} {t('documents.columns')}
              {filteredRows.length !== rows.length && (
                <span className="text-blue-600">
                  {' • '}{filteredRows.length.toLocaleString()} {t('documents.filtered')}
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
        {/* Search and Rows per page */}
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
                placeholder={t('documents.searchCsv')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  isMobile ? "py-2 text-sm" : "py-2.5"
                )}
              />
            </div>
          </div>

          {/* Rows per page */}
          <div className="flex items-center space-x-2">
            <label className={cn(
              "text-gray-700 font-medium",
              isMobile ? "text-sm" : "text-base"
            )}>
              {t('documents.rowsPerPage')}:
            </label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={cn(
                "border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                isMobile ? "px-2 py-1 text-sm" : "px-3 py-2"
              )}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Pagination Info */}
        {totalPages > 1 && (
          <div className={cn(
            "flex justify-between items-center border-t border-gray-200 pt-4",
            isMobile ? "text-sm" : "text-base"
          )}>
            <span className="text-gray-600">
              {t('documents.showingResults', {
                start: ((currentPage - 1) * rowsPerPage + 1).toString(),
                end: Math.min(currentPage * rowsPerPage, filteredRows.length).toString(),
                total: filteredRows.length.toString()
              })}
            </span>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={cn(
                  "px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                  isMobile ? "text-sm" : "text-base"
                )}
              >
                {t('documents.previous')}
              </button>
              
              <span className="text-gray-600">
                {t('documents.pageOf', { current: currentPage.toString(), total: totalPages.toString() })}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={cn(
                  "px-3 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                  isMobile ? "text-sm" : "text-base"
                )}
              >
                {t('documents.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className={cn(
          "overflow-auto",
          isMobile ? "max-h-64" : "max-h-96"
        )}>
          <table className="min-w-full">
            {/* Headers */}
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    onClick={() => handleSort(index)}
                    className={cn(
                      "border-b border-gray-200 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors select-none",
                      isMobile ? "px-2 py-2 text-xs" : "px-4 py-3 text-sm"
                    )}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="truncate">
                        {header || `${t('documents.column')} ${index + 1}`}
                      </span>
                      {sortColumn === index && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {paginatedRows.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  )}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        "border-b border-gray-200 text-gray-700",
                        isMobile ? "px-2 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
                      )}
                    >
                      <div className="truncate max-w-xs" title={String(cell || '')}>
                        {cell !== null && cell !== undefined ? String(cell) : ''}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              
              {paginatedRows.length === 0 && (
                <tr>
                  <td 
                    colSpan={headers.length} 
                    className="text-center py-8 text-gray-500"
                  >
                    {searchTerm ? t('documents.noSearchResults') : t('documents.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 