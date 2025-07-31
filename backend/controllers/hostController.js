const pool = require("../db");

exports.getHostEarnings = async (req, res) => {
  const { hostId } = req.params;
  try {
    const [rows] = await pool.query("CALL sp_get_host_earnings(?)", [hostId]);
    res.json({ earnings: rows[0][0].total_earnings || 0 });
  } catch (err) {
    console.error("Error fetching earnings:", err);
    res.status(500).json({ message: "Failed to fetch earnings" });
  }
};
