// src/components/reports/ReportsPage.jsx - Reports & Disputes Management  
import React, { useState } from 'react';
import { AlertTriangle, Send, X, FileText, Camera } from 'lucide-react';
import { reportsService, REPORT_TYPES } from '../../services/reportsService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Input';

const ReportsPage = () => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({
    reported_user_id: '',
    booking_id: '',
    type: '',
    reason: '',
    description: '',
    evidence: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMyReports = async () => {
    try {
      setLoading(true);
      const reports = await reportsService.getMyReports();
      setMyReports(reports.map(report => reportsService.formatReport(report)));
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadMyReports();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: value
    }));
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
      await reportsService.submitReport(reportData);
      
      // Reset form
      setReportData({
        reported_user_id: '',
        booking_id: '',
        type: '',
        reason: '',
        description: '',
        evidence: []
      });
      
      setShowReportForm(false);
      await loadMyReports(); // Refresh reports list
      alert('Report submitted successfully!');
    } catch (error) {
      alert('Failed to submit report: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reportTypes = reportsService.getReportTypes();
  const guidelines = reportsService.getReportGuidelines();

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Reports & Disputes</h1>
              <p className="text-gray-400">Submit reports or track existing ones</p>
            </div>
            
            <Button
              onClick={() => setShowReportForm(true)}
              variant="gradient"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Submit Report
            </Button>
          </div>

          {/* My Reports */}
          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">My Reports</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : myReports.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-4" />
                <p>No reports submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReports.map((report) => (
                  <div key={report.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{report.typeLabel}</h3>
                        <p className="text-sm text-gray-400">{report.formattedDate}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${report.statusColor}`}>
                        {report.statusLabel}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2">{report.reason}</p>
                    
                    {report.admin_response && (
                      <div className="mt-3 p-3 bg-blue-900/20 border border-blue-600 rounded">
                        <p className="text-blue-400 text-sm font-medium mb-1">Admin Response:</p>
                        <p className="text-blue-300 text-sm">{report.admin_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Reported User ID"
                      name="reported_user_id"
                      type="number"
                      value={reportData.reported_user_id}
                      onChange={handleInputChange}
                      placeholder="Enter user ID to report"
                      className="bg-white/10 border-gray-600 text-white"
                    />
                    
                    <Input
                      label="Related Booking ID (Optional)"
                      name="booking_id"
                      type="number"
                      value={reportData.booking_id}
                      onChange={handleInputChange}
                      placeholder="Enter booking ID if applicable"
                      className="bg-white/10 border-gray-600 text-white"
                    />
                  </div>

                  <Select
                    label="Report Type"
                    name="type"
                    value={reportData.type}
                    onChange={handleInputChange}
                    className="bg-white/10 border-gray-600 text-white"
                  >
                    <option value="">Select report type</option>
                    {Object.entries(reportTypes).map(([key, type]) => (
                      <option key={key} value={key} className="bg-gray-800">
                        {type.label}
                      </option>
                    ))}
                  </Select>

                  {reportData.type && (
                    <div className="p-3 bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-300 mb-2">
                        {reportTypes[reportData.type].description}
                      </p>
                      <p className="text-xs text-gray-400">
                        Examples: {reportTypes[reportData.type].examples.join(', ')}
                      </p>
                    </div>
                  )}

                  <Textarea
                    label="Detailed Reason"
                    name="reason"
                    value={reportData.reason}
                    onChange={handleInputChange}
                    placeholder="Please provide specific details about the issue..."
                    rows={4}
                    className="bg-white/10 border-gray-600 text-white"
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                      onClick={() => setShowReportForm(false)}
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
      </div>
    </div>
  );
};

export default ReportsPage;
