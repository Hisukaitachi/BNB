// backend/routes/bookingsRoutes.js - Updated with validation
const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken } = require('../middleware/auth'); // Use specific function for auth
const { validate } = require('../middleware/validation');

// Import validation schemas
const {
  createBookingSchema,
  updateBookingStatusSchema,
  getBookingsByListingSchema,
  getBookingHistorySchema
} = require('../validation/bookingValidation');

// Protected routes with validation
router.post('/', authenticateToken, validate(createBookingSchema), bookingsController.createBooking);
router.get('/my-bookings', authenticateToken, bookingsController.getBookingsByClient);
router.get('/host-bookings', authenticateToken, bookingsController.getBookingsByHost);
router.put('/:id/status', authenticateToken, validate(updateBookingStatusSchema), bookingsController.updateBookingStatus);
router.get('/:id/history', authenticateToken, validate(getBookingHistorySchema), bookingsController.getBookingHistory);

// Public/semi-public routes with validation
router.get('/listing/:listingId', validate(getBookingsByListingSchema), bookingsController.getBookingsByListing);
router.get("/booked-dates/:listingId", validate(getBookingsByListingSchema), bookingsController.getBookedDatesByListing);

module.exports = router;