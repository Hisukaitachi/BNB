// backend/validation/bookingValidation.js - Based on your booking controller
const { Joi, commonSchemas } = require('../middleware/validation');

// Create booking validation (matches your createBooking controller)
const createBookingSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Listing ID must be a number',
      'number.positive': 'Listing ID must be positive',
      'any.required': 'Listing ID is required'
    }),

  start_date: commonSchemas.date
    .min('now')
    .required()
    .messages({
      'date.min': 'Start date cannot be in the past',
      'any.required': 'Start date is required'
    }),

  end_date: commonSchemas.date
    .greater(Joi.ref('start_date'))
    .required()
    .messages({
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required'
    }),

  total_price: commonSchemas.price.required()
    .messages({
      'any.required': 'Total price is required'
    })
});

// Update booking status validation (matches your updateBookingStatus controller)
const updateBookingStatusSchema = Joi.object({
  id: commonSchemas.id.extract('id'),
  
  status: Joi.string()
    .valid('pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'completed')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, approved, confirmed, rejected, cancelled, completed',
      'any.required': 'Status is required'
    })
});

// Get bookings by listing validation
const getBookingsByListingSchema = Joi.object({
  listingId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Listing ID must be a number',
      'number.positive': 'Listing ID must be positive',
      'any.required': 'Listing ID is required'
    })
});

// Get booking history validation
const getBookingHistorySchema = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Booking ID must be a number',
      'number.positive': 'Booking ID must be positive',
      'any.required': 'Booking ID is required'
    })
});

module.exports = {
  createBookingSchema,
  updateBookingStatusSchema,
  getBookingsByListingSchema,
  getBookingHistorySchema
};