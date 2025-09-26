const pool = require('../db');
const { AppError } = require('./errorHandler');

// Middleware to check reservation ownership
exports.checkReservationAccess = async (req, res, next) => {
    try {
        const reservationId = req.params.id || req.params.reservationId;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!reservationId) {
            return next(new AppError('Reservation ID is required', 400));
        }

        const [reservations] = await pool.query(`
            SELECT client_id, host_id 
            FROM reservations 
            WHERE id = ?
        `, [reservationId]);

        if (!reservations.length) {
            return next(new AppError('Reservation not found', 404));
        }

        const reservation = reservations[0];
        const hasAccess = userRole === 'admin' || 
                         reservation.client_id === userId || 
                         reservation.host_id === userId;

        if (!hasAccess) {
            return next(new AppError('Access denied to this reservation', 403));
        }

        req.reservation = {
            ...reservation,
            id: reservationId,
            isOwner: reservation.client_id === userId,
            isHost: reservation.host_id === userId,
            isAdmin: userRole === 'admin'
        };

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware to validate reservation dates
exports.validateReservationDates = (req, res, next) => {
    const { check_in_date, check_out_date } = req.body;

    if (!check_in_date || !check_out_date) {
        return next(new AppError('Check-in and check-out dates are required', 400));
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
        return next(new AppError('Check-in date cannot be in the past', 400));
    }

    if (checkOut <= checkIn) {
        return next(new AppError('Check-out date must be after check-in date', 400));
    }

    const daysDifference = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 365) {
        return next(new AppError('Reservation cannot exceed 365 days', 400));
    }

    if (daysDifference < 1) {
        return next(new AppError('Minimum reservation duration is 1 day', 400));
    }

    req.reservationDays = daysDifference;
    next();
};