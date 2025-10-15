// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// =========================================================
// PUBLIC ROUTES (No Authentication Required)
// =========================================================

/**
 * PayMongo Webhook Endpoint
 * Called by PayMongo servers when payment events occur
 * IMPORTANT: Raw body handling is done in server.js
 * Events handled: checkout_session.payment.paid, payment.paid, payment.failed
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * Test configuration endpoint
 * Check if PayMongo keys are properly configured
 * Useful for debugging and initial setup
 */
router.get('/test-config', paymentController.testConfig);

/**
 * Health check endpoint
 * Verify that payment routes are working
 */
router.get('/test', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Payment routes are operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      // Public endpoints
      webhook: 'POST /api/payments/webhook (PayMongo only)',
      testConfig: 'GET /api/payments/test-config',
      test: 'GET /api/payments/test',
      
      // Authenticated endpoints
      createPaymentIntent: 'POST /api/payments/create-payment-intent (auth)',
      createIntent: 'POST /api/payments/create-intent (auth)',
      getPaymentStatus: 'GET /api/payments/booking/:bookingId (auth)',
      getPaymentStatusAlt: 'GET /api/payments/status/:bookingId (auth)',
      myPayments: 'GET /api/payments/my-payments (auth)',
      verifyStatus: 'POST /api/payments/verify-status (auth)'
    }
  });
});

// =========================================================
// AUTHENTICATED ROUTES (Require Valid Token)
// =========================================================

/**
 * Create Payment Intent
 * Primary endpoint - creates a PayMongo payment intent for a booking
 * POST /api/payments/create-payment-intent
 * Body: { bookingId: number }
 * Returns: { paymentIntent, checkout_url, booking details }
 */
router.post('/create-payment-intent', authenticateToken, paymentController.createPaymentIntent);

/**
 * Create Payment Intent (Alternative)
 * Alternative endpoint for backward compatibility
 * POST /api/payments/create-intent
 * Body: { bookingId: number }
 */
router.post('/create-intent', authenticateToken, paymentController.createPaymentIntent);

/**
 * Get Payment Status by Booking ID
 * Retrieve payment information for a specific booking
 * GET /api/payments/booking/:bookingId
 * Returns: Payment details (status, amount, payment_intent_id, etc.)
 */
router.get('/booking/:bookingId', authenticateToken, paymentController.getPaymentStatus);

/**
 * Get Payment Status (Alternative)
 * Alternative endpoint for getting payment status
 * GET /api/payments/status/:bookingId
 */
router.get('/status/:bookingId', authenticateToken, paymentController.getPaymentStatus);

/**
 * Get User's Payment History
 * Retrieve all payments for the authenticated user
 * Returns different data based on user role (client or host)
 * GET /api/payments/my-payments
 * Returns: List of payments with booking and listing details
 */
router.get('/my-payments', authenticateToken, paymentController.getMyPayments);

/**
 * Verify Payment Status with PayMongo
 * Manually verify and sync payment status with PayMongo API
 * Useful when webhook fails or for manual reconciliation
 * POST /api/payments/verify-status
 * Body: { bookingId: number }
 * Returns: { paymongoStatus, databaseStatus, synced, paid }
 */
router.post('/verify-status', authenticateToken, paymentController.verifyStatus);

// =========================================================
// EXPORT ROUTER
// =========================================================

module.exports = router;