const pool = require('../db');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.switchRole = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { newRole } = req.body;

  // Validate role
  const validRoles = ['client', 'host'];
  if (!validRoles.includes(newRole)) {
    return next(new AppError('Invalid role. Can only switch between client and host', 400));
  }

  // Get current user
  const [users] = await pool.query('SELECT role, is_verified FROM users WHERE id = ?', [userId]);
  if (!users.length) {
    return next(new AppError('User not found', 404));
  }

  const currentUser = users[0];

  // Check if already in requested role
  if (currentUser.role === newRole) {
    return next(new AppError(`You are already a ${newRole}`, 400));
  }

  // Prevent admin role changes through this endpoint
  if (currentUser.role === 'admin') {
    return next(new AppError('Admin role cannot be changed', 403));
  }

  // Additional checks for switching to host
  if (newRole === 'host') {
    if (currentUser.is_verified === 0) {
      return next(new AppError('You must verify your email before becoming a host', 400));
    }
  }

  // Update user role
  await pool.query('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', [newRole, userId]);

  // Generate new JWT with updated role
  const newToken = jwt.sign(
    { id: userId, role: newRole },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(200).json({
    status: 'success',
    message: `Successfully switched to ${newRole}`,
    data: {
      token: newToken,
      user: {
        id: userId,
        role: newRole,
        previousRole: currentUser.role
      }
    }
  });
});

exports.getRoleInfo = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const [users] = await pool.query(
    'SELECT role, is_verified, created_at FROM users WHERE id = ?',
    [userId]
  );

  if (!users.length) {
    return next(new AppError('User not found', 404));
  }

  const user = users[0];

  // Get role-specific stats
  let roleStats = {};
  
  if (user.role === 'host') {
    const [hostStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT l.id) as total_listings,
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END), 0) as total_earnings
      FROM listings l
      LEFT JOIN bookings b ON l.id = b.listing_id
      WHERE l.host_id = ?
    `, [userId]);
    
    roleStats = hostStats[0];
  } else if (user.role === 'client') {
    const [clientStats] = await pool.query(`
      SELECT 
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.total_price), 0) as total_spent
      FROM bookings b
      WHERE b.client_id = ?
    `, [userId]);
    
    roleStats = clientStats[0];
  }

  res.status(200).json({
    status: 'success',
    data: {
      currentRole: user.role,
      isVerified: user.is_verified === 1,
      canSwitch: user.role !== 'admin' && user.is_verified === 1,
      availableRoles: user.role === 'admin' ? ['admin'] : ['client', 'host'],
      roleStats
    }
  });
});