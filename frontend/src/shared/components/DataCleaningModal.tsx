import React, { useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  X,
  FileText,
  Trash2,
  Zap,
  Loader2
} from 'lucide-react';
import { useLanguageStore } from '../stores/languageStore';
import { dataCleaningAPI } from '../api/dataCleaningAPI';

interface DataCleaningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CleaningOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CleaningResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  originalFileName?: string;
  error?: string;
}

export const DataCleaningModal: React.FC<DataCleaningModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguageStore();
  const [file, setFile] = useState<File | null>(null);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleaningOperations: CleaningOperation[] = [
    {
      id: 'remove_duplicates',
      name: t('dataCleaning.removeDuplicates'),
      description: t('dataCleaning.removeDuplicatesDesc'),
      icon: Trash2
    },
    {
      id: 'handle_missing',
      name: t('dataCleaning.handleMissing'),
      description: t('dataCleaning.handleMissingDesc'),
      icon: AlertCircle
    },
    {
      id: 'standardize_format',
      name: t('dataCleaning.standardizeFormat'),
      description: t('dataCleaning.standardizeFormatDesc'),
      icon: Zap
    }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFile(droppedFile)) {
        setFile(droppedFile);
        setCleaningResult(null);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (isValidFile(selectedFile)) {
        setFile(selectedFile);
        setCleaningResult(null);
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    
    return allowedTypes.includes(file.type) || allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const handleOperationToggle = (operationId: string) => {
    setSelectedOperations(prev => 
      prev.includes(operationId) 
        ? prev.filter(id => id !== operationId)
        : [...prev, operationId]
    );
  };

  const handleCleanData = async () => {
    if (!file || selectedOperations.length === 0) return;

    setIsUploading(true);
    setCleaningResult(null);

    try {
      const result = await dataCleaningAPI.uploadAndClean(file, selectedOperations);

      if (result.success) {
        setCleaningResult({
          success: true,
          downloadUrl: result.download_url,
          fileName: result.file_info?.cleaned_filename,
          originalFileName: result.file_info?.original_filename
        });
      } else {
        setCleaningResult({
          success: false,
          error: result.error || t('CleaningFailed')
        });
      }
    } catch (error: any) {
      console.error('Error cleaning data:', error);
      
      // Better error handling
      let errorMessage = t('Cleaning Error');
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCleaningResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (cleaningResult?.fileName) {
      try {
        await dataCleaningAPI.triggerDownload(
          cleaningResult.fileName,
          cleaningResult.originalFileName ? 
            `cleaned_${cleaningResult.originalFileName}` : 
            cleaningResult.fileName
        );
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback to direct URL download
        if (cleaningResult.downloadUrl) {
          const link = document.createElement('a');
          link.href = dataCleaningAPI.getDownloadUrl(cleaningResult.fileName);
          link.download = cleaningResult.originalFileName ? 
            `cleaned_${cleaningResult.originalFileName}` : 
            cleaningResult.fileName;
          link.click();
        }
      }
    }
  };

  const handleAddToDocuments = async () => {
    if (cleaningResult?.fileName) {
      try {
        setIsUploading(true);
        // Show development message instead of actual API call
        alert(t('dataCleaning.featureUnderDevelopment'));
        
        // Simulate API call for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Close modal after showing message
        handleClose();
      } catch (error) {
        console.error('Failed to add to documents:', error);
        alert(t('dataCleaning.addToDocumentsError'));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (cleaningResult?.fileName) {
      try {
        setIsUploading(true);
        // Show development message instead of actual API call
        alert(t('dataCleaning.featureUnderDevelopment'));
        
        // Simulate API call for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show success message and close modal
        handleClose();
      } catch (error) {
        console.error('Failed to cancel and cleanup:', error);
        alert(t('dataCleaning.cancelError'));
      } finally {
        setIsUploading(false);
      }
    } else {
      // If no file to clean up, just close
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setSelectedOperations([]);
    setCleaningResult(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-gray-900">
            <Zap className="w-5 h-5 text-gray-700" />
            <span>{t('dataCleaning.title')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-gray-900">{t('dataCleaning.uploadFile')}</h3>
              
              {!file ? (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:border-gray-400"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2 text-gray-900">{t('dataCleaning.dropFileHere')}</p>
                  <p className="text-sm text-gray-600 mb-4">{t('dataCleaning.orClickToBrowse')}</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-2 bg-gray-900 hover:bg-gray-800 text-white border-0"
                  >
                    {t('dataCleaning.selectFile')}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {t('dataCleaning.supportedFormats')}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-gray-700" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024 / 1024).toFixed(2)} {t('dataCleaning.mb')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setCleaningResult(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cleaning Operations Section */}
          {file && (
            <Card className="border border-gray-200 bg-white">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-gray-900">{t('dataCleaning.selectOperations')}</h3>
                <div className="space-y-3">
                  {cleaningOperations.map((operation) => {
                    const Icon = operation.icon;
                    const isSelected = selectedOperations.includes(operation.id);
                    
                    return (
                      <div
                        key={operation.id}
                        className={cn(
                          "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all",
                          isSelected 
                            ? "border-gray-900 bg-gray-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => handleOperationToggle(operation.id)}
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                            isSelected 
                              ? "bg-gray-900 border-gray-900" 
                              : "border-gray-300 bg-white"
                          )}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <Icon className={cn(
                          "w-5 h-5 mt-1",
                          isSelected ? "text-gray-900" : "text-gray-400"
                        )} />
                        <div className="flex-1">
                          <p className={cn("font-medium", isSelected ? "text-gray-900" : "text-gray-700")}>{operation.name}</p>
                          <p className="text-sm text-gray-600">{operation.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {cleaningResult && (
            <Card className="border border-gray-200 bg-white">
              <CardContent className="p-6">
                {cleaningResult.success ? (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {t('dataCleaning.dataCleanedSuccessfully')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {t('dataCleaning.dataProcessedReady')}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* Download Button */}
                      <Button 
                        onClick={handleDownload} 
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white border-0"
                        disabled={isUploading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('dataCleaning.downloadCleanedFile')}
                      </Button>

                      {/* Add to Documents Button */}
                      <Button 
                        onClick={handleAddToDocuments} 
                        className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 mr-2" />
                        )}
                        {t('dataCleaning.addToDocuments')}
                      </Button>

                      {/* Cancel Button */}
                      <Button 
                        onClick={handleCancel} 
                        variant="outline"
                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <X className="w-4 h-4 mr-2" />
                        )}
                        {t('dataCleaning.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {t('dataCleaning.cleaningFailed')}
                    </h3>
                    <p className="text-gray-600">
                      {cleaningResult.error || t('dataCleaning.errorProcessingData')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {t('dataCleaning.cancel')}
            </Button>
            {file && selectedOperations.length > 0 && !cleaningResult && (
              <Button 
                onClick={handleCleanData} 
                disabled={isUploading}
                className="bg-gray-900 hover:bg-gray-800 text-white border-0"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('dataCleaning.processing')}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {t('dataCleaning.cleanData')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};