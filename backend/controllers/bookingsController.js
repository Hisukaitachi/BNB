const pool = require('../db');
const { createNotification } = require('./notificationsController');

exports.createBooking = async (req, res) => {
  const clientId = req.user.id;
  const { listing_id, start_date, end_date, total_price } = req.body;

  try {
    const [[listing]] = await pool.query('SELECT * FROM listings WHERE id = ?', [listing_id]);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const hostId = listing.host_id;

    await pool.query('CALL sp_create_booking_safe(?,?,?,?,?)',
      [listing_id, clientId, start_date, end_date, total_price]);

    // Notify Host
    await createNotification({
      userId: hostId,
      message: `New booking request for '${listing.title}' from ${req.user.name}`,
      type: 'booking_request'
    });

    // 🔥 Notify Client (this was missing)
    await createNotification({
      userId: clientId,
      message: `Your booking request for '${listing.title}' has been sent to the host.`,
      type: 'booking_sent'
    });

    res.status(201).json({ message: 'Booking request created, host and client notified' });

  } catch (err) {
    console.error(err);
    if (err.errno === 1644) {
      return res.status(400).json({ message: err.sqlMessage });
    }
    res.status(500).json({ message: 'Booking failed', error: err.message });
  }
};

exports.getBookingsByClient = async (req, res) => {
  const clientId = req.user.id;
  try {
    const [rows] = await pool.query('CALL sp_get_bookings_by_client(?)', [clientId]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
  }
};

exports.getBookingsByHost = async (req, res) => {
  const hostId = req.user.id;
  try {
    const [rows] = await pool.query('CALL sp_get_bookings_by_host(?)', [hostId]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch host bookings', error: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Booking not found' });

    const booking = rows[0];
    const [[listing]] = await pool.query('SELECT * FROM listings WHERE id = ?', [booking.listing_id]);

    let notificationsToSend = [];

    if (userRole === 'client' && status === 'cancelled') {
      if (booking.client_id !== userId) return res.status(403).json({ message: 'You can only cancel your own bookings' });

      notificationsToSend.push({
        userId: listing.host_id,
        message: `A client cancelled their booking for '${listing.title}'.`,
        type: 'booking_cancelled'
      });
    }

    if ((userRole === 'host' || userRole === 'admin') && (status === 'confirmed' || status === 'rejected')) {
      if (userRole === 'host' && listing.host_id !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this booking' });
      }

      notificationsToSend.push({
        userId: booking.client_id,
        message: `Your booking for '${listing.title}' has been ${status}.`,
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

    // Send all notifications (client + host if needed)
    for (const notif of notificationsToSend) {
      await createNotification(notif);
    }

    res.json({ message: `Booking status updated to '${status}'` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
};

exports.getBookingHistory = async (req, res) => {
  const bookingId = req.params.id;

  try {
    const [history] = await pool.query(`
      SELECT bh.*, u.name AS changed_by_name
      FROM booking_history bh
      JOIN users u ON bh.user_id = u.id
      WHERE bh.booking_id = ?
      ORDER BY bh.changed_at DESC`, [bookingId]);

    res.json(history);
  } catch (err) {
    console.error('Error fetching booking history:', err);
    res.status(500).json({ message: 'Failed to fetch booking history', error: err.message });
  }
};

exports.markAsCompleted = async (req, res) => {
  const bookingId = req.params.id;

  try {
    await pool.query('CALL sp_update_booking_status(?, ?)', [bookingId, 'completed']);
    res.json({ message: 'Booking marked as completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark as completed', error: err.message });
  }
};

