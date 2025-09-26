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

  // Validate status if provided
  if (status) {
    const validStatuses = ['pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid booking status', 400));
    }
  }

  try {
    // Call your simple stored procedure (no parameters)
    const [result] = await pool.query('CALL sp_get_all_bookings()');
    
    // Get all bookings from stored procedure
    let allBookings = result[0];

    // Apply filtering manually in JavaScript
    if (status) {
      allBookings = allBookings.filter(booking => booking.booking_status === status);
    }
    
    if (host_id && !isNaN(host_id)) {
      allBookings = allBookings.filter(booking => booking.host_id === parseInt(host_id));
    }
    
    if (client_id && !isNaN(client_id)) {
      allBookings = allBookings.filter(booking => booking.client_id === parseInt(client_id));
    }

    // Apply pagination manually
    const totalBookings = allBookings.length;
    const parsedLimit = parseInt(limit);
    const offset = (parseInt(page) - 1) * parsedLimit;
    const paginatedBookings = allBookings.slice(offset, offset + parsedLimit);

    // Calculate status distribution from all filtered bookings (excluding current status filter)
    let bookingsForStats = result[0]; // Start with all bookings again
    
    // Apply non-status filters for statistics
    if (host_id && !isNaN(host_id)) {
      bookingsForStats = bookingsForStats.filter(booking => booking.host_id === parseInt(host_id));
    }
    
    if (client_id && !isNaN(client_id)) {
      bookingsForStats = bookingsForStats.filter(booking => booking.client_id === parseInt(client_id));
    }

    // Create status distribution
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
// UPDATED - Using Stored Procedures for Booking Management

// Get booking details (using stored procedure)
exports.getBookingDetails = catchAsync(async (req, res, next) => {
  const { id: bookingId } = req.params;

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  const [result] = await pool.query('CALL sp_get_booking_details(?)', [bookingId]);
  
  if (!result[0] || result[0].length === 0) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking: result[0][0]
    }
  });
});

// Cancel booking (using stored procedure) - FIXED
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  // Fix: Handle case where req.body might be undefined or empty
  const reason = req.body?.reason || 'Cancelled by administrator';

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  try {
    const [result] = await pool.query('CALL sp_cancel_booking(?, ?)', [bookingId, reason]);
    
    // Get the booking details from the stored procedure result
    const bookingDetails = result[0][0];

    // Send notifications to client and host
    await createNotification({
      userId: bookingDetails.client_id,
      message: `Your booking for "${bookingDetails.listing_title}" starting ${new Date(bookingDetails.start_date).toLocaleDateString()} has been cancelled by an administrator. Reason: ${bookingDetails.reason}`,
      type: 'booking'
    });

    await createNotification({
      userId: bookingDetails.host_id,
      message: `A booking for your listing "${bookingDetails.listing_title}" starting ${new Date(bookingDetails.start_date).toLocaleDateString()} has been cancelled by an administrator.`,
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
    if (error.message === 'Booking not found') {
      return next(new AppError('Booking not found', 404));
    }
    throw error;
  }
});

