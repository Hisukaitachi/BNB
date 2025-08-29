// src/services/reportsService.js - Reports & Disputes Management
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
   * Submit report/dispute to host
   * @param {object} reportData - Report data
   * @returns {Promise<object>} Submit result
   */
  async submitReport(reportData) {
    try {
      const { 
        reported_user_id, 
        booking_id, 
        reason, 
        type = REPORT_TYPES.OTHER,
        description,
        evidence
      } = reportData;

      // Validation
      if (!reported_user_id || !reason) {
        throw new Error('Reported user and reason are required');
      }

      if (reason.length < 10 || reason.length > 1000) {
        throw new Error('Reason must be between 10 and 1000 characters');
      }

      if (!Object.values(REPORT_TYPES).includes(type)) {
        throw new Error('Invalid report type');
      }

      const submitData = {
        reporter_id: this.getCurrentUserId(),
        reported_user_id,
        booking_id,
        reason,
        type,
        description: description || reason,
        status: REPORT_STATUS.PENDING
      };

      // Handle evidence files if provided
      if (evidence && evidence.length > 0) {
        submitData.evidence = evidence;
      }

      const response = await reportsAPI.submitReport(submitData);
      
      return {
        success: true,
        message: 'Report submitted successfully. Our team will review it shortly.',
        reportId: response.data.data?.reportId,
        data: response.data
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to submit report');
    }
  }

  /**
   * Get user's submitted reports
   * @returns {Promise<Array>} User's reports
   */
  async getMyReports() {
    try {
      const response = await reportsAPI.getMyReports();
      return response.data.data?.reports || [];
    } catch (error) {
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
   * Format report for display
   * @param {object} report - Report object
   * @returns {object} Formatted report
   */
  formatReport(report) {
    const statusColors = {
      [REPORT_STATUS.PENDING]: 'text-yellow-600 bg-yellow-100',
      [REPORT_STATUS.UNDER_REVIEW]: 'text-blue-600 bg-blue-100',
      [REPORT_STATUS.RESOLVED]: 'text-green-600 bg-green-100',
      [REPORT_STATUS.CLOSED]: 'text-gray-600 bg-gray-100'
    };

    const statusLabels = {
      [REPORT_STATUS.PENDING]: 'Pending Review',
      [REPORT_STATUS.UNDER_REVIEW]: 'Under Review',
      [REPORT_STATUS.RESOLVED]: 'Resolved',
      [REPORT_STATUS.CLOSED]: 'Closed'
    };

    const typeInfo = this.getReportTypes()[report.type] || this.getReportTypes()[REPORT_TYPES.OTHER];

    return {
      ...report,
      statusColor: statusColors[report.status] || statusColors[REPORT_STATUS.PENDING],
      statusLabel: statusLabels[report.status] || report.status,
      typeLabel: typeInfo.label,
      typeDescription: typeInfo.description,
      formattedDate: new Date(report.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      timeAgo: this.formatTimeAgo(report.created_at),
      isResolved: [REPORT_STATUS.RESOLVED, REPORT_STATUS.CLOSED].includes(report.status)
    };
  }

  /**
   * Validate report data
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
    
    if (!reportData.type || !Object.values(REPORT_TYPES).includes(reportData.type)) {
      errors.push('Please select a valid report type');
    }
    
    return {
      isValid: errors.length === 0,
      errors
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

  /**
   * Get current user ID from storage
   * @returns {number} Current user ID
   */
  getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id;
  }

  /**
   * Check if user can submit report
   * @param {number} reportedUserId - User being reported
   * @param {number} bookingId - Related booking ID
   * @returns {Promise<object>} Eligibility check
   */
  async canSubmitReport(reportedUserId, bookingId = null) {
    try {
      const currentUserId = this.getCurrentUserId();
      
      // Cannot report yourself
      if (reportedUserId === currentUserId) {
        return {
          canReport: false,
          reason: 'You cannot report yourself'
        };
      }

      // If booking is provided, verify user was part of it
      if (bookingId) {
        // This would need to be implemented with a booking check API
        // For now, assume it's valid
      }

      // Check if user has already reported this person recently
      const myReports = await this.getMyReports();
      const recentReport = myReports.find(report => 
        report.reported_user_id === reportedUserId && 
        this.isRecentReport(report.created_at)
      );

      if (recentReport) {
        return {
          canReport: false,
          reason: 'You have already reported this user recently'
        };
      }

      return { canReport: true };
    } catch (error) {
      return {
        canReport: false,
        reason: 'Unable to verify report eligibility'
      };
    }
  }

  /**
   * Check if report is recent (within 24 hours)
   * @param {string} timestamp - Report timestamp
   * @returns {boolean} Is recent
   */
  isRecentReport(timestamp) {
    const reportTime = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - reportTime) / (1000 * 60 * 60);
    return diffInHours < 24;
  }

  /**
   * Get report guidelines
   * @returns {Array} Guidelines list
   */
  getReportGuidelines() {
    return [
      'Provide specific details about the issue',
      'Include relevant dates and times',
      'Attach evidence if available (screenshots, photos)',
      'Be honest and accurate in your description',
      'Reports are reviewed within 24-48 hours',
      'False reports may result in account restrictions'
    ];
  }
}

export const reportsService = new ReportsService();