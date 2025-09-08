// frontend/src/components/host/HostReports.jsx - Simplified Working Version
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Send, 
  X, 
  FileText, 
  User, 
  Calendar,
  RefreshCw,
  Plus,
  Filter
} from 'lucide-react';
import hostService from '../../services/hostService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const HostReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const [reportData, setReportData] = useState({
    reported_user_id: '',
    booking_id: '',
    reason: ''
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const reports = await hostService.getMyReports();
      setReports(reports || []);
    } catch (err) {
      setError('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!reportData.reported_user_id || !reportData.reason.trim()) {
      alert('Please fill in:\n- Client User ID\n- Description');
      return;
    }

    if (reportData.reason.trim().length < 10) {
      alert('Please provide a more detailed description (at least 10 characters)');
      return;
    }

    try {
      setSubmitting(true);
      
      // Prepare the report data - convert empty booking_id to null
      const reportPayload = {
        reported_user_id: parseInt(reportData.reported_user_id),
        booking_id: reportData.booking_id ? parseInt(reportData.booking_id) : null,
        reason: reportData.reason.trim()
      };
      
      console.log('Submitting report with payload:', reportPayload);
      
      const result = await hostService.submitReport(reportPayload);
      
      if (result.success) {
        // Reset form
        setReportData({
          reported_user_id: '',
          booking_id: '',
          reason: ''
        });
        
        setShowReportForm(false);
        await loadReports();
        alert('Report submitted successfully!');
      }
    } catch (error) {
      alert('Failed to submit report: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
      dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dismissed' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const filteredReports = reports.filter(report => {
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load reports</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={loadReports} variant="gradient">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Disputes</h1>
          <p className="text-gray-400">Report issues with guests or submit disputes</p>
        </div>
        <Button
          onClick={() => setShowReportForm(true)}
          variant="gradient"
        >
          <Plus className="w-4 h-4 mr-2" />
          Submit Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Status:</span>
        </div>
        
        <div className="flex space-x-2">
          {['all', 'pending', 'resolved', 'dismissed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filterStatus === 'all' ? 'No reports submitted' : `No ${filterStatus} reports`}
          </h3>
          <p className="text-gray-400 mb-6">
            {filterStatus === 'all' 
              ? 'Your submitted reports will appear here' 
              : `No reports with ${filterStatus} status found`
            }
          </p>
          {filterStatus === 'all' && (
            <Button
              onClick={() => setShowReportForm(true)}
              variant="gradient"
            >
              Submit First Report
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">Report #{report.id}</h3>
                    {getStatusBadge(report.status)}
                  </div>
                  
                  <div className="text-sm text-gray-400 space-y-1">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Submitted {new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    {report.booking_id && (
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        <span>Booking #{report.booking_id}</span>
                      </div>
                    )}
                    {report.reported_user_name && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        <span>Reported: {report.reported_user_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-white font-medium mb-2">Issue Description:</h4>
                <p className="text-gray-300 text-sm bg-gray-700 p-3 rounded-lg">
                  {report.reason}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  Report ID: {report.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simple Report Form Modal */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Submit Report</h2>
              <button
                onClick={() => setShowReportForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
              <h3 className="text-blue-400 font-medium mb-2">Before you report:</h3>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>• Try to resolve the issue directly with the guest first</li>
                <li>• Provide specific details about what happened</li>
                <li>• Include dates, times, and relevant booking information</li>
                <li>• Be honest and factual in your description</li>
              </ul>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-6">
              {/* Client User ID */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Client User ID *</label>
                <Input
                  name="reported_user_id"
                  type="number"
                  value={reportData.reported_user_id}
                  onChange={handleInputChange}
                  placeholder="Enter client user ID to report"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  You can find the user ID in your booking details or messages
                </p>
              </div>

              {/* Optional Booking ID */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Related Booking ID (Optional)</label>
                <Input
                  name="booking_id"
                  type="number"
                  value={reportData.booking_id}
                  onChange={handleInputChange}
                  placeholder="Enter booking ID if this report relates to a specific booking"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Detailed Description *</label>
                <textarea
                  name="reason"
                  value={reportData.reason}
                  onChange={handleInputChange}
                  placeholder="Please provide specific details about the issue, including dates, times, and what happened..."
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 10 characters. Be specific and factual.
                </p>
              </div>

              {/* Host Tips */}
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <h4 className="text-yellow-400 font-medium mb-2">Host Reporting Tips:</h4>
                <ul className="text-yellow-300 text-sm space-y-1">
                  <li>• Include specific dates and times when issues occurred</li>
                  <li>• Mention any property damage with details</li>
                  <li>• Reference house rules that were violated</li>
                  <li>• Include communication attempts made to resolve the issue</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                  onClick={() => {
                    setShowReportForm(false);
                    setReportData({
                      reported_user_id: '',
                      booking_id: '',
                      reason: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  loading={submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostReports;