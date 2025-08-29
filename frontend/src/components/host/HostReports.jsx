// frontend/src/components/host/HostReports.jsx - Reports & Disputes for Hosts
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Send, 
  X, 
  FileText, 
  User, 
  Calendar,
  MessageSquare,
  Eye,
  RefreshCw,
  Plus,
  Filter
} from 'lucide-react';
import { reportsService, REPORT_TYPES, REPORT_STATUS } from '../../services/reportsService';
import hostService from '../../services/hostService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Textarea } from '../ui/Input';

const HostReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [hostBookings, setHostBookings] = useState([]);

  const [reportData, setReportData] = useState({
    reported_user_id: '',
    booking_id: '',
    type: '',
    reason: '',
    description: '',
    client_name: ''
  });

  useEffect(() => {
    loadReports();
    loadHostBookings();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const reportsData = await hostService.getMyReports();
      setReports(reportsData.map(report => reportsService.formatReport(report)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHostBookings = async () => {
    try {
      const bookingsData = await hostService.getHostBookings();
      // Get completed bookings with client info for reporting
      const completedBookings = bookingsData.bookings.filter(booking => 
        ['completed', 'confirmed'].includes(booking.status)
      );
      setHostBookings(completedBookings);
    } catch (error) {
      console.error('Failed to load bookings for reports:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill client info when booking is selected
    if (name === 'booking_id' && value) {
      const selectedBooking = hostBookings.find(b => b.booking_id == value);
      if (selectedBooking) {
        setReportData(prev => ({
          ...prev,
          reported_user_id: selectedBooking.client_id,
          client_name: selectedBooking.client_name
        }));
      }
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    const validation = reportsService.validateReportData(reportData);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    try {
      setSubmitting(true);
      await hostService.submitReport(reportData);
      
      // Reset form
      setReportData({
        reported_user_id: '',
        booking_id: '',
        type: '',
        reason: '',
        description: '',
        client_name: ''
      });
      
      setShowReportForm(false);
      await loadReports(); // Refresh reports
      alert('Report submitted successfully!');
    } catch (error) {
      alert('Failed to submit report: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReports = reports.filter(report => {
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  });

  const reportTypes = reportsService.getReportTypes();
  const guidelines = reportsService.getReportGuidelines();

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
          {['all', 'pending', 'under_review', 'resolved', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filterStatus === 'all' ? 'No reports submitted' : `No ${filterStatus.replace('_', ' ')} reports`}
          </h3>
          <p className="text-gray-400 mb-6">
            {filterStatus === 'all' 
              ? 'Your submitted reports will appear here' 
              : `No reports with ${filterStatus.replace('_', ' ')} status found`
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
                    <h3 className="text-lg font-semibold text-white">{report.typeLabel}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${report.statusColor}`}>
                      {report.statusLabel}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 space-y-1">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Submitted {report.formattedDate}</span>
                    </div>
                    {report.booking_id && (
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        <span>Booking #{report.booking_id}</span>
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

              {report.admin_response && (
                <div className="mb-4">
                  <h4 className="text-blue-400 font-medium mb-2">Admin Response:</h4>
                  <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                    <p className="text-blue-300 text-sm">{report.admin_response}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  Report ID: {report.id} • {report.timeAgo}
                </div>
                
                <div className="flex space-x-2">
                  {report.booking_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400"
                      onClick={() => {
                        // TODO: View booking details
                        console.log('View booking:', report.booking_id);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Booking
                    </Button>
                  )}
                  
                  {report.status === REPORT_STATUS.PENDING && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400"
                      onClick={() => {
                        // TODO: Edit report
                        console.log('Edit report:', report.id);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Form Modal */}
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
                {guidelines.map((guideline, index) => (
                  <li key={index}>• {guideline}</li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-6">
              {/* Booking Selection */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Related Booking (Recommended)</label>
                <select
                  name="booking_id"
                  value={reportData.booking_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select a booking (optional)</option>
                  {hostBookings.map(booking => (
                    <option key={booking.booking_id} value={booking.booking_id} className="bg-gray-800">
                      {booking.title} - {booking.client_name} ({new Date(booking.check_in_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Selection */}
              {!reportData.booking_id && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Client User ID *"
                    name="reported_user_id"
                    type="number"
                    value={reportData.reported_user_id}
                    onChange={handleInputChange}
                    placeholder="Enter client user ID"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  
                  <Input
                    label="Client Name (for reference)"
                    name="client_name"
                    value={reportData.client_name}
                    onChange={handleInputChange}
                    placeholder="Client's name"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              )}

              {/* Selected Client Info */}
              {reportData.client_name && (
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center text-white">
                    <User className="w-4 h-4 mr-2" />
                    <span>Reporting: <strong>{reportData.client_name}</strong></span>
                  </div>
                  {reportData.booking_id && (
                    <div className="flex items-center text-gray-400 text-sm mt-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Booking #{reportData.booking_id}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Report Type */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Report Type *</label>
                <select
                  name="type"
                  value={reportData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select report type</option>
                  {Object.entries(reportTypes).map(([key, type]) => (
                    <option key={key} value={key} className="bg-gray-800">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Description */}
              {reportData.type && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">{reportTypes[reportData.type].label}</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    {reportTypes[reportData.type].description}
                  </p>
                  <p className="text-xs text-gray-400">
                    <strong>Examples:</strong> {reportTypes[reportData.type].examples.join(', ')}
                  </p>
                </div>
              )}

              {/* Detailed Reason */}
              <Textarea
                label="Detailed Description *"
                name="reason"
                value={reportData.reason}
                onChange={handleInputChange}
                placeholder="Please provide specific details about the issue, including dates, times, and what happened..."
                rows={5}
                className="bg-gray-700 border-gray-600 text-white"
              />

              {/* Host-specific Tips */}
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <h4 className="text-yellow-400 font-medium mb-2">🏠 Host Reporting Tips:</h4>
                <ul className="text-yellow-300 text-sm space-y-1">
                  <li>• Include specific dates and times when issues occurred</li>
                  <li>• Mention any property damage with details</li>
                  <li>• Reference house rules that were violated</li>
                  <li>• Include communication attempts made to resolve the issue</li>
                  <li>• Attach photos of damage if applicable</li>
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
                      type: '',
                      reason: '',
                      description: '',
                      client_name: ''
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