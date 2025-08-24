// backend/controllers/usersController.js - FIXED VERSION
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationCode, sendResetCode } = require('../utils/emailService');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.createUser = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return next(new AppError('Name, email, and password are required', 400));
  }

  // Check if user already exists
  const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUsers.length > 0) {
    return next(new AppError('Email already exists', 409));
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, verification_code, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'client', code, 0]
    );

    // Send verification email
    try {
      await sendVerificationCode(email, code);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'User created successfully. Please check your email for verification code.',
      data: {
        userId: result.insertId,
        email: email,
        name: name,
        needsVerification: true
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return next(new AppError('Email address already exists', 409));
    }
    throw error;
  }
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return next(new AppError('Email and verification code are required', 400));
  }

  const [users] = await pool.query(
    'SELECT id, name, verification_code, is_verified FROM users WHERE email = ?',
    [email]
  );
  
  if (users.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = users[0];

  if (user.is_verified === 1) {
    return next(new AppError('Email is already verified', 400));
  }

  if (user.verification_code !== code) {
    return next(new AppError('Invalid verification code', 400));
  }

  await pool.query(
    'UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?',
    [user.id]
  );

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
    data: {
      userId: user.id,
      name: user.name,
      verified: true
    }
  });
});

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  const [users] = await pool.query(
    'SELECT id, name, email, password, role, is_banned, is_verified, failed_attempts, locked_until FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    return next(new AppError('Invalid email or password', 401));
  }

  const user = users[0];

  // Check if banned
  if (user.is_banned === 1) {
    return next(new AppError('Your account has been banned. Please contact support.', 403));
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const unlockTime = new Date(user.locked_until).toLocaleString();
    return next(new AppError(`Account is locked until ${unlockTime} due to multiple failed login attempts`, 423));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    // Increment failed attempts
    const newFailedAttempts = (user.failed_attempts || 0) + 1;
    let lockUntil = null;

    // Lock account after 5 failed attempts
    if (newFailedAttempts >= 5) {
      lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    await pool.query(
      'UPDATE users SET failed_attempts = ?, locked_until = ?, last_failed_login = NOW() WHERE id = ?',
      [newFailedAttempts, lockUntil, user.id]
    );

    if (lockUntil) {
      return next(new AppError('Account locked due to too many failed login attempts. Try again in 15 minutes.', 423));
    }

    return next(new AppError('Invalid email or password', 401));
  }

  // Reset failed attempts on successful login
  await pool.query(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
    [user.id]
  );

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
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
        role: user.role,
        isVerified: user.is_verified === 1
      }
    }
  });
});

exports.sendResetPasswordCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  const [users] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
  
  if (users.length === 0) {
    return next(new AppError('No user found with that email address', 404));
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await pool.query('UPDATE users SET reset_code = ? WHERE email = ?', [code, email]);

  try {
    await sendResetCode(email, code);
    res.status(200).json({
      status: 'success',
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Reset code email failed:', error);
    return next(new AppError('Failed to send reset code. Please try again.', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return next(new AppError('Email, code, and new password are required', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters long', 400));
  }

  const [users] = await pool.query('SELECT id, reset_code FROM users WHERE email = ?', [email]);
  
  if (users.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const user = users[0];
  if (user.reset_code !== code) {
    return next(new AppError('Invalid reset code', 400));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await pool.query(
    'UPDATE users SET password = ?, reset_code = NULL, updated_at = NOW() WHERE email = ?',
    [hashedPassword, email]
  );

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful'
  });
});

exports.getMyProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const [rows] = await pool.query(
    'SELECT id, name, email, role, is_verified, phone, bio, location, profile_picture, created_at FROM users WHERE id = ?',
    [userId]
  );

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
  const { name, phone, bio, location } = req.body;
  const userId = req.user.id;

  if (!name && !phone && !bio && !location) {
    return next(new AppError('At least one field must be provided for update', 400));
  }

  let updateFields = [];
  let values = [];

  if (name) {
    if (name.length < 2 || name.length > 100) {
      return next(new AppError('Name must be between 2 and 100 characters', 400));
    }
    updateFields.push('name = ?');
    values.push(name);
  }

  if (phone) {
    updateFields.push('phone = ?');
    values.push(phone);
  }

  if (bio) {
    if (bio.length > 500) {
      return next(new AppError('Bio cannot exceed 500 characters', 400));
    }
    updateFields.push('bio = ?');
    values.push(bio);
  }

  if (location) {
    updateFields.push('location = ?');
    values.push(location);
  }

  values.push(userId);

  const [result] = await pool.query(
    `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values
  );

  if (result.affectedRows === 0) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      updatedFields: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(bio && { bio }),
        ...(location && { location })
      }
    }
  });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return next(new AppError('Old password and new password are required', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters long', 400));
  }

  if (oldPassword === newPassword) {
    return next(new AppError('New password must be different from the current password', 400));
  }

  const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
  
  if (rows.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const match = await bcrypt.compare(oldPassword, rows[0].password);
  
  if (!match) {
    return next(new AppError('Current password is incorrect', 400));
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await pool.query(
    'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', 
    [hashed, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
});

// Role management functions
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