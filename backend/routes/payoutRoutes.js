// backend/routes/payoutRoutes.js - Fixed with correct auth import
const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { authenticateToken } = require('../middleware/auth'); // ✅ Import the specific function

// Admin actions
router.post('/release', payoutController.releasePayout);
router.get('/all', payoutController.getAllPayouts);

// Host views their payouts
// ✅ Use auth token to get logged-in host's earnings
router.get('/host/earnings', authenticateToken, payoutController.getHostEarnings);
router.get("/my-received", authenticateToken, payoutController.getReceivedPayoutsByHost);

// Reject and Request 
router.post('/request', authenticateToken, payoutController.requestPayout);
router.post('/reject', authenticateToken, payoutController.rejectPayout);
module.exports = router;