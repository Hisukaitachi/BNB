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

  // Validate dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    return next(new AppError('Start date cannot be in the past', 400));
  }

  if (endDate <= startDate) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Validate total_price
  if (isNaN(total_price) || total_price <= 0) {
    return next(new AppError('Total price must be a positive number', 400));
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
    message: 'Booking request created successfully'
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

  const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!rows.length) {
    return next(new AppError('Booking not found', 404));
  }

  const booking = rows[0];
  const [[listing]] = await pool.query('SELECT * FROM listings WHERE id = ?', [booking.listing_id]);

  if (!listing) {
    return next(new AppError('Associated listing not found', 404));
  }

  let notificationsToSend = [];

  // Permission checks and notification logic
  if (userRole === 'client' && status === 'cancelled') {
    if (booking.client_id !== userId) {
      return next(new AppError('You can only cancel your own bookings', 403));
    }

    notificationsToSend.push({
      userId: listing.host_id,
      message: `A client cancelled their booking for '${listing.title}'.`,
      type: 'booking_cancelled'
    });
  }

  if ((userRole === 'host' || userRole === 'admin') && (status === 'confirmed' || status === 'rejected')) {
    if (userRole === 'host' && listing.host_id !== userId) {
      return next(new AppError('Not authorized to update this booking', 403));
    }

    notificationsToSend.push({
      userId: booking.client_id,
      message: status === 'confirmed'
        ? `✅ Your booking for '${listing.title}' has been approved by the host.`
        : `❌ Your booking for '${listing.title}' has been declined by the host.`,
      type: status === 'confirmed' ? 'booking_approved' : 'booking_declined'
    });
  }

  if (userRole === 'admin' && !['cancelled', 'confirmed', 'rejected'].includes(status)) {
    notificationsToSend.push({
      userId: booking.client_id,
      message: `Admin changed your booking for '${listing.title}' to '${status}'.`,
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
    message: `Booking status updated to '${status}' successfully`
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