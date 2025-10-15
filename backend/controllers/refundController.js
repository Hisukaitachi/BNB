// backend/controllers/refundController.js - UPDATED WITH payment_id support
const pool = require('../db');
const refundService = require('../services/refundService');
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

  // Get booking details with payment info
  const [bookings] = await pool.query(`
    SELECT 
      b.*,
      l.title,
      l.host_id,
      p.payment_intent_id,
      p.payment_id,
      p.amount as paid_amount,
      p.status as payment_status
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'succeeded'
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

  // Check if refund already exists
  const [existingRefund] = await pool.query(
    'SELECT id, status FROM refunds WHERE booking_id = ?',
    [bookingId]
  );

  if (existingRefund.length > 0) {
    return next(new AppError(`Refund request already ${existingRefund[0].status}`, 400));
  }

  // Calculate total amount paid via platform (PayMongo)
  let totalPaidPlatform = 0;
  let totalPaidPersonal = 0;
  let paymentIntentIds = [];
  let paymentIds = []; // ✅ NEW: Store payment_id (pay_xxx)
  
  if (booking.booking_type === 'reserve') {
    // For reservations - check what was paid
    if (booking.deposit_paid === 1) {
      totalPaidPlatform += booking.deposit_amount;
      if (booking.payment_intent_id) {
        paymentIntentIds.push(booking.payment_intent_id);
      }
      if (booking.payment_id) {
        paymentIds.push(booking.payment_id); // ✅ NEW
      }
    }
    
    if (booking.remaining_paid === 1) {
      if (booking.remaining_payment_method === 'platform') {
        // Remaining paid via platform
        totalPaidPlatform += booking.remaining_amount;
        
        // Get remaining payment details
        const [remainingPayment] = await pool.query(
          `SELECT payment_intent_id, payment_id FROM payments 
           WHERE booking_id = ? AND status = 'succeeded' 
           AND payment_intent_id != ? 
           ORDER BY created_at DESC LIMIT 1`,
          [bookingId, booking.payment_intent_id || '']
        );
        
        if (remainingPayment.length > 0) {
          if (remainingPayment[0].payment_intent_id) {
            paymentIntentIds.push(remainingPayment[0].payment_intent_id);
          }
          if (remainingPayment[0].payment_id) {
            paymentIds.push(remainingPayment[0].payment_id); // ✅ NEW
          }
        }
      } else {
        // Remaining paid via personal (cash/bank)
        totalPaidPersonal += booking.remaining_amount;
      }
    }
  } else {
    // For 'book' type - full payment via platform
    totalPaidPlatform = booking.total_price;
    if (booking.payment_intent_id) {
      paymentIntentIds.push(booking.payment_intent_id);
    }
    if (booking.payment_id) {
      paymentIds.push(booking.payment_id); // ✅ NEW
    }
  }

  const totalPaid = totalPaidPlatform + totalPaidPersonal;

  if (totalPaid <= 0) {
    return next(new AppError('No payment has been made for this booking', 400));
  }

  // Calculate refund with deductions using refund service
  const refundCalculation = refundService.calculateRefundAmount(
    totalPaid,
    booking.start_date,
    booking.updated_at || new Date()
  );

  // Calculate platform and personal refund amounts proportionally
  const platformRefundAmount = totalPaidPlatform > 0 
    ? Math.round((totalPaidPlatform / totalPaid) * refundCalculation.refundAmount * 100) / 100
    : 0;
    
  const personalRefundAmount = totalPaidPersonal > 0
    ? Math.round((totalPaidPersonal / totalPaid) * refundCalculation.refundAmount * 100) / 100
    : 0;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ✅ UPDATED: Now storing both payment_intent_ids AND payment_ids
    const [result] = await connection.query(`
      INSERT INTO refunds (
        booking_id, 
        amount_paid,
        platform_paid,
        personal_paid,
        refund_amount,
        platform_refund,
        personal_refund,
        deduction_amount,
        refund_percentage,
        hours_before_checkin,
        policy_applied,
        status, 
        reason, 
        payment_intent_ids,
        payment_ids,
        requested_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())
    `, [
      bookingId,
      refundCalculation.totalPaid,
      totalPaidPlatform,
      totalPaidPersonal,
      refundCalculation.refundAmount,
      platformRefundAmount,
      personalRefundAmount,
      refundCalculation.deductedAmount,
      refundCalculation.refundPercentage,
      refundCalculation.hoursUntilCheckIn,
      refundCalculation.policyApplied,
      reason,
      JSON.stringify(paymentIntentIds),
      JSON.stringify(paymentIds), // ✅ NEW
      clientId
    ]);

    const refundId = result.insertId;

    await connection.commit();

    // Notify admins
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        message: `New refund request #${refundId} for booking #${bookingId}. Total paid: ₱${refundCalculation.totalPaid}, Refund: ₱${refundCalculation.refundAmount} (${refundCalculation.refundPercentage}%), Deduction: ₱${refundCalculation.deductedAmount}. ${totalPaidPersonal > 0 ? `Includes ₱${personalRefundAmount} personal payment refund.` : ''}`,
        type: 'refund_request'
      });
    }

    // Notify client
    await createNotification({
      userId: clientId,
      message: `Your refund request for "${booking.title}" has been submitted. Total paid: ₱${refundCalculation.totalPaid}. Refund amount: ₱${refundCalculation.refundAmount} (${refundCalculation.refundPercentage}%). Cancellation fee: ₱${refundCalculation.deductedAmount}. ${refundCalculation.policyApplied}. Pending admin approval.`,
      type: 'refund_requested'
    });

    res.status(201).json({
      status: 'success',
      message: 'Refund request submitted successfully',
      data: {
        refundId,
        bookingId: parseInt(bookingId),
        breakdown: {
          totalPaid: refundCalculation.totalPaid,
          platformPaid: totalPaidPlatform,
          personalPaid: totalPaidPersonal,
          refundAmount: refundCalculation.refundAmount,
          platformRefund: platformRefundAmount,
          personalRefund: personalRefundAmount,
          deductionAmount: refundCalculation.deductedAmount,
          refundPercentage: refundCalculation.refundPercentage,
          hoursBeforeCheckIn: refundCalculation.hoursUntilCheckIn,
          policyApplied: refundCalculation.policyApplied
        },
        status: 'pending'
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
      b.remaining_payment_method,
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
      b.remaining_payment_method,
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
      SUM(CASE WHEN status = 'completed' THEN refund_amount ELSE 0 END) as total_refunded,
      SUM(CASE WHEN status = 'completed' THEN deduction_amount ELSE 0 END) as total_deductions
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
  const { action, notes, customRefundAmount } = req.body;
  const adminId = req.user.id;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  if (!['approve', 'reject'].includes(action)) {
    return next(new AppError('Action must be "approve" or "reject"', 400));
  }

  // ✅ UPDATED: Get both payment_intent_ids AND payment_ids
  const [refunds] = await pool.query(`
    SELECT 
      r.*,
      b.client_id,
      b.booking_type,
      b.start_date,
      b.remaining_payment_method,
      l.title,
      l.host_id,
      u.name as client_name,
      u.email as client_email
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    JOIN users u ON b.client_id = u.id
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

    // REJECT
    if (action === 'reject') {
      await connection.query(`
        UPDATE refunds 
        SET status = 'rejected',
            processed_by = ?,
            admin_notes = ?,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [adminId, notes || 'Rejected by admin', refundId]);

      await connection.commit();

      await createNotification({
        userId: refund.client_id,
        message: `Your refund request of ₱${refund.refund_amount} has been rejected. ${notes ? 'Reason: ' + notes : ''}`,
        type: 'refund_rejected'
      });

      return res.status(200).json({
        status: 'success',
        message: 'Refund request rejected',
        data: { 
          refundId: parseInt(refundId), 
          status: 'rejected',
          reason: notes
        }
      });
    }

    // APPROVE - Calculate amounts
    let finalPlatformRefund = refund.platform_refund;
    let finalPersonalRefund = refund.personal_refund;
    let finalTotalRefund = finalPlatformRefund + finalPersonalRefund;

    if (customRefundAmount) {
      const platformRatio = refund.platform_paid / refund.amount_paid;
      finalPlatformRefund = Math.round(customRefundAmount * platformRatio * 100) / 100;
      finalPersonalRefund = Math.round((customRefundAmount - finalPlatformRefund) * 100) / 100;
      finalTotalRefund = customRefundAmount;
    }

    if (finalTotalRefund > refund.amount_paid) {
      return next(new AppError('Refund amount cannot exceed amount paid', 400));
    }

    // Update refund amounts
    await connection.query(`
      UPDATE refunds 
      SET refund_amount = ?,
          platform_refund = ?,
          personal_refund = ?,
          processed_by = ?,
          admin_notes = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      finalTotalRefund,
      finalPlatformRefund,
      finalPersonalRefund,
      adminId, 
      notes || 'Approved - creating refund intent', 
      refundId
    ]);

    await connection.commit();

    // If platform refund exists, create refund intent using refund service
    if (finalPlatformRefund > 0) {
      const paymentIntentIds = JSON.parse(refund.payment_intent_ids || '[]');
      const paymentIds = JSON.parse(refund.payment_ids || '[]'); // ✅ NEW

      if (paymentIntentIds.length === 0 && paymentIds.length === 0) {
        throw new Error('No payment IDs found for platform refund');
      }

      // ✅ UPDATED: Pass both payment_intent_ids AND payment_ids
      const refundIntent = await refundService.createRefundIntent({
        refundId: parseInt(refundId),
        bookingId: refund.booking_id,
        clientId: refund.client_id,
        paymentIntentIds,
        paymentIds, // ✅ NEW
        refundAmount: finalPlatformRefund,
        reason: `Refund for booking cancellation. ${notes || ''}`
      });

      // Update refund with refund intent ID
      await pool.query(`
        UPDATE refunds 
        SET refund_intent_id = ?,
            status = 'approved',
            updated_at = NOW()
        WHERE id = ?
      `, [refundIntent.refundIntentId, refundId]);

      // Notify client
      await createNotification({
        userId: refund.client_id,
        message: `✅ Your refund of ₱${finalTotalRefund} has been approved and will be processed immediately!`,
        type: 'refund_approved'
      });

      // If personal refund also exists
      if (finalPersonalRefund > 0) {
        await createNotification({
          userId: refund.client_id,
          message: `Personal payment refund of ₱${finalPersonalRefund} will be processed manually. Our team will contact you.`,
          type: 'refund_manual_notice'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Refund approved - proceed to confirmation',
        data: {
          refundId: parseInt(refundId),
          refundIntentId: refundIntent.refundIntentId,
          approvalUrl: refundIntent.approvalUrl,
          refundBreakdown: {
            total: finalTotalRefund,
            platform: finalPlatformRefund,
            personal: finalPersonalRefund,
            deduction: refund.amount_paid - finalTotalRefund
          },
          requiresConfirmation: true,
          requiresManualProcessing: finalPersonalRefund > 0
        }
      });

    } else {
      // Only personal refund - mark as manual review
      await pool.query(`
        UPDATE refunds 
        SET status = 'manual_review',
            updated_at = NOW()
        WHERE id = ?
      `, [refundId]);

      await createNotification({
        userId: refund.client_id,
        message: `✅ Your refund of ₱${finalPersonalRefund} has been approved! Our team will contact you to arrange the refund.`,
        type: 'refund_approved'
      });

      res.status(200).json({
        status: 'success',
        message: 'Refund approved for manual processing',
        data: {
          refundId: parseInt(refundId),
          refundAmount: finalPersonalRefund,
          status: 'manual_review',
          requiresManualProcessing: true
        }
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('❌ Refund approval error:', error);
    return next(new AppError(`Refund approval failed: ${error.message}`, 500));
  } finally {
    connection.release();
  }
});

// ==========================================
// ADMIN: Confirm and Process Refund Intent
// ==========================================
exports.confirmRefundIntent = catchAsync(async (req, res, next) => {
  const { refundIntentId } = req.params;
  const adminId = req.user.id;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  try {
    // 1️⃣ Check current refund intent status
    const [refundIntents] = await pool.query(
      `SELECT id, refund_id, booking_id, client_id, refund_amount, status, payment_intent_ids, payment_ids 
       FROM refund_intents 
       WHERE id = ?`,
      [refundIntentId]
    );

    if (!refundIntents.length) {
      return next(new AppError('Refund intent not found', 404));
    }

    const refundIntent = refundIntents[0];

    // Prevent re-processing if already succeeded
    if (refundIntent.status === 'succeeded' || refundIntent.status === 'completed') {
      return res.status(200).json({
        status: 'success',
        message: 'Refund already completed',
        data: { refundIntentId: parseInt(refundIntentId), status: refundIntent.status }
      });
    }

    // Handle previously failed intents
    if (refundIntent.status === 'failed') {
      console.warn(`⚠️ Refund intent ${refundIntentId} previously failed. Creating a new one...`);

      // 2️⃣ Get parent refund
      const [refunds] = await pool.query(
        `SELECT r.id, r.booking_id, b.client_id, r.platform_refund, r.payment_intent_ids, r.payment_ids
         FROM refunds r
         JOIN bookings b ON r.booking_id = b.id
         WHERE r.id = ?`,
        [refundIntent.refund_id]
      );

      if (!refunds.length) {
        return next(new AppError('Parent refund not found', 404));
      }

      const refund = refunds[0];

      // Create a fresh refund intent using refund service
      const paymentIntentIds = JSON.parse(refund.payment_intent_ids || '[]');
      const paymentIds = JSON.parse(refund.payment_ids || '[]'); // ✅ NEW
      
      const newRefundIntent = await refundService.createRefundIntent({
        refundId: refund.id,
        bookingId: refund.booking_id,
        clientId: refund.client_id,
        paymentIntentIds,
        paymentIds, // ✅ NEW
        refundAmount: refund.platform_refund,
        reason: 'Retrying failed refund intent'
      });

      await pool.query(
        `UPDATE refunds 
         SET refund_intent_id = ?, status = 'approved', updated_at = NOW() 
         WHERE id = ?`,
        [newRefundIntent.refundIntentId, refund.id]
      );

      return res.status(200).json({
        status: 'retry_created',
        message: 'Previous refund intent failed; new refund intent created for retry.',
        data: {
          oldRefundIntentId: refundIntentId,
          newRefundIntentId: newRefundIntent.refundIntentId,
          approvalUrl: newRefundIntent.approvalUrl
        }
      });
    }

    // 3️⃣ Process normally if pending using refund service
    const result = await refundService.processRefundIntent(refundIntentId);

    // Check if refund actually succeeded
    if (result.status === 'failed') {
      // Mark refund as FAILED, not completed
      await pool.query(
        `UPDATE refunds 
         SET status = 'failed', 
             admin_notes = CONCAT(IFNULL(admin_notes, ''), '\nRefund processing failed: ', ?),
             updated_at = NOW()
         WHERE id = ?`,
        [result.message || 'PayMongo refund failed', refundIntent.refund_id]
      );

      // Notify client about failure
      const [refunds] = await pool.query(
        `SELECT r.*, b.client_id, l.title, l.host_id
         FROM refunds r
         JOIN bookings b ON r.booking_id = b.id
         JOIN listings l ON b.listing_id = l.id
         WHERE r.id = ?`,
        [refundIntent.refund_id]
      );

      if (refunds.length > 0) {
        const refund = refunds[0];
        await createNotification({
          userId: refund.client_id,
          message: `⚠️ Refund processing failed for "${refund.title}". Please contact support for assistance.`,
          type: 'refund_failed'
        });
      }

      return res.status(400).json({
        status: 'error',
        message: result.message || 'Refund processing failed',
        data: {
          refundId: refundIntent.refund_id,
          refundIntentId: parseInt(refundIntentId),
          status: 'failed'
        }
      });
    }

    // ✅ Refund succeeded - continue with normal flow
    const [refunds] = await pool.query(
      `SELECT r.*, b.client_id, l.title, l.host_id
       FROM refunds r
       JOIN bookings b ON r.booking_id = b.id
       JOIN listings l ON b.listing_id = l.id
       WHERE r.id = ?`,
      [refundIntent.refund_id]
    );

    const refund = refunds[0];
    const hasPersonalRefund = refund.personal_refund > 0;
    const finalStatus = hasPersonalRefund ? 'partial_completed' : 'completed';

    await pool.query(
      `UPDATE refunds 
       SET status = ?, paymongo_refund_ids = ?, processed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [finalStatus, JSON.stringify(result.paymongoResults), refund.id]
    );

    // Notify client + host
    await createNotification({
      userId: refund.client_id,
      message: hasPersonalRefund
        ? `✅ Platform refund of ₱${refund.platform_refund} has been processed! Personal refund of ₱${refund.personal_refund} will be processed manually.`
        : `✅ Your refund of ₱${refund.refund_amount} for "${refund.title}" has been processed successfully!`,
      type: 'refund_completed'
    });

    await createNotification({
      userId: refund.host_id,
      message: `Refund of ₱${refund.refund_amount} processed for cancelled booking "${refund.title}".`,
      type: 'refund_processed'
    });

    res.status(200).json({
      status: 'success',
      message: 'Refund processed successfully via PayMongo',
      data: {
        refundId: refund.id,
        refundIntentId: parseInt(refundIntentId),
        paymongoResults: result.paymongoResults,
        totalRefunded: result.totalRefunded,
        status: finalStatus
      }
    });
  } catch (error) {
    console.error('❌ Refund processing error:', error);
    
    // Mark as failed in database on error
    try {
      const [refundIntents] = await pool.query(
        'SELECT refund_id FROM refund_intents WHERE id = ?',
        [refundIntentId]
      );
      
      if (refundIntents.length > 0) {
        await pool.query(
          `UPDATE refunds 
           SET status = 'failed', 
               admin_notes = CONCAT(IFNULL(admin_notes, ''), '\nRefund processing error: ', ?),
               updated_at = NOW()
           WHERE id = ?`,
          [error.message, refundIntents[0].refund_id]
        );
      }
    } catch (updateError) {
      console.error('Failed to update refund status:', updateError);
    }
    
    return next(new AppError(`Refund processing failed: ${error.message}`, 500));
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
      b.remaining_payment_method,
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

// ==========================================
// ADMIN: Mark Personal Refund as Completed
// ==========================================
exports.completePersonalRefund = catchAsync(async (req, res, next) => {
  const { refundId } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  const [refunds] = await pool.query(`
    SELECT r.*, b.client_id, l.title
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    WHERE r.id = ?
  `, [refundId]);

  if (!refunds.length) {
    return next(new AppError('Refund not found', 404));
  }

  const refund = refunds[0];

  if (!['partial_completed', 'manual_review'].includes(refund.status)) {
    return next(new AppError('This refund does not require manual completion', 400));
  }

  // Update to completed
  await pool.query(`
    UPDATE refunds 
    SET status = 'completed',
        admin_notes = CONCAT(IFNULL(admin_notes, ''), '\n', 'Manual refund completed: ', ?),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = ?
  `, [notes || 'Personal payment refund processed manually', refundId]);

  // Notify client
  await createNotification({
    userId: refund.client_id,
    message: `✅ Your personal payment refund of ₱${refund.personal_refund} for "${refund.title}" has been completed. ${notes || ''}`,
    type: 'refund_completed'
  });

  res.status(200).json({
    status: 'success',
    message: 'Personal refund marked as completed',
    data: {
      refundId: parseInt(refundId),
      status: 'completed'
    }
  });
});