const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const { createNotification } = require('./notificationsController');

const validateReservationDates = (check_in_date, check_out_date) => {
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const today = new Date();
    
    // Reset time to avoid timezone issues
    today.setHours(0, 0, 0, 0);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        throw new AppError('Invalid date format', 400);
    }

    if (checkIn < today) {
        throw new AppError('Check-in date cannot be in the past', 400);
    }
    
    if (checkOut <= checkIn) {
        throw new AppError('Check-out date must be after check-in date', 400);
    }

    const daysDifference = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 365) {
        throw new AppError('Reservation cannot exceed 365 days', 400);
    }

    if (daysDifference < 1) {
        throw new AppError('Minimum reservation duration is 1 day', 400);
    }

    return { checkIn, checkOut, daysDifference };
};

// Create a new reservation
exports.createReservation = catchAsync(async (req, res, next) => {
    const clientId = req.user.id;
    const {
        listing_id,
        check_in_date,
        check_out_date,
        guest_count,
        guest_name,
        guest_email,
        guest_phone,
        special_requests,
        base_price,
        cleaning_fee = 0,
        service_fee = 0,
        taxes = 0,
        requirePayment = false
    } = req.body;

    // Enhanced validation
    if (!listing_id || !check_in_date || !check_out_date || !guest_count || !guest_name || !guest_email) {
        return next(new AppError('Required fields missing', 400));
    }

    // Validate listing_id is a number
    if (isNaN(listing_id) || listing_id <= 0) {
        return next(new AppError('Invalid listing ID', 400));
    }

    // Validate guest_count
    if (isNaN(guest_count) || guest_count <= 0 || guest_count > 20) {
        return next(new AppError('Guest count must be between 1 and 20', 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guest_email)) {
        return next(new AppError('Invalid email format', 400));
    }

    // Validate guest_name
    if (guest_name.length < 2 || guest_name.length > 100) {
        return next(new AppError('Guest name must be between 2 and 100 characters', 400));
    }

    // Validate phone if provided
    if (guest_phone && (guest_phone.length < 10 || guest_phone.length > 20)) {
        return next(new AppError('Phone number must be between 10 and 20 characters', 400));
    }

    // Validate special_requests length
    if (special_requests && special_requests.length > 1000) {
        return next(new AppError('Special requests cannot exceed 1000 characters', 400));
    }

    // Validate pricing
    if (isNaN(base_price) || base_price <= 0) {
        return next(new AppError('Base price must be a positive number', 400));
    }
    
    if (isNaN(cleaning_fee) || cleaning_fee < 0) {
        return next(new AppError('Cleaning fee must be a non-negative number', 400));
    }
    
    if (isNaN(service_fee) || service_fee < 0) {
        return next(new AppError('Service fee must be a non-negative number', 400));
    }
    
    if (isNaN(taxes) || taxes < 0) {
        return next(new AppError('Taxes must be a non-negative number', 400));
    }

    // USE THE VALIDATION FUNCTION HERE:
    const { checkIn, checkOut, daysDifference } = validateReservationDates(check_in_date, check_out_date);

    // Check if listing exists and user doesn't own it
    const [listings] = await pool.query('SELECT host_id, title, price_per_night FROM listings WHERE id = ?', [listing_id]);
    if (!listings.length) {
        return next(new AppError('Listing not found', 404));
    }

    const listing = listings[0];
    
    if (listing.host_id === clientId) {
        return next(new AppError('You cannot make a reservation for your own listing', 400));
    }

    // Calculate total amount
    const totalAmount = parseFloat(base_price) + parseFloat(cleaning_fee) + 
                       parseFloat(service_fee) + parseFloat(taxes);

    // Basic price sanity check
    const expectedBasePrice = listing.price_per_night * daysDifference;
    const priceTolerance = expectedBasePrice * 0.5; // 50% tolerance
    
    if (base_price > expectedBasePrice + priceTolerance) {
        return next(new AppError('Price appears to be incorrect', 400));
    }

     try {
        // FIRST: Create reservation
        const [result] = await pool.query('CALL sp_create_reservation(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            listing_id, clientId, check_in_date, check_out_date, guest_count,
            guest_name, guest_email, guest_phone, special_requests || '', totalAmount
        ]);

        const reservationId = result[0][0].reservation_id;

        // Get listing details
        const [listingDetails] = await pool.query(`
            SELECT l.title, l.host_id, u.name as host_name 
            FROM listings l 
            JOIN users u ON l.host_id = u.id 
            WHERE l.id = ?
        `, [listing_id]);

        const listingData = listingDetails[0];

        // THEN: Handle payment if required
        if (requirePayment) {
            try {
                const paymentController = require('./paymentController');
                const paymentReq = {
                    ...req,
                    body: { bookingId: reservationId } // ✅ Now reservationId exists
                };
                
                await paymentController.createPaymentIntent(paymentReq, res, next);
                return; // Payment controller sends response
            } catch (paymentError) {
                console.error('Payment creation failed:', paymentError);
                // Continue with reservation creation
            }
        }

        // Send notifications
        await createNotification({
            userId: listingData.host_id,
            message: `New reservation request for "${listingData.title}" from ${guest_name}`,
            type: 'reservation_request'
        });

        await createNotification({
            userId: clientId,
            message: `Your reservation request for "${listingData.title}" has been submitted`,
            type: 'reservation_submitted'
        });

        res.status(201).json({
            status: 'success',
            message: requirePayment ? 'Reservation created, payment required' : 'Reservation created successfully',
            data: {
                reservationId,
                listing: listingData.title,
                checkIn: check_in_date,
                checkOut: check_out_date,
                guestCount: guest_count,
                totalAmount,
                requiresPayment: requirePayment, // ✅ Fixed variable name
                status: 'pending'
            }
        });

        console.log(`✅ Reservation created: ${reservationId}`, {
            clientId,
            listingId: listing_id,
            duration: daysDifference
        });

    } catch (error) {
        console.error('❌ Reservation creation failed:', {
            error: error.message,
            clientId,
            listingId: listing_id
        });
        
        if (error.message.includes('Date conflict')) {
            return next(new AppError('Selected dates are not available', 409));
        }
        throw error;
    }
});

