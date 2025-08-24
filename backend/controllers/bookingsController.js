// backend/controllers/bookingsController.js - Updated with new error handling
const pool = require('../db');
const { createNotification } = require('./notificationsController');
const autoCompleteBookings = require('../utils/autoCompleteBookings');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.createBooking = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;
  const { listing_id, start_date, end_date, total_price } = req.body;

  // Basic validation
  if (!listing_id || !start_date || !end_date || !total_price) {
    return next(new AppError('Listing ID, start date, end date, and total price are required', 400));
  }

  // Enhanced date validation
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check for invalid dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return next(new AppError('Invalid date format provided', 400));
  }

  if (startDate < today) {
    return next(new AppError('Start date cannot be in the past', 400));
  }

  if (endDate <= startDate) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Check minimum and maximum booking duration
  const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  if (daysDifference > 365) {
    return next(new AppError('Booking cannot exceed 365 days', 400));
  }
  if (daysDifference < 1) {
    return next(new AppError('Minimum booking duration is 1 day', 400));
  }

  // Validate total_price
  if (isNaN(total_price) || total_price <= 0) {
    return next(new AppError('Total price must be a positive number', 400));
  }

  // Check if listing exists
  const [listings] = await pool.query('SELECT * FROM listings WHERE id = ?', [listing_id]);
  if (!listings.length) {
    return next(new AppError('Listing not found', 404));
  }

  const listing = listings[0];

  // Check if user is trying to book their own listing
  if (listing.host_id === clientId) {
    return next(new AppError('You cannot book your own listing', 400));
  }

  // CRITICAL FIX: Check for booking conflicts with proper date logic
  const [conflicts] = await pool.query(`
    SELECT id, start_date, end_date, status
    FROM bookings
    WHERE listing_id = ?
      AND status IN ('pending', 'approved', 'confirmed')
      AND NOT (end_date <= ? OR start_date >= ?)
  `, [listing_id, start_date, end_date]);

  if (conflicts.length > 0) {
    const conflictDates = conflicts.map(c => 
      `${c.start_date.toISOString().split('T')[0]} to ${c.end_date.toISOString().split('T')[0]} (${c.status})`
    ).join(', ');
    
    return next(new AppError(
      `Selected dates conflict with existing bookings: ${conflictDates}`, 
      409
    ));
  }

  // Validate pricing against listing price (with tolerance for discounts)
  const expectedPrice = listing.price_per_night * daysDifference;
  const priceTolerance = expectedPrice * 0.2; // 20% tolerance for discounts
  
  if (total_price > expectedPrice + priceTolerance) {
    return next(new AppError('Price exceeds maximum allowed amount', 400));
  }
  
  if (total_price < expectedPrice - priceTolerance) {
    return next(new AppError('Price is below minimum allowed amount', 400));
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Double-check for conflicts within transaction
    const [finalConflictCheck] = await connection.query(`
      SELECT id FROM bookings
      WHERE listing_id = ?
        AND status IN ('pending', 'approved', 'confirmed')
        AND NOT (end_date <= ? OR start_date >= ?)
      FOR UPDATE
    `, [listing_id, start_date, end_date]);

    if (finalConflictCheck.length > 0) {
      await connection.rollback();
      return next(new AppError('Selected dates are no longer available', 409));
    }

    // Create the booking
    const [result] = await connection.query(
      'INSERT INTO bookings (listing_id, client_id, start_date, end_date, total_price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [listing_id, clientId, start_date, end_date, total_price, 'pending']
    );

    await connection.commit();

    // Notify host
    const { createNotification } = require('./notificationsController');
    await createNotification({
      userId: listing.host_id,
      message: `New booking request for '${listing.title}' from ${req.user.name}`,
      type: 'booking_request'
    });

    // Notify client
    await createNotification({
      userId: clientId,
      message: `Your booking request for '${listing.title}' has been sent to the host.`,
      type: 'booking_sent'
    });

    res.status(201).json({
      status: 'success',
      message: 'Booking request created successfully',
      data: {
        bookingId: result.insertId,
        booking: {
          listing: listing.title,
          dates: `${start_date} to ${end_date}`,
          duration: `${daysDifference} day(s)`,
          totalPrice: total_price,
          status: 'pending'
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
exports.getBookingsByClient = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;

  await autoCompleteBookings(); // Auto-fix statuses first
  const [rows] = await pool.query('CALL sp_get_bookings_by_client(?)', [clientId]);

  res.status(200).json({
    status: 'success',
    results: rows[0].length,
    data: {
      bookings: rows[0]
    }
  });
});

exports.getBookingsByHost = catchAsync(async (req, res, next) => {
  const hostId = req.user?.id;
  
  if (!hostId) {
    return next(new AppError('Host ID missing from authentication', 401));
  }

  await autoCompleteBookings();
  
  // Use direct query instead of stored procedure to ensure host_name is included
  const [rows] = await pool.query(`
    SELECT 
      b.id AS booking_id,
      b.listing_id,
      l.title,
      b.client_id,
      u.name AS client_name,
      b.status,
      b.start_date AS check_in_date,   
      b.end_date AS check_out_date,    
      b.total_price,
      l.host_id,
      h.name AS host_name
    FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    JOIN users u ON u.id = b.client_id
    JOIN users h ON h.id = l.host_id
    WHERE l.host_id = ?
    ORDER BY b.created_at DESC
  `, [hostId]);

  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      bookings: rows || []
    }
  });
});
exports.getBookingsByListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;
  
  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  const [rows] = await pool.query("CALL sp_get_bookings_by_listing(?)", [listingId]);

  res.status(200).json({
    status: 'success',
    results: rows[0].length,
    data: {
      bookings: rows[0] || []
    }
  });
});

