// backend/middleware/errorHandler.js
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // Handle MySQL duplicate entry errors
  let message = 'Duplicate field value entered. Please use another value!';
  
  if (err.code === 'ER_DUP_ENTRY') {
    if (err.sqlMessage.includes('email')) {
      message = 'Email address already exists. Please use a different email.';
    } else if (err.sqlMessage.includes('users.email')) {
      message = 'This email is already registered.';
    }
  }
  
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });

  // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR 💥', err);
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log all errors
  logger.error('Error occurred:', {
    message: err.message,
    statusCode: err.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific MySQL/MariaDB errors
    if (error.code === 'ER_DUP_ENTRY') error = handleDuplicateFieldsDB(error);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  } else {
    // Default to development mode
    sendErrorDev(err, res);
  }
};

class ReservationError extends AppError {
  constructor(message, statusCode, errorCode) {
    super(message, statusCode);
    this.errorCode = errorCode;
  }
}

// Reservation-specific error codes
const RESERVATION_ERRORS = {
  DATES_NOT_AVAILABLE: 'ERR_DATES_NOT_AVAILABLE',
  INVALID_PAYMENT: 'ERR_INVALID_PAYMENT',
  REFUND_FAILED: 'ERR_REFUND_FAILED',
  CANCELLATION_DENIED: 'ERR_CANCELLATION_DENIED',
  PAYMENT_OVERDUE: 'ERR_PAYMENT_OVERDUE',
  HOST_APPROVAL_REQUIRED: 'ERR_HOST_APPROVAL_REQUIRED',
  DEPOSIT_NOT_PAID: 'ERR_DEPOSIT_NOT_PAID'
};

// Enhanced error handler for reservations
const handleReservationError = (err) => {
  if (err.code === 'ERR_DATES_NOT_AVAILABLE') {
    return new ReservationError(
      'Selected dates are not available. Please choose different dates.',
      409,
      err.code
    );
  }
  
  if (err.code === 'ERR_PAYMENT_OVERDUE') {
    return new ReservationError(
      'Payment is overdue. Reservation will be cancelled.',
      400,
      err.code
    );
  }
  
  return err;
};

module.exports = {
  AppError,
  globalErrorHandler,
  ReservationError,
  RESERVATION_ERRORS,
  handleReservationError
};