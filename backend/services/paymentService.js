// backend/services/paymentService.js - OPTIMIZED & FIXED
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');

const API = 'https://api.paymongo.com/v1';
const KEY = process.env.PAYMONGO_SECRET_KEY;
const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

if (!KEY) {
  console.warn('⚠️ PAYMONGO_SECRET_KEY not configured - payment features disabled');
}

// ==========================================
// AUTH HEADERS
// ==========================================
const getAuthHeaders = () => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }
  return {
    'Authorization': `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`,
    'Content-Type': 'application/json'
  };
};

// ==========================================
// CREATE PAYMENT INTENT
// ==========================================
exports.createPaymentIntent = async ({ 
  bookingId, 
  clientId, 
  hostId, 
  amount, 
  currency = 'PHP',
  bookingType = 'full',
  listingTitle = 'Listing'
}) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if payment already exists for this booking
    const [existingPayments] = await connection.query(
      'SELECT payment_intent_id, status FROM payments WHERE booking_id = ? AND status IN ("succeeded", "pending") ORDER BY created_at DESC LIMIT 1',
      [bookingId]
    );

    if (existingPayments.length > 0 && existingPayments[0].status === 'succeeded') {
      throw new Error('Payment already completed for this booking');
    }

    // Create Payment Intent payload
    const paymentType = bookingType === 'reserve' ? 'Deposit (50%)' : 'Full Payment';
    
    const payload = {
      data: {
        attributes: {
          amount: Math.round(amount * 100), // Convert to centavos
          currency: currency.toUpperCase(),
          payment_method_allowed: ['gcash', 'card', 'grab_pay', 'paymaya'],
          capture_type: 'automatic',
          description: `${listingTitle} - Booking #${bookingId} (${paymentType})`,
          statement_descriptor: 'STAYBNB',
          metadata: {
            booking_id: bookingId.toString(),
            client_id: clientId.toString(),
            host_id: hostId.toString(),
            booking_type: bookingType,
            amount: amount.toString()
          }
        }
      }
    };

    console.log('🔄 Creating PayMongo payment intent...');
    console.log('Amount:', amount, 'PHP (', Math.round(amount * 100), 'centavos)');
    
    // Create Payment Intent
    const intentResponse = await axios.post(`${API}/payment_intents`, payload, {
      headers: getAuthHeaders()
    });

    const intentData = intentResponse.data.data;
    const paymentIntentId = intentData.id;

    console.log('✅ Payment intent created:', paymentIntentId);

    // Calculate fees
    const platformFee = Math.round(amount * 0.10 * 100) / 100; // 10% platform fee
    const hostEarnings = Math.round(amount * 0.90 * 100) / 100; // 90% to host

    // Insert payment record into database
    const [result] = await connection.query(`
      INSERT INTO payments 
      (booking_id, client_id, host_id, payment_intent_id, amount, currency, 
       platform_fee, host_earnings, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      bookingId, 
      clientId, 
      hostId, 
      paymentIntentId, 
      amount, 
      currency, 
      platformFee, 
      hostEarnings
    ]);

    console.log('💾 Payment record created in database (ID:', result.insertId, ')');

    // Create Checkout Session
    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [{
            name: `${listingTitle} - ${paymentType}`,
            amount: Math.round(amount * 100),
            currency: currency.toUpperCase(),
            quantity: 1,
            description: `Booking #${bookingId}`
          }],
          payment_method_types: ['gcash', 'card', 'grab_pay', 'paymaya'],
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?booking_id=${bookingId}`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?booking_id=${bookingId}`,
          description: `${listingTitle} - Booking #${bookingId}`,
          metadata: {
            booking_id: bookingId.toString(),
            client_id: clientId.toString(),
            host_id: hostId.toString(),
            payment_intent_id: paymentIntentId,
            booking_type: bookingType
          }
        }
      }
    };

    console.log('🔄 Creating checkout session...');

    const checkoutResponse = await axios.post(`${API}/checkout_sessions`, checkoutPayload, {
      headers: getAuthHeaders()
    });

    const checkoutSession = checkoutResponse.data.data;
    const checkoutUrl = checkoutSession.attributes.checkout_url;

    console.log('✅ Checkout session created');
    console.log('Checkout URL:', checkoutUrl);

    // Update payment with checkout URL
    await connection.query(
      'UPDATE payments SET checkout_url = ? WHERE id = ?',
      [checkoutUrl, result.insertId]
    );

    await connection.commit();

    return {
      paymentIntent: {
        id: paymentIntentId,
        client_secret: intentData.attributes.client_key,
        status: intentData.attributes.status,
        amount: intentData.attributes.amount,
        checkout_url: checkoutUrl
      },
      paymentId: result.insertId
    };

  } catch (error) {
    await connection.rollback();
    console.error('❌ PayMongo payment creation failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw new Error(error.message || 'Payment processing unavailable');
  } finally {
    connection.release();
  }
};

// ==========================================
// VERIFY PAYMENT STATUS
// ==========================================
exports.verifyPayment = async (paymentIntentId) => {
  if (!KEY || !paymentIntentId) {
    throw new Error('Invalid payment verification request');
  }

  try {
    console.log('🔍 Verifying payment intent:', paymentIntentId);
    
    const response = await axios.get(`${API}/payment_intents/${paymentIntentId}`, {
      headers: getAuthHeaders()
    });

    const payment = response.data.data;
    
    console.log('✅ Payment verified:', {
      id: payment.id,
      status: payment.attributes.status,
      amount: payment.attributes.amount / 100
    });
    
    // Try to get checkout URL if available
    let checkoutUrl = null;
    
    try {
      // Get associated checkout session
      const checkoutResponse = await axios.get(
        `${API}/checkout_sessions?payment_intent_id=${paymentIntentId}`,
        { headers: getAuthHeaders() }
      );
      
      if (checkoutResponse.data.data && checkoutResponse.data.data.length > 0) {
        checkoutUrl = checkoutResponse.data.data[0].attributes.checkout_url;
      }
    } catch (err) {
      console.log('⚠️ Could not fetch checkout session:', err.message);
    }
    
    return {
      id: payment.id,
      status: payment.attributes.status,
      amount: payment.attributes.amount / 100,
      paid: payment.attributes.status === 'succeeded',
      last_payment_error: payment.attributes.last_payment_error,
      metadata: payment.attributes.metadata,
      checkout_url: checkoutUrl
    };

  } catch (error) {
    console.error('❌ Payment verification failed:', error.response?.data || error.message);
    throw new Error('Unable to verify payment status');
  }
};

// ==========================================
// WEBHOOK SIGNATURE VERIFICATION
// ==========================================
exports.verifyWebhookSignature = async (rawBody, signature) => {
  if (!WEBHOOK_SECRET) {
    console.warn('⚠️ PAYMONGO_WEBHOOK_SECRET not configured - webhook verification disabled');
    console.warn('⚠️ THIS IS UNSAFE FOR PRODUCTION!');
    return true;
  }

  if (!signature) {
    console.log('❌ No signature header found');
    return false;
  }

  try {
    console.log('🔐 Verifying webhook signature...');
    
    // Parse signature header: "t=timestamp,te=test_signature,li=live_signature"
    const signatureParts = signature.split(',');
    let timestamp = null;
    let testSignature = null;
    let liveSignature = null;

    signatureParts.forEach(part => {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      else if (key === 'te') testSignature = value;
      else if (key === 'li') liveSignature = value;
    });

    console.log('Parsed signature components:', { 
      hasTimestamp: !!timestamp, 
      hasTestSig: !!testSignature, 
      hasLiveSig: !!liveSignature 
    });

    // Determine which signature to use based on API key mode
    const isTestMode = KEY.includes('test');
    const signatureToVerify = isTestMode ? testSignature : liveSignature;

    if (!timestamp || !signatureToVerify) {
      console.error('❌ Missing required signature components');
      return false;
    }

    // Create expected signature
    const signedPayload = `${timestamp}.${rawBody}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    console.log('Signature comparison:', {
      mode: isTestMode ? 'test' : 'live',
      received: signatureToVerify.substring(0, 10) + '...',
      expected: expectedSignature.substring(0, 10) + '...',
      match: signatureToVerify === expectedSignature
    });

    // Use timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureToVerify),
      Buffer.from(expectedSignature)
    );

    if (isValid) {
      console.log('✅ Webhook signature verified');
    } else {
      console.log('❌ Webhook signature verification failed');
    }

    return isValid;

  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
};

// ==========================================
// UPDATE PAYMENT STATUS IN DB
// ==========================================
exports.updatePaymentStatus = async (paymentIntentId, status, paidAt = null) => {
  try {
    const updateData = {
      status,
      updated_at: new Date()
    };

    if (paidAt) {
      updateData.paid_at = new Date(paidAt * 1000);
    }

    const [result] = await pool.query(
      'UPDATE payments SET status = ?, paid_at = ?, updated_at = NOW() WHERE payment_intent_id = ?',
      [status, updateData.paid_at, paymentIntentId]
    );

    if (result.affectedRows === 0) {
      console.log('⚠️ No payment found with intent ID:', paymentIntentId);
      return false;
    }

    console.log('✅ Payment status updated:', { paymentIntentId, status });
    return true;

  } catch (error) {
    console.error('❌ Failed to update payment status:', error);
    throw error;
  }
};

// ==========================================
// SYNC PAYMENT WITH PAYMONGO
// ==========================================
exports.syncPaymentWithPayMongo = async (bookingId) => {
  try {
    console.log('🔄 Syncing payment for booking:', bookingId);

    // Get payment from database
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1',
      [bookingId]
    );

    if (payments.length === 0) {
      throw new Error('Payment not found in database');
    }

    const dbPayment = payments[0];
    const paymentIntentId = dbPayment.payment_intent_id;

    // Verify with PayMongo
    const verification = await exports.verifyPayment(paymentIntentId);

    console.log('PayMongo status:', verification.status);
    console.log('Database status:', dbPayment.status);

    // Update if different
    if (verification.status !== dbPayment.status) {
      console.log('🔄 Status mismatch - updating database...');
      
      await pool.query(
        'UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?',
        [verification.status, dbPayment.id]
      );

      // Update booking status if payment succeeded
      if (verification.status === 'succeeded') {
        await pool.query(
          'UPDATE bookings SET status = "confirmed", payment_status = "succeeded", updated_at = NOW() WHERE id = ?',
          [bookingId]
        );
      }

      console.log('✅ Database synced with PayMongo');
    } else {
      console.log('✅ Payment already in sync');
    }

    return {
      synced: true,
      paymongoStatus: verification.status,
      databaseStatus: dbPayment.status,
      payment: verification
    };

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
};

// ==========================================
// GET PAYMENT BY BOOKING ID
// ==========================================
exports.getPaymentByBookingId = async (bookingId) => {
  try {
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1',
      [bookingId]
    );

    if (payments.length === 0) {
      return null;
    }

    return payments[0];
  } catch (error) {
    console.error('❌ Failed to get payment:', error);
    throw error;
  }
};

// ==========================================
// CREATE DEPOSIT PAYMENT INTENT (For Reservations)
// ==========================================
exports.createDepositPaymentIntent = async ({ 
  reservationId, 
  clientId, 
  hostId, 
  depositAmount, 
  totalAmount, 
  currency = 'PHP',
  listingTitle = 'Listing'
}) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    const payload = {
      data: {
        attributes: {
          amount: Math.round(depositAmount * 100),
          currency: currency.toUpperCase(),
          payment_method_allowed: ['gcash', 'card', 'grab_pay', 'paymaya'],
          capture_type: 'automatic',
          description: `${listingTitle} - 50% Deposit (Reservation #${reservationId})`,
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

    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [{
            name: `${listingTitle} - 50% Deposit`,
            amount: Math.round(depositAmount * 100),
            currency: currency.toUpperCase(),
            quantity: 1,
            description: `Total: ₱${totalAmount.toLocaleString()} | Deposit: ₱${depositAmount.toLocaleString()}`
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
    console.error('❌ Deposit payment creation failed:', error.response?.data || error.message);
    throw new Error('Deposit payment processing failed');
  }
};

// ==========================================
// HELPER: CHECK IF PAYMONGO IS CONFIGURED
// ==========================================
exports.isConfigured = () => {
  return !!(KEY && WEBHOOK_SECRET);
};

// ==========================================
// HELPER: GET PAYMONGO CONFIGURATION STATUS
// ==========================================
exports.getConfigStatus = () => {
  return {
    secretKeyConfigured: !!KEY,
    webhookSecretConfigured: !!WEBHOOK_SECRET,
    fullyConfigured: !!(KEY && WEBHOOK_SECRET),
    mode: KEY ? (KEY.includes('test') ? 'test' : 'live') : 'unconfigured'
  };
};

module.exports = exports;