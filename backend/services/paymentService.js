// services/paymentService.js
const axios = require('axios')
const crypto = require('crypto')
const pool  = require('../db')           // Your MariaDB connection pool
const API   = 'https://api.paymongo.com/v1'
const KEY   = process.env.PAYMONGO_SECRET_KEY
const basicAuth = 'Basic ' + Buffer.from(`${KEY}:`).toString('base64');

exports.createPaymentIntent = async ({ bookingId, clientId, hostId, amount, currency }) =>{
  try {
    // Build Basic Auth header
    const basicAuth = Buffer.from(`${KEY}:`).toString('base64')

    // Construct payload
    const payload = {
      data: {
        attributes: {
          amount,                     // e.g. 150000 = ₱1,500.00
          currency: currency.toString().toUpperCase(),
          payment_method_allowed: ['card'],
          capture_type: 'automatic',
          description: `Booking ${bookingId}, client ${clientId}, host ${hostId}`
        }
      }
    }

    // 1. Call PayMongo
    const res = await axios.post(
      `${API}/payment_intents`,
      payload,
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        }
      }
    )

    // Inspect the actual shape:
    console.log('[PayMongo raw response]', JSON.stringify(res.data, null, 2))

    // 2. Extract id and attributes
    const intentData       = res.data.data
    const paymentIntentId  = intentData.id
    const intentAttributes = intentData.attributes

    // Calculate fees
    const adminFee     = parseFloat((amount * 0.10).toFixed(2))
    const payoutAmount = parseFloat((amount - adminFee).toFixed(2))

    // 3. Record in your DB
    const [rows] = await pool.query(
      'CALL sp_create_payment(?, ?, ?, ?, ?, ?, ?, ?)',
      [
        bookingId,
        clientId,
        hostId,
        paymentIntentId,   // ← now correctly non‐null
        amount,
        currency,
        adminFee,
        payoutAmount
      ]
    )
    const paymentId = rows[0].payment_id

    // Return a flattened paymentIntent object
    return {
      paymentIntent: { id: paymentIntentId, ...intentAttributes },
      paymentId
    }

  } catch (err) {
    console.error('[PaymentService] createPaymentIntent error:', err.response?.data || err.message)
    throw err
  }
}

exports.processSuccessfulPayment = async (attributes) => {
  try {
    await pool.query(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE payment_intent_id = ?',
      ['succeeded', attributes.id]
    )
  } catch (err) {
    console.error('[PaymentService] processSuccessfulPayment error:', err.message)
    throw err
  }
}

// services/paymentService.js

exports.createRefund = async (paymentIntentId, reason = 'requested_by_customer') => {
  try {
    const payload = {
      data: {
        attributes: {
          payment_intent_id: paymentIntentId,
          reason
        }
      }
    };

    const { data } = await axios.post(`${API}/refunds`, payload, {
      headers: {
        Authorization: basicAuth,
        'Content-Type': 'application/json'
      }
    });

    const refund = data.data;
    const amt = refund.attributes.amount / 100; // PayMongo returns amount in centavos

    // Record refund in DB
    await pool.query(
      'CALL sp_record_refund(?,?,?,?)',
      [paymentIntentId, refund.id, amt, reason]
    );

    return refund;
  } catch (err) {
    console.error('[createRefund Error]', err.response?.data || err.message);
    throw new Error(err.response?.data?.errors?.[0]?.detail || 'Refund failed');
  }
};


exports.verifyWebhookSignature = async (rawBody, header) => {
  const [tPart, v1Part] = header.split(',');
  const timestamp = tPart.split('=')[1];
  const signature = v1Part.split('=')[1];
  const payload   = `${timestamp}.${rawBody}`;
  const expected  = crypto.createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

