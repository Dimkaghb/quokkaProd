import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { useToast } from '../components/Toast';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Calendar,
  HardDrive
} from 'lucide-react';
import { dataReportAPI, type ReportListItem } from '../api/dataReportAPI';

interface DataReportsPageProps {}

export const DataReportsPage: React.FC<DataReportsPageProps> = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const response = await dataReportAPI.listReports();
      if (response.success) {
        setReports(response.reports);
      } else {
        showToast('Failed to load reports', 'error');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      showToast('Error loading reports', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const response = await dataReportAPI.listReports();
      if (response.success) {
        setReports(response.reports);
        showToast('Reports refreshed successfully', 'success');
      } else {
        showToast('Failed to refresh reports', 'error');
      }
    } catch (error) {
      console.error('Error refreshing reports:', error);
      showToast('Error refreshing reports', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    setDownloadingIds(prev => new Set(prev).add(reportId));
    
    try {
      const blob = await dataReportAPI.downloadReport(reportId);
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data_report_${reportId}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast('Report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast('Failed to download report', 'error');
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(reportId));
    
    try {
      const response = await dataReportAPI.deleteReport(reportId);
      if (response.success) {
        setReports(prev => prev.filter(report => report.report_id !== reportId));
        showToast('Report deleted successfully', 'success');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      showToast('Failed to delete report', 'error');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Reports</h1>
          <p className="text-gray-600 mt-1">Manage your generated data analysis reports</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
          <p className="text-gray-600">Generate your first data report to see it here.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.report_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.filename}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {report.report_id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(report.status)}
                        <span className="ml-2 text-sm text-gray-900">
                          {getStatusText(report.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        {formatDate(report.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <HardDrive className="w-4 h-4 text-gray-400 mr-2" />
                        {formatFileSize(report.file_size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {report.status === 'completed' && (
                          <Button
                            onClick={() => handleDownload(report.report_id)}
                            disabled={downloadingIds.has(report.report_id)}
                            size="sm"
                            variant="outline"
                            className="flex items-center space-x-1"
                          >
                            {downloadingIds.has(report.report_id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            <span>Download</span>
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDelete(report.report_id)}
                          disabled={deletingIds.has(report.report_id)}
                          size="sm"
                          variant="outline"
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingIds.has(report.report_id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataReportsPage;