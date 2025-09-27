// backend/services/paymentService.js - FIXED webhook verification
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');

const API = 'https://api.paymongo.com/v1';
const KEY = process.env.PAYMONGO_SECRET_KEY;

if (!KEY) {
  console.warn('PAYMONGO_SECRET_KEY not configured - payment features will be disabled');
}

// Fixed authentication header
const getAuthHeaders = () => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }
  return {
    'Authorization': `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`,
    'Content-Type': 'application/json'
  };
};

exports.createPaymentIntent = async ({ bookingId, clientId, hostId, amount, currency = 'PHP' }) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    // Create Payment Intent payload
    const payload = {
      data: {
        attributes: {
          amount: Math.round(amount * 100), // Convert to centavos
          currency: currency.toUpperCase(),
          payment_method_allowed: ['gcash', 'card', 'grab_pay'],
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

    console.log('Creating PayMongo payment intent...');
    
    // Create Payment Intent
    const response = await axios.post(`${API}/payment_intents`, payload, {
      headers: getAuthHeaders()
    });

    const intentData = response.data.data;
    const paymentIntentId = intentData.id;

    console.log('Payment intent created:', paymentIntentId);

    // Calculate fees
    const platformFee = parseFloat((amount * 0.10).toFixed(2)); // 10% platform fee
    const hostEarnings = parseFloat((amount - platformFee).toFixed(2));

    // Record in database
    const [result] = await pool.query(`
      INSERT INTO payments 
      (booking_id, client_id, host_id, payment_intent_id, amount, currency, platform_fee, host_earnings, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [bookingId, clientId, hostId, paymentIntentId, amount, currency, platformFee, hostEarnings, 'pending']);

    // Create Checkout Session for the payment intent
    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [{
            name: `Booking #${bookingId}`,
            amount: Math.round(amount * 100),
            currency: currency.toUpperCase(),
            quantity: 1
          }],
          payment_method_types: ['gcash', 'card', 'grab_pay'],
          // IMPORTANT: Update these URLs to match your routes
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?booking_id=${bookingId}`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?booking_id=${bookingId}`,
          description: `Payment for Booking #${bookingId}`,
          metadata: {
            booking_id: bookingId.toString(),
            client_id: clientId.toString(),
            host_id: hostId.toString(),
            payment_intent_id: paymentIntentId
          }
        }
      }
    };

    console.log('Creating checkout session with success URL:', checkoutPayload.data.attributes.success_url);

    const checkoutResponse = await axios.post(`${API}/checkout_sessions`, checkoutPayload, {
      headers: getAuthHeaders()
    });

    const checkoutSession = checkoutResponse.data.data;

    return {
      paymentIntent: {
        id: paymentIntentId,
        client_secret: intentData.attributes.client_key,
        status: intentData.attributes.status,
        amount: intentData.attributes.amount,
        checkout_url: checkoutSession.attributes.checkout_url
      },
      paymentId: result.insertId
    };

  } catch (error) {
    console.error('PayMongo payment creation failed:', error.response?.data || error.message);
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
      headers: getAuthHeaders()
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

// FIXED: Proper PayMongo webhook signature verification
exports.verifyWebhookSignature = async (rawBody, signature) => {
  // If webhook secret not configured, log warning but allow in development
  if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
    console.warn('⚠️ PAYMONGO_WEBHOOK_SECRET not configured - webhook verification disabled (UNSAFE for production!)');
    return true; // Only for development - MUST configure for production
  }

  try {
    console.log('🔐 Verifying webhook signature...');
    console.log('Signature header received:', signature);
    
    // PayMongo signature format: "t=timestamp,te=test_signature,li=live_signature"
    const signatureParts = signature.split(' ');
    let timestamp = null;
    let testSignature = null;
    let liveSignature = null;

    // Parse the signature components
    signatureParts.forEach(part => {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'te') {
        testSignature = value;
      } else if (key === 'li') {
        liveSignature = value;
      }
    });

    console.log('Parsed signature components:', { 
      hasTimestamp: !!timestamp, 
      hasTestSig: !!testSignature, 
      hasLiveSig: !!liveSignature 
    });

    // Use test signature if available (for test mode), otherwise use live signature
    const signatureToVerify = testSignature || liveSignature;

    if (!timestamp || !signatureToVerify) {
      console.error('❌ Missing required signature components');
      return false;
    }

    // Construct the signed payload: timestamp.raw_body
    const signedPayload = `${timestamp}.${rawBody}`;
    
    // Calculate expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    console.log('Signature comparison:', {
      received: signatureToVerify.substring(0, 10) + '...',
      expected: expectedSignature.substring(0, 10) + '...',
      match: signatureToVerify === expectedSignature
    });

    // Compare signatures (use timing-safe comparison to prevent timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(signatureToVerify),
      Buffer.from(expectedSignature)
    );

  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
};

// Helper function to check if PayMongo is configured
exports.isConfigured = () => {
  return !!(KEY && process.env.PAYMONGO_WEBHOOK_SECRET);
};

exports.createDepositPaymentIntent = async ({ reservationId, clientId, hostId, depositAmount, totalAmount, currency = 'PHP' }) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    const payload = {
      data: {
        attributes: {
          amount: Math.round(depositAmount * 100), // Convert to centavos
          currency: currency.toUpperCase(),
          payment_method_allowed: ['gcash', 'card', 'grab_pay', 'paymaya'],
          capture_type: 'automatic',
          description: `50% Deposit for Reservation #${reservationId}`,
          statement_descriptor: 'STAYBNB DEPOSIT',
          metadata: {
            reservation_id: reservationId.toString(),
            client_id: clientId.toString(),
            host_id: hostId.toString(),
            payment_type: 'deposit',
            total_amount: totalAmount.toString(),
            deposit_amount: depositAmount.toString()
          }
        }
      }
    };

    const response = await axios.post(`${API}/payment_intents`, payload, {
      headers: getAuthHeaders()
    });

    const intentData = response.data.data;

    // Create checkout session with custom success/cancel pages
    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [{
            name: `Reservation #${reservationId} - 50% Deposit`,
            amount: Math.round(depositAmount * 100),
            currency: currency.toUpperCase(),
            quantity: 1,
            description: `Total booking: ₱${totalAmount} | Deposit: ₱${depositAmount}`
          }],
          payment_method_types: ['gcash', 'card', 'grab_pay', 'paymaya'],
          success_url: `${process.env.FRONTEND_URL}/reservations/payment-success?reservation_id=${reservationId}&type=deposit`,
          cancel_url: `${process.env.FRONTEND_URL}/reservations/payment-cancel?reservation_id=${reservationId}`,
          description: `Deposit Payment for Reservation #${reservationId}`,
          metadata: {
            reservation_id: reservationId.toString(),
            payment_type: 'deposit',
            payment_intent_id: intentData.id
          }
        }
      }
    };

    const checkoutResponse = await axios.post(`${API}/checkout_sessions`, checkoutPayload, {
      headers: getAuthHeaders()
    });

    return {
      paymentIntent: {
        id: intentData.id,
        client_secret: intentData.attributes.client_key,
        status: intentData.attributes.status,
        amount: intentData.attributes.amount,
        checkout_url: checkoutResponse.data.data.attributes.checkout_url
      }
    };

  } catch (error) {
    console.error('PayMongo deposit payment creation failed:', error.response?.data || error.message);
    throw new Error('Deposit payment processing failed. Please try again.');
  }
};

// Process refund with service fee calculation
exports.processReservationRefund = async (reservation, cancellationDetails) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    const { paymentIntentId, refundAmount, reason = 'requested_by_customer' } = cancellationDetails;

    // Only process refund if there's an amount to refund
    if (refundAmount <= 0) {
      return {
        success: true,
        refundAmount: 0,
        message: 'No refund applicable based on cancellation policy'
      };
    }

    const payload = {
      data: {
        attributes: {
          amount: Math.round(refundAmount * 100), // Convert to centavos
          payment_intent_id: paymentIntentId,
          reason: reason,
          metadata: {
            reservation_id: reservation.id.toString(),
            cancellation_fee: cancellationDetails.cancellationFee.toString(),
            refund_percentage: cancellationDetails.refundPercentage.toString()
          }
        }
      }
    };

    const response = await axios.post(`${API}/refunds`, payload, {
      headers: getAuthHeaders()
    });

    const refund = response.data.data;

    return {
      success: true,
      refundId: refund.id,
      refundAmount: refundAmount,
      status: refund.attributes.status,
      processedAt: refund.attributes.created_at
    };

  } catch (error) {
    console.error('PayMongo refund processing failed:', error.response?.data || error.message);
    throw new Error('Refund processing failed. Admin intervention required.');
  }
};

// Verify payment status for reservations
exports.verifyReservationPayment = async (paymentIntentId) => {
  if (!KEY || !paymentIntentId) {
    throw new Error('Invalid payment verification request');
  }

  try {
    const response = await axios.get(`${API}/payment_intents/${paymentIntentId}`, {
      headers: getAuthHeaders()
    });

    const payment = response.data.data;
    
    return {
      id: payment.id,
      status: payment.attributes.status,
      amount: payment.attributes.amount / 100, // Convert from centavos
      paid: payment.attributes.status === 'succeeded',
      last_payment_error: payment.attributes.last_payment_error,
      metadata: payment.attributes.metadata
    };

  } catch (error) {
    console.error('Payment verification failed:', error.response?.data || error.message);
    throw new Error('Unable to verify payment status');
  }
};