// backend/middleware/auth.js - Enhanced secure authentication
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');
const { enhancedJWTValidator } = require('./authSecurity');

// Use the enhanced JWT validator as the main auth middleware
const authenticateToken = enhancedJWTValidator;

// Role-based access control middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
};

// Permission-based access control
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    try {
      // Check user permissions in database
      const [permissions] = await pool.query(`
        SELECT p.name 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN users u ON u.role = rp.role
        WHERE u.id = ? AND p.name = ?
      `, [req.user.id, permission]);
      
      if (permissions.length === 0) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          permission: permission,
          endpoint: req.originalUrl,
          ip: req.ip
        });
        
        return next(new AppError('Permission denied', 403));
      }
      
      next();
    } catch (error) {
      logger.error('Permission check error', { error: error.message });
      next(new AppError('Permission check failed', 500));
    }
  };
};

// Optional authentication (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without auth
    return next();
  }
  
  try {
    // Try to authenticate, but don't fail if invalid
    await authenticateToken(req, res, () => {});
  } catch (error) {
    // Invalid token, but continue without auth
    logger.info('Optional auth failed, continuing without authentication', {
      ip: req.ip,
      endpoint: req.originalUrl
    });
  }
  
  next();
};

// Resource ownership check
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    try {
      const resourceId = req.params.id;
      let query;
      let userField;
      
      switch (resourceType) {
        case 'listing':
          query = 'SELECT host_id FROM listings WHERE id = ?';
          userField = 'host_id';
          break;
        case 'booking':
          query = 'SELECT client_id, host_id FROM bookings b JOIN listings l ON b.listing_id = l.id WHERE b.id = ?';
          userField = 'client_id'; // Will check both client_id and host_id
          break;
        case 'review':
          query = 'SELECT user_id FROM reviews WHERE id = ?';
          userField = 'user_id';
          break;
        default:
          return next(new AppError('Invalid resource type', 400));
      }
      
      const [rows] = await pool.query(query, [resourceId]);
      
      if (rows.length === 0) {
        return next(new AppError(`${resourceType} not found`, 404));
      }
      
      const resource = rows[0];
      let hasAccess = false;
      
      // Check ownership based on resource type
      if (resourceType === 'booking') {
        hasAccess = resource.client_id === req.user.id || resource.host_id === req.user.id;
      } else {
        hasAccess = resource[userField] === req.user.id;
      }
      
      // Admin override
      if (req.user.role === 'admin') {
        hasAccess = true;
      }
      
      if (!hasAccess) {
        logger.warn('Unauthorized resource access attempt', {
          userId: req.user.id,
          resourceType: resourceType,
          resourceId: resourceId,
          endpoint: req.originalUrl,
          ip: req.ip
        });
        
        return next(new AppError('You do not own this resource', 403));
      }
      
      next();
    } catch (error) {
      logger.error('Ownership check error', { error: error.message });
      next(new AppError('Ownership check failed', 500));
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth,
  requireOwnership
};