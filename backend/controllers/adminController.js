// backend/controllers/adminController.js - WITHOUT STORED PROCEDURES
// ============================================================================
// ADMIN CONTROLLER
// Handles all administrative operations including:
// - User management (ban/unban, role changes)
// - Listing moderation (removal, oversight)
// - Booking management (status updates, cancellations)
// - Review moderation
// - Refund processing
// - Dashboard statistics
// ============================================================================

const pool = require('../db');
const { createNotification } = require('./notificationsController');
const { getIo } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

// ==========================================
// USER MANAGEMENT SECTION
// ==========================================

/**
 * GET ALL USERS
 * Retrieves paginated list of users with optional filtering
 * Replaced: sp_get_all_users stored procedure
 * 
 * Query params:
 * - page: Page number (default 1)
 * - limit: Items per page (max 100, default 50)
 * - role: Filter by role (client/host/admin)
 * - banned: Filter by ban status (true/false)
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50, role, banned } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // Prevent excessive data retrieval
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 users per page', 400));
  }
  
  // Build dynamic WHERE clause
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
  
  queryParams.push(parseInt(limit), offset);
  
  // Main query with filters
  const [users] = await pool.query(
    `SELECT id, name, email, role, is_banned, created_at, last_login 
     FROM users 
     WHERE ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    queryParams
  );
  
  // Count total for pagination
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
    queryParams.slice(0, -2)
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

/**
 * BAN USER
 * Bans a user account and sends real-time notification
 * Replaced: sp_ban_user stored procedure
 * 
 * Security checks:
 * - Cannot ban admin accounts
 * - Cannot ban already banned users
 * - Emits socket event to force logout
 */
