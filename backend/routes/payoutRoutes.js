const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');

// Admin actions
router.post('/release', payoutController.releasePayout);
router.get('/all', payoutController.getAllPayouts);

// Host views their payouts
router.get('/host/:hostId', payoutController.getHostEarnings);
router.get("/host-total", payoutController.getHostPayoutTotal);
module.exports = router;