// Get user's reservations
exports.getMyReservations = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = 'r.client_id = ?';
    const queryParams = [userId];

    if (status) {
        whereClause += ' AND r.status = ?';
        queryParams.push(status);
    }

    queryParams.push(parseInt(limit), offset);

    const [reservations] = await pool.query(`
        SELECT 
            r.*,
            l.title as listing_title,
            l.location as listing_location,
            l.image_url,
            u.name as host_name,
            DATEDIFF(r.check_out_date, r.check_in_date) as nights
        FROM reservations r
        JOIN listings l ON r.listing_id = l.id
        JOIN users u ON r.host_id = u.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
    `, queryParams);

    // Get total count
    const [countResult] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM reservations r 
        WHERE ${whereClause}
    `, queryParams.slice(0, -2));

    res.status(200).json({
        status: 'success',
        results: reservations.length,
        data: {
            reservations,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult[0].total / parseInt(limit))
            }
        }
    });
});

// Get host's reservations
exports.getHostReservations = catchAsync(async (req, res, next) => {
    const hostId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    if (req.user.role !== 'host') {
        return next(new AppError('Only hosts can access this endpoint', 403));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = 'r.host_id = ?';
    const queryParams = [hostId];

    if (status) {
        whereClause += ' AND r.status = ?';
        queryParams.push(status);
    }

    queryParams.push(parseInt(limit), offset);

    const [reservations] = await pool.query(`
        SELECT 
            r.*,
            l.title as listing_title,
            l.location as listing_location,
            u.name as client_name,
            DATEDIFF(r.check_out_date, r.check_in_date) as nights
        FROM reservations r
        JOIN listings l ON r.listing_id = l.id
        JOIN users u ON r.client_id = u.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
    `, queryParams);

    const [countResult] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM reservations r 
        WHERE ${whereClause}
    `, queryParams.slice(0, -2));

    res.status(200).json({
        status: 'success',
        results: reservations.length,
        data: {
            reservations,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult[0].total / parseInt(limit))
            }
        }
    });
});

