// backend/services/refundService.js - UPDATED WITH payment_id support
const axios = require('axios');
const pool = require('../db');

const API = 'https://api.paymongo.com/v1';
const KEY = process.env.PAYMONGO_SECRET_KEY;

if (!KEY) {
  console.warn('PAYMONGO_SECRET_KEY not configured - refund features will be disabled');
}

// Authentication headers for PayMongo
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
// 🚀 AUTO-SYNC PAYMENT INTENT (FIXED!)
// ==========================================
exports.autoSyncPaymentIntent = async (bookingId) => {
  console.log(`🔄 Auto-syncing payment intent for booking ${bookingId}...`);
  
  try {
    // Get current payment record
    const [currentPayment] = await pool.query(
      'SELECT id, payment_intent_id, payment_id, status, booking_id FROM payments WHERE booking_id = ?',
      [bookingId]
    );

    if (!currentPayment.length) {
      throw new Error(`No payment record found for booking ${bookingId}`);
    }

    const payment = currentPayment[0];
    
    // If payment is already succeeded, verify it exists in PayMongo
    if (payment.status === 'succeeded') {
      try {
        const verifyResponse = await axios.get(
          `${API}/payment_intents/${payment.payment_intent_id}`,
          { headers: getAuthHeaders() }
        );
        
        const intentStatus = verifyResponse.data.data.attributes.status;
        if (intentStatus === 'succeeded') {
          console.log(`✅ Payment intent ${payment.payment_intent_id} verified as succeeded`);
          return {
            paymentIntentId: payment.payment_intent_id,
            paymentId: payment.payment_id
          };
        } else {
          console.log(`⚠️ Payment intent exists but status is '${intentStatus}', not 'succeeded'. Searching for correct one...`);
        }
      } catch (err) {
        console.log(`⚠️ Current payment intent not found or invalid (${err.response?.status}), searching for correct one...`);
      }
    }

    // 🔥 Search local database for all payment intents for this booking
    console.log(`🔍 Searching database for all payment intents for booking ${bookingId}...`);
    
    const [allPayments] = await pool.query(
      `SELECT payment_intent_id, payment_id, status, created_at, amount 
       FROM payments 
       WHERE booking_id = ? 
       ORDER BY created_at DESC`,
      [bookingId]
    );

    console.log(`📋 Found ${allPayments.length} payment record(s) in database`);

    // Try each payment intent to find one that succeeded
    let correctPaymentIntentId = null;
    let correctPaymentId = null;
    
    for (const paymentRecord of allPayments) {
      const intentId = paymentRecord.payment_intent_id;
      
      try {
        console.log(`🔍 Checking payment intent: ${intentId} (status in DB: ${paymentRecord.status})`);
        
        const response = await axios.get(
          `${API}/payment_intents/${intentId}`,
          { headers: getAuthHeaders() }
        );
        
        const intentData = response.data.data;
        const paymongoStatus = intentData.attributes.status;
        
        console.log(`   PayMongo status: ${paymongoStatus}`);
        
        if (paymongoStatus === 'succeeded') {
          console.log(`✅ Found succeeded payment intent: ${intentId}`);
          correctPaymentIntentId = intentId;
          
          // ✅ NEW: Extract payment_id from PayMongo response
          let extractedPaymentId = paymentRecord.payment_id; // Use DB value as fallback
          
          if (intentData.attributes.payments && intentData.attributes.payments.length > 0) {
            extractedPaymentId = intentData.attributes.payments[0].id;
            console.log(`   Extracted payment_id: ${extractedPaymentId}`);
          }
          
          correctPaymentId = extractedPaymentId;
          
          // Update database if needed
          if (payment.payment_intent_id !== intentId || payment.payment_id !== extractedPaymentId) {
            console.log(`🔄 Updating payment from ${payment.payment_intent_id}/${payment.payment_id} to ${intentId}/${extractedPaymentId}`);
            
            await pool.query(
              `UPDATE payments 
               SET payment_intent_id = ?, 
                   payment_id = ?,
                   status = 'succeeded', 
                   updated_at = NOW() 
               WHERE booking_id = ?`,
              [intentId, extractedPaymentId, bookingId]
            );
            
            console.log(`✅ Payment intent and payment_id auto-synced successfully`);
          }
          
          break; // Found it, stop searching
        }
      } catch (err) {
        console.log(`   ⚠️ Could not verify intent ${intentId}: ${err.message}`);
        continue; // Try next one
      }
    }

    if (!correctPaymentIntentId) {
      throw new Error(
        `No successful payment found for booking ${bookingId}. ` +
        `All ${allPayments.length} payment intent(s) checked. ` +
        `Please verify payment was completed in PayMongo dashboard.`
      );
    }

    return {
      paymentIntentId: correctPaymentIntentId,
      paymentId: correctPaymentId
    };

  } catch (error) {
    console.error('❌ Auto-sync failed:', error.message);
    throw new Error(`Failed to auto-sync payment intent: ${error.message}`);
  }
};

