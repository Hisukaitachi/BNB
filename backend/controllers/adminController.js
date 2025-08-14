const pool = require('../db');
const { createNotification } = require('./notificationsController');
const { getIo } = require('../socket');

// USERS
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.banUser = async (req, res) => {
  const { userId } = req.params;
  try {
    // 1️⃣ Ban the user in the database
    await pool.query('CALL sp_ban_user(?)', [userId]);

    // 2️⃣ Send a notification to the banned user
    await createNotification({
      userId,
      message: 'Your account has been banned by an administrator.',
      type: 'account'
    });

    // 3️⃣ Emit a real-time ban event via Socket.IO
    const io = getIo();
    if (io) {
      io.to(`user_${userId}`).emit('banned', {
        message: 'You have been banned. You will be logged out immediately.'
      });
    }

    // 4️⃣ Respond to admin
    res.json({ message: 'User banned successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error banning user', error: err });
  }
};

exports.unbanUser = async (req, res) => {
  const { userId } = req.params;
  try {
    // 1️⃣ Unban the user in the database
    await pool.query('CALL sp_unban_user(?)', [userId]);

    // 2️⃣ Send a notification to the user
    await createNotification({
      userId,
      message: 'Your account has been reactivated. You may now log in.',
      type: 'account'
    });

    // 3️⃣ Emit a real-time unban event via Socket.IO
    const io = getIo();
    if (io) {
      io.to(`user_${userId}`).emit('unbanned', {
        message: 'Your account has been reactivated. You can now log in.'
      });
    }

    // 4️⃣ Respond to admin
    res.json({ message: 'User unbanned successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error unbanning user', error: err });
  }
};

exports.checkBanStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const [rows] = await pool.query(
            "SELECT is_banned FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Always return 200, with banned boolean
        res.status(200).json({ banned: rows[0].is_banned === 1 });
    } catch (error) {
        console.error("Error checking ban status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateUserRole = async (req, res) => {
  const userId = req.body.userId || req.params.userId;
  const role = req.body.role;

  if (!userId || !role) {
    return res.status(400).json({ error: 'User ID and role are required' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await createNotification({
      userId,
      message: `Your account role has been updated to "${role}" by an administrator.`,
      type: 'role'
    });

    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// LISTINGS
exports.getAllListings = async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_get_all_listings()');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching listings', error: err });
  }
};

exports.removeListing = async (req, res) => {
  const { listingId } = req.params;

  try {
    // 1. Get the listing to check existence and grab host info
    const [listing] = await pool.query(
      'SELECT host_id, title FROM listings WHERE id = ?',
      [listingId]
    );

    if (!listing.length) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const { host_id, title } = listing[0];

    // 2. Delete related payouts first (since it references host_id)
    await pool.query('DELETE FROM payouts WHERE host_id = ?', [host_id]);

    // 3. Delete related bookings
    await pool.query('DELETE FROM bookings WHERE listing_id = ?', [listingId]);

    // 4. Delete the listing itself
    await pool.query('DELETE FROM listings WHERE id = ?', [listingId]);

    // 5. Send notification to host
    await createNotification({
      userId: host_id,
      message: `Your listing "${title}" has been removed by an administrator.`,
      type: 'listing'
    });

    res.json({ message: 'Listing, payouts, and bookings removed successfully' });
  } catch (err) {
    console.error('Error removing listing:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// BOOKINGS
exports.getAllBookings = async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_get_all_bookings()');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err });
  }
};

exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const [booking] = await pool.query(
      `SELECT b.client_id, l.host_id, l.title AS listingTitle, b.date AS bookingDate
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking.length) {
      return res.status(404).json({ error: 'Booking not found' });
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

    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  const { id: bookingId } = req.params;
  const { status } = req.body;
  const changedBy = req.user.id;

  const allowedStatuses = ['approved', 'cancelled', 'pending', 'rejected'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const [booking] = await pool.query(
      'SELECT client_id, host_id FROM bookings WHERE id = ?',
      [bookingId]
    );

    await pool.query('CALL sp_update_booking_status(?, ?, ?)', [bookingId, status, changedBy]);

    if (booking.length) {
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
    }

    res.json({ message: `Booking status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update booking status', error: err.message });
  }
};

exports.getBookingHistory = async (req, res) => {
  const { id: bookingId } = req.params;
  try {
    const [result] = await pool.query('CALL sp_get_booking_history(?)', [bookingId]);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch booking history', error: err.message });
  }
};

// REVIEWS
exports.getAllReviews = async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_get_all_reviews()');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reviews', error: err });
  }
};