// Update reservation status
exports.updateReservationStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, notes = '' } = req.body;
    const userId = req.user.id;

    if (!status) {
        return next(new AppError('Status is required', 400));
    }

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Get reservation details with row lock
        const [reservations] = await connection.query(`
            SELECT r.*, l.title, l.host_id 
            FROM reservations r 
            JOIN listings l ON r.listing_id = l.id 
            WHERE r.id = ?
            FOR UPDATE
        `, [id]);

        if (!reservations.length) {
            await connection.rollback();
            return next(new AppError('Reservation not found', 404));
        }

        const reservation = reservations[0];

        // Authorization check
        const isHost = reservation.host_id === userId;
        const isClient = reservation.client_id === userId;
        const isAdmin = req.user.role === 'admin';

        if (!isHost && !isClient && !isAdmin) {
            await connection.rollback();
            return next(new AppError('Not authorized to update this reservation', 403));
        }

        // Business logic validation
        if (isClient && !['cancelled'].includes(status)) {
            await connection.rollback();
            return next(new AppError('Clients can only cancel reservations', 403));
        }

        if (isHost && reservation.status === 'pending' && !['confirmed', 'cancelled'].includes(status)) {
            await connection.rollback();
            return next(new AppError('Hosts can only confirm or cancel pending reservations', 403));
        }

        // Check valid status transitions
        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['cancelled', 'completed'],
            'cancelled': [], // No transitions from cancelled
            'completed': [] // No transitions from completed
        };

        if (!validTransitions[reservation.status].includes(status)) {
            await connection.rollback();
            return next(new AppError(`Cannot change status from ${reservation.status} to ${status}`, 400));
        }

        // Update using stored procedure
        await connection.query('CALL sp_update_reservation_status(?, ?, ?, ?)', [
            id, userId, status, notes
        ]);

        await connection.commit();

        // Send notifications based on status change (outside transaction)
        let clientMessage = '';
        let hostMessage = '';

        switch (status) {
            case 'confirmed':
                clientMessage = `Your reservation for "${reservation.title}" has been confirmed!`;
                hostMessage = `You confirmed a reservation for "${reservation.title}"`;
                break;
            case 'cancelled':
                if (isClient) {
                    hostMessage = `Guest cancelled their reservation for "${reservation.title}"`;
                } else {
                    clientMessage = `Your reservation for "${reservation.title}" has been cancelled`;
                }
                break;
            case 'completed':
                clientMessage = `Your stay at "${reservation.title}" is now complete. Please leave a review!`;
                hostMessage = `Reservation for "${reservation.title}" has been completed`;
                break;
        }

        // Send notifications
        if (clientMessage && !isClient) {
            await createNotification({
                userId: reservation.client_id,
                message: clientMessage,
                type: 'reservation_update'
            });
        }

        if (hostMessage && !isHost) {
            await createNotification({
                userId: reservation.host_id,
                message: hostMessage,
                type: 'reservation_update'
            });
        }

        res.status(200).json({
            status: 'success',
            message: `Reservation ${status} successfully`,
            data: {
                reservationId: parseInt(id),
                newStatus: status,
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release(); // CRITICAL: Always release the connection
    }
});

// Get reservation details
exports.getReservationDetails = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    const [reservations] = await pool.query(`
        SELECT 
            r.*,
            l.title as listing_title,
            l.location as listing_location,
            l.image_url,
            l.amenities,
            l.house_rules,
            uc.name as client_name,
            uh.name as host_name,
            uh.email as host_email,
            uh.phone as host_phone,
            DATEDIFF(r.check_out_date, r.check_in_date) as nights
        FROM reservations r
        JOIN listings l ON r.listing_id = l.id
        JOIN users uc ON r.client_id = uc.id
        JOIN users uh ON r.host_id = uh.id
        WHERE r.id = ?
    `, [id]);

    if (!reservations.length) {
        return next(new AppError('Reservation not found', 404));
    }

    const reservation = reservations[0];

    // Authorization check
    const canView = reservation.client_id === userId || 
                   reservation.host_id === userId || 
                   req.user.role === 'admin';

    if (!canView) {
        return next(new AppError('Not authorized to view this reservation', 403));
    }

    // Get reservation history
    const [history] = await pool.query(`
        SELECT rh.*, u.name as user_name
        FROM reservation_history rh
        JOIN users u ON rh.user_id = u.id
        WHERE rh.reservation_id = ?
        ORDER BY rh.created_at DESC
    `, [id]);

    res.status(200).json({
        status: 'success',
        data: {
            reservation,
            history
        }
    });
});

// Cancel reservation
exports.cancelReservation = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason = 'User requested cancellation' } = req.body;
    const userId = req.user.id;

    // Get reservation details
    const [reservations] = await pool.query(
        'SELECT * FROM reservations WHERE id = ?', [id]
    );

    if (!reservations.length) {
        return next(new AppError('Reservation not found', 404));
    }

    const reservation = reservations[0];

    // Check authorization
    const canCancel = reservation.client_id === userId || 
                     reservation.host_id === userId || 
                     req.user.role === 'admin';

    if (!canCancel) {
        return next(new AppError('Not authorized to cancel this reservation', 403));
    }

    // Check if reservation can be cancelled
    if (['completed', 'cancelled'].includes(reservation.status)) {
        return next(new AppError('Cannot cancel this reservation', 400));
    }

    try {
        await pool.query('CALL sp_update_reservation_status(?, ?, ?, ?)', [
            id, userId, 'cancelled', reason
        ]);

        res.status(200).json({
            status: 'success',
            message: 'Reservation cancelled successfully',
            data: {
                reservationId: parseInt(id),
                cancelledAt: new Date().toISOString(),
                reason
            }
        });

    } catch (error) {
        throw error;
    }
});

