// controllers/payoutController.js - Enhanced Version with proper error handling
const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const { createNotification } = require('./notificationsController');

exports.releasePayout = catchAsync(async (req, res, next) => {
  const { host_id, booking_id, amount } = req.body;

  const [result] = await pool.query(
    "CALL sp_release_payout(?, ?, ?)",
    [host_id, booking_id, amount]
  );

  res.status(200).json({ 
    message: "Payout released successfully", 
    result: result[0] || [] 
  });
});

// Admin: get all payouts
exports.getAllPayouts = catchAsync(async (req, res, next) => {
  const [rows] = await pool.query("CALL sp_get_all_payouts()");
  
  res.json({ 
    payouts: rows[0] || [] 
  }); 
});

// Host: summary of earnings + detailed payouts (MERGED)
exports.getHostEarnings = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  // Stored procedure returns 2 result sets:
  //   1. Summary with total_earnings
  //   2. List of payouts
  const [results] = await pool.query("CALL sp_get_host_earnings(?)", [hostId]);

  const summary = results[0]?.[0] || { total_earnings: 0 };
  const payouts = results[1] || [];

  res.json({
    totalEarnings: summary.total_earnings,
    payouts
  });
});

// Host: list of received payouts
exports.getReceivedPayoutsByHost = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  const [rows] = await pool.query("CALL sp_get_received_payouts_by_host(?)", [hostId]);
  
  res.json({ 
    payouts: rows[0] || [] 
  });
});

// ==========================================
// ENHANCED FUNCTIONS FOR COMPLETE FLOW
// ==========================================

// Host: Request payout with validation
exports.requestPayout = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { amount, payment_method, bank_details } = req.body;

  // Validate required fields
  if (!amount || !payment_method || !bank_details) {
    return next(new AppError('Amount, payment method, and bank details are required', 400));
  }

  // Check available balance
  const [availableBalance] = await pool.query(`
    SELECT 
      SUM(p.host_earnings) as available
    FROM payments p
    WHERE p.host_id = ? 
      AND p.status = 'succeeded'
      AND p.id NOT IN (
        SELECT payment_id FROM payout_items WHERE payment_id IS NOT NULL
      )
  `, [hostId]);

  const available = availableBalance[0]?.available || 0;

  if (available < amount) {
    return next(new AppError(`Insufficient balance. Available: ₱${available}`, 400));
  }

  if (amount < 500) {
    return next(new AppError('Minimum payout amount is ₱500', 400));
  }

  // Create payout request (status = 'pending')
  const [result] = await pool.query(
    "INSERT INTO payouts (host_id, amount, payment_method, bank_details, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())",
    [hostId, amount, payment_method, JSON.stringify(bank_details)]
  );

  const payoutId = result.insertId;

  // Link eligible payments to this payout
  await pool.query(`
    INSERT INTO payout_items (payout_id, payment_id, amount)
    SELECT 
      ?,
      p.id,
      p.host_earnings
    FROM payments p
    WHERE p.host_id = ? 
      AND p.status = 'succeeded'
      AND p.id NOT IN (
        SELECT payment_id FROM payout_items WHERE payment_id IS NOT NULL
      )
    ORDER BY p.created_at ASC
    LIMIT ?
  `, [payoutId, hostId, Math.ceil(amount / 100)]);

  // Get host details for notifications
  const [hostInfo] = await pool.query(
    'SELECT email, name FROM users WHERE id = ?',
    [hostId]
  );

  // Send notification to host
  try {
    await createNotification({
      userId: hostId,
      message: `Your payout request for ₱${amount.toLocaleString()} has been submitted and is pending approval.`,
      type: 'payout_requested'
    });
  } catch (notifError) {
    console.error('Notification error:', notifError);
  }

  // Send notification to admin
  try {
    // Assuming admin has user ID 1 or you can query for admin users
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        message: `New payout request from ${hostInfo[0]?.name || 'Host'} for ₱${amount.toLocaleString()}`,
        type: 'payout_request_admin'
      });
    }
  } catch (notifError) {
    console.error('Admin notification error:', notifError);
  }

  // Send email to host
  try {
    if (hostInfo[0]?.email) {
      await emailService.sendPayoutRequestEmail(hostInfo[0].email, amount);
    }
  } catch (emailError) {
    console.error('Email error:', emailError);
  }

  res.status(201).json({ 
    status: 'success',
    message: "Payout request submitted successfully", 
    data: {
      payoutId: payoutId,
      amount: amount,
      status: 'pending'
    }
  });
});

// Admin: Approve and process payout
exports.approvePayout = catchAsync(async (req, res, next) => {
  const { payout_id } = req.params;
  const { transaction_ref } = req.body;

  // Check if admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  if (!transaction_ref) {
    return next(new AppError('Transaction reference is required', 400));
  }

  // Get payout details before updating
  const [payoutDetails] = await pool.query(
    'SELECT p.*, u.email, u.name FROM payouts p JOIN users u ON p.host_id = u.id WHERE p.id = ?',
    [payout_id]
  );

  if (!payoutDetails.length) {
    return next(new AppError('Payout not found', 404));
  }

  const payout = payoutDetails[0];

  // Start transaction
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update payout status to processing
    const [updateResult] = await connection.query(
      "UPDATE payouts SET status = 'processing', updated_at = NOW() WHERE id = ? AND status = 'pending'",
      [payout_id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return next(new AppError('Payout not found or already processed', 404));
    }

    // Log the transaction
    await connection.query(
      "INSERT INTO payout_logs (payout_id, action, performed_by, transaction_ref, created_at) VALUES (?, 'approved', ?, ?, NOW())",
      [payout_id, req.user.id, transaction_ref]
    );

    await connection.commit();

    // Send notification to host
    try {
      await createNotification({
        userId: payout.host_id,
        message: `Your payout request for ₱${payout.amount.toLocaleString()} is being processed. Transaction ref: ${transaction_ref}`,
        type: 'payout_processing'
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    // Send email to host
    try {
      if (payout.email) {
        await emailService.sendPayoutProcessingEmail(payout.email, payout.amount, transaction_ref);
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.status(200).json({ 
      status: 'success',
      message: "Payout approved and processing",
      data: {
        payout_id: payout_id
      }
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// Admin: Mark payout as complete after money transfer
exports.completePayout = catchAsync(async (req, res, next) => {
  const { payout_id } = req.params;
  const { proof_url } = req.body;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  // Get payout details before updating
  const [payoutDetails] = await pool.query(
    'SELECT p.*, u.email, u.name FROM payouts p JOIN users u ON p.host_id = u.id WHERE p.id = ?',
    [payout_id]
  );

  if (!payoutDetails.length) {
    return next(new AppError('Payout not found', 404));
  }

  const payout = payoutDetails[0];

  // Update payout to completed
  const [result] = await pool.query(
    "UPDATE payouts SET status = 'completed', proof_url = ?, completed_at = NOW() WHERE id = ? AND status = 'processing'",
    [proof_url, payout_id]
  );

  if (result.affectedRows === 0) {
    return next(new AppError('Payout not found or not in processing status', 404));
  }

  // Log completion
  await pool.query(
    "INSERT INTO payout_logs (payout_id, action, performed_by, created_at) VALUES (?, 'completed', ?, NOW())",
    [payout_id, req.user.id]
  );

  // Send notification to host
  try {
    await createNotification({
      userId: payout.host_id,
      message: `Your payout of ₱${payout.amount.toLocaleString()} has been completed and sent to your account.`,
      type: 'payout_completed'
    });
  } catch (notifError) {
    console.error('Notification error:', notifError);
  }

  // Send email to host
  try {
    if (payout.email) {
      await emailService.sendPayoutCompletedEmail(payout.email, payout.amount);
    }
  } catch (emailError) {
    console.error('Email error:', emailError);
  }

  res.status(200).json({ 
    status: 'success',
    message: "Payout completed successfully",
    data: {
      payout_id: payout_id
    }
  });
});

// Admin: Reject payout
exports.rejectPayout = catchAsync(async (req, res, next) => {
  const { payout_id, reason } = req.body;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  if (!payout_id || !reason) {
    return next(new AppError('Payout ID and rejection reason are required', 400));
  }

  // Get payout details before updating
  const [payoutDetails] = await pool.query(
    'SELECT p.*, u.email, u.name FROM payouts p JOIN users u ON p.host_id = u.id WHERE p.id = ?',
    [payout_id]
  );

  if (!payoutDetails.length) {
    return next(new AppError('Payout not found', 404));
  }

  const payout = payoutDetails[0];

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update payout status
    const [updateResult] = await connection.query(
      "UPDATE payouts SET status = 'rejected', rejection_reason = ?, updated_at = NOW() WHERE id = ? AND status = 'pending'",
      [reason, payout_id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return next(new AppError('Payout not found or already processed', 404));
    }

    // Remove payment links so they become available again
    await connection.query(
      "DELETE FROM payout_items WHERE payout_id = ?",
      [payout_id]
    );

    // Log rejection
    await connection.query(
      "INSERT INTO payout_logs (payout_id, action, performed_by, notes, created_at) VALUES (?, 'rejected', ?, ?, NOW())",
      [payout_id, req.user.id, reason]
    );

    await connection.commit();

    // Send notification to host
    try {
      await createNotification({
        userId: payout.host_id,
        message: `Your payout request for ₱${payout.amount.toLocaleString()} has been rejected. Reason: ${reason}`,
        type: 'payout_rejected'
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    // Send email to host
    try {
      if (payout.email) {
        await emailService.sendPayoutRejectedEmail(payout.email, payout.amount, reason);
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.status(200).json({ 
      status: 'success',
      message: "Payout rejected successfully"
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// Host: Get available balance for payout
exports.getAvailableBalance = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  const [balance] = await pool.query(`
    SELECT 
      COUNT(p.id) as total_bookings,
      SUM(p.host_earnings) as total_earned,
      SUM(CASE 
        WHEN p.id NOT IN (SELECT payment_id FROM payout_items WHERE payment_id IS NOT NULL) 
        THEN p.host_earnings 
        ELSE 0 
      END) as available_for_payout,
      SUM(CASE 
        WHEN pi.payout_id IS NOT NULL AND po.status = 'pending'
        THEN p.host_earnings 
        ELSE 0 
      END) as pending_payout,
      SUM(CASE 
        WHEN po.status = 'completed'
        THEN p.host_earnings 
        ELSE 0 
      END) as total_withdrawn
    FROM payments p
    LEFT JOIN payout_items pi ON p.id = pi.payment_id
    LEFT JOIN payouts po ON pi.payout_id = po.id
    WHERE p.host_id = ? AND p.status = 'succeeded'
  `, [hostId]);

  res.json({
    status: 'success',
    data: {
      balance: balance[0] || {
        total_bookings: 0,
        total_earned: 0,
        available_for_payout: 0,
        pending_payout: 0,
        total_withdrawn: 0
      }
    }
  });
});

// Admin: Get payout statistics
exports.getPayoutStats = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  const [stats] = await pool.query(`
    SELECT 
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_paid_out
    FROM payouts
  `);

  res.json({
    status: 'success',
    data: {
      stats: stats[0] || {}
    }
  });
});