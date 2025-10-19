// services/payoutService.js - Simplified Manual Payout Service
import { payoutAPI } from './api';

class PayoutService {
  // ==========================================
  // HOST OPERATIONS
  // ==========================================

  async requestPayout(payoutData) {
    try {
      const response = await payoutAPI.requestPayout(payoutData);
      return {
        success: true,
        data: response.data,
        message: 'Payout request submitted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to request payout',
        details: error.response?.data
      };
    }
  }

  async getAvailableBalance() {
    try {
      const response = await payoutAPI.getAvailableBalance();
      return {
        success: true,
        data: response.data.data.balance
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch balance',
        data: null
      };
    }
  }

  async getMyEarnings() {
    try {
      const response = await payoutAPI.getMyEarnings();
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch earnings',
        data: null
      };
    }
  }

  async getReceivedPayouts() {
    try {
      const response = await payoutAPI.getReceivedPayouts();
      return {
        success: true,
        data: response.data.payouts || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch received payouts',
        data: []
      };
    }
  }

  // ==========================================
  // ADMIN OPERATIONS
  // ==========================================

  async getAllPayouts(filters = {}) {
    try {
      console.log('🔍 Fetching payouts with filters:', filters);
      const response = await payoutAPI.getAllPayouts(filters);
      
      let payouts = [];
      let total = 0;
      
      if (response.data?.payouts) {
        payouts = response.data.payouts;
        total = response.data.total || payouts.length;
      } else if (Array.isArray(response.data)) {
        payouts = response.data;
        total = payouts.length;
      }
      
      console.log(`✅ Returning ${payouts.length} payouts`);
      
      return {
        success: true,
        data: payouts,
        total: total
      };
    } catch (error) {
      console.error('❌ getAllPayouts error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch payouts',
        data: []
      };
    }
  }

  async getPayoutStats() {
    try {
      const response = await payoutAPI.getPayoutStats();
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch statistics',
        data: null
      };
    }
  }

  async approvePayout(payoutId) {
    try {
      const response = await payoutAPI.approvePayout(payoutId);
      return {
        success: true,
        data: response.data,
        message: 'Payout approved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve payout'
      };
    }
  }

  async rejectPayout(payoutId, reason) {
    try {
      const response = await payoutAPI.rejectPayout(payoutId, reason);
      return {
        success: true,
        message: 'Payout rejected successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reject payout'
      };
    }
  }

  async completePayout(payoutId, proofUrl) {
    try {
      const response = await payoutAPI.completePayout(payoutId, proofUrl);
      return {
        success: true,
        message: 'Payout marked as complete'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to complete payout'
      };
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  calculateNetAmount(amount, paymentMethod) {
    const fees = {
      gcash: 15,
      paymaya: 15,
      bank_transfer: 25
    };
    const fee = fees[paymentMethod] || 0;
    return {
      fee,
      netAmount: amount - fee,
      total: amount
    };
  }

  validatePayoutRequest(data) {
    const errors = [];

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (data.amount < 100) {
      errors.push('Minimum payout amount is ₱100');
    }

    if (!data.payment_method) {
      errors.push('Payment method is required');
    }

    if (!data.bank_details) {
      errors.push('Payment details are required');
    }

    if (data.payment_method === 'bank_transfer') {
      if (!data.bank_details.bank_code) {
        errors.push('Bank is required');
      }
      if (!data.bank_details.account_number) {
        errors.push('Account number is required');
      }
      if (!data.bank_details.account_name) {
        errors.push('Account name is required');
      }
    } else if (data.payment_method === 'gcash' || data.payment_method === 'paymaya') {
      if (!data.bank_details.mobile_number) {
        errors.push('Mobile number is required');
      }
      if (!data.bank_details.account_name) {
        errors.push('Account name is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getStatusColor(status) {
    const colors = {
      pending: 'warning',
      approved: 'info',
      processing: 'info',
      completed: 'success',
      rejected: 'danger',
      failed: 'danger'
    };
    return colors[status] || 'secondary';
  }

  getStatusText(status) {
    const texts = {
      pending: 'Pending Approval',
      approved: 'Approved',
      processing: 'Processing',
      completed: 'Completed',
      rejected: 'Rejected',
      failed: 'Failed'
    };
    return texts[status] || status;
  }
}

export default new PayoutService();