// Update booking status (using stored procedure)
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

  try {
    const [result] = await pool.query('CALL sp_update_booking_status(?, ?, ?)', [bookingId, status, changedBy]);
    
    // Get the booking details from the stored procedure result
    const bookingDetails = result[0][0];

    // Send notifications to client and host
    const clientMessage = `Your booking for "${bookingDetails.listing_title}" status has been updated to "${status}" by an administrator.`;
    const hostMessage = `A booking for your listing "${bookingDetails.listing_title}" status has been updated to "${status}" by an administrator.`;
    
    await createNotification({
      userId: bookingDetails.client_id,
      message: clientMessage,
      type: 'booking'
    });
    
    await createNotification({
      userId: bookingDetails.host_id,
      message: hostMessage,
      type: 'booking'
    });

    // Emit real-time updates if socket.io is available
    const io = getIo();
    if (io) {
      io.to(`user_${bookingDetails.client_id}`).emit('booking_status_updated', {
        bookingId: parseInt(bookingId),
        newStatus: status,
        message: clientMessage
      });
      
      io.to(`user_${bookingDetails.host_id}`).emit('booking_status_updated', {
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
    if (error.message === 'Booking not found') {
      return next(new AppError('Booking not found', 404));
    }
    if (error.message === 'Invalid booking status') {
      return next(new AppError('Invalid booking status', 400));
    }
    if (error.message === 'Failed to update booking status') {
      return next(new AppError('Failed to update booking status', 500));
    }
    throw error;
  }
});

// Get booking history (using stored procedure)
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

exports.getDashboardStats = catchAsync(async (req, res, next) => {
  try {
    // Use direct queries instead of non-existent stored procedures
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as totalClients,
        SUM(CASE WHEN role = 'host' THEN 1 ELSE 0 END) as totalHosts,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as totalAdmins,
        SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) as bannedUsers
      FROM users
    `);

    const [listingStats] = await pool.query(`
      SELECT COUNT(*) as totalListings FROM listings
    `);

    const [bookingStats] = await pool.query(`
      SELECT COUNT(*) as totalBookings FROM bookings
    `);

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

exports.getAllReservations = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 50, status, listing_id } = req.query;
    
    if (parseInt(limit) > 100) {
        return next(new AppError('Limit cannot exceed 100 reservations per page', 400));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = '1=1';
    const queryParams = [];

    if (status) {
        whereClause += ' AND r.status = ?';
        queryParams.push(status);
    }

    if (listing_id) {
        whereClause += ' AND r.listing_id = ?';
        queryParams.push(listing_id);
    }

    queryParams.push(parseInt(limit), offset);

    const [reservations] = await pool.query(`
        SELECT 
            r.*,
            l.title as listing_title,
            l.location,
            uc.name as client_name,
            uc.email as client_email,
            uh.name as host_name,
            DATEDIFF(r.check_out_date, r.check_in_date) as nights
        FROM reservations r
        JOIN listings l ON r.listing_id = l.id
        JOIN users uc ON r.client_id = uc.id
        JOIN users uh ON r.host_id = uh.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
    `, queryParams);

    const [countResult] = await pool.query(`
        SELECT COUNT(*) as total FROM reservations r WHERE ${whereClause}
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

exports.getReservationDetails = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return next(new AppError('Valid reservation ID is required', 400));
    }

    const [reservations] = await pool.query(`
        SELECT 
            r.*,
            l.title as listing_title,
            l.location as listing_location,
            l.image_url,
            uc.name as client_name,
            uc.email as client_email,
            uh.name as host_name,
            uh.email as host_email,
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

    // Get reservation history
    const [history] = await pool.query(`
        SELECT rh.*, u.name as user_name
        FROM reservation_history rh
        LEFT JOIN users u ON rh.user_id = u.id
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

exports.cancelReservationAdmin = catchAsync(async (req, res, next) => {
    const { reservationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
        return next(new AppError('Cancellation reason is required', 400));
    }

    const [reservations] = await pool.query(
        'SELECT * FROM reservations WHERE id = ?', [reservationId]
    );

    if (!reservations.length) {
        return next(new AppError('Reservation not found', 404));
    }

    const reservation = reservations[0];

    if (['cancelled', 'completed'].includes(reservation.status)) {
        return next(new AppError('Cannot cancel this reservation', 400));
    }

    await pool.query('CALL sp_update_reservation_status(?, ?, ?, ?)', [
        reservationId, adminId, 'cancelled', `Admin cancellation: ${reason}`
    ]);

    // Notify both parties
    await createNotification({
        userId: reservation.client_id,
        message: `Your reservation has been cancelled by administration. Reason: ${reason}`,
        type: 'admin_cancellation'
    });

    await createNotification({
        userId: reservation.host_id,
        message: `A reservation for your listing has been cancelled by administration.`,
        type: 'admin_cancellation'
    });

    res.status(200).json({
        status: 'success',
        message: 'Reservation cancelled by admin',
        data: {
            reservationId: parseInt(reservationId),
            reason,
            cancelledAt: new Date().toISOString()
        }
    });
});

exports.getReservationStats = catchAsync(async (req, res, next) => {
    const [stats] = await pool.query(`
        SELECT 
            COUNT(*) as total_reservations,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
            SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_amount ELSE 0 END) as confirmed_revenue,
            AVG(total_amount) as average_booking_value,
            COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_reservations,
            COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) THEN 1 END) as this_week_reservations
        FROM reservations
    `);

    // Get monthly trend
    const [monthlyTrend] = await pool.query(`
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as reservations,
            SUM(total_amount) as revenue
        FROM reservations 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
    `);

    // Get top performing listings
    const [topListings] = await pool.query(`
        SELECT 
            l.id,
            l.title,
            l.location,
            COUNT(r.id) as reservation_count,
            SUM(r.total_amount) as total_revenue,
            AVG(r.total_amount) as avg_reservation_value
        FROM listings l
        JOIN reservations r ON l.id = r.listing_id
        WHERE r.status IN ('confirmed', 'completed')
        GROUP BY l.id, l.title, l.location
        ORDER BY reservation_count DESC
        LIMIT 10
    `);

    res.status(200).json({
        status: 'success',
        data: {
            summary: stats[0],
            monthlyTrend,
            topListings
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