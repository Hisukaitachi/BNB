// backend/routes/adminRoutes.js - FIXED VERSION using payout controller
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const payoutController = require('../controllers/payoutController'); // ✅ ADD THIS
const reportsController = require('../controllers/reportsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard redirect route
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

// Dashboard & Analytics
router.get('/dashboard-stats', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/ban', adminController.banUser);
router.put('/users/:userId/unban', adminController.unbanUser);
router.get('/check-ban/:id', adminController.checkBanStatus);
router.put('/users/:userId/role', adminController.updateUserRole);

// Listing Management
router.get('/listings', adminController.getAllListings);
router.delete('/listings/:listingId', adminController.removeListing);

// Booking Management
router.get('/bookings', adminController.getAllBookings);
router.put('/bookings/:id/status', adminController.updateBookingStatus);
router.get('/bookings/:id/history', adminController.getBookingHistory);
router.delete('/bookings/:bookingId', adminController.cancelBooking);

// Review Management
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:reviewId', adminController.removeReview);

// ✅ FIXED - Financial Management using PAYOUT CONTROLLER
router.get('/payouts/all', payoutController.getAllPayouts);
router.post('/payouts/release', payoutController.releasePayout);

// ✅ ADD MISSING ADMIN PAYOUT ROUTES
router.get('/payouts', payoutController.getAllPayouts);        // For /admin/payouts
router.post('/payouts/process', payoutController.releasePayout); // For processing

// ✅ FIXED - For specific host earnings (admin can check any host)
router.get('/earnings/:hostId', async (req, res) => {
  try {
    // Create a temporary request object with the hostId as user.id
    const tempReq = {
      user: { id: req.params.hostId },
      params: req.params,
      query: req.query
    };
    await payoutController.getHostEarnings(tempReq, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch host earnings'
    });
  }
});

// Financial Management - Refunds & Transactions (keep these in admin controller)
router.post('/refund/:transactionId', adminController.processRefund);
router.get('/transactions', adminController.getAllTransactions);

// Reports & User Safety
router.get('/reports', reportsController.getAllReports);
router.post('/actions', reportsController.adminTakeAction);

module.exports = router;