exports.getBookedDatesByListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  const [bookings] = await pool.query(`
    SELECT start_date, end_date, status
    FROM bookings
    WHERE listing_id = ? 
      AND status IN ('pending', 'approved', 'confirmed')
    ORDER BY start_date ASC
  `, [listingId]);

  // Generate array of unavailable dates
  const unavailableDates = [];
  
  bookings.forEach(booking => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    
    // Add each date in the range
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      unavailableDates.push({
        date: d.toISOString().split('T')[0],
        status: booking.status
      });
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      listingId: parseInt(listingId),
      unavailableDates,
      bookingRanges: bookings.map(b => ({
        start: b.start_date.toISOString().split('T')[0],
        end: b.end_date.toISOString().split('T')[0],
        status: b.status
      }))
    }
  });
});

exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;
  const { status } = req.body;

  if (!id || isNaN(id)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  if (!status) {
    return next(new AppError('Status is required', 400));
  }

  const validStatuses = ['pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
  }

  // Enhanced query to get all needed data
  const [rows] = await pool.query(`
    SELECT b.*, l.host_id, l.title 
    FROM bookings b 
    JOIN listings l ON b.listing_id = l.id 
    WHERE b.id = ?
  `, [id]);

  if (!rows.length) {
    return next(new AppError('Booking not found', 404));
  }

  const booking = rows[0];

  // Enhanced authorization checks
  if (userRole === 'client') {
    if (booking.client_id !== userId) {
      return next(new AppError('You can only manage your own bookings', 403));
    }
    if (!['cancelled'].includes(status)) {
      return next(new AppError('Clients can only cancel bookings', 403));
    }
    if (['completed', 'refunded'].includes(booking.status)) {
      return next(new AppError('Cannot modify completed or refunded bookings', 400));
    }
  }

  if (userRole === 'host') {
    if (booking.host_id !== userId) {
      return next(new AppError('You can only manage bookings for your listings', 403));
    }
    if (!['confirmed', 'rejected'].includes(status)) {
      return next(new AppError('Hosts can only confirm or reject bookings', 403));
    }
    if (['completed', 'refunded', 'cancelled'].includes(booking.status)) {
      return next(new AppError('Cannot modify this booking status', 400));
    }
  }

  // Business logic validation
  if (status === 'confirmed' && booking.status !== 'pending') {
    return next(new AppError('Only pending bookings can be confirmed', 400));
  }

  let notificationsToSend = [];

  // Notification logic with enhanced messaging
  if (userRole === 'client' && status === 'cancelled') {
    notificationsToSend.push({
      userId: booking.host_id,
      message: `A client cancelled their booking for '${booking.title}'.`,
      type: 'booking_cancelled'
    });
  }

  if ((userRole === 'host' || userRole === 'admin') && (status === 'confirmed' || status === 'rejected')) {
    notificationsToSend.push({
      userId: booking.client_id,
      message: status === 'confirmed'
        ? `✅ Your booking for '${booking.title}' has been approved by the host.`
        : `❌ Your booking for '${booking.title}' has been declined by the host.`,
      type: status === 'confirmed' ? 'booking_approved' : 'booking_declined'
    });
  }

  if (userRole === 'admin' && !['cancelled', 'confirmed', 'rejected'].includes(status)) {
    notificationsToSend.push({
      userId: booking.client_id,
      message: `Admin changed your booking for '${booking.title}' to '${status}'.`,
      type: 'admin_notice'
    });
  }

  // Save booking history
  await pool.query(
    `INSERT INTO booking_history (booking_id, user_id, role, old_status, new_status, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, userRole, booking.status, status, `Changed via API by ${userRole}`]
  );

  // Update booking
  await pool.query(
    `UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, id]
  );

  // Send all notifications
  for (const notif of notificationsToSend) {
    await createNotification(notif);
  }

  res.status(200).json({
    status: 'success',
    message: `Booking status updated to '${status}' successfully`,
    data: {
      bookingId: parseInt(id),
      previousStatus: booking.status,
      newStatus: status,
      updatedBy: userRole,
      updatedAt: new Date().toISOString()
    }
  });
});

exports.getBookingHistory = catchAsync(async (req, res, next) => {
  const bookingId = req.params.id;

  if (!bookingId || isNaN(bookingId)) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  const [history] = await pool.query(`
    SELECT bh.*, u.name AS changed_by_name
    FROM booking_history bh
    JOIN users u ON bh.user_id = u.id
    WHERE bh.booking_id = ?
    ORDER BY bh.changed_at DESC`, [bookingId]);

  res.status(200).json({
    status: 'success',
    results: history.length,
    data: {
      history
    }
  });
})

// exports.markAsCompleted = async (req, res) => {
//   const bookingId = req.params.id;

//   try {
//     await pool.query('CALL sp_update_booking_status(?, ?)', [bookingId, 'completed']);
//     res.json({ message: 'Booking marked as completed' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Failed to mark as completed', error: err.message });
//   }
// };

// exports.markBookingCompleted = async (req, res) => {
//   const { bookingId } = req.params;

//   try {
//     await pool.query('CALL sp_mark_booking_completed(?)', [bookingId]);
//     res.json({ message: 'Booking marked as completed' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Failed to complete booking', error: err.message });
//   }
// };