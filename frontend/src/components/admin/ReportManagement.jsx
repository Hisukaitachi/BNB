// frontend/src/components/admin/ReportManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Clock,
  User,
  Ban,
  MessageSquare,
  RefreshCw,
  Download,
  Shield,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [filteredReports, setFilteredReports] = useState([]);
  
  // Modal state
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, searchTerm, statusFilter, typeFilter]);

  // Fetch all reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminAPI.getAllReports();
      
      if (response.data.reports) {
        setReports(response.data.reports);
      }
    } catch (err) {
      setError('Failed to fetch reports: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to reports
  const applyFilters = () => {
    let filtered = [...reports];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.reason?.toLowerCase().includes(term) ||
        report.reporter_name?.toLowerCase().includes(term) ||
        report.reported_user_name?.toLowerCase().includes(term) ||
        report.id?.toString().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Type filter (if you have different report types)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(report => report.report_type === typeFilter);
    }

    setFilteredReports(filtered);
  };

  // Handle admin action
  const handleAdminAction = async (reportId, actionType, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [reportId]: actionType }));
      
      const report = reports.find(r => r.id === reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Get admin ID from local storage or auth context
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const adminId = user.id;
      
      if (!adminId) {
        throw new Error('Admin ID not found. Please log in again.');
      }

      const actionData = {
        admin_id: adminId, // Use actual admin ID from auth
        user_id: report.reported_user_id,
        action_type: actionType,
        reason: reason || `Action taken on report #${reportId}`,
        report_id: reportId
      };

      const response = await adminAPI.takeAction(actionData);
      
      if (response.data.message) {
        alert(`Action completed: ${actionType}`);
        await fetchReports(); // Refresh reports
      }
    } catch (error) {
      alert(`Failed to take action: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      reviewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Reviewed' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
      dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dismissed' },
      escalated: { bg: 'bg-red-100', text: 'text-red-800', label: 'Escalated' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Get priority indicator
  const getPriorityIndicator = (report) => {
    const createdDate = new Date(report.created_at);
    const today = new Date();
    const daysOld = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
    
    if (daysOld >= 7 && report.status === 'pending') {
      return (
        <div className="flex items-center text-red-400 text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overdue
        </div>
      );
    } else if (daysOld >= 3 && report.status === 'pending') {
      return (
        <div className="flex items-center text-yellow-400 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Due soon
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={fetchReports} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Report Management</h1>
          <p className="text-gray-400">
            {filteredReports.length} reports found
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={() => {
              const csvData = 'Report ID,Reporter,Reported User,Reason,Status,Created\n' +
                filteredReports.map(r => 
                  `${r.id},"${r.reporter_name}","${r.reported_user_name}","${r.reason}",${r.status},${new Date(r.created_at).toLocaleDateString()}`
                ).join('\n');
              const blob = new Blob([csvData], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'reports-export.csv';
              a.click();
            }}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={fetchReports}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Reports</p>
              <p className="text-2xl font-bold text-white">{reports.length}</p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-400">
                {reports.filter(r => r.status === 'pending').length}
              </p>
              <p className="text-xs text-gray-500">Need attention</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Resolved</p>
              <p className="text-2xl font-bold text-green-400">
                {reports.filter(r => r.status === 'resolved').length}
              </p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-red-400">
                {reports.filter(r => {
                  const daysOld = Math.floor((new Date() - new Date(r.created_at)) / (1000 * 60 * 60 * 24));
                  return daysOld >= 7 && r.status === 'pending';
                }).length}
              </p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
            <div className="p-3 rounded-full bg-red-600/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
            <option value="escalated">Escalated</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Types</option>
            <option value="harassment">Harassment</option>
            <option value="fraud">Fraud</option>
            <option value="inappropriate">Inappropriate Content</option>
            <option value="safety">Safety Concern</option>
            <option value="other">Other</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>
              {reports.filter(r => r.status === 'pending').length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No reports found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Report Details</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Reporter</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Reported User</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Date</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-700/50">
                    <td className="py-4 px-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-orange-600 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium line-clamp-2">
                            {report.reason || 'No reason provided'}
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            Report ID: #{report.id}
                          </div>
                          {report.booking_id && (
                            <div className="text-gray-400 text-xs">
                              Related to Booking #{report.booking_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <span className="text-white text-sm">{report.reporter_name || 'Unknown'}</span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        ID: {report.reporter_id}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-red-400" />
                        <span className="text-white text-sm">{report.reported_user_name || 'Unknown'}</span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        ID: {report.reported_user_id}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white text-sm">
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(report.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {getStatusBadge(report.status || 'pending')}
                        {getPriorityIndicator(report)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowReportModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {report.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300"
                              loading={actionLoading[report.id] === 'no_action'}
                              onClick={() => handleAdminAction(report.id, 'no_action', 'Report resolved - no action needed')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              loading={actionLoading[report.id] === 'ban'}
                              onClick={() => {
                                if (confirm('Are you sure you want to ban this user?')) {
                                  handleAdminAction(report.id, 'ban', 'User banned due to report');
                                }
                              }}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-yellow-400 hover:text-yellow-300"
                              loading={actionLoading[report.id] === 'warn'}
                              onClick={() => handleAdminAction(report.id, 'warn', 'User warned due to report')}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-yellow-400 hover:text-yellow-300"
                          loading={actionLoading[report.id] === 'dismiss'}
                          onClick={() => handleAdminAction(report.id, 'dismiss', 'Report dismissed by admin')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <ReportDetailModal 
          report={selectedReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReport(null);
          }}
          onAction={handleAdminAction}
        />
      )}
    </div>
  );
};

// Report Detail Modal Component
const ReportDetailModal = ({ report, onClose, onAction }) => {
  const [actionReason, setActionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const handleTakeAction = () => {
    if (!selectedAction) {
      alert('Please select an action');
      return;
    }
    
    const reason = actionReason || `${selectedAction} action taken on report #${report.id}`;
    onAction(report.id, selectedAction, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Report Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Report Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Report ID:</span>
                    <span className="text-white ml-2">#{report.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Reason:</span>
                    <div className="text-white ml-2 mt-1 p-3 bg-gray-700 rounded">
                      {report.reason || 'No reason provided'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2">{getStatusBadge(report.status || 'pending')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white ml-2">{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                  {report.booking_id && (
                    <div>
                      <span className="text-gray-400">Related Booking:</span>
                      <span className="text-white ml-2">#{report.booking_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Users Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Involved Users</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Reporter</h4>
                    <div className="space-y-1">
                      <div className="text-gray-300">{report.reporter_name || 'Unknown'}</div>
                      <div className="text-gray-400 text-sm">ID: {report.reporter_id}</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Reported User</h4>
                    <div className="space-y-1">
                      <div className="text-gray-300">{report.reported_user_name || 'Unknown'}</div>
                      <div className="text-gray-400 text-sm">ID: {report.reported_user_id}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          {report.status === 'pending' && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Take Action</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select an action</option>
                    <option value="resolve">Resolve Report</option>
                    <option value="ban_user">Ban Reported User</option>
                    <option value="warn_user">Warn Reported User</option>
                    <option value="dismiss">Dismiss Report</option>
                    <option value="escalate">Escalate Report</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason (Optional)</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Provide a reason for this action..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Close
            </Button>
            
            {report.status === 'pending' && (
              <Button
                onClick={handleTakeAction}
                variant="gradient"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!selectedAction}
              >
                Take Action
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for status badge (moved outside component to avoid re-creation)
const getStatusBadge = (status) => {
  const badges = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    reviewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Reviewed' },
    resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
    dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dismissed' },
    escalated: { bg: 'bg-red-100', text: 'text-red-800', label: 'Escalated' }
  };
  
  const badge = badges[status] || badges.pending;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
};

export default ReportManagement;