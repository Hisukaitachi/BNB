// backend/validation/reviewValidation.js - NEW FILE
const { Joi } = require('../middleware/validation');

// Create review validation
const createReviewSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Listing ID must be a number',
      'number.positive': 'Listing ID must be positive',
      'any.required': 'Listing ID is required'
    }),

  booking_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Booking ID must be a number',
      'number.positive': 'Booking ID must be positive',
      'any.required': 'Booking ID is required'
    }),

  rating: Joi.number().integer().min(1).max(5).required()
    .messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot be more than 5',
      'any.required': 'Rating is required'
    }),

  comment: Joi.string().trim().min(10).max(1000).required()
    .messages({
      'string.min': 'Comment must be at least 10 characters',
      'string.max': 'Comment cannot exceed 1000 characters',
      'any.required': 'Comment is required'
    })
}).unknown(true);

// Get reviews for listing validation - ACCEPTS STRING ID (matches route parameter name)
const getReviewsForListingSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Valid listing ID is required',
    'any.required': 'Listing ID is required'
  })
}).unknown(true);

// Delete review validation - ACCEPTS STRING ID  
const deleteReviewSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Valid review ID is required',
    'any.required': 'Review ID is required'
  })
}).unknown(true);

module.exports = {
  createReviewSchema,
  getReviewsForListingSchema,
  deleteReviewSchema
};