const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {sendVerificationCode, sendResetCode} = require('../utils/emailService');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.createUser = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Basic validation (detailed validation will be in middleware later)
  if (!name || !email || !password) {
    return next(new AppError('Name, email, and password are required', 400));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const [rows] = await pool.query(
    'INSERT INTO users (name, email, password, role, verification_code) VALUES (?, ?, ?, ?, ?)',
    [name, email, hashedPassword, 'client', code]
  );

  await sendVerificationCode(email, code);

  res.status(201).json({
    status: 'success',
    message: 'User created successfully. Verification code sent to email.',
    data: {
      userId: rows.insertId,
      email: email
    }
  });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return next(new AppError('Email and verification code are required', 400));
  }

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  
  if (users.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = users[0];

  if (user.verification_code !== code) {
    return next(new AppError('Invalid verification code', 400));
  }

  await pool.query('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?', [user.id]);

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully'
  });
});

exports.sendResetPasswordCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  
  if (users.length === 0) {
    return next(new AppError('No user found with that email address', 404));
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await pool.query('UPDATE users SET reset_code = ? WHERE email = ?', [code, email]);

  await sendResetCode(email, code);

  res.status(200).json({
    status: 'success',
    message: 'Password reset code sent to your email'
  });
});


exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return next(new AppError('Email, code, and new password are required', 400));
  }

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  
  if (users.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = users[0];
  if (user.reset_code !== code) {
    return next(new AppError('Invalid reset code', 400));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE users SET password = ?, reset_code = NULL WHERE email = ?',
    [hashedPassword, email]
  );

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful'
  });
});

console.log("Login route hit");
exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

  if (users.length === 0) {
    return next(new AppError('Invalid email or password', 401));
  }

  const user = users[0];

  // Check if banned
  if (user.is_banned === 1) {
    return next(new AppError('Your account has been banned. Please contact support.', 403));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1d' }
  );

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      }
    }
  });
});


exports.checkMyBanStatus = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const [rows] = await pool.query('SELECT is_banned FROM users WHERE id = ?', [userId]);

  if (rows.length === 0) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      banned: rows[0].is_banned === 1
    }
  });
});


exports.promoteToHost = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError('User ID is required', 400));
  }

  const [result] = await pool.query('UPDATE users SET role = "host" WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'User promoted to host successfully'
  });
});

exports.demoteToClient = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError('User ID is required', 400));
  }

  const [result] = await pool.query('UPDATE users SET role = "client" WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'User demoted to client successfully'
  });
});

exports.getMyProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);

  if (rows.length === 0) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: rows[0]
    }
  });
});

exports.updateMyProfile = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  if (!name && !email) {
    return next(new AppError('At least one field (name or email) is required', 400));
  }

  let updateFields = [];
  let values = [];

  if (name) {
    updateFields.push('name = ?');
    values.push(name);
  }
  if (email) {
    updateFields.push('email = ?');
    values.push(email);
  }

  values.push(userId);

  const [result] = await pool.query(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    values
  );

  if (result.affectedRows === 0) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully'
  });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return next(new AppError('Old password and new password are required', 400));
  }

  const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
  
  if (rows.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = rows[0];
  const match = await bcrypt.compare(oldPassword, user.password);
  
  if (!match) {
    return next(new AppError('Current password is incorrect', 400));
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
});