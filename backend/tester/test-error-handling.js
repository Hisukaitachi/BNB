// backend/test-error-handling.js (temporary test file)
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

// Test the logger
console.log('Testing logger...');
logger.info('This is an info message');
logger.error('This is an error message', { testData: 'sample' });
logger.warn('This is a warning message');

// Test AppError
console.log('Testing AppError...');
try {
  throw new AppError('This is a test error', 400);
} catch (err) {
  console.log('AppError created successfully:', {
    message: err.message,
    statusCode: err.statusCode,
    status: err.status,
    isOperational: err.isOperational
  });
}

// Test catchAsync
console.log('Testing catchAsync...');
const testAsyncFunction = catchAsync(async (req, res, next) => {
  // Simulate an async operation that might fail
  throw new Error('Async operation failed');
});

// Simulate middleware execution
const mockReq = {};
const mockRes = {};
const mockNext = (err) => {
  console.log('Error caught by catchAsync:', err.message);
};

testAsyncFunction(mockReq, mockRes, mockNext);

console.log('✅ All error handling components are working!');
console.log('📁 Check the logs folder for log files');