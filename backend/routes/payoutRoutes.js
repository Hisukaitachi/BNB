// routes/payoutRoutes.js
const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ==========================================
// HOST ROUTES
// ==========================================

// @route   POST /api/payouts/host/request
// @desc    Request a new payout
// @access  Private (Host only)
router.post('/host/request', authenticateToken, payoutController.requestPayout);

// @route   GET /api/payouts/host/balance
// @desc    Get available balance for payout
// @access  Private (Host only)
router.get('/host/balance', authenticateToken, payoutController.getAvailableBalance);

// @route   GET /api/payouts/host/earnings
// @desc    Get host earnings summary and payout history
// @access  Private (Host only)
router.get('/host/earnings', authenticateToken, payoutController.getHostEarnings);

// @route   GET /api/payouts/host/received
// @desc    Get list of received/completed payouts
// @access  Private (Host only)
router.get('/host/received', authenticateToken, payoutController.getReceivedPayoutsByHost);

// ==========================================
// ADMIN ROUTES
// ==========================================

// @route   GET /api/payouts/admin
// @desc    Get all payouts with filters
// @access  Private (Admin only)
router.get('/admin', authenticateToken, requireAdmin, payoutController.getAllPayouts);

// @route   GET /api/payouts/admin/stats
// @desc    Get payout statistics
// @access  Private (Admin only)
router.get('/admin/stats', authenticateToken, requireAdmin, payoutController.getPayoutStats);

// @route   POST /api/payouts/admin/:payout_id/approve
// @desc    Approve a payout request
// @access  Private (Admin only)
router.post('/admin/:payout_id/approve', authenticateToken, requireAdmin, payoutController.approvePayout);

// @route   POST /api/payouts/admin/:payout_id/complete
// @desc    Mark payout as complete (after manual transfer)
// @access  Private (Admin only)
router.post('/admin/:payout_id/complete', authenticateToken, requireAdmin, payoutController.completePayout);

// @route   POST /api/payouts/admin/reject
// @desc    Reject a payout request
// @access  Private (Admin only)
router.post('/admin/reject', authenticateToken, requireAdmin, payoutController.rejectPayout);

module.exports = router;