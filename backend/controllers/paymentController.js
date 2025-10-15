// backend/controllers/paymentController.js - FIXED & OPTIMIZED
const pool = require('../db');
const paymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

// Optional: Only use if notifications are properly set up
let createNotification;
try {
  createNotification = require('./notificationsController').createNotification;
} catch (error) {
  console.log('⚠️ Notifications controller not available');
  createNotification = null;
}

// ==========================================
// CREATE PAYMENT INTENT
// ==========================================
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  console.log('🔥 createPaymentIntent called!');
  console.log('Request body:', req.body);

  const { bookingId } = req.body;
  const clientId = req.user.id;

  if (!bookingId) {
    return next(new AppError('Booking ID is required', 400));
  }

  // Get booking details
  const [bookings] = await pool.query(`
    SELECT b.*, l.title, l.host_id 
    FROM bookings b 
    JOIN listings l ON b.listing_id = l.id 
    WHERE b.id = ? AND b.client_id = ?
  `, [bookingId, clientId]);

  if (!bookings.length) {
    return next(new AppError('Booking not found or unauthorized', 404));
  }

  const booking = bookings[0];

  if (booking.status !== 'approved') {
    return next(new AppError('Only approved bookings can be paid', 400));
  }

  // Check for existing successful payments (IDEMPOTENCY)
  const [existingSuccessful] = await pool.query(
    'SELECT id, payment_intent_id FROM payments WHERE booking_id = ? AND status = "succeeded"', 
    [bookingId]
  );
  
  if (existingSuccessful.length > 0) {
    return next(new AppError('This booking has already been paid', 400));
  }

  // Calculate amount based on booking type
  let amountToCharge = booking.total_price;
  let isDepositPayment = false;
  
  if (booking.booking_type === 'reserve') {
    amountToCharge = booking.deposit_amount || Math.round(booking.total_price * 0.5);
    isDepositPayment = true;
    console.log(`📦 Reserve booking - charging deposit: ₱${amountToCharge}`);
  } else {
    console.log(`💳 Full booking - charging total: ₱${amountToCharge}`);
  }

  try {
    // Check for existing pending payment intent
    const [existingPending] = await pool.query(
      'SELECT payment_intent_id, id FROM payments WHERE booking_id = ? AND status = "pending" ORDER BY created_at DESC LIMIT 1',
      [bookingId]
    );

    let paymentIntent, paymentId;

    if (existingPending.length > 0) {
      // Verify if the existing payment intent is still valid
      console.log('📋 Found existing pending payment, verifying...');
      
      try {
        const verification = await paymentService.verifyPayment(existingPending[0].payment_intent_id);
        
        if (verification.status === 'awaiting_payment_method' || verification.status === 'awaiting_next_action') {
          // Reuse existing payment intent
          console.log('♻️ Reusing existing valid payment intent');
          paymentIntent = {
            id: verification.id,
            status: verification.status,
            amount: verification.amount * 100,
            checkout_url: verification.checkout_url
          };
          paymentId = existingPending[0].id;
        } else {
          throw new Error('Existing payment intent is no longer valid');
        }
      } catch (verifyError) {
        console.log('⚠️ Existing payment intent invalid, creating new one');
        // Delete the invalid payment record
        await pool.query('DELETE FROM payments WHERE id = ?', [existingPending[0].id]);
      }
    }

    // Create new payment intent if no valid existing one
    if (!paymentIntent) {
      console.log('🆕 Creating new payment intent...');
      const result = await paymentService.createPaymentIntent({
        bookingId,
        clientId,
        hostId: booking.host_id,
        amount: amountToCharge,
        currency: 'PHP',
        bookingType: booking.booking_type,
        listingTitle: booking.title
      });

      paymentIntent = result.paymentIntent;
      paymentId = result.paymentId;
    }

    console.log('✅ Payment intent ready:', paymentIntent.id);

    // Return response
    res.status(200).json({
      status: 'success',
      data: {
        paymentId,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          checkout_url: paymentIntent.checkout_url,
          status: paymentIntent.status
        },
        booking: {
          id: booking.id,
          title: booking.title,
          totalPrice: booking.total_price,
          bookingType: booking.booking_type,
          amountCharged: amountToCharge,
          isDepositPayment,
          dates: `${booking.start_date} to ${booking.end_date}`
        }
      }
    });

  } catch (error) {
    console.error('❌ Payment intent creation failed:', error);
    return next(new AppError('Payment processing failed: ' + error.message, 500));
  }
});

