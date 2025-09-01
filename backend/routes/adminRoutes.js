// backend/routes/adminRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const reportsController = require('../controllers/reportsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth'); // ✅ Use the correct import

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin); // ✅ Use requireAdmin instead of Admin middleware

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

// Financial Management - Payouts & Earnings
router.get('/earnings/:hostId', adminController.getHostEarnings);
router.post('/mark-paid', adminController.markHostAsPaid);
router.get('/payouts-summary', adminController.getHostsPendingPayouts);
router.post('/payouts/host/:hostId', adminController.processHostPayout);
router.post('/payout/:bookingId', adminController.processPayout);

// Financial Management - Refunds & Transactions  
router.post('/refund/:transactionId', adminController.processRefund);
router.get('/transactions', adminController.getAllTransactions);

// Reports & User Safety
router.get('/reports', reportsController.getAllReports);
router.post('/actions', reportsController.adminTakeAction);

module.exports = router;