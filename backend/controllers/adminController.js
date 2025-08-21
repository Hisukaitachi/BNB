// backend/controllers/adminController.js - Updated with new error handling
const pool = require('../db');
const { createNotification } = require('./notificationsController');
const { getIo } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

// USERS
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50, role, banned } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // Validate pagination params
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 users per page', 400));
  }
  
  // Build dynamic query
  let whereClause = '1=1';
  const queryParams = [];
  
  if (role && ['client', 'host', 'admin'].includes(role)) {
    whereClause += ' AND role = ?';
    queryParams.push(role);
  }
  
  if (banned !== undefined) {
    whereClause += ' AND is_banned = ?';
    queryParams.push(banned === 'true' ? 1 : 0);
  }
  
  // Add pagination params
  queryParams.push(parseInt(limit), offset);
  
  const [users] = await pool.query(
    `SELECT id, name, email, role, is_banned, created_at, last_login 
     FROM users 
     WHERE ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    queryParams
  );
  
  // Get total count for pagination
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
    queryParams.slice(0, -2) // Remove limit and offset
  );
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

exports.banUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Enhanced user validation
  const [userCheck] = await pool.query('SELECT id, name, role, is_banned FROM users WHERE id = ?', [userId]);
  if (userCheck.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = userCheck[0];

  // Prevent banning admins
  if (user.role === 'admin') {
    return next(new AppError('Cannot ban administrator accounts', 403));
  }

  // Check if already banned
  if (user.is_banned === 1) {
    return next(new AppError('User is already banned', 400));
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
    message: 'User banned successfully',
    data: {
      userId: parseInt(userId),
      userName: user.name,
      previousRole: user.role,
      bannedAt: new Date().toISOString()
    }
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

  if (isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  const validRoles = ['client', 'host', 'admin'];
  if (!validRoles.includes(role)) {
    return next(new AppError(`Role must be one of: ${validRoles.join(', ')}`, 400));
  }

  // Get current user info
  const [userCheck] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [userId]);
  if (!userCheck.length) {
    return next(new AppError('User not found', 404));
  }

  const currentUser = userCheck[0];

  // Prevent role changes that could compromise security
  if (currentUser.role === 'admin' && role !== 'admin') {
    return next(new AppError('Cannot demote administrator accounts', 403));
  }

  // Check if role is already the same
  if (currentUser.role === role) {
    return next(new AppError(`User already has the role: ${role}`, 400));
  }

  const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

  if (result.affectedRows === 0) {
    return next(new AppError('Failed to update user role', 500));
  }

  await createNotification({
    userId,
    message: `Your account role has been updated to "${role}" by an administrator.`,
    type: 'role'
  });

  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully',
    data: {
      userId: parseInt(userId),
      userName: currentUser.name,
      previousRole: currentUser.role,
      newRole: role,
      updatedAt: new Date().toISOString()
    }
  });
});

// LISTINGS
exports.getAllListings = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50, host_id, status, location } = req.query;
  
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 listings per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereClause = '1=1';
  const queryParams = [];

  // Filter by host
  if (host_id && !isNaN(host_id)) {
    whereClause += ' AND l.host_id = ?';
    queryParams.push(parseInt(host_id));
  }

  // Filter by location
  if (location) {
    whereClause += ' AND l.location LIKE ?';
    queryParams.push(`%${location}%`);
  }

  queryParams.push(parseInt(limit), offset);

  const [result] = await pool.query(`
    SELECT l.*, u.name as host_name, u.email as host_email,
           COUNT(b.id) as total_bookings,
           AVG(r.rating) as avg_rating
    FROM listings l
    JOIN users u ON l.host_id = u.id
    LEFT JOIN bookings b ON l.id = b.listing_id
    LEFT JOIN reviews r ON b.id = r.booking_id
    WHERE ${whereClause}
    GROUP BY l.id
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `, queryParams);

  // Get total count
  const [countResult] = await pool.query(`
    SELECT COUNT(DISTINCT l.id) as total 
    FROM listings l 
    WHERE ${whereClause}
  `, queryParams.slice(0, -2));
  
  res.status(200).json({
    status: 'success',
    results: result.length,
    data: {
      listings: result,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

exports.removeListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;
  const { reason } = req.body;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // Get the listing to check existence and grab host info
  const [listing] = await pool.query('SELECT host_id, title FROM listings WHERE id = ?', [listingId]);

  if (!listing.length) {
    return next(new AppError('Listing not found', 404));
  }

  const { host_id, title } = listing[0];

  // Check for active bookings
  const [activeBookings] = await pool.query(
    'SELECT COUNT(*) as count FROM bookings WHERE listing_id = ? AND status IN ("pending", "approved", "confirmed")',
    [listingId]
  );

  if (activeBookings[0].count > 0) {
    return next(new AppError('Cannot remove listing with active bookings. Please handle bookings first.', 400));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Delete related data in correct order
    await connection.query('DELETE FROM favorites WHERE listing_id = ?', [listingId]);
    await connection.query('DELETE FROM reviews WHERE booking_id IN (SELECT id FROM bookings WHERE listing_id = ?)', [listingId]);
    await connection.query('DELETE FROM bookings WHERE listing_id = ?', [listingId]);
    await connection.query('DELETE FROM listings WHERE id = ?', [listingId]);

    await connection.commit();

    // Log admin action
    await pool.query(
      'INSERT INTO admin_actions (admin_id, user_id, action_type, reason, created_at) VALUES (?, ?, ?, ?, NOW())',
      [req.user.id, host_id, 'listing_removed', reason || 'No reason provided']
    );

    // Send notification to host
    await createNotification({
      userId: host_id,
      message: `Your listing "${title}" has been removed by an administrator. ${reason ? 'Reason: ' + reason : ''}`,
      type: 'listing'
    });

    res.status(200).json({
      status: 'success',
      message: 'Listing and related data removed successfully',
      data: {
        listingId: parseInt(listingId),
        listingTitle: title,
        hostId: host_id,
        removedBy: req.user.id,
        reason: reason || 'No reason provided',
        removedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// BOOKINGS
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50, status, host_id, client_id } = req.query;
  
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 bookings per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereClause = '1=1';
  const queryParams = [];

  // Filter by status
  if (status) {
    const validStatuses = ['pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid booking status', 400));
    }
    whereClause += ' AND b.status = ?';
    queryParams.push(status);
  }

  // Filter by host
  if (host_id && !isNaN(host_id)) {
    whereClause += ' AND l.host_id = ?';
    queryParams.push(parseInt(host_id));
  }

  // Filter by client
  if (client_id && !isNaN(client_id)) {
    whereClause += ' AND b.client_id = ?';
    queryParams.push(parseInt(client_id));
  }

  queryParams.push(parseInt(limit), offset);

  const [result] = await pool.query(`
    SELECT 
      b.*, 
      u.name AS client_name, 
      u.email AS client_email,
      l.title AS listing_title,
      l.host_id,
      h.name AS host_name,
      h.email AS host_email,
      DATEDIFF(b.end_date, b.start_date) as duration_days
    FROM bookings b
    JOIN users u ON b.client_id = u.id
    JOIN listings l ON b.listing_id = l.id
    JOIN users h ON l.host_id = h.id
    WHERE ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `, queryParams);

  // Get total count
  const [countResult] = await pool.query(`
    SELECT COUNT(*) as total 
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    WHERE ${whereClause}
  `, queryParams.slice(0, -2));

  // Get status distribution
  const [statusStats] = await pool.query(`
    SELECT status, COUNT(*) as count
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    WHERE ${whereClause.replace(/\bAND b\.status = \?/, '')}
    GROUP BY status
  `, queryParams.slice(0, -2).filter((_, index) => index !== queryParams.indexOf(status)));
  
  res.status(200).json({
    status: 'success',
    results: result.length,
    data: {
      bookings: result,
      statistics: {
        statusDistribution: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat.count;
          return acc;
        }, {})
      },
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
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
  try {
    // Get comprehensive dashboard statistics
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as total_clients,
        SUM(CASE WHEN role = 'host' THEN 1 ELSE 0 END) as total_hosts,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins,
        SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) as banned_users,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_last_30_days
      FROM users
    `);

    const [listingStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_listings,
        AVG(price_per_night) as avg_price_per_night,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_listings_last_30_days
      FROM listings
    `);

    const [bookingStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_bookings_last_30_days,
        AVG(total_price) as avg_booking_value
      FROM bookings
    `);

    const [revenueStats] = await pool.query(`
      SELECT 
        IFNULL(SUM(total_price), 0) as total_revenue,
        IFNULL(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_price ELSE 0 END), 0) as revenue_last_30_days,
        IFNULL(SUM(CASE WHEN YEAR(created_at) = YEAR(NOW()) THEN total_price ELSE 0 END), 0) as revenue_this_year
      FROM bookings
      WHERE status IN ('approved', 'completed')
    `);

    const [reviewStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_reviews_last_30_days
      FROM reviews
    `);

    res.status(200).json({
      status: 'success',
      data: {
        users: userStats[0],
        listings: listingStats[0],
        bookings: bookingStats[0],
        revenue: revenueStats[0],
        reviews: reviewStats[0],
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return next(new AppError('Failed to generate dashboard statistics', 500));
  }
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

  // Verify host exists
  const [hostCheck] = await pool.query('SELECT id, name FROM users WHERE id = ? AND role = "host"', [hostId]);
  if (!hostCheck.length) {
    return next(new AppError('Host not found', 404));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [earnings] = await connection.query('CALL sp_get_host_earnings_for_payout_by_id(?)', [hostId]);

    const total = earnings[0][0]?.earnings;
    if (!total || total <= 0) {
      await connection.rollback();
      return next(new AppError('No pending payout for this host', 400));
    }

    // Validate reasonable payout amount
    if (total > 10000000) { // 10M PHP max payout validation
      await connection.rollback();
      return next(new AppError('Payout amount exceeds maximum limit. Please contact system administrator.', 400));
    }

    // Insert payout record with additional metadata
    const [payoutResult] = await connection.query(
      'INSERT INTO payouts (host_id, amount, status, released_at) VALUES (?, ?, ?, NOW())',
      [hostId, total, 'released']
    );

    // Mark bookings as paid
    const [updateResult] = await connection.query('CALL sp_mark_bookings_paid(?)', [hostId]);

    await connection.commit();
    
    res.status(200).json({
      status: 'success',
      message: 'Host payout processed successfully',
      data: {
        payoutId: payoutResult.insertId,
        hostId: parseInt(hostId),
        hostName: hostCheck[0].name,
        amount: parseFloat(total),
        processedAt: new Date().toISOString(),
        processedBy: adminId,
        affectedBookings: updateResult.affectedRows || 0
      }
    });

  } catch (error) {
    await connection.rollback();
    
    // Enhanced error logging
    console.error('Payout processing error:', {
      hostId,
      adminId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    // Check for specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('Payout already processed for this host', 409);
    }
    
    throw new AppError('Failed to process payout. Please try again later.', 500);
  } finally {
    connection.release();
  }
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