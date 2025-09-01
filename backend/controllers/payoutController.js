// controllers/payoutController.js
const pool = require('../db');

// Release a payout
exports.releasePayout = async (req, res) => {
  const { host_id, booking_id, amount } = req.body;

  try {
    const [result] = await pool.query(
      "CALL sp_release_payout(?, ?, ?)",
      [host_id, booking_id, amount]
    );

    res.status(200).json({ 
      message: "Payout released successfully", 
      result: result[0] || [] 
    });
  } catch (err) {
    console.error("Error releasing payout:", err);
    res.status(400).json({ message: err.sqlMessage || err.message });
  }
};

// Admin: get all payouts
exports.getAllPayouts = async (req, res) => {
  try {
    const [rows] = await pool.query("CALL sp_get_all_payouts()");
    res.json({ payouts: rows[0] || [] }); 
  } catch (err) {
    console.error("Error fetching all payouts:", err);
    res.status(500).json({ message: "Error fetching payouts." });
  }
};

// Host: summary of earnings + detailed payouts (MERGED)
exports.getHostEarnings = async (req, res) => {
  const hostId = req.user.id;

  try {
    // ✅ Stored procedure should return 2 result sets:
    //   1. Summary with total_earnings
    //   2. List of payouts
    const [results] = await pool.query("CALL sp_get_host_earnings(?)", [hostId]);

    const summary = results[0]?.[0] || { total_earnings: 0 };
    const payouts = results[1] || [];

    res.json({
      totalEarnings: summary.total_earnings,
      payouts
    });
  } catch (error) {
    console.error("Error fetching host earnings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Host: list of received payouts (if you want to keep it separate)
exports.getReceivedPayoutsByHost = async (req, res) => {
  const hostId = req.user.id;

  try {
    const [rows] = await pool.query("CALL sp_get_received_payouts_by_host(?)", [hostId]);
    res.json({ payouts: rows[0] || [] });
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

