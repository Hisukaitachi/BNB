// backend/routes/adminRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const reportsController = require('../controllers/reportsController');
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ==========================================
// DASHBOARD
// ==========================================
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin Dashboard',
    data: {
      user: req.user,
      dashboardUrl: '/api/admin/dashboard-stats'
    }
  });
});

router.get('/dashboard-stats', adminController.getDashboardStats);

// ==========================================
// USER MANAGEMENT
// ==========================================
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/ban', adminController.banUser);
router.put('/users/:userId/unban', adminController.unbanUser);
router.get('/check-ban/:id', adminController.checkBanStatus);
router.put('/users/:userId/role', adminController.updateUserRole);

// ==========================================
// LISTING MANAGEMENT
// ==========================================
router.get('/listings', adminController.getAllListings);
router.delete('/listings/:listingId', adminController.removeListing);

// ==========================================
// BOOKING MANAGEMENT
// ==========================================
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingDetails);
router.put('/bookings/:id/status', adminController.updateBookingStatus);
router.get('/bookings/:id/history', adminController.getBookingHistory);
router.delete('/bookings/:bookingId', adminController.cancelBooking);

// Cancel booking with refund (from bookingsController)
router.patch('/bookings/:bookingId/cancel-refund', bookingsController.adminCancelBooking);

// ==========================================
// REFUND MANAGEMENT
// ==========================================
router.get('/refunds', adminController.getAllRefunds);
router.get('/refunds/:refundId', adminController.getRefundDetails);
router.patch('/refunds/:refundId/status', adminController.updateRefundStatus);
router.post('/refunds/manual', adminController.processManualRefund);

// ==========================================
// REVIEW MANAGEMENT
// ==========================================
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:reviewId', adminController.removeReview);

// ==========================================
// REPORTS & USER SAFETY
// ==========================================
router.get('/reports', reportsController.getAllReports);
router.post('/actions', reportsController.adminTakeAction);

module.exports = router;