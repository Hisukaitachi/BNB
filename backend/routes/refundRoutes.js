// backend/routes/refundRoutes.js
const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Client routes
router.post('/request', authenticateToken, refundController.requestRefund);
router.get('/my-refunds', authenticateToken, refundController.getMyRefunds);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, refundController.getAllRefundRequests);
router.get('/admin/:refundId', authenticateToken, requireAdmin, refundController.getRefundDetails);
router.post('/admin/:refundId/process', authenticateToken, requireAdmin, refundController.processRefund);

module.exports = router;