// ==========================================
// WEBHOOK HANDLER
// ==========================================
exports.handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['paymongo-signature'];
  const rawBody = req.rawBody;

  console.log('🔔 ========================================');
  console.log('🔔 WEBHOOK RECEIVED');
  console.log('🔔 ========================================');
  
  // Verify signature using service
  const isValid = await paymentService.verifyWebhookSignature(rawBody, signature);
  
  if (!isValid) {
    console.log('❌ Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log('✅ Webhook signature verified');

  const event = req.body;
  const eventType = event.data?.attributes?.type;

  console.log('📨 Event Type:', eventType);

  // Handle checkout_session.payment.paid event
  if (eventType === 'checkout_session.payment.paid') {
    await handleCheckoutSessionPaid(event);
  }

  // Handle payment.paid event (fallback)
  if (eventType === 'payment.paid') {
    await handlePaymentPaid(event);
  }

  // Handle payment.failed event
  if (eventType === 'payment.failed') {
    await handlePaymentFailed(event);
  }

  res.status(200).json({ received: true });
});

// ==========================================
// WEBHOOK EVENT HANDLERS
// ==========================================
async function handleCheckoutSessionPaid(event) {
  console.log('💳 ===== CHECKOUT SESSION PAYMENT PAID =====');
  
  const checkoutSession = event.data.attributes.data;
  
  // Extract metadata from all possible locations
  let metadata = checkoutSession.attributes?.metadata || {};
  
  if (checkoutSession.attributes?.payment_intent?.attributes?.metadata) {
    metadata = {
      ...metadata,
      ...checkoutSession.attributes.payment_intent.attributes.metadata
    };
  }
  
  if (checkoutSession.attributes?.payments?.[0]?.attributes?.metadata) {
    metadata = {
      ...metadata,
      ...checkoutSession.attributes.payments[0].attributes.metadata
    };
  }
  
  console.log('📊 Metadata:', metadata);
  
  const bookingId = metadata.booking_id;
  const paymentIntentId = metadata.payment_intent_id;
  
  if (!bookingId || !paymentIntentId) {
    console.log('❌ Missing booking_id or payment_intent_id in metadata');
    return;
  }
  
  console.log('✅ Processing payment for booking:', bookingId);
  
  // Get payment details
  const payment = checkoutSession.attributes?.payments?.[0];
  const paymentId = payment?.id; // ✅ This is the pay_xxx ID from PayMongo
  const amount = payment?.attributes?.amount / 100 || 0;
  const paymentStatus = payment?.attributes?.status;
  const paidAt = payment?.attributes?.paid_at;
  const paymentMethod = payment?.attributes?.source?.type || 'unknown';
  
  console.log('💰 Payment details:', {
    bookingId,
    paymentIntentId,
    paymentId, // ✅ Added this
    amount,
    status: paymentStatus
  });

  try {
    // Use database transaction for atomicity
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if payment already processed (IDEMPOTENCY)
      const [existingPayments] = await connection.query(
        'SELECT id, status FROM payments WHERE payment_intent_id = ? FOR UPDATE',
        [paymentIntentId]
      );

      if (existingPayments.length > 0 && existingPayments[0].status === 'succeeded') {
        console.log('⚠️ Payment already processed, skipping...');
        await connection.rollback();
        return;
      }

      // Get booking details
      const [bookings] = await connection.query(
        'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
        [bookingId]
      );

      if (!bookings.length) {
        console.log('❌ Booking not found:', bookingId);
        await connection.rollback();
        return;
      }

      const booking = bookings[0];
      console.log('📋 Booking found:', {
        id: booking.id,
        status: booking.status,
        booking_type: booking.booking_type
      });

      // Calculate platform fee (10%) and host earnings (90%)
      const platformFee = Math.round(amount * 0.10 * 100) / 100;
      const hostEarnings = Math.round(amount * 0.90 * 100) / 100;

      // Update existing payment or create new one
      if (existingPayments.length > 0) {
        // ✅ UPDATED: Now storing both payment_id and payment_intent_id
        await connection.query(`
          UPDATE payments 
          SET status = 'succeeded',
              payment_id = ?,
              payment_method = ?,
              paid_at = FROM_UNIXTIME(?),
              updated_at = NOW()
          WHERE payment_intent_id = ?
        `, [paymentId, paymentMethod, paidAt, paymentIntentId]);
        
        console.log('✅ Payment record updated with payment_id:', paymentId);
      } else {
        // ✅ UPDATED: Now storing both payment_id and payment_intent_id
        await connection.query(`
          INSERT INTO payments (
            booking_id, client_id, host_id, amount, currency,
            payment_intent_id, payment_id, payment_method, status,
            platform_fee, host_earnings, paid_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), NOW())
        `, [
          bookingId,
          booking.client_id,
          booking.host_id,
          amount,
          'PHP',
          paymentIntentId,
          paymentId, // ✅ Added this
          paymentMethod,
          'succeeded',
          platformFee,
          hostEarnings,
          paidAt
        ]);
        
        console.log('✅ Payment record created with payment_id:', paymentId);
      }

      // Update booking based on type
      if (booking.booking_type === 'reserve') {
        await connection.query(`
          UPDATE bookings 
          SET deposit_paid = 1, 
              status = 'confirmed',
              payment_status = 'succeeded',
              updated_at = NOW()
          WHERE id = ?
        `, [bookingId]);
        
        console.log('✅ Reserve booking updated - deposit paid');
      } else {
        await connection.query(`
          UPDATE bookings 
          SET status = 'confirmed',
              payment_status = 'succeeded',
              updated_at = NOW()
          WHERE id = ?
        `, [bookingId]);
        
        console.log('✅ Full booking confirmed');
      }

      // Add to booking history (with nullable user_id and role)
      await connection.query(`
        INSERT INTO booking_history (booking_id, old_status, new_status, changed_by, note)
        VALUES (?, ?, 'confirmed', ?, 'Payment completed via PayMongo')
      `, [bookingId, booking.status, booking.client_id]);

      await connection.commit();
      console.log('✅ Transaction committed successfully');

      // Send notification (outside transaction)
      if (createNotification) {
        try {
          const notificationMessage = booking.booking_type === 'reserve'
            ? `Deposit payment of ₱${amount.toLocaleString()} received for booking #${bookingId}`
            : `Payment of ₱${amount.toLocaleString()} received for booking #${bookingId}`;

          await createNotification({
            userId: booking.host_id,
            type: 'payment_received',
            title: booking.booking_type === 'reserve' ? 'Deposit Received' : 'Payment Received',
            message: notificationMessage,
            relatedId: bookingId,
            relatedType: 'booking'
          });
        } catch (err) {
          console.log('⚠️ Failed to send notification:', err.message);
        }
      }

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
  }
}

