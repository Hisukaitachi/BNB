// src/services/paymentService.js - Fixed for PayMongo GCash Integration
import { paymentAPI } from './api';

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const PAYMENT_METHODS = {
  GCASH: 'gcash',
  CARD: 'card',
  GRAB_PAY: 'grab_pay'
};

class PaymentService {
  /**
   * Create payment intent and redirect to PayMongo
   * @param {number} bookingId - Booking ID
   * @returns {Promise<object>} Payment intent data
   */
  async createPaymentIntent(bookingId) {
    try {
      const response = await paymentAPI.createPaymentIntent(bookingId);
      
      const paymentData = {
        success: true,
        paymentId: response.data.data?.paymentId,
        paymentIntent: response.data.data?.paymentIntent,
        booking: response.data.data?.booking
      };

      // IMPORTANT: Check if we have a checkout URL from PayMongo
      if (paymentData.paymentIntent?.checkout_url) {
        // Redirect to PayMongo checkout page (GCash, Card, etc.)
        window.location.href = paymentData.paymentIntent.checkout_url;
      }
      
      return paymentData;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create payment');
    }
  }

  /**
   * Process payment with redirect to PayMongo
   * @param {object} paymentData - Payment processing data
   * @returns {Promise<object>} Payment result
   */
  async processPayment(paymentData) {
    try {
      const { paymentIntent } = paymentData;
      
      // Check if we have the checkout URL from backend
      if (paymentIntent?.checkout_url) {
        // Redirect to PayMongo checkout page
        window.location.href = paymentIntent.checkout_url;
        
        return {
          success: true,
          redirectUrl: paymentIntent.checkout_url,
          message: 'Redirecting to payment page...'
        };
      }
      
      // Fallback if no checkout URL
      throw new Error('No payment URL received from server');
    } catch (error) {
      throw new Error(error.message || 'Payment processing failed');
    }
  }

  /**
   * Handle payment button click
   * @param {number} bookingId - Booking ID to pay for
   * @returns {Promise<void>}
   */
  async initiatePayment(bookingId) {
    try {
      // Show loading state
      console.log('Initiating payment for booking:', bookingId);
      
      // Create payment intent
      const response = await paymentAPI.createPaymentIntent(bookingId);
      const { paymentIntent } = response.data.data;
      
      if (paymentIntent?.checkout_url) {
        // Redirect to PayMongo checkout
        console.log('Redirecting to PayMongo:', paymentIntent.checkout_url);
        window.location.href = paymentIntent.checkout_url;
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   * @param {number} bookingId - Booking ID
   * @returns {Promise<object>} Payment status
   */
  async getPaymentStatus(bookingId) {
    try {
      const response = await paymentAPI.getPaymentStatus(bookingId);
      return response.data.data?.payment || null;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get payment status');
    }
  }

  /**
   * Get payment history
   * @returns {Promise<Array>} Payment history
   */
  async getPaymentHistory() {
    try {
      const response = await paymentAPI.getMyPayments();
      return response.data.data?.payments || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payment history');
    }
  }

  /**
   * Check payment status after redirect back from PayMongo
   * @param {string} bookingId - Booking ID from URL params
   * @returns {Promise<object>} Payment verification result
   */
  async verifyPaymentAfterRedirect(bookingId) {
    try {
      // Get payment status from backend
      const payment = await this.getPaymentStatus(bookingId);
      
      if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
        return {
          success: true,
          message: 'Payment successful!',
          payment
        };
      } else if (payment.status === PAYMENT_STATUS.PENDING) {
        return {
          success: false,
          message: 'Payment is still processing. Please wait...',
          payment
        };
      } else {
        return {
          success: false,
          message: 'Payment failed or was cancelled',
          payment
        };
      }
    } catch (error) {
      throw new Error('Failed to verify payment status');
    }
  }

  /**
   * Format payment for display
   * @param {object} payment - Payment object
   * @returns {object} Formatted payment
   */
  formatPayment(payment) {
    const statusColors = {
      [PAYMENT_STATUS.PENDING]: 'text-yellow-500 bg-yellow-100',
      [PAYMENT_STATUS.SUCCEEDED]: 'text-green-500 bg-green-100',
      [PAYMENT_STATUS.FAILED]: 'text-red-500 bg-red-100',
      [PAYMENT_STATUS.REFUNDED]: 'text-gray-500 bg-gray-100'
    };

    const statusLabels = {
      [PAYMENT_STATUS.PENDING]: 'Processing',
      [PAYMENT_STATUS.SUCCEEDED]: 'Completed',
      [PAYMENT_STATUS.FAILED]: 'Failed',
      [PAYMENT_STATUS.REFUNDED]: 'Refunded'
    };

    return {
      ...payment,
      statusColor: statusColors[payment.status] || statusColors[PAYMENT_STATUS.PENDING],
      statusLabel: statusLabels[payment.status] || payment.status,
      formattedAmount: `₱${Number(payment.amount).toLocaleString()}`,
      formattedDate: new Date(payment.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  /**
   * Validate payment amount
   * @param {number} amount - Amount to validate
   * @returns {object} Validation result
   */
  validatePaymentAmount(amount) {
    const errors = [];
    
    if (!amount || amount <= 0) {
      errors.push('Amount must be greater than zero');
    }
    
    if (amount < 50) {
      errors.push('Minimum payment amount is ₱50');
    }
    
    if (amount > 100000) {
      errors.push('Maximum payment amount is ₱100,000');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      formattedAmount: `₱${Number(amount).toLocaleString()}`
    };
  }

  /**
   * Calculate payment fees
   * @param {number} amount - Base amount
   * @returns {object} Fee breakdown
   */
  calculatePaymentFees(amount) {
    const platformFee = Math.ceil(amount * 0.10); // 10% platform fee (matching backend)
    const hostEarnings = amount - platformFee;
    
    return {
      baseAmount: amount,
      platformFee,
      hostEarnings,
      totalAmount: amount,
      breakdown: {
        'Booking Amount': amount,
        'Platform Fee (10%)': platformFee,
        'Host Earnings': hostEarnings
      }
    };
  }
}

export default new PaymentService();