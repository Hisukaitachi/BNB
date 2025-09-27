// backend/routes/reservationRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const reservationController = require('../controllers/reservationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ==========================================
// RATE LIMITING CONFIGURATIONS
// ==========================================

// Rate limiter for reservation creation (prevent spam)
const createReservationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 reservation attempts per 15 minutes
    message: {
        status: 'error',
        message: 'Too many reservation attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for payment operations
const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Maximum 10 payment attempts per 5 minutes
    message: {
        status: 'error',
        message: 'Too many payment attempts. Please wait a moment.'
    }
});

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

// Get cancellation policy
router.get('/cancellation-policy', reservationController.getCancellationPolicy);

// Get available dates for a listing
router.get('/listing/:listingId/availability', reservationController.getAvailableDates);

// ==========================================
// AUTHENTICATED ROUTES - ORDER MATTERS!
// ==========================================

// Search MUST come before /:id routes
router.get('/search', authenticateToken, reservationController.searchReservations);

// Get client's own reservations
router.get('/my-reservations', authenticateToken, reservationController.getMyReservations);

// Get host's reservations (must be before /:id)
router.get('/host-reservations', 
    authenticateToken, 
    requireRole('host'), 
    reservationController.getHostReservations
);

// ==========================================
// CLIENT ROUTES (Authentication Required)
// ==========================================

// Create new reservation with deposit payment
router.post('/', 
    authenticateToken, 
    createReservationLimiter,
    reservationController.createReservation
);

// Get specific reservation details (AFTER other specific routes)
router.get('/:id', 
    authenticateToken, 
    reservationController.getReservationDetails
);

// Process remaining payment for reservation
router.post('/:reservationId/pay-remaining', 
    authenticateToken, 
    paymentLimiter,
    reservationController.processRemainingPayment
);

// Cancel reservation (client-initiated)
router.patch('/:id/cancel', 
    authenticateToken,
    reservationController.cancelReservation
);

// Confirm deposit payment (after PayMongo webhook)
router.post('/:reservationId/confirm-deposit', 
    authenticateToken,
    reservationController.confirmDepositPayment
);

// Update reservation status
router.patch('/:id/status',
    authenticateToken,
    reservationController.updateReservationStatus
);

// ==========================================
// HOST ROUTES (Host Role Required)
// ==========================================

// Host approve or decline reservation
router.post('/:id/host-action', 
    authenticateToken, 
    requireRole('host'),
    reservationController.hostReservationAction
);

// ==========================================
// ADMIN ROUTES (Admin Role Required)
// ==========================================

// Manage refunds (approve/deny/custom amount)
router.post('/admin/manage-refund', 
    authenticateToken, 
    requireRole('admin'),
    reservationController.adminManageRefund
);

// Import admin controller for additional admin routes
const adminController = require('../controllers/adminController');

// Check if admin functions exist and add them
if (adminController.getAllReservations) {
    router.get('/admin/all', 
        authenticateToken, 
        requireRole('admin'), 
        adminController.getAllReservations
    );
}

if (adminController.getReservationStats) {
    router.get('/admin/stats', 
        authenticateToken, 
        requireRole('admin'), 
        adminController.getReservationStats
    );
}

if (adminController.cancelReservationAdmin) {
    router.patch('/admin/:reservationId/cancel', 
        authenticateToken, 
        requireRole('admin'), 
        adminController.cancelReservationAdmin
    );
}

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;