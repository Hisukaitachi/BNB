// backend/controllers/bookingsController.js - CLEANED & OPTIMIZED
const pool = require('../db');
const { createNotification } = require('./notificationsController');
const autoCompleteBookings = require('../utils/autoCompleteBookings');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

// ==========================================
// CREATE BOOKING
// ==========================================
exports.createBooking = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;
  const { 
    listing_id, 
    start_date, 
    end_date, 
    total_price,
    booking_type = 'book', // 'book' (full payment) or 'reserve' (50% deposit)
    remaining_payment_method = 'platform' // 'platform' or 'personal'
  } = req.body;

  // Validation
  if (!listing_id || !start_date || !end_date || !total_price) {
    return next(new AppError('Listing ID, dates, and total price are required', 400));
  }

  if (!['book', 'reserve'].includes(booking_type)) {
    return next(new AppError('Booking type must be "book" or "reserve"', 400));
  }

  if (booking_type === 'reserve' && !['platform', 'personal'].includes(remaining_payment_method)) {
    return next(new AppError('Remaining payment method must be "platform" or "personal"', 400));
  }

  // Date validation
  const today = new Date().toISOString().split('T')[0];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return next(new AppError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return next(new AppError('Invalid date values', 400));
  }

  if (start_date < today) {
    return next(new AppError('Start date cannot be in the past', 400));
  }

  if (end_date <= start_date) {
    return next(new AppError('End date must be after start date', 400));
  }

  const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  if (daysDifference > 365) {
    return next(new AppError('Booking cannot exceed 365 days', 400));
  }

  // Check listing exists
  const [listings] = await pool.query('SELECT * FROM listings WHERE id = ?', [listing_id]);
  if (!listings.length) {
    return next(new AppError('Listing not found', 404));
  }

  const listing = listings[0];

  if (listing.host_id === clientId) {
    return next(new AppError('You cannot book your own listing', 400));
  }

  // Check for date conflicts
  const [conflicts] = await pool.query(`
    SELECT id, start_date, end_date, status
    FROM bookings
    WHERE listing_id = ?
      AND status IN ('pending', 'approved', 'confirmed', 'arrived')
      AND NOT (end_date <= ? OR start_date >= ?)
  `, [listing_id, start_date, end_date]);

  if (conflicts.length > 0) {
    return next(new AppError('Selected dates conflict with existing bookings', 409));
  }

  // Calculate pricing based on booking type
  let depositAmount = 0;
  let remainingAmount = 0;
  let paymentDueDate = null;

  if (booking_type === 'reserve') {
    depositAmount = Math.round(total_price * 0.5 * 100) / 100; // 50% deposit
    remainingAmount = Math.round((total_price - depositAmount) * 100) / 100;
    
    // Payment due 3 days before check-in
    paymentDueDate = new Date(start_date);
    paymentDueDate.setDate(paymentDueDate.getDate() - 3);
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Final conflict check within transaction
    const [finalCheck] = await connection.query(`
      SELECT id FROM bookings
      WHERE listing_id = ?
        AND status IN ('pending', 'approved', 'confirmed', 'arrived')
        AND NOT (end_date <= ? OR start_date >= ?)
      FOR UPDATE
    `, [listing_id, start_date, end_date]);

    if (finalCheck.length > 0) {
      await connection.rollback();
      return next(new AppError('Dates no longer available', 409));
    }

    // Create booking
    const [result] = await connection.query(`
      INSERT INTO bookings (
        listing_id, client_id, start_date, end_date, total_price,
        booking_type, deposit_amount, remaining_amount, 
        remaining_payment_method, payment_due_date,
        deposit_paid, remaining_paid, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      listing_id, clientId, start_date, end_date, total_price,
      booking_type, depositAmount, remainingAmount,
      remaining_payment_method, paymentDueDate,
      0, 0, 'pending'
    ]);

    await connection.commit();

    const bookingId = result.insertId;

    // Send notifications
    const bookingTypeText = booking_type === 'book' ? 'booking' : 'reservation';
    const paymentInfo = booking_type === 'book' 
      ? `Full payment: ₱${total_price}` 
      : `Deposit: ₱${depositAmount} (50%), Remaining: ₱${remainingAmount}`;

    await createNotification({
      userId: listing.host_id,
      message: `New ${bookingTypeText} request for '${listing.title}' from ${req.user.name}. ${paymentInfo}`,
      type: 'booking_request'
    });

    await createNotification({
      userId: clientId,
      message: `Your ${bookingTypeText} request for '${listing.title}' has been sent. ${paymentInfo}`,
      type: 'booking_sent'
    });

    res.status(201).json({
      status: 'success',
      message: `${booking_type === 'book' ? 'Booking' : 'Reservation'} request created successfully`,
      data: {
        bookingId,
        booking: {
          listing: listing.title,
          dates: `${start_date} to ${end_date}`,
          duration: `${daysDifference} day(s)`,
          bookingType: booking_type,
          totalPrice: total_price,
          ...(booking_type === 'reserve' && {
            depositAmount,
            remainingAmount,
            remainingPaymentMethod: remaining_payment_method,
            paymentDueDate: paymentDueDate?.toISOString().split('T')[0]
          }),
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

// ==========================================
// GET BOOKINGS BY CLIENT
// ==========================================
exports.getBookingsByClient = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;
  await autoCompleteBookings();
  
  const [rows] = await pool.query(`
    SELECT 
      b.*,
      l.title,
      l.location,
      l.price_per_night,
      l.image_url,
      u.name AS host_name,
      u.id AS host_id,
      p.id AS payment_id,
      p.status AS payment_status,
      p.payment_intent_id,
      p.amount AS payment_amount
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    JOIN users u ON l.host_id = u.id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE b.client_id = ?
    ORDER BY b.created_at DESC
  `, [clientId]);

  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: { bookings: rows }
  });
});

// ==========================================
// GET BOOKINGS BY HOST
// ==========================================
exports.getBookingsByHost = catchAsync(async (req, res, next) => {
  const hostId = req.user?.id;
  
  if (!hostId) {
    return next(new AppError('Host ID missing', 401));
  }

  await autoCompleteBookings();
  
  const [rows] = await pool.query(`
    SELECT 
      b.*,
      l.title,
      l.location,
      u.name AS client_name,
      u.email AS client_email,
      u.phone AS client_phone,
      h.name AS host_name,
      p.status AS payment_status,
      p.amount AS payment_amount
    FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    JOIN users u ON u.id = b.client_id
    JOIN users h ON h.id = l.host_id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE l.host_id = ?
    ORDER BY b.created_at DESC
  `, [hostId]);

  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: { bookings: rows || [] }
  });
});

// ==========================================
// GET BOOKINGS BY LISTING
// ==========================================
exports.getBookingsByListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;
  
  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  try {
    const [rows] = await pool.query("CALL sp_get_bookings_by_listing(?)", [listingId]);
    res.status(200).json({
      status: 'success',
      results: rows[0].length,
      data: { bookings: rows[0] || [] }
    });
  } catch (error) {
    // Fallback if stored procedure doesn't exist
    const [rows] = await pool.query(`
      SELECT b.*, u.name AS client_name 
      FROM bookings b
      JOIN users u ON b.client_id = u.id
      WHERE b.listing_id = ?
      ORDER BY b.start_date DESC
    `, [listingId]);
    
    res.status(200).json({
      status: 'success',
      results: rows.length,
      data: { bookings: rows }
    });
  }
});

// ==========================================
// GET BOOKED DATES BY LISTING (Calendar)
// ==========================================
exports.getBookedDatesByListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  const [bookings] = await pool.query(`
    SELECT start_date, end_date, status
    FROM bookings
    WHERE listing_id = ? 
      AND status IN ('pending', 'approved', 'confirmed', 'arrived')
    ORDER BY start_date ASC
  `, [listingId]);

  const unavailableDates = [];
  
  bookings.forEach(booking => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    
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

// ==========================================
// UPDATE BOOKING STATUS
// ==========================================
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

  const validStatuses = ['pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed', 'arrived'];
  if (!validStatuses.includes(status)) {
    return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
  }

  // Get booking details with payment info
  const [rows] = await pool.query(`
    SELECT b.*, l.host_id, l.title, p.status AS payment_status
    FROM bookings b 
    JOIN listings l ON b.listing_id = l.id 
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE b.id = ?
  `, [id]);

  if (!rows.length) {
    return next(new AppError('Booking not found', 404));
  }

  const booking = rows[0];

  // Authorization checks
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
    
    if (booking.status === 'pending' && !['approved', 'rejected'].includes(status)) {
      return next(new AppError('Hosts can only approve or reject pending bookings', 403));
    }
    
    if (booking.status === 'confirmed' && !['arrived', 'cancelled'].includes(status)) {
      return next(new AppError('Confirmed bookings can only be marked as arrived or cancelled', 403));
    }
    
    if (booking.status === 'arrived' && !['completed', 'cancelled'].includes(status)) {
      return next(new AppError('Arrived bookings can only be marked as completed or cancelled', 403));
    }
    
    if (['completed', 'refunded'].includes(booking.status)) {
      return next(new AppError('Cannot modify completed or refunded bookings', 400));
    }
  }

  // Business logic validation
  if (status === 'approved' && booking.status !== 'pending') {
    return next(new AppError('Only pending bookings can be approved', 400));
  }
  
  if (status === 'arrived' && booking.status !== 'confirmed') {
    return next(new AppError('Only confirmed bookings can be marked as arrived', 400));
  }
  
  // Check if today is the check-in date for arrivals
  if (status === 'arrived' && booking.status === 'confirmed') {
    const today = new Date().toISOString().split('T')[0];
    const checkInDate = booking.start_date.toISOString().split('T')[0];
    const dayAfter = new Date(new Date(checkInDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (today !== checkInDate && today !== dayAfter) {
      return next(new AppError('Guests can only be marked as arrived on their check-in date or the day after', 400));
    }
  }
  
  if (status === 'completed' && !['arrived', 'confirmed'].includes(booking.status)) {
    return next(new AppError('Only arrived or confirmed bookings can be marked as completed', 400));
  }

  let notificationsToSend = [];

  // Client cancels booking
  if (userRole === 'client' && status === 'cancelled') {
    notificationsToSend.push({
      userId: booking.host_id,
      message: `A client cancelled their booking for '${booking.title}'.`,
      type: 'booking_cancelled'
    });
    
    // Notify admins for refund review
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      notificationsToSend.push({
        userId: admin.id,
        message: `Client cancelled booking #${id} for '${booking.title}'. Type: ${booking.booking_type || 'book'}. Amount: ₱${booking.total_price}. Review for potential refund.`,
        type: 'admin_cancellation_review'
      });
    }
  }

  // Host approves - notify client to pay
  if (userRole === 'host' && status === 'approved') {
    notificationsToSend.push({
      userId: booking.client_id,
      message: `🎉 Your booking for '${booking.title}' has been approved! Please complete payment to confirm your reservation.`,
      type: 'booking_approved_payment_required'
    });
  }

  // Host rejects
  if (userRole === 'host' && status === 'rejected') {
    notificationsToSend.push({
      userId: booking.client_id,
      message: `❌ Your booking request for '${booking.title}' has been declined by the host.`,
      type: 'booking_declined'
    });
  }

  // Host marks as arrived
  if (userRole === 'host' && status === 'arrived') {
    notificationsToSend.push({
      userId: booking.client_id,
      message: `🏠 Welcome! Your host has confirmed your arrival at '${booking.title}'. Enjoy your stay!`,
      type: 'booking_arrived'
    });
  }

  // Booking completed
  if (userRole === 'host' && status === 'completed') {
    notificationsToSend.push({
      userId: booking.client_id,
      message: `✅ Your stay at '${booking.title}' has been marked as completed. Thank you for choosing our property!`,
      type: 'booking_completed'
    });
  }

  // Admin changes
  if (userRole === 'admin' && !['cancelled', 'approved', 'rejected', 'arrived', 'completed'].includes(status)) {
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
      updatedAt: new Date().toISOString(),
      requiresPayment: status === 'approved',
      isCheckedIn: status === 'arrived',
      isCompleted: status === 'completed',
      willAutoComplete: status === 'arrived' && status !== 'completed'
    }
  });
});