async function handlePaymentPaid(event) {
  console.log('💳 ===== PAYMENT PAID EVENT =====');
  
  const payment = event.data.attributes.data;
  const metadata = payment?.attributes?.metadata || {};
  const paymentIntentId = payment?.id;
  
  console.log('Payment metadata:', metadata);
  
  const bookingId = metadata.booking_id;
  
  if (!bookingId) {
    console.log('❌ No booking ID in payment metadata');
    return;
  }
  
  // Update payment status in database
  try {
    await pool.query(
      'UPDATE payments SET status = "succeeded", updated_at = NOW() WHERE payment_intent_id = ?',
      [paymentIntentId]
    );
    console.log('✅ Payment status updated');
  } catch (error) {
    console.error('❌ Failed to update payment:', error);
  }
}

async function handlePaymentFailed(event) {
  console.log('❌ ===== PAYMENT FAILED EVENT =====');
  
  const payment = event.data.attributes.data;
  const paymentIntentId = payment?.id;
  const metadata = payment?.attributes?.metadata || {};
  
  const bookingId = metadata.booking_id;
  
  if (!paymentIntentId) {
    console.log('❌ No payment intent ID');
    return;
  }
  
  try {
    // Update payment status
    await pool.query(
      'UPDATE payments SET status = "failed", updated_at = NOW() WHERE payment_intent_id = ?',
      [paymentIntentId]
    );
    
    // Update booking status
    if (bookingId) {
      await pool.query(
        'UPDATE bookings SET payment_status = "failed", updated_at = NOW() WHERE id = ?',
        [bookingId]
      );
    }
    
    console.log('✅ Payment failure recorded');
  } catch (error) {
    console.error('❌ Failed to update payment failure:', error);
  }
}

