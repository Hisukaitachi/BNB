// backend/controllers/paymentController.js - CREATE THIS FILE
const pool = require('../db');
const paymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const { createNotification } = require('./notificationsController');

// Create payment intent for booking
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const { bookingId } = req.body;
  const clientId = req.user.id;

  if (!bookingId) {
    return next(new AppError('Booking ID is required', 400));
  }

  // Get booking details
  const [bookings] = await pool.query(`
    SELECT b.*, l.host_id, l.title, l.price_per_night
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    WHERE b.id = ? AND b.client_id = ?
  `, [bookingId, clientId]);

  if (!bookings.length) {
    return next(new AppError('Booking not found or unauthorized', 404));
  }

  const booking = bookings[0];

  // Check if booking can be paid
  if (booking.status !== 'approved') {
    return next(new AppError('Only approved bookings can be paid', 400));
  }

  // Check if payment already exists
  const [existingPayments] = await pool.query(
    'SELECT id FROM payments WHERE booking_id = ? AND status IN ("pending", "succeeded")',
    [bookingId]
  );

  if (existingPayments.length > 0) {
    return next(new AppError('Payment already exists for this booking', 400));
  }

  try {
    // Create payment intent via PayMongo
    const { paymentIntent, paymentId } = await paymentService.createPaymentIntent({
      bookingId,
      clientId,
      hostId: booking.host_id,
      amount: booking.total_price,
      currency: 'PHP'
    });

    res.status(200).json({
      status: 'success',
      data: {
        paymentId,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount
        },
        booking: {
          id: booking.id,
          title: booking.title,
          totalPrice: booking.total_price,
          dates: `${booking.start_date} to ${booking.end_date}`
        }
      }
    });

  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return next(new AppError('Payment processing failed: ' + error.message, 500));
  }
});

// Handle PayMongo webhooks
exports.handleWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers['paymongo-signature'];
  const rawBody = req.body;

  // Verify webhook signature
  const isValid = await paymentService.verifyWebhookSignature(JSON.stringify(rawBody), signature);
  if (!isValid) {
    return next(new AppError('Invalid webhook signature', 400));
  }

  const { data } = rawBody;
  const eventType = rawBody.type;

  console.log('PayMongo webhook received:', eventType);

  try {
    if (eventType === 'payment_intent.succeeded') {
      const paymentIntentId = data.id;
      
      // Update payment and booking status
      await paymentService.processSuccessfulPayment(paymentIntentId);

      // Get booking details for notification
      const [payments] = await pool.query(`
        SELECT p.booking_id, p.client_id, p.host_id, l.title
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
      }
    }

    if (eventType === 'payment_intent.payment_failed') {
      const paymentIntentId = data.id;
      
      // Update payment status
      await pool.query(
        'UPDATE payments SET status = "failed" WHERE payment_intent_id = ?',
        [paymentIntentId]
      );

      console.log('Payment failed for intent:', paymentIntentId);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return next(new AppError('Webhook processing failed', 500));
  }
});

// Get payment status
exports.getPaymentStatus = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user.id;

  const [payments] = await pool.query(`
    SELECT p.*, b.client_id, b.status as booking_status
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE p.booking_id = ? AND b.client_id = ?
  `, [bookingId, userId]);

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

  let query = `
    SELECT 
      p.*,
      b.start_date,
      b.end_date,
      l.title as listing_title,
      l.location,
      u.name as other_party_name
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
  `;

  let queryParams = [userId];

  if (userRole === 'client') {
    query += ` JOIN users u ON l.host_id = u.id WHERE p.client_id = ?`;
  } else if (userRole === 'host') {
    query += ` JOIN users u ON b.client_id = u.id WHERE p.host_id = ?`;
  } else {
    return next(new AppError('Invalid user role', 400));
  }

  query += ` ORDER BY p.created_at DESC`;

  const [payments] = await pool.query(query, queryParams);

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

exports.testConfig = (req, res) => {
  res.json({
    paymongo_configured: !!process.env.PAYMONGO_SECRET_KEY,
    secret_key_prefix: process.env.PAYMONGO_SECRET_KEY ? process.env.PAYMONGO_SECRET_KEY.substring(0, 15) + '...' : 'Not set'
  });
};