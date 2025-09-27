// backend/routes/reservationRoutes.js - Complete Updated Version
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const reservationController = require('../controllers/reservationController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
    createReservationSchema,
    hostActionSchema,
    cancelReservationSchema,
    adminRefundSchema
} = require('../validation/reservationValidation');

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
// CLIENT ROUTES (Authentication Required)
// ==========================================

// Create new reservation with deposit payment
router.post('/', 
    authenticateToken, 
    createReservationLimiter, 
    validate(createReservationSchema),
    reservationController.createReservation
);

// Get client's own reservations
router.get('/my-reservations', 
    authenticateToken, 
    reservationController.getMyReservations
);

// Get specific reservation details
router.get('/:id', 
    authenticateToken, 
    reservationController.getReservationDetails
);

// Process remaining payment for reservation
router.post('/:id/pay-remaining', 
    authenticateToken, 
    paymentLimiter,
    reservationController.processRemainingPayment
);

// Cancel reservation (client-initiated)
router.patch('/:id/cancel', 
    authenticateToken,
    validate(cancelReservationSchema),
    reservationController.cancelReservation
);

// Confirm deposit payment (after PayMongo webhook)
router.post('/:reservationId/confirm-deposit', 
    authenticateToken,
    reservationController.confirmDepositPayment
);

// Get cancellation preview (calculate refund before confirming)
router.get('/:id/cancellation-preview',
    authenticateToken,
    reservationController.getCancellationPreview
);

// Update reservation status (for confirmed to arrived, etc.)
router.patch('/:id/status',
    authenticateToken,
    reservationController.updateReservationStatus
);

// Search/filter reservations
router.get('/search',
    authenticateToken,
    reservationController.searchReservations
);

// ==========================================
// HOST ROUTES (Host Role Required)
// ==========================================

// Get all reservations for host's listings
router.get('/host-reservations', 
    authenticateToken, 
    requireRole('host'), 
    reservationController.getHostReservations
);

// Host approve or decline reservation
router.post('/:id/host-action', 
    authenticateToken, 
    requireRole('host'),
    validate(hostActionSchema),
    reservationController.hostReservationAction
);

// Get host reservation statistics
router.get('/host/stats',
    authenticateToken,
    requireRole('host'),
    reservationController.getHostReservationStats
);

// Mark guest as arrived (check-in)
router.post('/:id/check-in',
    authenticateToken,
    requireRole('host'),
    reservationController.markGuestArrived
);

// Mark reservation as completed (check-out)
router.post('/:id/check-out',
    authenticateToken,
    requireRole('host'),
    reservationController.markAsCompleted
);

// Host cancel reservation (with reason)
router.patch('/:id/host-cancel',
    authenticateToken,
    requireRole('host'),
    validate(cancelReservationSchema),
    reservationController.hostCancelReservation
);

// ==========================================
// ADMIN ROUTES (Admin Role Required)
// ==========================================

// Get all reservations (admin view)
router.get('/admin/all', 
    authenticateToken, 
    requireRole('admin'), 
    reservationController.getAllReservations
);

// Get reservation analytics
router.get('/admin/analytics',
    authenticateToken,
    requireRole('admin'),
    reservationController.getReservationAnalytics
);

// Get refund requests
router.get('/admin/refund-requests',
    authenticateToken,
    requireRole('admin'),
    reservationController.getRefundRequests
);

// Manage refunds (approve/deny/custom amount)
router.post('/admin/manage-refund', 
    authenticateToken, 
    requireRole('admin'),
    validate(adminRefundSchema),
    reservationController.adminManageRefund
);

// Process manual refund
router.post('/admin/manual-refund',
    authenticateToken,
    requireRole('admin'),
    reservationController.processManualRefund
);

// Override reservation status (admin power)
router.patch('/admin/:id/override-status',
    authenticateToken,
    requireRole('admin'),
    reservationController.adminOverrideStatus
);

// Get payment schedules for all reservations
router.get('/admin/payment-schedules',
    authenticateToken,
    requireRole('admin'),
    reservationController.getPaymentSchedules
);

// Admin cancel reservation
router.patch('/admin/:reservationId/cancel',
    authenticateToken,
    requireRole('admin'),
    reservationController.cancelReservationAdmin
);

// Get reservation statistics
router.get('/admin/stats',
    authenticateToken,
    requireRole('admin'),
    reservationController.getReservationStats
);

// ==========================================
// PAYMENT WEBHOOK ROUTES (System/Internal)
// ==========================================

// PayMongo webhook for deposit payment confirmation
router.post('/webhook/deposit-paid',
    express.raw({ type: 'application/json' }),
    reservationController.webhookDepositPaid
);

// PayMongo webhook for remaining payment confirmation  
router.post('/webhook/remaining-paid',
    express.raw({ type: 'application/json' }),
    reservationController.webhookRemainingPaid
);

// PayMongo webhook for refund processed
router.post('/webhook/refund-processed',
    express.raw({ type: 'application/json' }),
    reservationController.webhookRefundProcessed
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;