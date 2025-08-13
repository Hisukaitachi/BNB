const jwt = require('jsonwebtoken');
const pool = require('../db'); // <-- adjust path to your DB connection
require('dotenv').config();

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // 🔹 Check ban status in DB
    const [rows] = await pool.query('SELECT is_banned FROM users WHERE id = ?', [decoded.id]);
    if (!rows.length) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (rows[0].is_banned === 1) {
      return res.status(403).json({ message: 'Your account has been banned. Please contact support.' });
    }

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
