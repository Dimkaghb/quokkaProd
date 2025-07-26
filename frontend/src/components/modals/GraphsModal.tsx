import React, { useState } from 'react';
import { X, ArrowLeft, List, Plus } from 'lucide-react';
import { useLanguageStore } from '../../shared/stores/languageStore';
import FileSelectionStep from './graphs/FileSelectionStep';
import GraphVisualizationStep from './graphs/GraphVisualizationStep';
import GraphsListStep from './graphs/GraphsListStep';
import GraphViewerStep from './graphs/GraphViewerStep';

interface GraphsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SelectedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
};

type ModalStep = 'graphsList' | 'fileSelection' | 'graphVisualization' | 'graphViewer';

const GraphsModal: React.FC<GraphsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguageStore();
  const [currentStep, setCurrentStep] = useState<ModalStep>('graphsList');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [refreshGraphsList, setRefreshGraphsList] = useState(0);

  if (!isOpen) return null;

  const handleFileSelection = (files: SelectedFile[]) => {
    setSelectedFiles(files);
    setCurrentStep('graphVisualization');
  };

  const handleGraphSelect = (graphId: string) => {
    setSelectedGraphId(graphId);
    setCurrentStep('graphViewer');
  };

  const handleGraphSaved = () => {
    // Refresh the graphs list and go back to it
    setRefreshGraphsList(prev => prev + 1);
    setCurrentStep('graphsList');
    setSelectedFiles([]);
  };

  const handleGraphUpdated = () => {
    // Refresh the graphs list
    setRefreshGraphsList(prev => prev + 1);
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'graphVisualization':
        setCurrentStep('fileSelection');
        break;
      case 'fileSelection':
        setCurrentStep('graphsList');
        setSelectedFiles([]);
        break;
      case 'graphViewer':
        setCurrentStep('graphsList');
        setSelectedGraphId(null);
        break;
      default:
        onClose();
    }
  };

  const handleClose = () => {
    setCurrentStep('graphsList');
    setSelectedFiles([]);
    setSelectedGraphId(null);
    onClose();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'graphsList':
        return t('graphs.savedGraphs');
      case 'fileSelection':
        return t('graphs.selectFiles');
      case 'graphVisualization':
        return t('graphs.createGraph');
      case 'graphViewer':
        return t('graphs.viewGraph');
      default:
        return t('graphs.title');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            {currentStep !== 'graphsList' && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold">
              {getStepTitle()}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep === 'graphsList' && (
              <button
                onClick={() => setCurrentStep('fileSelection')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('graphs.createNew')}
              </button>
            )}
            {currentStep !== 'graphsList' && (
              <button
                onClick={() => {
                  setCurrentStep('graphsList');
                  setSelectedFiles([]);
                  setSelectedGraphId(null);
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <List className="w-4 h-4" />
                {t('graphs.viewAll')}
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'graphsList' && (
            <GraphsListStep
              onGraphSelect={handleGraphSelect}
              onRefresh={refreshGraphsList > 0 ? () => {} : undefined}
            />
          )}
          {currentStep === 'fileSelection' && (
            <FileSelectionStep
              onFilesSelected={handleFileSelection}
              selectedFiles={selectedFiles}
            />
          )}
          {currentStep === 'graphVisualization' && (
            <GraphVisualizationStep
              selectedFiles={selectedFiles}
              onGraphSaved={handleGraphSaved}
            />
          )}
          {currentStep === 'graphViewer' && selectedGraphId && (
            <GraphViewerStep
              graphId={selectedGraphId}
              onBack={() => setCurrentStep('graphsList')}
              onGraphUpdated={handleGraphUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphsModal;