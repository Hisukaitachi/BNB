// server.js - Debug version
// Save this as server-debug.js and test each route one by one

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
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Test routes one by one - uncomment one at a time to find the problematic route
console.log('Loading routes...');

try {
  console.log('Loading usersRoutes...');
  app.use('/api/users', require('./routes/usersRoutes'));
  console.log('✅ usersRoutes loaded');
} catch (err) {
  console.log('❌ usersRoutes failed:', err.message);
}

try {
  console.log('Loading listingsRoutes...');
  app.use('/api/listings', require('./routes/listingsRoutes'));
  console.log('✅ listingsRoutes loaded');
} catch (err) {
  console.log('❌ listingsRoutes failed:', err.message);
}

try {
  console.log('Loading bookingsRoutes...');
  app.use('/api/bookings', require('./routes/bookingsRoutes'));
  console.log('✅ bookingsRoutes loaded');
} catch (err) {
  console.log('❌ bookingsRoutes failed:', err.message);
}

try {
  console.log('Loading adminRoutes...');
  app.use('/api/admin', require('./routes/adminRoutes'));
  console.log('✅ adminRoutes loaded');
} catch (err) {
  console.log('❌ adminRoutes failed:', err.message);
}

try {
  console.log('Loading reviewsRoutes...');
  app.use('/api/reviews', require('./routes/reviewsRoutes'));
  console.log('✅ reviewsRoutes loaded');
} catch (err) {
  console.log('❌ reviewsRoutes failed:', err.message);
}

try {
  console.log('Loading favoritesRoutes...');
  app.use('/api/favorites', require('./routes/favoritesRoutes'));
  console.log('✅ favoritesRoutes loaded');
} catch (err) {
  console.log('❌ favoritesRoutes failed:', err.message);
}

try {
  console.log('Loading messagesRoutes...');
  app.use('/api/messages', require('./routes/messagesRoutes'));
  console.log('✅ messagesRoutes loaded');
} catch (err) {
  console.log('❌ messagesRoutes failed:', err.message);
}

try {
  console.log('Loading transactionsRoutes...');
  app.use('/api/transactions', require('./routes/transactionsRoutes'));
  console.log('✅ transactionsRoutes loaded');
} catch (err) {
  console.log('❌ transactionsRoutes failed:', err.message);
}

try {
  console.log('Loading notificationsRoutes...');
  app.use('/api/notifications', require('./routes/notificationsRoutes'));
  console.log('✅ notificationsRoutes loaded');
} catch (err) {
  console.log('❌ notificationsRoutes failed:', err.message);
}

try {
  console.log('Loading refundRoutes...');
  app.use('/api/refunds', require('./routes/refundRoutes'));
  console.log('✅ refundRoutes loaded');
} catch (err) {
  console.log('❌ refundRoutes failed:', err.message);
}

try {
  console.log('Loading payoutRoutes...');
  app.use('/api/payouts', require('./routes/payoutRoutes'));
  console.log('✅ payoutRoutes loaded');
} catch (err) {
  console.log('❌ payoutRoutes failed:', err.message);
}

try {
  console.log('Loading reportsRoutes...');
  app.use('/api/reports', require('./routes/reportsRoutes'));
  console.log('✅ reportsRoutes loaded');
} catch (err) {
  console.log('❌ reportsRoutes failed:', err.message);
}

console.log('All routes loaded successfully!');

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

module.exports = app;