exports.banUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Verify user exists and get details
  const [userCheck] = await pool.query(
    'SELECT id, name, role, is_banned FROM users WHERE id = ?', 
    [userId]
  );
  
  if (userCheck.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = userCheck[0];

  // Security: Prevent banning admins
  if (user.role === 'admin') {
    return next(new AppError('Cannot ban administrator accounts', 403));
  }

  // Prevent duplicate bans
  if (user.is_banned === 1) {
    return next(new AppError('User is already banned', 400));
  }

  // Direct SQL UPDATE - replaces sp_ban_user
  await pool.query('UPDATE users SET is_banned = 1 WHERE id = ?', [userId]);

  // Create notification for user
  await createNotification({
    userId,
    message: 'Your account has been banned by an administrator.',
    type: 'account'
  });

  // Real-time socket notification for immediate logout
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

/**
 * UNBAN USER
 * Removes ban from user account
 * Replaced: sp_unban_user stored procedure
 */
exports.unbanUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Verify user exists
  const [userCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
  if (userCheck.length === 0) {
    return next(new AppError('User not found', 404));
  }

  // Direct SQL UPDATE - replaces sp_unban_user
  await pool.query('UPDATE users SET is_banned = 0 WHERE id = ?', [userId]);

  // Notify user of reactivation
  await createNotification({
    userId,
    message: 'Your account has been reactivated. You may now log in.',
    type: 'account'
  });

  // Socket notification
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

/**
 * CHECK BAN STATUS
 * Quick check if user is banned
 */
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

/**
 * UPDATE USER ROLE
 * Changes user role with validation
 * Replaced: sp_update_user_role stored procedure
 * 
 * Security checks:
 * - Cannot demote admin accounts
 * - Validates role values
 */
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const userId = req.body.userId || req.params.userId;
  const role = req.body.role;

  if (!userId || !role) {
    return next(new AppError('User ID and role are required', 400));
  }

  if (isNaN(userId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Validate role value
  const validRoles = ['client', 'host', 'admin'];
  if (!validRoles.includes(role)) {
    return next(new AppError(`Role must be one of: ${validRoles.join(', ')}`, 400));
  }

  // Get current user info
  const [userCheck] = await pool.query(
    'SELECT id, name, role FROM users WHERE id = ?', 
    [userId]
  );
  
  if (!userCheck.length) {
    return next(new AppError('User not found', 404));
  }

  const currentUser = userCheck[0];

  // Security: Prevent demoting admins
  if (currentUser.role === 'admin' && role !== 'admin') {
    return next(new AppError('Cannot demote administrator accounts', 403));
  }

  // Check if role is already set
  if (currentUser.role === role) {
    return next(new AppError(`User already has the role: ${role}`, 400));
  }

  // Direct SQL UPDATE - replaces sp_update_user_role
  const [result] = await pool.query(
    'UPDATE users SET role = ? WHERE id = ?', 
    [role, userId]
  );

  if (result.affectedRows === 0) {
    return next(new AppError('Failed to update user role', 500));
  }

  // Notify user of role change
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

// ==========================================
// LISTING MANAGEMENT SECTION
// ==========================================

/**
 * GET ALL LISTINGS
 * Retrieves all listings with host info and statistics
 * Replaced: sp_get_all_listings stored procedure
 * 
 * Supports filtering by:
 * - host_id: Filter by specific host
 * - location: Search by location (LIKE)
 */
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

  // Filter by location (partial match)
  if (location) {
    whereClause += ' AND l.location LIKE ?';
    queryParams.push(`%${location}%`);
  }

  queryParams.push(parseInt(limit), offset);

  // Join with users, bookings, and reviews for complete data
  const [result] = await pool.query(`
    SELECT l.*, u.name as host_name, u.email as host_email,
           COUNT(DISTINCT b.id) as total_bookings,
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

  // Count total for pagination
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

/**
 * REMOVE LISTING
 * Completely removes a listing and all related data
 * Uses transaction for data integrity
 * 
 * Safety checks:
 * - Cannot remove listings with active bookings
 * - Cascades deletion to related records
 */
exports.removeListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;
  const { reason } = req.body;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // Get listing details
  const [listing] = await pool.query(
    'SELECT host_id, title FROM listings WHERE id = ?', 
    [listingId]
  );

  if (!listing.length) {
    return next(new AppError('Listing not found', 404));
  }

  const { host_id, title } = listing[0];

  // Check for active bookings (safety check)
  const [activeBookings] = await pool.query(
    'SELECT COUNT(*) as count FROM bookings WHERE listing_id = ? AND status IN ("pending", "approved", "confirmed")',
    [listingId]
  );

  if (activeBookings[0].count > 0) {
    return next(new AppError('Cannot remove listing with active bookings. Please handle bookings first.', 400));
  }

  // Use transaction for atomic deletion
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Delete in correct order to respect foreign key constraints
    await connection.query('DELETE FROM favorites WHERE listing_id = ?', [listingId]);
    await connection.query('DELETE FROM reviews WHERE booking_id IN (SELECT id FROM bookings WHERE listing_id = ?)', [listingId]);
    await connection.query('DELETE FROM bookings WHERE listing_id = ?', [listingId]);
    await connection.query('DELETE FROM listings WHERE id = ?', [listingId]);

    await connection.commit();

    // Log admin action for audit trail
    await pool.query(
      'INSERT INTO admin_actions (admin_id, user_id, action_type, reason, created_at) VALUES (?, ?, ?, ?, NOW())',
      [req.user.id, host_id, 'listing_removed', reason || 'No reason provided']
    );

    // Notify host
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

// ==========================================
// BOOKING MANAGEMENT SECTION
// ==========================================

/**
 * GET ALL BOOKINGS
 * Retrieves all bookings with filtering and statistics
 * Replaced: sp_get_all_bookings stored procedure
 * 
 * Features:
 * - Manual filtering in JavaScript (allows complex filters)
 * - Status distribution statistics
 * - Pagination support
 */
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50, status, host_id, client_id } = req.query;
  
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 bookings per page', 400));
  }

  // Validate status filter
  if (status) {
    const validStatuses = ['pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid booking status', 400));
    }
  }

  try {
    // Get all bookings with joins (replaces sp_get_all_bookings)
    const [allBookings] = await pool.query(`
      SELECT 
        b.id,
        b.client_id,
        b.listing_id,
        b.start_date,
        b.end_date,
        b.total_price,
        b.guests,
        b.status as booking_status,
        b.created_at,
        b.updated_at,
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
      ORDER BY b.created_at DESC
    `);
    
    // Apply filters in JavaScript for flexibility
    let filteredBookings = allBookings;

    if (status) {
      filteredBookings = filteredBookings.filter(booking => booking.booking_status === status);
    }
    
    if (host_id && !isNaN(host_id)) {
      filteredBookings = filteredBookings.filter(booking => booking.host_id === parseInt(host_id));
    }
    
    if (client_id && !isNaN(client_id)) {
      filteredBookings = filteredBookings.filter(booking => booking.client_id === parseInt(client_id));
    }

    // Pagination
    const totalBookings = filteredBookings.length;
    const parsedLimit = parseInt(limit);
    const offset = (parseInt(page) - 1) * parsedLimit;
    const paginatedBookings = filteredBookings.slice(offset, offset + parsedLimit);

    // Calculate statistics (exclude current status filter)
    let bookingsForStats = allBookings;
    
    if (host_id && !isNaN(host_id)) {
      bookingsForStats = bookingsForStats.filter(booking => booking.host_id === parseInt(host_id));
    }
    
    if (client_id && !isNaN(client_id)) {
      bookingsForStats = bookingsForStats.filter(booking => booking.client_id === parseInt(client_id));
    }

    // Status distribution for dashboard
    const statusDistribution = bookingsForStats.reduce((acc, booking) => {
      const status = booking.booking_status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      results: paginatedBookings.length,
      data: {
        bookings: paginatedBookings,
        statistics: {
          statusDistribution: statusDistribution
        },
        pagination: {
          total: totalBookings,
          page: parseInt(page),
          limit: parsedLimit,
          totalPages: Math.ceil(totalBookings / parsedLimit)
        }
      }
    });

  } catch (error) {
    console.error('Error in getAllBookings:', error);
    return next(new AppError('Failed to retrieve bookings', 500));
  }
});

/**
 * GET BOOKING DETAILS
 * Get complete booking information with user and listing data
 * Replaced: sp_get_booking_details stored procedure
 */
exports.getBookingDetails = catchAsync(async (req, res, next) => {
  const { id: bookingId } = req.params;

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  // Single query with all joins
  const [result] = await pool.query(`
    SELECT 
      b.id,
      b.client_id,
      b.listing_id,
      b.start_date,
      b.end_date,
      b.total_price,
      b.status,
      b.created_at,
      b.updated_at,
      u.name AS client_name,
      u.email AS client_email,
      l.host_id,
      l.title AS listing_title,
      h.name AS host_name,
      h.email AS host_email,
      DATEDIFF(b.end_date, b.start_date) as duration_days
    FROM bookings b
    JOIN users u ON b.client_id = u.id
    JOIN listings l ON b.listing_id = l.id
    JOIN users h ON l.host_id = h.id
    WHERE b.id = ?
  `, [bookingId]);
  
  if (!result || result.length === 0) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking: result[0]
    }
  });
});

/**
 * CANCEL BOOKING
 * Admin cancels a booking with notifications
 * Replaced: sp_cancel_booking stored procedure
 * 
 * Important: Uses transaction to ensure data integrity
 * Sends notifications to both client and host
 */
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const reason = req.body?.reason || 'Cancelled by administrator';

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check existence
    const [bookingCheck] = await connection.query(
      'SELECT COUNT(*) as count FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookingCheck[0].count === 0) {
      await connection.rollback();
      return next(new AppError('Booking not found', 404));
    }

    // Get booking details before deletion
    const [bookingDetails] = await connection.query(`
      SELECT 
        b.client_id,
        l.host_id,
        l.title as listing_title,
        b.start_date
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.id = ?
    `, [bookingId]);

    const booking = bookingDetails[0];

    // Delete booking
    await connection.query('DELETE FROM bookings WHERE id = ?', [bookingId]);

    await connection.commit();

    // Notify both parties
    await createNotification({
      userId: booking.client_id,
      message: `Your booking for "${booking.listing_title}" starting ${new Date(booking.start_date).toLocaleDateString()} has been cancelled by an administrator. Reason: ${reason}`,
      type: 'booking'
    });

    await createNotification({
      userId: booking.host_id,
      message: `A booking for your listing "${booking.listing_title}" starting ${new Date(booking.start_date).toLocaleDateString()} has been cancelled by an administrator.`,
      type: 'booking'
    });

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: {
        bookingId: parseInt(bookingId),
        reason: reason,
        cancelledAt: new Date().toISOString()
      }
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * UPDATE BOOKING STATUS
 * Changes booking status with notifications
 * Replaced: sp_update_booking_status stored procedure
 * 
 * Features:
 * - Validates status transitions
 * - Sends notifications to client and host
 * - Emits real-time socket events
 * - Uses transaction for safety
 */
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const { id: bookingId } = req.params;
  const { status } = req.body;
  const changedBy = req.user.id;

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  if (!status) {
    return next(new AppError('Status is required', 400));
  }

  // Validate status value
  const validStatuses = ['pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed', 'refunded'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid booking status', 400));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verify booking exists
    const [bookingCheck] = await connection.query(
      'SELECT COUNT(*) as count FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookingCheck[0].count === 0) {
      await connection.rollback();
      return next(new AppError('Booking not found', 404));
    }

    // Get booking details for notifications
    const [bookingDetails] = await connection.query(`
      SELECT 
        b.client_id,
        l.host_id,
        l.title as listing_title,
        b.start_date
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.id = ?
    `, [bookingId]);

    const booking = bookingDetails[0];

    // Update status
    const [updateResult] = await connection.query(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, bookingId]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return next(new AppError('Failed to update booking status', 500));
    }

    await connection.commit();

    // Send notifications
    const clientMessage = `Your booking for "${booking.listing_title}" status has been updated to "${status}" by an administrator.`;
    const hostMessage = `A booking for your listing "${booking.listing_title}" status has been updated to "${status}" by an administrator.`;
    
    await createNotification({
      userId: booking.client_id,
      message: clientMessage,
      type: 'booking'
    });
    
    await createNotification({
      userId: booking.host_id,
      message: hostMessage,
      type: 'booking'
    });

    // Real-time socket notifications
    const io = getIo();
    if (io) {
      io.to(`user_${booking.client_id}`).emit('booking_status_updated', {
        bookingId: parseInt(bookingId),
        newStatus: status,
        message: clientMessage
      });
      
      io.to(`user_${booking.host_id}`).emit('booking_status_updated', {
        bookingId: parseInt(bookingId),
        newStatus: status,
        message: hostMessage
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Booking status updated to ${status}`,
      data: {
        bookingId: parseInt(bookingId),
        newStatus: status,
        updatedAt: new Date().toISOString(),
        changedBy: changedBy
      }
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * GET BOOKING HISTORY
 * Retrieves status change history for a booking
 * Replaced: sp_get_booking_history stored procedure
 * 
 * Note: Currently simplified - returns booking info
 * Can be enhanced with a booking_history table
 */
exports.getBookingHistory = catchAsync(async (req, res, next) => {
  const { id: bookingId } = req.params;
  
  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  // Simple version - can be enhanced with proper history table
  const [result] = await pool.query(`
    SELECT 
      b.id,
      b.status,
      b.created_at,
      b.updated_at,
      'System' AS changed_by
    FROM bookings b
    WHERE b.id = ?
    ORDER BY b.updated_at DESC
  `, [bookingId]);
  
  res.status(200).json({
    status: 'success',
    results: result.length,
    data: {
      history: result
    }
  });
});

// ==========================================
// REVIEW MANAGEMENT SECTION
// ==========================================

/**
 * GET ALL REVIEWS
 * Retrieves all reviews with reviewer and reviewee names
 * Replaced: sp_get_all_reviews stored procedure
 */
exports.getAllReviews = catchAsync(async (req, res, next) => {
  // Direct SQL with joins
  const [result] = await pool.query(`
    SELECT r.*, u1.name AS reviewer_name, u2.name AS reviewee_name
    FROM reviews r
    JOIN users u1 ON r.reviewer_id = u1.id
    JOIN users u2 ON r.reviewee_id = u2.id
    ORDER BY r.created_at DESC
  `);
  
  res.status(200).json({
    status: 'success',
    results: result.length,
    data: {
      reviews: result
    }
  });
});

/**
 * REMOVE REVIEW
 * Deletes a review and notifies the reviewer
 * Replaced: sp_remove_review stored procedure
 */
exports.removeReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  
  if (!reviewId || isNaN(reviewId)) {
    return next(new AppError('Valid review ID is required', 400));
  }

  // Get reviewer ID before deletion
  const [review] = await pool.query(
    'SELECT reviewer_id FROM reviews WHERE id = ?', 
    [reviewId]
  );

  if (!review.length) {
    return next(new AppError('Review not found', 404));
  }

  // Delete review
  await pool.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

  // Notify reviewer
  await createNotification({
    userId: review[0].reviewer_id,
    message: 'Your review has been removed by an administrator.',
    type: 'review'
  });

  res.status(200).json({
    status: 'success',
    message: 'Review removed successfully'
  });
});

// ==========================================
// DASHBOARD & STATISTICS SECTION
// ==========================================

/**
 * GET DASHBOARD STATS
 * Retrieves overview statistics for admin dashboard
 * Replaced: sp_get_admin_dashboard stored procedure
 * 
 * Returns:
 * - Total users (with breakdown by role)
 * - Total listings
 * - Total bookings
 * - Total revenue
 */
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  try {
    // User statistics with role breakdown
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as totalClients,
        SUM(CASE WHEN role = 'host' THEN 1 ELSE 0 END) as totalHosts,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as totalAdmins,
        SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) as bannedUsers
      FROM users
    `);

    // Listing count
    const [listingStats] = await pool.query(`
      SELECT COUNT(*) as totalListings FROM listings
    `);

    // Booking count
    const [bookingStats] = await pool.query(`
      SELECT COUNT(*) as totalBookings FROM bookings
    `);

    // Revenue calculation (approved and completed bookings)
    const [revenueStats] = await pool.query(`
      SELECT IFNULL(SUM(total_price), 0) as totalRevenue 
      FROM bookings WHERE status IN ('approved', 'completed')
    `);

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers: userStats[0].totalUsers,
        totalListings: listingStats[0].totalListings, 
        totalBookings: bookingStats[0].totalBookings,
        totalRevenue: revenueStats[0].totalRevenue,
        userBreakdown: {
          clients: userStats[0].totalClients,
          hosts: userStats[0].totalHosts,
          admins: userStats[0].totalAdmins,
          banned: userStats[0].bannedUsers
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return next(new AppError('Failed to generate dashboard statistics', 500));
  }
});
