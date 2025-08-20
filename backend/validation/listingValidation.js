// backend/validation/userValidation.js - User-specific validation schemas
const { Joi, commonSchemas } = require('../middleware/validation');

// User registration validation
const registerSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),

  email: commonSchemas.email,
  
  password: commonSchemas.password,

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),

  phone: commonSchemas.phone.optional(),

  dateOfBirth: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Please provide a valid date of birth'
    }),

  role: Joi.string()
    .valid('guest', 'host')
    .default('guest')
    .messages({
      'any.only': 'Role must be either guest or host'
    }),

  // Terms acceptance
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    })
});

// User login validation
const loginSchema = Joi.object({
  email: commonSchemas.email,
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),

  rememberMe: Joi.boolean().default(false)
});

// Profile update validation
const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional(),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional(),

  phone: commonSchemas.phone.optional(),

  dateOfBirth: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional(),

  bio: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),

  location: Joi.object({
    city: Joi.string().trim().max(100),
    country: Joi.string().trim().max(100),
    coordinates: commonSchemas.coordinates.optional()
  }).optional(),

  // Profile preferences
  preferences: Joi.object({
    language: Joi.string().valid('en', 'es', 'fr', 'de').default('en'),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'PHP').default('USD'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      sms: Joi.boolean().default(false),
      push: Joi.boolean().default(true)
    }).default()
  }).optional()
});

// Password change validation
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: commonSchemas.password,

  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'New password confirmation is required'
    })
});

// Password reset request validation
const forgotPasswordSchema = Joi.object({
  email: commonSchemas.email
});

// Password reset validation
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),

  newPassword: commonSchemas.password,

  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

// Email verification validation
const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required'
    })
});

// User search/filter validation
const userFilterSchema = Joi.object({
  ...commonSchemas.pagination.extract(['page', 'limit']).describe(),
  
  search: Joi.string()
    .trim()
    .min(2)
    .optional()
    .messages({
      'string.min': 'Search term must be at least 2 characters'
    }),

  role: Joi.string()
    .valid('guest', 'host', 'admin')
    .optional(),

  verified: Joi.boolean().optional(),

  active: Joi.boolean().optional(),

  sortBy: Joi.string()
    .valid('createdAt', 'firstName', 'lastName', 'email', 'lastLogin')
    .default('createdAt'),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  userFilterSchema
};