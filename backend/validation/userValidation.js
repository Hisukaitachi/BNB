// backend/validation/userValidation.js - Based on your existing user controller
const { Joi, commonSchemas } = require('../middleware/validation');

// User registration validation (matches your createUser controller)
const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  email: commonSchemas.email,
  
  password: commonSchemas.password,

  role: Joi.string()
    .valid('client', 'host', 'admin')
    .default('client')
    .messages({
      'any.only': 'Role must be client, host, or admin'
    })
});

// User login validation (matches your loginUser controller)
const loginSchema = Joi.object({
  email: commonSchemas.email,
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Email verification validation
const verifyEmailSchema = Joi.object({
  email: commonSchemas.email,
  
  code: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'Verification code must be 6 digits',
      'string.pattern.base': 'Verification code must contain only numbers',
      'any.required': 'Verification code is required'
    })
});

// Password reset request validation
const forgotPasswordSchema = Joi.object({
  email: commonSchemas.email
});

// Password reset validation
const resetPasswordSchema = Joi.object({
  email: commonSchemas.email,
  
  code: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'Reset code must be 6 digits',
      'string.pattern.base': 'Reset code must contain only numbers',
      'any.required': 'Reset code is required'
    }),

  newPassword: commonSchemas.password
});

// Profile update validation (matches your updateMyProfile controller)
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    })
});

// Change password validation (matches your changePassword controller)
const changePasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: commonSchemas.password
});

// Promote/demote user validation
const userRoleSchema = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required'
    })
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  userRoleSchema
};