// backend/controllers/paymentController.js - FIXED with proper raw body handling
const pool = require('../db');
const axios = require('axios');
const paymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const { createNotification } = require('./notificationsController');

// Create payment intent for booking
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  console.log('🔥 createPaymentIntent called!');
  console.log('Request body:', req.body);
  console.log('User:', req.user);

  const { bookingId } = req.body;
  const clientId = req.user.id;

  if (!bookingId) {
    return next(new AppError('Booking ID is required', 400));
  }

  // Get booking details with regular SQL query
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

  // Check for existing successful payments
  const [existingSuccessful] = await pool.query(
    'SELECT id FROM payments WHERE booking_id = ? AND status = "succeeded"', 
    [bookingId]
  );
  
  if (existingSuccessful.length > 0) {
    return next(new AppError('This booking has already been paid', 400));
  }

  try {
    // Clean up any existing failed/pending payments to avoid duplicates
    console.log('Cleaning up existing failed/pending payments...');
    await pool.query(
      'DELETE FROM payments WHERE booking_id = ? AND status IN ("failed", "pending")',
      [bookingId]
    );

    // Let paymentService handle BOTH PayMongo creation AND database insert
    console.log('Creating payment intent via paymentService...');
    const { paymentIntent, paymentId } = await paymentService.createPaymentIntent({
      bookingId,
      clientId,
      hostId: booking.host_id,
      amount: booking.total_price,
      currency: 'PHP'
    });

    console.log('Payment intent created successfully:', paymentIntent.id);

    // Return the response with checkout URL for GCash/Card payment
    res.status(200).json({
      status: 'success',
      data: {
        paymentId,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          checkout_url: paymentIntent.checkout_url // Important: Include checkout URL
        },
        booking: {
          id: booking.id,
          title: booking.title,
          totalPrice: booking.total_price,
          dates: `${booking.start_date} to ${booking.end_date}`
        }
      }
    });

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
  console.log('🔧 Development mode: Setting up auto-confirm for payment...');
  
  // Wait 15 seconds then auto-update payment status
  setTimeout(async () => {
    try {
      console.log('⏰ Development auto-confirm: Checking payment status...');
      
      // Check if payment is still pending
      const [pendingPayments] = await pool.query(
        'SELECT status FROM payments WHERE booking_id = ? AND payment_intent_id = ?',
        [bookingId, paymentIntent.id]
      );
      
      if (pendingPayments.length > 0 && pendingPayments[0].status === 'pending') {
        console.log('🔄 Auto-confirming payment for development...');
        
        // Update payment to succeeded
        await pool.query(
          'UPDATE payments SET status = "succeeded", updated_at = NOW() WHERE booking_id = ? AND status = "pending"',
          [bookingId]
        );
        
        // Update booking to confirmed
        await pool.query(
          'UPDATE bookings SET status = "confirmed" WHERE id = ?',
          [bookingId]
        );
        
        console.log('✅ Development auto-confirm: Payment marked as succeeded');
        
        // Try to create notifications (optional)
        try {
          await createNotification({
            userId: clientId,
            message: `Payment successful! Your booking #${bookingId} is confirmed.`,
            type: 'payment_success'
          });
          
          await createNotification({
            userId: booking.host_id,
            message: `Payment received for booking #${bookingId}.`,
            type: 'payment_received'
          });
        } catch (notifErr) {
          console.log('Notification creation failed (non-critical):', notifErr.message);
        }
      } else {
        console.log('Payment already processed, skipping auto-confirm');
      }
    } catch (error) {
      console.error('Development auto-confirm error:', error);
      // Don't throw - this is non-critical development helper
    }
  }, 90000); // 90 seconds delay
}
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return next(new AppError('Payment processing failed: ' + error.message, 500));
  }
});

// FIXED: Handle PayMongo webhooks with proper raw body handling
exports.handleWebhook = catchAsync(async (req, res, next) => {
  console.log('🔔 Webhook received');
  
  const signature = req.headers['paymongo-signature'];
  
  // CRITICAL: Use raw body for signature verification
  // This should be the raw string body, not parsed JSON
  const rawBody = req.rawBody || JSON.stringify(req.body);
  
  console.log('Webhook headers:', {
    'paymongo-signature': signature ? 'Present' : 'Missing',
    'content-type': req.headers['content-type']
  });

  // Verify webhook signature
  const isValid = await paymentService.verifyWebhookSignature(rawBody, signature);
  
  if (!isValid) {
    console.error('❌ Invalid webhook signature');
    return next(new AppError('Invalid webhook signature', 400));
  }

  console.log('✅ Webhook signature verified');

  // Parse the body if it's still a string
  const bodyData = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
  const { data } = bodyData;
  const eventType = bodyData.type || data?.attributes?.type;

  console.log('📨 PayMongo webhook event:', eventType);

  try {
    // Handle different event types
    switch(eventType) {
      case 'payment_intent.succeeded':
      case 'payment.paid':
        const paymentIntentId = data.id || data.attributes?.payment_intent_id;
        
        console.log('💰 Processing successful payment:', paymentIntentId);

        // Update payment status
        await pool.query(
          'UPDATE payments SET status = ? WHERE payment_intent_id = ?',
          ['succeeded', paymentIntentId]
        );

        // Process booking status update
        await paymentService.processSuccessfulPayment(paymentIntentId);

        // Get payment details for notifications
        const [payments] = await pool.query(`
          SELECT p.*, b.*, l.title 
          FROM payments p 
          JOIN bookings b ON p.booking_id = b.id 
          JOIN listings l ON b.listing_id = l.id 
          WHERE p.payment_intent_id = ?
        `, [paymentIntentId]);

        if (payments.length > 0) {
          const payment = payments[0];

          // Notify client
          await createNotification({
            userId: payment.client_id,
            message: `Payment successful! Your booking for "${payment.title}" is confirmed.`,
            type: 'payment_success'
          });

          // Notify host
          await createNotification({
            userId: payment.host_id,
            message: `Payment received for "${payment.title}" booking.`,
            type: 'payment_received'
          });

          console.log('✅ Notifications sent');
        }
        break;

      case 'payment_intent.payment_failed':
      case 'payment.failed':
        const failedPaymentIntentId = data.id || data.attributes?.payment_intent_id;
        
        console.log('❌ Payment failed:', failedPaymentIntentId);
        
        await pool.query(
          'UPDATE payments SET status = ? WHERE payment_intent_id = ?',
          ['failed', failedPaymentIntentId]
        );
        break;

      case 'checkout_session.payment.paid':
        // Handle checkout session payment success
        const checkoutData = data.attributes;
        const metadata = checkoutData.metadata || {};
        
        if (metadata.payment_intent_id) {
          console.log('💳 Checkout session payment successful');
          
          await pool.query(
            'UPDATE payments SET status = ? WHERE payment_intent_id = ?',
            ['succeeded', metadata.payment_intent_id]
          );
          
          await paymentService.processSuccessfulPayment(metadata.payment_intent_id);
        }
        break;

      default:
        console.log('⚠️ Unhandled webhook event type:', eventType);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to prevent PayMongo from retrying
    res.status(200).json({ received: true, error: error.message });
  }
});

// Get payment status
exports.getPaymentStatus = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user.id;

  const [payments] = await pool.query(`
    SELECT p.* 
    FROM payments p 
    JOIN bookings b ON p.booking_id = b.id 
    WHERE b.id = ? AND (b.client_id = ? OR p.host_id = ?)
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

// List user's payments
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
      payments: payments
    }
  });
});

exports.verifyStatus = catchAsync(async (req, res, next) => {
  const { bookingId } = req.body;
  
  console.log('🔍 Verifying payment status for booking:', bookingId);
  
  try {
    // Get payment intent ID from database
    const [payments] = await pool.query(
      'SELECT payment_intent_id, status FROM payments WHERE booking_id = ?',
      [bookingId]
    );
    
    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    const paymentIntentId = payments[0].payment_intent_id;
    console.log('📝 Found payment intent:', paymentIntentId);
    
    // Check status directly with PayMongo API
    const axios = require('axios'); // Import axios here if not at top
    const response = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
        }
      }
    );
    
    const paymongoStatus = response.data.data.attributes.status;
    console.log('✅ PayMongo status:', paymongoStatus);
    
    // Update database if payment succeeded
    if (paymongoStatus === 'succeeded' && payments[0].status !== 'succeeded') {
      console.log('💾 Updating payment status to succeeded...');
      
      await pool.query(
        'UPDATE payments SET status = ? WHERE booking_id = ?',
        ['succeeded', bookingId]
      );
      
      await pool.query(
        'UPDATE bookings SET status = ? WHERE id = ?',
        ['confirmed', bookingId]
      );
      
      console.log('✅ Database updated successfully');
    }
    
    res.json({ status: paymongoStatus });
  } catch (error) {
    console.error('Error verifying payment:', error.message);
    if (error.response) {
      console.error('PayMongo API error:', error.response.data);
    }
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

exports.testConfig = (req, res) => {
  res.json({
    paymongo_configured: !!process.env.PAYMONGO_SECRET_KEY,
    webhook_secret_configured: !!process.env.PAYMONGO_WEBHOOK_SECRET,
    secret_key_prefix: process.env.PAYMONGO_SECRET_KEY ? process.env.PAYMONGO_SECRET_KEY.substring(0, 15) + '...' : 'Not set',
    webhook_secret_prefix: process.env.PAYMONGO_WEBHOOK_SECRET ? process.env.PAYMONGO_WEBHOOK_SECRET.substring(0, 15) + '...' : 'Not set'
  });
};