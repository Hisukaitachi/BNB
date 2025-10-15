// src/services/paymentService.js - Complete with All Logic
import { paymentAPI } from './api';

// =========================================================
// CONSTANTS
// =========================================================

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const PAYMENT_METHODS = {
  GCASH: 'gcash',
  CARD: 'card',
  GRAB_PAY: 'grab_pay',
  PAYMAYA: 'paymaya'
};

// =========================================================
// ERROR HANDLER
// =========================================================

const handlePaymentError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      success: false,
      message: error.response.data?.message || 'Payment request failed',
      statusCode: error.response.status,
      errors: error.response.data?.errors,
      data: error.response.data
    };
  } else if (error.request) {
    // Request made but no response received
    return {
      success: false,
      message: 'No response from server. Please check your connection.',
      statusCode: 0
    };
  } else {
    // Something else happened
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      statusCode: 0
    };
  }
};

// =========================================================
// PAYMENT SERVICE CLASS
// =========================================================

class PaymentService {
  /**
   * Create payment intent and redirect to PayMongo checkout
   * @param {number} bookingId - Booking ID
   * @param {object} options - Options: { autoRedirect: boolean }
   * @returns {Promise<object>} Payment intent data
   */
  async createPaymentIntent(bookingId, options = {}) {
    try {
      console.log('🔄 Creating payment intent for booking:', bookingId);
      
      const response = await paymentAPI.createPaymentIntent(bookingId);
      
      const paymentData = {
        success: true,
        paymentId: response.data.data?.paymentId,
        paymentIntent: response.data.data?.paymentIntent,
        booking: response.data.data?.booking
      };

      console.log('✅ Payment intent created:', paymentData.paymentIntent?.id);

      // Auto-redirect to PayMongo checkout unless disabled
      if (options.autoRedirect !== false && paymentData.paymentIntent?.checkout_url) {
        console.log('🔀 Redirecting to PayMongo checkout...');
        this.redirectToCheckout(paymentData.paymentIntent.checkout_url);
      }
      
      return paymentData;
    } catch (error) {
      console.error('❌ Payment intent creation failed:', error);
      const formattedError = handlePaymentError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Redirect to PayMongo checkout page
   * @param {string} checkoutUrl - PayMongo checkout URL
   */
  redirectToCheckout(checkoutUrl) {
    if (!checkoutUrl) {
      throw new Error('No checkout URL provided');
    }
    
    // Store the current URL for return navigation
    sessionStorage.setItem('payment_return_url', window.location.pathname);
    
    // Store timestamp for timeout handling
    sessionStorage.setItem('payment_initiated_at', Date.now().toString());
    
    console.log('🚀 Redirecting to:', checkoutUrl);
    
    // Redirect to PayMongo
    window.location.href = checkoutUrl;
  }

  /**
   * Process payment - simplified wrapper
   * @param {object} paymentData - Payment data with paymentIntent
   * @returns {Promise<object>} Payment result
   */
  async processPayment(paymentData) {
    try {
      const { paymentIntent } = paymentData;
      
      if (paymentIntent?.checkout_url) {
        this.redirectToCheckout(paymentIntent.checkout_url);
        
        return {
          success: true,
          redirectUrl: paymentIntent.checkout_url,
          message: 'Redirecting to payment page...'
        };
      }
      
      throw new Error('No payment URL received from server');
    } catch (error) {
      throw new Error(error.message || 'Payment processing failed');
    }
  }

  /**
   * Initiate payment flow (ONE-LINER)
   * Creates payment and auto-redirects to PayMongo
   * @param {number} bookingId - Booking ID to pay for
   * @returns {Promise<void>}
   */
  async initiatePayment(bookingId) {
    try {
      console.log('💳 Initiating payment for booking:', bookingId);
      
      // Create payment intent (with auto-redirect enabled)
      await this.createPaymentIntent(bookingId, { autoRedirect: true });
      
    } catch (error) {
      console.error('❌ Payment initiation failed:', error);
      throw error;
    }
  }

  /**
   * Get payment status for a booking
   * @param {number} bookingId - Booking ID
   * @returns {Promise<object>} Payment status
   */
  async getPaymentStatus(bookingId) {
    try {
      const response = await paymentAPI.getPaymentStatus(bookingId);
      return response.data.data?.payment || null;
    } catch (error) {
      const formattedError = handlePaymentError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Get user's payment history
   * @returns {Promise<Array>} Payment history
   */
  async getPaymentHistory() {
    try {
      const response = await paymentAPI.getMyPayments();
      return response.data.data?.payments || [];
    } catch (error) {
      const formattedError = handlePaymentError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Verify payment status with PayMongo and sync database
   * Manually syncs database with PayMongo status
   * @param {number} bookingId - Booking ID
   * @returns {Promise<object>} Verification result
   */
  async verifyPaymentStatus(bookingId) {
    try {
      console.log('🔍 Verifying payment status for booking:', bookingId);
      
      const response = await paymentAPI.verifyStatus(bookingId);
      const result = response.data.data;
      
      console.log('✅ Verification result:', {
        paymongoStatus: result.paymongoStatus,
        databaseStatus: result.databaseStatus,
        synced: result.synced,
        paid: result.paid
      });
      
      return {
        success: true,
        paymentIntentId: result.paymentIntentId,
        paymongoStatus: result.paymongoStatus,
        databaseStatus: result.databaseStatus,
        synced: result.synced,
        paid: result.paid
      };
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      const formattedError = handlePaymentError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Check payment after redirect from PayMongo
   * Polls with retries to wait for webhook processing
   * @param {number} bookingId - Booking ID from URL params
   * @param {object} options - { maxAttempts: 5, delayMs: 2000 }
   * @returns {Promise<object>} Payment verification result
   */
  async verifyPaymentAfterRedirect(bookingId, options = {}) {
    const { maxAttempts = 5, delayMs = 2000 } = options;
    
    try {
      console.log('🔄 Verifying payment after redirect...');
      console.log(`⏱️ Will attempt ${maxAttempts} times with ${delayMs}ms delay`);
      
      // Poll payment status with retries (webhook might be processing)
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`📊 Verification attempt ${attempt}/${maxAttempts}`);
        
        try {
          // Verify with PayMongo to ensure sync
          const verification = await this.verifyPaymentStatus(bookingId);
          
          if (verification.paid) {
            console.log('✅ Payment verified as successful!');
            return {
              success: true,
              message: 'Payment successful!',
              verification
            };
          }
          
          console.log(`⏳ Payment not yet confirmed (attempt ${attempt}/${maxAttempts})`);
          
        } catch (verifyError) {
          console.warn(`⚠️ Verification attempt ${attempt} failed:`, verifyError.message);
        }
        
        // If not last attempt, wait before retrying
        if (attempt < maxAttempts) {
          console.log(`⏰ Waiting ${delayMs}ms before next attempt...`);
          await this.delay(delayMs);
        }
      }
      
      // After all attempts, get final status
      console.log('🔍 Final status check...');
      const payment = await this.getPaymentStatus(bookingId);
      
      const isSuccess = payment.status === PAYMENT_STATUS.SUCCEEDED;
      
      return {
        success: isSuccess,
        message: this.getStatusMessage(payment.status),
        payment
      };
      
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      throw new Error('Failed to verify payment status');
    }
  }

  /**
   * Get user-friendly status message
   * @param {string} status - Payment status
   * @returns {string} Status message
   */
  getStatusMessage(status) {
    const messages = {
      [PAYMENT_STATUS.SUCCEEDED]: 'Payment successful!',
      [PAYMENT_STATUS.PENDING]: 'Payment is still processing. Please wait...',
      [PAYMENT_STATUS.FAILED]: 'Payment failed. Please try again.',
      [PAYMENT_STATUS.CANCELLED]: 'Payment was cancelled',
      [PAYMENT_STATUS.REFUNDED]: 'Payment has been refunded'
    };
    
    return messages[status] || 'Unknown payment status';
  }

  /**
   * Format payment for display
   * @param {object} payment - Payment object
   * @returns {object} Formatted payment with colors, icons, labels
   */
  formatPayment(payment) {
    const statusColors = {
      [PAYMENT_STATUS.PENDING]: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      [PAYMENT_STATUS.SUCCEEDED]: 'text-green-600 bg-green-50 border-green-200',
      [PAYMENT_STATUS.FAILED]: 'text-red-600 bg-red-50 border-red-200',
      [PAYMENT_STATUS.CANCELLED]: 'text-gray-600 bg-gray-50 border-gray-200',
      [PAYMENT_STATUS.REFUNDED]: 'text-blue-600 bg-blue-50 border-blue-200'
    };

    const statusLabels = {
      [PAYMENT_STATUS.PENDING]: 'Processing',
      [PAYMENT_STATUS.SUCCEEDED]: 'Completed',
      [PAYMENT_STATUS.FAILED]: 'Failed',
      [PAYMENT_STATUS.CANCELLED]: 'Cancelled',
      [PAYMENT_STATUS.REFUNDED]: 'Refunded'
    };

    const statusIcons = {
      [PAYMENT_STATUS.PENDING]: '⏳',
      [PAYMENT_STATUS.SUCCEEDED]: '✅',
      [PAYMENT_STATUS.FAILED]: '❌',
      [PAYMENT_STATUS.CANCELLED]: '🚫',
      [PAYMENT_STATUS.REFUNDED]: '↩️'
    };

    return {
      ...payment,
      statusColor: statusColors[payment.status] || statusColors[PAYMENT_STATUS.PENDING],
      statusLabel: statusLabels[payment.status] || payment.status,
      statusIcon: statusIcons[payment.status] || '❓',
      formattedAmount: `₱${Number(payment.amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`,
      formattedDate: payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A'
    };
  }

  /**
   * Validate payment amount
   * @param {number} amount - Amount to validate
   * @returns {object} { isValid, errors, formattedAmount }
   */
  validatePaymentAmount(amount) {
    const errors = [];
    
    if (!amount || isNaN(amount)) {
      errors.push('Invalid amount');
    } else {
      if (amount <= 0) {
        errors.push('Amount must be greater than zero');
      }
      
      if (amount < 50) {
        errors.push('Minimum payment amount is ₱50');
      }
      
      if (amount > 100000) {
        errors.push('Maximum payment amount is ₱100,000');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      formattedAmount: `₱${Number(amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    };
  }

  /**
   * Calculate payment fees and breakdown
   * @param {number} amount - Base amount
   * @returns {object} Fee breakdown
   */
  calculatePaymentFees(amount) {
    const platformFee = Math.round(amount * 0.10 * 100) / 100; // 10% platform fee
    const hostEarnings = Math.round(amount * 0.90 * 100) / 100; // 90% to host
    
    return {
      baseAmount: amount,
      platformFee,
      hostEarnings,
      totalAmount: amount,
      breakdown: {
        'Booking Amount': `₱${amount.toLocaleString('en-PH')}`,
        'Platform Fee (10%)': `₱${platformFee.toLocaleString('en-PH')}`,
        'Host Earnings (90%)': `₱${hostEarnings.toLocaleString('en-PH')}`
      }
    };
  }

  /**
   * Check if payment can be retried
   * @param {object} payment - Payment object
   * @returns {boolean} Can retry
   */
  canRetryPayment(payment) {
    return payment.status === PAYMENT_STATUS.FAILED || 
           payment.status === PAYMENT_STATUS.CANCELLED;
  }

  /**
   * Test PayMongo configuration
   * @returns {Promise<object>} Configuration status
   */
  async testConfiguration() {
    try {
      const response = await paymentAPI.testConfig();
      return response.data;
    } catch (error) {
      const formattedError = handlePaymentError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Test payment routes health
   * @returns {Promise<object>} Routes status
   */
  async testRoutes() {
    try {
      const response = await paymentAPI.test();
      return response.data;
    } catch (error) {
      const formattedError = handlePaymentError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Helper: Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear payment session data
   */
  clearPaymentSession() {
    sessionStorage.removeItem('payment_return_url');
    sessionStorage.removeItem('payment_initiated_at');
    console.log('🧹 Payment session cleared');
  }

  /**
   * Get return URL after payment
   * @returns {string} Return URL or default
   */
  getReturnUrl() {
    return sessionStorage.getItem('payment_return_url') || '/bookings';
  }

  /**
   * Check if payment session has timed out
   * @param {number} timeoutMinutes - Timeout in minutes (default: 30)
   * @returns {boolean} Has timed out
   */
  hasPaymentTimedOut(timeoutMinutes = 30) {
    const initiatedAt = sessionStorage.getItem('payment_initiated_at');
    if (!initiatedAt) return false;
    
    const elapsed = Date.now() - parseInt(initiatedAt);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    return elapsed > timeoutMs;
  }

  /**
   * Retry API call with exponential backoff
   * @param {Function} apiCall - API function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} delay - Initial delay in ms
   * @returns {Promise} API response
   */
  async retryRequest(apiCall, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except timeout
        if (error.response?.status >= 400 && 
            error.response?.status < 500 && 
            error.response?.status !== 408) {
          console.log('❌ Client error - not retrying');
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = delay * attempt;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await this.delay(waitTime);
        }
      }
    }
    
    console.log('❌ All retry attempts failed');
    throw lastError;
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted amount
   */
  formatCurrency(amount) {
    return `₱${Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Format date
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!date) return 'N/A';
    
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get payment method icon
   * @param {string} method - Payment method
   * @returns {string} Icon emoji
   */
  getPaymentMethodIcon(method) {
    const icons = {
      [PAYMENT_METHODS.GCASH]: '💳',
      [PAYMENT_METHODS.CARD]: '💳',
      [PAYMENT_METHODS.GRAB_PAY]: '🚕',
      [PAYMENT_METHODS.PAYMAYA]: '💰'
    };
    
    return icons[method] || '💳';
  }

  /**
   * Get payment method label
   * @param {string} method - Payment method
   * @returns {string} Label
   */
  getPaymentMethodLabel(method) {
    const labels = {
      [PAYMENT_METHODS.GCASH]: 'GCash',
      [PAYMENT_METHODS.CARD]: 'Credit/Debit Card',
      [PAYMENT_METHODS.GRAB_PAY]: 'GrabPay',
      [PAYMENT_METHODS.PAYMAYA]: 'PayMaya'
    };
    
    return labels[method] || method;
  }
}

// =========================================================
// EXPORT SINGLETON INSTANCE
// =========================================================

export default new PaymentService();