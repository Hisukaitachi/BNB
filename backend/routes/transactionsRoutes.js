const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const txController = require('../controllers/transactionsController');

router.get('/my', authenticateToken, txController.getMyPayments);
module.exports = router;