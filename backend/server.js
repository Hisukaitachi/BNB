// backend/server.js - Updated version
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const { initializeSocket } = require('./socket');
const startCronJobs = require('./cronJobs');

// Import error handling middleware
const { globalErrorHandler, AppError } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// ✅ Log OpenCage Key once (for debug – remove in prod)
console.log('OpenCage API Key:', process.env.OPENCAGE_API_KEY);

// Initialize Socket.IO + Global onlineUsers & cronJobs
initializeSocket(server);
startCronJobs();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Use winston logger for production
  app.use((req, res, next) => {
    logger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    next();
  });
}

app.use('/uploads', express.static('uploads'));

// Routes
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler for unmatched routes (MUST be after all valid routes)
app.use((req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
});
// Global error handling middleware (MUST be last middleware)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Promise Rejection at:', promise, 'reason:', err);
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
  console.log('👋 SIGTERM received');
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated');
    logger.info('Process terminated');
  });
});

module.exports = app;