const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const auth = require('../middleware/auth')

// Admin actions
router.post('/release', payoutController.releasePayout);
router.get('/all', payoutController.getAllPayouts);

// Host views their payouts
// ✅ Use auth token to get logged-in host's earnings
router.get('/host/earnings', auth, payoutController.getHostEarnings);
router.get("/my-received", auth, payoutController.getReceivedPayoutsByHost);
module.exports = router;
