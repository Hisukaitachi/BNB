// frontend/src/components/reports/ReportModal.jsx
import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { Textarea } from '../ui/Input';
import { reportsService, REPORT_TYPES } from '../../services/reportsService';

const ReportModal = ({ listing, onClose, onSubmit }) => {
  const [reportData, setReportData] = useState({
    reported_user_id: listing.host_id,
    type: '',
    reason: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const reportTypes = reportsService.getReportTypes();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!reportData.type) {
      setErrors({ submit: 'Please select an issue type' });
      return;
    }

    if (reportData.reason.length < 10) {
      setErrors({ submit: 'Please provide at least 10 characters describing the issue' });
      return;
    }

    try {
      setSubmitting(true);
      
      // Format data to match backend expectations
      const backendReportData = {
        reported_user_id: reportData.reported_user_id,
        booking_id: null, // Set to null if no specific booking
        reason: `${reportTypes[reportData.type]?.label}: ${reportData.reason}${reportData.description ? ' | Additional details: ' + reportData.description : ''}`
      };
      
      console.log('Submitting report data:', backendReportData);
      
      await onSubmit(backendReportData);
      onClose();
    } catch (error) {
      console.error('Report submission error:', error);
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
            Report Issue
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            <strong>Reporting:</strong> {listing.title}
          </p>
          <p className="text-yellow-300 text-xs">
            <strong>Host:</strong> {listing.host_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Issue Type *</label>
            <select
              value={reportData.type}
              onChange={(e) => setReportData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Select issue type</option>
              {Object.entries(reportTypes).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Description for selected type */}
          {reportData.type && (
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
              <p className="text-blue-400 text-sm font-medium mb-1">
                {reportTypes[reportData.type]?.label}
              </p>
              <p className="text-blue-300 text-xs">
                {reportTypes[reportData.type]?.description}
              </p>
              {reportTypes[reportData.type]?.examples && (
                <div className="mt-2">
                  <p className="text-blue-300 text-xs font-medium">Examples:</p>
                  <ul className="text-blue-200 text-xs mt-1 space-y-1">
                    {reportTypes[reportData.type].examples.slice(0, 3).map((example, index) => (
                      <li key={index}>• {example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Describe the Issue *
            </label>
            <Textarea
              value={reportData.reason}
              onChange={(e) => setReportData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please provide specific details about the issue you experienced..."
              rows={5}
              className="bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-red-500"
              maxLength={1000}
              required
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-400">{reportData.reason.length}/1000 characters</p>
              <p className="text-xs text-gray-400">Minimum 10 characters</p>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Information (Optional)
            </label>
            <Textarea
              value={reportData.description}
              onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Any additional context or evidence..."
              rows={3}
              className="bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-red-500"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{reportData.description.length}/500 characters</p>
          </div>

          {/* Guidelines */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Report Guidelines:</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              {reportsService.getReportGuidelines().slice(0, 4).map((guideline, index) => (
                <li key={index}>• {guideline}</li>
              ))}
            </ul>
          </div>

          {/* Warning */}
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 text-xs font-medium">Important:</p>
                <p className="text-red-300 text-xs">
                  False reports may result in account restrictions. Please ensure your report is accurate and truthful.
                </p>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3">
              <p className="text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="gradient" 
              loading={submitting} 
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700"
              disabled={!reportData.type || reportData.reason.length < 10}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;