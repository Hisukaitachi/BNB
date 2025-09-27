const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const { createNotification } = require('./notificationsController');
const paymentService = require('../services/paymentService');
const emailService = require('../utils/emailService');

// Calculate deposit and payment schedule
const calculatePaymentSchedule = (totalAmount, checkInDate) => {
    const depositAmount = Math.round(totalAmount * 0.5 * 100) / 100; // 50% deposit
    const remainingAmount = Math.round((totalAmount - depositAmount) * 100) / 100;
    
    // Payment due 3 days before check-in
    const paymentDueDate = new Date(checkInDate);
    paymentDueDate.setDate(paymentDueDate.getDate() - 3);
    
    return {
        depositAmount,
        remainingAmount,
        paymentDueDate: paymentDueDate.toISOString().split('T')[0]
    };
};

// Calculate cancellation fee and refund
const calculateCancellationRefund = async (reservation) => {
    const now = new Date();
    const checkInDate = new Date(reservation.check_in_date);
    const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
    
    // Get cancellation policy
    const [policy] = await pool.query(`
        SELECT refund_percentage 
        FROM cancellation_policies 
        WHERE days_before_checkin <= ? 
        ORDER BY days_before_checkin DESC 
        LIMIT 1
    `, [daysUntilCheckIn]);
    
    const refundPercentage = policy.length > 0 ? policy[0].refund_percentage : 0;
    const serviceFeePercentage = 10; // 10% service fee on cancellations
    
    // Calculate amounts
    const paidAmount = reservation.deposit_paid ? reservation.deposit_amount : 0;
    const baseRefund = (paidAmount * refundPercentage) / 100;
    const cancellationFee = (baseRefund * serviceFeePercentage) / 100;
    const finalRefundAmount = baseRefund - cancellationFee;
    
    return {
        daysUntilCheckIn,
        refundPercentage,
        cancellationFee: Math.round(cancellationFee * 100) / 100,
        refundAmount: Math.round(finalRefundAmount * 100) / 100,
        paidAmount
    };
};

// Create reservation with deposit payment
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
        total_amount,
        paymentMethod = 'deposit' // 'deposit' or 'full'
    } = req.body;

    // Validation (keep existing validation)
    if (!listing_id || !check_in_date || !check_out_date || !guest_count || !guest_name || !guest_email) {
        return next(new AppError('Required fields missing', 400));
    }

    // Check listing exists and user doesn't own it
    const [listings] = await pool.query('SELECT host_id, title FROM listings WHERE id = ?', [listing_id]);
    if (!listings.length) {
        return next(new AppError('Listing not found', 404));
    }

    const listing = listings[0];
    if (listing.host_id === clientId) {
        return next(new AppError('You cannot make a reservation for your own listing', 400));
    }

    // Calculate payment schedule
    const { depositAmount, remainingAmount, paymentDueDate } = calculatePaymentSchedule(
        total_amount, 
        check_in_date
    );

    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Create reservation with deposit info
        const [result] = await connection.query(`
            INSERT INTO reservations (
                listing_id, client_id, host_id, check_in_date, check_out_date,
                guest_count, guest_name, guest_email, guest_phone, special_requests,
                total_amount, deposit_amount, remaining_amount, payment_due_date,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `, [
            listing_id, clientId, listing.host_id, check_in_date, check_out_date,
            guest_count, guest_name, guest_email, guest_phone, special_requests || '',
            total_amount, depositAmount, remainingAmount, paymentDueDate
        ]);

        const reservationId = result.insertId;

        // Create payment schedule
        if (paymentMethod === 'deposit') {
            // Schedule for 50% now, 50% later
            await connection.query(`
                INSERT INTO payment_schedules (reservation_id, payment_type, amount, due_date)
                VALUES 
                (?, 'deposit', ?, NOW()),
                (?, 'remaining', ?, ?)
            `, [reservationId, depositAmount, reservationId, remainingAmount, paymentDueDate]);
        } else {
            // Full payment now
            await connection.query(`
                INSERT INTO payment_schedules (reservation_id, payment_type, amount, due_date)
                VALUES (?, 'full', ?, NOW())
            `, [reservationId, total_amount]);
        }

        await connection.commit();

        // Send notifications
        await createNotification({
            userId: listing.host_id,
            message: `New reservation request for "${listing.title}" from ${guest_name}. Pending your approval.`,
            type: 'reservation_request'
        });

        await createNotification({
            userId: clientId,
            message: `Your reservation request for "${listing.title}" has been submitted. Waiting for host approval.`,
            type: 'reservation_submitted'
        });

        // Send email to host
        await emailService.sendReservationRequestEmail(listing.host_id, {
            listingTitle: listing.title,
            guestName: guest_name,
            checkIn: check_in_date,
            checkOut: check_out_date,
            totalAmount: total_amount,
            depositAmount: depositAmount
        });

        res.status(201).json({
            status: 'success',
            message: 'Reservation request created successfully',
            data: {
                reservationId,
                listing: listing.title,
                checkIn: check_in_date,
                checkOut: check_out_date,
                totalAmount: total_amount,
                depositAmount: depositAmount,
                remainingAmount: remainingAmount,
                paymentDueDate: paymentDueDate,
                status: 'pending',
                requiresHostApproval: true
            }
        });

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

