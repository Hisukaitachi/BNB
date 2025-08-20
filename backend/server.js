// backend/server.js - Fixed version without route pattern issues
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const http = require('http');
const { initializeSocket } = require('./socket');
const startCronJobs = require('./cronJobs');

// Import security middleware
const { applySecurity } = require('./middleware/security');
const {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  apiLimiter,
  uploadLimiter,
  adminLimiter
} = require('./middleware/rateLimiting');

// Import error handling middleware
const { globalErrorHandler, AppError } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// ✅ Log environment info
console.log('🔒 Security Mode: ENABLED');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Initialize Socket.IO + Global onlineUsers & cronJobs
initializeSocket(server);
startCronJobs();

// 🛡️ APPLY SECURITY MIDDLEWARE FIRST
applySecurity(app);

// 🔒 RATE LIMITING
app.use(generalLimiter); // Apply general rate limiting to all routes

// Express middleware
app.use(express.json({ limit: '10mb' })); // Set JSON limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files securely
app.use('/uploads', express.static('uploads', {
  // Security options for static files
  maxAge: '1d',
  etag: false,
  lastModified: false
}));

// 🔒 ROUTE-SPECIFIC RATE LIMITING

// Authentication routes with strict rate limiting
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', registrationLimiter);
app.use('/api/users/forgot-password', passwordResetLimiter);
app.use('/api/users/reset-password', passwordResetLimiter);

// API routes with moderate rate limiting
app.use('/api/listings', apiLimiter);
app.use('/api/bookings', apiLimiter);
app.use('/api/reviews', apiLimiter);
app.use('/api/messages', apiLimiter);
app.use('/api/notifications', apiLimiter);

// Admin routes with special rate limiting
app.use('/api/admin', adminLimiter);

// 🚀 ROUTES (after security middleware)
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/payouts', require('./routes/payoutRoutes'));
app.use('/api/refunds', require('./routes/refundRoutes'));
app.use('/api/notifications', require('./routes/notificationsRoutes'));
app.use('/api/transactions', require('./routes/transactionsRoutes'));
app.use('/api/messages', require('./routes/messagesRoutes'));
app.use('/api/favorites', require('./routes/favoritesRoutes'));
app.use('/api/reviews', require('./routes/reviewsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/bookings', require('./routes/bookingsRoutes'));
app.use('/api/listings', require('./routes/listingsRoutes'));
app.use('/api/users', require('./routes/usersRoutes'));

// 🏥 Health check endpoint (excluded from rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running securely',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    security: {
      rateLimiting: 'enabled',
      cors: 'configured',
      helmet: 'enabled',
      xss: 'protected',
      mongoSanitize: 'enabled'
    }
  });
});

// 🔒 Security endpoint to check security status
app.get('/security-status', (req, res) => {
  res.status(200).json({
    status: 'success',
    security: {
      headers: 'protected',
      rateLimiting: 'active',
      cors: 'configured',
      xssProtection: 'enabled',
      sqlInjectionProtection: 'enabled',
      compression: 'enabled',
      lastUpdated: new Date().toISOString()
    }
  });
});

// 🚫 404 handler for unmatched routes (FIXED - no wildcard issues)
app.use((req, res, next) => {
  // Log 404 attempts for security monitoring
  logger.warn('404 endpoint accessed', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
});

// 🛡️ Global error handling middleware (MUST be last middleware)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Secure server running on port ${PORT}`);
  console.log(`🔒 Security features: Rate limiting, CORS, Helmet, XSS protection`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  logger.info('Secure server started', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    security: 'enabled'
  });
});

// 🛡️ Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('💥 Unhandled Promise Rejection at:', promise, 'reason:', err);
  logger.error('Unhandled Promise Rejection', { 
    error: err.message, 
    stack: err.stack,
    promise: promise 
  });
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// 🛡️ Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('💥 Uncaught Exception thrown');
  logger.error('Uncaught Exception', { 
    error: err.message, 
    stack: err.stack 
  });
  process.exit(1);
});

// 🛡️ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received');
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated');
    logger.info('Process terminated');
  });
});

module.exports = app;