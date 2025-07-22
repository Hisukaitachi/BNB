const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const txController = require('../controllers/transactionsController');

router.get('/my', auth, txController.getMyPayments);
module.exports = router;