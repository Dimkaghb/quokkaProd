import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  ConnectionMode,
  Node as ReactFlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Download, Edit, Save, X } from 'lucide-react';
import { useLanguageStore } from '../../../shared/stores/languageStore';
import { graphsAPI, UserGraph, GraphUpdateRequest } from '../../../shared/api/graphsAPI';

interface GraphViewerStepProps {
  graphId: string;
  onBack: () => void;
  onGraphUpdated?: () => void;
}

const GraphViewerStep: React.FC<GraphViewerStepProps> = ({
  graphId,
  onBack,
  onGraphUpdated
}) => {
  const { t } = useLanguageStore();
  const [graph, setGraph] = useState<UserGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Utility function to process node data and handle React element objects
  const processNodeData = (nodeData: any) => {
    const processedData = { ...nodeData };
    
    // If label is a React element object, extract the text content
    if (processedData.label && typeof processedData.label === 'object' && processedData.label.props) {
      // Try to extract text from React element structure
      if (processedData.label.props.children) {
        if (Array.isArray(processedData.label.props.children)) {
          // Find the first text child
          const textChild = processedData.label.props.children.find((child: any) => 
            typeof child === 'string' || 
            (typeof child === 'object' && child.props && typeof child.props.children === 'string')
          );
          if (textChild) {
            processedData.label = typeof textChild === 'string' ? textChild : textChild.props.children;
          } else {
            processedData.label = 'Node';
          }
        } else if (typeof processedData.label.props.children === 'string') {
          processedData.label = processedData.label.props.children;
        } else {
          processedData.label = 'Node';
        }
      } else {
        processedData.label = 'Node';
      }
    }
    
    return processedData;
  };

  // Utility function to convert GraphNode to ReactFlowNode
  const convertToReactFlowNodes = (graphNodes: any[]): ReactFlowNode[] => {
    return graphNodes.map((node: any) => ({
      id: node.id,
      position: node.position,
      data: processNodeData(node.data),
      type: 'default',
      ...(node.style && { style: node.style })
    }));
  };

  const loadGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await graphsAPI.getGraph(graphId);
      
      if (response.success && response.graph) {
        setGraph(response.graph);
        // Convert GraphNode to ReactFlowNode using utility function
        const reactFlowNodes = convertToReactFlowNodes(response.graph.nodes);
        setNodes(reactFlowNodes);
        setEdges(response.graph.edges);
        setEditName(response.graph.name);
        setEditDescription(response.graph.description);
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error loading graph:', err);
      setError(t('graphs.errorLoadingGraph'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [graphId]);

  const handleDownload = () => {
    if (!graph) return;

    const graphData = {
      name: graph.name,
      description: graph.description,
      nodes: nodes.map(node => ({
        id: node.id,
        position: node.position,
        data: node.data,
        ...(node.style && { style: node.style })
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.style && { style: edge.style })
      })),
      files: graph.files,
      created_at: graph.created_at,
      updated_at: graph.updated_at,
    };

    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${graph.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSaveChanges = async () => {
    if (!graph) return;

    setIsSaving(true);
    try {
      const updateData: GraphUpdateRequest = {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        nodes: nodes.map(node => ({
          id: node.id,
          position: node.position,
          data: node.data,
          ...(node.style && { style: node.style })
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          ...(edge.style && { style: edge.style })
        })),
      };

      const response = await graphsAPI.updateGraph(graphId, updateData);
      
      if (response.success && response.graph) {
        setGraph(response.graph);
        setIsEditing(false);
        setShowEditModal(false);
        onGraphUpdated?.();
        alert(t('graphs.graphUpdatedSuccessfully'));
      } else {
        alert(t('graphs.errorUpdatingGraph') + ': ' + response.message);
      }
    } catch (error) {
      console.error('Error updating graph:', error);
      alert(t('graphs.errorUpdatingGraph') + ': ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    if (graph) {
      // Convert GraphNode to ReactFlowNode using utility function
      const reactFlowNodes = convertToReactFlowNodes(graph.nodes);
      setNodes(reactFlowNodes);
      setEdges(graph.edges);
      setEditName(graph.name);
      setEditDescription(graph.description);
    }
    setIsEditing(false);
    setShowEditModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  if (error || !graph) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-600 mb-4">{error || t('graphs.graphNotFound')}</div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {t('common.back')}
          </button>
          <button
            onClick={loadGraph}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </button>
            <div>
              <h3 className="font-semibold text-lg">{graph.name}</h3>
              {graph.description && (
                <p className="text-sm text-gray-600">{graph.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              {t('common.edit')}
            </button>
            {isEditing && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('graphs.download')}
            </button>
          </div>
        </div>

        {/* Graph Stats */}
        <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
          <span>{graph.files.length} {t('graphs.files')}</span>
          <span>{nodes.length} {t('graphs.nodes')}</span>
          <span>{edges.length} {t('graphs.connections')}</span>
          <span>{t('graphs.created')}: {formatDate(graph.created_at)}</span>
          <span>{t('graphs.updated')}: {formatDate(graph.updated_at)}</span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isEditing ? onNodesChange : undefined}
          onEdgesChange={isEditing ? onEdgesChange : undefined}
          onConnect={isEditing ? onConnect : undefined}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={isEditing}
          nodesConnectable={isEditing}
          elementsSelectable={isEditing}
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
      {isEditing && (
        <div className="p-4 bg-yellow-50 border-t">
          <div className="flex items-center justify-center">
            <p className="text-sm text-yellow-700 text-center">
              ✏️ {t('graphs.editMode')} - {t('graphs.dragToEdit')}
            </p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('graphs.editGraph')}</h3>
              <button
                onClick={handleEditCancel}
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('graphs.enterDescription')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isSaving}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowEditModal(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isSaving || !editName.trim()}
              >
                {t('graphs.startEditing')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphViewerStep;