// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Create payment intent (requires authentication)
// Note: Your frontend is calling '/create-payment-intent' so let's match that
router.post('/create-payment-intent', authenticateToken, paymentController.createPaymentIntent);

// Alternative route for backward compatibility
router.post('/create-intent', authenticateToken, paymentController.createPaymentIntent);

// PayMongo webhook (no authentication - external call)
// Note: Don't add express.raw() here - it's already handled in server.js
router.post('/webhook', paymentController.handleWebhook);

// Get payment status for a specific booking
router.get('/booking/:bookingId', authenticateToken, paymentController.getPaymentStatus);

// Alternative route
router.get('/status/:bookingId', authenticateToken, paymentController.getPaymentStatus);

// Get user's payment history
router.get('/my-payments', authenticateToken, paymentController.getMyPayments);

// Verify payment status directly with PayMongo
router.post('/verify-status', authenticateToken, paymentController.verifyStatus);

// Test configuration endpoint
router.get('/test-config', paymentController.testConfig);

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Payment routes are working!',
    endpoints: {
      createPayment: 'POST /api/payments/create-payment-intent',
      webhook: 'POST /api/payments/webhook',
      getStatus: 'GET /api/payments/booking/:bookingId',
      myPayments: 'GET /api/payments/my-payments',
      testConfig: 'GET /api/payments/test-config'
    }
  });
});

module.exports = router;