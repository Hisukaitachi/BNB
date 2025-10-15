// backend/routes/refundRoutes.js - UPDATED WITH YOUR AUTH MIDDLEWARE
const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ==========================================
// CLIENT ROUTES
// ==========================================

// Request a refund for a cancelled booking
router.post('/request', authenticateToken, refundController.requestRefund);

// Get all my refund requests
router.get('/my-refunds', authenticateToken, refundController.getMyRefunds);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all refund requests (with filters)
router.get('/all', authenticateToken, requireAdmin, refundController.getAllRefundRequests);

// Get specific refund details
router.get('/:refundId/details', authenticateToken, requireAdmin, refundController.getRefundDetails);

// Process refund: Approve/Reject (creates refund intent)
router.post('/:refundId/process', authenticateToken, requireAdmin, refundController.processRefund);

// Confirm refund intent: Execute actual refund via PayMongo
router.post('/intent/:refundIntentId/confirm', authenticateToken, requireAdmin, refundController.confirmRefundIntent);

// Mark personal/manual refund as completed
router.post('/:refundId/complete-personal', authenticateToken, requireAdmin, refundController.completePersonalRefund);

module.exports = router;