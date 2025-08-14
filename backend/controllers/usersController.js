const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {sendVerificationCode} = require('../utils/emailService');
const {sendResetCode} = require('../utils/emailService');

exports.createUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const [rows] = await pool.query(
      'INSERT INTO users (name, email, password, role, verification_code) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'client', code]
    );

    await sendVerificationCode(email, code);

    res.status(201).json({ message: 'User created. Verification code sent to email.', userId: rows.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ message: 'User not found' });

    const user = users[0];

    if (user.verification_code !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await pool.query('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?', [user.id]);

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendResetPasswordCode = async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ message: 'Email not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('UPDATE users SET reset_code = ? WHERE email = ?', [code, email]);

    await sendResetCode(email, code);
    res.json({ message: 'Reset code sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ message: 'Email not found' });

    const user = users[0];
    if (user.reset_code !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = ?, reset_code = NULL WHERE email = ?',
      [hashedPassword, email]
    );

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

console.log("Login route hit");
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // 🔹 Check if banned
    if (user.is_banned === 1) {
      return res.status(403).json({ message: 'Your account has been banned. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.checkMyBanStatus = async (req, res) => {
  try {
    const userId = req.user.id; // from token middleware
    const [rows] = await pool.query(
      "SELECT is_banned FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Always return 200 with banned boolean
    res.status(200).json({ banned: rows[0].is_banned === 1 });
  } catch (err) {
    console.error("Error checking ban status:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.promoteToHost = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      'UPDATE users SET role = "host" WHERE id = ?',
      [id]
    );

    res.json({ message: 'User promoted to host' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.demoteToClient = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      'UPDATE users SET role = "client" WHERE id = ?',
      [id]
    );

    res.json({ message: 'User demoted to client' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};


// Update profile
exports.updateMyProfile = async (req, res) => {
  const { name, email } = req.body;

  try {
    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Old password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ message: 'Error changing password', error: err.message });
  }
};
