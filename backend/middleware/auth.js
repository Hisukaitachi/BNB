const jwt = require('jsonwebtoken');
const pool = require('../db');
const { AppError } = require('./errorHandler');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Access token required', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(new AppError('Access token required', 401));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.id || !decoded.role) {
      return next(new AppError('Invalid token structure', 401));
    }
    
    // Check if user still exists and is active
    const [users] = await pool.query(
      'SELECT id, name, email, role, is_banned, is_verified FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (!users.length) {
      return next(new AppError('User not found', 401));
    }
    
    const user = users[0];
    
    // Check if user is banned
    if (user.is_banned === 1) {
      return next(new AppError('Account has been banned', 403));
    }
    
    // Check for role changes
    if (decoded.role !== user.role) {
      return next(new AppError('Token invalid due to role change. Please login again.', 401));
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified === 1
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401));
    } else {
      console.error('JWT validation error:', error);
      return next(new AppError('Authentication error', 401));
    }
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
};

// Optional authentication (for public endpoints that benefit from auth)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  try {
    await authenticateToken(req, res, () => {});
  } catch (error) {
    // Invalid token, but continue without auth
    console.log('Optional auth failed, continuing without authentication');
  }
  
  next();
};

// Admin middleware 
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  
  next();
};

// Host middleware
const requireHost = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  if (req.user.role !== 'host') {
    return next(new AppError('Host access required', 403));
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireHost,
  optionalAuth
};