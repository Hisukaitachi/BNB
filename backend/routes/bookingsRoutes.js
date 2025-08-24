// backend/routes/bookingsRoutes.js - TEMPORARY VERSION (no validation)
const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken } = require('../middleware/auth');

// Temporarily remove ALL validation to test if controllers work
router.post('/', authenticateToken, bookingsController.createBooking);
router.get('/my-bookings', authenticateToken, bookingsController.getBookingsByClient);
router.get('/host-bookings', authenticateToken, bookingsController.getBookingsByHost);
router.put('/:id/status', authenticateToken, bookingsController.updateBookingStatus);
router.get('/:id/history', authenticateToken, bookingsController.getBookingHistory);

// NO VALIDATION - Test if these work
router.get('/listing/:listingId', bookingsController.getBookingsByListing);
router.get("/booked-dates/:listingId", bookingsController.getBookedDatesByListing);

module.exports = router;