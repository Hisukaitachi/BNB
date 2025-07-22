const pool = require('../db');

exports.getMyPayments = async (req, res) => {
  const userId = req.user.id;
  const role   = req.user.role;

  try {
    let rows;
    if (role === 'host') {
      // Payments where host receives payout
      [rows] = await pool.query('SELECT * FROM payments WHERE host_id = ? ORDER BY created_at DESC', [userId]);
    } else {
      // Client payments
      [rows] = await pool.query('SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC', [userId]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payments', error: err.message });
  }
};