const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const { createNotification } = require('./notificationsController');

// ==========================================
// PAYOUT FEE CALCULATIONS
// ==========================================

const PAYOUT_FEES = {
  gcash: 15,
  paymaya: 15,
  bank_transfer: 25
};

const MINIMUM_PAYOUT = 100;

function calculatePayoutFee(amount, paymentMethod) {
  return PAYOUT_FEES[paymentMethod] || PAYOUT_FEES.bank_transfer;
}

// ==========================================
// HOST OPERATIONS
// ==========================================

// Host: Request a new payout
exports.requestPayout = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { amount, payment_method, bank_details } = req.body;

  // Validate required fields
  if (!amount || !payment_method || !bank_details) {
    return next(new AppError('Amount, payment method, and bank details are required', 400));
  }

  // Validate minimum amount
  if (amount < MINIMUM_PAYOUT) {
    return next(new AppError(`Minimum payout amount is ₱${MINIMUM_PAYOUT}`, 400));
  }

  // ✅ FIXED: Get total earned EXCLUDING cancelled/rejected bookings
  const [totalData] = await pool.query(`
    SELECT COALESCE(SUM(p.host_earnings), 0) as total_earned
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE p.host_id = ? 
      AND p.status = 'succeeded'
      AND b.status NOT IN ('cancelled', 'rejected')
  `, [hostId]);

  const totalEarned = totalData[0]?.total_earned || 0;

  // Get already requested amount (pending + approved + processing + completed)
  const [requestedData] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total_requested
    FROM payouts
    WHERE host_id = ? 
      AND status IN ('pending', 'approved', 'processing', 'completed')
  `, [hostId]);

  const totalRequested = requestedData[0]?.total_requested || 0;

  // ✅ NEW: Get pending/completed refunds
  const [refundsData] = await pool.query(`
    SELECT COALESCE(SUM(r.platform_refund), 0) as total_refunds
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    WHERE l.host_id = ? 
      AND r.status IN ('pending', 'processing', 'approved', 'completed', 'partial_completed')
  `, [hostId]);

  const totalRefunds = refundsData[0]?.total_refunds || 0;

  // ✅ UPDATED: Calculate available (subtract refunds too)
  const available = totalEarned - totalRequested - totalRefunds;

  // Calculate payout fee
  const payoutFee = calculatePayoutFee(amount, payment_method);
  const netAmount = amount - payoutFee;

  if (available < amount) {
    return next(new AppError(`Insufficient balance. Available: ₱${available.toFixed(2)}, Requested: ₱${amount}`, 400));
  }

  // Create payout request (NO payout_items needed anymore)
  const [result] = await pool.query(
    `INSERT INTO payouts (
      host_id, amount, payment_method, bank_details, 
      status, fee, net_amount, created_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, NOW())`,
    [hostId, amount, payment_method, JSON.stringify(bank_details), payoutFee, netAmount]
  );

  const payoutId = result.insertId;

  // Get host details
  const [hostInfo] = await pool.query(
    'SELECT email, name FROM users WHERE id = ?',
    [hostId]
  );

  // Send notification
  try {
    await createNotification({
      userId: hostId,
      message: `Your payout request for ₱${amount.toLocaleString()} has been submitted and is pending approval.`,
      type: 'payout_requested'
    });

    // Notify admins
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        message: `New payout request from ${hostInfo[0]?.name || 'Host'} for ₱${amount.toLocaleString()}`,
        type: 'payout_request_admin'
      });
    }
  } catch (notifError) {
    console.error('Notification error:', notifError);
  }

  res.status(201).json({ 
    status: 'success',
    message: "Payout request submitted successfully", 
    data: {
      payoutId: payoutId,
      amount: amount,
      fee: payoutFee,
      netAmount: netAmount,
      status: 'pending'
    }
  });
});

// ✅ UPDATED: Host: Get available balance for payout
exports.getAvailableBalance = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  // ✅ FIXED: Get total earned from SUCCEEDED payments, EXCLUDING cancelled/rejected bookings
  const [earningsData] = await pool.query(`
    SELECT COALESCE(SUM(p.host_earnings), 0) as total_earned
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE p.host_id = ? 
      AND p.status = 'succeeded'
      AND b.status NOT IN ('cancelled', 'rejected')
  `, [hostId]);

  const totalEarned = earningsData[0]?.total_earned || 0;

  // Get pending payouts (sum of amounts)
  const [pendingData] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as pending_amount
    FROM payouts
    WHERE host_id = ? 
      AND status IN ('pending', 'approved', 'processing')
  `, [hostId]);

  const pendingPayout = pendingData[0]?.pending_amount || 0;

  // Get completed payouts (sum of amounts)
  const [completedData] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as withdrawn_amount
    FROM payouts
    WHERE host_id = ? 
      AND status = 'completed'
  `, [hostId]);

  const totalWithdrawn = completedData[0]?.withdrawn_amount || 0;

  // ✅ NEW: Get pending/processing refunds
  const [pendingRefundsData] = await pool.query(`
    SELECT COALESCE(SUM(r.platform_refund), 0) as pending_refund_amount
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    WHERE l.host_id = ? 
      AND r.status IN ('pending', 'processing', 'approved')
  `, [hostId]);

  const pendingRefunds = pendingRefundsData[0]?.pending_refund_amount || 0;

  // ✅ NEW: Get completed refunds
  const [completedRefundsData] = await pool.query(`
    SELECT COALESCE(SUM(r.platform_refund), 0) as completed_refund_amount
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    WHERE l.host_id = ? 
      AND r.status IN ('completed', 'partial_completed')
  `, [hostId]);

  const completedRefunds = completedRefundsData[0]?.completed_refund_amount || 0;

  // ✅ UPDATED: Calculate available for payout (subtract refunds)
  const availableForPayout = totalEarned - (pendingPayout + totalWithdrawn + pendingRefunds + completedRefunds);

  // Calculate fees for different methods
  const fees = {};
  Object.keys(PAYOUT_FEES).forEach(method => {
    fees[method] = calculatePayoutFee(availableForPayout > 0 ? availableForPayout : 0, method);
  });

  res.json({
    status: 'success',
    data: {
      balance: {
        total_bookings: 0,
        total_earned: totalEarned,
        available_for_payout: availableForPayout > 0 ? availableForPayout : 0,
        pending_payout: pendingPayout,
        total_withdrawn: totalWithdrawn,
        pending_refunds: pendingRefunds, // ✅ NEW
        completed_refunds: completedRefunds, // ✅ NEW
        estimated_fees: fees,
        minimum_payout: MINIMUM_PAYOUT
      }
    }
  });
});

// ✅ UPDATED: Host: Get earnings summary
exports.getHostEarnings = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  // ✅ FIXED: Get summary - ONLY succeeded payments from non-cancelled bookings
  const [summary] = await pool.query(`
    SELECT 
      SUM(p.host_earnings) as total_earnings,
      COUNT(DISTINCT b.id) as total_bookings
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE p.host_id = ? 
      AND p.status = 'succeeded'
      AND b.status NOT IN ('cancelled', 'rejected')
  `, [hostId]);

  // ✅ NEW: Get refund summary
  const [refundSummary] = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN r.status IN ('pending', 'processing', 'approved') THEN r.platform_refund ELSE 0 END), 0) as pending_refunds,
      COALESCE(SUM(CASE WHEN r.status IN ('completed', 'partial_completed') THEN r.platform_refund ELSE 0 END), 0) as completed_refunds
    FROM refunds r
    JOIN bookings b ON r.booking_id = b.id
    JOIN listings l ON b.listing_id = l.id
    WHERE l.host_id = ?
  `, [hostId]);

  // Get payout history
  const [payouts] = await pool.query(`
    SELECT 
      id,
      amount,
      fee,
      net_amount,
      payment_method,
      status,
      rejection_reason,
      created_at,
      updated_at,
      completed_at
    FROM payouts
    WHERE host_id = ?
    ORDER BY created_at DESC
  `, [hostId]);

  res.json({
    status: 'success',
    data: {
      totalEarnings: summary[0]?.total_earnings || 0,
      totalBookings: summary[0]?.total_bookings || 0,
      pendingRefunds: refundSummary[0]?.pending_refunds || 0, // ✅ NEW
      completedRefunds: refundSummary[0]?.completed_refunds || 0, // ✅ NEW
      netEarnings: (summary[0]?.total_earnings || 0) - (refundSummary[0]?.completed_refunds || 0), // ✅ NEW
      payouts: payouts
    }
  });
});

// Host: Get received payouts
exports.getReceivedPayoutsByHost = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  const [payouts] = await pool.query(`
    SELECT 
      id,
      amount,
      fee,
      net_amount,
      payment_method,
      status,
      created_at,
      completed_at
    FROM payouts
    WHERE host_id = ? AND status = 'completed'
    ORDER BY completed_at DESC
  `, [hostId]);
  
  res.json({ 
    status: 'success',
    payouts: payouts 
  });
});

// ==========================================
// ADMIN OPERATIONS
// ==========================================

// Admin: Get all payouts
exports.getAllPayouts = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  const { status, date_from, date_to, host_id, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT 
      p.*,
      u.name as host_name,
      u.email as host_email
    FROM payouts p
    JOIN users u ON p.host_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (status) {
    query += ` AND p.status = ?`;
    params.push(status);
  }

  if (date_from) {
    query += ` AND p.created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND p.created_at <= ?`;
    params.push(date_to);
  }

  if (host_id) {
    query += ` AND p.host_id = ?`;
    params.push(host_id);
  }

  query += `
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(parseInt(limit), parseInt(offset));

  const [payouts] = await pool.query(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(DISTINCT p.id) as total
    FROM payouts p
    WHERE 1=1
  `;
  const countParams = [];

  if (status) {
    countQuery += ` AND p.status = ?`;
    countParams.push(status);
  }

  if (date_from) {
    countQuery += ` AND p.created_at >= ?`;
    countParams.push(date_from);
  }

  if (date_to) {
    countQuery += ` AND p.created_at <= ?`;
    countParams.push(date_to);
  }

  if (host_id) {
    countQuery += ` AND p.host_id = ?`;
    countParams.push(host_id);
  }

  const [countResult] = await pool.query(countQuery, countParams);
  const total = countResult[0]?.total || 0;

  res.json({ 
    status: 'success',
    payouts: payouts,
    total: total,
    limit: parseInt(limit),
    offset: parseInt(offset)
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
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_paid_out,
      SUM(CASE WHEN status = 'completed' THEN fee ELSE 0 END) as total_fees_paid
    FROM payouts
  `);

  res.json({
    status: 'success',
    data: {
      stats: stats[0] || {}
    }
  });
});

// Admin: Approve payout
exports.approvePayout = catchAsync(async (req, res, next) => {
  const { payout_id } = req.params;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  const [payoutDetails] = await pool.query(
    `SELECT p.*, u.email, u.name 
     FROM payouts p 
     JOIN users u ON p.host_id = u.id 
     WHERE p.id = ? AND p.status = 'pending'`,
    [payout_id]
  );

  if (!payoutDetails.length) {
    return next(new AppError('Payout not found or already processed', 404));
  }

  const payout = payoutDetails[0];

  await pool.query(
    `UPDATE payouts 
     SET status = 'approved', 
         updated_at = NOW() 
     WHERE id = ?`,
    [payout_id]
  );

  try {
    await createNotification({
      userId: payout.host_id,
      message: `Your payout request for ₱${payout.amount.toLocaleString()} has been approved and will be processed soon.`,
      type: 'payout_approved'
    });
  } catch (notifError) {
    console.error('Notification error:', notifError);
  }

  res.status(200).json({ 
    status: 'success',
    message: "Payout approved successfully",
    data: {
      payout_id: payout_id
    }
  });
});

// Admin: Complete payout
exports.completePayout = catchAsync(async (req, res, next) => {
  const { payout_id } = req.params;
  const { proof_url } = req.body;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  const [payoutDetails] = await pool.query(
    'SELECT p.*, u.email, u.name FROM payouts p JOIN users u ON p.host_id = u.id WHERE p.id = ?',
    [payout_id]
  );

  if (!payoutDetails.length) {
    return next(new AppError('Payout not found', 404));
  }

  const payout = payoutDetails[0];

  const [result] = await pool.query(
    "UPDATE payouts SET status = 'completed', proof_url = ?, completed_at = NOW(), updated_at = NOW() WHERE id = ? AND status IN ('approved', 'processing')",
    [proof_url || '', payout_id]
  );

  if (result.affectedRows === 0) {
    return next(new AppError('Payout not found or not in correct status', 404));
  }

  try {
    await createNotification({
      userId: payout.host_id,
      message: `Your payout of ₱${payout.amount.toLocaleString()} has been completed and sent to your account.`,
      type: 'payout_completed'
    });
  } catch (notifError) {
    console.error('Notification error:', notifError);
  }

  res.status(200).json({ 
    status: 'success',
    message: "Payout completed successfully"
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

  const [payoutDetails] = await pool.query(
    'SELECT p.*, u.email, u.name FROM payouts p JOIN users u ON p.host_id = u.id WHERE p.id = ?',
    [payout_id]
  );

  if (!payoutDetails.length) {
    return next(new AppError('Payout not found', 404));
  }

  const payout = payoutDetails[0];

  const [updateResult] = await pool.query(
    "UPDATE payouts SET status = 'rejected', rejection_reason = ?, updated_at = NOW() WHERE id = ? AND status IN ('pending', 'approved')",
    [reason, payout_id]
  );

  if (updateResult.affectedRows === 0) {
    return next(new AppError('Payout not found or already processed', 404));
  }

  try {
    await createNotification({
      userId: payout.host_id,
      message: `Your payout request for ₱${payout.amount.toLocaleString()} has been rejected. Reason: ${reason}`,
      type: 'payout_rejected'
    });
  } catch (notifError) {
    console.error('Notification error:', notifError);
  }

  res.status(200).json({ 
    status: 'success',
    message: "Payout rejected successfully"
  });
});