// ==========================================
// GET BOOKING HISTORY
// ==========================================
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
    ORDER BY bh.changed_at DESC
  `, [bookingId]);

  res.status(200).json({
    status: 'success',
    results: history.length,
    data: { history }
  });
});

// ==========================================
// UPDATE CUSTOMER INFO (ID Verification)
// ==========================================
exports.updateCustomerInfo = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const clientId = req.user.id;
  
  console.log('📝 Received customer info update request');
  console.log('Booking ID:', bookingId);
  console.log('Files received:', req.files); // Should be an array now
  console.log('Body:', req.body);
  
  const {
    fullName, email, phone, birthDate, address, city,
    postalCode, country, emergencyContact, emergencyPhone, idType
  } = req.body;

  // Validate required fields
  if (!fullName || !email || !phone || !birthDate || !address || !city) {
    return next(new AppError('Missing required customer information', 400));
  }

  // Check booking ownership
  const [bookings] = await pool.query(
    'SELECT id, client_id, status FROM bookings WHERE id = ? AND client_id = ?',
    [bookingId, clientId]
  );

  if (!bookings.length) {
    return next(new AppError('Booking not found or unauthorized', 404));
  }

  // Handle ID document uploads - req.files is now an array
  let idFrontUrl = null;
  let idBackUrl = null;
  
  if (req.files && req.files.length > 0) {
    console.log('📁 Processing uploaded files:', req.files.length);
    console.log('File 1:', req.files[0].filename);
    idFrontUrl = `/uploads/ids/${req.files[0].filename}`;
    
    if (req.files.length > 1) {
      console.log('File 2:', req.files[1].filename);
      idBackUrl = `/uploads/ids/${req.files[1].filename}`;
    }
  }
  
  // Create customer info JSON
  const customerInfoJson = JSON.stringify({
    fullName, 
    email, 
    phone, 
    birthDate, 
    address, 
    city,
    postalCode, 
    country: country || 'Philippines', 
    emergencyContact, 
    emergencyPhone,
    idFrontUrl,
    idBackUrl,
    uploadedAt: new Date().toISOString()
  });

  try {
    await pool.query(
      `UPDATE bookings 
       SET customer_info = ?, id_type = ?, id_verified = 1, updated_at = NOW()
       WHERE id = ? AND client_id = ?`,
      [customerInfoJson, idType || 'not_specified', bookingId, clientId]
    );
    
    console.log('✅ Customer info saved successfully');
    console.log('ID Front:', idFrontUrl);
    console.log('ID Back:', idBackUrl);
    
    res.status(200).json({
      status: 'success',
      message: 'Customer information saved successfully',
      data: {
        bookingId: parseInt(bookingId),
        idType,
        hasIdDocuments: !!(idFrontUrl || idBackUrl),
        idFrontUrl,
        idBackUrl
      }
    });
    
  } catch (error) {
    console.error('❌ Database error:', error);
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return next(new AppError('Database schema needs update. Run: ALTER TABLE bookings ADD COLUMN customer_info JSON, ADD COLUMN id_type VARCHAR(50), ADD COLUMN id_verified TINYINT(1) DEFAULT 0', 500));
    }
    throw error;
  }
});

// ==========================================
// GET BOOKING CUSTOMER INFO (Host Only)
// ==========================================
exports.getBookingCustomerInfo = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // Only hosts can view customer information
  if (userRole !== 'host') {
    return next(new AppError('Only hosts can view customer information', 403));
  }

  // Verify host owns this booking's listing
  const [bookings] = await pool.query(`
    SELECT b.*, l.host_id 
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    WHERE b.id = ? AND l.host_id = ?
  `, [bookingId, userId]);

  if (!bookings.length) {
    return next(new AppError('Booking not found or you do not have permission to view it', 404));
  }

  const booking = bookings[0];

  res.status(200).json({
    status: 'success',
    data: {
      customerInfo: booking.customer_info,
      idType: booking.id_type,
      idVerified: booking.id_verified === 1
    }
  });
});

// ==========================================
// ADMIN CANCEL BOOKING (with Refund)
// ==========================================
exports.adminCancelBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { reason, refundAmount } = req.body;
  const adminId = req.user.id;

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  if (!reason) {
    return next(new AppError('Cancellation reason required', 400));
  }

  const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);

  if (!bookings.length) {
    return next(new AppError('Booking not found', 404));
  }

  const booking = bookings[0];

  if (['cancelled', 'completed'].includes(booking.status)) {
    return next(new AppError('Cannot cancel this booking', 400));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Cancel booking
    await connection.query(
      'UPDATE bookings SET status = ?, cancellation_reason = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', `Admin: ${reason}`, bookingId]
    );

    // Process refund if amount specified
    if (refundAmount && refundAmount > 0) {
      await connection.query(
        'INSERT INTO refunds (booking_id, amount, status, processed_by, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [bookingId, refundAmount, 'processing', adminId, reason]
      );
    }

    await connection.commit();

    // Notify client
    await createNotification({
      userId: booking.client_id,
      message: `Your booking has been cancelled by admin. ${refundAmount > 0 ? `Refund: ₱${refundAmount}` : ''} Reason: ${reason}`,
      type: 'admin_cancellation'
    });

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled by admin',
      data: {
        bookingId: parseInt(bookingId),
        refundAmount: refundAmount || 0,
        reason
      }
    });

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});