// ==========================================
// GET PAYMENT STATUS
// ==========================================
exports.getPaymentStatus = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user.id;

  const [payments] = await pool.query(`
    SELECT p.* 
    FROM payments p 
    JOIN bookings b ON p.booking_id = b.id 
    WHERE b.id = ? AND (b.client_id = ? OR p.host_id = ?)
    ORDER BY p.created_at DESC
    LIMIT 1
  `, [bookingId, userId, userId]);

  if (!payments.length) {
    return next(new AppError('Payment not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      payment: payments[0]
    }
  });
});

// ==========================================
// LIST USER PAYMENTS
// ==========================================
exports.getMyPayments = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let query;
  if (userRole === 'client') {
    query = `
      SELECT p.*, b.*, l.title 
      FROM payments p 
      JOIN bookings b ON p.booking_id = b.id 
      JOIN listings l ON b.listing_id = l.id 
      WHERE p.client_id = ? 
      ORDER BY p.created_at DESC
    `;
  } else if (userRole === 'host') {
    query = `
      SELECT p.*, b.*, l.title 
      FROM payments p 
      JOIN bookings b ON p.booking_id = b.id 
      JOIN listings l ON b.listing_id = l.id 
      WHERE p.host_id = ? 
      ORDER BY p.created_at DESC
    `;
  } else {
    return next(new AppError('Invalid user role', 400));
  }

  const [payments] = await pool.query(query, [userId]);

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

// ==========================================
// VERIFY PAYMENT STATUS (Manual)
// ==========================================
exports.verifyStatus = catchAsync(async (req, res, next) => {
  const { bookingId } = req.body;
  
  console.log('🔍 Verifying payment status for booking:', bookingId);
  
  try {
    // Get payment from database
    const [payments] = await pool.query(
      'SELECT payment_intent_id, status FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1',
      [bookingId]
    );
    
    if (payments.length === 0) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Payment not found' 
      });
    }
    
    const paymentIntentId = payments[0].payment_intent_id;
    const dbStatus = payments[0].status;
    
    console.log('📝 Database status:', dbStatus);
    console.log('📝 Payment intent ID:', paymentIntentId);
    
    // Verify with PayMongo
    const verification = await paymentService.verifyPayment(paymentIntentId);
    const paymongoStatus = verification.status;
    
    console.log('✅ PayMongo status:', paymongoStatus);
    
    // Sync if there's a mismatch
    if (paymongoStatus === 'succeeded' && dbStatus !== 'succeeded') {
      console.log('🔄 Syncing payment status...');
      
      await pool.query(
        'UPDATE payments SET status = "succeeded", updated_at = NOW() WHERE booking_id = ?',
        [bookingId]
      );
      
      await pool.query(
        'UPDATE bookings SET status = "confirmed", payment_status = "succeeded", updated_at = NOW() WHERE id = ?',
        [bookingId]
      );
      
      console.log('✅ Database synced with PayMongo');
    }
    
    res.json({ 
      status: 'success',
      data: {
        paymentIntentId,
        paymongoStatus,
        databaseStatus: dbStatus,
        synced: paymongoStatus === dbStatus,
        paid: paymongoStatus === 'succeeded'
      }
    });
    
  } catch (error) {
    console.error('❌ Error verifying payment:', error.message);
    return next(new AppError('Failed to verify payment: ' + error.message, 500));
  }
});

// ==========================================
// TEST CONFIG
// ==========================================
exports.testConfig = (req, res) => {
  const isConfigured = paymentService.isConfigured();
  
  res.json({
    paymongo_configured: isConfigured,
    secret_key_set: !!process.env.PAYMONGO_SECRET_KEY,
    webhook_secret_set: !!process.env.PAYMONGO_WEBHOOK_SECRET,
    secret_key_prefix: process.env.PAYMONGO_SECRET_KEY 
      ? process.env.PAYMONGO_SECRET_KEY.substring(0, 15) + '...' 
      : 'Not set',
    webhook_secret_prefix: process.env.PAYMONGO_WEBHOOK_SECRET 
      ? process.env.PAYMONGO_WEBHOOK_SECRET.substring(0, 15) + '...' 
      : 'Not set',
    node_env: process.env.NODE_ENV || 'development'
  });
};