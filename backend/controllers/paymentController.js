// backend/controllers/paymentController.js
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

  // Use SP to get booking details & validate
  const [bookings] = await pool.query("CALL sp_get_booking_for_payment(?, ?)", [bookingId, clientId]);

  if (!bookings[0].length) {
    return next(new AppError('Booking not found or unauthorized', 404));
  }

  const booking = bookings[0][0];

  if (booking.status !== 'approved') {
    return next(new AppError('Only approved bookings can be paid', 400));
  }

  // Check existing payments via SP
  const [existingPayments] = await pool.query("CALL sp_check_existing_payment(?)", [bookingId]);
  if (existingPayments[0].length > 0) {
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

    // Insert payment record via SP
    await pool.query("CALL sp_create_payment(?, ?, ?, ?, ?, ?)", [
      bookingId,
      clientId,
      booking.host_id,
      paymentIntent.id,
      booking.total_price,
      'pending'
    ]);

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

      // Update payment status via SP
      await pool.query("CALL sp_update_payment_status(?, ?)", [paymentIntentId, 'succeeded']);

      // Process booking status update
      await paymentService.processSuccessfulPayment(paymentIntentId);

      // Fetch details for notifications
      const [payments] = await pool.query("CALL sp_get_payment_details(?)", [paymentIntentId]);

      if (payments[0].length > 0) {
        const payment = payments[0][0];

        await createNotification({
          userId: payment.client_id,
          message: `Payment successful! Your booking for "${payment.title}" is confirmed.`,
          type: 'payment_success'
        });

        await createNotification({
          userId: payment.host_id,
          message: `Payment received for "${payment.title}" booking.`,
          type: 'payment_received'
        });
      }
    }

    if (eventType === 'payment_intent.payment_failed') {
      const paymentIntentId = data.id;
      await pool.query("CALL sp_update_payment_status(?, ?)", [paymentIntentId, 'failed']);
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

  const [payments] = await pool.query("CALL sp_get_payment_status(?, ?)", [bookingId, userId]);

  if (!payments[0].length) {
    return next(new AppError('Payment not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      payment: payments[0][0]
    }
  });
});

// List user's payments
exports.getMyPayments = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let spName;
  if (userRole === 'client') {
    spName = "sp_get_client_payments";
  } else if (userRole === 'host') {
    spName = "sp_get_host_payments";
  } else {
    return next(new AppError('Invalid user role', 400));
  }

  const [payments] = await pool.query(`CALL ${spName}(?)`, [userId]);

  res.status(200).json({
    status: 'success',
    results: payments[0].length,
    data: {
      payments: payments[0]
    }
  });
});

exports.testConfig = (req, res) => {
  res.json({
    paymongo_configured: !!process.env.PAYMONGO_SECRET_KEY,
    secret_key_prefix: process.env.PAYMONGO_SECRET_KEY ? process.env.PAYMONGO_SECRET_KEY.substring(0, 15) + '...' : 'Not set'
  });
};
