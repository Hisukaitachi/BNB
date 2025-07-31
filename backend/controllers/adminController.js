const pool = require('../db');

// USERS
exports.getAllUsers = async (req, res) => {
  try {
    const [result] = await pool.query('CALL sp_get_all_users()');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err });
  }
};

exports.banUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('CALL sp_ban_user(?)', [userId]);
    res.json({ message: 'User banned successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error banning user', error: err });
  }
};

exports.unbanUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('CALL sp_unban_user(?)', [userId]);
    res.json({ message: 'User unbanned successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error unbanning user', error: err });
  }
};

exports.updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  try {
    await pool.query('CALL sp_update_user_role(?, ?)', [userId, role]);
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user role', error: err });
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
    await pool.query('CALL sp_remove_listing(?)', [listingId]);
    res.json({ message: 'Listing removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing listing', error: err });
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
    await pool.query('CALL sp_cancel_booking(?)', [bookingId]);
    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error cancelling booking', error: err });
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
    await pool.query('CALL sp_update_booking_status(?, ?, ?)', [bookingId, status, changedBy]);
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
    await pool.query('CALL sp_remove_review(?)', [reviewId]);
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