// backend/services/paymentService.js - REPLACE YOUR EXISTING FILE
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');

const API = 'https://api.paymongo.com/v1';
const KEY = process.env.PAYMONGO_SECRET_KEY;

if (!KEY) {
  console.warn('PAYMONGO_SECRET_KEY not configured - payment features will be disabled');
}

const basicAuth = KEY ? `Basic ${Buffer.from(`${KEY}:`).toString('base64')}` : null;

exports.createPaymentIntent = async ({ bookingId, clientId, hostId, amount, currency = 'PHP' }) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    const payload = {
      data: {
        attributes: {
          amount: Math.round(amount * 100), // Convert to centavos
          currency: currency.toUpperCase(),
          payment_method_allowed: ['card', 'gcash', 'grab_pay'],
          capture_type: 'automatic',
          description: `Booking #${bookingId} payment`,
          metadata: {
            booking_id: bookingId.toString(),
            client_id: clientId.toString(),
            host_id: hostId.toString()
          }
        }
      }
    };

    const response = await axios.post(`${API}/payment_intents`, payload, {
      headers: {
        'Authorization': basicAuth,
        'Content-Type': 'application/json'
      }
    });

    const intentData = response.data.data;
    const paymentIntentId = intentData.id;

    // Calculate fees
    const platformFee = parseFloat((amount * 0.10).toFixed(2)); // 10% platform fee
    const hostEarnings = parseFloat((amount - platformFee).toFixed(2));

    // Record in database
    const [result] = await pool.query(`
      INSERT INTO payments 
      (booking_id, client_id, host_id, payment_intent_id, amount, currency, platform_fee, host_earnings, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [bookingId, clientId, hostId, paymentIntentId, amount, currency, platformFee, hostEarnings, 'pending']);

    return {
      paymentIntent: {
        id: paymentIntentId,
        client_secret: intentData.attributes.client_key,
        status: intentData.attributes.status,
        amount: intentData.attributes.amount
      },
      paymentId: result.insertId
    };

  } catch (error) {
    console.error('PayMongo payment intent creation failed:', error.response?.data || error.message);
    throw new Error('Payment processing unavailable. Please try again later.');
  }
};

exports.processSuccessfulPayment = async (paymentIntentId) => {
  if (!paymentIntentId) {
    throw new Error('Payment intent ID is required');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update payment status
    const [updateResult] = await connection.query(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE payment_intent_id = ?',
      ['succeeded', paymentIntentId]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      throw new Error('Payment record not found');
    }

    // Get booking ID and update booking status
    const [payments] = await connection.query(
      'SELECT booking_id FROM payments WHERE payment_intent_id = ?',
      [paymentIntentId]
    );

    if (payments.length > 0) {
      await connection.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        ['confirmed', payments[0].booking_id]
      );
    }

    await connection.commit();
    return true;

  } catch (error) {
    await connection.rollback();
    console.error('Failed to process successful payment:', error);
    throw error;
  } finally {
    connection.release();
  }
};

exports.createRefund = async (paymentIntentId, reason = 'requested_by_customer', amount = null) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    // Get original payment info if amount not specified
    if (!amount) {
      const [payments] = await pool.query(
        'SELECT amount FROM payments WHERE payment_intent_id = ?',
        [paymentIntentId]
      );
      
      if (payments.length === 0) {
        throw new Error('Original payment not found');
      }
      
      amount = Math.round(payments[0].amount * 100); // Convert to centavos
    }

    const payload = {
      data: {
        attributes: {
          amount: Math.round(amount),
          payment_intent_id: paymentIntentId,
          reason: reason
        }
      }
    };

    const response = await axios.post(`${API}/refunds`, payload, {
      headers: {
        'Authorization': basicAuth,
        'Content-Type': 'application/json'
      }
    });

    const refund = response.data.data;

    // Update payment record
    await pool.query(
      'UPDATE payments SET status = ?, refund_id = ?, refund_amount = ?, refund_reason = ?, updated_at = NOW() WHERE payment_intent_id = ?',
      ['refunded', refund.id, amount / 100, reason, paymentIntentId]
    );

    return refund;

  } catch (error) {
    console.error('PayMongo refund creation failed:', error.response?.data || error.message);
    throw new Error('Refund processing failed. Please contact support.');
  }
};

exports.verifyWebhookSignature = async (rawBody, signature) => {
  if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
    console.warn('PAYMONGO_WEBHOOK_SECRET not configured - webhook verification disabled');
    return true; // Allow in development
  }

  try {
    const [tPart, v1Part] = signature.split(',');
    const timestamp = tPart.split('=')[1];
    const providedSignature = v1Part.split('=')[1];
    
    const payload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
};

// Helper function to check if PayMongo is configured
exports.isConfigured = () => {
  return !!(KEY && process.env.PAYMONGO_WEBHOOK_SECRET);
};