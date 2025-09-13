const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { authenticateToken } = require('../middleware/auth');

// Admin actions (need auth too!)
router.post('/release', authenticateToken, payoutController.releasePayout);
router.get('/all', authenticateToken, payoutController.getAllPayouts);
router.post('/reject', authenticateToken, payoutController.rejectPayout); // Added missing route
router.get('/stats', authenticateToken, payoutController.getPayoutStats);

// Admin payout management
router.post('/:payout_id/approve', authenticateToken, payoutController.approvePayout);
router.post('/:payout_id/complete', authenticateToken, payoutController.completePayout);

// Host endpoints
router.get('/host/earnings', authenticateToken, payoutController.getHostEarnings);
router.get('/my-received', authenticateToken, payoutController.getReceivedPayoutsByHost);
router.post('/request', authenticateToken, payoutController.requestPayout);
router.get('/balance', authenticateToken, payoutController.getAvailableBalance);

module.exports = router;