// ==========================================
// CREATE REFUND INTENT
// ==========================================
exports.createRefundIntent = async ({ 
  refundId, 
  bookingId, 
  clientId, 
  paymentIntentIds, 
  paymentIds, // ✅ NEW
  refundAmount, 
  reason = 'Cancellation refund' 
}) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    console.log('📤 Creating refund intent for:', {
      refundId,
      bookingId,
      paymentIntentIds,
      paymentIds, // ✅ NEW
      refundAmount
    });

    // ✅ UPDATED: Store both payment_intent_ids AND payment_ids
    const [result] = await pool.query(`
      INSERT INTO refund_intents (
        refund_id,
        booking_id,
        client_id,
        payment_intent_ids,
        payment_ids,
        refund_amount,
        currency,
        reason,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PHP', ?, 'pending', NOW())
    `, [
      refundId,
      bookingId,
      clientId,
      JSON.stringify(paymentIntentIds),
      JSON.stringify(paymentIds || []), // ✅ NEW
      refundAmount,
      reason
    ]);

    const refundIntentId = result.insertId;

    // Create approval URL (admin will review and approve)
    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/refund-approval/${refundIntentId}`;

    return {
      refundIntentId,
      approvalUrl,
      refundAmount,
      paymentIntentIds,
      paymentIds, // ✅ NEW
      status: 'pending'
    };

  } catch (error) {
    console.error('Refund intent creation failed:', error);
    throw new Error('Failed to create refund intent');
  }
};

// ==========================================
// CREATE REFUND IN PAYMONGO (WITH AUTO-SYNC & payment_id!)
// ==========================================
exports.createRefund = async (
  paymentIntentId, 
  paymentId = null, // ✅ NEW: Accept payment_id directly
  reason = 'requested_by_customer', 
  amount = null
) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    // 🔥 STEP 0: Get booking ID and AUTO-SYNC
    let bookingId = null;
    const [paymentCheck] = await pool.query(
      'SELECT booking_id, payment_id FROM payments WHERE payment_intent_id = ?',
      [paymentIntentId]
    );
    
    if (paymentCheck.length > 0) {
      bookingId = paymentCheck[0].booking_id;
      
      // ✅ Use payment_id from database if not provided
      if (!paymentId && paymentCheck[0].payment_id) {
        paymentId = paymentCheck[0].payment_id;
        console.log(`📝 Using payment_id from database: ${paymentId}`);
      }
    }

    // 🚀 AUTO-SYNC: Automatically find and fix incorrect payment intent IDs
    let actualPaymentIntentId = paymentIntentId;
    let actualPaymentId = paymentId;
    
    if (bookingId) {
      try {
        const syncResult = await exports.autoSyncPaymentIntent(bookingId);
        actualPaymentIntentId = syncResult.paymentIntentId;
        actualPaymentId = syncResult.paymentId || actualPaymentId; // ✅ NEW
        console.log(`✅ Using synced payment: intent=${actualPaymentIntentId}, id=${actualPaymentId}`);
      } catch (syncError) {
        console.error('⚠️ Auto-sync failed, proceeding with original IDs:', syncError.message);
        // Continue with original IDs if sync fails
      }
    }

    // STEP 1: Get the payment from local database
    console.log(`🔍 Fetching payment details for intent: ${actualPaymentIntentId}`);
    
    const [payments] = await pool.query(
      'SELECT id, payment_intent_id, payment_id, amount FROM payments WHERE payment_intent_id = ? AND status = ?',
      [actualPaymentIntentId, 'succeeded']
    );

    if (!payments.length) {
      throw new Error(`No successful payment found for intent: ${actualPaymentIntentId}`);
    }

    const payment = payments[0];

    // ✅ STEP 1.5: Use payment_id from database if we still don't have it
    let paymongoPaymentId = actualPaymentId || payment.payment_id;

    // STEP 2: If we still don't have payment_id, retrieve from PayMongo
    if (!paymongoPaymentId) {
      console.log('⚠️ No payment_id found, retrieving from PayMongo...');
      
      try {
        const paymentResponse = await axios.get(`${API}/payment_intents/${actualPaymentIntentId}`, {
          headers: getAuthHeaders()
        });
        
        const paymentIntent = paymentResponse.data.data;
        
        // Validate status
        if (paymentIntent.attributes?.status !== 'succeeded') {
          throw new Error(`Payment intent status is '${paymentIntent.attributes?.status}', not 'succeeded'. Cannot refund incomplete payments.`);
        }
        
        // Try multiple possible locations for payment ID
        if (paymentIntent.attributes.payments && paymentIntent.attributes.payments.length > 0) {
          paymongoPaymentId = paymentIntent.attributes.payments[0].id;
          console.log(`✓ Found PayMongo payment ID in attributes.payments[0]: ${paymongoPaymentId}`);
        } else if (paymentIntent.relationships?.payments?.data && paymentIntent.relationships.payments.data.length > 0) {
          paymongoPaymentId = paymentIntent.relationships.payments.data[0].id;
          console.log(`✓ Found PayMongo payment ID in relationships.payments.data[0]: ${paymongoPaymentId}`);
        } else if (paymentIntent.attributes?.last_payment_error?.payment?.id) {
          paymongoPaymentId = paymentIntent.attributes.last_payment_error.payment.id;
          console.log(`✓ Found PayMongo payment ID in last_payment_error: ${paymongoPaymentId}`);
        } else {
          console.error('❌ Could not find payment ID. Payment Intent structure:', {
            id: paymentIntent.id,
            type: paymentIntent.type,
            attributes: {
              status: paymentIntent.attributes?.status,
              amount: paymentIntent.attributes?.amount,
              payments: paymentIntent.attributes?.payments
            }
          });
          throw new Error('No payments found in payment intent - payment may not have completed successfully');
        }

        // ✅ Update database with the found payment_id
        await pool.query(
          'UPDATE payments SET payment_id = ?, updated_at = NOW() WHERE payment_intent_id = ?',
          [paymongoPaymentId, actualPaymentIntentId]
        );
        console.log(`✅ Updated database with payment_id: ${paymongoPaymentId}`);
        
      } catch (error) {
        console.error('Failed to retrieve payment intent:', error.response?.data || error.message);
        throw new Error('Failed to retrieve payment information from PayMongo');
      }
    }

    if (!paymongoPaymentId) {
      throw new Error('Could not extract PayMongo payment ID');
    }

    console.log(`✅ Using PayMongo payment ID: ${paymongoPaymentId}`);

    // STEP 3: Validate and sanitize reason
    const validReasons = [
      'duplicate',
      'fraudulent',
      'requested_by_customer',
      'others'
    ];

    let sanitizedReason = 'requested_by_customer';
    if (reason && validReasons.includes(reason.toLowerCase())) {
      sanitizedReason = reason.toLowerCase();
    }

    // STEP 4: Create refund payload
    const payload = {
      data: {
        attributes: {
          amount: amount,
          payment_id: paymongoPaymentId, // ✅ Now using correct payment_id
          reason: sanitizedReason,
          notes: typeof reason === 'string' && !validReasons.includes(reason.toLowerCase()) 
            ? reason.substring(0, 255)
            : 'Refund processed via StayBnB admin panel'
        }
      }
    };

    console.log(`🔄 Creating PayMongo refund:`, {
      paymentId: paymongoPaymentId,
      amount: amount,
      reason: sanitizedReason
    });

    // STEP 5: Create the refund
    const response = await axios.post(`${API}/refunds`, payload, {
      headers: getAuthHeaders()
    });

    const refund = response.data.data;

    console.log(`✅ PayMongo refund created: ${refund.id}, status: ${refund.attributes.status}`);

    return refund;

  } catch (error) {
    console.error('❌ PayMongo refund creation failed:', error.response?.data || error.message);
    
    let errorMessage = 'Failed to create refund';
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      errorMessage = errors.map(e => e.detail).join('; ');
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(`PayMongo refund failed: ${errorMessage}`);
  }
};

// ==========================================
// PROCESS REFUND INTENT
// ==========================================
exports.processRefundIntent = async (refundIntentId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1️⃣ Fetch refund intent details
    const [refundIntents] = await connection.query(
      `SELECT id, refund_id, booking_id, client_id, refund_amount, status, payment_intent_ids, payment_ids 
       FROM refund_intents WHERE id = ? FOR UPDATE`,
      [refundIntentId]
    );

    if (!refundIntents.length) {
      throw new Error('Refund intent not found');
    }

    const refundIntent = refundIntents[0];
    const paymentIntentIds = JSON.parse(refundIntent.payment_intent_ids || '[]');
    const paymentIds = JSON.parse(refundIntent.payment_ids || '[]'); // ✅ NEW

    // 2️⃣ Check for safe status before reprocessing
    if (['succeeded', 'completed'].includes(refundIntent.status)) {
      await connection.release();
      return {
        status: 'already_processed',
        message: 'Refund intent already completed successfully',
        paymongoResults: [],
        totalRefunded: refundIntent.refund_amount
      };
    }

    if (refundIntent.status === 'failed') {
      await connection.release();
      return {
        status: 'failed',
        message: 'Refund intent previously failed — please create a new one before retrying.',
        paymongoResults: [],
        totalRefunded: 0
      };
    }

    // 3️⃣ Process refund via PayMongo
    console.log(`🔁 Processing refund intent ${refundIntentId} for amount ₱${refundIntent.refund_amount}...`);

    const paymongoResults = [];
    let totalRefunded = 0;

    // ✅ UPDATED: Process using both payment_intent_ids and payment_ids
    for (let i = 0; i < paymentIntentIds.length; i++) {
      const paymentIntentId = paymentIntentIds[i];
      const paymentId = paymentIds[i] || null; // ✅ Get corresponding payment_id
      
      try {
        const refundResult = await exports.createRefund(
          paymentIntentId,
          paymentId, // ✅ Pass payment_id
          'requested_by_customer',
          Math.round(refundIntent.refund_amount * 100) // Convert to cents
        );

        paymongoResults.push(refundResult);
        totalRefunded += refundResult.attributes.amount / 100;
        console.log(`✅ PayMongo refund created for ${paymentIntentId} (${paymentId}): ₱${refundResult.attributes.amount / 100}`);
      } catch (err) {
        console.error(`⚠️ PayMongo refund failed for ${paymentIntentId}:`, err.message);
      }
    }

    const newStatus = totalRefunded > 0 ? 'succeeded' : 'failed';

    // 4️⃣ Update refund intent status
    await connection.query(
      `UPDATE refund_intents 
       SET status = ?, paymongo_refund_ids = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStatus, JSON.stringify(paymongoResults), refundIntentId]
    );

    await connection.commit();
    await connection.release();

    console.log(`✅ Refund intent ${refundIntentId} marked as ${newStatus}`);

    return {
      status: newStatus,
      message:
        newStatus === 'succeeded'
          ? 'Refund intent processed successfully and sent to PayMongo.'
          : 'Refund failed — no PayMongo transactions succeeded.',
      paymongoResults,
      totalRefunded
    };
  } catch (error) {
    await connection.rollback();
    await connection.release();
    console.error('❌ processRefundIntent error:', error.message);
    throw new Error(`Refund processing failed: ${error.message}`);
  }
};

