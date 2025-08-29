// src/services/paymentService.js - Payment Method (GCash) Integration
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
   * Create payment intent - Initialize GCash payment
   * @param {number} bookingId - Booking ID
   * @returns {Promise<object>} Payment intent data
   */
  async createPaymentIntent(bookingId) {
    try {
      const response = await paymentAPI.createPaymentIntent(bookingId);
      
      return {
        success: true,
        paymentId: response.data.data?.paymentId,
        paymentIntent: response.data.data?.paymentIntent,
        booking: response.data.data?.booking
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create payment');
    }
  }

  /**
   * Process GCash payment
   * @param {object} paymentData - Payment processing data
   * @returns {Promise<object>} Payment result
   */
  async processGCashPayment(paymentData) {
    try {
      // For GCash integration, you would typically:
      // 1. Redirect to GCash payment page
      // 2. Handle callback/webhook
      // 3. Verify payment status
      
      const { paymentIntent, paymentMethod = PAYMENT_METHODS.GCASH } = paymentData;
      
      // Simulate GCash payment flow
      if (paymentMethod === PAYMENT_METHODS.GCASH) {
        // Redirect to GCash payment page
        const gcashUrl = this.buildGCashPaymentUrl(paymentIntent);
        
        return {
          success: true,
          redirectUrl: gcashUrl,
          paymentMethod: 'gcash'
        };
      }
      
      throw new Error('Unsupported payment method');
    } catch (error) {
      throw new Error(error.message || 'Payment processing failed');
    }
  }

  /**
   * Build GCash payment URL (example implementation)
   * @param {object} paymentIntent - Payment intent data
   * @returns {string} GCash payment URL
   */
  buildGCashPaymentUrl(paymentIntent) {
    // This would be the actual GCash integration
    // For now, return a placeholder URL
    const baseUrl = 'https://api.paymongo.com/v1/checkout_sessions';
    const params = new URLSearchParams({
      client_key: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
    
    return `${baseUrl}?${params.toString()}`;
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
      }),
      paymentMethodLabel: this.getPaymentMethodLabel(payment.currency)
    };
  }

  /**
   * Get payment method label
   * @param {string} currency - Payment currency
   * @returns {string} Payment method label
   */
  getPaymentMethodLabel(currency) {
    const methods = {
      'PHP': 'GCash',
      'USD': 'Card',
      default: 'Online Payment'
    };
    
    return methods[currency] || methods.default;
  }

  /**
   * Handle payment webhook (for backend integration)
   * @param {object} webhookData - Webhook data
   * @returns {Promise<boolean>} Processing result
   */
  async handlePaymentWebhook(webhookData) {
    try {
      // This would be handled by your backend
      // Frontend just needs to listen for real-time updates
      console.log('Payment webhook received:', webhookData);
      return true;
    } catch (error) {
      console.error('Webhook processing error:', error);
      return false;
    }
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
    const gcashFee = Math.ceil(amount * 0.025); // 2.5% GCash fee
    const platformFee = Math.ceil(amount * 0.03); // 3% platform fee
    const total = amount + gcashFee + platformFee;
    
    return {
      baseAmount: amount,
      gcashFee,
      platformFee,
      totalFees: gcashFee + platformFee,
      totalAmount: total,
      breakdown: {
        'Booking Amount': amount,
        'GCash Processing Fee': gcashFee,
        'Platform Fee': platformFee
      }
    };
  }
}

export default new PaymentService();