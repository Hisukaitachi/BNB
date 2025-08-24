// backend/routes/paymentRoutes.js - CREATE THIS FILE
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Create payment intent (requires authentication)
router.post('/create-intent', authenticateToken, paymentController.createPaymentIntent);

// PayMongo webhook (no authentication - external call)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Get payment status
router.get('/booking/:bookingId', authenticateToken, paymentController.getPaymentStatus);

// Get user's payment history
router.get('/my-payments', authenticateToken, paymentController.getMyPayments);

router.get('/test-config', paymentController.testConfig);
module.exports = router;