import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Eye, Trash2, Search, Filter } from 'lucide-react';
import { useLanguageStore } from '../../../shared/stores/languageStore';
import { graphsAPI, GraphSummary } from '../../../shared/api/graphsAPI';

interface GraphsListStepProps {
  onGraphSelect: (graphId: string) => void;
  onRefresh?: () => void;
}

const GraphsListStep: React.FC<GraphsListStepProps> = ({
  onGraphSelect,
  onRefresh
}) => {
  const { t } = useLanguageStore();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadGraphs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await graphsAPI.listGraphs();
      
      if (response.success) {
        setGraphs(response.graphs);
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error loading graphs:', err);
      setError(t('graphs.errorLoadingGraphs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphs();
  }, []);

  useEffect(() => {
    if (onRefresh) {
      loadGraphs();
    }
  }, [onRefresh]);

  const handleDeleteGraph = async (graphId: string, graphName: string) => {
    if (!confirm(t('graphs.confirmDelete').replace('{name}', graphName))) {
      return;
    }

    try {
      const response = await graphsAPI.deleteGraph(graphId);
      if (response.success) {
        setGraphs(prev => prev.filter(g => g.id !== graphId));
      } else {
        alert(t('graphs.errorDeletingGraph') + ': ' + response.message);
      }
    } catch (error) {
      console.error('Error deleting graph:', error);
      alert(t('graphs.errorDeletingGraph') + ': ' + (error as Error).message);
    }
  };

  const filteredAndSortedGraphs = graphs
    .filter(graph => 
      graph.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      graph.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadGraphs}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('graphs.savedGraphs')}</h3>
          <button
            onClick={loadGraphs}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('common.refresh')}
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('graphs.searchGraphs')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'name' | 'created_at' | 'updated_at');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="updated_at-desc">{t('graphs.sortByUpdatedDesc')}</option>
              <option value="updated_at-asc">{t('graphs.sortByUpdatedAsc')}</option>
              <option value="created_at-desc">{t('graphs.sortByCreatedDesc')}</option>
              <option value="created_at-asc">{t('graphs.sortByCreatedAsc')}</option>
              <option value="name-asc">{t('graphs.sortByNameAsc')}</option>
              <option value="name-desc">{t('graphs.sortByNameDesc')}</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {t('graphs.totalGraphs')}: {filteredAndSortedGraphs.length}
        </div>
      </div>

      {/* Graphs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAndSortedGraphs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-12 h-12 mb-4" />
            <p className="text-lg mb-2">{t('graphs.noGraphsFound')}</p>
            <p className="text-sm">{t('graphs.createFirstGraph')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedGraphs.map((graph) => (
              <div
                key={graph.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Graph Thumbnail */}
                <div className="h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {graph.thumbnail ? (
                    <img
                      src={graph.thumbnail}
                      alt={graph.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <FileText className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Graph Info */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 truncate" title={graph.name}>
                    {graph.name}
                  </h4>
                  
                  {graph.description && (
                    <p className="text-sm text-gray-600 line-clamp-2" title={graph.description}>
                      {graph.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{graph.files_count} {t('graphs.files')}</span>
                    <span>{graph.nodes_count} {t('graphs.nodes')}</span>
                    <span>{graph.edges_count} {t('graphs.connections')}</span>
                  </div>

                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(graph.updated_at)}
                  </div>

                  {/* Tags */}
                  {graph.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {graph.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {graph.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{graph.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => onGraphSelect(graph.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {t('graphs.open')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGraph(graph.id, graph.name);
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphsListStep;