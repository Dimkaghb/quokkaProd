import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import { useLanguageStore } from '../../../shared/stores/languageStore';
import { SelectedFile } from '../GraphsModal';
import DocumentSelectionModal from '../../../shared/components/DocumentSelectionModal';
import type { UserDocument } from '../../../shared/api/documentsAPI';

interface FileSelectionStepProps {
  onFilesSelected: (files: SelectedFile[]) => void;
  selectedFiles: SelectedFile[];
}

const FileSelectionStep: React.FC<FileSelectionStepProps> = ({
  onFilesSelected,
  selectedFiles
}) => {
  const { t } = useLanguageStore();
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<UserDocument[]>([]);

  const handleDocumentSelection = (documents: UserDocument[], _query?: string) => {
    setSelectedDocuments(documents);
    const selectedFileData = documents.map(doc => ({
      id: doc.id,
      name: doc.original_filename,
      type: doc.file_type,
      size: doc.file_size,
      uploadedAt: doc.created_at
    }));
    onFilesSelected(selectedFileData);
    setShowDocumentModal(false);
  };

  const handleRemoveFile = (fileId: string) => {
    const newSelectedDocuments = selectedDocuments.filter(doc => doc.id !== fileId);
    setSelectedDocuments(newSelectedDocuments);
    const newSelectedFiles = selectedFiles.filter(file => file.id !== fileId);
    onFilesSelected(newSelectedFiles);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'xlsx':
      case 'xls':
        return '📊';
      case 'csv':
        return '📈';
      case 'txt':
      case 'md':
        return '📝';
      case 'json':
        return '📋';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">{t('graphs.fileSelection')}</h3>
        <p className="text-gray-600">{t('graphs.selectFilesToVisualize')}</p>
      </div>

      {/* File Selection Button */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          {selectedFiles.length === 0 
            ? t('graphs.selectDocuments') 
            : t('graphs.documentsSelected').replace('{count}', selectedFiles.length.toString())
          }
        </h4>
        <p className="text-gray-600 mb-4">
          {selectedFiles.length === 0 
            ? t('graphs.selectDocumentsDescription') 
            : t('graphs.clickToModifySelection')
          }
        </p>
        <button
          onClick={() => setShowDocumentModal(true)}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          {selectedFiles.length === 0 ? t('graphs.chooseFiles') : t('graphs.modifySelection')}
        </button>
      </div>

      {/* Selected Files Display */}
      {selectedFiles.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('graphs.selectedFiles')}
          </h4>
          <div className="space-y-3">
            {selectedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border"
              >
                <div className="text-xl">{getFileIcon(file.type)}</div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </h5>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.type.toUpperCase()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title={t('graphs.removeFile')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedFiles.length > 0 
              ? `${selectedFiles.length} ${t('documents.documentsSelected').replace('{count}', selectedFiles.length.toString())}`
              : t('graphs.noFilesSelected')
            }
          </p>
          <button
            onClick={() => onFilesSelected(selectedFiles)}
            disabled={selectedFiles.length === 0}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors
              ${selectedFiles.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {t('graphs.createGraph')}
          </button>
        </div>
      </div>

      {/* Document Selection Modal */}
      {showDocumentModal && (
        <DocumentSelectionModal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          onConfirm={handleDocumentSelection}
          initialQuery=""
        />
      )}
    </div>
  );
};

export default FileSelectionStep;