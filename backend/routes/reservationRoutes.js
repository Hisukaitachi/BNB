const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const reservationController = require('../controllers/reservationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// RATE LIMITING - Add this BEFORE the routes:
const reservationLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 reservation attempts per 15 minutes
    message: {
        status: 'error',
        message: 'Too many reservation attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// APPLY RATE LIMITING TO CREATION ROUTE:
router.post('/', authenticateToken, reservationLimit, reservationController.createReservation);

// Rest of your routes remain the same:
router.get('/my-reservations', authenticateToken, reservationController.getMyReservations);
router.get('/host-reservations', authenticateToken, requireRole('host'), reservationController.getHostReservations);
router.get('/:id', authenticateToken, reservationController.getReservationDetails);
router.patch('/:id/status', authenticateToken, reservationController.updateReservationStatus);
router.patch('/:id/cancel', authenticateToken, reservationController.cancelReservation);
router.get('/listing/:listingId/availability', reservationController.getAvailableDates);
router.get('/search', authenticateToken, reservationController.searchReservations);

module.exports = router;