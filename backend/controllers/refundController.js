// backend/controllers/refundController.js
const pool = require('../db');
const paymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const { createNotification } = require('./notificationsController');

// ==========================================
// CLIENT: Request Refund (after cancellation)
// ==========================================
exports.requestRefund = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;
  const { bookingId, reason } = req.body;

  if (!bookingId || !reason) {
    return next(new AppError('Booking ID and reason are required', 400));
  }

  // Get booking details
  const [bookings] = await pool.query(`
    SELECT 
      b.*,
      l.title,
      l.host_id,
      p.payment_intent_id,
      p.amount as paid_amount,
      p.status as payment_status
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE b.id = ? AND b.client_id = ?
  `, [bookingId, clientId]);

  if (!bookings.length) {
    return next(new AppError('Booking not found or unauthorized', 404));
  }

  const booking = bookings[0];

  // Validate booking is cancelled
  if (booking.status !== 'cancelled') {
    return next(new AppError('Only cancelled bookings can request refunds', 400));
  }

  // Check if payment was made
  if (!booking.payment_intent_id || booking.payment_status !== 'succeeded') {
    return next(new AppError('No valid payment found for this booking', 400));
  }

  // Check if refund already exists
  const [existingRefund] = await pool.query(
    'SELECT id, status FROM refunds WHERE booking_id = ?',
    [bookingId]
  );

  if (existingRefund.length > 0) {
    return next(new AppError(`Refund already ${existingRefund[0].status}`, 400));
  }

  // Calculate refund amount based on booking type
  let refundAmount = 0;
  
  if (booking.booking_type === 'reserve') {
    // For reservations, refund the deposit if it was paid
    if (booking.deposit_paid === 1) {
      refundAmount = booking.deposit_amount;
    }
  } else {
    // For full bookings, refund the full amount
    refundAmount = booking.total_price;
  }

  if (refundAmount <= 0) {
    return next(new AppError('No refundable amount for this booking', 400));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Create refund request
    const [result] = await connection.query(`
      INSERT INTO refunds (
        booking_id, 
        amount, 
        status, 
        reason, 
        payment_intent_id,
        requested_by,
        created_at
      ) VALUES (?, ?, 'pending', ?, ?, ?, NOW())
    `, [bookingId, refundAmount, reason, booking.payment_intent_id, clientId]);

    const refundId = result.insertId;

    await connection.commit();

    // Notify admins
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        message: `New refund request from client for booking #${bookingId}. Amount: ₱${refundAmount}. Reason: ${reason}`,
        type: 'refund_request'
      });
    }

    // Notify client
    await createNotification({
      userId: clientId,
      message: `Your refund request of ₱${refundAmount} for "${booking.title}" has been submitted and is pending admin approval.`,
      type: 'refund_requested'
    });

    res.status(201).json({
      status: 'success',
      message: 'Refund request submitted successfully',
      data: {
        refundId,
        bookingId: parseInt(bookingId),
        amount: refundAmount,
        status: 'pending',
        estimatedProcessingTime: '2-5 business days'
      }
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// ==========================================
// CLIENT: Get My Refund Requests
// ==========================================
exports.getMyRefunds = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;
  const { status } = req.query;

  let whereClause = 'b.client_id = ?';
  const queryParams = [clientId];

  if (status && ['pending', 'processing', 'completed', 'rejected'].includes(status)) {
    whereClause += ' AND r.status = ?';
    queryParams.push(status);
  }

  const [refunds] = await pool.query(`
    SELECT 
      r.*,
      b.booking_type,
      b.total_price,
      b.start_date,
      b.end_date,
      l.title as listing_title,
      l.location as listing_location,
      a.name as processed_by_name
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    LEFT JOIN users a ON r.processed_by = a.id
    WHERE ${whereClause}
    ORDER BY r.created_at DESC
  `, queryParams);

  res.status(200).json({
    status: 'success',
    results: refunds.length,
    data: { refunds }
  });
});

// ==========================================
// ADMIN: Get All Refund Requests
// ==========================================
exports.getAllRefundRequests = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  const { page = 1, limit = 50, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = '1=1';
  const queryParams = [];

  if (status && ['pending', 'processing', 'completed', 'rejected'].includes(status)) {
    whereClause += ' AND r.status = ?';
    queryParams.push(status);
  }

  queryParams.push(parseInt(limit), offset);

  const [refunds] = await pool.query(`
    SELECT 
      r.*,
      b.booking_type,
      b.total_price,
      b.deposit_amount,
      b.remaining_amount,
      b.start_date,
      b.end_date,
      b.status as booking_status,
      l.title as listing_title,
      l.location as listing_location,
      uc.name as client_name,
      uc.email as client_email,
      uh.name as host_name,
      a.name as processed_by_name
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    JOIN users uc ON b.client_id = uc.id
    JOIN users uh ON l.host_id = uh.id
    LEFT JOIN users a ON r.processed_by = a.id
    WHERE ${whereClause}
    ORDER BY 
      CASE r.status 
        WHEN 'pending' THEN 1 
        WHEN 'processing' THEN 2 
        ELSE 3 
      END,
      r.created_at DESC
    LIMIT ? OFFSET ?
  `, queryParams);

  // Get counts
  const [stats] = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_refunded
    FROM refunds
  `);

  res.status(200).json({
    status: 'success',
    results: refunds.length,
    data: {
      refunds,
      statistics: stats[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats[0].total
      }
    }
  });
});

// ==========================================
// ADMIN: Process Refund (Approve & Execute)
// ==========================================
exports.processRefund = catchAsync(async (req, res, next) => {
  const { refundId } = req.params;
  const { action, notes } = req.body; // action: 'approve' or 'reject'
  const adminId = req.user.id;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  if (!['approve', 'reject'].includes(action)) {
    return next(new AppError('Action must be "approve" or "reject"', 400));
  }

  // Get refund details
  const [refunds] = await pool.query(`
    SELECT 
      r.*,
      b.client_id,
      b.booking_type,
      l.title,
      l.host_id
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    WHERE r.id = ?
  `, [refundId]);

  if (!refunds.length) {
    return next(new AppError('Refund request not found', 404));
  }

  const refund = refunds[0];

  if (refund.status !== 'pending') {
    return next(new AppError(`Refund is already ${refund.status}`, 400));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (action === 'reject') {
      // Reject the refund
      await connection.query(`
        UPDATE refunds 
        SET status = 'rejected',
            processed_by = ?,
            notes = ?,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [adminId, notes || 'Rejected by admin', refundId]);

      await connection.commit();

      // Notify client
      await createNotification({
        userId: refund.client_id,
        message: `Your refund request of ₱${refund.amount} has been rejected. ${notes ? 'Reason: ' + notes : ''}`,
        type: 'refund_rejected'
      });

      return res.status(200).json({
        status: 'success',
        message: 'Refund request rejected',
        data: { refundId: parseInt(refundId), status: 'rejected' }
      });
    }

    // APPROVE: Process refund with PayMongo
    await connection.query(`
      UPDATE refunds 
      SET status = 'processing',
          processed_by = ?,
          notes = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [adminId, notes || 'Processing refund via PayMongo', refundId]);

    await connection.commit();

    // Process refund through PayMongo
    try {
      console.log(`🔄 Processing PayMongo refund for ${refund.amount}...`);
      
      const paymongoRefund = await paymentService.createRefund(
        refund.payment_intent_id,
        'requested_by_customer',
        refund.amount
      );

      // Update refund with PayMongo refund ID
      await pool.query(`
        UPDATE refunds 
        SET status = 'completed',
            paymongo_refund_id = ?,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [paymongoRefund.id, refundId]);

      console.log(`✅ Refund completed: ${paymongoRefund.id}`);

      // Notify client
      await createNotification({
        userId: refund.client_id,
        message: `✅ Your refund of ₱${refund.amount} for "${refund.title}" has been processed successfully. Funds will appear in your account within 5-10 business days.`,
        type: 'refund_completed'
      });

      // Notify host
      await createNotification({
        userId: refund.host_id,
        message: `A refund of ₱${refund.amount} has been processed for cancelled booking "${refund.title}".`,
        type: 'refund_processed'
      });

      res.status(200).json({
        status: 'success',
        message: 'Refund processed successfully via PayMongo',
        data: {
          refundId: parseInt(refundId),
          amount: refund.amount,
          paymongoRefundId: paymongoRefund.id,
          status: 'completed',
          processedAt: new Date().toISOString()
        }
      });

    } catch (paymongoError) {
      console.error('❌ PayMongo refund failed:', paymongoError);

      // Mark as failed in database
      await pool.query(`
        UPDATE refunds 
        SET status = 'failed',
            notes = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [`PayMongo error: ${paymongoError.message}`, refundId]);

      // Notify client about failure
      await createNotification({
        userId: refund.client_id,
        message: `❌ Refund processing failed. Our team has been notified and will resolve this manually. Refund ID: ${refundId}`,
        type: 'refund_failed'
      });

      return next(new AppError('Refund processing failed. Please try again or contact support.', 500));
    }

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// ==========================================
// ADMIN: Get Refund Details
// ==========================================
exports.getRefundDetails = catchAsync(async (req, res, next) => {
  const { refundId } = req.params;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  const [refunds] = await pool.query(`
    SELECT 
      r.*,
      b.booking_type,
      b.total_price,
      b.deposit_amount,
      b.remaining_amount,
      b.deposit_paid,
      b.remaining_paid,
      b.start_date,
      b.end_date,
      b.status as booking_status,
      b.cancellation_reason,
      l.title as listing_title,
      l.location as listing_location,
      l.image_url,
      uc.name as client_name,
      uc.email as client_email,
      uc.phone as client_phone,
      uh.name as host_name,
      uh.email as host_email,
      a.name as processed_by_name,
      p.amount as payment_amount,
      p.platform_fee,
      p.host_earnings
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    JOIN users uc ON b.client_id = uc.id
    JOIN users uh ON l.host_id = uh.id
    LEFT JOIN users a ON r.processed_by = a.id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE r.id = ?
  `, [refundId]);

  if (!refunds.length) {
    return next(new AppError('Refund not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { refund: refunds[0] }
  });
});