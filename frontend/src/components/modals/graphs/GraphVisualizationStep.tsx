import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, Save, X } from 'lucide-react';
import { useLanguageStore } from '../../../shared/stores/languageStore';
import { graphsAPI, GraphCreateRequest } from '../../../shared/api/graphsAPI';
import { SelectedFile } from '../GraphsModal';

interface GraphVisualizationStepProps {
  selectedFiles: SelectedFile[];
  onGraphSaved?: () => void;
}

const GraphVisualizationStep: React.FC<GraphVisualizationStepProps> = ({
  selectedFiles,
  onGraphSaved
}) => {
  const { t } = useLanguageStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [graphName, setGraphName] = useState('');
  const [graphDescription, setGraphDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Create initial nodes from selected files
  const initialNodes: Node[] = useMemo(() => {
    return selectedFiles.map((file, index) => {
      const angle = (index / selectedFiles.length) * 2 * Math.PI;
      const radius = Math.min(200, 50 + selectedFiles.length * 20);
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      return {
        id: file.id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="text-center">
              <div className="font-medium text-sm truncate max-w-[120px]" title={file.name}>
                {file.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {file.type.toUpperCase()}
              </div>
            </div>
          ),
        },
        style: {
          background: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '10px',
          minWidth: '140px',
          fontSize: '12px',
        },
      };
    });
  }, [selectedFiles]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleDownload = () => {
    const graphData = {
      nodes: nodes.map(node => ({
        id: node.id,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      files: selectedFiles,
    };

    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `file-network-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSave = () => {
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async () => {
    if (!graphName.trim()) {
      alert(t('graphs.pleaseEnterName'));
      return;
    }

    setIsSaving(true);
    try {
      const graphData: GraphCreateRequest = {
        name: graphName.trim(),
        description: graphDescription.trim() || undefined,
        nodes: nodes.map(node => ({
          id: node.id,
          position: node.position,
          data: node.data,
          style: node.style,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          style: edge.style,
        })),
        files: selectedFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        })),
        tags: [],
      };

      const response = await graphsAPI.createGraph(graphData);
      
      if (response.success) {
        alert(t('graphs.graphSavedSuccessfully'));
        setShowSaveModal(false);
        setGraphName('');
        setGraphDescription('');
        onGraphSaved?.();
      } else {
        alert(t('graphs.errorSavingGraph') + ': ' + response.message);
      }
    } catch (error) {
      console.error('Error saving graph:', error);
      alert(t('graphs.errorSavingGraph') + ': ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCancel = () => {
    setShowSaveModal(false);
    setGraphName('');
    setGraphDescription('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{t('graphs.selectedFiles')}: {selectedFiles.length}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('graphs.dragToConnect')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {t('graphs.saveGraph')}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('graphs.downloadGraph')}
            </button>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap 
            nodeColor="#3b82f6"
            nodeStrokeWidth={3}
            zoomable
            pannable
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={12} 
            size={1} 
            color="#e5e7eb"
          />
        </ReactFlow>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border-t">
        <div className="flex items-center justify-center">
          <p className="text-sm text-blue-700 text-center">
            💡 {t('graphs.connectNodes')} - {t('graphs.dragToConnect')}
          </p>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('graphs.saveGraph')}</h3>
              <button
                onClick={handleSaveCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('graphs.graphName')} *
                </label>
                <input
                  type="text"
                  value={graphName}
                  onChange={(e) => setGraphName(e.target.value)}
                  placeholder={t('graphs.enterGraphName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('graphs.description')}
                </label>
                <textarea
                  value={graphDescription}
                  onChange={(e) => setGraphDescription(e.target.value)}
                  placeholder={t('graphs.enterDescription')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isSaving}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveConfirm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={isSaving || !graphName.trim()}
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualizationStep;