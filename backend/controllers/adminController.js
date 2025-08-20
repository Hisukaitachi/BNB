// backend/controllers/adminController.js - Updated with new error handling
const pool = require('../db');
const { createNotification } = require('./notificationsController');
const { getIo } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

// USERS
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const [users] = await pool.query('SELECT * FROM users');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

exports.banUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Check if user exists
  const [userCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
  if (userCheck.length === 0) {
    return next(new AppError('User not found', 404));
  }

  // Ban the user in the database
  await pool.query('CALL sp_ban_user(?)', [userId]);

  // Send a notification to the banned user
  await createNotification({
    userId,
    message: 'Your account has been banned by an administrator.',
    type: 'account'
  });

  // Emit a real-time ban event via Socket.IO
  const io = getIo();
  if (io) {
    io.to(`user_${userId}`).emit('banned', {
      message: 'You have been banned. You will be logged out immediately.'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'User banned successfully'
  });
});

exports.unbanUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Check if user exists
  const [userCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
  if (userCheck.length === 0) {
    return next(new AppError('User not found', 404));
  }

  // Unban the user in the database
  await pool.query('CALL sp_unban_user(?)', [userId]);

  // Send a notification to the user
  await createNotification({
    userId,
    message: 'Your account has been reactivated. You may now log in.',
    type: 'account'
  });

  // Emit a real-time unban event via Socket.IO
  const io = getIo();
  if (io) {
    io.to(`user_${userId}`).emit('unbanned', {
      message: 'Your account has been reactivated. You can now log in.'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'User unbanned successfully'
  });
});

exports.checkBanStatus = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  
  if (!userId || isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  const [rows] = await pool.query("SELECT is_banned FROM users WHERE id = ?", [userId]);

  if (rows.length === 0) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      banned: rows[0].is_banned === 1
    }
  });
});

exports.updateUserRole = catchAsync(async (req, res, next) => {
  const userId = req.body.userId || req.params.userId;
  const role = req.body.role;

  if (!userId || !role) {
    return next(new AppError('User ID and role are required', 400));
  }

  const validRoles = ['client', 'host', 'admin'];
  if (!validRoles.includes(role)) {
    return next(new AppError(`Role must be one of: ${validRoles.join(', ')}`, 400));
  }

  const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

  if (result.affectedRows === 0) {
    return next(new AppError('User not found', 404));
  }

  await createNotification({
    userId,
    message: `Your account role has been updated to "${role}" by an administrator.`,
    type: 'role'
  });

  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully'
  });
});

// LISTINGS
exports.getAllListings = catchAsync(async (req, res, next) => {
  const [result] = await pool.query('CALL sp_get_all_listings()');
  
  res.status(200).json({
    status: 'success',
    results: result[0].length,
    data: {
      listings: result[0]
    }
  });
});

exports.removeListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // Get the listing to check existence and grab host info
  const [listing] = await pool.query('SELECT host_id, title FROM listings WHERE id = ?', [listingId]);

  if (!listing.length) {
    return next(new AppError('Listing not found', 404));
  }

  const { host_id, title } = listing[0];

  // Delete related payouts first (since it references host_id)
  await pool.query('DELETE FROM payouts WHERE host_id = ?', [host_id]);

  // Delete related bookings
  await pool.query('DELETE FROM bookings WHERE listing_id = ?', [listingId]);

  // Delete the listing itself
  await pool.query('DELETE FROM listings WHERE id = ?', [listingId]);

  // Send notification to host
  await createNotification({
    userId: host_id,
    message: `Your listing "${title}" has been removed by an administrator.`,
    type: 'listing'
  });

  res.status(200).json({
    status: 'success',
    message: 'Listing and related data removed successfully'
  });
});

// BOOKINGS
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const [result] = await pool.query('CALL sp_get_all_bookings()');
  
  res.status(200).json({
    status: 'success',
    results: result[0].length,
    data: {
      bookings: result[0]
    }
  });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  const [booking] = await pool.query(
    `SELECT b.client_id, l.host_id, l.title AS listingTitle, b.date AS bookingDate
     FROM bookings b
     JOIN listings l ON b.listing_id = l.id
     WHERE b.id = ?`,
    [bookingId]
  );

  if (!booking.length) {
    return next(new AppError('Booking not found', 404));
  }

  const { client_id, host_id, listingTitle, bookingDate } = booking[0];

  await pool.query('DELETE FROM bookings WHERE id = ?', [bookingId]);

  await createNotification({
    userId: client_id,
    message: `Your booking for "${listingTitle}" on ${bookingDate} has been cancelled by an administrator.`,
    type: 'booking'
  });

  await createNotification({
    userId: host_id,
    message: `A booking for your listing "${listingTitle}" on ${bookingDate} has been cancelled by an administrator.`,
    type: 'booking'
  });

  res.status(200).json({
    status: 'success',
    message: 'Booking cancelled successfully'
  });
});

exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const { id: bookingId } = req.params;
  const { status } = req.body;
  const changedBy = req.user.id;

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  const allowedStatuses = ['approved', 'cancelled', 'pending', 'rejected'];
  if (!allowedStatuses.includes(status)) {
    return next(new AppError('Invalid status value', 400));
  }

  const [booking] = await pool.query('SELECT client_id, host_id FROM bookings WHERE id = ?', [bookingId]);

  if (!booking.length) {
    return next(new AppError('Booking not found', 404));
  }

  await pool.query('CALL sp_update_booking_status(?, ?, ?)', [bookingId, status, changedBy]);

  const msg = `Your booking status has been updated to ${status}.`;
  await createNotification({
    userId: booking[0].client_id,
    message: msg,
    type: 'booking'
  });
  await createNotification({
    userId: booking[0].host_id,
    message: msg,
    type: 'booking'
  });

  res.status(200).json({
    status: 'success',
    message: `Booking status updated to ${status}`
  });
});

exports.getBookingHistory = catchAsync(async (req, res, next) => {
  const { id: bookingId } = req.params;
  
  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  const [result] = await pool.query('CALL sp_get_booking_history(?)', [bookingId]);
  
  res.status(200).json({
    status: 'success',
    results: result[0].length,
    data: {
      history: result[0]
    }
  });
});

// REVIEWS
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const [result] = await pool.query('CALL sp_get_all_reviews()');
  
  res.status(200).json({
    status: 'success',
    results: result[0].length,
    data: {
      reviews: result[0]
    }
  });
});

exports.removeReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  
  if (!reviewId || isNaN(reviewId)) {
    return next(new AppError('Valid review ID is required', 400));
  }

  const [review] = await pool.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId]);

  if (!review.length) {
    return next(new AppError('Review not found', 404));
  }

  await pool.query('CALL sp_remove_review(?)', [reviewId]);

  await createNotification({
    userId: review[0].user_id,
    message: 'Your review has been removed by an administrator.',
    type: 'review'
  });

  res.status(200).json({
    status: 'success',
    message: 'Review removed successfully'
  });
});

// DASHBOARD STATS
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const [result] = await pool.query('CALL sp_get_admin_dashboard()');
  const [users, listings, bookings, revenue] = result;

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers: users[0]?.totalUsers || 0,
      totalListings: listings[0]?.totalListings || 0,
      totalBookings: bookings[0]?.totalBookings || 0,
      totalRevenue: revenue[0]?.totalRevenue || 0
    }
  });
});

// PAYOUTS
exports.processPayout = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const taxPercentage = 10; // platform fee %
  const adminId = req.user.id;

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  await pool.query('CALL sp_admin_process_payout(?, ?, ?)', [
    bookingId,
    taxPercentage,
    adminId,
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Payout processed successfully'
  });
});

// ADMIN REFUND
exports.processRefund = catchAsync(async (req, res, next) => {
  const { transactionId } = req.params;
  const adminId = req.user.id;

  if (!transactionId || isNaN(transactionId)) {
    return next(new AppError('Valid transaction ID is required', 400));
  }

  await pool.query('CALL sp_admin_process_refund(?, ?)', [transactionId, adminId]);
  
  res.status(200).json({
    status: 'success',
    message: 'Refund processed successfully'
  });
});

exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const [result] = await pool.query('CALL sp_get_all_transactions()');
  
  res.status(200).json({
    status: 'success',
    results: result[0].length,
    data: {
      transactions: result[0]
    }
  });
});

exports.getHostsPendingPayouts = catchAsync(async (req, res, next) => {
  const [result] = await pool.query('CALL sp_get_host_earnings_for_payout()');
  
  res.status(200).json({
    status: 'success',
    results: result[0].length,
    data: {
      hosts: result[0]
    }
  });
});

exports.processHostPayout = catchAsync(async (req, res, next) => {
  const { hostId } = req.params;
  const taxPercentage = 10;
  const adminId = req.user.id;

  if (!hostId || isNaN(hostId)) {
    return next(new AppError('Valid host ID is required', 400));
  }

  await pool.query('START TRANSACTION');

  const [earnings] = await pool.query('CALL sp_get_host_earnings_for_payout_by_id(?)', [hostId]);

  const total = earnings[0][0]?.earnings;
  if (!total) {
    await pool.query('ROLLBACK');
    return next(new AppError('No pending payout for this host', 400));
  }

  await pool.query(
    'INSERT INTO payouts (host_id, amount, status, paid_at) VALUES (?, ?, ?, NOW())',
    [hostId, total, 'paid']
  );

  await pool.query('CALL sp_mark_bookings_paid(?)', [hostId]);

  await pool.query('COMMIT');
  
  res.status(200).json({
    status: 'success',
    message: 'Host payout processed successfully',
    data: {
      amount: total
    }
  });
});

exports.getHostEarnings = catchAsync(async (req, res, next) => {
  const hostId = req.params.hostId;

  if (!hostId || isNaN(hostId)) {
    return next(new AppError('Valid host ID is required', 400));
  }

  const [rows] = await pool.query(`
    SELECT 
      SUM(b.total_price) AS total_earnings,
      SUM(b.total_price) * 0.10 AS platform_fee,
      SUM(b.total_price) * 0.90 AS net_earnings
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    WHERE l.host_id = ?
      AND b.status = 'approved'
      AND b.end_date < CURDATE()
      AND b.paid_out = 0
  `, [hostId]);

  res.status(200).json({
    status: 'success',
    data: {
      host_id: hostId,
      host_total_earnings: rows[0].total_earnings || 0,
      platform_fee: rows[0].platform_fee || 0,
      host_net_earnings: rows[0].net_earnings || 0,
    }
  });
});

exports.markHostAsPaid = catchAsync(async (req, res, next) => {
  const { hostId } = req.body;

  if (!hostId || isNaN(hostId)) {
    return next(new AppError('Valid host ID is required', 400));
  }

  await pool.query('CALL sp_mark_bookings_paid(?)', [hostId]);
  
  res.status(200).json({
    status: 'success',
    message: 'Host bookings marked as paid'
  });
});