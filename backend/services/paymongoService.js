// services/paymongoService.js
const axios = require('axios');

class PayMongoService {
  constructor() {
    // Use test mode keys for development
    this.secretKey = process.env.PAYMONGO_SECRET_KEY || 'sk_test_YOUR_TEST_SECRET_KEY';
    this.baseURL = 'https://api.paymongo.com/v1';
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`
      }
    });
  }

  // Create a payout to a GCash or bank account
  async createPayout(data) {
    try {
      const payoutData = {
        data: {
          attributes: {
            amount: Math.round(data.amount * 100), // Convert to centavos
            currency: 'PHP',
            description: data.description || `Payout for Host #${data.host_id}`,
            metadata: {
              host_id: data.host_id,
              payout_id: data.payout_id,
              booking_ids: data.booking_ids || []
            }
          }
        }
      };

      // Add recipient details based on payment method
      if (data.payment_method === 'gcash') {
        payoutData.data.attributes.type = 'gcash';
        payoutData.data.attributes.properties = {
          account_number: data.gcash_number,
          account_name: data.account_name
        };
      } else if (data.payment_method === 'bank_transfer') {
        payoutData.data.attributes.type = 'bank_transfer';
        payoutData.data.attributes.properties = {
          bank_code: data.bank_code, // e.g., 'bpi', 'bdo', 'unionbank'
          account_number: data.account_number,
          account_name: data.account_name,
          account_type: data.account_type || 'savings' // 'savings' or 'checking'
        };
      } else if (data.payment_method === 'paymaya') {
        payoutData.data.attributes.type = 'paymaya';
        payoutData.data.attributes.properties = {
          account_number: data.paymaya_number,
          account_name: data.account_name
        };
      }

      const response = await this.client.post('/payouts', payoutData);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo Payout Creation Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message,
        code: error.response?.status
      };
    }
  }

  // Retrieve a specific payout
  async retrievePayout(payoutId) {
    try {
      const response = await this.client.get(`/payouts/${payoutId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo Retrieve Payout Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message,
        code: error.response?.status
      };
    }
  }

  // List all payouts with filters
  async listPayouts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.after) queryParams.append('after', params.after);
      if (params.before) queryParams.append('before', params.before);
      
      const response = await this.client.get(`/payouts?${queryParams.toString()}`);
      return {
        success: true,
        data: response.data.data,
        has_more: response.data.has_more
      };
    } catch (error) {
      console.error('PayMongo List Payouts Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message,
        code: error.response?.status
      };
    }
  }

  // Create a batch payout for multiple recipients
  async createBatchPayout(recipients) {
    try {
      const batchData = {
        data: {
          attributes: {
            payouts: recipients.map(recipient => ({
              amount: Math.round(recipient.amount * 100),
              currency: 'PHP',
              description: recipient.description,
              type: recipient.payment_method,
              properties: this.formatRecipientProperties(recipient),
              metadata: {
                host_id: recipient.host_id,
                payout_id: recipient.payout_id
              }
            }))
          }
        }
      };

      const response = await this.client.post('/batch_payouts', batchData);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('PayMongo Batch Payout Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message,
        code: error.response?.status
      };
    }
  }

  // Helper function to format recipient properties
  formatRecipientProperties(recipient) {
    if (recipient.payment_method === 'gcash') {
      return {
        account_number: recipient.gcash_number,
        account_name: recipient.account_name
      };
    } else if (recipient.payment_method === 'bank_transfer') {
      return {
        bank_code: recipient.bank_code,
        account_number: recipient.account_number,
        account_name: recipient.account_name,
        account_type: recipient.account_type || 'savings'
      };
    } else if (recipient.payment_method === 'paymaya') {
      return {
        account_number: recipient.paymaya_number,
        account_name: recipient.account_name
      };
    }
    return {};
  }

  // Process batch payouts one by one to handle rate limits
  async createBatchPayout(recipients) {
  try {
    const results = {
      successful: [],
      failed: []
    };

    // Process each payout one by one
    for (const recipient of recipients) {
      const payoutResult = await this.createPayout(recipient);
      
      if (payoutResult.success) {
        results.successful.push({
          payout_id: recipient.payout_id,
          paymongo_id: payoutResult.data.id,
          status: 'success'
        });
      } else {
        results.failed.push({
          payout_id: recipient.payout_id,
          error: payoutResult.error,
          status: 'failed'
        });
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      success: true,
      data: {
        id: `batch_${Date.now()}`, // Generate a batch ID for tracking
        successful_count: results.successful.length,
        failed_count: results.failed.length,
        results: results
      }
    };
  } catch (error) {
    console.error('PayMongo Batch Processing Error:', error.message);
    return {
      success: false,
      error: error.message,
      code: 500
    };
  }
}

  // Validate bank account details
  async validateBankAccount(bankCode, accountNumber) {
    try {
      const response = await this.client.post('/account_validations', {
        data: {
          attributes: {
            bank_code: bankCode,
            account_number: accountNumber
          }
        }
      });
      return {
        success: true,
        valid: response.data.data.attributes.status === 'valid',
        account_name: response.data.data.attributes.account_name
      };
    } catch (error) {
      console.error('Bank Account Validation Error:', error.response?.data || error.message);
      return {
        success: false,
        valid: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message
      };
    }
  }

  // Get payout status mapping
  mapPayMongoStatus(status) {
    const statusMap = {
      'pending': 'processing',      // PayMongo is processing
      'processing': 'processing',    // Still processing
      'paid': 'completed',          // Successfully sent
      'failed': 'failed',           // Failed to send
      'cancelled': 'cancelled'      // Cancelled by system
    };
    return statusMap[status] || status;
  }

  // Calculate payout fee (PayMongo charges fees)
  calculatePayoutFee(amount, method) {
    // PayMongo payout fees (example rates - check actual rates)
    const fees = {
      gcash: { fixed: 15, percentage: 0 },
      paymaya: { fixed: 15, percentage: 0 },
      bank_transfer: { fixed: 25, percentage: 0 },
      instapay: { fixed: 15, percentage: 0 },
      pesonet: { fixed: 30, percentage: 0 }
    };

    const fee = fees[method] || fees.bank_transfer;
    return fee.fixed + (amount * fee.percentage);
  }

  // Check if amount meets minimum payout requirements
  validatePayoutAmount(amount, method) {
    // Minimum payout amounts per method
    const minimums = {
      gcash: 100,
      paymaya: 100,
      bank_transfer: 100,
      instapay: 1,
      pesonet: 1
    };

    const minimum = minimums[method] || 100;
    
    if (amount < minimum) {
      return {
        valid: false,
        message: `Minimum payout amount for ${method} is ₱${minimum}`
      };
    }

    // Maximum limits
    const maximums = {
      gcash: 50000,
      paymaya: 50000,
      bank_transfer: 1000000,
      instapay: 50000,
      pesonet: 1000000
    };

    const maximum = maximums[method] || 1000000;
    
    if (amount > maximum) {
      return {
        valid: false,
        message: `Maximum payout amount for ${method} is ₱${maximum.toLocaleString()}`
      };
    }

    return { valid: true };
  }

  // Format error messages for user display
  formatErrorMessage(error) {
    const errorMessages = {
      'insufficient_balance': 'Your PayMongo account has insufficient balance for this payout',
      'invalid_account': 'The recipient account details are invalid',
      'duplicate_request': 'This payout request has already been processed',
      'account_not_found': 'The recipient account was not found',
      'service_unavailable': 'The payout service is temporarily unavailable'
    };

    // Check if error code exists in our map
    if (error.code && errorMessages[error.code]) {
      return errorMessages[error.code];
    }

    // Return the original error message or a generic one
    return error.message || 'An error occurred processing the payout';
  }
}

module.exports = new PayMongoService();