// backend/routes/bookingsRoutes.js - Updated with file upload support
const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken } = require('../middleware/auth');
const { uploadFields, uploadCustomerIds } = require('../middleware/multer'); // Add this import

// Existing routes
router.post('/', authenticateToken, bookingsController.createBooking);
router.get('/my-bookings', authenticateToken, bookingsController.getBookingsByClient);
router.get('/host-bookings', authenticateToken, bookingsController.getBookingsByHost);
router.put('/:id/status', authenticateToken, bookingsController.updateBookingStatus);
router.get('/:id/history', authenticateToken, bookingsController.getBookingHistory);

// Public routes (no auth)
router.get('/listing/:listingId', bookingsController.getBookingsByListing);
router.get("/booked-dates/:listingId", bookingsController.getBookedDatesByListing);

// UPDATED: Customer info with file upload support for ID documents
router.post('/:bookingId/customer-info', authenticateToken, uploadCustomerIds, bookingsController.updateCustomerInfo);
router.get('/:bookingId/customer-info', authenticateToken, bookingsController.getBookingCustomerInfo);
module.exports = router;