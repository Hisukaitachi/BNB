const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const auth = require('../middleware/auth');
const Host = require('../middleware/Host');


router.post('/', auth, bookingsController.createBooking); // Create a new booking
router.get('/my-bookings', auth, bookingsController.getBookingsByClient);
router.get('/host-bookings', auth, bookingsController.getBookingsByHost);
router.put('/:id/status', auth, bookingsController.updateBookingStatus);
router.get('/:id/history', auth, bookingsController.getBookingHistory);
router.put('/:id/complete', auth, bookingsController.markAsCompleted);
module.exports = router;