// ==========================================
// GET REFUND STATUS FROM PAYMONGO
// ==========================================
exports.getRefundStatus = async (refundId) => {
  if (!KEY) {
    throw new Error('PayMongo not configured');
  }

  try {
    const response = await axios.get(`${API}/refunds/${refundId}`, {
      headers: getAuthHeaders()
    });

    const refund = response.data.data;

    return {
      id: refund.id,
      status: refund.attributes.status,
      amount: refund.attributes.amount / 100,
      reason: refund.attributes.reason,
      createdAt: refund.attributes.created_at,
      updatedAt: refund.attributes.updated_at
    };

  } catch (error) {
    console.error('Failed to get refund status:', error.response?.data || error.message);
    throw new Error('Unable to retrieve refund status from PayMongo');
  }
};

// ==========================================
// CALCULATE REFUND AMOUNT WITH POLICY
// ==========================================
exports.calculateRefundAmount = (totalPaid, checkInDate, cancelledAt = new Date()) => {
  const checkIn = new Date(checkInDate);
  const cancelled = new Date(cancelledAt);
  
  const hoursUntilCheckIn = (checkIn - cancelled) / (1000 * 60 * 60);
  
  let refundPercentage = 0;
  let policyApplied = '';
  
  if (hoursUntilCheckIn >= 24) {
    refundPercentage = 100;
    policyApplied = 'Full refund (cancelled 24+ hours before check-in)';
  } else if (hoursUntilCheckIn >= 0) {
    refundPercentage = 50;
    policyApplied = '50% refund (cancelled less than 24 hours before check-in)';
  } else {
    refundPercentage = 0;
    policyApplied = 'No refund (cancelled after check-in date)';
  }
  
  const refundAmount = Math.round(totalPaid * (refundPercentage / 100) * 100) / 100;
  const deductedAmount = totalPaid - refundAmount;
  
  return {
    totalPaid,
    refundPercentage,
    refundAmount,
    deductedAmount,
    hoursUntilCheckIn: Math.floor(hoursUntilCheckIn),
    policyApplied
  };
};

// ==========================================
// HELPER: Check if service is configured
// ==========================================
exports.isConfigured = () => {
  return !!KEY;
};