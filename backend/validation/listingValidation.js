// backend/validation/listingValidation.js - FIXED
const { Joi, commonSchemas } = require('../middleware/validation');

// Create listing validation
const createListingSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).required(),
  description: Joi.string().trim().min(20).max(2000).required(),
  price_per_night: Joi.number().positive().required(),
  location: Joi.string().trim().min(5).max(255).required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional()
});

// Update listing validation
const updateListingSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  title: Joi.string().trim().min(5).max(200).optional(),
  description: Joi.string().trim().min(20).max(2000).optional(),
  price_per_night: Joi.number().positive().optional(),
  location: Joi.string().trim().min(5).max(255).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional()
});

// Search listings validation
const searchListingsSchema = Joi.object({
  city: Joi.string().trim().min(2).max(100).optional(),
  price_min: Joi.number().positive().optional(),
  price_max: Joi.number().positive().optional(),
  keyword: Joi.string().trim().min(2).max(100).optional(),
  min_rating: Joi.number().min(1).max(5).optional(),
  check_in: Joi.date().optional(),
  check_out: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('price_per_night', 'created_at', 'average_rating').default('created_at'),
  order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC')
});

// Get nearby listings validation
const nearbyListingsSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(1).max(100).default(10).optional()
});

// FIXED: Get listing by ID validation - ONLY validate when ID is in params
const getListingSchema = Joi.object({
  id: Joi.number().integer().positive().required()
}).unknown(true); // Allow other fields to pass through

// Delete listing validation
const deleteListingSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

module.exports = {
  createListingSchema,
  updateListingSchema,
  searchListingsSchema,
  nearbyListingsSchema,
  getListingSchema,
  deleteListingSchema
};