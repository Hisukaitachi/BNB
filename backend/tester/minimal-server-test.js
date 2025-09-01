// minimal-server-test.js
// This will test components one by one to isolate the issue

require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');

console.log('🔍 Testing minimal server components...\n');

// Test 1: Basic Express app
console.log('Test 1: Creating basic Express app...');
const app = express();
console.log('✅ Express app created');

// Test 2: Basic middleware
console.log('Test 2: Adding basic middleware...');
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(morgan('dev'));
console.log('✅ Basic middleware added');

// Test 3: Static files
console.log('Test 3: Adding static files middleware...');
app.use('/uploads', express.static('uploads'));
console.log('✅ Static files middleware added');

// Test 4: Add all routes
console.log('Test 4: Adding all routes...');
try {
  app.use('/api/users', require('../routes/usersRoutes'));
  app.use('/api/listings', require('../routes/listingsRoutes'));
  app.use('/api/bookings', require('../routes/bookingsRoutes'));
  app.use('/api/admin', require('../routes/adminRoutes'));
  app.use('/api/reviews', require('../routes/reviewsRoutes'));
  app.use('/api/favorites', require('../routes/favoritesRoutes'));
  app.use('/api/messages', require('../routes/messagesRoutes'));
  app.use('/api/transactions', require('../routes/transactionsRoutes'));
  app.use('/api/notifications', require('../routes/notificationsRoutes'));
  app.use('/api/refunds', require('../routes/refundRoutes'));
  app.use('/api/payouts', require('../routes/payoutRoutes'));
  app.use('/api/reports', require('../routes/reportsRoutes'));
  console.log('✅ All routes added successfully');
} catch (err) {
  console.log('❌ Error adding routes:', err.message);
  process.exit(1);
}

// Test 5: Add error handling
console.log('Test 5: Adding error handling...');
try {
  const { globalErrorHandler, AppError } = require('../middleware/errorHandler');
  
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is running' });
  });
  
  app.all('*', (req, res, next) => {
    const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
    next(err);
  });
  
  app.use(globalErrorHandler);
  console.log('✅ Error handling added');
} catch (err) {
  console.log('❌ Error adding error handling:', err.message);
  process.exit(1);
}

// Test 6: Create HTTP server
console.log('Test 6: Creating HTTP server...');
const server = http.createServer(app);
console.log('✅ HTTP server created');

// Test 7: Try to start server WITHOUT Socket.IO
console.log('Test 7: Starting server without Socket.IO...');
const PORT = process.env.PORT || 5000;

try {
  server.listen(PORT, () => {
    console.log(`✅ Server started successfully on port ${PORT}`);
    console.log('🎉 No path-to-regexp error! The issue is NOT with routes.');
    console.log('🔍 The problem is likely with Socket.IO initialization.');
    process.exit(0);
  });
} catch (err) {
  console.log('❌ Error starting server:', err.message);
  console.log('🔍 The issue IS with the routes or Express setup.');
}

// If we get here, server started successfully
setTimeout(() => {
  console.log('✅ Server is running fine without Socket.IO');
  process.exit(0);
}, 2000);