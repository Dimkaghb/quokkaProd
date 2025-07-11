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
      name: t('Remove Duplicates'),
      description: t('Remove Duplicates Description'),
      icon: Trash2
    },
    {
      id: 'handle_missing',
      name: t('Handle Missing'),
      description: t('Handle Missing Description'),
      icon: AlertCircle
    },
    {
      id: 'standardize_format',
      name: t('Standardize Format'),
      description: t('Standardize Format Description'),
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
        const result = await dataCleaningAPI.addToDocuments(cleaningResult.fileName);
        
        // Show success message
        alert(`${t('Add to Documents Success')}: ${result.original_name}`);
        
        // Close modal after successful addition
        handleClose();
      } catch (error) {
        console.error('Failed to add to documents:', error);
        alert(t('Add to Documents Error'));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (cleaningResult?.fileName) {
      try {
        setIsUploading(true);
        await dataCleaningAPI.cancelAndCleanup(cleaningResult.fileName);
        
        // Show success message and close modal
        alert(t('Cancel Success'));
        handleClose();
      } catch (error) {
        console.error('Failed to cancel and cleanup:', error);
        alert(t('Cancel Error'));
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>{t('Data Cleaning')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">{t('Upload File')}</h3>
              
              {!file ? (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">{t('Drop File')}</p>
                  <p className="text-sm text-gray-600 mb-4">{t('Or Click Browse')}</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-2"
                  >
                    {t('Select File')}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {t('Supported Formats')}: CSV, Excel (.xlsx, .xls)
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
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
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
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cleaning Operations Section */}
          {file && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">{t('Select Operations')}</h3>
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
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => handleOperationToggle(operation.id)}
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                            isSelected 
                              ? "bg-blue-600 border-blue-600" 
                              : "border-gray-300"
                          )}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <Icon className={cn(
                          "w-5 h-5 mt-1",
                          isSelected ? "text-blue-600" : "text-gray-400"
                        )} />
                        <div className="flex-1">
                          <p className="font-medium">{operation.name}</p>
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
            <Card>
              <CardContent className="p-6">
                {cleaningResult.success ? (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-green-800 mb-2">
                      {t('Cleaning Success')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {t('Cleaning Success Description')}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* Download Button */}
                      <Button 
                        onClick={handleDownload} 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isUploading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('Download Cleaned File')}
                      </Button>

                      {/* Add to Documents Button */}
                      <Button 
                        onClick={handleAddToDocuments} 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 mr-2" />
                        )}
                        {t('Add to Documents')}
                      </Button>

                      {/* Cancel Button */}
                      <Button 
                        onClick={handleCancel} 
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <X className="w-4 h-4 mr-2" />
                        )}
                        {t('Cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-red-800 mb-2">
                      {t('Cleaning Failed')}
                    </h3>
                    <p className="text-gray-600">
                      {cleaningResult.error || t('Cleaning Error')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            {file && selectedOperations.length > 0 && !cleaningResult && (
              <Button 
                onClick={handleCleanData} 
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('Cleaning')}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {t('Clean Data')}
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