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

  // Enhanced business validation
  const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  if (daysDifference > 365) {
    return next(new AppError('Booking cannot exceed 365 days', 400));
  }
  if (daysDifference < 1) {
    return next(new AppError('Minimum booking is 1 day', 400));
  }

  // Maximum advance booking (2 years)
  const maxAdvanceDays = 730;
  const advanceDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
  if (advanceDays > maxAdvanceDays) {
    return next(new AppError('Cannot book more than 2 years in advance', 400));
  }

  // Minimum advance booking (24 hours)
  if (advanceDays < 1) {
    return next(new AppError('Bookings must be made at least 24 hours in advance', 400));
  }

  // Validate total_price
  if (isNaN(total_price) || total_price <= 0) {
    return next(new AppError('Total price must be a positive number', 400));
  }

  // Maximum reasonable price check
  if (total_price > 1000000) {
    return next(new AppError('Total price exceeds maximum allowed amount', 400));
  }

  // Check if listing exists
  const [[listing]] = await pool.query('SELECT * FROM listings WHERE id = ?', [listing_id]);
  if (!listing) {
    return next(new AppError('Listing not found', 404));
  }

  // Check if user is trying to book their own listing
  if (listing.host_id === clientId) {
    return next(new AppError('You cannot book your own listing', 400));
  }

  // Validate pricing against listing price
  const expectedPrice = listing.price_per_night * daysDifference;
  const priceTolerance = expectedPrice * 0.1; // 10% tolerance
  if (Math.abs(total_price - expectedPrice) > priceTolerance) {
    return next(new AppError('Price calculation mismatch. Please refresh and try again.', 400));
  }

  const hostId = listing.host_id;

  await pool.query('CALL sp_create_booking_safe(?,?,?,?,?)',
    [listing_id, clientId, start_date, end_date, total_price]);

  // Notify Host
  await createNotification({
    userId: hostId,
    message: `New booking request for '${listing.title}' from ${req.user.name}`,
    type: 'booking_request'
  });

  // Notify Client
  await createNotification({
    userId: clientId,
    message: `Your booking request for '${listing.title}' has been sent to the host.`,
    type: 'booking_sent'
  });

  res.status(201).json({
    status: 'success',
    message: 'Booking request created successfully',
    data: {
      bookingDetails: {
        listing: listing.title,
        dates: `${start_date} to ${end_date}`,
        duration: `${daysDifference} day(s)`,
        totalPrice: total_price
      }
    }
  });
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

  await autoCompleteBookings(); // Auto-complete before fetching
  const [rows] = await pool.query("CALL sp_get_bookings_by_host(?)", [hostId]);

  res.status(200).json({
    status: 'success',
    results: rows[0].length,
    data: {
      bookings: rows[0] || []
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

  const [rows] = await pool.query("CALL sp_get_bookings_by_listing(?)", [listingId]);

  // Stored procedure results are usually nested in rows[0]
  const bookedDates = rows[0].map(b => ({
    start_date: b.start_date,
    end_date: b.end_date
  }));

  res.status(200).json({
    status: 'success',
    data: {
      bookedDates
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