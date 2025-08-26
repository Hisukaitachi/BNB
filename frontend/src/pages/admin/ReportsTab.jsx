// src/pages/admin/ReportsTab.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, Building2, DollarSign, BarChart3, Filter, Search, Trash2, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';

const ReportsTab = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('revenue');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    status: 'all',
    userType: 'all',
    minAmount: '',
    maxAmount: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const { showToast } = useApp();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/reports');
      if (response.status === 'success') {
        setReports(response.data.reports || []);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      showToast('Failed to load reports', 'error');
      
      // Set mock data for demonstration
      setReports([
        {
          id: 1,
          name: 'Monthly Revenue Report - June 2024',
          type: 'revenue',
          created_at: '2024-06-30T23:59:59Z',
          size: '2.3 MB',
          status: 'completed',
          download_url: '#',
          file_format: 'PDF'
        },
        {
          id: 2,
          name: 'User Activity Report - Q2 2024',
          type: 'users',
          created_at: '2024-06-28T10:30:00Z',
          size: '1.8 MB',
          status: 'completed',
          download_url: '#',
          file_format: 'Excel'
        },
        {
          id: 3,
          name: 'Booking Analytics - Last 30 Days',
          type: 'bookings',
          created_at: '2024-06-25T15:45:00Z',
          size: '3.1 MB',
          status: 'pending',
          download_url: null,
          file_format: 'PDF'
        },
        {
          id: 4,
          name: 'Listings Performance Report',
          type: 'listings',
          created_at: '2024-06-20T14:22:00Z',
          size: '4.2 MB',
          status: 'completed',
          download_url: '#',
          file_format: 'Excel'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      
      const reportData = {
        type: reportType,
        dateRange,
        filters,
        format: 'pdf' // Default format
      };

      const response = await api.post('/admin/reports/generate', reportData);
      
      if (response.status === 'success') {
        showToast('Report generation started. You will be notified when ready.', 'success');
        
        // Add new report to the list with pending status
        const newReport = {
          id: Date.now(),
          name: `${getReportTypeName(reportType)} - ${new Date().toLocaleDateString()}`,
          type: reportType,
          created_at: new Date().toISOString(),
          size: 'Generating...',
          status: 'pending',
          download_url: null,
          file_format: 'PDF'
        };
        setReports(prev => [newReport, ...prev]);
      }
    } catch (error) {
      console.error('Report generation error:', error);
      showToast('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId, filename) => {
    try {
      showToast('Download started...', 'info');
      
      // For demo purposes, we'll simulate a download
      // In real implementation, this would call the API
      /*
      const response = await api.get(`/admin/reports/${reportId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      */
      
      // Simulate download for demo
      setTimeout(() => {
        showToast('Report downloaded successfully', 'success');
      }, 1000);
      
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download report', 'error');
    }
  };

  const deleteReport = async (reportId) => {
    try {
      await api.delete(`/admin/reports/${reportId}`);
      setReports(prev => prev.filter(report => report.id !== reportId));
      showToast('Report deleted successfully', 'success');
      setShowDeleteModal(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete report', 'error');
    }
  };

  const getReportTypeName = (type) => {
    const types = {
      revenue: 'Revenue Report',
      bookings: 'Bookings Report',
      users: 'Users Report',
      listings: 'Listings Report',
      analytics: 'Analytics Report',
      financial: 'Financial Report'
    };
    return types[type] || 'Custom Report';
  };

  const getReportTypeIcon = (type) => {
    const icons = {
      revenue: DollarSign,
      bookings: Calendar,
      users: Users,
      listings: Building2,
      analytics: BarChart3,
      financial: DollarSign
    };
    const Icon = icons[type] || FileText;
    return <Icon className="w-5 h-5" />;
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-red-500/20 text-red-400',
      processing: 'bg-blue-500/20 text-blue-400'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getFileFormatBadge = (format) => {
    const colors = {
      'PDF': 'bg-red-500/20 text-red-400',
      'Excel': 'bg-green-500/20 text-green-400',
      'CSV': 'bg-blue-500/20 text-blue-400',
      'JSON': 'bg-purple-500/20 text-purple-400'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[format] || 'bg-gray-500/20 text-gray-400'}`}>
        {format}
      </span>
    );
  };

  const quickTemplates = [
    {
      type: 'revenue',
      name: 'Monthly Revenue',
      description: 'Last 30 days revenue breakdown',
      icon: DollarSign,
      color: 'text-green-400',
      days: 30
    },
    {
      type: 'users',
      name: 'User Growth',
      description: 'Quarterly user activity report',
      icon: Users,
      color: 'text-blue-400',
      days: 90
    },
    {
      type: 'bookings',
      name: 'Weekly Bookings',
      description: 'Last 7 days booking summary',
      icon: Calendar,
      color: 'text-purple-400',
      days: 7
    },
    {
      type: 'listings',
      name: 'Listings Performance',
      description: 'Monthly listings analytics',
      icon: Building2,
      color: 'text-orange-400',
      days: 30
    },
    {
      type: 'analytics',
      name: 'Platform Analytics',
      description: 'Comprehensive platform insights',
      icon: BarChart3,
      color: 'text-teal-400',
      days: 60
    },
    {
      type: 'financial',
      name: 'Financial Summary',
      description: 'Quarterly financial overview',
      icon: DollarSign,
      color: 'text-yellow-400',
      days: 90
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-gray-400">Generate and download comprehensive platform reports</p>
        </div>
        <Button variant="outline" onClick={fetchReports} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Report Generator */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <FileText className="w-6 h-6 mr-2" />
          Generate New Report
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="revenue">Revenue Report</option>
              <option value="bookings">Bookings Report</option>
              <option value="users">Users Report</option>
              <option value="listings">Listings Report</option>
              <option value="analytics">Analytics Report</option>
              <option value="financial">Financial Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status Filter</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">User Type</label>
            <select
              value={filters.userType}
              onChange={(e) => setFilters(prev => ({ ...prev, userType: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Users</option>
              <option value="host">Hosts Only</option>
              <option value="client">Clients Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Min Amount (PHP)</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Amount (PHP)</label>
            <input
              type="number"
              placeholder="999999"
              value={filters.maxAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <Button
          onClick={generateReport}
          disabled={generating}
          className="w-full md:w-auto"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      {/* Report Templates */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2" />
          Quick Report Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.type}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer group"
                onClick={() => {
                  setReportType(template.type);
                  setDateRange({
                    start: new Date(Date.now() - template.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  });
                }}
              >
                <Icon className={`w-8 h-8 ${template.color} mb-3 group-hover:scale-110 transition-transform`} />
                <h4 className="font-semibold text-white mb-1">{template.name}</h4>
                <p className="text-sm text-gray-400">{template.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  Last {template.days} days
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generated Reports */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Search className="w-6 h-6 mr-2" />
            Generated Reports
          </h3>
          <div className="text-sm text-gray-400">
            {reports.length} reports
          </div>
        </div>

        {loading ? (
          <Loading message="Loading reports..." fullScreen={false} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getReportTypeIcon(report.type)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">{report.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">
                        {getReportTypeName(report.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {report.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getFileFormatBadge(report.file_format)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        {report.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadReport(report.id, `${report.name}.${report.file_format.toLowerCase()}`)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {reports.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No reports generated yet</p>
                <p className="text-sm text-gray-500 mt-2">Generate your first report using the form above</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Information */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Report Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-white mb-3">Available Report Types</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• <strong className="text-green-400">Revenue Report:</strong> Detailed breakdown of platform earnings and financial metrics</li>
              <li>• <strong className="text-blue-400">Bookings Report:</strong> Booking statistics, trends, and performance analysis</li>
              <li>• <strong className="text-purple-400">Users Report:</strong> User activity, growth metrics, and demographic data</li>
              <li>• <strong className="text-orange-400">Listings Report:</strong> Property listing analytics and performance metrics</li>
              <li>• <strong className="text-teal-400">Analytics Report:</strong> Comprehensive platform insights and KPIs</li>
              <li>• <strong className="text-yellow-400">Financial Report:</strong> Complete financial overview and transaction analysis</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-3">Export Formats</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• <strong className="text-red-400">PDF:</strong> Formatted reports with charts, graphs, and visual analytics</li>
              <li>• <strong className="text-green-400">Excel (XLSX):</strong> Raw data with multiple sheets for detailed analysis</li>
              <li>• <strong className="text-blue-400">CSV:</strong> Simple comma-separated data format for easy import</li>
              <li>• <strong className="text-purple-400">JSON:</strong> API-friendly structured data format for developers</li>
            </ul>
            
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-400">
                <strong>Note:</strong> Report generation may take several minutes depending on the data range and complexity. 
                You'll receive a notification when your report is ready for download.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedReport(null);
        }}
        title="Delete Report"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Are you sure you want to delete <strong>{selectedReport?.name}</strong>?
          </p>
          <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded-lg">
            <strong>This action will:</strong>
            <ul className="mt-2 space-y-1">
              <li>• Permanently delete the report file</li>
              <li>• Remove it from your reports list</li>
              <li>• This action cannot be undone</li>
            </ul>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedReport(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => deleteReport(selectedReport?.id)}
            >
              Delete Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportsTab;