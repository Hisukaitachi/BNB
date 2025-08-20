// backend/middleware/validation.js - Joi validation middleware
const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Custom Joi validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    // Determine which part of the request to validate
    const dataToValidate = {
      ...req.body,
      ...req.params,
      ...req.query
    };

    // Perform validation
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Show all validation errors, not just the first one
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true // Remove unknown fields from the result
    });

    if (error) {
      // Format validation errors for consistent API response
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      // Create descriptive error message
      const errorMessage = validationErrors.length === 1 
        ? validationErrors[0].message
        : `Validation failed for ${validationErrors.length} fields`;

      return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR', { validationErrors }));
    }

    // Replace request data with validated and sanitized data
    Object.assign(req.body, value);
    Object.assign(req.params, value);
    Object.assign(req.query, value);

    next();
  };
};

// Custom Joi extensions for common validations
const customJoi = Joi.extend({
  type: 'string',
  base: Joi.string(),
  messages: {
    'string.strongPassword': 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
  },
  rules: {
    strongPassword: {
      validate(value, helpers) {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(value)) {
          return helpers.error('string.strongPassword');
        }
        return value;
      }
    }
  }
});

// Common validation schemas
const commonSchemas = {
  // ID parameter validation
  id: Joi.object({
    id: Joi.number().integer().positive().required()
      .messages({
        'number.base': 'ID must be a number',
        'number.integer': 'ID must be an integer',
        'number.positive': 'ID must be positive',
        'any.required': 'ID is required'
      })
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'price').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Email validation
  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  // Password validation
  password: customJoi.string()
    .strongPassword()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),

  // Phone number validation
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  // Date validation
  date: Joi.date()
    .iso()
    .messages({
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
      'date.base': 'Please provide a valid date'
    }),

  // Price validation
  price: Joi.number()
    .positive()
    .precision(2)
    .messages({
      'number.positive': 'Price must be positive',
      'number.precision': 'Price can have maximum 2 decimal places'
    }),

  // Location coordinates
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }),
};

module.exports = {
  validate,
  commonSchemas,
  Joi: customJoi
};