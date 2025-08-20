// backend/validation/listingValidation.js - Based on your listing controller
const { Joi, commonSchemas } = require('../middleware/validation');

// Create listing validation (matches your createListing controller)
const createListingSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),

  description: Joi.string()
    .trim()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Description must be at least 20 characters',
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Description is required'
    }),

  price_per_night: commonSchemas.price.required()
    .messages({
      'any.required': 'Price per night is required'
    }),

  location: Joi.string()
    .trim()
    .min(5)
    .max(255)
    .required()
    .messages({
      'string.min': 'Location must be at least 5 characters',
      'string.max': 'Location cannot exceed 255 characters',
      'any.required': 'Location is required'
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90'
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180'
    })
});

// Update listing validation (matches your updateListing controller)
const updateListingSchema = Joi.object({
  id: commonSchemas.id.extract('id'),
  
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .optional(),

  description: Joi.string()
    .trim()
    .min(20)
    .max(2000)
    .optional(),

  price_per_night: commonSchemas.price.optional(),

  location: Joi.string()
    .trim()
    .min(5)
    .max(255)
    .optional(),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional(),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
});

// Listing search validation (matches your searchListings controller)
const searchListingsSchema = Joi.object({
  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  price_min: commonSchemas.price.optional(),
  
  price_max: commonSchemas.price.optional(),

  keyword: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  min_rating: Joi.number()
    .min(1)
    .max(5)
    .optional(),

  check_in: commonSchemas.date.optional(),
  
  check_out: commonSchemas.date.optional(),

  page: Joi.number().integer().min(1).default(1),
  
  limit: Joi.number().integer().min(1).max(100).default(10),

  sortBy: Joi.string()
    .valid('price_per_night', 'created_at', 'average_rating')
    .default('created_at'),

  order: Joi.string()
    .valid('ASC', 'DESC', 'asc', 'desc')
    .default('DESC')
});

// Get nearby listings validation
const nearbyListingsSchema = Joi.object({
  lat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),

  lng: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    }),

  radius: Joi.number()
    .min(1)
    .max(100)
    .default(10)
    .optional()
});

// Get listing by ID validation
const getListingSchema = commonSchemas.id;

// Delete listing validation
const deleteListingSchema = commonSchemas.id;

module.exports = {
  createListingSchema,
  updateListingSchema,
  searchListingsSchema,
  nearbyListingsSchema,
  getListingSchema,
  deleteListingSchema
};