// Get available dates for a listing
exports.getAvailableDates = catchAsync(async (req, res, next) => {
    const { listingId } = req.params;
    const { months = 3 } = req.query;

    if (!listingId || isNaN(listingId)) {
        return next(new AppError('Valid listing ID is required', 400));
    }

    // Get booked dates for the next X months
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(months));

    const [bookedDates] = await pool.query(`
        SELECT check_in_date, check_out_date, status
        FROM reservations
        WHERE listing_id = ? 
        AND status IN ('confirmed', 'pending')
        AND check_in_date <= ?
        ORDER BY check_in_date
    `, [listingId, endDate.toISOString().split('T')[0]]);

    res.status(200).json({
        status: 'success',
        data: {
            listingId: parseInt(listingId),
            bookedDates: bookedDates.map(booking => ({
                checkIn: booking.check_in_date,
                checkOut: booking.check_out_date,
                status: booking.status
            })),
            availabilityPeriod: {
                from: new Date().toISOString().split('T')[0],
                to: endDate.toISOString().split('T')[0]
            }
        }
    });
});

// Search reservations with filters and pagination
exports.searchReservations = catchAsync(async (req, res, next) => {
    const {
        status,
        date_from,
        date_to,
        guest_name,
        listing_title,
        min_amount,
        max_amount,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'DESC'
    } = req.query;

    // Validate pagination
    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit))); // Cap at 100
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let baseQuery = `
        FROM reservations r USE INDEX (PRIMARY)
        JOIN listings l ON r.listing_id = l.id
        JOIN users uc ON r.client_id = uc.id
        JOIN users uh ON r.host_id = uh.id
    `;
    
    let whereConditions = [];
    let queryParams = [];
    
    // Role-based filtering with proper indexes
    if (userRole === 'client') {
        whereConditions.push('r.client_id = ?');
        queryParams.push(userId);
        baseQuery = baseQuery.replace('USE INDEX (PRIMARY)', 'USE INDEX (idx_client_reservations)');
    } else if (userRole === 'host') {
        whereConditions.push('r.host_id = ?');
        queryParams.push(userId);
        baseQuery = baseQuery.replace('USE INDEX (PRIMARY)', 'USE INDEX (idx_host_reservations)');
    }
    
    // Apply filters with proper validation
    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
        whereConditions.push('r.status = ?');
        queryParams.push(status);
    }
    
    if (date_from && /^\d{4}-\d{2}-\d{2}$/.test(date_from)) {
        whereConditions.push('r.check_in_date >= ?');
        queryParams.push(date_from);
    }
    
    if (date_to && /^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
        whereConditions.push('r.check_out_date <= ?');
        queryParams.push(date_to);
    }
    
    if (guest_name && guest_name.length >= 2) {
        whereConditions.push('r.guest_name LIKE ?');
        queryParams.push(`%${guest_name.substring(0, 50)}%`); // Limit search length
    }
    
    if (listing_title && listing_title.length >= 2) {
        whereConditions.push('l.title LIKE ?');
        queryParams.push(`%${listing_title.substring(0, 50)}%`);
    }
    
    if (min_amount && !isNaN(min_amount) && min_amount >= 0) {
        whereConditions.push('r.total_amount >= ?');
        queryParams.push(parseFloat(min_amount));
    }
    
    if (max_amount && !isNaN(max_amount) && max_amount >= 0) {
        whereConditions.push('r.total_amount <= ?');
        queryParams.push(parseFloat(max_amount));
    }
    
    const whereClause = whereConditions.length > 0 ? 
        'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Validate and sanitize sort parameters
    const validSortFields = ['created_at', 'check_in_date', 'total_amount', 'status'];
    const safeSortBy = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const offset = (parsedPage - 1) * parsedLimit;
    
    try {
        // Get total count (optimized)
        const [countResult] = await pool.query(`
            SELECT COUNT(*) as total ${baseQuery} ${whereClause}
        `, queryParams);
        
        // Get reservations
        const selectQuery = `
            SELECT 
                r.id,
                r.check_in_date,
                r.check_out_date,
                r.guest_count,
                r.guest_name,
                r.total_amount,
                r.status,
                r.created_at,
                l.title as listing_title,
                l.location as listing_location,
                l.image_url,
                uc.name as client_name,
                uh.name as host_name,
                DATEDIFF(r.check_out_date, r.check_in_date) as nights
            ${baseQuery}
            ${whereClause}
            ORDER BY r.${safeSortBy} ${safeSortOrder}
            LIMIT ? OFFSET ?
        `;
        
        queryParams.push(parsedLimit, offset);
        const [reservations] = await pool.query(selectQuery, queryParams);
        
        res.status(200).json({
            status: 'success',
            results: reservations.length,
            data: {
                reservations,
                filters: {
                    status, date_from, date_to, guest_name, listing_title,
                    min_amount, max_amount, sort_by: safeSortBy, sort_order: safeSortOrder
                },
                pagination: {
                    total: countResult[0].total,
                    page: parsedPage,
                    limit: parsedLimit,
                    totalPages: Math.ceil(countResult[0].total / parsedLimit)
                }
            }
        });
        
    } catch (error) {
        console.error('Search reservations error:', error);
        return next(new AppError('Search failed', 500));
    }
});