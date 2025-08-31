// frontend/src/components/admin/ReportManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X,
  MessageCircle,
  User,
  Calendar,
  Home,
  Flag,
  RefreshCw,
  Shield,
  Clock,
  FileText,
  Send
} from 'lucide-react';
import adminService from '../../services/adminService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, searchTerm, statusFilter, categoryFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllReports();
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.reporter_name?.toLowerCase().includes(term) ||
        report.reported_user_name?.toLowerCase().includes(term) ||
        report.category?.toLowerCase().includes(term) ||
        report.description?.toLowerCase().includes(term) ||
        report.id.toString().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(report => report.category === categoryFilter);
    }

    setFilteredReports(filtered);
  };

  const handleReportAction = async (reportId, action, adminResponse = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [reportId]: action }));
      
      let result;
      switch (action) {
        case 'resolve':
          if (!adminResponse) {
            adminResponse = prompt('Resolution notes (optional):');
          }
          result = await adminService.updateReportStatus(reportId, 'resolved', adminResponse);
          break;
        case 'reject':
          if (!adminResponse) {
            adminResponse = prompt('Reason for dismissal:');
            if (!adminResponse) return;
          }
          result = await adminService.updateReportStatus(reportId, 'dismissed', adminResponse);
          break;
        case 'investigate':
          result = await adminService.updateReportStatus(reportId, 'investigating', 'Case under review');
          break;
        case 'message':
          if (!adminResponse) {
            adminResponse = prompt('Message to send to involved parties:');
            if (!adminResponse) return;
          }
          result = await adminService.sendReportMessage(reportId, adminResponse);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.success) {
        await loadReports(); // Refresh reports
        alert(`Report ${action}d successfully`);
      }
    } catch (error) {
      alert(`Failed to ${action} report: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: Clock },
      investigating: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Investigating', icon: Search },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved', icon: Check },
      dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dismissed', icon: X }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const badges = {
      'inappropriate_content': { bg: 'bg-red-100', text: 'text-red-800', label: 'Inappropriate Content' },
      'harassment': { bg: 'bg-red-100', text: 'text-red-800', label: 'Harassment' },
      'fraud': { bg: 'bg-red-100', text: 'text-red-800', label: 'Fraud' },
      'spam': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Spam' },
      'fake_listing': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Fake Listing' },
      'safety_concern': { bg: 'bg-red-100', text: 'text-red-800', label: 'Safety Concern' },
      'other': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Other' }
    };
    
    const badge = badges[category] || badges.other;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityLevel = (report) => {
    // Determine priority based on category and age
    const highPriorityCategories = ['harassment', 'fraud', 'safety_concern'];
    const daysSinceReport = Math.floor(
      (new Date() - new Date(report.created_at)) / (1000 * 60 * 60 * 24)
    );
    
    if (highPriorityCategories.includes(report.category)) {
      return { level: 'high', color: 'text-red-400', label: 'High Priority' };
    } else if (daysSinceReport >= 3) {
      return { level: 'medium', color: 'text-yellow-400', label: 'Overdue' };
    }
    return { level: 'normal', color: 'text-gray-400', label: 'Normal' };
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
        <Button onClick={loadReports} variant="gradient">Try Again</Button>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const investigatingReports = reports.filter(r => r.status === 'investigating');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Disputes</h1>
          <p className="text-gray-400">
            {filteredReports.length} of {reports.length} reports
          </p>
        </div>
        
        <Button
          onClick={loadReports}
          variant="outline"
          className="border-gray-600 text-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-400">{pendingReports.length}</p>
              <p className="text-xs text-gray-500">Need attention</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Investigating</p>
              <p className="text-2xl font-bold text-blue-400">{investigatingReports.length}</p>
              <p className="text-xs text-gray-500">In progress</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <Search className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Resolved</p>
              <p className="text-2xl font-bold text-green-400">
                {reports.filter(r => r.status === 'resolved').length}
              </p>
              <p className="text-xs text-gray-500">This month</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-red-400">
                {reports.filter(r => ['harassment', 'fraud', 'safety_concern'].includes(r.category)).length}
              </p>
              <p className="text-xs text-gray-500">Urgent cases</p>
            </div>
            <div className="p-3 rounded-full bg-red-600/20">
              <Flag className="w-6 h-6 text-red-400" />
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
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Categories</option>
            <option value="inappropriate_content">Inappropriate Content</option>
            <option value="harassment">Harassment</option>
            <option value="fraud">Fraud</option>
            <option value="spam">Spam</option>
            <option value="fake_listing">Fake Listing</option>
            <option value="safety_concern">Safety Concern</option>
            <option value="other">Other</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>{pendingReports.length} urgent</span>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No reports found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Report</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Category</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Parties</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Reported</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredReports.map((report) => {
                  const priority = getPriorityLevel(report);
                  return (
                    <tr key={report.id} className="hover:bg-gray-700/50">
                      <td className="py-4 px-6">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${priority.level === 'high' ? 'bg-red-600/20' : 'bg-gray-600/20'}`}>
                            <AlertTriangle className={`w-4 h-4 ${priority.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium">#{report.id}</div>
                            <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                              {report.description || 'No description provided'}
                            </p>
                            <div className={`text-xs mt-1 ${priority.color}`}>
                              {priority.label}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getCategoryBadge(report.category)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3 text-blue-400" />
                            <span className="text-gray-300">Reporter:</span>
                            <span className="text-white">{report.reporter_name || 'Anonymous'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Flag className="w-3 h-3 text-red-400" />
                            <span className="text-gray-300">Reported:</span>
                            <span className="text-white">{report.reported_user_name || 'Unknown'}</span>
                          </div>
                          {report.listing_id && (
                            <div className="flex items-center space-x-2">
                              <Home className="w-3 h-3 text-green-400" />
                              <span className="text-gray-300">Listing:</span>
                              <span className="text-white">#{report.listing_id}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {getStatusBadge(report.status)}
                          {report.admin_response && (
                            <div className="flex items-center text-gray-400 text-xs">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Admin responded
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-white text-sm">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {new Date(report.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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
                                className="text-blue-400 hover:text-blue-300"
                                loading={actionLoading[report.id] === 'investigate'}
                                onClick={() => handleReportAction(report.id, 'investigate')}
                              >
                                <Search className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                loading={actionLoading[report.id] === 'resolve'}
                                onClick={() => handleReportAction(report.id, 'resolve')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                loading={actionLoading[report.id] === 'reject'}
                                onClick={() => handleReportAction(report.id, 'reject')}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {report.status === 'investigating' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-purple-400 hover:text-purple-300"
                                loading={actionLoading[report.id] === 'message'}
                                onClick={() => handleReportAction(report.id, 'message')}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                loading={actionLoading[report.id] === 'resolve'}
                                onClick={() => handleReportAction(report.id, 'resolve')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {(report.status === 'resolved' || report.status === 'dismissed') && (
                            <div className="flex items-center text-gray-500 text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              Closed
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => {
              // Mark all high priority reports as investigating
              const highPriorityReports = reports.filter(r => 
                r.status === 'pending' && ['harassment', 'fraud', 'safety_concern'].includes(r.category)
              );
              if (highPriorityReports.length > 0) {
                if (confirm(`Mark ${highPriorityReports.length} high priority reports as investigating?`)) {
                  alert('Batch action not implemented yet');
                }
              } else {
                alert('No high priority reports to process');
              }
            }}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
          >
            <Flag className="w-4 h-4 mr-2" />
            Process Urgent
          </Button>
          
          <Button
            onClick={() => {
              // Send bulk message to pending reports
              const message = prompt('Message to send to all pending report parties:');
              if (message) {
                alert('Bulk message feature to be implemented');
              }
            }}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Bulk Message
          </Button>
          
          <Button
            onClick={() => {
              // Generate reports summary
              alert('Reports analytics to be implemented');
            }}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          
          <Button
            onClick={() => {
              // Report settings
              alert('Report settings to be implemented');
            }}
            variant="outline"
            className="border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <ReportDetailModal 
          report={selectedReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReport(null);
          }}
          onAction={handleReportAction}
        />
      )}
    </div>
  );
};

// Report Detail Modal Component
const ReportDetailModal = ({ report, onClose, onAction }) => {
  const [adminResponse, setAdminResponse] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleSendMessage = async () => {
    if (!adminResponse.trim()) return;
    
    try {
      setSendingMessage(true);
      await onAction(report.id, 'message', adminResponse);
      setAdminResponse('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const priority = getPriorityLevel(report);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Report #{report.id}</h2>
            <div className="flex items-center space-x-2 mt-1">
              {getCategoryBadge(report.category)}
              {getStatusBadge(report.status)}
              <span className={`text-xs ${priority.color}`}>{priority.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Report Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Category:</span>
                    <span className="text-white ml-2">{report.category.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Reported by:</span>
                    <span className="text-white ml-2">{report.reporter_name || 'Anonymous'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Reported user:</span>
                    <span className="text-white ml-2">{report.reported_user_name || 'Unknown'}</span>
                  </div>
                  {report.listing_id && (
                    <div>
                      <span className="text-gray-400">Related listing:</span>
                      <span className="text-white ml-2">#{report.listing_id}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="text-white ml-2">{report.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Reported on:</span>
                    <span className="text-white ml-2">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Description</h3>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-300">{report.description || 'No description provided'}</p>
                </div>
              </div>

              {/* Evidence */}
              {report.evidence && report.evidence.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Evidence</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {report.evidence.map((evidence, index) => (
                      <div key={index} className="bg-gray-700 p-2 rounded">
                        {evidence.type === 'image' ? (
                          <img src={evidence.url} alt={`Evidence ${index + 1}`} className="w-full h-24 object-cover rounded" />
                        ) : (
                          <div className="flex items-center justify-center h-24 bg-gray-600 rounded">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Admin Actions</h3>
                
                {/* Previous Admin Response */}
                {report.admin_response && (
                  <div className="bg-gray-700 p-4 rounded-lg mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 font-medium">Previous Response</span>
                    </div>
                    <p className="text-gray-300 text-sm">{report.admin_response}</p>
                  </div>
                )}

                {/* New Response */}
                <div className="space-y-3">
                  <textarea
                    placeholder="Type your response or resolution notes..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                  />
                  
                  <Button
                    onClick={handleSendMessage}
                    loading={sendingMessage}
                    disabled={!adminResponse.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message to Parties
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-white font-medium mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {report.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => onAction(report.id, 'investigate')}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Investigate
                      </Button>
                      <Button
                        onClick={() => onAction(report.id, 'resolve')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    </>
                  )}
                  
                  {report.status === 'investigating' && (
                    <Button
                      onClick={() => onAction(report.id, 'resolve')}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 col-span-2"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark as Resolved
                    </Button>
                  )}
                  
                  {(report.status === 'pending' || report.status === 'investigating') && (
                    <Button
                      onClick={() => onAction(report.id, 'reject')}
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white col-span-2"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Dismiss Report
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function (moved here since it's used in modal)
const getPriorityLevel = (report) => {
  const highPriorityCategories = ['harassment', 'fraud', 'safety_concern'];
  const daysSinceReport = Math.floor(
    (new Date() - new Date(report.created_at)) / (1000 * 60 * 60 * 24)
  );
  
  if (highPriorityCategories.includes(report.category)) {
    return { level: 'high', color: 'text-red-400', label: 'High Priority' };
  } else if (daysSinceReport >= 3) {
    return { level: 'medium', color: 'text-yellow-400', label: 'Overdue' };
  }
  return { level: 'normal', color: 'text-gray-400', label: 'Normal' };
};

const getCategoryBadge = (category) => {
  const badges = {
    'inappropriate_content': { bg: 'bg-red-100', text: 'text-red-800', label: 'Inappropriate Content' },
    'harassment': { bg: 'bg-red-100', text: 'text-red-800', label: 'Harassment' },
    'fraud': { bg: 'bg-red-100', text: 'text-red-800', label: 'Fraud' },
    'spam': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Spam' },
    'fake_listing': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Fake Listing' },
    'safety_concern': { bg: 'bg-red-100', text: 'text-red-800', label: 'Safety Concern' },
    'other': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Other' }
  };
  
  const badge = badges[category] || badges.other;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
};

const getStatusBadge = (status) => {
  const badges = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: Clock },
    investigating: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Investigating', icon: Search },
    resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved', icon: Check },
    dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dismissed', icon: X }
  };
  
  const badge = badges[status] || badges.pending;
  const Icon = badge.icon;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      <Icon className="w-3 h-3 mr-1" />
      {badge.label}
    </span>
  );
};

export default ReportManagement;