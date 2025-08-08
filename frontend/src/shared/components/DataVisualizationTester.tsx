import React, { useState } from 'react';
import { dataAnalysisAPI, VisualizationResult } from '../api/dataAnalysisAPI';
import { VisualizationChart } from './VisualizationChart';
import { useLanguageStore } from '../stores/languageStore';

export const DataVisualizationTester: React.FC = () => {
  const { t } = useLanguageStore();
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [visualization, setVisualization] = useState<VisualizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await dataAnalysisAPI.publicTestVisualization(file, query);
      setVisualization(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgain = () => {
    setFile(null);
    setQuery('');
    setVisualization(null);
    setError(null);
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      {!visualization ? (
        <div className="space-y-6">
          {/* File Input */}
          <div className="relative">
            <div
              className={`border-2 border-dashed border-black rounded-lg p-16 text-center cursor-pointer transition-all duration-300 ${
                loading ? 'blur-sm pointer-events-none' : 'hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => !loading && document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.txt,.docx"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
              
              <div className="space-y-6">
                <div className="text-2xl font-medium text-black">
                  {file ? file.name : t('landing.fileInput.dropFileHere')}
                </div>
                <div className="text-lg text-gray-600">
                  {t('landing.fileInput.orClickToBrowse')}
                </div>
                <div className="text-sm text-gray-500">
                  {t('landing.fileInput.supportedFormats')}
                </div>
              </div>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              </div>
            )}
          </div>

          {/* Query Input - appears after file is selected */}
          {file && (
            <div className={`transition-all duration-300 ${loading ? 'blur-sm' : ''}`}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('landing.fileInput.visualizationPrompt')}
                className="w-full px-4 py-3 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder-gray-500"
                disabled={loading}
              />
            </div>
          )}

          {/* Create Button - appears after file is selected */}
          {file && (
            <div className={`transition-all duration-300 ${loading ? 'blur-sm' : ''}`}>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('landing.fileInput.creatingVisualization') : t('landing.fileInput.createVisualization')}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      ) : (
        /* Visualization Display */
        <div className="space-y-6">
          {visualization.chart_config && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <VisualizationChart chartConfig={visualization.chart_config} />
            </div>
          )}

          {/* Analytical Text */}
          {visualization.analytical_text && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-medium text-black mb-3">{t('landing.fileInput.analysis')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {visualization.analytical_text}
              </p>
            </div>
          )}

          {/* Create Again Button */}
          <div className="text-center">
            <button
              onClick={handleCreateAgain}
              className="bg-black text-white py-3 px-8 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200"
            >
              {t('landing.fileInput.createAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};