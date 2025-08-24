const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const reportsController = require('../controllers/reportsController');
const {authenticateToken} = require('../middleware/auth');
const Admin = require('../middleware/Admin');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(Admin);

// ADD: Dashboard redirect route
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

// Existing routes...
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/ban', adminController.banUser);
router.put('/users/:userId/unban', adminController.unbanUser);
router.get("/check-ban/:id", adminController.checkBanStatus);
router.put('/users/:userId/role', adminController.updateUserRole);

// Listings
router.get('/listings', adminController.getAllListings);
router.delete('/listings/:listingId', adminController.removeListing);

// Bookings
router.get('/bookings', adminController.getAllBookings);
router.put('/bookings/:id/status', adminController.updateBookingStatus);
router.get('/bookings/:id/history', adminController.getBookingHistory);
router.delete('/bookings/:bookingId', adminController.cancelBooking);

// Reviews
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:reviewId', adminController.removeReview);

// Payouts & Refunds
router.get('/admin/earnings/:hostId', adminController.getHostEarnings);
router.post('/admin/mark-paid', adminController.markHostAsPaid);
router.get('/payouts-summary', adminController.getHostsPendingPayouts);
router.post('/payouts/host/:hostId', adminController.processHostPayout);
router.post('/payout/:bookingId', adminController.processPayout);
router.post('/refund/:transactionId', adminController.processRefund);
router.get('/transactions', adminController.getAllTransactions);

// Reports
router.get("/reports", reportsController.getAllReports);
router.post("/actions", reportsController.adminTakeAction);

module.exports = router;