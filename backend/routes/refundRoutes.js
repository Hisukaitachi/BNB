// routes/refundRoutes.js
const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const auth = require('../middleware/auth');

router.post('/', auth, refundController.refundPayment);
module.exports = router;