// Host approve/decline reservation
exports.hostReservationAction = catchAsync(async (req, res, next) => {
    const { id: reservationId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'decline'
    const hostId = req.user.id;

    if (!['approve', 'decline'].includes(action)) {
        return next(new AppError('Invalid action. Must be approve or decline', 400));
    }

    // Verify host owns this reservation's listing
    const [reservations] = await pool.query(`
        SELECT r.*, l.title 
        FROM reservations r
        JOIN listings l ON r.listing_id = l.id
        WHERE r.id = ? AND r.host_id = ?
    `, [reservationId, hostId]);

    if (!reservations.length) {
        return next(new AppError('Reservation not found or unauthorized', 404));
    }

    const reservation = reservations[0];

    if (reservation.status !== 'pending') {
        return next(new AppError('Can only approve/decline pending reservations', 400));
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        if (action === 'approve') {
            // Approve reservation and trigger payment
            await connection.query(
                'UPDATE reservations SET status = "awaiting_payment" WHERE id = ?',
                [reservationId]
            );

            // Create payment intent for deposit
            const paymentIntent = await paymentService.createPaymentIntent({
                bookingId: reservationId,
                clientId: reservation.client_id,
                hostId: reservation.host_id,
                amount: reservation.deposit_amount,
                currency: 'PHP',
                description: `Deposit for reservation #${reservationId}`
            });

            // Update payment schedule
            await connection.query(`
                UPDATE payment_schedules 
                SET payment_intent_id = ?, status = 'pending'
                WHERE reservation_id = ? AND payment_type = 'deposit'
            `, [paymentIntent.paymentIntent.id, reservationId]);

            await connection.commit();

            // Notify client
            await createNotification({
                userId: reservation.client_id,
                message: `Great news! Your reservation for "${reservation.title}" has been approved. Please complete the deposit payment of ₱${reservation.deposit_amount}.`,
                type: 'reservation_approved'
            });

            // Send payment link email
            await emailService.sendReservationApprovedEmail(reservation.guest_email, {
                listingTitle: reservation.title,
                depositAmount: reservation.deposit_amount,
                paymentUrl: paymentIntent.paymentIntent.checkout_url
            });

            res.status(200).json({
                status: 'success',
                message: 'Reservation approved successfully',
                data: {
                    reservationId: parseInt(reservationId),
                    status: 'awaiting_payment',
                    paymentUrl: paymentIntent.paymentIntent.checkout_url,
                    depositAmount: reservation.deposit_amount
                }
            });

        } else {
            // Decline reservation
            await connection.query(`
                UPDATE reservations 
                SET status = 'declined', notes = ?
                WHERE id = ?
            `, [reason || 'Host declined', reservationId]);

            await connection.commit();

            // Notify client
            await createNotification({
                userId: reservation.client_id,
                message: `Your reservation for "${reservation.title}" has been declined. ${reason ? `Reason: ${reason}` : ''}`,
                type: 'reservation_declined'
            });

            res.status(200).json({
                status: 'success',
                message: 'Reservation declined',
                data: {
                    reservationId: parseInt(reservationId),
                    status: 'declined'
                }
            });
        }

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

// Process deposit payment confirmation
exports.confirmDepositPayment = catchAsync(async (req, res, next) => {
    const { reservationId, paymentIntentId } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Update reservation status
        await connection.query(`
            UPDATE reservations 
            SET status = 'confirmed', deposit_paid = TRUE
            WHERE id = ?
        `, [reservationId]);

        // Update payment schedule
        await connection.query(`
            UPDATE payment_schedules 
            SET status = 'paid', paid_date = NOW()
            WHERE reservation_id = ? AND payment_type = 'deposit'
        `, [reservationId]);

        await connection.commit();

        // Get reservation details
        const [reservation] = await pool.query(
            'SELECT * FROM reservations WHERE id = ?',
            [reservationId]
        );

        // Schedule reminder for remaining payment
        await schedulePaymentReminder(reservationId, reservation[0].payment_due_date);

        res.status(200).json({
            status: 'success',
            message: 'Deposit payment confirmed',
            data: {
                reservationId,
                remainingAmount: reservation[0].remaining_amount,
                paymentDueDate: reservation[0].payment_due_date
            }
        });

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

// Cancel reservation with refund calculation
exports.cancelReservation = catchAsync(async (req, res, next) => {
    const { id: reservationId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get reservation details
    const [reservations] = await pool.query(
        'SELECT * FROM reservations WHERE id = ?',
        [reservationId]
    );

    if (!reservations.length) {
        return next(new AppError('Reservation not found', 404));
    }

    const reservation = reservations[0];

    // Check authorization
    const canCancel = reservation.client_id === userId || 
                     reservation.host_id === userId || 
                     userRole === 'admin';

    if (!canCancel) {
        return next(new AppError('Not authorized to cancel this reservation', 403));
    }

    // Calculate refund
    const refundDetails = await calculateCancellationRefund(reservation);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Update reservation
        await connection.query(`
            UPDATE reservations 
            SET status = 'cancelled',
                cancellation_fee = ?,
                refund_amount = ?,
                cancelled_by = ?,
                cancellation_reason = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            refundDetails.cancellationFee,
            refundDetails.refundAmount,
            userRole,
            reason || 'User requested cancellation',
            reservationId
        ]);

        // Process refund if payment was made
        if (reservation.deposit_paid && refundDetails.refundAmount > 0) {
            // Create refund through PayMongo
            const refund = await paymentService.createRefund(
                reservation.payment_intent_id,
                'requested_by_customer',
                refundDetails.refundAmount
            );

            // Log refund transaction
            await connection.query(`
                INSERT INTO refund_transactions (
                    reservation_id, amount, cancellation_fee, 
                    refund_id, status, created_at
                ) VALUES (?, ?, ?, ?, 'processing', NOW())
            `, [
                reservationId,
                refundDetails.refundAmount,
                refundDetails.cancellationFee,
                refund.id
            ]);
        }

        await connection.commit();

        // Send notifications
        if (userRole === 'client') {
            await createNotification({
                userId: reservation.host_id,
                message: `Reservation for your listing has been cancelled by the guest.`,
                type: 'reservation_cancelled'
            });
        } else if (userRole === 'host') {
            await createNotification({
                userId: reservation.client_id,
                message: `Your reservation has been cancelled by the host. ${refundDetails.refundAmount > 0 ? `Refund of ₱${refundDetails.refundAmount} is being processed.` : ''}`,
                type: 'reservation_cancelled'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Reservation cancelled successfully',
            data: {
                reservationId: parseInt(reservationId),
                cancellationDetails: {
                    daysUntilCheckIn: refundDetails.daysUntilCheckIn,
                    refundPercentage: refundDetails.refundPercentage,
                    cancellationFee: refundDetails.cancellationFee,
                    refundAmount: refundDetails.refundAmount,
                    paidAmount: refundDetails.paidAmount
                }
            }
        });

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

// Process remaining payment
exports.processRemainingPayment = catchAsync(async (req, res, next) => {
    const { reservationId } = req.params;
    const clientId = req.user.id;

    // Verify reservation and authorization
    const [reservations] = await pool.query(
        'SELECT * FROM reservations WHERE id = ? AND client_id = ?',
        [reservationId, clientId]
    );

    if (!reservations.length) {
        return next(new AppError('Reservation not found or unauthorized', 404));
    }

    const reservation = reservations[0];

    if (!reservation.deposit_paid) {
        return next(new AppError('Deposit must be paid first', 400));
    }

    if (reservation.full_amount_paid) {
        return next(new AppError('Full payment already received', 400));
    }

    try {
        // Create payment intent for remaining amount
        const paymentIntent = await paymentService.createPaymentIntent({
            bookingId: reservationId,
            clientId: clientId,
            hostId: reservation.host_id,
            amount: reservation.remaining_amount,
            currency: 'PHP',
            description: `Remaining payment for reservation #${reservationId}`
        });

        res.status(200).json({
            status: 'success',
            message: 'Payment intent created for remaining amount',
            data: {
                reservationId,
                remainingAmount: reservation.remaining_amount,
                paymentUrl: paymentIntent.paymentIntent.checkout_url
            }
        });

    } catch (error) {
        throw error;
    }
});

// Admin: Manage cancellation and refunds
exports.adminManageRefund = catchAsync(async (req, res, next) => {
    const { reservationId, action, adjustedRefundAmount, notes } = req.body;
    const adminId = req.user.id;

    if (req.user.role !== 'admin') {
        return next(new AppError('Admin access required', 403));
    }

    const [reservations] = await pool.query(
        'SELECT * FROM reservations WHERE id = ?',
        [reservationId]
    );

    if (!reservations.length) {
        return next(new AppError('Reservation not found', 404));
    }

    const reservation = reservations[0];

    if (action === 'approve_refund') {
        // Process custom refund amount
        const refundAmount = adjustedRefundAmount || reservation.refund_amount;

        const refund = await paymentService.createRefund(
            reservation.payment_intent_id,
            'admin_approved',
            refundAmount
        );

        await pool.query(`
            UPDATE reservations 
            SET refund_amount = ?, 
                admin_notes = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [refundAmount, notes, reservationId]);

        // Notify client
        await createNotification({
            userId: reservation.client_id,
            message: `Your refund of ₱${refundAmount} has been approved and is being processed.`,
            type: 'refund_approved'
        });

        res.status(200).json({
            status: 'success',
            message: 'Refund approved and processed',
            data: {
                reservationId,
                refundAmount,
                refundId: refund.id
            }
        });

    } else if (action === 'deny_refund') {
        await pool.query(`
            UPDATE reservations 
            SET refund_amount = 0,
                admin_notes = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [notes, reservationId]);

        // Notify client
        await createNotification({
            userId: reservation.client_id,
            message: `Your refund request has been reviewed. ${notes}`,
            type: 'refund_denied'
        });

        res.status(200).json({
            status: 'success',
            message: 'Refund denied',
            data: {
                reservationId,
                notes
            }
        });
    }
});

// Get cancellation policy
exports.getCancellationPolicy = catchAsync(async (req, res, next) => {
    const [policies] = await pool.query(`
        SELECT * FROM cancellation_policies 
        ORDER BY days_before_checkin DESC
    `);

    res.status(200).json({
        status: 'success',
        data: {
            policies,
            serviceFeePercentage: 10
        }
    });
});

// Helper function to schedule payment reminders
async function schedulePaymentReminder(reservationId, dueDate) {
    // This would typically use a job queue like Bull or Agenda
    // For now, we'll create a scheduled task entry
    await pool.query(`
        INSERT INTO scheduled_tasks (
            task_type, reservation_id, scheduled_for, status
        ) VALUES ('payment_reminder', ?, ?, 'pending')
    `, [reservationId, dueDate]);
}

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
        AND status IN ('confirmed', 'pending', 'awaiting_payment')
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

// Get client's reservations
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

    res.status(200).json({
        status: 'success',
        data: {
            reservation
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

    // Get reservation details
    const [reservations] = await pool.query(`
        SELECT r.*, l.title 
        FROM reservations r 
        JOIN listings l ON r.listing_id = l.id 
        WHERE r.id = ?
    `, [id]);

    if (!reservations.length) {
        return next(new AppError('Reservation not found', 404));
    }

    const reservation = reservations[0];

    // Authorization check
    const isHost = reservation.host_id === userId;
    const isClient = reservation.client_id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isClient && !isAdmin) {
        return next(new AppError('Not authorized to update this reservation', 403));
    }

    // Business logic validation
    if (isClient && !['cancelled'].includes(status)) {
        return next(new AppError('Clients can only cancel reservations', 403));
    }

    // Update reservation
    await pool.query(
        'UPDATE reservations SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
    );

    res.status(200).json({
        status: 'success',
        message: `Reservation ${status} successfully`,
        data: {
            reservationId: parseInt(id),
            newStatus: status
        }
    });
});

// Search reservations
exports.searchReservations = catchAsync(async (req, res, next) => {
    const {
        status,
        date_from,
        date_to,
        guest_name,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'DESC'
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereConditions = [];
    let queryParams = [];
    
    // Role-based filtering
    if (userRole === 'client') {
        whereConditions.push('r.client_id = ?');
        queryParams.push(userId);
    } else if (userRole === 'host') {
        whereConditions.push('r.host_id = ?');
        queryParams.push(userId);
    }
    
    // Apply filters
    if (status) {
        whereConditions.push('r.status = ?');
        queryParams.push(status);
    }
    
    if (date_from) {
        whereConditions.push('r.check_in_date >= ?');
        queryParams.push(date_from);
    }
    
    if (date_to) {
        whereConditions.push('r.check_out_date <= ?');
        queryParams.push(date_to);
    }
    
    if (guest_name) {
        whereConditions.push('r.guest_name LIKE ?');
        queryParams.push(`%${guest_name}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? 
        'WHERE ' + whereConditions.join(' AND ') : '';
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryParams.push(parseInt(limit), offset);
    
    const [reservations] = await pool.query(`
        SELECT 
            r.*,
            l.title as listing_title,
            l.location as listing_location,
            DATEDIFF(r.check_out_date, r.check_in_date) as nights
        FROM reservations r
        JOIN listings l ON r.listing_id = l.id
        ${whereClause}
        ORDER BY r.${sort_by} ${sort_order}
        LIMIT ? OFFSET ?
    `, queryParams);
    
    res.status(200).json({
        status: 'success',
        results: reservations.length,
        data: {
            reservations
        }
    });
});

