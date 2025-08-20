// routes/refundRoutes.js
const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, refundController.refundPayment);
module.exports = router;