exports.removeReview = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const [review] = await pool.query(
      'SELECT user_id FROM reviews WHERE id = ?',
      [reviewId]
    );

    await pool.query('CALL sp_remove_review(?)', [reviewId]);

    if (review.length) {
      await createNotification({
        userId: review[0].user_id,
        message: 'Your review has been removed by an administrator.',
        type: 'review'
      });
    }

    res.json({ message: 'Review removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing review', error: err });
  }
};

// DASHBOARD STATS
exports.getDashboardStats = async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_get_admin_dashboard()');
    const [users, listings, bookings, revenue] = result;

    res.json({
      totalUsers: users[0]?.totalUsers || 0,
      totalListings: listings[0]?.totalListings || 0,
      totalBookings: bookings[0]?.totalBookings || 0,
      totalRevenue: revenue[0]?.totalRevenue || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};


// PAYOUTS
exports.processPayout = async (req, res) => {
  const { bookingId } = req.params;
  const taxPercentage = 10; // platform fee %
  const adminId = req.user.id;

  try {
    await pool.query('CALL sp_admin_process_payout(?, ?, ?)', [
      bookingId,
      taxPercentage,
      adminId,
    ]);

    res.json({ message: 'Payout processed successfully.' });
  } catch (err) {
    console.error('Payout error:', err);
    res.status(500).json({ error: err.message || 'Failed to process payout.' });
  }
};


// ADMIN REFUND
exports.processRefund = async (req, res) => {
  const { transactionId } = req.params;
  const adminId = req.user.id; // From token (admin role)

  try {
    await pool.query('CALL sp_admin_process_refund(?, ?)', [transactionId, adminId]);
    res.json({ message: 'Refund processed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing refund', error: err.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_get_all_transactions()');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching transactions', error: err.message });
  }
};

exports.getHostsPendingPayouts = async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_get_host_earnings_for_payout()');
    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching host payouts:', err);
    res.status(500).json({ message: 'Error fetching host payouts', error: err.message });
  }
};

exports.processHostPayout = async (req, res) => {
  const { hostId } = req.params;
  const taxPercentage = 10; // or make this configurable
  const adminId = req.user.id;

  try {
    await pool.query('START TRANSACTION');

    const [earnings] = await pool.query(
      'CALL sp_get_host_earnings_for_payout_by_id(?)',
      [hostId]
    );

    const total = earnings[0][0]?.earnings;
    if (!total) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'No pending payout for this host.' });
    }

    await pool.query(
      'INSERT INTO payouts (host_id, amount, status, paid_at) VALUES (?, ?, ?, NOW())',
      [hostId, total, 'paid']
    );

    await pool.query('CALL sp_mark_bookings_paid(?)', [hostId]);

    await pool.query('COMMIT');
    res.json({ message: 'Host payout processed successfully.', amount: total });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Host payout error:', err);
    res.status(500).json({ error: err.message || 'Failed to process host payout.' });
  }
};

exports.getHostEarnings = async (req, res) => {
  const hostId = req.params.hostId;

  try {
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

    res.json({
      host_id: hostId,
      host_total_earnings: rows[0].total_earnings || 0,
      platform_fee: rows[0].platform_fee || 0,
      host_net_earnings: rows[0].net_earnings || 0,
    });
  } catch (err) {
    console.error('Error in getHostEarnings (admin):', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST: Admin marks host’s bookings as paid
exports.markHostAsPaid = async (req, res) => {
  const { hostId } = req.body;

  try {
    await pool.query('CALL sp_mark_bookings_paid(?)', [hostId]);
    res.json({ message: 'Host bookings marked as paid.' });
  } catch (err) {
    console.error('Error in markHostAsPaid (admin):', err);
    res.status(500).json({ error: 'Failed to mark as paid.' });
  }
};