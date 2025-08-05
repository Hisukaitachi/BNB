const pool = require('../db');

// Release a payout
exports.releasePayout = async (req, res) => {
  const { host_id, booking_id, amount } = req.body;

  try {
    const [result] = await pool.query(
      "CALL sp_release_payout(?, ?, ?)",
      [host_id, booking_id, amount]
    );
    res.status(200).json({ message: "Payout released successfully", result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};


// Admin: get all payouts
exports.getAllPayouts = async (req, res) => {
  try {
    const [rows] = await pool.query('CALL sp_get_all_payouts()');
    res.json(rows[0]); // Stored procedure returns nested arrays
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching payouts.' });
  }
};


// Host: view their payouts
// controllers/payoutController.js

exports.getHostEarnings = async (req, res) => {
  const hostId = req.user.id;

  try {
    const [resultSets] = await pool.query('CALL sp_get_host_earnings(?)', [hostId]);

    const summary = resultSets[0]?.[0] || { total_earnings: 0 };
    const payouts = resultSets[1] || [];

    res.json({
      totalEarnings: summary.total_earnings,
      payouts
    });
  } catch (error) {
    console.error("Error fetching host earnings:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getReceivedPayoutsByHost = async (req, res) => {
  const hostId = req.user.id;

  try {
    const [results] = await pool.query(
      `SELECT * FROM payouts WHERE host_id = ? ORDER BY created_at DESC`,
      [hostId]
    );

    res.json({ payouts: results });
  } catch (err) {
    console.error("Error fetching received payouts:", err);
    res.status(500).json({ message: "Error fetching payouts." });
  }
};



// controllers/payoutController.js
// exports.getHostPayoutTotal = async (req, res) => {
//   try {
//     const hostId = req.user.id; // Get from Auth Middleware

//     const [rows] = await pool.query(
//       `SELECT IFNULL(SUM(amount), 0) AS totalPayout
//        FROM payouts
//        WHERE host_id = ?`,
//       [hostId]
//     );

//     res.status(200).json({ totalPayout: rows[0].totalPayout });
//   } catch (error) {
//     console.error("Error fetching host payout total:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

