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

  // Enhanced validation
  if (name.length < 2 || name.length > 100) {
    return next(new AppError('Name must be between 2 and 100 characters', 400));
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  // Password strength validation
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return next(new AppError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', 400));
  }

  // Check for common weak passwords
  const commonPasswords = ['12345678', 'password', 'Password123', 'qwerty123'];
  if (commonPasswords.includes(password)) {
    return next(new AppError('Please choose a stronger password', 400));
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds
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
        email: email,
        name: name
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

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address', 400));
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

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const unlockTime = new Date(user.locked_until).toLocaleString();
    return next(new AppError(`Account is locked until ${unlockTime} due to multiple failed login attempts`, 423));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    // Increment failed attempts
    await pool.query(
      'UPDATE users SET failed_attempts = failed_attempts + 1, last_failed_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Lock account after 5 failed attempts
    if (user.failed_attempts >= 4) { // Will be 5 after the increment
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await pool.query(
        'UPDATE users SET locked_until = ? WHERE id = ?',
        [lockUntil, user.id]
      );
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
        role: user.role,
        lastLogin: user.last_login
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

  // Enhanced validation
  if (name && (name.length < 2 || name.length > 100)) {
    return next(new AppError('Name must be between 2 and 100 characters', 400));
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    // Check if email is already taken by another user
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    
    if (existingUser.length > 0) {
      return next(new AppError('Email address is already in use', 409));
    }
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
        ...(email && { email })
      },
      updatedAt: new Date().toISOString()
    }
  });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return next(new AppError('Old password and new password are required', 400));
  }

  // Enhanced password validation for new password
  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters long', 400));
  }

  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumbers = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return next(new AppError('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', 400));
  }

  // Check if new password is different from old password
  if (oldPassword === newPassword) {
    return next(new AppError('New password must be different from the current password', 400));
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

  const hashed = await bcrypt.hash(newPassword, 12);
  await pool.query(
    'UPDATE users SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?', 
    [hashed, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
    data: {
      passwordChangedAt: new Date().toISOString()
    }
  });
});