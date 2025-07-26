import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from './Toast';
import { Upload, FileText, X, Settings, Download, CheckCircle } from 'lucide-react';
import { dataReportAPI, type DataReportRequest } from '../api/dataReportAPI';
import { useLanguageStore } from '../stores/languageStore';

interface QuickDataReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickDataReportModal: React.FC<QuickDataReportModalProps> = ({
  isOpen,
  onClose
}) => {
  const { showToast } = useToast();
  const { t } = useLanguageStore();
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [dataFileId, setDataFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [supportedFormats, setSupportedFormats] = useState<{
    preview_formats: string[];
    data_formats: string[];
  } | null>(null);
  
  // Report status tracking
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [reportProgress, setReportProgress] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  
  // Simplified LLM Configuration - OpenAI only
  const [llmModel, setLlmModel] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  const previewFileInputRef = useRef<HTMLInputElement>(null);
  const dataFileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  // Load supported formats on mount
  useEffect(() => {
    const loadSupportedFormats = async () => {
      try {
        const formats = await dataReportAPI.getSupportedFormats();
        if (formats.success) {
          setSupportedFormats({
            preview_formats: formats.preview_formats,
            data_formats: formats.data_formats
          });
        }
      } catch (error) {
        console.error('Failed to load supported formats:', error);
      }
    };

    if (isOpen) {
      loadSupportedFormats();
    }
  }, [isOpen]);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start polling for report status
  const startPolling = (reportId: string) => {
    setIsPolling(true);
    setReportProgress(10);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await dataReportAPI.getReportStatus(reportId);
        setReportStatus(status.status);
        setReportProgress(status.progress || 50);
        
        if (status.status === 'completed' || status.status === 'failed') {
          setIsPolling(false);
          setIsGenerating(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          if (status.status === 'completed') {
            setReportProgress(100);
          }
        }
      } catch (error) {
        console.error('Error polling report status:', error);
        setIsPolling(false);
        setIsGenerating(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  const handlePreviewFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      setIsUploading(true);
      try {
        const response = await dataReportAPI.uploadFile(file, 'preview');
        if (response.success) {
          setPreviewFileId(response.file_id);
          showToast(t('quickDataReport.previewFileUploadedSuccessfully'), 'success');
        } else {
          throw new Error(response.message);
        }
      } catch (error: any) {
        console.error('Error uploading preview file:', error);
        showToast(error.response?.data?.detail || t('quickDataReport.failedToUploadPreviewFile'), 'error');
        setPreviewFile(null);
        if (previewFileInputRef.current) {
          previewFileInputRef.current.value = '';
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDataFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDataFile(file);
      setIsUploading(true);
      try {
        const response = await dataReportAPI.uploadFile(file, 'data');
        if (response.success) {
          setDataFileId(response.file_id);
          showToast(t('quickDataReport.dataFileUploadedSuccessfully'), 'success');
        } else {
          throw new Error(response.message);
        }
      } catch (error: any) {
        console.error('Error uploading data file:', error);
        showToast(error.response?.data?.detail || t('quickDataReport.failedToUploadDataFile'), 'error');
        setDataFile(null);
        if (dataFileInputRef.current) {
          dataFileInputRef.current.value = '';
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemovePreviewFile = () => {
    setPreviewFile(null);
    setPreviewFileId(null);
    if (previewFileInputRef.current) {
      previewFileInputRef.current.value = '';
    }
  };

  const handleRemoveDataFile = () => {
    setDataFile(null);
    setDataFileId(null);
    if (dataFileInputRef.current) {
      dataFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!previewFileId || !dataFileId) {
      showToast(t('quickDataReport.pleaseUploadBothFiles'), 'error');
      return;
    }

    setIsGenerating(true);
    
    try {
      const request: DataReportRequest = {
        preview_file_id: previewFileId,
        data_file_id: dataFileId,
        llm_provider: 'openai',
        ...(llmModel && { llm_model: llmModel }),
        ...(customPrompt && { custom_prompt: customPrompt }),
      };

      const response = await dataReportAPI.generateReport(request);
      
      if (response.success) {
        setReportId(response.report_id);
        setReportStatus('pending');
        startPolling(response.report_id);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Error generating data report:', error);
      showToast(error.response?.data?.detail || t('quickDataReport.failedToGenerateReport'), 'error');
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!reportId) return;
    
    try {
      await dataReportAPI.downloadReport(reportId);
    } catch (error: any) {
      console.error('Error downloading report:', error);
      showToast(t('quickDataReport.failedToDownloadReport'), 'error');
    }
  };

  const resetForm = () => {
    setPreviewFile(null);
    setDataFile(null);
    setPreviewFileId(null);
    setDataFileId(null);
    setLlmModel('');
    setCustomPrompt('');
    setShowAdvanced(false);
    setReportId(null);
    setReportStatus(null);
    setReportProgress(0);
    setIsPolling(false);
    setIsGenerating(false);
    if (previewFileInputRef.current) previewFileInputRef.current.value = '';
    if (dataFileInputRef.current) dataFileInputRef.current.value = '';
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusMessage = () => {
    switch (reportStatus) {
      case 'pending':
        return t('quickDataReport.reportGenerationQueued');
      case 'processing':
        return t('quickDataReport.analyzingDataGeneratingReport');
      case 'completed':
        return t('quickDataReport.reportGeneratedSuccessfully');
      case 'failed':
        return t('quickDataReport.reportGenerationFailed');
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t('quickDataReport.generateDataReport')}
          </DialogTitle>
          <DialogDescription>
            {t('quickDataReport.uploadPreviewAndDataFile')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Report Status Section */}
          {reportStatus && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-blue-900">{t('quickDataReport.reportStatus')}</h3>
                {reportStatus === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              
              <p className="text-sm text-blue-700">{getStatusMessage()}</p>
              
              {(isGenerating || isPolling) && reportStatus !== 'completed' && (
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${reportProgress}%` }}
                  />
                </div>
              )}
              
              {reportStatus === 'completed' && (
                <Button
                  onClick={handleDownload}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('quickDataReport.downloadReport')}
                </Button>
              )}
            </div>
          )}

          {/* Only show file upload sections if report is not being generated */}
          {!isGenerating && !reportStatus && (
            <>
              {/* Preview File Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {t('quickDataReport.previewFile')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                
                {!previewFile ? (
                  <div
                    onClick={() => previewFileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {t('quickDataReport.clickToUploadPreview')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {supportedFormats?.preview_formats.join(', ') || 'PDF, DOCX, TXT'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{previewFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(previewFile.size)}</p>
                        {previewFileId && (
                          <p className="text-xs text-green-600">{t('quickDataReport.uploadedSuccessfully')}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePreviewFile}
                      className="text-gray-400 hover:text-red-500"
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <input
                  ref={previewFileInputRef}
                  type="file"
                  accept={supportedFormats?.preview_formats.map(f => `.${f}`).join(',') || '.pdf,.docx,.txt'}
                  onChange={handlePreviewFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>

              {/* Data File Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {t('quickDataReport.dataFile')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                
                {!dataFile ? (
                  <div
                    onClick={() => dataFileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {t('quickDataReport.clickToUploadData')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {supportedFormats?.data_formats.join(', ') || 'CSV, XLSX, JSON'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dataFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(dataFile.size)}</p>
                        {dataFileId && (
                          <p className="text-xs text-green-600">{t('quickDataReport.uploadedSuccessfully')}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveDataFile}
                      className="text-gray-400 hover:text-red-500"
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <input
                  ref={dataFileInputRef}
                  type="file"
                  accept={supportedFormats?.data_formats.map(f => `.${f}`).join(',') || '.csv,.xlsx,.json'}
                  onChange={handleDataFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>

              {/* Advanced Configuration */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{t('quickDataReport.advancedSettings')}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {showAdvanced ? t('quickDataReport.hideAdvanced') : t('quickDataReport.showAdvanced')}
                  </Button>
                </div>

                {/* Advanced Settings */}
                {showAdvanced && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    {/* Model Selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('quickDataReport.openaiModel')}
                      </label>
                      <Input
                        value={llmModel}
                        onChange={(e) => setLlmModel(e.target.value)}
                        placeholder={t('quickDataReport.openaiModelPlaceholder')}
                      />
                    </div>

                    {/* Custom Prompt */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('quickDataReport.customPrompt')}
                      </label>
                      <Textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder={t('quickDataReport.customPromptPlaceholder')}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading || (isGenerating && reportStatus !== 'completed')}
            >
              {reportStatus === 'completed' ? t('quickDataReport.close') : t('quickDataReport.cancel')}
            </Button>
            {!reportStatus && (
              <Button
                onClick={handleSubmit}
                disabled={!previewFileId || !dataFileId || isUploading || isGenerating}
                className="bg-black hover:bg-gray-800"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('quickDataReport.uploading')}
                  </>
                ) : isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('quickDataReport.generatingReport')}
                  </>
                ) : (
                  t('quickDataReport.generateReport')
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};