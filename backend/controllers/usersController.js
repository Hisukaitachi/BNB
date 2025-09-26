// backend/controllers/usersController.js - FIXED VERSION
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;
const { sendVerificationCode, sendResetCode } = require('../utils/emailService');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

const generateProfilePictureSizes = async (inputPath, outputDir, baseFilename) => {
  const sizes = {
    thumbnail: { width: 100, height: 100 },
    small: { width: 200, height: 200 },
    medium: { width: 400, height: 400 }
  };

  const generatedFiles = {};

  for (const [sizeName, dimensions] of Object.entries(sizes)) {
    const filename = `${baseFilename}-${sizeName}.jpg`;
    const outputPath = path.join(outputDir, filename);

    await sharp(inputPath)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: sizeName === 'thumbnail' ? 90 : 85,
        progressive: true
      })
      .toFile(outputPath);

    generatedFiles[sizeName] = `/uploads/profile-pictures/${filename}`;
  }

  return generatedFiles;
};

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

exports.uploadProfilePicture = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please select a profile picture', 400));
  }

  const userId = req.user.id;
  
  try {
    // Get current profile picture to delete old files
    const [currentUser] = await pool.query(
      'SELECT profile_picture FROM users WHERE id = ?',
      [userId]
    );

    // Generate base filename without extension
    const baseFilename = `profile-${userId}-${Date.now()}`;
    
    // Generate multiple sizes
    const profilePictures = await generateProfilePictureSizes(
      req.file.path, 
      req.file.destination, 
      baseFilename
    );

    // Delete original uploaded file
    await fs.unlink(req.file.path);
    console.log('Original uploaded image processed and deleted');

    // Store the medium size as the main profile picture
    const profilePictureUrl = profilePictures.medium;

    // Update database with new profile picture
    const [result] = await pool.query(
      'UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?',
      [profilePictureUrl, userId]
    );

    if (result.affectedRows === 0) {
      return next(new AppError('User not found', 404));
    }

    // Delete old profile pictures if they exist
    if (currentUser[0]?.profile_picture) {
      // Delete all old sizes
      const oldBasePath = currentUser[0].profile_picture.replace('-medium.jpg', '');
      const sizesToDelete = ['thumbnail', 'small', 'medium'];
      
      for (const size of sizesToDelete) {
        const oldImagePath = path.join(__dirname, '..', `${oldBasePath}-${size}.jpg`);
        try {
          await fs.unlink(oldImagePath);
          console.log(`Old profile picture deleted: ${size}`);
        } catch (error) {
          console.log(`Old profile picture ${size} not found:`, error.message);
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: profilePictureUrl,
        // Optionally return all sizes for frontend flexibility
        profilePictures: profilePictures
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
        console.log('Cleaned up failed upload file');
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    throw error;
  }
});

// Updated delete function to handle multiple sizes
exports.deleteProfilePicture = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Get current profile picture
  const [user] = await pool.query(
    'SELECT profile_picture FROM users WHERE id = ?',
    [userId]
  );

  if (user.length === 0) {
    return next(new AppError('User not found', 404));
  }

  const currentProfilePicture = user[0].profile_picture;

  if (!currentProfilePicture) {
    return next(new AppError('No profile picture to delete', 400));
  }

  try {
    // Delete all sizes
    const basePath = currentProfilePicture.replace('-medium.jpg', '');
    const sizesToDelete = ['thumbnail', 'small', 'medium'];
    
    for (const size of sizesToDelete) {
      const imagePath = path.join(__dirname, '..', `${basePath}-${size}.jpg`);
      try {
        await fs.unlink(imagePath);
        console.log(`Profile picture deleted: ${size}`);
      } catch (error) {
        console.log(`Profile picture ${size} not found:`, error.message);
      }
    }
  } catch (error) {
    console.log('Error deleting profile picture files:', error.message);
    // Continue with database update even if files don't exist
  }

  // Update database to remove profile picture
  await pool.query(
    'UPDATE users SET profile_picture = NULL, updated_at = NOW() WHERE id = ?',
    [userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Profile picture deleted successfully'
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

  // Get updated user data including profile picture
  const [updatedUser] = await pool.query(
    'SELECT name, phone, bio, location, profile_picture FROM users WHERE id = ?',
    [userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: updatedUser[0]
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

// Get public profile (limited info for other users to view)
exports.getPublicProfile = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const [rows] = await pool.query(
    'SELECT id, name, role, bio, location, profile_picture, is_verified, created_at FROM users WHERE id = ? AND is_banned = 0',
    [userId]
  );

  if (rows.length === 0) {
    return next(new AppError('User not found or unavailable', 404));
  }

  const user = rows[0];
  
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        bio: user.bio || null,
        location: user.location || null,
        profilePicture: user.profile_picture || null,
        isVerified: user.is_verified === 1,
        created_at: user.created_at,
        memberSince: user.created_at
      }
    }
  });
});

// Get user's public reviews (reviews about this user)
exports.getUserReviews = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  // Check if user exists
  const [userExists] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
  if (userExists.length === 0) {
    return next(new AppError('User not found', 404));
  }

  try {
    // Updated query with JOIN to get reviewer name AND profile picture
    const [reviews] = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.booking_id,
        r.reviewer_id,
        u.name as reviewer_name,
        u.profile_picture as reviewer_profile_picture,  -- Add this
        u.role as reviewer_role  -- Add this if you want role too
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [userId]);

    // Simple stats
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalReviews,
        AVG(rating) as averageRating
      FROM reviews 
      WHERE reviewee_id = ?
    `, [userId]);

    res.status(200).json({
      status: 'success',
      data: {
        reviews: reviews || [],
        statistics: {
          totalReviews: stats[0]?.totalReviews || 0,
          averageRating: parseFloat(stats[0]?.averageRating) || 0
        }
      }
    });

  } catch (dbError) {
    console.error('Database error in getUserReviews:', dbError);
    return next(new AppError('Database error occurred', 500));
  }
});
