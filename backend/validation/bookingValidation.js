// backend/validation/bookingValidation.js - FIXED with string ID support
const { Joi, commonSchemas } = require('../middleware/validation');

// Create booking validation (matches your createBooking controller)
const createBookingSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Listing ID must be a number',
      'number.positive': 'Listing ID must be positive',
      'any.required': 'Listing ID is required'
    }),

  start_date: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'Start date cannot be in the past',
      'any.required': 'Start date is required'
    }),

  end_date: Joi.date()
    .greater(Joi.ref('start_date'))
    .required()
    .messages({
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required'
    }),

  total_price: Joi.number().positive().precision(2).required()
    .messages({
      'any.required': 'Total price is required',
      'number.positive': 'Total price must be positive'
    })
}).unknown(true);

// Update booking status validation - FIXED to accept string ID
const updateBookingStatusSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Valid booking ID is required',
    'any.required': 'Booking ID is required'
  }),
  
  status: Joi.string()
    .valid('pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, approved, confirmed, rejected, cancelled, completed',
      'any.required': 'Status is required'
    })
}).unknown(true);

// FIXED: Get bookings by listing validation - accepts string listingId
const getBookingsByListingSchema = Joi.object({
  listingId: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Valid listing ID is required',
    'any.required': 'Listing ID is required'
  })
}).unknown(true);

// FIXED: Get booking history validation - accepts string ID
const getBookingHistorySchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Valid booking ID is required',
    'any.required': 'Booking ID is required'
  })
}).unknown(true);

module.exports = {
  createBookingSchema,
  updateBookingStatusSchema,
  getBookingsByListingSchema,
  getBookingHistorySchema
};