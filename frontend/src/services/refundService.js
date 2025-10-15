// frontend/src/services/refundService.js - CLEAN & SIMPLE
import { refundAPI } from './api';

export const REFUND_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  PARTIAL_COMPLETED: 'partial_completed',
  MANUAL_REVIEW: 'manual_review',
  REJECTED: 'rejected',
  FAILED: 'failed'
};

class RefundService {
  // ==========================================
  // CLIENT METHODS
  // ==========================================
  
  async requestRefund(bookingId, reason) {
    try {
      if (!bookingId || !reason) {
        throw new Error('Booking ID and reason are required');
      }

      if (reason.length < 10) {
        throw new Error('Please provide a detailed reason (minimum 10 characters)');
      }

      const response = await refundAPI.requestRefund(bookingId, reason);

      return {
        success: true,
        data: response.data.data,
        message: 'Refund request submitted successfully'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to request refund');
    }
  }

  async getMyRefunds(status = null) {
    try {
      const response = await refundAPI.getMyRefunds(status);
      return response.data.data?.refunds || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch refunds');
    }
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================
  
  async getAllRefundRequests(params = {}) {
    try {
      const response = await refundAPI.getAllRefundRequests(params);
      
      return {
        refunds: response.data.data?.refunds || [],
        statistics: response.data.data?.statistics || {},
        pagination: response.data.data?.pagination || {}
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch refund requests');
    }
  }

  async getRefundDetails(refundId) {
    try {
      const response = await refundAPI.getRefundDetails(refundId);
      return response.data.data?.refund || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch refund details');
    }
  }

  async processRefund(refundId, action, notes = '', customAmount = null) {
    try {
      if (!['approve', 'reject'].includes(action)) {
        throw new Error('Action must be "approve" or "reject"');
      }

      const response = await refundAPI.processRefund(refundId, action, notes, customAmount);

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || `Refund ${action}ed successfully`
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process refund');
    }
  }

  async confirmRefundIntent(refundIntentId) {
    try {
      if (!refundIntentId) {
        throw new Error('Refund intent ID is required');
      }

      const response = await refundAPI.confirmRefundIntent(refundIntentId);

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Refund processed successfully'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to confirm refund intent');
    }
  }

  async completePersonalRefund(refundId, notes) {
    try {
      if (!notes || notes.trim().length < 10) {
        throw new Error('Please provide details on how the refund was processed (minimum 10 characters)');
      }

      const response = await refundAPI.completePersonalRefund(refundId, notes);

      return {
        success: true,
        message: 'Personal refund marked as completed'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to complete personal refund');
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================
  
  formatRefund(refund) {
    const statusConfig = {
      [REFUND_STATUS.PENDING]: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '⏳',
        label: 'Pending Review'
      },
      [REFUND_STATUS.APPROVED]: {
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: '✓',
        label: 'Approved - Awaiting Confirmation'
      },
      [REFUND_STATUS.PROCESSING]: {
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '🔄',
        label: 'Processing'
      },
      [REFUND_STATUS.COMPLETED]: {
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: '✅',
        label: 'Completed'
      },
      [REFUND_STATUS.PARTIAL_COMPLETED]: {
        color: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: '⚠️',
        label: 'Partially Completed'
      },
      [REFUND_STATUS.MANUAL_REVIEW]: {
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: '👤',
        label: 'Manual Review Required'
      },
      [REFUND_STATUS.REJECTED]: {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '❌',
        label: 'Rejected'
      },
      [REFUND_STATUS.FAILED]: {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '⚠️',
        label: 'Failed'
      }
    };

    const config = statusConfig[refund.status] || statusConfig[REFUND_STATUS.PENDING];

    return {
      ...refund,
      statusColor: config.color,
      statusIcon: config.icon,
      statusLabel: config.label,
      formattedTotalPaid: refund.amount_paid ? `₱${Number(refund.amount_paid).toLocaleString()}` : 'N/A',
      formattedRefundAmount: refund.refund_amount ? `₱${Number(refund.refund_amount).toLocaleString()}` : 'N/A',
      formattedDeduction: refund.deduction_amount ? `₱${Number(refund.deduction_amount).toLocaleString()}` : '₱0',
      formattedPlatformRefund: refund.platform_refund ? `₱${Number(refund.platform_refund).toLocaleString()}` : '₱0',
      formattedPersonalRefund: refund.personal_refund ? `₱${Number(refund.personal_refund).toLocaleString()}` : '₱0',
      hasPersonalPayment: refund.personal_paid > 0,
      requiresManualRefund: refund.personal_refund > 0 && ['partial_completed', 'manual_review'].includes(refund.status),
      canProcess: refund.status === REFUND_STATUS.PENDING,
      canConfirm: refund.status === REFUND_STATUS.APPROVED,
      canCompleteManual: ['partial_completed', 'manual_review'].includes(refund.status),
      refundPercentageText: refund.refund_percentage ? `${refund.refund_percentage}%` : 'N/A',
      formattedDate: new Date(refund.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      timeAgo: this.formatTimeAgo(refund.created_at)
    };
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const refundTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - refundTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    
    return refundTime.toLocaleDateString('en-PH');
  }

  calculateStatistics(refunds) {
    return {
      total: refunds.length,
      pending: refunds.filter(r => r.status === REFUND_STATUS.PENDING).length,
      approved: refunds.filter(r => r.status === REFUND_STATUS.APPROVED).length,
      completed: refunds.filter(r => r.status === REFUND_STATUS.COMPLETED).length,
      rejected: refunds.filter(r => r.status === REFUND_STATUS.REJECTED).length,
      totalRefunded: refunds
        .filter(r => r.status === REFUND_STATUS.COMPLETED)
        .reduce((sum, r) => sum + Number(r.refund_amount || 0), 0),
      requiresAction: refunds.filter(r => 
        ['partial_completed', 'manual_review', 'pending', 'approved'].includes(r.status)
      ).length
    };
  }

  getStatusBadgeClass(status) {
    const classes = {
      [REFUND_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      [REFUND_STATUS.APPROVED]: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
      [REFUND_STATUS.PROCESSING]: 'bg-blue-100 text-blue-800 border border-blue-300',
      [REFUND_STATUS.COMPLETED]: 'bg-green-100 text-green-800 border border-green-300',
      [REFUND_STATUS.PARTIAL_COMPLETED]: 'bg-teal-100 text-teal-800 border border-teal-300',
      [REFUND_STATUS.MANUAL_REVIEW]: 'bg-purple-100 text-purple-800 border border-purple-300',
      [REFUND_STATUS.REJECTED]: 'bg-red-100 text-red-800 border border-red-300',
      [REFUND_STATUS.FAILED]: 'bg-red-100 text-red-800 border border-red-300'
    };
    
    return classes[status] || classes[REFUND_STATUS.PENDING];
  }
}

export default new RefundService();