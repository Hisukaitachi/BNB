// backend/server.js - Final production-ready version
require('dotenv').config({ path: __dirname + '/.env' });

// Validate environment before starting
const { validateEnvironment } = require('./utils/envValidator');
validateEnvironment();

const express = require('express');
const http = require('http');
const { initializeSocket } = require('./socket');
const startCronJobs = require('./cronJobs');

// Import security middleware
const { applySecurity } = require('./middleware/security');
const { securityLogger } = require('./middleware/securityLogger');
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

// Log environment info
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Security Mode: ENABLED');

// Initialize Socket.IO + Global onlineUsers & cronJobs
initializeSocket(server);
startCronJobs();

// Apply security middleware first
applySecurity(app);

// Apply general rate limiting
app.use(generalLimiter);

// Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files securely
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  etag: false,
  lastModified: false
}));

// Security logging for sensitive endpoints
app.use('/api/admin', securityLogger('admin_access'));
app.use('/api/users/login', securityLogger('login_attempt'));
app.use('/api/users/register', securityLogger('registration_attempt'));

// Route-specific rate limiting
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

// Health check routes (no auth required)
app.use('/health', require('./routes/healthRoutes'));

// Main API routes
app.use('/api/auth', require('./routes/authRoutes'));
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

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'StayBnB API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/users',
      listings: '/api/listings',
      bookings: '/api/bookings',
      messages: '/api/messages',
      admin: '/api/admin'
    }
  });
});

// 404 handler for unmatched routes
app.use((req, res, next) => {
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

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Security features: Rate limiting, CORS, Helmet, XSS protection, Security logging');
  
  logger.info('Server started successfully', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    security: 'enabled',
    timestamp: new Date().toISOString()
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Promise Rejection at:', promise, 'reason:', err);
  logger.error('Unhandled Promise Rejection', { 
    error: err.message, 
    stack: err.stack,
    promise: promise 
  });
  
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception thrown');
  logger.error('Uncaught Exception', { 
    error: err.message, 
    stack: err.stack 
  });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    logger.info('Process terminated');
  });
});

module.exports = app;