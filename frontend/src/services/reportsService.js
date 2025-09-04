// src/services/reportsService.js - Connected to Backend Controller
import { reportsAPI } from './api';

export const REPORT_TYPES = {
  HOST_ISSUE: 'host_issue',
  LISTING_ISSUE: 'listing_issue', 
  PAYMENT_ISSUE: 'payment_issue',
  SAFETY_CONCERN: 'safety_concern',
  INAPPROPRIATE_BEHAVIOR: 'inappropriate_behavior',
  FRAUD: 'fraud',
  OTHER: 'other'
};

export const REPORT_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

class ReportsService {
  /**
   * Submit report/dispute - UPDATED to match backend controller
   * @param {object} reportData - Report data
   * @returns {Promise<object>} Submit result
   */
  async submitReport(reportData) {
    try {
      const { 
        reporter_id, 
        reported_user_id, 
        booking_id = null, // Optional, can be null
        reason
      } = reportData;

      // Validation to match backend expectations
      if (!reporter_id || !reported_user_id || !reason) {
        throw new Error('Reporter ID, reported user ID, and reason are required');
      }

      if (reason.length < 10 || reason.length > 1000) {
        throw new Error('Reason must be between 10 and 1000 characters');
      }

      // Format data exactly as backend expects
      const backendData = {
        reporter_id: Number(reporter_id),
        reported_user_id: Number(reported_user_id),
        booking_id: booking_id ? Number(booking_id) : null,
        reason: reason.trim()
      };

      console.log('Sending to backend:', backendData);

      const response = await reportsAPI.submitReport(backendData);
      
      console.log('Backend response:', response);

      // Handle backend response format: { message: "Report submitted successfully." }
      return {
        success: true,
        message: response.data.message || 'Report submitted successfully',
        data: response.data
      };
      
    } catch (error) {
      console.error('ReportsService submitReport error:', error);
      throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to submit report');
    }
  }

  /**
   * Get user's submitted reports - UPDATED to match backend route
   * @returns {Promise<Array>} User's reports
   */
  async getMyReports() {
    try {
      const response = await reportsAPI.getMyReports();
      
      // Handle backend response format
      return response.data.data?.reports || [];
    } catch (error) {
      console.error('Get my reports error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch reports');
    }
  }

  /**
   * Get report types with descriptions
   * @returns {object} Report types
   */
  getReportTypes() {
    return {
      [REPORT_TYPES.HOST_ISSUE]: {
        label: 'Host Issue',
        description: 'Problems with host communication or behavior',
        examples: ['Unresponsive host', 'Misleading information', 'Poor communication']
      },
      [REPORT_TYPES.LISTING_ISSUE]: {
        label: 'Property Issue', 
        description: 'Issues with the property or listing accuracy',
        examples: ['Property not as described', 'Cleanliness issues', 'Safety concerns']
      },
      [REPORT_TYPES.PAYMENT_ISSUE]: {
        label: 'Payment Issue',
        description: 'Problems with payments or refunds',
        examples: ['Unauthorized charges', 'Refund not received', 'Payment errors']
      },
      [REPORT_TYPES.SAFETY_CONCERN]: {
        label: 'Safety Concern',
        description: 'Safety-related issues or concerns',
        examples: ['Unsafe property conditions', 'Security issues', 'Emergency access problems']
      },
      [REPORT_TYPES.INAPPROPRIATE_BEHAVIOR]: {
        label: 'Inappropriate Behavior',
        description: 'Harassment, discrimination, or inappropriate conduct',
        examples: ['Harassment', 'Discrimination', 'Inappropriate comments']
      },
      [REPORT_TYPES.FRAUD]: {
        label: 'Fraud or Scam',
        description: 'Fraudulent activity or scam attempts',
        examples: ['Fake listing', 'Identity fraud', 'Payment scams']
      },
      [REPORT_TYPES.OTHER]: {
        label: 'Other',
        description: 'Other issues not covered above',
        examples: ['Platform issues', 'Technical problems', 'General complaints']
      }
    };
  }

  /**
   * Validate report data - SIMPLIFIED for backend compatibility
   * @param {object} reportData - Report data to validate
   * @returns {object} Validation result
   */
  validateReportData(reportData) {
    const errors = [];
    
    if (!reportData.reported_user_id) {
      errors.push('Please select the user you want to report');
    }
    
    if (!reportData.reason || reportData.reason.trim().length < 10) {
      errors.push('Please provide a detailed reason (minimum 10 characters)');
    }
    
    if (reportData.reason && reportData.reason.length > 1000) {
      errors.push('Reason cannot exceed 1000 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get report guidelines
   * @returns {Array} Guidelines list
   */
  getReportGuidelines() {
    return [
      'Provide specific details about the issue',
      'Include relevant dates and times',
      'Be honest and accurate in your description',
      'Reports are reviewed within 24-48 hours',
      'False reports may result in account restrictions',
      'All reports are confidential'
    ];
  }

  /**
   * Format report for display
   * @param {object} report - Report object
   * @returns {object} Formatted report
   */
  formatReport(report) {
    return {
      ...report,
      formattedDate: new Date(report.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      timeAgo: this.formatTimeAgo(report.created_at)
    };
  }

  /**
   * Format time ago for reports
   * @param {string} timestamp - Timestamp
   * @returns {string} Formatted time
   */
  formatTimeAgo(timestamp) {
    const now = new Date();
    const reportTime = new Date(timestamp);
    const diffInHours = Math.floor((now - reportTime) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return reportTime.toLocaleDateString();
  }
}

export const reportsService = new ReportsService();